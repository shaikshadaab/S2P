export type DeviceStatus = 'PAIRING' | 'ONLINE' | 'OFFLINE' | 'REVOKED';

export interface Device {
  id: string;
  organizationId: string;
  shopId: string;
  name: string;
  hostname: string;
  windowsVersion: string;
  agentVersion: string;
  status: DeviceStatus;
  credentialHash: string; // SHA-256 hash of device secret; NEVER raw secret
  pairedByUid: string;
  pairedAt: string;
  lastHeartbeatAt: string;
  lastSeenIp?: string;
  capabilities?: Record<string, unknown>;
  agentUploadUrl?: string;
  storagePathRoot?: string;
  createdAt: string;
  updatedAt: string;
}

// Backwards-compatibility alias
export type PrintDevice = Device;

export interface DevicePairingCode {
  id: string;
  codeHash: string;
  organizationId: string;
  shopId: string;
  createdByUid: string;
  expiresAt: string;
  usedAt?: string | null;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  createdAt: string;
}

export interface HeartbeatPayload {
  deviceId: string;
  agentVersion: string;
  hostname: string;
  windowsVersion: string;
  installedPrintersCount?: number;
  agentUploadUrl?: string;
  timestamp: string;
}
