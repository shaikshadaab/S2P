import { agentSync } from "./agent-sync";
import { printerManager } from "./printer-manager";
import { logger } from "./local-logger";

logger.info("=================================================");
logger.info("   VINTHA PRINT AGENT - BACKGROUND SERVICE MODE  ");
logger.info("=================================================");

printerManager.discoverPrinters().then((printers) => {
  logger.info(`Discovered ${printers.length} local Windows printer spoolers`);
  const activePrinter = printerManager.getSelectedPrinter();
  logger.info(`Active counter printer: ${activePrinter}`);
  agentSync.startBackgroundLoops();
}).catch((err: any) => {
  logger.error("Failed to initialize printer hardware: " + err.message);
  agentSync.startBackgroundLoops();
});

process.on("SIGINT", () => {
  logger.info("Stopping background print agent...");
  agentSync.stopBackgroundLoops();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Stopping background print agent...");
  agentSync.stopBackgroundLoops();
  process.exit(0);
});
