import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, MapPin } from 'lucide-react';
import { BaseModal } from './BaseModal';
import {
  LOCATION_HIERARCHY,
  PROJECT_LOCATION_LEVEL_LABELS,
  findLocationTreePath,
  getLocationTreeLevels,
  getProjectLocationTree,
  isLocationPathComplete,
  mergeProjectLocationNodes,
  type LocationTree,
  type ProjectLocationNode
} from './TransferWizard';

export type VerifiedInventoryLocation = {
  city: string;
  project: string;
  location: string;
  department: string;
};

type DepartmentOption = { id?: number; name?: string; code?: string };

interface InventoryLocationPickerModalProps {
  isOpen: boolean;
  assetCode: string;
  initialValue: VerifiedInventoryLocation;
  projectLocationNodes: ProjectLocationNode[];
  departments: DepartmentOption[];
  onClose: () => void;
  onConfirm: (value: VerifiedInventoryLocation) => void;
}

const findBestLocationPath = (tree: LocationTree | null, location: string) => {
  if (!tree || !location) return [];
  const direct = findLocationTreePath(tree, location);
  if (direct) return direct;
  const segments = location.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  for (let index = 1; index < segments.length; index += 1) {
    const match = findLocationTreePath(tree, segments.slice(index).join(' - '));
    if (match) return match;
  }
  return [];
};

export const InventoryLocationPickerModal: React.FC<InventoryLocationPickerModalProps> = ({
  isOpen,
  assetCode,
  initialValue,
  projectLocationNodes,
  departments,
  onClose,
  onConfirm
}) => {
  const [city, setCity] = useState('');
  const [project, setProject] = useState('');
  const [path, setPath] = useState<string[]>([]);
  const [simpleLocation, setSimpleLocation] = useState('');
  const [department, setDepartment] = useState('--');

  const cityOptions = useMemo(() => Array.from(new Set([
    ...Object.keys(LOCATION_HIERARCHY),
    ...projectLocationNodes.map((node) => node.cityName),
    initialValue.city
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')), [initialValue.city, projectLocationNodes]);

  const projectOptions = useMemo(() => Array.from(new Set([
    ...Object.keys(LOCATION_HIERARCHY[city] || {}),
    ...projectLocationNodes.filter((node) => node.cityName === city).map((node) => node.projectName),
    city === initialValue.city ? initialValue.project : ''
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')), [city, initialValue.city, initialValue.project, projectLocationNodes]);

  const tree = useMemo(() => mergeProjectLocationNodes(
    getProjectLocationTree(city, project),
    projectLocationNodes,
    city,
    project
  ), [city, project, projectLocationNodes]);
  const levels = getLocationTreeLevels(tree, path);
  const simpleOptions = useMemo(() => Array.from(new Set([
    ...(LOCATION_HIERARCHY[city]?.[project] || []),
    city === initialValue.city && project === initialValue.project ? initialValue.location : ''
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi')), [
    city,
    initialValue.city,
    initialValue.location,
    initialValue.project,
    project
  ]);
  const locationComplete = tree ? isLocationPathComplete(tree, path) : Boolean(simpleLocation);

  const departmentOptions = useMemo(() => Array.from(new Set([
    '--',
    ...departments.map((item) => item.name || item.code || '').filter(Boolean),
    initialValue.department
  ].filter(Boolean))).sort((a, b) => a === '--' ? -1 : b === '--' ? 1 : a.localeCompare(b, 'vi')), [departments, initialValue.department]);

  useEffect(() => {
    if (!isOpen) return;
    const nextCity = initialValue.city || '';
    const nextProject = initialValue.project || '';
    const initialTree = mergeProjectLocationNodes(
      getProjectLocationTree(nextCity, nextProject),
      projectLocationNodes,
      nextCity,
      nextProject
    );
    setCity(nextCity);
    setProject(nextProject);
    setPath(findBestLocationPath(initialTree, initialValue.location));
    setSimpleLocation(initialTree ? '' : initialValue.location || '');
    setDepartment(initialValue.department || '--');
  }, [
    initialValue.city,
    initialValue.department,
    initialValue.location,
    initialValue.project,
    isOpen,
    projectLocationNodes
  ]);

  const handlePathChange = (depth: number, value: string) => {
    setPath(value ? [...path.slice(0, depth), value] : path.slice(0, depth));
  };

  const resolvedLocation = tree ? path.join(' / ') : simpleLocation;
  const canConfirm = Boolean(city && project && locationComplete && department);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="form"
      title={(
        <div>
          <p className="text-[10px] font-black uppercase text-primary-600">Xác nhận vị trí kiểm thực tế</p>
          <p className="font-mono text-sm font-bold text-slate-800">{assetCode}</p>
        </div>
      )}
      footer={(
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 px-4 text-xs font-black text-slate-600">Hủy</button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm({ city, project, location: resolvedLocation, department })}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-xs font-black text-white disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> Xác nhận vị trí
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">
            Thành phố *
            <select
              aria-label="Thành phố kiểm thực tế"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setProject('');
                setPath([]);
                setSimpleLocation('');
              }}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold normal-case text-slate-800"
            >
              <option value="">-- Chọn thành phố --</option>
              {cityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-[10px] font-black uppercase text-slate-500">
            Dự án *
            <select
              aria-label="Dự án kiểm thực tế"
              value={project}
              disabled={!city}
              onChange={(event) => {
                setProject(event.target.value);
                setPath([]);
                setSimpleLocation('');
              }}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold normal-case text-slate-800 disabled:bg-slate-100"
            >
              <option value="">-- Chọn dự án --</option>
              {projectOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {project && tree && levels.map((options, depth) => (
          <label key={depth} className="block space-y-1 text-[10px] font-black uppercase text-slate-500">
            {PROJECT_LOCATION_LEVEL_LABELS[depth] || `Cấp vị trí ${depth + 1}`} *
            <select
              aria-label={`${PROJECT_LOCATION_LEVEL_LABELS[depth] || `Cấp vị trí ${depth + 1}`} kiểm thực tế`}
              value={path[depth] || ''}
              onChange={(event) => handlePathChange(depth, event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold normal-case text-slate-800"
            >
              <option value="">-- Chọn {PROJECT_LOCATION_LEVEL_LABELS[depth]?.toLocaleLowerCase('vi') || 'vị trí'} --</option>
              {options.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ))}

        {project && !tree && (
          <label className="block space-y-1 text-[10px] font-black uppercase text-slate-500">
            Vị trí chi tiết *
            <select
              aria-label="Vị trí chi tiết kiểm thực tế"
              value={simpleLocation}
              onChange={(event) => setSimpleLocation(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold normal-case text-slate-800"
            >
              <option value="">-- Chọn vị trí chi tiết --</option>
              {simpleOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}

        <label className="block space-y-1 text-[10px] font-black uppercase text-slate-500">
          Phòng/Ban kiểm thực tế *
          <select
            aria-label="Phòng ban kiểm thực tế"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold normal-case text-slate-800"
          >
            {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>

        <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase text-primary-600">Đường dẫn sẽ lưu</p>
            <p className="break-words text-xs font-bold text-slate-700">
              {[city, project, resolvedLocation, department].filter(Boolean).join(' - ') || '--'}
            </p>
          </div>
          <Building2 className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
        </div>
      </div>
    </BaseModal>
  );
};
