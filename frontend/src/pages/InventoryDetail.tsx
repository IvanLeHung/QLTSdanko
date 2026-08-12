import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Loader2,
  Package,
  User,
  MapPin,
  ClipboardList,
  Save,
  Lock,
  Play,
  Ban,
  Calendar,
  Tag,
  Plus,
  AlertTriangle,
  Cpu,
  FileText,
  Trash2,
  Edit3,
  HelpCircle,
  Upload,
  Check,
  Layers,
  TrendingDown,
  Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { BaseModal } from '../components/BaseModal';
import { useAuth } from '../context/AuthContext';
import { NormalizationModal } from '../components/NormalizationModal';

type InventoryPersonnelUser = {
  id: number;
  fullName: string;
  username?: string;
  employeeCode?: string | null;
  position?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
};

type DepartmentRepresentativeForm = {
  departmentId: number | null;
  departmentName: string;
  representativeUserId: number | null;
  representativeName: string;
  position: string;
  isManual: boolean;
};

const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  'Hà Nội': {
    'Văn phòng C6': [
      'Mặt trước C6-I',
      'Mặt sau C6-I',
      'Kho',
      'Mặt trước C6-II',
      'Mặt sau C6-II',
      'Tầng 9 C6-I',
      'Tầng 2 C6-II'
    ],
    'Vân Canh': ['Kho']
  },
  'Thái Nguyên': {
    'Danko City': ['Trung tâm thương mại', 'Văn phòng BQLDA', 'Kho'],
    'Danko Avenue': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko Sun River': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Bắc Ninh': {
    'Danko Riverside': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Tuyên Quang': {
    'Danko Center': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Thanh Hóa': {
    'Danko Royal': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho'],
    'Danko The Country': ['Văn phòng Bán hàng', 'Văn phòng BQLDA', 'Kho']
  },
  'Phú Thọ': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  },
  'Hà Nam': {
    'Dự án chưa hình thành': ['Văn phòng BQLDA', 'Kho']
  }
};

interface MultiSelectDropdownProps {
  label: string;
  placeholder?: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder = 'Chọn...',
  options,
  selectedValues,
  onChange,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOptions = options.filter(opt => 
    !searchQuery || opt.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const allSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selectedValues.includes(opt));
  
  let displayText = placeholder;
  if (selectedValues.length > 0) {
    if (selectedValues.length <= 3) {
      displayText = selectedValues.join(', ');
    } else {
      displayText = `Đã chọn ${selectedValues.length} ${label.toLowerCase()}`;
    }
  }

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">
        {label} {required && '*'}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[48px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm flex items-center justify-between cursor-pointer shadow-sm hover:border-slate-300"
      >
        <span className="truncate pr-4">{displayText}</span>
        <span className="text-slate-400">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 min-w-[280px]">
          <input 
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary-500"
          />

          <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const newSelection = Array.from(new Set([...selectedValues, ...filteredOptions]));
                onChange(newSelection);
              }}
              className="text-[10px] font-black text-primary-650 hover:underline cursor-pointer uppercase"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                const newSelection = selectedValues.filter(v => !filteredOptions.includes(v));
                onChange(newSelection);
              }}
              className="text-[10px] font-black text-rose-600 hover:underline cursor-pointer uppercase"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredOptions.map(opt => {
              const checked = selectedValues.includes(opt);
              return (
                <label key={opt} className="flex items-center space-x-2.5 px-1.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(selectedValues.filter(v => v !== opt));
                      } else {
                        onChange([...selectedValues, opt]);
                      }
                    }}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
                  />
                  <span className={`text-xs ${checked ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{opt}</span>
                </label>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400 italic">Không tìm thấy dữ liệu</div>
            )}
          </div>
          
          <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const InventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Role Simulation & Interactive States
  const [simulatedRole, setSimulatedRole] = useState<'ADMIN_TS' | 'TRUONG_DOAN' | 'NGUOI_KK' | 'PHONG_BAN' | 'BAN_LANH_DAO'>('ADMIN_TS');
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Wizard States for Create Session Modal
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isNormalizationOpen, setIsNormalizationOpen] = useState(false);
  const [cachedMetadata, setCachedMetadata] = useState<any>(null);
  const [scopeSelection, setScopeSelection] = useState<'ALL' | 'COMPANY' | 'PROJECT' | 'LOCATION' | 'DEPARTMENT' | 'USER' | 'FILTER'>('FILTER');
  const [sessionMembers, setSessionMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [showDeptDropdown, setShowDeptDropdown] = useState<boolean>(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>('');


  
  const [previewAssetsCount, setPreviewAssetsCount] = useState<number | null>(null);
  const [previewBreakdowns, setPreviewBreakdowns] = useState<any>({ department: {}, project: {}, location: {}, category: {} });
  const [previewBreakdown, setPreviewBreakdown] = useState<Record<string, number>>({});
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  
  // Background creation progress simulation states
  const [creationProgress, setCreationProgress] = useState<number | null>(null);
  const [creationStatusText, setCreationStatusText] = useState<string>('');

  // Report Center States
  const [showReportCenterModal, setShowReportCenterModal] = useState<boolean>(false);
  const [selectedReports, setSelectedReports] = useState<string[]>(['RPT-01']);
  const [reportExportFormat, setReportExportFormat] = useState<'EXCEL' | 'PDF' | 'BOTH'>('BOTH');
  const [reportZipFiles, setReportZipFiles] = useState<boolean>(true);
  const [reportFilters, setReportFilters] = useState({ company: '', project: '', department: '' });
  const [reportExportProgress, setReportExportProgress] = useState<number | null>(null);
  const [reportExportStatusText, setReportExportStatusText] = useState<string>('');
  const [reportHistoryFiles, setReportHistoryFiles] = useState<any[]>([
    { id: '1', fileName: 'KK2026_TongHop_20260731_1730.xlsx', fileType: 'xlsx', creator: 'Lê Thanh Hùng', createdAt: '2026-06-11T07:30:00Z', fileSize: '1.2 MB', reportCode: 'RPT-01' },
    { id: '2', fileName: 'KK2026_BB_HCNS_C6_20260615.pdf', fileType: 'pdf', creator: 'Lê Thanh Hùng', createdAt: '2026-06-11T09:45:00Z', fileSize: '450 KB', reportCode: 'RPT-02' }
  ]);
  const [previewFileDetails, setPreviewFileDetails] = useState<any | null>(null);



  // Role simulation helpers
  const hasAdminRights = () => simulatedRole === 'ADMIN_TS';
  const hasTruongDoanRights = () => simulatedRole === 'ADMIN_TS' || simulatedRole === 'TRUONG_DOAN';
  const hasNguoiKKRights = () => simulatedRole === 'ADMIN_TS' || simulatedRole === 'TRUONG_DOAN' || simulatedRole === 'NGUOI_KK';
  const hasPhongBanRights = () => simulatedRole === 'ADMIN_TS' || simulatedRole === 'PHONG_BAN';



  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CHECKED

  // Tab State
  const [activeTab, setActiveTab] = useState<'CHECK_LIST' | 'DISCOVERED_LIST' | 'POST_INVENTORY' | 'REPORTS_LIST'>('CHECK_LIST');

  // Sessions workflow states
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    scheduledDate: new Date().toISOString().slice(0, 10),
    companyName: '',
    projectName: '',
    departmentName: '',
    locationName: '',
    checkerName: '',
    representativeName: '',
    teamName: '',
    note: ''
  });
  const [departmentRepresentatives, setDepartmentRepresentatives] = useState<DepartmentRepresentativeForm[]>([]);
  const [representativeUsersByDepartment, setRepresentativeUsersByDepartment] = useState<Record<string, InventoryPersonnelUser[]>>({});
  const [representativeUsersLoading, setRepresentativeUsersLoading] = useState(false);
  const [activeSessionReport, setActiveSessionReport] = useState<any>(null);

  // Discovered Assets state
  const [discoveredAssets, setDiscoveredAssets] = useState<any[]>([]);
  const [isDiscoveredLoading, setIsDiscoveredLoading] = useState(false);
  const [isDiscoveredModalOpen, setIsDiscoveredModalOpen] = useState(false);
  const [discoveredForm, setDiscoveredForm] = useState<any>({
    name: '',
    categoryName: '',
    serialNumber: '',
    foundLocationName: '',
    foundUserName: '',
    ownershipStatus: 'UNKNOWN',
    photos: [] as string[],
    note: ''
  });

  // Review state
  const [selectedDiscoveredForReview, setSelectedDiscoveredForReview] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState<any>({
    status: 'APPROVED',
    assetId: '',
    companyId: '',
    cat4Id: '',
    departmentName: '',
    locationName: '',
    cityName: '',
    projectName: '',
    supplierName: '',
    currentUserName: '',
    note: '',
    purchasePriceExVat: 0,
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    serialNumber: '',
    assetName: '',
    technicalSpecsJson: ''
  });
  const [reviewSearchAssetQuery, setReviewSearchAssetQuery] = useState('');
  const [reviewAssetSearchResults, setReviewAssetSearchResults] = useState<any[]>([]);
  const [searchAssetLoading, setSearchAssetLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Phase 2: Unified Scanner & Discrepancy states
  const [isScopeLocked, setIsScopeLocked] = useState(false);
  const [scanScopeCity, setScanScopeCity] = useState('');
  const [scanScopeLocation, setScanScopeLocation] = useState('');
  const [scanScopeProject, setScanScopeProject] = useState('');
  const [scanScopeDepartment, setScanScopeDepartment] = useState('');
  const [scanScopeUser, setScanScopeUser] = useState('');
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [undoTargetItem, setUndoTargetItem] = useState<any>(null);
  const [undoReason, setUndoReason] = useState('');
  const [showRecheckModal, setShowRecheckModal] = useState(false);
  const [recheckTargetItem, setRecheckTargetItem] = useState<any>(null);
  const [recheckReason, setRecheckReason] = useState('');
  const [successFlashItem, setSuccessFlashItem] = useState<any>(null);

  // Batch Scan Mode states
  const [showBatchScanModal, setShowBatchScanModal] = useState(false);
  const [showBatchResultModal, setShowBatchResultModal] = useState(false);
  const [batchQueue, setBatchQueue] = useState<string[]>([]);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [batchScanInput, setBatchScanInput] = useState('');

  // Batch Review Workspace states
  const [showBatchReviewWorkspace, setShowBatchReviewWorkspace] = useState(false);
  const [pendingBatches, setPendingBatches] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string>(localStorage.getItem('qlts_active_batch_id') || '');
  const [activeBatchData, setActiveBatchData] = useState<any>(null);
  const [batchReviewTab, setBatchReviewTab] = useState<string>('matchPendingItems');
  const [batchConfirmedMeta, setBatchConfirmedMeta] = useState<{[itemId: number]: { undoDeadline: string; confirmedAt: string }}>({});
  const [batchReviewEditData, setBatchReviewEditData] = useState<{[itemId: number]: any}>({});
  const [batchCardStatuses, setBatchCardStatuses] = useState<{[key: string]: string}>({});
  const [showOverrideWarning, setShowOverrideWarning] = useState<any>(null);
  const [editingItemIds, setEditingItemIds] = useState<Set<number>>(new Set());
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load batch queue from localStorage when session/activeSession is loaded
  useEffect(() => {
    if (!session && !activeSession) return;
    const key = `qlts_batch_scan_queue_${activeSession ? 'session_' + activeSession.id : 'check_' + session?.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setBatchQueue(JSON.parse(saved));
      } catch (e) {
        console.error('Lỗi phân tích cú pháp queue từ localStorage:', e);
      }
    } else {
      setBatchQueue([]);
    }
  }, [session?.id, activeSession?.id]);

  // Sync batch queue to localStorage
  const updateBatchQueue = (newQueue: string[]) => {
    setBatchQueue(newQueue);
    if (!session && !activeSession) return;
    const key = `qlts_batch_scan_queue_${activeSession ? 'session_' + activeSession.id : 'check_' + session?.id}`;
    localStorage.setItem(key, JSON.stringify(newQueue));
  };

  // Persist activeBatchId to localStorage
  useEffect(() => {
    if (activeBatchId) {
      localStorage.setItem('qlts_active_batch_id', activeBatchId);
    } else {
      localStorage.removeItem('qlts_active_batch_id');
    }
  }, [activeBatchId]);

  // Multi-conditional Filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [sessionFilters, setSessionFilters] = useState<any>({
    companyNames: [] as string[],
    cityNames: [] as string[],
    projectNames: [] as string[],
    locationNames: [] as string[],
    departmentNames: [] as string[],
    currentUserNames: [] as string[],
    level1Names: [] as string[],
    level2Names: [] as string[],
    level3Names: [] as string[],
    statuses: [] as string[],
    hasSerial: null as boolean | null,
    hasInvoice: null as boolean | null,
    hasCode: null as boolean | null
  });

  // Dynamic dropdown dependency states
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  // Categories (cấp 1, 2, 3) from metadata
  const level1Cats = useMemo(() => {
    return allCategories.filter((c: any) => c.level === 1).map((c: any) => c.name);
  }, [allCategories]);

  const level2Cats = useMemo(() => {
    return allCategories.filter((c: any) => c.level === 2).map((c: any) => c.name);
  }, [allCategories]);

  const level3Cats = useMemo(() => {
    return allCategories.filter((c: any) => c.level === 3).map((c: any) => c.name);
  }, [allCategories]);

  const assetStatuses = [
    'IN_STOCK',
    'ASSIGNED',
    'UNDER_REPAIR',
    'DAMAGED',
    'LOST',
    'LIQUIDATED'
  ];

  const selectedSessionDepartmentNames = useMemo(() => {
    const names: string[] = scopeSelection === 'FILTER'
      ? ((sessionFilters.departmentNames || []) as string[])
      : (scopeSelection === 'DEPARTMENT' && sessionForm.departmentName ? [sessionForm.departmentName] : []);
    return Array.from(new Set<string>(names.map((name: string) => String(name || '').trim()).filter(Boolean)));
  }, [scopeSelection, sessionFilters.departmentNames, sessionForm.departmentName]);

  const representativeRows = selectedSessionDepartmentNames.length > 0
    ? selectedSessionDepartmentNames
    : ['Đơn vị kiểm kê'];

  const buildRepresentativeKey = (departmentName: string) => departmentName || 'Đơn vị kiểm kê';

  const updateDepartmentRepresentative = (departmentName: string, patch: Partial<DepartmentRepresentativeForm>) => {
    setDepartmentRepresentatives((prev) => prev.map((rep) => (
      rep.departmentName === departmentName ? { ...rep, ...patch } : rep
    )));
  };

  const validateSessionPersonnel = () => {
    if (!sessionForm.checkerName.trim()) {
      toast.error('Vui lòng nhập trưởng đoàn kiểm kê.');
      return false;
    }
    if (!sessionForm.teamName.trim()) {
      toast.error('Vui lòng nhập đội kiểm kê.');
      return false;
    }
    const normalizedMembers = sessionMembers.map((name) => name.trim()).filter(Boolean);
    if (normalizedMembers.length === 0) {
      toast.error('Vui lòng nhập ít nhất một thành viên đoàn kiểm kê.');
      return false;
    }
    if (new Set(normalizedMembers.map((name) => name.toLowerCase())).size !== normalizedMembers.length) {
      toast.error('Thành viên đoàn kiểm kê bị trùng tên.');
      return false;
    }
    if (normalizedMembers.some((name) => name.toLowerCase() === sessionForm.checkerName.trim().toLowerCase())) {
      toast.error('Thành viên đoàn kiểm kê không được trùng với trưởng đoàn.');
      return false;
    }
    if (departmentRepresentatives.length === 0) {
      toast.error('Vui lòng khai báo đại diện ký biên bản.');
      return false;
    }
    const missingRep = departmentRepresentatives.find((rep) => !rep.representativeName.trim());
    if (missingRep) {
      toast.error(`Vui lòng chọn hoặc nhập đại diện ký biên bản cho ${missingRep.departmentName}.`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!showSessionModal) return;
    setDepartmentRepresentatives((prev) => representativeRows.map((departmentName) => {
      const existing = prev.find((rep) => rep.departmentName === departmentName);
      return existing || {
        departmentId: null,
        departmentName,
        representativeUserId: null,
        representativeName: '',
        position: '',
        isManual: false
      };
    }));
  }, [showSessionModal, representativeRows.join('|')]);

  useEffect(() => {
    if (!showSessionModal || wizardStep !== 2) return;
    let cancelled = false;

    const fetchRepresentatives = async () => {
      setRepresentativeUsersLoading(true);
      try {
        const entries = await Promise.all(representativeRows.map(async (departmentName) => {
          const key = buildRepresentativeKey(departmentName);
          const isGeneric = departmentName === 'Đơn vị kiểm kê';
          const url = isGeneric
            ? '/inventory/active-users?limit=100'
            : `/inventory/active-users?departmentName=${encodeURIComponent(departmentName)}&limit=100`;
          const res = await api.get(url);
          return [key, res.data.users || []] as const;
        }));
        if (!cancelled) {
          setRepresentativeUsersByDepartment(Object.fromEntries(entries));
        }
      } catch (err) {
        if (!cancelled) {
          setRepresentativeUsersByDepartment({});
          toast.error('Không tải được danh sách nhân sự ký biên bản.');
        }
      } finally {
        if (!cancelled) setRepresentativeUsersLoading(false);
      }
    };

    fetchRepresentatives();
    return () => {
      cancelled = true;
    };
  }, [showSessionModal, wizardStep, representativeRows.join('|')]);

  // Cascading dependency effect
  useEffect(() => {
    if (!showSessionModal) return;

    const fetchCascadedOptions = async () => {
      try {
        const res = await api.post('/assets/filter-options/cascaded', sessionFilters);
        setAvailableCompanies(res.data.companies || []);
        setAvailableCities(res.data.cities || []);
        setAvailableProjects(res.data.projects || []);
        setAvailableLocations(res.data.locations || []);
        setAvailableDepartments(res.data.departments || []);
        setAvailableUsers(res.data.users || []);
      } catch (err) {
        console.error("Lỗi khi tải danh mục phụ thuộc", err);
      }
    };

    fetchCascadedOptions();
  }, [sessionFilters, showSessionModal]);

  // Cascading category state
  const [reviewCat1, setReviewCat1] = useState('');
  const [reviewCat2, setReviewCat2] = useState('');
  const [reviewCat3, setReviewCat3] = useState('');

  // Department, Location, Employee dropdowns for review
  const [reviewDepartments, setReviewDepartments] = useState<string[]>([]);
  const [reviewLocations, setReviewLocations] = useState<string[]>([]);
  const [reviewCities, setReviewCities] = useState<string[]>([]);
  const [reviewProjects, setReviewProjects] = useState<string[]>([]);
  const [reviewSuppliers, setReviewSuppliers] = useState<string[]>([]);
  const [reviewUserQuery, setReviewUserQuery] = useState('');
  const [reviewUserSuggestions, setReviewUserSuggestions] = useState<string[]>([]);
  const [showReviewUserDropdown, setShowReviewUserDropdown] = useState(false);

  // Dependent location states for review form
  const [reviewSelectedCity, setReviewSelectedCity] = useState('');
  const [reviewSelectedProject, setReviewSelectedProject] = useState('');
  const [reviewSelectedLocation, setReviewSelectedLocation] = useState('');

  const [reviewCustomCity, setReviewCustomCity] = useState('');
  const [reviewCustomProject, setReviewCustomProject] = useState('');
  const [reviewCustomLocation, setReviewCustomLocation] = useState('');

  // Department suggestion list states
  const [showReviewDeptDropdown, setShowReviewDeptDropdown] = useState(false);
  const [reviewDeptQuery, setReviewDeptQuery] = useState('');

  // QR Scanner / Unified Scan state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [isFastScanMode, setIsFastScanMode] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Duplicate assets selection modal state
  const [duplicateAssets, setDuplicateAssets] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Single Item Check modal state
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);
  const [quickEditItem, setQuickEditItem] = useState<any>(null);
  const [quickEditForm, setQuickEditForm] = useState<any>({
    actualUserName: '',
    actualCityName: '',
    actualProjectName: '',
    actualLocationName: '',
    actualDepartmentName: '',
    condition: 'GOOD',
    resultStatus: 'MATCH',
    note: ''
  });

  const playBeep = (type: 'success' | 'warning' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12);
      } else {
        // Warning buzz: lower frequency, sawtooth type
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); // 300Hz
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  };
  const [checkForm, setCheckForm] = useState<any>({
    actualLocation: '',
    actualStatus: 'IN_STOCK',
    quality: 'GOOD',
    note: '',
    photos: [] as string[],
    checkCondition: 'FOUND', // FOUND, MISSING, UNKNOWN, UNAVAILABLE
    actualUserName: '',
    actualUserId: null,
    actualSerialNumber: '',
    // physical details
    appearance: 'GOOD',
    operation: 'NORMAL',
    wearRate: 0,
    accessories: '',
    // technical specs (laptop/PC)
    cpu: '',
    ram: '',
    storage: '',
    os: '',
    mac: '',
    // printer specs
    printerCounter: '',
    printerInk: '',
  });

  // Custodian Suggestion states
  const [custodianQuery, setCustodianQuery] = useState('');
  const [custodianSuggestions, setCustodianSuggestions] = useState<string[]>([]);
  const [showCustodianDropdown, setShowCustodianDropdown] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);


  const fetchDetail = async () => {
    try {
      const res = await api.get(`/inventory/${id}`);
      setSession(res.data);
      const sessionsRes = await api.get(`/inventory/${id}/sessions`);
      setSessions(sessionsRes.data);

      if (activeSession) {
        const freshSession = sessionsRes.data.find((s: any) => s.id === activeSession.id);
        if (freshSession) {
          const detailRes = await api.get(`/inventory/sessions/${freshSession.id}`);
          setActiveSession(detailRes.data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin đợt kiểm kê");
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (sessionItem: any) => {
    try {
      const res = await api.get(`/inventory/sessions/${sessionItem.id}`);
      setActiveSession(res.data);
      toast.success(`Đã vào phiên kiểm kê: ${sessionItem.departmentName || sessionItem.locationName || 'Chi tiết'}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải chi tiết phiên kiểm kê");
    }
  };

  const handleStartSessionVisit = async (sessionItem: any) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/inventory/sessions/${sessionItem.id}/start`);
      toast.success("Đã bắt đầu phiên kiểm kê");
      setActiveSession(res.data);
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể bắt đầu phiên kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchPreviewAssets = async () => {
    setPreviewLoading(true);
    setPreviewAssetsCount(null);
    try {
      const res = await api.post(`/inventory/${id}/sessions/preview`, sessionFilters);
      
      setPreviewAssetsCount(res.data.total);
      setPreviewBreakdown(res.data.categoryBreakdown || {});
      setPreviewBreakdowns({
        department: res.data.departmentBreakdown || {},
        project: res.data.projectBreakdown || {},
        location: res.data.locationBreakdown || {},
        category: res.data.categoryBreakdown || {}
      });

      if (res.data.total > 10000) {
        toast.warning("Bạn đang tạo phiên kiểm kê với hơn 10.000 tài sản. Hệ thống sẽ tạo phiên ở chế độ nền.");
      }
      return res.data.total as number;
    } catch (err) {
      toast.error("Không thể xem trước tài sản");
      return null;
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewAssets = async () => {
    await fetchPreviewAssets();
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSessionPersonnel()) return;
    setSubmitting(true);
    setCreationProgress(0);
    setCreationStatusText("Khởi tạo cấu hình phiên...");
    try {
      const resolvedPreviewCount = previewAssetsCount ?? await fetchPreviewAssets();
      if (resolvedPreviewCount === null) {
        setSubmitting(false);
        setCreationProgress(null);
        return;
      }
      let deptNameVal = sessionForm.departmentName;
      let locNameVal = sessionForm.locationName;
      if (scopeSelection === 'FILTER') {
        if (sessionFilters.departmentNames && sessionFilters.departmentNames.length > 0) {
          deptNameVal = sessionFilters.departmentNames.length === 1 
            ? sessionFilters.departmentNames[0] 
            : `${sessionFilters.departmentNames.length} phòng ban`;
        }
        if (sessionFilters.locationNames && sessionFilters.locationNames.length > 0) {
          locNameVal = sessionFilters.locationNames.length === 1 
            ? sessionFilters.locationNames[0] 
            : `${sessionFilters.locationNames.length} vị trí`;
        }
      }

      const payload = {
        ...sessionForm,
        departmentName: deptNameVal || undefined,
        locationName: locNameVal || undefined,
        members: sessionMembers,
        inspectionLeaderName: sessionForm.checkerName,
        inspectionTeamName: sessionForm.teamName,
        inspectionMembers: sessionMembers.map((name) => ({ userId: null, fullName: name, position: null })),
        departmentRepresentatives: departmentRepresentatives.map((rep) => ({
          departmentId: rep.departmentId,
          departmentName: rep.departmentName,
          representativeUserId: rep.representativeUserId,
          representativeName: rep.representativeName,
          position: rep.position,
          isManual: rep.isManual
        })),
        representativeName: departmentRepresentatives
          .filter((rep) => rep.representativeName)
          .map((rep) => `${rep.departmentName}: ${rep.representativeName}${rep.position ? ` - ${rep.position}` : ''}`)
          .join('; '),
        scopeType: scopeSelection,
        expectedAssetCount: resolvedPreviewCount,
        filters: sessionFilters
      };

      const totalAssets = resolvedPreviewCount;
      let currentProgress = 0;
      
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 15) + 5;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
        }
        const createdCount = Math.floor((currentProgress / 100) * totalAssets);
        setCreationProgress(currentProgress);
        setCreationStatusText(`Đang tạo phiên... ${createdCount}/${totalAssets} tài sản (${currentProgress}%)`);
      }, 120);

      await api.post(`/inventory/${id}/sessions`, payload);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(interval);
      setCreationProgress(100);
      setCreationStatusText(`Hoàn tất! Đã tạo phiên với ${totalAssets} tài sản.`);
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success("Đã tạo phiên kiểm kê thành công");
      setShowSessionModal(false);
      setWizardStep(1);
      setPreviewAssetsCount(null);
      setPreviewBreakdown({});
      setSessionMembers([]);
      setDepartmentRepresentatives([]);
      setRepresentativeUsersByDepartment({});
      setCreationProgress(null);
      
      // Reset filters
      setSessionFilters({
        companyNames: [],
        cityNames: [],
        projectNames: [],
        locationNames: [],
        departmentNames: [],
        currentUserNames: [],
        level1Names: [],
        level2Names: [],
        level3Names: [],
        statuses: [],
        hasSerial: null,
        hasInvoice: null,
        hasCode: null
      });

      setSessionForm({
        scheduledDate: new Date().toISOString().slice(0, 10),
        companyName: '',
        projectName: '',
        departmentName: '',
        locationName: '',
        checkerName: '',
        representativeName: '',
        teamName: '',
        note: ''
      });
      await fetchDetail();
    } catch (err: any) {
      setCreationProgress(null);
      toast.error(err.response?.data?.message || "Lỗi khi tạo phiên kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    if (selectedReports.length === 0) {
      toast.error("Vui lòng chọn ít nhất một loại báo cáo!");
      return;
    }
    setSubmitting(true);
    setReportExportProgress(0);
    setReportExportStatusText("Khởi tạo hàng đợi kết xuất báo cáo...");
    try {
      let currentProgress = 0;
      const totalSteps = selectedReports.length * 15;
      
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 8) + 4;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
        }
        const renderedCount = Math.floor((currentProgress / 100) * totalSteps);
        setReportExportProgress(currentProgress);
        setReportExportStatusText(`Đang tạo báo cáo... ${renderedCount}/${totalSteps} tệp/phân hệ (${currentProgress}%)`);
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 1500));
      clearInterval(interval);
      setReportExportProgress(100);
      setReportExportStatusText(`Hoàn tất kết xuất!`);
      await new Promise(resolve => setTimeout(resolve, 300));

      const newFiles: any[] = [];
      const nowStr = new Date().toISOString();
      const codeSuffix = format(new Date(), 'yyyyMMdd_HHmm');
      
      selectedReports.forEach((rptCode, index) => {
        const fileExt = reportExportFormat === 'PDF' ? 'pdf' : 'xlsx';
        const fileS = reportExportFormat === 'PDF' ? '820 KB' : '1.5 MB';
        let rptName = 'KK2026_TongHop';
        if (rptCode === 'RPT-01') rptName = `KK2026_TongHop_${codeSuffix}`;
        if (rptCode === 'RPT-02') rptName = `KK2026_BB_HCNS_${codeSuffix}`;
        if (rptCode === 'RPT-03') rptName = `KK2026_DanhMucTaiSan_${codeSuffix}`;
        if (rptCode === 'RPT-04') rptName = `KK2026_BaoCaoSaiLech_${codeSuffix}`;
        if (rptCode === 'RPT-05') rptName = `KK2026_TaiSanNgoaiSo_${codeSuffix}`;
        if (rptCode === 'RPT-06') rptName = `KK2026_TaiSanThieu_${codeSuffix}`;
        if (rptCode === 'RPT-07') rptName = `KK2026_BienBanChot_${codeSuffix}`;

        newFiles.push({
          id: String(Date.now() + index),
          fileName: `${rptName}.${fileExt}`,
          fileType: fileExt,
          creator: user?.fullName || 'Lê Thanh Hùng',
          createdAt: nowStr,
          fileSize: fileS,
          reportCode: rptCode
        });
      });

      if (reportZipFiles && selectedReports.length > 1) {
        setReportHistoryFiles(prev => [
          {
            id: String(Date.now() + 99),
            fileName: `KK2026_BoBaoCaoKiemKe_${codeSuffix}.zip`,
            fileType: 'zip',
            creator: user?.fullName || 'Lê Thanh Hùng',
            createdAt: nowStr,
            fileSize: '4.8 MB',
            reportCode: 'ZIP'
          },
          ...prev
        ]);
        toast.success("Kết xuất gói ZIP báo cáo thành công! Tải xuống từ tab File báo cáo.");
      } else {
        setReportHistoryFiles(prev => [...newFiles, ...prev]);
        toast.success(`Đã xuất ${newFiles.length} báo cáo thành công!`);
      }

      setShowReportCenterModal(false);
      setSelectedReports(['RPT-01']);
      setReportExportProgress(null);
    } catch (err) {
      setReportExportProgress(null);
      toast.error("Lỗi khi kết xuất báo cáo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = async (sessionId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn chốt phiên kiểm kê này? Dữ liệu của phiên sẽ không thể chỉnh sửa.")) return;
    setSubmitting(true);
    try {
      await api.post(`/inventory/sessions/${sessionId}/complete`);
      toast.success("Đã chốt phiên kiểm kê thành công");
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi chốt phiên kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hoàn toàn phiên kiểm kê này và tất cả dữ liệu đối soát đi kèm? Thao tác này không thể hoàn tác.")) return;
    setSubmitting(true);
    try {
      await api.delete(`/inventory/sessions/${sessionId}`);
      toast.success("Đã xóa phiên kiểm kê thành công");
      setActiveSession(null);
      await fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa phiên kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSessionReport = async (sessionId: number) => {
    try {
      const res = await api.get(`/inventory/sessions/${sessionId}/report`);
      setActiveSessionReport(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải báo cáo phiên kiểm kê");
    }
  };

  const fetchDiscoveredAssets = async () => {
    setIsDiscoveredLoading(true);
    try {
      const res = await api.get(`/inventory/${id}/discovered`);
      setDiscoveredAssets(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách tài sản ngoài sổ");
    } finally {
      setIsDiscoveredLoading(false);
    }
  };

  const fetchReviewMetadata = async () => {
    if (cachedMetadata) {
      setCompanies(cachedMetadata.companies);
      setAllCategories(cachedMetadata.allCategories);
      setCategories(cachedMetadata.categories);
      setReviewDepartments(cachedMetadata.reviewDepartments);
      setReviewLocations(cachedMetadata.reviewLocations);
      setReviewCities(cachedMetadata.reviewCities);
      setReviewProjects(cachedMetadata.reviewProjects);
      setReviewSuppliers(cachedMetadata.reviewSuppliers);
      return;
    }
    try {
      const [compRes, catRes, deptRes, locRes, cityRes, projRes, suppRes] = await Promise.all([
        api.get('/assets/companies/active'),
        api.get('/assets/categories/active/all'),
        api.get('/settings/departments'),
        api.get('/assets/filter-options/locations'),
        api.get('/assets/filter-options/cities'),
        api.get('/assets/filter-options/projects'),
        api.get('/assets/filter-options/suppliers')
      ]);
      const level4Cats = catRes.data.filter((c: any) => c.level === 4);
      const depts = (deptRes.data || []).map((d: any) => d.name).filter(Boolean);
      
      const meta = {
        companies: compRes.data,
        allCategories: catRes.data,
        categories: level4Cats,
        reviewDepartments: depts,
        reviewLocations: locRes.data || [],
        reviewCities: cityRes.data || [],
        reviewProjects: projRes.data || [],
        reviewSuppliers: suppRes.data || []
      };
      
      setCachedMetadata(meta);
      
      setCompanies(compRes.data);
      setAllCategories(catRes.data);
      setCategories(level4Cats);
      setReviewDepartments(depts);
      setReviewLocations(locRes.data || []);
      setReviewCities(cityRes.data || []);
      setReviewProjects(projRes.data || []);
      setReviewSuppliers(suppRes.data || []);
    } catch (err) {
      console.error("Lỗi tải thông tin danh mục duyệt", err);
    }
  };

  // Cascading category helpers
  const getCategoriesByLevel = (level: number, parentId?: number) => {
    return allCategories.filter((c: any) => {
      if (c.level !== level) return false;
      if (parentId !== undefined) return c.parentId === parentId;
      return true;
    });
  };

  const handleReviewCat1Change = (val: string) => {
    setReviewCat1(val);
    setReviewCat2('');
    setReviewCat3('');
    setReviewForm((f: any) => ({ ...f, cat4Id: '' }));
  };

  const handleReviewCat2Change = (val: string) => {
    setReviewCat2(val);
    setReviewCat3('');
    setReviewForm((f: any) => ({ ...f, cat4Id: '' }));
  };

  const handleReviewCat3Change = (val: string) => {
    setReviewCat3(val);
    setReviewForm((f: any) => ({ ...f, cat4Id: '' }));
  };

  // Employee search for review form
  const handleReviewUserSearch = async (query: string) => {
    setReviewUserQuery(query);
    setReviewForm((f: any) => ({ ...f, currentUserName: query }));
    if (query.trim().length === 0) {
      setReviewUserSuggestions([]);
      setShowReviewUserDropdown(false);
      return;
    }
    try {
      const res = await api.get(`/assets/filter-options/users?q=${encodeURIComponent(query)}`);
      setReviewUserSuggestions(res.data || []);
      setShowReviewUserDropdown(res.data.length > 0);
    } catch (err) {
      console.error(err);
    }
  };

  // Update Combined Location and City and Project whenever dependent fields change
  useEffect(() => {
    const cityVal = reviewSelectedCity === 'Khác' ? reviewCustomCity : reviewSelectedCity;
    const projectVal = reviewSelectedProject === 'Khác' ? reviewCustomProject : reviewSelectedProject;
    const locationVal = reviewSelectedLocation === 'Khác' ? reviewCustomLocation : reviewSelectedLocation;

    let combinedLocation = '';
    if (cityVal) {
      combinedLocation += cityVal;
      if (projectVal) {
        combinedLocation += '-' + projectVal;
      }
      if (locationVal) {
        combinedLocation += '-' + locationVal;
      }
    } else {
      combinedLocation = locationVal || '';
    }

    setReviewForm((prev: any) => ({
      ...prev,
      cityName: cityVal,
      projectName: projectVal,
      locationName: combinedLocation
    }));
  }, [reviewSelectedCity, reviewSelectedProject, reviewSelectedLocation, reviewCustomCity, reviewCustomProject, reviewCustomLocation]);

  const parseReviewLocationToStates = (fullLocation: string) => {
    if (!fullLocation) {
      setReviewSelectedCity('');
      setReviewSelectedProject('');
      setReviewSelectedLocation('');
      setReviewCustomCity('');
      setReviewCustomProject('');
      setReviewCustomLocation('');
      return;
    }
    const trimmed = fullLocation.trim();
    const parts = trimmed.split(/[-/\\]/).map(p => p.trim());
    
    let resolvedCity = '';
    let resolvedProject = '';
    let resolvedLocation = '';
    
    if (parts.length >= 3) {
      resolvedCity = parts[0];
      resolvedProject = parts[1];
      resolvedLocation = parts.slice(2).join('-');
    } else if (parts.length === 2) {
      resolvedCity = parts[0];
      resolvedLocation = parts[1];
    } else {
      resolvedLocation = trimmed;
    }

    if (resolvedCity) {
      if (LOCATION_HIERARCHY[resolvedCity]) {
        setReviewSelectedCity(resolvedCity);
        if (resolvedProject) {
          if (LOCATION_HIERARCHY[resolvedCity][resolvedProject]) {
            setReviewSelectedProject(resolvedProject);
            if (resolvedLocation) {
              if (LOCATION_HIERARCHY[resolvedCity][resolvedProject].includes(resolvedLocation)) {
                setReviewSelectedLocation(resolvedLocation);
              } else {
                setReviewSelectedLocation('Khác');
                setReviewCustomLocation(resolvedLocation);
              }
            }
          } else {
            setReviewSelectedProject('Khác');
            setReviewCustomProject(resolvedProject);
            setReviewSelectedLocation('Khác');
            setReviewCustomLocation(resolvedLocation);
          }
        } else {
          setReviewSelectedProject('');
          setReviewSelectedLocation('');
        }
      } else {
        setReviewSelectedCity('Khác');
        setReviewCustomCity(resolvedCity);
        if (resolvedProject) {
          setReviewSelectedProject('Khác');
          setReviewCustomProject(resolvedProject);
        }
        if (resolvedLocation) {
          setReviewSelectedLocation('Khác');
          setReviewCustomLocation(resolvedLocation);
        }
      }
    } else if (resolvedLocation) {
      setReviewSelectedCity('Khác');
      setReviewSelectedProject('Khác');
      setReviewSelectedLocation('Khác');
      setReviewCustomLocation(resolvedLocation);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchReviewMetadata();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'DISCOVERED_LIST') {
      fetchDiscoveredAssets();
    }
  }, [activeTab]);

  const handleStartSession = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/start`);
      toast.success("Đã bắt đầu đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi bắt đầu đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đợt kiểm kê này? Thao tác này không thể hoàn tác.")) return;
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/cancel`);
      toast.success("Đã hủy đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi hủy đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportDiscovered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoveredForm.name.trim()) {
      toast.error("Tên tài sản là bắt buộc");
      return;
    }
    setSubmitting(true);
    
    if (activeSession) {
      try {
        await api.post(`/inventory/sessions/${activeSession.id}/extra`, {
          assetName: discoveredForm.name,
          serialNumber: discoveredForm.serialNumber,
          actualLocationName: discoveredForm.foundLocationName || activeSession.locationName || '',
          actualUserName: discoveredForm.foundUserName,
          note: discoveredForm.note || 'Tài sản phát sinh ngoài sổ',
          imageUrl: discoveredForm.photos?.[0] || ''
        });
        toast.success("Đã ghi nhận tài sản ngoài sổ vào phiên kiểm kê");
        setIsDiscoveredModalOpen(false);
        setDiscoveredForm({
          name: '',
          categoryName: '',
          serialNumber: '',
          foundLocationName: '',
          foundUserName: '',
          ownershipStatus: 'UNKNOWN',
          photos: [],
          note: ''
        });
        await fetchDetail();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Lỗi khi báo cáo tài sản ngoài sổ");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      await api.post(`/inventory/${id}/discovered`, discoveredForm);
      toast.success("Đã ghi nhận tài sản ngoài sổ thành công");
      setIsDiscoveredModalOpen(false);
      setDiscoveredForm({
        name: '',
        categoryName: '',
        serialNumber: '',
        foundLocationName: '',
        foundUserName: '',
        ownershipStatus: 'UNKNOWN',
        photos: [],
        note: ''
      });
      fetchDiscoveredAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi báo cáo tài sản ngoài sổ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchAssetForMerge = async (query: string) => {
    setReviewSearchAssetQuery(query);
    if (query.trim().length < 2) {
      setReviewAssetSearchResults([]);
      return;
    }
    setSearchAssetLoading(true);
    try {
      const res = await api.get(`/assets?search=${encodeURIComponent(query)}&limit=10`);
      setReviewAssetSearchResults(res.data.assets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchAssetLoading(false);
    }
  };

  const handleReviewDiscovered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscoveredForReview) return;
    setSubmitting(true);
    try {
      await api.patch(`/inventory/discovered/${selectedDiscoveredForReview.id}/review`, {
        status: reviewForm.status,
        assetId: reviewForm.status === 'MERGED' ? Number(reviewForm.assetId) : undefined,
        companyId: reviewForm.status === 'APPROVED' ? Number(reviewForm.companyId) : undefined,
        cat4Id: reviewForm.status === 'APPROVED' ? Number(reviewForm.cat4Id) : undefined,
        departmentName: reviewForm.status === 'APPROVED' ? reviewForm.departmentName : undefined,
        locationName: reviewForm.locationName || undefined,
        currentUserName: reviewForm.currentUserName || undefined,
        note: reviewForm.note || undefined,
        purchasePriceExVat: reviewForm.status === 'APPROVED' ? Number(reviewForm.purchasePriceExVat) : undefined,
        purchaseDate: reviewForm.status === 'APPROVED' ? new Date(reviewForm.purchaseDate) : undefined,
        serialNumber: reviewForm.serialNumber || undefined,
        assetName: reviewForm.assetName || undefined,
        technicalSpecsJson: reviewForm.technicalSpecsJson || undefined
      });
      toast.success("Đã phê duyệt/xử lý tài sản ngoài sổ thành công");
      setSelectedDiscoveredForReview(null);
      fetchDiscoveredAssets();
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xử lý tài sản ngoài sổ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustodianQuery = async (query: string) => {
    setCustodianQuery(query);
    setCheckForm((prev: any) => ({ ...prev, actualUserName: query }));
    if (query.trim().length === 0) {
      setCustodianSuggestions([]);
      setShowCustodianDropdown(false);
      return;
    }
    try {
      const res = await api.get(`/assets/filter-options/users?q=${encodeURIComponent(query)}`);
      setCustodianSuggestions(res.data || []);
      setShowCustodianDropdown(res.data.length > 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await api.post('/inventory/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const photoUrl = category ? `${category}|${res.data.url}` : res.data.url;
      setCheckForm((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), photoUrl]
      }));
      toast.success("Tải ảnh bằng chứng thành công");
    } catch (err) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDiscoveredFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('photo', file);

    setUploadingPhoto(true);
    try {
      const res = await api.post('/inventory/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDiscoveredForm((prev: any) => ({
        ...prev,
        photos: [...(prev.photos || []), res.data.url]
      }));
      toast.success("Tải ảnh bằng chứng thành công");
    } catch (err) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploadingPhoto(false);
    }
  };


  const removePhoto = (index: number) => {
    setCheckForm((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((_: any, i: number) => i !== index)
    }));
  };

  // Unified scan logs fetcher
  const fetchScanLogs = async () => {
    try {
      const params: any = {};
      if (activeSession) {
        params.sessionId = activeSession.id;
      } else if (session) {
        params.inventoryCheckId = session.id;
      } else {
        return;
      }

      const res = await api.get('/inventory/scan-logs', { params });
      const logs = res.data || [];
      
      const formatted = logs.map((log: any) => {
        let assetName = 'Tài sản';
        if (activeSession) {
          const matchingDetail = activeSession.details?.find((d: any) => d.assetId === log.assetId);
          if (matchingDetail) assetName = matchingDetail.assetName;
        } else if (session) {
          const matchingItem = session.items?.find((i: any) => i.assetId === log.assetId);
          if (matchingItem) assetName = matchingItem.asset?.assetName || matchingItem.assetName || 'Tài sản';
        }

        return {
          id: String(log.id),
          assetCode: log.assetCode || log.barcode,
          assetName: assetName,
          actualLocation: '',
          actualUserName: '',
          result: log.action || log.result,
          scannedAt: new Date(log.scannedAt).toLocaleTimeString('vi-VN'),
          rawLog: log
        };
      });
      setScanHistory(formatted);
    } catch (err) {
      console.error('Lỗi tải lịch sử quét:', err);
    }
  };

  const findItemForLog = (rawLog: any) => {
    if (!rawLog) return null;
    if (activeSession) {
      return activeSession.details?.find((d: any) => d.id === rawLog.inventorySessionDetailId) || null;
    } else {
      return session?.items?.find((i: any) => i.id === rawLog.inventoryItemId) || null;
    }
  };

  const displayValue = (value: any, fallback = 'N/A') => {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
  };

  const getAssetCode = (item: any) => item?.assetCode || item?.asset?.assetCode || item?.rawLog?.assetCode || item?.rawLog?.barcode || 'N/A';
  const getAssetName = (item: any) => item?.assetName || item?.asset?.assetName || item?.rawLog?.assetName || 'Tài sản';
  const getBookUser = (item: any) => item?.bookUserName || item?.asset?.currentUserName || item?.expectedUserName || '';
  const getActualUser = (item: any) => item?.actualUserName || item?.actualUser || '';
  const getBookDepartment = (item: any) => item?.bookDepartmentName || item?.asset?.departmentName || item?.expectedDepartmentName || '';
  const getActualDepartment = (item: any) => item?.actualDepartmentName || '';
  const getBookCity = (item: any) => item?.bookCityName || item?.asset?.cityName || item?.expectedCityName || '';
  const getActualCity = (item: any) => item?.actualCityName || '';
  const getBookProject = (item: any) => item?.bookProjectName || item?.asset?.projectName || item?.expectedProjectName || '';
  const getActualProject = (item: any) => item?.actualProjectName || '';
  const getBookLocation = (item: any) => item?.bookLocationName || item?.expectedLocation || item?.asset?.locationName || '';
  const getActualLocation = (item: any) => item?.actualLocationName || item?.actualLocation || '';

  const formatInventoryPath = (city?: string, project?: string, location?: string) => {
    const parts = [city, project, location].map((part) => String(part || '').trim()).filter(Boolean);
    return parts.length ? parts.join(' / ') : 'N/A';
  };

  const getInventoryResultLabel = (status?: string) => {
    switch (status) {
      case 'MATCH':
      case 'MATCHED':
        return 'Khớp';
      case 'WRONG_LOCATION':
        return 'Sai vị trí';
      case 'WRONG_USER':
        return 'Sai người dùng';
      case 'WRONG_STATUS':
        return 'Sai trạng thái';
      case 'DAMAGED':
        return 'Hỏng';
      case 'MISSING':
        return 'Thiếu/Mất';
      case 'EXTRA':
        return 'Ngoài sổ';
      default:
        return status || 'Chưa rõ';
    }
  };

  const getInventoryResultClass = (status?: string) => {
    if (status === 'MATCH' || status === 'MATCHED') return 'bg-emerald-50 text-emerald-650 border-emerald-150';
    if (status === 'MISSING' || status === 'DAMAGED') return 'bg-rose-50 text-rose-650 border-rose-150';
    if (status === 'WRONG_LOCATION' || status === 'WRONG_USER' || status === 'WRONG_STATUS') return 'bg-amber-50 text-amber-650 border-amber-150';
    return 'bg-slate-100 text-slate-600 border-slate-250';
  };

  const buildInventoryChanges = (item: any) => {
    const fields = [
      { label: 'Người dùng', before: getBookUser(item), after: getActualUser(item) },
      { label: 'Thành phố', before: getBookCity(item), after: getActualCity(item) },
      { label: 'Dự án', before: getBookProject(item), after: getActualProject(item) },
      { label: 'Vị trí', before: getBookLocation(item), after: getActualLocation(item) },
      { label: 'Phòng ban', before: getBookDepartment(item), after: getActualDepartment(item) },
      { label: 'Tình trạng', before: 'Tốt', after: item?.condition || item?.appearance || item?.quality || '' }
    ];

    return fields
      .map((field) => ({
        ...field,
        before: displayValue(field.before),
        after: displayValue(field.after)
      }))
      .filter((field) => field.before !== field.after && field.after !== 'N/A');
  };

  const recentInventoryResults = useMemo(() => {
    const checkedDetails = activeSession?.details
      ?.filter((item: any) => item.checkedAt)
      ?.map((item: any) => ({ ...item, sourceType: 'detail' }))
      ?.sort((a: any, b: any) => new Date(b.checkedAt || 0).getTime() - new Date(a.checkedAt || 0).getTime()) || [];

    if (checkedDetails.length > 0) return checkedDetails.slice(0, 30);

    return scanHistory
      .map((history) => findItemForLog(history.rawLog) || { ...history, sourceType: 'log' })
      .filter(Boolean)
      .slice(0, 30);
  }, [activeSession?.details, scanHistory]);

  const openQuickInventoryEdit = (item: any) => {
    setQuickEditItem(item);
    setQuickEditForm({
      actualUserName: getActualUser(item) || getBookUser(item),
      actualCityName: getActualCity(item) || getBookCity(item),
      actualProjectName: getActualProject(item) || getBookProject(item),
      actualLocationName: getActualLocation(item) || getBookLocation(item),
      actualDepartmentName: getActualDepartment(item) || getBookDepartment(item),
      condition: item?.condition || item?.appearance || item?.quality || 'GOOD',
      resultStatus: item?.resultStatus || item?.result || 'MATCH',
      note: item?.note || ''
    });
  };

  const handleSaveQuickInventoryEdit = async () => {
    if (!quickEditItem) return;
    setSubmitting(true);
    try {
      if (activeSession) {
        await api.post(`/inventory/session-details/${quickEditItem.id}`, {
          actualUserName: quickEditForm.actualUserName,
          actualDepartmentName: quickEditForm.actualDepartmentName,
          actualLocationName: quickEditForm.actualLocationName,
          resultStatus: quickEditForm.resultStatus,
          note: quickEditForm.note
        });

        setActiveSession((prev: any) => prev ? {
          ...prev,
          details: (prev.details || []).map((detail: any) => detail.id === quickEditItem.id ? {
            ...detail,
            actualUserName: quickEditForm.actualUserName,
            actualCityName: quickEditForm.actualCityName,
            actualProjectName: quickEditForm.actualProjectName,
            actualLocationName: quickEditForm.actualLocationName,
            actualDepartmentName: quickEditForm.actualDepartmentName,
            condition: quickEditForm.condition,
            resultStatus: quickEditForm.resultStatus,
            note: quickEditForm.note,
            checkedAt: detail.checkedAt || new Date().toISOString()
          } : detail)
        } : prev);
      } else {
        await api.post(`/inventory/item/${quickEditItem.id}/check`, {
          status: 'CHECKED',
          actualLocation: quickEditForm.actualLocationName,
          actualUserName: quickEditForm.actualUserName,
          checkCondition: quickEditForm.resultStatus === 'MISSING' ? 'MISSING' : 'FOUND',
          quality: quickEditForm.condition,
          note: quickEditForm.note
        });
      }

      toast.success('Đã lưu chỉnh sửa kết quả kiểm kê');
      setQuickEditItem(null);
      setQuickEditForm({
        actualUserName: '',
        actualCityName: '',
        actualProjectName: '',
        actualLocationName: '',
        actualDepartmentName: '',
        condition: 'GOOD',
        resultStatus: 'MATCH',
        note: ''
      });
      setTimeout(() => scanInputRef.current?.focus(), 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu chỉnh sửa kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  const getScanSpeed = () => {
    if (!scanHistory || scanHistory.length === 0) return 0;
    const validScans = scanHistory.filter(h => h.result !== 'DUPLICATE_IGNORED');
    if (validScans.length < 2) return validScans.length;
    try {
      const times = validScans.map(h => {
        const parts = h.scannedAt.split(':');
        const d = new Date();
        d.setHours(Number(parts[0] || 0), Number(parts[1] || 0), Number(parts[2] || 0));
        return d.getTime();
      });
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const diffHours = (maxTime - minTime) / 3600000;
      if (diffHours < 0.05) {
        return Math.round(validScans.length * 20); // Extrapolate standard speed on start
      }
      return Math.round(validScans.length / diffHours);
    } catch (e) {
      return validScans.length;
    }
  };

  const handleConfirmUndo = async () => {
    if (!undoTargetItem || !undoReason.trim()) return;
    setSubmitting(true);
    try {
      const url = activeSession
        ? `/inventory/session-details/${undoTargetItem.id}/undo`
        : `/inventory/item/${undoTargetItem.id}/undo`;

      await api.post(url, { reason: undoReason });
      toast.success('Hoàn tác lượt quét thành công!');
      setShowUndoModal(false);
      setUndoTargetItem(null);
      setUndoReason('');
      setSelectedItemForCheck(null);
      await fetchDetail();
      await fetchScanLogs();
      
      // Auto-refocus scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi thực hiện hoàn tác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRecheck = async () => {
    if (!recheckTargetItem || !recheckReason.trim()) return;
    setSubmitting(true);
    try {
      const payload: any = {
        reason: recheckReason
      };
      if (activeSession) {
        payload.inventorySessionDetailId = recheckTargetItem.id;
      } else {
        payload.inventoryItemId = recheckTargetItem.id;
      }

      await api.post('/inventory/recheck-request', payload);
      toast.success('Gửi yêu cầu kiểm tra lại thành công! Trạng thái: Chờ duyệt');
      setShowRecheckModal(false);
      setRecheckTargetItem(null);
      setRecheckReason('');
      setSelectedItemForCheck(null);
      await fetchDetail();
      
      // Auto-refocus scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi gửi yêu cầu kiểm tra lại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeepBookValues = async (item: any) => {
    setSubmitting(true);
    try {
      const payload = {
        actualLocation: item.expectedLocation || item.bookLocationName || item.asset?.locationName || 'Trong kho',
        actualUserName: item.asset?.currentUserName || '',
        actualSerialNumber: item.asset?.serialNumber || '',
        actualStatus: item.expectedStatus || 'IN_STOCK',
        appearance: 'GOOD',
        checkCondition: 'FOUND'
      };

      const url = activeSession
        ? `/inventory/sessions/${activeSession.id}/check`
        : `/inventory/check/${session.id}/check`;

      await api.post(url, {
        itemId: item.id,
        ...payload,
        status: 'CHECKED'
      });

      toast.success('Đã xác nhận giữ nguyên sổ sách!');
      setSelectedItemForCheck(null);
      setSuccessFlashItem(item);
      setTimeout(() => setSuccessFlashItem(null), 3000);
      await fetchDetail();
      await fetchScanLogs();

      // Auto-refocus scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsLost = async (item: any) => {
    setSubmitting(true);
    try {
      const payload = {
        actualLocation: item.expectedLocation || item.bookLocationName || item.asset?.locationName || 'Trong kho',
        actualUserName: item.asset?.currentUserName || '',
        actualSerialNumber: item.asset?.serialNumber || '',
        actualStatus: 'DAMAGED',
        appearance: 'BAD',
        checkCondition: 'MISSING'
      };

      const url = activeSession
        ? `/inventory/sessions/${activeSession.id}/check`
        : `/inventory/check/${session.id}/check`;

      await api.post(url, {
        itemId: item.id,
        ...payload,
        status: 'CHECKED'
      });

      toast.success('Đã ghi nhận báo mất tài sản!');
      setSelectedItemForCheck(null);
      await fetchDetail();
      await fetchScanLogs();

      // Auto-refocus scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu thông tin báo mất');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProposeAdjustment = async (item: any) => {
    setSubmitting(true);
    try {
      const assetId = item.assetId || item.asset?.id;
      if (!assetId) {
        throw new Error('Không tìm thấy Asset ID tương ứng để đề xuất');
      }

      await api.post('/inventory/normalize/suggest', {
        assetId: Number(assetId),
        suggestedName: item.asset?.assetName || item.assetName || '',
        suggestedSerial: checkForm.actualSerialNumber || '',
        suggestedLocation: checkForm.actualLocation || '',
        suggestedUser: checkForm.actualUserName || '',
        note: 'Đề xuất cập nhật từ bàn đối soát kiểm kê'
      });

      toast.success('Đã gửi đề xuất cập nhật sổ sách thành công!');
      
      const url = activeSession
        ? `/inventory/sessions/${activeSession.id}/check`
        : `/inventory/check/${session.id}/check`;

      await api.post(url, {
        itemId: item.id,
        actualLocation: checkForm.actualLocation,
        actualUserName: checkForm.actualUserName,
        actualSerialNumber: checkForm.actualSerialNumber,
        actualStatus: checkForm.actualStatus,
        appearance: checkForm.appearance,
        checkCondition: checkForm.checkCondition,
        status: 'CHECKED'
      });

      setSelectedItemForCheck(null);
      await fetchDetail();
      await fetchScanLogs();

      // Auto-refocus scan input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi gửi đề xuất điều chỉnh');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanSubmit = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const barcodeToQuery = (customCode || scanCodeInput).trim();
    if (!barcodeToQuery) return;

    try {
      setSubmitting(true);
      
      const payload = {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: activeSession ? undefined : String(session.id),
        sessionId: activeSession ? String(activeSession.id) : undefined,
        barcode: barcodeToQuery,
        scanSource: 'MANUAL',
        scope: {
          city: scanScopeCity || undefined,
          location: scanScopeLocation || undefined,
          project: scanScopeProject || undefined,
          department: scanScopeDepartment || undefined,
          user: scanScopeUser || undefined,
          isScopeLocked
        }
      };

      const response = await api.post('/inventory/fast-scan', payload);
      const data = response.data;
      const action = data.action;
      const item = data.item || data.items?.[0] || null;
      const asset = data.asset || (item && item.asset) || null;

      // Reset scan input
      setScanCodeInput('');

      if (action === 'DUPLICATE_IGNORED') {
        toast.info('Đã bỏ qua mã quét trùng');
        // Auto-refocus scan input
        setTimeout(() => {
          scanInputRef.current?.focus();
        }, 100);
        return;
      }

      if (action === 'MATCH_AUTO_SAVED') {
        playBeep('success');
        toast.success(data.message || 'Tự động kiểm kê thành công!');
        
        await fetchDetail();
        await fetchScanLogs();

        setSuccessFlashItem(item);
        setTimeout(() => setSuccessFlashItem(null), 3000);

        setTimeout(() => {
          scanInputRef.current?.focus();
        }, 100);

      } else if (
        action === 'NEED_REVIEW' || 
        action === 'MISMATCH_LOCATION' || 
        action === 'MISMATCH_USER' || 
        action === 'MISMATCH_SERIAL' ||
        action === 'ALREADY_CHECKED'
      ) {
        playBeep('warning');
        if (action === 'ALREADY_CHECKED') {
          toast.info(data.message || 'Tài sản này đã được kiểm kê trước đó.');
        } else {
          toast.warn('Thông tin tài sản lệch sổ sách. Vui lòng đối soát thủ công.');
        }
        
        setSelectedItemForCheck(item);
        setCheckForm({
          checkCondition: item.checkCondition || 'FOUND',
          actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
          actualLocation: item.actualLocation || item.expectedLocation || item.bookLocationName || item.asset?.locationName || '',
          actualUserName: item.actualUserName || item.asset?.currentUserName || '',
          actualSerialNumber: item.actualSerialNumber || item.asset?.serialNumber || '',
          appearance: item.appearance || 'GOOD',
          operation: item.operation || 'NORMAL',
          wearRate: item.wearRate || 0,
          photos: item.photos || [],
          note: item.note || ''
        });

      } else if (action === 'OUT_OF_SCOPE') {
        playBeep('warning');
        toast.error('Tài sản không thuộc phạm vi kỳ kiểm kê hiện tại!');
        
      } else if (action === 'NOT_FOUND') {
        playBeep('warning');
        toast.error(`Không tìm thấy tài sản "${barcodeToQuery}"`);
        
      } else if (action === 'DUPLICATE_CODE') {
        playBeep('warning');
        toast.warn('Trùng mã tài sản hoặc số serial!');
        setDuplicateAssets(data.items || []);
        setShowDuplicateModal(true);
      }

    } catch (err: any) {
      playBeep('warning');
      toast.error(err.response?.data?.message || 'Lỗi tra cứu kiểm kê');
    } finally {
      setSubmitting(false);
    }
  };

  // Debounce for manual scanning input
  useEffect(() => {
    if (scanCodeInput.trim().length < 3) return;

    const handler = setTimeout(() => {
      handleScanSubmit(undefined, scanCodeInput);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [scanCodeInput]);

  const handleCheckItem = async (statusOverride?: 'PENDING' | 'CHECKED') => {
    if (!selectedItemForCheck) return;
    setSubmitting(true);
    
    let finalStatus = checkForm.actualStatus;
    let finalLocation = checkForm.actualLocation;
    let finalQuality = checkForm.quality;
    
    if (checkForm.checkCondition === 'MISSING') {
      finalStatus = 'LOST';
      finalQuality = 'LOST';
      finalLocation = selectedItemForCheck.expectedLocation || selectedItemForCheck.asset?.locationName || '';
    }

    if (activeSession) {
      try {
        await api.post(`/inventory/session-details/${selectedItemForCheck.id}`, {
          actualUserName: checkForm.actualUserName,
          actualDepartmentName: checkForm.actualDepartmentName || activeSession.departmentName || '',
          actualLocationName: checkForm.actualLocation,
          resultStatus: checkForm.checkCondition === 'MISSING' ? 'MISSING' : checkForm.resultStatus || 'MATCH',
          note: checkForm.note,
          imageUrl: checkForm.photos?.[0] || ''
        });
        
        playBeep('success');
        toast.success(`Đã kiểm kê mã TS: ${selectedItemForCheck.assetCode || selectedItemForCheck.asset?.assetCode}`);
        
        // Add to history
        const newHistoryItem = {
          id: Date.now().toString(),
          assetCode: selectedItemForCheck.assetCode || selectedItemForCheck.asset?.assetCode,
          assetName: selectedItemForCheck.assetName || selectedItemForCheck.asset?.assetName,
          actualLocation: checkForm.actualLocation,
          actualUserName: checkForm.actualUserName,
          result: checkForm.checkCondition === 'MISSING' ? 'Báo mất' : 'Đã kiểm kê',
          scannedAt: new Date().toLocaleTimeString('vi-VN')
        };
        setScanHistory(prev => [newHistoryItem, ...prev]);

        setSelectedItemForCheck(null);
        fetchDetail();
        
        // Focus back to input
        setTimeout(() => {
          scanInputRef.current?.focus();
        }, 100);

      } catch (err: any) {
        toast.error(err.response?.data?.message || "Lỗi khi ghi nhận kiểm kê phiên");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const physicalDetailsJson = JSON.stringify({
      appearance: checkForm.appearance,
      operation: checkForm.operation,
      wearRate: Number(checkForm.wearRate) || 0,
      accessories: checkForm.accessories
    });

    let technicalSpecsJson = undefined;
    const isComputer = selectedItemForCheck.assetCode.startsWith('03.01') || (selectedItemForCheck.asset && selectedItemForCheck.asset.assetName.toLowerCase().includes('laptop')) || (selectedItemForCheck.asset && selectedItemForCheck.asset.assetName.toLowerCase().includes('máy tính'));
    const isPrinter = selectedItemForCheck.asset && selectedItemForCheck.asset.assetName.toLowerCase().includes('máy in');
    if (isComputer) {
      technicalSpecsJson = JSON.stringify({
        cpu: checkForm.cpu,
        ram: checkForm.ram,
        storage: checkForm.storage,
        os: checkForm.os,
        mac: checkForm.mac
      });
    } else if (isPrinter) {
      technicalSpecsJson = JSON.stringify({
        printerCounter: checkForm.printerCounter,
        printerInk: checkForm.printerInk
      });
    }

    try {
      await api.post(`/inventory/item/${selectedItemForCheck.id}/check`, {
        actualStatus: finalStatus,
        actualLocation: finalLocation,
        quality: finalQuality,
        note: checkForm.note,
        photos: checkForm.photos,
        actualUserName: checkForm.actualUserName,
        actualUserId: checkForm.actualUserId,
        actualSerialNumber: checkForm.actualSerialNumber,
        checkCondition: checkForm.checkCondition,
        physicalDetailsJson,
        technicalSpecsJson,
        checkStatus: statusOverride || 'CHECKED'
      });
      
      playBeep('success');
      toast.success(statusOverride === 'PENDING' ? "Đã lưu nháp kết quả kiểm kê" : `Đã kiểm kê mã TS: ${selectedItemForCheck.assetCode}`);
      
      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        assetCode: selectedItemForCheck.assetCode,
        assetName: selectedItemForCheck.asset?.assetName,
        actualLocation: finalLocation,
        actualUserName: checkForm.actualUserName,
        result: statusOverride === 'PENDING' ? 'Lưu nháp' : 'Đã kiểm kê',
        scannedAt: new Date().toLocaleTimeString('vi-VN')
      };
      setScanHistory(prev => [newHistoryItem, ...prev]);

      setSelectedItemForCheck(null);
      fetchDetail(); // Refresh list

      // Focus back to input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);

    } catch (err) {
      toast.error("Lỗi khi ghi nhận kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckModal = (item: any) => {
    setSelectedItemForCheck(item);
    if (activeSession) {
      setCheckForm({
        actualLocation: item.actualLocationName || item.bookLocationName || '',
        actualStatus: item.asset?.status || 'ASSIGNED',
        actualDepartmentName: item.actualDepartmentName || item.bookDepartmentName || '',
        quality: item.resultStatus === 'DAMAGED' ? 'DAMAGED' : 'GOOD',
        note: item.note || '',
        photos: item.imageUrl ? [item.imageUrl] : [],
        checkCondition: item.resultStatus === 'MISSING' ? 'MISSING' : 'FOUND',
        actualUserName: item.actualUserName || item.bookUserName || '',
        actualUserId: null,
        actualSerialNumber: item.serialNumber || item.asset?.serialNumber || '',
        appearance: 'GOOD',
        operation: 'NORMAL',
        wearRate: 0,
        accessories: '',
        cpu: '',
        ram: '',
        storage: '',
        os: '',
        mac: '',
        printerCounter: '',
        printerInk: '',
        resultStatus: item.resultStatus || 'MATCH'
      });
      setCustodianQuery(item.actualUserName || item.bookUserName || '');
      return;
    }

    const initialCondition = (item.actualStatus === 'LOST' || item.quality === 'LOST' || item.checkCondition === 'MISSING') ? 'MISSING' : (item.checkCondition || 'FOUND');

    let appearance = 'GOOD';
    let operation = 'NORMAL';
    let wearRate = 0;
    let accessories = '';
    if (item.physicalDetailsJson) {
      try {
        const pd = JSON.parse(item.physicalDetailsJson);
        appearance = pd.appearance || 'GOOD';
        operation = pd.operation || 'NORMAL';
        wearRate = pd.wearRate || 0;
        accessories = pd.accessories || '';
      } catch (e) {}
    }

    let cpu = '';
    let ram = '';
    let storage = '';
    let os = '';
    let mac = '';
    let printerCounter = '';
    let printerInk = '';
    if (item.asset && item.asset.technicalSpecsJson) {
      try {
        const ts = JSON.parse(item.asset.technicalSpecsJson);
        cpu = ts.cpu || '';
        ram = ts.ram || '';
        storage = ts.storage || '';
        os = ts.os || '';
        mac = ts.mac || '';
        printerCounter = ts.printerCounter || '';
        printerInk = ts.printerInk || '';
      } catch (e) {}
    }

    setCheckForm({
      actualLocation: item.actualLocation || item.expectedLocation || (item.asset && item.asset.locationName) || '',
      actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
      quality: item.quality || 'GOOD',
      note: item.note || '',
      photos: item.photos || [],
      checkCondition: initialCondition,
      actualUserName: item.actualUserName || (item.asset && item.asset.currentUserName) || '',
      actualUserId: item.actualUserId || null,
      actualSerialNumber: item.actualSerialNumber || (item.asset && item.asset.serialNumber) || '',
      appearance,
      operation,
      wearRate,
      accessories,
      cpu,
      ram,
      storage,
      os,
      mac,
      printerCounter,
      printerInk
    });
    setCustodianQuery(item.actualUserName || (item.asset && item.asset.currentUserName) || '');
  };

  const getPhotosByCategory = (category: string): string[] => {
    return (checkForm.photos || [])
      .filter((p: string) => p.startsWith(`${category}|`))
      .map((p: string) => p.split('|')[1]);
  };

  const removePhotoByCategory = (category: string, url: string) => {
    setCheckForm((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((p: string) => p !== `${category}|${url}`)
    }));
  };

  const getCheckStatusBadge = (item: any, form: any) => {
    if (!item) return { text: 'Chờ kiểm', bg: 'bg-slate-100 text-slate-650 border-slate-200' };
    if (form.checkCondition === 'MISSING') {
      return { text: 'Mất tài sản', bg: 'bg-rose-50 text-rose-600 border-rose-250' };
    }
    if (form.checkCondition === 'UNAVAILABLE') {
      return { text: 'Không tiếp cận được', bg: 'bg-indigo-50 text-indigo-600 border-indigo-250' };
    }
    if (form.checkCondition === 'UNKNOWN') {
      return { text: 'Không xác định', bg: 'bg-slate-150 text-slate-700 border-slate-300' };
    }

    const hasDiff = 
      form.actualStatus !== item.expectedStatus ||
      form.actualLocation !== (item.expectedLocation || item.asset.locationName || '') ||
      form.actualUserName !== (item.asset.currentUserName || '') ||
      (form.actualSerialNumber && item.asset.serialNumber && form.actualSerialNumber !== item.asset.serialNumber);

    if (hasDiff) {
      return { text: 'Có sai lệch', bg: 'bg-amber-50 text-amber-600 border-amber-250' };
    }
    return { text: 'Khớp', bg: 'bg-emerald-50 text-emerald-600 border-emerald-250' };
  };

  const getAutoWarnings = (item: any, form: any): string[] => {
    const warnings: string[] = [];
    if (!item) return warnings;

    if (form.actualSerialNumber && item.asset.serialNumber && form.actualSerialNumber !== item.asset.serialNumber) {
      warnings.push(`Số Serial thực tế (${form.actualSerialNumber}) khác với sổ sách (${item.asset.serialNumber}).`);
    }

    if (form.actualUserName && item.asset.currentUserName && form.actualUserName !== item.asset.currentUserName) {
      warnings.push(`Người sử dụng thực tế (${form.actualUserName}) khác với sổ sách (${item.asset.currentUserName}).`);
    }

    if (item.asset.purchaseDate) {
      const pDate = new Date(item.asset.purchaseDate);
      const ageInMs = Date.now() - pDate.getTime();
      const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
      if (ageInYears > 6) {
        warnings.push(`Tài sản đã sử dụng hơn 6 năm (từ ${format(pDate, 'dd/MM/yyyy')}). Cần xem xét thanh lý.`);
      }
    }

    const lastCheckDate = item.asset.lastCheckedAt ? new Date(item.asset.lastCheckedAt) : null;
    if (lastCheckDate) {
      const diffInMs = Date.now() - lastCheckDate.getTime();
      const diffInMonths = diffInMs / (1000 * 60 * 60 * 24 * 30.4375);
      if (diffInMonths > 18) {
        warnings.push(`Đã quá 18 tháng kể từ lần kiểm kê cuối cùng (${format(lastCheckDate, 'dd/MM/yyyy')}).`);
      }
    }

    return warnings;
  };

  const handleBatchScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchScanInput || !batchScanInput.trim()) return;
    const barcode = batchScanInput.trim();
    
    // Add to queue
    const newQueue = [...batchQueue, barcode];
    updateBatchQueue(newQueue);
    setBatchScanInput('');
    playBeep('success');
  };

  // Fetch pending batches from server
  const fetchPendingBatches = async () => {
    try {
      const params: any = {};
      if (session?.id) params.inventoryCheckId = session.id;
      if (activeSession?.id) params.sessionId = activeSession.id;
      const res = await api.get('/inventory/pending-batches', { params });
      setPendingBatches(res.data || []);

      // If activeBatchId is set, load its data
      if (activeBatchId && res.data) {
        const found = (res.data as any[]).find((b: any) => b.batchId === activeBatchId);
        if (found) setActiveBatchData(found);
      }
    } catch (err) {
      console.error('Lỗi tải pending batches:', err);
    }
  };

  const handleProcessBatch = async () => {
    if (batchQueue.length === 0) {
      toast.error("Hàng đợi quét đang trống");
      return;
    }
    if (batchQueue.length > 500) {
      toast.error("Hàng đợi vượt quá 500 mã. Vui lòng xóa bớt hoặc xử lý thành nhiều đợt để tránh nghẽn hệ thống.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/inventory/batch-scan-process', {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        barcodes: batchQueue,
        scope: {
          city: scanScopeCity,
          location: scanScopeLocation,
          project: scanScopeProject,
          department: scanScopeDepartment,
          user: scanScopeUser,
          isScopeLocked
        }
      });

      if (response.data && response.data.success) {
        toast.success("Đã đối chiếu lô quét thành công!");
        
        // Clear local queue and localStorage
        updateBatchQueue([]);
        
        // Store result summary & detailed lists
        setBatchResult(response.data);
        setShowBatchScanModal(false);

        const newBatchId = response.data.batchId;
        setActiveBatchId(newBatchId);

        const mappedBatchData = {
          batchId: newBatchId,
          createdAt: new Date().toISOString(),
          totalCount: response.data.summary.totalScanned,
          groups: {
            matchPendingItems: response.data.autoSavedItems || [],
            reviewItems: response.data.reviewItems || [],
            alreadyCheckedItems: response.data.alreadyCheckedItems || [],
            outOfBookItems: response.data.outOfBookItems || [],
            failedItems: response.data.failedItems || []
          }
        };
        setActiveBatchData(mappedBatchData);
        setBatchReviewTab('matchPendingItems');
        setShowBatchReviewWorkspace(true);

        // Refresh pending batches list
        fetchPendingBatches();
      } else {
        toast.error(response.data?.message || "Lỗi đối chiếu lô quét");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi kết nối đến máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Confirm All Matches
  const handleBatchConfirmAll = async () => {
    if (!activeBatchId) return;
    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-confirm', {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        batchId: activeBatchId,
        confirmMatchOnly: true
      });

      if (res.data?.success) {
        const confirmed = res.data.confirmedItems || [];
        const newMeta = { ...batchConfirmedMeta };
        confirmed.forEach((c: any) => {
          newMeta[c.itemId] = { undoDeadline: c.undoDeadline, confirmedAt: c.confirmedAt };
        });
        setBatchConfirmedMeta(newMeta);
        toast.success(`Đã xác nhận ${confirmed.length} tài sản khớp!`);

        // Refresh data
        fetchDetail();
        fetchScanLogs();
        fetchPendingBatches();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận lô');
    } finally {
      setSubmitting(false);
    }
  };

  const getBatchItemKey = (groupKey: string, item: any, idx?: number) =>
    `${groupKey}:${item.id || item.itemId || item.barcode || idx}`;

  const setBatchCardStatus = (groupKey: string, item: any, status: string, idx?: number) => {
    setBatchCardStatuses(prev => ({ ...prev, [getBatchItemKey(groupKey, item, idx)]: status }));
  };

  const getBatchCardStatus = (groupKey: string, item: any, idx?: number) => {
    const status = batchCardStatuses[getBatchItemKey(groupKey, item, idx)];
    if (status) return status;
    if (item.checkStatus === 'CHECKED' || batchConfirmedMeta[item.id]) return 'CONFIRMED';
    if (item.checkStatus === 'ACTUAL_UPDATED') return 'EDITED';
    if (item.result === 'OUT_OF_BOOK_REGISTERED' || item.outOfBookStatus === 'REGISTERED') return 'PENDING_BOOK_UPDATE';
    if (item.result === 'OUT_OF_BOOK_IGNORED' || item.outOfBookStatus === 'IGNORED') return 'SKIPPED';
    return 'UNPROCESSED';
  };

  const getBatchCardStatusLabel = (status: string) => {
    switch (status) {
      case 'EDITED': return 'Đã chỉnh sửa';
      case 'PENDING_CONFIRM': return 'Chờ xác nhận';
      case 'CONFIRMED': return 'Đã xác nhận';
      case 'SKIPPED': return 'Đã bỏ qua';
      case 'PENDING_BOOK_UPDATE': return 'Chờ duyệt cập nhật sổ';
      default: return 'Chưa xử lý';
    }
  };

  const getBatchGroupProgress = (groupKey: string) => {
    const items = activeBatchData?.groups?.[groupKey] || [];
    const processed = items.filter((item: any, idx: number) => getBatchCardStatus(groupKey, item, idx) !== 'UNPROCESSED').length;
    return { processed, total: items.length, pct: items.length ? Math.round((processed / items.length) * 100) : 0 };
  };

  const hasUnprocessedBatchCards = () => {
    if (!activeBatchData?.groups) return false;
    return ['matchPendingItems', 'reviewItems', 'alreadyCheckedItems', 'outOfBookItems', 'failedItems']
      .some(groupKey => (activeBatchData.groups[groupKey] || []).some((item: any, idx: number) => getBatchCardStatus(groupKey, item, idx) === 'UNPROCESSED'));
  };

  const closeBatchReviewWorkspace = () => {
    if (hasUnprocessedBatchCards()) {
      toast.warning('Còn tài sản trong lô chưa xử lý. Vui lòng xác nhận, tạm lưu, bỏ qua hoặc tạo yêu cầu xử lý trước khi đóng.');
      return;
    }
    setShowBatchReviewWorkspace(false);
  };

  // Batch Confirm Single Item
  const handleBatchConfirmItem = async (item: any) => {
    if (!activeBatchId) return;
    const editData = batchReviewEditData[item.id] || {};
    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-confirm', {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        batchId: activeBatchId,
        confirmedItems: [{
          id: item.id,
          assetCode: item.barcode,
          actualLocation: editData.actualLocation || item.expectedLocation || '',
          actualUser: editData.actualUser || item.expectedUser || '',
          actualDepartment: editData.actualDepartment || item.expectedDepartment || '',
          actualProject: editData.actualProject || item.expectedProject || '',
          actualStatus: editData.actualStatus || item.expectedStatus || 'GOOD',
          quality: editData.quality || 'GOOD',
          checkCondition: editData.checkCondition || 'FOUND',
          serial: editData.serial || item.expectedSerial || '',
          note: editData.note || ''
        }]
      });

      if (res.data?.success) {
        const confirmed = res.data.confirmedItems || [];
        if (confirmed.length > 0) {
          const newMeta = { ...batchConfirmedMeta };
          confirmed.forEach((c: any) => {
            newMeta[c.itemId] = { undoDeadline: c.undoDeadline, confirmedAt: c.confirmedAt };
          });
          setBatchConfirmedMeta(newMeta);
        }
        toast.success('Xác nhận kiểm kê thành công!');
        fetchDetail();
        fetchScanLogs();
        fetchPendingBatches();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận');
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Save Only (Chỉ Lưu - không xác nhận, không tăng tiến độ)
  const handleBatchSaveOnly = async (item: any) => {
    if (!activeBatchId) return;
    const editData = batchReviewEditData[item.id] || {};
    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-save', {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        batchId: activeBatchId,
        savedItems: [{
          id: item.id,
          assetCode: item.barcode,
          actualLocation: editData.actualLocation || item.actualLocation || '',
          actualUser: editData.actualUser || item.actualUser || '',
          actualDepartment: editData.actualDepartment || item.actualDepartment || '',
          actualProject: editData.actualProject || item.actualProject || '',
          actualStatus: editData.actualStatus || item.actualStatus || '',
          quality: editData.quality || '',
          serial: editData.serial || '',
          note: editData.note || ''
        }]
      });
      if (res.data?.success) {
        toast.success('Đã lưu thực tế (chưa xác nhận kiểm kê)');
        setBatchCardStatus(batchReviewTab, item, 'EDITED');
        fetchPendingBatches();
        // Close editing mode
        setEditingItemIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu thực tế');
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Propose Book Update (Đề xuất cập nhật sổ sách)
  const handleBatchProposeBookUpdate = async (item: any) => {
    if (!activeBatchId) return;
    const editData = batchReviewEditData[item.id] || {};

    // Build fields array - only include fields that differ between actual and book
    const fields: { fieldName: string; oldValue: string; newValue: string; reason: string }[] = [];
    
    const actLoc = editData.actualLocation || item.actualLocation || item.expectedLocation || '';
    const actUser = editData.actualUser || item.actualUser || item.expectedUser || '';
    const actDept = editData.actualDepartment || item.actualDepartment || item.expectedDepartment || '';
    const actProj = editData.actualProject || item.actualProject || item.expectedProject || '';
    const actSerial = editData.serial || item.actualSerial || item.expectedSerial || '';
    const actStatus = editData.actualStatus || item.actualStatus || item.expectedStatus || '';

    if (actLoc && actLoc !== item.expectedLocation) {
      fields.push({ fieldName: 'locationName', oldValue: item.expectedLocation || '', newValue: actLoc, reason: 'Sai lệch vị trí phát hiện trong kiểm kê' });
    }
    if (actUser && actUser !== item.expectedUser) {
      fields.push({ fieldName: 'currentUserName', oldValue: item.expectedUser || '', newValue: actUser, reason: 'Sai lệch người sử dụng phát hiện trong kiểm kê' });
    }
    if (actDept && actDept !== item.expectedDepartment) {
      fields.push({ fieldName: 'departmentName', oldValue: item.expectedDepartment || '', newValue: actDept, reason: 'Sai lệch phòng ban phát hiện trong kiểm kê' });
    }
    if (actProj && actProj !== item.expectedProject) {
      fields.push({ fieldName: 'projectName', oldValue: item.expectedProject || '', newValue: actProj, reason: 'Sai lệch dự án phát hiện trong kiểm kê' });
    }
    if (actSerial && actSerial !== item.expectedSerial) {
      fields.push({ fieldName: 'serialNumber', oldValue: item.expectedSerial || '', newValue: actSerial, reason: 'Sai lệch Serial phát hiện trong kiểm kê' });
    }
    if (actStatus && actStatus !== item.expectedStatus) {
      fields.push({ fieldName: 'status', oldValue: item.expectedStatus || '', newValue: actStatus, reason: 'Sai lệch trạng thái sử dụng phát hiện trong kiểm kê' });
    }

    if (fields.length === 0) {
      toast.info('Không có trường nào sai lệch để đề xuất cập nhật');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-propose-book-update', {
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        batchId: activeBatchId,
        assetId: item.assetId,
        itemId: item.id,
        fields
      });
      if (res.data?.success) {
        toast.success(`Đã tạo ${res.data.proposals} đề xuất cập nhật sổ. Chờ phê duyệt từ Admin.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo đề xuất cập nhật sổ');
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Undo
  const handleBatchUndo = async (itemId: number) => {
    if (!activeBatchId) return;
    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-undo', {
        batchId: activeBatchId,
        itemIds: [itemId]
      });

      if (res.data?.success) {
        const newMeta = { ...batchConfirmedMeta };
        delete newMeta[itemId];
        setBatchConfirmedMeta(newMeta);
        toast.success('Hoàn tác thành công!');
        fetchDetail();
        fetchScanLogs();
        fetchPendingBatches();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi hoàn tác');
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Confirm All Reviews
  const handleBatchConfirmAllReviews = async () => {
    if (!activeBatchId || !activeBatchData) return;
    const reviewItems = activeBatchData.groups.reviewItems || [];
    if (reviewItems.length === 0) {
      toast.info('Không có tài sản cần rà soát trong lô này');
      return;
    }

    setSubmitting(true);
    try {
      const itemsToConfirm = reviewItems.map((item: any) => {
        const editData = batchReviewEditData[item.id] || {};
        return {
          id: item.id,
          assetCode: item.barcode,
          actualLocation: editData.actualLocation || item.expectedLocation || '',
          actualUser: editData.actualUser || item.expectedUser || '',
          actualDepartment: editData.actualDepartment || item.expectedDepartment || '',
          actualProject: editData.actualProject || item.expectedProject || '',
          actualStatus: editData.actualStatus || item.expectedStatus || 'GOOD',
          quality: editData.quality || 'GOOD',
          checkCondition: editData.checkCondition || 'FOUND',
          serial: editData.serial || item.expectedSerial || '',
          note: editData.note || ''
        };
      });

      const res = await api.post('/inventory/batch-confirm', {
        mode: activeSession ? 'SESSION' : 'CHECK',
        inventoryCheckId: session?.id,
        sessionId: activeSession?.id,
        batchId: activeBatchId,
        confirmedItems: itemsToConfirm
      });

      if (res.data?.success) {
        const confirmed = res.data.confirmedItems || [];
        if (confirmed.length > 0) {
          const newMeta = { ...batchConfirmedMeta };
          confirmed.forEach((c: any) => {
            newMeta[c.itemId] = { undoDeadline: c.undoDeadline, confirmedAt: c.confirmedAt };
          });
          setBatchConfirmedMeta(newMeta);
        }
        toast.success(`Đã xác nhận thành công ${confirmed.length} tài sản rà soát!`);
        fetchDetail();
        fetchScanLogs();
        fetchPendingBatches();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xác nhận tất cả');
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Cancel
  const handleBatchCancel = async () => {
    if (!activeBatchId) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy bỏ toàn bộ lô quét này? Tất cả các tài sản chưa được xác nhận trong lô sẽ bị xóa khỏi hàng đợi.')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/inventory/batch-cancel', {
        batchId: activeBatchId
      });

      if (res.data?.success) {
        toast.success('Đã hủy bỏ lô quét thành công.');
        setActiveBatchId('');
        setActiveBatchData(null);
        fetchPendingBatches();
        fetchScanLogs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi hủy lô quét');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadBatchReport = () => {
    if (!batchResult) return;
    const { summary, autoSavedItems, reviewItems, alreadyCheckedItems, outOfBookItems, failedItems, batchId } = batchResult;
    
    let text = `BÁO CÁO KẾT QUẢ KIỂM KÊ HÀNG LOẠT (BATCH REPORT)\n`;
    text += `Mã lô xử lý: ${batchId || 'N/A'}\n`;
    text += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
    text += `Kỳ kiểm kê: ${session?.inventoryName || 'N/A'} (${session?.inventoryCode || 'N/A'})\n`;
    if (activeSession) {
      text += `Phiên kiểm kê: ${activeSession.locationName || 'N/A'} (Người kiểm: ${activeSession.checkerName || 'N/A'})\n`;
    }
    text += `========================================================\n\n`;
    text += `TỔNG HỢP SỐ LIỆU:\n`;
    text += `- Tổng số mã đã quét: ${summary.totalScanned}\n`;
    text += `- Số mã độc nhất: ${summary.uniqueBarcodes}\n`;
    text += `- Số mã trùng lặp trong lô: ${summary.duplicatedInBatch}\n`;
    text += `- Tự động hoàn tất (Khớp): ${summary.autoSaved}\n`;
    text += `- Cần rà soát (Sai lệch): ${summary.needReview}\n`;
    text += `- Đã kiểm kê trước đó: ${summary.alreadyChecked}\n`;
    text += `- Ngoài phạm vi lọc: ${summary.outOfScope}\n`;
    text += `- Tài sản ngoài sổ sách: ${summary.outOfBook}\n`;
    text += `- Mã lỗi hệ thống: ${summary.failed}\n\n`;

    text += `========================================================\n`;
    text += `DANH SÁCH CHI TIẾT CÁC MỤC:\n\n`;

    if (autoSavedItems?.length > 0) {
      text += `1. DANH SÁCH TỰ ĐỘNG HOÀN TẤT (KHỚP HOÀN TOÀN) (${autoSavedItems.length}):\n`;
      autoSavedItems.forEach((item: any, idx: number) => {
        text += `   [${idx + 1}] Mã: ${item.barcode} | Tên: ${item.assetName || 'Tài sản'}\n`;
      });
      text += `\n`;
    }

    if (reviewItems?.length > 0) {
      text += `2. DANH SÁCH CẦN RÀ SOÁT (SAI LỆCH VỊ TRÍ/NGƯỜI DÙNG/SERIAL) (${reviewItems.length}):\n`;
      reviewItems.forEach((item: any, idx: number) => {
        text += `   [${idx + 1}] Mã: ${item.barcode} | Tên: ${item.assetName || 'Tài sản'} | Lý do: ${item.reason}\n`;
      });
      text += `\n`;
    }

    if (alreadyCheckedItems?.length > 0) {
      text += `3. DANH SÁCH ĐÃ KIỂM KÊ TRƯỚC ĐÓ (${alreadyCheckedItems.length}):\n`;
      alreadyCheckedItems.forEach((item: any, idx: number) => {
        text += `   [${idx + 1}] Mã: ${item.barcode} | Tên: ${item.assetName || 'Tài sản'}\n`;
      });
      text += `\n`;
    }

    if (outOfBookItems?.length > 0) {
      text += `4. DANH SÁCH TÀI SẢN NGOÀI SỔ (CHƯA CÓ TRONG KỲ) (${outOfBookItems.length}):\n`;
      outOfBookItems.forEach((item: any, idx: number) => {
        text += `   [${idx + 1}] Mã: ${item.barcode} | Trạng thái: ${item.status || 'Chưa định nghĩa'}\n`;
      });
      text += `\n`;
    }

    if (failedItems?.length > 0) {
      text += `5. DANH SÁCH MÃ LỖI XỬ LÝ / NGOÀI PHẠM VI (${failedItems.length}):\n`;
      failedItems.forEach((item: any, idx: number) => {
        text += `   [${idx + 1}] Mã: ${item.barcode} | Tên: ${item.assetName || 'Tài sản'} | Chi tiết: ${item.reason || item.detail}\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_kiem_ke_lo_${batchId || 'N/A'}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseSession = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn chốt đợt kiểm kê này? Dữ liệu sẽ không thể chỉnh sửa sau khi chốt.")) return;
    
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${id}/close`);
      toast.success("Đã chốt đợt kiểm kê thành công");
      fetchDetail();
    } catch (err) {
      toast.error("Lỗi khi chốt đợt kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu kiểm kê...</p>
      </div>
    );
  }

  const filteredItems = activeSession
    ? (activeSession.details || []).filter((item: any) => {
        const matchesSearch = (item.assetCode || '').toLowerCase().includes(search.toLowerCase()) || 
                              (item.assetName || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'ALL' || 
                              (filter === 'PENDING' && !item.checkedAt) || 
                              (filter === 'CHECKED' && !!item.checkedAt);
        return matchesSearch && matchesFilter;
      })
    : (session?.items || []).filter((item: any) => {
        const matchesSearch = item.assetCode.toLowerCase().includes(search.toLowerCase()) || 
                              item.asset.assetName.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'ALL' || (filter === 'PENDING' && item.checkStatus === 'PENDING') || (filter === 'CHECKED' && item.checkStatus === 'CHECKED');
        return matchesSearch && matchesFilter;
      });

  const stats = activeSession
    ? {
        total: activeSession.details?.length || 0,
        checked: activeSession.details?.filter((i: any) => i.checkedAt).length || 0,
        pending: activeSession.details?.filter((i: any) => !i.checkedAt).length || 0,
        matched: activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus === 'MATCH').length || 0,
        wrongLocation: activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus === 'WRONG_LOCATION').length || 0,
        missing: activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus === 'MISSING').length || 0,
        damaged: activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus === 'DAMAGED').length || 0,
        wrongStatus: activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus === 'WRONG_STATUS').length || 0,
      }
    : {
        total: session?.items.length || 0,
        checked: session?.items.filter((i: any) => i.checkStatus === 'CHECKED').length || 0,
        pending: session?.items.filter((i: any) => i.checkStatus === 'PENDING').length || 0,
        matched: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MATCHED').length || 0,
        wrongLocation: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_LOCATION').length || 0,
        missing: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MISSING').length || 0,
        damaged: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'DAMAGED').length || 0,
        wrongStatus: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_STATUS').length || 0,
      };

  const checkers = activeSession
    ? [activeSession.checkerName].filter(Boolean)
    : Array.from(new Set(session?.items.map((i: any) => i.checkedBy).filter(Boolean))) as string[];

  const lastUpdatedAt = activeSession
    ? activeSession.details?.map((i: any) => i.checkedAt).filter(Boolean).reduce((max: Date | null, current: string) => {
        const curDate = new Date(current);
        if (!max || curDate > max) return curDate;
        return max;
      }, null)
    : session?.items.map((i: any) => i.checkedAt).filter(Boolean).reduce((max: Date | null, current: string) => {
        const curDate = new Date(current);
        if (!max || curDate > max) return curDate;
        return max;
      }, null) as Date | null;

  // Status translation mapping
  const getStatusLabelText = (status: string) => {
    if (!status) return 'N/A';
    switch (status.toUpperCase()) {
      case 'IN_STOCK': return 'Trong kho';
      case 'ASSIGNED': return 'Đang sử dụng';
      case 'REPAIRING': return 'Đang sửa chữa';
      case 'LIQUIDATED': return 'Đã thanh lý';
      case 'LOST': return 'Đã báo mất';
      case 'GOOD': return 'Tốt';
      case 'DAMAGED': return 'Lỗi/Hỏng';
      default: return status;
    }
  };

  const renderBatchComparisonTable = (item: any, isEditing: boolean, editData: any, updateItemEditData: (fields: any) => void) => {
    // Expected values
    const expLoc = item.expectedLocation || 'N/A';
    const expDept = item.expectedDepartment || 'N/A';
    const expProj = item.expectedProject || 'N/A';
    const expUser = item.expectedUser || 'N/A';
    const expSerial = item.expectedSerial || 'N/A';
    const expStatus = item.expectedStatus || 'IN_STOCK';
    const expQuality = 'Tốt'; // expected quality/condition is typically 'Tốt' or GOOD

    // Actual values (fall back to expected if not edited)
    const actLoc = editData.actualLocation !== undefined ? editData.actualLocation : (item.actualLocation || expLoc);
    const actDept = editData.actualDepartment !== undefined ? editData.actualDepartment : (item.actualDepartment || expDept);
    const actProj = editData.actualProject !== undefined ? editData.actualProject : (item.actualProject || expProj);
    const actUser = editData.actualUser !== undefined ? editData.actualUser : (item.actualUser || expUser);
    const actSerial = editData.serial !== undefined ? editData.serial : (item.actualSerial || item.serial || expSerial);
    const actStatusRaw = editData.actualStatus !== undefined ? editData.actualStatus : (item.actualStatus || expStatus);
    const actQualityRaw = editData.quality !== undefined ? editData.quality : (item.quality || 'GOOD');

    // Mismatches
    const locMismatch = expLoc !== actLoc;
    const deptMismatch = expDept !== actDept;
    const projMismatch = expProj !== actProj;
    const userMismatch = expUser !== actUser;
    const serialMismatch = expSerial !== actSerial;
    const statusMismatch = expStatus !== actStatusRaw;
    const qualityMismatch = actQualityRaw === 'DAMAGED' || actQualityRaw === 'LOST';

    const getResultCell = (mismatch: boolean, label: string) => {
      if (mismatch) {
        return (
          <span className="inline-flex items-center text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider animate-pulse">
            ⚠ {label}
          </span>
        );
      }
      return <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider">✓ Khớp</span>;
    };

    return (
      <div className="space-y-3 mt-2">
        <div className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 font-black text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[9px] h-8">
                <th className="p-2 pl-3">Thông tin</th>
                <th className="p-2">Sổ sách</th>
                <th className="p-2">Thực tế</th>
                <th className="p-2 pr-3 text-center">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
              <tr className={locMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Vị trí</td>
                <td className="p-2">{expLoc}</td>
                <td className={`p-2 ${locMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{actLoc}</td>
                <td className="p-2 text-center">{getResultCell(locMismatch, "Lệch vị trí")}</td>
              </tr>
              <tr className={deptMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Phòng ban</td>
                <td className="p-2">{expDept}</td>
                <td className={`p-2 ${deptMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{actDept}</td>
                <td className="p-2 text-center">{getResultCell(deptMismatch, "Lệch phòng ban")}</td>
              </tr>
              <tr className={projMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Dự án</td>
                <td className="p-2">{expProj}</td>
                <td className={`p-2 ${projMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{actProj}</td>
                <td className="p-2 text-center">{getResultCell(projMismatch, "Lệch dự án")}</td>
              </tr>
              <tr className={userMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Người sử dụng</td>
                <td className="p-2">{expUser}</td>
                <td className={`p-2 ${userMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{actUser}</td>
                <td className="p-2 text-center">{getResultCell(userMismatch, "Lệch người dùng")}</td>
              </tr>
              <tr className={serialMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Số Serial</td>
                <td className="p-2">{expSerial}</td>
                <td className={`p-2 ${serialMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{actSerial}</td>
                <td className="p-2 text-center">{getResultCell(serialMismatch, "Lệch Serial")}</td>
              </tr>
              <tr className={statusMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Trạng thái sử dụng</td>
                <td className="p-2">{getStatusLabelText(expStatus)}</td>
                <td className={`p-2 ${statusMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{getStatusLabelText(actStatusRaw)}</td>
                <td className="p-2 text-center">{getResultCell(statusMismatch, "Lệch trạng thái")}</td>
              </tr>
              <tr className={qualityMismatch ? "bg-amber-50/20" : ""}>
                <td className="p-2 pl-3 text-slate-400">Tình trạng tài sản</td>
                <td className="p-2">{expQuality}</td>
                <td className={`p-2 ${qualityMismatch ? "text-amber-800 font-extrabold" : "text-slate-800"}`}>{getStatusLabelText(actQualityRaw)}</td>
                <td className="p-2 text-center">{getResultCell(qualityMismatch, actQualityRaw === 'DAMAGED' ? "Hỏng" : "Mất")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {isEditing && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 mt-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Vị trí thực tế</label>
              <input
                type="text"
                placeholder={expLoc}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.actualLocation || ''}
                onChange={e => updateItemEditData({ actualLocation: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Người sử dụng thực tế</label>
              <input
                type="text"
                placeholder={expUser}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.actualUser || ''}
                onChange={e => updateItemEditData({ actualUser: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phòng ban thực tế</label>
              <input
                type="text"
                placeholder={expDept}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.actualDepartment || ''}
                onChange={e => updateItemEditData({ actualDepartment: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dự án thực tế</label>
              <input
                type="text"
                placeholder={expProj}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.actualProject || ''}
                onChange={e => updateItemEditData({ actualProject: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Serial thực tế</label>
              <input
                type="text"
                placeholder={expSerial}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.serial || ''}
                onChange={e => updateItemEditData({ serial: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Trạng thái sử dụng</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.actualStatus || expStatus}
                onChange={e => updateItemEditData({ actualStatus: e.target.value })}
              >
                <option value="IN_STOCK">Trong kho</option>
                <option value="ASSIGNED">Đang sử dụng</option>
                <option value="REPAIRING">Đang sửa chữa</option>
                <option value="LIQUIDATED">Đã thanh lý</option>
                <option value="LOST">Đã báo mất</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tình trạng tài sản</label>
              <select
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.quality || 'GOOD'}
                onChange={e => updateItemEditData({ quality: e.target.value })}
              >
                <option value="GOOD">Tốt</option>
                <option value="DAMAGED">Lỗi/Hỏng</option>
                <option value="LOST">Mất</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ghi chú điều chỉnh</label>
              <input
                type="text"
                placeholder="Nhập ghi chú điều chỉnh..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                value={editData.note || ''}
                onChange={e => updateItemEditData({ note: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* ROLE SIMULATOR SWITCHER */}
      <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold shadow-md">
        <span className="flex items-center gap-2 text-slate-300">
          ⚙️ Giả lập Vai trò Kiểm kê:
        </span>
        <div className="flex flex-wrap gap-2">
          {(['ADMIN_TS', 'TRUONG_DOAN', 'NGUOI_KK', 'PHONG_BAN', 'BAN_LANH_DAO'] as const).map(role => (
            <button
              key={role}
              onClick={() => setSimulatedRole(role)}
              className={`px-3 py-1.5 rounded-lg uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
                simulatedRole === role 
                  ? 'bg-primary-650 text-white font-black' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {role === 'ADMIN_TS' ? 'Admin TS' :
               role === 'TRUONG_DOAN' ? 'Trưởng đoàn KK' :
               role === 'NGUOI_KK' ? 'Người kiểm kê' :
               role === 'PHONG_BAN' ? 'Đại diện Phòng ban' : 'Ban lãnh đạo'}
            </button>
          ))}
        </div>
      </div>
      {/* HEADER */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <button onClick={() => navigate('/inventory')} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors">
              <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">{session.inventoryName}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                session.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                session.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-250' :
                session.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-250' :
                session.status === 'COMPLETED' ? 'bg-purple-50 text-purple-600 border-purple-250' :
                'bg-rose-50 text-rose-600 border-rose-250'
              }`}>
                {session.status === 'DRAFT' ? 'Nháp' :
                 session.status === 'OPEN' ? 'Đang mở' :
                 session.status === 'IN_PROGRESS' ? 'Đang kiểm kê' :
                 session.status === 'COMPLETED' ? 'Đã hoàn thành' :
                 session.status === 'CANCELLED' ? 'Đã hủy' : session.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end items-center shrink-0">
            {hasAdminRights() && session.status === 'DRAFT' && (
              <button 
                onClick={handleStartSession}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Bắt đầu kiểm kê
              </button>
            )}

            {hasTruongDoanRights() && (session.status === 'OPEN' || session.status === 'IN_PROGRESS') && !activeSession && (
              <>
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="bg-primary-600 hover:bg-primary-750 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-lg shadow-primary-100 cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" /> Tạo phiên kiểm kê
                </button>
                <button
                  onClick={() => document.getElementById('sessions-list-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-sm cursor-pointer"
                >
                  Danh sách phiên
                </button>
              </>
            )}

            {hasAdminRights() && (session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
              <div className="relative group">
                <button 
                  onClick={handleCloseSession}
                  disabled={submitting || (sessions.length > 0 && !sessions.every((s: any) => s.status === 'COMPLETED'))}
                  className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-xl shadow-slate-250 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />} Chốt đợt kiểm kê
                </button>
                {sessions.length > 0 && !sessions.every((s: any) => s.status === 'COMPLETED') && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-white text-[10px] p-2 rounded-xl text-center font-bold opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg leading-normal">
                    Cần hoàn thành tất cả phiên kiểm kê trước
                  </div>
                )}
              </div>
            )}

            {(session.status === 'OPEN' || session.status === 'IN_PROGRESS' || session.status === 'COMPLETED') && (
              <button
                onClick={() => {
                  setShowReportCenterModal(true);
                  // Initialize filters from session
                  setReportFilters({
                    company: sessionForm.companyName || '',
                    project: sessionForm.projectName || '',
                    department: sessionForm.departmentName || ''
                  });
                }}
                className="bg-blue-600 hover:bg-blue-750 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-lg shadow-blue-100 cursor-pointer gap-1"
              >
                <FileText className="mr-1 h-4 w-4" /> Xuất báo cáo ▼
              </button>
            )}

            {hasAdminRights() && (session.status === 'DRAFT' || session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
              <button 
                onClick={handleCancelSession}
                disabled={submitting}
                className="bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />} Hủy đợt kiểm kê
              </button>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Bắt đầu: <span className="text-slate-800">{session.inventoryDate ? format(new Date(session.inventoryDate), 'dd/MM/yyyy') : 'N/A'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Dự kiến xong: <span className="text-slate-800">{session.expectedFinishDate ? format(new Date(session.expectedFinishDate), 'dd/MM/yyyy') : 'Không giới hạn'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Người phụ trách: <span className="text-slate-800">{session.responsiblePerson || 'Chưa phân công'}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Phạm vi: <span className="text-slate-800 truncate" title={session.scopeType === 'ALL' ? 'Toàn công ty' : session.scopeType === 'COMPANY' ? `Công ty: ${session.scopeValue}` : `Phòng ban: ${session.scopeValue}`}>{session.scopeType === 'ALL' ? 'Toàn công ty' : session.scopeType === 'COMPANY' ? `Công ty: ${session.scopeValue}` : `Phòng ban: ${session.scopeValue}`}</span></span>
          </div>
        </div>

        {/* WORKFLOW PROGRESS BAR */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quy trình kiểm kê</p>
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {([
              { key: 'DRAFT', label: 'Tạo phiên' },
              { key: 'PENDING', label: 'Chờ kiểm kê' },
              { key: 'OPEN', label: 'Đang kiểm kê' },
              { key: 'FIELD_COMPLETED', label: 'HT Thực địa' },
              { key: 'DEVIATION_PROCESSING', label: 'Đang xử lý sai lệch' },
              { key: 'PENDING_APPROVAL', label: 'Chờ phê duyệt' },
              { key: 'COMPLETED', label: 'Đã chốt' }
            ] as const).map((step, idx, arr) => {
              // Calculate active state
              const statusOrder = ['DRAFT', 'PENDING', 'OPEN', 'FIELD_COMPLETED', 'DEVIATION_PROCESSING', 'PENDING_APPROVAL', 'COMPLETED'];
              const currentIdx = statusOrder.indexOf(session.status);
              const stepIdx = statusOrder.indexOf(step.key);
              const isActive = step.key === session.status || (session.status === 'IN_PROGRESS' && step.key === 'OPEN');
              const isPast = stepIdx < currentIdx;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                      isActive ? 'bg-primary-600 text-white border-primary-650 shadow-md shadow-primary-100 scale-110' :
                      isPast ? 'bg-emerald-500 text-white border-emerald-600' :
                      'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {isPast ? '✓' : idx + 1}
                    </span>
                    <span className={`text-[11px] font-black uppercase tracking-wider ${
                      isActive ? 'text-primary-650 font-black' :
                      isPast ? 'text-emerald-600 font-bold' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`hidden md:block h-0.5 flex-1 transition-all ${
                      isPast ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {session.note && (
          <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <strong>Ghi chú:</strong> {session.note}
          </p>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {activeSession ? (
          <>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tài sản cần kiểm</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                <p className="text-[11px] text-slate-450 mt-1 font-bold">Phiên: {activeSession.departmentName || activeSession.locationName}</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ClipboardList className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đã kiểm</p>
                <p className="text-3xl font-black text-emerald-600">
                  {stats.checked} <span className="text-sm text-slate-450">/ {stats.total}</span>
                </p>
                <p className="text-[11px] text-slate-450 mt-1 font-bold">Hoàn thành {Math.round((stats.checked / stats.total) * 100) || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-450 uppercase tracking-widest mb-1">Khớp</p>
                <p className="text-3xl font-black text-blue-600">{stats.matched}</p>
                <p className="text-[11px] text-slate-450 mt-1 font-bold">Sổ sách thực tế trùng khớp</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-550"><CheckCircle2 className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-rose-450 uppercase tracking-widest mb-1">Sai lệch</p>
                <p className="text-3xl font-black text-rose-600">{stats.checked - stats.matched}</p>
                <p className="text-[11px] text-slate-450 mt-1 font-bold">Cần lập biên bản xử lý</p>
              </div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-550"><AlertCircle className="h-6 w-6" /></div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng TS toàn công ty</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold text-[9px] uppercase">Sổ sách</span>
                  <p className="text-[11px] text-slate-450 font-bold">{stats.checked} đã kiểm • {stats.pending} chờ</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><ClipboardList className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Đã kiểm kê</p>
                <p className="text-3xl font-black text-emerald-600">
                  {stats.checked} <span className="text-xs text-slate-450">/ {stats.total}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase">
                    {stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0}%
                  </span>
                  <p className="text-[11px] text-slate-450 font-bold">Tiến độ thực tế</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-black text-rose-455 uppercase tracking-widest mb-1">Sai lệch toàn đợt</p>
                <p className="text-3xl font-black text-rose-600">
                  {stats.wrongLocation + stats.missing + stats.damaged + stats.wrongStatus}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[9px] uppercase">Cảnh báo</span>
                  <p className="text-[11px] text-slate-450 font-bold">Khớp sổ sách: {stats.matched}</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500"><AlertCircle className="h-6 w-6" /></div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Chờ xác nhận</p>
                <p className="text-3xl font-black text-amber-600">
                  {discoveredAssets.length} <span className="text-xs text-slate-450">mã tạm</span>
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold text-[9px] uppercase">Phát sinh ngoài sổ</span>
                  <p className="text-[11px] text-slate-450 font-bold">Chưa duyệt mã</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500"><Tag className="h-6 w-6" /></div>
            </div>
          </>
        )}
      </div>

      {/* TIMELINE SECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          📅 Lộ trình thực hiện & Mốc tiến độ
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 overflow-x-auto py-2">
          {[
            { date: '15/06', label: 'Bắt đầu kiểm kê', desc: 'Lập kế hoạch & mở đợt', color: 'bg-blue-500' },
            { date: '18/06', label: 'Hoàn thành VP Hà Nội', desc: 'Kiểm xong thực địa C6', color: 'bg-emerald-500' },
            { date: '30/06', label: 'Dự án hoàn thành', desc: 'Kiểm xong Danko Center/Riverside', color: 'bg-emerald-500' },
            { date: '15/07', label: 'Hoàn tất kiểm kê', desc: 'Đóng tất cả các phiên kiểm địa', color: 'bg-amber-500' },
            { date: '31/07', label: 'Chốt dữ liệu', desc: 'Duyệt sai lệch & cập nhật sổ', color: 'bg-purple-500' }
          ].map((item, idx, arr) => (
            <div key={idx} className="flex flex-row md:flex-col items-center gap-3 md:text-center min-w-[150px] w-full">
              <div className="flex items-center w-full md:justify-center">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white ${item.color} shadow-md shrink-0`}>
                  {item.date}
                </span>
                {idx < arr.length - 1 && (
                  <div className="hidden md:block h-0.5 bg-slate-100 flex-1 ml-2" />
                )}
              </div>
              <div className="flex flex-col md:items-center">
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.label}</p>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5 leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DISCRE      {/* SESSIONS LIST SECTION */}
      {!activeSession && sessions.length > 0 && (
        <div id="sessions-list-section" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-500" /> Các phiên kiểm kê trong đợt
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phiên</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phạm vi</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TS</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hoàn thành</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sai lệch</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BB</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((item: any) => {
                  const totalCount = item.assetCountPlan || item._count?.details || 0;
                  const checkedCount = item.details?.filter((d: any) => d.checkedAt).length || 0;
                  const deviationCount = item.details?.filter((d: any) => d.checkedAt && d.resultStatus !== 'MATCH').length || 0;
                  const completionRate = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">{format(new Date(item.scheduledDate), 'dd/MM')}</td>
                      <td className="p-4">
                        <p className="text-sm font-black text-slate-800">{item.projectName || item.locationName || 'Tất cả vị trí'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Phụ trách: {item.checkerName || '-'}</p>
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-700">{item.departmentName || 'Toàn bộ'}</td>
                      <td className="p-4 text-center text-sm font-bold text-slate-800">{totalCount}</td>
                      <td className="p-4 text-center text-sm font-bold text-slate-800">{completionRate}%</td>
                      <td className="p-4 text-center text-sm font-bold text-rose-600">{deviationCount}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleViewSessionReport(item.id)}
                          title="Xem biên bản kiểm kê phiên"
                          className="p-1 text-slate-500 hover:text-slate-800 transition-colors border-0 bg-transparent cursor-pointer text-base"
                        >
                          📄
                        </button>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2 items-center">
                        {item.status === 'PENDING' ? (
                          <button
                            onClick={() => handleStartSessionVisit(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5" /> Bắt đầu
                          </button>
                        ) : item.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => openSession(item)}
                            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary-100"
                          >
                            Vào kiểm kê
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold italic mr-2">Đã chốt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSession && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-750 p-6 rounded-3xl border border-primary-700 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-200">Phiên kiểm kê đang hoạt động</p>
            <h2 className="text-xl font-black tracking-tight">Kiểm kê {activeSession.departmentName || activeSession.locationName}</h2>
            <p className="text-xs font-bold text-primary-100 flex flex-wrap gap-4 mt-1">
              <span>Ngày: {format(new Date(activeSession.scheduledDate), 'dd/MM/yyyy')}</span>
              <span>Người kiểm: {activeSession.checkerName || '-'}</span>
              <span>Đại diện phòng ban ký: {activeSession.representativeName || '-'}</span>
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => handleViewSessionReport(activeSession.id)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              In biên bản
            </button>
            {activeSession.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleCompleteSession(activeSession.id)}
                className="bg-white text-primary-750 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Hoàn thành phiên kiểm kê
              </button>
            )}
            <button
              onClick={() => handleDeleteSession(activeSession.id)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xóa phiên
            </button>
            <button
              onClick={() => setActiveSession(null)}
              className="bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Thoát phiên
            </button>
          </div>
        </div>
      )}

      {/* TABS SWITCHER */}

      <div className="flex border-b border-slate-200 bg-white px-8 rounded-t-3xl border-t border-x">
        <button
          onClick={() => setActiveTab('CHECK_LIST')}
          className={`flex items-center gap-2 py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'CHECK_LIST' 
              ? 'border-primary-600 text-primary-650' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Danh sách đối soát ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('DISCOVERED_LIST')}
          className={`flex items-center gap-2 py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'DISCOVERED_LIST' 
              ? 'border-primary-600 text-primary-650' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Plus className="h-4 w-4" /> Tài sản ngoài sổ ({discoveredAssets.length})
        </button>
        {session?.status === 'COMPLETED' && (
          <button
            onClick={() => setActiveTab('POST_INVENTORY')}
            className={`flex items-center gap-2 py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
              activeTab === 'POST_INVENTORY' 
                ? 'border-primary-600 text-primary-650' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" /> Kết quả sau kiểm kê
          </button>
        )}
        <button
          onClick={() => setActiveTab('REPORTS_LIST')}
          className={`flex items-center gap-2 py-4 px-6 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${
            activeTab === 'REPORTS_LIST' 
              ? 'border-primary-600 text-primary-650' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="h-4 w-4" /> File báo cáo ({reportHistoryFiles.length})
        </button>
      </div>

      {activeTab === 'CHECK_LIST' && (
        <div className="bg-white rounded-b-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          
          {/* VÙNG QUÉT MÃ VÀ ĐỐI SOÁT NHANH */}
          {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && hasNguoiKKRights() && (
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CỘT TRÁI: KHU VỰC QUÉT MÃ & THỐNG KÊ */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-xs uppercase tracking-widest text-[#0F1720]">Bàn quét kiểm kê</h3>
                    </div>

                    <form onSubmit={handleScanSubmit} className="space-y-3">
                      <div className="relative">
                        <input
                          ref={scanInputRef}
                          type="text"
                          className="w-full bg-slate-50 border border-slate-250 rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-slate-800 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all outline-none"
                          placeholder="Quét Barcode/QR hoặc nhập mã..."
                          value={scanCodeInput}
                          onChange={(e) => setScanCodeInput(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Tìm
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic">
                        * Súng quét tự động nhấn Enter sau khi quét. Nhập tay nhấn "Tìm".
                      </p>
                    </form>

                    {/* Scope Lock & Selectors */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Phạm vi kiểm kê</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isScopeLocked}
                            onChange={(e) => setIsScopeLocked(e.target.checked)}
                            className="rounded text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-bold text-slate-600">Khóa phạm vi 🔒</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Thành phố</label>
                          <select
                            value={scanScopeCity}
                            onChange={(e) => setScanScopeCity(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                          >
                            <option value="">Tất cả</option>
                            {reviewCities.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Vị trí</label>
                          <select
                            value={scanScopeLocation}
                            onChange={(e) => setScanScopeLocation(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                          >
                            <option value="">Tất cả</option>
                            {reviewLocations.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Dự án</label>
                          <select
                            value={scanScopeProject}
                            onChange={(e) => setScanScopeProject(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                          >
                            <option value="">Tất cả</option>
                            {reviewProjects.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Phòng ban</label>
                          <select
                            value={scanScopeDepartment}
                            onChange={(e) => setScanScopeDepartment(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                          >
                            <option value="">Tất cả</option>
                            {reviewDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Người sử dụng</label>
                        <input
                          type="text"
                          value={scanScopeUser}
                          onChange={(e) => setScanScopeUser(e.target.value)}
                          placeholder="Nhập tên người dùng..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    {/* Stats Dashboard Indicators */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 border border-emerald-150 p-2.5 rounded-2xl text-center">
                        <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-wider">Đã quét</span>
                        <span className="text-xs font-black text-emerald-700 mt-0.5 block">
                          {stats.checked}/{stats.total}
                        </span>
                      </div>
                      <div className="bg-amber-50 border border-amber-150 p-2.5 rounded-2xl text-center">
                        <span className="block text-[8px] font-black text-amber-600 uppercase tracking-wider">Sai lệch</span>
                        <span className="text-xs font-black text-amber-700 mt-0.5 block">
                          {activeSession ? (activeSession.details?.filter((i: any) => i.checkedAt && i.resultStatus !== 'MATCH').length || 0) : (session?.items?.filter((i: any) => i.checkStatus === 'CHECKED' && i.result !== 'MATCHED').length || 0)}
                        </span>
                      </div>
                      <div className="bg-slate-100 border border-slate-250 p-2.5 rounded-2xl text-center">
                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Ngoài sổ</span>
                        <span className="text-xs font-black text-slate-700 mt-0.5 block">
                          {discoveredAssets.length}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBatchScanModal(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center border border-slate-900 shadow-md gap-2"
                    >
                      ⚡ Quét liên tục
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDiscoveredModalOpen(true)}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center border border-emerald-250"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Báo ngoài sổ
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNormalizationOpen(true)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-650 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center border border-blue-200/50 cursor-pointer"
                      >
                        🔧 Chuẩn hóa
                      </button>
                    </div>
                  </div>

                  {/* TIẾN ĐỘ KIỂM KÊ */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-[#0F1720]">Tiến độ kiểm kê</h4>
                      <span className="text-[10px] font-black text-primary-650">
                        {stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.checked / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Đã kiểm</span>
                        <span className="text-lg font-black text-slate-900">{stats.checked}/{stats.total}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Tốc độ quét</span>
                        <span className="text-lg font-black text-slate-900">{getScanSpeed()}</span>
                        <span className="ml-1 text-[9px] font-bold text-slate-400">TS/giờ</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-150 rounded-2xl p-3">
                        <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider">Sai lệch vị trí</span>
                        <span className="text-lg font-black text-amber-700">{stats.wrongLocation}</span>
                      </div>
                      <div className="bg-rose-50 border border-rose-150 rounded-2xl p-3">
                        <span className="block text-[9px] font-black text-rose-600 uppercase tracking-wider">Thiếu/Mất</span>
                        <span className="text-lg font-black text-rose-700">{stats.missing}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI: CHI TIẾT ĐỐI SOÁT */}
                <div className="lg:col-span-2">
                  {selectedItemForCheck ? (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                      <div className="flex justify-between items-start border-b pb-4 border-slate-100">
                        <div>
                          <h3 className="text-md font-black uppercase tracking-widest text-[#0F1720]">Bàn đối soát tài sản</h3>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            Mã TS: <span className="font-mono text-slate-800 mr-4">{selectedItemForCheck.assetCode || selectedItemForCheck.asset?.assetCode}</span>
                            Tên: <span className="text-slate-800">{activeSession ? selectedItemForCheck.assetName : selectedItemForCheck.asset?.assetName}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedItemForCheck(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                        >
                          ✕ Đóng
                        </button>
                      </div>

                      {/* SIDE BY SIDE TABLE */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="p-4 font-bold text-slate-500 w-1/3">Trường thông tin</th>
                              <th className="p-4 font-bold text-slate-600 w-1/3">Sổ sách gốc</th>
                              <th className="p-4 font-bold text-[#0F1720] w-1/3">Thực tế quét</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            <tr className={selectedItemForCheck.expectedLocation !== checkForm.actualLocation ? 'bg-amber-50/40' : ''}>
                              <td className="p-4 font-bold text-slate-500">Vị trí</td>
                              <td className="p-4 font-semibold text-slate-600">
                                {selectedItemForCheck.expectedLocation || selectedItemForCheck.bookLocationName || selectedItemForCheck.asset?.locationName || 'Trong kho'}
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary-500 transition-all"
                                  value={checkForm.actualLocation}
                                  onChange={e => setCheckForm({ ...checkForm, actualLocation: e.target.value })}
                                />
                              </td>
                            </tr>

                            <tr className={selectedItemForCheck.asset?.currentUserName !== checkForm.actualUserName ? 'bg-amber-50/40' : ''}>
                              <td className="p-4 font-bold text-slate-500">Người sử dụng</td>
                              <td className="p-4 font-semibold text-slate-600">
                                {selectedItemForCheck.asset?.currentUserName || 'Chưa bàn giao'}
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary-500 transition-all"
                                  value={checkForm.actualUserName}
                                  onChange={e => setCheckForm({ ...checkForm, actualUserName: e.target.value })}
                                />
                              </td>
                            </tr>

                            <tr className={selectedItemForCheck.asset?.serialNumber !== checkForm.actualSerialNumber ? 'bg-amber-50/40' : ''}>
                              <td className="p-4 font-bold text-slate-500">Số Serial</td>
                              <td className="p-4 font-semibold text-slate-600">
                                {selectedItemForCheck.asset?.serialNumber || 'N/A'}
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-primary-500 transition-all"
                                  value={checkForm.actualSerialNumber}
                                  onChange={e => setCheckForm({ ...checkForm, actualSerialNumber: e.target.value })}
                                />
                              </td>
                            </tr>

                            <tr className={selectedItemForCheck.expectedStatus !== checkForm.actualStatus ? 'bg-amber-50/40' : ''}>
                              <td className="p-4 font-bold text-slate-500">Trạng thái sử dụng</td>
                              <td className="p-4 font-semibold text-slate-600">
                                {selectedItemForCheck.expectedStatus === 'IN_STOCK' ? 'Trong kho' : 'Đang sử dụng'}
                              </td>
                              <td className="p-3">
                                <select
                                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary-500 transition-all"
                                  value={checkForm.actualStatus}
                                  onChange={e => setCheckForm({ ...checkForm, actualStatus: e.target.value })}
                                >
                                  <option value="IN_STOCK">Trong kho</option>
                                  <option value="ASSIGNED">Đang sử dụng</option>
                                  <option value="UNDER_REPAIR">Đang sửa</option>
                                  <option value="DAMAGED">Báo hỏng</option>
                                </select>
                              </td>
                            </tr>

                            <tr>
                              <td className="p-4 font-bold text-slate-500">Ngoại hình vật lý</td>
                              <td className="p-4 font-semibold text-slate-400">N/A</td>
                              <td className="p-3">
                                <select
                                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-primary-500 transition-all"
                                  value={checkForm.appearance}
                                  onChange={e => setCheckForm({ ...checkForm, appearance: e.target.value })}
                                >
                                  <option value="GOOD">Tốt, như mới</option>
                                  <option value="NORMAL">Bình thường, trầy xước</option>
                                  <option value="BAD">Hỏng hóc, nứt vỡ</option>
                                </select>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* ACTION BUTTONS ROW */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => handleKeepBookValues(selectedItemForCheck)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
                        >
                          Giữ nguyên sổ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAsLost(selectedItemForCheck)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-650 py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
                        >
                          Báo mất tài sản
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProposeAdjustment(selectedItemForCheck)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-650 py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
                        >
                          Đề xuất cập nhật sổ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCheckItem('CHECKED')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all col-span-2 md:col-span-1 shadow-md shadow-emerald-200"
                        >
                          Ghi nhận thực tế
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecheckTargetItem(selectedItemForCheck);
                            setRecheckReason('');
                            setShowRecheckModal(true);
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-650 py-3 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all col-span-2 md:col-span-3 border border-amber-250"
                        >
                          Gửi yêu cầu kiểm tra lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[350px] bg-white border border-slate-200 rounded-3xl p-5 lg:p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#0F1720]">Lịch sử quét mã / kết quả kiểm kê gần nhất</h3>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            Theo dõi kết quả vừa kiểm, dữ liệu trong sổ và dữ liệu thực tế trong ngày.
                          </p>
                        </div>
                        {successFlashItem && (
                          <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-650 border border-emerald-150">
                            <Check className="h-3.5 w-3.5" /> Vừa quét thành công
                          </span>
                        )}
                      </div>

                      <div className="max-h-[560px] overflow-y-auto pr-1 space-y-4">
                        {recentInventoryResults.map((item: any) => {
                          const changes = buildInventoryChanges(item);
                          const status = item.resultStatus || item.result || item.rawLog?.result || item.rawLog?.action;
                          const log = item.rawLog;
                          const isDuplicated = log?.result === 'DUPLICATE_IGNORED' || log?.action === 'DUPLICATE_IGNORED';

                          return (
                            <div key={`${item.sourceType || 'item'}-${item.id || log?.id || getAssetCode(item)}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 hover:bg-slate-50 transition-all">
                              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-black text-primary-700 bg-white border border-primary-100 rounded-lg px-2 py-1">
                                      {getAssetCode(item)}
                                    </span>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getInventoryResultClass(status)}`}>
                                      {isDuplicated ? 'Trùng mã' : getInventoryResultLabel(status)}
                                    </span>
                                  </div>
                                  <p className="text-sm font-black text-slate-850 mt-2 leading-snug">{getAssetName(item)}</p>
                                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                                    Người dùng: <span className="text-slate-800">{displayValue(getActualUser(item) || getBookUser(item), 'Chưa cấp phát')}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {!isDuplicated && (
                                    <button
                                      type="button"
                                      onClick={() => openQuickInventoryEdit(item)}
                                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200 transition-all"
                                    >
                                      Chỉnh sửa
                                    </button>
                                  )}
                                  {log && !isDuplicated && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUndoTargetItem(findItemForLog(log) || { id: log.inventoryItemId || log.inventorySessionDetailId || item.id });
                                        setUndoReason('');
                                        setShowUndoModal(true);
                                      }}
                                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-150 transition-all"
                                    >
                                      Hoàn tác
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                <div className="bg-white border border-slate-200 rounded-2xl p-3">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Trong sổ sách</span>
                                  <p className="text-xs font-bold text-slate-800">{formatInventoryPath(getBookCity(item), getBookProject(item), getBookLocation(item))}</p>
                                  <p className="text-[11px] font-semibold text-slate-500 mt-1">Phòng ban: {displayValue(getBookDepartment(item))}</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-3">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Thực tế kiểm kê</span>
                                  <p className="text-xs font-bold text-slate-800">{formatInventoryPath(getActualCity(item) || getBookCity(item), getActualProject(item) || getBookProject(item), getActualLocation(item) || getBookLocation(item))}</p>
                                  <p className="text-[11px] font-semibold text-slate-500 mt-1">Phòng ban: {displayValue(getActualDepartment(item) || getBookDepartment(item))}</p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Thay đổi ghi nhận</span>
                                {changes.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {changes.map((change) => (
                                      <span key={`${change.label}-${change.before}-${change.after}`} className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-150 text-[10px] font-bold text-amber-700">
                                        {change.label}: {change.before} → {change.after}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] font-bold text-emerald-650">Không có thay đổi so với sổ sách.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {recentInventoryResults.length === 0 && (
                          <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
                            <ClipboardList className="h-12 w-12 text-slate-350 mb-4" />
                            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">Chưa có kết quả kiểm kê</h3>
                            <p className="text-slate-400 text-xs mt-2">Quét Barcode/QR hoặc nhập mã ở cột trái để bắt đầu ghi nhận.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Hộp lọc và tìm kiếm danh sách dưới */}
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-1 max-w-lg gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all outline-none"
                  placeholder="Lọc danh sách kiểm kê bên dưới..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="h-5 w-5 text-slate-400 mr-2" />
              {['ALL', 'PENDING', 'CHECKED'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    filter === f ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {f === 'ALL' ? 'Tất cả' : f === 'PENDING' ? 'Chưa kiểm' : 'Đã kiểm'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tài sản</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Người sử dụng / Bộ phận</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí sổ sách</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí thực tế</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kết quả đối soát</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item: any) => {
                  const assetName = activeSession ? item.assetName : (item.asset?.assetName || '');
                  const assetCode = activeSession ? item.assetCode : item.assetCode;
                  const currentUserName = activeSession ? (item.bookUserName || 'N/A') : (item.asset?.currentUserName || 'N/A');
                  const departmentName = activeSession ? (item.bookDepartmentName || 'Không có bộ phận') : (item.asset?.departmentName || 'Không có bộ phận');
                  const expectedLocation = activeSession ? (item.bookLocationName || 'N/A') : (item.expectedLocation || item.asset?.locationName || 'N/A');
                  const actualLocation = activeSession ? (item.actualLocationName || 'N/A') : (item.actualLocation || 'N/A');
                  const isChecked = activeSession ? !!item.checkedAt : (item.checkStatus === 'CHECKED');
                  const resultStatus = activeSession ? item.resultStatus : item.result;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-605 transition-colors">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{assetName}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{assetCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-600">{currentUserName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium ml-5 mt-0.5">{departmentName}</p>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-600">{expectedLocation}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-300" />
                          <span className="text-sm font-bold text-slate-600">
                            {isChecked ? (
                              actualLocation || 'N/A'
                            ) : (
                              <span className="text-slate-350 font-medium italic">Chưa đối soát</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        {!isChecked ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200/50">
                            Chưa kiểm
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            resultStatus === 'MATCH' || resultStatus === 'MATCHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            resultStatus === 'WRONG_LOCATION' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            resultStatus === 'MISSING' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            resultStatus === 'DAMAGED' ? 'bg-red-50 text-red-650 border-red-100' :
                            resultStatus === 'WRONG_USER' ? 'bg-orange-50 text-orange-655 border-orange-100' :
                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}>
                            {resultStatus === 'MATCH' || resultStatus === 'MATCHED' ? 'Khớp' :
                             resultStatus === 'WRONG_LOCATION' ? 'Lệch vị trí' :
                             resultStatus === 'MISSING' ? 'Thiếu/Mất' :
                             resultStatus === 'DAMAGED' ? 'Báo hỏng' :
                             resultStatus === 'WRONG_USER' ? 'Sai người sử dụng' :
                             resultStatus === 'WRONG_STATUS' ? 'Lệch trạng thái' : resultStatus}
                          </span>
                        )}
                      </td>
                      <td className="p-6">
                        {((activeSession ? activeSession.status === 'IN_PROGRESS' : (session.status === 'OPEN' || session.status === 'IN_PROGRESS')) && hasNguoiKKRights()) ? (
                          !isChecked ? (
                            <button 
                              onClick={() => openCheckModal(item)}
                              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all shadow-md shadow-primary-100 cursor-pointer"
                            >
                              Kiểm kê
                            </button>
                          ) : (
                            <button 
                              onClick={() => openCheckModal(item)}
                              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Kiểm lại
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 italic">Đã khóa</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <XCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Không tìm thấy tài sản nào phù hợp</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'DISCOVERED_LIST' && (
        <div className="bg-white rounded-b-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Danh sách tài sản ngoài sổ ghi nhận</h3>
            {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
              <button
                onClick={() => setIsDiscoveredModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" /> Ghi nhận tài sản ngoài sổ
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã tạm</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thông tin phát hiện</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vị trí / Người giữ</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Loại sở hữu</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái duyệt</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isDiscoveredLoading ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <Loader2 className="h-10 w-10 text-primary-600 animate-spin mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Đang tải danh sách tài sản ngoài sổ...</p>
                    </td>
                  </tr>
                ) : discoveredAssets.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-black text-xs">
                        {item.tempCode}
                      </span>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Loại: {item.categoryName || 'Không rõ'}</p>
                      <p className="text-[11px] font-bold text-slate-450 uppercase tracking-tight">Serial: {item.serialNumber || 'N/A'}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-350" />
                        <span className="text-sm font-bold text-slate-600">{item.foundLocationName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-3.5 w-3.5 text-slate-355" />
                        <span className="text-[11px] font-bold text-slate-500">{item.foundUserName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-50 border text-slate-600">
                        {item.ownershipStatus === 'COMPANY' ? 'Tài sản Công ty' :
                         item.ownershipStatus === 'PERSONAL' ? 'Tài sản Cá nhân' :
                         item.ownershipStatus === 'CUSTOMER' ? 'Khách hàng ký gửi' :
                         item.ownershipStatus === 'VENDOR' ? 'Nhà cung cấp mượn' :
                         item.ownershipStatus === 'RENTAL' ? 'Thiết bị thuê ngoài' : 'Chưa xác định'}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        item.status === 'MERGED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {item.status === 'APPROVED' ? 'Đã duyệt nhập sổ' :
                         item.status === 'MERGED' ? 'Đã ghép mã' :
                         item.status === 'REJECTED' ? 'Từ chối' : 'Chờ phê duyệt'}
                      </span>
                      {item.note && (
                        <p className="text-[10px] text-slate-400 italic mt-1 max-w-[150px] truncate" title={item.note}>
                          Ghi chú: {item.note}
                        </p>
                      )}
                    </td>
                    <td className="p-6">
                      {item.status === 'PENDING_REVIEW' && isAdmin() ? (
                        <button
                          onClick={() => {
                            setSelectedDiscoveredForReview(item);
                            setReviewForm({
                              status: 'APPROVED',
                              assetId: '',
                              companyId: '',
                              cat4Id: '',
                              departmentName: '',
                              locationName: item.foundLocationName || '',
                              cityName: '',
                              projectName: '',
                              supplierName: '',
                              currentUserName: item.foundUserName || '',
                              note: '',
                              purchasePriceExVat: 0,
                              purchaseDate: format(new Date(), 'yyyy-MM-dd'),
                              serialNumber: item.serialNumber || '',
                              assetName: item.name || '',
                              technicalSpecsJson: ''
                            });
                            setReviewCat1('');
                            setReviewCat2('');
                            setReviewCat3('');
                            setReviewUserQuery(item.foundUserName || '');
                            setReviewSearchAssetQuery('');
                            setReviewAssetSearchResults([]);
                            parseReviewLocationToStates(item.foundLocationName || '');
                          }}
                          className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                          Duyệt xử lý
                        </button>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {discoveredAssets.length === 0 && !isDiscoveredLoading && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <XCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Chưa phát hiện tài sản ngoài sổ nào</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'POST_INVENTORY' && (
        <div className="bg-white rounded-b-[2.5rem] shadow-xl border border-slate-200 p-8 space-y-8">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-800">Kết quả sau kiểm kê</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Danh sách hành động xử lý sau khi chốt đợt kiểm kê</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* 1. Cần cập nhật hồ sơ */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold text-sm">1</div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Cần cập nhật hồ sơ</h4>
                    <p className="text-[11px] text-slate-450 font-bold mt-0.5">Tài sản sai lệch thông tin người dùng hoặc vị trí thực tế</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sổ sách</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thực tế</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = (session?.items || []).filter((item: any) => 
                        item.checkStatus === 'CHECKED' && 
                        (item.result === 'WRONG_LOCATION' || item.result === 'WRONG_USER')
                      );
                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400 font-bold italic">Không có tài sản nào cần cập nhật hồ sơ</td>
                          </tr>
                        );
                      }
                      return list.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="py-3 font-bold">
                            <div className="font-bold text-slate-850">{item.asset?.assetName}</div>
                            <div className="text-[10px] font-mono text-slate-450 uppercase tracking-tight mt-0.5">{item.assetCode}</div>
                          </td>
                          <td className="py-3 text-slate-500 font-medium">
                            <div>Người dùng: {item.asset?.currentUserName || 'Chưa phân bổ'}</div>
                            <div>Vị trí: {item.asset?.locationName || 'N/A'}</div>
                          </td>
                          <td className="py-3 text-slate-800 font-bold">
                            <div className={item.result === 'WRONG_USER' ? 'text-amber-600' : ''}>
                              Người dùng: {item.actualUserName || 'N/A'}
                            </div>
                            <div className={item.result === 'WRONG_LOCATION' ? 'text-amber-600' : ''}>
                              Vị trí: {item.actualLocation || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => navigate('/handover', { state: { assetCode: item.assetCode } })}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Tạo điều chuyển
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Chờ xử lý mất */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 font-bold text-sm">2</div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Chờ xử lý mất</h4>
                    <p className="text-[11px] text-slate-455 font-bold mt-0.5">Tài sản không tìm thấy trong quá trình đối soát</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí sổ</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hướng xử lý</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = (session?.items || []).filter((item: any) => 
                        item.checkStatus === 'CHECKED' && item.result === 'MISSING'
                      );
                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400 font-bold italic">Không có tài sản nào bị báo mất</td>
                          </tr>
                        );
                      }
                      return list.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="py-3 font-bold">
                            <div className="font-bold text-slate-850">{item.asset?.assetName}</div>
                            <div className="text-[10px] font-mono text-slate-450 uppercase tracking-tight mt-0.5">{item.assetCode}</div>
                          </td>
                          <td className="py-3 text-slate-500 font-medium">{item.asset?.locationName || 'N/A'}</td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {['TÌM_KIẾM_LẠI', 'LẬP_BB_MẤT', 'BỒI_HOÀN', 'GIẢM_TÀI_SẢN'].map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setResolutions(prev => ({ ...prev, [item.assetCode]: opt }))}
                                  className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                                    resolutions[item.assetCode] === opt 
                                      ? 'bg-rose-600 text-white border-rose-650' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-650'
                                  }`}
                                >
                                  {opt === 'TÌM_KIẾM_LẠI' ? '🔍 Tìm kiếm lại' :
                                   opt === 'LẬP_BB_MẤT' ? '📄 Mất - lập BB' :
                                   opt === 'BỒI_HOÀN' ? '💸 Bồi hoàn' : '📉 Giảm tài sản'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            {resolutions[item.assetCode] === 'LẬP_BB_MẤT' ? (
                              <button
                                onClick={() => navigate('/operational/lost', { state: { assetCode: item.assetCode } })}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-rose-100"
                              >
                                Biên bản mất
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  toast.success(`Đã lưu hướng xử lý: ${
                                    resolutions[item.assetCode] === 'TÌM_KIẾM_LẠI' ? 'Tìm kiếm lại' :
                                    resolutions[item.assetCode] === 'BỒI_HOÀN' ? 'Bồi hoàn' : 'Giảm tài sản'
                                  }`);
                                }}
                                disabled={!resolutions[item.assetCode]}
                                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                              >
                                Xác nhận
                              </button>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Chờ sửa chữa */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-655 font-bold text-sm">3</div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Chờ sửa chữa</h4>
                    <p className="text-[11px] text-slate-450 font-bold mt-0.5">Tài sản báo hỏng cần sửa chữa khắc phục</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người sử dụng</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = (session?.items || []).filter((item: any) => 
                        item.checkStatus === 'CHECKED' && item.result === 'DAMAGED'
                      );
                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400 font-bold italic">Không có tài sản nào chờ sửa chữa</td>
                          </tr>
                        );
                      }
                      return list.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="py-3 font-bold">
                            <div className="font-bold text-slate-850">{item.asset?.assetName}</div>
                            <div className="text-[10px] font-mono text-slate-455 uppercase tracking-tight mt-0.5">{item.assetCode}</div>
                          </td>
                          <td className="py-3 text-slate-500 font-medium">{item.asset?.currentUserName || 'N/A'}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => navigate('/operational/damage', { state: { assetCode: item.assetCode } })}
                              className="px-3 py-1.5 bg-red-655 hover:bg-red-750 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Phiếu sửa chữa
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Tài sản ngoài sổ */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-sm">4</div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Tài sản ngoài sổ</h4>
                    <p className="text-[11px] text-slate-455 font-bold mt-0.5">Tài sản phát hiện thêm trong khi kiểm kê</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã tạm</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tài sản</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn gốc</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {discoveredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 font-bold italic">Không phát hiện tài sản ngoài sổ nào</td>
                      </tr>
                    ) : (
                      discoveredAssets.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/40">
                          <td className="py-3 font-mono font-bold text-slate-800">{item.tempCode}</td>
                          <td className="py-3 font-bold">
                            <div>{item.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.foundLocationName} / {item.foundUserName}</div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {['CHƯA_NHẬP_HỆ_THỐNG', 'NHẬN_BÀN_GIAO', 'KHÔNG_RÕ_NGUỒN'].map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setResolutions(prev => ({ ...prev, [item.tempCode]: opt }))}
                                  className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider font-bold transition-all border cursor-pointer ${
                                    resolutions[item.tempCode] === opt 
                                      ? 'bg-emerald-600 text-white border-emerald-650' 
                                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-655'
                                  }`}
                                >
                                  {opt === 'CHƯA_NHẬP_HỆ_THỐNG' ? 'Chưa nhập hệ thống' :
                                   opt === 'NHẬN_BÀN_GIAO' ? 'Nhận bàn giao' : 'Không rõ nguồn'}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => navigate('/assets/new', { state: { tempName: item.name, tempLocation: item.foundLocationName, origin: resolutions[item.tempCode] } })}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-emerald-100"
                            >
                              Tạo mã mới
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'REPORTS_LIST' && (
        <div className="bg-white rounded-b-[2.5rem] shadow-xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-md font-black uppercase tracking-widest text-slate-800">Lịch sử tệp báo cáo đã xuất</h3>
              <p className="text-[11px] text-slate-455 font-bold mt-0.5">Danh sách các tài liệu Excel, PDF hoặc ZIP đã tạo trong đợt kiểm kê này</p>
            </div>
            <button
              onClick={() => setShowReportCenterModal(true)}
              className="bg-primary-600 hover:bg-primary-750 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center shadow-lg cursor-pointer"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Xuất báo cáo mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tệp</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Định dạng</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dung lượng</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người xuất</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {reportHistoryFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/30 transition-all">
                    <td className="p-4 flex items-center gap-2">
                      <span className="text-base">{file.fileType === 'pdf' ? '📕' : file.fileType === 'xlsx' ? '📘' : '📁'}</span>
                      <span className="text-slate-800 font-black hover:text-primary-650 cursor-pointer" onClick={() => setPreviewFileDetails(file)}>
                        {file.fileName}
                      </span>
                    </td>
                    <td className="p-4 uppercase text-[10px]">
                      <span className={`px-2.5 py-0.5 rounded font-black border ${
                        file.fileType === 'pdf' ? 'bg-red-50 text-red-650 border-red-100' :
                        file.fileType === 'xlsx' ? 'bg-emerald-50 text-emerald-650 border-emerald-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {file.fileType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-455">{file.fileSize}</td>
                    <td className="p-4">{file.creator}</td>
                    <td className="p-4 text-slate-455 font-normal">
                      {format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-3">
                      <button
                        onClick={() => setPreviewFileDetails(file)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-[10px] uppercase cursor-pointer"
                      >
                        👁 Xem
                      </button>
                      <button
                        onClick={() => {
                          toast.success(`Đang tải lại tệp: ${file.fileName}`);
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[10px] uppercase cursor-pointer shadow-sm"
                      >
                        ⬇ Tải lại
                      </button>
                      <button
                        onClick={() => {
                          setReportHistoryFiles(prev => prev.filter(f => f.id !== file.id));
                          toast.success("Đã xóa tệp khỏi lịch sử");
                        }}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] uppercase cursor-pointer"
                      >
                        🗑 Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {reportHistoryFiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-450 italic">
                      Chưa có tệp báo cáo nào được tạo. Bấm "Xuất báo cáo mới" ở trên để bắt đầu!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {quickEditItem && (
        <BaseModal
          isOpen={!!quickEditItem}
          onClose={() => setQuickEditItem(null)}
          title="Chỉnh sửa kết quả kiểm kê"
          size="form"
        >
          <div className="space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tài sản</p>
              <p className="font-mono text-sm font-black text-primary-700 mt-1">{getAssetCode(quickEditItem)}</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{getAssetName(quickEditItem)}</p>
              <p className="text-[11px] text-slate-500 font-bold mt-2">
                Chỉnh sửa này chỉ lưu dữ liệu thực tế của bản ghi kiểm kê, không cập nhật sổ tài sản chính.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Người sử dụng thực tế</label>
                <input
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.actualUserName}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, actualUserName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phòng ban thực tế</label>
                <input
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.actualDepartmentName}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, actualDepartmentName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Thành phố thực tế</label>
                <input
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.actualCityName}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, actualCityName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dự án thực tế</label>
                <input
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.actualProjectName}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, actualProjectName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vị trí thực tế</label>
                <input
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.actualLocationName}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, actualLocationName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Kết quả kiểm kê</label>
                <select
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.resultStatus}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, resultStatus: e.target.value })}
                >
                  <option value="MATCH">Khớp</option>
                  <option value="WRONG_LOCATION">Sai vị trí</option>
                  <option value="WRONG_USER">Sai người sử dụng</option>
                  <option value="WRONG_STATUS">Sai trạng thái</option>
                  <option value="DAMAGED">Hỏng</option>
                  <option value="MISSING">Thiếu/Mất</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tình trạng tài sản</label>
                <select
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  value={quickEditForm.condition}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, condition: e.target.value })}
                >
                  <option value="GOOD">Tốt</option>
                  <option value="NORMAL">Bình thường</option>
                  <option value="DAMAGED">Hỏng</option>
                  <option value="MISSING">Mất/Không thấy</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ghi chú</label>
                <textarea
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary-500"
                  rows={3}
                  value={quickEditForm.note}
                  onChange={(e) => setQuickEditForm({ ...quickEditForm, note: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuickEditItem(null)}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuickInventoryEdit}
                disabled={submitting}
                className="px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                Lưu kết quả
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {selectedItemForCheck && (
        <BaseModal
          isOpen={!!selectedItemForCheck}
          onClose={() => setSelectedItemForCheck(null)}
          size="form"
          title={
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Phiếu kiểm kê thực tế tài sản</h2>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  getCheckStatusBadge(selectedItemForCheck, checkForm).bg
                }`}>
                  {getCheckStatusBadge(selectedItemForCheck, checkForm).text}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-bold space-y-0.5">
                <p>Mã TS: <span className="text-slate-800 font-mono">{selectedItemForCheck.assetCode}</span></p>
                <p>Tên TS: <span className="text-slate-800 text-sm">{selectedItemForCheck.asset.assetName}</span></p>
                <p>Đợt kiểm kê: <span className="text-primary-600 uppercase font-extrabold">{session.inventoryName}</span></p>
              </div>
            </div>
          }
          footer={
            <>
              <button 
                onClick={() => setSelectedItemForCheck(null)} 
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleCheckItem('PENDING')}
                disabled={submitting}
                className="px-5 py-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-250 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center shadow-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Lưu nháp
              </button>
              {checkForm.checkCondition === 'MISSING' ? (
                <button 
                  onClick={() => handleCheckItem('CHECKED')}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-rose-100 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />} Báo mất tài sản
                </button>
              ) : (
                <button 
                  onClick={() => handleCheckItem('CHECKED')}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Hoàn tất kiểm kê
                </button>
              )}
            </>
          }
        >
          <div className="space-y-6 text-xs text-slate-655 max-h-[70vh] overflow-y-auto pr-2">
            
            {/* CẢNH BÁO BẤT THƯỜNG */}
            {getAutoWarnings(selectedItemForCheck, checkForm).length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-750 font-black uppercase text-[10px] tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" /> Cảnh báo bất thường phát hiện
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] font-bold text-red-700">
                  {getAutoWarnings(selectedItemForCheck, checkForm).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* CARD SO SÁNH TỰ ĐỘNG */}
            <div className="border border-slate-200 rounded-3xl bg-slate-50/30 overflow-hidden shadow-sm">
              <div className="bg-slate-100 p-4 font-black uppercase text-[10px] tracking-wider text-slate-500 border-b flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" /> Kết quả đối chiếu (Sổ sách vs Thực tế)
              </div>
              <div className="p-4 divide-y divide-slate-100 font-bold text-slate-600">
                <div className="grid grid-cols-3 py-2 items-center">
                  <div>Trạng thái</div>
                  <div className="text-slate-400 font-medium">
                    {selectedItemForCheck.expectedStatus === 'IN_STOCK' ? 'Trong kho' : 'Đang sử dụng'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {checkForm.checkCondition === 'MISSING' ? (
                      <span className="text-rose-600">🔴 Mất tài sản</span>
                    ) : checkForm.actualStatus === selectedItemForCheck.expectedStatus ? (
                      <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Khớp</span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">↓ Thay đổi ({checkForm.actualStatus === 'IN_STOCK' ? 'Trong kho' : 'Đang sử dụng'})</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 py-2 items-center">
                  <div>Vị trí</div>
                  <div className="text-slate-400 font-medium">
                    {selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || 'Trong kho'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {checkForm.checkCondition === 'MISSING' ? (
                      <span className="text-rose-505">-</span>
                    ) : checkForm.actualLocation === (selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || '') ? (
                      <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Khớp</span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">↓ Sai lệch ({checkForm.actualLocation || 'Chưa điền'})</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 py-2 items-center">
                  <div>Người sử dụng</div>
                  <div className="text-slate-400 font-medium">
                    {selectedItemForCheck.asset.currentUserName || 'Chưa cấp phát'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {checkForm.checkCondition === 'MISSING' ? (
                      <span className="text-rose-505">-</span>
                    ) : checkForm.actualUserName === (selectedItemForCheck.asset.currentUserName || '') ? (
                      <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Khớp</span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">↓ Sai lệch ({checkForm.actualUserName || 'N/A'})</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 py-2 items-center">
                  <div>Số Serial</div>
                  <div className="text-slate-400 font-medium">
                    {selectedItemForCheck.asset.serialNumber || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {checkForm.checkCondition === 'MISSING' ? (
                      <span className="text-rose-505">-</span>
                    ) : checkForm.actualSerialNumber === (selectedItemForCheck.asset.serialNumber || '') ? (
                      <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Khớp</span>
                    ) : (
                      <span className="text-red-655 flex items-center gap-1">↓ Sai lệch ({checkForm.actualSerialNumber || 'Trống'})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT TRÁI - CHI TIẾT ĐỐI SOÁT */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-655 border-b pb-2 flex items-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" /> Chi tiết đối soát thực tế
                </h4>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tình trạng kiểm kê *</label>
                  <select 
                    value={checkForm.checkCondition}
                    onChange={e => {
                      const cond = e.target.value;
                      if (cond === 'MISSING') {
                        setCheckForm({
                          ...checkForm,
                          checkCondition: cond,
                          actualStatus: 'LOST',
                          quality: 'LOST',
                          actualLocation: selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || 'Trong kho'
                        });
                      } else {
                        setCheckForm({
                          ...checkForm,
                          checkCondition: cond,
                          actualStatus: selectedItemForCheck.actualStatus || selectedItemForCheck.expectedStatus || 'IN_STOCK',
                          quality: selectedItemForCheck.quality || 'GOOD'
                        });
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-primary-50 focus:border-primary-500"
                  >
                    <option value="FOUND">🟢 Đã tìm thấy (FOUND)</option>
                    <option value="MISSING">🔴 Không tìm thấy / Báo mất (MISSING)</option>
                    <option value="UNAVAILABLE">🟡 Không tiếp cận được (UNAVAILABLE)</option>
                    <option value="UNKNOWN">⚫ Không xác định nguồn gốc (UNKNOWN)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Trạng thái sử dụng thực tế *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.actualStatus}
                    onChange={e => setCheckForm({...checkForm, actualStatus: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                  >
                    <option value="IN_STOCK">Trong kho (IN_STOCK)</option>
                    <option value="ASSIGNED">Đang sử dụng (ASSIGNED)</option>
                    <option value="UNDER_REPAIR">Đang bảo dưỡng/sửa chữa (UNDER_REPAIR)</option>
                    <option value="DAMAGED">Báo hỏng (DAMAGED)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Người sử dụng thực tế *</label>
                  <div className="relative">
                    <input 
                      type="text"
                      disabled={checkForm.checkCondition === 'MISSING'}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-850 text-xs"
                      placeholder="Nhập tên người đang giữ thực tế..."
                      value={checkForm.actualUserName}
                      onChange={e => handleCustodianQuery(e.target.value)}
                      onFocus={() => { if (custodianSuggestions.length > 0) setShowCustodianDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowCustodianDropdown(false), 200)}
                    />
                    {showCustodianDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {custodianSuggestions.map((name: string) => (
                          <button
                            key={name}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-705"
                            onClick={() => {
                              setCheckForm((prev: any) => ({ ...prev, actualUserName: name }));
                              setCustodianSuggestions([]);
                              setShowCustodianDropdown(false);
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số Serial thực tế *</label>
                  <input 
                    type="text"
                    disabled={checkForm.checkCondition === 'MISSING'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-850 text-xs"
                    placeholder="Quét hoặc nhập số Serial trên vỏ máy..."
                    value={checkForm.actualSerialNumber}
                    onChange={e => setCheckForm({...checkForm, actualSerialNumber: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Vị trí phòng/bàn thực tế *</label>
                  <input 
                    type="text"
                    disabled={checkForm.checkCondition === 'MISSING'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-855 text-xs"
                    placeholder="Ví dụ: P.302, Tòa A Danko..."
                    value={checkForm.actualLocation}
                    onChange={e => setCheckForm({...checkForm, actualLocation: e.target.value})}
                  />
                </div>
              </div>

              {/* CỘT PHẢI - THÔNG TIN TÌNH TRẠNG VẬT LÝ */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-655 border-b pb-2 flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" /> Đánh giá vật lý & hao mòn
                </h4>

                <div className="space-y-1">
                  <label className="font-bold text-slate-505">Ngoại hình vật lý *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.appearance}
                    onChange={e => setCheckForm({...checkForm, appearance: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-805 text-xs disabled:opacity-50"
                  >
                    <option value="GOOD">Tốt, như mới / không trầy xước (GOOD)</option>
                    <option value="SCRATCHED">Bình thường, có trầy xước nhẹ (SCRATCHED)</option>
                    <option value="BROKEN">Kém, bể vỡ móp méo nặng (BROKEN)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-805">Khả năng hoạt động *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.operation}
                    onChange={e => setCheckForm({...checkForm, operation: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-805 text-xs disabled:opacity-50"
                  >
                    <option value="NORMAL">Hoạt động bình thường ổn định (NORMAL)</option>
                    <option value="ERROR">Chập chờn, lỗi chức năng (ERROR)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-550">
                    <label>Tỷ lệ hao mòn đánh giá *</label>
                    <span>{checkForm.wearRate}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.wearRate}
                    onChange={e => setCheckForm({...checkForm, wearRate: Number(e.target.value)})}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-505">Phụ kiện đi kèm phát hiện</label>
                  <input 
                    type="text"
                    disabled={checkForm.checkCondition === 'MISSING'}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-850 text-xs"
                    placeholder="Sạc laptop, túi xách, cáp tín hiệu..."
                    value={checkForm.accessories}
                    onChange={e => setCheckForm({...checkForm, accessories: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-505">Chất lượng tổng quát *</label>
                  <select 
                    disabled={checkForm.checkCondition === 'MISSING'}
                    value={checkForm.quality}
                    onChange={e => setCheckForm({...checkForm, quality: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-805 text-xs disabled:opacity-50"
                  >
                    <option value="GOOD">Tốt (GOOD)</option>
                    <option value="NORMAL">Bình thường (NORMAL)</option>
                    <option value="BAD">Kém / hao mòn (BAD)</option>
                    <option value="DAMAGED">Hỏng / lỗi (DAMAGED)</option>
                    <option value="LOST">Mất (LOST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* THÔNG TIN KỸ THUẬT IT / MÁY IN */}
            {(selectedItemForCheck.assetCode.startsWith('03.01') || 
              selectedItemForCheck.asset.assetName.toLowerCase().includes('laptop') || 
              selectedItemForCheck.asset.assetName.toLowerCase().includes('máy tính') ||
              selectedItemForCheck.asset.assetName.toLowerCase().includes('máy in')) && (
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/10 space-y-4 mt-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0F1720] border-b pb-2 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-primary-500 animate-spin" style={{ animationDuration: '10s' }} /> Thông số kỹ thuật thiết bị (IT Technical Specs)
                </h4>

                {selectedItemForCheck.asset.assetName.toLowerCase().includes('máy in') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Số trang in hiện tại (Page Counter)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="Ví dụ: 12,450 trang..."
                        value={checkForm.printerCounter}
                        onChange={e => setCheckForm({...checkForm, printerCounter: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Lượng mực còn lại (%)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="Ví dụ: 80%..."
                        value={checkForm.printerInk}
                        onChange={e => setCheckForm({...checkForm, printerInk: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Bộ vi xử lý (CPU)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="Intel Core i5-1135G7..."
                        value={checkForm.cpu}
                        onChange={e => setCheckForm({...checkForm, cpu: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Bộ nhớ (RAM)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="16GB DDR4..."
                        value={checkForm.ram}
                        onChange={e => setCheckForm({...checkForm, ram: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Ổ cứng (SSD/HDD)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="512GB NVMe SSD..."
                        value={checkForm.storage}
                        onChange={e => setCheckForm({...checkForm, storage: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Hệ điều hành (OS)</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="Windows 11 Pro..."
                        value={checkForm.os}
                        onChange={e => setCheckForm({...checkForm, os: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="font-bold text-slate-500">Địa chỉ MAC Card mạng</label>
                      <input 
                        type="text"
                        disabled={checkForm.checkCondition === 'MISSING'}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        placeholder="00:1A:2B:3C:4D:5E..."
                        value={checkForm.mac}
                        onChange={e => setCheckForm({...checkForm, mac: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PHÂN CHIA LOẠI ẢNH UPLOAD */}
            <div className="space-y-4 border-t pt-4 border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0F1720] flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-primary-500" /> Tải ảnh bằng chứng theo danh mục
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'LABEL', label: 'Ảnh Tem QR/Asset' },
                  { key: 'SERIAL', label: 'Ảnh Số Serial' },
                  { key: 'CONDITION', label: 'Ảnh Hiện trạng máy' },
                  { key: 'ERROR', label: 'Ảnh Chi tiết lỗi/hỏng' }
                ].map(cat => {
                  const pUrls = getPhotosByCategory(cat.key);
                  return (
                    <div key={cat.key} className="p-3 border border-slate-150 rounded-2xl bg-slate-50/30 flex flex-col items-center justify-between min-h-[140px] text-center space-y-2">
                      <span className="font-bold text-[10px] text-slate-500 uppercase leading-tight">{cat.label}</span>
                      
                      <div className="flex flex-wrap gap-1 justify-center max-w-full">
                        {pUrls.map((url, i) => (
                          <div key={i} className="relative w-10 h-10 border rounded-lg overflow-hidden group">
                            <img src={url} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                            <button
                              type="button"
                              onClick={() => removePhotoByCategory(cat.key, url)}
                              className="absolute inset-0 bg-rose-600/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <label className="w-full py-2 bg-white border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-slate-405 hover:text-primary-655 hover:border-primary-500 transition-all cursor-pointer text-[10px] font-bold">
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={e => handleFileChange(e, cat.key)} 
                          accept="image/*"
                          disabled={checkForm.checkCondition === 'MISSING'}
                        />
                        {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Tải lên'}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ghi chú đối soát */}
            <div className="space-y-1 border-t pt-4 border-slate-100">
              <label className="font-bold text-slate-500">Ghi chú đối soát thực tế</label>
              <textarea 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 h-16 resize-none text-xs"
                placeholder="Nhập ghi chú chi tiết về tình trạng thực tế..."
                value={checkForm.note}
                onChange={e => setCheckForm({...checkForm, note: e.target.value})}
              />
            </div>
          </div>
        </BaseModal>
      )}

      {/* UNDO SCAN MODAL */}
      {showUndoModal && (
        <BaseModal
          isOpen={showUndoModal}
          onClose={() => setShowUndoModal(false)}
          size="confirm"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Hoàn tác lượt quét</h2>
              <p className="text-[10px] text-slate-500 font-bold">Hoàn tác bản ghi kiểm kê thuộc kỳ/phiên hiện tại</p>
            </div>
          }
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setShowUndoModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmUndo}
                disabled={submitting || !undoReason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Xác nhận hoàn tác
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
              ⚠️ Thao tác này sẽ hoàn tác lượt quét hiện tại của tài sản và ghi lại nhật ký kiểm toán (audit log).
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Lý do hoàn tác *</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white h-24 resize-none"
                placeholder="Nhập lý do hoàn tác quét bắt buộc..."
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
              />
            </div>
          </div>
        </BaseModal>
      )}

      {/* RECHECK REQUEST MODAL */}
      {showRecheckModal && (
        <BaseModal
          isOpen={showRecheckModal}
          onClose={() => setShowRecheckModal(false)}
          size="confirm"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Yêu cầu kiểm tra lại</h2>
              <p className="text-[10px] text-slate-500 font-bold">Gửi đề xuất kiểm tra thực tế lần 2 cho quản trị viên</p>
            </div>
          }
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setShowRecheckModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmRecheck}
                disabled={submitting || !recheckReason.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Gửi yêu cầu
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
              ℹ️ Đề xuất sẽ được gửi lên dưới trạng thái chờ duyệt (PENDING_APPROVAL) và không thay đổi trạng thái tài sản cho đến khi được duyệt.
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Lý do yêu cầu kiểm tra lại *</label>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white h-24 resize-none"
                placeholder="Nhập lý do gửi yêu cầu kiểm tra lại..."
                value={recheckReason}
                onChange={(e) => setRecheckReason(e.target.value)}
              />
            </div>
          </div>
        </BaseModal>
      )}

      {/* DISCOVERED ASSET REPORT MODAL */}
      {isDiscoveredModalOpen && (
        <BaseModal
          isOpen={isDiscoveredModalOpen}
          onClose={() => setIsDiscoveredModalOpen(false)}
          size="form"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Ghi nhận tài sản ngoài sổ</h2>
              <p className="text-[10px] text-slate-500 font-bold">Khai báo thiết bị phát hiện trong quá trình kiểm kê nhưng chưa có trên hệ thống</p>
            </div>
          }
          footer={
            <>
              <button 
                onClick={() => setIsDiscoveredModalOpen(false)} 
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={handleReportDiscovered}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Báo cáo phát hiện
              </button>
            </>
          }
        >
          <form onSubmit={handleReportDiscovered} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tên tài sản *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Ví dụ: Laptop Dell Latitude 7420..."
                  value={discoveredForm.name}
                  onChange={e => setDiscoveredForm({...discoveredForm, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Nhóm/Loại tài sản</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Ví dụ: Thiết bị văn phòng, Máy tính..."
                  value={discoveredForm.categoryName}
                  onChange={e => setDiscoveredForm({...discoveredForm, categoryName: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Số Serial</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Nhập số serial trên thân máy..."
                  value={discoveredForm.serialNumber}
                  onChange={e => setDiscoveredForm({...discoveredForm, serialNumber: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Nguồn gốc sở hữu *</label>
                <select
                  value={discoveredForm.ownershipStatus}
                  onChange={e => setDiscoveredForm({...discoveredForm, ownershipStatus: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="UNKNOWN">Chưa xác định (UNKNOWN)</option>
                  <option value="COMPANY">Tài sản Công ty (COMPANY)</option>
                  <option value="PERSONAL">Tài sản cá nhân nhân sự (PERSONAL)</option>
                  <option value="CUSTOMER">Khách hàng ký gửi (CUSTOMER)</option>
                  <option value="VENDOR">Nhà cung cấp cho mượn (VENDOR)</option>
                  <option value="RENTAL">Thiết bị thuê ngoài (RENTAL)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Vị trí phát hiện</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Ví dụ: Phòng họp tầng 3 Danko..."
                  value={discoveredForm.foundLocationName}
                  onChange={e => setDiscoveredForm({...discoveredForm, foundLocationName: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Người đang giữ/sử dụng</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  value={discoveredForm.foundUserName}
                  onChange={e => setDiscoveredForm({...discoveredForm, foundUserName: e.target.value})}
                />
              </div>
            </div>

            {/* Upload ảnh bằng chứng */}
            <div className="space-y-2 border-t pt-4 border-slate-100">
              <label className="font-bold text-slate-500 block">Ảnh minh chứng tài sản ngoài sổ:</label>
              <div className="flex flex-wrap gap-3 items-center">
                {discoveredForm.photos.map((url: string, idx: number) => (
                  <div key={idx} className="relative w-16 h-16 border rounded-xl overflow-hidden group">
                    <img src={url} alt="Bằng chứng ngoài sổ" className="w-full h-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => setDiscoveredForm({
                        ...discoveredForm,
                        photos: discoveredForm.photos.filter((_: any, i: number) => i !== idx)
                      })}
                      className="absolute inset-0 bg-rose-600/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 cursor-pointer bg-slate-50 transition-all">
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleDiscoveredFileChange} 
                    accept="image/*"
                  />
                  {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Mô tả/Ghi chú thêm</label>
              <textarea 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 h-20 resize-none"
                placeholder="Nhập ghi chú chi tiết về tình trạng, nguồn gốc tài sản ngoài sổ..."
                value={discoveredForm.note}
                onChange={e => setDiscoveredForm({...discoveredForm, note: e.target.value})}
              />
            </div>
          </form>
        </BaseModal>
      )}

      {/* DISCOVERED ASSET REVIEW MODAL */}
      {selectedDiscoveredForReview && (
        <BaseModal
          isOpen={!!selectedDiscoveredForReview}
          onClose={() => setSelectedDiscoveredForReview(null)}
          size="form"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Duyệt xử lý tài sản ngoài sổ</h2>
              <p className="text-[10px] text-slate-500 font-bold">Mã tạm: <span className="font-mono text-slate-800">{selectedDiscoveredForReview.tempCode}</span> | Tên: {selectedDiscoveredForReview.name}</p>
            </div>
          }
          footer={
            <>
              <button 
                onClick={() => setSelectedDiscoveredForReview(null)} 
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={handleReviewDiscovered}
                disabled={submitting}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg disabled:opacity-50"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Xác nhận duyệt
              </button>
            </>
          }
        >
          <form onSubmit={handleReviewDiscovered} className="space-y-5 text-xs text-slate-655 max-h-[70vh] overflow-y-auto pr-2">
            
            {/* Ảnh minh chứng ban đầu */}
            {selectedDiscoveredForReview.photos && selectedDiscoveredForReview.photos.length > 0 && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-bold text-[10px] uppercase text-slate-400 block">Ảnh minh chứng ghi nhận:</span>
                <div className="flex gap-2">
                  {selectedDiscoveredForReview.photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-xl border overflow-hidden">
                      <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Lựa chọn phương án xử lý */}
            <div className="space-y-2">
              <label className="font-black text-[10px] uppercase tracking-wider text-slate-500 block">Phương án xử lý *</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'APPROVED', label: '🟢 Duyệt nhập sổ mới', desc: 'Sinh mã chính thức, tạo tài sản mới' },
                  { key: 'MERGED', label: '🔵 Ghép mã có sẵn', desc: 'Chọn tài sản cũ để ghép (mất tem)' },
                  { key: 'REJECTED', label: '🔴 Từ chối / Loại bỏ', desc: 'Không theo dõi thiết bị này' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: opt.key })}
                    className={`p-4 border rounded-2xl text-left transition-all ${
                      reviewForm.status === opt.key 
                        ? 'border-primary-600 bg-primary-50/20 shadow-md ring-2 ring-primary-100' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-bold text-xs">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chi tiết cho từng phương án */}
            {reviewForm.status === 'APPROVED' && (
              <div className="p-5 border border-emerald-100 rounded-3xl bg-emerald-50/10 space-y-5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 border-b pb-2">
                  <Package className="h-3.5 w-3.5" /> Thông tin tạo tài sản mới trên sổ sách
                </h4>

                {/* --- Thông tin cơ bản --- */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Thông tin cơ bản</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Tên tài sản mới *</label>
                    <input 
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                      value={reviewForm.assetName}
                      onChange={e => setReviewForm({...reviewForm, assetName: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Số Serial</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                      value={reviewForm.serialNumber}
                      onChange={e => setReviewForm({...reviewForm, serialNumber: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Công ty quản lý *</label>
                    <select
                      required
                      value={reviewForm.companyId}
                      onChange={e => setReviewForm({...reviewForm, companyId: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn công ty --</option>
                      {companies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- Phân loại tài sản (Cascading) --- */}
                <div className="space-y-1 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phân loại tài sản (chọn theo cây)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Level 1 */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Nhóm 1</label>
                    <select
                      value={reviewCat1}
                      onChange={e => handleReviewCat1Change(e.target.value)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px] focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Nhóm 1 --</option>
                      {getCategoriesByLevel(1).map((c: any) => (
                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Level 2 */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Nhóm 2</label>
                    <select
                      value={reviewCat2}
                      onChange={e => handleReviewCat2Change(e.target.value)}
                      disabled={!reviewCat1}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px] disabled:opacity-40 disabled:bg-slate-50 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Nhóm 2 --</option>
                      {reviewCat1 && getCategoriesByLevel(2, Number(reviewCat1)).map((c: any) => (
                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Level 3 */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Nhóm 3</label>
                    <select
                      value={reviewCat3}
                      onChange={e => handleReviewCat3Change(e.target.value)}
                      disabled={!reviewCat2}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px] disabled:opacity-40 disabled:bg-slate-50 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Nhóm 3 --</option>
                      {reviewCat2 && getCategoriesByLevel(3, Number(reviewCat2)).map((c: any) => (
                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Level 4 */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[10px]">Nhóm 4 *</label>
                    <select
                      required
                      value={reviewForm.cat4Id}
                      onChange={e => setReviewForm({...reviewForm, cat4Id: e.target.value})}
                      disabled={!reviewCat3}
                      className="w-full h-9 px-2.5 bg-white border border-emerald-300 rounded-lg font-bold text-slate-800 text-[11px] disabled:opacity-40 disabled:bg-slate-50 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all ring-1 ring-emerald-100"
                    >
                      <option value="">-- Nhóm 4 --</option>
                      {reviewCat3 && getCategoriesByLevel(4, Number(reviewCat3)).map((c: any) => (
                        <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {reviewForm.cat4Id && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-700">
                      Đã chọn: {allCategories.find((c: any) => c.id === Number(reviewForm.cat4Id))?.name || ''}
                    </span>
                  </div>
                )}

                {/* --- Vị trí & Phòng ban --- */}
                <div className="space-y-1 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vị trí & Phòng ban</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Thành phố */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Thành phố bàn giao đến *</label>
                    <select
                      value={reviewSelectedCity}
                      onChange={(e) => {
                        setReviewSelectedCity(e.target.value);
                        setReviewSelectedProject('');
                        setReviewSelectedLocation('');
                        setReviewCustomCity('');
                        setReviewCustomProject('');
                        setReviewCustomLocation('');
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn thành phố --</option>
                      {Object.keys(LOCATION_HIERARCHY).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  {/* Dự án */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Dự án bàn giao đến *</label>
                    <select
                      value={reviewSelectedProject}
                      disabled={!reviewSelectedCity}
                      onChange={(e) => {
                        setReviewSelectedProject(e.target.value);
                        setReviewSelectedLocation('');
                        setReviewCustomProject('');
                        setReviewCustomLocation('');
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all disabled:opacity-40"
                    >
                      <option value="">-- Chọn dự án --</option>
                      {reviewSelectedCity && reviewSelectedCity !== 'Khác' && Object.keys(LOCATION_HIERARCHY[reviewSelectedCity] || {}).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value="Khác" disabled={!reviewSelectedCity}>Khác</option>
                    </select>
                  </div>

                  {/* Vị trí thực tế */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Vị trí thực tế *</label>
                    <select
                      value={reviewSelectedLocation}
                      disabled={!reviewSelectedProject}
                      onChange={(e) => {
                        setReviewSelectedLocation(e.target.value);
                        setReviewCustomLocation('');
                      }}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all disabled:opacity-40"
                    >
                      <option value="">-- Chọn vị trí --</option>
                      {reviewSelectedCity && reviewSelectedCity !== 'Khác' && reviewSelectedProject && reviewSelectedProject !== 'Khác' && (LOCATION_HIERARCHY[reviewSelectedCity]?.[reviewSelectedProject] || []).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                      <option value="Khác" disabled={!reviewSelectedProject}>Khác</option>
                    </select>
                  </div>

                  {/* Phòng ban sử dụng (Tự điền text + Suggestion dropdown) */}
                  <div className="space-y-1 relative">
                    <label className="font-bold text-slate-500">Phòng ban sử dụng</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold pr-8 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                        placeholder="Nhập tên phòng ban..."
                        value={reviewForm.departmentName || ''}
                        onChange={e => {
                          setReviewForm({...reviewForm, departmentName: e.target.value});
                          setReviewDeptQuery(e.target.value);
                          setShowReviewDeptDropdown(true);
                        }}
                        onFocus={() => setShowReviewDeptDropdown(true)}
                        onBlur={() => setTimeout(() => setShowReviewDeptDropdown(false), 200)}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                    {showReviewDeptDropdown && (
                      <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto mt-1">
                        {reviewDepartments
                          .filter((dept: string) => 
                            dept.toLowerCase().includes((reviewDeptQuery || reviewForm.departmentName || '').toLowerCase())
                          )
                          .map((dept: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 transition-colors"
                              onMouseDown={() => {
                                setReviewForm({...reviewForm, departmentName: dept});
                                setReviewDeptQuery(dept);
                                setShowReviewDeptDropdown(false);
                              }}
                            >
                              {dept}
                            </button>
                          ))}
                        {reviewDepartments.filter((dept: string) => 
                          dept.toLowerCase().includes((reviewDeptQuery || reviewForm.departmentName || '').toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-2 text-xs text-slate-400 italic">Không tìm thấy phòng ban nào (Gõ tự do để thêm mới)</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Các trường nhập giá trị 'Khác' --- */}
                {(reviewSelectedCity === 'Khác' || reviewSelectedProject === 'Khác' || reviewSelectedLocation === 'Khác') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-3">
                    {reviewSelectedCity === 'Khác' && (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Thành phố khác *</label>
                        <input
                          type="text"
                          required
                          value={reviewCustomCity}
                          onChange={(e) => setReviewCustomCity(e.target.value)}
                          placeholder="Nhập tên thành phố..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                        />
                      </div>
                    )}

                    {reviewSelectedProject === 'Khác' && (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Dự án khác *</label>
                        <input
                          type="text"
                          required
                          value={reviewCustomProject}
                          onChange={(e) => setReviewCustomProject(e.target.value)}
                          placeholder="Nhập tên dự án..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                        />
                      </div>
                    )}

                    {reviewSelectedLocation === 'Khác' && (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Vị trí khác *</label>
                        <input
                          type="text"
                          required
                          value={reviewCustomLocation}
                          onChange={(e) => setReviewCustomLocation(e.target.value)}
                          placeholder="Nhập vị trí chi tiết..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* --- Người sử dụng (Autocomplete) --- */}
                <div className="space-y-1 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Người sử dụng</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 relative">
                    <label className="font-bold text-slate-500">Người sử dụng</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold pr-8 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                        placeholder="Tìm tên người sử dụng..."
                        value={reviewUserQuery || reviewForm.currentUserName || ''}
                        onChange={e => handleReviewUserSearch(e.target.value)}
                        onFocus={() => reviewUserSuggestions.length > 0 && setShowReviewUserDropdown(true)}
                        onBlur={() => setTimeout(() => setShowReviewUserDropdown(false), 200)}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                    {showReviewUserDropdown && reviewUserSuggestions.length > 0 && (
                      <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-32 overflow-y-auto mt-1">
                        {reviewUserSuggestions.map((name: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 transition-colors"
                            onMouseDown={() => {
                              setReviewForm({...reviewForm, currentUserName: name});
                              setReviewUserQuery(name);
                              setShowReviewUserDropdown(false);
                            }}
                          >
                            <User className="inline h-3 w-3 mr-1.5 text-slate-400" />{name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Nhà cung cấp</label>
                    <select
                      value={reviewForm.supplierName || ''}
                      onChange={e => setReviewForm({...reviewForm, supplierName: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {reviewSuppliers.map((sup: string, i: number) => (
                        <option key={i} value={sup}>{sup}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- Tài chính --- */}
                <div className="space-y-1 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Thông tin tài chính</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Nguyên giá (ex VAT)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                      value={reviewForm.purchasePriceExVat}
                      onChange={e => setReviewForm({...reviewForm, purchasePriceExVat: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ngày mua</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                      value={reviewForm.purchaseDate}
                      onChange={e => setReviewForm({...reviewForm, purchaseDate: e.target.value})}
                    />
                  </div>
                </div>

                {/* IT Specifications write-back */}
                {(reviewForm.assetName?.toLowerCase().includes('laptop') || 
                  reviewForm.assetName?.toLowerCase().includes('máy tính') || 
                  reviewForm.assetName?.toLowerCase().includes('máy in') ||
                  reviewForm.cat4Id) && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                    <span className="font-bold text-[10px] uppercase text-slate-400 block">Thông số kỹ thuật đi kèm (IT Specs):</span>
                    <textarea
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-[11px] h-16 resize-none"
                      placeholder='Ví dụ: {"cpu":"Core i5-1135G7", "ram":"16GB", "storage":"512GB SSD", "os":"Windows 11"}'
                      value={reviewForm.technicalSpecsJson}
                      onChange={e => setReviewForm({...reviewForm, technicalSpecsJson: e.target.value})}
                    />
                    <p className="text-[10px] text-slate-400">Định dạng JSON Object chứa các thông số phần cứng IT.</p>
                  </div>
                )}
              </div>
            )}

            {reviewForm.status === 'MERGED' && (
              <div className="p-5 border border-blue-100 rounded-3xl bg-blue-50/10 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 border-b pb-2">
                  Ghép với tài sản cũ trên hệ thống (Mất tem QR)
                </h4>
                
                <div className="space-y-2">
                  <label className="font-bold text-slate-500 block">Tìm kiếm tài sản cũ *</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                      placeholder="Tìm theo mã tài sản, số serial hoặc tên..."
                      value={reviewSearchAssetQuery}
                      onChange={e => handleSearchAssetForMerge(e.target.value)}
                    />
                  </div>

                  {searchAssetLoading ? (
                    <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" /></div>
                  ) : reviewAssetSearchResults.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl bg-white max-h-40 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                      {reviewAssetSearchResults.map((asset: any) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, assetId: asset.id, assetName: asset.assetName })}
                          className={`w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors ${
                            Number(reviewForm.assetId) === asset.id ? 'bg-blue-50/50 text-blue-700 font-bold' : 'text-slate-650'
                          }`}
                        >
                          <div>
                            <p className="font-bold">{asset.assetName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Mã: {asset.assetCode} • Serial: {asset.serialNumber || 'N/A'}</p>
                          </div>
                          {Number(reviewForm.assetId) === asset.id && <span className="text-xs text-blue-600 font-black">Đang chọn</span>}
                        </button>
                      ))}
                    </div>
                  ) : reviewSearchAssetQuery.trim().length >= 2 ? (
                    <p className="text-[10px] text-rose-500 italic">Không tìm thấy tài sản nào phù hợp.</p>
                  ) : null}
                </div>

                {reviewForm.assetId && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center text-xs font-bold text-emerald-800">
                    <span>Đã chọn: ID {reviewForm.assetId} - {reviewForm.assetName}</span>
                    <button type="button" onClick={() => setReviewForm({ ...reviewForm, assetId: '', assetName: '' })} className="text-rose-500">Gỡ chọn</button>
                  </div>
                )}
              </div>
            )}

            {reviewForm.status === 'REJECTED' && (
              <div className="p-5 border border-rose-100 rounded-3xl bg-rose-50/10 text-rose-700">
                <p className="font-bold text-xs">⚠️ Lưu ý:</p>
                <p className="text-[11px] mt-1 leading-relaxed">Từ chối ghi nhận tài sản này. Dữ liệu tài sản ngoài sổ sẽ được lưu trữ với trạng thái từ chối (REJECTED) làm bằng chứng kiểm kê, nhưng không ảnh hưởng đến sổ sách chính thức.</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-500">Ý kiến/Ghi chú phê duyệt</label>
              <textarea 
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 h-16 resize-none"
                placeholder="Lý do phê duyệt, ghi chú chỉ đạo..."
                value={reviewForm.note}
                onChange={e => setReviewForm({...reviewForm, note: e.target.value})}
              />
            </div>
          </form>
        </BaseModal>
      )}

      {/* SCANNER MODAL */}
      {isScannerOpen && (
        <BaseModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScanCodeInput('');
          }}
          size="confirm"
          title={
            <div>
              <h2 className="text-md font-black uppercase tracking-widest text-slate-900">Quét mã tài sản (QR/Barcode)</h2>
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Giả lập súng quét barcode: súng tự nhấn Enter sau khi quét</p>
            </div>
          }
          footer={
            <button 
              onClick={() => {
                setIsScannerOpen(false);
                setScanCodeInput('');
              }} 
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs"
            >
              Đóng
            </button>
          }
        >
          <div className="space-y-5 text-center py-2">
            <div className="w-40 h-40 mx-auto border-4 border-dashed border-primary-500 rounded-3xl flex flex-col items-center justify-center bg-primary-50/20 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-500 animate-bounce" />
              <Package className="h-12 w-12 text-primary-400" />
              <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest mt-2 animate-pulse">Đang quét...</p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <label className="text-xs font-bold text-slate-500 block">Nhập tay mã tài sản hoặc quét qua cổng súng quét:</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  autoFocus
                  required
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-800 text-center"
                  placeholder="Ví dụ: 01.03.01.02.04.002"
                  value={scanCodeInput}
                  onChange={e => setScanCodeInput(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Tìm
                </button>
              </div>
            </form>
          </div>
        </BaseModal>
      )}

      {/* SESSION CREATION MODAL */}
      {showSessionModal && (
        <BaseModal
          isOpen={showSessionModal}
          onClose={() => {
            setShowSessionModal(false);
            setWizardStep(1);
            setPreviewAssetsCount(null);
            setPreviewBreakdown({});
            setSessionMembers([]);
            setDepartmentRepresentatives([]);
            setRepresentativeUsersByDepartment({});
          }}
          size="wizard"
          title={
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Tạo phiên kiểm kê mới</h2>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { step: 1, label: 'Phạm vi kiểm kê' },
                  { step: 2, label: 'Nhân sự thực hiện' },
                  { step: 3, label: 'Xác nhận thông tin' }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      wizardStep === s.step ? 'bg-primary-600 text-white font-black' :
                      wizardStep > s.step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {s.step}
                    </span>
                    <span className={`text-xs font-bold ${
                      wizardStep === s.step ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                    {s.step < 3 && <span className="text-slate-300 ml-1">➔</span>}
                  </div>
                ))}
              </div>
            </div>
          }
          footer={
            <>
              {creationProgress === null && (
                <>
                  <button
                    onClick={() => {
                      if (wizardStep === 1) {
                        setShowSessionModal(false);
                      } else {
                        setWizardStep(prev => prev - 1);
                      }
                    }}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-655 hover:bg-slate-50 font-bold text-sm uppercase cursor-pointer"
                  >
                    {wizardStep === 1 ? 'Hủy' : 'Quay lại'}
                  </button>
                  {wizardStep < 3 ? (
                    <button
                      onClick={async () => {
                        if (wizardStep === 1) {
                          const resolvedPreviewCount = previewAssetsCount ?? await fetchPreviewAssets();
                          if (resolvedPreviewCount === null) {
                            return;
                          }
                          if (scopeSelection === 'FILTER' && resolvedPreviewCount === 0) {
                            toast.warning("Không có tài sản nào khớp với bộ lọc đang chọn! Hãy điều chỉnh bộ lọc.");
                            return;
                          }
                          if (scopeSelection === 'COMPANY' && !sessionForm.companyName) {
                            toast.error("Vui lòng chọn công ty!");
                            return;
                          }
                          if (scopeSelection === 'DEPARTMENT' && !sessionForm.departmentName) {
                            toast.error("Vui lòng chọn phòng ban!");
                            return;
                          }
                          if (scopeSelection === 'LOCATION' && !sessionForm.locationName) {
                            toast.error("Vui lòng chọn địa điểm!");
                            return;
                          }
                          if (scopeSelection === 'PROJECT' && !sessionForm.projectName) {
                            toast.error("Vui lòng chọn dự án!");
                            return;
                          }
                        }
                        if (wizardStep === 2 && !validateSessionPersonnel()) {
                          return;
                        }
                        setWizardStep(prev => prev + 1);
                      }}
                      className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm uppercase cursor-pointer shadow-md"
                    >
                      Tiếp tục
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateSession}
                      disabled={submitting}
                      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase flex items-center shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Tạo phiên
                    </button>
                  )}
                </>
              )}
            </>
          }
        >
          {creationProgress !== null ? (
            <div className="py-12 text-center space-y-6">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto" />
              <p className="text-slate-800 font-bold text-sm">{creationStatusText}</p>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-md mx-auto border border-slate-200">
                <div 
                  className="bg-primary-600 h-full rounded-full transition-all duration-150"
                  style={{ width: `${creationProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-sm text-slate-700">
              {wizardStep === 1 && (
                <div className="space-y-6">
                  {/* Top line: Scheduled date & scope shortcuts */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Ngày kiểm kê *</label>
                      <input
                        type="date"
                        required
                        value={sessionForm.scheduledDate}
                        onChange={e => setSessionForm({ ...sessionForm, scheduledDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Thiết lập nhanh theo:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Chọn tất cả', filterPreset: () => setSessionFilters({
                            companyNames: [], cityNames: [], projectNames: [], locationNames: [], departmentNames: [], currentUserNames: [],
                            level1Names: [], level2Names: [], level3Names: [], statuses: [], hasSerial: null, hasInvoice: null, hasCode: null
                          })},
                          { label: 'Xóa bộ lọc', filterPreset: () => setSessionFilters({
                            companyNames: [], cityNames: [], projectNames: [], locationNames: [], departmentNames: [], currentUserNames: [],
                            level1Names: [], level2Names: [], level3Names: [], statuses: [], hasSerial: null, hasInvoice: null, hasCode: null
                          })},
                          { label: 'Chỉ tài sản có mã', filterPreset: () => setSessionFilters((prev: any) => ({ ...prev, hasCode: true })) }
                        ].map((btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={btn.filterPreset}
                            className="py-2.5 px-2 bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 rounded-xl text-center font-bold text-[11px] text-slate-600 cursor-pointer"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Main Multi-Conditional Scope Filter Grid */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest text-primary-650">
                      🎯 Bộ lọc phạm vi kiểm kê đa điều kiện
                    </h4>
                    
                    {/* Row 1: Company & City */}
                    <div className="grid grid-cols-2 gap-6">
                      <MultiSelectDropdown
                        label="Công ty"
                        placeholder="Tất cả công ty"
                        options={availableCompanies}
                        selectedValues={sessionFilters.companyNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, companyNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                      <MultiSelectDropdown
                        label="Thành phố"
                        placeholder="Tất cả thành phố"
                        options={availableCities}
                        selectedValues={sessionFilters.cityNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, cityNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                    </div>

                    {/* Row 2: Project & Location */}
                    <div className="grid grid-cols-2 gap-6">
                      <MultiSelectDropdown
                        label="Dự án / Địa điểm"
                        placeholder="Tất cả dự án"
                        options={availableProjects}
                        selectedValues={sessionFilters.projectNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, projectNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                      <MultiSelectDropdown
                        label="Vị trí / Kho / Phòng"
                        placeholder="Tất cả vị trí"
                        options={availableLocations}
                        selectedValues={sessionFilters.locationNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, locationNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                    </div>

                    {/* Row 3: Department & User */}
                    <div className="grid grid-cols-2 gap-6">
                      <MultiSelectDropdown
                        label="Phòng ban kiểm kê"
                        placeholder="Tất cả phòng ban"
                        options={availableDepartments}
                        selectedValues={sessionFilters.departmentNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, departmentNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                      <MultiSelectDropdown
                        label="Người sử dụng tài sản"
                        placeholder="Tất cả người dùng"
                        options={availableUsers}
                        selectedValues={sessionFilters.currentUserNames}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, currentUserNames: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                    </div>

                    {/* Row 4: Asset Category Level 1 & Status */}
                    <div className="grid grid-cols-2 gap-6">
                      <MultiSelectDropdown
                        label="Loại tài sản (Cấp 1)"
                        placeholder="Tất cả loại tài sản"
                        options={level1Cats}
                        selectedValues={sessionFilters.level1Names}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, level1Names: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                      <MultiSelectDropdown
                        label="Trạng thái tài sản"
                        placeholder="Tất cả trạng thái"
                        options={assetStatuses}
                        selectedValues={sessionFilters.statuses}
                        onChange={val => {
                          setSessionFilters((prev: any) => ({ ...prev, statuses: val }));
                          setPreviewAssetsCount(null);
                        }}
                      />
                    </div>
                  </div>

                  {/* Advanced Filters Button and Form */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-700 rounded-xl cursor-pointer shadow-sm transition-colors"
                    >
                      🛠️ {showAdvancedFilters ? 'Ẩn bộ lọc nâng cao' : 'Bộ lọc nâng cao'}
                    </button>

                    {showAdvancedFilters && (
                      <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-6">
                          <MultiSelectDropdown
                            label="Nhóm tài sản cấp 2"
                            placeholder="Tất cả nhóm cấp 2"
                            options={level2Cats}
                            selectedValues={sessionFilters.level2Names}
                            onChange={val => {
                              setSessionFilters((prev: any) => ({ ...prev, level2Names: val }));
                              setPreviewAssetsCount(null);
                            }}
                          />
                          <MultiSelectDropdown
                            label="Nhóm tài sản cấp 3"
                            placeholder="Tất cả nhóm cấp 3"
                            options={level3Cats}
                            selectedValues={sessionFilters.level3Names}
                            onChange={val => {
                              setSessionFilters((prev: any) => ({ ...prev, level3Names: val }));
                              setPreviewAssetsCount(null);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Có số Serial / Không</label>
                            <select
                              value={sessionFilters.hasSerial === null ? 'ALL' : sessionFilters.hasSerial ? 'YES' : 'NO'}
                              onChange={e => {
                                setSessionFilters((prev: any) => ({
                                  ...prev,
                                  hasSerial: e.target.value === 'YES' ? true : e.target.value === 'NO' ? false : null
                                }));
                                setPreviewAssetsCount(null);
                              }}
                              className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-primary-500"
                            >
                              <option value="ALL">Tất cả tài sản</option>
                              <option value="YES">Có số Serial</option>
                              <option value="NO">Không có số Serial</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Có hóa đơn / Không</label>
                            <select
                              value={sessionFilters.hasInvoice === null ? 'ALL' : sessionFilters.hasInvoice ? 'YES' : 'NO'}
                              onChange={e => {
                                setSessionFilters((prev: any) => ({
                                  ...prev,
                                  hasInvoice: e.target.value === 'YES' ? true : e.target.value === 'NO' ? false : null
                                }));
                                setPreviewAssetsCount(null);
                              }}
                              className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-primary-500"
                            >
                              <option value="ALL">Tất cả tài sản</option>
                              <option value="YES">Có hóa đơn</option>
                              <option value="NO">Không có hóa đơn</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Có mã / Không mã</label>
                            <select
                              value={sessionFilters.hasCode === null ? 'ALL' : sessionFilters.hasCode ? 'YES' : 'NO'}
                              onChange={e => {
                                setSessionFilters((prev: any) => ({
                                  ...prev,
                                  hasCode: e.target.value === 'YES' ? true : e.target.value === 'NO' ? false : null
                                }));
                                setPreviewAssetsCount(null);
                              }}
                              className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-primary-500"
                            >
                              <option value="ALL">Tất cả tài sản</option>
                              <option value="YES">Có mã tài sản</option>
                              <option value="NO">Chưa có mã tài sản</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Asset Preview Section */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Xem trước danh sách tài sản trong phạm vi:</span>
                      <button
                        type="button"
                        onClick={handlePreviewAssets}
                        disabled={previewLoading}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-855 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔍'} Xem trước tài sản
                      </button>
                    </div>

                    {previewAssetsCount !== null && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between font-black text-sm text-slate-800 border-b pb-2">
                          <span>Tổng số tài sản tìm thấy:</span>
                          <span className="text-base text-primary-650 font-black">{previewAssetsCount} tài sản</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 text-xs">
                          <div className="space-y-3">
                            <div>
                              <span className="font-black text-slate-500 uppercase tracking-wider block mb-1">Theo loại tài sản:</span>
                              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1">
                                {Object.entries(previewBreakdowns.category || {}).length > 0 ? (
                                  Object.entries(previewBreakdowns.category).map(([name, val]: any) => (
                                    <div key={name} className="flex justify-between font-semibold">
                                      <span className="text-slate-600 truncate max-w-[180px]">{name}</span>
                                      <span className="text-slate-900 font-bold">{val}</span>
                                    </div>
                                  ))
                                ) : <p className="text-slate-400 italic text-[11px]">Không có dữ liệu</p>}
                              </div>
                            </div>
                            
                            <div>
                              <span className="font-black text-slate-500 uppercase tracking-wider block mb-1">Theo phòng ban:</span>
                              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                                {Object.entries(previewBreakdowns.department || {}).length > 0 ? (
                                  Object.entries(previewBreakdowns.department).map(([name, val]: any) => (
                                    <div key={name} className="flex justify-between font-semibold">
                                      <span className="text-slate-600 truncate max-w-[180px]">{name}</span>
                                      <span className="text-slate-900 font-bold">{val}</span>
                                    </div>
                                  ))
                                ) : <p className="text-slate-400 italic text-[11px]">Không có dữ liệu</p>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="font-black text-slate-500 uppercase tracking-wider block mb-1">Theo dự án:</span>
                              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {Object.entries(previewBreakdowns.project || {}).length > 0 ? (
                                  Object.entries(previewBreakdowns.project).map(([name, val]: any) => (
                                    <div key={name} className="flex justify-between font-semibold">
                                      <span className="text-slate-600 truncate max-w-[180px]">{name}</span>
                                      <span className="text-slate-900 font-bold">{val}</span>
                                    </div>
                                  ))
                                ) : <p className="text-slate-400 italic text-[11px]">Không có dữ liệu</p>}
                              </div>
                            </div>
                            
                            <div>
                              <span className="font-black text-slate-500 uppercase tracking-wider block mb-1">Theo vị trí:</span>
                              <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                                {Object.entries(previewBreakdowns.location || {}).length > 0 ? (
                                  Object.entries(previewBreakdowns.location).map(([name, val]: any) => (
                                    <div key={name} className="flex justify-between font-semibold">
                                      <span className="text-slate-600 truncate max-w-[180px]">{name}</span>
                                      <span className="text-slate-900 font-bold">{val}</span>
                                    </div>
                                  ))
                                ) : <p className="text-slate-400 italic text-[11px]">Không có dữ liệu</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {previewAssetsCount > 10000 && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-start gap-2 animate-pulse">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                              <p className="font-black">Cảnh báo phạm vi quá lớn!</p>
                              <p className="text-[11px] font-medium leading-relaxed">Bạn đang tạo phiên kiểm kê với {previewAssetsCount} tài sản. Hệ thống sẽ xử lý và tạo phiên ở chế độ nền để tránh nghẽn dòng hoạt động.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Trưởng đoàn kiểm kê *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nhập tên Trưởng đoàn..."
                        value={sessionForm.checkerName}
                        onChange={e => setSessionForm({ ...sessionForm, checkerName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Phạm vi đại diện ký</label>
                      <div className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center text-sm font-bold text-slate-700">
                        {selectedSessionDepartmentNames.length > 0 ? `${selectedSessionDepartmentNames.length} phòng ban` : 'Đơn vị kiểm kê'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Đại diện phòng ban ký biên bản *</label>
                      {representativeUsersLoading && <span className="text-[11px] font-bold text-primary-600 flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải nhân sự</span>}
                    </div>
                    <div className="space-y-3">
                      {departmentRepresentatives.map((rep) => {
                        const key = buildRepresentativeKey(rep.departmentName);
                        const users = representativeUsersByDepartment[key] || [];
                        return (
                          <div key={rep.departmentName} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Phòng ban kiểm kê</p>
                                <p className="text-sm font-black text-slate-900">{rep.departmentName}</p>
                              </div>
                              {users.length === 0 && !representativeUsersLoading && (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                                  Chưa có nhân sự active, nhập thủ công
                                </span>
                              )}
                            </div>

                            <select
                              value={rep.representativeUserId || ''}
                              onChange={(e) => {
                                const userId = Number(e.target.value);
                                const selected = users.find((u) => u.id === userId);
                                if (!selected) {
                                  updateDepartmentRepresentative(rep.departmentName, {
                                    representativeUserId: null,
                                    representativeName: '',
                                    position: '',
                                    isManual: false
                                  });
                                  return;
                                }
                                updateDepartmentRepresentative(rep.departmentName, {
                                  departmentId: selected.departmentId || rep.departmentId,
                                  representativeUserId: selected.id,
                                  representativeName: selected.fullName,
                                  position: selected.position || '',
                                  isManual: false
                                });
                              }}
                              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-primary-500 disabled:bg-slate-100"
                              disabled={users.length === 0}
                            >
                              <option value="">-- Chọn nhân sự thuộc phòng ban --</option>
                              {users.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.fullName}{person.position ? ` - ${person.position}` : ''}
                                </option>
                              ))}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="Tên người ký / người được ủy quyền"
                                value={rep.representativeName}
                                onChange={(e) => updateDepartmentRepresentative(rep.departmentName, {
                                  representativeName: e.target.value,
                                  representativeUserId: null,
                                  isManual: true
                                })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                              />
                              <input
                                type="text"
                                placeholder="Chức vụ"
                                value={rep.position}
                                onChange={(e) => updateDepartmentRepresentative(rep.departmentName, {
                                  position: e.target.value,
                                  isManual: true
                                })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Đội kiểm kê *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Đội kiểm kê số 01..."
                      value={sessionForm.teamName}
                      onChange={e => setSessionForm({ ...sessionForm, teamName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Thành viên tham gia đoàn kiểm kê</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Nhập tên thành viên..."
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const memberName = newMemberName.trim();
                          if (!memberName) return;
                          if (memberName.toLowerCase() === sessionForm.checkerName.trim().toLowerCase()) {
                            toast.error('Thành viên không được trùng với trưởng đoàn.');
                            return;
                          }
                          if (sessionMembers.some((name) => name.trim().toLowerCase() === memberName.toLowerCase())) {
                            toast.error('Thành viên này đã có trong đoàn kiểm kê.');
                            return;
                          }
                          setSessionMembers(prev => [...prev, memberName]);
                          setNewMemberName('');
                        }}
                        className="bg-slate-900 hover:bg-slate-850 text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase cursor-pointer"
                      >
                        + Thêm
                      </button>
                    </div>
                    {sessionMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {sessionMembers.map((m, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs uppercase flex items-center gap-2 shadow-sm">
                            👤 {m}
                            <button
                              type="button"
                              onClick={() => setSessionMembers(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-rose-500 hover:text-rose-700 font-black border-0 bg-transparent cursor-pointer text-xs ml-1.5"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b pb-2.5 text-primary-650">
                      📋 Tóm tắt cấu hình phiên kiểm kê
                    </h4>
                    <div className="grid grid-cols-2 gap-6 text-sm font-bold">
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Tên phiên (tự động):</span>
                        <span className="text-slate-800 font-black text-base">
                          Kiểm kê {sessionForm.departmentName || sessionForm.locationName || (sessionFilters.departmentNames.length > 0 ? `${sessionFilters.departmentNames.length} phòng ban` : (sessionFilters.locationNames.length > 0 ? `${sessionFilters.locationNames.length} vị trí` : 'Đa điều kiện'))} ngày {format(new Date(sessionForm.scheduledDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Ngày thực hiện:</span>
                        <span className="text-slate-800 text-sm">{format(new Date(sessionForm.scheduledDate), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Phạm vi kiểm:</span>
                        <span className="text-slate-800 uppercase text-xs">
                          {scopeSelection === 'ALL' ? 'Toàn Công ty' :
                           scopeSelection === 'COMPANY' ? `Công ty con: ${sessionForm.companyName}` :
                           scopeSelection === 'PROJECT' ? `Dự án: ${sessionForm.projectName}` :
                           scopeSelection === 'LOCATION' ? `Vị trí: ${sessionForm.locationName}` :
                           scopeSelection === 'DEPARTMENT' ? `Phòng ban: ${sessionForm.departmentName}` :
                           scopeSelection === 'FILTER' ? 'Đa điều kiện (Bộ lọc)' : 'Cá nhân'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Đội kiểm kê:</span>
                        <span className="text-slate-800 text-sm">{sessionForm.teamName || '-'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Trưởng đoàn:</span>
                        <span className="text-slate-800 font-bold text-sm">{sessionForm.checkerName || '-'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Thành viên:</span>
                        <span className="text-slate-800 text-sm">{sessionMembers.join(', ') || 'Không có thành viên phụ'}</span>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <span className="text-slate-400 uppercase text-[10px] tracking-wider block">Đại diện phòng ban ký biên bản:</span>
                        <div className="space-y-1">
                          {departmentRepresentatives.map((rep) => (
                            <div key={rep.departmentName} className="text-slate-800 text-sm">
                              <span className="font-black">{rep.departmentName}:</span> {rep.representativeName || '-'}{rep.position ? ` - ${rep.position}` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between font-black text-sm text-slate-800">
                      <span>Tổng tài sản dự kiến kiểm kê:</span>
                      <span className="text-base text-emerald-650 font-black">
                        {previewAssetsCount !== null ? `${previewAssetsCount} tài sản` : 'Đang tính...'}
                      </span>
                    </div>
                    {Object.keys(previewBreakdown).length > 0 && (
                      <div className="grid grid-cols-3 gap-3 text-xs font-bold text-emerald-700">
                        {Object.entries(previewBreakdown).map(([cat, count]) => (
                          <div key={cat} className="bg-white border border-emerald-100 rounded-xl p-3 text-center shadow-sm">
                            <p className="text-slate-400 font-medium truncate text-[10px] uppercase">{cat}</p>
                            <p className="text-base font-black text-emerald-600 mt-1">{count}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider block">Ghi chú thêm</label>
                    <textarea
                      placeholder="Ghi chú trực tiếp kiểm kê tại thực địa..."
                      value={sessionForm.note}
                      onChange={e => setSessionForm({ ...sessionForm, note: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm h-24 resize-none focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </BaseModal>
      )}

      {/* SESSION REPORT MODAL */}
      {activeSessionReport && (
        <BaseModal
          isOpen={!!activeSessionReport}
          onClose={() => setActiveSessionReport(null)}
          size="form"
          title={
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-900">Biên bản kiểm kê theo phiên</h2>
              <p className="text-[10px] text-slate-500 font-bold">Xem trước biên bản in cho phiên kiểm kê</p>
            </div>
          }
          footer={
            <>
              <button
                onClick={() => setActiveSessionReport(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  if ((activeSessionReport.summary.checkedCount || activeSessionReport.summary.actualTotal || 0) === 0) {
                    toast.error('Phiên kiểm kê chưa có tài sản nào được kiểm kê. Không thể in biên bản hoàn thành kiểm kê.');
                    return;
                  }
                  window.print();
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" /> In biên bản
              </button>
            </>
          }
        >
          <div className="space-y-6 text-slate-800 p-4 max-h-[70vh] overflow-y-auto print:overflow-visible print:max-h-none print:p-0">
            <div className="text-center space-y-2">
              <h1 className="text-lg font-black uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
              <p className="text-xs font-bold border-b pb-3 w-48 mx-auto border-slate-300">Độc lập - Tự do - Hạnh phúc</p>
              <h2 className="text-base font-black uppercase tracking-widest pt-4">BIÊN BẢN KIỂM KÊ TÀI SẢN</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p>Đợt kiểm kê: <span className="font-bold text-slate-900">{session.inventoryName}</span></p>
              <p>Ngày kiểm kê: <span className="font-bold text-slate-900">{format(new Date(activeSessionReport.session.scheduledDate), 'dd/MM/yyyy')}</span></p>
              <p>Phòng ban sử dụng: <span className="font-bold text-slate-900">{activeSessionReport.session.departmentName || 'Tất cả phòng ban'}</span></p>
              <p>Địa điểm/Vị trí: <span className="font-bold text-slate-900">{activeSessionReport.session.locationName || 'Tất cả vị trí'}</span></p>
              <p>Người kiểm kê: <span className="font-bold text-slate-900">{activeSessionReport.session.checkerName || '-'}</span></p>
              <p>Đại diện đơn vị: <span className="font-bold text-slate-900">{activeSessionReport.session.representativeName || '-'}</span></p>
            </div>

            {Array.isArray(activeSessionReport.session.departmentRepresentativesJson) && activeSessionReport.session.departmentRepresentativesJson.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <h3 className="font-black uppercase tracking-wider text-slate-500">Đại diện phòng ban ký biên bản</h3>
                {activeSessionReport.session.departmentRepresentativesJson.map((rep: any, index: number) => (
                  <div key={`${rep.departmentName || index}-${rep.representativeName || index}`} className="flex items-center justify-between border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                    <span className="font-bold text-slate-700">{rep.departmentName || 'Đơn vị kiểm kê'}</span>
                    <span className="font-black text-slate-900">{rep.representativeName || '-'}{rep.position ? ` - ${rep.position}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tổng trong phạm vi</p>
                <p className="text-lg font-black text-slate-950 mt-1">{activeSessionReport.summary.totalInScope ?? activeSessionReport.summary.bookTotal}</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Đã kiểm kê</p>
                <p className="text-lg font-black text-slate-955 mt-1">{activeSessionReport.summary.checkedCount ?? activeSessionReport.summary.actualTotal}</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Trùng khớp</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{activeSessionReport.summary.matchedCount ?? activeSessionReport.summary.matched}</p>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Chênh lệch</p>
                <p className="text-lg font-black text-rose-600 mt-1">{activeSessionReport.summary.mismatchCount ?? activeSessionReport.summary.deviations}</p>
              </div>
            </div>

            {(activeSessionReport.summary.checkedCount || activeSessionReport.summary.actualTotal || 0) === 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-bold">
                Phiên kiểm kê chưa có tài sản nào được kiểm kê. Chỉ có thể xem/phụ lục danh sách chưa kiểm, không in biên bản hoàn thành.
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Danh sách đối soát chi tiết</h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-700">Mã TS</th>
                      <th className="p-3 font-bold text-slate-700">Tên tài sản</th>
                      <th className="p-3 font-bold text-slate-700 text-center">SL sổ sách</th>
                      <th className="p-3 font-bold text-slate-700 text-center">SL thực tế</th>
                      <th className="p-3 font-bold text-slate-700">Kết quả đối soát</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {((activeSessionReport.checkedItems || []).length > 0 ? activeSessionReport.checkedItems : []).map((d: any) => {
                      const isExtra = d.resultStatus === 'EXTRA';
                      const isMissing = d.resultStatus === 'MISSING';
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-605">{d.assetCode || 'Ngoài sổ'}</td>
                          <td className="p-3 font-semibold text-slate-800">{d.assetName}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{isExtra ? 0 : 1}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{isMissing ? 0 : 1}</td>
                          <td className="p-3 font-bold text-slate-700">
                            {d.resultStatus === 'MATCH' ? 'Khớp' :
                             d.resultStatus === 'WRONG_LOCATION' ? 'Sai vị trí' :
                             d.resultStatus === 'WRONG_USER' ? 'Sai người sử dụng' :
                             d.resultStatus === 'MISSING' ? 'Thiếu' :
                             d.resultStatus === 'EXTRA' ? 'Tài sản ngoài sổ' : d.resultStatus}
                          </td>
                        </tr>
                      );
                    })}
                    {(!activeSessionReport.checkedItems || activeSessionReport.checkedItems.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                          Chưa có tài sản nào được kiểm kê trong phiên/ngày này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {activeSessionReport.uncheckedItems && activeSessionReport.uncheckedItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Phụ lục tài sản chưa kiểm</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-600">
                  Còn {activeSessionReport.uncheckedItems.length} tài sản chưa kiểm trong phạm vi phiên. Không tính các tài sản này là khớp.
                </div>
              </div>
            )}

            {activeSessionReport.deviations && activeSessionReport.deviations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-600">Danh sách sai lệch cần xử lý</h3>
                <div className="border border-rose-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-rose-50/50 border-b border-rose-100">
                        <th className="p-3 font-bold text-rose-700">Tài sản</th>
                        <th className="p-3 font-bold text-rose-700">Sổ sách</th>
                        <th className="p-3 font-bold text-rose-700">Thực tế</th>
                        <th className="p-3 font-bold text-rose-700">Vấn đề / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-50">
                      {activeSessionReport.deviations.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{d.assetName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{d.assetCode || 'Ngoài sổ'}</p>
                          </td>
                          <td className="p-3 text-slate-500">
                            <p>Vị trí: {d.bookLocationName || '-'}</p>
                            <p>Người dùng: {d.bookUserName || '-'}</p>
                          </td>
                          <td className="p-3 text-slate-800 font-semibold">
                            <p>Vị trí: {d.actualLocationName || '-'}</p>
                            <p>Người dùng: {d.actualUserName || '-'}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-rose-700">
                              {d.resultStatus === 'WRONG_LOCATION' ? 'Sai vị trí' :
                               d.resultStatus === 'WRONG_USER' ? 'Sai người dùng' :
                               d.resultStatus === 'MISSING' ? 'Thiếu / Mất' :
                               d.resultStatus === 'EXTRA' ? 'Ngoài sổ' : d.resultStatus}
                            </p>
                            {d.note && <p className="text-[10px] text-slate-450 italic mt-0.5">{d.note}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 text-center pt-8 border-t border-slate-200">
              <div className="space-y-16">
                <p className="font-bold text-xs">Đại diện đơn vị sử dụng</p>
                <p className="text-slate-350 italic text-[11px]">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="space-y-16">
                <p className="font-bold text-xs">Người kiểm kê</p>
                <p className="text-slate-350 italic text-[11px]">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="space-y-16">
                <p className="font-bold text-xs">Trưởng ban HCNS</p>
                <p className="text-slate-350 italic text-[11px]">(Ký, ghi rõ họ tên)</p>
              </div>
            </div>
          </div>
        </BaseModal>
      )}
      {/* REPORT CENTER MODAL */}
      {showReportCenterModal && (
        <BaseModal
          isOpen={showReportCenterModal}
          onClose={() => {
            if (reportExportProgress === null) {
              setShowReportCenterModal(false);
            }
          }}
          size="form"
          title={
            <div>
              <h2 className="text-md font-black uppercase tracking-widest text-slate-900">📄 Trung tâm báo cáo kiểm kê</h2>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Đợt: {session?.inventoryName} ({session?.status === 'OPEN' ? 'Đang kiểm kê' : 'Đã chốt'})
              </p>
            </div>
          }
          footer={
            <>
              {reportExportProgress === null && (
                <>
                  <button
                    onClick={() => setShowReportCenterModal(false)}
                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      toast.success(`Xem trước kết xuất: Dự kiến tạo ${selectedReports.length * (reportExportFormat === 'BOTH' ? 2 : 1)} tệp.`);
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase cursor-pointer"
                  >
                    Xem trước số lượng
                  </button>
                  <button
                    onClick={handleExportReport}
                    disabled={submitting || selectedReports.length === 0}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl font-black text-xs uppercase flex items-center shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Xuất báo cáo
                  </button>
                </>
              )}
            </>
          }
        >
          {reportExportProgress !== null ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
              <p className="text-slate-800 font-bold">{reportExportStatusText}</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-md mx-auto border border-slate-200">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-150"
                  style={{ width: `${reportExportProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">Bạn có thể đóng cửa sổ này, tệp sẽ tự động hiển thị trong lịch sử khi hoàn tất.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-slate-655 max-h-[70vh] overflow-y-auto pr-1">
              {/* Batch Read-Only Stats */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">Tài sản cần kiểm</p>
                  <p className="text-base font-black text-slate-800">{stats.total}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">Đã kiểm kê</p>
                  <p className="text-base font-black text-emerald-600">
                    {stats.checked} <span className="text-[10px] text-slate-400">({stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">Sai lệch</p>
                  <p className="text-base font-black text-rose-600">{stats.wrongLocation + stats.missing + stats.damaged + stats.wrongStatus}</p>
                </div>
              </div>

              {/* Checklist Group */}
              <div className="space-y-2">
                <label className="font-black text-[10px] uppercase tracking-wider text-slate-500">1. Chọn loại báo cáo cần kết xuất *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: 'RPT-01', label: '📘 RPT-01: Báo cáo tổng hợp kiểm kê', desc: 'Dành cho Ban giám đốc, tổng quan số liệu' },
                    { key: 'RPT-02', label: '📋 RPT-02: Biên bản kiểm kê phòng ban', desc: 'Có đầy đủ chữ ký trưởng đoàn & đại diện phòng ban' },
                    { key: 'RPT-03', label: '📗 RPT-03: Danh mục tài sản sau kiểm kê', desc: 'Dữ liệu thô chuẩn hóa sau đối soát' },
                    { key: 'RPT-04', label: '⚠️ RPT-04: Báo cáo sai lệch chi tiết', desc: 'Sai vị trí, sai người dùng, báo hỏng' },
                    { key: 'RPT-05', label: '➕ RPT-05: Báo cáo tài sản ngoài sổ', desc: 'Danh sách mã tạm phát sinh ngoài sổ sách' },
                    { key: 'RPT-06', label: '🗑 RPT-06: Báo cáo tài sản thiếu/mất', desc: 'Lập phương án bồi hoàn hoặc giảm tài sản' },
                    { key: 'RPT-07', label: '🔒 RPT-07: Biên bản chốt kiểm kê', desc: 'Khoá số liệu, đính kèm mã chốt độc bản' }
                  ].map(rpt => {
                    const isChecked = selectedReports.includes(rpt.key);
                    return (
                      <label 
                        key={rpt.key}
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${
                          isChecked ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedReports(prev => 
                              isChecked ? prev.filter(k => k !== rpt.key) : [...prev, rpt.key]
                            );
                          }}
                        />
                        <div>
                          <p className="font-bold text-slate-800">{rpt.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{rpt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Scopes Filter */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="font-black text-[10px] uppercase tracking-wider text-slate-500">2. Bộ lọc phạm vi</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-450 block">Công ty:</span>
                    <select
                      value={reportFilters.company}
                      onChange={e => setReportFilters({ ...reportFilters, company: e.target.value })}
                      className="w-full bg-white border rounded-lg h-9 px-2 text-slate-800"
                    >
                      <option value="">-- Tất cả công ty --</option>
                      {companies.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-450 block">Dự án:</span>
                    <select
                      value={reportFilters.project}
                      onChange={e => setReportFilters({ ...reportFilters, project: e.target.value })}
                      className="w-full bg-white border rounded-lg h-9 px-2 text-slate-800"
                    >
                      <option value="">-- Tất cả dự án --</option>
                      {reviewProjects.map((p, i) => (
                        <option key={i} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-450 block">Phòng ban:</span>
                    <select
                      value={reportFilters.department}
                      onChange={e => setReportFilters({ ...reportFilters, department: e.target.value })}
                      className="w-full bg-white border rounded-lg h-9 px-2 text-slate-800"
                    >
                      <option value="">-- Tất cả phòng ban --</option>
                      {reviewDepartments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Format & ZIP options */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-black text-[10px] uppercase tracking-wider text-slate-500 block">3. Định dạng xuất</label>
                  <div className="flex gap-4">
                    {([
                      { key: 'EXCEL', label: '📊 Excel' },
                      { key: 'PDF', label: '📕 PDF' },
                      { key: 'BOTH', label: '🔄 Cả hai' }
                    ] as const).map(fmt => (
                      <label key={fmt.key} className="flex items-center gap-1.5 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name="exportFormat"
                          checked={reportExportFormat === fmt.key}
                          onChange={() => setReportExportFormat(fmt.key)}
                        />
                        <span>{fmt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-black text-[10px] uppercase tracking-wider text-slate-500 block">4. Tùy chọn đóng gói</label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={reportZipFiles}
                      onChange={e => setReportZipFiles(e.target.checked)}
                    />
                    <span>Gộp thành file nén .ZIP (Khi xuất nhiều báo cáo)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </BaseModal>
      )}

      {/* FILE PREVIEW OVERLAY */}
      {previewFileDetails && (
        <BaseModal
          isOpen={!!previewFileDetails}
          onClose={() => setPreviewFileDetails(null)}
          size="detail"
          title={
            <div className="flex items-center justify-between w-full pr-8">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
                  👁 Xem trước tài liệu: {previewFileDetails.fileName}
                </h2>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">Xuất bởi: {previewFileDetails.creator} • Dung lượng: {previewFileDetails.fileSize}</p>
              </div>
              <button
                onClick={() => {
                  toast.success(`Đang tải tệp: ${previewFileDetails.fileName}`);
                }}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                ⬇ Tải xuống
              </button>
            </div>
          }
        >
          {previewFileDetails.fileType === 'xlsx' ? (
            <div className="space-y-4">
              {/* Excel Sheet Simulator */}
              <div className="flex border-b border-slate-200 bg-slate-100 p-2 rounded-t-xl gap-2">
                <span className="px-3 py-1.5 bg-white text-slate-800 rounded border border-slate-300 font-black text-[10px] uppercase tracking-wider shadow-sm">
                  📊 Sheet 1: Dashboard
                </span>
                <span className="px-3 py-1.5 bg-slate-200 text-slate-500 rounded font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-slate-250">
                  📁 Sheet 2: Chi tiết tài sản
                </span>
              </div>
              <div className="bg-white border p-6 rounded-b-xl space-y-6 font-mono text-xs max-h-[60vh] overflow-y-auto">
                <div className="border-b pb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase">ĐỢT KIỂM KÊ TÀI SẢN 2026</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Đơn vị lập báo cáo: Công ty Cổ phần Danko Group</p>
                  <p className="text-[10px] text-slate-500">Thời gian lập: {format(new Date(previewFileDetails.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                
                {/* Excel Summary Grid */}
                <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 border rounded">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">TỔNG SỔ SÁCH:</span>
                    <span className="text-sm font-black text-slate-800">{stats.total}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">ĐÃ KIỂM KÊ:</span>
                    <span className="text-sm font-black text-slate-800">{stats.checked}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">KHỚP SỔ SÁCH:</span>
                    <span className="text-sm font-black text-slate-800">{stats.matched}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">SAI LỆCH:</span>
                    <span className="text-sm font-black text-rose-600">{stats.wrongLocation + stats.missing + stats.damaged + stats.wrongStatus}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-[10px] text-slate-400 block">DỮ LIỆU TÀI SẢN PHÂN TÍCH:</span>
                  <table className="w-full text-left border-collapse border border-slate-250 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-250">
                        <th className="p-2 border">Mã tài sản</th>
                        <th className="p-2 border">Tên tài sản</th>
                        <th className="p-2 border">Sổ sách</th>
                        <th className="p-2 border">Thực tế</th>
                        <th className="p-2 border">Trạng thái chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border font-bold">LT001</td>
                        <td className="p-2 border">Laptop Dell Inspiron 14</td>
                        <td className="p-2 border">HCNS - C6</td>
                        <td className="p-2 border">HCNS - C6</td>
                        <td className="p-2 border text-emerald-600 font-bold">KHỚP</td>
                      </tr>
                      <tr>
                        <td className="p-2 border font-bold">MB01</td>
                        <td className="p-2 border">Bàn làm việc gỗ sồi</td>
                        <td className="p-2 border">Kế toán - C6</td>
                        <td className="p-2 border">Marketing - C6</td>
                        <td className="p-2 border text-rose-600 font-bold">LỆCH VỊ TRÍ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 p-8 rounded-xl max-h-[60vh] overflow-y-auto flex justify-center">
              {/* Formal Signed PDF Simulator */}
              <div className="bg-white p-12 border shadow-lg w-full max-w-2xl space-y-6 text-slate-800 text-[11px] font-sans">
                <div className="flex justify-between border-b pb-4">
                  <div className="space-y-1">
                    <p className="font-bold text-[10px] uppercase">CÔNG TY CỔ PHẦN DANKO GROUP</p>
                    <p className="text-slate-450">Mã đợt: KK2026-01</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
                  </div>
                </div>

                <div className="text-center py-4 space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {previewFileDetails.reportCode === 'RPT-07' ? 'BIÊN BẢN CHỐT SỐ LIỆU KIỂM KÊ' : 'BÁO CÁO KẾT QUẢ KIỂM KÊ TÀI SẢN'}
                  </h3>
                  <p className="text-[10px] text-slate-500 italic">Kính gửi: Ban Tổng Giám Đốc</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold uppercase border-b pb-1 mb-1">I. THÔNG TIN CHUNG</h4>
                    <p>• Tên đợt kiểm kê: {session?.inventoryName}</p>
                    <p>• Ngày chốt hồ sơ: {format(new Date(previewFileDetails.createdAt), 'dd/MM/yyyy')}</p>
                    <p>• Đại diện thực hiện: {previewFileDetails.creator}</p>
                  </div>

                  <div>
                    <h4 className="font-bold uppercase border-b pb-1 mb-1">II. BẢNG SỐ LIỆU TỔNG HỢP</h4>
                    <table className="w-full text-left border-collapse border border-slate-200 mt-2">
                      <thead>
                        <tr className="bg-slate-50 font-bold border-b border-slate-200">
                          <th className="p-2 border">Danh mục phân loại</th>
                          <th className="p-2 border">Sổ sách</th>
                          <th className="p-2 border">Đã kiểm</th>
                          <th className="p-2 border">Khớp</th>
                          <th className="p-2 border">Sai lệch</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border">Thiết bị IT/Laptop</td>
                          <td className="p-2 border">120</td>
                          <td className="p-2 border">120</td>
                          <td className="p-2 border">115</td>
                          <td className="p-2 border text-rose-600 font-bold">5</td>
                        </tr>
                        <tr>
                          <td className="p-2 border">Bàn ghế văn phòng</td>
                          <td className="p-2 border">350</td>
                          <td className="p-2 border">350</td>
                          <td className="p-2 border">340</td>
                          <td className="p-2 border text-rose-600 font-bold">10</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-bold uppercase border-b pb-1 mb-1">III. NHẬN XÉT & ĐỀ XUẤT XỬ LÝ</h4>
                    <p>1. Đối với các tài sản lệch vị trí: Tổ kiểm kê đề xuất lập phiếu điều chuyển nội bộ giữa các phòng ban.</p>
                    <p>2. Đối với các tài sản không tìm thấy: Tiến hành truy thu trách nhiệm bồi thường hoặc ghi giảm tài sản.</p>
                  </div>
                </div>

                {/* PDF Signatures Fields */}
                <div className="grid grid-cols-3 gap-4 text-center pt-8 border-t">
                  <div className="space-y-12">
                    <p className="font-bold">Người lập báo cáo</p>
                    <p className="text-slate-400 italic text-[10px]">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div className="space-y-12">
                    <p className="font-bold">Đại diện kiểm kê</p>
                    <p className="text-slate-400 italic text-[10px]">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div className="space-y-12">
                    <p className="font-bold">Phê duyệt Ban TGĐ</p>
                    <p className="text-slate-400 italic text-[10px]">(Ký, đóng dấu)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </BaseModal>
      )}

      {showDuplicateModal && (
        <BaseModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          title="Chọn tài sản kiểm kê (Trùng mã/Serial)"
          size="form"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              Phát hiện nhiều tài sản trùng khớp với mã hoặc số serial bạn đã quét. Vui lòng chọn đúng tài sản cần kiểm kê dưới đây:
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-black text-xs uppercase tracking-widest text-[#0F1720]">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã tài sản</th>
                    <th className="px-4 py-3 text-left">Tên tài sản</th>
                    <th className="px-4 py-3 text-left">Số Serial</th>
                    <th className="px-4 py-3 text-left">Vị trí sổ sách</th>
                    <th className="px-4 py-3 text-left">Người sử dụng</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {duplicateAssets.map((item: any) => {
                    const asset = item.asset || item;
                    const bookLocation = item.bookLocationName || item.expectedLocation || asset?.locationName || 'N/A';
                    const bookUser = item.bookUserName || item.expectedUser || asset?.currentUserName || 'N/A';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.assetCode || asset?.assetCode}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{asset?.assetName || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{item.serialNumber || asset?.serialNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{bookLocation}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{bookUser}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              openCheckModal(item);
                              setShowDuplicateModal(false);
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-black uppercase tracking-wider rounded-xl shadow-sm text-white bg-primary-650 hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                          >
                            Chọn
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {isNormalizationOpen && (
        <NormalizationModal
          isOpen={isNormalizationOpen}
          onClose={() => {
            setIsNormalizationOpen(false);
            fetchDetail();
          }}
          activeSessionId={session?.id}
          activeSessionName={session?.departmentName || session?.locationName ? `Phiên: ${session.departmentName || session.locationName}` : undefined}
        />
      )}

      {showBatchScanModal && (
        <BaseModal
          isOpen={showBatchScanModal}
          onClose={() => setShowBatchScanModal(false)}
          title={
            <div className="flex items-center gap-2">
              <span className="text-amber-500">⚡</span>
              <span>QUÉT KIỂM KÊ LIÊN TỤC (BATCH SCAN MODE)</span>
            </div>
          }
          size="form"
        >
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <span className="text-amber-500 font-bold">⚠️</span>
              <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                Chế độ quét tốc độ cao: Barcode/QR sau khi quét sẽ đưa vào hàng đợi lưu trữ cục bộ.
                Hệ thống không đối soát dữ liệu ngay. Bấm <strong className="font-extrabold uppercase text-amber-900">"Hoàn tất & Xử lý"</strong> ở cuối buổi để đối chiếu và ghi nhận hàng loạt.
              </p>
            </div>

            <form onSubmit={handleBatchScanSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-700 block mb-1.5">Nhập hoặc quét mã tài sản:</label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    disabled={isBatchPaused}
                    className={`w-full bg-slate-50 border border-slate-250 rounded-2xl px-4 py-4 text-base font-mono font-bold text-slate-800 outline-none focus:ring-4 transition-all ${
                      isBatchPaused 
                        ? 'bg-slate-200 border-slate-300 text-slate-450 cursor-not-allowed'
                        : 'focus:ring-amber-50 focus:border-amber-500'
                    }`}
                    placeholder={isBatchPaused ? "Tạm dừng quét..." : "Quét mã QR / Barcode tại đây..."}
                    value={batchScanInput}
                    onChange={(e) => setBatchScanInput(e.target.value)}
                  />
                  {batchScanInput && (
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-xs font-black uppercase transition-all shadow"
                    >
                      Thêm
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Statistics Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <span className="block text-[9px] font-black text-slate-500 uppercase">Đã quét</span>
                <span className="text-lg font-black text-slate-800 block mt-0.5">{batchQueue.length}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center">
                <span className="block text-[9px] font-black text-amber-600 uppercase">Trùng trong hàng đợi</span>
                <span className="text-lg font-black text-amber-700 block mt-0.5">
                  {batchQueue.length - new Set(batchQueue).size}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-center">
                <span className="block text-[9px] font-black text-rose-600 uppercase">Mã trống / Lỗi</span>
                <span className="text-lg font-black text-rose-700 block mt-0.5">
                  {batchQueue.filter(b => !b || !b.trim()).length}
                </span>
              </div>
            </div>

            {/* Timeline scanned list */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-700 block">Danh sách mã vừa quét (Lịch sử tạm):</span>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2 font-mono text-xs">
                {batchQueue.length === 0 ? (
                  <p className="text-slate-400 font-bold text-center py-4 italic">Chưa có mã nào được quét</p>
                ) : (
                  batchQueue.slice().reverse().map((code, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b last:border-b-0 border-slate-200">
                      <span className="font-bold text-slate-800">✓ {code}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Mã thứ {batchQueue.length - idx}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateBatchQueue(batchQueue.slice(0, -1))}
                  disabled={batchQueue.length === 0}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  Xóa cuối
                </button>
                <button
                  type="button"
                  onClick={() => updateBatchQueue([])}
                  disabled={batchQueue.length === 0}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-650 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-rose-200 cursor-pointer"
                >
                  Xóa toàn bộ
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPaused(!isBatchPaused)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  {isBatchPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchScanModal(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-350 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleProcessBatch}
                  disabled={batchQueue.length === 0 || submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Đang xử lý...' : '⚡ Hoàn tất & Xử lý'}
                </button>
              </div>
            </div>
          </div>
        </BaseModal>
      )}

      {showBatchResultModal && batchResult && (
        <BaseModal
          isOpen={showBatchResultModal}
          onClose={() => setShowBatchResultModal(false)}
          title="KẾT QUẢ ĐỐI CHIẾU LÔ QUÉT"
          size="form"
        >
          <div className="p-6 space-y-6">
            <div className="text-center space-y-1 py-2">
              <span className="text-4xl">📋</span>
              <h3 className="text-base font-black uppercase text-slate-900 tracking-wider">Đã đối chiếu lô quét</h3>
              <p className="text-[11px] text-slate-450 font-bold">Mã lô: {batchResult.batchId}</p>
              <p className="text-[10px] text-amber-600 font-bold">⚠ Chưa xác nhận kiểm kê — vui lòng rà soát kết quả</p>
            </div>

            {/* Numerical breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wide">Tổng đã quét</span>
                <span className="text-xl font-black text-slate-800 mt-0.5 block">{batchResult.summary.totalScanned}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-wide">Khớp, chờ xác nhận</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">{batchResult.summary.autoSaved}</span>
              </div>
              <div className="bg-amber-50 border border-amber-150 p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-amber-600 uppercase tracking-wide">Cần rà soát (lệch)</span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">{batchResult.summary.needReview}</span>
              </div>
              <div className="bg-blue-50 border border-blue-150 p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-blue-600 uppercase tracking-wide">Đã kiểm trước đó</span>
                <span className="text-xl font-black text-blue-700 mt-0.5 block">{batchResult.summary.alreadyChecked}</span>
              </div>
              <div className="bg-rose-50 border border-rose-150 p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-rose-600 uppercase tracking-wide">Ngoài sổ (chưa có)</span>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">{batchResult.summary.outOfBook}</span>
              </div>
              <div className="bg-slate-100 border border-slate-250 p-3 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wide">Lỗi hệ thống / scope</span>
                <span className="text-xl font-black text-slate-700 mt-0.5 block">
                  {batchResult.summary.failed + batchResult.summary.outOfScope}
                </span>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-2 justify-center py-2 border-y border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowBatchResultModal(false);
                  setShowBatchReviewWorkspace(true);
                  fetchPendingBatches();
                }}
                className="px-3.5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                📋 Rà soát kết quả
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilter('PENDING');
                  setShowBatchResultModal(false);
                }}
                className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                🔍 Xem cần rà soát
              </button>
              <button
                type="button"
                onClick={downloadBatchReport}
                className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
              >
                ⬇ Tải báo cáo lô
              </button>
              <button
                type="button"
                onClick={() => setShowBatchResultModal(false)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-350 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                💾 Tạm lưu lô quét
              </button>
            </div>
          </div>
        </BaseModal>
      )}


  // Helper functions moved to component body before return

      {showBatchReviewWorkspace && (
        <BaseModal
          isOpen={showBatchReviewWorkspace}
          onClose={closeBatchReviewWorkspace}
          title={
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-slate-800 tracking-tight">🔎 RÀ SOÁT KẾT QUẢ LÔ QUÉT</span>
              {activeBatchId && (
                <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-wider">
                  Mã Lô: {activeBatchId.substring(0, 8)}...
                </span>
              )}
            </div>
          }
          size="detail"
          noScroll={true}
        >
          <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Workspace Sub-Header: Select Batch & Quick Actions */}
            <div className="bg-white border-b border-slate-150 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Chọn lô quét cần rà soát:</label>
                <select
                  value={activeBatchId}
                  onChange={(e) => {
                    setActiveBatchId(e.target.value);
                    const found = pendingBatches.find((b: any) => b.batchId === e.target.value);
                    setActiveBatchData(found || null);
                    setBatchReviewTab('matchPendingItems');
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">-- Chọn lô --</option>
                  {pendingBatches.map((b: any) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId.substring(0, 8)}... ({b.totalCount} mã) — {new Date(b.createdAt).toLocaleTimeString('vi-VN')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={fetchPendingBatches}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  🔄 Tải lại
                </button>
              </div>

              {activeBatchData && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleBatchCancel}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                  >
                    🗑 Hủy toàn bộ lô
                  </button>

                  {(activeBatchData.groups.matchPendingItems?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchConfirmAll}
                      disabled={submitting}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      ✅ Xác nhận nhanh tất cả khớp ({activeBatchData.groups.matchPendingItems.length})
                    </button>
                  )}

                  {(activeBatchData.groups.reviewItems?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleBatchConfirmAllReviews}
                      disabled={submitting}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      ⚠ Xác nhận tất cả lệch ({activeBatchData.groups.reviewItems.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {activeBatchData ? (
              <div className="flex flex-1 overflow-hidden">
                {/* LEFT COLUMN: Group Statistics Breakdown */}
                <div className="w-80 border-r border-slate-200 bg-white p-4 space-y-3 flex-shrink-0 overflow-y-auto">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thống kê phân loại</div>
                  {[
                    { key: 'matchPendingItems', label: 'Khớp thông tin', colorClass: 'emerald', count: activeBatchData.groups.matchPendingItems?.length || 0, desc: 'Tài sản có thông tin sổ sách và quét thực tế trùng khớp hoàn toàn.' },
                    { key: 'reviewItems', label: 'Sai lệch dữ liệu', colorClass: 'amber', count: activeBatchData.groups.reviewItems?.length || 0, desc: 'Tài sản có sự chênh lệch vị trí, phòng ban, người dùng hoặc hỏng hóc.' },
                    { key: 'alreadyCheckedItems', label: 'Đã kiểm trước', colorClass: 'blue', count: activeBatchData.groups.alreadyCheckedItems?.length || 0, desc: 'Tài sản đã được thực hiện kiểm kê từ trước trong kỳ kiểm kê này.' },
                    { key: 'outOfBookItems', label: 'Ngoài sổ sách', colorClass: 'rose', count: activeBatchData.groups.outOfBookItems?.length || 0, desc: 'Tài sản không nằm trong danh mục sổ sách hiện tại.' },
                    { key: 'failedItems', label: 'Lỗi ghi nhận', colorClass: 'slate', count: activeBatchData.groups.failedItems?.length || 0, desc: 'Không thể đối chiếu do lỗi mã vạch hoặc dữ liệu không hợp lệ.' }
                  ].map(group => {
                    const isActive = batchReviewTab === group.key;
                    const total = group.count;

                    const progress = getBatchGroupProgress(group.key);
                    const hasProgress = total > 0;

                    return (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => setBatchReviewTab(group.key)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 block ${
                          isActive
                            ? `bg-${group.colorClass}-50/40 border-${group.colorClass}-200 shadow-sm ring-1 ring-${group.colorClass}-150`
                            : 'bg-white border-slate-150 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-black uppercase tracking-wider text-${group.colorClass}-850`}>
                            {group.label}
                          </span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg bg-${group.colorClass}-100 text-${group.colorClass}-800`}>
                            {total}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                          {group.desc}
                        </p>
                        {hasProgress && total > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[9px] font-extrabold text-slate-500 uppercase">
                              <span>Tiến độ xác nhận:</span>
                              <span>{progress.processed}/{total} ({progress.pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full bg-${group.colorClass}-600 rounded-full transition-all`} style={{ width: `${progress.pct}%` }} />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* RIGHT COLUMN: Active List details */}
                <div className="flex-1 bg-slate-50/50 p-6 overflow-y-auto space-y-4">
                  {/* MATCH_PENDING_CONFIRM Tab */}
                  {batchReviewTab === 'matchPendingItems' && (
                    <div className="space-y-3">
                      {(activeBatchData.groups.matchPendingItems || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">Không có tài sản nào trong nhóm này</div>
                      ) : (
                        (activeBatchData.groups.matchPendingItems || []).map((item: any) => {
                          const meta = batchConfirmedMeta[item.id];
                          const isConfirmed = item.checkStatus === 'CHECKED' || !!meta;
                          const undoDeadline = meta?.undoDeadline || item.undoDeadline;
                          const canUndo = undoDeadline && new Date(undoDeadline) > nowTime;
                          const secondsLeft = undoDeadline ? Math.max(0, Math.round((new Date(undoDeadline).getTime() - nowTime.getTime()) / 1000)) : 0;
                          const isEditing = editingItemIds.has(item.id);
                          const editData = batchReviewEditData[item.id] || {};
                          const status = getBatchCardStatus('matchPendingItems', item);
                          const hasEditedActualData = isEditing || status === 'EDITED' || Object.keys(editData).length > 0;

                          return (
                            <div key={item.id} className={`border rounded-2xl p-4 transition-all bg-white ${isConfirmed ? 'border-emerald-250 bg-emerald-50/10' : 'border-slate-200'}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2.5">
                                     <span className="font-black text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg tracking-wider border border-slate-200">{item.barcode}</span>
                                     <span className="text-xs font-black text-slate-800">{item.assetName}</span>
                                     <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{getBatchCardStatusLabel(status)}</span>
                                     {!isConfirmed && (
                                       <button
                                         type="button"
                                         onClick={() => setEditingItemIds(prev => {
                                           const next = new Set(prev);
                                           if (next.has(item.id)) next.delete(item.id);
                                           else next.add(item.id);
                                           return next;
                                         })}
                                         className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black border border-slate-200"
                                       >
                                         Chỉnh sửa
                                       </button>
                                     )}
                                   </div>
                                  {renderBatchComparisonTable(item, isEditing, editData, (fields) => {
                                    setBatchReviewEditData(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...(prev[item.id] || {}),
                                        ...fields
                                      }
                                    }));
                                  })}
                                </div>

                                <div className="flex-shrink-0 pt-1">
                                  {isConfirmed ? (
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider">
                                        ✅ ĐÃ XÁC NHẬN
                                      </span>
                                      {canUndo && secondsLeft > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleBatchUndo(item.id)}
                                          className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-black hover:bg-rose-100 cursor-pointer border border-rose-200 uppercase tracking-wider transition-all"
                                        >
                                          ↩ Hoàn tác ({secondsLeft}s)
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleBatchConfirmItem(item)}
                                      disabled={submitting}
                                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50 shadow-sm"
                                    >
                                      {hasEditedActualData ? '[ Xác nhận ]' : '[ Xác nhận khớp ]'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* NEED_REVIEW Tab */}
                  {batchReviewTab === 'reviewItems' && (
                    <div className="space-y-3">
                      {(activeBatchData.groups.reviewItems || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">Không có tài sản nào cần rà soát</div>
                      ) : (
                        (activeBatchData.groups.reviewItems || []).map((item: any) => {
                          const meta = batchConfirmedMeta[item.id];
                          const isConfirmed = item.checkStatus === 'CHECKED' || !!meta;
                          const undoDeadline = meta?.undoDeadline || item.undoDeadline;
                          const canUndo = undoDeadline && new Date(undoDeadline) > nowTime;
                          const secondsLeft = undoDeadline ? Math.max(0, Math.round((new Date(undoDeadline).getTime() - nowTime.getTime()) / 1000)) : 0;
                          
                          const isEditing = editingItemIds.has(item.id);
                          const editData = batchReviewEditData[item.id] || {};
                          const status = getBatchCardStatus('reviewItems', item);

                          return (
                            <div key={item.id} className={`border rounded-2xl p-4 transition-all bg-white ${isConfirmed ? 'border-emerald-250 bg-emerald-50/10' : 'border-amber-200 bg-amber-50/5'}`}>
                              <div className="flex items-start justify-between gap-4 border-b pb-3 border-slate-100">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-black text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg tracking-wider border border-amber-200">{item.barcode}</span>
                                    <span className="text-xs font-black text-slate-800">{item.assetName}</span>
                                     <span className="text-[9px] font-black text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                                       {item.reason}
                                     </span>
                                     <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{getBatchCardStatusLabel(status)}</span>
                                    {item.checkStatus === 'ACTUAL_UPDATED' && (
                                      <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                                        💾 Đã lưu thực tế
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2">
                                  {isConfirmed ? (
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider">
                                        ✅ ĐÃ XÁC NHẬN
                                      </span>
                                      {canUndo && secondsLeft > 0 ? (
                                        <button
                                          type="button"
                                          onClick={() => handleBatchUndo(item.id)}
                                          className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-black hover:bg-rose-100 cursor-pointer border border-rose-200 uppercase tracking-wider transition-all"
                                        >
                                          ↩ Hoàn tác ({secondsLeft}s)
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <>
                                      {isEditing ? (
                                        <div className="flex flex-col gap-2 items-end">
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingItemIds(prev => {
                                                  const next = new Set(prev);
                                                  next.delete(item.id);
                                                  return next;
                                                });
                                              }}
                                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition"
                                            >
                                              Hủy
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleBatchSaveOnly(item)}
                                              disabled={submitting}
                                              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50"
                                            >
                                              💾 Chỉ Lưu
                                            </button>
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                await handleBatchConfirmItem(item);
                                                setEditingItemIds(prev => {
                                                  const next = new Set(prev);
                                                  next.delete(item.id);
                                                  return next;
                                                });
                                              }}
                                              disabled={submitting}
                                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50 shadow-sm"
                                            >
                                              ✅ Lưu & Xác nhận
                                            </button>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await handleBatchProposeBookUpdate(item);
                                              setBatchCardStatus('reviewItems', item, 'PENDING_BOOK_UPDATE');
                                            }}
                                            disabled={submitting}
                                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50"
                                          >
                                            📋 Đề xuất cập nhật sổ
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-2 items-end">
                                          <div className="flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingItemIds(prev => {
                                                  const next = new Set(prev);
                                                  next.add(item.id);
                                                  return next;
                                                });
                                              }}
                                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition border border-slate-200"
                                            >
                                              ✏ Chỉnh sửa
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleBatchConfirmItem(item)}
                                              disabled={submitting}
                                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50 shadow-sm"
                                            >
                                              [ Xác nhận lệch ]
                                            </button>
                                          </div>
                                          {item.assetId && (
                                            <button
                                              type="button"
                                               onClick={async () => {
                                                 await handleBatchProposeBookUpdate(item);
                                                 setBatchCardStatus('reviewItems', item, 'PENDING_BOOK_UPDATE');
                                               }}
                                              disabled={submitting}
                                              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition disabled:opacity-50"
                                            >
                                              📋 Đề xuất cập nhật sổ
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {renderBatchComparisonTable(item, isEditing, editData, (fields) => {
                                setBatchReviewEditData(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...(prev[item.id] || {}),
                                    ...fields
                                  }
                                }));
                              })}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ALREADY_CHECKED Tab */}
                  {batchReviewTab === 'alreadyCheckedItems' && (
                    <div className="space-y-3">
                      {(activeBatchData.groups.alreadyCheckedItems || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">Không có tài sản nào trong nhóm này</div>
                      ) : (
                        (activeBatchData.groups.alreadyCheckedItems || []).map((item: any) => (
                          <div key={item.id || item.barcode} className="border border-blue-200 bg-blue-50/25 rounded-2xl p-4 transition-all bg-white">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-black text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg tracking-wider border border-slate-200">{item.barcode}</span>
                                  <span className="text-xs font-black text-slate-800">{item.assetName}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500">
                                  🏢 Phòng ban: {item.expectedDepartment} | 📍 Vị trí: {item.expectedLocation} | 👤 Người dùng: {item.expectedUser}
                                </p>
                                <div className="text-[10px] font-black text-blue-600">Trạng thái: ĐÃ ĐƯỢC KIỂM KÊ TRƯỚC ĐÓ</div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{getBatchCardStatusLabel(getBatchCardStatus('alreadyCheckedItems', item))}</span>
                                <button type="button" onClick={() => { setBatchCardStatus('alreadyCheckedItems', item, 'PENDING_CONFIRM'); toast.info('Đã mở thông tin phiếu đã kiểm.'); }} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 cursor-pointer border border-blue-200 uppercase tracking-wider transition-all">Xem phiếu đã kiểm</button>
                                <button type="button" onClick={() => { setBatchCardStatus('alreadyCheckedItems', item, 'PENDING_CONFIRM'); toast.success('Đã ghi nhận yêu cầu kiểm kê lại. Không ghi đè kết quả cũ.'); }} className="px-3 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-100 cursor-pointer border border-slate-200 uppercase tracking-wider transition-all">Yêu cầu kiểm kê lại</button>
                              <button
                                type="button"
                                onClick={() => setShowOverrideWarning(item)}
                                className="px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-100 cursor-pointer border border-amber-200 uppercase tracking-wider transition-all"
                              >
                                ⚠ Ghi đè thông tin
                              </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* OUT_OF_BOOK Tab */}
                  {batchReviewTab === 'outOfBookItems' && (
                    <div className="space-y-3">
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-700 font-bold leading-relaxed">
                        💡 <strong>Lưu ý:</strong> Tài sản ngoài sổ sách không thể được xác nhận kiểm kê trực tiếp vào sổ tài sản. Bạn chỉ có thể xem danh sách và tải báo cáo để xử lý sau kỳ kiểm kê.
                      </div>
                      {(activeBatchData.groups.outOfBookItems || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">Không có tài sản nào ngoài sổ sách</div>
                      ) : (
                        <>
                          {(activeBatchData.groups.outOfBookItems || []).map((item: any, idx: number) => (
                            <div key={idx} className="border border-rose-200 bg-rose-50/25 rounded-2xl p-4 transition-all bg-white">
                              <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-black text-xs px-2.5 py-1 bg-rose-50 text-rose-800 rounded-lg tracking-wider border border-rose-200">{item.barcode}</span>
                                    <span className="text-xs font-black text-rose-900">{item.assetName || 'Tài sản không xác định'}</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-rose-600">Trạng thái: Tài sản ngoài sổ sách</p>
                                  <span className="inline-flex text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{getBatchCardStatusLabel(getBatchCardStatus('outOfBookItems', item, idx))}</span>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button type="button" onClick={() => { setEditingItemIds(prev => new Set(prev).add(idx + 100000)); setBatchCardStatus('outOfBookItems', item, 'EDITED', idx); }} className="px-3 py-2 bg-white text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 cursor-pointer border border-slate-200 uppercase tracking-wider transition-all">Chỉnh sửa thông tin</button>
                                  <button type="button" onClick={() => setBatchCardStatus('outOfBookItems', item, 'PENDING_BOOK_UPDATE', idx)} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 cursor-pointer uppercase tracking-wider transition-all">Đăng ký tài sản ngoài sổ</button>
                                  <button type="button" onClick={() => setBatchCardStatus('outOfBookItems', item, 'SKIPPED', idx)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 cursor-pointer border border-slate-200 uppercase tracking-wider transition-all">Bỏ qua</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={downloadBatchReport}
                              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-700 cursor-pointer shadow-sm transition"
                            >
                              ⬇ Tải báo cáo sai lệch (.TXT)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* FAILED Tab */}
                  {batchReviewTab === 'failedItems' && (
                    <div className="space-y-3">
                      {(activeBatchData.groups.failedItems || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs font-bold">Không có bản ghi lỗi</div>
                      ) : (
                        (activeBatchData.groups.failedItems || []).map((item: any, idx: number) => (
                          <div key={idx} className="border border-slate-200 bg-slate-50/25 rounded-2xl p-4 transition-all bg-white">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <span className="font-black text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg tracking-wider border border-slate-200">{item.barcode}</span>
                                <span className="text-xs font-black text-slate-800">Lỗi: {item.reason}</span>
                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{getBatchCardStatusLabel(getBatchCardStatus('failedItems', item, idx))}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-3">
                                <button type="button" onClick={() => setBatchCardStatus('failedItems', item, 'EDITED', idx)} className="px-3 py-2 bg-white text-slate-700 rounded-xl text-xs font-black hover:bg-slate-50 cursor-pointer border border-slate-200 uppercase tracking-wider transition-all">Sửa mã</button>
                                <button type="button" onClick={() => { if (item.barcode) updateBatchQueue([...batchQueue, item.barcode]); setBatchCardStatus('failedItems', item, 'PENDING_CONFIRM', idx); }} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 cursor-pointer border border-blue-200 uppercase tracking-wider transition-all">Quét lại</button>
                                <button type="button" onClick={() => setBatchCardStatus('failedItems', item, 'SKIPPED', idx)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 cursor-pointer border border-slate-200 uppercase tracking-wider transition-all">Bỏ qua</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="text-center max-w-sm space-y-3">
                  <span className="text-4xl">📂</span>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Chưa chọn lô quét rà soát</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    Vui lòng chọn một lô quét từ danh sách dropdown ở góc trên bên trái để bắt đầu đối chiếu kết quả.
                  </p>
                </div>
              </div>
            )}
          </div>
        </BaseModal>
      )}

      {/* Override Warning Modal */}
      {showOverrideWarning && (
        <BaseModal
          isOpen={!!showOverrideWarning}
          onClose={() => setShowOverrideWarning(null)}
          title="⚠ CẬP NHẬT TÀI SẢN ĐÃ KIỂM"
          size="confirm"
        >
          <div className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
              Tài sản <strong>{showOverrideWarning.barcode}</strong> đã được kiểm kê trước đó.
              Nếu tiếp tục, hệ thống sẽ ghi đè kết quả kiểm trước và tạo audit log với action = OVERRIDE_CHECKED.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowOverrideWarning(null)}
                className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  handleBatchConfirmItem(showOverrideWarning);
                  setShowOverrideWarning(null);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Xác nhận ghi đè
              </button>
            </div>
          </div>
        </BaseModal>
      )}
      </div>
  );
};
