import React from 'react';
import { Package, User, Plus, Trash2, Upload, FileText, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ASSET ITEMS TABLE
interface AssetTableProps {
  items: any[];
  onRemove?: (id: string | number) => void;
  onAdd?: () => void;
  columns?: string[];
  showPrice?: boolean;
}

export const AssetItemsTable: React.FC<AssetTableProps> = ({ items, onRemove, onAdd, columns, showPrice }) => (
  <div className="col-span-2 space-y-3">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Danh sách tài sản liên quan</h4>
      {onAdd && (
        <button type="button" onClick={onAdd} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline flex items-center">
          <Plus className="mr-1 h-3 w-3" /> Thêm tài sản
        </button>
      )}
    </div>
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">STT</th>
            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tài sản / Mã</th>
            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial</th>
            {showPrice && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị</th>}
            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tình trạng</th>
            {onRemove && <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {items.map((item, index) => (
            <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-4 py-3 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
              <td className="px-4 py-3">
                <p className="text-sm font-bold text-slate-800">{item.assetName || item.name}</p>
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-tighter">{item.assetCode || 'Mã TS'}</p>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600">{item.serialNumber || '---'}</td>
              {showPrice && <td className="px-4 py-3 text-xs font-black text-slate-800 text-right">{(item.purchasePrice || 0).toLocaleString()}đ</td>}
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {item.condition || 'Bình thường'}
                </span>
              </td>
              {onRemove && (
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onRemove(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic text-xs font-medium">Chưa có tài sản nào được chọn.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// SIGNATURE BLOCK
export const SignatureBlock: React.FC<{ roles: string[] }> = ({ roles }) => (
  <div className="col-span-2 pt-6 border-t border-slate-100">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {roles.map((role) => (
        <div key={role} className="text-center space-y-12 p-4 rounded-2xl border-2 border-dashed border-slate-50 hover:border-slate-100 transition-all">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{role}</p>
          <div className="h-px bg-slate-100 mx-4"></div>
          <p className="text-[10px] font-bold text-slate-300 italic">(Ký và ghi rõ họ tên)</p>
        </div>
      ))}
    </div>
  </div>
);

// ATTACHMENT UPLOADER
export const AttachmentUploader: React.FC<{ files: any[]; onAdd: () => void; onRemove: (id: any) => void }> = ({ files, onAdd, onRemove }) => (
  <div className="col-span-2 space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài liệu / Ảnh đính kèm</label>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {files.map((file, idx) => (
        <div key={idx} className="relative group p-3 bg-white border border-slate-100 rounded-2xl flex items-center space-x-3 shadow-sm">
          <div className="bg-slate-50 p-2 rounded-xl text-slate-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => onRemove(idx)} className="absolute -top-2 -right-2 p-1 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button 
        type="button"
        onClick={onAdd}
        className="border-2 border-dashed border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 text-slate-400 hover:border-primary-200 hover:text-primary-500 hover:bg-primary-50/30 transition-all group"
      >
        <Upload className="h-6 w-6 transition-transform group-hover:-translate-y-1" />
        <span className="text-[10px] font-black uppercase tracking-widest">Tải lên file</span>
      </button>
    </div>
  </div>
);
