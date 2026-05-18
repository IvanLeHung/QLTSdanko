import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    roles: string[];
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
  if (!req.user?.roles?.includes('SUPER_ADMIN') && !req.user?.roles?.includes('ADMIN_TS')) {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};
