import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import { AuditParser } from '../utils/audit-parser.util';

const router = Router();

// Helper to replace SELF data scope placeholder with actual username/fullName
const replaceSelf = (whereObj: any, user: any) => {
  if (!whereObj) return whereObj;
  const str = JSON.stringify(whereObj);
  const replacedStr = str.replace(/\{\{CURRENT_USER\}\}/g, user.fullName || user.username);
  return JSON.parse(replacedStr);
};

// Helper to calculate straight-line depreciation of an asset
function calculateDepreciation(asset: { purchasePriceExVat: number | null, purchaseDate: Date | null, depreciationEndDate: Date | null }) {
  const originalValue = asset.purchasePriceExVat || 0;
  if (!originalValue) return { remainingValue: 0, depreciatedValue: 0 };
  if (!asset.purchaseDate || !asset.depreciationEndDate) {
    return { remainingValue: originalValue, depreciatedValue: 0 };
  }
  
  const purchase = new Date(asset.purchaseDate);
  const end = new Date(asset.depreciationEndDate);
  const now = new Date();
  
  const totalMonths = (end.getFullYear() - purchase.getFullYear()) * 12 + (end.getMonth() - purchase.getMonth());
  if (totalMonths <= 0) {
    return { remainingValue: 0, depreciatedValue: originalValue };
  }
  
  const elapsedMonths = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
  if (elapsedMonths <= 0) {
    return { remainingValue: originalValue, depreciatedValue: 0 };
  }
  if (elapsedMonths >= totalMonths) {
    return { remainingValue: 0, depreciatedValue: originalValue };
  }
  
  const depreciatedValue = originalValue * (elapsedMonths / totalMonths);
  const remainingValue = originalValue - depreciatedValue;
  
  return { remainingValue, depreciatedValue };
}

function cleanFilterValue(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === 'ALL' || s === 'null' || s === 'undefined') return null;
  return s;
}

// Build Asset filters combining data scope & global filters
function buildAssetWhere(req: any, ignoreDates: boolean = false) {
  const companyCode = cleanFilterValue(req.query.companyCode);
  const cityName = cleanFilterValue(req.query.cityName);
  const projectName = cleanFilterValue(req.query.projectName);
  const departmentName = cleanFilterValue(req.query.departmentName);
  const locationName = cleanFilterValue(req.query.locationName);
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [{ isDeleted: false }];

  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName',
    project: 'projectName'
  }, req.user?.departmentName);

  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      return { id: -1 };
    }
    andClauses.push(replaceSelf(scopeWhere, req.user));
  }

  if (companyCode) andClauses.push({ companyCode });
  if (cityName) andClauses.push({ cityName: { contains: cityName } });
  if (projectName) andClauses.push({ projectName: { contains: projectName } });
  if (departmentName) andClauses.push({ departmentName: { contains: departmentName } });
  if (locationName) andClauses.push({ locationName: { contains: locationName } });
  
  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return { AND: andClauses };
}

// Build Handover filters combining data scope & global filters
async function buildHandoverWhere(req: any, ignoreDates: boolean = false) {
  const companyCode = cleanFilterValue(req.query.companyCode);
  const cityName = cleanFilterValue(req.query.cityName);
  const projectName = cleanFilterValue(req.query.projectName);
  const departmentName = cleanFilterValue(req.query.departmentName);
  const locationName = cleanFilterValue(req.query.locationName);
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'recipientName',
    project: 'projectName'
  }, req.user?.departmentName);

  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      return { id: -1 };
    }
    andClauses.push(replaceSelf(scopeWhere, req.user));
  }

  if (companyCode || cityName || projectName || departmentName || locationName) {
    // Resolve matching asset IDs to query handover items by assetId since HandoverItem does not have asset relation
    const matchingAssets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        ...(companyCode && { companyCode }),
        ...(cityName && { cityName: { contains: cityName } }),
        ...(projectName && { projectName: { contains: projectName } }),
        ...(departmentName && { departmentName: { contains: departmentName } }),
        ...(locationName && { locationName: { contains: locationName } }),
      },
      select: { id: true }
    });
    const assetIds = matchingAssets.map(a => a.id);
    
    andClauses.push({
      items: {
        some: {
          assetId: { in: assetIds }
        }
      }
    });
  }

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

// Build Inventory filters combining data scope & global filters
function buildInventoryWhere(req: any, ignoreDates: boolean = false) {
  const companyCode = cleanFilterValue(req.query.companyCode);
  const cityName = cleanFilterValue(req.query.cityName);
  const projectName = cleanFilterValue(req.query.projectName);
  const departmentName = cleanFilterValue(req.query.departmentName);
  const locationName = cleanFilterValue(req.query.locationName);
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'inventoryCode',
    department: 'scopeValue',
    warehouse: 'scopeValue',
    user: 'inventoryCode',
    project: 'inventoryCode'
  }, req.user?.departmentName);

  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      return { id: -1 };
    }
    andClauses.push(replaceSelf(scopeWhere, req.user));
  }

  if (companyCode || cityName || projectName || departmentName || locationName) {
    andClauses.push({
      items: {
        some: {
          asset: {
            isDeleted: false,
            ...(companyCode && { companyCode }),
            ...(cityName && { cityName: { contains: cityName } }),
            ...(projectName && { projectName: { contains: projectName } }),
            ...(departmentName && { departmentName: { contains: departmentName } }),
            ...(locationName && { locationName: { contains: locationName } }),
          }
        }
      }
    });
  }

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

// Build Repair filters combining data scope & global filters
function buildRepairWhere(req: any, ignoreDates: boolean = false) {
  const companyCode = cleanFilterValue(req.query.companyCode);
  const cityName = cleanFilterValue(req.query.cityName);
  const projectName = cleanFilterValue(req.query.projectName);
  const departmentName = cleanFilterValue(req.query.departmentName);
  const locationName = cleanFilterValue(req.query.locationName);
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName',
    project: 'projectName'
  }, req.user?.departmentName);

  const assetClauses: any = { isDeleted: false };
  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      return { id: -1 };
    }
    Object.assign(assetClauses, replaceSelf(scopeWhere, req.user));
  }

  if (companyCode) assetClauses.companyCode = companyCode;
  if (cityName) assetClauses.cityName = { contains: cityName };
  if (projectName) assetClauses.projectName = { contains: projectName };
  if (departmentName) assetClauses.departmentName = { contains: departmentName };
  if (locationName) assetClauses.locationName = { contains: locationName };

  andClauses.push({ asset: assetClauses });

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return { AND: andClauses };
}

// GET /api/dashboard/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const assetWhere = buildAssetWhere(req, true);
    if (assetWhere.id === -1) {
      return res.json({
        totalAssets: 0,
        assigned: 0,
        inStock: 0,
        underRepair: 0,
        damaged: 0,
        lost: 0,
        liquidated: 0,
        totalValue: 0,
        remainingValue: 0,
        depreciatedValue: 0,
        lostLiquidatedValue: 0,
      });
    }

    const [
      totalAssets,
      assigned,
      inStock,
      underRepair,
      damaged,
      lost,
      liquidated,
      assetsForValues
    ] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.count({ where: { ...assetWhere, status: 'ASSIGNED' } }),
      prisma.asset.count({ where: { ...assetWhere, status: 'IN_STOCK' } }),
      prisma.asset.count({ where: { ...assetWhere, status: 'UNDER_REPAIR' } }),
      prisma.asset.count({ where: { ...assetWhere, status: { in: ['DAMAGED', 'BROKEN'] } } }),
      prisma.asset.count({ where: { ...assetWhere, status: 'LOST' } }),
      prisma.asset.count({ where: { ...assetWhere, status: { in: ['LIQUIDATED', 'DISPOSED'] } } }),
      prisma.asset.findMany({
        where: assetWhere,
        select: {
          purchasePriceExVat: true,
          purchaseDate: true,
          depreciationEndDate: true,
          status: true
        }
      })
    ]);

    // Calculate financial summary
    let totalValue = 0;
    let remainingValue = 0;
    let depreciatedValue = 0;
    let lostLiquidatedValue = 0;

    for (const asset of assetsForValues) {
      const price = asset.purchasePriceExVat || 0;
      if (['LOST', 'LIQUIDATED', 'DISPOSED'].includes(asset.status)) {
        lostLiquidatedValue += price;
      } else {
        totalValue += price;
        const dep = calculateDepreciation(asset);
        remainingValue += dep.remainingValue;
        depreciatedValue += dep.depreciatedValue;
      }
    }

    res.json({
      totalAssets,
      assigned,
      inStock,
      underRepair,
      damaged,
      lost,
      liquidated,
      totalValue,
      remainingValue,
      depreciatedValue,
      lostLiquidatedValue
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/action-items
router.get('/action-items', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasPerm = (p: string) => isSuperAdmin || userPerms.includes(p);

    const handoverWhere = await buildHandoverWhere(req, true);
    const inventoryWhere = buildInventoryWhere(req, true);
    const repairWhere = buildRepairWhere(req, true);
    const assetWhere = buildAssetWhere(req, true);

    const [
      handoverPending,
      inventoryPending,
      repairPending,
      lostPending,
      noLabelPrint
    ] = await Promise.all([
      hasPerm('TRANSFER_VIEW') && handoverWhere.id !== -1
        ? prisma.handoverDocument.count({ where: { ...handoverWhere, status: 'PENDING_CONFIRMATION' } })
        : Promise.resolve(null),

      hasPerm('INVENTORY_VIEW') && inventoryWhere.id !== -1
        ? prisma.inventoryCheck.count({ where: { ...inventoryWhere, status: 'OPEN' } })
        : Promise.resolve(null),

      hasPerm('REPAIR_VIEW') && repairWhere.id !== -1
        ? prisma.assetRepairTicket.count({ where: { ...repairWhere, status: 'OPEN' } })
        : Promise.resolve(null),

      hasPerm('REPAIR_VIEW') && assetWhere.id !== -1
        ? prisma.lostReport.count({
            where: {
              status: 'LOST',
              asset: assetWhere
            }
          })
        : Promise.resolve(null),

      hasPerm('ASSET_PRINT_LABEL') && assetWhere.id !== -1
        ? prisma.asset.count({
            where: {
              ...assetWhere,
              lastLabelPrint: null
            }
          })
        : Promise.resolve(null)
    ]);

    res.json({
      handoverPending,
      inventoryPending,
      repairPending,
      lostPending,
      noLabelPrint
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/distribution
router.get('/distribution', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasPricePerm = isSuperAdmin || userPerms.includes('ASSET_VIEW_PRICE');

    const assetWhere = buildAssetWhere(req, true);
    if (assetWhere.id === -1) {
      return res.json({ company: [], department: [], city: [], project: [], status: [] });
    }

    const [
      companyGroup,
      departmentGroup,
      cityGroup,
      projectGroup,
      statusGroup
    ] = await Promise.all([
      prisma.asset.groupBy({
        by: ['companyCode', 'companyName'],
        where: assetWhere,
        _count: { id: true },
        _sum: { purchasePriceExVat: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.asset.groupBy({
        by: ['departmentName'],
        where: assetWhere,
        _count: { id: true },
        _sum: { purchasePriceExVat: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.asset.groupBy({
        by: ['cityName'],
        where: assetWhere,
        _count: { id: true },
        _sum: { purchasePriceExVat: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.asset.groupBy({
        by: ['projectName'],
        where: assetWhere,
        _count: { id: true },
        _sum: { purchasePriceExVat: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.asset.groupBy({
        by: ['status'],
        where: assetWhere,
        _count: { id: true },
        _sum: { purchasePriceExVat: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    const formatGroup = (groups: any[], keyField: string, nameField?: string) => {
      return groups.map(g => ({
        key: g[keyField] || 'UNKNOWN',
        name: nameField ? (g[nameField] || g[keyField] || 'Không xác định') : (g[keyField] || 'Không xác định'),
        count: g._count.id,
        value: hasPricePerm ? (g._sum.purchasePriceExVat || 0) : null
      }));
    };

    const getStatusVnName = (status: string) => {
      switch (status) {
        case 'ASSIGNED': return 'Đang sử dụng';
        case 'IN_STOCK': return 'Trong kho';
        case 'UNDER_REPAIR': return 'Đang sửa chữa';
        case 'DAMAGED':
        case 'BROKEN': return 'Báo hỏng';
        case 'LOST': return 'Mất / thất thoát';
        case 'LIQUIDATED':
        case 'DISPOSED': return 'Đã thanh lý';
        default: return status;
      }
    };

    res.json({
      company: formatGroup(companyGroup, 'companyCode', 'companyName'),
      department: formatGroup(departmentGroup, 'departmentName'),
      city: formatGroup(cityGroup, 'cityName'),
      project: formatGroup(projectGroup, 'projectName'),
      status: statusGroup.map(g => ({
        key: g.status,
        name: getStatusVnName(g.status),
        count: g._count.id,
        value: hasPricePerm ? (g._sum.purchasePriceExVat || 0) : null
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/recent-activities
router.get('/recent-activities', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasAuditView = isSuperAdmin || userPerms.includes('AUDIT_LOG_VIEW');

    // Ignore dates on asset & handover scoped search list
    const assetWhere = buildAssetWhere(req, true);
    const handoverWhere = await buildHandoverWhere(req, true);

    const logWhere: any = {
      entityType: {
        in: ['ASSET', 'HANDOVER', 'INVENTORY', 'REPAIR', 'DAMAGE', 'LOST', 'LIQUIDATION']
      }
    };

    const startDate = cleanFilterValue(req.query.startDate);
    const endDate = cleanFilterValue(req.query.endDate);
    if (startDate || endDate) {
      const dateClause: any = {};
      if (startDate) dateClause.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateClause.lte = end;
      }
      logWhere.createdAt = dateClause;
    }

    if (!hasAuditView) {
      const [scopedAssets, scopedHandovers] = await Promise.all([
        assetWhere.id !== -1 ? prisma.asset.findMany({ where: assetWhere, select: { id: true } }) : Promise.resolve([]),
        handoverWhere.id !== -1 ? prisma.handoverDocument.findMany({ where: handoverWhere, select: { id: true } }) : Promise.resolve([])
      ]);

      const assetIds = scopedAssets.map(a => a.id);
      const handoverIds = scopedHandovers.map(h => h.id);

      logWhere.OR = [
        { performedBy: req.user.username },
        { entityType: 'ASSET', entityId: { in: assetIds } },
        { entityType: 'HANDOVER', entityId: { in: handoverIds } }
      ];
    } else {
      const hasFilters = cleanFilterValue(req.query.companyCode) || 
                         cleanFilterValue(req.query.cityName) || 
                         cleanFilterValue(req.query.projectName) || 
                         cleanFilterValue(req.query.departmentName) || 
                         cleanFilterValue(req.query.locationName);
      if (hasFilters) {
        const [scopedAssets, scopedHandovers] = await Promise.all([
          assetWhere.id !== -1 ? prisma.asset.findMany({ where: assetWhere, select: { id: true } }) : Promise.resolve([]),
          handoverWhere.id !== -1 ? prisma.handoverDocument.findMany({ where: handoverWhere, select: { id: true } }) : Promise.resolve([])
        ]);

        const assetIds = scopedAssets.map(a => a.id);
        const handoverIds = scopedHandovers.map(h => h.id);

        logWhere.OR = [
          { entityType: 'ASSET', entityId: { in: assetIds } },
          { entityType: 'HANDOVER', entityId: { in: handoverIds } }
        ];
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: logWhere,
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    const dataWithDesc = logs.map(log => ({
      ...log,
      description: AuditParser.buildDescription(log),
      actionVn: AuditParser.getActionName(log.action),
      entityVn: AuditParser.getEntityName(log.entityType),
    }));

    res.json(dataWithDesc);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/activity-stats helper
async function getActivityStats(req: any) {
  const start = cleanFilterValue(req.query.startDate);
  const end = cleanFilterValue(req.query.endDate);
  
  // Default to current month if no dates are provided
  let fromDate = start ? new Date(start) : undefined;
  let toDate = end ? new Date(end) : undefined;
  
  if (!fromDate || !toDate) {
    const now = new Date();
    if (!fromDate) {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (!toDate) {
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
  } else {
    toDate.setHours(23, 59, 59, 999);
  }

  // Build the scoped asset query ignoring the creation date filter, because we query creation separately
  const assetWhere = buildAssetWhere(req, true);
  if (assetWhere.id === -1) {
    return {
      createdAssets: 0,
      transferredAssets: 0,
      handedOverAssets: 0,
      recalledAssets: 0,
      brokenReportedAssets: 0,
      lostReportedAssets: 0,
      liquidatedAssets: 0
    };
  }

  // Resolve matching asset IDs to query handover items (since HandoverItem has no direct relation to Asset)
  const matchingAssets = await prisma.asset.findMany({
    where: assetWhere,
    select: { id: true }
  });
  const assetIds = matchingAssets.map(a => a.id);

  // Run counts using optimized scoped queries
  const [
    createdAssets,
    transferredAssets,
    handedOverAssets,
    recalledAssets,
    brokenReportedAssets,
    lostReportedAssets,
    liquidatedAssets
  ] = await Promise.all([
    // 1. TS tạo mới
    prisma.asset.count({
      where: {
        ...assetWhere,
        createdAt: { gte: fromDate, lte: toDate }
      }
    }),
    // 2. TS điều chuyển
    prisma.handoverItem.count({
      where: {
        handoverDocument: {
          type: 'TRANSFER',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        assetId: { in: assetIds }
      }
    }),
    // 3. TS bàn giao/cấp phát
    prisma.handoverItem.count({
      where: {
        handoverDocument: {
          type: 'HANDOVER',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        assetId: { in: assetIds }
      }
    }),
    // 4. TS thu hồi
    prisma.handoverItem.count({
      where: {
        handoverDocument: {
          type: 'RECALL',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        assetId: { in: assetIds }
      }
    }),
    // 5. TS báo hỏng
    prisma.assetRepairTicket.count({
      where: {
        reportedDate: { gte: fromDate, lte: toDate },
        asset: assetWhere
      }
    }),
    // 6. TS mất/thất thoát
    prisma.lostReport.count({
      where: {
        reportedDate: { gte: fromDate, lte: toDate },
        asset: assetWhere
      }
    }),
    // 7. TS thanh lý
    prisma.liquidationItem.count({
      where: {
        liquidationRecord: {
          status: 'COMPLETED',
          liquidationDate: { gte: fromDate, lte: toDate }
        },
        asset: assetWhere
      }
    })
  ]);

  return {
    createdAssets,
    transferredAssets,
    handedOverAssets,
    recalledAssets,
    brokenReportedAssets,
    lostReportedAssets,
    liquidatedAssets
  };
}

function buildEmptyActivityStats() {
  return {
    createdAssets: 0,
    transferredAssets: 0,
    handedOverAssets: 0,
    recalledAssets: 0,
    brokenReportedAssets: 0,
    lostReportedAssets: 0,
    liquidatedAssets: 0
  };
}

function getActivityDateRange(req: any) {
  const start = cleanFilterValue(req.query.startDate);
  const end = cleanFilterValue(req.query.endDate);

  let fromDate = start ? new Date(start) : undefined;
  let toDate = end ? new Date(end) : undefined;

  if (!fromDate || !toDate) {
    const now = new Date();
    if (!fromDate) {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (!toDate) {
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
  } else {
    toDate.setHours(23, 59, 59, 999);
  }

  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addActivityCount(
  bucket: Record<string, ReturnType<typeof buildEmptyActivityStats>>,
  date: Date | null,
  key: keyof ReturnType<typeof buildEmptyActivityStats>
) {
  if (!date) return;
  const dateKey = formatDateKey(new Date(date));
  if (!bucket[dateKey]) {
    bucket[dateKey] = buildEmptyActivityStats();
  }
  bucket[dateKey][key] += 1;
}

// GET /api/dashboard/activity-stats
router.get('/activity-stats', authenticateToken, async (req: any, res) => {
  try {
    const stats = await getActivityStats(req);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/activity-daily-stats
router.get('/activity-daily-stats', authenticateToken, async (req: any, res) => {
  try {
    const { fromDate, toDate } = getActivityDateRange(req);
    const assetWhere = buildAssetWhere(req, true);

    if (assetWhere.id === -1) {
      return res.json([]);
    }

    const matchingAssets = await prisma.asset.findMany({
      where: assetWhere,
      select: { id: true }
    });
    const assetIds = matchingAssets.map(a => a.id);

    const bucket: Record<string, ReturnType<typeof buildEmptyActivityStats>> = {};

    const [
      createdAssets,
      handoverItems,
      repairTickets,
      lostReports,
      liquidationItems
    ] = await Promise.all([
      prisma.asset.findMany({
        where: {
          ...assetWhere,
          createdAt: { gte: fromDate, lte: toDate }
        },
        select: { createdAt: true }
      }),
      prisma.handoverItem.findMany({
        where: {
          assetId: { in: assetIds },
          handoverDocument: {
            type: { in: ['HANDOVER', 'TRANSFER', 'LOCATION_TRANSFER', 'RECALL'] },
            status: 'COMPLETED',
            confirmedAt: { gte: fromDate, lte: toDate }
          }
        },
        select: {
          handoverDocument: {
            select: {
              type: true,
              confirmedAt: true
            }
          }
        }
      }),
      prisma.assetRepairTicket.findMany({
        where: {
          reportedDate: { gte: fromDate, lte: toDate },
          asset: assetWhere
        },
        select: { reportedDate: true }
      }),
      prisma.lostReport.findMany({
        where: {
          reportedDate: { gte: fromDate, lte: toDate },
          asset: assetWhere
        },
        select: { reportedDate: true }
      }),
      prisma.liquidationItem.findMany({
        where: {
          liquidationRecord: {
            status: 'COMPLETED',
            liquidationDate: { gte: fromDate, lte: toDate }
          },
          asset: assetWhere
        },
        select: {
          liquidationRecord: {
            select: { liquidationDate: true }
          }
        }
      })
    ]);

    createdAssets.forEach(asset => addActivityCount(bucket, asset.createdAt, 'createdAssets'));
    handoverItems.forEach(item => {
      const doc = item.handoverDocument;
      if (doc.type === 'HANDOVER') addActivityCount(bucket, doc.confirmedAt, 'handedOverAssets');
      if (doc.type === 'TRANSFER' || doc.type === 'LOCATION_TRANSFER') addActivityCount(bucket, doc.confirmedAt, 'transferredAssets');
      if (doc.type === 'RECALL') addActivityCount(bucket, doc.confirmedAt, 'recalledAssets');
    });
    repairTickets.forEach(ticket => addActivityCount(bucket, ticket.reportedDate, 'brokenReportedAssets'));
    lostReports.forEach(report => addActivityCount(bucket, report.reportedDate, 'lostReportedAssets'));
    liquidationItems.forEach(item => addActivityCount(bucket, item.liquidationRecord.liquidationDate, 'liquidatedAssets'));

    const result = Object.entries(bucket)
      .map(([date, stats]) => ({
        date,
        ...stats,
        total:
          stats.createdAssets +
          stats.transferredAssets +
          stats.handedOverAssets +
          stats.recalledAssets +
          stats.brokenReportedAssets +
          stats.lostReportedAssets +
          stats.liquidatedAssets
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/period-stats
router.get('/period-stats', authenticateToken, async (req: any, res) => {
  try {
    const stats = await getActivityStats(req);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/advanced-stats
router.get('/advanced-stats', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasPricePerm = isSuperAdmin || userPerms.includes('ASSET_VIEW_PRICE');

    const assetWhere = buildAssetWhere(req, true);
    if (assetWhere.id === -1) {
      return res.json({
        total: 0,
        statusCounts: {},
        unassignedCount: 0,
        cityCounts: [],
        locationCounts: [],
        missingLocationCount: 0,
        projectCounts: [],
        noProjectCount: 0,
        departmentStats: [],
        unassignedCategories: [],
        stockCategories: [],
        financials: null,
        ageGroups: { age0_1: 0, age1_3: 0, age3_5: 0, ageMoreThan5: 0, ageUnknown: 0 }
      });
    }

    // 1. Total and Status Counts
    const [total, statusGroups] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.groupBy({
        by: ['status'],
        where: assetWhere,
        _count: { id: true }
      })
    ]);

    const statusCounts: Record<string, number> = {};
    statusGroups.forEach(g => {
      statusCounts[g.status] = g._count.id;
    });

    // 2. Unassigned Count (status = IN_STOCK and currentUserName is null/empty/N/A)
    const unassignedCount = await prisma.asset.count({
      where: {
        ...assetWhere,
        status: 'IN_STOCK',
        OR: [
          { currentUserName: null },
          { currentUserName: '' },
          { currentUserName: { in: ['N/A', 'n/a'] } }
        ]
      }
    });

    // 3. City Breakdown
    const cityGroups = await prisma.asset.groupBy({
      by: ['cityName'],
      where: assetWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const cityCounts = cityGroups.map(g => ({
      name: g.cityName || 'Không xác định',
      count: g._count.id
    }));

    // 4. Location Breakdown
    const locationGroups = await prisma.asset.groupBy({
      by: ['locationName'],
      where: assetWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const locationCounts = locationGroups.map(g => ({
      name: g.locationName || 'Không xác định',
      count: g._count.id
    }));
    const missingLocationCount = await prisma.asset.count({
      where: {
        ...assetWhere,
        OR: [
          { locationName: null },
          { locationName: '' }
        ]
      }
    });

    // 5. Project Breakdown
    const projectGroups = await prisma.asset.groupBy({
      by: ['projectName'],
      where: assetWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const projectCounts = projectGroups.map(g => ({
      name: g.projectName || 'Không thuộc dự án',
      count: g._count.id
    }));
    const noProjectCount = await prisma.asset.count({
      where: {
        ...assetWhere,
        OR: [
          { projectName: null },
          { projectName: '' }
        ]
      }
    });

    // 6. Department Breakdown
    const departmentGroups = await prisma.asset.groupBy({
      by: ['departmentName'],
      where: assetWhere,
      _count: { id: true },
      _sum: { purchasePriceExVat: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const departmentStats = departmentGroups.map(g => ({
      name: g.departmentName || 'Không xác định',
      count: g._count.id,
      value: hasPricePerm ? (g._sum.purchasePriceExVat || 0) : null
    }));

    // 7. Unassigned Category Breakdown
    const unassignedCatGroups = await prisma.asset.groupBy({
      by: ['level1Name'],
      where: {
        ...assetWhere,
        status: 'IN_STOCK',
        OR: [
          { currentUserName: null },
          { currentUserName: '' },
          { currentUserName: { in: ['N/A', 'n/a'] } }
        ]
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const unassignedCategories = unassignedCatGroups.map(g => ({
      name: g.level1Name || 'Khác',
      count: g._count.id
    }));

    // 8. Stock Category Breakdown
    const stockCatGroups = await prisma.asset.groupBy({
      by: ['level1Name'],
      where: {
        ...assetWhere,
        status: 'IN_STOCK'
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const stockCategories = stockCatGroups.map(g => ({
      name: g.level1Name || 'Khác',
      count: g._count.id
    }));

    // 9. Price Breakdown
    let financials = null;
    if (hasPricePerm) {
      const [totalValueRes, assignedValueRes, stockValueRes, liquidatedValueRes] = await Promise.all([
        prisma.asset.aggregate({
          where: assetWhere,
          _sum: { purchasePriceExVat: true }
        }),
        prisma.asset.aggregate({
          where: { ...assetWhere, status: 'ASSIGNED' },
          _sum: { purchasePriceExVat: true }
        }),
        prisma.asset.aggregate({
          where: { ...assetWhere, status: 'IN_STOCK' },
          _sum: { purchasePriceExVat: true }
        }),
        prisma.asset.aggregate({
          where: { ...assetWhere, status: { in: ['LIQUIDATED', 'DISPOSED'] } },
          _sum: { purchasePriceExVat: true }
        })
      ]);
      financials = {
        totalValue: totalValueRes._sum.purchasePriceExVat || 0,
        assignedValue: assignedValueRes._sum.purchasePriceExVat || 0,
        stockValue: stockValueRes._sum.purchasePriceExVat || 0,
        liquidatedValue: liquidatedValueRes._sum.purchasePriceExVat || 0
      };
    }

    // 10. Age Breakdown (active assets)
    const ageActiveWhere = {
      ...assetWhere,
      status: { notIn: ['LIQUIDATED', 'DISPOSED', 'LOST'] }
    };
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

    const [age0_1, age1_3, age3_5, ageMoreThan5, ageUnknown] = await Promise.all([
      prisma.asset.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { gte: oneYearAgo }
        }
      }),
      prisma.asset.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: oneYearAgo, gte: threeYearsAgo }
        }
      }),
      prisma.asset.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: threeYearsAgo, gte: fiveYearsAgo }
        }
      }),
      prisma.asset.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: fiveYearsAgo }
        }
      }),
      prisma.asset.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: null
        }
      })
    ]);

    res.json({
      total,
      statusCounts,
      unassignedCount,
      cityCounts,
      locationCounts,
      missingLocationCount,
      projectCounts,
      noProjectCount,
      departmentStats,
      unassignedCategories,
      stockCategories,
      financials,
      ageGroups: {
        age0_1,
        age1_3,
        age3_5,
        ageMoreThan5,
        ageUnknown
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/drilldown/assets
router.get('/drilldown/assets', authenticateToken, async (req: any, res) => {
  try {
    const status = cleanFilterValue(req.query.status);
    const category = cleanFilterValue(req.query.category);
    const unassigned = req.query.unassigned === 'true';
    const assetWhere = buildAssetWhere(req, true);

    const finalWhere: any = { ...assetWhere };
    if (status) finalWhere.status = status;
    if (category) finalWhere.level1Name = category;
    if (unassigned) {
      finalWhere.status = 'IN_STOCK';
      finalWhere.OR = [
        { currentUserName: null },
        { currentUserName: '' },
        { currentUserName: { in: ['N/A', 'n/a'] } }
      ];
    }

    const assets = await prisma.asset.findMany({
      where: finalWhere,
      select: {
        assetCode: true,
        assetName: true,
        serialNumber: true,
        status: true,
        currentUserName: true,
        locationName: true,
        projectName: true
      },
      orderBy: { assetCode: 'asc' },
      take: 200
    });
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/drilldown/city
router.get('/drilldown/city', authenticateToken, async (req: any, res) => {
  try {
    const city = cleanFilterValue(req.query.city);
    if (!city) return res.status(400).json({ message: 'City is required' });
    const assetWhere = buildAssetWhere(req, true);

    const groupings = await prisma.asset.groupBy({
      by: ['locationName', 'level1Name'],
      where: {
        ...assetWhere,
        cityName: city
      },
      _count: { id: true }
    });

    const locationMap: Record<string, any[]> = {};
    groupings.forEach(g => {
      const loc = g.locationName || 'Không rõ vị trí';
      if (!locationMap[loc]) locationMap[loc] = [];
      locationMap[loc].push({
        category: g.level1Name || 'Khác',
        count: g._count.id
      });
    });

    const result = Object.entries(locationMap).map(([location, categories]) => ({
      location,
      categories
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/drilldown/project
router.get('/drilldown/project', authenticateToken, async (req: any, res) => {
  try {
    const project = cleanFilterValue(req.query.project);
    if (!project) return res.status(400).json({ message: 'Project is required' });
    const assetWhere = buildAssetWhere(req, true);

    const groupings = await prisma.asset.groupBy({
      by: ['level1Name'],
      where: {
        ...assetWhere,
        projectName: project
      },
      _count: { id: true }
    });

    const result = groupings.map(g => ({
      category: g.level1Name || 'Khác',
      count: g._count.id
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// --- CCDC (TOOLS & EQUIPMENT) DASHBOARD ENDPOINTS ---

// Build CCDC filters combining data scope & global filters
async function buildToolWhere(req: any, ignoreDates: boolean = false) {
  const companyCode = cleanFilterValue(req.query.companyCode);
  const cityName = cleanFilterValue(req.query.cityName);
  const projectName = cleanFilterValue(req.query.projectName);
  const departmentName = cleanFilterValue(req.query.departmentName);
  const locationName = cleanFilterValue(req.query.locationName);
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [{ isDeleted: false }];

  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyName',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName',
    project: 'projectName'
  }, req.user?.departmentName);

  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      return { id: -1 };
    }
    const replacedScope = replaceSelf(scopeWhere, req.user);
    if (replacedScope.companyName) {
      let resolvedNames: string[] = [];
      if (typeof replacedScope.companyName === 'string') {
        const comp = await prisma.company.findUnique({ where: { code: replacedScope.companyName } });
        resolvedNames = comp ? [comp.name] : [replacedScope.companyName];
        replacedScope.companyName = resolvedNames[0];
      } else if (replacedScope.companyName.in && Array.isArray(replacedScope.companyName.in)) {
        const codes = replacedScope.companyName.in;
        const comps = await prisma.company.findMany({ where: { code: { in: codes } } });
        const nameMap = new Map(comps.map(c => [c.code, c.name]));
        resolvedNames = codes.map((code: string) => nameMap.get(code) || code);
        replacedScope.companyName.in = resolvedNames;
      }
    }
    andClauses.push(replacedScope);
  }

  if (companyCode) {
    const company = await prisma.company.findUnique({ where: { code: companyCode } });
    if (company) {
      andClauses.push({ companyName: company.name });
    } else {
      andClauses.push({ companyName: companyCode });
    }
  }
  if (cityName) andClauses.push({ cityName: { contains: cityName } });
  if (projectName) andClauses.push({ projectName: { contains: projectName } });
  if (departmentName) andClauses.push({ departmentName: { contains: departmentName } });
  if (locationName) andClauses.push({ locationName: { contains: locationName } });
  
  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return { AND: andClauses };
}

// Build Tool Handover filters combining data scope & global filters
async function buildToolHandoverWhere(req: any, ignoreDates: boolean = false) {
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const toolWhere = await buildToolWhere(req, true);
  if (toolWhere.id === -1) {
    return { id: -1 };
  }

  const matchingTools = await prisma.toolEquipment.findMany({
    where: toolWhere,
    select: { id: true }
  });
  const toolIds = matchingTools.map(t => t.id);

  andClauses.push({
    items: {
      some: {
        toolId: { in: toolIds }
      }
    }
  });

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

// Build Tool Repair filters
async function buildToolRepairWhere(req: any, ignoreDates: boolean = false) {
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const toolWhere = await buildToolWhere(req, true);
  if (toolWhere.id === -1) {
    return { id: -1 };
  }

  andClauses.push({ tool: toolWhere });

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return { AND: andClauses };
}

// Build Tool Lost filters
async function buildToolLostWhere(req: any, ignoreDates: boolean = false) {
  const startDate = cleanFilterValue(req.query.startDate);
  const endDate = cleanFilterValue(req.query.endDate);

  const andClauses: any[] = [];

  const toolWhere = await buildToolWhere(req, true);
  if (toolWhere.id === -1) {
    return { id: -1 };
  }

  andClauses.push({ tool: toolWhere });

  if (!ignoreDates && (startDate || endDate)) {
    const dateClause: any = {};
    if (startDate) dateClause.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateClause.lte = end;
    }
    andClauses.push({ createdAt: dateClause });
  }

  return { AND: andClauses };
}

// GET /api/dashboard/ccdc/summary
router.get('/ccdc/summary', authenticateToken, async (req, res) => {
  try {
    const toolWhere = await buildToolWhere(req, true);
    if (toolWhere.id === -1) {
      return res.json({
        totalTools: 0,
        using: 0,
        inStock: 0,
        damaged: 0,
        lost: 0,
        liquidated: 0,
        totalValue: 0,
        totalQuantity: 0,
        totalAvailable: 0,
        totalUsing: 0,
        totalBroken: 0,
        totalRepairing: 0,
        totalLostQty: 0,
        totalDestroyed: 0,
        totalTransit: 0
      });
    }

    const [
      totalTools,
      nonQtyUsing,
      nonQtyInStock,
      nonQtyDamaged,
      nonQtyLost,
      nonQtyLiquidated,
      qtyUsing,
      qtyInStock,
      qtyDamaged,
      qtyLost,
      qtyLiquidated,
      totalValue,
      stockAggregates,
      totalQuantitySum
    ] = await Promise.all([
      prisma.toolEquipment.count({ where: toolWhere }),
      
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: { not: 'QUANTITY' }, status: 'USING' } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: { not: 'QUANTITY' }, status: 'IN_STOCK' } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: { not: 'QUANTITY' }, status: 'DAMAGED' } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: { not: 'QUANTITY' }, status: 'LOST' } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: { not: 'QUANTITY' }, status: 'LIQUIDATED' } }),

      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: 'QUANTITY', stocks: { some: { quantityUsing: { gt: 0 } } } } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: 'QUANTITY', stocks: { some: { quantityAvailable: { gt: 0 } } } } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: 'QUANTITY', stocks: { some: { OR: [{ quantityBroken: { gt: 0 } }, { quantityRepairing: { gt: 0 } }] } } } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: 'QUANTITY', stocks: { some: { quantityLost: { gt: 0 } } } } }),
      prisma.toolEquipment.count({ where: { ...toolWhere, managementType: 'QUANTITY', status: 'LIQUIDATED' } }),

      prisma.toolEquipment.aggregate({
        where: toolWhere,
        _sum: { purchasePrice: true }
      }),
      
      prisma.toolStock.aggregate({
        where: {
          tool: toolWhere
        },
        _sum: {
          quantityAvailable: true,
          quantityUsing: true,
          quantityBroken: true,
          quantityRepairing: true,
          quantityLost: true,
          quantityDestroyed: true,
          quantityTransit: true
        }
      }),
      
      prisma.toolEquipment.aggregate({
        where: { ...toolWhere, managementType: 'QUANTITY' },
        _sum: { quantity: true }
      })
    ]);

    const stockSums = stockAggregates._sum;
    const totalAvailable = stockSums.quantityAvailable || 0;
    const totalUsing = stockSums.quantityUsing || 0;
    const totalBroken = stockSums.quantityBroken || 0;
    const totalRepairing = stockSums.quantityRepairing || 0;
    const totalLostQty = stockSums.quantityLost || 0;
    const totalDestroyed = stockSums.quantityDestroyed || 0;
    const totalTransit = stockSums.quantityTransit || 0;

    const nonQtyCount = await prisma.toolEquipment.count({
      where: {
        ...toolWhere,
        managementType: { not: 'QUANTITY' }
      }
    });
    const totalQuantity = (totalQuantitySum._sum.quantity || 0) + nonQtyCount;

    const using      = nonQtyUsing      + qtyUsing;
    const inStock    = nonQtyInStock    + qtyInStock;
    const damaged    = nonQtyDamaged    + qtyDamaged;
    const lost       = nonQtyLost       + qtyLost;
    const liquidated = nonQtyLiquidated + qtyLiquidated;

    res.json({
      totalTools,
      using,
      inStock,
      damaged,
      lost,
      liquidated,
      totalValue: totalValue._sum.purchasePrice || 0,
      totalQuantity,
      totalAvailable,
      totalUsing,
      totalBroken,
      totalRepairing,
      totalLostQty,
      totalDestroyed,
      totalTransit
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/action-items
router.get('/ccdc/action-items', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasPerm = (p: string) => isSuperAdmin || userPerms.includes(p);

    const handoverWhere = await buildToolHandoverWhere(req, true);
    const repairWhere = await buildToolRepairWhere(req, true);
    const lostWhere = await buildToolLostWhere(req, true);

    const [
      handoverPending,
      inventoryPending,
      repairPending,
      lostPending
    ] = await Promise.all([
      hasPerm('TRANSFER_VIEW') && handoverWhere.id !== -1
        ? prisma.toolHandoverDocument.count({ where: { ...handoverWhere, status: 'PENDING_CONFIRMATION' } })
        : Promise.resolve(null),

      hasPerm('INVENTORY_VIEW')
        ? prisma.toolInventoryCheck.count({ where: { status: 'OPEN' } })
        : Promise.resolve(null),

      hasPerm('REPAIR_VIEW') && repairWhere.id !== -1
        ? prisma.toolRepairTicket.count({ where: { ...repairWhere, status: 'OPEN' } })
        : Promise.resolve(null),

      hasPerm('REPAIR_VIEW') && lostWhere.id !== -1
        ? prisma.toolLostReport.count({ where: { ...lostWhere, status: 'LOST' } })
        : Promise.resolve(null)
    ]);

    res.json({
      handoverPending,
      inventoryPending,
      repairPending,
      lostPending,
      noLabelPrint: null
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/activity-stats
async function getToolActivityStats(req: any) {
  const { fromDate, toDate } = getActivityDateRange(req);

  const toolWhere = await buildToolWhere(req, true);
  if (toolWhere.id === -1) {
    return buildEmptyActivityStats();
  }

  const matchingTools = await prisma.toolEquipment.findMany({
    where: toolWhere,
    select: { id: true }
  });
  const toolIds = matchingTools.map(t => t.id);

  const [
    createdAssets,
    transferredAssets,
    handedOverAssets,
    recalledAssets,
    brokenReportedAssets,
    lostReportedAssets,
    liquidatedAssets
  ] = await Promise.all([
    prisma.toolEquipment.count({
      where: {
        ...toolWhere,
        createdAt: { gte: fromDate, lte: toDate }
      }
    }),
    prisma.toolHandoverItem.count({
      where: {
        handoverDocument: {
          type: 'TRANSFER',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        toolId: { in: toolIds }
      }
    }),
    prisma.toolHandoverItem.count({
      where: {
        handoverDocument: {
          type: 'HANDOVER',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        toolId: { in: toolIds }
      }
    }),
    prisma.toolHandoverItem.count({
      where: {
        handoverDocument: {
          type: 'RECALL',
          status: 'COMPLETED',
          confirmedAt: { gte: fromDate, lte: toDate }
        },
        toolId: { in: toolIds }
      }
    }),
    prisma.toolRepairTicket.count({
      where: {
        reportedDate: { gte: fromDate, lte: toDate },
        toolId: { in: toolIds }
      }
    }),
    prisma.toolLostReport.count({
      where: {
        reportedDate: { gte: fromDate, lte: toDate },
        toolId: { in: toolIds }
      }
    }),
    prisma.toolLiquidationItem.count({
      where: {
        liquidationRecord: {
          status: 'COMPLETED',
          liquidationDate: { gte: fromDate, lte: toDate }
        },
        toolId: { in: toolIds }
      }
    })
  ]);

  return {
    createdAssets,
    transferredAssets,
    handedOverAssets,
    recalledAssets,
    brokenReportedAssets,
    lostReportedAssets,
    liquidatedAssets
  };
}

router.get('/ccdc/activity-stats', authenticateToken, async (req: any, res) => {
  try {
    const stats = await getToolActivityStats(req);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/activity-daily-stats
router.get('/ccdc/activity-daily-stats', authenticateToken, async (req: any, res) => {
  try {
    const { fromDate, toDate } = getActivityDateRange(req);
    const toolWhere = await buildToolWhere(req, true);

    if (toolWhere.id === -1) {
      return res.json([]);
    }

    const matchingTools = await prisma.toolEquipment.findMany({
      where: toolWhere,
      select: { id: true }
    });
    const toolIds = matchingTools.map(t => t.id);

    const bucket: Record<string, ReturnType<typeof buildEmptyActivityStats>> = {};

    const [
      createdTools,
      handoverItems,
      repairTickets,
      lostReports,
      liquidationItems
    ] = await Promise.all([
      prisma.toolEquipment.findMany({
        where: {
          ...toolWhere,
          createdAt: { gte: fromDate, lte: toDate }
        },
        select: { createdAt: true }
      }),
      prisma.toolHandoverItem.findMany({
        where: {
          toolId: { in: toolIds },
          handoverDocument: {
            type: { in: ['HANDOVER', 'TRANSFER', 'LOCATION_TRANSFER', 'RECALL'] },
            status: 'COMPLETED',
            confirmedAt: { gte: fromDate, lte: toDate }
          }
        },
        select: {
          handoverDocument: {
            select: {
              type: true,
              confirmedAt: true
            }
          }
        }
      }),
      prisma.toolRepairTicket.findMany({
        where: {
          reportedDate: { gte: fromDate, lte: toDate },
          toolId: { in: toolIds }
        },
        select: { reportedDate: true }
      }),
      prisma.toolLostReport.findMany({
        where: {
          reportedDate: { gte: fromDate, lte: toDate },
          toolId: { in: toolIds }
        },
        select: { reportedDate: true }
      }),
      prisma.toolLiquidationItem.findMany({
        where: {
          liquidationRecord: {
            status: 'COMPLETED',
            liquidationDate: { gte: fromDate, lte: toDate }
          },
          toolId: { in: toolIds }
        },
        select: {
          liquidationRecord: {
            select: { liquidationDate: true }
          }
        }
      })
    ]);

    createdTools.forEach(tool => addActivityCount(bucket, tool.createdAt, 'createdAssets'));
    handoverItems.forEach(item => {
      const doc = item.handoverDocument;
      if (doc.type === 'HANDOVER') addActivityCount(bucket, doc.confirmedAt, 'handedOverAssets');
      if (doc.type === 'TRANSFER' || doc.type === 'LOCATION_TRANSFER') addActivityCount(bucket, doc.confirmedAt, 'transferredAssets');
      if (doc.type === 'RECALL') addActivityCount(bucket, doc.confirmedAt, 'recalledAssets');
    });
    repairTickets.forEach(ticket => addActivityCount(bucket, ticket.reportedDate, 'brokenReportedAssets'));
    lostReports.forEach(report => addActivityCount(bucket, report.reportedDate, 'lostReportedAssets'));
    liquidationItems.forEach(item => addActivityCount(bucket, item.liquidationRecord.liquidationDate, 'liquidatedAssets'));

    const result = Object.entries(bucket)
      .map(([date, stats]) => ({
        date,
        ...stats,
        total:
          stats.createdAssets +
          stats.transferredAssets +
          stats.handedOverAssets +
          stats.recalledAssets +
          stats.brokenReportedAssets +
          stats.lostReportedAssets +
          stats.liquidatedAssets
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/recent-activities
router.get('/ccdc/recent-activities', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasAuditView = isSuperAdmin || userPerms.includes('AUDIT_LOG_VIEW');

    const toolWhere = await buildToolWhere(req, true);

    const logWhere: any = {
      entityType: {
        in: ['TOOL', 'TOOL_EQUIPMENT']
      }
    };

    const startDate = cleanFilterValue(req.query.startDate);
    const endDate = cleanFilterValue(req.query.endDate);
    if (startDate || endDate) {
      const dateClause: any = {};
      if (startDate) dateClause.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateClause.lte = end;
      }
      logWhere.createdAt = dateClause;
    }

    if (!hasAuditView) {
      const scopedTools = toolWhere.id !== -1 
        ? await prisma.toolEquipment.findMany({ where: toolWhere, select: { id: true } }) 
        : [];
      const toolIds = scopedTools.map(t => t.id);

      logWhere.OR = [
        { performedBy: req.user.username },
        { entityType: { in: ['TOOL', 'TOOL_EQUIPMENT'] }, entityId: { in: toolIds } }
      ];
    } else {
      const hasFilters = cleanFilterValue(req.query.companyCode) || 
                         cleanFilterValue(req.query.cityName) || 
                         cleanFilterValue(req.query.projectName) || 
                         cleanFilterValue(req.query.departmentName) || 
                         cleanFilterValue(req.query.locationName);
      if (hasFilters) {
        const scopedTools = toolWhere.id !== -1 
          ? await prisma.toolEquipment.findMany({ where: toolWhere, select: { id: true } }) 
          : [];
        const toolIds = scopedTools.map(t => t.id);

        logWhere.entityId = { in: toolIds };
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: logWhere,
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    const dataWithDesc = logs.map(log => ({
      ...log,
      description: AuditParser.buildDescription(log),
      actionVn: AuditParser.getActionName(log.action),
      entityVn: AuditParser.getEntityName(log.entityType),
    }));

    res.json(dataWithDesc);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/advanced-stats
router.get('/ccdc/advanced-stats', authenticateToken, async (req: any, res) => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    const hasPricePerm = isSuperAdmin || userPerms.includes('ASSET_VIEW_PRICE');

    const toolWhere = await buildToolWhere(req, true);
    if (toolWhere.id === -1) {
      return res.json({
        total: 0,
        statusCounts: {},
        unassignedCount: 0,
        cityCounts: [],
        locationCounts: [],
        missingLocationCount: 0,
        projectCounts: [],
        noProjectCount: 0,
        departmentStats: [],
        unassignedCategories: [],
        stockCategories: [],
        financials: null,
        ageGroups: { age0_1: 0, age1_3: 0, age3_5: 0, ageMoreThan5: 0, ageUnknown: 0 }
      });
    }

    const [total, statusGroups] = await Promise.all([
      prisma.toolEquipment.count({ where: toolWhere }),
      prisma.toolEquipment.groupBy({
        by: ['status'],
        where: toolWhere,
        _count: { id: true }
      })
    ]);

    const statusCounts: Record<string, number> = {};
    statusGroups.forEach(g => {
      statusCounts[g.status] = g._count.id;
    });
    if (statusCounts['USING']) {
      statusCounts['ASSIGNED'] = statusCounts['USING'];
    }

    const unassignedCount = await prisma.toolEquipment.count({
      where: {
        ...toolWhere,
        status: 'IN_STOCK',
        OR: [
          { currentUserName: null },
          { currentUserName: '' },
          { currentUserName: { in: ['N/A', 'n/a'] } }
        ]
      }
    });

    const cityGroups = await prisma.toolEquipment.groupBy({
      by: ['cityName'],
      where: toolWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const cityCounts = cityGroups.map(g => ({
      name: g.cityName || 'Không xác định',
      count: g._count.id
    }));

    const locationGroups = await prisma.toolEquipment.groupBy({
      by: ['locationName'],
      where: toolWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const locationCounts = locationGroups.map(g => ({
      name: g.locationName || 'Không xác định',
      count: g._count.id
    }));
    const missingLocationCount = await prisma.toolEquipment.count({
      where: {
        ...toolWhere,
        OR: [
          { locationName: null },
          { locationName: '' }
        ]
      }
    });

    const projectGroups = await prisma.toolEquipment.groupBy({
      by: ['projectName'],
      where: toolWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const projectCounts = projectGroups.map(g => ({
      name: g.projectName || 'Không thuộc dự án',
      count: g._count.id
    }));
    const noProjectCount = await prisma.toolEquipment.count({
      where: {
        ...toolWhere,
        OR: [
          { projectName: null },
          { projectName: '' }
        ]
      }
    });

    const departmentGroups = await prisma.toolEquipment.groupBy({
      by: ['departmentName'],
      where: toolWhere,
      _count: { id: true },
      _sum: { purchasePrice: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const departmentStats = departmentGroups.map(g => ({
      name: g.departmentName || 'Không xác định',
      count: g._count.id,
      value: hasPricePerm ? (g._sum.purchasePrice || 0) : null
    }));

    const unassignedCatGroups = await prisma.toolEquipment.groupBy({
      by: ['category'],
      where: {
        ...toolWhere,
        status: 'IN_STOCK',
        OR: [
          { currentUserName: null },
          { currentUserName: '' },
          { currentUserName: { in: ['N/A', 'n/a'] } }
        ]
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const unassignedCategories = unassignedCatGroups.map(g => ({
      name: g.category || 'Khác',
      count: g._count.id
    }));

    const stockCatGroups = await prisma.toolEquipment.groupBy({
      by: ['category'],
      where: {
        ...toolWhere,
        status: 'IN_STOCK'
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const stockCategories = stockCatGroups.map(g => ({
      name: g.category || 'Khác',
      count: g._count.id
    }));

    let financials = null;
    if (hasPricePerm) {
      const [totalValueRes, assignedValueRes, stockValueRes, liquidatedValueRes] = await Promise.all([
        prisma.toolEquipment.aggregate({
          where: toolWhere,
          _sum: { purchasePrice: true }
        }),
        prisma.toolEquipment.aggregate({
          where: { ...toolWhere, status: 'USING' },
          _sum: { purchasePrice: true }
        }),
        prisma.toolEquipment.aggregate({
          where: { ...toolWhere, status: 'IN_STOCK' },
          _sum: { purchasePrice: true }
        }),
        prisma.toolEquipment.aggregate({
          where: { ...toolWhere, status: 'LIQUIDATED' },
          _sum: { purchasePrice: true }
        })
      ]);
      financials = {
        totalValue: totalValueRes._sum.purchasePrice || 0,
        assignedValue: assignedValueRes._sum.purchasePrice || 0,
        stockValue: stockValueRes._sum.purchasePrice || 0,
        liquidatedValue: liquidatedValueRes._sum.purchasePrice || 0
      };
    }

    const ageActiveWhere = {
      ...toolWhere,
      status: { notIn: ['LIQUIDATED', 'LOST'] }
    };
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

    const [age0_1, age1_3, age3_5, ageMoreThan5, ageUnknown] = await Promise.all([
      prisma.toolEquipment.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { gte: oneYearAgo }
        }
      }),
      prisma.toolEquipment.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: oneYearAgo, gte: threeYearsAgo }
        }
      }),
      prisma.toolEquipment.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: threeYearsAgo, gte: fiveYearsAgo }
        }
      }),
      prisma.toolEquipment.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: { lt: fiveYearsAgo }
        }
      }),
      prisma.toolEquipment.count({
        where: {
          ...ageActiveWhere,
          purchaseDate: null
        }
      })
    ]);

    res.json({
      total,
      statusCounts,
      unassignedCount,
      cityCounts,
      locationCounts,
      missingLocationCount,
      projectCounts,
      noProjectCount,
      departmentStats,
      unassignedCategories,
      stockCategories,
      financials,
      ageGroups: {
        age0_1,
        age1_3,
        age3_5,
        ageMoreThan5,
        ageUnknown
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/drilldown/tools
router.get('/ccdc/drilldown/tools', authenticateToken, async (req: any, res) => {
  try {
    const status = cleanFilterValue(req.query.status);
    const category = cleanFilterValue(req.query.category);
    const unassigned = req.query.unassigned === 'true';
    const toolWhere = await buildToolWhere(req, true);

    const finalWhere: any = { ...toolWhere };
    if (status) {
      if (status === 'ASSIGNED') {
        finalWhere.status = 'USING';
      } else {
        finalWhere.status = status;
      }
    }
    if (category) finalWhere.category = category;
    if (unassigned) {
      finalWhere.status = 'IN_STOCK';
      finalWhere.OR = [
        { currentUserName: null },
        { currentUserName: '' },
        { currentUserName: { in: ['N/A', 'n/a'] } }
      ];
    }

    const tools = await prisma.toolEquipment.findMany({
      where: finalWhere,
      select: {
        toolCode: true,
        toolName: true,
        status: true,
        currentUserName: true,
        locationName: true,
        projectName: true
      },
      orderBy: { toolCode: 'asc' },
      take: 200
    });

    const mapped = tools.map((t: any) => ({
      assetCode: t.toolCode,
      assetName: t.toolName,
      serialNumber: '',
      status: t.status,
      currentUserName: t.currentUserName,
      locationName: t.locationName,
      projectName: t.projectName
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/drilldown/city
router.get('/ccdc/drilldown/city', authenticateToken, async (req: any, res) => {
  try {
    const city = cleanFilterValue(req.query.city);
    if (!city) return res.status(400).json({ message: 'City is required' });
    const toolWhere = await buildToolWhere(req, true);

    const groupings = await prisma.toolEquipment.groupBy({
      by: ['locationName', 'category'],
      where: {
        ...toolWhere,
        cityName: city
      },
      _count: { id: true }
    });

    const locationMap: Record<string, any[]> = {};
    groupings.forEach(g => {
      const loc = g.locationName || 'Không rõ vị trí';
      if (!locationMap[loc]) locationMap[loc] = [];
      locationMap[loc].push({
        category: g.category || 'Khác',
        count: g._count.id
      });
    });

    const result = Object.entries(locationMap).map(([location, categories]) => ({
      location,
      categories
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/drilldown/project
router.get('/ccdc/drilldown/project', authenticateToken, async (req: any, res) => {
  try {
    const project = cleanFilterValue(req.query.project);
    if (!project) return res.status(400).json({ message: 'Project is required' });
    const toolWhere = await buildToolWhere(req, true);

    const groupings = await prisma.toolEquipment.groupBy({
      by: ['category'],
      where: {
        ...toolWhere,
        projectName: project
      },
      _count: { id: true }
    });

    const result = groupings.map(g => ({
      category: g.category || 'Khác',
      count: g._count.id
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/dashboard/ccdc/export
router.get('/ccdc/export', authenticateToken, async (req: any, res) => {
  try {
    const toolWhere = await buildToolWhere(req, true);
    if (toolWhere.id === -1) {
      return res.status(400).json({ message: 'No tools matched' });
    }

    const tools = await prisma.toolEquipment.findMany({
      where: toolWhere,
      orderBy: { toolCode: 'asc' }
    });

    const rows = [
      ['Mã CCDC', 'Tên CCDC', 'Nhóm CCDC', 'Số lượng', 'ĐVT', 'Giá trị', 'Ngày mua', 'Nhà cung cấp', 'Người sử dụng', 'Phòng ban sử dụng', 'Vị trí/Kho', 'Tỉnh/TP', 'Dự án', 'Trạng thái', 'Ghi chú']
    ];

    const formatStatus = (s: string) => {
      switch (s) {
        case 'IN_STOCK': return 'Trong kho';
        case 'USING': return 'Đang sử dụng';
        case 'DAMAGED': return 'Báo hỏng';
        case 'LOST': return 'Mất';
        case 'LIQUIDATED': return 'Đã thanh lý';
        default: return s;
      }
    };

    for (const t of tools) {
      rows.push([
        t.toolCode,
        t.toolName,
        t.category,
        t.quantity.toString(),
        t.unit || 'Cái',
        (t.purchasePrice || 0).toString(),
        t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString('vi-VN') : '',
        t.supplierName || '',
        t.currentUserName || '',
        t.departmentName || '',
        t.locationName || '',
        t.cityName || '',
        t.projectName || '',
        formatStatus(t.status),
        t.note || ''
      ]);
    }

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bao_cao_ccdc_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
