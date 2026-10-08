/**
 * SOS Print — Secure Owner Bootstrap Script
 * Assigns authoritative OWNER role in Firestore for Shakeel Online Services.
 *
 * Usage:
 *   node scripts/bootstrap-owner.mjs <OWNER_FIREBASE_UID> <OWNER_EMAIL>
 *
 * Prerequisites:
 *   Requires standard FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY
 *   environment variables or local Firebase emulator.
 */

import admin from 'firebase-admin';

const ownerUid = process.argv[2];
const ownerEmail = process.argv[3];

if (!ownerUid) {
  console.error('[Error] Please supply the Firebase Auth UID:');
  console.error('  node scripts/bootstrap-owner.mjs <UID> <EMAIL>');
  process.exit(1);
}

const shopId = 'shakeel-online-services';
const orgId = 'shakeel-online-services';
const now = new Date().toISOString();

// Initialize Admin SDK
if (admin.apps.length === 0) {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'shakeel-online-services',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  } else {
    // Falls back to local emulator or default ADC
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'shakeel-online-services'
    });
  }
}

const db = admin.firestore();

async function bootstrapOwner() {
  console.log(`[Bootstrap] Bootstrapping owner for shop: ${shopId}...`);
  console.log(`[Bootstrap] UID: ${ownerUid}`);
  console.log(`[Bootstrap] Email: ${ownerEmail || '(unspecified)'}`);

  // 1. Ensure Shop metadata exists
  const shopRef = db.collection('shops').doc(shopId);
  const shopSnap = await shopRef.get();
  if (!shopSnap.exists) {
    await shopRef.set({
      id: shopId,
      name: 'Shakeel Online Services',
      slug: shopId,
      organizationId: orgId,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    console.log(`[Bootstrap] Initialized shop document: shops/${shopId}`);
  }

  // 2. Write authoritative shop membership (FAIL-CLOSED target)
  const memberDocId = `${ownerUid}_${shopId}`;
  await db.collection('shopMembers').doc(memberDocId).set({
    userId: ownerUid,
    shopId: shopId,
    organizationId: orgId,
    role: 'OWNER',
    status: 'ACTIVE',
    email: ownerEmail || '',
    displayName: 'Shop Owner',
    assignedAt: now,
    updatedAt: now
  }, { merge: true });

  console.log(`[Bootstrap SUCCESS] Written authoritative OWNER membership: shopMembers/${memberDocId}`);
  console.log(`[Bootstrap SUCCESS] User ${ownerUid} is now authorized as OWNER for Shakeel Online Services.`);
}

bootstrapOwner()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Bootstrap FAILED]', err);
    process.exit(1);
  });
