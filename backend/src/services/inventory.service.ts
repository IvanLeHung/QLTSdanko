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
      
      // If company scope is set
      if (data.scopeType === 'COMPANY' && data.scopeValue) {
        where.companyCode = data.scopeValue;
      } 
      // If department scope is set
      else if (data.scopeType === 'DEPARTMENT') {
        const companyCode = data.note && data.note.startsWith("COMPANY:") ? data.note.split(":")[1] : undefined; // we will pass companyCode in note or we can search for companyCode in req body if passed. Let's see if we can parse companyCode from data. Let's look at frontend payload.
        if (companyCode) {
          where.companyCode = companyCode;
        }

        if (data.scopeValue) {
          // Can be multiple department names separated by commas
          const depts = data.scopeValue.split(',').map(d => d.trim()).filter(Boolean);
          if (depts.length > 0) {
            where.departmentName = { in: depts };
          }
        }
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
        sessions: {
          orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
          include: { _count: { select: { details: true } } }
        },
        items: {
          include: {
            asset: {
              select: {
                assetName: true,
                currentUserName: true,
                departmentName: true,
                locationName: true,
                serialNumber: true,
                companyName: true,
                purchasePriceExVat: true
              }
            }
          }
        }
      }
    });
  }

  static async getInventorySessions(inventoryCheckId: number) {
    return await prisma.inventorySession.findMany({
      where: { inventoryCheckId },
      orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { details: true } }, details: true }
    });
  }

  static buildQueryFromFilters(filters: any) {
    const where: any = { isDeleted: false };
    if (!filters) return where;

    // Company
    if (filters.companyNames && Array.isArray(filters.companyNames) && filters.companyNames.length > 0) {
      where.companyName = { in: filters.companyNames };
    }

    // City
    if (filters.cityNames && Array.isArray(filters.cityNames) && filters.cityNames.length > 0) {
      where.cityName = { in: filters.cityNames };
    }

    // Project
    if (filters.projectNames && Array.isArray(filters.projectNames) && filters.projectNames.length > 0) {
      where.projectName = { in: filters.projectNames };
    }

    // Location
    if (filters.locationNames && Array.isArray(filters.locationNames) && filters.locationNames.length > 0) {
      where.locationName = { in: filters.locationNames };
    }

    // Department
    if (filters.departmentNames && Array.isArray(filters.departmentNames) && filters.departmentNames.length > 0) {
      where.departmentName = { in: filters.departmentNames };
    }

    // User
    if (filters.currentUserNames && Array.isArray(filters.currentUserNames) && filters.currentUserNames.length > 0) {
      where.currentUserName = { in: filters.currentUserNames };
    }

    // Asset Categories / Groups (Level 1, 2, 3)
    if (filters.level1Names && Array.isArray(filters.level1Names) && filters.level1Names.length > 0) {
      where.level1Name = { in: filters.level1Names };
    }
    if (filters.level2Names && Array.isArray(filters.level2Names) && filters.level2Names.length > 0) {
      where.level2Name = { in: filters.level2Names };
    }
    if (filters.level3Names && Array.isArray(filters.level3Names) && filters.level3Names.length > 0) {
      where.level3Name = { in: filters.level3Names };
    }

    // Status
    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    // Advanced checks:
    // Serial number
    if (filters.hasSerial !== undefined && filters.hasSerial !== null) {
      if (filters.hasSerial === true || filters.hasSerial === 'true') {
        where.serialNumber = { not: null, notIn: [''] };
      } else if (filters.hasSerial === false || filters.hasSerial === 'false') {
        where.OR = [
          { serialNumber: null },
          { serialNumber: '' }
        ];
      }
    }

    // Invoice
    if (filters.hasInvoice !== undefined && filters.hasInvoice !== null) {
      if (filters.hasInvoice === true || filters.hasInvoice === 'true') {
        where.invoiceBatchId = { not: null };
      } else if (filters.hasInvoice === false || filters.hasInvoice === 'false') {
        where.invoiceBatchId = null;
      }
    }

    // Code
    if (filters.hasCode !== undefined && filters.hasCode !== null) {
      if (filters.hasCode === true || filters.hasCode === 'true') {
        where.assetCode = { not: null, notIn: [''] };
      } else if (filters.hasCode === false || filters.hasCode === 'false') {
        where.OR = [
          { assetCode: null },
          { assetCode: '' }
        ];
      }
    }

    return where;
  }

  static async previewInventoryVisitAssets(filters: any) {
    const where = this.buildQueryFromFilters(filters);
    const assets = await prisma.asset.findMany({
      where,
      select: {
        id: true,
        assetCode: true,
        assetName: true,
        departmentName: true,
        projectName: true,
        locationName: true,
        level1Name: true
      }
    });

    const total = assets.length;

    // Breakdown by Department
    const departmentBreakdown: Record<string, number> = {};
    // Breakdown by Project
    const projectBreakdown: Record<string, number> = {};
    // Breakdown by Location
    const locationBreakdown: Record<string, number> = {};
    // Breakdown by Category (level1Name)
    const categoryBreakdown: Record<string, number> = {};

    assets.forEach(asset => {
      const dept = asset.departmentName || 'Chưa phân phòng ban';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

      const proj = asset.projectName || 'Không thuộc dự án';
      projectBreakdown[proj] = (projectBreakdown[proj] || 0) + 1;

      const loc = asset.locationName || 'Trong kho / Chưa rõ vị trí';
      locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;

      const cat = asset.level1Name || 'Khác';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    return {
      total,
      departmentBreakdown,
      projectBreakdown,
      locationBreakdown,
      categoryBreakdown
    };
  }

  static async createInventoryVisit(inventoryCheckId: number, data: any) {
    const where = this.buildQueryFromFilters(data.filters);
    const assets = await prisma.asset.findMany({ where, orderBy: { assetCode: 'asc' } });
    const assetCountPlan = assets.length;

    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.create({
        data: {
          inventoryCheckId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
          companyName: data.companyName || null,
          projectName: data.projectName || null,
          departmentName: data.departmentName || null,
          locationName: data.locationName || null,
          checkerName: data.checkerName || null,
          representativeName: data.representativeName || null,
          assetCountPlan,
          note: data.note || null,
          status: 'PENDING'
        }
      });

      // Save filter info
      if (data.filters) {
        await tx.inventorySessionFilter.create({
          data: {
            sessionId: session.id,
            filterJson: JSON.stringify(data.filters)
          }
        });
      }

      // Generate the session inventory details list immediately (SessionAssets)
      if (assets.length > 0) {
        await tx.inventoryDetail.createMany({
          data: assets.map((asset) => ({
            sessionId: session.id,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            serialNumber: asset.serialNumber || null,
            bookUserName: asset.currentUserName || null,
            actualUserName: asset.currentUserName || null,
            bookDepartmentName: asset.departmentName || null,
            actualDepartmentName: asset.departmentName || null,
            bookLocationName: asset.locationName || null,
            actualLocationName: asset.locationName || null,
            resultStatus: 'MATCH'
          }))
        });
      }

      return session;
    });
  }

  static async startInventoryVisit(sessionId: number) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.findUnique({ where: { id: sessionId }, include: { details: true } });
      if (!session) throw new Error('Không tìm thấy phiên kiểm kê tài sản.');

      if (session.details.length === 0) {
        const where = this.buildAssetInventoryScopeWhere(session.departmentName || undefined, session.locationName || undefined);
        const assets = await tx.asset.findMany({ where, orderBy: { assetCode: 'asc' } });
        if (assets.length > 0) {
          await tx.inventoryDetail.createMany({
            data: assets.map((asset) => ({
              sessionId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              assetName: asset.assetName,
              serialNumber: asset.serialNumber || null,
              bookUserName: asset.currentUserName || null,
              actualUserName: asset.currentUserName || null,
              bookDepartmentName: asset.departmentName || null,
              actualDepartmentName: asset.departmentName || null,
              bookLocationName: asset.locationName || null,
              actualLocationName: asset.locationName || null,
              resultStatus: 'MATCH'
            }))
          });
        }

        await tx.inventorySession.update({ where: { id: sessionId }, data: { assetCountPlan: assets.length } });
      }

      await tx.inventoryCheck.update({ where: { id: session.inventoryCheckId }, data: { status: 'IN_PROGRESS' } });
      return await tx.inventorySession.update({
        where: { id: sessionId },
        data: { status: 'IN_PROGRESS' },
        include: { details: { include: { asset: true } } }
      });
    });
  }

  static async getInventoryVisitDetail(sessionId: number) {
    const session = await prisma.inventorySession.findUnique({
      where: { id: sessionId },
      include: { inventoryCheck: true, details: { include: { asset: true }, orderBy: { id: 'asc' } } }
    });
    if (!session) throw new Error('Không tìm thấy phiên kiểm kê tài sản.');
    return session;
  }

  static async updateInventoryVisitDetail(detailId: number, data: any, checkedBy: string) {
    const detail = await prisma.inventoryDetail.findUnique({ where: { id: detailId }, include: { session: true } });
    if (!detail) throw new Error('Không tìm thấy dòng kiểm kê tài sản.');
    if (detail.session.status === 'COMPLETED') throw new Error('Phiên kiểm kê đã chốt, không thể sửa.');

    const resultStatus = data.resultStatus || this.resolveInventoryResultStatus({
      bookUserName: detail.bookUserName,
      actualUserName: data.actualUserName,
      bookLocationName: detail.bookLocationName,
      actualLocationName: data.actualLocationName,
      condition: data.condition
    });

    const updated = await prisma.inventoryDetail.update({
      where: { id: detailId },
      data: {
        actualUserName: data.actualUserName ?? detail.actualUserName,
        actualDepartmentName: data.actualDepartmentName ?? detail.actualDepartmentName,
        actualLocationName: data.actualLocationName ?? detail.actualLocationName,
        resultStatus,
        note: data.note ?? detail.note,
        imageUrl: data.imageUrl ?? detail.imageUrl,
        checkedAt: new Date()
      }
    });

    if (updated.assetId) {
      await prisma.asset.update({
        where: { id: updated.assetId },
        data: { lastInventoryDate: new Date(), lastInventoryStatus: resultStatus }
      });
      await AuditService.log({
        entityType: 'ASSET',
        entityId: updated.assetId,
        action: 'UPDATE',
        details: { sessionId: detail.sessionId, resultStatus, checkedBy },
        performedBy: checkedBy
      });
    }

    return updated;
  }

  static async addExtraInventoryVisitAsset(sessionId: number, data: any) {
    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Không tìm thấy phiên kiểm kê tài sản.');
    if (session.status === 'COMPLETED') throw new Error('Phiên kiểm kê đã chốt, không thể thêm.');

    return await prisma.inventoryDetail.create({
      data: {
        sessionId,
        assetId: null,
        assetCode: null,
        assetName: data.assetName || data.name,
        serialNumber: data.serialNumber || null,
        actualUserName: data.actualUserName || null,
        actualDepartmentName: data.actualDepartmentName || session.departmentName || null,
        actualLocationName: data.actualLocationName || session.locationName || null,
        resultStatus: 'EXTRA',
        note: data.note || 'Tài sản phát sinh ngoài sổ, chờ xác minh nguồn gốc',
        imageUrl: data.imageUrl || null,
        checkedAt: new Date()
      }
    });
  }

  static async completeInventoryVisit(sessionId: number) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { details: true }
      });

      const remaining = await tx.inventorySession.count({
        where: { inventoryCheckId: session.inventoryCheckId, status: { not: 'COMPLETED' } }
      });
      if (remaining === 0) {
        await tx.inventoryCheck.update({ where: { id: session.inventoryCheckId }, data: { status: 'COMPLETED' } });
      }

      return session;
    });
  }

  static async deleteInventoryVisit(sessionId: number) {
    return await prisma.$transaction(async (tx) => {
      await tx.inventoryDetail.deleteMany({ where: { sessionId } });
      await tx.inventorySessionFilter.deleteMany({ where: { sessionId } });
      return await tx.inventorySession.delete({ where: { id: sessionId } });
    });
  }

  static async getInventoryVisitReport(sessionId: number) {
    const session = await this.getInventoryVisitDetail(sessionId);
    const details = session.details || [];
    const matched = details.filter((d: any) => d.resultStatus === 'MATCH').length;
    return {
      title: `BIÊN BẢN KIỂM KÊ ${session.departmentName || session.locationName || 'TÀI SẢN'} NGÀY ${session.scheduledDate.toLocaleDateString('vi-VN')}`,
      session,
      summary: {
        bookTotal: details.filter((d: any) => d.resultStatus !== 'EXTRA').length,
        actualTotal: details.filter((d: any) => d.resultStatus !== 'MISSING').length,
        matched,
        deviations: details.length - matched
      },
      deviations: details.filter((d: any) => d.resultStatus !== 'MATCH'),
      signatures: ['Đại diện phòng ban', 'Người kiểm kê', 'Trưởng HCNS']
    };
  }

  private static buildAssetInventoryScopeWhere(departmentName?: string, locationName?: string) {
    const where: any = { isDeleted: false };
    const or: any[] = [];
    if (departmentName) or.push({ departmentName });
    if (locationName) or.push({ locationName: { contains: locationName } });
    if (or.length > 0) where.OR = or;
    return where;
  }

  private static resolveInventoryResultStatus(data: any) {
    if (data.condition === 'MISSING') return 'MISSING';
    if (data.condition === 'DAMAGED') return 'DAMAGED';
    if (data.bookUserName && data.actualUserName && data.bookUserName !== data.actualUserName) return 'WRONG_USER';
    if (data.bookLocationName && data.actualLocationName && data.bookLocationName !== data.actualLocationName) return 'WRONG_LOCATION';
    return 'MATCH';
  }

  static async submitItemCheck(itemId: number, data: {
    actualStatus: string;
    actualLocation?: string;
    quality: string;
    note?: string;
    checkedBy: string;
    photos?: string[];
    actualUserName?: string;
    actualUserId?: number;
    actualSerialNumber?: string;
    checkCondition?: string;
    physicalDetailsJson?: string;
    technicalSpecsJson?: string;
    checkStatus?: string;
  }) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { asset: true }
    });
    if (!item) throw new Error("Không tìm thấy mục kiểm kê");

    // Dynamic result determination
    let result = 'MATCHED';
    if (data.checkCondition === 'MISSING' || data.actualStatus === 'LOST' || data.quality === 'LOST' || data.quality === 'MISSING') {
      result = 'MISSING';
    } else if (data.quality === 'DAMAGED' || data.quality === 'BAD' || data.actualStatus === 'DAMAGED') {
      result = 'DAMAGED';
    } else if (data.actualLocation && item.expectedLocation && data.actualLocation !== item.expectedLocation) {
      result = 'WRONG_LOCATION';
    } else if (data.actualStatus !== item.expectedStatus) {
      result = 'WRONG_STATUS';
    } else if (data.actualUserName && item.asset.currentUserName && data.actualUserName !== item.asset.currentUserName) {
      result = 'WRONG_USER';
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
          checkStatus: data.checkStatus || 'CHECKED',
          checkedAt: new Date(),
          checkedBy: data.checkedBy,
          actualUserName: data.actualUserName || null,
          actualUserId: data.actualUserId || null,
          actualSerialNumber: data.actualSerialNumber || null,
          checkCondition: data.checkCondition || 'FOUND',
          physicalDetailsJson: data.physicalDetailsJson || null
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

      // Update last inventory info on the Asset master record
      const assetUpdates: any = {
        lastInventoryDate: new Date(),
        lastInventoryStatus: result
      };

      if (data.technicalSpecsJson) {
        assetUpdates.technicalSpecsJson = data.technicalSpecsJson;
      }

      await tx.asset.update({
        where: { id: item.assetId },
        data: assetUpdates
      });

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

  static async reportDiscoveredAsset(
    sessionId: number,
    data: {
      name: string;
      categoryName?: string;
      serialNumber?: string;
      foundLocationName?: string;
      foundUserName?: string;
      ownershipStatus?: string;
      photos?: string[];
      note?: string;
    },
    createdById: number
  ) {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    const tempCode = `TEMP-${year}-${random}`;

    return await prisma.discoveredAsset.create({
      data: {
        tempCode,
        name: data.name,
        categoryName: data.categoryName || null,
        serialNumber: data.serialNumber || null,
        foundLocationName: data.foundLocationName || null,
        foundUserName: data.foundUserName || null,
        ownershipStatus: data.ownershipStatus || 'UNKNOWN',
        photos: data.photos || [],
        note: data.note || null,
        status: 'PENDING_REVIEW',
        inventoryCheckId: sessionId,
        createdById
      },
      include: {
        createdBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      }
    });
  }

  static async getDiscoveredAssets(sessionId: number) {
    return await prisma.discoveredAsset.findMany({
      where: { inventoryCheckId: sessionId },
      include: {
        createdBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async reviewDiscoveredAsset(
    discoveredId: number,
    data: {
      status: 'APPROVED' | 'REJECTED' | 'MERGED';
      assetId?: number;
      companyId?: number;
      cat4Id?: number;
      departmentName?: string;
      locationName?: string;
      cityName?: string;
      projectName?: string;
      currentUserName?: string;
      note?: string;
      purchasePriceExVat?: number;
      purchaseDate?: string | Date;
      serialNumber?: string;
      assetName?: string;
      technicalSpecsJson?: string;
    },
    performedBy: string
  ) {
    const discovered = await prisma.discoveredAsset.findUnique({
      where: { id: discoveredId }
    });
    if (!discovered) throw new Error("Không tìm thấy tài sản ghi nhận ngoài sổ");
    if (discovered.status !== 'PENDING_REVIEW') {
      throw new Error(`Tài sản ngoài sổ đã được xử lý với trạng thái: ${discovered.status}`);
    }

    const { AssetService } = require('./asset.service');

    if (data.status === 'REJECTED') {
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.discoveredAsset.update({
          where: { id: discoveredId },
          data: { status: 'REJECTED', note: data.note || discovered.note }
        });
        await AuditService.log({
          entityType: 'DISCOVERED_ASSET',
          entityId: discoveredId,
          action: 'UPDATE',
          details: { status: 'REJECTED', note: data.note },
          performedBy,
          tx
        });
        return updated;
      });
    }

    if (data.status === 'MERGED') {
      if (!data.assetId) throw new Error("Vui lòng chọn tài sản cần ghép mã");
      return await prisma.$transaction(async (tx) => {
        const asset = await tx.asset.findUnique({ where: { id: Number(data.assetId) } });
        if (!asset) throw new Error("Không tìm thấy tài sản đích để ghép");

        const assetUpdates: any = {
          lastInventoryDate: new Date(),
          lastInventoryStatus: 'MATCHED'
        };

        if (data.locationName) assetUpdates.locationName = data.locationName;
        if (data.cityName) assetUpdates.cityName = data.cityName;
        if (data.projectName) assetUpdates.projectName = data.projectName;
        if (data.currentUserName) assetUpdates.currentUserName = data.currentUserName;
        if (data.serialNumber) assetUpdates.serialNumber = data.serialNumber;
        if (data.technicalSpecsJson) assetUpdates.technicalSpecsJson = data.technicalSpecsJson;

        const updatedAsset = await tx.asset.update({
          where: { id: asset.id },
          data: assetUpdates
        });

        await AuditService.logAssetChange(asset.id, asset, updatedAsset, performedBy, tx, `Ghép mã tài sản ngoài sổ ${discovered.tempCode}`);

        const updatedDiscovered = await tx.discoveredAsset.update({
          where: { id: discoveredId },
          data: {
            status: 'MERGED',
            note: `${data.note || ''} (Đã ghép vào tài sản ${asset.assetCode})`.trim()
          }
        });

        return updatedDiscovered;
      });
    }

    if (data.status === 'APPROVED') {
      if (!data.companyId || !data.cat4Id) {
        throw new Error("Vui lòng cung cấp Công ty và Phân loại tài sản cấp 4 để tạo tài sản mới");
      }

      return await prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({ where: { id: Number(data.companyId) } });
        if (!company) throw new Error("Không tìm thấy công ty được chọn");

        const cat4 = await tx.assetCategory.findUnique({ where: { id: Number(data.cat4Id) } });
        if (!cat4 || cat4.level !== 4) throw new Error("Phân loại tài sản cấp 4 không hợp lệ");

        const cat3 = await tx.assetCategory.findUnique({ where: { id: cat4.parentId || 0 } });
        if (!cat3) throw new Error("Không tìm thấy phân loại cấp 3 cha");

        const cat2 = await tx.assetCategory.findUnique({ where: { id: cat3.parentId || 0 } });
        if (!cat2) throw new Error("Không tìm thấy phân loại cấp 2 cha");

        const cat1 = await tx.assetCategory.findUnique({ where: { id: cat2.parentId || 0 } });
        if (!cat1) throw new Error("Không tìm thấy phân loại cấp 1 cha");

        const codeGen = await AssetService.generateSingleAssetCode({
          companyCode: company.code,
          level1Code: cat1.code,
          level2Code: cat2.code,
          level3Code: cat3.code,
          level4Code: cat4.code
        }, tx);

        const assetName = data.assetName || discovered.name;
        const serialNumber = data.serialNumber || discovered.serialNumber || null;

        const newAsset = await tx.asset.create({
          data: {
            assetCode: codeGen.assetCode,
            assetName,
            assetNameShort: AssetService.generateShortName(assetName),
            assetNameShortSource: 'RULE',
            assetNameShortUpdatedAt: new Date(),
            serialNumber,
            companyCode: company.code,
            companyName: company.name,
            level1Code: cat1.code,
            level1Name: cat1.name,
            level2Code: cat2.code,
            level2Name: cat2.name,
            level3Code: cat3.code,
            level3Name: cat3.name,
            level4Code: cat4.code,
            level4Name: cat4.name,
            runningNo: codeGen.runningNo,
            runningNoText: codeGen.runningNoText,
            status: data.currentUserName || discovered.foundUserName ? 'ASSIGNED' : 'IN_STOCK',
            unit: 'Cái',
            purchasePriceExVat: data.purchasePriceExVat || 0,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            currentUserName: data.currentUserName || discovered.foundUserName || null,
            locationName: data.locationName || discovered.foundLocationName || null,
            cityName: data.cityName || null,
            projectName: data.projectName || null,
            departmentName: data.departmentName || null,
            lastInventoryDate: new Date(),
            lastInventoryStatus: 'MATCHED',
            technicalSpecsJson: data.technicalSpecsJson || null,
            documentNote: `Tạo từ tài sản ngoài sổ trong đợt kiểm kê. Mã tạm: ${discovered.tempCode}`
          }
        });

        await AuditService.log({
          entityType: 'ASSET',
          entityId: newAsset.id,
          action: 'CREATE',
          details: { code: newAsset.assetCode, name: newAsset.assetName, method: 'DISCOVERED_APPROVAL', tempCode: discovered.tempCode },
          performedBy,
          tx
        });

        const updatedDiscovered = await tx.discoveredAsset.update({
          where: { id: discoveredId },
          data: {
            status: 'APPROVED',
            note: `${data.note || ''} (Đã duyệt thành tài sản chính thức ${newAsset.assetCode})`.trim()
          }
        });

        return updatedDiscovered;
      });
    }

    throw new Error("Trạng thái xử lý không hợp lệ");
  }
}
