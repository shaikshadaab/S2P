import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  pair: (code: string, serverUrl?: string) => Promise<{ success: boolean; shopName?: string; message: string }>;
  unpair: () => Promise<void>;
  getConfig: () => Promise<any>;
  getPrinters: () => Promise<any[]>;
  setSelectedPrinter: (name: string) => Promise<void>;
  setVirtualMode: (enabled: boolean) => Promise<void>;
  getLogs: () => Promise<any[]>;
  exportDiagnostics: () => Promise<string>;
  setQueuePaused: (paused: boolean) => Promise<void>;
  isQueuePaused: () => Promise<boolean>;
  sendTestPrint: () => Promise<{ success: boolean; message: string }>;
  onLogUpdate: (callback: (entry: any) => void) => void;
  onStatusUpdate: (callback: (status: any) => void) => void;
}

const api: ElectronAPI = {
  pair: (code, serverUrl) => ipcRenderer.invoke("agent:pair", code, serverUrl),
  unpair: () => ipcRenderer.invoke("agent:unpair"),
  getConfig: () => ipcRenderer.invoke("agent:get-config"),
  getPrinters: () => ipcRenderer.invoke("agent:get-printers"),
  setSelectedPrinter: (name) => ipcRenderer.invoke("agent:set-printer", name),
  setVirtualMode: (enabled) => ipcRenderer.invoke("agent:set-virtual-mode", enabled),
  getLogs: () => ipcRenderer.invoke("agent:get-logs"),
  exportDiagnostics: () => ipcRenderer.invoke("agent:export-diagnostics"),
  setQueuePaused: (paused) => ipcRenderer.invoke("agent:set-queue-paused", paused),
  isQueuePaused: () => ipcRenderer.invoke("agent:is-queue-paused"),
  sendTestPrint: () => ipcRenderer.invoke("agent:test-print"),
  onLogUpdate: (callback) => {
    ipcRenderer.on("agent:new-log", (_event, entry) => callback(entry));
  },
  onStatusUpdate: (callback) => {
    ipcRenderer.on("agent:status-change", (_event, status) => callback(status));
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
