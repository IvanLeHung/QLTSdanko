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
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const InventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CHECKED

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

  const handleCheckItem = async (itemId: number, actualStatus: string, quality: string) => {
    try {
      await api.post(`/inventory/item/${itemId}/check`, {
        actualStatus,
        quality,
        note: ''
      });
      toast.success("Đã ghi nhận kiểm kê");
      fetchDetail(); // Refresh list
    } catch (err) {
      toast.error("Lỗi khi ghi nhận kiểm kê");
    }
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
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button onClick={() => navigate('/inventory')} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors">
            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-[32px] font-[900] text-[#0F172A] tracking-tighter leading-none">{session.inventoryName}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                session.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {session.status}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-sm">{session.inventoryCode} • Ngày bắt đầu: {format(new Date(session.inventoryDate), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        {session.status === 'OPEN' && (
          <button 
            onClick={handleCloseSession}
            disabled={submitting}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />} Chốt đợt kiểm kê
          </button>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tài sản</p>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ClipboardList className="h-6 w-6" /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đã kiểm kê</p>
            <p className="text-3xl font-black text-emerald-600">{stats.checked}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Đang chờ</p>
            <p className="text-3xl font-black text-amber-600">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-400"><AlertCircle className="h-6 w-6" /></div>
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
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kết quả</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
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
                      <span className="text-sm font-bold text-slate-600">{item.asset.locationName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    {item.checkStatus === 'CHECKED' ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-700">{item.actualStatus}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Bởi: {item.checkedBy}</p>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        {session.status === 'OPEN' ? (
                          <>
                            <button 
                              onClick={() => handleCheckItem(item.id, 'CÒN TỐT', 'GOOD')}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all"
                            >
                              Còn tốt
                            </button>
                            <button 
                              onClick={() => handleCheckItem(item.id, 'HƯ HỎNG', 'DAMAGED')}
                              className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-500 hover:text-white transition-all"
                            >
                              Hư hỏng
                            </button>
                            <button 
                              onClick={() => handleCheckItem(item.id, 'MẤT', 'LOST')}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"
                            >
                              Mất
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Phiên đã đóng</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.checkStatus === 'CHECKED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {item.checkStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <XCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Không tìm thấy tài sản nào phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
