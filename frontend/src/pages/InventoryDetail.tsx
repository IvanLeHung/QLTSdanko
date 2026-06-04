import React, { useEffect, useState } from 'react';
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
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { BaseModal } from '../components/BaseModal';
import { useAuth } from '../context/AuthContext';


export const InventoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, CHECKED

  // Tab State
  const [activeTab, setActiveTab] = useState<'CHECK_LIST' | 'DISCOVERED_LIST'>('CHECK_LIST');

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

  // QR Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanCodeInput, setScanCodeInput] = useState('');

  // Single Item Check modal state
  const [selectedItemForCheck, setSelectedItemForCheck] = useState<any>(null);
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
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin đợt kiểm kê");
    } finally {
      setLoading(false);
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
    try {
      const [compRes, catRes, deptRes, locRes, cityRes, projRes, suppRes] = await Promise.all([
        api.get('/assets/companies/active'),
        api.get('/assets/categories/active/all'),
        api.get('/assets/filter-options/departments'),
        api.get('/assets/filter-options/locations'),
        api.get('/assets/filter-options/cities'),
        api.get('/assets/filter-options/projects'),
        api.get('/assets/filter-options/suppliers')
      ]);
      setCompanies(compRes.data);
      setAllCategories(catRes.data);
      const level4Cats = catRes.data.filter((c: any) => c.level === 4);
      setCategories(level4Cats);
      setReviewDepartments(deptRes.data || []);
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

  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanCodeInput.trim()) return;

    const matchedItem = session?.items.find((item: any) => 
      item.assetCode.toLowerCase() === scanCodeInput.trim().toLowerCase()
    );

    if (matchedItem) {
      toast.success(`Đã tìm thấy tài sản: ${matchedItem.asset.assetName}`);
      setIsScannerOpen(false);
      setScanCodeInput('');
      openCheckModal(matchedItem);
    } else {
      toast.error(`Không tìm thấy tài sản với mã "${scanCodeInput}" trong đợt kiểm kê này`);
    }
  };

  const handleCheckItem = async (statusOverride?: 'PENDING' | 'CHECKED') => {
    if (!selectedItemForCheck) return;
    setSubmitting(true);
    
    let finalStatus = checkForm.actualStatus;
    let finalLocation = checkForm.actualLocation;
    let finalQuality = checkForm.quality;
    
    if (checkForm.checkCondition === 'MISSING') {
      finalStatus = 'LOST';
      finalQuality = 'LOST';
      finalLocation = selectedItemForCheck.expectedLocation || selectedItemForCheck.asset.locationName || '';
    }

    const physicalDetailsJson = JSON.stringify({
      appearance: checkForm.appearance,
      operation: checkForm.operation,
      wearRate: Number(checkForm.wearRate) || 0,
      accessories: checkForm.accessories
    });

    let technicalSpecsJson = undefined;
    const isComputer = selectedItemForCheck.assetCode.startsWith('03.01') || selectedItemForCheck.asset.assetName.toLowerCase().includes('laptop') || selectedItemForCheck.asset.assetName.toLowerCase().includes('máy tính');
    const isPrinter = selectedItemForCheck.asset.assetName.toLowerCase().includes('máy in');
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
      toast.success(statusOverride === 'PENDING' ? "Đã lưu nháp kết quả kiểm kê" : "Đã hoàn tất đối soát tài sản");
      setSelectedItemForCheck(null);
      fetchDetail(); // Refresh list
    } catch (err) {
      toast.error("Lỗi khi ghi nhận kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckModal = (item: any) => {
    setSelectedItemForCheck(item);
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
    if (item.asset.technicalSpecsJson) {
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
      actualLocation: item.actualLocation || item.expectedLocation || item.asset.locationName || '',
      actualStatus: item.actualStatus || item.expectedStatus || 'IN_STOCK',
      quality: item.quality || 'GOOD',
      note: item.note || '',
      photos: item.photos || [],
      checkCondition: initialCondition,
      actualUserName: item.actualUserName || item.asset.currentUserName || '',
      actualUserId: item.actualUserId || null,
      actualSerialNumber: item.actualSerialNumber || item.asset.serialNumber || '',
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
    setCustodianQuery(item.actualUserName || item.asset.currentUserName || '');
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

  const filteredItems = session?.items.filter((item: any) => {
    const matchesSearch = item.assetCode.toLowerCase().includes(search.toLowerCase()) || 
                          item.asset.assetName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || (filter === 'PENDING' && item.checkStatus === 'PENDING') || (filter === 'CHECKED' && item.checkStatus === 'CHECKED');
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: session?.items.length || 0,
    checked: session?.items.filter((i: any) => i.checkStatus === 'CHECKED').length || 0,
    pending: session?.items.filter((i: any) => i.checkStatus === 'PENDING').length || 0,
    matched: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MATCHED').length || 0,
    wrongLocation: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_LOCATION').length || 0,
    missing: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'MISSING').length || 0,
    damaged: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'DAMAGED').length || 0,
    wrongStatus: session?.items.filter((i: any) => i.checkStatus === 'CHECKED' && i.result === 'WRONG_STATUS').length || 0,
  };

  const checkers = Array.from(new Set(session?.items.map((i: any) => i.checkedBy).filter(Boolean))) as string[];
  const lastUpdatedAt = session?.items
    .map((i: any) => i.checkedAt)
    .filter(Boolean)
    .reduce((max: Date | null, current: string) => {
      const curDate = new Date(current);
      if (!max || curDate > max) return curDate;
      return max;
    }, null) as Date | null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-4 flex-1">
          <button onClick={() => navigate('/inventory')} className="flex items-center text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest transition-colors">
            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-[900] text-[#0F172A] tracking-tighter leading-none">{session.inventoryName}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
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
            
            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Bắt đầu: <span className="text-slate-800">{session.inventoryDate ? format(new Date(session.inventoryDate), 'dd/MM/yyyy') : 'N/A'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Dự kiến xong: <span className="text-slate-800">{session.expectedFinishDate ? format(new Date(session.expectedFinishDate), 'dd/MM/yyyy') : 'Không giới hạn'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span>Người phụ trách: <span className="text-slate-800">{session.responsiblePerson || 'Chưa phân công'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <span>Phạm vi: <span className="text-slate-800">{session.scopeType === 'ALL' ? 'Toàn công ty' : session.scopeType === 'COMPANY' ? `Công ty: ${session.scopeValue}` : `Phòng ban: ${session.scopeValue}`}</span></span>
              </div>
            </div>

            {session.note && (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                <strong>Ghi chú:</strong> {session.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 self-end">
          {session.status === 'DRAFT' && (
            <button 
              onClick={handleStartSession}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Bắt đầu kiểm kê
            </button>
          )}

          {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
            <button 
              onClick={handleCloseSession}
              disabled={submitting}
              className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />} Chốt đợt kiểm kê
            </button>
          )}

          {(session.status === 'DRAFT' || session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
            <button 
              onClick={handleCancelSession}
              disabled={submitting}
              className="bg-white border border-rose-250 text-rose-600 hover:bg-rose-50 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center shadow-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />} Hủy đợt kiểm kê
            </button>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tài sản cần kiểm</p>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">{stats.checked} đã kiểm • {stats.pending} đang chờ</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><ClipboardList className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tiến độ hoàn thành</p>
            <p className="text-3xl font-black text-emerald-600">{Math.round((stats.checked / stats.total) * 100) || 0}%</p>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-2">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((stats.checked / stats.total) * 100) || 0}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-450 uppercase tracking-widest mb-1">Tổng số chênh lệch</p>
            <p className="text-3xl font-black text-rose-600">
              {stats.wrongLocation + stats.missing + stats.damaged + stats.wrongStatus}
            </p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">Khớp sổ sách: {stats.matched}</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-550"><AlertCircle className="h-6 w-6" /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thông tin cập nhật</p>
            <p className="text-sm font-black text-slate-800 leading-tight">
              {lastUpdatedAt ? format(lastUpdatedAt, 'HH:mm dd/MM/yyyy') : 'Chưa có cập nhật'}
            </p>
            <p className="text-[11px] text-slate-450 mt-1 font-bold">
              {checkers.length > 0 ? `${checkers.length} người kiểm kê` : 'Không có người kiểm'}
            </p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><User className="h-6 w-6" /></div>
        </div>
      </div>

      {/* DISCREPANCY BREAKDOWN BANNER */}
      <div className="bg-slate-550/5 p-4 rounded-2xl border border-slate-150 flex flex-wrap items-center justify-between gap-4 font-bold text-xs text-slate-650">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chi tiết đối soát:</span>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
            Khớp: {stats.matched}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
            Lệch vị trí: {stats.wrongLocation}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-rose-700">
            Thiếu (Báo mất): {stats.missing}
          </span>
        </div>
      </div>

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
      </div>

      {activeTab === 'CHECK_LIST' ? (
        <div className="bg-white rounded-b-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-1 max-w-lg gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all"
                  placeholder="Tìm theo mã hoặc tên tài sản..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') && (
                <div className="flex gap-2 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-primary-50 hover:bg-primary-100 text-primary-650 px-5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center border border-primary-200/50"
                  >
                    📷 Quét mã
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsDiscoveredModalOpen(true)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-650 px-5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center border border-emerald-250"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Báo ngoài sổ
                  </button>
                </div>
              )}
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
                {filteredItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-605 transition-colors">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{item.asset.assetName}</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{item.assetCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <User className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">{item.asset.currentUserName || 'N/A'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium ml-5 mt-0.5">{item.asset.departmentName || 'Không có bộ phận'}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">{item.expectedLocation || item.asset.locationName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">
                          {item.checkStatus === 'CHECKED' ? (
                            item.actualLocation || 'N/A'
                          ) : (
                            <span className="text-slate-350 font-medium italic">Chưa đối soát</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      {item.checkStatus === 'PENDING' ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200/50">
                          Chưa kiểm
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          item.result === 'MATCHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          item.result === 'WRONG_LOCATION' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          item.result === 'MISSING' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          item.result === 'DAMAGED' ? 'bg-red-50 text-red-650 border-red-100' :
                          item.result === 'WRONG_USER' ? 'bg-orange-50 text-orange-655 border-orange-100' :
                          'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          {item.result === 'MATCHED' ? 'Khớp' :
                           item.result === 'WRONG_LOCATION' ? 'Lệch vị trí' :
                           item.result === 'MISSING' ? 'Thiếu/Mất' :
                           item.result === 'DAMAGED' ? 'Báo hỏng' :
                           item.result === 'WRONG_USER' ? 'Sai người sử dụng' :
                           item.result === 'WRONG_STATUS' ? 'Lệch trạng thái' : item.result}
                        </span>
                      )}
                    </td>
                    <td className="p-6">
                      {(session.status === 'OPEN' || session.status === 'IN_PROGRESS') ? (
                        item.checkStatus === 'PENDING' ? (
                          <button 
                            onClick={() => openCheckModal(item)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all shadow-md shadow-primary-100"
                          >
                            Kiểm kê
                          </button>
                        ) : (
                          <button 
                            onClick={() => openCheckModal(item)}
                            className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Kiểm lại
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đã khóa</span>
                      )}
                    </td>
                  </tr>
                ))}
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
      ) : (
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
                            <img src={url} alt={cat.label} className="w-full h-full object-cover" />
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
                    <img src={url} alt="Bằng chứng ngoài sổ" className="w-full h-full object-cover" />
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
                      <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
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
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Thành phố / Chi nhánh</label>
                    <select
                      value={reviewForm.cityName || ''}
                      onChange={e => setReviewForm({...reviewForm, cityName: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn thành phố --</option>
                      {reviewCities.map((city: string, i: number) => (
                        <option key={i} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Vị trí thực tế</label>
                    <select
                      value={reviewForm.locationName || ''}
                      onChange={e => setReviewForm({...reviewForm, locationName: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn vị trí --</option>
                      {reviewLocations.map((loc: string, i: number) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Phòng ban sử dụng</label>
                    <select
                      value={reviewForm.departmentName || ''}
                      onChange={e => setReviewForm({...reviewForm, departmentName: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {reviewDepartments.map((dept: string, i: number) => (
                        <option key={i} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Dự án sử dụng</label>
                    <select
                      value={reviewForm.projectName || ''}
                      onChange={e => setReviewForm({...reviewForm, projectName: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                    >
                      <option value="">-- Không thuộc dự án --</option>
                      {reviewProjects.map((proj: string, i: number) => (
                        <option key={i} value={proj}>{proj}</option>
                      ))}
                    </select>
                  </div>
                </div>

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
    </div>
  );
};
