import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssetLabelPrintModal } from '../components/AssetLabelPrintModal';

// Mock dependencies
vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('react-qr-code', () => ({
  default: () => <div data-testid="qr-code" />
}));

vi.mock('react-barcode', () => ({
  default: () => <div data-testid="barcode" />
}));

describe('AssetLabelPrintModal', () => {
  const mockAssets = [
    { id: '1', assetName: 'Laptop Dell', assetCode: 'DELL-001', status: 'IN_USE' },
    { id: '2', assetName: 'Monitor LG', assetCode: '', status: 'IN_STORE' } // Missing code
  ];

  it('renders correctly when open', () => {
    render(
      <AssetLabelPrintModal 
        isOpen={true} 
        onClose={() => {}} 
        assets={mockAssets} 
      />
    );
    
    expect(screen.getByText('In tem tài sản')).toBeInTheDocument();
    expect(screen.getAllByText('Laptop Dell').length).toBeGreaterThan(0);
  });

  it('displays a warning for assets with missing codes', () => {
    render(
      <AssetLabelPrintModal 
        isOpen={true} 
        onClose={() => {}} 
        assets={mockAssets} 
      />
    );
    
    // Using a more flexible matcher for the Vietnamese text
    expect(screen.getByText(/chưa có mã sẽ bị loại khỏi danh sách in/i)).toBeInTheDocument();
  });

  it('handles fallback asset code mapping correctly', () => {
    const assetsWithVariousCodes = [
      { id: '3', assetName: 'Test 1', asset_code: 'CODE-A' },
      { id: '4', assetName: 'Test 2', code: 'CODE-B' }
    ];

    render(
      <AssetLabelPrintModal 
        isOpen={true} 
        onClose={() => {}} 
        assets={assetsWithVariousCodes} 
      />
    );

    // Codes appear in both list and preview, so we use getAllByText
    expect(screen.getAllByText('CODE-A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CODE-B').length).toBeGreaterThan(0);
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <AssetLabelPrintModal 
        isOpen={false} 
        onClose={() => {}} 
        assets={mockAssets} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });
});
