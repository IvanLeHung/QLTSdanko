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
  
  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [assetsToPrint, setAssetsToPrint] = useState<any[]>([]);

  // BM Modal State
  const [activeBM, setActiveBM] = useState<{code: string, data?: any} | null>(null);

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
        setActiveBM({ code: 'BM02/QLTS', data: { asset } });
        break;
      case 'revoke':
        setActiveBM({ code: 'BM02/QLTS', data: { asset, type: 'Thu hồi' } });
        break;
      case 'inventory':
        setActiveBM({ code: 'BM09/QLTS', data: { asset, businessType: 'Kiểm tra đột xuất' } });
        break;
      case 'repair':
        setActiveBM({ code: 'BM03/QLTS', data: { asset } });
        break;
      case 'liquidation':
        toast.info("Đang mở hồ sơ thanh lý cho " + asset.assetCode);
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

  const selectedAssets = useMemo(() => assets.filter(a => selectedIds.includes(a.id)), [assets, selectedIds]);

  return (
    <div className="space-y-6 relative min-h-screen pb-20 bg-[#f8fafc]">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-[24px] font-[700] text-[#0F172A]">Asset Ledger</h1>
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
            <Can permission="asset.create">
              <button onClick={() => navigate('/assets/new')} className="btn-primary h-[38px] px-5 flex items-center shadow-lg shadow-primary-200 text-[13px] font-[700]">
                <Plus className="mr-2 h-4 w-4" /> Thêm mới
              </button>
            </Can>
          </div>
        </div>

        <div className="h-px bg-slate-100 mx-[-1rem]"></div>

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
          <AutocompleteInput placeholder="Công ty" value={filters.companyCode} onChange={(v) => updateParam('companyCode', v)} endpoint="/assets/filter-options/companies" />
          <AutocompleteInput placeholder="Bộ phận" value={filters.departmentName} onChange={(v) => updateParam('departmentName', v)} endpoint="/assets/filter-options/departments" icon={<Search className="h-4 w-4" />} />
          <AutocompleteInput placeholder="Vị trí" value={filters.locationQuery} onChange={(v) => updateParam('locationQuery', v)} endpoint="/assets/filter-options/locations" icon={<MapPin className="h-4 w-4" />} />
          
          <button onClick={() => setSearchParams({})} className="flex items-center px-2 py-1 text-[12px] font-[700] text-slate-400 hover:text-red-500 transition-colors ml-auto">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Xóa lọc
          </button>
        </div>
      </div>

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
              <button onClick={() => setActiveBM({ code: 'BM02/QLTS', data: { asset: selectedAssets[0], assets: selectedAssets } })} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors">
                <UserPlus className="mr-2 h-4 w-4" /> Bàn giao / Điều chuyển
              </button>
              <button onClick={() => setActiveBM({ code: 'BM12/QLTS', data: { assets: selectedAssets } })} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Kiểm kê
              </button>
              <button onClick={handleBulkPrint} className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-primary-400">
                <Printer className="mr-2 h-4 w-4" /> In tem tài sản
              </button>
              <div className="relative group/more">
                <button className="flex items-center px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors">
                  Thêm thao tác <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-full right-0 mb-4 hidden group-hover/more:block w-48 bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
                   <button onClick={() => setActiveBM({ code: 'BM02/QLTS', data: { assets: selectedAssets, type: 'Thu hồi' } })} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center">
                     <RotateCcw className="mr-3 h-4 w-4 text-slate-400" /> Thu hồi
                   </button>
                   <button onClick={() => setActiveBM({ code: 'BM10/QLTS', data: { assets: selectedAssets } })} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center">
                     <Wrench className="mr-3 h-4 w-4 text-amber-500" /> Sửa chữa / Bảo trì
                   </button>
                   <button className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] border-b border-[#1E293B] flex items-center text-rose-400">
                     <Trash2 className="mr-3 h-4 w-4" /> Thanh lý
                   </button>
                   <button className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-emerald-400">
                     <Download className="mr-3 h-4 w-4" /> Xuất Excel
                   </button>
                </div>
              </div>
            </div>
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
                <th className="p-4 min-w-[140px] uppercase text-[11px] font-black text-slate-400 tracking-widest">Mã tài sản</th>
                <th className="p-4 min-w-[280px] uppercase text-[11px] font-black text-slate-400 tracking-widest">Tên tài sản</th>
                <th className="p-4 min-w-[220px] uppercase text-[11px] font-black text-slate-400 tracking-widest">Người sử dụng / Chức vụ</th>
                <th className="p-4 min-w-[220px] uppercase text-[11px] font-black text-slate-400 tracking-widest">Thành phố / Dự án / Vị trí</th>
                <th className="p-4 min-w-[150px] uppercase text-[11px] font-black text-slate-400 tracking-widest">Trạng thái</th>
                <th className="p-4 text-right uppercase text-[11px] font-black text-slate-400 tracking-widest">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" /></td></tr>
              ) : assets.map((asset) => {
                const status = getStatusLabel(asset.status);
                return (
                  <tr 
                    key={asset.id} 
                    className={cn(
                      "hover:bg-[#F8FAFC]/80 transition-all group cursor-pointer border-l-4",
                      selectedAssetId === asset.id && isDetailOpen ? "bg-primary-50 border-l-primary-500" : "border-l-transparent",
                      selectedIds.includes(asset.id) ? "bg-primary-50/30" : ""
                    )}
                    onClick={() => openAssetDetail(asset.id, 'info')}
                  >
                    <td className="p-4 sticky left-0 bg-white group-hover:bg-[#F8FAFC] z-10" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(asset.id) ? prev.filter(i => i !== asset.id) : [...prev, asset.id]); }} className="flex items-center justify-center w-5 h-5">
                        {selectedIds.includes(asset.id) 
                          ? <CheckSquare className="h-5 w-5 text-primary-600" /> 
                          : <Square className="h-5 w-5 text-[#CBD5E1] group-hover:text-[#94A3B8]" />
                        }
                      </button>
                    </td>
                    <td className="p-4 text-[13px] font-black text-primary-700 font-mono" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      {asset.assetCode}
                    </td>
                    <td className="p-4" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      <p className="text-[14px] font-black text-slate-800 leading-tight">{asset.assetNameShort || asset.assetName}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-1">Serial: <span className="text-slate-600">{asset.serialNumber || '-'}</span></p>
                    </td>
                    <td className="p-4" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <p className="text-[14px] font-black text-slate-800">{asset.currentUserName || <span className="text-slate-300 font-bold italic">Chưa cấp phát</span>}</p>
                      <p className="text-[11px] font-bold text-slate-400">{asset.currentPosition || '-'}</p>
                    </td>
                    <td className="p-4" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <p className="text-[13px] font-black text-slate-700 flex items-center"><MapPin className="h-3 w-3 mr-1.5 text-slate-400" />{asset.cityName}</p>
                      <p className="text-[11px] font-bold text-slate-400 ml-4.5">{asset.locationName}</p>
                    </td>
                    <td className="p-4" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'status_auto'); }}>
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", status.color)}>
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
                                 <ActionItem label="In tem tài sản" icon={<Printer className="h-4 w-4" />} onClick={() => handleAssetAction('print_label', asset)} />
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
        
        {/* PAGINATION */}
        <div className="p-5 border-t border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Trang {page} / {Math.ceil(total/limit)} ({total} tài sản)</p>
           <div className="flex space-x-2">
             <button disabled={page === 1} onClick={() => updateParam('page', String(page - 1))} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
             <button disabled={page * limit >= total} onClick={() => updateParam('page', String(page + 1))} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
           </div>
        </div>
      </div>

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
        <p className="text-[10px] font-black uppercase text-[#64748B] tracking-widest mb-1">{label}</p>
        <p className="text-[28px] font-black text-[#0F172A] tracking-tighter">{value?.toLocaleString() || 0}</p>
      </div>
    </div>
  );
};

const ActionItem = ({ label, icon, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center px-4 py-3 text-[12px] font-black text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl transition-all uppercase tracking-tight">
    <span className="mr-3 text-[#94A3B8]">{icon}</span> {label}
  </button>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

