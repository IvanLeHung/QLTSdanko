import { PrismaClient } from '@prisma/client';
import { createDocumentWithRetry } from '../utils/document';

const prisma = new PrismaClient();

export class DocumentService {
  static async getTemplatesByModule(module: string) {
    return await prisma.documentTemplate.findMany({
      where: { businessModule: module }
    });
  }

  static async getAppliedTemplates(action: string) {
    // Mapping business actions to specific BM codes
    const mapping: Record<string, string[]> = {
      'CREATION': ['BM01', 'BM07', 'BM08'],
      'HANDOVER': ['BM02', 'BM07'],
      'TRANSFER': ['BM06', 'BM09', 'BM07'],
      'RECALL': ['BM02', 'BM09'],
      'DAMAGE': ['BM03', 'BM09'],
      'REPAIR': ['BM10', 'BM09', 'BM03'],
      'INVENTORY': ['BM12', 'BM11', 'BM08'],
      'LIQUIDATION': ['BM04', 'BM08', 'BM09', 'BM11'],
      'DISPOSAL': ['BM05', 'BM09', 'BM11'],
      'LOST': ['BM13', 'BM07', 'BM09']
    };

    const codes = mapping[action] || [];
    return await prisma.documentTemplate.findMany({
      where: { templateCode: { in: codes } }
    });
  }

  static async linkDocument(data: {
    entityType: string,
    entityId: number,
    templateCode: string,
    fileName: string,
    fileUrl: string,
    performedBy: string
  }) {
    const template = await prisma.documentTemplate.findUnique({
      where: { templateCode: data.templateCode }
    });

    if (!template) throw new Error("Biểu mẫu không tồn tại.");

    return await createDocumentWithRetry({
      templateCode: data.templateCode,
      documentType: 'GENERAL',
      entityType: data.entityType,
      entityId: data.entityId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      createdBy: data.performedBy
    });
  }

  static async getDocumentsByEntity(type: string, id: number) {
    return await prisma.generatedDocument.findMany({
      where: { entityType: type, entityId: id },
      include: { template: true }
    });
  }
}
