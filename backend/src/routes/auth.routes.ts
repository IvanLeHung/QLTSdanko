import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest, loadPermissions } from '../middleware/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

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

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for: ${username}`);

  const user = await prisma.user.findUnique({ 
    where: { username },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      },
      dataScope: true
    }
  });

  if (!user) {
    console.log(`Login failed for ${username}: User not found`);
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }

  // Account status/lock checks
  if (user.status === 'LOCKED' || !user.isActive) {
    console.log(`Login failed for ${username}: Account is locked or inactive`);
    return res.status(401).json({ message: 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ Admin.' });
  }

  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const diff = Math.ceil((new Date(user.lockedUntil).getTime() - new Date().getTime()) / 1000 / 60);
    return res.status(401).json({ message: `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${diff} phút.` });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    console.log(`Login failed for ${username}: Incorrect password`);
    const nextFailedCount = (user.failedLoginCount || 0) + 1;
    if (nextFailedCount >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: nextFailedCount,
          status: 'LOCKED',
          isActive: false
        }
      });
      return res.status(401).json({ message: 'Tài khoản đã bị khóa do nhập sai mật khẩu 5 lần liên tiếp. Vui lòng liên hệ admin để mở khóa.' });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: nextFailedCount }
      });
      return res.status(401).json({ message: `Mật khẩu không đúng. Bạn còn ${5 - nextFailedCount} lần thử trước khi tài khoản bị khóa.` });
    }
  }

  console.log(`Login successful for: ${username}`);
  
  // Reset failure count on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });

  const roleNames = user.roles.map(ur => ur.role.name);
  const rolePermissions = user.roles.flatMap(ur => 
    ur.role.permissions.map(rp => rp.permission.action)
  );

  // Compute effective permissions at login time
  const extraPerms: string[] = user.extraPermissionsJson ? JSON.parse(user.extraPermissionsJson) : [];
  const deniedPerms: string[] = user.deniedPermissionsJson ? JSON.parse(user.deniedPermissionsJson) : [];

  const effectivePerms = new Set<string>(rolePermissions);
  extraPerms.forEach(p => effectivePerms.add(p));
  deniedPerms.forEach(p => effectivePerms.delete(p));

  const permissions = Array.from(effectivePerms);

  // Default to user.role if roles array is empty
  const finalRoles = roleNames.length > 0 ? roleNames : [user.role];

  const token = jwt.sign(
    { id: user.id, username: user.username, roles: finalRoles, permissions },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: finalRoles[0],
      roles: finalRoles,
      permissions,
      dataScope: user.dataScope,
      mustChangePassword: user.mustChangePassword
    },
  });
});

router.post('/change-password-force', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Không thể xác thực người dùng.' });
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Mật khẩu cũ và mật khẩu mới không được để trống.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng.' });

    const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Mật khẩu cũ không chính xác.' });
    }

    const pwdErr = validatePassword(newPassword, user.username);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công. Bạn đã có thể truy cập hệ thống.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi đổi mật khẩu: ' + error.message });
  }
});

router.get('/me', authenticateToken, loadPermissions, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { mustChangePassword: true }
  });

  res.json({
    id: req.user.id,
    username: req.user.username,
    fullName: req.user.fullName,
    role: req.user.roles[0],
    roles: req.user.roles,
    permissions: req.user.permissions,
    dataScope: req.user.dataScope,
    mustChangePassword: dbUser?.mustChangePassword || false
  });
});

router.get('/me/permissions', authenticateToken, loadPermissions, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  res.json({
    roles: req.user.roles,
    permissions: req.user.permissions,
    dataScope: req.user.dataScope,
    departmentName: req.user.departmentName
  });
});

export default router;
