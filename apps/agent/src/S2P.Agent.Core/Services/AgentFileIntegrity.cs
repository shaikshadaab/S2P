using System.Security.Cryptography;

namespace S2P.Agent.Core.Services;

public class AgentFileIntegrity
{
    public static async Task<string> ComputeSha256Async(string filePath)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException("File not found for SHA256 computation.", filePath);
        }

        using var sha = SHA256.Create();
        await using var stream = File.OpenRead(filePath);
        var hashBytes = await sha.ComputeHashAsync(stream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public static bool VerifyHash(string actualSha256, string expectedSha256)
    {
        return string.Equals(
            actualSha256.Trim(),
            expectedSha256.Trim(),
            StringComparison.OrdinalIgnoreCase
        );
    }
}
