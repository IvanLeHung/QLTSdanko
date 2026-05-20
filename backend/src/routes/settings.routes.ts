import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';
import ExcelJS from 'exceljs';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// --- COMPANY MANAGEMENT ---
router.get('/companies', authenticateToken, async (req, res) => {
  const companies = await prisma.company.findMany({ orderBy: { code: 'asc' } });
  res.json(companies);
});

router.get('/companies/active', authenticateToken, async (req, res) => {
  const companies = await prisma.company.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  res.json(companies);
});

router.post('/companies', authenticateToken, async (req, res) => {
  const { code, name } = req.body;
  try {
    const company = await prisma.company.create({ data: { code, name } });
    res.status(201).json(company);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/companies/:id', authenticateToken, async (req, res) => {
  const { name, isActive } = req.body;
  const company = await prisma.company.update({
    where: { id: Number(req.params.id) },
    data: { name, isActive }
  });
  res.json(company);
});

// --- CATEGORY MANAGEMENT ---
router.get('/categories', authenticateToken, async (req, res) => {
  const { level, parentId } = req.query;
  const where: any = {};
  if (level) where.level = Number(level);
  if (parentId) where.parentId = Number(parentId);

  const categories = await prisma.assetCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }]
  });
  res.json(categories);
});

router.get('/categories/roots', authenticateToken, async (req, res) => {
  const categories = await prisma.assetCategory.findMany({
    where: { level: 1, parentId: null },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(categories);
});

router.get('/categories/children/:parentId', authenticateToken, async (req, res) => {
  const categories = await prisma.assetCategory.findMany({
    where: { parentId: Number(req.params.parentId) },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(categories);
});

router.post('/categories', authenticateToken, async (req, res) => {
  const { code, name, slug, level, parentId, sortOrder, isActive } = req.body;
  try {
    // Validation: Level rules
    if (level > 1 && !parentId) return res.status(400).json({ message: "Parent ID is required for level > 1" });
    
    // Check duplicate code under same parent
    const existing = await prisma.assetCategory.findFirst({
      where: { code, level: Number(level), parentId: parentId ? Number(parentId) : null }
    });
    if (existing) {
      return res.status(400).json({ message: "Mã này đã tồn tại trong cùng cấp cha." });
    }

    const category = await prisma.assetCategory.create({
      data: { 
        code, 
        name, 
        slug, 
        level: Number(level), 
        parentId: parentId ? Number(parentId) : null, 
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/categories/:id', authenticateToken, async (req, res) => {
  const { code, name, slug, isActive, sortOrder } = req.body;
  const categoryId = Number(req.params.id);

  try {
    // Check if code change is allowed (if code is provided)
    if (code) {
      const current = await prisma.assetCategory.findUnique({ where: { id: categoryId } });
      if (current && current.code !== code) {
        // Check for usage in assets (pseudo-check, assuming Asset model tracking)
        const usageCount = await prisma.asset.count({
          where: {
            OR: [
              { level1Code: current.code, level1Name: current.name },
              { level2Code: current.code, level2Name: current.name },
              { level3Code: current.code, level3Name: current.name },
              { level4Code: current.code, level4Name: current.name }
            ]
          }
        });
        
        // In this implementation, we allow editing but warn on frontend. 
        // Backend strictly checks for unique constraint again if code is changed
        const duplicate = await prisma.assetCategory.findFirst({
          where: { 
            code, 
            level: current.level, 
            parentId: current.parentId,
            id: { not: categoryId }
          }
        });
        if (duplicate) return res.status(400).json({ message: "Mã mới đã tồn tại ở cấp này." });
      }
    }

    const category = await prisma.assetCategory.update({
      where: { id: categoryId },
      data: { code, name, slug, isActive, sortOrder: Number(sortOrder) }
    });
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Helper for slug generation
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

// --- EXCEL IMPORT ---
router.post('/categories/import', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer as any);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) return res.status(400).json({ message: "Worksheet not found" });

  let created = 0, updated = 0, errors = [];

  async function upsertCategory(code: string, name: string, userSlug: string | undefined, level: number, parentId: number | null) {
    const slug = userSlug ? toSlug(userSlug) : toSlug(name);
    let sortOrder = parseInt(code, 10);
    if (isNaN(sortOrder)) sortOrder = 999;

    const existing = await prisma.assetCategory.findFirst({
      where: {
        code,
        level,
        parentId
      }
    });

    if (existing) {
      const updatedCat = await prisma.assetCategory.update({
        where: { id: existing.id },
        data: { name, slug, sortOrder, isActive: true }
      });
      return { cat: updatedCat, isNew: false };
    } else {
      const createdCat = await prisma.assetCategory.create({
        data: { code, name, slug, level, parentId, sortOrder, isActive: true }
      });
      return { cat: createdCat, isNew: true };
    }
  }

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const l1Code = row.getCell(1).text?.trim(); 
    const l1Name = row.getCell(2).text?.trim();
    const l1Slug = row.getCell(3).text?.trim();

    if (!l1Code || !l1Name) continue;

    try {
      const r1 = await upsertCategory(l1Code, l1Name, l1Slug, 1, null);
      if (r1.isNew) created++; else updated++;
      const cat1 = r1.cat;

      const l2Code = row.getCell(4).text?.trim();
      const l2Name = row.getCell(5).text?.trim();
      const l2Slug = row.getCell(6).text?.trim();

      if (l2Code && l2Name && cat1) {
        const r2 = await upsertCategory(l2Code, l2Name, l2Slug, 2, cat1.id);
        if (r2.isNew) created++; else updated++;
        const cat2 = r2.cat;
        
        const l3Code = row.getCell(7).text?.trim();
        const l3Name = row.getCell(8).text?.trim();
        const l3Slug = row.getCell(9).text?.trim();
        if (l3Code && l3Name && cat2) {
          const r3 = await upsertCategory(l3Code, l3Name, l3Slug, 3, cat2.id);
          if (r3.isNew) created++; else updated++;
          const cat3 = r3.cat;

          const l4Code = row.getCell(10).text?.trim();
          const l4Name = row.getCell(11).text?.trim();
          const l4Slug = row.getCell(12).text?.trim();
          if (l4Code && l4Name && cat3) {
            const r4 = await upsertCategory(l4Code, l4Name, l4Slug, 4, cat3.id);
            if (r4.isNew) created++; else updated++;
          }
        }
      }
    } catch (err: any) {
      errors.push({ row: i, message: err.message });
    }
  }

  res.json({ created, updated, errors });
});

// --- DEPARTMENT MANAGEMENT ---
router.get('/departments', authenticateToken, async (req, res) => {
  const depts = await prisma.department.findMany({ orderBy: { code: 'asc' } });
  res.json(depts);
});

// --- LOCATION MANAGEMENT ---
router.get('/locations', authenticateToken, async (req, res) => {
  const locs = await prisma.location.findMany({ orderBy: { code: 'asc' } });
  res.json(locs);
});

export default router;
