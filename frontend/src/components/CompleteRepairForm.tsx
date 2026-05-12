import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Save, 
  Loader2,
  AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface CompleteRepairFormProps {
  ticket: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const CompleteRepairForm: React.FC<CompleteRepairFormProps> = ({ ticket, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    actualFinishDate: new Date().toISOString().split('T')[0],
    actualCost: ticket.estimatedCost || 0,
    result: 'Đã sửa xong',
    assetStatusAfterRepair: 'IN_STOCK',
    note: '',
    performedBy: 'Nhân viên QLTS'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/repairs/${ticket.id}/complete`, formData);
      toast.success("Đã hoàn tất sửa chữa và cập nhật trạng thái tài sản");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi hoàn tất sửa chữa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Hoàn tất sửa chữa</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Calendar className="mr-1.5 h-3 w-3" /> Ngày hoàn tất
              </label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={formData.actualFinishDate}
                onChange={(e) => setFormData({...formData, actualFinishDate: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <DollarSign className="mr-1.5 h-3 w-3" /> Chi phí thực tế
              </label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={formData.actualCost}
                onChange={(e) => setFormData({...formData, actualCost: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả sửa chữa</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={formData.result}
                onChange={(e) => setFormData({...formData, result: e.target.value})}
              >
                <option value="Đã sửa xong">Đã sửa xong (Hoạt động tốt)</option>
                <option value="Đã sửa xong - sử dụng hạn chế">Đã sửa xong - Sử dụng hạn chế</option>
                <option value="Không sửa được">Không sửa được (Chuyển xử lý khác)</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái tài sản sau sửa</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={formData.assetStatusAfterRepair}
                onChange={(e) => setFormData({...formData, assetStatusAfterRepair: e.target.value})}
              >
                <option value="IN_STOCK">Trong kho (Sẵn sàng cấp phát)</option>
                <option value="ASSIGNED">Tiếp tục sử dụng (Nếu đang giao)</option>
                <option value="DAMAGED">Hỏng (Chờ thanh lý/hủy)</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200"
          >
            Đóng
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] h-12 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Xác nhận hoàn tất</>}
          </button>
        </div>
      </div>
    </div>
  );
};
