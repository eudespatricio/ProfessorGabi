param(
  [int]$Port = 8443
)

# Sobe o servidor em HTTPS para o tablet instalar o app e usar o microfone.
# Requer o certificado em certs/ (gerado com tools/make-cert.ps1).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  foreach ($c in @("$env:ProgramFiles\nodejs\node.exe", "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe")) {
    if (Test-Path $c) { $node = $c; break }
  }
}
if (-not $node) { Write-Host "Node.js nao encontrado." -ForegroundColor Yellow; exit 1 }

if (-not (Test-Path (Join-Path $root 'certs\server.crt'))) {
  Write-Host "Certificado ainda nao existe. Rode tools\make-cert.ps1 primeiro." -ForegroundColor Yellow
  exit 1
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like 'Wi-Fi*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -notlike '172.*' } | Select-Object -First 1).IPAddress }

Write-Host ""
Write-Host "  ############################################################" -ForegroundColor Green
Write-Host "  #  NO TABLET (Android), abra este endereco:                #" -ForegroundColor Green
Write-Host "  #                                                          #" -ForegroundColor Green
Write-Host "  #    https://$ip`:$Port" -ForegroundColor White
Write-Host "  #                                                          #" -ForegroundColor Green
Write-Host "  #  1) Avise que o certificado nao e confiavel -> Avancado  #" -ForegroundColor Green
Write-Host "  #  2) Instale o certificado:                               #" -ForegroundColor Green
Write-Host "  #     https://$ip`:$Port/ca.crt" -ForegroundColor White
Write-Host "  #     Configuracoes > Seguranca > Criptografia e            #" -ForegroundColor Green
Write-Host "  #     credenciais > Instalar certificado > CA              #" -ForegroundColor Green
Write-Host "  #  3) Abra o app de novo e use o menu > Instalar app       #" -ForegroundColor Green
Write-Host "  ############################################################" -ForegroundColor Green
Write-Host ""
Write-Host "  Deixe esta janela aberta. Ctrl+C encerra."
Write-Host ""

& $node "$root\server\serve.mjs" $Port --https
