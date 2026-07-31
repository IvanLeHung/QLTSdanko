import { describe, expect, it } from 'vitest';
import {
  getLocationTreeLevels,
  getProjectLocationTree,
  isLocationPathComplete,
} from '../components/TransferWizard';

const expectedAmenities = [
  'Phân khu Milano',
  'Công viên Bốn Mùa',
  'Đại lộ Thắng Lợi rộng 60 m',
  'Phân khu Manhattan',
  'Bể bơi Địa Trung Hải',
  'Đảo lộ Tự Do',
  'Kênh Venice',
  'Đường dạo bộ và thể thao ngoài trời',
  'Phân khu Times Square',
  'Club House',
  'Vườn cảnh quan',
];

describe('Danko Avenue location hierarchy', () => {
  const tree = getProjectLocationTree('Thái Nguyên', 'Danko Avenue');

  it('contains all requested internal amenities', () => {
    expect(tree).not.toBeNull();
    expect(Object.keys(tree!)).toEqual(expect.arrayContaining([
      'KHU ĐIỀU HÀNH',
      'TIỆN ÍCH NỘI KHU',
    ]));
    expect(Object.keys(tree!['TIỆN ÍCH NỘI KHU']!)).toEqual(expectedAmenities);
  });

  it('keeps existing operational locations and requires four levels', () => {
    expect(Object.keys(tree!['KHU ĐIỀU HÀNH']!)).toEqual(expect.arrayContaining([
      'Văn phòng Bán hàng',
      'Văn phòng BQLDA',
      'Kho',
    ]));

    const completePath = [
      'TIỆN ÍCH NỘI KHU',
      'Bể bơi Địa Trung Hải',
      'Khuôn viên bể bơi',
      'Khu vực bể bơi',
    ];
    expect(getLocationTreeLevels(tree, completePath)).toHaveLength(4);
    expect(isLocationPathComplete(tree, completePath.slice(0, 3))).toBe(false);
    expect(isLocationPathComplete(tree, completePath)).toBe(true);
  });
});
