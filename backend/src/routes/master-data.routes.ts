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

const replaceLocation = (value: string | null, oldPath: string, newPath: string, oldName: string, newName: string) => {
  if (!value) return value;
  if (value === oldPath) return newPath;
  if (value === oldName) return newName;
  if (value.includes(oldPath)) return value.replace(oldPath, newPath);
  return value;
};

const getPersonImpact = async (fullName: string) => {
  const [assets, tools] = await Promise.all([
    prisma.asset.count({ where: { isDeleted: false, currentUserName: fullName } }),
    prisma.toolEquipment.count({ where: { isDeleted: false, currentUserName: fullName } })
  ]);
  return { assets, tools, total: assets + tools };
};

const getDepartmentImpact = async (id: number, name: string) => {
  const [users, assets, tools, manualPeople, children] = await Promise.all([
    prisma.user.count({ where: { departmentId: id } }),
    prisma.asset.count({ where: { isDeleted: false, departmentName: name } }),
    prisma.toolEquipment.count({ where: { isDeleted: false, departmentName: name } }),
    prisma.masterPerson.count({ where: { status: 'ACTIVE', departmentName: name } }),
    prisma.department.count({ where: { parentId: id, status: 'ACTIVE' } })
  ]);
  return { users, assets, tools, manualPeople, children, total: users + assets + tools + manualPeople + children };
};

const getLocationImpact = async (node: { id: number; cityName: string; projectName: string; parentPath: string; name: string }) => {
  const fullPath = [node.parentPath, node.name].filter(Boolean).join(' / ');
  const [children, assets, tools, manualPeople] = await Promise.all([
    prisma.projectLocationNode.count({ where: { cityName: node.cityName, projectName: node.projectName, status: 'ACTIVE', parentPath: { startsWith: fullPath } } }),
    prisma.asset.count({ where: { isDeleted: false, cityName: node.cityName, projectName: node.projectName, OR: [{ locationName: fullPath }, { locationName: node.name }, { locationName: { contains: fullPath } }] } }),
    prisma.toolEquipment.count({ where: { isDeleted: false, cityName: node.cityName, projectName: node.projectName, OR: [{ locationName: fullPath }, { locationName: node.name }, { locationName: { contains: fullPath } }] } }),
    prisma.masterPerson.count({ where: { status: 'ACTIVE', cityName: node.cityName, projectName: node.projectName, OR: [{ locationName: fullPath }, { locationName: node.name }, { locationName: { contains: fullPath } }] } })
  ]);
  return { children, assets, tools, manualPeople, total: children + assets + tools + manualPeople, fullPath };
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

router.get('/:type/:id/impact', requirePermission('PERMISSION_MANAGE'), async (req, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const type = String(req.params.type).toUpperCase();
    if (type === 'PERSON') {
      const person = await prisma.masterPerson.findUnique({ where: { id } });
      if (!person) return res.status(404).json({ message: 'Không tìm thấy người dùng danh mục.' });
      return res.json({ type, name: person.fullName, impact: await getPersonImpact(person.fullName), recommendation: 'Sửa và đồng bộ dữ liệu hiện tại; chỉ ngừng dùng khi không còn tài sản liên quan.' });
    }
    if (type === 'DEPARTMENT') {
      const department = await prisma.department.findUnique({ where: { id } });
      if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban.' });
      return res.json({ type, name: department.name, impact: await getDepartmentImpact(id, department.name), recommendation: 'Nếu xóa phòng ban đang được sử dụng, hãy chọn phòng ban thay thế để gộp dữ liệu hiện tại.' });
    }
    if (type === 'LOCATION') {
      const location = await prisma.projectLocationNode.findUnique({ where: { id } });
      if (!location) return res.status(404).json({ message: 'Không tìm thấy vị trí.' });
      return res.json({ type, name: [location.parentPath, location.name].filter(Boolean).join(' / '), impact: await getLocationImpact(location), recommendation: 'Vị trí có cấp con phải xử lý từ cấp thấp nhất; tài sản đang dùng cần vị trí thay thế.' });
    }
    return res.status(400).json({ message: 'Loại dữ liệu không hợp lệ.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể kiểm tra ảnh hưởng: ' + error.message });
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
    const current = await prisma.masterPerson.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy người dùng danh mục.' });
    const data = {
        fullName,
        normalizedName: normalize(fullName),
        phone: clean(req.body.phone) || null,
        position: clean(req.body.position) || null,
        departmentName: clean(req.body.departmentName) || null,
        cityName: clean(req.body.cityName) || null,
        projectName: clean(req.body.projectName) || null,
        locationName: clean(req.body.locationName) || null,
        note: clean(req.body.note) || null
    };
    const person = await prisma.$transaction(async (tx) => {
      const updated = await tx.masterPerson.update({ where: { id }, data });
      if (req.body.syncCurrentData !== false) {
        await tx.asset.updateMany({ where: { isDeleted: false, currentUserName: current.fullName }, data: { currentUserName: fullName, currentUserPhone: data.phone, currentPosition: data.position, departmentName: data.departmentName, cityName: data.cityName, projectName: data.projectName, locationName: data.locationName } });
        await tx.toolEquipment.updateMany({ where: { isDeleted: false, currentUserName: current.fullName }, data: { currentUserName: fullName, departmentName: data.departmentName, cityName: data.cityName, projectName: data.projectName, locationName: data.locationName } });
      }
      return updated;
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
    const person = await prisma.masterPerson.findUnique({ where: { id } });
    if (!person) return res.status(404).json({ message: 'Không tìm thấy người dùng danh mục.' });
    const impact = await getPersonImpact(person.fullName);
    if (impact.total > 0) return res.status(409).json({ message: `Không thể ngừng dùng vì còn ${impact.assets} tài sản và ${impact.tools} CCDC đang gắn. Hãy điều chuyển hoặc sửa và đồng bộ trước.`, impact });
    await prisma.masterPerson.update({ where: { id }, data: { status: 'INACTIVE' } });
    await AuditService.log({ entityType: 'MASTER_PERSON', entityId: id, action: 'DELETE', details: JSON.stringify({ status: 'INACTIVE' }), performedBy: req.user?.username || 'system' });
    res.json({ message: 'Đã ngừng sử dụng bản ghi.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể ngừng sử dụng bản ghi: ' + error.message });
  }
});

router.patch('/departments/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.department.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy phòng ban.' });
    const name = clean(req.body.name);
    const code = clean(req.body.code).toUpperCase();
    if (!name || !code) return res.status(400).json({ message: 'Mã và tên phòng ban là bắt buộc.' });
    const updated = await prisma.$transaction(async (tx) => {
      const department = await tx.department.update({ where: { id }, data: { name, code } });
      if (req.body.syncCurrentData !== false && name !== current.name) {
        await tx.asset.updateMany({ where: { isDeleted: false, departmentName: current.name }, data: { departmentName: name } });
        await tx.toolEquipment.updateMany({ where: { isDeleted: false, departmentName: current.name }, data: { departmentName: name } });
        await tx.masterPerson.updateMany({ where: { status: 'ACTIVE', departmentName: current.name }, data: { departmentName: name } });
      }
      return department;
    });
    await AuditService.log({ entityType: 'DEPARTMENT', entityId: id, action: 'UPDATE', details: JSON.stringify({ before: current, after: updated, syncCurrentData: req.body.syncCurrentData !== false }), performedBy: req.user?.username || 'system' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể cập nhật phòng ban: ' + error.message });
  }
});

router.delete('/departments/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.department.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy phòng ban.' });
    const impact = await getDepartmentImpact(id, current.name);
    if (impact.children > 0) return res.status(409).json({ message: `Phòng ban còn ${impact.children} đơn vị con. Hãy gộp hoặc xử lý đơn vị con trước.`, impact });
    const replacementId = Number(req.body?.replacementId || 0);
    const replacement = replacementId ? await prisma.department.findFirst({ where: { id: replacementId, status: 'ACTIVE' } }) : null;
    if (replacement?.id === id) return res.status(400).json({ message: 'Phòng ban thay thế phải khác phòng ban đang ngừng sử dụng.' });
    if (impact.total > 0 && !replacement) return res.status(409).json({ message: 'Phòng ban đang được sử dụng. Vui lòng chọn phòng ban thay thế để gộp.', impact });
    await prisma.$transaction(async (tx) => {
      if (replacement) {
        await tx.user.updateMany({ where: { departmentId: id }, data: { departmentId: replacement.id } });
        await tx.asset.updateMany({ where: { isDeleted: false, departmentName: current.name }, data: { departmentName: replacement.name } });
        await tx.toolEquipment.updateMany({ where: { isDeleted: false, departmentName: current.name }, data: { departmentName: replacement.name } });
        await tx.masterPerson.updateMany({ where: { status: 'ACTIVE', departmentName: current.name }, data: { departmentName: replacement.name } });
      }
      await tx.department.update({ where: { id }, data: { status: 'INACTIVE' } });
    });
    await AuditService.log({ entityType: 'DEPARTMENT', entityId: id, action: 'DELETE', details: JSON.stringify({ replacementId: replacement?.id || null, impact }), performedBy: req.user?.username || 'system' });
    res.json({ message: replacement ? `Đã gộp vào ${replacement.name} và ngừng sử dụng phòng ban cũ.` : 'Đã ngừng sử dụng phòng ban.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể ngừng sử dụng phòng ban: ' + error.message });
  }
});

router.patch('/locations/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.projectLocationNode.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy vị trí.' });
    const name = clean(req.body.name);
    const parentPath = clean(req.body.parentPath);
    if (!name) return res.status(400).json({ message: 'Tên vị trí là bắt buộc.' });
    const oldPath = [current.parentPath, current.name].filter(Boolean).join(' / ');
    const newPath = [parentPath, name].filter(Boolean).join(' / ');
    const [descendants, assets, tools, manualPeople] = await Promise.all([
      prisma.projectLocationNode.findMany({ where: { cityName: current.cityName, projectName: current.projectName, status: 'ACTIVE', parentPath: { startsWith: oldPath } } }),
      prisma.asset.findMany({ where: { isDeleted: false, cityName: current.cityName, projectName: current.projectName, locationName: { contains: current.name } }, select: { id: true, locationName: true } }),
      prisma.toolEquipment.findMany({ where: { isDeleted: false, cityName: current.cityName, projectName: current.projectName, locationName: { contains: current.name } }, select: { id: true, locationName: true } }),
      prisma.masterPerson.findMany({ where: { status: 'ACTIVE', cityName: current.cityName, projectName: current.projectName, locationName: { contains: current.name } }, select: { id: true, locationName: true } })
    ]);
    const updated = await prisma.$transaction(async (tx) => {
      const location = await tx.projectLocationNode.update({ where: { id }, data: { name, parentPath } });
      for (const child of descendants) await tx.projectLocationNode.update({ where: { id: child.id }, data: { parentPath: child.parentPath.replace(oldPath, newPath) } });
      if (req.body.syncCurrentData !== false) {
        for (const asset of assets) await tx.asset.update({ where: { id: asset.id }, data: { locationName: replaceLocation(asset.locationName, oldPath, newPath, current.name, name) } });
        for (const tool of tools) await tx.toolEquipment.update({ where: { id: tool.id }, data: { locationName: replaceLocation(tool.locationName, oldPath, newPath, current.name, name) } });
        for (const person of manualPeople) await tx.masterPerson.update({ where: { id: person.id }, data: { locationName: replaceLocation(person.locationName, oldPath, newPath, current.name, name) } });
      }
      return location;
    });
    await AuditService.log({ entityType: 'PROJECT_LOCATION', entityId: id, action: 'UPDATE', details: JSON.stringify({ before: current, after: updated, descendants: descendants.length }), performedBy: req.user?.username || 'system' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể cập nhật vị trí: ' + error.message });
  }
});

router.delete('/locations/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.projectLocationNode.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy vị trí.' });
    const impact = await getLocationImpact(current);
    if (impact.children > 0) return res.status(409).json({ message: `Vị trí còn ${impact.children} vị trí con. Hãy xử lý từ cấp thấp nhất trước.`, impact });
    const replacementId = Number(req.body?.replacementId || 0);
    const replacement = replacementId ? await prisma.projectLocationNode.findFirst({ where: { id: replacementId, status: 'ACTIVE' } }) : null;
    if (replacement?.id === id) return res.status(400).json({ message: 'Vị trí thay thế phải khác vị trí đang ngừng sử dụng.' });
    if (replacement && replacement.level !== current.level) return res.status(400).json({ message: 'Vị trí thay thế phải cùng cấp với vị trí hiện tại.' });
    if (impact.total > 0 && !replacement) return res.status(409).json({ message: 'Vị trí đang được sử dụng. Vui lòng chọn vị trí thay thế.', impact });
    const oldPath = [current.parentPath, current.name].filter(Boolean).join(' / ');
    const replacementPath = replacement ? [replacement.parentPath, replacement.name].filter(Boolean).join(' / ') : '';
    const replacementFullLocation = replacement ? [replacement.cityName, replacement.projectName, replacementPath].filter(Boolean).join(' - ') : '';
    await prisma.$transaction(async (tx) => {
      if (replacement) {
        const assets = await tx.asset.findMany({ where: { isDeleted: false, cityName: current.cityName, projectName: current.projectName, OR: [{ locationName: oldPath }, { locationName: current.name }, { locationName: { contains: oldPath } }] }, select: { id: true, locationName: true } });
        for (const asset of assets) await tx.asset.update({ where: { id: asset.id }, data: { cityName: replacement.cityName, projectName: replacement.projectName, locationName: replacementFullLocation } });
        const tools = await tx.toolEquipment.findMany({ where: { isDeleted: false, cityName: current.cityName, projectName: current.projectName, OR: [{ locationName: oldPath }, { locationName: current.name }, { locationName: { contains: oldPath } }] }, select: { id: true, locationName: true } });
        for (const tool of tools) await tx.toolEquipment.update({ where: { id: tool.id }, data: { cityName: replacement.cityName, projectName: replacement.projectName, locationName: replacementFullLocation } });
        await tx.masterPerson.updateMany({ where: { status: 'ACTIVE', cityName: current.cityName, projectName: current.projectName, OR: [{ locationName: oldPath }, { locationName: current.name }, { locationName: { contains: oldPath } }] }, data: { cityName: replacement.cityName, projectName: replacement.projectName, locationName: replacementFullLocation } });
      }
      await tx.projectLocationNode.update({ where: { id }, data: { status: 'INACTIVE' } });
    });
    await AuditService.log({ entityType: 'PROJECT_LOCATION', entityId: id, action: 'DELETE', details: JSON.stringify({ replacementId: replacement?.id || null, impact }), performedBy: req.user?.username || 'system' });
    res.json({ message: replacement ? `Đã chuyển dữ liệu sang ${replacementPath} và ngừng sử dụng vị trí cũ.` : 'Đã ngừng sử dụng vị trí.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Không thể ngừng sử dụng vị trí: ' + error.message });
  }
});

export default router;
