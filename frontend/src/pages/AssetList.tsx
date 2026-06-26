import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Plus, 
  X, 
  FileUp, 
  AlertCircle, 
  Eye, 
  UserPlus, 
  ArrowRightLeft, 
  Wrench, 
  Trash2, 
  Box, 
  CheckCircle2, 
  RotateCcw, 
  ClipboardCheck, 
  MapPin, 
  Tag, 
  Printer, 
  ArrowUpDown, 
  ShieldAlert,
  CheckSquare,
  MinusSquare,
  Square,
  Activity,
  ChevronDown,
  Trash,
  Loader2,
  Filter,
  Edit3
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AutocompleteInput, MultiSelect, PopoverFilter, FilterChip, ChipPopoverFilter } from '../components/FilterComponents';
import { Can } from '../components/Can';
import { useAuth } from '../context/AuthContext';
import { NormalizationModal } from '../components/NormalizationModal';
import { useModal } from '../context/ModalContext';

export const AssetList: React.FC = () => {
  const { hasPermission } = useAuth();
  const { activeModal, openModal, closeModal } = useModal();
  const isDetailOpen = activeModal?.type === 'ASSET_DETAIL';
  const selectedAssetId = activeModal?.payload?.assetId;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Basic pagination/sort from URL or defaults
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Advanced Filters from URL
  const filters: any = {
    status: searchParams.get('status') || '',
    companyCode: searchParams.get('companyCode') || '',
    currentUserName: searchParams.get('currentUserName') || '',
    departmentName: searchParams.get('departmentName') || '',
    cityName: searchParams.get('cityName') || '',
    projectName: searchParams.get('projectName') || '',
    locationQuery: searchParams.get('locationQuery') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    purchaseDateFrom: searchParams.get('purchaseDateFrom') || '',
    purchaseDateTo: searchParams.get('purchaseDateTo') || '',
    handoverDateFrom: searchParams.get('handoverDateFrom') || '',
    handoverDateTo: searchParams.get('handoverDateTo') || '',
    supplierName: searchParams.get('supplierName') || '',
    hasSerial: searchParams.get('hasSerial') || '',
    hasDocuments: searchParams.get('hasDocuments') || '',
    level4Name: searchParams.get('level4Name') || '',
    isAssigned: searchParams.get('isAssigned') || '',
    hasPrinted: searchParams.get('hasPrinted') || '',
    isChecked: searchParams.get('isChecked') || '',
    invoiceBatchId: searchParams.get('invoiceBatchId') || '',
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedAssetMap, setSelectedAssetMap] = useState<Record<number, any>>({});
  const [localSearch, setLocalSearch] = useState(search);

  // Compact Filters States
  const [lv4Categories, setLv4Categories] = useState<any[]>([]);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // Sync temporary states with URL filters
  const [tempStatus, setTempStatus] = useState<string[]>([]);
  const [tempUserName, setTempUserName] = useState('');
  const [tempDeptName, setTempDeptName] = useState('');
  const [tempAllocation, setTempAllocation] = useState(''); // '', 'ASSIGNED', 'UNASSIGNED'
  const [tempHandoverFrom, setTempHandoverFrom] = useState('');
  const [tempHandoverTo, setTempHandoverTo] = useState('');

  const [tempCity, setTempCity] = useState('');
  const [tempProject, setTempProject] = useState('');
  const [tempLocation, setTempLocation] = useState('');

  const [tempLv4Name, setTempLv4Name] = useState<string[]>([]);
  const [lv4Search, setLv4Search] = useState('');

  // Drawer advanced filters
  const [tempCompanyCode, setTempCompanyCode] = useState('');
  const [isNormalizationOpen, setIsNormalizationOpen] = useState(false);
  const [tempPriceMin, setTempPriceMin] = useState('');
  const [tempPriceMax, setTempPriceMax] = useState('');
  const [tempPurchaseFrom, setTempPurchaseFrom] = useState('');
  const [tempPurchaseTo, setTempPurchaseTo] = useState('');
  const [tempSupplierName, setTempSupplierName] = useState('');
  const [tempHasSerial, setTempHasSerial] = useState('');
  const [tempHasDocuments, setTempHasDocuments] = useState('');
  const [tempHasPrinted, setTempHasPrinted] = useState('');
  const [tempIsChecked, setTempIsChecked] = useState('');
  const [tempSortBy, setTempSortBy] = useState(sortBy);
  const [tempSortOrder, setTempSortOrder] = useState(sortOrder);

  const [filterInvoiceNo, setFilterInvoiceNo] = useState<string>('');

  useEffect(() => {
    const fetchLv4Categories = async () => {
      try {
        const res = await api.get('/assets/categories/active/all');
        const lv4 = res.data.filter((c: any) => c.level === 4);
        setLv4Categories(lv4);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchLv4Categories();
  }, []);

  useEffect(() => {
    if (filters.invoiceBatchId) {
      api.get(`/assets/invoices/${filters.invoiceBatchId}`)
        .then(res => setFilterInvoiceNo(res.data.invoiceNo))
        .catch(() => setFilterInvoiceNo(`ID: ${filters.invoiceBatchId}`));
    } else {
      setFilterInvoiceNo('');
    }
  }, [filters.invoiceBatchId]);

  useEffect(() => {
    setTempStatus(filters.status ? filters.status.split(',') : []);
    setTempUserName(filters.currentUserName || '');
    setTempDeptName(filters.departmentName || '');
    setTempAllocation(filters.isAssigned === 'true' ? 'ASSIGNED' : filters.isAssigned === 'false' ? 'UNASSIGNED' : '');
    setTempHandoverFrom(filters.handoverDateFrom || '');
    setTempHandoverTo(filters.handoverDateTo || '');

    setTempCity(filters.cityName || '');
    setTempProject(filters.projectName || '');
    setTempLocation(filters.locationQuery || '');

    setTempLv4Name(filters.level4Name ? filters.level4Name.split(',') : []);

    setTempCompanyCode(filters.companyCode || '');
    setTempPriceMin(filters.priceMin || '');
    setTempPriceMax(filters.priceMax || '');
    setTempPurchaseFrom(filters.purchaseDateFrom || '');
    setTempPurchaseTo(filters.purchaseDateTo || '');
    setTempSupplierName(filters.supplierName || '');
    setTempHasSerial(filters.hasSerial || '');
    setTempHasDocuments(filters.hasDocuments || '');
    setTempHasPrinted(filters.hasPrinted || '');
    setTempIsChecked(filters.isChecked || '');
    setTempSortBy(sortBy);
    setTempSortOrder(sortOrder);
  }, [searchParams]);

  const applyStatusFilter = () => {
    updateParam('status', tempStatus.join(','));
  };

  const clearStatusFilter = () => {
    setTempStatus([]);
    updateParam('status', null);
  };

  const applyAllocationFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    if (tempUserName) newParams.set('currentUserName', tempUserName);
    else newParams.delete('currentUserName');

    if (tempDeptName) newParams.set('departmentName', tempDeptName);
    else newParams.delete('departmentName');

    if (tempAllocation === 'ASSIGNED') newParams.set('isAssigned', 'true');
    else if (tempAllocation === 'UNASSIGNED') newParams.set('isAssigned', 'false');
    else newParams.delete('isAssigned');

    if (tempHandoverFrom) newParams.set('handoverDateFrom', tempHandoverFrom);
    else newParams.delete('handoverDateFrom');

    if (tempHandoverTo) newParams.set('handoverDateTo', tempHandoverTo);
    else newParams.delete('handoverDateTo');

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearAllocationFilter = () => {
    setTempUserName('');
    setTempDeptName('');
    setTempAllocation('');
    setTempHandoverFrom('');
    setTempHandoverTo('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('currentUserName');
    newParams.delete('departmentName');
    newParams.delete('isAssigned');
    newParams.delete('handoverDateFrom');
    newParams.delete('handoverDateTo');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const applyLocationFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    if (tempCity) newParams.set('cityName', tempCity);
    else newParams.delete('cityName');

    if (tempProject) newParams.set('projectName', tempProject);
    else newParams.delete('projectName');

    if (tempLocation) newParams.set('locationQuery', tempLocation);
    else newParams.delete('locationQuery');

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearLocationFilter = () => {
    setTempCity('');
    setTempProject('');
    setTempLocation('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('cityName');
    newParams.delete('projectName');
    newParams.delete('locationQuery');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const applyLv4Filter = () => {
    updateParam('level4Name', tempLv4Name.join(','));
  };

  const clearLv4Filter = () => {
    setTempLv4Name([]);
    updateParam('level4Name', null);
  };

  const applyAdvancedFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    if (tempStatus.length) newParams.set('status', tempStatus.join(','));
    else newParams.delete('status');

    if (tempUserName) newParams.set('currentUserName', tempUserName);
    else newParams.delete('currentUserName');

    if (tempDeptName) newParams.set('departmentName', tempDeptName);
    else newParams.delete('departmentName');

    if (tempAllocation === 'ASSIGNED') newParams.set('isAssigned', 'true');
    else if (tempAllocation === 'UNASSIGNED') newParams.set('isAssigned', 'false');
    else newParams.delete('isAssigned');

    if (tempHandoverFrom) newParams.set('handoverDateFrom', tempHandoverFrom);
    else newParams.delete('handoverDateFrom');

    if (tempHandoverTo) newParams.set('handoverDateTo', tempHandoverTo);
    else newParams.delete('handoverDateTo');

    if (tempCity) newParams.set('cityName', tempCity);
    else newParams.delete('cityName');

    if (tempProject) newParams.set('projectName', tempProject);
    else newParams.delete('projectName');

    if (tempLocation) newParams.set('locationQuery', tempLocation);
    else newParams.delete('locationQuery');

    if (tempLv4Name.length) newParams.set('level4Name', tempLv4Name.join(','));
    else newParams.delete('level4Name');

    if (tempCompanyCode) newParams.set('companyCode', tempCompanyCode);
    else newParams.delete('companyCode');

    if (tempPriceMin) newParams.set('priceMin', tempPriceMin);
    else newParams.delete('priceMin');

    if (tempPriceMax) newParams.set('priceMax', tempPriceMax);
    else newParams.delete('priceMax');

    if (tempPurchaseFrom) newParams.set('purchaseDateFrom', tempPurchaseFrom);
    else newParams.delete('purchaseDateFrom');

    if (tempPurchaseTo) newParams.set('purchaseDateTo', tempPurchaseTo);
    else newParams.delete('purchaseDateTo');

    if (tempSupplierName) newParams.set('supplierName', tempSupplierName);
    else newParams.delete('supplierName');

    if (tempHasSerial) newParams.set('hasSerial', tempHasSerial);
    else newParams.delete('hasSerial');

    if (tempHasDocuments) newParams.set('hasDocuments', tempHasDocuments);
    else newParams.delete('hasDocuments');

    if (tempHasPrinted) newParams.set('hasPrinted', tempHasPrinted);
    else newParams.delete('hasPrinted');

    if (tempIsChecked) newParams.set('isChecked', tempIsChecked);
    else newParams.delete('isChecked');

    if (tempSortBy) newParams.set('sortBy', tempSortBy);
    if (tempSortOrder) newParams.set('sortOrder', tempSortOrder);

    newParams.set('page', '1');
    setSearchParams(newParams);
    setIsAdvancedFilterOpen(false);
  };

  const clearAdvancedFilters = () => {
    setTempStatus([]);
    setTempUserName('');
    setTempDeptName('');
    setTempAllocation('');
    setTempHandoverFrom('');
    setTempHandoverTo('');
    setTempCity('');
    setTempProject('');
    setTempLocation('');
    setTempLv4Name([]);
    setTempCompanyCode('');
    setTempPriceMin('');
    setTempPriceMax('');
    setTempPurchaseFrom('');
    setTempPurchaseTo('');
    setTempSupplierName('');
    setTempHasSerial('');
    setTempHasDocuments('');
    setTempHasPrinted('');
    setTempIsChecked('');
    setTempSortBy('updatedAt');
    setTempSortOrder('desc');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('status');
    newParams.delete('currentUserName');
    newParams.delete('departmentName');
    newParams.delete('isAssigned');
    newParams.delete('handoverDateFrom');
    newParams.delete('handoverDateTo');
    newParams.delete('cityName');
    newParams.delete('projectName');
    newParams.delete('locationQuery');
    newParams.delete('level4Name');
    newParams.delete('companyCode');
    newParams.delete('priceMin');
    newParams.delete('priceMax');
    newParams.delete('purchaseDateFrom');
    newParams.delete('purchaseDateTo');
    newParams.delete('supplierName');
    newParams.delete('hasSerial');
    newParams.delete('hasDocuments');
    newParams.delete('hasPrinted');
    newParams.delete('isChecked');
    newParams.delete('sortBy');
    newParams.delete('sortOrder');
    newParams.set('page', '1');
    setSearchParams(newParams);
    setIsAdvancedFilterOpen(false);
  };

  const clearAllFilters = () => {
    setLocalSearch('');
    setSearchParams({});
  };

  // Sync localSearch with search query param when it changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (!isAdvancedFilterOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAdvancedFilterOpen(false);
    };
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = () => setIsAdvancedFilterOpen(false);
    window.addEventListener('keydown', handleKeyDown);
    orientationQuery.addEventListener('change', handleOrientationChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      orientationQuery.removeEventListener('change', handleOrientationChange);
    };
  }, [isAdvancedFilterOpen]);

  // Debounce updating the search URL parameter to prevent focus loss & IME breaks
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        updateParam('search', localSearch);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, search]);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAssetActionMenuOpen, setIsAssetActionMenuOpen] = useState(false);

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await api.get('/assets', { params });
      setAssets(res.data.assets);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải danh sách tài sản");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      const res = await api.get('/assets/stats', { params });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentPageAssetIds = useMemo(() => assets.map(a => a.id), [assets]);
  const isCurrentPageFullySelected = assets.length > 0 && currentPageAssetIds.every(id => selectedIds.includes(id));
  const isCurrentPagePartiallySelected = assets.length > 0 && currentPageAssetIds.some(id => selectedIds.includes(id)) && !isCurrentPageFullySelected;

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedAssetMap({});
  };

  const toggleAssetSelection = (asset: any) => {
    setSelectedIds(prev => {
      if (prev.includes(asset.id)) return prev.filter(id => id !== asset.id);
      return [...prev, asset.id];
    });
    setSelectedAssetMap(prev => {
      if (prev[asset.id]) {
        const next = { ...prev };
        delete next[asset.id];
        return next;
      }
      return { ...prev, [asset.id]: asset };
    });
  };

  const toggleSelectAll = () => {
    if (isCurrentPageFullySelected) {
      const pageIdSet = new Set(currentPageAssetIds);
      setSelectedIds(prev => prev.filter(id => !pageIdSet.has(id)));
      setSelectedAssetMap(prev => {
        const next = { ...prev };
        currentPageAssetIds.forEach(id => delete next[id]);
        return next;
      });
      return;
    }

    setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageAssetIds])));
    setSelectedAssetMap(prev => {
      const next = { ...prev };
      assets.forEach(asset => {
        next[asset.id] = asset;
      });
      return next;
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return { label: 'Trong kho', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'ASSIGNED': return { label: 'Đang sử dụng', color: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'RETIRED': return { label: 'Đã thu hồi', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
      case 'UNDER_REPAIR': return { label: 'Đang sửa chữa', color: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'PENDING_DISPOSAL': return { label: 'Chờ thanh lý', color: 'bg-orange-50 text-orange-700 border-orange-100' };
      case 'DISPOSED': return { label: 'Đã thanh lý', color: 'bg-slate-50 text-slate-700 border-slate-100' };
      case 'LOST': return { label: 'Mất', color: 'bg-red-50 text-red-700 border-red-100' };
      case 'DAMAGED': return { label: 'Hỏng', color: 'bg-rose-50 text-rose-700 border-rose-100' };
      default: return { label: status, color: 'bg-slate-50 text-slate-700 border-slate-100' };
    }
  };

  const getMissingAssetFields = (asset: any) => {
    const missing: string[] = [];
    const isEmpty = (value: any) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      return !normalized || normalized === 'n/a' || normalized === 'na' || normalized === '-';
    };

    if (isEmpty(asset.serialNumber)) missing.push('Serial');
    if (isEmpty(asset.cityName)) missing.push('Thành phố');
    if (isEmpty(asset.locationName)) missing.push('Vị trí');
    if (asset.status === 'ASSIGNED' && isEmpty(asset.currentUserName)) missing.push('Người dùng');
    if (asset.status === 'ASSIGNED' && isEmpty(asset.departmentName)) missing.push('Phòng ban');
    return missing;
  };

  const cleanLocationName = (cityName?: string, locationName?: string) => {
    const city = String(cityName || '').trim();
    let location = String(locationName || '').trim();
    if (city && location.toLowerCase().startsWith(`${city.toLowerCase()}-`)) {
      location = location.slice(city.length + 1).trim();
    }
    if (city && location.toLowerCase().startsWith(`${city.toLowerCase()} /`)) {
      location = location.slice(city.length + 2).trim();
    }
    return location;
  };

  const isNonStandardLocation = (asset: any) => {
    const city = String(asset.cityName || '').trim();
    const location = String(asset.locationName || '').trim();
    return !!(city && location && location.toLowerCase().startsWith(`${city.toLowerCase()}-`));
  };

  const getLocationIssues = (asset: any) => {
    const issues: string[] = [];
    if (isNonStandardLocation(asset)) issues.push('Vị trí đang lặp tỉnh/thành phố');
    return issues;
  };

  const handleNormalizeSelectedLocations = async () => {
    const targets = selectedAssets.filter(isNonStandardLocation);
    if (targets.length === 0) {
      toast.info('Không có tài sản đang chọn bị sai form vị trí.');
      return;
    }

    if (!window.confirm(`Chuẩn hóa vị trí cho ${targets.length} tài sản đang chọn?`)) return;

    try {
      await Promise.all(targets.map((asset: any) => api.patch(`/assets/${asset.id}/assignment-info`, {
        currentUserName: asset.currentUserName || null,
        currentPosition: asset.currentPosition || null,
        departmentName: asset.departmentName || null,
        cityName: asset.cityName || null,
        locationName: cleanLocationName(asset.cityName, asset.locationName) || null,
        reason: 'Chuẩn hóa nhanh form Thành phố/Dự án/Vị trí từ Sổ tài sản'
      })));
      toast.success(`Đã chuẩn hóa vị trí cho ${targets.length} tài sản`);
      clearSelection();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể chuẩn hóa vị trí hàng loạt');
    }
  };

  const openAssetDetail = (assetId: number, tab: string = 'info') => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    let targetTab = tab;
    if (tab === 'status_auto') {
      switch (asset.status) {
        case 'UNDER_REPAIR':
        case 'DAMAGED':
          targetTab = 'repair';
          break;
        case 'LOST':
          targetTab = 'timeline';
          break;
        case 'IN_STOCK':
          targetTab = 'info';
          break;
        default:
          targetTab = 'info';
      }
    }

    openModal("ASSET_DETAIL", {
      assetId,
      initialTab: targetTab,
      onAction: (action: string, id: number) => {
        if (action === 'refresh') {
          fetchAssets();
        } else {
          const targetAsset = assets.find(a => a.id === id);
          if (targetAsset) handleAssetAction(action, targetAsset);
        }
      }
    });
  };

  const handleAssetAction = (action: string, asset: any) => {
    setActiveMenuId(null);
    switch (action) {
      case 'view':
        openAssetDetail(asset.id, 'info');
        break;
      case 'handover':
        openModal("TRANSFER_WIZARD", {
          initialAssetIds: [asset.id],
          defaultType: asset.status === 'IN_STOCK' ? 'HANDOVER' : 'TRANSFER',
          source: 'ASSET_DETAIL',
          onComplete: fetchAssets
        });
        break;
      case 'revoke':
        openModal("TRANSFER_WIZARD", {
          initialAssetIds: [asset.id],
          defaultType: 'RECALL',
          source: 'ASSET_DETAIL',
          onComplete: fetchAssets
        });
        break;
      case 'inventory':
        openModal("INVENTORY_WIZARD", {
          initialAssetIds: [asset.id],
          onComplete: fetchAssets
        });
        break;
      case 'repair':
        if (asset.repairTickets && asset.repairTickets.length > 0) {
          toast.warning("Tài sản này đang có phiếu sửa chữa chưa hoàn tất.");
          break;
        }
        openModal("BM_FORM", {
          code: 'BM03/QLTS',
          data: { asset },
          onSubmit: fetchAssets
        });
        break;
      case 'liquidation':
        openModal("BM_FORM", {
          code: 'BM04/QLTS',
          data: { asset },
          onSubmit: fetchAssets
        });
        break;
      case 'print_label':
        if (!asset) {
          toast.error('Không tìm thấy dữ liệu tài sản.');
          break;
        }
        const assetCode = asset.asset_code || asset.assetCode || asset.code;
        if (!assetCode) {
          toast.error('Tài sản chưa có mã, không thể in tem.');
          break;
        }
        closeModal();
        navigate('/print-center', {
          state: {
            selectedAssets: [asset]
          }
        });
        toast.success("Đã thêm tài sản vào danh sách in tem");
        break;
      case 'history':
        openAssetDetail(asset.id, 'timeline');
        break;
      default:
        break;
    }
  };

  const handleBulkPrint = () => {
    const currentPageMap = new Map(assets.map(asset => [asset.id, asset]));
    const selectedAssetsForPrint = selectedIds
      .map(id => selectedAssetMap[id] || currentPageMap.get(id))
      .filter(Boolean);
    if (selectedAssetsForPrint.length === 0) return;
    navigate('/print-center', {
      state: {
        selectedAssets: selectedAssetsForPrint
      }
    });
    clearSelection();
    toast.success(`Đã thêm ${selectedAssetsForPrint.length} tài sản vào danh sách in tem`);
  };

  const downloadBlobResponse = async (response: any, fallbackFileName: string) => {
    const contentType = String(response.headers?.['content-type'] || '');
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || 'Không thể xuất báo cáo');
    }

    const disposition = String(response.headers?.['content-disposition'] || '');
    const matchedFileName = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1];
    const fileName = matchedFileName ? decodeURIComponent(matchedFileName.replace(/"/g, '')) : fallbackFileName;
    const blob = new Blob([response.data], { type: contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const getExportErrorMessage = async (err: any, fallback: string) => {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        if (text) {
          const parsed = JSON.parse(text);
          return parsed.message || fallback;
        }
      } catch {
        return fallback;
      }
    }
    return err?.response?.data?.message || err?.message || fallback;
  };

  const handleExportAll = async () => {
    try {
      const response = await api.get('/import/assets/export', { responseType: 'blob' });
      await downloadBlobResponse(response, `so_tai_san_toan_bo_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Xuất dữ liệu toàn bộ tài sản thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error(await getExportErrorMessage(err, "Lỗi khi tải dữ liệu xuất toàn bộ"));
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      delete params.page;
      delete params.limit;
      const response = await api.get('/assets/export-excel', { params, responseType: 'blob' });
      await downloadBlobResponse(response, `so_tai_san_snapshot_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Tải báo cáo sổ tài sản (snapshot) thành công!");
    } catch (err: any) {
      console.error(err);
      toast.error(await getExportErrorMessage(err, "Lỗi khi tải báo cáo sổ tài sản"));
    }
  };

  const handleExportSelected = () => {
    if (selectedAssets.length === 0) return;
    
    const headers = [
      'Mã tài sản',
      'Số TT',
      'Mã công ty',
      'Tên tài sản',
      'Số Serial',
      'ĐVT',
      'Mục đích',
      'Trạng thái',
      'Người sử dụng',
      'Chức vụ',
      'Phòng ban',
      'Vị trí',
      'Thành phố',
      'Dự án',
      ...(hasPermission('ASSET_VIEW_PRICE') ? ['Giá mua (VNĐ)'] : []),
      'Nhà cung cấp',
      'Ghi chú'
    ];

    const rows = selectedAssets.map(a => [
      a.assetCode || '',
      a.runningNoText || '',
      a.companyCode || '',
      a.assetName || '',
      a.serialNumber || '',
      a.unit || 'Cái',
      a.usagePurpose || '',
      getStatusLabel(a.status).label,
      a.currentUserName || '',
      a.currentPosition || '',
      a.departmentName || '',
      a.locationName || '',
      a.cityName || '',
      a.projectName || '',
      ...(hasPermission('ASSET_VIEW_PRICE') ? [a.purchasePriceExVat || 0] : []),
      a.supplierName || '',
      a.note || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_sach_tai_san_chon_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xuất dữ liệu Excel tài sản được chọn thành công!");
  };

  const selectedAssetCodesText = () => selectedAssets.map((a: any) => a.assetCode).filter(Boolean).join(', ');

  const handleExportSelectedPdf = () => {
    if (selectedAssets.length === 0) return;
    const rows = selectedAssets.map((asset: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${asset.assetCode || ''}</td>
        <td>${asset.assetName || asset.assetNameShort || ''}</td>
        <td>${asset.serialNumber || ''}</td>
        <td>${asset.currentUserName || ''}</td>
        <td>${asset.departmentName || ''}</td>
        <td>${asset.cityName || ''}</td>
        <td>${cleanLocationName(asset.cityName, asset.locationName) || ''}</td>
        <td>${getStatusLabel(asset.status).label}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ xuất PDF.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Báo cáo tài sản đã chọn</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 8px; text-transform: uppercase; }
            p { margin: 0 0 16px; font-size: 12px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>Báo cáo danh sách tài sản đã chọn</h1>
          <p>Số lượng: ${selectedAssets.length} tài sản • Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
          <table>
            <thead>
              <tr>
                <th>STT</th><th>Mã tài sản</th><th>Tên tài sản</th><th>Serial</th>
                <th>Người dùng</th><th>Phòng ban</th><th>Thành phố</th><th>Vị trí</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const openBulkLostForm = () => {
    const reporter = window.prompt('Người báo mất là ai?');
    if (!reporter?.trim()) {
      toast.error('Bắt buộc nhập người báo mất.');
      return;
    }
    const detectedAt = window.prompt('Thời gian phát hiện mất (dd/mm/yyyy hoặc ghi chú thời gian):', new Date().toLocaleDateString('vi-VN'));
    if (!detectedAt?.trim()) {
      toast.error('Bắt buộc nhập thời gian phát hiện mất.');
      return;
    }
    openModal("BM_FORM", {
      code: 'BM13/QLTS',
      data: {
        asset: selectedAssets[0],
        assets: selectedAssets,
        reporter,
        lostDetectedDate: detectedAt,
        note: `Ghi nhận mất hàng loạt: ${selectedAssetCodesText()}`
      },
      onSubmit: () => { clearSelection(); fetchAssets(); }
    });
  };

  const openBulkLiquidationForm = () => {
    const reason = window.prompt('Nhập lý do thanh lý tài sản:');
    if (!reason?.trim()) {
      toast.error('Bắt buộc nhập lý do thanh lý.');
      return;
    }
    const confirmed = window.confirm(`Xác nhận thanh lý ${selectedAssets.length} tài sản?\n\n${selectedAssetCodesText()}`);
    if (!confirmed) return;
    openModal("BM_FORM", {
      code: 'BM04/QLTS',
      data: {
        asset: selectedAssets[0],
        assets: selectedAssets,
        reason,
        note: reason
      },
      onSubmit: () => { clearSelection(); fetchAssets(); }
    });
  };

  const handleBulkCancelAssets = async () => {
    const reason = window.prompt('Nhập lý do hủy tài sản. Hành động này không thể hoàn tác trên quy trình vận hành:');
    if (!reason?.trim()) {
      toast.error('Bắt buộc nhập lý do hủy tài sản.');
      return;
    }
    const confirmed = window.confirm(`CẢNH BÁO: Hủy ${selectedAssets.length} tài sản và chuyển trạng thái sang Đã thanh lý/loại bỏ.\n\nKhông thể hoàn tác trên quy trình vận hành.\n\nDanh sách: ${selectedAssetCodesText()}\n\nTiếp tục?`);
    if (!confirmed) return;

    try {
      await Promise.all(selectedAssets.map((asset: any) => api.patch(`/assets/${asset.id}`, {
        status: 'DISPOSED',
        reason: `Hủy tài sản: ${reason}`
      })));
      toast.success(`Đã hủy ${selectedAssets.length} tài sản`);
      clearSelection();
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể hủy tài sản đã chọn');
    }
  };

  const handleBulkDeleteAssets = () => {
    const reason = window.prompt('Nhập lý do xóa/loại khỏi hệ thống:');
    if (!reason?.trim()) {
      toast.error('Bắt buộc nhập lý do xóa.');
      return;
    }
    window.alert('Chức năng xóa hàng loạt khỏi hệ thống chưa được bật để tránh mất dữ liệu. Vui lòng dùng Hủy tài sản hoặc xử lý xóa từng tài sản theo hóa đơn nếu đủ điều kiện.');
  };

  const handleSort = (columnKey: string) => {
    const newOrder = (sortBy === columnKey && sortOrder === 'asc') ? 'desc' : 'asc';
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sortBy', columnKey);
    newParams.set('sortOrder', newOrder);
    setSearchParams(newParams);
  };

  const sortableColumns = [
    { key: "assetCode", label: "Mã tài sản", className: "w-[170px]" },
    { key: "assetName", label: "Tên tài sản", className: "w-[280px] md:w-[320px]" },
    { key: "currentUserName", label: "Người sử dụng / Chức vụ", className: "w-[210px]" },
    { key: "cityName", label: "Thành phố / Dự án / Vị trí", className: "hidden xl:table-cell w-[260px]" },
    { key: "status", label: "Trạng thái", className: "w-[150px]" },
  ];

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { key: 'ALL', label: 'TỔNG TÀI SẢN', status: '', value: stats.total, icon: <Box className="h-4 w-4" />, color: 'primary' },
      { key: 'ASSIGNED', label: 'ĐANG SỬ DỤNG', status: 'ASSIGNED', value: stats.assigned, icon: <CheckCircle2 className="h-4 w-4" />, color: 'blue' },
      { key: 'IN_STOCK', label: 'TRONG KHO', status: 'IN_STOCK', value: stats.inStock, icon: <Box className="h-4 w-4" />, color: 'emerald' },
      { key: 'DAMAGED', label: 'BÁO HỎNG', status: 'DAMAGED', value: stats.damaged, icon: <AlertCircle className="h-4 w-4" />, color: 'amber' },
      { key: 'LOST', label: 'MẤT / THẤT THOÁT', status: 'LOST', value: stats.lost, icon: <ShieldAlert className="h-4 w-4" />, color: 'rose' },
    ];
  }, [stats]);

  const getStatusLabelText = (statusVal: string) => {
    const parts = statusVal.split(',').filter(Boolean);
    return parts.map(p => {
      switch (p) {
        case 'IN_STOCK': return 'Trong kho';
        case 'ASSIGNED': return 'Đang sử dụng';
        case 'RETIRED': return 'Đã thu hồi';
        case 'UNDER_REPAIR': return 'Đang sửa chữa';
        case 'PENDING_DISPOSAL': return 'Chờ thanh lý';
        case 'DISPOSED': return 'Đã thanh lý';
        case 'LOST': return 'Mất';
        case 'DAMAGED': return 'Hỏng';
        default: return p;
      }
    }).join(', ');
  };

  const selectedAssets = useMemo(() => {
    const currentPageMap = new Map(assets.map(asset => [asset.id, asset]));
    return selectedIds
      .map(id => selectedAssetMap[id] || currentPageMap.get(id))
      .filter(Boolean);
  }, [assets, selectedAssetMap, selectedIds]);

  const handleSortSelection = (key: string, order: string, isFilter: boolean = false, filterKey?: string, filterValue?: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (isFilter && filterKey) {
      if (newParams.get(filterKey) === filterValue) {
        newParams.delete(filterKey);
      } else {
        newParams.set(filterKey, filterValue || '');
      }
    } else {
      newParams.set('sortBy', key);
      newParams.set('sortOrder', order);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const activeFilterChips = useMemo(() => {
    const list: { label: string; value: string; onClear: () => void }[] = [];
    
    if (filters.status) {
      const parts = filters.status.split(',').filter(Boolean);
      parts.forEach((p: string) => {
        list.push({
          label: 'Trạng thái',
          value: getStatusLabel(p).label,
          onClear: () => {
            const next = parts.filter((x: string) => x !== p);
            updateParam('status', next.length > 0 ? next.join(',') : null);
          }
        });
      });
    }

    if (filters.cityName) {
      list.push({
        label: 'Thành phố',
        value: filters.cityName,
        onClear: () => updateParam('cityName', null)
      });
    }

    if (filters.projectName) {
      list.push({
        label: 'Dự án',
        value: filters.projectName,
        onClear: () => updateParam('projectName', null)
      });
    }

    if (filters.locationQuery) {
      list.push({
        label: 'Vị trí',
        value: filters.locationQuery,
        onClear: () => updateParam('locationQuery', null)
      });
    }

    if (filters.currentUserName) {
      list.push({
        label: 'Người dùng',
        value: filters.currentUserName,
        onClear: () => updateParam('currentUserName', null)
      });
    }

    if (filters.departmentName) {
      list.push({
        label: 'Phòng ban',
        value: filters.departmentName,
        onClear: () => updateParam('departmentName', null)
      });
    }

    if (filters.isAssigned === 'true') {
      list.push({
        label: 'Phân bổ',
        value: 'Đã cấp phát',
        onClear: () => updateParam('isAssigned', null)
      });
    } else if (filters.isAssigned === 'false') {
      list.push({
        label: 'Phân bổ',
        value: 'Chưa cấp phát',
        onClear: () => updateParam('isAssigned', null)
      });
    }

    if (filters.level4Name) {
      const parts = filters.level4Name.split(',').filter(Boolean);
      parts.forEach((p: string) => {
        list.push({
          label: 'Nhóm LV4',
          value: p,
          onClear: () => {
            const next = parts.filter((x: string) => x !== p);
            updateParam('level4Name', next.length > 0 ? next.join(',') : null);
          }
        });
      });
    }

    if (filters.companyCode) {
      list.push({
        label: 'Công ty',
        value: filters.companyCode,
        onClear: () => updateParam('companyCode', null)
      });
    }

    if (filters.supplierName) {
      list.push({
        label: 'Nhà cung cấp',
        value: filters.supplierName,
        onClear: () => updateParam('supplierName', null)
      });
    }

    if (filters.hasSerial === 'true') {
      list.push({
        label: 'Số Serial',
        value: 'Có Serial',
        onClear: () => updateParam('hasSerial', null)
      });
    } else if (filters.hasSerial === 'false') {
      list.push({
        label: 'Số Serial',
        value: 'Thiếu Serial',
        onClear: () => updateParam('hasSerial', null)
      });
    }

    if (filters.hasDocuments === 'true') {
      list.push({
        label: 'Hồ sơ',
        value: 'Có tài liệu',
        onClear: () => updateParam('hasDocuments', null)
      });
    } else if (filters.hasDocuments === 'false') {
      list.push({
        label: 'Hồ sơ',
        value: 'Thiếu tài liệu',
        onClear: () => updateParam('hasDocuments', null)
      });
    }

    if (filters.hasPrinted === 'true') {
      list.push({
        label: 'Tem in',
        value: 'Đã in tem',
        onClear: () => updateParam('hasPrinted', null)
      });
    } else if (filters.hasPrinted === 'false') {
      list.push({
        label: 'Tem in',
        value: 'Chưa in tem',
        onClear: () => updateParam('hasPrinted', null)
      });
    }

    if (filters.isChecked === 'true') {
      list.push({
        label: 'Kiểm kê',
        value: 'Đã kiểm kê',
        onClear: () => updateParam('isChecked', null)
      });
    } else if (filters.isChecked === 'false') {
      list.push({
        label: 'Kiểm kê',
        value: 'Chưa kiểm kê',
        onClear: () => updateParam('isChecked', null)
      });
    }

    if (filters.invoiceBatchId) {
      list.push({
        label: 'Hóa đơn',
        value: filterInvoiceNo || `ID: ${filters.invoiceBatchId}`,
        onClear: () => updateParam('invoiceBatchId', null)
      });
    }

    return list;
  }, [filters, lv4Categories, filterInvoiceNo]);

  // Status label calculation
  const statusActive = tempStatus.length > 0;
  const statusLabel = statusActive
    ? tempStatus.length === 1
      ? `Trạng thái: ${getStatusLabel(tempStatus[0]).label}`
      : `Trạng thái: ${tempStatus.length}`
    : 'Trạng thái';

  // Allocation label calculation
  const allocationActive = !!(filters.currentUserName || filters.departmentName || filters.isAssigned || filters.handoverDateFrom || filters.handoverDateTo);
  const allocationLabel = allocationActive
    ? filters.departmentName
      ? `Phân bổ: ${filters.departmentName}`
      : filters.currentUserName
        ? `Phân bổ: ${filters.currentUserName}`
        : filters.isAssigned === 'true'
          ? 'Phân bổ: Đã cấp phát'
          : filters.isAssigned === 'false'
            ? 'Phân bổ: Chưa cấp phát'
            : 'Phân bổ: Đang lọc'
    : 'Phân bổ';

  // Location label calculation
  const locationActive = !!(filters.cityName || filters.projectName || filters.locationQuery);
  const locationLabel = locationActive
    ? filters.cityName
      ? `Vị trí: ${filters.cityName}`
      : filters.projectName
        ? `Vị trí: ${filters.projectName}`
        : `Vị trí: ${filters.locationQuery}`
    : 'Vị trí';

  // Level 4 Category label calculation
  const lv4Active = tempLv4Name.length > 0;
  const lv4Label = lv4Active
    ? tempLv4Name.length === 1
      ? `Nhóm: ${tempLv4Name[0]}`
      : `Nhóm tài sản: ${tempLv4Name.length}`
    : 'Nhóm tài sản';

  // Advanced filters activity
  const isAdvancedActive = !!(
    filters.companyCode ||
    filters.priceMin ||
    filters.priceMax ||
    filters.purchaseDateFrom ||
    filters.purchaseDateTo ||
    filters.supplierName ||
    filters.hasSerial ||
    filters.hasDocuments
  );

  return (
    <div className="asset-manager-module min-h-[100dvh] h-full min-h-0 flex flex-col overflow-hidden bg-[#f8fafc]">
      {/* COLLAPSIBLE HEADER */}
      <header className="shrink-0 z-40 bg-white/90 backdrop-blur-md border-b py-2 lg:py-3">
        <div className="px-2 sm:px-3 lg:px-4">
          {/* Title Section — Animates away */}
          <div className="hidden lg:block mb-3">
            <div className="flex items-end justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest leading-none">Sổ tài sản</div>
                <h1 className="text-2xl font-black text-slate-950 tracking-tighter mt-1.5 leading-none">DANH MỤC TÀI SẢN</h1>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 Hệ thống quản lý tài sản v2.0
              </div>
            </div>
          </div>

          {/* Stats Section — Animates away */}
          <div className="overflow-hidden">
            {stats && (
              <div className="pt-1 pb-2 lg:pb-4">
                <div className="flex md:grid md:grid-cols-5 gap-2 lg:gap-3 overflow-x-auto md:overflow-visible custom-scrollbar pb-1 md:pb-0">
                  {statCards.map((card) => {
                    const active = card.key === 'ALL' ? !filters.status : filters.status === card.status;
                    return (
                      <StatCard
                        key={card.key}
                        label={card.label}
                        value={card.value}
                        icon={card.icon}
                        color={card.color}
                        active={active}
                        onClick={() => updateParam('status', card.status)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Toolbar Section — Always visible */}
          <div className="flex items-center gap-2 lg:gap-3 justify-between flex-wrap mt-1 lg:mt-3">
            {/* Left side: Search & Chip filters */}
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              {/* Main Search Input */}
              <div className="relative w-full lg:flex-1 lg:max-w-md lg:min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm mã, tên, serial, người dùng, phòng ban, vị trí..." 
                  className="w-full pl-9 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 transition-all text-xs text-slate-900 placeholder:text-slate-400 h-[36px]"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>

              {/* Advanced Filter Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsAdvancedFilterOpen(true)}
                className={`flex items-center px-4 py-2 bg-white border rounded-full text-[13px] font-[800] transition-all h-[36px] shadow-sm gap-2 ${
                  isAdvancedActive 
                    ? 'border-primary-500 text-primary-700 bg-primary-50/10' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Bộ lọc</span>
              </button>

              {/* Trạng thái filter chip */}
              <div className="hidden xl:block">
              <ChipPopoverFilter
                label={statusLabel}
                isActive={statusActive}
                onClear={clearStatusFilter}
                onApply={applyStatusFilter}
                onReset={clearStatusFilter}
              >
                <div className="space-y-2 py-1">
                  {[
                    {label: 'Đang sử dụng', value: 'ASSIGNED'},
                    {label: 'Trong kho', value: 'IN_STOCK'},
                    {label: 'Chưa sử dụng', value: 'RETIRED'},
                    {label: 'Đang sửa chữa', value: 'UNDER_REPAIR'},
                    {label: 'Hỏng', value: 'DAMAGED'},
                    {label: 'Mất', value: 'LOST'},
                    {label: 'Chờ thanh lý', value: 'PENDING_DISPOSAL'},
                    {label: 'Đã thanh lý', value: 'DISPOSED'},
                  ].map((opt) => {
                    const checked = tempStatus.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center space-x-2.5 px-1 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setTempStatus(tempStatus.filter(x => x !== opt.value));
                            } else {
                              setTempStatus([...tempStatus, opt.value]);
                            }
                          }}
                          className="rounded border-slate-355 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className={`text-[13px] ${checked ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </ChipPopoverFilter>
              </div>

              {/* Phân bổ filter chip */}
              <div className="hidden xl:block">
              <ChipPopoverFilter
                label={allocationLabel}
                isActive={allocationActive}
                onClear={clearAllocationFilter}
                onApply={applyAllocationFilter}
                onReset={clearAllocationFilter}
              >
                <div className="space-y-4 py-2 w-64">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Người sử dụng</label>
                    <AutocompleteInput 
                      placeholder="Nhập tên..." 
                      value={tempUserName} 
                      onChange={setTempUserName} 
                      endpoint="/assets/filter-options/users" 
                      icon={<Search className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phòng ban</label>
                    <AutocompleteInput 
                      placeholder="Chọn bộ phận..." 
                      value={tempDeptName} 
                      onChange={setTempDeptName} 
                      endpoint="/assets/filter-options/departments" 
                      icon={<Search className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái phân bổ</label>
                    <select 
                      value={tempAllocation} 
                      onChange={(e) => setTempAllocation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[13px] font-[600] text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-50/50 focus:border-primary-500 h-[38px] transition-all shadow-sm"
                    >
                      <option value="">Tất cả</option>
                      <option value="ASSIGNED">Đã cấp phát (Đang sử dụng)</option>
                      <option value="UNASSIGNED">Chưa cấp phát (Trong kho)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày bàn giao</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                         type="date"
                        value={tempHandoverFrom}
                        onChange={(e) => setTempHandoverFrom(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-650 focus:outline-none focus:border-primary-500 h-[34px]"
                      />
                      <input
                        type="date"
                        value={tempHandoverTo}
                        onChange={(e) => setTempHandoverTo(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-650 focus:outline-none focus:border-primary-500 h-[34px]"
                      />
                    </div>
                  </div>
                </div>
              </ChipPopoverFilter>

              {/* Phòng ban filter chip */}
              <div className="hidden xl:block">
              <ChipPopoverFilter
                label={filters.departmentName ? `Phòng ban: ${filters.departmentName}` : 'Phòng ban'}
                isActive={!!filters.departmentName}
                onClear={() => {
                  setTempDeptName('');
                  updateParam('departmentName', null);
                }}
                onApply={() => {
                  updateParam('departmentName', tempDeptName);
                }}
                onReset={() => {
                  setTempDeptName('');
                  updateParam('departmentName', null);
                }}
              >
                <div className="space-y-2 py-2 w-64">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên phòng ban</label>
                    <AutocompleteInput 
                      placeholder="Chọn phòng ban..." 
                      value={tempDeptName} 
                      onChange={setTempDeptName} 
                      endpoint="/assets/filter-options/departments" 
                      icon={<Search className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>
                </div>
              </ChipPopoverFilter>
              </div>
              </div>

              {/* Vị trí filter chip */}
              <div className="hidden xl:block">
              <ChipPopoverFilter
                label={locationLabel}
                isActive={locationActive}
                onClear={clearLocationFilter}
                onApply={applyLocationFilter}
                onReset={clearLocationFilter}
              >
                <div className="space-y-4 py-2 w-64">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tỉnh / Thành phố</label>
                    <AutocompleteInput 
                      placeholder="Chọn thành phố..." 
                      value={tempCity} 
                      onChange={setTempCity} 
                      endpoint="/assets/filter-options/cities" 
                      icon={<MapPin className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dự án</label>
                    <AutocompleteInput 
                      placeholder="Chọn dự án..." 
                      value={tempProject} 
                      onChange={setTempProject} 
                      endpoint="/assets/filter-options/projects" 
                      icon={<Box className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vị trí chi tiết</label>
                    <AutocompleteInput 
                      placeholder="Nhập vị trí..." 
                      value={tempLocation} 
                      onChange={setTempLocation} 
                      endpoint="/assets/filter-options/locations" 
                      icon={<MapPin className="h-3 w-3" />}
                      className="w-full"
                    />
                  </div>
                </div>
              </ChipPopoverFilter>
              </div>

              {/* Nhóm tài sản filter chip (LV4) */}
              <div className="hidden xl:block">
              <ChipPopoverFilter
                label={lv4Label}
                isActive={lv4Active}
                onClear={clearLv4Filter}
                onApply={applyLv4Filter}
                onReset={clearLv4Filter}
              >
                <div className="space-y-3 py-1 w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm nhóm tài sản (LV4)..."
                      value={lv4Search}
                      onChange={(e) => setLv4Search(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-50 text-[12px] font-bold text-slate-700 h-[34px]"
                    />
                  </div>
                  
                  <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
                    {lv4Categories
                      .filter(c => !lv4Search || c.name.toLowerCase().includes(lv4Search.toLowerCase()) || c.code.toLowerCase().includes(lv4Search.toLowerCase()))
                      .map((cat) => {
                        const checked = tempLv4Name.includes(cat.name);
                        return (
                          <label key={cat.id} className="flex items-center space-x-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setTempLv4Name(tempLv4Name.filter(x => x !== cat.name));
                                } else {
                                  setTempLv4Name([...tempLv4Name, cat.name]);
                                }
                              }}
                              className="rounded border-slate-350 text-primary-600 focus:ring-primary-500 h-4 w-4"
                            />
                            <span className={`text-[12px] ${checked ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                              {cat.name} <span className="text-[10px] text-slate-400 font-mono">({cat.code})</span>
                            </span>
                          </label>
                        );
                      })}
                    {lv4Categories.filter(c => !lv4Search || c.name.toLowerCase().includes(lv4Search.toLowerCase()) || c.code.toLowerCase().includes(lv4Search.toLowerCase())).length === 0 && (
                      <div className="text-center py-4 text-[12px] text-slate-400 italic">Không tìm thấy nhóm LV4</div>
                    )}
                  </div>
                </div>
              </ChipPopoverFilter>
              </div>
            </div>

            {/* Right side: Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative xl:hidden">
                <button
                  type="button"
                  onClick={() => setIsAssetActionMenuOpen(!isAssetActionMenuOpen)}
                  className="h-11 px-4 flex items-center text-[12px] font-black bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-700 whitespace-nowrap shadow-xs"
                >
                  <MoreVertical className="mr-1.5 h-4 w-4" /> Tác vụ
                </button>
                {isAssetActionMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsAssetActionMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 p-2">
                      <Can permission="ASSET_EXPORT">
                        <button onClick={() => { setIsAssetActionMenuOpen(false); handleExportAll(); }} className="w-full h-11 px-3 rounded-xl flex items-center text-left text-xs font-black text-slate-700 hover:bg-slate-50">
                          <Download className="mr-2 h-4 w-4 text-slate-500" /> Export
                        </button>
                      </Can>
                      <Can permission="ASSET_VIEW">
                        <button onClick={() => { setIsAssetActionMenuOpen(false); handleExportExcel(); }} className="w-full h-11 px-3 rounded-xl flex items-center text-left text-xs font-black text-slate-700 hover:bg-slate-50">
                          <Download className="mr-2 h-4 w-4 text-slate-500" /> Tải báo cáo
                        </button>
                      </Can>
                      <button onClick={() => { setIsAssetActionMenuOpen(false); setIsNormalizationOpen(true); }} className="w-full h-11 px-3 rounded-xl flex items-center text-left text-xs font-black text-slate-700 hover:bg-slate-50">
                        <Search className="mr-2 h-4 w-4 text-slate-500" /> Rà soát & Chuẩn hóa
                      </button>
                    </div>
                  </>
                )}
              </div>
              <Can permission="ASSET_EXPORT">
                <button 
                  onClick={handleExportAll}
                  className="hidden xl:flex h-[36px] px-4 items-center text-[12px] font-bold bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-600 whitespace-nowrap shadow-xs"
                >
                  <Download className="mr-1.5 h-4 w-4 text-slate-500" /> Export
                </button>
              </Can>

              <Can permission="ASSET_VIEW">
                <button 
                  type="button"
                  onClick={handleExportExcel}
                  className="hidden xl:flex h-[36px] px-4 items-center text-[12px] font-bold bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-600 whitespace-nowrap shadow-xs"
                >
                  <Download className="mr-1.5 h-4 w-4 text-slate-500" /> Tải báo cáo
                </button>
              </Can>
              
              <button
                type="button"
                onClick={() => setIsNormalizationOpen(true)}
                className="hidden xl:flex h-[36px] px-4 items-center text-[12px] font-bold bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-650 whitespace-nowrap shadow-xs cursor-pointer"
              >
                🔍 Rà soát & Chuẩn hóa
              </button>

              <Can permission="ASSET_CREATE">
                <button 
                  type="button"
                  onClick={() => openModal("ASSET_CREATE", { onComplete: fetchAssets })} 
                  className="h-11 xl:h-[36px] px-5 flex items-center text-[12px] font-black bg-primary-600 text-white rounded-full shadow-md hover:bg-primary-700 transition-all whitespace-nowrap"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm mới
                </button>
              </Can>
            </div>
          </div>

          {/* Preset and Sorting Chips Row */}
          <div className="hidden xl:flex mt-3 pt-3 border-t border-slate-100 flex-col gap-2.5">
            {/* Sorting Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1.5">Sắp xếp theo:</span>
              {[
                { label: 'Mới cập nhật', key: 'updatedAt', order: 'desc' },
                { label: 'Mã tài sản A-Z', key: 'assetCode', order: 'asc' },
                { label: 'Giá trị cao-thấp', key: 'purchasePriceExVat', order: 'desc' },
                { label: 'Ngày mua mới nhất', key: 'purchaseDate', order: 'desc' },
                { label: 'Chưa kiểm kê', key: 'lastInventoryDate', order: 'asc' },
              ].map((s) => {
                const isActive = sortBy === s.key && sortOrder === s.order;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleSortSelection(s.key, s.order)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                      isActive 
                        ? 'bg-slate-900 border-slate-900 text-white font-bold' 
                        : 'bg-white border-slate-200 text-slate-650 hover:border-slate-350'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Presets Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1.5">Lọc nhanh (Preset):</span>
              {[
                { label: 'Đang sử dụng', key: 'status', val: 'ASSIGNED' },
                { label: 'Trong kho', key: 'status', val: 'IN_STOCK' },
                { label: 'Chưa kiểm kê', key: 'isChecked', val: 'false' },
                { label: 'Chưa in tem', key: 'hasPrinted', val: 'false' },
                { label: 'Thiếu thông tin', key: 'hasSerial', val: 'false' },
                { label: 'Chờ thanh lý', key: 'status', val: 'PENDING_DISPOSAL' },
                { label: 'Đang sửa chữa', key: 'status', val: 'UNDER_REPAIR' },
                { label: 'Mất / thất thoát', key: 'status', val: 'LOST' },
              ].map((preset) => {
                const isActive = filters[preset.key] === preset.val;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSortSelection('', '', true, preset.key, preset.val)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                      isActive 
                        ? 'bg-primary-600 border-primary-600 text-white font-bold' 
                        : 'bg-white border-slate-200 text-slate-650 hover:border-slate-355'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Applied Filters chips */}
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">Bộ lọc đang áp dụng:</span>
              {activeFilterChips.map((chip, idx) => (
                <div 
                  key={idx}
                  className="flex items-center bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-[12px] font-semibold text-slate-700 animate-in fade-in duration-200"
                >
                  <span className="text-slate-400 mr-1 font-bold">{chip.label}:</span>
                  <span>{chip.value}</span>
                  <button 
                    type="button"
                    onClick={chip.onClear} 
                    className="ml-1.5 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest ml-2 transition-colors hover:underline"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>
      </header>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 w-[calc(100vw-1rem)] sm:w-auto max-w-5xl print:hidden">
          <div className="bg-[#0F172A] text-white px-3 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-2 sm:space-x-6 border border-[#1E293B] overflow-visible">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold tracking-tight">tài sản đang chọn</span>
            </div>
            <div className="h-6 w-px bg-[#334155]"></div>
            <div className="flex items-center space-x-2">
              <button onClick={clearSelection} className="h-11 px-3 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-slate-400 whitespace-nowrap">Bỏ chọn</button>
              <button 
                onClick={() => {
                  const hasInStock = selectedAssets.some(a => a.status === 'IN_STOCK');
                  openModal("TRANSFER_WIZARD", {
                    initialAssetIds: selectedIds,
                    defaultType: hasInStock ? 'HANDOVER' : 'TRANSFER',
                    source: 'ASSET_DETAIL',
                    onComplete: () => { clearSelection(); fetchAssets(); }
                  });
                }} 
                className="h-11 flex items-center px-3 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Bàn giao / Điều chuyển
              </button>
              <button 
                onClick={() => {
                  openModal("INVENTORY_WIZARD", {
                    initialAssetIds: selectedIds,
                    onComplete: () => { clearSelection(); fetchAssets(); }
                  });
                }} 
                className="h-11 flex items-center px-3 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" /> Kiểm kê
              </button>
              <button onClick={handleBulkPrint} className="h-11 flex items-center px-3 hover:bg-[#1E293B] rounded-lg text-xs font-bold transition-colors text-primary-400 whitespace-nowrap">
                <Printer className="mr-2 h-4 w-4" /> In tem tài sản
              </button>
              <div className="relative">
                <button 
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={cn(
                    "h-11 flex items-center px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    isMoreMenuOpen ? "bg-primary-600 text-white" : "hover:bg-[#1E293B] text-white"
                  )}
                >
                  Thêm thao tác <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", isMoreMenuOpen && "rotate-180")} />
                </button>
                
                {isMoreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)}></div>
                    <div className="absolute bottom-full right-0 mb-4 w-72 bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-2 text-left">
                      <div className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Nghiệp vụ</div>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleBulkPrint(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-white">
                        <Printer className="mr-3 h-4 w-4 text-primary-400" /> In tem tài sản
                      </button>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleExportSelected(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-emerald-400">
                        <Download className="mr-3 h-4 w-4" /> Xuất Excel
                      </button>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleExportSelectedPdf(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-sky-300">
                        <FileUp className="mr-3 h-4 w-4" /> Xuất PDF
                      </button>

                      <div className="h-px bg-[#1E293B] my-1"></div>
                      <div className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Trạng thái</div>
                      <button onClick={() => { setIsMoreMenuOpen(false); openBulkLostForm(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-rose-300">
                        <ShieldAlert className="mr-3 h-4 w-4" /> Ghi nhận mất
                      </button>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          openModal("BM_FORM", {
                            code: 'BM03/QLTS',
                            data: { asset: selectedAssets[0], assets: selectedAssets },
                            onSubmit: () => { clearSelection(); fetchAssets(); }
                          });
                        }}
                        className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-amber-400"
                      >
                        <AlertCircle className="mr-3 h-4 w-4" /> Cập nhật hư hỏng
                      </button>
                      <button
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          openModal("INVENTORY_WIZARD", {
                            initialAssetIds: selectedIds,
                            onComplete: () => { clearSelection(); fetchAssets(); }
                          });
                        }}
                        className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-white"
                      >
                        <ClipboardCheck className="mr-3 h-4 w-4 text-slate-400" /> Đưa vào kiểm kê lại
                      </button>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleNormalizeSelectedLocations(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-[#1E293B] flex items-center text-cyan-300">
                        <Edit3 className="mr-3 h-4 w-4" /> Chuẩn hóa vị trí
                      </button>

                      <div className="h-px bg-[#7F1D1D] my-1"></div>
                      <div className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-rose-400">Rủi ro cao</div>
                      <button onClick={() => { setIsMoreMenuOpen(false); openBulkLiquidationForm(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-orange-950/40 flex items-center text-orange-300">
                        <Trash2 className="mr-3 h-4 w-4" /> Thanh lý tài sản
                      </button>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleBulkCancelAssets(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-rose-950/50 flex items-center text-rose-400">
                        <Trash className="mr-3 h-4 w-4" /> Hủy tài sản
                      </button>
                      <button onClick={() => { setIsMoreMenuOpen(false); handleBulkDeleteAssets(); }} className="w-full text-left px-4 py-3 text-[11px] font-bold hover:bg-rose-950/50 flex items-center text-rose-500">
                        <X className="mr-3 h-4 w-4" /> Xóa tài sản
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={clearSelection} className="h-11 w-11 flex items-center justify-center hover:bg-[#1E293B] rounded-full transition-colors shrink-0">
              <X className="h-5 w-5 text-[#94A3B8]" />
            </button>
          </div>
        </div>
      )}

      {/* ASSET TABLE — fills remaining space */}
      <main className="asset-table-section flex-1 min-h-0 p-2 sm:p-3">
        <div className="h-full rounded-xl border bg-white overflow-hidden shadow-sm flex flex-col">
          <div 
            className="flex-1 min-h-0 overflow-auto custom-scrollbar scroll-smooth"
          >
            <table className="min-w-[860px] xl:min-w-0 w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr className="h-9">
                  <th className="px-3 w-12 sticky left-0 bg-[#F8FAFC] z-10">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center w-11 h-11 -my-1 -mx-3">
                      {isCurrentPageFullySelected ? (
                        <CheckSquare className="h-4 w-4 text-primary-600" />
                      ) : isCurrentPagePartiallySelected ? (
                        <MinusSquare className="h-4 w-4 text-primary-600" />
                      ) : (
                        <Square className="h-4 w-4 text-[#CBD5E1]" />
                      )}
                    </button>
                  </th>
                  {sortableColumns.map(col => (
                    <th key={col.key} className={cn("px-3 uppercase text-[10px] font-black text-slate-400 tracking-widest overflow-hidden", col.className)}>
                      <button 
                        onClick={() => handleSort(col.key)}
                        className="group inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors whitespace-nowrap"
                      >
                        {col.label}
                        <span className={cn(
                          "transition-colors",
                          sortBy === col.key ? "text-primary-600" : "text-slate-300 group-hover:text-slate-400"
                        )}>
                          {sortBy === col.key ? (sortOrder === 'desc' ? '▴' : '▾') : '▾'}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="px-3 w-16 text-right uppercase text-[10px] font-black text-slate-400 tracking-widest">Tác vụ</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto" /></td></tr>
              ) : assets.map((asset) => {
                const status = getStatusLabel(asset.status);
                const hasOpenTicket = asset.repairTickets && asset.repairTickets.length > 0;
                const missingFields = getMissingAssetFields(asset);
                const locationIssues = getLocationIssues(asset);
                const displayLocationName = cleanLocationName(asset.cityName, asset.locationName);
                return (
                  <tr 
                    key={asset.id} 
                    className={cn(
                      "h-12 hover:bg-[#F8FAFC]/80 transition-all group cursor-pointer border-l-3",
                      selectedAssetId === asset.id && isDetailOpen ? "bg-primary-50 border-l-primary-500" : "border-l-transparent",
                      selectedIds.includes(asset.id) ? "bg-primary-50/30" : ""
                    )}
                    onClick={() => openAssetDetail(asset.id, 'info')}
                  >
                    <td className="px-3 sticky left-0 bg-white group-hover:bg-[#F8FAFC] z-10" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); toggleAssetSelection(asset); }} className="flex items-center justify-center w-11 h-11 -my-2 -mx-3">
                        {selectedIds.includes(asset.id) 
                          ? <CheckSquare className="h-4 w-4 text-primary-600" /> 
                          : <Square className="h-4 w-4 text-[#CBD5E1] group-hover:text-[#94A3B8]" />
                        }
                      </button>
                    </td>
                    <td className="px-3 text-[12px] font-bold text-primary-700 font-mono" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      {asset.assetCode}
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'info'); }}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 leading-tight whitespace-normal break-words">{asset.assetNameShort || asset.assetName}</p>
                          <p className="text-[10px] font-medium text-slate-400 leading-tight">Serial: <span className="text-slate-500">{asset.serialNumber || '-'}</span></p>
                          <p className="xl:hidden text-[10px] font-medium text-slate-400 leading-tight">{asset.cityName || '-'}{displayLocationName ? ` - ${displayLocationName}` : ''}</p>
                        </div>
                        {missingFields.length > 0 && (
                          <button
                            type="button"
                            title={`Bổ sung thông tin: ${missingFields.join(', ')}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssetDetail(asset.id, 'info');
                            }}
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="hidden xl:table-cell px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <p className="text-[13px] font-semibold text-slate-800 leading-tight">{asset.currentUserName || <span className="text-slate-300 font-medium italic">Chưa cấp phát</span>}</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-tight">{asset.currentPosition || '-'}</p>
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'assignment'); }}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 flex items-center">
                            <MapPin className="h-2.5 w-2.5 mr-1 text-slate-400" />
                            {asset.cityName || <span className="text-slate-300 italic">Chưa có thành phố</span>}
                          </p>
                          <p className={cn(
                            "text-[10px] font-medium ml-3.5 truncate",
                            locationIssues.length > 0 ? "text-amber-600" : "text-slate-400"
                          )}>
                            {displayLocationName || 'Chưa có vị trí'}
                          </p>
                        </div>
                        {locationIssues.length > 0 && (
                          <button
                            type="button"
                            title={`${locationIssues.join(', ')}. Bấm để chỉnh sửa.`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssetDetail(asset.id, 'assignment');
                            }}
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3" onClick={(e) => { e.stopPropagation(); openAssetDetail(asset.id, 'status_auto'); }}>
                      <div className="flex flex-col gap-1 items-start">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border", status.color)}>
                          {status.label}
                        </span>
                        {hasOpenTicket && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 whitespace-nowrap">
                            <Wrench className="h-2.5 w-2.5" /> Đang có phiếu sửa chữa
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="relative inline-block">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === asset.id ? null : asset.id); }}
                             className="h-11 w-11 inline-flex items-center justify-center hover:bg-white rounded-xl border border-transparent hover:border-[#E2E8F0] text-[#94A3B8] hover:text-[#0F172A] transition-all shadow-sm"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {activeMenuId === asset.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)}></div>
                              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-40 p-2 animate-in fade-in zoom-in duration-150 text-left">
                                 <Can permission="ASSET_VIEW"><ActionItem label="Xem chi tiết" icon={<Eye className="h-4 w-4" />} onClick={() => handleAssetAction('view', asset)} /></Can>
                                 
                                 {asset.status === 'ASSIGNED' && (
                                   <>
                                     <Can permission="TRANSFER_CREATE"><ActionItem label="Điều chuyển tài sản" icon={<ArrowRightLeft className="h-4 w-4" />} onClick={() => handleAssetAction('handover', asset)} /></Can>
                                     <Can permission="TRANSFER_CREATE"><ActionItem label="Thu hồi về kho" icon={<RotateCcw className="h-4 w-4" />} onClick={() => handleAssetAction('revoke', asset)} /></Can>
                                   </>
                                 )}
                                 {asset.status === 'RETIRED' && (
                                   <Can permission="TRANSFER_CREATE"><ActionItem label="Thu hồi về kho" icon={<RotateCcw className="h-4 w-4" />} onClick={() => handleAssetAction('revoke', asset)} /></Can>
                                 )}
                                 {asset.status !== 'ASSIGNED' && asset.status !== 'RETIRED' && (
                                   <Can permission="TRANSFER_CREATE"><ActionItem label="Cấp phát / Bàn giao" icon={<UserPlus className="h-4 w-4" />} onClick={() => handleAssetAction('handover', asset)} /></Can>
                                 )}

                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <Can permission="INVENTORY_CREATE"><ActionItem label="Kiểm kê" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => handleAssetAction('inventory', asset)} /></Can>
                                 {hasOpenTicket ? (
                                   <Can permission="REPAIR_CREATE">
                                     <ActionItem 
                                       label="Xem phiếu sửa chữa" 
                                       icon={<Wrench className="h-4 w-4 text-amber-500" />} 
                                       onClick={() => {
                                         setActiveMenuId(null);
                                         openModal('REPAIR_PROCESSING', { ticketId: asset.repairTickets[0].id, onSuccess: fetchAssets });
                                       }} 
                                     />
                                   </Can>
                                 ) : (
                                   <Can permission="REPAIR_CREATE">
                                     <ActionItem 
                                       label="Sửa chữa / Bảo trì" 
                                       icon={<Wrench className="h-4 w-4" />} 
                                       onClick={() => handleAssetAction('repair', asset)} 
                                     />
                                   </Can>
                                 )}
                                 <Can permission="REPAIR_CREATE"><ActionItem label="Thanh lý" icon={<Trash className="h-4 w-4" />} onClick={() => handleAssetAction('liquidation', asset)} /></Can>
                                 <div className="h-px bg-[#F1F5F9] my-1"></div>
                                 <ActionItem label="Nhật ký tài sản" icon={<Activity className="h-4 w-4" />} onClick={() => handleAssetAction('history', asset)} />
                              </div>
                            </>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION — fixed at bottom */}
        <div className="min-h-12 shrink-0 px-3 sm:px-4 border-t border-[#E2E8F0] flex justify-between items-center bg-white">
           <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trang {page} / {Math.ceil(total/limit)} ({total} tài sản)</p>
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <span>Hiển thị</span>
                <select 
                  value={limit}
                  onChange={(e) => updateParam('limit', e.target.value)}
                  className="h-11 lg:h-8 rounded-lg border border-slate-200 px-2 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary-50"
                >
                  {[20, 50, 100, 200].map(sz => (
                    <option key={sz} value={sz}>{sz} dòng / trang</option>
                  ))}
                </select>
              </div>
           </div>
           <div className="flex space-x-1.5">
             <button disabled={page === 1} onClick={() => updateParam('page', String(page - 1))} className="h-11 w-11 lg:h-8 lg:w-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
             <button disabled={page * limit >= total} onClick={() => updateParam('page', String(page + 1))} className="h-11 w-11 lg:h-8 lg:w-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
           </div>
        </div>
      </div>
    </main>

    {/* ADVANCED FILTERS DRAWER */}
    {isAdvancedFilterOpen && (
      <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setIsAdvancedFilterOpen(false)}></div>
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 max-w-full flex md:pl-10">
          <div className="w-full md:w-[380px] md:max-w-[90vw] max-h-[70dvh] md:max-h-none bg-white shadow-2xl rounded-t-3xl md:rounded-t-none md:rounded-l-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <h2 className="text-lg font-black tracking-tight flex items-center">
                <Filter className="mr-2.5 h-5 w-5 text-slate-400" /> Bộ lọc nâng cao
              </h2>
              <button onClick={() => setIsAdvancedFilterOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full transition-all">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="space-y-3 xl:hidden">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sắp xếp</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Mới cập nhật', key: 'updatedAt', order: 'desc' },
                    { label: 'Mã A-Z', key: 'assetCode', order: 'asc' },
                    { label: 'Giá trị cao-thấp', key: 'purchasePriceExVat', order: 'desc' },
                    { label: 'Ngày mua mới nhất', key: 'purchaseDate', order: 'desc' },
                    { label: 'Chưa kiểm kê', key: 'lastInventoryDate', order: 'asc' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setTempSortBy(s.key);
                        setTempSortOrder(s.order);
                      }}
                      className={cn(
                        "h-11 px-3 rounded-full text-[12px] font-bold border transition-all",
                        tempSortBy === s.key && tempSortOrder === s.order
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-650"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 xl:hidden">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc nhanh</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Đang sử dụng', key: 'status', val: 'ASSIGNED' },
                    { label: 'Trong kho', key: 'status', val: 'IN_STOCK' },
                    { label: 'Chưa kiểm kê', key: 'isChecked', val: 'false' },
                    { label: 'Chưa in tem', key: 'hasPrinted', val: 'false' },
                    { label: 'Thiếu thông tin', key: 'hasSerial', val: 'false' },
                    { label: 'Chờ thanh lý', key: 'status', val: 'PENDING_DISPOSAL' },
                    { label: 'Đang sửa chữa', key: 'status', val: 'UNDER_REPAIR' },
                    { label: 'Mất / thất thoát', key: 'status', val: 'LOST' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                    onClick={() => {
                      if (preset.key === 'status') setTempStatus([preset.val]);
                      if (preset.key === 'isChecked') setTempIsChecked(preset.val);
                      if (preset.key === 'hasPrinted') setTempHasPrinted(preset.val);
                      if (preset.key === 'hasSerial') setTempHasSerial(preset.val);
                    }}
                      className={cn(
                        "h-11 px-3 rounded-full text-[12px] font-bold border transition-all",
                        (
                          (preset.key === 'status' && tempStatus.includes(preset.val))
                          || (preset.key === 'isChecked' && tempIsChecked === preset.val)
                          || (preset.key === 'hasPrinted' && tempHasPrinted === preset.val)
                          || (preset.key === 'hasSerial' && tempHasSerial === preset.val)
                        )
                          ? "bg-primary-600 border-primary-600 text-white"
                          : "bg-white border-slate-200 text-slate-650"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 xl:hidden">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</label>
                {[
                  {label: 'Đang sử dụng', value: 'ASSIGNED'},
                  {label: 'Trong kho', value: 'IN_STOCK'},
                  {label: 'Chưa sử dụng', value: 'RETIRED'},
                  {label: 'Đang sửa chữa', value: 'UNDER_REPAIR'},
                  {label: 'Hỏng', value: 'DAMAGED'},
                  {label: 'Mất', value: 'LOST'},
                  {label: 'Chờ thanh lý', value: 'PENDING_DISPOSAL'},
                  {label: 'Đã thanh lý', value: 'DISPOSED'},
                ].map((opt) => {
                  const checked = tempStatus.includes(opt.value);
                  return (
                    <label key={opt.value} className="min-h-11 flex items-center space-x-2.5 px-2 py-1 hover:bg-slate-50 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setTempStatus(checked ? tempStatus.filter(x => x !== opt.value) : [...tempStatus, opt.value])}
                        className="rounded border-slate-355 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className={`text-[13px] ${checked ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="space-y-4 xl:hidden">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người sử dụng</label>
                  <AutocompleteInput placeholder="Nhập tên..." value={tempUserName} onChange={setTempUserName} endpoint="/assets/filter-options/users" icon={<Search className="h-3 w-3" />} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng ban</label>
                  <AutocompleteInput placeholder="Chọn phòng ban..." value={tempDeptName} onChange={setTempDeptName} endpoint="/assets/filter-options/departments" icon={<Search className="h-3 w-3" />} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân bổ</label>
                  <select value={tempAllocation} onChange={(e) => setTempAllocation(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-11 transition-all shadow-sm">
                    <option value="">Tất cả</option>
                    <option value="ASSIGNED">Đã cấp phát</option>
                    <option value="UNASSIGNED">Chưa cấp phát</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 xl:hidden">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỉnh / Thành phố</label>
                  <AutocompleteInput placeholder="Chọn thành phố..." value={tempCity} onChange={setTempCity} endpoint="/assets/filter-options/cities" icon={<MapPin className="h-3 w-3" />} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dự án</label>
                  <AutocompleteInput placeholder="Chọn dự án..." value={tempProject} onChange={setTempProject} endpoint="/assets/filter-options/projects" icon={<Box className="h-3 w-3" />} className="w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí chi tiết</label>
                  <AutocompleteInput placeholder="Nhập vị trí..." value={tempLocation} onChange={setTempLocation} endpoint="/assets/filter-options/locations" icon={<MapPin className="h-3 w-3" />} className="w-full" />
                </div>
              </div>

              <div className="space-y-2 xl:hidden">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm tài sản</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhóm tài sản..."
                    value={lv4Search}
                    onChange={(e) => setLv4Search(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-50 text-[12px] font-bold text-slate-700 h-11"
                  />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {lv4Categories
                    .filter(c => !lv4Search || c.name.toLowerCase().includes(lv4Search.toLowerCase()) || c.code.toLowerCase().includes(lv4Search.toLowerCase()))
                    .map((cat) => {
                      const checked = tempLv4Name.includes(cat.name);
                      return (
                        <label key={cat.id} className="min-h-11 flex items-center space-x-2.5 px-2 py-1 hover:bg-slate-50 rounded-xl cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setTempLv4Name(checked ? tempLv4Name.filter(x => x !== cat.name) : [...tempLv4Name, cat.name])}
                            className="rounded border-slate-350 text-primary-600 focus:ring-primary-500 h-4 w-4"
                          />
                          <span className="text-[12px] font-medium text-slate-600">{cat.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Company Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Công ty chủ quản</label>
                <AutocompleteInput 
                  placeholder="Chọn công ty..." 
                  value={tempCompanyCode} 
                  onChange={setTempCompanyCode} 
                  endpoint="/assets/filter-options/companies" 
                  icon={<Box className="h-3 w-3" />}
                  className="w-full"
                />
              </div>

              {/* Purchase Price Range */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá mua (VNĐ)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Từ..."
                    value={tempPriceMin}
                    onChange={(e) => setTempPriceMin(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px]"
                  />
                  <input
                    type="number"
                    placeholder="Đến..."
                    value={tempPriceMax}
                    onChange={(e) => setTempPriceMax(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px]"
                  />
                </div>
              </div>

              {/* Purchase Date Range */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày mua tài sản</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={tempPurchaseFrom}
                    onChange={(e) => setTempPurchaseFrom(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px]"
                  />
                  <input
                    type="date"
                    value={tempPurchaseTo}
                    onChange={(e) => setTempPurchaseTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px]"
                  />
                </div>
              </div>

              {/* Supplier Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</label>
                <AutocompleteInput 
                  placeholder="Chọn nhà cung cấp..." 
                  value={tempSupplierName} 
                  onChange={setTempSupplierName} 
                  endpoint="/assets/filter-options/suppliers" 
                  icon={<Search className="h-3 w-3" />}
                  className="w-full"
                />
              </div>

              {/* Serial Check */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số Serial</label>
                <select 
                  value={tempHasSerial} 
                  onChange={(e) => setTempHasSerial(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px] transition-all shadow-sm"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Có Số Serial</option>
                  <option value="false">Không có Số Serial (Thiếu Serial)</option>
                </select>
              </div>

              {/* Documents Check */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hồ sơ / Chứng từ</label>
                <select 
                  value={tempHasDocuments} 
                  onChange={(e) => setTempHasDocuments(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-500 h-[38px] transition-all shadow-sm"
                >
                  <option value="">Tất cả</option>
                  <option value="true">Có tài liệu đính kèm</option>
                  <option value="false">Thiếu tài liệu đính kèm</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
              <button 
                type="button"
                onClick={clearAdvancedFilters}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-650 rounded-2xl text-[13px] font-[800] hover:bg-slate-100 transition-colors uppercase tracking-wider text-center"
              >
                Thiết lập lại
              </button>
              <button 
                type="button"
                onClick={applyAdvancedFilters}
                className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[13px] font-[800] hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200 uppercase tracking-wider text-center"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {isNormalizationOpen && (
        <NormalizationModal
          isOpen={isNormalizationOpen}
          onClose={() => {
            setIsNormalizationOpen(false);
            fetchAssets();
          }}
          currentFilters={filters}
        />
      )}
  </div>
);
};

const StatCard = ({ label, value, icon, color, active, onClick }: any) => {
  const colors: any = {
    primary: {
      active: 'border-primary-500 ring-2 ring-primary-100 bg-primary-50/30 text-primary-700',
      inactive: 'border-slate-200 hover:border-primary-300 hover:-translate-y-0.5 text-slate-600 bg-white',
      iconActive: 'bg-primary-600 text-white shadow-md shadow-primary-200',
      iconInactive: 'bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600',
    },
    blue: {
      active: 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/30 text-blue-700',
      inactive: 'border-slate-200 hover:border-blue-300 hover:-translate-y-0.5 text-slate-600 bg-white',
      iconActive: 'bg-blue-600 text-white shadow-md shadow-blue-200',
      iconInactive: 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600',
    },
    emerald: {
      active: 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/30 text-emerald-700',
      inactive: 'border-slate-200 hover:border-emerald-300 hover:-translate-y-0.5 text-slate-600 bg-white',
      iconActive: 'bg-emerald-600 text-white shadow-md shadow-emerald-200',
      iconInactive: 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600',
    },
    amber: {
      active: 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/30 text-amber-700',
      inactive: 'border-slate-200 hover:border-amber-300 hover:-translate-y-0.5 text-slate-600 bg-white',
      iconActive: 'bg-amber-600 text-white shadow-md shadow-amber-200',
      iconInactive: 'bg-slate-50 text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600',
    },
    rose: {
      active: 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/30 text-rose-700',
      inactive: 'border-slate-200 hover:border-rose-300 hover:-translate-y-0.5 text-slate-600 bg-white',
      iconActive: 'bg-rose-600 text-white shadow-md shadow-rose-200',
      iconInactive: 'bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600',
    },
  };

  const style = colors[color] || colors.primary;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[52px] md:h-[60px] px-3 lg:px-4 rounded-xl border flex items-center gap-2 lg:gap-3 shadow-sm hover:shadow-md transition-all group w-[168px] md:w-full shrink-0 outline-none cursor-pointer",
        active ? style.active : style.inactive
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
        active ? style.iconActive : style.iconInactive
      )}>
        {icon}
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[8px] lg:text-[9px] font-black uppercase text-[#94A3B8] tracking-wider leading-none">{label}</p>
        <p className="text-xl font-[900] text-[#0F172A] tracking-tighter leading-tight mt-0.5">
          {value?.toLocaleString('vi-VN') || 0}
        </p>
      </div>
    </button>
  );
};

const ActionItem = ({ label, icon, onClick }: any) => (
  <button onClick={onClick} className="w-full min-h-11 flex items-center px-4 py-3 text-[12px] font-black text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl transition-all uppercase tracking-tight">
    <span className="mr-3 text-[#94A3B8]">{icon}</span> {label}
  </button>
);

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

