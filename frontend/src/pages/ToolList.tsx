import React, { useEffect, useRef, useState } from 'react';
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
  FileCheck,
  MoreVertical,
  History,
  RotateCcw,
  ClipboardList,
  Package
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
  const [hoveredImage, setHoveredImage] = useState<{ 
    url: string; 
    name: string; 
    code?: string;
    unit?: string;
    category?: string;
    stock?: string;
    x: number; 
    y: number; 
  } | null>(null);
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
  const [managementTypeFilter, setManagementTypeFilter] = useState('ALL');
  const [stockAvailFilter, setStockAvailFilter] = useState('ALL');

  // Per-row action menu
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  
  // Lists for dropdown filters
  const [categories, setCategories] = useState<string[]>([
    '01 Nội thất',
    '02 Decor / Trang trí',
    '03 Bất động sản - Tòa nhà',
    '04 Marketing / POSM',
    '05 Branding',
    '06 Event Equipment',
    '07 F&B / Tiệc',
    '08 Dịch vụ vận hành',
    '09 IT & Digital',
    '10 Media Production',
    '11 Kho vận',
    '12 Costume / Đạo cụ',
    '13 Công cụ kỹ thuật',
    '14 Safety / PCCC',
    '15 Vật tư tiêu hao',
    '16 Merchandise',
    '99 Khác'
  ]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals States
  const [activeModal, setActiveModal] = useState<'NONE' | 'HANDOVER' | 'DAMAGE' | 'LOST' | 'LIQUIDATION' | 'PRINT'>('NONE');
  
  // Modal forms state
  const [handoverForm, setHandoverForm] = useState({
    type: 'TRANSFER' as 'TRANSFER' | 'RECALL' | 'SPLIT' | 'ALLOCATE',
    recipientName: '',
    recipientDepartment: '',
    recipientPosition: '',
    recipientPhone: '',
    newLocation: '',
    note: '',
    reason: ''
  });

  // Upgraded modal list items state
  const [modalItems, setModalItems] = useState<any[]>([]);

  useEffect(() => {
    if (activeModal === 'HANDOVER') {
      const selected = tools.filter(t => selectedIds.includes(t.id));
      const initialItems = selected.map(tool => {
        let defaultSrc = '';
        let maxQty = tool.quantity || 1;

        if (tool.managementType === 'QUANTITY' && tool.stocks && tool.stocks.length > 0) {
          const isRecall = handoverForm.type === 'RECALL';
          const validStock = tool.stocks.find((s: any) => isRecall ? s.quantityUsing > 0 : s.quantityAvailable > 0);
          if (validStock) {
            defaultSrc = validStock.locationName;
            maxQty = isRecall ? validStock.quantityUsing : validStock.quantityAvailable;
          } else {
            defaultSrc = tool.stocks[0].locationName;
            maxQty = isRecall ? tool.stocks[0].quantityUsing : tool.stocks[0].quantityAvailable;
          }
        } else {
          defaultSrc = tool.locationName || '';
          maxQty = 1;
        }

        return {
          toolId: tool.id,
          toolCode: tool.toolCode,
          toolName: tool.toolName,
          managementType: tool.managementType || 'INDIVIDUAL',
          stocks: tool.stocks || [],
          sourceLocation: defaultSrc,
          maxQty: maxQty,
          quantityProcessed: maxQty > 0 ? maxQty : 0,
          note: '',
          qtyGood: maxQty > 0 ? maxQty : 0,
          qtyBroken: 0,
          qtyLost: 0,
          splits: [{ quantity: maxQty > 0 ? maxQty : 0, toLocation: '' }],
          createChildCodes: false
        };
      });
      setModalItems(initialItems);
    }
  }, [activeModal, handoverForm.type, selectedIds, tools]);

  const handleItemFieldChange = (toolId: number, field: string, value: any) => {
    setModalItems(prev => prev.map(item => {
      if (item.toolId !== toolId) return item;
      
      let parsedValue = value;
      if (['quantityProcessed', 'qtyGood', 'qtyBroken', 'qtyLost'].includes(field)) {
        parsedValue = Number(value) || 0;
      }

      let updated = { ...item, [field]: parsedValue };

      if (field === 'sourceLocation') {
        const isRecall = handoverForm.type === 'RECALL';
        if (item.managementType === 'QUANTITY') {
          const stock = item.stocks.find((s: any) => s.locationName === value);
          if (stock) {
            updated.maxQty = isRecall ? stock.quantityUsing : stock.quantityAvailable;
          } else {
            updated.maxQty = 0;
          }
        } else {
          updated.maxQty = 1;
        }
        updated.quantityProcessed = updated.maxQty;
        updated.qtyGood = updated.maxQty;
        updated.qtyBroken = 0;
        updated.qtyLost = 0;
        updated.splits = [{ quantity: updated.maxQty, toLocation: '' }];
      }

      if (field === 'qtyGood' || field === 'qtyBroken' || field === 'qtyLost') {
        const g = field === 'qtyGood' ? parsedValue : updated.qtyGood;
        const b = field === 'qtyBroken' ? parsedValue : updated.qtyBroken;
        const l = field === 'qtyLost' ? parsedValue : updated.qtyLost;
        updated.qtyGood = g;
        updated.qtyBroken = b;
        updated.qtyLost = l;
        updated.quantityProcessed = g + b + l;
      }

      return updated;
    }));
  };

  const handleSplitChange = (toolId: number, splitIdx: number, subField: string, value: any) => {
    setModalItems(prev => prev.map(item => {
      if (item.toolId !== toolId) return item;
      const newSplits = item.splits.map((split: any, idx: number) => {
        if (idx !== splitIdx) return split;
        return { ...split, [subField]: subField === 'quantity' ? (Number(value) || 0) : value };
      });
      const totalSplit = newSplits.reduce((sum: number, s: any) => sum + s.quantity, 0);
      return {
        ...item,
        splits: newSplits,
        quantityProcessed: totalSplit
      };
    }));
  };

  const addSplitDestination = (toolId: number) => {
    setModalItems(prev => prev.map(item => {
      if (item.toolId !== toolId) return item;
      return {
        ...item,
        splits: [...item.splits, { quantity: 0, toLocation: '' }]
      };
    }));
  };

  const removeSplitDestination = (toolId: number, splitIdx: number) => {
    setModalItems(prev => prev.map(item => {
      if (item.toolId !== toolId) return item;
      const newSplits = item.splits.filter((_: any, idx: number) => idx !== splitIdx);
      const totalSplit = newSplits.reduce((sum: number, s: any) => sum + s.quantity, 0);
      return {
        ...item,
        splits: newSplits,
        quantityProcessed: totalSplit
      };
    }));
  };

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

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            currentUserName: currentUserName === 'ALL' ? undefined : currentUserName,
            managementType: managementTypeFilter === 'ALL' ? undefined : managementTypeFilter
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
  }, [page, status, category, departmentName, locationName, currentUserName, managementTypeFilter]);

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
    if (modalItems.length === 0) return;

    const type = handoverForm.type;

    let destinationLocation = '';
    if (type !== 'SPLIT') {
      const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
      const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
      const locationVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

      if (!cityVal || !projectVal || !locationVal) {
        toast.warn("Vui lòng chọn đầy đủ Thành phố, Dự án và Vị trí chi tiết.");
        return;
      }
      destinationLocation = `${cityVal}-${projectVal}-${locationVal}`;
    }

    // Validate each item
    for (const item of modalItems) {
      if (item.quantityProcessed <= 0) {
        toast.error(`Số lượng xử lý của CCDC "${item.toolName}" phải lớn hơn 0.`);
        return;
      }
      if (item.quantityProcessed > item.maxQty) {
        toast.error(`Số lượng xử lý của CCDC "${item.toolName}" (${item.quantityProcessed}) không được lớn hơn số lượng hiện có (${item.maxQty}).`);
        return;
      }

      if (type === 'RECALL') {
        if (item.qtyGood + item.qtyBroken + item.qtyLost !== item.quantityProcessed) {
          toast.error(`Tổng số lượng tốt, hỏng, mất của CCDC "${item.toolName}" không khớp số lượng xử lý.`);
          return;
        }
      }

      if (type === 'SPLIT') {
        if (item.splits.length === 0) {
          toast.error(`CCDC "${item.toolName}" chưa chọn địa điểm tách.`);
          return;
        }
        for (const s of item.splits) {
          if (!s.toLocation) {
            toast.error(`Vui lòng chọn địa điểm nhận cho tất cả các dòng tách của CCDC "${item.toolName}".`);
            return;
          }
          if (s.quantity <= 0) {
            toast.error(`Số lượng tách của CCDC "${item.toolName}" tại địa điểm "${s.toLocation}" phải lớn hơn 0.`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      for (const item of modalItems) {
        if (type === 'TRANSFER') {
          await api.post('/tools/stock/transfer', {
            toolId: item.toolId,
            quantity: item.quantityProcessed,
            fromLocation: item.sourceLocation,
            toLocation: destinationLocation,
            note: item.note || handoverForm.note
          });
        } else if (type === 'ALLOCATE') {
          const noteText = [
            handoverForm.recipientName ? `Người nhận: ${handoverForm.recipientName}` : '',
            handoverForm.recipientDepartment ? `Bộ phận: ${handoverForm.recipientDepartment}` : '',
            handoverForm.recipientPosition ? `Chức vụ: ${handoverForm.recipientPosition}` : '',
            item.note || handoverForm.note ? `Ghi chú: ${item.note || handoverForm.note}` : ''
          ].filter(Boolean).join(' | ');

          await api.post('/tools/stock/use', {
            toolId: item.toolId,
            quantity: item.quantityProcessed,
            fromLocation: item.sourceLocation,
            toLocation: destinationLocation,
            note: noteText || 'Bàn giao sử dụng'
          });
        } else if (type === 'RECALL') {
          await api.post('/tools/stock/recall', {
            toolId: item.toolId,
            quantity: item.quantityProcessed,
            fromLocation: item.sourceLocation,
            toLocation: destinationLocation,
            qtyGood: item.qtyGood,
            qtyBroken: item.qtyBroken,
            qtyLost: item.qtyLost,
            note: item.note || handoverForm.note
          });
        } else if (type === 'SPLIT') {
          await api.post('/tools/stock/split', {
            toolId: item.toolId,
            fromLocation: item.sourceLocation,
            splits: item.splits,
            createChildCodes: item.createChildCodes,
            note: item.note || handoverForm.note
          });
        }
      }

      toast.success("Đã hoàn tất xử lý biến động CCDC thành công!");
      setActiveModal('NONE');
      setSelectedIds([]);
      resetHandoverLocationStates();
      fetchTools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi xử lý giao dịch.");
    } finally {
      setLoading(false);
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
        <div className="space-y-3">
          {/* Row 1: Record counts (INDIVIDUAL-style) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng loại CCDC</span>
              <span className="text-2xl font-black text-slate-900">{stats.totalTools}</span>
              <span className="text-[10px] text-slate-400">hồ sơ đã tạo</span>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Đang sử dụng</span>
              <span className="text-2xl font-black text-green-700">{stats.using}</span>
              <span className="text-[10px] text-green-500">mã CCDC</span>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Trong kho</span>
              <span className="text-2xl font-black text-blue-700">{stats.inStock}</span>
              <span className="text-[10px] text-blue-500">mã khả dụng</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Báo hỏng</span>
              <span className="text-2xl font-black text-amber-700">{stats.damaged}</span>
              <span className="text-[10px] text-amber-500">mã cần xử lý</span>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Mất / Thất thoát</span>
              <span className="text-2xl font-black text-red-700">{stats.lost}</span>
              <span className="text-[10px] text-red-500">mã báo mất</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đã thanh lý</span>
              <span className="text-2xl font-black text-slate-700">{stats.liquidated}</span>
              <span className="text-[10px] text-slate-400">mã đã hủy</span>
            </div>
          </div>
          {/* Row 2: Physical quantity breakdown (QUANTITY-type CCDC) */}
          {(stats.totalQuantity > 0 || stats.totalAvailable > 0 || stats.totalUsing > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-4 rounded-2xl border border-violet-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">📦 Tổng số lượng</span>
                <span className="text-2xl font-black text-violet-900">{stats.totalQuantity?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-violet-400">cái/bộ CCDC SL</span>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">🟢 Khả dụng</span>
                <span className="text-2xl font-black text-emerald-700">{stats.totalAvailable?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-emerald-500">cái trong kho</span>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">🔵 Đang dùng</span>
                <span className="text-2xl font-black text-blue-700">{stats.totalUsing?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-blue-500">cái đang sử dụng</span>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">🟠 Hỏng/Sửa</span>
                <span className="text-2xl font-black text-orange-700">{stats.totalBroken?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-orange-500">cái hỏng/đang sửa</span>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">🔴 Mất</span>
                <span className="text-2xl font-black text-red-700">{stats.totalLostQty?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-red-500">cái ghi nhận mất</span>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">⚫ Đã hủy</span>
                <span className="text-2xl font-black text-slate-700">{stats.totalDestroyed?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-slate-400">cái đã thanh lý</span>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">🚚 Đang vận chuyển</span>
                <span className="text-2xl font-black text-purple-700">{stats.totalTransit?.toLocaleString('vi-VN')}</span>
                <span className="text-[10px] text-purple-500">cái đang luân chuyển</span>
              </div>
            </div>
          )}
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
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100 border-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Thêm CCDC
          </button>
          <button 
            onClick={() => navigate('/tools/import-invoice')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 text-primary-600" /> Nhập chứng từ
          </button>
          <button 
            onClick={() => navigate('/tools/import')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <FileUp className="h-4 w-4 text-emerald-500" /> Import Excel
          </button>
          <button 
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
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
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại quản lý</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={managementTypeFilter} onChange={e => { setManagementTypeFilter(e.target.value); setPage(1); }}>
              <option value="ALL">Tất cả loại QL</option>
              <option value="INDIVIDUAL">Từng mã</option>
              <option value="QUANTITY">Số lượng</option>
              <option value="BUNDLE">Theo bộ</option>
            </select>
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
                setHandoverForm({ ...handoverForm, type: 'ALLOCATE' });
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
                  <th className="px-6 py-4">Loại quản lý</th>
                  <th className="px-6 py-4">Nhóm CCDC</th>
                  <th className="px-6 py-4 text-center">Tổng SL</th>
                  <th className="px-6 py-4 text-center text-emerald-600">🟢 Khả dụng</th>
                  <th className="px-6 py-4 text-center text-blue-600">🔵 Đang dùng</th>
                  <th className="px-6 py-4 text-center text-orange-500">🟠 Hỏng</th>
                  <th className="px-6 py-4 text-center text-red-500">🔴 Mất</th>
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

                  if (tool.managementType === 'QUANTITY' && tool.stocks && tool.stocks.length > 0) {
                    let available = 0;
                    let using = 0;
                    let broken = 0;
                    let lost = 0;
                    let destroyed = 0;
                    let transit = 0;
                    let repairing = 0;

                    tool.stocks.forEach((s: any) => {
                      available += s.quantityAvailable || 0;
                      using += s.quantityUsing || 0;
                      broken += s.quantityBroken || 0;
                      lost += s.quantityLost || 0;
                      destroyed += s.quantityDestroyed || 0;
                      transit += s.quantityTransit || 0;
                      repairing += s.quantityRepairing || 0;
                    });

                    const activeBroken = broken + repairing;

                    if (using > 0 && available > 0) {
                      statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-100 border';
                      statusText = `Trong kho: ${available} | Đang dùng: ${using}`;
                      if (activeBroken > 0) statusText += ` | Hỏng: ${activeBroken}`;
                      if (lost > 0) statusText += ` | Mất: ${lost}`;
                    } else if (using > 0 && available === 0) {
                      statusBadge = 'bg-green-50 text-green-700 border-green-100 border';
                      statusText = `Đang dùng: ${using}`;
                      if (activeBroken > 0) statusText += ` | Hỏng: ${activeBroken}`;
                      if (lost > 0) statusText += ` | Mất: ${lost}`;
                    } else if (available > 0 && using === 0) {
                      statusBadge = 'bg-blue-50 text-blue-700 border-blue-100 border';
                      statusText = `Trong kho: ${available}`;
                      if (activeBroken > 0) statusText += ` | Hỏng: ${activeBroken}`;
                      if (lost > 0) statusText += ` | Mất: ${lost}`;
                    } else {
                      statusBadge = 'bg-slate-100 text-slate-500';
                      statusText = 'Không khả dụng';
                      if (activeBroken > 0) statusText = `Hỏng: ${activeBroken}`;
                      if (lost > 0) statusText = `Mất: ${lost}`;
                    }
                  } else {
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
                      <td className="px-6 py-4 border-b font-bold text-slate-800">
                        {(() => {
                          let imageUrl = '';
                          if (tool.filesJson) {
                            try {
                              const files = JSON.parse(tool.filesJson);
                              imageUrl = files.avatarUrl || files.photoUrl || '';
                            } catch (e) {}
                          }
                          return imageUrl ? (
                            <span 
                              className="hover:text-primary-600 transition-colors cursor-pointer border-b border-dashed border-slate-350 pb-0.5 inline-flex items-center gap-1"
                              onMouseEnter={(e) => {
                                setHoveredImage({
                                  url: imageUrl,
                                  name: tool.toolName,
                                  code: tool.toolCode,
                                  unit: tool.unit || 'Cái',
                                  category: tool.category,
                                  stock: `${tool.quantity} ${tool.unit || 'Cái'}`,
                                  x: e.clientX,
                                  y: e.clientY
                                });
                              }}
                              onMouseMove={(e) => {
                                setHoveredImage(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                              }}
                              onMouseLeave={() => setHoveredImage(null)}
                            >
                              <span className="text-[12px] opacity-75">🖼️</span> {tool.toolName}
                            </span>
                          ) : (
                            tool.toolName
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 border-b text-xs font-bold text-slate-650">
                        {tool.managementType === 'INDIVIDUAL' ? 'Từng mã' : tool.managementType === 'QUANTITY' ? 'Số lượng' : tool.managementType === 'BUNDLE' ? 'Theo bộ' : 'Từng mã'}
                      </td>
                      <td className="px-6 py-4 border-b text-slate-500">{tool.category}</td>
                      <td className="px-6 py-4 border-b text-center font-bold text-slate-800">{tool.quantity} {tool.unit}</td>
                      {/* Quantity breakdown columns for QUANTITY type */}
                      {(() => {
                        if (tool.managementType === 'QUANTITY' && tool.stocks && tool.stocks.length > 0) {
                          let available = 0, using = 0, broken = 0, lost = 0;
                          tool.stocks.forEach((s: any) => {
                            available += s.quantityAvailable || 0;
                            using += s.quantityUsing || 0;
                            broken += (s.quantityBroken || 0) + (s.quantityRepairing || 0);
                            lost += s.quantityLost || 0;
                          });
                          return (
                            <>
                              <td className="px-6 py-4 border-b text-center">
                                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-sm">{available}</span>
                              </td>
                              <td className="px-6 py-4 border-b text-center">
                                {using > 0 ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black text-sm">{using}</span> : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              <td className="px-6 py-4 border-b text-center">
                                {broken > 0 ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-black text-sm">{broken}</span> : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              <td className="px-6 py-4 border-b text-center">
                                {lost > 0 ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-black text-sm">{lost}</span> : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <td className="px-6 py-4 border-b text-center text-slate-300 text-xs">—</td>
                              <td className="px-6 py-4 border-b text-center text-slate-300 text-xs">—</td>
                              <td className="px-6 py-4 border-b text-center text-slate-300 text-xs">—</td>
                              <td className="px-6 py-4 border-b text-center text-slate-300 text-xs">—</td>
                            </>
                          );
                        }
                      })()}
                      <td className="px-6 py-4 border-b text-slate-700 font-medium">{tool.currentUserName || '---'}</td>
                      <td className="px-6 py-4 border-b text-slate-500">{tool.departmentName || '---'}</td>
                      <td className="px-6 py-4 border-b text-slate-500 max-w-[250px] truncate" title={(() => {
                        if (tool.managementType === 'QUANTITY' && tool.stocks && tool.stocks.length > 0) {
                          const activeStocks = tool.stocks.filter((s: any) => 
                            (s.quantityAvailable || 0) + 
                            (s.quantityUsing || 0) + 
                            (s.quantityTransit || 0) + 
                            (s.quantityRepairing || 0) + 
                            (s.quantityBroken || 0) + 
                            (s.quantityLost || 0) > 0
                          );
                          if (activeStocks.length > 0) {
                            return activeStocks.map((s: any) => {
                              const parts = s.locationName.split(' - ');
                              const shortName = parts[parts.length - 1] || s.locationName;
                              let qtyText = '';
                              if (s.quantityAvailable > 0) qtyText += `Kho: ${s.quantityAvailable}`;
                              if (s.quantityUsing > 0) {
                                if (qtyText) qtyText += ', ';
                                qtyText += `Dùng: ${s.quantityUsing}`;
                              }
                              if (s.quantityBroken > 0 || s.quantityRepairing > 0) {
                                if (qtyText) qtyText += ', ';
                                qtyText += `Hỏng: ${(s.quantityBroken || 0) + (s.quantityRepairing || 0)}`;
                              }
                              if (s.quantityLost > 0) {
                                if (qtyText) qtyText += ', ';
                                qtyText += `Mất: ${s.quantityLost}`;
                              }
                              return `${shortName} (${qtyText})`;
                            }).join(' | ');
                          }
                        }
                        return tool.locationName || '';
                      })()}>
                        {(() => {
                          if (tool.managementType === 'QUANTITY' && tool.stocks && tool.stocks.length > 0) {
                            const activeStocks = tool.stocks.filter((s: any) => 
                              (s.quantityAvailable || 0) + 
                              (s.quantityUsing || 0) + 
                              (s.quantityTransit || 0) + 
                              (s.quantityRepairing || 0) + 
                              (s.quantityBroken || 0) + 
                              (s.quantityLost || 0) > 0
                            );
                            if (activeStocks.length > 0) {
                              return activeStocks.map((s: any) => {
                                const parts = s.locationName.split(' - ');
                                const shortName = parts[parts.length - 1] || s.locationName;
                                let qtyText = '';
                                if (s.quantityAvailable > 0) qtyText += `Kho: ${s.quantityAvailable}`;
                                if (s.quantityUsing > 0) {
                                  if (qtyText) qtyText += ', ';
                                  qtyText += `Dùng: ${s.quantityUsing}`;
                                }
                                if (s.quantityBroken > 0 || s.quantityRepairing > 0) {
                                  if (qtyText) qtyText += ', ';
                                  qtyText += `Hỏng: ${(s.quantityBroken || 0) + (s.quantityRepairing || 0)}`;
                                }
                                if (s.quantityLost > 0) {
                                  if (qtyText) qtyText += ', ';
                                  qtyText += `Mất: ${s.quantityLost}`;
                                }
                                return `${shortName} (${qtyText})`;
                              }).join(' | ');
                            } else {
                              return 'Không có tồn kho';
                            }
                          }
                          return tool.locationName || '---';
                        })()}
                      </td>
                      <td className="px-6 py-4 border-b">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
                          {statusText}
                        </span>
                      </td>
                      {/* Per-row action dropdown menu */}
                      <td className="px-6 py-4 border-b text-right">
                        <div className="relative inline-block" ref={openActionMenuId === tool.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === tool.id ? null : tool.id)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Tác vụ"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openActionMenuId === tool.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1 overflow-hidden">
                              <button
                                onClick={() => { setOpenActionMenuId(null); navigate(`/tools/${tool.id}`); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" /> Xem hồ sơ
                              </button>
                              {tool.managementType === 'QUANTITY' && (
                                <>
                                  <div className="mx-3 my-1 border-t border-slate-100" />
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setHandoverForm({ ...handoverForm, type: 'TRANSFER' });
                                      setActiveModal('HANDOVER');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" /> Luân chuyển
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setHandoverForm({ ...handoverForm, type: 'RECALL' });
                                      setActiveModal('HANDOVER');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-green-500" /> Thu hồi
                                  </button>
                                  <div className="mx-3 my-1 border-t border-slate-100" />
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setActiveModal('DAMAGE');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                  >
                                    <Wrench className="h-3.5 w-3.5 text-amber-500" /> Báo hỏng / Ghi nhận
                                  </button>
                                </>
                              )}
                              {tool.managementType !== 'QUANTITY' && (
                                <>
                                  <div className="mx-3 my-1 border-t border-slate-100" />
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setHandoverForm({ ...handoverForm, type: 'ALLOCATE' });
                                      setActiveModal('HANDOVER');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                  >
                                    <UserPlus className="h-3.5 w-3.5 text-primary-500" /> Bàn giao
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setActiveModal('DAMAGE');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                  >
                                    <Wrench className="h-3.5 w-3.5 text-amber-500" /> Báo hỏng
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setSelectedIds([tool.id]);
                                      setActiveModal('LOST');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                                  >
                                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Báo mất
                                  </button>
                                </>
                              )}
                              <div className="mx-3 my-1 border-t border-slate-100" />
                              <button
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setSelectedIds([tool.id]);
                                  setActiveModal('PRINT');
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Printer className="h-3.5 w-3.5 text-slate-400" /> In tem QR
                              </button>
                            </div>
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
          <div className="bg-white rounded-3xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary-500" />
                Biên bản luân chuyển / thu hồi CCDC theo số lượng
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleHandoverSubmit}>
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                
                {/* 1. NGHIỆP VỤ SELECTOR */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Loại nghiệp vụ</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
                    {[
                      { key: 'ALLOCATE', label: 'Bàn giao' },
                      { key: 'TRANSFER', label: 'Luân chuyển' },
                      { key: 'RECALL', label: 'Thu hồi' },
                      { key: 'SPLIT', label: 'Tách số lượng' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setHandoverForm({ ...handoverForm, type: opt.key as any })}
                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                          handoverForm.type === opt.key
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. CCDC TABLE */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Bảng CCDC đã chọn *</label>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">CCDC</th>
                          <th className="px-4 py-3">Vị trí nguồn</th>
                          <th className="px-4 py-3">Tồn / Đang giữ</th>
                          {handoverForm.type === 'RECALL' ? (
                            <>
                              <th className="px-3 py-3 text-center w-16">Tốt</th>
                              <th className="px-3 py-3 text-center w-16">Hỏng</th>
                              <th className="px-3 py-3 text-center w-16">Mất</th>
                            </>
                          ) : (handoverForm.type === 'TRANSFER' || handoverForm.type === 'ALLOCATE') ? (
                            <th className="px-4 py-3 text-center w-24">SL xử lý *</th>
                          ) : (
                            <th className="px-4 py-3 w-48">Cấu hình tách</th>
                          )}
                          <th className="px-4 py-3">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {modalItems.map((item) => {
                          const isQuantity = item.managementType === 'QUANTITY';
                          return (
                            <React.Fragment key={item.toolId}>
                              <tr className="hover:bg-slate-50/50">
                                <td className="px-4 py-4">
                                  <div className="font-bold text-slate-850">{item.toolName}</div>
                                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">{item.toolCode}</div>
                                  <div className="text-[9px] px-1.5 py-0.5 mt-1 bg-slate-100 text-slate-500 rounded font-bold inline-block uppercase">
                                    {isQuantity ? 'Số lượng' : 'Từng mã'}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  {isQuantity ? (
                                    <select
                                      className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold w-full max-w-[180px]"
                                      value={item.sourceLocation}
                                      onChange={e => handleItemFieldChange(item.toolId, 'sourceLocation', e.target.value)}
                                    >
                                      {item.stocks.map((s: any) => (
                                        <option key={s.id} value={s.locationName}>
                                          {s.locationName.split(' - ').slice(-1)[0]} ({handoverForm.type === 'RECALL' ? `Dùng: ${s.quantityUsing}` : `Khả dụng: ${s.quantityAvailable}`})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">
                                      {item.sourceLocation.split(' - ').slice(-1)[0] || '---'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-slate-500">
                                  <strong className="text-slate-800">{item.maxQty}</strong> {item.unit || 'cái'}
                                </td>
                                
                                {handoverForm.type === 'RECALL' ? (
                                  <>
                                    <td className="px-3 py-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.maxQty}
                                        className="w-12 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-center font-bold text-green-700"
                                        value={item.qtyGood}
                                        onChange={e => handleItemFieldChange(item.toolId, 'qtyGood', e.target.value)}
                                      />
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.maxQty}
                                        className="w-12 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-center font-bold text-amber-700"
                                        value={item.qtyBroken}
                                        onChange={e => handleItemFieldChange(item.toolId, 'qtyBroken', e.target.value)}
                                      />
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.maxQty}
                                        className="w-12 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-center font-bold text-red-700"
                                        value={item.qtyLost}
                                        onChange={e => handleItemFieldChange(item.toolId, 'qtyLost', e.target.value)}
                                      />
                                    </td>
                                  </>
                                ) : (handoverForm.type === 'TRANSFER' || handoverForm.type === 'ALLOCATE') ? (
                                  <td className="px-4 py-4 text-center">
                                    <input
                                      type="number"
                                      min={1}
                                      max={item.maxQty}
                                      required
                                      disabled={!isQuantity}
                                      className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold"
                                      value={item.quantityProcessed}
                                      onChange={e => handleItemFieldChange(item.toolId, 'quantityProcessed', e.target.value)}
                                    />
                                  </td>
                                ) : (
                                  <td className="px-4 py-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] text-slate-500">
                                        Tổng tách: <strong className="text-slate-800">{item.quantityProcessed}</strong> / {item.maxQty}
                                      </span>
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="rounded border-slate-350"
                                          checked={item.createChildCodes}
                                          onChange={e => handleItemFieldChange(item.toolId, 'createChildCodes', e.target.checked)}
                                        />
                                        <span className="text-[9px] text-slate-650 font-bold select-none">Tạo mã con (-01, -02)</span>
                                      </label>
                                    </div>
                                  </td>
                                )}

                                <td className="px-4 py-4">
                                  <input
                                    type="text"
                                    placeholder="Ghi chú..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                    value={item.note}
                                    onChange={e => handleItemFieldChange(item.toolId, 'note', e.target.value)}
                                  />
                                </td>
                              </tr>

                              {handoverForm.type === 'SPLIT' && (
                                <tr className="bg-slate-50/40">
                                  <td colSpan={5} className="px-4 py-3 border-b">
                                    <div className="space-y-2 pl-6 border-l-2 border-primary-500">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                                        <span>Danh sách vị trí nhận tách:</span>
                                        <button
                                          type="button"
                                          onClick={() => addSplitDestination(item.toolId)}
                                          className="text-primary-600 hover:text-primary-800 text-[10px] font-black uppercase flex items-center gap-1"
                                        >
                                          + Thêm vị trí nhận
                                        </button>
                                      </div>
                                      {item.splits.map((split: any, sIdx: number) => (
                                        <div key={sIdx} className="flex gap-3 items-center">
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              list="split-location-suggestions"
                                              placeholder="Chọn hoặc nhập vị trí nhận..."
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold"
                                              value={split.toLocation}
                                              onChange={e => handleSplitChange(item.toolId, sIdx, 'toLocation', e.target.value)}
                                            />
                                          </div>
                                          <div className="w-24 flex items-center gap-1.5">
                                            <span className="text-xs text-slate-400">SL:</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={item.maxQty}
                                              className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-xs"
                                              value={split.quantity}
                                              onChange={e => handleSplitChange(item.toolId, sIdx, 'quantity', e.target.value)}
                                            />
                                          </div>
                                          {item.splits.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => removeSplitDestination(item.toolId, sIdx)}
                                              className="text-red-500 hover:text-red-700 p-1"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <datalist id="split-location-suggestions">
                      {locations.map(l => <option key={l.id} value={l.name} />)}
                    </datalist>
                  </div>
                </div>

                {/* 3. VỊ TRÍ ĐÍCH & NGƯỜI NHẬN (LUÂN CHUYỂN / THU HỒI) */}
                {handoverForm.type !== 'SPLIT' && (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                      Thông tin nơi nhận / đích đến
                    </h4>

                    {(handoverForm.type === 'TRANSFER' || handoverForm.type === 'ALLOCATE') && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người nhận</label>
                          <input 
                            type="text" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            placeholder="Nhập tên..."
                            value={handoverForm.recipientName}
                            onChange={e => setHandoverForm({ ...handoverForm, recipientName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bộ phận</label>
                          <input 
                            type="text" 
                            list="handover-dept-suggestions"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            placeholder="Phòng ban..."
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
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            placeholder="Chức vụ..."
                            value={handoverForm.recipientPosition}
                            onChange={e => setHandoverForm({ ...handoverForm, recipientPosition: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      {/* Thành phố */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thành phố *</label>
                        <select 
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
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

                      {/* Dự án */}
                      {selectedCity && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dự án *</label>
                          <select 
                            required
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
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

                      {/* Vị trí chi tiết */}
                      {selectedProject && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {handoverForm.type === 'RECALL' ? 'Vị trí đích thu hồi *' : 'Vị trí chi tiết nhận *'}
                          </label>
                          <select 
                            required
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
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
                    </div>

                    {/* Custom Text Fields for "Khác" */}
                    <div className="grid grid-cols-3 gap-4">
                      {selectedCity === 'Khác' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên thành phố khác *</label>
                          <input 
                            type="text"
                            required
                            placeholder="Nhập thành phố..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            value={customCity}
                            onChange={e => setCustomCity(e.target.value)}
                          />
                        </div>
                      )}

                      {selectedProject === 'Khác' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên dự án khác *</label>
                          <input 
                            type="text"
                            required
                            placeholder="Nhập dự án..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            value={customProject}
                            onChange={e => setCustomProject(e.target.value)}
                          />
                        </div>
                      )}

                      {selectedLocation === 'Khác' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên vị trí khác *</label>
                          <input 
                            type="text"
                            required
                            placeholder="Nhập vị trí chi tiết..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                            value={customLocation}
                            onChange={e => setCustomLocation(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. CHUNG METADATA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do giao dịch</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      placeholder="Lý do..."
                      value={handoverForm.reason}
                      onChange={e => setHandoverForm({ ...handoverForm, reason: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú chung biên bản</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
                      placeholder="Ghi chú thêm..."
                      value={handoverForm.note}
                      onChange={e => setHandoverForm({ ...handoverForm, note: e.target.value })}
                    />
                  </div>
                </div>

              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all">
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
      {activeModal === 'PRINT' && (() => {
        const labelSizes = [
          { id: 'sm',  label: 'Nhỏ (40×25mm)',  qrSize: 60,  width: '151px', height: '94px',  fontSize: '7px', nameSize: '8px' },
          { id: 'md',  label: 'Vừa (60×40mm)',  qrSize: 90,  width: '227px', height: '151px', fontSize: '9px', nameSize: '10px' },
          { id: 'lg',  label: 'Lớn (90×60mm)',  qrSize: 130, width: '340px', height: '227px', fontSize: '11px', nameSize: '13px' }
        ];
        const [labelSize, setLabelSize_] = React.useState<'sm'|'md'|'lg'>('md');
        const [copies, setCopies_] = React.useState(1);
        const currentSize = labelSizes.find(s => s.id === labelSize)!;

        const handlePrint = () => {
          const printItems = selectedToolsToPrint.flatMap(tool => {
            const url = `${window.location.origin}/tools/${tool.id}`;
            return Array(copies).fill({ tool, url });
          });

          const printWindow = window.open('', '_blank', 'width=900,height=700');
          if (!printWindow) { toast.error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up.'); return; }

          const qrSvgs = printItems.map(({ tool, url }) => {
            const container = document.createElement('div');
            container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${currentSize.qrSize} ${currentSize.qrSize}" width="${currentSize.qrSize}" height="${currentSize.qrSize}" data-url="${url}" data-name="${tool.toolName}" data-code="${tool.toolCode}" data-dept="${tool.departmentName || ''}" data-loc="${tool.locationName || ''}"></svg>`;
            return { tool, url };
          });

          printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>In tem QR CCDC - Danko Group</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #f1f5f9; padding: 20px; }
    .controls { background: white; border-radius: 12px; padding: 16px 24px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .controls h1 { font-size: 16px; font-weight: 900; color: #1e293b; flex: 1; }
    .print-btn { background: #4f46e5; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #4338ca; }
    .close-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
    .label-card {
      width: ${currentSize.width};
      height: ${currentSize.height};
      background: white;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .label-header { background: #1e293b; padding: 3px 6px; display: flex; align-items: center; gap: 4px; }
    .label-header .logo-text { color: white; font-weight: 900; font-size: ${currentSize.fontSize}; letter-spacing: 1px; text-transform: uppercase; }
    .label-header .logo-dot { width: 5px; height: 5px; background: #f59e0b; border-radius: 50%; flex-shrink: 0; }
    .label-body { display: flex; flex: 1; padding: 4px; gap: 4px; align-items: center; overflow: hidden; }
    .label-qr { flex-shrink: 0; }
    .label-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
    .label-name { font-weight: 800; font-size: ${currentSize.nameSize}; color: #0f172a; line-height: 1.2; word-break: break-word; }
    .label-code { font-family: 'Courier New', monospace; font-size: ${currentSize.fontSize}; font-weight: 700; color: #4f46e5; letter-spacing: 0.5px; word-break: break-all; }
    .label-meta { font-size: ${currentSize.fontSize}; color: #64748b; line-height: 1.2; word-break: break-word; }
    .label-footer { border-top: 1px dashed #e2e8f0; padding: 2px 6px; display: flex; justify-content: space-between; align-items: center; }
    .label-footer span { font-size: ${currentSize.fontSize}; color: #94a3b8; }
    @media print {
      body { background: white; padding: 0; }
      .controls { display: none !important; }
      .grid { gap: 4px; padding: 4px; }
      .label-card { border: 1px solid #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="controls">
    <h1>🖨️ Xem trước — ${printItems.length} tem QR CCDC | Danko Group</h1>
    <button class="close-btn" onclick="window.close()">✕ Đóng</button>
    <button class="print-btn" onclick="window.print()">🖨️ In ngay</button>
  </div>
  <div class="grid" id="grid"></div>
  <script>
    const items = ${JSON.stringify(printItems.map(({ tool, url }) => ({
      url,
      name: tool.toolName,
      code: tool.toolCode,
      dept: tool.departmentName || '',
      loc: (() => { const parts = (tool.locationName || '').split(' - '); return parts[parts.length - 1] || tool.locationName || ''; })()
    })))};
    const grid = document.getElementById('grid');
    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'label-card';
      card.innerHTML = \`
        <div class="label-header">
          <div class="logo-dot"></div>
          <span class="logo-text">Danko Group</span>
        </div>
        <div class="label-body">
          <div class="label-qr" id="qr\${idx}"></div>
          <div class="label-info">
            <div class="label-name">\${item.name}</div>
            <div class="label-code">\${item.code}</div>
            \${item.dept ? \`<div class="label-meta">📍 \${item.loc || item.dept}</div>\` : ''}
          </div>
        </div>
        <div class="label-footer">
          <span>Scan to view details</span>
          <span>${new Date().toLocaleDateString('vi-VN')}</span>
        </div>
      \`;
      grid.appendChild(card);
      try {
        new QRCode(document.getElementById('qr' + idx), {
          text: item.url,
          width: ${currentSize.qrSize},
          height: ${currentSize.qrSize},
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e) {}
    });
  <\/script>
</body>
</html>`);
          printWindow.document.close();
        };

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider flex items-center gap-2">
                  <Printer className="h-5 w-5 text-indigo-500" /> Trung tâm in tem QR CCDC
                </h3>
                <button onClick={() => setActiveModal('NONE')} className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Settings bar */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kích cỡ tem</label>
                    <div className="flex gap-2">
                      {labelSizes.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setLabelSize_(s.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${labelSize === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số bản sao / tem</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCopies_(Math.max(1, copies - 1))} className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700">−</button>
                      <span className="text-sm font-black text-slate-800 w-6 text-center">{copies}</span>
                      <button onClick={() => setCopies_(Math.min(10, copies + 1))} className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700">+</button>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng tem sẽ in</div>
                    <div className="text-xl font-black text-indigo-600">{selectedToolsToPrint.length * copies}</div>
                  </div>
                </div>
              </div>

              {/* Preview grid */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Xem trước ({selectedToolsToPrint.length} loại CCDC)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedToolsToPrint.map(tool => {
                    const url = `${window.location.origin}/tools/${tool.id}`;
                    const locParts = (tool.locationName || '').split(' - ');
                    const shortLoc = locParts[locParts.length - 1] || tool.locationName || '';
                    return (
                      <div key={tool.id} className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
                        {/* Tem header */}
                        <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-white text-[9px] font-black tracking-widest uppercase">Danko Group</span>
                        </div>
                        {/* Tem body */}
                        <div className="p-3 flex gap-2.5 items-center">
                          <div className="shrink-0 p-1 border border-slate-200 rounded-lg bg-white">
                            <QRCode value={url} size={currentSize.qrSize * 0.85} />
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <p className="text-[9px] font-black text-slate-800 leading-snug line-clamp-3">{tool.toolName}</p>
                            <p className="font-mono text-[9px] font-black text-indigo-600 break-all">{tool.toolCode}</p>
                            {(shortLoc || tool.departmentName) && (
                              <p className="text-[8px] text-slate-400 truncate">📍 {shortLoc || tool.departmentName}</p>
                            )}
                          </div>
                        </div>
                        {/* Tem footer */}
                        <div className="border-t border-dashed border-slate-200 px-3 py-1 flex justify-between">
                          <span className="text-[8px] text-slate-400">Scan to view</span>
                          <span className="text-[8px] text-slate-400">{new Date().toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">{selectedToolsToPrint.length} CCDC × {copies} bản = <strong className="text-indigo-600">{selectedToolsToPrint.length * copies} tem</strong></span>
                  <span className="text-[10px] text-slate-400">Sẽ mở cửa sổ in mới với bố cục tem tối ưu</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal('NONE')} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-bold">
                    Đóng
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 flex items-center gap-2 transition-colors"
                  >
                    <Printer className="h-4 w-4" /> Mở cửa sổ in
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {hoveredImage && (
        <div 
          className="fixed z-50 bg-white p-4 rounded-3xl shadow-2xl border border-slate-200 w-72 flex flex-col gap-3 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${Math.min(hoveredImage.x + 15, window.innerWidth - 300)}px`,
            top: `${hoveredImage.y - 310 < 10 ? hoveredImage.y + 20 : hoveredImage.y - 310}px`,
          }}
        >
          <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
            <img src={hoveredImage.url} alt={hoveredImage.name} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2 text-left">
            <p className="text-sm font-black text-slate-800 leading-tight uppercase">
              {hoveredImage.name}
            </p>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>MÃ: <span className="text-slate-650 font-mono font-bold">{hoveredImage.code || '---'}</span></span>
              <span>ĐVT: <span className="text-slate-655 font-bold">{hoveredImage.unit || '---'}</span></span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold">
              PHÂN LOẠI: <span className="text-slate-655 font-bold">{hoveredImage.category || '---'}</span>
            </div>
            <div className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100 w-max">
              TỒN KHO: {hoveredImage.stock || '---'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
