import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Box,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Package,
  Printer,
  RotateCcw,
  User,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { getAssetStatusConfig } from '../constants/assetStatus';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AssetGroupBreadcrumb = {
  label: string;
  filterKey?: string;
  filterValue?: string;
};

type AssetLocationGroup = {
  key: string;
  assets: any[];
};

export type AssetGroupedBook = {
  key: string;
  codePath: string;
  name: string;
  breadcrumb: AssetGroupBreadcrumb[];
  assets: any[];
  locations: AssetLocationGroup[];
  statusSummary: {
    assigned: number;
    inStock: number;
    needsAction: number;
  };
};

interface AssetGroupedViewProps {
  groups: AssetGroupedBook[];
  assetCount: number;
  loading: boolean;
  selectedAssetId?: number | null;
  isDetailOpen: boolean;
  onOpenAsset: (assetId: number, tab?: string) => void;
  onAssetAction: (action: string, asset: any) => void;
  onApplyFilter: (key: string, value: string) => void;
}

export const AssetGroupedView: React.FC<AssetGroupedViewProps> = ({
  groups,
  assetCount,
  loading,
  selectedAssetId,
  isDetailOpen,
  onOpenAsset,
  onAssetAction,
  onApplyFilter,
}) => {
  const { hasPermission } = useAuth();
  const [openAssetMenuId, setOpenAssetMenuId] = useState<number | null>(null);

  const closeMenu = () => setOpenAssetMenuId(null);

  const runAction = (action: string, asset: any) => {
    closeMenu();
    onAssetAction(action, asset);
  };

  return (
    <div className="h-full rounded-xl border bg-white overflow-hidden shadow-sm flex flex-col">
      <div className="min-h-12 shrink-0 px-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 bg-[#F8FAFC]">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">View nhóm tài sản</p>
          <p className="text-[12px] font-bold text-slate-700 truncate">
            {assetCount.toLocaleString('vi-VN')} tài sản trong {groups.length.toLocaleString('vi-VN')} nhóm
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary-500 shrink-0" />}
      </div>

      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar scroll-smooth bg-slate-50/60 p-2 sm:p-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <Box className="h-9 w-9 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">Không có tài sản phù hợp bộ lọc</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Hãy thử bỏ bớt điều kiện lọc.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-white border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
                        {group.breadcrumb.map((item, index) => (
                          <React.Fragment key={`${group.key}-${index}-${item.label}`}>
                            {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                            <button
                              type="button"
                              disabled={!item.filterKey || !item.filterValue}
                              onClick={() => item.filterKey && item.filterValue && onApplyFilter(item.filterKey, item.filterValue)}
                              className={cn(
                                "min-h-8 max-w-[180px] truncate rounded-lg px-2 text-[11px] font-black transition-all",
                                item.filterKey && item.filterValue
                                  ? "text-primary-700 bg-primary-50 hover:bg-primary-100"
                                  : "text-slate-500 bg-slate-50 cursor-default"
                              )}
                              title={item.label}
                            >
                              {item.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <p className="font-mono text-[13px] font-black tracking-tight text-slate-900 break-words">{group.codePath}</p>
                        {group.name && <p className="text-[12px] font-semibold text-slate-500 truncate">{group.name}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <StatusCount label={`${group.assets.length.toLocaleString('vi-VN')} tài sản`} className="bg-slate-900 text-white" />
                      <StatusCount label={`${group.statusSummary.assigned.toLocaleString('vi-VN')} đang dùng`} className="bg-blue-50 text-blue-700" />
                      <StatusCount label={`${group.statusSummary.inStock.toLocaleString('vi-VN')} trong kho`} className="bg-emerald-50 text-emerald-700" />
                      {group.statusSummary.needsAction > 0 && (
                        <StatusCount label={`${group.statusSummary.needsAction.toLocaleString('vi-VN')} cần xử lý`} className="bg-rose-50 text-rose-700" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.locations.map((locationGroup) => (
                    <div key={locationGroup.key} className="px-3 sm:px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                        <p className="text-[12px] font-black text-slate-800 break-words">
                          {locationGroup.key}
                        </p>
                        <span className="text-[10px] font-black text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1 self-start sm:self-auto">
                          {locationGroup.assets.length.toLocaleString('vi-VN')} đang có
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                        {locationGroup.assets.map((asset) => (
                          <AssetCard
                            key={asset.id}
                            asset={asset}
                            selected={selectedAssetId === asset.id && isDetailOpen}
                            menuOpen={openAssetMenuId === asset.id}
                            canTransfer={hasPermission('TRANSFER_CREATE')}
                            canPrint={hasPermission('ASSET_VIEW')}
                            onOpen={() => onOpenAsset(asset.id, 'info')}
                            onOpenMenu={() => setOpenAssetMenuId(openAssetMenuId === asset.id ? null : asset.id)}
                            onCloseMenu={closeMenu}
                            onAction={runAction}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusCount = ({ label, className }: { label: string; className: string }) => (
  <span className={cn("inline-flex min-h-8 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-wide", className)}>
    {label}
  </span>
);

const AssetCard = ({
  asset,
  selected,
  menuOpen,
  canTransfer,
  canPrint,
  onOpen,
  onOpenMenu,
  onCloseMenu,
  onAction,
}: {
  asset: any;
  selected: boolean;
  menuOpen: boolean;
  canTransfer: boolean;
  canPrint: boolean;
  onOpen: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onAction: (action: string, asset: any) => void;
}) => {
  const status = getAssetStatusConfig(asset.status);
  const assignee = asset.currentUserName || 'Chưa cấp phát';
  const location = [asset.cityName, asset.locationName].filter(Boolean).join(' - ') || 'Chưa có vị trí';
  const ownerArea = asset.departmentName || asset.currentPosition || 'Chưa có đơn vị';

  return (
    <article
      className={cn(
        "relative min-h-[160px] rounded-xl border bg-white p-3 shadow-sm transition-all",
        selected ? "border-primary-400 bg-primary-50/40 ring-2 ring-primary-100" : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
          aria-label={`Xem chi tiết tài sản ${asset.assetCode}`}
        >
          <p className="text-[13px] font-black text-slate-900 leading-snug line-clamp-2" title={asset.assetNameShort || asset.assetName}>
            {asset.assetNameShort || asset.assetName}
          </p>
          <p className="mt-1 text-[11px] font-black text-primary-700 font-mono truncate" title={asset.assetCode}>
            {asset.assetCode}
          </p>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMenu();
          }}
          className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-200"
          aria-label={`Mở tác vụ cho tài sản ${asset.assetCode}`}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <InfoLine icon={<User className="h-3.5 w-3.5" />} value={assignee} muted={!asset.currentUserName} />
        <InfoLine icon={<MapPin className="h-3.5 w-3.5" />} value={location} muted={!asset.cityName && !asset.locationName} />
        <InfoLine icon={<Package className="h-3.5 w-3.5" />} value={ownerArea} muted={!asset.departmentName && !asset.currentPosition} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide", status.tone)}>
          {status.icon}
          {status.label}
        </span>
        {asset.offboardingAlert && !asset.offboardingResolvedAt && (
          <span className="inline-flex min-h-8 items-center rounded-full border border-red-200 bg-red-50 px-2.5 text-[10px] font-black uppercase tracking-wide text-red-700">
            Cần thu hồi
          </span>
        )}
      </div>

      {menuOpen && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" type="button" aria-label="Đóng menu tác vụ" onClick={onCloseMenu} />
          <div className="absolute right-3 top-14 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <MenuItem icon={<Eye className="h-4 w-4" />} label="Xem chi tiết" onClick={() => onAction('view', asset)} />
            {canTransfer && asset.status === 'ASSIGNED' && (
              <>
                <MenuItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Điều chuyển" onClick={() => onAction('handover', asset)} />
                <MenuItem icon={<RotateCcw className="h-4 w-4" />} label="Thu hồi" onClick={() => onAction('revoke', asset)} />
              </>
            )}
            {canTransfer && asset.status !== 'ASSIGNED' && asset.status !== 'RETIRED' && (
              <MenuItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Bàn giao" onClick={() => onAction('handover', asset)} />
            )}
            <MenuItem icon={<ClipboardCheck className="h-4 w-4" />} label="Kiểm kê" onClick={() => onAction('inventory', asset)} />
            {canPrint && <MenuItem icon={<Printer className="h-4 w-4" />} label="In QR" onClick={() => onAction('print_label', asset)} />}
          </div>
        </>
      )}
    </article>
  );
};

const InfoLine = ({ icon, value, muted }: { icon: React.ReactNode; value: string; muted?: boolean }) => (
  <div className="flex min-h-7 items-center gap-2 text-[12px] font-semibold">
    <span className="text-slate-400 shrink-0">{icon}</span>
    <span className={cn("min-w-0 truncate", muted ? "text-slate-400 italic" : "text-slate-700")} title={value}>
      {value}
    </span>
  </div>
);

const MenuItem = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-black text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-100"
  >
    <span className="text-slate-400">{icon}</span>
    {label}
  </button>
);
