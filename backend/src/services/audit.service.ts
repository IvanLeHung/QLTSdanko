import prisma from '../utils/prisma';
import { AuditExportService, AuditExportOptions } from './audit-export.service';
import { AuditParser } from '../utils/audit-parser.util';

export class AuditService {
  static async log({
    entityType,
    entityId,
    action,
    details,
    performedBy,
    tx, // Optional transaction client
  }: {
    entityType: string;
    entityId: number;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'REPAIR' | 'REQUEST' | 'COMPLETE' | 'DAMAGE' | 'LOST' | 'LIQUIDATE' | 'PRINT' | 'CREATE_AND_COMPLETE' | 'IMPORT' | 'CANCEL';
    details?: any;
    performedBy: string;
    tx?: any;
  }) {
    const client = tx || prisma;
    try {
      await client.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          details: details ? JSON.stringify(details) : null,
          performedBy,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  static async logAssetChange(assetId: number, oldData: any, newData: any, performedBy: string, tx?: any, reason?: string) {
    const changes: Record<string, { old: any; new: any }> = {};
    const fieldsToTrack = [
      'status', 'currentUserName', 'departmentName', 'locationName', 
      'cityName', 'assetName', 'serialNumber', 'purchasePriceExVat',
      'unit', 'usagePurpose', 'purchaseDate', 'depreciationEndDate',
      'supplierName', 'companyCode', 'assetCode', 'note'
    ];

    for (const field of fieldsToTrack) {
      const oldVal = oldData[field] instanceof Date ? oldData[field].toISOString() : oldData[field];
      const newVal = newData[field] instanceof Date ? newData[field].toISOString() : newData[field];
      
      if (oldVal !== newVal) {
        changes[field] = { old: oldVal, new: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.log({
        entityType: 'ASSET',
        entityId: assetId,
        action: 'UPDATE',
        details: {
          changes,
          reason: reason || null
        },
        performedBy,
        tx
      });
    }
  }

  static async getLogs(options: {
    startDate?: string;
    endDate?: string;
    action?: string;
    entityType?: string;
    keyword?: string;
    performedBy?: string;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, action, entityType, keyword, performedBy, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    if (action) whereClause.action = action;
    if (entityType) whereClause.entityType = entityType;
    if (performedBy) whereClause.performedBy = { contains: performedBy };
    
    if (keyword) {
      whereClause.OR = [
        { details: { contains: keyword } },
        { action: { contains: keyword } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const dataWithDesc = logs.map(log => ({
      ...log,
      description: AuditParser.buildDescription(log),
      actionVn: AuditParser.getActionName(log.action),
      entityVn: AuditParser.getEntityName(log.entityType),
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: dataWithDesc,
    };
  }

  static async exportExcel(options: AuditExportOptions, requestUser: string) {
    return AuditExportService.export(options, requestUser);
  }


}
