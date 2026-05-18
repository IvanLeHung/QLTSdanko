import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    fullName?: string;
    roles: string[];
    permissions?: string[];
    dataScope?: any;
    departmentName?: string | null;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

export const hasRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.roles?.includes(role)) {
      return res.status(403).json({ message: `Access denied. ${role} role required.` });
    }
    next();
  };
};

export const hasAnyRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const hasMatch = roles.some(role => userRoles.includes(role));
    if (!hasMatch) {
      return res.status(403).json({ message: `Access denied. One of [${roles.join(', ')}] roles required.` });
    }
    next();
  };
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.roles?.includes('SUPER_ADMIN') && !req.user?.roles?.includes('ADMIN_TS') && !req.user?.roles?.includes('ADMIN')) {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

export const loadPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return next();

  try {
    const now = new Date();

    // 1. Fetch user's own active roles and scopes
    const userWithRoles = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (userWithRoles) {
      // 2. Fetch active delegations where this user is the delegatee (toUserId)
      const activeDelegations = await prisma.roleDelegation.findMany({
        where: {
          toUserId: req.user.id,
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now }
        }
      });

      let delegatedRoles: any[] = [];
      let delegatedScopes: any[] = [];

      if (activeDelegations.length > 0) {
        const delegatorIds = activeDelegations.map(d => d.fromUserId);
        const delegators = await prisma.user.findMany({
          where: { id: { in: delegatorIds } },
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
            dataScope: true
          }
        });

        delegators.forEach(d => {
          // Filter delegated roles for active ones
          const activeDelRoles = d.roles.filter(ur => {
            if (ur.validFrom && ur.validFrom > now) return false;
            if (ur.validTo && ur.validTo < now) return false;
            return true;
          });
          delegatedRoles.push(...activeDelRoles);
          if (d.dataScope) {
            delegatedScopes.push(d.dataScope);
          }
        });
      }

      // 3. Filter user's own active roles (check validFrom & validTo)
      const activeUserRoles = userWithRoles.roles.filter(ur => {
        if (ur.validFrom && ur.validFrom > now) return false;
        if (ur.validTo && ur.validTo < now) return false;
        return true;
      });

      // 4. Merge all active roles (own + delegated)
      const allActiveRoles = [...activeUserRoles, ...delegatedRoles];
      const rolePerms = new Set<string>();
      req.user.roles = []; // Refresh roles array

      allActiveRoles.forEach(ur => {
        if (!req.user!.roles.includes(ur.role.name)) {
          req.user!.roles.push(ur.role.name);
        }
        ur.role.permissions.forEach((rp: any) => {
          rolePerms.add(rp.permission.action);
        });
      });

      // 5. Parse overrides (Extra & Denied)
      const extraPerms: string[] = userWithRoles.extraPermissionsJson ? JSON.parse(userWithRoles.extraPermissionsJson) : [];
      const deniedPerms: string[] = userWithRoles.deniedPermissionsJson ? JSON.parse(userWithRoles.deniedPermissionsJson) : [];

      // 6. Compute Effective Permissions: Role Permissions + Extra - Denied
      const effectivePerms = new Set<string>(rolePerms);
      extraPerms.forEach(p => effectivePerms.add(p));
      deniedPerms.forEach(p => effectivePerms.delete(p));

      req.user.permissions = Array.from(effectivePerms);

      // 7. Merge Data Scopes (own + delegated)
      let mergedScope: any = userWithRoles.dataScope ? { ...userWithRoles.dataScope } : null;

      if (delegatedScopes.length > 0) {
        if (!mergedScope) {
          mergedScope = { ...delegatedScopes[0] };
        } else {
          // If B is ALL or any delegator is ALL, the merged scope becomes ALL
          if (mergedScope.scopeType === 'ALL' || delegatedScopes.some(s => s.scopeType === 'ALL')) {
            mergedScope.scopeType = 'ALL';
          } else {
            mergedScope.scopeType = 'CUSTOM';
            const combineJson = (json1: string | null, json2: string | null) => {
              try {
                const arr1 = json1 ? JSON.parse(json1) : [];
                const arr2 = json2 ? JSON.parse(json2) : [];
                return JSON.stringify(Array.from(new Set([...arr1, ...arr2])));
              } catch (e) {
                return json1 || json2 || '[]';
              }
            };

            delegatedScopes.forEach(ds => {
              mergedScope.companyIdsJson = combineJson(mergedScope.companyIdsJson, ds.companyIdsJson);
              mergedScope.departmentIdsJson = combineJson(mergedScope.departmentIdsJson, ds.departmentIdsJson);
              mergedScope.warehouseIdsJson = combineJson(mergedScope.warehouseIdsJson, ds.warehouseIdsJson);
              mergedScope.projectIdsJson = combineJson(mergedScope.projectIdsJson, ds.projectIdsJson);
              mergedScope.categoryIdsJson = combineJson(mergedScope.categoryIdsJson, ds.categoryIdsJson);
            });
          }
        }
      }

      req.user.dataScope = mergedScope;
      req.user.fullName = userWithRoles.fullName;
      req.user.departmentName = userWithRoles.department?.name || null;
    }
    
    next();
  } catch (error) {
    console.error('Error loading permissions:', error);
    next();
  }
};

export const requirePermission = (permissionCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // SUPER_ADMIN has full access
    if (req.user?.roles?.includes('SUPER_ADMIN')) {
      return next();
    }

    if (!req.user?.permissions?.includes(permissionCode)) {
      return res.status(403).json({ message: `Access denied. Requires permission: ${permissionCode}` });
    }
    next();
  };
};
