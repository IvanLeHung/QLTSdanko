import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

export class HandoverService {
  static async createHandover(data: {
    type: 'HANDOVER' | 'TRANSFER' | 'REVOKE';
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
    autoComplete?: boolean;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const typeCode = data.type === 'HANDOVER' ? 'BBBG' : (data.type === 'REVOKE' ? 'BTH' : 'BDC');
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
          status: data.autoComplete ? 'COMPLETED' : 'DRAFT',
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
                newStatus: data.type === 'REVOKE' ? 'IN_STOCK' : 'ASSIGNED'
              };
            }))
          }
        },
        include: { items: true }
      });

      if (data.autoComplete) {
        // Update each asset immediately
        for (const item of document.items) {
          const oldAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
          if (!oldAsset) continue;

          const updatedAsset = await tx.asset.update({
            where: { id: item.assetId },
            data: {
              status: data.type === 'REVOKE' ? 'IN_STOCK' : 'ASSIGNED',
              currentUserName: data.type === 'REVOKE' ? null : data.recipientName,
              currentPosition: data.type === 'REVOKE' ? null : data.recipientPosition,
              departmentName: data.recipientDepartment,
              locationName: data.newLocation,
              cityName: data.newCity,
              handoverDate: data.type === 'REVOKE' ? null : new Date(),
            }
          });

          // Record history
          await tx.assetAssignment.create({
            data: {
              assetId: item.assetId,
              previousUserName: oldAsset.currentUserName,
              newUserName: data.type === 'REVOKE' ? 'KHO QLTS' : data.recipientName,
              newPosition: data.type === 'REVOKE' ? null : data.recipientPosition,
              newDepartmentName: data.recipientDepartment,
              newLocationName: data.newLocation,
              newCityName: data.newCity,
              newStatus: data.type === 'REVOKE' ? 'IN_STOCK' : 'ASSIGNED',
              effectiveAt: new Date(),
              note: `Hồ sơ ${documentNo} (${data.type === 'REVOKE' ? 'Thu hồi' : 'Bàn giao'})`
            }
          });

          await AuditService.logAssetChange(item.assetId, oldAsset, updatedAsset, performedBy, tx);
        }

        // Create GeneratedDocument record for each asset involved (so it shows in their Document tab)
        const templateCode = data.type === 'TRANSFER' ? 'BM06' : 'BM02';
        const template = await tx.documentTemplate.findUnique({ where: { templateCode } });
        
        if (template) {
          for (const assetId of data.assetIds) {
            await tx.generatedDocument.create({
              data: {
                documentNo: document.documentNo,
                templateId: template.id,
                entityType: 'Asset',
                entityId: assetId,
                fileName: `${templateCode}_${document.documentNo.replace('/', '_')}.pdf`,
                fileUrl: `/handover/${document.id}/pdf`,
                status: 'COMPLETED',
                createdBy: performedBy
              }
            });
          }
        }
      }

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: document.id,
        action: (data.autoComplete ? 'CREATE_AND_COMPLETE' : 'CREATE') as any,
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

      // Create GeneratedDocument record for each asset involved
      const templateCode = doc.type === 'TRANSFER' ? 'BM06' : 'BM02';
      const template = await tx.documentTemplate.findUnique({ where: { templateCode } });
      
      if (template) {
        for (const item of doc.items) {
          await tx.generatedDocument.create({
            data: {
              documentNo: doc.documentNo,
              templateId: template.id,
              entityType: 'Asset',
              entityId: item.assetId,
              fileName: `${templateCode}_${doc.documentNo.replace('/', '_')}.pdf`,
              fileUrl: `/handover/${doc.id}/pdf`,
              status: 'COMPLETED',
              createdBy: performedBy
            }
          });
        }
      }

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
