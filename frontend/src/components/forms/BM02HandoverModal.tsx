import React, { useState, useEffect } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AssetItemsTable, AttachmentUploader, SignatureBlock } from './FormComponents';
import { User, MapPin, ClipboardList, ShieldCheck, Eye } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-toastify';
import { AutocompleteInput } from '../FilterComponents';
import { PdfPreviewModal } from './PdfPreviewModal';

interface BM02ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialAsset?: any;
  initialAssets?: any[];
  initialType?: string;
}

export const BM02HandoverModal: React.FC<BM02ModalProps> = ({ isOpen, onClose, onSubmit, initialAsset, initialAssets, initialType }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    documentNo: `---`,
    date: new Date().toISOString().split('T')[0],
    sender: 'Nhân viên QLTS',
    senderDept: 'HCNS',
    receiver: '',
    receiverDept: '',
    receiverPosition: '',
    receiverPhone: '',
    type: initialType || 'Cấp phát',
    city: '',
    location: '',
    reason: '',
    items: initialAssets ? initialAssets : (initialAsset ? [initialAsset] : []),
    confirmCheckboxes: {
      checked: true,
      responsibility: true,
      systemUpdate: true
    }
  });

  const isRevoke = formData.type === 'Thu hồi' || initialType === 'Thu hồi';

  // Re-sync if assets change or type changes
  useEffect(() => {
    if (isOpen) {
       const assets = initialAssets || (initialAsset ? [initialAsset] : []);
       const type = initialType || (initialAsset as any)?.type || (initialAssets as any)?.type || 'Cấp phát';
       const revoke = type === 'Thu hồi';
       
       setFormData(prev => ({
         ...prev,
         type: type,
         sender: revoke ? (assets[0]?.currentUserName || 'Người sử dụng') : 'Nhân viên QLTS',
         senderDept: revoke ? (assets[0]?.departmentName || '-') : 'HCNS',
         receiver: revoke ? 'Nhân viên QLTS' : prev.receiver,
         receiverDept: revoke ? 'HCNS' : prev.receiverDept,
         items: assets,
         city: revoke ? 'Kho QLTS' : prev.city,
         location: revoke ? 'Kho trung tâm' : prev.location
       }));
    }
  }, [isOpen, initialAsset, initialAssets, initialType]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.receiver) newErrors.receiver = 'Vui lòng nhập người nhận';
    if (!formData.receiverDept) newErrors.receiverDept = 'Vui lòng chọn bộ phận nhận';
    if (!formData.city) newErrors.city = 'Vui lòng nhập Thành phố / Dự án';
    if (!formData.location) newErrors.location = 'Vui lòng nhập vị trí chi tiết';
    if (formData.items.length === 0) toast.error('Vui lòng chọn ít nhất một tài sản');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && formData.items.length > 0;
  };

  const handleConfirm = async () => {
    if (!validate()) {
       const firstError = Object.keys(errors)[0];
       toast.warning('Vui lòng điền đầy đủ các thông tin bắt buộc');
       return;
    }

    setLoading(true);
    try {
      // 1. Create Handover (and auto-complete it)
      const res = await api.post('/handover', {
        type: formData.type === 'Thu hồi' ? 'REVOKE' : (formData.type === 'Cấp phát' ? 'HANDOVER' : 'TRANSFER'),
        recipientName: formData.receiver,
        recipientPosition: formData.receiverPosition,
        recipientDepartment: formData.receiverDept,
        recipientPhone: formData.receiverPhone,
        newLocation: formData.location,
        newCity: formData.city,
        senderName: formData.sender,
        senderDepartment: formData.senderDept,
        reason: formData.reason,
        assetIds: formData.items.map((a: any) => a.id),
        autoComplete: true // We want to update assets immediately
      });

      toast.success(isRevoke ? 'Đã thu hồi tài sản và cập nhật sổ tài sản thành công!' : 'Đã thực hiện bàn giao và cập nhật sổ tài sản thành công!');
      
      const createdDocument = res.data;
      setCreatedDoc(createdDocument);
      setFormData(prev => ({ ...prev, documentNo: createdDocument.documentNo }));
      setIsSuccess(true);
      onSubmit(createdDocument);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi khi xử lý bàn giao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isRevoke ? "Biên bản thu hồi tài sản" : "Biên bản bàn giao tài sản"}
      formCode="BM02/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleConfirm}
      submitting={loading}
      confirmLabel={isRevoke ? "Xác nhận thu hồi & Sinh PDF" : "Xác nhận & Sinh PDF"}
      onPreviewPdf={() => setIsPreviewOpen(true)}
      isCompleted={isSuccess}
    >
      {isSuccess && createdDoc ? (
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
             <ShieldCheck className="h-10 w-10" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hồ sơ {isRevoke ? 'Thu hồi' : 'Bàn giao'} thành công</h4>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Mã hồ sơ: {createdDoc.documentNo}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
             <button 
               onClick={() => window.open(`http://localhost:3001/api/handover/${createdDoc.id}/pdf`, '_blank')}
               className="flex items-center justify-center px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
             >
               <Eye className="mr-3 h-4 w-4" /> Xem PDF
             </button>
             <button 
               onClick={() => {
                 const link = document.createElement('a');
                 link.href = `http://localhost:3001/api/handover/${createdDoc.id}/pdf`;
                 link.download = `BM02_${createdDoc.documentNo.replace('/', '_')}.pdf`;
                 link.click();
               }}
               className="flex items-center justify-center px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm"
             >
               <ClipboardList className="mr-3 h-4 w-4" /> Tải PDF
             </button>
          </div>
          
          <div className="pt-8 flex justify-center space-x-4">
             <button onClick={onClose} className="px-10 py-4 bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200">Hoàn tất & Đóng</button>
          </div>
        </div>
      ) : (
        <>
      {/* SENDER INFO */}
      <FormSection title={isRevoke ? "Người bàn giao lại tài sản" : "Thông tin bên giao"} icon={User}>
        <FormField label={isRevoke ? "Người bàn giao" : "Người giao"} required>
          <FormInput value={formData.sender} readOnly />
        </FormField>
        <FormField label="Bộ phận">
          <FormInput value={formData.senderDept} readOnly />
        </FormField>
      </FormSection>

      {/* RECEIVER INFO */}
      <FormSection title={isRevoke ? "Bộ phận QLTS / Kho nhận thu hồi" : "Thông tin bên nhận"} icon={User}>
        <FormField label={isRevoke ? "Người nhận thu hồi" : "Người nhận"} required>
          <FormInput 
            value={formData.receiver} 
            placeholder="Họ tên nhân viên nhận..." 
            onChange={e => setFormData({...formData, receiver: e.target.value})} 
            className={errors.receiver ? 'border-rose-500 bg-rose-50' : ''}
          />
          {errors.receiver && <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase ml-1">{errors.receiver}</p>}
        </FormField>
        <FormField label="Bộ phận nhận" required>
          <AutocompleteInput 
            placeholder="Chọn phòng ban..." 
            value={formData.receiverDept} 
            onChange={v => setFormData({...formData, receiverDept: v})} 
            endpoint="/assets/filter-options/departments"
            className={errors.receiverDept ? 'border-rose-500 bg-rose-50' : ''}
          />
          {errors.receiverDept && <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase ml-1">{errors.receiverDept}</p>}
        </FormField>
        <FormField label="Chức vụ">
          <FormInput value={formData.receiverPosition} onChange={e => setFormData({...formData, receiverPosition: e.target.value})} />
        </FormField>
        <FormField label="Số điện thoại">
          <FormInput value={formData.receiverPhone} onChange={e => setFormData({...formData, receiverPhone: e.target.value})} />
        </FormField>
      </FormSection>

      {/* HANDOVER INFO */}
      <FormSection title={isRevoke ? "Thông tin thu hồi" : "Thông tin bàn giao"} icon={MapPin}>
        <FormField label={isRevoke ? "Ngày thu hồi" : "Ngày bàn giao"} required>
          <FormInput type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        </FormField>
        <FormField label={isRevoke ? "Loại thu hồi" : "Loại bàn giao"}>
          <FormSelect value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="Cấp phát">Cấp phát mới</option>
            <option value="Thu hồi">Thu hồi về kho</option>
            <option value="Bàn giao lại">Bàn giao lại (Luân chuyển nội bộ)</option>
          </FormSelect>
        </FormField>
        <FormField label="Thành phố / Dự án" required>
          <AutocompleteInput 
            placeholder="Danko City, Danko Avenue..." 
            value={formData.city} 
            onChange={v => setFormData({...formData, city: v})} 
            endpoint="/assets/filter-options/locations"
            className={errors.city ? 'border-rose-500 bg-rose-50' : ''}
          />
          {errors.city && <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase ml-1">{errors.city}</p>}
        </FormField>
        <FormField label="Vị trí chi tiết" required>
          <FormInput 
            value={formData.location} 
            placeholder="Tầng, phòng, khu vực..." 
            onChange={e => setFormData({...formData, location: e.target.value})} 
            className={errors.location ? 'border-rose-500 bg-rose-50' : ''}
          />
          {errors.location && <p className="text-[9px] font-bold text-rose-500 mt-1 uppercase ml-1">{errors.location}</p>}
        </FormField>
        <FormField label={isRevoke ? "Lý do thu hồi" : "Lý do bàn giao"} className="col-span-2">
          <FormTextArea value={formData.reason} placeholder={isRevoke ? "Nhập lý do thu hồi..." : "Nhập lý do bàn giao..."} onChange={e => setFormData({...formData, reason: e.target.value})} />
        </FormField>
      </FormSection>

      {/* ASSET LIST */}
      <FormSection title={isRevoke ? "Danh sách tài sản thu hồi" : "Danh sách tài sản bàn giao"} icon={ClipboardList} className="md:grid-cols-1">
        <AssetItemsTable 
          items={formData.items} 
          onRemove={(id) => setFormData({...formData, items: formData.items.filter((i: any) => i.id !== id)})} 
          onAdd={() => {}} 
        />
      </FormSection>

      {/* COMMITMENT */}
      <FormSection title="Cam kết & Xác nhận" icon={ShieldCheck}>
        <div className="col-span-2 space-y-3 bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <div className="flex items-start space-x-3">
            <input type="checkbox" id="check1" className="mt-1 w-5 h-5 rounded-lg border-blue-300 text-primary-600" defaultChecked />
            <label htmlFor="check1" className="text-sm font-bold text-blue-800">Bên nhận đã kiểm tra đúng chủng loại, số lượng, tình trạng tài sản như trên.</label>
          </div>
          <div className="flex items-start space-x-3">
            <input type="checkbox" id="check2" className="mt-1 w-5 h-5 rounded-lg border-blue-300 text-primary-600" defaultChecked />
            <label htmlFor="check2" className="text-sm font-bold text-blue-800">Bên nhận có trách nhiệm bảo quản và sử dụng đúng mục đích công việc.</label>
          </div>
          <div className="flex items-start space-x-3">
            <input type="checkbox" id="check3" className="mt-1 w-5 h-5 rounded-lg border-blue-300 text-primary-600" defaultChecked />
            <label htmlFor="check3" className="text-sm font-bold text-blue-800">Hệ thống sẽ tự động cập nhật trạng thái tài sản sau khi xác nhận biên bản này.</label>
          </div>
        </div>
      </FormSection>

      {/* SIGNATURES */}
      <SignatureBlock roles={isRevoke ? ['Người bàn giao', 'Đại diện kho', 'CV QLTS'] : ['Bên giao', 'Bên nhận', 'CVTS / HCNS']} />
      </>
      )}

      {/* PDF PREVIEW MODAL */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={isRevoke ? "Xem trước biên bản thu hồi" : "Xem trước biên bản bàn giao"}
        onDownload={() => toast.info('Chức năng tải về sẽ khả dụng sau khi lưu hồ sơ')}
        onPrint={() => toast.info('Chức năng in sẽ khả dụng sau khi lưu hồ sơ')}
        onConfirm={() => setIsPreviewOpen(false)}
        content={
          <div className="p-10 space-y-10 bg-white">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">DANKO GROUP</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hệ thống Quản lý tài sản số</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[12px] font-black text-slate-900 uppercase">Mẫu số: {isRevoke ? 'BM02/BTH' : 'BM02/QLTS'}</p>
                <p className="text-[10px] font-bold text-slate-500">Số: {formData.documentNo}</p>
              </div>
            </div>
            
            <div className="text-center py-10">
               <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{isRevoke ? 'BIÊN BẢN THU HỒI TÀI SẢN' : 'BIÊN BẢN BÀN GIAO TÀI SẢN'}</h1>
               <p className="text-[12px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Ngày {formData.date.split('-')[2]} tháng {formData.date.split('-')[1]} năm {formData.date.split('-')[0]}</p>
            </div>

            <div className="grid grid-cols-2 gap-20">
               <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-2">{isRevoke ? 'I. NGƯỜI BÀN GIAO LẠI' : 'I. BÊN GIAO'}</h3>
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium"><span className="font-black text-slate-400 uppercase text-[9px] mr-2">Họ và tên:</span> {formData.sender}</p>
                    <p className="text-[13px] font-medium"><span className="font-black text-slate-400 uppercase text-[9px] mr-2">Bộ phận:</span> {formData.senderDept}</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-2">{isRevoke ? 'II. KHO / BỘ PHẬN NHẬN' : 'II. BÊN NHẬN'}</h3>
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium"><span className="font-black text-slate-400 uppercase text-[9px] mr-2">Họ và tên:</span> {formData.receiver}</p>
                    <p className="text-[13px] font-medium"><span className="font-black text-slate-400 uppercase text-[9px] mr-2">Bộ phận:</span> {formData.receiverDept}</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-10">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-b border-slate-200 pb-2">III. DANH SÁCH TÀI SẢN</h3>
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-[10px] font-black uppercase">STT</th>
                        <th className="border border-slate-300 p-2 text-[10px] font-black uppercase">Mã tài sản</th>
                        <th className="border border-slate-300 p-2 text-[10px] font-black uppercase text-left">Tên tài sản</th>
                        <th className="border border-slate-300 p-2 text-[10px] font-black uppercase">Serial</th>
                        <th className="border border-slate-300 p-2 text-[10px] font-black uppercase">ĐVT</th>
                     </tr>
                  </thead>
                  <tbody>
                     {formData.items.map((item, idx) => (
                       <tr key={item.id}>
                          <td className="border border-slate-300 p-2 text-center text-[12px]">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 text-center text-[12px] font-mono">{item.assetCode}</td>
                          <td className="border border-slate-300 p-2 text-[12px] font-bold">{item.assetName}</td>
                          <td className="border border-slate-300 p-2 text-center text-[12px]">{item.serialNumber || '-'}</td>
                          <td className="border border-slate-300 p-2 text-center text-[12px]">{item.unit || 'Cái'}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="pt-20 grid grid-cols-3 text-center">
               <div className="space-y-20">
                  <p className="text-[11px] font-black uppercase tracking-widest">{isRevoke ? 'Người bàn giao' : 'Bên giao'}</p>
                  <p className="text-[13px] font-bold text-slate-300 italic">(Ký, ghi rõ họ tên)</p>
               </div>
               <div className="space-y-20">
                  <p className="text-[11px] font-black uppercase tracking-widest">{isRevoke ? 'Đại diện kho' : 'Bên nhận'}</p>
                  <p className="text-[13px] font-bold text-slate-300 italic">(Ký, ghi rõ họ tên)</p>
               </div>
               <div className="space-y-20">
                  <p className="text-[11px] font-black uppercase tracking-widest">Phòng HCNS</p>
                  <p className="text-[13px] font-bold text-slate-300 italic">(Ký, ghi rõ họ tên)</p>
               </div>
            </div>
          </div>
        }
      />
    </BaseFormModal>
  );
};
