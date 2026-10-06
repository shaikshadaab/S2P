import admin from 'firebase-admin';
import { PDFDocument, rgb } from 'pdf-lib';

// Configure environment
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
process.env.STORAGE_EMULATOR_HOST = 'http://127.0.0.1:9199';
process.env.GCLOUD_PROJECT = 's2p-shakeel-dev';

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 's2p-shakeel-dev' });
}

const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth();

const BASE_URL = 'http://localhost:3000';
const SHOP_ID = 'shakeel-online-services';

const results = {};

function logStep(name, status, detail = '') {
  console.log(`[GATE] ${name}: ${status ? 'PASS' : 'FAIL'} ${detail}`);
  results[name] = { pass: Boolean(status), detail };
}

async function runGate() {
  console.log('=====================================================');
  console.log('   STARTING S2P FINAL LOCAL INTEGRATION GATE TEST   ');
  console.log('=====================================================\n');

  // STEP 6: Verify Shop Options API
  console.log('--- Step 6: Verify Shop Options API ---');
  const optRes = await fetch(`${BASE_URL}/api/shops/${SHOP_ID}/options`);
  if (!optRes.ok) {
    throw new Error(`Shop options failed with status ${optRes.status}: ${await optRes.text()}`);
  }
  const optData = await optRes.json();
  const hasSizes = Array.isArray(optData.printOptions?.paperSizes) && optData.printOptions.paperSizes.length > 0;
  const hasUpi = Boolean(optData.upiConfig?.upiId);
  logStep('SHOP_OPTIONS_API', optData.success && hasSizes && hasUpi, `PaperSizes: ${optData.printOptions?.paperSizes?.length}, UPI: ${optData.upiConfig?.upiId}`);

  // STEP 7: Real End-to-End Flow
  console.log('\n--- Step 7: Real End-to-End Flow ---');
  
  // 7.1 Open shop page
  const pageRes = await fetch(`${BASE_URL}/s/${SHOP_ID}`);
  logStep('SHOP_PAGE_HTML', pageRes.status === 200, `HTTP status ${pageRes.status}`);

  // 7.2 Create guest draft
  const draftRes = await fetch(`${BASE_URL}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: SHOP_ID })
  });
  const draftData = await draftRes.json();
  if (!draftData.success || !draftData.draftId) {
    throw new Error(`Failed to create draft: ${JSON.stringify(draftData)}`);
  }
  const draftId = draftData.draftId;
  const guestToken = draftData.guestSessionToken;
  logStep('GUEST_DRAFT_CREATION', true, `Draft ID: ${draftId}, Token issued: ${Boolean(guestToken)}`);

  // 7.3 Generate a real 3-page PDF document
  const pdfDoc = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
    page.drawText(`S2P Integration Test - Page ${i} of 3`, {
      x: 50,
      y: 750,
      size: 18,
      color: rgb(0, 0, 0)
    });
    page.drawText(`Authoritative Page Count Test - Pilot: Shakeel Online Services`, {
      x: 50,
      y: 720,
      size: 12,
      color: rgb(0.2, 0.2, 0.2)
    });
  }
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  console.log(`Generated real test PDF: ${pdfBuffer.length} bytes, 3 pages.`);

  // 7.4 Upload real PDF via /api/upload
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'shakeel-contract-test.pdf');
  formData.append('shopId', SHOP_ID);
  formData.append('draftId', draftId);

  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Cookie': `s2p_guest_session=${guestToken}`
    },
    body: formData
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success || !uploadData.file) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }
  const fileId = uploadData.file.id;
  const authorPageCount = uploadData.file.pageCount;
  logStep('REAL_PDF_UPLOAD', true, `FileId: ${fileId}, Mime: ${uploadData.file.mimeType}, Size: ${uploadData.file.sizeBytes}b`);
  logStep('AUTHORITATIVE_PAGE_COUNT', authorPageCount === 3, `Expected: 3, Actual: ${authorPageCount}`);

  // Verify file in Firestore emulator
  const fileDocSnap = await db.collection('orderFiles').doc(fileId).get();
  const fileInDb = fileDocSnap.exists && fileDocSnap.data()?.pageCount === 3;
  logStep('FILE_PERSISTED_IN_FIRESTORE', fileInDb, `orderFiles/${fileId} found with pageCount 3`);

  // Verify file in Storage emulator
  const storagePath = fileDocSnap.data()?.storageOriginalPath;
  const storageBucket = storage.bucket('s2p-shakeel-dev.appspot.com');
  const [fileExistsInStorage] = await storageBucket.file(storagePath).exists();
  logStep('FILE_PERSISTED_IN_STORAGE', fileExistsInStorage, `gs://s2p-shakeel-dev.appspot.com/${storagePath}`);

  // 7.5 & 7.6 Request Authoritative Quote
  // 3 pages, 2 copies = 6 printed sides B&W single A4. Seed price is ₹2.00 (200 paise)/side.
  // Expected total: 6 * 200 = 1200 paise (₹12.00).
  const quoteReqBody = {
    shopId: SHOP_ID,
    draftId,
    fileId,
    pageRange: '1-3',
    copies: 2,
    colorMode: 'BW',
    paperSize: 'A4',
    duplexMode: 'SINGLE',
    paperType: 'NORMAL_75GSM',
    finishing: 'NONE',
    orientation: 'PORTRAIT',
    scaling: 'FIT'
  };

  const quoteRes = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${guestToken}`
    },
    body: JSON.stringify(quoteReqBody)
  });

  const quoteData = await quoteRes.json();
  if (!quoteData.success || !quoteData.quote) {
    throw new Error(`Quote calculation failed: ${JSON.stringify(quoteData)}`);
  }
  const quoteId = quoteData.quote.quoteId;
  const quoteTotalPaise = quoteData.quote.totalPaise;
  const quoteExpectedPaise = 1200; // 6 sides * 200 paise
  logStep('AUTHORITATIVE_QUOTE', quoteTotalPaise === quoteExpectedPaise, `Quote ID: ${quoteId}, Total: ₹${quoteTotalPaise/100} (${quoteTotalPaise} paise)`);

  // 7.7 Place CASH order
  const orderReqBody = {
    shopId: SHOP_ID,
    draftId,
    fileId,
    quoteId,
    customer: {
      name: 'Ahmad Khan',
      mobile: '9876500000',
      email: 'ahmad@example.com'
    },
    paymentMethod: 'CASH',
    customerNotes: 'Please print cleanly, urgent.'
  };

  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${guestToken}`
    },
    body: JSON.stringify(orderReqBody)
  });

  const orderData = await orderRes.json();
  if (!orderData.success || !orderData.order) {
    throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
  }
  const orderId = orderData.order.id;
  const orderNumber = orderData.order.orderNumber;
  logStep('CASH_ORDER_CREATION', true, `OrderId: ${orderId}, Number: ${orderNumber}, Status: ${orderData.order.status}, PaymentStatus: ${orderData.order.paymentStatus}`);

  // 7.8 Verify order in Firestore emulator
  const orderSnap = await db.collection('orders').doc(orderId).get();
  const orderInDb = orderSnap.exists && orderSnap.data()?.totalPaise === 1200;
  logStep('ORDER_IN_FIRESTORE', orderInDb, `orders/${orderId} confirmed in emulator database`);

  // 7.9 Open /track/{orderId} & fetch order
  const trackPageRes = await fetch(`${BASE_URL}/track/${orderId}`);
  logStep('TRACKING_PAGE_HTML', trackPageRes.status === 200, `HTTP status ${trackPageRes.status}`);

  const trackApiRes = await fetch(`${BASE_URL}/api/orders?orderId=${orderId}`, {
    headers: { 'Cookie': `s2p_guest_session=${guestToken}` }
  });
  const trackApiData = await trackApiRes.json();
  logStep('TRACKING_API', trackApiData.success && trackApiData.order?.id === orderId, `Status: ${trackApiData.order?.status}`);

  // 7.10 Sign in as seeded staff
  // Owner was seeded with owner@shakeelprints.com / Shakeel@1234
  const signInRes = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-s2p-api-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@shakeelprints.com',
      password: 'Shakeel@1234',
      returnSecureToken: true
    })
  });
  const signInData = await signInRes.json();
  if (!signInData.idToken) {
    throw new Error(`Staff login failed: ${JSON.stringify(signInData)}`);
  }
  const staffIdToken = signInData.idToken;
  logStep('STAFF_AUTHENTICATION', true, `Owner signed in, UID: ${signInData.localId}`);

  // 7.11 Open /dashboard/orders & query shop orders
  const dashPageRes = await fetch(`${BASE_URL}/dashboard/orders`);
  logStep('DASHBOARD_PAGE_HTML', dashPageRes.status === 200, `HTTP status ${dashPageRes.status}`);

  const shopOrdersRes = await fetch(`${BASE_URL}/api/orders?shopId=${SHOP_ID}`, {
    headers: { 'Authorization': `Bearer ${staffIdToken}` }
  });
  const shopOrdersData = await shopOrdersRes.json();
  const containsOurOrder = Array.isArray(shopOrdersData.orders) && shopOrdersData.orders.some(o => o.id === orderId);
  logStep('STAFF_DASHBOARD_ORDERS', containsOurOrder, `Fetched ${shopOrdersData.orders?.length} shop orders, order found: ${containsOurOrder}`);

  // 7.12 Staff Action 1: ACCEPT ORDER
  const acceptRes = await fetch(`${BASE_URL}/api/orders/update-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffIdToken}`
    },
    body: JSON.stringify({
      orderId,
      action: 'ACCEPT_ORDER',
      note: 'Order verified and accepted by Shakeel Owner'
    })
  });
  const acceptData = await acceptRes.json();
  logStep('STAFF_ACCEPT_ORDER', acceptData.success && acceptData.order?.status === 'ACCEPTED', `New Status: ${acceptData.order?.status}`);

  // 7.13 Staff Action 2: MARK CASH PAID
  const paidRes = await fetch(`${BASE_URL}/api/orders/update-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffIdToken}`
    },
    body: JSON.stringify({
      orderId,
      action: 'MARK_CASH_PAID',
      note: 'Received ₹12 cash at counter'
    })
  });
  const paidData = await paidRes.json();
  logStep('STAFF_MARK_CASH_PAID', paidData.success && paidData.order?.paymentStatus === 'PAID', `Payment Status: ${paidData.order?.paymentStatus}`);

  // 7.14 Verify paymentEvents, orderStatusHistory, auditLogs in Firestore emulator
  const paymentEventsSnap = await db.collection('paymentEvents').where('orderId', '==', orderId).get();
  const hasCashPaidEvent = paymentEventsSnap.docs.some(d => d.data().newStatus === 'PAID' && d.data().amountPaise === 1200);
  logStep('PAYMENT_EVENTS_RECORD', hasCashPaidEvent, `Found ${paymentEventsSnap.size} payment events. PAID confirmed.`);

  const historySnap = await db.collection('orderStatusHistory').where('orderId', '==', orderId).get();
  const hasAcceptHistory = historySnap.docs.some(d => d.data().toStatus === 'ACCEPTED');
  logStep('ORDER_STATUS_HISTORY_RECORD', hasAcceptHistory, `Found ${historySnap.size} status history records.`);

  const auditSnap = await db.collection('auditLogs').where('targetId', '==', orderId).get();
  const hasAuditLogs = auditSnap.docs.some(d => d.data().action === 'STAFF_MARK_CASH_PAID' || d.data().action === 'STAFF_ACCEPT_ORDER');
  logStep('AUDIT_LOG_RECORD', hasAuditLogs, `Found ${auditSnap.size} audit log records.`);

  // 7.15 Customer tracking reflects updated status
  const customerTrackRes = await fetch(`${BASE_URL}/api/orders?orderId=${orderId}`, {
    headers: { 'Cookie': `s2p_guest_session=${guestToken}` }
  });
  const customerTrackData = await customerTrackRes.json();
  const customerStatusOk = customerTrackData.order?.status === 'ACCEPTED' && customerTrackData.order?.paymentStatus === 'PAID';
  logStep('CUSTOMER_TRACKING_REFLECTS_STATUS', customerStatusOk, `Customer sees status: ${customerTrackData.order?.status}, payment: ${customerTrackData.order?.paymentStatus}`);

  // STEP 8: Verify Dynamic Pricing Change
  console.log('\n--- Step 8: Dynamic Firestore Pricing Change Test ---');
  // Create a new draft for pricing verification
  const pricingDraftRes = await fetch(`${BASE_URL}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: SHOP_ID })
  });
  const pricingDraftData = await pricingDraftRes.json();
  const pDraftId = pricingDraftData.draftId;
  const pGuestToken = pricingDraftData.guestSessionToken;

  // Upload file for pricing draft
  const pFormData = new FormData();
  pFormData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'pricing-test.pdf');
  pFormData.append('shopId', SHOP_ID);
  pFormData.append('draftId', pDraftId);

  const pUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Cookie': `s2p_guest_session=${pGuestToken}` },
    body: pFormData
  });
  const pUploadData = await pUploadRes.json();
  const pFileId = pUploadData.file.id;

  // First calculate price for 10 pages B&W single with baseline rate (₹2.00 / 200 paise)
  // pageRange: '1-2' (2 pages) * 5 copies = 10 printed sides * 200 paise = 2000 paise (₹20.00).
  const quoteBeforeRes = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${pGuestToken}`
    },
    body: JSON.stringify({
      shopId: SHOP_ID,
      draftId: pDraftId,
      fileId: pFileId,
      pageRange: '1-2',
      copies: 5,
      colorMode: 'BW',
      paperSize: 'A4',
      duplexMode: 'SINGLE',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE'
    })
  });
  const quoteBeforeData = await quoteBeforeRes.json();
  const beforeTotal = quoteBeforeData.quote.totalPaise; // 2000 paise (₹20)

  // Now modify the rule in Firestore emulator: update unitPricePaise to 500 (₹5.00/page)
  const ruleDocRef = db.collection('pricingRules').doc(`${SHOP_ID}_a4_bw_single`);
  await ruleDocRef.update({
    unitPricePaise: 500,
    quantityTiers: [
      { minUnits: 1, maxUnits: 100, unitPricePaise: 500 }
    ],
    updatedAt: new Date().toISOString()
  });
  console.log('Updated Firestore pricing rule: A4 B&W Single rate changed from 200 paise (₹2) to 500 paise (₹5).');

  // Request quote again with the exact same configuration
  const quoteAfterRes = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${pGuestToken}`
    },
    body: JSON.stringify({
      shopId: SHOP_ID,
      draftId: pDraftId,
      fileId: pFileId,
      pageRange: '1-2',
      copies: 5,
      colorMode: 'BW',
      paperSize: 'A4',
      duplexMode: 'SINGLE',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE'
    })
  });
  const quoteAfterData = await quoteAfterRes.json();
  const afterTotal = quoteAfterData.quote.totalPaise; // 5000 paise (₹50)

  const priceChangedCorrectly = beforeTotal === 2000 && afterTotal === 5000;
  logStep('PRICING_CHANGE_TEST', priceChangedCorrectly, `Before (₹2/side): ${beforeTotal} paise (₹20), After (₹5/side): ${afterTotal} paise (₹50)`);

  // Restore rule back to 200 paise
  await ruleDocRef.update({
    unitPricePaise: 200,
    quantityTiers: [
      { minUnits: 1, maxUnits: 20, unitPricePaise: 200 },
      { minUnits: 21, maxUnits: 100, unitPricePaise: 180 },
      { minUnits: 101, unitPricePaise: 150 }
    ],
    updatedAt: new Date().toISOString()
  });

  // STEP 9: Security and Tenant Isolation
  console.log('\n--- Step 9: Guest and Tenant Isolation Verification ---');
  
  // Set up a dedicated isolated draft for security testing
  const secDraftRes = await fetch(`${BASE_URL}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: SHOP_ID })
  });
  const secDraftData = await secDraftRes.json();
  const secDraftId = secDraftData.draftId;
  const secGuestToken = secDraftData.guestSessionToken;

  const secFormData = new FormData();
  secFormData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'security-test.pdf');
  secFormData.append('shopId', SHOP_ID);
  secFormData.append('draftId', secDraftId);

  const secUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Cookie': `s2p_guest_session=${secGuestToken}` },
    body: secFormData
  });
  const secUploadData = await secUploadRes.json();
  const secFileId = secUploadData.file.id;

  const secQuoteRes = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${secGuestToken}`
    },
    body: JSON.stringify({
      shopId: SHOP_ID,
      draftId: secDraftId,
      fileId: secFileId,
      copies: 1
    })
  });
  const secQuoteData = await secQuoteRes.json();
  const secQuoteId = secQuoteData.quote.quoteId;

  // 9.1 Guest Isolation: Unrelated guest trying to order draft created by original guest
  // Generate a totally separate guest session for attacker
  const attackerDraftRes = await fetch(`${BASE_URL}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: SHOP_ID })
  });
  const attackerDraftData = await attackerDraftRes.json();
  const attackerGuestToken = attackerDraftData.guestSessionToken;

  const fakeGuestRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${attackerGuestToken}`
    },
    body: JSON.stringify({
      shopId: SHOP_ID,
      draftId: secDraftId,
      fileId: secFileId,
      quoteId: secQuoteId,
      customer: {
        name: 'Attacker Guest',
        mobile: '9876543210'
      },
      paymentMethod: 'CASH'
    })
  });
  const guestBlocked = fakeGuestRes.status === 403;
  logStep('GUEST_ISOLATION', guestBlocked, `Unrelated guest order attempt returned status ${fakeGuestRes.status} (blocked)`);

  // 9.2 Tenant Isolation: Mismatched shopId vs draftId
  const crossShopRes = await fetch(`${BASE_URL}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `s2p_guest_session=${secGuestToken}`
    },
    body: JSON.stringify({
      shopId: 'other-unauthorized-shop',
      draftId: secDraftId,
      fileId: secFileId
    })
  });
  const tenantBlocked = crossShopRes.status === 403;
  logStep('TENANT_ISOLATION', tenantBlocked, `Cross-shop attempt returned status ${crossShopRes.status} (blocked)`);

  // 9.3 Unauthorized Staff Action: Unauthenticated user attempting ACCEPT_ORDER
  const unauthStaffRes = await fetch(`${BASE_URL}/api/orders/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      action: 'ACCEPT_ORDER'
    })
  });
  const staffBlocked = unauthStaffRes.status === 403 || unauthStaffRes.status === 401;
  logStep('STAFF_SECURITY_ISOLATION', staffBlocked, `Unauthenticated staff action returned status ${unauthStaffRes.status} (blocked)`);

  console.log('\n=====================================================');
  console.log('              INTEGRATION GATE SUMMARY               ');
  console.log('=====================================================');
  const allPassed = Object.values(results).every(r => r.pass);
  console.log(`TOTAL CHECKS: ${Object.keys(results).length}`);
  console.log(`ALL CHECKS PASSED: ${allPassed ? 'YES (100%)' : 'NO'}`);

  return { allPassed, results };
}

runGate()
  .then(({ allPassed, results }) => {
    if (!allPassed) {
      console.error('Some integration checks failed!');
      process.exit(1);
    } else {
      console.log('INTEGRATION GATE FULLY PASSED!');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Fatal error during integration gate execution:', err);
    process.exit(1);
  });
