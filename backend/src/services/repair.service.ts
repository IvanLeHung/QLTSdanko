import { PrismaClient } from '@prisma/client';
import { DocumentService } from './document.service';

const prisma = new PrismaClient();

export class RepairService {
  static async createTicket(data: any) {
    const { assetId, reportedBy, ...ticketData } = data;

    // 1. Check if asset exists and is not disposed
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });

    if (!asset || ['DISPOSED', 'LOST'].includes(asset.status)) {
      throw new Error("Tài sản không tồn tại hoặc đã thanh lý/mất.");
    }

    // 2. Check for open tickets
    const openTicket = await prisma.assetRepairTicket.findFirst({
      where: { assetId, status: { in: ['OPEN', 'IN_PROGRESS'] } }
    });

    if (openTicket) {
      throw new Error("Tài sản đang có một phiếu sửa chữa chưa hoàn tất.");
    }

    // 3. Generate repair code
    const count = await prisma.assetRepairTicket.count();
    const repairCode = `REP-${new Date().getFullYear()}${(count + 1).toString().padStart(5, '0')}`;

    // 4. Determine new asset status based on repairAction
    let newAssetStatus = asset.status;
    if (ticketData.repairAction === 'Sửa chữa' || ticketData.repairAction === 'Mang đi sửa') {
      newAssetStatus = 'UNDER_REPAIR';
    } else if (ticketData.repairAction === 'Không sửa được') {
      newAssetStatus = 'DAMAGED';
    } else if (ticketData.repairAction === 'Thanh lý') {
      newAssetStatus = 'PENDING_LIQUIDATION';
    }

    return await prisma.$transaction(async (tx) => {
      // Create ticket
      const ticket = await tx.assetRepairTicket.create({
        data: {
          ...ticketData,
          repairCode,
          assetId,
          reportedBy,
          status: 'OPEN'
        }
      });

      // Update asset status
      if (newAssetStatus !== asset.status) {
        await tx.asset.update({
          where: { id: assetId },
          data: { status: newAssetStatus }
        });
      }

      // Create Repair Log
      await tx.assetRepairLog.create({
        data: {
          repairTicketId: ticket.id,
          assetId,
          action: 'CREATE',
          newStatus: ticket.status,
          description: `Khởi tạo phiếu sửa chữa: ${ticketData.damageDescription}`,
          performedBy: reportedBy
        }
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          entityType: 'AssetRepairTicket',
          entityId: ticket.id,
          action: 'CREATE',
          details: JSON.stringify(ticket),
          performedBy: reportedBy
        }
      });

      // Create Asset Event
      await tx.assetEvent.create({
        data: {
          assetId,
          eventType: 'REPAIR_OPEN',
          eventDate: new Date(),
          description: `Mở phiếu sửa chữa ${repairCode}: ${ticketData.damageDescription}`,
          performedBy: reportedBy
        }
      });

      // Link Document BM03 (Biên bản hỏng)
      await DocumentService.linkDocument({
        entityType: 'AssetRepairTicket',
        entityId: ticket.id,
        templateCode: 'BM03',
        fileName: `BM03_${repairCode}.pdf`,
        fileUrl: `/docs/repairs/${repairCode}_BM03.pdf`,
        performedBy: reportedBy
      });

      return ticket;
    });
  }

  static async updateProgress(id: number, data: any) {
    const { performedBy, description, status, ...updateData } = data;

    const ticket = await prisma.assetRepairTicket.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!ticket) throw new Error("Phiếu sửa chữa không tồn tại.");

    return await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.assetRepairTicket.update({
        where: { id },
        data: {
          ...updateData,
          status: status || ticket.status
        }
      });

      // Update asset status if ticket status changed to IN_PROGRESS
      if (status === 'IN_PROGRESS' && ticket.asset.status !== 'UNDER_REPAIR') {
        await tx.asset.update({
          where: { id: ticket.assetId },
          data: { status: 'UNDER_REPAIR' }
        });
      }

      await tx.assetRepairLog.create({
        data: {
          repairTicketId: id,
          assetId: ticket.assetId,
          action: 'UPDATE_PROGRESS',
          oldStatus: ticket.status,
          newStatus: updatedTicket.status,
          description: description || "Cập nhật tiến độ sửa chữa",
          performedBy
        }
      });

      // Create Asset Event if status changed
      if (status) {
        await tx.assetEvent.create({
          data: {
            assetId: ticket.assetId,
            eventType: 'REPAIR_UPDATE',
            eventDate: new Date(),
            description: `Cập nhật trạng thái phiếu ${ticket.repairCode}: ${status}. Ghi chú: ${description || ''}`,
            performedBy
          }
        });
      }

      return updatedTicket;
    });
  }

  static async completeRepair(id: number, data: any) {
    const { performedBy, actualFinishDate, actualCost, result, assetStatusAfterRepair, note } = data;

    const ticket = await prisma.assetRepairTicket.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!ticket) throw new Error("Phiếu sửa chữa không tồn tại.");

    return await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.assetRepairTicket.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualFinishDate: actualFinishDate ? new Date(actualFinishDate) : new Date(),
          actualCost: parseFloat(actualCost) || 0,
          result,
          note: note || ticket.note
        }
      });

      // Update asset status after repair
      await tx.asset.update({
        where: { id: ticket.assetId },
        data: { 
          status: assetStatusAfterRepair || 'IN_STOCK',
          lastInventoryCondition: result // Optionally update condition
        }
      });

      await tx.assetRepairLog.create({
        data: {
          repairTicketId: id,
          assetId: ticket.assetId,
          action: 'COMPLETE',
          oldStatus: ticket.status,
          newStatus: 'COMPLETED',
          description: `Hoàn tất sửa chữa. Kết quả: ${result}. Trạng thái tài sản mới: ${assetStatusAfterRepair}`,
          cost: parseFloat(actualCost) || 0,
          performedBy
        }
      });

      // Create Asset Event
      await tx.assetEvent.create({
        data: {
          assetId: ticket.assetId,
          eventType: 'REPAIR_COMPLETE',
          eventDate: new Date(),
          description: `Hoàn tất sửa chữa phiếu ${ticket.repairCode}. Kết quả: ${result}. Chi phí: ${actualCost || 0}đ`,
          performedBy
        }
      });

      // Link Document BM10 (Biên bản sửa chữa)
      await DocumentService.linkDocument({
        entityType: 'AssetRepairTicket',
        entityId: ticket.id,
        templateCode: 'BM10',
        fileName: `BM10_${ticket.repairCode}.pdf`,
        fileUrl: `/docs/repairs/${ticket.repairCode}_BM10.pdf`,
        performedBy
      });

      return updatedTicket;
    });
  }

  static async getAssetRepairs(assetId: number) {
    return await prisma.assetRepairTicket.findMany({
      where: { assetId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getAllTickets(filters: any = {}) {
    const { status, search } = filters;
    const where: any = {};
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { repairCode: { contains: search } },
        { asset: { assetName: { contains: search } } },
        { asset: { assetCode: { contains: search } } }
      ];
    }

    return await prisma.assetRepairTicket.findMany({
      where,
      include: {
        asset: true,
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getTicketById(id: number) {
    return await prisma.assetRepairTicket.findUnique({
      where: { id },
      include: {
        asset: true,
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }
}
