import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  Package, 
  UserCheck, 
  AlertCircle, 
  Activity,
  ClipboardCheck, 
  TrendingUp,
  DollarSign,
  ChevronRight,
  Plus,
  LayoutDashboard,
  ShieldAlert,
  Loader2,
  Filter,
  X,
  ArrowRightLeft,
  FileCheck,
  Archive,
  RefreshCw,
  Clock,
  Wrench,
  Printer,
  Trash2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Parse User Data Scope
  const parseJsonSafe = (str?: string) => {
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  const allowedCompanies = parseJsonSafe(user?.dataScope?.companyIdsJson);
  const allowedDepartments = parseJsonSafe(user?.dataScope?.departmentIdsJson);
  const allowedWarehouses = parseJsonSafe(user?.dataScope?.warehouseIdsJson);
  const allowedProjects = parseJsonSafe(user?.dataScope?.projectIdsJson);

  const isCompanyLocked = user?.roles?.includes('SUPER_ADMIN') ? false : (user?.dataScope?.scopeType === 'COMPANY' || (user?.dataScope?.scopeType === 'CUSTOM' && allowedCompanies.length > 0));
  const isDepartmentLocked = user?.roles?.includes('SUPER_ADMIN') ? false : (user?.dataScope?.scopeType === 'DEPARTMENT' || (user?.dataScope?.scopeType === 'CUSTOM' && allowedDepartments.length > 0));
  const isWarehouseLocked = user?.roles?.includes('SUPER_ADMIN') ? false : (user?.dataScope?.scopeType === 'WAREHOUSE' || (user?.dataScope?.scopeType === 'CUSTOM' && allowedWarehouses.length > 0));
  const isProjectLocked = user?.roles?.includes('SUPER_ADMIN') ? false : (user?.dataScope?.scopeType === 'PROJECT' || (user?.dataScope?.scopeType === 'CUSTOM' && allowedProjects.length > 0));

  // Date presets helper
  const getPresetDates = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'Hôm nay':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case '7 ngày qua':
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        break;
      case 'Tháng này':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'Quý này':
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        break;
      case 'Năm nay':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return { start: '', end: '' };
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  };

  const defaultDates = getPresetDates('Tháng này');

  // Filter States
  const [filters, setFilters] = useState({
    companyCode: isCompanyLocked ? (allowedCompanies[0] || '') : '',
    departmentName: isDepartmentLocked ? (allowedDepartments[0] || user?.departmentName || '') : '',
    cityName: '',
    projectName: isProjectLocked ? (allowedProjects[0] || '') : '',
    locationName: isWarehouseLocked ? (allowedWarehouses[0] || '') : '',
    preset: 'Tháng này',
    startDate: defaultDates.start,
    endDate: defaultDates.end
  });

  const [tempFilters, setTempFilters] = useState({ ...filters });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Metadata Lists for Popover
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  // API Data States
  const [summary, setSummary] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        api.get('/settings/companies').then(res => setCompanies(res.data)).catch(() => {});
        api.get('/settings/departments').then(res => setDepartments(res.data)).catch(() => {});
        api.get('/settings/locations').then(res => setLocations(res.data)).catch(() => {});
        api.get('/assets/filter-options/cities').then(res => setCities(res.data)).catch(() => {});
        api.get('/assets/filter-options/projects').then(res => setProjects(res.data)).catch(() => {});
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = {
        companyCode: filters.companyCode || undefined,
        departmentName: filters.departmentName || undefined,
        cityName: filters.cityName || undefined,
        projectName: filters.projectName || undefined,
        locationName: filters.locationName || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };

      const [summaryRes, statsRes, dailyStatsRes, actionItemsRes, activitiesRes] = await Promise.all([
        api.get('/dashboard/summary', { params }).catch(err => { console.error(err); return { data: null }; }),
        api.get('/dashboard/activity-stats', { params }).catch(err => { console.error(err); return { data: null }; }),
        api.get('/dashboard/activity-daily-stats', { params }).catch(err => { console.error(err); return { data: [] }; }),
        api.get('/dashboard/action-items', { params }).catch(err => { console.error(err); return { data: null }; }),
        api.get('/dashboard/recent-activities', { params }).catch(err => { console.error(err); return { data: [] }; })
      ]);

      if (summaryRes.data) setSummary(summaryRes.data);
      if (statsRes.data) setActivityStats(statsRes.data);
      setDailyStats(Array.isArray(dailyStatsRes.data) ? dailyStatsRes.data : []);
      if (actionItemsRes.data) setActionItems(actionItemsRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  // Sync tempFilters when popover opens
  const openPopover = () => {
    setTempFilters({ ...filters });
    setIsFilterOpen(true);
  };

  const handlePresetChange = (preset: string) => {
    const dates = getPresetDates(preset);
    setTempFilters(prev => ({
      ...prev,
      preset,
      startDate: preset === 'Tùy chọn' ? prev.startDate : dates.start,
      endDate: preset === 'Tùy chọn' ? prev.endDate : dates.end
    }));
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    const cleared = {
      companyCode: isCompanyLocked ? (allowedCompanies[0] || '') : '',
      departmentName: isDepartmentLocked ? (allowedDepartments[0] || user?.departmentName || '') : '',
      cityName: '',
      projectName: isProjectLocked ? (allowedProjects[0] || '') : '',
      locationName: isWarehouseLocked ? (allowedWarehouses[0] || '') : '',
      preset: 'Tháng này',
      startDate: defaultDates.start,
      endDate: defaultDates.end
    };
    setFilters(cleared);
    setTempFilters(cleared);
    setIsFilterOpen(false);
  };

  const removeFilterKey = (key: string) => {
    setFilters(prev => {
      const updated = { ...prev };
      if (key === 'companyCode') updated.companyCode = '';
      else if (key === 'departmentName') updated.departmentName = '';
      else if (key === 'cityName') updated.cityName = '';
      else if (key === 'projectName') updated.projectName = '';
      else if (key === 'locationName') updated.locationName = '';
      else if (key === 'date') {
        updated.preset = 'Tháng này';
        updated.startDate = defaultDates.start;
        updated.endDate = defaultDates.end;
      }
      return updated;
    });
  };

  // Helper for generating drill-down query params
  const buildQueryString = (extraParams: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    if (filters.companyCode) query.set('companyCode', filters.companyCode);
    if (filters.departmentName) query.set('departmentName', filters.departmentName);
    if (filters.cityName) query.set('cityName', filters.cityName);
    if (filters.projectName) query.set('projectName', filters.projectName);
    if (filters.locationName) query.set('locationQuery', filters.locationName);
    
    Object.entries(extraParams).forEach(([k, v]) => {
      if (typeof v === 'string') query.set(k, v);
    });
    return '?' + query.toString();
  };

  // Check if price permissions exist
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = user?.roles?.includes('ADMIN');
  const hasPricePermission = isSuperAdmin || isAdmin || user?.permissions?.includes('ASSET_VIEW_PRICE');

  // Build active chips list
  const activeChips: { key: string; label: string; locked?: boolean }[] = [];
  if (filters.companyCode) activeChips.push({ key: 'companyCode', label: `Công ty: ${filters.companyCode}`, locked: isCompanyLocked });
  if (filters.departmentName) activeChips.push({ key: 'departmentName', label: `Phòng ban: ${filters.departmentName}`, locked: isDepartmentLocked });
  if (filters.cityName) activeChips.push({ key: 'cityName', label: `Thành phố: ${filters.cityName}` });
  if (filters.projectName) activeChips.push({ key: 'projectName', label: `Dự án: ${filters.projectName}`, locked: isProjectLocked });
  if (filters.locationName) activeChips.push({ key: 'locationName', label: `Vị trí: ${filters.locationName}`, locked: isWarehouseLocked });
  
  if (filters.preset !== 'Tháng này' || filters.startDate !== defaultDates.start || filters.endDate !== defaultDates.end) {
    const dateLabel = filters.preset === 'Tùy chọn' 
      ? `Thời gian: ${format(new Date(filters.startDate), 'dd/MM/yyyy')} - ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`
      : `Thời gian: ${filters.preset}`;
    activeChips.push({ key: 'date', label: dateLabel });
  }

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  // Fallbacks if summaries fail
  const safeSummary = summary || {
    totalAssets: 0,
    assigned: 0,
    inStock: 0,
    underRepair: 0,
    damaged: 0,
    lost: 0,
    liquidated: 0,
    totalValue: 0,
    remainingValue: 0,
    depreciatedValue: 0
  };

  const safeStats = activityStats || {
    createdAssets: 0,
    transferredAssets: 0,
    handedOverAssets: 0,
    recalledAssets: 0,
    brokenReportedAssets: 0,
    lostReportedAssets: 0,
    liquidatedAssets: 0
  };

  // Cumulative Asset Status Options
  const cumulativeCards = [
    { 
      name: 'Tổng tài sản', 
      value: safeSummary.totalAssets, 
      icon: Package, 
      color: 'text-primary-600', 
      bg: 'bg-primary-50 hover:bg-primary-100', 
      border: 'hover:border-primary-300',
      path: '/assets',
      params: {}
    },
    { 
      name: 'Đang sử dụng', 
      value: safeSummary.assigned, 
      icon: UserCheck, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 hover:bg-emerald-100', 
      border: 'hover:border-emerald-300',
      path: '/assets',
      params: { status: 'ASSIGNED' }
    },
    { 
      name: 'Trong kho', 
      value: safeSummary.inStock, 
      icon: Archive, 
      color: 'text-sky-600', 
      bg: 'bg-sky-50 hover:bg-sky-100', 
      border: 'hover:border-sky-300',
      path: '/assets',
      params: { status: 'IN_STOCK' }
    },
    { 
      name: 'Đang sửa chữa', 
      value: safeSummary.underRepair, 
      icon: Wrench, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50 hover:bg-amber-100', 
      border: 'hover:border-amber-300',
      path: '/assets',
      params: { status: 'UNDER_REPAIR' }
    },
    { 
      name: 'Báo hỏng', 
      value: safeSummary.damaged, 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50 hover:bg-orange-100', 
      border: 'hover:border-orange-300',
      path: '/assets',
      params: { status: 'BROKEN' }
    },
    { 
      name: 'Mất / thất thoát', 
      value: safeSummary.lost, 
      icon: ShieldAlert, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50 hover:bg-rose-100', 
      border: 'hover:border-rose-300',
      path: '/assets',
      params: { status: 'LOST' }
    },
    { 
      name: 'Đã thanh lý', 
      value: safeSummary.liquidated, 
      icon: Trash2, 
      color: 'text-slate-600', 
      bg: 'bg-slate-50 hover:bg-slate-100', 
      border: 'hover:border-slate-300',
      path: '/assets',
      params: { status: 'LIQUIDATED' }
    }
  ];

  // Period-based Activity Options
  const periodCards = [
    { 
      name: 'TS tạo mới', 
      value: safeStats.createdAssets, 
      color: 'text-primary-600', 
      bg: 'bg-primary-50', 
      path: '/assets',
      params: { createdFrom: filters.startDate, createdTo: filters.endDate }
    },
    { 
      name: 'TS bàn giao', 
      value: safeStats.handedOverAssets, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      path: '/handover',
      params: { type: 'HANDOVER', fromDate: filters.startDate, toDate: filters.endDate }
    },
    { 
      name: 'TS điều chuyển', 
      value: safeStats.transferredAssets, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50', 
      path: '/handover',
      params: { type: 'TRANSFER', fromDate: filters.startDate, toDate: filters.endDate }
    },
    { 
      name: 'TS thu hồi', 
      value: safeStats.recalledAssets, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50', 
      path: '/handover',
      params: { type: 'RECALL', fromDate: filters.startDate, toDate: filters.endDate }
    },
    { 
      name: 'TS báo hỏng', 
      value: safeStats.brokenReportedAssets, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50', 
      path: '/operational/damage',
      params: { status: 'ALL', fromDate: filters.startDate, toDate: filters.endDate }
    },
    { 
      name: 'TS mất', 
      value: safeStats.lostReportedAssets, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50', 
      path: '/operational/lost',
      params: { fromDate: filters.startDate, toDate: filters.endDate }
    },
    { 
      name: 'TS thanh lý', 
      value: safeStats.liquidatedAssets, 
      color: 'text-slate-600', 
      bg: 'bg-slate-50', 
      path: '/operational/liquidation',
      params: { fromDate: filters.startDate, toDate: filters.endDate }
    }
  ];

  const dailyStatColumns = [
    { key: 'createdAssets', label: 'Tạo mới', color: 'text-primary-600' },
    { key: 'handedOverAssets', label: 'Bàn giao', color: 'text-emerald-600' },
    { key: 'transferredAssets', label: 'Điều chuyển', color: 'text-indigo-600' },
    { key: 'recalledAssets', label: 'Thu hồi', color: 'text-amber-600' },
    { key: 'brokenReportedAssets', label: 'Báo hỏng', color: 'text-orange-600' },
    { key: 'lostReportedAssets', label: 'Mất', color: 'text-rose-600' },
    { key: 'liquidatedAssets', label: 'Thanh lý', color: 'text-slate-600' }
  ];

  const maxDailyTotal = Math.max(...dailyStats.map((item) => item.total || 0), 1);

  // Action Items Helper Mapping
  const actionList = [
    { 
      label: 'Tài sản bàn giao chờ xác nhận', 
      count: actionItems?.handoverPending, 
      path: '/handover', 
      params: { status: 'PENDING_CONFIRMATION' },
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      icon: Clock
    },
    { 
      label: 'Đợt kiểm kê đang thực hiện', 
      count: actionItems?.inventoryPending, 
      path: '/inventory', 
      params: {},
      color: 'text-primary-600 bg-primary-50 border-primary-100',
      icon: ClipboardCheck
    },
    { 
      label: 'Yêu cầu sửa chữa cần xử lý', 
      count: actionItems?.repairPending, 
      path: '/operational/damage', 
      params: { status: 'OPEN' },
      color: 'text-orange-600 bg-orange-50 border-orange-100',
      icon: Wrench
    },
    { 
      label: 'Sự vụ báo mất đang xử lý', 
      count: actionItems?.lostPending, 
      path: '/operational/lost', 
      params: { status: 'LOST' },
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      icon: ShieldAlert
    },
    { 
      label: 'Tài sản chưa được in nhãn dán', 
      count: actionItems?.noLabelPrint, 
      path: '/print-center', 
      params: {},
      color: 'text-sky-600 bg-sky-50 border-sky-100',
      icon: Printer
    }
  ].filter(item => item.count !== undefined && item.count !== null && item.count > 0);

  // Clean Technical Noise from Recent Activities
  const cleanLogs = activities.filter((log: any) => log.performedBy !== 'SYSTEM' && log.performedBy !== 'IMPORT_EXCEL');

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-xl text-white">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className="text-[32px] font-[900] text-[#0F172A] tracking-tighter leading-none">Hệ thống QLTS</h1>
          </div>
          <p className="text-slate-500 font-medium text-base">Phần mềm quản lý vận hành tài sản tập trung.</p>
        </div>
        <div className="flex items-center space-x-3 relative">
          {/* Filter Popover Trigger */}
          <button 
            onClick={openPopover} 
            className={`h-14 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all flex items-center border ${
              activeChips.length > 0 
                ? 'bg-primary-50 text-primary-700 border-primary-200' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="mr-2 h-4 w-4" /> Bộ lọc 
            {activeChips.length > 0 && <span className="ml-2 bg-primary-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">{activeChips.length}</span>}
          </button>

          <button 
            onClick={() => navigate('/assets/new')} 
            className="bg-primary-600 text-white h-14 px-8 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center shadow-lg shadow-primary-100"
          >
            <Plus className="mr-2 h-5 w-5" /> Cấp mới tài sản
          </button>

          {/* Filter Popover Dropdown Panel */}
          {isFilterOpen && (
            <>
              {/* Click away overlay */}
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
              
              <div className="absolute right-0 top-16 w-[450px] bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 z-50 space-y-5 transform scale-100 transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-black text-slate-800 flex items-center">
                    <Filter className="mr-2 h-5 w-5 text-primary-600" /> Bộ lọc vận hành
                  </h3>
                  <button onClick={() => setIsFilterOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Company */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Công ty (Đơn vị)</label>
                    <select
                      value={tempFilters.companyCode}
                      onChange={(e) => setTempFilters({ ...tempFilters, companyCode: e.target.value })}
                      disabled={isCompanyLocked}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    >
                      <option value="">Tất cả công ty</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phòng ban</label>
                    <select
                      value={tempFilters.departmentName}
                      onChange={(e) => setTempFilters({ ...tempFilters, departmentName: e.target.value })}
                      disabled={isDepartmentLocked}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    >
                      <option value="">Tất cả phòng ban</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Thành phố</label>
                    <input
                      type="text"
                      list="cities-list"
                      value={tempFilters.cityName}
                      onChange={(e) => setTempFilters({ ...tempFilters, cityName: e.target.value })}
                      placeholder="Chọn thành phố"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500"
                    />
                    <datalist id="cities-list">
                      {cities.map((city, idx) => <option key={idx} value={city} />)}
                    </datalist>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dự án</label>
                    <input
                      type="text"
                      list="projects-list"
                      value={tempFilters.projectName}
                      onChange={(e) => setTempFilters({ ...tempFilters, projectName: e.target.value })}
                      disabled={isProjectLocked}
                      placeholder="Chọn dự án"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    />
                    <datalist id="projects-list">
                      {projects.map((project, idx) => <option key={idx} value={project} />)}
                    </datalist>
                  </div>

                  {/* Location/Warehouse */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kho / Vị trí</label>
                    <select
                      value={tempFilters.locationName}
                      onChange={(e) => setTempFilters({ ...tempFilters, locationName: e.target.value })}
                      disabled={isWarehouseLocked}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                    >
                      <option value="">Tất cả kho/vị trí</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.name}>{l.code} - {l.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Preset */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Thời gian lọc phát sinh</label>
                    <select
                      value={tempFilters.preset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500"
                    >
                      <option value="Hôm nay">Hôm nay</option>
                      <option value="7 ngày qua">7 ngày qua</option>
                      <option value="Tháng này">Tháng này</option>
                      <option value="Quý này">Quý này</option>
                      <option value="Năm nay">Năm nay</option>
                      <option value="Tùy chọn">Tùy chọn (Tự nhập)</option>
                    </select>
                  </div>

                  {/* Custom Dates */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Từ ngày</label>
                    <input
                      type="date"
                      value={tempFilters.startDate}
                      onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                      disabled={tempFilters.preset !== 'Tùy chọn'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đến ngày</label>
                    <input
                      type="date"
                      value={tempFilters.endDate}
                      onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                      disabled={tempFilters.preset !== 'Tùy chọn'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                  <button 
                    onClick={clearAllFilters}
                    className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
                  >
                    Bỏ bộ lọc
                  </button>
                  <button 
                    onClick={applyFilters}
                    className="bg-primary-600 text-white rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-fadeIn">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Bộ lọc active:</span>
          {activeChips.map((chip) => (
            <div 
              key={chip.key} 
              className={`flex items-center space-x-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border shadow-sm ${
                chip.locked 
                  ? 'bg-slate-100 text-slate-500 border-slate-200' 
                  : 'bg-white text-primary-700 border-primary-200'
              }`}
            >
              <span>{chip.label}</span>
              {!chip.locked && (
                <button 
                  onClick={() => removeFilterKey(chip.key)}
                  className="hover:text-rose-600 transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:underline transition-colors uppercase tracking-wider ml-auto"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {/* METRICS - "HIỆN TRẠNG TÀI SẢN" */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-6 bg-primary-600 rounded-full" />
          <h2 className="text-xl font-[800] text-slate-800 tracking-tight">Hiện trạng tài sản</h2>
          <span className="text-xs text-slate-400 font-medium">(Số liệu tích lũy đến hiện tại)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {cumulativeCards.map((card) => (
            <div 
              key={card.name} 
              onClick={() => navigate(card.path + buildQueryString(card.params))}
              className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 group cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-xl ${card.border}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${card.bg} ${card.color} transition-colors`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-tight">{card.name}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{card.value?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* METRICS - "THỐNG KÊ PHÁT SINH" */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h2 className="text-xl font-[800] text-slate-800 tracking-tight">Thống kê phát sinh</h2>
          <span className="text-xs text-slate-400 font-medium">
            (Tính trong kỳ từ <span className="font-bold text-slate-600">{format(new Date(filters.startDate), 'dd/MM/yyyy')}</span> đến <span className="font-bold text-slate-600">{format(new Date(filters.endDate), 'dd/MM/yyyy')}</span>)
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {periodCards.map((card) => (
            <div 
              key={card.name} 
              onClick={() => navigate(card.path + buildQueryString(card.params))}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md shadow-slate-100/50 group cursor-pointer transition-all transform hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${card.bg} ${card.color}`}>
                  Trong kỳ
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-tight">{card.name}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{card.value?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DAILY ACTIVITY BREAKDOWN */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-md shadow-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-[800] text-slate-800 tracking-tight">Thống kê phát sinh theo ngày</h2>
              <p className="text-xs font-medium text-slate-400">
                Chỉ hiển thị các ngày có phát sinh trong kỳ đã chọn
              </p>
            </div>
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5">
            {dailyStats.length} ngày có dữ liệu
          </div>
        </div>

        {dailyStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng</th>
                  {dailyStatColumns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyStats.map((item) => (
                  <tr key={item.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-black text-slate-800">
                          {format(new Date(item.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-slate-900 min-w-8">{item.total}</span>
                        <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.max(6, (item.total / maxDailyTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {dailyStatColumns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-sm font-black ${col.color}`}>
                        {item[col.key]?.toLocaleString() || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-bold text-slate-400">Không có phát sinh trong khoảng ngày đã chọn.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: FINANCIALS & ACTION ITEMS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FINANCIAL OVERVIEW (Show only if user has permission) */}
          {hasPricePermission && (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5"><DollarSign className="h-64 w-64" /></div>
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Giá trị sổ sách tài sản</h3>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">Tổng nguyên giá</span>
                </div>
                <div>
                  <p className="text-5xl font-black tracking-tighter mb-2">{safeSummary.totalValue?.toLocaleString()} <span className="text-2xl text-slate-500 font-medium">VNĐ</span></p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-emerald-400 text-sm font-bold">
                      <TrendingUp className="h-4 w-4 mr-1" /> Vận hành ổn định
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Khấu hao lũy kế</p>
                    <p className="text-lg font-bold text-amber-400">{safeSummary.depreciatedValue ? Math.round(safeSummary.depreciatedValue).toLocaleString() : 0} VNĐ</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Giá trị còn lại</p>
                    <p className="text-lg font-bold text-emerald-400">{safeSummary.remainingValue ? Math.round(safeSummary.remainingValue).toLocaleString() : 0} VNĐ</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Đã thanh lý / mất</p>
                    <p className="text-lg font-bold text-rose-400">{safeSummary.liquidated + safeSummary.lost} tài sản</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION ITEMS ("VIỆC CẦN XỬ LÝ") */}
          {actionList.length > 0 ? (
            <div className="bg-amber-50/50 rounded-[2.5rem] p-8 border border-amber-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <h3 className="text-lg font-[800] text-amber-800 tracking-tight">Việc cần xử lý ngay</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actionList.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => navigate(item.path + buildQueryString(item.params))}
                    className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-2xl shrink-0 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 leading-snug group-hover:text-primary-600 transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <span className="bg-amber-600 text-white font-black text-sm px-3.5 py-1.5 rounded-full shrink-0">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/40 rounded-[2.5rem] p-8 border border-emerald-100/50 text-center space-y-3">
              <FileCheck className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="text-emerald-800 font-[800] text-base">Hệ thống vận hành tốt</h4>
              <p className="text-emerald-600/80 text-sm font-medium">Hiện không có công việc hoặc sự vụ nào cần xử lý khẩn cấp.</p>
            </div>
          )}

          {/* DISTRIBUTION */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-[800] text-slate-800 flex items-center tracking-tight">
                <Activity className="mr-3 h-6 w-6 text-primary-600" />
                Phân bổ tài sản đang sử dụng
              </h3>
              <button 
                onClick={() => navigate('/assets')}
                className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary-600 transition-colors"
              >
                Xem chi tiết
              </button>
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'Khối Văn phòng', count: Math.round(safeSummary.assigned * 0.4), color: 'bg-primary-500' },
                { name: 'Khối Dự án', count: Math.round(safeSummary.assigned * 0.5), color: 'bg-emerald-500' },
                { name: 'Ban Quản lý', count: Math.round(safeSummary.assigned * 0.1), color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="font-bold text-slate-400">{item.count} TS</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: `${safeSummary.totalAssets > 0 ? (item.count / safeSummary.totalAssets) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITY & INVENTORY */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-[800] text-slate-800 flex items-center tracking-tight">
                <TrendingUp className="mr-3 h-6 w-6 text-primary-600" />
                Hoạt động gần đây
              </h3>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[480px] pr-2">
              {cleanLogs.length > 0 ? (
                cleanLogs.map((log: any) => (
                  <div key={log.id} className="flex space-x-4 group">
                    <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                      log.action === 'CREATE' ? 'bg-emerald-500' : 
                      log.action === 'UPDATE' ? 'bg-amber-500' : 'bg-primary-500'
                    }`}></div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 leading-snug group-hover:text-primary-600 transition-colors">
                        {log.performedBy} <span className="text-slate-400 font-medium">đã {log.actionVn || log.action}</span> {log.description || `${log.entityVn || log.entityType} #${log.entityId}`}
                      </p>
                      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                        {format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 font-medium text-center py-10">Không tìm thấy hoạt động nào.</p>
              )}
            </div>

            <button 
              onClick={() => navigate('/activity-logs')}
              className="mt-8 w-full py-4 bg-slate-50 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center group"
            >
              Xem toàn bộ nhật ký <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* INVENTORY CARD */}
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><ClipboardCheck className="h-6 w-6" /></div>
              <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Live</span>
            </div>
            <h4 className="text-xl font-black mb-2 tracking-tight">Trạng thái kiểm kê</h4>
            <p className="text-emerald-100 text-sm font-medium mb-6 leading-relaxed">Theo dõi, đối soát và cập nhật hiện trạng tài sản toàn diện theo đợt kiểm kê.</p>
            <button 
              onClick={() => navigate('/inventory')}
              className="w-full py-4 bg-white text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-lg"
            >
              Vào trang kiểm kê
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
