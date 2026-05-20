import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  Tag, 
  Printer, 
  Settings, 
  Eye, 
  Download, 
  AlertCircle,
  QrCode,
  ScanLine as BarcodeIcon,
  Layout as LayoutIcon,
  CheckCircle2,
  ChevronDown,
  Info,
  Type,
  Maximize,
  Grid,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
// @ts-ignore
import QRCodeComponent from 'react-qr-code';
// @ts-ignore
import BarcodeComponent from 'react-barcode';
import api from '../lib/api';
import { PdfPreviewModal } from './forms/PdfPreviewModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BaseModal } from './BaseModal';

const QRCode = (QRCodeComponent as any).default || QRCodeComponent;
const Barcode = (BarcodeComponent as any).default || BarcodeComponent;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssetLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: any[];
}

export const AssetLabelPrintModal: React.FC<AssetLabelPrintModalProps> = ({ isOpen, onClose, assets }) => {
  const [config, setConfig] = useState({
    codeType: 'QR' as 'QR' | 'BAR',
    size: '61x40mm',
    template: 'FULL',
    copies: 1,
    fontSize: 'NORMAL',
    fields: {
      assetCode: true,
      assetName: true,
      serial: true,
      company: true,
      purchaseDate: true,
      location: true,
      logo: true
    },
    advanced: {
      marginTop: 0,
      marginLeft: 0,
      spacingX: 2,
      spacingY: 2,
      columns: 3,
      rows: 10,
      qrPosition: 'RIGHT' as 'LEFT' | 'RIGHT'
    }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'SINGLE' | 'A4'>('SINGLE');
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [labelOverrides, setLabelOverrides] = useState<Record<string, any>>({});
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Map config.size to physical dimensions for @page
  const getLabelDimensions = useCallback((size: string) => {
    switch (size) {
      case '61x40mm': return { w: '61mm', h: '40mm', pw: 61, ph: 40 };
      case '60x40mm': return { w: '60mm', h: '40mm', pw: 60, ph: 40 };
      case '40x25mm': return { w: '40mm', h: '25mm', pw: 40, ph: 25 };
      case '30x20mm': return { w: '30mm', h: '20mm', pw: 30, ph: 20 };
      case 'A4':      return { w: '210mm', h: '297mm', pw: 210, ph: 297 };
      default:        return { w: '50mm', h: '30mm', pw: 50, ph: 30 };
    }
  }, []);

  // Opens a dedicated print window containing ONLY the label content
  // with proper @page sizing so the browser print dialog shows the correct label dimensions.
  const handlePrint = useCallback(() => {
    if (assets.length === 0) {
      toast.error("Không có tài sản nào được chọn để in.");
      return;
    }
    const printableAssets = assets.filter(a => {
      const code = String(a?.asset_code || a?.assetCode || a?.code || '');
      return code.trim().length > 0;
    });
    if (printableAssets.length === 0) {
      toast.error("Tất cả tài sản đã chọn đều thiếu mã tài sản. Không thể in tem.");
      return;
    }

    // Wait for React to render #print-area, then grab its rendered HTML (includes SVG QR/Barcodes)
    requestAnimationFrame(() => {
      const printArea = printAreaRef.current;
      if (!printArea) {
        toast.error("Không tìm thấy vùng in. Vui lòng thử lại.");
        return;
      }

      const dims = getLabelDimensions(config.size);
      const isA4 = config.size === 'A4';
      const labelHTML = printArea.innerHTML;

      const printWindow = window.open('', '_blank', 'width=600,height=400');
      if (!printWindow) {
        toast.error("Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup và thử lại.");
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>In tem tài sản</title>
  <style>
    @page {
      size: ${dims.w} ${dims.h};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${dims.w};
      height: ${dims.h};
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* ---- Single label layout ---- */
    .asset-label {
      width: ${isA4 ? 'auto' : dims.w};
      height: ${isA4 ? 'auto' : dims.h};
      padding: ${isA4 ? '2mm' : '2.5mm 3mm'};
      background: #fff;
      color: #000;
      overflow: hidden;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .asset-label:last-child {
      page-break-after: auto;
    }
    
    /* ---- Custom 61x40mm printer specific layout ---- */
    .asset-label.custom-61x40 {
      width: 59mm !important;
      height: 40mm !important;
      margin-left: 1mm !important;
      margin-right: 1mm !important;
      border: 0.3mm solid #000 !important;
      border-radius: 3.2mm !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: row !important;
      justify-content: flex-start !important;
      align-items: stretch !important;
      padding: 0 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      page-break-after: always;
    }
    .asset-label.custom-61x40:last-child {
      page-break-after: auto;
    }
    .asset-label.custom-61x40 .label-left-col {
      width: 21mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 1mm !important;
      border-right: 0.3mm solid #000 !important;
      background: #fff !important;
      flex-shrink: 0 !important;
    }
    .asset-label.custom-61x40 .label-left-col svg {
      width: 18mm !important;
      height: 18mm !important;
      display: block !important;
    }
    .asset-label.custom-61x40 .label-right-col {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      background: #fff !important;
    }
    .asset-label.custom-61x40 .info-table {
      width: 100% !important;
      height: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    .asset-label.custom-61x40 .info-table tr {
      border-bottom: 0.3mm solid #000 !important;
    }
    .asset-label.custom-61x40 .info-table tr:last-child {
      border-bottom: none !important;
    }
    .asset-label.custom-61x40 .info-table td {
      padding: 0.4mm 1mm !important;
      font-size: 5.5pt !important;
      font-weight: bold !important;
      color: #000 !important;
      line-height: 1.1 !important;
      word-break: break-word !important;
      vertical-align: middle !important;
    }
    .asset-label.custom-61x40 .info-table td.col-label {
      width: 16mm !important;
      border-right: 0.3mm solid #000 !important;
      font-weight: bold !important;
      text-align: left !important;
    }
    .asset-label.custom-61x40 .info-table td.col-value {
      font-weight: normal !important;
      text-align: left !important;
    }
    /* ---- A4 grid layout ---- */
    .a4-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2mm;
      padding: 8mm;
      width: 210mm;
    }
    .a4-grid .asset-label {
      height: auto;
      width: auto;
      border: 0.3mm solid #ddd;
      page-break-after: auto;
    }
    /* ---- Label internals ---- */
    .label-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .label-top.qr-left {
      flex-direction: row-reverse;
    }
    .label-info {
      flex: 1;
      padding-right: 2mm;
      min-width: 0;
    }
    .company-name {
      font-size: 6pt;
      font-weight: 900;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1;
      margin-bottom: 0.5mm;
    }
    .asset-code-text {
      font-size: 5.5pt;
      font-weight: 900;
      color: #1e293b;
      font-family: 'Courier New', monospace;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    .asset-name-text {
      font-size: 7pt;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.2;
      margin-top: 0.5mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .qr-box {
      flex-shrink: 0;
      width: ${isA4 ? '12mm' : '14mm'};
      height: ${isA4 ? '12mm' : '14mm'};
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    .qr-box svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .barcode-box {
      flex-shrink: 0;
      max-width: 18mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .barcode-box svg {
      width: 100% !important;
      height: ${isA4 ? '8mm' : '10mm'} !important;
      display: block;
    }
    .barcode-text {
      font-size: 4.5pt;
      font-family: 'Courier New', monospace;
      font-weight: 900;
      color: #334155;
      margin-top: 0.3mm;
      letter-spacing: -0.3px;
    }
    /* ---- Bottom info section ---- */
    .label-bottom {
      border-top: 0.3mm solid #e2e8f0;
      padding-top: 1mm;
      margin-top: 1mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1mm 2mm;
    }
    .info-item {}
    .info-label {
      font-size: 4pt;
      font-weight: 900;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .info-value {
      font-size: 5.5pt;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  ${labelHTML}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 300);
    };
  </script>
</body>
</html>`);
      printWindow.document.close();
    });
  }, [assets, config, getLabelDimensions]);

  if (!isOpen) return null;

  const missingCodes = (assets || []).filter(a => !(a.asset_code || a.assetCode || a.code));
  const nonTaggableAssets = assets.filter(a => ['DISPOSED', 'LOST'].includes(a.status));

  const handleAction = async (type: 'PREVIEW' | 'PRINT' | 'DOWNLOAD') => {
    if (assets.length === 0) {
      toast.error("Không có tài sản nào được chọn để in.");
      return;
    }
    
    if (missingCodes.length === assets.length) {
      toast.error("Tất cả tài sản đã chọn đều thiếu mã tài sản. Không thể tạo tem.");
      return;
    }

    if (type === 'PREVIEW') {
      setIsPreviewOpen(true);
      return;
    }

    if (type === 'DOWNLOAD') {
      toast.info("Chức năng tải PDF đang được phát triển.");
      return;
    }
  };

    const renderLabel = (asset: any) => {
      // Standardize asset code mapping
      const overridden = labelOverrides[asset.id] || {};
      const displayAsset = { ...asset, ...overridden };
      
      const codeValue = String(displayAsset?.asset_code || displayAsset?.assetCode || displayAsset?.code || '');
      const hasValidCode = codeValue.trim().length > 0;

      if (config.size === '61x40mm') {
        return (
          <div className="bg-white border border-slate-900 overflow-hidden flex flex-row items-stretch select-none mx-auto w-[286px] h-[194px] rounded-[15px] shadow-lg font-sans">
            <div className="w-[100px] border-r border-slate-900 flex items-center justify-center p-2 bg-white shrink-0">
              {hasValidCode ? (
                <div className="p-1 bg-white">
                  <QRCode 
                    value={codeValue} 
                    size={80} 
                    level="M"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center text-rose-300 bg-rose-50 rounded-lg p-2 text-center">
                  <AlertCircle className="h-4 w-4 mb-1" />
                  <span className="text-[7px] font-black uppercase leading-tight">Thiếu mã</span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between bg-white text-black min-w-0">
              <table className="w-full h-full border-collapse border-spacing-0 table-fixed">
                <tbody>
                  <tr className="border-b border-slate-900">
                    <td className="w-[65px] border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">Loại TS</td>
                    <td className="px-1 py-0.5 text-[8.5px] font-normal text-left align-middle truncate">{displayAsset?.level3Name || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">Phân loại TS</td>
                    <td className="px-1 py-0.5 text-[8.5px] font-normal text-left align-middle truncate">{displayAsset?.level4Name || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">Mã TS</td>
                    <td className="px-1 py-0.5 text-[8.5px] font-normal text-left align-middle truncate">{codeValue}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">S/N TS</td>
                    <td className="px-1 py-0.5 text-[8.5px] font-normal text-left align-middle truncate">{displayAsset?.serialNumber || displayAsset?.serial || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">Mô tả kỹ thuật</td>
                    <td className="px-1 py-0.5 text-[8px] font-normal text-left align-middle leading-[1.1] overflow-hidden break-words line-clamp-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {displayAsset?.assetName || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-slate-900 px-1 py-0.5 text-[8px] font-bold text-left align-middle whitespace-nowrap">Ngày mua</td>
                    <td className="px-1 py-0.5 text-[8.5px] font-normal text-left align-middle truncate">{displayAsset?.purchaseDate ? new Date(displayAsset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      return (
        <div className={cn(
          "bg-white shadow-lg border border-slate-200 p-4 rounded-lg space-y-3 relative overflow-hidden transition-all hover:shadow-xl mx-auto",
          config.size === '30x20mm' ? "w-[160px]" : "w-[240px]"
        )}>
          <div className={cn(
            "flex justify-between items-start",
            config.advanced.qrPosition === 'LEFT' ? "flex-row-reverse" : "flex-row"
          )}>
            <div className="space-y-1.5 flex-1 pr-3">
              {config.fields.company && <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">DANKO GROUP</p>}
              {config.fields.assetCode && (
                <p className="text-[10px] font-black text-slate-800 font-mono tracking-tighter">
                  {hasValidCode ? codeValue : 'CHƯA CÓ MÃ'}
                </p>
              )}
              {config.fields.assetName && <p className="text-[12px] font-black text-slate-900 leading-tight line-clamp-2 uppercase">{displayAsset?.assetName || 'Tài sản mẫu'}</p>}
            </div>
            <div className="bg-white p-1 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm shrink-0 min-w-[72px] min-h-[72px]">
              {hasValidCode ? (
                config.codeType === 'QR' ? (
                  <div className="p-1 bg-white">
                    <QRCode 
                      value={codeValue} 
                      size={64} 
                      level="M"
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-white overflow-hidden">
                    <Barcode 
                      value={codeValue}
                      width={1.2}
                      height={40}
                      displayValue={false}
                      margin={0}
                    />
                    <p className="text-[7px] font-mono font-black text-slate-700 mt-1 tracking-tighter">{codeValue}</p>
                  </div>
                )
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center text-rose-300 bg-rose-50 rounded-lg p-2 text-center">
                  <AlertCircle className="h-4 w-4 mb-1" />
                  <span className="text-[7px] font-black uppercase leading-tight">Thiếu mã</span>
                </div>
              )}
            </div>
          </div>
        
        {(config.fields.serial || config.fields.location || config.fields.purchaseDate) && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {config.fields.serial && (
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Serial Number</p>
                <p className="text-[9px] font-bold text-slate-800">{displayAsset?.serialNumber || displayAsset?.serial || '-'}</p>
              </div>
            )}
            {config.fields.location && (
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Vị trí</p>
                <p className="text-[9px] font-bold text-slate-800">{displayAsset?.locationName || displayAsset?.location || '-'}</p>
              </div>
            )}
            {config.fields.purchaseDate && (
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Ngày mua</p>
                <p className="text-[9px] font-bold text-slate-800">{displayAsset?.purchaseDate ? new Date(displayAsset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</p>
              </div>
            )}
          </div>
        )}

        <div className="absolute top-0 right-0 p-1 opacity-[0.03] pointer-events-none">
           <Tag className="h-16 w-16 rotate-12" />
        </div>
      </div>
    );
  };

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} size="wizard" noScroll>
        <div className="w-full h-full bg-white flex flex-col">
          {/* HEADER */}
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-50 p-3 rounded-2xl text-primary-600 border border-primary-100">
                <Printer className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">In tem tài sản</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center">
                  <Info className="h-3 w-3 mr-1.5 text-primary-500" /> Tạo mã định danh vật lý cho {(assets || []).length} tài sản
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
              <X className="h-6 w-6 text-slate-300 group-hover:text-slate-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row bg-slate-50/30">
            {/* CONFIG PANEL */}
            <div className="w-full md:w-[360px] p-8 border-r border-slate-100 space-y-10 custom-scrollbar overflow-y-auto">
              {/* ASSETS LIST */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Grid className="h-3.5 w-3.5 mr-2" /> Tài sản đã chọn
                  </span>
                  <span className="bg-primary-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary-100">{assets.length}</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-2 custom-scrollbar p-1">
                  {assets.map(asset => (
                    <div key={asset.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center space-x-3 shadow-sm hover:border-primary-100 transition-all group">
                      <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-primary-500 transition-colors">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1.5">{asset.assetName}</p>
                        <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">
                          {asset.asset_code || asset.assetCode || asset.code || 'CHƯA CÓ MÃ'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CORE CONFIG */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Loại mã & Khổ tem</label>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setConfig({...config, codeType: 'QR'})}
                      className={cn(
                        "flex-1 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all",
                        config.codeType === 'QR' ? "border-primary-600 bg-primary-50 text-primary-600 shadow-lg shadow-primary-50" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <QrCode className="h-4 w-4 mr-2" /> QR Code
                    </button>
                    <button 
                      onClick={() => setConfig({...config, codeType: 'BAR'})}
                      className={cn(
                        "flex-1 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all",
                        config.codeType === 'BAR' ? "border-primary-600 bg-primary-50 text-primary-600 shadow-lg shadow-primary-50" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <BarcodeIcon className="h-4 w-4 mr-2" /> Barcode
                    </button>
                  </div>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-700 focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all shadow-sm"
                    value={config.size}
                    onChange={(e) => setConfig({...config, size: e.target.value})}
                  >
                    <option value="61x40mm">Khổ tem: 61 x 40 mm (Máy in tem - Table)</option>
                    <option value="50x30mm">Khổ tem: 50 x 30 mm (Chuẩn)</option>
                    <option value="60x40mm">Khổ tem: 60 x 40 mm (Lớn)</option>
                    <option value="40x25mm">Khổ tem: 40 x 25 mm (Nhỏ)</option>
                    <option value="30x20mm">Khổ tem: 30 x 20 mm (Mini)</option>
                    <option value="A4">Khổ A4 (3 x 10 tem/trang)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">Nội dung hiển thị</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(config.fields).map(([key, val]) => (
                      <label key={key} className={cn(
                        "flex items-center space-x-2.5 p-3 rounded-2xl border transition-all cursor-pointer group",
                        val ? "bg-primary-50/50 border-primary-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                          val ? "bg-primary-600 border-primary-600" : "bg-white border-slate-200 group-hover:border-slate-400"
                        )}>
                          {val && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={val} 
                          onChange={() => setConfig({...config, fields: {...config.fields, [key]: !val}})}
                          className="hidden"
                        />
                        <span className={cn("text-[9px] font-black uppercase tracking-tight", val ? "text-primary-800" : "text-slate-400")}>
                          {key === 'assetCode' ? 'Mã TS' : key === 'assetName' ? 'Tên TS' : key === 'serial' ? 'Serial' : key === 'company' ? 'Công ty' : key === 'purchaseDate' ? 'Ngày mua' : key === 'location' ? 'Vị trí' : 'Logo'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ADVANCED TOGGLE */}
                <div className="pt-4 border-t border-slate-100">
                   <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full p-4 bg-slate-100/50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all"
                   >
                     <span className="flex items-center"><Settings className="mr-2 h-4 w-4" /> Cấu hình nâng cao</span>
                     <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                   </button>
                   
                   {showAdvanced && (
                     <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Cỡ chữ</label>
                             <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" value={config.fontSize} onChange={e => setConfig({...config, fontSize: e.target.value})}>
                               <option value="SMALL">Nhỏ</option>
                               <option value="NORMAL">Vừa</option>
                               <option value="LARGE">Lớn</option>
                             </select>
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Vị trí mã</label>
                             <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" value={config.advanced.qrPosition} onChange={e => setConfig({...config, advanced: {...config.advanced, qrPosition: e.target.value as any}})}>
                               <option value="LEFT">Bên trái</option>
                               <option value="RIGHT">Bên phải</option>
                             </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Lề trên (mm)</label>
                             <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" value={config.advanced.marginTop} onChange={e => setConfig({...config, advanced: {...config.advanced, marginTop: Number(e.target.value)}})} />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Lề trái (mm)</label>
                             <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold" value={config.advanced.marginLeft} onChange={e => setConfig({...config, advanced: {...config.advanced, marginLeft: Number(e.target.value)}})} />
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* PREVIEW PANEL */}
            <div className="flex-1 p-8 bg-white flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest flex items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <Eye className="mr-3 h-4 w-4 text-primary-500" /> Preview tem mẫu
                </h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button 
                    onClick={() => setPreviewMode('SINGLE')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      previewMode === 'SINGLE' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                   >
                     <Maximize className="h-3.5 w-3.5 inline-block mr-2" /> Một tem
                   </button>
                   <button 
                    onClick={() => setPreviewMode('A4')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      previewMode === 'A4' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                   >
                     <LayoutIcon className="h-3.5 w-3.5 inline-block mr-2" /> Layout A4
                   </button>
                </div>
              </div>

               <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[40px] overflow-hidden space-y-8">
                {assets.length === 0 ? (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-6 rounded-3xl shadow-xl inline-block border border-slate-100">
                      <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse mx-auto" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có tài sản để xem trước</p>
                  </div>
                ) : previewMode === 'SINGLE' ? (
                   <>
                     <div className="flex items-center space-x-6">
                        <button 
                          disabled={previewIndex === 0}
                          onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-200 disabled:opacity-20 transition-all shadow-sm"
                        >
                          <ChevronDown className="h-6 w-6 rotate-90" />
                        </button>
                        
                        <div className="animate-in fade-in zoom-in duration-300">
                          {renderLabel(assets[previewIndex])}
                        </div>

                        <button 
                          disabled={previewIndex >= assets.length - 1}
                          onClick={() => setPreviewIndex(prev => Math.min(assets.length - 1, prev + 1))}
                          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-200 disabled:opacity-20 transition-all shadow-sm"
                        >
                          <ChevronDown className="h-6 w-6 -rotate-90" />
                        </button>
                     </div>
                     <div className="px-6 py-2 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                       Tem {previewIndex + 1} / {assets.length}
                     </div>

                     {/* INLINE EDIT FORM */}
                     <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center space-x-2 text-primary-600 mb-2">
                           <Type className="h-4 w-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Sửa nội dung hiển thị (Chỉ in)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Tên tài sản</label>
                              <input 
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-primary-200 outline-none transition-all"
                                value={(labelOverrides[assets[previewIndex].id]?.assetName) ?? assets[previewIndex].assetName}
                                onChange={e => setLabelOverrides({...labelOverrides, [assets[previewIndex].id]: { ...labelOverrides[assets[previewIndex].id], assetName: e.target.value }})}
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Mã tài sản</label>
                              <input 
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-primary-200 outline-none transition-all"
                                value={(labelOverrides[assets[previewIndex].id]?.assetCode) ?? (assets[previewIndex].asset_code || assets[previewIndex].assetCode || assets[previewIndex].code)}
                                onChange={e => setLabelOverrides({...labelOverrides, [assets[previewIndex].id]: { ...labelOverrides[assets[previewIndex].id], assetCode: e.target.value }})}
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Serial</label>
                              <input 
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-primary-200 outline-none transition-all"
                                value={(labelOverrides[assets[previewIndex].id]?.serial) ?? (assets[previewIndex].serialNumber || assets[previewIndex].serial)}
                                onChange={e => setLabelOverrides({...labelOverrides, [assets[previewIndex].id]: { ...labelOverrides[assets[previewIndex].id], serial: e.target.value }})}
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Vị trí</label>
                              <input 
                                className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-primary-200 outline-none transition-all"
                                value={(labelOverrides[assets[previewIndex].id]?.location) ?? (assets[previewIndex].locationName || assets[previewIndex].location)}
                                onChange={e => setLabelOverrides({...labelOverrides, [assets[previewIndex].id]: { ...labelOverrides[assets[previewIndex].id], location: e.target.value }})}
                              />
                           </div>
                        </div>
                     </div>
                   </>
                ) : (
                  <div className="bg-white shadow-2xl border border-slate-200 w-full max-w-[340px] aspect-[1/1.41] p-6 grid grid-cols-3 gap-2 overflow-hidden relative">
                    {[...Array(15)].map((_, i) => (
                      <div key={i} className="border border-slate-100 aspect-[1.6/1] bg-slate-50/50 rounded-sm p-1.5 flex space-x-1 opacity-60">
                         <div className="flex-1 space-y-0.5">
                            <div className="h-1 w-6 bg-primary-100" />
                            <div className="h-1.5 w-10 bg-slate-200" />
                            <div className="h-1 w-8 bg-slate-200" />
                         </div>
                         <div className="w-3.5 h-3.5 bg-slate-200 rounded-[1px]" />
                      </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none" />
                  </div>
                )}
              </div>

              {/* ===== HIDDEN PRINT-ONLY AREA ===== */}
              {/* This div is invisible on screen; its innerHTML is extracted and sent to a dedicated print window */}
              <div id="print-area" ref={printAreaRef} className="print-area">
                {config.size === 'A4' ? (
                  <div className="a4-grid">
                    {assets
                      .filter(a => {
                        const overridden = labelOverrides[a.id] || {};
                        const codeValue = String(overridden.assetCode || a?.asset_code || a?.assetCode || a?.code || '');
                        return codeValue.trim().length > 0;
                      })
                      .flatMap(a => Array.from({ length: config.copies }, (_, i) => ({ ...a, _copyIdx: i })))
                      .map((asset: any, idx: number) => {
                        const overridden = labelOverrides[asset.id] || {};
                        const displayAsset = { ...asset, ...overridden };
                        const cv = String(displayAsset?.assetCode || displayAsset?.asset_code || displayAsset?.code || '');
                        
                        return (
                          <div key={`pl-${idx}`} className="asset-label">
                            <div className={`label-top${config.advanced.qrPosition === 'LEFT' ? ' qr-left' : ''}`}>
                              <div className="label-info">
                                {config.fields.company && <div className="company-name">DANKO GROUP</div>}
                                {config.fields.assetCode && <div className="asset-code-text">{cv}</div>}
                                {config.fields.assetName && <div className="asset-name-text">{displayAsset?.assetName || ''}</div>}
                              </div>
                              <div className={config.codeType === 'QR' ? 'qr-box' : 'barcode-box'}>
                                {config.codeType === 'QR' ? (
                                  <QRCode value={cv} size={64} level="M" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                ) : (
                                  <>
                                    <Barcode value={cv} width={1} height={32} displayValue={false} margin={0} />
                                    <span className="barcode-text">{cv}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {(config.fields.serial || config.fields.location || config.fields.purchaseDate) && (
                              <div className="label-bottom">
                                {config.fields.serial && (
                                  <div className="info-item">
                                    <div className="info-label">Serial Number</div>
                                    <div className="info-value">{displayAsset?.serial || displayAsset?.serialNumber || '-'}</div>
                                  </div>
                                )}
                                {config.fields.location && (
                                  <div className="info-item">
                                    <div className="info-label">Vị trí</div>
                                    <div className="info-value">{displayAsset?.location || displayAsset?.locationName || '-'}</div>
                                  </div>
                                )}
                                {config.fields.purchaseDate && (
                                  <div className="info-item">
                                    <div className="info-label">Ngày mua</div>
                                    <div className="info-value">{displayAsset?.purchaseDate ? new Date(displayAsset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  assets
                    .filter(a => {
                      const overridden = labelOverrides[a.id] || {};
                      const codeValue = String(overridden.assetCode || a?.asset_code || a?.assetCode || a?.code || '');
                      return codeValue.trim().length > 0;
                    })
                    .flatMap(a => Array.from({ length: config.copies }, (_, i) => ({ ...a, _copyIdx: i })))
                    .map((asset: any, idx: number) => {
                      const overridden = labelOverrides[asset.id] || {};
                      const displayAsset = { ...asset, ...overridden };
                      const cv = String(displayAsset?.assetCode || displayAsset?.asset_code || displayAsset?.code || '');

                      if (config.size === '61x40mm') {
                        return (
                          <div key={`pls-${idx}`} className="asset-label custom-61x40">
                            <div className="label-left-col">
                              <QRCode value={cv} size={72} level="M" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                            </div>
                            <div className="label-right-col">
                              <table className="info-table">
                                <tbody>
                                  <tr>
                                    <td className="col-label">Loại TS</td>
                                    <td className="col-value">{displayAsset?.level3Name || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td className="col-label">Phân loại TS</td>
                                    <td className="col-value">{displayAsset?.level4Name || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td className="col-label">Mã TS</td>
                                    <td className="col-value">{cv}</td>
                                  </tr>
                                  <tr>
                                    <td className="col-label">S/N TS</td>
                                    <td className="col-value">{displayAsset?.serialNumber || displayAsset?.serial || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td className="col-label">Mô tả kỹ thuật</td>
                                    <td className="col-value">{displayAsset?.assetName || '-'}</td>
                                  </tr>
                                  <tr>
                                    <td className="col-label">Ngày mua</td>
                                    <td className="col-value">{displayAsset?.purchaseDate ? new Date(displayAsset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={`pls-${idx}`} className="asset-label">
                          <div className={`label-top${config.advanced.qrPosition === 'LEFT' ? ' qr-left' : ''}`}>
                            <div className="label-info">
                              {config.fields.company && <div className="company-name">DANKO GROUP</div>}
                              {config.fields.assetCode && <div className="asset-code-text">{cv}</div>}
                              {config.fields.assetName && <div className="asset-name-text">{displayAsset?.assetName || ''}</div>}
                            </div>
                            <div className={config.codeType === 'QR' ? 'qr-box' : 'barcode-box'}>
                              {config.codeType === 'QR' ? (
                                <QRCode value={cv} size={64} level="M" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                              ) : (
                                <>
                                  <Barcode value={cv} width={1} height={32} displayValue={false} margin={0} />
                                  <span className="barcode-text">{cv}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {(config.fields.serial || config.fields.location || config.fields.purchaseDate) && (
                            <div className="label-bottom">
                              {config.fields.serial && (
                                <div className="info-item">
                                  <div className="info-label">Serial Number</div>
                                  <div className="info-value">{displayAsset?.serial || displayAsset?.serialNumber || '-'}</div>
                                </div>
                              )}
                              {config.fields.location && (
                                <div className="info-item">
                                  <div className="info-label">Vị trí</div>
                                  <div className="info-value">{displayAsset?.location || displayAsset?.locationName || '-'}</div>
                                </div>
                              )}
                              {config.fields.purchaseDate && (
                                <div className="info-item">
                                  <div className="info-label">Ngày mua</div>
                                  <div className="info-value">{displayAsset?.purchaseDate ? new Date(displayAsset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* MESSAGES & VALIDATION */}
              <div className="mt-8 space-y-3">
                {missingCodes.length > 0 && (
                  <div className="flex items-center space-x-3 text-rose-600 text-[10px] font-black bg-rose-50 p-4 rounded-[20px] border border-rose-100 animate-in shake duration-500">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{missingCodes.length} tài sản chưa có mã sẽ bị loại khỏi danh sách in. Vui lòng cấp mã trước.</span>
                  </div>
                )}
                {nonTaggableAssets.length > 0 && (
                  <div className="flex items-center space-x-3 text-amber-600 text-[10px] font-black bg-amber-50 p-4 rounded-[20px] border border-amber-100">
                    <Info className="h-5 w-5 shrink-0" />
                    <span>{nonTaggableAssets.length} tài sản có trạng thái đặc biệt (Mất/Thanh lý). Bạn vẫn có thể in tem nếu cần.</span>
                  </div>
                )}
                <div className="flex items-center space-x-3 text-slate-400 text-[10px] font-bold bg-slate-50 p-4 rounded-[20px] border border-slate-100">
                   <QrCode className="h-4 w-4 shrink-0 text-primary-500" />
                   <span>QR Code / Barcode sẽ mã hóa trực tiếp: <span className="text-primary-600 font-black">Mã tài sản (asset_code)</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0 z-10">
            <button 
              onClick={onClose} 
              className="px-6 py-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
            >
              Đóng lại
            </button>
            <div className="flex space-x-4">
              <button 
                onClick={() => handleAction('PREVIEW')}
                className="flex items-center px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
              >
                <Eye className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary-500" /> Xem trước PDF
              </button>
              <button 
                disabled={assets.length === 0 || missingCodes.length === assets.length || isPrinting}
                onClick={handlePrint}
                className="flex items-center px-10 py-4 bg-primary-600 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-2xl shadow-primary-200 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group"
              >
                {isPrinting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Printer className="mr-3 h-5 w-5" /> In tem ngay
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </BaseModal>

      {/* PDF PREVIEW MODAL */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={assets.length === 1 ? "Xem trước tem: " + assets[0].assetCode : `Xem trước ${assets.length} tem tài sản`}
        onDownload={() => handleAction('DOWNLOAD')}
        onPrint={() => handleAction('PRINT')}
        onConfirm={() => {
           handleAction('DOWNLOAD');
           setIsPreviewOpen(false);
        }}
        content={
           <div className={cn(
             "w-full h-full p-10 flex flex-col items-center",
             config.size === 'A4' ? "bg-white" : "bg-slate-100"
           )}>
             {config.size === 'A4' ? (
                <div className="grid grid-cols-3 gap-4 border border-slate-100 p-8 w-full">
                   {[...Array(assets.length > 30 ? 30 : assets.length)].map((_, i) => (
                      <div key={i} className="scale-75 origin-top-left">
                        {renderLabel(assets[i] || assets[0])}
                      </div>
                   ))}
                </div>
             ) : (
                <div className="scale-125 mt-20">
                   {renderLabel(assets[0])}
                </div>
             )}
             {assets.length > 30 && config.size === 'A4' && (
                <div className="mt-8 text-slate-400 font-black uppercase tracking-widest text-xs italic">
                  ... và {assets.length - 30} tem khác trên các trang tiếp theo
                </div>
             )}
           </div>
        }
      />
    </>
  );
};
