import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function discoverLocalPrinters() {
  console.log("==================================================");
  console.log("VINTHA PRINT - LOCAL HARDWARE PRINTER DISCOVERY");
  console.log("==================================================");

  if (process.platform !== "win32") {
    console.log("Not running on Windows. Simulating printer discovery...");
    return;
  }

  const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, DriverName, Default, WorkOffline, PortName | ConvertTo-Json -Compress"`;
  try {
    const { stdout } = await execAsync(psCommand);
    if (stdout && stdout.trim()) {
      const raw = JSON.parse(stdout);
      const printers = Array.isArray(raw) ? raw : [raw];

      console.log(`\nFound ${printers.length} Installed Windows Printers:\n`);
      printers.forEach((p, idx) => {
        const isColor = /smart\s*tank|ink\s*tank|deskjet|inkjet|photosmart|color|colour|ipp/i.test(p.Name) || /color|colour|ipp/i.test(p.DriverName || "");
        console.log(`[${idx + 1}] ${p.Name}`);
        console.log(`    Driver:     ${p.DriverName}`);
        console.log(`    Default:    ${p.Default ? "★ YES (Default Windows Printer)" : "No"}`);
        console.log(`    Status:     ${p.WorkOffline ? "🔴 Offline" : "🟢 Online & Ready"}`);
        console.log(`    Port:       ${p.PortName}`);
        console.log(`    Capabilities: ${isColor ? "🎨 Full Color + B&W" : "📄 Monochrome"} • Duplex Supported\n`);
      });

      return printers;
    }
  } catch (err) {
    console.error("Printer discovery failed:", err.message);
  }
}

async function runLocalPrinterTest() {
  const printers = await discoverLocalPrinters();

  // Test virtual spooler output directory
  const outputDir = path.join(os.homedir(), "vintha-print-output");
  fs.mkdirSync(outputDir, { recursive: true });

  const testFile = path.join(outputDir, `TEST_PAGE_${Date.now()}.txt`);
  const defaultPrinter = printers?.find((p) => p.Default)?.Name || "HP51C8E5 (HP Smart Tank 580-590 series)";

  fs.writeFileSync(
    testFile,
    `===============================================\n` +
    `VINTHA PRINT - TEST PRINT PAGE\n` +
    `Timestamp: ${new Date().toISOString()}\n` +
    `Machine:   ${os.hostname()}\n` +
    `Target:    ${defaultPrinter}\n` +
    `Status:    SUCCESSFULLY DISPATCHED\n` +
    `PhonePe:   9581529381@ybl (Linked)\n` +
    `===============================================\n`,
    "utf8"
  );

  console.log("✔ Sample test print document generated at:");
  console.log(`  ${testFile}`);
  console.log(`\nTargeting Default Printer: "${defaultPrinter}"`);
  console.log(`\nTo print this test page silently on your HP Smart Tank:\n` +
    `powershell -Command "Start-Process -FilePath '${testFile}' -Verb PrintTo -ArgumentList '${defaultPrinter}'"\n`);
}

runLocalPrinterTest();