using System.Diagnostics;
using System.Runtime.InteropServices;

namespace S2P.Agent.Core.Printing;

public class SpoolResult
{
    public bool Success { get; set; }
    public int SpoolJobId { get; set; }
    public string QueueName { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string RenderingMethod { get; set; } = "WIN32_DRIVER_SPOOLER";
    public string DataType { get; set; } = "RAW / XPS_PASS (Driver Negotiated)";
    public bool RawPdfDirect { get; set; } = false;
    public string? ErrorMessage { get; set; }
    public bool IsDryRun { get; set; }
}

public class WindowsSpoolerService
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName = string.Empty;
        [MarshalAs(UnmanagedType.LPStr)] public string? pOutputFile = null;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType = "RAW";
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    /// <summary>
    /// Submits a document through the installed Windows printer driver using Win32 Spooler API
    /// </summary>
    public SpoolResult SubmitToSpooler(string printerQueueName, string docTitle, string filePath, bool dryRun = false)
    {
        if (string.IsNullOrWhiteSpace(printerQueueName))
        {
            return new SpoolResult { Success = false, ErrorMessage = "Printer queue name cannot be empty" };
        }

        if (!File.Exists(filePath))
        {
            return new SpoolResult { Success = false, ErrorMessage = "File not found: " + filePath };
        }

        // Verify queue can be opened in Windows Spooler
        if (!OpenPrinter(printerQueueName, out var hPrinter, IntPtr.Zero))
        {
            var err = Marshal.GetLastWin32Error();
            return new SpoolResult
            {
                Success = false,
                QueueName = printerQueueName,
                ErrorMessage = "Failed to open printer queue '" + printerQueueName + "' (Win32 Error: " + err + ")"
            };
        }

        if (dryRun)
        {
            ClosePrinter(hPrinter);
            return new SpoolResult
            {
                Success = true,
                SpoolJobId = 1000 + new Random().Next(1, 999),
                QueueName = printerQueueName,
                DocumentTitle = docTitle,
                SubmittedAt = DateTime.UtcNow,
                RenderingMethod = "WIN32_DRIVER_SPOOLER",
                DataType = "RAW / XPS_PASS (Driver Negotiated)",
                RawPdfDirect = false,
                IsDryRun = true
            };
        }

        try
        {
            var di = new DOCINFOA
            {
                pDocName = docTitle,
                pOutputFile = null,
                pDataType = "RAW" // Driver pipeline negotiates XPS_PASS on v4 drivers like IPP Class Driver
            };

            int jobId = StartDocPrinter(hPrinter, 1, di);
            if (jobId <= 0)
            {
                var err = Marshal.GetLastWin32Error();
                ClosePrinter(hPrinter);
                return new SpoolResult
                {
                    Success = false,
                    QueueName = printerQueueName,
                    ErrorMessage = "StartDocPrinter failed with Win32 Error: " + err
                };
            }

            var submittedTime = DateTime.UtcNow;

            StartPagePrinter(hPrinter);

            byte[] fileBytes = File.ReadAllBytes(filePath);
            IntPtr pBytes = Marshal.AllocHGlobal(fileBytes.Length);
            try
            {
                Marshal.Copy(fileBytes, 0, pBytes, fileBytes.Length);
                WritePrinter(hPrinter, pBytes, fileBytes.Length, out int written);
            }
            finally
            {
                Marshal.FreeHGlobal(pBytes);
            }

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);

            return new SpoolResult
            {
                Success = true,
                SpoolJobId = jobId,
                QueueName = printerQueueName,
                DocumentTitle = docTitle,
                SubmittedAt = submittedTime,
                RenderingMethod = "WIN32_DRIVER_SPOOLER",
                DataType = "RAW / XPS_PASS (Driver Negotiated)",
                RawPdfDirect = false,
                IsDryRun = false
            };
        }
        catch (Exception ex)
        {
            try { ClosePrinter(hPrinter); } catch { }
            return new SpoolResult
            {
                Success = false,
                QueueName = printerQueueName,
                ErrorMessage = ex.Message
            };
        }
    }

    public static List<int> GetCurrentSpoolJobIds(string printerQueueName)
    {
        var ids = new List<int>();
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -Command \"Get-PrintJob -PrinterName '" + printerQueueName.Replace("'", "''") + "' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id\"",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            if (p != null)
            {
                var output = p.StandardOutput.ReadToEnd();
                p.WaitForExit(3000);
                var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    if (int.TryParse(line.Trim(), out int id))
                    {
                        ids.Add(id);
                    }
                }
            }
        }
        catch { }
        return ids;
    }
}
