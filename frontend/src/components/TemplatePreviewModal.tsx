import React, { useEffect, useState } from 'react';
import { X, Download, Printer, Loader2, AlertCircle, FileText } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateCode: string;
  templateName: string;
  module: string;
  configJson: string | object;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  templateCode,
  templateName,
  module,
  configJson,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      generatePreview();
    } else {
      // Clean up blob URL on close
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setError(null);
    }
  }, [isOpen, configJson]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(
        '/templates/preview-test',
        {
          module,
          templateName,
          templateCode,
          configJson: typeof configJson === 'string' ? JSON.parse(configJson) : configJson,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      console.error('Failed to load PDF preview:', err);
      setError('Không thể kết xuất PDF xem trước. Đang hiển thị bản nháp HTML fallback.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Preview_${templateCode.replace('/', '_')}.pdf`;
      link.click();
      toast.success('Bắt đầu tải xuống bản xem trước PDF');
    } else {
      toast.error('Bản xem trước PDF chưa sẵn sàng');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        // Modern browsers will show print dialog directly for PDF inside new window
      } else {
        toast.error('Vui lòng cho phép mở popup để in');
      }
    } else {
      toast.error('Bản in chưa sẵn sàng');
    }
  };

  if (!isOpen) return null;

  const parsedConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
  const cols = parsedConfig?.assetTable?.columns || [];
  const sigs = parsedConfig?.signature?.columns || [];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* CONTAINER */}
      <div className="relative w-full max-w-[1100px] bg-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300 h-[90vh]">
        
        {/* HEADER */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 uppercase tracking-widest">
                {templateCode}
              </span>
              <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mt-2 uppercase">{templateName}</h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleDownload}
              className="px-4 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center transition-all"
            >
              <Download className="h-4 w-4 mr-2" /> Tải PDF
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-3 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center transition-all"
            >
              <Printer className="h-4 w-4 mr-2" /> In thử
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100"
            >
              <X className="h-6 w-6 text-slate-400 hover:text-slate-700" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center custom-scrollbar">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang kết xuất bản xem trước PDF từ hệ thống...</p>
            </div>
          ) : error || !pdfUrl ? (
            /* HTML FALLBACK PREVIEW */
            <div className="bg-white shadow-xl rounded-sm w-[210mm] min-h-[297mm] p-16 space-y-12 text-slate-800 relative font-sans leading-relaxed">
              {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center text-xs font-bold uppercase mb-8">
                  <AlertCircle className="h-5 w-5 mr-3 text-amber-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* A4 Header Row */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div>
                  {parsedConfig?.header?.showLogo !== false && (
                    <>
                      <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">{parsedConfig?.header?.companyName || 'DANKO GROUP'}</h2>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{parsedConfig?.header?.departmentText || 'BỘ PHẬN QLTS'}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {parsedConfig?.header?.showTemplateCode !== false && (
                    <p className="text-[11px] font-black text-slate-900">Mẫu số: {templateCode}</p>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Số: BBBG/2026/05/9999</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-6">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {templateName}
                </h1>
                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Ngày 19 tháng 05 năm 2026</p>
              </div>

              {/* Signers Info Block */}
              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div className="border-b border-slate-100 pb-2">
                  <p className="font-bold text-slate-900 uppercase">I. BÊN GIAO (ĐẠI DIỆN)</p>
                  <p className="mt-1">Ông/Bà: Nguyễn Văn Giao - Bộ phận: Ban CNTT (Chức vụ: Trưởng nhóm hạ tầng)</p>
                </div>
                <div className="border-b border-slate-100 pb-2">
                  <p className="font-bold text-slate-900 uppercase">II. BÊN NHẬN (ĐẠI DIỆN)</p>
                  <p className="mt-1">Ông/Bà: Trần Thị Nhận - Bộ phận: Phòng HCNS (Chức vụ: Chuyên viên tuyển dụng)</p>
                </div>
              </div>

              {/* Dynamic Asset Table */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase text-slate-900">III. DANH SÁCH TÀI SẢN GIAO NHẬN</p>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      {cols.includes('index') && <th className="border border-slate-400 p-2 text-center">STT</th>}
                      {cols.includes('assetCode') && <th className="border border-slate-400 p-2 text-center">Mã tài sản</th>}
                      {cols.includes('assetCodeQr') && <th className="border border-slate-400 p-2 text-center">Mã tài sản / QR</th>}
                      {cols.includes('assetName') && <th className="border border-slate-400 p-2 text-left">Tên tài sản</th>}
                      {cols.includes('specification') && <th className="border border-slate-400 p-2 text-left">Mô tả kỹ thuật</th>}
                      {cols.includes('serial') && <th className="border border-slate-400 p-2 text-center">Serial</th>}
                      {cols.includes('unit') && <th className="border border-slate-400 p-2 text-center">ĐVT</th>}
                      {cols.includes('quantity') && <th className="border border-slate-400 p-2 text-center">SL</th>}
                      {cols.includes('condition') && <th className="border border-slate-400 p-2 text-left">Tình trạng</th>}
                      {cols.includes('note') && <th className="border border-slate-400 p-2 text-left">Ghi chú</th>}
                      {cols.includes('purchasePriceExVat') && <th className="border border-slate-400 p-2 text-right">Đơn giá</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {cols.includes('index') && <td className="border border-slate-400 p-2 text-center">1</td>}
                      {cols.includes('assetCode') && <td className="border border-slate-400 p-2 text-center font-mono">TS0001/HN/CNTT</td>}
                      {cols.includes('assetCodeQr') && (
                        <td className="border border-slate-400 p-2 text-center font-mono space-y-1">
                          <div>TS0001/HN/CNTT</div>
                          <div className="w-12 h-12 bg-slate-200 mx-auto flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase">[QR CODE]</div>
                        </td>
                      )}
                      {cols.includes('assetName') && <td className="border border-slate-400 p-2 font-bold">Laptop Dell XPS 15 9530</td>}
                      {cols.includes('specification') && <td className="border border-slate-400 p-2 text-slate-500">Máy tính xách tay phục vụ chuyên môn</td>}
                      {cols.includes('serial') && <td className="border border-slate-400 p-2 text-center">SN-DELLXPS15-2026</td>}
                      {cols.includes('unit') && <td className="border border-slate-400 p-2 text-center">Chiếc</td>}
                      {cols.includes('quantity') && <td className="border border-slate-400 p-2 text-center">1</td>}
                      {cols.includes('condition') && <td className="border border-slate-400 p-2">Đang sử dụng</td>}
                      {cols.includes('note') && <td className="border border-slate-400 p-2 text-slate-400">---</td>}
                      {cols.includes('purchasePriceExVat') && <td className="border border-slate-400 p-2 text-right">45.000.000</td>}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Commitments */}
              {parsedConfig?.includeCommitment !== false && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs italic text-slate-600 whitespace-pre-wrap">
                  {parsedConfig?.commitmentText || `Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản nêu trên và có trách nhiệm quản lý, sử dụng tài sản đúng mục đích công việc.
Hệ thống/cá nhân quản lý tài sản cập nhật trạng thái tài sản theo biên bản này sau khi các bên xác nhận.`}
                </div>
              )}

              {/* Signature Section */}
              <div className="pt-8">
                <div className="flex justify-between text-center text-xs font-bold uppercase text-slate-800">
                  {sigs.map((sig: string) => {
                    let title = sig.toUpperCase();
                    if (sig === 'sender') title = 'ĐẠI DIỆN BÊN GIAO';
                    if (sig === 'receiver') title = 'ĐẠI DIỆN BÊN NHẬN';
                    if (sig === 'qlts') title = 'CVTS / HCNS';
                    if (sig === 'director') title = 'GIÁM ĐỐC';
                    if (sig === 'department') title = 'TRƯỞNG PHÒNG';
                    if (sig === 'inventory') title = 'HỘI ĐỒNG KIỂM KÊ';

                    return (
                      <div key={sig} className="flex-1 space-y-16">
                        <div>
                          <p>{title}</p>
                          <p className="text-[10px] font-bold text-slate-400 italic normal-case mt-0.5">(Ký, ghi rõ họ tên)</p>
                        </div>
                        <div className="text-slate-200 font-bold uppercase tracking-wider text-[9px] select-none italic">[Chữ ký]</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Block */}
              <div className="absolute bottom-10 left-16 right-16 border-t border-slate-200 pt-4 flex flex-col items-center text-[10px] text-slate-400">
                {parsedConfig?.footer?.showSupportLine !== false && (
                  <p className="mb-2 text-center italic">{parsedConfig?.footer?.supportLine || 'CBNV có nhu cầu hỗ trợ về CNTT xin liên hệ: Lê Khánh Hùng – Phone/Viber: 0977131579'}</p>
                )}
                <div className="w-full flex justify-between">
                  {parsedConfig?.footer?.showPageNumber !== false ? <p>Trang 1/1</p> : <p></p>}
                  <p>Mã hồ sơ: BBBG/2026/05/9999</p>
                </div>
              </div>
            </div>
          ) : (
            /* REAL PDF RENDER IN IFRAME */
            <div className="w-full max-w-[210mm] h-[80vh] shadow-2xl bg-white border border-slate-200 overflow-hidden rounded-2xl">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full"
                title="PDF Preview Frame"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
