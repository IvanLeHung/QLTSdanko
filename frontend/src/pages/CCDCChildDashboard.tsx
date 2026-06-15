import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

const cards = [
  ['total', 'Tổng mã con'],
  ['inUse', 'Đang sử dụng'],
  ['available', 'Trong kho'],
  ['transferring', 'Đang điều chuyển'],
  ['returned', 'Thu hồi chờ nhập kho'],
  ['damaged', 'Hỏng'],
  ['repairing', 'Đang sửa'],
  ['lost', 'Mất'],
  ['liquidated', 'Thanh lý']
];

export const CCDCChildDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ company: '', city: '', project: '', location: '', department: '', user: '', status: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, alertsRes] = await Promise.all([
        api.get('/ccdc-child/dashboard/summary', { params: filters }),
        api.get('/ccdc-child/alerts')
      ]);
      setSummary(summaryRes.data);
      setAlerts(alertsRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải dashboard mã con.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportReport = () => {
    const params = new URLSearchParams(filters as any).toString();
    window.open(`${api.defaults.baseURL}/ccdc-child/reports/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Dashboard CCDC mã con</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Theo dõi trạng thái, cảnh báo và sai lệch vận hành của từng đơn vị CCDC.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại</button>
          <button onClick={exportReport} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-black"><BarChart3 className="h-4 w-4" /> Xuất báo cáo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {Object.entries(filters).map(([key, value]) => (
          <input key={key} placeholder={key} value={value} onChange={e => setFilters({ ...filters, [key]: e.target.value })} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-white" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map(([key, label]) => (
          <div key={key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-2xl font-black text-slate-900 mt-2">{summary?.[key] || 0}</p>
          </div>
        ))}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Cảnh báo mở</p>
          <p className="text-2xl font-black text-amber-800 mt-2">{alerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartBlock title="Theo trạng thái" data={summary?.byStatus || {}} />
        <ChartBlock title="Theo phòng ban" data={summary?.byDepartment || {}} />
        <ChartBlock title="Theo vị trí" data={summary?.byLocation || {}} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-amber-500" /> Cảnh báo tự động</h2>
        <div className="space-y-2">
          {alerts.map(alert => (
            <button key={alert.id || `${alert.type}-${alert.childId}`} onClick={() => alert.childId && navigate(`/ccdc-child/${alert.childId}`)} className="w-full text-left border border-slate-100 rounded-xl p-3 hover:bg-slate-50">
              <p className="text-sm font-black text-slate-900">{alert.message}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{alert.alertType || alert.type} - {alert.child?.childCode || alert.childCode || 'Không gắn mã con'}</p>
            </button>
          ))}
          {alerts.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-8">Không có cảnh báo mở.</p>}
        </div>
      </div>
    </div>
  );
};

const ChartBlock: React.FC<{ title: string; data: Record<string, number> }> = ({ title, data }) => {
  const entries = Object.entries(data).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 8);
  const max = Math.max(...entries.map(([, value]) => Number(value)), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-3">{title}</h2>
      <div className="space-y-2">
        {entries.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between text-xs font-bold text-slate-500"><span>{label}</span><span>{value}</span></div>
            <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary-600" style={{ width: `${(Number(value) / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
};
