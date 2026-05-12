import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  AlertTriangle, 
  ClipboardList, 
  Wrench, 
  DollarSign, 
  Building2, 
  Save, 
  Loader2,
  HelpCircle
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AppliedFormsBlock } from './AppliedFormsBlock';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RepairTicketFormProps {
  asset: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const RepairTicketForm: React.FC<RepairTicketFormProps> = ({ asset, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reportedDate: new Date().toISOString().split('T')[0],
    reportedBy: 'Nhân viên QLTS', // Should be dynamic from auth
    damageLevel: 'MEDIUM',
    damageDescription: '',
    cause: '',
    canContinueUsing: true,
    repairAction: 'Mang đi sửa',
    repairVendor: '',
    estimatedCost: 0,
    expectedFinishDate: '',
    note: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.damageDescription) {
      toast.error("Vui lòng nhập mô tả sự cố");
      return;
    }

    setLoading(true);
    try {
      await api.post('/repairs', {
        ...formData,
        assetId: asset.id,
        reportedDate: new Date(formData.reportedDate),
        expectedFinishDate: formData.expectedFinishDate ? new Date(formData.expectedFinishDate) : null
      });
      toast.success("Đã tạo phiếu sửa chữa thành công");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo phiếu sửa chữa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Báo hỏng / Tạo phiếu sửa chữa</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            {/* Asset Info Summary */}
            <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
                  <p className="text-sm font-bold text-slate-800">{asset.assetCode} - {asset.assetName}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hiện tại</p>
                  <span className="text-xs font-black text-primary-600 uppercase">{asset.status}</span>
               </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Calendar className="mr-1.5 h-3 w-3" /> Ngày ghi nhận
              </label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                value={formData.reportedDate}
                onChange={(e) => setFormData({...formData, reportedDate: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <User className="mr-1.5 h-3 w-3" /> Người ghi nhận
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                value={formData.reportedBy}
                onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <AlertTriangle className="mr-1.5 h-3 w-3" /> Mức độ hỏng
              </label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                value={formData.damageLevel}
                onChange={(e) => setFormData({...formData, damageLevel: e.target.value})}
              >
                <option value="LOW">Nhẹ (Sửa nhanh)</option>
                <option value="MEDIUM">Trung bình (Cần mang đi sửa)</option>
                <option value="HIGH">Nặng (Hỏng một phần chức năng)</option>
                <option value="UNUSABLE">Không thể sử dụng</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Wrench className="mr-1.5 h-3 w-3" /> Hướng xử lý
              </label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                value={formData.repairAction}
                onChange={(e) => setFormData({...formData, repairAction: e.target.value})}
              >
                <option value="Mang đi sửa">Mang đi sửa (Bảo hành/Dịch vụ)</option>
                <option value="Sửa chữa nội bộ">Sửa chữa nội bộ</option>
                <option value="Không sửa được">Không sửa được (Chờ xử lý)</option>
                <option value="Thanh lý">Đề xuất thanh lý</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <ClipboardList className="mr-1.5 h-3 w-3" /> Mô tả sự cố
              </label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-primary-500 focus:border-primary-500 transition-all h-24 resize-none"
                placeholder="Nhập chi tiết tình trạng hỏng hóc..."
                value={formData.damageDescription}
                onChange={(e) => setFormData({...formData, damageDescription: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Building2 className="mr-1.5 h-3 w-3" /> Đơn vị sửa chữa
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="VD: Phong Vũ, Dell Service..."
                value={formData.repairVendor}
                onChange={(e) => setFormData({...formData, repairVendor: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <DollarSign className="mr-1.5 h-3 w-3" /> Chi phí dự kiến
              </label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-primary-500 focus:border-primary-500 transition-all"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({...formData, estimatedCost: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <input 
                type="checkbox" 
                id="canContinueUsing" 
                className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={formData.canContinueUsing}
                onChange={(e) => setFormData({...formData, canContinueUsing: e.target.checked})}
              />
              <label htmlFor="canContinueUsing" className="text-sm font-bold text-slate-700">Tiếp tục sử dụng được trong khi chờ sửa</label>
            </div>

            <div className="col-span-2 pt-6 border-t border-slate-100">
               <AppliedFormsBlock action="DAMAGE" isProcessing={true} />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] h-12 bg-primary-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Lưu phiếu sửa chữa</>}
          </button>
        </div>
      </div>
    </div>
  );
};
