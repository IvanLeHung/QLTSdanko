import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class AssetService {
  static async generateAssetCodes(params: {
    companyCode: string;
    level1Code: string;
    level2Code: string;
    level3Code: string;
    level4Code: string;
    quantity: number;
  }) {
    const { companyCode, level1Code, level2Code, level3Code, level4Code, quantity } = params;
    const baseCode = `${companyCode}.${level1Code}.${level2Code}.${level3Code}.${level4Code}`;

    return await prisma.$transaction(async (tx) => {
      console.log(`Generating code for: ${baseCode} x${quantity}`);
      
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
      const endNumber = counter.lastNumber + quantity;

      await tx.documentCounter.update({
        where: { id: counter.id },
        data: { lastNumber: endNumber }
      });

      const codes = [];
      for (let i = startNumber; i <= endNumber; i++) {
        const runningNoText = i.toString().padStart(3, '0');
        const assetCode = `${baseCode}.${runningNoText}`;
        codes.push({ runningNo: i, runningNoText, assetCode });
      }

      return codes;
    }, { timeout: 30000 });
  }

  static async generateSingleAssetCode(params: {
    companyCode: string;
    level1Code: string;
    level2Code: string;
    level3Code: string;
    level4Code: string;
  }) {
    const codes = await this.generateAssetCodes({ ...params, quantity: 1 });
    return codes[0];
  }

  static async getDashboardSummary() {
    const [
      totalAssets,
      assigned,
      inStock,
      underRepair,
      damaged,
      lost,
      liquidated,
      totalValue,
      totalInventoryChecks,
      recentLogs
    ] = await Promise.all([
      prisma.asset.count({ where: { isDeleted: false } }),
      prisma.asset.count({ where: { status: 'ASSIGNED', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'IN_STOCK', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'UNDER_REPAIR', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'DAMAGED', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'LOST', isDeleted: false } }),
      prisma.asset.count({ where: { status: 'LIQUIDATED', isDeleted: false } }),
      prisma.asset.aggregate({
        where: { isDeleted: false },
        _sum: { purchasePriceExVat: true }
      }),
      prisma.inventoryCheck.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    return {
      totalAssets,
      assigned,
      inStock,
      underRepair,
      damaged,
      lost,
      liquidated,
      totalValue: totalValue._sum.purchasePriceExVat || 0,
      totalInventoryChecks,
      recentLogs
    };
  }

  static generateShortName(fullName: string): string {
    if (!fullName) return '';
    let name = fullName.trim();

    // 1. Remove repeated codes at the beginning (e.g. "GC-24IS35 – ...")
    const parts = name.split(/[–\-:/]/);
    if (parts.length > 1) {
      const firstPart = parts[0].trim();
      const rest = parts.slice(1).join(' ').trim();
      // If rest starts with firstPart, or rest is much longer, try to clean up
      if (rest.toLowerCase().includes(firstPart.toLowerCase())) {
        name = rest;
      }
    }

    // 2. Remove common boilerplate
    const boilerplate = [
      /Dàn lạnh treo tường/gi,
      /Điều hòa treo tường/gi,
      /Máy móc, thiết bị phục vụ/gi,
      /Dải tần số/gi,
      /Công suất thu phát sóng/gi,
      /loại khối trong nhà/gi,
      /nguồn điện/gi,
    ];
    
    // 2.1 Fix broken Vietnamese characters (B? -> Bộ, Chi?c -> Chiếc)
    name = name.replace(/B\?/g, 'Bộ');
    name = name.replace(/Chi\?c/g, 'Chiếc');
    name = name.replace(/C\?i/g, 'Cái'); // Thêm dự phòng cho "Cái"
    
    boilerplate.forEach(regex => {
      name = name.replace(regex, '');
    });

    // 3. Keep brand and key specs (simple heuristic)
    // For now, just clean up extra whitespace and truncate if still too long
    name = name.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    if (name.length > 60) {
      return name.substring(0, 57) + '...';
    }

    return name;
  }

  static async createAssets(data: any[], performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.asset.createMany({ data });
      
      // We log the batch creation
      await AuditService.log({
        entityType: 'ASSET_BATCH',
        entityId: 0, // 0 for batch
        action: 'CREATE',
        details: { count: data.length, firstCode: data[0].assetCode },
        performedBy,
        tx
      });

      return created;
    }, { timeout: 30000 });
  }

  static async updateAsset(id: number, updates: any, performedBy: string, reason?: string, updateAllSameName?: boolean) {
    return await prisma.$transaction(async (tx) => {
      const oldAsset = await tx.asset.findUnique({ where: { id } });
      if (!oldAsset) throw new Error('Asset not found');

      const updatedAsset = await tx.asset.update({
        where: { id },
        data: updates
      });

      await AuditService.logAssetChange(id, oldAsset, updatedAsset, performedBy, tx, reason);

      if (updateAllSameName && oldAsset.assetName) {
        const otherAssets = await tx.asset.findMany({
          where: {
            assetName: oldAsset.assetName,
            id: { not: id },
            isDeleted: false
          }
        });

        const bulkUpdates = { ...updates };
        delete bulkUpdates.assetCode;
        delete bulkUpdates.serialNumber;
        delete bulkUpdates.runningNo;
        delete bulkUpdates.runningNoText;

        for (const other of otherAssets) {
          const updatedOther = await tx.asset.update({
            where: { id: other.id },
            data: bulkUpdates
          });
          await AuditService.logAssetChange(
            other.id,
            other,
            updatedOther,
            performedBy,
            tx,
            `[Cập nhật hàng loạt cùng tên] ${reason || ''}`
          );
        }
      }

      return updatedAsset;
    }, { timeout: 30000 });
  }
}
