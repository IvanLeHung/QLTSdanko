import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // --- ROLES & PERMISSIONS ---
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Quản trị hệ thống - Toàn quyền' },
    { name: 'ADMIN', description: 'Quản trị viên' },
    { name: 'QLTS_MANAGER', description: 'Quản lý tài sản theo công ty/kho' },
    { name: 'DEPARTMENT_MANAGER', description: 'Trưởng phòng' },
    { name: 'STAFF', description: 'Nhân viên - Chỉ xem tài sản của mình' },
    { name: 'VIEWER', description: 'Người xem báo cáo' },
    { name: 'AUDITOR', description: 'Kiểm toán viên' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const permissions = [
    // Asset
    { action: 'ASSET_VIEW', description: 'Xem tài sản trong phạm vi' },
    { action: 'ASSET_VIEW_ALL', description: 'Xem tất cả tài sản' },
    { action: 'ASSET_VIEW_PRICE', description: 'Xem giá mua tài sản' },
    { action: 'ASSET_CREATE', description: 'Thêm mới tài sản' },
    { action: 'ASSET_UPDATE', description: 'Sửa thông tin tài sản' },
    { action: 'ASSET_DELETE', description: 'Xóa tài sản' },
    { action: 'ASSET_EXPORT', description: 'Xuất Excel tài sản' },
    { action: 'ASSET_PRINT_LABEL', description: 'In tem tài sản' },
    
    // Transfer
    { action: 'TRANSFER_VIEW', description: 'Xem hồ sơ bàn giao' },
    { action: 'TRANSFER_CREATE', description: 'Tạo hồ sơ bàn giao' },
    { action: 'TRANSFER_COMPLETE', description: 'Hoàn tất bàn giao' },
    { action: 'TRANSFER_CANCEL', description: 'Hủy hồ sơ bàn giao' },
    { action: 'TRANSFER_PRINT_PDF', description: 'In PDF biên bản' },
    { action: 'TRANSFER_EXPORT', description: 'Xuất Excel bàn giao' },
    
    // Inventory
    { action: 'INVENTORY_VIEW', description: 'Xem phiếu kiểm kê' },
    { action: 'INVENTORY_CREATE', description: 'Tạo phiếu kiểm kê' },
    { action: 'INVENTORY_COMPLETE', description: 'Hoàn tất kiểm kê' },
    { action: 'INVENTORY_EXPORT', description: 'Xuất báo cáo kiểm kê' },
    
    // Repair/Damage/Lost
    { action: 'REPAIR_VIEW', description: 'Xem thông tin sửa chữa/báo hỏng' },
    { action: 'REPAIR_CREATE', description: 'Tạo phiếu sửa chữa' },
    { action: 'REPAIR_UPDATE', description: 'Cập nhật phiếu sửa chữa' },
    { action: 'REPAIR_COMPLETE', description: 'Hoàn tất phiếu sửa chữa' },
    
    // Audit & Reports
    { action: 'AUDIT_LOG_VIEW', description: 'Xem nhật ký hệ thống' },
    { action: 'AUDIT_LOG_EXPORT', description: 'Xuất nhật ký hệ thống' },
    { action: 'REPORT_VIEW', description: 'Xem báo cáo thống kê' },
    { action: 'REPORT_EXPORT', description: 'Xuất báo cáo thống kê' },
    
    // Admin
    { action: 'USER_VIEW', description: 'Xem danh sách người dùng' },
    { action: 'USER_CREATE', description: 'Tạo người dùng' },
    { action: 'USER_UPDATE', description: 'Cập nhật người dùng' },
    { action: 'ROLE_MANAGE', description: 'Quản lý Role' },
    { action: 'PERMISSION_MANAGE', description: 'Quản lý phân quyền' },
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

  // --- SUPER_ADMIN PERMISSIONS ---
  const superAdmin = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const allPerms = await prisma.permission.findMany();

  if (superAdmin) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
        update: {},
        create: { roleId: superAdmin.id, permissionId: perm.id },
      });
    }
  }

  // --- ADMIN USER ---
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

  if (superAdmin) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdmin.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdmin.id },
    });
  }

  // Create default ALL data scope for admin
  await prisma.userDataScope.upsert({
    where: { userId: adminUser.id },
    update: { scopeType: 'ALL' },
    create: { userId: adminUser.id, scopeType: 'ALL' }
  });

  // --- STAFF USER FOR TESTING ---
  const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
  const staffUser = await prisma.user.upsert({
    where: { username: 'staff1' },
    update: { passwordHash },
    create: { 
      username: 'staff1', 
      passwordHash, 
      fullName: 'Nhân viên 1', 
      role: 'USER' 
    },
  });

  if (staffRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: staffUser.id, roleId: staffRole.id } },
      update: {},
      create: { userId: staffUser.id, roleId: staffRole.id },
    });
  }

  await prisma.userDataScope.upsert({
    where: { userId: staffUser.id },
    update: { scopeType: 'SELF' },
    create: { userId: staffUser.id, scopeType: 'SELF' }
  });

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
