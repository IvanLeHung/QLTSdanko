import prisma from '../utils/prisma';
import { AuditService } from './audit.service';

const normalizeText = (value?: string | null) => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const titleCase = (value: string) => value
  .split(' ')
  .filter(Boolean)
  .map(word => word[0]?.toUpperCase() + word.slice(1))
  .join(' ');

const inferName = (name: string) => {
  const n = normalizeText(name);
  if (n.includes('ghe') || n.includes('chair')) return { name: 'Ghế xoay văn phòng', category: 'Nội thất văn phòng', color: n.includes('den') ? 'Đen' : undefined, type: 'Ghế' };
  if (n.includes('canon') || n.includes('printer') || n.includes('may in')) return { name: 'Máy in Canon', category: 'Thiết bị văn phòng', type: 'Máy in' };
  if (n.includes('laptop') || n.includes('may tinh')) return { name: 'Laptop', category: 'CNTT', type: 'Máy tính' };
  if (n.includes('samsung') || n.includes('monitor') || n.includes('man hinh')) return { name: 'Màn hình Samsung', category: 'CNTT', type: 'Màn hình' };
  return { name: titleCase(name), category: undefined, type: undefined };
};

const similarity = (a: string, b: string) => {
  const aw = new Set(normalizeText(a).split(' ').filter(Boolean));
  const bw = new Set(normalizeText(b).split(' ').filter(Boolean));
  const inter = [...aw].filter(word => bw.has(word)).length;
  const union = new Set([...aw, ...bw]).size || 1;
  return inter / union;
};

export class SmartAIService {
  static async startNormalization(createdBy: string, type = 'ASSET') {
    const job = await prisma.assetNormalizationJob.create({
      data: { type, status: 'RUNNING', criteria: JSON.stringify({ source: 'PHASE_4_HEURISTIC' }), createdBy }
    });
    const assets = await prisma.asset.findMany({ where: { isDeleted: false }, take: 500 });
    let totalIssues = 0;
    for (const asset of assets) {
      const inferred = inferName(asset.assetName);
      const suggestions = [
        inferred.name && inferred.name !== asset.assetName ? ['assetName', asset.assetName, inferred.name, 0.82] : null,
        inferred.category && inferred.category !== asset.level1Name ? ['level1Name', asset.level1Name, inferred.category, 0.74] : null
      ].filter(Boolean) as any[];
      for (const [fieldName, oldValue, suggestedValue, confidenceScore] of suggestions) {
        await prisma.assetNormalizationSuggestion.create({
          data: {
            jobId: job.id,
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.assetName,
            issueType: 'AI_NORMALIZATION',
            fieldName,
            currentValue: oldValue,
            suggestedValue,
            confidenceScore,
            source: 'PHASE_4_HEURISTIC'
          }
        });
        totalIssues++;
      }
    }
    return prisma.assetNormalizationJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', progress: 100, totalIssues, completedAt: new Date() }
    });
  }

  static async listNormalizationJobs() {
    return prisma.assetNormalizationJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  static async normalizationResults(jobId: number) {
    return prisma.assetNormalizationSuggestion.findMany({ where: { jobId }, orderBy: { confidenceScore: 'desc' } });
  }

  static async approveSuggestion(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const suggestion = await tx.assetNormalizationSuggestion.findUnique({ where: { id } });
      if (!suggestion) throw new Error('Không tìm thấy gợi ý.');
      const updateData: any = {};
      if (suggestion.fieldName && suggestion.suggestedValue !== undefined) updateData[suggestion.fieldName] = suggestion.suggestedValue;
      if (Object.keys(updateData).length) await tx.asset.update({ where: { id: suggestion.assetId }, data: updateData });
      const updated = await tx.assetNormalizationSuggestion.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: performedBy, approvedAt: new Date() }
      });
      await AuditService.log({ entityType: 'ASSET_NORMALIZATION_SUGGESTION', entityId: id, action: 'COMPLETE', details: { fieldName: suggestion.fieldName, suggestedValue: suggestion.suggestedValue }, performedBy, tx });
      return updated;
    });
  }

  static async rejectSuggestion(id: number, reason: string, performedBy: string) {
    const updated = await prisma.assetNormalizationSuggestion.update({ where: { id }, data: { status: 'REJECTED', reason } });
    await AuditService.log({ entityType: 'ASSET_NORMALIZATION_SUGGESTION', entityId: id, action: 'CANCEL', details: { reason }, performedBy });
    return updated;
  }

  static async findDuplicates() {
    const assets = await prisma.asset.findMany({ where: { isDeleted: false }, take: 500 });
    const created = [];
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const score = assets[i].serialNumber && assets[i].serialNumber === assets[j].serialNumber ? 0.98 : similarity(assets[i].assetName, assets[j].assetName);
        if (score >= 0.55) {
          created.push(await prisma.duplicateSuggestion.create({
            data: { itemAId: assets[i].id, itemBId: assets[j].id, similarityScore: score, reason: `Tên/serial giống nhau (${Math.round(score * 100)}%)` }
          }));
        }
      }
    }
    return { total: created.length, items: created };
  }

  static async smartSearch(query: string) {
    const q = normalizeText(query);
    const filters: any = {};
    if (q.includes('samsung')) filters.search = 'Samsung';
    if (q.includes('canon')) filters.search = 'Canon';
    if (q.includes('laptop') || q.includes('may tinh')) filters.search = 'Laptop';
    if (q.includes('man hinh')) filters.search = filters.search || 'Màn hình';
    const floorMatch = q.match(/tang\s*(\d+)/);
    if (floorMatch) filters.locationName = `Tầng ${floorMatch[1]}`;
    const userMatch = query.match(/(?:anh|chị|chi|ban)\s+([A-Za-zÀ-ỹ]+)/i);
    if (userMatch) filters.currentUserName = userMatch[1];
    if (q.includes('hcns')) filters.departmentName = 'HCNS';
    const where: any = { isDeleted: false };
    if (filters.search) where.OR = [{ assetName: { contains: filters.search, mode: 'insensitive' } }, { assetCode: { contains: filters.search, mode: 'insensitive' } }];
    if (filters.locationName) where.locationName = { contains: filters.locationName, mode: 'insensitive' };
    if (filters.currentUserName) where.currentUserName = { contains: filters.currentUserName, mode: 'insensitive' };
    if (filters.departmentName) where.departmentName = { contains: filters.departmentName, mode: 'insensitive' };
    const results = await prisma.asset.findMany({ where, take: 50, orderBy: { updatedAt: 'desc' } });
    return { filters, results };
  }

  static async detectAnomalies() {
    const created = [];
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const transfers = await prisma.toolStockTransaction.groupBy({ by: ['toolId'], where: { type: 'TRANSFER', createdAt: { gte: monthAgo } }, _count: { id: true } });
    for (const item of transfers.filter(t => t._count.id > 5)) {
      created.push(await this.createAnomalyOnce({ childId: null, assetId: null, type: 'FREQUENT_TRANSFER', severity: 'HIGH', message: `CCDC ${item.toolId} điều chuyển ${item._count.id} lần trong 30 ngày.` }));
    }
    const children = await prisma.cCDCChildItem.findMany({ where: { deletedAt: null } });
    for (const child of children) {
      if (!child.lastInventoryAt) created.push(await this.createAnomalyOnce({ childId: child.id, type: 'INVENTORY_OVERDUE', severity: 'MEDIUM', message: `${child.childCode} chưa có lịch sử kiểm kê.` }));
      if (child.childStatus === 'DAMAGED') created.push(await this.createAnomalyOnce({ childId: child.id, type: 'DAMAGED_PENDING', severity: 'HIGH', message: `${child.childCode} đang hỏng chưa xử lý.` }));
    }
    return created.filter(Boolean);
  }

  private static async createAnomalyOnce(data: any) {
    const existing = await prisma.assetAnomaly.findFirst({ where: { childId: data.childId || null, assetId: data.assetId || null, type: data.type, status: 'OPEN' } });
    if (existing) return null;
    return prisma.assetAnomaly.create({ data });
  }

  static async listAnomalies() {
    await this.detectAnomalies();
    return prisma.assetAnomaly.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  static async assetHealth(assetId: number) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId }, include: { repairTickets: true, histories: true } });
    if (!asset) throw new Error('Không tìm thấy tài sản.');
    const ageYears = asset.purchaseDate ? (Date.now() - new Date(asset.purchaseDate).getTime()) / (365 * 24 * 3600 * 1000) : 0;
    const repairCount = asset.repairTickets.length;
    const healthScore = Math.max(10, Math.round(100 - ageYears * 10 - repairCount * 12));
    const riskLevel = healthScore < 45 ? 'HIGH' : healthScore < 70 ? 'MEDIUM' : 'LOW';
    const recommendation = riskLevel === 'HIGH' ? 'Khuyến nghị thay thế trong 6 tháng' : riskLevel === 'MEDIUM' ? 'Theo dõi và kiểm tra định kỳ' : 'Tình trạng ổn định';
    const predictedReplaceDate = new Date();
    predictedReplaceDate.setMonth(predictedReplaceDate.getMonth() + (riskLevel === 'HIGH' ? 6 : 18));
    return prisma.assetLifecyclePrediction.create({ data: { assetId, healthScore, riskLevel, recommendation, predictedReplaceDate } });
  }

  static async assistantQuery(query: string) {
    const q = normalizeText(query);
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (q.includes('mat') || q.includes('lost')) {
      const count = await prisma.cCDCChildItem.count({ where: { childStatus: 'LOST', updatedAt: { gte: startMonth } } });
      return { answer: `Tháng này có ${count} mã con CCDC đang ở trạng thái báo mất.`, data: { lostThisMonth: count } };
    }
    if (q.includes('hong') || q.includes('damaged')) {
      const count = await prisma.cCDCChildItem.count({ where: { childStatus: 'DAMAGED' } });
      return { answer: `Hiện có ${count} mã con CCDC hỏng chưa xử lý.`, data: { damaged: count } };
    }
    const totalAssets = await prisma.asset.count({ where: { isDeleted: false } });
    const totalChildren = await prisma.cCDCChildItem.count({ where: { deletedAt: null } });
    return { answer: `Hệ thống đang quản lý ${totalAssets} tài sản và ${totalChildren} mã con CCDC.`, data: { totalAssets, totalChildren } };
  }
}
