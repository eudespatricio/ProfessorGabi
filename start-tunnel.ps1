param(
  [int]$Port = 8080
)

# Sobe o servidor local e abre um link HTTPS publico temporario (Cloudflare Quick Tunnel).
# O link HTTPS e necessario para o microfone e para instalar como app no tablet.

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
if (-not $node) { Write-Host "Node.js nao encontrado. Rode primeiro o start.ps1 para ver as instrucoes." -ForegroundColor Yellow; exit 1 }

$tools = Join-Path $root 'tools'
if (-not (Test-Path $tools)) { New-Item -ItemType Directory -Path $tools | Out-Null }
$cf = Join-Path $tools 'cloudflared.exe'

# 1) servidor local
$running = $false
try {
  $r = Invoke-WebRequest -Uri "http://localhost:$Port/healthz" -UseBasicParsing -TimeoutSec 2
  $running = ($r.StatusCode -eq 200)
} catch { $running = $false }

if (-not $running) {
  Write-Host "Iniciando servidor local na porta $Port..."
  $slog = Join-Path $root 'server.log'
  $slogErr = Join-Path $root 'server.err.log'
  Start-Process -FilePath $node -ArgumentList @("`"$root\server\serve.mjs`"", "$Port") -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $slog -RedirectStandardError $slogErr
  Start-Sleep -Seconds 2
} else {
  Write-Host "Servidor local ja estava rodando."
}

# 2) cloudflared
if (-not (Test-Path $cf)) {
  Write-Host "Baixando o conector HTTPS (cloudflared, ~55 MB, so na primeira vez)..."
  $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
  try {
    Invoke-WebRequest -Uri $url -OutFile $cf -UseBasicParsing -TimeoutSec 300
  } catch {
    Write-Host "Nao consegui baixar o cloudflared: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Alternativa: hospede a pasta 'app' no Netlify Drop (veja docs/INSTALAR-NO-TABLET.md)."
    exit 1
  }
}

# 3) tunel
$out = Join-Path $root 'tunnel.log'
$err = Join-Path $root 'tunnel.err.log'
Remove-Item $out, $err -ErrorAction SilentlyContinue
Write-Host "Abrindo tunel HTTPS..."
$p = Start-Process -FilePath $cf -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://localhost:$Port") `
  -RedirectStandardOutput $out -RedirectStandardError $err -PassThru -WindowStyle Hidden

$publicUrl = $null
for ($i = 0; $i -lt 80; $i++) {
  Start-Sleep -Milliseconds 750
  $txt = ''
  if (Test-Path $err) { $txt += (Get-Content $err -Raw -ErrorAction SilentlyContinue) }
  if (Test-Path $out) { $txt += (Get-Content $out -Raw -ErrorAction SilentlyContinue) }
  $m = [regex]::Match([string]$txt, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($m.Success) { $publicUrl = $m.Value; break }
  if ($p.HasExited) { break }
}

Write-Host ""
if (-not $publicUrl) {
  Write-Host "O tunel nao respondeu a tempo." -ForegroundColor Yellow
  Write-Host "Veja os detalhes em: tunnel.err.log"
  Write-Host "Alternativa recomendada: Netlify Drop (docs/INSTALAR-NO-TABLET.md)."
  Read-Host "Enter para fechar"
  exit 1
}

Write-Host "  ############################################################" -ForegroundColor Green
Write-Host "  #  ABRA ESTE ENDERECO NO CHROME DO TABLET:                 #" -ForegroundColor Green
Write-Host "  #                                                          #" -ForegroundColor Green
Write-Host "  #  $publicUrl" -ForegroundColor White
Write-Host "  #                                                          #" -ForegroundColor Green
Write-Host "  ############################################################" -ForegroundColor Green
Write-Host ""
Write-Host "  - Este link muda cada vez que voce abre este atalho."
Write-Host "  - No Chrome do tablet, use o menu (3 pontos) > 'Instalar app'."
Write-Host "  - Depois de instalado, o app abre e funciona sem internet;"
Write-Host "    a leitura em voz alta (microfone) precisa do link ativo."
Write-Host "  - Faca backup do progresso em: Pais > Dados e backup."
Write-Host ""
Write-Host "  Deixe esta janela aberta. Ctrl+C encerra o tunel."
Write-Host ""

try { Wait-Process -Id $p.Id } catch { }
