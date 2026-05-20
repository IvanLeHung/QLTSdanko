import React, { useMemo } from 'react';
import { Clock, User, Activity, FileText, Database } from 'lucide-react';
import { format } from 'date-fns';
import { BaseModal } from './BaseModal';

interface LogDetailModalProps {
  isOpen: boolean;
  log: any;
  onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ isOpen, log, onClose }) => {
  const parsedDetails = useMemo(() => {
    if (!log?.details) return null;
    try {
      return JSON.parse(log.details);
    } catch {
      return null;
    }
  }, [log?.details]);

  if (!log) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="wizard"
      title={
        <div className="flex items-center space-x-2 text-slate-800">
          <Activity className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-black uppercase tracking-wider">Chi tiết Nhật ký hoạt động</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start">
            <Clock className="mt-0.5 mr-3 h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Thời gian</p>
              <p className="text-slate-900 font-medium mt-1">
                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start">
            <User className="mt-0.5 mr-3 h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Người thực hiện</p>
              <p className="text-slate-900 font-medium mt-1">{log.performedBy}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start">
            <Activity className="mt-0.5 mr-3 h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</p>
              <p className="text-slate-900 font-medium mt-1">
                {log.actionVn} <span className="text-slate-500 text-sm">({log.action})</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start">
            <Database className="mt-0.5 mr-3 h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đối tượng</p>
              <p className="text-slate-900 font-medium mt-1">
                {log.entityVn} <span className="text-slate-500 text-sm">({log.entityType} #{log.entityId})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center">
            <FileText className="mr-2 h-4 w-4 text-slate-500" />
            Mô tả chi tiết
          </h3>
          <div className="bg-primary-50 p-4 rounded-lg border border-primary-100 text-primary-900 font-medium">
            {log.description}
          </div>
        </div>

        {/* Changes Table (if applicable) */}
        {parsedDetails?.changes && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center">
              <Activity className="mr-2 h-4 w-4 text-slate-500" />
              Các trường thay đổi (Diff)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Trường (Field)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Giá trị cũ (Old)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Giá trị mới (New)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {Object.entries(parsedDetails.changes).map(([key, val]: [string, any]) => (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{key}</td>
                      <td className="px-4 py-3 text-sm text-red-600 bg-red-50/50 break-all">{String(val?.old ?? 'Trống')}</td>
                      <td className="px-4 py-3 text-sm text-green-600 bg-green-50/50 break-all">{String(val?.new ?? 'Trống')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center">
            <Database className="mr-2 h-4 w-4 text-slate-500" />
            Dữ liệu thô (Raw JSON)
          </h3>
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto relative group">
            <pre className="text-xs text-green-400 font-mono leading-relaxed">
              {parsedDetails ? JSON.stringify(parsedDetails, null, 2) : log.details || 'Không có dữ liệu chi tiết.'}
            </pre>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
