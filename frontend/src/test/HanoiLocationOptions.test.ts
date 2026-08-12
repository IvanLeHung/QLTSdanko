import { describe, expect, it } from 'vitest';
import {
  getLocationTreeLevels,
  getProjectLocationTree,
  isLocationPathComplete,
  LOCATION_HIERARCHY,
} from '../components/TransferWizard';

describe('Hanoi location options', () => {
  it('uses the same C6 labels that the API stores', () => {
    const locations = LOCATION_HIERARCHY['Hà Nội']['Văn phòng C6'];

    expect(locations).toEqual(expect.arrayContaining([
      'Mặt trước C6-I',
      'Mặt sau C6-I',
      'Mặt trước C6-II',
      'Mặt sau C6-II',
      'Tầng 9 C6-I',
      'Tầng 2 C6-II',
    ]));
    expect(locations.some((location) => location.includes('Khối'))).toBe(false);
  });

  it('uses editable location trees for Hanoi projects', () => {
    const c6Tree = getProjectLocationTree('Hà Nội', 'Văn phòng C6');
    const vanCanhTree = getProjectLocationTree('Hà Nội', 'Vân Canh');

    expect(getLocationTreeLevels(c6Tree, [])[0]).toEqual(expect.arrayContaining([
      'Mặt trước C6-I',
      'Mặt trước C6-II',
      'Kho',
    ]));
    expect(isLocationPathComplete(c6Tree, ['Mặt trước C6-II'])).toBe(true);
    expect(isLocationPathComplete(vanCanhTree, ['Kho'])).toBe(true);
  });
});
