import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  UserPlus, 
  Plus, 
  Search, 
  X,
  ChevronRight,
  Package,
  User,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  MapPin,
  Building,
  Upload,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { AppliedFormsBlock } from '../components/AppliedFormsBlock';

export const HandoverTransfer: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, DRAFT, PENDING_CONFIRMATION, COMPLETED, CANCELLED
  
  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    type: 'ALL', // ALL, HANDOVER, TRANSFER, RECALL
    fromDate: '',
    toDate: '',
    page: 1,
    limit: 50
  });
  
  // Create Form State
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: 'HANDOVER',
    recipientName: '',
    recipientPosition: '',
    recipientDepartment: '',
    recipientPhone: '',
    receiverId: null as number | null,
    receiverDepartmentId: null as number | null,
    newLocation: '',
    newCity: '',
    targetLocationId: null as number | null,
    reason: '',
    note: ''
  });

  const [viewingDoc, setViewingDoc] = useState<any>(null);

  useEffect(() => {
    fetchDocuments();
  }, [activeTab, filters.type, filters.page, filters.limit]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        status: activeTab === 'ALL' ? undefined : activeTab,
      };
      const res = await api.get('/handover', { params });
      setDocuments(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDetail = async (id: number) => {
    try {
      const res = await api.get(`/handover/${id}`);
      setViewingDoc(res.data);
    } catch (err: any) {
      toast.error('Không thể tải chi tiết hồ sơ');
    }
  };

  const searchAssets = async (val: string) => {
    setAssetSearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get('/assets', { params: { search: val, limit: 5 } });
      setSearchResults(res.data.assets);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!formData.recipientName || selectedAssets.length === 0) {
      toast.error('Vui lòng nhập người nhận và chọn ít nhất 1 tài sản');
      return;
    }

    try {
      await api.post('/handover', {
        ...formData,
        assetIds: selectedAssets.map(a => a.id),
        autoComplete: false
      });
      toast.success('Đã tạo hồ sơ nháp');
      setShowCreate(false);
      setSelectedAssets([]);
      setFormData({
        type: 'HANDOVER',
        recipientName: '',
        recipientPosition: '',
        recipientDepartment: '',
        recipientPhone: '',
        receiverId: null,
        receiverDepartmentId: null,
        newLocation: '',
        newCity: '',
        targetLocationId: null,
        reason: '',
        note: '',
        senderName: '',
        senderDepartment: '',
        senderId: null
      } as any);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleComplete = async (id: number) => {
    if (!window.confirm('Xác nhận hoàn tất hồ sơ? Sau khi hoàn tất, thông tin tài sản sẽ chính thức được cập nhật.')) return;
    try {
      await api.post(`/handover/${id}/complete`);
      toast.success('Hồ sơ đã được hoàn tất và cập nhật sổ tài sản');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy hồ sơ này? Thao tác này không thể hoàn tác.')) return;
    try {
      await api.post(`/handover/${id}/cancel`);
      toast.success('Hồ sơ đã được hủy');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <header className="shrink-0 border-b bg-white px-6 py-3">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary-600" />
          Bàn giao / Điều chuyển / Thu hồi
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4">
        <div className="h-full flex flex-col">
          <div className="shrink-0 mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                Quản lý luân chuyển tài sản
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Theo dõi và xử lý các nghiệp vụ cấp phát, điều chuyển và thu hồi tài sản.
              </p>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="shrink-0 mb-3 rounded-xl border bg-white p-2 flex items-center gap-2 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="h-9 w-full pl-9 pr-4 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-100"
                placeholder="Tìm mã hồ sơ, người nhận, tài sản..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
              />
            </div>
            
            <select 
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value, page: 1})}
              className="h-9 w-40 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="ALL">Tất cả loại hồ sơ</option>
              <option value="HANDOVER">Bàn giao</option>
              <option value="TRANSFER">Điều chuyển</option>
              <option value="RECALL">Thu hồi</option>
            </select>

            <div className="flex items-center gap-1">
              <input 
                type="date"
                className="h-9 w-36 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                value={filters.fromDate}
                onChange={(e) => setFilters({...filters, fromDate: e.target.value, page: 1})}
              />
              <span className="text-slate-300">→</span>
              <input 
                type="date"
                className="h-9 w-36 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
                value={filters.toDate}
                onChange={(e) => setFilters({...filters, toDate: e.target.value, page: 1})}
              />
            </div>

            <button 
              onClick={() => {
                setFilters({ search: '', type: 'ALL', fromDate: '', toDate: '', page: 1, limit: 50 });
                setActiveTab('ALL');
              }}
              className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Làm mới
            </button>
            
            <button 
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-100"
            >
              <Plus className="h-4 w-4" />
              Lập hồ sơ mới
            </button>
          </div>

          {/* TABLE CONTAINER */}
          <div className="flex-1 min-h-0 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
            {/* TABS */}
            <div className="shrink-0 border-b px-4">
              <div className="flex gap-6 h-11 items-center">
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'DRAFT', label: 'Nháp' },
                  { key: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
                  { key: 'COMPLETED', label: 'Hoàn tất' },
                  { key: 'CANCELLED', label: 'Đã hủy' }
                ].map((tab) => (
                  <button 
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setFilters({...filters, page: 1}); }}
                    className={`h-full border-b-2 font-bold text-xs transition-all ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LIST */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="h-10">
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã hồ sơ / Loại</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Người giao</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Người nhận / Bộ phận</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Số lượng TS</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ngày tạo</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ngày xác nhận</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
                    <th className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-20 text-center text-slate-400">Đang tải dữ liệu...</td>
                    </tr>
                  ) : documents.map((doc) => (
                    <tr key={doc.id} className="h-14 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            doc.type === 'HANDOVER' ? 'bg-primary-50 text-primary-600' : 
                            (doc.type === 'RECALL' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')
                          }`}>
                            {doc.type === 'HANDOVER' ? <UserPlus className="h-4 w-4" /> : 
                             (doc.type === 'RECALL' ? <Package className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-tight">{doc.documentNo}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              {doc.type === 'HANDOVER' ? 'Bàn giao' : (doc.type === 'RECALL' ? 'Thu hồi' : 'Điều chuyển')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="text-sm font-bold text-slate-800 leading-tight">{doc.senderName || '---'}</div>
                      </td>
                      <td className="px-4">
                        <div className="text-sm font-bold text-slate-800 leading-tight">{doc.recipientName}</div>
                        <div className="text-xs text-slate-500">{doc.recipientDepartment}</div>
                      </td>
                      <td className="px-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-black">
                          {doc._count?.items || 0} TS
                        </span>
                      </td>
                      <td className="px-4 text-xs font-bold text-slate-500">
                        {format(new Date(doc.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 text-xs font-bold text-slate-500">
                        {doc.confirmedAt ? format(new Date(doc.confirmedAt), 'dd/MM/yyyy') : '---'}
                      </td>
                      <td className="px-4">
                        {doc.status === 'COMPLETED' ? (
                          <span className="flex items-center text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Hoàn tất
                          </span>
                        ) : doc.status === 'CANCELLED' ? (
                          <span className="flex items-center text-rose-400 text-[10px] font-black uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-full w-fit">
                            <X className="mr-1 h-3 w-3" /> Đã hủy
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full w-fit">
                            <Clock className="mr-1 h-3 w-3" /> {doc.status === 'DRAFT' ? 'Nháp' : 'Chờ xác nhận'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex justify-end gap-1">
                          {doc.status === 'DRAFT' && (
                            <>
                              <button 
                                onClick={() => handleComplete(doc.id)}
                                className="h-8 w-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                                title="Xác nhận hồ sơ"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleCancel(doc.id)}
                                className="h-8 w-8 flex items-center justify-center bg-white border border-rose-200 text-rose-400 rounded-lg hover:bg-rose-50 transition-all shadow-sm"
                                title="Hủy hồ sơ"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => window.open(`${api.defaults.baseURL}/handover/${doc.id}/pdf`, '_blank')}
                            className="h-8 w-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm"
                            title="In PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleFetchDetail(doc.id)}
                            className="h-8 w-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-20 text-center text-slate-400 italic font-medium">Chưa có hồ sơ bàn giao/điều chuyển nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="shrink-0 border-t bg-white px-4 py-2 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-bold">
                Hiển thị {documents.length} / {total} hồ sơ
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={filters.page === 1}
                  onClick={() => setFilters({...filters, page: filters.page - 1})}
                  className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Trước
                </button>
                <div className="text-xs font-black text-slate-900 px-2">Trang {filters.page} / {Math.ceil(total / filters.limit) || 1}</div>
                <button 
                  disabled={filters.page >= Math.ceil(total / filters.limit)}
                  onClick={() => setFilters({...filters, page: filters.page + 1})}
                  className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CREATE MODAL ... already there ... */}

      {/* VIEW DETAIL MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingDoc(null)}></div>
          <div className="bg-white rounded-[2rem] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Chi tiết hồ sơ {viewingDoc.documentNo}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                    viewingDoc.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 
                    (viewingDoc.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500')
                  }`}>
                    {viewingDoc.status}
                  </span>
                </h2>
                <p className="text-slate-400 text-xs font-medium">Khởi tạo lúc {format(new Date(viewingDoc.createdAt), 'HH:mm dd/MM/yyyy')}</p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-white rounded-full transition-all">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Thông tin tham chiếu</h3>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-xs text-slate-400">Loại nghiệp vụ:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.type}</div>
                    <div className="text-xs text-slate-400">Người giao:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.senderName || '---'}</div>
                    <div className="text-xs text-slate-400">Người nhận:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.recipientName}</div>
                    <div className="text-xs text-slate-400">Bộ phận nhận:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.recipientDepartment || '---'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Địa điểm mới</h3>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-xs text-slate-400">Vị trí:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.newLocation || '---'}</div>
                    <div className="text-xs text-slate-400">Thành phố:</div>
                    <div className="text-xs font-bold text-slate-900">{viewingDoc.newCity || '---'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Danh sách tài sản ({viewingDoc.items?.length || 0})</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-2">Mã TS</th>
                        <th className="px-4 py-2">Tên tài sản</th>
                        <th className="px-4 py-2">Trạng thái cũ</th>
                        <th className="px-4 py-2">Trạng thái mới</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {viewingDoc.items?.map((item: any) => (
                        <tr key={item.id} className="text-xs">
                          <td className="px-4 py-3 font-bold text-slate-700">{item.assetCode}</td>
                          <td className="px-4 py-3 text-slate-600">{item.assetName}</td>
                          <td className="px-4 py-3 text-slate-400">{item.oldStatus}</td>
                          <td className="px-4 py-3 text-primary-600 font-bold">{item.newStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingDoc.reason && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Lý do luân chuyển</h3>
                  <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 italic">"{viewingDoc.reason}"</div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => window.open(`${api.defaults.baseURL}/handover/${viewingDoc.id}/pdf`, '_blank')}
                className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:border-primary-300 transition-all flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> In biên bản PDF
              </button>
              <button onClick={() => setViewingDoc(null)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}></div>
          <div className="bg-white rounded-[3rem] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tạo hồ sơ {formData.type === 'HANDOVER' ? 'Bàn giao' : 'Điều chuyển'}</h2>
                <p className="text-slate-500 text-sm font-medium">Nhân viên QLTS trực tiếp vận hành và cập nhật thông tin.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white rounded-full transition-all shadow-sm">
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column: Form Info */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loại nghiệp vụ</label>
                   <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => setFormData({...formData, type: 'HANDOVER'})}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${formData.type === 'HANDOVER' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >Bàn giao mới</button>
                      <button 
                        onClick={() => setFormData({...formData, type: 'TRANSFER'})}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${formData.type === 'TRANSFER' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >Điều chuyển</button>
                      <button 
                        onClick={() => setFormData({...formData, type: 'RECALL'})}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${formData.type === 'RECALL' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >Thu hồi</button>
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {formData.type === 'RECALL' ? 'Người trả' : 'Họ tên người nhận'}
                      </label>
                      <input 
                        type="text" 
                        placeholder={formData.type === 'RECALL' ? 'Họ tên người trả...' : 'Nguyễn Văn A'}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.recipientName}
                        onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Người giao / phụ trách</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.senderName}
                        onChange={(e) => setFormData({...formData, senderName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bộ phận / Phòng ban</label>
                    <input 
                      type="text" 
                      placeholder="Phòng IT, Kinh doanh..."
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                      value={formData.recipientDepartment}
                      onChange={(e) => setFormData({...formData, recipientDepartment: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Vị trí mới (Toà nhà/Tầng)</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.newLocation}
                        onChange={(e) => setFormData({...formData, newLocation: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Thành phố</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={formData.newCity}
                        onChange={(e) => setFormData({...formData, newCity: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Lý do luân chuyển</label>
                    <textarea 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900 h-24 resize-none"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                     <AppliedFormsBlock action={formData.type as any} isProcessing={true} />
                  </div>
                </div>
              </div>

              {/* Right Column: Asset Selection */}
              <div className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chọn tài sản ({selectedAssets.length})</label>
                   <div className="relative">
                      <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Mã TS, Serial hoặc tên..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-primary-50 transition-all font-bold text-slate-900"
                        value={assetSearch}
                        onChange={(e) => searchAssets(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden">
                          {searchResults.map(a => (
                            <button 
                              key={a.id} 
                              className="w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center justify-between group"
                              onClick={() => { if(!selectedAssets.find(x => x.id === a.id)) setSelectedAssets([...selectedAssets, a]); setAssetSearch(''); setSearchResults([]); }}
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">{a.assetName}</p>
                                <p className="text-[10px] font-bold text-slate-400">{a.assetCode} • {a.currentUserName || 'Trong kho'}</p>
                              </div>
                              <Plus className="h-5 w-5 text-slate-300 group-hover:text-primary-600" />
                            </button>
                          ))}
                        </div>
                      )}
                   </div>

                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {selectedAssets.map(a => (
                        <div key={a.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all border border-transparent hover:border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><Package className="h-5 w-5" /></div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{a.assetName}</p>
                              <p className="text-[10px] font-bold text-slate-400">{a.assetCode}</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedAssets(selectedAssets.filter(x => x.id !== a.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      {selectedAssets.length === 0 && (
                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 italic text-sm">
                          Chưa có tài sản nào được chọn.
                        </div>
                      )}
                   </div>
                </div>

                <div className="p-6 bg-primary-50 rounded-[2rem] border border-primary-100">
                   <p className="text-xs text-primary-700 font-bold leading-relaxed">
                     <ShieldAlert className="inline h-4 w-4 mr-1 mb-1" /> Lưu ý: Nhân viên QLTS có trách nhiệm kiểm tra thực tế tình trạng tài sản trước khi lập hồ sơ.
                   </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/80 border-t border-slate-100 flex space-x-4">
              <button 
                onClick={() => setShowCreate(false)}
                className="flex-1 px-8 py-5 rounded-2xl font-black text-slate-500 hover:bg-white transition-all uppercase tracking-widest text-xs"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreate}
                className="flex-[2] bg-primary-600 text-white px-8 py-5 rounded-2xl font-black hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200 uppercase tracking-widest text-xs"
              >
                Tạo hồ sơ nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
