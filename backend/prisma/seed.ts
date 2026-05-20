import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { rawCategoriesText } from './categories_data';

dotenv.config();

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
    { action: 'USER_RESET_PASSWORD', description: 'Đặt lại mật khẩu người dùng' },
    
    // Templates
    { action: 'TEMPLATE_VIEW', description: 'Xem thư viện biểu mẫu' },
    { action: 'TEMPLATE_CREATE', description: 'Tạo mẫu biểu mẫu' },
    { action: 'TEMPLATE_UPDATE', description: 'Sửa cấu hình biểu mẫu' },
    { action: 'TEMPLATE_SET_DEFAULT', description: 'Đặt biểu mẫu làm mặc định' },
    { action: 'TEMPLATE_DELETE', description: 'Xóa biểu mẫu' },
    { action: 'TEMPLATE_PREVIEW', description: 'Xem trước biểu mẫu' },
    { action: 'TEMPLATE_EXPORT', description: 'Xuất bản mẫu biểu mẫu' },
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
    update: {}, // Do not overwrite existing password hash on database seed runs
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
    update: {},
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

  // --- CATEGORIES SEED ---
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

  console.log('Seeding 4-level asset categories...');
  const lines = rawCategoriesText.split('\n');
  const parentIdMap = new Map<string, number>();
  const parents: { [level: number]: { code: string; name: string; key: string } } = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matchSpaces = line.match(/^(\s*)/);
    const leadingSpaces = matchSpaces ? matchSpaces[1].length : 0;

    let level = 1;
    if (leadingSpaces >= 9) level = 4;
    else if (leadingSpaces >= 6) level = 3;
    else if (leadingSpaces >= 3) level = 2;

    const content = trimmed.replace(/^[🌳├─└─\s]+/, '').trim();
    if (!content) continue;

    let code = '';
    let name = '';

    if (content.startsWith('-')) {
      code = '';
      name = content.replace(/^-\s*/, '').trim();
    } else {
      const dashIdx = content.indexOf(' - ');
      if (dashIdx !== -1) {
        code = content.substring(0, dashIdx).trim();
        name = content.substring(dashIdx + 3).trim();
      } else {
        const dashIdx2 = content.indexOf(' – ');
        const dashIdx3 = content.indexOf(' -');
        const finalIdx = dashIdx2 !== -1 ? dashIdx2 : (dashIdx3 !== -1 ? dashIdx3 : content.indexOf('-'));
        
        if (finalIdx !== -1) {
          code = content.substring(0, finalIdx).trim();
          name = content.substring(finalIdx + 1).trim();
          if (name.startsWith('-') || name.startsWith('–')) {
            name = name.substring(1).trim();
          }
        } else {
          code = toSlug(content).substring(0, 15).toUpperCase();
          name = content;
        }
      }
    }

    code = code.trim();
    name = name.trim();

    if (!code) {
      code = toSlug(name).substring(0, 15).toUpperCase();
    }

    let sortOrder = parseInt(code, 10);
    if (isNaN(sortOrder)) {
      sortOrder = 999;
    }

    const slug = toSlug(name);

    let parentKey = null;
    let parentId: number | null = null;

    if (level > 1) {
      const parent = parents[level - 1];
      if (parent) {
        parentKey = parent.key;
        parentId = parentIdMap.get(parentKey) || null;
      }
    }

    const key = `${level}_${code}_${parentKey || 'root'}`;

    const existing = await prisma.assetCategory.findFirst({
      where: {
        code,
        level,
        parentId
      }
    });

    let dbId: number;
    if (existing) {
      const updated = await prisma.assetCategory.update({
        where: { id: existing.id },
        data: {
          name,
          slug,
          sortOrder,
          isActive: true
        }
      });
      dbId = updated.id;
    } else {
      const created = await prisma.assetCategory.create({
        data: {
          code,
          name,
          slug,
          level,
          parentId,
          sortOrder,
          isActive: true
        }
      });
      dbId = created.id;
    }

    parentIdMap.set(key, dbId);
    parents[level] = { code, name, key };
  }
  console.log('Finished seeding 4-level asset categories.');

  // --- TEMPLATES SEED ---
  const defaultConfig = {
    page: {
      size: "A4",
      orientation: "portrait",
      marginTop: 12,
      marginRight: 15,
      marginBottom: 12,
      marginLeft: 15
    },
    header: {
      showLogo: true,
      departmentText: "BỘ PHẬN QLTS",
      showTemplateCode: true,
      showDocumentQr: true
    },
    assetTable: {
      showAssetQr: true,
      assetQrSize: 48,
      repeatHeader: true,
      columns: [
        "index",
        "assetCodeQr",
        "assetName",
        "specification",
        "serial",
        "unit",
        "quantity",
        "condition",
        "note"
      ]
    },
    signature: {
      columns: [
        "sender",
        "receiver",
        "qlts"
      ]
    },
    footer: {
      showSupportLine: true,
      supportLine: "CBNV có nhu cầu hỗ trợ về CNTT xin liên hệ: Lê Khánh Hùng – Phone/Viber: 0977131579",
      showPageNumber: true
    }
  };

  const seedTemplates = [
    { code: 'BM01/QLTS', name: 'Biên bản bàn giao tài sản mới', module: 'HANDOVER_NEW_ASSET', config: defaultConfig },
    { code: 'BM02/QLTS', name: 'Biên bản bàn giao tài sản', module: 'HANDOVER', config: defaultConfig },
    { code: 'BM06/QLTS', name: 'Biên bản điều chuyển tài sản', module: 'TRANSFER', config: defaultConfig },
    { code: 'BM03/QLTS', name: 'Biên bản tài sản hỏng / sửa chữa', module: 'REPAIR', config: defaultConfig },
    { code: 'BM04/QLTS', name: 'Biên bản thanh lý tài sản', module: 'LIQUIDATION', config: defaultConfig },
    { code: 'BM05/QLTS', name: 'Biên bản tiêu hủy / mất tài sản', module: 'LOSS', config: defaultConfig },
    { code: 'BM12/QLTS', name: 'Biên bản kiểm kê tài sản', module: 'INVENTORY', config: defaultConfig },
    { code: 'BM09/QLTS', name: 'Biên bản thu hồi tài sản', module: 'RECALL', config: defaultConfig }
  ];

  for (const t of seedTemplates) {
    const existing = await prisma.template.findUnique({ where: { code: t.code } });
    if (!existing) {
      await prisma.template.create({
        data: {
          code: t.code,
          name: t.name,
          module: t.module,
          documentType: 'PDF',
          version: 'v1',
          status: 'ACTIVE',
          isDefault: true,
          configJson: JSON.stringify(t.config)
        }
      });
    }
  }

  console.log('Master data fully updated with Roles, Departments, Locations, Companies, and default templates');
}


main().catch(console.error).finally(() => prisma.$disconnect());
