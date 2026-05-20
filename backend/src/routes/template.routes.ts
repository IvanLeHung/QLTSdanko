import { Router, Request, Response } from 'express';
import { authenticateToken, requirePermission, AuthRequest } from '../middleware/auth.middleware';
import { TemplateService } from '../services/template.service';
import { PdfUtil } from '../utils/pdf.util';
import { AuditService } from '../services/audit.service';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// 1. Get templates (TEMPLATE_VIEW)
router.get('/', requirePermission('TEMPLATE_VIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, module, status, isDefault, page, limit } = req.query;
    
    const result = await TemplateService.listTemplates({
      search: search as string,
      module: module as string,
      status: status as string,
      isDefault: isDefault !== undefined ? isDefault === 'true' : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error listing templates:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// 2. Get template details (TEMPLATE_VIEW)
router.get('/:id', requirePermission('TEMPLATE_VIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const template = await TemplateService.getTemplateById(id);
    if (!template) {
      res.status(404).json({ message: 'Biểu mẫu không tồn tại' });
      return;
    }
    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// 3. Create template (TEMPLATE_CREATE)
router.post('/', requirePermission('TEMPLATE_CREATE'), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id || 1;
  const username = req.user?.username || 'system';
  try {
    const template = await TemplateService.createTemplate(req.body, userId);
    
    // Log audit trail
    await AuditService.log({
      entityType: 'TEMPLATE',
      entityId: template.id,
      action: 'CREATE',
      details: { code: template.code, name: template.name, module: template.module },
      performedBy: username,
    });

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(400).json({ message: error.message || 'Bad Request' });
  }
});

// 4. Update template configuration (TEMPLATE_UPDATE)
router.put('/:id', requirePermission('TEMPLATE_UPDATE'), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const userId = req.user?.id || 1;
  const username = req.user?.username || 'system';
  try {
    const template = await TemplateService.updateTemplate(id, req.body, userId);

    // Log audit trail
    await AuditService.log({
      entityType: 'TEMPLATE',
      entityId: id,
      action: 'UPDATE',
      details: {
        code: template.code,
        name: template.name,
        version: template.version,
        changeNote: req.body.changeNote || 'Cập nhật cấu hình biểu mẫu'
      },
      performedBy: username,
    });

    res.json(template);
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(400).json({ message: error.message || 'Bad Request' });
  }
});

// 5. Set template as default (TEMPLATE_SET_DEFAULT)
router.put('/:id/default', requirePermission('TEMPLATE_SET_DEFAULT'), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const userId = req.user?.id || 1;
  const username = req.user?.username || 'system';
  try {
    const template = await TemplateService.setDefault(id, userId);

    // Log audit trail
    await AuditService.log({
      entityType: 'TEMPLATE',
      entityId: id,
      action: 'UPDATE',
      details: { code: template.code, name: template.name, isDefault: true, reason: 'Đặt làm mặc định cho nghiệp vụ' },
      performedBy: username,
    });

    res.json(template);
  } catch (error: any) {
    console.error('Error setting template default:', error);
    res.status(400).json({ message: error.message || 'Bad Request' });
  }
});

// 6. Clone template (TEMPLATE_CREATE)
router.post('/:id/clone', requirePermission('TEMPLATE_CREATE'), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const userId = req.user?.id || 1;
  const username = req.user?.username || 'system';
  try {
    const cloned = await TemplateService.cloneTemplate(id, userId);

    // Log audit trail
    await AuditService.log({
      entityType: 'TEMPLATE',
      entityId: cloned.id,
      action: 'CREATE',
      details: { code: cloned.code, name: cloned.name, sourceTemplateId: id, reason: 'Nhân bản biểu mẫu' },
      performedBy: username,
    });

    res.status(201).json(cloned);
  } catch (error: any) {
    console.error('Error cloning template:', error);
    res.status(400).json({ message: error.message || 'Bad Request' });
  }
});

// 7. Delete template (TEMPLATE_DELETE)
router.delete('/:id', requirePermission('TEMPLATE_DELETE'), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const username = req.user?.username || 'system';
  try {
    const template = await TemplateService.deleteTemplate(id);

    // Log audit trail
    await AuditService.log({
      entityType: 'TEMPLATE',
      entityId: id,
      action: 'DELETE',
      details: { code: template.code, name: template.name, module: template.module },
      performedBy: username,
    });

    res.json({ message: 'Xóa biểu mẫu thành công' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(400).json({ message: error.message || 'Bad Request' });
  }
});

// Demo Data helper for PDF Preview
const getDemoDocument = (module: string) => {
  let titleText = 'BIÊN BẢN BÀN GIAO TÀI SẢN';
  if (module === 'TRANSFER') titleText = 'BIÊN BẢN ĐIỀU CHUYỂN TÀI SẢN';
  if (module === 'RECALL') titleText = 'BIÊN BẢN THU HỒI TÀI SẢN';
  if (module === 'REPAIR') titleText = 'BIÊN BẢN BẢO DƯỠNG SỬA CHỮA TÀI SẢN';
  if (module === 'LIQUIDATION') titleText = 'BIÊN BẢN THANH LÝ TÀI SẢN';
  if (module === 'LOSS') titleText = 'BIÊN BẢN TIÊU HỦY / GHI NHẬN MẤT TÀI SẢN';
  if (module === 'INVENTORY') titleText = 'BIÊN BẢN KIỂM KÊ TÀI SẢN';

  return {
    id: 9999,
    documentNo: "BBBG/2026/05/9999",
    createdAt: new Date(),
    confirmedAt: new Date(),
    type: module === 'TRANSFER' ? 'TRANSFER' : (module === 'RECALL' ? 'RECALL' : 'HANDOVER'),
    senderName: "Nguyễn Văn Giao",
    senderDepartment: "Ban CNTT",
    senderPosition: "Trưởng nhóm hạ tầng",
    recipientName: "Trần Thị Nhận",
    recipientDepartment: "Phòng HCNS",
    recipientPosition: "Chuyên viên tuyển dụng",
    newLocation: "Phòng họp Tầng 5",
    newCity: "Hà Nội",
    reason: "Cấp phát máy tính làm việc cho nhân viên mới tuyển dụng",
    items: [
      {
        assetId: 1,
        assetCode: "TS0001/HN/CNTT",
        assetName: "Laptop Dell XPS 15 9530",
        unit: "Chiếc",
        usagePurpose: "Máy tính xách tay phục vụ chuyên môn",
        serialNumber: "SN-DELLXPS15-2026",
        status: "ASSIGNED"
      },
      {
        assetId: 2,
        assetCode: "TS0002/HN/CNTT",
        assetName: "Màn hình Dell UltraSharp U2723QE",
        unit: "Chiếc",
        usagePurpose: "Màn hình mở rộng thiết kế đồ họa",
        serialNumber: "SN-DELL27-7788",
        status: "ASSIGNED"
      }
    ]
  };
};

// 8. Preview template PDF with config (TEMPLATE_PREVIEW)
router.post('/preview-test', requirePermission('TEMPLATE_PREVIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { module, configJson, templateName, templateCode } = req.body;
    const config = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    const demoDoc = getDemoDocument(module || 'HANDOVER');

    const pdfBuffer = await PdfUtil.generateHandoverPdf(demoDoc, { 
      configJson: config, 
      templateName, 
      templateCode 
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=demo_template.pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error compiling template preview:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// 9. Get specific template version history (TEMPLATE_VIEW)
router.get('/:id/history', requirePermission('TEMPLATE_VIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const history = await TemplateService.getVersionHistory(id);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching template history:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// 10. Get specific template usages logs (TEMPLATE_VIEW)
router.get('/:id/usages', requirePermission('TEMPLATE_VIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const usages = await TemplateService.getUsages(id);
    res.json(usages);
  } catch (error: any) {
    console.error('Error fetching template usages:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export default router;
