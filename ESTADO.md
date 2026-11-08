# ESTADO — Professor Gabi
> Sobrescrito a cada versão (nunca append-only). Soma `ESTADO + MAPA + REJEITADOS < 150 linhas`.

- **Data / Versão:** 2026-11-08 · App `v37` (`app/js/version.js`) · Service Worker `gabi-v37` (`app/sw.js`)
- **Resumo:** PWA offline-first de alfabetização em português (leitura guiada sílaba a sílaba, fala neural, escuta tolerante, OCR de livros e jogos) em ES Modules nativos sem bundler.

## 1. Números Canônicos (validados por `tests/invariants.test.mjs` e `tests/test_invariants.py`)
| Métrica | Valor Real | Fonte Canônica |
| --- | --- | --- |
| Versão App / SW | `v37` / `gabi-v37` | `app/js/version.js` e `app/sw.js` |
| Estado Local (`localStorage`) | `gabi.state.v1` (`STATE_VERSION = 2`) | `app/js/store.js` (`HISTORY_MAX = 300`) |
| Currículo e Conteúdo | **14** unidades (`u1`–`u14`), **351** palavras, **22** histórias | `content/manifest.json` |
| Dicionário Infantil (Glossário) | **351 / 351** definições (100% cobertura, 0 órfãos) | `app/js/glossary.js` |
| Corretor de OCR (Lazy-loaded) | **12.000** palavras pt-BR (94 KB, fora do boot inicial) | `app/js/wordlist-pt.js` |
| Áudio Neural Offline (ElevenLabs) | **1.116** clipes Opus (`4,09 MB`) + **1.116** MP3 (`23,6 MB`) | `app/audio/index-opus.json` (`gabi-audio-v1`) |
| Shell Offline (`CORE` do SW) | **36** entradas (`25` módulos JS + `3` CSS + fontes/ícones) | `app/sw.js` |

## 2. O que está funcionando (Pronto em Produção)
- **Trilha completa (14 fases)**: sons/sílabas → P/B/M/T/D/N → F/V/L/R/S → C/G/J/X/Z → dígrafos → M antes de P/B → encontros → finais → histórias → R/RR → S/SS → C/QU → G/GU → Ç/X/CH.
- **Progressão e Memória**: 3 níveis por unidade (assistido, praticando, sozinha), Fase Chefe (8 itens), SRS (1, 3, 7, 16, 35 dias) e **Revisão Rápida ao fim da lição** (2–3 itens focados nos erros).
- **Voz e Escuta**: pré-cache automático dos 1.116 clipes Opus no SW (`gabi-audio-v1` sobrevive a upgrades), fallback MP3 → Web Speech TTS; escuta tolerante a fala infantil (`readingKey` aceita L/R finais e O/E átonos) e botão `"Eu li / Eu repeti"` sempre visível.
- **Modo Livro (OCR) & Jogos**: foto → normalização Sauvola/Otsu → Tesseract TSV → corretor 12k → leitura guiada; Caça-palavras 8×8, Baú do Dia animado e Conversa com 3 cartinhas 3D + 21 trava-línguas.

## 3. O que está congelado / Pendente de Campo
- **Validação física no tablet real**: testar microfone sem headset e confirmar cache `1116/1116` em `Pais → Dados`.
- **Backlog P1/P2 congelado até validação de campo**: palavras cruzadas, monstrinho, publicação TWA Play Store / MSIX e migração do runtime para ler `content/manifest.json` direto (planejado para `v3`).

## 4. Comandos de Operação e Oráculos
```bash
pytest -q tests/test_invariants.py        # Oráculo rápido no WSL (< 0.3s: invariantes, manifesto, SW, áudio, encoding)
npm test                                  # Suite Node completa (unitários + invariants.test.mjs + check-sw + manifest)
node server/serve.mjs 8443 --https        # Servidor local HTTPS (necessário para microfone e instalação PWA)
```
