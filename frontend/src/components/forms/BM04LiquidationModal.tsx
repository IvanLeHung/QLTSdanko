import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AttachmentUploader, SignatureBlock } from './FormComponents';
import { Trash2, DollarSign, Search, FileText } from 'lucide-react';

interface BM04ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
}

export const BM04LiquidationModal: React.FC<BM04ModalProps> = ({ isOpen, onClose, onSubmit, asset }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM04-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    reason: 'Hết khấu hao, không còn nhu cầu sử dụng',
    method: 'Bán thanh lý',
    liquidationValue: 0,
    buyer: '',
    documentRef: '',
    note: '',
    status: 'COMPLETED'
  });

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      onSubmit(formData);
      setLoading(false);
      onClose();
    }, 800);
  };

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Biên bản thanh lý tài sản"
      formCode="BM04/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleSubmit}
      submitting={loading}
      confirmLabel="Xác nhận thanh lý"
    >
      <FormSection title="Thông tin tài sản thanh lý" icon={Search}>
        <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">{asset?.assetName || '---'}</p>
            <p className="text-[10px] font-bold text-primary-600">{asset?.assetCode || 'Mã TS'}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị còn lại</p>
             <p className="text-sm font-black text-rose-600">{(asset?.currentValue || 0).toLocaleString()}đ</p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Chi tiết thanh lý" icon={Trash2}>
        <FormField label="Lý do thanh lý" className="col-span-2" required>
          <FormTextArea 
            value={formData.reason} 
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Lý do chi tiết..."
          />
        </FormField>
        <FormField label="Hình thức thanh lý" required>
          <FormSelect value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})}>
            <option value="Bán thanh lý">Bán thanh lý</option>
            <option value="Tiêu hủy">Tiêu hủy (Chuyển BM05)</option>
            <option value="Tặng/Cho">Tặng / Cho</option>
            <option value="Trả lại NCC">Trả lại nhà cung cấp</option>
          </FormSelect>
        </FormField>
        <FormField label="Giá trị thanh lý (nếu có)">
          <FormInput 
            type="number" 
            value={formData.liquidationValue} 
            onChange={e => setFormData({...formData, liquidationValue: Number(e.target.value)})}
            placeholder="0"
          />
        </FormField>
        <FormField label="Đơn vị/Cá nhân mua">
          <FormInput value={formData.buyer} onChange={e => setFormData({...formData, buyer: e.target.value})} placeholder="Tên người mua/đơn vị nhận..." />
        </FormField>
        <FormField label="Chứng từ kèm theo">
          <FormInput value={formData.documentRef} onChange={e => setFormData({...formData, documentRef: e.target.value})} placeholder="Số hóa đơn, hợp đồng..." />
        </FormField>
      </FormSection>

      <FormSection title="Hồ sơ đính kèm" icon={FileText}>
        <AttachmentUploader files={[]} onAdd={() => {}} onRemove={() => {}} />
      </FormSection>

      <SignatureBlock roles={['Hội đồng thanh lý', 'CVTS', 'Kế toán', 'Người nhận bàn giao TS']} />
    </BaseFormModal>
  );
};
