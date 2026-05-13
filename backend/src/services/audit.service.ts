import prisma from '../utils/prisma';

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
}
