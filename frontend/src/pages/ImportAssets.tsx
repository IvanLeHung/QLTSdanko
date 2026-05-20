import React, { useState } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { FileUp, FileDown, Download, AlertCircle, CheckCircle2, ChevronRight, HelpCircle, Loader2 } from 'lucide-react';

export const ImportAssets: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/import/assets/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Lỗi khi tải template");
    }
  };

  const handleExportCurrent = async () => {
    try {
      const response = await api.get('/import/assets/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'current_assets_export.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Lỗi khi export dữ liệu");
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/import/assets/preview', formData);
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
      await api.post('/import/assets/excel', formData);
      toast.success("Import dữ liệu thành công!");
      setPreviewData(null);
      setFile(null);
    } catch (err: any) {
      toast.error("Import thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Import Assets from Excel</h1>
          <p className="text-slate-500">Tải template theo đúng cấu trúc file tài sản hiện tại, copy dữ liệu vào và upload để tạo/cập nhật hàng loạt.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="mr-2 h-4 w-4" /> Download Template
          </button>
          <button onClick={handleExportCurrent} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <FileDown className="mr-2 h-4 w-4" /> Export Current Assets
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors opacity-50 cursor-not-allowed">
            <AlertCircle className="mr-2 h-4 w-4" /> Download Error Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="inline-flex p-4 bg-primary-50 rounded-full text-primary-600">
            <FileUp className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tải lên file Excel dữ liệu</h3>
            <p className="text-slate-500 mt-1">Hỗ trợ định dạng .xlsx. Dung lượng tối đa 10MB.</p>
          </div>

          <div className="relative group">
            <input 
              type="file" 
              accept=".xlsx" 
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreviewData(null); // Fix: Clear previous preview when a new file is selected
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
              className="btn-primary w-full py-3 flex items-center justify-center text-lg shadow-xl shadow-primary-100"
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
                <button onClick={() => { setPreviewData(null); setFile(null); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                  Hủy
                </button>
                <button 
                  onClick={handleConfirmImport}
                  disabled={previewData.errors > 0 || isProcessing}
                  className={`btn-primary px-6 py-2 text-sm flex items-center shadow-lg shadow-primary-200 ${previewData.errors > 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                     <th className="px-6 py-3 border-b">Mã tài sản</th>
                     <th className="px-6 py-3 border-b">Tên tài sản</th>
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
                        <td className="px-6 py-4 font-mono text-sm border-b">{row.asset_code || "(Tự động)"}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 border-b font-medium">{row.asset_name}</td>
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
              <button onClick={() => { setPreviewData(null); setFile(null); }} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={previewData.errors > 0 || isProcessing}
                className={`btn-primary px-10 py-3 text-lg flex items-center shadow-2xl shadow-primary-200 ${previewData.errors > 0 || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Xác nhận Import</>}
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <h4 className="font-bold text-slate-900 flex items-center">
            <ChevronRight className="h-4 w-4 mr-1 text-primary-600" /> Quy trình Import chuẩn
          </h4>
          <ol className="mt-4 space-y-3 text-sm text-slate-600 list-decimal list-inside">
            <li>Tải template hoặc Export dữ liệu hiện tại về máy.</li>
            <li>Điền thông tin tài sản vào file Excel theo đúng định dạng hướng dẫn.</li>
            <li>Tải file đã chỉnh sửa lên hệ thống và nhấn <strong>Preview</strong>.</li>
            <li>Kiểm tra các thông báo lỗi hoặc cảnh báo nếu có.</li>
            <li>Nhấn <strong>Xác nhận Import</strong> để đồng bộ dữ liệu vào hệ thống.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
