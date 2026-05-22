import ExcelJS from 'exceljs';

export const formatDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const buildExcelWorkbook = (
  title: string,
  subHeader: string,
  headers: string[],
  rows: any[][],
  sheetName: string
): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Title
  sheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 40;
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1F497D' }
  };

  // Subheader
  sheet.mergeCells(2, 1, 2, headers.length);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subHeader;
  subCell.font = { name: 'Arial', size: 10, italic: true };
  subCell.alignment = { horizontal: 'center' };

  sheet.addRow([]); // Blank row 3

  // Headers
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'BFBFBF' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: 'BFBFBF' } },
      right: { style: 'thin', color: { argb: 'BFBFBF' } }
    };
  });

  // Data rows
  rows.forEach((r) => {
    const row = sheet.addRow(r);
    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
      
      // Center-align code and status columns, left-align names and text
      const headerVal = headers[colNum - 1]?.toLowerCase() || '';
      if (
        headerVal.includes('mã') ||
        headerVal.includes('ngày') ||
        headerVal.includes('trạng thái') ||
        headerVal.includes('đơn vị') ||
        headerVal.includes('số serial') ||
        headerVal.includes('loại')
      ) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Auto-fit widths
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell!({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    column.width = Math.max(maxLen + 4, 12);
  });

  return workbook;
};
