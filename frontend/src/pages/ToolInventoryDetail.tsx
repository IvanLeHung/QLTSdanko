import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  PackagePlus,
  Play,
  Plus,
  Save,
  Search,
  Users,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const RESULT_OPTIONS = [
  { value: 'MATCH', label: 'Khớp' },
  { value: 'WRONG_LOCATION', label: 'Sai vị trí' },
  { value: 'WRONG_USER', label: 'Sai người sử dụng' },
  { value: 'UNSYNCED_TRANSFER', label: 'Điều chuyển chưa cập nhật' },
  { value: 'MISSING', label: 'Thiếu mất' },
  { value: 'EXTRA', label: 'Tài sản ngoài sổ' },
  { value: 'DAMAGED', label: 'Hỏng cần xử lý' }
];

const resultLabel = (value?: string) => RESULT_OPTIONS.find((item) => item.value === value)?.label || value || 'Chưa kiểm';

const resultClass = (value?: string) => {
  if (value === 'MATCH') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (value === 'EXTRA') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (value === 'DAMAGED') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-rose-50 text-rose-700 border-rose-100';
};

export const ToolInventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'session'>('schedule');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingDetail, setEditingDetail] = useState<any>(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [report, setReport] = useState<any>(null);

  const [sessionForm, setSessionForm] = useState({
    scheduledDate: new Date().toISOString().slice(0, 10),
    companyName: '',
    projectName: '',
    departmentName: '',
    locationName: '',
    checkerName: '',
    representativeName: '',
    note: ''
  });

  const [detailForm, setDetailForm] = useState({
    actualUserName: '',
    actualDepartmentName: '',
    actualLocationName: '',
    actualQuantity: 1,
    resultStatus: 'MATCH',
    note: '',
    imageUrl: ''
  });

  const [extraForm, setExtraForm] = useState({
    toolName: '',
    serialNumber: '',
    actualUserName: '',
    actualLocationName: '',
    actualQuantity: 1,
    note: ''
  });

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [detailRes, sessionRes] = await Promise.all([
        api.get(`/tools/inventory/${id}`),
        api.get(`/tools/inventory/${id}/sessions`)
      ]);
      setInventory(detailRes.data);
      setSessions(sessionRes.data);
      if (activeSession) {
        const fresh = sessionRes.data.find((item: any) => item.id === activeSession.id);
        if (fresh) await openSession(fresh, false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải đợt kiểm kê CCDC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [id]);

  const openSession = async (session: any, switchTab = true) => {
    try {
      const res = await api.get(`/tools/inventory/sessions/${session.id}`);
      setActiveSession(res.data);
      if (switchTab) setActiveTab('session');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải phiên kiểm kê');
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.departmentName.trim() && !sessionForm.locationName.trim()) {
      toast.warning('Vui lòng nhập phòng ban hoặc vị trí kiểm kê');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/tools/inventory/${id}/sessions`, sessionForm);
      toast.success('Đã thêm lịch kiểm kê');
      setShowSessionModal(false);
      await loadInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo lịch kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  const startSession = async (session: any) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/tools/inventory/sessions/${session.id}/start`);
      toast.success('Đã bắt đầu phiên kiểm kê');
      setActiveSession(res.data);
      setActiveTab('session');
      await loadInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể bắt đầu phiên kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (detail: any) => {
    setEditingDetail(detail);
    setDetailForm({
      actualUserName: detail.actualUserName || '',
      actualDepartmentName: detail.actualDepartmentName || '',
      actualLocationName: detail.actualLocationName || '',
      actualQuantity: detail.actualQuantity ?? detail.expectedQuantity ?? 1,
      resultStatus: detail.resultStatus || 'MATCH',
      note: detail.note || '',
      imageUrl: detail.imageUrl || ''
    });
  };

  const saveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetail) return;
    setSubmitting(true);
    try {
      await api.post(`/tools/inventory/session-details/${editingDetail.id}`, detailForm);
      toast.success('Đã lưu kết quả kiểm kê');
      setEditingDetail(null);
      await openSession(activeSession);
      await loadInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu kết quả kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  const addExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    if (!extraForm.toolName.trim()) {
      toast.warning('Vui lòng nhập tên CCDC phát hiện');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/tools/inventory/sessions/${activeSession.id}/extra`, extraForm);
      toast.success('Đã thêm CCDC ngoài sổ');
      setShowExtraModal(false);
      await openSession(activeSession);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm CCDC ngoài sổ');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('Chốt biên bản phiên kiểm kê này? Sau khi chốt sẽ không sửa được kết quả.')) return;
    setSubmitting(true);
    try {
      await api.post(`/tools/inventory/sessions/${activeSession.id}/complete`);
      const reportRes = await api.get(`/tools/inventory/sessions/${activeSession.id}/report`);
      setReport(reportRes.data);
      toast.success('Đã chốt biên bản kiểm kê');
      await openSession(activeSession);
      await loadInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể chốt phiên kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDetails = useMemo(() => {
    const rows = activeSession?.details || [];
    if (!search.trim()) return rows;
    const keyword = search.toLowerCase();
    return rows.filter((item: any) =>
      `${item.toolCode || ''} ${item.toolName || ''} ${item.serialNumber || ''} ${item.actualUserName || ''} ${item.actualLocationName || ''}`.toLowerCase().includes(keyword)
    );
  }, [activeSession, search]);

  const stats = useMemo(() => {
    const rows = activeSession?.details || [];
    return {
      total: rows.length,
      matched: rows.filter((item: any) => item.resultStatus === 'MATCH').length,
      deviations: rows.filter((item: any) => item.resultStatus !== 'MATCH').length,
      checked: rows.filter((item: any) => item.checkedAt || item.resultStatus === 'EXTRA').length
    };
  }, [activeSession]);

  if (loading && !inventory) {
    return <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/tools/inventory')} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{inventory?.inventoryName}</h1>
            <p className="text-xs font-semibold text-slate-500 mt-2 flex flex-wrap gap-4">
              <span>Mã đợt: <b className="font-mono">{inventory?.inventoryCode}</b></span>
              <span>Ngày tạo: <b>{inventory?.inventoryDate ? format(new Date(inventory.inventoryDate), 'dd/MM/yyyy') : '-'}</b></span>
              <span>Trạng thái: <b>{inventory?.status}</b></span>
            </p>
          </div>
        </div>
        <button onClick={() => setShowSessionModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center">
          <Plus className="h-4 w-4 mr-2" /> Thêm lịch kiểm kê
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex gap-2 w-fit">
        <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'schedule' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          Lịch kiểm kê
        </button>
        <button onClick={() => setActiveTab('session')} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === 'session' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          Kiểm kê phiên
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">
            <div className="col-span-2">Ngày kiểm kê</div>
            <div className="col-span-3">Đơn vị / vị trí</div>
            <div className="col-span-2">Người kiểm kê</div>
            <div className="col-span-2">Đại diện phòng</div>
            <div className="col-span-1 text-center">Số CCDC</div>
            <div className="col-span-2 text-right">Trạng thái</div>
          </div>
          {sessions.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold">Chưa có lịch kiểm kê. Hãy tách đợt kiểm kê thành từng phiên theo ngày và phòng ban/vị trí.</div>
          ) : sessions.map((item) => (
            <div key={item.id} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 hover:bg-slate-50 items-center">
              <div className="col-span-2 text-sm font-bold text-slate-800">{format(new Date(item.scheduledDate), 'dd/MM/yyyy')}</div>
              <div className="col-span-3">
                <p className="text-sm font-bold text-slate-800">{item.departmentName || 'Không chỉ định phòng ban'}</p>
                <p className="text-xs text-slate-500 flex items-center mt-1"><MapPin className="h-3 w-3 mr-1" />{item.locationName || 'Không chỉ định vị trí'}</p>
              </div>
              <div className="col-span-2 text-sm text-slate-700">{item.checkerName || '-'}</div>
              <div className="col-span-2 text-sm text-slate-700">{item.representativeName || '-'}</div>
              <div className="col-span-1 text-center text-sm font-black text-slate-800">{item.assetCountPlan || item._count?.details || 0}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button onClick={() => openSession(item)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100">Xem</button>
                {item.status !== 'COMPLETED' && (
                  <button onClick={() => startSession(item)} disabled={submitting} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center">
                    <Play className="h-3 w-3 mr-1" /> Bắt đầu
                  </button>
                )}
                {item.status === 'COMPLETED' && <span className="px-3 py-2 rounded-lg text-xs font-bold bg-purple-50 text-purple-700">Đã chốt</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'session' && (
        <div className="space-y-5">
          {!activeSession ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">Chọn một phiên trong tab Lịch kiểm kê để bắt đầu kiểm kê theo đúng phòng ban/vị trí.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phiên kiểm kê</p>
                  <p className="text-lg font-black text-slate-900 mt-1">{activeSession.departmentName || activeSession.locationName || 'Theo phạm vi'}</p>
                  <p className="text-xs text-slate-500 mt-1">{format(new Date(activeSession.scheduledDate), 'dd/MM/yyyy')}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Khớp</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{stats.matched}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Sai lệch</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">{stats.deviations}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã ghi nhận</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{stats.checked}/{stats.total}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã, tên, serial, người dùng, vị trí..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowExtraModal(true)} disabled={activeSession.status === 'COMPLETED'} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center">
                    <PackagePlus className="h-4 w-4 mr-2" /> Thêm CCDC ngoài sổ
                  </button>
                  <button onClick={completeSession} disabled={activeSession.status === 'COMPLETED' || submitting} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center">
                    <FileText className="h-4 w-4 mr-2" /> Chốt biên bản
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Mã CCDC</th>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Tên CCDC</th>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Người dùng sổ sách</th>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Vị trí sổ sách</th>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Thực tế</th>
                        <th className="p-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Ghi nhận</th>
                        <th className="p-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDetails.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-4 text-xs font-mono font-bold text-slate-600">{item.toolCode || 'Ngoài sổ'}</td>
                          <td className="p-4">
                            <p className="text-sm font-bold text-slate-900">{item.toolName}</p>
                            <p className="text-xs text-slate-400">SL: {item.actualQuantity}/{item.expectedQuantity}</p>
                          </td>
                          <td className="p-4 text-sm text-slate-700">{item.bookUserName || '-'}</td>
                          <td className="p-4 text-sm text-slate-700">{item.bookLocationName || '-'}</td>
                          <td className="p-4">
                            <p className="text-sm text-slate-800">{item.actualUserName || '-'}</p>
                            <p className="text-xs text-slate-500">{item.actualLocationName || '-'}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black ${resultClass(item.resultStatus)}`}>{resultLabel(item.resultStatus)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => openDetailModal(item)} disabled={activeSession.status === 'COMPLETED'} className="px-3 py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 disabled:opacity-50">
                              Ghi nhận
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showSessionModal && (
        <Modal title="Thêm lịch kiểm kê" onClose={() => setShowSessionModal(false)}>
          <form onSubmit={createSession} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày kiểm kê" type="date" value={sessionForm.scheduledDate} onChange={(value: string) => setSessionForm({ ...sessionForm, scheduledDate: value })} />
              <Field label="Công ty" value={sessionForm.companyName} onChange={(value: string) => setSessionForm({ ...sessionForm, companyName: value })} />
              <Field label="Dự án / địa điểm" value={sessionForm.projectName} onChange={(value: string) => setSessionForm({ ...sessionForm, projectName: value })} />
              <Field label="Phòng ban" value={sessionForm.departmentName} onChange={(value: string) => setSessionForm({ ...sessionForm, departmentName: value })} />
              <Field label="Vị trí / kho" value={sessionForm.locationName} onChange={(value: string) => setSessionForm({ ...sessionForm, locationName: value })} />
              <Field label="Người phụ trách kiểm kê" value={sessionForm.checkerName} onChange={(value: string) => setSessionForm({ ...sessionForm, checkerName: value })} />
              <Field label="Đại diện phòng ban" value={sessionForm.representativeName} onChange={(value: string) => setSessionForm({ ...sessionForm, representativeName: value })} />
            </div>
            <TextArea label="Ghi chú" value={sessionForm.note} onChange={(value: string) => setSessionForm({ ...sessionForm, note: value })} />
            <SubmitBar submitting={submitting} label="Tạo lịch kiểm kê" onCancel={() => setShowSessionModal(false)} />
          </form>
        </Modal>
      )}

      {editingDetail && (
        <Modal title="Ghi nhận kiểm kê CCDC" onClose={() => setEditingDetail(null)}>
          <form onSubmit={saveDetail} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-black text-slate-900">{editingDetail.toolName}</p>
              <p className="text-xs text-slate-500 mt-1">Sổ sách: {editingDetail.bookUserName || '-'} | {editingDetail.bookLocationName || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Người dùng thực tế" value={detailForm.actualUserName} onChange={(value: string) => setDetailForm({ ...detailForm, actualUserName: value })} />
              <Field label="Phòng ban thực tế" value={detailForm.actualDepartmentName} onChange={(value: string) => setDetailForm({ ...detailForm, actualDepartmentName: value })} />
              <Field label="Vị trí thực tế" value={detailForm.actualLocationName} onChange={(value: string) => setDetailForm({ ...detailForm, actualLocationName: value })} />
              <Field label="Số lượng thực tế" type="number" value={String(detailForm.actualQuantity)} onChange={(value: string) => setDetailForm({ ...detailForm, actualQuantity: Number(value) || 0 })} />
            </div>
            <label className="block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả kiểm kê</span>
              <select value={detailForm.resultStatus} onChange={(e) => setDetailForm({ ...detailForm, resultStatus: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold">
                {RESULT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <TextArea label="Ghi chú / đề xuất xử lý" value={detailForm.note} onChange={(value: string) => setDetailForm({ ...detailForm, note: value })} />
            <Field label="Link ảnh / chứng từ" value={detailForm.imageUrl} onChange={(value: string) => setDetailForm({ ...detailForm, imageUrl: value })} />
            <SubmitBar submitting={submitting} label="Lưu kết quả" onCancel={() => setEditingDetail(null)} />
          </form>
        </Modal>
      )}

      {showExtraModal && (
        <Modal title="Thêm CCDC ngoài sổ" onClose={() => setShowExtraModal(false)}>
          <form onSubmit={addExtra} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên CCDC" value={extraForm.toolName} onChange={(value: string) => setExtraForm({ ...extraForm, toolName: value })} />
              <Field label="Serial / đặc điểm" value={extraForm.serialNumber} onChange={(value: string) => setExtraForm({ ...extraForm, serialNumber: value })} />
              <Field label="Người đang dùng" value={extraForm.actualUserName} onChange={(value: string) => setExtraForm({ ...extraForm, actualUserName: value })} />
              <Field label="Vị trí phát hiện" value={extraForm.actualLocationName} onChange={(value: string) => setExtraForm({ ...extraForm, actualLocationName: value })} />
              <Field label="Số lượng" type="number" value={String(extraForm.actualQuantity)} onChange={(value: string) => setExtraForm({ ...extraForm, actualQuantity: Number(value) || 1 })} />
            </div>
            <TextArea label="Ghi chú" value={extraForm.note} onChange={(value: string) => setExtraForm({ ...extraForm, note: value })} />
            <SubmitBar submitting={submitting} label="Thêm ngoài sổ" onCancel={() => setShowExtraModal(false)} />
          </form>
        </Modal>
      )}

      {report && (
        <Modal title="Biên bản kiểm kê" onClose={() => setReport(null)}>
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="font-black text-slate-900 uppercase">{report.title}</h3>
              <div className="grid grid-cols-4 gap-3 mt-4">
                <Stat label="Theo sổ" value={report.summary.bookTotal} />
                <Stat label="Thực tế" value={report.summary.actualTotal} />
                <Stat label="Khớp" value={report.summary.matched} />
                <Stat label="Sai lệch" value={report.summary.deviations} />
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Chi tiết sai lệch</p>
              <div className="max-h-56 overflow-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {report.deviations.length === 0 ? <p className="p-4 text-sm text-slate-500">Không có sai lệch.</p> : report.deviations.map((item: any) => (
                  <div key={item.id} className="p-3 text-sm flex justify-between gap-4">
                    <span className="font-bold text-slate-800">{item.toolCode || 'Ngoài sổ'} - {item.toolName}</span>
                    <span className="text-rose-700 font-bold">{resultLabel(item.resultStatus)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-6">
              {report.signatures.map((item: string) => (
                <div key={item} className="text-center border-t border-slate-300 pt-3 text-xs font-bold text-slate-600">{item}</div>
              ))}
            </div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center">
              <FileText className="h-4 w-4 mr-2" /> In biên bản
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="text-base font-black text-slate-900 flex items-center"><ClipboardCheck className="h-5 w-5 mr-2 text-orange-600" />{title}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const Field = ({ label, value, onChange, type = 'text' }: any) => (
  <label className="block">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800" />
  </label>
);

const TextArea = ({ label, value, onChange }: any) => (
  <label className="block">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 h-20 resize-none" />
  </label>
);

const SubmitBar = ({ submitting, label, onCancel }: any) => (
  <div className="flex gap-3 pt-3 border-t border-slate-100">
    <button type="button" onClick={onCancel} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase">Hủy</button>
    <button type="submit" disabled={submitting} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase disabled:opacity-50 flex items-center justify-center">
      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />{label}</>}
    </button>
  </div>
);

const Stat = ({ label, value }: any) => (
  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
  </div>
);
