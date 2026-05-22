import React, { useState, useEffect } from 'react';
import { Calendar, Download } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { startOfMonth, endOfMonth, subMonths, format, subDays, startOfYear, endOfYear } from 'date-fns';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  title: string;
}

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title
}) => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    if (isOpen) {
      // Reset to current month when modal opens
      setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    }
  }, [isOpen]);

  const selectQuickRange = (range: 'this-month' | 'last-month' | 'last-30' | 'this-year') => {
    const today = new Date();
    switch (range) {
      case 'this-month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last-30':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'this-year':
        setStartDate(format(startOfYear(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfYear(today), 'yyyy-MM-dd'));
        break;
    }
  };

  const handleDownload = () => {
    onConfirm(startDate, endDate);
    onClose();
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="h-11 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
      >
        Hủy
      </button>
      <button
        onClick={handleDownload}
        className="h-11 px-6 rounded-xl bg-slate-900 text-white font-bold flex items-center hover:bg-black transition-colors"
      >
        <Download className="mr-2 h-4 w-4" /> Tải báo cáo Excel
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="confirm"
      title={
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-slate-700" />
          <span className="font-bold text-slate-800">{title}</span>
        </div>
      }
      footer={footer}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Chọn nhanh khoảng thời gian
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectQuickRange('this-month')}
              className="h-10 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => selectQuickRange('last-month')}
              className="h-10 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tháng trước
            </button>
            <button
              type="button"
              onClick={() => selectQuickRange('last-30')}
              className="h-10 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              30 ngày gần nhất
            </button>
            <button
              type="button"
              onClick={() => selectQuickRange('this-year')}
              className="h-10 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Năm nay
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 font-medium text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 font-medium text-slate-800"
            />
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
