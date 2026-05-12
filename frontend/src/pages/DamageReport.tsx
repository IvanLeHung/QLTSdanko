import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  X,
  ChevronRight,
  Package,
  History,
  AlertCircle,
  Filter,
  ArrowRight,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RepairTicketForm } from '../components/RepairTicketForm';
import { RepairProcessingPopup } from '../components/RepairProcessingPopup';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DamageReport: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/repairs', { params: { status: filterStatus } });
      setTickets(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách phiếu sửa chữa");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'OPEN': return { label: 'Chờ xử lý', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock };
      case 'IN_PROGRESS': return { label: 'Đang sửa', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: Wrench };
      case 'COMPLETED': return { label: 'Đã xong', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 };
      case 'FAILED': return { label: 'Không sửa được', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: X };
      default: return { label: status, color: 'bg-slate-50 text-slate-700 border-slate-100', icon: Package };
    }
  };

  const getDamageLevelInfo = (level: string) => {
    switch (level) {
      case 'LOW': return { label: 'Nhẹ', color: 'bg-emerald-50 text-emerald-600' };
      case 'MEDIUM': return { label: 'Trung bình', color: 'bg-amber-50 text-amber-600' };
      case 'HIGH': return { label: 'Nặng', color: 'bg-rose-50 text-rose-600' };
      case 'UNUSABLE': return { label: 'Không dùng được', color: 'bg-rose-100 text-rose-700 font-black' };
      default: return { label: level, color: 'bg-slate-50 text-slate-600' };
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.repairCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.asset?.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.asset?.assetCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-[40px] font-[900] text-slate-900 tracking-tighter leading-none flex items-center">
            <AlertTriangle className="mr-4 h-10 w-10 text-amber-500" />
            Báo hỏng & Sửa chữa
          </h1>
          <p className="text-slate-500 font-medium text-lg">Trung tâm điều phối & theo dõi tình trạng sửa chữa tài sản toàn hệ thống.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="h-14 px-8 bg-primary-600 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center"
        >
          <Plus className="mr-2 h-5 w-5" /> Ghi nhận báo hỏng
        </button>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
           { label: 'Chờ xử lý', count: tickets.filter(t => t.status === 'OPEN').length, color: 'amber', icon: Clock },
           { label: 'Đang sửa chữa', count: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: 'blue', icon: Wrench },
           { label: 'Đã xử lý xong', count: tickets.filter(t => t.status === 'COMPLETED').length, color: 'emerald', icon: CheckCircle2 },
           { label: 'Không sửa được', count: tickets.filter(t => t.status === 'FAILED').length, color: 'rose', icon: AlertCircle }
        ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-5 group hover:border-primary-100 transition-all">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", 
                 stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                 stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                 stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              )}>
                 <stat.icon className="h-7 w-7" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                 <p className="text-3xl font-black text-slate-900">{stat.count}</p>
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
                { id: 'OPEN', label: 'Chờ xử lý' },
                { id: 'IN_PROGRESS', label: 'Đang sửa' },
                { id: 'COMPLETED', label: 'Đã xử lý' },
                { id: 'FAILED', label: 'Không sửa được' }
             ].map(f => (
                <button 
                   key={f.id}
                   onClick={() => setFilterStatus(f.id)}
                   className={cn(
                      "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      filterStatus === f.id ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
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
                placeholder="Tìm mã phiếu, tên tài sản..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary-50 transition-all"
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
                <th className="px-8 py-5">Tài sản & Sự cố</th>
                <th className="px-8 py-5">Mức độ</th>
                <th className="px-8 py-5">Người giữ hiện tại</th>
                <th className="px-8 py-5">Trạng thái xử lý</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={5} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary-500" /></td>
                </tr>
              ) : filteredTickets.map((t) => {
                const status = getStatusInfo(t.status);
                const level = getDamageLevelInfo(t.damageLevel);
                return (
                  <tr 
                    key={t.id} 
                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    onClick={() => setSelectedTicketId(t.id)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                           <Package className="h-6 w-6 text-slate-400 group-hover:text-primary-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 group-hover:text-primary-600 transition-colors">{t.asset?.assetName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.asset?.assetCode} • Mã phiếu: {t.repairCode}</p>
                          <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100/50">
                             <p className="text-[11px] text-slate-600 font-medium italic line-clamp-1">"{t.damageDescription}"</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Ngày báo: {format(new Date(t.reportedDate), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", level.color)}>
                         {level.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                         <div className="flex items-center text-sm font-bold text-slate-700">
                            <User className="h-3.5 w-3.5 mr-2 text-slate-400" />
                            {t.asset?.currentUserName || 'Trong kho'}
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase ml-5">{t.asset?.departmentName || 'Phòng quản trị'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight border", status.color)}>
                        <status.icon className="mr-2 h-4 w-4" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 bg-white border border-slate-200 rounded-xl hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm group-hover:scale-110">
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                     <div className="max-w-xs mx-auto space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                           <Search className="h-10 w-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 italic text-sm font-medium">Không tìm thấy phiếu sửa chữa nào khớp với bộ lọc.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUPS */}
      {selectedTicketId && (
        <RepairProcessingPopup 
           ticketId={selectedTicketId}
           isOpen={true}
           onClose={() => setSelectedTicketId(null)}
           onSuccess={() => { setSelectedTicketId(null); fetchTickets(); }}
        />
      )}

      {showCreate && (
         <GlobalRepairTicketForm 
            onClose={() => setShowCreate(false)}
            onSuccess={() => { setShowCreate(false); fetchTickets(); }}
         />
      )}
    </div>
  );
};

// Internal sub-component for selecting asset while creating ticket
const GlobalRepairTicketForm: React.FC<{onClose: () => void, onSuccess: () => void}> = ({ onClose, onSuccess }) => {
   const [assetSearch, setAssetSearch] = useState('');
   const [searchResults, setSearchResults] = useState<any[]>([]);
   const [selectedAsset, setSelectedAsset] = useState<any>(null);

   const searchAssets = async (val: string) => {
      setAssetSearch(val);
      if (val.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get('/assets', { params: { search: val, limit: 5 } });
        setSearchResults(res.data.assets);
      } catch (err) {
        console.error(err);
      }
    };

   if (selectedAsset) {
      return <RepairTicketForm asset={selectedAsset} onClose={onClose} onSuccess={onSuccess} />;
   }

   return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
         <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden flex flex-col p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Ghi nhận báo hỏng</h2>
               <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="h-6 w-6 text-slate-300" /></button>
            </div>
            
            <p className="text-slate-500 font-medium">Bước 1: Vui lòng chọn tài sản đang gặp sự cố hỏng hóc.</p>

            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
               <input 
                  type="text" 
                  autoFocus
                  placeholder="Tìm theo mã hoặc tên tài sản..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900 shadow-inner"
                  value={assetSearch}
                  onChange={(e) => searchAssets(e.target.value)}
               />
               
               {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-20 overflow-hidden divide-y divide-slate-50">
                     {searchResults.map(a => (
                        <button 
                           key={a.id} 
                           className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                           onClick={() => setSelectedAsset(a)}
                        >
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-primary-50"><Package className="h-5 w-5 text-slate-400 group-hover:text-primary-500" /></div>
                              <div>
                                 <p className="text-sm font-black text-slate-800">{a.assetName}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.assetCode} • {a.departmentName || 'Kho'}</p>
                              </div>
                           </div>
                           <ArrowRight className="h-5 w-5 text-slate-200 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                        </button>
                     ))}
                  </div>
               )}
            </div>

            {assetSearch.length > 0 && searchResults.length === 0 && (
               <div className="text-center py-10">
                  <p className="text-slate-400 italic text-sm">Không tìm thấy tài sản nào phù hợp.</p>
               </div>
            )}
         </div>
      </div>
   );
};
