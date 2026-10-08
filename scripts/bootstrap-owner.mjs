/**
 * SOS Print — Authoritative Owner Bootstrap Script
 * Strictly validates and sets the initial shop owner for Shakeel Online Services.
 *
 * Requirements & Invariants:
 * 1. Requires explicit FIREBASE_PROJECT_ID=shakeel-online-services-951ec (no fallbacks).
 * 2. Requires protected Admin credentials (FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL+PRIVATE_KEY).
 * 3. Verifies target UID exists in Firebase Authentication.
 * 4. Refuses to overwrite a different existing active owner.
 * 5. Leaves customer intake paused (manualPause: true, isOpen: false) until hardware calibration passes.
 * 6. Keeps fixed SHOP_ID=shakeel-online-services.
 */

import admin from 'firebase-admin';

const targetUid = process.argv[2] || process.env.INITIAL_OWNER_UID || 'YSakxmoeNRX85x7eQKG2P7KYmPo2';
const targetEmail = process.argv[3] || process.env.INITIAL_OWNER_EMAIL || '';

const REQUIRED_PROJECT_ID = 'shakeel-online-services-951ec';
const FIXED_SHOP_ID = 'shakeel-online-services';

// 1. Strict Project ID check
const currentProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (!currentProjectId || currentProjectId !== REQUIRED_PROJECT_ID) {
  console.error(`[Bootstrap ERROR] Explicit project ID mismatch! Expected: ${REQUIRED_PROJECT_ID}, Received: ${currentProjectId}`);
  console.error('Please configure FIREBASE_PROJECT_ID=shakeel-online-services-951ec');
  process.exit(1);
}

import fs from 'fs';

// 2. Strict Credential check (Do not proceed with empty or fake credentials)
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const hasCertCredentials = Boolean(
  (saPath && fs.existsSync(saPath)) ||
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
);

if (!hasCertCredentials) {
  console.error('[Bootstrap ERROR] Protected Admin credentials are not yet configured in environment.');
  console.error('Please provide FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_KEY.');
  console.error('Do NOT run production bootstrap without protected service account credentials.');
  process.exit(1);
}

// Initialize Admin SDK with explicit credentials
if (admin.apps.length === 0) {
  let credential;
  if (saPath && fs.existsSync(saPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      if (sa.project_id !== REQUIRED_PROJECT_ID) {
        console.error('[Security Violation] Credential project_id does not match expected project ID: ' + REQUIRED_PROJECT_ID);
        process.exit(1);
      }
      credential = admin.credential.cert(sa);
    } catch (e) {
      console.error('[Bootstrap ERROR] Failed to read service account JSON file from:', saPath, e.message);
      process.exit(1);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(sa);
    } catch (e) {
      console.error('[Bootstrap ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e.message);
      process.exit(1);
    }
  } else {
    credential = admin.credential.cert({
      projectId: REQUIRED_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
  }

  admin.initializeApp({
    credential,
    projectId: REQUIRED_PROJECT_ID
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function runBootstrap() {
  console.log(`================================================================`);
  console.log(` SOS Print — Secure Owner Bootstrap for Shakeel Online Services`);
  console.log(` Project: ${REQUIRED_PROJECT_ID}`);
  console.log(` Target Owner UID: ${targetUid}`);
  console.log(`================================================================\n`);

  // 3. Verify UID exists in Firebase Auth
  let authUser;
  try {
    authUser = await auth.getUser(targetUid);
    console.log(`[Auth Verification] SUCCESS: Found Firebase Auth user for UID: ${targetUid}`);
    console.log(`[Auth Verification] Email: ${authUser.email || '(not specified)'}`);
    console.log(`[Auth Verification] Email Verified: ${authUser.emailVerified}`);
  } catch (err) {
    console.error(`[Auth Verification FAILED] UID ${targetUid} was NOT found in Firebase project ${REQUIRED_PROJECT_ID}.`);
    console.error(`Reason: ${err.message}`);
    process.exit(1);
  }

  // 4. Check for existing active owner — Refuse to overwrite a different active owner
  const membersSnap = await db.collection('shopMembers')
    .where('shopId', '==', FIXED_SHOP_ID)
    .where('role', '==', 'OWNER')
    .where('status', '==', 'ACTIVE')
    .get();

  if (!membersSnap.empty) {
    const existingOwner = membersSnap.docs[0].data();
    if (existingOwner.userId !== targetUid) {
      console.error(`[Security Violation] An existing active owner already exists for ${FIXED_SHOP_ID}: UID ${existingOwner.userId}.`);
      console.error(`Refusing to overwrite active owner with new UID ${targetUid}.`);
      process.exit(1);
    } else {
      console.log(`[Idempotency] User ${targetUid} is already the registered active OWNER for ${FIXED_SHOP_ID}. Updating profile safely.`);
    }
  }

  const now = new Date().toISOString();

  // 5. Ensure Shop document exists with INTAKE PAUSED
  const shopRef = db.collection('shops').doc(FIXED_SHOP_ID);
  const shopSnap = await shopRef.get();
  if (!shopSnap.exists) {
    await shopRef.set({
      id: FIXED_SHOP_ID,
      name: 'Shakeel Online Services',
      slug: FIXED_SHOP_ID,
      organizationId: FIXED_SHOP_ID,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      isOpen: false,           // Customer intake paused
      manualPause: true,       // Explicit manual pause active
      printDispatchMode: 'MANUAL_QUEUE',
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    console.log(`[Shop Setup] Created shops/${FIXED_SHOP_ID} with customer intake PAUSED.`);
  } else {
    // Keep customer intake safely paused until hardware calibration
    await shopRef.update({
      manualPause: true,
      updatedAt: now
    });
    console.log(`[Shop Safety] Verified customer intake remains PAUSED on shops/${FIXED_SHOP_ID}.`);
  }

  // 6. Write Authoritative Shop Membership record
  const memberDocId = `${targetUid}_${FIXED_SHOP_ID}`;
  await db.collection('shopMembers').doc(memberDocId).set({
    userId: targetUid,
    shopId: FIXED_SHOP_ID,
    organizationId: FIXED_SHOP_ID,
    role: 'OWNER',
    status: 'ACTIVE',
    email: authUser.email || targetEmail,
    displayName: authUser.displayName || 'Shakeel Owner',
    assignedAt: now,
    updatedAt: now
  }, { merge: true });

  console.log(`\n[BOOTSTRAP COMPLETE] Successfully authorized OWNER membership: shopMembers/${memberDocId}`);
  console.log(`User ${targetUid} now has authorized dashboard access.`);
  console.log(`Customer intake remains PAUSED until printer hardware calibration.`);
}

runBootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Bootstrap FATAL Error]', err);
    process.exit(1);
  });
