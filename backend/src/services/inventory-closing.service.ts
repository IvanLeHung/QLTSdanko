import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';

const VALID_SCOPE_TYPES = ['FULL', 'DAILY', 'SESSION', 'DEPARTMENT', 'LOCATION', 'PROJECT'];
const LARGE_SCOPE_THRESHOLD = 50000;

export class InventoryClosingError extends Error {
  code: string;
  httpStatus: number;
  details?: any;

  constructor(code: string, message: string, httpStatus = 400, details?: any) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

type ClosingScopeInput = {
  scopeType: string;
  sessionId?: number;
  departmentId?: number;
  locationId?: number;
  projectValue?: string;
  scopeDate?: string | Date;
  scopeLabel?: string;
};

type ClosingSignerInput = {
  signerRole: string;
  fullName: string;
  position?: string;
  department?: string;
  signatureImage?: string;
  note?: string;
};

type ScopeRefs = {
  departmentName?: string;
  locationName?: string;
};

function actorName(user?: { username?: string; fullName?: string }) {
  return user?.fullName || user?.username || 'system';
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseDate(value: string | Date | undefined, fieldName: string) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', `${fieldName} không hợp lệ`, 422);
  }
  return date;
}

function normalizeScope(scope: ClosingScopeInput): ClosingScopeInput {
  const scopeType = String(scope.scopeType || '').toUpperCase();
  if (!VALID_SCOPE_TYPES.includes(scopeType)) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Loại phạm vi chốt không hợp lệ', 422, { scopeType });
  }

  if (scopeType === 'SESSION' && !scope.sessionId) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Chốt theo phiên kiểm kê cần sessionId', 422);
  }
  if (scopeType === 'DEPARTMENT' && !scope.departmentId) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Chốt theo phòng ban cần departmentId', 422);
  }
  if (scopeType === 'LOCATION' && !scope.locationId) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Chốt theo vị trí cần locationId', 422);
  }
  if (scopeType === 'PROJECT' && !scope.projectValue) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Chốt theo dự án cần projectValue', 422);
  }
  if (scopeType === 'DAILY' && !scope.scopeDate) {
    throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Chốt theo ngày cần scopeDate', 422);
  }

  return {
    ...scope,
    scopeType,
    sessionId: scope.sessionId ? Number(scope.sessionId) : undefined,
    departmentId: scope.departmentId ? Number(scope.departmentId) : undefined,
    locationId: scope.locationId ? Number(scope.locationId) : undefined,
    scopeDate: scope.scopeDate ? parseDate(scope.scopeDate, 'scopeDate') : undefined,
  };
}

function classifyRow(row: { checkStatus?: string | null; resultStatus?: string | null; result?: string | null }) {
  const status = String(row.checkStatus || '').toUpperCase();
  const result = String(row.resultStatus || row.result || '').toUpperCase();
  const pending = !status || ['PENDING', 'NEED_REVIEW', 'MATCH_PENDING_CONFIRM'].includes(status);
  const missing = result === 'MISSING';
  const extra = result === 'EXTRA';
  const damaged = result === 'DAMAGED';
  const matched = !pending && ['MATCH', 'MATCHED', ''].includes(result);
  const discrepancy = !matched && !pending;
  return { pending, matched, discrepancy, missing, extra, damaged };
}

function mergeSummaries(parts: Array<ReturnType<typeof summarizeRows>>) {
  const summary = {
    totalItems: 0,
    matchedItems: 0,
    discrepancyItems: 0,
    missingItems: 0,
    extraItems: 0,
    damagedItems: 0,
    pendingItems: 0,
    differencePercent: 0,
  };

  for (const part of parts) {
    summary.totalItems += part.totalItems;
    summary.matchedItems += part.matchedItems;
    summary.discrepancyItems += part.discrepancyItems;
    summary.missingItems += part.missingItems;
    summary.extraItems += part.extraItems;
    summary.damagedItems += part.damagedItems;
    summary.pendingItems += part.pendingItems;
  }

  summary.differencePercent = summary.totalItems > 0
    ? Number(((summary.discrepancyItems / summary.totalItems) * 100).toFixed(2))
    : 0;

  return summary;
}

function summarizeRows(rows: Array<{ checkStatus?: string | null; resultStatus?: string | null; result?: string | null }>) {
  const summary = {
    totalItems: rows.length,
    matchedItems: 0,
    discrepancyItems: 0,
    missingItems: 0,
    extraItems: 0,
    damagedItems: 0,
    pendingItems: 0,
    differencePercent: 0,
  };

  for (const row of rows) {
    const cls = classifyRow(row);
    if (cls.pending) summary.pendingItems += 1;
    if (cls.matched) summary.matchedItems += 1;
    if (cls.discrepancy) summary.discrepancyItems += 1;
    if (cls.missing) summary.missingItems += 1;
    if (cls.extra) summary.extraItems += 1;
    if (cls.damaged) summary.damagedItems += 1;
  }

  summary.differencePercent = summary.totalItems > 0
    ? Number(((summary.discrepancyItems / summary.totalItems) * 100).toFixed(2))
    : 0;

  return summary;
}

export class InventoryClosingService {
  static async getHealth() {
    await prisma.$queryRaw`SELECT 1`;
    const [activeClosings, pendingReports] = await Promise.all([
      prisma.inventoryClosingRecord.count({ where: { status: { in: ['DRAFT', 'PENDING_SIGN', 'PROCESSING'] } } }),
      prisma.inventoryReportFile.count({ where: { isOutdated: false, fileUrl: '' } }),
    ]);

    return {
      service: 'inventory-closing',
      status: 'healthy',
      checks: {
        database: 'connected',
        reportGenerator: 'not_configured',
        eventBus: 'not_configured',
        storage: 'not_configured',
      },
      metrics: {
        activeClosings,
        pendingReports,
        failedJobs: 0,
        averageLockTime: null,
      },
    };
  }

  static async listClosingRecords(inventoryCheckId: number) {
    return prisma.inventoryClosingRecord.findMany({
      where: { inventoryCheckId },
      include: {
        scopes: true,
        signers: true,
        reports: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getClosingRecord(closingId: number) {
    const record = await prisma.inventoryClosingRecord.findUnique({
      where: { id: closingId },
      include: {
        inventoryCheck: true,
        scopes: true,
        signers: true,
        reports: true,
      },
    });
    if (!record) {
      throw new InventoryClosingError('CLOSING_NOT_FOUND', 'Không tìm thấy biên bản chốt kiểm kê', 404);
    }
    return record;
  }

  static async getStatistics(inventoryCheckId: number) {
    const records = await prisma.inventoryClosingRecord.findMany({
      where: { inventoryCheckId },
      include: { scopes: true },
      orderBy: { closingDate: 'asc' },
    });

    const scopes = records.flatMap(record => record.scopes);
    const totalItems = records.reduce((sum, record) => sum + record.totalItems, 0);
    const lockedItems = scopes.reduce((sum, scope) => sum + (scope.lockedAt ? scope.itemCount : 0), 0);
    const discrepancyItems = records.reduce((sum, record) => sum + record.discrepancyItems, 0);
    const finalRecords = records.filter(record => record.status === 'FINAL' && record.closedAt);
    const averageMs = finalRecords.length > 0
      ? finalRecords.reduce((sum, record) => sum + ((record.closedAt?.getTime() || 0) - record.createdAt.getTime()), 0) / finalRecords.length
      : 0;

    return {
      totalScopes: scopes.length,
      closedScopes: scopes.filter(scope => Boolean(scope.lockedAt)).length,
      pendingScopes: scopes.filter(scope => !scope.lockedAt).length,
      totalItems,
      lockedItems,
      discrepancyRate: totalItems > 0 ? Number(((discrepancyItems / totalItems) * 100).toFixed(2)) : 0,
      averageClosingTime: averageMs > 0 ? `${Number((averageMs / 36e5).toFixed(2))} hours` : null,
      closingTrend: records.map(record => ({
        date: record.closingDate.toISOString().slice(0, 10),
        closed: record.status === 'FINAL' ? record.scopes.length : 0,
        items: record.totalItems,
      })),
    };
  }

  static async validateScope(inventoryCheckId: number, scopes: ClosingScopeInput[]) {
    const check = await prisma.inventoryCheck.findUnique({ where: { id: inventoryCheckId } });
    if (!check) {
      throw new InventoryClosingError('INVENTORY_NOT_FOUND', 'Không tìm thấy đợt kiểm kê', 404);
    }

    const normalizedScopes = scopes.map(normalizeScope);
    if (normalizedScopes.length === 0) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Cần ít nhất một phạm vi chốt', 422);
    }

    const summaries = [];
    const overlaps = [];

    for (const scope of normalizedScopes) {
      const refs = await this.resolveScopeRefs(scope);
      const rows = await this.getScopeRows(inventoryCheckId, scope, refs);
      if (rows.length === 0) {
        throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Phạm vi chốt không có tài sản', 422, { scope });
      }
      const summary = summarizeRows(rows);
      summaries.push({ scope: this.serializeScope(scope, refs), summary });

      const scopeOverlaps = await this.findOverlaps(inventoryCheckId, scope, refs);
      overlaps.push(...scopeOverlaps);
    }

    return {
      isValid: overlaps.length === 0,
      overlaps,
      summaries,
      suggestions: overlaps.length > 0
        ? ['Điều chỉnh phạm vi chốt hoặc yêu cầu mở lại biên bản đang khóa dữ liệu.']
        : [],
    };
  }

  static async createClosingRecord(inventoryCheckId: number, data: any, user?: { username?: string; fullName?: string }) {
    const check = await prisma.inventoryCheck.findUnique({ where: { id: inventoryCheckId } });
    if (!check) {
      throw new InventoryClosingError('INVENTORY_NOT_FOUND', 'Không tìm thấy đợt kiểm kê', 404);
    }

    const closingDate = parseDate(data.closingDate, 'closingDate') || new Date();
    this.validateClosingDate(closingDate, check.inventoryDate);

    const scopes = Array.isArray(data.scopes) ? data.scopes.map(normalizeScope) : [];
    if (scopes.length === 0) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Cần ít nhất một phạm vi chốt', 422);
    }

    const validation = await this.validateScope(inventoryCheckId, scopes);
    if (!validation.isValid) {
      throw new InventoryClosingError('CLOSING_SCOPE_OVERLAP', 'Phạm vi chốt bị overlap với biên bản đã chốt', 409, validation);
    }

    const signers: ClosingSignerInput[] = Array.isArray(data.signers) ? data.signers : [];
    this.validateSigners(signers);
    const closingCode = await this.generateClosingCode(inventoryCheckId, check.inventoryCode);
    const actor = actorName(user);
    const totalSummary = mergeSummaries(validation.summaries.map(item => item.summary));

    return prisma.$transaction(async tx => {
      const record = await tx.inventoryClosingRecord.create({
        data: {
          inventoryCheckId,
          closingCode,
          closingDate,
          closedBy: actor,
          status: signers.length > 0 ? 'PENDING_SIGN' : 'DRAFT',
          totalItems: totalSummary.totalItems,
          matchedItems: totalSummary.matchedItems,
          discrepancyItems: totalSummary.discrepancyItems,
          missingItems: totalSummary.missingItems,
          extraItems: totalSummary.extraItems,
          damagedItems: totalSummary.damagedItems,
          differencePercent: totalSummary.differencePercent,
          summaryJson: totalSummary,
          closingNote: data.closingNote || null,
        },
      });

      for (const item of validation.summaries) {
        await tx.inventoryClosingScope.create({
          data: {
            closingId: record.id,
            ...item.scope,
            itemCount: item.summary.totalItems,
            matchedCount: item.summary.matchedItems,
            differenceCount: item.summary.discrepancyItems,
            pendingCount: item.summary.pendingItems,
            extraCount: item.summary.extraItems,
            missingCount: item.summary.missingItems,
            damagedCount: item.summary.damagedItems,
            status: item.summary.pendingItems > 0 ? 'PARTIAL' : 'COMPLETE',
          },
        });
      }

      for (const signer of signers) {
        await tx.inventoryClosingSigner.create({
          data: {
            closingId: record.id,
            signerRole: String(signer.signerRole || '').toUpperCase(),
            fullName: signer.fullName,
            position: signer.position || null,
            department: signer.department || null,
            signatureImage: signer.signatureImage || null,
            note: signer.note || null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: 'INVENTORY_CLOSING',
          entityId: record.id,
          action: 'CREATE',
          details: JSON.stringify({ inventoryCheckId, closingCode, scopes: validation.summaries.map(item => item.scope) }),
          performedBy: actor,
        },
      });

      return tx.inventoryClosingRecord.findUnique({
        where: { id: record.id },
        include: { scopes: true, signers: true, reports: true },
      });
    });
  }

  static async signClosing(closingId: number, data: any, user?: { username?: string; fullName?: string }) {
    const record = await this.getClosingRecord(closingId);
    if (!['PENDING_SIGN', 'DRAFT'].includes(record.status)) {
      throw new InventoryClosingError('INVALID_CLOSING_TRANSITION', 'Chỉ ký được biên bản đang chờ ký hoặc nháp', 409);
    }

    const signerId = Number(data.signerId);
    if (!signerId) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Thiếu signerId', 422);
    }

    const actor = actorName(user);
    return prisma.$transaction(async tx => {
      await tx.inventoryClosingSigner.update({
        where: { id: signerId },
        data: {
          signStatus: 'SIGNED',
          signedAt: new Date(),
          signatureImage: data.signatureImage || undefined,
          note: data.note || undefined,
        },
      });

      const signers = await tx.inventoryClosingSigner.findMany({ where: { closingId } });
      const requiredSigners = signers.filter(signer => signer.signerRole !== 'OTHER');
      const allSigned = requiredSigners.length > 0 && requiredSigners.every(signer => signer.signStatus === 'SIGNED');

      const updated = await tx.inventoryClosingRecord.update({
        where: { id: closingId },
        data: { status: allSigned ? 'SIGNED' : 'PENDING_SIGN', version: { increment: 1 } },
        include: { scopes: true, signers: true, reports: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'INVENTORY_CLOSING',
          entityId: closingId,
          action: 'UPDATE',
          details: JSON.stringify({ action: 'SIGN', signerId, allSigned }),
          performedBy: actor,
        },
      });

      return updated;
    });
  }

  static async finalizeClosing(closingId: number, data: any, user?: { username?: string; fullName?: string }) {
    const record = await this.getClosingRecord(closingId);
    if (!['DRAFT', 'SIGNED'].includes(record.status)) {
      throw new InventoryClosingError('INVALID_CLOSING_TRANSITION', 'Chỉ chốt được biên bản nháp hoặc đã ký đủ', 409, { status: record.status });
    }

    if (record.signers.length > 0) {
      const pendingSigners = record.signers.filter(signer => signer.signerRole !== 'OTHER' && signer.signStatus !== 'SIGNED');
      if (pendingSigners.length > 0) {
        throw new InventoryClosingError('CLOSING_INSUFFICIENT_SIGNERS', 'Thiếu người ký bắt buộc', 422, { roles: pendingSigners.map(s => s.signerRole) });
      }
    }

    const pendingItems = record.scopes.reduce((sum, scope) => sum + scope.pendingCount, 0);
    if (pendingItems > 0) {
      const reason = String(data.forceCloseReason || '').trim();
      if (reason.length < 20) {
        throw new InventoryClosingError('CLOSING_PENDING_ITEMS', `Còn ${pendingItems} tài sản chưa xử lý, cần lý do force close tối thiểu 20 ký tự`, 422, { pendingItems });
      }
    }

    if (record.totalItems > LARGE_SCOPE_THRESHOLD) {
      const actor = actorName(user);
      const processing = await prisma.inventoryClosingRecord.update({
        where: { id: closingId },
        data: {
          status: 'PROCESSING',
          forceCloseReason: data.forceCloseReason || record.forceCloseReason,
          version: { increment: 1 },
        },
      });
      return {
        processing: true,
        closingId,
        status: processing.status,
        jobId: `closing-${closingId}-${Date.now()}`,
        estimatedCompletion: new Date(Date.now() + Math.ceil(record.totalItems / 1000) * 5000),
        warning: 'Scope lớn đã được chuyển sang xử lý nền.',
        performedBy: actor,
      };
    }

    const actor = actorName(user);
    const now = new Date();

    return prisma.$transaction(async tx => {
      for (const scope of record.scopes) {
        const scopeInput = this.scopeModelToInput(scope);
        const refs = await this.resolveScopeRefs(scopeInput, tx);
        await this.assertNoLockedOverlap(record.inventoryCheckId, scopeInput, refs, closingId, tx);

        const itemWhere = await this.buildItemWhere(record.inventoryCheckId, scopeInput, refs);
        const detailWhere = await this.buildDetailWhere(record.inventoryCheckId, scopeInput, refs);

        await tx.inventoryDetail.updateMany({
          where: { ...detailWhere, closingScopeId: null },
          data: { lockedAt: now, lockedBy: actor, closingScopeId: scope.id },
        });
        await tx.inventoryItem.updateMany({
          where: { ...itemWhere, closingScopeId: null },
          data: { lockedAt: now, lockedBy: actor, closingScopeId: scope.id },
        });
        await tx.inventoryClosingScope.update({
          where: { id: scope.id },
          data: { lockedAt: now, lockedBy: actor, status: 'COMPLETE' },
        });
      }

      const updated = await tx.inventoryClosingRecord.update({
        where: { id: closingId },
        data: {
          status: 'FINAL',
          closedAt: now,
          closedBy: actor,
          forceCloseReason: data.forceCloseReason || record.forceCloseReason,
          version: { increment: 1 },
        },
        include: { scopes: true, signers: true, reports: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'INVENTORY_CLOSING',
          entityId: closingId,
          action: 'COMPLETE',
          details: JSON.stringify({ closingCode: record.closingCode, totalItems: record.totalItems }),
          performedBy: actor,
        },
      });

      return updated;
    });
  }

  static async reopenClosing(closingId: number, data: any, user?: { username?: string; fullName?: string; roles?: string[] }) {
    const record = await this.getClosingRecord(closingId);
    if (record.status !== 'FINAL') {
      throw new InventoryClosingError('INVALID_CLOSING_TRANSITION', 'Chỉ mở lại được biên bản đã final', 409);
    }

    const reason = String(data.reason || '').trim();
    if (reason.length < 10) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Cần nhập lý do mở lại tối thiểu 10 ký tự', 422);
    }

    const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
    const closedAt = record.closedAt?.getTime() || 0;
    const beyondWindow = Date.now() - closedAt > 24 * 60 * 60 * 1000;
    if (beyondWindow && !isSuperAdmin) {
      throw new InventoryClosingError('REOPEN_NOT_ALLOWED', 'Chỉ được mở lại trong 24h sau khi chốt', 403);
    }
    if (record.reopenCount >= 3 && !isSuperAdmin) {
      throw new InventoryClosingError('MAX_REOPEN_EXCEEDED', 'Đã vượt quá số lần mở lại cho phép', 403);
    }

    const actor = actorName(user);
    const scopeIds = record.scopes.map(scope => scope.id);
    const reopenHistory = Array.isArray(record.reopenHistory) ? record.reopenHistory : [];

    return prisma.$transaction(async tx => {
      await tx.inventoryDetail.updateMany({
        where: { closingScopeId: { in: scopeIds } },
        data: { lockedAt: null, lockedBy: null, closingScopeId: null },
      });
      await tx.inventoryItem.updateMany({
        where: { closingScopeId: { in: scopeIds } },
        data: { lockedAt: null, lockedBy: null, closingScopeId: null },
      });
      await tx.inventoryClosingScope.updateMany({
        where: { id: { in: scopeIds } },
        data: { lockedAt: null, lockedBy: null, status: 'PARTIAL' },
      });
      await tx.inventoryReportFile.updateMany({
        where: { closingId },
        data: { isOutdated: true },
      });

      const updated = await tx.inventoryClosingRecord.update({
        where: { id: closingId },
        data: {
          status: 'REOPENED',
          reopenCount: { increment: 1 },
          reopenHistory: [...reopenHistory, { reopenedAt: new Date().toISOString(), reopenedBy: actor, reason }],
          version: { increment: 1 },
        },
        include: { scopes: true, signers: true, reports: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'INVENTORY_CLOSING',
          entityId: closingId,
          action: 'UPDATE',
          details: JSON.stringify({ action: 'REOPEN', reason }),
          performedBy: actor,
        },
      });

      return updated;
    });
  }

  static async cancelScope(closingId: number, scopeId: number, user?: { username?: string; fullName?: string }) {
    const record = await this.getClosingRecord(closingId);
    if (!['DRAFT', 'REOPENED'].includes(record.status)) {
      throw new InventoryClosingError('INVALID_CLOSING_TRANSITION', 'Chỉ hủy scope khi biên bản đang nháp hoặc đã mở lại', 409);
    }
    const scope = record.scopes.find(item => item.id === scopeId);
    if (!scope) {
      throw new InventoryClosingError('SCOPE_NOT_FOUND', 'Không tìm thấy phạm vi chốt', 404);
    }
    if (scope.lockedAt) {
      throw new InventoryClosingError('ITEM_LOCKED', 'Phạm vi đã bị khóa, cần mở lại trước khi hủy', 423);
    }

    const actor = actorName(user);
    return prisma.$transaction(async tx => {
      await tx.inventoryClosingScope.delete({ where: { id: scopeId } });
      const remainingScopes = await tx.inventoryClosingScope.findMany({ where: { closingId } });
      const updated = await tx.inventoryClosingRecord.update({
        where: { id: closingId },
        data: {
          status: remainingScopes.length === 0 ? 'CANCELLED' : record.status,
          version: { increment: 1 },
        },
        include: { scopes: true, signers: true, reports: true },
      });
      await tx.auditLog.create({
        data: {
          entityType: 'INVENTORY_CLOSING',
          entityId: closingId,
          action: 'CANCEL',
          details: JSON.stringify({ action: 'CANCEL_SCOPE', scopeId }),
          performedBy: actor,
        },
      });
      return {
        cancelledScopeId: scopeId,
        remainingScopes: remainingScopes.length,
        closingStatus: updated.status,
        record: updated,
      };
    });
  }

  private static validateClosingDate(closingDate: Date, inventoryDate: Date) {
    if (closingDate.getTime() > Date.now()) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Ngày chốt không được ở tương lai', 422);
    }
    if (startOfDay(closingDate).getTime() < startOfDay(inventoryDate).getTime()) {
      throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Ngày chốt không được trước ngày bắt đầu đợt kiểm kê', 422);
    }
  }

  private static validateSigners(signers: ClosingSignerInput[]) {
    const roles = new Set<string>();
    for (const signer of signers) {
      if (!signer.fullName) {
        throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Người ký cần có họ tên', 422);
      }
      const role = String(signer.signerRole || '').toUpperCase();
      if (!role) {
        throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Người ký cần có vai trò', 422);
      }
      if (role !== 'OTHER' && roles.has(role)) {
        throw new InventoryClosingError('INVALID_CLOSING_INPUT', `Trùng vai trò người ký: ${role}`, 422);
      }
      roles.add(role);
    }
  }

  private static async generateClosingCode(inventoryCheckId: number, inventoryCode: string) {
    const year = new Date().getFullYear();
    const count = await prisma.inventoryClosingRecord.count({ where: { inventoryCheckId } });
    return `BBKK-${year}-${inventoryCode}-${String(count + 1).padStart(3, '0')}`;
  }

  private static serializeScope(scope: ClosingScopeInput, refs: ScopeRefs) {
    const scopeDate = scope.scopeDate ? parseDate(scope.scopeDate, 'scopeDate') : undefined;
    return {
      scopeType: String(scope.scopeType).toUpperCase(),
      sessionId: scope.sessionId || null,
      departmentId: scope.departmentId || null,
      locationId: scope.locationId || null,
      projectValue: scope.projectValue || null,
      scopeDate: scopeDate || null,
      scopeLabel: scope.scopeLabel || refs.departmentName || refs.locationName || scope.projectValue || null,
    };
  }

  private static scopeModelToInput(scope: any): ClosingScopeInput {
    return {
      scopeType: scope.scopeType,
      sessionId: scope.sessionId || undefined,
      departmentId: scope.departmentId || undefined,
      locationId: scope.locationId || undefined,
      projectValue: scope.projectValue || undefined,
      scopeDate: scope.scopeDate || undefined,
      scopeLabel: scope.scopeLabel || undefined,
    };
  }

  private static async resolveScopeRefs(scope: ClosingScopeInput, client: any = prisma): Promise<ScopeRefs> {
    const refs: ScopeRefs = {};
    if (scope.departmentId) {
      const department = await client.department.findUnique({ where: { id: scope.departmentId } });
      if (!department) throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Không tìm thấy phòng ban', 422);
      refs.departmentName = department.name;
    }
    if (scope.locationId) {
      const location = await client.location.findUnique({ where: { id: scope.locationId } });
      if (!location) throw new InventoryClosingError('INVALID_CLOSING_INPUT', 'Không tìm thấy vị trí', 422);
      refs.locationName = location.name;
    }
    return refs;
  }

  private static async buildItemWhere(inventoryCheckId: number, scope: ClosingScopeInput, refs: ScopeRefs): Promise<Prisma.InventoryItemWhereInput> {
    const scopeType = String(scope.scopeType).toUpperCase();
    const base: Prisma.InventoryItemWhereInput = { inventoryCheckId };
    if (scopeType === 'FULL') return base;
    if (scopeType === 'SESSION') return { id: -1 };
    if (scopeType === 'DAILY') {
      const day = parseDate(scope.scopeDate, 'scopeDate')!;
      return { ...base, checkedAt: { gte: startOfDay(day), lte: endOfDay(day) } };
    }
    if (scopeType === 'DEPARTMENT') {
      return { ...base, OR: [{ actualDepartment: refs.departmentName }, { asset: { departmentName: refs.departmentName } }] };
    }
    if (scopeType === 'LOCATION') {
      return { ...base, OR: [{ actualLocation: refs.locationName }, { asset: { locationName: refs.locationName } }] };
    }
    if (scopeType === 'PROJECT') {
      return { ...base, OR: [{ actualProject: scope.projectValue }, { asset: { projectName: scope.projectValue } }] };
    }
    return base;
  }

  private static async buildDetailWhere(inventoryCheckId: number, scope: ClosingScopeInput, refs: ScopeRefs): Promise<Prisma.InventoryDetailWhereInput> {
    const scopeType = String(scope.scopeType).toUpperCase();
    const base: Prisma.InventoryDetailWhereInput = { session: { inventoryCheckId } };
    if (scopeType === 'FULL') return base;
    if (scopeType === 'SESSION') return { sessionId: scope.sessionId };
    if (scopeType === 'DAILY') {
      const day = parseDate(scope.scopeDate, 'scopeDate')!;
      return {
        ...base,
        OR: [
          { checkedAt: { gte: startOfDay(day), lte: endOfDay(day) } },
          { session: { inventoryCheckId, scheduledDate: { gte: startOfDay(day), lte: endOfDay(day) } } },
        ],
      };
    }
    if (scopeType === 'DEPARTMENT') {
      return { ...base, OR: [{ actualDepartmentName: refs.departmentName }, { bookDepartmentName: refs.departmentName }, { asset: { departmentName: refs.departmentName } }] };
    }
    if (scopeType === 'LOCATION') {
      return { ...base, OR: [{ actualLocationName: refs.locationName }, { bookLocationName: refs.locationName }, { asset: { locationName: refs.locationName } }] };
    }
    if (scopeType === 'PROJECT') {
      return { ...base, OR: [{ actualProjectName: scope.projectValue }, { session: { inventoryCheckId, projectName: scope.projectValue } }, { asset: { projectName: scope.projectValue } }] };
    }
    return base;
  }

  private static async getScopeRows(inventoryCheckId: number, scope: ClosingScopeInput, refs: ScopeRefs) {
    const [details, items] = await Promise.all([
      prisma.inventoryDetail.findMany({
        where: await this.buildDetailWhere(inventoryCheckId, scope, refs),
        select: { id: true, assetCode: true, assetName: true, checkStatus: true, resultStatus: true },
      }),
      prisma.inventoryItem.findMany({
        where: await this.buildItemWhere(inventoryCheckId, scope, refs),
        select: { id: true, assetCode: true, checkStatus: true, result: true },
      }),
    ]);

    if (details.length > 0) return details;
    return items.map(item => ({ ...item, assetName: item.assetCode }));
  }

  private static async findOverlaps(inventoryCheckId: number, scope: ClosingScopeInput, refs: ScopeRefs) {
    const [details, items] = await Promise.all([
      prisma.inventoryDetail.findMany({
        where: {
          ...(await this.buildDetailWhere(inventoryCheckId, scope, refs)),
          closingScopeId: { not: null },
          closingScope: { closing: { status: 'FINAL' } },
        },
        take: 50,
        include: { closingScope: { include: { closing: true } } },
      }),
      prisma.inventoryItem.findMany({
        where: {
          ...(await this.buildItemWhere(inventoryCheckId, scope, refs)),
          closingScopeId: { not: null },
          closingScope: { closing: { status: 'FINAL' } },
        },
        take: 50,
        include: { closingScope: { include: { closing: true } }, asset: true },
      }),
    ]);

    const rows = [
      ...details.map(detail => ({
        itemId: `detail-${detail.id}`,
        assetCode: detail.assetCode,
        assetName: detail.assetName,
        currentStatus: 'LOCKED',
        existingClosingCode: detail.closingScope?.closing.closingCode,
        existingScopeId: detail.closingScopeId,
      })),
      ...items.map(item => ({
        itemId: `item-${item.id}`,
        assetCode: item.assetCode,
        assetName: item.asset?.assetName || item.assetCode,
        currentStatus: 'LOCKED',
        existingClosingCode: item.closingScope?.closing.closingCode,
        existingScopeId: item.closingScopeId,
      })),
    ];

    const grouped = new Map<string, any>();
    for (const row of rows) {
      const key = `${row.existingClosingCode}-${row.existingScopeId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          existingClosingCode: row.existingClosingCode,
          existingScope: { id: row.existingScopeId },
          overlappingItems: [],
          overlapPercentage: 0,
        });
      }
      grouped.get(key).overlappingItems.push({
        itemId: row.itemId,
        assetCode: row.assetCode,
        assetName: row.assetName,
        currentStatus: row.currentStatus,
      });
    }

    return Array.from(grouped.values());
  }

  private static async assertNoLockedOverlap(inventoryCheckId: number, scope: ClosingScopeInput, refs: ScopeRefs, closingId: number, tx: any) {
    const [detailLocked, itemLocked] = await Promise.all([
      tx.inventoryDetail.findFirst({
        where: {
          ...(await this.buildDetailWhere(inventoryCheckId, scope, refs)),
          closingScopeId: { not: null },
          closingScope: { closingId: { not: closingId }, closing: { status: 'FINAL' } },
        },
      }),
      tx.inventoryItem.findFirst({
        where: {
          ...(await this.buildItemWhere(inventoryCheckId, scope, refs)),
          closingScopeId: { not: null },
          closingScope: { closingId: { not: closingId }, closing: { status: 'FINAL' } },
        },
      }),
    ]);
    if (detailLocked || itemLocked) {
      throw new InventoryClosingError('CLOSING_SCOPE_OVERLAP', 'Phạm vi chốt bị overlap với biên bản đã chốt', 409);
    }
  }
}
