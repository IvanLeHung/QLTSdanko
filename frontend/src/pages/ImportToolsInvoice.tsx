import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  FileUp, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileCheck, 
  Calendar, 
  Building,
  Hash,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvoiceMetadata {
  invoiceNo: string;
  invoiceDate: string;
  supplierName: string;
  supplierTaxCode: string;
  companyId: string;
  totalAmount: number;
  fileUrl?: string;
  note?: string;
}

interface InvoiceLineItem {
  id: string; // client-side unique id
  invoiceItemName: string;
  toolName: string;
  category: string;
  quantity: number;
  unitPrice: number;
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

export const ImportToolsInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Invoice states
  const [metadata, setMetadata] = useState<InvoiceMetadata>({
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierTaxCode: '',
    companyId: '',
    totalAmount: 0,
    note: ''
  });

  const [lines, setLines] = useState<InvoiceLineItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Load companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/assets/companies/active');
        setCompanies(res.data);
        if (res.data.length > 0) {
          setMetadata(prev => ({ ...prev, companyId: res.data[0].id.toString() }));
        }
      } catch (err) {
        toast.error("Không thể tải danh sách công ty thành viên.");
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

      // Map parsed metadata
      setMetadata(prev => ({
        ...prev,
        invoiceNo: parsed.invoice.invoiceNo || prev.invoiceNo,
        invoiceDate: parsed.invoice.invoiceDate || prev.invoiceDate,
        supplierName: parsed.invoice.supplierName || prev.supplierName,
        supplierTaxCode: parsed.invoice.supplierTaxCode || prev.supplierTaxCode,
        totalAmount: parsed.invoice.totalAmount || prev.totalAmount,
        fileUrl: parsed.invoice.fileUrl
      }));

      // Map parsed lines
      const mappedLines = parsed.lines.map((line: any, index: number) => {
        // Smart default for management type based on category or item name
        const cat = line.suggestedCategory.category;
        const isDecor = cat.includes('Decor') || line.rawItemName.toLowerCase().includes('decor') || line.rawItemName.toLowerCase().includes('trụ') || line.rawItemName.toLowerCase().includes('bình');
        const defaultMgmtType = isDecor ? 'QUANTITY' : 'INDIVIDUAL';

        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          invoiceItemName: line.rawItemName,
          toolName: line.suggestedToolName,
          category: cat,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          managementType: defaultMgmtType as 'QUANTITY' | 'INDIVIDUAL',
          note: line.note || ''
        };
      });

      setLines(mappedLines);
      setWarnings(parsed.warnings || []);
      toast.success("Bóc tách thông tin hóa đơn thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi bóc tách hóa đơn.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLine = () => {
    const newLine: InvoiceLineItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      invoiceItemName: '',
      toolName: '',
      category: CATEGORIES[0],
      quantity: 1,
      unitPrice: 0,
      managementType: 'INDIVIDUAL',
      note: ''
    };
    setLines([...lines, newLine]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleLineChange = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      // Smart default if category changes to Decor / Trang trí
      let overrides = {};
      if (field === 'category') {
        const isDecor = value.includes('Decor');
        overrides = { managementType: isDecor ? 'QUANTITY' : 'INDIVIDUAL' };
      }

      return { ...line, [field]: value, ...overrides };
    }));
  };

  const handleSubmit = async () => {
    if (!metadata.invoiceNo) return toast.warn("Vui lòng nhập Số hóa đơn.");
    if (!metadata.invoiceDate) return toast.warn("Vui lòng nhập Ngày hóa đơn.");
    if (!metadata.supplierName) return toast.warn("Vui lòng nhập Nhà cung cấp.");
    if (!metadata.companyId) return toast.warn("Vui lòng chọn Công ty nhận hóa đơn.");
    if (lines.length === 0) return toast.warn("Danh sách CCDC trống. Vui lòng thêm ít nhất 1 dòng.");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.invoiceItemName) return toast.warn(`Dòng ${i + 1} thiếu Tên hạng mục gốc.`);
      if (!line.toolName) return toast.warn(`Dòng ${i + 1} thiếu Tên CCDC chuẩn.`);
      if (line.quantity <= 0) return toast.warn(`Dòng ${i + 1} có Số lượng phải lớn hơn 0.`);
      if (line.unitPrice < 0) return toast.warn(`Dòng ${i + 1} có Đơn giá không hợp lệ.`);
    }

    setIsProcessing(true);
    try {
      const payload = {
        invoice: {
          ...metadata,
          companyId: parseInt(metadata.companyId),
          totalAmount: lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0)
        },
        lines: lines.map(({ id, ...rest }) => rest)
      };

      await api.post('/tools/import-invoice/post', payload);
      toast.success("Tạo phiếu nhập và sinh mã CCDC thành công!");
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi lưu chứng từ.");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculatedTotal = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/tools')} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs mb-2 border-0 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nhập CCDC từ hóa đơn / chứng từ mua hàng</h1>
          <p className="text-slate-500 mt-1">Hỗ trợ bóc tách hóa đơn điện tử tự động (XML, Excel) để sinh hàng loạt CCDC và khớp lượng thực tế.</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-700 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Cảnh báo bóc tách hóa đơn:</span>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Invoice Metadata & Upload */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center border-b border-slate-100 pb-3">
              <FileCheck className="h-5 w-5 mr-2 text-primary-600" /> THÔNG TIN CHỨNG TỪ
            </h3>

            {/* Upload area */}
            <div className="relative group border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-primary-400 transition-all text-center">
              <input 
                type="file" 
                accept=".xml,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2 group-hover:text-primary-500 transition-colors" />
              <span className="text-xs font-bold text-slate-500 block">
                {file ? file.name : "Tải lên Hóa đơn VAT (XML, Excel, PDF, Ảnh)"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Tự động đọc nội dung nếu là XML hoặc Excel template</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                  <Building className="h-3.5 w-3.5 mr-1" /> Công ty nhận hóa đơn
                </label>
                <select
                  value={metadata.companyId}
                  onChange={e => setMetadata({ ...metadata, companyId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
                >
                  {companies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhà cung cấp</label>
                <input 
                  type="text"
                  value={metadata.supplierName}
                  onChange={e => setMetadata({ ...metadata, supplierName: e.target.value })}
                  placeholder="Nhập tên nhà cung cấp..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                    <Hash className="h-3.5 w-3.5 mr-1" /> Số hóa đơn
                  </label>
                  <input 
                    type="text"
                    value={metadata.invoiceNo}
                    onChange={e => setMetadata({ ...metadata, invoiceNo: e.target.value })}
                    placeholder="VD: 00000171"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Ngày hóa đơn
                  </label>
                  <input 
                    type="date"
                    value={metadata.invoiceDate}
                    onChange={e => setMetadata({ ...metadata, invoiceDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã số thuế NCC</label>
                <input 
                  type="text"
                  value={metadata.supplierTaxCode}
                  onChange={e => setMetadata({ ...metadata, supplierTaxCode: e.target.value })}
                  placeholder="VD: 3702070613"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tổng tiền hóa đơn</span>
                <span className="text-2xl font-black block flex items-center text-primary-400">
                  <DollarSign className="h-6 w-6 mr-0.5" /> {calculatedTotal.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">(Tự động tính dựa theo các dòng hàng hóa ở bên phải)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Items table list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">DANH SÁCH CÔNG CỤ DỤNG CỤ (CCDC)</h3>
              <button 
                onClick={handleAddLine}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Thêm dòng
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3 border-b">Tên hàng gốc (Hóa đơn)</th>
                    <th className="p-3 border-b">Tên CCDC chuẩn</th>
                    <th className="p-3 border-b">Nhóm CCDC</th>
                    <th className="p-3 border-b w-16">SL</th>
                    <th className="p-3 border-b w-28">Đơn giá</th>
                    <th className="p-3 border-b w-32">Loại quản lý</th>
                    <th className="p-3 border-b w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        Bảng chưa có dữ liệu. Vui lòng tải file hóa đơn lên hoặc nhấn nút [+ Thêm dòng].
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 border-b">
                          <input 
                            type="text"
                            value={line.invoiceItemName}
                            onChange={e => handleLineChange(line.id, 'invoiceItemName', e.target.value)}
                            placeholder="Tên trên hóa đơn..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 border-b">
                          <input 
                            type="text"
                            value={line.toolName}
                            onChange={e => handleLineChange(line.id, 'toolName', e.target.value)}
                            placeholder="Tên CCDC..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 border-b">
                          <select
                            value={line.category}
                            onChange={e => handleLineChange(line.id, 'category', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-3 border-b">
                          <input 
                            type="number"
                            value={line.quantity}
                            onChange={e => handleLineChange(line.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-center"
                          />
                        </td>
                        <td className="p-3 border-b">
                          <input 
                            type="number"
                            value={line.unitPrice}
                            onChange={e => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                          />
                        </td>
                        <td className="p-3 border-b">
                          <select
                            value={line.managementType}
                            onChange={e => handleLineChange(line.id, 'managementType', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800"
                          >
                            <option value="QUANTITY">🟢 Quản lý số lượng</option>
                            <option value="INDIVIDUAL">🔵 Quản lý từng món</option>
                          </select>
                        </td>
                        <td className="p-3 border-b">
                          <button 
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1.5 bg-transparent border-0 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button 
                onClick={() => navigate('/tools')}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-sm hover:bg-slate-50 bg-white transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-8 py-2.5 bg-primary-600 hover:bg-primary-750 text-white font-bold rounded-xl text-sm border-0 cursor-pointer shadow-lg shadow-primary-200 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Tạo CCDC</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
