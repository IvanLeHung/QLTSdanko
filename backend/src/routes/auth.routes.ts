import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

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
      }
    }
  });

  if (!user || !user.isActive) {
    console.log(`Login failed for ${username}: User not found or inactive`);
    return res.status(401).json({ message: 'Invalid credentials or inactive account' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const roleNames = user.roles.map(ur => ur.role.name);
  const permissions = user.roles.flatMap(ur => 
    ur.role.permissions.map(rp => rp.permission.action)
  );

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
      permissions
    },
  });
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
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
      }
    }
  });
  
  if (!user) return res.status(404).json({ message: 'User not found' });

  const roleNames = user.roles.map(ur => ur.role.name);
  const permissions = user.roles.flatMap(ur => 
    ur.role.permissions.map(rp => rp.permission.action)
  );
  const finalRoles = roleNames.length > 0 ? roleNames : [user.role];

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: finalRoles[0],
    roles: finalRoles,
    permissions
  });
});

export default router;
