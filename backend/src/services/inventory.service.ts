import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class InventoryService {
  static async createInventorySession(data: {
    inventoryName: string;
    inventoryDate: string | Date;
    scopeType?: string; // "DEPARTMENT", "COMPANY", "ALL"
    scopeValue?: string;
    expectedFinishDate?: string | Date;
    responsiblePerson?: string;
    note?: string;
    status?: string;
  }, performedBy: string) {
    // 1. Check duplicate session name (excluding CANCELLED)
    const existing = await prisma.inventoryCheck.findFirst({
      where: {
        inventoryName: data.inventoryName,
        status: { not: 'CANCELLED' }
      }
    });
    if (existing) {
      throw new Error(`Đợt kiểm kê với tên "${data.inventoryName}" đã tồn tại và chưa bị hủy.`);
    }

    const inventoryCode = `INV-${Date.now()}`;
    const status = data.status || 'DRAFT';
    
    // Parse Dates
    const parsedDate = new Date(data.inventoryDate);
    const parsedFinishDate = data.expectedFinishDate ? new Date(data.expectedFinishDate) : null;

    return await prisma.$transaction(async (tx) => {
      // 1. Create the session
      const session = await tx.inventoryCheck.create({
        data: {
          inventoryCode,
          inventoryName: data.inventoryName,
          inventoryDate: parsedDate,
          expectedFinishDate: parsedFinishDate,
          responsiblePerson: data.responsiblePerson || null,
          note: data.note || null,
          scopeType: data.scopeType || 'ALL',
          scopeValue: data.scopeValue || null,
          status: status
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
            expectedLocation: asset.locationName || 'Trong kho',
            checkStatus: 'PENDING'
          }))
        });
      }

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: session.id,
        action: 'CREATE',
        details: { name: session.inventoryName, assetCount: assets.length, status },
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
    actualLocation?: string;
    quality: string;
    note?: string;
    checkedBy: string;
    photos?: string[];
  }) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId }
    });
    if (!item) throw new Error("Không tìm thấy mục kiểm kê");

    // Dynamic result determination
    let result = 'MATCHED';
    if (data.actualStatus === 'LOST' || data.quality === 'LOST' || data.quality === 'MISSING') {
      result = 'MISSING';
    } else if (data.quality === 'DAMAGED' || data.quality === 'BAD' || data.actualStatus === 'DAMAGED') {
      result = 'DAMAGED';
    } else if (data.actualLocation && item.expectedLocation && data.actualLocation !== item.expectedLocation) {
      result = 'WRONG_LOCATION';
    } else if (data.actualStatus !== item.expectedStatus) {
      result = 'WRONG_STATUS';
    }

    return await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          actualStatus: data.actualStatus,
          actualLocation: data.actualLocation || item.expectedLocation,
          quality: data.quality,
          note: data.note,
          result: result,
          photos: data.photos || [],
          checkStatus: 'CHECKED',
          checkedAt: new Date(),
          checkedBy: data.checkedBy
        }
      });

      const session = await tx.inventoryCheck.findUnique({
        where: { id: item.inventoryCheckId }
      });
      if (session && session.status === 'OPEN') {
        await tx.inventoryCheck.update({
          where: { id: session.id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return updatedItem;
    });
  }

  static async startInventorySession(sessionId: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventoryCheck.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Không tìm thấy đợt kiểm kê");
      if (session.status !== 'DRAFT') throw new Error("Chỉ có thể bắt đầu đợt kiểm kê nháp");

      const updated = await tx.inventoryCheck.update({
        where: { id: sessionId },
        data: { status: 'OPEN' }
      });

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: sessionId,
        action: 'UPDATE',
        details: { status: 'OPEN' },
        performedBy,
        tx
      });

      return updated;
    });
  }

  static async closeInventorySession(sessionId: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventoryCheck.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' }
      });

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: session.id,
        action: 'UPDATE',
        details: { status: 'COMPLETED' },
        performedBy,
        tx
      });

      return session;
    });
  }

  static async cancelInventorySession(sessionId: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventoryCheck.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Không tìm thấy đợt kiểm kê");
      if (session.status === 'COMPLETED') throw new Error("Không thể hủy đợt kiểm kê đã hoàn tất");

      const updated = await tx.inventoryCheck.update({
        where: { id: sessionId },
        data: { status: 'CANCELLED' }
      });

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: sessionId,
        action: 'UPDATE',
        details: { status: 'CANCELLED' },
        performedBy,
        tx
      });

      return updated;
    });
  }
}
