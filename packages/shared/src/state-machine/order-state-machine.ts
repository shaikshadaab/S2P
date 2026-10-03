import { OrderStatus, PrintJobStatus } from "../types";

/**
 * Valid transitions for a Free QR Order.
 */
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  SUBMITTED: ["PENDING_APPROVAL", "QUEUED", "CANCELLED"],
  PENDING_APPROVAL: ["QUEUED", "CANCELLED", "FAILED"],
  QUEUED: ["CLAIMED", "FAILED", "CANCELLED"],
  CLAIMED: ["DOWNLOADING", "PRINTING", "QUEUED", "FAILED"],
  DOWNLOADING: ["PRINTING", "QUEUED", "FAILED"],
  PRINTING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["QUEUED", "CANCELLED"],
  CANCELLED: [],
};

/**
 * Valid transitions for a PrintJob processed by the Print Agent.
 */
const VALID_PRINT_JOB_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  QUEUED: ["CLAIMED", "FAILED"],
  CLAIMED: ["DOWNLOADING", "PRINTING", "QUEUED", "FAILED"],
  DOWNLOADING: ["DOWNLOADED", "PRINTING", "QUEUED", "FAILED"],
  DOWNLOADED: ["PRINTING", "FAILED"],
  PRINTING: ["SUBMITTED_TO_SPOOLER", "COMPLETED", "FAILED"],
  SUBMITTED_TO_SPOOLER: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["QUEUED"],
};

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_ORDER_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

export function isValidPrintJobTransition(from: PrintJobStatus, to: PrintJobStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_PRINT_JOB_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

export function assertValidOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isValidOrderTransition(from, to)) {
    throw new Error(`Illegal order state transition from ${from} to ${to}`);
  }
}

export function assertValidPrintJobTransition(from: PrintJobStatus, to: PrintJobStatus): void {
  if (!isValidPrintJobTransition(from, to)) {
    throw new Error(`Illegal print job state transition from ${from} to ${to}`);
  }
}

/**
 * Maps the internal status to customer-friendly display text and color tokens.
 */
export function getCustomerStatusDisplay(status: OrderStatus): {
  title: string;
  description: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  stepIndex: number;
} {
  switch (status) {
    case "SUBMITTED":
      return {
        title: "Order Received",
        description: "Your document has been uploaded and submitted for free printing.",
        badgeVariant: "secondary",
        stepIndex: 1,
      };
    case "PENDING_APPROVAL":
      return {
        title: "Awaiting Shop Approval",
        description: "The shop owner is reviewing your order before printing.",
        badgeVariant: "warning",
        stepIndex: 2,
      };
    case "QUEUED":
      return {
        title: "Ready in Print Queue",
        description: "Your document is in the shop print queue ready to print.",
        badgeVariant: "default",
        stepIndex: 3,
      };
    case "CLAIMED":
    case "DOWNLOADING":
    case "PRINTING":
      return {
        title: "Printing Now on Counter",
        description: "The shop printer is currently printing your document.",
        badgeVariant: "warning",
        stepIndex: 4,
      };
    case "COMPLETED":
      return {
        title: "Print Completed! 🎉",
        description: "Please collect your printed pages from the shop counter.",
        badgeVariant: "success",
        stepIndex: 5,
      };
    case "FAILED":
      return {
        title: "Print Failed",
        description: "There was a printer issue. The shop owner can retry printing.",
        badgeVariant: "destructive",
        stepIndex: 0,
      };
    case "CANCELLED":
      return {
        title: "Order Cancelled",
        description: "This print order was cancelled.",
        badgeVariant: "destructive",
        stepIndex: 0,
      };
    default:
      return {
        title: "Processing",
        description: "Document in process",
        badgeVariant: "secondary",
        stepIndex: 1,
      };
  }
}
