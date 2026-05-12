import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AttachmentUploader, SignatureBlock } from './FormComponents';
import { Trash2, ShieldAlert, Search, FileText } from 'lucide-react';

interface BM05ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
}

export const BM05DisposalModal: React.FC<BM05ModalProps> = ({ isOpen, onClose, onSubmit, asset }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM05-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    reason: 'Tài sản hỏng nặng không thể sửa chữa/thanh lý',
    method: 'Hủy bỏ / Rác thải công nghiệp',
    location: 'Bãi rác tập trung công ty',
    witnesses: '',
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
      title="Biên bản tiêu hủy tài sản"
      formCode="BM05/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleSubmit}
      submitting={loading}
      confirmLabel="Xác nhận tiêu hủy"
    >
      <FormSection title="Thông tin tài sản tiêu hủy" icon={Search}>
        <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">{asset?.assetName || '---'}</p>
            <p className="text-[10px] font-bold text-primary-600">{asset?.assetCode || 'Mã TS'}</p>
          </div>
          <div className="text-right text-rose-600">
             <ShieldAlert className="h-5 w-5 inline-block mr-2" />
             <span className="text-xs font-black uppercase tracking-widest">Tiêu hủy</span>
          </div>
        </div>
      </FormSection>

      <FormSection title="Nội dung tiêu hủy" icon={Trash2}>
        <FormField label="Lý do tiêu hủy" className="col-span-2" required>
          <FormTextArea 
            value={formData.reason} 
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Mô tả tình trạng dẫn đến tiêu hủy..."
          />
        </FormField>
        <FormField label="Hình thức tiêu hủy" required>
          <FormInput value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})} />
        </FormField>
        <FormField label="Địa điểm tiêu hủy" required>
          <FormInput value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
        </FormField>
        <FormField label="Người chứng kiến" className="col-span-2">
          <FormInput value={formData.witnesses} onChange={e => setFormData({...formData, witnesses: e.target.value})} placeholder="Họ tên những người tham gia giám sát..." />
        </FormField>
      </FormSection>

      <FormSection title="Hồ sơ & Ảnh xác minh" icon={FileText}>
        <AttachmentUploader files={[]} onAdd={() => {}} onRemove={() => {}} />
      </FormSection>

      <SignatureBlock roles={['Hội đồng tiêu hủy', 'Người thực hiện', 'Người chứng kiến', 'HCNS']} />
    </BaseFormModal>
  );
};
