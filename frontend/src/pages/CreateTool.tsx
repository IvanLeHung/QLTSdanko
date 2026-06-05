import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Building2, 
  Tag, 
  MapPin, 
  Loader2, 
  Coins,
  ClipboardList
} from 'lucide-react';

const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Văn phòng C6': [
      'Mặt trước Khối I',
      'Mặt sau Khối I',
      'Kho',
      'Mặt trước Khối II',
      'Mặt sau Khối II',
      'Tầng 9 Khối I',
      'Tầng 2 Khối II'
    ],
    'Vân Canh': ['Kho']
  },
  'Thái Nguyên': {
    'Danko City': ['Trung tâm thương mại', 'Văn phòng BQLDA', 'Kho'],
    'Danko Avenue': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko Sun River': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Bắc Giang': {
    'Danko Riverside': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Tuyên Quang': {
    'Danko Center': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Thanh Hóa': {
    'Danko Royal': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko The Country': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Phú Thọ': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  },
  'Hà Nam': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  }
};

export const CreateTool: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states
  const [autoCode, setAutoCode] = useState(true);
  const [formData, setFormData] = useState({
    toolCode: '',
    toolName: '',
    category: '',
    quantity: 1,
    unit: 'Cái',
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    departmentName: '',
    locationName: '',
    currentUserName: '',
    status: 'IN_STOCK',
    initialCondition: 'Mới 100%',
    note: '',
    attachments: ''
  });

  // Location hierarchy selection states
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // Metadata loaders
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const categories = [
    'Bàn ghế văn phòng',
    'Thiết bị CNTT & Máy tính',
    'Thiết bị ngoại vi & Máy in',
    'Thiết bị gia dụng & Đồ điện',
    'Vật tư / Dụng cụ hỗ trợ',
    'Khác'
  ];

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, locRes] = await Promise.all([
          api.get('/settings/departments'),
          api.get('/settings/locations')
        ]);
        setDepartments(deptRes.data);
        setLocations(locRes.data);
      } catch (err) {
        toast.error("Không thể tải danh sách bộ phận/vị trí.");
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.toolName.trim()) {
      toast.warn("Tên CCDC không được trống.");
      return;
    }
    if (!formData.category) {
      toast.warn("Vui lòng chọn Nhóm CCDC.");
      return;
    }

    // Validate location inputs
    const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
    const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
    const locationVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

    if (!cityVal || !projectVal || !locationVal) {
      toast.warn("Vui lòng chọn đầy đủ Thành phố, Dự án và Vị trí chi tiết.");
      return;
    }

    setLoading(true);
    try {
      const fullLocation = `${cityVal}-${projectVal}-${locationVal}`;
      const payload = { 
        ...formData, 
        locationName: fullLocation 
      };
      if (autoCode) {
        delete (payload as any).toolCode; // Backend will generate the code
      }

      await api.post('/tools', payload);
      toast.success("Thêm Công cụ dụng cụ mới thành công!");
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu CCDC mới.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div>
        <button 
          onClick={() => navigate('/tools')} 
          className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs mb-2 border-0 bg-transparent cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
        </button>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Thêm mới Công cụ dụng cụ
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Khai báo CCDC mới vào sổ quản lý, tự động sinh mã hoặc cấu hình mã thủ công.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: CORE INFO (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3 border-b border-slate-100 pb-3">
              <ClipboardList className="h-5 w-5 text-primary-500" />
              1. Thông tin chung
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên công cụ dụng cụ *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Bàn làm việc gỗ ép 1m2..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.toolName}
                  onChange={e => setFormData({ ...formData, toolName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Nhóm CCDC *</label>
                <select 
                  required
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">-- Chọn nhóm --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Đơn vị tính</label>
                <input 
                  type="text" 
                  placeholder="Cái, chiếc, bộ, ram..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Số lượng</label>
                  <input 
                    type="number" 
                    min={1}
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4 text-center"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Trạng thái khởi tạo</label>
                  <select 
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="IN_STOCK">Trong kho</option>
                    <option value="USING">Đang sử dụng</option>
                    <option value="DAMAGED">Báo hỏng</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tình trạng ban đầu</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  placeholder="Mới 100%, Đã qua sử dụng..."
                  value={formData.initialCondition}
                  onChange={e => setFormData({ ...formData, initialCondition: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ghi chú</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 h-24"
                  placeholder="Thông tin phụ trợ, quy cách kỹ thuật..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: SEQUENCE & FINANCE & ALLOCATION (1 col) */}
          <div className="space-y-6">
            
            {/* CARD A: CODE GENERATION */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <Tag className="h-4 w-4 text-primary-500" />
                Mã định danh CCDC
              </h3>
              
              <div className="flex items-center gap-2 py-1">
                <input 
                  type="checkbox" 
                  id="autoCodeCheck"
                  checked={autoCode}
                  onChange={e => setAutoCode(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="autoCodeCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Tự động sinh mã (Đề xuất)
                </label>
              </div>

              {!autoCode && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nhập mã CCDC thủ công *</label>
                  <input 
                    type="text" 
                    required={!autoCode}
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-mono font-bold uppercase py-3 px-4"
                    placeholder="CCDC.HCNS.2026.0001"
                    value={formData.toolCode}
                    onChange={e => setFormData({ ...formData, toolCode: e.target.value })}
                  />
                </div>
              )}

              {autoCode && (
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Mã sẽ tự động khởi tạo dạng <code className="font-mono text-primary-600 bg-slate-50 px-1 py-0.5 rounded">CCDC.&#123;BOPHAN&#125;.&#123;NAM&#125;.&#123;STT&#125;</code> sau khi bấm Lưu.
                </p>
              )}
            </div>

            {/* CARD B: FINANCE & ALLOCATION */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <Coins className="h-4 w-4 text-primary-500" />
                Thông tin Tài chính
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Đơn giá / Giá trị mua (VNĐ)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 text-right"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ngày mua</label>
                  <input 
                    type="date" 
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.purchaseDate}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nhà cung cấp</label>
                  <input 
                    type="text" 
                    placeholder="Tên nhà cung cấp..."
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.supplierName}
                    onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* CARD C: ALLOCATION */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="h-4 w-4 text-primary-500" />
                Vị trí & Bàn giao ngay
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Phòng ban quản lý/sử dụng</label>
                  <input 
                    type="text"
                    list="department-suggestions"
                    placeholder="Nhập hoặc chọn phòng ban..."
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.departmentName}
                    onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                  />
                  <datalist id="department-suggestions">
                    {departments.map(d => <option key={d.id} value={d.name} />)}
                  </datalist>
                </div>

                {/* 1. Thành phố */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Thành phố *</label>
                  <select 
                    required
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-3 px-4"
                    value={selectedCity}
                    onChange={e => {
                      setSelectedCity(e.target.value);
                      setSelectedProject('');
                      setSelectedLocation('');
                      setCustomCity('');
                      setCustomProject('');
                      setCustomLocation('');
                    }}
                  >
                    <option value="">-- Chọn thành phố --</option>
                    {Object.keys(LOCATION_HIERARCHY).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {selectedCity === 'Khác' && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ghi rõ thành phố khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập tên thành phố..."
                      className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                      value={customCity}
                      onChange={e => setCustomCity(e.target.value)}
                    />
                  </div>
                )}

                {/* 2. Dự án */}
                {selectedCity && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Dự án *</label>
                    <select 
                      required
                      className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-3 px-4"
                      value={selectedProject}
                      onChange={e => {
                        setSelectedProject(e.target.value);
                        setSelectedLocation('');
                        setCustomProject('');
                        setCustomLocation('');
                      }}
                    >
                      <option value="">-- Chọn dự án --</option>
                      {selectedCity !== 'Khác' && Object.keys(LOCATION_HIERARCHY[selectedCity] || {}).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                )}

                {selectedProject === 'Khác' && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ghi rõ dự án khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập tên dự án..."
                      className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                      value={customProject}
                      onChange={e => setCustomProject(e.target.value)}
                    />
                  </div>
                )}

                {/* 3. Vị trí chi tiết */}
                {selectedProject && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Vị trí chi tiết *</label>
                    <select 
                      required
                      className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-3 px-4"
                      value={selectedLocation}
                      onChange={e => {
                        setSelectedLocation(e.target.value);
                        setCustomLocation('');
                      }}
                    >
                      <option value="">-- Chọn vị trí --</option>
                      {selectedCity !== 'Khác' && selectedProject !== 'Khác' && (LOCATION_HIERARCHY[selectedCity]?.[selectedProject] || []).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                )}

                {selectedLocation === 'Khác' && (
                  <div className="space-y-1.5">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ghi rõ vị trí khác *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nhập vị trí chi tiết..."
                      className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                      value={customLocation}
                      onChange={e => setCustomLocation(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Người sử dụng</label>
                  <input 
                    type="text" 
                    placeholder="Họ tên nhân viên bàn giao..."
                    className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.currentUserName}
                    onChange={e => setFormData({ ...formData, currentUserName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex justify-end gap-3 bg-slate-50 p-6 rounded-3xl border border-slate-200">
          <button 
            type="button" 
            onClick={() => navigate('/tools')}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-primary-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thông tin
          </button>
        </div>
      </form>
    </div>
  );
};
