namespace S2P.Agent.Core.Services;

public class AgentTempFileManager
{
    private readonly string _tempDirectory;

    public AgentTempFileManager(string? customTempDir = null)
    {
        if (!string.IsNullOrEmpty(customTempDir))
        {
            _tempDirectory = customTempDir;
        }
        else
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _tempDirectory = Path.Combine(localAppData, "S2P", "Temp");
        }

        Directory.CreateDirectory(_tempDirectory);
    }

    public string TempDirectory => _tempDirectory;

    public string AllocateJobTempPath(string jobId)
    {
        var safeJobId = jobId.Replace("/", "_").Replace("\\", "_");
        var fileName = $"s2p_job_{safeJobId}_{Guid.NewGuid():N}.pdf";
        return Path.Combine(_tempDirectory, fileName);
    }

    public void CleanupJobTempFile(string filePath)
    {
        try
        {
            if (File.Exists(filePath) && filePath.StartsWith(_tempDirectory, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(filePath);
                Console.WriteLine($"[AgentTempFileManager] Cleaned up temporary document: {Path.GetFileName(filePath)}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AgentTempFileManager] Warning cleaning temp file: {ex.Message}");
        }
    }

    public void CleanupStaleTempFiles(TimeSpan maxAge)
    {
        try
        {
            if (!Directory.Exists(_tempDirectory)) return;

            var cutoff = DateTime.UtcNow - maxAge;
            var files = Directory.GetFiles(_tempDirectory, "s2p_job_*.pdf");
            foreach (var f in files)
            {
                var fi = new FileInfo(f);
                if (fi.LastWriteTimeUtc < cutoff)
                {
                    try
                    {
                        fi.Delete();
                        Console.WriteLine($"[AgentTempFileManager] Purged stale temp file on startup: {fi.Name}");
                    }
                    catch { }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AgentTempFileManager] Warning during startup temp cleanup: {ex.Message}");
        }
    }
}
