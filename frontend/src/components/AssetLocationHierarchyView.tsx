import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  FolderTree,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import { AssetGroupedView, type AssetGroupedBook } from './AssetGroupedView';

const LEVEL_LABELS = ['Tỉnh', 'Dự án', 'Vị trí', 'Vị trí chi tiết', 'Phòng / Ban'];

type HierarchySummary = {
  label: string;
  path: string[];
  assets: any[];
  childCount: number;
  assigned: number;
  inStock: number;
  needsAction: number;
};

const isNeedsAction = (asset: any) => (
  ['DAMAGED', 'BROKEN', 'LOST', 'UNDER_REPAIR', 'PENDING_DISPOSAL'].includes(asset.status)
  || (asset.offboardingAlert && !asset.offboardingResolvedAt)
);

const uniqueAssets = (groups: AssetGroupedBook[]) => {
  const assets = new Map<number, any>();
  groups.forEach((group) => group.assets.forEach((asset) => assets.set(asset.id, asset)));
  return Array.from(assets.values());
};

const matchesPath = (group: AssetGroupedBook, path: string[]) => (
  path.every((label, index) => group.breadcrumb[index]?.label === label)
);

export const buildLocationHierarchyLevel = (
  groups: AssetGroupedBook[],
  path: string[]
): HierarchySummary[] => {
  const depth = path.length;
  const matchingGroups = groups.filter((group) => matchesPath(group, path));
  const labels = Array.from(new Set(
    matchingGroups.map((group) => group.breadcrumb[depth]?.label).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'vi'));

  return labels.map((label) => {
    const nextPath = [...path, label];
    const nodeGroups = matchingGroups.filter((group) => matchesPath(group, nextPath));
    const assets = uniqueAssets(nodeGroups);
    const childCount = new Set(
      nodeGroups.map((group) => group.breadcrumb[depth + 1]?.label).filter(Boolean)
    ).size;
    return {
      label,
      path: nextPath,
      assets,
      childCount,
      assigned: assets.filter((asset) => asset.status === 'ASSIGNED').length,
      inStock: assets.filter((asset) => asset.status === 'IN_STOCK').length,
      needsAction: assets.filter(isNeedsAction).length,
    };
  });
};

interface AssetLocationHierarchyViewProps {
  groups: AssetGroupedBook[];
  assetCount: number;
  loading: boolean;
  selectedAssetId?: number | null;
  isDetailOpen: boolean;
  onOpenAsset: (assetId: number, tab?: string) => void;
  onAssetAction: (action: string, asset: any) => void;
  onAssetsAction?: (action: string, assets: any[]) => void;
  onApplyFilter: (key: string, value: string) => void;
  selectionResetKey?: number;
}

const LevelIcon = ({ depth }: { depth: number }) => {
  if (depth === 0) return <MapPin className="h-4 w-4" />;
  if (depth === 1) return <Building2 className="h-4 w-4" />;
  if (depth === 4) return <Users className="h-4 w-4" />;
  return <FolderTree className="h-4 w-4" />;
};

export const AssetLocationHierarchyView: React.FC<AssetLocationHierarchyViewProps> = ({
  groups,
  assetCount,
  loading,
  selectedAssetId,
  isDetailOpen,
  onOpenAsset,
  onAssetAction,
  onAssetsAction,
  onApplyFilter,
  selectionResetKey = 0,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedPaths((current) => {
      const validPaths = new Set<string>();
      current.forEach((key) => {
        const path = key.split('\u001f');
        if (groups.some((group) => matchesPath(group, path))) validPaths.add(key);
      });
      return validPaths;
    });
  }, [groups]);

  const provinceCount = useMemo(
    () => new Set(groups.map((group) => group.breadcrumb[0]?.label).filter(Boolean)).size,
    [groups]
  );

  const pathKey = (path: string[]) => path.join('\u001f');

  const togglePath = (path: string[]) => {
    const key = pathKey(path);
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderLevel = (parentPath: string[]): React.ReactNode => {
    const nodes = buildLocationHierarchyLevel(groups, parentPath);
    return nodes.map((node) => {
      const key = pathKey(node.path);
      const expanded = expandedPaths.has(key);
      const atDepartment = node.path.length >= LEVEL_LABELS.length;
      const leafGroups = atDepartment
        ? groups.filter((group) => matchesPath(group, node.path))
        : [];

      return (
        <div key={key} className="border-b border-slate-100 last:border-b-0">
          <button
            type="button"
            onClick={() => togglePath(node.path)}
            aria-expanded={expanded}
            className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 text-left hover:bg-primary-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-200"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <LevelIcon depth={parentPath.length} />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {LEVEL_LABELS[parentPath.length]}
                </span>
                <span className="block truncate text-[13px] font-black text-slate-800" title={node.label}>{node.label}</span>
                <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                  {node.childCount > 0
                    ? `${node.childCount.toLocaleString('vi-VN')} ${LEVEL_LABELS[parentPath.length + 1].toLowerCase()}`
                    : 'Danh sách tài sản trong nhóm'}
                </span>
              </span>
            </span>
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="rounded-full bg-slate-900 px-2.5 py-1.5 text-[10px] font-black uppercase text-white">{node.assets.length.toLocaleString('vi-VN')} tài sản</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-[10px] font-black uppercase text-blue-700">{node.assigned.toLocaleString('vi-VN')} đang dùng</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase text-emerald-700">{node.inStock.toLocaleString('vi-VN')} trong kho</span>
              {node.needsAction > 0 && <span className="rounded-full bg-rose-50 px-2.5 py-1.5 text-[10px] font-black uppercase text-rose-700">{node.needsAction.toLocaleString('vi-VN')} cần xử lý</span>}
            </span>
          </button>

          {expanded && (
            <div className="ml-5 border-l-2 border-primary-100 bg-slate-50/60 pl-2 sm:ml-8 sm:pl-3">
              {atDepartment ? (
                <div className="min-h-64 py-2 pr-2">
                  <AssetGroupedView
                    groups={leafGroups}
                    assetCount={uniqueAssets(leafGroups).length}
                    loading={false}
                    selectedAssetId={selectedAssetId}
                    isDetailOpen={isDetailOpen}
                    onOpenAsset={onOpenAsset}
                    onAssetAction={onAssetAction}
                    onAssetsAction={onAssetsAction}
                    onApplyFilter={onApplyFilter}
                    selectionResetKey={selectionResetKey}
                    embedded
                  />
                </div>
              ) : renderLevel(node.path)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng hợp tài sản theo địa điểm</p>
            <p className="mt-0.5 text-[12px] font-bold text-slate-700">
              {assetCount.toLocaleString('vi-VN')} tài sản trong {provinceCount.toLocaleString('vi-VN')} tỉnh
            </p>
          </div>
          {expandedPaths.size > 0 && (
            <button
              type="button"
              onClick={() => setExpandedPaths(new Set())}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 hover:bg-slate-100"
            >
              <ChevronsDownUp className="h-4 w-4" /> Thu gọn tất cả
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm font-bold text-slate-500">Không có tài sản phù hợp bộ lọc</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto bg-slate-50/60 p-3 custom-scrollbar">
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Tỉnh / Thành phố</span>
            <span className="pr-10">Tổng hợp</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {renderLevel([])}
          </div>
        </div>
      )}
    </div>
  );
};
