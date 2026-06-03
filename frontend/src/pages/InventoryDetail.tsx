import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Loader2,
  Package,
  User,
  MapPin,
  ClipboardList,
  Save,
  Lock,
  Play,
  Ban,
  Calendar,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { BaseModal } from '../components/BaseModal';

export const InventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CHECKED

  // QR Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');

  // Single Item Check modal state
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);
  const [checkForm, setCheckForm] = useState<any>({
    actualLocation: '',
    actualStatus: 'IN_STOCK',
    quality: 'GOOD',
    note: '',
    photos: [] as string[],
    checkCondition: 'FOUND' // FOUND, MISSING, UNAVAILABLE
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/inventory/${id}`);
      setSession(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin đợt kiểm kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleStartSession = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/start`);
      toast.success("Đã bắt đầu đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi bắt đầu đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đợt kiểm kê này? Thao tác này không thể hoàn tác.")) return;
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/cancel`);
      toast.success("Đã hủy đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi hủy đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await api.post('/inventory/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCheckForm((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), res.data.url]
      }));
      toast.success("Tải ảnh bằng chứng thành công");
    } catch (err) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index: number) => {
    setCheckForm((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanCodeInput.trim()) return;

    const matchedItem = session?.items.find((item: any) => 
      item.assetCode.toLowerCase() === scanCodeInput.trim().toLowerCase()
    );

    if (matchedItem) {
      toast.success(`Đã tìm thấy tài sản: ${matchedItem.asset.assetName}`);
      setIsScannerOpen(false);
      setScanCodeInput('');
      openCheckModal(matchedItem);
    } else {
      toast.error(`Không tìm thấy tài sản với mã "${scanCodeInput}" trong đợt kiểm kê này`);
    }
  };

  const handleCheckItem = async () => {
    if (!selectedItemForCheck) return;
    setSubmitting(true);
    
    // Map final fields based on checkCondition
    let finalStatus = checkForm.actualStatus;
    let finalLocation = checkForm.actualLocation;
    let finalQuality = checkForm.quality;
    
    if (checkForm.checkCondition === 'MISSING') {
      finalStatus = 'LOST';
      finalQuality = 'LOST';
      finalLocation = selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || '';
    }

    try {
      await api.post(`/inventory/item/${selectedItemForCheck.id}/check`, {
        actualStatus: finalStatus,
        actualLocation: finalLocation,
        quality: finalQuality,
        note: checkForm.note,
        photos: checkForm.photos
      });
      toast.success("Đã ghi nhận kiểm kê tài sản");
      setSelectedItemForCheck(null);
      fetchDetail(); // Refresh list
    } catch (err) {
      toast.error("Lỗi khi ghi nhận kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckModal = (item: any) => {
    setSelectedItemForCheck(item);
    const initialCondition = (item.actualStatus === 'LOST' || item.quality === 'LOST') ? 'MISSING' : 'FOUND';
    setCheckForm({
      actualLocation: item.actualLocation || item.expectedLocation || item.asset.locationName || '',
      actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
      quality: item.quality || 'GOOD',
      note: item.note || '',
      photos: item.photos || [],
      checkCondition: initialCondition
    });
  };

  const handleCloseSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn chốt đợt kiểm kê này? Dữ liệu sẽ không thể chỉnh sửa sau khi chốt.")) return;
    
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/close`);
      toast.success("Đã chốt đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi chốt đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu kiểm kê...</p>
      </div>
    );
  }

  const filteredItems = session?.items.filter((item: any) => {
    const matchesSearch = item.assetCode.toLowerCase().includes(search.toLowerCase()) || 
                          item.asset.assetName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || (filter === 'PENDING' && item.checkStatus === 'PENDING') || (filter === 'CHECKED' && item.checkStatus === 'CHECKED');
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: session?.items.length || 0,
    checked: session?.items.filter((i: any) => i.checkStatus === 'CHECKED').length || 0,
    pending: session?.items.filter((i: any) => i.checkStatus === 'PENDING').length || 0,
    matched: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MATCHED').length || 0,
    wrongLocation: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_LOCATION').length || 0,
    missing: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MISSING').length || 0,
    damaged: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'DAMAGED').length || 0,
    wrongStatus: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_STATUS').length || 0,
  };

  const checkers = Array.from(new Set(session?.items.map((i: any) => i.checkedBy).filter(Boolean))) as string[];
  const lastUpdatedAt = session?.items
    .map((i: any) => i.checkedAt)
    .filter(Boolean)
    .reduce((max: Date | null, current: string) => {
      const curDate = new Date(current);
      if (!max || curDate > max) return curDate;
      return max;
    }, null) as Date | null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-4 flex-1">
          <button onClick={() => navigate('/inventory')} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors">
            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-[900] text-[#0F172A] tracking-tighter leading-none">{session.inventoryName}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                session.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                session.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-250' :
                session.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-250' :
                session.status === 'COMPLETED' ? 'bg-purple-50 text-purple-600 border-purple-250' :
                'bg-rose-50 text-rose-600 border-rose-250'
              }`}>
                {session.status === 'DRAFT' ? 'Nháp' :
                 session.status === 'OPEN' ? 'Đang mở' :
                 session.status === 'IN_PROGRESS' ? 'Đang kiểm kê' :
                 session.status === 'COMPLETED' ? 'Đã hoàn thành' :
                 session.status === 'CANCELLED' ? 'Đã hủy' : session.status}
              </span>
            </div>
            
            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Bắt đầu: <span className="text-slate-800">{session.inventoryDate ? format(new Date(session.inventoryDate), 'dd/MM/yyyy') : 'N/A'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Dự kiến xong: <span className="text-slate-800">{session.expectedFinishDate ? format(new Date(session.expectedFinishDate), 'dd/MM/yyyy') : 'Không giới hạn'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span>Người phụ trách: <span className="text-slate-800">{session.responsiblePerson || 'Chưa phân công'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <span>Phạm vi: <span className="text-slate-800">{session.scopeType === 'ALL' ? 'Toàn công ty' : session.scopeType === 'COMPANY' ? `Công ty: ${session.scopeValue}` : `Phòng ban: ${session.scopeValue}`}</span></span>
              </div>
            </div>

            {session.note && (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                <strong>Ghi chú:</strong> {session.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 self-end">
          {session.status === 'DRAFT' && (
            <button 
              onClick={handleStartSession}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Bắt đầu kiểm kê
            </button>
          )}

          {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
            <button 
              onClick={handleCloseSession}
              disabled={submitting}
              className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />} Chốt đợt kiểm kê
            </button>
          )}

          {(session.status === 'DRAFT' || session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
            <button 
              onClick={handleCancelSession}
              disabled={submitting}
              className="bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />} Hủy đợt kiểm kê
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tài sản cần kiểm</p>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">{stats.checked} đã kiểm • {stats.pending} đang chờ</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ClipboardList className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tiến độ hoàn thành</p>
            <p className="text-3xl font-black text-emerald-600">{Math.round((stats.checked / stats.total) * 100) || 0}%</p>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-2">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((stats.checked / stats.total) * 100) || 0}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-450 uppercase tracking-widest mb-1">Tổng số chênh lệch</p>
            <p className="text-3xl font-black text-rose-600">
              {stats.wrongLocation + stats.missing + stats.damaged + stats.wrongStatus}
            </p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">Khớp sổ sách: {stats.matched}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-550"><AlertCircle className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thông tin cập nhật</p>
            <p className="text-sm font-black text-slate-800 leading-tight">
              {lastUpdatedAt ? format(lastUpdatedAt, 'HH:mm dd/MM/yyyy') : 'Chưa có cập nhật'}
            </p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">
              {checkers.length > 0 ? `${checkers.length} người kiểm kê` : 'Không có người kiểm'}
            </p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><User className="h-6 w-6" /></div>
        </div>
      </div>

      {/* DISCREPANCY BREAKDOWN BANNER */}
      <div className="bg-slate-550/5 p-4 rounded-2xl border border-slate-150 flex flex-wrap items-center justify-between gap-4 font-bold text-xs text-slate-650">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chi tiết đối soát:</span>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
            Khớp: {stats.matched}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
            Lệch vị trí: {stats.wrongLocation}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-rose-700">
            Thiếu (Báo mất): {stats.missing}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 rounded-lg text-red-750">
            Báo hỏng: {stats.damaged}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
            Lệch trạng thái: {stats.wrongStatus}
          </span>
        </div>
      </div>

      {/* TOOLBAR & LIST */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-1 max-w-lg gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
                placeholder="Tìm theo mã hoặc tên tài sản..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
              <button 
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="bg-primary-50 hover:bg-primary-100 text-primary-650 px-5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center shrink-0 border border-primary-200/50"
              >
                📷 Quét mã tài sản
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-slate-400 mr-2" />
            {['ALL', 'PENDING', 'CHECKED'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Chưa kiểm' : 'Đã kiểm'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tài sản</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Người sử dụng / Bộ phận</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí sổ sách</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí thực tế</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kết quả đối soát</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{item.asset.assetName}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{item.assetCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center space-x-2">
                      <User className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-sm font-bold text-slate-600">{item.asset.currentUserName || 'N/A'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium ml-5 mt-0.5">{item.asset.departmentName || 'Không có bộ phận'}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-sm font-bold text-slate-600">{item.expectedLocation || item.asset.locationName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-sm font-bold text-slate-600">
                        {item.checkStatus === 'CHECKED' ? (
                          item.actualLocation || 'N/A'
                        ) : (
                          <span className="text-slate-350 font-medium italic">Chưa đối soát</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    {item.checkStatus === 'PENDING' ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200/50">
                        Chưa kiểm
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        item.result === 'MATCHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        item.result === 'WRONG_LOCATION' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        item.result === 'MISSING' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        item.result === 'DAMAGED' ? 'bg-red-50 text-red-650 border-red-100' :
                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {item.result === 'MATCHED' ? 'Khớp' :
                         item.result === 'WRONG_LOCATION' ? 'Lệch vị trí' :
                         item.result === 'MISSING' ? 'Thiếu/Mất' :
                         item.result === 'DAMAGED' ? 'Báo hỏng' :
                         item.result === 'WRONG_STATUS' ? 'Lệch trạng thái' : item.result}
                      </span>
                    )}
                  </td>
                  <td className="p-6">
                    {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') ? (
                      item.checkStatus === 'PENDING' ? (
                        <button 
                          onClick={() => openCheckModal(item)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all shadow-md shadow-primary-100"
                        >
                          Kiểm kê
                        </button>
                      ) : (
                        <button 
                          onClick={() => openCheckModal(item)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Kiểm lại
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 italic">Đã khóa</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <XCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Không tìm thấy tài sản nào phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECK ITEM MODAL */}
      {selectedItemForCheck && (
        <BaseModal
          isOpen={!!selectedItemForCheck}
          onClose={() => setSelectedItemForCheck(null)}
          size="form"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Phiếu kiểm kê thực tế tài sản</h2>
              <div className="mt-1 text-xs text-slate-500 font-bold space-y-0.5">
                <p>Mã TS: <span className="text-slate-800 font-mono">{selectedItemForCheck.assetCode}</span></p>
                <p>Tên TS: <span className="text-slate-800">{selectedItemForCheck.asset.assetName}</span></p>
                <p>Đợt kiểm kê: <span className="text-primary-600 uppercase font-extrabold">{session.inventoryName}</span></p>
              </div>
            </div>
          }
          footer={
            <>
              <button 
                onClick={() => setSelectedItemForCheck(null)} 
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              {checkForm.checkCondition === 'MISSING' ? (
                <button 
                  onClick={handleCheckItem}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-rose-100 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />} Báo thiếu tài sản
                </button>
              ) : (
                <button 
                  onClick={handleCheckItem}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Lưu kết quả
                </button>
              )}
            </>
          }
        >
          <div className="space-y-6 text-xs text-slate-650">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT TRÁI - THÔNG TIN HỆ THỐNG */}
              <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">Thông tin hệ thống</h4>
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-500">Trạng thái sổ sách:</label>
                    <p className="font-extrabold text-slate-800 uppercase mt-0.5">
                      {selectedItemForCheck.expectedStatus === 'IN_STOCK' ? 'Trong kho (IN_STOCK)' :
                       selectedItemForCheck.expectedStatus === 'ASSIGNED' ? 'Đang sử dụng (ASSIGNED)' :
                       selectedItemForCheck.expectedStatus === 'UNDER_REPAIR' ? 'Đang sửa chữa' :
                       selectedItemForCheck.expectedStatus === 'DAMAGED' ? 'Báo hỏng' :
                       selectedItemForCheck.expectedStatus === 'LOST' ? 'Báo mất' : selectedItemForCheck.expectedStatus}
                    </p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Vị trí sổ sách:</label>
                    <p className="font-extrabold text-slate-800 mt-0.5">{selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || 'Trong kho'}</p>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI - KẾT QUẢ THỰC TẾ */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-600 border-b pb-2">Kết quả thực tế</h4>
                
                {/* Tình trạng kiểm kê */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tình trạng kiểm kê *</label>
                  <select 
                    value={checkForm.checkCondition}
                    onChange={e => {
                      const cond = e.target.value;
                      if (cond === 'MISSING') {
                        setCheckForm({
                          ...checkForm,
                          checkCondition: cond,
                          actualStatus: 'LOST',
                          quality: 'LOST',
                          actualLocation: selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || 'Trong kho'
                        });
                      } else {
                        setCheckForm({
                          ...checkForm,
                          checkCondition: cond,
                          actualStatus: selectedItemForCheck.actualStatus || selectedItemForCheck.expectedStatus || 'IN_STOCK',
                          quality: selectedItemForCheck.quality || 'GOOD'
                        });
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                  >
                    <option value="FOUND">Đã tìm thấy (FOUND)</option>
                    <option value="MISSING">Không tìm thấy (MISSING)</option>
                    <option value="UNAVAILABLE">Không truy cập được (UNAVAILABLE)</option>
                  </select>
                </div>

                {/* Trạng thái thực tế */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Trạng thái thực tế *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.actualStatus}
                    onChange={e => setCheckForm({...checkForm, actualStatus: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                  >
                    <option value="IN_STOCK">Trong kho (IN_STOCK)</option>
                    <option value="ASSIGNED">Đang sử dụng (ASSIGNED)</option>
                    <option value="UNDER_REPAIR">Đang sửa chữa (UNDER_REPAIR)</option>
                    <option value="DAMAGED">Báo hỏng (DAMAGED)</option>
                    <option value="LOST">Báo mất (LOST)</option>
                  </select>
                </div>

                {/* Chất lượng vật lý */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tình trạng vật lý *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.quality}
                    onChange={e => setCheckForm({...checkForm, quality: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                  >
                    <option value="GOOD">Tốt (GOOD)</option>
                    <option value="NORMAL">Bình thường (NORMAL)</option>
                    <option value="BAD">Kém / hao mòn (BAD)</option>
                    <option value="DAMAGED">Hỏng / lỗi (DAMAGED)</option>
                    <option value="LOST">Mất (LOST)</option>
                  </select>
                </div>

                {/* Vị trí thực tế */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Vị trí thực tế *</label>
                  <input 
                    type="text"
                    disabled={checkForm.checkCondition === 'MISSING'}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                    placeholder="Vị trí thực tế..."
                    value={checkForm.actualLocation}
                    onChange={e => setCheckForm({...checkForm, actualLocation: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Ảnh bằng chứng upload */}
            <div className="space-y-2 border-t pt-4 border-slate-100">
              <label className="font-bold text-slate-500 block">Ảnh bằng chứng kiểm kê (Ảnh tem, tình trạng hỏng, vị trí...):</label>
              
              <div className="flex flex-wrap gap-3 items-center">
                {/* Thumbnails list */}
                {(checkForm.photos || []).map((url: string, index: number) => (
                  <div key={url} className="relative w-16 h-16 border rounded-xl overflow-hidden group">
                    <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removePhoto(index)}
                      className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                
                {/* Uploader button */}
                <label className="w-16 h-16 border border-dashed border-slate-300 hover:border-primary-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 transition-all cursor-pointer bg-slate-50">
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*"
                  />
                  {uploadingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-black text-center uppercase tracking-tighter">Thêm ảnh</span>
                  )}
                </label>
              </div>
            </div>

            {/* Ghi chú đối soát */}
            <div className="space-y-1 border-t pt-4 border-slate-100">
              <label className="font-bold text-slate-500">Ghi chú đối soát thực tế</label>
              <textarea 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 h-16 resize-none text-xs"
                placeholder="Nhập ghi chú chi tiết về tình trạng thực tế..."
                value={checkForm.note}
                onChange={e => setCheckForm({...checkForm, note: e.target.value})}
              />
            </div>
          </div>
        </BaseModal>
      )}

      {/* SCANNER MODAL */}
      {isScannerOpen && (
        <BaseModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScanCodeInput('');
          }}
          size="confirm"
          title={
            <div>
              <h2 className="text-md font-black uppercase tracking-widest text-slate-900">Quét mã tài sản (QR/Barcode)</h2>
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Giả lập súng quét barcode: súng tự nhấn Enter sau khi quét</p>
            </div>
          }
          footer={
            <button 
              onClick={() => {
                setIsScannerOpen(false);
                setScanCodeInput('');
              }} 
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs"
            >
              Đóng
            </button>
          }
        >
          <div className="space-y-5 text-center py-2">
            <div className="w-40 h-40 mx-auto border-4 border-dashed border-primary-500 rounded-3xl flex flex-col items-center justify-center bg-primary-50/20 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-500 animate-bounce" />
              <Package className="h-12 w-12 text-primary-400" />
              <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest mt-2 animate-pulse">Đang quét...</p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <label className="text-xs font-bold text-slate-500 block">Nhập tay mã tài sản hoặc quét qua cổng súng quét:</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  autoFocus
                  required
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-800 text-center"
                  placeholder="Ví dụ: 01.03.01.02.04.002"
                  value={scanCodeInput}
                  onChange={e => setScanCodeInput(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Tìm
                </button>
              </div>
            </form>
          </div>
        </BaseModal>
      )}
    </div>
  );
};
