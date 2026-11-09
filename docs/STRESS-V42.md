# Stress test v42 — voz do resultado no caça-palavras

> **Execução:** 08/11/2026 22:52 (America/Sao_Paulo) · **App:** `v42`
> **Ambiente:** Pixel 6 (AVD `gabi`), Android 15 / API 35, Chrome 156, áudio do emulador ligado
> **Bateria:** [`tests/stress-emu.mjs`](../tests/stress-emu.mjs) · **Evidências:** [`tests/stress-v42/results.json`](../tests/stress-v42/results.json)

## Resultado

**58 verificações · 58 OK · 0 falhas.**

| Correção | Antes | Depois (v42) |
| --- | --- | --- |
| **S1** voz do resultado sobre a última palavra | resultado podia entrar por cima/cortar a última palavra | última palavra toca, termina e só depois o resultado fala; **0 sobreposições** |
| **S2** última palavra audível | podia ser cortada antes de terminar | `wordHeard: true` |
| **S3** resultado falado | risco de o resultado não chegar ao TTS | `resultSpoken: true` |

Evidência do cenário do caça-palavras (última palavra `bico`):

```text
4.423 s  media-playing  bico (Opus)
5.719 s  media-pause    bico — 0,935 s
6.091 s  tts-start      “Você encontrou todas as palavras!”
9.136 s  tts-end
```

A palavra termina antes de o resultado começar. Nenhum `overlap-media`, `overlap-tts` ou `overlap-tts-media` foi registrado.

## Causa e correção

`markFound()` falava a palavra e `finish()` falava o resultado **na mesma pilha síncrona**. O `speak()` do resultado cancelava a fala da palavra, mas em alguns timings a palavra já estava audível e o resultado entrava por cima; em outros, a palavra era cortada antes de ser ouvida.

Em `app/js/screen-search.js`:

- `markFound()` guarda o Promise de `speak(word)` e passa para `finish(wordSpeech)`.
- `finish()` agora é assíncrono: mostra a vitória, espera a fala da palavra terminar (limite de **2,2 s**) e só então fala o resultado.
- Se o limite estourar, `stopSpeaking()` corta a palavra antes de falar o resultado — nunca as duas juntas.
- `wrap.isConnected` impede que o resultado fale depois de a criança sair da tela.

## Regressão automatizada

Novo cenário `--scenario search` em `tests/stress-emu.mjs`:

1. abre `#/caca`;
2. resolve todas as palavras menos uma;
3. espera o áudio ficar ocioso e zera o auditor;
4. marca a última palavra;
5. verifica: vitória visível, última palavra falada, resultado falado e **zero sobreposições**.

O cenário entrou na bateria completa: **58/58 checks**. Também passaram:

- `node --test …` **65/65**
- `pytest -q tests/test_invariants.py` **7/7**
- `check-sw` e `content-manifest --check`

## Evidências

- [15-caca-resultado.png](../tests/stress-v42/15-caca-resultado.png) — tela de vitória após a última palavra.
- [results.json](../tests/stress-v42/results.json) — checagens e log de áudio do caça-palavras.
- [STRESS-V41.md](STRESS-V41.md) — rodada anterior com as 9 correções de áudio/conversa.

## Limitações

- O TTS do emulador tem latência variável; a ordem “palavra → resultado” foi medida, mas o tempo exato pode variar no tablet.
- O cenário resolve um tabuleiro por execução; a regra vale para qualquer última palavra.
- A validação física de microfone/volume continua pendente no tablet real.
