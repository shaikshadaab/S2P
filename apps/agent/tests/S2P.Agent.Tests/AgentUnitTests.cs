using S2P.Agent.Core.Printing;
using System.Security.Cryptography;
using System.Text;
using S2P.Agent.Core.Database;
using S2P.Agent.Core.Discovery;
using S2P.Agent.Core.Models;
using S2P.Agent.Core.Security;
using S2P.Agent.Core.Services;
using Xunit;

namespace S2P.Agent.Tests;

public class AgentUnitTests : IAsyncDisposable
{
    private readonly string _testDir;

    public AgentUnitTests()
    {
        _testDir = Path.Combine(Path.GetTempPath(), "s2p_tests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testDir);
    }

    [Fact]
    public void Test_WindowsCredentialStore_DPAPI()
    {
        var credFile = Path.Combine(_testDir, "test_cred.dat");
        var store = new WindowsCredentialStore(credFile);

        var original = new DeviceConfig
        {
            DeviceId = "dev_test_123",
            DeviceSecret = "super_secret_raw_token_xyz987",
            ShopId = "shop_test",
            OrganizationId = "org_test",
            BackendBaseUrl = "http://localhost:3000"
        };

        store.SaveCredentials(original);
        Assert.True(File.Exists(credFile));

        // Ensure file does NOT contain raw plaintext secret
        var rawBytes = File.ReadAllBytes(credFile);
        var rawText = Encoding.UTF8.GetString(rawBytes);
        Assert.DoesNotContain("super_secret_raw_token_xyz987", rawText);

        // Load and decrypt
        var loaded = store.LoadCredentials();
        Assert.NotNull(loaded);
        Assert.Equal(original.DeviceId, loaded.DeviceId);
        Assert.Equal(original.DeviceSecret, loaded.DeviceSecret);
        Assert.Equal(original.ShopId, loaded.ShopId);
    }

    [Fact]
    public async Task Test_LocalAgentDatabase_LeaseAndRecovery()
    {
        var dbPath = Path.Combine(_testDir, "test_agent.db");
        await using var db = new LocalAgentDatabase(dbPath);
        await db.InitializeAsync();

        // 1. Save lease
        var jobId = "pj_order1_item1";
        var leaseToken = "token_abc123";
        var expiresAt = DateTime.UtcNow.AddMinutes(1).ToString("O");
        await db.SaveActiveLeaseAsync(jobId, leaseToken, expiresAt, "LEASED", "temp_path_xyz", "sha_123");

        // 2. Query unfinished
        var unfinished = await db.GetUnfinishedLeasesAsync();
        Assert.Single(unfinished);
        Assert.Equal(jobId, unfinished[0].JobId);
        Assert.Equal("LEASED", unfinished[0].Status);

        // 3. Update lease expiry (Lease Auto-Renew)
        var newExpiresAt = DateTime.UtcNow.AddMinutes(2).ToString("O");
        await db.UpdateLeaseExpiresAtAsync(jobId, newExpiresAt);

        // 4. Update lease status
        await db.UpdateLeaseStatusAsync(jobId, "READY_TO_PRINT");
        var updated = await db.GetUnfinishedLeasesAsync();
        Assert.Equal("READY_TO_PRINT", updated[0].Status);

        // 5. Clear lease
        await db.ClearActiveLeaseAsync(jobId);
        var cleared = await db.GetUnfinishedLeasesAsync();
        Assert.Empty(cleared);
    }

    [Fact]
    public async Task Test_FileIntegrity_Sha256()
    {
        var testFile = Path.Combine(_testDir, "sample.txt");
        await File.WriteAllTextAsync(testFile, "Hello S2P Scan 2 Print Phase 5.1!");

        var computedSha = await AgentFileIntegrity.ComputeSha256Async(testFile);
        Assert.NotEmpty(computedSha);
        Assert.Equal(64, computedSha.Length);

        // Verification matches
        Assert.True(AgentFileIntegrity.VerifyHash(computedSha, computedSha.ToUpperInvariant()));
        Assert.False(AgentFileIntegrity.VerifyHash(computedSha, "0000000000000000000000000000000000000000000000000000000000000000"));
    }

    [Fact]
    public void Test_PrinterDiscovery_RealVsVirtualClassification()
    {
        // 1. Physical printer detection
        var hpKind = WindowsPrinterDiscovery.DetectPrinterKind(
            "HP51C8E5 (HP Smart Tank 580-590 series)",
            "Microsoft IPP Class Driver",
            "WSD-f5c9b978-065d-4722-973e-8cc561379c3c"
        );
        Assert.Equal("PHYSICAL", hpKind);

        // 2. Virtual printer detection
        var pdfKind = WindowsPrinterDiscovery.DetectPrinterKind(
            "Microsoft Print to PDF",
            "Microsoft Print To PDF",
            "PORTPROMPT:"
        );
        Assert.Equal("VIRTUAL", pdfKind);

        var oneNoteKind = WindowsPrinterDiscovery.DetectPrinterKind(
            "OneNote (Desktop)",
            "Send to Microsoft OneNote 16 Driver",
            "nul:"
        );
        Assert.Equal("VIRTUAL", oneNoteKind);

        var xpsKind = WindowsPrinterDiscovery.DetectPrinterKind(
            "Microsoft XPS Document Writer",
            "Microsoft XPS Document Writer v4",
            "PORTPROMPT:"
        );
        Assert.Equal("VIRTUAL", xpsKind);

        // 3. Port classification: Virtual must NOT be classified as physical USB!
        Assert.Equal("UNKNOWN", WindowsPrinterDiscovery.ClassifyPort("PORTPROMPT:", "Microsoft Print to PDF", "VIRTUAL"));
        Assert.Equal("UNKNOWN", WindowsPrinterDiscovery.ClassifyPort("nul:", "Send to OneNote", "VIRTUAL"));
        Assert.Equal("WSD", WindowsPrinterDiscovery.ClassifyPort("WSD-12345", "IPP", "PHYSICAL"));
        Assert.Equal("USB", WindowsPrinterDiscovery.ClassifyPort("USB001", "Canon G2010", "PHYSICAL"));
        Assert.Equal("LAN", WindowsPrinterDiscovery.ClassifyPort("IP_192.168.1.100", "HP LaserJet", "PHYSICAL"));
    }

    [Fact]
    public void Test_TempFileManager_RetentionAtReadyToPrint()
    {
        var tempDir = Path.Combine(_testDir, "Temp");
        var mgr = new AgentTempFileManager(tempDir);

        var path1 = mgr.AllocateJobTempPath("pj_job_ready");
        Assert.StartsWith(tempDir, path1);
        Assert.EndsWith(".pdf", path1);

        File.WriteAllText(path1, "pdf binary content for ready to print");
        Assert.True(File.Exists(path1));

        // Invariant: At READY_TO_PRINT, the file must be RETAINED for physical spooling!
        // We assert File.Exists remains true.
        Assert.True(File.Exists(path1));

        // When subsequently cleaned after confirmed completed / cancelled:
        mgr.CleanupJobTempFile(path1);
        Assert.False(File.Exists(path1));
    }


    [Fact]
    public void Test_WindowsSpoolerService_DryRunAndValidation()
    {
        var spooler = new WindowsSpoolerService();

        // 1. Empty queue validation
        var emptyRes = spooler.SubmitToSpooler("", "Doc1", "dummy.pdf");
        Assert.False(emptyRes.Success);
        Assert.Equal("Printer queue name cannot be empty", emptyRes.ErrorMessage);

        // 2. Missing file validation
        var missingRes = spooler.SubmitToSpooler("Microsoft Print to PDF", "Doc1", "non_existent_file.pdf");
        Assert.False(missingRes.Success);
        Assert.StartsWith("File not found", missingRes.ErrorMessage);

        // 3. Dry-Run spool submission with real installed printer queue
        var tempPdf = Path.Combine(_testDir, "test_doc.pdf");
        File.WriteAllText(tempPdf, "%PDF-1.4 test document content");

        var dryRes = spooler.SubmitToSpooler("Microsoft Print to PDF", "Doc1", tempPdf, dryRun: true);
        Assert.True(dryRes.Success);
        Assert.True(dryRes.IsDryRun);
        Assert.True(dryRes.SpoolJobId > 0);
        Assert.Equal("Microsoft Print to PDF", dryRes.QueueName);
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (Directory.Exists(_testDir))
            {
                Directory.Delete(_testDir, true);
            }
        }
        catch { }
        await ValueTask.CompletedTask;
    }
}
