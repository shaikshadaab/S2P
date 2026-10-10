using S2P.Agent.Core.Printing;
using System.Diagnostics;
using System.Text.Json;
using S2P.Agent.Core.Database;
using S2P.Agent.Core.Discovery;
using S2P.Agent.Core.Models;
using S2P.Agent.Core.Security;
using S2P.Agent.Core.Services;

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.WriteLine("==========================================================");
Console.WriteLine("          SOS PRINT — WINDOWS PRINT SPOOLER AGENT         ");
Console.WriteLine("      Shakeel Online Services, Guntur · Real Spooler      ");
Console.WriteLine("==========================================================\n");

var argsList = args.ToList();
var tempManager = new AgentTempFileManager();
tempManager.CleanupStaleTempFiles(TimeSpan.FromHours(24));
var credStore = new WindowsCredentialStore();

await using var db = new LocalAgentDatabase();
await db.InitializeAsync();

// Default production URL
string defaultBackendUrl = "https://sos-print.vercel.app";
string backendUrl = defaultBackendUrl;
if (argsList.Contains("--url"))
{
    var urlIdx = argsList.IndexOf("--url");
    if (urlIdx + 1 < argsList.Count) backendUrl = argsList[urlIdx + 1];
}

// Check for unpair/reset
if (argsList.Contains("--unpair") || argsList.Contains("--reset"))
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("[RESET] Clearing stored DPAPI credentials and local database...");
    credStore.SaveCredentials(new DeviceConfig { DeviceId = "", DeviceSecret = "", BackendBaseUrl = "" });
    Console.WriteLine("[RESET] Local pairing cleared. You may now re-pair with a new code.");
    Console.ResetColor();
    return;
}

// 1. Pairing Mode
string pairCode = "";
if (argsList.Contains("--pair"))
{
    var pairIdx = argsList.IndexOf("--pair");
    if (pairIdx + 1 < argsList.Count && !argsList[pairIdx + 1].StartsWith("--"))
    {
        pairCode = argsList[pairIdx + 1].Trim();
    }
}

var currentConfig = credStore.LoadCredentials();
bool needsPairing = (currentConfig == null || string.IsNullOrWhiteSpace(currentConfig.DeviceId));

if (needsPairing && string.IsNullOrWhiteSpace(pairCode))
{
    // Interactive Pairing Prompt
    if (!Console.IsInputRedirected)
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("----------------------------------------------------------");
        Console.WriteLine("        WINDOWS AGENT PAIRING WITH SHOP DASHBOARD        ");
        Console.WriteLine("----------------------------------------------------------");
        Console.WriteLine("This PC is not yet paired with Shakeel Online Services.");
        Console.WriteLine("1. Open Dashboard: https://sos-print.vercel.app/dashboard/printers");
        Console.WriteLine("2. Click 'Pair New Windows PC' to generate a 6-digit code.\n");
        Console.ResetColor();

        Console.Write("Enter 6-digit Pairing Code: ");
        pairCode = Console.ReadLine()?.Trim() ?? "";
    }
}

if (!string.IsNullOrWhiteSpace(pairCode))
{
    Console.WriteLine($"[Pairing] Contacting {backendUrl}/api/agent/pair with pairing code...");
    var pairClient = new S2PAgentApiClient(backendUrl);

    try
    {
        var newConfig = await pairClient.PairAsync(pairCode, Environment.MachineName);
        credStore.SaveCredentials(newConfig);
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"[PAIRED] Successfully paired! DeviceId: {newConfig.DeviceId}");
        Console.WriteLine("[SECURITY] Device credentials encrypted with Windows DPAPI (CurrentUser).");
        Console.ResetColor();
        currentConfig = newConfig;
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Pairing Error] {ex.Message}");
        Console.ResetColor();
        Console.WriteLine("\nPress any key to exit...");
        try { Console.ReadKey(); } catch { }
        return;
    }
}

// 2. Validate Credentials
var config = credStore.LoadCredentials();
if (config == null || string.IsNullOrWhiteSpace(config.DeviceId))
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("[PAIRING NEEDED] Windows agent is not yet paired with SOS Print.");
    Console.WriteLine("To pair your shop PC:");
    Console.WriteLine("  1. Launch start-agent.bat and enter your 6-digit code when prompted, OR");
    Console.WriteLine("  2. Run: S2P.Agent.Worker.exe --pair <6-digit-code> --url https://sos-print.vercel.app");
    Console.ResetColor();
    Console.WriteLine("\nPress any key to exit...");
    try { Console.ReadKey(); } catch { }
    return;
}
else
{
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine($"[CREDENTIALS LOADED] DPAPI decrypted DeviceId: {config.DeviceId}");
    Console.WriteLine($"  Backend URL: {config.BackendBaseUrl}");
    Console.ResetColor();
}

var client = new S2PAgentApiClient(config.BackendBaseUrl);

// 3. Crash Recovery Check
var unfinished = await db.GetUnfinishedLeasesAsync();
if (unfinished.Count > 0)
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine($"[RECOVERY] Found {unfinished.Count} uncompleted local lease(s) from previous run.");
    foreach (var item in unfinished)
    {
        Console.WriteLine($"  - Job {item.JobId}: Status={item.Status}. Safety invariant: No automatic physical reprint.");
        if (item.Status == "READY_TO_PRINT" && !string.IsNullOrEmpty(item.TempPath) && File.Exists(item.TempPath))
        {
            Console.WriteLine($"    [FILE PRESERVED] Retained temp file for operator recovery: {Path.GetFileName(item.TempPath)}");
        }
        else if (item.TempPath != null && File.Exists(item.TempPath))
        {
            tempManager.CleanupJobTempFile(item.TempPath);
            await db.ClearActiveLeaseAsync(item.JobId);
        }
        else
        {
            await db.ClearActiveLeaseAsync(item.JobId);
        }
    }
    Console.ResetColor();
}

// 4. Initial Heartbeat
Console.WriteLine("[Heartbeat] Sending initial heartbeat to backend...");
try
{
    var hbOk = await client.SendHeartbeatAsync(config);
    if (hbOk)
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("[Heartbeat] Device status is now ONLINE on shop dashboard.");
        Console.ResetColor();
    }
}
catch (UnauthorizedAccessException)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("[DEVICE REVOKED] This device was revoked by shop management. Please generate a new pairing code.");
    Console.ResetColor();
    return;
}

// 5. Windows Installed Printers Discovery
Console.WriteLine("[Discovery] Scanning installed Windows print queues...");
var discovered = WindowsPrinterDiscovery.DiscoverInstalledPrinters();
Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine($"[Discovery] Found {discovered.Count} installed Windows printer(s):");
foreach (var p in discovered)
{
    Console.WriteLine($"  * {p.DisplayName} [{p.PrinterKind} / {p.ConnectionType}] (Default: {p.IsDefault}, Driver: {p.DriverName})");
    Console.WriteLine($"    Capabilities: Color={p.Capabilities.ColorSupported}, Duplex={p.Capabilities.DuplexSupported}, Sizes=[{string.Join(", ", p.Capabilities.PaperSizes)}]");
}
Console.ResetColor();

try
{
    var synced = await client.SyncPrintersAsync(config, discovered);
    Console.WriteLine($"[Printer Sync] Synced {synced} printer(s) to cloud backend.");

    // Direct Controlled Physical Test Mode
    if (argsList.Contains("--controlled-test"))
    {
        Console.WriteLine("");
        Console.WriteLine("==========================================================");
        Console.WriteLine("    S2P CONTROLLED 1-PAGE PHYSICAL HARDWARE TEST MODE    ");
        Console.WriteLine("==========================================================");

        var targetPrinter = discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL" && p.DisplayName.Contains("HP Smart Tank"))
                           ?? discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL");
        if (targetPrinter == null)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("[ERROR] Physical printer not found!");
            Console.ResetColor();
            return;
        }

        string testFile = "test_visible_a4.pdf";
        if (argsList.Contains("--file"))
        {
            var fIdx = argsList.IndexOf("--file");
            if (fIdx + 1 < argsList.Count) testFile = argsList[fIdx + 1];
        }

        if (!File.Exists(testFile))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[ERROR] Test PDF file '{testFile}' not found!");
            Console.ResetColor();
            return;
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[HARDWARE TARGET] {targetPrinter.DisplayName}");
        Console.WriteLine($"  Queue Name:     {targetPrinter.QueueName}");
        Console.WriteLine($"  Port:           {targetPrinter.PortName}");
        Console.WriteLine($"  Driver:         {targetPrinter.DriverName}");
        Console.WriteLine($"  Test Document:  {Path.GetFullPath(testFile)}");
        Console.WriteLine($"  Expected Sheet: 1 PAGE / 1 COPY / B&W");
        Console.ResetColor();

        Console.WriteLine("");
        Console.WriteLine("[1/4] Capturing Windows Spooler queue state before submission...");
        var jobsBefore = WindowsSpoolerService.GetCurrentSpoolJobIds(targetPrinter.QueueName);
        Console.WriteLine($"  Active queue jobs before: {jobsBefore.Count}");

        Console.WriteLine("[2/4] Submitting test document to Windows Spooler via driver rendering engine...");
        var spooler = new WindowsSpoolerService();
        bool isDryRun = argsList.Contains("--dry-run");
        var result = spooler.SubmitToSpooler(targetPrinter.QueueName, "S2P_Physical_Hardware_Test", testFile, dryRun: isDryRun);

        if (!result.Success)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[SUBMISSION FAILED] {result.ErrorMessage}");
            Console.ResetColor();
            return;
        }

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("");
        Console.WriteLine("[3/4] SUCCESS: Windows Spooler Job Registered!");
        Console.WriteLine($"  Windows Spool Job ID: {result.SpoolJobId}");
        Console.WriteLine($"  Printer Queue:          {result.QueueName}");
        Console.WriteLine($"  Document Name:          {result.DocumentTitle}");
        Console.WriteLine($"  Rendering Method:       {result.RenderingMethod}");
        Console.WriteLine($"  Submission Timestamp:   {result.SubmittedAt:O}");
        Console.ResetColor();

        Console.WriteLine("");
        Console.WriteLine("[4/4] Hardware Spool Verification:");
        Console.WriteLine($"  Total Spool Submissions: 1");
        Console.WriteLine($"  Expected Physical Sheets: 1");
        Console.WriteLine(">> OBSERVATION REQUIRED: Please check printer for 1 physical printed page. <<");

        return;
    }
}
catch (Exception ex)
{
    Console.WriteLine($"[Printer Sync Warning] {ex.Message}");
}

// 6. Main Agent Execution Loop
Console.WriteLine();
Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("[AGENT READY] Monitoring S2P Cloud Queue... Press Ctrl+C to terminate.");
Console.ResetColor();

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (s, e) =>
{
    e.Cancel = true;
    cts.Cancel();
    Console.WriteLine("\n[Stopping] S2P Windows Agent shutting down safely...");
};

DateTime lastHeartbeat = DateTime.UtcNow;
bool singlePass = argsList.Contains("--single-pass");

while (!cts.IsCancellationRequested)
{
    try
    {
        // Periodic Heartbeat (~30 seconds)
        if ((DateTime.UtcNow - lastHeartbeat).TotalSeconds >= 30)
        {
            await client.SendHeartbeatAsync(config);
            lastHeartbeat = DateTime.UtcNow;
            await db.SetMarkerAsync("last_heartbeat", DateTime.UtcNow.ToString("O"));
        }

        // Poll & Claim Job
        var claim = await client.ClaimJobAsync(config);
        if (claim.Claimed && claim.Job != null && !string.IsNullOrEmpty(claim.LeaseToken))
        {
            var job = claim.Job;
            var leaseToken = claim.LeaseToken;

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"\n[JOB CLAIMED] Order #{job.OrderNumber} (Job ID: {job.Id})");
            Console.WriteLine($"  File: {job.FileSnapshot?.Filename} ({job.FileSnapshot?.PageCount} pages, {job.FileSnapshot?.SizeBytes} bytes)");
            Console.ResetColor();

            // Persist lease to SQLite
            await db.SaveActiveLeaseAsync(job.Id, leaseToken, job.Lease?.ExpiresAt ?? "", "LEASED");

            // Setup continuous background lease renewal (every 20 seconds) during long job processing
            using var renewCts = new CancellationTokenSource();
            var renewTask = Task.Run(async () =>
            {
                while (!renewCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(20), renewCts.Token);
                        if (renewCts.Token.IsCancellationRequested) break;

                        var newExpires = await client.RenewLeaseAsync(config, job.Id, leaseToken);
                        Console.WriteLine($"[Lease Auto-Renew] Renewed lease for job {job.Id} (New expiry: {newExpires})");
                        await db.UpdateLeaseExpiresAtAsync(job.Id, newExpires);
                    }
                    catch (OperationCanceledException) { break; }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Lease Renew Warning] Failed to renew lease: {ex.Message}");
                    }
                }
            });

            string? tempPath = null;
            try
            {
                // Transition: LEASED -> DOWNLOADING
                Console.WriteLine($"[Status] Transitioning job {job.Id} to DOWNLOADING...");
                await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "DOWNLOADING");
                await db.UpdateLeaseStatusAsync(job.Id, "DOWNLOADING");

                // Download file to temp
                tempPath = tempManager.AllocateJobTempPath(job.Id);
                Console.WriteLine($"[Download] Downloading authorized document to: {Path.GetFileName(tempPath)}...");

                var expectedSha = await client.DownloadFileAsync(config, job.Id, leaseToken, tempPath);
                if (string.IsNullOrEmpty(expectedSha) && job.FileSnapshot != null)
                {
                    expectedSha = job.FileSnapshot.Sha256;
                }

                // Verify SHA-256
                var actualSha = await AgentFileIntegrity.ComputeSha256Async(tempPath);
                Console.WriteLine($"  Expected SHA-256: {expectedSha}");
                Console.WriteLine($"  Actual SHA-256:   {actualSha}");

                if (!AgentFileIntegrity.VerifyHash(actualSha, expectedSha))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[INTEGRITY FAILURE] SHA-256 checksum mismatch! Rejecting print job.");
                    Console.ResetColor();

                    await client.UpdateJobStatusAsync(
                        config,
                        job.Id,
                        leaseToken,
                        "FAILED",
                        "FILE_HASH_MISMATCH",
                        "Downloaded file SHA-256 did not match authoritative snapshot"
                    );

                    tempManager.CleanupJobTempFile(tempPath);
                    await db.ClearActiveLeaseAsync(job.Id);
                    continue;
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[INTEGRITY OK] SHA-256 checksum verified perfectly.");
                Console.ResetColor();

                // Transition: DOWNLOADING -> READY_TO_PRINT
                Console.WriteLine($"[Status] Transitioning job {job.Id} to READY_TO_PRINT...");
                await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "READY_TO_PRINT");
                await db.UpdateLeaseStatusAsync(job.Id, "READY_TO_PRINT", tempPath, actualSha);

                Console.ForegroundColor = ConsoleColor.Magenta;
                Console.WriteLine($"[READY_TO_PRINT] Job {job.Id} verified and ready for spooler submission.");
                Console.WriteLine($"[TEMP FILE RETAINED] Preserved verified file at {tempPath}");
                Console.ResetColor();

                bool isDryRun = argsList.Contains("--dry-run");

                // Target physical printer selection based on mapped configuration
                DiscoveredPrinter? targetPrinter = null;

                // 1. Check if job has specific assigned printerId
                if (!string.IsNullOrEmpty(job.PrinterId))
                {
                    targetPrinter = discovered.FirstOrDefault(p =>
                        (p.QueueName == job.PrinterId || p.DisplayName == job.PrinterId) && p.PrinterKind == "PHYSICAL");
                }

                // 2. Match based on color mode capability
                if (targetPrinter == null)
                {
                    bool requiresColor = false;
                    if (job.PrintConfigSnapshot != null && job.PrintConfigSnapshot.TryGetValue("colorMode", out var cmObj))
                    {
                        var cm = cmObj?.ToString() ?? "";
                        requiresColor = cm.Equals("COLOR", StringComparison.OrdinalIgnoreCase);
                    }

                    if (requiresColor)
                    {
                        targetPrinter = discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL" && p.Capabilities.ColorSupported);
                    }
                    else
                    {
                        // Standard B&W physical printer (prefer HP Smart Tank if present, otherwise first physical printer)
                        targetPrinter = discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL" && p.DisplayName.Contains("HP Smart Tank"))
                                       ?? discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL");
                    }
                }

                if (targetPrinter == null)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"[DISPATCH ERROR] No physical printer found eligible for job {job.Id}! (Virtual printers rejected)");
                    Console.ResetColor();

                    await client.UpdateJobStatusAsync(
                        config,
                        job.Id,
                        leaseToken,
                        "FAILED",
                        "NO_PHYSICAL_PRINTER",
                        "No physical Windows printer queue available on paired device"
                    );
                    continue;
                }

                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"[DISPATCHING] Target Printer: {targetPrinter.DisplayName} (Queue: {targetPrinter.QueueName})");
                Console.ResetColor();

                // Irreversible Stage Model Boundary
                Console.WriteLine($"[Irreversible Boundary] Setting irreversibleStageReached = true for job {job.Id}...");
                await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "SUBMITTING");
                await db.UpdateLeaseStatusAsync(job.Id, "SUBMITTING");

                if (isDryRun)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[DRY RUN] Simulating spooler submission for job {job.Id}. Job preserved; not advancing to COMPLETED.");
                    Console.ResetColor();
                    continue;
                }

                // Native Win32 Spooler Submission
                var spooler = new WindowsSpoolerService();
                var spoolRes = spooler.SubmitToSpooler(
                    targetPrinter.QueueName,
                    $"S2P_Order_{job.OrderNumber}",
                    tempPath!,
                    dryRun: false
                );

                if (spoolRes.Success)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"[SPOOLER SUBMISSION SUCCESS] Windows Spool Job ID: {spoolRes.SpoolJobId}");
                    Console.WriteLine($"  Queue:     {spoolRes.QueueName}");
                    Console.WriteLine($"  Document:  {spoolRes.DocumentTitle}");
                    Console.WriteLine($"  Timestamp: {spoolRes.SubmittedAt:O}");
                    Console.ResetColor();

                    // Transition: SUBMITTED -> PRINTING
                    await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "SUBMITTED");
                    await db.UpdateLeaseStatusAsync(job.Id, "SUBMITTED");

                    await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "PRINTING");
                    await db.UpdateLeaseStatusAsync(job.Id, "PRINTING");

                    // Monitor queue: wait until spooler has sent job bytes to printer
                    Console.WriteLine("[Spooler Monitor] Waiting for spool queue to transfer bytes to printer...");
                    for (int wait = 0; wait < 8; wait++)
                    {
                        await Task.Delay(1000, cts.Token);
                        var activeJobs = WindowsSpoolerService.GetCurrentSpoolJobIds(targetPrinter.QueueName);
                        if (!activeJobs.Contains(spoolRes.SpoolJobId))
                        {
                            break;
                        }
                    }

                    // Transition to SPOOL_COMPLETED
                    await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "SPOOL_COMPLETED");
                    await db.UpdateLeaseStatusAsync(job.Id, "SPOOL_COMPLETED");

                    // Auto File Purge: Remove temporary document upon confirmed completion
                    Console.WriteLine($"[AUTO PURGE] Cleaning up temp document {Path.GetFileName(tempPath)}...");
                    tempManager.CleanupJobTempFile(tempPath);
                    await db.ClearActiveLeaseAsync(job.Id);

                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"[JOB COMPLETE] Order #{job.OrderNumber} (Job {job.Id}) sent to printer successfully!");
                    Console.ResetColor();
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"[SPOOLER ERROR] Submission failed: {spoolRes.ErrorMessage}");
                    Console.ResetColor();

                    await client.UpdateJobStatusAsync(
                        config,
                        job.Id,
                        leaseToken,
                        "STATUS_UNKNOWN",
                        "SPOOLER_SUBMISSION_FAILED",
                        spoolRes.ErrorMessage ?? "Windows Spooler submission error"
                    );
                }
            }
            finally
            {
                renewCts.Cancel();
                try { await renewTask; } catch { }
            }

            if (singlePass)
            {
                Console.WriteLine("[Single Pass] Completed single pass successfully.");
                break;
            }
        }
        else
        {
            if (singlePass)
            {
                Console.WriteLine("[Single Pass] Queue empty. Exiting.");
                break;
            }
            await Task.Delay(2500, cts.Token);
        }
    }
    catch (OperationCanceledException)
    {
        break;
    }
    catch (UnauthorizedAccessException)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("\n[DEVICE REVOKED] Device credentials rejected (Revoked). Please generate a new pairing code.");
        Console.ResetColor();
        break;
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Agent Loop Error] {ex.Message}");
        Console.ResetColor();
        if (singlePass) break;
        await Task.Delay(3000, cts.Token);
    }
}

Console.WriteLine("[Agent] Exiting cleanly.");
