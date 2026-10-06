export type UserRole =
  | 'OWNER'
  | 'MANAGER'
  | 'COUNTER_STAFF'
  | 'PRINT_OPERATOR'
  | 'FINISHING_STAFF'
  | 'CUSTOMER';

export interface UserProfile {
  uid: string;
  email?: string;
  phone?: string;
  displayName: string;
  role: UserRole;
  shopId?: string;
  isAnonymous?: boolean;
  createdAt: string;
}

export interface UserClaims {
  role: UserRole;
  shopId?: string;
  organizationId?: string;
}
