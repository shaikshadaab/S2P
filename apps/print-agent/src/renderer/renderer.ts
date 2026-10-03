export {};

declare global {
  interface Window {
    electronAPI: any;
  }
}

const electron = window.electronAPI;

const dom = {
  unpairedView: document.getElementById("unpaired-view") as HTMLDivElement,
  pairedView: document.getElementById("paired-view") as HTMLDivElement,
  shopBadge: document.getElementById("shop-badge") as HTMLSpanElement,
  pairedShopName: document.getElementById("paired-shop-name") as HTMLHeadingElement,
  pairedDeviceInfo: document.getElementById("paired-device-info") as HTMLParagraphElement,
  serverUrlInput: document.getElementById("server-url-input") as HTMLInputElement,
  pairingCodeInput: document.getElementById("pairing-code-input") as HTMLInputElement,
  btnPair: document.getElementById("btn-pair") as HTMLButtonElement,
  btnUnpair: document.getElementById("btn-unpair") as HTMLButtonElement,
  printerSelect: document.getElementById("printer-select") as HTMLSelectElement,
  btnRefreshPrinters: document.getElementById("btn-refresh-printers") as HTMLButtonElement,
  chkVirtualMode: document.getElementById("chk-virtual-mode") as HTMLInputElement,
  btnTestPrint: document.getElementById("btn-test-print") as HTMLButtonElement,
  btnTogglePause: document.getElementById("btn-toggle-pause") as HTMLButtonElement,
  btnExportDiagnostics: document.getElementById("btn-export-diagnostics") as HTMLButtonElement,
  logConsole: document.getElementById("log-console") as HTMLDivElement,
  statusDot: document.getElementById("status-dot") as HTMLDivElement,
  statusText: document.getElementById("status-text") as HTMLSpanElement,
  footerTime: document.getElementById("footer-time") as HTMLSpanElement,
  btnClearLogs: document.getElementById("btn-clear-logs") as HTMLButtonElement,
};

let isPaused = false;

function appendLog(message: string, level: "INFO" | "WARN" | "ERROR" = "INFO") {
  const line = document.createElement("div");
  line.className = `log-${level.toLowerCase()}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] [${level}] ${message}`;
  dom.logConsole.appendChild(line);
  dom.logConsole.scrollTop = dom.logConsole.scrollHeight;
}

async function refreshConfig() {
  if (!electron) return;
  const config = await electron.getConfig();

  if (config.deviceId && config.deviceToken) {
    dom.unpairedView.style.display = "none";
    dom.pairedView.style.display = "block";
    dom.shopBadge.style.display = "inline-block";
    dom.pairedShopName.textContent = config.shopName || "Paired Vintha Shop";
    dom.pairedDeviceInfo.textContent = `Device: ${config.deviceId} • Server: ${config.serverUrl}`;
    dom.statusDot.className = "dot online";
    dom.statusText.textContent = "Online & Polling";
  } else {
    dom.unpairedView.style.display = "block";
    dom.pairedView.style.display = "none";
    dom.shopBadge.style.display = "none";
    dom.statusDot.className = "dot offline";
    dom.statusText.textContent = "Unpaired";
  }

  if (config.isVirtualMode !== undefined) {
    dom.chkVirtualMode.checked = config.isVirtualMode;
  }
}

async function loadPrinters() {
  if (!electron) return;
  try {
    const printers = await electron.getPrinters();
    dom.printerSelect.innerHTML = "";

    printers.forEach((p: any) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = `${p.name} ${p.isOnline ? "(Online)" : "(Offline)"} ${p.isColorSupported ? "🎨" : "📄"}`;
      dom.printerSelect.appendChild(opt);
    });

    const config = await electron.getConfig();
    if (config.selectedPrinter) {
      dom.printerSelect.value = config.selectedPrinter;
    }
  } catch (err: any) {
    appendLog(`Failed to load printers: ${err.message}`, "ERROR");
  }
}

async function refreshLogs() {
  if (!electron) return;
  try {
    const logs = await electron.getLogs();
    dom.logConsole.innerHTML = "";
    logs.slice(0, 50).reverse().forEach((l: any) => {
      appendLog(l.message, l.level);
    });
  } catch (err: any) {
    // Ignore
  }
}

// Event Listeners
dom.btnPair.addEventListener("click", async () => {
  const code = dom.pairingCodeInput.value.trim();
  const server = dom.serverUrlInput.value.trim();

  if (!code || code.length < 6) {
    alert("Please enter a valid 6-digit pairing code.");
    return;
  }

  dom.btnPair.disabled = true;
  dom.btnPair.textContent = "Pairing...";

  try {
    const res = await electron.pair(code, server);
    if (res.success) {
      appendLog(`Pairing successful with ${res.shopName}!`, "INFO");
      await refreshConfig();
    } else {
      appendLog(`Pairing failed: ${res.message}`, "ERROR");
      alert(`Pairing failed: ${res.message}`);
    }
  } catch (err: any) {
    appendLog(`Pairing error: ${err.message}`, "ERROR");
    alert(`Pairing error: ${err.message}`);
  } finally {
    dom.btnPair.disabled = false;
    dom.btnPair.textContent = "Pair Computer";
  }
});

dom.btnUnpair.addEventListener("click", async () => {
  if (confirm("Are you sure you want to unpair this computer from the shop?")) {
    await electron.unpair();
    appendLog("Computer unpaired.", "WARN");
    await refreshConfig();
  }
});

dom.printerSelect.addEventListener("change", async () => {
  const selected = dom.printerSelect.value;
  await electron.setSelectedPrinter(selected);
  appendLog(`Active printer changed to: ${selected}`, "INFO");
});

dom.btnRefreshPrinters.addEventListener("click", async () => {
  appendLog("Discovering Windows hardware printers...", "INFO");
  await loadPrinters();
});

dom.chkVirtualMode.addEventListener("change", async () => {
  const enabled = dom.chkVirtualMode.checked;
  await electron.setVirtualMode(enabled);
  appendLog(`Virtual Spooler mode: ${enabled ? "ENABLED (PDF-to-Disk)" : "DISABLED (Physical Hardware)"}`, "INFO");
});

dom.btnTestPrint.addEventListener("click", async () => {
  dom.btnTestPrint.disabled = true;
  appendLog("Dispatching test print...", "INFO");
  try {
    const res = await electron.sendTestPrint();
    if (res.success) {
      appendLog(`Test print succeeded: ${res.message}`, "INFO");
      alert(`Test Print Success!\n${res.message}`);
    } else {
      appendLog(`Test print error: ${res.message}`, "ERROR");
      alert(`Test Print Failed: ${res.message}`);
    }
  } finally {
    dom.btnTestPrint.disabled = false;
  }
});

dom.btnTogglePause.addEventListener("click", async () => {
  isPaused = !isPaused;
  await electron.setQueuePaused(isPaused);
  if (isPaused) {
    dom.btnTogglePause.textContent = "▶️ Resume Print Queue";
    dom.statusDot.className = "dot paused";
    dom.statusText.textContent = "Queue Paused";
    appendLog("Print queue paused by operator.", "WARN");
  } else {
    dom.btnTogglePause.textContent = "⏸️ Pause Print Queue";
    dom.statusDot.className = "dot online";
    dom.statusText.textContent = "Online & Polling";
    appendLog("Print queue resumed.", "INFO");
  }
});

dom.btnExportDiagnostics.addEventListener("click", async () => {
  const diag = await electron.exportDiagnostics();
  navigator.clipboard.writeText(diag);
  alert("Diagnostics copied to clipboard!\nIncludes OS info, hardware printers, and recent log trace.");
  appendLog("Diagnostics exported to clipboard.", "INFO");
});

dom.btnClearLogs.addEventListener("click", () => {
  dom.logConsole.innerHTML = "";
});

// Clock in footer
setInterval(() => {
  dom.footerTime.textContent = new Date().toLocaleTimeString();
}, 1000);

// Initialize
refreshConfig();
loadPrinters();
refreshLogs();

setInterval(refreshLogs, 5000);
