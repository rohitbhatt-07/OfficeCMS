# reset-postgres-password.ps1
# Check for Administrator privileges, self-elevate if needed
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Administrator privileges required to restart the PostgreSQL service." -ForegroundColor Yellow
    Write-Host "Opening an elevated Administrator window..." -ForegroundColor Cyan
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File `"$PSCommandPath`""
    exit
}

$ErrorActionPreference = 'Stop'
$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $hbaPath)) {
    Write-Error "Could not find $hbaPath"
    exit 1
}

Write-Host "`n=== PostgreSQL Password Reset Utility ===" -ForegroundColor Green
$sec = Read-Host "Enter the NEW password you want for 'postgres'" -AsSecureString
$NewPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

if (-not $NewPassword) {
    Write-Error "Password cannot be empty."
    exit 1
}

Write-Host "`n1. Allowing temporary passwordless local connection..." -ForegroundColor Cyan
$content = Get-Content $hbaPath -Raw
# Replace scram-sha-256 with trust for localhost
$trustContent = $content -replace "host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256", "host    all             all             127.0.0.1/32            trust" `
                         -replace "host\s+all\s+all\s+::1/128\s+scram-sha-256", "host    all             all             ::1/128                 trust"
[IO.File]::WriteAllText($hbaPath, $trustContent)

Write-Host "2. Restarting PostgreSQL service..." -ForegroundColor Cyan
Restart-Service postgresql-x64-18

Write-Host "3. Updating password for 'postgres' superuser..." -ForegroundColor Cyan
$escapedPw = $NewPassword.Replace("'", "''")
& $psql -U postgres -h 127.0.0.1 -d postgres -c "ALTER USER postgres WITH PASSWORD '$escapedPw';"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Retrying connection without host..."
    & $psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$escapedPw';"
}

Write-Host "4. Restoring secure authentication settings..." -ForegroundColor Cyan
# Replace trust back with scram-sha-256
$secureContent = (Get-Content $hbaPath -Raw) -replace "host\s+all\s+all\s+127\.0\.0\.1/32\s+trust", "host    all             all             127.0.0.1/32            scram-sha-256" `
                                             -replace "host\s+all\s+all\s+::1/128\s+trust", "host    all             all             ::1/128                 scram-sha-256"
[IO.File]::WriteAllText($hbaPath, $secureContent)

Write-Host "5. Restarting PostgreSQL service..." -ForegroundColor Cyan
Restart-Service postgresql-x64-18

Write-Host "`n[SUCCESS] PostgreSQL 'postgres' password has been reset successfully!" -ForegroundColor Green
Write-Host "You can close this window, return to your terminal, and run .\setup.ps1 using your new password.`n" -ForegroundColor Green
