import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  DollarSign, 
  Save, 
  Loader2,
  Package,
  ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { AppliedFormsBlock } from './AppliedFormsBlock';

interface LostReportFormProps {
  asset?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const LostReportForm: React.FC<LostReportFormProps> = ({ asset: initialAsset, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(initialAsset || null);
  
  const [formData, setFormData] = useState({
    lostDetectedDate: new Date().toISOString().split('T')[0],
    lastSeenDate: '',
    responsibleUser: '',
    responsibleDepartment: '',
    lastKnownLocation: '',
    incidentDescription: '',
    remainingValue: 0,
    compensationNote: '',
    reportedBy: 'Nhân viên QLTS'
  });

  useEffect(() => {
    if (selectedAsset) {
      setFormData(prev => ({
        ...prev,
        responsibleUser: selectedAsset.currentUserName || '',
        responsibleDepartment: selectedAsset.departmentName || '',
        lastKnownLocation: selectedAsset.locationName || '',
        remainingValue: selectedAsset.currentValue || 0
      }));
    }
  }, [selectedAsset]);

  const searchAssets = async (val: string) => {
    setAssetSearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/assets', { params: { search: val, limit: 5 } });
      // Only show assets that are NOT already lost or disposed
      setSearchResults(res.data.assets.filter((a: any) => a.status !== 'LOST' && a.status !== 'DISPOSED'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return toast.error("Vui lòng chọn tài sản bị mất");
    if (!formData.incidentDescription) return toast.error("Vui lòng nhập mô tả sự việc");

    setLoading(true);
    try {
      await api.post('/lost', {
        ...formData,
        assetId: selectedAsset.id
      });
      toast.success("Đã ghi nhận mất tài sản thành công");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi ghi nhận mất tài sản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Ghi nhận mất tài sản</h3>
            <p className="text-xs font-medium text-rose-600">Tạo hồ sơ ghi nhận tài sản bị mất / thất thoát</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><X className="h-6 w-6 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {/* STEP 1: ASSET SELECTION */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">1. Chọn tài sản</h4>
             {!selectedAsset ? (
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                   <input 
                      type="text" 
                      placeholder="Tìm theo mã, tên, serial..."
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-rose-50 transition-all font-bold"
                      value={assetSearch}
                      onChange={(e) => searchAssets(e.target.value)}
                   />
                   {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-50">
                         {searchResults.map(a => (
                            <button 
                               key={a.id} 
                               type="button"
                               className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center justify-between group"
                               onClick={() => { setSelectedAsset(a); setAssetSearch(''); setSearchResults([]); }}
                            >
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-rose-50 transition-colors"><Package className="h-5 w-5 text-slate-400 group-hover:text-rose-500" /></div>
                                  <div>
                                     <p className="text-sm font-black text-slate-800">{a.assetName}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">{a.assetCode} • {a.departmentName || 'Kho'}</p>
                                  </div>
                               </div>
                               <ArrowRight className="h-5 w-5 text-slate-200 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                            </button>
                         ))}
                      </div>
                   )}
                </div>
             ) : (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between group">
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm"><Package className="h-6 w-6 text-rose-500" /></div>
                      <div>
                         <p className="text-sm font-black text-slate-900">{selectedAsset.assetName}</p>
                         <p className="text-xs font-bold text-slate-500">{selectedAsset.assetCode}</p>
                      </div>
                   </div>
                   {!initialAsset && (
                      <button type="button" onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"><X className="h-5 w-5" /></button>
                   )}
                </div>
             )}
          </div>

          {/* STEP 2: LOST INFO */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">2. Thông tin phát hiện mất</h4>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Calendar className="h-3 w-3 mr-2" /> Ngày phát hiện mất</label>
                   <input 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-rose-500 focus:border-rose-500"
                      value={formData.lostDetectedDate}
                      onChange={(e) => setFormData({...formData, lostDetectedDate: e.target.value})}
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><MapPin className="h-3 w-3 mr-2" /> Vị trí cuối cùng</label>
                   <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-rose-500 focus:border-rose-500"
                      placeholder="Nhập nơi cuối cùng thấy TS..."
                      value={formData.lastKnownLocation}
                      onChange={(e) => setFormData({...formData, lastKnownLocation: e.target.value})}
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><User className="h-3 w-3 mr-2" /> Người chịu trách nhiệm</label>
                   <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-rose-500 focus:border-rose-500"
                      value={formData.responsibleUser}
                      onChange={(e) => setFormData({...formData, responsibleUser: e.target.value})}
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Package className="h-3 w-3 mr-2" /> Bộ phận</label>
                   <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-rose-500 focus:border-rose-500"
                      value={formData.responsibleDepartment}
                      onChange={(e) => setFormData({...formData, responsibleDepartment: e.target.value})}
                   />
                </div>
             </div>
          </div>

          {/* STEP 3: INCIDENT DESC */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">3. Mô tả sự việc</h4>
             <textarea 
                placeholder="Nhập chi tiết diễn biến sự việc mất tài sản..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-rose-500 focus:border-rose-500 h-28 resize-none"
                value={formData.incidentDescription}
                onChange={(e) => setFormData({...formData, incidentDescription: e.target.value})}
             />
          </div>

          {/* STEP 4: VALUE & DOCS */}
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><DollarSign className="h-3 w-3 mr-2" /> Giá trị còn lại (Tạm tính)</label>
                <input 
                   type="number" 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                   value={formData.remainingValue}
                   onChange={(e) => setFormData({...formData, remainingValue: parseFloat(e.target.value) || 0})}
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><FileText className="h-3 w-3 mr-2" /> Ghi chú bồi thường</label>
                <input 
                   type="text" 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold"
                   placeholder="Nhập quy định bồi thường nếu có..."
                   value={formData.compensationNote}
                   onChange={(e) => setFormData({...formData, compensationNote: e.target.value})}
                />
             </div>
          </div>

          {/* APPLIED FORMS */}
          <div className="pt-6 border-t border-slate-100">
             <AppliedFormsBlock action="LOST" isProcessing={true} />
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex space-x-3">
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all border border-slate-200">Hủy bỏ</button>
          <button 
            onClick={handleSubmit}
            disabled={loading || !selectedAsset}
            className="flex-[2] h-12 bg-rose-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Ghi nhận mất tài sản</>}
          </button>
        </div>
      </div>
    </div>
  );
};
