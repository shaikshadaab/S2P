export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

export type PrintDispatchMode = 'STAFF_APPROVAL' | 'AUTO_AFTER_PAYMENT';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpiConfiguration {
  upiId: string;
  merchantName: string;
  qrCodeUrl?: string;
  isEnabled: boolean;
  isVerified: boolean;
}

export interface ShopOptionItem {
  id: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ShopPrintOptions {
  printDispatchMode?: PrintDispatchMode;
  paperSizes: ShopOptionItem[];
  paperTypes: ShopOptionItem[];
  colorModes: ShopOptionItem[];
  duplexModes: ShopOptionItem[];
  orientations: ShopOptionItem[];
  scalings: ShopOptionItem[];
  finishingOptions: ShopOptionItem[];
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  purgeFilesAfterPrint: true,
  successfulPrintRetentionSeconds: 60,
  unpaidOrderExpiryHours: 24
};

export interface RetentionPolicy {
  purgeFilesAfterPrint: boolean;
  successfulPrintRetentionSeconds: number; // Phase 3: 60 seconds post-print
  unpaidOrderExpiryHours: number;          // Phase 3: 24 hours for abandoned uploads
  /** @deprecated Backwards-compatibility helper for Phase 0/1 configs */
  successfulPrintRetentionHours?: number;
}

export function resolveRetentionSeconds(policy?: Partial<RetentionPolicy>): number {
  if (typeof policy?.successfulPrintRetentionSeconds === 'number') {
    return policy.successfulPrintRetentionSeconds;
  }
  if (typeof policy?.successfulPrintRetentionHours === 'number') {
    return policy.successfulPrintRetentionHours * 3600;
  }
  return 60; // Default: 60-second post-print purge
}

export interface ShopSettings {
  allowGuestOrders: boolean;
  maxUploadSizeBytes: number; // e.g. 52428800 (50 MB)
  autoQueuePaidOrders: boolean;
  printDispatchMode?: PrintDispatchMode;
  requireCounterVerificationForUpi: boolean;
  retentionPolicy: RetentionPolicy;
}

export interface Shop {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  currency: 'INR' | string;
  timezone: string;
  status: TenantStatus;
  contactNumber?: string;
  address?: string;
  upiConfig?: UpiConfiguration;
  printOptions?: ShopPrintOptions;
  settings?: ShopSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ShopMember {
  id?: string;
  userId: string;
  organizationId: string;
  shopId: string;
  role: 'OWNER' | 'MANAGER' | 'COUNTER_STAFF' | 'PRINT_OPERATOR' | 'FINISHING_STAFF';
  status: TenantStatus;
  displayName?: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  shopId?: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}
