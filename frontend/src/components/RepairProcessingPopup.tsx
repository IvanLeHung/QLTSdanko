import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  Calendar, 
  User, 
  MapPin, 
  AlertTriangle, 
  DollarSign, 
  Building2, 
  Save, 
  CheckCircle2, 
  History,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Loader2
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

interface RepairProcessingPopupProps {
  ticketId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RepairProcessingPopup: React.FC<RepairProcessingPopupProps> = ({ ticketId, isOpen, onClose, onSuccess }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'logs'>('process');
  
  const [formData, setFormData] = useState({
    repairAction: '',
    repairVendor: '',
    estimatedCost: 0,
    expectedFinishDate: '',
    sentToRepairDate: '',
    actualCost: 0,
    actualFinishDate: '',
    result: '',
    assetStatusAfterRepair: '',
    note: '',
    status: ''
  });

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetail();
    }
  }, [isOpen, ticketId]);

  const fetchTicketDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/repairs/${ticketId}`);
      setTicket(res.data);
      setFormData({
        repairAction: res.data.repairAction || '',
        repairVendor: res.data.repairVendor || '',
        estimatedCost: res.data.estimatedCost || 0,
        expectedFinishDate: res.data.expectedFinishDate ? res.data.expectedFinishDate.split('T')[0] : '',
        sentToRepairDate: res.data.sentToRepairDate ? res.data.sentToRepairDate.split('T')[0] : '',
        actualCost: res.data.actualCost || 0,
        actualFinishDate: res.data.actualFinishDate ? res.data.actualFinishDate.split('T')[0] : '',
        result: res.data.result || '',
        assetStatusAfterRepair: res.data.assetStatusAfterRepair || 'IN_STOCK',
        note: res.data.note || '',
        status: res.data.status
      });
    } catch (err) {
      toast.error("Không thể tải thông tin phiếu sửa chữa");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (isComplete = false, overrideStatus?: string) => {
    setSubmitting(true);
    const targetStatus = overrideStatus || formData.status;
    try {
      if (isComplete) {
        await api.post(`/repairs/${ticketId}/complete`, {
           ...formData,
           performedBy: 'Nhân viên QLTS'
        });
        toast.success("Đã hoàn tất sửa chữa và đóng phiếu");
      } else {
        await api.put(`/repairs/${ticketId}/progress`, {
           ...formData,
           status: targetStatus,
           performedBy: 'Nhân viên QLTS',
           description: `Cập nhật xử lý: ${formData.repairAction || 'Cập nhật tiến độ'}`
        });
        toast.success("Đã lưu cập nhật xử lý");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xử lý phiếu");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
        ) : ticket ? (
          <>
            {/* HEADER */}
            <div className="px-8 pt-8 pb-6 bg-slate-50/50 flex justify-between items-start border-b border-slate-100">
              <div className="flex items-start space-x-4">
                 <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
                    <Wrench className="h-6 w-6" />
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                       <h2 className="text-xl font-[900] text-slate-900 tracking-tighter uppercase">Xử lý sửa chữa / bảo trì</h2>
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          ticket.status === 'DRAFT' ? "bg-slate-100 text-slate-700 border-slate-200" :
                          ticket.status === 'OPEN' ? "bg-amber-100 text-amber-700 border-amber-200" :
                          ticket.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700 border-blue-200" :
                          ticket.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                          ticket.status === 'FAILED' ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-500 border-slate-200"
                       )}>
                          {ticket.status === 'DRAFT' ? 'Nháp' :
                           ticket.status === 'OPEN' ? 'Chờ xử lý' :
                           ticket.status === 'IN_PROGRESS' ? 'Đang sửa' :
                           ticket.status === 'COMPLETED' ? 'Đã xong' :
                           ticket.status === 'FAILED' ? 'Không sửa được' :
                           ticket.status === 'CANCELLED' ? 'Đã hủy' : ticket.status}
                       </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 leading-tight">{ticket.asset?.assetName} - {ticket.asset?.assetCode}</h3>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                 <X className="h-6 w-6 text-slate-300 hover:text-slate-600" />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
               {/* INCIDENT INFO CARD */}
               <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin sự cố</h4>
                     <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                        ticket.damageLevel === 'HIGH' || ticket.damageLevel === 'UNUSABLE' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                     )}>
                        Mức độ: {ticket.damageLevel}
                     </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-12">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Người giữ / Bộ phận</p>
                        <p className="text-sm font-bold text-slate-800">{ticket.asset?.currentUserName || 'N/A'} • {ticket.asset?.departmentName || 'N/A'}</p>
                     </div>
                     <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Vị trí / Ngày báo</p>
                        <p className="text-sm font-bold text-slate-800">{ticket.asset?.locationName || 'N/A'} • {format(new Date(ticket.reportedDate), 'dd/MM/yyyy')}</p>
                     </div>
                     <div className="col-span-2 space-y-1 p-3 bg-white rounded-xl border border-slate-100 italic">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Mô tả sự cố</p>
                        <p className="text-sm text-slate-600 font-medium">"{ticket.damageDescription}"</p>
                     </div>
                  </div>
               </div>

               {/* HANDLING ACTION */}
               {ticket.status !== 'COMPLETED' && ticket.status !== 'DRAFT' && ticket.status !== 'CANCELLED' && ticket.status !== 'FAILED' && (
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hướng xử lý</h4>
                     <div className="grid grid-cols-3 gap-3">
                        {[
                           { id: 'Sửa chữa', label: 'Gửi sửa', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
                           { id: 'Nội bộ', label: 'Sửa nội bộ', icon: Save, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                           { id: 'Vẫn dùng được', label: 'Vẫn dùng được', icon: CheckCircle2, color: 'text-slate-600', bg: 'bg-slate-50' },
                           { id: 'Không sửa được', label: 'Không sửa được', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                           { id: 'Thanh lý', label: 'Chờ thanh lý', icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
                           { id: 'Hủy', label: 'Chờ hủy', icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map(act => (
                           <button
                              key={act.id}
                              type="button"
                              onClick={() => setFormData({
                                 ...formData, 
                                 repairAction: act.id, 
                                 status: 
                                    (act.id === 'Sửa chữa' || act.id === 'Nội bộ') ? 'IN_PROGRESS' : 
                                    (act.id === 'Không sửa được' || act.id === 'Thanh lý') ? 'FAILED' : 
                                    (act.id === 'Hủy') ? 'CANCELLED' : 
                                    (act.id === 'Vẫn dùng được') ? 'COMPLETED' : 
                                    formData.status
                              })}
                              className={cn(
                                 "flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all",
                                 formData.repairAction === act.id 
                                    ? "border-primary-500 bg-primary-50/50 shadow-md scale-[1.02]" 
                                    : "border-slate-100 hover:border-slate-200 bg-white"
                              )}
                           >
                              <div className={cn("p-2 rounded-xl", act.bg, act.color)}><act.icon className="h-4 w-4" /></div>
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">{act.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {/* REPAIR DETAILS FORM */}
               {(formData.repairAction === 'Sửa chữa' || formData.repairAction === 'Nội bộ' || ticket.status === 'IN_PROGRESS' || ticket.status === 'COMPLETED') && (
                  <div className="space-y-6 p-6 border-2 border-slate-50 rounded-3xl animate-in fade-in slide-in-from-top-2 duration-300">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết sửa chữa</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Đơn vị sửa chữa</label>
                           <input 
                              type="text" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={formData.repairVendor}
                              onChange={(e) => setFormData({...formData, repairVendor: e.target.value})}
                              disabled={ticket.status === 'COMPLETED'}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Chi phí dự kiến</label>
                           <input 
                              type="number" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={formData.estimatedCost}
                              onChange={(e) => setFormData({...formData, estimatedCost: parseFloat(e.target.value) || 0})}
                              disabled={ticket.status === 'COMPLETED'}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Ngày gửi sửa</label>
                           <input 
                              type="date" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={formData.sentToRepairDate}
                              onChange={(e) => setFormData({...formData, sentToRepairDate: e.target.value})}
                              disabled={ticket.status === 'COMPLETED'}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Dự kiến hoàn tất</label>
                           <input 
                              type="date" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                              value={formData.expectedFinishDate}
                              onChange={(e) => setFormData({...formData, expectedFinishDate: e.target.value})}
                              disabled={ticket.status === 'COMPLETED'}
                           />
                        </div>
                        
                        {(ticket.status === 'IN_PROGRESS' || ticket.status === 'COMPLETED') && (
                           <>
                              <div className="col-span-2 border-t border-slate-100 pt-6 mt-2">
                                 <h5 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Thông tin hoàn tất</h5>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase">Ngày hoàn tất</label>
                                 <input 
                                    type="date" 
                                    className="w-full bg-emerald-50/30 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                                    value={formData.actualFinishDate}
                                    onChange={(e) => setFormData({...formData, actualFinishDate: e.target.value})}
                                    disabled={ticket.status === 'COMPLETED'}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase">Chi phí thực tế</label>
                                 <input 
                                    type="number" 
                                    className="w-full bg-emerald-50/30 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                                    value={formData.actualCost}
                                    onChange={(e) => setFormData({...formData, actualCost: parseFloat(e.target.value) || 0})}
                                    disabled={ticket.status === 'COMPLETED'}
                                 />
                              </div>
                              <div className="col-span-2 space-y-1.5">
                                 <label className="text-[10px] font-black text-slate-400 uppercase">Trạng thái sau sửa</label>
                                 <select 
                                    className="w-full bg-emerald-50/30 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm font-bold"
                                    value={formData.assetStatusAfterRepair}
                                    onChange={(e) => setFormData({...formData, assetStatusAfterRepair: e.target.value})}
                                    disabled={ticket.status === 'COMPLETED'}
                                 >
                                    <option value="IN_STOCK">Trong kho (Sẵn sàng cấp phát)</option>
                                    <option value="ASSIGNED">Đang sử dụng (Tiếp tục giao)</option>
                                    <option value="DAMAGED">Hỏng (Chờ thanh lý/hủy)</option>
                                 </select>
                              </div>
                           </>
                        )}
                     </div>
                  </div>
               )}

               {/* APPLIED FORMS */}
               <div className="pt-4 border-t border-slate-50">
                  <AppliedFormsBlock 
                    action="REPAIR" 
                    entityId={ticket.id} 
                    entityType="AssetRepairTicket"
                    isProcessing={ticket.status !== 'COMPLETED'}
                  />
               </div>

               {/* LOGS TIMELINE */}
               <div className="space-y-6 pt-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nhật ký xử lý</h4>
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100">
                     {ticket.logs?.map((log: any) => (
                        <div key={log.id} className="relative">
                           <div className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-primary-500 ring-4 ring-white" />
                           <p className="text-[10px] font-bold text-slate-400">{format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')} - {log.performedBy}</p>
                           <p className="text-sm font-bold text-slate-800">{log.description}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* FOOTER */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
               <button onClick={onClose} className="px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all border border-slate-200">Đóng</button>
               {ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED' && ticket.status !== 'FAILED' && (
                  <>
                     <div className="flex-1" />
                     {ticket.status === 'DRAFT' ? (
                        <button 
                           onClick={() => handleUpdate(false, 'OPEN')}
                           disabled={submitting}
                           className="px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 flex items-center disabled:opacity-50"
                        >
                           {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                           Xác nhận báo hỏng
                        </button>
                     ) : (
                        <>
                           <button 
                              onClick={() => handleUpdate(false)}
                              disabled={submitting}
                              className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center shadow-sm disabled:opacity-50"
                           >
                              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Lưu xử lý
                           </button>
                           {(ticket.status === 'IN_PROGRESS' || formData.repairAction === 'Vẫn dùng được') && (
                              <button 
                                 onClick={() => handleUpdate(true)}
                                 disabled={submitting}
                                 className="px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 flex items-center disabled:opacity-50"
                              >
                                 {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                 Hoàn tất sửa chữa
                              </button>
                           )}
                        </>
                     )}
                  </>
               )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
