import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

const normalizeText = (value: any) => String(value || '').trim();

const normalizeInspectionMembers = (members: any) => {
  if (!Array.isArray(members)) return [];
  return members
    .map((member) => {
      if (typeof member === 'string') {
        return { userId: null, fullName: normalizeText(member), position: null };
      }
      return {
        userId: member?.userId ? Number(member.userId) : null,
        fullName: normalizeText(member?.fullName || member?.name),
        position: normalizeText(member?.position) || null
      };
    })
    .filter((member) => member.fullName);
};

const normalizeDepartmentRepresentatives = (representatives: any) => {
  if (!Array.isArray(representatives)) return [];
  return representatives
    .map((rep) => ({
      departmentId: rep?.departmentId ? Number(rep.departmentId) : null,
      departmentName: normalizeText(rep?.departmentName),
      representativeUserId: rep?.representativeUserId ? Number(rep.representativeUserId) : null,
      representativeName: normalizeText(rep?.representativeName),
      position: normalizeText(rep?.position) || null,
      isManual: Boolean(rep?.isManual)
    }))
    .filter((rep) => rep.departmentName || rep.representativeName);
};

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
    assetIds?: number[];
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

      if (data.scopeType === 'SELECTED') {
        const assetIds = Array.from(new Set(
          (data.assetIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)
        ));
        if (assetIds.length === 0) {
          throw new Error('Vui lòng chọn ít nhất một tài sản để kiểm kê.');
        }
        where.id = { in: assetIds };
      }
      
      // If company scope is set
      else if (data.scopeType === 'COMPANY' && data.scopeValue) {
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
            expectedCity: asset.cityName,
            expectedProject: asset.projectName,
            expectedDepartment: asset.departmentName,
            expectedUserName: asset.currentUserName,
            expectedSerialNumber: asset.serialNumber,
            expectedLocation: asset.locationName || 'Trong kho',
            bookQuantity: 1,
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
                cityName: true,
                projectName: true,
                purchasePriceExVat: true
              }
            }
          }
        }
      }
    });
  }

  static async getInventoryCountSheet(id: number) {
    const inventory = await prisma.inventoryCheck.findUnique({ where: { id } });
    if (!inventory) return null;
    const items = await prisma.inventoryItem.findMany({
      where: { inventoryCheckId: id },
      orderBy: [{ checkedAt: 'desc' }, { id: 'desc' }],
      distinct: ['assetId'],
      include: {
        asset: {
          select: {
            assetName: true,
            currentUserName: true,
            departmentName: true,
            locationName: true,
            serialNumber: true,
            cityName: true,
            projectName: true
          }
        }
      }
    });
    return { ...inventory, items };
  }

  static async addAssetsToCountSheet(inventoryCheckId: number, assetIds: number[], performedBy: string) {
    const uniqueIds = Array.from(new Set(
      assetIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    ));
    if (uniqueIds.length === 0) throw new Error('Không có tài sản hợp lệ để thêm vào đợt kiểm kê.');

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryCheck.findUnique({ where: { id: inventoryCheckId } });
      if (!inventory || !['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(inventory.status)) {
        throw new Error('Đợt kiểm kê không tồn tại hoặc đã được chốt.');
      }

      const assets = await tx.asset.findMany({
        where: { id: { in: uniqueIds }, isDeleted: false }
      });
      const existingItems = await tx.inventoryItem.findMany({
        where: { inventoryCheckId, assetId: { in: assets.map((asset) => asset.id) } },
        select: { assetId: true }
      });
      const existingAssetIds = new Set(existingItems.map((item) => item.assetId));
      const newAssets = assets.filter((asset) => !existingAssetIds.has(asset.id));
      const result = newAssets.length > 0
        ? await tx.inventoryItem.createMany({
            data: newAssets.map((asset) => ({
              inventoryCheckId,
              assetId: asset.id,
              assetCode: asset.assetCode,
              expectedStatus: asset.status,
              expectedCity: asset.cityName,
              expectedProject: asset.projectName,
              expectedDepartment: asset.departmentName,
              expectedUserName: asset.currentUserName,
              expectedSerialNumber: asset.serialNumber,
              expectedLocation: asset.locationName || 'Trong kho',
              bookQuantity: 1,
              checkStatus: 'PENDING'
            }))
          })
        : { count: 0 };

      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: inventoryCheckId,
        action: 'UPDATE',
        details: { action: 'ADD_COUNT_SHEET_ASSETS', requested: uniqueIds.length, added: result.count },
        performedBy,
        tx
      });

      return { added: result.count };
    });
  }

  static async saveCountSheetRows(
    inventoryCheckId: number,
    rows: Array<{ itemId: number; actualQuantity: number; quality?: string; note?: string }>,
    performedBy: string
  ) {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('Không có dòng kiểm kê để lưu.');
    if (rows.length > 500) throw new Error('Mỗi lần chỉ được lưu tối đa 500 dòng kiểm kê.');

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryCheck.findUnique({ where: { id: inventoryCheckId } });
      if (!inventory || !['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(inventory.status)) {
        throw new Error('Đợt kiểm kê không tồn tại hoặc đã được chốt.');
      }

      const itemIds = rows.map((row) => Number(row.itemId));
      const items = await tx.inventoryItem.findMany({
        where: { id: { in: itemIds }, inventoryCheckId },
        include: { asset: true }
      });
      const itemById = new Map(items.map((item) => [item.id, item]));
      const checkedAt = new Date();
      const updatedItems = [];

      for (const row of rows) {
        const item = itemById.get(Number(row.itemId));
        if (!item) throw new Error(`Dòng kiểm kê ${row.itemId} không thuộc đợt này.`);

        const actualQuantity = Number(row.actualQuantity);
        if (![0, 1].includes(actualQuantity)) throw new Error('Số lượng thực tế chỉ được nhập 0 hoặc 1.');

        const quality = actualQuantity === 0 ? 'MISSING' : String(row.quality || 'GOOD');
        const note = String(row.note || '').trim();
        if ((actualQuantity === 0 || quality !== 'GOOD') && !note) {
          throw new Error(`Tài sản ${item.assetCode}: cần nhập ghi chú khi thiếu hoặc tình trạng không tốt.`);
        }

        const result = actualQuantity === 0
          ? 'MISSING'
          : quality === 'GOOD' ? 'MATCHED' : 'DAMAGED';
        const updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            actualQuantity,
            actualStatus: item.expectedStatus,
            actualLocation: item.expectedLocation,
            quality,
            note,
            result,
            checkStatus: 'CHECKED',
            checkCondition: actualQuantity === 0 ? 'MISSING' : 'FOUND',
            checkedAt,
            checkedBy: performedBy
          }
        });
        updatedItems.push(updated);

        await tx.asset.update({
          where: { id: item.assetId },
          data: { lastInventoryDate: checkedAt, lastInventoryStatus: result }
        });
      }

      if (inventory.status !== 'IN_PROGRESS') {
        await tx.inventoryCheck.update({ where: { id: inventoryCheckId }, data: { status: 'IN_PROGRESS' } });
      }
      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: inventoryCheckId,
        action: 'UPDATE',
        details: { action: 'SAVE_COUNT_SHEET', count: updatedItems.length },
        performedBy,
        tx
      });
      return updatedItems;
    }, { timeout: 30000 });
  }

  static async finalizeCountSheet(inventoryCheckId: number, performedBy: string) {
    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryCheck.findUnique({ where: { id: inventoryCheckId } });
      if (!inventory || !['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(inventory.status)) {
        throw new Error('Đợt kiểm kê không tồn tại hoặc đã được chốt.');
      }

      const unchecked = await tx.inventoryItem.findMany({
        where: { inventoryCheckId, actualQuantity: null },
        select: { id: true, assetId: true }
      });
      const completedAt = new Date();
      if (unchecked.length > 0) {
        await tx.inventoryItem.updateMany({
          where: { id: { in: unchecked.map((item) => item.id) } },
          data: {
            actualQuantity: 0,
            quality: 'MISSING',
            result: 'MISSING',
            note: 'Không ghi nhận được tài sản khi chốt đợt kiểm kê.',
            checkStatus: 'CHECKED',
            checkCondition: 'MISSING',
            checkedAt: completedAt,
            checkedBy: performedBy
          }
        });
        await tx.asset.updateMany({
          where: { id: { in: unchecked.map((item) => item.assetId) } },
          data: { lastInventoryDate: completedAt, lastInventoryStatus: 'MISSING' }
        });
      }

      const updatedInventory = await tx.inventoryCheck.update({
        where: { id: inventoryCheckId },
        data: { status: 'COMPLETED' }
      });
      await AuditService.log({
        entityType: 'INVENTORY',
        entityId: inventoryCheckId,
        action: 'UPDATE',
        details: { status: 'COMPLETED', uncheckedMarkedMissing: unchecked.length },
        performedBy,
        tx
      });
      return { inventory: updatedInventory, uncheckedMarkedMissing: unchecked.length };
    }, { timeout: 30000 });
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
    const andClauses: any[] = [];
    const cleanList = (value: any) => Array.isArray(value)
      ? value.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const textContainsAny = (field: string, values: string[]) => values.map((value) => ({
      [field]: { contains: value, mode: 'insensitive' }
    }));

    // Company
    const companyNames = cleanList(filters.companyNames);
    if (companyNames.length > 0) {
      andClauses.push({ OR: textContainsAny('companyName', companyNames) });
    }

    // City
    const cityNames = cleanList(filters.cityNames);
    if (cityNames.length > 0) {
      andClauses.push({
        OR: [
          ...textContainsAny('cityName', cityNames),
          ...textContainsAny('locationName', cityNames)
        ]
      });
    }

    // Project
    const projectNames = cleanList(filters.projectNames);
    if (projectNames.length > 0) {
      andClauses.push({
        OR: [
          ...textContainsAny('projectName', projectNames),
          ...textContainsAny('locationName', projectNames)
        ]
      });
    }

    // Location
    const locationNames = cleanList(filters.locationNames);
    if (locationNames.length > 0) {
      andClauses.push({ OR: textContainsAny('locationName', locationNames) });
    }

    // Department
    const departmentNames = cleanList(filters.departmentNames);
    if (departmentNames.length > 0) {
      andClauses.push({ OR: textContainsAny('departmentName', departmentNames) });
    }

    // User
    const currentUserNames = cleanList(filters.currentUserNames);
    if (currentUserNames.length > 0) {
      andClauses.push({ OR: textContainsAny('currentUserName', currentUserNames) });
    }

    // Asset Categories / Groups (Level 1, 2, 3)
    const level1Names = cleanList(filters.level1Names);
    if (level1Names.length > 0) {
      where.level1Name = { in: level1Names };
    }
    const level2Names = cleanList(filters.level2Names);
    if (level2Names.length > 0) {
      where.level2Name = { in: level2Names };
    }
    const level3Names = cleanList(filters.level3Names);
    if (level3Names.length > 0) {
      where.level3Name = { in: level3Names };
    }

    // Status
    const statuses = cleanList(filters.statuses);
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    // Advanced checks:
    // Serial number
    if (filters.hasSerial !== undefined && filters.hasSerial !== null) {
      if (filters.hasSerial === true || filters.hasSerial === 'true') {
        where.serialNumber = { not: null, notIn: [''] };
      } else if (filters.hasSerial === false || filters.hasSerial === 'false') {
        andClauses.push({ OR: [
          { serialNumber: null },
          { serialNumber: '' }
        ]});
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
        andClauses.push({ OR: [
          { assetCode: null },
          { assetCode: '' }
        ]});
      }
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
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
    const inspectionMembers = normalizeInspectionMembers(data.inspectionMembers || data.members);
    if (inspectionMembers.length === 0) {
      throw new Error('Vui lòng nhập ít nhất một thành viên đoàn kiểm kê.');
    }
    const departmentRepresentatives = normalizeDepartmentRepresentatives(data.departmentRepresentatives);
    if (departmentRepresentatives.length === 0) {
      throw new Error('Vui lòng khai báo đại diện ký biên bản cho phiên kiểm kê.');
    }
    const missingRepresentative = departmentRepresentatives.find((rep) => !rep.representativeName);
    if (missingRepresentative) {
      throw new Error(`Vui lòng chọn hoặc nhập đại diện ký biên bản cho ${missingRepresentative.departmentName || 'phòng ban kiểm kê'}.`);
    }

    const inspectionLeaderId = data.inspectionLeaderId ? Number(data.inspectionLeaderId) : null;
    const inspectionLeaderName = normalizeText(data.inspectionLeaderName || data.checkerName);
    if (!inspectionLeaderName) {
      throw new Error('Vui lòng nhập trưởng đoàn kiểm kê.');
    }
    const inspectionTeamName = normalizeText(data.inspectionTeamName || data.teamName);
    if (!inspectionTeamName) {
      throw new Error('Vui lòng nhập đội kiểm kê.');
    }
    const memberNameKeys = inspectionMembers.map((member) => member.fullName.toLowerCase());
    if (new Set(memberNameKeys).size !== memberNameKeys.length) {
      throw new Error('Thành viên đoàn kiểm kê bị trùng tên.');
    }
    if (memberNameKeys.includes(inspectionLeaderName.toLowerCase())) {
      throw new Error('Thành viên đoàn kiểm kê không được trùng với trưởng đoàn.');
    }
    const representativeName = departmentRepresentatives.length > 0
      ? departmentRepresentatives.map((rep) => `${rep.departmentName ? `${rep.departmentName}: ` : ''}${rep.representativeName}${rep.position ? ` - ${rep.position}` : ''}`).join('; ')
      : normalizeText(data.representativeName) || null;

    return await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.create({
        data: {
          inventoryCheckId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
          companyName: data.companyName || null,
          projectName: data.projectName || null,
          departmentName: data.departmentName || null,
          locationName: data.locationName || null,
          checkerName: inspectionLeaderName || null,
          representativeName,
          inspectionLeaderId,
          inspectionLeaderName: inspectionLeaderName || null,
          inspectionTeamName: inspectionTeamName || null,
          inspectionMembersJson: inspectionMembers.length > 0 ? inspectionMembers : undefined,
          departmentRepresentativesJson: departmentRepresentatives.length > 0 ? departmentRepresentatives : undefined,
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
      const session = await tx.inventorySession.findUnique({
        where: { id: sessionId },
        include: {
          filter: true,
          details: { select: { id: true } }
        }
      });
      if (!session) throw new Error('Không tìm thấy phiên kiểm kê tài sản.');

      if (session.details.length === 0) {
        let where = this.buildAssetInventoryScopeWhere(session.departmentName || undefined, session.locationName || undefined);
        if (session.filter?.filterJson) {
          try {
            where = this.buildQueryFromFilters(JSON.parse(session.filter.filterJson));
          } catch (error) {
            console.warn('Invalid inventory session filter JSON, fallback to basic scope:', error);
          }
        }
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
      await tx.inventorySession.update({
        where: { id: sessionId },
        data: { status: 'IN_PROGRESS' }
      });
    }, {
      timeout: 15000
    });

    return await prisma.inventorySession.findUnique({
      where: { id: sessionId },
      include: { details: { include: { asset: true } } }
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
    const inScopeDetails = details.filter((d: any) => d.resultStatus !== 'EXTRA');
    const checkedDetails = details.filter((d: any) => Boolean(d.checkedAt));
    const pendingDetails = checkedDetails.filter((d: any) => ['MATCH_PENDING_CONFIRM', 'NEED_REVIEW', 'ACTUAL_UPDATED'].includes(String(d.checkStatus || '').toUpperCase()));
    const surplusDetails = details.filter((d: any) => d.resultStatus === 'EXTRA' || d.outOfBookStatus === 'REGISTERED');
    const matchedDetails = checkedDetails.filter((d: any) => d.resultStatus === 'MATCH' && !pendingDetails.some((p: any) => p.id === d.id));
    const mismatchDetails = checkedDetails.filter((d: any) => d.resultStatus && !['MATCH', 'EXTRA'].includes(d.resultStatus));
    const uncheckedDetails = inScopeDetails.filter((d: any) => !d.checkedAt);
    return {
      title: `BIÊN BẢN KIỂM KÊ ${session.departmentName || session.locationName || 'TÀI SẢN'} NGÀY ${session.scheduledDate.toLocaleDateString('vi-VN')}`,
      session,
      summary: {
        totalInScope: inScopeDetails.length,
        checkedCount: checkedDetails.length,
        uncheckedCount: uncheckedDetails.length,
        pendingCount: pendingDetails.length,
        matchedCount: matchedDetails.length,
        mismatchCount: mismatchDetails.length,
        surplusCount: surplusDetails.length,
        missingCount: checkedDetails.filter((d: any) => d.resultStatus === 'MISSING').length,
        damagedCount: checkedDetails.filter((d: any) => d.resultStatus === 'DAMAGED').length,
        totalAfterCheck: inScopeDetails.length + surplusDetails.length,
        bookTotal: inScopeDetails.length,
        actualTotal: checkedDetails.length,
        matched: matchedDetails.length,
        deviations: mismatchDetails.length
      },
      checkedItems: checkedDetails,
      uncheckedItems: uncheckedDetails,
      surplusItems: surplusDetails,
      deviations: mismatchDetails,
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
