import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { 
  Search, 
  Download, 
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
  Box, 
  CheckCircle2, 
  RotateCcw, 
  ClipboardCheck, 
  MapPin, 
  Tag, 
  Printer, 
  ArrowUpDown, 
  ShieldAlert,
  CheckSquare,
  Square,
  Activity,
  ChevronDown,
  Trash,
  Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AutocompleteInput, MultiSelect, PopoverFilter, FilterChip } from '../components/FilterComponents';
import { Can } from '../components/Can';
import { AssetDetailPopup } from '../components/AssetDetailPopup';
import { AssetLabelPrintModal } from '../components/AssetLabelPrintModal';
import { ErrorBoundary, ModalError } from '../components/ErrorBoundary';
import { TransferWizard } from '../components/TransferWizard';

import { BMFormDispatcher } from '../components/forms/BMFormDispatcher';

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
    cityName: searchParams.get('cityName') || '',
    projectName: searchParams.get('projectName') || '',
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<any>('info');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [assetsToPrint, setAssetsToPrint] = useState<any[]>([]);

  // Transfer Wizard State
  const [isTransferWizardOpen, setIsTransferWizardOpen] = useState(false);
  const [wizardAssetIds, setWizardAssetIds] = useState<number[]>([]);
  const [wizardDefaultType, setWizardDefaultType] = useState<'HANDOVER' | 'TRANSFER' | 'RECALL'>('HANDOVER');

  // BM Modal State
  const [activeBM, setActiveBM] = useState<{code: string, data?: any} | null>(null);

  // Compact Header State
  const [isCompact, setIsCompact] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      setIsCompact(scrollTop > 40);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
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

  const openAssetDetail = (assetId: number, tab: string = 'info') => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    let targetTab = tab;
    if (tab === 'status_auto') {
      switch (asset.status) {
        case 'UNDER_REPAIR':
        case 'DAMAGED':
          targetTab = 'repair';
          break;
        case 'LOST':
          targetTab = 'timeline';
          break;
        case 'IN_STOCK':
          targetTab = 'info';
          break;
        default:
          targetTab = 'info';
      }
    }

    setSelectedAssetId(assetId);
    setDetailTab(targetTab);
    setIsDetailOpen(true);
  };

  const handleAssetAction = (action: string, asset: any) => {
    setActiveMenuId(null);
    switch (action) {
      case 'view':
        openAssetDetail(asset.id, 'info');
        break;
      case 'handover':
        setWizardAssetIds([asset.id]);
        setWizardDefaultType(asset.status === 'IN_STOCK' ? 'HANDOVER' : 'TRANSFER');
        setIsTransferWizardOpen(true);
        break;
      case 'revoke':
        setWizardAssetIds([asset.id]);
        setWizardDefaultType('RECALL');
        setIsTransferWizardOpen(true);
        break;
      case 'inventory':
        setActiveBM({ code: 'BM09/QLTS', data: { asset, businessType: 'Kiểm tra đột xuất' } });
        break;
      case 'repair':
        setActiveBM({ code: 'BM03/QLTS', data: { asset } });
        break;
      case 'liquidation':
        setActiveBM({ code: 'BM04/QLTS', data: { asset } });
        break;
      case 'print_label':
        if (!asset) {
          toast.error('Không tìm thấy dữ liệu tài sản.');
          break;
        }
        const assetCode = asset.asset_code || asset.assetCode || asset.code;
        if (!assetCode) {
          toast.error('Tài sản chưa có mã, không thể in tem.');
          break;
        }
        setAssetsToPrint([{ ...asset, asset_code: assetCode }]);
        setIsPrintModalOpen(true);
        break;
      case 'history':
        openAssetDetail(asset.id, 'timeline');
        break;
      default:
        break;
    }
  };

  const handleBulkPrint = () => {
    const selectedAssets = assets.filter(a => selectedIds.includes(a.id));
    if (selectedAssets.length === 0) return;
    setAssetsToPrint(selectedAssets);
    setIsPrintModalOpen(true);
  };

  const handleExportAll = async () => {
    try {
      const response = await api.get('/import/assets/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `so_tai_san_toan_bo_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Xuất dữ liệu toàn bộ tài sản thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải dữ liệu xuất toàn bộ");
    }
  };

  const handleExportSelected = () => {
    if (selectedAssets.length === 0) return;
    
    const headers = [
      'Mã tài sản',
      'Số TT',
      'Mã công ty',
      'Tên tài sản',
      'Số Serial',
      'ĐVT',
      'Mục đích',
      'Trạng thái',
      'Người sử dụng',
      'Chức vụ',
      'Phòng ban',
      'Vị trí',
      'Thành phố',
      'Dự án',
      'Giá mua (VNĐ)',
      'Nhà cung cấp',
      'Ghi chú'
    ];

    const rows = selectedAssets.map(a => [
      a.assetCode || '',
      a.runningNoText || '',
      a.companyCode || '',
      a.assetName || '',
      a.serialNumber || '',
      a.unit || 'Cái',
      a.usagePurpose || '',
      getStatusLabel(a.status).label,
      a.currentUserName || '',
      a.currentPosition || '',
      a.departmentName || '',
      a.locationName || '',
      a.cityName || '',
      a.projectName || '',
      a.purchasePriceExVat || 0,
      a.supplierName || '',
      a.note || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_tai_san_chon_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xuất dữ liệu Excel tài sản được chọn thành công!");
  };

  const handleSort = (columnKey: string) => {
    const newOrder = (sortBy === columnKey && sortOrder === 'asc') ? 'desc' : 'asc';
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sortBy', columnKey);
    newParams.set('sortOrder', newOrder);
    setSearchParams(newParams);
  };

  const sortableColumns = [
    { key: "assetCode", label: "Mã tài sản" },
    { key: "assetName", label: "Tên tài sản" },
    { key: "currentUserName", label: "Người sử dụng / Chức vụ" },
    { key: "cityName", label: "Thành phố / Dự án / Vị trí" },
    { key: "status", label: "Trạng thái" },
  ];

  const selectedAssets = useMemo(() => assets.filter(a => selectedIds.includes(a.id)), [assets, selectedIds]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* COLLAPSIBLE HEADER */}
      <header className={cn(
        "shrink-0 z-40 bg-white/90 backdrop-blur-md border-b transition-all duration-500 ease-in-out",
        isCompact ? "py-1 shadow-md" : "py-3"
      )}>
        <div className="px-4">
          {/* Title Section — Animates away */}
          <div className={cn(
            "transition-all duration-500 ease-in-out overflow-hidden",
            isCompact ? "max-h-0 opacity-0 -translate-y-10 mb-0" : "max-h-40 opacity-100 translate-y-0 mb-3"
          )}>
            <div className="flex items-end justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest leading-none">Sổ tài sản</div>
                <h1 className="text-2xl font-black text-slate-950 tracking-tighter mt-1.5 leading-none">DANH MỤC TÀI SẢN</h1>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 Hệ thống quản lý tài sản v2.0
              </div>
            </div>
          </div>

          {/* Stats Section — Animates away */}
          <div className={cn(
            "transition-all duration-500 ease-in-out overflow-hidden",
            isCompact ? "max-h-0 opacity-0 -translate-y-10" : "max-h-64 opacity-100 translate-y-0"
          )}>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1 pb-4">
                <StatCard label="TỔNG TÀI SẢN" value={stats.total} icon={<Box className="h-4 w-4" />} color="primary" />
                <StatCard label="ĐANG SỬ DỤNG" value={stats.assigned} icon={<CheckCircle2 className="h-4 w-4" />} color="blue" />
                <StatCard label="TRONG KHO" value={stats.inStock} icon={<Box className="h-4 w-4" />} color="emerald" />
                <StatCard label="BÁO HỎNG" value={stats.damaged} icon={<AlertCircle className="h-4 w-4" />} color="amber" />
                <StatCard label="MẤT / THẤT THOÁT" value={stats.lost} icon={<ShieldAlert className="h-4 w-4" />} color="rose" />
              </div>
            )}
          </div>

          {/* Toolbar Section — Always visible */}
          <div className={cn(
            "flex items-center gap-2 transition-all duration-500 flex-wrap",
            isCompact ? "mt-1 py-1" : "mt-3"
          )}>
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo mã, tên, serial..." 
                  className="w-full pl-9 pr-3 py-1 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 transition-all text-xs text-slate-900 placeholder:text-slate-400 h-[32px]"
                  value={search}
                  onChange={(e) => updateParam('search', e.target.value)}
                />
              </div>
              
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
                <AutocompleteInput placeholder="Phòng ban" value={filters.departmentName} onChange={(v) => updateParam('departmentName', v)} endpoint="/assets/filter-options/departments" icon={<Search className="h-3 w-3" />} />
                <AutocompleteInput placeholder="Thành phố" value={filters.cityName} onChange={(v) => updateParam('cityName', v)} endpoint="/assets/filter-options/cities" icon={<MapPin className="h-3 w-3" />} />
                <AutocompleteInput placeholder="Dự án" value={filters.projectName} onChange={(v) => updateParam('projectName', v)} endpoint="/assets/filter-options/projects" icon={<Box className="h-3 w-3" />} />
                <AutocompleteInput placeholder="Vị trí" value={filters.locationQuery} onChange={(v) => updateParam('locationQuery', v)} endpoint="/assets/filter-options/locations" icon={<MapPin className="h-3 w-3" />} />
              </div>

              <button onClick={() => setSearchParams({})} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Làm mới">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              
              <div className="h-5 w-px bg-slate-100 mx-1"></div>
              
              <Can permission="asset.export">
                <button 
                  onClick={handleExportAll}
                  className="h-[32px] px-3 flex items-center text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-600 whitespace-nowrap"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </button>
              </Can>
              
              <Can permission="asset.create">
                <button onClick={() => navigate('/assets/new')} className="h-[32px] px-3 flex items-center text-[11px] font-black bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-all whitespace-nowrap">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Thêm mới
                </button>
              </Can>
          </div>
        </div>
      </header>

      {/* BULK ACTION BAR */}
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
            <div className="flex items-center space-x-2">
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-slate-400">Bỏ chọn</button>
              <button 
                onClick={() => {
                  setWizardAssetIds(selectedIds);
                  const hasInStock = selectedAssets.some(a => a.status === 'IN_STOCK');
                  setWizardDefaultType(hasInStock ? 'HANDOVER' : 'TRANSFER');
                  setIsTransferWizardOpen(true);
                }} 
                className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Bàn giao / Điều chuyển
              </button>
              <button onClick={() => setActiveBM({ code: 'BM12/QLTS', data: { assets: selectedAssets } })} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Kiểm kê
              </button>
              <button onClick={handleBulkPrint} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-primary-400">
                <Printer className="mr-2 h-4 w-4" /> In tem tài sản
              </button>
              <div className="relative">
                <button 
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    isMoreMenuOpen ? "bg-primary-600 text-white" : "hover:bg-[#1E293B] text-white"
                  )}
                >
                  Thêm thao tác <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", isMoreMenuOpen && "rotate-180")} />
                </button>
                
                {isMoreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)}></div>
                    <div className="absolute bottom-full right-0 mb-4 w-48 bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-2">
                       <button 
                         onClick={() => { 
                           setIsMoreMenuOpen(false); 
                           setWizardAssetIds(selectedIds);
                           setWizardDefaultType('RECALL');
                           setIsTransferWizardOpen(true);
                         }} 
                         className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center text-white"
                       >
                         <RotateCcw className="mr-3 h-4 w-4 text-slate-400" /> Thu hồi
                       </button>
                       <button onClick={() => { setIsMoreMenuOpen(false); setActiveBM({ code: 'BM10/QLTS', data: { assets: selectedAssets } }); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center text-white">
                         <Wrench className="mr-3 h-4 w-4 text-amber-500" /> Sửa chữa / Bảo trì
                       </button>
                       <button 
                         onClick={() => { 
                           setIsMoreMenuOpen(false); 
                           setActiveBM({ code: 'BM04/QLTS', data: { asset: selectedAssets[0], assets: selectedAssets } }); 
                         }} 
                         className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center text-rose-400"
                       >
                         <Trash2 className="mr-3 h-4 w-4" /> Thanh lý
                       </button>
                       <button 
                         onClick={() => { 
                           setIsMoreMenuOpen(false); 
                           handleExportSelected(); 
                         }} 
                         className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-emerald-400"
                       >
                         <Download className="mr-3 h-4 w-4" /> Xuất Excel
                       </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-[#1E293B] rounded-full transition-colors">
              <X className="h-5 w-5 text-[#94A3B8]" />
            </button>
          </div>
        </div>
      )}

      {/* ASSET TABLE — fills remaining space */}
      <main className="flex-1 min-h-0 p-3">
        <div className="h-full rounded-xl border bg-white overflow-hidden shadow-sm flex flex-col">
          <div 
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-auto custom-scrollbar scroll-smooth"
          >
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr className="h-9">
                  <th className="px-3 w-10 sticky left-0 bg-[#F8FAFC] z-10">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center w-4 h-4">
                      {selectedIds.length === assets.length && assets.length > 0 
                        ? <CheckSquare className="h-4 w-4 text-primary-600" /> 
                        : <Square className="h-4 w-4 text-[#CBD5E1]" />
                      }
                    </button>
                  </th>
                  {sortableColumns.map(col => (
                    <th key={col.key} className="px-3 uppercase text-[10px] font-black text-slate-400 tracking-widest overflow-hidden">
                      <button 
                        onClick={() => handleSort(col.key)}
                        className="group inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors whitespace-nowrap"
                      >
                        {col.label}
                        <span className={cn(
                          "transition-colors",
                          sortBy === col.key ? "text-primary-600" : "text-slate-300 group-hover:text-slate-400"
                        )}>
                          {sortBy === col.key ? (sortOrder === 'desc' ? '▴' : '▾') : '▾'}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="px-3 w-14 text-right uppercase text-[10px] font-black text-slate-400 tracking-widest">Tác vụ</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></td></tr>
              ) : assets.map((asset) => {
                const status = getStatusLabel(asset.status);
                return (
                  <tr 
                    key={asset.id} 
                    className={cn(
                      "h-12 hover:bg-[#F8FAFC]/80 transition-all group cursor-pointer border-l-3",
                      selectedAssetId === asset.id && isDetailOpen ? "bg-primary-50 border-l-primary-500" : "border-l-transparent",
                      selectedIds.includes(asset.id) ? "bg-primary-50/30" : ""
                    )}
                    onClick={() => openAssetDetail(asset.id, 'info')}
                  >
                    <td className="px-3 sticky left-0 bg-white group-hover:bg-[#F8FAFC] z-10" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id]); }} className="flex items-center justify-center w-4 h-4">
                        {selectedIds.includes(asset.id) 
                          ? <CheckSquare className="h-4 w-4 text-primary-600" /> 
                          : <Square className="h-4 w-4 text-[#CBD5E1] group-hover:text-[#94A3B8]" />
                        }
                      </button>
                    </td>
                    <td className="px-3 text-[12px] font-bold text-primary-700 font-mono" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      {asset.assetCode}
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      <p className="text-[13px] font-bold text-slate-800 leading-tight">{asset.assetNameShort || asset.assetName}</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-tight">Serial: <span className="text-slate-500">{asset.serialNumber || '-'}</span></p>
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <p className="text-[13px] font-semibold text-slate-800 leading-tight">{asset.currentUserName || <span className="text-slate-300 font-medium italic">Chưa cấp phát</span>}</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-tight">{asset.currentPosition || '-'}</p>
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <p className="text-[12px] font-semibold text-slate-700 flex items-center"><MapPin className="h-2.5 w-2.5 mr-1 text-slate-400" />{asset.cityName}</p>
                      <p className="text-[10px] font-medium text-slate-400 ml-3.5">{asset.locationName}</p>
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'status_auto'); }}>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="relative inline-block">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === asset.id ? null : asset.id); }}
                            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A] transition-all shadow-sm"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {activeMenuId === asset.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)}></div>
                              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-40 p-2 animate-in fade-in zoom-in duration-150 text-left">
                                 <ActionItem label="Xem chi tiết" icon={<Eye className="h-4 w-4" />} onClick={() => handleAssetAction('view', asset)} />
                                 
                                 {asset.status === 'ASSIGNED' ? (
                                   <>
                                     <ActionItem label="Điều chuyển tài sản" icon={<ArrowRightLeft className="h-4 w-4" />} onClick={() => handleAssetAction('handover', asset)} />
                                     <ActionItem label="Thu hồi về kho" icon={<RotateCcw className="h-4 w-4" />} onClick={() => handleAssetAction('revoke', asset)} />
                                   </>
                                 ) : (
                                   <ActionItem label="Cấp phát / Bàn giao" icon={<UserPlus className="h-4 w-4" />} onClick={() => handleAssetAction('handover', asset)} />
                                 )}

                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <ActionItem label="Kiểm kê" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => handleAssetAction('inventory', asset)} />
                                 <ActionItem label="Sửa chữa / Bảo trì" icon={<Wrench className="h-4 w-4" />} onClick={() => handleAssetAction('repair', asset)} />
                                 <ActionItem label="Thanh lý" icon={<Trash className="h-4 w-4" />} onClick={() => handleAssetAction('liquidation', asset)} />
                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <ActionItem label="Nhật ký tài sản" icon={<Activity className="h-4 w-4" />} onClick={() => handleAssetAction('history', asset)} />
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
        
        {/* PAGINATION — fixed at bottom */}
        <div className="h-11 shrink-0 px-4 border-t border-[#E2E8F0] flex justify-between items-center bg-white">
           <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trang {page} / {Math.ceil(total/limit)} ({total} tài sản)</p>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <span>Hiển thị</span>
                <select 
                  value={limit}
                  onChange={(e) => updateParam('limit', e.target.value)}
                  className="h-7 rounded-lg border border-slate-200 px-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary-50"
                >
                  {[20, 50, 100, 200].map(sz => (
                    <option key={sz} value={sz}>{sz} dòng / trang</option>
                  ))}
                </select>
              </div>
           </div>
           <div className="flex space-x-1.5">
             <button disabled={page === 1} onClick={() => updateParam('page', String(page - 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
             <button disabled={page * limit >= total} onClick={() => updateParam('page', String(page + 1))} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
           </div>
        </div>
      </div>
    </main>

      {/* POPUPS & MODALS */}
      <AssetDetailPopup 
        assetId={selectedAssetId}
        isOpen={isDetailOpen}
        initialTab={detailTab}
        onClose={() => setIsDetailOpen(false)}
        onAction={(action, id) => {
          if (action !== 'print_label') {
            setIsDetailOpen(false);
          }
          const asset = assets.find(a => a.id === id);
          if (asset) handleAssetAction(action, asset);
        }}
      />

      <TransferWizard
        isOpen={isTransferWizardOpen}
        onClose={() => setIsTransferWizardOpen(false)}
        onComplete={fetchAssets}
        initialAssetIds={wizardAssetIds}
        defaultType={wizardDefaultType}
        source="ASSET_DETAIL"
      />

      <ErrorBoundary fallback={<ModalError message="Không thể mở chức năng In tem tài sản." />}>
        <AssetLabelPrintModal 
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          assets={assetsToPrint}
        />
      </ErrorBoundary>

      <BMFormDispatcher 
        isOpen={!!activeBM}
        formCode={activeBM?.code || ''}
        data={activeBM?.data}
        onClose={() => setActiveBM(null)}
        onSubmit={() => { setActiveBM(null); fetchAssets(); }}
      />
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const colors: any = {
    primary: 'text-primary-600 bg-primary-50/20 border-primary-100',
    blue: 'text-blue-600 bg-blue-50/20 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50/20 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50/20 border-amber-100',
    rose: 'text-rose-600 bg-rose-50/20 border-rose-100',
  };
  return (
    <div className={cn("h-[60px] px-4 rounded-xl border bg-white flex items-center gap-3 shadow-sm hover:shadow-md transition-all group", colors[color])}>
      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-[#94A3B8] tracking-wider leading-none">{label}</p>
        <p className="text-xl font-[900] text-[#0F172A] tracking-tighter leading-tight mt-0.5">{value?.toLocaleString() || 0}</p>
      </div>
    </div>
  );
};

const ActionItem = ({ label, icon, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center px-4 py-3 text-[12px] font-black text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl transition-all uppercase tracking-tight">
    <span className="mr-3 text-[#94A3B8]">{icon}</span> {label}
  </button>
);

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

