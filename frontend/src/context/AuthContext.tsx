import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
  departmentName?: string | null;
  dataScope?: {
    scopeType: string;
    companyIdsJson?: string;
    departmentIdsJson?: string;
    warehouseIdsJson?: string;
    projectIdsJson?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('auth_user', JSON.stringify(res.data));
      } catch (err: any) {
        const isAuthenticationError = err.response?.status === 401
          || (err.response?.status === 403 && err.response?.data?.message === 'Invalid or expired token.');
        if (isAuthenticationError) {
          localStorage.removeItem('token');
          localStorage.removeItem('auth_user');
        } else {
          try {
            const cachedUser = JSON.parse(localStorage.getItem('auth_user') || 'null');
            if (cachedUser?.id) setUser(cachedUser);
          } catch {
            localStorage.removeItem('auth_user');
          }
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true; // Super admin has all permissions
    return user.permissions.includes(permission);
  };

  const isAdmin = () => {
    if (!user) return false;
    return user.roles.includes('SUPER_ADMIN') || user.roles.includes('ADMIN');
  };

  const refetchUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error('Error refetching user details:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, isAdmin, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

