import { PrismaClient } from '@prisma/client';
import { DocumentService } from './document.service';

const prisma = new PrismaClient();

export class RepairService {
  static async createTicket(data: any) {
    const { assetId, reportedBy, ...ticketData } = data;

    // 1. Check if asset exists and is not in prohibited statuses for repair
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      throw new Error("Tài sản không tồn tại.");
    }

    if (['DISPOSED', 'LOST', 'UNDER_REPAIR', 'PENDING_DISPOSAL'].includes(asset.status)) {
      throw new Error(`Không thể báo hỏng tài sản đang ở trạng thái: ${asset.status}`);
    }

    // 2. Check for open tickets (DRAFT, OPEN, IN_PROGRESS)
    const openTicket = await prisma.assetRepairTicket.findFirst({
      where: { assetId, status: { in: ['DRAFT', 'OPEN', 'IN_PROGRESS'] } }
    });

    if (openTicket) {
      throw new Error("Tài sản đang có một phiếu sửa chữa chưa hoàn tất.");
    }

    // 3. Generate repair code
    const count = await prisma.assetRepairTicket.count();
    const repairCode = `REP-${new Date().getFullYear()}${(count + 1).toString().padStart(5, '0')}`;

    // 4. Determine new asset status and ticket status
    const ticketStatus = ticketData.status || 'OPEN';
    let newAssetStatus = asset.status;
    
    if (ticketStatus !== 'DRAFT') {
      newAssetStatus = 'DAMAGED';
    }

    return await prisma.$transaction(async (tx) => {
      // Create ticket
      const ticket = await tx.assetRepairTicket.create({
        data: {
          ...ticketData,
          repairCode,
          assetId,
          reportedBy,
          status: ticketStatus,
          previousAssetStatus: asset.status
        }
      });

      // Update asset status if needed
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
          description: `Khởi tạo phiếu sửa chữa (${ticketStatus}): ${ticketData.damageDescription}`,
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
    const { performedBy, description, status, assetStatusAfterRepair, ...updateData } = data;

    // Normalize date fields: empty string to null, otherwise parsed to Date object
    const dateFields = ['sentToRepairDate', 'expectedFinishDate', 'actualFinishDate'];
    for (const field of dateFields) {
      if (updateData[field] === '' || updateData[field] === undefined) {
        updateData[field] = null;
      } else if (updateData[field] !== null) {
        updateData[field] = new Date(updateData[field]);
      }
    }

    // Normalize estimated and actual cost fields
    if ('estimatedCost' in updateData) {
      updateData.estimatedCost = updateData.estimatedCost === '' ? 0 : (parseFloat(updateData.estimatedCost) || 0);
    }
    if ('actualCost' in updateData) {
      updateData.actualCost = updateData.actualCost === '' ? 0 : (parseFloat(updateData.actualCost) || 0);
    }

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

      // Update asset status based on ticket status change
      if (status === 'IN_PROGRESS' && ticket.asset.status !== 'UNDER_REPAIR') {
        await tx.asset.update({
          where: { id: ticket.assetId },
          data: { status: 'UNDER_REPAIR' }
        });
      } else if (status === 'FAILED') {
        const nextAssetStatus = (updateData.repairAction === 'Thanh lý' || updateData.repairAction === 'Chuyển chờ thanh lý') ? 'PENDING_DISPOSAL' : 'DAMAGED';
        await tx.asset.update({
          where: { id: ticket.assetId },
          data: { status: nextAssetStatus }
        });
      } else if (status === 'CANCELLED') {
        const restoredStatus = ticket.previousAssetStatus || 'IN_STOCK';
        await tx.asset.update({
          where: { id: ticket.assetId },
          data: { status: restoredStatus }
        });
      } else if (status === 'OPEN' && ticket.status === 'DRAFT') {
        await tx.asset.update({
          where: { id: ticket.assetId },
          data: { status: 'DAMAGED' }
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
          actualFinishDate: (actualFinishDate && actualFinishDate !== '') ? new Date(actualFinishDate) : new Date(),
          actualCost: parseFloat(actualCost) || 0,
          result,
          note: note || ticket.note
        }
      });

      // Update asset status after repair
      let finalAssetStatus = assetStatusAfterRepair;
      if (!finalAssetStatus) {
        finalAssetStatus = ticket.asset.currentUserName ? 'ASSIGNED' : 'IN_STOCK';
      }

      await tx.asset.update({
        where: { id: ticket.assetId },
        data: { 
          status: finalAssetStatus,
          lastInventoryStatus: `REPAIR:${result}`
        }
      });

      await tx.assetRepairLog.create({
        data: {
          repairTicketId: id,
          assetId: ticket.assetId,
          action: 'COMPLETE',
          oldStatus: ticket.status,
          newStatus: 'COMPLETED',
          description: `Hoàn tất sửa chữa. Kết quả: ${result}. Trạng thái tài sản mới: ${finalAssetStatus}`,
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
    const { status, search, fromDate, toDate } = filters;
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

    if (fromDate || toDate) {
      where.reportedDate = {};
      if (fromDate) where.reportedDate.gte = new Date(String(fromDate));
      if (toDate) {
        const end = new Date(String(toDate));
        end.setHours(23, 59, 59, 999);
        where.reportedDate.lte = end;
      }
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
