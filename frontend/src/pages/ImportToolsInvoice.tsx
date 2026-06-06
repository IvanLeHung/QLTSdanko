import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileCheck,
  FileUp,
  Hash,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react';
import api from '../lib/api';

type InvoiceLegalStatus =
  | 'SUPPLIER_DRAFT'
  | 'WAITING_PAYMENT'
  | 'WAITING_SIGNED_INVOICE'
  | 'SIGNED_VALID'
  | 'CANCELLED_REPLACED';

interface InvoiceMetadata {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierTaxCode: string;
  companyId: string;
  totalAmount: number;
  fileUrl?: string;
  note?: string;
  invoiceLegalStatus: InvoiceLegalStatus;
  expectedSignedDate?: string;
  followUpOwner?: string;
  reminderAfter3Days: boolean;
  reminderBeforeDueDate: boolean;
}

interface InvoiceLineItem {
  id: string;
  invoiceItemName: string;
  toolName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  managementType: 'QUANTITY' | 'INDIVIDUAL';
  note?: string;
}

const CATEGORIES = [
  '01 Nội thất',
  '02 Decor / Trang trí',
  '03 Bất động sản - Tòa nhà',
  '04 Marketing / POSM',
  '05 Branding',
  '06 Event Equipment',
  '07 F&B / Tiệc',
  '08 Dịch vụ vận hành',
  '09 IT & Digital',
  '10 Media Production',
  '11 Kho vận',
  '12 Costume / Đạo cụ',
  '13 Công cụ kỹ thuật',
  '14 Safety / PCCC',
  '15 Vật tư tiêu hao',
  '16 Merchandise',
  '99 Khác'
];

const INVOICE_STATUS_OPTIONS: Array<{ value: InvoiceLegalStatus; label: string; badge: string }> = [
  { value: 'SUPPLIER_DRAFT', label: 'Nháp NCC gửi', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'WAITING_PAYMENT', label: 'Chờ thanh toán', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'WAITING_SIGNED_INVOICE', label: 'Chờ NCC xuất hóa đơn', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'SIGNED_VALID', label: 'Đã ký hợp lệ', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'CANCELLED_REPLACED', label: 'Bị hủy / thay thế', badge: 'bg-rose-50 text-rose-700 border-rose-200' }
];

export const ImportToolsInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [lines, setLines] = useState<InvoiceLineItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [expandedLineIds, setExpandedLineIds] = useState<string[]>([]);

  const [metadata, setMetadata] = useState<InvoiceMetadata>({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierTaxCode: '',
    companyId: '',
    totalAmount: 0,
    note: '',
    invoiceLegalStatus: 'SUPPLIER_DRAFT',
    expectedSignedDate: '',
    followUpOwner: '',
    reminderAfter3Days: true,
    reminderBeforeDueDate: true
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/assets/companies/active');
        setCompanies(res.data);
        if (res.data.length > 0) {
          setMetadata(prev => ({ ...prev, companyId: res.data[0].id.toString() }));
        }
      } catch {
        toast.error('Không thể tải danh sách công ty thành viên.');
      }
    };
    fetchCompanies();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await api.post('/tools/import-invoice/parse', formData);
      const parsed = res.data;

      setMetadata(prev => ({
        ...prev,
        invoiceNo: parsed.invoice.invoiceNo || prev.invoiceNo,
        invoiceDate: parsed.invoice.invoiceDate || prev.invoiceDate,
        supplierName: parsed.invoice.supplierName || prev.supplierName,
        supplierTaxCode: parsed.invoice.supplierTaxCode || prev.supplierTaxCode,
        totalAmount: parsed.invoice.totalAmount || prev.totalAmount,
        fileUrl: parsed.invoice.fileUrl
      }));

      const mappedLines = parsed.lines.map((line: any, index: number) => {
        const cat = line.suggestedCategory.category;
        const rawName = String(line.rawItemName || '').toLowerCase();
        const isDecor = cat.includes('Decor') || rawName.includes('decor') || rawName.includes('trụ') || rawName.includes('bình');

        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          invoiceItemName: line.rawItemName,
          toolName: line.suggestedToolName,
          category: cat,
          quantity: line.quantity,
          unit: line.unit || 'Chiếc',
          unitPrice: line.unitPrice,
          vatRate: line.vatRate ?? 8,
          managementType: isDecor ? 'QUANTITY' : 'INDIVIDUAL',
          note: line.note || ''
        } satisfies InvoiceLineItem;
      });

      setLines(mappedLines);
      setWarnings(parsed.warnings || []);
      toast.success('Bóc tách thông tin hóa đơn thành công.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi bóc tách hóa đơn.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        invoiceItemName: '',
        toolName: '',
        category: CATEGORIES[0],
        quantity: 1,
        unit: 'Chiếc',
        unitPrice: 0,
        vatRate: 8,
        managementType: 'INDIVIDUAL',
        note: ''
      }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const handleLineChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      const overrides: Partial<InvoiceLineItem> = field === 'category'
        ? { managementType: value.includes('Decor') ? 'QUANTITY' : 'INDIVIDUAL' }
        : {};
      return { ...line, [field]: value, ...overrides };
    }));
  };

  const toggleLineExpanded = (id: string) => {
    setExpandedLineIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!metadata.invoiceNo) return toast.warn('Vui lòng nhập Số hóa đơn.');
    if (!metadata.invoiceDate) return toast.warn('Vui lòng nhập Ngày hóa đơn.');
    if (!metadata.supplierName) return toast.warn('Vui lòng nhập Nhà cung cấp.');
    if (!metadata.companyId) return toast.warn('Vui lòng chọn Công ty nhận hóa đơn.');
    if (lines.length === 0) return toast.warn('Danh sách CCDC trống. Vui lòng thêm ít nhất 1 dòng.');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.invoiceItemName) return toast.warn(`Dòng ${i + 1} thiếu Tên hàng mục gốc.`);
      if (!line.toolName) return toast.warn(`Dòng ${i + 1} thiếu Tên CCDC chuẩn.`);
      if (line.quantity <= 0) return toast.warn(`Dòng ${i + 1} có Số lượng phải lớn hơn 0.`);
      if (line.unitPrice < 0) return toast.warn(`Dòng ${i + 1} có Đơn giá không hợp lệ.`);
    }

    setIsProcessing(true);
    try {
      const payload = {
        invoice: {
          ...metadata,
          companyId: parseInt(metadata.companyId, 10),
          totalAmount: lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
        },
        lines: lines.map(({ id, ...rest }) => rest)
      };

      await api.post('/tools/import-invoice/post', payload);
      toast.success(metadata.invoiceLegalStatus === 'SIGNED_VALID' ? 'Tạo CCDC thành công.' : 'Đã tạo CCDC tạm và lưu trạng thái chờ hóa đơn ký.');
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu chứng từ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const calculatedVat = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * ((line.vatRate || 0) / 100), 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const selectedStatus = INVOICE_STATUS_OPTIONS.find(status => status.value === metadata.invoiceLegalStatus) || INVOICE_STATUS_OPTIONS[0];

  return (
    <div className="max-w-[1800px] mx-auto space-y-5 pb-32 px-4 xl:px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/tools')}
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs mb-2 border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Nhập CCDC từ hóa đơn / chứng từ</h1>
        </div>
        <label className="relative flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:border-primary-400 hover:text-primary-700 cursor-pointer shadow-sm">
          <input type="file" accept=".xml,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
          <FileUp className="h-4 w-4" />
          {file ? file.name : 'Tải file hóa đơn'}
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Cảnh báo bóc tách hóa đơn:</span>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {warnings.map((warning, idx) => <li key={idx}>{warning}</li>)}
            </ul>
          </div>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary-600" /> Thông tin chứng từ
          </h2>
          <span className={`inline-flex w-fit items-center px-3 py-1 rounded-full border text-xs font-black ${selectedStatus.badge}`}>
            {selectedStatus.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 p-5">
          <div className="xl:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Building className="h-3.5 w-3.5" /> Công ty
            </label>
            <select value={metadata.companyId} onChange={e => setMetadata({ ...metadata, companyId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold">
              {companies.map(company => <option key={company.id} value={company.id}>{company.code} - {company.name}</option>)}
            </select>
          </div>

          <div className="xl:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</label>
            <input type="text" value={metadata.supplierName} onChange={e => setMetadata({ ...metadata, supplierName: e.target.value })} placeholder="ANPU DECOR" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" /> Số HĐ
            </label>
            <input type="text" value={metadata.invoiceNo} onChange={e => setMetadata({ ...metadata, invoiceNo: e.target.value })} placeholder="00000171" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Ngày HĐ
            </label>
            <input type="date" value={metadata.invoiceDate} onChange={e => setMetadata({ ...metadata, invoiceDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MST NCC</label>
            <input type="text" value={metadata.supplierTaxCode} onChange={e => setMetadata({ ...metadata, supplierTaxCode: e.target.value })} placeholder="3702070613" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hóa đơn</label>
            <select value={metadata.invoiceLegalStatus} onChange={e => setMetadata({ ...metadata, invoiceLegalStatus: e.target.value as InvoiceLegalStatus })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold">
              {INVOICE_STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày dự kiến ký</label>
            <input type="date" value={metadata.expectedSignedDate} onChange={e => setMetadata({ ...metadata, expectedSignedDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="xl:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ trách theo dõi</label>
            <input type="text" value={metadata.followUpOwner} onChange={e => setMetadata({ ...metadata, followUpOwner: e.target.value })} placeholder="Chọn / nhập nhân sự phụ trách" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>

          <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={metadata.reminderAfter3Days} onChange={e => setMetadata({ ...metadata, reminderAfter3Days: e.target.checked })} />
              <Bell className="h-3.5 w-3.5" /> Nhắc sau 3 ngày
            </label>
            <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={metadata.reminderBeforeDueDate} onChange={e => setMetadata({ ...metadata, reminderBeforeDueDate: e.target.checked })} />
              <Bell className="h-3.5 w-3.5" /> Nhắc trước hạn 1 ngày
            </label>
          </div>

          {metadata.invoiceLegalStatus !== 'SIGNED_VALID' && (
            <div className="md:col-span-2 xl:col-span-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>Chứng từ đang dùng hóa đơn nháp/chờ ký.</strong> CCDC có thể ghi nhận tạm, nhưng hồ sơ chưa đủ điều kiện hạch toán chính thức cho tới khi upload hóa đơn điện tử đã ký.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Danh sách hàng hóa CCDC</h2>
            <p className="text-xs text-slate-500 mt-1">Tên hàng hóa gốc dùng ô nhiều dòng và có thể mở chi tiết từng dòng.</p>
          </div>
          <button onClick={handleAddLine} className="flex items-center justify-center gap-1 px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer">
            <Plus className="h-4 w-4" /> Thêm dòng
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1280px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3 border-b w-[34%]">Tên hàng hóa từ hóa đơn</th>
                <th className="px-4 py-3 border-b w-[20%]">Tên chuẩn CCDC</th>
                <th className="px-4 py-3 border-b w-[16%]">Nhóm</th>
                <th className="px-3 py-3 border-b w-20">SL</th>
                <th className="px-3 py-3 border-b w-24">ĐVT</th>
                <th className="px-3 py-3 border-b w-32">Đơn giá</th>
                <th className="px-3 py-3 border-b w-20">VAT</th>
                <th className="px-3 py-3 border-b w-36">Thành tiền</th>
                <th className="px-3 py-3 border-b w-36">QL</th>
                <th className="px-3 py-3 border-b w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400 italic">Chưa có dữ liệu. Tải file hóa đơn hoặc thêm dòng thủ công.</td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const isExpanded = expandedLineIds.includes(line.id);
                  const amount = line.quantity * line.unitPrice;

                  return (
                    <React.Fragment key={line.id}>
                      <tr className="align-top hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <textarea value={line.invoiceItemName} onChange={e => handleLineChange(line.id, 'invoiceItemName', e.target.value)} placeholder="Tên hàng hóa gốc trên hóa đơn..." rows={4} className="w-full min-h-[92px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-semibold leading-5 resize-y" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" value={line.toolName} onChange={e => handleLineChange(line.id, 'toolName', e.target.value)} placeholder="Tên CCDC chuẩn" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold" />
                          <div className="mt-2 flex items-start gap-1.5 text-[10px] text-primary-700 bg-primary-50 border border-primary-100 rounded-lg p-2">
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            <span>AI gợi ý: {line.toolName || 'Tên chuẩn'}, nhóm {line.category}, mã tự sinh sau khi lưu.</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select value={line.category} onChange={e => handleLineChange(line.id, 'category', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold">
                            {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={line.quantity} onChange={e => handleLineChange(line.id, 'quantity', parseInt(e.target.value, 10) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-center" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="text" value={line.unit} onChange={e => handleLineChange(line.id, 'unit', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={line.unitPrice} onChange={e => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold" />
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={line.vatRate} onChange={e => handleLineChange(line.id, 'vatRate', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-center" />
                        </td>
                        <td className="px-3 py-3">
                          <span className="block text-sm font-black text-slate-800 pt-2">{amount.toLocaleString('vi-VN')} đ</span>
                          <span className="text-[10px] text-slate-400">VAT {(amount * ((line.vatRate || 0) / 100)).toLocaleString('vi-VN')} đ</span>
                        </td>
                        <td className="px-3 py-3">
                          <select value={line.managementType} onChange={e => handleLineChange(line.id, 'managementType', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800">
                            <option value="QUANTITY">Quản lý số lượng</option>
                            <option value="INDIVIDUAL">Quản lý từng món</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => toggleLineExpanded(line.id)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-primary-700 hover:border-primary-200 transition-colors cursor-pointer" title="Chi tiết">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <button onClick={() => handleRemoveLine(line.id)} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer" title="Xóa dòng">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đầy đủ hóa đơn</label>
                                <textarea value={line.invoiceItemName} onChange={e => handleLineChange(line.id, 'invoiceItemName', e.target.value)} rows={5} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-semibold leading-5" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông số / ghi chú</label>
                                <textarea value={line.note || ''} onChange={e => handleLineChange(line.id, 'note', e.target.value)} placeholder="KT 28x18x29, chất liệu, màu sắc..." rows={5} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-semibold leading-5" />
                              </div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="bg-white border border-slate-200 rounded-lg p-3"><span className="text-[10px] text-slate-400 uppercase font-black block">SL</span><strong>{line.quantity}</strong></div>
                                  <div className="bg-white border border-slate-200 rounded-lg p-3"><span className="text-[10px] text-slate-400 uppercase font-black block">ĐVT</span><strong>{line.unit}</strong></div>
                                  <div className="bg-white border border-slate-200 rounded-lg p-3"><span className="text-[10px] text-slate-400 uppercase font-black block">Giá</span><strong>{line.unitPrice.toLocaleString('vi-VN')}</strong></div>
                                </div>
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-500 cursor-pointer">
                                  <Upload className="h-4 w-4" /> Upload ảnh / tài liệu dòng {idx + 1}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fixed left-0 right-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
        <div className="max-w-[1800px] mx-auto px-4 xl:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 lg:gap-6">
            <div><span className="text-[10px] font-black text-slate-400 uppercase block">Loại CCDC</span><strong className="text-sm text-slate-900">{lines.length.toLocaleString('vi-VN')} dòng</strong></div>
            <div><span className="text-[10px] font-black text-slate-400 uppercase block">Số lượng</span><strong className="text-sm text-slate-900">{totalQuantity.toLocaleString('vi-VN')} chiếc</strong></div>
            <div><span className="text-[10px] font-black text-slate-400 uppercase block">Giá trị</span><strong className="text-sm text-slate-900">{calculatedTotal.toLocaleString('vi-VN')} đ</strong></div>
            <div><span className="text-[10px] font-black text-slate-400 uppercase block">VAT</span><strong className="text-sm text-slate-900">{calculatedVat.toLocaleString('vi-VN')} đ</strong></div>
            <div><span className="text-[10px] font-black text-slate-400 uppercase block">Tổng</span><strong className="text-sm text-primary-700 flex items-center gap-1"><DollarSign className="h-4 w-4" /> {(calculatedTotal + calculatedVat).toLocaleString('vi-VN')} đ</strong></div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button onClick={() => navigate('/tools')} className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-50 bg-white transition-all cursor-pointer">Hủy bỏ</button>
            <button onClick={handleSubmit} disabled={isProcessing} className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-sm border-0 cursor-pointer disabled:opacity-50">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Lưu nháp</>}
            </button>
            <button onClick={handleSubmit} disabled={isProcessing} className="flex items-center gap-1.5 px-6 py-2 bg-primary-600 hover:bg-primary-750 text-white font-bold rounded-lg text-sm border-0 cursor-pointer shadow-lg shadow-primary-200 disabled:opacity-50">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Tạo CCDC</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
