import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidOrderTransition,
  assertValidOrderTransition,
  isValidPrintJobTransition,
  getCustomerStatusDisplay,
} from "../dist/state-machine/order-state-machine.js";

test("Order State Machine - Enforces Strict Payment Verification Before Queueing", () => {
  assert.equal(isValidOrderTransition("DRAFT", "QUEUED"), false);
  assert.throws(() => assertValidOrderTransition("DRAFT", "QUEUED"), /Illegal order state transition/);
  assert.equal(isValidOrderTransition("AWAITING_PAYMENT", "QUEUED"), false);
  assert.equal(isValidOrderTransition("DRAFT", "AWAITING_PAYMENT"), true);
  assert.equal(isValidOrderTransition("AWAITING_PAYMENT", "PAYMENT_PENDING"), true);
  assert.equal(isValidOrderTransition("PAYMENT_PENDING", "PAID"), true);
  assert.equal(isValidOrderTransition("PAID", "QUEUED"), true);
  assert.equal(isValidOrderTransition("QUEUED", "CLAIMED"), true);
  assert.equal(isValidOrderTransition("CLAIMED", "DOWNLOADING"), true);
  assert.equal(isValidOrderTransition("DOWNLOADING", "PRINTING"), true);
  assert.equal(isValidOrderTransition("PRINTING", "COMPLETED"), true);
});

test("Print Job State Machine - Transitions correctly", () => {
  assert.equal(isValidPrintJobTransition("QUEUED", "CLAIMED"), true);
  assert.equal(isValidPrintJobTransition("CLAIMED", "DOWNLOADING"), true);
  assert.equal(isValidPrintJobTransition("DOWNLOADING", "DOWNLOADED"), true);
  assert.equal(isValidPrintJobTransition("DOWNLOADED", "PRINTING"), true);
  assert.equal(isValidPrintJobTransition("PRINTING", "COMPLETED"), true);
  assert.equal(isValidPrintJobTransition("PRINTING", "QUEUED"), false);
});

test("Customer Status Display - Returns accurate UI metadata", () => {
  const queuedDisplay = getCustomerStatusDisplay("QUEUED");
  assert.equal(queuedDisplay.title, "Waiting for Printer");
  assert.equal(queuedDisplay.stepIndex, 4);

  const completedDisplay = getCustomerStatusDisplay("COMPLETED");
  assert.equal(completedDisplay.title, "Printed Successfully");
  assert.equal(completedDisplay.badgeVariant, "success");
});
