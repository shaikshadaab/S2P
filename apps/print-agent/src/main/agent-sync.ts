import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import http from "http";
import https from "https";
import { logger } from "./local-logger";
import { printerManager } from "./printer-manager";
import { silentSpooler } from "./silent-spooler";

export interface AgentConfig {
  serverUrl: string;
  deviceId?: string;
  deviceToken?: string;
  shopId?: string;
  shopName?: string;
  pairedAt?: string;
  selectedPrinter?: string;
  isVirtualMode?: boolean;
}

export interface PolledJob {
  id: string;
  orderId: string;
  fileUrl: string;
  checksumSha256?: string;
  options: {
    printerName: string;
    copies: number;
    colorMode: "bw" | "color";
    isDuplex: boolean;
    paperSize: string;
    pageRangeText?: string;
    selectedPages?: number[];
  };
}

export class AgentSync {
  private configPath: string;
  private tempDir: string;
  private config: AgentConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isPaused = false;
  private statusListeners: Array<(status: string) => void> = [];

  constructor() {
    const baseDir = process.env.APPDATA || (os.platform() === "darwin" ? path.join(os.homedir(), "Library", "Application Support") : path.join(os.homedir(), ".config"));
    const agentHome = path.join(baseDir, "VinthaPrint");
    this.configPath = path.join(agentHome, "agent-config.json");
    this.tempDir = path.join(agentHome, "temp");

    try {
      fs.mkdirSync(this.tempDir, { recursive: true });
    } catch {
      // Ignore
    }

    this.config = this.loadConfig();
    if (this.config.selectedPrinter) {
      printerManager.setSelectedPrinter(this.config.selectedPrinter);
    }
    if (this.config.isVirtualMode !== undefined) {
      printerManager.setVirtualPrinterMode(this.config.isVirtualMode);
    }
  }

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  public isQueuePaused(): boolean {
    return this.isPaused;
  }

  public setQueuePaused(paused: boolean) {
    this.isPaused = paused;
    logger.info(`Print agent queue ${paused ? "PAUSED" : "RESUMED"}`);
  }

  private loadConfig(): AgentConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, "utf8");
        return JSON.parse(raw);
      }
    } catch (err: any) {
      logger.warn("Could not read agent config: " + err.message);
    }
    return {
      serverUrl: process.env.VINTHA_SERVER_URL || "http://localhost:3000",
      isVirtualMode: true,
    };
  }

  public saveConfig(updates: Partial<AgentConfig>) {
    this.config = { ...this.config, ...updates };
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf8");
      logger.info("Agent configuration saved", { config: this.config });
    } catch (err: any) {
      logger.error("Failed to write agent config: " + err.message);
    }
  }

  /**
   * Pair the agent using a 6-digit one-time code generated from shop dashboard.
   */
  public async pairWithCode(pairingCode: string, serverUrl?: string): Promise<{ success: boolean; shopName?: string; message: string }> {
    const url = serverUrl || this.config.serverUrl || "http://localhost:3000";
    logger.info(`Attempting pairing with code: ${pairingCode} to ${url}`);

    try {
      const response = await this.postJson(`${url}/api/agent/pair`, {
        pairingCode: pairingCode.trim(),
        computerName: os.hostname(),
        osInfo: `${os.type()} ${os.release()} (${os.arch()})`,
        agentVersion: "1.0.0",
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Pairing failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      this.saveConfig({
        serverUrl: url,
        deviceId: data.deviceId,
        deviceToken: data.deviceToken,
        shopId: data.shopId,
        shopName: data.shopName,
        pairedAt: new Date().toISOString(),
      });

      logger.info(`Agent successfully paired to Shop: ${data.shopName} (ID: ${data.shopId})`);
      this.startBackgroundLoops();
      return { success: true, shopName: data.shopName, message: "Successfully paired to shop" };
    } catch (err: any) {
      logger.error(`Pairing error: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  public unpair(): void {
    logger.info("Unpairing print agent and stopping loops");
    this.stopBackgroundLoops();
    this.saveConfig({
      deviceId: undefined,
      deviceToken: undefined,
      shopId: undefined,
      shopName: undefined,
      pairedAt: undefined,
    });
  }

  public startBackgroundLoops(): void {
    if (!this.config.deviceId || !this.config.deviceToken) {
      logger.info("Agent is not paired; background polling not started");
      return;
    }

    this.stopBackgroundLoops();
    logger.info("Starting background heartbeat (25s) and job polling (4s)...");

    // 1. Initial Heartbeat
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);

    // 2. Continuous Job Polling
    this.pollingTimer = setInterval(() => {
      if (!this.isProcessing && !this.isPaused) {
        this.pollForJobs();
      }
    }, 4000);
  }

  public stopBackgroundLoops(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.heartbeatTimer = null;
    this.pollingTimer = null;
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.config.deviceId || !this.config.deviceToken) return;

    try {
      await this.postJson(
        `${this.config.serverUrl}/api/agent/heartbeat`,
        {
          printerName: printerManager.getSelectedPrinter(),
          isVirtual: printerManager.isVirtualPrinterMode(),
          status: this.isPaused ? "PAUSED" : "ONLINE",
        },
        {
          "x-device-id": this.config.deviceId,
          "x-device-token": this.config.deviceToken,
        }
      );
    } catch (err: any) {
      logger.warn(`Heartbeat warning: ${err.message}`);
    }
  }

  private async pollForJobs(): Promise<void> {
    if (!this.config.deviceId || !this.config.deviceToken || this.isProcessing) return;

    this.isProcessing = true;
    let currentJob: PolledJob | null = null;
    try {
      const response = await this.getJson(`${this.config.serverUrl}/api/agent/poll`, {
        "x-device-id": this.config.deviceId,
        "x-device-token": this.config.deviceToken,
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.error("Device token revoked or unauthorized. Stopping loops.");
          this.unpair();
        }
        return;
      }

      const data = await response.json();
      const job: PolledJob | null = data.job;

      if (!job) {
        // No jobs available
        return;
      }
      currentJob = job;

      logger.info(`CLAIMED Print Job ${job.id} for Order ${job.orderId}`);
      await this.reportJobStatus(job.id, "CLAIMED");

      // 1. Downloading
      await this.reportJobStatus(job.id, "DOWNLOADING");
      const localFilePath = path.join(this.tempDir, `doc_${job.orderId}_${Date.now()}.bin`);
      await this.downloadFile(job.fileUrl, localFilePath);

      // 2. Checksum verification
      if (job.checksumSha256) {
        const fileHash = this.computeSha256(localFilePath);
        if (fileHash !== job.checksumSha256) {
          throw new Error(`Checksum mismatch! Expected: ${job.checksumSha256}, Actual: ${fileHash}`);
        }
        logger.info(`Checksum verified: ${fileHash}`);
      }

      // 3. Printing
      await this.reportJobStatus(job.id, "PRINTING");
      await silentSpooler.printDocument(localFilePath, {
        printerName: job.options.printerName || printerManager.getSelectedPrinter(),
        copies: job.options.copies || 1,
        colorMode: job.options.colorMode || "bw",
        isDuplex: job.options.isDuplex || false,
        paperSize: job.options.paperSize || "A4",
        pageRangeText: job.options.pageRangeText,
        selectedPages: job.options.selectedPages,
        orderId: job.orderId,
      });

      // 4. Submission & Completion
      await this.reportJobStatus(job.id, "SUBMITTED_TO_SPOOLER");
      await this.reportJobStatus(job.id, "COMPLETED");
      logger.info(`Job ${job.id} completed successfully!`);
    } catch (err: any) {
      logger.error(`Job processing failed: ${err.message}`);
      if (currentJob) {
        await this.reportJobStatus(currentJob.id, "FAILED", err.message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async reportJobStatus(jobId: string, status: string, error?: string): Promise<void> {
    try {
      await this.postJson(
        `${this.config.serverUrl}/api/agent/status`,
        {
          printJobId: jobId,
          status,
          error,
        },
        {
          "x-device-id": this.config.deviceId!,
          "x-device-token": this.config.deviceToken!,
        }
      );
    } catch (err: any) {
      logger.warn(`Failed to report status ${status} for job ${jobId}: ${err.message}`);
    }
  }

  private computeSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    // If the URL is a relative or local /uploads/ URL, resolve it against serverUrl
    const fullUrl = url.startsWith("http") ? url : `${this.config.serverUrl}${url.startsWith("/") ? "" : "/"}${url}`;

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const getter = fullUrl.startsWith("https") ? https.get : http.get;

      getter(fullUrl, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  private async postJson(url: string, body: any, headers: Record<string, string> = {}): Promise<any> {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  private async getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  }
}

export const agentSync = new AgentSync();
