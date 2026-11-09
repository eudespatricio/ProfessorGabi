# MAPA — Professor Gabi
> Teto rígido: `< 60 linhas`. Guia direto para evitar buscas cegas de arquivos.

## 1. Responsabilidade por Módulo (`app/js/` e `server/`)
| Módulo | Possui (Responsabilidade) | Quando carregar |
| --- | --- | --- |
| `app/js/main.js` | Router hash (`#/`), boot, tema, registro do SW e banner PWA | Mudar rotas globais ou ciclo de vida inicial |
| `app/js/version.js` | Constante única `APP_VERSION` (`v48`) | Ao subir versão (sincronizar com `app/sw.js`) |
| `app/sw.js` | Cache offline (`CORE` 36 arqs) + pré-cache Opus (`gabi-audio-v1`) | Alterar cache offline ou adicionar novo `.js`/`.css` |
| `app/js/store.js` | Estado `gabi.state.v1` (`v2`), `migrate()`, SRS, XP, níveis, backup | Alterar persistência, progresso ou estatísticas |
| `app/js/content.js` | Banco base (`RAW`), rimas, parlendas, frases e merge com `content-units.js` | Adicionar/editar palavras, frases ou textos |
| `app/js/content-units.js` | Expansão `u10`–`u14` (`EXTRA_UNITS`, `EXTRA_WORDS`, `EXTRA_TEXTS`) | Editar unidades ortográficas avançadas |
| `app/js/curriculum.js` | Geração determinística de lições, Fase Chefe, diagnóstico e revisão rápida | Ajustar regras pedagógicas ou montagem de lição |
| `app/js/exercises.js` | Renderização e correção dos 13 tipos de exercício + agrupamento de peças | Mudar mecânica de interação dentro de uma atividade |
| `app/js/syllables.js` | Separação silábica pt-BR, encontros, dígrafos e chave de rima | Bug de divisão silábica ou destaque de sílabas |
| `app/js/audio.js` | Player `playClip` (Opus → MP3 → TTS), WebAudio SFX e diagnóstico de voz | Problemas de som, clipes ou síntese de fala |
| `app/js/speech.js` | Web Speech Recognition (`listen`), retry automático e mock de teste | Ajustar sensibilidade/timeout do microfone |
| `app/js/guided.js` | Modal `"Me ensina"` (leitura guiada sílaba por sílaba com microfone) | Ajustar intervenção quando a criança trava |
| `app/js/tutor.js` | Falas da coruja Gabi, elogios, dicas (`hintFor`) e saudação por horário | Ajustar textos pedagógicos e feedback da Gabi |
| `app/js/ocr-fix.js` | Corretor pós-OCR por distância de edição sob `wordlist-pt.js` (12k) | Ajustar precisão do OCR (carregado via lazy import) |
| `app/js/word-card.js` | Modal de palavra (emoji, sílabas, definição de `glossary.js` e áudio) | Alterar exibição do dicionário infantil |
| `app/js/ui.js` | Componentes visuais (Gabi SVG, topbar, tabbar, modal, toast, confete) | Mudar layout estrutural ou animações compartilhadas |
| `app/js/utils.js` | Helper DOM `el()`, PRNG determinístico `rng()`, `readingKey()`, `lev()` | Funções utilitárias e tolerância fonética da leitura |
| `app/js/screen-*.js` | Telas: `home`, `lesson`, `book`, `talk`, `search`, `parent`, `voice` | Editar a UI de uma tela específica |
| `app/js/talk-reply.js` | Respostas do roteiro sem LLM: parser de intenção, follow-up e despedida | Ajustar o que a Gabi responde sem IA |
| `server/serve.mjs` | Servidor HTTP/HTTPS zero-deps com gzip, Range `206`, `/ca.crt` e `/healthz` | Alterar headers HTTP, MIME types ou certificados |

## 2. Armadilhas Conhecidas (Leia antes de editar)
- **Versão Dupla + Manifesto**: Subiu código? Atualize `APP_VERSION` em `app/js/version.js` **e** `VERSION` em `app/sw.js`. Criou arquivo em `app/`? Rode `npm run sw:build`. Mudou palavras/unidades/glossário? Rode `npm run content:manifest` e garanta clipe em `app/audio/` + `app/audio/opus/`.
- **Proibido importar `ocr-fix.js` ou `wordlist-pt.js` no boot**: São carregados apenas via `import('./ocr-fix.js')` dinâmico dentro de `screen-book.js` para poupar 99 KB na abertura.
- **WSL vs. Windows (`node.exe`)**: O binário do Node no Windows falha se invocado via caminho UNC (`\\wsl.localhost\...`). No WSL, rode sempre `pytest -q tests/test_invariants.py` (nativo e instantâneo).
- **Eventos no helper `el()`**: Em `utils.js`, ouvintes de evento exigem chave entre aspas com prefixo `'on:click'` (ex.: `el('button', { 'on:click': fn })`).
