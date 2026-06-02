import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  Building2, Plus, Edit2, Trash2, Power, PowerOff, 
  Search, Filter, HelpCircle, X, GitMerge, FileSpreadsheet, 
  List, Network, Info, FileText, Activity, ShieldAlert,
  ChevronRight, ArrowRight, ChevronLeft, Calendar, User
} from 'lucide-react';

interface Company {
  id: number;
  code: string;
  name: string;
  type: string;
  parentId: number | null;
  taxCode: string | null;
  address: string | null;
  status: string;
  mergedIntoId: number | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  parent?: {
    id: number;
    name: string;
    code: string;
  } | null;
  assetCount?: number;
  assetValue?: number;
}

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  hiddenCompanies: number;
  totalAssignedAssets: number;
  unassignedAssets: number;
}

export const CompanySettings: React.FC = () => {
  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    activeCompanies: 0,
    hiddenCompanies: 0,
    totalAssignedAssets: 0,
    unassignedAssets: 0
  });
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  
  // Forms
  const [formData, setFormData] = useState({
    id: null as number | null,
    code: '',
    name: '',
    type: 'COMPANY',
    parentId: '',
    taxCode: '',
    address: '',
    status: 'ACTIVE',
    note: ''
  });
  const [mergeForm, setMergeForm] = useState({ sourceCompanyId: '', targetCompanyId: '' });

  // Drawer (Detail View)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyAssets, setCompanyAssets] = useState<any[]>([]);
  const [companyLogs, setCompanyLogs] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'info' | 'assets' | 'logs'>('info');
  
  // Detail views pagination
  const [assetPage, setAssetPage] = useState(1);
  const [assetTotalPages, setAssetTotalPages] = useState(1);
  const [assetSearch, setAssetSearch] = useState('');

  // Loaders
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Handlers
  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/companies', {
        params: { search, status: statusFilter, type: typeFilter }
      });
      setCompanies(res.data);
    } catch (err) {
      toast.error("Không thể tải danh sách công ty/đơn vị");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/settings/companies/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, [search, statusFilter, typeFilter]);

  const loadCompanyDetails = async (id: number) => {
    try {
      const [detailRes, logRes] = await Promise.all([
        api.get(`/settings/companies/${id}`),
        api.get(`/settings/companies/${id}/logs`)
      ]);
      setSelectedCompany(detailRes.data);
      setCompanyLogs(logRes.data);
      setDrawerTab('info');
      setAssetPage(1);
      setAssetSearch('');
      setIsDrawerOpen(true);
      loadCompanyAssets(id, 1, '');
    } catch (err) {
      toast.error("Không thể tải chi tiết đơn vị.");
    }
  };

  const loadCompanyAssets = async (companyId: number, page: number, searchQ: string) => {
    setLoadingAssets(true);
    try {
      const res = await api.get(`/settings/companies/${companyId}/assets`, {
        params: { page, limit: 8, search: searchQ }
      });
      setCompanyAssets(res.data.assets);
      setAssetTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleAssetSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAssetSearch(val);
    setAssetPage(1);
    if (selectedCompany) {
      loadCompanyAssets(selectedCompany.id, 1, val);
    }
  };

  const handleAssetPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > assetTotalPages) return;
    setAssetPage(newPage);
    if (selectedCompany) {
      loadCompanyAssets(selectedCompany.id, newPage, assetSearch);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      code: '',
      name: '',
      type: 'COMPANY',
      parentId: '',
      taxCode: '',
      address: '',
      status: 'ACTIVE',
      note: ''
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (c: Company) => {
    setFormData({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type || 'COMPANY',
      parentId: c.parentId ? String(c.parentId) : '',
      taxCode: c.taxCode || '',
      address: c.address || '',
      status: c.status || 'ACTIVE',
      note: c.note || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        parentId: formData.parentId ? parseInt(formData.parentId) : null,
        taxCode: formData.taxCode || null,
        address: formData.address || null,
        status: formData.status,
        note: formData.note || null
      };

      if (formData.id) {
        await api.patch(`/settings/companies/${formData.id}`, payload);
        toast.success("Cập nhật thông tin đơn vị thành công");
      } else {
        await api.post('/settings/companies', payload);
        toast.success("Thêm đơn vị mới thành công");
      }
      setIsModalOpen(false);
      resetForm();
      loadCompanies();
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (id: number, code: string, name: string) => {
    if (code === '00') {
      return toast.error("Không được phép xóa đơn vị mặc định của hệ thống.");
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn vị "${name}" (${code}) vĩnh viễn không?`)) {
      return;
    }

    try {
      await api.delete(`/settings/companies/${id}`);
      toast.success("Đã xóa đơn vị thành công.");
      loadCompanies();
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa đơn vị");
    }
  };

  const handleToggleStatus = async (c: Company) => {
    if (c.code === '00') {
      return toast.error("Không được phép thay đổi trạng thái đơn vị mặc định.");
    }
    const nextStatus = c.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    try {
      await api.patch(`/settings/companies/${c.id}`, { status: nextStatus });
      toast.success(`Đã cập nhật trạng thái đơn vị thành ${nextStatus === 'ACTIVE' ? 'Hoạt động' : 'Bị ẩn'}`);
      loadCompanies();
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cập nhật trạng thái thất bại");
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeForm.sourceCompanyId || !mergeForm.targetCompanyId) {
      return toast.warn("Vui lòng chọn đầy đủ công ty nguồn và đích.");
    }
    
    if (mergeForm.sourceCompanyId === mergeForm.targetCompanyId) {
      return toast.warn("Công ty nguồn và công ty đích không được giống nhau.");
    }

    if (!window.confirm("CẢNH BÁO: Việc gộp công ty sẽ chuyển TOÀN BỘ tài sản đang gán cho công ty nguồn sang công ty đích. Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }

    try {
      const res = await api.post('/settings/companies/merge', {
        sourceCompanyId: parseInt(mergeForm.sourceCompanyId),
        targetCompanyId: parseInt(mergeForm.targetCompanyId)
      });
      toast.success(res.data.message);
      setIsMergeModalOpen(false);
      setMergeForm({ sourceCompanyId: '', targetCompanyId: '' });
      loadCompanies();
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gộp công ty thất bại");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Mã đơn vị", "Tên đơn vị", "Loại", "Đơn vị mẹ", "Số tài sản", "Tổng nguyên giá (đ)", "Trạng thái"];
    const rows = companies.map(c => [
      c.code,
      c.name,
      c.type === 'COMPANY' ? 'Công ty' : c.type === 'BRANCH' ? 'Chi nhánh' : c.type === 'COST_CENTER' ? 'Cost Center' : 'Hệ thống',
      c.parent?.name || '---',
      c.assetCount || 0,
      c.assetValue || 0,
      c.status
    ]);
    
    // Vietnamese BOM for Excel mapping
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_don_vi_so_huu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-process tree list hierarchy
  const buildTree = (list: Company[]) => {
    const map = new Map(list.map(item => [item.id, { ...item, children: [] as any[] }]));
    const roots: any[] = [];
    
    list.forEach(item => {
      const mapped = map.get(item.id);
      if (item.parentId && map.has(item.parentId)) {
        const parent = map.get(item.parentId);
        if (parent) {
          parent.children.push(mapped);
        } else {
          roots.push(mapped);
        }
      } else {
        roots.push(mapped);
      }
    });
    return roots;
  };

  const getFlatTree = (nodes: any[], depth = 0): any[] => {
    const flat: any[] = [];
    nodes.forEach(node => {
      flat.push({ ...node, depth });
      if (node.children && node.children.length > 0) {
        flat.push(...getFlatTree(node.children, depth + 1));
      }
    });
    return flat;
  };

  const isSystemCompany = (code: string) => code === '00';

  const displayedList = viewMode === 'tree' && !search && !statusFilter && !typeFilter
    ? getFlatTree(buildTree(companies))
    : companies.map(c => ({ ...c, depth: 0 }));

  // Status Style Maps
  const getStatusBadge = (status: string) => {
    const config: any = {
      ACTIVE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Hoạt động' },
      HIDDEN: { bg: 'bg-slate-50 text-slate-500 border-slate-200', text: 'Ẩn lựa chọn' },
      LOCKED: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'Hệ thống / Khóa' },
      ARCHIVED: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Lưu trữ' },
      MERGED: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Đã gộp đơn vị' }
    };
    const s = config[status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: status };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${s.bg}`}>
        {s.text}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const config: any = {
      COMPANY: 'Công ty',
      BRANCH: 'Chi nhánh',
      COST_CENTER: 'Cost Center',
      SYSTEM: 'Hệ thống'
    };
    return config[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 pb-12 animate-in fade-in duration-300">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-primary-650 h-7 w-7" /> Quản lý công ty / đơn vị sở hữu
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl font-medium">
            Quản lý pháp nhân, đơn vị nội bộ và nhóm chịu chi phí dùng để phân quyền sở hữu, ghi nhận tài sản và lập báo cáo quản trị.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsMergeModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-sm bg-white"
          >
            <GitMerge className="h-4 w-4 text-slate-500" /> Gộp công ty
          </button>
          <button 
            onClick={openAddModal} 
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-650 hover:bg-primary-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" /> Thêm đơn vị
          </button>
        </div>
      </div>

      {/* 2. QUICK STATS PANEL */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tổng đơn vị</p>
          <p className="text-2xl font-black text-slate-800">{stats.totalCompanies}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Đang hoạt động</p>
          <p className="text-2xl font-black text-emerald-600">{stats.activeCompanies}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bị ẩn / Lưu trữ</p>
          <p className="text-2xl font-black text-slate-500">{stats.hiddenCompanies}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Tài sản đã gán</p>
          <p className="text-2xl font-black text-indigo-600">{stats.totalAssignedAssets.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Chưa xác định đơn vị</p>
          <p className="text-2xl font-black text-amber-600">{stats.unassignedAssets.toLocaleString()}</p>
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm công ty, mã đơn vị, nhóm sở hữu..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-primary-500 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-700"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-650">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-750"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="HIDDEN">Bị ẩn</option>
              <option value="LOCKED">Hệ thống / Khóa</option>
              <option value="ARCHIVED">Lưu trữ</option>
              <option value="MERGED">Đã gộp</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-750"
            >
              <option value="">Loại: Tất cả</option>
              <option value="COMPANY">Công ty</option>
              <option value="BRANCH">Chi nhánh</option>
              <option value="COST_CENTER">Cost Center</option>
              <option value="SYSTEM">Hệ thống</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
          <div className="flex border border-slate-200 rounded-2xl p-0.5 bg-slate-50 self-stretch">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-650' : 'text-slate-400 hover:text-slate-600'}`}
              title="Xem dạng Bảng phẳng"
            >
              <List className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('tree')}
              disabled={!!search || !!statusFilter || !!typeFilter}
              className={`p-1.5 rounded-xl transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-primary-650' : 'text-slate-400 hover:text-slate-650'} disabled:opacity-40`}
              title={search || statusFilter || typeFilter ? "Xóa bộ lọc để bật Tree View" : "Xem dạng Phân cấp đơn vị"}
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold transition-all bg-white"
            title="Xuất danh sách ra tệp CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* 4. DATA TABLE */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium flex flex-col items-center gap-3">
            <div className="h-6 w-6 border-2 border-primary-650 border-t-transparent rounded-full animate-spin"></div>
            Đang tải dữ liệu đơn vị...
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            Không tìm thấy công ty/đơn vị phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider h-11">
                  <th className="px-6 py-3 w-28">Mã</th>
                  <th className="px-6 py-3 min-w-[240px]">Tên công ty / đơn vị</th>
                  <th className="px-6 py-3 w-32">Loại đơn vị</th>
                  <th className="px-6 py-3 w-40">Đơn vị cha</th>
                  <th className="px-6 py-3 w-28 text-right">Số tài sản</th>
                  <th className="px-6 py-3 w-36 text-right">Tổng giá trị</th>
                  <th className="px-6 py-3 w-32 text-center">Trạng thái</th>
                  <th className="px-6 py-3 w-24 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map((c: any) => {
                  const isSystem = isSystemCompany(c.code);
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono font-black text-slate-800 text-[11px] tracking-tight">
                        {c.code}
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center space-x-2 cursor-pointer"
                          onClick={() => loadCompanyDetails(c.id)}
                        >
                          {c.depth > 0 && (
                            <span 
                              className="inline-block border-l-2 border-b-2 border-slate-200 w-3 h-3 -mt-2 mr-1"
                              style={{ marginLeft: `${(c.depth - 1) * 16}px` }}
                            ></span>
                          )}
                          <span className="text-slate-900 font-black hover:text-primary-650 transition-colors">
                            {c.name}
                          </span>
                          {isSystem && (
                            <span className="p-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[8px] font-bold uppercase" title="Đơn vị hệ thống mặc định">
                              SYS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-650 font-bold">
                        {getTypeLabel(c.type)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {c.parent ? (
                          <span className="text-slate-700 font-bold">[{c.parent.code}] {c.parent.name}</span>
                        ) : '---'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {c.assetCount || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">
                        {(c.assetValue || 0).toLocaleString()} ₫
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => loadCompanyDetails(c.id)}
                            className="p-1.5 text-slate-400 hover:text-primary-650 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Xem chi tiết đơn vị"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          
                          {!isSystem && c.status !== 'MERGED' && (
                            <>
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Chỉnh sửa đơn vị"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleToggleStatus(c)}
                                className={`p-1.5 rounded-lg transition-colors ${c.status === 'ACTIVE' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={c.status === 'ACTIVE' ? "Ẩn khỏi danh mục chọn" : "Bật lại hoạt động"}
                              >
                                {c.status === 'ACTIVE' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </button>

                              <button
                                onClick={() => handleDelete(c.id, c.code, c.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa đơn vị"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT COMPANY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900">
                {formData.id ? 'Cập nhật thông tin đơn vị' : 'Thêm công ty / đơn vị mới'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-450 hover:text-slate-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mã đơn vị *</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 disabled:opacity-50" 
                    required 
                    placeholder="e.g. 01"
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    disabled={!!formData.id} // Disable code edit for safety
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Loại đơn vị *</label>
                  <select
                    className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-750"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="COMPANY">Company (Pháp nhân)</option>
                    <option value="BRANCH">Branch (Chi nhánh)</option>
                    <option value="COST_CENTER">Cost Center (Bộ phận chịu phí)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tên hiển thị đơn vị *</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-750" 
                  required 
                  placeholder="e.g. Danko Group"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Thuộc công ty mẹ</label>
                  <select
                    className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-750"
                    value={formData.parentId}
                    onChange={e => setFormData({...formData, parentId: e.target.value})}
                  >
                    <option value="">-- Đơn vị độc lập / Mẹ --</option>
                    {companies
                      .filter(comp => comp.isActive && comp.status !== 'MERGED' && comp.id !== formData.id)
                      .map(comp => (
                        <option key={comp.id} value={comp.id}>[{comp.code}] {comp.name}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái vận hành *</label>
                  <select
                    className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-750"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Active (Hoạt động)</option>
                    <option value="HIDDEN">Hidden (Ẩn khỏi form chọn)</option>
                    <option value="ARCHIVED">Archived (Ngừng sử dụng/Lưu trữ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mã số thuế</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-750" 
                    placeholder="MST doanh nghiệp..."
                    value={formData.taxCode} 
                    onChange={e => setFormData({...formData, taxCode: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ trụ sở</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-750" 
                    placeholder="Thành phố, Tỉnh..."
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú nội bộ</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 h-16 resize-none" 
                  placeholder="Thông tin nội bộ hoặc lý do thành lập đơn vị..."
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-slate-650 font-bold hover:bg-slate-100 rounded-xl transition-all text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-black shadow-md"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MERGE COMPANY MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                <GitMerge className="h-5 w-5 text-indigo-650" /> Gộp công ty / đơn vị sở hữu
              </h2>
              <button 
                onClick={() => setIsMergeModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-450 hover:text-slate-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleMergeSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs font-medium space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> Lưu ý quan trọng
                </p>
                <p>Hệ thống sẽ cập nhật toàn bộ tài sản từ đơn vị nguồn sang đơn vị đích. Đơn vị nguồn sẽ chuyển trạng thái thành <strong>MERGED</strong> và ngừng sử dụng.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn vị nguồn (Đơn vị cần gộp)</label>
                <select
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-750"
                  required
                  value={mergeForm.sourceCompanyId}
                  onChange={e => setMergeForm({...mergeForm, sourceCompanyId: e.target.value})}
                >
                  <option value="">-- Chọn đơn vị nguồn --</option>
                  {companies
                    .filter(c => c.code !== '00' && c.status !== 'MERGED')
                    .map(c => (
                      <option key={c.id} value={c.id}>[{c.code}] {c.name} ({c.assetCount || 0} tài sản)</option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-center py-1">
                <ArrowRight className="h-5 w-5 text-slate-400 rotate-90 sm:rotate-0" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Đơn vị đích (Nhận toàn bộ tài sản)</label>
                <select
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-750"
                  required
                  value={mergeForm.targetCompanyId}
                  onChange={e => setMergeForm({...mergeForm, targetCompanyId: e.target.value})}
                >
                  <option value="">-- Chọn đơn vị nhận --</option>
                  {companies
                    .filter(c => c.code !== '00' && c.status !== 'MERGED' && String(c.id) !== mergeForm.sourceCompanyId)
                    .map(c => (
                      <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsMergeModalOpen(false)} 
                  className="px-4 py-2 text-slate-650 font-bold hover:bg-slate-100 rounded-xl transition-all text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Xác nhận Gộp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. SLIDE-OUT COMPANY DETAILS DRAWER */}
      {isDrawerOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-3xl bg-white border-l border-slate-100 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase">
                    {getTypeLabel(selectedCompany.type)}
                  </span>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
                    {selectedCompany.name}
                  </h3>
                  <p className="text-slate-450 text-xs font-mono font-semibold">Mã: {selectedCompany.code}</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-450 hover:text-slate-700 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Tab Headers */}
              <div className="flex border-b border-slate-100 px-6 bg-white gap-4">
                <button 
                  onClick={() => setDrawerTab('info')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${drawerTab === 'info' ? 'border-primary-600 text-primary-650' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <Info className="h-4 w-4" /> Thông tin chung
                </button>
                <button 
                  onClick={() => setDrawerTab('assets')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${drawerTab === 'assets' ? 'border-primary-600 text-primary-650' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <Building2 className="h-4 w-4" /> Tài sản đơn vị ({selectedCompany.assetCount || 0})
                </button>
                <button 
                  onClick={() => setDrawerTab('logs')}
                  className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${drawerTab === 'logs' ? 'border-primary-600 text-primary-650' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <Activity className="h-4 w-4" /> Lịch sử thay đổi
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {drawerTab === 'info' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Thuộc tính quản lý</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Mã đơn vị</p>
                          <p className="font-mono font-black text-slate-800">{selectedCompany.code}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Loại đơn vị</p>
                          <p className="font-black text-slate-800">{getTypeLabel(selectedCompany.type)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Trạng thái vận hành</p>
                          <p className="font-semibold">{getStatusBadge(selectedCompany.status)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Mã số thuế</p>
                          <p className="font-bold text-slate-700">{selectedCompany.taxCode || '---'}</p>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Địa chỉ trụ sở</p>
                          <p className="font-bold text-slate-700">{selectedCompany.address || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Đơn vị cha</p>
                          <p className="font-bold text-slate-700">
                            {selectedCompany.parent ? `[${selectedCompany.parent.code}] ${selectedCompany.parent.name}` : '---'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Người tạo đơn vị</p>
                          <p className="font-bold text-slate-700 flex items-center gap-1"><User className="h-3 w-3 text-slate-450" /> {selectedCompany.createdBy || 'Hệ thống'}</p>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <p className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Ghi chú nội bộ</p>
                          <p className="font-medium text-slate-650 bg-slate-50 border border-slate-100 rounded-xl p-3">{selectedCompany.note || 'Không có ghi chú.'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tài sản sở hữu</p>
                        <p className="text-2xl font-black text-slate-800">{selectedCompany.assetCount || 0}</p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tổng giá trị nguyên giá</p>
                        <p className="text-2xl font-black text-slate-800">{(selectedCompany.assetValue || 0).toLocaleString()} ₫</p>
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === 'assets' && (
                  <div className="space-y-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                    {/* Search bar inside drawer */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm tài sản trong đơn vị..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-primary-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold"
                        value={assetSearch}
                        onChange={handleAssetSearchChange}
                      />
                    </div>

                    {loadingAssets ? (
                      <div className="py-8 text-center text-xs font-medium text-slate-450 flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary-650 border-t-transparent rounded-full animate-spin"></div>
                        Đang lọc tài sản...
                      </div>
                    ) : companyAssets.length === 0 ? (
                      <div className="py-8 text-center text-xs font-medium text-slate-450">
                        Đơn vị chưa có tài sản nào gán hoặc không khớp từ khóa tìm kiếm.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="overflow-hidden border border-slate-100 rounded-2xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold h-9">
                                <th className="px-4 py-2">Mã tài sản</th>
                                <th className="px-4 py-2">Tên tài sản</th>
                                <th className="px-4 py-2">Nhóm</th>
                                <th className="px-4 py-2 text-right">Nguyên giá</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {companyAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2.5 font-mono text-[10px] font-bold text-primary-700">{asset.assetCode}</td>
                                  <td className="px-4 py-2.5 font-bold text-slate-800">{asset.assetName}</td>
                                  <td className="px-4 py-2.5 text-slate-500">{asset.level4Name || asset.level1Name}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-slate-700">{(asset.purchasePriceExVat || 0).toLocaleString()} ₫</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Drawer Assets Pagination */}
                        {assetTotalPages > 1 && (
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] font-bold text-slate-400">Trang {assetPage} / {assetTotalPages}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleAssetPageChange(assetPage - 1)}
                                disabled={assetPage === 1}
                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                              >
                                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleAssetPageChange(assetPage + 1)}
                                disabled={assetPage === assetTotalPages}
                                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                              >
                                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === 'logs' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Nhật ký chỉnh sửa / gộp hệ thống</h4>
                    {companyLogs.length === 0 ? (
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-xs font-medium text-slate-450">
                        Chưa có lịch sử thay đổi nào được ghi nhận cho đơn vị này.
                      </div>
                    ) : (
                      <div className="flow-root">
                        <ul className="-mb-8">
                          {companyLogs.map((log, logIdx) => (
                            <li key={log.id}>
                              <div className="relative pb-8">
                                {logIdx !== companyLogs.length - 1 ? (
                                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                                      <FileText className="h-4 w-4 text-slate-500" />
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-1.5">
                                    <p className="text-xs font-semibold text-slate-800">
                                      {log.action === 'CREATE' ? 'Khởi tạo đơn vị' : log.action === 'UPDATE' ? 'Cập nhật cấu hình' : log.action}
                                    </p>
                                    <div className="text-[11px] text-slate-550 mt-1 space-y-1">
                                      <p className="bg-slate-50 p-2 border border-slate-100 rounded-lg font-medium">{log.details}</p>
                                      <div className="flex gap-3 text-[10px] font-bold text-slate-400 pt-0.5">
                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {log.performedBy}</span>
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(log.createdAt).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};
