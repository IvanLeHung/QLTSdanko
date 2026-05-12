import React, { useState } from 'react';
import { BaseFormModal, FormSection, FormField, FormInput, FormSelect, FormTextArea } from './BaseFormModal';
import { AssetItemsTable, AttachmentUploader, SignatureBlock } from './FormComponents';
import { ClipboardCheck, Wrench, Package, Search, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

// --- BM09: Biên bản kiểm tra hiện trạng ---
export const BM09InspectionModal: React.FC<any> = ({ isOpen, onClose, onSubmit, asset, businessType = 'Kiểm tra định kỳ' }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentNo: `BM09-${new Date().getFullYear()}${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    inspector: 'Nhân viên QLTS',
    businessType,
    checklist: {
      hasTag: true,
      correctSerial: true,
      hasAccessories: true,
      normalAppearance: true,
      hasDamage: false,
    },
    finding: '',
    proposedAction: 'Tiếp tục sử dụng'
  });

  return (
    <BaseFormModal
      isOpen={isOpen} onClose={onClose} formCode="BM09/QLTS" title="Biên bản kiểm tra hiện trạng"
      documentNo={formData.documentNo} date={formData.date} onConfirm={() => onSubmit(formData)}
      isCompleted={formData.status === 'COMPLETED'}
    >
      <FormSection title="Thông tin tài sản" icon={Search}>
        <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài sản</p>
            <p className="text-sm font-black text-slate-800">{asset?.assetName} ({asset?.assetCode})</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nghiệp vụ liên quan</p>
            <p className="text-sm font-bold text-primary-600 uppercase">{formData.businessType}</p>
          </div>
        </div>
      </FormSection>
      <FormSection title="Checklist hiện trạng" icon={ClipboardCheck}>
        <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
           {Object.keys(formData.checklist).map(key => (
             <label key={key} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" className="w-5 h-5 rounded-lg text-primary-600" defaultChecked={(formData.checklist as any)[key]} />
                <span className="text-xs font-bold text-slate-700">{(key === 'hasTag' ? 'Có tem tài sản' : key === 'correctSerial' ? 'Đúng serial' : key === 'hasAccessories' ? 'Đủ phụ kiện' : key === 'normalAppearance' ? 'Ngoại quan bình thường' : 'Có hư hỏng')}</span>
             </label>
           ))}
        </div>
      </FormSection>
      <FormSection title="Kết luận & Đề xuất" icon={ShieldCheck}>
        <FormField label="Tình trạng thực tế / Phát hiện" className="col-span-2">
           <FormTextArea placeholder="Mô tả chi tiết tình trạng..." />
        </FormField>
        <FormField label="Hướng xử lý">
           <FormSelect>
              <option>Tiếp tục sử dụng</option>
              <option>Chuyển sửa chữa</option>
              <option>Thu hồi về kho</option>
              <option>Thanh lý</option>
           </FormSelect>
        </FormField>
      </FormSection>
      <FormSection title="Ảnh xác minh" icon={Package}>
        <AttachmentUploader files={[]} onAdd={()=>{}} onRemove={()=>{}} />
      </FormSection>
      <SignatureBlock roles={['Người kiểm tra', 'Người giữ tài sản', 'CVTS']} />
    </BaseFormModal>
  );
};

// --- BM10: Biên bản bảo dưỡng và sửa chữa ---
export const BM10MaintenanceModal: React.FC<any> = ({ isOpen, onClose, onSubmit, ticket, asset }) => {
  return (
    <BaseFormModal
      isOpen={isOpen} onClose={onClose} formCode="BM10/QLTS" title="Biên bản bảo dưỡng và sửa chữa"
      documentNo={ticket?.repairCode} date={new Date().toLocaleDateString('vi-VN')} onConfirm={() => onSubmit({})}
      isCompleted={ticket?.status === 'COMPLETED'}
    >
      <FormSection title="Thông tin sửa chữa" icon={Wrench}>
        <FormField label="Mã phiếu">
          <FormInput value={ticket?.repairCode} readOnly />
        </FormField>
        <FormField label="Loại xử lý">
          <FormSelect defaultValue="Sửa chữa">
            <option>Sửa chữa</option>
            <option>Bảo dưỡng định kỳ</option>
            <option>Nâng cấp</option>
            <option>Bảo hành</option>
          </FormSelect>
        </FormField>
        <FormField label="Đơn vị sửa chữa">
          <FormInput placeholder="Tên đơn vị, NCC..." value={ticket?.repairVendor} />
        </FormField>
        <FormField label="Chi phí thực tế">
          <FormInput type="number" placeholder="0" value={ticket?.actualCost} />
        </FormField>
      </FormSection>
      
      <FormSection title="Nghiệm thu sửa chữa" icon={ClipboardCheck}>
        <FormField label="Kết quả nghiệm thu">
          <FormSelect>
             <option>Đạt - Hoạt động tốt</option>
             <option>Không đạt - Cần sửa lại</option>
             <option>Hỏng nặng - Chuyển thanh lý</option>
          </FormSelect>
        </FormField>
        <FormField label="Ngày nghiệm thu">
          <FormInput type="date" defaultValue={new Date().toISOString().split('T')[0]} />
        </FormField>
        <FormField label="Chi tiết nghiệm thu" className="col-span-2">
          <FormTextArea placeholder="Ghi chú về linh kiện thay thế, tình trạng sau sửa..." />
        </FormField>
      </FormSection>
      
      <FormSection title="Ảnh trước & sau sửa" icon={Package}>
        <AttachmentUploader files={[]} onAdd={()=>{}} onRemove={()=>{}} />
      </FormSection>
      <SignatureBlock roles={['CVTS', 'Đơn vị sửa chữa', 'Người nghiệm thu', 'Người nhận lại TS']} />
    </BaseFormModal>
  );
};

// --- BM12: Biên bản kiểm kê tài sản ---
export const BM12InventoryModal: React.FC<any> = ({ isOpen, onClose, onSubmit, period }) => {
  return (
    <BaseFormModal
      isOpen={isOpen} onClose={onClose} formCode="BM12/QLTS" title="Biên bản kiểm kê tài sản"
      documentNo={period?.code || 'INV-2025'} maxWidth="max-w-[1050px]" onConfirm={() => onSubmit({})}
      isCompleted={period?.status === 'COMPLETED'}
    >
      <FormSection title="Thông tin kỳ kiểm kê" icon={Clock}>
        <FormField label="Tên kỳ kiểm kê">
          <FormInput value={period?.name || 'Kiểm kê định kỳ 2025'} readOnly />
        </FormField>
        <FormField label="Phạm vi">
          <FormInput value={period?.scope || 'Toàn bộ công ty'} readOnly />
        </FormField>
      </FormSection>
      
      <FormSection title="Danh sách tài sản kiểm kê" icon={Package} className="md:grid-cols-1">
        <AssetItemsTable items={[]} columns={['Mã TS', 'Tên TS', 'Sổ sách', 'Thực tế', 'Chênh lệch']} />
      </FormSection>
      
      <FormSection title="Kết quả tổng hợp" icon={ClipboardCheck}>
        <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: 'Tổng số TS', val: 0, color: 'text-slate-800' },
             { label: 'Khớp', val: 0, color: 'text-emerald-600' },
             { label: 'Chênh lệch', val: 0, color: 'text-rose-600' },
             { label: 'Hỏng/Sự cố', val: 0, color: 'text-amber-600' },
           ].map(stat => (
             <div key={stat.label} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
             </div>
           ))}
        </div>
      </FormSection>
      
      <FormSection title="Kiến nghị xử lý" icon={ShieldCheck}>
        <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
           {['Điều chuyển lại', 'Báo hỏng / Sửa chữa', 'Báo mất TS', 'Thanh lý / Hủy', 'Truy thu trách nhiệm', 'Cập nhật sổ sách'].map(act => (
             <label key={act} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" className="w-5 h-5 rounded-lg text-primary-600" />
                <span className="text-xs font-bold text-slate-700">{act}</span>
             </label>
           ))}
        </div>
      </FormSection>
      <SignatureBlock roles={['Ban kiểm kê', 'CVTS', 'Kế toán', 'Đại diện bộ phận']} />
    </BaseFormModal>
  );
};
