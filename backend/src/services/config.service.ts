export type BusinessHoursConfig = {
  timezone: string;
  businessHours: {
    startTime: string;
    endTime: string;
  };
};

export type UnresolvedDeadlineConfig = {
  minNextWorkingDayAfterEndTime: boolean;
  maxDaysAfterClosingDate: number;
};

export class ConfigService {
  static getBusinessHours(_organizationId?: string, _tenantId?: string): BusinessHoursConfig {
    return {
      timezone: process.env.BUSINESS_TIMEZONE || 'Asia/Ho_Chi_Minh',
      businessHours: {
        startTime: process.env.BUSINESS_HOURS_START || '08:00',
        endTime: process.env.BUSINESS_HOURS_END || '16:00',
      },
    };
  }

  static getUnresolvedDeadlineConfig(_organizationId?: string, _tenantId?: string): UnresolvedDeadlineConfig {
    const maxDays = Number(process.env.INVENTORY_UNRESOLVED_MAX_DAYS || 30);
    return {
      minNextWorkingDayAfterEndTime: process.env.INVENTORY_UNRESOLVED_MIN_NEXT_DAY_AFTER_END !== 'false',
      maxDaysAfterClosingDate: Number.isFinite(maxDays) && maxDays > 0 ? maxDays : 30,
    };
  }
}
