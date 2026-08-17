import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Database, Edit2, MapPin, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../lib/api';

type Person = {
  key: string;
  id?: number;
  fullName: string;
  phone: string;
  position: string;
  departmentName: string;
  cityName: string;
  projectName: string;
  locationName: string;
  source: 'MANUAL' | 'USER' | 'ASSET';
  editable: boolean;
};

type Department = { id: number; code: string; name: string; type?: string };
type LocationNode = { id: number; cityName: string; projectName: string; parentPath: string; name: string; level: number };
type DataSet = {
  people: Person[];
  departments: Department[];
  locationNodes: LocationNode[];
  assetLocations: Array<{ cityName?: string; projectName?: string; locationName?: string }>;
  locations?: Array<LocationNode & { key: string; source: 'MASTER' | 'ASSET' }>;
  stats: { people: number; manualPeople: number; departments: number; locationNodes: number; incompletePeople: number };
};

const emptyPerson = { fullName: '', phone: '', position: '', departmentName: '', cityName: '', projectName: '', locationName: '', note: '' };
const sourceLabel = { MANUAL: 'Admin nhập', USER: 'Tài khoản', ASSET: 'Sổ tài sản' };

export const BigDataCenter: React.FC = () => {
  const [data, setData] = useState<DataSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'people' | 'departments' | 'locations'>('people');
  const [search, setSearch] = useState('');
  const [personModal, setPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [personForm, setPersonForm] = useState(emptyPerson);
  const [departmentModal, setDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ code: '', name: '' });
  const [locationModal, setLocationModal] = useState(false);
  const [locationForm, setLocationForm] = useState({ cityName: '', projectName: '', level: 1, parentPath: '', name: '' });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/master-data/options');
      setData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải Big Data Center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const people = useMemo(() => (data?.people || []).filter((person) => !normalizedSearch || [
    person.fullName, person.phone, person.position, person.departmentName, person.cityName, person.projectName, person.locationName
  ].some((value) => value.toLocaleLowerCase('vi').includes(normalizedSearch))), [data, normalizedSearch]);
  const departments = useMemo(() => (data?.departments || []).filter((department) => !normalizedSearch
    || `${department.code} ${department.name}`.toLocaleLowerCase('vi').includes(normalizedSearch)), [data, normalizedSearch]);
  const locations = useMemo(() => (data?.locations || data?.locationNodes || []).filter((location) => !normalizedSearch
    || `${location.cityName} ${location.projectName} ${location.parentPath} ${location.name}`.toLocaleLowerCase('vi').includes(normalizedSearch)), [data, normalizedSearch]);

  const locationCities = useMemo(() => Array.from(new Set((data?.locationNodes || []).map((item) => item.cityName))).sort((a, b) => a.localeCompare(b, 'vi')), [data]);
  const locationProjects = useMemo(() => Array.from(new Set((data?.locationNodes || []).filter((item) => item.cityName === locationForm.cityName).map((item) => item.projectName))).sort((a, b) => a.localeCompare(b, 'vi')), [data, locationForm.cityName]);
  const parentOptions = useMemo(() => (data?.locationNodes || [])
    .filter((item) => item.cityName === locationForm.cityName && item.projectName === locationForm.projectName && item.level === locationForm.level - 1)
    .map((item) => ({ label: [item.parentPath, item.name].filter(Boolean).join(' / '), value: [item.parentPath, item.name].filter(Boolean).join(' / ') })), [data, locationForm]);

  const openPerson = (person?: Person) => {
    setEditingPerson(person || null);
    setPersonForm(person ? {
      fullName: person.fullName, phone: person.phone, position: person.position,
      departmentName: person.departmentName, cityName: person.cityName,
      projectName: person.projectName, locationName: person.locationName, note: ''
    } : emptyPerson);
    setPersonModal(true);
  };

  const savePerson = async () => {
    if (!personForm.fullName.trim()) return toast.error('Vui lòng nhập họ tên.');
    try {
      setSaving(true);
      if (editingPerson?.id) await api.patch(`/master-data/people/${editingPerson.id}`, personForm);
      else await api.post('/master-data/people', personForm);
      toast.success(editingPerson ? 'Đã cập nhật dữ liệu người dùng.' : 'Đã thêm người dùng vào danh mục.');
      setPersonModal(false);
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu dữ liệu người dùng.');
    } finally { setSaving(false); }
  };

  const removePerson = async (person: Person) => {
    if (!person.id || !window.confirm(`Ngừng sử dụng bản ghi “${person.fullName}”?`)) return;
    try {
      await api.delete(`/master-data/people/${person.id}`);
      toast.success('Đã ngừng sử dụng bản ghi.');
      await loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể cập nhật bản ghi.'); }
  };

  const saveDepartment = async () => {
    if (!departmentForm.code.trim() || !departmentForm.name.trim()) return toast.error('Vui lòng nhập mã và tên phòng ban.');
    try {
      setSaving(true);
      await api.post('/admin/departments', { code: departmentForm.code.trim().toUpperCase(), name: departmentForm.name.trim(), type: 'DEPARTMENT', status: 'ACTIVE' });
      toast.success('Đã thêm phòng ban mới.');
      setDepartmentModal(false);
      setDepartmentForm({ code: '', name: '' });
      await loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể thêm phòng ban.'); }
    finally { setSaving(false); }
  };

  const saveLocation = async () => {
    if (!locationForm.cityName || !locationForm.projectName || !locationForm.name.trim()) return toast.error('Vui lòng nhập đủ Thành phố, Dự án và tên vị trí.');
    if (locationForm.level > 1 && !locationForm.parentPath) return toast.error('Vui lòng chọn vị trí cấp trên.');
    try {
      setSaving(true);
      await api.post('/settings/project-location-nodes', locationForm);
      toast.success('Đã thêm vị trí mới.');
      setLocationModal(false);
      setLocationForm({ cityName: '', projectName: '', level: 1, parentPath: '', name: '' });
      await loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể thêm vị trí.'); }
    finally { setSaving(false); }
  };

  const tabButton = (id: typeof activeTab, label: string, icon: React.ReactNode, count: number) => (
    <button type="button" onClick={() => { setActiveTab(id); setSearch(''); }} className={`h-10 px-4 inline-flex items-center gap-2 border-b-2 text-sm font-bold ${activeTab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
      {icon}{label}<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{count}</span>
    </button>
  );

  if (loading && !data) return <div className="p-8 text-sm font-bold text-slate-500">Đang tải dữ liệu trung tâm...</div>;

  return (
    <div className="min-h-full bg-slate-50 p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600"><Database className="h-5 w-5" /><span className="text-xs font-black uppercase">Danh mục dùng chung</span></div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Big Data Center</h1>
          <p className="mt-1 text-sm text-slate-500">Nguồn chọn thống nhất cho người dùng, số điện thoại, phòng ban và vị trí sử dụng.</p>
        </div>
        <button type="button" onClick={() => activeTab === 'people' ? openPerson() : activeTab === 'departments' ? setDepartmentModal(true) : setLocationModal(true)} className="h-10 px-4 inline-flex items-center gap-2 rounded-md bg-primary-600 text-xs font-black text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> {activeTab === 'people' ? 'Thêm người dùng' : activeTab === 'departments' ? 'Thêm phòng ban' : 'Thêm vị trí'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 md:grid-cols-5">
        {[
          ['Người dùng', data?.stats.people || 0, UserRound], ['Admin nhập', data?.stats.manualPeople || 0, Edit2],
          ['Phòng ban', data?.stats.departments || 0, Building2], ['Vị trí phân cấp', data?.stats.locationNodes || 0, MapPin],
          ['Thiếu thông tin', data?.stats.incompletePeople || 0, Phone]
        ].map(([label, value, Icon]: any) => <div key={label} className="bg-white px-4 py-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</div><div className="mt-1 text-xl font-black text-slate-900">{Number(value).toLocaleString('vi-VN')}</div></div>)}
      </div>

      <div className="border-b border-slate-200 bg-white px-2 flex overflow-x-auto">
        {tabButton('people', 'Người dùng & Liên hệ', <UserRound className="h-4 w-4" />, data?.stats.people || 0)}
        {tabButton('departments', 'Phòng ban', <Building2 className="h-4 w-4" />, data?.stats.departments || 0)}
        {tabButton('locations', 'Vị trí sử dụng', <MapPin className="h-4 w-4" />, data?.stats.locationNodes || 0)}
      </div>

      <div className="relative max-w-xl"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong danh sách hiện tại..." className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></div>

      <div className="overflow-auto border border-slate-200 bg-white">
        {activeTab === 'people' && <table className="w-full min-w-[1050px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Họ tên</th><th className="p-3">Số điện thoại</th><th className="p-3">Chức vụ</th><th className="p-3">Phòng ban</th><th className="p-3">Vị trí sử dụng gần nhất</th><th className="p-3">Nguồn</th><th className="w-24 p-3 text-right">Thao tác</th></tr></thead><tbody>{people.map((person) => <tr key={person.key} className="border-t border-slate-100 text-sm"><td className="p-3 font-bold text-slate-900">{person.fullName}</td><td className={`p-3 ${person.phone ? 'text-slate-700' : 'font-bold text-amber-600'}`}>{person.phone || '--'}</td><td className="p-3 text-slate-600">{person.position || '--'}</td><td className="p-3 text-slate-700">{person.departmentName || '--'}</td><td className="p-3 text-xs text-slate-600">{[person.cityName, person.projectName, person.locationName].filter(Boolean).join(' - ') || '--'}</td><td className="p-3"><span className={`rounded px-2 py-1 text-[10px] font-black ${person.source === 'MANUAL' ? 'bg-violet-50 text-violet-700' : person.source === 'USER' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{sourceLabel[person.source]}</span></td><td className="p-3"><div className="flex justify-end gap-1">{person.editable && <><button title="Sửa" onClick={() => openPerson(person)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-primary-600"><Edit2 className="h-4 w-4" /></button><button title="Ngừng sử dụng" onClick={() => void removePerson(person)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></>}</div></td></tr>)}</tbody></table>}
        {activeTab === 'departments' && <table className="w-full min-w-[700px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Mã phòng ban</th><th className="p-3">Tên phòng ban</th><th className="p-3">Loại</th></tr></thead><tbody>{departments.map((department) => <tr key={department.id} className="border-t border-slate-100 text-sm"><td className="p-3 font-mono font-bold text-primary-700">{department.code}</td><td className="p-3 font-bold text-slate-900">{department.name}</td><td className="p-3 text-slate-500">{department.type || 'DEPARTMENT'}</td></tr>)}</tbody></table>}
        {activeTab === 'locations' && <table className="w-full min-w-[980px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr><th className="p-3">Thành phố</th><th className="p-3">Dự án</th><th className="p-3">Cấp</th><th className="p-3">Đường dẫn cấp trên</th><th className="p-3">Tên vị trí</th><th className="p-3">Nguồn</th></tr></thead><tbody>{locations.map((location: any) => <tr key={location.key || location.id} className="border-t border-slate-100 text-sm"><td className="p-3 font-bold text-slate-800">{location.cityName}</td><td className="p-3 text-slate-700">{location.projectName}</td><td className="p-3">{location.level ? <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black">CẤP {location.level}</span> : '--'}</td><td className="p-3 text-slate-500">{location.parentPath || '--'}</td><td className="p-3 font-bold text-slate-900">{location.name}</td><td className="p-3"><span className={`rounded px-2 py-1 text-[10px] font-black ${location.source === 'ASSET' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>{location.source === 'ASSET' ? 'Sổ tài sản' : 'Danh mục'}</span></td></tr>)}</tbody></table>}
        {((activeTab === 'people' && people.length === 0) || (activeTab === 'departments' && departments.length === 0) || (activeTab === 'locations' && locations.length === 0)) && <div className="p-12 text-center text-sm font-bold text-slate-400">Không có dữ liệu phù hợp.</div>}
      </div>

      {personModal && <Modal title={editingPerson ? 'Sửa người dùng danh mục' : 'Thêm người dùng danh mục'} onClose={() => setPersonModal(false)}><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[
        ['fullName', 'Họ tên *'], ['phone', 'Số điện thoại'], ['position', 'Chức vụ'], ['departmentName', 'Phòng ban'], ['cityName', 'Thành phố'], ['projectName', 'Dự án'], ['locationName', 'Vị trí sử dụng']
      ].map(([key, label]) => <label key={key} className="space-y-1 text-xs font-bold text-slate-600"><span>{label}</span>{key === 'departmentName' ? <select value={(personForm as any)[key]} onChange={(event) => setPersonForm({ ...personForm, [key]: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="">-- Chọn phòng ban --</option>{(data?.departments || []).map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}</select> : <input value={(personForm as any)[key]} onChange={(event) => setPersonForm({ ...personForm, [key]: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />}</label>)}</div><ModalActions saving={saving} onCancel={() => setPersonModal(false)} onSave={() => void savePerson()} /></Modal>}
      {departmentModal && <Modal title="Thêm phòng ban" onClose={() => setDepartmentModal(false)}><div className="grid grid-cols-[140px_1fr] gap-3"><Field label="Mã phòng ban *" value={departmentForm.code} onChange={(value) => setDepartmentForm({ ...departmentForm, code: value.toUpperCase() })} /><Field label="Tên phòng ban *" value={departmentForm.name} onChange={(value) => setDepartmentForm({ ...departmentForm, name: value })} /></div><ModalActions saving={saving} onCancel={() => setDepartmentModal(false)} onSave={() => void saveDepartment()} /></Modal>}
      {locationModal && <Modal title="Thêm vị trí sử dụng" onClose={() => setLocationModal(false)}><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><SelectField label="Thành phố *" value={locationForm.cityName} options={locationCities} onChange={(value) => setLocationForm({ ...locationForm, cityName: value, projectName: '', parentPath: '' })} allowNew /><SelectField label="Dự án *" value={locationForm.projectName} options={locationProjects} onChange={(value) => setLocationForm({ ...locationForm, projectName: value, parentPath: '' })} allowNew /><label className="space-y-1 text-xs font-bold text-slate-600"><span>Cấp vị trí *</span><select value={locationForm.level} onChange={(event) => setLocationForm({ ...locationForm, level: Number(event.target.value), parentPath: '' })} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"><option value={1}>Khu vực</option><option value={2}>Địa điểm / công trình</option><option value={3}>Tầng / khu chức năng</option><option value={4}>Vị trí chi tiết</option></select></label>{locationForm.level > 1 && <SelectField label="Vị trí cấp trên *" value={locationForm.parentPath} options={parentOptions.map((item) => item.value)} onChange={(value) => setLocationForm({ ...locationForm, parentPath: value })} />}<div className="md:col-span-2"><Field label="Tên vị trí mới *" value={locationForm.name} onChange={(value) => setLocationForm({ ...locationForm, name: value })} /></div></div><ModalActions saving={saving} onCancel={() => setLocationModal(false)} onSave={() => void saveLocation()} /></Modal>}
    </div>
  );
};

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-base font-black text-slate-900">{title}</h2><button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div></div></div>;
const ModalActions = ({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) => <div className="mt-5 flex justify-end gap-2"><button onClick={onCancel} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-black text-slate-600">Hủy</button><button disabled={saving} onClick={onSave} className="h-9 rounded-md bg-primary-600 px-4 text-xs font-black text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu dữ liệu'}</button></div>;
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label className="space-y-1 text-xs font-bold text-slate-600"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" /></label>;
const SelectField = ({ label, value, options, onChange, allowNew = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; allowNew?: boolean }) => <label className="space-y-1 text-xs font-bold text-slate-600"><span>{label}</span><input list={`list-${label}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={allowNew ? 'Chọn hoặc nhập mới' : '-- Chọn --'} className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" /><datalist id={`list-${label}`}>{options.map((option) => <option key={option} value={option} />)}</datalist></label>;
