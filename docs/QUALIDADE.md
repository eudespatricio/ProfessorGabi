# Qualidade visual, responsividade e animações

Checklist e critérios de aceite para a lapidação. A verificação roda no emulador e no Chrome headless.

## 1. Telas e viewports

| Dispositivo | Tamanho | Por que |
| --- | --- | --- |
| Celular pequeno | 360×640 | pior caso de largura |
| Celular atual | 390×844 | maioria dos Androids |
| Tablet em pé | 768×1024 | uso principal (retrato) |
| Tablet deitado | 1024×768 | uso apoiado |
| Desktop | 1280×800 | pais no computador |

Testar também **fonte grande** (configuração do Android) e **landscape**.

## 2. Checagens automáticas (por tela)

Para cada rota (`/`, `trilha`, `licao`, `revisar`, `diag`, `pais`, `vozes`, `livro`, `caca`, `adesivos`, `historias`, `conversar`, `onboarding`):

- [ ] `document.documentElement.scrollWidth <= innerWidth + 1` (sem rolagem horizontal)
- [ ] nenhum elemento com `getBoundingClientRect().right > innerWidth + 1` (nada estourando à direita)
- [ ] botões/links com área de toque ≥ **44×44 px**
- [ ] textos com `scrollHeight > clientHeight + 1` **e** `overflow: hidden` (texto cortado)
- [x] **contraste AA** verificado automaticamente em fundos sólidos (gradientes ficam para revisão manual)
- [ ] nenhum `console.error` / `pageerror`
- [ ] imagens/emoji sem quebra (word-break em palavras longas)

Ferramenta: **`node tools/ui-audit.mjs --shots`** (CDP, mesma base do `smoke`): percorre as 13 rotas em 5 viewports, gera `tests/ui-audit.json`, prints em `tests/screenshots/ui-*.png` e falha se encontrar problema.

**Primeira rodada (v23):** 0 problemas — sem overflow horizontal, sem erro de JS, sem texto cortado, todos os alvos ≥ 44 px. Correções aplicadas: abas dos pais com 44 px e quebra em 2×2 no celular; caça-palavras 6×6 com 4 palavras em telas < 460 px (células ~46 px).

**Rodada 9 (v29):** contraste AA medido em todas as rotas — 0 violações em fundos sólidos. Ajustes: `--ink-3` mais escuro (#6f665e), aba ativa em `--primary-ink` (#b83c22), texto do botão da próxima aula em #0b6f66. Textos sobre gradiente são ignorados pelo medidor (não há como calcular com segurança).

## 3. Conteúdo de estresse

Testar com:

- palavra longa: **paralelepípedo**, **inconstitucionalissimamente**;
- nome grande: **Maria Eduarda**;
- frase longa na conversa e no livro;
- texto sem pontuação no Modo livro;
- áudio ausente (simular offline para TTS).

## 4. Animações — critérios

| Critério | Regra |
| --- | --- |
| Propriedades | animar só `transform` e `opacity` (nunca layout) |
| Micro-interação | 120–200 ms (toque, botão) |
| Transição de tela | 220–320 ms |
| Revelações (cartas, baú) | 450–700 ms com bounce suave |
| Reduced motion | respeitar `prefers-reduced-motion` **e** o ajuste dos pais |
| Frequência | animação de comemoração só em conquista real |
| 60 fps | sem jank em tablet intermediário |

## 5. Profundidade 2D/3D

- Cartas de tema: flip 3D (feito).
- Baú: brilho + pop + confete + som (feito, `polish.css`).
- Transição entre telas: fade/slide de 260 ms (feito).
- Mapa da trilha: sombra em camadas nos cartões e **parallax** de nuvens/sol/grama ao rolar (feito).
- Hero: parallax das nuvens (a fazer).
- Hero: nuvens em parallax suave (a fazer).
- Medalha de resultado: entrada com escala + rotação curta (existe; revisar).

## 6. Consistência visual

- [ ] usar tokens (`--primary`, `--ink`, `--sun-soft`…) em vez de cores soltas
- [ ] escala de espaçamento 4/8/12/16/24
- [ ] hierarquia tipográfica: título > subtítulo > corpo > legenda
- [ ] estados: normal, pressionado, desabilitado, carregando, vazio, erro
- [ ] ícones/emoji alinhados ao texto
- [ ] tabbar e botão voltar consistentes em todas as telas
- [ ] mensagens de erro humanas (sem stack trace)

## 7. Aceite da lapidação

1. Nenhuma tela com rolagem horizontal em 360 px.
2. Nenhum texto cortado nas telas principais.
3. Todos os alvos de toque ≥ 44 px.
4. Animações a 60 fps no emulador e no tablet.
5. `npm test` 52/52, smoke “TUDO OK”, UI audit sem erros.
6. Prints finais em `tests/screenshots/` atualizados.

## 8. Achados do emulador Android (v27)

| Achado | Correção |
| --- | --- |
| Barra “Translate page?” do Chrome em todas as telas (risco de virar a interface para inglês) | `<html translate="no">` + `<meta name="google" content="notranslate">` |
| Banner de instalação cobrindo subpáginas e reaparecendo em cada aba | só aparece na home e o “✕” grava dispensa em `localStorage` |
| Opções de humor da conversa ficavam abaixo da dobra no celular | `scrollIntoView({ block: 'nearest' })` ao montar as opções |
| Opções com imagem + “ouvir”: a palavra ficava coberta (“bol”, “pip”) | layout em coluna (`option:has(.opt-speak)`): emoji, palavra inteira e botão embaixo |
| PIN errado fechava a área dos pais sem aviso | mensagem “PIN incorreto. Tente de novo.” + shake, mantendo o teclado |
| Fala curta da sílaba (“lo”) caía como “não ouvi” | `listen()` aceita resultado **parcial** no `onend`/`onerror` e mantém o retry; 3 testes novos |
| Número e “sílabas” desalinhados e quebrando linha | bloco `.option__text` com `align-items: baseline`; removido `padding-right` global que espremia o texto |

Telas percorridas: home, trilha, lição, modo livro, caça-palavras, conversa (cartinhas + escolha + opções).

**Rodada 11 (v30):** revisão espaçada abriu com 8 itens (leitura de “árvore” com microfone, “Ouvir a Gabi” e “Me ensina”); área dos pais validada nas abas (Progresso, Conteúdo, Ajustes, Dados), com **backup exportado (4,74 KB)** e **download offline de 1.116 faixas concluído em ~20 s** no emulador.

**Rodada 12 (v31):** **offline real** — com `adb reverse` removido e Wi-Fi/dados desligados, o app abriu a home e a lição 100% do cache (só a escuta/OCR dependem de rede). PIN dos pais testado: errado mostra aviso e mantém o teclado; correto entra.

**Ajustes pós-goal (v32):** reconhecimento aceita parcial (sílaba curta), opções com número alinhadas na mesma base e sem quebra de linha forçada.

## 9. Rodada 13 (v33) — achados do review assistido

O review de 3m42s (sessão `20261106-082202`) rendeu três achados. Correções aplicadas e como foram verificadas:

| Achado | Correção | Evidência |
| --- | --- | --- |
| **1. Microfone fora da tela na história** — a criança rolava até o rodapé e perdia o texto | Em `read-text`, o microfone e “Ouvir a Gabi”/“Me ensina” ficam num **dock sticky** no rodapé da área de leitura. O texto inteiro cabe: em telas baixas (≤ 820 px) a tipografia compacta; a linha atual é levada ao centro ao avançar | `node tests/story-shot.mjs` → 360×640, 640×360 (landscape com rolagem real), 1024×768, 768×1024 e 800×1280 com `micVisible` e 5 linhas; prints `story-dock-*.png` |
| **2. Saudação não aparece/não fala no tablet** | A home nunca deixa a saudação vazia (fallback em `try/catch`); o botão “Ouvir a Gabi” desbloqueia o áudio, espera a lista de vozes e avisa se não houver voz pt-BR. No Android, a fala espera 300 ms após `cancel()` (o motor engasgava com 90 ms) e tenta a voz padrão se a escolhida falhar. A versão v33 aparece na Área dos pais e um aviso pede para reabrir quando o SW atualiza | `node tests/emu-tablet.mjs` → saudação visível em 1024×768 e 768×1024 no Chrome Android; TTS executou (`ttsOk=1`, `ttsFail=0`) no emulador |
| **3. Clipes ElevenLabs caindo no Google TTS no tablet** | O service worker **pré-cacheia** `index.json`, `index-opus.json` e os 1.116 clipes Opus (4,1 MB) em `gabi-audio-v1`, cache que sobrevive a upgrades e migra o áudio do cache antigo. `audio.js` registra qual caminho falhou (Opus, MP3, sem clipe, TTS) e há “Verificar áudio offline” na Área dos pais | Emulador: cache `1118` entradas; `playClip('gato')` → `opusOk`; história falou “Bia tem um gato” pelo clipe. Chrome headless com `Network.emulateNetworkConditions offline`: `1116/1116` e `playClip` Opus OK. Android sem `adb reverse`: app recarregou do cache e o clipe Opus continuou tocando |

**Validação da v33:** `npm test` **43/43** (novos: índices Opus e encoding), `check-sw`, `content-manifest --check`, `smoke` (0 erros), `ui-audit --shots` (**0 problemas** em 13 rotas × 5 viewports), `story-shot` e `emu-tablet` (Android Chrome em tablet) todos OK.

**Pendente de campo:** repetir o review com headset e validar no **tablet real** — o emulador não reproduz o problema de voz do tablet. Registrar em `HANDOVER.md`.

## 10. Rodada 14 (v34) — achados do teste de uso

| Achado | Correção | Evidência |
| --- | --- | --- |
| **Sílaba faltando sem lacuna** e opções com a outra sílaba da palavra podendo repetir o gabarito | `missing-syllable` agora mostra a palavra com `?` no lugar da sílaba (`? lo`, `bo ?`, `pi ? ta`). As opções são deduplicadas por sílaba (sem acento), então “banana”/“jujuba”/“caneca” não geram duas alternativas certas | `tests/lesson-shots.mjs` → print `lesson-missing-1024x768.png`; 3 opções únicas; teste unitário cobre as 34 lições + as 3 palavras repetidas |
| **Letras repetidas em dois botões** no ditado (“pirata” com dois “a”) | Peças iguais viram um único botão com contador: “a ×2”. Cada toque consome uma peça; tocar no espaço devolve; o contador e o `aria-label` acompanham | `tests/lesson-shots.mjs` → print `lesson-dictation-1024x768.png`; “a ×2” preenche dois espaços, volta para ×1 ao remover; 7 grupos para 6 espaços |
| **“Sol” dito uma vez reprovava; “Sol Sol” passava** | `readingKey()` normaliza o fim de palavra como a fala brasileira: L final vira U (“sol” ~ “sou”), R final some (“mar” ~ “ma”), O/E átonos viram U/I (“gato” ~ “gatu”, “leite” ~ “leiti”). `similarity()` aceita a chave fonética sem afrouxar palavras diferentes | `tests/reading.test.mjs`: “sou”×“sol”, “ma”×“mar”, “gatu”×“gato” passam; “sal”×“sol” e “sapato”×“sol” não |
| **Leitura de texto aceitava fala sem sentido e às vezes travava** | A escuta agora é cancelável tocando no microfone (`aria-label` “Parar de ouvir”), erros/rejeições sempre resetam o microfone, o timer da fala automática é cancelado ao abrir o microfone (evita o app ouvir a própria voz), e “Continuar com ajuda” aparece uma única vez após 3 tentativas. No fim, o texto diz “Leitura concluída com ajuda” quando houve ajuda | `tests/reading-sim.mjs`: fala sem sentido não avança, fala certa avança, botão não duplica, erro não trava, toque cancela e não avança sozinho |

**Validação da v34:** `npm test` **49/49**, `check-sw`, `content-manifest --check`, `smoke`, `full`, `ui-audit` e os três testes de UI acima. Falta repetir no tablet real.

## 11. Rodada 15 (v35) — revisão ao fim da lição

| Item | Decisão |
| --- | --- |
| Onde entra | Depois do último exercício, **antes** do resultado: `buildLessonReviewItems` monta 2 itens (3 se houve mais de um erro), priorizando as palavras erradas ou lidas com ajuda |
| O que revisa | Primeiro leitura de palavra; depois sílaba faltando (ou montar palavra, se não houver sílaba). Em história, usa as palavras do texto |
| Como não atrapalha | A revisão **não conta nas estrelas** da lição; entra no SRS/XP como prática. Há “Pular revisão” e o resultado mostra “Revisão rápida: x/y” |
| Onde não entra | Chefe (já é mistura), revisão espaçada global e diagnóstico |
| Prova | `tests/full.mjs` joga lição e história e confere o cartão “Revisão rápida” no resultado; `tests/review.test.mjs` cobre prioridade, tamanho e história; print `14-revisao-licao.png` |

**Validação da v35:** `npm test` **52/52**, `full` TUDO OK, `ui-audit` 0 problemas, `smoke` 0 erros. Falta o tablet real.
