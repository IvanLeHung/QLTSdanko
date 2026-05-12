import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Grid, 
  List, 
  Filter, 
  ChevronRight, 
  Download, 
  Settings2, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TEMPLATES = [
  { code: 'BM01/QLTS', name: 'Biên bản bàn giao tài sản mới', business: 'Tiếp nhận', required: true, pdf: true, sign: 3 },
  { code: 'BM02/QLTS', name: 'Biên bản bàn giao tài sản', business: 'Bàn giao / Thu hồi', required: true, pdf: true, sign: 3 },
  { code: 'BM03/QLTS', name: 'Biên bản tài sản hỏng', business: 'Báo hỏng', required: true, pdf: true, sign: 3 },
  { code: 'BM04/QLTS', name: 'Biên bản thanh lý tài sản', business: 'Thanh lý', required: true, pdf: true, sign: 4 },
  { code: 'BM05/QLTS', name: 'Biên bản tiêu hủy tài sản', business: 'Tiêu hủy', required: true, pdf: true, sign: 4 },
  { code: 'BM06/QLTS', name: 'Biên bản điều chuyển tài sản', business: 'Điều chuyển', required: true, pdf: true, sign: 4 },
  { code: 'BM07/QLTS', name: 'Phiếu yêu cầu về tài sản', business: 'Yêu cầu', required: false, pdf: true, sign: 2 },
  { code: 'BM08/QLTS', name: 'Tờ trình chủ trương về tài sản', business: 'Trình phê duyệt', required: false, pdf: true, sign: 3 },
  { code: 'BM09/QLTS', name: 'Biên bản kiểm tra hiện trạng', business: 'Nghiệm thu / Kiểm tra', required: true, pdf: true, sign: 3 },
  { code: 'BM10/QLTS', name: 'Biên bản bảo dưỡng và sửa chữa', business: 'Sửa chữa', required: true, pdf: true, sign: 4 },
  { code: 'BM11/QLTS', name: 'Quyết định thành lập hội đồng', business: 'Hội đồng xử lý', required: true, pdf: true, sign: 1 },
  { code: 'BM12/QLTS', name: 'Biên bản kiểm kê tài sản', business: 'Kiểm kê', required: true, pdf: true, sign: 4 },
  { code: 'BM13/QLTS', name: 'Biên bản ghi nhận mất tài sản', business: 'Báo mất', required: true, pdf: true, sign: 4 },
];

export const DocumentLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [search, setSearch] = useState('');

  const tabs = ['Tất cả', 'Bàn giao', 'Điều chuyển', 'Sửa chữa', 'Kiểm kê', 'Thanh lý', 'Khác'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-3">Thư viện biểu mẫu</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
            Đã chuẩn hóa 13 biểu mẫu theo quy định 2025
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
          <button className="p-4 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
            <Settings2 className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center space-x-2 p-1.5 bg-white rounded-3xl border border-slate-100 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
              activeTab === tab 
                ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {TEMPLATES.map((tmpl) => (
          <div 
            key={tmpl.code}
            className="group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-50 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase tracking-widest border border-primary-100">
                    {tmpl.code}
                  </span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">{tmpl.business}</p>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight mb-4 group-hover:text-primary-700 transition-colors">
                {tmpl.name}
              </h3>
              
              <div className="space-y-2 mb-6">
                 <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <CheckCircle2 className="h-3 w-3 mr-2 text-emerald-500" />
                    {tmpl.required ? 'Biểu mẫu bắt buộc' : 'Biểu mẫu tùy chọn'}
                 </div>
                 <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Download className="h-3 w-3 mr-2 text-primary-500" />
                    Tự động sinh PDF & lưu hồ sơ
                 </div>
                 <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3 w-3 mr-2 text-amber-500" />
                    Yêu cầu {tmpl.sign} chữ ký xác nhận
                 </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                Xem mẫu
              </button>
              <button className="flex-1 py-3 bg-white border border-primary-200 text-primary-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-50 transition-all flex items-center justify-center">
                Cấu hình <ChevronRight className="ml-1 h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
