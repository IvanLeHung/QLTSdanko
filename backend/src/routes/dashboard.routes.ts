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

// GET /api/dashboard/activity-stats
router.get('/activity-stats', authenticateToken, async (req: any, res) => {
  try {
    const stats = await getActivityStats(req);
    res.json(stats);
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

export default router;
