# ESTADO â€” Professor Gabi
> Sobrescrito a cada versÃ£o (nunca append-only). Soma `ESTADO + MAPA + REJEITADOS < 150 linhas`.

- **Data / VersÃ£o:** 2026-11-09 Â· App `v46` (`app/js/version.js`) Â· Service Worker `gabi-v46` (`app/sw.js`)
- **Resumo:** PWA offline-first de alfabetizaÃ§Ã£o em portuguÃªs (leitura guiada sÃ­laba a sÃ­laba, fala neural, escuta tolerante, OCR de livros e jogos) em ES Modules nativos sem bundler.

## 1. NÃºmeros CanÃ´nicos (validados por `tests/invariants.test.mjs` e `tests/test_invariants.py`)
| MÃ©trica | Valor Real | Fonte CanÃ´nica |
| --- | --- | --- |
| VersÃ£o App / SW | `v46` / `gabi-v46` | `app/js/version.js` e `app/sw.js` |
| Estado Local (`localStorage`) | `gabi.state.v1` (`STATE_VERSION = 2`) | `app/js/store.js` (`HISTORY_MAX = 300`) |
| CurrÃ­culo e ConteÃºdo | **14** unidades (`u1`â€“`u14`), **351** palavras, **22** histÃ³rias | `content/manifest.json` |
| DicionÃ¡rio Infantil (GlossÃ¡rio) | **351 / 351** definiÃ§Ãµes (100% cobertura, 0 Ã³rfÃ£os) | `app/js/glossary.js` |
| Corretor de OCR (Lazy-loaded) | **12.000** palavras pt-BR (94 KB, fora do boot inicial) | `app/js/wordlist-pt.js` |
| Ãudio Neural Offline (ElevenLabs) | **1.778** clipes Opus (`13 MB`) + **1.778** MP3 (`55 MB`) | `app/audio/index-opus.json` (`gabi-audio-v1`) |
| Shell Offline (`CORE` do SW) | **37** entradas (`26` mÃ³dulos JS + `3` CSS + fontes/Ã­cones) | `app/sw.js` |

## 2. O que estÃ¡ funcionando (Pronto em ProduÃ§Ã£o)
- **Trilha completa (14 fases)**: sons/sÃ­labas â†’ P/B/M/T/D/N â†’ F/V/L/R/S â†’ C/G/J/X/Z â†’ dÃ­grafos â†’ M antes de P/B â†’ encontros â†’ finais â†’ histÃ³rias â†’ R/RR â†’ S/SS â†’ C/QU â†’ G/GU â†’ Ã‡/X/CH.
- **ProgressÃ£o e MemÃ³ria**: 3 nÃ­veis por unidade (assistido, praticando, sozinha), Fase Chefe (8 itens), SRS (1, 3, 7, 16, 35 dias) e **RevisÃ£o RÃ¡pida ao fim da liÃ§Ã£o** (2â€“3 itens focados nos erros).
- **Voz e Escuta**: prÃ©-cache automÃ¡tico dos 1.116 clipes Opus no SW (`gabi-audio-v1` sobrevive a upgrades), fallback MP3 â†’ Web Speech TTS; escuta tolerante a fala infantil (`readingKey` aceita L/R finais e O/E Ã¡tonos) e botÃ£o `"Eu li / Eu repeti"` sempre visÃ­vel.
- **Modo Livro (OCR) & Jogos**: foto â†’ normalizaÃ§Ã£o Sauvola/Otsu â†’ Tesseract TSV â†’ corretor 12k â†’ leitura guiada; CaÃ§a-palavras 8Ã—8, BaÃº do Dia animado e Conversa com 3 cartinhas 3D + 21 trava-lÃ­nguas.

## 3. O que estÃ¡ congelado / Pendente de Campo
- **CorreÃ§Ãµes v46:** enunciados completos, voz feminina pt-BR e timeout do Ã­ndice de Ã¡udio; stress em `docs/STRESS-V46.md`.
- **ValidaÃ§Ã£o fÃ­sica no tablet real**: testar microfone sem headset e confirmar cache `1116/1116` em `Pais â†’ Dados`.
- **Backlog P1/P2 congelado atÃ© validaÃ§Ã£o de campo**: palavras cruzadas, monstrinho, publicaÃ§Ã£o TWA Play Store / MSIX e migraÃ§Ã£o do runtime para ler `content/manifest.json` direto (planejado para `v3`).

## 4. Comandos de OperaÃ§Ã£o e OrÃ¡culos
```bash
pytest -q tests/test_invariants.py        # OrÃ¡culo rÃ¡pido no WSL (< 0.3s: invariantes, manifesto, SW, Ã¡udio, encoding)
npm test                                  # Suite Node completa (unitÃ¡rios + invariants.test.mjs + check-sw + manifest)
node server/serve.mjs 8443 --https        # Servidor local HTTPS (necessÃ¡rio para microfone e instalaÃ§Ã£o PWA)
```
