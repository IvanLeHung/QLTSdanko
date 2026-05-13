import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  Printer, 
  Info,
  Loader2,
  AlertCircle,
  Plus,
  Eye,
  FileCheck,
  FileUp,
  FileDown,
  Trash2,
  Paperclip,
  Image as ImageIcon,
  History,
  MoreVertical,
  ChevronDown,
  FileSearch
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BMFormDispatcher } from './forms/BMFormDispatcher';
import { toast } from 'react-toastify';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssetDocumentsTabProps {
  asset: any;
  onRefresh: () => void;
  onSelectForm: (code: string, data?: any) => void;
}

export const AssetDocumentsTab: React.FC<AssetDocumentsTabProps> = ({ asset, onRefresh, onSelectForm }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedDocs();
  }, [asset.id]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/settings/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneratedDocs = async () => {
    try {
      const res = await api.get(`/documents/entity/Asset/${asset.id}`);
      setGeneratedDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getTemplatesByStatus = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return {
          required: ['BM01', 'BM02'],
          others: ['BM07', 'BM08']
        };
      case 'ASSIGNED':
        return {
          required: ['BM02', 'BM12'],
          others: ['BM06', 'BM09', 'BM10', 'BM03', 'BM07']
        };
      case 'UNDER_REPAIR':
      case 'DAMAGED':
        return {
          required: ['BM03', 'BM09', 'BM10'],
          others: ['BM07']
        };
      case 'LOST':
        return {
          required: ['BM13', 'BM09'],
          others: ['BM07']
        };
      case 'PENDING_LIQUIDATION':
      case 'LIQUIDATED':
        return {
          required: ['BM04', 'BM11', 'BM09'],
          others: ['BM08']
        };
      case 'DISPOSED':
        return {
          required: ['BM05', 'BM11', 'BM09'],
          others: ['BM08']
        };
      default:
        return { required: [], others: [] };
    }
  };

  const statusMap = getTemplatesByStatus(asset.status);
  const requiredTemplates = templates.filter(t => statusMap.required.includes(t.templateCode));
  const otherTemplates = templates.filter(t => statusMap.others.includes(t.templateCode));

  const renderFormCard = (t: any) => {
    const generated = generatedDocs.find(d => d.templateId === t.id);
    const status = generated ? (generated.status === 'COMPLETED' ? 'Đã tạo' : 'Nháp') : 'Chưa tạo';
    
    return (
      <div key={t.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-primary-100 transition-all group shadow-sm">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              generated ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{t.templateCode} - {t.templateName}</p>
              <p className="text-[10px] text-slate-400 font-medium">{t.description}</p>
            </div>
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
            status === 'Đã tạo' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
            status === 'Nháp' ? "bg-amber-50 text-amber-600 border-amber-100" :
            "bg-slate-50 text-slate-400 border-slate-100"
          )}>
            {status}
          </span>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
           <div className="text-[10px] text-slate-400 font-bold">
              {generated ? `Ngày tạo: ${format(new Date(generated.createdAt), 'dd/MM/yyyy')}` : 'Chưa có hồ sơ'}
           </div>
           <div className="flex space-x-1">
              {!generated ? (
                <button 
                  onClick={() => onSelectForm(t.templateCode)}
                  className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-primary-700 transition-all"
                >
                  <Plus className="h-3 w-3 mr-1.5" /> Tạo
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => onSelectForm(t.templateCode, { ...generated, isCompleted: generated.status === 'COMPLETED' })}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" 
                    title="Xem"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const url = generated.fileUrl.startsWith('http') ? generated.fileUrl : `http://localhost:3001/api${generated.fileUrl}`;
                      window.open(url, '_blank');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-primary-600 transition-colors" 
                    title="Tải PDF"
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const url = generated.fileUrl.startsWith('http') ? generated.fileUrl : `http://localhost:3001/api${generated.fileUrl}`;
                      const iframe = document.createElement('iframe');
                      iframe.style.display = 'none';
                      iframe.src = url;
                      document.body.appendChild(iframe);
                      iframe.onload = () => {
                        iframe.contentWindow?.print();
                        setTimeout(() => document.body.removeChild(iframe), 1000);
                      };
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-emerald-600 transition-colors" 
                    title="In hồ sơ"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </>
              )}
           </div>
        </div>
      </div>
    );
  };

  const getAttachments = () => {
    if (!asset.attachments) return [];
    if (typeof asset.attachments === 'string') {
      try { return JSON.parse(asset.attachments); } catch(e) { return []; }
    }
    return asset.attachments;
  };
  const attachments = getAttachments();
  const groupedAttachments = {
    'Ảnh tài sản': attachments.filter((f: any) => f.group === 'Ảnh tài sản' || f.type?.includes('image')),
    'Chứng từ mua sắm': attachments.filter((f: any) => f.group === 'Chứng từ mua sắm'),
    'Biên bản ký tay': attachments.filter((f: any) => f.group === 'Biên bản ký tay'),
    'Tem tài sản': attachments.filter((f: any) => f.group === 'Tem tài sản' || f.name?.includes('tem'))
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10 pb-10">
      {/* REQUIRED FORMS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <FileCheck className="mr-2 h-3.5 w-3.5" /> Nhóm biểu mẫu bắt buộc
          </h4>
          <div className="flex items-center text-[9px] font-bold text-slate-400 italic">
            <Info className="mr-1 h-3 w-3" /> Tự động theo quy định 2025
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {requiredTemplates.map(renderFormCard)}
          {requiredTemplates.length === 0 && (
             <p className="text-xs text-slate-400 italic px-2">Không có biểu mẫu bắt buộc cho trạng thái hiện tại.</p>
          )}
        </div>
      </section>

      {/* OTHER FORMS */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center">
          <FileSearch className="mr-2 h-3.5 w-3.5" /> Biểu mẫu phát sinh
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {otherTemplates.map(renderFormCard)}
          {otherTemplates.length === 0 && (
             <p className="text-xs text-slate-400 italic px-2">Không có biểu mẫu phát sinh gợi ý.</p>
          )}
        </div>
      </section>

      {/* ATTACHMENTS */}
      <section className="pt-8 border-t border-slate-100 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <Paperclip className="mr-2 h-3.5 w-3.5" /> File đính kèm & Ảnh thực tế
          </h4>
        </div>
        
        <div className="space-y-6">
          {Object.entries(groupedAttachments).map(([group, files]) => (
            <div key={group} className="space-y-3">
              <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">{group}</h5>
              <div className="grid grid-cols-2 gap-3">
                {files.map((file: any, idx: number) => (
                  <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-between group/file hover:border-primary-100 transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="bg-white p-2 rounded-lg text-slate-400 group-hover/file:text-primary-500 shadow-sm">
                        {file.type?.includes('image') ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{file.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{file.size || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex opacity-0 group-hover/file:opacity-100 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary-600" title="Tải xuống"><Download className="h-3.5 w-3.5" /></button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-600" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="col-span-2 py-4 px-4 border border-dashed border-slate-100 rounded-xl text-[10px] text-slate-300 italic">
                    Chưa có {group.toLowerCase()}.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HISTORY */}
      <section className="pt-8 border-t border-slate-100 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center">
          <History className="mr-2 h-3.5 w-3.5" /> Lịch sử hồ sơ
        </h4>
        <div className="space-y-2 px-2">
           {generatedDocs.map(doc => (
             <div key={doc.id} className="text-[11px] text-slate-500 flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mr-3"></div>
                <span className="font-bold mr-2">{format(new Date(doc.createdAt), 'dd/MM/yyyy')}</span>
                <span>Tạo {doc.template?.templateCode} bởi <span className="text-slate-700 font-bold">{doc.createdBy}</span></span>
             </div>
           ))}
           {generatedDocs.length === 0 && (
              <p className="text-[11px] text-slate-400 italic">Chưa ghi nhận lịch sử hồ sơ.</p>
           )}
        </div>
      </section>

    </div>
  );
};
