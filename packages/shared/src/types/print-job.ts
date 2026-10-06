export type PrintJobStatus =
  // Canonical Phase 5 statuses
  | 'CREATED'
  | 'QUEUED'
  | 'LEASED'
  | 'DOWNLOADING'
  | 'PREPARING'
  | 'READY_TO_PRINT'
  | 'SUBMITTING'
  // Modeled future states
  | 'SUBMITTED'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ON_HOLD'
  | 'PRINTER_OFFLINE'
  | 'PAPER_OUT'
  | 'CAPABILITY_MISMATCH'
  | 'STATUS_UNKNOWN'
  | 'CANCELLED'
  // Backwards compatibility
  | 'CLAIMED'
  | 'VALIDATING'
  | 'SPOOLING'
  | 'SPOOL_COMPLETED'
  | 'RETRY_PENDING';

export interface PrintJobLease {
  deviceId: string;
  leaseTokenHash: string;
  claimedAt: string;
  expiresAt: string;
}

export interface PrintJobFileSnapshot {
  fileId: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  pageCount: number;
  filename: string;
}

export interface PrintJob {
  id: string;
  organizationId: string;
  shopId: string;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  fileId: string;
  printerId?: string | null;
  deviceId?: string | null;
  status: PrintJobStatus;
  priority: number;
  printConfigSnapshot: Record<string, unknown>;
  fileSnapshot: PrintJobFileSnapshot;
  attemptCount: number;
  activeAttemptId?: string | null;
  irreversibleStageReached: boolean;
  spoolerJobId?: string | null;
  submissionAttemptId?: string | null;
  documentGroupId?: string | null;
  printMasterSnapshot?: import('./document-group').PrintMasterSnapshot | null;
  lease?: PrintJobLease | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrintAttempt {
  id: string;
  organizationId: string;
  shopId: string;
  printJobId: string;
  orderId: string;
  deviceId: string;
  printerId?: string | null;
  attemptNumber: number;
  status: string;
  startedAt: string;
  lastUpdatedAt: string;
  errorCode?: string | null;
  errorMessageSanitized?: string | null;
  spoolerJobId?: string | null;
  irreversibleStageReached?: boolean;
}

// Backwards compatibility alias
export type PrintJobAttempt = PrintAttempt;
