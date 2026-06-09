$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "Raspberry_Pi"
$OutLog = Join-Path $Root "disease-api.log"
$ErrLog = Join-Path $Root "disease-api.err.log"

$Existing = Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
if ($Existing) {
    Write-Host "Disease API is already running on http://127.0.0.1:8000"
    exit 0
}

if (Test-Path $OutLog) { Clear-Content $OutLog }
if (Test-Path $ErrLog) { Clear-Content $ErrLog }

Start-Process `
    -FilePath "python" `
    -ArgumentList "api_server.py" `
    -WorkingDirectory $ApiDir `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden

Start-Sleep -Seconds 2

$Started = Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
if ($Started) {
    Write-Host "Disease API started: http://127.0.0.1:8000"
} else {
    Write-Host "Disease API failed to start. Check disease-api.err.log"
    exit 1
}
