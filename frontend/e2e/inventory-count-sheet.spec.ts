import { expect, test } from '@playwright/test';

const inventory = {
  id: 99,
  inventoryCode: 'INV-DEMO',
  inventoryName: 'Kiểm kê tháng 8/2026',
  status: 'IN_PROGRESS',
  items: [
    {
      id: 1,
      assetId: 101,
      assetCode: '01.03.01.01.001',
      expectedCity: 'Hà Nội',
      expectedProject: 'Văn phòng C6',
      expectedLocation: 'Mặt trước C6-I',
      expectedDepartment: 'B. Kế toán',
      expectedUserName: 'Nguyễn An',
      expectedSerialNumber: 'DELL001',
      bookQuantity: 1,
      actualQuantity: null,
      asset: { assetName: 'Laptop Dell Latitude 3410' }
    },
    {
      id: 2,
      assetId: 102,
      assetCode: '01.03.01.01.002',
      expectedCity: 'Bắc Ninh',
      expectedProject: 'Danko Riverside',
      expectedLocation: 'Văn phòng Bán hàng',
      expectedDepartment: 'B. Cây Xanh',
      expectedUserName: 'Khu vực sảnh',
      expectedSerialNumber: 'MONITOR002',
      bookQuantity: 1,
      actualQuantity: 1,
      quality: 'GOOD',
      checkedAt: '2026-08-17T03:00:00.000Z',
      asset: { assetName: 'Màn hình Dell E2216H' }
    }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    json: {
      id: 1,
      username: 'admin',
      fullName: 'Quản trị viên',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN'],
      permissions: ['INVENTORY_VIEW', 'INVENTORY_CREATE', 'INVENTORY_COMPLETE']
    }
  }));
  await page.route('**/api/inventory/99/count-sheet', (route) => route.fulfill({ json: inventory }));
  await page.route('**/api/settings/project-location-nodes', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/assets/101', (route) => route.fulfill({
    json: {
      id: 101,
      assetCode: '01.03.01.01.001',
      assetName: 'Laptop Dell Latitude 3410',
      status: 'ASSIGNED',
      serialNumber: 'DELL001',
      currentUserName: 'Nguyễn An',
      departmentName: 'B. Kế toán',
      cityName: 'Hà Nội',
      projectName: 'Văn phòng C6',
      locationName: 'Mặt trước C6-I'
    }
  }));
});

test('shows the hierarchical count sheet and supports 0/1 counting', async ({ page }) => {
  await page.goto('/inventory/99');
  await expect(page.getByRole('heading', { name: 'Kiểm kê tháng 8/2026' })).toBeVisible();
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Dự án: Văn phòng C6' }).click();
  await page.getByRole('button', { name: 'Vị trí: Mặt trước C6-I' }).click();
  await page.getByRole('button', { name: 'Phòng/Ban: B. Kế toán' }).click();

  await page.getByRole('button', { name: '01.03.01.01.001' }).click();
  await expect(page.getByRole('heading', { name: 'Laptop Dell Latitude 3410' })).toBeVisible();
  await page.keyboard.press('Escape');

  const quantity = page.getByLabel('Số lượng thực tế 01.03.01.01.001');
  await quantity.fill('0');
  await expect(page.getByText('Thiếu', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Bắt buộc nhập lý do thiếu...')).toBeVisible();

  await page.getByPlaceholder('Tìm mã, tên, serial, người dùng, vị trí...').fill('MONITOR002');
  await expect(page.getByText('Màn hình Dell E2216H')).toBeVisible();
  await expect(page.getByText('Laptop Dell Latitude 3410')).toHaveCount(0);
});
