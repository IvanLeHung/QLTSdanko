import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // --- ROLES & PERMISSIONS ---
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Quản trị hệ thống - Toàn quyền' },
    { name: 'ASSET_STAFF', description: 'Nhân viên QLTS - Vận hành nghiệp vụ' },
    { name: 'VIEWER', description: 'Người xem báo cáo' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const permissions = [
    // Asset Management
    { action: 'asset.view', description: 'Xem tài sản' },
    { action: 'asset.create', description: 'Thêm mới tài sản' },
    { action: 'asset.update', description: 'Sửa thông tin tài sản' },
    { action: 'asset.import', description: 'Nhập Excel' },
    { action: 'asset.export', description: 'Xuất Excel' },
    { action: 'asset.delete', description: 'Xóa tài sản (Soft delete)' },
    
    // Handover & Transfer
    { action: 'handover.manage', description: 'Vận hành bàn giao/điều chuyển' },
    { action: 'handover.export', description: 'Xuất PDF biên bản' },
    
    // Damage, Lost, Liquidation
    { action: 'damage.manage', description: 'Báo hỏng & Sửa chữa' },
    { action: 'lost.manage', description: 'Báo mất & Tìm thấy' },
    { action: 'liquidation.manage', description: 'Thanh lý tài sản' },
    
    // Inventory
    { action: 'inventory.manage', description: 'Thực hiện kiểm kê' },
    
    // Reports
    { action: 'report.view', description: 'Xem báo cáo & Dashboard' },
    
    // Master Data
    { action: 'master.manage', description: 'Quản lý danh mục' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      update: { description: perm.description },
      create: perm,
    });
  }

  // --- DEPARTMENTS ---
  const depts = [
    { code: 'HCNS', name: 'Hành chính Nhân sự' },
    { code: 'KT', name: 'Kế toán' },
    { code: 'IT', name: 'Công nghệ thông tin' },
    { code: 'MKT', name: 'Marketing' },
    { code: 'KD', name: 'Kinh doanh' },
    { code: 'BQL', name: 'Ban quản lý' },
  ];

  for (const dept of depts) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    });
  }

  // --- LOCATIONS ---
  const locations = [
    { code: 'VP_HN', name: 'Văn phòng Hà Nội', city: 'Hà Nội' },
    { code: 'VP_TH', name: 'Văn phòng Thanh Hóa', city: 'Thanh Hóa' },
    { code: 'VP_BN', name: 'Văn phòng Bắc Ninh', city: 'Bắc Ninh' },
    { code: 'VP_HCM', name: 'Văn phòng TP.HCM', city: 'TP.HCM' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: { name: loc.name, city: loc.city },
      create: loc,
    });
  }

  // --- COMPANIES ---
  const companies = [
    { code: '01', name: 'Danko Group' },
    { code: '02', name: 'Vestacons' },
    { code: '03', name: 'Summit' },
    { code: '04', name: 'Danko City' },
    { code: '05', name: 'Danko Avenue' },
  ];

  for (const comp of companies) {
    await prisma.company.upsert({
      where: { code: comp.code },
      update: { name: comp.name },
      create: comp,
    });
  }

  // --- LINK ROLES & PERMISSIONS ---
  const adminTs = await prisma.role.findUnique({ where: { name: 'ADMIN_TS' } });
  const allPerms = await prisma.permission.findMany();

  if (adminTs) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminTs.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminTs.id, permissionId: perm.id },
      });
    }
  }

  // --- ADMIN USER ---
  const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash },
    create: { 
      username: 'admin', 
      passwordHash, 
      fullName: 'Administrator', 
      role: 'ADMIN' 
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
  }

  // --- CATEGORIES (REUSED FROM PREVIOUS) ---
  async function ensureCategory(data: { code: string, name: string, slug: string, level: number, parentId: number | null }) {
    let cat = await prisma.assetCategory.findFirst({ where: { code: data.code, level: data.level, parentId: data.parentId } });
    if (!cat) cat = await prisma.assetCategory.create({ data });
    else cat = await prisma.assetCategory.update({ where: { id: cat.id }, data: { name: data.name, slug: data.slug } });
    return cat;
  }

  const l1_01 = await ensureCategory({ code: '01', name: 'Nhà cửa, vật kiến trúc', slug: 'nha_cua_vat_kien_truc', level: 1, parentId: null });
  const l1_02 = await ensureCategory({ code: '02', name: 'Phương tiện vận tải', slug: 'phuong_tien_van_tai', level: 1, parentId: null });
  const l1_03 = await ensureCategory({ code: '03', name: 'Máy móc, thiết bị', slug: 'may_moc_thiet_bi', level: 1, parentId: null });

  const l2_01 = await ensureCategory({ code: '01', name: 'Máy móc, thiết bị văn phòng', slug: 'may_moc_thiet_bi_van_phong', level: 2, parentId: l1_03.id });
  const l3_01_01 = await ensureCategory({ code: '01', name: 'Thiết thiết bị đầu cuối', slug: 'thiet_bi_dau_cuoi', level: 3, parentId: l2_01.id });
  const l4s_01_01 = [
    { code: '01', name: 'PC', slug: 'pc' }, 
    { code: '02', name: 'Laptop', slug: 'laptop' }, 
    { code: '05', name: 'Màn hình máy tính', slug: 'man_hinh_may_tinh' }
  ];
  for (const l4 of l4s_01_01) await ensureCategory({ ...l4, level: 4, parentId: l3_01_01.id });

  console.log('Master data fully updated with Roles, Departments, Locations and Companies');
}

main().catch(console.error).finally(() => prisma.$disconnect());
