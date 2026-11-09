# Emulador Android para testar o app no PC

Aparelho virtual: **Pixel 6, Android 15 (API 35), imagem com Google Play**.
Roda com **WHPX** (aceleração por hardware) — verificado com `emulator -accel-check`.

## Como abrir

1. O servidor do app precisa estar rodando (no WSL): `./start.ps1` ou `node server/serve.mjs`.
2. No Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1
```

O script:
- liga o emulador se ainda não estiver ligado;
- espera o Android terminar de bootar;
- faz `adb reverse tcp:8080 tcp:8080` (o `localhost` do emulador aponta para o PC);
- abre `http://localhost:8080` no Chrome do emulador.

> `localhost` é contexto seguro: microfone, service worker e instalação da PWA funcionam sem certificado.

Depois de aberto, para ir direto numa tela use o endereço com hash, por exemplo:
`http://localhost:8080/#/caca` ou `http://localhost:8080/#/licao/1/0`.

## O que dá para testar de verdade

| Recurso | No emulador |
| --- | --- |
| Layout, toque, rolagem, fontes | sim |
| Lições, caça-palavras, baú, fase chefe | sim |
| Áudio (TTS) | sim — Google TTS instalado e definido como padrão |
| Microfone / reconhecimento de fala | **sim, usando o microfone do PC** (precisa de internet) |
| Offline / service worker | sim (desligue o Wi-Fi do emulador) |
| Instalar como PWA | sim (menu ⋮ → “Instalar app”) |

## Comandos úteis

```powershell
$adb = 'C:\Android\sdk\platform-tools\adb.exe'

# desligar/ligar a rede do emulador (teste offline)
& $adb shell svc wifi disable; & $adb shell svc data disable
& $adb shell svc wifi enable;  & $adb shell svc data enable

# tela
& $adb shell screencap -p /sdcard/t.png; & $adb pull /sdcard/t.png tests\screenshots\t.png

# reiniciar o Chrome
& $adb shell am force-stop com.android.chrome

# ver o que está em foco
& $adb shell dumpsys window | Select-String mCurrentFocus

# log do Chrome (erros de áudio/fala)
& $adb logcat -d | Select-String -Pattern 'chromium|Speech|TTS' | Select-Object -Last 40

# fechar o emulador
& $adb emu kill
```

## Inspecionar o app no emulador (DevTools)

O app instalado como WebAPK roda dentro do Chrome e pode ser inspecionado sem cabo de vídeo:

```powershell
$adb = 'C:\Android\sdk\platform-tools\adb.exe'
& $adb reverse tcp:8080 tcp:8080
& $adb forward tcp:9222 localabstract:chrome_devtools_remote

node tests/emu-probe.mjs            # versão, saudação, vozes pt-BR, caches do SW
node tests/emu-probe.mjs --reload   # força a segunda abertura (código novo) e sonda de novo
node tests/emu-tablet.mjs           # emula 1024x768 e 768x1024 e mede o dock da história
```

`emu-probe` mostra `window.__gabi.audio()`: quantas vozes o tablet tem, se o Opus é suportado e
quantos clipes tocaram por Opus, MP3 ou TTS — é a forma mais rápida de conferir o achado 3.

## Stress test automatizado

Com o app aberto no Chrome do emulador e `adb forward tcp:9222 localabstract:chrome_devtools_remote`:

```powershell
node tests/stress-emu.mjs                    # bateria completa
node tests/stress-emu.mjs --scenario talk    # conversa (roteiro + interrupções)
node tests/stress-emu.mjs --scenario voice   # latência do TTS até as opções
node tests/stress-emu.mjs --scenario lesson  # lição + concorrência de clipes
node tests/stress-emu.mjs --scenario mic     # microfone ao sair da conversa
```

Os resultados ficam em `tests/stress-v44/` (JSON + prints). A bateria restaura o `localStorage`
original no fim e não altera o código do app.

## Limitações honestas

- **A voz sintetizada sai pelo áudio do PC**; o volume do Windows manda.
- O **reconhecimento de fala** depende do app Google e de internet. Se o microfone do PC estiver mudo ou o Windows bloquear o emulador, a escuta falha — o app cai no “Eu li” (comportamento esperado).
- O emulador não substitui o tablet para medir **latência real** e **qualidade do microfone**; use-o para regressões de layout e fluxo.
- Primeira abertura do Chrome pede “Use without an account” (já feito neste AVD).

## Se precisar recriar o aparelho

```powershell
powershell -ExecutionPolicy Bypass -File tools\android-avd.ps1   # recria o AVD "gabi"
```
