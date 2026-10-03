import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { logger } from "./local-logger";
import { printerManager } from "./printer-manager";
import { silentSpooler } from "./silent-spooler";
import { agentSync } from "./agent-sync";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 700,
    minHeight: 550,
    title: "Vintha Print Agent - Windows Desktop Spooler",
    backgroundColor: "#121018",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererPath = path.join(__dirname, "../renderer/index.html");
  if (fs.existsSync(rendererPath)) {
    mainWindow.loadFile(rendererPath);
  } else {
    // Development fallback
    mainWindow.loadFile(path.join(__dirname, "../../src/renderer/index.html"));
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    logger.info("Vintha Print Agent UI loaded successfully");
  });
}

function createTray() {
  // Create simple 16x16 tray icon programmatically or fallback
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Vintha Print Agent - Active Spooler");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Vintha Print Agent",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "Pause Print Queue",
      type: "checkbox",
      checked: agentSync.isQueuePaused(),
      click: (item) => {
        agentSync.setQueuePaused(item.checked);
      },
    },
    {
      label: "Send Test Print",
      click: async () => {
        await executeTestPrint();
      },
    },
    {
      label: "Open Spooler Output Folder",
      click: () => {
        shell.openPath(silentSpooler.getOutputDir());
      },
    },
    { type: "separator" },
    {
      label: "Quit Vintha Print Agent",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

async function executeTestPrint(): Promise<{ success: boolean; message: string }> {
  try {
    const tempDir = path.join(os.tmpdir(), "vintha-test");
    fs.mkdirSync(tempDir, { recursive: true });
    const testFile = path.join(tempDir, `test_page_${Date.now()}.txt`);
    fs.writeFileSync(
      testFile,
      `VINTHA PRINT - TEST PRINT PAGE\nTime: ${new Date().toISOString()}\nHost: ${os.hostname()}\nPrinter: ${printerManager.getSelectedPrinter()}\nVirtual Mode: ${printerManager.isVirtualPrinterMode()}\n`,
      "utf8"
    );

    const result = await silentSpooler.printDocument(testFile, {
      printerName: printerManager.getSelectedPrinter(),
      copies: 1,
      colorMode: "bw",
      isDuplex: false,
      paperSize: "A4",
      orderId: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    return result;
  } catch (err: any) {
    logger.error("Test print failed: " + err.message);
    return { success: false, message: err.message };
  }
}

// Register IPC handlers
function setupIpc() {
  ipcMain.handle("agent:pair", async (_event, code, serverUrl) => {
    return await agentSync.pairWithCode(code, serverUrl);
  });

  ipcMain.handle("agent:unpair", async () => {
    agentSync.unpair();
    return { success: true };
  });

  ipcMain.handle("agent:get-config", async () => {
    return agentSync.getConfig();
  });

  ipcMain.handle("agent:get-printers", async () => {
    return await printerManager.discoverPrinters();
  });

  ipcMain.handle("agent:set-printer", async (_event, name: string) => {
    printerManager.setSelectedPrinter(name);
    agentSync.saveConfig({ selectedPrinter: name });
    return { success: true };
  });

  ipcMain.handle("agent:set-virtual-mode", async (_event, enabled: boolean) => {
    printerManager.setVirtualPrinterMode(enabled);
    agentSync.saveConfig({ isVirtualMode: enabled });
    return { success: true };
  });

  ipcMain.handle("agent:get-logs", async () => {
    return logger.getRecentLogs();
  });

  ipcMain.handle("agent:export-diagnostics", async () => {
    return logger.exportDiagnostics();
  });

  ipcMain.handle("agent:set-queue-paused", async (_event, paused: boolean) => {
    agentSync.setQueuePaused(paused);
    return { success: true };
  });

  ipcMain.handle("agent:is-queue-paused", async () => {
    return agentSync.isQueuePaused();
  });

  ipcMain.handle("agent:test-print", async () => {
    return await executeTestPrint();
  });
}

app.whenReady().then(() => {
  logger.info("Initializing Vintha Print Agent application...");
  setupIpc();
  createWindow();
  createTray();

  // If already paired, start background loops
  const config = agentSync.getConfig();
  if (config.deviceId && config.deviceToken) {
    logger.info(`Auto-resuming background loops for shop: ${config.shopName || config.shopId}`);
    agentSync.startBackgroundLoops();
  }

  // Windows auto-start on login
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: ["--hidden"],
    });
  } catch {
    // Ignore in development
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep running in tray unless explicit quit
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  agentSync.stopBackgroundLoops();
});
