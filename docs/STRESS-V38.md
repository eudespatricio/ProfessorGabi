# Stress test v38 — Emulador Android

> **Atualização:** as 9 falhas abaixo foram corrigidas na `v41`; a confirmação está em [`STRESS-V41.md`](STRESS-V41.md) (53/53). Este documento fica como linha de base.

> **Execução:** 08/11/2026 22:08 (America/Sao_Paulo) · **App:** `v38` · **Commit:** `8a710ef`
> **Ambiente:** Pixel 6 (AVD `gabi`), Android 15 / API 35, Chrome 156, áudio do emulador ligado
> **Bateria:** [`tests/stress-emu.mjs`](../tests/stress-emu.mjs) · **Evidências:** [`tests/stress-v38/results.json`](../tests/stress-v38/results.json) e [`tests/stress-v38/`](../tests/stress-v38/)

## Resultado

**49 verificações · 37 OK · 9 achados** (7 altos, 2 médios). O boot, o shell offline, o cache de áudio, a navegação e a lição completa passaram. As falhas se concentram em **conversa** e **áudio concorrente**, exatamente os dois pontos relatados.

| ID | Sev. | Sintoma | Evidência |
| --- | --- | --- | --- |
| **A3** | alta | Clipes de áudio tocam juntos ao avançar/repetir na lição | 40 `overlap-media`, 11 mídias simultâneas, 50 `play-while-active` |
| **A2** | alta | Trocar de tela não interrompe a fala da tela anterior | Home com `speaking:true, tts:1` depois de sair da lição |
| **C1** | alta | Resposta repete a frase da criança e quebra a gramática | “Você gosta de eu gosto de brincar no parque?” |
| **C2** | alta | “Pular” durante a escuta não cancela a escuta | Fala atrasada entra depois de “Palavra nova”; 3 opções viram 0 |
| **C3** | alta | Gabi pergunta e o app não deixa a criança responder | Pergunta no fim da fala; só existe “Continuar ➜” |
| **C4** | alta | Gabi ignora o conteúdo principal da resposta | Criança diz “tatu”; Gabi fala de “bicho” e da letra B |
| **C7** | alta | Escolher a cartinha bloqueia a conversa até o áudio terminar | 6,9 s até aparecer a pergunta de humor |
| **C5** | média | Despedida repete “Adorei conversar com você” | “Adorei conversar com você, Ana. Adorei conversar com você…” |
| **C6** | média | Sair da conversa durante a escuta não aborta o microfone | `started:1, aborted:0, listening:true` na home |

---

## Achados detalhados

### A3 — Clipes de áudio se sobrepõem na lição (alta)

**Reproduzir**

1. `node server/serve.mjs 8080` e abra o app no Chrome do emulador.
2. `node tests/stress-emu.mjs --scenario lesson`.
3. Observe o log de áudio: `overlaps=40`, `maxConcurrent=11`, `play-while-active=50`.

**Evidência** — [`11-licao-rapida.png`](../tests/stress-v38/11-licao-rapida.png) e o log em `results.json`:

```text
play-while-active  id=51 opus/de65cf1be7.opus
                   ativo: id=49 opus/ea2c1af751.opus (101 ms)
media-playing      id=50 ea2c1af751.mp3  ← fallback MP3 do clipe que já estava tocando
overlap-media      id=51 opus/de65cf1be7.opus + id=50 ea2c1af751.mp3 (22 ms)
```

O mesmo clipe chega a tocar em **Opus e MP3 ao mesmo tempo**, além de clipes diferentes.

**Causa provável**

- `app/js/audio.js:206` guarda **um único** `clipAudio`; `stopClip()` (`:150-157`) pausa só o último.
- `playClip()` (`:261-282`) não recebe token de geração: depois de `await loadClipIndex()`, uma chamada antiga continua e pode iniciar o fallback MP3 mesmo após `stopSpeaking()`.
- `speak()` incrementa `seq` (`:341`), mas não passa esse `seq` para `playClip`/`playUrl`.
- `app/js/screen-lesson.js:199` agenda `speakExerciseTarget()` em 380 ms e **não cancela o timer** ao trocar de exercício; `onDone` (`:286`) fala o feedback e `next()` (`:298`) já prepara o próximo item.

**Correção sugerida**

```js
const activeClips = new Set();

export function stopClip() {
  for (const a of activeClips) {
    try { a._cancel?.(); a.pause(); } catch {}
  }
  activeClips.clear();
}

async function playClip(text, rate, token) {
  // ...
  if (token !== seq) return false;
  const opus = opusSupported ? (await loadOpusIndex())[key] : null;
  if (token !== seq) return false;
  if (opus && await playUrl(opus, rate, 'opus', token)) return true;
  if (token !== seq) return false;          // <- impede o MP3 atrasado
  if (mp3 && await playUrl(mp3, rate, 'mp3', token)) return true;
}

export async function speak(text, opts = {}) {
  // ...
  stopClip();
  try { window.speechSynthesis?.cancel(); } catch {}
  const my = ++seq;
  const played = await playClip(text, rate, my);
  if (my !== seq) return { spoken: false, via: 'superseded' };
  if (played) return { spoken: true, via: 'clip' };
  // ...
}
```

`playUrl` deve adicionar/remover o `Audio` de `activeClips` e checar o token antes de `a.play()`.

Na lição: guardar o `setTimeout` de `show()` e `clearTimeout` em `show()`, `next()`, `tryExit()` e no `destroy()` do exercício.

---

### A2 — Trocar de tela não interrompe o áudio anterior (alta)

**Reproduzir**

1. Abra `#/licao/u2/0` e espere o card “Antes de praticar” falar.
2. Toque na aba **Início** (ou mude o hash) antes de a fala terminar.
3. A home aparece, mas `body.gabi-speaking` continua e o TTS segue tocando.

**Evidência** — [`12-navegacao.png`](../tests/stress-v38/12-navegacao.png); estado medido:

```json
{ "screen": "Professora Gabi … BOM DIA! Ana …", "speaking": true, "tts": 1, "media": 0 }
```

**Causa provável** — `app/js/main.js:21-77` (`route()`) troca a tela sem chamar `stopSpeaking()`; `clearScreen()` também não para áudio. Se a tela seguinte falar, as duas falas se sobrepõem.

**Correção sugerida** — no topo de `route()`:

```js
import { stopSpeaking } from './audio.js';
import { abortListening } from './speech.js';

function route() {
  stopSpeaking();
  abortListening();
  // ...
}
```

Isso também cobre boa parte de **C6**.

---

### C2 — “Pular” durante a escuta não cancela a escuta (alta)

**Reproduzir**

1. Converse até o turno livre (“Sua vez de falar”).
2. Toque no microfone. Enquanto “Estou ouvindo…” estiver na tela, toque em **Pular**.
3. A pergunta “Palavra nova: …” aparece; ~2 s depois a fala que chegou atrasada entra **depois** dela e um “Continuar ➜” cobre o turno.

**Evidência** — [`08-pular-durante-escuta.png`](../tests/stress-v38/08-pular-durante-escuta.png):

```text
antes do Pular: options=3 (sílabas)
depois:         options=0, childBubbles=2, continueButtons=1
ordem:          … “Palavra nova: peteca” → “eu gosto de brincar no parque” → “Adorei saber…”
```

**Causa provável** — `app/js/screen-talk.js:463`:

```js
const skip = el('button', { 'on:click': () => { stopSpeaking(); clearControls(); step++; askTurn(); } }, 'Pular');
```

Não chama `abortListening()` nem invalida a promessa de `listen()`. O handler do microfone (`:469-496`) continua depois do `await listen(...)` e faz `step++` de novo. O mesmo padrão existe em `echoTurn` (`Pular` em `:391`, `Trocar` em `:390`/`:451`).

**Correção sugerida** — token de escuta + abort:

```js
let listenSeq = 0;
function cancelListen() {
  listenSeq++;
  abortListening();
  busy = false;
}

mic.addEventListener('click', async () => {
  const my = ++listenSeq;
  const res = await listen({ onPartial: ... });
  if (!alive || my !== listenSeq) return;   // resposta velha é descartada
  // ...
});
```

Chamar `cancelListen()` em **Pular**, **Trocar**, **onExit** e ao trocar de trava-língua.

---

### C3 — Gabi pergunta e o app não deixa a criança responder (alta)

**Reproduzir**

1. Turno livre; responda “eu gosto de brincar no parque”.
2. A Gabi responde “Que legal! Você gosta de …? Eu também gosto de aprender coisas novas.”
3. Na tela só existe **“Continuar ➜”**; o próximo passo é “Palavra nova: …”. A pergunta fica sem resposta.

**Evidência** — [`04-conversa-turno-livre.png`](../tests/stress-v38/04-conversa-turno-livre.png); botões no momento:

```json
["🔊 Ouvir", "🔊 Ouvir", "🔊 Ouvir", "🔊 Ouvir", "🔊 Ouvir", "Continuar ➜"]
```

**Causa provável** — `gabiReply()` (`app/js/screen-talk.js:514-518`) devolve textos que terminam em pergunta, mas `freeTurn()` (`:487-495`) encerra o turno com `step++` e um único botão “Continuar”. A pergunta não tem canal de resposta.

**Correção sugerida** — ou (a) remover a pergunta dos templates do roteiro, ou (b) devolver `{ text, expectsAnswer }` e, quando `expectsAnswer`, manter o microfone e não avançar o `step` até a criança responder. O caminho (b) é o que dá conversa de verdade.

---

### C1 — Resposta repete a frase e quebra a gramática (alta)

**Reproduzir** — turno livre, criança diz `eu gosto de brincar no parque`; a primeira variante de `gabiReply` é escolhida:

> “Que legal! **Você gosta de eu gosto de brincar no parque?** Eu também gosto de aprender coisas novas.”

**Causa provável** — `app/js/screen-talk.js:515` cola `clean` inteiro dentro de “Você gosta de ${clean}?”. Se `clean` já começa com “eu gosto…”, a frase fica agramatical.

**Correção sugerida** — não interpolar a frase crua; extrair o complemento:

```js
const m = clean.match(/(?:eu\s+)?gosto\s+de\s+(.+)/i);
const gosto = m ? m[1] : clean;
return pick([
  `Que legal! Você gosta de ${gosto}?`,
  `Adorei saber que você gosta de ${gosto}.`,
  // ...
]);
```

Adicionar casos de teste com “eu gosto de…”, “meu bicho favorito é…”, “eu não sei” e frase vazia.

---

### C4 — Gabi ignora o conteúdo principal da resposta (alta)

**Reproduzir** — no segundo turno livre, criança diz `meu bicho favorito é o tatu`; a Gabi responde:

> “Entendi! Você falou **“bicho”**. Essa palavra começa com o som de B. Muito bem!”

**Causa provável** — `app/js/screen-talk.js:511-513`:

```js
const words = clean.split(' ').filter((w) => w.length > 2).slice(0, 2);
const focus = words[words.length - 1];
```

Pega as **duas primeiras** palavras longas (“meu”, “bicho”) e usa a segunda como foco. “tatu” nunca é considerado. É um recast genérico, não uma resposta.

**Correção sugerida** — parser de intenção curto antes dos templates:

- `meu/minha <X> favorito(a) é <Y>` → foco `<Y>` (tatu)
- `eu gosto de <Y>` / `gosto de <Y>` → foco `<Y>` (brincar no parque)
- `<Y> é legal/engraçado` → foco `<Y>`
- fallback: última palavra “de conteúdo” (não pronome, não “bicho” genérico)

Depois montar a resposta com o foco: “Tatu! Que bicho legal. Ele é grande ou pequeno?”.

---

### C7 — Escolher a cartinha bloqueia a conversa até o áudio terminar (alta)

**Reproduzir**

1. Conversa com áudio ligado.
2. Toque em uma cartinha e cronometre até aparecer a pergunta “Como você está hoje?”.
3. Nesta execução: **6.874 ms**. Em execuções anteriores variou entre **4,6 s e 7,0 s**.

**Evidência** — [`14-voz-latencia.png`](../tests/stress-v38/14-voz-latencia.png); TTS em dois pedaços:

```text
2.679 s  tts-call  “Boa escolha!”
4.147 s  tts-end
4.258 s  tts-call  “Hmm, comida é um ótimo assunto!”
8.183 s  tts-end
8.566 s  opções aparecem
```

**Causa provável** — `app/js/screen-talk.js:299-320` (`revealTheme`):

```js
bubble('gabi', cheer);
await sayAndWait(cheer, 380);
busy = false;
step = 0;
await askTurn();
```

`sayAndWait` espera o clipe/TTS inteiro; `bubble` divide a fala em duas sentenças e o TTS leva ~5,5 s. Enquanto `busy=true`, toques são ignorados. O mesmo `await sayAndWait(reply, 420)` aparece nas respostas de opções (`:350-354`).

**Correção sugerida** — desacoplar UI de áudio: mostrar as opções logo depois do `bubble` e disparar `speak(cheer)` sem `await`; se quiser evitar atropelo, `await Promise.race([speak(cheer), sleep(1200)])`. O handler das opções já chama `stopSpeaking()` antes de avançar.

---

### C5 — Despedida repete a mesma frase (média)

**Evidência** — `Adorei conversar com você, Ana. Adorei conversar com você. Você pode voltar quando quiser!`

**Causa** — `app/js/screen-talk.js:267` já coloca “Adorei conversar com você” e `FAREWELLS[0]` (`:120`) repete a mesma frase.

**Correção** — remover o prefixo do turno ou tirar “Adorei conversar com você.” da primeira despedida.

---

### C6 — Sair da conversa durante a escuta não aborta o microfone (média)

**Reproduzir** — no turno livre, toque no microfone e saia para a home antes do resultado.

**Evidência** — [`13-sair-durante-escuta.png`](../tests/stress-v38/13-sair-durante-escuta.png); `SpeechRecognition` falso:

```json
{ "started": 1, "aborted": 0, "listening": true }
```

A home aparece com a coruja no estado “ouvindo”; o reconhecimento só termina no timeout de 12 s (ou quando o serviço responde).

**Causa** — `onExit()` (`app/js/screen-talk.js:151-156`) chama `stopSpeaking()`, mas não `abortListening()`. O `listen()` de `app/js/speech.js:72-186` tem timer de 12 s.

**Correção** — chamar `abortListening()` no `onExit` e no `cancelListen()` de C2; no `route()` global (A2) como rede de segurança.

---

## O que passou

- **Versão/offline:** `v38` em `version.js`, dataset e `gabi-v38`; SW controlando; `CORE` 36; cache de áudio **1.118** entradas (1.116 clipes + 2 índices); Opus suportado; 2 vozes pt-BR; aviso falso “sem voz” não apareceu.
- **Conversa (lógica, sem áudio):** cartinhas, humor, sílabas, trava-língua, eco e despedida percorridos; 5 falas da criança registradas; **0** sobreposição de mídia no fluxo feliz; toques rápidos abrem só uma cartinha.
- **Lição:** u1 completa, revisão rápida 2/2, resultado e progresso salvos; sem erros de JavaScript.
- **Navegação:** 10 rotas em sequência, sem modal preso e sem erro de JS; o único problema é o áudio que atravessa a rota (A2).
- **Invariantes:** `pytest -q tests/test_invariants.py` → **7/7**; `node --test …` → **58/59** (a falha é de OCR, ver abaixo).

## Fora do escopo (mas importante)

- **Teste de OCR falhando:** `tests/ocr.test.mjs:93` espera “Um presente inesperado” e recebe o texto sem esse título. O título tem confiança 93/96/95 e é descartado pelo `sanitizeOcr`. Não é regressão de conversa/áudio, mas o suite não está verde.
- **Documentação secundária:** referências v37 em `MAPA.md`/`README.md` foram corrigidas nesta entrega; o teste de OCR segue pendente.
- **C6 do LLM (não exercitado):** com `settings.llm.enabled`, `freeTurn` faz `bubble('child', transcript)` (que empurra para `history`) e `callLLM` anexa o mesmo texto de novo em `messages`. O modelo recebe a última fala da criança duplicada. Corrigir em `callLLM` removendo o último item de `history` se for igual a `childText`.

## Limitações do teste

- **ASR simulado:** os cenários de conversa usam `__setListenOverride` e um `SpeechRecognition` falso; o microfone real do tablet não foi exercitado. O comportamento de `listen()`/`abortListening()` foi medido, mas latência e erros do Google ASR não.
- **TTS depende do dispositivo:** o emulador com áudio ligado iniciou o TTS e permitiu medir C7. A duração varia com a voz e o texto; os 6,9 s são desta execução, não uma constante.
- **Uma lição:** u1 foi percorrida por inteiro; as outras 13 unidades não foram jogadas nesta bateria. A corrida de áudio é estrutural (`playClip`), mas a frequência pode variar.
- **Emulador ≠ tablet:** não substitui a validação física de microfone, latência e volume.

## Como repetir

```bash
# 1) servidor
node server/serve.mjs 8080

# 2) emulador (Windows) e DevTools
powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1
adb forward tcp:9222 localabstract:chrome_devtools_remote

# 3) bateria completa
node tests/stress-emu.mjs

# cenários isolados
node tests/stress-emu.mjs --scenario boot
node tests/stress-emu.mjs --scenario talk
node tests/stress-emu.mjs --scenario interrupt
node tests/stress-emu.mjs --scenario voice
node tests/stress-emu.mjs --scenario lesson
node tests/stress-emu.mjs --scenario nav
node tests/stress-emu.mjs --scenario mic
```

A bateria restaura o `localStorage` original no fim e não altera código do app.

## Ordem sugerida de correção

1. **A3 + A2** — geração de áudio, `stopClip` de todos os elementos e `stopSpeaking()` no roteador. É a causa direta do áudio sobreposto.
2. **C2 + C6** — abortar/invalidar `listen()` em Pular, Trocar, sair e trocar de rota. Corrige a invasão de turno e o microfone que fica ligado.
3. **C1 + C3 + C4 + C5** — trocar o recast por um parser de intenção curto, manter o microfone quando a Gabi pergunta e limpar a despedida.
4. **C7** — não bloquear a UI enquanto a Gabi fala; mostrar as opções e deixar o áudio correr/cancelar.
5. **OCR + documentação** — triagem do teste de OCR e sincronizar `MAPA.md`/`README.md` para v38.
