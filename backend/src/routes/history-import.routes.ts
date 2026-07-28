import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { AuditService } from '../services/audit.service';
import {
  normalizeAssetLocation,
  normalizeDepartmentName,
  normalizeProjectName
} from '../utils/location.util';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get('/template', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lịch sử tài sản');

    worksheet.columns = [
      { header: 'Thời gian', key: 'eventTime', width: 25 },
      { header: 'Mã tài sản', key: 'assetCode', width: 20 },
      { header: 'Tên tài sản (đối chiếu)', key: 'assetName', width: 25 },
      { header: 'Trạng thái cũ', key: 'oldStatus', width: 15 },
      { header: 'Trạng thái mới', key: 'newStatus', width: 15 },
      { header: 'Người dùng cũ', key: 'oldUserName', width: 20 },
      { header: 'Người dùng mới', key: 'newUserName', width: 20 },
      { header: 'Vị trí cũ', key: 'oldLocationName', width: 20 },
      { header: 'Vị trí mới', key: 'newLocationName', width: 20 },
      { header: 'Phòng ban cũ', key: 'oldDepartmentName', width: 20 },
      { header: 'Phòng ban mới', key: 'newDepartmentName', width: 20 },
      { header: 'Dự án cũ', key: 'oldProjectName', width: 20 },
      { header: 'Dự án mới', key: 'newProjectName', width: 20 },
      { header: 'Thành phố cũ', key: 'oldCityName', width: 20 },
      { header: 'Thành phố mới', key: 'newCityName', width: 20 },
      { header: 'Ghi chú cũ', key: 'oldNote', width: 25 },
      { header: 'Ghi chú mới', key: 'newNote', width: 25 }
    ];

    worksheet.addRow({
      eventTime: '20/11/2025 14:05',
      assetCode: '01.03.02.24.01.439',
      assetName: 'Ghế đỏ văn phòng',
      oldStatus: 'Chưa sử dụng',
      newStatus: 'Đang sử dụng',
      oldUserName: '',
      newUserName: 'Nguyen Van A',
      oldLocationName: 'Kho trung tâm',
      newLocationName: 'VP DANKO',
      oldDepartmentName: '',
      newDepartmentName: 'Hành chính Nhân sự',
      oldProjectName: '',
      newProjectName: 'Danko City',
      oldCityName: '',
      newCityName: 'Thái Nguyên',
      oldNote: 'Tồn kho lâu năm',
      newNote: 'Bàn giao làm việc'
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=asset_history_import_template.xlsx');

    await workbook.xlsx.write(res);
  } catch (err: any) {
    res.status(500).json({ message: 'Không thể tạo file template: ' + err.message });
  }
});

const STATUS_MAP: Record<string, string> = {
  'Nhập mới': 'IMPORTED',
  'Chưa sử dụng': 'IN_STOCK',
  'Đang sử dụng': 'ASSIGNED',
  'Chờ xác nhận': 'PENDING',
  'Mất': 'LOST',
  'Thanh lý': 'LIQUIDATED',
  'Báo hỏng': 'BROKEN',
  
  // English fallbacks
  'NEW': 'IMPORTED',
  'IMPORTED': 'IMPORTED',
  'IN_STOCK': 'IN_STOCK',
  'ASSIGNED': 'ASSIGNED',
  'PENDING': 'PENDING',
  'LOST': 'LOST',
  'LIQUIDATED': 'LIQUIDATED',
  'BROKEN': 'BROKEN'
};

const parseExcelDate = (value: any, text?: string): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  const str = text?.trim() || (typeof value === 'string' ? value.trim() : '');
  if (!str) return null;

  // Support dd/mm/yyyy hh:mm:ss or dd/mm/yyyy hh:mm
  const ddmmyyyyhhmm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(str);
  if (ddmmyyyyhhmm) {
    return new Date(
      parseInt(ddmmyyyyhhmm[3]),
      parseInt(ddmmyyyyhhmm[2]) - 1,
      parseInt(ddmmyyyyhhmm[1]),
      parseInt(ddmmyyyyhhmm[4]),
      parseInt(ddmmyyyyhhmm[5]),
      ddmmyyyyhhmm[6] ? parseInt(ddmmyyyyhhmm[6]) : 0
    );
  }

  // Support dd/mm/yyyy
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }

  // Support yyyy-mm-dd hh:mm
  const yyyymmddhhmm = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(str);
  if (yyyymmddhhmm) {
    return new Date(
      parseInt(yyyymmddhhmm[1]),
      parseInt(yyyymmddhhmm[2]) - 1,
      parseInt(yyyymmddhhmm[3]),
      parseInt(yyyymmddhhmm[4]),
      parseInt(yyyymmddhhmm[5]),
      yyyymmddhhmm[6] ? parseInt(yyyymmddhhmm[6]) : 0
    );
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const hasRefErrorVal = (val: any): boolean => {
  if (val && typeof val === 'object' && (val as any).error === '#REF!') return true;
  if (typeof val === 'string' && val.includes('#REF!')) return true;
  return false;
};

const getStringValue = (cell: ExcelJS.Cell): string | null => {
  let val = cell.value;
  if (val && typeof val === 'object' && (val as any).error) {
    return '#REF!';
  }
  if (val && typeof val === 'object' && (val as any).richText) {
    val = (val as any).richText.map((rt: any) => rt.text).join('');
  }
  if (val === null || val === undefined) return null;
  return String(val).trim();
};

const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell);
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        cell = '';
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  return result;
};

// POST /parse - Takes Excel/CSV, extracts headers and row samples OR parses completely if mapping provided
router.post('/parse', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp Excel hoặc CSV để tải lên.' });
    }

    const workbook = new ExcelJS.Workbook();
    let worksheet: ExcelJS.Worksheet | undefined;

    const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
    if (isCsv) {
      worksheet = workbook.addWorksheet('Sheet1');
      let csvText = req.file.buffer.toString('utf8');
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
      }
      const csvRows = parseCSV(csvText);
      csvRows.forEach((r) => {
        worksheet!.addRow(r);
      });
    } else {
      await workbook.xlsx.load(req.file.buffer as any);
      worksheet = workbook.getWorksheet(1) || undefined;
    }

    if (!worksheet) {
      return res.status(400).json({ message: 'Không tìm thấy sheet nào trong file dữ liệu.' });
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => {
      headers.push(cell.text.trim());
    });

    // Check if we just want column detection or full parse
    const mappingJson = req.body.mapping;
    if (!mappingJson) {
      // Just return headers and first 5 rows as raw data for frontend to map
      const sampleRows: any[] = [];
      const takeRows = Math.min(worksheet.rowCount, 6);
      for (let i = 2; i <= takeRows; i++) {
        const row = worksheet.getRow(i);
        const rowData: Record<string, string | null> = {};
        headers.forEach((header, idx) => {
          rowData[header] = getStringValue(row.getCell(idx + 1));
        });
        sampleRows.push(rowData);
      }
      return res.json({ headers, sampleRows });
    }

    // Full parse based on mapping
    const mapping = JSON.parse(mappingJson); // e.g. { eventTime: 'Thời gian', assetCode: 'Mã tài sản', ... }
    const rows: any[] = [];
    
    let totalRows = 0;
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let refErrorCount = 0;
    let dateErrorCount = 0;
    let matchedAssetCount = 0;
    let missingAssetCount = 0;

    const uniqueCheckSet = new Set<string>();

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      let hasData = false;

      const rawRow: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rawRow[h] = row.getCell(idx + 1).value;
      });

      // Extract system fields using mapping
      const eventTimeRawVal = mapping.eventTime ? row.getCell(headers.indexOf(mapping.eventTime) + 1).value : null;
      const eventTimeRawText = mapping.eventTime ? row.getCell(headers.indexOf(mapping.eventTime) + 1).text : '';
      const assetCode = mapping.assetCode ? getStringValue(row.getCell(headers.indexOf(mapping.assetCode) + 1)) : null;
      const assetName = mapping.assetName ? getStringValue(row.getCell(headers.indexOf(mapping.assetName) + 1)) : null;
      
      const oldStatusRaw = mapping.oldStatus ? getStringValue(row.getCell(headers.indexOf(mapping.oldStatus) + 1)) : null;
      const newStatusRaw = mapping.newStatus ? getStringValue(row.getCell(headers.indexOf(mapping.newStatus) + 1)) : null;
      
      const oldUserName = mapping.oldUserName ? getStringValue(row.getCell(headers.indexOf(mapping.oldUserName) + 1)) : null;
      const newUserName = mapping.newUserName ? getStringValue(row.getCell(headers.indexOf(mapping.newUserName) + 1)) : null;
      
      const oldLocationName = mapping.oldLocationName ? getStringValue(row.getCell(headers.indexOf(mapping.oldLocationName) + 1)) : null;
      const newLocationName = mapping.newLocationName ? getStringValue(row.getCell(headers.indexOf(mapping.newLocationName) + 1)) : null;
      
      const oldDepartmentName = mapping.oldDepartmentName ? getStringValue(row.getCell(headers.indexOf(mapping.oldDepartmentName) + 1)) : null;
      const newDepartmentName = mapping.newDepartmentName ? getStringValue(row.getCell(headers.indexOf(mapping.newDepartmentName) + 1)) : null;
      
      const oldProjectName = mapping.oldProjectName ? getStringValue(row.getCell(headers.indexOf(mapping.oldProjectName) + 1)) : null;
      const newProjectName = mapping.newProjectName ? getStringValue(row.getCell(headers.indexOf(mapping.newProjectName) + 1)) : null;
      
      const oldCityName = mapping.oldCityName ? getStringValue(row.getCell(headers.indexOf(mapping.oldCityName) + 1)) : null;
      const newCityName = mapping.newCityName ? getStringValue(row.getCell(headers.indexOf(mapping.newCityName) + 1)) : null;
      
      const oldNote = mapping.oldNote ? getStringValue(row.getCell(headers.indexOf(mapping.oldNote) + 1)) : null;
      const newNote = mapping.newNote ? getStringValue(row.getCell(headers.indexOf(mapping.newNote) + 1)) : null;

      // Check if row is empty
      if (assetCode || newStatusRaw || newLocationName || newUserName || assetName) {
        hasData = true;
      }

      if (!hasData) continue;

      totalRows++;

      const eventTime = parseExcelDate(eventTimeRawVal, eventTimeRawText);
      const oldStatus = oldStatusRaw ? (STATUS_MAP[oldStatusRaw] || oldStatusRaw) : null;
      const newStatus = newStatusRaw ? (STATUS_MAP[newStatusRaw] || newStatusRaw) : 'IN_STOCK';

      // Validation
      const errors: string[] = [];
      const warnings: string[] = [];
      let isRefError = false;

      // 1. Check #REF!
      const fieldsToCheck = [
        eventTimeRawVal, assetCode, assetName, oldStatusRaw, newStatusRaw,
        oldUserName, newUserName, oldLocationName, newLocationName,
        oldDepartmentName, newDepartmentName, oldProjectName, newProjectName,
        oldCityName, newCityName, oldNote, newNote
      ];

      if (fieldsToCheck.some(hasRefErrorVal)) {
        isRefError = true;
        refErrorCount++;
        warnings.push('Dòng chứa lỗi #REF! trong Excel.');
      }

      // 2. Check Date
      if (!eventTime) {
        errors.push('Thời gian không hợp lệ hoặc trống.');
        dateErrorCount++;
      }

      // 3. Check assetCode
      let assetId: number | null = null;
      let matchedName = assetName || '';
      if (!assetCode) {
        errors.push('Mã tài sản trống.');
      } else {
        const asset = await prisma.asset.findUnique({ where: { assetCode } });
        if (asset) {
          assetId = asset.id;
          matchedName = asset.assetName;
          matchedAssetCount++;
        } else {
          missingAssetCount++;
          warnings.push(`Mã tài sản ${assetCode} không tồn tại trong hệ thống.`);
        }
      }

      // 4. Duplicate checks within Excel file itself
      const duplicateKey = `${assetCode}_${eventTime?.getTime() || 0}_${oldStatus || ''}_${newStatus || ''}_${oldLocationName || ''}_${newLocationName || ''}`;
      if (uniqueCheckSet.has(duplicateKey)) {
        warnings.push('Dòng bị trùng lặp trong file Excel.');
        duplicateCount++;
      } else {
        uniqueCheckSet.add(duplicateKey);
      }

      // DB Duplicate check
      if (assetId && eventTime) {
        const dbExisting = await prisma.assetHistory.findFirst({
          where: {
            assetId,
            eventTime,
            oldStatus: oldStatus || undefined,
            newStatus: newStatus || undefined,
            oldLocationName: oldLocationName || undefined,
            newLocationName: newLocationName || undefined,
          }
        });
        if (dbExisting) {
          warnings.push('Bản ghi lịch sử này đã tồn tại trong hệ thống.');
          duplicateCount++;
        }
      }

      const status = errors.length > 0 ? 'ERROR' : (warnings.length > 0 ? 'WARNING' : 'VALID');
      if (status === 'VALID') validCount++;
      else if (status === 'WARNING') warningCount++;
      else errorCount++;

      rows.push({
        stt: i - 1,
        eventTime: eventTime ? eventTime.toISOString() : null,
        assetCode,
        assetName: matchedName,
        oldStatus,
        newStatus,
        oldUserName,
        newUserName,
        oldLocationName,
        newLocationName,
        oldDepartmentName,
        newDepartmentName,
        oldProjectName,
        newProjectName,
        oldCityName,
        newCityName,
        oldNote,
        newNote,
        isRefError,
        status,
        errors,
        warnings,
        rawRow
      });
    }

    res.json({
      summary: {
        totalRows,
        validCount,
        warningCount,
        errorCount,
        duplicateCount,
        refErrorCount,
        dateErrorCount,
        matchedAssetCount,
        missingAssetCount,
        willImportCount: validCount + (warningCount - refErrorCount - duplicateCount) // rows that are valid or warning but not ref/duplicate
      },
      rows
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi phân tích file Excel: ' + err.message });
  }
});

// POST /confirm - Finalize imports into DB
router.post('/confirm', authenticateToken, async (req: AuthRequest, res) => {
  const {
    rows,
    updateCurrentAssetState = false,
    skipDuplicates = true,
    skipRefErrors = true,
    allowCreateMissingAssets = false
  } = req.body;

  const userId = req.user?.id;
  const username = req.user?.username || 'system';

  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
  }

  let importedCount = 0;
  let skippedDuplicateCount = 0;
  let skippedRefCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let updatedAssetCount = 0;
  const affectedAssetIds = new Set<number>();

  try {
    // Keep a cache of assets to avoid redundant db queries
    const assetCache: Record<string, any> = {};

    for (const row of rows) {
      if (row.status === 'ERROR') {
        errorCount++;
        continue;
      }

      // Check skip criteria
      if (skipRefErrors && row.isRefError) {
        skippedRefCount++;
        continue;
      }

      let asset = assetCache[row.assetCode];
      if (!asset) {
        asset = await prisma.asset.findUnique({ where: { assetCode: row.assetCode } });
        if (asset) assetCache[row.assetCode] = asset;
      }

      // If missing asset code in db
      if (!asset) {
        if (allowCreateMissingAssets) {
          // Create skeleton missing asset
          asset = await prisma.asset.create({
            data: {
              assetCode: row.assetCode,
              assetName: row.assetName || 'Tài sản thiếu từ lịch sử',
              companyCode: '00',
              companyName: 'DANKO GROUP',
              level1Code: '00',
              level1Name: 'Chưa phân loại',
              level2Code: '00',
              level2Name: 'Chưa phân loại',
              level3Code: '00',
              level3Name: 'Chưa phân loại',
              level4Code: '00',
              level4Name: 'Chưa phân loại',
              runningNo: 0,
              runningNoText: '0000',
              status: row.newStatus || 'IN_STOCK',
              currentUserName: row.newUserName,
              departmentName: normalizeDepartmentName(
                row.newDepartmentName,
                row.newCityName,
                row.newProjectName
              ),
              locationName: normalizeAssetLocation(
                row.newLocationName,
                row.newCityName,
                row.newProjectName,
                row.newDepartmentName
              ),
              projectName: normalizeProjectName(row.newProjectName),
              cityName: row.newCityName
            }
          });
          assetCache[row.assetCode] = asset;
        } else {
          warningCount++;
          continue;
        }
      }

      // Check duplicates
      if (skipDuplicates) {
        const dbExisting = await prisma.assetHistory.findFirst({
          where: {
            assetId: asset.id,
            eventTime: new Date(row.eventTime),
            oldStatus: row.oldStatus || undefined,
            newStatus: row.newStatus || undefined,
            oldLocationName: row.oldLocationName || undefined,
            newLocationName: row.newLocationName || undefined,
          }
        });
        if (dbExisting) {
          skippedDuplicateCount++;
          continue;
        }
      }

      // Insert record
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          assetCode: row.assetCode,
          eventTime: new Date(row.eventTime),
          source: 'IMPORT_EXCEL_HISTORY',
          actionType: 'IMPORT_HISTORY',
          oldStatus: row.oldStatus,
          newStatus: row.newStatus,
          oldUserName: row.oldUserName,
          newUserName: row.newUserName,
          oldLocationName: row.oldLocationName,
          newLocationName: row.newLocationName,
          oldDepartmentName: row.oldDepartmentName,
          newDepartmentName: row.newDepartmentName,
          oldProjectName: row.oldProjectName,
          newProjectName: row.newProjectName,
          oldCityName: row.oldCityName,
          newCityName: row.newCityName,
          oldNote: row.oldNote,
          newNote: row.newNote,
          assetNameSnapshot: asset.assetName,
          rawImportJson: JSON.stringify(row.rawRow || {}),
          importedById: userId,
          importedAt: new Date()
        }
      });

      affectedAssetIds.add(asset.id);
      importedCount++;
    }

    // Option to update current active state to the latest Excel history row
    if (updateCurrentAssetState && importedCount > 0) {
      // Find latest date row per assetCode in the confirmed list
      const latestRowsMap: Record<string, any> = {};

      rows.forEach(row => {
        if (row.status === 'ERROR') return;
        if (skipRefErrors && row.isRefError) return;
        
        const existing = latestRowsMap[row.assetCode];
        if (!existing || new Date(row.eventTime) > new Date(existing.eventTime)) {
          latestRowsMap[row.assetCode] = row;
        }
      });

      for (const [code, row] of Object.entries(latestRowsMap)) {
        const asset = assetCache[code];
        if (!asset) continue;

        // Compile updates defending against #REF! or empty
        const updates: any = {};
        if (row.newStatus && row.newStatus !== '#REF!') updates.status = row.newStatus;
        if (row.newUserName && row.newUserName !== '#REF!') updates.currentUserName = row.newUserName;
        if (row.newDepartmentName && row.newDepartmentName !== '#REF!') {
          updates.departmentName = normalizeDepartmentName(
            row.newDepartmentName,
            row.newCityName || asset.cityName,
            row.newProjectName || asset.projectName
          );
        }
        if (row.newProjectName && row.newProjectName !== '#REF!') {
          updates.projectName = normalizeProjectName(row.newProjectName);
        }
        if (row.newCityName && row.newCityName !== '#REF!') updates.cityName = row.newCityName;
        if (row.newLocationName && row.newLocationName !== '#REF!') {
          updates.locationName = normalizeAssetLocation(
            row.newLocationName,
            updates.cityName || asset.cityName,
            updates.projectName || asset.projectName,
            updates.departmentName || asset.departmentName
          );
        }

        if (Object.keys(updates).length > 0) {
          await prisma.asset.update({
            where: { id: asset.id },
            data: updates
          });
          
          // Log Audit for state update
          await AuditService.log({
            entityType: 'ASSET',
            entityId: asset.id,
            action: 'UPDATE',
            performedBy: username,
            details: JSON.stringify({
              message: 'Cập nhật trạng thái hiện tại từ việc Import lịch sử tài sản',
              updates
            })
          });

          updatedAssetCount++;
        }
      }
    }

    // Log general history import audit
    await AuditService.log({
      entityType: 'SYSTEM',
      entityId: 0,
      action: 'IMPORT',
      performedBy: username,
      details: JSON.stringify({
        message: `Import thành công lịch sử hàng loạt.`,
        importedCount,
        skippedDuplicateCount,
        skippedRefCount,
        warningCount,
        errorCount,
        updatedAssetCount,
        affectedAssets: affectedAssetIds.size
      })
    });

    res.json({
      importedCount,
      skippedDuplicateCount,
      skippedRefCount,
      warningCount,
      errorCount,
      updatedAssetCount,
      affectedAssets: affectedAssetIds.size
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi ghi dữ liệu lịch sử vào DB: ' + err.message });
  }
});

export default router;
