# Backlog — o que temos, o que está em pipe

> Legenda: ✅ feito · 🟡 parcial · ⬜ ideia · P1 agora · P2 próximo · P3 depois

## 1. Conteúdo e pedagogia

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| 14 unidades, 22 textos, 351 palavras, 351 definições | ✅ | — | escopo atual |
| Níveis 1–3 por unidade + fase chefe | ✅ | — | sobem com ≥80%, descem com <50% |
| Revisão espaçada (1/3/7/16/35 dias) | ✅ | — | `store.srs` |
| Mais unidades (E/I, O/U, X, encontros, sílabas complexas) | ⬜ | P1 | seguir o escopo-sequência |
| Mais textos decodificáveis e diálogos | ⬜ | P1 | usar só padrões já ensinados |
| Ampliar glossário (palavras novas) | ⬜ | P1 | hoje 100% das 351 |
| Banco de frequência (5k) para escolher palavras | ⬜ | P2 | já temos lista de 12k para OCR |
| Fluência: palavras por minuto e repetição | ⬜ | P2 | leitura cronometrada sem pressão |
| Compreensão com inferência | ⬜ | P2 | além de “qual foi” |
| Escrita à mão (traçado) | ⬜ | P3 | exige canvas e correção de traço |
| Consciência fonêmica avançada (som inicial/final) | ⬜ | P3 | depois de consolidar sílabas |

## 2. Jogos

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| Caça-palavras 8×8 (5 palavras, XP, bônus) | ✅ | — | `screen-search.js` |
| Baú do dia (1×/dia → caça bônus) | ✅ | — | falta animação de abertura |
| **Palavras cruzadas — 3 formatos** | ⬜ | P1 | (a) pistas com imagem, (b) pistas com sílabas, (c) banco de palavras |
| **Monstrinho** com tentativas limitadas | ⬜ | P1 | só como bônus, tentativas generosas |
| Animação de abertura do baú | ✅ | — | brilho + pop + confete + som; `polish.css` |
| Caça-palavras: temas, 6×6 e 10×10 | ⬜ | P2 | palavras da fase + revisão |
| Memória de sílabas / bingo / dominó | ⬜ | P2 | jogos curtos de 2–3 min |
| Forca amigável (com dicas) | ⬜ | P3 | evitar frustração |
| Desafio diário com 3 cartas | ⬜ | P2 | mistura de jogos |

## 3. Leitura e OCR

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| OCR com normalização de iluminação | ✅ | — | recupera margem direita |
| Filtro por confiança (TSV) | ✅ | — | remove ilustração |
| Corretor de dicionário (12k) | ✅ | — | `ocr-fix.js`, 14 testes |
| Deskew / correção de perspectiva | ⬜ | P1 | página torta |
| Destacar palavras de baixa confiança na conferência | ⬜ | P1 | adulto corrige rápido |
| Correção por contexto (bigramas) | ⬜ | P2 | “com à” → “com a” |
| Guia de enquadramento na câmera | ⬜ | P2 | overlay com cantos |
| Leitura por página com paginação | ⬜ | P2 | livros longos |
| Salvar página com áudio | ⬜ | P3 | ouvir de novo offline |

## 4. Voz e escuta

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| Clipes ElevenLabs (1.116) + TTS reserva | ✅ | — | 23,6 MB; inclui sílabas de 1 letra |
| Retry real para `no-speech`/`audio-capture` | ✅ | — | `speech.js` |
| “Eu li / Eu repeti” em toda escuta | ✅ | — | nunca pune |
| Clipes para novas frases (conversa, instruções) | ⬜ | P1 | renderizar só o que falta |
| ASR nativo no iOS (Capacitor) | ⬜ | P1 | loja Apple |
| Sensibilidade por criança (ruído/voz baixa) | ⬜ | P2 | ajuste nos pais |
| Comparar gravação da criança com a Gabi | ⬜ | P3 | privacidade: gravar só local |

## 5. Visual e UX

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| Design tokens, cartões, HUD, medalha | ✅ | — | `app.css` + `game.css` |
| Cartinhas de tema com flip 3D | ✅ | — | conversa |
| Auditoria de responsividade (celular/tablet) | 🟡 | P1 | `tools/ui-audit.mjs`: 13 rotas × 5 viewports, 0 problemas na v34 |
| **Dock do microfone na leitura de história** | ✅ | — | achado 1 do review; `tests/story-shot.mjs` cobre 5 viewports |
| **Sílaba faltando com lacuna visível** | ✅ | — | achado do teste de uso; `tests/lesson-shots.mjs` |
| **Pecinhas repetidas agrupadas (a ×2)** | ✅ | — | ditado e montar palavra; `tests/lesson-shots.mjs` |
| **Leitura tolerante a L/R finais (“sol” ~ “sou”)** | ✅ | — | `readingKey()` em `utils.js`; `tests/reading.test.mjs` |
| **Revisão rápida ao fim da lição** | ✅ | — | 2 itens priorizando erros; `tests/review.test.mjs` e `full.mjs` |
| **Saudação da home com fallback e diagnóstico de voz** | ✅ | — | achado 2 do review; aviso quando não há voz pt-BR |
| Transições entre telas | ✅ | — | fade/slide de 260 ms em `polish.css`, respeita reduce-motion |
| Sistema de animações (2D/3D) documentado | ✅ | — | regras em `QUALIDADE.md` + `polish.css` |
| Parallax no mapa/hero | 🟡 | P2 | mapa (nuvens/sol/grama) pronto; hero pendente |
| Tema sazonal (festa junina, natal) | ⬜ | P2 | troca de cores/ícones |
| Ilustrações próprias (hoje emojis) | ⬜ | P2 | identidade visual |
| Banner de instalação persistente | ✅ | — | só na home; dispensa gravada |
| Barra “Translate page?” do Chrome | ✅ | — | `translate="no"` + meta notranslate |
| Estados vazios e skeletons | ⬜ | P2 | carregamento do OCR |
| Modo escuro | ⬜ | P3 | opcional |

## 6. Arquitetura, dados e offline

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| PWA sem build, SW cache-first | ✅ | — | `gabi-v35` |
| Estado local + backup/restauração | ✅ | — | `gabi.state.v1` |
| **Fonte única de conteúdo (`content/manifest.json`)** | 🟡 | P1 | manifesto canônico gerado e verificado no `npm test`; runtime ainda lê os módulos |
| Runtime lendo o manifesto (v3) | ⬜ | P2 | permitiria conteúdo por versão/loja sem mudar código |
| **Estado v2 com `schemaVersion` e migrações** | ✅ | — | `migrate()`, `STATE_VERSION = 2`, backup antigo migra |
| Limitar `history` (cresce sem limite) | ✅ | — | 300 entradas; poda no `save()` |
| Gerar `CORE` do SW automaticamente | ✅ | — | `tools/build-sw.mjs` gera 36 entradas; `check-sw` valida |
| Lazy-load de módulos pesados | ✅ | — | dicionário/OCR só no primeiro uso (99 KB fora da abertura) |
| Áudio em Opus (~8 MB) | ✅ | — | **4,09 MB** (83% menor), fallback MP3, índice próprio |
| **Precache automático do áudio Opus** | ✅ | — | 1.116 clipes (4,1 MB) + índices em `gabi-audio-v1`, que sobrevive a upgrades; corrige o achado 3 do review |
| Precache por fase (baixar só o que usa) | ⬜ | P2 | economia em tablet antigo |
| Gestão de quota/storage | ⬜ | P2 | aviso quando encher |

## 7. Backend e pais

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| Servidor estático (HTTP/HTTPS) | ✅ | — | gzip 61–76%, Range 206, headers de segurança, `check-server.mjs` |
| CSP e política de conteúdo | ⬜ | P2 | hoje só cabeçalhos básicos; CSP exige testar Tesseract/CDN |
| Painel dos pais local | ✅ | — | progresso, conteúdo, ajustes, dados |
| Relatório em PDF para a escola | ⬜ | P2 | a partir do estado |
| Sincronização opcional (nuvem) | ⬜ | P2 | app funciona sem ela |
| API mínima (`/sync`, `/backup`) com código | ⬜ | P2 | sem conta de criança |
| Painel do professor (escola) | ⬜ | P3 | licença por aluno |

## 8. Lojas e monetização

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| Plano de viabilidade (taxas 2026) | ✅ | — | `VIABILIDADE-LOJAS.md` |
| Publicar TWA no Google Play | ⬜ | P1 | US$ 25 + 12 testadores/14 dias |
| MSIX na Microsoft Store | ⬜ | P1 | grátis, 0% com comércio próprio |
| Capacitor + voz nativa para iOS | ⬜ | P2 | US$ 99/ano |
| Paywall freemium (R$ 49,90 único) | ⬜ | P2 | decisão pendente |
| Política de privacidade + data safety | ⬜ | P1 | obrigatório nas lojas |
| Teste com 12 pessoas no Play | ⬜ | P1 | recrutar escola/família |

## 9. Qualidade e acessibilidade

| Item | Status | Prio | Nota |
| --- | --- | --- | --- |
| 52 testes unitários + smoke | ✅ | — | `npm test` |
| Teste de conversa (cartinhas/humor) | ✅ | — | `tools/test-talk.mjs` |
| Matriz de dispositivos (emulador + tablet) | ⬜ | P1 | ver `QUALIDADE.md` |
| Teste visual automatizado (diff de prints) | 🟡 | P1 | auditoria de layout pronta; falta diff de imagem |
| Orçamento de performance (60 fps) | ⬜ | P2 | animações em transform/opacity |
| Contraste AA automatizado | ✅ | — | `ui-audit` mede texto/fundo sólido; gradientes revisão manual |
| Teste com palavras longas (“paralelepípedo”) | ⬜ | P1 | estouro de tela |

## 10. Decisões pendentes

1. **Modelo de cobrança**: freemium + R$ 49,90 único (recomendado) ou assinatura?
2. **iOS agora ou depois?** Capacitor resolve voz nativa e paywall.
3. **Quando construir o paywall?** Recomendação: publicar grátis e medir 4–8 semanas.
4. **Sincronização dos pais**: manter local ou preparar nuvem?
5. **Quem são os 12 testadores do Play?**
6. **Identidade visual**: manter emojis ou contratar ilustrações?
