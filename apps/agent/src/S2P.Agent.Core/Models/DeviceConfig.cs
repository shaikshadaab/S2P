namespace S2P.Agent.Core.Models;

public class DeviceConfig
{
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceSecret { get; set; } = string.Empty;
    public string ShopId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string BackendBaseUrl { get; set; } = "http://localhost:3000";
    public string AgentVersion { get; set; } = "0.1.0";
}
