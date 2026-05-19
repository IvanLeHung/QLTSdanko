import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TemplateConfigModal } from '../components/TemplateConfigModal';

// Mock dependencies
vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true
  })
}));

describe('TemplateConfigModal', () => {
  it('renders correctly when open', () => {
    render(
      <TemplateConfigModal 
        isOpen={true} 
        onClose={() => {}} 
        template={null} 
        onSave={() => {}} 
      />
    );
    
    expect(screen.getByText('Thêm mới biểu mẫu')).toBeInTheDocument();
    expect(screen.getByText('1. Thông tin chung')).toBeInTheDocument();
  });

  it('renders edit mode with existing template data', () => {
    const mockTmpl = {
      id: 1,
      name: 'Mẫu bàn giao test',
      code: 'BM99/TEST',
      module: 'HANDOVER',
      status: 'ACTIVE',
      version: 'v2',
      isDefault: true,
      configJson: JSON.stringify({
        page: { size: 'A4', orientation: 'portrait' },
        header: { showLogo: true },
        assetTable: { columns: ['index', 'assetName'] },
        signature: { columns: ['sender', 'receiver'] },
        footer: { showPageNumber: true }
      })
    };

    render(
      <TemplateConfigModal 
        isOpen={true} 
        onClose={() => {}} 
        template={mockTmpl} 
        onSave={() => {}} 
      />
    );
    
    expect(screen.getByText('Cấu hình biểu mẫu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ví dụ: Biên bản bàn giao tài sản...')).toHaveValue('Mẫu bàn giao test');
  });

  it('can navigate through tabs', () => {
    render(
      <TemplateConfigModal 
        isOpen={true} 
        onClose={() => {}} 
        template={null} 
        onSave={() => {}} 
      />
    );

    // Click Tab 2
    const tab2Button = screen.getByText('2. Khung & Tiêu đề');
    fireEvent.click(tab2Button);
    expect(screen.getByText('Thiết lập khổ trang PDF')).toBeInTheDocument();

    // Click Tab 3
    const tab3Button = screen.getByText('3. Cột tài sản');
    fireEvent.click(tab3Button);
    expect(screen.getByText('Chọn các cột thông tin trong bảng tài sản')).toBeInTheDocument();
  });
});
