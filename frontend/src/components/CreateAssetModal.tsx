import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  Save, Plus, Trash2, Upload, Download, FileDown, 
  AlertCircle, CheckCircle2, X, FileUp, Loader2, Sparkles,
  Package, Building2, Tag, Coins, ClipboardCheck
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useAuth } from '../context/AuthContext';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface InvoiceMetadata {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierTaxCode: string;
  companyId: string;
  warehouseId: string;
  totalAmount: string;
  note: string;
}

interface InvoiceLineItem {
  id: string;
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

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoice' | 'manual' | 'excel'>('invoice');

  // Metadata
  const [companies, setCompanies] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [warehouses] = useState<any[]>([
    { id: 1, name: 'Kho QLTS' },
    { id: 2, name: 'Kho trung tâm' },
    { id: 3, name: 'Kho dự phòng CNTT' },
  ]);

  useEffect(() => {
    if (isOpen) {
      const loadMetadata = async () => {
        try {
          const [compRes, catRes] = await Promise.all([
            api.get('/assets/companies/active'),
            api.get('/assets/categories/active/all')
          ]);
          setCompanies(compRes.data);
          setAllCategories(catRes.data);
          
          if (compRes.data.length > 0) {
            setInvoice(prev => ({ ...prev, companyId: compRes.data[0].id.toString() }));
            setManualForm(prev => ({ ...prev, companyId: compRes.data[0].id.toString() }));
          }
        } catch (err) {
          toast.error("Không thể tải thông tin cấu trúc danh mục và công ty.");
        }
      };
      loadMetadata();
    }
  }, [isOpen]);

  const getCat1Options = () => allCategories.filter(c => c.level === 1);
  const getCat2Options = (parentId: string) => allCategories.filter(c => c.level === 2 && c.parentId === parseInt(parentId));
  const getCat3Options = (parentId: string) => allCategories.filter(c => c.level === 3 && c.parentId === parseInt(parentId));
  const getCat4Options = (parentId: string) => allCategories.filter(c => c.level === 4 && c.parentId === parseInt(parentId));

  // ================= TAB 1: NHẬP THEO HÓA ĐƠN =================
  const [invoice, setInvoice] = useState<InvoiceMetadata>({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierTaxCode: '',
    companyId: '',
    warehouseId: '1',
    totalAmount: '',
    note: '',
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

  const [parsing, setParsing] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [activeSerialLineId, setActiveSerialLineId] = useState<string | null>(null);
  const [serialInputText, setSerialInputText] = useState('');

  const suggestCategoryForLine = (itemName: string): Partial<InvoiceLineItem> => {
    if (!itemName) return {};
    const nameLower = itemName.toLowerCase();
    const rules = [
      { keywords: ['laptop', 'pc', 'dell', 'hp', 'lenovo', 'thinkpad', 'macbook', 'máy tính'], match: 'pc' },
      { keywords: ['màn hình', 'monitor', 'display'], match: 'monitor' },
      { keywords: ['bàn', 'desk'], match: 'table' },
      { keywords: ['ghế', 'chair'], match: 'chair' },
      { keywords: ['tủ', 'cabinet'], match: 'cabinet' },
      { keywords: ['điện thoại', 'iphone', 'samsung', 'phone'], match: 'phone' },
      { keywords: ['máy in', 'printer'], match: 'printer' },
      { keywords: ['switch', 'router', 'cisco', 'firewall', 'wifi', 'unifi'], match: 'network' },
    ];

    const matchedRule = rules.find(r => r.keywords.some(k => nameLower.includes(k)));
    if (!matchedRule) return {};

    const level4 = allCategories.find(c => c.level === 4 && c.code.toLowerCase().includes(matchedRule.match));
    if (!level4) return {};

    const level3 = allCategories.find(c => c.id === level4.parentId);
    if (!level3) return {};

    const level2 = allCategories.find(c => c.id === level3.parentId);
    if (!level2) return {};

    const level1 = allCategories.find(c => c.id === level2.parentId);
    if (!level1) return {};

    return {
      categoryLevel1Id: level1.id.toString(),
      categoryLevel2Id: level2.id.toString(),
      categoryLevel3Id: level3.id.toString(),
      categoryLevel4Id: level4.id.toString()
    };
  };

  const handleInvoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/creation/parse-invoice', formData);
      const data = res.data;

      setInvoice(prev => ({
        ...prev,
        invoiceNo: data.invoiceNo || '',
        invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
        supplierName: data.supplierName || '',
        supplierTaxCode: data.supplierTaxCode || '',
        totalAmount: data.totalAmount?.toString() || '',
      }));

      if (data.items && data.items.length > 0) {
        const mappedLines = data.items.map((item: any) => {
          const suggested = suggestCategoryForLine(item.name);
          return {
            id: Math.random().toString(36).substr(2, 9),
            invoiceItemName: item.name || '',
            assetName: item.name || '',
            categoryLevel1Id: suggested.categoryLevel1Id || '',
            categoryLevel2Id: suggested.categoryLevel2Id || '',
            categoryLevel3Id: suggested.categoryLevel3Id || '',
            categoryLevel4Id: suggested.categoryLevel4Id || '',
            quantity: item.quantity || 1,
            unitPrice: item.price || 0,
            serials: [],
            note: ''
          };
        });
        setLines(mappedLines);
        toast.success(`Đã phân tích hóa đơn và trích xuất ${mappedLines.length} dòng hàng.`);
      }
    } catch (err) {
      toast.error("Không thể phân tích hóa đơn. Vui lòng nhập thủ công.");
    } finally {
      setParsing(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, {
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
    }]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const openSerialsModal = (line: InvoiceLineItem) => {
    setActiveSerialLineId(line.id);
    setSerialInputText(line.serials.join('\n'));
  };

  const saveSerials = () => {
    if (!activeSerialLineId) return;
    const line = lines.find(l => l.id === activeSerialLineId);
    if (!line) return;

    const parsed = serialInputText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (parsed.length > line.quantity) {
      toast.warning(`Số lượng Serial (${parsed.length}) vượt quá số lượng tài sản (${line.quantity}).`);
    }

    setLines(prev => prev.map(l => l.id === activeSerialLineId ? { ...l, serials: parsed } : l));
    setActiveSerialLineId(null);
  };

  const handleSaveInvoice = async () => {
    if (!invoice.invoiceNo.trim()) return toast.error("Vui lòng nhập số hóa đơn");
    if (!invoice.companyId) return toast.error("Vui lòng chọn công ty sở hữu");

    // Validation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.assetName.trim()) return toast.error(`Dòng ${i + 1}: Thiếu tên tài sản`);
      if (!line.categoryLevel4Id) return toast.error(`Dòng ${i + 1}: Thiếu phân loại cấp 4`);
      if (line.serials.length > 0 && line.serials.length !== line.quantity) {
        return toast.error(`Dòng ${i + 1}: Số lượng Serial (${line.serials.length}) khác với số lượng tài sản (${line.quantity})`);
      }
    }

    setIsSubmittingInvoice(true);
    try {
      const payload = {
        metadata: {
          ...invoice,
          totalAmount: parseFloat(invoice.totalAmount) || 0,
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
        }))
      };

      await api.post('/creation/invoice-batch', payload);
      toast.success("Tạo tài sản theo hóa đơn thành công!");
      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra khi tạo tài sản");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // ================= TAB 2: NHẬP THỦ CÔNG 1 TÀI SẢN =================
  const [manualForm, setManualForm] = useState({
    companyId: '',
    cat1Id: '',
    cat2Id: '',
    cat3Id: '',
    cat4Id: '',
    assetName: '',
    serialNumber: '',
    unit: 'Cái',
    projectName: '',
    purchasePriceExVat: '',
    usagePurpose: 'Cá nhân',
    supplierName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    depreciationEndDate: '',
    note: ''
  });

  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const handleSaveManual = async () => {
    if (!manualForm.assetName.trim()) return toast.error("Vui lòng nhập tên tài sản");
    if (!manualForm.companyId) return toast.error("Vui lòng chọn công ty sở hữu");
    if (!manualForm.cat4Id) return toast.error("Vui lòng chọn đầy đủ phân loại cấp 4");

    setIsSubmittingManual(true);
    try {
      const payload = {
        companyId: parseInt(manualForm.companyId),
        cat1Id: parseInt(manualForm.cat1Id),
        cat2Id: parseInt(manualForm.cat2Id),
        cat3Id: parseInt(manualForm.cat3Id),
        cat4Id: parseInt(manualForm.cat4Id),
        assetName: manualForm.assetName,
        serialNumber: manualForm.serialNumber,
        quantity: 1,
        unit: manualForm.unit,
        projectName: manualForm.projectName,
        purchasePriceExVat: parseFloat(manualForm.purchasePriceExVat) || 0,
        usagePurpose: manualForm.usagePurpose,
        supplierName: manualForm.supplierName,
        purchaseDate: manualForm.purchaseDate,
        depreciationEndDate: manualForm.depreciationEndDate || null,
        note: manualForm.note
      };

      await api.post('/assets/bulk-create', payload);
      toast.success("Tạo tài sản thủ công thành công!");
      
      // Reset form
      setManualForm(prev => ({
        ...prev,
        assetName: '',
        serialNumber: '',
        projectName: '',
        purchasePriceExVat: '',
        supplierName: '',
        note: ''
      }));

      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo tài sản");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // ================= TAB 3: IMPORT EXCEL =================
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/import/assets/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'asset_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Lỗi khi tải template");
    }
  };

  const handleExcelPreview = async () => {
    if (!excelFile) return;
    setIsProcessingExcel(true);
    const formData = new FormData();
    formData.append('file', excelFile);
    try {
      const res = await api.post('/import/assets/preview', formData);
      setExcelPreview(res.data);
      toast.info("Đã tải dữ liệu xem trước");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xử lý file");
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelFile) return;
    setIsProcessingExcel(true);
    const formData = new FormData();
    formData.append('file', excelFile);
    try {
      await api.post('/import/assets/excel', formData);
      toast.success("Import dữ liệu tài sản Excel thành công!");
      setExcelPreview(null);
      setExcelFile(null);
      if (onComplete) onComplete();
      onClose();
    } catch (err: any) {
      toast.error("Import thất bại");
    } finally {
      setIsProcessingExcel(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="wizard"
      title={
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Thêm mới tài sản</h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Tạo mới theo Hóa đơn, Thủ công hoặc Excel</p>
        </div>
      }
      footer={
        activeTab === 'invoice' ? (
          <>
            <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider">Hủy</button>
            <button 
              onClick={handleSaveInvoice}
              disabled={isSubmittingInvoice}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              {isSubmittingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Cấp phát tài sản
            </button>
          </>
        ) : activeTab === 'manual' ? (
          <>
            <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider">Hủy</button>
            <button 
              onClick={handleSaveManual}
              disabled={isSubmittingManual}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary-100 disabled:opacity-50"
            >
              {isSubmittingManual ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Lưu tài sản
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors font-bold text-xs uppercase tracking-wider">Hủy</button>
            {excelFile && excelPreview && (
              <button 
                onClick={handleConfirmExcelImport}
                disabled={isProcessingExcel}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {isProcessingExcel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận Import
              </button>
            )}
          </>
        )
      }
    >
      <div className="flex flex-col h-full space-y-6">
        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 shrink-0">
          {[
            { id: 'invoice', label: 'Nhập theo hóa đơn' },
            { id: 'manual', label: 'Nhập thủ công 1 tài sản' },
            { id: 'excel', label: 'Import Excel' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {/* TAB 1: NHẬP THEO HÓA ĐƠN */}
          {activeTab === 'invoice' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* File Upload Zone */}
              <div className="border border-slate-200 border-dashed rounded-2xl p-5 bg-slate-50/50 flex items-center justify-between gap-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Trích xuất từ hóa đơn XML/PDF</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Hệ thống hỗ trợ parse hóa đơn tự động để điền thông tin nhanh</p>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xml,.pdf" 
                    onChange={handleInvoiceFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button 
                    disabled={parsing}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center"
                  >
                    {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    Tải lên hóa đơn
                  </button>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Số hóa đơn *</label>
                  <input 
                    type="text"
                    value={invoice.invoiceNo}
                    onChange={e => setInvoice({...invoice, invoiceNo: e.target.value})}
                    placeholder="E.g. 0001234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày hóa đơn</label>
                  <input 
                    type="date"
                    value={invoice.invoiceDate}
                    onChange={e => setInvoice({...invoice, invoiceDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nhà cung cấp</label>
                  <input 
                    type="text"
                    value={invoice.supplierName}
                    onChange={e => setInvoice({...invoice, supplierName: e.target.value})}
                    placeholder="Công ty ABC"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị sở hữu *</label>
                  <select
                    value={invoice.companyId}
                    onChange={e => setInvoice({...invoice, companyId: e.target.value})}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700"
                  >
                    <option value="">-- Chọn công ty --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Danh sách dòng hàng hóa đơn</h4>
                  <button 
                    onClick={handleAddLine}
                    className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-650 rounded-xl text-xs font-bold transition-colors flex items-center"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Thêm dòng
                  </button>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white h-10">
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-24">Tên hóa đơn</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-32">Tên tài sản</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-32">Phân loại</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-16 text-center">SL</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-24 text-right">Đơn giá</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] w-20 text-center">Serial</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, index) => {
                        const cat2List = line.categoryLevel1Id ? getCat2Options(line.categoryLevel1Id) : [];
                        const cat3List = line.categoryLevel2Id ? getCat3Options(line.categoryLevel2Id) : [];
                        const cat4List = line.categoryLevel3Id ? getCat4Options(line.categoryLevel3Id) : [];

                        return (
                          <tr key={line.id} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <input 
                                type="text"
                                value={line.invoiceItemName}
                                onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, invoiceItemName: e.target.value } : l))}
                                placeholder="E.g. Laptop HP"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text"
                                value={line.assetName}
                                onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, assetName: e.target.value } : l))}
                                placeholder="Tên sản phẩm QL"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold"
                              />
                            </td>
                            <td className="p-2 space-y-1">
                              <select
                                value={line.categoryLevel1Id}
                                onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, categoryLevel1Id: e.target.value, categoryLevel2Id: '', categoryLevel3Id: '', categoryLevel4Id: '' } : l))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold"
                              >
                                <option value="">-- Cấp 1 --</option>
                                {getCat1Options().map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                              </select>
                              {line.categoryLevel1Id && (
                                <select
                                  value={line.categoryLevel2Id}
                                  onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, categoryLevel2Id: e.target.value, categoryLevel3Id: '', categoryLevel4Id: '' } : l))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold"
                                >
                                  <option value="">-- Cấp 2 --</option>
                                  {cat2List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                </select>
                              )}
                              {line.categoryLevel2Id && (
                                <select
                                  value={line.categoryLevel3Id}
                                  onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, categoryLevel3Id: e.target.value, categoryLevel4Id: '' } : l))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold"
                                >
                                  <option value="">-- Cấp 3 --</option>
                                  {cat3List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                </select>
                              )}
                              {line.categoryLevel3Id && (
                                <select
                                  value={line.categoryLevel4Id}
                                  onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, categoryLevel4Id: e.target.value } : l))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-bold"
                                >
                                  <option value="">-- Cấp 4 --</option>
                                  {cat4List.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="p-2">
                              <input 
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, quantity: parseInt(e.target.value) || 1 } : l))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-1.5 text-xs text-center font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number"
                                min="0"
                                value={line.unitPrice}
                                onChange={e => setLines(prev => prev.map(l => l.id === line.id ? { ...l, unitPrice: parseFloat(e.target.value) || 0 } : l))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-right font-bold"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => openSerialsModal(line)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                  line.serials.length === line.quantity 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : line.serials.length > 0 
                                      ? 'bg-amber-50 text-amber-705 border-amber-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {line.serials.length > 0 ? `${line.serials.length}/${line.quantity}` : 'Nhập SN'}
                              </button>
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                onClick={() => handleRemoveLine(line.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NHẬP THỦ CÔNG 1 TÀI SẢN */}
          {activeTab === 'manual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 animate-in fade-in duration-200">
              <div className="space-y-4 p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b pb-2">
                  <Package className="h-4 w-4 text-slate-500" /> Thông tin cơ bản
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Tên tài sản *</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-all text-xs"
                      placeholder="Ví dụ: Ghế da văn phòng cao cấp Hòa Phát"
                      value={manualForm.assetName}
                      onChange={e => setManualForm({...manualForm, assetName: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Số Serial / Service Tag</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-all text-xs"
                        placeholder="E.g. SN-82739X"
                        value={manualForm.serialNumber}
                        onChange={e => setManualForm({...manualForm, serialNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Đơn vị tính</label>
                      <select 
                        value={manualForm.unit}
                        onChange={e => setManualForm({...manualForm, unit: e.target.value})}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      >
                        {['Cái', 'Bộ', 'Chiếc', 'Mét', 'Kg', 'Lô'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Công ty sở hữu *</label>
                      <select 
                        value={manualForm.companyId}
                        onChange={e => setManualForm({...manualForm, companyId: e.target.value})}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      >
                        <option value="">-- Chọn công ty --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Dự án đầu tư</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-all text-xs"
                        placeholder="E.g. Dự án cải tạo văn phòng"
                        value={manualForm.projectName}
                        onChange={e => setManualForm({...manualForm, projectName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">Ghi chú</label>
                    <textarea 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 h-16 resize-none focus:bg-white transition-all text-xs"
                      placeholder="Thêm thông tin mô tả phụ..."
                      value={manualForm.note}
                      onChange={e => setManualForm({...manualForm, note: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Category selectors */}
                <div className="space-y-4 p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b pb-2">
                    <Tag className="h-4 w-4 text-slate-500" /> Cấu trúc phân loại tài sản (Cấp 1 - 4)
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Phân loại cấp 1 *</label>
                      <select 
                        value={manualForm.cat1Id}
                        onChange={e => setManualForm({ ...manualForm, cat1Id: e.target.value, cat2Id: '', cat3Id: '', cat4Id: '' })}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                      >
                        <option value="">-- Chọn cấp 1 --</option>
                        {getCat1Options().map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Phân loại cấp 2 *</label>
                      <select 
                        value={manualForm.cat2Id}
                        disabled={!manualForm.cat1Id}
                        onChange={e => setManualForm({ ...manualForm, cat2Id: e.target.value, cat3Id: '', cat4Id: '' })}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                      >
                        <option value="">-- Chọn cấp 2 --</option>
                        {manualForm.cat1Id && getCat2Options(manualForm.cat1Id).map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Phân loại cấp 3 *</label>
                      <select 
                        value={manualForm.cat3Id}
                        disabled={!manualForm.cat2Id}
                        onChange={e => setManualForm({ ...manualForm, cat3Id: e.target.value, cat4Id: '' })}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs disabled:opacity-50"
                      >
                        <option value="">-- Chọn cấp 3 --</option>
                        {manualForm.cat2Id && getCat3Options(manualForm.cat2Id).map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">Phân loại cấp 4 *</label>
                      <select 
                        value={manualForm.cat4Id}
                        disabled={!manualForm.cat3Id}
                        onChange={e => setManualForm({ ...manualForm, cat4Id: e.target.value })}
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-850 text-xs disabled:opacity-50"
                      >
                        <option value="">-- Chọn cấp 4 --</option>
                        {manualForm.cat3Id && getCat4Options(manualForm.cat3Id).map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Financial and Purchasing info */}
                <div className="space-y-4 p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b pb-2">
                    <Coins className="h-4 w-4 text-slate-500" /> Tài chính & Mua sắm
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 font-mono">Giá mua (ex VAT) ₫</label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-805 focus:bg-white transition-all text-xs"
                          placeholder="E.g. 5000000"
                          value={manualForm.purchasePriceExVat}
                          onChange={e => setManualForm({...manualForm, purchasePriceExVat: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Mục đích sử dụng</label>
                        <select 
                          value={manualForm.usagePurpose}
                          onChange={e => setManualForm({...manualForm, usagePurpose: e.target.value})}
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs"
                        >
                          {['Cá nhân', 'Dùng chung', 'Dự phòng', 'Khác'].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">Ngày mua</label>
                        <input 
                          type="date"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-all text-xs"
                          value={manualForm.purchaseDate}
                          onChange={e => setManualForm({...manualForm, purchaseDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 font-mono">Hạn khấu hao</label>
                        <input 
                          type="date"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white transition-all text-xs"
                          value={manualForm.depreciationEndDate}
                          onChange={e => setManualForm({...manualForm, depreciationEndDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT EXCEL */}
          {activeTab === 'excel' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black text-slate-850 uppercase tracking-wide">Import tài sản hàng loạt</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Tải template mẫu, nhập dữ liệu tài sản và tải lên</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    <Download className="mr-2 h-4 w-4" /> Template Excel
                  </button>
                </div>
              </div>

              <div className="max-w-xl mx-auto text-center space-y-6 py-8">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => {
                      setExcelFile(e.target.files?.[0] || null);
                      setExcelPreview(null);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 group-hover:border-primary-400 transition-colors bg-white shadow-sm flex flex-col items-center justify-center space-y-3">
                    <FileUp className="h-10 w-10 text-slate-350" />
                    <span className="text-slate-400 font-black text-xs uppercase tracking-widest block">
                      {excelFile ? excelFile.name : "Kéo thả file hoặc click để tải lên .xlsx"}
                    </span>
                  </div>
                </div>

                {excelFile && !excelPreview && (
                  <button 
                    onClick={handleExcelPreview} 
                    disabled={isProcessingExcel}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {isProcessingExcel ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><FileUp className="mr-2 h-5 w-5" /> Xem trước dữ liệu</>}
                  </button>
                )}
              </div>

              {excelPreview && (
                <div className="space-y-6 border-t border-slate-100 pt-6 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số dòng</p>
                      <p className="text-2xl font-bold text-slate-900">{excelPreview.total}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tạo mới</p>
                      <p className="text-2xl font-bold text-emerald-700">{excelPreview.creates}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Cập nhật</p>
                      <p className="text-2xl font-bold text-blue-700">{excelPreview.updates}</p>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Lỗi</p>
                      <p className="text-2xl font-bold text-rose-700">{excelPreview.errors}</p>
                    </div>
                  </div>

                  {excelPreview.items && excelPreview.items.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="p-3 font-bold text-[10px] uppercase text-slate-400">Dòng</th>
                            <th className="p-3 font-bold text-[10px] uppercase text-slate-400">Mã tài sản</th>
                            <th className="p-3 font-bold text-[10px] uppercase text-slate-400">Tên tài sản</th>
                            <th className="p-3 font-bold text-[10px] uppercase text-slate-400">Hành động</th>
                            <th className="p-3 font-bold text-[10px] uppercase text-slate-400">Trạng thái / Lỗi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {excelPreview.items.slice(0, 50).map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-slate-400">{item.rowNumber}</td>
                              <td className="p-3 font-mono font-bold text-slate-800">{item.assetCode || 'N/A'}</td>
                              <td className="p-3 text-slate-600 font-semibold">{item.assetName}</td>
                              <td className="p-3 font-bold uppercase tracking-wider text-[10px]">
                                <span className={`px-2 py-0.5 rounded-full ${
                                  item.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {item.action === 'CREATE' ? 'Tạo mới' : 'Cập nhật'}
                                </span>
                              </td>
                              <td className="p-3">
                                {item.error ? (
                                  <span className="text-rose-500 font-bold flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {item.error}</span>
                                ) : (
                                  <span className="text-emerald-605 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Serials Input Modal (nested for Tab 1) */}
      {activeSerialLineId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Nhập danh sách Serial Number</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Nhập mỗi Serial Number trên một dòng tương ứng</p>
            </div>
            <textarea
              className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs font-bold text-slate-800 focus:bg-white transition-all resize-none"
              placeholder="SN-001&#10;SN-002&#10;SN-003..."
              value={serialInputText}
              onChange={e => setSerialInputText(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setActiveSerialLineId(null)} 
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={saveSerials}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Lưu Serial
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
