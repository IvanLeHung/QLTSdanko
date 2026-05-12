import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  UserPlus, 
  Plus, 
  Search, 
  X,
  ChevronRight,
  Package,
  User,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  MapPin,
  Building,
  Upload,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { AppliedFormsBlock } from '../components/AppliedFormsBlock';

export const HandoverTransfer: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Create Form State
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: 'HANDOVER',
    recipientName: '',
    recipientPosition: '',
    recipientDepartment: '',
    recipientPhone: '',
    newLocation: '',
    newCity: '',
    reason: '',
    note: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/handover');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreate = async () => {
    if (selectedAssets.length === 0) return toast.error('Vui lòng chọn ít nhất 1 tài sản');
    if (!formData.recipientName) return toast.error('Vui lòng nhập tên người nhận');

    try {
      await api.post('/handover', {
        ...formData,
        assetIds: selectedAssets.map(a => a.id)
      });
      toast.success('Đã tạo hồ sơ thành công (Trạng thái: Nháp)');
      setShowCreate(false);
      setSelectedAssets([]);
      setFormData({ type: 'HANDOVER', recipientName: '', recipientPosition: '', recipientDepartment: '', recipientPhone: '', newLocation: '', newCity: '', reason: '', note: '' });
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleComplete = async (id: number) => {
    if (!window.confirm('Xác nhận hoàn tất hồ sơ? Sau khi hoàn tất, thông tin tài sản sẽ chính thức được cập nhật.')) return;
    try {
      await api.post(`/handover/${id}/complete`);
      toast.success('Hồ sơ đã được hoàn tất và cập nhật sổ tài sản');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-[900] text-[#0F172A] tracking-tight flex items-center">
            <UserPlus className="mr-3 h-8 w-8 text-primary-600" />
            Bàn giao & Điều chuyển
          </h1>
          <p className="text-slate-500 font-medium text-lg">Quản lý luồng luân chuyển tài sản nội bộ giữa các cá nhân/phòng ban.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-primary-600 text-white h-14 px-8 rounded-2xl font-bold flex items-center shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all uppercase tracking-widest text-xs"
        >
          <Plus className="mr-2 h-5 w-5" /> Lập hồ sơ mới
        </button>
      </div>

      {/* TABS & LIST */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex space-x-8">
            <button className="text-sm font-black text-primary-600 border-b-2 border-primary-600 pb-1">Tất cả hồ sơ</button>
            <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-all">Bàn giao</button>
            <button className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-all">Điều chuyển</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                <th className="px-8 py-5">Mã hồ sơ / Loại</th>
                <th className="px-8 py-5">Người nhận / Bộ phận</th>
                <th className="px-8 py-5">Số lượng TS</th>
                <th className="px-8 py-5">Ngày tạo</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${doc.type === 'HANDOVER' ? 'bg-primary-50 text-primary-600' : 'bg-amber-50 text-amber-600'}`}>
                        {doc.type === 'HANDOVER' ? <UserPlus className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{doc.documentNo}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {doc.type === 'HANDOVER' ? 'Bàn giao mới' : 'Điều chuyển'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-800">{doc.recipientName}</p>
                    <p className="text-xs text-slate-500">{doc.recipientDepartment}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
                      {doc._count?.items || 0} TS
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-500">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-8 py-5">
                    {doc.status === 'COMPLETED' ? (
                      <span className="flex items-center text-emerald-600 text-xs font-black uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                        <CheckCircle2 className="mr-1.5 h-4 w-4" /> Hoàn tất
                      </span>
                    ) : (
                      <span className="flex items-center text-slate-400 text-xs font-black uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full w-fit">
                        <Clock className="mr-1.5 h-4 w-4" /> Đang xử lý
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end space-x-2">
                      {doc.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleComplete(doc.id)}
                          className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                          title="Hoàn tất hồ sơ"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      )}
                      <button className="bg-white border border-slate-200 p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm">
                        <Printer className="h-5 w-5" />
                      </button>
                      <button className="bg-white border border-slate-200 p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">Chưa có hồ sơ bàn giao/điều chuyển nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}></div>
          <div className="bg-white rounded-[3rem] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tạo hồ sơ {formData.type === 'HANDOVER' ? 'Bàn giao' : 'Điều chuyển'}</h2>
                <p className="text-slate-500 text-sm font-medium">Nhân viên QLTS trực tiếp vận hành và cập nhật thông tin.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column: Form Info */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loại nghiệp vụ</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setFormData({...formData, type: 'HANDOVER'})}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${formData.type === 'HANDOVER' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >Bàn giao mới</button>
                      <button 
                        onClick={() => setFormData({...formData, type: 'TRANSFER'})}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 ${formData.type === 'TRANSFER' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >Điều chuyển</button>
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Họ tên người nhận</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A"
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.recipientName}
                        onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                      <input 
                        type="text" 
                        placeholder="0987..."
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.recipientPhone}
                        onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bộ phận / Phòng ban</label>
                    <input 
                      type="text" 
                      placeholder="Phòng IT, Kinh doanh..."
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                      value={formData.recipientDepartment}
                      onChange={(e) => setFormData({...formData, recipientDepartment: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Vị trí mới (Toà nhà/Tầng)</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.newLocation}
                        onChange={(e) => setFormData({...formData, newLocation: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Thành phố</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.newCity}
                        onChange={(e) => setFormData({...formData, newCity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Lý do luân chuyển</label>
                    <textarea 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900 h-24 resize-none"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                     <AppliedFormsBlock action={formData.type as any} isProcessing={true} />
                  </div>
                </div>
              </div>

              {/* Right Column: Asset Selection */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chọn tài sản ({selectedAssets.length})</label>
                   <div className="relative">
                      <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Mã TS, Serial hoặc tên..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={assetSearch}
                        onChange={(e) => searchAssets(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden">
                          {searchResults.map(a => (
                            <button 
                              key={a.id} 
                              className="w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center justify-between group"
                              onClick={() => { if(!selectedAssets.find(x => x.id === a.id)) setSelectedAssets([...selectedAssets, a]); setAssetSearch(''); setSearchResults([]); }}
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">{a.assetName}</p>
                                <p className="text-[10px] font-bold text-slate-400">{a.assetCode} • {a.currentUserName || 'Trong kho'}</p>
                              </div>
                              <Plus className="h-5 w-5 text-slate-300 group-hover:text-primary-600" />
                            </button>
                          ))}
                        </div>
                      )}
                   </div>

                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedAssets.map(a => (
                        <div key={a.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all border border-transparent hover:border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><Package className="h-5 w-5" /></div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{a.assetName}</p>
                              <p className="text-[10px] font-bold text-slate-400">{a.assetCode}</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedAssets(selectedAssets.filter(x => x.id !== a.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      {selectedAssets.length === 0 && (
                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 italic text-sm">
                          Chưa có tài sản nào được chọn.
                        </div>
                      )}
                   </div>
                </div>

                <div className="p-6 bg-primary-50 rounded-[2rem] border border-primary-100">
                   <p className="text-xs text-primary-700 font-bold leading-relaxed">
                     <ShieldAlert className="inline h-4 w-4 mr-1 mb-1" /> Lưu ý: Nhân viên QLTS có trách nhiệm kiểm tra thực tế tình trạng tài sản trước khi lập hồ sơ.
                   </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex space-x-4">
              <button 
                onClick={() => setShowCreate(false)}
                className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-500 hover:bg-white transition-all uppercase tracking-widest text-xs"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreate}
                className="flex-[2] bg-primary-600 text-white px-8 py-5 rounded-2xl font-black hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200 uppercase tracking-widest text-xs"
              >
                Tạo hồ sơ nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
