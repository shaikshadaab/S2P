import * as admin from 'firebase-admin';
import {
  OrderFile,
  executePurge,
  calculatePostPrintPurgeTime
} from '@s2p/shared';

export type StorageDeleter = (path: string) => Promise<boolean>;

export function getFirebaseAdminServices() {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return {
    db: admin.firestore(),
    storage: admin.storage(),
    auth: admin.auth()
  };
}

/**
 * Schedules post-print purge transactionally when print is confirmed completed.
 * Rule: purgeAt = completedAt + 60 seconds.
 * Idempotent: Skips if already scheduled for the same printAttemptId.
 */
export async function scheduleFilePurge(
  fileId: string,
  completedAtIso: string = new Date().toISOString(),
  retentionSeconds: number = 60,
  printAttemptId?: string
): Promise<{ scheduled: boolean; purgeAt?: string }> {
  const { db } = getFirebaseAdminServices();
  const fileRef = db.collection('orderFiles').doc(fileId);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(fileRef);
    if (!snap.exists) {
      throw new Error('OrderFile ' + fileId + ' not found');
    }

    const data = snap.data() as OrderFile;

    // Idempotency: If already scheduled for this exact print attempt, avoid resetting
    if (printAttemptId && data.purgeScheduledForAttemptId === printAttemptId) {
      return { scheduled: false, purgeAt: data.purgeAt };
    }

    // If file is already PURGED, do not reschedule
    if (data.purgeStatus === 'PURGED') {
      return { scheduled: false };
    }

    const purgeAt = calculatePostPrintPurgeTime(completedAtIso, retentionSeconds);

    tx.update(fileRef, {
      purgeStatus: 'PENDING',
      purgeAt,
      purgeAttempts: 0,
      purgeScheduledForAttemptId: printAttemptId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { scheduled: true, purgeAt };
  });
}

/**
 * Authoritative File Purge Execution with Transactional Claim
 * 1. Claims PENDING -> PURGING atomically inside a Firestore transaction.
 *    Verifies purgeAt <= referenceTimeIso.
 * 2. Removes original, processed, and preview objects from Cloud Storage.
 * 3. Updates Firestore to documentAvailable = false, purgeStatus = 'PURGED'.
 * 4. Fails safely if deletion fails without falsely marking PURGED.
 */
export async function performAuthoritativePurge(
  fileId: string,
  referenceTimeIso: string = new Date().toISOString()
): Promise<{ success: boolean; error?: string }> {
  const { db, storage } = getFirebaseAdminServices();
  const fileRef = db.collection('orderFiles').doc(fileId);

  // STEP 1: Transactional Claim (PENDING -> PURGING)
  let fileData: OrderFile;
  try {
    fileData = await db.runTransaction(async (tx) => {
      const snap = await tx.get(fileRef);
      if (!snap.exists) {
        throw new Error('NOT_FOUND');
      }

      const current = snap.data() as OrderFile;

      // Idempotency check: Already purged
      if (current.purgeStatus === 'PURGED' && !current.documentAvailable) {
        return current;
      }

      // Idempotency check: Already claimed by a concurrent worker
      if (current.purgeStatus === 'PURGING') {
        return current;
      }

      // Must be PENDING
      if (current.purgeStatus !== 'PENDING') {
        throw new Error('NOT_PENDING: status is ' + current.purgeStatus);
      }

      // Eligibility check: purgeAt must be reached
      if (current.purgeAt && current.purgeAt > referenceTimeIso) {
        throw new Error('NOT_ELIGIBLE: purgeAt ' + current.purgeAt + ' > now ' + referenceTimeIso);
      }

      // Atomically claim state
      tx.update(fileRef, {
        purgeStatus: 'PURGING',
        purgeClaimedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return current;
    });
  } catch (claimErr: any) {
    if (claimErr.message === 'NOT_FOUND') {
      return { success: false, error: 'File record not found' };
    }
    if (
      claimErr.message?.startsWith('NOT_ELIGIBLE') ||
      claimErr.message?.startsWith('NOT_PENDING')
    ) {
      return { success: false, error: claimErr.message };
    }
    throw claimErr;
  }

  // If already purged or currently purging by another worker
  if (fileData.purgeStatus === 'PURGED') {
    return { success: true };
  }
  if (fileData.purgeStatus === 'PURGING') {
    return { success: true };
  }

  // STEP 2: Exclusive Storage deletion
  const deleter: StorageDeleter = async (storagePath: string) => {
    try {
      const bucket = storage.bucket();
      await bucket.file(storagePath).delete();
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) return true; // Already gone
      console.warn('[Purge] Failed to delete storage path ' + storagePath + ':', err);
      return false;
    }
  };

  const purgeResult = await executePurge(fileData, deleter, referenceTimeIso);

  // STEP 3: Final state update
  if (purgeResult.isPurged) {
    await fileRef.update({
      documentAvailable: false,
      purgeStatus: 'PURGED',
      purgedAt: admin.firestore.FieldValue.serverTimestamp(),
      storageOriginalPath: null,
      storageProcessedPath: null,
      previewPaths: []
    });
    return { success: true };
  } else {
    await fileRef.update({
      purgeStatus: 'FAILED',
      purgeAttempts: (fileData.purgeAttempts || 0) + 1,
      lastPurgeError: purgeResult.failedPaths.join(', ')
    });
    return {
      success: false,
      error: 'Failed to delete ' + purgeResult.failedPaths.length + ' storage object(s)'
    };
  }
}
