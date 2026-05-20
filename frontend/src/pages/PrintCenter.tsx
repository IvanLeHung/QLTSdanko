import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Printer, 
  Tag, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Filter,
  Download,
  Eye,
  Trash2,
  Settings,
  Box,
  ScanLine,
  Activity,
  Loader2
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
// ... inside PrintCenter component
import { twMerge } from 'tailwind-merge';
import { toast } from 'react-toastify';
import { AssetLabelPrintModal } from '../components/AssetLabelPrintModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PrintCenter: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'labels' | 'documents' | 'history'>('labels');
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [assetsToPrint, setAssetsToPrint] = useState<any[]>([]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.selectedAssets) {
      setSelectedAssets(state.selectedAssets);
      if (state.mode) setActiveTab(state.mode);
    }
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'labels') {
        const res = await api.get('/assets', { params: { search, limit: 100 } });
        setAssets(res.data.assets || []);
      } else if (activeTab === 'documents') {
        const res = await api.get('/documents');
        setDocuments(res.data || []);
      } else if (activeTab === 'history') {
        const res = await api.get('/operational/print-logs');
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu trung tâm in ấn");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInitialData();
  };

  const toggleAssetSelection = (asset: any) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const openBulkPrint = () => {
    if (selectedAssets.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một tài sản để in tem");
      return;
    }
    setAssetsToPrint(selectedAssets);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-5">
           <div className="w-16 h-16 bg-primary-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary-200">
              <Printer className="h-8 w-8" />
           </div>
           <div>
              <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-2">Trung tâm in ấn</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center">
                 <ScanLine className="h-4 w-4 mr-2 text-primary-500" /> Quản lý và in ấn tập trung Labels & Hồ sơ
              </p>
           </div>
        </div>

        <div className="flex items-center space-x-3">
           <div className="bg-slate-50 p-2 rounded-2xl flex space-x-1">
              {[
                { id: 'labels', label: 'In Tem (Labels)', icon: Tag },
                { id: 'documents', label: 'In Hồ sơ (BM)', icon: FileText },
                { id: 'history', label: 'Lịch sử in', icon: Activity }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center",
                    activeTab === tab.id ? "bg-white text-primary-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-2" /> {tab.label}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR / FILTERS */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Bộ lọc nhanh</h3>
              <form onSubmit={handleSearch} className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Tìm kiếm..." 
                   className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                 />
              </form>

              {activeTab === 'labels' && (
                <div className="space-y-4">
                  <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                     <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Đang chọn</p>
                     <p className="text-2xl font-black text-primary-700 tracking-tighter">{selectedAssets.length} <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Tài sản</span></p>
                  </div>
                  <button 
                    onClick={openBulkPrint}
                    disabled={selectedAssets.length === 0}
                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center disabled:opacity-50 disabled:grayscale"
                  >
                    <Printer className="mr-2 h-4 w-4" /> In tem hàng loạt
                  </button>
                  <button 
                    onClick={() => setSelectedAssets([])}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Xóa lựa chọn
                  </button>
                </div>
              )}
           </div>
        </div>

        {/* MAIN LIST */}
        <div className="lg:col-span-9">
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              {loading ? (
                <div className="py-40 flex flex-col items-center justify-center space-y-4">
                   <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
                   <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Đang chuẩn bị dữ liệu in ấn...</p>
                </div>
              ) : activeTab === 'labels' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="p-6 text-left w-12">
                          <input 
                            type="checkbox" 
                            className="rounded-lg border-slate-200 text-primary-600" 
                            checked={selectedAssets.length === assets.length && assets.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAssets(assets);
                              else setSelectedAssets([]);
                            }}
                          />
                        </th>
                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</th>
                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã tài sản</th>
                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng</th>
                        <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map(asset => (
                        <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => toggleAssetSelection(asset)}>
                          <td className="p-6">
                            <input 
                              type="checkbox" 
                              checked={selectedAssets.some(a => a.id === asset.id)}
                              onChange={() => {}} // Handled by tr onClick
                              className="rounded-lg border-slate-200 text-primary-600"
                            />
                          </td>
                          <td className="p-6">
                             <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><Box className="h-5 w-5" /></div>
                                <div>
                                   <p className="text-sm font-black text-slate-800 tracking-tight leading-none">{asset.assetName}</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{asset.categoryName || 'Tài sản'}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-6 text-sm font-mono text-slate-600">{asset.asset_code || asset.assetCode || asset.code}</td>
                          <td className="p-6">
                             <p className="text-sm font-bold text-slate-600">{asset.currentUserName || '---'}</p>
                             <p className="text-[10px] text-slate-400 font-medium">{asset.departmentName || 'Chưa gán'}</p>
                          </td>
                          <td className="p-6 text-right">
                             <button 
                               onClick={(e) => { e.stopPropagation(); setAssetsToPrint([asset]); setIsPrintModalOpen(true); }}
                               className="p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all"
                             >
                               <Printer className="h-4 w-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === 'documents' ? (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                   {documents.map(doc => (
                     <div key={doc.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-white hover:border-primary-100 hover:shadow-xl transition-all group">
                        <div className="flex items-center space-x-5">
                           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:text-primary-600 group-hover:bg-primary-50 transition-all">
                              <FileText className="h-7 w-7" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">{doc.documentNo}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{doc.template?.templateCode} - {doc.template?.templateName}</p>
                              <p className="text-[9px] text-slate-300 font-medium mt-1">Ngày tạo: {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                           </div>
                        </div>
                        <div className="flex space-x-2">
                           <button 
                             onClick={() => window.open(`http://localhost:3001/api${doc.fileUrl}`, '_blank')}
                             className="p-3 bg-white text-slate-400 rounded-xl hover:text-primary-600 shadow-sm"
                           >
                             <Download className="h-4 w-4" />
                           </button>
                           <button 
                             onClick={() => {
                               const win = window.open(`http://localhost:3001/api${doc.fileUrl}`, '_blank');
                               if (win) win.onload = () => win.print();
                             }}
                             className="p-3 bg-white text-slate-400 rounded-xl hover:text-emerald-600 shadow-sm"
                           >
                             <Printer className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="p-8">
                  <div className="bg-slate-50 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                          <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoạt động</th>
                          <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Người thực hiện</th>
                          <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(log => (
                          <tr key={log.id} className="border-b border-slate-100">
                            <td className="p-4 text-xs font-bold text-slate-500">{format(new Date(log.createdAt), 'dd/MM HH:mm')}</td>
                            <td className="p-4">
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.action}</p>
                               <p className="text-[10px] text-slate-400 font-medium">{log.details?.template || 'Labels'} ({log.details?.assetCount || log.details?.copies} bản)</p>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600">{log.performedBy}</td>
                            <td className="p-4">
                               <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100">Success</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>

      <AssetLabelPrintModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        assets={assetsToPrint}
      />
    </div>
  );
};
