import { OrderStatus } from '../types/order';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['FILE_PROCESSING', 'CONFIGURED', 'CANCELLED'],
  FILE_PROCESSING: ['CONFIGURED', 'CANCELLED'],
  CONFIGURED: ['AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['RECEIVED', 'PAYMENT_FAILED', 'CANCELLED'],
  RECEIVED: ['ACCEPTED', 'QUEUED_FOR_PRINT', 'ON_HOLD', 'CANCELLED'],
  ACCEPTED: ['QUEUED_FOR_PRINT', 'ON_HOLD', 'CANCELLED'],
  QUEUED_FOR_PRINT: ['PRINTING', 'ON_HOLD', 'CANCELLED'],
  PRINTING: ['FINISHING', 'READY', 'PRINT_FAILED', 'STATUS_UNKNOWN'],
  FINISHING: ['READY', 'PRINT_FAILED'],
  READY: ['COMPLETED'],
  COMPLETED: ['REPRINT_REQUIRED'],
  ON_HOLD: ['ACCEPTED', 'QUEUED_FOR_PRINT', 'CANCELLED'],
  PAYMENT_FAILED: ['AWAITING_PAYMENT', 'CANCELLED'],
  PRINT_FAILED: ['REPRINT_REQUIRED', 'CANCELLED', 'QUEUED_FOR_PRINT'],
  REPRINT_REQUIRED: ['QUEUED_FOR_PRINT', 'CANCELLED'],
  STATUS_UNKNOWN: ['READY', 'PRINTING', 'REPRINT_REQUIRED', 'CANCELLED'],
  CANCELLED: []
};

export function canTransitionOrder(current: OrderStatus, target: OrderStatus): boolean {
  if (current === target) return true;
  const allowed = ORDER_TRANSITIONS[current];
  return !!allowed && allowed.includes(target);
}

export function assertValidOrderTransition(current: OrderStatus, target: OrderStatus): void {
  if (!canTransitionOrder(current, target)) {
    throw new Error(`Illegal order state transition from "${current}" to "${target}"`);
  }
}

export function getOrderStatusDisplay(status: OrderStatus): { label: string; customerDescription: string; color: string } {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', customerDescription: 'Preparing order details', color: 'gray' };
    case 'FILE_PROCESSING':
      return { label: 'Analyzing File', customerDescription: 'Counting pages and verifying format', color: 'blue' };
    case 'CONFIGURED':
      return { label: 'Configured', customerDescription: 'Print options selected', color: 'indigo' };
    case 'AWAITING_PAYMENT':
      return { label: 'Payment Pending', customerDescription: 'Complete Cash or UPI payment at counter', color: 'amber' };
    case 'RECEIVED':
      return { label: 'Order Received', customerDescription: 'Payment confirmed. Staff reviewing order.', color: 'blue' };
    case 'ACCEPTED':
      return { label: 'Order Accepted', customerDescription: 'Order accepted by Shakeel Online Services', color: 'emerald' };
    case 'QUEUED_FOR_PRINT':
      return { label: 'In Print Queue', customerDescription: 'Waiting for assigned printer spooler', color: 'purple' };
    case 'PRINTING':
      return { label: 'Printing', customerDescription: 'Physical printing in progress', color: 'cyan' };
    case 'FINISHING':
      return { label: 'Finishing', customerDescription: 'Binding or lamination in progress', color: 'orange' };
    case 'READY':
      return { label: 'Ready for Pickup', customerDescription: 'Your print is ready to collect at the counter!', color: 'green' };
    case 'COMPLETED':
      return { label: 'Completed', customerDescription: 'Order collected. Thank you!', color: 'emerald' };
    case 'ON_HOLD':
      return { label: 'On Hold', customerDescription: 'Staff placed order on hold. Please check at counter.', color: 'yellow' };
    case 'PAYMENT_FAILED':
      return { label: 'Payment Failed', customerDescription: 'Payment verification failed. Please try again.', color: 'red' };
    case 'CANCELLED':
      return { label: 'Cancelled', customerDescription: 'Order cancelled.', color: 'rose' };
    case 'PRINT_FAILED':
      return { label: 'Print Issue', customerDescription: 'Printer hardware issue detected. Staff attending.', color: 'red' };
    case 'REPRINT_REQUIRED':
      return { label: 'Reprinting', customerDescription: 'Reprint scheduled.', color: 'amber' };
    case 'STATUS_UNKNOWN':
      return { label: 'Status Uncertain', customerDescription: 'Connection interrupted. Staff verifying output.', color: 'yellow' };
    default:
      return { label: status, customerDescription: 'Processing', color: 'gray' };
  }
}
