import React, { useState, useMemo } from 'react';
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
    size: '50x30mm',
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

    setIsPrinting(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const fileName = assets.length === 1 
        ? `TEM_TS_${assets[0].assetCode}_${timestamp}.pdf`
        : `TEM_TS_BATCH_${assets.length}_ITEMS_${timestamp}.pdf`;

      // Simulating PDF generation and logging
      await api.post('/operational/print-log', {
        assetIds: assets.map(a => a.id),
        action: type,
        config: config,
        fileName
      });

      // Update asset attachments with the generated label record
      for (const asset of assets) {
         let attachments = [];
         try {
           attachments = typeof asset.attachments === 'string' ? JSON.parse(asset.attachments) : (asset.attachments || []);
         } catch(e) { attachments = []; }
         
         attachments.push({
            id: `LBL-${Date.now()}`,
            name: fileName,
            type: 'application/pdf',
            group: 'Tem tài sản',
            createdAt: new Date().toISOString(),
            url: '#' // Mock URL
         });

         await api.patch(`/assets/${asset.id}`, {
            attachments: JSON.stringify(attachments)
         });
      }

      toast.success(type === 'PRINT' ? `Đã gửi lệnh in cho ${assets.length} tem tài sản!` : `Đã tải xuống file tem tài sản.`);
      
      if (type === 'PRINT') {
         setTimeout(() => {
           setIsPrinting(false);
           onClose();
         }, 1500);
      } else {
         setIsPrinting(false);
      }
    } catch (err) {
      toast.error("Lỗi khi thực hiện thao tác in tem");
      setIsPrinting(false);
    }
  };

    const renderLabel = (asset: any) => {
      // Standardize asset code mapping as requested
      const codeValue = String(asset?.asset_code || asset?.assetCode || asset?.code || '');
      const hasValidCode = codeValue.trim().length > 0;

      return (
        <div className={cn(
          "bg-white shadow-lg border border-slate-200 p-4 rounded-lg space-y-3 relative overflow-hidden transition-all hover:shadow-xl",
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
              {config.fields.assetName && <p className="text-[12px] font-black text-slate-900 leading-tight line-clamp-2 uppercase">{asset?.assetName || 'Tài sản mẫu'}</p>}
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
                <p className="text-[9px] font-bold text-slate-800">{asset?.serialNumber || '-'}</p>
              </div>
            )}
            {config.fields.location && (
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Vị trí</p>
                <p className="text-[9px] font-bold text-slate-800">{asset?.locationName || '-'}</p>
              </div>
            )}
            {config.fields.purchaseDate && (
              <div className="space-y-0.5">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Ngày mua</p>
                <p className="text-[9px] font-bold text-slate-800">{asset?.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('vi-VN') : '-'}</p>
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
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose} />
        
        <div className="relative w-full max-w-[920px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300">
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

              <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[40px] overflow-hidden">
                {assets.length === 0 ? (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-6 rounded-3xl shadow-xl inline-block border border-slate-100">
                      <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse mx-auto" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có tài sản để xem trước</p>
                  </div>
                ) : previewMode === 'SINGLE' ? (
                   renderLabel(assets[0])
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
                onClick={() => handleAction('PRINT')}
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
      </div>

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
