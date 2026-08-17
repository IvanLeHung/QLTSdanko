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
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  Building2,
  Layers,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Printer,
  History,
  Shield,
  BookOpen,
  Hammer,
  FileSpreadsheet,
  Database,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ModalManager } from './ModalManager';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navSections = [
  {
    title: '',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, requiredPermission: 'REPORT_VIEW' },
      { name: 'Enterprise Dashboard', path: '/enterprise-dashboard', icon: Building2, requiredPermission: 'REPORT_VIEW' },
      { name: 'AI Insights', path: '/ai-insights', icon: AlertTriangle, requiredPermission: 'REPORT_VIEW' }
    ]
  },
  {
    title: 'Sổ tài sản',
    items: [
      { name: 'Sổ tài sản', path: '/assets', icon: BookOpen, requiredPermission: 'ASSET_VIEW' },
      { name: 'Cấp mới / nhập lô', path: '/assets/new', icon: PlusCircle, requiredPermission: 'ASSET_CREATE' },
      { name: 'Bàn giao / Điều chuyển', path: '/handover', icon: UserPlus, requiredPermission: 'TRANSFER_VIEW' },
      { name: 'Báo hỏng / Sửa chữa', path: '/operational/damage', icon: AlertTriangle, requiredPermission: 'REPAIR_VIEW' },
      { name: 'Báo mất tài sản', path: '/operational/lost', icon: ShieldAlert, requiredPermission: 'REPAIR_VIEW' },
      { name: 'Thanh lý tài sản', path: '/operational/liquidation', icon: Trash2, requiredPermission: 'REPAIR_VIEW' },
      { name: 'Kiểm kê tài sản', path: '/inventory', icon: ClipboardCheck, requiredPermission: 'INVENTORY_VIEW' },
      { name: 'Nhập Excel tài sản', path: '/import/assets', icon: FileSpreadsheet, requiredPermission: 'ASSET_CREATE' },
      { name: 'Import lịch sử tài sản', path: '/import/assets-history', icon: History, requiredPermission: 'ASSET_CREATE' },
      { name: 'Trung tâm in ấn', path: '/print-center', icon: Printer, requiredPermission: 'ASSET_PRINT_LABEL' }
    ]
  },
  {
    title: 'Công cụ dụng cụ',
    items: [
      { name: 'Công cụ dụng cụ', path: '/tools', icon: Hammer, requiredPermission: 'TOOL_VIEW' },
      { name: 'Dashboard CCDC mã con', path: '/tools/child-dashboard', icon: LayoutDashboard, requiredPermission: 'TOOL_VIEW' },
      { name: 'Cấp mới / nhập lô', path: '/tools/new', icon: PlusCircle, requiredPermission: 'TOOL_VIEW' },
      { name: 'Bàn giao / Điều chuyển', path: '/tools?workflow=handover', icon: UserPlus, requiredPermission: 'TOOL_VIEW' },
      { name: 'Báo hỏng / Sửa chữa', path: '/tools?status=DAMAGED', icon: Wrench, requiredPermission: 'TOOL_VIEW' },
      { name: 'Báo mất Công cụ dụng cụ', path: '/tools?status=LOST', icon: ShieldAlert, requiredPermission: 'TOOL_VIEW' },
      { name: 'Thanh lý / Hủy Công cụ dụng cụ', path: '/tools?status=WAITING_LIQUIDATION', icon: Trash2, requiredPermission: 'TOOL_VIEW' },
      { name: 'Kiểm kê Công cụ dụng cụ', path: '/tools/inventory', icon: ClipboardCheck, requiredPermission: 'TOOL_VIEW' },
      { name: 'Lịch sử tổng hợp', path: '/tools/history', icon: History, requiredPermission: 'TOOL_VIEW' }
    ]
  },
  {
    title: 'Cài đặt',
    items: [
      { name: 'Phân quyền & Scope', path: '/settings/permissions', icon: Shield, requiredPermission: 'USER_VIEW' },
      { name: 'Big Data Center', path: '/settings/big-data', icon: Database, requiredPermission: 'PERMISSION_MANAGE' },
      { name: 'Nhật ký hoạt động', path: '/activity-logs', icon: History, requiredPermission: 'AUDIT_LOG_VIEW' },
      { name: 'Cấu trúc tài sản', path: '/settings/classification', icon: Layers, requiredPermission: 'ROLE_MANAGE' },
      { name: 'Công ty thành viên', path: '/settings/companies', icon: Building2, requiredPermission: 'ROLE_MANAGE' },
      { name: 'Biểu mẫu / Hồ sơ', path: '/documents', icon: FileText, requiredPermission: 'ASSET_VIEW' }
    ]
  }
];

const navItems = navSections.flatMap(section => section.items);

const isPathActive = (currentPath: string, currentSearch: string, itemPath: string) => {
  const [path, search = ''] = itemPath.split('?');
  if (search) return currentPath === path && currentSearch === `?${search}`;
  if (path === '/tools') return currentPath === '/tools' && !currentSearch;
  if (path === '/assets') return currentPath === '/assets';
  return currentPath === path || currentPath.startsWith(`${path}/`);
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNav = navItems
    .filter(item => hasPermission(item.requiredPermission))
    .find(item => isPathActive(location.pathname, location.search, item.path));

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] bg-slate-50">
      <aside className={cn(
        "hidden lg:flex transition-all duration-300 bg-white flex-col shrink-0 print:hidden",
        isSidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-72 border-r border-slate-200"
      )}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600 tracking-tight">AssetManager</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Enterprise Edition</p>
        </div>

        <nav className="flex-1 px-4 pb-4 overflow-y-auto space-y-5">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item => hasPermission(item.requiredPermission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || 'main'} className="space-y-1">
                {section.title && (
                  <div className="px-3 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {section.title}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isActive = isPathActive(location.pathname, location.search, item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all group',
                        isActive
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <item.icon className={cn(
                        'mr-3 h-4 w-4',
                        isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-500'
                      )} />
                      <span className="truncate">{item.name}</span>
                      {isActive && <ChevronRight className="ml-auto h-4 w-4 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate w-40">{user?.fullName}</p>
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

      <aside className="hidden md:flex lg:hidden fixed inset-y-0 left-0 z-40 w-16 bg-white border-r border-slate-200 flex-col items-center py-3 print:hidden">
        <button
          type="button"
          onClick={() => setIsNavDrawerOpen(true)}
          className="h-11 w-11 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
          title="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav className="mt-4 flex-1 flex flex-col items-center gap-1 overflow-y-auto custom-scrollbar">
          {navItems.filter(item => hasPermission(item.requiredPermission)).map((item) => {
            const isActive = isPathActive(location.pathname, location.search, item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsNavDrawerOpen(false)}
                title={item.name}
                className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center transition-all",
                  isActive ? "bg-primary-50 text-primary-700" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="h-11 w-11 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsNavDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 max-w-[86vw] bg-white shadow-2xl border-r border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-primary-600 tracking-tight">AssetManager</h1>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Enterprise Edition</p>
              </div>
              <button onClick={() => setIsNavDrawerOpen(false)} className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-5">
              {navSections.map((section) => {
                const visibleItems = section.items.filter(item => hasPermission(item.requiredPermission));
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.title || 'main'} className="space-y-1">
                    {section.title && <div className="px-3 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{section.title}</div>}
                    {visibleItems.map((item) => {
                      const isActive = isPathActive(location.pathname, location.search, item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsNavDrawerOpen(false)}
                          className={cn(
                            'flex items-center px-3 py-3 text-sm font-semibold rounded-xl transition-all',
                            isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-primary-600' : 'text-slate-400')} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden md:pl-16 lg:pl-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.matchMedia('(min-width: 1024px)').matches) {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                } else {
                  setIsNavDrawerOpen(true);
                }
              }}
              className="h-11 w-11 hover:bg-slate-100 rounded-xl text-slate-500 transition-all cursor-pointer flex items-center justify-center"
              title={isSidebarCollapsed ? "Hiện thanh menu" : "Ẩn thanh menu"}
            >
              {isSidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5 hidden lg:block" />}
              <Menu className="h-5 w-5 lg:hidden" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {currentNav?.name || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center space-x-4" />
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
          {children}
        </div>
        <ModalManager />
      </main>
    </div>
  );
};
