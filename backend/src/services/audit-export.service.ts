import ExcelJS from 'exceljs';
import prisma from '../utils/prisma';
import { AuditParser, FIELD_MAP } from '../utils/audit-parser.util';

function formatDate(dateStr: string | Date): string {
  const dt = new Date(dateStr);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`;
}
function formatDateShort(dateStr: string | Date): string {
  const dt = new Date(dateStr);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

export interface AuditExportOptions {
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
  keyword?: string;
  performedBy?: string;
}

export class AuditExportService {
  static async export(options: AuditExportOptions, requestUser: string): Promise<ExcelJS.Workbook> {
    const whereClause: any = {};

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) {
        const start = new Date(options.startDate);
        start.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = start;
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    if (options.action) whereClause.action = options.action;
    if (options.entityType) whereClause.entityType = options.entityType;
    if (options.performedBy) whereClause.performedBy = { contains: options.performedBy };

    if (options.keyword) {
      whereClause.OR = [
        { details: { contains: options.keyword } },
        { action: { contains: options.keyword } },
      ];
    }

    // Limit to 50000 records to prevent out of memory
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    const workbook = new ExcelJS.Workbook();
    
    // --- SHEET 1: TỔNG QUAN ---
    const overviewSheet = workbook.addWorksheet('Tổng quan');
    this.buildOverviewSheet(overviewSheet, logs, options, requestUser);

    // --- SHEET 2: NHẬT KÝ CHI TIẾT ---
    const detailSheet = workbook.addWorksheet('Nhật ký chi tiết');
    this.buildDetailSheet(detailSheet, logs);

    // --- SHEET 3: THAY ĐỔI TÀI SẢN ---
    const assetChangeSheet = workbook.addWorksheet('Thay đổi tài sản');
    this.buildAssetChangeSheet(assetChangeSheet, logs);

    return workbook;
  }

  private static buildOverviewSheet(sheet: ExcelJS.Worksheet, logs: any[], options: AuditExportOptions, requestUser: string) {
    sheet.columns = [
      { key: 'col1', width: 40 },
      { key: 'col2', width: 30 },
      { key: 'col3', width: 30 },
    ];

    // Stats calculations
    const totalLogs = logs.length;
    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    let createCompleteCount = 0;
    
    let assetCount = 0;
    let handoverCount = 0;

    const userMap: Record<string, number> = {};
    const entityMap: Record<string, number> = {};
    const actionMap: Record<string, number> = {};

    logs.forEach(log => {
      if (log.action === 'CREATE') createCount++;
      if (log.action === 'UPDATE') updateCount++;
      if (log.action === 'DELETE') deleteCount++;
      if (log.action === 'CREATE_AND_COMPLETE') createCompleteCount++;
      
      if (log.entityType === 'ASSET') assetCount++;
      if (log.entityType === 'HANDOVER' || log.entityType === 'ASSET_TRANSFERS') handoverCount++;

      userMap[log.performedBy] = (userMap[log.performedBy] || 0) + 1;
      entityMap[log.entityType] = (entityMap[log.entityType] || 0) + 1;
      actionMap[log.action] = (actionMap[log.action] || 0) + 1;
    });

    const uniqueUsersCount = Object.keys(userMap).length;

    // Header
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E98' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.addRow([]);

    // A. Thông tin báo cáo
    sheet.addRow(['THÔNG TIN BÁO CÁO']).font = { bold: true, size: 12 };
    sheet.addRow(['Thời gian xuất:', formatDate(new Date())]);
    sheet.addRow(['Người xuất:', requestUser]);
    sheet.addRow(['Lọc thời gian:', `${options.startDate ? formatDateShort(options.startDate) : 'Bắt đầu'} - ${options.endDate ? formatDateShort(options.endDate) : 'Hiện tại'}`]);
    sheet.addRow([]);

    // B. Thống kê nhanh
    sheet.addRow(['THỐNG KÊ NHANH']).font = { bold: true, size: 12 };
    sheet.addRow(['Tổng số log:', totalLogs]);
    sheet.addRow(['Tổng số CREATE (Tạo mới):', createCount]);
    sheet.addRow(['Tổng số UPDATE (Cập nhật):', updateCount]);
    sheet.addRow(['Tổng số DELETE (Xóa):', deleteCount]);
    sheet.addRow(['Tổng số CREATE_AND_COMPLETE:', createCompleteCount]);
    sheet.addRow(['Tổng số log Tài sản (ASSET):', assetCount]);
    sheet.addRow(['Tổng số log Hồ sơ (HANDOVER):', handoverCount]);
    sheet.addRow(['Số lượng người dùng thao tác:', uniqueUsersCount]);
    sheet.addRow([]);

    // E. Top người dùng
    sheet.addRow(['TOP NGƯỜI DÙNG THAO TÁC', 'Số lượng']).font = { bold: true };
    const topUsers = Object.entries(userMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    topUsers.forEach(([user, count]) => {
      sheet.addRow([user, count]);
    });
  }

  private static buildDetailSheet(sheet: ExcelJS.Worksheet, logs: any[]) {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Thời gian', key: 'createdAt', width: 20 },
      { header: 'Người thực hiện', key: 'performedBy', width: 20 },
      { header: 'Hành động', key: 'action', width: 25 },
      { header: 'Đối tượng', key: 'entityType', width: 25 },
      { header: 'Mã đối tượng', key: 'entityId', width: 15 },
      { header: 'Mô tả dễ hiểu', key: 'description', width: 50 },
      { header: 'Chi tiết rút gọn (JSON)', key: 'details', width: 50 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E98' } };
    
    // Freeze header and enable auto filter
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = 'A1:I1';

    logs.forEach((log, index) => {
      const dt = new Date(log.createdAt);
      const actionVn = AuditParser.getActionName(log.action);
      const entityVn = AuditParser.getEntityName(log.entityType);
      const desc = AuditParser.buildDescription(log);

      const row = sheet.addRow({
        stt: index + 1,
        id: log.id,
        createdAt: formatDate(log.createdAt),
        performedBy: log.performedBy,
        action: `${actionVn} (${log.action})`,
        entityType: `${entityVn} (${log.entityType})`,
        entityId: log.entityId,
        description: desc,
        details: log.details || '',
      });

      // Styling alignments
      row.getCell('stt').alignment = { horizontal: 'center' };
      row.getCell('id').alignment = { horizontal: 'center' };
      row.getCell('entityId').alignment = { horizontal: 'center' };
      row.getCell('description').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('details').alignment = { wrapText: true, vertical: 'top' };

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    });
  }

  private static buildAssetChangeSheet(sheet: ExcelJS.Worksheet, logs: any[]) {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Thời gian', key: 'createdAt', width: 20 },
      { header: 'Người thực hiện', key: 'performedBy', width: 20 },
      { header: 'ID Tài sản', key: 'entityId', width: 15 },
      { header: 'Mã hồ sơ liên quan', key: 'docNo', width: 25 },
      { header: 'Trường thay đổi', key: 'field', width: 25 },
      { header: 'Giá trị cũ', key: 'oldVal', width: 30 },
      { header: 'Giá trị mới', key: 'newVal', width: 30 },
      { header: 'Mô tả', key: 'desc', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004E98' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = 'A1:I1';

    // Only process ASSET UPDATE logs
    const assetUpdateLogs = logs.filter(l => l.entityType === 'ASSET' && l.action === 'UPDATE');

    let stt = 1;
    assetUpdateLogs.forEach((log) => {
      const parsed = AuditParser.parseDetails(log.details);
      if (!parsed || !parsed.changes) return;

      const dt = formatDate(log.createdAt);
      const docNo = parsed.reason || '';

      for (const [key, val] of Object.entries(parsed.changes)) {
        const v = val as { old: any; new: any };
        const fieldVn = AuditParser.getFieldName(key);
        
        let oldValStr = v.old !== null && v.old !== undefined ? String(v.old) : 'Trống';
        let newValStr = v.new !== null && v.new !== undefined ? String(v.new) : 'Trống';

        if (key === 'status') {
          oldValStr = AuditParser.getStatusName(oldValStr);
          newValStr = AuditParser.getStatusName(newValStr);
        }

        const row = sheet.addRow({
          stt: stt++,
          createdAt: dt,
          performedBy: log.performedBy,
          entityId: log.entityId,
          docNo: docNo,
          field: fieldVn,
          oldVal: oldValStr,
          newVal: newValStr,
          desc: `Cập nhật ${fieldVn} từ [${oldValStr}] sang [${newValStr}]`,
        });

        row.getCell('stt').alignment = { horizontal: 'center' };
        row.getCell('entityId').alignment = { horizontal: 'center' };
        row.getCell('oldVal').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('newVal').alignment = { wrapText: true, vertical: 'top' };
        row.getCell('desc').alignment = { wrapText: true, vertical: 'top' };
      }
    });
  }
}
