import prisma from '../utils/prisma';
import { AssetService } from './asset.service';
import { AuditService } from './audit.service';
import { normalizeDepartmentName } from '../utils/location.util';

export class CreationService {
  static async createAdHocBatch(data: {
    companyId: number | string;
    entryDate?: string;
    note?: string;
    assignImmediately?: boolean;
    lines: Array<{
      assetName: string;
      categoryLevel1Id: number;
      categoryLevel2Id: number;
      categoryLevel3Id: number;
      categoryLevel4Id: number;
      quantity: number;
      unitPrice?: number;
      serials?: string[];
      note?: string;
    }>;
  }, performedBy: string) {
    if (!data.companyId) throw new Error('Vui lòng chọn công ty quản lý tài sản.');
    if (!Array.isArray(data.lines) || data.lines.length === 0) {
      throw new Error('Lô cấp mới phải có ít nhất một hạng mục.');
    }

    const company = await prisma.company.findUnique({ where: { id: Number(data.companyId) } });
    if (!company) throw new Error('Công ty quản lý tài sản không tồn tại.');

    const allSerials: string[] = [];
    data.lines.forEach((line, index) => {
      if (!line.assetName?.trim()) throw new Error(`Dòng ${index + 1} chưa nhập tên tài sản.`);
      if (!line.categoryLevel1Id || !line.categoryLevel2Id || !line.categoryLevel3Id || !line.categoryLevel4Id) {
        throw new Error(`Dòng ${index + 1} chưa chọn đầy đủ 4 cấp nhóm tài sản.`);
      }
      if (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0) {
        throw new Error(`Dòng ${index + 1} có số lượng không hợp lệ.`);
      }
      if ((line.serials?.length || 0) > Number(line.quantity)) {
        throw new Error(`Dòng ${index + 1} có số serial lớn hơn số lượng tài sản.`);
      }
      allSerials.push(...(line.serials || []).filter(Boolean));
    });

    const duplicateSerials = allSerials.filter((serial, index) => allSerials.indexOf(serial) !== index);
    if (duplicateSerials.length > 0) {
      throw new Error(`Serial bị trùng trong lô: ${Array.from(new Set(duplicateSerials)).join(', ')}.`);
    }
    if (allSerials.length > 0) {
      const existing = await prisma.asset.findMany({
        where: { serialNumber: { in: allSerials }, isDeleted: false },
        select: { serialNumber: true }
      });
      if (existing.length > 0) {
        throw new Error(`Serial đã tồn tại: ${existing.map(item => item.serialNumber).filter(Boolean).join(', ')}.`);
      }
    }

    const categoryIds = data.lines.flatMap(line => [
      Number(line.categoryLevel1Id), Number(line.categoryLevel2Id),
      Number(line.categoryLevel3Id), Number(line.categoryLevel4Id)
    ]);
    const categories = await prisma.assetCategory.findMany({ where: { id: { in: categoryIds } } });
    const categoryMap = new Map(categories.map(category => [category.id, category]));

    return prisma.$transaction(async (tx) => {
      const counter = await tx.documentCounter.upsert({
        where: { documentType: 'CREATION_BATCH' },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: 'CREATION_BATCH', lastNumber: 1 }
      });
      const batchCode = `VL-${new Date().getFullYear()}-${counter.lastNumber.toString().padStart(5, '0')}`;
      const totalQuantity = data.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
      const totalValue = data.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice || 0), 0);
      const entryDate = data.entryDate ? new Date(`${data.entryDate}T00:00:00.000Z`) : new Date();

      const batch = await tx.creationBatch.create({
        data: {
          batchCode,
          batchDate: entryDate,
          companyName: company.name,
          totalQuantity,
          totalValue,
          note: data.note || 'Tài sản vãng lai không có hóa đơn',
          status: 'COMPLETED'
        }
      });

      const createdAssetCodes: string[] = [];
      for (const [lineIndex, line] of data.lines.entries()) {
        const c1 = categoryMap.get(Number(line.categoryLevel1Id));
        const c2 = categoryMap.get(Number(line.categoryLevel2Id));
        const c3 = categoryMap.get(Number(line.categoryLevel3Id));
        const c4 = categoryMap.get(Number(line.categoryLevel4Id));
        if (!c1 || !c2 || !c3 || !c4) throw new Error(`Không tìm thấy danh mục của dòng ${lineIndex + 1}.`);

        const codes = await AssetService.generateAssetCodes({
          companyCode: company.code,
          level1Code: c1.code,
          level2Code: c2.code,
          level3Code: c3.code,
          level4Code: c4.code,
          quantity: Number(line.quantity)
        }, tx);

        await tx.asset.createMany({
          data: codes.map((code, index) => {
            createdAssetCodes.push(code.assetCode);
            return {
              assetCode: code.assetCode,
              assetName: line.assetName.trim(),
              serialNumber: line.serials?.[index] || null,
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
              runningNo: code.runningNo,
              runningNoText: code.runningNoText,
              purchasePriceExVat: Number(line.unitPrice || 0),
              purchaseDate: entryDate,
              status: data.assignImmediately ? 'ASSIGNED' : 'IN_STOCK',
              creationBatchId: batch.id,
              documentNote: line.note || data.note || null
            };
          })
        });
      }

      const createdAssets = await tx.asset.findMany({
        where: { creationBatchId: batch.id },
        select: { id: true, assetCode: true }
      });
      await AuditService.log({
        entityType: 'CREATION_BATCH',
        entityId: batch.id,
        action: 'CREATE',
        details: { batchCode, assetCount: createdAssets.length, source: 'AD_HOC_NO_INVOICE' },
        performedBy,
        tx
      });

      return {
        batchId: batch.id,
        batchCode,
        createdAssetsCount: createdAssets.length,
        createdAssetCodes,
        createdAssetIds: createdAssets.map(asset => asset.id)
      };
    }, { timeout: 60000 });
  }

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
