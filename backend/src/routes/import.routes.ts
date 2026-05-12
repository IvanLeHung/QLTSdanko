import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { ImportService } from '../services/import.service';
import { AssetService } from '../services/asset.service';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const STATUS_OPTIONS = ['IN_STOCK', 'ASSIGNED', 'IN_TRANSFER', 'UNDER_REPAIR', 'LOST', 'DAMAGED', 'PENDING_DISPOSAL', 'DISPOSED', 'RETIRED'];
const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'UPSERT'];

// --- 1. DOWNLOAD TEMPLATE ---
const BUSINESS_HEADERS = [
  'MTS', 'TTTS', 'MCTY', 'Group LV1', 'Group LV2', 'Group LV3', 'Group LV4',
  'VN_Group_Lv1', 'VN_Group_Lv2', 'VN_Group_Lv3', 'VN_Group_Lv4',
  'Name Asset', 'Serial number', 'ĐVT', 'Purpose', 'Trạng thái',
  'Người dùng', 'Chức vụ/Mục đích', 'Bộ phận', 'Vị trí', 'Tỉnh/Thành phố',
  'Ngày bàn giao', 'Giấy tờ', 'Ngày mua', 'Giá', 'Ngày hết khấu hao', 'Nhà cung cấp',
  'import_action'
];

const TECHNICAL_MAP: Record<string, string> = {
  'MTS': 'asset_code', 'TTTS': 'running_no_text', 'MCTY': 'company_code',
  'Group LV1': 'level1_code', 'Group LV2': 'level2_code', 'Group LV3': 'level3_code', 'Group LV4': 'level4_code',
  'VN_Group_Lv1': 'level1_name', 'VN_Group_Lv2': 'level2_name', 'VN_Group_Lv3': 'level3_name', 'VN_Group_Lv4': 'level4_name',
  'Name Asset': 'asset_name', 'Serial number': 'serial_number', 'ĐVT': 'unit', 'Purpose': 'usage_purpose',
  'Trạng thái': 'status', 'Người dùng': 'current_user_name', 'Chức vụ/Mục đích': 'current_position',
  'Bộ phận': 'department_name', 'Vị trí': 'location_name', 'Tỉnh/Thành phố': 'city_name',
  'Ngày bàn giao': 'handover_date', 'Giấy tờ': 'document_note', 'Ngày mua': 'purchase_date',
  'Giá': 'purchase_price_ex_vat', 'Ngày hết khấu hao': 'depreciation_end_date', 'Nhà cung cấp': 'supplier_name',
  'import_action': 'import_action'
};

// --- 1. DOWNLOAD TEMPLATE ---
router.get('/assets/template', authenticateToken, async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assets');
  
  sheet.columns = BUSINESS_HEADERS.map(h => ({ header: h, key: h, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Data Validations and Formatting
  for (let i = 2; i <= 1000; i++) {
    // Action Dropdown
    sheet.getCell(`AB${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"CREATE,UPDATE,UPSERT"`]
    };
    // Force text for code columns: MTS, TTTS, MCTY, Group LV1-4, Serial
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'M'].forEach(col => {
      sheet.getCell(`${col}${i}`).numFmt = '@';
    });
    // Price format
    sheet.getCell(`Y${i}`).numFmt = '#,##0';
  }

  // Sheet 2: Field Mapping
  const mapSheet = workbook.addWorksheet('Field Mapping');
  mapSheet.columns = [{ header: 'Template Column', key: 'tc', width: 25 }, { header: 'System Field', key: 'sf', width: 25 }];
  Object.entries(TECHNICAL_MAP).forEach(([tc, sf]) => mapSheet.addRow({ tc, sf }));

  // Sheet 3: Valid Categories (Under 03)
  const catSheet = workbook.addWorksheet('Valid Categories');
  catSheet.columns = [
    { header: 'Group LV1', key: 'l1', width: 15 }, { header: 'VN_Group_Lv1', key: 'l1n', width: 20 },
    { header: 'Group LV2', key: 'l2', width: 15 }, { header: 'VN_Group_Lv2', key: 'l2n', width: 20 },
    { header: 'Group LV3', key: 'l3', width: 15 }, { header: 'VN_Group_Lv3', key: 'l3n', width: 20 },
    { header: 'Group LV4', key: 'l4', width: 15 }, { header: 'VN_Group_Lv4', key: 'l4n', width: 20 },
  ];
  
  // Fetch all categories for reference
  const l1s = await prisma.assetCategory.findMany({ where: { level: 1 } });
  for (const l1 of l1s) {
      const l2s = await prisma.assetCategory.findMany({ where: { parentId: l1.id } });
      for (const l2 of l2s) {
          const l3s = await prisma.assetCategory.findMany({ where: { parentId: l2.id } });
          for (const l3 of l3s) {
              const l4s = await prisma.assetCategory.findMany({ where: { parentId: l3.id } });
              for (const l4 of l4s) {
                  catSheet.addRow({
                      l1: l1.code, l1n: l1.name,
                      l2: l2.code, l2n: l2.name,
                      l3: l3.code, l3n: l3.name,
                      l4: l4.code, l4n: l4.name
                  });
              }
              if (l4s.length === 0) {
                  catSheet.addRow({
                      l1: l1.code, l1n: l1.name,
                      l2: l2.code, l2n: l2.name,
                      l3: l3.code, l3n: l3.name,
                      l4: '', l4n: ''
                  });
              }
          }
          if (l3s.length === 0) {
              catSheet.addRow({
                  l1: l1.code, l1n: l1.name,
                  l2: l2.code, l2n: l2.name,
                  l3: '', l3n: '',
                  l4: '', l4n: ''
              });
          }
      }
      if (l2s.length === 0) {
          catSheet.addRow({
              l1: l1.code, l1n: l1.name,
              l2: '', l2n: '',
              l3: '', l3n: '',
              l4: '', l4n: ''
          });
      }
  }

  // Sheet 4: Status Mapping
  const statusSheet = workbook.addWorksheet('Status Mapping');
  statusSheet.columns = [{ header: 'Vietnamese Status', key: 'vn', width: 25 }, { header: 'Internal Status', key: 'en', width: 25 }];
  statusSheet.addRow({ vn: 'Trong kho', en: 'IN_STOCK' });
  statusSheet.addRow({ vn: 'Đang sử dụng', en: 'ASSIGNED' });
  statusSheet.addRow({ vn: 'Đang cấp phát', en: 'ASSIGNED' });
  statusSheet.addRow({ vn: 'Đang sửa chữa', en: 'UNDER_REPAIR' });
  statusSheet.addRow({ vn: 'Mất', en: 'LOST' });
  statusSheet.addRow({ vn: 'Hỏng', en: 'DAMAGED' });
  statusSheet.addRow({ vn: 'Chờ thanh lý', en: 'PENDING_DISPOSAL' });
  statusSheet.addRow({ vn: 'Đã thanh lý', en: 'DISPOSED' });
  statusSheet.addRow({ vn: 'Ngừng sử dụng', en: 'RETIRED' });

  // Sheet 5: Instructions
  const instrSheet = workbook.addWorksheet('Instructions');
  instrSheet.columns = [{ header: 'Hướng dẫn', width: 100 }];
  [
    'Có thể copy trực tiếp dữ liệu từ file tài sản hiện tại vào sheet Assets.',
    'Không đổi tên sheet Assets.',
    'Không đổi tên header.',
    'Các cột mã như MCTY, Group LV1-4, TTTS phải giữ dạng text.',
    'import_action để trống sẽ mặc định là UPSERT.',
    'MCTY để trống sẽ mặc định là 00 (Công ty chung).',
    'MTS có dữ liệu thì phần mềm sẽ update hoặc upsert theo MTS.',
    'MTS để trống thì phần mềm sẽ tạo mã mới nếu đủ MCTY và Group LV1-4.',
    'Hệ thống hỗ trợ tất cả các nhóm phân loại tài sản.',
    'Sau khi upload, hệ thống sẽ preview trước khi import thật.'
  ].forEach(text => instrSheet.addRow([text]));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=asset_import_template.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// --- 2. EXPORT CURRENT ASSETS ---
router.get('/assets/export', authenticateToken, async (req, res) => {
  const assets = await prisma.asset.findMany({ where: { isDeleted: false } });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assets');
  
  sheet.columns = BUSINESS_HEADERS.map(h => ({ header: h, key: h, width: 20 }));
  sheet.getRow(1).font = { bold: true };

  assets.forEach(a => {
    sheet.addRow({
      'MTS': a.assetCode,
      'TTTS': a.runningNoText,
      'MCTY': a.companyCode,
      'Group LV1': a.level1Code,
      'Group LV2': a.level2Code,
      'Group LV3': a.level3Code,
      'Group LV4': a.level4Code,
      'VN_Group_Lv1': a.level1Name,
      'VN_Group_Lv2': a.level2Name,
      'VN_Group_Lv3': a.level3Name,
      'VN_Group_Lv4': a.level4Name,
      'Name Asset': a.assetName,
      'Serial number': a.serialNumber,
      'ĐVT': a.unit,
      'Purpose': a.usagePurpose,
      'Trạng thái': a.status,
      'Người dùng': a.currentUserName,
      'Chức vụ/Mục đích': a.currentPosition,
      'Bộ phận': a.departmentName,
      'Vị trí': a.locationName,
      'Tỉnh/Thành phố': a.cityName,
      'Ngày bàn giao': a.handoverDate,
      'Giấy tờ': a.documentNote,
      'Ngày mua': a.purchaseDate,
      'Giá': a.purchasePriceExVat,
      'Ngày hết khấu hao': a.depreciationEndDate,
      'Nhà cung cấp': a.supplierName,
      'import_action': 'UPDATE'
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=current_assets_export.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// --- 3. PREVIEW IMPORT ---
router.post('/assets/preview', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const rawRows = await ImportService.parseExcel(req.file.buffer);
    const preview = [];
    let creates = 0, updates = 0, errors = 0;

    for (const row of rawRows) {
      const validation = await ImportService.validateRow(row);
      if (validation.status === 'ERROR') errors++;
      else if (validation.detected_action === 'CREATE') creates++;
      else updates++;

      preview.push({
        ...row,
        status: validation.status,
        action_detected: validation.detected_action,
        messages: validation.errors.concat(validation.warnings)
      });
    }

    res.json({ total: rawRows.length, creates, updates, errors, preview });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- 4. EXECUTE IMPORT (COMMIT) ---
router.post('/assets/excel', authenticateToken, upload.single('file'), async (req, res) => {
    console.log(`[IMPORT] Received request for excel import. File: ${req.file?.originalname}, Size: ${req.file?.size}`);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
        console.log(`[IMPORT] Parsing excel file...`);
        const rows = await ImportService.parseExcel(req.file.buffer);
        console.log(`[IMPORT] Parsed ${rows.length} rows.`);
        let successCount = 0;

        // Performance Optimization: Cache for lookups
        const companyCache = new Map<string, any>();
        const categoryCache = new Map<string, any>(); // key format: "level-parentId-code"

        console.log(`Starting import of ${rows.length} rows...`);
        const fs = require('fs');
        const logPath = 'import_errors.log';
        fs.writeFileSync(logPath, `Import started at ${new Date().toISOString()}\n`);

        let failedCount = 0;
        const rowErrors: string[] = [];

        for (const row of rows) {
            try {
                // Clean up broken Vietnamese characters in names
                if (row.asset_name) {
                    row.asset_name = row.asset_name
                        .replace(/B\?/g, 'Bộ')
                        .replace(/Chi\?c/g, 'Chiếc')
                        .replace(/C\?i/g, 'Cái');
                }

                const validation = await ImportService.validateRow(row);
                if (validation.status === 'ERROR') {
                    failedCount++;
                    const errMsg = `Row ${row.rowNumber}: Validation Error - ${validation.errors.join(', ')}`;
                    rowErrors.push(errMsg);
                    fs.appendFileSync(logPath, errMsg + '\n');
                    continue;
                }

                // ... (existing logic for company and categories)

                // 1. Get/Create Company (Cached)
                let company = companyCache.get(row.company_code);
                if (!company) {
                    company = await prisma.company.findUnique({ where: { code: row.company_code } });
                    if (!company) {
                        company = await prisma.company.findFirst({ where: { name: row.company_code } });
                        if (!company) {
                            company = await prisma.company.create({ 
                                data: { code: row.company_code, name: row.company_code } 
                            });
                        }
                    }
                    companyCache.set(row.company_code, company);
                }

                // 2. Get/Create Categories (Cached)
                const getOrCreateCat = async (code: string, name: string | undefined, level: number, parentId: number | null) => {
                    const cacheKey = `${level}-${parentId}-${code}`;
                    let cat = categoryCache.get(cacheKey);
                    if (cat) return cat;

                    cat = await prisma.assetCategory.findFirst({ where: { code, level, parentId } });
                    if (!cat) {
                        if (name) cat = await prisma.assetCategory.findFirst({ where: { name, level, parentId } });
                        if (!cat) {
                            const finalName = name || code;
                            const slug = finalName.toLowerCase().replace(/\s+/g, '_');
                            cat = await prisma.assetCategory.create({
                                data: { code, name: finalName, slug, level, parentId }
                            });
                        }
                    }
                    categoryCache.set(cacheKey, cat);
                    return cat;
                };

                const c1 = await getOrCreateCat(row.level1_code, row.level1_name || row.VN_Group_Lv1, 1, null);
                const c2 = await getOrCreateCat(row.level2_code, row.level2_name || row.VN_Group_Lv2, 2, c1.id);
                const c3 = await getOrCreateCat(row.level3_code, row.level3_name || row.VN_Group_Lv3, 3, c2.id);
                const c4 = await getOrCreateCat(row.level4_code, row.level4_name || row.VN_Group_Lv4, 4, c3.id);

                let assetCode = row.asset_code;
                let runningNo = row.running_no || 0;
                let runningNoText = row.running_no_text || '';

                if (!assetCode && validation.detected_action === 'CREATE') {
                    const generated = await AssetService.generateSingleAssetCode({
                        companyCode: company.code,
                        level1Code: c1.code,
                        level2Code: c2.code,
                        level3Code: c3.code,
                        level4Code: c4.code
                    });
                    assetCode = generated.assetCode;
                    runningNo = generated.runningNo;
                    runningNoText = generated.runningNoText;
                }

                const assetData: any = {
                    assetCode: assetCode,
                    assetName: row.asset_name,
                    assetNameShort: AssetService.generateShortName(row.asset_name),
                    assetNameShortSource: 'RULE',
                    assetNameShortUpdatedAt: new Date(),
                    serialNumber: row.serial_number,
                    companyCode: company.code,
                    companyName: company.name,
                    projectName: row.projectName || row['Dự án'] || row['Project'] || '',
                    level1Code: c1.code,
                    level1Name: c1.name,
                    level1Slug: c1.slug,
                    level2Code: c2.code,
                    level2Name: c2.name,
                    level2Slug: c2.slug,
                    level3Code: c3.code,
                    level3Name: c3.name,
                    level3Slug: c3.slug,
                    level4Code: c4.code,
                    level4Name: c4.name,
                    level4Slug: c4.slug,
                    runningNo,
                    runningNoText,
                    unit: row.unit || 'Cái',
                    status: row.status || 'IN_STOCK',
                    usagePurpose: row.usage_purpose,
                    currentUserName: row.current_user_name,
                    currentPosition: row.current_position,
                    departmentName: row.department_name,
                    locationName: row.location_name,
                    cityName: row.city_name,
                    purchasePriceExVat: row.purchase_price_ex_vat || 0,
                    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : null,
                    handoverDate: row.handover_date ? new Date(row.handover_date) : null,
                    depreciationEndDate: row.depreciation_end_date ? new Date(row.depreciation_end_date) : null,
                    note: row.note,
                    documentNote: row.document_note,
                    supplierName: row.supplier_name
                };

                await prisma.asset.upsert({
                    where: { assetCode: assetCode },
                    update: assetData,
                    create: assetData
                });
                successCount++;

                if (successCount % 100 === 0) console.log(`Imported ${successCount} rows...`);
            } catch (rowError: any) {
                failedCount++;
                const errMsg = `Row ${row.rowNumber || 'unknown'}: ${rowError.message}`;
                console.error(errMsg);
                rowErrors.push(errMsg);
                fs.appendFileSync(logPath, errMsg + '\n');
            }
        }

        console.log(`Import completed. Success: ${successCount}, Failed: ${failedCount}`);
        res.json({ 
            message: `Import hoàn tất. Thành công: ${successCount}, Thất bại: ${failedCount}`, 
            successCount, 
            failedCount,
            errors: rowErrors.slice(0, 50) // Show first 50 errors
        });
    } catch (err: any) {
        console.error('Import process failed:', err);
        res.status(500).json({ message: "Lỗi hệ thống khi xử lý Import: " + err.message });
    }
});

export default router;
