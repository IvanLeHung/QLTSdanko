import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandAssigneePosition,
  extractAssigneePhones,
  isNonPersonAssignee,
  normalizeAssigneeName,
  normalizeAssigneePosition
} from './assignee-normalization.util';

test('normalizes Vietnamese assignee names for matching', () => {
  assert.equal(normalizeAssigneeName('  Chu  Thị Mai '), 'chu thi mai');
  assert.equal(normalizeAssigneeName('CHU THỊ MAI'), 'chu thi mai');
});

test('normalizes Vietnamese phone values and country codes', () => {
  assert.deepEqual(extractAssigneePhones('0985 066 836 / +84 346 839 314'), [
    '0985066836',
    '0346839314'
  ]);
});

test('treats PGĐ and Phó Giám đốc as the same position', () => {
  assert.equal(expandAssigneePosition('PGĐ Truyền thông'), 'Phó Giám đốc Truyền thông');
  assert.equal(
    normalizeAssigneePosition('PGĐ Truyền thông'),
    normalizeAssigneePosition('Phó Giám đốc Truyền thông')
  );
});

test('excludes areas and multi-person labels from person suggestions', () => {
  assert.equal(isNonPersonAssignee('Cổng ra vào KĐT DKC - Bảo vệ'), true);
  assert.equal(isNonPersonAssignee('Chu Thị Chinh - Vũ Thị Thanh - Phạm Thị Hân'), true);
  assert.equal(isNonPersonAssignee('Đinh Xuân Nam'), false);
});
