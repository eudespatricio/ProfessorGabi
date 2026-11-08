# Cria o AVD do app (Pixel 6, Android 15, imagem com Play Store) e ajusta o config.
$ErrorActionPreference = 'Stop'
Set-Location $env:USERPROFILE   # bat/cmd nao aceitam caminho UNC como pasta atual
$root = 'C:\Android'
$sdk  = Join-Path $root 'sdk'
$env:JAVA_HOME = Join-Path $root 'jdk'
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$env:JAVA_HOME\bin;$sdk\cmdline-tools\latest\bin;$sdk\platform-tools;$sdk\emulator;$env:PATH"

$avdName = 'gabi'
$image = 'system-images;android-35;google_apis_playstore;x86_64'
$avdmanager = Join-Path $sdk 'cmdline-tools\latest\bin\avdmanager.bat'

$existing = & $avdmanager list avd 2>$null | Out-String
if ($existing -notmatch "Name:\s+$avdName") {
    Write-Host "criando AVD $avdName..."
    'no' | & $avdmanager create avd -n $avdName -k $image -d pixel_6 --force
} else {
    Write-Host "AVD $avdName ja existe"
}

$cfg = Join-Path $env:USERPROFILE ".android\avd\$avdName.avd\config.ini"
$desired = @{
    'hw.audioInput'            = 'yes'
    'hw.audioOutput'           = 'yes'
    'hw.gpu.enabled'           = 'yes'
    'hw.gpu.mode'              = 'auto'
    'hw.ramSize'               = '4096'
    'hw.keyboard'              = 'yes'
    'disk.dataPartition.size'  = '8G'
    'showDeviceFrame'          = 'no'
}
$lines = Get-Content $cfg
$keys = $desired.Keys | ForEach-Object { [regex]::Escape($_) }
$pattern = '^(' + ($keys -join '|') + ')='
$lines = $lines | Where-Object { $_ -notmatch $pattern }
$lines += $desired.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
Set-Content -Path $cfg -Value $lines -Encoding ASCII
Write-Host "config ajustado: $cfg"
Write-Host 'AVD OK'
