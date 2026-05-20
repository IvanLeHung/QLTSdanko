import React from 'react';
import { X, FileText, Printer, Eye, Save, Loader2, FileUp, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formCode: string;
  documentNo?: string;
  date?: string;
  status?: string;
  maxWidth?: string;
  loading?: boolean;
  submitting?: boolean;
  onSaveDraft?: () => void;
  onPreviewPdf?: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  children: React.ReactNode;
  summary?: React.ReactNode;
  isCompleted?: boolean;
  onPrint?: () => void;
  onDownload?: () => void;
  onUploadSigned?: () => void;
}

export const BaseFormModal: React.FC<BaseFormModalProps> = ({
  isOpen,
  onClose,
  title,
  formCode,
  documentNo = '---',
  date = new Date().toLocaleDateString('vi-VN'),
  status = 'DRAFT',
  maxWidth = 'max-w-[920px]',
  loading = false,
  submitting = false,
  onSaveDraft,
  onPreviewPdf,
  onConfirm,
  confirmLabel = 'Xác nhận & Hoàn tất',
  children,
  summary,
  isCompleted = false,
  onPrint,
  onDownload,
  onUploadSigned
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* MODAL CONTAINER */}
      <div className={cn(
        "relative w-full bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300 max-h-[85vh]",
        maxWidth
      )}>
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-50 p-3 rounded-2xl text-primary-600 border border-primary-100">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase tracking-widest border border-primary-100">
                  {formCode}
                </span>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">{title}</h2>
              </div>
              <div className="flex items-center space-x-4 mt-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã HS: <span className="text-slate-600">{documentNo}</span></p>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày lập: <span className="text-slate-600">{date}</span></p>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                  status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {status}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
          >
            <X className="h-6 w-6 text-slate-300 group-hover:text-slate-600" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải dữ liệu biểu mẫu...</p>
            </div>
          ) : (
            <>
              {/* QUICK SUMMARY */}
              {summary && (
                <div className="px-8 pt-8">
                   {summary}
                </div>
              )}
              
              {/* CONTENT */}
              <div className="px-8 py-8 space-y-10">
                {children}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center sticky bottom-0 z-10">
          {!isCompleted ? (
            <>
              <div className="flex space-x-3">
                <button 
                  onClick={onClose}
                  className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Hủy bỏ
                </button>
                {onSaveDraft && (
                  <button 
                    onClick={onSaveDraft}
                    className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-primary-600 bg-white border border-primary-200 hover:bg-primary-50 transition-all flex items-center"
                  >
                    <Save className="mr-2 h-4 w-4" /> Lưu nháp
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                {onPreviewPdf && (
                  <button 
                    onClick={onPreviewPdf}
                    className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center shadow-sm"
                  >
                    <Eye className="mr-2 h-4 w-4" /> Xem trước PDF
                  </button>
                )}
                <button 
                  onClick={onConfirm}
                  disabled={submitting}
                  className="h-12 px-8 bg-primary-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all flex items-center disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      {confirmLabel}
                      <Printer className="ml-2 h-4 w-4 opacity-50" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex space-x-3">
                <button 
                  onClick={onClose}
                  className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Đóng
                </button>
                <button 
                  onClick={onUploadSigned}
                  className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 transition-all flex items-center"
                >
                  <FileUp className="mr-2 h-4 w-4" /> Upload bản ký
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={onPreviewPdf}
                  className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center shadow-sm"
                >
                  <Eye className="mr-2 h-4 w-4" /> Xem PDF
                </button>
                <button 
                  onClick={onDownload}
                  className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center shadow-sm"
                >
                  <Download className="mr-2 h-4 w-4" /> Tải PDF
                </button>
                <button 
                  onClick={onPrint}
                  className="h-12 px-8 bg-slate-800 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all flex items-center"
                >
                  <Printer className="mr-2 h-4 w-4" /> In hồ sơ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENTS FOR FORMS
export const FormSection: React.FC<{ title: string; icon?: any; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
  <div className={cn("space-y-4", className)}>
    <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
      {Icon && <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Icon className="h-4 w-4" /></div>}
      <h3 className="text-sm font-[900] text-slate-800 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </div>
);

export const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode; className?: string }> = ({ label, required, children, className }) => (
  <div className={cn("space-y-2", className)}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={cn(
      "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 focus:bg-white transition-all shadow-sm",
      props.className
    )}
  />
);

export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    {...props}
    className={cn(
      "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 focus:bg-white transition-all shadow-sm appearance-none",
      props.className
    )}
  />
);

export const FormTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    {...props}
    className={cn(
      "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 focus:bg-white transition-all shadow-sm min-h-[100px] resize-none",
      props.className
    )}
  />
);
