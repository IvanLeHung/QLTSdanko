import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, isAdmin, requirePermission, AuthRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all roles
router.get('/roles', requirePermission('ROLE_MANAGE'), async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles' });
  }
});

// Get all permissions
router.get('/permissions', requirePermission('PERMISSION_MANAGE'), async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching permissions' });
  }
});

// Get users with their permissions
router.get('/users', requirePermission('USER_VIEW'), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        role: true,
        roles: {
          include: { role: true }
        },
        dataScope: true,
        department: true,
        extraPermissionsJson: true,
        deniedPermissionsJson: true,
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user specific permissions
router.get('/users/:id/permissions', requirePermission('PERMISSION_MANAGE'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        roles: {
          include: { role: true }
        },
        dataScope: true,
        extraPermissionsJson: true,
        deniedPermissionsJson: true,
      }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user permissions' });
  }
});

// Preview user data visibility
router.get('/users/:id/preview-access', requirePermission('PERMISSION_MANAGE'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        dataScope: true,
        department: true
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Compute target user's effective permissions
    const rolePerms = new Set<string>();
    user.roles.forEach(ur => {
      ur.role.permissions.forEach(rp => {
        rolePerms.add(rp.permission.action);
      });
    });
    const extraPerms: string[] = user.extraPermissionsJson ? JSON.parse(user.extraPermissionsJson) : [];
    const deniedPerms: string[] = user.deniedPermissionsJson ? JSON.parse(user.deniedPermissionsJson) : [];
    const effectivePerms = new Set<string>(rolePerms);
    extraPerms.forEach(p => effectivePerms.add(p));
    deniedPerms.forEach(p => effectivePerms.delete(p));

    const userPermissions = Array.from(effectivePerms);
    const userDepartmentName = user.department?.name || null;

    // 1. Asset Scoping Where
    const assetScopeWhere = buildDataScopeWhere(user.dataScope, user.id, {
      company: 'companyCode',
      department: 'departmentName',
      warehouse: 'locationName',
      user: 'currentUserName',
      project: 'projectName'
    }, userDepartmentName);

    // 2. Handover Scoping Where
    const handoverScopeWhere = buildDataScopeWhere(user.dataScope, user.id, {
      company: 'documentNo',
      department: 'recipientDepartment',
      warehouse: 'newLocation',
      user: 'recipientName',
      project: 'documentNo'
    }, userDepartmentName);

    // 3. Inventory Scoping Where
    const inventoryScopeWhere = buildDataScopeWhere(user.dataScope, user.id, {
      company: 'inventoryCode',
      department: 'scopeValue',
      warehouse: 'scopeValue',
      user: 'inventoryCode',
      project: 'inventoryCode'
    }, userDepartmentName);

    // Replace target user's SELF placeholder with user's actual username or fullName
    const replaceSelf = (whereObj: any) => {
      if (!whereObj) return whereObj;
      const str = JSON.stringify(whereObj);
      const replacedStr = str.replace(/\{\{CURRENT_USER\}\}/g, user.fullName || user.username);
      return JSON.parse(replacedStr);
    };

    const finalAssetWhere = replaceSelf(assetScopeWhere);
    const finalHandoverWhere = replaceSelf(handoverScopeWhere);
    const finalInventoryWhere = replaceSelf(inventoryScopeWhere);

    const assetCount = await prisma.asset.count({
      where: {
        isDeleted: false,
        ...finalAssetWhere
      }
    });

    const handoverCount = await prisma.handoverDocument.count({
      where: finalHandoverWhere
    });

    const inventoryCount = await prisma.inventoryCheck.count({
      where: finalInventoryWhere
    });

    res.json({
      assetCount,
      handoverCount,
      inventoryCount,
      permissions: userPermissions,
      cannotView: {
        purchasePrice: !userPermissions.includes('ASSET_VIEW_PRICE'),
        auditLogs: !userPermissions.includes('AUDIT_LOG_VIEW'),
        exportExcel: !userPermissions.some(p => p.includes('EXPORT')),
      }
    });
  } catch (error: any) {
    console.error('Error previewing user access:', error);
    res.status(500).json({ message: 'Error previewing user access: ' + error.message });
  }
});

// Update user permissions and data scope
router.patch('/users/:id/permissions', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = parseInt(req.params.id as string);
    const { roleIds, dataScope, extraPermissions, deniedPermissions, isActive, changeReason } = req.body;
    
    const editingUserId = req.user?.id;
    if (editingUserId === userId) {
      return res.status(403).json({ message: 'Bạn không thể tự chỉnh sửa quyền của chính mình.' });
    }

    const editingUserRoles = req.user?.roles || [];
    const isSuperAdmin = editingUserRoles.includes('SUPER_ADMIN');

    // Privilege escalation checks
    if (roleIds && Array.isArray(roleIds)) {
      const targetRoleIds = roleIds.map((r: any) => typeof r === 'object' ? parseInt(r.roleId) : parseInt(r));
      const targetRoles = await prisma.role.findMany({
        where: { id: { in: targetRoleIds } },
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      });
      const assignsSuperAdmin = targetRoles.some(r => r.name === 'SUPER_ADMIN');

      if (assignsSuperAdmin && !isSuperAdmin) {
        return res.status(403).json({ message: 'Chỉ SUPER_ADMIN mới có quyền cấp vai trò SUPER_ADMIN.' });
      }

      // Check advanced role management permissions
      const assignsAdminRights = targetRoles.some(r => 
        r.permissions.some(rp => ['ROLE_MANAGE', 'PERMISSION_MANAGE'].includes(rp.permission.action))
      );
      if (assignsAdminRights && !isSuperAdmin) {
        return res.status(403).json({ message: 'Chỉ SUPER_ADMIN mới có quyền cấp các quyền quản lý vai trò / phân quyền nâng cao.' });
      }
    }

    // Begin transaction to update user roles, scope, overrides, and status
    await prisma.$transaction(async (tx) => {
      // 1. Update active status
      if (isActive !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { isActive }
        });
      }

      // 2. Update roles (supports temporary durations validFrom/validTo)
      if (roleIds && Array.isArray(roleIds)) {
        await tx.userRole.deleteMany({ where: { userId } });
        for (const r of roleIds) {
          const rId = typeof r === 'object' ? parseInt(r.roleId) : parseInt(r);
          const vFrom = typeof r === 'object' && r.validFrom ? new Date(r.validFrom) : null;
          const vTo = typeof r === 'object' && r.validTo ? new Date(r.validTo) : null;
          await tx.userRole.create({
            data: { 
              userId, 
              roleId: rId,
              validFrom: vFrom,
              validTo: vTo
            }
          });
        }
      }

      // 3. Update permission overrides
      if (extraPermissions !== undefined || deniedPermissions !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            extraPermissionsJson: extraPermissions ? JSON.stringify(extraPermissions) : null,
            deniedPermissionsJson: deniedPermissions ? JSON.stringify(deniedPermissions) : null,
          }
        });
      }

      // 4. Update data scope (supports company, department, warehouse, project, and CATEGORIES)
      if (dataScope) {
        await tx.userDataScope.upsert({
          where: { userId },
          update: {
            scopeType: dataScope.scopeType,
            companyIdsJson: dataScope.companyIds ? JSON.stringify(dataScope.companyIds) : null,
            departmentIdsJson: dataScope.departmentIds ? JSON.stringify(dataScope.departmentIds) : null,
            warehouseIdsJson: dataScope.warehouseIds ? JSON.stringify(dataScope.warehouseIds) : null,
            projectIdsJson: dataScope.projectIds ? JSON.stringify(dataScope.projectIds) : null,
            categoryIdsJson: dataScope.categoryIds ? JSON.stringify(dataScope.categoryIds) : null,
          },
          create: {
            userId,
            scopeType: dataScope.scopeType,
            companyIdsJson: dataScope.companyIds ? JSON.stringify(dataScope.companyIds) : null,
            departmentIdsJson: dataScope.departmentIds ? JSON.stringify(dataScope.departmentIds) : null,
            warehouseIdsJson: dataScope.warehouseIds ? JSON.stringify(dataScope.warehouseIds) : null,
            projectIdsJson: dataScope.projectIds ? JSON.stringify(dataScope.projectIds) : null,
            categoryIdsJson: dataScope.categoryIds ? JSON.stringify(dataScope.categoryIds) : null,
          }
        });
      }

      // 5. Log Audit with Change Reason
      const currentUser = req.user?.username || 'System';
      const targetUser = await tx.user.findUnique({ where: { id: userId } });
      
      await AuditService.log({
        entityType: 'USER',
        entityId: userId,
        action: 'UPDATE',
        details: {
          reason: changeReason || `Thay đổi phân quyền cho người dùng ${targetUser?.username}`,
          changes: { roleIds, dataScope, extraPermissions, deniedPermissions, isActive }
        },
        performedBy: currentUser,
        tx
      });
    });

    res.json({ message: 'User permissions updated successfully' });
  } catch (error: any) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ message: 'Error updating user permissions: ' + error.message });
  }
});

// SYSTEM ROLES LOCK LIST
const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'QLTS_MANAGER', 'DEPARTMENT_MANAGER', 'STAFF', 'VIEWER', 'AUDITOR'];

// Create new Custom Role
router.post('/roles', requirePermission('ROLE_MANAGE'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Tên vai trò không được bỏ trống.' });
    }
    const cleanName = name.trim().toUpperCase();
    if (SYSTEM_ROLES.includes(cleanName)) {
      return res.status(400).json({ message: 'Không thể tạo vai trò trùng tên hệ thống mặc định.' });
    }

    const role = await prisma.role.create({
      data: { name: cleanName, description }
    });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tạo vai trò: ' + error.message });
  }
});

// Update Role Permission Matrix Cell
router.patch('/roles/permissions', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { roleCode, permissionCode, enabled } = req.body;

    if (!roleCode || !permissionCode || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Thiếu hoặc sai định dạng roleCode, permissionCode hoặc enabled.' });
    }

    const role = await prisma.role.findUnique({
      where: { name: roleCode }
    });

    if (!role) {
      return res.status(404).json({ success: false, message: `Không tìm thấy vai trò ${roleCode}.` });
    }

    // System roles lock validation
    if (SYSTEM_ROLES.includes(role.name)) {
      return res.status(403).json({ success: false, message: `Đây là vai trò hệ thống (${roleCode}) và không được phép sửa đổi ma trận quyền.` });
    }

    const permission = await prisma.permission.findUnique({
      where: { action: permissionCode }
    });

    if (!permission) {
      return res.status(404).json({ success: false, message: `Không tìm thấy quyền ${permissionCode}.` });
    }

    // Begin transactional updates
    await prisma.$transaction(async (tx) => {
      if (enabled) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id
          }
        });
      } else {
        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
            permissionId: permission.id
          }
        });
      }

      // Log Audit Log
      const currentUser = req.user?.username || 'System';
      await AuditService.log({
        entityType: 'ROLE_PERMISSION',
        entityId: role.id,
        action: 'UPDATE',
        details: JSON.stringify({
          roleCode,
          permissionCode,
          action: enabled ? 'Thêm quyền' : 'Gỡ quyền',
          timestamp: new Date().toISOString()
        }),
        performedBy: currentUser,
        tx
      });
    });

    // Query DB to verify actual persistent state
    const actualRolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId: role.id,
        permissionId: permission.id
      }
    });

    const isActuallyEnabled = !!actualRolePermission;

    return res.json({
      success: true,
      roleCode,
      permissionCode,
      enabled: isActuallyEnabled
    });

  } catch (error: any) {
    console.error('Lỗi khi cập nhật ma trận quyền:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật ma trận quyền: ' + error.message });
  }
});

// Update Role details
router.patch('/roles/:id', requirePermission('ROLE_MANAGE'), async (req: Request, res: Response): Promise<any> => {
  try {
    const roleId = parseInt(req.params.id as string);
    const { name, description } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existingRole) return res.status(404).json({ message: 'Không tìm thấy vai trò.' });

    const isSystemRole = SYSTEM_ROLES.includes(existingRole.name);
    
    // Block editing name of System Roles
    if (isSystemRole && name && name.trim().toUpperCase() !== existingRole.name) {
      return res.status(403).json({ message: 'Không thể đổi tên vai trò hệ thống mặc định.' });
    }

    const cleanName = name ? name.trim().toUpperCase() : existingRole.name;

    const role = await prisma.role.update({
      where: { id: roleId },
      data: { name: cleanName, description }
    });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi cập nhật vai trò: ' + error.message });
  }
});

// Delete Custom Role
router.delete('/roles/:id', requirePermission('ROLE_MANAGE'), async (req: Request, res: Response): Promise<any> => {
  try {
    const roleId = parseInt(req.params.id as string);
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ message: 'Không tìm thấy vai trò.' });

    if (SYSTEM_ROLES.includes(role.name)) {
      return res.status(403).json({ message: 'Đây là vai trò hệ thống và không thể xóa.' });
    }

    // Delete associated UserRoles and RolePermissions first, then delete role
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { roleId } }),
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.role.delete({ where: { id: roleId } })
    ]);

    res.json({ message: 'Xóa vai trò tùy chỉnh thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi xóa vai trò: ' + error.message });
  }
});

// Update Role Permission Matrix
router.post('/roles/:id/permissions', requirePermission('PERMISSION_MANAGE'), async (req: Request, res: Response): Promise<any> => {
  try {
    const roleId = parseInt(req.params.id as string);
    const { permissionIds } = req.body; // Array of permission IDs

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'permissionIds phải là một danh sách mảng.' });
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map(pId => prisma.rolePermission.create({
        data: { roleId, permissionId: parseInt(pId) }
      }))
    ]);

    res.json({ message: 'Cập nhật ma trận quyền cho vai trò thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi cập nhật ma trận quyền: ' + error.message });
  }
});


// Get all Delegations
router.get('/delegations', requirePermission('USER_VIEW'), async (req: AuthRequest, res: Response) => {
  try {
    const delegations = await prisma.roleDelegation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(delegations);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tải danh sách ủy quyền: ' + error.message });
  }
});

// Create Delegation
router.post('/delegations', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { fromUserId, toUserId, roleId, validFrom, validTo, reason } = req.body;
    if (!fromUserId || !toUserId || !roleId || !validFrom || !validTo) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin ủy quyền.' });
    }

    const delegation = await prisma.roleDelegation.create({
      data: {
        fromUserId: parseInt(fromUserId),
        toUserId: parseInt(toUserId),
        roleId: parseInt(roleId),
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        reason
      }
    });

    res.json(delegation);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi thiết lập ủy quyền: ' + error.message });
  }
});

// Revoke Delegation
router.delete('/delegations/:id', requirePermission('PERMISSION_MANAGE'), async (req: Request, res: Response): Promise<any> => {
  try {
    const delegationId = parseInt(req.params.id as string);
    await prisma.roleDelegation.delete({ where: { id: delegationId } });
    res.json({ message: 'Thu hồi ủy quyền thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi thu hồi ủy quyền: ' + error.message });
  }
});

// Get Workflow Requests
router.get('/requests', requirePermission('USER_VIEW'), async (req: AuthRequest, res: Response) => {
  try {
    const isUserAdmin = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.roles?.includes('ADMIN');
    let requests;
    if (isUserAdmin) {
      requests = await prisma.permissionRequest.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } else {
      requests = await prisma.permissionRequest.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' }
      });
    }
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tải danh sách yêu cầu: ' + error.message });
  }
});

// Create Permission/Role Request
router.post('/requests', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { requestedRoleId, requestedPermission, reason, durationDays } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Lý do yêu cầu cấp quyền là bắt buộc.' });
    }

    const request = await prisma.permissionRequest.create({
      data: {
        userId: req.user!.id,
        requestedRoleId: requestedRoleId ? parseInt(requestedRoleId) : null,
        requestedPermission: requestedPermission ? JSON.stringify(requestedPermission) : null,
        reason,
        durationDays: durationDays ? parseInt(durationDays) : null
      }
    });

    res.json(request);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tạo yêu cầu cấp quyền: ' + error.message });
  }
});

// Approve / Reject Permission Request
router.patch('/requests/:id/approve', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const requestId = parseInt(req.params.id as string);
    const { status } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const request = await prisma.permissionRequest.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });

    await prisma.$transaction(async (tx) => {
      // 1. Update Request state
      await tx.permissionRequest.update({
        where: { id: requestId },
        data: {
          status,
          approvedBy: req.user!.username,
          approvedAt: new Date()
        }
      });

      // 2. If APPROVED, apply the grants
      if (status === 'APPROVED') {
        const now = new Date();
        const validTo = request.durationDays ? new Date(now.getTime() + request.durationDays * 24 * 60 * 60 * 1000) : null;

        // Apply role grant
        if (request.requestedRoleId) {
          await tx.userRole.create({
            data: {
              userId: request.userId,
              roleId: request.requestedRoleId,
              validFrom: now,
              validTo
            }
          });
        }

        // Apply permission overrides
        if (request.requestedPermission) {
          const reqPerms = JSON.parse(request.requestedPermission) as string[];
          const targetUser = await tx.user.findUnique({ where: { id: request.userId } });
          const currentExtras = targetUser?.extraPermissionsJson ? JSON.parse(targetUser.extraPermissionsJson) as string[] : [];
          
          const newExtras = Array.from(new Set([...currentExtras, ...reqPerms]));
          
          await tx.user.update({
            where: { id: request.userId },
            data: {
              extraPermissionsJson: JSON.stringify(newExtras)
            }
          });
        }
      }
    });

    res.json({ message: 'Phê duyệt yêu cầu cấp quyền thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi xử lý phê duyệt: ' + error.message });
  }
});

// Import ExcelJS for gorgeous reporting
import ExcelJS from 'exceljs';

// Export Detailed User Permissions Excel
router.get('/permissions/export', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        dataScope: true,
        department: true
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách Phân quyền');

    // Title Block
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO PHÂN QUYỀN HỆ THỐNG QUẢN LÝ TÀI SẢN';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 40;
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F497D' }
    };

    // Subheader
    sheet.mergeCells('A2:H2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Người xuất: ${req.user?.fullName || req.user?.username || 'Admin'}`;
    subCell.font = { name: 'Arial', size: 10, italic: true };
    subCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = ['ID', 'Tài khoản', 'Họ tên', 'Phòng ban', 'Vai trò', 'Phạm vi dữ liệu', 'Quyền đặc biệt', 'Trạng thái'];
    sheet.addRow([]); // Blank row
    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'BFBFBF' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: 'BFBFBF' } },
        right: { style: 'thin', color: { argb: 'BFBFBF' } }
      };
    });

    // Populate data
    users.forEach(u => {
      const rolesStr = u.roles.map(ur => ur.role.name).join(', ');
      const scopeType = u.dataScope?.scopeType || 'SELF';
      const extraCount = u.extraPermissionsJson ? JSON.parse(u.extraPermissionsJson).length : 0;
      const denyCount = u.deniedPermissionsJson ? JSON.parse(u.deniedPermissionsJson).length : 0;
      const specialStr = `${extraCount} cấp thêm / ${denyCount} bị tước`;

      const row = sheet.addRow([
        u.id,
        u.username,
        u.fullName,
        u.department?.name || 'Không có',
        rolesStr,
        scopeType,
        specialStr,
        u.isActive ? 'Đang hoạt động' : 'Bị khóa'
      ]);
      row.height = 22;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } }
        };
        if (colNum === 1 || colNum === 6 || colNum === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Auto fit column widths
    sheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell!({ includeEmpty: false }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoPhanQuyen.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Lỗi khi xuất excel: ' + error.message });
  }
});

// ==========================================
// 🏢 DEPARTMENT MANAGEMENT API ROUTES
// ==========================================

// Password validation helper according to policy
function validatePassword(password: string, username: string): string | null {
  if (password.length < 8) return 'Mật khẩu phải dài tối thiểu 8 ký tự.';
  if (password.toLowerCase() === username.toLowerCase()) return 'Mật khẩu không được trùng với tên đăng nhập.';
  const weakPasswords = ['12345678', '123456789', 'password', 'admin123', 'danko123', 'admin@123'];
  if (weakPasswords.includes(password.toLowerCase())) return 'Mật khẩu quá đơn giản, vui lòng chọn mật khẩu khác.';
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return 'Mật khẩu phải bao gồm cả chữ hoa, chữ thường, chữ số và ít nhất một ký tự đặc biệt.';
  }
  return null;
}
  // GET all departments (with counts of users and assets)
router.get('/departments', requirePermission('USER_VIEW'), async (req: Request, res: Response): Promise<any> => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        users: {
          select: { id: true }
        },
        manager: {
          select: { id: true, fullName: true, username: true }
        },
        company: true
      }
    }) as any[];

    const assets = await prisma.asset.groupBy({
      by: ['departmentName'],
      _count: { id: true }
    });

    const assetCountMap: Record<string, number> = {};
    assets.forEach(a => {
      if (a.departmentName) {
        assetCountMap[a.departmentName] = a._count.id;
      }
    });

    const result = depts.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      type: d.type,
      companyId: d.companyId,
      company: d.company ? { id: d.company.id, name: d.company.name, code: d.company.code } : null,
      parentId: d.parentId,
      managerId: d.managerId,
      manager: d.manager ? { id: d.manager.id, fullName: d.manager.fullName, username: d.manager.username } : null,
      description: d.description,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      userCount: d.users ? d.users.length : 0,
      assetCount: assetCountMap[d.name] || 0
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tải danh sách phòng ban: ' + error.message });
  }
});

// GET department tree view
router.get('/departments/tree', requirePermission('USER_VIEW'), async (req: Request, res: Response): Promise<any> => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        users: { select: { id: true } },
        manager: { select: { id: true, fullName: true, username: true } },
        company: true
      }
    }) as any[];

    const assets = await prisma.asset.groupBy({
      by: ['departmentName'],
      _count: { id: true }
    });

    const assetCountMap: Record<string, number> = {};
    assets.forEach(a => {
      if (a.departmentName) {
        assetCountMap[a.departmentName] = a._count.id;
      }
    });

    const nodes = depts.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      type: d.type,
      parentId: d.parentId,
      managerId: d.managerId,
      manager: d.manager ? { id: d.manager.id, fullName: d.manager.fullName, username: d.manager.username } : null,
      company: d.company ? { id: d.company.id, name: d.company.name, code: d.company.code } : null,
      status: d.status,
      description: d.description,
      userCount: d.users ? d.users.length : 0,
      assetCount: assetCountMap[d.name] || 0,
      children: [] as any[]
    }));

    const nodeMap: Record<number, any> = {};
    nodes.forEach(n => {
      nodeMap[n.id] = n;
    });

    const roots: any[] = [];
    nodes.forEach(n => {
      if (n.parentId && nodeMap[n.parentId]) {
        nodeMap[n.parentId].children.push(n);
      } else {
        roots.push(n);
      }
    });

    res.json(roots);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tải sơ đồ cơ cấu tổ chức: ' + error.message });
  }
});

// POST create department
router.post('/departments', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { code, name, type, companyId, parentId, managerId, description, status } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ message: 'Mã, Tên và Loại phòng ban là bắt buộc.' });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.department.findUnique({
      where: { code: cleanCode }
    });
    if (existing) {
      return res.status(400).json({ message: `Mã phòng ban '${cleanCode}' đã được sử dụng.` });
    }

    if (parentId) {
      const parent = await prisma.department.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent) return res.status(400).json({ message: 'Phòng ban cha không tồn tại.' });
    }

    const dept = await prisma.department.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        type,
        companyId: companyId ? parseInt(companyId) : null,
        parentId: parentId ? parseInt(parentId) : null,
        managerId: managerId ? parseInt(managerId) : null,
        description: description ? description.trim() : null,
        status: status || 'ACTIVE'
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      action: 'CREATE',
      details: JSON.stringify({ deptCode: dept.code, name: dept.name, type: dept.type }),
      performedBy: currentUser
    });

    res.status(201).json(dept);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tạo phòng ban: ' + error.message });
  }
});

// PATCH update department
router.patch('/departments/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const { code, name, type, companyId, parentId, managerId, description, status } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } }) as any;
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy phòng ban.' });

    const updateData: any = {};
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const double = await prisma.department.findUnique({ where: { code: cleanCode } });
        if (double) return res.status(400).json({ message: `Mã phòng ban '${cleanCode}' đã được sử dụng.` });
        updateData.code = cleanCode;
      }
    }

    if (name) updateData.name = name.trim();
    if (type) updateData.type = type;
    if (companyId !== undefined) updateData.companyId = companyId ? parseInt(companyId) : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (managerId !== undefined) updateData.managerId = managerId ? parseInt(managerId) : null;

    if (parentId !== undefined) {
      const newParentId = parentId ? parseInt(parentId) : null;
      if (newParentId === id) {
        return res.status(400).json({ message: 'Không thể chọn chính phòng ban này làm phòng ban cha.' });
      }

      if (newParentId) {
        // Prevent loop hierarchy
        let currentParentId: number | null = newParentId;
        const allDepts = await prisma.department.findMany({ select: { id: true, parentId: true } });
        const parentMap = new Map<number, number | null>();
        allDepts.forEach(d => parentMap.set(d.id, d.parentId));

        while (currentParentId) {
          if (currentParentId === id) {
            return res.status(400).json({ message: 'Lỗi cấu trúc: Chọn phòng ban cha này sẽ tạo thành vòng lặp cây thư mục.' });
          }
          currentParentId = parentMap.get(currentParentId) || null;
        }
      }
      updateData.parentId = newParentId;
    }

    const updated = await prisma.department.update({
      where: { id },
      data: updateData
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'DEPARTMENT',
      entityId: id,
      action: 'UPDATE',
      details: JSON.stringify({ old: existing, new: updated }),
      performedBy: currentUser
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi cập nhật thông tin phòng ban: ' + error.message });
  }
});

// DELETE department (safely enforced)
router.delete('/departments/:id', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.department.findUnique({ where: { id } }) as any;
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy phòng ban.' });

    // Enforce check 1: Has users under this department
    const userCount = await prisma.user.count({ where: { departmentId: id } });
    if (userCount > 0) {
      return res.status(400).json({ message: `Không thể xóa phòng ban đang chứa nhân viên (${userCount} người dùng). Hãy chuyển đổi hoặc khóa hoạt động.` });
    }

    // Enforce check 2: Has assets linked to this department name
    const assetCount = await prisma.asset.count({ where: { departmentName: existing.name } });
    if (assetCount > 0) {
      return res.status(400).json({ message: `Không thể xóa phòng ban đang có liên kết với tài sản (${assetCount} tài sản). Hãy đổi trạng thái sang INACTIVE.` });
    }

    // Enforce check 3: Has children departments
    const childrenCount = await prisma.department.count({ where: { parentId: id } });
    if (childrenCount > 0) {
      return res.status(400).json({ message: `Không thể xóa vì phòng ban này đang có các bộ phận con bên dưới. Hãy gán lại các phòng ban con trước.` });
    }

    await prisma.department.delete({ where: { id } });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'DEPARTMENT',
      entityId: id,
      action: 'DELETE',
      details: JSON.stringify({ code: existing.code, name: existing.name }),
      performedBy: currentUser
    });

    res.json({ message: 'Xóa phòng ban thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi xóa phòng ban: ' + error.message });
  }
});

// ==========================================
// 👥 USER ACCOUNTS MANAGEMENT API ROUTES
// ==========================================

// GET all users with extensive filtering
router.get('/users', requirePermission('USER_VIEW'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { q, departmentId, roleId, scope, status } = req.query;

    const where: any = {};
    if (q && typeof q === 'string') {
      where.OR = [
        { username: { contains: q } },
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } }
      ];
    }
    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (scope && typeof scope === 'string') {
      where.dataScope = { scopeType: scope };
    }
    if (roleId) {
      where.roles = { some: { roleId: parseInt(roleId as string) } };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        department: true,
        roles: {
          include: { role: true }
        },
        dataScope: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map response excluding passwordHash
    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      employeeCode: u.employeeCode,
      departmentId: u.departmentId,
      department: u.department ? { id: u.department.id, code: u.department.code, name: u.department.name } : null,
      position: u.position,
      status: u.status,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      passwordChangedAt: u.passwordChangedAt,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.roles.map(ur => ({ id: ur.role.id, name: ur.role.name, description: ur.role.description })),
      dataScope: u.dataScope ? {
        scopeType: u.dataScope.scopeType,
        companyIds: u.dataScope.companyIdsJson ? JSON.parse(u.dataScope.companyIdsJson) : [],
        departmentIds: u.dataScope.departmentIdsJson ? JSON.parse(u.dataScope.departmentIdsJson) : [],
        warehouseIds: u.dataScope.warehouseIdsJson ? JSON.parse(u.dataScope.warehouseIdsJson) : [],
        projectIds: u.dataScope.projectIdsJson ? JSON.parse(u.dataScope.projectIdsJson) : [],
        categoryIds: u.dataScope.categoryIdsJson ? JSON.parse(u.dataScope.categoryIdsJson) : []
      } : null,
      extraDepartmentIds: u.extraDepartmentIds ? JSON.parse(u.extraDepartmentIds) : [],
      extraPermissions: u.extraPermissionsJson ? JSON.parse(u.extraPermissionsJson) : [],
      deniedPermissions: u.deniedPermissionsJson ? JSON.parse(u.deniedPermissionsJson) : []
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi tải danh sách người dùng: ' + error.message });
  }
});

// GET single user details
router.get('/users/:id', requirePermission('USER_VIEW'), async (req: Request, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const u = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        roles: { include: { role: true } },
        dataScope: true
      }
    });

    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    res.json({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      employeeCode: u.employeeCode,
      departmentId: u.departmentId,
      department: u.department ? { id: u.department.id, code: u.department.code, name: u.department.name } : null,
      position: u.position,
      status: u.status,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      passwordChangedAt: u.passwordChangedAt,
      lastLoginAt: u.lastLoginAt,
      roles: u.roles.map(ur => ({ id: ur.role.id, name: ur.role.name })),
      dataScope: u.dataScope ? {
        scopeType: u.dataScope.scopeType,
        companyIds: u.dataScope.companyIdsJson ? JSON.parse(u.dataScope.companyIdsJson) : [],
        departmentIds: u.dataScope.departmentIdsJson ? JSON.parse(u.dataScope.departmentIdsJson) : [],
        warehouseIds: u.dataScope.warehouseIdsJson ? JSON.parse(u.dataScope.warehouseIdsJson) : [],
        projectIds: u.dataScope.projectIdsJson ? JSON.parse(u.dataScope.projectIdsJson) : [],
        categoryIds: u.dataScope.categoryIdsJson ? JSON.parse(u.dataScope.categoryIdsJson) : []
      } : null,
      extraDepartmentIds: u.extraDepartmentIds ? JSON.parse(u.extraDepartmentIds) : [],
      extraPermissions: u.extraPermissionsJson ? JSON.parse(u.extraPermissionsJson) : [],
      deniedPermissions: u.deniedPermissionsJson ? JSON.parse(u.deniedPermissionsJson) : []
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
});

// POST create user account
router.post('/users', requirePermission('USER_CREATE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { 
      username, fullName, password, email, phone, employeeCode, 
      departmentId, position, roleCode, dataScope, extraDepartmentIds, 
      mustChangePassword, note 
    } = req.body;

    if (!username || !fullName || !password || !departmentId || !roleCode) {
      return res.status(400).json({ message: 'Tên đăng nhập, Họ tên, Mật khẩu, Phòng ban và Vai trò là bắt buộc.' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check unique username
    const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại trong hệ thống.' });
    }

    // Check email uniqueness
    if (email && email.trim() !== '') {
      const existingEmail = await prisma.user.findFirst({ where: { email: email.trim() } });
      if (existingEmail) return res.status(400).json({ message: 'Địa chỉ Email này đã được sử dụng.' });
    }

    // Check employeeCode uniqueness
    if (employeeCode && employeeCode.trim() !== '') {
      const existingCode = await prisma.user.findFirst({ where: { employeeCode: employeeCode.trim() } });
      if (existingCode) return res.status(400).json({ message: 'Mã nhân viên đã được gán cho người dùng khác.' });
    }

    // Validate password standard policy
    const pwdErr = validatePassword(password, cleanUsername);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    // Validate roleCode
    const role = await prisma.role.findUnique({ where: { name: roleCode } });
    if (!role) return res.status(400).json({ message: `Vai trò ${roleCode} không hợp lệ.` });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          username: cleanUsername,
          passwordHash,
          fullName: fullName.trim(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          employeeCode: employeeCode ? employeeCode.trim() : null,
          departmentId: parseInt(departmentId),
          position: position ? position.trim() : null,
          status: 'ACTIVE',
          isActive: true,
          mustChangePassword: !!mustChangePassword,
          extraDepartmentIds: extraDepartmentIds ? JSON.stringify(extraDepartmentIds) : null
        }
      });

      // 2. Assign role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id
        }
      });

      // 3. Create data scope
      const scopeType = dataScope?.scopeType || (roleCode === 'STAFF' ? 'SELF' : (roleCode === 'DEPARTMENT_MANAGER' ? 'DEPARTMENT' : 'ALL'));
      await tx.userDataScope.create({
        data: {
          userId: user.id,
          scopeType,
          companyIdsJson: dataScope?.companyIds ? JSON.stringify(dataScope.companyIds) : null,
          departmentIdsJson: dataScope?.departmentIds ? JSON.stringify(dataScope.departmentIds) : null,
          warehouseIdsJson: dataScope?.warehouseIds ? JSON.stringify(dataScope.warehouseIds) : null,
          projectIdsJson: dataScope?.projectIds ? JSON.stringify(dataScope.projectIds) : null,
          categoryIdsJson: dataScope?.categoryIds ? JSON.stringify(dataScope.categoryIds) : null
        }
      });

      return user;
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: newUser.id,
      action: 'CREATE',
      details: JSON.stringify({ username: newUser.username, fullName: newUser.fullName, roleCode, note }),
      performedBy: currentUser
    });

    res.status(201).json({
      success: true,
      message: `Đã tạo user ${newUser.username} thành công.`,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Lỗi khi tạo tài khoản người dùng: ' + error.message });
  }
});

// PATCH update user details
router.patch('/users/:id', requirePermission('USER_UPDATE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const { 
      fullName, email, phone, employeeCode, departmentId, position, 
      roleCode, dataScope, extraDepartmentIds, status 
    } = req.body;

    const u = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } }
    });
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    // Validate system locks
    if (u.username === 'admin' && status && status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Không thể khóa hoặc tắt hoạt động tài khoản quản trị viên admin tối cao.' });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (position !== undefined) updateData.position = position ? position.trim() : null;
    if (status) {
      updateData.status = status;
      updateData.isActive = status === 'ACTIVE';
    }
    
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (extraDepartmentIds !== undefined) updateData.extraDepartmentIds = extraDepartmentIds ? JSON.stringify(extraDepartmentIds) : null;

    if (email !== undefined) {
      const cleanEmail = email ? email.trim() : null;
      if (cleanEmail && cleanEmail !== u.email) {
        const double = await prisma.user.findFirst({ where: { email: cleanEmail } });
        if (double) return res.status(400).json({ message: 'Địa chỉ Email này đã được sử dụng.' });
      }
      updateData.email = cleanEmail;
    }

    if (employeeCode !== undefined) {
      const cleanCode = employeeCode ? employeeCode.trim() : null;
      if (cleanCode && cleanCode !== u.employeeCode) {
        const double = await prisma.user.findFirst({ where: { employeeCode: cleanCode } });
        if (double) return res.status(400).json({ message: 'Mã nhân viên đã được gán cho người dùng khác.' });
      }
      updateData.employeeCode = cleanCode;
    }

    if (departmentId) {
      updateData.departmentId = parseInt(departmentId);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update user details
      await tx.user.update({
        where: { id },
        data: updateData
      });

      // 2. Update Role if roleCode changed
      if (roleCode) {
        const targetRole = await tx.role.findUnique({ where: { name: roleCode } });
        if (!targetRole) throw new Error(`Mã vai trò ${roleCode} không hợp lệ.`);

        // Delete old role mapping
        await tx.userRole.deleteMany({ where: { userId: id } });
        // Create new role mapping
        await tx.userRole.create({
          data: { userId: id, roleId: targetRole.id }
        });
      }

      // 3. Update Data Scope if provided
      if (dataScope) {
        const { scopeType, companyIds, departmentIds, warehouseIds, projectIds, categoryIds } = dataScope;
        await tx.userDataScope.upsert({
          where: { userId: id },
          update: {
            scopeType,
            companyIdsJson: companyIds ? JSON.stringify(companyIds) : null,
            departmentIdsJson: departmentIds ? JSON.stringify(departmentIds) : null,
            warehouseIdsJson: warehouseIds ? JSON.stringify(warehouseIds) : null,
            projectIdsJson: projectIds ? JSON.stringify(projectIds) : null,
            categoryIdsJson: categoryIds ? JSON.stringify(categoryIds) : null
          },
          create: {
            userId: id,
            scopeType,
            companyIdsJson: companyIds ? JSON.stringify(companyIds) : null,
            departmentIdsJson: departmentIds ? JSON.stringify(departmentIds) : null,
            warehouseIdsJson: warehouseIds ? JSON.stringify(warehouseIds) : null,
            projectIdsJson: projectIds ? JSON.stringify(projectIds) : null,
            categoryIdsJson: categoryIds ? JSON.stringify(categoryIds) : null
          }
        });
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      details: JSON.stringify({ old: u, updated: req.body }),
      performedBy: currentUser
    });

    res.json({ success: true, message: 'Cập nhật tài khoản người dùng thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi sửa đổi tài khoản người dùng: ' + error.message });
  }
});

// POST reset password
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userPerms = req.user?.permissions || [];
    const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
    if (!isSuperAdmin && !userPerms.includes('USER_RESET_PASSWORD') && !userPerms.includes('PERMISSION_MANAGE')) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác đặt lại mật khẩu.' });
    }

    const id = parseInt(req.params.id as string);
    const { password, mustChangePassword } = req.body;

    if (!password) return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu mới.' });

    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    // Block reset SUPER_ADMIN unless current user is admin/SUPER_ADMIN
    if (u.username === 'admin' && req.user?.username !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền thay đổi mật khẩu của quản trị viên admin tối cao.' });
    }

    // Validate standard policy
    const pwdErr = validatePassword(password, u.username);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: !!mustChangePassword,
        passwordChangedAt: new Date()
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: id,
      action: 'RESET_PASSWORD',
      details: { mustChangePassword: !!mustChangePassword },
      performedBy: currentUser
    });

    res.json({ success: true, message: `Mật khẩu cho tài khoản ${u.username} đã được cài đặt lại.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi cài đặt lại mật khẩu: ' + error.message });
  }
});

// POST lock user account
router.post('/users/:id/lock', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    if (u.username === 'admin') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản admin tối cao.' });
    }

    await prisma.user.update({
      where: { id },
      data: {
        status: 'LOCKED',
        isActive: false
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      details: JSON.stringify({ action: 'LOCK_USER', username: u.username }),
      performedBy: currentUser
    });

    res.json({ success: true, message: `Tài khoản ${u.username} đã bị khóa.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi: ' + error.message });
  }
});

// POST unlock user account
router.post('/users/:id/unlock', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      details: JSON.stringify({ action: 'UNLOCK_USER', username: u.username }),
      performedBy: currentUser
    });

    res.json({ success: true, message: `Mở khóa tài khoản ${u.username} thành công.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi: ' + error.message });
  }
});

// POST revoke custom user permissions
router.post('/users/:id/revoke-permissions', requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = parseInt(req.params.id as string);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    await prisma.user.update({
      where: { id },
      data: {
        extraPermissionsJson: null,
        deniedPermissionsJson: null
      }
    });

    // Write Audit Log
    const currentUser = req.user?.username || 'System';
    await AuditService.log({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      details: JSON.stringify({ action: 'REVOKE_USER_PERMISSION', username: u.username }),
      performedBy: currentUser
    });

    res.json({ success: true, message: `Đã thu hồi toàn bộ quyền đặc biệt của ${u.username}.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi: ' + error.message });
  }
});

export default router;
