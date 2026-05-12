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
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'REPAIR' | 'REQUEST' | 'COMPLETE' | 'DAMAGE' | 'LOST' | 'LIQUIDATE';
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

  static async logAssetChange(assetId: number, oldData: any, newData: any, performedBy: string, tx?: any) {
    const changes: Record<string, { old: any; new: any }> = {};
    const fieldsToTrack = [
      'status', 'currentUserName', 'departmentName', 'locationName', 
      'cityName', 'assetName', 'serialNumber', 'purchasePriceExVat'
    ];

    for (const field of fieldsToTrack) {
      if (oldData[field] !== newData[field]) {
        changes[field] = { old: oldData[field], new: newData[field] };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.log({
        entityType: 'ASSET',
        entityId: assetId,
        action: 'UPDATE',
        details: changes,
        performedBy,
        tx
      });
    }
  }
}
