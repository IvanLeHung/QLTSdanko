import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class OperationalService {
  // --- DAMAGE REPORT ---
  static async createDamageReport(data: {
    assetIds: number[];
    reportDate?: string;
    damageLevel: string;
    description: string;
    solution: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.documentCounter.upsert({
        where: { documentType: 'DAMAGE_REPORT' },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: 'DAMAGE_REPORT', lastNumber: 1 },
      });
      const reportCode = `DR-${counter.lastNumber.toString().padStart(4, '0')}`;

      const report = await tx.damageReport.create({
        data: {
          reportCode,
          reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
          damageLevel: data.damageLevel,
          description: data.description,
          solution: data.solution,
          note: data.note,
          status: 'REPORTED',
          items: {
            create: data.assetIds.map(assetId => ({ assetId }))
          }
        }
      });

      // Update Assets status based on solution
      const assetStatus = data.solution === 'REPAIRING' ? 'UNDER_REPAIR' : 'DAMAGED';
      for (const assetId of data.assetIds) {
        const oldAsset = await tx.asset.findUnique({ where: { id: assetId } });
        const updatedAsset = await tx.asset.update({
          where: { id: assetId },
          data: { status: assetStatus }
        });
        await AuditService.logAssetChange(assetId, oldAsset, updatedAsset, performedBy, tx);
      }

      return report;
    });
  }

  // --- LOST REPORT ---
  static async createLostReport(data: {
    assetId: number;
    lostDate?: string;
    lastSeenDate?: string;
    responsibleUser?: string;
    department?: string;
    lastLocation?: string;
    description: string;
    remainingValue?: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.documentCounter.upsert({
        where: { documentType: 'LOST_REPORT' },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: 'LOST_REPORT', lastNumber: 1 },
      });
      const reportCode = `LR-${counter.lastNumber.toString().padStart(4, '0')}`;

      const report = await tx.lostReport.create({
        data: {
          lostCode: reportCode,
          assetId: data.assetId,
          reportedDate: data.lostDate ? new Date(data.lostDate) : new Date(),
          lostDetectedDate: data.lostDate ? new Date(data.lostDate) : null,
          lastSeenDate: data.lastSeenDate ? new Date(data.lastSeenDate) : null,
          responsibleUser: data.responsibleUser,
          responsibleDepartment: data.department,
          lastKnownLocation: data.lastLocation,
          incidentDescription: data.description,
          remainingValue: data.remainingValue || 0,
          note: data.note,
          status: 'LOST'
        }
      });

      const oldAsset = await tx.asset.findUnique({ where: { id: data.assetId } });
      const updatedAsset = await tx.asset.update({
        where: { id: data.assetId },
        data: { status: 'LOST' }
      });

      await AuditService.logAssetChange(data.assetId, oldAsset, updatedAsset, performedBy, tx);

      return report;
    });
  }

  // --- LIQUIDATION ---
  static async createLiquidation(data: {
    assetIds: number[];
    liquidationDate?: string;
    liquidationType: string;
    reason: string;
    buyerName?: string;
    documentNo?: string;
    totalValue?: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.documentCounter.upsert({
        where: { documentType: 'LIQUIDATION' },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: 'LIQUIDATION', lastNumber: 1 },
      });
      const liquidationCode = `LQ-${counter.lastNumber.toString().padStart(4, '0')}`;

      const record = await tx.liquidationRecord.create({
        data: {
          liquidationCode,
          liquidationDate: data.liquidationDate ? new Date(data.liquidationDate) : new Date(),
          liquidationType: data.liquidationType,
          reason: data.reason,
          buyerName: data.buyerName,
          documentNo: data.documentNo,
          totalValue: data.totalValue || 0,
          status: 'COMPLETED',
          items: {
            create: data.assetIds.map(assetId => ({ assetId }))
          }
        }
      });

      for (const assetId of data.assetIds) {
        const oldAsset = await tx.asset.findUnique({ where: { id: assetId } });
        const updatedAsset = await tx.asset.update({
          where: { id: assetId },
          data: { 
            status: 'LIQUIDATED',
            isLocked: true // LOCK ASSET
          }
        });
        await AuditService.logAssetChange(assetId, oldAsset, updatedAsset, performedBy, tx);
      }

      return record;
    }, { timeout: 60000 });
  }

  // --- PRINT LOG ---
  static async logPrintAction(data: {
    assetIds: number[];
    template: string;
    copies: number;
    config?: any;
  }, performedBy: string) {
    for (const assetId of data.assetIds) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { lastLabelPrint: new Date() }
      });
      
      await AuditService.log({
        entityType: 'ASSET',
        entityId: assetId,
        action: 'PRINT',
        details: {
          template: data.template,
          copies: data.copies,
          config: data.config
        },
        performedBy
      });
    }
    return { success: true, count: data.assetIds.length };
  }
}
