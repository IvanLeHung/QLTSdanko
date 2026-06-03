import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import { generateDocumentNo } from '../utils/document';
import { parseAndNormalizeLocation } from '../utils/location.util';

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
    senderPosition?: string;
    senderId?: number;
    note?: string;
    reason?: string;
    assetIds: number[];
    autoComplete?: boolean;
  }, performedBy: string) {
    let lastError: any;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          // Standardized prefixes: HANDOVER -> BBBG, TRANSFER -> BBDC, RECALL -> BBTH
          const typeCode = data.type === 'HANDOVER' ? 'BBBG' : (data.type === 'RECALL' ? 'BBTH' : 'BBDC');
          const documentNo = await generateDocumentNo(tx, typeCode);
          const normalizedLoc = parseAndNormalizeLocation(data.newLocation);

          if (!data.assetIds || data.assetIds.length === 0) {
            throw new Error('Vui lòng chọn ít nhất 1 tài sản.');
          }

          // 1. Validate recipient/location based on workflow type
          if ((data.type === 'HANDOVER' || data.type === 'TRANSFER') && !data.recipientName?.trim()) {
            throw new Error('Vui lòng chọn người nhận.');
          }
          if (data.type === 'RECALL' && !data.newLocation?.trim()) {
            throw new Error('Vui lòng chọn kho/vị trí nhận.');
          }

          // Check active locked assets in other active DRAFT/PENDING handovers
          const activeHandovers = await tx.handoverDocument.findMany({
            where: {
              status: { in: ['DRAFT', 'PENDING_CONFIRMATION'] }
            },
            include: { items: true }
          });
          const lockedAssetIds = new Set(activeHandovers.flatMap(h => h.items.map(item => item.assetId)));

          // Perform validation check for each asset
          for (const assetId of data.assetIds) {
            const asset = await tx.asset.findUnique({ where: { id: assetId } });
            if (!asset) throw new Error(`Tài sản ID ${assetId} không tồn tại.`);
            
            if (asset.status === 'LIQUIDATED') {
              throw new Error(`Tài sản ${asset.assetCode} đã bị thanh lý, không thể bàn giao/điều chuyển.`);
            }
            if (asset.status === 'LOST') {
              throw new Error(`Tài sản ${asset.assetCode} đã bị báo mất, không thể bàn giao.`);
            }
            if (lockedAssetIds.has(assetId)) {
              throw new Error(`Tài sản ${asset.assetCode} đang nằm trong hồ sơ chờ xác nhận khác.`);
            }

            // If asset state has changed compared to opening state
            if (data.type === 'HANDOVER' && asset.status !== 'IN_STOCK') {
              throw new Error(`Tài sản ${asset.assetCode} đã thay đổi trạng thái (Trạng thái hiện tại: ${asset.status}), không còn ở trong kho để bàn giao.`);
            }
            if (data.type === 'TRANSFER' && asset.status !== 'ASSIGNED' && asset.status !== 'IN_STOCK') {
              throw new Error(`Tài sản ${asset.assetCode} đã thay đổi trạng thái (Trạng thái hiện tại: ${asset.status}), không ở trạng thái đang sử dụng hoặc trong kho để luân chuyển.`);
            }
            if (data.type === 'RECALL' && asset.status !== 'ASSIGNED' && asset.status !== 'RETIRED' && asset.status !== 'IN_STOCK') {
              throw new Error(`Tài sản ${asset.assetCode} đã thay đổi trạng thái (Trạng thái hiện tại: ${asset.status}), không ở trạng thái đang sử dụng, đã thu hồi hoặc trong kho để thu hồi.`);
            }
          }

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
              newLocation: normalizedLoc.fullFormatted || data.newLocation,
              newCity: normalizedLoc.city || data.newCity,
              targetLocationId: data.targetLocationId,
              senderName: data.senderName,
              senderDepartment: data.senderDepartment,
              senderPosition: data.senderPosition,
              senderId: data.senderId,
              reason: data.reason,
              note: data.note,
              status: data.autoComplete ? 'COMPLETED' : 'DRAFT',
              confirmedAt: data.autoComplete ? new Date() : null,
              items: {
                create: await Promise.all(data.assetIds.map(async (id) => {
                  const asset = await tx.asset.findUnique({ where: { id } });
                  if (!asset) throw new Error(`Asset ID ${id} not found`);
                  const itemNewStatus = data.type === 'RECALL' ? 'IN_STOCK' : 
                                       (data.type === 'TRANSFER' && asset.status === 'IN_STOCK') ? 'IN_STOCK' : 'ASSIGNED';
                  return {
                    assetId: asset.id,
                    assetCode: asset.assetCode,
                    assetName: asset.assetName,
                    unit: asset.unit,
                    oldStatus: asset.status,
                    newStatus: itemNewStatus
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

              const isStock = item.newStatus === 'IN_STOCK';
              const updatedAsset = await tx.asset.update({
                where: { id: item.assetId },
                data: {
                  status: item.newStatus || 'ASSIGNED',
                  currentUserName: isStock ? null : data.recipientName,
                  currentPosition: isStock ? null : data.recipientPosition,
                  departmentName: data.type === 'RECALL' ? null : data.recipientDepartment,
                  locationName: normalizedLoc.fullFormatted || data.newLocation,
                  cityName: normalizedLoc.city || data.newCity,
                  projectName: normalizedLoc.project || undefined,
                  handoverDate: isStock ? null : new Date(),
                }
              });

              // Record history
              await tx.assetAssignment.create({
                data: {
                  assetId: item.assetId,
                  previousUserName: oldAsset.currentUserName,
                  newUserName: isStock ? 'KHO QLTS' : data.recipientName,
                  newPosition: isStock ? null : data.recipientPosition,
                  newDepartmentName: data.recipientDepartment,
                  newLocationName: normalizedLoc.fullFormatted || data.newLocation,
                  newCityName: normalizedLoc.city || data.newCity,
                  newStatus: item.newStatus || 'ASSIGNED',
                  effectiveAt: new Date(),
                  note: `Hồ sơ ${documentNo} (${data.type === 'RECALL' ? 'Thu hồi' : (data.type === 'TRANSFER' ? 'Luân chuyển' : 'Bàn giao')})`
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
      } catch (error: any) {
        lastError = error;
        // P2002 is Prisma's unique constraint error code
        const isUniqueError = error.code === 'P2002' || (error.message && error.message.toLowerCase().includes('unique constraint'));
        if (!isUniqueError || attempt === 5) {
          throw error;
        }
        // Small delay before next retry
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw lastError;
  }

  static async updateHandover(id: number, data: {
    type?: 'HANDOVER' | 'TRANSFER' | 'RECALL';
    recipientName?: string;
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
    senderPosition?: string;
    senderId?: number;
    note?: string;
    reason?: string;
    assetIds?: number[];
    status?: 'DRAFT' | 'PENDING_CONFIRMATION';
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!doc) throw new Error('Hồ sơ không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Không thể sửa hồ sơ đã hoàn tất.');
      if (doc.status === 'CANCELLED') throw new Error('Không thể sửa hồ sơ đã hủy.');

      if (data.assetIds) {
        if (data.assetIds.length === 0) {
          throw new Error('Vui lòng chọn ít nhất 1 tài sản.');
        }

        const activeHandovers = await tx.handoverDocument.findMany({
          where: {
            status: { in: ['DRAFT', 'PENDING_CONFIRMATION'] },
            id: { not: id }
          },
          include: { items: true }
        });
        const lockedAssetIds = new Set(activeHandovers.flatMap(h => h.items.map(item => item.assetId)));

        for (const assetId of data.assetIds) {
          const asset = await tx.asset.findUnique({ where: { id: assetId } });
          if (!asset) throw new Error(`Tài sản ID ${assetId} không tồn tại.`);
          if (asset.status === 'LIQUIDATED') {
            throw new Error(`Tài sản ${asset.assetCode} đã bị thanh lý, không thể bàn giao.`);
          }
          if (asset.status === 'LOST') {
            throw new Error(`Tài sản ${asset.assetCode} đã bị báo mất, không thể bàn giao.`);
          }
          if (lockedAssetIds.has(assetId)) {
            throw new Error(`Tài sản ${asset.assetCode} đang nằm trong hồ sơ chờ xác nhận khác.`);
          }
        }

        // Delete existing items
        await tx.handoverItem.deleteMany({
          where: { handoverDocumentId: id }
        });
      }

      const normalizedLoc = data.newLocation ? parseAndNormalizeLocation(data.newLocation) : null;
      const updated = await tx.handoverDocument.update({
        where: { id },
        data: {
          type: data.type,
          status: data.status,
          recipientName: data.recipientName,
          recipientPosition: data.recipientPosition,
          recipientDepartment: data.recipientDepartment,
          recipientPhone: data.recipientPhone,
          receiverId: data.receiverId,
          receiverDepartmentId: data.receiverDepartmentId,
          newLocation: normalizedLoc ? (normalizedLoc.fullFormatted || data.newLocation) : data.newLocation,
          newCity: normalizedLoc ? (normalizedLoc.city || data.newCity) : data.newCity,
          targetLocationId: data.targetLocationId,
          senderName: data.senderName,
          senderDepartment: data.senderDepartment,
          senderPosition: data.senderPosition,
          senderId: data.senderId,
          reason: data.reason,
          note: data.note,
          items: data.assetIds ? {
            create: await Promise.all(data.assetIds.map(async (aid) => {
              const asset = await tx.asset.findUnique({ where: { id: aid } });
              if (!asset) throw new Error(`Asset ID ${aid} not found`);
              const itemNewStatus = (data.type || doc.type) === 'RECALL' ? 'IN_STOCK' : 
                                   ((data.type || doc.type) === 'TRANSFER' && asset.status === 'IN_STOCK') ? 'IN_STOCK' : 'ASSIGNED';
              return {
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.assetName,
                unit: asset.unit,
                oldStatus: asset.status,
                newStatus: itemNewStatus
              };
            }))
          } : undefined
        },
        include: { items: true }
      });

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: id,
        action: 'UPDATE',
        details: { documentNo: doc.documentNo, assetCount: data.assetIds?.length || doc.items.length, status: data.status },
        performedBy,
        tx
      });

      return updated;
    }, { timeout: 30000 });
  }

  static async completeHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!doc) throw new Error('Hồ sơ không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Hồ sơ đã được hoàn tất trước đó.');
      if (doc.status === 'CANCELLED') throw new Error('Không thể hoàn tất hồ sơ đã hủy.');

      // Perform validation check for each asset at confirmation time
      const activeHandovers = await tx.handoverDocument.findMany({
        where: {
          status: { in: ['DRAFT', 'PENDING_CONFIRMATION'] },
          id: { not: id }
        },
        include: { items: true }
      });
      const lockedAssetIds = new Set(activeHandovers.flatMap(h => h.items.map(item => item.assetId)));

      for (const item of doc.items) {
        const asset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!asset) throw new Error(`Tài sản ${item.assetCode} không tồn tại.`);
        if (asset.status === 'LIQUIDATED') {
          throw new Error(`Tài sản ${item.assetCode} đã bị thanh lý tại thời điểm xác nhận.`);
        }
        if (asset.status === 'LOST') {
          throw new Error(`Tài sản ${item.assetCode} đã bị báo mất tại thời điểm xác nhận.`);
        }
        if (lockedAssetIds.has(item.assetId)) {
          throw new Error(`Tài sản ${item.assetCode} đang nằm trong hồ sơ chờ xác nhận khác.`);
        }
      }

      const normalizedLoc = parseAndNormalizeLocation(doc.newLocation);
      // Update each asset
      for (const item of doc.items) {
        const oldAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!oldAsset) continue;

        const isStock = item.newStatus === 'IN_STOCK';
        const updatedAsset = await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: item.newStatus || 'ASSIGNED',
            currentUserName: isStock ? null : doc.recipientName,
            currentPosition: isStock ? null : doc.recipientPosition,
            departmentName: doc.type === 'RECALL' ? null : doc.recipientDepartment,
            locationName: normalizedLoc.fullFormatted || doc.newLocation,
            cityName: normalizedLoc.city || doc.newCity,
            projectName: normalizedLoc.project || undefined,
            handoverDate: isStock ? null : doc.documentDate,
          }
        });

        // Record history
        await tx.assetAssignment.create({
          data: {
            assetId: item.assetId,
            previousUserName: oldAsset.currentUserName,
            newUserName: isStock ? 'KHO QLTS' : doc.recipientName,
            newPosition: isStock ? null : doc.recipientPosition,
            newDepartmentName: doc.recipientDepartment,
            newLocationName: normalizedLoc.fullFormatted || doc.newLocation,
            newCityName: normalizedLoc.city || doc.newCity,
            newStatus: item.newStatus || 'ASSIGNED',
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
      if (!doc) throw new Error('Hồ sơ không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Không thể hủy hồ sơ đã hoàn tất.');
      if (doc.status === 'CANCELLED') throw new Error('Hồ sơ đã được hủy trước đó.');

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

  static async bulkCancelHandovers(ids: number[], performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const id of ids) {
        const doc = await tx.handoverDocument.findUnique({ where: { id } });
        if (!doc) throw new Error(`Hồ sơ ID ${id} không tồn tại.`);
        if (doc.status === 'COMPLETED') throw new Error(`Hồ sơ ${doc.documentNo} đã hoàn tất, không thể hủy.`);
        if (doc.status === 'CANCELLED') continue;

        const updated = await tx.handoverDocument.update({
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
          details: { documentNo: doc.documentNo, isBulk: true },
          performedBy,
          tx
        });

        results.push(updated);
      }
      return results;
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
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    scopeWhere?: any;
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
      limit = 50,
      sortBy,
      sortOrder,
      scopeWhere
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
        { senderName: { contains: search } },
        { items: { some: { assetCode: { contains: search } } } },
        { items: { some: { assetName: { contains: search } } } },
      ];
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        // Inclusively filter by full date up to 23:59:59.999
        where.createdAt.lte = new Date(toDate + 'T23:59:59.999Z');
      }
    }

    if (scopeWhere && Object.keys(scopeWhere).length > 0) {
      if (scopeWhere.id === -1) {
        return { items: [], total: 0, page, limit };
      }
      
      if (!where.AND) where.AND = [];
      where.AND.push(scopeWhere);
    }

    const skip = (page - 1) * limit;

    // Define Sorting configuration
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'itemCount') {
        orderBy = { items: { _count: order } };
      } else {
        orderBy = { [sortBy]: order };
      }
    }

    const [items, total] = await Promise.all([
      prisma.handoverDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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

  static async exportHandovers(ids?: number[]): Promise<string> {
    const where: any = {};
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const documents = await prisma.handoverDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    const rows = [
      ['Mã hồ sơ', 'Loại hồ sơ', 'Người giao', 'Người nhận', 'Bộ phận nhận', 'Số lượng tài sản', 'Ngày tạo', 'Ngày xác nhận', 'Trạng thái', 'Ghi chú']
    ];

    for (const doc of documents) {
      const typeText = doc.type === 'HANDOVER' ? 'Bàn giao' : (doc.type === 'TRANSFER' ? 'Điều chuyển' : 'Thu hồi');
      const statusText = doc.status === 'COMPLETED' ? 'Hoàn tất' : (doc.status === 'CANCELLED' ? 'Đã hủy' : (doc.status === 'DRAFT' ? 'Nháp' : 'Chờ xác nhận'));
      const createdAtText = new Date(doc.createdAt).toLocaleDateString('vi-VN');
      const confirmedAtText = doc.confirmedAt ? new Date(doc.confirmedAt).toLocaleDateString('vi-VN') : '---';
      
      rows.push([
        doc.documentNo,
        typeText,
        doc.senderName || '---',
        doc.recipientName,
        doc.recipientDepartment || '---',
        doc.items.length.toString(),
        createdAtText,
        confirmedAtText,
        statusText,
        doc.note || '---'
      ]);
    }

    // Convert array of arrays to CSV with UTF-8 BOM representation
    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    return csvContent;
  }
}
