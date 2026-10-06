import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authoritative Security Rule Evaluator for S2P (Scan 2 Print)
 * Simulates Firestore security rules evaluation matching firestore.rules.
 * Evaluates membership lookup against canonical shopMembers/${auth.uid}_${shopId}.
 */
function evaluateFirestoreRule({
  path,
  operation, // "read" | "create" | "update" | "delete"
  auth, // null | { uid: string, token?: Record<string, unknown> }
  memberships = {}, // mock shopMembers collection: { `${uid}_${shopId}`: { role, status, userId, shopId } }
  resourceData = {},
  requestData = {}
}) {
  const isAuthenticated = auth !== null && !!auth.uid;

  const getMembership = (targetShopId) => {
    if (!isAuthenticated) return null;
    const key = `${auth.uid}_${targetShopId}`;
    return memberships[key] || null;
  };

  const isShopMember = (targetShopId) => {
    const mem = getMembership(targetShopId);
    return mem !== null && mem.status === "ACTIVE";
  };

  const isShopStaff = (targetShopId) => {
    if (!isShopMember(targetShopId)) return false;
    const mem = getMembership(targetShopId);
    const allowedRoles = ["OWNER", "MANAGER", "COUNTER_STAFF", "PRINT_OPERATOR", "FINISHING_STAFF"];
    return allowedRoles.includes(mem.role);
  };

  const isShopManager = (targetShopId) => {
    if (!isShopMember(targetShopId)) return false;
    const mem = getMembership(targetShopId);
    return ["OWNER", "MANAGER"].includes(mem.role);
  };

  // Rule: organizations/{orgId}
  if (path.startsWith("organizations/")) {
    if (operation === "read") return isAuthenticated;
    if (operation === "create" || operation === "update" || operation === "delete") {
      return isAuthenticated && (resourceData.ownerId === auth?.uid || requestData.ownerId === auth?.uid);
    }
  }

  // Rule: shops/{shopId}
  if (path.startsWith("shops/")) {
    const shopId = path.split("/")[1];
    if (operation === "read") return true; // Public for QR landing & shop metadata
    if (operation === "create" || operation === "update") return isShopManager(shopId);
  }

  // Rule: shopMembers/{memberId}
  if (path.startsWith("shopMembers/")) {
    if (operation === "read") {
      if (!isAuthenticated) return false;
      return resourceData.userId === auth.uid || isShopStaff(resourceData.shopId);
    }
    if (operation === "create" || operation === "update") {
      if (!isAuthenticated) return false;
      return isShopManager(requestData.shopId);
    }
  }

  // Rule: pricingRules/{ruleId}
  if (path.startsWith("pricingRules/")) {
    const shopId = resourceData.shopId || requestData.shopId;
    if (operation === "read") return true; // Public catalog pricing for quotes
    if (operation === "create" || operation === "update" || operation === "delete") {
      return isAuthenticated && isShopManager(shopId);
    }
  }

  // Rule: services/{serviceId}
  if (path.startsWith("services/")) {
    const shopId = resourceData.shopId || requestData.shopId;
    if (operation === "read") return true; // Public catalog
    if (operation === "create" || operation === "update" || operation === "delete") {
      return isAuthenticated && isShopManager(shopId);
    }
  }

  // Rule: priceQuotes/{quoteId}
  if (path.startsWith("priceQuotes/")) {
    if (operation === "read") return true;
    if (operation === "create") {
      return isAuthenticated && isShopStaff(requestData.shopId);
    }
    return false; // Immutable quotes: update/delete denied
  }

  // Rule: orders/{orderId}
  if (path.startsWith("orders/")) {
    if (operation === "read") {
      if (resourceData.isGuest === true) return true;
      if (isShopStaff(resourceData.shopId)) return true;
      if (isAuthenticated && resourceData.customerId === auth.uid) return true;
      return false;
    }
  }

  // Rule: printJobs/{jobId}
  if (path.startsWith("printJobs/")) {
    if (operation === "read" || operation === "create" || operation === "update") {
      return isShopStaff(resourceData.shopId || requestData.shopId);
    }
  }

  return false;
}

test("Security Rule 1: Missing membership fails closed and does NOT become OWNER", () => {
  const unassignedUser = { uid: "user_random_456" };
  const memberships = {}; // empty membership collection

  const canManage = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: unassignedUser,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canManage, false, "User without active membership must be DENIED authorization (fail-closed)");
});

test("Security Rule 2: Firestore membership lookup failure / inactive member fails closed", () => {
  const suspendedUser = { uid: "user_suspended" };
  const memberships = {
    "user_suspended_shakeel-online-services": {
      userId: "user_suspended",
      shopId: "shakeel-online-services",
      role: "OWNER",
      status: "SUSPENDED" // Inactive / suspended status
    }
  };

  const canManage = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: suspendedUser,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canManage, false, "Suspended member must NOT receive authorization");
});

test("Security Rule 3: Production login bundle does not expose development password", () => {
  const loginPagePath = path.resolve(__dirname, "../../../apps/web/src/app/login/page.tsx");
  const loginCode = fs.readFileSync(loginPagePath, "utf8");

  assert.equal(
    loginCode.includes("Shakeel@1234"),
    false,
    "Production login page source must NEVER contain development password Shakeel@1234"
  );
  assert.equal(
    loginCode.includes("fillDemoOwner"),
    false,
    "Production login page source must NEVER contain demo credentials autofill helper"
  );
});

test("Security Rule 4: Shop A cannot read or modify Shop B private configuration", () => {
  const shopAStaff = { uid: "user_shop_a" };
  const memberships = {
    "user_shop_a_shop_a": {
      userId: "user_shop_a",
      shopId: "shop_a",
      role: "OWNER",
      status: "ACTIVE"
    }
  };

  // Staff of Shop A attempts to modify Shop B pricing
  const canModifyB = evaluateFirestoreRule({
    path: "pricingRules/rule_shop_b",
    operation: "update",
    auth: shopAStaff,
    memberships,
    requestData: { shopId: "shop_b" }
  });

  assert.equal(canModifyB, false, "Shop A staff must NEVER modify Shop B pricing rules");
});

test("Security Rule 5: Counter staff cannot modify pricing", () => {
  const counterStaff = { uid: "user_counter" };
  const memberships = {
    "user_counter_shakeel-online-services": {
      userId: "user_counter",
      shopId: "shakeel-online-services",
      role: "COUNTER_STAFF",
      status: "ACTIVE"
    }
  };

  const canUpdate = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: counterStaff,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canUpdate, false, "COUNTER_STAFF must be strictly read-only for pricing rules");
});

test("Security Rule 6: Owner can modify own shop pricing", () => {
  const owner = { uid: "user_owner" };
  const memberships = {
    "user_owner_shakeel-online-services": {
      userId: "user_owner",
      shopId: "shakeel-online-services",
      role: "OWNER",
      status: "ACTIVE"
    }
  };

  const canUpdate = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: owner,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canUpdate, true, "OWNER must be allowed to modify pricing rules");
});

test("Security Rule 7: Manager can modify allowed pricing", () => {
  const manager = { uid: "user_manager" };
  const memberships = {
    "user_manager_shakeel-online-services": {
      userId: "user_manager",
      shopId: "shakeel-online-services",
      role: "MANAGER",
      status: "ACTIVE"
    }
  };

  const canUpdate = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: manager,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canUpdate, true, "MANAGER must be allowed to modify pricing rules");
});

test("Security Rule 8: Customer cannot write authoritative pricing data", () => {
  const customer = { uid: "user_customer" };
  const memberships = {}; // No staff membership

  const canUpdate = evaluateFirestoreRule({
    path: "pricingRules/rule_123",
    operation: "update",
    auth: customer,
    memberships,
    requestData: { shopId: "shakeel-online-services" }
  });

  assert.equal(canUpdate, false, "Customer must NOT modify pricing rules");
});

test("Security Rule 9: Disabled service cannot generate valid quote", async () => {
  const { calculatePrintQuote } = await import("../dist/index.js");

  const disabledContext = {
    services: [
      {
        id: "srv_color",
        organizationId: "shakeel-online-services",
        shopId: "shakeel-online-services",
        code: "COLOR_PRINT",
        name: "Color Print",
        category: "PRINT",
        enabled: false, // DISABLED SERVICE
        displayOrder: 1,
        publicVisible: true,
        createdAt: "",
        updatedAt: ""
      }
    ],
    paperSizes: [
      { code: "A4", displayName: "A4", widthMm: 210, heightMm: 297, enabled: true, displayOrder: 1 }
    ],
    pricingRules: [
      {
        id: "r1",
        organizationId: "shakeel-online-services",
        shopId: "shakeel-online-services",
        serviceCode: "COLOR_PRINT",
        paperSizeCode: "A4",
        printMode: "COLOR",
        sideMode: "SINGLE",
        billingUnit: "PER_PRINTED_SIDE",
        unitPricePaise: 1000,
        enabled: true,
        createdAt: "",
        updatedAt: ""
      }
    ]
  };

  assert.throws(
    () => {
      calculatePrintQuote(
        {
          shopId: "shakeel-online-services",
          serviceCode: "COLOR_PRINT",
          totalDocumentPages: 5,
          paperSize: "A4",
          printMode: "COLOR",
          sideMode: "SINGLE",
          copies: 1
        },
        disabledContext
      );
    },
    (err) => {
      return err.code === "SERVICE_DISABLED";
    },
    "Disabled service must fail loud with SERVICE_DISABLED error"
  );
});
