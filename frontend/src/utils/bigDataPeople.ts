export type BigDataPersonOption = {
  key: string;
  id?: number;
  fullName: string;
  phone: string;
  position: string;
  departmentName: string;
  cityName: string;
  projectName: string;
  locationName: string;
  source: 'MANUAL' | 'USER' | 'ASSET';
  duplicateName: boolean;
};

export const normalizeBigDataPersonName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLocaleLowerCase('vi')
  .replace(/\s+/g, ' ')
  .trim();

export const getBigDataPersonIdentity = (person: BigDataPersonOption) => [
  person.phone ? `SĐT ${person.phone}` : 'Chưa có SĐT',
  person.position,
  person.departmentName
].filter(Boolean).join(' · ');

export const getBigDataPersonLocation = (person: BigDataPersonOption) => [
  person.cityName,
  person.projectName,
  person.locationName
].filter(Boolean).join(' - ');

export const getBigDataPersonSourceLabel = (source: BigDataPersonOption['source']) => ({
  MANUAL: 'Danh mục',
  USER: 'Tài khoản',
  ASSET: 'Sổ tài sản'
}[source]);

export const getBigDataPersonAssignmentFields = (person: BigDataPersonOption) => ({
  currentUserName: person.fullName,
  currentUserPhone: person.phone || '',
  currentPosition: person.position || '',
  departmentName: person.departmentName || '',
  locationName: person.locationName || '',
  cityName: person.cityName || '',
  projectName: person.projectName || ''
});
