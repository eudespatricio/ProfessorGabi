# v48 — auditoria dos 1.778 áudios e índice versionado

> **Execução:** 09/11/2026 03:28 (America/Sao_Paulo) · **App:** `v48` · **SW:** `gabi-v48`
> **Evidências:** [`tests/stress-v48/results.json`](../tests/stress-v48/results.json)

## Resultado

**65/65 verificações OK · 0 falhas.** A auditoria completa dos **1.778 clipes** não encontrou arquivo faltando, silencioso ou clipado, e **nenhum clipe antigo abaixo de 160 Hz**. O “Muito bem” novo está em **250 Hz**, com a Raquel.

| Item | Resultado |
| --- | --- |
| Clipes auditados | **1.778 / 1.778** |
| Arquivos faltando | 0 |
| Clipes silenciosos (RMS < 0,003) | 0 |
| Clipes clipados (peak > 0,995) | 0 |
| Clipes antigos < 160 Hz | **0** |
| “Muito bem” antigo | 144,2 Hz (arquivo de 05/11) |
| “Muito bem” novo | **250,2 Hz · Raquel** |
| Stress | **65/65** |
| Unitários | **69/69** |
| Invariantes Python | **7/7** |
| `check-opus` | **7/7** |

## Por que o “Muito bem” masculino voltou

Havia **duas camadas**:

1. **O clipe antigo** `audio/49ef3a3f38.mp3`, de 05/11, a 144 Hz. Ele foi substituído por `audio/4d699f100c.mp3`, 250 Hz (v47).
2. **O índice de áudio ainda podia vir do cache antigo** (`gabi-audio-v1`). O app baixava `audio/index.json` sem versão e o service worker podia devolver o índice velho, que apontava para o clipe masculino.

Na **v48**, o app busca:

```text
audio/index.json?v=v48
audio/index-opus.json?v=v48
```

Se a versão nova não estiver disponível (offline), ele usa o índice simples em cache. Assim, uma atualização de clipe não fica escondida por um índice antigo.

## Auditoria dos 1.778

- pitch de cada clipe (mediana por frames, 8 kHz);
- energia RMS e pico para detectar silêncio/clipping;
- cobertura `index.json`/`index-opus.json` (1.778/1.778);
- origem: 1.116 antigos (28 substituídos na v47) + 662 do delta v44 = 1.778.

Resultado: **0 antigos abaixo de 160 Hz**, **0 silenciosos**, **0 clipados**. Os 28 clipes antigos que estavam entre 139–159 Hz foram regravados com a Raquel na v47.

## Limite importante

Os 28 outliers foram corrigidos; **não regravei os 1.116 antigos inteiros**. Uma regeneração completa custaria aproximadamente **19.085 créditos**, acima do saldo restante (~1.805). A auditoria cobre os sinais objetivos (pitch, silêncio, clipping, cobertura); se o objetivo for consistência absoluta de timbre, o caminho é regravar todo o acervo antigo com a Raquel quando houver créditos.

## Deploy

- `https://192.168.1.6:8443` — **v48** / `gabi-v48`
- Para o tablet: fechar e abrir a PWA; se necessário abrir `https://192.168.1.6:8443/?v=48` uma vez.
- Conferir **Pais → Ajustes**: “Versão do app: v48”.
- O novo “Muito bem” é `audio/4d699f100c.mp3`.

## Evidências

- [17-enunciado-licao.png](../tests/stress-v48/17-enunciado-licao.png)
- [16-nome-gabi.png](../tests/stress-v48/16-nome-gabi.png)
- [results.json](../tests/stress-v48/results.json)
