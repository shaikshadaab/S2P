import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP } from '@s2p/shared';

export interface HealthStatus {
  service: string;
  brand: string;
  version: string;
  pilotShop: string;
  status: 'HEALTHY' | 'DEGRADED';
  timestamp: string;
}

export function getSystemHealth(): HealthStatus {
  return {
    service: `${BRAND_NAME} Cloud Functions Backend`,
    brand: BRAND_FULL_NAME,
    version: '0.1.0-phase0',
    pilotShop: PRIMARY_PILOT_SHOP.name,
    status: 'HEALTHY',
    timestamp: new Date().toISOString()
  };
}
