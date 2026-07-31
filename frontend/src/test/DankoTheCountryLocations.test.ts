import { describe, expect, it } from 'vitest';
import {
  getLocationTreeLevels,
  getProjectLocationTree,
  isLocationPathComplete,
  mergeProjectLocationNodes,
} from '../components/TransferWizard';

const expectedPlaces = [
  'Cổng chào The Heritage Gate',
  'Quảng trường Elysium Square',
  'Tháp biểu tượng The Royal Pavilion',
  'Công viên Eden Park',
  'Công viên Felix Park',
  'Công viên Rainbow Park',
  'Công viên Amare Park',
  'Dịch vụ thương mại – khách sạn',
  'Phố đi bộ Sky Avenue',
  'Vườn Sunflower',
  'Bể bơi Danko The Country',
  'Nhà dịch vụ',
];

describe('Danko The Country location hierarchy', () => {
  const tree = getProjectLocationTree('Thanh Hóa', 'Danko The Country');

  it('contains every requested place', () => {
    expect(tree).not.toBeNull();
    const places = Object.values(tree!).flatMap((zone) => zone ? Object.keys(zone) : []);
    expect(places).toEqual(expect.arrayContaining(expectedPlaces));
  });

  it('requires all four location levels', () => {
    const completePath = [
      'KHU TIỆN ÍCH',
      'Bể bơi Danko The Country',
      'Khuôn viên bể bơi',
      'Khu vực bể bơi',
    ];

    expect(isLocationPathComplete(tree, completePath.slice(0, 2))).toBe(false);
    expect(isLocationPathComplete(tree, completePath.slice(0, 3))).toBe(false);
    expect(isLocationPathComplete(tree, completePath)).toBe(true);
  });

  it('merges saved location levels for assignment editing', () => {
    const baseTree = getProjectLocationTree('Bắc Ninh', 'Danko Riverside');
    const nodes = [
      {
        id: 1,
        cityName: 'Bắc Ninh',
        projectName: 'Danko Riverside',
        parentPath: 'PHÂN KHU MAJESTIC / Quảng trường Danko',
        name: 'Khu vực Quảng trường',
        level: 3,
      },
      {
        id: 2,
        cityName: 'Bắc Ninh',
        projectName: 'Danko Riverside',
        parentPath: 'PHÂN KHU MAJESTIC / Quảng trường Danko / Khu vực Quảng trường',
        name: 'Khu vực ngoài trời',
        level: 4,
      },
    ];
    const mergedTree = mergeProjectLocationNodes(baseTree, nodes, 'Bắc Ninh', 'Danko Riverside');
    const completePath = [
      'PHÂN KHU MAJESTIC',
      'Quảng trường Danko',
      'Khu vực Quảng trường',
      'Khu vực ngoài trời',
    ];

    expect(getLocationTreeLevels(mergedTree, completePath)).toHaveLength(4);
    expect(isLocationPathComplete(mergedTree, completePath)).toBe(true);
  });
});
