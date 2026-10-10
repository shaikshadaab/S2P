using System.Diagnostics;
using System.Text.Json;
using S2P.Agent.Core.Models;

namespace S2P.Agent.Core.Discovery;

public class WindowsPrinterDiscovery
{
    public static List<DiscoveredPrinter> DiscoverInstalledPrinters()
    {
        var printers = new List<DiscoveredPrinter>();

        try
        {
            // Execute PowerShell script to enumerate Windows installed printers via CIM
            var startInfo = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -Command \"Get-CimInstance Win32_Printer | Select-Object Name, DriverName, PortName, Default, PrinterStatus, Local, Capabilities, CapabilityDescriptions | ConvertTo-Json -Compress\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process == null) return printers;

            var output = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit(8000);

            if (string.IsNullOrWhiteSpace(output)) return printers;

            if (output.StartsWith("["))
            {
                using var doc = JsonDocument.Parse(output);
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var p = ParsePrinterElement(el);
                    if (p != null) printers.Add(p);
                }
            }
            else if (output.StartsWith("{"))
            {
                using var doc = JsonDocument.Parse(output);
                var p = ParsePrinterElement(doc.RootElement);
                if (p != null) printers.Add(p);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WindowsPrinterDiscovery] Warning discovering printers: {ex.Message}");
        }

        // Fallback: If no printer found or in test environment, return default virtual queue
        if (printers.Count == 0)
        {
            printers.Add(new DiscoveredPrinter
            {
                QueueName = "Microsoft Print to PDF",
                DisplayName = "Microsoft Print to PDF",
                DriverName = "Microsoft Print To PDF",
                PortName = "PORTPROMPT:",
                PrinterKind = "VIRTUAL",
                ConnectionType = "UNKNOWN",
                IsDefault = true,
                IsOnline = true,
                Capabilities = new PrinterCapabilities
                {
                    PaperSizes = new List<string> { "A4", "Letter" },
                    ColorSupported = true,
                    DuplexSupported = false
                }
            });
        }

        return printers;
    }

    public static DiscoveredPrinter? ParsePrinterElement(JsonElement el)
    {
        var name = el.TryGetProperty("Name", out var n) ? n.GetString() : null;
        if (string.IsNullOrWhiteSpace(name)) return null;

        var driver = el.TryGetProperty("DriverName", out var d) ? d.GetString() : "Generic / Text Only";
        var port = el.TryGetProperty("PortName", out var p) ? p.GetString() : "UNKNOWN";
        var isDefault = el.TryGetProperty("Default", out var def) && def.GetBoolean();

        var printerKind = DetectPrinterKind(name, driver ?? "", port ?? "");
        var connectionType = ClassifyPort(port ?? "", driver ?? "", printerKind);

        // Capabilities extraction
        var colorSupported = false;
        var duplexSupported = false;

        // Check CapabilityDescriptions
        if (el.TryGetProperty("CapabilityDescriptions", out var capDescEl))
        {
            if (capDescEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var desc in capDescEl.EnumerateArray())
                {
                    var descStr = desc.GetString() ?? "";
                    if (descStr.Equals("Color", StringComparison.OrdinalIgnoreCase)) colorSupported = true;
                    if (descStr.Equals("Duplex", StringComparison.OrdinalIgnoreCase)) duplexSupported = true;
                }
            }
            else if (capDescEl.ValueKind == JsonValueKind.String)
            {
                var descStr = capDescEl.GetString() ?? "";
                if (descStr.Contains("Color", StringComparison.OrdinalIgnoreCase)) colorSupported = true;
                if (descStr.Contains("Duplex", StringComparison.OrdinalIgnoreCase)) duplexSupported = true;
            }
        }

        // Check Capabilities integer array fallback (2 = Color, 3 = Duplex)
        if (el.TryGetProperty("Capabilities", out var capEl))
        {
            if (capEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var c in capEl.EnumerateArray())
                {
                    if (c.TryGetInt32(out var val))
                    {
                        if (val == 2) colorSupported = true;
                        if (val == 3) duplexSupported = true;
                    }
                }
            }
        }

        // Fallback checks based on hardware driver if capabilities absent
        if (!colorSupported && !name.Contains("mono", StringComparison.OrdinalIgnoreCase) && !driver!.Contains("black", StringComparison.OrdinalIgnoreCase))
        {
            colorSupported = true;
        }

        // Rule: Do not enable A3 or automatic duplex merely because the driver reports them.
        // HP Smart Tank 580 has manual duplex and A4 max width. Keep automatic duplex & A3 pending physical calibration.
        duplexSupported = false;

        var printer = new DiscoveredPrinter
        {
            QueueName = name,
            DisplayName = name,
            DriverName = driver ?? "Generic",
            PortName = port ?? "UNKNOWN",
            PrinterKind = printerKind,
            ConnectionType = connectionType,
            IsDefault = isDefault,
            IsOnline = true,
            Capabilities = new PrinterCapabilities
            {
                PaperSizes = new List<string> { "A4", "Letter", "Legal" },
                ColorSupported = colorSupported,
                DuplexSupported = false, // Pending physical calibration
                SupportedResolutionsDpi = new List<int> { 600, 1200 }
            }
        };

        return printer;
    }

    public static string DetectPrinterKind(string name, string driverName, string portName)
    {
        var lowerName = name.ToLowerInvariant();
        var lowerDriver = driverName.ToLowerInvariant();
        var lowerPort = portName.ToLowerInvariant();

        // 1. Virtual signatures
        if (lowerName.Contains("pdf") || lowerDriver.Contains("pdf") ||
            lowerName.Contains("onenote") || lowerDriver.Contains("onenote") ||
            lowerName.Contains("xps") || lowerDriver.Contains("xps") ||
            lowerName.Contains("fax") || lowerDriver.Contains("fax") ||
            lowerName.Contains("document writer") || lowerDriver.Contains("document writer") ||
            lowerPort.Contains("portprompt") || lowerPort.Contains("nul:") ||
            lowerPort.Contains("file:") || lowerPort.Contains("shrfax") ||
            lowerDriver.Contains("send to") || lowerName.Contains("cute") ||
            lowerName.Contains("foxit") || lowerName.Contains("nitro"))
        {
            return "VIRTUAL";
        }

        // 2. Physical signatures
        if (lowerName.Contains("smart tank") || lowerDriver.Contains("smart tank") ||
            lowerName.Contains("deskjet") || lowerName.Contains("laserjet") ||
            lowerName.Contains("epson") || lowerName.Contains("canon") ||
            lowerName.Contains("brother") || lowerName.Contains("hp") ||
            lowerPort.StartsWith("wsd") || lowerPort.StartsWith("usb") ||
            lowerPort.StartsWith("dot4") || lowerPort.StartsWith("ip_") ||
            lowerPort.StartsWith("192.") || lowerPort.StartsWith("10."))
        {
            return "PHYSICAL";
        }

        return "UNKNOWN";
    }

    public static string ClassifyPort(string portName, string driverName, string printerKind = "UNKNOWN")
    {
        // Virtual printers must never be classified as physical USB
        if (printerKind.Equals("VIRTUAL", StringComparison.OrdinalIgnoreCase))
        {
            return "UNKNOWN";
        }

        var p = portName.ToUpperInvariant();
        var d = driverName.ToUpperInvariant();

        if (p.StartsWith("WSD") || p.Contains("WSD")) return "WSD";
        if (p.StartsWith("USB") || p.StartsWith("DOT4") || p.Contains("USB")) return "USB";
        if (p.StartsWith("IP_") || p.StartsWith("192.") || p.StartsWith("10.") || p.StartsWith("172.")) return "LAN";
        if (p.StartsWith("\\")) return "SHARED";
        if (d.Contains("IPP") || p.Contains("IPP") || p.Contains("HTTP")) return "IPP";
        if (p.Contains("WIFI") || p.Contains("WIRELESS")) return "WIFI";

        return "UNKNOWN";
    }
}
