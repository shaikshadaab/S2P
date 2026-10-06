using Microsoft.Data.Sqlite;

namespace S2P.Agent.Core.Database;

public class LocalAgentDatabase : IAsyncDisposable
{
    private readonly string _dbPath;
    private readonly string _connectionString;
    private SqliteConnection? _connection;

    public LocalAgentDatabase(string? customDbPath = null)
    {
        if (!string.IsNullOrEmpty(customDbPath))
        {
            _dbPath = customDbPath;
        }
        else
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(localAppData, "S2P");
            Directory.CreateDirectory(dir);
            _dbPath = Path.Combine(dir, "agent.db");
        }

        _connectionString = $"Data Source={_dbPath}";
    }

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection(_connectionString);
        await _connection.OpenAsync();

        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS operational_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS active_leases (
                job_id TEXT PRIMARY KEY,
                lease_token TEXT NOT NULL,
                claimed_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                status TEXT NOT NULL,
                temp_file_path TEXT,
                sha256 TEXT
            );

            CREATE TABLE IF NOT EXISTS printer_cache (
                queue_name TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                driver_name TEXT,
                port_name TEXT,
                connection_type TEXT,
                is_online INTEGER,
                synced_at TEXT NOT NULL
            );
        ";
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task SaveActiveLeaseAsync(
        string jobId,
        string leaseToken,
        string expiresAt,
        string status,
        string? tempFilePath = null,
        string? sha256 = null)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"
            INSERT OR REPLACE INTO active_leases (job_id, lease_token, claimed_at, expires_at, status, temp_file_path, sha256)
            VALUES ($jobId, $leaseToken, $claimedAt, $expiresAt, $status, $tempFilePath, $sha256);
        ";
        cmd.Parameters.AddWithValue("$jobId", jobId);
        cmd.Parameters.AddWithValue("$leaseToken", leaseToken);
        cmd.Parameters.AddWithValue("$claimedAt", DateTime.UtcNow.ToString("O"));
        cmd.Parameters.AddWithValue("$expiresAt", expiresAt);
        cmd.Parameters.AddWithValue("$status", status);
        cmd.Parameters.AddWithValue("$tempFilePath", (object?)tempFilePath ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$sha256", (object?)sha256 ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task UpdateLeaseExpiresAtAsync(string jobId, string expiresAt)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"
            UPDATE active_leases
            SET expires_at = $expiresAt
            WHERE job_id = $jobId;
        ";
        cmd.Parameters.AddWithValue("$jobId", jobId);
        cmd.Parameters.AddWithValue("$expiresAt", expiresAt);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task UpdateLeaseStatusAsync(string jobId, string status, string? tempFilePath = null, string? sha256 = null)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"
            UPDATE active_leases
            SET status = $status,
                temp_file_path = COALESCE($tempFilePath, temp_file_path),
                sha256 = COALESCE($sha256, sha256)
            WHERE job_id = $jobId;
        ";
        cmd.Parameters.AddWithValue("$jobId", jobId);
        cmd.Parameters.AddWithValue("$status", status);
        cmd.Parameters.AddWithValue("$tempFilePath", (object?)tempFilePath ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$sha256", (object?)sha256 ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task ClearActiveLeaseAsync(string jobId)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "DELETE FROM active_leases WHERE job_id = $jobId;";
        cmd.Parameters.AddWithValue("$jobId", jobId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<(string JobId, string LeaseToken, string Status, string? TempPath)>> GetUnfinishedLeasesAsync()
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT job_id, lease_token, status, temp_file_path FROM active_leases;";

        var list = new List<(string, string, string, string?)>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var jobId = reader.GetString(0);
            var token = reader.GetString(1);
            var status = reader.GetString(2);
            var tempPath = reader.IsDBNull(3) ? null : reader.GetString(3);
            list.Add((jobId, token, status, tempPath));
        }
        return list;
    }

    public async Task SetMarkerAsync(string key, string value)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = @"
            INSERT OR REPLACE INTO operational_state (key, value, updated_at)
            VALUES ($key, $val, $now);
        ";
        cmd.Parameters.AddWithValue("$key", key);
        cmd.Parameters.AddWithValue("$val", value);
        cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<string?> GetMarkerAsync(string key)
    {
        if (_connection == null) await InitializeAsync();

        using var cmd = _connection!.CreateCommand();
        cmd.CommandText = "SELECT value FROM operational_state WHERE key = $key;";
        cmd.Parameters.AddWithValue("$key", key);
        var result = await cmd.ExecuteScalarAsync();
        return result?.ToString();
    }

    public async ValueTask DisposeAsync()
    {
        if (_connection != null)
        {
            await _connection.CloseAsync();
            await _connection.DisposeAsync();
            _connection = null;
        }
    }
}
