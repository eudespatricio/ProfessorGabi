# Arquitetura — Gabi

> Estado em **06/11/2026**, service worker **gabi-v35**. App PWA offline-first, sem build, em módulos ES nativos.

## 1. Princípios

1. **Offline primeiro**: conteúdo, áudio e jogos cabem no aparelho; a rede só é necessária para reconhecimento de fala e OCR (Tesseract via CDN).
2. **Sem build**: `index.html` carrega módulos ES direto; `node server/serve.mjs` serve a pasta `app/`. Nada de bundler, transpiler ou dependências de runtime no front.
3. **Dados locais**: todo o progresso vive em `localStorage` (`gabi.state.v1`); não há conta, servidor de usuário nem telemetria.
4. **Voz sempre disponível**: clipes neurais ElevenLabs embarcados; TTS do sistema como reserva; escuta com fallback “Eu li/Eu repeti”.
5. **Criança no comando**: nenhuma falha de microfone pune; toda tela tem saída manual.

## 2. Visão em camadas

```
index.html
  └─ js/main.js            rotas (hash), tema, service worker, instalação PWA
      ├─ telas             screen-home, screen-lesson, screen-parent, screen-voice,
      │                    screen-book, screen-search, screen-talk
      ├─ domínio           content, curriculum, syllables, tutor, exercises, guided, word-card
      ├─ infraestrutura    store, utils, audio, speech, ui
      └─ dados             content-units (EXTRA_*), glossary, wordlist-pt, audio/index.json
```

## 3. Rotas (hash)

| Rota | Tela | Módulo |
| --- | --- | --- |
| `/` | Início (hero, missões, baú, atalhos) | `screen-home.js` |
| `#/trilha` | Mapa de fases (14 unidades, níveis 1–3, chefe) | `screen-home.js` |
| `#/licao/:unit/:idx` | Player de lição (chefe quando `idx >= lessons`) | `screen-lesson.js` |
| `#/revisar` | Revisão espaçada (SRS) | `screen-lesson.js` |
| `#/diag` | Diagnóstico inicial (10 itens) | `screen-lesson.js` |
| `#/pais` | Área dos pais: progresso, conteúdo, ajustes, dados | `screen-parent.js` |
| `#/vozes` | Laboratório de voz (vozes pt, rate, pitch) | `screen-voice.js` |
| `#/livro` | Modo livro: foto → OCR → leitura guiada | `screen-book.js` |
| `#/caca` | Caça-palavras (`?bonus=1` vale XP extra) | `screen-search.js` |
| `#/adesivos` | Álbum de adesivos | `screen-home.js` |
| `#/historias` | Histórias decodificáveis | `screen-home.js` |
| `#/conversar` | Conversa com a Gabi (tema surpresa + trava-línguas) | `screen-talk.js` |
| `#/onboarding` | Nome, bichinho, voz, microfone | `screen-home.js` |

Sem `onboarded`, o router redireciona para `#/onboarding` (exceto `diag`).

## 4. Módulos

| Módulo | Papel | Depende de |
| --- | --- | --- |
| `main.js` | Router, settings, PWA, banner de instalação | store, audio, telas, ui |
| `store.js` | Estado, persistência, SRS, XP, níveis, adesivos, baú | utils |
| `utils.js` | `el()`, `loadJSON/saveJSON`, normalização, `lev`, `shuffle`, `pick`, `rng` | — |
| `content.js` | Banco de palavras (RAW), textos, rimas, frases, parlendas, sight words | content-units, syllables |
| `content-units.js` | 5 unidades extras + 100 palavras + 8 textos (u10–u14) | — |
| `curriculum.js` | Unidades, geração determinística de lições e chefe, diagnóstico | content, syllables, utils |
| `syllables.js` | Separação e contagem de sílabas, rima, sílaba inicial | utils |
| `tutor.js` | Saudação por horário, fala de apoio, `childName`, `streakLine` | store, utils |
| `exercises.js` | Montagem dos 13 tipos de exercício e correção | audio, speech, content, syllables |
| `guided.js` | Leitura guiada sílaba a sílaba com microfone | audio, speech, syllables, store |
| `word-card.js` | Cartão de palavra (emoji, sílabas, glossário, áudio, treino) | glossary, content, guided |
| `audio.js` | Clipes ElevenLabs, TTS, efeitos, vibração | store |
| `speech.js` | Web Speech Recognition, permissão, retry, mensagens | — |
| `screen-home.js` | Início, trilha, adesivos, histórias, onboarding | store, curriculum, tutor, ui, audio |
| `screen-lesson.js` | Lição, revisão, diagnóstico, medalha | curriculum, exercises, ui, audio |
| `screen-parent.js` | Painel dos pais (PIN), backup, download de áudio | store, audio, ui |
| `screen-book.js` | OCR, conferência, leitura por frase | speech, ocr-fix, guided, word-card |
| `ocr-fix.js` | Corretor de OCR (dicionário 12k, distância 1) | wordlist-pt |
| `screen-search.js` | Caça-palavras 8×8, seleção, XP | audio, ui, store |
| `screen-talk.js` | Conversa: tema surpresa, humor, sílabas, trava-língua | audio, speech, ui, tutor |
| `ui.js` | Componentes (modal, toast, confete, estrelas), tabbar | utils, store |
| `glossary.js` | 351 definições infantis com exemplo e emoji | — |
| `wordlist-pt.js` | 12.000 palavras mais frequentes (94 KB) | — |

## 5. Estruturas de dados

### 5.1 Palavras

Formato fonte (`RAW`, texto puro em `content.js`):

```
palavra emoji u1,u2
pato 🦆 u1,u2
```

Parse → `Map<string, Word>` (chave minúscula):

```ts
type Word = {
  w: string;       // forma exibida
  e: string;       // emoji (default 🔤)
  u: string[];     // unidades onde aparece
};
```

`EXTRA_WORDS` é mesclado por união de `u` (mesma palavra em várias unidades não duplica).
Derivados: `allWords()`, `wordsOfUnit(id)`, `wordInfo(w)`, `emojiOf(w)`.
Total atual: **351 palavras**.

### 5.2 Unidades e lições

```ts
type Unit = {
  id: string;        // u1..u14
  n: number;         // ordem
  titulo: string;
  sub: string;
  emoji: string;
  cor: string;
  lessons: number;   // lições antes do chefe
  skills: string[];  // consciencia | silabas | escrita | leitura | ortografia | compreensao
  teach: { titulo: string; fala: string; dica: string };
};
```

`buildLesson(unit, lessonIndex)` gera itens determinísticos (semente por unidade/lição).
Tipos: `count-syllables`, `rhyme`, `same-initial`, `blend`, `initial-syllable`, `build-word`, `missing-syllable`, `dictation`, `read-word`, `read-phrase`, `read-text`, `m-pb`, `comprehension`.
Chefe: `buildBossLesson` com 8 itens misturados e `boss: true`.

**Revisão ao fim da lição:** `buildLessonReviewItems({ unitId, lessonIndex, items, results, textId })` escolhe 2 palavras (3 se houve mais de um erro), priorizando as que a criança errou ou leu com ajuda; a primeira vira leitura de palavra e a segunda, sílaba faltando (ou montar palavra). O player (`screen-lesson.js`) entra numa fase `inReview` depois do último item: cabeçalho “Revisão rápida”, botão “Pular revisão”, e os acertos da revisão **não entram nas estrelas** da lição (entram no SRS/XP como prática). O resultado mostra “Revisão rápida: x/y”. Para chefe, revisão global e diagnóstico a fase é pulada.

### 5.3 Textos e glossário

```ts
type Text = { id: string; titulo: string; nivel: string; lines: string[]; perguntas: {q:string;a:string[];ok:number}[] };
type GlossEntry = { d: string; ex: string; e: string; n: number }; // definição, exemplo, emoji, sílabas
```

`TEXTS` (22), `TEXT_BY_ID`, `RIMAS`, `FRASES`, `PARLENDAS`, `SIGHT`.
Glossário cobre 351/351 palavras.

### 5.4 Estado persistido (`gabi.state.v1`)

```ts
type State = {
  version: 2;
  createdAt: number;
  onboarded: boolean;
  child: { name: string; avatar: string };
  settings: {
    rate: number; pitch: number; voiceURI: string; muted: boolean;
    readScale: number; reduceMotion: boolean; sound: boolean;
    sessionTarget: number; freeMode: boolean; pin: string;
    llm: { enabled: boolean; baseUrl: string; model: string; key: string };
  };
  progress: {
    xp: number; coins: number;
    streak: { last: string; days: number; best: number };
    startUnit: string;
    units: Record<string, { best?: number; level?: number; done?: boolean; boss?: {ok:boolean;at:number} }>;
    lessons: Record<string, { done?: boolean; at?: number }>;
  };
  skills: Record<string, { ok: number; n: number }>;
  srs: Record<string, { box: number; due: string; ok: number; n: number }>;
  reading: { alone: number; helped: number; syllables: number };
  errors: Record<string, number>;
  stickers: string[];
  days: Record<string, { lessons?: number; minutes?: number; xp?: number }>;
  history: { at: number; kind: string; unit?: string; ok?: number; n?: number }[];
  diagnostic: null | { at: number; score: number; suggested: string };
};
```

Chaves auxiliares: `gabi.pages.v1` (páginas do modo livro: `{title,text,at}[]`).

### 5.5 Áudio

`app/audio/index.json`:

```json
{ "texto normalizado": "<sha1>.mp3" }
```

`clipKey()`: minúsculas, remove pontuação final, colapsa espaços. Clipes são imutáveis (`Cache-Control: immutable`).
**1.116 clipes** em dois formatos:

- **MP3**: 23,6 MB (fallback e compatibilidade);
- **Opus mono 24 kbps**: **4,09 MB** (83% menor), em `audio/opus/` com `index-opus.json`.

`playClip()` usa Opus quando o navegador suporta (`audio/ogg; codecs="opus"`) e cai para MP3 em erro/ausência; “Baixar todo o áudio” escolhe o índice menor. Gerados por `tools/render-audio.mjs` (ElevenLabs, voz Raquel pt-BR) e convertidos por `tools/make-opus.sh` + `tools/build-opus-index.mjs`.

### 5.6 Manifesto canônico (`content/manifest.json`)

Gerado por `tools/content-manifest.mjs` a partir dos módulos de autoria (palavras, unidades, textos, glossário e índice de áudio):

```ts
type ContentManifest = {
  schemaVersion: 1;
  counts: { words; units; texts; glossary; audioClips; missingWordAudio; missingSyllables };
  units: { id; n; titulo; sub; emoji; lessons; skills; teach; words[]; texts[] }[];
  words: { w; e; u[]; syllables[]; gloss: { d; ex; e; n }; audio: { word; hasClip } }[];
  texts: { id; titulo; unidade; emoji; linhas; perguntas; palavras[] }[];
  audio: { clips; missingSyllables[] };
};
```

- `--write` grava; `--check` falha se o manifesto divergir do código (rodado no `npm test`).
- Valida: glossário 100% (0 órfão), unidades válidas, textos únicos, **0 palavra sem áudio** e sílabas sem clipe.
- Runtime ainda lê os módulos JS; o manifesto é o contrato versionado para backend, lojas e QA. Migrar o runtime para o manifesto fica para a v3.

## 6. Persistência e migração

- `load()` aplica `migrate()` (versão atual **2**): completa campos ausentes em backups antigos e corta `history` em **300** entradas.
- `save()` também poda `history` antes de gravar; `importJSON()` passa pela mesma migração.
- Backup/restauração em JSON pela área dos pais; “apagar tudo” remove a chave.
- Merge raso continua para `settings`/`progress` (merge explícito de `llm` e `streak`); estruturas aninhadas novas devem entrar no `migrate()`.

## 7. Offline e orçamento

Service worker (`app/sw.js`, versão `gabi-v35`):

| Estratégia | O quê |
| --- | --- |
| Navegação | rede primeiro; `index.html` em cache como rede de segurança |
| Estáticos | cache primeiro + revalidação em segundo plano |
| Áudio | **pré-cache na instalação**: `audio/index.json`, `index-opus.json` e os 1.116 clipes Opus (4,1 MB), em cache próprio `gabi-audio-v1` que sobrevive a upgrades; o que faltar é cacheado ao tocar. O botão “Baixar todo o áudio” continua na área dos pais |
| Instalação | `CORE` com **36 entradas**, gerado por `tools/build-sw.mjs` e validado por `tools/check-sw.mjs`; a instalação falha de propósito se algum arquivo do CORE não baixar (evita apagar o cache bom quando o tablet está offline) |
| Versão | `app/js/version.js` é a fonte única; `check-sw` confere se `gabi-v35` bate com ela |
| Dicionário do OCR | **lazy**: `wordlist-pt.js` + `ocr-fix.js` (99 KB) só carregam no primeiro OCR |

| Item | Tamanho |
| --- | --- |
| JS (25 módulos) | ~421 KB (wordlist 94 KB + glossário 38 KB inclusos) |
| CSS | ~54 KB (`app.css` + `game.css` + `polish.css`) |
| Áudio | 23,6 MB (MP3) / **4,09 MB (Opus)** |
| Fontes/ícones | ~120 KB |

Para “condensar” offline: deduplicar clipes por hash, comprimir áudio (Opus ~8 MB), lazy-load de `wordlist-pt` só no modo livro, e um único CSS crítico no `CORE`.

## 8. Voz

- `speak()`: tenta clipe neural; se não existir, usa `speechSynthesis` fatiado em ≤120 caracteres com watchdog.
- `listen()`: Web Speech, uma fala, 3 alternativas, retry real para `no-speech` e `audio-capture`.
- Sem ASR (iOS/WebView): botões “Eu li / Eu repeti” mantêm o fluxo.

## 9. OCR (Modo livro)

Detalhado em [`OCR.md`](OCR.md): normalização de iluminação → Otsu → Tesseract TSV → filtro por confiança → corretor de dicionário (12k, distância 1) → leitura por palavra/frase.

## 10. Servidor

`server/serve.mjs` (Node, sem dependências):

| Item | Comportamento |
| --- | --- |
| Raiz | `app/` |
| `/healthz` | `ok` (usado pelos testes) |
| `/ca.crt` | certificado local para instalar no tablet |
| Fallback | SPA: qualquer rota inexistente devolve `index.html` |
| Cache | `sw.js`, `index.html`, manifest: `no-store`; JS/CSS: `no-cache`; MP3/Opus: imutável; ícones/fontes: 24 h |
| Compressão | **gzip** para HTML/JS/CSS/JSON/SVG (61–76% menor); `Vary: Accept-Encoding` |
| Áudio | **Range** (`206 Partial Content`) para streaming; `416` em range inválido |
| Cabeçalhos | `nosniff`, `no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy` (mic/câmera) |
| MIME | `.mp3`, `.opus`, `.webm`, `.woff2`, `.webmanifest`, `.crt` |
| HTTPS | `--https` na 8443 com `certs/server.crt` (SAN com IP da LAN) |

Não há backend de usuário. O único serviço externo opcional é a API de LLM configurada pelos pais (chave local).

## 11. Testes e ferramentas

| Comando | Cobre |
| --- | --- |
| `npm test` | 52 testes: sílabas, conteúdo, currículo, SRS, OCR, store, índices de áudio, encoding, leitura e revisão da lição |
| `node tests/smoke.mjs` | Fluxo no Chrome (onboarding → home → lição → pais → conversa), screenshot |
| `node tests/full.mjs` | Lição completa + história |
| `node tools/test-talk.mjs` | Cartinhas de tema + respostas por humor |
| `node tools/ui-audit.mjs --shots` | 13 rotas × 5 viewports: overflow, texto cortado, alvos, erros; JSON + prints |
| `node tests/story-shot.mjs` | dock do microfone na história em 5 viewports |
| `node tests/reading-sim.mjs` | validação da leitura com escuta simulada (fala sem sentido, cansaço, cancelar) |
| `node tests/lesson-shots.mjs` | lacuna da sílaba faltando + pecinhas repetidas |
| `node tests/review.test.mjs` | revisão curta ao fim da lição (prioridade, tamanho, história) |
| `node tools/check-sw.mjs` | valida CORE: arquivos existem e todo módulo/CSS está cacheado |
| `node tools/build-sw.mjs` | regenera o CORE a partir dos arquivos em `app/` (idempotente) |
| `node tools/check-lazy.mjs` | garante que o dicionário do OCR não carrega na abertura |
| `node tools/check-server.mjs` | 20 checagens: gzip, cache, Range, HEAD, headers, path traversal |
| `node tools/check-map.mjs` | parallax do mapa, profundidade dos cartões e entrada de modal |
| `node tools/check-chest.mjs` | baú animado, transição de tela e navegação para o bônus |
| `node tools/check-choice-layout.mjs` | opção com imagem + ouvir: sem sobreposição nem texto cortado |
| `node tools/content-manifest.mjs --check` | fonte única: manifesto em sincronia com o código |
| `node tools/check-modules.mjs` | Importa todos os módulos e detecta erro de sintaxe |
| `node tools/ocr.mjs` / `ocr-compare.mjs` / `ocr-words.mjs` | Qualidade do OCR |
| `tools/android-*.ps1` | Emulador Android (ver `EMULADOR.md`) |

## 12. Dívidas técnicas e normalização proposta (v2)

1. **Fonte única de conteúdo**: 🟡 manifesto canônico gerado e verificado (`content/manifest.json`); o runtime ainda lê `content.js`/`glossary.js`. Migrar o runtime para o manifesto na v3.
2. **Estado v2** ✅: `migrate()` + `history` limitado a 300. Falta tipar `progress.units` e versionar campo a campo.
3. **Glossário**: unificar em `content` e remover `n` (sílabas calculadas).
4. **CSS**: tokens já existem; falta dividir em `base/tokens`, `components`, `screens` e remover duplicações entre `app.css` e `game.css`.
5. **Módulos grandes**: `screen-home` (473 linhas) e `screen-talk` (532) podem ser divididos por seção.
6. **Service worker**: `CORE` gerado por `tools/build-sw.mjs` (36 entradas) e validado por `tools/check-sw.mjs`.
7. **Backend**: se houver sincronização dos pais, criar API mínima (`/sync`, `/backup`) com autenticação por código, mantendo o app 100% funcional sem ela.
8. **CSP**: ainda não há Content-Security-Policy; exige liberar `cdn.jsdelivr.net` (Tesseract), `blob:` (workers) e a API de LLM opcional.

## 13. Métricas atuais

- 14 unidades, 22 textos, 351 palavras, 351 definições.
- 1.116 clipes (23,6 MB), 25 módulos JS (~421 KB), 54 KB de CSS.
- 36 entradas no `CORE` do service worker, 28 módulos/CSS.
- 52 testes unitários verdes; smoke test “TUDO OK”; UI audit 0 problemas.
- Service worker `gabi-v35`.
