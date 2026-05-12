import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class HandoverService {
  static async createHandover(data: {
    type: 'HANDOVER' | 'TRANSFER';
    recipientName: string;
    recipientPosition?: string;
    recipientDepartment?: string;
    recipientPhone?: string;
    newLocation?: string;
    newCity?: string;
    senderName?: string;
    senderDepartment?: string;
    note?: string;
    reason?: string;
    assetIds: number[];
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const typeCode = data.type === 'HANDOVER' ? 'BBBG' : 'BDC';
      const counter = await tx.documentCounter.upsert({
        where: { documentType: data.type },
        update: { lastNumber: { increment: 1 } },
        create: { documentType: data.type, lastNumber: 1 },
      });

      const documentNo = `${counter.lastNumber.toString().padStart(4, '0')}/${typeCode}TS`;

      const document = await tx.handoverDocument.create({
        data: {
          documentNo,
          type: data.type,
          recipientName: data.recipientName,
          recipientPosition: data.recipientPosition,
          recipientDepartment: data.recipientDepartment,
          recipientPhone: data.recipientPhone,
          newLocation: data.newLocation,
          newCity: data.newCity,
          senderName: data.senderName,
          senderDepartment: data.senderDepartment,
          reason: data.reason,
          note: data.note,
          status: 'DRAFT',
          items: {
            create: await Promise.all(data.assetIds.map(async (id) => {
              const asset = await tx.asset.findUnique({ where: { id } });
              if (!asset) throw new Error(`Asset ID ${id} not found`);
              return {
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.assetName,
                unit: asset.unit,
                oldStatus: asset.status,
                newStatus: 'ASSIGNED'
              };
            }))
          }
        },
        include: { items: true }
      });

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: document.id,
        action: 'CREATE',
        details: { documentNo, type: data.type, assetCount: data.assetIds.length },
        performedBy,
        tx
      });

      return document;
    }, { timeout: 30000 });
  }

  static async completeHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!doc) throw new Error('Document not found');
      if (doc.status === 'COMPLETED') throw new Error('Document already completed');

      // Update each asset
      for (const item of doc.items) {
        const oldAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!oldAsset) continue;

        const updatedAsset = await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: 'ASSIGNED',
            currentUserName: doc.recipientName,
            currentPosition: doc.recipientPosition,
            departmentName: doc.recipientDepartment,
            locationName: doc.newLocation,
            cityName: doc.newCity,
            handoverDate: doc.documentDate,
          }
        });

        // Record history
        await tx.assetAssignment.create({
          data: {
            assetId: item.assetId,
            previousUserName: oldAsset.currentUserName,
            newUserName: doc.recipientName,
            newPosition: doc.recipientPosition,
            newDepartmentName: doc.recipientDepartment,
            newLocationName: doc.newLocation,
            newCityName: doc.newCity,
            newStatus: 'ASSIGNED',
            effectiveAt: doc.documentDate,
            note: `Hồ sơ ${doc.documentNo}`
          }
        });

        await AuditService.logAssetChange(item.assetId, oldAsset, updatedAsset, performedBy, tx);
      }

      // Update document status
      const updatedDoc = await tx.handoverDocument.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: id,
        action: 'COMPLETE',
        details: { documentNo: doc.documentNo },
        performedBy,
        tx
      });

      return updatedDoc;
    }, { timeout: 60000 });
  }

  static async getHandoverList(type?: string) {
    return await prisma.handoverDocument.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } }
    });
  }

  static async getHandoverDetail(id: number) {
    return await prisma.handoverDocument.findUnique({
      where: { id },
      include: { items: true }
    });
  }
}
