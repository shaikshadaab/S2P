import { onRequest } from 'firebase-functions/v2/https';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import {
  calculatePrintPrice,
  parsePageRange,
  canTransitionOrder,
  generateCustomerOrderNumber,
  Order,
  OrderItem,
  OrderDraft,
  OrderFile,
  PriceSnapshot,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  verifyGuestSessionToken
} from '@s2p/shared';
import { getFirebaseAdminServices } from './purge';

interface CallerIdentity {
  isAuthenticated: boolean;
  uid?: string;
  isGuest: boolean;
  guestSessionId?: string;
}

async function resolveCallerIdentity(req: any): Promise<CallerIdentity> {
  const { auth } = getFirebaseAdminServices();
  const authHeader = (req.headers.authorization || '') as string;
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    try {
      const decoded = await auth.verifyIdToken(idToken);
      return {
        isAuthenticated: true,
        uid: decoded.uid,
        isGuest: false
      };
    } catch {
      // Fall through to guest
    }
  }

  const guestHeader = (req.headers['x-guest-session-token'] || '') as string;
  if (guestHeader) {
    const verifiedId = verifyGuestSessionToken(guestHeader);
    if (verifiedId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedId
      };
    }
  }

  const cookieHeader = (req.headers.cookie || '') as string;
  const match = cookieHeader.match(/s2p_guest_session=([^;]+)/);
  if (match) {
    const verifiedId = verifyGuestSessionToken(match[1]);
    if (verifiedId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedId
      };
    }
  }

  return {
    isAuthenticated: false,
    isGuest: false
  };
}

/**
 * 1. Authoritative Live Quote Endpoint
 * POST /api/quote
 */
export const apiQuote = onRequest(
  { cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { db } = getFirebaseAdminServices();
      const body = req.body || {};
      const {
        draftId,
        fileId,
        pageRange = 'all',
        paperSize = 'A4',
        colorMode = 'BW',
        duplexMode = 'SINGLE',
        copies = 1,
        paperType = 'NORMAL_75GSM',
        finishing = 'NONE'
      } = body;

      if (!draftId || !fileId) {
        res.status(400).json({ success: false, error: 'draftId and fileId are required.' });
        return;
      }

      // 1. Verify Draft
      const draftDoc = await db.collection('orderDrafts').doc(draftId).get();
      if (!draftDoc.exists) {
        res.status(404).json({ success: false, error: 'Order draft not found.' });
        return;
      }
      const draft = draftDoc.data() as OrderDraft;
      if (body.shopId && body.shopId !== draft.shopId) {
        res.status(403).json({ success: false, error: 'Order draft does not belong to the requested shop.' });
        return;
      }

      // 2. Verify File
      const fileDoc = await db.collection('orderFiles').doc(fileId).get();
      if (!fileDoc.exists) {
        res.status(404).json({ success: false, error: 'File record not found.' });
        return;
      }
      const file = fileDoc.data() as OrderFile;
      if (file.orderId !== draftId) {
        res.status(403).json({ success: false, error: 'File does not belong to this draft.' });
        return;
      }
      if (!file.documentAvailable) {
        res.status(410).json({ success: false, error: 'File is no longer available.' });
        return;
      }

      // 3. Parse & Validate Page Range against Authoritative File Page Count
      const pageCount = file.pageCount || 1;
      let selectedPages: number[];
      try {
        selectedPages = parsePageRange(pageRange, pageCount);
      } catch (rangeErr: unknown) {
        const msg = rangeErr instanceof Error ? rangeErr.message : 'Invalid page range';
        res.status(400).json({ success: false, error: msg });
        return;
      }

      const safeCopies = Math.max(1, Math.min(100, Number(copies) || 1));

      // 4. Calculate Authoritative Price
      const priceResult = calculatePrintPrice({
        shopId: draft.shopId,
        pageCount,
        selectedPages,
        paperSize,
        colorMode,
        duplexMode,
        copies: safeCopies,
        paperType,
        finishing
      });

      const quoteId = 'q_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      const calculatedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins validity

      const printCostPaise = Math.round(priceResult.printCost * 100);
      const paperCostPaise = Math.round(priceResult.paperCost * 100);
      const finishingCostPaise = Math.round(priceResult.finishingCost * 100);
      const discountPaise = Math.round(priceResult.discount * 100);
      const taxPaise = Math.round(priceResult.tax * 100);
      const totalPaise = Math.round(priceResult.total * 100);

      res.status(200).json({
        success: true,
        quote: {
          quoteId,
          pricingVersion: 'v1.0-rules',
          shopId: draft.shopId,
          fileId,
          pageCount,
          selectedPageCount: selectedPages.length,
          selectedPages,
          copies: safeCopies,
          totalSides: priceResult.totalSides,
          sheetCount: priceResult.sheetCount,
          printCostPaise,
          paperCostPaise,
          finishingCostPaise,
          discountPaise,
          taxPaise,
          totalPaise,
          totalRupees: priceResult.total,
          currency: 'INR',
          expiresAt,
          calculatedAt,
          breakdown: {
            printCost: priceResult.printCost,
            paperCost: priceResult.paperCost,
            finishingCost: priceResult.finishingCost,
            discount: priceResult.discount,
            tax: priceResult.tax,
            total: priceResult.total
          }
        }
      });
    } catch (err: unknown) {
      console.error('[apiQuote Error]:', err);
      const msg = err instanceof Error ? err.message : 'Failed to calculate quote.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 2. Authoritative Order Creation Endpoint
 * POST /api/orders
 */

async function getNextOrderNumber(db: admin.firestore.Firestore, shopId: string): Promise<string> {
  const counterRef = db.collection('shopCounters').doc(shopId);
  const currentYear = Number(new Date().getFullYear().toString().slice(-2));

  return await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextSeq = 1;

    if (counterDoc.exists) {
      const data = counterDoc.data();
      if (data && typeof data.nextOrderSequence === 'number') {
        nextSeq = data.nextOrderSequence;
      }
    }

    transaction.set(counterRef, {
      shopId,
      year: currentYear,
      nextOrderSequence: nextSeq + 1,
      updatedAtServer: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const padded = nextSeq.toString().padStart(6, '0');
    return `S2P-${currentYear}-${padded}`;
  });
}

export const apiCreateOrder = onRequest(
  { cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method === 'GET') {
      try {
        const { db } = getFirebaseAdminServices();
        const identity = await resolveCallerIdentity(req);
        const orderId = (req.query.orderId || '') as string;
        const shopId = (req.query.shopId || '') as string;

        if (orderId) {
          const orderDoc = await db.collection('orders').doc(orderId).get();
          if (!orderDoc.exists) {
            res.status(404).json({ success: false, error: 'Order not found.' });
            return;
          }
          const orderData = orderDoc.data() as Order;

          let allowed = false;
          if (identity.isAuthenticated && identity.uid) {
            if (orderData.customerId === identity.uid || orderData.ownerUid === identity.uid) {
              allowed = true;
            } else {
              const membership = await db
                .collection('shopMembers')
                .doc(identity.uid + '_' + orderData.shopId)
                .get();
              if (membership.exists && membership.data()?.status === 'ACTIVE') {
                allowed = true;
              }
            }
          } else if (identity.isGuest && identity.guestSessionId) {
            if (orderData.guestSessionId === identity.guestSessionId) {
              allowed = true;
            }
          }

          if (!allowed) {
            res.status(403).json({ success: false, error: 'Unauthorized to view this order.' });
            return;
          }

          res.status(200).json({ success: true, order: orderData });
          return;
        }

        if (shopId) {
          if (!identity.isAuthenticated || !identity.uid) {
            res.status(401).json({ success: false, error: 'Authentication required for shop orders.' });
            return;
          }
          const membership = await db
            .collection('shopMembers')
            .doc(identity.uid + '_' + shopId)
            .get();
          if (!membership.exists || membership.data()?.status !== 'ACTIVE') {
            res.status(403).json({ success: false, error: 'Access denied to this shop.' });
            return;
          }

          const snapshot = await db
            .collection('orders')
            .where('shopId', '==', shopId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

          const orders = snapshot.docs.map(doc => doc.data());
          res.status(200).json({ success: true, orders });
          return;
        }

        res.status(400).json({ success: false, error: 'orderId or shopId is required.' });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error fetching orders.';
        res.status(500).json({ success: false, error: msg });
        return;
      }
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use GET or POST.' });
      return;
    }

    try {
      const { db } = getFirebaseAdminServices();
      const identity = await resolveCallerIdentity(req);
      const body = req.body || {};
      const {
        draftId,
        fileId,
        config = {},
        customer = {},
        paymentMethod = 'CASH'
      } = body;

      if (!draftId || !fileId) {
        res.status(400).json({ success: false, error: 'draftId and fileId are required.' });
        return;
      }

      // 1. Verify Draft & Idempotency
      const draftRef = db.collection('orderDrafts').doc(draftId);
      const draftDoc = await draftRef.get();
      if (!draftDoc.exists) {
        res.status(404).json({ success: false, error: 'Order draft not found.' });
        return;
      }
      const draft = draftDoc.data() as OrderDraft;

      // Idempotency: If already converted, return the existing order
      if (draft.status === 'CONVERTED' && draft.convertedOrderId) {
        const existingOrderDoc = await db.collection('orders').doc(draft.convertedOrderId).get();
        if (existingOrderDoc.exists) {
          const existingOrder = existingOrderDoc.data() as Order;
          res.status(200).json({
            success: true,
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            isExisting: true
          });
          return;
        }
      }

      // Verify Draft Ownership
      if (identity.isAuthenticated && identity.uid) {
        if (draft.ownerUid && draft.ownerUid !== identity.uid) {
          res.status(403).json({ success: false, error: 'Draft belongs to another user account.' });
          return;
        }
      } else if (identity.isGuest) {
        if (draft.guestSessionId && draft.guestSessionId !== identity.guestSessionId) {
          res.status(403).json({ success: false, error: 'Guest session does not own this draft.' });
          return;
        }
      }

      // 2. Validate Shop Status
      const shopDoc = await db.collection('shops').doc(draft.shopId).get();
      if (!shopDoc.exists) {
        res.status(404).json({ success: false, error: 'Shop not found.' });
        return;
      }
      const shopData = shopDoc.data();
      if (!shopData || shopData.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: 'Shop is currently inactive.' });
        return;
      }

      // 3. Validate Customer Details
      const customerName = (customer.name || '').trim();
      const customerMobile = (customer.mobile || '').trim();
      const customerEmail = (customer.email || '').trim() || null;

      if (!customerName) {
        res.status(400).json({ success: false, error: 'Customer name is required.' });
        return;
      }
      if (!/^[6-9]\d{9}$/.test(customerMobile)) {
        res.status(400).json({ success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
        return;
      }

      // 4. Validate Payment Method
      if (paymentMethod !== 'CASH' && paymentMethod !== 'MANUAL_UPI') {
        res.status(400).json({ success: false, error: 'Payment method must be CASH or MANUAL_UPI.' });
        return;
      }

      // 5. Verify File
      const fileDoc = await db.collection('orderFiles').doc(fileId).get();
      if (!fileDoc.exists) {
        res.status(404).json({ success: false, error: 'File record not found.' });
        return;
      }
      const file = fileDoc.data() as OrderFile;
      if (file.orderId !== draftId) {
        res.status(403).json({ success: false, error: 'File does not match draft.' });
        return;
      }
      if (!file.documentAvailable) {
        res.status(410).json({ success: false, error: 'Uploaded file is no longer available.' });
        return;
      }

      // 6. Parse Pages & Recalculate Authoritative Price
      const pageCount = file.pageCount || 1;
      const pageRange = config.pageRange || 'all';
      const selectedPages = parsePageRange(pageRange, pageCount);
      const safeCopies = Math.max(1, Math.min(100, Number(config.copies) || 1));

      const priceResult = calculatePrintPrice({
        shopId: draft.shopId,
        pageCount,
        selectedPages,
        paperSize: config.paperSize || 'A4',
        colorMode: config.colorMode || 'BW',
        duplexMode: config.duplexMode || 'SINGLE',
        copies: safeCopies,
        paperType: config.paperType || 'NORMAL_75GSM',
        finishing: config.finishing || 'NONE'
      });

      const printCostPaise = Math.round(priceResult.printCost * 100);
      const paperCostPaise = Math.round(priceResult.paperCost * 100);
      const finishingCostPaise = Math.round(priceResult.finishingCost * 100);
      const discountPaise = Math.round(priceResult.discount * 100);
      const taxPaise = Math.round(priceResult.tax * 100);
      const totalPaise = Math.round(priceResult.total * 100);

      const pricingSnapshot: PriceSnapshot = {
        calculatedAt: new Date().toISOString(),
        pricingVersion: 'v1.0-rules',
        pageCount,
        totalSides: priceResult.totalSides,
        sheetCount: priceResult.sheetCount,
        printCostPaise,
        paperCostPaise,
        finishingCostPaise,
        discountPaise,
        taxPaise,
        totalPaise,
        printCost: priceResult.printCost,
        paperCost: priceResult.paperCost,
        finishingCost: priceResult.finishingCost,
        discount: priceResult.discount,
        tax: priceResult.tax,
        total: priceResult.total,
        currency: 'INR'
      };

      // 7. Create Unique Order Number & Records
      const orderId = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      const orderNumber = await getNextOrderNumber(db, draft.shopId);
      const nowIso = new Date().toISOString();

      const initialStatus: OrderStatus = 'RECEIVED';
      const initialPaymentStatus: PaymentStatus = paymentMethod === 'CASH' ? 'CASH_PENDING' : 'UPI_PENDING';

      const orderItem: OrderItem = {
        id: 'item_' + Date.now().toString(36) + '_1',
        orderId,
        fileId,
        config: {
          paperSize: config.paperSize || 'A4',
          colorMode: config.colorMode || 'BW',
          duplexMode: config.duplexMode || 'SINGLE',
          copies: safeCopies,
          pageRange,
          orientation: config.orientation === 'LANDSCAPE' ? 'LANDSCAPE' : config.orientation === 'PORTRAIT' ? 'PORTRAIT' : 'AUTO',
          scaling: config.scaling === 'ACTUAL_SIZE' ? 'ACTUAL_SIZE' : 'FIT',
          fitMode: config.fitMode || 'FIT_PAGE',
          paperType: config.paperType || 'NORMAL_75GSM',
          finishing: config.finishing || 'NONE'
        },
        selectedPages,
        selectedPageCount: selectedPages.length,
        printedSides: priceResult.totalSides,
        estimatedSheets: priceResult.sheetCount,
        pricingSnapshot
      };

      const timelineEvent = {
        id: 'evt_' + Date.now().toString(36) + '_1',
        status: initialStatus,
        timestamp: nowIso,
        actorId: identity.uid || (identity.guestSessionId ? 'guest_' + identity.guestSessionId.slice(-6) : 'customer'),
        actorRole: 'CUSTOMER',
        note: paymentMethod === 'CASH'
          ? 'Order created. Cash payment pending at counter.'
          : 'Order created. Manual UPI payment pending verification.'
      };

      const orderRecord: Order = {
        id: orderId,
        orderNumber,
        organizationId: draft.organizationId,
        shopId: draft.shopId,
        customerId: identity.uid || null,
        customerName,
        customerMobile,
        customerEmail,
        draftId,
        guestSessionId: identity.guestSessionId || draft.guestSessionId || null,
        ownerUid: identity.uid || draft.ownerUid || null,
        isGuest: !identity.isAuthenticated,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        paymentMethod,
        currency: 'INR',
        subtotalPaise: printCostPaise + paperCostPaise + finishingCostPaise,
        discountPaise,
        taxPaise,
        totalPaise,
        totalAmount: priceResult.total,
        items: [orderItem],
        pricingSnapshot,
        timeline: [timelineEvent],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // 8. Transactionally create Order and convert Draft
      await db.runTransaction(async (tx) => {
        const freshDraftSnap = await tx.get(draftRef);
        if (!freshDraftSnap.exists) {
          throw new Error('Draft disappeared');
        }
        const freshDraft = freshDraftSnap.data() as OrderDraft;
        if (freshDraft.status === 'CONVERTED') {
          throw new Error('ALREADY_CONVERTED');
        }

        tx.set(db.collection('orders').doc(orderId), {
          ...orderRecord,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });

        tx.set(db.collection('orderItems').doc(orderItem.id), orderItem);

        tx.update(draftRef, {
          status: 'CONVERTED',
          convertedOrderId: orderId,
          updatedAtServer: admin.firestore.FieldValue.serverTimestamp()
        });

        // Write immutable paymentEvent
        const paymentEventId = 'pe_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
        tx.set(db.collection('paymentEvents').doc(paymentEventId), {
          id: paymentEventId,
          organizationId: draft.organizationId,
          shopId: draft.shopId,
          orderId,
          paymentMethod,
          previousStatus: null,
          newStatus: initialPaymentStatus,
          amountPaise: totalPaise,
          actorType: identity.isAuthenticated ? 'USER' : 'GUEST',
          actorUid: identity.uid || identity.guestSessionId || 'guest',
          actorRole: 'CUSTOMER',
          createdAt: nowIso,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });

        // Write immutable orderStatusHistory
        const historyId = 'osh_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
        tx.set(db.collection('orderStatusHistory').doc(historyId), {
          id: historyId,
          organizationId: draft.organizationId,
          shopId: draft.shopId,
          orderId,
          fromStatus: null,
          toStatus: initialStatus,
          actorType: identity.isAuthenticated ? 'USER' : 'GUEST',
          actorUid: identity.uid || identity.guestSessionId || 'guest',
          actorRole: 'CUSTOMER',
          reason: 'Order created',
          createdAt: nowIso,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.status(200).json({
        success: true,
        orderId,
        orderNumber,
        totalAmount: priceResult.total,
        paymentStatus: initialPaymentStatus,
        status: initialStatus
      });
    } catch (err: unknown) {
      console.error('[apiCreateOrder Error]:', err);
      const msg = err instanceof Error ? err.message : 'Order creation failed.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 3. Staff Order Status / Payment Action Endpoint
 * POST /api/orders/update-status
 */
export const apiUpdateOrderStatus = onRequest(
  { cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { db } = getFirebaseAdminServices();
      const identity = await resolveCallerIdentity(req);

      if (!identity.isAuthenticated || !identity.uid) {
        res.status(401).json({ success: false, error: 'Authentication required for staff operations.' });
        return;
      }

      const body = req.body || {};
      const { orderId, action, note } = body;

      if (!orderId || !action) {
        res.status(400).json({ success: false, error: 'orderId and action are required.' });
        return;
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        res.status(404).json({ success: false, error: 'Order not found.' });
        return;
      }
      const order = orderSnap.data() as Order;

      // Verify Staff Membership in shop
      const memberDoc = await db.collection('shopMembers').doc(`${identity.uid}_${order.shopId}`).get();
      if (!memberDoc.exists) {
        res.status(403).json({ success: false, error: 'User is not a member of this shop.' });
        return;
      }
      const member = memberDoc.data();
      if (member?.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: 'Staff membership is inactive.' });
        return;
      }
      const role = member?.role || 'STAFF';

      const nowIso = new Date().toISOString();
      const updates: Partial<Order> & { updatedAtServer: any } = {
        updatedAt: nowIso,
        updatedAtServer: admin.firestore.FieldValue.serverTimestamp()
      };

      let newStatus = order.status;
      let newPaymentStatus = order.paymentStatus;
      let eventNote = note || '';

      switch (action) {
        case 'ACCEPT_ORDER':
          if (!canTransitionOrder(order.status, 'ACCEPTED')) {
            res.status(400).json({ success: false, error: `Cannot transition from ${order.status} to ACCEPTED` });
            return;
          }
          newStatus = 'ACCEPTED';
          updates.status = newStatus;
          eventNote = eventNote || 'Staff accepted order.';
          break;

        case 'MARK_CASH_PAID':
        case 'CONFIRM_UPI_PAID':
          if (!['OWNER', 'MANAGER', 'COUNTER_STAFF'].includes(role)) {
            res.status(403).json({ success: false, error: 'Insufficient permission to confirm payment.' });
            return;
          }
          newPaymentStatus = 'PAID';
          updates.paymentStatus = 'PAID';
          updates.paymentVerifiedBy = identity.uid;
          updates.paymentVerifiedAt = nowIso;
          eventNote = action === 'MARK_CASH_PAID' ? 'Cash payment verified at counter.' : 'UPI payment confirmed.';
          break;

        case 'HOLD_ORDER':
          if (!canTransitionOrder(order.status, 'ON_HOLD')) {
            res.status(400).json({ success: false, error: `Cannot transition from ${order.status} to ON_HOLD` });
            return;
          }
          newStatus = 'ON_HOLD';
          updates.status = newStatus;
          eventNote = eventNote || 'Order placed on hold.';
          break;

        case 'CANCEL_ORDER':
          if (!canTransitionOrder(order.status, 'CANCELLED')) {
            res.status(400).json({ success: false, error: `Cannot transition from ${order.status} to CANCELLED` });
            return;
          }
          newStatus = 'CANCELLED';
          updates.status = newStatus;
          eventNote = eventNote || 'Order cancelled by staff.';
          break;

        default:
          res.status(400).json({ success: false, error: 'Unknown action: ' + action });
          return;
      }

      const timelineEvent = {
        id: 'evt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
        status: newStatus,
        timestamp: nowIso,
        actorId: identity.uid,
        actorRole: role,
        note: eventNote
      };

      const updatedTimeline = [...(order.timeline || []), timelineEvent];
      updates.timeline = updatedTimeline;

      const batch = db.batch();
      batch.update(orderRef, updates);

      // Payment Event if payment changed
      if (newPaymentStatus !== order.paymentStatus) {
        const peId = 'pe_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
        batch.set(db.collection('paymentEvents').doc(peId), {
          id: peId,
          organizationId: order.organizationId,
          shopId: order.shopId,
          orderId,
          paymentMethod: order.paymentMethod,
          previousStatus: order.paymentStatus,
          newStatus: newPaymentStatus,
          amountPaise: order.totalPaise,
          actorType: 'STAFF',
          actorUid: identity.uid,
          actorRole: role,
          createdAt: nowIso,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Order Status History if status changed
      if (newStatus !== order.status) {
        const oshId = 'osh_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
        batch.set(db.collection('orderStatusHistory').doc(oshId), {
          id: oshId,
          organizationId: order.organizationId,
          shopId: order.shopId,
          orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          actorType: 'STAFF',
          actorUid: identity.uid,
          actorRole: role,
          reason: eventNote,
          createdAt: nowIso,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Audit Log
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      batch.set(db.collection('auditLogs').doc(auditId), {
        id: auditId,
        action,
        orderId,
        actorUid: identity.uid,
        actorRole: role,
        timestamp: nowIso,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp(),
        note: eventNote
      });

      await batch.commit();

      res.status(200).json({
        success: true,
        orderId,
        status: newStatus,
        paymentStatus: newPaymentStatus,
        timelineEvent
      });
    } catch (err: unknown) {
      console.error('[apiUpdateOrderStatus Error]:', err);
      const msg = err instanceof Error ? err.message : 'Status update failed.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);
