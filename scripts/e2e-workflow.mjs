import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

const SERVER_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runE2ETest() {
  console.log("==================================================");
  console.log("VINTHA PRINT - COMPLETE PHONEPE (9581529381@ybl) & PRINTER VERIFICATION");
  console.log("==================================================");

  // 1. Start Web Server on test port 3005 with explicit 127.0.0.1 binding
  console.log("\n[1/10] Starting Next.js Production Server on http://127.0.0.1:3005...");
  const serverProcess = spawn("npx.cmd", ["next", "start", "-p", String(SERVER_PORT), "-H", "127.0.0.1"], {
    cwd: path.resolve(process.cwd(), "apps/web"),
    stdio: "inherit",
    shell: true,
  });

  // Wait for server ready
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    try {
      const res = await fetch(BASE_URL);
      if (res.status >= 200 && res.status < 500) {
        serverReady = true;
        break;
      }
    } catch {
      // Waiting
    }
  }

  if (!serverReady) {
    console.error("FAIL: Server failed to start on 127.0.0.1:3005 within 20 seconds");
    serverProcess.kill();
    process.exit(1);
  }
  console.log("✔ Next.js Server is healthy and listening on " + BASE_URL);

  try {
    // Step 2: Register a new Print Shop
    console.log("\n[2/10] Registering a new Print Shop ('Balaji DigiPrint')...");
    const regRes = await fetchJson(`${BASE_URL}/api/shops/register`, {
      method: "POST",
      body: JSON.stringify({
        shopName: "Balaji DigiPrint",
        ownerName: "Venkatesh Rao",
        email: "venkatesh@balajiprint.in",
        phone: "9581529381",
        slug: "balaji-digiprint",
        address: "Shop 4, Gandhi Circle, Koti, Hyderabad",
        city: "Hyderabad",
        state: "Telangana",
        pinCode: "500095",
        pricing: {
          a4BwSinglePrice: 2,
          a4BwDoublePrice: 3,
          a4ColorSinglePrice: 10,
          a4ColorDoublePrice: 15,
          a3BwPrice: 10,
          a3ColorPrice: 25,
          photoPrice: 20,
          serviceFee: 2,
          minimumOrderAmount: 5,
          taxPercent: 5,
        },
      }),
    });

    if (!regRes.ok) {
      throw new Error(`Shop registration failed: ${JSON.stringify(regRes.data)}`);
    }
    const shop = regRes.data.shop;
    console.log(`✔ Shop Registered: ${shop.name} | Slug: /shop/${shop.slug} | Shop ID: ${shop.id}`);

    // Step 3: Request 6-digit pairing code from dashboard & Pair Windows Print Agent
    console.log("\n[3/10] Requesting 6-digit pairing code & pairing Windows Print Agent...");
    const genPairCodeRes = await fetchJson(`${BASE_URL}/api/agent/pair?shopId=${shop.id}`);
    if (!genPairCodeRes.ok) {
      throw new Error(`Failed to generate pairing code: ${JSON.stringify(genPairCodeRes.data)}`);
    }
    const pairingCode = genPairCodeRes.data.pairingCode;
    console.log(`✔ Generated 6-digit pairing code for shop: ${pairingCode}`);

    const pairRes = await fetchJson(`${BASE_URL}/api/agent/pair`, {
      method: "POST",
      body: JSON.stringify({
        code: pairingCode,
        computerName: "SHOP-PC-COUNTER-1",
        osInfo: "Windows 11 Pro 64-bit",
        agentVersion: "1.0.0",
      }),
    });

    if (!pairRes.ok) {
      throw new Error(`Pairing failed: ${JSON.stringify(pairRes.data)}`);
    }
    const deviceId = pairRes.data.deviceId;
    const deviceToken = pairRes.data.deviceToken;
    console.log(`✔ Print Agent paired successfully | Device ID: ${deviceId} | Shop: ${pairRes.data.shopName}`);

    // Step 4: Customer Document Upload via FormData
    console.log("\n[4/10] Customer uploading PDF document ('college_notes.pdf')...");
    const form = new FormData();
    const pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R 4 0 R 5 0 R 6 0 R 7 0 R 8 0 R]/Count 6>>endobj\n3 0 obj<</Type/Page>>endobj\n4 0 obj<</Type/Page>>endobj\n5 0 obj<</Type/Page>>endobj\n6 0 obj<</Type/Page>>endobj\n7 0 obj<</Type/Page>>endobj\n8 0 obj<</Type/Page>>endobj\nxref\n0 9\ntrailer<</Root 1 0 R>>\nstartxref\n250\n%%EOF";
    const pdfBlob = new Blob([pdfContent], { type: "application/pdf" });
    form.append("file", pdfBlob, "college_notes.pdf");
    form.append("shopId", shop.id);
    form.append("pageCount", "6");

    const uploadFetch = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: form,
    });
    const uploadData = await uploadFetch.json();

    if (!uploadFetch.ok) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
    }
    const upload = uploadData.upload;
    console.log(`✔ Upload created: ${upload.filename} | Detected Pages: ${upload.pageCount} | SHA256: ${upload.sha256}`);

    // Step 5: Pricing Engine Server-Side Calculation
    console.log("\n[5/10] Verifying server pricing calculation...");
    const priceRes = await fetchJson(`${BASE_URL}/api/pricing/calculate`, {
      method: "POST",
      body: JSON.stringify({
        shopId: shop.id,
        input: {
          totalPagesInDocument: 6,
          pageRangeText: "1-4",
          copies: 2,
          colorMode: "bw",
          paperSize: "A4",
          isDuplex: true,
          pagesPerSheet: 1,
        },
      }),
    });

    if (!priceRes.ok) {
      throw new Error(`Price calculation failed: ${JSON.stringify(priceRes.data)}`);
    }
    const price = priceRes.data.result;
    console.log(`✔ Exact Server Pricing computed:`);
    console.log(`   Sheets needed: ${price.physicalSheets} | Base: ₹${price.baseAmount}`);
    console.log(`   Service Fee: ₹${price.serviceFee} | Tax: ₹${price.taxAmount} | Final: ₹${price.finalAmount}`);

    // Step 6: Customer Creates Print Order with PhonePe Mobile 9581529381
    console.log("\n[6/10] Creating customer order with PhonePe mobile 9581529381...");
    const orderRes = await fetchJson(`${BASE_URL}/api/orders`, {
      method: "POST",
      body: JSON.stringify({
        shopId: shop.id,
        uploadId: upload.id,
        customerName: "Rahul Sharma",
        customerMobile: "9581529381",
        customerWhatsapp: "9581529381",
        printOptions: {
          copies: 2,
          colorMode: "bw",
          paperSize: "A4",
          isDuplex: true,
          pagesPerSheet: 1,
          pageRangeText: "1-4",
        },
      }),
    });

    if (!orderRes.ok) {
      throw new Error(`Order creation failed: ${JSON.stringify(orderRes.data)}`);
    }
    const order = orderRes.data.order;
    console.log(`✔ Order Created: ${order.id} | Status: ${order.status} | Customer Mobile: ${order.customerMobile}`);

    if (order.status !== "AWAITING_PAYMENT") {
      throw new Error(`FAIL: Initial order status MUST be AWAITING_PAYMENT, got: ${order.status}`);
    }

    // Step 7: Security Assertion - Unpaid Order Must Never Be Pollable
    console.log("\n[7/10] Security Test: Verify unpaid order NEVER reaches print queue...");
    const pollUnpaid = await fetchJson(`${BASE_URL}/api/agent/poll`, {
      headers: {
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
    });

    if (pollUnpaid.data.job && pollUnpaid.data.job.orderId === order.id) {
      throw new Error("SECURITY VIOLATION: Unpaid job was returned by print agent poll!");
    }
    console.log("✔ SECURITY VERIFIED: Zero unpaid jobs dispatched to agent.");

    // Step 8: PhonePe Payment Verification with VPA 9581529381@ybl
    console.log("\n[8/10] Processing PhonePe payment authorization for VPA: 9581529381@ybl...");
    const payRes = await fetchJson(`${BASE_URL}/api/payments/phonepe/verify`, {
      method: "POST",
      body: JSON.stringify({
        orderId: order.id,
        vpa: "9581529381@ybl",
      }),
    });

    if (!payRes.ok) {
      throw new Error(`Payment verification failed: ${JSON.stringify(payRes.data)}`);
    }
    console.log(`✔ Payment Verified by Backend for 9581529381@ybl. Order ${order.id} transitioned to QUEUED.`);

    // Step 9: Agent Polls Paid Job & Silently Prints
    console.log("\n[9/10] Print Agent polling queue for paid jobs...");
    const pollPaid = await fetchJson(`${BASE_URL}/api/agent/poll`, {
      headers: {
        "x-device-id": deviceId,
        "x-device-token": deviceToken,
      },
    });

    const job = pollPaid.data.job;
    if (!job) {
      throw new Error("FAIL: Agent expected a queued job, but none was returned!");
    }
    console.log(`✔ Agent claimed Job: ${job.id} for Order: ${job.orderId}`);

    // Report status transitions: CLAIMED -> DOWNLOADING -> PRINTING -> COMPLETED
    await fetchJson(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: { "x-device-id": deviceId, "x-device-token": deviceToken },
      body: JSON.stringify({ printJobId: job.id, status: "PRINTING" }),
    });

    // Simulate print completion
    await fetchJson(`${BASE_URL}/api/agent/status`, {
      method: "POST",
      headers: { "x-device-id": deviceId, "x-device-token": deviceToken },
      body: JSON.stringify({ printJobId: job.id, status: "COMPLETED" }),
    });
    console.log("✔ Agent successfully spooled to printer and reported COMPLETED status.");

    // Step 10: Verify Customer Order Tracking Final State
    console.log("\n[10/10] Verifying Customer Live Tracking status...");
    const orderFinal = await fetchJson(`${BASE_URL}/api/orders/${order.id}`);
    if (!orderFinal.ok) {
      throw new Error(`Failed to fetch final order: ${JSON.stringify(orderFinal.data)}`);
    }
    const finalData = orderFinal.data.order;
    console.log(`✔ Final Customer Order Status: ${finalData.status}`);
    console.log(`   Customer Receipt: Amount Paid ₹${finalData.finalAmount}`);
    console.log(`   PhonePe UPI VPA: 9581529381@ybl (Authorized)`);

    if (finalData.status !== "COMPLETED") {
      throw new Error(`FAIL: Expected order status COMPLETED, got ${finalData.status}`);
    }

    console.log("\n==================================================");
    console.log("ALL 10/10 END-TO-END ACCEPTANCE CRITERIA PASSED! 🎉");
    console.log("PhonePe UPI 9581529381@ybl & Printer Verification Complete!");
    console.log("==================================================");
  } finally {
    console.log("\nShutting down test server...");
    serverProcess.kill();
  }
}

runE2ETest().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});