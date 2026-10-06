import { PrintJobStatus } from '../types/print-job';

export const PRINT_JOB_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  CREATED: ['QUEUED', 'ON_HOLD', 'CANCELLED'],
  QUEUED: ['LEASED', 'CLAIMED', 'ON_HOLD', 'CAPABILITY_MISMATCH', 'CANCELLED'],
  LEASED: ['DOWNLOADING', 'PREPARING', 'QUEUED', 'FAILED', 'CANCELLED'],
  CLAIMED: ['DOWNLOADING', 'PREPARING', 'QUEUED', 'FAILED', 'CANCELLED'],
  DOWNLOADING: ['PREPARING', 'READY_TO_PRINT', 'VALIDATING', 'FAILED', 'QUEUED', 'CANCELLED'],
  PREPARING: ['READY_TO_PRINT', 'FAILED', 'CANCELLED', 'QUEUED'],
  READY_TO_PRINT: ['SUBMITTING', 'SUBMITTED', 'SPOOLING', 'QUEUED', 'FAILED', 'CANCELLED'],
  SUBMITTING: ['SUBMITTED', 'PRINTING', 'STATUS_UNKNOWN', 'FAILED', 'CANCELLED'],
  VALIDATING: ['READY_TO_PRINT', 'SPOOLING', 'FAILED', 'CANCELLED'],
  SUBMITTED: ['PRINTING', 'COMPLETED', 'STATUS_UNKNOWN', 'FAILED', 'CANCELLED'],
  SPOOLING: ['PRINTING', 'FAILED', 'STATUS_UNKNOWN', 'CANCELLED'],
  PRINTING: ['SPOOL_COMPLETED', 'COMPLETED', 'FAILED', 'STATUS_UNKNOWN', 'PAPER_OUT', 'PRINTER_OFFLINE'],
  SPOOL_COMPLETED: ['COMPLETED', 'FAILED', 'STATUS_UNKNOWN'],
  COMPLETED: [],
  FAILED: ['RETRY_PENDING', 'QUEUED', 'CANCELLED'],
  RETRY_PENDING: ['QUEUED', 'CANCELLED'],
  STATUS_UNKNOWN: ['COMPLETED', 'FAILED', 'CANCELLED', 'PRINTING'],
  ON_HOLD: ['QUEUED', 'CANCELLED', 'FAILED'],
  PRINTER_OFFLINE: ['QUEUED', 'ON_HOLD', 'CANCELLED', 'FAILED'],
  PAPER_OUT: ['QUEUED', 'ON_HOLD', 'CANCELLED', 'FAILED'],
  CAPABILITY_MISMATCH: ['ON_HOLD', 'FAILED', 'CANCELLED'],
  CANCELLED: []
};

export function canTransitionPrintJob(current: PrintJobStatus, target: PrintJobStatus): boolean {
  if (current === target) return true;
  const allowed = PRINT_JOB_TRANSITIONS[current];
  return !!allowed && allowed.includes(target);
}

export function assertValidPrintJobTransition(current: PrintJobStatus, target: PrintJobStatus): void {
  if (!canTransitionPrintJob(current, target)) {
    throw new Error(`Illegal print job transition from "${current}" to "${target}"`);
  }
}
