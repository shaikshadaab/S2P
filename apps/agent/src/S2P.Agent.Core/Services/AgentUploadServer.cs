using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using S2P.Agent.Core.Models;

namespace S2P.Agent.Core.Services;

public class AgentUploadServer : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly S2PAgentApiClient _apiClient;
    private readonly DeviceConfig _config;
    private readonly string _storageDir;
    private readonly int _port;
    private bool _isRunning;
    private CancellationTokenSource? _cts;

    public int Port => _port;
    public string StorageDirectory => _storageDir;

    public AgentUploadServer(S2PAgentApiClient apiClient, DeviceConfig config, int port = 5218)
    {
        _apiClient = apiClient;
        _config = config;
        _port = port;

        _storageDir = Path.Combine(AppContext.BaseDirectory, "storage", "orders");
        if (!Directory.Exists(_storageDir))
        {
            Directory.CreateDirectory(_storageDir);
        }

        try
        {
            _listener.Prefixes.Add($"http://localhost:{_port}/");
            _listener.Prefixes.Add($"http://127.0.0.1:{_port}/");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AgentUploadServer Prefix Warning] {ex.Message}");
        }
    }

    public void Start()
    {
        if (_isRunning) return;
        try
        {
            _listener.Start();
            _isRunning = true;
            _cts = new CancellationTokenSource();
            Task.Run(() => ListenLoopAsync(_cts.Token));
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[AGENT UPLOAD SERVER] Listening on http://127.0.0.1:{_port}/ (Private local files)");
            Console.ResetColor();
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[AGENT UPLOAD SERVER WARNING] Could not bind port {_port}: {ex.Message}");
            Console.ResetColor();
        }
    }

    private async Task ListenLoopAsync(CancellationToken ct)
    {
        while (_isRunning && !ct.IsCancellationRequested)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                _ = Task.Run(() => HandleRequestAsync(context));
            }
            catch (HttpListenerException) when (!_isRunning) { break; }
            catch (Exception ex)
            {
                if (_isRunning)
                {
                    Console.WriteLine($"[AgentUploadServer Error] {ex.Message}");
                }
            }
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var res = ctx.Response;

        // Apply CORS headers for browser direct uploads
        res.Headers.Add("Access-Control-Allow-Origin", "*");
        res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, x-upload-grant-id, x-upload-grant-token, x-relay-secret, x-device-id, x-device-secret");

        if (req.HttpMethod == "OPTIONS")
        {
            res.StatusCode = 200;
            res.Close();
            return;
        }

        var path = req.Url?.AbsolutePath ?? "/";

        try
        {
            if (path == "/" || path == "/health")
            {
                await WriteJsonAsync(res, 200, new
                {
                    status = "ONLINE",
                    deviceId = _config.DeviceId,
                    agentVersion = "1.0.0",
                    serverTime = DateTime.UtcNow.ToString("O"),
                    storageDirectory = _storageDir
                });
                return;
            }

            if (path == "/api/agent/upload" && req.HttpMethod == "POST")
            {
                await HandleUploadAsync(req, res);
                return;
            }

            res.StatusCode = 404;
            await WriteJsonAsync(res, 404, new { error = "NOT_FOUND", message = "Endpoint not found" });
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[Upload Server Request Error] {ex.Message}");
            Console.ResetColor();
            try
            {
                res.StatusCode = 500;
                await WriteJsonAsync(res, 500, new { error = "SERVER_ERROR", message = ex.Message });
            }
            catch { }
        }
    }

    private async Task HandleUploadAsync(HttpListenerRequest req, HttpListenerResponse res)
    {
        var grantId = req.Headers["x-upload-grant-id"] ?? req.QueryString["grantId"] ?? "";
        var grantToken = req.Headers["x-upload-grant-token"] ?? req.QueryString["token"] ?? "";
        var relaySecret = req.Headers["x-relay-secret"] ?? "";

        // Require grantId or relay secret
        if (string.IsNullOrEmpty(grantId) && string.IsNullOrEmpty(relaySecret))
        {
            res.StatusCode = 401;
            await WriteJsonAsync(res, 401, new { error = "UNAUTHORIZED", message = "Valid x-upload-grant-id required." });
            return;
        }

        // Read stream to memory or temp file
        string fileId = "f_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + "_" + Guid.NewGuid().ToString("N")[..8];
        string tempSavePath = Path.Combine(_storageDir, $"{fileId}.tmp");

        string originalName = "uploaded_file.pdf";
        string contentType = req.ContentType ?? "application/pdf";

        // Check if multipart form data
        if (contentType.Contains("multipart/form-data"))
        {
            // Parse boundary and extract binary stream
            var (parsedFilename, parsedMime, finalPath) = await ExtractMultipartFileAsync(req, fileId);
            originalName = parsedFilename;
            contentType = parsedMime;
            tempSavePath = finalPath;
        }
        else
        {
            // Direct binary stream
            originalName = req.Headers["x-filename"] ?? "document.pdf";
            await using var fs = File.Create(tempSavePath);
            await req.InputStream.CopyToAsync(fs);
        }

        if (!File.Exists(tempSavePath) || new FileInfo(tempSavePath).Length == 0)
        {
            res.StatusCode = 400;
            await WriteJsonAsync(res, 400, new { error = "EMPTY_FILE", message = "Uploaded file contains 0 bytes." });
            return;
        }

        var fileInfo = new FileInfo(tempSavePath);
        if (fileInfo.Length > 50 * 1024 * 1024)
        {
            File.Delete(tempSavePath);
            res.StatusCode = 413;
            await WriteJsonAsync(res, 413, new { error = "FILE_TOO_LARGE", message = "File exceeds 50MB limit." });
            return;
        }

        // Compute SHA-256
        string sha256;
        await using (var shaFs = File.OpenRead(tempSavePath))
        {
            using var sha = SHA256.Create();
            var hashBytes = await sha.ComputeHashAsync(shaFs);
            sha256 = Convert.ToHexString(hashBytes).ToLowerInvariant();
        }

        // Inspect Page Count (PDF regex scan or default 1)
        int pageCount = 1;
        if (contentType.Contains("pdf") || originalName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            pageCount = EstimatePdfPageCount(tempSavePath);
        }

        // Final safe destination
        string safeName = Path.GetFileNameWithoutExtension(originalName).Replace(" ", "_") + Path.GetExtension(originalName);
        string finalPathOnDisk = Path.Combine(_storageDir, $"{fileId}_{safeName}");
        if (File.Exists(finalPathOnDisk)) File.Delete(finalPathOnDisk);
        File.Move(tempSavePath, finalPathOnDisk);

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[FILE RECEIVED ON SHOP PC] {safeName} ({fileInfo.Length} bytes, {pageCount} pages)");
        Console.WriteLine($"  Private Local Path: {finalPathOnDisk}");
        Console.WriteLine($"  SHA-256:            {sha256}");
        Console.ResetColor();

        // Confirm with cloud backend
        var confirmPayload = new
        {
            grantId = grantId,
            fileId = fileId,
            sha256 = sha256,
            pageCount = pageCount,
            sizeBytes = fileInfo.Length,
            safeDisplayName = safeName,
            mimeType = contentType,
            localPath = finalPathOnDisk
        };

        try
        {
            var confirmResult = await _apiClient.ConfirmUploadAsync(_config, confirmPayload);
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[CLOUD CONFIRMED] File registered in Firestore orderFiles collection: {fileId}");
            Console.ResetColor();

            await WriteJsonAsync(res, 200, new
            {
                success = true,
                file = new
                {
                    id = fileId,
                    safeDisplayName = safeName,
                    mimeType = contentType,
                    sizeBytes = fileInfo.Length,
                    sha256 = sha256,
                    pageCount = pageCount,
                    storageMode = "LOCAL_AGENT"
                }
            });
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"[Confirm Warning] Backend confirmation error: {ex.Message}");
            Console.ResetColor();

            await WriteJsonAsync(res, 200, new
            {
                success = true,
                file = new
                {
                    id = fileId,
                    safeDisplayName = safeName,
                    mimeType = contentType,
                    sizeBytes = fileInfo.Length,
                    sha256 = sha256,
                    pageCount = pageCount,
                    storageMode = "LOCAL_AGENT"
                }
            });
        }
    }

    private static int EstimatePdfPageCount(string filePath)
    {
        try
        {
            var text = File.ReadAllText(filePath, Encoding.Latin1);
            var matches = System.Text.RegularExpressions.Regex.Matches(text, @"/Types*/Page[^s]");
            return matches.Count > 0 ? matches.Count : 1;
        }
        catch
        {
            return 1;
        }
    }

    private async Task<(string filename, string mime, string path)> ExtractMultipartFileAsync(HttpListenerRequest req, string fileId)
    {
        // Simple multipart parser for incoming FormFile
        using var ms = new MemoryStream();
        await req.InputStream.CopyToAsync(ms);
        var bytes = ms.ToArray();

        string filename = "uploaded_file.pdf";
        string mime = "application/pdf";

        // Find boundary from Content-Type
        var ct = req.ContentType ?? "";
        var bIndex = ct.IndexOf("boundary=", StringComparison.OrdinalIgnoreCase);
        string boundary = bIndex >= 0 ? "--" + ct[(bIndex + 9)..].Trim() : "";

        if (!string.IsNullOrEmpty(boundary))
        {
            var headerText = Encoding.Latin1.GetString(bytes, 0, Math.Min(bytes.Length, 4096));
            var fnMatch = System.Text.RegularExpressions.Regex.Match(headerText, @"filename=""([^""]+)""");
            if (fnMatch.Success) filename = fnMatch.Groups[1].Value;

            var ctMatch = System.Text.RegularExpressions.Regex.Match(headerText, @"Content-Type:s*([^
]+)");
            if (ctMatch.Success) mime = ctMatch.Groups[1].Value.Trim();

            // Find double CRLF delimiter indicating start of binary body
            byte[] doubleCrlf = new byte[] { 13, 10, 13, 10 };
            int bodyStart = FindByteSequence(bytes, doubleCrlf);
            if (bodyStart >= 0)
            {
                bodyStart += 4;
                byte[] boundaryBytes = Encoding.Latin1.GetBytes(boundary);
                int bodyEnd = FindByteSequence(bytes, boundaryBytes, bodyStart);
                if (bodyEnd < 0) bodyEnd = bytes.Length;
                else if (bodyEnd >= 2 && bytes[bodyEnd - 2] == 13 && bytes[bodyEnd - 1] == 10) bodyEnd -= 2;

                int length = Math.Max(0, bodyEnd - bodyStart);
                string outPath = Path.Combine(_storageDir, $"{fileId}.tmp");
                await File.WriteAllBytesAsync(outPath, bytes.AsSpan(bodyStart, length).ToArray());
                return (filename, mime, outPath);
            }
        }

        string fallbackPath = Path.Combine(_storageDir, $"{fileId}.tmp");
        await File.WriteAllBytesAsync(fallbackPath, bytes);
        return (filename, mime, fallbackPath);
    }

    private static int FindByteSequence(byte[] source, byte[] pattern, int start = 0)
    {
        for (int i = start; i <= source.Length - pattern.Length; i++)
        {
            bool match = true;
            for (int j = 0; j < pattern.Length; j++)
            {
                if (source[i + j] != pattern[j])
                {
                    match = false;
                    break;
                }
            }
            if (match) return i;
        }
        return -1;
    }

    private static async Task WriteJsonAsync(HttpListenerResponse res, int statusCode, object obj)
    {
        res.StatusCode = statusCode;
        res.ContentType = "application/json";
        var json = JsonSerializer.Serialize(obj);
        var bytes = Encoding.UTF8.GetBytes(json);
        res.ContentLength64 = bytes.Length;
        await res.OutputStream.WriteAsync(bytes);
        res.Close();
    }

    public void Dispose()
    {
        _isRunning = false;
        _cts?.Cancel();
        try { _listener.Stop(); } catch { }
        try { _listener.Close(); } catch { }
    }
}
