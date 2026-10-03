import fs from "fs";

const BASE_URL = process.env.VINTHA_SERVER_URL || "http://localhost:3000";

async function runTest() {
  console.log("===============================================================");
  console.log("       VINTHA PRINT - FULL FREE WORKFLOW E2E TEST SUITE        ");
  console.log("===============================================================\n");

  const results = [];
  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? "- " + details : ""}`);
      results.push({ name: testName, pass: true });
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? "- " + details : ""}`);
      results.push({ name: testName, pass: false, error: details });
      throw new Error(`Assertion failed: ${testName} - ${details}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Step 1: Shop Registration & Free Account Creation
    // -------------------------------------------------------------
    console.log("--- Step 1: Shop Registration (100% Free Account) ---");
    const testSlug = `sai-balaji-${Date.now().toString(36)}`;
    const regRes = await fetch(`${BASE_URL}/api/shops/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: "Sai Balaji Free Print Zone",
        slug: testSlug,
        mobile: "9876543210",
        address: "Shop 12, Metro Plaza, Sector 18",
        businessCategory: "Photocopy & Digital Print",
      }),
    });

    const regData = await regRes.json();
    assert(regData.success, "1. Shop Account Registered", `Shop: ${regData.shop?.name} (${regData.shop?.id})`);
    const shop = regData.shop;
    const shopId = shop.id;

    // -------------------------------------------------------------
    // Step 2: Unique QR Code & Shop Lookup
    // -------------------------------------------------------------
    console.log("\n--- Step 2: Verify Shop QR Code & Poster Link ---");
    const lookupRes = await fetch(`${BASE_URL}/api/shops/lookup?slug=${shop.slug}`);
    const lookupData = await lookupRes.json();
    assert(lookupData.success, "2. Customer can resolve Shop from QR URL", `URL: /shop/${shop.slug}`);

    // -------------------------------------------------------------
    // Step 3: Pairing Windows Print Agent
    // -------------------------------------------------------------
    console.log("\n--- Step 3: Pairing Windows Print Agent with 6-digit Code ---");
    // Generate pairing code from dashboard
    const pairCodeRes = await fetch(`${BASE_URL}/api/agent/pair?shopId=${shopId}`, {
      method: "GET",
      headers: { "x-shop-id": shopId },
    });
    const pairCodeData = await pairCodeRes.json();
    const pairCode = pairCodeData.pairingCode || pairCodeData.code;
    assert(pairCodeData.success && pairCode, "3.1 Generated 6-digit Pairing Code", `Code: ${pairCode}`);

    // Windows Agent submits pairing request
    const pairAgentRes = await fetch(`${BASE_URL}/api/agent/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairingCode: pairCode,
        computerName: "SHOP-COUNTER-PC-01",
        osInfo: "Windows 11 Pro 64-bit",
        agentVersion: "1.0.0",
      }),
    });
    const pairAgentData = await pairAgentRes.json();
    assert(pairAgentData.success && pairAgentData.deviceToken, "3.2 Agent Paired Successfully", `Device: ${pairAgentData.deviceId}`);
    const deviceToken = pairAgentData.deviceToken;
    const deviceId = pairAgentData.deviceId;

    // Agent sends heartbeat reporting selected printer
    const selectedPrinter = "HP51C8E5 (HP Smart Tank 580-590 series)";
    const heartbeatRes = await fetch(`${BASE_URL}/api/agent/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        printerName: selectedPrinter,
        isVirtual: false,
        status: "ONLINE",
      }),
    });
    const hbData = await heartbeatRes.json();
    assert(hbData.success, "3.3 Agent Heartbeat & Hardware Reported", `Printer: ${selectedPrinter}`);

    // Verify dashboard/customer sees agent online
    const lookupAgentRes = await fetch(`${BASE_URL}/api/shops/lookup?shopId=${shopId}`);
    const lookupAgentData = await lookupAgentRes.json();
    assert(lookupAgentData.shop?.agent?.isOnline === true, "3.4 Dashboard shows 'Agent Online' and Hardware Connected");

    // -------------------------------------------------------------
    // Step 4: Customer Upload & Submission (Automatic Mode)
    // -------------------------------------------------------------
    console.log("\n--- Step 4: Customer Mobile Upload & Submission (Automatic Mode) ---");
    // Create multipart FormData upload
    const mockPdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000118 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n160\n%%EOF";
    const blob = new Blob([mockPdfContent], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", blob, "FreeAssignment.pdf");
    formData.append("shopId", shopId);
    formData.append("pageCount", "4");

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success && uploadData.upload?.id, "4.1 Document Uploaded by Customer", `UploadId: ${uploadData.upload?.id}`);
    const uploadId = uploadData.upload.id;

    // Submit print order (100% Free)
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: shopId,
        uploadId: uploadId,
        customerName: "Vikas Mehra",
        customerMobile: "9876500000",
        copies: 2,
        colorMode: "bw",
        isDuplex: true,
        paperSize: "A4",
      }),
    });
    const orderData = await orderRes.json();
    assert(orderData.success && orderData.order?.id, "4.2 Free Order Created", `OrderId: ${orderData.order?.id}, Status: ${orderData.order?.status}`);
    assert(orderData.order.status === "QUEUED", "4.3 Order is automatically QUEUED for instant printing");
    const orderId1 = orderData.order.id;

    // -------------------------------------------------------------
    // Step 5: Windows Agent Polls, Claims & Prints Job
    // -------------------------------------------------------------
    console.log("\n--- Step 5: Agent Polls, Claims and Executes Print Job ---");
    const pollRes = await fetch(`${BASE_URL}/api/agent/poll`, {
      method: "GET",
      headers: {
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
    });
    const pollData = await pollRes.json();
    assert(pollData.success && pollData.job?.orderId === orderId1, "5.1 Agent Claimed Queued Print Job", `JobId: ${pollData.job?.id}`);
    const jobId1 = pollData.job.id;

    // Agent reports PRINTING
    const statusRes1 = await fetch(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        printJobId: jobId1,
        status: "PRINTING",
      }),
    });
    assert((await statusRes1.json()).success, "5.2 Agent reported PRINTING status");

    // Agent reports COMPLETED
    const statusRes2 = await fetch(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        printJobId: jobId1,
        status: "COMPLETED",
      }),
    });
    assert((await statusRes2.json()).success, "5.3 Agent reported COMPLETED status");

    // Customer checks tracking status
    const trackRes = await fetch(`${BASE_URL}/api/orders/${orderId1}`);
    const trackData = await trackRes.json();
    assert(trackData.order?.status === "COMPLETED", "5.4 Customer Live Tracking Confirms COMPLETED 🎉");

    // -------------------------------------------------------------
    // Step 6: Settings - Owner-Approval Mode Test
    // -------------------------------------------------------------
    console.log("\n--- Step 6: Testing Owner-Approval Mode in Settings ---");
    // Switch shop to manualApprovalMode = true
    const settingsUpdateRes = await fetch(`${BASE_URL}/api/shops/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shop-id": shopId,
      },
      body: JSON.stringify({
        shopId: shopId,
        manualApprovalMode: true,
        autoPrintEnabled: false,
      }),
    });
    const settingsData = await settingsUpdateRes.json();
    assert(settingsData.success && settingsData.settings?.manualApprovalMode === true, "6.1 Switched to Owner-Approval Mode in Settings");

    // Customer uploads second file
    const formData2 = new FormData();
    formData2.append("file", blob, "ImportantContract.pdf");
    formData2.append("shopId", shopId);
    formData2.append("pageCount", "2");

    const uploadRes2 = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData2,
    });
    const uploadData2 = await uploadRes2.json();

    const orderRes2 = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: shopId,
        uploadId: uploadData2.upload.id,
        customerName: "Neha Patel",
        copies: 1,
        colorMode: "color",
        paperSize: "A4",
      }),
    });
    const orderData2 = await orderRes2.json();
    assert(orderData2.order?.status === "PENDING_APPROVAL", "6.2 New Order stays in PENDING_APPROVAL", `OrderId: ${orderData2.order?.id}`);
    const orderId2 = orderData2.order.id;

    // Agent polls: should receive NO job because it is waiting for approval
    const pollResBlocked = await fetch(`${BASE_URL}/api/agent/poll`, {
      method: "GET",
      headers: {
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
    });
    const pollDataBlocked = await pollResBlocked.json();
    assert(pollDataBlocked.job === null, "6.3 Agent received 0 jobs while awaiting owner approval");

    // Shop Owner approves the order from dashboard
    const approveRes = await fetch(`${BASE_URL}/api/orders/${orderId2}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shop-id": shopId,
      },
    });
    const approveData = await approveRes.json();
    assert(approveData.success && approveData.order?.status === "QUEUED", "6.4 Shop Owner clicked 'Approve & Print'");

    // Agent polls again: receives the approved job
    const pollResApproved = await fetch(`${BASE_URL}/api/agent/poll`, {
      method: "GET",
      headers: {
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
    });
    const pollDataApproved = await pollResApproved.json();
    assert(pollDataApproved.job?.orderId === orderId2, "6.5 Agent claimed approved job for printing");

    // Agent reports PRINTING then COMPLETED for job 2
    await fetch(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        printJobId: pollDataApproved.job.id,
        status: "PRINTING",
      }),
    });

    await fetch(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
      body: JSON.stringify({
        printJobId: pollDataApproved.job.id,
        status: "COMPLETED",
      }),
    });

    // -------------------------------------------------------------
    // Step 7: Duplicate-Print Prevention Test
    // -------------------------------------------------------------
    console.log("\n--- Step 7: Duplicate-Print Protection Verification ---");
    // Attempting to retry a COMPLETED job should fail or prevent double-printing
    const retryRes = await fetch(`${BASE_URL}/api/orders/${orderId2}/retry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shop-id": shopId,
      },
    });
    const retryData = await retryRes.json();
    assert(!retryData.success, "7.1 Duplicate Retry Prevented on Completed Job", retryData.error);

    console.log("\n===============================================================");
    console.log("   🎉 ALL 7 E2E TESTS PASSED! FULL WORKFLOW VERIFIED FREE!    ");
    console.log("===============================================================\n");
  } catch (err) {
    console.error("\n❌ E2E Workflow Test Failed:", err.message);
    process.exit(1);
  }
}

runTest();
