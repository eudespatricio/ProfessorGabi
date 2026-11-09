# v47 — “Muito bem” regravado com Raquel

> **Execução:** 09/11/2026 03:15 (America/Sao_Paulo) · **App:** `v47` · **SW:** `gabi-v47`
> **Evidências:** [`tests/stress-v47/results.json`](../tests/stress-v47/results.json)

## Resultado

**65/65 verificações OK · 0 falhas.** O clipe **“Muito bem”** não estava com a Raquel: era um arquivo antigo de **05/11**, com pitch de **144 Hz**, fora do padrão feminino do acervo. Ele foi regravado com a Raquel e agora está em **250 Hz**.

| Item | Resultado |
| --- | --- |
| “Muito bem” antigo | 144,2 Hz · arquivo de 05/11 |
| “Muito bem” novo | **250,2 Hz · Raquel** |
| Clipes antigos fora do padrão regravados | **28** |
| Créditos usados nesta correção | **130** |
| Acervo total | **1.778** (mantido) |
| Stress | **65/65** |
| Unitários | **69/69** |
| Invariantes Python | **7/7** |
| `check-opus` | **7/7** |

## O que foi corrigido

A auditoria de pitch dos 1.778 clipes encontrou um grupo de **28 clipes antigos** entre 139 e 159 Hz, muito abaixo da mediana da Raquel (~222 Hz). O caso mais audível era **“Muito bem”**, usado no feedback `NEURAL_PRAISE` das lições:

- arquivo antigo: `audio/49ef3a3f38.mp3` (05/11, 144 Hz);
- arquivo novo: `audio/4d699f100c.mp3` (Raquel, 250 Hz);
- o mesmo grupo incluía palavras e sílabas como `preto`, `pipa`, `bomba`, `rou`, `vestido`, `tomate`, `avião`, `lâmpada`, `pêssego`, `cavalo`, `guerra`, `nosso` etc.

Os 28 foram gerados novamente com **Raquel** (`GDzHdQOi6jjf8zaXhCYD`, `eleven_multilingual_v2`, mesmas configurações do pacote). Cada um recebeu **URL nova** (`|raquel-v2` no hash) para não reaproveitar o cache imutável antigo; os arquivos velhos foram removidos. O total permanece **1.778**, sem regenerar os outros 1.750.

Custo: **130 caracteres/créditos**. Com o delta v44 (28.065), o total usado fica em **28.195** — ainda dentro dos 30k, com ~1.805 de margem.

## Outras correções mantidas

- Enunciados completos nas lições (`item.say`, não só a palavra).
- Filtro de voz **feminina pt-BR**; masculinas e PT-PT fora das opções.
- Timeout de 2,2 s no índice de áudio.
- 1.778 MP3/Opus, nomes Gabi/Gabriela e clipes do delta v44 preservados.

## Deploy

- `https://192.168.1.6:8443` — **v47** / `gabi-v47`
- 1.778 MP3 + 1.778 Opus
- Para o tablet: fechar e abrir a PWA; conferir **Pais → Ajustes → “Versão do app: v47”**.

## Limitações

- A heurística de gênero do TTS depende do nome da voz; uma voz masculina com nome genérico pode escapar. O caso dos **clipes** está corrigido.
- `gabiReply` dinâmico, LLM e OCR continuam em TTS feminino pt-BR.
- Validação de microfone segue simulada no emulador.

## Evidências

- [17-enunciado-licao.png](../tests/stress-v47/17-enunciado-licao.png)
- [16-nome-gabi.png](../tests/stress-v47/16-nome-gabi.png)
- [16-nome-gabriela.png](../tests/stress-v47/16-nome-gabriela.png)
- [results.json](../tests/stress-v47/results.json)
