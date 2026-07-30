import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { BM03DamagedModal } from '../components/forms/BM03DamagedModal';
import { BM04LiquidationModal } from '../components/forms/BM04LiquidationModal';

vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const assets = [
  { id: 1, assetCode: 'TS-001', assetName: 'Tài sản 1', currentValue: 100 },
  { id: 2, assetCode: 'TS-002', assetName: 'Tài sản 2', currentValue: 200 },
];

describe('bulk operational forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { id: 10 } });
  });

  it('submits every selected asset in a bulk repair request', async () => {
    render(
      <BM03DamagedModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        assets={assets}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i), {
      target: { value: 'Bảo trì định kỳ cho nhóm tài sản' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận báo hỏng' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/operational/damage', expect.objectContaining({
        assetIds: [1, 2],
        description: 'Bảo trì định kỳ cho nhóm tài sản',
      }));
    });
  });

  it('submits every selected asset in a real liquidation request', async () => {
    render(
      <BM04LiquidationModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        assets={assets}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh lý' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/operational/liquidation', expect.objectContaining({
        assetIds: [1, 2],
        totalValue: 0,
      }));
    });
  });
});
