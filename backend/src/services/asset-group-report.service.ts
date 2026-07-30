import ExcelJS from 'exceljs';
import { deflateSync } from 'zlib';
import prisma from '../utils/prisma';
import { formatDate } from '../utils/excel.util';

type ReportOptions = {
  assetIds: number[];
  assetWhere: any;
  reportName?: string;
  requestedBy: string;
  canViewPrice: boolean;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: 'Đang sử dụng', color: '3B82F6' },
  IN_STOCK: { label: 'Trong kho', color: '10B981' },
  DAMAGED: { label: 'Báo hỏng', color: 'F43F5E' },
  BROKEN: { label: 'Bị hỏng', color: 'E11D48' },
  UNDER_REPAIR: { label: 'Đang sửa chữa', color: 'F59E0B' },
  LOST: { label: 'Mất / thất thoát', color: '7C3AED' },
  PENDING_DISPOSAL: { label: 'Chờ thanh lý', color: 'F97316' },
  LIQUIDATED: { label: 'Đã thanh lý', color: '64748B' },
  RETIRED: { label: 'Ngừng sử dụng', color: '94A3B8' }
};

const getStatusMeta = (status: string) => (
  STATUS_META[status] || { label: status || 'Không xác định', color: '94A3B8' }
);

const countBy = (rows: any[], getKey: (row: any) => string) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row).trim() || 'Chưa xác định';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let k = 0; k < 8; k++) {
      value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[n] = value >>> 0;
  }
  return table;
})();

const crc32 = (buffer: Buffer) => {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const pngChunk = (type: string, data: Buffer) => {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
};

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(0, 2), 16),
  g: parseInt(hex.slice(2, 4), 16),
  b: parseInt(hex.slice(4, 6), 16)
});

export const createStatusChartPng = (series: Array<{ count: number; color: string }>) => {
  const width = 720;
  const height = 160;
  const pixels = Buffer.alloc(width * height * 4, 255);
  const setPixel = (x: number, y: number, color: { r: number; g: number; b: number }, alpha = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels[offset] = color.r;
    pixels[offset + 1] = color.g;
    pixels[offset + 2] = color.b;
    pixels[offset + 3] = alpha;
  };
  const fillRect = (x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number }) => {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) setPixel(px, py, color);
    }
  };

  fillRect(18, 38, width - 36, 84, hexToRgb('E2E8F0'));
  const total = series.reduce((sum, item) => sum + item.count, 0);
  let cursor = 18;
  series.forEach((item, index) => {
    const remaining = width - 18 - cursor;
    const segmentWidth = index === series.length - 1
      ? remaining
      : Math.max(2, Math.round((width - 36) * item.count / Math.max(total, 1)));
    fillRect(cursor, 38, Math.min(segmentWidth, remaining), 84, hexToRgb(item.color));
    cursor += segmentWidth;
  });

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
};

const styleTitle = (sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) => {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 38;

  sheet.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 24;
};

const styleHeaderRow = (row: ExcelJS.Row) => {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
};

const addMetricCard = (
  sheet: ExcelJS.Worksheet,
  range: string,
  label: string,
  value: string | number,
  color: string
) => {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = { richText: [
    { text: `${label}\n`, font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF64748B' } } },
    { text: String(value), font: { name: 'Arial', size: 18, bold: true, color: { argb: `FF${color}` } } }
  ] };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${color}` } },
    bottom: { style: 'thin', color: { argb: `FF${color}` } },
    left: { style: 'thin', color: { argb: `FF${color}` } },
    right: { style: 'thin', color: { argb: `FF${color}` } }
  };
};

export class AssetGroupReportService {
  static async build(options: ReportOptions) {
    const assets = await prisma.asset.findMany({
      where: options.assetWhere,
      orderBy: { assetCode: 'asc' }
    });
    const allowedAssetIds = assets.map((asset) => asset.id);
    const handoverItems = allowedAssetIds.length === 0
      ? []
      : await prisma.handoverItem.findMany({
          where: { assetId: { in: allowedAssetIds } },
          include: { handoverDocument: true },
          orderBy: { id: 'desc' }
        });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = options.requestedBy;
    workbook.created = new Date();
    workbook.modified = new Date();

    const reportName = options.reportName?.trim() || assets[0]?.level4Name || 'Nhóm tài sản';
    const subtitle = `Nhóm: ${reportName} | Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Người xuất: ${options.requestedBy}`;
    const statusCounts = countBy(assets, (asset) => asset.status || 'UNKNOWN');
    const assigned = assets.filter((asset) => asset.status === 'ASSIGNED').length;
    const inStock = assets.filter((asset) => asset.status === 'IN_STOCK').length;
    const needsAction = assets.filter((asset) => ['DAMAGED', 'BROKEN', 'UNDER_REPAIR', 'LOST', 'PENDING_DISPOSAL'].includes(asset.status)).length;
    const totalValue = options.canViewPrice
      ? assets.reduce((sum, asset) => sum + Number(asset.purchasePriceExVat || 0), 0)
      : null;

    const dashboard = workbook.addWorksheet('Tổng hợp & Dashboard', {
      views: [{ state: 'frozen', ySplit: 2 }]
    });
    dashboard.columns = Array.from({ length: 12 }, () => ({ width: 14 }));
    styleTitle(dashboard, 'BÁO CÁO TỔNG HỢP NHÓM TÀI SẢN', subtitle, 12);
    dashboard.getRow(4).height = 58;
    dashboard.getRow(5).height = 58;
    addMetricCard(dashboard, 'A4:C5', 'TỔNG TÀI SẢN', assets.length.toLocaleString('vi-VN'), '0F172A');
    addMetricCard(dashboard, 'D4:F5', 'ĐANG SỬ DỤNG', assigned.toLocaleString('vi-VN'), '2563EB');
    addMetricCard(dashboard, 'G4:I5', 'TRONG KHO', inStock.toLocaleString('vi-VN'), '059669');
    addMetricCard(dashboard, 'J4:L5', 'CẦN XỬ LÝ', needsAction.toLocaleString('vi-VN'), 'E11D48');

    dashboard.mergeCells('A7:H7');
    dashboard.getCell('A7').value = 'BIỂU ĐỒ PHÂN BỔ TRẠNG THÁI';
    dashboard.getCell('A7').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    const maxStatusCount = Math.max(...statusCounts.map(([, count]) => count), 1);
    statusCounts.slice(0, 8).forEach(([status, count], index) => {
      const row = 8 + index;
      const meta = getStatusMeta(status);
      dashboard.mergeCells(row, 1, row, 2);
      dashboard.getCell(row, 1).value = meta.label;
      dashboard.getCell(row, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
      dashboard.getCell(row, 3).value = count;
      dashboard.getCell(row, 3).font = { name: 'Arial', size: 10, bold: true };
      dashboard.getCell(row, 3).alignment = { horizontal: 'center' };
      const filledCells = Math.max(1, Math.round(count / maxStatusCount * 5));
      for (let column = 4; column <= 8; column++) {
        dashboard.getCell(row, column).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${column - 3 <= filledCells ? meta.color : 'E2E8F0'}` }
        };
      }
    });
    const chartSeries = statusCounts.map(([status, count]) => ({
      count,
      color: getStatusMeta(status).color
    }));
    const chartImageId = workbook.addImage({
      base64: `data:image/png;base64,${createStatusChartPng(
        chartSeries.length > 0 ? chartSeries : [{ count: 1, color: 'E2E8F0' }]
      ).toString('base64')}`,
      extension: 'png'
    });
    dashboard.addImage(chartImageId, {
      tl: { col: 0, row: 7 },
      ext: { width: 710, height: 155 }
    });

    dashboard.mergeCells('I7:L7');
    dashboard.getCell('I7').value = 'CHÚ THÍCH';
    dashboard.getCell('I7').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    statusCounts.slice(0, 8).forEach(([status, count], index) => {
      const row = 8 + index;
      const meta = getStatusMeta(status);
      dashboard.getCell(row, 9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${meta.color}` } };
      dashboard.getCell(row, 10).value = meta.label;
      dashboard.getCell(row, 11).value = count;
      dashboard.getCell(row, 12).value = assets.length ? count / assets.length : 0;
      dashboard.getCell(row, 12).numFmt = '0.0%';
    });

    if (totalValue !== null) {
      dashboard.mergeCells('A17:L17');
      const valueCell = dashboard.getCell('A17');
      valueCell.value = `Tổng nguyên giá nhóm: ${totalValue.toLocaleString('vi-VN')} VNĐ`;
      valueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0369A1' } };
      valueCell.alignment = { horizontal: 'right' };
    }

    const departmentCounts = countBy(assets, (asset) => asset.departmentName || 'Chưa xác định').slice(0, 10);
    const locationCounts = countBy(assets, (asset) => asset.locationName || 'Chưa xác định').slice(0, 10);
    dashboard.mergeCells('A19:F19');
    dashboard.getCell('A19').value = 'TOP PHÒNG BAN QUẢN LÝ / SỬ DỤNG';
    dashboard.mergeCells('G19:L19');
    dashboard.getCell('G19').value = 'TOP VỊ TRÍ TÀI SẢN';
    ['A19', 'G19'].forEach((address) => {
      const cell = dashboard.getCell(address);
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center' };
    });
    departmentCounts.forEach(([name, count], index) => {
      const row = 20 + index;
      dashboard.mergeCells(row, 1, row, 5);
      dashboard.getCell(row, 1).value = name;
      dashboard.getCell(row, 6).value = count;
    });
    locationCounts.forEach(([name, count], index) => {
      const row = 20 + index;
      dashboard.mergeCells(row, 7, row, 11);
      dashboard.getCell(row, 7).value = name;
      dashboard.getCell(row, 12).value = count;
    });

    const detail = workbook.addWorksheet('Chi tiết tài sản', {
      views: [{ state: 'frozen', ySplit: 4 }]
    });
    const detailHeaders = [
      'STT', 'Mã tài sản', 'Nhóm tài sản LV4', 'Tên tài sản', 'Số Serial', 'Đơn vị tính',
      'Trạng thái', 'Người sử dụng', 'Chức vụ', 'Phòng ban', 'Thành phố', 'Dự án',
      'Vị trí hiện tại', 'Ngày bàn giao', 'Ngày kiểm kê cuối',
      ...(options.canViewPrice ? ['Nguyên giá (VNĐ)'] : []),
      'Nhà cung cấp', 'Ghi chú'
    ];
    styleTitle(detail, 'CHI TIẾT TÀI SẢN TRONG NHÓM', subtitle, detailHeaders.length);
    detail.addRow([]);
    const detailHeaderRow = detail.addRow(detailHeaders);
    styleHeaderRow(detailHeaderRow);
    detail.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: detailHeaders.length } };
    assets.forEach((asset, index) => {
      const row = detail.addRow([
        index + 1,
        asset.assetCode,
        asset.level4Name || '',
        asset.assetName,
        asset.serialNumber || '',
        asset.unit || 'Cái',
        getStatusMeta(asset.status).label,
        asset.currentUserName || '',
        asset.currentPosition || '',
        asset.departmentName || '',
        asset.cityName || '',
        asset.projectName || '',
        asset.locationName || '',
        formatDate(asset.handoverDate),
        formatDate(asset.lastInventoryDate),
        ...(options.canViewPrice ? [asset.purchasePriceExVat || 0] : []),
        asset.supplierName || '',
        asset.documentNote || ''
      ]);
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });
    detail.columns.forEach((column, index) => {
      column.width = [7, 22, 26, 42, 20, 14, 18, 24, 20, 28, 18, 25, 42, 16, 18, 20, 24, 30][index] || 18;
    });
    if (options.canViewPrice) {
      detail.getColumn(16).numFmt = '#,##0';
    }

    const history = workbook.addWorksheet('Lịch sử bàn giao', {
      views: [{ state: 'frozen', ySplit: 4 }]
    });
    const historyHeaders = [
      'STT', 'Mã hồ sơ', 'Loại nghiệp vụ', 'Trạng thái hồ sơ', 'Ngày hồ sơ',
      'Mã tài sản', 'Tên tài sản', 'Người giao', 'Phòng ban giao',
      'Bên nhận / Khu vực nhận', 'Phòng ban nhận', 'Vị trí giao đến',
      'Trạng thái trước', 'Trạng thái sau', 'Lý do', 'Ghi chú'
    ];
    styleTitle(history, 'LỊCH SỬ BÀN GIAO / ĐIỀU CHUYỂN / THU HỒI', subtitle, historyHeaders.length);
    history.addRow([]);
    const historyHeaderRow = history.addRow(historyHeaders);
    styleHeaderRow(historyHeaderRow);
    history.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: historyHeaders.length } };
    handoverItems.forEach((item, index) => {
      const doc = item.handoverDocument;
      const recipient = doc.recipientType === 'AREA'
        ? (doc.recipientArea || doc.newLocation || '')
        : doc.recipientName;
      const row = history.addRow([
        index + 1,
        doc.documentNo,
        doc.type === 'HANDOVER' ? 'Bàn giao' : doc.type === 'TRANSFER' ? 'Điều chuyển' : 'Thu hồi',
        doc.status === 'COMPLETED' ? 'Hoàn tất' : doc.status === 'REVERSED' ? 'Đã hoàn tác' : doc.status === 'CANCELLED' ? 'Đã hủy' : doc.status === 'DRAFT' ? 'Nháp' : 'Chờ xác nhận',
        formatDate(doc.documentDate),
        item.assetCode,
        item.assetName,
        doc.senderName || '',
        doc.senderDepartment || '',
        recipient,
        doc.recipientDepartment || '',
        doc.newLocation || '',
        getStatusMeta(item.oldStatus || '').label,
        getStatusMeta(item.newStatus || '').label,
        doc.reason || '',
        doc.note || ''
      ]);
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });
    history.columns.forEach((column, index) => {
      column.width = [7, 24, 18, 18, 16, 22, 38, 24, 28, 30, 28, 42, 18, 18, 32, 32][index] || 18;
    });

    return { workbook, assetCount: assets.length };
  }
}
