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

// 1. Pairing Mode
if (argsList.Contains("--pair"))
{
    var pairIdx = argsList.IndexOf("--pair");
    var code = (pairIdx + 1 < argsList.Count) ? argsList[pairIdx + 1] : "";
    var url = "http://localhost:3000";
    if (argsList.Contains("--url"))
    {
        var urlIdx = argsList.IndexOf("--url");
        if (urlIdx + 1 < argsList.Count) url = argsList[urlIdx + 1];
    }

    if (string.IsNullOrWhiteSpace(code))
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("[Error] Please specify pairing code: --pair <6-digit-code>");
        Console.ResetColor();
        return;
    }

    Console.WriteLine($"[Pairing] Contacting {url}/api/agent/pair with code {code}...");
    var pairClient = new S2PAgentApiClient(url);

    try
    {
        var newConfig = await pairClient.PairAsync(code, Environment.MachineName);
        credStore.SaveCredentials(newConfig);
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"[PAIRED] Successfully paired! DeviceId: {newConfig.DeviceId}");
        Console.WriteLine("[SECURITY] Device secret encrypted with Windows DPAPI (CurrentUser).");
        Console.ResetColor();
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[Pairing Error] {ex.Message}");
        Console.ResetColor();
        return;
    }
}

// 2. Load Credentials
var config = credStore.LoadCredentials();
if (config == null)
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("[PAIRING NEEDED] Windows agent is not yet paired with S2P.");
    Console.WriteLine("To pair, run: S2P.Agent.Worker.exe --pair <6-digit-code> --url <backend-url>");
    Console.ResetColor();
    return;
}
else
{
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine($"[CREDENTIALS LOADED] DPAPI decrypted DeviceId: {config.DeviceId}");
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
        Console.WriteLine("[Heartbeat] Device status is now ONLINE.");
        Console.ResetColor();
    }
}
catch (UnauthorizedAccessException)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("[DEVICE REVOKED] This device was revoked by shop management. Exiting.");
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

        var targetPrinter = discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL" && p.DisplayName.Contains("HP Smart Tank"));
        if (targetPrinter == null)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("[ERROR] Physical printer 'HP Smart Tank' not found!");
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

        // 1. Capture queue before submission
        Console.WriteLine("");
        Console.WriteLine("[1/4] Capturing Windows Spooler queue state before submission...");
        var jobsBefore = WindowsSpoolerService.GetCurrentSpoolJobIds(targetPrinter.QueueName);
        Console.WriteLine($"  Active queue jobs before: {jobsBefore.Count}");

        // 2. Submit to Spooler
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

        // 3. Capture queue after submission
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("");
        Console.WriteLine("[3/4] SUCCESS: Windows Spooler Job Registered!");
        Console.WriteLine($"  Windows Spooler Job ID: {result.SpoolJobId}");
        Console.WriteLine($"  Printer Queue:          {result.QueueName}");
        Console.WriteLine($"  Document Name:          {result.DocumentTitle}");
        Console.WriteLine($"  Rendering Method:       {result.RenderingMethod}");
        Console.WriteLine($"  Data Format:            {result.DataType}");
        Console.WriteLine($"  Raw PDF Direct:         {result.RawPdfDirect}");
        Console.WriteLine($"  Submission Timestamp:   {result.SubmittedAt:O}");
        Console.ResetColor();

        // 4. Verification Check
        Console.WriteLine("");
        Console.WriteLine("[4/4] Hardware Spool Verification:");
        Console.WriteLine($"  Total Spool Submissions: 1");
        Console.WriteLine($"  Expected Physical Sheets: 1");
        Console.WriteLine(">> OBSERVATION REQUIRED: Please check the HP Smart Tank 580-590 series printer for 1 physical printed page. <<");

        return;
    }
    Console.WriteLine($"[Printer Sync] Synced {synced} printer(s) to cloud backend.");
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

                bool controlledTest = argsList.Contains("--controlled-test");
                bool isDryRun = argsList.Contains("--dry-run");

                if (controlledTest || isDryRun)
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine("[CONTROLLED SPOOLER SUBMISSION MODE ACTIVATED]");
                    Console.ResetColor();

                    // 1. Identify target physical printer
                    var targetPrinter = discovered.FirstOrDefault(p => p.PrinterKind == "PHYSICAL");
                    if (targetPrinter == null)
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("[ERROR] No physical printer found for spooler submission!");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.WriteLine($"[TARGET PRINTER] {targetPrinter.DisplayName} (Queue: {targetPrinter.QueueName})");

                        // 2. Irreversible Stage Model Boundary
                        Console.WriteLine($"[Irreversible Boundary] Setting irreversibleStageReached = true for job {job.Id}...");
                        await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "SUBMITTING");
                        await db.UpdateLeaseStatusAsync(job.Id, "SUBMITTING");

                        // 3. Spooler Submission
                        var spooler = new WindowsSpoolerService();
                        var spoolRes = spooler.SubmitToSpooler(
                            targetPrinter.QueueName,
                            $"S2P_Order_{job.OrderNumber}",
                            tempPath!,
                            dryRun: isDryRun
                        );

                        if (spoolRes.Success)
                        {
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"[SPOOLER SUBMISSION SUCCESS] Windows Spool Job ID: {spoolRes.SpoolJobId}");
                            Console.WriteLine($"  Queue: {spoolRes.QueueName}");
                            Console.WriteLine($"  Title: {spoolRes.DocumentTitle}");
                            Console.WriteLine($"  Timestamp: {spoolRes.SubmittedAt:O}");
                            Console.ResetColor();

                            // Transition: SUBMITTED -> PRINTING -> COMPLETED
                            await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "SUBMITTED");
                            await db.UpdateLeaseStatusAsync(job.Id, "SUBMITTED");

                            await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "PRINTING");
                            await db.UpdateLeaseStatusAsync(job.Id, "PRINTING");

                            await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "COMPLETED");
                            await db.UpdateLeaseStatusAsync(job.Id, "COMPLETED");

                            // Auto File Purge: Remove temporary document upon confirmed completion
                            Console.WriteLine($"[AUTO PURGE] Cleaning up temp document {Path.GetFileName(tempPath)}...");
                            tempManager.CleanupJobTempFile(tempPath);
                            await db.ClearActiveLeaseAsync(job.Id);
                            Console.WriteLine($"[JOB COMPLETE] Job {job.Id} completed successfully!");
                        }
                        else
                        {
                            Console.ForegroundColor = ConsoleColor.Red;
                            Console.WriteLine($"[SPOOLER ERROR] {spoolRes.ErrorMessage}");
                            Console.ResetColor();
                            await client.UpdateJobStatusAsync(config, job.Id, leaseToken, "STATUS_UNKNOWN");
                        }
                    }
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine(">> STOP BEFORE PHYSICAL PRINT: Controlled test flag (--controlled-test) required for physical spooling. <<");
                    Console.ResetColor();
                }
            }
            finally
            {
                // Stop the lease renewal background task
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
            await Task.Delay(2000, cts.Token);
        }
    }
    catch (OperationCanceledException)
    {
        break;
    }
    catch (UnauthorizedAccessException)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("\n[DEVICE REVOKED] Device credentials rejected (Revoked). Terminating agent.");
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
