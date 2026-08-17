import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  History,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../lib/api';

type AssigneeVariant = {
  key: string;
  name: string;
  phone: string | null;
  phones: string[];
  position: string | null;
  departmentName: string | null;
  locations: string[];
  assetCount: number;
};

type SuggestionGroup = {
  groupKey: string;
  displayName: string;
  confidenceScore: number;
  assetCount: number;
  variants: AssigneeVariant[];
  riskFlags: string[];
  suggestedCanonical: {
    canonicalName: string;
    primaryPhone: string | null;
    canonicalPosition: string | null;
    departmentName: string | null;
  };
};

type CanonicalProfile = {
  id: number;
  canonicalName: string;
  primaryPhone: string | null;
  canonicalPosition: string | null;
  departmentName: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  aliases: Array<{ id: number }>;
  _count: { assets: number };
  mergeDecisions: Array<{ id: number }>;
};

type PagedResponse<T> = {
  total: number;
  page: number;
  totalPages: number;
  items: T[];
};

const emptyPage = <T,>(): PagedResponse<T> => ({ total: 0, page: 1, totalPages: 1, items: [] });
const unique = (values: Array<string | null | undefined>) => Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
const riskLabels: Record<string, string> = {
  PHONE_CONFLICT: 'Khác số điện thoại',
  POSITION_CONFLICT: 'Khác chức vụ',
  DEPARTMENT_CONFLICT: 'Khác phòng ban',
  NAME_FORMAT_VARIANT: 'Khác cách viết tên'
};

export const AssigneeReviewModal: React.FC<{ onClose: () => void; onChanged: () => void }> = ({ onClose, onChanged }) => {
  const [view, setView] = useState<'suggestions' | 'profiles'>('suggestions');
  const [suggestions, setSuggestions] = useState<PagedResponse<SuggestionGroup>>(emptyPage());
  const [profiles, setProfiles] = useState<PagedResponse<CanonicalProfile>>(emptyPage());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SuggestionGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ canonicalName: '', primaryPhone: '', canonicalPosition: '', departmentName: '' });

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = view === 'suggestions' ? 'suggestions' : 'profiles';
      const response = await api.get(`/normalization/assignees/${endpoint}`, {
        params: { search: search.trim() || undefined, page, limit: 30 }
      });
      if (view === 'suggestions') setSuggestions(response.data);
      else setProfiles(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải dữ liệu rà soát.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [view, search, page]);

  useEffect(() => setPage(1), [view, search]);

  const openReview = (group: SuggestionGroup) => {
    const phones = unique(group.variants.flatMap((variant) => variant.phones));
    setSelected(group);
    setForm({
      canonicalName: group.suggestedCanonical.canonicalName,
      primaryPhone: group.suggestedCanonical.primaryPhone || phones[0] || '',
      canonicalPosition: group.suggestedCanonical.canonicalPosition || '',
      departmentName: group.suggestedCanonical.departmentName || ''
    });
  };

  const merge = async () => {
    if (!selected || !form.canonicalName.trim()) return;
    setSaving(true);
    try {
      const response = await api.post('/normalization/assignees/merge', {
        groupKey: selected.groupKey,
        canonicalName: form.canonicalName.trim(),
        primaryPhone: form.primaryPhone || null,
        canonicalPosition: form.canonicalPosition || null,
        departmentName: form.departmentName || null
      });
      toast.success(`Đã chuẩn hóa ${response.data.updatedAssets} tài sản.`);
      setSelected(null);
      await load();
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gộp hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const markNotDuplicate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/normalization/assignees/not-duplicate', { groupKey: selected.groupKey });
      toast.success('Đã loại nhóm này khỏi danh sách gợi ý.');
      setSelected(null);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu quyết định.');
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (profile: CanonicalProfile) => {
    const decision = profile.mergeDecisions[0];
    if (!decision || !window.confirm(`Hoàn tác lần gộp hồ sơ ${profile.canonicalName}?`)) return;
    try {
      const response = await api.post(`/normalization/assignees/decisions/${decision.id}/rollback`);
      toast.success(`Đã khôi phục ${response.data.restoredAssets} tài sản.`);
      await load();
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể hoàn tác.');
    }
  };

  const current = view === 'suggestions' ? suggestions : profiles;
  const stats = useMemo(() => ({
    groups: suggestions.total,
    assets: suggestions.items.reduce((sum, group) => sum + group.assetCount, 0),
    conflicts: suggestions.items.filter((group) => group.riskFlags.includes('PHONE_CONFLICT')).length
  }), [suggestions]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3">
      <div className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-lg bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="flex items-center gap-2"><GitMerge className="h-5 w-5 text-primary-600" /><h2 className="text-lg font-black text-slate-900">Rà soát trùng người sử dụng</h2></div>
            <p className="mt-1 text-xs text-slate-500">Gợi ý từ Sổ tài sản, chỉ gộp sau khi quản trị viên xác nhận.</p>
          </div>
          <button type="button" title="Đóng" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto p-4 lg:p-5">
          <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3">
            <Stat icon={Users} label="Nhóm cần rà soát" value={stats.groups} />
            <Stat icon={ShieldCheck} label="Tài sản trên trang" value={stats.assets} />
            <Stat icon={Phone} label="Xung đột số điện thoại" value={stats.conflicts} warning />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-b border-slate-200 pb-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex self-start rounded-md bg-slate-200/70 p-1">
              <ViewButton active={view === 'suggestions'} onClick={() => setView('suggestions')}>Gợi ý rà soát</ViewButton>
              <ViewButton active={view === 'profiles'} onClick={() => setView('profiles')}>Đã chuẩn hóa</ViewButton>
            </div>
            <label className="relative block w-full md:w-[380px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm họ tên, điện thoại, phòng ban..." className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></label>
          </div>

          <div className="mt-3 min-h-[320px] overflow-x-auto border border-slate-200 bg-white">
            {loading ? <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              : view === 'suggestions' ? <SuggestionTable items={suggestions.items} onReview={openReview} />
                : <ProfileTable items={profiles.items} onRollback={(profile) => void rollback(profile)} />}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{current.total} bản ghi</span>
            <div className="flex items-center gap-2">
              <PageButton title="Trang trước" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></PageButton>
              <span>Trang {page}/{current.totalPages}</span>
              <PageButton title="Trang sau" disabled={page >= current.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-4 w-4" /></PageButton>
            </div>
          </div>
        </div>
      </div>

      {selected && <ReviewDialog group={selected} form={form} setForm={setForm} saving={saving} onClose={() => setSelected(null)} onMerge={() => void merge()} onNotDuplicate={() => void markNotDuplicate()} />}
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, warning = false }: { icon: React.ElementType; label: string; value: number; warning?: boolean }) => <div className={`${warning ? 'bg-amber-50' : 'bg-white'} px-4 py-3`}><div className={`flex items-center gap-2 text-[10px] font-black uppercase ${warning ? 'text-amber-700' : 'text-slate-400'}`}><Icon className="h-3.5 w-3.5" />{label}</div><div className={`mt-1 text-xl font-black ${warning ? 'text-amber-800' : 'text-slate-900'}`}>{value.toLocaleString('vi-VN')}</div></div>;
const ViewButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => <button type="button" onClick={onClick} className={`h-8 rounded px-3 text-xs font-black ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{children}</button>;
const PageButton = ({ title, disabled, onClick, children }: { title: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) => <button type="button" title={title} disabled={disabled} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white disabled:opacity-30">{children}</button>;

const SuggestionTable = ({ items, onReview }: { items: SuggestionGroup[]; onReview: (group: SuggestionGroup) => void }) => {
  if (items.length === 0) return <Empty text="Không có nhóm trùng cần rà soát." />;
  return <table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Người sử dụng</th><th className="p-3">Biến thể</th><th className="p-3">Tài sản</th><th className="p-3">Tin cậy</th><th className="p-3">Cảnh báo</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{items.map((group) => <tr key={group.groupKey} className="border-t border-slate-100 text-sm"><td className="p-3"><div className="font-bold text-slate-900">{group.displayName}</div><div className="text-[11px] text-slate-400">{group.suggestedCanonical.departmentName || '--'}</div></td><td className="p-3 font-bold">{group.variants.length}</td><td className="p-3 font-bold">{group.assetCount}</td><td className="p-3"><span className={`rounded px-2 py-1 text-[10px] font-black ${group.confidenceScore >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{group.confidenceScore}%</span></td><td className="p-3"><div className="flex flex-wrap gap-1">{group.riskFlags.length ? group.riskFlags.map((risk) => <span key={risk} className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{riskLabels[risk] || risk}</span>) : <span className="text-xs font-bold text-emerald-600">Tương đồng</span>}</div></td><td className="p-3 text-right"><button type="button" onClick={() => onReview(group)} className="inline-flex h-8 items-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-black text-white"><GitMerge className="h-3.5 w-3.5" />Rà soát</button></td></tr>)}</tbody></table>;
};

const ProfileTable = ({ items, onRollback }: { items: CanonicalProfile[]; onRollback: (profile: CanonicalProfile) => void }) => {
  if (items.length === 0) return <Empty text="Chưa có hồ sơ được chuẩn hóa." />;
  return <table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Họ tên chuẩn</th><th className="p-3">Điện thoại</th><th className="p-3">Chức vụ / Phòng ban</th><th className="p-3">Alias</th><th className="p-3">Tài sản</th><th className="p-3">Người duyệt</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{items.map((profile) => <tr key={profile.id} className="border-t border-slate-100 text-sm"><td className="p-3 font-bold text-slate-900">{profile.canonicalName}</td><td className="p-3">{profile.primaryPhone || '--'}</td><td className="p-3"><div>{profile.canonicalPosition || '--'}</div><div className="text-[11px] text-slate-400">{profile.departmentName || '--'}</div></td><td className="p-3 font-bold">{profile.aliases.length}</td><td className="p-3 font-bold">{profile._count.assets}</td><td className="p-3"><div className="font-bold">{profile.verifiedBy || '--'}</div><div className="text-[10px] text-slate-400">{profile.verifiedAt ? new Date(profile.verifiedAt).toLocaleString('vi-VN') : '--'}</div></td><td className="p-3 text-right"><button type="button" title="Hoàn tác lần gộp" disabled={!profile.mergeDecisions.length} onClick={() => onRollback(profile)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-30"><History className="h-4 w-4" /></button></td></tr>)}</tbody></table>;
};

const Empty = ({ text }: { text: string }) => <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-slate-400"><ShieldCheck className="h-8 w-8" /><span className="text-sm font-bold">{text}</span></div>;

const ReviewDialog = ({ group, form, setForm, saving, onClose, onMerge, onNotDuplicate }: {
  group: SuggestionGroup;
  form: { canonicalName: string; primaryPhone: string; canonicalPosition: string; departmentName: string };
  setForm: React.Dispatch<React.SetStateAction<{ canonicalName: string; primaryPhone: string; canonicalPosition: string; departmentName: string }>>;
  saving: boolean;
  onClose: () => void;
  onMerge: () => void;
  onNotDuplicate: () => void;
}) => {
  const phones = unique(group.variants.flatMap((variant) => variant.phones));
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3"><div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="text-lg font-black text-slate-900">Rà soát hồ sơ {group.displayName}</h3><p className="mt-1 text-xs font-bold text-slate-500">{group.variants.length} biến thể · {group.assetCount} tài sản</p></div><button type="button" title="Đóng" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center text-slate-400"><X className="h-5 w-5" /></button></header><div className="overflow-y-auto p-5"><div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Họ tên</th><th className="p-3">Số điện thoại</th><th className="p-3">Chức vụ</th><th className="p-3">Phòng ban</th><th className="p-3">Vị trí tài sản</th><th className="p-3 text-right">Số TS</th></tr></thead><tbody>{group.variants.map((variant) => <tr key={variant.key} className="border-t border-slate-100 text-sm"><td className="p-3 font-bold">{variant.name}</td><td className="p-3">{variant.phone || '--'}</td><td className="p-3">{variant.position || '--'}</td><td className="p-3">{variant.departmentName || '--'}</td><td className="max-w-[330px] p-3 text-xs text-slate-500">{variant.locations.join('; ') || '--'}</td><td className="p-3 text-right font-black">{variant.assetCount}</td></tr>)}</tbody></table></div>{group.riskFlags.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 border border-amber-200 bg-amber-50 p-3"><AlertTriangle className="h-4 w-4 text-amber-600" />{group.riskFlags.map((risk) => <span key={risk} className="text-xs font-bold text-amber-800">{riskLabels[risk] || risk}</span>)}</div>}<div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 md:grid-cols-2"><ReviewField label="Họ tên chuẩn *" value={form.canonicalName} onChange={(value) => setForm((current) => ({ ...current, canonicalName: value }))} /><label className="space-y-1 text-xs font-bold text-slate-600"><span>Số điện thoại chính</span><select value={form.primaryPhone} onChange={(event) => setForm((current) => ({ ...current, primaryPhone: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">--</option>{phones.map((phone) => <option key={phone} value={phone}>{phone}</option>)}</select></label><ReviewField label="Chức vụ chuẩn" value={form.canonicalPosition} onChange={(value) => setForm((current) => ({ ...current, canonicalPosition: value }))} /><ReviewField label="Phòng ban chuẩn" value={form.departmentName} onChange={(value) => setForm((current) => ({ ...current, departmentName: value }))} /></div></div><footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-between"><button type="button" disabled={saving} onClick={onNotDuplicate} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-xs font-black text-slate-700">Không phải cùng người</button><div className="flex gap-2"><button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-xs font-black text-slate-700">Đóng</button><button type="button" disabled={saving || !form.canonicalName.trim()} onClick={onMerge} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Gộp hồ sơ</button></div></footer></div></div>;
};

const ReviewField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label className="space-y-1 text-xs font-bold text-slate-600"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" /></label>;
