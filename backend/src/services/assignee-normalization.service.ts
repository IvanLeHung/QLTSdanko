import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import {
  buildAssigneeGroupKey,
  buildAssigneeVariantKey,
  cleanAssigneeLabel,
  expandAssigneePosition,
  extractAssigneePhones,
  isNonPersonAssignee,
  normalizeAssigneeDepartment,
  normalizeAssigneeName,
  normalizeAssigneePhone,
  normalizeAssigneePosition
} from '../utils/assignee-normalization.util';

type AssigneeAsset = {
  id: number;
  assetCode: string;
  assetName: string;
  currentUserName: string | null;
  currentUserPhone: string | null;
  currentPosition: string | null;
  departmentName: string | null;
  locationName: string | null;
  cityName: string | null;
  projectName: string | null;
  currentAssigneeProfileId: number | null;
};

type AssigneeVariant = {
  key: string;
  name: string;
  phone: string | null;
  phones: string[];
  position: string | null;
  normalizedPosition: string;
  departmentName: string | null;
  normalizedDepartment: string;
  assetIds: number[];
  assetCodes: string[];
  locations: string[];
  assetCount: number;
  source: 'ASSET_REGISTER';
};

export type AssigneeSuggestionGroup = {
  groupKey: string;
  normalizedName: string;
  displayName: string;
  confidenceScore: number;
  assetCount: number;
  variants: AssigneeVariant[];
  riskFlags: string[];
  suggestedCanonical: {
    canonicalName: string;
    primaryPhone: string | null;
    canonicalPosition: string | null;
    departmentName: string | null;
  };
};

const ASSIGNEE_SELECT = {
  id: true,
  assetCode: true,
  assetName: true,
  currentUserName: true,
  currentUserPhone: true,
  currentPosition: true,
  departmentName: true,
  locationName: true,
  cityName: true,
  projectName: true,
  currentAssigneeProfileId: true
} as const;

const mostFrequent = (values: Array<string | null | undefined>) => {
  const counts = new Map<string, number>();
  values.map(cleanAssigneeLabel).filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] || null;
};

const buildLocationLabel = (asset: AssigneeAsset) => [asset.cityName, asset.projectName, asset.locationName]
  .map(cleanAssigneeLabel)
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(' - ');

export class AssigneeNormalizationService {
  private static buildGroups(assets: AssigneeAsset[]): AssigneeSuggestionGroup[] {
    const nameGroups = new Map<string, AssigneeAsset[]>();

    assets.forEach((asset) => {
      const normalizedName = normalizeAssigneeName(asset.currentUserName);
      if (!normalizedName || isNonPersonAssignee(asset.currentUserName)) return;
      const group = nameGroups.get(normalizedName) || [];
      group.push(asset);
      nameGroups.set(normalizedName, group);
    });

    const suggestions: AssigneeSuggestionGroup[] = [];
    nameGroups.forEach((groupAssets, normalizedName) => {
      const variantMap = new Map<string, AssigneeVariant>();

      groupAssets.forEach((asset) => {
        const key = buildAssigneeVariantKey({
          name: asset.currentUserName,
          phone: asset.currentUserPhone,
          position: asset.currentPosition,
          department: asset.departmentName
        });
        const existing = variantMap.get(key);
        const location = buildLocationLabel(asset);
        if (existing) {
          existing.assetIds.push(asset.id);
          existing.assetCodes.push(asset.assetCode);
          existing.assetCount += 1;
          if (location && !existing.locations.includes(location)) existing.locations.push(location);
          return;
        }

        variantMap.set(key, {
          key,
          name: cleanAssigneeLabel(asset.currentUserName),
          phone: cleanAssigneeLabel(asset.currentUserPhone) || null,
          phones: extractAssigneePhones(asset.currentUserPhone),
          position: cleanAssigneeLabel(asset.currentPosition) || null,
          normalizedPosition: normalizeAssigneePosition(asset.currentPosition),
          departmentName: cleanAssigneeLabel(asset.departmentName) || null,
          normalizedDepartment: normalizeAssigneeDepartment(asset.departmentName),
          assetIds: [asset.id],
          assetCodes: [asset.assetCode],
          locations: location ? [location] : [],
          assetCount: 1,
          source: 'ASSET_REGISTER'
        });
      });

      const variants = [...variantMap.values()];
      if (variants.length < 2) return;

      const phoneSets = variants.map((variant) => variant.phones.join(','));
      const nonEmptyPhones = new Set(phoneSets.filter(Boolean));
      const positions = new Set(variants.map((variant) => variant.normalizedPosition).filter(Boolean));
      const departments = new Set(variants.map((variant) => variant.normalizedDepartment).filter(Boolean));
      const names = new Set(variants.map((variant) => variant.name));

      let confidenceScore = 55;
      if (nonEmptyPhones.size === 1 && variants.every((variant) => variant.phones.length > 0)) confidenceScore += 30;
      if (positions.size <= 1) confidenceScore += 8;
      if (departments.size <= 1) confidenceScore += 7;

      const riskFlags: string[] = [];
      if (nonEmptyPhones.size > 1) riskFlags.push('PHONE_CONFLICT');
      if (positions.size > 1) riskFlags.push('POSITION_CONFLICT');
      if (departments.size > 1) riskFlags.push('DEPARTMENT_CONFLICT');
      if (names.size > 1) riskFlags.push('NAME_FORMAT_VARIANT');

      const expandedPositions = variants.map((variant) => expandAssigneePosition(variant.position)).filter(Boolean);
      const uniquePhones = variants.flatMap((variant) => variant.phones);
      const canonicalPhone = new Set(uniquePhones).size === 1
        ? variants.find((variant) => variant.phones.length > 0)?.phone || null
        : null;

      suggestions.push({
        groupKey: buildAssigneeGroupKey(normalizedName, variants.map((variant) => variant.key)),
        normalizedName,
        displayName: mostFrequent(variants.flatMap((variant) => Array(variant.assetCount).fill(variant.name))) || variants[0].name,
        confidenceScore: Math.min(confidenceScore, 100),
        assetCount: groupAssets.length,
        variants: variants.sort((a, b) => b.assetCount - a.assetCount || a.name.localeCompare(b.name, 'vi')),
        riskFlags,
        suggestedCanonical: {
          canonicalName: mostFrequent(variants.flatMap((variant) => Array(variant.assetCount).fill(variant.name))) || variants[0].name,
          primaryPhone: canonicalPhone,
          canonicalPosition: mostFrequent(expandedPositions) || null,
          departmentName: mostFrequent(variants.map((variant) => variant.departmentName)) || null
        }
      });
    });

    return suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore || b.assetCount - a.assetCount || a.displayName.localeCompare(b.displayName, 'vi'));
  }

  static async getSuggestions(params: {
    search?: string;
    page?: number;
    limit?: number;
    assetWhere?: any;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const assets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        currentUserName: { not: null },
        ...(params.assetWhere || {})
      },
      select: ASSIGNEE_SELECT
    });

    let groups = this.buildGroups(assets);
    const decisions = await prisma.assetAssigneeMergeDecision.findMany({
      where: {
        groupKey: { in: groups.map((group) => group.groupKey) },
        status: { in: ['MERGED', 'NOT_DUPLICATE', 'SKIPPED'] }
      },
      select: { groupKey: true }
    });
    const hiddenKeys = new Set(decisions.map((decision) => decision.groupKey));
    groups = groups.filter((group) => !hiddenKeys.has(group.groupKey));

    if (params.search) {
      const searchKey = normalizeAssigneeName(params.search);
      const phoneKey = normalizeAssigneePhone(params.search);
      groups = groups.filter((group) => (
        group.normalizedName.includes(searchKey)
        || (phoneKey.length >= 3 && group.variants.some((variant) => variant.phones.some((phone) => phone.includes(phoneKey))))
        || group.variants.some((variant) => variant.normalizedDepartment.includes(searchKey))
      ));
    }

    const total = groups.length;
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items: groups.slice((page - 1) * limit, page * limit)
    };
  }

  private static async findSuggestion(groupKey: string, assetWhere?: any) {
    const assets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        currentUserName: { not: null },
        ...(assetWhere || {})
      },
      select: ASSIGNEE_SELECT
    });
    return this.buildGroups(assets).find((group) => group.groupKey === groupKey) || null;
  }

  static async mergeSuggestion(input: {
    groupKey: string;
    canonicalName: string;
    primaryPhone?: string | null;
    canonicalPosition?: string | null;
    departmentName?: string | null;
    reviewedBy: string;
    assetWhere?: any;
  }) {
    const suggestion = await this.findSuggestion(input.groupKey, input.assetWhere);
    if (!suggestion) throw new Error('Nhóm gợi ý không còn tồn tại hoặc dữ liệu đã thay đổi.');

    const canonicalName = cleanAssigneeLabel(input.canonicalName);
    if (!canonicalName) throw new Error('Họ tên chuẩn không được để trống.');
    const primaryPhone = cleanAssigneeLabel(input.primaryPhone) || null;
    const canonicalPosition = expandAssigneePosition(input.canonicalPosition) || null;
    const departmentName = cleanAssigneeLabel(input.departmentName) || null;
    const assetIds = suggestion.variants.flatMap((variant) => variant.assetIds);
    const batchId = `assignee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return prisma.$transaction(async (tx) => {
      const profile = await tx.assetAssigneeProfile.create({
        data: {
          canonicalName,
          normalizedName: normalizeAssigneeName(canonicalName),
          primaryPhone,
          normalizedPhone: normalizeAssigneePhone(primaryPhone) || null,
          canonicalPosition,
          departmentName,
          verifiedBy: input.reviewedBy,
          verifiedAt: new Date()
        }
      });

      await tx.assetAssigneeAlias.createMany({
        data: suggestion.variants.flatMap((variant) => {
          const phones = variant.phones.length > 0 ? variant.phones : [null];
          return phones.map((phone) => ({
            profileId: profile.id,
            originalName: variant.name,
            normalizedName: suggestion.normalizedName,
            originalPhone: variant.phone,
            normalizedPhone: phone,
            originalPosition: variant.position,
            normalizedPosition: variant.normalizedPosition || null,
            originalDepartment: variant.departmentName,
            normalizedDepartment: variant.normalizedDepartment || null,
            source: variant.source
          }));
        })
      });

      const assets = await tx.asset.findMany({ where: { id: { in: assetIds } }, select: ASSIGNEE_SELECT });
      const historyRecords: any[] = [];
      for (const asset of assets) {
        const updates: Record<string, any> = {
          currentUserName: canonicalName,
          currentUserPhone: primaryPhone,
          currentPosition: canonicalPosition,
          departmentName,
          currentAssigneeProfileId: profile.id
        };
        for (const fieldName of ['currentUserName', 'currentUserPhone', 'currentPosition', 'departmentName']) {
          const oldValue = (asset as any)[fieldName] ?? null;
          const finalValue = updates[fieldName] ?? null;
          if (oldValue === finalValue) continue;
          historyRecords.push({
            assetId: asset.id,
            fieldName,
            oldValue,
            suggestedValue: finalValue,
            finalValue,
            confidenceScore: suggestion.confidenceScore / 100,
            approvedBy: input.reviewedBy,
            reason: `Gộp hồ sơ người sử dụng ${suggestion.displayName}`,
            batchId
          });
        }
        await tx.asset.update({ where: { id: asset.id }, data: updates });
      }

      if (historyRecords.length > 0) {
        await tx.assetNormalizationHistory.createMany({ data: historyRecords });
      }

      const decision = await tx.assetAssigneeMergeDecision.upsert({
        where: { groupKey: suggestion.groupKey },
        update: {
          status: 'MERGED',
          candidateSnapshot: suggestion as any,
          canonicalSnapshot: { canonicalName, primaryPhone, canonicalPosition, departmentName } as any,
          batchId,
          profileId: profile.id,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date()
        },
        create: {
          groupKey: suggestion.groupKey,
          normalizedName: suggestion.normalizedName,
          status: 'MERGED',
          candidateSnapshot: suggestion as any,
          canonicalSnapshot: { canonicalName, primaryPhone, canonicalPosition, departmentName } as any,
          batchId,
          profileId: profile.id,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date()
        }
      });

      await AuditService.log({
        entityType: 'ASSIGNEE_NORMALIZATION',
        entityId: decision.id,
        action: 'UPDATE',
        details: { batchId, profileId: profile.id, assetIds, canonicalName, primaryPhone, canonicalPosition, departmentName },
        performedBy: input.reviewedBy,
        tx
      });

      return { decisionId: decision.id, profileId: profile.id, batchId, updatedAssets: assets.length };
    }, { timeout: 30000 });
  }

  static async markNotDuplicate(input: { groupKey: string; reviewedBy: string; assetWhere?: any }) {
    const suggestion = await this.findSuggestion(input.groupKey, input.assetWhere);
    if (!suggestion) throw new Error('Nhóm gợi ý không còn tồn tại hoặc dữ liệu đã thay đổi.');
    const decision = await prisma.assetAssigneeMergeDecision.upsert({
      where: { groupKey: suggestion.groupKey },
      update: {
        status: 'NOT_DUPLICATE',
        candidateSnapshot: suggestion as any,
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date()
      },
      create: {
        groupKey: suggestion.groupKey,
        normalizedName: suggestion.normalizedName,
        status: 'NOT_DUPLICATE',
        candidateSnapshot: suggestion as any,
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date()
      }
    });
    await AuditService.log({
      entityType: 'ASSIGNEE_NORMALIZATION',
      entityId: decision.id,
      action: 'CANCEL',
      details: { groupKey: suggestion.groupKey, reason: 'NOT_DUPLICATE' },
      performedBy: input.reviewedBy
    });
    return decision;
  }

  static async getProfiles(params: { search?: string; page?: number; limit?: number; assetWhere?: any }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const where: any = {
      status: 'ACTIVE',
      assets: { some: { isDeleted: false, ...(params.assetWhere || {}) } }
    };
    if (params.search) {
      where.OR = [
        { canonicalName: { contains: params.search, mode: 'insensitive' } },
        { primaryPhone: { contains: params.search, mode: 'insensitive' } },
        { canonicalPosition: { contains: params.search, mode: 'insensitive' } },
        { departmentName: { contains: params.search, mode: 'insensitive' } }
      ];
    }
    const [total, items] = await Promise.all([
      prisma.assetAssigneeProfile.count({ where }),
      prisma.assetAssigneeProfile.findMany({
        where,
        include: {
          aliases: true,
          _count: { select: { assets: true } },
          mergeDecisions: {
            where: { status: 'MERGED' },
            orderBy: { reviewedAt: 'desc' },
            take: 1,
            select: { id: true, batchId: true, reviewedAt: true, reviewedBy: true }
          }
        },
        orderBy: { canonicalName: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    return { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), items };
  }

  static async rollbackDecision(decisionId: number, performedBy: string) {
    return prisma.$transaction(async (tx) => {
      const decision = await tx.assetAssigneeMergeDecision.findUnique({ where: { id: decisionId } });
      if (!decision || decision.status !== 'MERGED' || !decision.batchId || !decision.profileId) {
        throw new Error('Không tìm thấy lần gộp có thể hoàn tác.');
      }
      const snapshot: any = decision.candidateSnapshot;
      const assetIds = (snapshot?.variants || []).flatMap((variant: any) => variant.assetIds || []);
      const history = await tx.assetNormalizationHistory.findMany({ where: { batchId: decision.batchId } });
      const changesByAsset = new Map<number, Record<string, string | null>>();
      history.forEach((record) => {
        const updates = changesByAsset.get(record.assetId) || {};
        updates[record.fieldName] = record.oldValue;
        changesByAsset.set(record.assetId, updates);
      });
      for (const [assetId, updates] of changesByAsset.entries()) {
        await tx.asset.update({
          where: { id: assetId },
          data: { ...updates, currentAssigneeProfileId: null }
        });
      }
      if (assetIds.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: assetIds }, currentAssigneeProfileId: decision.profileId },
          data: { currentAssigneeProfileId: null }
        });
      }
      await tx.assetNormalizationHistory.deleteMany({ where: { batchId: decision.batchId } });
      await tx.assetAssigneeMergeDecision.update({
        where: { id: decision.id },
        data: { status: 'ROLLED_BACK', reviewedBy: performedBy, reviewedAt: new Date() }
      });
      const linkedAssets = await tx.asset.count({ where: { currentAssigneeProfileId: decision.profileId } });
      if (linkedAssets === 0) await tx.assetAssigneeProfile.delete({ where: { id: decision.profileId } });

      await AuditService.log({
        entityType: 'ASSIGNEE_NORMALIZATION',
        entityId: decision.id,
        action: 'UNDO',
        details: { batchId: decision.batchId, restoredAssets: changesByAsset.size },
        performedBy,
        tx
      });
      return { restoredAssets: changesByAsset.size };
    }, { timeout: 30000 });
  }

  static async resolveCanonicalAssignee(client: any, input: {
    name?: string | null;
    phone?: string | null;
    position?: string | null;
    departmentName?: string | null;
  }) {
    const normalizedName = normalizeAssigneeName(input.name);
    if (!normalizedName || isNonPersonAssignee(input.name)) return null;
    const phones = extractAssigneePhones(input.phone);
    const normalizedPosition = normalizeAssigneePosition(input.position);
    const normalizedDepartment = normalizeAssigneeDepartment(input.departmentName);
    const aliases = await client.assetAssigneeAlias.findMany({
      where: { normalizedName },
      include: { profile: true }
    });
    if (aliases.length === 0) return null;

    let matches = aliases.filter((alias: any) => phones.length > 0 && alias.normalizedPhone && phones.includes(alias.normalizedPhone));
    if (matches.length === 0 && normalizedPosition && normalizedDepartment) {
      matches = aliases.filter((alias: any) => (
        alias.normalizedPosition === normalizedPosition
        && alias.normalizedDepartment === normalizedDepartment
      ));
    }
    const profiles = new Map(matches.map((match: any) => [match.profile.id, match.profile]));
    if (profiles.size !== 1) return null;
    const profile: any = [...profiles.values()][0];
    return {
      profileId: profile.id,
      currentUserName: profile.canonicalName,
      currentUserPhone: profile.primaryPhone,
      currentPosition: profile.canonicalPosition,
      departmentName: profile.departmentName
    };
  }
}
