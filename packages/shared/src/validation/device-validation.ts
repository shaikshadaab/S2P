import { z } from 'zod';
import { ALLOWED_AGENT_COMMANDS } from '../types/agent-commands';

export const DevicePairingSchema = z.object({
  pairingCode: z.string().length(6, 'Pairing code must be 6 digits'),
  pcName: z.string().min(1, 'PC name is required'),
  osVersion: z.string().min(1, 'OS version is required'),
  agentVersion: z.string().min(1, 'Agent version is required')
});

export const HeartbeatSchema = z.object({
  deviceId: z.string().min(1),
  shopId: z.string().min(1),
  agentVersion: z.string().min(1),
  osVersion: z.string().min(1),
  pcName: z.string().min(1),
  timestamp: z.string().datetime(),
  printersCount: z.number().int().nonnegative()
});

export const AgentCommandSchema = z.object({
  command: z.enum(ALLOWED_AGENT_COMMANDS),
  deviceId: z.string().min(1),
  shopId: z.string().min(1)
});
