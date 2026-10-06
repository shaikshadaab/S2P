using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using S2P.Agent.Core.Models;

namespace S2P.Agent.Core.Services;

public class S2PAgentApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public S2PAgentApiClient(string baseUrl, HttpClient? httpClient = null)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _httpClient = httpClient ?? new HttpClient();
    }

    public async Task<DeviceConfig> PairAsync(string pairingCode, string? deviceName = null)
    {
        var url = $"{_baseUrl}/api/agent/pair";
        var payload = new
        {
            pairingCode = pairingCode.Trim().ToUpperInvariant(),
            deviceName = deviceName ?? Environment.MachineName,
            hostname = Environment.MachineName,
            windowsVersion = Environment.OSVersion.ToString(),
            agentVersion = "0.1.0"
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(url, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Pairing failed ({response.StatusCode}): {json}");
        }

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new DeviceConfig
        {
            DeviceId = root.GetProperty("deviceId").GetString()!,
            DeviceSecret = root.GetProperty("deviceSecret").GetString()!,
            ShopId = root.GetProperty("shopId").GetString()!,
            OrganizationId = root.GetProperty("organizationId").GetString()!,
            BackendBaseUrl = _baseUrl,
            AgentVersion = "0.1.0"
        };
    }

    public async Task<bool> SendHeartbeatAsync(DeviceConfig config)
    {
        var url = $"{_baseUrl}/api/agent/heartbeat";
        var payload = new
        {
            deviceId = config.DeviceId,
            deviceSecret = config.DeviceSecret,
            hostname = Environment.MachineName,
            windowsVersion = Environment.OSVersion.ToString(),
            agentVersion = config.AgentVersion
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);

        var response = await _httpClient.SendAsync(request);
        if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            var err = await response.Content.ReadAsStringAsync();
            if (err.Contains("DEVICE_REVOKED"))
            {
                throw new UnauthorizedAccessException("DEVICE_REVOKED");
            }
        }

        return response.IsSuccessStatusCode;
    }

    public async Task<int> SyncPrintersAsync(DeviceConfig config, List<DiscoveredPrinter> printers)
    {
        var url = $"{_baseUrl}/api/agent/printers/sync";
        var payload = new
        {
            deviceId = config.DeviceId,
            deviceSecret = config.DeviceSecret,
            queues = printers
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Printer sync failed ({response.StatusCode}): {json}");
        }

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("syncedCount").GetInt32();
    }

    public async Task<ClaimResponse> ClaimJobAsync(DeviceConfig config)
    {
        var url = $"{_baseUrl}/api/agent/jobs/claim";
        var payload = new
        {
            deviceId = config.DeviceId,
            deviceSecret = config.DeviceSecret
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Job claim failed ({response.StatusCode}): {json}");
        }

        return JsonSerializer.Deserialize<ClaimResponse>(json) ?? new ClaimResponse();
    }

    public async Task<string> RenewLeaseAsync(DeviceConfig config, string jobId, string leaseToken)
    {
        var url = $"{_baseUrl}/api/agent/jobs/{jobId}/renew";
        var payload = new
        {
            deviceId = config.DeviceId,
            deviceSecret = config.DeviceSecret,
            leaseToken = leaseToken
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);
        request.Headers.Add("x-lease-token", leaseToken);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Lease renewal failed ({response.StatusCode}): {json}");
        }

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("expiresAt").GetString()!;
    }

    public async Task<string> DownloadFileAsync(DeviceConfig config, string jobId, string leaseToken, string targetFilePath)
    {
        var url = $"{_baseUrl}/api/agent/jobs/{jobId}/file";
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);
        request.Headers.Add("x-lease-token", leaseToken);

        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"File download failed ({response.StatusCode}): {err}");
        }

        var expectedSha = response.Headers.TryGetValues("X-File-Sha256", out var vals) ? vals.FirstOrDefault() : null;

        await using (var fileStream = File.Create(targetFilePath))
        {
            await response.Content.CopyToAsync(fileStream);
        }

        return expectedSha ?? string.Empty;
    }

    public async Task UpdateJobStatusAsync(
        DeviceConfig config,
        string jobId,
        string leaseToken,
        string newStatus,
        string? errorCode = null,
        string? errorMessage = null)
    {
        var url = $"{_baseUrl}/api/agent/jobs/{jobId}/status";
        var payload = new
        {
            deviceId = config.DeviceId,
            deviceSecret = config.DeviceSecret,
            leaseToken = leaseToken,
            status = newStatus,
            errorCode = errorCode,
            errorMessage = errorMessage
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-device-id", config.DeviceId);
        request.Headers.Add("x-device-secret", config.DeviceSecret);
        request.Headers.Add("x-lease-token", leaseToken);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Job status update failed ({response.StatusCode}): {json}");
        }
    }
}
