import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, Clock, FileText, Filter, Loader2, Search, X } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

const actionOptions = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'CREATE', label: 'Nhập mới' },
  { value: 'IMPORT', label: 'Nhập mới' },
  { value: 'ASSIGN', label: 'Bàn giao' },
  { value: 'USE', label: 'Bàn giao' },
  { value: 'TRANSFER', label: 'Điều chuyển' },
  { value: 'RECALL', label: 'Thu hồi' },
  { value: 'DAMAGE', label: 'Báo hỏng' },
  { value: 'REPAIR', label: 'Gửi sửa chữa' },
  { value: 'REPAIR_COMPLETE', label: 'Hoàn thành sửa chữa' },
  { value: 'LOST', label: 'Mất' },
  { value: 'LIQUIDATE', label: 'Thanh lý' },
  { value: 'DESTROY', label: 'Hủy' }
];

const statCards = [
  { key: 'total', label: 'Tổng phát sinh', sub: 'giao dịch CCDC', color: 'slate' },
  { key: 'imports', label: 'Nhập mới', sub: 'lượt nhập', color: 'emerald' },
  { key: 'handovers', label: 'Bàn giao', sub: 'lượt bàn giao', color: 'blue' },
  { key: 'transfers', label: 'Điều chuyển', sub: 'lượt chuyển vị trí/người dùng', color: 'indigo' },
  { key: 'recalls', label: 'Thu hồi kho', sub: 'lượt thu hồi', color: 'violet' },
  { key: 'repairs', label: 'Báo hỏng / sửa chữa', sub: 'lượt xử lý', color: 'amber' },
  { key: 'liquidations', label: 'Thanh lý / hủy', sub: 'lượt', color: 'red' }
];

const toneClass = (actionType: string) => {
  if (['LOST', 'LIQUIDATE', 'DESTROY'].includes(actionType)) return 'bg-red-50 text-red-700 border-red-200';
  if (['DAMAGE', 'REPAIR'].includes(actionType)) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['CREATE', 'IMPORT', 'REPAIR_COMPLETE'].includes(actionType)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['ASSIGN', 'USE', 'ALLOCATE'].includes(actionType)) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const describeState = (state: any) => {
  if (!state) return '---';
  return [
    state.userName ? `Người dùng: ${state.userName}` : '',
    state.departmentName ? `Phòng: ${state.departmentName}` : '',
    state.locationName ? `Vị trí: ${state.locationName}` : '',
    state.status ? `Trạng thái: ${state.status}` : '',
    state.quantity ? `SL: ${state.quantity}` : ''
  ].filter(Boolean).join(' | ') || '---';
};

export const ToolHistory: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actionType: 'ALL',
    keyword: '',
    actor: '',
    location: ''
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tools/history', {
        params: {
          ...filters,
          actionType: filters.actionType === 'ALL' ? undefined : filters.actionType,
          keyword: filters.keyword || undefined,
          actor: filters.actor || undefined,
          location: filters.location || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          limit: 100
        }
      });
      setRows(res.data.items || []);
      setStats(res.data.stats || {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tải lịch sử tổng hợp CCDC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const selectedTimeline = useMemo(() => {
    if (!selectedRow) return [];
    return rows
      .filter(row => row.toolId === selectedRow.toolId)
      .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  }, [rows, selectedRow]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Lịch sử tổng hợp CCDC</h1>
            <p className="text-sm text-slate-500 mt-1">
              Audit log theo vòng đời CCDC: nhập mới, bàn giao, điều chuyển, thu hồi, sửa chữa, mất, thanh lý và thay đổi trạng thái.
            </p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {statCards.map(card => (
          <div key={card.key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats[card.key] || 0}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchHistory();
        }}
        className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
          <Filter className="h-4 w-4" /> Bộ lọc lịch sử
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          <input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" value={filters.actionType} onChange={e => setFilters({ ...filters, actionType: e.target.value })}>
            {actionOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input type="text" placeholder="Mã, tên CCDC, serial, chứng từ..." className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
          <input type="text" placeholder="Người liên quan / thực hiện / phê duyệt" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold md:col-span-2" value={filters.actor} onChange={e => setFilters({ ...filters, actor: e.target.value })} />
          <input type="text" placeholder="Công ty, dự án, phòng ban, kho, địa điểm" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold md:col-span-2" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setFilters({ dateFrom: '', dateTo: '', actionType: 'ALL', keyword: '', actor: '', location: '' })} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Xóa lọc</button>
          <button type="submit" className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-2"><Search className="h-4 w-4" /> Lọc lịch sử</button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="text-xs font-bold uppercase tracking-widest">Đang tải lịch sử CCDC...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-5 py-4">Thời gian</th>
                  <th className="px-5 py-4">Mã CCDC</th>
                  <th className="px-5 py-4">Tên CCDC</th>
                  <th className="px-5 py-4">Nghiệp vụ</th>
                  <th className="px-5 py-4">Trước thay đổi</th>
                  <th className="px-5 py-4">Sau thay đổi</th>
                  <th className="px-5 py-4">Người tác động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map(row => (
                  <tr key={row.id} onClick={() => setSelectedRow(row)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{new Date(row.eventTime).toLocaleDateString('vi-VN')}</div>
                      <div className="text-[11px] text-slate-400">{new Date(row.eventTime).toLocaleTimeString('vi-VN')}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-black text-slate-700">{row.toolCode}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 max-w-[240px] truncate">{row.toolName}</td>
                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${toneClass(row.actionType)}`}>{row.actionLabel}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-[260px]">{describeState(row.before)}</td>
                    <td className="px-5 py-4 text-xs text-slate-700 max-w-[260px]">{describeState(row.after)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-600">{row.actor || '---'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-400 font-bold">Không có phát sinh lịch sử phù hợp bộ lọc.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[88vh] overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">Chi tiết lịch sử CCDC</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{selectedRow.toolCode} - {selectedRow.toolName}</p>
              </div>
              <button onClick={() => setSelectedRow(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[76vh] space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-[10px] text-slate-400 font-black uppercase">Mã CCDC</p><p className="font-mono font-black text-slate-800 mt-1">{selectedRow.toolCode}</p></div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-[10px] text-slate-400 font-black uppercase">Ngày mua</p><p className="font-bold text-slate-800 mt-1">{selectedRow.purchaseDate ? new Date(selectedRow.purchaseDate).toLocaleDateString('vi-VN') : '---'}</p></div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-[10px] text-slate-400 font-black uppercase">Hóa đơn</p><p className="font-bold text-slate-800 mt-1">{selectedRow.invoiceNo || '---'}</p></div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4"><p className="text-[10px] text-slate-400 font-black uppercase">Người tác động</p><p className="font-bold text-slate-800 mt-1">{selectedRow.actor || '---'}</p></div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Trước thay đổi</h4>
                  <p className="text-sm font-semibold text-slate-700 leading-7">{describeState(selectedRow.before)}</p>
                </div>
                <div className="border border-primary-100 rounded-2xl p-4 bg-primary-50/40">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary-700 mb-3">Sau thay đổi</h4>
                  <p className="text-sm font-semibold text-slate-800 leading-7">{describeState(selectedRow.after)}</p>
                </div>
              </div>

              <div className="border border-dashed border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Hồ sơ đính kèm</h4>
                <p className="text-sm text-slate-500 font-semibold">Chưa có file đính kèm trực tiếp trong log này. Các phiếu bàn giao, sửa chữa, hình ảnh và chứng từ liên quan sẽ hiển thị tại đây khi nghiệp vụ lưu kèm file.</p>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline của CCDC này</h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  {selectedTimeline.map(event => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[22px] top-4 h-4 w-4 rounded-full bg-primary-600 border-2 border-white shadow-sm" />
                      <div className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className="flex justify-between gap-3">
                          <div>
                            <span className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${toneClass(event.actionType)}`}>{event.actionLabel}</span>
                            <p className="text-sm font-black text-slate-800 mt-2">{describeState(event.after)}</p>
                          </div>
                          <div className="text-right text-xs text-slate-500 font-bold">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            {new Date(event.eventTime).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        {event.note && <p className="text-xs text-slate-500 mt-3 bg-slate-50 rounded-xl p-3">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
