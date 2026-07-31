import { describe, expect, it } from 'vitest';
import {
  getProjectLocationTree,
  isLocationPathComplete,
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
});
