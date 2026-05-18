import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export interface PostInvoicePayload {
  invoice: {
    invoiceNo: string;
    invoiceDate: string;
    supplierId?: string | number;
    supplierName: string;
    supplierTaxCode?: string;
    companyId: string | number;
    warehouseId?: string | number;
    totalAmount?: number;
    fileUrl?: string;
    note?: string;
  };
  lines: Array<{
    invoiceItemName: string;
    assetName: string;
    categoryLevel1Id: number;
    categoryLevel2Id: number;
    categoryLevel3Id: number;
    categoryLevel4Id: number;
    quantity: number;
    unitPrice: number;
    serials?: string[];
    supplierName?: string;
    note?: string;
  }>;
  assignImmediately?: boolean;
}

export class InvoicePostService {
  static async postInvoice(payload: PostInvoicePayload, performedBy: string) {
    const { invoice, lines, assignImmediately } = payload;

    // 1. Basic Valdiation
    if (!invoice.invoiceNo) throw new Error('Vui lòng nhập số hóa đơn.');
    if (!invoice.invoiceDate) throw new Error('Vui lòng chọn ngày hóa đơn.');
    if (!invoice.supplierName) throw new Error('Vui lòng nhập nhà cung cấp.');
    if (!invoice.companyId) throw new Error('Vui lòng chọn công ty nhận hóa đơn.');
    if (lines.length === 0) throw new Error('Hóa đơn phải có ít nhất một dòng hạng mục.');

    const companyId = parseInt(String(invoice.companyId));
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('Công ty nhận hóa đơn không tồn tại.');

    // 2. Check duplicate invoice (supplierName + invoiceNo)
    const existingInvoice = await prisma.assetInvoiceBatch.findFirst({
      where: {
        invoiceNo: invoice.invoiceNo,
        supplierName: invoice.supplierName,
        companyId: companyId
      }
    });
    if (existingInvoice) {
      throw new Error(`Hóa đơn số ${invoice.invoiceNo} của nhà cung cấp ${invoice.supplierName} đã tồn tại trong hệ thống.`);
    }

    // 3. Serial Valdiation
    const allSerials: string[] = [];
    for (const [idx, line] of lines.entries()) {
      if (!line.invoiceItemName) throw new Error(`Dòng ${idx + 1} thiếu tên hạng mục trên hóa đơn.`);
      if (!line.assetName) throw new Error(`Dòng ${idx + 1} thiếu tên tài sản chuẩn.`);
      if (!line.categoryLevel1Id || !line.categoryLevel2Id || !line.categoryLevel3Id || !line.categoryLevel4Id) {
        throw new Error(`Dòng ${idx + 1} ("${line.invoiceItemName}") chưa chọn đầy đủ 4 cấp nhóm tài sản.`);
      }
      if (line.quantity <= 0) throw new Error(`Dòng ${idx + 1} có số lượng không hợp lệ (phải > 0).`);
      if (line.unitPrice < 0) throw new Error(`Dòng ${idx + 1} có đơn giá không hợp lệ (phải >= 0).`);

      if (line.serials && line.serials.length > 0) {
        if (line.serials.length > line.quantity) {
          throw new Error(`Dòng ${idx + 1} có số lượng serial (${line.serials.length}) vượt quá số lượng hạng mục (${line.quantity}).`);
        }
        allSerials.push(...line.serials);
      }
    }

    // Check duplicate serials in the payload
    const duplicateInPayload = allSerials.filter((item, index) => allSerials.indexOf(item) !== index);
    if (duplicateInPayload.length > 0) {
      throw new Error(`Có số serial bị trùng lặp trong hóa đơn này: ${duplicateInPayload.join(', ')}`);
    }

    // Check duplicate serials in database
    if (allSerials.length > 0) {
      const existingAssetsWithSerials = await prisma.asset.findMany({
        where: {
          serialNumber: { in: allSerials },
          isDeleted: false
        },
        select: { serialNumber: true }
      });
      if (existingAssetsWithSerials.length > 0) {
        const dupes = existingAssetsWithSerials.map(a => a.serialNumber).filter(Boolean);
        throw new Error(`Số serial đã tồn tại trong hệ thống: ${dupes.join(', ')}`);
      }
    }

    // 4. Fetch Category metadata to build asset codes
    const categoryIds = lines.flatMap(l => [l.categoryLevel1Id, l.categoryLevel2Id, l.categoryLevel3Id, l.categoryLevel4Id]);
    const categories = await prisma.assetCategory.findMany({
      where: { id: { in: categoryIds } }
    });
    const catMap = new Map(categories.map(c => [c.id, c]));

    // 5. Execute in single atomic transaction
    return await prisma.$transaction(async (tx) => {
      // Create Invoice Batch
      const batch = await tx.assetInvoiceBatch.create({
        data: {
          invoiceNo: invoice.invoiceNo,
          invoiceDate: new Date(invoice.invoiceDate),
          supplierId: invoice.supplierId ? parseInt(String(invoice.supplierId)) : null,
          supplierName: invoice.supplierName,
          supplierTaxCode: invoice.supplierTaxCode || null,
          companyId: companyId,
          warehouseId: invoice.warehouseId ? parseInt(String(invoice.warehouseId)) : null,
          totalAmount: invoice.totalAmount ? parseFloat(String(invoice.totalAmount)) : null,
          fileUrl: invoice.fileUrl || null,
          status: 'POSTED',
          totalLines: lines.length,
          totalAssets: lines.reduce((sum, l) => sum + l.quantity, 0),
          totalValue: lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0),
          postedAt: new Date()
        }
      });

      let createdAssetsCount = 0;
      const createdAssetCodes: string[] = [];

      // Process lines
      for (const [index, line] of lines.entries()) {
        const invoiceLine = await tx.assetInvoiceLine.create({
          data: {
            batchId: batch.id,
            lineNo: index + 1,
            invoiceItemName: line.invoiceItemName,
            assetName: line.assetName,
            categoryLevel1Id: line.categoryLevel1Id,
            categoryLevel2Id: line.categoryLevel2Id,
            categoryLevel3Id: line.categoryLevel3Id,
            categoryLevel4Id: line.categoryLevel4Id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.quantity * line.unitPrice,
            serialsJson: line.serials ? JSON.stringify(line.serials) : null,
            supplierName: line.supplierName || invoice.supplierName,
            note: line.note || null,
            validationStatus: 'VALID'
          }
        });

        // Resolve category codes/names
        const c1 = catMap.get(line.categoryLevel1Id);
        const c2 = catMap.get(line.categoryLevel2Id);
        const c3 = catMap.get(line.categoryLevel3Id);
        const c4 = catMap.get(line.categoryLevel4Id);

        if (!c1 || !c2 || !c3 || !c4) {
          throw new Error(`Không tìm thấy cấu trúc danh mục cho dòng ${index + 1}.`);
        }

        // Generate Asset Codes with active transaction 'tx' to prevent SQLite lockups
        const baseCode = `${company.code}.${c1.code}.${c2.code}.${c3.code}.${c4.code}`;
        const counterKey = `ASSET_CODE_${baseCode}`;
        
        let counter = await tx.documentCounter.findUnique({
          where: { documentType: counterKey }
        });

        if (!counter) {
          counter = await tx.documentCounter.create({
            data: { documentType: counterKey, lastNumber: 0 }
          });
        }

        const startNumber = counter.lastNumber + 1;
        const endNumber = counter.lastNumber + line.quantity;

        await tx.documentCounter.update({
          where: { id: counter.id },
          data: { lastNumber: endNumber }
        });

        const assetsData = [];
        for (let i = 0; i < line.quantity; i++) {
          const runningNo = startNumber + i;
          const runningNoText = runningNo.toString().padStart(3, '0');
          const assetCode = `${baseCode}.${runningNoText}`;
          const serial = line.serials?.[i] || null;

          assetsData.push({
            assetCode,
            assetName: line.assetName,
            serialNumber: serial,
            companyCode: company.code,
            companyName: company.name,
            level1Code: c1.code,
            level1Name: c1.name,
            level2Code: c2.code,
            level2Name: c2.name,
            level3Code: c3.code,
            level3Name: c3.name,
            level4Code: c4.code,
            level4Name: c4.name,
            runningNo,
            runningNoText,
            purchasePriceExVat: line.unitPrice,
            purchaseDate: new Date(invoice.invoiceDate),
            supplierName: line.supplierName || invoice.supplierName,
            status: assignImmediately ? 'ASSIGNED' : 'IN_STOCK',
            invoiceBatchId: batch.id,
            invoiceLineId: invoiceLine.id,
            originalInvoiceItemName: line.invoiceItemName
          });

          createdAssetCodes.push(assetCode);
          createdAssetsCount++;
        }

        await tx.asset.createMany({ data: assetsData });
      }

      // 6. Audit Logging
      await AuditService.log({
        entityType: 'CREATION_BATCH',
        entityId: batch.id,
        action: 'CREATE',
        details: { invoiceNo: invoice.invoiceNo, totalAssets: createdAssetsCount, supplier: invoice.supplierName },
        performedBy,
        tx
      });

      return {
        batchId: batch.id,
        invoiceNo: batch.invoiceNo,
        createdAssetsCount,
        createdAssetCodes
      };
    }, { timeout: 45000 });
  }
}
