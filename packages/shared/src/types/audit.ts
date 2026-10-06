export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'ORDER_CREATED'
  | 'PRICE_FINALIZED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'ORDER_ACCEPTED'
  | 'PRINTER_ASSIGNED'
  | 'JOB_CLAIMED'
  | 'PRINT_SPOOLED'
  | 'PRINT_COMPLETED'
  | 'PRINT_FAILED'
  | 'REPRINT_REQUESTED'
  | 'REPRINT_AUTHORIZED'
  | 'ORDER_READY'
  | 'ORDER_COMPLETED'
  | 'PRICING_UPDATED'
  | 'PAIRING_CODE_CREATED'
  | 'DEVICE_PAIRED'
  | 'DEVICE_REVOKED'
  | 'PRINTER_DISCOVERED'
  | 'PRINT_JOB_CREATED'
  | 'PRINT_JOB_CLAIMED'
  | 'PRINT_JOB_FAILED'
  | 'PRINT_JOB_CANCELLED'
  | 'PRINT_JOB_READY'
  | 'PRINT_JOB_LEASE_RENEWED'
  | 'FILE_UPLOADED'
  | 'FILE_VALIDATED'
  | 'PURGE_SCHEDULED'
  | 'FILE_PURGED'
  | 'PURGE_FAILED';

export interface AuditLogEntry {
  id: string;
  shopId: string;
  organizationId?: string;
  eventType: AuditEventType | string;
  actorId: string;
  actorRole: string;
  entityId: string;
  details: Record<string, unknown>;
  timestamp: string;
}
