import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "./local-logger";

const execAsync = promisify(exec);

export interface DetectedPrinter {
  name: string;
  driverName: string;
  isDefault: boolean;
  isOnline: boolean;
  isColorSupported: boolean;
  isDuplexSupported: boolean;
  supportedPaperSizes: string[];
}

export class PrinterManager {
  private selectedPrinterName: string | null = null;
  private virtualMode = true; // Default to virtual mode for safe test execution

  public isVirtualPrinterMode(): boolean {
    return this.virtualMode;
  }

  public setVirtualPrinterMode(enabled: boolean) {
    this.virtualMode = enabled;
    logger.info(`Printer mode changed: ${enabled ? "VIRTUAL TEST SPOOLER" : "PHYSICAL PRINTER SPOOLER"}`);
  }

  public getSelectedPrinter(): string {
    return this.selectedPrinterName || (this.virtualMode ? "Vintha Virtual Test Spooler (PDF-to-Disk)" : "Default System Printer");
  }

  public setSelectedPrinter(name: string) {
    this.selectedPrinterName = name;
    logger.info(`Selected active printer: ${name}`);
  }

  /**
   * Discovers all Windows printers using native PowerShell CimInstance.
   */
  public async discoverPrinters(): Promise<DetectedPrinter[]> {
    const detected: DetectedPrinter[] = [
      {
        name: "Vintha Virtual Test Spooler (PDF-to-Disk)",
        driverName: "Vintha Virtual Driver v1.0",
        isDefault: this.virtualMode,
        isOnline: true,
        isColorSupported: true,
        isDuplexSupported: true,
        supportedPaperSizes: ["A4", "A3", "Photo"],
      },
    ];

    if (process.platform === "win32") {
      try {
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, DriverName, Default, WorkOffline | ConvertTo-Json -Compress"`;
        const { stdout } = await execAsync(psCommand);
        if (stdout && stdout.trim()) {
          const raw = JSON.parse(stdout);
          const list = Array.isArray(raw) ? raw : [raw];

          for (const item of list) {
            if (!item.Name) continue;
            const isDefault = Boolean(item.Default);
            const isOnline = !Boolean(item.WorkOffline);

            // Comprehensive color detection for HP Smart Tank, Ink Tank, Canon PIXMA, Epson EcoTank, etc.
            const isColor = /smart\s*tank|ink\s*tank|deskjet|inkjet|photosmart|pixma|ecotank|color|colour|c\d+/i.test(item.Name) ||
                            /color|colour|ipp/i.test(item.DriverName || "");

            // Duplex capability heuristics
            const isDuplex = !/single|label|receipt|pos/i.test(item.Name);

            // Supported paper sizes
            const sizes = ["A4"];
            if (/photo|smart\s*tank|inkjet|deskjet/i.test(item.Name)) {
              sizes.push("Photo");
            }
            if (/a3|2525|large|wide/i.test(item.Name)) {
              sizes.push("A3");
            }

            detected.push({
              name: item.Name,
              driverName: item.DriverName || "Windows Standard Driver",
              isDefault: !this.virtualMode && isDefault,
              isOnline,
              isColorSupported: isColor,
              isDuplexSupported: isDuplex,
              supportedPaperSizes: sizes,
            });

            // If this is default printer and no printer selected yet, remember it
            if (isDefault && !this.selectedPrinterName && !this.virtualMode) {
              this.selectedPrinterName = item.Name;
            }
          }
        }
      } catch (err: any) {
        logger.warn("Windows printer discovery fallback to default test list: " + err.message);
      }
    }

    // Default sample printers if fewer than 2
    if (detected.length === 1) {
      detected.push({
        name: "HP51C8E5 (HP Smart Tank 580-590 series)",
        driverName: "Microsoft IPP Class Driver",
        isDefault: true,
        isOnline: true,
        isColorSupported: true,
        isDuplexSupported: true,
        supportedPaperSizes: ["A4", "Photo"],
      });
      detected.push({
        name: "Canon imageRUNNER 2525 (Network)",
        driverName: "Canon UFRII LT Generic",
        isDefault: false,
        isOnline: true,
        isColorSupported: false,
        isDuplexSupported: true,
        supportedPaperSizes: ["A4", "A3"],
      });
    }

    return detected;
  }
}

export const printerManager = new PrinterManager();