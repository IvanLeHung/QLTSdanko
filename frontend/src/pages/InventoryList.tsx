import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { DateRangeModal } from '../components/DateRangeModal';
import { 
  ClipboardCheck, 
  Plus, 
  Download,
  Calendar, 
  Tag, 
  ChevronRight, 
  Loader2, 
  Search,
  Filter,
  Package,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const InventoryList: React.FC = () => {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    inventoryName: '',
    inventoryDate: new Date().toISOString().split('T')[0],
    scopeType: 'ALL',
    scopeValue: ''
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportInventory = async (startDate: string, endDate: string) => {
    try {
      const response = await api.get('/inventory/export-by-time', {
        params: { startDate, endDate },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao_cao_kiem_ke_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Tải báo cáo kiểm kê tài sản thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải báo cáo kiểm kê tài sản");
    }
  };

  const fetchChecks = async () => {
    try {
      const res = await api.get('/inventory');
      setChecks(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách kiểm kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/inventory', formData);
      toast.success("Đã tạo đợt kiểm kê mới");
      setShowCreateModal(false);
      navigate(`/inventory/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-[40px] font-[900] text-[#0F172A] tracking-tighter leading-none mb-2">Kiểm kê tài sản</h1>
          <p className="text-slate-500 font-medium text-lg">Quản lý và theo dõi các đợt đối soát tài sản thực tế.</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-5 rounded-[2rem] font-[800] text-sm uppercase tracking-widest transition-all flex items-center"
          >
            <Download className="mr-2 h-6 w-6" /> Tải báo cáo
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-8 py-5 rounded-[2rem] font-[800] text-sm uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center shadow-2xl shadow-primary-200"
          >
            <Plus className="mr-2 h-6 w-6" /> Tạo đợt kiểm kê mới
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-4"><ClipboardCheck className="h-5 w-5" /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng số đợt</p>
          <p className="text-2xl font-black text-slate-900">{checks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><CheckCircle2 className="h-5 w-5" /></div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đang thực hiện</p>
          <p className="text-2xl font-black text-emerald-600">{checks.filter(c => c.status === 'OPEN').length}</p>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[14px] font-[900] text-slate-800 uppercase tracking-widest">Danh sách các đợt kiểm kê</h3>
          <div className="flex items-center space-x-2 text-slate-400">
             <Search className="h-5 w-5" />
             <Filter className="h-5 w-5" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 text-primary-600 animate-spin" /></div>
          ) : checks.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
                <Package className="h-10 w-10" />
              </div>
              <p className="text-slate-400 font-bold">Chưa có đợt kiểm kê nào được tạo</p>
            </div>
          ) : checks.map(check => (
            <div 
              key={check.id} 
              className="p-8 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
              onClick={() => navigate(`/inventory/${check.id}`)}
            >
              <div className="flex items-center space-x-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  check.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-[800] text-slate-800 group-hover:text-primary-600 transition-colors">{check.inventoryName}</h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{check.inventoryCode}</span>
                    <div className="flex items-center text-xs font-bold text-slate-400">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {format(new Date(check.inventoryDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-400">
                      <Tag className="h-3.5 w-3.5 mr-1.5" />
                      Phạm vi: {check.scopeType} {check.scopeValue ? `(${check.scopeValue})` : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Tiến độ</p>
                  <p className="text-sm font-black text-slate-700">{check._count?.items || 0} tài sản</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  check.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {check.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                </div>
                <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200"><Plus className="h-6 w-6" /></div>
                <h3 className="text-xl font-[900] text-slate-800 tracking-tight">Tạo đợt kiểm kê mới</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đợt kiểm kê *</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
                  placeholder="Ví dụ: Kiểm kê định kỳ Quý 2 - 2024"
                  value={formData.inventoryName}
                  onChange={(e) => setFormData({...formData, inventoryName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày bắt đầu</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
                    value={formData.inventoryDate}
                    onChange={(e) => setFormData({...formData, inventoryDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phạm vi</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all appearance-none"
                    value={formData.scopeType}
                    onChange={(e) => setFormData({...formData, scopeType: e.target.value})}
                  >
                    <option value="ALL">Toàn công ty</option>
                    <option value="COMPANY">Theo Công ty thành viên</option>
                    <option value="DEPARTMENT">Theo Phòng ban</option>
                  </select>
                </div>
              </div>

              {formData.scopeType !== 'ALL' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá trị phạm vi</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
                    placeholder={formData.scopeType === 'COMPANY' ? "Mã công ty (Vd: DKO)" : "Tên phòng ban..."}
                    value={formData.scopeValue}
                    onChange={(e) => setFormData({...formData, scopeValue: e.target.value})}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Bắt đầu kiểm kê ngay"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      <DateRangeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportInventory}
        title="Tải báo cáo kiểm kê tài sản"
      />
    </div>
  );
};
