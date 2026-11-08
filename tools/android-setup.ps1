# Instala Android SDK (command-line), emulador e imagem de sistema sem Android Studio.
# Uso: powershell -ExecutionPolicy Bypass -File tools\android-setup.ps1
# Requer apenas curl.exe e tar.exe (nativos no Windows 10/11).
$ErrorActionPreference = 'Stop'

$root = 'C:\Android'
$dl   = Join-Path $root 'downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $root 'sdk') | Out-Null

function Download([string]$url, [string]$out) {
    if (Test-Path $out) { Write-Host "ja existe: $out"; return }
    Write-Host "baixando: $url"
    & curl.exe -L --fail --retry 3 --retry-delay 5 --progress-bar -o $out $url
    if ($LASTEXITCODE -ne 0) { throw "falha ao baixar $url" }
}

Download 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' (Join-Path $dl 'jdk17.zip')
Download 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' (Join-Path $dl 'cmdline-tools.zip')

$jdk = Join-Path $root 'jdk'
if (-not (Test-Path (Join-Path $jdk 'bin\java.exe'))) {
    Write-Host 'extraindo JDK...'
    New-Item -ItemType Directory -Force -Path $jdk | Out-Null
    & tar.exe -xf (Join-Path $dl 'jdk17.zip') -C $jdk --strip-components=1
}

$cmdline = Join-Path $root 'sdk\cmdline-tools\latest'
if (-not (Test-Path (Join-Path $cmdline 'bin\sdkmanager.bat'))) {
    Write-Host 'extraindo command-line tools...'
    $tmp = Join-Path $root 'cmdline-tmp'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    & tar.exe -xf (Join-Path $dl 'cmdline-tools.zip') -C $tmp
    New-Item -ItemType Directory -Force -Path (Join-Path $root 'sdk\cmdline-tools') | Out-Null
    Move-Item (Join-Path $tmp 'cmdline-tools') $cmdline
    Remove-Item $tmp -Recurse -Force
}

$env:JAVA_HOME        = $jdk
$env:ANDROID_HOME     = Join-Path $root 'sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$jdk\bin;$cmdline\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host 'aceitando licencas...'
$yes = (1..80 | ForEach-Object { 'y' }) -join "`r`n"
$yes | & (Join-Path $cmdline 'bin\sdkmanager.bat') --sdk_root="$env:ANDROID_HOME" --licenses

Write-Host 'instalando platform-tools, emulator e imagem android-35 (Play Store)...'
& (Join-Path $cmdline 'bin\sdkmanager.bat') --sdk_root="$env:ANDROID_HOME" 'platform-tools' 'emulator' 'system-images;android-35;google_apis_playstore;x86_64'
if ($LASTEXITCODE -ne 0) { throw 'sdkmanager falhou' }

Write-Host 'verificando aceleracao:'
& (Join-Path $env:ANDROID_HOME 'emulator\emulator.exe') -accel-check
Write-Host 'SETUP OK'
