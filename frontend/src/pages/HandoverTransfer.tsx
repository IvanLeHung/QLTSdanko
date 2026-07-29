import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { DateRangeModal } from '../components/DateRangeModal';
import { 
  UserPlus, 
  Plus, 
  Search, 
  X,
  Package,
  User,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  MapPin,
  Building,
  ShieldAlert,
  Check,
  MoreVertical,
  Download,
  History,
  Trash2,
  Edit2,
  CheckSquare,
  ArrowRight,
  Eye,
  AlertTriangle,
  Undo2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { useModal } from '../context/ModalContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Can } from '../components/Can';

export const HandoverTransfer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialType = searchParams.get('type') || 'ALL';
  const initialFromDate = searchParams.get('fromDate') || '';
  const initialToDate = searchParams.get('toDate') || '';
  const initialStatus = searchParams.get('status') || 'ALL';

  const { openModal, openConfirm } = useModal();
  // Master data lists for Wizard dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialStatus); // ALL, DRAFT, PENDING_CONFIRMATION, COMPLETED, CANCELLED, REVERSED

  // Pagination & List State
  const [documents, setDocuments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Selection / Bulk State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    type: initialType, // ALL, HANDOVER, TRANSFER, RECALL
    fromDate: initialFromDate,
    toDate: initialToDate,
    page: 1,
    limit: 20 // default 20 items per page as requested
  });

  // Sync searchParams if they change dynamically
  useEffect(() => {
    const typeParam = searchParams.get('type') || 'ALL';
    const fromDateParam = searchParams.get('fromDate') || '';
    const toDateParam = searchParams.get('toDate') || '';
    const statusParam = searchParams.get('status') || 'ALL';
    
    setFilters(prev => ({
      ...prev,
      type: typeParam,
      fromDate: fromDateParam,
      toDate: toDateParam,
      page: 1
    }));
    setActiveTab(statusParam);
  }, [searchParams]);

  // Drawer Viewing State
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [drawerTab, setDrawerTab] = useState('info'); // info, assets, route, confirm, history, pdf
  const [printing, setPrinting] = useState(false);
  const [pdfGeneratedUrl, setPdfGeneratedUrl] = useState<string | null>(null);


  // Fetch departments and locations on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const state = location.state as any;
    const assetIds = Array.isArray(state?.assetIds) ? state.assetIds.filter(Boolean) : [];
    const assetCodes = Array.isArray(state?.assetCodes) ? state.assetCodes.filter(Boolean) : [];

    if (assetIds.length === 0 && assetCodes.length === 0) return;

    const openPrefilledWizard = async () => {
      try {
        let initialAssetIds = assetIds;

        if (initialAssetIds.length === 0 && assetCodes.length > 0) {
          const resolved = await Promise.all(assetCodes.map(async (code: string) => {
            const res = await api.get('/assets', { params: { search: code, limit: 10 } });
            const exact = (res.data.assets || []).find((asset: any) => asset.assetCode === code);
            return exact?.id;
          }));
          initialAssetIds = resolved.filter(Boolean);
        }

        if (initialAssetIds.length > 0) {
          openModal("TRANSFER_WIZARD", {
            initialAssetIds,
            defaultType: 'HANDOVER',
            source: "CREATE_ASSET_AUTO_HANDOVER",
            onComplete: fetchDocuments
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Không thể mở nhanh hồ sơ bàn giao từ tài sản vừa tạo.');
      } finally {
        navigate('/handover', { replace: true, state: {} });
      }
    };

    openPrefilledWizard();
  }, [location.state]);

  // Fetch documents when filter dependencies change
  useEffect(() => {
    fetchDocuments();
    setSelectedIds([]); // Clear selection when switching tab or page
  }, [activeTab, filters.type, filters.page, filters.limit, filters.fromDate, filters.toDate, sortField, sortOrder]);

  // Click outside handler to close action dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchMetadata = async () => {
    try {
      const [deptsRes, locsRes] = await Promise.all([
        api.get('/settings/departments'),
        api.get('/settings/locations')
      ]);
      setDepartments(deptsRes.data);
      setLocations(locsRes.data);
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        status: activeTab === 'ALL' ? undefined : activeTab,
        sortBy: sortField,
        sortOrder: sortOrder
      };
      const res = await api.get('/handover', { params });
      setDocuments(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      type: 'ALL',
      fromDate: '',
      toDate: '',
      page: 1,
      limit: 20
    });
    setSortField('createdAt');
    setSortOrder('desc');
    setActiveTab('ALL');
    toast.info('Đã làm mới bộ lọc.');
  };

  // Toggle Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'desc') {
        setSortField('createdAt');
        setSortOrder('desc');
      } else {
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Launch New Wizard
  const openNewWizard = () => {
    openModal("TRANSFER_WIZARD", {
      initialAssetIds: [],
      source: "HANDOVER_TRANSFER_PAGE",
      onComplete: fetchDocuments
    });
  };

  // Load Draft to edit (re-uses wizard step 2-5)
  const openEditDraftWizard = async (doc: any) => {
    openModal("TRANSFER_WIZARD", {
      initialAssetIds: [],
      editingDocId: doc.id,
      source: "HANDOVER_TRANSFER_PAGE",
      onComplete: fetchDocuments
    });
  };

  // Row Level Action Confirmation / Cancellation
  const handleConfirmDoc = async (id: number) => {
    openConfirm({
      title: 'Xác nhận hoàn tất hồ sơ',
      message: 'Bạn có chắc chắn muốn xác nhận hoàn tất hồ sơ bàn giao/luân chuyển này? Cập nhật sổ tài sản sẽ có hiệu lực ngay lập tức.',
      onConfirm: async () => {
        try {
          await api.post(`/handover/${id}/confirm`);
          toast.success('Hồ sơ đã được xác nhận hoàn tất. Trạng thái tài sản đã được cập nhật!');
          fetchDocuments();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
        }
      }
    });
  };

  const handleCancelDoc = async (id: number) => {
    openConfirm({
      title: 'Hủy hồ sơ',
      message: 'Bạn có chắc chắn muốn hủy hồ sơ này? Thao tác này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await api.post(`/handover/${id}/cancel`);
          toast.success('Hồ sơ đã bị hủy bỏ thành công.');
          fetchDocuments();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Có lỗi xảy ra.');
        }
      }
    });
  };

  const handleReverseDoc = (doc: any) => {
    const reason = window.prompt(
      `Nhập lý do hoàn tác hồ sơ ${doc.documentNo}:`,
      'Hoàn tác do thao tác nhầm'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.warning('Vui lòng nhập lý do hoàn tác.');
      return;
    }

    openConfirm({
      title: 'Hoàn tác hồ sơ đã hoàn tất',
      message: `Hệ thống sẽ khôi phục trạng thái, người sử dụng và vị trí trước hồ sơ ${doc.documentNo}. Chỉ thực hiện được khi tài sản chưa phát sinh thay đổi mới.`,
      danger: true,
      confirmText: 'Hoàn tác',
      onConfirm: async () => {
        try {
          await api.post(`/handover/${doc.id}/reverse`, { reason: reason.trim() });
          toast.success('Đã hoàn tác hồ sơ và khôi phục trạng thái tài sản.');
          setViewingDoc(null);
          fetchDocuments();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Không thể hoàn tác hồ sơ.');
        }
      }
    });
  };

  // Bulk Actions Handlers
  const handleBulkCancel = async () => {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: 'Hủy hàng loạt hồ sơ',
      message: `Bạn có chắc chắn muốn hủy hàng loạt ${selectedIds.length} hồ sơ đang chọn? Thao tác này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await api.post('/handover/bulk-cancel', { ids: selectedIds });
          toast.success(`Đã hủy thành công các hồ sơ hợp lệ!`);
          setSelectedIds([]);
          fetchDocuments();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Không thể thực hiện hủy hàng loạt.');
        }
      }
    });
  };
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportByTime = async (startDate: string, endDate: string) => {
    try {
      const res = await api.get('/handover/export-by-time', {
        params: { startDate, endDate },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao_cao_ban_giao_dieu_chuyen_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Tải báo cáo thành công!');
    } catch (err) {
      toast.error('Không thể tải báo cáo bàn giao điều chuyển.');
    }
  };

  const handleBulkExport = async () => {
    try {
      const res = await api.post('/handover/export', { ids: selectedIds }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_sach_ban_giao_dieu_chuyen_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Xuất file excel thành công!');
    } catch (err) {
      toast.error('Không thể xuất dữ liệu excel.');
    }
  };

  // View detail in Drawer
  const handleOpenDetailDrawer = async (id: number) => {
    try {
      const res = await api.get(`/handover/${id}`);
      setViewingDoc(res.data);
      setDrawerTab('info');
      setPdfGeneratedUrl(null); // Reset URL when switching document
    } catch (err) {
      toast.error('Không thể tải chi tiết hồ sơ.');
    }
  };

  const handlePrintPdf = () => {
    const token = localStorage.getItem('token') || '';
    const url = pdfGeneratedUrl 
      ? `${api.defaults.baseURL}${pdfGeneratedUrl.replace('/api', '')}?token=${token}`
      : `${api.defaults.baseURL}/handover/${viewingDoc.id}/pdf?token=${token}`;

    // Premium Print via hidden iframe (prevents blocked popup dialogs)
    let iframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'pdf-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (e) {
          // Fallback if iframe sandbox/headers prevent programmatic focus
          const printWindow = window.open(url, '_blank');
          if (!printWindow) {
            toast.error("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup để in biên bản.");
          }
        }
      }, 500);
    };
  };

  const handleGenerateAndPrintPdf = async () => {
    try {
      setPrinting(true);
      const res = await api.post(`/handover/${viewingDoc.id}/pdf`);
      const { pdfUrl } = res.data;
      setPdfGeneratedUrl(pdfUrl);
      
      const token = localStorage.getItem('token') || '';
      const absolutePdfUrl = `${api.defaults.baseURL}${pdfUrl.replace('/api', '')}?token=${token}`;

      // Premium Print via hidden iframe
      let iframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
      }
      iframe.src = absolutePdfUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          } catch (e) {
            const printWindow = window.open(absolutePdfUrl, '_blank');
            if (!printWindow) {
              toast.error("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup để in biên bản.");
            }
          }
        }, 500);
      };
      
      toast.success("Sinh PDF và mở hộp thoại in thành công!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể in biên bản.");
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    const token = localStorage.getItem('token') || '';
    const url = pdfGeneratedUrl 
      ? `${api.defaults.baseURL}${pdfGeneratedUrl.replace('/api', '')}?token=${token}`
      : `${api.defaults.baseURL}/handover/${viewingDoc.id}/pdf?token=${token}`;
    window.open(url, '_blank');
  };

  // Master Selection Checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(documents.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 relative">
      <header className="shrink-0 border-b bg-white px-6 py-3 shadow-sm z-10">
        <div className="font-extrabold text-slate-900 flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-primary-600 animate-pulse" />
          Bàn giao / Điều chuyển / Thu hồi tài sản
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4">
        <div className="h-full flex flex-col">
          {/* TITLE BANNER */}
          <div className="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                Hồ sơ Bàn giao & Luân chuyển
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Vận hành và giám sát đầy đủ vòng đời bàn giao cấp phát, điều chuyển phòng ban và thu hồi tài sản doanh nghiệp.
              </p>
            </div>
          </div>

          {/* TOOLBAR SEARCH & FILTERS */}
          <div className="shrink-0 mb-3 rounded-xl border bg-white p-3 flex flex-wrap items-center gap-3 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="h-9 w-full pl-9 pr-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:bg-white transition-all"
                placeholder="Tìm mã hồ sơ, người giao, người nhận, tài sản..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại:</label>
              <select 
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value, page: 1})}
                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-50"
              >
                <option value="ALL">Tất cả loại hồ sơ</option>
                <option value="HANDOVER">Bàn giao / cấp phát</option>
                <option value="TRANSFER">Điều chuyển</option>
                <option value="RECALL">Thu hồi</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày tạo:</label>
              <div className="flex items-center gap-1">
                <input 
                  type="date"
                  className="h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-50"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({...filters, fromDate: e.target.value, page: 1})}
                />
                <span className="text-slate-300">→</span>
                <input 
                  type="date"
                  className="h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-50"
                  value={filters.toDate}
                  onChange={(e) => setFilters({...filters, toDate: e.target.value, page: 1})}
                />
              </div>
            </div>

            <button 
              onClick={handleResetFilters}
              className="h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Làm mới
            </button>

            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Tải báo cáo
            </button>
            
            <button 
              onClick={openNewWizard}
              className="h-9 px-4 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-100"
            >
              <Plus className="h-4 w-4" />
              Lập hồ sơ mới
            </button>
          </div>

          {/* MAIN TABLE CONTAINER */}
          <div className="flex-1 min-h-0 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
            {/* STATE TABS */}
            <div className="shrink-0 border-b px-4 bg-slate-50/50">
              <div className="flex gap-6 h-11 items-center">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'DRAFT', label: 'Nháp' },
                  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
                  { key: 'COMPLETED', label: 'Hoàn tất' },
                  { key: 'CANCELLED', label: 'Đã hủy' },
                  { key: 'REVERSED', label: 'Đã hoàn tác' }
                ].map((tab) => (
                  <button 
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setFilters({...filters, page: 1}); }}
                    className={`h-full border-b-2 font-bold text-xs transition-all relative ${
                      activeTab === tab.key 
                        ? 'border-primary-500 text-primary-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DYNAMIC LIST */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="h-10">
                    <th className="px-4 border-b border-slate-100 w-10 text-center">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-100 h-4 w-4 cursor-pointer"
                        checked={documents.length > 0 && selectedIds.length === documents.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th 
                      onClick={() => handleSort('documentNo')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[220px]"
                    >
                      <div className="flex items-center gap-1">
                        Mã hồ sơ / Loại
                        {sortField === 'documentNo' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('senderName')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[180px]"
                    >
                      <div className="flex items-center gap-1">
                        Người giao
                        {sortField === 'senderName' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('recipientName')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[220px]"
                    >
                      <div className="flex items-center gap-1">
                        Người nhận / Bộ phận
                        {sortField === 'recipientName' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('itemCount')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[110px]"
                    >
                      <div className="flex items-center gap-1">
                        Số lượng TS
                        {sortField === 'itemCount' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('createdAt')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[120px]"
                    >
                      <div className="flex items-center gap-1">
                        Ngày tạo
                        {sortField === 'createdAt' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('confirmedAt')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[130px]"
                    >
                      <div className="flex items-center gap-1">
                        Ngày xác nhận
                        {sortField === 'confirmedAt' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('status')}
                      className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors w-[140px]"
                    >
                      <div className="flex items-center gap-1">
                        Trạng thái
                        {sortField === 'status' ? (sortOrder === 'asc' ? <span className="text-primary-600 font-bold">▴</span> : <span className="text-primary-600 font-bold">▾</span>) : <span className="text-slate-300">▾</span>}
                      </div>
                    </th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-[100px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-20 text-center text-slate-400 text-xs font-semibold">Đang tải dữ liệu hồ sơ...</td>
                    </tr>
                  ) : documents.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className={`h-14 hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        selectedIds.includes(doc.id) ? 'bg-primary-50/30' : ''
                      }`}
                      onClick={() => handleOpenDetailDrawer(doc.id)}
                    >
                      <td className="px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-100 h-4 w-4 cursor-pointer"
                          checked={selectedIds.includes(doc.id)}
                          onChange={() => handleSelectRow(doc.id)}
                        />
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            doc.type === 'HANDOVER' ? 'bg-primary-50 text-primary-600' : 
                            (doc.type === 'RECALL' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')
                          }`}>
                            {doc.type === 'HANDOVER' ? <UserPlus className="h-4 w-4" /> : 
                             (doc.type === 'RECALL' ? <Package className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-tight">{doc.documentNo}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              {doc.type === 'HANDOVER' ? 'Bàn giao' : (doc.type === 'RECALL' ? 'Thu hồi' : 'Điều chuyển')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="text-xs font-semibold text-slate-800 leading-tight truncate">{doc.senderName || '---'}</div>
                      </td>
                      <td className="px-4">
                        <div className="text-xs font-bold text-slate-850 leading-tight truncate">{doc.recipientName}</div>
                        <div className="text-[10px] font-medium text-slate-500 truncate">{doc.recipientDepartment}</div>
                      </td>
                      <td className="px-4">
                        <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full text-[10px] font-black">
                          {doc._count?.items || 0} TS
                        </span>
                      </td>
                      <td className="px-4 text-xs font-bold text-slate-500">
                        {format(new Date(doc.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 text-xs font-bold text-slate-500">
                        {doc.confirmedAt ? format(new Date(doc.confirmedAt), 'dd/MM/yyyy') : '---'}
                      </td>
                      <td className="px-4">
                        {doc.status === 'COMPLETED' ? (
                          <span className="flex items-center text-emerald-600 text-[9px] font-black uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Hoàn tất
                          </span>
                        ) : doc.status === 'CANCELLED' ? (
                          <span className="flex items-center text-slate-400 text-[9px] font-black uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-full w-fit">
                            <X className="mr-1 h-3 w-3" /> Đã hủy
                          </span>
                        ) : doc.status === 'REVERSED' ? (
                          <span className="flex items-center text-violet-600 text-[9px] font-black uppercase tracking-wider bg-violet-50 px-2 py-1 rounded-full w-fit">
                            <Undo2 className="mr-1 h-3 w-3" /> Đã hoàn tác
                          </span>
                        ) : doc.status === 'PENDING_CONFIRMATION' ? (
                          <span className="flex items-center text-amber-600 text-[9px] font-black uppercase tracking-wider bg-amber-50 px-2 py-1 rounded-full w-fit">
                            <Clock className="mr-1 h-3 w-3" /> Chờ xác nhận
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-550 text-[9px] font-black uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-full w-fit">
                            <Clock className="mr-1 h-3 w-3" /> Nháp
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left" ref={activeMenuId === doc.id ? menuRef : null}>
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-700 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMenuId === doc.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-2xl z-30 py-1 text-left">
                              {/* Option: Xem chi tiết */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleOpenDetailDrawer(doc.id); }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" /> Xem chi tiết
                              </button>

                              {/* state is DRAFT */}
                              {doc.status === 'DRAFT' && (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openEditDraftWizard(doc); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-slate-400" /> Sửa hồ sơ
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleConfirmDoc(doc.id); setActiveMenuId(null); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-emerald-600 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Xác nhận
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelDoc(doc.id); setActiveMenuId(null); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-rose-500 flex items-center gap-2"
                                  >
                                    <X className="h-3.5 w-3.5 text-rose-450" /> Hủy hồ sơ
                                  </button>

                                </>
                              )}

                              {/* state is PENDING_CONFIRMATION */}
                              {doc.status === 'PENDING_CONFIRMATION' && (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleConfirmDoc(doc.id); setActiveMenuId(null); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-emerald-600 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Xác nhận
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelDoc(doc.id); setActiveMenuId(null); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-rose-500 flex items-center gap-2"
                                  >
                                    <X className="h-3.5 w-3.5 text-rose-450" /> Hủy hồ sơ
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); window.open(`${api.defaults.baseURL}/handover/${doc.id}/pdf?token=${localStorage.getItem('token') || ''}`, '_blank'); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2"
                                  >
                                    <Printer className="h-3.5 w-3.5 text-slate-400" /> In PDF
                                  </button>
                                </>
                              )}

                              {/* state is COMPLETED */}
                              {doc.status === 'COMPLETED' && (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); window.open(`${api.defaults.baseURL}/handover/${doc.id}/pdf?token=${localStorage.getItem('token') || ''}`, '_blank'); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-750 flex items-center gap-2"
                                  >
                                    <Printer className="h-3.5 w-3.5 text-slate-400" /> In PDF
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleOpenDetailDrawer(doc.id); setDrawerTab('history'); }}
                                    className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2"
                                  >
                                    <History className="h-3.5 w-3.5 text-slate-400" /> Xem lịch sử
                                  </button>
                                  <Can permission="TRANSFER_CANCEL">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleReverseDoc(doc);
                                      }}
                                      className="w-full px-4 py-2 hover:bg-amber-50 text-xs font-bold text-amber-700 flex items-center gap-2"
                                    >
                                      <Undo2 className="h-3.5 w-3.5 text-amber-600" /> Hoàn tác
                                    </button>
                                  </Can>
                                </>
                              )}

                              {/* state is CANCELLED */}
                              {doc.status === 'CANCELLED' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleOpenDetailDrawer(doc.id); setDrawerTab('history'); }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2"
                                >
                                  <History className="h-3.5 w-3.5 text-slate-400" /> Xem lịch sử
                                </button>
                              )}

                              {doc.status === 'REVERSED' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleOpenDetailDrawer(doc.id); setDrawerTab('history'); }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2"
                                >
                                  <History className="h-3.5 w-3.5 text-slate-400" /> Xem lịch sử
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-20 text-center text-slate-400 italic text-xs font-semibold">Chưa có hồ sơ luân chuyển tài sản nào phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* STICKY FOOTER PAGINATION */}
            <div className="shrink-0 border-t bg-slate-50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <span>Hiển thị {documents.length} / {total} hồ sơ</span>
                <div className="flex items-center gap-1.5">
                  <span>Số dòng/trang:</span>
                  <select 
                    value={filters.limit} 
                    onChange={(e) => setFilters({...filters, limit: Number(e.target.value), page: 1})}
                    className="h-7 bg-white border border-slate-200 rounded px-1 text-[11px] font-black focus:outline-none"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200 (Tối đa)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={filters.page === 1}
                  onClick={() => setFilters({...filters, page: filters.page - 1})}
                  className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Trước
                </button>
                <div className="text-xs font-black text-slate-900 px-2">Trang {filters.page} / {Math.ceil(total / filters.limit) || 1}</div>
                <button 
                  disabled={filters.page >= Math.ceil(total / filters.limit)}
                  onClick={() => setFilters({...filters, page: filters.page + 1})}
                  className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FLOATING BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-5 border border-slate-700/50 backdrop-blur-sm animate-bounce">
          <span className="text-xs font-black tracking-wide text-slate-300">ĐÃ CHỌN {selectedIds.length} HỒ SƠ</span>
          
          <div className="h-4 w-px bg-slate-700"></div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkExport}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </button>
            <button 
              onClick={handleBulkCancel}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hủy hồ sơ
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* PREMIUM DETAILS MODAL (Centered Modal) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setViewingDoc(null)}></div>
          <div className="bg-white w-[90vw] max-w-5xl h-[88vh] relative z-10 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-wizard-pop">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Biên bản {viewingDoc.documentNo}
                  </h2>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    viewingDoc.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    (viewingDoc.status === 'REVERSED' ? 'bg-violet-100 text-violet-800' :
                    (viewingDoc.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-655'))
                  }`}>
                    {viewingDoc.status === 'COMPLETED'
                      ? 'Hoàn tất'
                      : viewingDoc.status === 'REVERSED'
                        ? 'Đã hoàn tác'
                        : viewingDoc.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : viewingDoc.status === 'DRAFT'
                            ? 'Nháp'
                            : 'Chờ xác nhận'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Khởi tạo bởi hệ thống ngày {viewingDoc.createdAt ? format(new Date(viewingDoc.createdAt), 'dd/MM/yyyy') : '---'}</p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-slate-200/50 rounded-full transition-all">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="shrink-0 border-b flex bg-slate-100/50 text-slate-500 font-bold text-xs h-11 px-4">
              {[
                { id: 'info', label: 'Thông tin hồ sơ' },
                { id: 'assets', label: 'Danh sách tài sản' },
                { id: 'route', label: 'Người giao/nhận' },
                { id: 'confirm', label: 'Cam kết & chữ ký' },
                { id: 'history', label: 'Lịch sử xử lý' },
                { id: 'pdf', label: 'Tệp PDF' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className={`px-4 py-3 text-center border-b-2 font-bold tracking-tight transition-colors ${
                    drawerTab === tab.id 
                      ? 'border-primary-500 text-primary-650 bg-white' 
                      : 'border-transparent hover:bg-slate-100 text-slate-450 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Tab 1: Info */}
              {drawerTab === 'info' && (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Chi tiết tham chiếu</h3>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div className="text-slate-400 font-medium">Mã biên bản:</div>
                      <div className="font-extrabold text-slate-900">{viewingDoc.documentNo}</div>
                      <div className="text-slate-400 font-medium">Loại nghiệp vụ:</div>
                      <div className="font-extrabold text-primary-750">{viewingDoc.type === 'HANDOVER' ? 'Bàn giao / cấp phát' : (viewingDoc.type === 'RECALL' ? 'Thu hồi' : 'Điều chuyển')}</div>
                      <div className="text-slate-400 font-medium">Trạng thái hiện tại:</div>
                      <div className="font-extrabold text-slate-900 uppercase">{viewingDoc.status}</div>
                      <div className="text-slate-400 font-medium">Ngày lập:</div>
                      <div className="font-bold text-slate-800">{viewingDoc.createdAt ? format(new Date(viewingDoc.createdAt), 'dd/MM/yyyy') : '---'}</div>
                      <div className="text-slate-400 font-medium">Ngày xác nhận:</div>
                      <div className="font-bold text-slate-855">{viewingDoc.confirmedAt ? format(new Date(viewingDoc.confirmedAt), 'dd/MM/yyyy') : '---'}</div>
                    </div>
                  </div>

                  {viewingDoc.note && (
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1.5"><FileText className="h-4 w-4" /> Ghi chú nội bộ</h4>
                      <p className="text-xs text-slate-655 italic leading-relaxed">{viewingDoc.note}</p>
                    </div>
                  )}

                  {viewingDoc.reason && (
                    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Lý do luân chuyển</h4>
                      <p className="text-xs text-slate-655 leading-relaxed font-semibold">{viewingDoc.reason}</p>
                    </div>
                  )}

                  {viewingDoc.status === 'REVERSED' && viewingDoc.reversalReason && (
                    <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Undo2 className="h-4 w-4" /> Lý do hoàn tác
                      </h4>
                      <p className="text-xs text-violet-800 leading-relaxed font-semibold">{viewingDoc.reversalReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Assets List */}
              {drawerTab === 'assets' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><Package className="h-4 w-4" /> Tài sản luân chuyển ({viewingDoc.items?.length || 0})</h3>
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b">
                        <tr>
                          <th className="px-4 py-2.5">Mã TS</th>
                          <th className="px-4 py-2.5">Tên tài sản</th>
                          <th className="px-4 py-2.5">ĐVT</th>
                          <th className="px-4 py-2.5 text-right">Trạng thái mới</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {viewingDoc.items?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-extrabold text-slate-700">{item.assetCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-600">{item.assetName}</td>
                            <td className="px-4 py-3 text-slate-400">{item.unit || 'Cái'}</td>
                            <td className="px-4 py-3 text-right text-primary-650 font-black uppercase tracking-wider">{item.newStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Route */}
              {drawerTab === 'route' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bên giao */}
                    <div className="p-4 border border-slate-100 rounded-xl space-y-3 bg-slate-50/50">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><User className="h-4 w-4" /> Bên giao (Gửi)</h4>
                      <div className="text-xs space-y-2">
                        <p><span className="text-slate-400 font-semibold">Họ tên:</span> <span className="font-bold text-slate-900">{viewingDoc.senderName || 'Hành chính nhân sự (Kho QLTS)'}</span></p>
                        <p><span className="text-slate-400 font-semibold">Chức vụ:</span> <span className="font-bold text-slate-800">{viewingDoc.senderPosition || '---'}</span></p>
                        <p><span className="text-slate-400 font-semibold">Bộ phận:</span> <span className="font-bold text-slate-800">{viewingDoc.senderDepartment || 'Kho QLTS'}</span></p>
                      </div>
                    </div>

                    {/* Bên nhận */}
                    <div className="p-4 border border-primary-100 rounded-xl space-y-3 bg-primary-50/20">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary-700 flex items-center gap-1.5"><UserPlus className="h-4 w-4" /> Bên nhận (Nhận)</h4>
                      <div className="text-xs space-y-2">
                        <p><span className="text-slate-400 font-semibold">Họ tên:</span> <span className="font-extrabold text-slate-900">{viewingDoc.recipientName}</span></p>
                        <p><span className="text-slate-400 font-semibold">Bộ phận:</span> <span className="font-bold text-slate-800">{viewingDoc.recipientDepartment || '---'}</span></p>
                        <p><span className="text-slate-400 font-semibold">Vị trí nhận:</span> <span className="font-bold text-slate-800">{viewingDoc.newLocation || '---'}</span></p>
                        <p><span className="text-slate-400 font-semibold">Thành phố:</span> <span className="font-bold text-slate-800">{viewingDoc.newCity || '---'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-xl flex items-center gap-3">
                    <Building className="h-6 w-6 text-slate-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">Lưu ý nghiệp vụ</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Với nghiệp vụ THU HỒI, tài sản sẽ tự động trả về kho lưu trữ, các thông tin người dùng hiện tại sẽ bị hủy.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Confirm */}
              {drawerTab === 'confirm' && (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><CheckSquare className="h-4 w-4" /> Cam kết bàn giao</h3>
                    <div className="space-y-2 text-xs text-slate-655 leading-relaxed font-semibold">
                      <p className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> 1. Đã kiểm tra trực quan đầy đủ hiện trạng, đảm bảo tài sản sạch sẽ, hoạt động tốt.</p>
                      <p className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> 2. Cam kết sử dụng tài sản đúng mục đích hoạt động sản xuất kinh doanh của công ty.</p>
                      <p className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> 3. Chịu trách nhiệm bảo quản và tuân thủ các chính sách đền bù nếu làm hỏng hóc hoặc làm mất.</p>
                    </div>
                  </div>

                  {/* Stylized interactive signature pad placeholder */}
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chữ ký xác nhận bên nhận</h4>
                    <div className="h-32 bg-slate-50 rounded-xl relative overflow-hidden flex items-center justify-center border">
                      {/* Stylized SVG drawing a mock signature */}
                      <svg className="w-48 h-20 text-primary-600/60 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 100 40">
                        <path d="M10,25 Q25,5 30,20 T50,15 T70,30 T90,10" />
                        <path d="M25,22 L85,22" strokeDasharray="2,2" />
                      </svg>
                      <span className="absolute bottom-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Ký điện tử bởi {viewingDoc.recipientName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: History */}
              {drawerTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><History className="h-4 w-4" /> Lịch sử xử lý hồ sơ</h3>
                  
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 text-xs">
                    {/* timeline item 1: Created */}
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-primary-500 shadow-sm flex items-center justify-center">
                        <Check className="h-2 w-2 text-white" />
                      </span>
                      <p className="font-extrabold text-slate-900">Khởi tạo hồ sơ</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{format(new Date(viewingDoc.createdAt), 'HH:mm dd/MM/yyyy')} • QLTS System</p>
                      <p className="text-slate-500 mt-1">Đã lập hồ sơ nháp ban đầu cho {viewingDoc.recipientName}.</p>
                    </div>

                    {/* timeline item 2: Confirmed */}
                    {viewingDoc.confirmedAt && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm flex items-center justify-center">
                          <Check className="h-2 w-2 text-white" />
                        </span>
                        <p className="font-extrabold text-slate-900 text-emerald-600">Xác nhận hoàn tất</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{format(new Date(viewingDoc.confirmedAt), 'HH:mm dd/MM/yyyy')} • QLTS Admin</p>
                        <p className="text-slate-500 mt-1">Biên bản chính thức được ký nhận. Sổ tài sản được cập nhật sang trạng thái mới.</p>
                      </div>
                    )}

                    {/* timeline item 3: Cancelled */}
                    {viewingDoc.status === 'CANCELLED' && viewingDoc.cancelledAt && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-rose-500 shadow-sm flex items-center justify-center">
                          <X className="h-2 w-2 text-white" />
                        </span>
                        <p className="font-extrabold text-rose-600">Hồ sơ đã hủy</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{format(new Date(viewingDoc.cancelledAt), 'HH:mm dd/MM/yyyy')}</p>
                        <p className="text-slate-500 mt-1">Hành động hủy thực hiện bởi quản trị viên.</p>
                      </div>
                    )}

                    {viewingDoc.status === 'REVERSED' && viewingDoc.reversedAt && (
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-violet-500 shadow-sm flex items-center justify-center">
                          <Undo2 className="h-2 w-2 text-white" />
                        </span>
                        <p className="font-extrabold text-violet-700">Đã hoàn tác hồ sơ</p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {format(new Date(viewingDoc.reversedAt), 'HH:mm dd/MM/yyyy')} • {viewingDoc.reversedBy || 'QLTS Admin'}
                        </p>
                        <p className="text-slate-500 mt-1">{viewingDoc.reversalReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: PDF Preview */}
              {drawerTab === 'pdf' && (
                <div className="space-y-4 h-[58vh] flex flex-col">
                  <div className="flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5"><Printer className="h-4 w-4" /> Biên bản in PDF</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleDownloadPdf}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" /> Tải biên bản
                      </button>
                      <button 
                        onClick={pdfGeneratedUrl ? handlePrintPdf : handleGenerateAndPrintPdf}
                        disabled={printing}
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        <Printer className="h-3.5 w-3.5" /> {pdfGeneratedUrl ? "In biên bản" : "Sinh PDF & In"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 border rounded-xl overflow-hidden bg-slate-100 relative min-h-0">
                    {/* Embedded preview frame with token */}
                    <object 
                      data={pdfGeneratedUrl 
                        ? `${api.defaults.baseURL}${pdfGeneratedUrl.replace('/api', '')}?token=${localStorage.getItem('token') || ''}`
                        : `${api.defaults.baseURL}/handover/${viewingDoc.id}/pdf?token=${localStorage.getItem('token') || ''}`} 
                      type="application/pdf" 
                      className="w-full h-full"
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-450">
                        <FileText className="h-10 w-10 mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-500">Không thể tải trình xem trước PDF trực tiếp.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Bạn vẫn có thể tải hoặc in bản cứng bằng các nút điều khiển phía trên.</p>
                      </div>
                    </object>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setViewingDoc(null)} 
                className="px-5 py-2 bg-slate-150 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border"
              >
                Đóng
              </button>
              <button 
                onClick={handleDownloadPdf}
                className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-750 text-xs font-bold rounded-xl transition-colors border flex items-center gap-1.5"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Tải biên bản
              </button>
              <button 
                onClick={pdfGeneratedUrl ? handlePrintPdf : handleGenerateAndPrintPdf}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow"
              >
                <Printer className="h-4 w-4" />
                In biên bản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      <DateRangeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportByTime}
        title="Tải báo cáo Bàn giao / Điều chuyển"
      />
    </div>
  );
};
