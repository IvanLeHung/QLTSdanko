import { Router } from 'express';
import prisma from '../utils/prisma';
import { AssetService } from '../services/asset.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Stats for summary cards
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [total, assigned, inStock, underRepair, damaged, lost, liquidated] = await Promise.all([
      prisma.asset.count({ where: { isDeleted: false } }),
      prisma.asset.count({ where: { status: 'ASSIGNED', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'IN_STOCK', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'UNDER_REPAIR', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'DAMAGED', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'LOST', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'LIQUIDATED', isDeleted: false } }),
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
      currentUserName: { contains: String(q) },
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
        { level4Code: { contains: String(q) } },
        { level4Name: { contains: String(q) } },
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
      departmentName: { contains: String(q) },
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
      OR: [
        { locationName: { contains: String(q) } },
        { cityName: { contains: String(q) } },
        { projectName: { contains: String(q) } },
      ],
      isDeleted: false
    },
    select: { locationName: true, cityName: true, projectName: true },
    distinct: ['locationName', 'cityName', 'projectName'],
    take: 20
  });
  
  const results = new Set<string>();
  locs.forEach(l => {
    if (l.locationName) results.add(l.locationName);
    if (l.cityName) results.add(l.cityName);
    if (l.projectName) results.add(l.projectName);
  });
  
  res.json(Array.from(results).filter(s => s.toLowerCase().includes(String(q).toLowerCase())).slice(0, 10));
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
      supplierName: { contains: String(q) },
      isDeleted: false 
    },
    select: { supplierName: true },
    distinct: ['supplierName'],
    take: 10
  });
  res.json(suppliers.map(s => s.supplierName).filter(Boolean));
});

// Main Asset List Query
router.get('/', authenticateToken, async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    
    // Quick Filters
    status,         // single or comma-separated
    companyCode,
    currentUserName,
    departmentName,
    locationQuery,
    level4Code,
    
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
    inventoryStatus
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = { isDeleted: false };

  // Advanced Search (Global Search Box)
  if (search) {
    where.OR = [
      { assetCode: { contains: String(search) } },
      { assetName: { contains: String(search) } },
      { serialNumber: { contains: String(search) } },
      { currentUserName: { contains: String(search) } },
      { departmentName: { contains: String(search) } },
      { locationName: { contains: String(search) } },
      { projectName: { contains: String(search) } },
      { supplierName: { contains: String(search) } },
    ];
  }

  // Multi-status filter
  if (status) {
    const statusArray = String(status).split(',').filter(Boolean);
    if (statusArray.length > 0) {
      where.status = { in: statusArray };
    }
  }

  if (companyCode) where.companyCode = String(companyCode);
  if (currentUserName) where.currentUserName = { contains: String(currentUserName) };
  if (departmentName) where.departmentName = { contains: String(departmentName) };
  if (level4Code) where.level4Code = String(level4Code);
  
  if (locationQuery) {
    where.OR = where.OR || [];
    where.OR.push(
      { locationName: { contains: String(locationQuery) } },
      { cityName: { contains: String(locationQuery) } },
      { projectName: { contains: String(locationQuery) } }
    );
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

  // Other metadata
  if (supplierName) where.supplierName = { contains: String(supplierName) };
  if (inventoryStatus) where.lastInventoryStatus = String(inventoryStatus);

  if (hasSerial === 'true') where.serialNumber = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasSerial === 'false') where.serialNumber = { in: [null, '', 'N/A', 'n/a'] };

  if (hasDocuments === 'true') where.documentNote = { not: null, notIn: ['', 'N/A', 'n/a'] };
  if (hasDocuments === 'false') where.documentNote = { in: [null, '', 'N/A', 'n/a'] };

  try {
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [String(sortBy)]: sortOrder }
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
  const companies = await prisma.company.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
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

// Creation & Retrieval
router.post('/bulk-create', authenticateToken, async (req: AuthRequest, res) => {
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
      note
    }));

    await AssetService.createAssets(assetsData, performedBy);
    res.json({ message: `Created ${quantity} assets` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
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
      repairLogs: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!asset) return res.status(404).json({ message: 'Asset not found' });

  // Fetch centralized audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'ASSET', entityId: asset.id },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ ...asset, auditLogs });
});

router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const performedBy = req.user?.username || 'system';

  try {
    const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const { reason, ...updates } = req.body;
    
    // Auto-update short name if name changes
    if (updates.assetName && updates.assetName !== asset.assetName) {
      if (asset.assetNameShortSource === 'RULE') {
        updates.assetNameShort = AssetService.generateShortName(updates.assetName);
        updates.assetNameShortUpdatedAt = new Date();
      }
    }

    const updatedAsset = await AssetService.updateAsset(Number(id), updates, performedBy, reason);
    res.json(updatedAsset);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
