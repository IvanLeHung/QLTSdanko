import React, { useState } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { FileUp, FileDown, Download, AlertCircle, CheckCircle2, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ImportTools: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/tools/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'CCDC_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Lỗi khi tải template");
    }
  };

  const handleExportCurrent = async () => {
    try {
      const response = await api.get('/tools/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Danh_sach_CCDC_Hien_tai.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Lỗi khi xuất dữ liệu");
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/tools/import/preview', formData);
      setPreviewData(res.data);
      toast.info("Đã tải dữ liệu xem trước");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xử lý file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/tools/import/commit', formData);
      const data = res.data;
      if (data.failedCount > 0) {
        toast.warning(`Import hoàn tất: ${data.successCount} thành công, ${data.failedCount} thất bại! Vui lòng kiểm tra lại log.`, { autoClose: 10000 });
      } else {
        toast.success(`Import thành công toàn bộ ${data.successCount} công cụ dụng cụ!`);
      }
      setPreviewData(null);
      setFile(null);
      navigate('/tools');
    } catch (err: any) {
      toast.error("Import thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/tools')} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs mb-2 border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Import CCDC from Excel</h1>
          <p className="text-slate-500">Tải tệp mẫu Excel, sao chép thông tin danh mục CCDC vào và tải lên để thêm mới hoặc cập nhật hàng loạt.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="mr-2 h-4 w-4" /> Tải Excel mẫu
          </button>
          <button onClick={handleExportCurrent} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <FileDown className="mr-2 h-4 w-4" /> Xuất dữ liệu hiện có
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="inline-flex p-4 bg-primary-50 rounded-full text-primary-600">
            <FileUp className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tải lên file Excel dữ liệu CCDC</h3>
            <p className="text-slate-500 mt-1">Hỗ trợ định dạng .xlsx. Dung lượng tối đa 10MB.</p>
          </div>

          <div className="relative group">
            <input 
              type="file" 
              accept=".xlsx" 
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreviewData(null);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 group-hover:border-primary-400 transition-colors">
              <span className="text-slate-400 font-medium text-center block">
                {file ? file.name : "Kéo thả file hoặc nhấn để chọn"}
              </span>
            </div>
          </div>

          {file && !previewData && (
            <button 
              onClick={handlePreview} 
              disabled={isProcessing}
              className="w-full py-3 flex items-center justify-center text-lg font-bold bg-primary-650 hover:bg-primary-750 text-white rounded-xl shadow-xl shadow-primary-100 border-0 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><FileUp className="mr-2 h-5 w-5" /> Xem trước dữ liệu (Preview)</>}
            </button>
          )}
        </div>

        {previewData && (
          <div className="mt-12 space-y-8 border-t border-slate-100 pt-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng số dòng</p>
                <p className="text-2xl font-bold text-slate-900">{previewData.total}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                <p className="text-[10px] font-bold text-green-600 uppercase">Tạo mới</p>
                <p className="text-2xl font-bold text-green-700">{previewData.creates}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Cập nhật</p>
                <p className="text-2xl font-bold text-blue-700">{previewData.updates}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                <p className="text-[10px] font-bold text-red-600 uppercase">Có lỗi</p>
                <p className="text-2xl font-bold text-red-700">{previewData.errors}</p>
              </div>
            </div>

            {/* TOP ACTION BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-sm font-medium text-slate-600">
                {previewData.errors > 0 ? (
                  <span className="text-red-600 flex items-center font-bold">
                    <AlertCircle className="h-4 w-4 mr-1" /> Vui lòng sửa {previewData.errors} lỗi trong file để tiếp tục.
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center font-bold">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Dữ liệu hợp lệ, sẵn sàng nạp vào hệ thống.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setPreviewData(null); setFile(null); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors border-0 bg-transparent cursor-pointer">
                  Hủy
                </button>
                <button 
                  onClick={handleConfirmImport}
                  disabled={previewData.errors > 0 || isProcessing}
                  className={`px-6 py-2 text-sm font-bold bg-primary-650 hover:bg-primary-750 text-white rounded-xl flex items-center border-0 cursor-pointer shadow-lg shadow-primary-200 ${previewData.errors > 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xác nhận Import"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                   <tr>
                     <th className="px-6 py-3 border-b">Dòng</th>
                     <th className="px-6 py-3 border-b">Hành động</th>
                     <th className="px-6 py-3 border-b">Mã CCDC</th>
                     <th className="px-6 py-3 border-b">Tên CCDC</th>
                     <th className="px-6 py-3 border-b">Nhóm CCDC</th>
                     <th className="px-6 py-3 border-b">Kết quả</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {previewData.preview.map((row: any) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400 border-b">{row.rowNumber}</td>
                        <td className="px-6 py-4 border-b">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.action_detected === 'CREATE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.action_detected}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm border-b">{row.toolCode || "(Tự động sinh)"}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 border-b font-medium">{row.toolName}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 border-b font-medium">{row.category}</td>
                        <td className="px-6 py-4 border-b">
                          {row.status === 'VALID' ? (
                            <div className="flex items-center text-green-600 text-[10px] font-bold">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> HỢP LỆ
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600 text-[10px] font-bold uppercase">
                              <AlertCircle className="h-3 w-3 mr-1" /> {row.messages[0]}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>

            <div className="flex justify-end space-x-4">
              <button onClick={() => { setPreviewData(null); setFile(null); }} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border-0 bg-transparent cursor-pointer">
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={previewData.errors > 0 || isProcessing}
                className={`px-10 py-3 text-lg font-bold bg-primary-650 hover:bg-primary-750 text-white rounded-xl flex items-center border-0 cursor-pointer shadow-2xl shadow-primary-200 ${previewData.errors > 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Xác nhận Import</>}
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <h4 className="font-bold text-slate-900 flex items-center">
            <ChevronRight className="h-4 w-4 mr-1 text-primary-600" /> Quy trình Import chuẩn cho CCDC
          </h4>
          <ol className="mt-4 space-y-3 text-sm text-slate-600 list-decimal list-inside">
            <li>Tải file Excel mẫu hoặc tải dữ liệu CCDC hiện tại về máy.</li>
            <li>Điền các thông tin (Tên CCDC, Nhóm CCDC bắt buộc; Số lượng mặc định là 1; Đơn vị tính mặc định là Cái).</li>
            <li>Có thể điền mã CCDC thủ công hoặc để trống để hệ thống tự động sinh mã dạng <code>CCDC.IT.2026.0001</code>.</li>
            <li>Tải tệp tin lên hệ thống, nhấn <strong>Preview</strong> để kiểm tra dữ liệu trước khi nạp chính thức.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
