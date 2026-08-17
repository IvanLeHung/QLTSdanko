import { describe, expect, it } from 'vitest';
import {
  getBigDataPersonAssignmentFields,
  getBigDataPersonIdentity,
  getBigDataPersonLocation,
  type BigDataPersonOption
} from '../utils/bigDataPeople';

const person: BigDataPersonOption = {
  key: 'asset:chu-thi-mai',
  fullName: 'Chu Thị Mai',
  phone: '0973302883',
  position: 'Phó Giám đốc Truyền thông',
  departmentName: 'B. Marketing & Truyền thông',
  cityName: 'Hà Nội',
  projectName: 'Văn phòng C6',
  locationName: 'Mặt sau C6-II',
  source: 'ASSET',
  duplicateName: true
};

describe('Big Data person option labels', () => {
  it('includes identity fields that distinguish duplicate names', () => {
    expect(getBigDataPersonIdentity(person)).toContain('0973302883');
    expect(getBigDataPersonIdentity(person)).toContain('B. Marketing & Truyền thông');
  });

  it('shows the complete current location', () => {
    expect(getBigDataPersonLocation(person)).toBe('Hà Nội - Văn phòng C6 - Mặt sau C6-II');
  });

  it('fills all assignment fields from the selected Big Data person', () => {
    expect(getBigDataPersonAssignmentFields(person)).toEqual({
      currentUserName: 'Chu Thị Mai',
      currentUserPhone: '0973302883',
      currentPosition: 'Phó Giám đốc Truyền thông',
      departmentName: 'B. Marketing & Truyền thông',
      cityName: 'Hà Nội',
      projectName: 'Văn phòng C6',
      locationName: 'Mặt sau C6-II'
    });
  });
});
