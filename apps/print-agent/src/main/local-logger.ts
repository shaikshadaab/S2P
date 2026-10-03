import fs from "fs";
import path from "path";
import os from "os";

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  meta?: Record<string, unknown>;
}

export class LocalLogger {
  private logDir: string;
  private logFile: string;
  private recentLogs: LogEntry[] = [];
  private maxMemoryLogs = 200;

  constructor() {
    const baseDir = process.env.APPDATA || (os.platform() === "darwin" ? path.join(os.homedir(), "Library", "Application Support") : path.join(os.homedir(), ".config"));
    this.logDir = path.join(baseDir, "VinthaPrint", "logs");
    this.logFile = path.join(this.logDir, "agent.log");

    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch {
      // Ignore directory creation failure
    }
  }

  public log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
    };

    this.recentLogs.unshift(entry);
    if (this.recentLogs.length > this.maxMemoryLogs) {
      this.recentLogs.pop();
    }

    const logLine = `[${entry.timestamp}] [${entry.level}] ${entry.message} ${entry.meta ? JSON.stringify(entry.meta) : ""}\n`;
    try {
      fs.appendFileSync(this.logFile, logLine, "utf8");
    } catch {
      // Fallback
    }

    console.log(logLine.trim());
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.log("INFO", message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.log("WARN", message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>) {
    this.log("ERROR", message, meta);
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.recentLogs];
  }

  public exportDiagnostics(): string {
    return JSON.stringify(
      {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeSeconds: os.uptime(),
        memory: {
          free: os.freemem(),
          total: os.totalmem(),
        },
        logs: this.recentLogs,
      },
      null,
      2
    );
  }
}

export const logger = new LocalLogger();
