import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Search, Play, Check, X, Edit2, AlertTriangle, ShieldCheck, Download, Loader2, ArrowRight, ClipboardList } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface NormalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: number;
  activeSessionName?: string;
  currentFilters?: any;
}

const ISSUE_TYPES_META = [
  { id: 'MISSING_CODE', label: 'Thiếu mã tài sản', desc: 'Mã tài sản bị trống' },
  { id: 'DUPLICATE_CODE', label: 'Trùng mã tài sản', desc: 'Nhiều tài sản có cùng mã' },
  { id: 'MISSING_NAME', label: 'Thiếu tên tài sản', desc: 'Tên tài sản bị trống' },
  { id: 'WRONG_NAME', label: 'Tên tài sản chưa chuẩn', desc: 'Tên viết thường, sai định dạng hãng' },
  { id: 'WRONG_CATEGORY', label: 'Sai nhóm tài sản', desc: 'Nhóm tài sản không khớp với mô tả tên' },
  { id: 'MISSING_DEPARTMENT', label: 'Thiếu phòng ban', desc: 'Không có bộ phận sử dụng' },
  { id: 'MISSING_LOCATION', label: 'Thiếu vị trí', desc: 'Có bộ phận sử dụng nhưng thiếu địa điểm chi tiết' },
  { id: 'MISSING_USER', label: 'Thiếu người sử dụng', desc: 'Trạng thái là cấp phát nhưng trống tên nhân viên' },
  { id: 'WRONG_STATUS', label: 'Sai trạng thái sử dụng', desc: 'Không khớp giữa người dùng và tình trạng kho' },
  { id: 'MISSING_SERIAL', label: 'Thiếu số Serial', desc: 'Số serial máy bị trống' },
  { id: 'WRONG_ABBREVIATION', label: 'Viết tắt không thống nhất', desc: 'Bộ phận/vị trí viết tắt (ví dụ: HCNS, KT, IT)' }
];

export const NormalizationModal: React.FC<NormalizationModalProps> = ({
  isOpen,
  onClose,
  activeSessionId,
  activeSessionName,
  currentFilters
}) => {
  const [step, setStep] = useState<'CONFIG' | 'PROGRESS' | 'RESULTS'>('CONFIG');
  const [scopeType, setScopeType] = useState<'ALL' | 'SESSION' | 'FILTERED'>('ALL');
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>(ISSUE_TYPES_META.map(m => m.id));
  
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('PENDING');
  const [progress, setProgress] = useState<number>(0);
  const [totalIssues, setTotalIssues] = useState<number>(0);
  const [scanResultStats, setScanResultStats] = useState<any>({
    missingInfo: 0,
    wrongCategory: 0,
    duplicateCode: 0,
    mismatchScope: 0,
    nameNotStandard: 0
  });

  // Suggestions Table State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Edit State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('Điều chỉnh đề xuất thủ công');

  // History Log State
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [totalHistory, setTotalHistory] = useState<number>(0);

  // Initialize scope selection based on active session
  useEffect(() => {
    if (activeSessionId) {
      setScopeType('SESSION');
    } else if (currentFilters && Object.keys(currentFilters).length > 0) {
      setScopeType('FILTERED');
    } else {
      setScopeType('ALL');
    }
  }, [activeSessionId, currentFilters]);

  // Poll Job Status in PROGRESS step
  useEffect(() => {
    let timer: any = null;
    if (step === 'PROGRESS' && jobId) {
      const checkStatus = async () => {
        try {
          const res = await api.get(`/normalization/jobs/${jobId}`);
          setProgress(res.data.progress);
          setJobStatus(res.data.status);
          if (res.data.status === 'COMPLETED') {
            setTotalIssues(res.data.totalIssues);
            setStep('RESULTS');
            fetchSuggestions(1);
          } else if (res.data.status === 'FAILED') {
            toast.error(`Rà soát thất bại: ${res.data.reason || 'Lỗi không rõ'}`);
            setStep('CONFIG');
          }
        } catch (err) {
          console.error(err);
        }
      };

      timer = setInterval(checkStatus, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, jobId]);

  const startScan = async () => {
    if (selectedIssueTypes.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một loại lỗi để rà soát!");
      return;
    }

    try {
      setStep('PROGRESS');
      setProgress(5);
      setJobStatus('PENDING');

      const payload = {
        scopeType,
        sessionId: scopeType === 'SESSION' ? activeSessionId : undefined,
        filters: scopeType === 'FILTERED' ? currentFilters : undefined,
        issueTypes: selectedIssueTypes
      };

      const res = await api.post('/normalization/jobs', payload);
      setJobId(res.data.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi bắt đầu rà soát dữ liệu");
      setStep('CONFIG');
    }
  };

  const fetchSuggestions = async (targetPage = 1) => {
    if (!jobId) return;
    try {
      const res = await api.get(`/normalization/jobs/${jobId}/suggestions`, {
        params: {
          page: targetPage,
          limit,
          issueType: filterType || undefined,
          status: filterStatus || undefined,
          search: searchQuery || undefined
        }
      });
      setSuggestions(res.data.items);
      setTotalItems(res.data.total);
      setPage(targetPage);
      setSelectedIds([]);

      // Compute statistics based on total issues
      const pendingRes = await api.get(`/normalization/jobs/${jobId}/suggestions`, {
        params: { limit: 1000, status: 'PENDING' }
      });
      const items: any[] = pendingRes.data.items || [];
      const stats = {
        missingInfo: items.filter(i => ['MISSING_CODE', 'MISSING_NAME', 'MISSING_DEPARTMENT', 'MISSING_LOCATION', 'MISSING_USER', 'MISSING_SERIAL'].includes(i.issueType)).length,
        wrongCategory: items.filter(i => i.issueType === 'WRONG_CATEGORY').length,
        duplicateCode: items.filter(i => i.issueType === 'DUPLICATE_CODE').length,
        mismatchScope: items.filter(i => i.issueType === 'WRONG_ABBREVIATION').length,
        nameNotStandard: items.filter(i => i.issueType === 'WRONG_NAME').length
      };
      setScanResultStats(stats);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách đề xuất chuẩn hóa");
    }
  };

  const handleUpdateSuggestion = async () => {
    if (!editingItem) return;
    try {
      await api.put(`/normalization/suggestions/${editingItem.id}`, {
        suggestedValue: editedValue,
        reason: editReason
      });
      toast.success("Cập nhật giá trị đề xuất thành công");
      setEditingItem(null);
      fetchSuggestions(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi sửa đổi đề xuất");
    }
  };

  const approveItems = async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const res = await api.post('/normalization/suggestions/approve-bulk', { ids });
      toast.success(`Đã duyệt thành công ${res.data.approvedCount} đề xuất chuẩn hóa!`);
      fetchSuggestions(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi phê duyệt chuẩn hóa");
    }
  };

  const rejectItems = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn từ chối ${ids.length} đề xuất chuẩn hóa đã chọn?`)) return;
    try {
      await api.post('/normalization/suggestions/reject-bulk', { ids });
      toast.success("Đã từ chối các đề xuất thành công");
      fetchSuggestions(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi từ chối đề xuất");
    }
  };

  // Bulk Approve Safe suggestions (confidence >= 0.95 and not sensitive fields)
  const approveSafeIssues = async () => {
    if (!jobId) return;
    try {
      // Fetch all pending suggestions
      const res = await api.get(`/normalization/jobs/${jobId}/suggestions`, {
        params: { limit: 1000, status: 'PENDING' }
      });
      const items: any[] = res.data.items || [];
      const safeIds = items
        .filter(i => i.confidenceScore >= 0.95 && !['currentUserName', 'departmentName', 'status'].includes(i.fieldName))
        .map(i => i.id);

      if (safeIds.length === 0) {
        toast.info("Không tìm thấy lỗi nào đủ độ tin cậy an toàn (>= 95%) để tự động duyệt!");
        return;
      }

      if (!window.confirm(`Tìm thấy ${safeIds.length} lỗi có độ tin cậy cao (ví dụ: lỗi viết thường, lỗi viết tắt rõ ràng). Bạn có đồng ý duyệt hàng loạt không?`)) return;

      await approveItems(safeIds);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lọc duyệt tự động");
    }
  };

  const fetchHistoryLogs = async (targetPage = 1) => {
    try {
      const res = await api.get('/normalization/history', {
        params: { page: targetPage, limit: 10 }
      });
      setHistoryLogs(res.data.items);
      setTotalHistory(res.data.total);
      setHistoryPage(targetPage);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (suggestions.length === 0) return;
    let csv = "\uFEFFMã tài sản,Tên tài sản,Loại lỗi,Trường dữ liệu,Giá trị hiện tại,Giá trị đề xuất,Độ tin cậy,Trạng thái\n";
    suggestions.forEach(s => {
      csv += `"${s.assetCode}","${s.assetName}","${s.issueType}","${s.fieldName}","${s.currentValue || ''}","${s.suggestedValue || ''}","${Math.floor(s.confidenceScore * 100)}%","${s.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `bao_cao_chuan_hoa_${jobId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectAll = () => {
    const pendings = suggestions.filter(s => s.status === 'PENDING' || s.status === 'EDITED').map(s => s.id);
    if (selectedIds.length === pendings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendings);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="detail"
      title={
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-primary-650" />
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Rà soát & Chuẩn hóa dữ liệu tài sản</h1>
            <p className="text-xs text-slate-400 font-bold">Chuẩn hóa dữ liệu sổ sách trước khi tiến hành đối soát kiểm kê</p>
          </div>
        </div>
      }
      headerActions={
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistoryLogs(1);
          }}
          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          {showHistory ? "Quay lại rà soát" : "Lịch sử chuẩn hóa"}
        </button>
      }
    >
      {showHistory ? (
        // HISTORY LOG VIEW
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Nhật ký chuẩn hóa dữ liệu tài sản</h2>
          </div>
          <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID tài sản</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trường thay đổi</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Giá trị cũ</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Giá trị mới</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Người duyệt</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thời gian</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {historyLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40">
                    <td className="p-4 font-bold text-slate-800">#{log.assetId}</td>
                    <td className="p-4 font-mono text-primary-650">{log.fieldName}</td>
                    <td className="p-4 line-through text-slate-400">{log.oldValue || 'Trống'}</td>
                    <td className="p-4 text-emerald-600 font-bold">{log.finalValue || 'Trống'}</td>
                    <td className="p-4 text-slate-700">{log.approvedBy}</td>
                    <td className="p-4 text-[10px] text-slate-400">{new Date(log.approvedAt).toLocaleString('vi-VN')}</td>
                    <td className="p-4 italic text-slate-500">{log.reason || '-'}</td>
                  </tr>
                ))}
                {historyLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">Chưa có lịch sử chuẩn hóa nào được thực hiện</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>Tổng số bản ghi: {totalHistory}</span>
            <div className="flex gap-2">
              <button
                disabled={historyPage === 1}
                onClick={() => fetchHistoryLogs(historyPage - 1)}
                className="px-3 py-1 bg-slate-50 rounded-lg border hover:bg-slate-100 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={historyPage * 10 >= totalHistory}
                onClick={() => fetchHistoryLogs(historyPage + 1)}
                className="px-3 py-1 bg-slate-50 rounded-lg border hover:bg-slate-100 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      ) : step === 'CONFIG' ? (
        // STEP 1: CONFIGURE SCAN PARAMETERS
        <div className="space-y-6 py-2">
          {/* Configure Scope selection */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-150 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">1. Lựa chọn phạm vi rà soát dữ liệu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`p-4 border rounded-2xl cursor-pointer select-none flex flex-col justify-between transition-all ${scopeType === 'ALL' ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input type="radio" checked={scopeType === 'ALL'} onChange={() => setScopeType('ALL')} className="sr-only" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Toàn bộ kho tài sản</span>
                <span className="text-[10px] text-slate-400 mt-2 font-bold">Rà soát tất cả tài sản đang quản lý trên hệ thống</span>
              </label>

              <label className={`p-4 border rounded-2xl cursor-pointer select-none flex flex-col justify-between transition-all ${scopeType === 'SESSION' ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 bg-white hover:border-slate-300'} ${!activeSessionId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input type="radio" checked={scopeType === 'SESSION'} onChange={() => activeSessionId && setScopeType('SESSION')} disabled={!activeSessionId} className="sr-only" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Theo phiên hiện tại</span>
                <span className="text-[10px] text-slate-400 mt-2 font-bold">{activeSessionName || 'Không có phiên kiểm kê nào đang mở'}</span>
              </label>

              <label className={`p-4 border rounded-2xl cursor-pointer select-none flex flex-col justify-between transition-all ${scopeType === 'FILTERED' ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 bg-white hover:border-slate-300'} ${!currentFilters ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input type="radio" checked={scopeType === 'FILTERED'} onChange={() => currentFilters && setScopeType('FILTERED')} disabled={!currentFilters} className="sr-only" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Theo bộ lọc đang chọn</span>
                <span className="text-[10px] text-slate-400 mt-2 font-bold">Lọc theo các tiêu chí đang hiển thị trên bảng dữ liệu</span>
              </label>
            </div>
          </div>

          {/* Toggle list of Issue Types */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">2. Các lỗi hệ thống cần tự nhận diện</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIssueTypes(ISSUE_TYPES_META.map(m => m.id))} className="text-[10px] font-black text-primary-650 hover:underline uppercase tracking-wide cursor-pointer">Chọn tất cả</button>
                <button type="button" onClick={() => setSelectedIssueTypes([])} className="text-[10px] font-black text-slate-450 hover:underline uppercase tracking-wide cursor-pointer">Bỏ chọn hết</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ISSUE_TYPES_META.map(item => {
                const checked = selectedIssueTypes.includes(item.id);
                return (
                  <label key={item.id} className={`p-3 border rounded-xl flex items-start space-x-3 cursor-pointer transition-all select-none hover:bg-slate-50 ${checked ? 'border-slate-300 bg-slate-50/40 shadow-inner' : 'border-slate-200 bg-white'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setSelectedIssueTypes(selectedIssueTypes.filter(id => id !== item.id));
                        } else {
                          setSelectedIssueTypes([...selectedIssueTypes, item.id]);
                        }
                      }}
                      className="rounded border-slate-300 text-primary-650 focus:ring-primary-500 h-4.5 w-4.5 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-700 tracking-tight">{item.label}</span>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={startScan}
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Play className="h-4 w-4" /> Bắt đầu rà soát dữ liệu
            </button>
          </div>
        </div>
      ) : step === 'PROGRESS' ? (
        // STEP 2: ACTIVE SCAN PROGRESS VIEW
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <Loader2 className="h-12 w-12 text-primary-650 animate-spin" />
          <div className="text-center space-y-2 max-w-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hệ thống đang rà soát dữ liệu tài sản...</h3>
            <p className="text-xs font-bold text-slate-400 leading-relaxed">
              Nhận diện lỗi, đối chiếu dữ liệu phòng ban, định dạng viết hoa của thương hiệu máy tính/thiết bị văn phòng.
            </p>
          </div>
          
          <div className="w-full max-w-md bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-primary-650 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-500 tracking-wider">{progress}% hoàn thành (Trạng thái: {jobStatus})</span>

          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full mt-8">
            Có thể đóng popup, công việc vẫn sẽ chạy ngầm trên máy chủ
          </p>
        </div>
      ) : (
        // STEP 3: RESULTS AND INTERACTIVE TABLE SCREEN
        <div className="space-y-6 py-2 flex flex-col h-full">
          {/* Header statistics grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thiếu thông tin</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{scanResultStats.missingInfo}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sai danh mục</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{scanResultStats.wrongCategory}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trùng mã tài sản</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{scanResultStats.duplicateCode}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Viết tắt không chuẩn</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{scanResultStats.mismatchScope}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên chưa chuẩn</span>
              <p className="text-2xl font-black text-primary-650 mt-1">{scanResultStats.nameNotStandard}</p>
            </div>
          </div>

          {/* Action and Filter Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên hoặc đề xuất..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary-500"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={e => e.key === 'Enter' && fetchSuggestions(1)}
                />
              </div>

              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
                value={filterType}
                onChange={e => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">-- Tất cả loại lỗi --</option>
                {ISSUE_TYPES_META.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="PENDING">Chờ xử lý (PENDING)</option>
                <option value="EDITED">Đã sửa đề xuất (EDITED)</option>
                <option value="APPROVED">Đã duyệt (APPROVED)</option>
                <option value="REJECTED">Đã từ chối (REJECTED)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={approveSafeIssues}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-650 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Duyệt các lỗi chắc chắn (độ tin cậy ≥ 95%)
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Xuất Excel
              </button>
            </div>
          </div>

          {/* Suggestions List Table */}
          <div className="flex-1 min-h-0 border border-slate-150 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-150">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === suggestions.filter(s => s.status === 'PENDING' || s.status === 'EDITED').length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-primary-650"
                      />
                    </th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã tài sản</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tài sản</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại lỗi</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiện tại</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đề xuất chỉnh sửa</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Độ tin cậy</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 tracking-widest uppercase text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {suggestions.map((item) => {
                    const isSelectable = item.status === 'PENDING' || item.status === 'EDITED';
                    const score = Math.floor(item.confidenceScore * 100);
                    let scoreColor = 'bg-rose-50 text-rose-600 border border-rose-100';
                    if (score >= 95) scoreColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                    else if (score >= 80) scoreColor = 'bg-amber-50 text-amber-600 border border-amber-100';

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/30 ${selectedIds.includes(item.id) ? 'bg-primary-50/5' : ''}`}>
                        <td className="p-4 text-center">
                          {isSelectable ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded border-slate-300 text-primary-650"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-700">{item.assetCode}</td>
                        <td className="p-4 font-black text-slate-800 max-w-[160px] truncate">{item.assetName}</td>
                        <td className="p-4">
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border">
                            {ISSUE_TYPES_META.find(m => m.id === item.issueType)?.label || item.issueType}
                          </span>
                        </td>
                        <td className="p-4 line-through text-slate-400 max-w-[140px] truncate">{item.currentValue || 'Trống'}</td>
                        <td className="p-4 font-bold text-emerald-600 bg-emerald-50/20 max-w-[180px] truncate flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 text-emerald-500" /> {item.suggestedValue || 'Trống'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${scoreColor}`}>
                            {score}%
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {isSelectable ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditedValue(item.suggestedValue || '');
                                  setEditReason('Điều chỉnh đề xuất thủ công');
                                }}
                                className="p-1 hover:bg-slate-100 border text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa đề xuất"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => approveItems([item.id])}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wide transition-colors cursor-pointer"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => rejectItems([item.id])}
                                className="p-1 hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Từ chối đề xuất"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {suggestions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">Không tìm thấy lỗi rà soát dữ liệu tài sản nào phù hợp bộ lọc</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom bulk actions and table pagination */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">{selectedIds.length} đã chọn:</span>
                <button
                  disabled={selectedIds.length === 0}
                  onClick={() => approveItems(selectedIds)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Duyệt đã chọn
                </button>
                <button
                  disabled={selectedIds.length === 0}
                  onClick={() => rejectItems(selectedIds)}
                  className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Từ chối
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs font-bold text-slate-500">
                <span>Tổng số dòng: {totalItems}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => fetchSuggestions(page - 1)}
                    className="px-3.5 py-1.5 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Trước
                  </button>
                  <button
                    disabled={page * limit >= totalItems}
                    onClick={() => fetchSuggestions(page + 1)}
                    className="px-3.5 py-1.5 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start pt-2">
            <button
              onClick={() => setStep('CONFIG')}
              className="text-xs font-black text-slate-450 hover:text-slate-700 uppercase tracking-widest cursor-pointer"
            >
              ← Thiết lập lại phạm vi rà soát
            </button>
          </div>
        </div>
      )}

      {/* EDIT DRAWER / ADJUSTMENT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Điều chỉnh đề xuất chỉnh sửa</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black">Tên tài sản</span>
                <p className="text-sm font-black text-slate-800 mt-0.5">{editingItem.assetName}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black">Giá trị hiện tại</span>
                <p className="font-bold text-slate-500 mt-0.5 line-through">{editingItem.currentValue || 'Trống'}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black">Giá trị đề xuất chuẩn hóa mới</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 text-xs focus:ring-4 focus:ring-primary-50 focus:border-primary-500 outline-none"
                  value={editedValue}
                  onChange={e => setEditedValue(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black">Ghi chú / Lý do điều chỉnh</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-700 text-xs focus:ring-4 focus:ring-primary-50 outline-none h-16"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t text-xs font-black">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl uppercase tracking-wide border cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateSuggestion}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl uppercase tracking-wider shadow-md cursor-pointer"
              >
                Lưu & Duyệt cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
