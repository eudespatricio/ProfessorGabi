# Sobe o emulador, espera o boot, liga o encaminhamento de porta e abre o app no Chrome.
# Uso: powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1 [-Avd gabi] [-Porta 8080]
param(
    [string]$Avd = 'gabi',
    [int]$Porta = 8080
)
$ErrorActionPreference = 'Continue'
Set-Location $env:USERPROFILE   # evita problemas de cmd com caminho UNC
$root = 'C:\Android'
$sdk  = Join-Path $root 'sdk'
$env:JAVA_HOME = Join-Path $root 'jdk'
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$sdk\platform-tools;$sdk\emulator;$env:PATH"

$adb = Join-Path $sdk 'platform-tools\adb.exe'
$emu = Join-Path $sdk 'emulator\emulator.exe'

$devices = (& $adb devices 2>&1 | Out-String)
if ($devices -notmatch 'emulator-\d+\s+device') {
    Write-Host 'iniciando emulador...'
    Start-Process -FilePath $emu -ArgumentList @(
        '-avd', $Avd,
        '-no-snapshot-save',
        '-no-boot-anim',
        '-netdelay', 'none',
        '-netspeed', 'full'
    ) -WindowStyle Normal
}

Write-Host 'aguardando o Android terminar de ligar (pode levar 1-3 min na primeira vez)...'
& $adb wait-for-device
for ($i = 0; $i -lt 180; $i++) {
    $boot = (& $adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
    if ($boot -eq '1') { break }
    Start-Sleep -Seconds 2
}
if ($boot -ne '1') { throw 'o emulador nao terminou o boot' }

Write-Host "encaminhando localhost:$Porta do emulador para o PC..."
& $adb reverse "tcp:$Porta" "tcp:$Porta" | Out-Null

Write-Host 'abrindo o app no Chrome do emulador...'
& $adb shell am start -a android.intent.action.VIEW -d "http://localhost:$Porta" com.android.chrome | Out-Null

Write-Host ''
Write-Host "PRONTO: o app esta em http://localhost:$Porta dentro do emulador."
Write-Host 'Dicas:'
Write-Host '  - microfone: o emulador usa o microfone do PC (permita no Windows e no Chrome)'
Write-Host '  - offline: & "C:\Android\sdk\platform-tools\adb.exe" shell svc wifi disable; svc data disable'
Write-Host '  - voltar online: & "C:\Android\sdk\platform-tools\adb.exe" shell svc wifi enable; svc data enable'
Write-Host '  - reiniciar app: adb shell am force-stop com.android.chrome'
