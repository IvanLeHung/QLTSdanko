import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  ShieldAlert, 
  Trash2, 
  Check, 
  Loader2, 
  ClipboardList, 
  AlertTriangle,
  Coins,
  MapPin,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

export const ToolApprovals: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [pendingDestroys, setPendingDestroys] = useState<any[]>([]);
  const [pendingLosts, setPendingLosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'DESTROY' | 'LOST'>('DESTROY');

  // Modal / Handling State for Lost
  const [selectedLostForApproval, setSelectedLostForApproval] = useState<any>(null);
  const [lostHandlingForm, setLostHandlingForm] = useState({
    handlingType: 'COMPENSATION' as 'COMPENSATION' | 'WAIVED',
    compensationNote: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tools/approvals/list');
      setPendingDestroys(res.data.pendingDestroys || []);
      setPendingLosts(res.data.pendingLosts || []);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách chờ phê duyệt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveDestroy = async (id: number) => {
    if (!window.confirm("Xác nhận phê duyệt hủy số lượng CCDC hỏng này? Hành động này sẽ chuyển trạng thái tồn sang 'Đã hủy' và không giảm tổng lịch sử.")) return;
    setSubmitting(true);
    try {
      await api.post(`/tools/approvals/destroy/${id}/approve`);
      toast.success("Đã phê duyệt hủy CCDC thành công");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi khi phê duyệt hủy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLostForApproval) return;
    setSubmitting(true);
    try {
      await api.post(`/tools/approvals/lost/${selectedLostForApproval.id}/approve`, lostHandlingForm);
      toast.success("Đã xử lý báo mất CCDC thành công");
      setSelectedLostForApproval(null);
      setLostHandlingForm({ handlingType: 'COMPENSATION', compensationNote: '' });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi khi xử lý báo mất");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-[900] text-[#0F172A] tracking-tighter leading-none mb-2">Phê duyệt CCDC chờ xử lý</h1>
        <p className="text-slate-500 font-medium text-base">Quản trị viên duyệt đề xuất hủy CCDC hỏng hóc hoặc xử lý báo mất/thất thoát.</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('DESTROY')}
          className={`px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'DESTROY' ? 'border-orange-600 text-orange-650' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hỏng chờ hủy ({pendingDestroys.length})
        </button>
        <button 
          onClick={() => setActiveTab('LOST')}
          className={`px-6 py-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'LOST' ? 'border-orange-600 text-orange-650' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Mất chờ xử lý ({pendingLosts.length})
        </button>
      </div>

      {/* CONTENT LIST */}
      {loading ? (
        <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 text-orange-600 animate-spin" /></div>
      ) : activeTab === 'DESTROY' ? (
        <div className="space-y-4">
          {pendingDestroys.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 text-slate-400 font-semibold text-sm">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              Không có đề xuất hủy CCDC nào đang chờ duyệt.
            </div>
          ) : pendingDestroys.map((report) => {
            const toolItem = report.items[0]?.tool;
            return (
              <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{report.reportCode}</span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {report.locationName || 'Không rõ vị trí'}</span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-850">{toolItem?.toolName || 'CCDC chưa xác định'}</h4>
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <span>Mã CCDC: <strong className="font-mono">{toolItem?.toolCode}</strong></span>
                    <span>Đơn vị tính: <strong>{toolItem?.unit}</strong></span>
                    <span>Số lượng đề xuất hủy: <strong className="text-rose-600">{report.quantity}</strong></span>
                  </div>
                  {report.description && (
                    <p className="text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-650">
                      Lý do: &ldquo;{report.description}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApproveDestroy(report.id)}
                    disabled={submitting}
                    className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all border-0 flex items-center shadow-lg shadow-rose-100 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Xác nhận hủy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingLosts.length === 0 ? (
            <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 text-slate-400 font-semibold text-sm">
              <ShieldAlert className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              Không có báo cáo mất CCDC nào đang chờ duyệt.
            </div>
          ) : pendingLosts.map((report) => (
            <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{report.lostCode}</span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {report.locationName || 'Không rõ vị trí'}</span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(report.reportedDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-850">{report.tool?.toolName}</h4>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span>Mã CCDC: <strong className="font-mono">{report.tool?.toolCode}</strong></span>
                  <span>Người báo: <strong>{report.reportedBy}</strong></span>
                  <span>Số lượng mất: <strong className="text-red-600">{report.quantity}</strong></span>
                  <span>Khấu hao bồi hoàn: <strong className="text-slate-700">{report.remainingValue?.toLocaleString('vi-VN')} VNĐ</strong></span>
                </div>
                {report.incidentDescription && (
                  <p className="text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-650">
                    Sự việc: &ldquo;{report.incidentDescription}&rdquo;
                  </p>
                )}
              </div>

              <div>
                <button 
                  onClick={() => setSelectedLostForApproval(report)}
                  className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all border-0 flex items-center shadow-lg shadow-orange-100 cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-1.5" /> Xử lý báo mất
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOST APPROVAL DIALOG */}
      {selectedLostForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-650 rounded-lg flex items-center justify-center text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-[900] text-slate-800 tracking-tight">Xử lý báo mất CCDC</h3>
                  <span className="text-[10px] font-mono text-slate-400">{selectedLostForApproval.lostCode}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLostForApproval(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors border-0 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApproveLost} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phương án xử lý</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <label className={`border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    lostHandlingForm.handlingType === 'COMPENSATION' ? 'border-orange-600 bg-orange-50/20 text-orange-650' : 'border-slate-250 text-slate-500'
                  }`}>
                    <Coins className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">Yêu cầu bồi thường</span>
                    <input 
                      type="radio" 
                      name="handlingType" 
                      className="hidden" 
                      checked={lostHandlingForm.handlingType === 'COMPENSATION'} 
                      onChange={() => setLostHandlingForm({ ...lostHandlingForm, handlingType: 'COMPENSATION' })}
                    />
                  </label>
                  <label className={`border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    lostHandlingForm.handlingType === 'WAIVED' ? 'border-orange-600 bg-orange-50/20 text-orange-650' : 'border-slate-250 text-slate-500'
                  }`}>
                    <Check className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">Miễn trách nhiệm</span>
                    <input 
                      type="radio" 
                      name="handlingType" 
                      className="hidden" 
                      checked={lostHandlingForm.handlingType === 'WAIVED'} 
                      onChange={() => setLostHandlingForm({ ...lostHandlingForm, handlingType: 'WAIVED' })}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú bồi hoàn / xử lý</label>
                <textarea 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 h-20 resize-none text-slate-800"
                  placeholder="Nhập ghi chú xử lý (VD: NV bồi hoàn 100% lương tháng 6, vv.)..."
                  value={lostHandlingForm.compensationNote}
                  onChange={(e) => setLostHandlingForm({ ...lostHandlingForm, compensationNote: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setSelectedLostForApproval(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
