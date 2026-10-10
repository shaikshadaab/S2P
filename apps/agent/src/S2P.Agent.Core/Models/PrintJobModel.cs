using System.Text.Json.Serialization;

namespace S2P.Agent.Core.Models;

public class PrintJobFileSnapshot
{
    [JsonPropertyName("fileId")]
    public string FileId { get; set; } = string.Empty;

    [JsonPropertyName("printerId")]
    public string? PrinterId { get; set; }

    [JsonPropertyName("sha256")]
    public string Sha256 { get; set; } = string.Empty;

    [JsonPropertyName("sizeBytes")]
    public long SizeBytes { get; set; }

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = "application/pdf";

    [JsonPropertyName("pageCount")]
    public int PageCount { get; set; } = 1;

    [JsonPropertyName("filename")]
    public string Filename { get; set; } = "document.pdf";
}

public class PrintJobLease
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("claimedAt")]
    public string ClaimedAt { get; set; } = string.Empty;

    [JsonPropertyName("expiresAt")]
    public string ExpiresAt { get; set; } = string.Empty;
}

public class PrintJobModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("printerId")]
    public string? PrinterId { get; set; }

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("orderNumber")]
    public string OrderNumber { get; set; } = string.Empty;

    [JsonPropertyName("fileId")]
    public string FileId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("priority")]
    public int Priority { get; set; } = 1;

    [JsonPropertyName("attemptCount")]
    public int AttemptCount { get; set; } = 0;

    [JsonPropertyName("fileSnapshot")]
    public PrintJobFileSnapshot? FileSnapshot { get; set; }

    [JsonPropertyName("printConfigSnapshot")]
    public Dictionary<string, object>? PrintConfigSnapshot { get; set; }

    [JsonPropertyName("lease")]
    public PrintJobLease? Lease { get; set; }
}

public class ClaimResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("claimed")]
    public bool Claimed { get; set; }

    [JsonPropertyName("job")]
    public PrintJobModel? Job { get; set; }

    [JsonPropertyName("leaseToken")]
    public string? LeaseToken { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
