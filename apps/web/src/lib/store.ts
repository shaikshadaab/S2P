import {
  Shop,
  ShopSettings,
  Device,
  Printer,
  PairingCode,
  CustomerUpload,
  Order,
  PrintJob,
  JobEvent,
  OrderStatus,
  PrintJobStatus,
} from "@vintha/shared";
import { assertValidOrderTransition, assertValidPrintJobTransition } from "@vintha/shared";

// In-Memory Multi-tenant Storage mirroring Supabase PostgreSQL
class VinthaDataStore {
  public shops: Map<string, Shop> = new Map();
  public shopSettings: Map<string, ShopSettings> = new Map();
  public devices: Map<string, Device> = new Map();
  public printers: Map<string, Printer> = new Map();
  public pairingCodes: Map<string, PairingCode> = new Map();
  public customerUploads: Map<string, CustomerUpload> = new Map();
  public orders: Map<string, Order> = new Map();
  public printJobs: Map<string, PrintJob> = new Map();
  public jobEvents: JobEvent[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const shopId = "shop-om-sai-001";
    const ownerId = "owner-vinod-001";
    const deviceId = "dev-cv92fi2b";

    // 1. Seed Demo Shop
    const defaultShop: Shop = {
      id: shopId,
      ownerId,
      slug: "om-sai-print",
      name: "Om Sai Xerox & Digital Print",
      businessCategory: "Print & Stationery",
      mobile: "9876543210",
      whatsappNumber: "9876543210",
      address: "Shop No. 4, Anand Complex, Near Metro Station, Sector 15",
      city: "Hyderabad",
      state: "Telangana",
      pinCode: "500081",
      googleMapsUrl: "https://maps.google.com",
      logoUrl: null,
      businessHours: {
        monday: { open: "08:30", close: "21:30", isClosed: false },
        tuesday: { open: "08:30", close: "21:30", isClosed: false },
        wednesday: { open: "08:30", close: "21:30", isClosed: false },
        thursday: { open: "08:30", close: "21:30", isClosed: false },
        friday: { open: "08:30", close: "21:30", isClosed: false },
        saturday: { open: "08:30", close: "21:30", isClosed: false },
        sunday: { open: "09:30", close: "19:00", isClosed: false },
      },
      isOpen: true,
      isActive: true,
      isVerified: true,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.shops.set(shopId, defaultShop);

    // 2. Seed Shop Settings
    const defaultSettings: ShopSettings = {
      id: "settings-om-sai-001",
      shopId,
      maxFileSizeMb: 50,
      maxPages: 250,
      allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
      autoPrintEnabled: true,
      manualApprovalMode: false,
      jobTimeoutSeconds: 600,
      retentionHours: 24,
      lowPaperWarning: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.shopSettings.set(shopId, defaultSettings);

    // 3. Seed Paired Windows Print Computer
    const defaultDevice: Device = {
      id: deviceId,
      shopId,
      deviceTokenHash: "vnt_dev_jmasj2np9cmur5pw9u",
      computerName: "SHOP-COUNTER-PC (Win 11 Pro)",
      osVersion: "Windows 11 23H2 (Build 22631.3880)",
      agentVersion: "1.0.0",
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      defaultPrinterId: "printer-hp-smart-tank",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(deviceId, defaultDevice);

    // Legacy/fallback token support
    const fallbackDevice: Device = {
      id: "device-front-desk-001",
      shopId,
      deviceTokenHash: "devtoken-vintha-demo-hash-001",
      computerName: "SHOP-COUNTER-PC (Win 11 Pro)",
      osVersion: "Windows 11 23H2",
      agentVersion: "1.0.0",
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      defaultPrinterId: "printer-hp-smart-tank",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(fallbackDevice.id, fallbackDevice);

    // 4. Seed Printers (Real HP Smart Tank + Virtual Test Spooler)
    const printerHpSmartTank: Printer = {
      id: "printer-hp-smart-tank",
      deviceId,
      shopId,
      name: "HP51C8E5 (HP Smart Tank 580-590 series)",
      driverName: "Microsoft IPP Class Driver",
      isDefault: true,
      isOnline: true,
      isColorSupported: true,
      isDuplexSupported: true,
      supportedPaperSizes: ["A4", "Photo"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const printerVirtual: Printer = {
      id: "printer-virtual-001",
      deviceId,
      shopId,
      name: "Vintha Virtual Test Spooler (PDF-to-Disk)",
      driverName: "Vintha Virtual Spooler Driver v1.0",
      isDefault: false,
      isOnline: true,
      isColorSupported: true,
      isDuplexSupported: true,
      supportedPaperSizes: ["A4", "A3", "Photo"],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.printers.set(printerHpSmartTank.id, printerHpSmartTank);
    this.printers.set(printerVirtual.id, printerVirtual);
  }

  // SHOP METHODS
  public getShopBySlug(slug: string): Shop | undefined {
    for (const shop of this.shops.values()) {
      if (shop.slug.toLowerCase() === slug.toLowerCase()) return shop;
    }
    return undefined;
  }

  public getShopById(id: string): Shop | undefined {
    return this.shops.get(id);
  }

  public createShop(shop: Shop): Shop {
    this.shops.set(shop.id, shop);
    if (!this.shopSettings.has(shop.id)) {
      this.shopSettings.set(shop.id, {
        id: "settings-" + shop.id,
        shopId: shop.id,
        maxFileSizeMb: 50,
        maxPages: 250,
        allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
        autoPrintEnabled: true,
        manualApprovalMode: false,
        jobTimeoutSeconds: 600,
        retentionHours: 24,
        lowPaperWarning: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return shop;
  }

  public getShopSettings(shopId: string): ShopSettings | undefined {
    return this.shopSettings.get(shopId);
  }

  public updateShopSettings(shopId: string, updates: Partial<ShopSettings>): ShopSettings {
    const existing = this.shopSettings.get(shopId) || {
      id: "settings-" + shopId,
      shopId,
      maxFileSizeMb: 50,
      maxPages: 250,
      allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
      autoPrintEnabled: true,
      manualApprovalMode: false,
      jobTimeoutSeconds: 600,
      retentionHours: 24,
      lowPaperWarning: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.shopSettings.set(shopId, updated);
    return updated;
  }

  // PAIRING CODE METHODS
  public createPairingCode(shopId: string): PairingCode {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const pairing: PairingCode = {
      id: "pair-" + Math.random().toString(36).substring(2, 9),
      shopId,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      isUsed: false,
      createdAt: new Date().toISOString(),
    };
    this.pairingCodes.set(code, pairing);
    return pairing;
  }

  public claimPairingCode(code: string, computerName: string, osVersion?: string, agentVersion: string = "1.0.0"): { device: Device; shop: Shop; token: string } {
    const pairing = this.pairingCodes.get(code);
    if (!pairing) throw new Error("Invalid pairing code");
    if (pairing.isUsed) throw new Error("This pairing code has already been used");
    if (new Date(pairing.expiresAt).getTime() < Date.now()) {
      throw new Error("Pairing code has expired. Please generate a new code.");
    }

    const shop = this.shops.get(pairing.shopId);
    if (!shop) throw new Error("Associated shop not found");

    const deviceId = "dev-" + Math.random().toString(36).substring(2, 10);
    const token = "vnt_dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);

    const device: Device = {
      id: deviceId,
      shopId: shop.id,
      deviceTokenHash: token,
      computerName,
      osVersion: osVersion || "Windows Desktop",
      agentVersion,
      isOnline: true,
      lastSeenAt: new Date().toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    pairing.isUsed = true;
    pairing.usedByDeviceId = deviceId;
    this.devices.set(deviceId, device);

    return { device, shop, token };
  }

  // CUSTOMER UPLOAD METHODS
  public saveCustomerUpload(upload: CustomerUpload): void {
    this.customerUploads.set(upload.id, upload);
  }

  public getCustomerUpload(id: string): CustomerUpload | undefined {
    return this.customerUploads.get(id);
  }

  // ORDER & PRINT JOB METHODS
  public createOrder(order: Order): Order {
    const settings = this.getShopSettings(order.shopId);
    if (settings && settings.manualApprovalMode) {
      order.status = "PENDING_APPROVAL";
    } else {
      order.status = "QUEUED";
      this.queuePrintJobForOrder(order);
    }
    this.orders.set(order.id, order);
    return order;
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  public getOrdersByShop(shopId: string): Order[] {
    const result: Order[] = [];
    for (const order of this.orders.values()) {
      if (order.shopId === shopId) result.push(order);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public approveOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "PENDING_APPROVAL" && order.status !== "SUBMITTED") {
      throw new Error(`Order cannot be approved from status ${order.status}`);
    }

    order.status = "QUEUED";
    order.updatedAt = new Date().toISOString();
    this.queuePrintJobForOrder(order);
    return order;
  }

  public retryOrder(orderId: string): { order: Order; job: PrintJob } {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");

    const existingJob = this.printJobs.get(order.id);
    if (existingJob && (existingJob.status === "CLAIMED" || existingJob.status === "PRINTING" || existingJob.status === "COMPLETED")) {
      throw new Error("Job is in flight or has completed. Duplicate print prevented.");
    }

    order.status = "QUEUED";
    order.failureReason = null;
    order.updatedAt = new Date().toISOString();

    let job = existingJob;
    if (job) {
      job.status = "QUEUED";
      job.errorMessage = null;
      job.retryCount = (job.retryCount || 0) + 1;
      job.updatedAt = new Date().toISOString();
    } else {
      job = this.queuePrintJobForOrder(order);
    }

    return { order, job };
  }

  public updateOrderStatus(orderId: string, newStatus: OrderStatus, reason?: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");

    assertValidOrderTransition(order.status, newStatus);
    order.status = newStatus;
    if (reason) order.failureReason = reason;
    order.updatedAt = new Date().toISOString();

    return order;
  }

  public queuePrintJobForOrder(order: Order): PrintJob {
    let printJob = this.printJobs.get(order.id);
    if (!printJob) {
      printJob = {
        id: "job-" + order.id,
        orderId: order.id,
        shopId: order.shopId,
        status: "QUEUED",
        claimCount: 0,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.printJobs.set(order.id, printJob);
    } else {
      printJob.status = "QUEUED";
      printJob.updatedAt = new Date().toISOString();
    }

    order.status = "QUEUED";
    order.updatedAt = new Date().toISOString();

    return printJob;
  }

  // AGENT JOB CLAIM & PROCESSING
  public getNextQueuedJobForShop(shopId: string, deviceId: string): { job: PrintJob; order: Order; upload: CustomerUpload } | null {
    const now = Date.now();
    for (const job of this.printJobs.values()) {
      if (job.shopId === shopId) {
        const isQueued = job.status === "QUEUED";
        const isLeaseExpired = job.status === "CLAIMED" && job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() < now;

        if (isQueued || isLeaseExpired) {
          job.status = "CLAIMED";
          job.deviceId = deviceId;
          job.leaseOwner = deviceId;
          job.leaseExpiresAt = new Date(now + 90 * 1000).toISOString();
          job.claimCount += 1;
          job.startedAt = job.startedAt || new Date().toISOString();
          job.updatedAt = new Date().toISOString();

          const order = this.orders.get(job.orderId);
          if (!order) continue;
          order.status = "CLAIMED";
          order.updatedAt = new Date().toISOString();

          const upload = this.customerUploads.get(order.customerUploadId);
          if (!upload) continue;

          return { job, order, upload };
        }
      }
    }
    return null;
  }

  public updateJobStatus(jobId: string, newStatus: PrintJobStatus, errorMessage?: string): PrintJob {
    let targetJob: PrintJob | undefined;
    for (const job of this.printJobs.values()) {
      if (job.id === jobId || job.orderId === jobId) {
        targetJob = job;
        break;
      }
    }

    if (!targetJob) throw new Error("Print job not found: " + jobId);

    assertValidPrintJobTransition(targetJob.status, newStatus);
    targetJob.status = newStatus;
    if (errorMessage) targetJob.errorMessage = errorMessage;
    if (newStatus === "COMPLETED") targetJob.completedAt = new Date().toISOString();
    targetJob.updatedAt = new Date().toISOString();

    const order = this.orders.get(targetJob.orderId);
    if (order) {
      if (newStatus === "COMPLETED") {
        order.status = "COMPLETED";
      } else if (newStatus === "FAILED") {
        order.status = "FAILED";
        order.failureReason = errorMessage || "Printing failed on device";
      } else if (newStatus === "PRINTING") {
        order.status = "PRINTING";
      }
      order.updatedAt = new Date().toISOString();
    }

    return targetJob;
  }

  public recordHeartbeat(deviceToken: string, printerName?: string): boolean {
    for (const device of this.devices.values()) {
      if (device.deviceTokenHash === deviceToken) {
        device.isOnline = true;
        device.lastSeenAt = new Date().toISOString();
        if (printerName) device.defaultPrinterId = printerName;
        return true;
      }
    }
    return false;
  }
}

declare global {
  var __vinthaStore: VinthaDataStore | undefined;
}

export const store = global.__vinthaStore || new VinthaDataStore();
if (process.env.NODE_ENV !== "production") {
  global.__vinthaStore = store;
}
