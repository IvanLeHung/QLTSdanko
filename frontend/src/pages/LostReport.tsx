import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Filter,
  ArrowRight,
  Package,
  User,
  MapPin,
  DollarSign,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { format, startOfMonth } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LostReportForm } from '../components/LostReportForm';
import { LostProcessingPopup } from '../components/LostProcessingPopup';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LostReport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  useEffect(() => {
    fetchReports();
  }, [filterStatus, fromDate, toDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lost', { 
        params: { 
          status: filterStatus,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        } 
      });
      setReports(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách báo mất");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'LOST': return { label: 'Đang mất', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: ShieldAlert };
      case 'SEARCHING': return { label: 'Đang truy tìm', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock };
      case 'FOUND': return { label: 'Đã tìm thấy', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 };
      case 'CLOSED': return { label: 'Đã xử lý', color: 'bg-slate-50 text-slate-700 border-slate-100', icon: FileText };
      default: return { label: status, color: 'bg-slate-50 text-slate-700 border-slate-100', icon: Package };
    }
  };

  const currentMonthReports = reports.filter(r => new Date(r.reportedDate) >= startOfMonth(new Date()));
  const totalValue = reports.reduce((sum, r) => sum + (r.remainingValue || 0), 0);

  const filteredReports = reports.filter(r => 
    r.lostCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.asset?.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.asset?.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.responsibleUser?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-[40px] font-[900] text-slate-900 tracking-tighter leading-none flex items-center">
            <ShieldAlert className="mr-4 h-10 w-10 text-rose-500" />
            Báo mất tài sản
          </h1>
          <p className="text-slate-500 font-medium text-lg">Ghi nhận và truy vết tài sản bị thất thoát, mất mát trong hệ thống.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="h-14 px-8 bg-rose-600 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center"
        >
          <Plus className="mr-2 h-5 w-5" /> Ghi nhận mất tài sản
        </button>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
           { label: 'Đang mất', count: reports.filter(r => r.status === 'LOST').length, color: 'rose', icon: ShieldAlert },
           { label: 'Đã tìm thấy', count: reports.filter(r => r.status === 'FOUND').length, color: 'emerald', icon: CheckCircle2 },
           { label: 'Mất trong tháng', count: currentMonthReports.length, color: 'amber', icon: Clock },
           { label: 'Giá trị còn lại', count: totalValue.toLocaleString() + 'đ', color: 'slate', icon: DollarSign }
        ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-5 group hover:border-rose-100 transition-all">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", 
                 stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                 stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                 stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
              )}>
                 <stat.icon className="h-7 w-7" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                 <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.count}</p>
              </div>
           </div>
        ))}
      </div>

      {/* MAIN LIST SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        {/* TOOLBAR */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <Filter className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
             {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'LOST', label: 'Đang mất' },
                { id: 'FOUND', label: 'Đã tìm thấy' },
                { id: 'CLOSED', label: 'Đã xử lý' }
             ].map(f => (
                <button 
                   key={f.id}
                   onClick={() => setFilterStatus(f.id)}
                   className={cn(
                      "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      filterStatus === f.id ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                   )}
                >
                   {f.label}
                </button>
             ))}
          </div>

          <div className="relative w-full md:w-80">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
             <input 
                type="text" 
                placeholder="Tìm mã phiếu, tên tài sản, người chịu trách nhiệm..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>
        
        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/20">
                <th className="px-8 py-5">Tài sản bị mất</th>
                <th className="px-8 py-5">Người chịu trách nhiệm</th>
                <th className="px-8 py-5">Vị trí cuối</th>
                <th className="px-8 py-5">Ngày báo</th>
                <th className="px-8 py-5">Giá trị còn lại</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={7} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-rose-500" /></td>
                </tr>
              ) : filteredReports.map((r) => {
                const status = getStatusInfo(r.status);
                return (
                  <tr 
                    key={r.id} 
                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    onClick={() => setSelectedReportId(r.id)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-rose-50 transition-colors">
                           <Package className="h-6 w-6 text-slate-400 group-hover:text-rose-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors">{r.asset?.assetName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.asset?.assetCode} • Phiếu: {r.lostCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                         <div className="flex items-center text-sm font-bold text-slate-700">
                            <User className="h-3.5 w-3.5 mr-2 text-slate-400" />
                            {r.responsibleUser || 'N/A'}
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase ml-5">{r.responsibleDepartment || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center text-xs font-bold text-slate-600">
                          <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                          {r.lastKnownLocation || 'N/A'}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-bold text-slate-700">{format(new Date(r.reportedDate), 'dd/MM/yyyy')}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-black text-rose-600">{(r.remainingValue || 0).toLocaleString()}đ</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border", status.color)}>
                        <status.icon className="mr-2 h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 bg-white border border-slate-200 rounded-xl hover:border-rose-500 hover:text-rose-600 transition-all shadow-sm group-hover:scale-110">
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                     <div className="max-w-xs mx-auto space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                           <Search className="h-10 w-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 italic text-sm font-medium">Không tìm thấy hồ sơ báo mất nào.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUPS */}
      {showCreate && (
        <LostReportForm 
           onClose={() => setShowCreate(false)}
           onSuccess={() => { setShowCreate(false); fetchReports(); }}
        />
      )}

      {selectedReportId && (
        <LostProcessingPopup 
           reportId={selectedReportId}
           isOpen={true}
           onClose={() => setSelectedReportId(null)}
           onSuccess={() => { setSelectedReportId(null); fetchReports(); }}
        />
      )}
    </div>
  );
};
