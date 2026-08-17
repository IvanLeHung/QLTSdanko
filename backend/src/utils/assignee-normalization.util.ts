import { createHash } from 'crypto';

const collapseWhitespace = (value: string | null | undefined) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const stripAccents = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D');

export const cleanAssigneeLabel = collapseWhitespace;

export const normalizeAssigneeName = (value: string | null | undefined) => stripAccents(collapseWhitespace(value))
  .toLocaleLowerCase('vi')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const normalizeAssigneePhone = (value: string | null | undefined) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 11) digits = `0${digits.slice(2)}`;
  return digits;
};

export const extractAssigneePhones = (value: string | null | undefined) => Array.from(new Set(
  String(value || '')
    .split(/[\/,;|\n]+/)
    .map(normalizeAssigneePhone)
    .filter((phone) => phone.length >= 9)
));

export const expandAssigneePosition = (value: string | null | undefined) => {
  const clean = collapseWhitespace(value);
  if (!clean || clean === '0' || clean === '--') return '';
  return clean
    .replace(/(^|\s)PGĐ(?=\s|$)/giu, '$1Phó Giám đốc')
    .replace(/(^|\s)P\.\s*GĐ(?=\s|$)/giu, '$1Phó Giám đốc')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeAssigneePosition = (value: string | null | undefined) => normalizeAssigneeName(
  expandAssigneePosition(value)
);

export const normalizeAssigneeDepartment = (value: string | null | undefined) => normalizeAssigneeName(value);

export const isNonPersonAssignee = (value: string | null | undefined) => {
  const clean = normalizeAssigneeName(value);
  if (!clean) return true;

  const nonPersonPrefixes = [
    'cong ra vao',
    'cong vao',
    'cong ra',
    'kho ',
    'phong ',
    'ban ',
    'bo phan ',
    'dung chung',
    'bao ve ',
    'le tan '
  ];
  if (nonPersonPrefixes.some((prefix) => clean === prefix.trim() || clean.startsWith(prefix))) return true;

  const raw = collapseWhitespace(value);
  return raw.split(/\s+-\s+|\s+&\s+|\s+\/\s+/).length >= 3;
};

export const buildAssigneeVariantKey = (input: {
  name?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
}) => [
  cleanAssigneeLabel(input.name),
  extractAssigneePhones(input.phone).sort().join(','),
  normalizeAssigneePosition(input.position),
  normalizeAssigneeDepartment(input.department)
].join('|');

export const buildAssigneeGroupKey = (normalizedName: string, variantKeys: string[]) => createHash('sha256')
  .update(`${normalizedName}::${[...variantKeys].sort().join('::')}`)
  .digest('hex');
