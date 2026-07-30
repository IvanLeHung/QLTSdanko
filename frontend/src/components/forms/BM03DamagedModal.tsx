import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AttachmentUploader, SignatureBlock } from './FormComponents';
import { AlertTriangle, User, Search, History } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'react-toastify';

interface BM03ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
  assets?: any[];
}

export const BM03DamagedModal: React.FC<BM03ModalProps> = ({ isOpen, onClose, onSubmit, asset, assets = [] }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM03-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    reportedBy: 'Nhân viên QLTS',
    discoveryDate: new Date().toISOString().split('T')[0],
    level: 'MEDIUM',
    description: '',
    cause: '',
    canContinue: true,
    initialAssessment: 'Hao mòn tự nhiên',
    action: 'Chuyển sửa chữa'
  });
  const targetAssets = assets.length > 0 ? assets : asset ? [asset] : [];
  const isBulkAction = targetAssets.length > 1;

  const submitTicket = async (statusType: 'OPEN' | 'DRAFT') => {
    if (!formData.description) {
      toast.error("Vui lòng nhập mô tả sự cố");
      return;
    }
    if (targetAssets.length === 0) {
      toast.error("Thiếu thông tin tài sản");
      return;
    }
    setLoading(true);
    try {
      const response = isBulkAction
        ? await api.post('/operational/damage', {
            assetIds: targetAssets.map((item) => item.id),
            reportDate: formData.discoveryDate,
            damageLevel: formData.level,
            description: formData.description,
            solution: formData.action === 'Chuyển sửa chữa' ? 'REPAIRING' : 'DAMAGED',
            note: [formData.cause, formData.initialAssessment, formData.action].filter(Boolean).join(' - ')
          })
        : await api.post('/repairs', {
            assetId: targetAssets[0].id,
            reportedBy: formData.reportedBy,
            reportedDate: new Date(formData.discoveryDate),
            damageLevel: formData.level,
            damageDescription: formData.description,
            cause: formData.cause,
            canContinueUsing: formData.canContinue,
            repairAction: formData.action,
            status: statusType
          });
      toast.success(
        isBulkAction
          ? `Đã lập hồ sơ sửa chữa / bảo trì cho ${targetAssets.length} tài sản`
          : statusType === 'DRAFT'
            ? "Đã lưu nháp biên bản hỏng thành công"
            : "Đã gửi báo hỏng tài sản thành công"
      );
      onSubmit(response.data);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi gửi báo hỏng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Biên bản tài sản hỏng"
      formCode="BM03/QLTS"
      documentNo={formData.documentNo}
      date={formData.date}
      onConfirm={() => submitTicket('OPEN')}
      onSaveDraft={isBulkAction ? undefined : () => submitTicket('DRAFT')}
      submitting={loading}
      confirmLabel="Xác nhận báo hỏng"
      isCompleted={false}
    >
      {/* ASSET INFO */}
      <FormSection title="Thông tin tài sản" icon={Search}>
        <div className="col-span-2 p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">
              {isBulkAction ? `${targetAssets.length} tài sản đã chọn` : targetAssets[0]?.assetName || '---'}
            </p>
            <p className="text-[10px] font-black text-primary-600 uppercase">
              {isBulkAction
                ? targetAssets.slice(0, 3).map((item) => item.assetCode).filter(Boolean).join(', ')
                : targetAssets[0]?.assetCode || 'Mã TS'}
              {isBulkAction && targetAssets.length > 3 ? ` +${targetAssets.length - 3}` : ''}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người đang giữ</p>
            <p className="text-sm font-bold text-slate-700">{isBulkAction ? 'Nhiều người dùng / đơn vị' : targetAssets[0]?.currentUserName || 'Trong kho'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí</p>
            <p className="text-sm font-bold text-slate-700 truncate">
              {isBulkAction ? 'Theo vị trí hiện tại của từng tài sản' : `${targetAssets[0]?.cityName || ''} - ${targetAssets[0]?.locationName || ''}`}
            </p>
          </div>
        </div>
      </FormSection>

      {/* INCIDENT INFO */}
      <FormSection title="Thông tin sự cố" icon={AlertTriangle}>
        <FormField label="Ngày phát hiện" required>
          <FormInput type="date" value={formData.discoveryDate} onChange={e => setFormData({...formData, discoveryDate: e.target.value})} />
        </FormField>
        <FormField label="Người báo" required>
          <FormInput value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} />
        </FormField>
        <FormField label="Mức độ hỏng">
          <FormSelect value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
            <option value="LOW">Nhẹ (Vẫn dùng được)</option>
            <option value="MEDIUM">Trung bình (Cần sửa)</option>
            <option value="HIGH">Nặng (Hỏng chức năng chính)</option>
            <option value="UNUSABLE">Không thể sử dụng</option>
          </FormSelect>
        </FormField>
        <FormField label="Khả năng sử dụng">
          <FormSelect value={formData.canContinue ? 'YES' : 'NO'} onChange={e => setFormData({...formData, canContinue: e.target.value === 'YES'})}>
            <option value="YES">Có thể tiếp tục sử dụng tạm thời</option>
            <option value="NO">Phải ngừng sử dụng ngay</option>
          </FormSelect>
        </FormField>
        <FormField label="Mô tả hư hỏng" className="col-span-2" required>
          <FormTextArea value={formData.description} placeholder="Mô tả chi tiết tình trạng, biểu hiện hỏng hóc..." onChange={e => setFormData({...formData, description: e.target.value})} />
        </FormField>
        <FormField label="Nguyên nhân dự kiến" className="col-span-2">
          <FormInput value={formData.cause} placeholder="Lý do hỏng hóc (nếu biết)..." onChange={e => setFormData({...formData, cause: e.target.value})} />
        </FormField>
      </FormSection>

      {/* ASSESSMENT & ACTION */}
      <FormSection title="Đánh giá & Hướng xử lý" icon={History}>
        <FormField label="Đánh giá ban đầu">
          <div className="grid grid-cols-2 gap-2 mt-2">
            {['Hao mòn tự nhiên', 'Do người dùng', 'Sự cố khách quan', 'Chưa xác định'].map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-white transition-all">
                <input type="radio" name="assessment" className="text-primary-600" checked={formData.initialAssessment === opt} onChange={() => setFormData({...formData, initialAssessment: opt})} />
                <span className="text-xs font-bold text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </FormField>
        <FormField label="Hướng xử lý đề xuất">
          <FormSelect value={formData.action} onChange={e => setFormData({...formData, action: e.target.value})}>
            <option value="Vẫn sử dụng được">Vẫn sử dụng được</option>
            <option value="Chuyển sửa chữa">Chuyển sửa chữa</option>
            <option value="Chuyển chờ thanh lý">Chuyển chờ thanh lý</option>
            <option value="Chuyển chờ hủy">Chuyển chờ hủy</option>
          </FormSelect>
        </FormField>
      </FormSection>

      {/* ATTACHMENTS */}
      <FormSection title="Ảnh chụp hiện trạng" icon={AlertTriangle}>
        <AttachmentUploader files={[]} onAdd={() => {}} onRemove={() => {}} />
      </FormSection>

      {/* SIGNATURES */}
      <SignatureBlock roles={['Người báo', 'CVTS', 'Bộ phận chuyên môn/IT']} />
    </BaseFormModal>
  );
};
