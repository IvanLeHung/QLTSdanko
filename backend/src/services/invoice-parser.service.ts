import prisma from '../utils/prisma';
import * as ExcelJS from 'exceljs';

export interface SuggestedCategory {
  level1Id: number | null;
  level2Id: number | null;
  level3Id: number | null;
  level4Id: number | null;
  confidence: number;
}

export interface ParsedInvoiceLine {
  rawItemName: string;
  suggestedAssetName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  suggestedCategory: SuggestedCategory;
  serials: string[];
  note: string;
  warnings: string[];
}

export interface ParsedInvoiceResult {
  invoice: {
    invoiceNo: string;
    invoiceDate: string;
    supplierName: string;
    supplierTaxCode: string;
    totalAmount: number;
  };
  lines: ParsedInvoiceLine[];
  warnings: string[];
}

export class InvoiceParserService {
  /**
   * Parse XML E-Invoice (Hóa đơn điện tử Việt Nam)
   */
  static async parseXml(xmlContent: string): Promise<ParsedInvoiceResult> {
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
      // Normalize date (e.g. 2026-05-18T00:00:00 or 18/05/2026)
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
                             xmlContent.match(/<TgTCThue>([\s\S]*?)<\/TgTCThue>/i); // Taxable sum
    let totalAmount = 0;
    if (totalAmountMatch) {
      const cleanVal = totalAmountMatch[1].replace(/[^0-9.]/g, '');
      totalAmount = parseFloat(cleanVal) || 0;
    }

    // Extract item rows using regex
    // Standard VNEI contains <HHDichVu> ... </HHDichVu> or <Product> ... </Product> or <Item> ... </Item>
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

    // Build suggested categories for each line
    const categorySuggester = await this.getCategorySuggester();
    const lines: ParsedInvoiceLine[] = [];

    for (const raw of rawLines) {
      const suggestedCategory = categorySuggester(raw.itemName);
      lines.push({
        rawItemName: raw.itemName,
        suggestedAssetName: raw.itemName, // Default same as original item name
        quantity: raw.quantity,
        unitPrice: raw.unitPrice,
        amount: raw.quantity * raw.unitPrice,
        suggestedCategory,
        serials: [],
        note: '',
        warnings: suggestedCategory.confidence < 0.5 ? ['Cần phân nhóm thủ công (confidence gợi ý thấp)'] : []
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
   * Parse Excel Template File
   */
  static async parseExcel(buffer: Buffer): Promise<ParsedInvoiceResult> {
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
    const categorySuggester = await this.getCategorySuggester();

    // Loop through rows starting from row 2 (assuming row 1 is header)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Excel columns structure:
      // 1: invoiceNo, 2: invoiceDate, 3: supplierName, 4: supplierTaxCode, 
      // 5: itemName, 6: standardAssetName, 7: category1, 8: category2, 
      // 9: category3, 10: category4, 11: quantity, 12: unitPrice, 13: serials, 14: note
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
      const serialsStr = getVal(13);
      const note = getVal(14);

      if (!itemName) return; // Skip empty row

      // Keep metadata from first valid row with metadata
      if (!invoiceNo && rowInvoiceNo) invoiceNo = rowInvoiceNo;
      if (!invoiceDate && rowInvoiceDate) {
        // format rowInvoiceDate if object or String
        invoiceDate = rowInvoiceDate.split('T')[0];
      }
      if (!supplierName && rowSupplierName) supplierName = rowSupplierName;
      if (!supplierTaxCode && rowSupplierTaxCode) supplierTaxCode = rowSupplierTaxCode;

      const serials = serialsStr ? serialsStr.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : [];

      rawLines.push({
        rawItemName: itemName,
        suggestedAssetName: standardAssetName || itemName,
        quantity: quantityVal,
        unitPrice: unitPriceVal,
        amount: quantityVal * unitPriceVal,
        serials,
        note,
      });

      totalAmount += (quantityVal * unitPriceVal);
    });

    const lines: ParsedInvoiceLine[] = [];
    for (const raw of rawLines) {
      const suggestedCategory = categorySuggester(raw.rawItemName);
      lines.push({
        rawItemName: raw.rawItemName,
        suggestedAssetName: raw.suggestedAssetName,
        quantity: raw.quantity,
        unitPrice: raw.unitPrice,
        amount: raw.amount,
        suggestedCategory,
        serials: raw.serials,
        note: raw.note,
        warnings: suggestedCategory.confidence < 0.5 ? ['Cần phân nhóm thủ công (confidence gợi ý thấp)'] : []
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
   * Helper to build dynamic category matching function from Database
   */
  private static async getCategorySuggester() {
    // 1. Fetch active categories
    const categories = await prisma.assetCategory.findMany({
      where: { isActive: true }
    });

    // Create lookup map
    const catMap = new Map<number, typeof categories[0]>();
    for (const cat of categories) {
      catMap.set(cat.id, cat);
    }

    // Filter level 4 categories to match against
    const level4Categories = categories.filter(c => c.level === 4);

    // Dynamic keyword matching rules
    const rules = [
      { keywords: ['laptop', 'pc', 'dell', 'hp', 'lenovo', 'thinkpad', 'macbook', 'xps', 'workstation', 'máy tính', 'vostro', 'inspiron', 'latitude'], matchTarget: ['pc', 'máy tính', 'laptop'] },
      { keywords: ['monitor', 'màn hình', 'display', 'ultrasharp'], matchTarget: ['màn hình', 'monitor'] },
      { keywords: ['printer', 'máy in', 'canon', 'laserjet', 'brother'], matchTarget: ['máy in', 'printer'] },
      { keywords: ['bàn', 'ghế', 'tủ', 'sofa', 'kệ', 'giường', 'hộc'], matchTarget: ['bàn', 'ghế', 'tủ', 'kệ'] },
      { keywords: ['điều hòa', 'máy lạnh', 'daikin', 'panasonic'], matchTarget: ['điều hòa', 'máy lạnh'] },
      { keywords: ['điện thoại', 'iphone', 'samsung', 'xiaomi', 'telephone', 'phone'], matchTarget: ['điện thoại', 'phone'] },
      { keywords: ['máy chiếu', 'projector', 'epson'], matchTarget: ['máy chiếu', 'projector'] },
      { keywords: ['camera', 'đầu ghi', 'hikvision', 'dahua'], matchTarget: ['camera', 'đầu ghi'] }
    ];

    return (itemName: string): SuggestedCategory => {
      const nameLower = itemName.toLowerCase();
      let matchedTargetStr: string | null = null;
      let highestConfidence = 0.1;

      // Check rules
      for (const rule of rules) {
        if (rule.keywords.some(kw => nameLower.includes(kw))) {
          matchedTargetStr = rule.matchTarget[0];
          highestConfidence = 0.9;
          break;
        }
      }

      // Try to find the closest level 4 category
      let matchedLvl4: typeof categories[0] | null = null;

      if (matchedTargetStr) {
        // Search first by target matching word
        if (matchedTargetStr === 'bàn') {
          matchedLvl4 = level4Categories.find(c => 
            c.name.toLowerCase().includes('bàn') && 
            !c.name.toLowerCase().includes('điện thoại')
          ) || null;
        } else if (matchedTargetStr === 'điện thoại') {
          matchedLvl4 = level4Categories.find(c => 
            c.name.toLowerCase().includes('điện thoại')
          ) || null;
        } else {
          matchedLvl4 = level4Categories.find(c => c.name.toLowerCase().includes(matchedTargetStr!)) || null;
        }
      }

      // Fallback: Search directly for category names containing any word in itemName
      if (!matchedLvl4) {
        const words = nameLower.split(/\s+/).filter(w => w.length > 2);
        for (const w of words) {
          let found = null;
          if (w === 'bàn') {
            found = level4Categories.find(c => 
              c.name.toLowerCase().includes('bàn') && 
              !c.name.toLowerCase().includes('điện thoại')
            );
          } else {
            found = level4Categories.find(c => c.name.toLowerCase().includes(w));
          }
          if (found) {
            matchedLvl4 = found;
            highestConfidence = 0.6;
            break;
          }
        }
      }

      // If still not found, default to first Level 4 category or null
      if (!matchedLvl4 && level4Categories.length > 0) {
        // Fallback to absolute first level 4
        matchedLvl4 = level4Categories[0];
        highestConfidence = 0.1;
      }

      if (!matchedLvl4) {
        return {
          level1Id: null,
          level2Id: null,
          level3Id: null,
          level4Id: null,
          confidence: 0.0
        };
      }

      // Reconstruct hierarchy path
      const level4Id = matchedLvl4.id;
      const level3 = matchedLvl4.parentId ? catMap.get(matchedLvl4.parentId) : null;
      const level3Id = level3 ? level3.id : null;
      const level2 = level3 && level3.parentId ? catMap.get(level3.parentId) : null;
      const level2Id = level2 ? level2.id : null;
      const level1 = level2 && level2.parentId ? catMap.get(level2.parentId) : null;
      const level1Id = level1 ? level1.id : null;

      return {
        level1Id,
        level2Id,
        level3Id,
        level4Id,
        confidence: highestConfidence
      };
    };
  }
}
