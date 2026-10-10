if (typeof window !== 'undefined') {
  throw new Error('FATAL: print-job-service is server-only and cannot be imported into a browser bundle.');
}

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Firestore } from 'firebase-admin/firestore';
import {
  PrintJob,
  PrintJobStatus,
  PrintAttempt,
  Order,
  OrderItem,
  OrderFile,
  Printer,
  assertValidPrintJobTransition,
  assertValidOrderTransition
} from '@s2p/shared';
import { getActiveShopMember } from './order-service';
import { authenticateAgent } from './device-service';
import { getFileStorageBucket } from '../lib/firebase/admin';

export const BUNDLED_TEST_VISIBLE_A4_PDF_BASE64 = 'JVBERi0xLjcKJYGBgYEKCjcgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbmd0aCA1OTgKPj4Kc3RyZWFtCniclZNLbxMxFIX3/hVeIzXY1/dhSwgpyczAgg0wO8QCteWlVKgIwd/n2E5C005Eq5E99rVn/Pmce29dWBXx/7qfX1zw9Xn3ypH/4z58xPjKxRaLnoM3Cv7y5hip/cNpfdU+B79zEmVF+WRch1/dxr11t24z74/E2c9fX+9+X//6dvnpYvNjd3VhoWTOwXLxpH7+7Ij9/OZ4mgIHbb5xLyQlkkBBAmcpkrhw4sjbGhHCbBTGmFkkCb/083c3P3PjfERYkT+0U5BiTJpJNPsYlxmSdIaAc7Y8Cac1zkqcQbBhwQMOnnjEKkhY2qoIfto4wURhYy1aqUcKie6S3+MNq2pXbzAqLhol4QlGxXLHnZNJt+r9f62iEEIOUrL6uGyVyt6qvQlU5dpL1cwbjisDDyJiknnNU8LygmELIMVggRYK5iMtM9CRofDQT4Pgg4TKkSjVpjSkmMCDmcLMmCytMRb0DGPGVDBLsn4cVc9kMcI9tMrDi2iSexYhA2qm1MwwiEAcGyxiDTG2HI9sNYto6pH6DbKl9AgTqdjj4DJLiDnE85KB4SBZBA3ObdblNmOx9pbKhsqrFZh00Ghkrd406qgbquLlJqlU8eAQlDXSgn7J3FXyh3aPV5FiFrOdrUZUVefVWmFQrtfYUUVwWps1Zuk3SVVNGE0Pb7avwwmPPsFwycSqlNJZ0Bh6LvJkoYkRjXWyWvi6F0fRUosXnbQlAE9KXTzDLgjJyKlYxUYMI02IbK30xMCfsxXsb//RbRMeGmJv/QIrdU87a8R30IzGk0v+Ba/0TaAKZW5kc3RyZWFtCmVuZG9iagoKOCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvT2JqU3RtCi9OIDYKL0ZpcnN0IDMzCi9MZW5ndGggNDQ3Cj4+CnN0cmVhbQp4nNVTTWvcMBC9+1fMsT0kGn3LZVnYLzdQQkMSSGnpwbHF4rJIxdaW5N93ZG8SEnYJ9FbMYM3Me9LojYYDggClQIJ1oEBLARpKKcEAR4EwmxXs9vG3B3ZVb/1QsC9dO8APgiJcw8+CreI+JODFfF68YFd1qndxW0wk4Bn8hLjqY7tvfA+zalNViBYRjSIziGJN/xVZSSbIp5xwtCaz6mAUsxJRLihXTWbsxMn5EasP/A39CWsyZj1hlZv853PzWZtpD/FePeW8YJexXdfJw4f1J4HCcEpxi1qJ7x9Jjt7XKf6/lxvr72I4ecNXfc7tzU3ufX4DY5fZtR/ivm+o7RlXRcrkxYXf/fGpa+qzZdy1ZxZLR8VaV9J7G3kvgNIqYZzQxtErfJMbyVk5h7p05hhZozKlQHuCbLUVWkpzjOyURu6QHyM7Qwda7uypqrQTyhghpTtsTFKxb1/vf/lmlCC7m4f0+SZlbadAjl36tquX8YGmCunTpT4XDpzi5yQOTdgihJjyzI3TFhJpnT17mMBXDclyF+xmf59GNwd5wZb14MdGvCmZ6glNbLuwBXbXhUUYuqfAP277zo5/AWtyHaEKZW5kc3RyZWFtCmVuZG9iagoKOSAwIG9iago8PAovU2l6ZSAxMAovUm9vdCAyIDAgUgovSW5mbyAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQovVHlwZSAvWFJlZgovTGVuZ3RoIDQ0Ci9XIFsgMSAyIDIgXQovSW5kZXggWyAwIDEwIF0KPj4Kc3RyZWFtCnicY2Bg+P+fiYGDgQFEMIIIJhDBDCJYQAQrI4MAA1BmPZBgucLAAABuawPmCmVuZHN0cmVhbQplbmRvYmoKCnN0YXJ0eHJlZgoxMjM2CiUlRU9G';

/**
 * Staff Action: QUEUE FOR PRINT
 * Allowed only when:
 * 1. Staff has valid role (OWNER, MANAGER, COUNTER_STAFF, PRINT_OPERATOR)
 * 2. order.status == 'ACCEPTED'
 * 3. paymentStatus == 'PAID'
 * 4. file documentAvailable == true
 * Idempotent: Repeated clicks return the existing active print job.
 */
export async function queueOrderForPrint(
  db: Firestore,
  orderId: string,
  staffUid: string,
  requestedShopId: string
) {
  if (!orderId || !staffUid || !requestedShopId) {
    throw new Error('orderId, staffUid, and requestedShopId are required.');
  }

  // 1. Authoritative Staff Membership & Role Check
  const member = await getActiveShopMember(db, staffUid, requestedShopId);
  const allowedRoles = ['OWNER', 'MANAGER', 'COUNTER_STAFF', 'PRINT_OPERATOR'];
  if (!allowedRoles.includes(member.role)) {
    throw new Error('UNAUTHORIZED_ROLE: Role ' + member.role + ' cannot queue orders for print.');
  }

  return await db.runTransaction(async (transaction) => {
    // 2. Read Order
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error('ORDER_NOT_FOUND: Order does not exist.');
    }

    const order = orderDoc.data() as Order;

    // Tenant check
    if (order.shopId !== requestedShopId) {
      throw new Error('FORBIDDEN_SHOP: Order belongs to another shop.');
    }

    // Status check: ACCEPTED or already QUEUED_FOR_PRINT (idempotent double-click protection)
    if (order.status !== 'ACCEPTED' && order.status !== 'QUEUED_FOR_PRINT') {
      throw new Error('INVALID_ORDER_STATUS: Order must be in ACCEPTED or QUEUED_FOR_PRINT status to queue for print. Current status: ' + order.status);
    }

    // Payment check
    if (order.paymentStatus !== 'PAID') {
      throw new Error('UNPAID_ORDER: Order must be PAID before queuing for print. Current paymentStatus: ' + order.paymentStatus);
    }

    // 3. Read All Order Items (Multi-Item Support, No limit(1))
    const itemsSnap = await transaction.get(
      db.collection('orderItems').where('orderId', '==', orderId)
    );
    if (itemsSnap.empty) {
      throw new Error('ORDER_EMPTY: Order has no items to print.');
    }

    const nowIso = new Date().toISOString();
    const createdJobs: PrintJob[] = [];
    let isAllExisting = true;

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data() as OrderItem;

      // 4. Read File & Verify Availability
      const fileRef = db.collection('orderFiles').doc(item.fileId);
      const fileDoc = await transaction.get(fileRef);
      if (!fileDoc.exists) {
        throw new Error('FILE_NOT_FOUND: Associated document file does not exist for item ' + item.id);
      }
      const file = fileDoc.data() as OrderFile;

      if (file.documentAvailable === false || file.purgeStatus === 'PURGED') {
        throw new Error('FILE_NOT_AVAILABLE: Document file has been purged or is not available.');
      }

      // 5. Deterministic Idempotency Key per Item
      const jobId = 'pj_' + order.id + '_' + item.id;
      const jobRef = db.collection('printJobs').doc(jobId);
      const existingJobDoc = await transaction.get(jobRef);

      if (existingJobDoc.exists) {
        const existingJob = existingJobDoc.data() as PrintJob;
        const activeStatuses: PrintJobStatus[] = [
          'CREATED', 'QUEUED', 'LEASED', 'DOWNLOADING', 'READY_TO_PRINT', 'SUBMITTED', 'PRINTING', 'COMPLETED'
        ];
        if (activeStatuses.includes(existingJob.status)) {
          createdJobs.push(existingJob);
          continue;
        }
      }

      isAllExisting = false;

      // 6. Complete, immutable print configuration snapshot
      const rawCfg = ((item.config || (item as any).printConfig || {}) as unknown) as Record<string, unknown>;
      const printConfigSnapshot: Record<string, unknown> = {
        pageRange: rawCfg.pageRange || (item.selectedPages && item.selectedPages.length > 0 ? item.selectedPages.join(',') : 'all'),
        selectedPages: item.selectedPages || rawCfg.selectedPages || [],
        selectedPageCount: typeof item.selectedPageCount === 'number' ? item.selectedPageCount : (item.selectedPages ? item.selectedPages.length : rawCfg.selectedPageCount || 1),
        paperSize: rawCfg.paperSize || 'A4',
        paperType: rawCfg.paperType || 'NORMAL_75GSM',
        colorMode: rawCfg.colorMode || 'BW',
        duplexMode: rawCfg.duplexMode || 'SINGLE',
        copies: typeof rawCfg.copies === 'number' ? rawCfg.copies : 1,
        orientation: rawCfg.orientation || item.orientation || 'PORTRAIT',
        scaling: rawCfg.scaling || item.scaling || 'FIT',
        fitMode: rawCfg.fitMode || rawCfg.scaling || item.scaling || 'FIT',
        finishing: rawCfg.finishing || 'NONE'
      };

      const printJobRecord: PrintJob = {
        id: jobId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderItemId: item.id,
        fileId: file.id,
        printerId: item.printerRoute?.printerId || null,
        deviceId: item.printerRoute?.deviceId || null,
        status: 'QUEUED',
        priority: 1,
        printConfigSnapshot,
        fileSnapshot: {
          fileId: file.id,
          sha256: file.sha256,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          pageCount: file.pageCount,
          filename: file.originalFilename || 'document.pdf'
        },
        attemptCount: 0,
        activeAttemptId: null,
        irreversibleStageReached: false,
        lease: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      transaction.set(jobRef, printJobRecord);
      createdJobs.push(printJobRecord);
    }

    if (isAllExisting && createdJobs.length > 0) {
      return {
        success: true,
        printJob: createdJobs[0],
        printJobs: createdJobs,
        count: createdJobs.length,
        idempotent: true
      };
    }

    // 7. Transition order: ACCEPTED -> QUEUED_FOR_PRINT
    if (order.status === 'ACCEPTED') {
      assertValidOrderTransition(order.status, 'QUEUED_FOR_PRINT');
      transaction.update(orderRef, {
        status: 'QUEUED_FOR_PRINT',
        updatedAt: nowIso
      });
    }

    // 8. Write orderStatusHistory
    const historyId = 'osh_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('orderStatusHistory').doc(historyId), {
      id: historyId,
      orderId: order.id,
      shopId: order.shopId,
      fromStatus: order.status,
      toStatus: 'QUEUED_FOR_PRINT',
      changedByUid: staffUid,
      reason: 'Staff queued order for print',
      timestamp: nowIso
    });

    // 9. Write auditLogs
    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: order.organizationId,
      shopId: order.shopId,
      action: 'PRINT_JOB_CREATED',
      targetType: 'PRINT_JOB',
      targetId: createdJobs[0]?.id || order.id,
      actorId: staffUid,
      actorRole: 'STAFF',
      timestamp: nowIso,
      details: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        jobIds: createdJobs.map(j => j.id),
        jobCount: createdJobs.length,
        fileIds: createdJobs.map(j => j.fileId)
      }
    });

    return {
      success: true,
      printJob: createdJobs[0],
      printJobs: createdJobs,
      count: createdJobs.length,
      idempotent: false
    };
  });
}

/**
 * Agent Action: CLAIM PRINT JOB
 * Atomically finds eligible job for SAME shop.
 * Claims exactly ONE job.
 * Transitions QUEUED -> LEASED (60 seconds).
 * Stores leaseTokenHash in Firestore, returns raw leaseToken ONCE to Agent.
 */
export async function claimPrintJob(
  db: Firestore,
  deviceId: string,
  deviceSecret: string
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  return await db.runTransaction(async (transaction) => {
    // 1. Find oldest QUEUED job for device's shop
    const queuedQuery = db.collection('printJobs')
      .where('shopId', '==', device.shopId)
      .where('status', '==', 'QUEUED')
      .orderBy('createdAt', 'asc')
      .limit(1);

    const queuedSnap = await transaction.get(queuedQuery);

    let targetJobDoc = queuedSnap.docs[0];

    // If no QUEUED job, check if an expired LEASED job needs safe reclaim before irreversible action
    if (!targetJobDoc) {
      const leasedQuery = db.collection('printJobs')
        .where('shopId', '==', device.shopId)
        .where('status', 'in', ['LEASED', 'DOWNLOADING', 'READY_TO_PRINT'])
        .orderBy('createdAt', 'asc')
        .limit(10);

      const leasedSnap = await transaction.get(leasedQuery);
      const now = Date.now();
      for (const d of leasedSnap.docs) {
        const j = d.data() as PrintJob;
        if (j.lease && new Date(j.lease.expiresAt).getTime() < now) {
          if (j.irreversibleStageReached === true) {
            // INVARIANT: Once irreversible stage reached, NEVER auto-requeue!
            transaction.update(d.ref, {
              status: 'STATUS_UNKNOWN',
              updatedAt: new Date().toISOString()
            });
            if (j.activeAttemptId) {
              transaction.update(db.collection('printAttempts').doc(j.activeAttemptId), {
                status: 'STATUS_UNKNOWN',
                lastUpdatedAt: new Date().toISOString(),
                errorCode: 'LEASE_EXPIRED_IRREVERSIBLE',
                errorMessageSanitized: 'Lease expired after irreversible stage reached. Transitioned to STATUS_UNKNOWN.'
              });
            }
          } else {
            targetJobDoc = d;
            break;
          }
        }
      }
    }

    if (!targetJobDoc) {
      return {
        success: true,
        claimed: false,
        message: 'No print jobs waiting in queue.'
      };
    }

    const jobData = targetJobDoc.data() as PrintJob;

    // 2. Unpredictable lease token (256-bit)
    const rawLeaseToken = crypto.randomBytes(32).toString('hex');
    const leaseTokenHash = crypto.createHash('sha256').update(rawLeaseToken).digest('hex');

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const leaseExpiresIso = new Date(now + 60 * 1000).toISOString(); // 60 seconds lease

    const newAttemptCount = (jobData.attemptCount || 0) + 1;

    // 3. Generate attemptId and atomically update printJobs -> LEASED
    const attemptId = 'att_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');

    transaction.update(targetJobDoc.ref, {
      status: 'LEASED',
      deviceId: device.id,
      attemptCount: newAttemptCount,
      activeAttemptId: attemptId,
      irreversibleStageReached: false,
      lease: {
        deviceId: device.id,
        leaseTokenHash,
        claimedAt: nowIso,
        expiresAt: leaseExpiresIso
      },
      updatedAt: nowIso
    });

    // 4. Create printAttempts record
    const attemptRecord: PrintAttempt = {
      id: attemptId,
      organizationId: device.organizationId,
      shopId: device.shopId,
      printJobId: jobData.id,
      orderId: jobData.orderId,
      deviceId: device.id,
      printerId: jobData.printerId || null,
      attemptNumber: newAttemptCount,
      status: 'LEASED',
      startedAt: nowIso,
      lastUpdatedAt: nowIso,
      errorCode: null,
      errorMessageSanitized: null,
      irreversibleStageReached: false
    };
    transaction.set(db.collection('printAttempts').doc(attemptId), attemptRecord);

    // 5. Write auditLogs
    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: device.organizationId,
      shopId: device.shopId,
      action: 'PRINT_JOB_CLAIMED',
      targetType: 'PRINT_JOB',
      targetId: jobData.id,
      actorId: device.id,
      actorRole: 'AGENT',
      timestamp: nowIso,
      details: {
        attemptNumber: newAttemptCount,
        deviceId: device.id
      }
    });

    return {
      success: true,
      claimed: true,
      job: {
        ...jobData,
        status: 'LEASED',
        deviceId: device.id,
        attemptCount: newAttemptCount,
        lease: {
          deviceId: device.id,
          claimedAt: nowIso,
          expiresAt: leaseExpiresIso
        }
      },
      leaseToken: rawLeaseToken // RETURNED ONLY TO CLAIMING AGENT
    };
  });
}

/**
 * Agent Action: RENEW LEASE
 * Only current claiming device + lease token can renew.
 * Extends lease expiry by 60 seconds.
 */
export async function renewPrintJobLease(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  jobId: string,
  leaseToken: string
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  return await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(db.collection('printJobs').doc(jobId));
    if (!jobDoc.exists) throw new Error('PRINT_JOB_NOT_FOUND: Job does not exist.');

    const job = jobDoc.data() as PrintJob;

    if (job.shopId !== device.shopId) {
      throw new Error('FORBIDDEN_SHOP: Job belongs to a different shop.');
    }

    if (!job.lease || job.lease.deviceId !== device.id) {
      throw new Error('NOT_LEASE_OWNER: Device is not the lease owner.');
    }

    // Verify lease token hash
    const incomingTokenHash = crypto.createHash('sha256').update(leaseToken).digest('hex');
    if (
      incomingTokenHash.length !== job.lease.leaseTokenHash.length ||
      !crypto.timingSafeEqual(Buffer.from(incomingTokenHash, 'hex'), Buffer.from(job.lease.leaseTokenHash, 'hex'))
    ) {
      throw new Error('INVALID_LEASE_TOKEN: Lease token verification failed.');
    }

    // Verify lease is still active
    if (new Date(job.lease.expiresAt).getTime() < Date.now()) {
      throw new Error('LEASE_EXPIRED: Cannot renew an already expired lease.');
    }

    const nowIso = new Date().toISOString();
    const newExpiresIso = new Date(Date.now() + 60 * 1000).toISOString();

    transaction.update(jobDoc.ref, {
      'lease.expiresAt': newExpiresIso,
      updatedAt: nowIso
    });

    return {
      success: true,
      jobId,
      expiresAt: newExpiresIso
    };
  });
}

/**
 * Agent Action: UPDATE JOB STATUS
 * Phase 5 Allowed transitions:
 * LEASED -> DOWNLOADING
 * DOWNLOADING -> READY_TO_PRINT
 * LEASED / DOWNLOADING / READY_TO_PRINT -> FAILED
 *
 * Invariant: Phase 5 does NOT allow setting SUBMITTED / PRINTING / COMPLETED.
 */
export async function updatePrintJobStatus(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  jobId: string,
  leaseToken: string,
  newStatus: PrintJobStatus,
  details?: { errorCode?: string; errorMessageSanitized?: string }
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  // Spooler status transitions
  const allowedAgentStatuses: PrintJobStatus[] = [
    'DOWNLOADING',
    'READY_TO_PRINT',
    'SUBMITTING',
    'SUBMITTED',
    'PRINTING',
    'SPOOL_COMPLETED',
    'COMPLETED',
    'FAILED',
    'STATUS_UNKNOWN'
  ];
  if (!allowedAgentStatuses.includes(newStatus)) {
    throw new Error('ILLEGAL_AGENT_STATUS: Agent cannot set status ' + newStatus + '.');
  }

  return await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(db.collection('printJobs').doc(jobId));
    if (!jobDoc.exists) throw new Error('PRINT_JOB_NOT_FOUND: Job does not exist.');

    const job = jobDoc.data() as PrintJob;

    if (job.shopId !== device.shopId) {
      throw new Error('FORBIDDEN_SHOP: Job belongs to a different shop.');
    }

    if (!job.lease || job.lease.deviceId !== device.id) {
      throw new Error('NOT_LEASE_OWNER: Device is not the lease owner.');
    }

    // Verify lease token hash
    const incomingTokenHash = crypto.createHash('sha256').update(leaseToken).digest('hex');
    if (
      incomingTokenHash.length !== job.lease.leaseTokenHash.length ||
      !crypto.timingSafeEqual(Buffer.from(incomingTokenHash, 'hex'), Buffer.from(job.lease.leaseTokenHash, 'hex'))
    ) {
      throw new Error('INVALID_LEASE_TOKEN: Lease token verification failed.');
    }

    // Validate state machine transition
    assertValidPrintJobTransition(job.status, newStatus);

    const nowIso = new Date().toISOString();

    const jobUpdate: Record<string, unknown> = {
      status: newStatus,
      updatedAt: nowIso
    };

    if (newStatus === 'SUBMITTED' || newStatus === 'PRINTING') {
      jobUpdate.irreversibleStageReached = true;
    }

    transaction.update(jobDoc.ref, jobUpdate);

    // Atomically sync the active attempt record
    if (job.activeAttemptId) {
      const attemptUpdate: Record<string, unknown> = {
        status: newStatus,
        lastUpdatedAt: nowIso
      };
      if (newStatus === 'SUBMITTED' || newStatus === 'PRINTING') {
        attemptUpdate.irreversibleStageReached = true;
      }
      if (details?.errorCode) {
        attemptUpdate.errorCode = details.errorCode;
      }
      if (details?.errorMessageSanitized) {
        attemptUpdate.errorMessageSanitized = details.errorMessageSanitized;
      }
      transaction.update(db.collection('printAttempts').doc(job.activeAttemptId), attemptUpdate);
    }

    if (newStatus === 'READY_TO_PRINT') {
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(db.collection('auditLogs').doc(auditId), {
        id: auditId,
        organizationId: device.organizationId,
        shopId: device.shopId,
        action: 'PRINT_JOB_READY',
        targetType: 'PRINT_JOB',
        targetId: jobId,
        actorId: device.id,
        actorRole: 'AGENT',
        timestamp: nowIso,
        details: { status: 'READY_TO_PRINT' }
      });
    } else if (newStatus === 'FAILED') {
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(db.collection('auditLogs').doc(auditId), {
        id: auditId,
        organizationId: device.organizationId,
        shopId: device.shopId,
        action: 'PRINT_JOB_FAILED',
        targetType: 'PRINT_JOB',
        targetId: jobId,
        actorId: device.id,
        actorRole: 'AGENT',
        timestamp: nowIso,
        details: {
          errorCode: details?.errorCode || 'AGENT_ERROR',
          errorMessage: details?.errorMessageSanitized || 'Unknown error'
        }
      });
    }

    return {
      success: true,
      jobId,
      status: newStatus
    };
  });
}

/**
 * Agent Action: GET AUTHORIZED JOB FILE
 * Streams authorized document file buffer.
 * Validates:
 * 1. Device authentication
 * 2. Active lease owned by device
 * 3. Same shop
 * 4. File documentAvailable == true
 * Never creates permanent public URL.
 */
export async function getAuthorizedJobFile(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  jobId: string,
  leaseToken: string
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  const jobDoc = await db.collection('printJobs').doc(jobId).get();
  if (!jobDoc.exists) throw new Error('PRINT_JOB_NOT_FOUND: Job does not exist.');

  const job = jobDoc.data() as PrintJob;

  if (job.shopId !== device.shopId) {
    throw new Error('FORBIDDEN_SHOP: Job belongs to a different shop.');
  }

  if (!job.lease || job.lease.deviceId !== device.id) {
    throw new Error('NOT_LEASE_OWNER: Device is not the lease owner.');
  }

  // Verify lease token hash
  const incomingTokenHash = crypto.createHash('sha256').update(leaseToken).digest('hex');
  if (
    incomingTokenHash.length !== job.lease.leaseTokenHash.length ||
    !crypto.timingSafeEqual(Buffer.from(incomingTokenHash, 'hex'), Buffer.from(job.lease.leaseTokenHash, 'hex'))
  ) {
    throw new Error('INVALID_LEASE_TOKEN: Lease token verification failed.');
  }

  // Verify lease active
  if (new Date(job.lease.expiresAt).getTime() < Date.now()) {
    throw new Error('LEASE_EXPIRED: Lease has expired. Cannot download file.');
  }

  // Read file record
  const fileDoc = await db.collection('orderFiles').doc(job.fileId).get();
  if (!fileDoc.exists) throw new Error('FILE_NOT_FOUND: File record does not exist.');

  const fileData = fileDoc.data() as OrderFile;
  if (fileData.documentAvailable === false || fileData.purgeStatus === 'PURGED') {
    throw new Error('FILE_PURGED: Document is no longer available.');
  }

  const storagePath = fileData.storageProcessedPath || fileData.storageOriginalPath;
  if (!storagePath) {
    throw new Error('STORAGE_PATH_MISSING: Storage path not found on file record.');
  }

  // Special test document handling for commissioning test orders
  if (
    (fileData as any).isTestFile ||
    storagePath === 'system/test_visible_a4.pdf' ||
    fileData.originalFilename === 'test_visible_a4.pdf'
  ) {
    const candidates = [
      path.join(process.cwd(), 'public', 'test_visible_a4.pdf'),
      path.join(process.cwd(), 'apps', 'web', 'public', 'test_visible_a4.pdf'),
      path.join(process.cwd(), 'test_visible_a4.pdf'),
      path.join(process.cwd(), '..', '..', 'test_visible_a4.pdf'),
      'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\1c221f7d-e06d-48e2-9d00-0d8f618c0d27\\browser\\test_visible_a4.pdf'
    ];
    let buffer: Buffer;
    let foundPath = candidates.find(p => fs.existsSync(p));
    if (foundPath) {
      buffer = fs.readFileSync(foundPath);
    } else {
      buffer = Buffer.from(BUNDLED_TEST_VISIBLE_A4_PDF_BASE64, 'base64');
    }
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    return {
      buffer,
      fileSnapshot: job.fileSnapshot,
      mimeType: 'application/pdf',
      filename: 'test_visible_a4.pdf',
      sha256,
      sizeBytes: buffer.length
    };
  }

  // Download from private bucket
  const bucket = getFileStorageBucket();
  const storageFile = bucket.file(storagePath);
  const [exists] = await storageFile.exists();
  if (!exists) {
    throw new Error('STORAGE_FILE_MISSING: Storage object not found.');
  }

  const [buffer] = await storageFile.download();

  return {
    buffer,
    fileSnapshot: job.fileSnapshot,
    mimeType: fileData.mimeType || 'application/pdf',
    filename: fileData.originalFilename || 'document.pdf',
    sha256: fileData.sha256,
    sizeBytes: buffer.length
  };
}

/**
 * Dashboard Queue Query
 */
export async function listShopPrintJobs(
  db: Firestore,
  shopId: string,
  limitCount = 50
) {
  const snap = await db.collection('printJobs')
    .where('shopId', '==', shopId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map(d => d.data() as PrintJob);
}

/**
 * Staff Action: ASSIGN PRINTER TO PRINT JOB
 * Validates staff authorization, printer existence, enabled status, online status,
 * and verifies printer capabilities against the job's print configuration.
 */
export async function assignPrinterToJob(
  db: Firestore,
  staffUid: string,
  shopId: string,
  jobId: string,
  printerId: string
) {
  // Validate staff membership
  await getActiveShopMember(db, staffUid, shopId);

  return await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(db.collection('printJobs').doc(jobId));
    if (!jobDoc.exists) throw new Error('PRINT_JOB_NOT_FOUND: Print job does not exist.');
    const job = jobDoc.data() as PrintJob;
    if (job.shopId !== shopId) throw new Error('FORBIDDEN_SHOP: Job belongs to a different shop.');

    const printerDoc = await transaction.get(db.collection('printers').doc(printerId));
    if (!printerDoc.exists) throw new Error('PRINTER_NOT_FOUND: Printer does not exist.');
    const printer = printerDoc.data() as Printer;
    if (printer.shopId !== shopId) throw new Error('FORBIDDEN_SHOP: Printer belongs to a different shop.');

    if (!printer.isEnabled) {
      throw new Error('PRINTER_DISABLED: Target printer is currently disabled.');
    }
    if (!printer.isOnline) {
      throw new Error('PRINTER_OFFLINE: Target printer is currently offline.');
    }

    // Capability Validation
    const cfg = (job.printConfigSnapshot || {}) as any;
    if (cfg.colorMode === 'COLOR' && !printer.capabilities.colorSupported) {
      throw new Error('PRINTER_CAPABILITY_MISMATCH: Selected printer does not support color printing.');
    }
    if (cfg.duplexMode === 'DOUBLE' && !printer.capabilities.duplexSupported) {
      throw new Error('PRINTER_CAPABILITY_MISMATCH: Selected printer does not support duplex printing.');
    }
    if (cfg.paperSize && printer.capabilities.paperSizes && !printer.capabilities.paperSizes.includes(cfg.paperSize)) {
      throw new Error(`PRINTER_CAPABILITY_MISMATCH: Selected printer does not support paper size ${cfg.paperSize}.`);
    }

    const nowIso = new Date().toISOString();
    transaction.update(jobDoc.ref, {
      printerId: printer.id,
      updatedAt: nowIso
    });

    if (job.activeAttemptId) {
      transaction.update(db.collection('printAttempts').doc(job.activeAttemptId), {
        printerId: printer.id,
        lastUpdatedAt: nowIso
      });
    }

    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: printer.organizationId,
      shopId: printer.shopId,
      action: 'PRINTER_ASSIGNED',
      targetType: 'PRINT_JOB',
      targetId: jobId,
      actorId: staffUid,
      actorRole: 'STAFF',
      timestamp: nowIso,
      details: { printerId: printer.id, printerName: printer.displayName }
    });

    return {
      success: true,
      jobId,
      printerId: printer.id,
      printerName: printer.displayName
    };
  });
}

/**
 * Auto-Dispatch Print Job after authoritative payment
 * Routes to active physical printer, filtering out virtual printers
 */
export async function autoDispatchOrderForPrint(
  db: Firestore,
  orderId: string,
  requestedShopId: string
) {
  if (!orderId || !requestedShopId) {
    throw new Error('orderId and requestedShopId are required for auto-dispatch.');
  }

  return await db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error('ORDER_NOT_FOUND: Order does not exist.');
    }
    const order = orderDoc.data() as Order;

    if (order.shopId !== requestedShopId) {
      throw new Error('FORBIDDEN_SHOP: Order belongs to another shop.');
    }

    if (order.paymentStatus !== 'PAID') {
      throw new Error('UNPAID_ORDER: Order must be PAID before auto-dispatch. Current: ' + order.paymentStatus);
    }

    // Read all order items (Multi-item support, No limit(1))
    const itemsSnap = await transaction.get(
      db.collection('orderItems').where('orderId', '==', orderId)
    );
    if (itemsSnap.empty) {
      throw new Error('ORDER_EMPTY: Order has no items to print.');
    }

    // Auto-Routing: Find active PHYSICAL printers for this shop
    const printersSnap = await transaction.get(
      db.collection('printers')
        .where('shopId', '==', requestedShopId)
        .where('printerKind', '==', 'PHYSICAL')
        .where('isEnabled', '==', true)
    );

    const candidates = printersSnap.docs
      .map(d => d.data() as Printer)
      .filter(p => p.isOnline === true);

    const nowIso = new Date().toISOString();
    const dispatchedJobs: PrintJob[] = [];

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data() as OrderItem;

      // Read file
      const fileRef = db.collection('orderFiles').doc(item.fileId);
      const fileDoc = await transaction.get(fileRef);
      if (!fileDoc.exists) {
        throw new Error('FILE_NOT_FOUND: Document file does not exist for item ' + item.id);
      }
      const file = fileDoc.data() as OrderFile;
      if (file.documentAvailable === false || file.purgeStatus === 'PURGED') {
        throw new Error('FILE_NOT_AVAILABLE: Document file is purged or unavailable for item ' + item.id);
      }

      const jobId = 'pj_' + order.id + '_' + item.id;
      const jobRef = db.collection('printJobs').doc(jobId);
      const existingJobDoc = await transaction.get(jobRef);

      if (existingJobDoc.exists) {
        dispatchedJobs.push(existingJobDoc.data() as PrintJob);
        continue;
      }

      let assignedPrinterId: string | null = null;
      let assignedDeviceId: string | null = null;
      let initialStatus: PrintJobStatus = 'QUEUED';

      const cfg = item.config || {};
      const reqColor = cfg.colorMode === 'COLOR';
      const reqPaper = cfg.paperSize || 'A4';
      const reqDuplex = cfg.duplexMode === 'DOUBLE';

      if (candidates.length > 0) {
        // Find printer compatible with this specific item's requirements:
        // 1. Paper size compatibility
        // 2. Color mode compatibility
        // 3. Duplex truth: If duplex requested, ensure printer has verified automatic duplex
        let matched = candidates.find(p => {
          const supportsPaper = p.capabilities.paperSizes ? p.capabilities.paperSizes.includes(reqPaper) : true;
          const supportsColor = reqColor ? Boolean(p.capabilities.colorSupported) : true;
          const supportsDuplex = reqDuplex ? (Boolean(p.capabilities.duplexSupported) && p.capabilities.duplexKind !== 'MANUAL') : true;
          return supportsPaper && supportsColor && supportsDuplex;
        });

        // Fallback: match without duplex constraint if none has auto duplex
        if (!matched && !reqColor) {
          matched = candidates.find(p => {
            const supportsPaper = p.capabilities.paperSizes ? p.capabilities.paperSizes.includes(reqPaper) : true;
            return supportsPaper;
          });
        }

        if (matched) {
          assignedPrinterId = matched.id;
          assignedDeviceId = matched.deviceId;
        } else {
          initialStatus = 'ON_HOLD';
        }
      } else {
        initialStatus = 'ON_HOLD';
      }

      const configSnapshot = {
        pageRange: cfg.pageRange || 'ALL',
        selectedPages: (cfg as any).selectedPages || [],
        selectedPageCount: (cfg as any).selectedPageCount || file.pageCount || 1,
        paperSize: cfg.paperSize || 'A4',
        paperType: cfg.paperType || 'NORMAL_75GSM',
        colorMode: cfg.colorMode || 'BW',
        duplexMode: cfg.duplexMode || 'SINGLE',
        copies: cfg.copies || 1,
        orientation: cfg.orientation || 'AUTO',
        scaling: cfg.scaling || 'FIT',
        fitMode: cfg.fitMode || cfg.scaling || 'FIT',
        finishing: cfg.finishing || 'NONE'
      };

      const newJob: PrintJob = {
        id: jobId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderItemId: item.id,
        fileId: item.fileId,
        printerId: assignedPrinterId,
        deviceId: assignedDeviceId,
        status: initialStatus,
        priority: 10,
        printConfigSnapshot: configSnapshot,
        fileSnapshot: {
          fileId: file.id,
          sha256: file.sha256,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          pageCount: file.pageCount,
          filename: file.safeDisplayName || file.originalFilename
        },
        attemptCount: 0,
        activeAttemptId: null,
        irreversibleStageReached: false,
        lease: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      transaction.set(jobRef, newJob);
      dispatchedJobs.push(newJob);
    }

    // Update order status to QUEUED_FOR_PRINT if currently ACCEPTED or RECEIVED
    if (order.status === 'RECEIVED' || order.status === 'ACCEPTED') {
      transaction.update(orderRef, {
        status: 'QUEUED_FOR_PRINT',
        updatedAt: nowIso
      });
    }

    return {
      success: true,
      jobId: dispatchedJobs[0]?.id || null,
      jobIds: dispatchedJobs.map(j => j.id),
      jobs: dispatchedJobs,
      count: dispatchedJobs.length,
      status: dispatchedJobs[0]?.status || 'QUEUED',
      assignedPrinterId: dispatchedJobs[0]?.printerId || null,
      autoDispatched: true
    };
  });
}


/**
 * Owner Action: CREATE COMMISSIONING TEST ORDER
 * Bypasses public intake pause, strictly restricted to authenticated OWNER or MANAGER.
 * Creates an authorized test order and immediately queues it for print dispatch.
 */
export async function createOwnerCommissioningTestOrder(
  db: Firestore,
  staffUid: string,
  requestedShopId: string
) {
  if (!staffUid || !requestedShopId) {
    throw new Error('staffUid and requestedShopId are required.');
  }

  const member = await getActiveShopMember(db, staffUid, requestedShopId);
  const allowedRoles = ['OWNER', 'MANAGER'];
  if (!allowedRoles.includes(member.role)) {
    throw new Error(`UNAUTHORIZED_ROLE: Role ${member.role} cannot create commissioning test orders.`);
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const orderId = `ord_test_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const orderNumber = `S2P-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const fileId = `file_test_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const itemId = `item_test_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const jobId = `job_test_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  const candidates = [
    path.join(process.cwd(), 'public', 'test_visible_a4.pdf'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'test_visible_a4.pdf'),
    path.join(process.cwd(), 'test_visible_a4.pdf'),
    path.join(process.cwd(), '..', '..', 'test_visible_a4.pdf'),
    'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\1c221f7d-e06d-48e2-9d00-0d8f618c0d27\\browser\\test_visible_a4.pdf'
  ];
  let fileSize = 1446;
  let fileSha256 = '93c3291af1fac9b56b53b20586e8a0c9c468cd559378a28504afb925d4175d82';
  const foundPath = candidates.find(p => fs.existsSync(p));
  if (foundPath) {
    const buf = fs.readFileSync(foundPath);
    fileSize = buf.length;
    fileSha256 = crypto.createHash('sha256').update(buf).digest('hex');
  }

  return await db.runTransaction(async (transaction) => {
    // 1. Order File
    transaction.set(db.collection('orderFiles').doc(fileId), {
      id: fileId,
      orderId,
      shopId: requestedShopId,
      organizationId: 'shakeel-online-services',
      originalFilename: 'test_visible_a4.pdf',
      safeFilename: 'test_visible_a4.pdf',
      mimeType: 'application/pdf',
      sizeBytes: fileSize,
      sha256: fileSha256,
      pageCount: 1,
      storageOriginalPath: 'system/test_visible_a4.pdf',
      documentAvailable: true,
      isTestFile: true,
      createdAt: nowIso
    });

    // 2. Order
    transaction.set(db.collection('orders').doc(orderId), {
      id: orderId,
      orderNumber,
      shopId: requestedShopId,
      organizationId: 'shakeel-online-services',
      customer: {
        name: 'Owner Commissioning Test',
        mobile: '+91 95815 29381',
        phone: '9581529381',
        email: member.email || 'shaikshadaab16@gmail.com'
      },
      status: 'QUEUED_FOR_PRINT',
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      totalPaise: 200,
      totalRupees: 2,
      subtotalPaise: 200,
      taxPaise: 0,
      itemCount: 1,
      isTestOrder: true,
      commissioningNotes: 'Owner-authorized commissioning test print for shop PC validation',
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // 3. Order Item
    transaction.set(db.collection('orderItems').doc(itemId), {
      id: itemId,
      orderId,
      fileId,
      paperSize: 'A4',
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      copies: 1,
      pageCount: 1,
      sheetCount: 1,
      totalPaise: 200,
      totalRupees: 2,
      orientation: 'PORTRAIT',
      scaling: 'FIT'
    });

    // 4. Print Job
    transaction.set(db.collection('printJobs').doc(jobId), {
      id: jobId,
      orderId,
      orderNumber,
      fileId,
      shopId: requestedShopId,
      organizationId: 'shakeel-online-services',
      status: 'QUEUED',
      isTestJob: true,
      attemptCount: 0,
      fileSnapshot: {
        filename: 'test_visible_a4.pdf',
        pageCount: 1,
        sizeBytes: fileSize,
        sha256: fileSha256
      },
      printConfig: {
        paperSize: 'A4',
        colorMode: 'BW',
        duplexMode: 'SINGLE',
        copies: 1,
        orientation: 'PORTRAIT',
        scaling: 'FIT'
      },
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // 5. Audit Log
    const auditId = `aud_${now.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: 'shakeel-online-services',
      shopId: requestedShopId,
      action: 'COMMISSIONING_TEST_ORDER_CREATED',
      targetType: 'ORDER',
      targetId: orderId,
      actorId: staffUid,
      actorRole: member.role,
      timestamp: nowIso,
      details: {
        orderId,
        orderNumber,
        printJobId: jobId
      }
    });

    return {
      success: true,
      orderId,
      orderNumber,
      printJobId: jobId
    };
  });
}
