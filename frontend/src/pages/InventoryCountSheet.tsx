import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Loader2,
  MapPin,
  PackageCheck,
  PackageX,
  Search,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import {
  InventoryLocationPickerModal,
  type VerifiedInventoryLocation
} from '../components/InventoryLocationPickerModal';
import type { ProjectLocationNode } from '../components/TransferWizard';
import {
  buildInventoryHierarchy,
  calculateCountSheetStats,
  filterInventoryCountItems,
  getInventoryItemSnapshot,
  inventoryLocationsMatch,
  type InventoryCountItem,
  type InventoryHierarchyNode
} from '../utils/inventoryCountSheet';

type DraftRow = {
  actualQuantity: '' | 0 | 1;
  actualCity: string;
  actualProject: string;
  actualLocation: string;
  actualDepartment: string;
  quality: string;
  note: string;
};

type ViewFilter = 'ALL' | 'UNCHECKED' | 'MISSING' | 'DAMAGED' | 'WRONG_LOCATION';

const QUALITY_OPTIONS = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'DAMAGED', label: 'Hỏng' },
  { value: 'NEEDS_REPAIR', label: 'Cần sửa chữa' },
  { value: 'UNKNOWN', label: 'Chưa xác định' }
];

const levelLabels: Record<InventoryHierarchyNode['level'], string> = {
  city: 'Thành phố',
  project: 'Dự án',
  location: 'Vị trí',
  department: 'Phòng/Ban'
};

const collectNodeKeys = (nodes: InventoryHierarchyNode[]): string[] => nodes.flatMap((node) => [
  node.key,
  ...collectNodeKeys(node.children)
]);

export const InventoryCountSheet: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { openModal } = useModal();
  const [inventory, setInventory] = useState<any>(null);
  const [items, setItems] = useState<InventoryCountItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [locationPickerItemId, setLocationPickerItemId] = useState<number | null>(null);
  const [projectLocationNodes, setProjectLocationNodes] = useState<ProjectLocationNode[]>([]);
  const [departments, setDepartments] = useState<Array<{ id?: number; name?: string; code?: string }>>([]);

  const fetchCountSheet = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get(`/inventory/${id}/count-sheet`);
      const nextInventory = response.data;
      const nextItems: InventoryCountItem[] = nextInventory.items || [];
      setInventory(nextInventory);
      setItems(nextItems);
      setDrafts(Object.fromEntries(nextItems.map((item) => [item.id, {
        actualQuantity: item.actualQuantity === 0 ? 0 : item.actualQuantity === 1 ? 1 : '',
        actualCity: item.actualCity || item.expectedCity || item.asset?.cityName || '',
        actualProject: item.actualProject || item.expectedProject || item.asset?.projectName || '',
        actualLocation: item.actualLocation || item.expectedLocation || item.asset?.locationName || '',
        actualDepartment: item.actualDepartment || item.expectedDepartment || item.asset?.departmentName || '--',
        quality: item.quality && item.quality !== 'MISSING' ? item.quality : 'GOOD',
        note: item.note || ''
      }])));
      const hierarchy = buildInventoryHierarchy(nextItems);
      setExpandedKeys(new Set(hierarchy.map((node) => node.key)));
      setDirtyIds(new Set());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải bảng chốt kiểm kê.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchCountSheet();
  }, [fetchCountSheet]);

  useEffect(() => {
    const fetchLocationMetadata = async () => {
      try {
        const [nodesResponse, departmentsResponse] = await Promise.all([
          api.get('/settings/project-location-nodes'),
          api.get('/settings/departments')
        ]);
        setProjectLocationNodes(Array.isArray(nodesResponse.data) ? nodesResponse.data : []);
        setDepartments(Array.isArray(departmentsResponse.data) ? departmentsResponse.data : []);
      } catch {
        setProjectLocationNodes([]);
        setDepartments([]);
      }
    };
    void fetchLocationMetadata();
  }, []);

  const stats = useMemo(() => calculateCountSheetStats(items), [items]);
  const visibleItems = useMemo(() => {
    const searched = filterInventoryCountItems(items, query);
    if (viewFilter === 'UNCHECKED') return searched.filter((item) => item.actualQuantity === null || item.actualQuantity === undefined);
    if (viewFilter === 'MISSING') return searched.filter((item) => item.actualQuantity === 0);
    if (viewFilter === 'DAMAGED') return searched.filter((item) => item.actualQuantity === 1 && item.quality !== 'GOOD');
    if (viewFilter === 'WRONG_LOCATION') return searched.filter((item) => item.result === 'WRONG_LOCATION');
    return searched;
  }, [items, query, viewFilter]);
  const hierarchy = useMemo(() => buildInventoryHierarchy(visibleItems), [visibleItems]);
  const isCompleted = inventory?.status === 'COMPLETED';
  const canCount = !isCompleted && hasPermission('INVENTORY_CREATE');
  const wrongLocationCount = useMemo(() => items.filter((item) => item.result === 'WRONG_LOCATION').length, [items]);

  const updateDraft = (itemId: number, patch: Partial<DraftRow>) => {
    if (!canCount) return;
    setDrafts((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch }
    }));
    setDirtyIds((current) => new Set(current).add(itemId));
  };

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirmInventoryItem = async (itemId: number) => {
    if (!id) return;
    const row = drafts[itemId];
    const item = items.find((candidate) => candidate.id === itemId);
    if (!row || row.actualQuantity === '') {
      toast.error('Vui lòng chọn số lượng thực tế 0 hoặc 1.');
      return;
    }
    if (row.actualQuantity === 1 && (!row.actualCity.trim() || !row.actualProject.trim() || !row.actualLocation.trim())) {
      toast.error('Vui lòng chọn đầy đủ vị trí kiểm thực tế.');
      return;
    }
    if ((row.actualQuantity === 0 || row.quality !== 'GOOD') && !row.note.trim()) {
      toast.error(`Tài sản ${item?.assetCode || ''}: cần ghi chú khi thiếu hoặc tình trạng không tốt.`);
      return;
    }
    try {
      setSavingItemId(itemId);
      const response = await api.patch(`/inventory/${id}/count-sheet`, { rows: [{ itemId, ...row }] });
      const updated = response.data.items?.[0];
      if (updated) setItems((current) => current.map((candidate) => candidate.id === itemId ? { ...candidate, ...updated } : candidate));
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      setInventory((current: any) => ({ ...current, status: current.status === 'DRAFT' || current.status === 'OPEN' ? 'IN_PROGRESS' : current.status }));
      toast.success(`Đã kiểm kê tài sản ${item?.assetCode || ''}.`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xác nhận kiểm kê tài sản.');
    } finally {
      setSavingItemId(null);
    }
  };

  const finalizeInventory = async () => {
    if (!id || isCompleted) return;
    if (dirtyIds.size > 0) {
      toast.error('Còn dòng đang sửa. Vui lòng bấm Kiểm kê trên từng dòng trước khi hoàn thành.');
      return;
    }
    const message = stats.unchecked > 0
      ? `Còn ${stats.unchecked} tài sản chưa nhập. Khi hoàn thành, các tài sản này sẽ được chốt số lượng 0 (Thiếu). Tiếp tục?`
      : 'Hoàn thành và khóa bảng kiểm kê này?';
    if (!window.confirm(message)) return;
    try {
      setFinalizing(true);
      const response = await api.post(`/inventory/${id}/count-sheet/finalize`);
      toast.success(response.data.uncheckedMarkedMissing > 0
        ? `Đã hoàn thành. ${response.data.uncheckedMarkedMissing} tài sản chưa kiểm được ghi nhận thiếu.`
        : 'Đã hoàn thành kiểm kê.');
      await fetchCountSheet();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hoàn thành kiểm kê.');
    } finally {
      setFinalizing(false);
    }
  };

  const exportInventoryReport = async () => {
    if (!id) return;
    try {
      setExporting(true);
      const response = await api.get(`/inventory/${id}/count-sheet/export`, { responseType: 'blob' });
      const disposition = String(response.headers?.['content-disposition'] || '');
      const matchedName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const fileName = matchedName || `BaoCaoKiemKe_${inventory?.inventoryCode || id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo kiểm kê Excel.');
    } catch (error: any) {
      const message = error.response?.data && !(error.response.data instanceof Blob)
        ? error.response.data.message
        : '';
      toast.error(message || 'Không thể xuất báo cáo kiểm kê.');
    } finally {
      setExporting(false);
    }
  };

  const renderAssetRows = (node: InventoryHierarchyNode) => (
    <div className="overflow-x-auto border-t border-slate-200">
      <table className="w-full min-w-[1380px] table-fixed">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
          <tr>
            <th className="w-[145px] px-4 py-3 text-left">Mã tài sản</th>
            <th className="w-[260px] px-4 py-3 text-left">Tên tài sản</th>
            <th className="w-[165px] px-4 py-3 text-left">Người dùng/Khu vực</th>
            <th className="w-[90px] px-3 py-3 text-center">SL sổ sách</th>
            <th className="w-[105px] px-3 py-3 text-center">SL thực tế</th>
            <th className="w-[220px] px-3 py-3 text-left">Vị trí kiểm thực tế</th>
            <th className="w-[150px] px-3 py-3 text-left">Tình trạng</th>
            <th className="px-4 py-3 text-left">Ghi chú</th>
            <th className="w-[115px] px-3 py-3 text-center">Xác nhận</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {node.items.map((item) => {
            const snapshot = getInventoryItemSnapshot(item);
            const draft = drafts[item.id];
            const isChecked = item.checkStatus === 'CHECKED' || Boolean(item.checkedAt);
            const isWrongLocation = item.result === 'WRONG_LOCATION'
              || (draft?.actualQuantity === 1 && (
                draft.actualCity.trim() !== String(item.expectedCity || '').trim()
                || draft.actualProject.trim() !== String(item.expectedProject || '').trim()
                || !inventoryLocationsMatch(item.expectedLocation, draft.actualCity, draft.actualProject, draft.actualLocation)
                || draft.actualDepartment.trim() !== String(item.expectedDepartment || '--').trim()
              ));
            const needsNote = draft && (draft.actualQuantity === 0 || draft.quality !== 'GOOD') && !draft.note.trim();
            return (
              <tr key={item.id} className={dirtyIds.has(item.id) ? 'bg-amber-50/60' : 'bg-white'}>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    title="Xem thông tin tài sản"
                    onClick={() => openModal('ASSET_DETAIL', { assetId: item.assetId, initialTab: 'info' })}
                    className="font-mono text-xs font-bold text-primary-700 hover:text-primary-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    {item.assetCode}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-sm font-bold text-slate-800" title={snapshot.assetName}>{snapshot.assetName}</p>
                  <p className="truncate text-[10px] font-semibold text-slate-400">Serial: {snapshot.serial}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate text-xs font-bold text-slate-700" title={snapshot.user}>{snapshot.user}</p>
                </td>
                <td className="px-3 py-3 text-center text-sm font-black text-slate-700">1</td>
                <td className="px-3 py-3 text-center">
                  <select
                    aria-label={`Số lượng thực tế ${item.assetCode}`}
                    disabled={!canCount || isChecked}
                    value={draft?.actualQuantity ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '') updateDraft(item.id, { actualQuantity: '' });
                      if (value === '0') updateDraft(item.id, { actualQuantity: 0, quality: 'GOOD' });
                      if (value === '1') updateDraft(item.id, { actualQuantity: 1 });
                    }}
                    className="mx-auto h-9 w-16 rounded-md border border-slate-300 bg-white px-2 text-center text-sm font-black text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-100"
                  >
                    <option value="">--</option>
                    <option value="1">1</option>
                    <option value="0">0</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    aria-label={`Vị trí kiểm thực tế ${item.assetCode}`}
                    disabled={!canCount || isChecked || draft?.actualQuantity === 0}
                    onClick={() => setLocationPickerItemId(item.id)}
                    title={[draft?.actualCity, draft?.actualProject, draft?.actualLocation, draft?.actualDepartment].filter(Boolean).join(' - ')}
                    className="flex min-h-9 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-[10px] font-bold text-slate-700 outline-none hover:border-primary-400 focus:border-primary-500 disabled:bg-slate-100"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="line-clamp-2">
                      {[draft?.actualCity, draft?.actualProject, draft?.actualLocation, draft?.actualDepartment].filter(Boolean).join(' - ') || 'Chọn vị trí kiểm'}
                    </span>
                  </button>
                  {isWrongLocation && <p className="mt-1 text-[9px] font-black uppercase text-amber-600">Khác sổ sách</p>}
                </td>
                <td className="px-3 py-3">
                  {draft?.actualQuantity === 0 ? (
                    <span className="inline-flex h-8 items-center rounded-md bg-rose-50 px-3 text-xs font-black text-rose-600">Thiếu</span>
                  ) : (
                    <select
                      aria-label={`Tình trạng ${item.assetCode}`}
                      disabled={!canCount || isChecked || draft?.actualQuantity !== 1}
                      value={draft?.quality || 'GOOD'}
                      onChange={(event) => updateDraft(item.id, { quality: event.target.value })}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500 disabled:bg-slate-100"
                    >
                      {QUALITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Ghi chú ${item.assetCode}`}
                    disabled={!canCount || isChecked}
                    value={draft?.note || ''}
                    onChange={(event) => updateDraft(item.id, { note: event.target.value })}
                    placeholder={draft?.actualQuantity === 0 ? 'Bắt buộc nhập lý do thiếu...' : 'Ghi chú tình trạng tài sản...'}
                    className={`h-9 w-full rounded-md border bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary-500 disabled:bg-slate-100 ${needsNote ? 'border-rose-400' : 'border-slate-300'}`}
                  />
                </td>
                <td className="px-3 py-3 text-center">
                  {isChecked ? (
                    <span className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-50 px-3 text-[10px] font-black uppercase text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đã kiểm
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void confirmInventoryItem(item.id)}
                      disabled={!canCount || savingItemId !== null || draft?.actualQuantity === ''}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-600 px-3 text-[10px] font-black uppercase text-white hover:bg-primary-700 disabled:opacity-40"
                    >
                      {savingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                      Kiểm kê
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderNode = (node: InventoryHierarchyNode, depth = 0): React.ReactNode => {
    const nodeStats = calculateCountSheetStats(node.items);
    const expanded = Boolean(query.trim()) || expandedKeys.has(node.key);
    const isLeaf = node.level === 'department';
    return (
      <div key={node.key} className={depth === 0 ? 'border-b border-slate-200 last:border-b-0' : ''}>
        <button
          type="button"
          aria-label={`${levelLabels[node.level]}: ${node.label}`}
          onClick={() => toggleExpanded(node.key)}
          className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${depth === 0 ? 'bg-slate-50/80' : 'bg-white'}`}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <span className="flex min-w-0 items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
            {node.level === 'city' ? <MapPin className="h-4 w-4 shrink-0 text-primary-600" /> : node.level === 'department' ? <User className="h-4 w-4 shrink-0 text-slate-500" /> : <Building2 className="h-4 w-4 shrink-0 text-slate-500" />}
            <span className="truncate text-xs font-black text-slate-800">
              <span className="mr-2 text-[9px] uppercase text-slate-400">{levelLabels[node.level]}</span>
              {node.label}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[10px] font-black">
            <span className="rounded-md bg-slate-900 px-2 py-1 text-white">{nodeStats.book} sổ sách</span>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{nodeStats.checked} đã kiểm</span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{nodeStats.actual} thực tế</span>
            <span className={`rounded-md px-2 py-1 ${nodeStats.missing ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>{nodeStats.missing} thiếu</span>
          </span>
        </button>
        {expanded && (isLeaf ? renderAssetRows(node) : node.children.map((child) => renderNode(child, depth + 1)))}
      </div>
    );
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary-600" /></div>;
  }
  if (!inventory) {
    return <div className="p-10 text-center font-bold text-slate-500">Không tìm thấy đợt kiểm kê.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate('/inventory')} title="Quay lại" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-primary-600">Bảng chốt kiểm kê tài sản</p>
            <h1 className="truncate text-xl font-black text-slate-900">{inventory.inventoryName}</h1>
            <p className="text-xs font-semibold text-slate-500">{inventory.inventoryCode} · {isCompleted ? 'Đã hoàn thành' : 'Đang kiểm kê'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void exportInventoryReport()}
            disabled={exporting}
            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất báo cáo Excel
          </button>
          {!isCompleted && hasPermission('INVENTORY_COMPLETE') && (
            <button type="button" onClick={() => void finalizeInventory()} disabled={finalizing || savingItemId !== null} className="flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
              {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Hoàn thành kiểm kê
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 border border-slate-200 bg-white sm:grid-cols-5">
        {[
          { label: 'SL sổ sách', value: stats.book, icon: ClipboardList, color: 'text-slate-900' },
          { label: 'Đã kiểm', value: stats.checked, icon: PackageCheck, color: 'text-blue-700' },
          { label: 'SL thực tế', value: stats.actual, icon: CheckCircle2, color: 'text-emerald-700' },
          { label: 'Còn thiếu', value: stats.missing, icon: PackageX, color: 'text-rose-700' },
          { label: 'Chưa kiểm', value: stats.unchecked, icon: AlertTriangle, color: 'text-amber-700' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 border-b border-r border-slate-100 px-4 py-3 last:border-r-0 sm:border-b-0">
            <Icon className={`h-5 w-5 ${color}`} />
            <div><p className="text-[9px] font-black uppercase text-slate-400">{label}</p><p className={`text-xl font-black ${color}`}>{value.toLocaleString('vi-VN')}</p></div>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên, serial, người dùng, vị trí..." className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-primary-500" />
        </div>
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white p-1">
          {([
            ['ALL', 'Tất cả'], ['UNCHECKED', `Chưa kiểm (${stats.unchecked})`], ['MISSING', `Thiếu (${stats.missing})`], ['DAMAGED', 'Không tốt'], ['WRONG_LOCATION', `Sai vị trí (${wrongLocationCount})`]
          ] as Array<[ViewFilter, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setViewFilter(value)} className={`h-8 px-3 text-[10px] font-black ${viewFilter === value ? 'rounded bg-slate-900 text-white' : 'text-slate-500'}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setExpandedKeys(new Set(collectNodeKeys(hierarchy)))} className="h-10 px-3 text-xs font-bold text-slate-600">Mở rộng tất cả</button>
        <button type="button" onClick={() => setExpandedKeys(new Set())} className="h-10 px-3 text-xs font-bold text-slate-600">Thu gọn tất cả</button>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Thành phố → Dự án → Vị trí → Phòng/Ban</p>
          <p className="text-xs font-bold text-slate-600">Hiển thị {visibleItems.length.toLocaleString('vi-VN')} / {items.length.toLocaleString('vi-VN')} tài sản</p>
        </div>
        {hierarchy.length > 0 ? hierarchy.map((node) => renderNode(node)) : (
          <div className="p-16 text-center text-sm font-bold text-slate-400">Không có tài sản phù hợp bộ lọc.</div>
        )}
      </section>

      {locationPickerItemId !== null && drafts[locationPickerItemId] && (() => {
        const item = items.find((candidate) => candidate.id === locationPickerItemId);
        const draft = drafts[locationPickerItemId];
        const initialValue: VerifiedInventoryLocation = {
          city: draft.actualCity,
          project: draft.actualProject,
          location: draft.actualLocation,
          department: draft.actualDepartment
        };
        return (
          <InventoryLocationPickerModal
            isOpen
            assetCode={item?.assetCode || ''}
            initialValue={initialValue}
            projectLocationNodes={projectLocationNodes}
            departments={departments}
            onClose={() => setLocationPickerItemId(null)}
            onConfirm={(value) => {
              updateDraft(locationPickerItemId, {
                actualCity: value.city,
                actualProject: value.project,
                actualLocation: value.location,
                actualDepartment: value.department
              });
              setLocationPickerItemId(null);
            }}
          />
        );
      })()}
    </div>
  );
};
