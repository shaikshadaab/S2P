export type UserRole = "customer" | "staff" | "owner" | "platform_admin";

export type OrderStatus =
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "QUEUED"
  | "CLAIMED"
  | "DOWNLOADING"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type PrintJobStatus =
  | "QUEUED"
  | "CLAIMED"
  | "DOWNLOADING"
  | "DOWNLOADED"
  | "PRINTING"
  | "SUBMITTED_TO_SPOOLER"
  | "COMPLETED"
  | "FAILED";

export type ColorMode = "bw" | "color";
export type PaperSize = "A4" | "A3" | "Photo";
export type DuplexMode = "none" | "long-edge" | "short-edge";

export interface Profile {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHoursDay {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface BusinessHours {
  monday: BusinessHoursDay;
  tuesday: BusinessHoursDay;
  wednesday: BusinessHoursDay;
  thursday: BusinessHoursDay;
  friday: BusinessHoursDay;
  saturday: BusinessHoursDay;
  sunday: BusinessHoursDay;
}

export interface Shop {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  businessCategory: string;
  mobile: string;
  whatsappNumber?: string | null;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  googleMapsUrl?: string | null;
  logoUrl?: string | null;
  businessHours: BusinessHours;
  isOpen: boolean;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSettings {
  id: string;
  shopId: string;
  maxFileSizeMb: number;
  maxPages: number;
  allowedFileTypes: string[];
  autoPrintEnabled: boolean;
  manualApprovalMode: boolean;
  jobTimeoutSeconds: number;
  retentionHours: number;
  lowPaperWarning: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  shopId: string;
  deviceTokenHash: string;
  computerName: string;
  osVersion?: string | null;
  agentVersion: string;
  isOnline: boolean;
  lastSeenAt: string;
  defaultPrinterId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Printer {
  id: string;
  deviceId: string;
  shopId: string;
  name: string;
  driverName?: string | null;
  isDefault: boolean;
  isOnline: boolean;
  isColorSupported: boolean;
  isDuplexSupported: boolean;
  supportedPaperSizes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerUpload {
  id: string;
  shopId: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Checksum: string;
  pageCount: number;
  imageCount: number;
  expiresAt: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerUploadId: string;
  customerName: string;
  customerMobile: string;
  customerWhatsapp?: string | null;
  status: OrderStatus;
  totalPages: number;
  printableSides: number;
  physicalSheets: number;
  copies: number;
  colorMode: ColorMode;
  paperSize: PaperSize;
  isDuplex: boolean;
  duplexMode: DuplexMode;
  pagesPerSheet: number;
  pageRangeText: string;
  idempotencyKey?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrintJob {
  id: string;
  orderId: string;
  shopId: string;
  deviceId?: string | null;
  printerId?: string | null;
  status: PrintJobStatus;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  claimCount: number;
  retryCount: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobEvent {
  id: string;
  jobId: string;
  orderId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus: string;
  payload?: any;
  createdAt: string;
}

export interface PairingCode {
  id: string;
  shopId: string;
  code: string;
  expiresAt: string;
  isUsed: boolean;
  usedByDeviceId?: string | null;
  createdAt: string;
}
