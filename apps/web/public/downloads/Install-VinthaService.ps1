# Vintha Print - Windows Background Service Installer
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   VINTHA PRINT AGENT - BACKGROUND SERVICE SETUP  " -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Cyan

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName = "VinthaPrintAgentService"

Write-Host "Configuring Windows Scheduled Task for Auto-Start on Boot..." -ForegroundColor Yellow

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -Command `"cd '$AgentDir'; npm.cmd --workspace=@vintha/print-agent run start`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Description "Vintha Print Desktop Silent Print Spooler Agent" -Force
    Write-Host "SUCCESS: Vintha Print Agent is now registered to start automatically on Windows logon!" -ForegroundColor Green
} catch {
    Write-Host "Notice: Run as Administrator to register background scheduled task: $_" -ForegroundColor DarkYellow
}
