import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: {
    id: 1, username: 'admin', fullName: 'Quản trị viên', role: 'SUPER_ADMIN',
    roles: ['SUPER_ADMIN'], permissions: ['PERMISSION_MANAGE']
  } }));
  await page.route('**/api/master-data/options', (route) => route.fulfill({ json: {
    people: [{ key: 'user:1', fullName: 'Nguyễn Văn A', phone: '0901234567', position: 'Nhân viên', departmentName: 'B. Kế toán', cityName: 'Hà Nội', projectName: 'Văn phòng C6', locationName: 'Mặt trước C6-I', source: 'USER', editable: false }],
    departments: [{ id: 1, code: 'KT', name: 'B. Kế toán', type: 'DEPARTMENT' }],
    locationNodes: [{ id: 1, cityName: 'Thái Nguyên', projectName: 'Danko City', parentPath: '', name: 'KHU TRUNG TÂM', level: 1 }],
    assetLocations: [],
    locations: [{ id: 1, key: 'node:1', cityName: 'Thái Nguyên', projectName: 'Danko City', parentPath: '', name: 'KHU TRUNG TÂM', level: 1, source: 'MASTER' }],
    stats: { people: 1, manualPeople: 0, departments: 1, locationNodes: 1, incompletePeople: 0 }
  } }));
});

test('provides unified master data tabs for administrators', async ({ page }) => {
  await page.goto('/settings/big-data');
  await expect(page.getByRole('heading', { level: 1, name: 'Big Data Center' })).toBeVisible();
  await expect(page.getByText('Nguyễn Văn A')).toBeVisible();
  await expect(page.getByText('0901234567')).toBeVisible();

  await page.getByRole('button', { name: /Vị trí sử dụng/ }).click();
  await expect(page.getByText('KHU TRUNG TÂM')).toBeVisible();
  await expect(page.getByText('Danh mục', { exact: true })).toBeVisible();
});
