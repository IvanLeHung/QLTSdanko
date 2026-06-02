import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { DateRangeModal } from '../components/DateRangeModal';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  X,
  Keyboard,
  Building2,
  Tag,
  Warehouse,
  Coins
} from 'lucide-react';

interface InvoiceMetadata {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierTaxCode: string;
  companyId: string;
  warehouseId: string;
  totalAmount: string;
  note: string;
  fileUrl?: string;
}

interface InvoiceLineItem {
  id: string; // unique frontend key
  invoiceItemName: string;
  assetName: string;
  categoryLevel1Id: string;
  categoryLevel2Id: string;
  categoryLevel3Id: string;
  categoryLevel4Id: string;
  quantity: number;
  unitPrice: number;
  serials: string[];
  note: string;
}

interface Category {
  id: number;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
}

export const CreateAsset: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System Metadata
  const [companies, setCompanies] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Form State
  const [invoice, setInvoice] = useState<InvoiceMetadata>({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierTaxCode: '',
    companyId: '',
    warehouseId: '',
    totalAmount: '',
    note: '',
    fileUrl: '',
  });

  const [lines, setLines] = useState<InvoiceLineItem[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      invoiceItemName: '',
      assetName: '',
      categoryLevel1Id: '',
      categoryLevel2Id: '',
      categoryLevel3Id: '',
      categoryLevel4Id: '',
      quantity: 1,
      unitPrice: 0,
      serials: [],
      note: ''
    }
  ]);

  const [assignImmediately, setAssignImmediately] = useState(false);

  // Serials Modal State
  const [activeSerialLineId, setActiveSerialLineId] = useState<string | null>(null);
  const [serialInputText, setSerialInputText] = useState('');

  // Paste Quick Import Modal State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportCreated = async (startDate: string, endDate: string) => {
    try {
      const response = await api.get('/assets/export-created', {
        params: { startDate, endDate },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao_cao_cap_moi_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Tải báo cáo cấp mới/nhập lô thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải báo cáo cấp mới/nhập lô");
    }
  };

  // Load Metadata
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [compRes, catRes] = await Promise.all([
          api.get('/assets/companies/active'),
          api.get('/assets/categories/active/all')
        ]);
        setCompanies(compRes.data);
        setAllCategories(catRes.data);
        
        // Auto select first company if available
        if (compRes.data.length > 0) {
          setInvoice(prev => ({ ...prev, companyId: compRes.data[0].id.toString() }));
        }

        // Set default warehouses
        setWarehouses([
          { id: 1, name: 'Kho QLTS' },
          { id: 2, name: 'Kho trung tâm' },
          { id: 3, name: 'Kho dự phòng CNTT' },
        ]);
        setInvoice(prev => ({ ...prev, warehouseId: '1' }));
      } catch (err) {
        toast.error("Không thể tải thông tin cấu trúc danh mục và công ty.");
      }
    };
    loadInitialData();
  }, []);

  // Filter categories by level and parentId
  const getCat1Options = () => allCategories.filter(c => c.level === 1);
  const getCat2Options = (parentId: string) => allCategories.filter(c => c.level === 2 && c.parentId === parseInt(parentId));
  const getCat3Options = (parentId: string) => allCategories.filter(c => c.level === 3 && c.parentId === parseInt(parentId));
  const getCat4Options = (parentId: string) => allCategories.filter(c => c.level === 4 && c.parentId === parseInt(parentId));

  // Auto category suggestion logic on the client-side
  const suggestCategoryForLine = (itemName: string): Partial<InvoiceLineItem> => {
    if (!itemName) return {};
    const nameLower = itemName.toLowerCase();
    
    // Keyword rules
    const rules = [
      { keywords: ['laptop', 'pc', 'dell', 'hp', 'lenovo', 'thinkpad', 'macbook', 'xps', 'workstation', 'máy tính', 'vostro', 'inspiron', 'latitude'], match: 'pc' },
      { keywords: ['monitor', 'màn hình', 'display', 'ultrasharp'], match: 'màn hình' },
      { keywords: ['printer', 'máy in', 'canon', 'laserjet', 'brother'], match: 'máy in' },
      { keywords: ['bàn', 'ghế', 'tủ', 'sofa', 'kệ', 'giường', 'hộc'], match: 'bàn' },
      { keywords: ['điều hòa', 'máy lạnh', 'daikin', 'panasonic'], match: 'điều hòa' },
      { keywords: ['điện thoại', 'iphone', 'samsung', 'xiaomi', 'telephone', 'phone'], match: 'điện thoại' },
      { keywords: ['máy chiếu', 'projector', 'epson'], match: 'máy chiếu' },
      { keywords: ['camera', 'đầu ghi', 'hikvision', 'dahua'], match: 'camera' }
    ];

    let targetKeyword = '';
    for (const rule of rules) {
      if (rule.keywords.some(kw => nameLower.includes(kw))) {
        targetKeyword = rule.match;
        break;
      }
    }

    // Try finding level 4 category matching target keyword or direct name
    let matchedLvl4 = null;
    if (targetKeyword) {
      if (targetKeyword === 'bàn') {
        matchedLvl4 = allCategories.find(c => 
          c.level === 4 && 
          c.name.toLowerCase().includes('bàn') && 
          !c.name.toLowerCase().includes('điện thoại')
        );
      } else if (targetKeyword === 'điện thoại') {
        matchedLvl4 = allCategories.find(c => 
          c.level === 4 && 
          c.name.toLowerCase().includes('điện thoại')
        );
      } else {
        matchedLvl4 = allCategories.find(c => 
          c.level === 4 && 
          c.name.toLowerCase().includes(targetKeyword)
        );
      }
    }

    if (!matchedLvl4) {
      matchedLvl4 = allCategories.find(c => c.level === 4 && c.name.toLowerCase().includes(nameLower));
    }
    
    // Fallback: search by any partial word
    if (!matchedLvl4) {
      const words = nameLower.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (w === 'bàn') {
          matchedLvl4 = allCategories.find(c => 
            c.level === 4 && 
            c.name.toLowerCase().includes('bàn') && 
            !c.name.toLowerCase().includes('điện thoại')
          );
        } else {
          matchedLvl4 = allCategories.find(c => c.level === 4 && c.name.toLowerCase().includes(w));
        }
        if (matchedLvl4) break;
      }
    }

    if (matchedLvl4) {
      const level4Id = matchedLvl4.id.toString();
      const level3 = allCategories.find(c => c.id === matchedLvl4!.parentId);
      const level3Id = level3 ? level3.id.toString() : '';
      const level2 = level3 ? allCategories.find(c => c.id === level3.parentId) : null;
      const level2Id = level2 ? level2.id.toString() : '';
      const level1 = level2 ? allCategories.find(c => c.id === level2.parentId) : null;
      const level1Id = level1 ? level1.id.toString() : '';

      return {
        categoryLevel1Id: level1Id,
        categoryLevel2Id: level2Id,
        categoryLevel3Id: level3Id,
        categoryLevel4Id: level4Id
      };
    }

    return {};
  };

  // Add new blank row
  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        invoiceItemName: '',
        assetName: '',
        categoryLevel1Id: '',
        categoryLevel2Id: '',
        categoryLevel3Id: '',
        categoryLevel4Id: '',
        quantity: 1,
        unitPrice: 0,
        serials: [],
        note: ''
      }
    ]);
  };

  // Clone an existing row
  const handleCloneLine = (line: InvoiceLineItem) => {
    setLines(prev => [
      ...prev,
      {
        ...line,
        id: Math.random().toString(36).substr(2, 9),
        serials: [] // Don't copy serials to avoid duplicates
      }
    ]);
  };

  // Delete row
  const handleDeleteLine = (id: string) => {
    if (lines.length === 1) {
      toast.warning("Hóa đơn phải chứa ít nhất một dòng hạng mục.");
      return;
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Bulk suggest categories for all lines that don't have selection yet
  const handleBulkSuggest = () => {
    setLines(prev => prev.map(line => {
      const suggestions = suggestCategoryForLine(line.invoiceItemName);
      return { ...line, ...suggestions };
    }));
    toast.success("Đã chạy gợi ý phân nhóm tự động dựa trên từ khóa.");
  };

  // File Upload Handlers
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseUploadedFile(file);
  };

  const parseUploadedFile = async (file: File) => {
    setParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/assets/import-invoice/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { invoice: parsedInvoice, lines: parsedLines, warnings } = res.data;

      // Map parsed metadata
      setInvoice(prev => ({
        ...prev,
        invoiceNo: parsedInvoice.invoiceNo || prev.invoiceNo,
        invoiceDate: parsedInvoice.invoiceDate || prev.invoiceDate,
        supplierName: parsedInvoice.supplierName || prev.supplierName,
        supplierTaxCode: parsedInvoice.supplierTaxCode || prev.supplierTaxCode,
        totalAmount: parsedInvoice.totalAmount ? String(parsedInvoice.totalAmount) : prev.totalAmount,
        fileUrl: parsedInvoice.fileUrl || prev.fileUrl,
      }));

      if (parsedLines && parsedLines.length > 0) {
        const mappedLines = parsedLines.map((pl: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          invoiceItemName: pl.rawItemName || '',
          assetName: pl.suggestedAssetName || pl.rawItemName || '',
          categoryLevel1Id: pl.suggestedCategory?.level1Id ? String(pl.suggestedCategory.level1Id) : '',
          categoryLevel2Id: pl.suggestedCategory?.level2Id ? String(pl.suggestedCategory.level2Id) : '',
          categoryLevel3Id: pl.suggestedCategory?.level3Id ? String(pl.suggestedCategory.level3Id) : '',
          categoryLevel4Id: pl.suggestedCategory?.level4Id ? String(pl.suggestedCategory.level4Id) : '',
          quantity: pl.quantity || 1,
          unitPrice: pl.unitPrice || 0,
          serials: pl.serials || [],
          note: pl.note || ''
        }));
        setLines(mappedLines);
        toast.success(`Đã bóc tách thành công ${mappedLines.length} hạng mục từ hóa đơn.`);
      }

      if (warnings && warnings.length > 0) {
        warnings.forEach((w: string) => toast.warning(w, { autoClose: 10000 }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi phân tích tệp hóa đơn.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await parseUploadedFile(file);
    }
  };

  // Real-time values calculation
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalValue = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
  const invoiceDiff = invoice.totalAmount ? (parseFloat(invoice.totalAmount) - totalValue) : 0;

  // Validation Checks
  const getValidationIssues = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Metadata validation
    if (!invoice.invoiceNo) errors.push("Số hóa đơn bắt buộc phải nhập.");
    if (!invoice.invoiceDate) errors.push("Ngày hóa đơn bắt buộc phải chọn.");
    if (!invoice.supplierName) errors.push("Tên nhà cung cấp bắt buộc phải nhập.");
    if (!invoice.companyId) errors.push("Công ty nhận hóa đơn bắt buộc phải chọn.");
    if (!invoice.warehouseId) errors.push("Kho nhập ban đầu bắt buộc phải chọn.");

    // Row-level validations
    lines.forEach((line, index) => {
      const name = line.invoiceItemName || `Dòng ${index + 1}`;
      if (!line.invoiceItemName) errors.push(`Dòng ${index + 1}: Tên hạng mục trên hóa đơn không được để trống.`);
      if (!line.assetName) errors.push(`Dòng ${index + 1} ("${name}"): Tên tài sản chuẩn không được để trống.`);
      if (!line.categoryLevel1Id || !line.categoryLevel2Id || !line.categoryLevel3Id || !line.categoryLevel4Id) {
        errors.push(`Dòng ${index + 1} ("${name}"): Vui lòng chọn đầy đủ 4 cấp phân loại tài sản.`);
      }
      if (line.quantity <= 0) errors.push(`Dòng ${index + 1} ("${name}"): Số lượng phải lớn hơn 0.`);
      if (line.unitPrice < 0) errors.push(`Dòng ${index + 1} ("${name}"): Đơn giá không được âm.`);
      
      // Serials checks
      if (line.serials && line.serials.length > 0) {
        if (line.serials.length > line.quantity) {
          errors.push(`Dòng ${index + 1} ("${name}"): Số lượng serial (${line.serials.length}) vượt quá số lượng hạng mục (${line.quantity}).`);
        } else if (line.serials.length < line.quantity) {
          warnings.push(`Dòng ${index + 1} ("${name}"): Thiếu serial (${line.serials.length}/${line.quantity} đã nhập).`);
        }
      } else {
        warnings.push(`Dòng ${index + 1} ("${name}"): Chưa có số serial nào được nhập.`);
      }
    });

    // Check duplicate serials in current screen
    const allScreenSerials = lines.flatMap(l => l.serials);
    const duplicates = allScreenSerials.filter((s, i) => allScreenSerials.indexOf(s) !== i);
    if (duplicates.length > 0) {
      errors.push(`Số serial bị trùng lặp trực tiếp trên hóa đơn: ${Array.from(new Set(duplicates)).join(', ')}`);
    }

    // Check price mismatch warning
    if (invoice.totalAmount && Math.abs(invoiceDiff) > 1) {
      warnings.push(`Chênh lệch số tiền: Tổng hóa đơn (${parseFloat(invoice.totalAmount).toLocaleString()} VNĐ) lệch so với tổng hạng mục (${totalValue.toLocaleString()} VNĐ).`);
    }

    return { errors, warnings };
  };

  const { errors: validationErrors, warnings: validationWarnings } = getValidationIssues();

  // Excel template downloader
  const handleDownloadTemplate = () => {
    window.open(`${api.defaults.baseURL}/assets/import-invoice/template`, '_blank');
    toast.success("Đã tải tệp CSV mẫu thành công!");
  };

  // Submit and Create Assets
  const handleConfirmPost = async () => {
    if (validationErrors.length > 0) {
      toast.error("Vui lòng khắc phục các lỗi nghiêm trọng trước khi tạo tài sản.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        invoice: {
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          supplierName: invoice.supplierName,
          supplierTaxCode: invoice.supplierTaxCode,
          companyId: invoice.companyId,
          warehouseId: invoice.warehouseId,
          totalAmount: invoice.totalAmount ? parseFloat(invoice.totalAmount) : undefined,
          note: invoice.note
        },
        lines: lines.map(l => ({
          invoiceItemName: l.invoiceItemName,
          assetName: l.assetName,
          categoryLevel1Id: parseInt(l.categoryLevel1Id),
          categoryLevel2Id: parseInt(l.categoryLevel2Id),
          categoryLevel3Id: parseInt(l.categoryLevel3Id),
          categoryLevel4Id: parseInt(l.categoryLevel4Id),
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          serials: l.serials,
          note: l.note
        })),
        assignImmediately
      };

      const res = await api.post('/assets/import-invoice/post', payload);
      toast.success(`Nhập thành công! Đã tạo ${res.data.createdAssetsCount} tài sản vào Sổ tài sản.`);
      
      // Auto handover flow if assignImmediately is selected
      if (assignImmediately) {
        navigate('/handover/new', { state: { assetCodes: res.data.createdAssetCodes } });
      } else {
        navigate('/assets');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi giao dịch khi tạo tài sản hàng loạt.");
    } finally {
      setLoading(false);
    }
  };

  // Open Serials Input Modal
  const openSerialsModal = (line: InvoiceLineItem) => {
    setActiveSerialLineId(line.id);
    setSerialInputText(line.serials.join('\n'));
  };

  // Save serials list from modal
  const saveSerials = () => {
    const cleanSerials = serialInputText
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    setLines(prev => prev.map(l => {
      if (l.id === activeSerialLineId) {
        return { ...l, serials: cleanSerials };
      }
      return l;
    }));
    setActiveSerialLineId(null);
    toast.success("Đã ghi nhận danh sách số Serial.");
  };

  // Quick Paste Data Modal Handler
  const handleQuickPaste = () => {
    const rawRows = pasteText.split('\n').filter(Boolean);
    const newItems: InvoiceLineItem[] = [];

    rawRows.forEach(rowStr => {
      const cols = rowStr.split('\t');
      if (cols.length < 2) return;

      const itemName = cols[0]?.trim() || '';
      const assetName = cols[1]?.trim() || itemName;
      const qty = parseInt(cols[2]?.trim()) || 1;
      const price = parseFloat(cols[3]?.trim()) || 0;
      const serials = cols[4] ? cols[4].split(',').map(s => s.trim()).filter(Boolean) : [];
      const note = cols[5]?.trim() || '';

      const lineId = Math.random().toString(36).substr(2, 9);
      const suggestions = suggestCategoryForLine(itemName);

      newItems.push({
        id: lineId,
        invoiceItemName: itemName,
        assetName: assetName,
        categoryLevel1Id: suggestions.categoryLevel1Id || '',
        categoryLevel2Id: suggestions.categoryLevel2Id || '',
        categoryLevel3Id: suggestions.categoryLevel3Id || '',
        categoryLevel4Id: suggestions.categoryLevel4Id || '',
        quantity: qty,
        unitPrice: price,
        serials,
        note
      });
    });

    if (newItems.length > 0) {
      setLines(prev => {
        // If the first row is completely empty, replace it
        if (prev.length === 1 && !prev[0].invoiceItemName) {
          return newItems;
        }
        return [...prev, ...newItems];
      });
      toast.success(`Đã dán nhanh ${newItems.length} hạng mục thành công!`);
      setIsPasteModalOpen(false);
      setPasteText('');
    } else {
      toast.error("Không thể đọc định dạng dòng. Vui lòng copy bảng từ Excel.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại Sổ tài sản
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Cấp mới tài sản theo hóa đơn
            <span className="text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Chế độ Batch
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Nhập hóa đơn chứa nhiều hạng mục, tự động bóc tách và sinh mã tài sản riêng biệt theo cấu trúc phân nhóm của từng dòng.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold transition-all shadow-sm bg-white"
          >
            <Download className="h-4 w-4 text-primary-500" /> Tải báo cáo tổng hợp
          </button>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold transition-all shadow-sm bg-white"
          >
            <Download className="h-4 w-4 text-emerald-500" /> Tải Excel Mẫu
          </button>
          <button 
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold transition-all shadow-sm bg-white"
          >
            <Keyboard className="h-4 w-4 text-primary-500" /> Dán nhanh Excel
          </button>
        </div>
      </div>

      {/* DYNAMIC ALERT BANNER */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-5 shadow-sm flex gap-4 items-start">
        <Sparkles className="h-6 w-6 text-primary-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-blue-900 font-bold text-sm">Cơ chế sinh mã thông minh độc lập</h4>
          <p className="text-blue-700/90 text-xs mt-0.5 leading-relaxed">
            Hệ thống không áp đặt một cấu trúc mã chung cho toàn hóa đơn. Mã tài sản sẽ được sinh tự động độc lập theo mã của từng <strong>Phân loại Cấp 4</strong> mà dòng hạng mục đó thuộc về.
          </p>
        </div>
      </div>

      {/* DRAG & DROP UPLOAD AREA */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[2.5rem] p-8 text-center transition-all bg-white relative overflow-hidden group shadow-md ${parsing ? 'border-primary-400 bg-primary-50/10' : 'border-slate-200 hover:border-primary-400'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xml,.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png" 
          className="hidden" 
        />
        {parsing ? (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mb-4"></div>
            <h3 className="text-slate-800 font-bold">Đang phân tích tệp hóa đơn...</h3>
            <p className="text-slate-500 text-xs mt-1">Hệ thống đang bóc tách thông tin XML/Excel và phân tích dữ liệu dòng hàng.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 cursor-pointer" onClick={handleFileUploadClick}>
            <div className="p-4 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-300 mb-4 shadow-inner">
              <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <h3 className="text-slate-800 font-black text-lg tracking-tight group-hover:text-primary-600 transition-colors">
              Kéo thả hoặc Click chọn tệp Hóa đơn
            </h3>
            <p className="text-slate-500 text-xs mt-1.5 max-w-lg leading-relaxed">
              Hỗ trợ tệp <strong>XML Hóa đơn điện tử</strong>, tệp <strong>Excel nhập liệu</strong>, hoặc tệp <strong>PDF/Ảnh</strong>. Hệ thống sẽ tự động bóc tách nội dung chi tiết và gợi ý danh mục 4 cấp.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COMPONENT A: INVOICE METADATA FORM */}
        <div className={`${invoice.fileUrl ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 space-y-6 transition-all duration-300`}>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary-500" />
            1. Thông tin hóa đơn gốc
          </h2>

          <div className={`grid grid-cols-1 ${invoice.fileUrl ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-6`}>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Số hóa đơn *</label>
              <input 
                type="text" 
                placeholder="Nhập số hóa đơn..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.invoiceNo}
                onChange={e => setInvoice(prev => ({ ...prev, invoiceNo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ngày hóa đơn *</label>
              <input 
                type="date" 
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.invoiceDate}
                onChange={e => setInvoice(prev => ({ ...prev, invoiceDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tên Nhà cung cấp *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Công ty Dell Việt Nam..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.supplierName}
                onChange={e => setInvoice(prev => ({ ...prev, supplierName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Mã số thuế NCC</label>
              <input 
                type="text" 
                placeholder="Nhập mã số thuế..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.supplierTaxCode}
                onChange={e => setInvoice(prev => ({ ...prev, supplierTaxCode: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Công ty nhận hóa đơn *</label>
              <select 
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.companyId}
                onChange={e => setInvoice(prev => ({ ...prev, companyId: e.target.value }))}
              >
                <option value="">-- Chọn công ty --</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Kho nhập ban đầu *</label>
              <select 
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.warehouseId}
                onChange={e => setInvoice(prev => ({ ...prev, warehouseId: e.target.value }))}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tổng tiền hóa đơn (đối chiếu)</label>
              <input 
                type="number" 
                placeholder="Nhập tổng tiền hóa đơn..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold text-right"
                value={invoice.totalAmount}
                onChange={e => setInvoice(prev => ({ ...prev, totalAmount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ghi chú hóa đơn</label>
              <input 
                type="text" 
                placeholder="Thông tin thêm..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold"
                value={invoice.note}
                onChange={e => setInvoice(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* INVOICE PREVIEW PANEL (only when fileUrl is present) */}
        {invoice.fileUrl && (
          <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-100 flex flex-col justify-between h-full animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Xem tệp hóa đơn gốc</h3>
                <a 
                  href={invoice.fileUrl.startsWith('http') ? invoice.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${invoice.fileUrl}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] font-black text-primary-650 hover:underline"
                >
                  Mở tab mới
                </a>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center min-h-[350px] max-h-[450px]">
                {invoice.fileUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`${invoice.fileUrl.startsWith('http') ? invoice.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${invoice.fileUrl}`}#toolbar=0`} 
                    className="w-full h-full border-0" 
                    title="Invoice PDF"
                  />
                ) : (
                  <img 
                    src={invoice.fileUrl.startsWith('http') ? invoice.fileUrl : `${api.defaults.baseURL?.replace('/api', '')}${invoice.fileUrl}`} 
                    alt="Invoice" 
                    className="max-w-full max-h-full object-contain p-2"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPONENT B: EDITABLE LINE ITEMS TABLE */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 space-y-6 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Tag className="h-5 w-5 text-primary-500" />
              2. Danh sách hạng mục & Định khoản
            </h2>

            <div className="flex gap-2 self-stretch md:self-auto">
              <button 
                onClick={handleBulkSuggest}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" /> Gợi ý phân nhóm
              </button>
              <button 
                onClick={handleAddLine}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm dòng
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-3xl">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-500 text-xs font-bold uppercase tracking-wider w-12">STT</th>
                  <th className="px-4 py-3 text-left text-slate-500 text-xs font-bold uppercase tracking-wider min-w-[200px]">Tên trên hóa đơn *</th>
                  <th className="px-4 py-3 text-left text-slate-500 text-xs font-bold uppercase tracking-wider min-w-[200px]">Tên tài sản chuẩn *</th>
                  <th className="px-4 py-3 text-left text-slate-500 text-xs font-bold uppercase tracking-wider min-w-[180px]">Phân loại định khoản *</th>
                  <th className="px-4 py-3 text-right text-slate-500 text-xs font-bold uppercase tracking-wider w-20">SL *</th>
                  <th className="px-4 py-3 text-right text-slate-500 text-xs font-bold uppercase tracking-wider w-28">Đơn giá *</th>
                  <th className="px-4 py-3 text-right text-slate-500 text-xs font-bold uppercase tracking-wider w-28">Thành tiền</th>
                  <th className="px-4 py-3 text-center text-slate-500 text-xs font-bold uppercase tracking-wider w-24">Serial</th>
                  <th className="px-4 py-3 text-left text-slate-500 text-xs font-bold uppercase tracking-wider w-28">Ghi chú</th>
                  <th className="px-4 py-3 text-center text-slate-500 text-xs font-bold uppercase tracking-wider w-20">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lines.map((line, index) => {
                  const cat2List = getCat2Options(line.categoryLevel1Id);
                  const cat3List = getCat3Options(line.categoryLevel2Id);
                  const cat4List = getCat4Options(line.categoryLevel3Id);

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400 text-center">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input 
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-primary-500 focus:ring-primary-500 rounded-xl text-xs font-semibold"
                          placeholder="Ví dụ: Laptop Dell XPS..."
                          value={line.invoiceItemName}
                          onChange={e => {
                            const val = e.target.value;
                            setLines(prev => prev.map(l => {
                              if (l.id === line.id) {
                                // Attempt client-side suggestion
                                const suggested = suggestCategoryForLine(val);
                                return { ...l, invoiceItemName: val, assetName: l.assetName || val, ...suggested };
                              }
                              return l;
                            }));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input 
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-slate-200 focus:border-primary-500 focus:ring-primary-500 rounded-xl text-xs font-semibold"
                          placeholder="Tên chuẩn trong Sổ..."
                          value={line.assetName}
                          onChange={e => {
                            const val = e.target.value;
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, assetName: val } : l));
                          }}
                        />
                      </td>

                      {/* Phân loại tài sản (4 levels cascading) */}
                      <td className="px-2 py-2 min-w-[200px] space-y-1">
                        <select
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500"
                          value={line.categoryLevel1Id}
                          onChange={e => {
                            const val = e.target.value;
                            setLines(prev => prev.map(l => l.id === line.id ? { 
                              ...l, 
                              categoryLevel1Id: val, 
                              categoryLevel2Id: '', 
                              categoryLevel3Id: '', 
                              categoryLevel4Id: '' 
                            } : l));
                          }}
                        >
                          <option value="">-- Cấp 1 --</option>
                          {getCat1Options().map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>

                        {line.categoryLevel1Id && (
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 animate-in fade-in duration-100"
                            value={line.categoryLevel2Id}
                            onChange={e => {
                              const val = e.target.value;
                              setLines(prev => prev.map(l => l.id === line.id ? { 
                                ...l, 
                                categoryLevel2Id: val, 
                                categoryLevel3Id: '', 
                                categoryLevel4Id: '' 
                              } : l));
                            }}
                          >
                            <option value="">-- Cấp 2 --</option>
                            {cat2List.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        )}

                        {line.categoryLevel2Id && (
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 animate-in fade-in duration-100"
                            value={line.categoryLevel3Id}
                            onChange={e => {
                              const val = e.target.value;
                              setLines(prev => prev.map(l => l.id === line.id ? { 
                                ...l, 
                                categoryLevel3Id: val, 
                                categoryLevel4Id: '' 
                              } : l));
                            }}
                          >
                            <option value="">-- Cấp 3 --</option>
                            {cat3List.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        )}

                        {line.categoryLevel3Id && (
                          <select
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-semibold bg-white focus:border-primary-500 focus:ring-primary-500 animate-in fade-in duration-100"
                            value={line.categoryLevel4Id}
                            onChange={e => {
                              const val = e.target.value;
                              setLines(prev => prev.map(l => l.id === line.id ? { ...l, categoryLevel4Id: val } : l));
                            }}
                          >
                            <option value="">-- Cấp 4 --</option>
                            {cat4List.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-2 py-2">
                        <input 
                          type="number"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-right"
                          min="1"
                          value={line.quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, quantity: val } : l));
                          }}
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-2 py-2">
                        <input 
                          type="number"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-right"
                          min="0"
                          value={line.unitPrice}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, unitPrice: val } : l));
                          }}
                        />
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-slate-700 text-xs">
                        {(line.quantity * line.unitPrice).toLocaleString()}
                      </td>

                      {/* Serial Entry Trigger */}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => openSerialsModal(line)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all border ${
                            line.serials.length === line.quantity 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : line.serials.length > 0 
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {line.serials.length > 0 ? `${line.serials.length}/${line.quantity} SN` : 'Nhập SN'}
                        </button>
                      </td>

                      {/* Row Note */}
                      <td className="px-2 py-2">
                        <input 
                          type="text"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold"
                          placeholder="Ghi chú..."
                          value={line.note}
                          onChange={e => {
                            const val = e.target.value;
                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, note: val } : l));
                          }}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleCloneLine(line)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                            title="Nhân bản dòng"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY & VALIDATION BOARD */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary-500" />
            Tổng quan lô hàng
          </h3>

          <div className="space-y-3.5 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Tổng số hạng mục:</span>
              <span className="font-bold text-slate-800">{lines.length} dòng</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Tổng số tài sản sẽ tạo:</span>
              <span className="font-bold text-slate-800">{totalQuantity} chiếc</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Giá trị lô hàng:</span>
              <span className="font-black text-slate-900">{totalValue.toLocaleString()} VNĐ</span>
            </div>
            {invoice.totalAmount && (
              <>
                <div className="h-[1px] bg-slate-200/80 my-2"></div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Tổng tiền trên hóa đơn:</span>
                  <span className="font-bold text-slate-800">{parseFloat(invoice.totalAmount).toLocaleString()} VNĐ</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Mức chênh lệch:</span>
                  <span className={`font-bold ${Math.abs(invoiceDiff) > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {invoiceDiff.toLocaleString()} VNĐ
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4">
            {/* Errors List */}
            {validationErrors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-rose-700 text-xs font-black uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Lỗi nghiêm trọng ({validationErrors.length})
                </div>
                <div className="max-h-48 overflow-y-auto bg-rose-50/40 border border-rose-100 p-4 rounded-2xl text-xs space-y-2">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="flex gap-2 text-rose-800 leading-relaxed font-semibold">
                      <span className="shrink-0">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings List */}
            {validationWarnings.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Cảnh báo hệ thống ({validationWarnings.length})
                </div>
                <div className="max-h-48 overflow-y-auto bg-amber-50/30 border border-amber-100 p-4 rounded-2xl text-xs space-y-2">
                  {validationWarnings.map((warn, i) => (
                    <div key={i} className="flex gap-2 text-amber-800 leading-relaxed font-semibold">
                      <span className="shrink-0">•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationErrors.length === 0 && validationWarnings.length === 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>Dữ liệu hoàn toàn hợp lệ! Sẵn sàng khởi tạo tài sản hàng loạt.</span>
              </div>
            )}
          </div>
        </div>

        {/* SUBMIT ACTIONS & AUTO HANDOVER TRIGGER */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary-500" />
              3. Tác vụ khởi tạo sổ
            </h3>
            
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-slate-800 font-bold text-sm">Bàn giao & Cấp phát ngay lập tức?</h4>
                <p className="text-slate-500 text-xs leading-relaxed max-w-md">
                  Kích hoạt luồng bàn giao lập tức cho nhân viên ngay sau khi tạo tài sản mà không cần qua kho lưu trữ.
                </p>
              </div>
              <input 
                type="checkbox"
                className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-colors cursor-pointer"
                checked={assignImmediately}
                onChange={e => setAssignImmediately(e.target.checked)}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
              Hủy bỏ & Quay về Sổ
            </button>
            <button
              disabled={loading || validationErrors.length > 0}
              onClick={handleConfirmPost}
              className={`flex-[2] py-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                loading || validationErrors.length > 0
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Đang khởi tạo tài sản...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Hoàn tất & Khởi tạo {totalQuantity} tài sản</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: SERIAL NUMBERS INPUT POPUP */}
      {activeSerialLineId !== null && (() => {
        const line = lines.find(l => l.id === activeSerialLineId)!;
        const enteredCount = serialInputText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).length;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Nhập danh sách Serial</h3>
                    <p className="text-slate-500 text-xs mt-1">Dòng: {line.invoiceItemName || 'Hạng mục chưa đặt tên'}</p>
                  </div>
                  <button 
                    onClick={() => setActiveSerialLineId(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Số Serial đã nhập:</span>
                  <span className={enteredCount === line.quantity ? 'text-emerald-600' : 'text-slate-700'}>
                    {enteredCount} / {line.quantity} Serial
                  </span>
                </div>

                <textarea
                  rows={8}
                  placeholder="Nhập mỗi số serial trên một dòng hoặc phân tách bằng dấu phẩy..."
                  className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold p-4"
                  value={serialInputText}
                  onChange={e => setSerialInputText(e.target.value)}
                />

                {enteredCount > line.quantity && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-rose-800 text-xs font-semibold leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Số lượng Serial ({enteredCount}) đang nhiều hơn số lượng hạng mục ({line.quantity}). Vui lòng kiểm tra lại.
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setActiveSerialLineId(null)}
                  className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={saveSerials}
                  className="flex-[2] px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-sm shadow-md transition-colors"
                >
                  Lưu danh sách
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: QUICK PASTE MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Dán nhanh dữ liệu từ Excel</h3>
                  <p className="text-slate-500 text-xs mt-1">Sao chép một bảng từ Excel và dán trực tiếp vào đây để nhập siêu tốc.</p>
                </div>
                <button 
                  onClick={() => setIsPasteModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-600 space-y-1">
                <h4 className="font-bold text-slate-700">Quy tắc định dạng các cột (ngăn cách bằng phím Tab):</h4>
                <p>1. Tên trên hóa đơn | 2. Tên tài sản chuẩn | 3. Số lượng | 4. Đơn giá | 5. Serial (phân cách bằng dấu phẩy) | 6. Ghi chú</p>
              </div>

              <textarea
                rows={10}
                placeholder="Dán (Ctrl + V) dữ liệu bảng Excel tại đây..."
                className="w-full rounded-2xl border-slate-200 focus:border-primary-500 focus:ring-primary-500 text-xs font-semibold p-4 font-mono"
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={!pasteText.trim()}
                onClick={handleQuickPaste}
                className={`flex-[2] px-5 py-3 rounded-2xl font-black text-sm text-white shadow-md transition-colors ${
                  pasteText.trim() ? 'bg-primary-600 hover:bg-primary-700' : 'bg-slate-300'
                }`}
              >
                Import và tự bóc tách
              </button>
            </div>
          </div>
        </div>
      )}
      <DateRangeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportCreated}
        title="Tải báo cáo Cấp mới / Nhập lô"
      />
    </div>
  );
};
