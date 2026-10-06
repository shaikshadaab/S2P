import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import {
  getFirebaseAdminServices,
  performAuthoritativePurge,
  scheduleFilePurge
} from './purge';

// Ensure Firebase Admin is initialized
getFirebaseAdminServices();

// HTTP API Source of Truth: Next.js API Routes (apps/web/src/app/api/...)
// Cloud Functions handles only background tasks and triggers:

/**
 * 1. Scheduled Post-Print Purge Worker
 * Runs every minute using Firebase Functions v2 Cloud Scheduler.
 * Queries orderFiles where purgeStatus == 'PENDING' and purgeAt <= now.
 * Concurrency safe: claims documents via Firestore transaction.
 */
export const purgeScheduledFilesCron = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: 'UTC',
    memory: '256MiB',
    retryCount: 1
  },
  async () => {
    const { db } = getFirebaseAdminServices();
    const nowIso = new Date().toISOString();

    const snapshot = await db
      .collection('orderFiles')
      .where('purgeStatus', '==', 'PENDING')
      .where('purgeAt', '<=', nowIso)
      .limit(100)
      .get();

    if (snapshot.empty) {
      return;
    }

    console.log('[Purge Cron] Processing ' + snapshot.size + ' eligible file(s) for post-print purge.');

    for (const doc of snapshot.docs) {
      try {
        await performAuthoritativePurge(doc.id, nowIso);
      } catch (err) {
        console.error('[Purge Cron] Error purging ' + doc.id + ':', err);
      }
    }
  }
);

/**
 * 2. Firestore Print Completion Trigger
 * When printJobs/{jobId} transitions to PRINT_COMPLETED or COMPLETED:
 * Schedules purgeAt = completedAt + 60 seconds transactionally.
 * Idempotent: Skips duplicate deliveries for the same printAttemptId.
 * STATUS_UNKNOWN and PRINT_FAILED do NOT trigger purge.
 */
export const onPrintJobUpdated = onDocumentUpdated(
  'printJobs/{jobId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const isConfirmedCompleted =
      (after.status === 'PRINT_COMPLETED' || after.status === 'COMPLETED') &&
      before.status !== 'PRINT_COMPLETED' &&
      before.status !== 'COMPLETED';

    if (!isConfirmedCompleted) {
      return;
    }

    const fileId = after.fileId;
    if (!fileId) return;

    const printAttemptId = (after.currentAttemptId || after.attemptId || event.id) as string;
    const completedAt = (after.completedAt || new Date().toISOString()) as string;

    try {
      const result = await scheduleFilePurge(fileId, completedAt, 60, printAttemptId);
      if (result.scheduled) {
        console.log('[Print Completed Trigger] Successfully scheduled purge for ' + fileId + ' at ' + result.purgeAt);
      } else {
        console.log('[Print Completed Trigger] Already scheduled or processed for attempt ' + printAttemptId);
      }
    } catch (err) {
      console.error('[Print Completed Trigger] Failed to schedule purge for ' + fileId + ':', err);
    }
  }
);
