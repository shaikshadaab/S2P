export const ALLOWED_AGENT_COMMANDS = [
  'SYNC_PRINTERS',
  'JOB_AVAILABLE',
  'CANCEL_JOB',
  'RUN_TEST_PRINT',
  'REFRESH_SETTINGS'
] as const;

export type AgentCommandType = (typeof ALLOWED_AGENT_COMMANDS)[number];

export interface AgentCommand {
  id: string;
  deviceId: string;
  shopId: string;
  command: AgentCommandType;
  payload?: Record<string, unknown>;
  issuedAt: string;
  expiresAt: string;
  isExecuted: boolean;
  executedAt?: string;
  resultStatus?: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}
