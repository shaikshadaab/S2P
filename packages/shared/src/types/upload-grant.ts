export type UploadGrantStatus = 'ISSUED' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface UploadGrant {
  id: string;
  tokenHash: string; // SHA-256 hash of high-entropy 64-hex token; NEVER raw token in DB
  shopId: string;
  draftId: string;
  targetDeviceId: string;
  agentUploadUrl: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt: string; // 5-minute validity window
  status: UploadGrantStatus;
  usedAt?: string | null;
  confirmedFileId?: string | null;
}

export interface IssueUploadGrantRequest {
  shopId: string;
  draftId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IssueUploadGrantResponse {
  success: boolean;
  grantId: string;
  token: string; // Raw high-entropy token returned ONCE to client
  agentUploadUrl: string;
  expiresAt: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface AgentConfirmUploadRequest {
  grantId: string;
  fileId: string;
  sha256: string;
  pageCount: number;
  sizeBytes: number;
  safeDisplayName: string;
  mimeType: string;
  localPath: string;
  convertedFrom?: 'DOCX' | 'PPTX' | null;
}
