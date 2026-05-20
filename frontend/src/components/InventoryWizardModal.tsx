import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { ClipboardCheck, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface InventoryWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialAssetIds: number[];
}

export const InventoryWizardModal: React.FC<InventoryWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialAssetIds
}) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [showCreateSession, setShowCreateSession] = useState(false);

  // New session form
  const [newSession, setNewSession] = useState({
    inventoryName: '',
    inventoryDate: new Date().toISOString().split('T')[0],
    scopeType: 'ALL',
    scopeValue: ''
  });

  // Checklist values
  const [checkForm, setCheckForm] = useState({
    actualStatus: 'IN_STOCK',
    quality: 'GOOD',
    note: ''
  });

  const fetchOpenSessions = async () => {
    try {
      const res = await api.get('/inventory');
      const openOnly = res.data.filter((s: any) => s.status === 'OPEN');
      setSessions(openOnly);
      if (openOnly.length > 0) {
        setSelectedSessionId(openOnly[0].id.toString());
      } else {
        setShowCreateSession(true);
      }
    } catch (err) {
      toast.error("Không thể tải danh sách đợt kiểm kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOpenSessions();
    }
  }, [isOpen]);

  const handleCreateSession = async () => {
    if (!newSession.inventoryName.trim()) {
      return toast.error("Vui lòng nhập tên đợt kiểm kê mới");
    }
    setSubmitting(true);
    try {
      const res = await api.post('/inventory', newSession);
      toast.success("Đã tạo đợt kiểm kê mới");
      setSessions(prev => [res.data, ...prev]);
      setSelectedSessionId(res.data.id.toString());
      setShowCreateSession(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCheck = async () => {
    if (!selectedSessionId) {
      return toast.error("Vui lòng chọn hoặc tạo đợt kiểm kê");
    }
    if (!initialAssetIds || initialAssetIds.length === 0) {
      return toast.error("Không có tài sản nào được chọn để kiểm kê");
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/check-multiple-assets', {
        sessionId: parseInt(selectedSessionId),
        assetIds: initialAssetIds,
        actualStatus: checkForm.actualStatus,
        quality: checkForm.quality,
        note: checkForm.note
      });

      toast.success(`Đã kiểm kê thành công ${initialAssetIds.length} tài sản!`);
      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi thực hiện kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="form"
      title={
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Thực hiện kiểm kê tài sản</h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Kiểm kê nhanh cho {initialAssetIds?.length || 0} tài sản đang chọn</p>
        </div>
      }
      footer={
        <>
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider">Hủy</button>
          {!showCreateSession ? (
            <button 
              onClick={handleConfirmCheck}
              disabled={submitting || !selectedSessionId}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận kiểm kê
            </button>
          ) : (
            <button 
              onClick={handleCreateSession}
              disabled={submitting}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Tạo đợt kiểm kê
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">Đang tải cấu trúc dữ liệu kiểm kê...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Session Selector / Creator toggle */}
          <div className="p-5 border border-slate-150 rounded-2xl bg-slate-50/50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Đợt kiểm kê đang hoạt động</h4>
              <button 
                onClick={() => setShowCreateSession(!showCreateSession)}
                className="text-[10px] font-black uppercase tracking-widest text-primary-650 hover:underline"
              >
                {showCreateSession ? '← Chọn đợt có sẵn' : '+ Tạo đợt kiểm kê mới'}
              </button>
            </div>

            {!showCreateSession ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Chọn đợt kiểm kê</label>
                {sessions.length === 0 ? (
                  <p className="text-xs text-rose-500 font-semibold">Chưa có đợt kiểm kê nào đang mở. Hãy tạo đợt kiểm kê mới!</p>
                ) : (
                  <select
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.inventoryName} ({s.scopeType})</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên đợt kiểm kê *</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                    placeholder="Ví dụ: Kiểm kê tài sản quý II/2026"
                    value={newSession.inventoryName}
                    onChange={e => setNewSession({...newSession, inventoryName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ngày kiểm kê</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      value={newSession.inventoryDate}
                      onChange={e => setNewSession({...newSession, inventoryDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Phạm vi kiểm kê</label>
                    <select 
                      value={newSession.scopeType}
                      onChange={e => setNewSession({...newSession, scopeType: e.target.value})}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                    >
                      <option value="ALL">Toàn bộ tài sản (ALL)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checklist Form */}
          {!showCreateSession && (
            <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b pb-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Kết quả đối soát thực tế
              </h4>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-550">Trạng thái sổ sách</label>
                    <select 
                      value={checkForm.actualStatus}
                      onChange={e => setCheckForm({...checkForm, actualStatus: e.target.value})}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                    >
                      <option value="IN_STOCK">Trong kho (IN_STOCK)</option>
                      <option value="ASSIGNED">Đang sử dụng (ASSIGNED)</option>
                      <option value="UNDER_REPAIR">Đang sửa chữa (UNDER_REPAIR)</option>
                      <option value="DAMAGED">Báo hỏng (DAMAGED)</option>
                      <option value="LOST">Báo mất (LOST)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-550">Tình trạng vật lý</label>
                    <select 
                      value={checkForm.quality}
                      onChange={e => setCheckForm({...checkForm, quality: e.target.value})}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                    >
                      <option value="GOOD">Tốt (GOOD)</option>
                      <option value="DAMAGED">Hỏng / lỗi (DAMAGED)</option>
                      <option value="LOST">Mất (LOST)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-550">Ghi chú đối soát</label>
                  <textarea 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 h-16 resize-none focus:bg-white transition-all text-xs"
                    placeholder="Nhập thông tin ghi chú kiểm kê..."
                    value={checkForm.note}
                    onChange={e => setCheckForm({...checkForm, note: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};
