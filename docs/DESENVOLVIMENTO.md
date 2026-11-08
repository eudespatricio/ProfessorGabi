# Desenvolvimento — ambiente, fluxo e convenções

> Para arquitetura, ver [`ARQUITETURA.md`](ARQUITETURA.md). Para o emulador, [`EMULADOR.md`](EMULADOR.md). Para o OCR, [`OCR.md`](OCR.md).

## 1. Repositório Único e Sincronia

O repositório canônico com Git inicializado vive em `/home/eudespatricio/ProfessorGabi` (WSL). Caso utilize ferramentas nativas do Windows (`node.exe` / Chrome headless), mantenha `C:\Users\Eudes\ProfessorGabi` espelhado ou rode os invariantes diretamente no WSL via `pytest -q tests/test_invariants.py`.

## 2. Rodar

```powershell
# HTTP (sem microfone) — porta 8080
node server/serve.mjs

# HTTPS com certificado local (microfone e instalação PWA) — porta 8443
node server/serve.mjs 8443 --https
```

O servidor é reiniciado quando `server/serve.mjs` muda. Para reiniciar no Windows:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'serve.mjs' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## 3. Atualizar o app no tablet/emulador

1. **Sempre suba a versão** do service worker em `app/sw.js` (`gabi-vN`) **e** em `app/js/version.js` (`APP_VERSION`). `tools/check-sw.mjs` falha se as duas não baterem. Sem isso o cache antigo continua servindo os arquivos.
2. Sincronize para a cópia WSL.
3. No tablet, abra o app **duas vezes** (a primeira instala o novo SW, a segunda carrega o código novo).
4. Em desenvolvimento, o servidor manda `no-store` para `sw.js`/`index.html` e `no-cache` para JS/CSS — não precisa limpar cache manualmente.

## 4. Testes

```powershell
npm test                         # 52 testes (lógica, store, OCR, áudio, encoding, leitura, revisão)
node tests/smoke.mjs             # fluxo real no Chrome + screenshots
node tests/full.mjs              # lição completa + história (com revisão rápida)
node tests/story-shot.mjs        # dock do microfone na história (5 viewports)
node tests/reading-sim.mjs       # validação da leitura com escuta simulada
node tests/lesson-shots.mjs      # lacuna da sílaba + pecinhas repetidas
node tools/check-modules.mjs     # importa todos os módulos (pega erro de sintaxe)
node tools/test-talk.mjs         # cartinhas de tema e respostas por humor
node tools/ui-audit.mjs --shots  # 13 rotas × 5 viewports (overflow, toque, texto cortado)
node tools/check-sw.mjs          # CORE do service worker completo e consistente
node tools/encoding-check.mjs    # procura mojibake nos arquivos de texto
npm run sw:build                 # regenera o CORE a partir do disco (após criar módulo/CSS)
node tools/check-lazy.mjs        # dicionário do OCR não carrega na abertura
node tools/check-server.mjs      # gzip, cache, Range, headers (servidor precisa estar no ar)
node tools/check-map.mjs         # parallax do mapa + profundidade + modal
node tools/check-chest.mjs       # baú animado + transição de tela
node tools/check-choice-layout.mjs  # opção com imagem + ouvir (sem sobreposição)
npm run content:manifest         # regenera content/manifest.json
npm run content:check            # falha se o manifesto divergir do código
npm run audio:opus-index         # reconstrói index-opus.json após novos clipes
bash tools/make-opus.sh          # (no WSL) converte MP3 novos em Opus
```

Antes de entregar: `npm test` verde, `smoke` “TUDO OK”, `check-modules` ok, SW atualizado.

## 5. Emulador Android

```powershell
powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1
```

- `adb reverse tcp:8080 tcp:8080` deixa `localhost:8080` do emulador apontando para o PC.
- `localhost` é contexto seguro: microfone, PWA e service worker funcionam sem certificado.
- Microfone usa o **microfone do PC**.
- Detalhes e comandos: [`EMULADOR.md`](EMULADOR.md).

## 6. Convenções de código

- **Sem build**: ES modules nativos; nada de `import` de pacote no front.
- **DOM**: usar `el(tag, props, ...children)` de `utils.js`. Eventos são chaves `'on:click'` (com aspas — sem isso o objeto quebra).
- **Texto**: sempre pt-BR, frases curtas, tom de professora gentil; nunca “errado”, sempre “quase” + modelo.
- **Estado**: ler de `store.state`; escrever via funções do store (não mutar `localStorage` direto).
- **Som**: `speak()` para voz (clipe → TTS), `sfx()` para efeitos, `haptic()` para vibração.
- **Escuta**: `listen()` de `speech.js`; tratar `res.error` e sempre oferecer alternativa manual.
- **Acessibilidade**: botões com `aria-label` quando só têm emoji; alvos ≥ 44 px; respeitar `reduceMotion`.
- **Nomes**: arquivos `screen-*.js`, funções `render*`, exports em camelCase.

## 7. Conteúdo e áudio

- Palavras: `app/js/content.js` (`RAW`) e `content-units.js` (`EXTRA_WORDS`).
- Textos: `TEXTS`/`EXTRA_TEXTS`.
- Definições: `app/js/glossary.js`.
- Áudio: `node tools/render-audio.mjs` (ElevenLabs) → `app/audio/*.mp3` + `index.json`.
- Lista de palavras do corretor: `node tools/build-wordlist.mjs`.

## 8. Diagnóstico rápido

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| Tela em branco | erro de sintaxe em módulo | `node tools/check-modules.mjs` e console do Chrome |
| Mudança não aparece | SW antigo | subir `gabi-vN` e abrir duas vezes |
| Microfone não abre | HTTP (não seguro) ou sem permissão | usar HTTPS/`localhost`, aceitar permissão |
| Áudio não toca | clipe ausente e TTS sem voz | conferir `audio/index.json`, laboratório de voz |
| OCR com lixo | foto com ilustração/sombra | ver `OCR.md`, ajustar enquadramento |
| Emulador não abre | WHPX/AVD | `emulator -accel-check`, recriar AVD |

## 9. Checklist de entrega

- [ ] `npm test` 52/52
- [ ] `node tests/smoke.mjs` sem falhas e sem erros de JS
- [ ] `node tools/check-modules.mjs` ok
- [ ] `sw.js` com versão nova
- [ ] sincronizado para WSL
- [ ] servidor HTTP e HTTPS respondendo
- [ ] testado no emulador (layout + microfone)
- [ ] documentação atualizada (`ARQUITETURA`, `BACKLOG`, `QUALIDADE`)
