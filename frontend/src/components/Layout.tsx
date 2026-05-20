import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  UserPlus, 
  ClipboardCheck, 
  Wrench, 
  FileText, 
  Upload, 
  Settings,
  LogOut,
  ChevronRight,
  Building2,
  Layers,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Printer,
  History,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, requiredPermission: 'REPORT_VIEW' },
  { name: 'Sổ tài sản', path: '/assets', icon: Package, requiredPermission: 'ASSET_VIEW' },
  { name: 'Cấp mới / Nhập lô', path: '/assets/new', icon: PlusCircle, requiredPermission: 'ASSET_CREATE' },
  { name: 'Bàn giao / Điều chuyển', path: '/handover', icon: UserPlus, requiredPermission: 'TRANSFER_VIEW' },
  { name: 'Báo hỏng / Sửa chữa', path: '/operational/damage', icon: AlertTriangle, requiredPermission: 'REPAIR_VIEW' },
  { name: 'Báo mất tài sản', path: '/operational/lost', icon: ShieldAlert, requiredPermission: 'REPAIR_VIEW' },
  { name: 'Thanh lý tài sản', path: '/operational/liquidation', icon: Trash2, requiredPermission: 'REPAIR_VIEW' },
  { name: 'Kiểm kê tài sản', path: '/inventory', icon: ClipboardCheck, requiredPermission: 'INVENTORY_VIEW' },
  { name: 'Biểu mẫu / Hồ sơ', path: '/documents', icon: FileText, requiredPermission: 'ASSET_VIEW' },
  { name: 'Trung tâm in ấn', path: '/print-center', icon: Printer, requiredPermission: 'ASSET_PRINT_LABEL' },
  { name: 'Nhật ký hoạt động', path: '/activity-logs', icon: History, requiredPermission: 'AUDIT_LOG_VIEW' },
  { name: 'Nhập Excel tài sản', path: '/import/assets', icon: Upload, requiredPermission: 'ASSET_CREATE' },
  { name: 'Import lịch sử tài sản', path: '/import/assets-history', icon: History, requiredPermission: 'ASSET_CREATE' },
  { name: 'Phân quyền & Scope', path: '/settings/permissions', icon: Shield, requiredPermission: 'USER_VIEW' },
  { name: 'Cấu trúc tài sản', path: '/settings/classification', icon: Layers, requiredPermission: 'ROLE_MANAGE' },
  { name: 'Công ty thành viên', path: '/settings/companies', icon: Building2, requiredPermission: 'ROLE_MANAGE' },
];

import { ModalManager } from './ModalManager';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600 tracking-tight">AssetManager</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Enterprise Edition</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (!hasPermission(item.requiredPermission)) return null;
            
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all group",
                  isActive 
                    ? "bg-primary-50 text-primary-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-5 w-5",
                  isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-500"
                )} />
                {item.name}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-900 truncate w-32">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-all"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-slate-800">
            {navItems.find(item => location.pathname.startsWith(item.path))?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Header icons or breadcrumbs */}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
        <ModalManager />
      </main>
    </div>
  );
};
