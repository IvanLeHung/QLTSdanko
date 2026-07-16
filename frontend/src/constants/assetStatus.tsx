import React from 'react';
import {
  AlertTriangle,
  Archive,
  Box,
  CheckCircle2,
  Clock3,
  RotateCcw,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';

export type AssetStatusConfig = {
  label: string;
  icon: React.ReactNode;
  tone: string;
  softTone: string;
  dotTone: string;
};

const iconClassName = "h-3.5 w-3.5";

export const ASSET_STATUS_CONFIG: Record<string, AssetStatusConfig> = {
  ASSIGNED: {
    label: 'Đang sử dụng',
    icon: <CheckCircle2 className={iconClassName} />,
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    softTone: 'bg-blue-50 text-blue-700',
    dotTone: 'bg-blue-500',
  },
  IN_STOCK: {
    label: 'Trong kho',
    icon: <Box className={iconClassName} />,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    softTone: 'bg-emerald-50 text-emerald-700',
    dotTone: 'bg-emerald-500',
  },
  RETIRED: {
    label: 'Đã thu hồi',
    icon: <RotateCcw className={iconClassName} />,
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    softTone: 'bg-indigo-50 text-indigo-700',
    dotTone: 'bg-indigo-500',
  },
  UNDER_REPAIR: {
    label: 'Đang sửa chữa',
    icon: <Wrench className={iconClassName} />,
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    softTone: 'bg-amber-50 text-amber-700',
    dotTone: 'bg-amber-500',
  },
  PENDING_DISPOSAL: {
    label: 'Chờ thanh lý',
    icon: <Clock3 className={iconClassName} />,
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
    softTone: 'bg-orange-50 text-orange-700',
    dotTone: 'bg-orange-500',
  },
  DISPOSED: {
    label: 'Đã thanh lý',
    icon: <Archive className={iconClassName} />,
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    softTone: 'bg-slate-100 text-slate-700',
    dotTone: 'bg-slate-500',
  },
  LIQUIDATED: {
    label: 'Đã thanh lý',
    icon: <Archive className={iconClassName} />,
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    softTone: 'bg-slate-100 text-slate-700',
    dotTone: 'bg-slate-500',
  },
  DAMAGED: {
    label: 'Báo hỏng',
    icon: <AlertTriangle className={iconClassName} />,
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    softTone: 'bg-rose-50 text-rose-700',
    dotTone: 'bg-rose-500',
  },
  BROKEN: {
    label: 'Báo hỏng',
    icon: <AlertTriangle className={iconClassName} />,
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    softTone: 'bg-rose-50 text-rose-700',
    dotTone: 'bg-rose-500',
  },
  LOST: {
    label: 'Báo mất',
    icon: <XCircle className={iconClassName} />,
    tone: 'bg-red-50 text-red-700 border-red-200',
    softTone: 'bg-red-50 text-red-700',
    dotTone: 'bg-red-500',
  },
};

export const DEFAULT_ASSET_STATUS_CONFIG: AssetStatusConfig = {
  label: 'Chưa xác định',
  icon: <ShieldAlert className={iconClassName} />,
  tone: 'bg-slate-50 text-slate-700 border-slate-200',
  softTone: 'bg-slate-50 text-slate-700',
  dotTone: 'bg-slate-400',
};

export function getAssetStatusConfig(status?: string | null): AssetStatusConfig {
  if (!status) return DEFAULT_ASSET_STATUS_CONFIG;
  return ASSET_STATUS_CONFIG[status] || {
    ...DEFAULT_ASSET_STATUS_CONFIG,
    label: status,
  };
}
