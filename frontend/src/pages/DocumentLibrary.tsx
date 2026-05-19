import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Settings2,
  Copy,
  Trash2,
  Check,
  Star,
  RefreshCw,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { TemplateConfigModal } from '../components/TemplateConfigModal';

const MODULE_LABELS: Record<string, string> = {
  HANDOVER_NEW_ASSET: 'Cấp mới tài sản',
  HANDOVER: 'Bàn giao tài sản',
  TRANSFER: 'Điều chuyển tài sản',
  REPAIR: 'Sửa chữa tài sản',
  LIQUIDATION: 'Thanh lý tài sản',
  LOSS: 'Mất / Tiêu hủy',
  INVENTORY: 'Kiểm kê tài sản',
  RECALL: 'Thu hồi tài sản'
};

const MODULE_COLORS: Record<string, string> = {
  HANDOVER_NEW_ASSET: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  HANDOVER: 'bg-blue-50 text-blue-700 border-blue-100',
  TRANSFER: 'bg-purple-50 text-purple-700 border-purple-100',
  REPAIR: 'bg-amber-50 text-amber-700 border-amber-100',
  LIQUIDATION: 'bg-rose-50 text-rose-700 border-rose-100',
  LOSS: 'bg-red-50 text-red-700 border-red-100',
  INVENTORY: 'bg-teal-50 text-teal-700 border-teal-100',
  RECALL: 'bg-indigo-50 text-indigo-700 border-indigo-100'
};

export const DocumentLibrary: React.FC = () => {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Modal triggers
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activePreviewTmpl, setActivePreviewTmpl] = useState<any>(null);
  
  const [configOpen, setConfigOpen] = useState(false);
  const [activeConfigTmpl, setActiveConfigTmpl] = useState<any>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data.data || []);
    } catch (e: any) {
      console.error('Failed to fetch templates:', e);
      toast.error('Không thể kết nối danh sách biểu mẫu từ máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSetDefault = async (id: number) => {
    if (!hasPermission('TEMPLATE_SET_DEFAULT')) {
      toast.warning('Bạn không có quyền thực hiện thao tác này');
      return;
    }
    try {
      await api.put(`/templates/${id}/default`);
      toast.success('Đã đặt biểu mẫu làm mặc định cho nghiệp vụ');
      fetchTemplates();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Không thể cập nhật mặc định');
    }
  };

  const handleClone = async (id: number) => {
    if (!hasPermission('TEMPLATE_CREATE')) {
      toast.warning('Bạn không có quyền nhân bản biểu mẫu');
      return;
    }
    try {
      const res = await api.post(`/templates/${id}/clone`);
      toast.success(`Đã nhân bản biểu mẫu thành bản nháp: ${res.data.code}`);
      fetchTemplates();
    } catch (e: any) {
      console.error(e);
      toast.error('Nhân bản biểu mẫu thất bại');
    }
  };

  const handleDelete = async (id: number) => {
    if (!hasPermission('TEMPLATE_DELETE')) {
      toast.warning('Bạn không có quyền xóa biểu mẫu');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa biểu mẫu này không? Thao tác này không thể hoàn tác.')) {
      return;
    }
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Xóa biểu mẫu thành công');
      fetchTemplates();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Xóa biểu mẫu thất bại');
    }
  };

  const handleOpenPreview = (tmpl: any) => {
    setActivePreviewTmpl(tmpl);
    setPreviewOpen(true);
  };

  const handleOpenConfig = (tmpl: any) => {
    setActiveConfigTmpl(tmpl);
    setConfigOpen(true);
  };

  const handleCreateNew = () => {
    if (!hasPermission('TEMPLATE_CREATE')) {
      toast.warning('Bạn không có quyền tạo mới biểu mẫu');
      return;
    }
    setActiveConfigTmpl(null);
    setConfigOpen(true);
  };

  // Filter templates list
  const filteredTemplates = templates.filter(tmpl => {
    const matchesSearch = 
      tmpl.name.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.code.toLowerCase().includes(search.toLowerCase()) ||
      (MODULE_LABELS[tmpl.module] || '').toLowerCase().includes(search.toLowerCase());

    const matchesTab = activeTab === 'ALL' || tmpl.module === activeTab;

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">Đang áp dụng</span>;
      case 'DRAFT':
        return <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">Bản nháp</span>;
      case 'INACTIVE':
      default:
        return <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-150 uppercase tracking-widest">Ngưng dùng</span>;
    }
  };

  const countForModule = (moduleKey: string) => {
    if (moduleKey === 'ALL') return templates.length;
    return templates.filter(t => t.module === moduleKey).length;
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'HANDOVER_NEW_ASSET', label: 'Cấp mới' },
    { key: 'HANDOVER', label: 'Bàn giao' },
    { key: 'TRANSFER', label: 'Điều chuyển' },
    { key: 'REPAIR', label: 'Sửa chữa' },
    { key: 'LIQUIDATION', label: 'Thanh lý' },
    { key: 'LOSS', label: 'Báo mất' },
    { key: 'INVENTORY', label: 'Kiểm kê' },
    { key: 'RECALL', label: 'Thu hồi' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-3">Trung tâm biểu mẫu</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
            Cấu hình biểu mẫu, thiết lập chữ ký và định dạng xuất bản PDF động
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo mã, tên, nghiệp vụ..."
              className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl w-full md:w-[320px] focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-800 placeholder:text-slate-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button 
            onClick={fetchTemplates}
            className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all shadow-sm flex items-center"
            title="Làm mới danh sách"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          {hasPermission('TEMPLATE_CREATE') && (
            <button 
              onClick={handleCreateNew}
              className="px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center transition-all shadow-lg shadow-primary-200"
            >
              <Plus className="h-4 w-4 mr-2" /> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center space-x-2 p-1.5 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center space-x-1.5
              ${activeTab === tab.key 
                ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full ${activeTab === tab.key ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {countForModule(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* CARDS LIST */}
      {loading ? (
        <div className="h-[300px] bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải thư viện biểu mẫu...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="h-[300px] bg-white rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center space-y-3">
          <AlertCircle className="h-12 w-12 text-slate-300" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Không tìm thấy biểu mẫu nào khớp bộ lọc</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((tmpl) => (
            <div 
              key={tmpl.id}
              className={`group bg-white p-6 rounded-[2rem] shadow-sm border transition-all duration-300 flex flex-col justify-between relative
                ${tmpl.isDefault 
                  ? 'border-primary-300 ring-2 ring-primary-100/50 shadow-md shadow-primary-50/60' 
                  : 'border-slate-100 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-50'
                }`}
            >
              {tmpl.isDefault && (
                <div className="absolute top-4 left-6 flex items-center text-[8px] font-black text-white bg-primary-600 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                  <Star className="h-2.5 w-2.5 mr-1 fill-white" /> Mặc định
                </div>
              )}

              <div className={tmpl.isDefault ? 'mt-3' : ''}>
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200">
                      {tmpl.code}
                    </span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">Phiên bản: {tmpl.version}</p>
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight mb-4 group-hover:text-primary-700 transition-colors">
                  {tmpl.name}
                </h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${MODULE_COLORS[tmpl.module] || 'bg-slate-50 text-slate-600'}`}>
                      {MODULE_LABELS[tmpl.module] || tmpl.module}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
                    {getStatusBadge(tmpl.status)}
                  </div>

                  <div className="flex items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    Đã dùng {tmpl.usageCount || 0} lần
                  </div>
                </div>
              </div>

              {/* CARD ACTIONS */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleOpenPreview(tmpl)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Xem mẫu
                  </button>
                  
                  {hasPermission('TEMPLATE_UPDATE') && (
                    <button 
                      onClick={() => handleOpenConfig(tmpl)}
                      className="flex-1 py-3 bg-white border border-primary-200 text-primary-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-50 transition-all flex items-center justify-center"
                    >
                      Cấu hình
                    </button>
                  )}
                </div>

                {/* ADVANCED ADMIN BUTTONS */}
                {(hasPermission('TEMPLATE_SET_DEFAULT') || hasPermission('TEMPLATE_CREATE') || hasPermission('TEMPLATE_DELETE')) && (
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-slate-400">
                    {hasPermission('TEMPLATE_SET_DEFAULT') && !tmpl.isDefault && tmpl.status === 'ACTIVE' && (
                      <button 
                        onClick={() => handleSetDefault(tmpl.id)}
                        className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-primary-600 flex items-center"
                        title="Đặt mặc định"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Mặc định
                      </button>
                    )}

                    {hasPermission('TEMPLATE_CREATE') && (
                      <button 
                        onClick={() => handleClone(tmpl.id)}
                        className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-primary-600 flex items-center"
                        title="Nhân bản"
                      >
                        <Copy className="h-3 w-3 mr-1" /> Nhân bản
                      </button>
                    )}

                    {hasPermission('TEMPLATE_DELETE') && !tmpl.isDefault && (
                      <button 
                        onClick={() => handleDelete(tmpl.id)}
                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 flex items-center ml-auto"
                        title="Xóa mẫu"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENDER PREVIEW MODAL */}
      {activePreviewTmpl && (
        <TemplatePreviewModal
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setActivePreviewTmpl(null);
          }}
          templateCode={activePreviewTmpl.code}
          templateName={activePreviewTmpl.name}
          module={activePreviewTmpl.module}
          configJson={activePreviewTmpl.configJson}
        />
      )}

      {/* RENDER CONFIG WIZARD MODAL */}
      <TemplateConfigModal
        isOpen={configOpen}
        onClose={() => {
          setConfigOpen(false);
          setActiveConfigTmpl(null);
        }}
        template={activeConfigTmpl}
        onSave={fetchTemplates}
      />
    </div>
  );
};
export default DocumentLibrary;
