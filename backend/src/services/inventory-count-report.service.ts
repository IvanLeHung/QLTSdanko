import ExcelJS from 'exceljs';
import prisma from '../utils/prisma';

type BuildOptions = {
  inventoryCheckId: number;
  requestedBy: string;
  assetWhere?: any;
};

const RESULT_LABELS: Record<string, string> = {
  MATCHED: 'Khớp sổ sách',
  MISSING: 'Thiếu',
  DAMAGED: 'Hỏng / Cần sửa',
  WRONG_LOCATION: 'Sai vị trí'
};

const QUALITY_LABELS: Record<string, string> = {
  GOOD: 'Tốt',
  DAMAGED: 'Hỏng',
  NEEDS_REPAIR: 'Cần sửa chữa',
  UNKNOWN: 'Chưa xác định',
  MISSING: 'Không tìm thấy'
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Đang sử dụng',
  IN_STOCK: 'Trong kho',
  DAMAGED: 'Báo hỏng',
  UNDER_REPAIR: 'Đang sửa chữa',
  LOST: 'Mất / thất thoát',
  RETIRED: 'Đã thu hồi',
  DISPOSED: 'Đã thanh lý'
};

const formatPath = (...segments: Array<string | null | undefined>) => {
  let path = '';
  segments.map((value) => String(value || '').trim()).filter(Boolean).forEach((value) => {
    if (!path) path = value;
    else if (value.startsWith(`${path} - `)) path = value;
    else if (!path.startsWith(`${value} - `) && path !== value) path += ` - ${value}`;
  });
  return path || '--';
};

const styleTitle = (sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) => {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 17, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 36;
  sheet.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 28;
};

const styleHeader = (row: ExcelJS.Row) => {
  row.height = 30;
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

const styleDataRows = (sheet: ExcelJS.Worksheet, startRow: number) => {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } }
      };
    });
  }
};

const addMetric = (sheet: ExcelJS.Worksheet, range: string, label: string, value: number, color: string) => {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = { richText: [
    { text: `${label}\n`, font: { name: 'Arial', size: 9, bold: true, color: { argb: 'FF64748B' } } },
    { text: value.toLocaleString('vi-VN'), font: { name: 'Arial', size: 18, bold: true, color: { argb: `FF${color}` } } }
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

const countByHierarchy = (items: any[]) => {
  const grouped = new Map<string, any>();
  items.forEach((item) => {
    const city = item.expectedCity || item.asset.cityName || '--';
    const project = item.expectedProject || item.asset.projectName || '--';
    const location = item.expectedLocation || item.asset.locationName || '--';
    const department = item.expectedDepartment || item.asset.departmentName || '--';
    const key = [city, project, location, department].join('\u0000');
    const current = grouped.get(key) || { city, project, location, department, book: 0, checked: 0, actual: 0, missing: 0, damaged: 0, wrongLocation: 0 };
    current.book += Number(item.bookQuantity || 1);
    if (item.actualQuantity === 0 || item.actualQuantity === 1) current.checked += 1;
    current.actual += Number(item.actualQuantity || 0);
    if (item.result === 'MISSING') current.missing += 1;
    if (item.result === 'DAMAGED') current.damaged += 1;
    if (item.result === 'WRONG_LOCATION') current.wrongLocation += 1;
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).sort((a, b) => [a.city, a.project, a.location, a.department]
    .join('|').localeCompare([b.city, b.project, b.location, b.department].join('|'), 'vi'));
};

export class InventoryCountReportService {
  static async build(options: BuildOptions) {
    const inventory = await prisma.inventoryCheck.findUnique({ where: { id: options.inventoryCheckId } });
    if (!inventory) throw new Error('Không tìm thấy đợt kiểm kê.');

    const items = await prisma.inventoryItem.findMany({
      where: {
        inventoryCheckId: options.inventoryCheckId,
        ...(options.assetWhere && Object.keys(options.assetWhere).length > 0 ? { asset: options.assetWhere } : {})
      },
      orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
      distinct: ['assetId'],
      include: { asset: true }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = options.requestedBy;
    workbook.created = new Date();
    workbook.modified = new Date();
    const subtitle = `${inventory.inventoryCode} - ${inventory.inventoryName} | Xuất lúc: ${new Date().toLocaleString('vi-VN')} | Người xuất: ${options.requestedBy}`;
    const checked = items.filter((item) => item.actualQuantity === 0 || item.actualQuantity === 1).length;
    const actual = items.reduce((sum, item) => sum + Number(item.actualQuantity || 0), 0);
    const missing = items.filter((item) => item.result === 'MISSING').length;
    const damaged = items.filter((item) => item.result === 'DAMAGED').length;
    const wrongLocation = items.filter((item) => item.result === 'WRONG_LOCATION').length;
    const unchecked = items.length - checked;

    const overview = workbook.addWorksheet('Tổng hợp số liệu', { views: [{ state: 'frozen', ySplit: 2 }] });
    overview.columns = Array.from({ length: 12 }, () => ({ width: 15 }));
    styleTitle(overview, 'BÁO CÁO TỔNG HỢP KIỂM KÊ TÀI SẢN', subtitle, 12);
    overview.getRow(4).height = 54;
    overview.getRow(5).height = 54;
    addMetric(overview, 'A4:B5', 'SỔ SÁCH', items.length, '0F172A');
    addMetric(overview, 'C4:D5', 'ĐÃ KIỂM', checked, '2563EB');
    addMetric(overview, 'E4:F5', 'THỰC KIỂM', actual, '059669');
    addMetric(overview, 'G4:H5', 'THIẾU', missing, 'E11D48');
    addMetric(overview, 'I4:J5', 'HỎNG / CẦN SỬA', damaged, 'D97706');
    addMetric(overview, 'K4:L5', 'SAI VỊ TRÍ', wrongLocation, '7C3AED');
    overview.mergeCells('A7:L7');
    overview.getCell('A7').value = `Chưa kiểm: ${unchecked.toLocaleString('vi-VN')} tài sản`;
    overview.getCell('A7').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFB45309' } };
    overview.getCell('A7').alignment = { horizontal: 'right' };

    const hierarchyHeaders = ['STT', 'Thành phố', 'Dự án', 'Vị trí sổ sách', 'Phòng/Ban', 'SL sổ sách', 'Đã kiểm', 'SL thực kiểm', 'Thiếu', 'Hỏng/Cần sửa', 'Sai vị trí', 'Chưa kiểm'];
    const hierarchyHeader = overview.getRow(9);
    hierarchyHeader.values = hierarchyHeaders;
    styleHeader(hierarchyHeader);
    const hierarchyRows = countByHierarchy(items);
    hierarchyRows.forEach((row, index) => overview.addRow([
      index + 1, row.city, row.project, row.location, row.department, row.book, row.checked,
      row.actual, row.missing, row.damaged, row.wrongLocation, row.book - row.checked
    ]));
    overview.autoFilter = { from: { row: 9, column: 1 }, to: { row: 9, column: hierarchyHeaders.length } };
    overview.views = [{ state: 'frozen', ySplit: 9 }];
    overview.columns.forEach((column, index) => { column.width = [7, 18, 26, 44, 30, 14, 12, 14, 10, 16, 12, 12][index] || 16; });
    styleDataRows(overview, 10);

    const detailHeaders = [
      'STT', 'Mã tài sản', 'Nhóm tài sản LV4', 'Tên tài sản', 'Serial', 'Đơn vị tính', 'Người dùng/Khu vực',
      'SL sổ sách', 'SL thực kiểm', 'Chênh lệch', 'Trạng thái sổ sách', 'Trạng thái thực kiểm', 'Kết quả', 'Tình trạng thực tế',
      'Thành phố cũ', 'Dự án cũ', 'Vị trí cũ', 'Phòng/Ban cũ', 'Đường dẫn vị trí cũ',
      'Thành phố mới', 'Dự án mới', 'Vị trí mới', 'Phòng/Ban mới', 'Đường dẫn vị trí mới',
      'Người kiểm', 'Ngày giờ kiểm kê', 'Ghi chú'
    ];
    const detailValues = (item: any, index: number) => {
      const book = Number(item.bookQuantity || 1);
      const actualQuantity = item.actualQuantity === null ? null : Number(item.actualQuantity);
      const oldCity = item.expectedCity || item.asset.cityName || '--';
      const oldProject = item.expectedProject || item.asset.projectName || '--';
      const oldLocation = item.expectedLocation || item.asset.locationName || '--';
      const oldDepartment = item.expectedDepartment || item.asset.departmentName || '--';
      const newCity = item.actualCity || '--';
      const newProject = item.actualProject || '--';
      const newLocation = item.actualLocation || '--';
      const newDepartment = item.actualDepartment || '--';
      return [
        index + 1,
        item.assetCode,
        item.asset.level4Name || '--',
        item.asset.assetName,
        item.expectedSerialNumber || item.asset.serialNumber || '--',
        item.asset.unit || 'Chiếc',
        item.expectedUserName || item.asset.currentUserName || '--',
        book,
        actualQuantity,
        actualQuantity === null ? null : book - actualQuantity,
        ASSET_STATUS_LABELS[item.expectedStatus || ''] || item.expectedStatus || '--',
        item.actualQuantity === null ? '--' : ASSET_STATUS_LABELS[item.actualStatus || ''] || item.actualStatus || '--',
        item.actualQuantity === null ? 'Chưa kiểm' : RESULT_LABELS[item.result || ''] || 'Đã kiểm',
        item.actualQuantity === null ? '--' : QUALITY_LABELS[item.quality || ''] || item.quality || '--',
        oldCity, oldProject, oldLocation, oldDepartment, formatPath(oldCity, oldProject, oldLocation, oldDepartment),
        newCity, newProject, newLocation, newDepartment,
        item.actualQuantity === null ? '--' : formatPath(newCity, newProject, newLocation, newDepartment),
        item.checkedBy || '--',
        item.checkedAt || null,
        item.note || '--'
      ];
    };

    const addDetailSheet = (name: string, title: string, source: any[]) => {
      const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4 }] });
      styleTitle(sheet, title, subtitle, detailHeaders.length);
      sheet.addRow([]);
      const header = sheet.addRow(detailHeaders);
      styleHeader(header);
      source.forEach((item, index) => sheet.addRow(detailValues(item, index)));
      sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: detailHeaders.length } };
      sheet.columns.forEach((column, index) => {
        column.width = [7, 22, 28, 42, 20, 14, 28, 12, 14, 12, 20, 20, 18, 20, 18, 24, 38, 28, 52, 18, 24, 38, 28, 52, 24, 20, 38][index] || 18;
      });
      sheet.getColumn(26).numFmt = 'dd/mm/yyyy hh:mm';
      styleDataRows(sheet, 5);
      return sheet;
    };

    addDetailSheet('Sổ sách & Thực kiểm', 'ĐỐI CHIẾU SỔ SÁCH VÀ KẾT QUẢ THỰC KIỂM', items);
    addDetailSheet('Tài sản thiếu', 'DANH SÁCH TÀI SẢN THIẾU', items.filter((item) => item.result === 'MISSING'));
    addDetailSheet('Hỏng & Cần sửa', 'DANH SÁCH TÀI SẢN HỎNG / CẦN SỬA', items.filter((item) => item.result === 'DAMAGED'));
    addDetailSheet('Sai vị trí', 'DANH SÁCH TÀI SẢN SAI VỊ TRÍ', items.filter((item) => item.result === 'WRONG_LOCATION'));
    addDetailSheet('Chưa kiểm', 'DANH SÁCH TÀI SẢN CHƯA KIỂM', items.filter((item) => item.actualQuantity === null));

    return { workbook, inventory, itemCount: items.length };
  }
}
