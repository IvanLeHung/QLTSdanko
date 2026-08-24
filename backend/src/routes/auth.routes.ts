import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest, loadPermissions } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { getJwtSecret } from '../utils/auth-config';

const router = Router();
const JWT_SECRET = getJwtSecret();

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
  const username = typeof req.body.username === 'string'
    ? req.body.username.trim().toLowerCase()
    : '';
  const password = typeof req.body.password === 'string'
    ? req.body.password
    : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  console.log(`Login attempt for: ${username}`);

  try {
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
      await AuditService.log({
        entityType: 'USER',
        entityId: -1,
        action: 'LOGIN_FAILED',
        details: { reason: 'Tài khoản không tồn tại', username },
        performedBy: username || 'System'
      });
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Account status/lock checks. Expired temporary locks are allowed to continue
    // so a correct password can reactivate the account below.
    if (!user.isActive || (user.status === 'LOCKED' && !user.lockedUntil)) {
      console.log(`Login failed for ${username}: Account is locked or inactive`);
      await AuditService.log({
        entityType: 'USER',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        details: { reason: 'Tài khoản bị khóa thủ công hoặc không hoạt động' },
        performedBy: username
      });
      return res.status(401).json({ message: 'Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ Admin.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      console.log(`Login failed for ${username}: Incorrect password`);

      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return res.status(401).json({ message: 'Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.' });
      }

      const nextFailedCount = (user.failedLoginCount || 0) + 1;
      
      if (nextFailedCount >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: nextFailedCount,
            lockedUntil,
            status: 'LOCKED' // Still set LOCKED status so it shows locked properly, but lockedUntil takes precedence
          }
        });

        await AuditService.log({
          entityType: 'USER',
          entityId: user.id,
          action: 'LOCK_USER_BY_FAILED_LOGIN',
          details: { reason: 'Nhập sai mật khẩu 5 lần liên tiếp' },
          performedBy: username
        });

        return res.status(401).json({ message: 'Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.' });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: nextFailedCount }
        });

        await AuditService.log({
          entityType: 'USER',
          entityId: user.id,
          action: 'LOGIN_FAILED',
          details: { reason: 'Mật khẩu không đúng', attempt: nextFailedCount },
          performedBy: username
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
        isActive: true,
        status: 'ACTIVE',
        lastLoginAt: new Date()
      }
    });

    await AuditService.log({
      entityType: 'USER',
      entityId: user.id,
      action: 'LOGIN_SUCCESS',
      details: { ip: req.ip || '' },
      performedBy: username
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
  } catch (err: any) {
    console.error('Error logging in:', err);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập: ' + err.message });
  }
});

router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user) {
      await AuditService.log({
        entityType: 'USER',
        entityId: req.user.id,
        action: 'LOGOUT',
        performedBy: req.user.username
      });
    }
    res.json({ success: true, message: 'Đăng xuất thành công.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi đăng xuất: ' + error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { usernameOrEmail } = req.body;
    if (!usernameOrEmail) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tên đăng nhập hoặc email.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail }
        ]
      }
    });

    // Email delivery is not implemented. Never expose a reset token in logs.
    void user;
    return res.status(503).json({
      code: 'PASSWORD_RESET_UNAVAILABLE',
      message: 'Chức năng khôi phục qua email chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi yêu cầu đặt lại mật khẩu: ' + error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Mã xác thực và mật khẩu mới không được để trống.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    if (decoded.purpose !== 'reset-password') {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    const pwdErr = validatePassword(newPassword, user.username);
    if (pwdErr) return res.status(400).json({ message: pwdErr });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date()
      }
    });

    await AuditService.log({
      entityType: 'USER',
      entityId: user.id,
      action: 'RESET_PASSWORD',
      details: { reason: 'Reset qua mã xác thực (Forgot Password)' },
      performedBy: user.username
    });

    res.json({ success: true, message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập bằng mật khẩu mới.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu: ' + error.message });
  }
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

    await AuditService.log({
      entityType: 'USER',
      entityId: user.id,
      action: 'CHANGE_PASSWORD',
      performedBy: user.username
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
    departmentName: req.user.departmentName,
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
