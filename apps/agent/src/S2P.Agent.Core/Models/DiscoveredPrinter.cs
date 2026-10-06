using System.Text.Json.Serialization;

namespace S2P.Agent.Core.Models;

public class DiscoveredPrinter
{
    [JsonPropertyName("queueName")]
    public string QueueName { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("driverName")]
    public string DriverName { get; set; } = string.Empty;

    [JsonPropertyName("portName")]
    public string PortName { get; set; } = string.Empty;

    [JsonPropertyName("printerKind")]
    public string PrinterKind { get; set; } = "UNKNOWN"; // PHYSICAL, VIRTUAL, UNKNOWN

    [JsonPropertyName("connectionType")]
    public string ConnectionType { get; set; } = "UNKNOWN";

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; set; }

    [JsonPropertyName("isOnline")]
    public bool IsOnline { get; set; } = true;

    [JsonPropertyName("capabilities")]
    public PrinterCapabilities Capabilities { get; set; } = new();
}

public class PrinterCapabilities
{
    [JsonPropertyName("paperSizes")]
    public List<string> PaperSizes { get; set; } = new() { "A4" };

    [JsonPropertyName("colorSupported")]
    public bool ColorSupported { get; set; }

    [JsonPropertyName("duplexSupported")]
    public bool DuplexSupported { get; set; }

    [JsonPropertyName("supportedResolutionsDpi")]
    public List<int> SupportedResolutionsDpi { get; set; } = new() { 600 };
}
