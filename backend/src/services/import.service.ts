import prisma from '../utils/prisma';
import ExcelJS from 'exceljs';
import { AssetService } from './asset.service';

const BUSINESS_HEADERS = [
  'MTS', 'TTTS', 'MCTY', 'Group LV1', 'Group LV2', 'Group LV3', 'Group LV4',
  'VN_Group_Lv1', 'VN_Group_Lv2', 'VN_Group_Lv3', 'VN_Group_Lv4',
  'Name Asset', 'Serial number', 'ĐVT', 'Purpose', 'Trạng thái',
  'Người dùng', 'Chức vụ/Mục đích', 'Bộ phận', 'Vị trí', 'Tỉnh/Thành phố',
  'Ngày bàn giao', 'Giấy tờ', 'Ngày mua', 'Giá', 'Ngày hết khấu hao', 'Nhà cung cấp',
  'import_action'
];

const TECHNICAL_HEADERS = [
  'asset_code', 'running_no_text', 'company_code', 'level1_code', 'level2_code', 'level3_code', 'level4_code',
  'level1_name', 'level2_name', 'level3_name', 'level4_name',
  'asset_name', 'serial_number', 'unit', 'usage_purpose', 'status',
  'current_user_name', 'current_position', 'department_name', 'location_name', 'city_name',
  'handover_date', 'document_note', 'purchase_date', 'purchase_price_ex_vat', 'depreciation_end_date', 'supplier_name',
  'import_action'
];

const HEADER_MAP: Record<string, string> = {
  'MTS': 'asset_code',
  'TTTS': 'running_no_text',
  'MCTY': 'company_code',
  'Group LV1': 'level1_code',
  'Group LV2': 'level2_code',
  'Group LV3': 'level3_code',
  'Group LV4': 'level4_code',
  'VN_Group_Lv1': 'level1_name',
  'VN_Group_Lv2': 'level2_name',
  'VN_Group_Lv3': 'level3_name',
  'VN_Group_Lv4': 'level4_name',
  'Name Asset': 'asset_name',
  'Serial number': 'serial_number',
  'ĐVT': 'unit',
  'Purpose': 'usage_purpose',
  'Trạng thái': 'status',
  'Người dùng': 'current_user_name',
  'Chức vụ/Mục đích': 'current_position',
  'Bộ phận': 'department_name',
  'Vị trí': 'location_name',
  'Tỉnh/Thành phố': 'city_name',
  'Ngày bàn giao': 'handover_date',
  'Giấy tờ': 'document_note',
  'Ngày mua': 'purchase_date',
  'Giá': 'purchase_price_ex_vat',
  'Ngày hết khấu hao': 'depreciation_end_date',
  'Nhà cung cấp': 'supplier_name',
  'import_action': 'import_action'
};

const STATUS_MAP: Record<string, string> = {
  'Trong kho': 'IN_STOCK',
  'Đang sử dụng': 'ASSIGNED',
  'Đang cấp phát': 'ASSIGNED',
  'Đang sửa chữa': 'UNDER_REPAIR',
  'Mất': 'LOST',
  'Hỏng': 'DAMAGED',
  'Chờ thanh lý': 'PENDING_DISPOSAL',
  'Đã thanh lý': 'DISPOSED',
  'Ngừng sử dụng': 'RETIRED',
  // Reverse map for technical values
  'IN_STOCK': 'IN_STOCK',
  'ASSIGNED': 'ASSIGNED',
  'UNDER_REPAIR': 'UNDER_REPAIR',
  'LOST': 'LOST',
  'DAMAGED': 'DAMAGED',
  'PENDING_DISPOSAL': 'PENDING_DISPOSAL',
  'DISPOSED': 'DISPOSED',
  'RETIRED': 'RETIRED'
};

export class ImportService {
  static async parseExcel(buffer: any) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error("Worksheet not found");

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => {
      headers.push(cell.text.trim());
    });

    const rows: any[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const excelRow = worksheet.getRow(i);
      const rowData: any = {};
      let hasData = false;

      headers.forEach((header, index) => {
        const cell = excelRow.getCell(index + 1);
        const internalKey = HEADER_MAP[header] || header;
        let value = cell.value;

        // 1. Detect and nullify Excel formula errors (#REF!, #N/A, etc.)
        if (value && typeof value === 'object' && (value as any).error) {
            value = null;
        }

        // 2. Extract text if it's a rich text object
        if (value && typeof value === 'object' && (value as any).richText) {
            value = (value as any).richText.map((rt: any) => rt.text).join('');
        }

        // Handle specific types - Force to String
        const stringFields = [
            'asset_code', 'running_no_text', 'company_code', 
            'level1_code', 'level2_code', 'level3_code', 'level4_code', 
            'serial_number', 'unit', 'usage_purpose',
            'current_user_name', 'current_position', 'department_name', 
            'location_name', 'city_name', 'supplier_name', 'document_note', 'note'
        ];

        if (stringFields.includes(internalKey)) {
            // If it's a number or something else, convert to string safely
            if (value !== null && value !== undefined) {
                value = String(value).trim();
            } else {
                value = cell.text?.trim() || null;
            }
            
            // Final check: if it's still an object (like error object), null it
            if (typeof value === 'object') value = null;

            // Normalize codes
            if (value && ['company_code', 'level1_code', 'level2_code', 'level3_code', 'level4_code'].includes(internalKey)) {
                if (/^\d+$/.test(value)) {
                    value = value.padStart(2, '0');
                }
            }
        }

        if (internalKey === 'status') {
            const statusText = cell.text?.trim();
            value = STATUS_MAP[statusText] || 'IN_STOCK';
        }

        if (['handover_date', 'purchase_date', 'depreciation_end_date'].includes(internalKey)) {
            value = this.parseDate(cell);
        }

        if (internalKey === 'purchase_price_ex_vat') {
            value = this.parsePrice(cell);
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

  private static parseDate(cell: ExcelJS.Cell): Date | null {
    const value = cell.value;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        // Excel serial date
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const str = cell.text?.trim();
    if (!str) return null;

    // Support dd/mm/yyyy
    const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
    if (ddmmyyyy) {
        return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    }

    // Support yyyy-mm-dd
    const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str);
    if (yyyymmdd) {
        return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private static parsePrice(cell: ExcelJS.Cell): number {
    const value = cell.value;
    if (typeof value === 'number') return value;
    const str = cell.text?.trim();
    if (!str) return 0;

    // Remove all non-numeric chars except . and ,
    // If it has both , and . (like 1,234.56), assume , is thousand and . is decimal
    // If it has only . or only , (like 1.234 or 1,234), assume it is thousand separator if it is at 3rd position from right?
    // Vietnamese often use . for thousand and , for decimal.
    // We'll try to be smart but simple.
    
    let sanitized = str.replace(/[^\d.,]/g, '');
    
    // If multiple dots and one comma at the end: 1.234.567,89 -> 1234567.89
    if (sanitized.includes('.') && sanitized.includes(',')) {
        if (sanitized.lastIndexOf('.') < sanitized.lastIndexOf(',')) {
            sanitized = sanitized.replace(/\./g, '').replace(',', '.');
        } else {
            // US format 1,234,567.89
            sanitized = sanitized.replace(/,/g, '');
        }
    } else if (sanitized.includes(',')) {
        // Only commas: could be decimal (VN) or thousand (US)
        // If it's something like "1,234", we'll check if it looks like thousand
        const parts = sanitized.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            sanitized = sanitized.replace(/,/g, '');
        } else {
            sanitized = sanitized.replace(',', '.');
        }
    } else if (sanitized.includes('.')) {
        // Only dots: could be decimal (US) or thousand (VN)
        const parts = sanitized.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            sanitized = sanitized.replace(/\./g, '');
        }
    }

    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : num;
  }

  private static normalizeCode(code: string): string {
    const trimmed = code.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed.padStart(2, '0');
    }
    return trimmed;
  }

  static async validateRow(row: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const asset_code = row.asset_code || row.MTS;
    const asset_name = row.asset_name || row['Name Asset'];
    const company_raw = this.normalizeCode(String(row.company_code || row.MCTY || '00'));
    const l1_raw = this.normalizeCode(String(row.level1_code || row['Group LV1'] || ''));
    const l2_raw = this.normalizeCode(String(row.level2_code || row['Group LV2'] || ''));
    const l3_raw = this.normalizeCode(String(row.level3_code || row['Group LV3'] || ''));
    const l4_raw = this.normalizeCode(String(row.level4_code || row['Group LV4'] || ''));

    // Standardize row object with raw input (no padding)
    row.company_code = company_raw;
    row.level1_code = l1_raw;
    row.level2_code = l2_raw;
    row.level3_code = l3_raw;
    row.level4_code = l4_raw;

    if (!asset_name) errors.push("Tên tài sản (Name Asset) không được để trống.");
    
    // We don't error if not found anymore, because we will create/update them on commit
    // But we can add warnings if information is missing for creation
    if (!company_raw) errors.push("Mã công ty (MCTY) không được để trống.");
    if (!l1_raw) errors.push("Group LV1 không được để trống.");
    if (!l2_raw) errors.push("Group LV2 không được để trống.");
    if (!l3_raw) errors.push("Group LV3 không được để trống.");
    if (!l4_raw) errors.push("Group LV4 không được để trống.");

    // Action detection
    let action = row.import_action || 'UPSERT';
    let detected_action = 'CREATE';

    if (asset_code) {
        const existing = await prisma.asset.findUnique({ where: { assetCode: asset_code } });
        if (existing) {
            detected_action = 'UPDATE';
            if (action === 'CREATE') errors.push(`Mã tài sản ${asset_code} đã tồn tại nhưng hành động yêu cầu là CREATE.`);
        } else {
            detected_action = 'CREATE';
            if (action === 'UPDATE') errors.push(`Không tìm thấy mã tài sản ${asset_code} để UPDATE.`);
        }
    } else {
        if (action === 'UPDATE') errors.push("Cần mã tài sản (MTS) để thực hiện UPDATE.");
        detected_action = 'CREATE';
    }

    return {
        status: errors.length > 0 ? 'ERROR' : (warnings.length > 0 ? 'WARNING' : 'VALID'),
        errors,
        warnings,
        detected_action
    };
  }
}
