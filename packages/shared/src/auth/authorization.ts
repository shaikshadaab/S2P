import { UserRole } from '../types/user';
import { ShopMember } from '../types/tenant';

/**
 * Check if a user is authenticated.
 */
export function isAuthenticated(user: { uid?: string } | null | undefined): boolean {
  return !!user && typeof user.uid === 'string' && user.uid.length > 0;
}

/**
 * Check if a member belongs to a specific shop and has an ACTIVE status.
 */
export function isShopMember(
  member: ShopMember | null | undefined,
  shopId: string
): boolean {
  if (!member || !shopId) return false;
  return member.shopId === shopId && member.status === 'ACTIVE';
}

/**
 * Check if a member holds one of the required roles.
 */
export function hasRole(
  member: { role: UserRole } | null | undefined,
  allowedRoles: UserRole[]
): boolean {
  if (!member) return false;
  return allowedRoles.includes(member.role);
}

/**
 * Validate if a user can access a shop's private dashboard.
 * Browser-provided shopId is never trusted alone; membership must match.
 */
export function canAccessShop(
  member: ShopMember | null | undefined,
  targetShopId: string
): boolean {
  return isShopMember(member, targetShopId);
}

/**
 * Permission check: only OWNER can manage staff roles and invite members.
 */
export function canManageStaff(role: UserRole | null | undefined): boolean {
  return role === 'OWNER';
}

/**
 * Permission check: OWNER and MANAGER can update shop configuration.
 */
export function canManageShopSettings(role: UserRole | null | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

/**
 * Permission check: All staff roles can view the dashboard.
 */
export function canViewDashboard(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return ['OWNER', 'MANAGER', 'COUNTER_STAFF', 'PRINT_OPERATOR', 'FINISHING_STAFF'].includes(role);
}
