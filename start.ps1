param(
  [int]$Port = 8080,
  [switch]$Tunnel,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Find-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $cands = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
  )
  foreach ($c in $cands) { if (Test-Path $c) { return $c } }
  return $null
}

$node = Find-Node
if (-not $node) {
  Write-Host ""
  Write-Host "  Node.js nao encontrado neste computador." -ForegroundColor Yellow
  Write-Host "  Instale em https://nodejs.org (versao LTS) e rode este arquivo de novo."
  Write-Host ""
  Read-Host "Pressione Enter para fechar"
  exit 1
}

if ($Tunnel) {
  & "$root\start-tunnel.ps1" -Port $Port
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "  ####################################################" -ForegroundColor DarkYellow
Write-Host "  #            GABI - LER E ESCREVER                 #" -ForegroundColor DarkYellow
Write-Host "  ####################################################" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Servidor local iniciando na porta $Port..."
Write-Host "  Deixe esta janela aberta enquanto o tablet usa o app."
Write-Host "  Para parar, pressione Ctrl+C."
Write-Host ""

if (-not $NoBrowser) {
  Start-Sleep -Milliseconds 900
  Start-Process "http://localhost:$Port"
}

& $node "$root\server\serve.mjs" $Port
