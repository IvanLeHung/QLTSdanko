import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  FileUp, 
  FileDown, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  Loader2,
  Columns,
  Table,
  Check,
  AlertTriangle,
  History,
  XCircle,
  FileSpreadsheet,
  Settings
} from 'lucide-react';

interface SystemField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
}

const SYSTEM_FIELDS: SystemField[] = [
  { key: 'eventTime', label: 'Thời gian phát sinh', required: true, aliases: ['thời gian', 'ngày giờ', 'ngay gio', 'date', 'time', 'eventtime', 'timestamp'] },
  { key: 'assetCode', label: 'Mã tài sản', required: true, aliases: ['mã tài sản', 'ma tai san', 'mts', 'assetcode', 'code'] },
  { key: 'oldStatus', label: 'Trạng thái cũ', required: false, aliases: ['trạng thái cũ', 'trang thai cu', 'oldstatus', 'statusold'] },
  { key: 'newStatus', label: 'Trạng thái mới', required: true, aliases: ['trạng thái mới', 'trang thai moi', 'status', 'newstatus', 'statusnew'] },
  { key: 'oldUserName', label: 'Người dùng cũ', required: false, aliases: ['người dùng cũ', 'nguoi dung cu', 'olduser', 'userold'] },
  { key: 'newUserName', label: 'Người dùng mới', required: false, aliases: ['người dùng mới', 'nguoi dung moi', 'newuser', 'usernew', 'nguoi dung'] },
  { key: 'oldLocationName', label: 'Vị trí cũ', required: false, aliases: ['vị trí cũ', 'vi tri cu', 'oldlocation', 'locationold'] },
  { key: 'newLocationName', label: 'Vị trí mới', required: false, aliases: ['vị trí mới', 'vi tri moi', 'newlocation', 'locationnew', 'vị trí', 'vi tri'] },
  { key: 'oldDepartmentName', label: 'Phòng ban cũ', required: false, aliases: ['phòng ban cũ', 'phong ban cu', 'olddept', 'deptold'] },
  { key: 'newDepartmentName', label: 'Phòng ban mới', required: false, aliases: ['phòng ban mới', 'phong ban moi', 'newdept', 'deptnew', 'phòng ban', 'phong ban'] },
  { key: 'oldProjectName', label: 'Dự án cũ', required: false, aliases: ['dự án cũ', 'du an cu', 'oldproject', 'projectold'] },
  { key: 'newProjectName', label: 'Dự án mới', required: false, aliases: ['dự án mới', 'du an moi', 'newproject', 'projectnew', 'dự án', 'du an'] },
  { key: 'oldCityName', label: 'Thành phố cũ', required: false, aliases: ['thành phố cũ', 'thanh pho cu', 'oldcity', 'cityold'] },
  { key: 'newCityName', label: 'Thành phố mới', required: false, aliases: ['thành phố mới', 'thanh pho moi', 'newcity', 'citynew', 'thành phố', 'thanh pho'] },
  { key: 'oldNote', label: 'Ghi chú cũ', required: false, aliases: ['ghi chú cũ', 'ghi chu cu', 'oldnote', 'noteold'] },
  { key: 'newNote', label: 'Ghi chú mới', required: false, aliases: ['ghi chú mới', 'ghi chu moi', 'newnote', 'notenew', 'ghi chú', 'ghi chu'] },
  { key: 'assetName', label: 'Tên tài sản (đối chiếu)', required: false, aliases: ['tên tài sản', 'ten tai san', 'assetname', 'name'] },
];

export const ImportAssetsHistory: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mapping phase
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  
  // Preview phase
  const [previewSummary, setPreviewSummary] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR'>('ALL');
  
  // Options checkboxes
  const [updateCurrentAssetState, setUpdateCurrentAssetState] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [skipRefErrors, setSkipRefErrors] = useState(true);
  const [allowCreateMissingAssets, setAllowCreateMissingAssets] = useState(false);
  
  // Final summary
  const [importResult, setImportResult] = useState<any>(null);

  // Initialize mapping when headers are loaded
  useEffect(() => {
    if (headers.length > 0) {
      const initialMap: Record<string, string> = {};
      SYSTEM_FIELDS.forEach((field) => {
        // Smart auto-detection based on aliases
        const match = headers.find((h) => {
          const cleanH = h.toLowerCase().trim();
          return field.aliases.some((alias) => cleanH === alias || cleanH.includes(alias));
        });
        if (match) {
          initialMap[field.key] = match;
        } else {
          initialMap[field.key] = '';
        }
      });
      setMapping(initialMap);
    }
  }, [headers]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/assets/history-import/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_history_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Tải tệp mẫu XLSX thành công!");
    } catch (err) {
      toast.error("Lỗi khi tải template XLSX");
    }
  };

  const handleUploadFile = async () => {
    if (!file) {
      toast.warning("Vui lòng chọn file Excel!");
      return;
    }
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/assets/history-import/parse', formData);
      setHeaders(res.data.headers || []);
      setSampleRows(res.data.sampleRows || []);
      setStep('mapping');
      toast.success("Đọc file Excel thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi đọc file Excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    // Enforce required mapping checks
    const missingRequired = SYSTEM_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Vui lòng chọn cột map cho các trường bắt buộc: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    try {
      const res = await api.post('/assets/history-import/parse', formData);
      setPreviewSummary(res.data.summary);
      setPreviewRows(res.data.rows || []);
      setStep('preview');
      toast.success("Phân tích xem trước dữ liệu thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi phân tích xem trước.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await api.post('/assets/history-import/confirm', {
        rows: previewRows,
        updateCurrentAssetState,
        skipDuplicates,
        skipRefErrors,
        allowCreateMissingAssets
      });
      setImportResult(res.data);
      setStep('success');
      toast.success("Đã ghi nhận toàn bộ lịch sử luân chuyển!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Ghi nhận import thất bại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPreviewRows = previewRows.filter((r) => {
    if (filterType === 'ALL') return true;
    return r.status === filterType;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'VALID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WARNING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ERROR': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusTextVietnamese = (status: string) => {
    switch (status) {
      case 'VALID': return 'Hợp lệ';
      case 'WARNING': return 'Cảnh báo';
      case 'ERROR': return 'Lỗi';
      default: return status;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <History className="mr-3 h-8 w-8 text-primary-600" />
            Import Lịch sử luân chuyển tài sản
          </h1>
          <p className="text-slate-500 mt-1">Ghi nhận nhật ký di chuyển vật lý, thay đổi người sử dụng và trạng thái hàng loạt theo từng mã tài sản.</p>
        </div>
        {step !== 'success' && (
          <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <Download className="mr-2 h-4 w-4" /> Tải file mẫu Excel (.xlsx)
          </button>
        )}
      </div>

      {/* Progress Steps Indicators */}
      <div className="flex items-center justify-center space-x-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {[
          { id: 'upload', label: 'Tải tệp tin' },
          { id: 'mapping', label: 'Ánh xạ cột' },
          { id: 'preview', label: 'Xem trước' },
          { id: 'success', label: 'Kết quả' }
        ].map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center space-x-2 ${step === s.id ? 'text-primary-600 font-bold' : 'text-slate-400 font-medium'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                step === s.id ? 'bg-primary-50 border-primary-600 text-primary-700' :
                (idx < ['upload', 'mapping', 'preview', 'success'].indexOf(step) ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-400')
              }`}>
                {idx < ['upload', 'mapping', 'preview', 'success'].indexOf(step) ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span className="text-sm">{s.label}</span>
            </div>
            {idx < 3 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === 'upload' && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-12">
          <div className="max-w-xl mx-auto text-center space-y-8">
            <div className="inline-flex p-5 bg-primary-50 rounded-full text-primary-600 shadow-inner">
              <FileSpreadsheet className="h-12 w-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Chọn file Excel lịch sử luân chuyển</h3>
              <p className="text-slate-500 mt-2">Dữ liệu từng dòng tương ứng với sự kiện di chuyển/đổi trạng thái của mã tài sản theo mốc thời gian.</p>
            </div>

            <div className="relative group">
              <input 
                type="file" 
                accept=".xlsx,.csv" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 group-hover:border-primary-400 group-hover:bg-slate-50/50 transition-all">
                <span className="text-slate-400 font-bold text-center block text-lg">
                  {file ? file.name : "Kéo thả file .xlsx hoặc .csv vào đây hoặc nhấn để chọn"}
                </span>
                <span className="text-xs text-slate-300 block mt-2">Hỗ trợ các cột Thời gian, Mã tài sản, Trạng thái, Vị trí,...</span>
              </div>
            </div>

            {file && (
              <button 
                onClick={handleUploadFile} 
                disabled={isProcessing}
                className="btn-primary w-full py-4 flex items-center justify-center text-lg shadow-xl shadow-primary-100 rounded-xl"
              >
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><FileUp className="mr-2 h-5 w-5" /> Đọc file Excel/CSV & Ánh xạ cột</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <Columns className="h-6 w-6 text-primary-600" />
              <div>
                <h3 className="text-xl font-black text-slate-900">Ánh xạ cột dữ liệu</h3>
                <p className="text-sm text-slate-500">Đối chiếu các trường thông tin trong hệ thống với tiêu đề cột thực tế trong file Excel của bạn.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-800">{field.label}</span>
                    {field.required ? (
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Bắt buộc</span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Tùy chọn</span>
                    )}
                  </div>
                  
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="mt-2 sm:mt-0 w-full sm:w-64 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:border-primary-500 focus:ring-0 shadow-sm"
                  >
                    <option value="">-- Bỏ qua cột này --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              <button 
                onClick={() => setStep('upload')} 
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
              >
                Quay lại
              </button>
              <button 
                onClick={handlePreview} 
                disabled={isProcessing}
                className="btn-primary px-8 py-3.5 flex items-center shadow-xl shadow-primary-100 rounded-xl"
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Table className="mr-2 h-4 w-4" /> Tiến hành Xem trước (Preview) <ChevronRight className="ml-2 h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW AND CONFIG */}
      {step === 'preview' && previewSummary && (
        <div className="space-y-8 animate-in fade-in duration-350">
          
          {/* Summary Box */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">Tổng quan phân tích Excel</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng dòng đọc</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{previewSummary.totalRows}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Hợp lệ hoàn toàn</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{previewSummary.validCount}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Cảnh báo mã tài sản</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{previewSummary.missingAssetCount}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Trùng lặp lịch sử</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">{previewSummary.duplicateCount}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Có lỗi #REF!</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{previewSummary.refErrorCount}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Lỗi ngày tháng</p>
                <p className="text-2xl font-black text-rose-700 mt-1">{previewSummary.dateErrorCount}</p>
              </div>
            </div>
          </div>

          {/* Config Settings Checkboxes */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl border border-slate-800 space-y-6">
            <h3 className="text-lg font-black tracking-tight border-b border-slate-800 pb-3 flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary-400" /> Tùy chọn nâng cao khi Import lịch sử
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="mt-1 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-sm text-slate-100 group-hover:text-primary-300 transition-colors">Bỏ qua các dòng trùng lịch sử</span>
                  <p className="text-xs text-slate-400 mt-0.5">Không nạp bản ghi nếu mã tài sản + mốc thời gian + trạng thái + vị trí đã tồn tại.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={skipRefErrors}
                  onChange={(e) => setSkipRefErrors(e.target.checked)}
                  className="mt-1 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-sm text-slate-100 group-hover:text-primary-300 transition-colors">Bỏ qua dòng chứa lỗi #REF!</span>
                  <p className="text-xs text-slate-400 mt-0.5">Cảnh báo và tự động bỏ qua các dòng Excel bị lỗi công thức tham chiếu.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={allowCreateMissingAssets}
                  onChange={(e) => setAllowCreateMissingAssets(e.target.checked)}
                  className="mt-1 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-sm text-slate-100 group-hover:text-primary-300 transition-colors">Tự tạo tài sản nếu mã chưa tồn tại</span>
                  <p className="text-xs text-slate-400 mt-0.5">Nếu phát hiện assetCode chưa có trong DB, tự tạo thông tin cơ bản để lưu lịch sử.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={updateCurrentAssetState}
                  onChange={(e) => setUpdateCurrentAssetState(e.target.checked)}
                  className="mt-1 rounded border-slate-700 bg-slate-800 text-primary-600 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-sm text-slate-100 group-hover:text-primary-300 transition-colors">Đồng bộ trạng thái hiện tại theo bản ghi mới nhất</span>
                  <p className="text-xs text-slate-400 mt-0.5 text-rose-300 font-medium">Tìm bản ghi có ngày giờ lớn nhất trong file để cập nhật lại Trạng thái/Người dùng/Vị trí hiện tại của tài sản.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Interactive Preview Table */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Table className="h-5 w-5 text-slate-500" />
                <span className="text-lg font-black text-slate-800">Chi tiết bảng dữ liệu xem trước ({filteredPreviewRows.length} dòng)</span>
              </div>
              
              <div className="flex bg-slate-200/60 p-1 rounded-xl">
                {(['ALL', 'VALID', 'WARNING', 'ERROR'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterType === t 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t === 'ALL' ? 'Tất cả' : t === 'VALID' ? 'Hợp lệ' : t === 'WARNING' ? 'Cảnh báo' : 'Lỗi'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono uppercase tracking-widest text-[9px]">
                    <th className="p-4 border-b border-slate-800">STT</th>
                    <th className="p-4 border-b border-slate-800">Thời gian</th>
                    <th className="p-4 border-b border-slate-800">Mã tài sản</th>
                    <th className="p-4 border-b border-slate-800">Tên tài sản</th>
                    <th className="p-4 border-b border-slate-800">Trạng thái</th>
                    <th className="p-4 border-b border-slate-800">Vị trí / Người dùng</th>
                    <th className="p-4 border-b border-slate-800">Ghi chú</th>
                    <th className="p-4 border-b border-slate-800">Kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">Không tìm thấy dòng nào phù hợp bộ lọc.</td>
                    </tr>
                  ) : filteredPreviewRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-400">{r.stt}</td>
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {r.eventTime ? new Date(r.eventTime).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-950 uppercase">{r.assetCode}</td>
                      <td className="p-4 text-slate-600 truncate max-w-[150px]">{r.assetName}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">{r.oldStatus || '-'}</span>
                          <span className="text-slate-300">→</span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{r.newStatus}</span>
                        </div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">Vị trí:</span>
                          <span className="text-slate-500 font-semibold">{r.oldLocationName || '-'}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-slate-800 font-bold">{r.newLocationName || '-'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400">Người:</span>
                          <span className="text-slate-500 font-semibold">{r.oldUserName || '-'}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-slate-800 font-bold">{r.newUserName || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 truncate max-w-[150px] italic">{r.newNote || r.oldNote || '-'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}>
                          {getStatusTextVietnamese(r.status)}
                        </span>
                        {(r.errors?.length > 0 || r.warnings?.length > 0) && (
                          <div className="mt-1 text-[10px] text-rose-500 space-y-0.5 max-w-[180px]">
                            {r.errors.map((e: string, eIdx: number) => <p key={eIdx} className="font-bold flex items-center"><XCircle className="w-3 h-3 mr-1 shrink-0" /> {e}</p>)}
                            {r.warnings.map((w: string, wIdx: number) => <p key={wIdx} className="font-bold text-amber-600 flex items-center"><AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> {w}</p>)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => setStep('mapping')} 
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold"
              >
                Quay lại ánh xạ cột
              </button>
              
              <button
                onClick={handleConfirmImport}
                disabled={isProcessing || previewSummary.errorCount > 0}
                className={`btn-primary px-8 py-3.5 flex items-center shadow-xl rounded-xl ${
                  previewSummary.errorCount > 0 
                    ? 'opacity-55 cursor-not-allowed bg-slate-300 shadow-none border-slate-300' 
                    : 'shadow-primary-100'
                }`}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Xác nhận nạp Lịch sử ({previewSummary.willImportCount} dòng)</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'success' && importResult && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-12 text-center max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-350">
          <div className="inline-flex p-5 bg-emerald-50 rounded-full text-emerald-500 shadow-inner">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Import Lịch sử thành công!</h2>
            <p className="text-slate-500 mt-2">Toàn bộ thông tin vòng đời đã được đồng bộ vào chi tiết của từng mã tài sản tương ứng.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số dòng import thực tế</span>
              <span className="text-2xl font-black text-slate-800">{importResult.importedCount}</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số tài sản bị ảnh hưởng</span>
              <span className="text-2xl font-black text-slate-800">{importResult.affectedAssets}</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Đã bỏ qua trùng lặp</span>
              <span className="text-2xl font-black text-slate-800">{importResult.skippedDuplicateCount}</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Đã đồng bộ trạng thái hiện tại</span>
              <span className="text-2xl font-black text-slate-800">{importResult.updatedAssetCount} tài sản</span>
            </div>
          </div>

          <div className="flex space-x-3 justify-center pt-4">
            <button 
              onClick={() => {
                setFile(null);
                setPreviewSummary(null);
                setPreviewRows([]);
                setStep('upload');
              }} 
              className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all shadow-sm"
            >
              Tiếp tục Import file mới
            </button>
            <a 
              href="/assets"
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md"
            >
              Đi tới Sổ tài sản
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
