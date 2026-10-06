import test from 'node:test';
import assert from 'node:assert/strict';
import { clientEnvSchema, validateClientEnv } from '../dist/validation/env-validation.js';

test('Environment Validation - parses valid client env with defaults', () => {
  const result = validateClientEnv({
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 's2p-shakeel.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 's2p-shakeel',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 's2p-shakeel.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:abcdef'
  });

  assert.equal(result.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 's2p-shakeel');
  assert.equal(result.NEXT_PUBLIC_PILOT_SHOP_NAME, 'Shakeel Online Services');
  assert.equal(result.NEXT_PUBLIC_PILOT_SHOP_SLUG, 'shakeel-online-services');
  assert.equal(result.NEXT_PUBLIC_USE_FIREBASE_EMULATOR, 'true');
});

test('Environment Validation - schema validates correctly', () => {
  const parseResult = clientEnvSchema.safeParse({});
  assert.equal(parseResult.success, true); // has sensible local defaults
  assert.equal(parseResult.data.NEXT_PUBLIC_PILOT_SHOP_NAME, 'Shakeel Online Services');
});
