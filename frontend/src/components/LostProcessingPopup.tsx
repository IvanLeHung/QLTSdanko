import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  Package,
  History,
  AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppliedFormsBlock } from './AppliedFormsBlock';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LostProcessingPopupProps {
  reportId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LostProcessingPopup: React.FC<LostProcessingPopupProps> = ({ reportId, isOpen, onClose, onSuccess }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFoundForm, setShowFoundForm] = useState(false);
  
  const [foundData, setFoundData] = useState({
    foundDate: new Date().toISOString().split('T')[0],
    foundLocation: '',
    conditionWhenFound: 'Bình thường',
    newAssetStatusAfterFound: 'IN_STOCK',
    note: '',
    performedBy: 'Nhân viên QLTS'
  });

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReportDetail();
    }
  }, [isOpen, reportId]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/lost/${reportId}`);
      setReport(res.data);
      setFoundData(prev => ({ ...prev, foundLocation: res.data.lastKnownLocation || '' }));
    } catch (err) {
      toast.error("Không thể tải thông tin hồ sơ mất");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleFound = async () => {
    setSubmitting(true);
    try {
      await api.post(`/lost/${reportId}/find`, foundData);
      toast.success("Đã xác nhận tìm thấy tài sản và cập nhật trạng thái");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseReport = async () => {
    if (!window.confirm("Xác nhận tài sản mất vĩnh viễn và đóng hồ sơ?")) return;
    setSubmitting(true);
    try {
      await api.post(`/lost/${reportId}/close`, { performedBy: 'Nhân viên QLTS' });
      toast.success("Đã đóng hồ sơ mất tài sản");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-rose-600" /></div>
        ) : report ? (
          <>
            {/* HEADER */}
            <div className="px-8 pt-8 pb-6 bg-slate-50/50 flex justify-between items-start border-b border-slate-100">
              <div className="flex items-start space-x-4">
                 <div className="bg-rose-100 p-4 rounded-2xl text-rose-600">
                    <ShieldAlert className="h-6 w-6" />
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                       <h2 className="text-xl font-[900] text-slate-900 tracking-tighter uppercase">Xử lý tài sản bị mất</h2>
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          report.status === 'LOST' ? "bg-rose-100 text-rose-700 border-rose-200" :
                          report.status === 'FOUND' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                          "bg-slate-100 text-slate-600"
                       )}>
                          {report.status}
                       </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 leading-tight">{report.asset?.assetName} - {report.asset?.assetCode}</h3>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                 <X className="h-6 w-6 text-slate-300 hover:text-slate-600" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
               {/* ASSET & INCIDENT INFO */}
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Thông tin tài sản</h4>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Mã tài sản:</span>
                           <span className="font-bold text-slate-800">{report.asset?.assetCode}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Giá trị còn lại:</span>
                           <span className="font-bold text-rose-600">{report.remainingValue?.toLocaleString()}đ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Trạng thái cuối:</span>
                           <span className="font-bold text-slate-800">{report.asset?.status}</span>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Thông tin mất</h4>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Ngày ghi nhận:</span>
                           <span className="font-bold text-slate-800">{format(new Date(report.reportedDate), 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Người chịu trách nhiệm:</span>
                           <span className="font-bold text-slate-800">{report.responsibleUser}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500">Vị trí cuối:</span>
                           <span className="font-bold text-slate-800">{report.lastKnownLocation}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-5 bg-rose-50/30 rounded-2xl border border-rose-100/50 italic">
                  <p className="text-[10px] font-black text-rose-400 uppercase mb-2">Mô tả sự việc</p>
                  <p className="text-sm text-slate-600 font-medium">"{report.incidentDescription}"</p>
               </div>

               {report.compensationNote && (
                  <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
                     <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><DollarSign className="h-4 w-4" /></div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ghi chú bồi thường</p>
                        <p className="text-sm text-slate-800 font-bold">{report.compensationNote}</p>
                     </div>
                  </div>
               )}

               {/* HANDLING ACTION */}
               {report.status === 'LOST' && !showFoundForm && (
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hướng xử lý</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                           onClick={() => setShowFoundForm(true)}
                           className="flex items-center justify-center space-x-3 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
                        >
                           <CheckCircle2 className="h-6 w-6" />
                           <span className="font-black text-sm uppercase tracking-widest">Đã tìm thấy tài sản</span>
                        </button>
                        <button 
                           onClick={handleCloseReport}
                           className="flex items-center justify-center space-x-3 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                        >
                           <AlertTriangle className="h-6 w-6" />
                           <span className="font-black text-sm uppercase tracking-widest">Mất vĩnh viễn / Đóng</span>
                        </button>
                     </div>
                  </div>
               )}

               {/* FOUND FORM */}
               {showFoundForm && (
                  <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top-4 duration-300">
                     <div className="flex justify-between items-center">
                        <h4 className="text-lg font-black text-emerald-800 tracking-tight flex items-center">
                           <CheckCircle2 className="mr-2 h-6 w-6" /> Xác nhận tìm thấy tài sản
                        </h4>
                        <button onClick={() => setShowFoundForm(false)} className="text-emerald-400 hover:text-emerald-600"><X className="h-6 w-6" /></button>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-emerald-600 uppercase">Ngày tìm thấy</label>
                           <input 
                              type="date" 
                              className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={foundData.foundDate}
                              onChange={(e) => setFoundData({...foundData, foundDate: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-emerald-600 uppercase">Vị trí hiện tại</label>
                           <input 
                              type="text" 
                              className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={foundData.foundLocation}
                              onChange={(e) => setFoundData({...foundData, foundLocation: e.target.value})}
                           />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                           <label className="text-[10px] font-black text-emerald-600 uppercase">Trạng thái tài sản sau khi tìm thấy</label>
                           <select 
                              className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={foundData.newAssetStatusAfterFound}
                              onChange={(e) => setFoundData({...foundData, newAssetStatusAfterFound: e.target.value})}
                           >
                              <option value="IN_STOCK">Trong kho (Sẵn sàng cấp phát)</option>
                              <option value="ASSIGNED">Tiếp tục sử dụng (Nếu đang giao)</option>
                              <option value="DAMAGED">Hỏng (Chờ sửa chữa)</option>
                              <option value="UNDER_REPAIR">Đang sửa chữa</option>
                           </select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                           <label className="text-[10px] font-black text-emerald-600 uppercase">Ghi chú tình trạng</label>
                           <input 
                              type="text" 
                              className="w-full bg-white border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                              placeholder="Nhập tình trạng khi tìm thấy..."
                              value={foundData.conditionWhenFound}
                              onChange={(e) => setFoundData({...foundData, conditionWhenFound: e.target.value})}
                           />
                        </div>
                     </div>
                     <button 
                        onClick={handleFound}
                        disabled={submitting}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all"
                     >
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Xác nhận đã tìm thấy"}
                     </button>
                  </div>
               )}

               {/* APPLIED FORMS */}
               <div className="pt-4 border-t border-slate-50">
                  <AppliedFormsBlock 
                    action="LOST" 
                    entityId={report.id} 
                    entityType="LostReport"
                    isProcessing={report.status === 'LOST'}
                  />
               </div>

               {/* LOGS TIMELINE */}
               <div className="space-y-6 pt-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nhật ký xử lý</h4>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100">
                     {report.logs?.map((log: any) => (
                        <div key={log.id} className="relative">
                           <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-white" />
                           <p className="text-[10px] font-bold text-slate-400">{format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')} - {log.performedBy}</p>
                           <p className="text-sm font-bold text-slate-800">{log.description}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* FOOTER */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between">
               <button onClick={onClose} className="px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all border border-slate-200">Đóng</button>
               {report.status === 'LOST' && (
                  <button className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center shadow-sm">
                     <FileText className="h-4 w-4 mr-2" />
                     Cập nhật hồ sơ
                  </button>
               )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
