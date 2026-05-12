import React from 'react';
import { X, Download, Printer, ChevronLeft, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfUrl?: string; // In a real app, this would be a blob URL or S3 link
  onDownload: () => void;
  onPrint: () => void;
  onConfirm: () => void;
  loading?: boolean;
  content?: React.ReactNode; // For mock previewing HTML as if it were PDF
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  pdfUrl,
  onDownload,
  onPrint,
  onConfirm,
  loading = false,
  content
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-[1000px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300 max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">{title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-500" /> Bản xem trước định dạng PDF chuẩn
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
          >
            <X className="h-6 w-6 text-slate-300 group-hover:text-slate-600" />
          </button>
        </div>

        {/* PDF PREVIEW AREA */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex justify-center custom-scrollbar">
          {loading ? (
            <div className="h-[500px] flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tạo bản xem trước PDF...</p>
            </div>
          ) : (
            <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden w-full max-w-[210mm] min-h-[297mm] transform transition-transform">
              {content || (
                <div className="p-20 text-center space-y-4 opacity-30 select-none pointer-events-none">
                  <FileText className="h-32 w-32 mx-auto text-slate-200" />
                  <p className="text-2xl font-black text-slate-400 uppercase tracking-tighter">PDF CONTENT AREA</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0 z-10">
          <button 
            onClick={onClose}
            className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200 flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại chỉnh sửa
          </button>
          
          <div className="flex space-x-3">
            <button 
              onClick={onDownload}
              className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-primary-600 bg-white border border-primary-200 hover:bg-primary-50 transition-all flex items-center shadow-sm"
            >
              <Download className="mr-2 h-4 w-4" /> Tải PDF
            </button>
            <button 
              onClick={onPrint}
              className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center shadow-sm"
            >
              <Printer className="mr-2 h-4 w-4" /> In ngay
            </button>
            <button 
              onClick={onConfirm}
              className="h-12 px-8 bg-primary-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center"
            >
              Hoàn tất & Lưu hồ sơ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
