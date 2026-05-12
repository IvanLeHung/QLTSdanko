import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Save, 
  PackagePlus, 
  Info, 
  Building2, 
  Tag, 
  Hash,
  UserPlus
} from 'lucide-react';

export const CreateAsset: React.FC = () => {
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [cat1List, setCat1List] = useState<any[]>([]);
  const [cat2List, setCat2List] = useState<any[]>([]);
  const [cat3List, setCat3List] = useState<any[]>([]);
  const [cat4List, setCat4List] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyId: '',
    cat1Id: '',
    cat2Id: '',
    cat3Id: '',
    cat4Id: '',
    assetName: '',
    quantity: 1,
    purchasePriceExVat: 0,
    supplierName: '',
    purchaseDate: '',
    documentNo: '',
    note: '',
    assignImmediately: false,
    recipientName: '',
    recipientDepartment: ''
  });

  const [previewCode, setPreviewCode] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [compRes, catRes] = await Promise.all([
          api.get('/assets/companies/active'),
          api.get('/assets/categories/active/roots')
        ]);
        setCompanies(compRes.data);
        setCat1List(catRes.data);
      } catch (err) {
        toast.error("Failed to load metadata");
      }
    };
    loadInitialData();
  }, []);

  const handleCatChange = async (level: number, id: string) => {
    const numId = id ? parseInt(id) : null;
    if (level === 1) {
      setFormData(prev => ({ ...prev, cat1Id: id, cat2Id: '', cat3Id: '', cat4Id: '' }));
      setCat2List([]); setCat3List([]); setCat4List([]);
      if (numId) {
        const res = await api.get(`/assets/categories/active/children/${numId}`);
        setCat2List(res.data);
      }
    } else if (level === 2) {
      setFormData(prev => ({ ...prev, cat2Id: id, cat3Id: '', cat4Id: '' }));
      setCat3List([]); setCat4List([]);
      if (numId) {
        const res = await api.get(`/assets/categories/active/children/${numId}`);
        setCat3List(res.data);
      }
    } else if (level === 3) {
      setFormData(prev => ({ ...prev, cat3Id: id, cat4Id: '' }));
      setCat4List([]);
      if (numId) {
        const res = await api.get(`/assets/categories/active/children/${numId}`);
        setCat4List(res.data);
      }
    } else if (level === 4) {
      setFormData(prev => ({ ...prev, cat4Id: id }));
    }
  };

  useEffect(() => {
    if (formData.companyId && formData.cat1Id && formData.cat2Id && formData.cat3Id && formData.cat4Id) {
      const comp = companies.find(c => c.id.toString() === formData.companyId)?.code || '__';
      const c1 = cat1List.find(c => c.id.toString() === formData.cat1Id)?.code || '__';
      const c2 = cat2List.find(c => c.id.toString() === formData.cat2Id)?.code || '__';
      const c3 = cat3List.find(c => c.id.toString() === formData.cat3Id)?.code || '__';
      const c4 = cat4List.find(c => c.id.toString() === formData.cat4Id)?.code || '__';
      setPreviewCode(`${comp}.${c1}.${c2}.${c3}.${c4}.NNN`);
    } else {
      setPreviewCode('');
    }
  }, [formData, companies, cat1List, cat2List, cat3List, cat4List]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const company = companies.find(c => c.id.toString() === formData.companyId);
    const cat1 = cat1List.find(c => c.id.toString() === formData.cat1Id);
    const cat2 = cat2List.find(c => c.id.toString() === formData.cat2Id);
    const cat3 = cat3List.find(c => c.id.toString() === formData.cat3Id);
    const cat4 = cat4List.find(c => c.id.toString() === formData.cat4Id);

    try {
      await api.post('/creation/batch', {
        ...formData,
        companyCode: company.code,
        companyName: company.name,
        level1Code: cat1.code,
        level1Name: cat1.name,
        level2Code: cat2.code,
        level2Name: cat2.name,
        level3Code: cat3.code,
        level3Name: cat3.name,
        level4Code: cat4.code,
        level4Name: cat4.name,
        price: formData.purchasePriceExVat,
        supplier: formData.supplierName
      });
      toast.success(`Đã cấp mới ${formData.quantity} tài sản thành công.`);
      navigate('/assets');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cấp mới tài sản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại sổ tài sản
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center">
              <div className="bg-primary-600 p-5 rounded-3xl shadow-xl shadow-primary-100 mr-6 text-white">
                <PackagePlus className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none mb-2">Cấp mới tài sản</h1>
                <p className="text-slate-500 font-medium text-lg italic">Operational Batch Creation Workflow</p>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl min-w-[320px] border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Cấu trúc mã tự động</span>
                <Info className="h-4 w-4 text-slate-600" />
              </div>
              <p className="text-2xl font-mono font-black text-primary-400 tracking-tighter">
                {previewCode || <span className="text-slate-700">PENDING_SELECT</span>}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 md:p-14 space-y-16">
          <div className="space-y-10">
            <div className="flex items-center space-x-4 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600"><Building2 className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">1. Phân loại & Nguồn gốc</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Công ty thành viên *</label>
                <select className="input-field-rich" required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})}>
                  <option value="">Chọn Công ty</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nhóm Cấp 1 *</label>
                <select className="input-field-rich" required value={formData.cat1Id} onChange={e => handleCatChange(1, e.target.value)}>
                  <option value="">Chọn nhóm</option>
                  {cat1List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Danh mục Cấp 2 *</label>
                <select className="input-field-rich" required disabled={!formData.cat1Id} value={formData.cat2Id} onChange={e => handleCatChange(2, e.target.value)}>
                  <option value="">Chọn danh mục</option>
                  {cat2List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Loại TS Cấp 3 *</label>
                <select className="input-field-rich" required disabled={!formData.cat2Id} value={formData.cat3Id} onChange={e => handleCatChange(3, e.target.value)}>
                  <option value="">Chọn loại</option>
                  {cat3List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phân loại Cấp 4 *</label>
                <select className="input-field-rich" required disabled={!formData.cat3Id} value={formData.cat4Id} onChange={e => handleCatChange(4, e.target.value)}>
                  <option value="">Chọn phân loại</option>
                  {cat4List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="flex items-center space-x-4 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><Tag className="h-6 w-6" /></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">2. Thông tin chi tiết tài sản</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="space-y-3 md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tên tài sản (Gốc) *</label>
                <input type="text" className="input-field-rich" required placeholder="Ví dụ: Laptop Dell XPS 15 2024" value={formData.assetName} onChange={e => setFormData({...formData, assetName: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Số lượng nhập mới *</label>
                <input type="number" min={1} className="input-field-rich" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Đơn giá (VNĐ)</label>
                <input type="number" className="input-field-rich" value={formData.purchasePriceExVat} onChange={e => setFormData({...formData, purchasePriceExVat: Number(e.target.value)})} />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</label>
                <input type="text" className="input-field-rich" value={formData.supplierName} onChange={e => setFormData({...formData, supplierName: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                   <UserPlus className="h-6 w-6 text-primary-600" />
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Cấp phát & Bàn giao ngay?</h3>
                </div>
                <input type="checkbox" className="w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-50" checked={formData.assignImmediately} onChange={e => setFormData({...formData, assignImmediately: e.target.checked})} />
             </div>
             {formData.assignImmediately && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tên người nhận</label>
                    <input type="text" className="input-field-rich bg-white" placeholder="Nguyễn Văn A" value={formData.recipientName} onChange={e => setFormData({...formData, recipientName: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Bộ phận / Phòng ban</label>
                    <input type="text" className="input-field-rich bg-white" placeholder="Phòng Hành chính" value={formData.recipientDepartment} onChange={e => setFormData({...formData, recipientDepartment: e.target.value})} />
                  </div>
               </div>
             )}
          </div>

          <div className="flex justify-end pt-10">
            <button type="submit" disabled={loading} className="btn-primary px-12 py-5 text-lg font-black shadow-2xl shadow-primary-200 flex items-center">
              {loading ? "Đang xử lý..." : <Save className="mr-3 h-6 w-6" />} Hoàn tất & Lưu vào Sổ tài sản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
