import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  Printer, 
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BMFormDispatcher } from './forms/BMFormDispatcher';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AppliedFormsBlockProps {
  action: 'CREATION' | 'HANDOVER' | 'TRANSFER' | 'RECALL' | 'DAMAGE' | 'REPAIR' | 'INVENTORY' | 'LIQUIDATION' | 'DISPOSAL' | 'LOST';
  entityId?: number;
  entityType?: string;
  isProcessing?: boolean;
}

export const AppliedFormsBlock: React.FC<AppliedFormsBlockProps> = ({ action, entityId, entityType, isProcessing = false }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<{code: string, data?: any} | null>(null);

  useEffect(() => {
    fetchTemplates();
    if (entityId && entityType) {
      fetchGeneratedDocs();
    }
  }, [action, entityId, entityType]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/documents/applied', { params: { action } });
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneratedDocs = async () => {
    try {
      const res = await api.get(`/documents/entity/${entityType}/${entityId}`);
      setGeneratedDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="h-20 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <FileText className="mr-2 h-3.5 w-3.5" /> Hồ sơ / Biểu mẫu áp dụng
         </h4>
         <div className="flex items-center text-[9px] font-bold text-slate-400 italic">
            <Info className="mr-1 h-3 w-3" /> Tự động theo quy định 2025
         </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {templates.map(t => {
           const generated = generatedDocs.find(d => d.templateId === t.id);
           return (
              <div 
                key={t.id} 
                onClick={() => setSelectedForm({ code: t.templateCode })}
                className={cn(
                   "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group/item",
                   generated 
                    ? "bg-emerald-50 border-emerald-100 hover:bg-emerald-100" 
                    : isProcessing 
                      ? "bg-blue-50/50 border-blue-100 hover:bg-blue-100/50"
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
              >
                 <div className="flex items-center space-x-3">
                    <div className={cn(
                       "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/item:scale-110",
                       generated ? "bg-emerald-500 text-white" : "bg-white text-slate-400 shadow-sm"
                    )}>
                       {generated ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                       <p className={cn("text-xs font-black uppercase tracking-tight", generated ? "text-emerald-800" : "text-slate-700")}>
                          {t.templateCode} - {t.templateName}
                       </p>
                       <p className="text-[10px] text-slate-400 font-medium">{t.description}</p>
                    </div>
                 </div>

                 {generated ? (
                    <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                       <button 
                         type="button"
                         title="Tải xuống PDF"
                         className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                       >
                          <Download className="h-4 w-4" />
                       </button>
                       <button 
                         type="button"
                         title="In biểu mẫu"
                         className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                       >
                          <Printer className="h-4 w-4" />
                       </button>
                    </div>
                 ) : (
                    <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/item:border-primary-200 group-hover/item:text-primary-600 transition-all">
                       {isProcessing ? "Xem / Nhập" : "Chưa tạo"}
                    </div>
                 )}
              </div>
           );
        })}

        {templates.length === 0 && (
           <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <AlertCircle className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium italic">Không có biểu mẫu bắt buộc cho nghiệp vụ này.</p>
           </div>
        )}
      </div>

      <BMFormDispatcher 
        isOpen={!!selectedForm}
        formCode={selectedForm?.code || ''}
        data={selectedForm?.data}
        onClose={() => setSelectedForm(null)}
        onSubmit={(data) => {
          console.log("Form submitted:", data);
          setSelectedForm(null);
        }}
      />
    </div>
  );
};
