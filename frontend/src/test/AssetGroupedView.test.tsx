import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetGroupedView, type AssetGroupedBook } from '../components/AssetGroupedView';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

const assets = [
  {
    id: 1,
    assetCode: 'TS-001',
    assetName: 'Tài sản 1',
    status: 'ASSIGNED',
    currentUserName: 'Người dùng 1',
    cityName: 'Hà Nội',
    locationName: 'Văn phòng C6',
  },
  {
    id: 2,
    assetCode: 'TS-002',
    assetName: 'Tài sản 2',
    status: 'ASSIGNED',
    currentUserName: null,
    currentAssigneeType: 'AREA',
    assignedAreaName: 'Bể bơi Danko City',
    cityName: 'Hà Nội',
    locationName: 'Kho C6',
  },
  {
    id: 3,
    assetCode: 'TS-003',
    assetName: 'Tài sản hỏng',
    status: 'DAMAGED',
    currentUserName: 'Người dùng 3',
    cityName: 'Thái Nguyên',
    locationName: 'Danko City',
  },
];

const groups: AssetGroupedBook[] = [{
  key: 'group-1',
  codePath: '01 - 01.01',
  name: 'Thiết bị',
  breadcrumb: [{ label: 'Tài sản' }, { label: 'Thiết bị' }],
  assets,
  locations: [{ key: 'Hà Nội', assets }],
  statusSummary: {
    assigned: 2,
    inStock: 0,
    needsAction: 1,
  },
}];

const baseProps = {
  groups,
  assetCount: assets.length,
  loading: false,
  isDetailOpen: false,
  onOpenAsset: vi.fn(),
  onAssetAction: vi.fn(),
  onAssetsAction: vi.fn(),
  onApplyFilter: vi.fn(),
};

describe('AssetGroupedView', () => {
  let lastScrolledAssetId: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    lastScrolledAssetId = undefined;
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function scrollIntoView() {
        lastScrolledAssetId = this.dataset.assetId;
      },
    });
  });

  it('jumps to the last selected asset and clears selection after a completed action', () => {
    const { rerender } = render(<AssetGroupedView {...baseProps} selectionResetKey={0} />);

    fireEvent.click(screen.getByLabelText('Chọn TS-001'));
    fireEvent.click(screen.getByLabelText('Chọn TS-002'));
    fireEvent.click(screen.getByTitle('Đi tới tài sản cuối cùng đã chọn'));

    expect(lastScrolledAssetId).toBe('2');
    expect(screen.getByTitle('Đi tới tài sản cuối cùng đã chọn')).toHaveTextContent('2 tài sản');

    rerender(<AssetGroupedView {...baseProps} selectionResetKey={1} />);

    expect(screen.queryByTitle('Đi tới tài sản cuối cùng đã chọn')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chọn TS-001')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn TS-002')).toBeInTheDocument();
  });

  it('provides repair and liquidation actions for the whole group', () => {
    render(<AssetGroupedView {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Mở thao tác nhóm/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sửa chữa / Bảo trì nhóm' }));
    expect(baseProps.onAssetsAction).toHaveBeenCalledWith('repair', assets);

    fireEvent.click(screen.getByRole('button', { name: /Mở thao tác nhóm/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Thanh lý nhóm' }));
    expect(baseProps.onAssetsAction).toHaveBeenCalledWith('liquidation', assets);
  });

  it('shows an assigned area instead of marking the asset as unassigned', () => {
    render(<AssetGroupedView {...baseProps} />);

    expect(screen.getByText('Bể bơi Danko City')).toBeInTheDocument();
    expect(screen.getByText('Khu vực sử dụng')).toBeInTheDocument();
  });

  it('allows a damaged asset to start a transfer', () => {
    render(<AssetGroupedView {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở tác vụ cho TS-003' }));
    fireEvent.click(screen.getByRole('button', { name: 'Điều chuyển tài sản hỏng' }));

    expect(baseProps.onAssetAction).toHaveBeenCalledWith('handover', assets[2]);
  });
});
