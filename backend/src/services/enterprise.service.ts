import prisma from '../utils/prisma';
import { ToolService } from './tool.service';

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export class EnterpriseService {
  static async listFinanceAssets() {
    return prisma.assetFinanceProfile.findMany({ include: { asset: true }, orderBy: { assetId: 'asc' }, take: 500 });
  }

  static async syncFinance(performedBy: string) {
    const assets = await prisma.asset.findMany({ where: { isDeleted: false }, take: 1000 });
    let synced = 0;
    for (const asset of assets) {
      const originalValue = asset.purchasePriceExVat || 0;
      const usefulLife = asset.depreciationEndDate && asset.purchaseDate
        ? Math.max(1, Math.round((asset.depreciationEndDate.getTime() - asset.purchaseDate.getTime()) / (30 * 24 * 3600 * 1000)))
        : null;
      const ageMonths = asset.purchaseDate ? Math.max(0, Math.round((Date.now() - asset.purchaseDate.getTime()) / (30 * 24 * 3600 * 1000))) : 0;
      const accumulatedDepreciation = usefulLife ? Math.min(originalValue, originalValue * (ageMonths / usefulLife)) : 0;
      await prisma.assetFinanceProfile.upsert({
        where: { assetId: asset.id },
        update: { originalValue, purchaseDate: asset.purchaseDate, usefulLife, accumulatedDepreciation, remainingValue: Math.max(0, originalValue - accumulatedDepreciation), costCenter: asset.departmentName || asset.companyCode, syncedAt: new Date() },
        create: { assetId: asset.id, originalValue, purchaseDate: asset.purchaseDate, usefulLife, accumulatedDepreciation, remainingValue: Math.max(0, originalValue - accumulatedDepreciation), costCenter: asset.departmentName || asset.companyCode, syncedAt: new Date() }
      });
      synced++;
    }
    await prisma.integrationLog.create({ data: { direction: 'INTERNAL', status: 'SUCCESS', message: `Finance sync by ${performedBy}`, payload: JSON.stringify({ synced }) } });
    return { success: true, synced };
  }

  static async createPurchaseRequest(data: any, performedBy: string) {
    return prisma.purchaseRequest.create({
      data: {
        requestNo: data.requestNo || `PR-${Date.now()}`,
        requestType: data.requestType || 'ASSET',
        title: data.title,
        description: data.description,
        quantity: Number(data.quantity || 1),
        estimatedValue: Number(data.estimatedValue || 0),
        requestedBy: performedBy
      }
    });
  }

  static async createPurchaseOrder(data: any, performedBy: string) {
    return prisma.purchaseOrder.create({
      data: {
        poNo: data.poNo || `PO-${Date.now()}`,
        requestId: data.requestId ? Number(data.requestId) : null,
        supplierName: data.supplierName,
        totalValue: Number(data.totalValue || 0),
        status: data.status || 'DRAFT',
        createdBy: performedBy
      }
    });
  }

  static async createGoodsReceipt(data: any, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNo: data.receiptNo || `GR-${Date.now()}`,
          poId: data.poId ? Number(data.poId) : null,
          itemType: data.itemType || 'ASSET',
          itemName: data.itemName,
          quantity: Number(data.quantity || 1),
          unitValue: Number(data.unitValue || 0),
          createdBy: performedBy
        }
      });
      if (receipt.itemType === 'CCDC') {
        const tool = await ToolService.createTool({
          toolName: receipt.itemName,
          category: data.category || 'CCDC',
          quantity: receipt.quantity,
          unit: data.unit || 'Cái',
          purchasePrice: receipt.unitValue,
          managementType: data.managementType || 'QUANTITY',
          supplierName: data.supplierName
        }, performedBy, tx);
        return tx.goodsReceipt.update({ where: { id: receipt.id }, data: { generatedToolId: tool.id } });
      }
      return receipt;
    });
  }

  static async queueOffline(data: any, userId?: number) {
    return prisma.offlineSyncLog.create({
      data: { deviceId: data.deviceId, userId, action: data.action, payload: JSON.stringify(data.payload || {}), conflictPolicy: data.conflictPolicy || 'CLIENT_REVIEW' }
    });
  }

  static async syncOffline(deviceId: string) {
    const logs = await prisma.offlineSyncLog.findMany({ where: { deviceId, syncStatus: 'PENDING' }, orderBy: { createdAt: 'asc' } });
    for (const log of logs) {
      await prisma.offlineSyncLog.update({ where: { id: log.id }, data: { syncStatus: 'SYNCED', syncedAt: new Date() } });
    }
    return { synced: logs.length, conflictPolicy: 'CLIENT_REVIEW' };
  }

  static async signDocument(data: any, performedBy: string) {
    return prisma.digitalSignature.create({
      data: { documentId: data.documentId, signedBy: data.signedBy || performedBy, signatureImage: data.signatureImage, deviceInfo: data.deviceInfo, lockedAt: new Date() }
    });
  }

  static async aggregateSnapshot(date = new Date()) {
    const day = startOfDay(date);
    const [assetCount, value, activeCount, lostCount, repairCost] = await Promise.all([
      prisma.asset.count({ where: { isDeleted: false } }),
      prisma.asset.aggregate({ where: { isDeleted: false }, _sum: { purchasePriceExVat: true } }),
      prisma.asset.count({ where: { isDeleted: false, status: { notIn: ['LOST', 'LIQUIDATED'] } } }),
      prisma.asset.count({ where: { isDeleted: false, status: 'LOST' } }),
      prisma.assetRepairTicket.aggregate({ _sum: { actualCost: true } })
    ]);
    return prisma.assetAnalyticsSnapshot.upsert({
      where: { date_companyId: { date: day, companyId: 0 } },
      update: { assetCount, assetValue: value._sum.purchasePriceExVat || 0, activeCount, lostCount, repairCost: repairCost._sum.actualCost || 0, inventoryRate: 0 },
      create: { date: day, companyId: 0, assetCount, assetValue: value._sum.purchasePriceExVat || 0, activeCount, lostCount, repairCost: repairCost._sum.actualCost || 0, inventoryRate: 0 }
    });
  }

  static async dashboardSnapshots() {
    const latest = await prisma.assetAnalyticsSnapshot.findMany({ orderBy: { date: 'desc' }, take: 30 });
    return latest;
  }
}
