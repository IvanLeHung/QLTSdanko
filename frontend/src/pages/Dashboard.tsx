import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  Package, 
  UserCheck, 
  AlertCircle, 
  Activity,
  ClipboardCheck, 
  TrendingUp,
  DollarSign,
  ChevronRight,
  Plus,
  LayoutDashboard,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu tổng quan...</p>
    </div>
  );

  const stats = [
    { name: 'Tổng tài sản', value: summary.totalAssets, icon: Package, color: 'text-primary-600', bg: 'bg-primary-50' },
    { name: 'Đang sử dụng', value: summary.assigned, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Báo hỏng', value: summary.damaged + summary.underRepair, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Mất / Thất thoát', value: summary.lost, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary-600 rounded-xl text-white">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className="text-[36px] font-[900] text-[#0F172A] tracking-tighter leading-none">Hệ thống QLTS</h1>
          </div>
          <p className="text-slate-500 font-medium text-lg">Phần mềm quản lý vận hành tài sản tập trung.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/assets/new')} className="bg-primary-600 text-white h-14 px-8 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary-700 transition-all flex items-center shadow-2xl shadow-primary-200">
            <Plus className="mr-2 h-5 w-5" /> Cấp mới tài sản
          </button>
        </div>
      </div>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 group hover:border-primary-200 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value?.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: FINANCIALS & DISTRIBUTION */}
        <div className="lg:col-span-2 space-y-8">
          {/* FINANCIAL OVERVIEW */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5"><DollarSign className="h-64 w-64" /></div>
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Giá trị sổ sách</h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">Tổng nguyên giá</span>
              </div>
              <div>
                <p className="text-5xl font-black tracking-tighter mb-2">{summary.totalValue?.toLocaleString()} <span className="text-2xl text-slate-500 font-medium">VNĐ</span></p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-emerald-400 text-sm font-bold">
                    <TrendingUp className="h-4 w-4 mr-1" /> Vận hành ổn định
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Đã thanh lý</p>
                  <p className="text-lg font-bold">{summary.liquidated} tài sản</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Đang sửa chữa</p>
                  <p className="text-lg font-bold">{summary.underRepair} tài sản</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mất/Thất thoát</p>
                  <p className="text-lg font-bold text-rose-400">{summary.lost} tài sản</p>
                </div>
              </div>
            </div>
          </div>

          {/* DISTRIBUTION */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-[800] text-slate-800 flex items-center tracking-tight">
                <Activity className="mr-3 h-6 w-6 text-primary-600" />
                Phân bổ tài sản
              </h3>
              <button className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary-600 transition-colors">Xem chi tiết</button>
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'Khối Văn phòng', count: Math.round(summary.assigned * 0.4), color: 'bg-primary-500' },
                { name: 'Khối Dự án', count: Math.round(summary.assigned * 0.5), color: 'bg-emerald-500' },
                { name: 'Ban Quản lý', count: Math.round(summary.assigned * 0.1), color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="font-bold text-slate-400">{item.count} TS</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full`} 
                      style={{ width: `${(item.count / summary.totalAssets) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITY */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-[800] text-slate-800 flex items-center tracking-tight">
                <TrendingUp className="mr-3 h-6 w-6 text-primary-600" />
                Hoạt động gần đây
              </h3>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[600px] no-scrollbar pr-2">
              {summary.recentLogs.map((log: any) => (
                <div key={log.id} className="flex space-x-4 group">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    log.action === 'CREATE' ? 'bg-emerald-500' : 
                    log.action === 'UPDATE' ? 'bg-amber-500' : 'bg-primary-500'
                  }`}></div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 leading-snug group-hover:text-primary-600 transition-colors">
                      {log.performedBy} <span className="text-slate-400 font-medium">đã {
                        log.action === 'CREATE' ? 'tạo mới' : 
                        log.action === 'UPDATE' ? 'cập nhật' : 
                        log.action === 'ASSIGN' ? 'bàn giao' : 'thay đổi'
                      }</span> {log.entityType} #{log.entityId}
                    </p>
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                      {format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-8 w-full py-4 bg-slate-50 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center group">
              Xem toàn bộ nhật ký <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* INVENTORY CARD */}
          <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><ClipboardCheck className="h-6 w-6" /></div>
              <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Live</span>
            </div>
            <h4 className="text-xl font-black mb-2 tracking-tight">Trạng thái kiểm kê</h4>
            <p className="text-emerald-100 text-sm font-medium mb-6 leading-relaxed">Đã thực hiện {summary.totalInventoryChecks} đợt đối soát trong năm nay.</p>
            <button 
              onClick={() => navigate('/inventory')}
              className="w-full py-4 bg-white text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-lg"
            >
              Vào trang kiểm kê
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
