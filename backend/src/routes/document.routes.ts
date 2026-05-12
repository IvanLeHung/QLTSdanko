import { Router } from 'express';
import { DocumentService } from '../services/document.service';

const router = Router();

router.get('/applied', async (req, res) => {
  try {
    const { action } = req.query;
    const templates = await DocumentService.getAppliedTemplates(action as string);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/entity/:type/:id', async (req, res) => {
  try {
    const docs = await DocumentService.getDocumentsByEntity(req.params.type, parseInt(req.params.id));
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
