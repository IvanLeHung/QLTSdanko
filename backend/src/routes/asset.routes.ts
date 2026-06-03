import { Router } from 'express';
import prisma from '../utils/prisma';
import { AssetService } from '../services/asset.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { InvoiceParserService } from '../services/invoice-parser.service';
import { InvoicePostService } from '../services/invoice-post.service';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import ExcelJS from 'exceljs';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
      company: 'companyCode',
      department: 'departmentName',
      warehouse: 'locationName',
      user: 'currentUserName'
    });

    const baseWhere: any = { isDeleted: false };
    if (Object.keys(scopeWhere).length > 0) {
      if (scopeWhere.id === -1) {
        return res.json({ total: 0, assigned: 0, inStock: 0, underRepair: 0, damaged: 0, lost: 0, liquidated: 0 });
      }
      baseWhere.AND = [scopeWhere];
    }

    const [total, assigned, inStock, underRepair, damaged, lost, liquidated] = await Promise.all([
      prisma.asset.count({ where: baseWhere }),
      prisma.asset.count({ where: { ...baseWhere, status: 'ASSIGNED' } }),
      prisma.asset.count({ where: { ...baseWhere, status: 'IN_STOCK' } }),
      prisma.asset.count({ where: { ...baseWhere, status: 'UNDER_REPAIR' } }),
      prisma.asset.count({ where: { ...baseWhere, status: 'DAMAGED' } }),
      prisma.asset.count({ where: { ...baseWhere, status: 'LOST' } }),
      prisma.asset.count({ where: { ...baseWhere, status: 'LIQUIDATED' } }),
    ]);
    res.json({ total, assigned, inStock, underRepair, damaged, lost, liquidated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Autocomplete / Filter Options Endpoints
router.get('/filter-options/users', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const users = await prisma.asset.findMany({
    where: { 
      currentUserName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false 
    },
    select: { currentUserName: true },
    distinct: ['currentUserName'],
    take: 10
  });
  res.json(users.map(u => u.currentUserName).filter(Boolean));
});

router.get('/filter-options/lv4', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const cats = await prisma.asset.findMany({
    where: { 
      OR: [
        { level4Code: { contains: String(q), mode: 'insensitive' } },
        { level4Name: { contains: String(q), mode: 'insensitive' } },
      ],
      isDeleted: false 
    },
    select: { level4Code: true, level4Name: true },
    distinct: ['level4Code', 'level4Name'],
    take: 10
  });
  res.json(cats.map(c => ({ value: c.level4Code, label: `${c.level4Code} - ${c.level4Name}` })));
});

router.get('/filter-options/departments', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const depts = await prisma.asset.findMany({
    where: { 
      departmentName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false 
    },
    select: { departmentName: true },
    distinct: ['departmentName'],
    take: 10
  });
  res.json(depts.map(d => d.departmentName).filter(Boolean));
});

router.get('/filter-options/locations', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const locs = await prisma.asset.findMany({
    where: {
      locationName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false
    },
    select: { locationName: true },
    distinct: ['locationName'],
    take: 10
  });
  res.json(locs.map(l => l.locationName).filter(Boolean));
});

router.get('/filter-options/cities', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const cities = await prisma.asset.findMany({
    where: { 
      cityName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false 
    },
    select: { cityName: true },
    distinct: ['cityName'],
    take: 10
  });
  res.json(cities.map(c => c.cityName).filter(Boolean));
});

router.get('/filter-options/projects', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const projects = await prisma.asset.findMany({
    where: { 
      projectName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false 
    },
    select: { projectName: true },
    distinct: ['projectName'],
    take: 10
  });
  res.json(projects.map(p => p.projectName).filter(Boolean));
});

router.get('/filter-options/companies', authenticateToken, async (req, res) => {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { code: true, name: true },
    orderBy: { code: 'asc' }
  });
  res.json(companies.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` })));
});

router.get('/filter-options/suppliers', authenticateToken, async (req, res) => {
  const { q = '' } = req.query;
  const suppliers = await prisma.asset.findMany({
    where: { 
      supplierName: { contains: String(q), mode: 'insensitive' },
      isDeleted: false 
    },
    select: { supplierName: true },
    distinct: ['supplierName'],
    take: 10
  });
  res.json(suppliers.map(s => s.supplierName).filter(Boolean));
});

// Main Asset List Query
router.get('/', authenticateToken, requirePermission('ASSET_VIEW'), async (req: AuthRequest, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    sortBy = 'updatedAt', 
    sortOrder = 'desc',
    
    // Quick Filters
    status,         // single or comma-separated
    companyCode,
    currentUserName,
    departmentName,
    locationQuery,
    cityName,
    projectName,
    level4Code,
    level4Name,
    
    // Price Range
    priceMin,
    priceMax,
    
    // More Filters
    purchaseDateFrom,
    purchaseDateTo,
    handoverDateFrom,
    handoverDateTo,
    depreciationEndDateFrom,
    depreciationEndDateTo,
    supplierName,
    hasSerial,
    hasDocuments,
    lastInventoryFrom,
    lastInventoryTo,
    inventoryStatus,
    createdFrom,
    createdTo,
    invoiceBatchId
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = { isDeleted: false };
  const andClauses: any[] = [];

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName', // Assuming departmentIdsJson stores codes or names? Actually it stores IDs. Wait, in QLTSdanko we might be storing department names. Let's assume the helper is adapted or we fix it.
    warehouse: 'locationName',
    user: 'currentUserName'
  });
  
  if (Object.keys(scopeWhere).length > 0) {
    // If scope is { id: -1 } it means nothing matches
    if (scopeWhere.id === -1) {
      return res.json({ assets: [], pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } });
    }
    andClauses.push(scopeWhere);
  }

  // Advanced Search (Global Search Box)
  if (search) {
    const searchString = String(search);
    andClauses.push({
      OR: [
        { assetCode: { contains: searchString, mode: 'insensitive' } },
        { assetName: { contains: searchString, mode: 'insensitive' } },
        { assetNameShort: { contains: searchString, mode: 'insensitive' } },
        { serialNumber: { contains: searchString, mode: 'insensitive' } },
        { companyCode: { contains: searchString, mode: 'insensitive' } },
        { companyName: { contains: searchString, mode: 'insensitive' } },
        { projectName: { contains: searchString, mode: 'insensitive' } },
        { level1Code: { contains: searchString, mode: 'insensitive' } },
        { level1Name: { contains: searchString, mode: 'insensitive' } },
        { level2Code: { contains: searchString, mode: 'insensitive' } },
        { level2Name: { contains: searchString, mode: 'insensitive' } },
        { level3Code: { contains: searchString, mode: 'insensitive' } },
        { level3Name: { contains: searchString, mode: 'insensitive' } },
        { level4Code: { contains: searchString, mode: 'insensitive' } },
        { level4Name: { contains: searchString, mode: 'insensitive' } },
        { runningNoText: { contains: searchString, mode: 'insensitive' } },
        { status: { contains: searchString, mode: 'insensitive' } },
        { unit: { contains: searchString, mode: 'insensitive' } },
        { usagePurpose: { contains: searchString, mode: 'insensitive' } },
        { supplierName: { contains: searchString, mode: 'insensitive' } },
        { currentUserName: { contains: searchString, mode: 'insensitive' } },
        { currentPosition: { contains: searchString, mode: 'insensitive' } },
        { departmentName: { contains: searchString, mode: 'insensitive' } },
        { locationName: { contains: searchString, mode: 'insensitive' } },
        { cityName: { contains: searchString, mode: 'insensitive' } },
        { documentNote: { contains: searchString, mode: 'insensitive' } },
        { lastInventoryStatus: { contains: searchString, mode: 'insensitive' } }
      ]
    });
  }

  // Multi-status filter
  if (status) {
    const statusArray = String(status).split(',').filter(Boolean);
    if (statusArray.length > 0) {
      const mappedStatuses: string[] = [];
      for (const s of statusArray) {
        if (s === 'BROKEN') {
          mappedStatuses.push('DAMAGED');
          mappedStatuses.push('BROKEN');
        } else if (s === 'LIQUIDATED') {
          mappedStatuses.push('LIQUIDATED');
          mappedStatuses.push('DISPOSED');
        } else {
          mappedStatuses.push(s);
        }
      }
      where.status = { in: mappedStatuses };
    }
  }

  if (companyCode) where.companyCode = String(companyCode);
  if (req.query.isAssigned === 'true') {
    where.currentUserName = { not: null, notIn: ['', 'N/A', 'n/a'] };
  } else if (req.query.isAssigned === 'false') {
    where.currentUserName = { in: [null, '', 'N/A', 'n/a'] };
  } else if (currentUserName) {
    where.currentUserName = { contains: String(currentUserName), mode: 'insensitive' };
  }
  if (departmentName) where.departmentName = { contains: String(departmentName), mode: 'insensitive' };
  
  if (level4Name) {
    const nameArray = String(level4Name).split(',').filter(Boolean);
    if (nameArray.length > 0) {
      where.level4Name = { in: nameArray };
    }
  } else if (level4Code) {
    const codeArray = String(level4Code).split(',').filter(Boolean);
    if (codeArray.length > 0) {
      where.level4Code = { in: codeArray };
    }
  }
  
  if (cityName) where.cityName = { contains: String(cityName), mode: 'insensitive' };
  if (projectName) where.projectName = { contains: String(projectName), mode: 'insensitive' };
  if (locationQuery) {
    andClauses.push({
      OR: [
        { locationName: { contains: String(locationQuery), mode: 'insensitive' } },
        { cityName: { contains: String(locationQuery), mode: 'insensitive' } },
        { projectName: { contains: String(locationQuery), mode: 'insensitive' } }
      ]
    });
  }

  // Price Range
  if (priceMin || priceMax) {
    where.purchasePriceExVat = {};
    if (priceMin) where.purchasePriceExVat.gte = Number(priceMin);
    if (priceMax) where.purchasePriceExVat.lte = Number(priceMax);
  }

  // Dates
  if (purchaseDateFrom || purchaseDateTo) {
    where.purchaseDate = {};
    if (purchaseDateFrom) where.purchaseDate.gte = new Date(String(purchaseDateFrom));
    if (purchaseDateTo) where.purchaseDate.lte = new Date(String(purchaseDateTo));
  }
  
  if (handoverDateFrom || handoverDateTo) {
    where.handoverDate = {};
    if (handoverDateFrom) where.handoverDate.gte = new Date(String(handoverDateFrom));
    if (handoverDateTo) where.handoverDate.lte = new Date(String(handoverDateTo));
  }

  if (depreciationEndDateFrom || depreciationEndDateTo) {
    where.depreciationEndDate = {};
    if (depreciationEndDateFrom) where.depreciationEndDate.gte = new Date(String(depreciationEndDateFrom));
    if (depreciationEndDateTo) where.depreciationEndDate.lte = new Date(String(depreciationEndDateTo));
  }

  if (lastInventoryFrom || lastInventoryTo) {
    where.lastInventoryDate = {};
    if (lastInventoryFrom) where.lastInventoryDate.gte = new Date(String(lastInventoryFrom));
    if (lastInventoryTo) where.lastInventoryDate.lte = new Date(String(lastInventoryTo));
  }

  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = new Date(String(createdFrom));
    if (createdTo) {
      const end = new Date(String(createdTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Other metadata
  if (supplierName) where.supplierName = { contains: String(supplierName), mode: 'insensitive' };
  if (inventoryStatus) where.lastInventoryStatus = String(inventoryStatus);

  if (hasSerial === 'true') where.serialNumber = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasSerial === 'false') where.serialNumber = { in: [null, '', 'N/A', 'n/a'] };

  if (hasDocuments === 'true') where.documentNote = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasDocuments === 'false') where.documentNote = { in: [null, '', 'N/A', 'n/a'] };

  if (req.query.hasPrinted === 'true') where.lastLabelPrint = { not: null };
  if (req.query.hasPrinted === 'false') where.lastLabelPrint = null;

  if (req.query.isChecked === 'true') where.lastInventoryDate = { not: null };
  if (req.query.isChecked === 'false') where.lastInventoryDate = null;

  if (invoiceBatchId) {
    where.invoiceBatchId = Number(invoiceBatchId);
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  try {
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder },
        include: {
          repairTickets: {
            where: {
              status: { in: ['DRAFT', 'OPEN', 'IN_PROGRESS'] }
            },
            select: {
              id: true
            }
          }
        }
      }),
      prisma.asset.count({ where })
    ]);

    res.json({
      assets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Query failed: " + error.message });
  }
});

// Cascading Selects helpers
router.get('/companies/active', authenticateToken, async (req, res) => {
  const companies = await prisma.company.findMany({ 
    where: { 
      isActive: true,
      status: { in: ['ACTIVE', 'LOCKED'] }
    }, 
    orderBy: { code: 'asc' } 
  });
  res.json(companies);
});

router.get('/categories/active/roots', authenticateToken, async (req, res) => {
  const categories = await prisma.assetCategory.findMany({ where: { level: 1, isActive: true }, orderBy: { sortOrder: 'asc' } });
  res.json(categories);
});

router.get('/categories/active/children/:parentId', authenticateToken, async (req, res) => {
  const categories = await prisma.assetCategory.findMany({
    where: { parentId: parseInt(req.params.parentId as string), isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(categories);
});

router.get('/categories/active/all', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Creation & Retrieval
router.post('/bulk-create', authenticateToken, requirePermission('ASSET_CREATE'), async (req: AuthRequest, res) => {
  const {
    companyId, cat1Id, cat2Id, cat3Id, cat4Id,
    assetName, serialNumber, quantity, unit, 
    projectName,
    purchasePriceExVat, usagePurpose, supplierName, purchaseDate, depreciationEndDate,
    note
  } = req.body;
  const performedBy = req.user?.username || 'system';

  try {
    const [company, cat1, cat2, cat3, cat4] = await Promise.all([
      prisma.company.findUnique({ where: { id: Number(companyId) } }),
      prisma.assetCategory.findUnique({ where: { id: Number(cat1Id) } }),
      prisma.assetCategory.findUnique({ where: { id: Number(cat2Id) } }),
      prisma.assetCategory.findUnique({ where: { id: Number(cat3Id) } }),
      prisma.assetCategory.findUnique({ where: { id: Number(cat4Id) } }),
    ]);

    if (!company || !cat1 || !cat2 || !cat3 || !cat4) {
      return res.status(400).json({ message: "Invalid classification path" });
    }

    const codes = await AssetService.generateAssetCodes({
      companyCode: company.code,
      level1Code: cat1.code,
      level2Code: cat2.code,
      level3Code: cat3.code,
      level4Code: cat4.code,
      quantity
    });

    const assetsData = codes.map(c => ({
      assetCode: c.assetCode,
      assetName,
      assetNameShort: AssetService.generateShortName(assetName),
      assetNameShortSource: 'RULE',
      assetNameShortUpdatedAt: new Date(),
      serialNumber: quantity === 1 ? serialNumber : (serialNumber ? `${serialNumber}-${c.runningNoText}` : null),
      companyCode: company.code,
      companyName: company.name,
      projectName: projectName || '',
      level1Code: cat1.code,
      level1Name: cat1.name,
      level1Slug: cat1.slug,
      level2Code: cat2.code,
      level2Name: cat2.name,
      level2Slug: cat2.slug,
      level3Code: cat3.code,
      level3Name: cat3.name,
      level3Slug: cat3.slug,
      level4Code: cat4.code,
      level4Name: cat4.name,
      level4Slug: cat4.slug,
      runningNo: c.runningNo,
      runningNoText: c.runningNoText,
      unit: unit || 'Cái',
      purchasePriceExVat: Number(purchasePriceExVat) || 0,
      usagePurpose,
      supplierName,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      depreciationEndDate: depreciationEndDate ? new Date(depreciationEndDate) : null,
      documentNote: note
    }));

    await AssetService.createAssets(assetsData, performedBy);
    res.json({ message: `Created ${quantity} assets` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', authenticateToken, requirePermission('ASSET_UPDATE'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const performedBy = req.user?.username || 'system';

  try {
    const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const { reason, updateAllSameName, ...updates } = req.body;
    
    // Auto-update short name if name changes
    if (updates.assetName && updates.assetName !== asset.assetName) {
      if (asset.assetNameShortSource === 'RULE') {
        updates.assetNameShort = AssetService.generateShortName(updates.assetName);
        updates.assetNameShortUpdatedAt = new Date();
      }
    }

    const updatedAsset = await AssetService.updateAsset(Number(id), updates, performedBy, reason, !!updateAllSameName);
    res.json(updatedAsset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// --- INVOICE IMPORT ENDPOINTS ---
router.post('/import-invoice/parse', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp tin để tải lên.' });
    }

    const filename = req.file.originalname.toLowerCase();
    
    // Save file locally to uploads/invoices
    const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = path.extname(req.file.originalname) || (filename.endsWith('.xml') ? '.xml' : filename.endsWith('.pdf') ? '.pdf' : '.xlsx');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const savedFilename = `invoice-${Date.now()}-${randomSuffix}${ext}`;
    const filePath = path.join(uploadsDir, savedFilename);
    fs.writeFileSync(filePath, req.file.buffer);
    const fileUrl = `/uploads/invoices/${savedFilename}`;

    let result: any;
    if (filename.endsWith('.xml')) {
      const xmlContent = req.file.buffer.toString('utf-8');
      result = await InvoiceParserService.parseXml(xmlContent);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      result = await InvoiceParserService.parseExcel(req.file.buffer);
    } else if (filename.endsWith('.pdf') || filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      // PDF or Image text fallback
      result = {
        invoice: { invoiceNo: '', invoiceDate: '', supplierName: '', supplierTaxCode: '', totalAmount: 0 },
        lines: [],
        warnings: ['Không thể bóc tách đầy đủ dữ liệu từ PDF/Ảnh. Vui lòng nhập thủ công hoặc dùng file Excel/XML.']
      };
    } else {
      return res.status(400).json({ message: 'Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ XML, Excel, PDF và ảnh.' });
    }

    // Attach fileUrl to result
    if (result && result.invoice) {
      result.invoice.fileUrl = fileUrl;
    }

    return res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/import-invoice/post', authenticateToken, async (req: any, res) => {
  const performedBy = req.user?.username || 'system';

  try {
    const result = await InvoicePostService.postInvoice(req.body, performedBy);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/invoices', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { search = '' } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { invoiceNo: { contains: String(search), mode: 'insensitive' } },
        { supplierName: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    const invoices = await prisma.assetInvoiceBatch.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: 50
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const invoice = await prisma.assetInvoiceBatch.findUnique({
      where: { id },
      include: {
        assets: {
          where: { isDeleted: false },
          orderBy: { assetCode: 'asc' }
        }
      }
    });
    if (!invoice) {
      return res.status(404).json({ message: 'Hóa đơn không tồn tại.' });
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/link-invoice', authenticateToken, requirePermission('ASSET_UPDATE'), async (req: AuthRequest, res) => {
  try {
    const assetId = parseInt(req.params.id as string);
    const { invoiceBatchId } = req.body;
    const performedBy = req.user?.username || 'system';

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return res.status(404).json({ message: 'Tài sản không tồn tại.' });

    const oldInvoiceId = asset.invoiceBatchId;

    if (invoiceBatchId === null || invoiceBatchId === undefined || invoiceBatchId === '') {
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          invoiceBatchId: null,
          invoiceLineId: null
        }
      });
      
      await prisma.assetEditLog.create({
        data: {
          assetId,
          fieldName: 'invoiceBatchId',
          oldValue: oldInvoiceId ? String(oldInvoiceId) : null,
          newValue: null,
          editedBy: performedBy
        }
      });

      return res.json({ message: 'Đã hủy liên kết hóa đơn thành công.' });
    }

    const batch = await prisma.assetInvoiceBatch.findUnique({ where: { id: parseInt(invoiceBatchId) } });
    if (!batch) return res.status(404).json({ message: 'Hóa đơn không tồn tại.' });

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        invoiceBatchId: batch.id,
        supplierName: batch.supplierName,
        supplierTaxCode: batch.supplierTaxCode,
        purchaseDate: batch.invoiceDate
      }
    });

    await prisma.assetEditLog.create({
      data: {
        assetId,
        fieldName: 'invoiceBatchId',
        oldValue: oldInvoiceId ? String(oldInvoiceId) : null,
        newValue: String(batch.id),
        editedBy: performedBy
      }
    });

    res.json({ message: 'Đã liên kết hóa đơn thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get static CSV template for importing assets from invoices
router.get('/import-invoice/template', async (req, res) => {
  try {
    const headers = [
      'invoiceNo', 'invoiceDate', 'supplierName', 'supplierTaxCode',
      'itemName', 'standardAssetName', 'category1', 'category2',
      'category3', 'category4', 'quantity', 'unitPrice', 'serials', 'note'
    ];
    const example = [
      'HD-001', '2026-05-18', 'Dell Vietnam', '0102030405',
      'Laptop Dell XPS 15 9530', 'Laptop Dell XPS 15 2024', '03 - Máy móc, thiết bị', '01 - Thiết bị văn phòng',
      '01 - Thiết bị đầu cuối', '01 - PC', '5', '45000000', 'SN-XPS001, SN-XPS002, SN-XPS003, SN-XPS004, SN-XPS005', 'Hàng nhập mới cho ban CNTT'
    ];
    
    // Add BOM for Microsoft Excel to auto-detect UTF-8 and display Vietnamese diacritics
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), example.join(',')].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Nhap_Tai_San_Hoa_Don.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /export-excel - Sổ tài sản (Asset Register Snapshot with filters)
router.get('/export-excel', authenticateToken, requirePermission('ASSET_VIEW'), async (req: AuthRequest, res) => {
  const { 
    search = '', 
    sortBy = 'updatedAt', 
    sortOrder = 'desc',
    status,
    companyCode,
    currentUserName,
    departmentName,
    locationQuery,
    cityName,
    projectName,
    level4Code,
    priceMin,
    priceMax,
    purchaseDateFrom,
    purchaseDateTo,
    handoverDateFrom,
    handoverDateTo,
    depreciationEndDateFrom,
    depreciationEndDateTo,
    supplierName,
    hasSerial,
    hasDocuments,
    lastInventoryFrom,
    lastInventoryTo,
    inventoryStatus,
    createdFrom,
    createdTo
  } = req.query;

  const where: any = { isDeleted: false };
  const andClauses: any[] = [];

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName'
  });
  
  if (Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      const workbook = buildExcelWorkbook('DANH SÁCH SỔ TÀI SẢN', 'Không tìm thấy dữ liệu', [], [], 'Sổ tài sản');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=SoTaiSan.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    andClauses.push(scopeWhere);
  }

  // Advanced Search
  if (search) {
    const searchString = String(search);
    andClauses.push({
      OR: [
        { assetCode: { contains: searchString, mode: 'insensitive' } },
        { assetName: { contains: searchString, mode: 'insensitive' } },
        { assetNameShort: { contains: searchString, mode: 'insensitive' } },
        { serialNumber: { contains: searchString, mode: 'insensitive' } },
        { companyCode: { contains: searchString, mode: 'insensitive' } },
        { companyName: { contains: searchString, mode: 'insensitive' } },
        { projectName: { contains: searchString, mode: 'insensitive' } },
        { level1Code: { contains: searchString, mode: 'insensitive' } },
        { level1Name: { contains: searchString, mode: 'insensitive' } },
        { level2Code: { contains: searchString, mode: 'insensitive' } },
        { level2Name: { contains: searchString, mode: 'insensitive' } },
        { level3Code: { contains: searchString, mode: 'insensitive' } },
        { level3Name: { contains: searchString, mode: 'insensitive' } },
        { level4Code: { contains: searchString, mode: 'insensitive' } },
        { level4Name: { contains: searchString, mode: 'insensitive' } },
        { runningNoText: { contains: searchString, mode: 'insensitive' } },
        { status: { contains: searchString, mode: 'insensitive' } },
        { unit: { contains: searchString, mode: 'insensitive' } },
        { usagePurpose: { contains: searchString, mode: 'insensitive' } },
        { supplierName: { contains: searchString, mode: 'insensitive' } },
        { currentUserName: { contains: searchString, mode: 'insensitive' } },
        { currentPosition: { contains: searchString, mode: 'insensitive' } },
        { departmentName: { contains: searchString, mode: 'insensitive' } },
        { locationName: { contains: searchString, mode: 'insensitive' } },
        { cityName: { contains: searchString, mode: 'insensitive' } },
        { documentNote: { contains: searchString, mode: 'insensitive' } },
        { lastInventoryStatus: { contains: searchString, mode: 'insensitive' } }
      ]
    });
  }

  if (status) {
    const statusArray = String(status).split(',').filter(Boolean);
    if (statusArray.length > 0) {
      const mappedStatuses: string[] = [];
      for (const s of statusArray) {
        if (s === 'BROKEN') {
          mappedStatuses.push('DAMAGED');
          mappedStatuses.push('BROKEN');
        } else if (s === 'LIQUIDATED') {
          mappedStatuses.push('LIQUIDATED');
          mappedStatuses.push('DISPOSED');
        } else {
          mappedStatuses.push(s);
        }
      }
      where.status = { in: mappedStatuses };
    }
  }

  if (companyCode) where.companyCode = String(companyCode);
  if (currentUserName) where.currentUserName = { contains: String(currentUserName), mode: 'insensitive' };
  if (departmentName) where.departmentName = { contains: String(departmentName), mode: 'insensitive' };
  if (level4Code) where.level4Code = String(level4Code);
  if (cityName) where.cityName = { contains: String(cityName), mode: 'insensitive' };
  if (projectName) where.projectName = { contains: String(projectName), mode: 'insensitive' };
  if (locationQuery) {
    andClauses.push({
      OR: [
        { locationName: { contains: String(locationQuery), mode: 'insensitive' } },
        { cityName: { contains: String(locationQuery), mode: 'insensitive' } },
        { projectName: { contains: String(locationQuery), mode: 'insensitive' } }
      ]
    });
  }

  if (priceMin || priceMax) {
    where.purchasePriceExVat = {};
    if (priceMin) where.purchasePriceExVat.gte = Number(priceMin);
    if (priceMax) where.purchasePriceExVat.lte = Number(priceMax);
  }

  if (purchaseDateFrom || purchaseDateTo) {
    where.purchaseDate = {};
    if (purchaseDateFrom) where.purchaseDate.gte = new Date(String(purchaseDateFrom));
    if (purchaseDateTo) where.purchaseDate.lte = new Date(String(purchaseDateTo));
  }
  
  if (handoverDateFrom || handoverDateTo) {
    where.handoverDate = {};
    if (handoverDateFrom) where.handoverDate.gte = new Date(String(handoverDateFrom));
    if (handoverDateTo) where.handoverDate.lte = new Date(String(handoverDateTo));
  }

  if (depreciationEndDateFrom || depreciationEndDateTo) {
    where.depreciationEndDate = {};
    if (depreciationEndDateFrom) where.depreciationEndDate.gte = new Date(String(depreciationEndDateFrom));
    if (depreciationEndDateTo) where.depreciationEndDate.lte = new Date(String(depreciationEndDateTo));
  }

  if (lastInventoryFrom || lastInventoryTo) {
    where.lastInventoryDate = {};
    if (lastInventoryFrom) where.lastInventoryDate.gte = new Date(String(lastInventoryFrom));
    if (lastInventoryTo) where.lastInventoryDate.lte = new Date(String(lastInventoryTo));
  }

  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) where.createdAt.gte = new Date(String(createdFrom));
    if (createdTo) {
      const end = new Date(String(createdTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (supplierName) where.supplierName = { contains: String(supplierName), mode: 'insensitive' };
  if (inventoryStatus) where.lastInventoryStatus = String(inventoryStatus);
  if (hasSerial === 'true') where.serialNumber = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasSerial === 'false') where.serialNumber = { in: [null, '', 'N/A', 'n/a'] };
  if (hasDocuments === 'true') where.documentNote = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasDocuments === 'false') where.documentNote = { in: [null, '', 'N/A', 'n/a'] };

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  try {
    const assets = await prisma.asset.findMany({
      where,
      orderBy: { [String(sortBy)]: sortOrder }
    });

    const hasPricePermission = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.permissions?.includes('ASSET_VIEW_PRICE');

    const headers = [
      'Mã tài sản', 'Tên tài sản', 'Tên rút gọn', 'Số Serial', 'Mã công ty', 'Tên công ty', 'Dự án',
      'Nhóm LV1', 'Nhóm LV2', 'Nhóm LV3', 'Nhóm LV4', 'Trạng thái', 'Đơn vị tính',
      ...(hasPricePermission ? ['Giá mua (Ex VAT)'] : []),
      'Ngày mua', 'Người sử dụng', 'Chức vụ', 'Bộ phận', 'Vị trí', 'Tỉnh/Thành phố', 'Ngày bàn giao', 'Nhà cung cấp', 'Hạn khấu hao', 'Ghi chú tài liệu'
    ];

    const rows = assets.map(a => [
      a.assetCode,
      a.assetName,
      a.assetNameShort || '',
      a.serialNumber || '',
      a.companyCode,
      a.companyName,
      a.projectName || '',
      a.level1Name,
      a.level2Name,
      a.level3Name,
      a.level4Name,
      a.status === 'IN_STOCK' ? 'Trong kho' :
      a.status === 'ASSIGNED' ? 'Đã cấp phát' :
      a.status === 'UNDER_REPAIR' ? 'Đang sửa chữa' :
      a.status === 'DAMAGED' ? 'Bị hỏng' :
      a.status === 'LOST' ? 'Bị mất' :
      a.status === 'LIQUIDATED' ? 'Đã thanh lý' : a.status,
      a.unit || 'Cái',
      ...(hasPricePermission ? [a.purchasePriceExVat] : []),
      formatDate(a.purchaseDate),
      a.currentUserName || '',
      a.currentPosition || '',
      a.departmentName || '',
      a.locationName || '',
      a.cityName || '',
      formatDate(a.handoverDate),
      a.supplierName || '',
      formatDate(a.depreciationEndDate),
      a.documentNote || ''
    ]);

    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO CHI TIẾT SỔ TÀI SẢN',
      `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Sổ tài sản'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoSoTaiSan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

// GET /export-created - Cấp mới / Nhập lô (New Assignment / Batch Import by Date Range)
router.get('/export-created', authenticateToken, requirePermission('ASSET_VIEW'), async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  const where: any = { isDeleted: false };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName'
  });
  if (Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      const workbook = buildExcelWorkbook('DANH SÁCH CẤP MỚI - NHẬP LÔ TÀI SẢN', 'Không tìm thấy dữ liệu', [], [], 'Nhập lô');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoNhapLo.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    where.AND = [scopeWhere];
  }

  try {
    const assets = await prisma.asset.findMany({
      where,
      include: {
        creationBatch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const assetIds = assets.map(a => a.id);
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ASSET',
        entityId: { in: assetIds },
        action: 'CREATE'
      }
    });
    const auditLogMap = new Map(auditLogs.map(log => [log.entityId, log.performedBy]));

    const hasPricePermission = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.permissions?.includes('ASSET_VIEW_PRICE');

    const headers = [
      'Mã đợt nhập', 'Ngày nhập lô', 'Người thực hiện', 'Nhà cung cấp', 'Số chứng từ/Hóa đơn',
      'Mã tài sản', 'Tên tài sản', 'Loại phân mục (Cấp 4)', 'Số Serial', 'Đơn vị tính',
      ...(hasPricePermission ? ['Nguyên giá'] : []),
      'Trạng thái tài sản ban đầu', 'Ghi chú đợt'
    ];

    const rows = assets.map(a => {
      const creator = auditLogMap.get(a.id) || 'system';
      return [
        a.creationBatch?.batchCode || 'Cá lẻ (Không đợt)',
        a.creationBatch?.batchDate ? formatDate(a.creationBatch.batchDate) : formatDate(a.createdAt),
        creator,
        a.supplierName || a.creationBatch?.supplierName || '',
        a.creationBatch?.documentNo || '',
        a.assetCode,
        a.assetName,
        `${a.level4Code} - ${a.level4Name}`,
        a.serialNumber || '',
        a.unit || 'Cái',
        ...(hasPricePermission ? [a.purchasePriceExVat] : []),
        a.status === 'IN_STOCK' ? 'Trong kho' :
        a.status === 'ASSIGNED' ? 'Đã cấp phát' : a.status,
        a.creationBatch?.note || ''
      ];
    });

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP CẤP MỚI / NHẬP LÔ TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Cấp mới nhập lô'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoNhapLoTaiSan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

// GET /export-liquidated - Thanh lý tài sản (Liquidation records by Date Range)
router.get('/export-liquidated', authenticateToken, requirePermission('ASSET_VIEW'), async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  const where: any = {};

  if (startDate || endDate) {
    where.liquidationRecord = {
      liquidationDate: {}
    };
    if (startDate) where.liquidationRecord.liquidationDate.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.liquidationRecord.liquidationDate.lte = end;
    }
  }

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName'
  });
  if (Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      const workbook = buildExcelWorkbook('DANH SÁCH THANH LÝ TÀI SẢN', 'Không tìm thấy dữ liệu', [], [], 'Thanh lý');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoThanhLy.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    where.asset = scopeWhere;
  }

  try {
    const items = await prisma.liquidationItem.findMany({
      where,
      include: {
        liquidationRecord: true,
        asset: true
      },
      orderBy: {
        liquidationRecord: {
          liquidationDate: 'desc'
        }
      }
    });

    const hasPricePermission = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.permissions?.includes('ASSET_VIEW_PRICE');

    const headers = [
      'Mã hồ sơ thanh lý', 'Ngày thanh lý', 'Loại thanh lý', 'Số chứng từ/Hợp đồng',
      'Đối tác mua/nhận', 'Lý do thanh lý', 'Mã tài sản', 'Tên tài sản',
      ...(hasPricePermission ? ['Nguyên giá tài sản', 'Giá trị thanh lý'] : []),
      'Ghi chú hồ sơ'
    ];

    const rows = items.map(item => [
      item.liquidationRecord.liquidationCode,
      formatDate(item.liquidationRecord.liquidationDate),
      item.liquidationRecord.liquidationType === 'SELL' ? 'Bán thanh lý' :
      item.liquidationRecord.liquidationType === 'DESTROY' ? 'Hủy bỏ' :
      item.liquidationRecord.liquidationType === 'GIVE' ? 'Cho tặng' :
      item.liquidationRecord.liquidationType === 'RETURN_SUPPLIER' ? 'Trả NCC' : item.liquidationRecord.liquidationType || '',
      item.liquidationRecord.documentNo || '',
      item.liquidationRecord.buyerName || '',
      item.liquidationRecord.reason || '',
      item.asset.assetCode,
      item.asset.assetName,
      ...(hasPricePermission ? [item.asset.purchasePriceExVat, item.assetValue] : []),
      item.liquidationRecord.note || ''
    ]);

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP THANH LÝ TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Thanh lý tài sản'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoThanhLyTaiSan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

router.get('/:id', authenticateToken, requirePermission('ASSET_VIEW'), async (req: AuthRequest, res) => {
  const asset = await prisma.asset.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      assignments: { orderBy: { createdAt: 'desc' } },
      damageReports: { include: { damageReport: true } },
      lostReports: { orderBy: { createdAt: 'desc' } },
      liquidations: { include: { liquidationRecord: true } },
      events: { orderBy: { eventDate: 'desc' } },
      editLogs: { orderBy: { createdAt: 'desc' } },
      repairTickets: { orderBy: { createdAt: 'desc' } },
      repairLogs: { orderBy: { createdAt: 'desc' } },
      histories: { orderBy: { eventTime: 'desc' } },
      invoiceBatch: true,
      invoiceLine: true
    }
  });

  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  // Data Scope Check for details view
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName'
  });

  // Verify the user can see this specific asset
  if (scopeWhere.id !== undefined && scopeWhere.id === -1) {
    return res.status(403).json({ message: 'Bạn không có quyền xem tài sản này (Data Scope)' });
  }

  if (scopeWhere.OR) {
    // Fast manual check since we already have the asset data
    const canView = scopeWhere.OR.some((clause: any) => {
      if (clause.companyCode && clause.companyCode.in.includes(asset.companyCode)) return true;
      if (clause.departmentName && clause.departmentName.in.includes(asset.departmentName)) return true;
      if (clause.locationName && clause.locationName.in.includes(asset.locationName)) return true;
      return false;
    });
    if (!canView) return res.status(403).json({ message: 'Bạn không có quyền xem tài sản này (Data Scope)' });
  } else if ((scopeWhere as any).currentUserName) {
    if (asset.currentUserName !== req.user?.fullName && asset.currentUserName !== req.user?.username) {
      return res.status(403).json({ message: 'Bạn không có quyền xem tài sản này (Chỉ xem của bản thân)' });
    }
  }

  // Hide price if no ASSET_VIEW_PRICE
  if (!req.user?.roles?.includes('SUPER_ADMIN') && !req.user?.permissions?.includes('ASSET_VIEW_PRICE')) {
    asset.purchasePriceExVat = null;
  }

  // Fetch centralized audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'ASSET', entityId: asset.id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ ...asset, auditLogs });
});

export default router;

