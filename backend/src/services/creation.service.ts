import prisma from '../utils/prisma';
import { AssetService } from './asset.service';
import { AuditService } from './audit.service';
import { normalizeDepartmentName } from '../utils/location.util';

export class CreationService {
  static async createBatch(data: {
    companyCode: string;
    companyName: string;
    level1Code: string;
    level1Name: string;
    level2Code: string;
    level2Name: string;
    level3Code: string;
    level3Name: string;
    level4Code: string;
    level4Name: string;
    assetName: string;
    quantity: number;
    purchaseDate?: string;
    price?: number;
    supplier?: string;
    documentNo?: string;
    note?: string;
    serialNumbers?: string[]; // Optional array of serials
    assignImmediately?: boolean;
    recipientName?: string;
    recipientDepartment?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Generate Batch Code
      const counter = await tx.documentCounter.upsert({
        where: { documentType: 'CREATION_BATCH' },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: 'CREATION_BATCH', lastNumber: 1 },
      });
      const batchCode = `BATCH-${counter.lastNumber.toString().padStart(4, '0')}`;

      // 2. Create Batch Record
      const batch = await tx.creationBatch.create({
        data: {
          batchCode,
          companyName: data.companyName,
          supplierName: data.supplier,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          documentNo: data.documentNo,
          totalQuantity: data.quantity,
          totalValue: (data.price || 0) * data.quantity,
          note: data.note,
          status: 'COMPLETED'
        }
      });

      // 3. Generate Asset Codes
      const codes = await AssetService.generateAssetCodes({
        companyCode: data.companyCode,
        level1Code: data.level1Code,
        level2Code: data.level2Code,
        level3Code: data.level3Code,
        level4Code: data.level4Code,
        quantity: data.quantity
      }, tx);

      // 4. Create Assets
      const assetsData = codes.map((c, index) => ({
        assetCode: c.assetCode,
        assetName: data.assetName,
        companyCode: data.companyCode,
        companyName: data.companyName,
        level1Code: data.level1Code,
        level1Name: data.level1Name,
        level2Code: data.level2Code,
        level2Name: data.level2Name,
        level3Code: data.level3Code,
        level3Name: data.level3Name,
        level4Code: data.level4Code,
        level4Name: data.level4Name,
        runningNo: c.runningNo,
        runningNoText: c.runningNoText,
        purchasePriceExVat: data.price || 0,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        supplierName: data.supplier,
        serialNumber: data.serialNumbers?.[index] || null,
        status: data.assignImmediately ? 'ASSIGNED' : 'IN_STOCK',
        currentUserName: data.assignImmediately ? data.recipientName : null,
        departmentName: data.assignImmediately
          ? normalizeDepartmentName(data.recipientDepartment)
          : null,
        handoverDate: data.assignImmediately ? new Date() : null,
        creationBatchId: batch.id
      }));

      await tx.asset.createMany({ data: assetsData });

      // 5. Audit Log
      await AuditService.log({
        entityType: 'CREATION_BATCH',
        entityId: batch.id,
        action: 'CREATE',
        details: { batchCode, assetCount: data.quantity },
        performedBy,
        tx
      });

      return batch;
    }, { timeout: 60000 });
  }

  static async getBatchList() {
    return await prisma.creationBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { assets: true } } }
    });
  }
}
