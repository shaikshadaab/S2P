import { PRIMARY_PILOT_SHOP } from '@s2p/shared';

/**
 * Server-Owned Shop Scope Resolver
 *
 * SINGLE-SHOP SCOPE (Current Release):
 * Binds strictly and authoritatively to PRIMARY_PILOT_SHOP ('shakeel-online-services').
 * Protects against arbitrary browser-selected shop IDs.
 *
 * FUTURE EXTENSION PATH (Multi-Shop & Branches):
 * When multi-shop is enabled in a future release:
 * 1. This resolver will inspect authenticated staff tenant claims or custom domains.
 * 2. It will validate membership against Firestore shopMembers.
 * 3. Existing application logic will remain untouched because all endpoints
 *    route through this central scope contract.
 */

export interface ShopScope {
  shopId: string;
  shopName: string;
  organizationId: string;
  isFixedPilot: boolean;
}

export function resolveAuthoritativeShopScope(requestedShopId?: string | null): ShopScope {
  // In single-shop scope, verify or enforce fixed shop ID
  if (requestedShopId && requestedShopId !== PRIMARY_PILOT_SHOP.id) {
    throw new Error(`TENANT_ISOLATION_ERROR: Requested shop '${requestedShopId}' is unauthorized. System is bound strictly to ${PRIMARY_PILOT_SHOP.id}.`);
  }

  return {
    shopId: PRIMARY_PILOT_SHOP.id,
    shopName: PRIMARY_PILOT_SHOP.name,
    organizationId: PRIMARY_PILOT_SHOP.id,
    isFixedPilot: true
  };
}

export const FIXED_SHOP_SCOPE = resolveAuthoritativeShopScope();
