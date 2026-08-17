import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('../lib/api', () => ({ default: { get: apiGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

import { BigDataCenter } from '../pages/BigDataCenter';

describe('Big Data Center', () => {
  it('shows unified people, departments and hierarchical locations', async () => {
    apiGet.mockResolvedValueOnce({ data: {
      people: [{ key: 'user:1', fullName: 'Nguyễn Văn A', phone: '0901234567', position: 'Nhân viên', departmentName: 'B. Kế toán', cityName: 'Hà Nội', projectName: 'Văn phòng C6', locationName: 'Mặt trước C6-I', source: 'USER', editable: false }],
      departments: [{ id: 1, code: 'KT', name: 'B. Kế toán', type: 'DEPARTMENT' }],
      locationNodes: [{ id: 1, cityName: 'Thái Nguyên', projectName: 'Danko City', parentPath: '', name: 'KHU TRUNG TÂM', level: 1 }],
      locations: [{ id: 1, key: 'node:1', cityName: 'Thái Nguyên', projectName: 'Danko City', parentPath: '', name: 'KHU TRUNG TÂM', level: 1, source: 'MASTER' }],
      assetLocations: [],
      stats: { people: 1, manualPeople: 0, departments: 1, locationNodes: 1, incompletePeople: 0 }
    } });

    render(<BigDataCenter />);
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Phòng ban/ }));
    expect(screen.getByText('B. Kế toán')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Vị trí sử dụng/ }));
    expect(screen.getByText('KHU TRUNG TÂM')).toBeInTheDocument();
  });
});
