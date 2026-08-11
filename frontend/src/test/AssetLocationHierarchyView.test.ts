import { describe, expect, it } from 'vitest';
import { buildLocationHierarchyLevel } from '../components/AssetLocationHierarchyView';
import type { AssetGroupedBook } from '../components/AssetGroupedView';

const createGroup = (
  key: string,
  path: string[],
  assets: any[]
): AssetGroupedBook => ({
  key,
  codePath: '',
  name: '',
  breadcrumb: path.map((label) => ({ label })),
  assets,
  locations: [{ key: 'Nhóm tài sản', assets }],
  statusSummary: {
    assigned: assets.filter((asset) => asset.status === 'ASSIGNED').length,
    inStock: assets.filter((asset) => asset.status === 'IN_STOCK').length,
    needsAction: assets.filter((asset) => asset.status === 'DAMAGED').length,
  },
});

const groups = [
  createGroup('hn-c6-hcns', ['Hà Nội', 'Văn phòng C6', 'Mặt trước C6-I', 'Sảnh', 'B. Hành chính Nhân sự'], [
    { id: 1, status: 'ASSIGNED' },
    { id: 2, status: 'IN_STOCK' },
  ]),
  createGroup('hn-c6-kt', ['Hà Nội', 'Văn phòng C6', 'Mặt trước C6-I', 'Tầng 1', 'B. Kế toán'], [
    { id: 3, status: 'DAMAGED' },
  ]),
  createGroup('tn-dkc', ['Thái Nguyên', 'Danko City', 'KHU TRUNG TÂM', 'Danko Plaza', 'B. Quản lý Vận hành Danko City'], [
    { id: 4, status: 'ASSIGNED' },
  ]),
];

describe('asset location hierarchy summaries', () => {
  it('aggregates all assets and projects at province level', () => {
    const provinces = buildLocationHierarchyLevel(groups, []);
    const haNoi = provinces.find((node) => node.label === 'Hà Nội');

    expect(provinces).toHaveLength(2);
    expect(haNoi?.assets).toHaveLength(3);
    expect(haNoi?.childCount).toBe(1);
    expect(haNoi?.assigned).toBe(1);
    expect(haNoi?.inStock).toBe(1);
    expect(haNoi?.needsAction).toBe(1);
  });

  it('drills down from project to location detail and department', () => {
    const locations = buildLocationHierarchyLevel(groups, ['Hà Nội', 'Văn phòng C6']);
    expect(locations).toHaveLength(1);
    expect(locations[0].label).toBe('Mặt trước C6-I');
    expect(locations[0].childCount).toBe(2);

    const departments = buildLocationHierarchyLevel(groups, [
      'Hà Nội',
      'Văn phòng C6',
      'Mặt trước C6-I',
      'Sảnh',
    ]);
    expect(departments.map((node) => node.label)).toEqual(['B. Hành chính Nhân sự']);
  });
});
