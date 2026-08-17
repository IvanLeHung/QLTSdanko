import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  ClipboardCheck, 
  Wrench, 
  History,
  Info,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Printer,
  ChevronDown,
  ArrowRightLeft,
  RotateCcw,
  Plus,
  PlusCircle,
  MinusCircle,

  Loader2,
  Trash2,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  Upload,
  Download,
  Image as ImageIcon,
  Paperclip,
  Save,
  Edit3,
  Check,
  FileSearch,
  FilePlus,
  FileCheck,
  Eye,
  EyeOff,
  FileUp,
  FileDown,
  Search,
  QrCode as QrCodeIcon,
  Copy,
  Lock
} from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RepairTicketForm } from './RepairTicketForm';
import { CompleteRepairForm } from './CompleteRepairForm';
import { toast } from 'react-toastify';
import { AppliedFormsBlock } from './AppliedFormsBlock';
import { AssetDocumentsTab } from './AssetDocumentsTab';
import { getAssetAssigneeDisplay } from '../utils/assetAssignee';
import { BMFormDispatcher } from './forms/BMFormDispatcher';
import { BaseModal } from './BaseModal';
import {
  getBigDataPersonAssignmentFields,
  getBigDataPersonIdentity,
  getBigDataPersonLocation,
  getBigDataPersonSourceLabel,
  normalizeBigDataPersonName,
  type BigDataPersonOption
} from '../utils/bigDataPeople';
import {
  LOCATION_HIERARCHY,
  PROJECT_LOCATION_LEVEL_LABELS,
  findLocationTreePath,
  getLocationTreeLevels,
  getProjectLocationTree,
  isLocationPathComplete,
  mergeProjectLocationNodes,
  type ProjectLocationNode
} from './TransferWizard';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatAssetDisplayValue = (value?: string | number | null) => {
  if (value === undefined || value === null) return '--';

  const text = String(value).trim();
  if (!text || /^(?:n\/?a|not available)$/i.test(text)) return '--';

  return text;
};

const stripLocationPrefix = (value: string, prefix?: string | null) => {
  const result = String(value || '').trim();
  const normalizedPrefix = String(prefix || '').trim();
  if (!normalizedPrefix) return result;

  const escapedPrefix = normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return result
    .replace(new RegExp(`^${escapedPrefix}(?:\\s*(?:-|/)\\s*|$)`, 'i'), '')
    .trim();
};

const getDetailedLocationName = (city?: string | null, project?: string | null, location?: string | null) => {
  return stripLocationPrefix(stripLocationPrefix(String(location || ''), city), project);
};

const formatCurrentLocation = (asset: any) => {
  const detail = getDetailedLocationName(asset?.cityName, asset?.projectName, asset?.locationName);
  const parts = [asset?.cityName, asset?.projectName, detail]
    .map(formatAssetDisplayValue)
    .filter((value) => value !== '--');

  return formatAssetDisplayValue(parts.join(' - '));
};

interface AssetDetailPopupProps {
  assetId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, assetId: number) => void;
  initialTab?: TabType;
}

type TabType = 'info' | 'assignment' | 'inventory' | 'repair' | 'timeline' | 'documents';

const isPublicCompany = (name?: string) => {
  if (!name) return true;
  const n = name.toLowerCase();
  return n.includes('danko group') || n.includes('không có thông tin') || n.includes('khong co thong tin');
};

export const AssetDetailPopup: React.FC<AssetDetailPopupProps> = ({ assetId, isOpen, onClose, onAction, initialTab = 'info' }) => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
  const [isCompleteRepairOpen, setIsCompleteRepairOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<{code: string, data?: any} | null>(null);
  const [updateAllSameName, setUpdateAllSameName] = useState(false);
  const [isCompanyRevealed, setIsCompanyRevealed] = useState(false);
  const [showAssignInfoModal, setShowAssignInfoModal] = useState(false);
  const [isAssignInfoEditing, setIsAssignInfoEditing] = useState(false);
  const [assignRecipientType, setAssignRecipientType] = useState<'PERSON' | 'AREA'>('PERSON');
  const [assignInfoForm, setAssignInfoForm] = useState<any>({
    currentUserName: '',
    assignedAreaName: '',
    currentPosition: '',
    currentUserPhone: '',
    departmentName: '',
    locationName: '',
    cityName: '',
    note: ''
  });
  const [assignLocationSelection, setAssignLocationSelection] = useState({
    city: '',
    project: '',
    location: '',
    path: [] as string[],
    customCity: '',
    customProject: '',
    customLocation: ''
  });
  const [assignProjectLocationNodes, setAssignProjectLocationNodes] = useState<ProjectLocationNode[]>([]);
  const [assignAddingLocationDepth, setAssignAddingLocationDepth] = useState<number | null>(null);
  const [assignNewLocationNodeName, setAssignNewLocationNodeName] = useState('');
  const [isCreatingAssignLocationNode, setIsCreatingAssignLocationNode] = useState(false);
  const [assignPersonOptions, setAssignPersonOptions] = useState<BigDataPersonOption[]>([]);
  const [assignPersonDropdownOpen, setAssignPersonDropdownOpen] = useState(false);
  const [assignPersonLoading, setAssignPersonLoading] = useState(false);
  const [selectedAssignPersonKey, setSelectedAssignPersonKey] = useState('');
  const [showLinkInvoiceModal, setShowLinkInvoiceModal] = useState(false);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && assetId) {
      fetchAssetDetail();
      fetchCompanies();
      fetchCategories();
      fetchProjectLocationNodes();
      setActiveTab(initialTab);
      setMode('view');
    } else {
      setAsset(null);
      setMode('view');
      setActiveTab('info');
      setShowAssignInfoModal(false);
      setIsAssignInfoEditing(false);
      setShowLinkInvoiceModal(false);
      setShowInvoiceDetailsModal(false);
      setSelectedInvoiceId(null);
    }
  }, [isOpen, assetId, initialTab]);

  useEffect(() => {
    if (!showAssignInfoModal || !isAssignInfoEditing || assignRecipientType !== 'PERSON' || !assignPersonDropdownOpen) return;
    const search = String(assignInfoForm.currentUserName || '').trim();
    if (!search) {
      setAssignPersonOptions([]);
      setAssignPersonLoading(false);
      return;
    }

    let active = true;
    setAssignPersonLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get('/master-data/people/options', { params: { search, limit: 20 } });
        if (active) setAssignPersonOptions(response.data?.items || []);
      } catch (error) {
        if (active) setAssignPersonOptions([]);
        console.error(error);
      } finally {
        if (active) setAssignPersonLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [assignInfoForm.currentUserName, assignPersonDropdownOpen, assignRecipientType, isAssignInfoEditing, showAssignInfoModal]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/assets/filter-options/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories/active/all');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getCat1Options = () => categories.filter((c: any) => c.level === 1);
  const getCat2Options = (parentId: string) => categories.filter((c: any) => c.level === 2 && c.parentId === parseInt(parentId));
  const getCat3Options = (parentId: string) => categories.filter((c: any) => c.level === 3 && c.parentId === parseInt(parentId));
  const getCat4Options = (parentId: string) => categories.filter((c: any) => c.level === 4 && c.parentId === parseInt(parentId));

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAssignInfoModal) {
          setShowAssignInfoModal(false);
        } else if (showLinkInvoiceModal) {
          setShowLinkInvoiceModal(false);
        } else if (showInvoiceDetailsModal) {
          setShowInvoiceDetailsModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, showAssignInfoModal, showLinkInvoiceModal, showInvoiceDetailsModal]);

  const fetchAssetDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assets/${assetId}`);
      setAsset(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return { label: 'TRONG KHO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'ASSIGNED': return { label: 'ĐANG SỬ DỤNG', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'RETIRED': return { label: 'ĐÃ THU HỒI', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'UNDER_REPAIR': return { label: 'ĐANG SỬA CHỮA', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'DAMAGED': return { label: 'BÁO HỎNG', color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'LOST': return { label: 'BÁO MẤT', color: 'bg-slate-800 text-white border-slate-700' };
      case 'DISPOSED': return { label: 'ĐÃ THANH LÝ', color: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: return { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  const fetchProjectLocationNodes = async () => {
    try {
      const res = await api.get('/settings/project-location-nodes');
      setAssignProjectLocationNodes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getInventoryResultLabel = (result?: string | null) => {
    switch (result) {
      case 'MATCH':
      case 'MATCHED': return 'Khớp';
      case 'DAMAGED': return 'Hư hỏng';
      case 'MISSING': return 'Không tìm thấy';
      case 'WRONG_LOCATION': return 'Sai vị trí';
      case 'WRONG_USER': return 'Sai người sử dụng';
      case 'WRONG_STATUS': return 'Sai trạng thái';
      case 'NEED_REVIEW': return 'Cần rà soát';
      default: return result || 'Chưa kiểm kê';
    }
  };

  if (!isOpen) return null;

  const TabButton: React.FC<{ id: TabType; label: string; icon: any }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
        activeTab === id 
          ? "border-primary-600 text-primary-600 bg-primary-50/30" 
          : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </button>
  );

  const currentOpenTicket = asset?.repairTickets?.find((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const latestAssignment = asset?.assignments?.[0];
  const latestHandover = asset?.latestHandoverDocument;
  const assigneeDisplay = getAssetAssigneeDisplay(asset);
  const currentAssignmentPhone = asset?.currentUserPhone || asset?.latestAssignmentPhone || latestHandover?.recipientPhone || latestAssignment?.recipientPhone;
  const currentDepartmentDisplay = [
    asset?.departmentName,
    latestAssignment?.newDepartmentName,
    latestHandover?.recipientDepartment
  ]
    .map(formatAssetDisplayValue)
    .find((value) => value !== '--') || '--';
  const assignResolvedCity = assignLocationSelection.city === 'Khác'
    ? assignLocationSelection.customCity.trim()
    : assignLocationSelection.city;
  const assignResolvedProject = assignLocationSelection.project === 'Khác'
    ? assignLocationSelection.customProject.trim()
    : assignLocationSelection.project;
  const assignProjectLocationTree = mergeProjectLocationNodes(
    getProjectLocationTree(assignLocationSelection.city, assignLocationSelection.project),
    assignProjectLocationNodes,
    assignResolvedCity,
    assignResolvedProject
  );
  const assignBaseProjectLocationLevels = getLocationTreeLevels(assignProjectLocationTree, assignLocationSelection.path);
  const assignCanAddChildToSelectedLeaf = Boolean(
    assignProjectLocationTree
    && assignLocationSelection.path.length > 0
    && assignLocationSelection.path[0] !== 'Khác'
    && assignLocationSelection.path.length < PROJECT_LOCATION_LEVEL_LABELS.length
    && isLocationPathComplete(assignProjectLocationTree, assignLocationSelection.path)
  );
  const assignProjectLocationLevels = assignCanAddChildToSelectedLeaf
    ? [...assignBaseProjectLocationLevels, []]
    : assignBaseProjectLocationLevels;
  const assignExactNameMatches = assignPersonOptions.filter((person) => (
    normalizeBigDataPersonName(person.fullName) === normalizeBigDataPersonName(assignInfoForm.currentUserName || '')
  ));
  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) => (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center mb-1.5">
        {Icon && <Icon className="mr-2 h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="text-sm font-bold text-slate-800 leading-snug">{formatAssetDisplayValue(value)}</p>
    </div>
  );

  const buildAssignLocationSelection = (rawCity: string, rawProject: string, rawLocation: string) => {
    const knownCity = Object.prototype.hasOwnProperty.call(LOCATION_HIERARCHY, rawCity);
    const city = knownCity ? rawCity : (rawCity ? 'Khác' : '');
    const locationWithoutCity = stripLocationPrefix(rawLocation, rawCity);

    let resolvedProject = rawProject;
    if (!resolvedProject && knownCity) {
      resolvedProject = Object.keys(LOCATION_HIERARCHY[rawCity] || {})
        .sort((a, b) => b.length - a.length)
        .find((project) => stripLocationPrefix(locationWithoutCity, project) !== locationWithoutCity) || '';
    }
    const knownProject = knownCity && Object.prototype.hasOwnProperty.call(LOCATION_HIERARCHY[rawCity] || {}, resolvedProject);
    const project = knownProject ? resolvedProject : (resolvedProject ? 'Khác' : '');
    const detailLocation = stripLocationPrefix(locationWithoutCity, resolvedProject);
    const tree = mergeProjectLocationNodes(
      knownProject ? getProjectLocationTree(rawCity, resolvedProject) : null,
      assignProjectLocationNodes,
      rawCity,
      resolvedProject
    );
    const path = tree ? (findLocationTreePath(tree, detailLocation) || []) : [];
    const standardLocation = knownProject && !tree && (LOCATION_HIERARCHY[rawCity]?.[resolvedProject] || []).includes(detailLocation);
    const location = path.length > 0
      ? path.join(' / ')
      : (standardLocation ? detailLocation : (detailLocation ? 'Khác' : ''));

    return {
      city,
      project,
      location,
      path,
      customCity: city === 'Khác' ? rawCity : '',
      customProject: project === 'Khác' ? resolvedProject : '',
      customLocation: location === 'Khác' ? detailLocation : ''
    };
  };

  const openAssignInfoEditor = () => {
    const rawCity = asset.cityName || latestAssignment?.newCityName || latestHandover?.newCity || '';
    const rawProject = asset.projectName || '';
    const rawLocation = asset.locationName || latestAssignment?.newLocationName || latestHandover?.newLocation || '';

    setAssignInfoForm({
      currentUserName: assigneeDisplay.isArea ? '' : (asset.currentUserName || latestAssignment?.newUserName || latestHandover?.recipientName || ''),
      assignedAreaName: assigneeDisplay.isArea ? assigneeDisplay.name : '',
      currentPosition: asset.currentPosition || latestAssignment?.newPosition || latestHandover?.recipientPosition || '',
      currentUserPhone: currentAssignmentPhone || '',
      departmentName: asset.departmentName || latestAssignment?.newDepartmentName || latestHandover?.recipientDepartment || '',
      locationName: asset.locationName || latestAssignment?.newLocationName || latestHandover?.newLocation || '',
      cityName: asset.cityName || latestAssignment?.newCityName || latestHandover?.newCity || '',
      note: ''
    });
    setAssignRecipientType(assigneeDisplay.isArea ? 'AREA' : 'PERSON');
    setAssignLocationSelection(buildAssignLocationSelection(rawCity, rawProject, rawLocation));
    setAssignAddingLocationDepth(null);
    setAssignNewLocationNodeName('');
    setAssignPersonOptions([]);
    setAssignPersonDropdownOpen(false);
    setSelectedAssignPersonKey('');
    setShowAssignInfoModal(true);
    setIsAssignInfoEditing(true);
  };

  const handleSelectAssignPerson = (person: BigDataPersonOption) => {
    const personFields = getBigDataPersonAssignmentFields(person);
    setAssignInfoForm((current: any) => ({
      ...current,
      ...personFields
    }));
    if (person.cityName || person.projectName || person.locationName) {
      setAssignLocationSelection(buildAssignLocationSelection(
        person.cityName || '',
        person.projectName || '',
        person.locationName || ''
      ));
    }
    setSelectedAssignPersonKey(person.key);
    setAssignPersonDropdownOpen(false);
  };

  const cancelAssignInfoEditor = () => {
    setIsAssignInfoEditing(false);
    setAssignRecipientType('PERSON');
    setAssignInfoForm({
      currentUserName: '',
      assignedAreaName: '',
      currentPosition: '',
      currentUserPhone: '',
      departmentName: '',
      locationName: '',
      cityName: '',
      note: ''
    });
    setAssignLocationSelection({
      city: '',
      project: '',
      location: '',
      path: [],
      customCity: '',
      customProject: '',
      customLocation: ''
    });
    setAssignAddingLocationDepth(null);
    setAssignNewLocationNodeName('');
    setAssignPersonOptions([]);
    setAssignPersonDropdownOpen(false);
    setSelectedAssignPersonKey('');
  };

  const handleCreateAssignProjectLocation = async (depth: number) => {
    const name = assignNewLocationNodeName.trim();
    const levelLabel = PROJECT_LOCATION_LEVEL_LABELS[depth] || `Phân cấp ${depth + 1}`;
    if (!name) {
      toast.error(`Vui lòng nhập tên ${levelLabel}`);
      return;
    }
    if (!assignResolvedCity || !assignResolvedProject) {
      toast.error('Vui lòng chọn Thành phố và Dự án trước');
      return;
    }
    if (depth > 0 && assignLocationSelection.path.slice(0, depth).filter(Boolean).length !== depth) {
      const parentLabel = PROJECT_LOCATION_LEVEL_LABELS[depth - 1] || `phân cấp ${depth}`;
      toast.error(`Vui lòng chọn ${parentLabel} trước`);
      return;
    }

    setIsCreatingAssignLocationNode(true);
    try {
      const parentPath = depth === 0 ? '' : assignLocationSelection.path.slice(0, depth).join(' / ');
      const res = await api.post('/settings/project-location-nodes', {
        cityName: assignResolvedCity,
        projectName: assignResolvedProject,
        parentPath,
        name,
        level: depth + 1
      });
      const created = res.data as ProjectLocationNode;
      setAssignProjectLocationNodes((current) => [
        ...current.filter((node) => node.id !== created.id),
        created
      ]);
      const nextPath = [...assignLocationSelection.path.slice(0, depth), created.name];
      setAssignLocationSelection((current) => ({
        ...current,
        path: nextPath,
        location: nextPath.join(' / '),
        customLocation: ''
      }));
      setAssignAddingLocationDepth(null);
      setAssignNewLocationNodeName('');
      toast.success(`Đã thêm và chọn ${created.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm vị trí mới');
    } finally {
      setIsCreatingAssignLocationNode(false);
    }
  };

  const handleSaveAssignInfo = async () => {
    if (!asset) return;
    const cityName = assignLocationSelection.city === 'Khác'
      ? assignLocationSelection.customCity.trim()
      : assignLocationSelection.city;
    const projectName = assignLocationSelection.project === 'Khác'
      ? assignLocationSelection.customProject.trim()
      : assignLocationSelection.project;
    const locationName = assignLocationSelection.location === 'Khác'
      ? assignLocationSelection.customLocation.trim()
      : (assignProjectLocationTree ? assignLocationSelection.path.join(' / ') : assignLocationSelection.location);

    if (!cityName || !projectName || !locationName) {
      toast.error('Vui lòng chọn đầy đủ Thành phố, Dự án và Vị trí hiện tại');
      return;
    }
    if (assignProjectLocationTree && assignLocationSelection.location !== 'Khác'
      && !isLocationPathComplete(assignProjectLocationTree, assignLocationSelection.path)) {
      toast.error('Vui lòng chọn đến cấp vị trí chi tiết cuối cùng');
      return;
    }

    const updates: any = {
      recipientType: assignRecipientType,
      recipientArea: assignRecipientType === 'AREA' ? assignInfoForm.assignedAreaName.trim() : null,
      currentUserName: assignRecipientType === 'PERSON' ? (assignInfoForm.currentUserName.trim() || null) : null,
      currentPosition: assignRecipientType === 'PERSON' ? (assignInfoForm.currentPosition.trim() || null) : null,
      currentUserPhone: assignRecipientType === 'PERSON' ? (assignInfoForm.currentUserPhone.trim() || null) : null,
      departmentName: assignInfoForm.departmentName.trim() || null,
      locationName,
      cityName,
      projectName,
      reason: assignInfoForm.note.trim() || 'Bổ sung/chỉnh sửa thông tin cấp phát từ popup người đang sử dụng'
    };

    if (assignRecipientType === 'PERSON' && !assignInfoForm.currentUserName.trim()) {
      toast.error('Vui lòng nhập họ tên người nhận');
      return;
    }
    if (assignRecipientType === 'PERSON' && assignExactNameMatches.length > 1 && !selectedAssignPersonKey) {
      toast.error('Có nhiều người trùng tên trong Big Data. Vui lòng chọn đúng người theo SĐT/phòng ban.');
      setAssignPersonDropdownOpen(true);
      return;
    }
    if (assignRecipientType === 'AREA' && !assignInfoForm.assignedAreaName.trim()) {
      toast.error('Vui lòng nhập tên khu vực / nơi đặt tài sản');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch(`/assets/${asset.id}/assignment-info`, updates);
      setAsset((current: any) => ({ ...current, ...response.data }));
      toast.success('Đã lưu thông tin cấp phát và ghi log');
      cancelAssignInfoEditor();
      await fetchAssetDetail();
      onAction?.('refresh', asset.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu thông tin cấp phát');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!currentOpenTicket) return;
    const description = prompt("Nhập nội dung cập nhật tiến độ:");
    if (!description) return;

    try {
      await api.put(`/repairs/${currentOpenTicket.id}/progress`, {
        description,
        performedBy: 'Nhân viên QLTS'
      });
      toast.success("Đã cập nhật tiến độ");
      fetchAssetDetail();
    } catch (err: any) {
      toast.error("Lỗi khi cập nhật tiến độ");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(asset.assetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Đã sao chép mã tài sản");
  };

  const enterEditMode = () => {
    const cat1 = categories.find(c => c.level === 1 && c.code === asset.level1Code);
    const cat1Id = cat1 ? cat1.id.toString() : '';

    const cat2 = cat1 ? categories.find(c => c.level === 2 && c.code === asset.level2Code && c.parentId === cat1.id) : null;
    const cat2Id = cat2 ? cat2.id.toString() : '';

    const cat3 = cat2 ? categories.find(c => c.level === 3 && c.code === asset.level3Code && c.parentId === cat2.id) : null;
    const cat3Id = cat3 ? cat3.id.toString() : '';

    const cat4 = cat3 ? categories.find(c => c.level === 4 && c.code === asset.level4Code && c.parentId === cat3.id) : null;
    const cat4Id = cat4 ? cat4.id.toString() : '';

    setEditForm({
      assetName: asset.assetName,
      serialNumber: asset.serialNumber || '',
      unit: asset.unit,
      usagePurpose: asset.usagePurpose || '',
      purchasePriceExVat: asset.purchasePriceExVat || 0,
      purchaseDate: asset.purchaseDate ? format(new Date(asset.purchaseDate), 'yyyy-MM-dd') : '',
      depreciationEndDate: asset.depreciationEndDate ? format(new Date(asset.depreciationEndDate), 'yyyy-MM-dd') : '',
      supplierName: asset.supplierName || '',
      supplierTaxCode: asset.supplierTaxCode || '',
      companyCode: asset.companyCode,
      assetCode: asset.assetCode,
      documentNote: asset.documentNote || '',
      categoryLevel1Id: cat1Id,
      categoryLevel2Id: cat2Id,
      categoryLevel3Id: cat3Id,
      categoryLevel4Id: cat4Id,
      initialCategoryLevel1Id: cat1Id,
      initialCategoryLevel2Id: cat2Id,
      initialCategoryLevel3Id: cat3Id,
      initialCategoryLevel4Id: cat4Id
    });
    setMode('edit');
  };

  const cancelEdit = () => {
    setMode('view');
    setEditForm(null);
    setUpdateAllSameName(false);
  };

  const handleSave = async () => {
    const changes: any = {};
    const sensitiveFields = ['assetCode', 'purchasePriceExVat', 'purchaseDate', 'depreciationEndDate', 'serialNumber', 'companyCode'];
    let hasSensitiveChanges = false;

    const isCategoryChanged = 
      editForm.categoryLevel1Id !== editForm.initialCategoryLevel1Id ||
      editForm.categoryLevel2Id !== editForm.initialCategoryLevel2Id ||
      editForm.categoryLevel3Id !== editForm.initialCategoryLevel3Id ||
      editForm.categoryLevel4Id !== editForm.initialCategoryLevel4Id;

    if (isCategoryChanged) {
      if (!editForm.categoryLevel1Id || !editForm.categoryLevel2Id || !editForm.categoryLevel3Id || !editForm.categoryLevel4Id) {
        toast.error("Bạn phải chọn đầy đủ 4 cấp phân loại định khoản để tạo mã tài sản mới.");
        return;
      }
    }

    for (const key in editForm) {
      if ([
        'categoryLevel1Id', 'categoryLevel2Id', 'categoryLevel3Id', 'categoryLevel4Id',
        'initialCategoryLevel1Id', 'initialCategoryLevel2Id', 'initialCategoryLevel3Id', 'initialCategoryLevel4Id'
      ].includes(key)) {
        continue;
      }
      let oldVal = asset[key];
      let newVal = editForm[key];

      if (key === 'purchaseDate' || key === 'depreciationEndDate') {
        oldVal = oldVal ? format(new Date(oldVal), 'yyyy-MM-dd') : '';
      }

      if (String(oldVal) !== String(newVal)) {
        changes[key] = (newVal === '' && (key === 'purchaseDate' || key === 'depreciationEndDate')) ? null : newVal;
        if (sensitiveFields.includes(key)) hasSensitiveChanges = true;
      }
    }

    if (isCategoryChanged) {
      const c1 = categories.find(c => c.id === parseInt(editForm.categoryLevel1Id));
      const c2 = categories.find(c => c.id === parseInt(editForm.categoryLevel2Id));
      const c3 = categories.find(c => c.id === parseInt(editForm.categoryLevel3Id));
      const c4 = categories.find(c => c.id === parseInt(editForm.categoryLevel4Id));

      if (c1 && c2 && c3 && c4) {
        changes.level1Code = c1.code;
        changes.level1Name = c1.name;
        changes.level2Code = c2.code;
        changes.level2Name = c2.name;
        changes.level3Code = c3.code;
        changes.level3Name = c3.name;
        changes.level4Code = c4.code;
        changes.level4Name = c4.name;

        hasSensitiveChanges = true;
      }
    }

    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }

    if (hasSensitiveChanges) {
      setPendingUpdates(changes);
      setShowReasonModal(true);
    } else {
      await submitUpdates(changes);
    }
  };

  const submitUpdates = async (updates: any, changeReason?: string) => {
    setIsSaving(true);
    try {
      await api.patch(`/assets/${asset.id}`, { ...updates, reason: changeReason, updateAllSameName });
      toast.success("Cập nhật tài sản thành công");
      setMode('view');
      setShowReasonModal(false);
      setReason('');
      setUpdateAllSameName(false);
      fetchAssetDetail();
      onAction?.('refresh', asset.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật tài sản");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="detail" noScroll>
      <div className="w-full h-full bg-white flex flex-col">
        
        {loading ? (
          <div className="h-[500px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải dữ liệu...</p>
          </div>
        ) : asset ? (
          <>
            {/* HEADER */}
            <input 
              type="file" 
              id="asset-file-upload" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  toast.success(`Đã chuẩn bị tải lên: ${e.target.files[0].name}`);
                  // Real upload logic would go here
                }
              }} 
            />
            <div className="px-8 pt-8 pb-6 bg-white flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-50 p-4 rounded-2xl text-primary-600 border border-primary-100 shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-[900] text-slate-900 tracking-tighter uppercase">{asset.assetCode}</h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      getStatusInfo(asset.status).color
                    )}>
                      {getStatusInfo(asset.status).label}
                    </span>
                  </div>
                  <h3 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight">{asset.assetName}</h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {mode === 'view' && (
                  <>
                    <button 
                      onClick={enterEditMode}
                      className="flex items-center px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:border-primary-100 transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-2" /> Sửa thông tin
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction('print_label', asset.id); }}
                      className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-100 rounded-xl transition-all shadow-sm group"
                      title="In tem tài sản"
                    >
                      <Printer className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-[10px] uppercase tracking-widest">In tem</span>
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
                >
                  <X className="h-6 w-6 text-slate-300 group-hover:text-slate-600" />
                </button>
              </div>
            </div>

            {/* QUICK SUMMARY */}
            <div className="px-8 mb-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50/80 rounded-3xl border border-slate-100">
                <div className="px-4 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng / Khu vực hiện tại</p>
                  <p className="text-sm font-bold text-slate-700 truncate" title={formatAssetDisplayValue(assigneeDisplay.name)}>
                    {formatAssetDisplayValue(assigneeDisplay.name)}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 truncate" title={currentDepartmentDisplay}>
                    Phòng/Ban sử dụng: {currentDepartmentDisplay}
                  </p>
                </div>
                <div className="px-4 space-y-1 border-x border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kiểm kê cuối</p>
                  <p className="text-sm font-bold text-slate-700">
                    {asset.lastInventoryDate ? format(new Date(asset.lastInventoryDate), 'HH:mm - dd/MM/yyyy') : '--'}
                  </p>
                </div>
                <div className="px-4 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí hiện tại</p>
                  <p className="text-sm font-bold text-slate-700 truncate" title={formatCurrentLocation(asset)}>{formatCurrentLocation(asset)}</p>
                </div>
              </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex px-8 border-b border-slate-100 bg-white">
              <TabButton id="info" label="Thông tin" icon={Info} />
              <TabButton id="assignment" label="Cấp phát" icon={ArrowRightLeft} />
              <TabButton id="inventory" label="Kiểm kê" icon={ClipboardCheck} />
              <TabButton id="repair" label="Sửa chữa" icon={Wrench} />
              <TabButton id="documents" label="Hồ sơ" icon={FileText} />
              <TabButton id="timeline" label="Nhật ký" icon={History} />
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="col-span-2 flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-400">
                         <QrCodeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã định danh (QR/Barcode)</p>
                        <p className="text-xs font-bold text-slate-600 font-mono flex items-center mt-0.5">
                           {asset.assetCode} 
                           <button onClick={handleCopyCode} className="ml-2 hover:text-primary-600">
                             {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                           </button>
                        </p>
                      </div>
                    </div>
                    {asset.lastLabelPrint && (
                      <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" /> Đã in tem: {format(new Date(asset.lastLabelPrint), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {mode === 'edit' && (
                      <div className="text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                        <AlertCircle className="h-3 w-3 mr-1.5" /> Đang ở chế độ chỉnh sửa
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Tag className="mr-2 h-3 w-3" /> Tên tài sản
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="text" 
                        value={editForm.assetName} 
                        onChange={e => setEditForm({...editForm, assetName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.assetName)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Tag className="mr-2 h-3 w-3" /> Serial Number
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="text" 
                        value={editForm.serialNumber} 
                        onChange={e => setEditForm({...editForm, serialNumber: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.serialNumber)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <ClipboardCheck className="mr-2 h-3 w-3" /> Đơn vị tính
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.unit} 
                        onChange={e => setEditForm({...editForm, unit: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {['Cái', 'Bộ', 'Chiếc', 'Mét', 'Kg', 'Lô'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.unit)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Info className="mr-2 h-3 w-3" /> Mục đích sử dụng
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.usagePurpose} 
                        onChange={e => setEditForm({...editForm, usagePurpose: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {['Cá nhân', 'Dùng chung', 'Dự phòng', 'Khác'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.usagePurpose)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <DollarSign className="mr-2 h-3 w-3" /> Giá mua (ex VAT)
                    </p>
                    {mode === 'edit' ? (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <input 
                          type="number" 
                          value={editForm.purchasePriceExVat} 
                          onChange={e => setEditForm({...editForm, purchasePriceExVat: Number(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2.5"><Lock className="w-3.5 h-3.5" /> Không có quyền sửa</p>
                      )
                    ) : (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <p className="text-[15px] font-bold text-slate-800">
                          {asset.purchasePriceExVat === undefined || asset.purchasePriceExVat === null
                            ? '--'
                            : `${asset.purchasePriceExVat.toLocaleString()} ₫`}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2"><Lock className="w-3.5 h-3.5" /> Không có quyền xem</p>
                      )
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Calendar className="mr-2 h-3 w-3" /> Ngày mua
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="date" 
                        value={editForm.purchaseDate} 
                        onChange={e => setEditForm({...editForm, purchaseDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.purchaseDate ? format(new Date(asset.purchaseDate), 'dd/MM/yyyy') : '--'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Clock className="mr-2 h-3 w-3" /> Hết khấu hao
                    </p>
                    {mode === 'edit' ? (
                      <input 
                        type="date" 
                        value={editForm.depreciationEndDate} 
                        onChange={e => setEditForm({...editForm, depreciationEndDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-[15px] font-bold text-slate-800">{asset.depreciationEndDate ? format(new Date(asset.depreciationEndDate), 'dd/MM/yyyy') : '--'}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Building2 className="mr-2 h-3 w-3" /> Nhà cung cấp
                    </p>
                    {mode === 'edit' ? (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <input 
                          type="text" 
                          value={editForm.supplierName} 
                          onChange={e => setEditForm({...editForm, supplierName: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2.5"><Lock className="w-3.5 h-3.5" /> Không có quyền sửa</p>
                      )
                    ) : (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.supplierName)}</p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2"><Lock className="w-3.5 h-3.5" /> Không có quyền xem</p>
                      )
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Building2 className="mr-2 h-3 w-3" /> MST Nhà cung cấp
                    </p>
                    {mode === 'edit' ? (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <input 
                          type="text" 
                          value={editForm.supplierTaxCode || ''} 
                          onChange={e => setEditForm({...editForm, supplierTaxCode: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2.5"><Lock className="w-3.5 h-3.5" /> Không có quyền sửa</p>
                      )
                    ) : (
                      hasPermission('ASSET_VIEW_PRICE') ? (
                        <p className="text-[15px] font-bold text-slate-800">{formatAssetDisplayValue(asset.supplierTaxCode)}</p>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 py-2"><Lock className="w-3.5 h-3.5" /> Không có quyền xem</p>
                      )
                    )}
                  </div>

                  {mode === 'edit' ? (
                    <div className="col-span-2 p-5 bg-primary-50/20 rounded-2xl border border-primary-100/50 space-y-3">
                      <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center">
                        <Tag className="mr-2 h-3.5 w-3.5" />
                        Phân loại định khoản (4 cấp) *
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Cấp 1</label>
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500"
                            value={editForm.categoryLevel1Id}
                            onChange={e => {
                              const val = e.target.value;
                              setEditForm({
                                ...editForm,
                                categoryLevel1Id: val,
                                categoryLevel2Id: '',
                                categoryLevel3Id: '',
                                categoryLevel4Id: ''
                              });
                            }}
                          >
                            <option value="">-- Cấp 1 --</option>
                            {getCat1Options().map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Cấp 2</label>
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50"
                            value={editForm.categoryLevel2Id}
                            disabled={!editForm.categoryLevel1Id}
                            onChange={e => {
                              const val = e.target.value;
                              setEditForm({
                                ...editForm,
                                categoryLevel2Id: val,
                                categoryLevel3Id: '',
                                categoryLevel4Id: ''
                              });
                            }}
                          >
                            <option value="">-- Cấp 2 --</option>
                            {getCat2Options(editForm.categoryLevel1Id).map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Cấp 3</label>
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50"
                            value={editForm.categoryLevel3Id}
                            disabled={!editForm.categoryLevel2Id}
                            onChange={e => {
                              const val = e.target.value;
                              setEditForm({
                                ...editForm,
                                categoryLevel3Id: val,
                                categoryLevel4Id: ''
                              });
                            }}
                          >
                            <option value="">-- Cấp 3 --</option>
                            {getCat3Options(editForm.categoryLevel2Id).map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Cấp 4</label>
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50"
                            value={editForm.categoryLevel4Id}
                            disabled={!editForm.categoryLevel3Id}
                            onChange={e => {
                              setEditForm({
                                ...editForm,
                                categoryLevel4Id: e.target.value
                              });
                            }}
                          >
                            <option value="">-- Cấp 4 --</option>
                            {getCat4Options(editForm.categoryLevel3Id).map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                        <Tag className="mr-2 h-3.5 w-3.5 text-primary-500" />
                        Phân loại định khoản (4 cấp)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Cấp 1</span>
                          <span className="text-slate-800 font-bold block truncate" title={asset.level1Name}>{asset.level1Code} - {asset.level1Name}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Cấp 2</span>
                          <span className="text-slate-800 font-bold block truncate" title={asset.level2Name}>{asset.level2Code} - {asset.level2Name}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Cấp 3</span>
                          <span className="text-slate-800 font-bold block truncate" title={asset.level3Name}>{asset.level3Code} - {asset.level3Name}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Cấp 4</span>
                          <span className="text-slate-800 font-bold block truncate" title={asset.level4Name}>{asset.level4Code} - {asset.level4Name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Building2 className="mr-2 h-3 w-3" /> Công ty chủ quản
                    </p>
                    {mode === 'edit' ? (
                      <select 
                        value={editForm.companyCode} 
                        onChange={e => setEditForm({...editForm, companyCode: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500"
                      >
                        {companies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-[15px] font-bold text-slate-800">
                          {(!asset.companyName || isPublicCompany(asset.companyName) || isCompanyRevealed) 
                            ? asset.companyName 
                            : '*****'}
                        </p>
                        {asset.companyName && !isPublicCompany(asset.companyName) && (
                          <button 
                            onClick={() => setIsCompanyRevealed(!isCompanyRevealed)} 
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title={isCompanyRevealed ? "Ẩn tên công ty" : "Xem tên công ty"}
                          >
                            {isCompanyRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 p-5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</p>
                    {mode === 'edit' ? (
                      <textarea 
                        value={editForm.documentNote} 
                        onChange={e => setEditForm({...editForm, documentNote: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-primary-500 h-24 resize-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{asset.documentNote || 'Không có ghi chú.'}</p>
                    )}
                  </div>

                  {/* Hóa đơn liên quan section */}
                  {mode !== 'edit' && (
                    <div className="col-span-2 border-t border-slate-100 pt-6 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-slate-450" />
                        Hóa đơn của tài sản
                      </h4>
                      
                      {asset.invoiceBatch ? (
                        <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-100 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-bold text-slate-600">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Số hóa đơn</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoiceId(asset.invoiceBatch.id);
                                  setShowInvoiceDetailsModal(true);
                                }}
                                className="text-sm font-black text-primary-600 hover:text-primary-750 underline text-left"
                              >
                                {formatAssetDisplayValue(asset.invoiceBatch.invoiceNo)}
                              </button>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Ngày hóa đơn</span>
                              <span className="text-slate-800 text-sm">
                                {asset.invoiceBatch.invoiceDate ? format(new Date(asset.invoiceBatch.invoiceDate), 'dd/MM/yyyy') : '--'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Nhà cung cấp</span>
                              <span className="text-slate-800 text-sm truncate block" title={formatAssetDisplayValue(asset.invoiceBatch.supplierName)}>{formatAssetDisplayValue(asset.invoiceBatch.supplierName)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Mã số thuế NCC</span>
                              <span className="text-slate-800 text-sm block">{formatAssetDisplayValue(asset.invoiceBatch.supplierTaxCode)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Giá trị trước VAT</span>
                              <span className="text-slate-850 text-sm">
                                {hasPermission('ASSET_VIEW_PRICE') && asset.purchasePriceExVat !== null
                                  ? `${asset.purchasePriceExVat.toLocaleString()} ₫`
                                  : '*****'}
                              </span>
                            </div>
                            <div className="md:col-span-3">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Ghi chú hóa đơn</span>
                              <span className="text-slate-800 text-sm font-medium leading-relaxed block">{asset.invoiceBatch.note || 'Không có ghi chú.'}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <button
                              type="button"
                              disabled={!asset.invoiceBatch.fileUrl}
                              onClick={() => {
                                if (asset.invoiceBatch.fileUrl) {
                                  const url = asset.invoiceBatch.fileUrl.startsWith('http') ? asset.invoiceBatch.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${asset.invoiceBatch.fileUrl}`;
                                  window.open(url, '_blank');
                                }
                              }}
                              className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-750"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              Xem hóa đơn
                            </button>
                            
                            <button
                              type="button"
                              disabled={!asset.invoiceBatch.fileUrl}
                              onClick={() => {
                                if (asset.invoiceBatch.fileUrl) {
                                  const url = asset.invoiceBatch.fileUrl.startsWith('http') ? asset.invoiceBatch.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${asset.invoiceBatch.fileUrl}`;
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', asset.invoiceBatch.fileUrl.split('/').pop() || 'invoice');
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }}
                              className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-750"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              Tải hóa đơn
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowLinkInvoiceModal(true)}
                              className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              Thay đổi liên kết
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                navigate(`/assets?invoiceBatchId=${asset.invoiceBatchId}`);
                              }}
                              className="flex items-center px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-750 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                            >
                              <Package className="h-3.5 w-3.5 mr-1.5 text-primary-500" />
                              Xem các tài sản cùng hóa đơn
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                          <div>
                            <p className="text-xs text-slate-500 font-bold">Tài sản này chưa được liên kết với bất kỳ hóa đơn gốc nào.</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Nhấp vào nút bên phải để chọn và liên kết với một hóa đơn</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowLinkInvoiceModal(true)}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5 inline" />
                            Liên kết hóa đơn
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assignment' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                        {assigneeDisplay.isArea ? 'Khu vực đang sử dụng' : 'Người đang sử dụng'}
                      </p>
                      <h4 className="text-lg font-black text-slate-900">{assigneeDisplay.name}</h4>
                      <p className="text-xs font-bold text-blue-500 mt-1">
                        {assigneeDisplay.isArea ? assigneeDisplay.detail : `${asset.departmentName || ''}${asset.currentPosition ? ` • ${asset.currentPosition}` : ''}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAssignInfoEditor}
                      className="bg-white p-3 rounded-2xl shadow-sm text-blue-500 hover:text-primary-600 hover:shadow-md hover:ring-2 hover:ring-primary-100 transition-all"
                      title="Chỉnh sửa người dùng, số điện thoại và vị trí hiện tại"
                    >
                      <Edit3 className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử bàn giao gần đây</h5>
                    {asset.assignments?.length > 0 ? (
                      <div className="space-y-3">
                        {asset.assignments.map((as: any) => (
                          <div key={as.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all group">
                            <div className="flex items-center space-x-3">
                              <div className="bg-slate-100 p-2 rounded-xl text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors"><RotateCcw className="h-4 w-4" /></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{as.newUserName}</p>
                                <p className="text-[10px] font-bold text-slate-400">{format(new Date(as.effectiveAt), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>
                            <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary-600 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                               <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 italic text-xs font-medium">Chưa có lịch sử bàn giao.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Kết quả kiểm kê gần nhất</p>
                     <div className="grid grid-cols-2 gap-y-4">
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</p>
                           <span className={cn("text-xs font-black uppercase tracking-wider", asset.lastInventoryStatus ? "text-emerald-700" : "text-amber-600")}>
                              {getInventoryResultLabel(asset.lastInventoryStatus)}
                           </span>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Ngày thực hiện</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryDate ? format(new Date(asset.lastInventoryDate), 'dd/MM/yyyy') : 'Chưa có'}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Tình trạng thực tế</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryStatus ? getInventoryResultLabel(asset.lastInventoryStatus) : 'Chưa có dữ liệu'}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Người kiểm kê</p>
                           <p className="text-sm font-bold text-slate-700">{asset.lastInventoryBy || '-'}</p>
                        </div>
                     </div>
                   </div>
                   
                   <div className="p-6 border border-slate-100 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                         <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch sử kiểm kê</h5>
                         <button onClick={() => onAction('inventory', asset.id)} className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline flex items-center">
                            <Plus className="mr-1 h-3 w-3" /> Thực hiện kiểm kê
                         </button>
                      </div>
                      {asset.inventoryHistory?.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {asset.inventoryHistory.map((entry: any) => (
                            <div key={entry.id} className="py-3 grid grid-cols-[1fr_auto] gap-4 items-center">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{entry.inventoryName || entry.inventoryCode || 'Kiểm kê tài sản'}</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                  {entry.checkedBy || 'Không rõ người kiểm kê'}
                                  {entry.note ? ` · ${entry.note}` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] font-black uppercase text-emerald-600">{getInventoryResultLabel(entry.result)}</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                  {entry.checkedAt ? format(new Date(entry.checkedAt), 'dd/MM/yyyy HH:mm') : '-'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400 italic text-xs font-medium">Chưa có dữ liệu kiểm kê trước đó.</div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'repair' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   {/* CURRENT STATUS CARD */}
                   {currentOpenTicket ? (
                      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start space-x-5">
                         <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                            <Wrench className="h-6 w-6" />
                         </div>
                         <div className="flex-1 space-y-3">
                            <div>
                               <div className="flex items-center justify-between">
                                  <h4 className="text-base font-black text-slate-900">Đang sửa chữa</h4>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-white px-2 py-0.5 rounded-lg border border-amber-100">
                                     {currentOpenTicket.repairCode}
                                  </span>
                               </div>
                               <p className="text-xs font-medium text-slate-500 mt-0.5">Ngày ghi nhận: {format(new Date(currentOpenTicket.reportedDate), 'dd/MM/yyyy')}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-amber-100/50">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị sửa chữa</p>
                                  <p className="text-sm font-bold text-slate-700">{currentOpenTicket.repairVendor || 'Chưa xác định'}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dự kiến hoàn tất</p>
                                  <p className="text-sm font-bold text-slate-700">{currentOpenTicket.expectedFinishDate ? format(new Date(currentOpenTicket.expectedFinishDate), 'dd/MM/yyyy') : 'Chưa có'}</p>
                               </div>
                            </div>

                            <div className="flex space-x-3 pt-1">
                               <button 
                                  onClick={handleUpdateProgress}
                                  className="flex-1 h-10 bg-white border border-amber-200 text-amber-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
                               >
                                  Cập nhật tiến độ
                               </button>
                               <button 
                                  onClick={() => { setSelectedTicket(currentOpenTicket); setIsCompleteRepairOpen(true); }}
                                  className="flex-1 h-10 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-md shadow-amber-200"
                               >
                                  Hoàn tất sửa chữa
                               </button>
                            </div>
                         </div>
                      </div>
                   ) : asset.status === 'DAMAGED' ? (
                      <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-center space-x-5">
                         <div className="bg-rose-100 p-3 rounded-2xl text-rose-600">
                            <AlertCircle className="h-6 w-6" />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Hỏng không sửa được</h4>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">Tài sản cần được chuyển sang quy trình thanh lý hoặc hủy bỏ.</p>
                            <div className="flex space-x-3 mt-4">
                               <button onClick={() => onAction('liquidate', asset.id)} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all">Chuyển thanh lý</button>
                               <button onClick={() => onAction('scrap', asset.id)} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all">Chuyển hủy</button>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                         <div className="flex items-center space-x-4">
                            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                               <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                               <h4 className="text-base font-black text-slate-900">Vận hành bình thường</h4>
                               <p className="text-xs font-medium text-slate-500">Tài sản hiện tại không ghi nhận sự cố hỏng hóc nào.</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setIsRepairFormOpen(true)}
                            className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                         >
                            Báo hỏng / Sửa chữa
                         </button>
                      </div>
                   )}

                   {/* REPAIR HISTORY LIST */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center">
                         <History className="mr-2 h-3 w-3" /> Nhật ký sự cố & sửa chữa
                      </h5>
                      {asset.repairTickets?.length > 0 ? (
                        <div className="space-y-3">
                           {asset.repairTickets.map((ticket: any) => (
                             <div key={ticket.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-primary-100 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                   <div>
                                      <p className="text-xs font-black text-slate-800">{ticket.repairCode}</p>
                                      <p className="text-[10px] font-bold text-slate-400">{format(new Date(ticket.reportedDate), 'dd/MM/yyyy')}</p>
                                   </div>
                                   <span className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                                      ticket.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                      ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      "bg-slate-50 text-slate-500 border-slate-100"
                                   )}>
                                      {ticket.status}
                                   </span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100/50 italic mb-3">
                                   "{ticket.damageDescription}"
                                </p>
                                {ticket.result && (
                                   <div className="flex items-center text-[11px] font-bold text-slate-500">
                                      <div className="w-1 h-1 bg-slate-300 rounded-full mr-2"></div>
                                      Kết quả: <span className="text-slate-800 ml-1">{ticket.result}</span>
                                      {ticket.actualCost > 0 && <span className="ml-auto text-primary-600">{ticket.actualCost.toLocaleString()}đ</span>}
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 italic text-xs font-medium">Không có lịch sử sửa chữa.</div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative pl-6 space-y-10 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100">
                    {asset.auditLogs?.map((log: any) => (
                      <div key={log.id} className="relative">
                        <div className={cn(
                          "absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-slate-50",
                          log.action === 'CREATE' ? 'bg-emerald-500' :
                          log.action === 'UPDATE' ? 'bg-amber-500' :
                          'bg-primary-500'
                        )} />
                        <div>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{format(new Date(log.createdAt), 'HH:mm • dd/MM/yyyy')}</p>
                          <p className="text-sm font-bold text-slate-800 leading-snug">
                            {log.performedBy} <span className="text-slate-400 font-medium">đã {
                              log.action === 'CREATE' ? 'khởi tạo' : 
                              log.action === 'UPDATE' ? 'cập nhật' :
                              log.action === 'ASSIGN' ? 'bàn giao' : log.action.toLowerCase()
                            }</span> tài sản
                          </p>
                          {log.details && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                               {(() => {
                                  try {
                                    const details = JSON.parse(log.details);
                                    if (!details) return null;
                                    const changes = details.changes || details;
                                    return (
                                      <>
                                        {Object.entries(changes).map(([field, val]: any) => (
                                          <div key={field} className="text-[11px] font-bold">
                                            <span className="text-slate-400 uppercase mr-2">{field}:</span>
                                            <span className="text-rose-500 line-through mr-2">{String(val.old)}</span>
                                            <ArrowRightLeft className="h-2 w-2 inline mx-1 text-slate-300" />
                                            <span className="text-emerald-600 ml-2">{String(val.new)}</span>
                                          </div>
                                        ))}
                                        {details.reason && (
                                          <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic">
                                            Lý do: {details.reason}
                                          </div>
                                        )}
                                      </>
                                    );
                                  } catch (e) {
                                    return <p className="text-[10px] text-slate-400 italic">Chi tiết: {log.details}</p>;
                                  }
                               })()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!asset.auditLogs?.length && (
                      <div className="text-center py-10 text-slate-400 italic text-xs font-medium">Chưa có nhật ký hoạt động.</div>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'documents' && (
                <AssetDocumentsTab 
                  asset={asset} 
                  onRefresh={fetchAssetDetail}
                  onSelectForm={(formCode, data) => setSelectedForm({ code: formCode, data })}
                />
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="px-8 py-8 border-t border-slate-100 bg-slate-50/50 flex flex-col space-y-4">
              {mode === 'edit' && (
                <label className="flex items-center space-x-3 cursor-pointer select-none py-3.5 bg-primary-50/40 rounded-2xl px-5 border border-primary-100/50 animate-in slide-in-from-bottom-2 duration-200">
                  <input 
                    type="checkbox" 
                    checked={updateAllSameName}
                    onChange={(e) => setUpdateAllSameName(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Áp dụng đồng loạt cho tài sản cùng tên</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Cập nhật tất cả tài sản có cùng tên "{asset.assetName}"</span>
                  </div>
                </label>
              )}
              <div className="flex space-x-3 items-center w-full">
                {mode === 'edit' ? (
                  <>
                    <button 
                      onClick={cancelEdit}
                      className="flex-1 bg-white border border-slate-200 text-slate-400 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all shadow-sm"
                    >
                      Hủy chỉnh sửa
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-[2] bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Lưu thay đổi</>}
                    </button>
                  </>
                ) : activeTab === 'documents' ? (
                <>
                   <button 
                    onClick={onClose}
                    className="flex-1 bg-white border border-slate-200 text-slate-400 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all shadow-sm"
                  >
                    Đóng
                  </button>
                  <button 
                    onClick={() => document.getElementById('asset-file-upload')?.click()}
                    className="flex-1 bg-slate-100 text-slate-600 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center shadow-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Tải file lên
                  </button>
                  <div className="relative flex-[1.5]">
                    <button 
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className="w-full bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center"
                    >
                      <FilePlus className="mr-2 h-4 w-4" /> Tạo hồ sơ mới <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showMoreActions && "rotate-180")} />
                    </button>
                    
                    {showMoreActions && (
                      <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in zoom-in slide-in-from-bottom-4 duration-200">
                        <div className="p-2 space-y-1">
                          {[
                            { code: 'BM01', label: 'Biên bản bàn giao mới' },
                            { code: 'BM02', label: 'Biên bản bàn giao/thu hồi' },
                            { code: 'BM06', label: 'Biên bản điều chuyển' },
                            { code: 'BM09', label: 'Kiểm tra hiện trạng' },
                            { code: 'BM03', label: 'Biên bản tài sản hỏng' },
                            { code: 'BM10', label: 'Biên bản sửa chữa' },
                            { code: 'BM12', label: 'Biên bản kiểm kê' },
                            { code: 'BM04', label: 'Biên bản thanh lý' },
                            { code: 'BM13', label: 'Ghi nhận mất tài sản' },
                          ].map((form) => (
                            <button
                              key={form.code}
                              onClick={() => { 
                                 setSelectedForm({ code: form.code });
                                 setShowMoreActions(false); 
                              }}
                              className="w-full flex items-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary-600 rounded-2xl transition-all"
                            >
                              <FileText className="mr-3 h-4 w-4 text-slate-400" />
                              {form.code} - {form.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {asset.status === 'RETIRED' || asset.status === 'DAMAGED' ? (
                    hasPermission('TRANSFER_CREATE') && (
                      <button 
                        onClick={() => onAction('revoke', asset.id)}
                        className="flex-1 bg-indigo-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {asset.status === 'DAMAGED' ? 'Thu hồi tài sản hỏng về Hà Nội' : 'Thu hồi về kho'}
                      </button>
                    )
                  ) : (
                    hasPermission('TRANSFER_CREATE') && (
                      <button 
                        onClick={() => onAction('handover', asset.id)}
                        className="flex-1 bg-primary-600 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center"
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Bàn giao / Điều chuyển
                      </button>
                    )
                  )}
                  <button 
                    onClick={() => onAction('inventory', asset.id)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4 text-emerald-500" /> Thực hiện kiểm kê
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className="bg-white border border-slate-200 text-slate-400 h-14 w-14 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showMoreActions && "rotate-180")} />
                    </button>
                    
                    {showMoreActions && (
                      <div className="absolute bottom-full right-0 mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in zoom-in slide-in-from-bottom-4 duration-200">
                        <div className="p-2 space-y-1">
                          {[
                            ...(asset.status === 'ASSIGNED' && hasPermission('TRANSFER_CREATE') ? [{ id: 'revoke', label: 'Thu hồi về kho', icon: RotateCcw, color: 'text-indigo-600' }] : []),
                            { id: 'lost', label: 'Báo mất tài sản', icon: ShieldAlert, color: 'text-slate-900', onClick: () => setSelectedForm({ code: 'BM13' }) },
                            { id: 'liquidate', label: 'Thanh lý tài sản', icon: Trash2, color: 'text-rose-600', onClick: () => setSelectedForm({ code: 'BM04' }) },
                          ].map((act) => (
                            <button
                              key={act.id}
                              onClick={() => { 
                                 if (act.onClick) act.onClick();
                                 else onAction(act.id, asset.id); 
                                 setShowMoreActions(false); 
                              }}
                              className="w-full flex items-center px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all"
                            >
                              <act.icon className={cn("mr-3 h-4 w-4", act.color)} />
                              {act.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-slate-400 italic">Không tìm thấy tài sản.</div>
        )}
      </div>

      {/* REPAIR FORMS */}
      {isRepairFormOpen && (
        <RepairTicketForm 
          asset={asset}
          onClose={() => setIsRepairFormOpen(false)}
          onSuccess={() => { setIsRepairFormOpen(false); fetchAssetDetail(); }}
        />
      )}

      {isCompleteRepairOpen && selectedTicket && (
        <CompleteRepairForm 
          ticket={selectedTicket}
          onClose={() => setIsCompleteRepairOpen(false)}
          onSuccess={() => { setIsCompleteRepairOpen(false); setSelectedTicket(null); fetchAssetDetail(); }}
        />
      )}

      {/* ASSIGNMENT QUICK VIEW */}
      {showAssignInfoModal && asset && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { cancelAssignInfoEditor(); setShowAssignInfoModal(false); }} />
          <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="px-7 py-6 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Thông tin cấp phát</p>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Người dùng / khu vực sử dụng</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">{asset.assetCode} • {asset.assetName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission('ASSET_UPDATE') && !isAssignInfoEditing && (
                  <button
                    type="button"
                    onClick={openAssignInfoEditor}
                    className="h-10 px-4 rounded-2xl border border-primary-100 bg-primary-50 text-primary-650 hover:bg-primary-100 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Edit3 className="h-4 w-4" /> Chỉnh sửa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { cancelAssignInfoEditor(); setShowAssignInfoModal(false); }}
                  className="h-10 w-10 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-7 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Phân bổ tài sản hiện tại</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                    Hiện tại
                  </span>
                </div>
                {isAssignInfoEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Loại người nhận tài sản">
                      {[
                        { value: 'PERSON' as const, label: 'Cá nhân', icon: User },
                        { value: 'AREA' as const, label: 'Khu vực / vị trí', icon: MapPin }
                      ].map((option) => {
                        const OptionIcon = option.icon;
                        const active = assignRecipientType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAssignRecipientType(option.value)}
                            aria-pressed={active}
                            className={cn(
                              "h-10 rounded-lg inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-colors",
                              active ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            <OptionIcon className="h-4 w-4" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    {assignRecipientType === 'PERSON' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'currentUserName', label: 'Họ tên người nhận *', icon: User },
                          { key: 'currentPosition', label: 'Chức vụ', icon: Tag },
                          { key: 'currentUserPhone', label: 'Số điện thoại', icon: Info },
                          { key: 'departmentName', label: 'Phòng ban', icon: Building2 }
                        ].map(({ key, label, icon: Icon }) => (
                          <div key={key} className={cn(
                            "p-4 rounded-2xl bg-slate-50 border border-slate-100",
                            key === 'currentUserName' && "relative z-30"
                          )}>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center mb-1.5">
                              <Icon className="mr-2 h-3.5 w-3.5" />
                              {label}
                            </label>
                            <div className="relative">
                              <input
                                id={`asset-assignment-${key}`}
                                name={key}
                                type={key === 'currentUserPhone' ? 'tel' : 'text'}
                                autoComplete={key === 'currentUserName' ? 'off' : undefined}
                                value={assignInfoForm[key] || ''}
                                onFocus={() => key === 'currentUserName' && setAssignPersonDropdownOpen(true)}
                                onBlur={() => key === 'currentUserName' && window.setTimeout(() => setAssignPersonDropdownOpen(false), 150)}
                                onChange={(e) => {
                                  setAssignInfoForm({ ...assignInfoForm, [key]: e.target.value });
                                  if (key === 'currentUserName') {
                                    setSelectedAssignPersonKey('');
                                    setAssignPersonDropdownOpen(true);
                                  }
                                }}
                                className={cn(
                                  "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50",
                                  key === 'currentUserName' && "pr-9"
                                )}
                              />
                              {key === 'currentUserName' && (
                                <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                              )}
                              {key === 'currentUserName' && assignPersonDropdownOpen && assignInfoForm.currentUserName.trim() && (
                                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[120] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl md:right-auto md:w-[calc(200%+0.75rem)]">
                                  {assignPersonLoading ? (
                                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs font-bold text-slate-500">
                                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm trong Big Data...
                                    </div>
                                  ) : assignPersonOptions.length > 0 ? assignPersonOptions.map((person) => (
                                    <button
                                      key={person.key}
                                      type="button"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        handleSelectAssignPerson(person);
                                      }}
                                      className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-50"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-sm font-black text-slate-900">{person.fullName}</span>
                                            {person.duplicateName && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">Trùng tên</span>}
                                          </div>
                                          <p className="mt-0.5 text-[11px] font-semibold text-slate-600">{getBigDataPersonIdentity(person)}</p>
                                          {getBigDataPersonLocation(person) && <p className="mt-0.5 truncate text-[10px] text-slate-400">{getBigDataPersonLocation(person)}</p>}
                                        </div>
                                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-1 text-[9px] font-black uppercase text-slate-500">{getBigDataPersonSourceLabel(person.source)}</span>
                                      </div>
                                    </button>
                                  )) : (
                                    <div className="px-4 py-5 text-center text-xs font-bold text-slate-400">Không tìm thấy người dùng trong Big Data</div>
                                  )}
                                </div>
                              )}
                            </div>
                            {key === 'currentUserName' && selectedAssignPersonKey && (
                              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600"><Check className="h-3 w-3" /> Đã chọn từ Big Data</p>
                            )}
                            {key === 'currentUserName' && !selectedAssignPersonKey && assignExactNameMatches.length > 1 && (
                              <p className="mt-1.5 flex items-start gap-1 text-[10px] font-bold text-amber-700"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> Có {assignExactNameMatches.length} người trùng tên. Hãy chọn đúng SĐT/phòng ban.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-primary-50/50 border border-primary-100">
                          <label htmlFor="asset-assignment-area" className="text-[10px] font-black uppercase tracking-widest text-primary-700 flex items-center mb-1.5">
                            <MapPin className="mr-2 h-3.5 w-3.5" />
                            Tên khu vực / nơi đặt tài sản *
                          </label>
                          <input
                            id="asset-assignment-area"
                            name="assignedAreaName"
                            type="text"
                            value={assignInfoForm.assignedAreaName || ''}
                            onChange={(e) => setAssignInfoForm({ ...assignInfoForm, assignedAreaName: e.target.value })}
                            placeholder="VD: Sảnh khánh tiết, Bể bơi Danko City"
                            className="w-full bg-white border border-primary-150 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50"
                          />
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <label htmlFor="asset-assignment-departmentName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center mb-1.5">
                            <Building2 className="mr-2 h-3.5 w-3.5" />
                            Phòng ban quản lý
                          </label>
                          <input
                            id="asset-assignment-departmentName"
                            name="departmentName"
                            type="text"
                            value={assignInfoForm.departmentName || ''}
                            onChange={(e) => setAssignInfoForm({ ...assignInfoForm, departmentName: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50"
                          />
                        </div>
                      </div>
                    )}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center">
                        <MapPin className="mr-2 h-3.5 w-3.5" /> Vị trí hiện tại
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label htmlFor="asset-assignment-city" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thành phố *</label>
                          <select
                            id="asset-assignment-city"
                            name="cityName"
                            value={assignLocationSelection.city}
                            onChange={(e) => {
                              setAssignLocationSelection({
                                city: e.target.value,
                                project: '',
                                location: '',
                                path: [],
                                customCity: '',
                                customProject: '',
                                customLocation: ''
                              });
                              setAssignAddingLocationDepth(null);
                              setAssignNewLocationNodeName('');
                            }}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                          >
                            <option value="">-- Chọn thành phố --</option>
                            {Object.keys(LOCATION_HIERARCHY).map((city) => <option key={city} value={city}>{city}</option>)}
                            <option value="Khác">Khác</option>
                          </select>
                        </div>

                        {assignLocationSelection.city === 'Khác' && (
                          <div className="space-y-1.5">
                            <label htmlFor="asset-assignment-custom-city" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Thành phố khác *</label>
                            <input
                              id="asset-assignment-custom-city"
                              name="customCity"
                              value={assignLocationSelection.customCity}
                              onChange={(e) => setAssignLocationSelection((prev) => ({ ...prev, customCity: e.target.value }))}
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                            />
                          </div>
                        )}

                        {assignLocationSelection.city && (
                          <div className="space-y-1.5">
                            <label htmlFor="asset-assignment-project" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dự án *</label>
                            <select
                              id="asset-assignment-project"
                              name="projectName"
                              value={assignLocationSelection.project}
                              onChange={(e) => {
                                setAssignLocationSelection((prev) => ({
                                  ...prev,
                                  project: e.target.value,
                                  location: '',
                                  path: [],
                                  customProject: '',
                                  customLocation: ''
                                }));
                                setAssignAddingLocationDepth(null);
                                setAssignNewLocationNodeName('');
                              }}
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                            >
                              <option value="">-- Chọn dự án --</option>
                              {assignLocationSelection.city !== 'Khác' && Object.keys(LOCATION_HIERARCHY[assignLocationSelection.city] || {}).map((project) => (
                                <option key={project} value={project}>{project}</option>
                              ))}
                              <option value="Khác">Khác</option>
                            </select>
                          </div>
                        )}

                        {assignLocationSelection.project === 'Khác' && (
                          <div className="space-y-1.5">
                            <label htmlFor="asset-assignment-custom-project" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dự án khác *</label>
                            <input
                              id="asset-assignment-custom-project"
                              name="customProject"
                              value={assignLocationSelection.customProject}
                              onChange={(e) => setAssignLocationSelection((prev) => ({ ...prev, customProject: e.target.value }))}
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                            />
                          </div>
                        )}
                      </div>

                      {assignLocationSelection.project && (
                        assignProjectLocationTree ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {assignProjectLocationLevels.map((options, depth) => {
                              const labels = PROJECT_LOCATION_LEVEL_LABELS;
                              return (
                                <div key={depth} className="space-y-1.5">
                                  <label htmlFor={`asset-assignment-location-${depth}`} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {labels[depth] || `Phân cấp ${depth + 1}`} *
                                  </label>
                                  <select
                                    id={`asset-assignment-location-${depth}`}
                                    name={`locationLevel${depth + 1}`}
                                    value={assignLocationSelection.path[depth] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === 'Khác') {
                                        setAssignLocationSelection((prev) => ({ ...prev, location: 'Khác', path: ['Khác'], customLocation: '' }));
                                        return;
                                      }
                                      const path = [...assignLocationSelection.path.slice(0, depth), value];
                                      setAssignLocationSelection((prev) => ({ ...prev, path, location: path.join(' / '), customLocation: '' }));
                                      if (assignAddingLocationDepth !== null && assignAddingLocationDepth > depth) {
                                        setAssignAddingLocationDepth(null);
                                        setAssignNewLocationNodeName('');
                                      }
                                    }}
                                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                                  >
                                    <option value="">-- Chọn {labels[depth]?.toLowerCase() || 'vị trí'} --</option>
                                    {options.map((location) => <option key={location} value={location}>{location}</option>)}
                                    {depth === 0 && <option value="Khác">Khác</option>}
                                  </select>
                                  {depth < PROJECT_LOCATION_LEVEL_LABELS.length && hasPermission('PERMISSION_MANAGE') && (
                                    <div className="pt-1">
                                      {assignAddingLocationDepth !== depth ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAssignAddingLocationDepth(depth);
                                            setAssignNewLocationNodeName('');
                                          }}
                                          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-700"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          Thêm {(labels[depth] || `phân cấp ${depth + 1}`).toLowerCase()}
                                        </button>
                                      ) : (
                                        <div className="space-y-2 border-l-2 border-primary-200 pl-3 pt-1">
                                          <label
                                            htmlFor={`new-asset-assignment-location-${depth}`}
                                            className="block text-[10px] font-black uppercase tracking-widest text-slate-500"
                                          >
                                            Tên {labels[depth]?.toLowerCase() || `phân cấp ${depth + 1}`} *
                                          </label>
                                          <input
                                            id={`new-asset-assignment-location-${depth}`}
                                            name={`newAssignmentLocationLevel${depth + 1}`}
                                            value={assignNewLocationNodeName}
                                            onChange={(e) => setAssignNewLocationNodeName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCreateAssignProjectLocation(depth);
                                              }
                                            }}
                                            placeholder={`Nhập tên ${labels[depth]?.toLowerCase() || `phân cấp ${depth + 1}`}`}
                                            maxLength={200}
                                            autoFocus
                                            className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-primary-500 outline-none"
                                          />
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleCreateAssignProjectLocation(depth)}
                                              disabled={isCreatingAssignLocationNode}
                                              className="h-8 px-3 rounded-lg bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 disabled:opacity-50"
                                            >
                                              {isCreatingAssignLocationNode ? 'Đang thêm...' : 'Thêm và chọn'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAssignAddingLocationDepth(null);
                                                setAssignNewLocationNodeName('');
                                              }}
                                              disabled={isCreatingAssignLocationNode}
                                              className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 disabled:opacity-50"
                                            >
                                              Hủy
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label htmlFor="asset-assignment-location" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vị trí chi tiết *</label>
                            <select
                              id="asset-assignment-location"
                              name="locationName"
                              value={assignLocationSelection.location}
                              onChange={(e) => setAssignLocationSelection((prev) => ({ ...prev, location: e.target.value, path: [], customLocation: '' }))}
                              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                            >
                              <option value="">-- Chọn vị trí --</option>
                              {assignLocationSelection.city !== 'Khác' && assignLocationSelection.project !== 'Khác'
                                && (LOCATION_HIERARCHY[assignLocationSelection.city]?.[assignLocationSelection.project] || []).map((location) => (
                                  <option key={location} value={location}>{location}</option>
                                ))}
                              <option value="Khác">Khác</option>
                            </select>
                          </div>
                        )
                      )}

                      {assignLocationSelection.location === 'Khác' && (
                        <div className="space-y-1.5">
                          <label htmlFor="asset-assignment-custom-location" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vị trí khác *</label>
                          <input
                            id="asset-assignment-custom-location"
                            name="customLocation"
                            value={assignLocationSelection.customLocation}
                            onChange={(e) => setAssignLocationSelection((prev) => ({ ...prev, customLocation: e.target.value }))}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-primary-500"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                      <label className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center mb-1.5">
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                        Ghi chú / lý do chỉnh sửa
                      </label>
                      <textarea
                        value={assignInfoForm.note || ''}
                        onChange={(e) => setAssignInfoForm({ ...assignInfoForm, note: e.target.value })}
                        placeholder="Ví dụ: Bổ sung số điện thoại người nhận theo biên bản bàn giao..."
                        rows={3}
                        className="w-full bg-white border border-amber-150 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelAssignInfoEditor}
                        className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAssignInfo}
                        disabled={isSaving}
                        className="px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu & ghi log
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow label={assigneeDisplay.isArea ? "Khu vực nhận" : "Họ tên người nhận"} value={assigneeDisplay.name} icon={assigneeDisplay.isArea ? MapPin : User} />
                    <InfoRow label={assigneeDisplay.isArea ? "Loại phân bổ" : "Chức vụ"} value={assigneeDisplay.isArea ? assigneeDisplay.detail : asset.currentPosition || latestAssignment?.newPosition || latestHandover?.recipientPosition} icon={Tag} />
                    <InfoRow label="Số điện thoại" value={currentAssignmentPhone} icon={Info} />
                    <InfoRow label="Phòng ban" value={asset.departmentName || latestAssignment?.newDepartmentName || latestHandover?.recipientDepartment} icon={Building2} />
                    <InfoRow label="Dự án" value={asset.projectName} icon={Building2} />
                    <InfoRow label="Vị trí hiện tại" value={formatCurrentLocation(asset)} icon={MapPin} />
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Thông tin người giao</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoRow label="Người giao / người sử dụng trước" value={latestAssignment?.previousUserName} icon={User} />
                  <InfoRow label="Ngày hiệu lực" value={latestAssignment?.effectiveAt ? format(new Date(latestAssignment.effectiveAt), 'dd/MM/yyyy') : null} icon={Calendar} />
                  <InfoRow label="Trạng thái sau bàn giao" value={latestAssignment?.newStatus || asset.status} icon={CheckCircle2} />
                  <InfoRow label="Ghi chú" value={latestAssignment?.note} icon={MessageSquare} />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* REASON MODAL */}
      {showReasonModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReasonModal(false)} />
           <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-3 text-rose-600 mb-6">
                 <AlertCircle className="h-6 w-6" />
                 <h4 className="text-lg font-black uppercase tracking-tight">Xác nhận thay đổi quan trọng</h4>
              </div>
              <p className="text-sm text-slate-600 font-medium mb-6">
                 Bạn đang thay đổi các thông tin quan trọng của tài sản (Mã, Giá, Ngày, Serial). Vui lòng nhập lý do cập nhật:
              </p>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ví dụ: Cập nhật đúng tên theo thực tế kiểm tra..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-medium text-slate-700 h-32 focus:ring-2 focus:ring-primary-500 mb-6"
              />
              <div className="flex space-x-3">
                 <button onClick={() => setShowReasonModal(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Hủy</button>
                 <button 
                   disabled={!reason.trim() || isSaving}
                   onClick={() => submitUpdates(pendingUpdates, reason)}
                   className="flex-[2] px-4 py-3 bg-primary-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all disabled:opacity-50"
                 >
                   Xác nhận lưu
                 </button>
              </div>
           </div>
        </div>
      )}
      <BMFormDispatcher 
        isOpen={!!selectedForm}
        formCode={selectedForm?.code || ''}
        data={{ asset, ...selectedForm?.data }}
        onClose={() => setSelectedForm(null)}
        onSubmit={async (data) => {
          console.log("Form submitted:", data);
          toast.success("Hồ sơ đã được lưu thành công");
          setSelectedForm(null);
          fetchAssetDetail();
          
          // Log audit
          await api.post('/operational/print-log', {
            assetIds: [asset.id],
            template: selectedForm?.code,
            copies: 1,
            config: { action: 'GENERATE_DOCUMENT' }
          });
        }}
      />

      {/* LINK INVOICE SUB-MODAL */}
      {showLinkInvoiceModal && asset && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLinkInvoiceModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 space-y-6">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary-500" />
                Liên kết hóa đơn với tài sản
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Chọn hóa đơn gốc hoặc hủy liên kết hiện tại</p>
            </div>
            
            <LinkInvoiceSelector 
              assetId={asset.id}
              currentInvoiceId={asset.invoiceBatchId}
              onCancel={() => setShowLinkInvoiceModal(false)}
              onCreated={() => {
                setShowLinkInvoiceModal(false);
                fetchAssetDetail();
                onAction?.('refresh', asset.id);
              }}
              onConfirm={async (invoiceId) => {
                try {
                  await api.put(`/assets/${asset.id}/link-invoice`, { invoiceBatchId: invoiceId });
                  toast.success(invoiceId ? "Liên kết hóa đơn thành công!" : "Hủy liên kết hóa đơn thành công!");
                  setShowLinkInvoiceModal(false);
                  fetchAssetDetail();
                  onAction?.('refresh', asset.id);
                } catch (err: any) {
                  toast.error(err.response?.data?.message || "Lỗi khi cập nhật liên kết hóa đơn.");
                }
              }}
            />
          </div>
        </div>
      )}

      {/* INVOICE DETAILS MODAL */}
      {showInvoiceDetailsModal && selectedInvoiceId && (
        <InvoiceDetailsModal
          invoiceId={selectedInvoiceId}
          onClose={() => {
            setShowInvoiceDetailsModal(false);
            setSelectedInvoiceId(null);
            fetchAssetDetail();
          }}
          hasPermission={hasPermission}
          onViewAsset={(assetId) => {
            setShowInvoiceDetailsModal(false);
            onAction?.('view', assetId);
          }}
        />
      )}
    </BaseModal>
  );
};

// ================= LINK INVOICE SELECTOR COMPONENT =================
interface LinkInvoiceSelectorProps {
  assetId: number;
  currentInvoiceId: number | null;
  onCancel: () => void;
  onConfirm: (invoiceId: number | null) => void;
  onCreated: () => void;
}

const LinkInvoiceSelector: React.FC<LinkInvoiceSelectorProps> = ({ assetId, currentInvoiceId, onCancel, onConfirm, onCreated }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(currentInvoiceId);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNo: '', invoiceDate: new Date().toISOString().slice(0, 10), supplierName: '',
    supplierTaxCode: '', totalAmount: '', note: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [search]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets/invoices', { params: { search } });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!invoiceForm.invoiceNo.trim() || !invoiceForm.invoiceDate || !invoiceForm.supplierName.trim()) {
      return toast.error('Vui lòng nhập số hóa đơn, ngày hóa đơn và nhà cung cấp.');
    }
    try {
      setSaving(true);
      await api.post('/assets/invoices', { assetId, ...invoiceForm });
      toast.success('Đã thêm và liên kết hóa đơn với tài sản.');
      onCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể thêm hóa đơn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{creating ? 'Thông tin hóa đơn mới' : 'Tìm kiếm hóa đơn'}</div>
        <button type="button" onClick={() => setCreating((value) => !value)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-200 px-3 text-[10px] font-black uppercase text-primary-700 hover:bg-primary-50">
          {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{creating ? 'Chọn hóa đơn có sẵn' : 'Thêm hóa đơn'}
        </button>
      </div>

      {creating ? <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-[10px] font-black uppercase text-slate-400"><span>Số hóa đơn *</span><input id="new-invoice-no" name="invoiceNo" value={invoiceForm.invoiceNo} onChange={(event) => setInvoiceForm({ ...invoiceForm, invoiceNo: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-800" /></label>
        <label className="space-y-1 text-[10px] font-black uppercase text-slate-400"><span>Ngày hóa đơn *</span><input id="new-invoice-date" name="invoiceDate" type="date" value={invoiceForm.invoiceDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, invoiceDate: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800" /></label>
        <label className="col-span-2 space-y-1 text-[10px] font-black uppercase text-slate-400"><span>Nhà cung cấp *</span><input id="new-invoice-supplier" name="supplierName" value={invoiceForm.supplierName} onChange={(event) => setInvoiceForm({ ...invoiceForm, supplierName: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-800" /></label>
        <label className="space-y-1 text-[10px] font-black uppercase text-slate-400"><span>MST nhà cung cấp</span><input id="new-invoice-tax-code" name="supplierTaxCode" value={invoiceForm.supplierTaxCode} onChange={(event) => setInvoiceForm({ ...invoiceForm, supplierTaxCode: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold normal-case text-slate-800" /></label>
        <label className="space-y-1 text-[10px] font-black uppercase text-slate-400"><span>Tổng tiền</span><input id="new-invoice-total" name="totalAmount" type="number" min="0" value={invoiceForm.totalAmount} onChange={(event) => setInvoiceForm({ ...invoiceForm, totalAmount: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-800" /></label>
        <label className="col-span-2 space-y-1 text-[10px] font-black uppercase text-slate-400"><span>Ghi chú</span><textarea id="new-invoice-note" name="note" rows={2} value={invoiceForm.note} onChange={(event) => setInvoiceForm({ ...invoiceForm, note: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold normal-case text-slate-800" /></label>
      </div> : <><div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tìm kiếm hóa đơn</label>
        <input
          id="invoice-search"
          name="invoiceSearch"
          type="text"
          placeholder="Nhập số hóa đơn hoặc tên nhà cung cấp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-primary-500 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-750 transition-all"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chọn hóa đơn từ danh sách ({invoices.length})</label>
        <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 bg-slate-50/20 custom-scrollbar">
          {invoices.map((inv) => {
            const isSelected = selectedId === inv.id;
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedId(inv.id)}
                className={`w-full text-left px-4 py-3 flex items-start justify-between text-xs transition-colors hover:bg-slate-50 ${isSelected ? 'bg-primary-50/40 text-primary-750' : 'text-slate-600'}`}
              >
                <div className="space-y-0.5">
                  <p className="font-black text-slate-805 text-slate-800">Số HĐ: {inv.invoiceNo}</p>
                  <p className="text-[10px] font-bold text-slate-400">{inv.supplierName} • {format(new Date(inv.invoiceDate), 'dd/MM/yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">{inv.totalAmount?.toLocaleString()} ₫</p>
                  {isSelected && <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest mt-0.5 block">Đã chọn</span>}
                </div>
              </button>
            );
          })}
          {invoices.length === 0 && !loading && (
            <p className="text-center py-6 text-slate-400 italic text-xs font-bold">Không tìm thấy hóa đơn nào.</p>
          )}
          {loading && (
            <p className="text-center py-6 text-slate-400 italic text-xs font-bold">Đang tải...</p>
          )}
        </div>
      </div></>}

      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          Hủy
        </button>
        {!creating && currentInvoiceId && (
          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="flex-1 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            Hủy liên kết
          </button>
        )}
        <button
          type="button"
          disabled={creating ? saving : !selectedId}
          onClick={() => creating ? void createInvoice() : onConfirm(selectedId)}
          className="flex-[2] px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all shadow-md shadow-primary-100"
        >
          {creating ? saving ? 'Đang lưu...' : 'Thêm & liên kết' : 'Liên kết'}
        </button>
      </div>
    </div>
  );
};

// ================= INVOICE DETAILS MODAL COMPONENT =================
interface InvoiceDetailsModalProps {
  invoiceId: number;
  onClose: () => void;
  hasPermission: (perm: string) => boolean;
  onViewAsset: (id: number) => void;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({ invoiceId, onClose, hasPermission, onViewAsset }) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    invoiceNo: '',
    invoiceDate: '',
    supplierName: '',
    supplierTaxCode: '',
    totalAmount: '',
    totalAssets: '',
    note: ''
  });
  const [saving, setSaving] = useState(false);
  const [addQuantityAsset, setAddQuantityAsset] = useState<any>(null);
  const [addQtyForm, setAddQtyForm] = useState({ quantity: 1, serials: '' });
  const [addingQty, setAddingQty] = useState(false);
  const [quickAssetCodes, setQuickAssetCodes] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);

  const startAddQuantity = (ast: any) => {
    setAddQtyForm({ quantity: 1, serials: '' });
    setAddQuantityAsset(ast);
  };

  const handleAddQuantitySubmit = async () => {
    if (addQtyForm.quantity <= 0) {
      toast.error("Số lượng bổ sung phải lớn hơn 0!");
      return;
    }
    setAddingQty(true);
    try {
      const serials = addQtyForm.serials
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(Boolean);

      await api.post(`/assets/invoices/${invoiceId}/add-assets`, {
        templateAssetId: addQuantityAsset.id,
        quantity: addQtyForm.quantity,
        serials
      });

      toast.success(`Đã bổ sung ${addQtyForm.quantity} tài sản thành công!`);
      setAddQuantityAsset(null);
      setAddQtyForm({ quantity: 1, serials: '' });
      fetchInvoiceDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi bổ sung số lượng tài sản");
    } finally {
      setAddingQty(false);
    }
  };

  const handleRemoveAsset = async (ast: any) => {
    if (ast.status !== 'IN_STOCK') {
      toast.error(`Không thể xóa tài sản này vì trạng thái hiện tại là "${ast.status}". Chỉ được phép xóa tài sản ở trạng thái "Trong kho".`);
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài sản ${ast.assetCode} khỏi hóa đơn? Hành động này sẽ xóa tài sản khỏi hệ thống và không thể hoàn tác.`)) {
      return;
    }

    try {
      await api.delete(`/assets/invoices/${invoiceId}/assets/${ast.id}`);
      toast.success(`Đã xóa tài sản ${ast.assetCode} thành công!`);
      fetchInvoiceDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa tài sản khỏi hóa đơn");
    }
  };

  const handleQuickAddAssets = async () => {
    if (!quickAssetCodes.trim()) return toast.error('Vui lòng nhập mã tài sản.');
    try {
      setQuickAdding(true);
      const response = await api.post(`/assets/invoices/${invoiceId}/link-assets-by-code`, { assetCodes: quickAssetCodes });
      const result = response.data;
      if (result.linked?.length) toast.success(`Đã liên kết ${result.linked.length} tài sản vào hóa đơn.`);
      const warnings = [
        result.missing?.length ? `Không tìm thấy: ${result.missing.join(', ')}` : '',
        result.alreadyLinked?.length ? `Đã có trong hóa đơn: ${result.alreadyLinked.join(', ')}` : '',
        result.otherInvoice?.length ? `Đang thuộc hóa đơn khác: ${result.otherInvoice.join(', ')}` : '',
        result.otherCompany?.length ? `Khác công ty: ${result.otherCompany.join(', ')}` : ''
      ].filter(Boolean);
      if (warnings.length) toast.warning(warnings.join(' | '));
      if (result.linked?.length) {
        setQuickAssetCodes('');
        fetchInvoiceDetails();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể thêm nhanh tài sản.');
    } finally {
      setQuickAdding(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/assets/invoices/${invoiceId}`);
      setInvoice(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải chi tiết hóa đơn.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      invoiceNo: invoice?.invoiceNo || '',
      invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate).toISOString().slice(0, 10) : '',
      supplierName: invoice?.supplierName || '',
      supplierTaxCode: invoice?.supplierTaxCode || '',
      totalAmount: invoice?.totalAmount?.toString() || '0',
      totalAssets: invoice?.totalAssets?.toString() || '0',
      note: invoice?.note || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.invoiceNo || !editForm.supplierName) {
      toast.error("Vui lòng nhập đầy đủ Số hóa đơn và Tên nhà cung cấp!");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/assets/invoices/${invoiceId}`, {
        invoiceNo: editForm.invoiceNo,
        invoiceDate: editForm.invoiceDate,
        supplierName: editForm.supplierName,
        supplierTaxCode: editForm.supplierTaxCode,
        totalAmount: parseFloat(editForm.totalAmount),
        totalAssets: parseInt(editForm.totalAssets),
        note: editForm.note
      });
      toast.success("Cập nhật thông tin hóa đơn thành công!");
      setIsEditing(false);
      fetchInvoiceDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu thông tin hóa đơn");
    } finally {
      setSaving(false);
    }
  };

  const linkedAssets = Array.isArray(invoice?.assets) ? invoice.assets : [];
  const assetsExVatTotal = linkedAssets.reduce((sum: number, assetItem: any) => sum + (Number(assetItem.purchasePriceExVat) || 0), 0);
  const invoiceExVatTotal = isEditing ? (Number(editForm.totalAmount) || 0) : (Number(invoice?.totalAmount) || 0);
  const exVatDifference = assetsExVatTotal - invoiceExVatTotal;
  const assetsWithoutPrice = linkedAssets.filter((assetItem: any) => assetItem.purchasePriceExVat === null || assetItem.purchasePriceExVat === undefined).length;
  const formatCurrency = (value: number) => `${Math.abs(value).toLocaleString('vi-VN')} ₫`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-205 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Chi tiết hóa đơn gốc</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Số hóa đơn: {invoice?.invoiceNo || 'Đang tải...'}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && invoice && hasPermission('ASSET_UPDATE') && !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                Chỉnh sửa
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang tải dữ liệu hóa đơn...</p>
          </div>
        ) : invoice ? (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            
            {/* Meta Card */}
            {isEditing ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-primary-650 border-b pb-2">
                  ✏️ Chỉnh sửa thông tin hóa đơn
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-650">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Số hóa đơn *</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.invoiceNo}
                      onChange={e => setEditForm({ ...editForm, invoiceNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Ngày hóa đơn *</label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.invoiceDate}
                      onChange={e => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Nhà cung cấp *</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.supplierName}
                      onChange={e => setEditForm({ ...editForm, supplierName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Mã số thuế NCC</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.supplierTaxCode}
                      onChange={e => setEditForm({ ...editForm, supplierTaxCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Tổng giá trị (ex VAT)</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.totalAmount}
                      onChange={e => setEditForm({ ...editForm, totalAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Tổng số lượng tài sản</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      value={editForm.totalAssets}
                      onChange={e => setEditForm({ ...editForm, totalAssets: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Ghi chú hóa đơn</label>
                    <textarea
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500 resize-none font-medium"
                      value={editForm.note}
                      onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-4 flex justify-end gap-2 text-xs font-black pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSave}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Lưu
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-505 hover:bg-slate-50 rounded-xl uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Ngày mua / Ngày hóa đơn</span>
                  <span className="text-slate-800 font-bold text-sm">
                    {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd/MM/yyyy') : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Mã số thuế NCC</span>
                  <span className="text-slate-800 font-bold text-sm">{formatAssetDisplayValue(invoice.supplierTaxCode)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Nhà cung cấp</span>
                  <span className="text-slate-800 font-bold text-sm block truncate" title={formatAssetDisplayValue(invoice.supplierName)}>{formatAssetDisplayValue(invoice.supplierName)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Tổng giá trị (trước VAT)</span>
                  <span className="text-slate-800 font-bold text-sm text-primary-650 block">
                    {hasPermission('ASSET_VIEW_PRICE') && invoice.totalAmount !== null
                      ? `${invoice.totalAmount.toLocaleString()} ₫`
                      : '*****'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Tổng số lượng tài sản</span>
                  <span className="text-slate-800 font-bold text-sm block">{invoice.totalAssets || 0} cái</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Tệp hóa đơn gốc</span>
                  {invoice.fileUrl ? (
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const url = invoice.fileUrl.startsWith('http') ? invoice.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${invoice.fileUrl}`;
                          window.open(url, '_blank');
                        }}
                        className="text-primary-600 hover:underline font-black text-[10px] uppercase tracking-wider flex items-center bg-white border border-slate-205 px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Xem file
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = invoice.fileUrl.startsWith('http') ? invoice.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${invoice.fileUrl}`;
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', invoice.fileUrl.split('/').pop() || 'invoice');
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-slate-600 hover:text-slate-900 font-black text-[10px] uppercase tracking-wider flex items-center bg-white border border-slate-205 px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                      >
                        <Download className="h-3 w-3 mr-1" /> Tải về
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic font-bold">Chưa đính kèm tệp tin</span>
                  )}
                </div>
                <div className="col-span-2 md:col-span-4 border-t border-slate-100 pt-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Ghi chú hóa đơn</span>
                  <span className="text-slate-800 font-bold text-sm block leading-relaxed">{invoice.note || 'Không có ghi chú.'}</span>
                </div>
              </div>
            )}

            {/* Assets list */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Danh sách tài sản hình thành từ hóa đơn</h4>
                {hasPermission('ASSET_UPDATE') && <div className="flex w-full max-w-xl gap-2">
                  <input id="quick-invoice-asset-codes" name="quickInvoiceAssetCodes" value={quickAssetCodes} onChange={(event) => setQuickAssetCodes(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleQuickAddAssets(); }} placeholder="Nhập hoặc dán mã tài sản..." className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 font-mono text-xs outline-none focus:border-primary-500" />
                  <button type="button" disabled={quickAdding || !quickAssetCodes.trim()} onClick={() => void handleQuickAddAssets()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 text-[10px] font-black uppercase text-white hover:bg-primary-700 disabled:opacity-50">
                    {quickAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Thêm nhanh
                  </button>
                </div>}
              </div>
              {hasPermission('ASSET_VIEW_PRICE') && <div className="grid grid-cols-1 border border-slate-200 bg-slate-200 sm:grid-cols-3">
                <div className="bg-white px-4 py-3"><p className="text-[10px] font-black uppercase text-slate-400">Tổng giá trị tài sản (ex VAT)</p><p className="mt-1 text-base font-black text-slate-900">{formatCurrency(assetsExVatTotal)}</p>{assetsWithoutPrice > 0 && <p className="mt-0.5 text-[10px] font-bold text-amber-600">{assetsWithoutPrice} tài sản chưa có giá</p>}</div>
                <div className="bg-white px-4 py-3"><p className="text-[10px] font-black uppercase text-slate-400">Tổng hóa đơn (trước VAT)</p><p className="mt-1 text-base font-black text-slate-900">{formatCurrency(invoiceExVatTotal)}</p></div>
                <div className="bg-white px-4 py-3"><p className="text-[10px] font-black uppercase text-slate-400">Chênh lệch</p><p className={`mt-1 text-base font-black ${exVatDifference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{exVatDifference > 0 ? '+' : exVatDifference < 0 ? '-' : ''}{formatCurrency(exVatDifference)}</p><p className={`mt-0.5 text-[10px] font-bold ${exVatDifference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{exVatDifference === 0 ? 'Khớp giá trị hóa đơn' : exVatDifference > 0 ? 'Tài sản cao hơn hóa đơn' : 'Tài sản thấp hơn hóa đơn'}</p></div>
              </div>}
              <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 h-10 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-36">Mã tài sản</th>
                      <th className="p-3">Tên tài sản</th>
                      <th className="p-3 w-20 text-center">ĐVT</th>
                      <th className="p-3 w-32 text-right">Giá trị (ex VAT)</th>
                      <th className="p-3 w-36 text-center">Trạng thái</th>
                      <th className="p-3 w-28 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {invoice.assets?.map((ast: any) => {
                      const getStatusLabelText = (st: string) => {
                        switch (st) {
                          case 'IN_STOCK': return 'Trong kho';
                          case 'ASSIGNED': return 'Đang sử dụng';
                          case 'RETIRED': return 'Đã thu hồi';
                          case 'UNDER_REPAIR': return 'Đang sửa chữa';
                          case 'DAMAGED': return 'Báo hỏng';
                          case 'LOST': return 'Báo mất';
                          case 'DISPOSED': return 'Đã thanh lý';
                          default: return st;
                        }
                      };
                      return (
                        <tr key={ast.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">{ast.assetCode}</td>
                          <td className="p-3 font-bold text-slate-800">{ast.assetName}</td>
                          <td className="p-3 text-center">{ast.unit || 'Cái'}</td>
                          <td className="p-3 text-right font-bold">
                            {hasPermission('ASSET_VIEW_PRICE') && ast.purchasePriceExVat !== null
                              ? `${ast.purchasePriceExVat.toLocaleString()} ₫`
                              : '*****'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              {getStatusLabelText(ast.status)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onViewAsset(ast.id)}
                                className="text-primary-600 hover:text-primary-755 p-1 bg-primary-50 rounded-lg cursor-pointer"
                                title="Xem chi tiết tài sản này"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {hasPermission('ASSET_UPDATE') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startAddQuantity(ast)}
                                    className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded-lg cursor-pointer"
                                    title="Bổ sung số lượng"
                                  >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAsset(ast)}
                                    className={`text-rose-600 hover:text-rose-700 p-1 bg-rose-50 rounded-lg cursor-pointer ${ast.status !== 'IN_STOCK' ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title={ast.status !== 'IN_STOCK' ? `Không thể xóa (Trạng thái: ${ast.status})` : "Xóa tài sản khỏi hóa đơn"}
                                  >
                                    <MinusCircle className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!invoice.assets || invoice.assets.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 italic font-bold">Chưa có tài sản nào được liên kết với hóa đơn này.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ADD QUANTITY SUB-MODAL */}
            {addQuantityAsset && (
              <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAddQuantityAsset(null)} />
                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 space-y-6">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-emerald-600" />
                      Bổ sung số lượng tài sản
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Tạo thêm tài sản tương tự từ tài sản mẫu</p>
                  </div>

                  <div className="space-y-4 text-xs font-bold text-slate-650">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Tài sản mẫu</span>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold">
                        <span className="font-mono text-primary-650 mr-2">[{addQuantityAsset.assetCode}]</span>
                        {addQuantityAsset.assetName}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Số lượng cần bổ sung *</label>
                      <input
                        type="number"
                        min="1"
                        value={addQtyForm.quantity}
                        onChange={e => setAddQtyForm({ ...addQtyForm, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Danh sách số Serial (Tùy chọn)</label>
                      <textarea
                        rows={3}
                        placeholder="Nhập mỗi dòng một số serial hoặc phân tách bằng dấu phẩy"
                        value={addQtyForm.serials}
                        onChange={e => setAddQtyForm({ ...addQtyForm, serials: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-primary-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 font-normal">Cung cấp tối đa tương ứng với số lượng cần thêm.</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 text-xs font-black">
                      <button
                        type="button"
                        disabled={addingQty}
                        onClick={() => setAddQuantityAsset(null)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-505 hover:bg-slate-50 rounded-xl uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={addingQty}
                        onClick={handleAddQuantitySubmit}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {addingQty ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Xác nhận
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 italic font-bold">Không thể hiển thị thông tin hóa đơn.</div>
        )}
      </div>
    </div>
  );
};
