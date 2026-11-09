# Stress test v41 — confirmação das correções

> **Execução:** 08/11/2026 22:37 (America/Sao_Paulo) · **App:** `v41` · **Base:** `8a710ef` + correções desta rodada
> **Ambiente:** Pixel 6 (AVD `gabi`), Android 15 / API 35, Chrome 156, áudio do emulador ligado
> **Bateria:** [`tests/stress-emu.mjs`](../tests/stress-emu.mjs) · **Evidências:** [`tests/stress-v41/results.json`](../tests/stress-v41/results.json) e [`tests/stress-v41/`](../tests/stress-v41/)

## Resultado

> **Ajuste fino da v41:** a fala `não sei` agora cai no fallback (`Sem problema! Quer falar de um bicho...`) em vez de virar o foco “sei”. O restante dos números abaixo é da execução final.

**53 verificações · 53 OK · 0 falhas.** A bateria cobre boot/PWA, conversa completa, interrupções da conversa, latência do TTS, lição com avanço rápido/replay, navegação entre telas e saída durante a escuta.

| Falha da v38 | Antes | Depois (v41) |
| --- | --- | --- |
| **A3** áudio da lição sobreposto | 40 `overlap-media`, 11 mídias simultâneas | **0 sobreposições**, máximo **1** mídia tocando |
| **A2** áudio atravessa a troca de tela | home com `speaking:true, tts:1` | home com `speaking:false, tts:0` |
| **C1** frase agramatical | “Você gosta de eu gosto de brincar no parque?” | “Que legal! Você gosta de brincar no parque. Com quem você costuma fazer isso?” |
| **C2** Pular não cancelava a escuta | fala atrasada depois de “Palavra nova”; 3 opções viravam 0 | `options=3`, `childBubbles=1`, sem “Continuar” fantasma |
| **C3** pergunta sem resposta | só “Continuar ➜”, microfone sumia | microfone permanece; follow-up respondido de verdade |
| **C4** ignorava o conteúdo | tatu → “bicho”, letra B | “Tatu! Que bicho legal. Ele é grande ou pequeno?” |
| **C7** cartinha bloqueava a conversa | **6.874 ms** até as opções | **759 ms** |
| **C5** despedida duplicada | “Adorei conversar com você” 2× | 1× |
| **C6** microfone ficava ligado ao sair | `started:1, aborted:0, listening:true` | `started:1, aborted:1, listening:false` |
| **OCR** teste do título | 1 falha (`Um presente inesperado` sumia) | `tests/ocr.test.mjs` 15/15 |

## O que passou na bateria

- **Boot/PWA:** `v41` em `version.js`, dataset e `gabi-v41`; SW controlando; CORE 37; cache de áudio 1.118; Opus; 2 vozes pt-BR; nenhum erro de JavaScript.
- **Conversa:** cartinhas, humor, dois turnos livres com follow-up, sílabas, trava-língua, eco e despedida; **6 falas da criança** registradas; áudio do fluxo feliz sem sobreposição.
- **Interrupções:** Pular durante a escuta preserva o turno; toques rápidos abrem uma cartinha; sair da conversa para o áudio e o microfone; tirar a tela durante a fala não deixa áudio preso.
- **Voz:** opções aparecem em **759 ms**; o elogio continua falando em paralelo e a pergunta entra depois, sem bloquear a criança.
- **Lição:** u1 completa, revisão rápida, resultado salvo; avanço/replay rápidos sem clipe concorrente.
- **Navegação:** 10 rotas, sem modal preso, sem áudio preso e sem erro de JS.
- **Testes:** `node --test …` **65/65**; `pytest -q tests/test_invariants.py` **7/7**; `check-sw` e `content-manifest --check` OK.

## Evidências

- [08-pular-durante-escuta.png](../tests/stress-v41/08-pular-durante-escuta.png) — o turno de sílabas continua com as 3 opções; nenhuma fala atrasada entra depois.
- [04-conversa-turno-livre.png](../tests/stress-v41/04-conversa-turno-livre.png) — resposta gramatical e microfone do follow-up.
- [06a-conversa-segundo-turno.png](../tests/stress-v41/06a-conversa-segundo-turno.png) — “Tatu!” e pergunta de continuidade.
- [14-voz-latencia.png](../tests/stress-v41/14-voz-latencia.png) — opções na tela em menos de 1 s.
- [13-sair-durante-escuta.png](../tests/stress-v41/13-sair-durante-escuta.png) — home normal, coruja fora do estado “ouvindo”.
- [results.json](../tests/stress-v41/results.json) — 53 checks, logs de áudio e transcrições.

## Correções aplicadas

| Arquivo | Mudança |
| --- | --- |
| `app/js/audio.js` | `activeClips` + token de geração; `stopClip()` para todos; `playClip/playUrl` recusam clipe de fala cancelada; fallback MP3 não começa atrasado |
| `app/js/screen-lesson.js` | timer de 380 ms cancelado em `show/next/exit/finish`; `destroy()` do exercício anterior antes de montar o próximo |
| `app/js/main.js` | `route()` chama `stopSpeaking()` e `abortListening()`; hash vazio também passa por `route()` |
| `app/js/screen-talk.js` | `listenSeq` + `abortListening()` em Pular/Trocar/sair; `freeTurn` mantém o turno para o follow-up; elogio não bloqueia as opções; `callLLM` não duplica a fala da criança |
| `app/js/talk-reply.js` | novo parser puro: bicho favorito, “eu gosto de…”, opinião, fallback; `followUpAck` e `farewell` sem repetição; `não sei`/vazio não viram foco |
| `app/js/screen-book.js` | não corta o prefixo quando o “gap” é o ruído do fim da linha; título “Um presente inesperado” preservado |
| `app/js/version.js` / `app/sw.js` | v41 / `gabi-v41`; CORE com 37 entradas |
| `tests/talk-reply.test.mjs` | 6 testes do motor de resposta |
| `tests/test_invariants.py` | invariante de áudio atualizado para o token |

## Como repetir

```bash
node server/serve.mjs 8080
powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1
adb forward tcp:9222 localabstract:chrome_devtools_remote
node tests/stress-emu.mjs
```

Cenários isolados: `--scenario boot|talk|interrupt|voice|lesson|nav|mic|audio`. A bateria restaura o `localStorage` original e não altera o app.

## Limitações

- A escuta foi simulada com `__setListenOverride`/`SpeechRecognition` falso; o microfone físico do tablet ainda precisa de validação de campo.
- O TTS do emulador varia com a voz e o texto; os 759 ms são desta execução.
- Apenas a lição u1 foi percorrida por inteiro; a correção de áudio é estrutural, mas as outras 13 unidades não foram jogadas nesta rodada.
- O emulador não substitui o tablet para latência, volume e qualidade do microfone.
