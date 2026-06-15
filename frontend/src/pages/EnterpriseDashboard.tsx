import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

export const EnterpriseDashboard: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/snapshots');
      setSnapshots(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải dashboard tập đoàn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const aggregate = async () => {
    await api.post('/analytics/aggregate');
    toast.success('Đã tổng hợp snapshot hôm nay.');
    await load();
  };

  const latest = snapshots[0] || {};
  const trend = useMemo(() => [...snapshots].reverse(), [snapshots]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Enterprise Asset Dashboard</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Dashboard lãnh đạo đọc từ snapshot, không query trực tiếp transaction lớn.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại</button>
          <button onClick={aggregate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-black"><BarChart3 className="h-4 w-4" /> Aggregate hôm nay</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Tổng tài sản" value={latest.assetCount || 0} />
        <Card label="Tổng giá trị" value={`${Math.round(latest.assetValue || 0).toLocaleString()} VND`} />
        <Card label="Đang hoạt động" value={latest.activeCount || 0} />
        <Card label="Thất thoát" value={latest.lostCount || 0} />
        <Card label="Chi phí sửa chữa" value={`${Math.round(latest.repairCost || 0).toLocaleString()} VND`} />
        <Card label="Inventory compliance" value={`${Math.round(latest.inventoryRate || 0)}%`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4"><Building2 className="h-4 w-4 text-primary-600" /> Asset Value Trend</h2>
        <div className="space-y-2">
          {trend.map(row => {
            const max = Math.max(...trend.map(item => Number(item.assetValue || 0)), 1);
            return (
              <div key={row.id}>
                <div className="flex justify-between text-xs font-bold text-slate-500"><span>{new Date(row.date).toLocaleDateString('vi-VN')}</span><span>{Math.round(row.assetValue || 0).toLocaleString()}</span></div>
                <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary-600" style={{ width: `${(Number(row.assetValue || 0) / max) * 100}%` }} /></div>
              </div>
            );
          })}
          {trend.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-8">Chưa có snapshot. Bấm Aggregate hôm nay để tạo dữ liệu đầu tiên.</p>}
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="text-xl font-black text-slate-900 mt-2">{value}</p>
  </div>
);
