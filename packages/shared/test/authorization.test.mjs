import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAuthenticated,
  isShopMember,
  hasRole,
  canAccessShop,
  canManageStaff,
  canManageShopSettings,
  canViewDashboard
} from '../dist/index.js';

test('Authorization - isAuthenticated validates user object', () => {
  assert.equal(isAuthenticated(null), false);
  assert.equal(isAuthenticated(undefined), false);
  assert.equal(isAuthenticated({ uid: '' }), false);
  assert.equal(isAuthenticated({ uid: 'usr_123' }), true);
});

test('Authorization - isShopMember validates shopId and ACTIVE status', () => {
  const activeMember = {
    userId: 'usr_1',
    organizationId: 'org_1',
    shopId: 'shop_shakeel',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  assert.equal(isShopMember(activeMember, 'shop_shakeel'), true);
  assert.equal(isShopMember(activeMember, 'shop_other'), false);

  const suspendedMember = { ...activeMember, status: 'SUSPENDED' };
  assert.equal(isShopMember(suspendedMember, 'shop_shakeel'), false);
  assert.equal(isShopMember(null, 'shop_shakeel'), false);
});

test('Authorization - hasRole checks membership role against permitted list', () => {
  const member = { role: 'COUNTER_STAFF' };
  assert.equal(hasRole(member, ['OWNER', 'MANAGER']), false);
  assert.equal(hasRole(member, ['COUNTER_STAFF', 'OWNER']), true);
  assert.equal(hasRole(null, ['OWNER']), false);
});

test('Authorization - canManageStaff allows only OWNER', () => {
  assert.equal(canManageStaff('OWNER'), true);
  assert.equal(canManageStaff('MANAGER'), false);
  assert.equal(canManageStaff('COUNTER_STAFF'), false);
  assert.equal(canManageStaff('CUSTOMER'), false);
  assert.equal(canManageStaff(undefined), false);
});

test('Authorization - canManageShopSettings allows OWNER and MANAGER', () => {
  assert.equal(canManageShopSettings('OWNER'), true);
  assert.equal(canManageShopSettings('MANAGER'), true);
  assert.equal(canManageShopSettings('COUNTER_STAFF'), false);
  assert.equal(canManageShopSettings('PRINT_OPERATOR'), false);
});

test('Authorization - canViewDashboard allows all active staff roles', () => {
  assert.equal(canViewDashboard('OWNER'), true);
  assert.equal(canViewDashboard('MANAGER'), true);
  assert.equal(canViewDashboard('COUNTER_STAFF'), true);
  assert.equal(canViewDashboard('PRINT_OPERATOR'), true);
  assert.equal(canViewDashboard('FINISHING_STAFF'), true);
  assert.equal(canViewDashboard('CUSTOMER'), false);
  assert.equal(canViewDashboard(undefined), false);
});
