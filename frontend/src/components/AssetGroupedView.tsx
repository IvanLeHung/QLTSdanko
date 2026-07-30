import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  Box,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Printer,
  RotateCcw,
  Square,
  Trash,
  User,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { getAssetStatusConfig } from '../constants/assetStatus';
import { getAssetAssigneeDisplay } from '../utils/assetAssignee';

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

type GroupQuickFilter = 'ALL' | 'ASSIGNED' | 'IN_STOCK' | 'NEEDS_ACTION';

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
  viewLabel?: string;
  groupLabel?: string;
  selectedAssetId?: number | null;
  isDetailOpen: boolean;
  onOpenAsset: (assetId: number, tab?: string) => void;
  onAssetAction: (action: string, asset: any) => void;
  onAssetsAction?: (action: string, assets: any[]) => void;
  onApplyFilter: (key: string, value: string) => void;
  selectionResetKey?: number;
}

export const AssetGroupedView: React.FC<AssetGroupedViewProps> = ({
  groups,
  assetCount,
  loading,
  viewLabel = 'View theo nhóm tài sản',
  groupLabel = 'nhóm',
  selectedAssetId,
  isDetailOpen,
  onOpenAsset,
  onAssetAction,
  onAssetsAction,
  onApplyFilter,
  selectionResetKey = 0,
}) => {
  const { hasPermission } = useAuth();
  const [openAssetMenuId, setOpenAssetMenuId] = useState<number | null>(null);
  const [openGroupMenuKey, setOpenGroupMenuKey] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [groupQuickFilters, setGroupQuickFilters] = useState<Record<string, GroupQuickFilter>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIds(new Set());
    setOpenAssetMenuId(null);
    setOpenGroupMenuKey(null);
  }, [selectionResetKey]);

  const selectedAssets = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const selected: any[] = [];
    groups.forEach((group) => {
      group.assets.forEach((asset) => {
        if (selectedIds.has(asset.id)) selected.push(asset);
      });
    });
    return selected;
  }, [groups, selectedIds]);

  const allGroupKeys = useMemo(() => groups.map((group) => group.key), [groups]);
  const allCollapsed = groups.length > 0 && collapsedGroups.size === groups.length;

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const collapseAll = () => setCollapsedGroups(new Set(allGroupKeys));
  const expandAll = () => setCollapsedGroups(new Set());

  const toggleAsset = (asset: any) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const toggleAssets = (assets: any[]) => {
    const ids = assets.map((asset) => asset.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const isNeedsAction = (asset: any) => {
    return ['DAMAGED', 'BROKEN', 'LOST', 'UNDER_REPAIR', 'PENDING_DISPOSAL'].includes(asset.status)
      || (asset.offboardingAlert && !asset.offboardingResolvedAt);
  };

  const filterGroupAssets = (group: AssetGroupedBook, filter: GroupQuickFilter) => {
    if (filter === 'ASSIGNED') return group.assets.filter((asset) => asset.status === 'ASSIGNED');
    if (filter === 'IN_STOCK') return group.assets.filter((asset) => asset.status === 'IN_STOCK');
    if (filter === 'NEEDS_ACTION') return group.assets.filter(isNeedsAction);
    return group.assets;
  };

  const buildVisibleLocations = (group: AssetGroupedBook, visibleAssets: any[]) => {
    const visibleIds = new Set(visibleAssets.map((asset) => asset.id));
    return group.locations
      .map((locationGroup) => ({
        ...locationGroup,
        assets: locationGroup.assets.filter((asset) => visibleIds.has(asset.id)),
      }))
      .filter((locationGroup) => locationGroup.assets.length > 0);
  };

  const applyGroupQuickFilter = (groupKey: string, filter: GroupQuickFilter) => {
    setGroupQuickFilters((prev) => ({ ...prev, [groupKey]: filter }));
    setCollapsedGroups((prev) => {
      if (!prev.has(groupKey)) return prev;
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  };

  const runSingleAction = (action: string, asset: any) => {
    setOpenAssetMenuId(null);
    onAssetAction(action, asset);
  };

  const runAssetsAction = (action: string, assets: any[]) => {
    setOpenGroupMenuKey(null);
    if (assets.length === 0) return;
    if (onAssetsAction) {
      onAssetsAction(action, assets);
      return;
    }
    if (assets.length === 1) onAssetAction(action, assets[0]);
  };

  const scrollToLastSelectedAsset = () => {
    const lastSelectedId = Array.from(selectedIds).at(-1);
    if (!lastSelectedId) return;

    const containingGroup = groups.find((group) => group.assets.some((asset) => asset.id === lastSelectedId));
    if (containingGroup) {
      setCollapsedGroups((prev) => {
        if (!prev.has(containingGroup.key)) return prev;
        const next = new Set(prev);
        next.delete(containingGroup.key);
        return next;
      });
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const row = scrollContainerRef.current?.querySelector<HTMLElement>(`[data-asset-id="${lastSelectedId}"]`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row?.focus({ preventScroll: true });
      });
    });
  };

  const selectedLabel = `${selectedAssets.length.toLocaleString('vi-VN')} tài sản`;

  return (
    <div className="h-full rounded-xl border bg-white overflow-hidden shadow-sm flex flex-col">
      <div className="min-h-14 shrink-0 px-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{viewLabel}</p>
          <p className="text-[12px] font-bold text-slate-700 truncate">
            {assetCount.toLocaleString('vi-VN')} tài sản trong {groups.length.toLocaleString('vi-VN')} {groupLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allCollapsed ? expandAll : collapseAll}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
            {allCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
          </button>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary-500 shrink-0" />}
        </div>
      </div>

      {selectedAssets.length > 0 && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-900 px-4 py-2 text-white flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={scrollToLastSelectedAsset}
            className="min-h-10 rounded-xl px-2 text-left text-[12px] font-black uppercase tracking-wide hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            title="Đi tới tài sản cuối cùng đã chọn"
          >
            Đã chọn {selectedLabel}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('TRANSFER_CREATE') && (
              <>
                <ToolbarButton icon={<ArrowRightLeft className="h-4 w-4" />} label="Bàn giao" onClick={() => runAssetsAction('handover', selectedAssets)} />
                <ToolbarButton icon={<RotateCcw className="h-4 w-4" />} label="Thu hồi" onClick={() => runAssetsAction('revoke', selectedAssets)} />
              </>
            )}
            <ToolbarButton icon={<Printer className="h-4 w-4" />} label="In QR" onClick={() => runAssetsAction('print_label', selectedAssets)} />
            <ToolbarButton icon={<ClipboardCheck className="h-4 w-4" />} label="Kiểm kê" onClick={() => runAssetsAction('inventory', selectedAssets)} />
            {hasPermission('REPAIR_CREATE') && (
              <>
                <ToolbarButton icon={<Wrench className="h-4 w-4" />} label="Sửa chữa / Bảo trì" onClick={() => runAssetsAction('repair', selectedAssets)} />
                <ToolbarButton icon={<Trash className="h-4 w-4" />} label="Thanh lý" onClick={() => runAssetsAction('liquidation', selectedAssets)} />
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
              aria-label="Bỏ chọn tất cả tài sản"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar scroll-smooth bg-slate-50/60 p-2 sm:p-3">
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
          <div className="space-y-2">
            {groups.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const quickFilter = groupQuickFilters[group.key] || 'ALL';
              const visibleAssets = filterGroupAssets(group, quickFilter);
              const visibleLocations = buildVisibleLocations(group, visibleAssets);
              const groupSelected = group.assets.length > 0 && group.assets.every((asset) => selectedIds.has(asset.id));
              return (
                <section key={group.key} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-3 sm:px-4 py-3 bg-white border-b border-slate-100">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
                            aria-label={collapsed ? 'Mở nhóm' : 'Thu gọn nhóm'}
                          >
                            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAssets(group.assets)}
                            className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
                            aria-label={groupSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                          >
                            {groupSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
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
                            {(group.codePath || group.name) && (
                              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                {group.codePath && <p className="font-mono text-[13px] font-black tracking-tight text-slate-900 break-words">{group.codePath}</p>}
                                {group.name && <p className="text-[12px] font-semibold text-slate-500 truncate">{group.name}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <StatusCount
                          label={`${group.assets.length.toLocaleString('vi-VN')} tài sản`}
                          active={quickFilter === 'ALL'}
                          className="bg-slate-900 text-white hover:bg-slate-800"
                          onClick={() => applyGroupQuickFilter(group.key, 'ALL')}
                        />
                        <StatusCount
                          label={`${group.statusSummary.assigned.toLocaleString('vi-VN')} đang dùng`}
                          active={quickFilter === 'ASSIGNED'}
                          disabled={group.statusSummary.assigned === 0}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => applyGroupQuickFilter(group.key, 'ASSIGNED')}
                        />
                        <StatusCount
                          label={`${group.statusSummary.inStock.toLocaleString('vi-VN')} trong kho`}
                          active={quickFilter === 'IN_STOCK'}
                          disabled={group.statusSummary.inStock === 0}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => applyGroupQuickFilter(group.key, 'IN_STOCK')}
                        />
                        <StatusCount
                          label={`${group.statusSummary.needsAction.toLocaleString('vi-VN')} cần xử lý`}
                          active={quickFilter === 'NEEDS_ACTION'}
                          disabled={group.statusSummary.needsAction === 0}
                          className={group.statusSummary.needsAction > 0 ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-slate-50 text-slate-500"}
                          onClick={() => applyGroupQuickFilter(group.key, 'NEEDS_ACTION')}
                        />
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenGroupMenuKey(openGroupMenuKey === group.key ? null : group.key)}
                            className="h-10 px-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-[11px] font-black text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
                            aria-label={`Mở thao tác nhóm ${group.codePath || group.breadcrumb.map((item) => item.label).join(' - ')}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                            Thao tác nhóm
                          </button>
                          {openGroupMenuKey === group.key && (
                            <>
                              <button className="fixed inset-0 z-30 cursor-default" type="button" aria-label="Đóng menu thao tác nhóm" onClick={() => setOpenGroupMenuKey(null)} />
                              <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                                <MenuItem icon={<CheckSquare className="h-4 w-4" />} label={groupSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'} onClick={() => { setOpenGroupMenuKey(null); toggleAssets(group.assets); }} />
                                <MenuItem icon={<Printer className="h-4 w-4" />} label="In QR nhóm" onClick={() => runAssetsAction('print_label', group.assets)} />
                                <MenuItem icon={<Download className="h-4 w-4" />} label="Xuất báo cáo Excel" onClick={() => runAssetsAction('export', group.assets)} />
                                {hasPermission('TRANSFER_CREATE') && (
                                  <>
                                    <MenuItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Bàn giao nhóm" onClick={() => runAssetsAction('handover', group.assets)} />
                                    <MenuItem icon={<RotateCcw className="h-4 w-4" />} label="Thu hồi nhóm" onClick={() => runAssetsAction('revoke', group.assets)} />
                                  </>
                                )}
                                {hasPermission('REPAIR_CREATE') && (
                                  <>
                                    <MenuItem icon={<Wrench className="h-4 w-4" />} label="Sửa chữa / Bảo trì nhóm" onClick={() => runAssetsAction('repair', group.assets)} />
                                    <MenuItem icon={<Trash className="h-4 w-4" />} label="Thanh lý nhóm" onClick={() => runAssetsAction('liquidation', group.assets)} />
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!collapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full text-left table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="h-10">
                            <th className="w-12 px-3">
                              <button
                                type="button"
                                onClick={() => toggleAssets(group.assets)}
                                className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-primary-600 hover:bg-primary-50"
                                aria-label={groupSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                              >
                                {groupSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              </button>
                            </th>
                            <th className="w-[170px] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Mã tài sản</th>
                            <th className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Tên tài sản</th>
                            <th className="w-[210px] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Người sử dụng / Khu vực</th>
                            <th className="w-[260px] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Đơn vị / vị trí</th>
                            <th className="w-[170px] px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</th>
                            <th className="w-16 px-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Tác vụ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleLocations.map((locationGroup) => (
                            <React.Fragment key={locationGroup.key}>
                              <tr className="h-9 bg-white">
                                <td className="px-3" />
                                <td colSpan={6} className="px-3 text-[11px] font-black text-slate-500">
                                  {locationGroup.key}
                                  <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] text-primary-700">
                                    {locationGroup.assets.length.toLocaleString('vi-VN')} tài sản
                                  </span>
                                </td>
                              </tr>
                              {locationGroup.assets.map((asset) => (
                                <AssetRow
                                  key={asset.id}
                                  asset={asset}
                                  selected={selectedIds.has(asset.id)}
                                  active={selectedAssetId === asset.id && isDetailOpen}
                                  menuOpen={openAssetMenuId === asset.id}
                                  canView={hasPermission('ASSET_VIEW')}
                                  canTransfer={hasPermission('TRANSFER_CREATE')}
                                  canInventory={hasPermission('INVENTORY_CREATE')}
                                  canRepair={hasPermission('REPAIR_CREATE')}
                                  canUpdate={hasPermission('ASSET_UPDATE')}
                                  onToggle={() => toggleAsset(asset)}
                                  onOpen={() => onOpenAsset(asset.id, 'info')}
                                  onOpenMenu={() => setOpenAssetMenuId(openAssetMenuId === asset.id ? null : asset.id)}
                                  onCloseMenu={() => setOpenAssetMenuId(null)}
                                  onAction={runSingleAction}
                                />
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatusCount = ({
  label,
  className,
  active,
  disabled,
  onClick,
}: {
  label: string;
  className: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "inline-flex min-h-8 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-primary-100",
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      active && "ring-2 ring-primary-200 shadow-sm",
      className
    )}
    title={`Lọc nhanh: ${label}`}
  >
    {label}
  </button>
);

const ToolbarButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-[11px] font-black uppercase tracking-wide text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
  >
    {icon}
    {label}
  </button>
);

const AssetRow = ({
  asset,
  selected,
  active,
  menuOpen,
  canView,
  canTransfer,
  canInventory,
  canRepair,
  canUpdate,
  onToggle,
  onOpen,
  onOpenMenu,
  onCloseMenu,
  onAction,
}: {
  asset: any;
  selected: boolean;
  active: boolean;
  menuOpen: boolean;
  canView: boolean;
  canTransfer: boolean;
  canInventory: boolean;
  canRepair: boolean;
  canUpdate: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onAction: (action: string, asset: any) => void;
}) => {
  const status = getAssetStatusConfig(asset.status);
  const assignee = getAssetAssigneeDisplay(asset);
  const city = String(asset.cityName || '').trim();
  const rawLocation = String(asset.locationName || '').trim();
  const locationAlreadyIncludesCity = city
    && rawLocation.toLowerCase().startsWith(city.toLowerCase());
  const location = (
    locationAlreadyIncludesCity
      ? rawLocation
      : [city, rawLocation].filter(Boolean).join(' - ')
  ) || 'Chưa có vị trí';
  const hasOpenTicket = asset.repairTickets && asset.repairTickets.length > 0;

  return (
    <tr
      data-asset-id={asset.id}
      tabIndex={-1}
      className={cn("h-12 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-300", active ? "bg-primary-50/50" : selected ? "bg-primary-50/25" : "bg-white")}
    >
      <td className="px-3">
        <button
          type="button"
          onClick={onToggle}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label={selected ? `Bỏ chọn ${asset.assetCode}` : `Chọn ${asset.assetCode}`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
      </td>
      <td className="px-3">
        <button type="button" onClick={onOpen} className="font-mono text-[12px] font-black text-primary-700 hover:underline">
          {asset.assetCode}
        </button>
      </td>
      <td className="px-3">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-left text-[13px] font-bold text-slate-800 hover:text-primary-700" title={asset.assetNameShort || asset.assetName}>
          {asset.assetNameShort || asset.assetName}
        </button>
      </td>
      <td className="px-3">
        <div className="flex min-w-0 items-start gap-2">
          {assignee.isArea
            ? <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
            : <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
          <div className="min-w-0">
            <p className={cn("truncate text-[12px] font-bold", assignee.isArea || asset.currentUserName ? "text-slate-800" : "text-slate-400 italic")} title={assignee.name}>{assignee.name}</p>
            <p className={cn("truncate text-[10px] font-medium", assignee.isArea ? "text-primary-500" : "text-slate-400")} title={assignee.detail}>{assignee.detail}</p>
          </div>
        </div>
      </td>
      <td className="px-3">
        <div className="flex min-w-0 items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="truncate text-[12px] font-semibold text-slate-700" title={location}>{location}</p>
        </div>
      </td>
      <td className="px-3">
        <span className={cn("inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2 text-[9px] font-black uppercase tracking-normal whitespace-nowrap leading-none", status.tone)}>
          <span className="shrink-0">{status.icon}</span>
          {status.label}
        </span>
      </td>
      <td className="px-3 text-right">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={onOpenMenu}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-100"
            aria-label={`Mở tác vụ cho ${asset.assetCode}`}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <button className="fixed inset-0 z-30 cursor-default" type="button" aria-label="Đóng menu tác vụ" onClick={onCloseMenu} />
              <div className="absolute right-0 top-11 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-2xl">
                {canView && <MenuItem icon={<Eye className="h-4 w-4" />} label="Xem chi tiết" onClick={() => onAction('view', asset)} />}
                {canTransfer && asset.status === 'ASSIGNED' && (
                  <>
                    <MenuItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Điều chuyển tài sản" onClick={() => onAction('handover', asset)} />
                    <MenuItem icon={<RotateCcw className="h-4 w-4" />} label="Thu hồi về kho" onClick={() => onAction('revoke', asset)} />
                  </>
                )}
                {canTransfer && (asset.status === 'RETIRED' || asset.status === 'DAMAGED') && (
                  <MenuItem
                    icon={<RotateCcw className="h-4 w-4" />}
                    label={asset.status === 'DAMAGED' ? 'Thu hồi tài sản hỏng về Hà Nội' : 'Thu hồi về kho'}
                    onClick={() => onAction('revoke', asset)}
                  />
                )}
                {canTransfer && asset.status !== 'ASSIGNED' && asset.status !== 'RETIRED' && asset.status !== 'DAMAGED' && (
                  <MenuItem icon={<UserPlus className="h-4 w-4" />} label="Cấp phát / Bàn giao" onClick={() => onAction('handover', asset)} />
                )}

                <MenuDivider />
                {canInventory && <MenuItem icon={<ClipboardCheck className="h-4 w-4" />} label="Kiểm kê" onClick={() => onAction('inventory', asset)} />}
                {canRepair && (
                  <MenuItem
                    icon={<Wrench className={cn("h-4 w-4", hasOpenTicket && "text-amber-500")} />}
                    label={hasOpenTicket ? "Xem phiếu sửa chữa" : "Sửa chữa / Bảo trì"}
                    onClick={() => onAction('repair', asset)}
                  />
                )}
                {canRepair && <MenuItem icon={<Trash className="h-4 w-4" />} label="Thanh lý" onClick={() => onAction('liquidation', asset)} />}

                {asset.offboardingAlert && !asset.offboardingResolvedAt && canUpdate && (
                  <>
                    <MenuDivider />
                    <MenuItem icon={<RotateCcw className="h-4 w-4 text-red-500" />} label="Thu hồi tài sản" onClick={() => onAction('offboarding_recover', asset)} />
                    <MenuItem icon={<Edit3 className="h-4 w-4 text-amber-500" />} label="Gia hạn ngày thu" onClick={() => onAction('offboarding_extend', asset)} />
                    <MenuItem icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Đánh dấu đã xử lý" onClick={() => onAction('offboarding_resolve', asset)} />
                    <MenuItem icon={<X className="h-4 w-4 text-slate-400" />} label="Bỏ cảnh báo nghỉ việc" onClick={() => onAction('offboarding_clear', asset)} />
                  </>
                )}

                <MenuDivider />
                <MenuItem icon={<Activity className="h-4 w-4" />} label="Nhật ký tài sản" onClick={() => onAction('history', asset)} />
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const MenuDivider = () => <div className="my-1 h-px bg-slate-100" />;

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
