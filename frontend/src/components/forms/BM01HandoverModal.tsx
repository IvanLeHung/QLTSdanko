import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AssetItemsTable, AttachmentUploader, SignatureBlock } from './FormComponents';
import { Building2, User, Package, ClipboardCheck, FilePlus } from 'lucide-react';

interface BM01ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const BM01HandoverModal: React.FC<BM01ModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM01-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    receiveDate: new Date().toISOString().split('T')[0],
    senderUnit: 'Phòng Cung ứng',
    senderName: '',
    receiverName: 'Nhân viên QLTS',
    companyName: 'Danko Group',
    supplier: '',
    invoiceNo: '',
    purchaseDate: '',
    poNo: '',
    items: [],
    checklist: {
      correctType: true,
      enoughQuantity: true,
      hasInvoice: true,
      labeled: true,
      goodCondition: true
    },
    note: ''
  });

  const handleSubmit = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onSubmit(formData);
      setLoading(false);
      onClose();
    }, 800);
  };

  const summary = (
    <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50/80 rounded-3xl border border-slate-100">
      <div className="px-4 space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn vị giao</p>
        <p className="text-sm font-bold text-slate-700 truncate">{formData.senderUnit}</p>
      </div>
      <div className="px-4 space-y-1 border-x border-slate-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người nhận</p>
        <p className="text-sm font-bold text-slate-700">{formData.receiverName}</p>
      </div>
      <div className="px-4 space-y-1 border-r border-slate-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp</p>
        <p className="text-sm font-bold text-slate-700 truncate">{formData.supplier || '---'}</p>
      </div>
      <div className="px-4 space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng TS</p>
        <p className="text-sm font-bold text-slate-700">{formData.items.length} tài sản</p>
      </div>
    </div>
  );

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Biên bản bàn giao tài sản mới"
      formCode="BM01/QLTS"
      documentNo={formData.documentNo}
      date={formData.receiveDate}
      onConfirm={handleSubmit}
      submitting={loading}
      summary={summary}
      confirmLabel="Tạo tài sản từ biên bản"
    >
      {/* SECTION 1: RECEIVE INFO */}
      <FormSection title="Thông tin tiếp nhận" icon={ClipboardCheck}>
        <FormField label="Ngày tiếp nhận" required>
          <FormInput type="date" value={formData.receiveDate} onChange={e => setFormData({...formData, receiveDate: e.target.value})} />
        </FormField>
        <FormField label="Công ty chủ quản" required>
          <FormInput value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
        </FormField>
        <FormField label="Đơn vị giao (P. Cung ứng)" required>
          <FormInput value={formData.senderUnit} onChange={e => setFormData({...formData, senderUnit: e.target.value})} />
        </FormField>
        <FormField label="Người giao" required>
          <FormInput value={formData.senderName} placeholder="Họ tên nhân viên cung ứng..." onChange={e => setFormData({...formData, senderName: e.target.value})} />
        </FormField>
      </FormSection>

      {/* SECTION 2: SUPPLIER INFO */}
      <FormSection title="Thông tin nhà cung cấp & Chứng từ" icon={Building2}>
        <FormField label="Nhà cung cấp">
          <FormInput value={formData.supplier} placeholder="Tên đơn vị bán hàng..." onChange={e => setFormData({...formData, supplier: e.target.value})} />
        </FormField>
        <FormField label="Số hóa đơn / Chứng từ">
          <FormInput value={formData.invoiceNo} placeholder="VAT-..." onChange={e => setFormData({...formData, invoiceNo: e.target.value})} />
        </FormField>
        <FormField label="Ngày mua">
          <FormInput type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
        </FormField>
        <FormField label="Hợp đồng / PO">
          <FormInput value={formData.poNo} placeholder="Số PO hoặc hợp đồng..." onChange={e => setFormData({...formData, poNo: e.target.value})} />
        </FormField>
      </FormSection>

      {/* SECTION 3: ASSET LIST */}
      <FormSection title="Danh sách tài sản tiếp nhận" icon={Package} className="md:grid-cols-1">
        <AssetItemsTable items={formData.items} onAdd={() => {}} showPrice />
      </FormSection>

      {/* SECTION 4: CHECKLIST */}
      <FormSection title="Kiểm tra khi nhận" icon={ClipboardCheck}>
        <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          {[
            { key: 'correctType', label: 'Đúng chủng loại' },
            { key: 'enoughQuantity', label: 'Đủ số lượng' },
            { key: 'hasInvoice', label: 'Có hóa đơn/chứng từ' },
            { key: 'labeled', label: 'Đã dán mã tài sản' },
            { key: 'goodCondition', label: 'Đạt tình trạng sử dụng' },
          ].map((item) => (
            <div key={item.key} className="flex items-center space-x-3">
              <input 
                type="checkbox" 
                id={item.key}
                className="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500"
                checked={(formData.checklist as any)[item.key]}
                onChange={(e) => setFormData({
                  ...formData, 
                  checklist: { ...formData.checklist, [item.key]: e.target.checked }
                })}
              />
              <label htmlFor={item.key} className="text-sm font-bold text-slate-700 cursor-pointer">{item.label}</label>
            </div>
          ))}
        </div>
      </FormSection>

      {/* ATTACHMENTS */}
      <FormSection title="Hồ sơ đính kèm" icon={FilePlus}>
        <AttachmentUploader files={[]} onAdd={() => {}} onRemove={() => {}} />
      </FormSection>

      {/* SIGNATURES */}
      <SignatureBlock roles={['Người giao', 'Người nhận/CVTS', 'Kế toán']} />
    </BaseFormModal>
  );
};
