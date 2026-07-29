import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { rawCategoriesText } from './categories_data';

dotenv.config();

const prisma = new PrismaClient();

async function replaceBacGiangData() {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      col record;
    BEGIN
      FOR col IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('text', 'character varying')
      LOOP
        EXECUTE format(
          'UPDATE %I.%I SET %I = REPLACE(%I, %L, %L) WHERE %I LIKE %L',
          col.table_schema,
          col.table_name,
          col.column_name,
          col.column_name,
          'Bắc Giang',
          'Bắc Ninh',
          col.column_name,
          '%Bắc Giang%'
        );
      END LOOP;
    END $$;
  `);
}

async function repairLegacyAssetData() {
  const normalizedDepartments = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "departmentName" = CASE
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['B. KTXD', 'B. Kinh tế Xây dựng']
      ) THEN 'B. Kinh tế Xây dựng'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['B. QLTK', 'B. Quản lý Thiết kế']
      ) THEN 'B. Quản lý Thiết kế'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['B. QLXD', 'B. Quản lý Xây dựng']
      ) THEN 'B. Quản lý Xây dựng'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['B. TLTK', 'B. Trợ lý - Thư ký', 'B. Trợ Lý - Thư Ký']
      ) THEN 'B. Trợ lý - Thư ký'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['BLĐ', 'BLD', 'Ban Lãnh đạo']
      ) THEN 'Ban Lãnh đạo'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY[
          'B. HCNS',
          'HCNS',
          'Hành chính Nhân sự',
          'Ban Hành chính Nhân sự',
          'B. Hành chính Nhân sự'
        ]
      ) THEN 'B. Hành chính Nhân sự'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['BQLVH DKC', 'B. Quản lý Vận hành Danko City']
      ) THEN 'B. Quản lý Vận hành Danko City'
      WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['BQLDA DKC', 'B. Quản lý Dự án Danko City']
      ) THEN 'B. Quản lý Dự án Danko City'
      ELSE "departmentName"
    END
    WHERE trim(COALESCE("departmentName", '')) ILIKE ANY (
      ARRAY[
        'B. KTXD',
        'B. Kinh tế Xây dựng',
        'B. QLTK',
        'B. Quản lý Thiết kế',
        'B. QLXD',
        'B. Quản lý Xây dựng',
        'B. TLTK',
        'B. Trợ lý - Thư ký',
        'B. Trợ Lý - Thư Ký',
        'BLĐ',
        'BLD',
        'Ban Lãnh đạo',
        'B. HCNS',
        'HCNS',
        'Hành chính Nhân sự',
        'Ban Hành chính Nhân sự',
        'B. Hành chính Nhân sự',
        'BQLVH DKC',
        'B. Quản lý Vận hành Danko City',
        'BQLDA DKC',
        'B. Quản lý Dự án Danko City'
      ]
    );
  `);

  const normalizedCurrentUsers = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "currentUserName" = 'B. Quản lý Dự án Danko City'
    WHERE trim(COALESCE("currentUserName", '')) ILIKE ANY (
      ARRAY['BQLDA DKC', 'B. Quản lý Dự án Danko City']
    );
  `);

  const normalizedUnits = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "unit" = CASE
      WHEN "unit" = 'B?' THEN 'Bộ'
      WHEN "unit" = 'Chi?c' THEN 'Chiếc'
      ELSE "unit"
    END
    WHERE "unit" IN ('B?', 'Chi?c');
  `);

  const normalizedProjects = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "projectName" = 'Dự án khác'
    WHERE "projectName" IN ('Du an khac', 'Du án khác');
  `);

  const normalizedLocations = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "locationName" = REPLACE(
      REPLACE(
        REPLACE("locationName", 'Mat sau C6-I', 'Mặt sau C6-I'),
        'Mat truoc C6-I', 'Mặt trước C6-I'
      ),
      'Tang 9 C6-I', 'Tầng 9 C6-I'
    )
    WHERE "locationName" LIKE '%Mat sau C6-I%'
       OR "locationName" LIKE '%Mat truoc C6-I%'
       OR "locationName" LIKE '%Tang 9 C6-I%';
  `);

  const normalizedHanoiLocations = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET
      "projectName" = CASE
        WHEN trim(COALESCE("projectName", '')) ILIKE 'Văn phòng Hà Nội' THEN 'Văn phòng C6'
        ELSE "projectName"
      END,
      "locationName" = CASE
        WHEN COALESCE("locationName", '') ~* '^\\s*Hà Nội\\s*(-|/|$)' THEN
          regexp_replace(
            COALESCE("locationName", ''),
            'Văn phòng Hà Nội',
            'Văn phòng C6',
            'gi'
          )
        ELSE
          'Hà Nội - Văn phòng C6' ||
          CASE
            WHEN trim(
              regexp_replace(
                regexp_replace(
                  COALESCE("locationName", ''),
                  'Văn phòng Hà Nội',
                  'Văn phòng C6',
                  'gi'
                ),
                '^\\s*Văn phòng C6\\s*(-|/)?\\s*',
                '',
                'i'
              )
            ) = '' THEN ''
            ELSE ' - ' || trim(
              regexp_replace(
                regexp_replace(
                  COALESCE("locationName", ''),
                  'Văn phòng Hà Nội',
                  'Văn phòng C6',
                  'gi'
                ),
                '^\\s*Văn phòng C6\\s*(-|/)?\\s*',
                '',
                'i'
              )
            )
          END
      END
    WHERE
      trim(COALESCE("cityName", '')) ILIKE 'Hà Nội'
      OR trim(COALESCE("projectName", '')) ILIKE 'Văn phòng Hà Nội'
      OR trim(COALESCE("projectName", '')) ILIKE 'Văn phòng C6'
      OR "locationName" ILIKE '%Văn phòng Hà Nội%'
      OR "locationName" ILIKE '%Văn phòng C6%'
      OR "locationName" ~* '\\mC6([ -]I|[ -]1)?\\M';
  `);

  const normalizedHanoiBlocks = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "locationName" = regexp_replace(
      regexp_replace(
        "locationName",
        'Khối[[:space:]]+II\\M',
        'C6-II',
        'gi'
      ),
      'Khối[[:space:]]+I\\M',
      'C6-I',
      'gi'
    )
    WHERE "locationName" IS NOT NULL
      AND (
        "locationName" ~* 'Khối[[:space:]]+I\\M'
        OR "locationName" ~* 'Khối[[:space:]]+II\\M'
      )
      AND (
        trim(COALESCE("cityName", '')) ILIKE 'Hà Nội'
        OR trim(COALESCE("projectName", '')) ILIKE 'Văn phòng C6'
        OR "locationName" ILIKE 'Hà Nội%'
        OR "locationName" ILIKE '%Văn phòng C6%'
      );
  `);

  const normalizedRiversideOffice = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET
      "cityName" = 'Bắc Ninh',
      "projectName" = 'Danko Riverside',
      "locationName" = 'Bắc Ninh - Danko Riverside - Văn phòng Bán hàng'
    WHERE lower(
      regexp_replace(
        trim(COALESCE("locationName", '')),
        '\\s*[-/\\\\]+\\s*',
        ' ',
        'g'
      )
    ) IN (
      lower('Danko Riverside'),
      lower('Văn phòng Bán hàng Danko Riverside'),
      lower('Văn phòng Bắc Ninh'),
      lower('Bắc Ninh Danko Riverside Văn phòng Bán hàng')
    )
    OR (
      trim(COALESCE("cityName", '')) ILIKE 'Bắc Ninh'
      AND trim(COALESCE("projectName", '')) ILIKE 'Danko Riverside'
      AND trim(COALESCE("locationName", '')) ILIKE 'Văn phòng Bán hàng'
    );
  `);

  const normalizedDankoCenter = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET
      "cityName" = 'Tuyên Quang',
      "projectName" = 'Danko Center',
      "departmentName" = CASE
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['B. Cây xanh', 'Ban Cây Xanh']
        ) THEN 'B. Cây Xanh'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['BQLDA DKT', 'Ban Quản lý Dự án']
        ) THEN 'Ban Quản lý Dự án'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['Kinh doanh', 'Kinh doạnh', 'B. Kinh doanh']
        ) THEN 'B. Kinh doanh'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['Văn phòng Bán hàng Kim Phú', 'VPBH DKT', 'Văn phòng bán hàng']
        ) THEN 'Văn phòng bán hàng'
        ELSE "departmentName"
      END,
      "locationName" = CASE
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['B. Cây xanh', 'Ban Cây Xanh']
        ) THEN 'Tuyên Quang - Danko Center - B. Cây Xanh'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['BQLDA DKT', 'Ban Quản lý Dự án']
        ) THEN 'Tuyên Quang - Danko Center - Ban Quản lý Dự án'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['Kinh doanh', 'Kinh doạnh', 'B. Kinh doanh']
        ) THEN 'Tuyên Quang - Danko Center - B. Kinh doanh'
        WHEN trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY['Văn phòng Bán hàng Kim Phú', 'VPBH DKT', 'Văn phòng bán hàng']
        ) THEN 'Tuyên Quang - Danko Center - Văn phòng bán hàng'
        ELSE 'Tuyên Quang - Danko Center - Văn phòng bán hàng'
      END
    WHERE
      lower(
        regexp_replace(
          trim(COALESCE("locationName", '')),
          '\\s*[-/\\\\]+\\s*',
          ' ',
          'g'
        )
      ) IN (
        lower('Danko Center'),
        lower('Tuyên Quang Danko Center Văn phòng bán hàng')
      )
      OR (
        (
          trim(COALESCE("cityName", '')) ILIKE 'Tuyên Quang'
          OR trim(COALESCE("projectName", '')) ILIKE 'Danko Center'
        )
        AND trim(COALESCE("departmentName", '')) ILIKE ANY (
          ARRAY[
            'B. Cây xanh',
            'Ban Cây Xanh',
            'BQLDA DKT',
            'Ban Quản lý Dự án',
            'Kinh doanh',
            'Kinh doạnh',
            'B. Kinh doanh',
            'Văn phòng Bán hàng Kim Phú',
            'VPBH DKT',
            'Văn phòng bán hàng'
          ]
        )
        AND (
          trim(COALESCE("locationName", '')) = ''
          OR trim(COALESCE("locationName", '')) ILIKE 'Danko Center'
          OR trim(COALESCE("locationName", '')) ILIKE 'Tuyên Quang%Danko Center%Văn phòng bán hàng'
        )
      )
      OR trim(COALESCE("departmentName", '')) ILIKE ANY (
        ARRAY['BQLDA DKT', 'Văn phòng Bán hàng Kim Phú', 'VPBH DKT']
      );
  `);

  const normalizedLocationSpacing = await prisma.$executeRawUnsafe(`
    UPDATE "Asset"
    SET "locationName" = replace(
      regexp_replace(
        regexp_replace(
          trim("locationName"),
          '([A-Za-z]+[0-9]+)\\s*-\\s*([IVXLCDM]+|[0-9]+)([[:space:],.;)-]|$)',
          '\\1§\\2\\3',
          'gi'
        ),
        '\\s*-\\s*',
        ' - ',
        'g'
      ),
      '§',
      '-'
    )
    WHERE "locationName" IS NOT NULL
      AND "locationName" LIKE '%-%';
  `);

  const restoredInventory = await prisma.$executeRawUnsafe(`
    WITH inventory_events AS (
      SELECT
        "assetId",
        "checkedAt" AS checked_at,
        COALESCE(NULLIF("result", ''), 'MATCHED') AS result_status
      FROM "InventoryItem"
      WHERE "checkedAt" IS NOT NULL

      UNION ALL

      SELECT
        "assetId",
        "checkedAt" AS checked_at,
        COALESCE(NULLIF("resultStatus", ''), 'MATCH') AS result_status
      FROM "InventoryDetail"
      WHERE "assetId" IS NOT NULL AND "checkedAt" IS NOT NULL
    ),
    latest AS (
      SELECT DISTINCT ON ("assetId")
        "assetId",
        checked_at,
        result_status
      FROM inventory_events
      ORDER BY "assetId", checked_at DESC
    )
    UPDATE "Asset" AS asset
    SET
      "lastInventoryDate" = latest.checked_at,
      "lastInventoryStatus" = latest.result_status
    FROM latest
    WHERE asset."id" = latest."assetId"
      AND (
        asset."lastInventoryDate" IS NULL
        OR asset."lastInventoryDate" < latest.checked_at
        OR asset."lastInventoryStatus" IS NULL
      );
  `);

  console.log('Legacy asset data repaired.', {
    normalizedDepartments,
    normalizedCurrentUsers,
    normalizedUnits,
    normalizedProjects,
    normalizedLocations,
    normalizedHanoiLocations,
    normalizedHanoiBlocks,
    normalizedRiversideOffice,
    normalizedDankoCenter,
    normalizedLocationSpacing,
    restoredInventory
  });
}


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

    // CCDC (Tool) Permissions
    { action: 'TOOL_VIEW', description: 'Xem công cụ dụng cụ' },
    { action: 'TOOL_VIEW_PRICE', description: 'Xem giá mua công cụ dụng cụ' },
    { action: 'TOOL_CREATE', description: 'Thêm mới công cụ dụng cụ' },
    { action: 'TOOL_UPDATE', description: 'Sửa thông tin công cụ dụng cụ' },
    { action: 'TOOL_DELETE', description: 'Xóa công cụ dụng cụ' },
    { action: 'TOOL_EXPORT', description: 'Xuất Excel công cụ dụng cụ' },
    { action: 'TOOL_PRINT_LABEL', description: 'In tem công cụ dụng cụ' },
    
    { action: 'TOOL_TRANSFER_VIEW', description: 'Xem hồ sơ bàn giao/luân chuyển CCDC' },
    { action: 'TOOL_TRANSFER_CREATE', description: 'Bàn giao/luân chuyển CCDC' },
    { action: 'TOOL_TRANSFER_COMPLETE', description: 'Hoàn tất bàn giao CCDC' },
    { action: 'TOOL_TRANSFER_CANCEL', description: 'Hủy hồ sơ bàn giao CCDC' },
    
    { action: 'TOOL_REPAIR_VIEW', description: 'Xem phiếu sửa chữa CCDC' },
    { action: 'TOOL_REPAIR_CREATE', description: 'Tạo phiếu sửa chữa/báo hỏng CCDC' },
    { action: 'TOOL_REPAIR_UPDATE', description: 'Cập nhật phiếu sửa chữa CCDC' },
    { action: 'TOOL_REPAIR_COMPLETE', description: 'Hoàn tất sửa chữa CCDC' },
    
    { action: 'TOOL_LOST_VIEW', description: 'Xem báo mất CCDC' },
    { action: 'TOOL_LOST_CREATE', description: 'Báo mất CCDC' },
    
    { action: 'TOOL_LIQUIDATION_VIEW', description: 'Xem thanh lý CCDC' },
    { action: 'TOOL_LIQUIDATION_CREATE', description: 'Thanh lý CCDC' },
    
    { action: 'TOOL_INVENTORY_VIEW', description: 'Xem phiếu kiểm kê CCDC' },
    { action: 'TOOL_INVENTORY_CREATE', description: 'Tạo phiếu kiểm kê CCDC' },
    { action: 'TOOL_INVENTORY_COMPLETE', description: 'Hoàn tất kiểm kê CCDC' },
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
    { code: 'BTLTK', name: 'B. Trợ lý - Thư ký' },
    { code: 'BKSNB', name: 'B. Kiểm soát Nội bộ' },
    { code: 'BTC', name: 'B. Tài chính' },
    { code: 'PL7', name: 'PL7' },
    { code: 'PCU2', name: 'P. Cung ứng 2' },
    { code: 'BQLDA_DSR', name: 'B. Quản lý Dự án Danko Sun River' },
    { code: 'VPBH_DSR', name: 'Văn phòng Bán hàng Danko Sun River' },
    { code: 'BQLDA_TH2', name: 'B. Quản lý Dự án Thanh Hóa 2' },
    { code: 'VPBH_TH2', name: 'Văn phòng Bán hàng Thanh Hóa 2' },
    { code: 'BQLDA_KP', name: 'B. Quản lý Dự án Kim Phú' },
    { code: 'VPBH_KP', name: 'Văn phòng Bán hàng Kim Phú' },
    { code: 'BQLDA_DR', name: 'B. Quản lý Dự án Danko Royal' },
    { code: 'VPBH_DR', name: 'Văn phòng Bán hàng Danko Royal' },
    { code: 'BQLDA_DRS', name: 'B. Quản lý Dự án Danko Riverside' },
    { code: 'VPBH_DRS', name: 'Văn phòng Bán hàng Danko Riverside' },
    { code: 'BQLDA_DA', name: 'B. Quản lý Dự án Danko Avenue' },
    { code: 'VPBH_DA', name: 'Văn phòng Bán hàng Danko Avenue' },
    { code: 'BQLDA_DC', name: 'B. Quản lý Dự án Danko City' },
    { code: 'TTTM_DC', name: 'Trung tâm Thương mại Danko City' },
    { code: 'BKT', name: 'B. Kế toán' },
    { code: 'BQLTK', name: 'B. Quản lý Thiết kế' },
    { code: 'BDT', name: 'B. Đầu tư' },
    { code: 'BQLXD', name: 'B. Quản lý Xây dựng' },
    { code: 'PDT2', name: 'P. Đấu thầu 2' },
    { code: 'PDT1', name: 'P. Đấu thầu 1' },
    { code: 'BMKTTT', name: 'B. Marketing & Truyền thông' },
    { code: 'BPC', name: 'B. Pháp chế' },
    { code: 'BKTXD', name: 'B. Kinh tế Xây dựng' },
    { code: 'BPLT', name: 'Bộ phận Lễ tân' },
    { code: 'PTTCSKH', name: 'P. Thủ tục & CSKH' },
    { code: 'BHCNS', name: 'B. Hành chính Nhân sự' },
    { code: 'PCN', name: 'Phòng Công nghệ' },
    { code: 'PNS', name: 'Phòng Nhân sự' },
    { code: 'PCU1', name: 'P. Cung ứng 1' },
    { code: 'PHC', name: 'Phòng Hành chính' }
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
    { code: 'VP_HN', name: 'Văn phòng C6', city: 'Hà Nội' },
    { code: 'VP_TH', name: 'Văn phòng Thanh Hóa', city: 'Thanh Hóa' },
    { code: 'VP_BN', name: 'Văn phòng Bán hàng', city: 'Bắc Ninh' },
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
    { code: '00', name: 'Không có thông tin', type: 'SYSTEM', status: 'LOCKED' },
    { code: '01', name: 'Danko Group', type: 'COMPANY', status: 'ACTIVE' },
    { code: '02', name: 'VTC', type: 'COMPANY', status: 'ACTIVE' },
    { code: '03', name: 'Summit', type: 'COMPANY', status: 'ACTIVE' },
    { code: '04', name: 'Homevina', type: 'COMPANY', status: 'ACTIVE' },
    { code: '05', name: 'Bình Nguyên', type: 'COMPANY', status: 'ACTIVE' },
    { code: '06', name: 'TheLight', type: 'COMPANY', status: 'ACTIVE' },
    { code: '07', name: 'RH', type: 'COMPANY', status: 'ACTIVE' },
    { code: '08', name: 'Suntimes', type: 'COMPANY', status: 'ACTIVE' },
    { code: '09', name: 'Hà Thu', type: 'COMPANY', status: 'ACTIVE' },
    { code: '10', name: 'Tự chịu chi phí', type: 'COST_CENTER', status: 'ACTIVE' },
    { code: '11', name: 'SunVina', type: 'COMPANY', status: 'ACTIVE' }
  ];

  for (const comp of companies) {
    await prisma.company.upsert({
      where: { code: comp.code },
      update: { 
        name: comp.name, 
        type: comp.type, 
        status: comp.status 
      },
      create: comp,
    });
  }

  // Set Danko Group as parent of VTC for hierarchy testing
  const parentCompany = await prisma.company.findUnique({ where: { code: '01' } });
  if (parentCompany) {
    await prisma.company.update({
      where: { code: '02' },
      data: { parentId: parentCompany.id }
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
    update: {
      passwordHash,
      isActive: true,
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false
    },
    create: { 
      username: 'admin', 
      passwordHash, 
      fullName: 'Administrator', 
      role: 'ADMIN',
      isActive: true,
      status: 'ACTIVE',
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false
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

  await replaceBacGiangData();

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

  function normalizeCode(rawCode: string): string {
    const num = parseInt(rawCode, 10);
    if (!isNaN(num) && num >= 1 && num <= 99) {
      return String(num).padStart(2, '0');
    }
    return rawCode.trim();
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

    const normalizedCode = normalizeCode(code);
    let sortOrder = parseInt(normalizedCode, 10);
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

    const key = `${level}_${normalizedCode}_${parentKey || 'root'}`;

    const existing = await prisma.assetCategory.findFirst({
      where: {
        code: { in: [code, normalizedCode] },
        level,
        parentId
      }
    });

    let dbId: number;
    if (existing) {
      const updated = await prisma.assetCategory.update({
        where: { id: existing.id },
        data: {
          code: normalizedCode,
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
          code: normalizedCode,
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
    parents[level] = { code: normalizedCode, name, key };
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

  // --- DOCUMENT TEMPLATES SEED ---
  const docTemplates = [
    { templateCode: 'BM01', templateName: 'Biên bản bàn giao tài sản mới', businessModule: 'CREATION' },
    { templateCode: 'BM02', templateName: 'Biên bản bàn giao tài sản', businessModule: 'HANDOVER' },
    { templateCode: 'BM03', templateName: 'Biên bản tài sản hỏng / sửa chữa', businessModule: 'DAMAGE' },
    { templateCode: 'BM04', templateName: 'Biên bản thanh lý tài sản', businessModule: 'LIQUIDATION' },
    { templateCode: 'BM05', templateName: 'Biên bản tiêu hủy / mất tài sản', businessModule: 'DISPOSAL' },
    { templateCode: 'BM06', templateName: 'Biên bản điều chuyển tài sản', businessModule: 'TRANSFER' },
    { templateCode: 'BM07', templateName: 'Biên bản bàn giao tổng hợp', businessModule: 'HANDOVER' },
    { templateCode: 'BM08', templateName: 'Biên bản kiểm kê định kỳ', businessModule: 'INVENTORY' },
    { templateCode: 'BM09', templateName: 'Biên bản thu hồi tài sản', businessModule: 'RECALL' },
    { templateCode: 'BM10', templateName: 'Yêu cầu sửa chữa tài sản', businessModule: 'REPAIR' },
    { templateCode: 'BM11', templateName: 'Biên bản đánh giá tài sản', businessModule: 'INVENTORY' },
    { templateCode: 'BM12', templateName: 'Biên bản kiểm kê tài sản', businessModule: 'INVENTORY' },
    { templateCode: 'BM13', templateName: 'Biên bản ghi nhận mất tài sản', businessModule: 'LOST' }
  ];

  for (const dt of docTemplates) {
    await prisma.documentTemplate.upsert({
      where: { templateCode: dt.templateCode },
      update: {
        templateName: dt.templateName,
        businessModule: dt.businessModule
      },
      create: dt
    });
  }

  await repairLegacyAssetData();

  console.log('Master data fully updated with Roles, Departments, Locations, Companies, templates, and document templates');
}


main().catch(console.error).finally(() => prisma.$disconnect());
