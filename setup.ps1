# OfficeCMS one-time setup. Run from C:\OfficeCMS in PowerShell:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function New-Secret([int]$len) {
  $chars = (48..57) + (65..90) + (97..122)
  -join (1..$len | ForEach-Object { [char]($chars | Get-Random) })
}

Write-Host "`n== 1/6 Checking tools ==" -ForegroundColor Cyan
node -v; npm -v
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
           Sort-Object FullName -Descending | Select-Object -First 1
  if ($found) { $psql = $found.FullName }
}
if (-not $psql) { throw "psql not found. Add PostgreSQL's bin folder to PATH (e.g. C:\Program Files\PostgreSQL\16\bin)." }
Write-Host "Using $psql"

Write-Host "`n== 2/6 Database ==" -ForegroundColor Cyan
if (Test-Path server\.env) {
  Write-Host "server\.env already exists - keeping existing passwords. Delete it and re-run to regenerate." -ForegroundColor Yellow
  $reuse = $true
} else { $reuse = $false }

if (-not $reuse) {
  $sec = Read-Host "Enter the PostgreSQL 'postgres' superuser password" -AsSecureString
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $ownerPw = New-Secret 28; $appPw = New-Secret 28; $jwt = New-Secret 64

  & $psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -v owner_pw=$ownerPw -v app_pw=$appPw -f server\scripts\create-db.sql
  if ($LASTEXITCODE -ne 0) { throw "Database creation failed (wrong postgres password?)." }
  Remove-Item Env:PGPASSWORD

  Write-Host "`n== 3/6 Writing server\.env ==" -ForegroundColor Cyan
  $content = (Get-Content server\.env.example -Raw) `
    -replace 'DB_PASSWORD=change_me', "DB_PASSWORD=$appPw" `
    -replace 'DB_OWNER_PASSWORD=change_me', "DB_OWNER_PASSWORD=$ownerPw" `
    -replace 'JWT_SECRET=change_me_to_a_long_random_string', "JWT_SECRET=$jwt"
  [IO.File]::WriteAllText("$PSScriptRoot\server\.env", $content, (New-Object Text.UTF8Encoding $false))
}

Write-Host "`n== 4/6 Installing packages (takes a few minutes) ==" -ForegroundColor Cyan
npm install
npm install --prefix server
npm install --prefix client

Write-Host "`n== 5/6 Creating tables ==" -ForegroundColor Cyan
npm run migrate

Write-Host "`n== 6/6 Done ==" -ForegroundColor Green
Write-Host "Create your first admin:"
Write-Host '  npm run seed --prefix server -- --email you@office.com --name "Your Name" --password "A-long-password-12+"'
Write-Host "Start the app:  npm run dev     then open http://localhost:5173"
