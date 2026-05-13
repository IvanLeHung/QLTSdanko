import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  ClipboardCheck, 
  Wrench, 
  History,
  Info,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Printer,
  ChevronDown,
  ArrowRightLeft,
  RotateCcw,
  Plus,
  Loader2,
  Trash2,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  Upload,
  Download,
  Image as ImageIcon,
  Paperclip,
  Save,
  Edit3,
  Check,
  FileSearch,
  FilePlus,
  FileCheck,
  Eye,
  FileUp,
  FileDown,
  QrCode as QrCodeIcon,
  Copy
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RepairTicketForm } from './RepairTicketForm';
import { CompleteRepairForm } from './CompleteRepairForm';
import { toast } from 'react-toastify';
import { AppliedFormsBlock } from './AppliedFormsBlock';
import { AssetDocumentsTab } from './AssetDocumentsTab';
import { BMFormDispatcher } from './forms/BMFormDispatcher';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssetDetailPopupProps {
  assetId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, assetId: number) => void;
  initialTab?: TabType;
}

type TabType = 'info' | 'assignment' | 'inventory' | 'repair' | 'timeline' | 'documents';

export const AssetDetailPopup: React.FC<AssetDetailPopupProps> = ({ assetId, isOpen, onClose, onAction, initialTab = 'info' }) => {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
  const [isCompleteRepairOpen, setIsCompleteRepairOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<{code: string, data?: any} | null>(null);

  useEffect(() => {
    if (isOpen && assetId) {
      fetchAssetDetail();
      fetchCompanies();
      setActiveTab(initialTab);
      setMode('view');
    } else {
      setAsset(null);
      setMode('view');
      setActiveTab('info');
    }
  }, [isOpen, assetId, initialTab]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/assets/filter-options/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const fetchAssetDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assets/${assetId}`);
      setAsset(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return { label: 'TRONG KHO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'ASSIGNED': return { label: 'ĐANG SỬ DỤNG', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'UNDER_REPAIR': return { label: 'ĐANG SỬA CHỮA', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'DAMAGED': return { label: 'BÁO HỎNG', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'LOST': return { label: 'BÁO MẤT', color: 'bg-slate-800 text-white border-slate-700' };
      case 'DISPOSED': return { label: 'ĐÃ THANH LÝ', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: return { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  if (!isOpen) return null;

  const TabButton: React.FC<{ id: TabType; label: string; icon: any }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
        activeTab === id 
          ? "border-primary-600 text-primary-600 bg-primary-50/30" 
          : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  );

  const currentOpenTicket = asset?.repairTickets?.find((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

  const handleUpdateProgress = async () => {
    if (!currentOpenTicket) return;
    const description = prompt("Nhập nội dung cập nhật tiến độ:");
    if (!description) return;

    try {
      await api.put(`/repairs/${currentOpenTicket.id}/progress`, {
        description,
        performedBy: 'Nhân viên QLTS'
      });
      toast.success("Đã cập nhật tiến độ");
      fetchAssetDetail();
    } catch (err: any) {
      toast.error("Lỗi khi cập nhật tiến độ");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(asset.assetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Đã sao chép mã tài sản");
  };

  const enterEditMode = () => {
    setEditForm({
      assetName: asset.assetName,
      serialNumber: asset.serialNumber || '',
      unit: asset.unit,
      usagePurpose: asset.usagePurpose || '',
      purchasePriceExVat: asset.purchasePriceExVat || 0,
      purchaseDate: asset.purchaseDate ? format(new Date(asset.purchaseDate), 'yyyy-MM-dd') : '',
      depreciationEndDate: asset.depreciationEndDate ? format(new Date(asset.depreciationEndDate), 'yyyy-MM-dd') : '',
      supplierName: asset.supplierName || '',
      companyCode: asset.companyCode,
      assetCode: asset.assetCode,
      note: asset.note || ''
    });
    setMode('edit');
  };

  const cancelEdit = () => {
    setMode('view');
    setEditForm(null);
  };

  const handleSave = async () => {
    const changes: any = {};
    const sensitiveFields = ['assetCode', 'purchasePriceExVat', 'purchaseDate', 'depreciationEndDate', 'serialNumber', 'companyCode'];
    let hasSensitiveChanges = false;

    for (const key in editForm) {
      let oldVal = asset[key];
      let newVal = editForm[key];

      if (key === 'purchaseDate' || key === 'depreciationEndDate') {
        oldVal = oldVal ? format(new Date(oldVal), 'yyyy-MM-dd') : '';
      }

      if (String(oldVal) !== String(newVal)) {
        changes[key] = newVal;
        if (sensitiveFields.includes(key)) hasSensitiveChanges = true;
      }
    }

    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }

    if (hasSensitiveChanges) {
      setPendingUpdates(changes);
      setShowReasonModal(true);
    } else {
      await submitUpdates(changes);
    }
  };

  const submitUpdates = async (updates: any, changeReason?: string) => {
    setIsSaving(true);
    try {
      await api.patch(`/assets/${asset.id}`, { ...updates, reason: changeReason });
      toast.success("Cập nhật tài sản thành công");
      setMode('view');
      setShowReasonModal(false);
      setReason('');
      fetchAssetDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật tài sản");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* POPUP CONTAINER */}
      <div className="relative w-full max-w-[880px] max-h-[82vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300">
        
        {loading ? (
          <div className="h-[500px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải dữ liệu...</p>
          </div>
        ) : asset ? (
          <>
            {/* HEADER */}
            <input 
              type="file" 
              id="asset-file-upload" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  toast.success(`Đã chuẩn bị tải lên: ${e.target.files[0].name}`);
                  // Real upload logic would go here
                }
              }} 
            />
            <div className="px-8 pt-8 pb-6 bg-white flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-50 p-4 rounded-2xl text-primary-600 border border-primary-100 shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-[900] text-slate-900 tracking-tighter uppercase">{asset.assetCode}</h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      getStatusInfo(asset.status).color
                    )}>
                      {getStatusInfo(asset.status).label}
                    </span>
                  </div>
                  <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight">{asset.assetName}</h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {mode === 'view' && (
                  <>
                    <button 
                      onClick={enterEditMode}
                      className="flex items-center px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:border-primary-100 transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-2" /> Sửa thông tin
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction('print_label', asset.id); }}
                      className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-100 rounded-xl transition-all shadow-sm group"
                      title="In tem tài sản"
                    >
                      <Printer className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[10px] uppercase tracking-widest">In tem</span>
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
                >
                  <X className="h-6 w-6 text-slate-300 group-hover:text-slate-600" />
                </button>
              </div>
            </div>

            {/* QUICK SUMMARY */}
            <div className="px-8 mb-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50/80 rounded-3xl border border-slate-100">
                <div className="px-4 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng hiện tại</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{asset.currentUserName || 'Chưa cấp phát'}</p>
                </div>
                <div className="px-4 space-y-1 border-x border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kiểm kê cuối</p>
                  <p className="text-sm font-bold text-slate-700">{asset.lastInventoryDate ? format(new Date(asset.lastInventoryDate), 'dd/MM/yyyy') : 'Chưa kiểm kê'}</p>
                </div>
                <div className="px-4 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí hiện tại</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{asset.cityName} {asset.locationName ? ` - ${asset.locationName}` : ''}</p>
                </div>
              </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex px-8 border-b border-slate-100 bg-white">
              <TabButton id="info" label="Thông tin" icon={Info} />
              <TabButton id="assignment" label="Cấp phát" icon={ArrowRightLeft} />
              <TabButton id="inventory" label="Kiểm kê" icon={ClipboardCheck} />
              <TabButton id="repair" label="Sửa chữa" icon={Wrench} />
              <TabButton id="documents" label="Hồ sơ" icon={FileText} />
              <TabButton id="timeline" label="Nhật ký" icon={History} />
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="col-span-2 flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-400">
                         <QrCodeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã định danh (QR/Barcode)</p>
                        <p className="text-xs font-bold text-slate-600 font-mono flex items-center mt-0.5">
                           {asset.assetCode} 
                           <button onClick={handleCopyCode} className="ml-2 hover:text-primary-600">
                             {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                           </button>
                        </p>
                      </div>
                    </div>
                    {asset.lastLabelPrint && (
                      <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" /> Đã in tem: {format(new Date(asset.lastLabelPrint), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {mode === 'edit' && (
                      <div className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                        <AlertCircle className="h-3 w-3 mr-1.5" /> Đang ở chế độ chỉnh sửa
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Tag className="mr-2 h-3 w-3" /> Tên tài sản
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="text" 
                        value={editForm.assetName} 
                        onChange={e => setEditForm({...editForm, assetName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.assetName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Tag className="mr-2 h-3 w-3" /> Serial Number
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="text" 
                        value={editForm.serialNumber} 
                        onChange={e => setEditForm({...editForm, serialNumber: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.serialNumber || 'N/A'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <ClipboardCheck className="mr-2 h-3 w-3" /> Đơn vị tính
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.unit} 
                        onChange={e => setEditForm({...editForm, unit: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {['Cái', 'Bộ', 'Chiếc', 'Mét', 'Kg', 'Lô'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.unit}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Info className="mr-2 h-3 w-3" /> Mục đích sử dụng
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.usagePurpose} 
                        onChange={e => setEditForm({...editForm, usagePurpose: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {['Cá nhân', 'Dùng chung', 'Dự phòng', 'Khác'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.usagePurpose || 'N/A'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <DollarSign className="mr-2 h-3 w-3" /> Giá mua (ex VAT)
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="number" 
                        value={editForm.purchasePriceExVat} 
                        onChange={e => setEditForm({...editForm, purchasePriceExVat: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.purchasePriceExVat?.toLocaleString()} ₫</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Calendar className="mr-2 h-3 w-3" /> Ngày mua
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="date" 
                        value={editForm.purchaseDate} 
                        onChange={e => setEditForm({...editForm, purchaseDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.purchaseDate ? format(new Date(asset.purchaseDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Clock className="mr-2 h-3 w-3" /> Hết khấu hao
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="date" 
                        value={editForm.depreciationEndDate} 
                        onChange={e => setEditForm({...editForm, depreciationEndDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.depreciationEndDate ? format(new Date(asset.depreciationEndDate), 'dd/MM/yyyy') : 'N/A'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Building2 className="mr-2 h-3 w-3" /> Nhà cung cấp
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="text" 
                        value={editForm.supplierName} 
                        onChange={e => setEditForm({...editForm, supplierName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.supplierName || 'N/A'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Building2 className="mr-2 h-3 w-3" /> Công ty chủ quản
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.companyCode} 
                        onChange={e => setEditForm({...editForm, companyCode: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {companies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.companyName}</p>
                    )}
                  </div>

                  <div className="col-span-2 p-5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</p>
                    {mode === 'edit' ? (
                      <textarea 
                        value={editForm.note} 
                        onChange={e => setEditForm({...editForm, note: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-primary-500 h-24 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{asset.note || 'Không có ghi chú.'}</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'assignment' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Người đang sử dụng</p>
                      <h4 className="text-lg font-black text-slate-900">{asset.currentUserName || 'Sẵn sàng cấp phát'}</h4>
                      <p className="text-xs font-bold text-blue-500 mt-1">{asset.departmentName} {asset.currentPosition ? ` • ${asset.currentPosition}` : ''}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-blue-500"><User className="h-6 w-6" /></div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử bàn giao gần đây</h5>
                    {asset.assignments?.length > 0 ? (
                      <div className="space-y-3">
                        {asset.assignments.map((as: any) => (
                          <div key={as.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group">
                            <div className="flex items-center space-x-3">
                              <div className="bg-slate-100 p-2 rounded-xl text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors"><RotateCcw className="h-4 w-4" /></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{as.newUserName}</p>
                                <p className="text-[10px] font-bold text-slate-400">{format(new Date(as.effectiveAt), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary-600 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                               <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 italic text-xs font-medium">Chưa có lịch sử bàn giao.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Kết quả kiểm kê gần nhất</p>
                     <div className="grid grid-cols-2 gap-y-4">
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</p>
                           <span className={cn("text-xs font-black uppercase tracking-wider", asset.lastInventoryStatus ? "text-emerald-700" : "text-amber-600")}>
                              {asset.lastInventoryStatus ? 'Khớp' : 'Chưa kiểm kê'}
                           </span>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày thực hiện</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryDate ? format(new Date(asset.lastInventoryDate), 'dd/MM/yyyy') : 'Chưa có'}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Tình trạng thực tế</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryCondition || 'Hoạt động tốt'}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Người kiểm kê</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryBy || '-'}</p>
                        </div>
                     </div>
                   </div>
                   
                   <div className="p-6 border border-slate-100 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử kiểm kê</h5>
                         <button onClick={() => onAction('inventory', asset.id)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline flex items-center">
                            <Plus className="mr-1 h-3 w-3" /> Thực hiện kiểm kê
                         </button>
                      </div>
                      <div className="text-center py-6 text-slate-400 italic text-xs font-medium">Chưa có dữ liệu kiểm kê trước đó.</div>
                   </div>
                </div>
              )}

              {activeTab === 'repair' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {/* CURRENT STATUS CARD */}
                   {currentOpenTicket ? (
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start space-x-5">
                         <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                            <Wrench className="h-6 w-6" />
                         </div>
                         <div className="flex-1 space-y-3">
                            <div>
                               <div className="flex items-center justify-between">
                                  <h4 className="text-base font-black text-slate-900">Đang sửa chữa</h4>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white px-2 py-0.5 rounded-lg border border-amber-100">
                                     {currentOpenTicket.repairCode}
                                  </span>
                               </div>
                               <p className="text-xs font-medium text-slate-500 mt-0.5">Ngày ghi nhận: {format(new Date(currentOpenTicket.reportedDate), 'dd/MM/yyyy')}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-amber-100/50">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị sửa chữa</p>
                                  <p className="text-sm font-bold text-slate-700">{currentOpenTicket.repairVendor || 'Chưa xác định'}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dự kiến hoàn tất</p>
                                  <p className="text-sm font-bold text-slate-700">{currentOpenTicket.expectedFinishDate ? format(new Date(currentOpenTicket.expectedFinishDate), 'dd/MM/yyyy') : 'Chưa có'}</p>
                               </div>
                            </div>

                            <div className="flex space-x-3 pt-1">
                               <button 
                                  onClick={handleUpdateProgress}
                                  className="flex-1 h-10 bg-white border border-amber-200 text-amber-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
                               >
                                  Cập nhật tiến độ
                               </button>
                               <button 
                                  onClick={() => { setSelectedTicket(currentOpenTicket); setIsCompleteRepairOpen(true); }}
                                  className="flex-1 h-10 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-md shadow-amber-200"
                               >
                                  Hoàn tất sửa chữa
                               </button>
                            </div>
                         </div>
                      </div>
                   ) : asset.status === 'DAMAGED' ? (
                      <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-center space-x-5">
                         <div className="bg-rose-100 p-3 rounded-2xl text-rose-600">
                            <AlertCircle className="h-6 w-6" />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Hỏng không sửa được</h4>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Tài sản cần được chuyển sang quy trình thanh lý hoặc hủy bỏ.</p>
                            <div className="flex space-x-3 mt-4">
                               <button onClick={() => onAction('liquidate', asset.id)} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all">Chuyển thanh lý</button>
                               <button onClick={() => onAction('scrap', asset.id)} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all">Chuyển hủy</button>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                         <div className="flex items-center space-x-4">
                            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                               <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                               <h4 className="text-base font-black text-slate-900">Vận hành bình thường</h4>
                               <p className="text-xs font-medium text-slate-500">Tài sản hiện tại không ghi nhận sự cố hỏng hóc nào.</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setIsRepairFormOpen(true)}
                            className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                         >
                            Báo hỏng / Sửa chữa
                         </button>
                      </div>
                   )}

                   {/* REPAIR HISTORY LIST */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center">
                         <History className="mr-2 h-3 w-3" /> Nhật ký sự cố & sửa chữa
                      </h5>
                      {asset.repairTickets?.length > 0 ? (
                        <div className="space-y-3">
                           {asset.repairTickets.map((ticket: any) => (
                             <div key={ticket.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-primary-100 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                   <div>
                                      <p className="text-xs font-black text-slate-800">{ticket.repairCode}</p>
                                      <p className="text-[10px] font-bold text-slate-400">{format(new Date(ticket.reportedDate), 'dd/MM/yyyy')}</p>
                                   </div>
                                   <span className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                                      ticket.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                      ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      "bg-slate-50 text-slate-500 border-slate-100"
                                   )}>
                                      {ticket.status}
                                   </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100/50 italic mb-3">
                                   "{ticket.damageDescription}"
                                </p>
                                {ticket.result && (
                                   <div className="flex items-center text-[11px] font-bold text-slate-500">
                                      <div className="w-1 h-1 bg-slate-300 rounded-full mr-2"></div>
                                      Kết quả: <span className="text-slate-800 ml-1">{ticket.result}</span>
                                      {ticket.actualCost > 0 && <span className="ml-auto text-primary-600">{ticket.actualCost.toLocaleString()}đ</span>}
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 italic text-xs font-medium">Không có lịch sử sửa chữa.</div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative pl-6 space-y-10 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100">
                    {asset.auditLogs?.map((log: any) => (
                      <div key={log.id} className="relative">
                        <div className={cn(
                          "absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-slate-50",
                          log.action === 'CREATE' ? 'bg-emerald-500' :
                          log.action === 'UPDATE' ? 'bg-amber-500' :
                          'bg-primary-500'
                        )} />
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')}</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug">
                            {log.performedBy} <span className="text-slate-400 font-medium">đã {
                              log.action === 'CREATE' ? 'khởi tạo' : 
                              log.action === 'UPDATE' ? 'cập nhật' :
                              log.action === 'ASSIGN' ? 'bàn giao' : log.action.toLowerCase()
                            }</span> tài sản
                          </p>
                          {log.details && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                               {(() => {
                                  try {
                                    const details = JSON.parse(log.details);
                                    if (!details) return null;
                                    const changes = details.changes || details;
                                    return (
                                      <>
                                        {Object.entries(changes).map(([field, val]: any) => (
                                          <div key={field} className="text-[11px] font-bold">
                                            <span className="text-slate-400 uppercase mr-2">{field}:</span>
                                            <span className="text-rose-500 line-through mr-2">{String(val.old)}</span>
                                            <ArrowRightLeft className="h-2 w-2 inline mx-1 text-slate-300" />
                                            <span className="text-emerald-600 ml-2">{String(val.new)}</span>
                                          </div>
                                        ))}
                                        {details.reason && (
                                          <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic">
                                            Lý do: {details.reason}
                                          </div>
                                        )}
                                      </>
                                    );
                                  } catch (e) {
                                    return <p className="text-[10px] text-slate-400 italic">Chi tiết: {log.details}</p>;
                                  }
                               })()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!asset.auditLogs?.length && (
                      <div className="text-center py-10 text-slate-400 italic text-xs font-medium">Chưa có nhật ký hoạt động.</div>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'documents' && (
                <AssetDocumentsTab 
                  asset={asset} 
                  onRefresh={fetchAssetDetail}
                  onSelectForm={(formCode, data) => setSelectedForm({ code: formCode, data })}
                />
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="px-8 py-8 border-t border-slate-100 bg-slate-50/50 flex space-x-3 items-center">
              {mode === 'edit' ? (
                <>
                  <button 
                    onClick={cancelEdit}
                    className="flex-1 bg-white border border-slate-200 text-slate-400 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all shadow-sm"
                  >
                    Hủy chỉnh sửa
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-[2] bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Lưu thay đổi</>}
                  </button>
                </>
              ) : activeTab === 'documents' ? (
                <>
                   <button 
                    onClick={onClose}
                    className="flex-1 bg-white border border-slate-200 text-slate-400 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all shadow-sm"
                  >
                    Đóng
                  </button>
                  <button 
                    onClick={() => document.getElementById('asset-file-upload')?.click()}
                    className="flex-1 bg-slate-100 text-slate-600 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center shadow-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Tải file lên
                  </button>
                  <div className="relative flex-[1.5]">
                    <button 
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className="w-full bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center"
                    >
                      <FilePlus className="mr-2 h-4 w-4" /> Tạo hồ sơ mới <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showMoreActions && "rotate-180")} />
                    </button>
                    
                    {showMoreActions && (
                      <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in zoom-in slide-in-from-bottom-4 duration-200">
                        <div className="p-2 space-y-1">
                          {[
                            { code: 'BM01', label: 'Biên bản bàn giao mới' },
                            { code: 'BM02', label: 'Biên bản bàn giao/thu hồi' },
                            { code: 'BM06', label: 'Biên bản điều chuyển' },
                            { code: 'BM09', label: 'Kiểm tra hiện trạng' },
                            { code: 'BM03', label: 'Biên bản tài sản hỏng' },
                            { code: 'BM10', label: 'Biên bản sửa chữa' },
                            { code: 'BM12', label: 'Biên bản kiểm kê' },
                            { code: 'BM04', label: 'Biên bản thanh lý' },
                            { code: 'BM13', label: 'Ghi nhận mất tài sản' },
                          ].map((form) => (
                            <button
                              key={form.code}
                              onClick={() => { 
                                 setSelectedForm({ code: form.code });
                                 setShowMoreActions(false); 
                              }}
                              className="w-full flex items-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary-600 rounded-2xl transition-all"
                            >
                              <FileText className="mr-3 h-4 w-4 text-slate-400" />
                              {form.code} - {form.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => onAction('handover', asset.id)}
                    className="flex-1 bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center"
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Bàn giao / Điều chuyển
                  </button>
                  <button 
                    onClick={() => onAction('inventory', asset.id)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4 text-emerald-500" /> Thực hiện kiểm kê
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className="bg-white border border-slate-200 text-slate-400 h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showMoreActions && "rotate-180")} />
                    </button>
                    
                    {showMoreActions && (
                      <div className="absolute bottom-full right-0 mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in zoom-in slide-in-from-bottom-4 duration-200">
                        <div className="p-2 space-y-1">
                          {[
                            { id: 'lost', label: 'Báo mất tài sản', icon: ShieldAlert, color: 'text-slate-900', onClick: () => setSelectedForm({ code: 'BM13' }) },
                            { id: 'liquidate', label: 'Thanh lý tài sản', icon: Trash2, color: 'text-rose-600', onClick: () => setSelectedForm({ code: 'BM04' }) },
                          ].map((act) => (
                            <button
                              key={act.id}
                              onClick={() => { 
                                 if (act.onClick) act.onClick();
                                 else onAction(act.id, asset.id); 
                                 setShowMoreActions(false); 
                              }}
                              className="w-full flex items-center px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all"
                            >
                              <act.icon className={cn("mr-3 h-4 w-4", act.color)} />
                              {act.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-slate-400 italic">Không tìm thấy tài sản.</div>
        )}
      </div>

      {/* REPAIR FORMS */}
      {isRepairFormOpen && (
        <RepairTicketForm 
          asset={asset}
          onClose={() => setIsRepairFormOpen(false)}
          onSuccess={() => { setIsRepairFormOpen(false); fetchAssetDetail(); }}
        />
      )}

      {isCompleteRepairOpen && selectedTicket && (
        <CompleteRepairForm 
          ticket={selectedTicket}
          onClose={() => setIsCompleteRepairOpen(false)}
          onSuccess={() => { setIsCompleteRepairOpen(false); setSelectedTicket(null); fetchAssetDetail(); }}
        />
      )}

      {/* REASON MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReasonModal(false)} />
           <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-3 text-rose-600 mb-6">
                 <AlertCircle className="h-6 w-6" />
                 <h4 className="text-lg font-black uppercase tracking-tight">Xác nhận thay đổi quan trọng</h4>
              </div>
              <p className="text-sm text-slate-600 font-medium mb-6">
                 Bạn đang thay đổi các thông tin quan trọng của tài sản (Mã, Giá, Ngày, Serial). Vui lòng nhập lý do cập nhật:
              </p>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ví dụ: Cập nhật đúng tên theo thực tế kiểm tra..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-medium text-slate-700 h-32 focus:ring-2 focus:ring-primary-500 mb-6"
              />
              <div className="flex space-x-3">
                 <button onClick={() => setShowReasonModal(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Hủy</button>
                 <button 
                   disabled={!reason.trim() || isSaving}
                   onClick={() => submitUpdates(pendingUpdates, reason)}
                   className="flex-[2] px-4 py-3 bg-primary-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all disabled:opacity-50"
                 >
                   Xác nhận lưu
                 </button>
              </div>
           </div>
        </div>
      )}
      <BMFormDispatcher 
        isOpen={!!selectedForm}
        formCode={selectedForm?.code || ''}
        data={{ asset, ...selectedForm?.data }}
        onClose={() => setSelectedForm(null)}
        onSubmit={async (data) => {
          console.log("Form submitted:", data);
          toast.success("Hồ sơ đã được lưu thành công");
          setSelectedForm(null);
          fetchAssetDetail();
          
          // Log audit
          await api.post('/operational/log-print', {
            assetIds: [asset.id],
            template: selectedForm?.code,
            copies: 1,
            config: { action: 'GENERATE_DOCUMENT' }
          });
        }}
      />
    </div>
  );
};
