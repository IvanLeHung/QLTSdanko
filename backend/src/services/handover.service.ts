import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import { generateDocumentNo } from '../utils/document';

export class HandoverService {
  static async createHandover(data: {
    type: 'HANDOVER' | 'TRANSFER' | 'RECALL';
    recipientName: string;
    recipientPosition?: string;
    recipientDepartment?: string;
    recipientPhone?: string;
    receiverId?: number;
    receiverDepartmentId?: number;
    newLocation?: string;
    newCity?: string;
    targetLocationId?: number;
    senderName?: string;
    senderDepartment?: string;
    senderId?: number;
    note?: string;
    reason?: string;
    assetIds: number[];
    autoComplete?: boolean;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const typeCode = data.type === 'HANDOVER' ? 'BBBG' : (data.type === 'RECALL' ? 'BTH' : 'BDC');
      const documentNo = await generateDocumentNo(tx, typeCode);

      const document = await tx.handoverDocument.create({
        data: {
          documentNo,
          type: data.type,
          recipientName: data.recipientName,
          recipientPosition: data.recipientPosition,
          recipientDepartment: data.recipientDepartment,
          recipientPhone: data.recipientPhone,
          receiverId: data.receiverId,
          receiverDepartmentId: data.receiverDepartmentId,
          newLocation: data.newLocation,
          newCity: data.newCity,
          targetLocationId: data.targetLocationId,
          senderName: data.senderName,
          senderDepartment: data.senderDepartment,
          senderId: data.senderId,
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
                newStatus: data.type === 'RECALL' ? 'IN_STOCK' : 'ASSIGNED'
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
              status: data.type === 'RECALL' ? 'IN_STOCK' : 'ASSIGNED',
              currentUserName: data.type === 'RECALL' ? null : data.recipientName,
              currentPosition: data.type === 'RECALL' ? null : data.recipientPosition,
              departmentName: data.type === 'RECALL' ? null : data.recipientDepartment,
              locationName: data.newLocation,
              cityName: data.newCity,
              handoverDate: data.type === 'RECALL' ? null : new Date(),
            }
          });

          // Record history
          await tx.assetAssignment.create({
            data: {
              assetId: item.assetId,
              previousUserName: oldAsset.currentUserName,
              newUserName: data.type === 'RECALL' ? 'KHO QLTS' : data.recipientName,
              newPosition: data.type === 'RECALL' ? null : data.recipientPosition,
              newDepartmentName: data.recipientDepartment,
              newLocationName: data.newLocation,
              newCityName: data.newCity,
              newStatus: data.type === 'RECALL' ? 'IN_STOCK' : 'ASSIGNED',
              effectiveAt: new Date(),
              note: `Hồ sơ ${documentNo} (${data.type === 'RECALL' ? 'Thu hồi' : 'Bàn giao'})`
            }
          });

          await AuditService.logAssetChange(item.assetId, oldAsset, updatedAsset, performedBy, tx);
        }

        // Create GeneratedDocument record for each asset involved
        const templateCode = data.type === 'TRANSFER' ? 'BM06' : (data.type === 'RECALL' ? 'BM04' : 'BM02');
        const template = await tx.documentTemplate.findUnique({ where: { templateCode } });
        
        if (template) {
          const documentType = data.type === 'TRANSFER' ? 'ASSET_TRANSFER' : (data.type === 'RECALL' ? 'ASSET_RECALL' : 'ASSET_HANDOVER');
          
          for (const assetId of data.assetIds) {
            // Generate a UNIQUE documentNo for the GeneratedDocument record itself 
            // while keeping the physical document number in the metadata if needed.
            // However, the user wants GeneratedDocument.documentNo to be unique and used as the ID.
            const docNo = await generateDocumentNo(tx, templateCode);

            await tx.generatedDocument.create({
              data: {
                documentNo: docNo,
                templateId: template.id,
                templateCode: templateCode,
                documentType: documentType,
                entityType: 'Asset',
                entityId: assetId,
                fileName: `${templateCode}_${document.documentNo.replace('/', '_')}_${assetId}.pdf`,
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

      if (!doc) throw new Error('Hồ sơ không tồn tại');
      if (doc.status === 'COMPLETED') throw new Error('Hồ sơ đã được hoàn tất trước đó');

      // Update each asset
      for (const item of doc.items) {
        const oldAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!oldAsset) continue;

        const updatedAsset = await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: doc.type === 'RECALL' ? 'IN_STOCK' : 'ASSIGNED',
            currentUserName: doc.type === 'RECALL' ? null : doc.recipientName,
            currentPosition: doc.type === 'RECALL' ? null : doc.recipientPosition,
            departmentName: doc.type === 'RECALL' ? null : doc.recipientDepartment,
            locationName: doc.newLocation,
            cityName: doc.newCity,
            handoverDate: doc.type === 'RECALL' ? null : doc.documentDate,
          }
        });

        // Record history
        await tx.assetAssignment.create({
          data: {
            assetId: item.assetId,
            previousUserName: oldAsset.currentUserName,
            newUserName: doc.type === 'RECALL' ? 'KHO QLTS' : doc.recipientName,
            newPosition: doc.type === 'RECALL' ? null : doc.recipientPosition,
            newDepartmentName: doc.recipientDepartment,
            newLocationName: doc.newLocation,
            newCityName: doc.newCity,
            newStatus: doc.type === 'RECALL' ? 'IN_STOCK' : 'ASSIGNED',
            effectiveAt: doc.documentDate,
            note: `Hồ sơ ${doc.documentNo}`
          }
        });

        await AuditService.logAssetChange(item.assetId, oldAsset, updatedAsset, performedBy, tx);
      }

      // Update document status
      const updatedDoc = await tx.handoverDocument.update({
        where: { id },
        data: { 
          status: 'COMPLETED',
          confirmedAt: new Date()
        }
      });

      // Create GeneratedDocument record for each asset involved
      const templateCode = doc.type === 'TRANSFER' ? 'BM06' : (doc.type === 'RECALL' ? 'BM04' : 'BM02');
      const template = await tx.documentTemplate.findUnique({ where: { templateCode } });
      
      if (template) {
        const documentType = doc.type === 'TRANSFER' ? 'ASSET_TRANSFER' : (doc.type === 'RECALL' ? 'ASSET_RECALL' : 'ASSET_HANDOVER');
        
        for (const item of doc.items) {
          const docNo = await generateDocumentNo(tx, templateCode);

          await tx.generatedDocument.create({
            data: {
              documentNo: docNo,
              templateId: template.id,
              templateCode: templateCode,
              documentType: documentType,
              entityType: 'Asset',
              entityId: item.assetId,
              fileName: `${templateCode}_${doc.documentNo.replace('/', '_')}_${item.assetId}.pdf`,
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

  static async cancelHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({ where: { id } });
      if (!doc) throw new Error('Hồ sơ không tồn tại');
      if (doc.status === 'COMPLETED') throw new Error('Không thể hủy hồ sơ đã hoàn tất');
      if (doc.status === 'CANCELLED') throw new Error('Hồ sơ đã được hủy trước đó');

      const updatedDoc = await tx.handoverDocument.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: id,
        action: 'CANCEL',
        details: { documentNo: doc.documentNo },
        performedBy,
        tx
      });

      return updatedDoc;
    });
  }

  static async getHandoverList(params: {
    type?: string;
    status?: string;
    search?: string;
    receiverId?: number;
    departmentId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { 
      type, 
      status, 
      search, 
      receiverId, 
      departmentId, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 50 
    } = params;

    const where: any = {};
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;
    if (receiverId) where.receiverId = receiverId;
    if (departmentId) where.receiverDepartmentId = departmentId;
    
    if (search) {
      where.OR = [
        { documentNo: { contains: search } },
        { recipientName: { contains: search } },
        { recipientDepartment: { contains: search } },
        { items: { some: { assetCode: { contains: search } } } },
        { items: { some: { assetName: { contains: search } } } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.handoverDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } }
      }),
      prisma.handoverDocument.count({ where })
    ]);

    return { items, total, page, limit };
  }

  static async getHandoverDetail(id: number) {
    return await prisma.handoverDocument.findUnique({
      where: { id },
      include: { items: true }
    });
  }
}
