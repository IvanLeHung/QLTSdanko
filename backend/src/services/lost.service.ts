import { PrismaClient } from '@prisma/client';
import { DocumentService } from './document.service';

const prisma = new PrismaClient();

export class LostService {
  static async reportLost(data: any) {
    const { assetId, reportedBy, ...lostData } = data;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });

    if (!asset || ['DISPOSED', 'LOST'].includes(asset.status)) {
      throw new Error("Tài sản không hợp lệ hoặc đã được ghi nhận mất/thanh lý.");
    }

    const count = await prisma.lostReport.count();
    const lostCode = `LOST-${new Date().getFullYear()}${(count + 1).toString().padStart(5, '0')}`;

    return await prisma.$transaction(async (tx) => {
      const report = await tx.lostReport.create({
        data: {
          ...lostData,
          lostCode,
          assetId,
          reportedBy,
          status: 'LOST',
          remainingValue: asset.purchasePriceExVat || 0
        }
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: 'LOST' }
      });

      await tx.lostReportLog.create({
        data: {
          lostReportId: report.id,
          assetId,
          action: 'CREATE',
          newStatus: 'LOST',
          description: `Ghi nhận mất tài sản. Người chịu trách nhiệm: ${lostData.responsibleUser}`,
          performedBy: reportedBy || 'System'
        }
      });

      await tx.assetEvent.create({
        data: {
          assetId,
          eventType: 'LOST_REPORTED',
          description: `Ghi nhận mất tài sản. Mã phiếu: ${lostCode}`,
          performedBy: reportedBy
        }
      });

      // Link Document BM13 (Biên bản ghi nhận mất)
      await DocumentService.linkDocument({
        entityType: 'LostReport',
        entityId: report.id,
        templateCode: 'BM13',
        fileName: `BM13_${lostCode}.pdf`,
        fileUrl: `/docs/lost/${lostCode}_BM13.pdf`,
        performedBy: reportedBy || 'System'
      });

      return report;
    });
  }

  static async findAsset(id: number, data: any) {
    const { performedBy, foundDate, foundLocation, conditionWhenFound, newAssetStatusAfterFound, note } = data;

    const report = await prisma.lostReport.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!report) throw new Error("Hồ sơ mất không tồn tại.");

    return await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.lostReport.update({
        where: { id },
        data: {
          status: 'FOUND',
          foundDate: new Date(foundDate),
          foundLocation,
          conditionWhenFound,
          newAssetStatusAfterFound,
          note: note || report.note,
          completedAt: new Date()
        }
      });

      await tx.asset.update({
        where: { id: report.assetId },
        data: { 
          status: newAssetStatusAfterFound,
          locationName: foundLocation
        }
      });

      await tx.lostReportLog.create({
        data: {
          lostReportId: id,
          assetId: report.assetId,
          action: 'FOUND',
          oldStatus: report.status,
          newStatus: 'FOUND',
          description: `Đã tìm thấy tài sản. Tình trạng: ${conditionWhenFound}. Trạng thái mới: ${newAssetStatusAfterFound}`,
          performedBy
        }
      });

      await tx.assetEvent.create({
        data: {
          assetId: report.assetId,
          eventType: 'LOST_FOUND',
          description: `Đã tìm thấy tài sản sau khi báo mất. Vị trí: ${foundLocation}`,
          performedBy
        }
      });

      return updatedReport;
    });
  }

  static async closeReport(id: number, data: any) {
    const { performedBy, note } = data;

    const report = await prisma.lostReport.findUnique({
      where: { id }
    });

    if (!report) throw new Error("Hồ sơ mất không tồn tại.");

    return await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.lostReport.update({
        where: { id },
        data: {
          status: 'CLOSED',
          note: note || report.note,
          completedAt: new Date()
        }
      });

      await tx.lostReportLog.create({
        data: {
          lostReportId: id,
          assetId: report.assetId,
          action: 'CLOSE',
          oldStatus: report.status,
          newStatus: 'CLOSED',
          description: `Xác nhận mất vĩnh viễn / Đóng hồ sơ.`,
          performedBy
        }
      });

      return updatedReport;
    });
  }

  static async getAllReports(filters: any = {}) {
    const { status, search } = filters;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { lostCode: { contains: search } },
        { asset: { assetName: { contains: search } } },
        { asset: { assetCode: { contains: search } } }
      ];
    }

    return await prisma.lostReport.findMany({
      where,
      include: {
        asset: true,
        logs: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getReportById(id: number) {
    return await prisma.lostReport.findUnique({
      where: { id },
      include: {
        asset: true,
        logs: { orderBy: { createdAt: 'desc' } }
      }
    });
  }
}
