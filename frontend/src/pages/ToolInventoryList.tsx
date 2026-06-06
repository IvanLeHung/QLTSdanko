import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar, 
  Tag, 
  ChevronRight, 
  Loader2, 
  Search,
  Filter,
  Package,
  CheckCircle2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export const ToolInventoryList: React.FC = () => {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    inventoryName: '',
    scopeType: 'ALL',
    scopeValue: '',
    note: ''
  });

  const fetchChecks = async () => {
    try {
      const res = await api.get('/tools/inventory/list');
      setChecks(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách kiểm kê CCDC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.inventoryName.trim()) {
      return toast.error("Vui lòng nhập tên đợt kiểm kê");
    }
    setSubmitting(true);
    try {
      const payload = {
        inventoryName: formData.inventoryName,
        scopeType: formData.scopeType,
        scopeValue: formData.scopeType !== 'ALL' ? formData.scopeValue : undefined,
        note: formData.note
      };
      const res = await api.post('/tools/inventory', payload);
      toast.success("Đã tạo đợt kiểm kê CCDC mới");
      setShowCreateModal(false);
      navigate(`/tools/inventory/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo đợt kiểm kê CCDC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-[36px] font-[900] text-[#0F172A] tracking-tighter leading-none mb-2">Kiểm kê Công cụ dụng cụ</h1>
          <p className="text-slate-500 font-medium text-base">Quản lý và thực hiện các đợt kiểm kê CCDC theo số lượng và vị trí thực tế.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/tools')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-4 rounded-xl font-bold text-sm transition-all"
          >
            Quay lại CCDC
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-600 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all flex items-center shadow-lg shadow-orange-100"
          >
            <Plus className="mr-2 h-5 w-5" /> Tạo đợt kiểm kê CCDC
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4"><ClipboardCheck className="h-5 w-5" /></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng số đợt</p>
          <p className="text-2xl font-black text-slate-900">{checks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><CheckCircle2 className="h-5 w-5" /></div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đang mở</p>
          <p className="text-2xl font-black text-emerald-600">{checks.filter(c => c.status === 'OPEN').length}</p>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-[12px] font-[900] text-slate-800 uppercase tracking-widest">Danh sách đợt kiểm kê CCDC</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 text-orange-600 animate-spin" /></div>
          ) : checks.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-55 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                <Package className="h-8 w-8" />
              </div>
              <p className="text-slate-400 font-bold">Chưa có đợt kiểm kê CCDC nào được tạo</p>
            </div>
          ) : checks.map(check => (
            <div 
              key={check.id} 
              className="p-6 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
              onClick={() => navigate(`/tools/inventory/${check.id}`)}
            >
              <div className="flex items-center space-x-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  check.status === 'OPEN' ? 'bg-orange-50 text-orange-650' : 'bg-slate-100 text-slate-400'
                }`}>
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-[850] text-slate-800 group-hover:text-orange-600 transition-colors">{check.inventoryName}</h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{check.inventoryCode}</span>
                    <div className="flex items-center text-xs font-bold text-slate-400">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {format(new Date(check.inventoryDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-400">
                      <Tag className="h-3.5 w-3.5 mr-1.5" />
                      Phạm vi: {check.scopeType === 'ALL' ? 'Toàn công ty' : check.scopeType === 'DEPARTMENT' ? 'Bộ phận' : 'Vị trí'} {check.scopeValue ? `(${check.scopeValue})` : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mục kiểm kê</p>
                  <p className="text-sm font-black text-slate-700">{check._count?.items || 0} dòng CCDC</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                  check.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  check.status === 'COMPLETED' ? 'bg-purple-50 text-purple-650 border-purple-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {check.status === 'OPEN' ? 'Đang mở' :
                   check.status === 'COMPLETED' ? 'Đã hoàn tất' :
                   check.status === 'CANCELLED' ? 'Đã hủy' : check.status}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-650 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white"><Plus className="h-5 w-5" /></div>
                <h3 className="text-lg font-[900] text-slate-800 tracking-tight">Tạo đợt kiểm kê CCDC</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đợt kiểm kê *</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-slate-800"
                  placeholder="Ví dụ: Kiểm kê Decor - Sự kiện Quý 2 - 2026"
                  value={formData.inventoryName}
                  onChange={(e) => setFormData({...formData, inventoryName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phạm vi kiểm kê *</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-slate-800 appearance-none h-[42px]"
                    value={formData.scopeType}
                    onChange={(e) => setFormData({...formData, scopeType: e.target.value})}
                  >
                    <option value="ALL">Toàn bộ CCDC</option>
                    <option value="DEPARTMENT">Theo Bộ phận (Ban HCNS, vv.)</option>
                    <option value="LOCATION">Theo Vị trí (Kho, Văn phòng, vv.)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá trị phạm vi</label>
                  <input 
                    disabled={formData.scopeType === 'ALL'}
                    required={formData.scopeType !== 'ALL'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-slate-800 disabled:opacity-50"
                    placeholder={formData.scopeType === 'ALL' ? "Tất cả" : formData.scopeType === 'DEPARTMENT' ? "Ví dụ: Ban Hành chính Nhân sự" : "Ví dụ: Kho Decor"}
                    value={formData.scopeValue}
                    onChange={(e) => setFormData({...formData, scopeValue: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all h-20 resize-none text-slate-800"
                  placeholder="Nhập ghi chú thêm cho đợt kiểm kê này..."
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Tạo đợt kiểm kê"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
