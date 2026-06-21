import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import { ToolService } from './tool.service';

export interface PostToolInvoicePayload {
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
    invoiceLegalStatus?: 'SUPPLIER_DRAFT' | 'WAITING_PAYMENT' | 'WAITING_SIGNED_INVOICE' | 'SIGNED_VALID' | 'CANCELLED_REPLACED';
    expectedSignedDate?: string;
    followUpOwner?: string;
    reminderAfter3Days?: boolean;
    reminderBeforeDueDate?: boolean;
  };
  lines: Array<{
    invoiceItemName: string;
    toolName: string;
    category: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    vatRate?: number;
    managementType: 'INDIVIDUAL' | 'QUANTITY';
    note?: string;
  }>;
}

export class ToolInvoicePostService {
  static async postInvoice(payload: PostToolInvoicePayload, performedBy: string) {
    const { invoice, lines } = payload;

    // 1. Basic Validation
    if (!invoice.invoiceNo) throw new Error('Vui lòng nhập số hóa đơn.');
    if (!invoice.invoiceDate) throw new Error('Vui lòng chọn ngày hóa đơn.');
    if (!invoice.supplierName) throw new Error('Vui lòng nhập nhà cung cấp.');
    if (!invoice.companyId) throw new Error('Vui lòng chọn công ty nhận hóa đơn.');
    if (lines.length === 0) throw new Error('Hóa đơn phải có ít nhất một dòng hạng mục.');

    const companyId = parseInt(String(invoice.companyId));
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('Công ty nhận hóa đơn không tồn tại.');

    const invoiceLegalStatus = invoice.invoiceLegalStatus || 'SIGNED_VALID';

    // 2. Check duplicate invoice (supplierName + invoiceNo + companyId)
    const existingInvoice = await prisma.toolInvoiceBatch.findFirst({
      where: {
        invoiceNo: invoice.invoiceNo,
        supplierName: invoice.supplierName,
        companyId: companyId
      }
    });
    if (existingInvoice) {
      throw new Error(`Hóa đơn số ${invoice.invoiceNo} của nhà cung cấp ${invoice.supplierName} đã tồn tại trong hệ thống.`);
    }

    // Validation for lines
    for (const [idx, line] of lines.entries()) {
      if (!line.invoiceItemName) throw new Error(`Dòng ${idx + 1} thiếu tên hạng mục trên hóa đơn.`);
      if (!line.toolName) throw new Error(`Dòng ${idx + 1} thiếu tên CCDC chuẩn.`);
      if (!line.category) throw new Error(`Dòng ${idx + 1} chưa chọn nhóm CCDC.`);
      if (line.quantity <= 0) throw new Error(`Dòng ${idx + 1} có số lượng không hợp lệ (phải > 0).`);
      if (line.unitPrice < 0) throw new Error(`Dòng ${idx + 1} có đơn giá không hợp lệ (phải >= 0).`);
    }

    // 3. Execute in single atomic transaction
    return await prisma.$transaction(async (tx) => {
      // Create Tool Invoice Batch
      const batch = await tx.toolInvoiceBatch.create({
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
          status: invoiceLegalStatus === 'SIGNED_VALID' ? 'POSTED' : 'DRAFT',
          invoiceLegalStatus,
          expectedSignedDate: invoice.expectedSignedDate ? new Date(invoice.expectedSignedDate) : null,
          followUpOwner: invoice.followUpOwner || null,
          reminderAfter3Days: Boolean(invoice.reminderAfter3Days),
          reminderBeforeDueDate: Boolean(invoice.reminderBeforeDueDate),
          totalLines: lines.length,
          totalAssets: lines.reduce((sum, l) => sum + l.quantity, 0),
          totalValue: lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0),
          postedAt: invoiceLegalStatus === 'SIGNED_VALID' ? new Date() : null
        }
      });

      let createdToolsCount = 0;
      const createdToolCodes: string[] = [];

      // Process lines
      for (const [index, line] of lines.entries()) {
        const invoiceLine = await tx.toolInvoiceLine.create({
          data: {
            batchId: batch.id,
            lineNo: index + 1,
            invoiceItemName: line.invoiceItemName,
            toolName: line.toolName,
            category: line.category,
            quantity: line.quantity,
            unit: line.unit || 'Chiếc',
            unitPrice: line.unitPrice,
            vatRate: line.vatRate ?? null,
            vatAmount: line.vatRate ? line.quantity * line.unitPrice * (line.vatRate / 100) : null,
            amount: line.quantity * line.unitPrice,
            supplierName: invoice.supplierName,
            note: line.note || null,
            validationStatus: 'VALID'
          }
        });

        // Resolve branch/city code to help generate tool codes
        let branchName = company.name;
        if (company.address) {
          if (company.address.toLowerCase().includes('hà nội')) branchName = 'Hà Nội';
          else if (company.address.toLowerCase().includes('bắc ninh')) branchName = 'Bắc Ninh';
          else if (company.address.toLowerCase().includes('hồ chí minh') || company.address.toLowerCase().includes('hcm')) branchName = 'Hồ Chí Minh';
          else if (company.address.toLowerCase().includes('thái nguyên')) branchName = 'Thái Nguyên';
        }

        // Generate CCDC Codes
        const totalToGenerate = line.managementType === 'QUANTITY' ? 1 : line.quantity;
        const codes = await ToolService.generateToolCodes({
          category: line.category,
          branchName: branchName,
          purchaseDate: new Date(invoice.invoiceDate),
          quantity: totalToGenerate
        }, tx);

        if (line.managementType === 'QUANTITY') {
          // Create 1 CCDC with full quantity
          const toolData = {
            toolCode: codes[0].toolCode,
            toolName: line.toolName,
            category: line.category,
            quantity: line.quantity,
            unit: line.unit || 'Chiếc',
            purchasePrice: line.unitPrice,
            purchaseDate: new Date(invoice.invoiceDate),
            supplierName: invoice.supplierName,
            status: 'IN_STOCK',
            managementType: 'QUANTITY',
            locationName: 'KHO CCDC',
            companyName: company.name,
            branchName: branchName,
            totalAmount: line.quantity * line.unitPrice,
            invoiceBatchId: batch.id,
            invoiceLineId: invoiceLine.id,
            originalInvoiceItemName: line.invoiceItemName,
            note: line.note || `Nhập từ hóa đơn ${invoice.invoiceNo}`
          };

          await ToolService.createTool(toolData, performedBy, tx);
          createdToolCodes.push(codes[0].toolCode);
          createdToolsCount += line.quantity;
        } else {
          // INDIVIDUAL: Create many CCDC records
          for (let i = 0; i < line.quantity; i++) {
            const toolData = {
              toolCode: codes[i].toolCode,
              toolName: line.toolName,
              category: line.category,
              quantity: 1,
              unit: line.unit || 'Chiếc',
              purchasePrice: line.unitPrice,
              purchaseDate: new Date(invoice.invoiceDate),
              supplierName: invoice.supplierName,
              status: 'IN_STOCK',
              managementType: 'INDIVIDUAL',
              locationName: 'KHO CCDC',
              companyName: company.name,
              branchName: branchName,
              totalAmount: line.unitPrice,
              invoiceBatchId: batch.id,
              invoiceLineId: invoiceLine.id,
              originalInvoiceItemName: line.invoiceItemName,
              note: line.note || `Nhập từ hóa đơn ${invoice.invoiceNo}`
            };

            await ToolService.createTool(toolData, performedBy, tx);
            createdToolCodes.push(codes[i].toolCode);
          }
          createdToolsCount += line.quantity;
        }
      }

      // Audit Logging
      await AuditService.log({
        entityType: 'CREATION_BATCH',
        entityId: batch.id,
        action: 'CREATE',
        details: { invoiceNo: invoice.invoiceNo, totalTools: createdToolsCount, supplier: invoice.supplierName },
        performedBy,
        tx
      });

      return {
        batchId: batch.id,
        invoiceNo: batch.invoiceNo,
        createdToolsCount,
        createdToolCodes
      };
    }, { timeout: 45000 });
  }
}
