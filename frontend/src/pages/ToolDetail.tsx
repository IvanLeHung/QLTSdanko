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
  Trash
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
              <span className="text-slate-400 font-bold uppercase tracking-wider">Số lượng</span>
              <span className="text-slate-800 font-bold">{tool.quantity} {tool.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Giá trị mua</span>
              <span className="text-slate-800 font-bold">{(tool.purchasePrice || 0).toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Ngày mua</span>
              <span className="text-slate-800 font-bold">
                {tool.purchaseDate ? new Date(tool.purchaseDate).toLocaleDateString('vi-VN') : '---'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Nhà cung cấp</span>
              <span className="text-slate-800 truncate max-w-[150px]">{tool.supplierName || '---'}</span>
            </div>

            <hr className="border-slate-100" />

            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><User className="mr-1 h-3.5 w-3.5 text-slate-400" /> Người sử dụng</span>
              <span className="text-slate-800 font-bold">{tool.currentUserName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><Building2 className="mr-1 h-3.5 w-3.5 text-slate-400" /> Bộ phận quản lý</span>
              <span className="text-slate-800">{tool.departmentName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center"><MapPin className="mr-1 h-3.5 w-3.5 text-slate-400" /> Kho / Vị trí</span>
              <span className="text-slate-800 truncate max-w-[150px]">{tool.locationName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tỉnh / Thành phố</span>
              <span className="text-slate-800">{tool.cityName || '---'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Ngày bàn giao</span>
              <span className="text-slate-800">
                {tool.handoverDate ? new Date(tool.handoverDate).toLocaleDateString('vi-VN') : '---'}
              </span>
            </div>

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
