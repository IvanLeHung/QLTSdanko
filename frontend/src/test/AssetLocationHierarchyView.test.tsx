import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetLocationHierarchyView, buildLocationHierarchyLevel } from '../components/AssetLocationHierarchyView';
import type { AssetGroupedBook } from '../components/AssetGroupedView';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

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

  it('expands children inline while keeping sibling provinces visible', () => {
    render(
      <AssetLocationHierarchyView
        groups={groups}
        assetCount={4}
        loading={false}
        isDetailOpen={false}
        onOpenAsset={vi.fn()}
        onAssetAction={vi.fn()}
        onAssetsAction={vi.fn()}
        onApplyFilter={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Hà Nội/ }));
    expect(screen.getByText('Văn phòng C6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thái Nguyên/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Thái Nguyên/ }));
    expect(screen.getByText('Danko City')).toBeInTheDocument();
    expect(screen.getByText('Văn phòng C6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hà Nội/ }));
    expect(screen.queryByText('Văn phòng C6')).not.toBeInTheDocument();
    expect(screen.getByText('Danko City')).toBeInTheDocument();
  });
});
