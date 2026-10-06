import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionPrintJob, assertValidPrintJobTransition } from '../dist/state-machine/print-job-state-machine.js';

test('Print Job State Machine - Normal lifecycle transitions', () => {
  assert.equal(canTransitionPrintJob('QUEUED', 'CLAIMED'), true);
  assert.equal(canTransitionPrintJob('CLAIMED', 'DOWNLOADING'), true);
  assert.equal(canTransitionPrintJob('DOWNLOADING', 'VALIDATING'), true);
  assert.equal(canTransitionPrintJob('VALIDATING', 'SPOOLING'), true);
  assert.equal(canTransitionPrintJob('SPOOLING', 'PRINTING'), true);
  assert.equal(canTransitionPrintJob('PRINTING', 'COMPLETED'), true);
});

test('Print Job State Machine - Disconnection recovery via STATUS_UNKNOWN', () => {
  // If agent spools or prints and connection drops, status becomes STATUS_UNKNOWN
  assert.equal(canTransitionPrintJob('PRINTING', 'STATUS_UNKNOWN'), true);
  assert.equal(canTransitionPrintJob('SPOOLING', 'STATUS_UNKNOWN'), true);

  // Recovery: Can be confirmed COMPLETED or marked FAILED
  assert.equal(canTransitionPrintJob('STATUS_UNKNOWN', 'COMPLETED'), true);
  assert.equal(canTransitionPrintJob('STATUS_UNKNOWN', 'FAILED'), true);

  // Illegal: cannot go from COMPLETED to QUEUED
  assert.equal(canTransitionPrintJob('COMPLETED', 'QUEUED'), false);
  assert.throws(() => assertValidPrintJobTransition('COMPLETED', 'QUEUED'), /Illegal print job transition/);
});
