import { OrderFile, PurgeStatus } from '../types/file';

export interface StorageDeleter {
  (storagePath: string): Promise<boolean>;
}

export interface PurgeExecutionResult {
  fileId: string;
  isPurged: boolean;
  purgedAt: string;
  deletedPaths: string[];
  failedPaths: string[];
  updatedFile: OrderFile;
}

/**
 * Calculates the exact purge timestamp.
 * Standard post-print guarantee: completedAt + 60 seconds.
 */
export function calculatePostPrintPurgeTime(
  completedAtIso: string,
  retentionSeconds: number = 60
): string {
  const completedMs = new Date(completedAtIso).getTime();
  const purgeMs = completedMs + retentionSeconds * 1000;
  return new Date(purgeMs).toISOString();
}

/**
 * Calculates the abandoned/unpaid file expiration timestamp.
 * Standard abandoned policy: uploadedAt + 24 hours.
 */
export function calculateAbandonedPurgeTime(
  uploadedAtIso: string,
  expiryHours: number = 24
): string {
  const uploadMs = new Date(uploadedAtIso).getTime();
  const purgeMs = uploadMs + expiryHours * 3600 * 1000;
  return new Date(purgeMs).toISOString();
}

/**
 * Evaluates print status change and schedules purge ONLY upon confirmed completion.
 *
 * Rules:
 * - PRINT_COMPLETED / COMPLETED: Schedule purgeAt = completedAt + 60 seconds.
 * - STATUS_UNKNOWN: DO NOT PURGE. Must preserve for operator reprint/recovery.
 * - PRINT_FAILED: DO NOT PURGE under 60-second rule.
 */
export function handlePrintStatusTransition(
  file: OrderFile,
  printStatus: 'PRINT_COMPLETED' | 'COMPLETED' | 'STATUS_UNKNOWN' | 'PRINT_FAILED' | string,
  completedAtIso: string = new Date().toISOString(),
  retentionSeconds: number = 60
): OrderFile {
  const isConfirmedComplete = printStatus === 'PRINT_COMPLETED' || printStatus === 'COMPLETED';

  if (!isConfirmedComplete) {
    // If STATUS_UNKNOWN, PRINT_FAILED, or any in-progress status, DO NOT schedule post-print purge
    return {
      ...file,
      purgeStatus: file.purgeStatus === 'PURGED' ? 'PURGED' : 'NOT_SCHEDULED',
      purgeAt: undefined
    };
  }

  // Schedule 60-second purge
  const purgeAt = calculatePostPrintPurgeTime(completedAtIso, retentionSeconds);

  return {
    ...file,
    purgeStatus: 'PENDING',
    purgeAt
  };
}

/**
 * Checks whether an order file is eligible for purge execution at the given reference time.
 */
export function isFileEligibleForPurge(
  file: OrderFile,
  referenceTimeIso: string = new Date().toISOString()
): boolean {
  if (file.purgeStatus !== 'PENDING') return false;
  if (!file.purgeAt) return false;

  const refMs = new Date(referenceTimeIso).getTime();
  const purgeMs = new Date(file.purgeAt).getTime();

  return purgeMs <= refMs;
}

/**
 * Executes idempotent file purge:
 * 1. Deletes original uploaded file from Cloud Storage.
 * 2. Deletes normalized/processed PDF from Cloud Storage.
 * 3. Deletes preview images/thumbnails from Cloud Storage.
 * 4. Updates Firestore metadata: documentAvailable = false, purgeStatus = "PURGED", purgedAt = timestamp.
 *
 * IDEMPOTENCY: Executing on an already purged file or non-existent storage objects succeeds safely.
 */
export async function executePurge(
  file: OrderFile,
  deleteStorageObject: StorageDeleter,
  currentTimestampIso: string = new Date().toISOString()
): Promise<PurgeExecutionResult> {
  // If already purged, return idempotent success
  if (file.purgeStatus === 'PURGED' && !file.documentAvailable) {
    return {
      fileId: file.id,
      isPurged: true,
      purgedAt: file.purgedAt || currentTimestampIso,
      deletedPaths: [],
      failedPaths: [],
      updatedFile: { ...file }
    };
  }

  const pathsToDelete: string[] = [];
  if (file.storageOriginalPath) pathsToDelete.push(file.storageOriginalPath);
  if (file.storageProcessedPath) pathsToDelete.push(file.storageProcessedPath);
  if (file.previewPaths && file.previewPaths.length > 0) {
    pathsToDelete.push(...file.previewPaths);
  }

  const deletedPaths: string[] = [];
  const failedPaths: string[] = [];

  for (const path of pathsToDelete) {
    try {
      const deleted = await deleteStorageObject(path);
      if (deleted) {
        deletedPaths.push(path);
      }
    } catch {
      failedPaths.push(path);
    }
  }

  const isSuccessful = failedPaths.length === 0;

  const updatedFile: OrderFile = {
    ...file,
    documentAvailable: false,
    purgeStatus: isSuccessful ? 'PURGED' : 'FAILED',
    purgedAt: isSuccessful ? currentTimestampIso : undefined,
    purgeAttempts: (file.purgeAttempts || 0) + 1,
    lastPurgeError: isSuccessful ? undefined : `Failed to delete ${failedPaths.length} storage object(s)`
  };

  return {
    fileId: file.id,
    isPurged: isSuccessful,
    purgedAt: currentTimestampIso,
    deletedPaths,
    failedPaths,
    updatedFile
  };
}
