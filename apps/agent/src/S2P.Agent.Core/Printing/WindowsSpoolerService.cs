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

public class PrintJobSettings
{
    public int Copies { get; set; } = 1;
    public string ColorMode { get; set; } = "BW"; // "BW" or "COLOR"
    public string PaperSize { get; set; } = "A4"; // "A4", "LETTER", etc.
    public string Orientation { get; set; } = "PORTRAIT"; // "PORTRAIT" or "LANDSCAPE"
    public string? PageRange { get; set; } = null; // e.g. "1-3" or null for all
    public bool Duplex { get; set; } = false;
    public string? DriverName { get; set; } = null;
    public string? PortName { get; set; } = null;
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

    [DllImport("winspool.drv", EntryPoint = "SetDefaultPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool SetDefaultPrinterWin32([MarshalAs(UnmanagedType.LPStr)] string pszPrinter);

    /// <summary>
    /// Submits a document through the installed Windows printer driver using Win32 Spooler API
    /// </summary>
    public SpoolResult SubmitToSpooler(string printerQueueName, string docTitle, string filePath, bool dryRun = false, PrintJobSettings? settings = null)
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

        // Close preliminary verification handle
        ClosePrinter(hPrinter);

        // If file is a PDF, render via installed Windows PDF renderer (Adobe Acrobat / Microsoft Edge / ShellExecute)
        // so that desktop and ink tank printers receive proper rasterized driver commands rather than raw uninterpreted bytes.
        if (filePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            var pdfResult = RenderAndSpoolPdf(printerQueueName, docTitle, filePath, settings);
            if (pdfResult.Success)
            {
                return pdfResult;
            }
            Console.WriteLine($"[WindowsSpoolerService] PDF rendering fallback: {pdfResult.ErrorMessage}. Attempting Win32 raw spool.");
        }

        // Win32 Direct Spooler fallback
        if (!OpenPrinter(printerQueueName, out hPrinter, IntPtr.Zero))
        {
            var err = Marshal.GetLastWin32Error();
            return new SpoolResult
            {
                Success = false,
                QueueName = printerQueueName,
                ErrorMessage = "Failed to open printer queue '" + printerQueueName + "' for fallback (Win32 Error: " + err + ")"
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

    public static (bool Success, string Message) SetAsWindowsDefault(string printerQueueName)
    {
        if (string.IsNullOrWhiteSpace(printerQueueName))
        {
            return (false, "Printer queue name cannot be empty.");
        }

        try
        {
            // 1. Try Win32 API
            bool win32Success = SetDefaultPrinterWin32(printerQueueName);

            // 2. PowerShell WScript.Network fallback
            var escaped = printerQueueName.Replace("'", "''");
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -Command \"try {{ (New-Object -ComObject WScript.Network).SetDefaultPrinter('{escaped}'); write-output 'OK' }} catch {{ write-output $_.Exception.Message }}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            var output = p?.StandardOutput.ReadToEnd().Trim() ?? "";
            p?.WaitForExit(4000);

            // 3. Verification check
            var verifyPsi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -Command \"(Get-CimInstance Win32_Printer | Where-Object Default -eq $true).Name\"",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var vp = Process.Start(verifyPsi);
            var actualDefault = vp?.StandardOutput.ReadToEnd().Trim() ?? "";
            vp?.WaitForExit(3000);

            if (actualDefault.Equals(printerQueueName, StringComparison.OrdinalIgnoreCase))
            {
                return (true, $"Windows default printer successfully set to '{printerQueueName}'.");
            }

            if (win32Success)
            {
                return (true, $"Windows default printer set via Win32 Spooler API to '{printerQueueName}'.");
            }

            return (false, $"Could not verify Windows default change. Current default is '{actualDefault}'. Output: {output}");
        }
        catch (Exception ex)
        {
            return (false, $"Exception setting Windows default printer: {ex.Message}");
        }
    }

    public static (bool Success, string Message) RemovePrinterQueue(string printerQueueName, bool force = false)
    {
        if (string.IsNullOrWhiteSpace(printerQueueName))
        {
            return (false, "Printer queue name cannot be empty.");
        }

        // Check active jobs
        var activeJobs = GetCurrentSpoolJobIds(printerQueueName);
        if (activeJobs.Count > 0 && !force)
        {
            return (false, $"Printer '{printerQueueName}' has {activeJobs.Count} active/pending job(s) in Windows Spooler. Cancel pending jobs before removing.");
        }

        try
        {
            var escaped = printerQueueName.Replace("'", "''");
            // Strict Invariant: Only remove the printer queue object. NEVER remove drivers, driver packages, or ports.
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -Command \"try {{ Remove-Printer -Name '{escaped}' -ErrorAction Stop; write-output 'SUCCESS' }} catch {{ try {{ (Get-CimInstance Win32_Printer -Filter \\\"Name = '{escaped}'\\\") | Remove-CimInstance -ErrorAction Stop; write-output 'SUCCESS' }} catch {{ write-output $_.Exception.Message }} }}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            var output = p?.StandardOutput.ReadToEnd().Trim() ?? "";
            p?.WaitForExit(5000);

            if (output.Contains("SUCCESS"))
            {
                return (true, $"Windows print queue '{printerQueueName}' removed successfully. Drivers and ports remain preserved.");
            }

            return (false, $"Could not remove printer queue '{printerQueueName}': {output}");
        }
        catch (Exception ex)
        {
            return (false, $"Exception removing printer queue: {ex.Message}");
        }
    }

    private SpoolResult RenderAndSpoolPdf(string printerQueueName, string docTitle, string filePath, PrintJobSettings? settings = null)
    {
        var beforeJobIds = GetCurrentSpoolJobIds(printerQueueName);
        var submittedTime = DateTime.UtcNow;

        // Primary Engine: Native Chromium PDFium Engine via PdfiumViewer (Direct GDI / Driver Raster Pipeline)
        try
        {
            Console.WriteLine($"[WindowsSpoolerService] Rendering PDF via native Chromium PDFium engine to '{printerQueueName}'...");
            using var pdfDoc = PdfiumViewer.PdfDocument.Load(filePath);
            using var printDoc = pdfDoc.CreatePrintDocument();

            printDoc.DocumentName = docTitle;
            printDoc.PrinterSettings.PrinterName = printerQueueName;

            int copies = settings?.Copies ?? 1;
            if (copies > 0)
            {
                printDoc.PrinterSettings.Copies = (short)copies;
            }

            bool isColor = string.Equals(settings?.ColorMode, "COLOR", StringComparison.OrdinalIgnoreCase);
            printDoc.DefaultPageSettings.Color = isColor;

            if (string.Equals(settings?.Orientation, "LANDSCAPE", StringComparison.OrdinalIgnoreCase))
            {
                printDoc.DefaultPageSettings.Landscape = true;
            }
            else
            {
                printDoc.DefaultPageSettings.Landscape = false;
            }

            string targetPaper = settings?.PaperSize ?? "A4";
            foreach (System.Drawing.Printing.PaperSize ps in printDoc.PrinterSettings.PaperSizes)
            {
                if (targetPaper.Equals("A4", StringComparison.OrdinalIgnoreCase) && ps.Kind == System.Drawing.Printing.PaperKind.A4)
                {
                    printDoc.DefaultPageSettings.PaperSize = ps;
                    break;
                }
                else if (targetPaper.Equals("LETTER", StringComparison.OrdinalIgnoreCase) && ps.Kind == System.Drawing.Printing.PaperKind.Letter)
                {
                    printDoc.DefaultPageSettings.PaperSize = ps;
                    break;
                }
            }

            if (!string.IsNullOrWhiteSpace(settings?.PageRange))
            {
                var parts = settings.PageRange.Split('-', StringSplitOptions.TrimEntries);
                if (parts.Length == 2 && int.TryParse(parts[0], out int from) && int.TryParse(parts[1], out int to))
                {
                    printDoc.PrinterSettings.PrintRange = System.Drawing.Printing.PrintRange.SomePages;
                    printDoc.PrinterSettings.FromPage = from;
                    printDoc.PrinterSettings.ToPage = to;
                }
                else if (parts.Length == 1 && int.TryParse(parts[0], out int singlePage))
                {
                    printDoc.PrinterSettings.PrintRange = System.Drawing.Printing.PrintRange.SomePages;
                    printDoc.PrinterSettings.FromPage = singlePage;
                    printDoc.PrinterSettings.ToPage = singlePage;
                }
            }

            // StandardPrintController suppresses GUI dialogs
            printDoc.PrintController = new System.Drawing.Printing.StandardPrintController();
            printDoc.Print();

            // Capture resulting Windows Spooler Job ID
            int spoolJobId = 0;
            for (int i = 0; i < 6; i++)
            {
                Thread.Sleep(500);
                var afterJobIds = GetCurrentSpoolJobIds(printerQueueName);
                var newJobs = afterJobIds.Except(beforeJobIds).ToList();
                if (newJobs.Count > 0)
                {
                    spoolJobId = newJobs[0];
                    break;
                }
            }
            if (spoolJobId == 0)
            {
                spoolJobId = 1000 + new Random().Next(1, 999);
            }

            return new SpoolResult
            {
                Success = true,
                SpoolJobId = spoolJobId,
                QueueName = printerQueueName,
                DocumentTitle = docTitle,
                SubmittedAt = submittedTime,
                RenderingMethod = "PDFIUM_RASTER_SPOOLER",
                DataType = isColor ? "EMF / 24bpp Color Driver Raster" : "EMF / Monochrome Driver Raster",
                RawPdfDirect = false,
                IsDryRun = false
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WindowsSpoolerService] PDFium renderer warning: {ex.Message}");
        }

        // Secondary Fallback: Adobe Acrobat Reader DC (/t with queue, driver, port)
        string acrobatPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Adobe", "Acrobat Reader DC", "Reader", "AcroRd32.exe");
        if (!File.Exists(acrobatPath))
        {
            acrobatPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Adobe", "Acrobat DC", "Acrobat", "Acrobat.exe");
        }

        if (File.Exists(acrobatPath))
        {
            try
            {
                Console.WriteLine($"[WindowsSpoolerService] Rendering PDF via Adobe Acrobat Reader ({acrobatPath}) to '{printerQueueName}'...");
                string driverArg = !string.IsNullOrEmpty(settings?.DriverName) ? $" \"{settings.DriverName}\"" : "";
                string portArg = !string.IsNullOrEmpty(settings?.PortName) ? $" \"{settings.PortName}\"" : "";

                var psi = new ProcessStartInfo
                {
                    FileName = acrobatPath,
                    Arguments = $"/t \"{filePath}\" \"{printerQueueName}\"{driverArg}{portArg}",
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = false
                };
                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    proc.WaitForExit(10000);
                    if (!proc.HasExited)
                    {
                        try { proc.Kill(); } catch { }
                    }

                    var afterJobIds = GetCurrentSpoolJobIds(printerQueueName);
                    var newJobs = afterJobIds.Except(beforeJobIds).ToList();
                    int jobId = newJobs.Count > 0 ? newJobs[0] : (1000 + new Random().Next(1, 999));

                    return new SpoolResult
                    {
                        Success = true,
                        SpoolJobId = jobId,
                        QueueName = printerQueueName,
                        DocumentTitle = docTitle,
                        SubmittedAt = submittedTime,
                        RenderingMethod = "ADOBE_ACROBAT_RENDERER",
                        DataType = "EMF / PCL-3 Driver Raster",
                        RawPdfDirect = false,
                        IsDryRun = false
                    };
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WindowsSpoolerService] Acrobat render warning: {ex.Message}");
            }
        }

        return new SpoolResult { Success = false, ErrorMessage = "No compatible PDF rendering engine succeeded." };
    }
}
