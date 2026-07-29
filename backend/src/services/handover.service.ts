import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import { generateDocumentNo } from '../utils/document';
import { normalizeDepartmentName, parseAndNormalizeLocation } from '../utils/location.util';

type HandoverType = 'HANDOVER' | 'TRANSFER' | 'RECALL';

const RECALLABLE_ASSET_STATUSES = new Set(['ASSIGNED', 'RETIRED', 'IN_STOCK', 'DAMAGED']);

const getHandoverItemNewStatus = (type: HandoverType, currentStatus: string) => {
  if (type === 'RECALL') {
    return currentStatus === 'DAMAGED' ? 'DAMAGED' : 'IN_STOCK';
  }
  if (type === 'TRANSFER' && currentStatus === 'IN_STOCK') return 'IN_STOCK';
  return 'ASSIGNED';
};

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
          const normalizedRecipientDepartment = normalizeDepartmentName(
            data.recipientDepartment,
            normalizedLoc.city || data.newCity,
            normalizedLoc.project
          );
          const normalizedSenderDepartment = normalizeDepartmentName(data.senderDepartment);

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
            if (data.type === 'RECALL' && !RECALLABLE_ASSET_STATUSES.has(asset.status)) {
              throw new Error(`Tài sản ${asset.assetCode} đã thay đổi trạng thái (Trạng thái hiện tại: ${asset.status}), không thuộc trạng thái được phép thu hồi.`);
            }
          }

          const document = await tx.handoverDocument.create({
            data: {
              documentNo,
              type: data.type,
              recipientName: data.recipientName,
              recipientPosition: data.recipientPosition,
              recipientDepartment: normalizedRecipientDepartment || null,
              recipientPhone: data.recipientPhone,
              receiverId: data.receiverId,
              receiverDepartmentId: data.receiverDepartmentId,
              newLocation: normalizedLoc.fullFormatted || data.newLocation,
              newCity: normalizedLoc.city || data.newCity,
              targetLocationId: data.targetLocationId,
              senderName: data.senderName,
              senderDepartment: normalizedSenderDepartment || null,
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
                  const itemNewStatus = getHandoverItemNewStatus(data.type, asset.status);
                  return {
                    assetId: asset.id,
                    assetCode: asset.assetCode,
                    assetName: asset.assetName,
                    unit: asset.unit,
                    oldStatus: asset.status,
                    newStatus: itemNewStatus,
                    oldUserName: asset.currentUserName,
                    oldUserPhone: asset.currentUserPhone,
                    oldPosition: asset.currentPosition,
                    oldDepartmentName: asset.departmentName,
                    oldLocationName: asset.locationName,
                    oldCityName: asset.cityName,
                    oldProjectName: asset.projectName,
                    oldHandoverDate: asset.handoverDate,
                    snapshotCapturedAt: new Date()
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

              const isRecall = data.type === 'RECALL';
              const isWarehouseReturn = isRecall || item.newStatus === 'IN_STOCK';
              const updatedAsset = await tx.asset.update({
                where: { id: item.assetId },
                data: {
                  status: item.newStatus || 'ASSIGNED',
                  currentUserName: isWarehouseReturn ? null : data.recipientName,
                  currentUserPhone: isWarehouseReturn ? null : data.recipientPhone,
                  currentPosition: isWarehouseReturn ? null : data.recipientPosition,
                  departmentName: data.type === 'RECALL' ? null : normalizedRecipientDepartment,
                  locationName: normalizedLoc.fullFormatted || data.newLocation,
                  cityName: normalizedLoc.city || data.newCity,
                  projectName: normalizedLoc.project || undefined,
                  handoverDate: isWarehouseReturn ? null : new Date(),
                }
              });

              // Record history
              await tx.assetAssignment.create({
                data: {
                  assetId: item.assetId,
                  previousUserName: oldAsset.currentUserName,
                  newUserName: isWarehouseReturn ? 'KHO QLTS' : data.recipientName,
                  newPosition: isWarehouseReturn ? null : data.recipientPosition,
                  newDepartmentName: normalizedRecipientDepartment || null,
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
      if (doc.status === 'REVERSED') throw new Error('Không thể sửa hồ sơ đã hoàn tác.');

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
          const nextType = (data.type || doc.type) as HandoverType;
          if (nextType === 'RECALL' && !RECALLABLE_ASSET_STATUSES.has(asset.status)) {
            throw new Error(`Tài sản ${asset.assetCode} đang ở trạng thái ${asset.status}, không thuộc trạng thái được phép thu hồi.`);
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
              const itemNewStatus = getHandoverItemNewStatus((data.type || doc.type) as HandoverType, asset.status);
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
      if (doc.status === 'REVERSED') throw new Error('Không thể hoàn tất hồ sơ đã hoàn tác.');

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
        if (doc.type === 'RECALL' && !RECALLABLE_ASSET_STATUSES.has(asset.status)) {
          throw new Error(`Tài sản ${item.assetCode} đang ở trạng thái ${asset.status}, không thuộc trạng thái được phép thu hồi.`);
        }
      }

      const normalizedLoc = parseAndNormalizeLocation(doc.newLocation);
      const normalizedRecipientDepartment = normalizeDepartmentName(
        doc.recipientDepartment,
        normalizedLoc.city || doc.newCity,
        normalizedLoc.project
      );
      // Update each asset
      for (const item of doc.items) {
        const oldAsset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!oldAsset) continue;

        const finalStatus = getHandoverItemNewStatus(doc.type as HandoverType, oldAsset.status);
        const isRecall = doc.type === 'RECALL';
        const isWarehouseReturn = isRecall || finalStatus === 'IN_STOCK';
        await tx.handoverItem.update({
          where: { id: item.id },
          data: {
            oldStatus: oldAsset.status,
            newStatus: finalStatus,
            oldUserName: oldAsset.currentUserName,
            oldUserPhone: oldAsset.currentUserPhone,
            oldPosition: oldAsset.currentPosition,
            oldDepartmentName: oldAsset.departmentName,
            oldLocationName: oldAsset.locationName,
            oldCityName: oldAsset.cityName,
            oldProjectName: oldAsset.projectName,
            oldHandoverDate: oldAsset.handoverDate,
            snapshotCapturedAt: new Date()
          }
        });
        const updatedAsset = await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: finalStatus,
            currentUserName: isWarehouseReturn ? null : doc.recipientName,
            currentUserPhone: isWarehouseReturn ? null : doc.recipientPhone,
            currentPosition: isWarehouseReturn ? null : doc.recipientPosition,
            departmentName: doc.type === 'RECALL' ? null : normalizedRecipientDepartment,
            locationName: normalizedLoc.fullFormatted || doc.newLocation,
            cityName: normalizedLoc.city || doc.newCity,
            projectName: normalizedLoc.project || undefined,
            handoverDate: isWarehouseReturn ? null : doc.documentDate,
          }
        });

        // Record history
        await tx.assetAssignment.create({
          data: {
            assetId: item.assetId,
            previousUserName: oldAsset.currentUserName,
            newUserName: isWarehouseReturn ? 'KHO QLTS' : doc.recipientName,
            newPosition: isWarehouseReturn ? null : doc.recipientPosition,
            newDepartmentName: normalizedRecipientDepartment || null,
            newLocationName: normalizedLoc.fullFormatted || doc.newLocation,
            newCityName: normalizedLoc.city || doc.newCity,
            newStatus: finalStatus,
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

  static async reverseHandover(id: number, reason: string, performedBy: string) {
    const cleanReason = String(reason || '').trim();
    if (!cleanReason) throw new Error('Vui lòng nhập lý do hoàn tác.');

    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!doc) throw new Error('Hồ sơ không tồn tại.');
      if (doc.status === 'REVERSED') throw new Error('Hồ sơ đã được hoàn tác trước đó.');
      if (doc.status !== 'COMPLETED') throw new Error('Chỉ có thể hoàn tác hồ sơ đã hoàn tất.');

      const confirmedAt = doc.confirmedAt || doc.createdAt;
      const normalizedLocation = parseAndNormalizeLocation(doc.newLocation);
      const expectedLocation = normalizedLocation.fullFormatted || doc.newLocation || null;
      const expectedDepartment = doc.type === 'RECALL'
        ? null
        : normalizeDepartmentName(
            doc.recipientDepartment,
            normalizedLocation.city || doc.newCity,
            normalizedLocation.project
          ) || null;

      for (const item of doc.items) {
        const laterDocument = await tx.handoverDocument.findFirst({
          where: {
            id: { not: id },
            status: 'COMPLETED',
            confirmedAt: { gt: confirmedAt },
            items: { some: { assetId: item.assetId } }
          },
          select: { documentNo: true }
        });
        if (laterDocument) {
          throw new Error(
            `Tài sản ${item.assetCode} đã phát sinh hồ sơ ${laterDocument.documentNo} sau giao dịch này, không thể hoàn tác.`
          );
        }

        const asset = await tx.asset.findUnique({ where: { id: item.assetId } });
        if (!asset) throw new Error(`Tài sản ${item.assetCode} không còn tồn tại.`);

        const isWarehouseReturn = doc.type === 'RECALL' || item.newStatus === 'IN_STOCK';
        const expectedUser = isWarehouseReturn ? null : doc.recipientName;
        const expectedPhone = isWarehouseReturn ? null : doc.recipientPhone;
        const expectedPosition = isWarehouseReturn ? null : doc.recipientPosition;
        const expectedCity = normalizedLocation.city || doc.newCity || null;
        const expectedProject = normalizedLocation.project || item.oldProjectName || null;
        const sameText = (left: unknown, right: unknown) => String(left || '').trim() === String(right || '').trim();
        if (
          asset.status !== item.newStatus
          || !sameText(asset.currentUserName, expectedUser)
          || !sameText(asset.currentUserPhone, expectedPhone)
          || !sameText(asset.currentPosition, expectedPosition)
          || !sameText(asset.departmentName, expectedDepartment)
          || !sameText(asset.locationName, expectedLocation)
          || !sameText(asset.cityName, expectedCity)
          || (expectedProject !== null && !sameText(asset.projectName, expectedProject))
        ) {
          throw new Error(
            `Tài sản ${item.assetCode} đã thay đổi sau khi hồ sơ hoàn tất. Vui lòng kiểm tra lịch sử trước khi hoàn tác.`
          );
        }

        const windowStart = new Date(confirmedAt.getTime() - 5 * 60 * 1000);
        const windowEnd = new Date(confirmedAt.getTime() + 5 * 60 * 1000);
        const auditLogs = await tx.auditLog.findMany({
          where: {
            entityType: 'ASSET',
            entityId: item.assetId,
            action: 'UPDATE',
            createdAt: { gte: windowStart, lte: windowEnd }
          },
          orderBy: { createdAt: 'desc' }
        });
        const matchingAudit = auditLogs.find((log) => {
          try {
            const details = log.details ? JSON.parse(log.details) : {};
            const changes = details?.changes || {};
            return (!changes.status || changes.status.new === item.newStatus)
              && (!changes.locationName || sameText(changes.locationName.new, expectedLocation));
          } catch {
            return false;
          }
        });
        let changes: Record<string, { old: any; new: any }> = {};
        try {
          changes = matchingAudit?.details
            ? (JSON.parse(matchingAudit.details)?.changes || {})
            : {};
        } catch {
          changes = {};
        }
        const hasStoredSnapshot = Boolean(item.snapshotCapturedAt);
        if (!hasStoredSnapshot && !matchingAudit) {
          throw new Error(
            `Hồ sơ cũ ${doc.documentNo} không có đủ ảnh chụp dữ liệu trước giao dịch cho tài sản ${item.assetCode}, không thể hoàn tác tự động.`
          );
        }

        const assignmentForDocument = await tx.assetAssignment.findFirst({
          where: {
            assetId: item.assetId,
            note: { contains: doc.documentNo }
          },
          orderBy: { createdAt: 'desc' }
        });
        const previousAssignment = assignmentForDocument
          ? await tx.assetAssignment.findFirst({
              where: {
                assetId: item.assetId,
                createdAt: { lt: assignmentForDocument.createdAt }
              },
              orderBy: { createdAt: 'desc' }
            })
          : null;

        const auditOld = (field: string, fallback: any) => (
          Object.prototype.hasOwnProperty.call(changes, field) ? changes[field].old ?? null : fallback
        );
        const oldUserName = hasStoredSnapshot
          ? item.oldUserName
          : auditOld(
              'currentUserName',
              assignmentForDocument?.previousUserName ?? previousAssignment?.newUserName ?? null
            );
        const oldPosition = hasStoredSnapshot
          ? item.oldPosition
          : auditOld('currentPosition', previousAssignment?.newPosition ?? null);
        const oldDepartmentName = hasStoredSnapshot
          ? item.oldDepartmentName
          : auditOld('departmentName', previousAssignment?.newDepartmentName ?? null);
        const oldLocationName = hasStoredSnapshot
          ? item.oldLocationName
          : auditOld('locationName', previousAssignment?.newLocationName ?? null);
        const oldCityName = hasStoredSnapshot
          ? item.oldCityName
          : auditOld('cityName', previousAssignment?.newCityName ?? null);
        const parsedOldLocation = parseAndNormalizeLocation(oldLocationName);
        const oldProjectName = hasStoredSnapshot
          ? item.oldProjectName
          : parsedOldLocation.project || null;
        const oldUser = oldUserName
          ? await tx.user.findFirst({ where: { fullName: oldUserName }, select: { phone: true } })
          : null;
        const oldUserPhone = hasStoredSnapshot ? item.oldUserPhone : oldUser?.phone ?? null;
        const oldStatus = hasStoredSnapshot
          ? item.oldStatus || 'IN_STOCK'
          : auditOld('status', item.oldStatus ?? previousAssignment?.newStatus ?? 'IN_STOCK');
        const oldHandoverDate = hasStoredSnapshot
          ? item.oldHandoverDate
          : (oldUserName ? previousAssignment?.effectiveAt : null) ?? null;

        const restoredAsset = await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: oldStatus,
            currentUserName: oldUserName,
            currentUserPhone: oldUserPhone,
            currentPosition: oldPosition,
            departmentName: oldDepartmentName,
            locationName: oldLocationName,
            cityName: oldCityName,
            projectName: oldProjectName,
            handoverDate: oldHandoverDate
          }
        });

        await tx.assetAssignment.create({
          data: {
            assetId: item.assetId,
            previousUserName: asset.currentUserName,
            newUserName: oldUserName || 'KHO QLTS',
            newPosition: oldPosition,
            newDepartmentName: oldDepartmentName,
            newLocationName: oldLocationName,
            newCityName: oldCityName,
            newStatus: oldStatus,
            effectiveAt: new Date(),
            note: `Hoàn tác hồ sơ ${doc.documentNo}: ${cleanReason}`
          }
        });

        await AuditService.logAssetChange(
          item.assetId,
          asset,
          restoredAsset,
          performedBy,
          tx,
          `Hoàn tác hồ sơ ${doc.documentNo}: ${cleanReason}`
        );
      }

      await tx.generatedDocument.updateMany({
        where: {
          fileUrl: `/handover/${doc.id}/pdf`,
          status: 'COMPLETED'
        },
        data: { status: 'CANCELLED' }
      });

      const reversedDocument = await tx.handoverDocument.update({
        where: { id },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedBy: performedBy,
          reversalReason: cleanReason
        },
        include: { items: true }
      });

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: id,
        action: 'UNDO',
        details: {
          documentNo: doc.documentNo,
          reason: cleanReason,
          assetCount: doc.items.length
        },
        performedBy,
        tx
      });

      return reversedDocument;
    }, { timeout: 60000, isolationLevel: 'Serializable' });
  }

  static async cancelHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.handoverDocument.findUnique({ where: { id } });
      if (!doc) throw new Error('Hồ sơ không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Không thể hủy hồ sơ đã hoàn tất.');
      if (doc.status === 'CANCELLED') throw new Error('Hồ sơ đã được hủy trước đó.');
      if (doc.status === 'REVERSED') throw new Error('Hồ sơ đã được hoàn tác trước đó.');

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
        if (doc.status === 'REVERSED') continue;

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
      const statusText = doc.status === 'COMPLETED'
        ? 'Hoàn tất'
        : doc.status === 'REVERSED'
          ? 'Đã hoàn tác'
          : doc.status === 'CANCELLED'
            ? 'Đã hủy'
            : doc.status === 'DRAFT'
              ? 'Nháp'
              : 'Chờ xác nhận';
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
