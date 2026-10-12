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

    public string AllocateJobTempPath(string jobId, string? originalFilename = null, string? mimeType = null)
    {
        var safeJobId = jobId.Replace("/", "_").Replace("\\", "_");
        string ext = ".bin";

        if (!string.IsNullOrWhiteSpace(originalFilename))
        {
            var rawExt = Path.GetExtension(originalFilename).ToLowerInvariant();
            if (rawExt is ".pdf" or ".jpg" or ".jpeg" or ".png" or ".bmp" or ".webp")
            {
                ext = rawExt;
            }
        }

        if (ext == ".bin" && !string.IsNullOrWhiteSpace(mimeType))
        {
            ext = mimeType.ToLowerInvariant() switch
            {
                "application/pdf" => ".pdf",
                "image/jpeg" or "image/jpg" => ".jpg",
                "image/png" => ".png",
                "image/bmp" => ".bmp",
                "image/webp" => ".webp",
                _ => ".bin"
            };
        }

        if (ext == ".bin")
        {
            ext = ".pdf"; // default fallback for documents
        }

        var fileName = $"s2p_job_{safeJobId}_{Guid.NewGuid():N}{ext}";
        return Path.Combine(_tempDirectory, fileName);
    }

    public static string ValidateAndNormalizeExtensionByMagicBytes(string filePath)
    {
        if (!File.Exists(filePath)) return filePath;

        try
        {
            byte[] header = new byte[16];
            using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                int read = fs.Read(header, 0, header.Length);
                if (read < 4) return filePath;
            }

            string detectedExt = "";
            // PDF: %PDF (0x25 0x50 0x44 0x46)
            if (header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46)
            {
                detectedExt = ".pdf";
            }
            // JPEG: 0xFF 0xD8 0xFF
            else if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            {
                detectedExt = ".jpg";
            }
            // PNG: 0x89 0x50 0x4E 0x47 (89 'P' 'N' 'G')
            else if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            {
                detectedExt = ".png";
            }
            // BMP: 'B' 'M' (0x42 0x4D)
            else if (header[0] == 0x42 && header[1] == 0x4D)
            {
                detectedExt = ".bmp";
            }
            // WEBP: RIFF....WEBP
            else if (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                     header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
            {
                detectedExt = ".webp";
            }

            if (!string.IsNullOrEmpty(detectedExt))
            {
                string currentExt = Path.GetExtension(filePath).ToLowerInvariant();
                if (currentExt != detectedExt && !(currentExt == ".jpeg" && detectedExt == ".jpg"))
                {
                    string newPath = Path.ChangeExtension(filePath, detectedExt);
                    if (File.Exists(newPath)) File.Delete(newPath);
                    File.Move(filePath, newPath);
                    Console.WriteLine($"[AgentTempFileManager] Corrected file extension from '{currentExt}' to '{detectedExt}' based on true file signature: {Path.GetFileName(newPath)}");
                    return newPath;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AgentTempFileManager] Warning detecting magic bytes: {ex.Message}");
        }

        return filePath;
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
            var files = Directory.GetFiles(_tempDirectory, "s2p_job_*");
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
