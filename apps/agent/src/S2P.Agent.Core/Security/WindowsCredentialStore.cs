using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using S2P.Agent.Core.Models;

namespace S2P.Agent.Core.Security;

/// <summary>
/// Persists Windows agent credentials encrypted with Windows Data Protection API (DPAPI).
/// Device secret is NEVER stored in plaintext.
/// </summary>
public class WindowsCredentialStore
{
    private readonly string _storageDirectory;
    private readonly string _filePath;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("S2P_PrintAgent_CredentialProtection_v1");

    public WindowsCredentialStore(string? customPath = null)
    {
        if (!string.IsNullOrEmpty(customPath))
        {
            _filePath = customPath;
            _storageDirectory = Path.GetDirectoryName(customPath) ?? AppContext.BaseDirectory;
        }
        else
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _storageDirectory = Path.Combine(localAppData, "S2P");
            _filePath = Path.Combine(_storageDirectory, "credentials.dat");
        }
    }

    public bool HasCredentials()
    {
        return File.Exists(_filePath);
    }

    public void SaveCredentials(DeviceConfig config)
    {
        Directory.CreateDirectory(_storageDirectory);
        var json = JsonSerializer.Serialize(config);
        var plainBytes = Encoding.UTF8.GetBytes(json);

        // Encrypt with CurrentUser DPAPI
        var encryptedBytes = ProtectedData.Protect(
            plainBytes,
            Entropy,
            DataProtectionScope.CurrentUser
        );

        File.WriteAllBytes(_filePath, encryptedBytes);
    }

    public DeviceConfig? LoadCredentials()
    {
        if (!File.Exists(_filePath))
        {
            return null;
        }

        try
        {
            var encryptedBytes = File.ReadAllBytes(_filePath);
            var plainBytes = ProtectedData.Unprotect(
                encryptedBytes,
                Entropy,
                DataProtectionScope.CurrentUser
            );

            var json = Encoding.UTF8.GetString(plainBytes);
            return JsonSerializer.Deserialize<DeviceConfig>(json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WindowsCredentialStore] Error unprotecting credentials with DPAPI: {ex.Message}");
            return null;
        }
    }

    public void ClearCredentials()
    {
        if (File.Exists(_filePath))
        {
            File.Delete(_filePath);
        }
    }
}
