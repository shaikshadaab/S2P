export type PrinterKind = 'PHYSICAL' | 'VIRTUAL' | 'UNKNOWN';

export type PrinterConnectionType =
  | 'USB'
  | 'LAN'
  | 'WIFI'
  | 'SHARED'
  | 'WSD'
  | 'IPP'
  | 'UNKNOWN';

export interface PrinterCapabilities {
  paperSizes: string[];
  colorSupported: boolean;
  duplexSupported: boolean;
  duplexKind?: 'AUTO' | 'MANUAL' | 'NONE';
  photoPaperSupported?: boolean;
  supportedResolutionsDpi?: number[];
}

export interface Printer {
  id: string;
  organizationId: string;
  shopId: string;
  deviceId: string;
  queueName: string;
  displayName: string;
  driverName: string;
  portName: string;
  printerKind: PrinterKind;
  connectionType: PrinterConnectionType;
  isDefault: boolean;
  isOnline: boolean;
  isEnabled: boolean;
  capabilities: PrinterCapabilities;
  lastDiscoveredAt: string;
  createdAt: string;
  updatedAt: string;
}

// Backwards-compatibility alias
export type WindowsPrinter = Printer;
