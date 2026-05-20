import React from 'react';
import { useAuth } from '../context/AuthContext';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component Can dùng để kiểm soát việc hiển thị UI dựa trên quyền của người dùng.
 * Sử dụng: <Can permission="asset.delete"> <button>Xóa</button> </Can>
 */
export const Can: React.FC<CanProps> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
