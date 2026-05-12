import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Building2, 
  ClipboardList, 
  FileCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { AppliedFormsBlock } from '../components/AppliedFormsBlock';

export const AssetAssign: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedIds = location.state?.selectedIds || [];

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successDoc, setSuccessDoc] = useState<any>(null);

  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPosition: '',
    recipientDepartment: '',
    recipientPhone: '',
    senderName: 'Administrator', // Current user
    senderDepartment: 'HCNS',
    note: '',
    locationName: '',
    cityName: ''
  });

  useEffect(() => {
    if (selectedIds.length === 0) {
      navigate('/assets');
      return;
    }

    const fetchData = async () => {
      try {
        const [assetRes, deptRes, locRes] = await Promise.all([
          api.get('/assets', { params: { ids: selectedIds.join(',') } }), // Need to update backend to support ids filter or just fetch individual
          api.get('/settings/departments'),
          api.get('/settings/locations')
        ]);
        
        // Simple filter for the first few assets for display
        const filteredAssets = await Promise.all(selectedIds.map(id => api.get(`/assets/${id}`).then(r => r.data)));
        setAssets(filteredAssets);
        setDepartments(deptRes.data);
        setLocations(locRes.data);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedIds, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientName) {
      toast.warn("Vui lòng nhập tên người nhận");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/handover', {
        ...formData,
        assetIds: selectedIds
      });
      setSuccessDoc(res.data);
      toast.success("Tạo biên bản bàn giao thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo bàn giao");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!successDoc) return;
    try {
      const response = await api.get(`/handover/${successDoc.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BBBG_${successDoc.documentNo.replace('/', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Lỗi khi tải file PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang chuẩn bị dữ liệu bàn giao...</p>
      </div>
    );
  }

  if (successDoc) {
    return (
      <div className="max-w-2xl mx-auto mt-12 animate-in zoom-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-emerald-100 overflow-hidden">
          <div className="bg-emerald-500 p-12 text-center text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><CheckCircle2 className="h-32 w-32" /></div>
            <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              <FileCheck className="h-10 w-10" />
            </div>
            <h2 className="text-[32px] font-[800] tracking-tighter mb-2">Bàn giao thành công!</h2>
            <p className="text-emerald-50 font-[600] text-lg">Số phiếu: {successDoc.documentNo}</p>
          </div>
          
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-8 text-center">
              <div className="p-6 bg-slate-50 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Người nhận</p>
                <p className="text-[18px] font-bold text-slate-800">{successDoc.recipientName}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Số lượng tài sản</p>
                <p className="text-[18px] font-bold text-slate-800">{selectedIds.length}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleDownloadPdf} className="btn-primary w-full py-4 flex items-center justify-center text-lg font-bold shadow-xl shadow-primary-200">
                <Download className="mr-3 h-6 w-6" /> Tải biên bản (PDF)
              </button>
              <button onClick={() => navigate('/assets')} className="btn-secondary w-full py-4 flex items-center justify-center text-lg font-bold">
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-sm uppercase tracking-widest transition-colors">
          <ChevronLeft className="mr-2 h-5 w-5" /> Quay lại
        </button>
        <h1 className="text-[28px] font-[800] text-[#0F172A] tracking-tighter">Bàn giao / Điều chuyển tài sản</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: SELECTED ASSETS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-[800] text-slate-800 uppercase tracking-widest flex items-center">
                <ClipboardList className="mr-2 h-4 w-4 text-primary-600" />
                Tài sản đang chọn ({selectedIds.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {assets.map(asset => (
                <div key={asset.id} className="p-4 flex items-start space-x-4 hover:bg-slate-50 transition-colors group">
                  <div className="bg-slate-100 p-2 rounded-xl text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-[700] text-slate-800 leading-snug">{asset.assetName}</p>
                    <p className="text-[11px] font-[600] text-slate-400 mt-1 uppercase tracking-tight">{asset.assetCode}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] font-[600] text-amber-800 leading-relaxed">
              Hệ thống sẽ tự động cập nhật trạng thái của các tài sản này sang <span className="font-bold underline text-amber-900">Đang sử dụng</span> sau khi xác nhận.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200">
             <AppliedFormsBlock action="HANDOVER" isProcessing={true} />
          </div>
        </div>

        {/* RIGHT COLUMN: FORM */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 space-y-10">
              {/* SECTION 1: RECIPIENT */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600"><User className="h-6 w-6" /></div>
                  <h3 className="text-[16px] font-[800] text-slate-800 uppercase tracking-widest">Thông tin người nhận</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Họ và tên người nhận *</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm"
                      placeholder="Nhập tên nhân viên..."
                      value={formData.recipientName}
                      onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Bộ phận / Phòng ban</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm appearance-none"
                      value={formData.recipientDepartment}
                      onChange={(e) => setFormData({...formData, recipientDepartment: e.target.value})}
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Chức vụ</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm"
                      placeholder="Trưởng phòng / Nhân viên..."
                      value={formData.recipientPosition}
                      onChange={(e) => setFormData({...formData, recipientPosition: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số điện thoại</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm"
                      placeholder="09xx..."
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({...formData, recipientPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: LOCATION */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><MapPin className="h-6 w-6" /></div>
                  <h3 className="text-[16px] font-[800] text-slate-800 uppercase tracking-widest">Vị trí & Điều chuyển</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Thành phố / Dự án</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm"
                      placeholder="Hà Nội / Danko City..."
                      value={formData.cityName}
                      onChange={(e) => setFormData({...formData, cityName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Vị trí chi tiết</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm appearance-none"
                      value={formData.locationName}
                      onChange={(e) => setFormData({...formData, locationName: e.target.value})}
                    >
                      <option value="">-- Chọn vị trí --</option>
                      {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SENDER (AUTO) */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600"><Building2 className="h-6 w-6" /></div>
                  <h3 className="text-[16px] font-[800] text-slate-800 uppercase tracking-widest">Thông tin bên giao (Mặc định)</h3>
                </div>
                <div className="grid grid-cols-2 gap-6 opacity-60 grayscale-[0.5]">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Người giao</p>
                    <p className="text-[14px] font-bold text-slate-700">{formData.senderName}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phòng ban</p>
                    <p className="text-[14px] font-bold text-slate-700">{formData.senderDepartment}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ghi chú bàn giao</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[15px] font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm h-32"
                  placeholder="Lý do bàn giao, tình trạng đặc biệt..."
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200">
              <button 
                type="submit" 
                disabled={submitting}
                className="btn-primary w-full py-6 flex items-center justify-center text-xl font-[800] shadow-2xl shadow-primary-200 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" /> Đang tạo biên bản...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-3 h-6 w-6" /> Xác nhận bàn giao
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
