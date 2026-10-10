export type SupportedMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export type FileProcessingStatus =
  | 'UPLOADING'
  | 'VALIDATING'
  | 'CONVERTING'
  | 'READY'
  | 'READY_FOR_PRINT'
  | 'FAILED';

export type PurgeStatus =
  | 'NOT_SCHEDULED'
  | 'PENDING'
  | 'PURGING'
  | 'PURGED'
  | 'FAILED';

export interface OrderFile {
  id: string;
  organizationId: string;
  shopId: string;
  orderId: string;
  ownerUid?: string;
  isGuest?: boolean;
  guestSessionId?: string;
  originalFilename: string;
  safeDisplayName: string;
  mimeType: SupportedMimeType | string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  convertedFrom?: 'DOCX' | 'PPTX' | null;
  storageMode?: 'FIREBASE_STORAGE' | 'LOCAL_AGENT';
  agentDeviceId?: string;
  agentLocalPath?: string;
  storageOriginalPath?: string | null;
  storageProcessedPath?: string | null;
  previewPaths?: string[];
  processingStatus: FileProcessingStatus;
  documentAvailable: boolean;
  uploadedAt: string;
  validatedAt?: string;
  readyAt?: string;
  purgeStatus: PurgeStatus;
  purgeAt?: string;
  purgedAt?: string;
  purgeAttempts?: number;
  purgeScheduledForAttemptId?: string;
  lastPurgeError?: string;
}

export interface FileUploadSessionRequest {
  shopId: string;
  orderId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ownerUid?: string;
}

export interface FileUploadSessionResponse {
  fileId: string;
  uploadUrl: string;
  storagePath: string;
  maxSizeBytes: number;
  expiresAt: string;
}
