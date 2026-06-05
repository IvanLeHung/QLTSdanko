import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Building2, 
  Coins, 
  FileText, 
  Calendar, 
  Activity, 
  Wrench, 
  ShieldAlert, 
  CheckCircle2, 
  ClipboardCheck,
  Loader2,
  Trash,
  FolderOpen,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';

export const ToolDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tool, setTool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'assignments' | 'repairs' | 'lost' | 'inventory' | 'history'>('info');

  const fetchToolDetail = async () => {
    try {
      const res = await api.get(`/tools/${id}`);
      setTool(res.data);
    } catch (err) {
      toast.error("Không thể tải thông tin chi tiết CCDC.");
      navigate('/tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolDetail();
  }, [id]);

  const handleDeleteTool = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Công cụ dụng cụ này? Dữ liệu lịch sử vẫn sẽ được bảo lưu.")) return;
    try {
      await api.delete(`/tools/${id}`);
      toast.success("Xóa CCDC thành công!");
      navigate('/tools');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa CCDC.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Đang tải hồ sơ CCDC...</p>
      </div>
    );
  }

  if (!tool) return null;

  let industryAttributes: Record<string, any> = {};
  if (tool.industryAttributesJson) {
    try {
      industryAttributes = JSON.parse(tool.industryAttributesJson);
    } catch (e) {
      console.error("Lỗi parse industryAttributesJson:", e);
    }
  }

  let operationalSpecs: Record<string, any> = {};
  if (tool.operationalSpecsJson) {
    try {
      operationalSpecs = JSON.parse(tool.operationalSpecsJson);
    } catch (e) {
      console.error("Lỗi parse operationalSpecsJson:", e);
    }
  }

  let filesInfo: Record<string, string> = {};
  if (tool.filesJson) {
    try {
      filesInfo = JSON.parse(tool.filesJson);
    } catch (e) {
      console.error("Lỗi parse filesJson:", e);
    }
  }

  let warrantyInfo: Record<string, any> = {};
  if (tool.warrantyInfoJson) {
    try {
      warrantyInfo = JSON.parse(tool.warrantyInfoJson);
    } catch (e) {
      console.error("Lỗi parse warrantyInfoJson:", e);
    }
  }

  let customFields: Record<string, string> = {};
  if (tool.customFieldsJson) {
    try {
      customFields = JSON.parse(tool.customFieldsJson);
    } catch (e) {
      console.error("Lỗi parse customFieldsJson:", e);
    }
  }

  const attributeLabels: Record<string, string> = {
    applicableBranch: 'Chi nhánh áp dụng',
    placementArea: 'Khu vực đặt',
    maintenanceSchedule: 'Lịch bảo dưỡng',
    usageCount: 'Số lần sử dụng',
    collectionConcept: 'Bộ sưu tập/concept',
    season: 'Mùa vụ',
    clientProject: 'Khách hàng/dự án',
    availableQuantity: 'Số lượng khả dụng',
    postEventCondition: 'Tình trạng sau sự kiện',
    comboKit: 'Bộ combo'
  };

  let statusBadge = 'bg-slate-100 text-slate-700';
  let statusText = tool.status;
  if (tool.status === 'IN_STOCK') {
    statusBadge = 'bg-blue-50 text-blue-700 border-blue-100 border';
    statusText = 'Trong kho';
  } else if (tool.status === 'USING') {
    statusBadge = 'bg-green-50 text-green-700 border-green-100 border';
    statusText = 'Đang dùng';
  } else if (tool.status === 'DAMAGED') {
    statusBadge = 'bg-amber-50 text-amber-700 border-amber-100 border';
    statusText = 'Hỏng';
  } else if (tool.status === 'LOST') {
    statusBadge = 'bg-red-50 text-red-700 border-red-100 border';
    statusText = 'Mất';
  } else if (tool.status === 'LIQUIDATED') {
    statusBadge = 'bg-slate-100 text-slate-500';
    statusText = 'Đã thanh lý';
  }

  return (
    <div className="space-y-6 pb-20 px-4 max-w-6xl mx-auto">
      {/* 1. HEADER PROFILE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/tools')} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-[10px] border-0 bg-transparent cursor-pointer mb-2"
          >
            <ArrowLeft className="mr-1 h-3 w-3" /> Quay lại danh sách
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">{tool.toolName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge}`}>
              {statusText}
            </span>
          </div>
          <p className="font-mono text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Mã CCDC: {tool.toolCode}</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleDeleteTool}
            className="flex items-center gap-2 px-4 py-2 border.5 border-red-200 text-red-650 hover:bg-red-50 rounded-xl text-xs font-bold transition-all bg-white"
          >
            <Trash className="h-4 w-4" /> Xóa CCDC
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. LEFT PANEL: GENERAL METADATA */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="h-4 w-4 text-primary-500" />
            Thông tin chi tiết
          </h3>

          <div className="space-y-4 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Nhóm CCDC</span>
              <span className="text-slate-800 font-bold">{tool.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Loại quản lý</span>
              <span className="text-slate-800 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                {tool.managementType === 'INDIVIDUAL' ? 'Từng mã' : tool.managementType === 'QUANTITY' ? 'Số lượng' : 'Theo bộ'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Số lượng</span>
              <span className="text-slate-800 font-bold">{tool.quantity} {tool.unit}</span>
            </div>
            
            <hr className="border-slate-100" />
            
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tài chính & Mua sắm</h4>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Đơn giá</span>
              <span className="text-slate-800">{(tool.purchasePrice || 0).toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Thuế VAT</span>
              <span className="text-slate-800">{(tool.vat || 0)} %</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Chi phí vận chuyển</span>
              <span className="text-slate-800">{(tool.shippingInstallCost || 0).toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between items-center bg-primary-50/50 p-2 rounded-xl">
              <span className="text-primary-750 font-black uppercase tracking-wider">Tổng giá trị</span>
              <span className="text-primary-850 font-black">{(tool.totalAmount || 0).toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Nguồn hình thành</span>
              <span className="text-slate-800 font-bold">{
                tool.fundingSource === 'MUA_MOI' ? 'Mua mới' :
                tool.fundingSource === 'DIEU_CHUYEN' ? 'Điều chuyển' :
                tool.fundingSource === 'TU_SAN_XUAT' ? 'Tự sản xuất' :
                tool.fundingSource === 'KHACH_HANG_BAN_GIAO' ? 'Khách hàng bàn giao' :
                tool.fundingSource === 'TAI_TRO' ? 'Được tài trợ' : tool.fundingSource || 'Mua mới'
              }</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Ngày mua</span>
              <span className="text-slate-800 font-bold">
                {tool.purchaseDate ? new Date(tool.purchaseDate).toLocaleDateString('vi-VN') : '---'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Hạn dùng dự kiến</span>
              <span className="text-slate-800">{tool.expectedUsefulLife ? `${tool.expectedUsefulLife} tháng` : '---'}</span>
            </div>

            <hr className="border-slate-100" />
            
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Định vị & Phân bổ</h4>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><User className="mr-1 h-3.5 w-3.5 text-slate-400" /> Người sử dụng</span>
              <span className="text-slate-800 font-bold">{tool.currentUserName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><Building2 className="mr-1 h-3.5 w-3.5 text-slate-400" /> Bộ phận sử dụng</span>
              <span className="text-slate-800">{tool.departmentName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><MapPin className="mr-1 h-3.5 w-3.5 text-slate-400" /> Công ty thành viên</span>
              <span className="text-slate-800 font-bold">{tool.companyName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Chi nhánh / T.Phố</span>
              <span className="text-slate-850 font-medium">{tool.branchName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tòa nhà / Dự án</span>
              <span className="text-slate-850 font-medium">{tool.buildingName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tầng / Vị trí</span>
              <span className="text-slate-850 font-medium">{tool.floorName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Khu vực / Phòng</span>
              <span className="text-slate-850 font-medium">{tool.areaName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Vị trí chi tiết</span>
              <span className="text-slate-850 truncate max-w-[150px]">{tool.specificLocation || '---'}</span>
            </div>

            {Object.keys(industryAttributes).length > 0 && (
              <>
                <hr className="border-slate-100" />
                <div className="space-y-3">
                  <span className="text-primary-600 font-black text-[10px] uppercase tracking-widest block">Thuộc tính đặc thù ngành</span>
                  <div className="space-y-2">
                    {Object.keys(industryAttributes).map((key) => {
                      const label = attributeLabels[key] || key;
                      let val = industryAttributes[key];
                      if (key === 'maintenanceSchedule' && val) {
                        val = new Date(val).toLocaleDateString('vi-VN');
                      }
                      return (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">{label}</span>
                          <span className="text-slate-800 font-black bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <hr className="border-slate-100" />

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Tình trạng ban đầu</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">{tool.initialCondition || 'Mới 100%'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block">Ghi chú</span>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">{tool.note || 'Không có ghi chú.'}</p>
            </div>
          </div>
        </div>

        {/* 3. RIGHT PANEL: LIFECYCLE HISTORY TABS */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <button 
              onClick={() => setActiveTab('info')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'info' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Tổng quan
            </button>
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'assignments' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Cấp phát ({tool.assignments?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('repairs')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'repairs' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Sửa chữa ({tool.repairTickets?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('lost')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'lost' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Báo mất/Hỏng ({tool.lostReports?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'inventory' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Kiểm kê ({tool.inventoryItems?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-5 py-4 border-b-2 font-black transition-all shrink-0 ${activeTab === 'history' ? 'border-primary-600 text-primary-700 bg-white' : 'border-transparent hover:text-slate-900 hover:bg-slate-100/50'}`}
            >
              Nhật ký ({tool.histories?.length || 0})
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto min-h-[400px]">
            
            {/* TAB: GENERAL OVERVIEW */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người dùng hiện tại</p>
                    <p className="text-[16px] font-black text-slate-800 mt-1">{tool.currentUserName || 'KHO CCDC'}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời gian bàn giao</p>
                    <p className="text-[16px] font-black text-slate-800 mt-1">
                      {tool.handoverDate ? new Date(tool.handoverDate).toLocaleDateString('vi-VN') : '---'}
                    </p>
                  </div>
                </div>

                {/* DYNAMIC SPECS SECTION */}
                {Object.keys(operationalSpecs).length > 0 && (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-primary-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary-500" />
                      Thông số vận hành đặc thù
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                      {operationalSpecs.usageCount !== undefined && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số lần đã sử dụng</p>
                          <p className="text-slate-800 font-black text-sm mt-0.5">{operationalSpecs.usageCount} lần</p>
                        </div>
                      )}
                      {operationalSpecs.maxUsageCount !== undefined && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số lần sử dụng tối đa</p>
                          <p className="text-slate-800 font-black text-sm mt-0.5">{operationalSpecs.maxUsageCount} lần</p>
                        </div>
                      )}
                      {operationalSpecs.lastUsedDate && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngày dùng gần nhất</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">
                            {new Date(operationalSpecs.lastUsedDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      )}
                      {operationalSpecs.comboKitName && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tên bộ / combo</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.comboKitName}</p>
                        </div>
                      )}
                      {operationalSpecs.collectionConcept && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Concept / Bộ sưu tập</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.collectionConcept}</p>
                        </div>
                      )}
                      {operationalSpecs.season && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mùa vụ áp dụng</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.season}</p>
                        </div>
                      )}
                      {operationalSpecs.capacity && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dung tích</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.capacity}</p>
                        </div>
                      )}
                      {operationalSpecs.material && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chất liệu</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.material}</p>
                        </div>
                      )}
                      {operationalSpecs.color && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Màu sắc</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.color}</p>
                        </div>
                      )}
                      {operationalSpecs.size && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kích thước</p>
                          <p className="text-slate-800 font-bold text-sm mt-0.5">{operationalSpecs.size}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WARRANTY INFO SECTION */}
                {Object.keys(warrantyInfo).length > 0 && (warrantyInfo.warrantyMonths || warrantyInfo.warrantyProvider) && (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      Thông tin bảo hành sản phẩm
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hạn bảo hành</p>
                        <p className="text-slate-800 font-bold text-sm mt-0.5">{warrantyInfo.warrantyMonths ? `${warrantyInfo.warrantyMonths} tháng` : '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đơn vị bảo hành</p>
                        <p className="text-slate-800 font-bold text-sm mt-0.5">{warrantyInfo.warrantyProvider || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SĐT Hỗ trợ kỹ thuật</p>
                        <p className="text-slate-800 font-bold text-sm mt-0.5">{warrantyInfo.warrantyPhone || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ghi chú bảo hành</p>
                        <p className="text-slate-800 font-medium text-xs mt-0.5">{warrantyInfo.warrantyNote || '---'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ATTACHED FILES SECTION */}
                {Object.keys(filesInfo).length > 0 && Object.values(filesInfo).some(Boolean) && (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-emerald-850 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Hồ sơ tài liệu đính kèm
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {filesInfo.avatarUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-3">
                          <img src={filesInfo.avatarUrl} alt="Avatar CCDC" className="w-12 h-12 object-cover rounded-lg border" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ảnh đại diện CCDC</p>
                            <a href={filesInfo.avatarUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary-600 hover:underline">Xem trực tiếp</a>
                          </div>
                        </div>
                      )}
                      {filesInfo.photoUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-3">
                          <img src={filesInfo.photoUrl} alt="Ảnh thực tế" className="w-12 h-12 object-cover rounded-lg border" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ảnh thực tế sản phẩm</p>
                            <a href={filesInfo.photoUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary-600 hover:underline">Xem trực tiếp</a>
                          </div>
                        </div>
                      )}
                      {filesInfo.invoiceUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2 text-xs font-semibold">
                          <FileText className="w-6 h-6 text-slate-450" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hóa đơn mua hàng / VAT</p>
                            <a href={filesInfo.invoiceUrl} target="_blank" rel="noreferrer" className="font-bold text-primary-600 hover:underline">Tải xuống / Xem file</a>
                          </div>
                        </div>
                      )}
                      {filesInfo.warrantyCardUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2 text-xs font-semibold">
                          <FileText className="w-6 h-6 text-slate-450" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thẻ bảo hành đính kèm</p>
                            <a href={filesInfo.warrantyCardUrl} target="_blank" rel="noreferrer" className="font-bold text-primary-600 hover:underline">Tải xuống / Xem file</a>
                          </div>
                        </div>
                      )}
                      {filesInfo.manualUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2 text-xs font-semibold">
                          <FileText className="w-6 h-6 text-slate-450" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hướng dẫn sử dụng (HDSD)</p>
                            <a href={filesInfo.manualUrl} target="_blank" rel="noreferrer" className="font-bold text-primary-600 hover:underline">Tải xuống / Xem file</a>
                          </div>
                        </div>
                      )}
                      {filesInfo.documentUrl && (
                        <div className="border border-slate-200 rounded-xl p-3 bg-white flex items-center gap-2 text-xs font-semibold">
                          <FileText className="w-6 h-6 text-slate-450" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tài liệu đính kèm khác</p>
                            <a href={filesInfo.documentUrl} target="_blank" rel="noreferrer" className="font-bold text-primary-600 hover:underline">Tải xuống / Xem file</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CUSTOM FIELDS SECTION */}
                {Object.keys(customFields).length > 0 && (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-slate-500" />
                      Thuộc tính mở rộng tự định nghĩa
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                      {Object.keys(customFields).map(key => (
                        <div key={key} className="bg-white border p-3 rounded-xl border-slate-200">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{key}</p>
                          <p className="text-slate-800 font-black text-sm mt-0.5">{customFields[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Biến động trạng thái gần nhất</h4>
                  <div className="space-y-3">
                    {tool.histories?.slice(0, 3).map((h: any) => (
                      <div key={h.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                        <Activity className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{h.oldStatus} &rarr; {h.newStatus}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{h.oldNote}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{new Date(h.eventTime).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    ))}
                    {(!tool.histories || tool.histories.length === 0) && (
                      <p className="text-xs font-semibold text-slate-400">Chưa ghi nhận biến động nào.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                {tool.assignments?.map((a: any) => (
                  <div key={a.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <User className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Bàn giao cho: <span className="underline">{a.newUserName}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">Bộ phận: {a.newDepartmentName || '---'} | Vị trí: {a.newLocationName || '---'}</p>
                      {a.note && <p className="text-[11px] bg-white border border-slate-200 p-2 rounded-lg text-slate-600 mt-2">{a.note}</p>}
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                        Hiệu lực từ: {new Date(a.effectiveAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
                {(!tool.assignments || tool.assignments.length === 0) && (
                  <div className="text-center py-12 text-slate-400 space-y-1">
                    <User className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">Chưa có lịch sử bàn giao cho nhân sự nào.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: REPAIR TICKETS */}
            {activeTab === 'repairs' && (
              <div className="space-y-4">
                {tool.repairTickets?.map((r: any) => (
                  <div key={r.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <Wrench className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-bold text-slate-800">Mã phiếu: {r.repairCode}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>{r.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Mô tả sự cố: {r.damageDescription}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3 bg-white p-3 rounded-xl border border-slate-100 text-[11px]">
                        <p className="text-slate-500">Người báo hỏng: <span className="font-bold text-slate-700">{r.reportedBy}</span></p>
                        <p className="text-slate-500">Chi phí thực tế: <span className="font-bold text-slate-700">{(r.actualCost || 0).toLocaleString()} VNĐ</span></p>
                      </div>
                      {r.repairAction && <p className="text-[11px] bg-white border border-slate-200 p-2 rounded-lg text-slate-600 mt-2">Phương án sửa: {r.repairAction}</p>}
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                        Ngày báo: {new Date(r.reportedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
                {(!tool.repairTickets || tool.repairTickets.length === 0) && (
                  <div className="text-center py-12 text-slate-400 space-y-1">
                    <Wrench className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">Chưa có phiếu sửa chữa nào được tạo.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LOST / DAMAGE REPORTS */}
            {activeTab === 'lost' && (
              <div className="space-y-4">
                {tool.lostReports?.map((l: any) => (
                  <div key={l.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-bold text-slate-800">Phiếu báo mất: {l.lostCode}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">{l.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Sự việc: {l.incidentDescription}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3 bg-white p-3 rounded-xl border border-slate-100 text-[11px]">
                        <p className="text-slate-500">Người báo: <span className="font-bold text-slate-700">{l.reportedBy || '---'}</span></p>
                        <p className="text-slate-500">Khấu hao bồi thường: <span className="font-bold text-slate-700">{(l.remainingValue || 0).toLocaleString()} VNĐ</span></p>
                      </div>
                      {l.compensationNote && <p className="text-[11px] bg-white border border-slate-200 p-2 rounded-lg text-slate-600 mt-2">Bồi hoàn: {l.compensationNote}</p>}
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                        Ngày xảy ra: {new Date(l.reportedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
                {(!tool.lostReports || tool.lostReports.length === 0) && (
                  <div className="text-center py-12 text-slate-400 space-y-1">
                    <ShieldAlert className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">CCDC hoạt động bình thường, chưa bị báo mất.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: INVENTORY ITEMS */}
            {activeTab === 'inventory' && (
              <div className="space-y-4">
                {tool.inventoryItems?.map((item: any) => (
                  <div key={item.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <ClipboardCheck className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-bold text-slate-800">
                          Phiếu kiểm kê: {item.inventoryCheck?.inventoryName || 'Định kỳ'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.result === 'MATCHED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{item.result === 'MATCHED' ? 'Khớp' : 'Sai lệch'}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-semibold">Tình trạng thực tế kiểm: {item.actualStatus || '---'}</p>
                      <p className="text-[11px] text-slate-500">Mô tả kiểm kê: {item.note || 'Không có ghi chú'}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                        Kiểm ngày: {item.checkedAt ? new Date(item.checkedAt).toLocaleDateString('vi-VN') : '---'} bởi {item.checkedBy || '---'}
                      </p>
                    </div>
                  </div>
                ))}
                {(!tool.inventoryItems || tool.inventoryItems.length === 0) && (
                  <div className="text-center py-12 text-slate-400 space-y-1">
                    <ClipboardCheck className="h-8 w-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold">CCDC chưa từng được đưa vào đợt kiểm kê nào.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LOGS / HISTORIES */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {tool.histories?.map((h: any) => (
                  <div key={h.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                    <Activity className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Hành động: {h.actionType}</h4>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">
                        Thay đổi trạng thái: [ {h.oldStatus || 'NONE'} ] &rarr; [ {h.newStatus || 'NONE'} ]
                      </p>
                      {h.oldNote && <p className="text-[11px] text-slate-600 mt-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-200">{h.oldNote}</p>}
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                        Ghi nhận lúc: {new Date(h.eventTime).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
