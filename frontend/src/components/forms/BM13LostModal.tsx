import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AttachmentUploader, SignatureBlock } from './FormComponents';
import { ShieldAlert, User, Search, MapPin } from 'lucide-react';

interface BM13ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
}

export const BM13LostModal: React.FC<BM13ModalProps> = ({ isOpen, onClose, onSubmit, asset }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM13-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    reportedBy: 'Nhân viên QLTS',
    discoverySource: 'Người dùng báo',
    lostDate: new Date().toISOString().split('T')[0],
    lastSeenDate: '',
    description: '',
    cause: '',
    isTheftSuspected: false,
    hasEvidence: false,
    responsibility: '',
    proposedAction: 'Ghi nhận mất, chờ xử lý bồi thường',
    status: 'LOST'
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
      title="Biên bản ghi nhận mất tài sản"
      formCode="BM13/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={handleSubmit}
      submitting={loading}
      confirmLabel="Xác nhận ghi nhận mất"
    >
      {/* ASSET INFO */}
      <FormSection title="Thông tin tài sản mất" icon={Search}>
        <div className="col-span-2 p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">{asset?.assetName || '---'}</p>
            <p className="text-[10px] font-black text-primary-600 uppercase">{asset?.assetCode || 'Mã TS'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người giữ cuối</p>
            <p className="text-sm font-bold text-slate-700">{asset?.currentUserName || 'Trong kho'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá trị còn lại</p>
            <p className="text-sm font-black text-rose-600">{(asset?.currentValue || 0).toLocaleString()}đ</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí cuối</p>
            <p className="text-sm font-bold text-slate-700 truncate">{asset?.locationName || '---'}</p>
          </div>
        </div>
      </FormSection>

      {/* INCIDENT INFO */}
      <FormSection title="Thông tin sự việc" icon={ShieldAlert}>
        <FormField label="Ngày phát hiện mất" required>
          <FormInput type="date" value={formData.lostDate} onChange={e => setFormData({...formData, lostDate: e.target.value})} />
        </FormField>
        <FormField label="Người phát hiện / Báo cáo" required>
          <FormInput value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} />
        </FormField>
        <FormField label="Nguồn phát hiện">
          <FormSelect value={formData.discoverySource} onChange={e => setFormData({...formData, discoverySource: e.target.value})}>
            <option value="Người dùng báo">Người dùng báo</option>
            <option value="Kiểm kê">Kiểm kê định kỳ/đột xuất</option>
            <option value="Khác">Nguồn khác</option>
          </FormSelect>
        </FormField>
        <FormField label="Ngày nhìn thấy lần cuối">
          <FormInput type="date" value={formData.lastSeenDate} onChange={e => setFormData({...formData, lastSeenDate: e.target.value})} />
        </FormField>
        <FormField label="Mô tả sự việc" className="col-span-2" required>
          <FormTextArea value={formData.description} placeholder="Chi tiết diễn biến sự việc, thời gian, địa điểm..." onChange={e => setFormData({...formData, description: e.target.value})} />
        </FormField>
        
        <div className="col-span-2 flex items-center space-x-8 p-4 bg-slate-50 rounded-2xl">
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="theft" className="w-5 h-5 rounded-lg border-slate-300" checked={formData.isTheftSuspected} onChange={e => setFormData({...formData, isTheftSuspected: e.target.checked})} />
            <label htmlFor="theft" className="text-sm font-bold text-slate-700">Nghi ngờ mất trộm</label>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" id="evidence" className="w-5 h-5 rounded-lg border-slate-300" checked={formData.hasEvidence} onChange={e => setFormData({...formData, hasEvidence: e.target.checked})} />
            <label htmlFor="evidence" className="text-sm font-bold text-slate-700">Có bằng chứng (Camera/Video)</label>
          </div>
        </div>
      </FormSection>

      {/* RESPONSIBILITY & ACTION */}
      <FormSection title="Trách nhiệm & Xử lý" icon={MapPin}>
        <FormField label="Cá nhân/Bộ phận chịu trách nhiệm" className="col-span-2">
          <FormInput value={formData.responsibility} placeholder="Họ tên người chịu trách nhiệm trực tiếp..." onChange={e => setFormData({...formData, responsibility: e.target.value})} />
        </FormField>
        <FormField label="Đề xuất xử lý" className="col-span-2">
          <FormSelect value={formData.proposedAction} onChange={e => setFormData({...formData, proposedAction: e.target.value})}>
            <option value="Ghi nhận mất, chờ xử lý bồi thường">Ghi nhận mất, chờ xử lý bồi thường</option>
            <option value="Ghi nhận mất, chờ tìm kiếm (15 ngày)">Ghi nhận mất, chờ tìm kiếm (15 ngày)</option>
            <option value="Xác nhận mất vĩnh viễn, xóa sổ tài sản">Xác nhận mất vĩnh viễn, xóa sổ tài sản</option>
          </FormSelect>
        </FormField>
      </FormSection>

      {/* ATTACHMENTS */}
      <FormSection title="Tài liệu xác minh" icon={ShieldAlert}>
        <AttachmentUploader files={[]} onAdd={() => {}} onRemove={() => {}} />
      </FormSection>

      {/* SIGNATURES */}
      <SignatureBlock roles={['Người báo/Người giữ', 'CVTS', 'Quản lý bộ phận', 'HCNS/Kế toán']} />
    </BaseFormModal>
  );
};
