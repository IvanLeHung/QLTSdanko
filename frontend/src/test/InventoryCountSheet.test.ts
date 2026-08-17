import { describe, expect, it } from 'vitest';
import {
  buildInventoryHierarchy,
  calculateCountSheetStats,
  filterInventoryCountItems,
  inventoryLocationsMatch,
  type InventoryCountItem
} from '../utils/inventoryCountSheet';

const items: InventoryCountItem[] = [
  {
    id: 1,
    assetId: 101,
    assetCode: '01.001',
    expectedCity: 'Hà Nội',
    expectedProject: 'Văn phòng C6',
    expectedLocation: 'Mặt trước C6-I',
    expectedDepartment: 'B. Kế toán',
    expectedUserName: 'Nguyễn An',
    bookQuantity: 1,
    actualQuantity: 1,
    quality: 'GOOD',
    asset: { assetName: 'Laptop Dell' }
  },
  {
    id: 2,
    assetId: 102,
    assetCode: '01.002',
    expectedCity: 'Hà Nội',
    expectedProject: 'Văn phòng C6',
    expectedLocation: 'Mặt sau C6-I',
    expectedDepartment: 'B. Kế toán',
    bookQuantity: 1,
    actualQuantity: 0,
    quality: 'MISSING',
    note: 'Không tìm thấy',
    asset: { assetName: 'Màn hình Dell' }
  },
  {
    id: 3,
    assetId: 103,
    assetCode: '01.003',
    expectedCity: 'Bắc Ninh',
    expectedProject: 'Danko Riverside',
    expectedLocation: 'Văn phòng Bán hàng',
    expectedDepartment: 'B. Cây Xanh',
    bookQuantity: 1,
    actualQuantity: null,
    asset: { assetName: 'Máy in Canon' }
  }
];

describe('inventory count sheet', () => {
  it('calculates book, checked, actual, missing and unchecked quantities', () => {
    expect(calculateCountSheetStats(items)).toEqual({
      book: 3,
      checked: 2,
      actual: 1,
      missing: 1,
      unchecked: 1
    });
  });

  it('groups the initial list by city, project, location and department', () => {
    const hierarchy = buildInventoryHierarchy(items);
    expect(hierarchy.map((node) => node.label)).toEqual(['Bắc Ninh', 'Hà Nội']);
    const hanoi = hierarchy[1];
    expect(hanoi.items).toHaveLength(2);
    expect(hanoi.children[0].label).toBe('Văn phòng C6');
    expect(hanoi.children[0].children).toHaveLength(2);
    expect(hanoi.children[0].children[0].children[0].level).toBe('department');
  });

  it('searches across asset code, name, user and hierarchy fields', () => {
    expect(filterInventoryCountItems(items, 'Nguyễn An').map((item) => item.id)).toEqual([1]);
    expect(filterInventoryCountItems(items, 'Danko Riverside').map((item) => item.id)).toEqual([3]);
    expect(filterInventoryCountItems(items, '01.002').map((item) => item.id)).toEqual([2]);
  });

  it('matches hierarchical locations against legacy full location strings', () => {
    expect(inventoryLocationsMatch(
      'Hà Nội - Văn phòng C6 - Mặt trước C6-I',
      'Hà Nội',
      'Văn phòng C6',
      'Mặt trước C6-I'
    )).toBe(true);
    expect(inventoryLocationsMatch(
      'Hà Nội - Văn phòng C6 - Mặt sau C6-I',
      'Hà Nội',
      'Văn phòng C6',
      'Mặt trước C6-I'
    )).toBe(false);
  });
});
