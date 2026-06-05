import prisma from '../utils/prisma';
import { AuditService } from './audit.service';
import { parseAndNormalizeLocation } from '../utils/location.util';
import { generateDocumentNo } from '../utils/document';

export class ToolService {
  /**
   * Generates CCDC tool codes in format: CCDC.{NHOM}.{DONVI}.{NAM}.{STT}
   * STT is a 5-digit zero-padded running number unique to the Nhóm, Đơn vị and year.
   */
  static async generateToolCodes(
    params: {
      category?: string | null;
      branchName?: string | null;
      purchaseDate?: Date | null;
      quantity: number;
    },
    txClient?: any
  ) {
    const client = txClient || prisma;
    const { category, branchName, purchaseDate, quantity } = params;

    // 1. Resolve NHOM code from Category (e.g. "Event - Âm thanh" -> "EVENT")
    let nhomCode = 'GEN';
    if (category) {
      const parentCat = category.split('-')[0].trim().toLowerCase();
      if (parentCat.includes('decor')) nhomCode = 'DECOR';
      else if (parentCat.includes('event')) nhomCode = 'EVENT';
      else if (parentCat.includes('fb') || parentCat.includes('tiệc') || parentCat.includes('f&b')) nhomCode = 'FNB';
      else if (parentCat.includes('nội thất')) nhomCode = 'FURNITURE';
      else if (parentCat.includes('bất động sản') || parentCat.includes('bđs')) nhomCode = 'BDS';
      else if (parentCat.includes('marketing')) nhomCode = 'MKT';
      else if (parentCat.includes('media')) nhomCode = 'MEDIA';
      else if (parentCat.includes('kỹ thuật')) nhomCode = 'TECH';
      else if (parentCat.includes('kho vận')) nhomCode = 'KHO';
      else if (parentCat.includes('cntt')) nhomCode = 'CNTT';
      else if (parentCat.includes('tiêu hao')) nhomCode = 'CONSUMABLE';
      else if (parentCat.includes('merchandise')) nhomCode = 'MERCH';
      else if (parentCat.includes('branding')) nhomCode = 'BRAND';
      else if (parentCat.includes('dịch vụ vận hành')) nhomCode = 'OPS';
    }

    // 2. Resolve DONVI code from Branch Name (e.g. "Hà Nội" -> "HN")
    let donviCode = 'HQ';
    if (branchName) {
      const branchClean = branchName.trim().toLowerCase();
      if (branchClean.includes('hà nội')) donviCode = 'HN';
      else if (branchClean.includes('hồ chí minh') || branchClean.includes('hcm')) donviCode = 'HCM';
      else if (branchClean.includes('đà nẵng')) donviCode = 'DN';
      else if (branchClean.includes('thái nguyên')) donviCode = 'TN';
      else if (branchClean.includes('bắc giang')) donviCode = 'BG';
      else if (branchClean.includes('tuyên quang')) donviCode = 'TQ';
      else if (branchClean.includes('thanh hóa')) donviCode = 'TH';
      else if (branchClean.includes('phú thọ')) donviCode = 'PT';
      else if (branchClean.includes('hà nam')) donviCode = 'HNM';
      else {
        // Fallback: take first letters of each word
        const cleanName = branchName.trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '');
        const initials = cleanName.split(/\s+/).map(w => w[0]).join('').toUpperCase();
        donviCode = initials.substring(0, 4) || 'GEN';
      }
    }

    // 3. Resolve year
    const year = purchaseDate ? new Date(purchaseDate).getFullYear() : new Date().getFullYear();
    const baseCode = `CCDC.${nhomCode}.${donviCode}.${year}`;

    const execute = async (tx: any) => {
      // Find latest STT in the database using startsWith
      const existingTools = await tx.toolEquipment.findMany({
        where: {
          toolCode: {
            startsWith: `${baseCode}.`
          }
        },
        select: {
          toolCode: true
        }
      });

      let maxSeq = 0;
      for (const tool of existingTools) {
        const parts = tool.toolCode.split('.');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }

      // Also check documentCounter
      const counterKey = `TOOL_CODE_${nhomCode}_${donviCode}_${year}`;
      let counter = await tx.documentCounter.findUnique({
        where: { documentType: counterKey }
      });

      if (!counter) {
        counter = await tx.documentCounter.create({
          data: { documentType: counterKey, lastNumber: 0 }
        });
      }

      const startNumber = Math.max(counter.lastNumber, maxSeq) + 1;
      const endNumber = startNumber + quantity - 1;

      await tx.documentCounter.update({
        where: { id: counter.id },
        data: { lastNumber: endNumber }
      });

      const codes = [];
      for (let i = startNumber; i <= endNumber; i++) {
        const seqText = i.toString().padStart(5, '0');
        const toolCode = `${baseCode}.${seqText}`;
        codes.push({ runningNo: i, runningNoText: seqText, toolCode });
      }

      return codes;
    };

    if (txClient) {
      return await execute(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await execute(tx);
      }, { timeout: 30000 });
    }
  }

  static async generateSingleToolCode(
    params: {
      category?: string | null;
      branchName?: string | null;
      purchaseDate?: Date | null;
    },
    txClient?: any
  ) {
    const codes = await this.generateToolCodes({ ...params, quantity: 1 }, txClient);
    return codes[0];
  }

  /**
   * Get CCDC dashboard counts
   */
  static async getDashboardSummary() {
    const [
      totalTools,
      using,
      inStock,
      damaged,
      lost,
      liquidated,
      totalValue,
      recentLogs
    ] = await Promise.all([
      prisma.toolEquipment.count({ where: { isDeleted: false } }),
      prisma.toolEquipment.count({ where: { status: 'USING', isDeleted: false } }),
      prisma.toolEquipment.count({ where: { status: 'IN_STOCK', isDeleted: false } }),
      prisma.toolEquipment.count({ where: { status: 'DAMAGED', isDeleted: false } }),
      prisma.toolEquipment.count({ where: { status: 'LOST', isDeleted: false } }),
      prisma.toolEquipment.count({ where: { status: 'LIQUIDATED', isDeleted: false } }),
      prisma.toolEquipment.aggregate({
        where: { isDeleted: false },
        _sum: { purchasePrice: true }
      }),
      prisma.auditLog.findMany({
        where: { entityType: { in: ['TOOL', 'TOOL_EQUIPMENT'] } },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      totalTools,
      using,
      inStock,
      damaged,
      lost,
      liquidated,
      totalValue: totalValue._sum.purchasePrice || 0,
      recentLogs
    };
  }

  /**
   * Create new Tool
   */
  static async createTool(data: any, performedBy: string, txClient?: any) {
    const execute = async (tx: any) => {
      // Normalize location
      if (data.locationName) {
        const norm = parseAndNormalizeLocation(data.locationName);
        data.locationName = norm.fullFormatted;
        if (norm.city) data.cityName = norm.city;
        if (norm.project) data.projectName = norm.project;
      }

      // Auto generate code if missing
      if (!data.toolCode) {
        const gen = await this.generateSingleToolCode({
          category: data.category,
          branchName: data.branchName,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null
        }, tx);
        data.toolCode = gen.toolCode;
      }

      const tool = await tx.toolEquipment.create({
        data: {
          toolCode: data.toolCode,
          toolName: data.toolName,
          category: data.category,
          quantity: data.quantity ? Number(data.quantity) : 1,
          unit: data.unit || 'Cái',
          purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : 0,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          supplierName: data.supplierName,
          currentUserName: data.currentUserName,
          departmentName: data.departmentName,
          locationName: data.locationName,
          cityName: data.cityName,
          projectName: data.projectName,
          status: data.status || 'IN_STOCK',
          handoverDate: data.handoverDate ? new Date(data.handoverDate) : null,
          note: data.note,
          attachments: data.attachments,
          initialCondition: data.initialCondition,
          industryAttributesJson: data.industryAttributesJson,

          // CCDC Enterprise fields
          managementType: data.managementType || 'INDIVIDUAL',
          vat: data.vat ? Number(data.vat) : 0,
          shippingInstallCost: data.shippingInstallCost ? Number(data.shippingInstallCost) : 0,
          totalAmount: data.totalAmount ? Number(data.totalAmount) : 0,
          fundingSource: data.fundingSource || 'MUA_MOI',
          expectedUsefulLife: data.expectedUsefulLife ? Number(data.expectedUsefulLife) : null,
          expectedResidualValue: data.expectedResidualValue ? Number(data.expectedResidualValue) : null,
          companyName: data.companyName || null,
          branchName: data.branchName || null,
          buildingName: data.buildingName || null,
          floorName: data.floorName || null,
          areaName: data.areaName || null,
          specificLocation: data.specificLocation || null,
          operationalSpecsJson: data.operationalSpecsJson || null,
          filesJson: data.filesJson || null,
          warrantyInfoJson: data.warrantyInfoJson || null,
          customFieldsJson: data.customFieldsJson || null
        }
      });

      // QUANTITY type stock initialization
      if (tool.managementType === 'QUANTITY') {
        const loc = tool.locationName || 'KHO CCDC';
        await tx.toolStock.create({
          data: {
            toolId: tool.id,
            locationName: loc,
            quantityAvailable: tool.quantity,
            quantityUsing: 0,
            quantityBroken: 0,
            quantityLost: 0,
            quantityDestroyed: 0
          }
        });

        await tx.toolBatch.create({
          data: {
            toolId: tool.id,
            batchNumber: 'LOT001',
            quantity: tool.quantity,
            purchasePrice: tool.purchasePrice || 0,
            purchaseDate: tool.purchaseDate,
            supplierName: tool.supplierName
          }
        });

        await tx.toolStockTransaction.create({
          data: {
            toolId: tool.id,
            type: 'IMPORT',
            quantity: tool.quantity,
            toLocation: loc,
            performedBy,
            note: 'Nhập mới CCDC'
          }
        });
      }

      // Write initial history
      await tx.toolHistory.create({
        data: {
          toolId: tool.id,
          toolCode: tool.toolCode,
          eventTime: new Date(),
          actionType: 'CREATE',
          newStatus: tool.status,
          newUserName: tool.currentUserName,
          newDepartmentName: tool.departmentName,
          newLocationName: tool.locationName,
          newCityName: tool.cityName,
          newNote: 'Khởi tạo CCDC mới'
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: tool.id,
        action: 'CREATE',
        details: { toolCode: tool.toolCode, toolName: tool.toolName },
        performedBy,
        tx
      });

      return tool;
    };

    if (txClient) {
      return await execute(txClient);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await execute(tx);
      });
    }
  }

  /**
   * Create multiple tools in a single transaction (Bulk create)
   */
  static async createToolsBulk(dataList: any[], performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const data of dataList) {
        const tool = await this.createTool(data, performedBy, tx);
        results.push(tool);
      }
      return results;
    }, { timeout: 60000 });
  }

  /**
   * Update Tool details
   */
  static async updateTool(id: number, updates: any, performedBy: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const oldTool = await tx.toolEquipment.findUnique({ where: { id } });
      if (!oldTool) throw new Error('Không tìm thấy CCDC.');

      // Normalize location
      if (updates.locationName) {
        const norm = parseAndNormalizeLocation(updates.locationName);
        updates.locationName = norm.fullFormatted;
        if (norm.city) updates.cityName = norm.city;
        if (norm.project) updates.projectName = norm.project;
      }

      // Convert date strings and numbers safely
      if (updates.purchaseDate) updates.purchaseDate = new Date(updates.purchaseDate);
      if (updates.handoverDate) updates.handoverDate = new Date(updates.handoverDate);
      if (updates.quantity !== undefined && updates.quantity !== null) updates.quantity = Number(updates.quantity);
      if (updates.purchasePrice !== undefined && updates.purchasePrice !== null) updates.purchasePrice = Number(updates.purchasePrice);
      if (updates.vat !== undefined && updates.vat !== null) updates.vat = Number(updates.vat);
      if (updates.shippingInstallCost !== undefined && updates.shippingInstallCost !== null) updates.shippingInstallCost = Number(updates.shippingInstallCost);
      if (updates.totalAmount !== undefined && updates.totalAmount !== null) updates.totalAmount = Number(updates.totalAmount);
      if (updates.expectedUsefulLife !== undefined && updates.expectedUsefulLife !== null) updates.expectedUsefulLife = Number(updates.expectedUsefulLife);
      if (updates.expectedResidualValue !== undefined && updates.expectedResidualValue !== null) updates.expectedResidualValue = Number(updates.expectedResidualValue);

      const updated = await tx.toolEquipment.update({
        where: { id },
        data: updates
      });

      // Log changes to ToolHistory
      const changes: Record<string, { old: any; new: any }> = {};
      const fieldsToTrack = [
        'status', 'currentUserName', 'departmentName', 'locationName',
        'cityName', 'projectName', 'toolName', 'purchasePrice', 'unit',
        'purchaseDate', 'supplierName', 'toolCode', 'note', 'industryAttributesJson',
        'managementType', 'vat', 'shippingInstallCost', 'totalAmount', 'fundingSource',
        'expectedUsefulLife', 'expectedResidualValue', 'companyName', 'branchName',
        'buildingName', 'floorName', 'areaName', 'specificLocation',
        'operationalSpecsJson', 'filesJson', 'warrantyInfoJson', 'customFieldsJson'
      ];

      for (const field of fieldsToTrack) {
        const oldVal = (oldTool as any)[field] instanceof Date ? (oldTool as any)[field].toISOString() : (oldTool as any)[field];
        const newVal = (updated as any)[field] instanceof Date ? (updated as any)[field].toISOString() : (updated as any)[field];
        
        if (oldVal !== newVal) {
          changes[field] = { old: oldVal, new: newVal };
        }
      }

      if (Object.keys(changes).length > 0) {
        await tx.toolHistory.create({
          data: {
            toolId: updated.id,
            toolCode: updated.toolCode,
            eventTime: new Date(),
            actionType: 'UPDATE',
            oldStatus: oldTool.status,
            newStatus: updated.status,
            oldUserName: oldTool.currentUserName,
            newUserName: updated.currentUserName,
            oldLocationName: oldTool.locationName,
            newLocationName: updated.locationName,
            oldDepartmentName: oldTool.departmentName,
            newDepartmentName: updated.departmentName,
            oldNote: reason || 'Cập nhật thông tin chi tiết',
          }
        });

        await AuditService.log({
          entityType: 'TOOL_EQUIPMENT',
          entityId: updated.id,
          action: 'UPDATE',
          details: { changes, reason: reason || null },
          performedBy,
          tx
        });
      }

      return updated;
    });
  }

  /**
   * Soft delete tool
   */
  static async deleteTool(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({ where: { id } });
      if (!tool) throw new Error('Không tìm thấy CCDC.');

      await tx.toolEquipment.update({
        where: { id },
        data: { isDeleted: true }
      });

      await tx.toolHistory.create({
        data: {
          toolId: tool.id,
          toolCode: tool.toolCode,
          eventTime: new Date(),
          actionType: 'DELETE',
          oldStatus: tool.status,
          newStatus: 'DELETED',
          oldNote: 'Xóa CCDC'
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: tool.id,
        action: 'DELETE',
        details: { toolCode: tool.toolCode, toolName: tool.toolName },
        performedBy,
        tx
      });
    });
  }

  /**
   * Get CCDC List with filters
   */
  static async getTools(params: {
    status?: string;
    category?: string;
    departmentName?: string;
    locationName?: string;
    currentUserName?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      status,
      category,
      departmentName,
      locationName,
      currentUserName,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const where: any = { isDeleted: false };

    if (status && status !== 'ALL') where.status = status;
    if (category && category !== 'ALL') where.category = category;
    if (departmentName && departmentName !== 'ALL') where.departmentName = departmentName;
    if (locationName && locationName !== 'ALL') where.locationName = { contains: locationName };
    if (currentUserName && currentUserName !== 'ALL') where.currentUserName = { contains: currentUserName };

    if (search) {
      where.OR = [
        { toolCode: { contains: search, mode: 'insensitive' } },
        { toolName: { contains: search, mode: 'insensitive' } },
        { currentUserName: { contains: search, mode: 'insensitive' } },
        { departmentName: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.toolEquipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.toolEquipment.count({ where })
    ]);

    return { items, total, page, limit };
  }

  /**
   * Get detailed profile of CCDC
   */
  static async getToolDetail(id: number) {
    return await prisma.toolEquipment.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { createdAt: 'desc' } },
        repairTickets: { orderBy: { createdAt: 'desc' } },
        damageReports: { include: { damageReport: true } },
        lostReports: { orderBy: { createdAt: 'desc' } },
        liquidations: { include: { liquidationRecord: true } },
        inventoryItems: { include: { inventoryCheck: true }, orderBy: { checkedAt: 'desc' } },
        histories: { orderBy: { eventTime: 'desc' } },
        stocks: true,
        batches: { orderBy: { createdAt: 'asc' } },
        stockTransactions: { orderBy: { createdAt: 'desc' } }
      }
    });
  }

  /**
   * Export tools registry to CSV string
   */
  static async exportTools(ids?: number[]): Promise<string> {
    const where: any = { isDeleted: false };
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const tools = await prisma.toolEquipment.findMany({
      where,
      orderBy: { toolCode: 'asc' }
    });

    const rows = [
      ['Mã CCDC', 'Tên CCDC', 'Nhóm CCDC', 'Số lượng', 'ĐVT', 'Giá trị', 'Ngày mua', 'Nhà cung cấp', 'Người sử dụng', 'Phòng ban sử dụng', 'Vị trí/Kho', 'Tỉnh/TP', 'Dự án', 'Trạng thái', 'Ghi chú']
    ];

    const formatStatus = (s: string) => {
      switch (s) {
        case 'IN_STOCK': return 'Trong kho';
        case 'USING': return 'Đang sử dụng';
        case 'DAMAGED': return 'Báo hỏng';
        case 'LOST': return 'Mất';
        case 'LIQUIDATED': return 'Đã thanh lý';
        default: return s;
      }
    };

    for (const t of tools) {
      rows.push([
        t.toolCode,
        t.toolName,
        t.category,
        t.quantity.toString(),
        t.unit || 'Cái',
        (t.purchasePrice || 0).toString(),
        t.purchaseDate ? new Date(t.purchaseDate).toLocaleDateString('vi-VN') : '',
        t.supplierName || '',
        t.currentUserName || '',
        t.departmentName || '',
        t.locationName || '',
        t.cityName || '',
        t.projectName || '',
        formatStatus(t.status),
        t.note || ''
      ]);
    }

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    return csvContent;
  }

  // --- LIFECYCLE TRANSACTIONS ---

  /**
   * Tool Handover / Recall / Transfer
   */
  static async createHandover(data: {
    type: 'HANDOVER' | 'TRANSFER' | 'RECALL';
    recipientName: string;
    recipientPosition?: string;
    recipientDepartment?: string;
    recipientPhone?: string;
    receiverId?: number;
    receiverDepartmentId?: number;
    newLocation?: string;
    newCity?: string;
    targetLocationId?: number;
    senderName?: string;
    senderDepartment?: string;
    senderPosition?: string;
    senderId?: number;
    note?: string;
    reason?: string;
    toolIds: number[];
    autoComplete?: boolean;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const typeCode = data.type === 'HANDOVER' ? 'BBBG-CCDC' : (data.type === 'RECALL' ? 'BBTH-CCDC' : 'BBDC-CCDC');
      const documentNo = await generateDocumentNo(tx, typeCode);
      const normalizedLoc = data.newLocation ? parseAndNormalizeLocation(data.newLocation) : null;

      if (!data.toolIds || data.toolIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 CCDC.');
      }

      // Check locks and state
      for (const toolId of data.toolIds) {
        const tool = await tx.toolEquipment.findUnique({ where: { id: toolId } });
        if (!tool) throw new Error(`CCDC ID ${toolId} không tồn tại.`);
        if (tool.status === 'LIQUIDATED') throw new Error(`CCDC ${tool.toolCode} đã bị thanh lý.`);
        if (tool.status === 'LOST') throw new Error(`CCDC ${tool.toolCode} đã bị báo mất.`);
      }

      const document = await tx.toolHandoverDocument.create({
        data: {
          documentNo,
          type: data.type,
          recipientName: data.recipientName,
          recipientPosition: data.recipientPosition,
          recipientDepartment: data.recipientDepartment,
          recipientPhone: data.recipientPhone,
          receiverId: data.receiverId,
          receiverDepartmentId: data.receiverDepartmentId,
          newLocation: normalizedLoc?.fullFormatted || data.newLocation,
          newCity: normalizedLoc?.city || data.newCity,
          targetLocationId: data.targetLocationId,
          senderName: data.senderName,
          senderDepartment: data.senderDepartment,
          senderPosition: data.senderPosition,
          senderId: data.senderId,
          reason: data.reason,
          note: data.note,
          status: data.autoComplete ? 'COMPLETED' : 'DRAFT',
          confirmedAt: data.autoComplete ? new Date() : null,
          items: {
            create: await Promise.all(data.toolIds.map(async (id) => {
              const tool = await tx.toolEquipment.findUnique({ where: { id } });
              if (!tool) throw new Error(`Tool ID ${id} not found`);
              const itemNewStatus = data.type === 'RECALL' ? 'IN_STOCK' : 'USING';
              return {
                toolId: tool.id,
                toolCode: tool.toolCode,
                toolName: tool.toolName,
                unit: tool.unit,
                oldStatus: tool.status,
                newStatus: itemNewStatus
              };
            }))
          }
        },
        include: { items: true }
      });

      if (data.autoComplete) {
        for (const item of document.items) {
          const oldTool = await tx.toolEquipment.findUnique({ where: { id: item.toolId } });
          if (!oldTool) continue;

          const isStock = item.newStatus === 'IN_STOCK';
          const updated = await tx.toolEquipment.update({
            where: { id: item.toolId },
            data: {
              status: item.newStatus || 'USING',
              currentUserName: isStock ? null : data.recipientName,
              departmentName: data.type === 'RECALL' ? null : data.recipientDepartment,
              locationName: normalizedLoc?.fullFormatted || data.newLocation,
              cityName: normalizedLoc?.city || data.newCity,
              projectName: normalizedLoc?.project || undefined,
              handoverDate: isStock ? null : new Date(),
            }
          });

          // Assignment log
          await tx.toolAssignment.create({
            data: {
              toolId: item.toolId,
              previousUserName: oldTool.currentUserName,
              newUserName: isStock ? 'KHO CCDC' : data.recipientName,
              newPosition: isStock ? null : data.recipientPosition,
              newDepartmentName: data.recipientDepartment,
              newLocationName: normalizedLoc?.fullFormatted || data.newLocation,
              newCityName: normalizedLoc?.city || data.newCity,
              newStatus: item.newStatus || 'USING',
              effectiveAt: new Date(),
              note: `Biên bản ${documentNo} (${data.type === 'RECALL' ? 'Thu hồi' : (data.type === 'TRANSFER' ? 'Luân chuyển' : 'Bàn giao')})`
            }
          });

          // History
          await tx.toolHistory.create({
            data: {
              toolId: item.toolId,
              toolCode: oldTool.toolCode,
              eventTime: new Date(),
              actionType: data.type,
              oldStatus: oldTool.status,
              newStatus: updated.status,
              oldUserName: oldTool.currentUserName,
              newUserName: updated.currentUserName,
              oldLocationName: oldTool.locationName,
              newLocationName: updated.locationName,
              oldDepartmentName: oldTool.departmentName,
              newDepartmentName: updated.departmentName,
              oldNote: `Hoàn tất biên bản ${documentNo}`,
            }
          });

          await AuditService.log({
            entityType: 'TOOL_EQUIPMENT',
            entityId: item.toolId,
            action: 'ASSIGN',
            details: { documentNo, type: data.type, oldUserName: oldTool.currentUserName, newUserName: updated.currentUserName },
            performedBy,
            tx
          });
        }
      }

      await AuditService.log({
        entityType: 'HANDOVER',
        entityId: document.id,
        action: (data.autoComplete ? 'CREATE_AND_COMPLETE' : 'CREATE') as any,
        details: { documentNo, type: data.type, toolCount: data.toolIds.length, isTool: true },
        performedBy,
        tx
      });

      return document;
    });
  }

  static async completeHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.toolHandoverDocument.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!doc) throw new Error('Biên bản không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Biên bản đã được hoàn tất trước đó.');
      if (doc.status === 'CANCELLED') throw new Error('Không thể hoàn tất biên bản đã hủy.');

      const normalizedLoc = doc.newLocation ? parseAndNormalizeLocation(doc.newLocation) : null;

      for (const item of doc.items) {
        const oldTool = await tx.toolEquipment.findUnique({ where: { id: item.toolId } });
        if (!oldTool) continue;

        const isStock = item.newStatus === 'IN_STOCK';
        const updated = await tx.toolEquipment.update({
          where: { id: item.toolId },
          data: {
            status: item.newStatus || 'USING',
            currentUserName: isStock ? null : doc.recipientName,
            departmentName: doc.type === 'RECALL' ? null : doc.recipientDepartment,
            locationName: normalizedLoc?.fullFormatted || doc.newLocation,
            cityName: normalizedLoc?.city || doc.newCity,
            projectName: normalizedLoc?.project || undefined,
            handoverDate: isStock ? null : doc.documentDate,
          }
        });

        await tx.toolAssignment.create({
          data: {
            toolId: item.toolId,
            previousUserName: oldTool.currentUserName,
            newUserName: isStock ? 'KHO CCDC' : doc.recipientName,
            newPosition: isStock ? null : doc.recipientPosition,
            newDepartmentName: doc.recipientDepartment,
            newLocationName: normalizedLoc?.fullFormatted || doc.newLocation,
            newCityName: normalizedLoc?.city || doc.newCity,
            newStatus: item.newStatus || 'USING',
            effectiveAt: doc.documentDate,
            note: `Biên bản ${doc.documentNo}`
          }
        });

        await tx.toolHistory.create({
          data: {
            toolId: item.toolId,
            toolCode: oldTool.toolCode,
            eventTime: new Date(),
            actionType: doc.type,
            oldStatus: oldTool.status,
            newStatus: updated.status,
            oldUserName: oldTool.currentUserName,
            newUserName: updated.currentUserName,
            oldLocationName: oldTool.locationName,
            newLocationName: updated.locationName,
            oldDepartmentName: oldTool.departmentName,
            newDepartmentName: updated.departmentName,
            oldNote: `Xác nhận biên bản ${doc.documentNo}`,
          }
        });

        await AuditService.log({
          entityType: 'TOOL_EQUIPMENT',
          entityId: item.toolId,
          action: 'ASSIGN',
          details: { documentNo: doc.documentNo, type: doc.type, oldUserName: oldTool.currentUserName, newUserName: updated.currentUserName },
          performedBy,
          tx
        });
      }

      const updatedDoc = await tx.toolHandoverDocument.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          confirmedAt: new Date()
        }
      });

      return updatedDoc;
    });
  }

  static async cancelHandover(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const doc = await tx.toolHandoverDocument.findUnique({ where: { id } });
      if (!doc) throw new Error('Biên bản không tồn tại.');
      if (doc.status === 'COMPLETED') throw new Error('Không thể hủy biên bản đã hoàn tất.');

      const updated = await tx.toolHandoverDocument.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      return updated;
    });
  }

  /**
   * Tool Repair / Damage Tickets
   */
  static async createRepairTicket(data: {
    toolId: number;
    reportedBy: string;
    damageLevel?: string;
    damageDescription: string;
    cause?: string;
    canContinueUsing?: boolean;
    repairVendor?: string;
    estimatedCost?: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({ where: { id: data.toolId } });
      if (!tool) throw new Error('CCDC không tồn tại.');

      const repairCode = await generateDocumentNo(tx, 'SC-CCDC');

      const ticket = await tx.toolRepairTicket.create({
        data: {
          repairCode,
          toolId: data.toolId,
          reportedBy: data.reportedBy,
          damageLevel: data.damageLevel,
          damageDescription: data.damageDescription,
          cause: data.cause,
          canContinueUsing: data.canContinueUsing ?? true,
          repairVendor: data.repairVendor,
          estimatedCost: data.estimatedCost ? Number(data.estimatedCost) : 0,
          status: 'OPEN',
          previousToolStatus: tool.status,
          note: data.note
        }
      });

      // Update tool status
      await tx.toolEquipment.update({
        where: { id: data.toolId },
        data: { status: 'DAMAGED' }
      });

      await tx.toolHistory.create({
        data: {
          toolId: tool.id,
          toolCode: tool.toolCode,
          eventTime: new Date(),
          actionType: 'DAMAGE',
          oldStatus: tool.status,
          newStatus: 'DAMAGED',
          oldNote: `Báo hỏng: ${data.damageDescription} (Phiếu ${repairCode})`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: tool.id,
        action: 'DAMAGE',
        details: { repairCode, damageDescription: data.damageDescription },
        performedBy,
        tx
      });

      return ticket;
    });
  }

  static async completeRepairTicket(id: number, data: {
    actualCost?: number;
    repairAction?: string;
    result: 'FIXED' | 'CANNOT_FIX';
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const ticket = await tx.toolRepairTicket.findUnique({ where: { id } });
      if (!ticket) throw new Error('Phiếu sửa chữa không tồn tại.');
      if (ticket.status === 'COMPLETED') throw new Error('Phiếu sửa chữa đã hoàn tất.');

      const tool = await tx.toolEquipment.findUnique({ where: { id: ticket.toolId } });
      if (!tool) throw new Error('CCDC không tồn tại.');

      const newStatus = data.result === 'FIXED' ? (ticket.previousToolStatus || 'USING') : 'DAMAGED';

      const updatedTicket = await tx.toolRepairTicket.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualCost: data.actualCost ? Number(data.actualCost) : 0,
          repairAction: data.repairAction,
          actualFinishDate: new Date(),
          result: data.result,
          note: data.note
        }
      });

      // Update tool status
      await tx.toolEquipment.update({
        where: { id: ticket.toolId },
        data: { status: newStatus }
      });

      await tx.toolHistory.create({
        data: {
          toolId: tool.id,
          toolCode: tool.toolCode,
          eventTime: new Date(),
          actionType: 'REPAIR',
          oldStatus: tool.status,
          newStatus: newStatus,
          oldNote: `Hoàn tất sửa chữa (Phiếu ${ticket.repairCode}): Kết quả ${data.result === 'FIXED' ? 'Đã sửa được' : 'Không thể sửa'}`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: tool.id,
        action: 'REPAIR',
        details: { repairCode: ticket.repairCode, result: data.result, cost: data.actualCost },
        performedBy,
        tx
      });

      return updatedTicket;
    });
  }

  /**
   * Tool Lost Report
   */
  static async createLostReport(data: {
    toolId: number;
    reportedBy: string;
    incidentDescription: string;
    responsibleUser?: string;
    responsibleDepartment?: string;
    remainingValue?: number;
    compensationNote?: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({ where: { id: data.toolId } });
      if (!tool) throw new Error('CCDC không tồn tại.');

      const lostCode = await generateDocumentNo(tx, 'BM-MAT-CCDC');

      const report = await tx.toolLostReport.create({
        data: {
          lostCode,
          toolId: data.toolId,
          reportedBy: data.reportedBy,
          incidentDescription: data.incidentDescription,
          responsibleUser: data.responsibleUser,
          responsibleDepartment: data.responsibleDepartment,
          remainingValue: data.remainingValue ? Number(data.remainingValue) : 0,
          compensationNote: data.compensationNote,
          status: 'LOST',
          note: data.note
        }
      });

      // Update tool status
      await tx.toolEquipment.update({
        where: { id: data.toolId },
        data: { status: 'LOST' }
      });

      await tx.toolHistory.create({
        data: {
          toolId: tool.id,
          toolCode: tool.toolCode,
          eventTime: new Date(),
          actionType: 'LOST',
          oldStatus: tool.status,
          newStatus: 'LOST',
          oldNote: `Báo mất: ${data.incidentDescription} (Phiếu ${lostCode})`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: tool.id,
        action: 'LOST',
        details: { lostCode, incidentDescription: data.incidentDescription },
        performedBy,
        tx
      });

      return report;
    });
  }

  /**
   * Tool Liquidation / Disposal
   */
  static async createLiquidation(data: {
    toolIds: number[];
    reason?: string;
    buyerName?: string;
    totalValue?: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const liquidationCode = await generateDocumentNo(tx, 'TL-CCDC');

      const record = await tx.toolLiquidationRecord.create({
        data: {
          liquidationCode,
          liquidationType: 'LIQUIDATION',
          reason: data.reason,
          buyerName: data.buyerName,
          totalValue: data.totalValue ? Number(data.totalValue) : 0,
          status: 'COMPLETED',
          note: data.note,
          items: {
            create: await Promise.all(data.toolIds.map(async (id) => {
              const tool = await tx.toolEquipment.findUnique({ where: { id } });
              if (!tool) throw new Error(`CCDC ID ${id} không tồn tại.`);
              return {
                toolId: id,
                toolValue: tool.purchasePrice || 0
              };
            }))
          }
        },
        include: { items: true }
      });

      for (const item of record.items) {
        const tool = await tx.toolEquipment.findUnique({ where: { id: item.toolId } });
        if (!tool) continue;

        // Update status to liquidated
        await tx.toolEquipment.update({
          where: { id: item.toolId },
          data: { status: 'LIQUIDATED' }
        });

        await tx.toolHistory.create({
          data: {
            toolId: tool.id,
            toolCode: tool.toolCode,
            eventTime: new Date(),
            actionType: 'LIQUIDATED',
            oldStatus: tool.status,
            newStatus: 'LIQUIDATED',
            oldNote: `Thanh lý CCDC (Quyết định ${liquidationCode}). Lý do: ${data.reason}`
          }
        });

        await AuditService.log({
          entityType: 'TOOL_EQUIPMENT',
          entityId: tool.id,
          action: 'LIQUIDATE',
          details: { liquidationCode, reason: data.reason },
          performedBy,
          tx
        });
      }

      return record;
    });
  }

  /**
   * Tool Inventory checks
   */
  static async createInventoryCheck(data: {
    inventoryName: string;
    note?: string;
    scopeType?: string;
    scopeValue?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const inventoryCode = await generateDocumentNo(tx, 'KK-CCDC');

      // Fetch expected tools based on scope
      const where: any = { isDeleted: false, status: { in: ['IN_STOCK', 'USING', 'DAMAGED'] } };
      if (data.scopeType === 'DEPARTMENT' && data.scopeValue) {
        where.departmentName = data.scopeValue;
      } else if (data.scopeType === 'LOCATION' && data.scopeValue) {
        where.locationName = { contains: data.scopeValue };
      }

      const expectedTools = await tx.toolEquipment.findMany({ where });

      const check = await tx.toolInventoryCheck.create({
        data: {
          inventoryCode,
          inventoryName: data.inventoryName,
          inventoryDate: new Date(),
          status: 'OPEN',
          scopeType: data.scopeType,
          scopeValue: data.scopeValue,
          note: data.note,
          items: {
            create: expectedTools.map(t => ({
              toolId: t.id,
              toolCode: t.toolCode,
              expectedStatus: t.status,
              expectedLocation: t.locationName,
              checkStatus: 'PENDING'
            }))
          }
        },
        include: { items: true }
      });

      return check;
    });
  }

  static async submitItemCheck(checkId: number, data: {
    toolId: number;
    actualStatus: string;
    actualLocation?: string;
    quality?: string;
    checkCondition: 'FOUND' | 'MISSING' | 'DAMAGED' | 'WRONG_LOCATION';
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const checkItem = await tx.toolInventoryItem.findFirst({
        where: { inventoryCheckId: checkId, toolId: data.toolId }
      });

      if (!checkItem) throw new Error('CCDC không nằm trong đợt kiểm kê này.');

      // Calculate matching result
      let result = 'MATCHED';
      if (data.checkCondition === 'MISSING') {
        result = 'MISSING';
      } else if (data.actualStatus !== checkItem.expectedStatus) {
        result = 'WRONG_STATUS';
      } else if (data.actualLocation && data.actualLocation !== checkItem.expectedLocation) {
        result = 'WRONG_LOCATION';
      } else if (data.checkCondition === 'DAMAGED') {
        result = 'DAMAGED';
      }

      const updatedItem = await tx.toolInventoryItem.update({
        where: { id: checkItem.id },
        data: {
          actualStatus: data.actualStatus,
          actualLocation: data.actualLocation,
          quality: data.quality,
          checkCondition: data.checkCondition,
          note: data.note,
          result,
          checkStatus: 'CHECKED',
          checkedAt: new Date(),
          checkedBy: performedBy
        }
      });

      return updatedItem;
    });
  }

  static async completeInventoryCheck(id: number, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const check = await tx.toolInventoryCheck.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!check) throw new Error('Phiếu kiểm kê không tồn tại.');
      if (check.status === 'COMPLETED') throw new Error('Phiếu kiểm kê đã hoàn tất.');

      // Update CCDC database entries after inventory
      for (const item of check.items) {
        if (item.checkStatus === 'CHECKED') {
          const updates: any = {};
          if (item.actualStatus) updates.status = item.actualStatus;
          if (item.actualLocation) updates.locationName = item.actualLocation;

          if (Object.keys(updates).length > 0) {
            const tool = await tx.toolEquipment.findUnique({ where: { id: item.toolId } });
            if (!tool) continue;

            await tx.toolEquipment.update({
              where: { id: item.toolId },
              data: updates
            });

            await tx.toolHistory.create({
              data: {
                toolId: item.toolId,
                toolCode: item.toolCode,
                eventTime: new Date(),
                actionType: 'INVENTORY',
                oldStatus: tool.status,
                newStatus: updates.status || tool.status,
                oldLocationName: tool.locationName,
                newLocationName: updates.locationName || tool.locationName,
                oldNote: `Cập nhật dữ liệu từ phiếu kiểm kê ${check.inventoryCode}. Kết quả: ${item.result}`
              }
            });
          }
        }
      }

      const updatedCheck = await tx.toolInventoryCheck.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });

      return updatedCheck;
    });
  }

  // --- QUANTITY STOCK MANAGEMENT TRANSACTION SERVICES ---

  static async transferStock(data: {
    toolId: number;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({ where: { id: data.toolId } });
      if (!tool) throw new Error('Không tìm thấy CCDC.');

      const sourceStock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.fromLocation } }
      });
      if (!sourceStock || sourceStock.quantityAvailable < data.quantity) {
        throw new Error(`Số lượng khả dụng tại nguồn không đủ (Hiện có: ${sourceStock?.quantityAvailable || 0}).`);
      }

      await tx.toolStock.update({
        where: { id: sourceStock.id },
        data: { quantityAvailable: { decrement: data.quantity } }
      });

      await tx.toolStock.upsert({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.toLocation } },
        create: {
          toolId: data.toolId,
          locationName: data.toLocation,
          quantityAvailable: data.quantity
        },
        update: {
          quantityAvailable: { increment: data.quantity }
        }
      });

      const stockTx = await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'TRANSFER',
          quantity: data.quantity,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          performedBy,
          note: data.note || 'Điều chuyển CCDC'
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'TRANSFER_STOCK' as any,
        details: { quantity: data.quantity, from: data.fromLocation, to: data.toLocation, note: data.note },
        performedBy,
        tx
      });

      return stockTx;
    });
  }

  static async allocateStock(data: {
    toolId: number;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const sourceStock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.fromLocation } }
      });
      if (!sourceStock || sourceStock.quantityAvailable < data.quantity) {
        throw new Error('Số lượng khả dụng không đủ.');
      }
      await tx.toolStock.update({
        where: { id: sourceStock.id },
        data: { quantityAvailable: { decrement: data.quantity } }
      });
      await tx.toolStock.upsert({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.toLocation } },
        create: {
          toolId: data.toolId,
          locationName: data.toLocation,
          quantityUsing: data.quantity
        },
        update: {
          quantityUsing: { increment: data.quantity }
        }
      });
      return await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'USE',
          quantity: data.quantity,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          performedBy,
          note: data.note || 'Cấp phát sử dụng'
        }
      });
    });
  }

  static async recallStock(data: {
    toolId: number;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    qtyGood: number;
    qtyBroken: number;
    qtyLost: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({ where: { id: data.toolId } });
      if (!tool) throw new Error('Không tìm thấy CCDC.');

      if (data.qtyGood + data.qtyBroken + data.qtyLost !== data.quantity) {
        throw new Error('Tổng số lượng thu hồi chi tiết không khớp tổng số lượng yêu cầu.');
      }

      const sourceStock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.fromLocation } }
      });
      if (!sourceStock) {
        throw new Error(`Không tìm thấy thông tin tồn kho tại vị trí ${data.fromLocation}.`);
      }
      const sourceUsing = sourceStock.quantityUsing;
      if (sourceUsing < data.quantity) {
        throw new Error(`Số lượng đang sử dụng tại nguồn không đủ (Hiện có: ${sourceUsing}).`);
      }

      await tx.toolStock.update({
        where: { id: sourceStock.id },
        data: { quantityUsing: { decrement: data.quantity } }
      });

      await tx.toolStock.upsert({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.toLocation } },
        create: {
          toolId: data.toolId,
          locationName: data.toLocation,
          quantityAvailable: data.qtyGood,
          quantityBroken: data.qtyBroken,
          quantityLost: data.qtyLost
        },
        update: {
          quantityAvailable: { increment: data.qtyGood },
          quantityBroken: { increment: data.qtyBroken },
          quantityLost: { increment: data.qtyLost }
        }
      });

      const stockTx = await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'RECALL',
          quantity: data.quantity,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          performedBy,
          note: data.note || `Thu hồi (Tốt: ${data.qtyGood}, Hỏng: ${data.qtyBroken}, Mất: ${data.qtyLost})`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'RECALL_STOCK' as any,
        details: { quantity: data.quantity, good: data.qtyGood, broken: data.qtyBroken, lost: data.qtyLost, from: data.fromLocation, to: data.toLocation },
        performedBy,
        tx
      });

      return stockTx;
    });
  }

  static async reportDamageStock(data: {
    toolId: number;
    quantity: number;
    locationName: string;
    canRepair: boolean;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const stock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.locationName } }
      });
      if (!stock || stock.quantityAvailable < data.quantity) {
        throw new Error('Số lượng khả dụng không đủ để báo hỏng.');
      }

      if (data.canRepair) {
        await tx.toolStock.update({
          where: { id: stock.id },
          data: {
            quantityAvailable: { decrement: data.quantity },
            quantityBroken: { increment: data.quantity }
          }
        });
        await tx.toolStockTransaction.create({
          data: {
            toolId: data.toolId,
            type: 'DAMAGE',
            quantity: data.quantity,
            fromLocation: data.locationName,
            performedBy,
            note: data.note || 'Báo hỏng (Có thể sửa)'
          }
        });
      } else {
        await tx.toolStock.update({
          where: { id: stock.id },
          data: {
            quantityAvailable: { decrement: data.quantity },
            quantityDestroyed: { increment: data.quantity }
          }
        });
        await tx.toolEquipment.update({
          where: { id: data.toolId },
          data: {
            quantity: { decrement: data.quantity }
          }
        });
        await tx.toolStockTransaction.create({
          data: {
            toolId: data.toolId,
            type: 'DESTROY',
            quantity: data.quantity,
            fromLocation: data.locationName,
            performedBy,
            note: data.note || 'Hủy bỏ (Không thể sửa)'
          }
        });
      }

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'DAMAGE_STOCK' as any,
        details: { quantity: data.quantity, canRepair: data.canRepair, location: data.locationName },
        performedBy,
        tx
      });
    });
  }

  static async completeRepairStock(data: {
    toolId: number;
    quantity: number;
    locationName: string;
    actualCost: number;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const stock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.locationName } }
      });
      if (!stock || stock.quantityBroken < data.quantity) {
        throw new Error('Số lượng đang báo hỏng tại vị trí không đủ.');
      }

      await tx.toolStock.update({
        where: { id: stock.id },
        data: {
          quantityBroken: { decrement: data.quantity },
          quantityAvailable: { increment: data.quantity }
        }
      });

      await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'REPAIR_COMPLETE',
          quantity: data.quantity,
          toLocation: data.locationName,
          performedBy,
          note: data.note || `Hoàn tất sửa chữa. Chi phí: ${data.actualCost.toLocaleString()} VNĐ`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'REPAIR_COMPLETE_STOCK' as any,
        details: { quantity: data.quantity, cost: data.actualCost, location: data.locationName },
        performedBy,
        tx
      });
    });
  }

  static async reportLostStock(data: {
    toolId: number;
    quantity: number;
    locationName: string;
    responsibleUser?: string;
    compensationValue?: number;
    documentNo?: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const stock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.locationName } }
      });
      if (!stock || stock.quantityAvailable < data.quantity) {
        throw new Error('Số lượng khả dụng không đủ để báo mất.');
      }

      await tx.toolStock.update({
        where: { id: stock.id },
        data: {
          quantityAvailable: { decrement: data.quantity },
          quantityLost: { increment: data.quantity }
        }
      });

      await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'LOST',
          quantity: data.quantity,
          fromLocation: data.locationName,
          performedBy,
          note: data.note || `Báo mất (Trách nhiệm: ${data.responsibleUser || '---'}, Bồi hoàn: ${data.compensationValue?.toLocaleString()} VNĐ, Biên bản: ${data.documentNo || '---'})`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'LOST_STOCK' as any,
        details: { quantity: data.quantity, user: data.responsibleUser, comp: data.compensationValue, doc: data.documentNo, location: data.locationName },
        performedBy,
        tx
      });
    });
  }

  static async importNewBatch(data: {
    toolId: number;
    quantity: number;
    purchasePrice: number;
    purchaseDate?: string;
    supplierName?: string;
    locationName: string;
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const tool = await tx.toolEquipment.findUnique({
        where: { id: data.toolId },
        include: { batches: true }
      });
      if (!tool) throw new Error('Không tìm thấy CCDC.');

      const lotIndex = tool.batches.length + 1;
      const lotNumber = `LOT${lotIndex.toString().padStart(3, '0')}`;

      await tx.toolBatch.create({
        data: {
          toolId: data.toolId,
          batchNumber: lotNumber,
          quantity: data.quantity,
          purchasePrice: data.purchasePrice,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          supplierName: data.supplierName
        }
      });

      await tx.toolStock.upsert({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.locationName } },
        create: {
          toolId: data.toolId,
          locationName: data.locationName,
          quantityAvailable: data.quantity
        },
        update: {
          quantityAvailable: { increment: data.quantity }
        }
      });

      await tx.toolEquipment.update({
        where: { id: data.toolId },
        data: {
          quantity: { increment: data.quantity }
        }
      });

      await tx.toolStockTransaction.create({
        data: {
          toolId: data.toolId,
          type: 'IMPORT',
          quantity: data.quantity,
          toLocation: data.locationName,
          performedBy,
          note: data.note || `Nhập thêm lô hàng ${lotNumber}`
        }
      });

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'IMPORT_BATCH_STOCK' as any,
        details: { lotNumber, quantity: data.quantity, price: data.purchasePrice, location: data.locationName },
        performedBy,
        tx
      });
    });
  }

  static async adjustStock(data: {
    toolId: number;
    locationName: string;
    actualQuantity: number;
    action: 'ADJUST_STOCK' | 'RECORD_LOST' | 'WAIT_VERIFY';
    note?: string;
  }, performedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const stock = await tx.toolStock.findUnique({
        where: { toolId_locationName: { toolId: data.toolId, locationName: data.locationName } }
      });
      if (!stock) throw new Error('Không tìm thấy dữ liệu tồn kho tại vị trí này.');

      const diff = data.actualQuantity - stock.quantityAvailable;

      if (data.action === 'ADJUST_STOCK') {
        await tx.toolStock.update({
          where: { id: stock.id },
          data: { quantityAvailable: data.actualQuantity }
        });
        await tx.toolEquipment.update({
          where: { id: data.toolId },
          data: { quantity: { increment: diff } }
        });
        await tx.toolStockTransaction.create({
          data: {
            toolId: data.toolId,
            type: 'ADJUST',
            quantity: diff,
            toLocation: data.locationName,
            performedBy,
            note: data.note || `Kiểm kê điều chỉnh tồn kho (Chênh lệch: ${diff > 0 ? '+' : ''}${diff})`
          }
        });
      } else if (data.action === 'RECORD_LOST' && diff < 0) {
        const lostQty = Math.abs(diff);
        await tx.toolStock.update({
          where: { id: stock.id },
          data: {
            quantityAvailable: data.actualQuantity,
            quantityLost: { increment: lostQty }
          }
        });
        await tx.toolStockTransaction.create({
          data: {
            toolId: data.toolId,
            type: 'LOST',
            quantity: lostQty,
            fromLocation: data.locationName,
            performedBy,
            note: data.note || `Ghi nhận mất qua kiểm kê (Chênh lệch: -${lostQty})`
          }
        });
      }

      await AuditService.log({
        entityType: 'TOOL_EQUIPMENT',
        entityId: data.toolId,
        action: 'ADJUST_STOCK' as any,
        details: { action: data.action, actual: data.actualQuantity, diff, location: data.locationName },
        performedBy,
        tx
      });
    });
  }
}
