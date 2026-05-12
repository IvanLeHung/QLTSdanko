import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AttachmentUploader, SignatureBlock } from './FormComponents';
import { ArrowRightLeft, MapPin, Search, User } from 'lucide-react';

interface BM06ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
}

export const BM06TransferModal: React.FC<BM06ModalProps> = ({ isOpen, onClose, onSubmit, asset }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM06-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    reason: 'Thay đổi vị trí làm việc / Nhu cầu bộ phận',
    
    // Source
    fromUser: asset?.currentUserName || 'Trong kho',
    fromDepartment: asset?.departmentName || 'Kho tổng',
    fromLocation: asset?.locationName || 'N/A',
    
    // Destination
    toUser: '',
    toDepartment: '',
    toLocation: '',
    
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
      title="Biên bản điều chuyển tài sản"
      formCode="BM06/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleSubmit}
      submitting={loading}
      confirmLabel="Xác nhận điều chuyển"
    >
      <FormSection title="Thông tin tài sản điều chuyển" icon={Search}>
        <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">{asset?.assetName || '---'}</p>
            <p className="text-[10px] font-bold text-primary-600">{asset?.assetCode || 'Mã TS'}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hiện tại</p>
             <p className="text-sm font-black text-blue-600 uppercase">{asset?.status || 'IN_STOCK'}</p>
          </div>
        </div>
      </FormSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <FormSection title="Đơn vị chuyển (Bên giao)" icon={User} className="md:grid-cols-1">
          <FormField label="Người bàn giao">
            <FormInput value={formData.fromUser} readOnly className="bg-slate-50" />
          </FormField>
          <FormField label="Bộ phận">
            <FormInput value={formData.fromDepartment} readOnly className="bg-slate-50" />
          </FormField>
          <FormField label="Vị trí hiện tại">
            <FormInput value={formData.fromLocation} readOnly className="bg-slate-50" />
          </FormField>
        </FormSection>

        <FormSection title="Đơn vị nhận (Bên nhận)" icon={MapPin} className="md:grid-cols-1">
          <FormField label="Người nhận mới" required>
            <FormInput value={formData.toUser} onChange={e => setFormData({...formData, toUser: e.target.value})} placeholder="Họ tên người nhận..." />
          </FormField>
          <FormField label="Bộ phận mới" required>
            <FormInput value={formData.toDepartment} onChange={e => setFormData({...formData, toDepartment: e.target.value})} placeholder="Tên phòng ban..." />
          </FormField>
          <FormField label="Vị trí mới" required>
            <FormInput value={formData.toLocation} onChange={e => setFormData({...formData, toLocation: e.target.value})} placeholder="Văn phòng, tầng, khu vực..." />
          </FormField>
        </FormSection>
      </div>

      <FormSection title="Nội dung điều chuyển" icon={ArrowRightLeft}>
        <FormField label="Lý do điều chuyển" className="col-span-2" required>
          <FormTextArea 
            value={formData.reason} 
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Lý do chi tiết điều chuyển..."
          />
        </FormField>
        <FormField label="Ghi chú thêm" className="col-span-2">
          <FormInput value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        </FormField>
      </FormSection>

      <SignatureBlock roles={['Bên giao', 'Bên nhận', 'Người điều chuyển/CVTS', 'HCNS']} />
    </BaseFormModal>
  );
};
