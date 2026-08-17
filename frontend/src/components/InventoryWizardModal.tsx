import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, Loader2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../lib/api';
import { BaseModal } from './BaseModal';

interface InventoryWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialAssetIds: number[];
}

export const InventoryWizardModal: React.FC<InventoryWizardModalProps> = ({ isOpen, onClose, onComplete, initialAssetIds }) => {
  const navigate = useNavigate();
  const [inventories, setInventories] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    inventoryName: '',
    inventoryDate: new Date().toISOString().slice(0, 10),
    expectedFinishDate: '',
    responsiblePerson: '',
    note: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get('/inventory');
        const active = (response.data || []).filter((item: any) => ['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(item.status));
        setInventories(active);
        setSelectedId(active[0]?.id ? String(active[0].id) : '');
        setCreateMode(active.length === 0);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Không thể tải danh sách đợt kiểm kê.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isOpen]);

  const openCountSheet = async () => {
    if (!selectedId) return toast.error('Vui lòng chọn đợt kiểm kê.');
    try {
      setSubmitting(true);
      if (initialAssetIds.length > 0) {
        await api.post(`/inventory/${selectedId}/count-sheet/assets`, { assetIds: initialAssetIds });
      }
      onComplete?.();
      onClose();
      navigate(`/inventory/${selectedId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể mở bảng chốt kiểm kê.');
    } finally {
      setSubmitting(false);
    }
  };

  const createInventory = async () => {
    if (!form.inventoryName.trim()) return toast.error('Vui lòng nhập tên đợt kiểm kê.');
    if (!form.responsiblePerson.trim()) return toast.error('Vui lòng nhập người phụ trách.');
    if (initialAssetIds.length === 0) return toast.error('Vui lòng chọn ít nhất một tài sản.');
    try {
      setSubmitting(true);
      const response = await api.post('/inventory', {
        ...form,
        inventoryDate: new Date(`${form.inventoryDate}T00:00:00+07:00`).toISOString(),
        expectedFinishDate: form.expectedFinishDate ? new Date(`${form.expectedFinishDate}T00:00:00+07:00`).toISOString() : undefined,
        scopeType: 'SELECTED',
        scopeValue: `${initialAssetIds.length} tài sản được chọn`,
        assetIds: initialAssetIds,
        status: 'OPEN'
      });
      toast.success(`Đã tạo bảng chốt gồm ${response.data.assetCount || initialAssetIds.length} tài sản.`);
      onComplete?.();
      onClose();
      navigate(`/inventory/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo đợt kiểm kê.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="form"
      title={<div><h2 className="text-lg font-black uppercase text-slate-900">Đưa tài sản vào bảng chốt kiểm kê</h2><p className="mt-0.5 text-[10px] font-bold uppercase text-slate-400">{initialAssetIds.length} tài sản đang chọn</p></div>}
      footer={<>
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600">Hủy</button>
        <button type="button" onClick={() => void (createMode ? createInventory() : openCountSheet())} disabled={submitting || loading} className="flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-xs font-black text-white disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : createMode ? <Plus className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
          {createMode ? 'Tạo và mở bảng chốt' : 'Mở bảng chốt'}
        </button>
      </>}
    >
      {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setCreateMode(false)} disabled={inventories.length === 0} className={`h-10 text-xs font-black ${!createMode ? 'rounded bg-white text-primary-700 shadow-sm' : 'text-slate-500 disabled:opacity-40'}`}>Chọn đợt đang mở</button>
            <button type="button" onClick={() => setCreateMode(true)} className={`h-10 text-xs font-black ${createMode ? 'rounded bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}>Tạo đợt mới</button>
          </div>

          {!createMode ? (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500">Đợt kiểm kê</label>
              <div className="space-y-2">
                {inventories.map((item) => (
                  <label key={item.id} className={`flex cursor-pointer items-center justify-between rounded-md border p-4 ${selectedId === String(item.id) ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200 bg-white'}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <input type="radio" name="inventory" checked={selectedId === String(item.id)} onChange={() => setSelectedId(String(item.id))} />
                      <span className="min-w-0"><span className="block truncate text-sm font-black text-slate-800">{item.inventoryName}</span><span className="block text-[10px] font-bold text-slate-400">{item.inventoryCode} · {item._count?.items || 0} tài sản</span></span>
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{item.status}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500">Các tài sản đang chọn sẽ được thêm vào đợt này nếu chưa có trong danh sách.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div><label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Tên đợt kiểm kê *</label><input value={form.inventoryName} onChange={(event) => setForm({ ...form, inventoryName: event.target.value })} placeholder="Ví dụ: Kiểm kê tài sản tháng 8/2026" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-primary-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Ngày bắt đầu *</label><div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={form.inventoryDate} onChange={(event) => setForm({ ...form, inventoryDate: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 pl-10 pr-3 text-xs font-bold" /></div></div>
                <div><label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Kết thúc dự kiến</label><input type="date" value={form.expectedFinishDate} onChange={(event) => setForm({ ...form, expectedFinishDate: event.target.value })} className="h-10 w-full rounded-md border border-slate-300 px-3 text-xs font-bold" /></div>
              </div>
              <div><label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Người phụ trách *</label><input value={form.responsiblePerson} onChange={(event) => setForm({ ...form, responsiblePerson: event.target.value })} placeholder="Họ tên người phụ trách" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-primary-500" /></div>
              <div><label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Ghi chú</label><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={3} className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500" /></div>
              <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">Danh sách ban đầu gồm {initialAssetIds.length} tài sản đang chọn; mỗi tài sản có SL sổ sách bằng 1.</div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};
