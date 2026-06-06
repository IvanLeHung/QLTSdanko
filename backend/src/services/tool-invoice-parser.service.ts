import prisma from '../utils/prisma';
import * as ExcelJS from 'exceljs';

export interface SuggestedCategory {
  category: string;
  confidence: number;
}

export interface ParsedToolInvoiceLine {
  rawItemName: string;
  suggestedToolName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  suggestedCategory: SuggestedCategory;
  note: string;
  warnings: string[];
}

export interface ParsedToolInvoiceResult {
  invoice: {
    invoiceNo: string;
    invoiceDate: string;
    supplierName: string;
    supplierTaxCode: string;
    totalAmount: number;
  };
  lines: ParsedToolInvoiceLine[];
  warnings: string[];
}

export class ToolInvoiceParserService {
  /**
   * Parse XML E-Invoice (Hóa đơn điện tử Việt Nam) for CCDC
   */
  static async parseXml(xmlContent: string): Promise<ParsedToolInvoiceResult> {
    const warnings: string[] = [];

    // Extract Invoice Metadata using resilient RegExp
    const invoiceNoMatch = xmlContent.match(/<SHDon>([\s\S]*?)<\/SHDon>/i) || 
                           xmlContent.match(/<SHD>([\s\S]*?)<\/SHD>/i) ||
                           xmlContent.match(/<InvoiceNo>([\s\S]*?)<\/InvoiceNo>/i);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].trim() : '';

    const invoiceDateMatch = xmlContent.match(/<NLap>([\s\S]*?)<\/NLap>/i) ||
                             xmlContent.match(/<TDLHDon>([\s\S]*?)<\/TDLHDon>/i) ||
                             xmlContent.match(/<InvoiceDate>([\s\S]*?)<\/InvoiceDate>/i);
    let invoiceDate = '';
    if (invoiceDateMatch) {
      const rawDate = invoiceDateMatch[1].trim();
      const dateOnlyMatch = rawDate.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      const vnDateMatch = rawDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
      if (dateOnlyMatch) {
        invoiceDate = `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
      } else if (vnDateMatch) {
        invoiceDate = `${vnDateMatch[3]}-${vnDateMatch[2]}-${vnDateMatch[1]}`;
      } else {
        invoiceDate = rawDate.split('T')[0];
      }
    }

    const sellerNameMatch = xmlContent.match(/<TenNDBan>([\s\S]*?)<\/TenNDBan>/i) ||
                            xmlContent.match(/<SellerName>([\s\S]*?)<\/SellerName>/i);
    const supplierName = sellerNameMatch ? sellerNameMatch[1].trim() : '';

    const sellerTaxCodeMatch = xmlContent.match(/<MSTNDBan>([\s\S]*?)<\/MSTNDBan>/i) ||
                               xmlContent.match(/<SellerTaxCode>([\s\S]*?)<\/SellerTaxCode>/i);
    const supplierTaxCode = sellerTaxCodeMatch ? sellerTaxCodeMatch[1].trim() : '';

    const totalAmountMatch = xmlContent.match(/<TgTTTBangChu>([\s\S]*?)<\/TgTTTBangChu>/i) ||
                             xmlContent.match(/<TongTien>([\s\S]*?)<\/TongTien>/i) ||
                             xmlContent.match(/<TotalAmount>([\s\S]*?)<\/TotalAmount>/i) ||
                             xmlContent.match(/<TgTCThue>([\s\S]*?)<\/TgTCThue>/i);
    let totalAmount = 0;
    if (totalAmountMatch) {
      const cleanVal = totalAmountMatch[1].replace(/[^0-9.]/g, '');
      totalAmount = parseFloat(cleanVal) || 0;
    }

    // Extract item rows using regex
    const itemBlockRegex = /<(HHDichVu|Product|Item)>([\s\S]*?)<\/\1>/gi;
    let match;
    const rawLines: any[] = [];

    while ((match = itemBlockRegex.exec(xmlContent)) !== null) {
      const block = match[2];
      const nameMatch = block.match(/<TenHHoa>([\s\S]*?)<\/TenHHoa>/i) ||
                        block.match(/<ProductName>([\s\S]*?)<\/ProductName>/i) ||
                        block.match(/<ItemName>([\s\S]*?)<\/ItemName>/i);
      const qtyMatch = block.match(/<SLuong>([\s\S]*?)<\/SLuong>/i) ||
                       block.match(/<Quantity>([\s\S]*?)<\/Quantity>/i);
      const priceMatch = block.match(/<DGia>([\s\S]*?)<\/DGia>/i) ||
                         block.match(/<UnitPrice>([\s\S]*?)<\/UnitPrice>/i);
      const amountMatch = block.match(/<ThTien>([\s\S]*?)<\/ThTien>/i) ||
                          block.match(/<Amount>([\s\S]*?)<\/Amount>/i);

      if (nameMatch) {
        rawLines.push({
          itemName: nameMatch[1].trim(),
          quantity: qtyMatch ? parseInt(qtyMatch[1].replace(/[^0-9]/g, '')) || 1 : 1,
          unitPrice: priceMatch ? parseFloat(priceMatch[1].replace(/[^0-9.]/g, '')) || 0 : 0,
          amount: amountMatch ? parseFloat(amountMatch[1].replace(/[^0-9.]/g, '')) || 0 : 0,
        });
      }
    }

    if (rawLines.length === 0) {
      warnings.push('Không tìm thấy dòng hàng nào trong XML hóa đơn. Vui lòng kiểm tra lại định dạng tệp.');
    }

    const lines: ParsedToolInvoiceLine[] = [];
    for (const raw of rawLines) {
      const suggestedCategory = this.suggestCategory(raw.itemName);
      lines.push({
        rawItemName: raw.itemName,
        suggestedToolName: raw.itemName,
        quantity: raw.quantity,
        unitPrice: raw.unitPrice,
        amount: raw.quantity * raw.unitPrice,
        suggestedCategory,
        note: '',
        warnings: suggestedCategory.confidence < 0.5 ? ['Cần phân nhóm thủ công (độ tin cậy gợi ý thấp)'] : []
      });
    }

    return {
      invoice: {
        invoiceNo,
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        supplierName,
        supplierTaxCode,
        totalAmount
      },
      lines,
      warnings
    };
  }

  /**
   * Parse Excel Template File for CCDC Invoice
   */
  static async parseExcel(buffer: Buffer): Promise<ParsedToolInvoiceResult> {
    const warnings: string[] = [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Tệp Excel không chứa trang tính (Worksheet) nào.');
    }

    let invoiceNo = '';
    let invoiceDate = '';
    let supplierName = '';
    let supplierTaxCode = '';
    let totalAmount = 0;

    const rawLines: any[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const getVal = (col: number) => {
        const val = row.getCell(col).value;
        if (val && typeof val === 'object' && 'result' in val) {
          return String(val.result || '');
        }
        return val ? String(val).trim() : '';
      };

      const rowInvoiceNo = getVal(1);
      const rowInvoiceDate = getVal(2);
      const rowSupplierName = getVal(3);
      const rowSupplierTaxCode = getVal(4);
      const itemName = getVal(5);
      const standardAssetName = getVal(6);
      const quantityVal = parseInt(getVal(11)) || 1;
      const unitPriceVal = parseFloat(getVal(12)) || 0;
      const note = getVal(14);

      if (!itemName) return;

      if (!invoiceNo && rowInvoiceNo) invoiceNo = rowInvoiceNo;
      if (!invoiceDate && rowInvoiceDate) {
        invoiceDate = rowInvoiceDate.split('T')[0];
      }
      if (!supplierName && rowSupplierName) supplierName = rowSupplierName;
      if (!supplierTaxCode && rowSupplierTaxCode) supplierTaxCode = rowSupplierTaxCode;

      rawLines.push({
        rawItemName: itemName,
        suggestedToolName: standardAssetName || itemName,
        quantity: quantityVal,
        unitPrice: unitPriceVal,
        amount: quantityVal * unitPriceVal,
        note,
      });

      totalAmount += (quantityVal * unitPriceVal);
    });

    const lines: ParsedToolInvoiceLine[] = [];
    for (const raw of rawLines) {
      const suggestedCategory = this.suggestCategory(raw.rawItemName);
      lines.push({
        rawItemName: raw.rawItemName,
        suggestedToolName: raw.suggestedToolName,
        quantity: raw.quantity,
        unitPrice: raw.unitPrice,
        amount: raw.amount,
        suggestedCategory,
        note: raw.note,
        warnings: suggestedCategory.confidence < 0.5 ? ['Cần phân nhóm thủ công (độ tin cậy gợi ý thấp)'] : []
      });
    }

    return {
      invoice: {
        invoiceNo,
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        supplierName,
        supplierTaxCode,
        totalAmount
      },
      lines,
      warnings
    };
  }

  /**
   * Smartly suggest category based on CCDC category lists
   */
  static suggestCategory(itemName: string): SuggestedCategory {
    const nameLower = itemName.toLowerCase();
    
    const rules = [
      { keywords: ['bàn', 'ghế', 'tủ', 'sofa', 'kệ', 'hộc', 'nội thất'], category: '01 Nội thất' },
      { keywords: ['trụ', 'bình', 'decor', 'trang trí', 'hoa', 'chậu', 'tượng', 'khung tranh', 'vát', 'búp thủy tinh'], category: '02 Decor / Trang trí' },
      { keywords: ['tòa nhà', 'bất động sản', 'bđs'], category: '03 Bất động sản - Tòa nhà' },
      { keywords: ['marketing', 'posm', 'standee', 'tờ rơi', 'brochure', 'băng rôn', 'poster'], category: '04 Marketing / POSM' },
      { keywords: ['branding', 'thương hiệu', 'logo', 'đồng phục', 'bảng hiệu'], category: '05 Branding' },
      { keywords: ['âm thanh', 'ánh sáng', 'loa', 'mic', 'sân khấu', 'event', 'đèn chiếu', 'đèn par'], category: '06 Event Equipment' },
      { keywords: ['tiệc', 'f&b', 'chén', 'dĩa', 'bát', 'ly', 'thìa', 'nồi', 'bếp', 'tách', 'khay'], category: '07 F&B / Tiệc' },
      { keywords: ['vận hành', 'dịch vụ'], category: '08 Dịch vụ vận hành' },
      { keywords: ['it', 'digital', 'máy tính', 'laptop', 'pc', 'mạng', 'router', 'wifi', 'switch', 'ups', 'cntt'], category: '09 IT & Digital' },
      { keywords: ['media', 'quay phim', 'chụp ảnh', 'camera', 'máy ảnh', 'ống kính', 'gimbal', 'micro thu âm'], category: '10 Media Production' },
      { keywords: ['kho', 'vận chuyển', 'xe đẩy', 'pallet', 'băng keo', 'thùng carton'], category: '11 Kho vận' },
      { keywords: ['costume', 'đạo cụ', 'trang phục', 'váy', 'áo dài', 'quần áo'], category: '12 Costume / Đạo cụ' },
      { keywords: ['kỹ thuật', 'khoan', 'búa', 'kìm', 'tua vít', 'máy hàn', 'máy mài', 'thước mét'], category: '13 Công cụ kỹ thuật' },
      { keywords: ['safety', 'pccc', 'cứu hỏa', 'bình chữa cháy', 'mũ bảo hộ', 'kính bảo hộ'], category: '14 Safety / PCCC' },
      { keywords: ['tiêu hao', 'vật tư', 'giấy in', 'bút', 'văn phòng phẩm'], category: '15 Vật tư tiêu hao' },
      { keywords: ['merchandise', 'quà tặng', 'mũ bảo hiểm', 'umbrella', 'dù', 'áo mưa'], category: '16 Merchandise' }
    ];

    for (const rule of rules) {
      if (rule.keywords.some(kw => nameLower.includes(kw))) {
        return { category: rule.category, confidence: 0.9 };
      }
    }

    return { category: '99 Khác', confidence: 0.1 };
  }
}
