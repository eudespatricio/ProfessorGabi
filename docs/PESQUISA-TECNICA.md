# Pesquisa técnica — PWA de tutoria de leitura em pt-BR (Chrome Android / tablet)

**Data da pesquisa:** novembro/2026
**Alvo:** app estático (HTML/CSS/JS puro, sem backend), instalado como PWA, uso doméstico, tablet Android 10–14 com Chrome atualizado. A criança (8 anos) lê em voz alta; o app fala (TTS) e escuta (ASR).

**Como ler este documento — selos de confiança:**

| Selo | Significado |
|---|---|
| ✅ **OFICIAL** | Verificado em documentação oficial (MDN, Chrome for Developers, web.dev, Chromium, W3C, Android, Gov.br). |
| ⚠️ **COMUNIDADE** | Prática consolidada em fóruns/issues/relatos recentes. Não há garantia documental; trate como "provavelmente verdade, teste no aparelho". |
| ❓ **INCERTO** | Comportamento que muda com frequência ou que não consegui confirmar em fonte primária. Exige teste manual no tablet alvo. |

---

## 0. Veredito executivo

1. **TTS pt-BR: viável e recomendado.** `speechSynthesis` é Baseline (amplamente disponível) e no Android usa o motor de TTS do sistema (Google TTS), que tem voz pt-BR de boa qualidade para 1–3 frases. ✅
   **Ressalvas reais:** no Chrome as vozes não estão prontas no `load` (precisa de `voiceschanged`); falar sem gesto do usuário é unreliable (relatos desde dez/2018); e há um bug antigo de corte em utterances longas (~15 s) — resolvido **fatiando o texto em utterances curtas**. ✅⚠️

2. **ASR (`webkitSpeechRecognition`): funciona, mas é o elo frágil.** No Chrome Android o reconhecimento é **baseado em servidor** — o áudio sai do tablet e vai para servidores do Google, e **não funciona offline**. ✅
   **Achado crítico:** no Chrome Android **`continuous = true` não tem efeito** (a propriedade pode ser setada, mas é ignorada), e o reconhecimento **não há on-device**: `processLocally`, `available()` e `install()` estão documentados como **não suportados no Chrome Android** (só desktop). ✅
   **Consequência de projeto:** o app precisa funcionar em **turnos curtos** (uma frase por vez), reiniciando o reconhecedor a cada turno, com fallback obrigatório.

3. **Contexto seguro: `http://192.168.x.x` não serve para o produto final.** Não dá para instalar como PWA, não registra Service Worker e o microfone é bloqueado (o `getUserMedia` — e portanto a captura que o ASR usa — exige contexto seguro). ✅
   **Sem saída "mágica" no Android:** a flag `chrome://flags#unsafely-treat-insecure-origin-as-secure` não é um caminho confiável no Android (ver §4.3).

4. **Instalação: dois caminhos, um atalho e um definitivo.**
   - **Atalho (5 min, zero conta):** túnel `cloudflared` → URL `https://…trycloudflare.com` → instalar. **Problema:** a URL muda a cada execução → a PWA instalada "perde" o vínculo e o progresso salvo. ⚠️
   - **Definitivo (recomendado):** **HTTPS local com `mkcert` + CA instalada uma vez no tablet**, com **IP fixo (reserva DHCP)**. Origin estável para sempre, progresso preservado, instalação real (WebAPK) e app abre offline pelo cache. ✅⚠️

5. **Fallback obrigatório.** Para uma criança de 8 anos, o caminho mais robusto **não** é trocar ASR por outra API (exigiria backend/chave), e sim: **avaliação por toque (a criança toca na palavra que leu) + gravação local com `MediaRecorder` para o adulto conferir depois + "tentar de novo" sem punição**. ⚠️

---

## 1. Tabela de compatibilidade

| Recurso | Chrome Android (2026) | Precisa HTTPS? | Precisa internet? | Observação | Confiança |
|---|---|---|---|---|---|
| `speechSynthesis` / `SpeechSynthesisUtterance` | Sim (Baseline desde set/2018) | Não | Não (vozes locais) | Vozes vêm do motor TTS do sistema | ✅ |
| Voz pt-BR (`lang: "pt-BR"`) | Sim, se o motor TTS tiver a voz instalada | Não | Não | Nome típico: "Google português do Brasil" | ✅⚠️ |
| `voiceschanged` | Sim | Não | Não | No Android pode só disparar **depois** do 1º `speak()` | ✅⚠️ |
| `SpeechRecognition` (sem prefixo) | Sim, desde Chrome 139 | **Sim** | **Sim** | Antes disso, só `webkitSpeechRecognition` (Chrome 33+) | ✅ |
| `webkitSpeechRecognition` | Sim (legado, ainda funciona) | **Sim** | **Sim** | Continua sendo o que a maioria dos tutoriais usa | ✅ |
| `continuous = true` | **Não** (seta, mas não faz efeito) | — | — | Bug aberto: crbug.com/41297427 | ✅ |
| `interimResults` | Sim | Sim | Sim | Útil para feedback visual, **não** para avaliar | ✅ |
| `maxAlternatives` | Sim | Sim | Sim | Ajuda quando a criança fala baixo | ✅ |
| `processLocally` / `available()` / `install()` | **Não** (desktop-only, Chrome 139+) | — | — | ASR on-device **não** existe no Chrome Android | ✅ |
| `MediaRecorder` | Sim | **Sim** | Não | `audio/webm;codecs=opus` | ✅ |
| `getUserMedia` | Sim | **Sim** | Não | Exige contexto seguro (regra explícita do MDN) | ✅ |
| Service Worker | Sim | **Sim** | Não | Só registra em contexto seguro | ✅ |
| Instalação PWA (`beforeinstallprompt` / WebAPK) | Sim | **Sim** (certificado **confiável**) | No 1º load | Exige manifest + SW com handler de `fetch` | ✅⚠️ |
| `localStorage` / IndexedDB | Sim | Não | Não | Funciona até em `http://192.168.x.x` | ✅ |
| `display: standalone` | Sim | — | — | Ignorado se o app não foi instalado de verdade | ✅ |

> Caniuse classifica a API de reconhecimento como **"partial support"** no Chrome (por causa de `continuous`/gramáticas), não como "não suportado": <https://caniuse.com/speech-recognition>. ✅

---

## 2. TTS — `speechSynthesis` em Chrome Android

### 2.1 O que é oficialmente garantido

- `speechSynthesis` é **Baseline / widely available** desde setembro de 2018 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)). ✅
- `rate` vai de **0.1 a 10**, default **1**; `pitch` idem (default 1); `volume` 0–1. O motor pode limitar mais que isso ([MDN rate](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate)). ✅
- O MDN documenta explicitamente a pegadinha do Chrome: *"in Google Chrome the voices are not ready on page load"* — por isso o exemplo oficial usa `onvoiceschanged` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance)). ✅
- Eventos úteis: `start`, `end`, `error`, `boundary` (útil para destacar a palavra que está sendo falada), `pause`, `resume`.

### 2.2 Vozes pt-BR no Android

No Android, `getVoices()` **não** devolve vozes do Chrome: devolve as vozes do **motor TTS do sistema** (normalmente "Fala do Google" / Google TTS). Consequências práticas:

- O nome da voz varia (`"Google português do Brasil"`, `"pt-br-x-ptd-local"`, etc.). **Nunca filtre por nome**; filtre por `lang`.
- A voz pode **não existir** se o tablet não tiver o pacote de voz pt-BR baixado (tablets sem Google Apps, ou TTS nunca configurado). O erro chega como `error === "language-unavailable"` / `"voice-unavailable"`.
- Vozes locais (`voice.localService === true`) são mais estáveis e não dependem de rede; vozes remotas podem sofrer o bug de corte. ⚠️

> ⚠️ **COMUNIDADE:** no Android há relatos de que `getVoices()` volta **vazio** até o primeiro `speak()` acontecer, e de que `voiceschanged` pode demorar ou não disparar. Estratégia à prova de balas: ler vozes no `voiceschanged` **e** reconsultar `getVoices()` no clique do usuário **e** ter um timeout de ~1,5 s antes de falar com `lang` apenas (sem `voice`).

### 2.3 Seleção de voz pt-BR (código)

```js
// tts.js — seleção de voz pt-BR tolerante a falhas
const synth = window.speechSynthesis;

function normalizaLang(v) {
  return (v.lang || '').toLowerCase().replace('_', '-');
}

function escolheVozPtBr(voices) {
  const pt = voices.filter(v => normalizaLang(v).startsWith('pt'));
  const ehBR = v => normalizaLang(v) === 'pt-br';
  return (
    pt.find(v => ehBR(v) && v.localService) || // 1º: pt-BR local (mais estável)
    pt.find(ehBR) ||                            // 2º: pt-BR remota
    pt.find(v => v.localService) ||             // 3º: qualquer pt local
    pt[0] ||                                    // 4º: qualquer pt
    null
  );
}

let vozes = [];
function carregaVozes() { vozes = synth.getVoices(); }

carregaVozes();
if ('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', carregaVozes);
// fallback: reconsulta quando o usuário toca (no Android a lista pode "acordar" só depois)
document.addEventListener('pointerdown', carregaVozes, { once: true });
```

### 2.4 Falar com segurança: fatiar, ter timeout, nunca travar a UI

**Problema oficial:** há um bug antigo e ainda aberto no Chromium — *"Speech Synthesis stops abruptly after about 15 seconds"* ([issues.chromium.org/41294170](https://issues.chromium.org/issues/41294170)). A `Promise` de `speak()` nunca existe, então o app pode ficar esperando um `end` que não vem. ⚠️✅

**Solução robusta (e simples):** falar em **utterances curtas** (1 frase por utterance, ≤ ~120 caracteres) encadeadas por `onend`, com **watchdog** por utterance.

```js
function falaUmaVez(texto, { rate = 0.92, pitch = 1.05 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) return reject(new Error('sem-tts'));

    const u = new SpeechSynthesisUtterance(texto);
    const voz = escolheVozPtBr(synth.getVoices());
    if (voz) { u.voice = voz; u.lang = voz.lang; } else { u.lang = 'pt-BR'; }
    u.rate = rate; u.pitch = pitch; u.volume = 1;

    // watchdog: se o Chrome "engolir" o evento end (bug dos ~15 s), seguimos em frente
    const limiteMs = Math.min(20000, 2500 + texto.length * 110);
    let terminou = false;
    const finaliza = (fn, arg) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(timer);
      fn(arg);
    };
    const timer = setTimeout(() => {
      try { synth.cancel(); } catch {}
      finaliza(resolve); // não rejeita: seguir o jogo é melhor que travar
    }, limiteMs);

    u.onend = () => finaliza(resolve);
    u.onerror = (e) => {
      // 'interrupted'/'canceled' são esperados quando chamamos cancel()
      if (e.error === 'interrupted' || e.error === 'canceled') return finaliza(resolve);
      finaliza(reject, e);
    };

    synth.cancel();   // limpa fila travada de execuções anteriores
    synth.speak(u);
  });
}

// Divide em frases curtas: cada pedaço vira uma utterance (evita o corte dos ~15 s)
function fatiaTexto(texto, max = 120) {
  return texto
    .split(/(?<=[.!?…])\s+/)
    .flatMap(f => f.length <= max ? [f] : f.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')))
    .map(s => s.trim())
    .filter(Boolean);
}

async function fala(texto) {
  for (const parte of fatiaTexto(texto)) {
    await falaUmaVez(parte);
  }
}
```

> ⚠️ **COMUNIDADE:** o "hack" clássico de chamar `speechSynthesis.resume()` a cada ~10 s funciona no desktop, mas há relatos de que **`resume()` não funciona no Chrome Android**. Prefira o fatiamento (que resolve o problema na raiz) e trate o `resume()` só como reforço opcional.

### 2.5 Gesto do usuário, pausas e autoplay

- ✅ **OFICIAL:** a política de autoplay do Chrome cobre `<audio>`, `<video>` e Web Audio — **não** cita `speechSynthesis` ([Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay)).
- ⚠️ **COMUNIDADE (forte):** desde dezembro de 2018 relata-se que o Chrome **não toca TTS sem interação prévia do usuário** na página ([SO 42875726](https://stackoverflow.com/questions/42875726/speechsynthesis-speak-in-web-speech-api-always-stops-after-a-few-seconds-in-go)). O sintoma é silencioso: nada acontece, ou `onend` dispara na hora.
- ✅ **OFICIAL (bônus):** ainda na política de autoplay, **instalar a PWA / adicionar à tela inicial conta como engajamento** e libera áudio com som no mobile. Mais um motivo para instalar de verdade.

**Regra de projeto:** a primeira tela do app é um botão grande **"Começar"**. O `click` desse botão (a) destrava áudio, (b) pede o microfone, (c) faz uma fala curta de boas-vindas. Tudo o mais só acontece depois disso.

- **`pause()` / `resume()`:** funcionam no desktop, são **instáveis no Android** (relatos de `pause()` que não pausa e `resume()` que não retoma). ⚠️
  **Recomendação:** para "repetir a frase", **não use pause/resume** — use `cancel()` + falar de novo. Para "parar", `cancel()`.

### 2.6 Parâmetros recomendados para criança de 8 anos

| Parâmetro | Valor | Por quê |
|---|---|---|
| `rate` | **0.85–0.95** | Abaixo de 0.8 soa artificial e arrasta sílabas; acima de 1.0 fica rápido demais para acompanhar |
| `pitch` | **1.0–1.15** | Voz levemente mais aguda é mais amigável; >1.3 soa "desenho animado" |
| `volume` | **1** | Deixe o volume do sistema controlar |
| Tamanho da utterance | **≤ 120 caracteres / 1 frase** | Evita o corte dos 15 s e facilita sincronizar destaque de palavra |
| Idioma | `lang = "pt-BR"` **sempre** | Se faltar voz pt, o Chrome pode tentar outra língua e sair "engolindo" vogais |

> **Detalhe de qualidade:** a voz pt-BR do Google TTS pronuncia bem palavras isoladas e frases curtas, mas **lê números e siglas de forma literal** ("8" → "oito" funciona; "1º" pode virar "um grau"). Para o material didático, prefira escrever por extenso no campo `text` do utterance e manter a forma original só na tela.

---

## 3. ASR — reconhecimento de fala no Chrome Android

### 3.1 Ainda funciona em 2025–2026? Sim — com três letras miúdas

✅ **OFICIAL (MDN / compat data):**

- `SpeechRecognition` **sem prefixo** no Chrome desde a **versão 139**; `webkitSpeechRecognition` desde a **33**. No Chrome Android vale o mesmo (o compat data espelha o desktop). ([MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [BCD `SpeechRecognition.json`](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json))
- **É baseado em servidor:** *"Your audio is sent to a web service for recognition processing, so it won't work offline."* (MDN, tanto na página da interface quanto no guia [Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)). ✅

Letras miúdas:

1. **`continuous` não existe de fato no Android.** O compat data do MDN marca `chrome_android: false` para `continuous`, com a nota *"The property can be set, but has no effect"* e o link do bug [crbug.com/41297427](https://crbug.com/41297427). ✅
   → **Consequência:** o reconhecedor **para sozinho** depois de uma frase/pausa. O app tem que **reiniciar** o reconhecimento a cada turno.
2. **ASR on-device não está disponível no Android.** `processLocally`, `SpeechRecognition.available()`, `SpeechRecognition.install()` e `start(audioTrack)`: Chrome 139/135 no **desktop**, `chrome_android: false` no compat data. ✅
   → **Consequência:** não conte com reconhecimento offline/privado no tablet. A promessa de "processamento local" **não** vale aqui.
3. **A sessão tem limite prático.** Relatos consistentes de que o Chrome encerra a sessão sozinho (por silêncio, por tempo, ou por limite do serviço) — a resposta clássica é *"restart speech recognition once it is over"* ([SO 38213580](https://stackoverflow.com/questions/38213580/chromes-webkitspeechrecognition-ends-randomly)). Um relato antigo cita **~60 s por sessão**. ⚠️ Números exatos variam e não são documentados.

### 3.2 Limites e comportamento dos parâmetros

| Parâmetro | Comportamento real no Chrome Android | Confiança |
|---|---|---|
| `lang = "pt-BR"` | Funciona. **Sempre setar explicitamente** (recomendação do MDN). | ✅ |
| `continuous` | **Ignorado.** Sessão única. | ✅ |
| `interimResults = true` | Funciona; devolve hipóteses que mudam. Bom para UI, **ruim para avaliar**. | ✅ |
| `maxAlternatives` | Funciona (default 1). `3` dá margem para voz infantil. | ✅ |
| `confidence` | **Muitas vezes vem `0`** no Android. Não use como nota. | ⚠️ |
| `grammars` | Ignorado (conceito removido da spec). | ✅ |
| Duração da sessão | Limite prático; reinicie por turno. | ⚠️ |
| Custo de rede | Cada turno manda áudio para o Google; em 3G/4G ruim → erro `network`. | ✅ |

### 3.3 Precisão para voz infantil em pt-BR

✅ **Ciência:** ASR genérico erra **mais** com voz infantil do que adulta — diferenças fisiológicas (pitch/formantes), prosódia e disfluências. Ex.: *"Causal analysis of ASR errors for children"* (Computer Speech & Language, 2025) e *"Towards improved Automatic Speech Recognition for children"* (IberSPEECH 2024).

**Implicações de projeto (importantes):**

- **Não peça "nota de pronúncia".** O ASR devolve *texto*, não fonemas; ele "corrige" a criança para a palavra provável. Avaliar pronúncia com ASR genérico é tecnicamente inválido.
- Avalie **correspondência de palavras** (a criança leu a palavra certa?), com normalização + distância de edição, e **limiar tolerante**.
- Trate `interimResults` apenas como "está falando"; **decida só no resultado final**.
- **Sempre** ofereça "Tentar de novo" e "Eu li, mas o app não entendeu" — a criança de 8 anos não pode ser punida por falha de infraestrutura.

```js
// Comparação tolerante palavra a palavra (sem dependências)
const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normaliza = s => semAcento(s.toLowerCase())
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// similaridade 0..1 entre a palavra esperada e o que o ASR devolveu
function parecido(esperada, dita) {
  const a = normaliza(esperada), b = normaliza(dita);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

// a criança "acertou" se alguma palavra do trecho dito bate com a esperada
function acertouPalavra(esperada, transcricao, limiar = 0.72) {
  return normaliza(transcricao).split(' ')
    .some(p => parecido(esperada, p) >= limiar);
}
```

> Limiar 0.72 é ponto de partida empírico, **não** recomendação oficial. Calibre com gravações reais da criança (o mesmo tablet, o mesmo microfone, a mesma sala). ❓

### 3.4 Reconhecimento com tratamento de erros (código)

```js
// asr.js — turno único, com máquina de estados e erros mapeados
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const MENSAGENS = {
  'no-speech':        'Não ouvi nada. Chega mais perto do tablet e tenta de novo.',
  'aborted':          'Pausamos a escuta.',
  'audio-capture':    'Não achei o microfone do tablet.',
  'not-allowed':      'O tablet não deixou usar o microfone. Chama um adulto.',
  'service-not-allowed': 'O Chrome não liberou a escuta. Chama um adulto.',
  'network':          'A internet falhou na hora de ouvir. Vamos tentar de novo?',
  'language-not-supported': 'O tablet não tem reconhecimento em português.',
  'phrases-not-supported': 'Recurso indisponível neste Chrome.',
};

export function criaReconhecedor({ onFinal, onInterim, onEstado }) {
  if (!SR) return null;

  const r = new SR();
  r.lang = 'pt-BR';
  r.continuous = false;        // no Android é ignorado de qualquer forma
  r.interimResults = true;
  r.maxAlternatives = 3;

  r.onstart = () => onEstado?.('ouvindo');
  r.onspeechend = () => { try { r.stop(); } catch {} }; // fecha o turno quando a criança cala
  r.onresult = (ev) => {
    let parcial = '', textoFinal = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) {
        // res[k] = k-ésima hipótese (até maxAlternatives); a [0] é a mais provável.
        // Guarde res[1..] se quiser tentar casar com a palavra esperada.
        textoFinal += (res[0]?.transcript || '') + ' ';
      } else {
        parcial += res[0]?.transcript || '';
      }
    }
    if (parcial) onInterim?.(parcial);
    if (textoFinal.trim()) onFinal?.(textoFinal.trim());
  };
  r.onerror = (ev) => {
    onEstado?.('erro');
    onFinal?.(null, { codigo: ev.error, mensagem: MENSAGENS[ev.error] || 'Não consegui ouvir.' });
  };
  r.onend = () => onEstado?.('parado');

  return r;
}

// uso: um turno por vez, sempre a partir de um toque
export function ouveUmTurno(r, handlers) {
  if (!r) return handlers.onSemSuporte?.();
  try {
    r.start();
  } catch (e) {
    // "InvalidStateError" = já está rodando; "NotAllowedError" = sem permissão/gesto
    handlers.onFinal?.(null, { codigo: e.name, mensagem: 'Espera um segundinho e toca de novo.' });
  }
}
```

**Máquina de estados recomendada (por turno):**

```
[toque "Pode ler"] → pede permissão (1x) → start() → ouvindo
   ├─ result final  → avalia → feedback → próximo turno
   ├─ no-speech     → mensagem gentil → oferece "tentar de novo" (mesmo turno)
   ├─ network       → mensagem + botão "tentar de novo"; após 2 falhas, cai no modo toque
   ├─ not-allowed / service-not-allowed / audio-capture → modo toque (definitivo), sem drama
   └─ end sem resultado → tenta reiniciar 1x automaticamente; se falhar, pede toque
```

> ⚠️ **COMUNIDADE:** reiniciar `start()` automaticamente **em loop** tende a gerar `not-allowed`. Reinicie **no máximo 1 vez** por turno e, fora isso, exija um toque. Toda a cadeia (TTS → pausa → ASR) deve ter **timeout**: nunca deixe a criança olhando para uma tela travada.

### 3.5 Permissão de microfone de forma amigável

✅ `getUserMedia` exige contexto seguro (regra explícita do MDN: [features restricted to secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts)).

**Fluxo recomendado (4 telas, linguagem de criança):**

1. **Tela do adulto** ("Configurar uma vez"): explica que o app vai usar o microfone e a internet, e que **a voz é enviada para o Google** para ser transcrita. Um botão "Testar microfone".
2. **Diálogo nativo do Chrome** aparece **só depois** de um toque — nunca no carregamento. Permissão pedida "do nada" é negada.
3. Se negar: a tela **não** insiste; mostra "O microfone está desligado. Toque no cadeado 🔒 da barra de endereço → Permissões → Microfone → Permitir" (e um botão "Continuar sem voz").
4. **Modo toque** sempre disponível como plano B (ver §6).

```js
// Preflight: descobre o estado real do microfone sem depender de permissions.query
async function testaMicrofone() {
  if (!window.isSecureContext) return { ok: false, motivo: 'insecure-context' };
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, motivo: 'sem-api' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());   // libera o microfone na hora
    return { ok: true };
  } catch (e) {
    // NotAllowedError | NotFoundError | NotReadableError | OverconstrainedError
    return { ok: false, motivo: e.name };
  }
}
```

> `navigator.permissions.query({ name: 'microphone' })` funciona no Chromium, mas não é uniforme entre navegadores e pode lançar `TypeError`. Use só dentro de `try/catch`, como enfeite — a fonte de verdade é o `getUserMedia`. ❓

### 3.6 Erros — o que cada um significa na prática

| `error` | Causa provável no tablet | O que fazer |
|---|---|---|
| `no-speech` | Criança não falou, falou baixo, ou microfone longe | Repetir com incentivo; **não** contar como erro |
| `not-allowed` | Permissão negada, **origem insegura** (http), ou `start()` sem gesto | Mandar para a tela do adulto; cair no modo toque |
| `service-not-allowed` | Chrome/serviço de reconhecimento indisponível (política, região, perfil gerenciado) | Modo toque definitivo |
| `audio-capture` | Sem microfone / microfone ocupado por outro app | Fechar outros apps; testar de novo |
| `network` | Internet caiu, Wi-Fi fraco, bloqueio do serviço | Retry 2x → modo toque; **avisar que ASR precisa de internet** |
| `aborted` | `abort()`/`stop()` chamado pelo app | Ignorar (esperado) |
| `language-not-supported` | Sem pacote pt-BR para reconhecimento | Avisar adulto; modo toque |

Fonte da lista de valores: [MDN `SpeechRecognitionErrorEvent.error`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error). ✅

### 3.7 A armadilha do eco (TTS × ASR)

Se o app fala e escuta na mesma sala, **o microfone ouve o próprio TTS** e transcreve a fala do app. Isso destrói a avaliação e é uma das causas mais comuns de "a criança acertou mas o app não entendeu".

**Regra:** estado global `TTS_FALANDO` — nunca `start()` enquanto `synth.speaking`; espere `onend` **+ 250–400 ms** de silêncio. E, ao terminar o turno, `cancel()` imediato antes de avaliar.

---

## 4. Contexto seguro, origem e como servir o app

### 4.1 O que é (e o que não é) contexto seguro

✅ **OFICIAL** ([MDN — Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)):

| URL | Contexto seguro? |
|---|---|
| `https://exemplo.com` | ✅ Sim |
| `http://localhost` / `http://127.0.0.1` | ✅ Sim (loopback) |
| `http://[::1]` | ✅ Sim |
| `file:///.../index.html` | ✅ Sim (mas **não instalável** como PWA) |
| `http://192.168.1.50` | ❌ **Não** |
| `http://meu-tablet.local` | ❌ Não (não é loopback) |

⚠️ **Detalhe que quase todo mundo erra:** o `file://` é contexto seguro, mas **não é origem instalável**. O MDN é explícito: para PWA ser instalável, é preciso `https`, `localhost` ou `127.0.0.1` — *"a more stringent requirement than secure context, which considers resources loaded from `file://` URLs to be secure"* ([Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)). ✅

E `isSecureContext` é a checagem de 1 linha que o app deve fazer na inicialização:

```js
if (!window.isSecureContext) {
  // mostra tela "modo leitura guiada" (sem microfone, sem instalação)
}
```

### 4.2 O que quebra em `http://192.168.x.x` (LAN sem TLS)

| Item | Em http LAN |
|---|---|
| TTS (falar) | ✅ **Funciona normalmente** |
| `localStorage` / IndexedDB | ✅ Funciona (origem é origem) |
| Service Worker / offline | ❌ Não registra |
| Instalação como PWA (WebAPK) | ❌ Não instala (só atalho de navegador) |
| `getUserMedia` (mic) | ❌ Bloqueado |
| `SpeechRecognition` | ❌ Falha na prática → `not-allowed` (depende de captura de mic) |

> ⚠️ **COMUNIDADE:** não há uma linha na spec do Web Speech API dizendo "SpeechRecognition exige contexto seguro" (não está na lista do MDN). Na prática o Chrome precisa do microfone, e o microfone é bloqueado em origem insegura — daí `not-allowed`. Trate como **fato operacional**, e teste no aparelho. Relato recente do sintoma: *"Voice dictation shows 'Microphone access denied' on insecure (HTTP) origins"* ([issue #4571](https://github.com/nesquena/hermes-webui/issues/4571)) e [SO 65561185](https://stackoverflow.com/questions/65561185/chrome-webspeech-api-returning-not-allowed-error).

**Conclusão de arquitetura:** é perfeitamente possível ter um **"modo leitura guiada"** rodando em `http://192.168.x.x` (fala + toque + progresso local). Só o **modo escuta** e a **instalação** exigem HTTPS.

### 4.3 As alternativas, uma por uma

#### (a) `chrome://flags#unsafely-treat-insecure-origin-as-secure` — **não conte com isso no Android** ❓

- No desktop é trivial. No Android, a página `chrome://flags` existe, mas essa flag **não** aparece de forma confiável, e o caminho "oficial" de linha de comando exige `chrome-command-line` em `/data/local/tmp` **com** a flag `#enable-command-line-on-non-rooted-devices` habilitada (ela existe no Chromium: [flag-metadata.json](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/flag-metadata.json)).
- É um procedimento de desenvolvedor, some em updates, e **não** é algo que se pede a um pai. ⚠️ ([SO: run Chrome with flags on Android](https://stackoverflow.com/questions/29280796/run-google-chrome-with-flags-on-android))
- **Veredito:** use no máximo para depurar. **Não** é caminho de produto.

#### (b) `http://localhost` via `adb reverse` — ótimo para desenvolver, inútil para a criança

```bash
adb reverse tcp:8080 tcp:8080     # tablet: http://localhost:8080 → PC:8080
```
`localhost` é contexto seguro ✅, então **ASR e Service Worker funcionam** — mas isso exige **cabo USB + PC ligado + adb** toda vez, e a criança não vai usar assim. ✅ ([adb docs](https://developer.android.com/tools/adb), [Android — access local server](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server))

#### (c) Túnel HTTPS (`cloudflared` quick tunnel) — o atalho de 5 minutos

```bash
cloudflared tunnel --url http://localhost:8080
# imprime algo como https://algo-aleatorio.trycloudflare.com
```
✅ **OFICIAL** ([Cloudflare — Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)): não precisa de conta nem domínio. **Limitações oficiais:** sem garantia de uptime, **hostname muda a cada execução**, até 200 requisições em voo, **não suporta SSE**, e *"Quick Tunnels are for testing and development"*.

**Impacto no app:** a PWA é instalada **por origem**. Se o hostname muda, a criança precisa reinstalar e **o `localStorage` antigo fica órfão** (progresso "desaparece"). ⚠️
**Mitigação:** função "Exportar/Importar progresso" (JSON) desde o dia 1.

#### (d) HTTPS local com `mkcert` + CA instalada no tablet — **recomendado para uso diário**

✅ **OFICIAL** ([mkcert](https://github.com/FiloSottile/mkcert)): gera uma CA local e certificados confiáveis; o README explica que em dispositivos móveis é preciso **instalar o `rootCA.pem`** no aparelho.

- Vantagem decisiva: **origem estável** (`https://192.168.1.10:8443`) → instala uma vez, o progresso fica para sempre, e o app **abre offline** (cache do SW) mesmo com o servidor desligado.
- Custo: instalar a CA **uma vez** no tablet (5–6 toques) e reservar o IP no roteador.

#### (e) Outras opções (para registro)

- **Tailscale + HTTPS**: funciona muito bem, mas exige conta e app no tablet — mais peças móveis. ⚠️
- **Certificado público** (Let's Encrypt) com domínio real apontando para IP privado: funciona com DNS-01, mas é overkill e frágil para uso doméstico. ⚠️
- **Servir de um host com domínio público** (ex.: GitHub Pages/Netlify): o mais simples de todos se o app for **público** — mas então não há "servidor local". Vale considerar se o app não tiver nada sensível.

### 4.4 ✅ CAMINHO RECOMENDADO (passo a passo)

> **Decisão:** `mkcert` + **IP fixo** + servidor HTTPS local. É o único caminho que junta **origem estável**, **instalação real** e **funciona sem PC ligado para abrir** (cache). O "atalho" com quick tunnel vem logo depois, para validar rápido.

**Pré-requisito:** tablet e PC na **mesma rede Wi-Fi**; PC com Python/Node ou `npx serve`/`http-server` com TLS.

1. **Reserve um IP fixo para o computador que vai servir o app** no roteador (reserva DHCP), ex.: `192.168.1.10`. Anote. *(O certificado é emitido para esse IP: se ele mudar, o HTTPS "quebra".)*
2. **Confirme que o tablet alcança o PC:** com um servidor HTTP simples no PC, abra `http://192.168.1.10:8080` no Chrome do tablet. Se não abrir, o problema é firewall/rede — resolva **antes** de seguir.
3. **No PC, instale o `mkcert`** e crie a CA local:
   ```bash
   mkcert -install
   mkcert -CAROOT      # mostra a pasta onde está o rootCA.pem
   ```
   *(Windows: `choco install mkcert`. Linux: pacote/binário do release.)*
4. **Gere o certificado para o IP do PC** (e para `localhost`, para testar no próprio PC):
   ```bash
   mkcert 192.168.1.10 localhost 127.0.0.1
   # gera 192.168.1.10+2.pem e 192.168.1.10+2-key.pem
   ```
5. **Sirva o app em HTTPS** na porta 8443 (exemplo com Node, um arquivo só):
   ```bash
   npx http-server . -S -C 192.168.1.10+2.pem -K 192.168.1.10+2-key.pem -p 8443 -c-1
   ```
   *(Alternativa: `python -m http.server` **não** faz TLS; use `http-server`, `serve`, Caddy ou um script Node com `https`.)*
6. **Teste no PC:** abra `https://192.168.1.10:8443` → cadeado ✅ sem aviso.
7. **Copie o `rootCA.pem` para o tablet** (cabo USB, e-mail para si mesmo, Google Drive ou um link HTTP temporário). Renomeie para `rootCA.crt` se o Android reclamar da extensão.
8. **No tablet, defina um bloqueio de tela (PIN)** — o Android 11+ **exige** isso para instalar certificado de usuário.
9. **Instale a CA:** `Configurações → Segurança e privacidade → Mais configurações de segurança → Criptografia e credenciais → Instalar um certificado → Certificado de CA → "Instalar mesmo assim" → escolha rootCA.crt`. Aceite o aviso ("seus dados não serão privados" — é o aviso padrão para CA de usuário). ([Android — Add & remove certificates](https://support.google.com/android/answer/2844832))
10. **Reinicie o Chrome** do tablet.
11. **Abra `https://192.168.1.10:8443`** no Chrome do tablet → deve abrir **sem** aviso de certificado. Se aparecer aviso, a CA não foi instalada corretamente: **pare aqui** e repita 9–10.
12. **Instale a PWA:** menu ⋮ → **"Instalar app"** (se só aparecer "Adicionar à tela inicial", veja §5.1 — falta pré-requisito).
13. **Teste o microfone** na tela do adulto: o diálogo de permissão deve aparecer; autorize.
14. **Deixe o servidor rodando** para o primeiro dia. Depois disso, o app instalado abre pelo cache; o servidor só é necessário para atualizar a versão.

**Se algo falhar, o teste de diagnóstico é este:** no tablet, abra `https://192.168.1.10:8443` e rode no console (via `chrome://inspect` ou uma tela de debug do app):

```js
console.log({
  secure: window.isSecureContext,
  sw: 'serviceWorker' in navigator,
  asr: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  vozesPt: speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt')).length
});
```

- `secure: false` → problema de certificado/origem.
- `sw: true` mas não instala → manifest/SW (§5.1).
- `vozesPt: 0` → instalar voz pt-BR no motor TTS do Android.

### 4.5 Atalho de 5 minutos (para validar antes, ou como plano B)

1. No PC, dentro da pasta do app: `python -m http.server 8080` (ou `npx serve -l 8080`).
2. Em outro terminal: `cloudflared tunnel --url http://localhost:8080`.
3. Copie a URL `https://….trycloudflare.com` que aparecer.
4. Abra no Chrome do tablet e instale.
5. **Avise a família:** a URL muda quando o `cloudflared` reinicia; nesse dia, reinstale e **importe o progresso** pelo botão de exportar.

---

## 5. PWA no Android/Chrome

### 5.1 O que é exigido para instalar (e o que impede)

✅ **OFICIAL** ([MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [web.dev — install criteria](https://web.dev/articles/install-criteria)):

- `name` ou `short_name`
- `icons` com **192×192 e 512×512**
- `start_url`
- `display` (ou `display_override`)
- `prefer_related_applications` ausente ou `false`
- **HTTPS** (ou `localhost`/`127.0.0.1`) com certificado **confiável**
- `<link rel="manifest">` presente na página

⚠️ **COMUNIDADE (relato de jun/2026, bem alinhado com o comportamento observado):** no **Chrome Android** ainda é exigido um **Service Worker com handler de `fetch`** para oferecer "Instalar app" (WebAPK); o desktop dispensou esse requisito. Sem isso, o Chrome cai no "Adicionar à tela inicial" — um atalho de navegador, com nome digitado e ícone genérico. ([SO 79964935](https://stackoverflow.com/questions/79964935/why-does-chrome-on-android-not-prompt-installation-of-my-web-app))
→ **Custo zero para nós:** o app precisa de SW de qualquer forma. Só garanta que existe um `fetch` listener.

✅ **OFICIAL (Android):** só o **Chrome com Google Mobile Services** (e Samsung Internet em Samsung) instala PWA como **WebAPK** — com entrada real no launcher e nas configurações. Sem GMS, vira atalho com selo do navegador (MDN, acima).

**Checklist do que impede a instalação:**

| Sintoma | Causa provável |
|---|---|
| "Adicionar à tela inicial" em vez de "Instalar app" | Falta SW com `fetch`; ícones 192/512 ausentes; `display: browser`; `start_url` fora do escopo; manifest não linkado |
| Nenhuma opção de instalar | Origem HTTP, certificado não confiável, ou `prefer_related_applications: true` |
| Instala mas abre com barra de endereço | `display` não é `standalone`/`minimal-ui`/`fullscreen` (ou o app foi instalado como atalho) |
| Ícone branco/cortado | Falta ícone `purpose: "maskable"` |
| `beforeinstallprompt` nunca dispara | App não atende aos critérios **ou** já está instalado **ou** o usuário dispensou o prompt |

### 5.2 `manifest.webmanifest` recomendado

```json
{
  "id": "/",
  "name": "Leitura com a Gabi",
  "short_name": "Leitura",
  "description": "Tutoria de leitura em voz alta para crianças",
  "lang": "pt-BR",
  "dir": "ltr",
  "start_url": "./?fonte=pwa",
  "scope": "./",
  "display": "standalone",
  "display_override": ["standalone", "fullscreen"],
  "orientation": "landscape",
  "background_color": "#FFF8E7",
  "theme_color": "#E4572E",
  "categories": ["education", "kids"],
  "icons": [
    { "src": "icons/icon-192.png",     "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png",     "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Sobre ícones maskable** ✅ ([web.dev](https://web.dev/articles/maskable-icon)): a "zona segura" é um círculo central de raio = **40% da largura**; a borda externa (10%) pode ser cortada. Use `purpose: "any"` e `"maskable"` em **arquivos separados** — usar `"any maskable"` no mesmo arquivo deixa o ícone pequeno e com padding. Teste em <https://maskable.app/> e no DevTools → Application → Manifest → *"Show only the minimum safe area for maskable icons"*.

**`theme-color`:** declare no HTML (`<meta name="theme-color" content="#E4572E">`) **e** no manifest. É a cor da barra de status no modo standalone.

**`orientation`:** `"landscape"` para tablet em suporte/pé; `"any"` se o app funcionar bem nos dois. A API `screen.orientation.lock()` no Android costuma exigir fullscreen — para PWA instalada, o manifest é o caminho certo. ⚠️

### 5.3 Service Worker mínimo (com estratégia de atualização)

```js
// sw.js — cache-first para o "shell", network-first para conteúdo novo
const VERSAO = 'v1';                       // <- troque a cada release
const CACHE  = `leitura-${VERSAO}`;
const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // não intercepta terceiros

  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return res;
      }).catch(() =>
        e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
      );
    })
  );
});

// permite que a página force a ativação da versão nova
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
```

**Registro + aviso de "nova versão"** (o usuário decide quando recarregar — importante num app usado por criança):

```js
// app.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const novo = reg.installing;
      novo?.addEventListener('statechange', () => {
        if (novo.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarBotaoAtualizar(() => {
            novo.postMessage('SKIP_WAITING');
          });
        }
      });
    });
    // procura atualização ao abrir (e a cada 30 min, se quiser)
    reg.update();
  });

  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou) return;
    recarregou = true;
    location.reload();
  });
}
```

✅ Ciclo de vida conforme [web.dev — Service Worker lifecycle](https://web.dev/articles/service-worker-lifecycle): o SW novo fica em **waiting** até não haver cliente; `skipWaiting()` + `clients.claim()` fazem a troca imediata; `activate` é o lugar de apagar caches antigos.

> ⚠️ **Atenção prática:** com `skipWaiting()` no `install`, uma atualização pode trocar o SW **no meio de uma sessão de leitura**. Para uso infantil, prefira **não** chamar `skipWaiting()` automaticamente: mostre um botão "Atualizar o app" na tela do adulto.

### 5.4 `display: standalone` — o que muda de verdade

- Some a barra de endereço; a PWA aparece no recentes e no launcher (WebAPK).
- **A origem continua a mesma**: `localStorage`/IndexedDB/caches são compartilhados com a versão no navegador. Bom para migrar sem perder progresso.
- `beforeinstallprompt` **não** dispara se já estiver instalado — trate com `display-mode: standalone`:
  ```js
  const instalado = matchMedia('(display-mode: standalone)').matches
                  || navigator.standalone === true;
  ```
- No modo standalone, o Chrome pode reter o "pull to refresh"; use `overscroll-behavior: none` no `body` para não atualizar sem querer.

---

## 6. Fallbacks quando o ASR falha ou não existe

Ordem recomendada (do mais robusto para o menos):

| # | Estratégia | Precisa de | Prós | Contras |
|---|---|---|---|---|
| 1 | **Modo toque guiado** — a criança lê em voz alta e **toca na palavra** que acabou de ler (ou no botão "Li esta frase") | Nada | Funciona sempre, offline, sem permissão, sem custo | Não avalia a fala de verdade; é autoavaliação |
| 2 | **"Adulto confere"** — `MediaRecorder` grava o turno **localmente**; o adulto ouve depois e marca ✔/✘ | Mic + HTTPS | Áudio **não** sai do aparelho; avaliação humana é a mais confiável | Requer o adulto |
| 3 | **ASR + tolerância** — o modo principal, com retry e "não entendi" | HTTPS + internet | Feedback imediato e automático | Falha de rede, sotaque, voz infantil |
| 4 | **API externa de ASR** (Whisper etc.) | **Backend** + chave | Melhor precisão | Quebra o "app estático"; chave exposta no cliente; custo; LGPD; **não recomendado** |

**Por que o item 4 está fora:** num app sem backend, a chave da API ficaria no JS — qualquer pessoa copia. E enviar áudio de criança para um terceiro exige base legal e transparência (§8). Se um dia for necessário, coloque um proxy mínimo (Cloudflare Worker) guardando a chave.

**Gravação local com `MediaRecorder`** (para o modo "adulto confere"), sem servidor:

```js
async function gravaTurno(msMax = 12000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus' : '';
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const pedacos = [];
  rec.ondataavailable = e => e.data.size && pedacos.push(e.data);
  const parado = new Promise(res => { rec.onstop = () => res(new Blob(pedacos, { type: rec.mimeType })); });
  rec.start();
  const t = setTimeout(() => rec.state !== 'inactive' && rec.stop(), msMax);
  return {
    blob: parado,
    parar: () => { clearTimeout(t); if (rec.state !== 'inactive') rec.stop(); }
  };
}
// depois: URL.createObjectURL(blob) em <audio controls> — e apagar quando o adulto fechar
```

> ⚠️ Microfone + `MediaRecorder` também exigem **contexto seguro**. E o áudio gravado é dado pessoal de criança: guarde em memória, apague ao sair da tela, **nunca** suba para lugar nenhum.

**Recomendação final de produto:** o app deve **começar** no modo ASR e **degradar** para o modo toque automaticamente após 2 falhas de rede/permissão na mesma sessão — com uma transição gentil ("Hoje o tablet está com a voz cansada. Vamos ler juntos!"), nunca com mensagem de erro técnica.

---

## 7. UI/UX para tablet infantil

### 7.1 Alvos de toque e prevenção de toque acidental

- ✅ **W3C WCAG 2.2 — SC 2.5.8 Target Size (Minimum):** **24×24 CSS px** (nível AA); **SC 2.5.5 (Enhanced): 44×44**. ([Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html))
- ✅ **Material Design:** 48×48 dp mínimo. **Apple HIG:** 44×44 pt.
- **Para 8 anos, use 64 px+ e ≥ 96 px para a ação principal.** Crianças erram toque por imaturidade motora; botão grande é acessibilidade, não estética.

```css
:root { --toque: 64px; --toque-grande: 96px; }

.btn {
  min-width: var(--toque);
  min-height: var(--toque);
  padding: 16px 24px;
  font-size: clamp(18px, 2.6vmin, 26px);
  border: 0;
  border-radius: 20px;
  touch-action: manipulation;       /* mata atraso de 300ms e duplo-toque-zoom */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.btn--principal { min-width: var(--toque-grande); min-height: var(--toque-grande); }
```

### 7.2 Zoom: **não** desabilite

- ❌ `user-scalable=no` e `maximum-scale=1` são **ignorados** por vários navegadores e **violam a WCAG 1.4.4** (mínimo 2× de zoom). O MDN é explícito no alerta ([MDN viewport](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)). ✅
- ✅ Para evitar **duplo-toque acidental** sem matar o pinch-zoom: `touch-action: manipulation` nos elementos interativos e `touch-action: pan-y` no contêiner de leitura.
- ✅ Para evitar **seleção de texto azul** ao arrastar: `user-select: none` no `body` (mas mantenha `user-select: text` em trechos que o adulto pode querer copiar).

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

> `viewport-fit=cover` + `env(safe-area-inset-*)` evita que o conteúdo fique sob a barra de gestos do Android.

### 7.3 Tipografia para leitura em voz alta

| Recomendação | Detalhe |
|---|---|
| **Fonte** | **Andika** (SIL) — desenhada para alfabetização inicial (formas de letra próximas da manuscrita). Alternativas: **Atkinson Hyperlegible** (Braille Institute), Verdana, Tahoma. **Evite** fontes decorativas e condensadas. |
| **Corpo** | `clamp(28px, 5vmin, 56px)` para o texto de leitura; `line-height: 1.8`; `letter-spacing: 0.02em` |
| **Largura da linha** | **28–34 caracteres** por linha no texto de leitura (bem menos que os ~66 do texto adulto) |
| **Alinhamento** | **Nunca justificado** (cria "rios" de espaço). `text-align: left` com `text-wrap: balance` no título |
| **Caixa** | Nunca `text-transform: uppercase`; prefira maiúsculas só na inicial de frase |
| **Contraste** | WCAG AA = 4.5:1 (texto normal), AAA = 7:1. Para criança, mire **AAA**. Evite preto puro em branco puro → `#1A1A1A` sobre `#FFF8E7` reduz ofuscamento |
| **Sublinhado de sílaba** | Se usar separação silábica, prefira **espaçamento/pontinho** a cores fortes |

```css
body {
  font-family: "Andika", "Atkinson Hyperlegible", Verdana, system-ui, sans-serif;
  font-size: clamp(18px, 2.6vmin, 28px);
  line-height: 1.6;
  color: #1A1A1A;
  background: #FFF8E7;
  -webkit-user-select: none;
  user-select: none;
  overscroll-behavior: none;   /* sem pull-to-refresh acidental */
  touch-action: pan-y;
}

.leitura {
  font-size: clamp(30px, 5.2vmin, 58px);
  line-height: 1.8;
  letter-spacing: 0.02em;
  max-width: 30ch;
  text-align: left;
  text-wrap: pretty;
}
.palavra--atual { background: #FFE08A; border-radius: 8px; } /* destaque pelo boundary do TTS */
```

### 7.4 Layout: sem rolagem, sem surpresa

- Projete para **uma tela por vez**, com `100dvh` (não `100vh`, que ignora a barra do navegador no Android).
- **Evite rolagem vertical** por design: 1 frase + 1 botão grande + 1 indicador de progresso. Se o conteúdo crescer, **paginação** em vez de scroll.
- `overflow: hidden` no `html/body` é aceitável **neste** app (kiosk-like), mas mantenha a possibilidade de zoom (§7.2) e nunca corte conteúdo sem alternativa.
- **Uma ação primária por tela.** A criança não deve escolher entre 5 botões.
- Feedback imediato em ≤ 100 ms: som + mudança de cor + micro-animação (150–250 ms).
- **Sem `alert()`/`confirm()`**: use diálogos próprios, grandes e com uma frase.

### 7.5 Áudio e a primeira interação

✅ A política de autoplay do Chrome é o pano de fundo (cita `audio`, `video` e Web Audio; e instalar a PWA conta como engajamento) — [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay).

**Fluxo de "destrave" (uma vez por sessão):**

1. Splash estática + botão grande **"Começar"**.
2. No `pointerdown` do botão: criar `AudioContext` e chamar `resume()` (barato, ajuda se você usar som/efeitos via Web Audio), e disparar um TTS curtinho ("Oi! Vamos ler?").
3. Só depois: pedir microfone, mostrar a primeira frase.
4. Guardar em `sessionStorage` que o áudio já foi destravado.

> Em app **instalado** (standalone), o Chrome tende a ser mais permissivo com áudio — mas **não** dependa disso: o botão "Começar" custa uma tela e elimina a classe inteira de bugs.

---

## 8. Privacidade, LGPD e o que avisar aos pais

### 8.1 O áudio sai do tablet (fato técnico, não opinião)

✅ **OFICIAL:** *"By default, using speech recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline."* ([MDN — Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API))

❓ **INCERTO / a confirmar:** o **tempo de retenção** e o vínculo do áudio com a conta Google do tablet **não** estão documentados na especificação nem na documentação da API. É política do Google, sujeita a mudanças, e varia com as configurações da conta (por exemplo, se "Atividade na Web e de apps" está ativa). **Não afirme ao usuário que o áudio "não é guardado"** — não temos como garantir isso.

> Consequência de honestidade: no modo escuta, este **não** é um app "100% offline e privado". Ele é "local para os dados de progresso; o áudio da fala vai para o Google".

### 8.2 O que o app deve (e não deve) guardar

**Guardar (local apenas, `localStorage`/IndexedDB):**
- progresso por história/lição, palavras com dificuldade, streak, tempo de uso;
- preferências (voz, velocidade, tamanho de fonte).

**Não guardar:**
- áudio (nem em IndexedDB, nem em Cache Storage);
- transcrições cruas identificáveis (se precisar, guarde só a **contagem de acertos** por palavra);
- nome completo, escola, foto, localização.

**Não incluir:** analytics, pixels, fontes/CDNs de terceiros, scripts de terceiros. **Baixe as fontes** (Andika/Atkinson) para dentro do app — assim o Service Worker as cacheia e nenhuma requisição sai para fora.

### 8.3 LGPD — o mínimo aplicável a este caso

- **Lei 13.709/2018, art. 14:** o tratamento de dados de crianças e adolescentes deve observar o **melhor interesse** da criança; o §1º exige consentimento específico de pelo menos um dos pais ou responsável legal para dados de crianças; o §3º restringe a comunicação a terceiros. ([texto legal](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm))
- **ANPD** publicou regulamentação específica sobre tratamento de dados de crianças e adolescentes (arquivo em *Regulamentações da ANPD*, publicado em nov/2024): [Tratamento_de_Dados_de_Criancas_e_Adolescentes.pdf](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/tratamento_de_dados_de_criancas_e_adolescentes.pdf). ❓ (não validei o número da resolução; o arquivo oficial existe e está nessa seção)
- **Enquadramento prático deste app:** uso **estritamente doméstico e familiar** (o pai é o controlador, a criança é a titular, não há compartilhamento, não há oferta de serviço a terceiros). O risco é baixo **se**: (a) nada sai do aparelho além do áudio para o ASR do Google; (b) não há analytics; (c) existe botão "apagar todos os dados"; (d) o adulto é informado, em linguagem simples, de que a voz é enviada ao Google.
- Se um dia o app for **distribuído** (escola, loja, colegas), isso muda de figura: aí entram base legal, aviso de privacidade e RIPD. **Não** é o caso agora — mas registre a decisão por escrito.

### 8.4 Texto sugerido para a tela do adulto (curto e honesto)

> **Como o app usa a voz e a internet**
> - Para **falar**, o app usa a voz do próprio tablet. Isso funciona sem internet.
> - Para **ouvir**, o Chrome manda o áudio da fala para os servidores do Google, que devolvem o texto. **Isso precisa de internet** e o áudio **sai do tablet**. O app não guarda o áudio.
> - O progresso fica **só neste tablet**. O app não tem login, não tem anúncios, não manda dados para nós.
> - Botão **Apagar todos os dados** (some com o progresso).

---

## 9. RISCOS E MITIGAÇÕES

| # | Risco | Probabilidade | Impacto | Mitigação (o que fazer no código/instalação) |
|---|---|---|---|---|
| R1 | **ASR exige internet**; Wi-Fi cai e a criança fica sem resposta | Alta | Alto | Detectar `network` (e `navigator.onLine`) e cair automaticamente no **modo toque** com mensagem gentil; retry 2× antes |
| R2 | **ASR envia áudio ao Google** — pais acham que é offline | Alta | Alto (confiança) | Aviso explícito na tela do adulto (§8.4); oferecer modo **"só gravar para o adulto conferir"** (áudio nunca sai) |
| R3 | **Voz infantil reduz precisão** → criança acerta e o app diz que errou (frustração) | Alta | Alto | Limiar tolerante (0.7–0.75), `maxAlternatives: 3`, **nunca** punir; sempre "tentar de novo"; calibração com gravações reais |
| R4 | **`continuous` não funciona no Android** → reconhecedor morre no meio da frase | Certa | Médio | Um **turno por frase**, reinício controlado (máx. 1 automático), `onspeechend → stop()` |
| R5 | **Loop de restart** gera `not-allowed` | Média | Médio | Limitar reinícios; após falha, exigir **toque** do usuário; nunca `start()` em `setInterval` |
| R6 | **TTS cortado aos ~15 s** (bug do Chromium) | Média | Médio | Fatiar em utterances ≤ 120 caracteres + **watchdog** por utterance (§2.4) |
| R7 | **TTS travado** com `speaking === true` para sempre | Média | Alto (app "morto") | `synth.cancel()` antes de cada fala; timeout → `cancel()` e seguir; botão "Parar" sempre visível |
| R8 | **TTS mudo** por falta de gesto do usuário | Média | Alto | Porta de entrada obrigatória com botão "Começar"; nunca falar no `load` |
| R9 | **Sem voz pt-BR** no tablet (motor TTS sem pacote) | Média | Alto | `getVoices()` filtrado por `pt`, erro `language-unavailable` → tela do adulto com instruções de instalar voz pt-BR em *Configurações → Idioma → Saída de texto para fala* |
| R10 | **Eco**: microfone ouve o próprio TTS | Alta | Alto | Estado global `TTS_FALANDO`; só `start()` após `onend` + 300 ms; `cancel()` antes de avaliar |
| R11 | **Instalação impossível** por origem HTTP | Certa (na LAN) | Alto | Caminho `mkcert` + CA + IP fixo (§4.4); app **funciona** em HTTP, mas só no modo leitura guiada |
| R12 | **IP do servidor muda** → cert e URL quebram | Média | Alto | Reserva DHCP no roteador; documentar o IP na tela do adulto; opção de trocar o endereço |
| R13 | **URL de quick tunnel muda** → progresso "desaparece" | Certa (se usar túnel) | Alto | Botão **Exportar/Importar progresso** (JSON) desde a v1; preferir mkcert para uso diário |
| R14 | **CA de usuário instalada** dá poder de interceptação no tablet | Baixa | Médio | Instalar **só** a CA do mkcert, guardar `rootCA-key.pem` **fora** do tablet/rede; remover a CA quando não usar mais |
| R15 | **SW serve versão velha** para sempre | Média | Médio | `VERSAO` no nome do cache; botão "Atualizar app" (sem `skipWaiting` automático); `reg.update()` ao abrir |
| R16 | **Toque acidental** em botão pequeno / zoom acidental | Alta | Médio | Alvos ≥ 64 px; `touch-action: manipulation`; **não** desabilitar zoom (WCAG); espaçamento ≥ 8 px entre alvos |
| R17 | **Criança sai do app** (gesto de voltar) e perde o turno | Média | Baixo | Salvar progresso a cada turno; retomar do mesmo ponto; sem estado só em memória |
| R18 | **Tela apaga / notificação** durante a leitura | Média | Baixo | `navigator.wakeLock` (Screen Wake Lock API — **exige contexto seguro**) com reaquisição no `visibilitychange` |
| R19 | **Chrome atualiza e muda comportamento** de ASR | Média | Médio | Tela de diagnóstico (§4.4) mostra `secure/sw/asr/vozesPt`; feature detection, nunca user-agent sniffing |
| R20 | **Dados de criança** acumulados sem controle | Baixa | Médio | Botão "Apagar todos os dados"; sem áudio salvo; sem terceiros; §8.3 registrado |
| R21 | **App vira "prova"**: criança decora / se frustra | Média | Alto (pedagógico) | Sessões curtas (5–8 min), elogio ao esforço, "pular" sempre disponível, nunca som de erro agressivo |
| R22 | **Sotaque/dialeto regional** (ex.: "porta" × "pauta") | Média | Médio | Normalização sem acento **antes** de comparar; tratar vogais finais e "r" final com tolerância extra; nunca corrigir a criança por sotaque |

---

## 10. Checklist de validação no tablet (fazer antes de considerar "pronto")

1. [ ] `window.isSecureContext === true`
2. [ ] `navigator.serviceWorker.register('./sw.js')` resolve sem erro
3. [ ] Chrome ⋮ mostra **"Instalar app"** (não só "Adicionar à tela inicial")
4. [ ] App instalado abre **sem barra de endereço** e com o ícone certo (não branco)
5. [ ] Com o servidor **desligado**, o app instalado ainda abre (cache do SW)
6. [ ] `getVoices()` retorna ≥ 1 voz `pt`; o TTS fala "Olá, vamos ler?" com sotaque brasileiro
7. [ ] TTS de um texto de **3 frases** não corta no meio e chama `onend`
8. [ ] Diálogo de microfone aparece **só** depois do toque em "Começar"
9. [ ] Uma frase lida devagar retorna `result` final com o texto esperado
10. [ ] Falar com a boca longe (60 cm) ainda retorna resultado (ou erro tratado)
11. [ ] **Modo avião**: TTS funciona; ASR falha com `network` e o app cai no modo toque **sem travar**
12. [ ] Negar a permissão de microfone → mensagem amigável + modo toque
13. [ ] Girar o tablet → layout não quebra, orientação respeitada
14. [ ] Toque acidental duplo na frase **não** dá zoom (mas pinch-zoom continua funcionando)
15. [ ] "Apagar todos os dados" limpa `localStorage` e o app volta ao início
16. [ ] Deixar 10 min na tela do adulto → sem erro no console

---

## 11. Fontes

**Oficiais (✅)**

- MDN — [`SpeechSynthesis`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) · [`SpeechSynthesisUtterance`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance) · [`rate`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate) · [`voiceschanged`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event)
- MDN — [`SpeechRecognition`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) · [`SpeechRecognitionErrorEvent.error`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error) · [Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
- MDN Browser Compat Data — [`SpeechRecognition.json`](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json) (fonte do "`continuous` não funciona no Chrome Android" e "`processLocally` desktop-only")
- MDN — [Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) · [Features restricted to secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts)
- MDN — [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) · [`<meta name="viewport">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- web.dev — [What does it take to be installable?](https://web.dev/articles/install-criteria) · [Maskable icons](https://web.dev/articles/maskable-icon) · [Service Worker lifecycle](https://web.dev/articles/service-worker-lifecycle)
- Chrome for Developers — [Autoplay policy in Chrome](https://developer.chrome.com/blog/autoplay)
- Chromium — [Issue 41294170: Speech Synthesis stops abruptly after about 15 seconds](https://issues.chromium.org/issues/41294170) · [Issue 579050368: on-device recognition never fires `result`](https://issues.chromium.org/issues/579050368) · [`crbug.com/41297427` (continuous no Android)](https://crbug.com/41297427)
- Can I use — [Speech Recognition API](https://caniuse.com/speech-recognition)
- Cloudflare — [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
- Android — [adb](https://developer.android.com/tools/adb) · [Access local server (adb reverse)](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server) · [Add & remove certificates](https://support.google.com/android/answer/2844832)
- W3C — [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Gov.br — [LGPD (Lei 13.709/2018)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) · [ANPD — Tratamento de dados de crianças e adolescentes](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/tratamento_de_dados_de_criancas_e_adolescentes.pdf)

**Comunidade (⚠️ — úteis, mas não são garantia)**

- [SO 42875726 — `speechSynthesis.speak` para após poucos segundos](https://stackoverflow.com/questions/42875726/speechsynthesis-speak-in-web-speech-api-always-stops-after-a-few-seconds-in-go) (bug dos ~15 s; relato de gesto obrigatório desde dez/2018; hack do `resume()`)
- [SO 65561185 — Chrome WebSpeech API retornando `not-allowed`](https://stackoverflow.com/questions/65561185/chrome-webspeech-api-returning-not-allowed-error) (permissão de mic e origem insegura)
- [SO 79964935 — Chrome Android não oferece "Instalar app"](https://stackoverflow.com/questions/79964935/why-does-chrome-on-android-not-prompt-installation-of-my-web-app) (exigência de SW com `fetch` no Android, jun/2026)
- [SO 38213580 — `webkitSpeechRecognition` termina sozinho](https://stackoverflow.com/questions/38213580/chromes-webkitspeechrecognition-ends-randomly) (limite de sessão; reiniciar)
- [SO — rodar Chrome com flags no Android](https://stackoverflow.com/questions/29280796/run-google-chrome-with-flags-on-android) (por que a flag de origem insegura não é caminho de produto)
- [mkcert](https://github.com/FiloSottile/mkcert) (instruções de CA em dispositivos móveis)

**Acadêmicas (precisão de ASR para crianças)**

- *Causal analysis of ASR errors for children: quantifying the impact of physiological, cognitive, and extrinsic factors*, Computer Speech & Language, 2025 — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0885230825000841)
- *Towards improved Automatic Speech Recognition for children*, IberSPEECH 2024 — [ISCA Archive (PDF)](https://www.isca-archive.org/iberspeech_2024/rolland24_iberspeech.pdf)

---

### Notas finais de incerteza (o que pode mudar)

1. **ASR on-device**: o suporte a `processLocally` no **Android** pode chegar em versões futuras do Chrome (hoje o compat data diz "não"). Isso mudaria o custo/privacidade do app para melhor. Reavalie a cada ~6 meses.
2. **`continuous` no Android**: bug aberto há anos; se for corrigido, a arquitetura de "um turno por frase" pode ser simplificada (mas **não** removida — o fallback continua necessário).
3. **Exigência de SW para instalar no Android**: o comportamento pode ser alinhado ao desktop; hoje a recomendação de manter um SW com `fetch` é barata e segura.
4. **Retenção do áudio pelo Google**: não documentada na API. Não prometa nada aos pais além do que está em §8.4.
