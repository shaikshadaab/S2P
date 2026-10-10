# scripts/package-agent.ps1
# Reproducible Packaging Script for SOS Print Windows Agent Package

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$publishDir = Join-Path $repoRoot "apps\agent\publish"
$webPublicZip = Join-Path $repoRoot "apps\web\public\SOS-Print-Agent-Package.zip"
$agentPublishZip = Join-Path $publishDir "SOS-Print-Agent-Package.zip"
$tempStaging = Join-Path $env:TEMP ("sos-agent-staging-" + [System.Guid]::NewGuid().ToString("N"))

Write-Host "=========================================================="
Write-Host "  SOS PRINT AGENT REPRODUCIBLE PACKAGING SCRIPT"
Write-Host "=========================================================="
Write-Host "Source:  $publishDir"
Write-Host "Staging: $tempStaging"

if (Test-Path $tempStaging) { Remove-Item -Recurse -Force $tempStaging }
New-Item -ItemType Directory -Path $tempStaging -Force | Out-Null

# Exclude list: PDBs, foreign non-Windows runtimes, cloudflared binary (downloaded/cached on first run), previous ZIPs
$excludeExtensions = @(".pdb", ".zip")
$excludeNames = @("cloudflared.exe", "tunnel.log", "tunnel-url.txt", "tunnel.pid", "launcher.log", "sos-print-station.lock")
$excludeRuntimeDirs = @("browser-wasm", "linux-arm", "linux-arm64", "linux-armel", "linux-mips64", "linux-musl-arm", "linux-musl-arm64", "linux-musl-x64", "linux-ppc64le", "linux-s390x", "linux-x64", "linux-x86", "maccatalyst-arm64", "maccatalyst-x64", "osx-arm64", "osx-x64", "win-arm", "win-arm64", "win-x86")

$files = Get-ChildItem -Path $publishDir -Recurse -File
$copiedCount = 0

foreach ($file in $files) {
    if ($excludeExtensions -contains $file.Extension.ToLower()) { continue }
    if ($excludeNames -contains $file.Name.ToLower()) { continue }
    
    $relative = $file.FullName.Substring($publishDir.Length).TrimStart('\', '/')
    $parts = $relative.Split([System.IO.Path]::DirectorySeparatorChar)
    
    # Check if inside an excluded runtime folder
    $skip = $false
    foreach ($p in $parts) {
        if ($excludeRuntimeDirs -contains $p.ToLower()) {
            $skip = $true
            break
        }
    }
    if ($skip) { continue }
    
    $targetFile = Join-Path $tempStaging $relative
    $targetDir = Split-Path $targetFile -Parent
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
    
    Copy-Item -Path $file.FullName -Destination $targetFile -Force
    $copiedCount++
}

Write-Host "Staged $copiedCount files for Windows x64 deployment."

# Compress into zip
if (Test-Path $agentPublishZip) { Remove-Item -Force $agentPublishZip }
if (Test-Path $webPublicZip) { Remove-Item -Force $webPublicZip }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempStaging, $agentPublishZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item -Path $agentPublishZip -Destination $webPublicZip -Force

# Calculate checksums
$fileObj = Get-Item $webPublicZip
$sha256 = (Get-FileHash -Path $webPublicZip -Algorithm SHA256).Hash

Write-Host ""
Write-Host "=== PACKAGE GENERATION COMPLETE ===" -ForegroundColor Green
Write-Host ("Archive Size: " + $fileObj.Length + " bytes (" + [math]::Round($fileObj.Length / 1MB, 2) + " MB)")
Write-Host ("SHA-256 Hash: " + $sha256)
Write-Host "Published to:"
Write-Host ("  " + $agentPublishZip)
Write-Host ("  " + $webPublicZip)

Remove-Item -Recurse -Force $tempStaging
