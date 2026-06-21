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
  AlertCircle,
  ChevronDown,
  ChevronUp
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
  'Bắc Ninh': {
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

  // Common/Shared State
  const [commonData, setCommonData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    fundingSource: 'MUA_MOI',
    companyName: 'Danko Group',
    floorName: 'Tầng 1',
    specificLocation: '',
    departmentName: '',
    currentUserName: '',
    handoverDate: '',
    
    warrantyMonths: '',
    warrantyProvider: '',
    warrantyPhone: '',
    warrantyNote: ''
  });

  // Level selections (shared)
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const [customCity, setCustomCity] = useState('');
  const [customProject, setCustomProject] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // CCDC Items list
  const [items, setItems] = useState<any[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      toolCode: '',
      toolName: '',
      managementType: 'INDIVIDUAL', // INDIVIDUAL, QUANTITY, BUNDLE
      quantity: 1,
      unit: 'Cái',
      status: 'IN_STOCK',
      initialCondition: 'Mới 100%',
      note: '',
      
      // Finance
      purchasePrice: 0,
      vat: 0,
      shippingInstallCost: 0,
      totalAmount: 0,
      expectedUsefulLife: '',
      expectedResidualValue: '',

      category1: '',
      category2: '',

      operationalSpecs: {
        usageCount: 0,
        maxUsageCount: 0,
        lastUsedDate: '',
        comboKitName: '',
        collectionConcept: '',
        season: 'Thường xuyên',
        capacity: '',
        material: '',
        color: '',
        size: '',
      },

      files: {
        avatarUrl: '',
        photoUrl: '',
        invoiceUrl: '',
        warrantyCardUrl: '',
        manualUrl: '',
        documentUrl: ''
      },

      customFields: [],
      isExpanded: true
    }
  ]);

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

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        toolCode: '',
        toolName: '',
        managementType: 'INDIVIDUAL',
        quantity: 1,
        unit: 'Cái',
        status: 'IN_STOCK',
        initialCondition: 'Mới 100%',
        note: '',
        
        purchasePrice: 0,
        vat: 0,
        shippingInstallCost: 0,
        totalAmount: 0,
        expectedUsefulLife: '',
        expectedResidualValue: '',

        category1: '',
        category2: '',

        operationalSpecs: {
          usageCount: 0,
          maxUsageCount: 0,
          lastUsedDate: '',
          comboKitName: '',
          collectionConcept: '',
          season: 'Thường xuyên',
          capacity: '',
          material: '',
          color: '',
          size: '',
        },

        files: {
          avatarUrl: '',
          photoUrl: '',
          invoiceUrl: '',
          warrantyCardUrl: '',
          manualUrl: '',
          documentUrl: ''
        },

        customFields: [],
        isExpanded: true
      }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };

  const handleItemFieldChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      if (['purchasePrice', 'vat', 'quantity', 'shippingInstallCost'].includes(field)) {
        const price = Number(updated.purchasePrice) || 0;
        const vat = Number(updated.vat) || 0;
        const qty = Number(updated.quantity) || 1;
        const shipping = Number(updated.shippingInstallCost) || 0;
        updated.totalAmount = (price * (1 + vat / 100) * qty) + shipping;
      }
      return updated;
    }));
  };

  const handleItemSpecsChange = (id: string, specField: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        operationalSpecs: {
          ...item.operationalSpecs,
          [specField]: value
        }
      };
    }));
  };

  const handleItemFilesChange = (id: string, fileField: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        files: {
          ...item.files,
          [fileField]: value
        }
      };
    }));
  };

  const handleItemCustomFieldChange = (id: string, idx: number, keyOrVal: 'key' | 'value', value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updatedFields = [...item.customFields];
      updatedFields[idx] = { ...updatedFields[idx], [keyOrVal]: value };
      return { ...item, customFields: updatedFields };
    }));
  };

  const addItemCustomField = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        customFields: [...item.customFields, { key: '', value: '' }]
      };
    }));
  };

  const removeItemCustomField = (id: string, idx: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        customFields: item.customFields.filter((_: any, i: number) => i !== idx)
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Resolve location values
    const cityVal = selectedCity === 'Khác' ? customCity : selectedCity;
    const projectVal = selectedProject === 'Khác' ? customProject : selectedProject;
    const areaVal = selectedLocation === 'Khác' ? customLocation : selectedLocation;

    if (!cityVal || !projectVal || !areaVal) {
      toast.warn("Vui lòng nhập/chọn đầy đủ Thành phố, Dự án và Vị trí chi tiết.");
      return;
    }

    // Validate items
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.toolName.trim()) {
        toast.warn(`CCDC #${idx + 1}: Vui lòng nhập tên công cụ dụng cụ.`);
        return;
      }
      if (!item.category1) {
        toast.warn(`CCDC #${idx + 1}: Vui lòng chọn Nhóm CCDC cấp 1.`);
        return;
      }
      if (!autoCode && !item.toolCode.trim()) {
        toast.warn(`CCDC #${idx + 1}: Vui lòng nhập mã định danh thủ công.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = items.map(item => {
        const categoryPath = item.category2 
          ? `${item.category1} - ${item.category2}` 
          : item.category1;

        const fullLocationString = [
          commonData.companyName, 
          cityVal, 
          projectVal, 
          commonData.floorName, 
          areaVal, 
          commonData.specificLocation
        ].filter(Boolean).join(' - ');

        // Operational specs
        const specs: Record<string, any> = {};
        const parentLower = item.category1.toLowerCase();
        if (parentLower.includes('event')) {
          specs.usageCount = Number(item.operationalSpecs.usageCount) || 0;
          specs.maxUsageCount = Number(item.operationalSpecs.maxUsageCount) || 0;
          specs.lastUsedDate = item.operationalSpecs.lastUsedDate || null;
          specs.comboKitName = item.operationalSpecs.comboKitName || '';
        } else if (parentLower.includes('decor')) {
          specs.collectionConcept = item.operationalSpecs.collectionConcept || '';
          specs.season = item.operationalSpecs.season || 'Thường xuyên';
          specs.usageCount = Number(item.operationalSpecs.usageCount) || 0;
        } else if (parentLower.includes('fb') || parentLower.includes('tiệc') || parentLower.includes('f&b')) {
          specs.capacity = item.operationalSpecs.capacity || '';
          specs.material = item.operationalSpecs.material || '';
          specs.color = item.operationalSpecs.color || '';
          specs.size = item.operationalSpecs.size || '';
          specs.comboKitName = item.operationalSpecs.comboKitName || '';
        }

        const customObj: Record<string, string> = {};
        item.customFields.forEach((f: any) => {
          if (f.key.trim()) {
            customObj[f.key.trim()] = f.value;
          }
        });

        return {
          toolCode: autoCode ? undefined : item.toolCode,
          toolName: item.toolName,
          category: categoryPath,
          quantity: Number(item.quantity) || 1,
          unit: item.unit,
          status: item.status,
          initialCondition: item.initialCondition,
          note: item.note,
          
          // Finance
          purchasePrice: Number(item.purchasePrice) || 0,
          vat: Number(item.vat) || 0,
          shippingInstallCost: Number(item.shippingInstallCost) || 0,
          totalAmount: Number(item.totalAmount) || 0,
          purchaseDate: commonData.purchaseDate ? new Date(commonData.purchaseDate) : null,
          supplierName: commonData.supplierName,
          fundingSource: commonData.fundingSource,
          expectedUsefulLife: item.expectedUsefulLife ? Number(item.expectedUsefulLife) : null,
          expectedResidualValue: item.expectedResidualValue ? Number(item.expectedResidualValue) : null,

          // Location Info
          companyName: commonData.companyName,
          branchName: cityVal,
          buildingName: projectVal,
          floorName: commonData.floorName,
          areaName: areaVal,
          specificLocation: commonData.specificLocation,
          locationName: fullLocationString,

          // User / Handover
          departmentName: commonData.departmentName,
          currentUserName: commonData.currentUserName,
          handoverDate: commonData.handoverDate ? new Date(commonData.handoverDate) : null,

          // JSON Columns
          managementType: item.managementType,
          operationalSpecsJson: Object.keys(specs).length > 0 ? JSON.stringify(specs) : null,
          filesJson: JSON.stringify(item.files),
          warrantyInfoJson: JSON.stringify({
            warrantyMonths: commonData.warrantyMonths ? Number(commonData.warrantyMonths) : null,
            warrantyProvider: commonData.warrantyProvider,
            warrantyPhone: commonData.warrantyPhone,
            warrantyNote: commonData.warrantyNote
          }),
          customFieldsJson: Object.keys(customObj).length > 0 ? JSON.stringify(customObj) : null
        };
      });

      await api.post('/tools', payload);
      toast.success(`Đã thêm mới thành công ${items.length} Công cụ dụng cụ!`);
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu danh sách CCDC mới.");
    } finally {
      setLoading(false);
    }
  };

  const isEventCat = (cat1: string) => cat1.toLowerCase().includes('event');
  const isDecorCat = (cat1: string) => cat1.toLowerCase().includes('decor');
  const isFnBCat = (cat1: string) => cat1.toLowerCase().includes('fb') || cat1.toLowerCase().includes('tiệc') || cat1.toLowerCase().includes('f&b');

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
            Hệ thống quản lý CCDC, Thiết bị sự kiện, Decor và F&B phân cấp nâng cao. Hỗ trợ tạo đồng loạt nhiều CCDC cùng lúc.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT 5 COLUMNS: SHARED/COMMON SETTINGS */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* SHARED LOCATION & HANDOVER */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
              <MapPin className="h-5 w-5 text-primary-500" />
              1. Vị trí chung & Bàn giao
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Công ty thành viên *</label>
                <select 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
                  value={commonData.companyName}
                  onChange={e => setCommonData({ ...commonData, companyName: e.target.value })}
                >
                  {MEMBER_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Chi nhánh / Thành phố */}
              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Chi nhánh / Thành phố *</label>
                <select 
                  required
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
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
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tên chi nhánh khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập tên chi nhánh..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5 bg-slate-50"
                    value={customCity}
                    onChange={e => setCustomCity(e.target.value)}
                  />
                </div>
              )}

              {/* Tòa nhà / Dự án */}
              {selectedCity && (
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tòa nhà / Dự án *</label>
                  <select 
                    required
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
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
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tên dự án/tòa nhà khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập tên dự án/tòa nhà..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5 bg-slate-50"
                    value={customProject}
                    onChange={e => setCustomProject(e.target.value)}
                  />
                </div>
              )}

              {/* Tầng */}
              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tầng</label>
                <select 
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
                  value={commonData.floorName}
                  onChange={e => setCommonData({ ...commonData, floorName: e.target.value })}
                >
                  {['Tầng hầm B2', 'Tầng hầm B1', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7', 'Tầng 8', 'Tầng 9', 'Tầng 10', 'Tầng kỹ thuật', 'Khác'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Khu vực đặt */}
              {selectedProject && (
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Khu vực đặt *</label>
                  <select 
                    required
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
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
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tên khu vực khác *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Nhập khu vực..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5 bg-slate-50"
                    value={customLocation}
                    onChange={e => setCustomLocation(e.target.value)}
                  />
                </div>
              )}

              {/* Vị trí chi tiết */}
              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Vị trí chi tiết / Số phòng</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phòng họp tầng 9, Phòng Kế toán..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5 bg-slate-50"
                  value={commonData.specificLocation}
                  onChange={e => setCommonData({ ...commonData, specificLocation: e.target.value })}
                />
              </div>

              <hr className="border-slate-100 my-2" />

              {/* Phòng ban sử dụng */}
              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Phòng ban sử dụng</label>
                <input 
                  type="text"
                  list="department-suggestions"
                  placeholder="Nhập hoặc chọn phòng ban..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
                  value={commonData.departmentName}
                  onChange={e => setCommonData({ ...commonData, departmentName: e.target.value })}
                />
                <datalist id="department-suggestions">
                  {departments.map(d => <option key={d.id} value={d.name} />)}
                </datalist>
              </div>

              {/* Người sử dụng & Ngày bàn giao */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Người sử dụng</label>
                  <input 
                    type="text" 
                    placeholder="Họ tên..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
                    value={commonData.currentUserName}
                    onChange={e => setCommonData({ ...commonData, currentUserName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ngày bàn giao</label>
                  <input 
                    type="date" 
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3"
                    value={commonData.handoverDate}
                    onChange={e => setCommonData({ ...commonData, handoverDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SHARED PURCHASE & WARRANTY */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 border-b border-slate-100 pb-3">
              <Coins className="h-5 w-5 text-primary-500" />
              2. Mua hàng & Bảo hành chung
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ngày mua</label>
                  <input 
                    type="date" 
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3"
                    value={commonData.purchaseDate}
                    onChange={e => setCommonData({ ...commonData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nguồn hình thành</label>
                  <select 
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                    value={commonData.fundingSource}
                    onChange={e => setCommonData({ ...commonData, fundingSource: e.target.value })}
                  >
                    <option value="MUA_MOI">Mua mới</option>
                    <option value="DIEU_CHUYEN">Điều chuyển nội bộ</option>
                    <option value="TU_SAN_XUAT">Tự sản xuất</option>
                    <option value="KHACH_HANG_BAN_GIAO">Khách hàng bàn giao</option>
                    <option value="TAI_TRO">Được tài trợ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nhà cung cấp chung</label>
                <input 
                  type="text" 
                  placeholder="Nhà cung cấp..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3.5"
                  value={commonData.supplierName}
                  onChange={e => setCommonData({ ...commonData, supplierName: e.target.value })}
                />
              </div>

              <hr className="border-slate-100 my-1" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hạn bảo hành (Tháng)</label>
                  <input 
                    type="number" 
                    placeholder="Ví dụ: 12"
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={commonData.warrantyMonths}
                    onChange={e => setCommonData({ ...commonData, warrantyMonths: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Đơn vị bảo hành</label>
                  <input 
                    type="text" 
                    placeholder="Tên TT bảo hành..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={commonData.warrantyProvider}
                    onChange={e => setCommonData({ ...commonData, warrantyProvider: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">SĐT kỹ thuật</label>
                  <input 
                    type="text" 
                    placeholder="SĐT..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={commonData.warrantyPhone}
                    onChange={e => setCommonData({ ...commonData, warrantyPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ghi chú bảo hành</label>
                  <input 
                    type="text" 
                    placeholder="Điều kiện..."
                    className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50"
                    value={commonData.warrantyNote}
                    onChange={e => setCommonData({ ...commonData, warrantyNote: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 7 COLUMNS: ITEMS DYNAMIC LIST */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-500" />
              Danh sách Công cụ dụng cụ cần thêm ({items.length})
            </h2>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="autoCodeGlobal"
                checked={autoCode}
                onChange={e => setAutoCode(e.target.checked)}
                className="rounded border-slate-300 h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="autoCodeGlobal" className="text-xs font-black text-slate-700 cursor-pointer">
                Tự động sinh mã
              </label>
            </div>
          </div>

          <div className="space-y-6">
            {items.map((item, index) => {
              const showEvent = isEventCat(item.category1);
              const showDecor = isDecorCat(item.category1);
              const showFnB = isFnBCat(item.category1);

              return (
                <div 
                  key={item.id} 
                  className={`bg-white border rounded-[2rem] shadow-sm transition-all duration-200 overflow-hidden ${
                    item.isExpanded ? 'border-primary-200 ring-1 ring-primary-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* CARD HEADER */}
                  <div className="p-5 bg-slate-50/70 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        {item.toolName || <span className="text-slate-400 italic">Chưa nhập tên CCDC</span>}
                      </h3>
                      {item.managementType === 'QUANTITY' && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Số lượng
                        </span>
                      )}
                      {item.managementType === 'INDIVIDUAL' && (
                        <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Từng mã
                        </span>
                      )}
                      {item.managementType === 'BUNDLE' && (
                        <span className="bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Theo bộ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
                        title={item.isExpanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
                      >
                        {item.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {items.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          title="Xóa CCDC này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-6 space-y-6">
                    
                    {/* BASIC ITEM INFORMATION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tên công cụ dụng cụ *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ví dụ: Micro không dây Shure A, Bàn làm việc..."
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                          value={item.toolName}
                          onChange={e => handleItemFieldChange(item.id, 'toolName', e.target.value)}
                        />
                      </div>

                      {/* Phân loại cấp 1 & 2 */}
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nhóm cấp 1 *</label>
                        <select 
                          required
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                          value={item.category1}
                          onChange={e => {
                            handleItemFieldChange(item.id, 'category1', e.target.value);
                            handleItemFieldChange(item.id, 'category2', '');
                          }}
                        >
                          <option value="">-- Chọn nhóm cấp 1 --</option>
                          {Object.keys(CATEGORY_TREE).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nhóm cấp 2 *</label>
                        <select 
                          required
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                          value={item.category2}
                          onChange={e => handleItemFieldChange(item.id, 'category2', e.target.value)}
                          disabled={!item.category1}
                        >
                          <option value="">-- Chọn nhóm cấp 2 --</option>
                          {item.category1 && CATEGORY_TREE[item.category1].map(sc => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      </div>

                      {/* Loại quản lý */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Loại quản lý</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                          {[
                            { value: 'INDIVIDUAL', label: 'Từng mã' },
                            { value: 'QUANTITY', label: 'Số lượng' },
                            { value: 'BUNDLE', label: 'Theo bộ/combo' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleItemFieldChange(item.id, 'managementType', opt.value)}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                                item.managementType === opt.value 
                                  ? 'bg-white text-primary-700 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {item.managementType === 'QUANTITY' && (
                        <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-[10px] font-semibold text-emerald-800 animate-in fade-in duration-200 leading-normal">
                          <p className="font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                            Loại Quản lý Số lượng & biến động kho
                          </p>
                          Hệ thống tự động tạo lô <strong>LOT001</strong> với giá nhập và số lượng của CCDC này tại kho lưu trữ.
                        </div>
                      )}

                      {/* Số lượng, Đơn vị tính */}
                      <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <div className="space-y-1">
                          <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Đơn vị tính</label>
                          <input 
                            type="text" 
                            placeholder="Cái, chiếc, ly, bộ..."
                            className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                            value={item.unit}
                            onChange={e => handleItemFieldChange(item.id, 'unit', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Số lượng</label>
                          <input 
                            type="number" 
                            min={1}
                            className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3"
                            value={item.quantity}
                            onChange={e => handleItemFieldChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                          />
                        </div>
                      </div>

                      {/* Tài chính chi tiết */}
                      <div className="grid grid-cols-3 gap-2 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-wider">Đơn giá (VNĐ)</label>
                          <input 
                            type="number" 
                            className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-[11px] py-1.5 px-2 bg-white"
                            value={item.purchasePrice || ''}
                            onChange={e => handleItemFieldChange(item.id, 'purchasePrice', Number(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-wider">Thuế VAT (%)</label>
                          <input 
                            type="number" 
                            className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-[11px] py-1.5 px-2 bg-white"
                            value={item.vat || ''}
                            onChange={e => handleItemFieldChange(item.id, 'vat', Number(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-wider">Phí V/chuyển (VNĐ)</label>
                          <input 
                            type="number" 
                            className="w-full rounded-lg border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-[11px] py-1.5 px-2 bg-white"
                            value={item.shippingInstallCost || ''}
                            onChange={e => handleItemFieldChange(item.id, 'shippingInstallCost', Number(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-3 pt-2 mt-1 border-t border-slate-200/60 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng giá trị:</span>
                          <span className="text-xs font-black text-slate-800">
                            {item.totalAmount.toLocaleString()} VNĐ
                          </span>
                        </div>
                      </div>

                      {/* Mã định danh thủ công */}
                      {!autoCode && (
                        <div className="space-y-1 md:col-span-2 animate-in fade-in duration-150">
                          <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mã định danh thủ công *</label>
                          <input 
                            type="text" 
                            required={!autoCode}
                            placeholder="Mã CCDC tự gõ..."
                            className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-mono font-bold uppercase py-2.5 px-3 bg-slate-50"
                            value={item.toolCode}
                            onChange={e => handleItemFieldChange(item.id, 'toolCode', e.target.value)}
                          />
                        </div>
                      )}

                      {/* Trạng thái, Tình trạng ban đầu */}
                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Trạng thái khởi tạo</label>
                        <select 
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                          value={item.status}
                          onChange={e => handleItemFieldChange(item.id, 'status', e.target.value)}
                        >
                          <option value="IN_STOCK">Trong kho (Chờ cấp)</option>
                          <option value="USING">Đang sử dụng</option>
                          <option value="DAMAGED">Báo hỏng</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tình trạng ban đầu</label>
                        <input 
                          type="text" 
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2.5 px-3"
                          placeholder="Mới 100%, cũ..."
                          value={item.initialCondition}
                          onChange={e => handleItemFieldChange(item.id, 'initialCondition', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ghi chú</label>
                        <textarea 
                          className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 h-16"
                          placeholder="Thông tin ghi chú cho CCDC này..."
                          value={item.note}
                          onChange={e => handleItemFieldChange(item.id, 'note', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* EXPANDABLE ADVANCED ATTRIBUTES */}
                    {item.isExpanded && (
                      <div className="pt-4 border-t border-slate-100 space-y-6 animate-in fade-in slide-in-from-top-3 duration-250">
                        
                        {/* Hạn dùng & Khấu hao */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Hạn dùng (Tháng)</label>
                            <input 
                              type="number" 
                              placeholder="Ví dụ: 36"
                              className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50/50"
                              value={item.expectedUsefulLife}
                              onChange={e => handleItemFieldChange(item.id, 'expectedUsefulLife', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Giá trị còn lại dự kiến</label>
                            <input 
                              type="number" 
                              placeholder="Giá trị thanh lý..."
                              className="w-full rounded-xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold py-2 px-3 bg-slate-50/50"
                              value={item.expectedResidualValue}
                              onChange={e => handleItemFieldChange(item.id, 'expectedResidualValue', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Operational Specs (Dynamic) */}
                        {(showEvent || showDecor || showFnB) && (
                          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <ClipboardList className="h-3.5 w-3.5 text-primary-500" />
                              Thông số vận hành đặc thù
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                              {showEvent && (
                                <>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Số lần đã sử dụng</label>
                                    <input 
                                      type="number" 
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.usageCount}
                                      onChange={e => handleItemSpecsChange(item.id, 'usageCount', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Số lần tối đa</label>
                                    <input 
                                      type="number" 
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.maxUsageCount}
                                      onChange={e => handleItemSpecsChange(item.id, 'maxUsageCount', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Tên bộ combo sự kiện</label>
                                    <input 
                                      type="text" 
                                      placeholder="Combo âm thanh..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.comboKitName}
                                      onChange={e => handleItemSpecsChange(item.id, 'comboKitName', e.target.value)}
                                    />
                                  </div>
                                </>
                              )}

                              {showDecor && (
                                <>
                                  <div className="space-y-1 col-span-2">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Bộ sưu tập / Concept thiết kế</label>
                                    <input 
                                      type="text" 
                                      placeholder="Concept Noel 2025..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.collectionConcept}
                                      onChange={e => handleItemSpecsChange(item.id, 'collectionConcept', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Mùa vụ áp dụng</label>
                                    <select 
                                      className="w-full rounded-lg border-slate-200 text-xs py-1 px-2 bg-white"
                                      value={item.operationalSpecs.season}
                                      onChange={e => handleItemSpecsChange(item.id, 'season', e.target.value)}
                                    >
                                      <option value="Thường xuyên">Thường xuyên</option>
                                      <option value="Tết Nguyên Đán">Tết Nguyên Đán</option>
                                      <option value="Trung thu">Trung thu</option>
                                      <option value="Noel / Giáng sinh">Noel / Giáng sinh</option>
                                      <option value="Khác">Khác</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {showFnB && (
                                <>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Dung tích</label>
                                    <input 
                                      type="text" 
                                      placeholder="350ml..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.capacity}
                                      onChange={e => handleItemSpecsChange(item.id, 'capacity', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Chất liệu</label>
                                    <input 
                                      type="text" 
                                      placeholder="Thủy tinh, sứ..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.material}
                                      onChange={e => handleItemSpecsChange(item.id, 'material', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Màu sắc</label>
                                    <input 
                                      type="text" 
                                      placeholder="Trong suốt..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.color}
                                      onChange={e => handleItemSpecsChange(item.id, 'color', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-slate-500 text-[9px] font-semibold">Kích thước</label>
                                    <input 
                                      type="text" 
                                      placeholder="Chiều cao..."
                                      className="w-full rounded-lg border-slate-200 text-xs py-1.5 px-2 bg-white"
                                      value={item.operationalSpecs.size}
                                      onChange={e => handleItemSpecsChange(item.id, 'size', e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Custom Fields */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <FolderOpen className="h-3.5 w-3.5 text-primary-500" />
                              Thuộc tính tự định nghĩa
                            </h4>
                            <button 
                              type="button"
                              onClick={() => addItemCustomField(item.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-bold border-0 cursor-pointer"
                            >
                              + Thêm trường
                            </button>
                          </div>

                          <div className="space-y-2">
                            {item.customFields.map((field: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input 
                                  type="text" 
                                  placeholder="Tên thuộc tính"
                                  className="flex-1 rounded-lg border-slate-200 text-[11px] py-1.5 px-2 bg-slate-50"
                                  value={field.key}
                                  onChange={e => handleItemCustomFieldChange(item.id, idx, 'key', e.target.value)}
                                />
                                <input 
                                  type="text" 
                                  placeholder="Giá trị"
                                  className="flex-1 rounded-lg border-slate-200 text-[11px] py-1.5 px-2 bg-slate-50"
                                  value={field.value}
                                  onChange={e => handleItemCustomFieldChange(item.id, idx, 'value', e.target.value)}
                                />
                                <button 
                                  type="button"
                                  onClick={() => removeItemCustomField(item.id, idx)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded border-0 bg-transparent cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {item.customFields.length === 0 && (
                              <p className="text-[10px] text-slate-400 font-semibold italic text-center py-2">Chưa thêm thuộc tính mở rộng nào.</p>
                            )}
                          </div>
                        </div>

                        {/* Files Links */}
                        <div className="space-y-3 border-t border-slate-100 pt-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary-500" />
                            Hồ sơ tài liệu đính kèm (URL Links)
                          </h4>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-slate-500 text-[9px] font-semibold">Ảnh đại diện CCDC</label>
                              <input 
                                type="text" 
                                placeholder="https://..."
                                className="w-full rounded-lg border-slate-200 text-[10px] py-1.5 px-2 bg-slate-50/50"
                                value={item.files.avatarUrl}
                                onChange={e => handleItemFilesChange(item.id, 'avatarUrl', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-slate-500 text-[9px] font-semibold">Ảnh thực tế sản phẩm</label>
                              <input 
                                type="text" 
                                placeholder="https://..."
                                className="w-full rounded-lg border-slate-200 text-[10px] py-1.5 px-2 bg-slate-50/50"
                                value={item.files.photoUrl}
                                onChange={e => handleItemFilesChange(item.id, 'photoUrl', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-slate-500 text-[9px] font-semibold">Hóa đơn mua hàng / VAT</label>
                              <input 
                                type="text" 
                                placeholder="https://..."
                                className="w-full rounded-lg border-slate-200 text-[10px] py-1.5 px-2 bg-slate-50/50"
                                value={item.files.invoiceUrl}
                                onChange={e => handleItemFilesChange(item.id, 'invoiceUrl', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-slate-500 text-[9px] font-semibold">Thẻ bảo hành</label>
                              <input 
                                type="text" 
                                placeholder="https://..."
                                className="w-full rounded-lg border-slate-200 text-[10px] py-1.5 px-2 bg-slate-50/50"
                                value={item.files.warrantyCardUrl}
                                onChange={e => handleItemFilesChange(item.id, 'warrantyCardUrl', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD ROW BUTTON */}
          <button 
            type="button"
            onClick={addItem}
            className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-primary-500 rounded-[2rem] text-slate-500 hover:text-primary-600 bg-slate-50/50 hover:bg-primary-50/20 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Thêm CCDC khác (Thêm dòng)
          </button>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="lg:col-span-12 flex justify-end gap-3 bg-slate-50 p-6 rounded-[2rem] border border-slate-200 mt-4">
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
            Lưu danh sách CCDC ({items.length})
          </button>
        </div>
      </form>
    </div>
  );
};
