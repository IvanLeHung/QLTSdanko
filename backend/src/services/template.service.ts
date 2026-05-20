import prisma from '../utils/prisma';

export class TemplateService {
  static async listTemplates(options: {
    search?: string;
    module?: string;
    status?: string;
    isDefault?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, module, status, isDefault, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    if (module) where.module = module;
    if (status) where.status = status;
    if (isDefault !== undefined) where.isDefault = isDefault;

    const [total, templates] = await Promise.all([
      prisma.template.count({ where }),
      prisma.template.findMany({
        where,
        orderBy: [{ module: 'asc' }, { isDefault: 'desc' }, { code: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    // Fetch usage counts for each template to display
    const data = await Promise.all(
      templates.map(async (tmpl) => {
        const usageCount = await prisma.templateUsageLog.count({
          where: { templateId: tmpl.id },
        });
        return {
          ...tmpl,
          usageCount,
        };
      })
    );

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  static async getTemplateById(id: number) {
    return await prisma.template.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
        usages: {
          orderBy: { usedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  static async createTemplate(
    data: {
      code: string;
      name: string;
      module: string;
      documentType?: string;
      version?: string;
      status?: string;
      isDefault?: boolean;
      configJson: string;
    },
    userId: number
  ) {
    // If set to default, clear defaults for this module
    if (data.isDefault) {
      await prisma.template.updateMany({
        where: { module: data.module },
        data: { isDefault: false },
      });
    }

    const template = await prisma.template.create({
      data: {
        code: data.code,
        name: data.name,
        module: data.module,
        documentType: data.documentType || 'PDF',
        version: data.version || 'v1',
        status: data.status || 'ACTIVE',
        isDefault: !!data.isDefault,
        configJson: data.configJson,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Create the initial version
    await prisma.templateVersion.create({
      data: {
        templateId: template.id,
        version: template.version,
        configJson: template.configJson,
        changeNote: 'Tạo biểu mẫu ban đầu',
        createdById: userId,
      },
    });

    return template;
  }

  static async updateTemplate(
    id: number,
    data: {
      code?: string;
      name?: string;
      module?: string;
      documentType?: string;
      version?: string;
      status?: string;
      isDefault?: boolean;
      configJson?: string;
      changeNote?: string;
    },
    userId: number
  ) {
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) throw new Error('Biểu mẫu không tồn tại');

    // Handle isDefault update
    if (data.isDefault && !existing.isDefault) {
      await prisma.template.updateMany({
        where: { module: data.module || existing.module },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.template.update({
      where: { id },
      data: {
        code: data.code !== undefined ? data.code : existing.code,
        name: data.name !== undefined ? data.name : existing.name,
        module: data.module !== undefined ? data.module : existing.module,
        documentType: data.documentType !== undefined ? data.documentType : existing.documentType,
        version: data.version !== undefined ? data.version : existing.version,
        status: data.status !== undefined ? data.status : existing.status,
        isDefault: data.isDefault !== undefined ? !!data.isDefault : existing.isDefault,
        configJson: data.configJson !== undefined ? data.configJson : existing.configJson,
        updatedById: userId,
      },
    });

    // If configJson changes or version code changes, create a new TemplateVersion record
    const hasConfigChanged = data.configJson && data.configJson !== existing.configJson;
    const hasVersionChanged = data.version && data.version !== existing.version;

    if (hasConfigChanged || hasVersionChanged) {
      await prisma.templateVersion.create({
        data: {
          templateId: id,
          version: updated.version,
          configJson: updated.configJson,
          changeNote: data.changeNote || 'Cập nhật cấu hình biểu mẫu',
          createdById: userId,
        },
      });
    }

    return updated;
  }

  static async setDefault(id: number, userId: number) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new Error('Biểu mẫu không tồn tại');

    // Reset default for other templates in same business module
    await prisma.template.updateMany({
      where: { module: template.module },
      data: { isDefault: false },
    });

    return await prisma.template.update({
      where: { id },
      data: {
        isDefault: true,
        updatedById: userId,
      },
    });
  }

  static async cloneTemplate(id: number, userId: number) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new Error('Biểu mẫu không tồn tại');

    let suffix = 1;
    let newCode = `${template.code}_COPY_${suffix}`;
    while (await prisma.template.findUnique({ where: { code: newCode } })) {
      suffix++;
      newCode = `${template.code}_COPY_${suffix}`;
    }

    const cloned = await prisma.template.create({
      data: {
        code: newCode,
        name: `Sao chép - ${template.name}`,
        module: template.module,
        documentType: template.documentType,
        version: 'v1',
        status: 'DRAFT',
        isDefault: false,
        configJson: template.configJson,
        createdById: userId,
        updatedById: userId,
      },
    });

    await prisma.templateVersion.create({
      data: {
        templateId: cloned.id,
        version: cloned.version,
        configJson: cloned.configJson,
        changeNote: `Nhân bản từ mẫu ${template.code}`,
        createdById: userId,
      },
    });

    return cloned;
  }

  static async deleteTemplate(id: number) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new Error('Biểu mẫu không tồn tại');
    if (template.isDefault) throw new Error('Không thể xóa biểu mẫu mặc định. Vui lòng thiết lập biểu mẫu khác làm mặc định trước.');

    return await prisma.template.delete({ where: { id } });
  }

  static async getVersionHistory(id: number) {
    return await prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getUsages(id: number) {
    return await prisma.templateUsageLog.findMany({
      where: { templateId: id },
      orderBy: { usedAt: 'desc' },
    });
  }

  static async logUsage(templateId: number, documentId?: string, documentNo?: string, usedById?: number) {
    try {
      await prisma.templateUsageLog.create({
        data: {
          templateId,
          documentId,
          documentNo,
          usedById,
        },
      });
    } catch (error) {
      console.error('Failed to log template usage:', error);
    }
  }

  static async getDefaultTemplateByModule(module: string) {
    return await prisma.template.findFirst({
      where: { module, isDefault: true, status: 'ACTIVE' },
    });
  }
}
