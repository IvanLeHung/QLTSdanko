import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  FileUp, 
  AlertCircle, 
  Eye, 
  UserPlus, 
  ArrowRightLeft, 
  Wrench, 
  Trash2, 
  Box, 
  CheckCircle2, 
  Printer, 
  ShieldAlert,
  Loader2,
  Filter,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import QRCode from 'react-qr-code';

const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Văn phòng C6': [
      'Mặt trước Khối I',
      'Mặt sau Khối I',
      'Kho',
      'Mặt trước Khối II',
      'Mặt sau Khối II',
      'Tầng 9 Khối I',
      'Tầng 2 Khối II'
    ],
    'Vân Canh': ['Kho']
  },
  'Thái Nguyên': {
    'Danko City': ['Trung tâm thương mại', 'Văn phòng BQLDA', 'Kho'],
    'Danko Avenue': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko Sun River': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Bắc Giang': {
    'Danko Riverside': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Tuyên Quang': {
    'Danko Center': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Thanh Hóa': {
    'Danko Royal': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko The Country': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Phú Thọ': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  },
  'Hà Nam': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  }
};

export const ToolList: React.FC = () => {
  const navigate = useNavigate();

  // State Variables
  const [tools, setTools] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Handover location hierarchy states
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  const resetHandoverLocationStates = () => {
    setSelectedCity('');
    setSelectedProject('');
    setSelectedLocation('');
    setCustomCity('');
    setCustomProject('');
    setCustomLocation('');
  };

  // Pagination and Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [departmentName, setDepartmentName] = useState('ALL');
  const [locationName, setLocationName] = useState('ALL');
  const [currentUserName, setCurrentUserName] = useState('ALL');
  
  // Lists for dropdown filters
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals States
  const [activeModal, setActiveModal] = useState<'NONE' | 'HANDOVER' | 'DAMAGE' | 'LOST' | 'LIQUIDATION' | 'PRINT'>('NONE');
  
  // Modal forms state
  const [handoverForm, setHandoverForm] = useState({
    type: 'HANDOVER' as 'HANDOVER' | 'TRANSFER' | 'RECALL',
    recipientName: '',
    recipientDepartment: '',
    recipientPosition: '',
    recipientPhone: '',
    newLocation: '',
    note: '',
    reason: ''
  });

  const [damageForm, setDamageForm] = useState({
    reportedBy: '',
    damageLevel: 'MEDIUM',
    damageDescription: '',
    cause: '',
    canContinueUsing: true,
    estimatedCost: 0,
    note: ''
  });

  const [lostForm, setLostForm] = useState({
    reportedBy: '',
    incidentDescription: '',
    responsibleUser: '',
    responsibleDepartment: '',
    remainingValue: 0,
    compensationNote: '',
    note: ''
  });

  const [liquidationForm, setLiquidationForm] = useState({
    buyerName: '',
    reason: '',
    totalValue: 0,
    note: ''
  });

  // Load Registry and Stats
  const fetchTools = async () => {
    setLoading(true);
    try {
      const [toolsRes, statsRes, deptRes, locRes] = await Promise.all([
        api.get('/tools', {
          params: {
            page,
            limit,
            search: search || undefined,
            status: status === 'ALL' ? undefined : status,
            category: category === 'ALL' ? undefined : category,
            departmentName: departmentName === 'ALL' ? undefined : departmentName,
            locationName: locationName === 'ALL' ? undefined : locationName,
            currentUserName: currentUserName === 'ALL' ? undefined : currentUserName
          }
        }),
        api.get('/tools/dashboard'),
        api.get('/settings/departments'),
        api.get('/settings/locations')
      ]);

      setTools(toolsRes.data.items);
      setTotal(toolsRes.data.total);
      setStats(statsRes.data);
      setDepartments(deptRes.data);
      setLocations(locRes.data);

      // Extract unique categories from tools for filters
      const uniqueCats: string[] = Array.from(new Set(toolsRes.data.items.map((t: any) => t.category).filter(Boolean))) as string[];
      if (categories.length === 0) setCategories(uniqueCats);
    } catch (err) {
      toast.error("Không thể tải danh sách CCDC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [page, status, category, departmentName, locationName, currentUserName]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTools();
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/tools/export', {
        params: { ids: selectedIds.length > 0 ? selectedIds.join(',') : undefined },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Danh_sach_CCDC.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Tải Excel thành công!");
    } catch (err) {
      toast.error("Lỗi khi tải file");
    }
  };

  // Row selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(tools.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // --- ACTIONS FORM SUBMISSIONS ---

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    // Validate location inputs
    const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
    const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
    const locationVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

    if (!cityVal || !projectVal || !locationVal) {
      toast.warn("Vui lòng chọn đầy đủ Thành phố, Dự án và Vị trí chi tiết.");
      return;
    }

    try {
      const fullLocation = `${cityVal}-${projectVal}-${locationVal}`;

      await api.post('/tools/handover', {
        ...handoverForm,
        newLocation: fullLocation,
        toolIds: selectedIds,
        autoComplete: true
      });
      toast.success("Đã hoàn tất bàn giao/luân chuyển CCDC!");
      setActiveModal('NONE');
      setSelectedIds([]);
      resetHandoverLocationStates();
      fetchTools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi giao dịch bàn giao.");
    }
  };
  const handleDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      // Loop or backend takes single toolId
      await api.post('/tools/repairs', {
        ...damageForm,
        toolId: selectedIds[0]
      });
      toast.success("Đã báo hỏng và lập phiếu sửa chữa CCDC!");
      setActiveModal('NONE');
      setSelectedIds([]);
      fetchTools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi báo hỏng.");
    }
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      await api.post('/tools/lost', {
        ...lostForm,
        toolId: selectedIds[0]
      });
      toast.success("Đã ghi nhận báo mất CCDC!");
      setActiveModal('NONE');
      setSelectedIds([]);
      fetchTools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi báo mất.");
    }
  };

  const handleLiquidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      await api.post('/tools/liquidation', {
        ...liquidationForm,
        toolIds: selectedIds
      });
      toast.success("Đã hoàn tất thanh lý CCDC!");
      setActiveModal('NONE');
      setSelectedIds([]);
      fetchTools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thanh lý.");
    }
  };

  // Label print configs
  const selectedToolsToPrint = tools.filter(t => selectedIds.includes(t.id));

  return (
    <div className="space-y-6 pb-20">
      {/* 1. STATS DASHBOARD CARD */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng CCDC</span>
            <span className="text-3xl font-black text-slate-900 mt-2">{stats.totalTools}</span>
          </div>
          <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Đang sử dụng</span>
            <span className="text-3xl font-black text-green-700 mt-2">{stats.using}</span>
          </div>
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Trong kho</span>
            <span className="text-3xl font-black text-blue-700 mt-2">{stats.inStock}</span>
          </div>
          <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Báo hỏng</span>
            <span className="text-3xl font-black text-amber-700 mt-2">{stats.damaged}</span>
          </div>
          <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Mất/Thất thoát</span>
            <span className="text-3xl font-black text-red-700 mt-2">{stats.lost}</span>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đã thanh lý</span>
            <span className="text-3xl font-black text-slate-700 mt-2">{stats.liquidated}</span>
          </div>
        </div>
      )}

      {/* 2. REGISTRY HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sổ quản lý Công cụ dụng cụ</h1>
          <p className="text-slate-500 text-xs mt-1">Danh mục quản lý tài sản ngắn hạn và công cụ dụng cụ của doanh nghiệp.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => navigate('/tools/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
          >
            <Plus className="h-4 w-4" /> Thêm CCDC
          </button>
          <button 
            onClick={() => navigate('/tools/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileUp className="h-4 w-4 text-emerald-500" /> Nhập Excel
          </button>
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4 text-primary-500" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* 3. FILTERS BAR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo Mã CCDC, Tên CCDC, người sử dụng, vị trí..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-semibold"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-colors">
            Tìm kiếm
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-slate-100 pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_STOCK">Trong kho</option>
              <option value="USING">Đang sử dụng</option>
              <option value="DAMAGED">Báo hỏng</option>
              <option value="LOST">Mất</option>
              <option value="LIQUIDATED">Đã thanh lý</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhóm CCDC</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="ALL">Tất cả nhóm</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phòng ban</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={departmentName} onChange={e => setDepartmentName(e.target.value)}>
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kho / Vị trí</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={locationName} onChange={e => setLocationName(e.target.value)}>
              <option value="ALL">Tất cả kho/vị trí</option>
              {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người sử dụng</label>
            <input 
              type="text" 
              placeholder="Nhập tên người dùng..."
              value={currentUserName === 'ALL' ? '' : currentUserName}
              onChange={e => setCurrentUserName(e.target.value || 'ALL')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* 4. SELECTION MASS ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800 text-white p-4 rounded-2xl shadow-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-bold px-3 py-1 bg-slate-700 rounded-full">Đang chọn: {selectedIds.length} CCDC</span>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <button 
              onClick={() => {
                setHandoverForm({ ...handoverForm, type: 'HANDOVER' });
                setActiveModal('HANDOVER');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Bàn giao
            </button>
            <button 
              onClick={() => {
                setHandoverForm({ ...handoverForm, type: 'TRANSFER' });
                setActiveModal('HANDOVER');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" /> Luân chuyển
            </button>
            <button 
              onClick={() => {
                setHandoverForm({ ...handoverForm, type: 'RECALL' });
                setActiveModal('HANDOVER');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Box className="h-3.5 w-3.5 text-amber-400" /> Thu hồi
            </button>
            {selectedIds.length === 1 && (
              <>
                <button 
                  onClick={() => setActiveModal('DAMAGE')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <Wrench className="h-3.5 w-3.5 text-amber-500" /> Báo hỏng
                </button>
                <button 
                  onClick={() => setActiveModal('LOST')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Báo mất
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveModal('LIQUIDATION')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Thanh lý
            </button>
            <button 
              onClick={() => setActiveModal('PRINT')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-400" /> In tem QR
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 text-slate-400 hover:text-white text-xs"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* 5. CCDC REGISTRY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Đang tải dữ liệu CCDC...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-slate-500 font-bold">Không tìm thấy CCDC nào khớp điều kiện lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedIds.length === tools.length && tools.length > 0}
                      className="rounded border-slate-300 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-4">Mã CCDC</th>
                  <th className="px-6 py-4">Tên CCDC</th>
                  <th className="px-6 py-4">Nhóm CCDC</th>
                  <th className="px-6 py-4 text-center">Số lượng</th>
                  <th className="px-6 py-4">Người sử dụng</th>
                  <th className="px-6 py-4">Phòng ban</th>
                  <th className="px-6 py-4">Vị trí/Kho</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tools.map(tool => {
                  const isChecked = selectedIds.includes(tool.id);
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  let statusText = tool.status;

                  if (tool.status === 'IN_STOCK') {
                    statusBadge = 'bg-blue-50 text-blue-700 border-blue-100 border';
                    statusText = 'Trong kho';
                  } else if (tool.status === 'USING') {
                    statusBadge = 'bg-green-50 text-green-700 border-green-100 border';
                    statusText = 'Đang dùng';
                  } else if (tool.status === 'DAMAGED') {
                    statusBadge = 'bg-amber-50 text-amber-700 border-amber-100 border';
                    statusText = 'Hỏng';
                  } else if (tool.status === 'LOST') {
                    statusBadge = 'bg-red-50 text-red-700 border-red-100 border';
                    statusText = 'Mất';
                  } else if (tool.status === 'LIQUIDATED') {
                    statusBadge = 'bg-slate-100 text-slate-500';
                    statusText = 'Đã thanh lý';
                  }

                  return (
                    <tr key={tool.id} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-primary-50/20' : ''}`}>
                      <td className="px-6 py-4 border-b">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => handleSelectRow(tool.id, e.target.checked)}
                          className="rounded border-slate-300 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 border-b font-mono font-bold text-xs text-slate-800">{tool.toolCode}</td>
                      <td className="px-6 py-4 border-b font-bold text-slate-800">{tool.toolName}</td>
                      <td className="px-6 py-4 border-b text-slate-500">{tool.category}</td>
                      <td className="px-6 py-4 border-b text-center font-bold text-slate-800">{tool.quantity} {tool.unit}</td>
                      <td className="px-6 py-4 border-b text-slate-700 font-medium">{tool.currentUserName || '---'}</td>
                      <td className="px-6 py-4 border-b text-slate-500">{tool.departmentName || '---'}</td>
                      <td className="px-6 py-4 border-b text-slate-500">{tool.locationName || '---'}</td>
                      <td className="px-6 py-4 border-b">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-b text-right">
                        <button 
                          onClick={() => navigate(`/tools/${tool.id}`)}
                          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <Eye className="h-4 w-4" /> Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. PAGINATION FOOTER */}
        {total > limit && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">Tổng số: {total} CCDC</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center">{page}</span>
              <button 
                disabled={page * limit >= total} 
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- OPERATIONAL FLOW MODALS --- */}

      {/* A. HANDOVER / LUÂN CHUYỂN / THU HỒI MODAL */}
      {activeModal === 'HANDOVER' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary-500" />
                Biên bản {handoverForm.type === 'HANDOVER' ? 'Bàn giao' : (handoverForm.type === 'TRANSFER' ? 'Luân chuyển' : 'Thu hồi')} CCDC
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleHandoverSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                  CCDC đang chọn thực hiện: {selectedToolsToPrint.map(t => `${t.toolName} (${t.toolCode})`).join(', ')}
                </div>

                {handoverForm.type !== 'RECALL' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ tên người nhận *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                        placeholder="Nhập tên nhân sự nhận..."
                        value={handoverForm.recipientName}
                        onChange={e => setHandoverForm({ ...handoverForm, recipientName: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bộ phận / Phòng ban</label>
                        <input 
                          type="text" 
                          list="handover-dept-suggestions"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                          placeholder="Nhập hoặc chọn phòng ban..."
                          value={handoverForm.recipientDepartment}
                          onChange={e => setHandoverForm({ ...handoverForm, recipientDepartment: e.target.value })}
                        />
                        <datalist id="handover-dept-suggestions">
                          {departments.map(d => <option key={d.id} value={d.name} />)}
                        </datalist>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chức vụ</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                          placeholder="Nhập chức vụ..."
                          value={handoverForm.recipientPosition}
                          onChange={e => setHandoverForm({ ...handoverForm, recipientPosition: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 1. Thành phố */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thành phố *</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold"
                    value={selectedCity}
                    onChange={e => {
                      setSelectedCity(e.target.value);
                      setSelectedProject('');
                      setSelectedLocation('');
                      setCustomCity('');
                      setCustomProject('');
                      setCustomLocation('');
                    }}
                  >
                    <option value="">-- Chọn thành phố --</option>
                    {Object.keys(LOCATION_HIERARCHY).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {selectedCity === 'Khác' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi rõ thành phố khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập tên thành phố..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      value={customCity}
                      onChange={e => setCustomCity(e.target.value)}
                    />
                  </div>
                )}

                {/* 2. Dự án */}
                {selectedCity && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dự án *</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold"
                      value={selectedProject}
                      onChange={e => {
                        setSelectedProject(e.target.value);
                        setSelectedLocation('');
                        setCustomProject('');
                        setCustomLocation('');
                      }}
                    >
                      <option value="">-- Chọn dự án --</option>
                      {selectedCity !== 'Khác' && Object.keys(LOCATION_HIERARCHY[selectedCity] || {}).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                )}

                {selectedProject === 'Khác' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi rõ dự án khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập tên dự án..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      value={customProject}
                      onChange={e => setCustomProject(e.target.value)}
                    />
                  </div>
                )}

                {/* 3. Vị trí chi tiết */}
                {selectedProject && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {handoverForm.type === 'RECALL' ? 'Thu hồi về vị trí chi tiết *' : 'Vị trí chi tiết bàn giao *'}
                    </label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold"
                      value={selectedLocation}
                      onChange={e => {
                        setSelectedLocation(e.target.value);
                        setCustomLocation('');
                      }}
                    >
                      <option value="">-- Chọn vị trí --</option>
                      {selectedCity !== 'Khác' && selectedProject !== 'Khác' && (LOCATION_HIERARCHY[selectedCity]?.[selectedProject] || []).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                )}

                {selectedLocation === 'Khác' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi rõ vị trí khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập vị trí chi tiết..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      value={customLocation}
                      onChange={e => setCustomLocation(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do bàn giao/luân chuyển</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                    placeholder="Lý do..."
                    value={handoverForm.reason}
                    onChange={e => setHandoverForm({ ...handoverForm, reason: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold h-20"
                    placeholder="Ghi chú thêm..."
                    value={handoverForm.note}
                    onChange={e => setHandoverForm({ ...handoverForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. BÁO HỎNG MODAL */}
      {activeModal === 'DAMAGE' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                Phiếu Báo hỏng / Đề xuất sửa chữa CCDC
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleDamageSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                  CCDC báo hỏng: {selectedToolsToPrint[0]?.toolName} ({selectedToolsToPrint[0]?.toolCode})
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người phát hiện / Báo hỏng *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                    placeholder="Tên nhân viên báo hỏng..."
                    value={damageForm.reportedBy}
                    onChange={e => setDamageForm({ ...damageForm, reportedBy: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả sự cố lỗi hỏng *</label>
                  <textarea 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold h-24"
                    placeholder="Mô tả chi tiết lỗi hỏng..."
                    value={damageForm.damageDescription}
                    onChange={e => setDamageForm({ ...damageForm, damageDescription: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mức độ hư hại</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold"
                      value={damageForm.damageLevel}
                      onChange={e => setDamageForm({ ...damageForm, damageLevel: e.target.value })}
                    >
                      <option value="LOW">Nhẹ (vẫn dùng được)</option>
                      <option value="MEDIUM">Trung bình (lỗi bộ phận)</option>
                      <option value="HIGH">Nghiêm trọng (hỏng hẳn)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi phí sửa dự kiến (VNĐ)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-right"
                      value={damageForm.estimatedCost}
                      onChange={e => setDamageForm({ ...damageForm, estimatedCost: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="canContinue"
                    checked={damageForm.canContinueUsing}
                    onChange={e => setDamageForm({ ...damageForm, canContinueUsing: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="canContinue" className="text-xs font-bold text-slate-600 cursor-pointer">Có thể tiếp tục sử dụng trong lúc chờ sửa</label>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md">
                  Xác nhận báo hỏng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. BÁO MẤT MODAL */}
      {activeModal === 'LOST' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Khai báo Mất / Thất thoát CCDC
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleLostSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                  CCDC mất: {selectedToolsToPrint[0]?.toolName} ({selectedToolsToPrint[0]?.toolCode})
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người báo cáo mất *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                    placeholder="Tên nhân viên báo cáo..."
                    value={lostForm.reportedBy}
                    onChange={e => setLostForm({ ...lostForm, reportedBy: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả sự việc / Lý do thất thoát *</label>
                  <textarea 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold h-24"
                    placeholder="Mô tả sự việc mất..."
                    value={lostForm.incidentDescription}
                    onChange={e => setLostForm({ ...lostForm, incidentDescription: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhân sự chịu trách nhiệm chính</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      placeholder="Người làm mất..."
                      value={lostForm.responsibleUser}
                      onChange={e => setLostForm({ ...lostForm, responsibleUser: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá trị khấu hao bồi thường (VNĐ)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-right"
                      value={lostForm.remainingValue}
                      onChange={e => setLostForm({ ...lostForm, remainingValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phương án bồi hoàn / xử lý bồi thường</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                    placeholder="Khấu trừ lương / Mua mới đền bù..."
                    value={lostForm.compensationNote}
                    onChange={e => setLostForm({ ...lostForm, compensationNote: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md">
                  Xác nhận báo mất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. THANH LÝ MODAL */}
      {activeModal === 'LIQUIDATION' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Lập Quyết định thanh lý CCDC
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleLiquidationSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500">
                  Số lượng thanh lý: {selectedIds.length} CCDC
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn vị mua thanh lý (Đối tác thu mua) *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                    placeholder="Tên đối tác hoặc cá nhân thu mua..."
                    value={liquidationForm.buyerName}
                    onChange={e => setLiquidationForm({ ...liquidationForm, buyerName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do thanh lý CCDC *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      placeholder="Hao mòn hết hạn / Lỗi hỏng k sửa được..."
                      value={liquidationForm.reason}
                      onChange={e => setLiquidationForm({ ...liquidationForm, reason: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng giá trị thanh lý thu hồi (VNĐ)</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-right"
                      value={liquidationForm.totalValue}
                      onChange={e => setLiquidationForm({ ...liquidationForm, totalValue: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold h-20"
                    placeholder="Thông tin thêm..."
                    value={liquidationForm.note}
                    onChange={e => setLiquidationForm({ ...liquidationForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md">
                  Xác nhận thanh lý
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E. IN TEM QR MODAL */}
      {activeModal === 'PRINT' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-500" />
                Trung tâm in tem QR CCDC
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto bg-slate-50">
              <div className="grid grid-cols-2 gap-4">
                {selectedToolsToPrint.map(tool => {
                  const url = `${window.location.origin}/tools/${tool.id}`;
                  return (
                    <div key={tool.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 items-center shadow-inner select-all">
                      <div className="p-1 border border-slate-200 rounded-xl bg-white shrink-0">
                        <QRCode value={url} size={70} />
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        <p className="text-[10px] font-black text-indigo-600 tracking-wider">DANKO GROUP</p>
                        <h4 className="text-sm font-bold text-slate-800 truncate leading-snug">{tool.toolName}</h4>
                        <p className="font-mono text-[10px] font-black text-slate-500 mt-1">{tool.toolCode}</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-0.5 truncate">{tool.departmentName || '---'} | {tool.locationName || '---'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
              <span className="text-xs text-slate-500 font-bold">Số lượng nhãn in: {selectedToolsToPrint.length} nhãn</span>
              <div className="flex gap-2">
                <button onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-bold">
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" /> Bắt đầu in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
