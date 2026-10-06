export type AgentFileLifecycle =
  | 'DOWNLOADING'
  | 'VALIDATING'
  | 'SPOOLING'
  | 'PRINTING'
  | 'PRINT_COMPLETED'
  | 'PURGED';

export interface AgentPrivacyContract {
  /**
   * Private dedicated local temporary directory.
   * STRICT PROHIBITION: Never download to Desktop, Downloads, or Documents folders.
   * Example: %LOCALAPPDATA%\S2P\jobs\{jobId}
   */
  tempJobDirectory: string;

  /**
   * Expected SHA256 checksum from server metadata.
   * Agent must verify downloaded bytes match this checksum before spooling.
   */
  expectedSha256: string;

  /**
   * Retention guarantee: Local temp files must be wiped within the configured window
   * once print job confirms COMPLETED.
   */
  localRetentionSeconds: number;

  /**
   * If status is STATUS_UNKNOWN, agent retains file until operator decision is made.
   */
  allowRetainOnUnknownStatus: boolean;
}
