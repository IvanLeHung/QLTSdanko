import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AssetItemsTable, AttachmentUploader, SignatureBlock } from './FormComponents';
import { User, MapPin, ClipboardList, ShieldCheck } from 'lucide-react';

interface BM02ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialAsset?: any;
}

export const BM02HandoverModal: React.FC<BM02ModalProps> = ({ isOpen, onClose, onSubmit, initialAsset }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM02-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    sender: 'Nhân viên QLTS',
    senderDept: 'HCNS',
    receiver: '',
    receiverDept: '',
    receiverPosition: '',
    receiverPhone: '',
    type: 'Cấp phát',
    city: '',
    location: '',
    reason: '',
    items: initialAsset ? [initialAsset] : [],
    confirmCheckboxes: {
      checked: true,
      responsibility: true,
      systemUpdate: true
    }
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
      title="Biên bản bàn giao tài sản"
      formCode="BM02/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleSubmit}
      submitting={loading}
      confirmLabel="Xác nhận bàn giao"
    >
      {/* SENDER INFO */}
      <FormSection title="Thông tin bên giao" icon={User}>
        <FormField label="Người giao" required>
          <FormInput value={formData.sender} readOnly />
        </FormField>
        <FormField label="Bộ phận giao">
          <FormInput value={formData.senderDept} readOnly />
        </FormField>
      </FormSection>

      {/* RECEIVER INFO */}
      <FormSection title="Thông tin bên nhận" icon={User}>
        <FormField label="Người nhận" required>
          <FormInput value={formData.receiver} placeholder="Họ tên nhân viên nhận..." onChange={e => setFormData({...formData, receiver: e.target.value})} />
        </FormField>
        <FormField label="Bộ phận nhận" required>
          <FormInput value={formData.receiverDept} placeholder="Phòng ban..." onChange={e => setFormData({...formData, receiverDept: e.target.value})} />
        </FormField>
        <FormField label="Chức vụ">
          <FormInput value={formData.receiverPosition} onChange={e => setFormData({...formData, receiverPosition: e.target.value})} />
        </FormField>
        <FormField label="Số điện thoại">
          <FormInput value={formData.receiverPhone} onChange={e => setFormData({...formData, receiverPhone: e.target.value})} />
        </FormField>
      </FormSection>

      {/* HANDOVER INFO */}
      <FormSection title="Thông tin bàn giao" icon={MapPin}>
        <FormField label="Ngày bàn giao" required>
          <FormInput type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        </FormField>
        <FormField label="Loại bàn giao">
          <FormSelect value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="Cấp phát">Cấp phát mới</option>
            <option value="Thu hồi">Thu hồi về kho</option>
            <option value="Bàn giao lại">Bàn giao lại (Luân chuyển nội bộ)</option>
          </FormSelect>
        </FormField>
        <FormField label="Thành phố / Dự án">
          <FormInput value={formData.city} placeholder="VD: Hà Nội, Danko City..." onChange={e => setFormData({...formData, city: e.target.value})} />
        </FormField>
        <FormField label="Vị trí chi tiết">
          <FormInput value={formData.location} placeholder="Tầng, phòng..." onChange={e => setFormData({...formData, location: e.target.value})} />
        </FormField>
        <FormField label="Lý do bàn giao" className="col-span-2">
          <FormTextArea value={formData.reason} placeholder="Nhập lý do bàn giao..." onChange={e => setFormData({...formData, reason: e.target.value})} />
        </FormField>
      </FormSection>

      {/* ASSET LIST */}
      <FormSection title="Danh sách tài sản bàn giao" icon={ClipboardList} className="md:grid-cols-1">
        <AssetItemsTable items={formData.items} onAdd={() => {}} />
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
      <SignatureBlock roles={['Bên giao', 'Bên nhận', 'CVTS / HCNS']} />
    </BaseFormModal>
  );
};
