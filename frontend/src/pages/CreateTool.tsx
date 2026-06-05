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
  ClipboardList,
  ShieldCheck,
  FileText,
  Trash2,
  FolderOpen,
  AlertCircle
} from 'lucide-react';

const CATEGORY_TREE: Record<string, string[]> = {
  '01 Nội thất': ['Bàn làm việc', 'Ghế văn phòng', 'Tủ tài liệu / Kệ sách', 'Sofa / Bàn trà', 'Khác'],
  '02 Decor / Trang trí': ['Decor sự kiện', 'Tranh treo tường', 'Hoa / Chậu cây', 'Đèn trang trí', 'Concept Noel/Tết', 'Khác'],
  '03 Bất động sản - Tòa nhà': ['Thiết bị tòa nhà', 'Hệ thống chiếu sáng', 'Hệ thống cửa/khóa', 'Trang thiết bị vệ sinh', 'Khác'],
  '04 Marketing / POSM': ['Standee / Banner', 'Backdrop / Khung backdrop', 'Quầy kệ trưng bày', 'Vật phẩm quảng cáo', 'Khác'],
  '05 Branding': ['Ấn phẩm thương hiệu', 'Đồng phục', 'Biển hiệu công ty', 'Khác'],
  '06 Event Equipment': ['Thiết bị âm thanh', 'Thiết bị ánh sáng', 'Sân khấu / Bục phát biểu', 'Khung giàn truss', 'Phụ kiện sự kiện', 'Khác'],
  '07 F&B / Tiệc': ['Bàn ghế tiệc', 'Ly / Cốc / Chén / Dĩa', 'Dụng cụ bếp', 'Khay phục vụ', 'Khác'],
  '08 Dịch vụ vận hành': ['Xe đẩy hàng', 'Thang nhôm', 'Thiết bị vệ sinh', 'Dụng cụ sửa chữa nhanh', 'Khác'],
  '09 IT & Digital': ['Máy tính xách tay / Laptop', 'Máy tính để bàn', 'Màn hình máy tính', 'Thiết bị mạng (Router/Switch)', 'Máy in / Máy photocopy / Scan', 'Phụ kiện máy tính', 'Khác'],
  '10 Media Production': ['Máy ảnh', 'Máy quay phim', 'Ống kính (Lens)', 'Chân máy (Tripod/Gimbal)', 'Đèn studio / Tấm phản sáng', 'Mic thu âm', 'Khác'],
  '11 Kho vận': ['Xe nâng tay', 'Pallet nhựa/gỗ', 'Thùng nhựa / Hộp chứa', 'Cân điện tử', 'Khác'],
  '12 Costume / Đạo cụ': ['Trang phục biểu diễn', 'Đồ hóa trang / Mặt nạ', 'Vũ khí giả / Đồ gỗ diễn', 'Khác'],
  '13 Công cụ kỹ thuật': ['Máy khoan / Máy bắt vít', 'Máy cắt / Máy mài', 'Bộ tua vít / Cờ lê / Mỏ lết', 'Thiết bị đo điện / nhiệt độ', 'Khác'],
  '14 Safety / PCCC': ['Bình chữa cháy', 'Vòi / Lăng chữa cháy', 'Đèn chỉ dẫn thoát hiểm (Exit)', 'Hộp sơ cứu / Túi cứu thương', 'Khác'],
  '15 Vật tư tiêu hao': ['Giấy in / Văn phòng phẩm', 'Băng keo / Màng PE', 'Pin / Bóng đèn dự phòng', 'Khác'],
  '16 Merchandise': ['Quà tặng đối tác', 'Áo thun / Mũ thương hiệu', 'Khác'],
  '99 Khác': ['Chưa phân loại']
};

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

const MEMBER_COMPANIES = [
  'Danko Group',
  'Danko City BQL',
  'Danko Avenue BQL',
  'Danko Center BQL',
  'Danko Royal BQL',
  'Công ty Vận tải & Kho vận Danko',
  'Khác'
];

export const CreateTool: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [autoCode, setAutoCode] = useState(true);

  // Core Form State
  const [formData, setFormData] = useState({
    toolCode: '',
    toolName: '',
    managementType: 'INDIVIDUAL', // INDIVIDUAL, QUANTITY, BUNDLE
    quantity: 1,
    unit: 'Cái',
    status: 'IN_STOCK',
    initialCondition: 'Mới 100%',
    note: '',
    
    // Financial properties
    purchasePrice: 0,
    vat: 0,
    shippingInstallCost: 0,
    totalAmount: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    fundingSource: 'MUA_MOI',
    expectedUsefulLife: '',
    expectedResidualValue: '',

    // Location / User info
    companyName: 'Danko Group',
    floorName: 'Tầng 1',
    specificLocation: '',
    departmentName: '',
    currentUserName: '',
    handoverDate: ''
  });

  // Level selections
  const [selectedParentCategory, setSelectedParentCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const [customCity, setCustomCity] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // Operational Specs State
  const [operationalSpecs, setOperationalSpecs] = useState<Record<string, any>>({
    // Event
    usageCount: 0,
    maxUsageCount: 0,
    lastUsedDate: '',
    comboKitName: '',
    // Decor
    collectionConcept: '',
    season: 'Thường xuyên',
    // F&B
    capacity: '',
    material: '',
    color: '',
    size: '',
  });

  // Warranty State
  const [warrantyInfo, setWarrantyInfo] = useState({
    warrantyMonths: '',
    warrantyProvider: '',
    warrantyPhone: '',
    warrantyNote: ''
  });

  // Files State
  const [files, setFiles] = useState({
    avatarUrl: '',
    photoUrl: '',
    invoiceUrl: '',
    warrantyCardUrl: '',
    manualUrl: '',
    documentUrl: ''
  });

  // Custom Fields State (dynamic key-value array)
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  // Metadata from settings API
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

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

  // Reactive Total Amount Calculation
  useEffect(() => {
    const price = Number(formData.purchasePrice) || 0;
    const vat = Number(formData.vat) || 0;
    const qty = Number(formData.quantity) || 1;
    const shipping = Number(formData.shippingInstallCost) || 0;
    const total = (price * (1 + vat / 100) * qty) + shipping;
    
    setFormData(prev => ({
      ...prev,
      totalAmount: total
    }));
  }, [formData.purchasePrice, formData.vat, formData.quantity, formData.shippingInstallCost]);

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, fieldKey: 'key' | 'value', val: string) => {
    const updated = [...customFields];
    updated[index][fieldKey] = val;
    setCustomFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.toolName.trim()) {
      toast.warn("Tên CCDC không được trống.");
      return;
    }
    if (!selectedParentCategory) {
      toast.warn("Vui lòng chọn Nhóm CCDC cấp 1.");
      return;
    }

    // Resolve location values
    const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
    const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
    const areaVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

    if (!cityVal || !projectVal || !areaVal) {
      toast.warn("Vui lòng nhập/chọn đầy đủ Thành phố, Dự án và Vị trí chi tiết.");
      return;
    }

    setLoading(true);
    try {
      const categoryPath = selectedSubCategory 
        ? `${selectedParentCategory} - ${selectedSubCategory}` 
        : selectedParentCategory;

      // Location full string
      const fullLocationString = [
        formData.companyName, 
        cityVal, 
        projectVal, 
        formData.floorName, 
        areaVal, 
        formData.specificLocation
      ].filter(Boolean).join(' - ');

      // Build specific operationalSpecsJson based on category
      const specs: Record<string, any> = {};
      const parentLower = selectedParentCategory.toLowerCase();
      if (parentLower.includes('event')) {
        specs.usageCount = Number(operationalSpecs.usageCount) || 0;
        specs.maxUsageCount = Number(operationalSpecs.maxUsageCount) || 0;
        specs.lastUsedDate = operationalSpecs.lastUsedDate || null;
        specs.comboKitName = operationalSpecs.comboKitName || '';
      } else if (parentLower.includes('decor')) {
        specs.collectionConcept = operationalSpecs.collectionConcept || '';
        specs.season = operationalSpecs.season || 'Thường xuyên';
        specs.usageCount = Number(operationalSpecs.usageCount) || 0;
      } else if (parentLower.includes('fb') || parentLower.includes('tiệc') || parentLower.includes('f&b')) {
        specs.capacity = operationalSpecs.capacity || '';
        specs.material = operationalSpecs.material || '';
        specs.color = operationalSpecs.color || '';
        specs.size = operationalSpecs.size || '';
        specs.comboKitName = operationalSpecs.comboKitName || '';
      }

      // Convert custom fields to key-value object
      const customObj: Record<string, string> = {};
      customFields.forEach(f => {
        if (f.key.trim()) {
          customObj[f.key.trim()] = f.value;
        }
      });

      const payload = {
        toolCode: autoCode ? undefined : formData.toolCode,
        toolName: formData.toolName,
        category: categoryPath,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit,
        status: formData.status,
        initialCondition: formData.initialCondition,
        note: formData.note,
        
        // Finance
        purchasePrice: Number(formData.purchasePrice) || 0,
        vat: Number(formData.vat) || 0,
        shippingInstallCost: Number(formData.shippingInstallCost) || 0,
        totalAmount: Number(formData.totalAmount) || 0,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        supplierName: formData.supplierName,
        fundingSource: formData.fundingSource,
        expectedUsefulLife: formData.expectedUsefulLife ? Number(formData.expectedUsefulLife) : null,
        expectedResidualValue: formData.expectedResidualValue ? Number(formData.expectedResidualValue) : null,

        // Location Info
        companyName: formData.companyName,
        branchName: cityVal,
        buildingName: projectVal,
        floorName: formData.floorName,
        areaName: areaVal,
        specificLocation: formData.specificLocation,
        locationName: fullLocationString,

        // User / Handover
        departmentName: formData.departmentName,
        currentUserName: formData.currentUserName,
        handoverDate: formData.handoverDate ? new Date(formData.handoverDate) : null,

        // JSON Columns (Stringified JSON as required)
        operationalSpecsJson: Object.keys(specs).length > 0 ? JSON.stringify(specs) : null,
        filesJson: JSON.stringify(files),
        warrantyInfoJson: JSON.stringify({
          warrantyMonths: warrantyInfo.warrantyMonths ? Number(warrantyInfo.warrantyMonths) : null,
          warrantyProvider: warrantyInfo.warrantyProvider,
          warrantyPhone: warrantyInfo.warrantyPhone,
          warrantyNote: warrantyInfo.warrantyNote
        }),
        customFieldsJson: Object.keys(customObj).length > 0 ? JSON.stringify(customObj) : null
      };

      await api.post('/tools', payload);
      toast.success("Thêm mới Công cụ dụng cụ Enterprise thành công!");
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu CCDC mới.");
    } finally {
      setLoading(false);
    }
  };

  const isCategoryEvent = selectedParentCategory.toLowerCase().includes('event');
  const isCategoryDecor = selectedParentCategory.toLowerCase().includes('decor');
  const isCategoryFnB = selectedParentCategory.toLowerCase().includes('fb') || selectedParentCategory.toLowerCase().includes('tiệc') || selectedParentCategory.toLowerCase().includes('f&b');

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <button 
            type="button"
            onClick={() => navigate('/tools')} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-[10px] border-0 bg-transparent cursor-pointer mb-2"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Quay lại danh sách
          </button>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Thêm mới Công cụ dụng cụ Enterprise
          </h1>
          <p className="text-slate-500 text-xs">
            Hệ thống quản lý CCDC, Thiết bị sự kiện, Decor và F&B phân cấp nâng cao.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CORE INFO, FINANCE, DOCUMENTS & WARRANTY */}
        <div className="space-y-8">
          
          {/* SECTION 1: CORE INFO */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
              <ClipboardList className="h-5 w-5 text-primary-500" />
              1. Thông tin chung
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên công cụ dụng cụ *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Micro không dây Shure A, Ly rượu vang đỏ..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.toolName}
                  onChange={e => setFormData({ ...formData, toolName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Loại quản lý</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
                  {[
                    { value: 'INDIVIDUAL', label: 'Từng mã' },
                    { value: 'QUANTITY', label: 'Số lượng' },
                    { value: 'BUNDLE', label: 'Theo bộ/combo' }
                  ].map(item => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, managementType: item.value })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        formData.managementType === item.value 
                          ? 'bg-white text-primary-700 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.managementType === 'QUANTITY' && (
                <div className="md:col-span-2 bg-primary-50/40 border border-primary-100 p-4 rounded-2xl text-xs font-semibold text-primary-800 animate-in fade-in duration-200">
                  <p className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-primary-600" />
                    Quản lý số lượng & Biến động kho
                  </p>
                  <p>Hệ thống sẽ tự động khởi tạo lô nhập hàng đầu tiên <strong>(LOT001)</strong> với số lượng và đơn giá khai báo dưới đây, đồng thời tạo bảng cân đối tồn kho khả dụng tại địa điểm bàn giao.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Đơn vị tính</label>
                <input 
                  type="text" 
                  placeholder="Cái, chiếc, ly, bộ..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Số lượng</label>
                <input 
                  type="number" 
                  min={1}
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
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
                  <option value="IN_STOCK">Trong kho (Chờ cấp)</option>
                  <option value="USING">Đang sử dụng</option>
                  <option value="DAMAGED">Báo hỏng</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tình trạng ban đầu</label>
                <input 
                  type="text" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  placeholder="Mới 100%, cũ hỏng nhẹ..."
                  value={formData.initialCondition}
                  onChange={e => setFormData({ ...formData, initialCondition: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ghi chú</label>
                <textarea 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 h-24"
                  placeholder="Nhập thông tin mô tả bổ sung..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: FINANCE */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
              <Coins className="h-5 w-5 text-primary-500" />
              2. Thông tin tài chính & Hạch toán
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Đơn giá mua (VNĐ)</label>
                <input 
                  type="number" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.purchasePrice || ''}
                  onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Thuế VAT (%)</label>
                <input 
                  type="number" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.vat || ''}
                  onChange={e => setFormData({ ...formData, vat: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Phí vận chuyển/lắp đặt (VNĐ)</label>
                <input 
                  type="number" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.shippingInstallCost || ''}
                  onChange={e => setFormData({ ...formData, shippingInstallCost: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng giá trị (Tự động tính)</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800">
                  {formData.totalAmount.toLocaleString()} VNĐ
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ngày mua</label>
                <input 
                  type="date" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.purchaseDate}
                  onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Nhà cung cấp</label>
                <input 
                  type="text" 
                  placeholder="Tên nhà cung cấp..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.supplierName}
                  onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Nguồn hình thành</label>
                <select 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.fundingSource}
                  onChange={e => setFormData({ ...formData, fundingSource: e.target.value })}
                >
                  <option value="MUA_MOI">Mua mới</option>
                  <option value="DIEU_CHUYEN">Điều chuyển nội bộ</option>
                  <option value="TU_SAN_XUAT">Tự sản xuất</option>
                  <option value="KHACH_HANG_BAN_GIAO">Khách hàng bàn giao</option>
                  <option value="TAI_TRO">Được tài trợ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Hạn dùng (Tháng)</label>
                  <input 
                    type="number" 
                    placeholder="Ví dụ: 36..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.expectedUsefulLife}
                    onChange={e => setFormData({ ...formData, expectedUsefulLife: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">G.trị còn lại dự kiến</label>
                  <input 
                    type="number" 
                    placeholder="Giá trị thanh lý..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                    value={formData.expectedResidualValue}
                    onChange={e => setFormData({ ...formData, expectedResidualValue: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: WARRANTY & FILES */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
              3. Bảo hành & Hồ sơ đính kèm
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Hạn bảo hành (Tháng)</label>
                <input 
                  type="number" 
                  placeholder="Ví dụ: 12..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                  value={warrantyInfo.warrantyMonths}
                  onChange={e => setWarrantyInfo({ ...warrantyInfo, warrantyMonths: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Đơn vị bảo hành</label>
                <input 
                  type="text" 
                  placeholder="Tên trung tâm bảo hành..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                  value={warrantyInfo.warrantyProvider}
                  onChange={e => setWarrantyInfo({ ...warrantyInfo, warrantyProvider: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">SĐT Hỗ trợ kỹ thuật</label>
                <input 
                  type="text" 
                  placeholder="SĐT liên hệ bảo hành..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                  value={warrantyInfo.warrantyPhone}
                  onChange={e => setWarrantyInfo({ ...warrantyInfo, warrantyPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ghi chú bảo hành</label>
                <input 
                  type="text" 
                  placeholder="Điều kiện bảo hành..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                  value={warrantyInfo.warrantyNote}
                  onChange={e => setWarrantyInfo({ ...warrantyInfo, warrantyNote: e.target.value })}
                />
              </div>

              <hr className="md:col-span-2 border-slate-100" />
              <h3 className="md:col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Hồ sơ tài liệu đính kèm (Nhập Link URL)</h3>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Link ảnh đại diện CCDC</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.avatarUrl}
                  onChange={e => setFiles({ ...files, avatarUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Link ảnh thực tế sản phẩm</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.photoUrl}
                  onChange={e => setFiles({ ...files, photoUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Link hóa đơn mua hàng / VAT</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.invoiceUrl}
                  onChange={e => setFiles({ ...files, invoiceUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Link thẻ bảo hành</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.warrantyCardUrl}
                  onChange={e => setFiles({ ...files, warrantyCardUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Link sách hướng dẫn sử dụng (HDSD)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.manualUrl}
                  onChange={e => setFiles({ ...files, manualUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tài liệu kỹ thuật khác</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs py-3 px-4 bg-slate-50/50"
                  value={files.documentUrl}
                  onChange={e => setFiles({ ...files, documentUrl: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORIZATION, LOCATION, OPERATIONAL SPECS & CUSTOM FIELDS */}
        <div className="space-y-8">
          
          {/* SECTION 4: CLASSIFICATION & IDENTIFICATION */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
              <Tag className="h-5 w-5 text-primary-500" />
              4. Phân loại & Mã định danh
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Nhóm CCDC cấp 1 *</label>
                <select 
                  required
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={selectedParentCategory}
                  onChange={e => {
                    setSelectedParentCategory(e.target.value);
                    setSelectedSubCategory('');
                  }}
                >
                  <option value="">-- Chọn nhóm cấp 1 --</option>
                  {Object.keys(CATEGORY_TREE).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Nhóm CCDC cấp 2 *</label>
                <select 
                  required
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={selectedSubCategory}
                  onChange={e => setSelectedSubCategory(e.target.value)}
                  disabled={!selectedParentCategory}
                >
                  <option value="">-- Chọn nhóm cấp 2 --</option>
                  {selectedParentCategory && CATEGORY_TREE[selectedParentCategory].map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 border-t border-slate-100 pt-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mã định danh CCDC</h3>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="autoCodeCheck"
                    checked={autoCode}
                    onChange={e => setAutoCode(e.target.checked)}
                    className="rounded border-slate-300 h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="autoCodeCheck" className="text-xs font-black text-slate-700 cursor-pointer">
                    Tự động sinh mã (Đề xuất)
                  </label>
                </div>

                {!autoCode ? (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mã định danh thủ công *</label>
                    <input 
                      type="text" 
                      required={!autoCode}
                      className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-mono font-bold uppercase py-3.5 px-4 bg-slate-50"
                      placeholder="CCDC.DECOR.HN.2026.00001"
                      value={formData.toolCode}
                      onChange={e => setFormData({ ...formData, toolCode: e.target.value })}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Mã sẽ tự động khởi tạo dạng <code className="font-mono text-primary-650 bg-slate-50 px-1 py-0.5 rounded">CCDC.&#123;NHOM&#125;.&#123;DONVI&#125;.&#123;NAM&#125;.&#123;STT&#125;</code> sau khi bấm Lưu.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: LOCATION HIERARCHY */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
              <MapPin className="h-5 w-5 text-primary-500" />
              5. Vị trí phân cấp & Bàn giao
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Công ty thành viên *</label>
                <select 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                >
                  {MEMBER_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 1. Thành phố / Chi nhánh */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Chi nhánh / Thành phố *</label>
                <select 
                  required
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
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
                  <option value="">-- Chọn chi nhánh --</option>
                  {Object.keys(LOCATION_HIERARCHY).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {selectedCity === 'Khác' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên chi nhánh khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập tên chi nhánh..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                    value={customCity}
                    onChange={e => setCustomCity(e.target.value)}
                  />
                </div>
              )}

              {/* 2. Dự án / Tòa nhà */}
              {selectedCity && (
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tòa nhà / Dự án *</label>
                  <select 
                    required
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                    value={selectedProject}
                    onChange={e => {
                      setSelectedProject(e.target.value);
                      setSelectedLocation('');
                      setCustomProject('');
                      setCustomLocation('');
                    }}
                  >
                    <option value="">-- Chọn tòa nhà/dự án --</option>
                    {selectedCity !== 'Khác' && Object.keys(LOCATION_HIERARCHY[selectedCity] || {}).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              )}

              {selectedProject === 'Khác' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên dự án/tòa nhà khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập tên dự án/tòa nhà..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                    value={customProject}
                    onChange={e => setCustomProject(e.target.value)}
                  />
                </div>
              )}

              {/* 3. Tầng */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tầng</label>
                <select 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                  value={formData.floorName}
                  onChange={e => setFormData({ ...formData, floorName: e.target.value })}
                >
                  {['Tầng hầm B2', 'Tầng hầm B1', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7', 'Tầng 8', 'Tầng 9', 'Tầng 10', 'Tầng kỹ thuật', 'Khác'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* 4. Khu vực đặt */}
              {selectedProject && (
                <div className="space-y-1.5">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Khu vực đặt *</label>
                  <select 
                    required
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4"
                    value={selectedLocation}
                    onChange={e => {
                      setSelectedLocation(e.target.value);
                      setCustomLocation('');
                    }}
                  >
                    <option value="">-- Chọn khu vực --</option>
                    {selectedCity !== 'Khác' && selectedProject !== 'Khác' && (LOCATION_HIERARCHY[selectedCity]?.[selectedProject] || []).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              )}

              {selectedLocation === 'Khác' && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên khu vực khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập khu vực..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                    value={customLocation}
                    onChange={e => setCustomLocation(e.target.value)}
                  />
                </div>
              )}

              {/* 5. Vị trí chi tiết */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Vị trí chi tiết / Số phòng</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phòng họp tầng 9, Phòng Kế toán..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                  value={formData.specificLocation}
                  onChange={e => setFormData({ ...formData, specificLocation: e.target.value })}
                />
              </div>

              <hr className="md:col-span-2 border-slate-100" />

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Phòng ban sử dụng</label>
                <input 
                  type="text"
                  list="department-suggestions"
                  placeholder="Nhập hoặc chọn phòng ban..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.departmentName}
                  onChange={e => setFormData({ ...formData, departmentName: e.target.value })}
                />
                <datalist id="department-suggestions">
                  {departments.map(d => <option key={d.id} value={d.name} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Người sử dụng</label>
                <input 
                  type="text" 
                  placeholder="Họ tên người nhận bàn giao..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.currentUserName}
                  onChange={e => setFormData({ ...formData, currentUserName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ngày bàn giao</label>
                <input 
                  type="date" 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4"
                  value={formData.handoverDate}
                  onChange={e => setFormData({ ...formData, handoverDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 6: OPERATIONAL SPECS (DYNAMIC BY CATEGORY) */}
          {(isCategoryEvent || isCategoryDecor || isCategoryFnB) && (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-350">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-3">
                <ClipboardList className="h-5 w-5 text-primary-500" />
                6. Thông số vận hành đặc thù
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isCategoryEvent && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Số lần đã sử dụng</label>
                      <input 
                        type="number" 
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.usageCount}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, usageCount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Số lần sử dụng tối đa</label>
                      <input 
                        type="number" 
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.maxUsageCount}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, maxUsageCount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Ngày sử dụng gần nhất</label>
                      <input 
                        type="date" 
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.lastUsedDate}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, lastUsedDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Tên bộ / combo sự kiện</label>
                      <input 
                        type="text" 
                        placeholder="Bộ backdrop, combo âm thanh..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.comboKitName}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, comboKitName: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {isCategoryDecor && (
                  <>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Bộ sưu tập / concept thiết kế</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: Concept Giáng sinh 2025, Hoa văn cổ điển..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.collectionConcept}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, collectionConcept: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Mùa vụ áp dụng</label>
                      <select 
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3.5 px-4 bg-slate-50"
                        value={operationalSpecs.season}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, season: e.target.value })}
                      >
                        <option value="Thường xuyên">Thường xuyên</option>
                        <option value="Tết Nguyên Đán">Tết Nguyên Đán</option>
                        <option value="Trung thu">Trung thu</option>
                        <option value="Noel / Giáng sinh">Noel / Giáng sinh</option>
                        <option value="Mùa hè">Mùa hè</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Số lần sử dụng thực tế</label>
                      <input 
                        type="number" 
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.usageCount}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, usageCount: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {isCategoryFnB && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Dung tích (ml / lít)</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: 350ml, 1.5L..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.capacity}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, capacity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Chất liệu</label>
                      <input 
                        type="text" 
                        placeholder="Thủy tinh, sứ, nhựa melamine..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.material}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, material: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Màu sắc</label>
                      <input 
                        type="text" 
                        placeholder="Trong suốt, đỏ ruby..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.color}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Kích thước</label>
                      <input 
                        type="text" 
                        placeholder="Đường kính, chiều cao..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.size}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, size: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider">Bộ combo tiệc áp dụng</label>
                      <input 
                        type="text" 
                        placeholder="Bộ chén dĩa tiệc cưới, combo ly vang..."
                        className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold py-3 px-4 bg-slate-50"
                        value={operationalSpecs.comboKitName}
                        onChange={e => setOperationalSpecs({ ...operationalSpecs, comboKitName: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION 7: CUSTOM FIELDS */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-primary-500" />
                7. Thuộc tính tự định nghĩa
              </h2>
              <button 
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm trường
              </button>
            </div>

            <div className="space-y-4">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-top-2 duration-150">
                  <input 
                    type="text" 
                    placeholder="Tên thuộc tính (e.g. Công suất, Cổng kết nối)"
                    className="flex-1 rounded-xl border-slate-200 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={field.key}
                    onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Giá trị"
                    className="flex-1 rounded-xl border-slate-200 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={field.value}
                    onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => removeCustomField(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {customFields.length === 0 && (
                <p className="text-xs text-slate-400 font-semibold italic text-center py-4">Chưa thêm thuộc tính mở rộng nào.</p>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="lg:col-span-2 flex justify-end gap-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
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
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thông tin CCDC
          </button>
        </div>
      </form>
    </div>
  );
};
