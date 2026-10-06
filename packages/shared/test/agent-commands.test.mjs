import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_AGENT_COMMANDS } from '../dist/types/agent-commands.js';
import { AgentCommandSchema } from '../dist/validation/device-validation.js';

test('Security - Agent Commands strictly forbid arbitrary execution', () => {
  // Allowed commands: SYNC_PRINTERS, JOB_AVAILABLE, CANCEL_JOB, RUN_TEST_PRINT, REFRESH_SETTINGS
  assert.ok(ALLOWED_AGENT_COMMANDS.includes('SYNC_PRINTERS'));
  assert.ok(ALLOWED_AGENT_COMMANDS.includes('RUN_TEST_PRINT'));

  // Disallowed commands: EXEC, POWERSHELL, CMD, BROWSE, etc.
  assert.equal(ALLOWED_AGENT_COMMANDS.includes('EXEC_CMD'), false);
  assert.equal(ALLOWED_AGENT_COMMANDS.includes('POWERSHELL'), false);
  assert.equal(ALLOWED_AGENT_COMMANDS.includes('DOWNLOAD_EXE'), false);

  // Valid schema check
  const valid = AgentCommandSchema.safeParse({
    command: 'SYNC_PRINTERS',
    deviceId: 'dev_123',
    shopId: 'shakeel-online-services'
  });
  assert.equal(valid.success, true);

  // Invalid schema check
  const invalid = AgentCommandSchema.safeParse({
    command: 'RUN_SHELL',
    deviceId: 'dev_123',
    shopId: 'shakeel-online-services'
  });
  assert.equal(invalid.success, false);
});
