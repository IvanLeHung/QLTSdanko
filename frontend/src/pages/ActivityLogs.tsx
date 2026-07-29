import React, { useState, useEffect } from 'react';
import { History, Download, Filter, Search, Calendar, ChevronLeft, ChevronRight, Eye, User } from 'lucide-react';
import api from '../lib/api';
import { LogDetailModal } from '../components/LogDetailModal';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'react-toastify';
import { Can } from '../components/Can';

interface AuditLog {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  details: string;
  performedBy: string;
  createdAt: string;
  description?: string;
  actionVn?: string;
  entityVn?: string;
}

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  // Filters
  const [datePreset, setDatePreset] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };

      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (keyword) params.keyword = keyword;
      if (performedBy) params.performedBy = performedBy;

      let start, end;
      const today = new Date();

      switch (datePreset) {
        case 'today':
          start = startOfDay(today);
          end = endOfDay(today);
          break;
        case 'week':
          start = startOfWeek(today, { weekStartsOn: 1 });
          end = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(today);
          end = endOfMonth(today);
          break;
        case 'quarter':
          start = startOfQuarter(today);
          end = endOfQuarter(today);
          break;
        case 'year':
          start = startOfYear(today);
          end = endOfYear(today);
          break;
        case 'custom':
          if (customStartDate) start = new Date(customStartDate);
          if (customEndDate) end = new Date(customEndDate);
          break;
        case 'all':
        default:
          break;
      }

      if (start) params.startDate = start.toISOString();
      if (end) params.endDate = end.toISOString();

      const response = await api.get('/audit', { params });
      setLogs(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Lỗi khi tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, datePreset, customStartDate, customEndDate, actionFilter, entityFilter, keyword, performedBy]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (keyword) params.keyword = keyword;
      if (performedBy) params.performedBy = performedBy;

      let start, end;
      const today = new Date();

      switch (datePreset) {
        case 'today':
          start = startOfDay(today);
          end = endOfDay(today);
          break;
        case 'week':
          start = startOfWeek(today, { weekStartsOn: 1 });
          end = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case 'month':
          start = startOfMonth(today);
          end = endOfMonth(today);
          break;
        case 'quarter':
          start = startOfQuarter(today);
          end = endOfQuarter(today);
          break;
        case 'year':
          start = startOfYear(today);
          end = endOfYear(today);
          break;
        case 'custom':
          if (customStartDate) start = new Date(customStartDate);
          if (customEndDate) end = new Date(customEndDate);
          break;
        case 'all':
        default:
          break;
      }

      if (start) params.startDate = start.toISOString();
      if (end) params.endDate = end.toISOString();

      const response = await api.get('/audit/export', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_Cao_Lich_Su_Hoat_Dong_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Xuất báo cáo thành công!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất báo cáo');
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <History className="mr-3 h-6 w-6 text-primary-600" />
            Nhật ký hoạt động (Audit Logs)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ghi nhận mọi thao tác thay đổi dữ liệu trên hệ thống.
          </p>
        </div>
        <Can permission="AUDIT_LOG_EXPORT">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-primary flex items-center shadow-sm hover:shadow-md transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo Excel'}
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tìm kiếm nội dung</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm mã tài sản, mã hồ sơ..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="VD: admin..."
                value={performedBy}
                onChange={(e) => {
                  setPerformedBy(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hành động</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">Tất cả</option>
              <option value="CREATE">Tạo mới</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="DELETE">Xóa</option>
              <option value="CREATE_AND_COMPLETE">Tạo và hoàn tất</option>
              <option value="UNDO">Hoàn tác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đối tượng</label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">Tất cả</option>
              <option value="ASSET">Tài sản (ASSET)</option>
              <option value="HANDOVER">Hồ sơ (HANDOVER)</option>
              <option value="ASSET_TRANSFERS">Hồ sơ (ASSET_TRANSFERS)</option>
              <option value="USER">Người dùng (USER)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian</label>
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý này</option>
              <option value="year">Năm nay</option>
              <option value="custom">Tùy chỉnh khoảng ngày</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          {datePreset === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </>
          )}

        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Người dùng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Đối tượng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Không có bản ghi nào trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{log.performedBy}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getActionColor(log.action)}`} title={log.action}>
                        {log.actionVn || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {log.entityVn || log.entityType} <span className="text-slate-400">#{log.entityId}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 max-w-sm truncate" title={log.description}>
                      {log.description || log.details || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary-600 hover:text-primary-900 bg-primary-50 p-1.5 rounded-md hover:bg-primary-100 transition-colors inline-flex items-center"
                        title="Xem chi tiết (JSON)"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <LogDetailModal
          isOpen={!!selectedLog}
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};
