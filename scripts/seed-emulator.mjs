import admin from 'firebase-admin';

// Configure environment for local emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 's2p-shakeel-dev';

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
  console.log('[S2P Seed] Starting admin development/emulator seed for Shakeel Online Services...');

  const ownerEmail = 'owner@shakeelprints.com';
  const ownerPassword = 'Shakeel@1234';
  let userUid = 'owner-shakeel-uid';

  try {
    const existing = await auth.getUserByEmail(ownerEmail);
    userUid = existing.uid;
    console.log('[S2P Seed] Owner user already exists in emulator, UID:', userUid);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        uid: userUid,
        email: ownerEmail,
        password: ownerPassword,
        displayName: 'Shakeel Owner'
      });
      userUid = created.uid;
      console.log('[S2P Seed] Created development owner user:', ownerEmail, 'UID:', userUid);
    } else {
      console.error('[S2P Seed] Auth lookup error:', err);
      throw err;
    }
  }

  const now = new Date().toISOString();
  const shopId = 'shakeel-online-services';
  const orgId = 'shakeel-online-services';

  // 1. Organization
  await db.collection('organizations').doc(orgId).set({
    name: 'Shakeel Online Services',
    slug: 'shakeel-online-services',
    status: 'ACTIVE',
    ownerId: userUid,
    createdAt: now,
    updatedAt: now
  });
  console.log('[S2P Seed] Seeded organization: organizations/' + orgId);

  // 2. Shop with full printOptions and upiConfig (Fail-closed compliant)
  await db.collection('shops').doc(shopId).set({
    organizationId: orgId,
    name: 'Shakeel Online Services',
    slug: shopId,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    status: 'ACTIVE',
    contactNumber: '+91 98765 43210',
    address: 'Main Market, Shakeel Online Services, India',
    upiConfig: {
      upiId: 'shakeel.online@upi',
      merchantName: 'Shakeel Online Services',
      isEnabled: true,
      isVerified: true
    },
    printOptions: {
      paperSizes: [
        { id: 'A4', label: 'A4 (210 × 297 mm)', enabled: true, sortOrder: 1 },
        { id: 'A3', label: 'A3 (297 × 420 mm)', enabled: true, sortOrder: 2 }
      ],
      paperTypes: [
        { id: 'NORMAL_75GSM', label: 'Standard 75 GSM', enabled: true, sortOrder: 1 },
        { id: 'BOND_85GSM', label: 'Bond 85 GSM', enabled: true, sortOrder: 2 },
        { id: 'GLOSSY_PHOTO', label: 'Glossy Photo Paper', enabled: true, sortOrder: 3 },
        { id: 'MATTE_PHOTO', label: 'Matte Photo Paper', enabled: true, sortOrder: 4 }
      ],
      colorModes: [
        { id: 'BW', label: 'Black & White', enabled: true, sortOrder: 1 },
        { id: 'COLOR', label: 'Full Color', enabled: true, sortOrder: 2 }
      ],
      duplexModes: [
        { id: 'SINGLE', label: 'Single-sided', enabled: true, sortOrder: 1 },
        { id: 'DOUBLE', label: 'Double-sided (Duplex)', enabled: true, sortOrder: 2 }
      ],
      orientations: [
        { id: 'AUTO', label: 'Auto (Recommended)', enabled: true, sortOrder: 1 },
        { id: 'PORTRAIT', label: 'Portrait', enabled: true, sortOrder: 2 },
        { id: 'LANDSCAPE', label: 'Landscape', enabled: true, sortOrder: 3 }
      ],
      scalings: [
        { id: 'FIT', label: 'Fit to Page', enabled: true, sortOrder: 1 },
        { id: 'ACTUAL_SIZE', label: 'Actual Size (100%)', enabled: true, sortOrder: 2 }
      ],
      finishingOptions: [
        { id: 'NONE', label: 'None', enabled: true, sortOrder: 1 },
        { id: 'SPIRAL_BINDING', label: 'Spiral Binding', enabled: true, sortOrder: 2 },
        { id: 'LAMINATION', label: 'Lamination', enabled: true, sortOrder: 3 }
      ]
    },
    settings: {
      allowGuestOrders: true,
      maxUploadSizeBytes: 52428800,
      autoQueuePaidOrders: false,
      requireCounterVerificationForUpi: true,
      retentionPolicy: {
        purgeFilesAfterPrint: true,
        successfulPrintRetentionSeconds: 60,
        unpaidOrderExpiryHours: 24
      }
    },
    createdAt: now,
    updatedAt: now
  });
  console.log('[S2P Seed] Seeded shop: shops/' + shopId);

  // 3. User Profile
  await db.collection('users').doc(userUid).set({
    displayName: 'Shakeel Owner',
    email: ownerEmail,
    role: 'OWNER',
    shopId: shopId,
    createdAt: now
  });
  console.log('[S2P Seed] Seeded user profile: users/' + userUid);

  // 4. Authoritative Shop Membership (Canonical doc: shopMembers/{userId}_{shopId})
  const memberDocId = userUid + '_' + shopId;
  await db.collection('shopMembers').doc(memberDocId).set({
    userId: userUid,
    organizationId: orgId,
    shopId: shopId,
    role: 'OWNER',
    status: 'ACTIVE',
    displayName: 'Shakeel Owner',
    email: ownerEmail,
    createdAt: now,
    updatedAt: now
  });
  console.log('[S2P Seed] Seeded canonical membership: shopMembers/' + memberDocId + ' (OWNER)');

  // 5. Configurable Services Catalog
  const services = [
    { code: 'DOCUMENT_PRINT', name: 'Document Print', description: 'Standard black & white and color document prints', category: 'PRINT', displayOrder: 1 },
    { code: 'BW_PRINT', name: 'Black & White Print', description: 'High-speed laser black and white prints', category: 'PRINT', displayOrder: 2 },
    { code: 'COLOR_PRINT', name: 'Color Print', description: 'Vibrant high-resolution color document printing', category: 'PRINT', displayOrder: 3 },
    { code: 'PHOTO_PRINT', name: 'Photo Print', description: 'Glossy photo prints on premium photo stock', category: 'PRINT', displayOrder: 4 },
    { code: 'SCAN', name: 'High-Resolution Scan', description: 'Digital scan to PDF/JPG format', category: 'SCAN', displayOrder: 5 },
    { code: 'XEROX_COPY', name: 'Xerox / Photocopy', description: 'Fast walk-in photocopy services', category: 'COPY', displayOrder: 6 },
    { code: 'SPIRAL_BINDING', name: 'Spiral Binding', description: 'Protective spiral binding with plastic sheet cover', category: 'FINISHING', displayOrder: 7 },
    { code: 'LAMINATION', name: 'Lamination', description: 'Hot pouch thermal lamination for certificates & cards', category: 'FINISHING', displayOrder: 8 },
  ];

  for (const s of services) {
    const serviceDocId = shopId + '_' + s.code.toLowerCase();
    await db.collection('services').doc(serviceDocId).set({
      id: serviceDocId,
      organizationId: orgId,
      shopId: shopId,
      code: s.code,
      name: s.name,
      description: s.description,
      category: s.category,
      enabled: true,
      displayOrder: s.displayOrder,
      publicVisible: true,
      createdAt: now,
      updatedAt: now
    });
  }
  console.log('[S2P Seed] Seeded ' + services.length + ' catalog services.');

  // 6. Paper Sizes
  const paperSizes = [
    { code: 'A4', displayName: 'A4 Standard (210 × 297 mm)', widthMm: 210, heightMm: 297, enabled: true, displayOrder: 1 },
    { code: 'A3', displayName: 'A3 Large (297 × 420 mm)', widthMm: 297, heightMm: 420, enabled: true, displayOrder: 2 }
  ];

  for (const ps of paperSizes) {
    const sizeDocId = shopId + '_' + ps.code.toLowerCase();
    await db.collection('paperSizes').doc(sizeDocId).set({
      id: sizeDocId,
      shopId: shopId,
      organizationId: orgId,
      ...ps
    });
  }
  console.log('[S2P Seed] Seeded ' + paperSizes.length + ' paper sizes.');

  // 7. Paper Types
  const paperTypes = [
    { code: 'NORMAL_70_GSM', name: 'Standard 70 GSM Copier Paper', gsm: 70, category: 'STANDARD', enabled: true },
    { code: 'NORMAL_80_GSM', name: 'Executive 80 GSM Bond Paper', gsm: 80, category: 'STANDARD', enabled: true }
  ];

  for (const pt of paperTypes) {
    const ptDocId = shopId + '_' + pt.code.toLowerCase();
    await db.collection('paperTypes').doc(ptDocId).set({
      id: ptDocId,
      shopId: shopId,
      organizationId: orgId,
      ...pt
    });
  }
  console.log('[S2P Seed] Seeded ' + paperTypes.length + ' paper types.');

  // 8. Finishing Options
  const finishingOptions = [
    { code: 'NONE', name: 'No Finishing', enabled: true, pricingType: 'FIXED', fixedPricePaise: 0 },
    { code: 'SPIRAL_BINDING', name: 'Spiral Binding (Plastic Sheet Cover)', enabled: true, pricingType: 'FIXED_PER_COPY', fixedPricePaise: 3500 },
    { code: 'LAMINATION', name: 'Thermal Pouch Lamination', enabled: true, pricingType: 'PER_SHEET', fixedPricePaise: 2000, perUnitChargePaise: 2000 }
  ];

  for (const fo of finishingOptions) {
    const foDocId = shopId + '_' + fo.code.toLowerCase();
    await db.collection('finishingOptions').doc(foDocId).set({
      id: foDocId,
      shopId: shopId,
      organizationId: orgId,
      ...fo
    });
  }
  console.log('[S2P Seed] Seeded ' + finishingOptions.length + ' finishing options.');

  // 9. Pricing Rules (INTEGER PAISE)
  const pricingRules = [
    {
      id: shopId + '_a4_bw_single',
      serviceCode: 'BW_PRINT',
      paperSizeCode: 'A4',
      printMode: 'BW',
      sideMode: 'SINGLE',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 200, // ₹2.00
      quantityTiers: [
        { minUnits: 1, maxUnits: 20, unitPricePaise: 200 },
        { minUnits: 21, maxUnits: 100, unitPricePaise: 180 },
        { minUnits: 101, unitPricePaise: 150 }
      ],
      enabled: true
    },
    {
      id: shopId + '_a4_bw_duplex',
      serviceCode: 'BW_PRINT',
      paperSizeCode: 'A4',
      printMode: 'BW',
      sideMode: 'DUPLEX',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 150, // ₹1.50 per side
      enabled: true
    },
    {
      id: shopId + '_a4_color_single',
      serviceCode: 'COLOR_PRINT',
      paperSizeCode: 'A4',
      printMode: 'COLOR',
      sideMode: 'SINGLE',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 1000, // ₹10.00
      enabled: true
    },
    {
      id: shopId + '_a4_color_duplex',
      serviceCode: 'COLOR_PRINT',
      paperSizeCode: 'A4',
      printMode: 'COLOR',
      sideMode: 'DUPLEX',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 900, // ₹9.00 per side
      enabled: true
    },
    {
      id: shopId + '_a3_bw_single',
      serviceCode: 'BW_PRINT',
      paperSizeCode: 'A3',
      printMode: 'BW',
      sideMode: 'SINGLE',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 1000, // ₹10.00
      enabled: true
    },
    {
      id: shopId + '_a3_bw_duplex',
      serviceCode: 'BW_PRINT',
      paperSizeCode: 'A3',
      printMode: 'BW',
      sideMode: 'DUPLEX',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 750, // ₹7.50 per side
      enabled: true
    },
    {
      id: shopId + '_a3_color_single',
      serviceCode: 'COLOR_PRINT',
      paperSizeCode: 'A3',
      printMode: 'COLOR',
      sideMode: 'SINGLE',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 2500, // ₹25.00
      enabled: true
    },
    {
      id: shopId + '_a3_color_duplex',
      serviceCode: 'COLOR_PRINT',
      paperSizeCode: 'A3',
      printMode: 'COLOR',
      sideMode: 'DUPLEX',
      billingUnit: 'PER_PRINTED_SIDE',
      unitPricePaise: 2000, // ₹20.00 per side
      enabled: true
    }
  ];

  for (const pr of pricingRules) {
    await db.collection('pricingRules').doc(pr.id).set({
      ...pr,
      shopId,
      organizationId: orgId,
      createdAt: now,
      updatedAt: now,
      createdBy: userUid
    });
  }
  console.log('[S2P Seed] Seeded ' + pricingRules.length + ' pricing rules in integer paise.');

  // 10. Shop Pricing Settings
  await db.collection('shopPricingSettings').doc(shopId).set({
    shopId,
    organizationId: orgId,
    minimumOrderPaise: 500, // ₹5.00 minimum
    taxEnabled: false,
    taxName: 'GST',
    taxRateBasisPoints: 0,
    pricesIncludeTax: false,
    currency: 'INR',
    updatedAt: now
  });
  console.log('[S2P Seed] Seeded shop pricing settings: shopPricingSettings/' + shopId);

  console.log('[S2P Seed] Firebase Emulator Seeding Complete! Shakeel Online Services tenant ready.');
  process.exit(0);
}

seed().catch((e) => {
  console.error('[S2P Seed] Fatal error:', e);
  process.exit(1);
});
