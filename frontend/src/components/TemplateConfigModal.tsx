import React, { useState, useEffect } from 'react';
import { X, Save, Eye, ArrowLeft, ArrowRight, Settings, Layout, ClipboardList, PenTool, Footprints, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any; // null if creating a new one
  onSave: () => void;
}

const BUSINESS_MODULES = [
  { key: 'HANDOVER_NEW_ASSET', label: 'Cấp mới tài sản (hóa đơn)' },
  { key: 'HANDOVER', label: 'Bàn giao tài sản' },
  { key: 'TRANSFER', label: 'Điều chuyển tài sản' },
  { key: 'REPAIR', label: 'Báo hỏng / Sửa chữa' },
  { key: 'LIQUIDATION', label: 'Thanh lý tài sản' },
  { key: 'LOSS', label: 'Báo mất / Tiêu hủy' },
  { key: 'INVENTORY', label: 'Kiểm kê tài sản' },
  { key: 'RECALL', label: 'Thu hồi tài sản' }
];

const TABLE_COLUMNS = [
  { key: 'index', label: 'STT' },
  { key: 'assetCode', label: 'Mã tài sản' },
  { key: 'assetCodeQr', label: 'Mã tài sản / QR' },
  { key: 'assetName', label: 'Tên tài sản' },
  { key: 'specification', label: 'Mô tả kỹ thuật' },
  { key: 'serial', label: 'Số Serial' },
  { key: 'unit', label: 'Đơn vị tính' },
  { key: 'quantity', label: 'Số lượng' },
  { key: 'condition', label: 'Tình trạng' },
  { key: 'note', label: 'Ghi chú' },
  { key: 'purchasePriceExVat', label: 'Đơn giá (chưa VAT)' }
];

const SIGNATURES = [
  { key: 'sender', label: 'Đại diện bên giao' },
  { key: 'receiver', label: 'Đại diện bên nhận' },
  { key: 'qlts', label: 'Chuyên viên QLTS / HCNS' },
  { key: 'director', label: 'Ban Giám đốc' },
  { key: 'department', label: 'Trưởng bộ phận' },
  { key: 'inventory', label: 'Hội đồng kiểm kê' }
];

export const TemplateConfigModal: React.FC<TemplateConfigModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [module, setModule] = useState('HANDOVER');
  const [status, setStatus] = useState('ACTIVE');
  const [version, setVersion] = useState('v1');
  const [isDefault, setIsDefault] = useState(false);
  const [changeNote, setChangeNote] = useState('');

  // Config JSON states
  const [pageSize, setPageSize] = useState('A4');
  const [pageOrientation, setPageOrientation] = useState('portrait');
  const [marginTop, setMarginTop] = useState(35);
  const [marginRight, setMarginRight] = useState(42);
  const [marginBottom, setMarginBottom] = useState(55);
  const [marginLeft, setMarginLeft] = useState(42);

  const [showLogo, setShowLogo] = useState(true);
  const [companyName, setCompanyName] = useState('DANKO GROUP');
  const [departmentText, setDepartmentText] = useState('BỘ PHẬN QLTS');
  const [showTemplateCode, setShowTemplateCode] = useState(true);
  const [showDocumentQr, setShowDocumentQr] = useState(true);
  const [includeCommitment, setIncludeCommitment] = useState(true);
  const [commitmentText, setCommitmentText] = useState(`Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản nêu trên và có trách nhiệm quản lý, sử dụng tài sản đúng mục đích công việc.
Hệ thống/cá nhân quản lý tài sản cập nhật trạng thái tài sản theo biên bản này sau khi các bên xác nhận.`);

  const [showAssetQr, setShowAssetQr] = useState(true);
  const [assetQrSize, setAssetQrSize] = useState(48);
  const [columns, setColumns] = useState<string[]>([]);

  const [sigs, setSigs] = useState<string[]>([]);

  const [showSupportLine, setShowSupportLine] = useState(true);
  const [supportLine, setSupportLine] = useState('');
  const [showPageNumber, setShowPageNumber] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(1);
      setErrors({});
      if (template) {
        // Edit mode
        setName(template.name);
        setCode(template.code);
        setModule(template.module);
        setStatus(template.status);
        setVersion(template.version);
        setIsDefault(template.isDefault);
        setChangeNote('');

        try {
          const config = typeof template.configJson === 'string' ? JSON.parse(template.configJson) : template.configJson;
          
          setPageSize(config.page?.size || 'A4');
          setPageOrientation(config.page?.orientation || 'portrait');
          setMarginTop(config.page?.marginTop || 35);
          setMarginRight(config.page?.marginRight || 42);
          setMarginBottom(config.page?.marginBottom || 55);
          setMarginLeft(config.page?.marginLeft || 42);

          setShowLogo(config.header?.showLogo !== false);
          setCompanyName(config.header?.companyName || 'DANKO GROUP');
          setDepartmentText(config.header?.departmentText || 'BỘ PHẬN QLTS');
          setShowTemplateCode(config.header?.showTemplateCode !== false);
          setShowDocumentQr(config.header?.showDocumentQr !== false);
          setIncludeCommitment(config.includeCommitment !== false);
          setCommitmentText(config.commitmentText || `Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản nêu trên và có trách nhiệm quản lý, sử dụng tài sản đúng mục đích công việc.
Hệ thống/cá nhân quản lý tài sản cập nhật trạng thái tài sản theo biên bản này sau khi các bên xác nhận.`);

          setShowAssetQr(config.assetTable?.showAssetQr !== false);
          setAssetQrSize(config.assetTable?.assetQrSize || 48);
          setColumns(config.assetTable?.columns || ['index', 'assetCodeQr', 'assetName', 'specification', 'serial', 'unit', 'quantity', 'condition', 'note']);

          setSigs(config.signature?.columns || ['sender', 'receiver', 'qlts']);

          setShowSupportLine(config.footer?.showSupportLine !== false);
          setSupportLine(config.footer?.supportLine || 'CBNV có nhu cầu hỗ trợ về CNTT xin liên hệ: Lê Khánh Hùng – Phone/Viber: 0977131579');
          setShowPageNumber(config.footer?.showPageNumber !== false);
        } catch (e) {
          console.error('Error parsing configJson:', e);
        }
      } else {
        // Create mode
        setName('');
        setCode('');
        setModule('HANDOVER');
        setStatus('DRAFT');
        setVersion('v1');
        setIsDefault(false);
        setChangeNote('');
        
        setPageSize('A4');
        setPageOrientation('portrait');
        setMarginTop(35);
        setMarginRight(42);
        setMarginBottom(55);
        setMarginLeft(42);

        setShowLogo(true);
        setCompanyName('DANKO GROUP');
        setDepartmentText('BỘ PHẬN QLTS');
        setShowTemplateCode(true);
        setShowDocumentQr(true);
        setIncludeCommitment(true);
        setCommitmentText(`Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản nêu trên và có trách nhiệm quản lý, sử dụng tài sản đúng mục đích công việc.
Hệ thống/cá nhân quản lý tài sản cập nhật trạng thái tài sản theo biên bản này sau khi các bên xác nhận.`);

        setShowAssetQr(true);
        setAssetQrSize(48);
        setColumns(['index', 'assetCodeQr', 'assetName', 'specification', 'serial', 'unit', 'quantity', 'condition', 'note']);

        setSigs(['sender', 'receiver', 'qlts']);

        setShowSupportLine(true);
        setSupportLine('CBNV có nhu cầu hỗ trợ về CNTT xin liên hệ: Lê Khánh Hùng – Phone/Viber: 0977131579');
        setShowPageNumber(true);
      }
    }
  }, [isOpen, template]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên biểu mẫu';
    if (!code.trim()) newErrors.code = 'Vui lòng nhập mã biểu mẫu';
    if (columns.length === 0) newErrors.columns = 'Vui lòng chọn ít nhất một cột hiển thị trong bảng';
    if (sigs.length === 0) newErrors.sigs = 'Vui lòng chọn ít nhất một vai trò ký biên bản';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setActiveTab(errors.name || errors.code ? 1 : (errors.columns ? 3 : (errors.sigs ? 4 : 1)));
      toast.warning('Vui lòng kiểm tra lại thông tin cấu hình bắt buộc');
      return;
    }

    setLoading(true);

    const config = {
      page: {
        size: pageSize,
        orientation: pageOrientation,
        marginTop: Number(marginTop),
        marginRight: Number(marginRight),
        marginBottom: Number(marginBottom),
        marginLeft: Number(marginLeft)
      },
      header: {
        showLogo,
        companyName,
        departmentText,
        showTemplateCode,
        showDocumentQr
      },
      assetTable: {
        showAssetQr,
        assetQrSize: Number(assetQrSize),
        repeatHeader: true,
        columns
      },
      signature: {
        columns: sigs
      },
      footer: {
        showSupportLine,
        supportLine,
        showPageNumber
      },
      includeCommitment,
      commitmentText
    };

    const payload = {
      name,
      code,
      module,
      status,
      version,
      isDefault,
      configJson: JSON.stringify(config),
      changeNote: changeNote || (template ? 'Cập nhật cấu hình biểu mẫu' : 'Tạo biểu mẫu ban đầu')
    };

    try {
      if (template) {
        await api.put(`/templates/${template.id}`, payload);
        toast.success('Đã lưu cấu hình biểu mẫu thành công!');
      } else {
        await api.post('/templates', payload);
        toast.success('Đã tạo biểu mẫu thành công!');
      }
      onSave();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Có lỗi xảy ra khi lưu biểu mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleColumn = (colKey: string) => {
    if (columns.includes(colKey)) {
      setColumns(columns.filter(c => c !== colKey));
    } else {
      setColumns([...columns, colKey]);
    }
  };

  const handleToggleSignature = (sigKey: string) => {
    if (sigs.includes(sigKey)) {
      setSigs(sigs.filter(s => s !== sigKey));
    } else {
      setSigs([...sigs, sigKey]);
    }
  };

  if (!isOpen) return null;

  const tabClass = (tabIndex: number) => `
    flex items-center space-x-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0
    ${activeTab === tabIndex 
      ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }
  `;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* CONTAINER */}
      <div className="relative w-full max-w-[1000px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300 max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">
                {template ? 'Cấu hình biểu mẫu' : 'Thêm mới biểu mẫu'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                Thiết lập layout, cột hiển thị, chữ ký và chân trang cho biểu mẫu PDF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100"
          >
            <X className="h-6 w-6 text-slate-300 hover:text-slate-600" />
          </button>
        </div>

        {/* TABS SCROLL BAR */}
        <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab(1)} className={tabClass(1)}>
            <Settings className="h-4 w-4" /> <span>1. Thông tin chung</span>
          </button>
          <button onClick={() => setActiveTab(2)} className={tabClass(2)}>
            <Layout className="h-4 w-4" /> <span>2. Khung & Tiêu đề</span>
          </button>
          <button onClick={() => setActiveTab(3)} className={tabClass(3)}>
            <ClipboardList className="h-4 w-4" /> <span>3. Cột tài sản</span>
          </button>
          <button onClick={() => setActiveTab(4)} className={tabClass(4)}>
            <PenTool className="h-4 w-4" /> <span>4. Chữ ký</span>
          </button>
          <button onClick={() => setActiveTab(5)} className={tabClass(5)}>
            <Footprints className="h-4 w-4" /> <span>5. Chân trang</span>
          </button>
          <button onClick={() => setActiveTab(6)} className={tabClass(6)} style={{ marginLeft: 'auto' }}>
            <Eye className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-600">6. Live Preview</span>
          </button>
        </div>

        {/* FORM PANEL */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 1 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Tên biểu mẫu <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  className={`w-full px-5 py-3.5 border rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800 ${errors.name ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
                  placeholder="Ví dụ: Biên bản bàn giao tài sản..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1.5 ml-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Mã biểu mẫu <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  className={`w-full px-5 py-3.5 border rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800 ${errors.code ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
                  placeholder="Ví dụ: BM02/QLTS"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!template}
                />
                {errors.code && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1.5 ml-1">{errors.code}</p>}
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Nhóm nghiệp vụ</label>
                <select 
                  className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800"
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                >
                  {BUSINESS_MODULES.map(bm => (
                    <option key={bm.key} value={bm.key}>{bm.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Trạng thái áp dụng</label>
                <select 
                  className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ACTIVE">Đang áp dụng</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="INACTIVE">Ngưng dùng</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Phiên bản</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800"
                  placeholder="Ví dụ: v1, v2..."
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Thiết lập mặc định</label>
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="isDefault"
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  <label htmlFor="isDefault" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Đặt biểu mẫu này làm mẫu mặc định khi sinh PDF của nghiệp vụ
                  </label>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Lý do / Ghi chú cập nhật phiên bản</label>
                <textarea 
                  className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800 h-24"
                  placeholder="Mô tả lý do sửa đổi cấu hình hoặc thay đổi phiên bản..."
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: FRAME & HEADER */}
          {activeTab === 2 && (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 mb-4 flex items-center">
                  <Settings className="h-4 w-4 mr-2" /> Thiết lập khổ trang PDF
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Cỡ trang</label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                    >
                      <option value="A4">A4 (Chuẩn)</option>
                      <option value="Letter">Letter</option>
                      <option value="A5">A5</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Hướng trang</label>
                    <select 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={pageOrientation}
                      onChange={(e) => setPageOrientation(e.target.value)}
                    >
                      <option value="portrait">Dọc (Portrait)</option>
                      <option value="landscape">Ngang (Landscape)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Lề trên (pt)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={marginTop}
                      onChange={(e) => setMarginTop(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Lề phải (pt)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={marginRight}
                      onChange={(e) => setMarginRight(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Lề dưới (pt)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Lề trái (pt)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 mb-4 flex items-center">
                  <Layout className="h-4 w-4 mr-2" /> Tiêu đề & Logo
                </h3>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Hiển thị Dòng thông tin Công ty / Logo</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                  />
                </div>

                {showLogo && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase">Tên doanh nghiệp / Nhãn tiêu đề</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase">Tên nhãn bộ phận dưới logo</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        value={departmentText}
                        onChange={(e) => setDepartmentText(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Hiển thị nhãn Mã biểu mẫu (ví dụ: Mẫu số: BM02/QLTS) ở góc trên phải</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showTemplateCode}
                    onChange={(e) => setShowTemplateCode(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Tự động sinh QR Code định danh biên bản ở góc phải tiêu đề</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showDocumentQr}
                    onChange={(e) => setShowDocumentQr(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Hiển thị Khối Cam kết & Trách nhiệm ở cuối danh sách tài sản</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={includeCommitment}
                    onChange={(e) => setIncludeCommitment(e.target.checked)}
                  />
                </div>

                {includeCommitment && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase font-black tracking-wider">Nội dung cam kết / trách nhiệm</label>
                    <textarea 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs h-24 whitespace-pre-wrap"
                      value={commitmentText}
                      onChange={(e) => setCommitmentText(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ASSET TABLE COLUMNS */}
          {activeTab === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                    <ClipboardList className="h-4 w-4 mr-2" /> Chọn các cột thông tin trong bảng tài sản
                  </h3>
                  <button 
                    onClick={() => setColumns(TABLE_COLUMNS.map(c => c.key))}
                    className="text-[9px] font-black text-primary-600 uppercase hover:underline"
                  >
                    Chọn tất cả
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TABLE_COLUMNS.map(col => (
                    <div 
                      key={col.key}
                      onClick={() => handleToggleColumn(col.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center space-x-3 
                        ${columns.includes(col.key) 
                          ? 'bg-primary-50/60 border-primary-200 text-primary-700' 
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                        }`}
                    >
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-primary-600 border-slate-300 rounded pointer-events-none"
                        checked={columns.includes(col.key)}
                        readOnly
                      />
                      <span className="text-xs font-bold">{col.label}</span>
                    </div>
                  ))}
                </div>
                {errors.columns && <p className="text-[10px] text-rose-500 font-bold uppercase mt-3 ml-1">{errors.columns}</p>}
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                  <Settings className="h-4 w-4 mr-2" /> Thiết lập QR Code trong bảng
                </h3>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Sinh kèm mã QR Code tài sản trong ô "Mã tài sản"</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showAssetQr}
                    onChange={(e) => setShowAssetQr(e.target.checked)}
                  />
                </div>

                {showAssetQr && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Cỡ QR Code tài sản (pt): {assetQrSize}px</label>
                    <input 
                      type="range" 
                      min="35"
                      max="75"
                      step="5"
                      className="w-full accent-primary-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      value={assetQrSize}
                      onChange={(e) => setAssetQrSize(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SIGNATURES */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 mb-4 flex items-center">
                  <PenTool className="h-4 w-4 mr-2" /> Chọn các chữ ký có hiệu lực
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {SIGNATURES.map(sig => (
                    <div 
                      key={sig.key}
                      onClick={() => handleToggleSignature(sig.key)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between
                        ${sigs.includes(sig.key) 
                          ? 'bg-primary-50/60 border-primary-200 text-primary-700' 
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-primary-600 border-slate-300 rounded pointer-events-none"
                          checked={sigs.includes(sig.key)}
                          readOnly
                        />
                        <span className="text-xs font-bold">{sig.label}</span>
                      </div>
                      
                      {sigs.includes(sig.key) && (
                        <span className="text-[8px] font-black text-primary-600 bg-primary-100 px-2 py-0.5 rounded uppercase tracking-wider">
                          Thứ tự: {sigs.indexOf(sig.key) + 1}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {errors.sigs && <p className="text-[10px] text-rose-500 font-bold uppercase mt-3 ml-1">{errors.sigs}</p>}
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[10px] font-bold text-amber-800 uppercase flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                  Bố cục chữ ký sẽ tự động dàn đều theo bề ngang văn bản (2 cột, 3 cột hoặc 4 cột).
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: FOOTER */}
          {activeTab === 5 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                  <Footprints className="h-4 w-4 mr-2" /> Thiết lập thông tin chân trang (Footer)
                </h3>

                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Hiển thị thông tin Liên hệ / Dòng Hỗ trợ</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showSupportLine}
                    onChange={(e) => setShowSupportLine(e.target.checked)}
                  />
                </div>

                {showSupportLine && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Nội dung dòng liên hệ hỗ trợ</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      placeholder="CBNV xin liên hệ bộ phận hỗ trợ..."
                      value={supportLine}
                      onChange={(e) => setSupportLine(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Hiển thị đánh số trang bên dưới chân trang</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-50"
                    checked={showPageNumber}
                    onChange={(e) => setShowPageNumber(e.target.checked)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LIVE PREVIEW */}
          {activeTab === 6 && (
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[210mm] border border-slate-200 rounded-xl bg-white p-12 text-slate-800 shadow-md font-sans text-xs relative min-h-[500px]">
                
                {/* Simulated A4 header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    {showLogo ? (
                      <>
                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-tight">{companyName}</h4>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">{departmentText}</p>
                      </>
                    ) : (
                      <div className="h-6"></div>
                    )}
                  </div>
                  <div className="text-right">
                    {showTemplateCode && <p className="text-[9px] font-black text-slate-900">Mẫu số: {code || '---'}</p>}
                    <p className="text-[8px] font-bold text-slate-400">Số: BBBG/2026/05/9999</p>
                  </div>
                </div>

                {/* Simulated Title */}
                <div className="text-center py-6">
                  <h3 className="text-sm font-black uppercase text-slate-900">
                    {name || 'BIÊN BẢN TÀI SẢN'}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 mt-0.5">Ngày 19 tháng 05 năm 2026</p>
                </div>

                {/* Simulated Signers info */}
                <div className="space-y-1 mb-4 text-[9px] text-slate-600 font-medium">
                  <p><span className="font-bold text-slate-800 uppercase">I. BÊN GIAO:</span> Nguyễn Văn Giao - Bộ phận: Ban CNTT (Trưởng nhóm hạ tầng)</p>
                  <p><span className="font-bold text-slate-800 uppercase">II. BÊN NHẬN:</span> Trần Thị Nhận - Bộ phận: Phòng HCNS (Chuyên viên tuyển dụng)</p>
                </div>

                {/* Simulated Asset table */}
                <table className="w-full border-collapse border border-slate-300 text-[9px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold">
                      {columns.includes('index') && <th className="border border-slate-300 p-1.5 text-center">STT</th>}
                      {columns.includes('assetCode') && <th className="border border-slate-300 p-1.5 text-center">Mã tài sản</th>}
                      {columns.includes('assetCodeQr') && <th className="border border-slate-300 p-1.5 text-center">Mã tài sản / QR</th>}
                      {columns.includes('assetName') && <th className="border border-slate-300 p-1.5 text-left">Tên tài sản</th>}
                      {columns.includes('specification') && <th className="border border-slate-300 p-1.5 text-left">Mô tả</th>}
                      {columns.includes('serial') && <th className="border border-slate-300 p-1.5 text-center">Serial</th>}
                      {columns.includes('unit') && <th className="border border-slate-300 p-1.5 text-center">ĐVT</th>}
                      {columns.includes('quantity') && <th className="border border-slate-300 p-1.5 text-center">SL</th>}
                      {columns.includes('condition') && <th className="border border-slate-300 p-1.5 text-left">Tình trạng</th>}
                      {columns.includes('note') && <th className="border border-slate-300 p-1.5 text-left">Ghi chú</th>}
                      {columns.includes('purchasePriceExVat') && <th className="border border-slate-300 p-1.5 text-right">Đơn giá</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {columns.includes('index') && <td className="border border-slate-300 p-1.5 text-center">1</td>}
                      {columns.includes('assetCode') && <td className="border border-slate-300 p-1.5 text-center">TS0001/HN/CNTT</td>}
                      {columns.includes('assetCodeQr') && (
                        <td className="border border-slate-300 p-1.5 text-center font-mono space-y-1">
                          <div>TS0001/HN/CNTT</div>
                          {showAssetQr && <div className="w-8 h-8 bg-slate-200 mx-auto flex items-center justify-center text-[6px] text-slate-400 font-bold uppercase">[QR]</div>}
                        </td>
                      )}
                      {columns.includes('assetName') && <td className="border border-slate-300 p-1.5 font-bold">Laptop Dell XPS 15 9530</td>}
                      {columns.includes('specification') && <td className="border border-slate-300 p-1.5 text-slate-400">Thiết bị CNTT</td>}
                      {columns.includes('serial') && <td className="border border-slate-300 p-1.5 text-center font-mono">SN-XPS001</td>}
                      {columns.includes('unit') && <td className="border border-slate-300 p-1.5 text-center">Cái</td>}
                      {columns.includes('quantity') && <td className="border border-slate-300 p-1.5 text-center">1</td>}
                      {columns.includes('condition') && <td className="border border-slate-300 p-1.5">Đang sử dụng</td>}
                      {columns.includes('note') && <td className="border border-slate-300 p-1.5 text-slate-400">---</td>}
                      {columns.includes('purchasePriceExVat') && <td className="border border-slate-300 p-1.5 text-right font-mono">45.000.000</td>}
                    </tr>
                  </tbody>
                </table>

                {/* Simulated Commitments */}
                {includeCommitment && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 text-[8px] italic text-slate-500 rounded-lg whitespace-pre-wrap">
                    {commitmentText}
                  </div>
                )}

                {/* Simulated Signatures */}
                <div className="mt-8 flex justify-between text-center text-[9px] font-bold uppercase">
                  {sigs.map(sig => {
                    let title = sig;
                    if (sig === 'sender') title = 'Bên giao';
                    if (sig === 'receiver') title = 'Bên nhận';
                    if (sig === 'qlts') title = 'Bộ phận QLTS';
                    if (sig === 'director') title = 'Giám đốc';
                    if (sig === 'department') title = 'Trưởng phòng';
                    if (sig === 'inventory') title = 'Hội đồng kiểm kê';

                    return (
                      <div key={sig} className="flex-1">
                        <p>{title}</p>
                        <p className="text-[7px] text-slate-400 italic normal-case mt-0.5">(Ký, ghi rõ họ tên)</p>
                      </div>
                    );
                  })}
                </div>

                {/* Simulated Footer */}
                <div className="mt-16 border-t border-slate-100 pt-3 flex flex-col items-center text-[7px] text-slate-400">
                  {showSupportLine && <p className="mb-1 italic">{supportLine}</p>}
                  <div className="w-full flex justify-between">
                    {showPageNumber ? <p>Trang 1/1</p> : <p></p>}
                    <p>Mã hồ sơ: BBBG/2026/05/9999</p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* FOOTER BAR */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0 z-10">
          <button 
            type="button"
            onClick={() => activeTab > 1 ? setActiveTab(activeTab - 1) : onClose()}
            className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200 flex items-center"
          >
            {activeTab > 1 ? <><ArrowLeft className="mr-2 h-4 w-4" /> Quay lại</> : 'Hủy bỏ'}
          </button>
          
          <div className="flex space-x-3">
            {activeTab < 6 ? (
              <button 
                type="button"
                onClick={() => setActiveTab(activeTab + 1)}
                className="h-12 px-8 bg-slate-800 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center shadow-lg"
              >
                Tiếp theo <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="h-12 px-8 bg-primary-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center disabled:bg-slate-300 disabled:shadow-none"
              >
                {loading ? 'Đang lưu...' : <><Save className="mr-2 h-4 w-4" /> Lưu cấu hình</>}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
