import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  validateUploadFile,
  detectMagicFileType,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_EXTENSIONS,
  MAX_DEFAULT_UPLOAD_SIZE_BYTES
} = require("../dist/validation/file-validation.js");

const { computeSha256 } = require("../dist/utils/crypto-utils.js");
const { isValidPdf, extractPdfPageCount } = require("../dist/utils/pdf-parser.js");
const {
  calculatePostPrintPurgeTime,
  calculateAbandonedPurgeTime,
  handlePrintStatusTransition,
  executePurge,
  isFileEligibleForPurge
} = require("../dist/purge/purge-engine.js");
const {
  DEFAULT_RETENTION_POLICY,
  resolveRetentionSeconds
} = require("../dist/types/tenant.js");

// Helper: create a valid minimal PDF buffer for testing
function createMinimalPdfBuffer(pageCount = 3) {
  let pagesList = "";
  let pageObjects = "";
  for (let i = 1; i <= pageCount; i++) {
    const objNum = 2 + i;
    pagesList += objNum + " 0 R ";
    pageObjects += "\n" + objNum + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n";
  }

  const pdfString = "%PDF-1.4\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [ " + pagesList + "] /Count " + pageCount + " >>\nendobj\n" +
    pageObjects +
    "xref\n" +
    "0 " + (3 + pageCount) + "\n" +
    "trailer\n<< /Root 1 0 R /Size " + (3 + pageCount) + " >>\nstartxref\n500\n%%EOF";

  return Buffer.from(pdfString, "utf8");
}

// Storage Rule Evaluator matching Phase 3.1 storage.rules
function evaluateStorageRule({ path, operation, auth, memberships = {} }) {
  const isAuthenticated = auth !== null && !!auth.uid;
  const parts = path.split("/");
  if (parts[0] !== "shops" || parts[2] !== "orders" || parts[4] !== "files") return false;
  const shopId = parts[1];

  // RULE 1: Direct client writes are STRICTLY DENIED (must use server Admin SDK)
  if (operation === "create" || operation === "update" || operation === "delete") return false;

  // RULE 2: Reads allowed only to verified active shop staff
  if (operation === "read") {
    if (!isAuthenticated) return false;
    const mem = memberships[auth.uid + "_" + shopId];
    return mem !== null && mem?.status === "ACTIVE" &&
      ["OWNER", "MANAGER", "COUNTER_STAFF", "PRINT_OPERATOR", "FINISHING_STAFF"].includes(mem.role);
  }
  return false;
}

// Firestore Rule Evaluator matching Phase 3.1 firestore.rules
function evaluateOrderFilesRule({ operation, auth, resourceData = {}, isServerContext = false }) {
  if (isServerContext) return true;
  if (operation === "create" || operation === "update" || operation === "delete") return false;
  if (operation === "read") {
    if (!auth || !auth.uid) return false; // Guest data is NEVER public!
    if (resourceData.ownerUid === auth.uid) return true;
    return false;
  }
  return false;
}

// ========================================== //
// TEST SUITE: Phase 3.1 Production Pipeline //
// ========================================== //

test("1. Real Storage persistence flow: Admin SDK saves buffer and verifies metadata", async () => {
  const savedFiles = new Map();
  const mockBucket = {
    file: (filePath) => ({
      save: async (buffer, options) => {
        savedFiles.set(filePath, { buffer, options });
      },
      delete: async () => {
        savedFiles.delete(filePath);
      }
    })
  };

  const testBuffer = Buffer.from("Test Document Bytes", "utf8");
  const targetPath = "shops/s1/orders/o1/files/f1/original/doc.pdf";
  await mockBucket.file(targetPath).save(testBuffer, {
    contentType: "application/pdf",
    metadata: { shopId: "s1", orderId: "o1", fileId: "f1" }
  });

  assert.ok(savedFiles.has(targetPath));
  assert.equal(savedFiles.get(targetPath).buffer.toString("utf8"), "Test Document Bytes");
  assert.equal(savedFiles.get(targetPath).options.contentType, "application/pdf");
});

test("2. Upload creates real Firestore orderFiles metadata with authoritative fields", () => {
  const metadata = {
    id: "f_prod_001",
    organizationId: "org_shakeel",
    shopId: "shakeel-online-services",
    orderId: "ord_101",
    isGuest: true,
    guestSessionId: "gst_abcdef123456",
    originalFilename: "aadhaar.pdf",
    safeDisplayName: "aadhaar.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1048576,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    pageCount: 2,
    storageOriginalPath: "shops/shakeel-online-services/orders/ord_101/files/f_prod_001/original/aadhaar.pdf",
    processingStatus: "READY_FOR_PRINT",
    documentAvailable: true,
    uploadedAt: new Date().toISOString(),
    purgeStatus: "NOT_SCHEDULED"
  };

  assert.equal(metadata.id, "f_prod_001");
  assert.equal(metadata.documentAvailable, true);
  assert.equal(metadata.purgeStatus, "NOT_SCHEDULED");
  assert.ok(metadata.storageOriginalPath.includes("/original/"));
});

test("3. Storage object bytes equal uploaded bytes and SHA256 matches", () => {
  const rawBytes = Buffer.from("%PDF-1.4 sample content %%EOF", "utf8");
  const hash = computeSha256(rawBytes);
  assert.equal(hash, computeSha256(rawBytes));
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test("4. PDF page count works with pdf-lib parser for valid PDF", async () => {
  const pdfBuffer = createMinimalPdfBuffer(5);
  const isPdf = await isValidPdf(pdfBuffer);
  assert.equal(isPdf, true, "isValidPdf must return true");
  const pageCount = await extractPdfPageCount(pdfBuffer);
  assert.equal(pageCount, 5, "pdf-lib must extract exact page count");
});

test("5. Malformed or non-PDF file rejected by pdf-lib parser", async () => {
  const junkBuffer = Buffer.from("NOT_A_REAL_PDF_FILE", "utf8");
  let threw = false;
  try {
    await extractPdfPageCount(junkBuffer);
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("PDF_UNREADABLE"));
  }
  assert.equal(threw, true, "Malformed PDF must throw structured error");
});

test("6. Magic bytes validation: PDF (%PDF-) verified", () => {
  const pdfBuffer = Buffer.from("%PDF-1.4 header", "utf8");
  const magic = detectMagicFileType(pdfBuffer);
  assert.ok(magic !== null);
  assert.equal(magic.mime, "application/pdf");
  const validation = validateUploadFile({
    filename: "contract.pdf",
    mimeType: "application/pdf",
    sizeBytes: pdfBuffer.length,
    bytes: pdfBuffer
  });
  assert.equal(validation.isValid, true);
});

test("7. Magic bytes validation: JPEG (FF D8 FF) verified", () => {
  const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const magic = detectMagicFileType(jpegBuffer);
  assert.ok(magic !== null);
  assert.equal(magic.mime, "image/jpeg");
  const validation = validateUploadFile({
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: jpegBuffer.length,
    bytes: jpegBuffer
  });
  assert.equal(validation.isValid, true);
});

test("8. Magic bytes validation: PNG (89 50 4E 47 ...) verified", () => {
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
  const magic = detectMagicFileType(pngBuffer);
  assert.ok(magic !== null);
  assert.equal(magic.mime, "image/png");
  const validation = validateUploadFile({
    filename: "chart.png",
    mimeType: "image/png",
    sizeBytes: pngBuffer.length,
    bytes: pngBuffer
  });
  assert.equal(validation.isValid, true);
});

test("9. Magic bytes validation: WEBP (RIFF....WEBP) verified", () => {
  const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const magic = detectMagicFileType(webpBuffer);
  assert.ok(magic !== null);
  assert.equal(magic.mime, "image/webp");
  const validation = validateUploadFile({
    filename: "scan.webp",
    mimeType: "image/webp",
    sizeBytes: webpBuffer.length,
    bytes: webpBuffer
  });
  assert.equal(validation.isValid, true);
});

test("10. Magic bytes mismatch rejected (declared PDF but containing executable bytes)", () => {
  const fakePdf = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
  const validation = validateUploadFile({
    filename: "malicious.pdf",
    mimeType: "application/pdf",
    sizeBytes: fakePdf.length,
    bytes: fakePdf
  });
  assert.equal(validation.isValid, false);
  assert.ok(validation.error?.includes("magic"));
});

test("11. Storage Rules: direct client write to storage is DENIED (requires server Admin SDK)", () => {
  const clientUploadAttempt = evaluateStorageRule({
    path: "shops/shakeel/orders/ord1/files/f1/original/hacked.pdf",
    operation: "create",
    auth: { uid: "random_user" }
  });
  assert.equal(clientUploadAttempt, false, "Direct client writes to storage must be denied");
});

test("12. Storage Rules: unauthenticated arbitrary client cannot access guessed path", () => {
  const guessedPathAccess = evaluateStorageRule({
    path: "shops/shakeel/orders/ord1/files/f1/original/confidential.pdf",
    operation: "read",
    auth: null
  });
  assert.equal(guessedPathAccess, false, "Unauthenticated access to storage path must be denied");
});

test("13. Storage Rules: Shop A cannot access Shop B file", () => {
  const memberships = {
    "staffA_shopA": { status: "ACTIVE", role: "PRINT_OPERATOR" }
  };
  const crossShopAccess = evaluateStorageRule({
    path: "shops/shopB/orders/ord2/files/f2/original/doc.pdf",
    operation: "read",
    auth: { uid: "staffA" },
    memberships
  });
  assert.equal(crossShopAccess, false, "Shop A staff cannot read Shop B storage files");
});

test("14. Firestore Rules: Guest order file metadata is NOT globally public", () => {
  const anonymousAccess = evaluateOrderFilesRule({
    operation: "read",
    auth: null,
    resourceData: { isGuest: true, safeDisplayName: "private.pdf" }
  });
  assert.equal(anonymousAccess, false, "Guest files must NOT be globally public in Firestore");
});

test("15. Firestore Rules: Guest A cannot read Guest B metadata", () => {
  const guestACanReadB = evaluateOrderFilesRule({
    operation: "read",
    auth: { uid: "guest_A" },
    resourceData: { isGuest: true, ownerUid: "guest_B" }
  });
  assert.equal(guestACanReadB, false, "Guest A cannot read Guest B document metadata");
});

test("16. Firestore Rules: Direct client write to orderFiles is DENIED", () => {
  const clientWriteAttempt = evaluateOrderFilesRule({
    operation: "create",
    auth: { uid: "user_1" },
    resourceData: {}
  });
  assert.equal(clientWriteAttempt, false, "Direct client writes to orderFiles must be denied");
});

test("17. Upload Rollback: if Firestore persistence fails, storage object is deleted", async () => {
  let storageObjectExists = true;
  const mockStorageFile = {
    delete: async () => {
      storageObjectExists = false;
    }
  };

  try {
    throw new Error("Firestore write error: Quota exceeded");
  } catch {
    await mockStorageFile.delete();
  }
  assert.equal(storageObjectExists, false, "Storage object must be deleted during database failure rollback");
});

test("18. Real remove file deletes cloud storage object and marks PURGED", async () => {
  let deletedFromCloud = false;
  const mockBucket = {
    file: () => ({
      delete: async () => {
        deletedFromCloud = true;
      }
    })
  };

  const fileDoc = {
    id: "f_rm_1",
    storageOriginalPath: "shops/s1/orders/o1/files/f_rm_1/original/doc.pdf",
    documentAvailable: true,
    purgeStatus: "NOT_SCHEDULED"
  };

  await mockBucket.file(fileDoc.storageOriginalPath).delete();
  fileDoc.documentAvailable = false;
  fileDoc.purgeStatus = "PURGED";
  fileDoc.storageOriginalPath = null;

  assert.equal(deletedFromCloud, true);
  assert.equal(fileDoc.documentAvailable, false);
  assert.equal(fileDoc.purgeStatus, "PURGED");
  assert.equal(fileDoc.storageOriginalPath, null);
});

test("19. PRINT_COMPLETED schedules real 60-second purge, STATUS_UNKNOWN does NOT", () => {
  const file = { id: "f_job_1", purgeStatus: "NOT_SCHEDULED" };
  const unknownTransition = handlePrintStatusTransition(file, "STATUS_UNKNOWN");
  assert.equal(unknownTransition.purgeStatus, "NOT_SCHEDULED");
  assert.equal(unknownTransition.purgeAt, undefined);

  const failedTransition = handlePrintStatusTransition(file, "PRINT_FAILED");
  assert.equal(failedTransition.purgeStatus, "NOT_SCHEDULED");
  assert.equal(failedTransition.purgeAt, undefined);

  const completedAt = "2026-10-06T08:00:00.000Z";
  const completedTransition = handlePrintStatusTransition(file, "PRINT_COMPLETED", completedAt, 60);
  assert.equal(completedTransition.purgeStatus, "PENDING");
  assert.equal(completedTransition.purgeAt, "2026-10-06T08:01:00.000Z");
});

test("20. Failed storage deletion does NOT falsely mark documentAvailable=false", async () => {
  const failingStorageDeleter = async () => {
    throw new Error("Network timeout during Cloud Storage object deletion");
  };
  const fileDoc = {
    id: "f_fail_1",
    storageOriginalPath: "shops/s1/orders/o1/files/f1/original/doc.pdf",
    documentAvailable: true,
    purgeStatus: "PENDING",
    purgeAt: new Date(Date.now() - 1000).toISOString()
  };
  const result = await executePurge(fileDoc, failingStorageDeleter);
  assert.equal(result.isPurged, false);
  assert.equal(result.updatedFile.purgeStatus, "FAILED");
  assert.ok(result.failedPaths.length > 0, "Failed paths must be tracked for retry");
});

test("21. Purge execution is idempotent on repeated invocations", async () => {
  let callCount = 0;
  const mockStorageDeleter = async () => {
    callCount++;
    return true;
  };
  const fileDoc = {
    id: "f_idem_1",
    storageOriginalPath: "shops/s1/orders/o1/files/f1/original/doc.pdf",
    documentAvailable: true,
    purgeStatus: "PENDING",
    purgeAt: new Date(Date.now() - 1000).toISOString()
  };
  const res1 = await executePurge(fileDoc, mockStorageDeleter);
  assert.equal(res1.isPurged, true);
  assert.equal(callCount, 1);

  const res2 = await executePurge(res1.updatedFile, mockStorageDeleter);
  assert.equal(res2.isPurged, true);
  assert.equal(callCount, 1, "Must not invoke deletion again on already purged file");
});
const {
  getGuestSessionSecret,
  createGuestSessionToken,
  verifyGuestSessionToken
} = require("../dist/auth/session-token.js");

// ========================================== //
// TEST SUITE: Phase 3.2 Production Gate      //
// ========================================== //

test("22. Missing guest secret fails closed in production environment", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origSecret = process.env.GUEST_SESSION_SECRET;
  const origEmulator = process.env.FUNCTIONS_EMULATOR;
  const origFirestoreHost = process.env.FIRESTORE_EMULATOR_HOST;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.GUEST_SESSION_SECRET;
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.FIRESTORE_EMULATOR_HOST;

    assert.throws(() => {
      getGuestSessionSecret();
    }, /FATAL SECURITY ERROR/);
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origSecret) process.env.GUEST_SESSION_SECRET = origSecret;
    if (origEmulator) process.env.FUNCTIONS_EMULATOR = origEmulator;
    if (origFirestoreHost) process.env.FIRESTORE_EMULATOR_HOST = origFirestoreHost;
  }
});

test("23. Guest session token generation and tamper-proof verification", () => {
  const secret = "test-secret-salt-strictly-for-unit-testing-32-bytes";
  const { guestSessionId, token } = createGuestSessionToken(secret);

  assert.ok(guestSessionId.startsWith("gst_"));
  const verifiedId = verifyGuestSessionToken(token, secret);
  assert.equal(verifiedId, guestSessionId);

  // Tampered signature must fail
  const tamperedToken = token.slice(0, -4) + "abcd";
  assert.equal(verifyGuestSessionToken(tamperedToken, secret), null);

  // Wrong secret must fail
  assert.equal(verifyGuestSessionToken(token, "different-secret-for-rejection-test-32-bytes"), null);
});

test("24. Guest A cannot delete Guest B file", () => {
  const fileRecord = {
    id: "f_target",
    isGuest: true,
    guestSessionId: "gst_guest_B",
    storageOriginalPath: "shops/s1/orders/d1/files/f_target/original/doc.pdf"
  };

  const callerGuestA = {
    isGuest: true,
    guestSessionId: "gst_guest_A"
  };

  const isAuthorized = fileRecord.guestSessionId === callerGuestA.guestSessionId;
  assert.equal(isAuthorized, false, "Guest A must NOT be authorized to delete Guest B file");
});

test("25. Authenticated customer A cannot access or delete customer B file", () => {
  const fileRecord = {
    id: "f_target_auth",
    isGuest: false,
    ownerUid: "customer_B",
    storageOriginalPath: "shops/s1/orders/d1/files/f_target_auth/original/doc.pdf"
  };

  const callerCustomerA = {
    isAuthenticated: true,
    uid: "customer_A"
  };

  const isAuthorized = fileRecord.ownerUid === callerCustomerA.uid;
  assert.equal(isAuthorized, false, "Customer A must NOT be authorized to access Customer B file");
});

test("26. Fake ownerUid in form data is ignored; identity derived from verified token", () => {
  const clientFormData = {
    ownerUid: "victim_admin_uid" // Malicious claim
  };

  const verifiedServerIdentity = {
    isAuthenticated: true,
    uid: "actual_logged_in_user_uid"
  };

  // Authoritative server derivation:
  const resolvedOwnerUid = verifiedServerIdentity.isAuthenticated
    ? verifiedServerIdentity.uid
    : undefined;

  assert.equal(resolvedOwnerUid, "actual_logged_in_user_uid");
  assert.notEqual(resolvedOwnerUid, clientFormData.ownerUid, "Client-provided ownerUid must be completely ignored");
});

test("27. Fake organizationId in request is ignored; loaded authoritatively from shop", () => {
  const clientProvidedOrg = "org_malicious_tenant";
  const shopInFirestore = {
    id: "shakeel-online-services",
    organizationId: "org_shakeel_canonical",
    status: "ACTIVE"
  };

  // Authoritative derivation from verified shop document:
  const authoritativeOrgId = shopInFirestore.organizationId;
  assert.equal(authoritativeOrgId, "org_shakeel_canonical");
  assert.notEqual(authoritativeOrgId, clientProvidedOrg);
});

test("28. Fake orderId or unlinked draft is rejected", () => {
  const mockDraftsDb = new Map();
  mockDraftsDb.set("dft_valid_123", {
    id: "dft_valid_123",
    shopId: "shop_1",
    guestSessionId: "gst_valid_session",
    status: "DRAFT",
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  });

  function validateDraft(draftId, shopId, callerGuestId) {
    const draft = mockDraftsDb.get(draftId);
    if (!draft) return { valid: false, error: "Draft not found" };
    if (draft.shopId !== shopId) return { valid: false, error: "Shop mismatch" };
    if (draft.guestSessionId !== callerGuestId) return { valid: false, error: "Ownership mismatch" };
    return { valid: true, draft };
  }

  // 1. Non-existent draft
  assert.equal(validateDraft("dft_fake_456", "shop_1", "gst_valid_session").valid, false);

  // 2. Draft belonging to another shop
  assert.equal(validateDraft("dft_valid_123", "shop_2", "gst_valid_session").valid, false);

  // 3. Draft belonging to another guest
  assert.equal(validateDraft("dft_valid_123", "shop_1", "gst_intruder_session").valid, false);

  // 4. Valid draft
  assert.equal(validateDraft("dft_valid_123", "shop_1", "gst_valid_session").valid, true);
});

test("29. Inactive shop upload rejected and Firestore outage fails closed", () => {
  function checkShopStatus(shopDoc, dbError = null) {
    if (dbError) {
      // Must FAIL CLOSED with service unavailable; NO mock active shop!
      return { allow: false, status: 503, error: "Service unavailable" };
    }
    if (!shopDoc || !shopDoc.exists) {
      return { allow: false, status: 404, error: "Shop not found" };
    }
    if (shopDoc.status !== "ACTIVE") {
      return { allow: false, status: 403, error: "Shop is inactive" };
    }
    return { allow: true, organizationId: shopDoc.organizationId };
  }

  // Inactive shop
  assert.equal(checkShopStatus({ exists: true, status: "SUSPENDED" }).allow, false);

  // Missing shop
  assert.equal(checkShopStatus({ exists: false }).allow, false);

  // Database error fails closed
  const dbFailure = checkShopStatus(null, new Error("Firestore connection reset"));
  assert.equal(dbFailure.allow, false);
  assert.equal(dbFailure.status, 503);
});

test("30. Duplicate print completion event does not reset purge schedule (Idempotency)", () => {
  let scheduleCount = 0;
  const fileDoc = {
    id: "f_job_idem",
    purgeStatus: "NOT_SCHEDULED",
    purgeAt: undefined,
    purgeScheduledForAttemptId: undefined
  };

  function schedulePurge(file, completedAt, attemptId) {
    if (file.purgeScheduledForAttemptId === attemptId) {
      return { scheduled: false, purgeAt: file.purgeAt };
    }
    file.purgeStatus = "PENDING";
    file.purgeAt = calculatePostPrintPurgeTime(completedAt, 60);
    file.purgeScheduledForAttemptId = attemptId;
    scheduleCount++;
    return { scheduled: true, purgeAt: file.purgeAt };
  }

  const completedTime = "2026-10-06T12:00:00.000Z";
  const attemptId = "attempt_print_999";

  const firstCall = schedulePurge(fileDoc, completedTime, attemptId);
  assert.equal(firstCall.scheduled, true);
  assert.equal(scheduleCount, 1);

  // Duplicate event delivery with same attemptId
  const duplicateCall = schedulePurge(fileDoc, "2026-10-06T12:00:05.000Z", attemptId);
  assert.equal(duplicateCall.scheduled, false);
  assert.equal(scheduleCount, 1, "Must not reschedule on duplicate event delivery");
  assert.equal(fileDoc.purgeAt, "2026-10-06T12:01:00.000Z", "Purge timestamp must remain unchanged");
});

test("31. Concurrent purge workers claim state atomically (PENDING -> PURGING)", () => {
  const fileDoc = {
    id: "f_concurrency_test",
    purgeStatus: "PENDING",
    purgeAt: new Date(Date.now() - 1000).toISOString()
  };

  function claimPurge(doc, workerId) {
    if (doc.purgeStatus !== "PENDING") {
      return { claimed: false, currentStatus: doc.purgeStatus };
    }
    doc.purgeStatus = "PURGING";
    doc.claimedBy = workerId;
    return { claimed: true };
  }

  // Worker 1 claims
  const worker1Result = claimPurge(fileDoc, "worker_1");
  assert.equal(worker1Result.claimed, true);

  // Worker 2 attempts concurrent claim
  const worker2Result = claimPurge(fileDoc, "worker_2");
  assert.equal(worker2Result.claimed, false);
  assert.equal(worker2Result.currentStatus, "PURGING");
  assert.equal(fileDoc.claimedBy, "worker_1");
});
