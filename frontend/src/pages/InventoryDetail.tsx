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

  // Single Item Check modal state
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);
  const [checkForm, setCheckForm] = useState({
    actualLocation: '',
    actualStatus: 'IN_STOCK',
    quality: 'GOOD',
    note: ''
  });

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

  const handleCheckItem = async () => {
    if (!selectedItemForCheck) return;
    setSubmitting(true);
    try {
      await api.post(`/inventory/item/${selectedItemForCheck.id}/check`, {
        actualStatus: checkForm.actualStatus,
        actualLocation: checkForm.actualLocation,
        quality: checkForm.quality,
        note: checkForm.note
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
    setCheckForm({
      actualLocation: item.actualLocation || item.expectedLocation || item.asset.locationName || '',
      actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
      quality: item.quality || 'GOOD',
      note: item.note || ''
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
    needReview: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'NEED_REVIEW').length || 0,
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
              {stats.wrongLocation + stats.missing + stats.damaged + stats.needReview}
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
            Cần xem xét: {stats.needReview}
          </span>
        </div>
      </div>

      {/* TOOLBAR & LIST */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
              placeholder="Tìm theo mã hoặc tên tài sản..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                         item.result === 'NEED_REVIEW' ? 'Cần xem xét' : item.result}
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
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Đối soát thực tế tài sản</h2>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
                {selectedItemForCheck.asset.assetName} ({selectedItemForCheck.assetCode})
              </p>
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
              <button 
                onClick={handleCheckItem}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Xác nhận lưu
              </button>
            </>
          }
        >
          <div className="space-y-5 text-xs text-slate-650">
            {/* Asset Book Details Card */}
            <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trạng thái sổ sách</p>
                <p className="font-bold text-slate-800 uppercase">
                  {selectedItemForCheck.expectedStatus === 'IN_STOCK' ? 'Trong kho (IN_STOCK)' :
                   selectedItemForCheck.expectedStatus === 'ASSIGNED' ? 'Đang sử dụng (ASSIGNED)' : selectedItemForCheck.expectedStatus}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vị trí sổ sách</p>
                <p className="font-bold text-slate-800">{selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || 'Trong kho'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trạng thái thực tế */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Trạng thái thực tế *</label>
                  <select 
                    value={checkForm.actualStatus}
                    onChange={e => setCheckForm({...checkForm, actualStatus: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
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
                    value={checkForm.quality}
                    onChange={e => setCheckForm({...checkForm, quality: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                  >
                    <option value="GOOD">Tốt (GOOD)</option>
                    <option value="DAMAGED">Hỏng / lỗi (DAMAGED)</option>
                    <option value="LOST">Mất (LOST)</option>
                  </select>
                </div>
              </div>

              {/* Vị trí thực tế */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Vị trí thực tế *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                  placeholder="Vị trí thực tế..."
                  value={checkForm.actualLocation}
                  onChange={e => setCheckForm({...checkForm, actualLocation: e.target.value})}
                />
              </div>

              {/* Ghi chú đối soát */}
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú đối soát</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-850 h-20 resize-none text-xs"
                  placeholder="Nhập ghi chú chi tiết kết quả đối soát..."
                  value={checkForm.note}
                  onChange={e => setCheckForm({...checkForm, note: e.target.value})}
                />
              </div>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};
