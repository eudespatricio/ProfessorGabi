# v44 — PT-PT fora, 662 clipes novos e stress final

> **Execução:** 08/11/2026 23:30 (America/Sao_Paulo) · **App:** `v44` · **SW:** `gabi-v44`
> **Ambiente:** Pixel 6 (AVD `gabi`), Android 15, Chrome 156, áudio ligado
> **Bateria:** [`tests/stress-emu.mjs`](../tests/stress-emu.mjs) · **Evidências:** [`tests/stress-v44/results.json`](../tests/stress-v44/results.json)

## Resultado

**64/64 verificações OK · 0 falhas.** O acervo passou de **1.116** para **1.778 clipes**; 662 são novos e os 1.116 antigos **não foram regenerados**.

| Item | Resultado |
| --- | --- |
| Voz ativa no emulador | `Portuguese Brazil` / `pt_BR` |
| Vozes pt-PT na lista | **0** |
| `ptVoices` / `ptPtVoices` | 1 / 1 (a de Portugal existe no sistema, mas é ignorada) |
| Créditos usados no delta | **28.065** (de 30k; sobram ~1.935) |
| Clipes novos | **662** |
| Acervo final | **1.778 MP3 + 1.778 Opus** |
| Tamanho | 55 MB MP3 · 13 MB Opus |
| Stress | **64/64** |
| Unitários | **68/68** |
| Invariantes Python | **7/7** |

## 1. PT-PT rejeitado e removido das opções

Em [`app/js/audio.js`](app/js/audio.js):

- `normalizeVoiceLang()` trata `pt_BR` e `pt-BR` como o mesmo idioma.
- `isBrazilianVoice()` aceita `pt-BR`/`pt_BR` e nomes “Portuguese Brazil”; **rejeita** `pt_PT`, `pt-PT`, “Portugal”, “Europeu”.
- `pickVoice()` ignora `voiceURI` salvo que aponte para Portugal e escolhe somente voz brasileira.
- `listVoices()` retorna apenas vozes pt-BR.
- Se não houver nenhuma voz pt-BR, `speak()` devolve `unsupported`/`no-pt-br` em vez de cair na voz de Portugal; `speakSyllables()` não usa TTS nesse caso.

Nas telas:

- [`screen-voice.js`](app/js/screen-voice.js) não lista mais Portugal; mostra aviso para instalar pt-BR.
- [`screen-parent.js`](app/js/screen-parent.js) limpa `voiceURI` inválido e só oferece vozes brasileiras.
- [`screen-home.js`](app/js/screen-home.js) avisa “instale pt-BR” e ignora a voz de Portugal.

Evidência do emulador:

```text
voz ativa: Portuguese Brazil
ptVoices: 1 · ptPtVoices: 1
lista de vozes: nenhuma pt_PT / pt-PT
```

## 2. Delta de áudio: 662 clipes, 28.065 créditos

Usei a mesma voz **Raquel** (`GDzHdQOi6jjf8zaXhCYD`) e o mesmo modelo `eleven_multilingual_v2` do pacote original. A API de vozes confirma `labels.accent = brazilian`.

Gerei somente chaves ausentes no `index.json`; o script [`tools/render-delta.mjs`](tools/render-delta.mjs) pula qualquer clipe já existente.

| Bloco | Clipes | Caracteres |
| --- | ---: | ---: |
| Comandos de exercício (`say`) | 374 | 12.788 |
| Sílabas da conversa (pergunta/acerto/erro) | 90 | 4.994 |
| Cartões de ensino (`fala`) | 36 | 2.595 |
| Saudações com nome | 30 | 1.564 |
| Trava-línguas + intros | 40 | 2.494 |
| Nome no talk (intro, humor, despedida) | 16 | 916 |
| Colocação por unidade | 14 | 722 |
| Comandos (`prompt`) | 13 | 263 |
| Humor, perguntas, cheers, echo, follow-up | 40 | 1.404 |
| Outros (home, pais, busca, voz, palavra) | 9 | 325 |
| **Total** | **662** | **28.065** |

- Nome da criança: **Gabi** e **Gabriela**, incluindo 30 saudações de home (3 períodos × 5 aberturas × 2 nomes), 16 falas do talk e 2 falas de onboarding.
- O `home` passou a falar **só a saudação** (`greetingLine`), que tem clipe; a sequência de dias continua visual. Assim o nome não cai no TTS.
- Conversa: perguntas, cheers, humores, sílabas, trava-línguas, eco e follow-up agora têm clipe. `gabiReply` dinâmico, LLM e OCR continuam TTS — mas só pt-BR.

Verificação dos nomes no emulador:

```text
Gabi:     opusOk 1 · ttsOk 0 · "bom dia, gabi! vamos nos divertir aprendendo"
Gabriela: opusOk 1 · ttsOk 0 · "bom dia, gabriela! vamos começar com uma historinha"
```

- Cache de áudio: **1.780** entradas (1.778 clipes + 2 índices).
- O SW agora **atualiza `index.json` e `index-opus.json` a cada instalação**; antes ele mantinha o índice antigo do cache e escondia os clipes novos.

## 3. Stress final

O cenário `--scenario name` foi adicionado e roda para os dois nomes. A bateria completa inclui:

- boot, versão, SW, CORE, cache e lista de vozes;
- conversa completa + interrupções;
- latência da conversa com áudio (**756 ms** até as opções);
- caça-palavras (resultado depois da última palavra, **0 overlaps**);
- nomes Gabi/Gabriela (**2 clipes Opus, 0 TTS**);
- lição rápida (**0 overlaps**, máximo 1 mídia);
- navegação e saída durante a escuta.

## 4. Como repetir

```bash
node tools/audio-delta-candidates.mjs        # audita o delta e o orçamento
node tools/render-delta.mjs --dry-run        # não chama API
node tools/render-delta.mjs --write          # gera só o que falta
wsl bash tools/make-opus.sh                  # só converte MP3 sem Opus
node tools/build-opus-index.mjs
node tests/stress-emu.mjs                    # bateria completa
```

## Limitações

- A escuta foi simulada; microfone físico do tablet continua pendente.
- Nomes fora de **Gabi/Gabriela** ainda usam TTS (pt-BR). Para incluir outros, basta acrescentá-los em `tools/audio-delta-candidates.mjs` e rodar o delta.
- `gabiReply` com texto dinâmico, LLM e OCR não podem ser pré-gerados; usam TTS pt-BR.
- Não há metadados de voz por arquivo; a consistência vem do script, da voz Raquel e do modelo fixos. Se o pacote for alterado no futuro, regenerar pelo mesmo pipeline.

## Evidências

- [16-nome-gabi.png](../tests/stress-v44/16-nome-gabi.png)
- [16-nome-gabriela.png](../tests/stress-v44/16-nome-gabriela.png)
- [15-caca-resultado.png](../tests/stress-v44/15-caca-resultado.png)
- [results.json](../tests/stress-v44/results.json)
- [docs/AUDIO.md](AUDIO.md)
