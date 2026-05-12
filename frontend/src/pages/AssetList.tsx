import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { 
  Search, 
  Download, 
  Edit2, 
  History,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  X,
  FileUp,
  AlertCircle,
  Eye,
  UserPlus,
  ArrowRightLeft,
  Wrench,
  Trash2,
  Calendar,
  Box,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  ClipboardCheck,
  FileText,
  Activity,
  Building2,
  MapPin,
  Tag,
  Printer,
  Filter,
  ArrowUpDown,
  ShieldAlert
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { AutocompleteInput, MultiSelect, PopoverFilter, FilterChip } from '../components/FilterComponents';
import { Can } from '../components/Can';
import { AssetDetailPopup } from '../components/AssetDetailPopup';

export const AssetList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Basic pagination/sort from URL or defaults
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Advanced Filters from URL
  const filters: any = {
    status: searchParams.get('status') || '',
    companyCode: searchParams.get('companyCode') || '',
    currentUserName: searchParams.get('currentUserName') || '',
    departmentName: searchParams.get('departmentName') || '',
    locationQuery: searchParams.get('locationQuery') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    purchaseDateFrom: searchParams.get('purchaseDateFrom') || '',
    purchaseDateTo: searchParams.get('purchaseDateTo') || '',
    handoverDateFrom: searchParams.get('handoverDateFrom') || '',
    handoverDateTo: searchParams.get('handoverDateTo') || '',
    supplierName: searchParams.get('supplierName') || '',
    hasSerial: searchParams.get('hasSerial') || '',
    hasDocuments: searchParams.get('hasDocuments') || '',
    level4Code: searchParams.get('level4Code') || '',
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    // Always reset to page 1 on filter change
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await api.get('/assets', { params });
      setAssets(res.data.assets);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải danh sách tài sản");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/assets/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchStats();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === assets.length && assets.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map(a => a.id));
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return { label: 'Trong kho', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'ASSIGNED': return { label: 'Đang sử dụng', color: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'UNDER_REPAIR': return { label: 'Đang sửa chữa', color: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'PENDING_DISPOSAL': return { label: 'Chờ thanh lý', color: 'bg-orange-50 text-orange-700 border-orange-100' };
      case 'DISPOSED': return { label: 'Đã thanh lý', color: 'bg-slate-50 text-slate-700 border-slate-100' };
      case 'LOST': return { label: 'Mất', color: 'bg-red-50 text-red-700 border-red-100' };
      case 'DAMAGED': return { label: 'Hỏng', color: 'bg-rose-50 text-rose-700 border-rose-100' };
      default: return { label: status, color: 'bg-slate-50 text-slate-700 border-slate-100' };
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  const handleRowClick = (assetId: number) => {
    setSelectedAssetId(assetId);
    setIsPopupOpen(true);
  };

  const handlePopupAction = (action: string, assetId: number) => {
    switch (action) {
      case 'handover':
        navigate('/assets/assign', { state: { selectedIds: [assetId] } });
        break;
      case 'inventory':
        toast.info("Tính năng kiểm kê đang được triển khai");
        break;
      case 'recover':
        toast.info("Tính năng thu hồi đang được triển khai");
        break;
      case 'damage':
        navigate('/operational/damage', { state: { assetId } });
        break;
      case 'lost':
        navigate('/operational/lost', { state: { assetId } });
        break;
      case 'liquidate':
        navigate('/operational/liquidation', { state: { assetIds: [assetId] } });
        break;
      case 'print':
        toast.info("Đang chuẩn bị in biên bản...");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 relative min-h-screen pb-20 bg-[#f8fafc]">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-[24px] font-[700] text-[#0F172A]">Assets</h1>
        <div className="flex items-center space-x-2 text-[12px] font-[600] text-[#64748B] uppercase tracking-wider">
           Hệ thống quản lý tài sản v2.0
        </div>
      </div>

      {/* SUMMARY CARDS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="TỔNG TÀI SẢN" value={stats.total} icon={<Box className="h-5 w-5" />} color="primary" />
          <StatCard label="ĐANG SỬ DỤNG" value={stats.assigned} icon={<CheckCircle2 className="h-5 w-5" />} color="blue" />
          <StatCard label="TRONG KHO" value={stats.inStock} icon={<Box className="h-5 w-5" />} color="emerald" />
          <StatCard label="BÁO HỎNG" value={stats.damaged} icon={<AlertCircle className="h-5 w-5" />} color="amber" />
          <StatCard label="MẤT / THẤT THOÁT" value={stats.lost} icon={<ShieldAlert className="h-5 w-5" />} color="rose" />
        </div>
      )}

      {/* TOOLBAR & FILTERS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0] space-y-3">
        {/* ROW 1: SEARCH & ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Tìm theo mã, tên, serial, người dùng, bộ phận, vị trí..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-50/50 focus:border-primary-500 transition-all text-[14px] font-[400] text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm h-[38px]"
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Can permission="asset.export">
              <button className="btn-secondary h-[38px] px-4 flex items-center text-[13px] font-[600]">
                <Download className="mr-2 h-4 w-4" /> Export
              </button>
            </Can>
            <Can permission="asset.import">
              <button onClick={() => navigate('/import/assets')} className="btn-secondary h-[38px] px-4 flex items-center text-[13px] font-[600]">
                <FileUp className="mr-2 h-4 w-4" /> Import
              </button>
            </Can>
            <Can permission="asset.create">
              <button onClick={() => navigate('/assets/new')} className="btn-primary h-[38px] px-5 flex items-center shadow-lg shadow-primary-200 text-[13px] font-[700]">
                <Plus className="mr-2 h-4 w-4" /> Thêm mới
              </button>
            </Can>
          </div>
        </div>

        <div className="h-px bg-slate-100 mx-[-1rem]"></div>

        {/* ROW 2: QUICK FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelect 
            label="Trạng thái" 
            selected={filters.status ? filters.status.split(',') : []}
            onChange={(vals) => updateParam('status', vals.join(','))}
            options={[
              {label: 'Trong kho', value: 'IN_STOCK'},
              {label: 'Đang sử dụng', value: 'ASSIGNED'},
              {label: 'Đang sửa chữa', value: 'UNDER_REPAIR'},
              {label: 'Chờ thanh lý', value: 'PENDING_DISPOSAL'},
              {label: 'Đã thanh lý', value: 'DISPOSED'},
              {label: 'Mất', value: 'LOST'},
              {label: 'Hỏng', value: 'DAMAGED'},
            ]}
          />

          <AutocompleteInput 
            placeholder="Mã công ty" 
            value={filters.companyCode} 
            onChange={(v) => updateParam('companyCode', v)} 
            endpoint="/assets/filter-options/companies"
          />

          <AutocompleteInput 
            placeholder="Nhóm LV4" 
            value={filters.level4Code} 
            onChange={(v) => updateParam('level4Code', v)} 
            endpoint="/assets/filter-options/lv4"
            icon={<Tag className="h-4 w-4" />}
          />

          <AutocompleteInput 
            placeholder="Người sử dụng" 
            value={filters.currentUserName} 
            onChange={(v) => updateParam('currentUserName', v)} 
            endpoint="/assets/filter-options/users"
            icon={<Search className="h-4 w-4" />}
          />

          <AutocompleteInput 
            placeholder="Bộ phận" 
            value={filters.departmentName} 
            onChange={(v) => updateParam('departmentName', v)} 
            endpoint="/assets/filter-options/departments"
            icon={<Search className="h-4 w-4" />}
          />

          <AutocompleteInput 
            placeholder="Vị trí" 
            value={filters.locationQuery} 
            onChange={(v) => updateParam('locationQuery', v)} 
            endpoint="/assets/filter-options/locations"
            icon={<MapPin className="h-4 w-4" />}
          />

          <PopoverFilter label="Giá" isActive={!!filters.priceMin || !!filters.priceMax}>
             <div className="space-y-4">
               <p className="text-[12px] font-[800] text-slate-400 uppercase tracking-widest">Lọc theo giá mua (VNĐ)</p>
               <div className="flex items-center space-x-3">
                 <div className="flex-1">
                   <label className="block text-[10px] font-bold text-slate-400 mb-1">GIÁ TỪ</label>
                   <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-primary-500 focus:border-primary-500" value={filters.priceMin} onChange={(e) => updateParam('priceMin', e.target.value)} placeholder="0" />
                 </div>
                 <div className="flex-1">
                   <label className="block text-[10px] font-bold text-slate-400 mb-1">ĐẾN</label>
                   <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-primary-500 focus:border-primary-500" value={filters.priceMax} onChange={(e) => updateParam('priceMax', e.target.value)} placeholder="999,999,999" />
                 </div>
               </div>
             </div>
          </PopoverFilter>

          <PopoverFilter label="Thêm lọc" icon={<Plus className="h-4 w-4" />} isActive={false}>
            <div className="grid grid-cols-1 gap-6 w-80">
               <div>
                  <p className="text-[11px] font-[800] text-slate-400 uppercase tracking-widest mb-3">Thông tin bổ sung</p>
                  <div className="space-y-3">
                    <AutocompleteInput placeholder="Nhà cung cấp" value={filters.supplierName} onChange={(v) => updateParam('supplierName', v)} endpoint="/assets/filter-options/suppliers" />
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-[600] text-slate-700" value={filters.hasSerial} onChange={(e) => updateParam('hasSerial', e.target.value)}>
                      <option value="">Tất cả Serial</option>
                      <option value="true">Có Serial</option>
                      <option value="false">Không có Serial</option>
                    </select>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-[600] text-slate-700" value={filters.hasDocuments} onChange={(e) => updateParam('hasDocuments', e.target.value)}>
                      <option value="">Tất cả Giấy tờ</option>
                      <option value="true">Có Giấy tờ / Ghi chú</option>
                      <option value="false">Không có Giấy tờ</option>
                    </select>
                  </div>
               </div>
               <div>
                  <p className="text-[11px] font-[800] text-slate-400 uppercase tracking-widest mb-3">Ngày tháng</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Mua từ</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold" value={filters.purchaseDateFrom} onChange={(e) => updateParam('purchaseDateFrom', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">đến</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold" value={filters.purchaseDateTo} onChange={(e) => updateParam('purchaseDateTo', e.target.value)} />
                    </div>
                  </div>
               </div>
            </div>
          </PopoverFilter>

          <button 
            onClick={() => setSearchParams({})}
            className="flex items-center px-2 py-1 text-[12px] font-[700] text-slate-400 hover:text-red-500 transition-colors ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Xóa lọc
          </button>
        </div>

        {/* ROW 3: FILTER CHIPS */}
        {activeFilterCount > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-[800] text-slate-400 uppercase tracking-wider mr-2">
              Đang lọc ({activeFilterCount}):
            </span>
            {filters.status && filters.status.split(',').map((s: string) => (
              <FilterChip key={s} label="Trạng thái" value={getStatusLabel(s).label} onRemove={() => {
                const newVals = filters.status.split(',').filter((v: string) => v !== s);
                updateParam('status', newVals.join(','));
              }} />
            ))}
            {filters.companyCode && <FilterChip label="Công ty" value={filters.companyCode} onRemove={() => updateParam('companyCode', null)} />}
            {filters.level4Code && <FilterChip label="Nhóm LV4" value={filters.level4Code} onRemove={() => updateParam('level4Code', null)} />}
            {filters.currentUserName && <FilterChip label="Người dùng" value={filters.currentUserName} onRemove={() => updateParam('currentUserName', null)} />}
            {filters.departmentName && <FilterChip label="Bộ phận" value={filters.departmentName} onRemove={() => updateParam('departmentName', null)} />}
            {filters.locationQuery && <FilterChip label="Vị trí" value={filters.locationQuery} onRemove={() => updateParam('locationQuery', null)} />}
            {(filters.priceMin || filters.priceMax) && (
               <FilterChip label="Giá" value={`${filters.priceMin || 0} - ${filters.priceMax || 'Max'}`} onRemove={() => { updateParam('priceMin', null); updateParam('priceMax', null); }} />
            )}
            {filters.supplierName && <FilterChip label="NCC" value={filters.supplierName} onRemove={() => updateParam('supplierName', null)} />}
            
            <button onClick={() => setSearchParams({})} className="text-[12px] font-[800] text-primary-600 hover:underline px-2 transition-all">
               Xóa tất cả
            </button>
          </div>
        )}
      </div>

      {/* BULK ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-[#0F172A] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-[#1E293B]">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold tracking-tight">tài sản đang chọn</span>
            </div>
            <div className="h-6 w-px bg-[#334155]"></div>
            <div className="flex items-center space-x-4">
              <Can permission="asset.handover">
                <button onClick={() => navigate('/assets/assign', { state: { selectedIds } })} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors">
                  <UserPlus className="mr-2 h-4 w-4" /> Cấp phát / Điều chuyển
                </button>
              </Can>
              <Can permission="asset.delete">
                <button className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-[#FCA5A5]">
                  <Trash2 className="mr-2 h-4 w-4" /> Xóa
                </button>
              </Can>
              <button onClick={() => setSelectedIds([])} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-slate-400">
                <X className="mr-2 h-4 w-4" /> Bỏ chọn
              </button>
            </div>
            <div className="h-6 w-px bg-[#334155]"></div>
            <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-[#1E293B] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#94A3B8]" />
            </button>
          </div>
        </div>
      )}

      {/* ASSET TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]/80 border-b border-[#E2E8F0]">
                <th className="p-4 w-12 sticky left-0 bg-[#F8FAFC]/80 z-10">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center w-5 h-5">
                    {selectedIds.length === assets.length && assets.length > 0 
                      ? <CheckSquare className="h-5 w-5 text-primary-600" /> 
                      : <Square className="h-5 w-5 text-[#CBD5E1]" />
                    }
                  </button>
                </th>
                <th className="p-4">
                  <button onClick={() => updateParam('sortBy', 'assetCode')} className="flex items-center text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em] hover:text-primary-600 transition-colors">
                    Mã tài sản <ArrowUpDown className="ml-1 h-3 w-3" />
                  </button>
                </th>
                <th className="p-4">
                  <button onClick={() => updateParam('sortBy', 'assetName')} className="flex items-center text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em] hover:text-primary-600 transition-colors">
                    Tên tài sản <ArrowUpDown className="ml-1 h-3 w-3" />
                  </button>
                </th>
                <th className="p-4 text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em]">Người sử dụng / Chức vụ</th>
                <th className="p-4 text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em]">Thành phố / Dự án / Vị trí</th>
                <th className="p-4 text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em]">Trạng thái</th>
                <th className="p-4 text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.05em] text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center">
                   <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="text-[14px] font-[600] text-[#64748B] uppercase tracking-widest">Đang tải dữ liệu...</p>
                   </div>
                </td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={7} className="p-32 text-center">
                   <div className="max-w-xs mx-auto space-y-4">
                      <div className="bg-[#F8FAFC] w-24 h-24 rounded-full flex items-center justify-center mx-auto text-[#CBD5E1]"><Box className="h-12 w-12" /></div>
                      <h3 className="text-[18px] font-[700] text-[#0F172A]">Không tìm thấy tài sản nào</h3>
                      <p className="text-[14px] text-[#64748B]">Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                   </div>
                </td></tr>
              ) : assets.map((asset) => {
                const status = getStatusLabel(asset.status);
                return (
                  <tr 
                    key={asset.id} 
                    className={cn(
                      "hover:bg-[#F8FAFC]/80 transition-all group cursor-pointer border-l-4",
                      selectedAssetId === asset.id && isPopupOpen ? "bg-primary-50 border-l-primary-500" : "border-l-transparent",
                      selectedIds.includes(asset.id) ? "bg-primary-50/30" : ""
                    )}
                    onClick={() => handleRowClick(asset.id)}
                  >
                    <td className="p-4 sticky left-0 bg-white group-hover:bg-[#F8FAFC] z-10" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id]); }} className="flex items-center justify-center w-5 h-5">
                        {selectedIds.includes(asset.id) 
                          ? <CheckSquare className="h-5 w-5 text-primary-600" /> 
                          : <Square className="h-5 w-5 text-[#CBD5E1] group-hover:text-[#94A3B8]" />
                        }
                      </button>
                    </td>
                    <td className="p-4 text-[14px] font-[600] text-primary-700 font-mono whitespace-nowrap">
                      {asset.assetCode}
                    </td>
                    <td className="p-4 max-w-sm">
                      <div className="group/name relative">
                        <div className="text-[15px] font-[600] text-[#0F172A] leading-[1.4] line-clamp-2 group-hover:text-primary-700 transition-colors">
                          {asset.assetNameShort || asset.assetName}
                        </div>
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/name:block z-50 bg-[#0F172A] text-white p-3 rounded-xl text-xs w-64 shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-100">
                           <p className="font-bold border-b border-white/10 pb-1.5 mb-1.5 uppercase tracking-widest text-[9px] text-[#94A3B8]">Tên đầy đủ</p>
                           {asset.assetName}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center text-[13px] font-[500] text-[#475569]">
                        Serial: <span className="ml-1 text-[#0F172A] font-[600] tracking-tight">{asset.serialNumber || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="text-[15px] font-[600] text-[#0F172A]">
                          {asset.currentUserName || <span className="text-[#CBD5E1] font-[400] italic">Chưa cấp phát</span>}
                        </div>
                        {asset.currentPosition && asset.currentPosition !== '0' && (
                          <div className="text-[12px] font-[500] text-[#64748B] mt-0.5 italic">
                            {asset.currentPosition}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[13px] font-[600] text-[#475569] flex items-center">
                         <MapPin className="h-3.5 w-3.5 mr-1.5 text-[#94A3B8]" />
                         {asset.cityName} {asset.projectName ? ` / ${asset.projectName}` : ''}
                      </div>
                      <div className="text-[13px] text-[#94A3B8] mt-1 font-[500] ml-5">
                         {asset.locationName}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("px-3 py-1 rounded-full text-[12px] font-[700] uppercase border-2", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="relative inline-block">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === asset.id ? null : asset.id); }}
                            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A] transition-all shadow-sm"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {activeMenuId === asset.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}></div>
                              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-40 p-2 animate-in fade-in zoom-in duration-150">
                                 <ActionItem label="Xem chi tiết" icon={<Eye className="h-4 w-4" />} onClick={() => { handleRowClick(asset.id); setActiveMenuId(null); }} />
                                 <ActionItem label="Cấp phát / Điều chuyển" icon={<UserPlus className="h-4 w-4" />} onClick={() => { navigate('/assets/assign', { state: { selectedIds: [asset.id] } }); setActiveMenuId(null); }} />
                                 <ActionItem label="Thu hồi" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setActiveMenuId(null)} />
                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <ActionItem label="Kiểm kê" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => setActiveMenuId(null)} />
                                 <ActionItem label="Sửa chữa / Bảo trì" icon={<Wrench className="h-4 w-4" />} onClick={() => setActiveMenuId(null)} />
                                 <ActionItem label="Thanh lý" icon={<Trash2 className="h-4 w-4" />} onClick={() => setActiveMenuId(null)} />
                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <ActionItem label="In / Xuất biên bản" icon={<Printer className="h-4 w-4" />} onClick={() => setActiveMenuId(null)} />
                                 <ActionItem label="Nhật ký tài sản" icon={<Activity className="h-4 w-4" />} onClick={() => { handleRowClick(asset.id); setActiveMenuId(null); }} />
                              </div>
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

        {/* PAGINATION */}
        <div className="p-5 bg-[#F8FAFC]/50 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center text-[12px] font-[700] text-[#64748B] uppercase tracking-[0.1em]">
             HIỂN THỊ <span className="text-[#0F172A] mx-1">{assets.length}</span> / <span className="text-[#0F172A] mx-1">{total}</span> TÀI SẢN
             <div className="h-4 w-px bg-[#E2E8F0] mx-4"></div>
             DÒNG: 
             <select 
               className="ml-2 bg-transparent text-[#0F172A] focus:outline-none cursor-pointer"
               value={limit}
               onChange={(e) => updateParam('limit', e.target.value)}
             >
               <option value={10}>10</option>
               <option value={25}>25</option>
               <option value={50}>50</option>
               <option value={100}>100</option>
             </select>
           </div>
           
           <div className="flex items-center space-x-2">
             <button disabled={page === 1} onClick={() => updateParam('page', String(page - 1))} className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-30 shadow-sm transition-all">
               <ChevronLeft className="h-5 w-5 text-[#475569]" />
             </button>
             <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-[#E2E8F0] shadow-sm">
               {[...Array(Math.min(5, Math.ceil(total/limit)))].map((_, i) => (
                 <button key={i+1} onClick={() => updateParam('page', String(i+1))} className={cn("w-9 h-9 rounded-lg text-sm font-[700] transition-all", page === i+1 ? "bg-primary-600 text-white shadow-lg shadow-primary-200" : "hover:bg-slate-50 text-[#64748B]")}>
                   {i+1}
                 </button>
               ))}
             </div>
             <button disabled={page * limit >= total} onClick={() => updateParam('page', String(page + 1))} className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 disabled:opacity-30 shadow-sm transition-all">
               <ChevronRight className="h-5 w-5 text-[#475569]" />
             </button>
           </div>
        </div>
      </div>

      {/* DETAIL POPUP */}
      <AssetDetailPopup 
        assetId={selectedAssetId}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onAction={handlePopupAction}
      />
    </div>
  );
};

// HELPER COMPONENTS
const StatCard = ({ label, value, icon, color }: any) => {
  const colors: any = {
    primary: 'text-primary-600 bg-primary-50/30 border-primary-100',
    blue: 'text-blue-600 bg-blue-50/30 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50/30 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50/30 border-amber-100',
    rose: 'text-rose-600 bg-rose-50/30 border-rose-100',
  };

  return (
    <div className={cn("p-6 rounded-3xl border-2 bg-white flex items-center space-x-5 shadow-sm hover:shadow-xl transition-all group", colors[color])}>
      <div className={cn("p-3.5 rounded-2xl bg-white shadow-sm transition-all group-hover:scale-110 group-hover:rotate-6")}>{icon}</div>
      <div>
        <p className="text-[12px] font-[600] uppercase text-[#64748B] tracking-[0.05em] leading-none mb-2">{label}</p>
        <p className="text-[28px] font-[700] text-[#0F172A] tracking-tight leading-none">{value?.toLocaleString() || 0}</p>
      </div>
    </div>
  );
};

const DetailQuickCard = ({ label, value, color }: any) => (
  <div className={cn(
    "flex-1 p-5 rounded-2xl border-2 flex flex-col items-center justify-center text-center bg-white shadow-sm transition-all hover:border-primary-200",
    color === 'blue' ? "border-blue-100 bg-blue-50/30" : 
    color === 'emerald' ? "border-emerald-100 bg-emerald-50/30" : "border-[#E2E8F0] bg-white"
  )}>
     <p className="text-[10px] font-[600] text-[#64748B] uppercase tracking-[0.15em] mb-2">{label}</p>
     <p className={cn("text-[15px] font-[700] truncate w-full px-2 leading-none", color === 'blue' ? "text-blue-700" : color === 'emerald' ? "text-emerald-700" : "text-[#0F172A]")}>{value}</p>
  </div>
);

const ActionItem = ({ label, icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center px-4 py-3.5 text-[14px] font-[600] text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl transition-all group/action"
  >
    <span className="mr-3 text-[#94A3B8] group-hover/action:text-primary-600 transition-colors">{icon}</span>
    {label}
  </button>
);

const TabButton = ({ label, id, active, onClick, icon }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={cn(
      "flex items-center space-x-2 px-6 py-5 text-[12px] font-[800] uppercase tracking-[0.1em] border-b-4 transition-all",
      active === id ? "border-primary-600 text-primary-600 bg-primary-50/10" : "border-transparent text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const DetailField = ({ label, value, bold }: any) => (
  <div className="space-y-2">
    <p className="text-[12px] font-[600] text-[#64748B] uppercase tracking-[0.1em]">{label}</p>
    <div className={cn("text-[16px] text-[#0F172A] leading-relaxed", bold ? "font-[800] tracking-tight" : "font-[600]")}>
      {value || '-'}
    </div>
  </div>
);

const AuditItem = ({ date, action, user, description }: any) => (
  <div className="relative">
     <div className="absolute -left-[57px] top-0.5 w-10 h-10 bg-white border-4 border-[#F1F5F9] rounded-2xl z-10 flex items-center justify-center shadow-sm">
        <div className="w-2.5 h-2.5 bg-[#CBD5E1] rounded-full"></div>
     </div>
     <div className="animate-in slide-in-from-left-4 duration-500">
        <p className="text-[11px] font-[800] text-[#94A3B8] mb-1.5 tracking-wider">{format(new Date(date), 'dd/MM/yyyy HH:mm')}</p>
        <p className="text-[16px] font-[800] text-[#0F172A] mb-1.5 tracking-tight">{action}</p>
        <p className="text-[14px] font-[500] text-[#475569] leading-relaxed max-w-2xl">{description}</p>
        <div className="mt-4 flex items-center text-[11px] font-[800] text-primary-600 uppercase tracking-widest">
           <div className="w-6 h-6 bg-primary-50 rounded-lg flex items-center justify-center mr-2.5"><UserPlus className="h-3.5 w-3.5" /></div>
           Thực hiện bởi: {user}
        </div>
     </div>
  </div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
