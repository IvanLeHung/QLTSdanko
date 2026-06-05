import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { ToolService } from '../services/tool.service';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// --- DASHBOARD SUMMARY ---
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = await ToolService.getDashboardSummary();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- GET TOOLS LIST ---
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const {
      status,
      category,
      departmentName,
      locationName,
      currentUserName,
      search,
      managementType,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const data = await ToolService.getTools({
      status: status?.toString(),
      category: category?.toString(),
      departmentName: departmentName?.toString(),
      locationName: locationName?.toString(),
      currentUserName: currentUserName?.toString(),
      search: search?.toString(),
      managementType: managementType?.toString(),
      page: page ? parseInt(page.toString(), 10) : 1,
      limit: limit ? parseInt(limit.toString(), 10) : 50,
      sortBy: sortBy?.toString(),
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc'
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- EXPORT TO CSV ---
router.get('/export', authenticateToken, async (req: any, res) => {
  try {
    const idsStr = req.query.ids;
    const ids = idsStr ? idsStr.toString().split(',').map((id: string) => parseInt(id, 10)) : [];
    const csvContent = await ToolService.exportTools(ids);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Danh_sach_CCDC.csv');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- DOWNLOAD TEMPLATE ---
router.get('/template', authenticateToken, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('CCDC');
    
    const headers = [
      'Mã CCDC', 'Tên CCDC', 'Nhóm CCDC', 'Số lượng', 'Đơn vị tính',
      'Giá trị', 'Ngày mua', 'Nhà cung cấp', 'Bộ phận', 'Vị trí',
      'Người sử dụng', 'Tình trạng', 'Ghi chú'
    ];
    sheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    for (let i = 2; i <= 500; i++) {
      sheet.getCell(`D${i}`).numFmt = '#,##0'; // Quantity
      sheet.getCell(`F${i}`).numFmt = '#,##0'; // Price
      sheet.getCell(`G${i}`).numFmt = 'yyyy-mm-dd'; // Purchase date
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=CCDC_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- PREVIEW IMPORT ---
router.post('/import/preview', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const rawRows = await parseCcdcExcel(req.file.buffer);
    const preview = [];
    let creates = 0, updates = 0, errors = 0;

    for (const row of rawRows) {
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      if (!row.toolName) rowErrors.push("Tên CCDC không được để trống.");
      if (!row.category) rowErrors.push("Nhóm CCDC không được để trống.");

      let actionDetected = 'CREATE';
      if (row.toolCode) {
        const existing = await prisma.toolEquipment.findUnique({ where: { toolCode: row.toolCode } });
        if (existing) {
          actionDetected = 'UPDATE';
        }
      }

      const status = rowErrors.length > 0 ? 'ERROR' : 'VALID';
      if (status === 'ERROR') errors++;
      else if (actionDetected === 'CREATE') creates++;
      else updates++;

      preview.push({
        ...row,
        status,
        action_detected: actionDetected,
        messages: rowErrors.concat(rowWarnings)
      });
    }

    res.json({ total: rawRows.length, creates, updates, errors, preview });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- EXECUTE IMPORT (COMMIT) ---
router.post('/import/commit', authenticateToken, upload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const performedBy = req.user?.fullName || req.user?.username || 'system';

  try {
    const rawRows = await parseCcdcExcel(req.file.buffer);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const row of rawRows) {
      try {
        if (!row.toolName || !row.category) {
          failedCount++;
          errors.push(`Dòng ${row.rowNumber}: Tên CCDC hoặc Nhóm CCDC trống.`);
          continue;
        }

        let existing = null;
        if (row.toolCode) {
          existing = await prisma.toolEquipment.findUnique({ where: { toolCode: row.toolCode } });
        }

        if (existing) {
          // Update
          await ToolService.updateTool(existing.id, {
            toolName: row.toolName,
            category: row.category,
            quantity: row.quantity ? Number(row.quantity) : undefined,
            unit: row.unit,
            purchasePrice: row.purchasePrice ? Number(row.purchasePrice) : undefined,
            purchaseDate: row.purchaseDate,
            supplierName: row.supplierName,
            departmentName: row.departmentName,
            locationName: row.locationName,
            currentUserName: row.currentUserName,
            status: row.status || undefined,
            note: row.note
          }, performedBy, 'Cập nhật từ Excel Import');
        } else {
          // Create
          await ToolService.createTool({
            toolCode: row.toolCode,
            toolName: row.toolName,
            category: row.category,
            quantity: row.quantity ? Number(row.quantity) : 1,
            unit: row.unit || 'Cái',
            purchasePrice: row.purchasePrice ? Number(row.purchasePrice) : 0,
            purchaseDate: row.purchaseDate,
            supplierName: row.supplierName,
            departmentName: row.departmentName,
            locationName: row.locationName,
            currentUserName: row.currentUserName,
            status: row.status || 'IN_STOCK',
            note: row.note
          }, performedBy);
        }
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Dòng ${row.rowNumber || 'không rõ'}: ${err.message}`);
      }
    }

    res.json({ success: true, successCount, failedCount, errors });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- GET BY ID ---
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

    const tool = await ToolService.getToolDetail(id);
    if (!tool) return res.status(404).json({ message: 'Không tìm thấy CCDC.' });

    res.json(tool);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- CREATE TOOL ---
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    if (Array.isArray(req.body)) {
      const tools = await ToolService.createToolsBulk(req.body, performedBy);
      res.status(201).json(tools);
    } else {
      const tool = await ToolService.createTool(req.body, performedBy);
      res.status(201).json(tool);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- UPDATE TOOL ---
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const updated = await ToolService.updateTool(id, req.body, performedBy, req.body.reason);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- DELETE TOOL ---
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'ID không hợp lệ.' });

    const performedBy = req.user?.fullName || req.user?.username || 'system';
    await ToolService.deleteTool(id, performedBy);
    res.json({ success: true, message: 'Đã xóa CCDC thành công.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- HANDOVER ROUTING ---
router.post('/handover', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const doc = await ToolService.createHandover(req.body, performedBy);
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/handover/list', authenticateToken, async (req, res) => {
  try {
    const docs = await prisma.toolHandoverDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } }
    });
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/handover/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const doc = await prisma.toolHandoverDocument.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!doc) return res.status(404).json({ message: 'Biên bản không tồn tại.' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/handover/:id/complete', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const doc = await ToolService.completeHandover(id, performedBy);
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/handover/:id/cancel', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const doc = await ToolService.cancelHandover(id, performedBy);
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- REPAIRS ROUTING ---
router.post('/repairs', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const ticket = await ToolService.createRepairTicket(req.body, performedBy);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/repairs/list', authenticateToken, async (req, res) => {
  try {
    const tickets = await prisma.toolRepairTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tool: true }
    });
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/repairs/:id/complete', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const ticket = await ToolService.completeRepairTicket(id, req.body, performedBy);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- LOST ROUTING ---
router.post('/lost', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const report = await ToolService.createLostReport(req.body, performedBy);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/lost/list', authenticateToken, async (req, res) => {
  try {
    const reports = await prisma.toolLostReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { tool: true }
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- LIQUIDATION ROUTING ---
router.post('/liquidation', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const record = await ToolService.createLiquidation(req.body, performedBy);
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/liquidation/list', authenticateToken, async (req, res) => {
  try {
    const records = await prisma.toolLiquidationRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { tool: true } } }
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- INVENTORY ROUTING ---
router.post('/inventory', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const check = await ToolService.createInventoryCheck(req.body, performedBy);
    res.json(check);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/inventory/list', authenticateToken, async (req, res) => {
  try {
    const checks = await prisma.toolInventoryCheck.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } }
    });
    res.json(checks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const check = await prisma.toolInventoryCheck.findUnique({
      where: { id },
      include: { items: { include: { tool: true } } }
    });
    if (!check) return res.status(404).json({ message: 'Đợt kiểm kê không tồn tại.' });
    res.json(check);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/inventory/:id/check', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const item = await ToolService.submitItemCheck(id, req.body, performedBy);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/inventory/:id/complete', authenticateToken, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const check = await ToolService.completeInventoryCheck(id, performedBy);
    res.json(check);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Helper for parsing Excel for CCDC
async function parseCcdcExcel(buffer: any) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("Worksheet not found");
  
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell) => {
    headers.push(cell.text.trim());
  });

  const HEADER_MAP: Record<string, string> = {
    'Mã CCDC': 'toolCode',
    'Tên CCDC': 'toolName',
    'Nhóm CCDC': 'category',
    'Số lượng': 'quantity',
    'Đơn vị tính': 'unit',
    'Giá trị': 'purchasePrice',
    'Ngày mua': 'purchaseDate',
    'Nhà cung cấp': 'supplierName',
    'Bộ phận': 'departmentName',
    'Vị trí': 'locationName',
    'Người sử dụng': 'currentUserName',
    'Tình trạng': 'status',
    'Ghi chú': 'note'
  };

  const STATUS_MAP: Record<string, string> = {
    'Trong kho': 'IN_STOCK',
    'Đang sử dụng': 'USING',
    'Đang sửa chữa': 'DAMAGED',
    'Hỏng': 'DAMAGED',
    'Mất': 'LOST',
    'Chờ thanh lý': 'WAITING_LIQUIDATION',
    'Đã thanh lý': 'LIQUIDATED'
  };

  const rows: any[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const excelRow = worksheet.getRow(i);
    const rowData: any = {};
    let hasData = false;

    headers.forEach((header, index) => {
      const cell = excelRow.getCell(index + 1);
      const internalKey = HEADER_MAP[header] || header;
      let value = cell.value;

      if (value && typeof value === 'object' && (value as any).error) {
        value = null;
      }
      if (value && typeof value === 'object' && (value as any).richText) {
        value = (value as any).richText.map((rt: any) => rt.text).join('');
      }

      if (['toolCode', 'toolName', 'category', 'unit', 'supplierName', 'departmentName', 'locationName', 'currentUserName', 'note'].includes(internalKey)) {
        value = value !== null && value !== undefined ? String(value).trim() : cell.text?.trim() || null;
      }

      if (internalKey === 'quantity') {
        value = value !== null && value !== undefined ? Number(value) : parseInt(cell.text?.trim(), 10) || 1;
        if (isNaN(value)) value = 1;
      }
      if (internalKey === 'purchasePrice') {
        if (value !== null && value !== undefined) {
          value = Number(value);
        } else {
          const txt = cell.text?.trim().replace(/[^0-9.]/g, '');
          value = txt ? parseFloat(txt) : 0;
        }
        if (isNaN(value)) value = 0;
      }
      if (internalKey === 'purchaseDate') {
        if (value instanceof Date) {
          // Keep as date
        } else if (typeof value === 'number') {
          value = new Date(Math.round((value - 25569) * 86400 * 1000));
        } else {
          const str = cell.text?.trim();
          if (str) {
            const d = new Date(str);
            value = isNaN(d.getTime()) ? null : d;
          } else {
            value = null;
          }
        }
      }
      if (internalKey === 'status') {
        const txt = cell.text?.trim();
        value = STATUS_MAP[txt] || 'IN_STOCK';
      }

      if (value !== null && value !== undefined && value !== '') {
        hasData = true;
      }
      rowData[internalKey] = value;
    });

    if (hasData) {
      rowData.rowNumber = i;
      rows.push(rowData);
    }
  }
  return rows;
}

// --- QUANTITY STOCK MANAGEMENT ROUTING ---

router.post('/stock/transfer', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.transferStock(req.body, performedBy);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/use', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.allocateStock(req.body, performedBy);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/recall', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.recallStock(req.body, performedBy);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/damage', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.reportDamageStock(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/repair-complete', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.completeRepairStock(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/lost', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.reportLostStock(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/batch', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.importNewBatch(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/adjust', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.adjustStock(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock/split', authenticateToken, async (req: any, res) => {
  try {
    const performedBy = req.user?.fullName || req.user?.username || 'system';
    const result = await ToolService.splitStock(req.body, performedBy);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
