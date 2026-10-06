import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrder, assertValidOrderTransition, getOrderStatusDisplay } from '../dist/state-machine/order-state-machine.js';

test('Order State Machine - Valid workflow progression', () => {
  assert.equal(canTransitionOrder('DRAFT', 'FILE_PROCESSING'), true);
  assert.equal(canTransitionOrder('FILE_PROCESSING', 'CONFIGURED'), true);
  assert.equal(canTransitionOrder('CONFIGURED', 'AWAITING_PAYMENT'), true);
  assert.equal(canTransitionOrder('AWAITING_PAYMENT', 'RECEIVED'), true);
  assert.equal(canTransitionOrder('RECEIVED', 'ACCEPTED'), true);
  assert.equal(canTransitionOrder('ACCEPTED', 'QUEUED_FOR_PRINT'), true);
  assert.equal(canTransitionOrder('QUEUED_FOR_PRINT', 'PRINTING'), true);
  assert.equal(canTransitionOrder('PRINTING', 'READY'), true);
  assert.equal(canTransitionOrder('READY', 'COMPLETED'), true);
});

test('Order State Machine - Blocks illegal transitions', () => {
  // Cannot jump directly from DRAFT to PRINTING
  assert.equal(canTransitionOrder('DRAFT', 'PRINTING'), false);
  // Cannot jump from AWAITING_PAYMENT directly to READY
  assert.equal(canTransitionOrder('AWAITING_PAYMENT', 'READY'), false);
  // COMPLETED cannot directly transition to DRAFT
  assert.equal(canTransitionOrder('COMPLETED', 'DRAFT'), false);

  assert.throws(() => assertValidOrderTransition('DRAFT', 'READY'), /Illegal order state transition/);
});

test('Order State Machine - Provides user-friendly status displays', () => {
  const readyDisplay = getOrderStatusDisplay('READY');
  assert.equal(readyDisplay.label, 'Ready for Pickup');
  assert.match(readyDisplay.customerDescription, /counter/i);

  const printingDisplay = getOrderStatusDisplay('PRINTING');
  assert.equal(printingDisplay.label, 'Printing');
});
