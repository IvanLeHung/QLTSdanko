export const ACTION_MAP: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  CREATE_AND_COMPLETE: 'Tạo và hoàn tất',
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  EXPORT: 'Xuất báo cáo',
  PRINT: 'In',
  CANCEL: 'Hủy',
  CONFIRM: 'Xác nhận',
  ASSIGN: 'Bàn giao',
  REPAIR: 'Sửa chữa',
  REQUEST: 'Yêu cầu',
  COMPLETE: 'Hoàn tất',
  DAMAGE: 'Báo hỏng',
  LOST: 'Báo mất',
  LIQUIDATE: 'Thanh lý',
  IMPORT: 'Nhập Excel',
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
  RESET_PASSWORD: 'Reset mật khẩu',
  LOCK_USER_BY_FAILED_LOGIN: 'Tạm khóa tài khoản do sai pass nhiều lần',
};

export const ENTITY_MAP: Record<string, string> = {
  ASSET: 'Tài sản',
  HANDOVER: 'HS Bàn giao/Điều chuyển',
  USER: 'Người dùng',
  WAREHOUSE: 'Kho',
  INVENTORY: 'Tồn kho',
  CATEGORY: 'Nhóm tài sản',
  SUPPLIER: 'Nhà cung cấp',
  REPAIR: 'Sửa chữa',
  DAMAGE: 'Hỏng hóc',
  LOST: 'Mất mát',
  LIQUIDATION: 'Thanh lý',
  DOCUMENT: 'Tài liệu',
  API: 'Hệ thống API',
  TEMPLATE: 'Biểu mẫu',
  TOOL: 'Công cụ dụng cụ',
  TOOL_EQUIPMENT: 'Công cụ dụng cụ',
};

export const STATUS_MAP: Record<string, string> = {
  ASSIGNED: 'Đang sử dụng',
  USING: 'Đang sử dụng',
  IN_STOCK: 'Trong kho',
  BROKEN: 'Báo hỏng',
  DAMAGED: 'Hỏng',
  LOST: 'Mất / thất thoát',
  LIQUIDATED: 'Đã thanh lý',
  DRAFT: 'Bản nháp',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const FIELD_MAP: Record<string, string> = {
  status: 'Trạng thái',
  currentUserName: 'Người dùng',
  departmentName: 'Phòng ban',
  locationName: 'Vị trí',
  cityName: 'Thành phố',
  assetName: 'Tên tài sản',
  serialNumber: 'Số serial',
  purchasePriceExVat: 'Giá mua (chưa VAT)',
  unit: 'Đơn vị tính',
  usagePurpose: 'Mục đích sử dụng',
  purchaseDate: 'Ngày mua',
  depreciationEndDate: 'Ngày hết khấu hao',
  supplierName: 'Nhà cung cấp',
  companyCode: 'Công ty',
  assetCode: 'Mã tài sản',
  toolCode: 'Mã CCDC',
  toolName: 'Tên CCDC',
  category: 'Nhóm CCDC',
  quantity: 'Số lượng',
  purchasePrice: 'Giá trị',
  note: 'Ghi chú',
  type: 'Loại nghiệp vụ',
  documentNo: 'Mã hồ sơ',
};

export class AuditParser {
  static getActionName(action: string): string {
    return ACTION_MAP[action] || action;
  }

  static getEntityName(entity: string): string {
    return ENTITY_MAP[entity] || entity;
  }

  static getStatusName(status: string | null | undefined): string {
    if (!status) return 'Trống';
    return STATUS_MAP[status] || status;
  }

  static getFieldName(field: string): string {
    return FIELD_MAP[field] || field;
  }

  static parseDetails(details: string | null): any {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  }

  static buildDescription(log: { action: string; entityType: string; entityId: number; details: string | null }): string {
    const parsed = this.parseDetails(log.details);
    const actionVn = this.getActionName(log.action);
    const entityVn = this.getEntityName(log.entityType);

    // Custom authentication descriptions
    if (log.action === 'LOGIN_SUCCESS') {
      return 'Đăng nhập hệ thống thành công.';
    }
    if (log.action === 'LOGIN_FAILED') {
      return `Đăng nhập hệ thống thất bại. Lý do: ${parsed?.reason || 'Mật khẩu không đúng'}.`;
    }
    if (log.action === 'LOCK_USER_BY_FAILED_LOGIN') {
      return 'Tài khoản bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp.';
    }
    if (log.action === 'CHANGE_PASSWORD') {
      return 'Thay đổi mật khẩu cá nhân thành công.';
    }
    if (log.action === 'RESET_PASSWORD') {
      return `Quản trị viên đã đặt lại mật khẩu. Yêu cầu đổi pass tiếp theo: ${parsed?.mustChangePassword ? 'Có' : 'Không'}.`;
    }
    if (log.action === 'LOGOUT') {
      return 'Đăng xuất khỏi hệ thống.';
    }

    // Special parsing for TEMPLATE
    if (log.entityType === 'TEMPLATE') {
      if (log.action === 'CREATE') {
        return `Tạo biểu mẫu [${parsed?.code}] - ${parsed?.name} (${parsed?.module}).`;
      }
      if (log.action === 'UPDATE') {
        return `Cập nhật cấu hình biểu mẫu [${parsed?.code}] - ${parsed?.name} (Phiên bản: ${parsed?.version || 'v1'}). Ghi chú: ${parsed?.changeNote || 'Không có'}`;
      }
      if (log.action === 'DELETE') {
        return `Xóa biểu mẫu [${parsed?.code}] - ${parsed?.name} (${parsed?.module}).`;
      }
    }

    // If it's a simple API log from middleware
    if (log.details && log.details.startsWith('API:')) {
      return `${actionVn} ${entityVn} thông qua API.`;
    }

    if (!parsed) {
      if (log.details) return log.details;
      return `${actionVn} ${entityVn}.`;
    }

    // Special parsing for ASSET & TOOL updates
    if ((log.entityType === 'ASSET' || log.entityType === 'TOOL' || log.entityType === 'TOOL_EQUIPMENT') && log.action === 'UPDATE' && parsed.changes) {
      const changeTexts: string[] = [];
      for (const [key, val] of Object.entries(parsed.changes)) {
        const v = val as { old: any; new: any };
        const fieldVn = this.getFieldName(key);
        
        let oldValStr = v.old || 'Trống';
        let newValStr = v.new || 'Trống';

        if (key === 'status') {
          oldValStr = this.getStatusName(oldValStr);
          newValStr = this.getStatusName(newValStr);
        }

        changeTexts.push(`${fieldVn} từ [${oldValStr}] sang [${newValStr}]`);
      }
      if (changeTexts.length > 0) {
        const label = log.entityType === 'ASSET' ? 'tài sản' : 'công cụ dụng cụ';
        return `Cập nhật ${label}: ${changeTexts.join('; ')}.`;
      }
    }

    // Special parsing for HANDOVER creates
    if ((log.entityType === 'HANDOVER' || log.entityType === 'ASSET_TRANSFERS') && parsed.documentNo) {
      let typeLabel = parsed.type || 'bàn giao';
      if (parsed.type === 'TRANSFER') typeLabel = 'điều chuyển';
      if (parsed.type === 'RECALL') typeLabel = 'thu hồi';
      
      const assetCount = parsed.assetCount ? ` gồm ${parsed.assetCount} tài sản` : '';
      return `${actionVn} biên bản ${typeLabel} ${parsed.documentNo}${assetCount}.`;
    }

    // Fallback
    return `${actionVn} ${entityVn} #${log.entityId}.`;
  }
}
