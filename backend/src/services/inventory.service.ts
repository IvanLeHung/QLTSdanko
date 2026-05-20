import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class InventoryService {
  static async createInventorySession(data: {
    inventoryName: string;
    inventoryDate: Date;
    scopeType?: string; // "DEPARTMENT", "COMPANY", "ALL"
    scopeValue?: string;
  }, performedBy: string) {
    const inventoryCode = `INV-${Date.now()}`;
    
    return await prisma.$transaction(async (tx) => {
      // 1. Create the session
      const session = await tx.inventoryCheck.create({
        data: {
          inventoryCode,
          inventoryName: data.inventoryName,
          inventoryDate: data.inventoryDate,
          scopeType: data.scopeType || 'ALL',
          scopeValue: data.scopeValue,
          status: 'OPEN'
        }
      });

      // 2. Fetch assets in scope
      const where: any = { isDeleted: false };
      if (data.scopeType === 'DEPARTMENT' && data.scopeValue) {
        where.departmentName = data.scopeValue;
      } else if (data.scopeType === 'COMPANY' && data.scopeValue) {
        where.companyCode = data.scopeValue;
      }

      const assets = await tx.asset.findMany({ where });

      // 3. Populate inventory items
      if (assets.length > 0) {
        await tx.inventoryItem.createMany({
          data: assets.map(asset => ({
            inventoryCheckId: session.id,
            assetId: asset.id,
            assetCode: asset.assetCode,
            expectedStatus: asset.status,
            checkStatus: 'PENDING'
          }))
        });
      }

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: session.id,
        action: 'CREATE',
        details: { name: session.inventoryName, assetCount: assets.length },
        performedBy,
        tx
      });

      return { ...session, assetCount: assets.length };
    }, { timeout: 60000 }); // Large inventories might take time
  }

  static async getInventoryList() {
    return await prisma.inventoryCheck.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } }
      }
    });
  }

  static async getInventoryDetail(id: number) {
    return await prisma.inventoryCheck.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            asset: {
              select: {
                assetName: true,
                currentUserName: true,
                departmentName: true,
                locationName: true
              }
            }
          }
        }
      }
    });
  }

  static async submitItemCheck(itemId: number, data: {
    actualStatus: string;
    quality: string;
    note?: string;
    checkedBy: string;
  }) {
    return await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        actualStatus: data.actualStatus,
        quality: data.quality,
        note: data.note,
        checkStatus: 'CHECKED',
        checkedAt: new Date(),
        checkedBy: data.checkedBy
      }
    });
  }

  static async closeInventorySession(sessionId: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventoryCheck.update({
        where: { id: sessionId },
        data: { status: 'CLOSED' }
      });

      // Optional: Auto-update asset status if different? 
      // Usually, we just log it and let the manager decide.

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: session.id,
        action: 'UPDATE',
        details: { status: 'CLOSED' },
        performedBy,
        tx
      });

      return session;
    });
  }
}
