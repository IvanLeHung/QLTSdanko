import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';

const router = Router();

const clean = (value: unknown) => String(value || '').trim();
const normalize = (value: unknown) => clean(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/\s+/g, ' ');

type PersonOption = {
  key: string;
  id?: number;
  fullName: string;
  phone: string;
  position: string;
  departmentName: string;
  cityName: string;
  projectName: string;
  locationName: string;
  source: 'MANUAL' | 'USER' | 'ASSET';
  editable: boolean;
};

const mergePerson = (target: Map<string, PersonOption>, person: PersonOption) => {
  const nameKey = normalize(person.fullName);
  if (!nameKey) return;
  const phoneKey = person.phone.replace(/\D/g, '');
  const candidates = Array.from(target.entries()).filter(([, item]) => normalize(item.fullName) === nameKey);
  const exact = candidates.find(([, item]) => phoneKey && item.phone.replace(/\D/g, '') === phoneKey);
  const loose = candidates.length === 1 && (!phoneKey || !candidates[0][1].phone.replace(/\D/g, '')) ? candidates[0] : undefined;
  const matched = exact || loose;
  const key = matched?.[0] || `${nameKey}|${phoneKey || person.key}`;
  const current = matched?.[1];
  if (!current) {
    target.set(key, person);
    return;
  }
  const priority = { ASSET: 1, USER: 2, MANUAL: 3 };
  const preferred = priority[person.source] >= priority[current.source] ? person : current;
  const fallback = preferred === person ? current : person;
  target.set(key, {
    ...preferred,
    phone: preferred.phone || fallback.phone,
    position: preferred.position || fallback.position,
    departmentName: preferred.departmentName || fallback.departmentName,
    cityName: preferred.cityName || fallback.cityName,
    projectName: preferred.projectName || fallback.projectName,
    locationName: preferred.locationName || fallback.locationName
  });
};

router.get('/options', async (_req, res: Response) => {
  try {
    const [manualPeople, users, assetPeople, departments, locationNodes, assetLocations] = await Promise.all([
      prisma.masterPerson.findMany({ where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } }),
      prisma.user.findMany({
        where: { isActive: true, status: 'ACTIVE' },
        select: { id: true, fullName: true, phone: true, position: true, department: { select: { name: true } } },
        orderBy: { fullName: 'asc' }
      }),
      prisma.asset.findMany({
        where: { isDeleted: false, currentUserName: { not: null } },
        select: {
          currentUserName: true,
          currentUserPhone: true,
          currentPosition: true,
          departmentName: true,
          cityName: true,
          projectName: true,
          locationName: true
        },
        distinct: ['currentUserName', 'currentUserPhone', 'departmentName', 'locationName']
      }),
      prisma.department.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } }),
      prisma.projectLocationNode.findMany({ where: { status: 'ACTIVE' }, orderBy: [{ cityName: 'asc' }, { projectName: 'asc' }, { level: 'asc' }, { name: 'asc' }] }),
      prisma.asset.findMany({
        where: { isDeleted: false, OR: [{ cityName: { not: null } }, { locationName: { not: null } }] },
        select: { cityName: true, projectName: true, locationName: true },
        distinct: ['cityName', 'projectName', 'locationName']
      })
    ]);

    const people = new Map<string, PersonOption>();
    assetPeople.forEach((item) => mergePerson(people, {
      key: `asset:${normalize(item.currentUserName)}`,
      fullName: clean(item.currentUserName),
      phone: clean(item.currentUserPhone),
      position: clean(item.currentPosition),
      departmentName: clean(item.departmentName),
      cityName: clean(item.cityName),
      projectName: clean(item.projectName),
      locationName: clean(item.locationName),
      source: 'ASSET',
      editable: false
    }));
    users.forEach((item) => mergePerson(people, {
      key: `user:${item.id}`,
      id: item.id,
      fullName: clean(item.fullName),
      phone: clean(item.phone),
      position: clean(item.position),
      departmentName: clean(item.department?.name),
      cityName: '', projectName: '', locationName: '',
      source: 'USER',
      editable: false
    }));
    manualPeople.forEach((item) => mergePerson(people, {
      key: `manual:${item.id}`,
      id: item.id,
      fullName: item.fullName,
      phone: clean(item.phone),
      position: clean(item.position),
      departmentName: clean(item.departmentName),
      cityName: clean(item.cityName),
      projectName: clean(item.projectName),
      locationName: clean(item.locationName),
      source: 'MANUAL',
      editable: true
    }));

    const sortedPeople = Array.from(people.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    const unifiedLocations = new Map<string, any>();
    assetLocations.forEach((item, index) => {
      const cityName = clean(item.cityName);
      const projectName = clean(item.projectName);
      const name = clean(item.locationName);
      if (!cityName && !projectName && !name) return;
      unifiedLocations.set([normalize(cityName), normalize(projectName), normalize(name)].join('|'), {
        key: `asset-location:${index}`,
        cityName: cityName || '--',
        projectName: projectName || '--',
        parentPath: '',
        name: name || '--',
        level: null,
        source: 'ASSET'
      });
    });
    locationNodes.forEach((item) => unifiedLocations.set([
      normalize(item.cityName), normalize(item.projectName), normalize([item.parentPath, item.name].filter(Boolean).join(' / '))
    ].join('|'), { ...item, key: `node:${item.id}`, source: 'MASTER' }));
    const locations = Array.from(unifiedLocations.values()).sort((a, b) => [a.cityName, a.projectName, a.parentPath, a.name].join('|').localeCompare([b.cityName, b.projectName, b.parentPath, b.name].join('|'), 'vi'));
    res.json({
      people: sortedPeople,
      departments,
      locationNodes,
      assetLocations,
      locations,
      stats: {
        people: sortedPeople.length,
        manualPeople: manualPeople.length,
        departments: departments.length,
        locationNodes: locations.length,
        incompletePeople: sortedPeople.filter((person) => !person.phone || !person.departmentName).length
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể tải Big Data Center: ' + error.message });
  }
});

router.post('/people', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const fullName = clean(req.body.fullName);
    const normalizedName = normalize(fullName);
    if (!fullName) return res.status(400).json({ message: 'Họ tên là bắt buộc.' });
    const phone = clean(req.body.phone);
    const existing = await prisma.masterPerson.findFirst({ where: { normalizedName, phone: phone || null, status: 'ACTIVE' } });
    if (existing) return res.status(409).json({ message: 'Người dùng này đã có trong dữ liệu nhập tay.' });
    const person = await prisma.masterPerson.create({
      data: {
        fullName,
        normalizedName,
        phone: phone || null,
        position: clean(req.body.position) || null,
        departmentName: clean(req.body.departmentName) || null,
        cityName: clean(req.body.cityName) || null,
        projectName: clean(req.body.projectName) || null,
        locationName: clean(req.body.locationName) || null,
        note: clean(req.body.note) || null,
        createdBy: req.user?.username || 'system'
      }
    });
    await AuditService.log({ entityType: 'MASTER_PERSON', entityId: person.id, action: 'CREATE', details: JSON.stringify(person), performedBy: req.user?.username || 'system' });
    res.status(201).json(person);
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể thêm người dùng danh mục: ' + error.message });
  }
});

router.patch('/people/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const fullName = clean(req.body.fullName);
    if (!fullName) return res.status(400).json({ message: 'Họ tên là bắt buộc.' });
    const person = await prisma.masterPerson.update({
      where: { id },
      data: {
        fullName,
        normalizedName: normalize(fullName),
        phone: clean(req.body.phone) || null,
        position: clean(req.body.position) || null,
        departmentName: clean(req.body.departmentName) || null,
        cityName: clean(req.body.cityName) || null,
        projectName: clean(req.body.projectName) || null,
        locationName: clean(req.body.locationName) || null,
        note: clean(req.body.note) || null
      }
    });
    await AuditService.log({ entityType: 'MASTER_PERSON', entityId: id, action: 'UPDATE', details: JSON.stringify(person), performedBy: req.user?.username || 'system' });
    res.json(person);
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể cập nhật người dùng danh mục: ' + error.message });
  }
});

router.delete('/people/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.masterPerson.update({ where: { id }, data: { status: 'INACTIVE' } });
    await AuditService.log({ entityType: 'MASTER_PERSON', entityId: id, action: 'DELETE', details: JSON.stringify({ status: 'INACTIVE' }), performedBy: req.user?.username || 'system' });
    res.json({ message: 'Đã ngừng sử dụng bản ghi.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể ngừng sử dụng bản ghi: ' + error.message });
  }
});

export default router;
