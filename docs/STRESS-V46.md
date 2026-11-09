# v46 — enunciados falados, voz feminina e áudio sem travar

> **Execução:** 09/11/2026 03:00 (America/Sao_Paulo) · **App:** `v46` · **SW:** `gabi-v46`
> **Ambiente:** Pixel 6 (AVD `gabi`), Android 15, Chrome 156 · **Evidências:** [`tests/stress-v46/results.json`](../tests/stress-v46/results.json)

## Resultado

**65/65 verificações OK · 0 falhas.** Não houve geração nova de áudio; o acervo continua com **1.778 clipes** (662 do delta v44, 1.116 originais).

| Verificação | Resultado |
| --- | --- |
| Stress completo | **65/65** |
| Enunciado da lição | clipe `fogo. quantas sílabas tem a palavra fogo` · **Opus, 0 TTS** |
| Nomes Gabi/Gabriela | **2 clipes Opus, 0 TTS** |
| Unitários Node | **69/69** |
| Invariantes Python | **7/7** |
| `check-opus` | **7/7** |
| Voz ativa | `Portuguese Brazil` |
| Lista de vozes | **0 pt-PT, 0 masculinas conhecidas** |

## 1. Enunciados das lições

O defeito: `speakExerciseTarget()` preferia `item.word` antes de `item.say`. Em exercícios como “Quantas sílabas tem a palavra? **fogo**”, o áudio tocava só “fogo” e não a pergunta. O botão **Ouvir** tinha o mesmo problema.

Correção em [`screen-lesson.js`](app/js/screen-lesson.js) e [`exercises.js`](app/js/exercises.js):

- o áudio agora prefere `item.say` (enunciado completo + alvo);
- o botão **Ouvir** e a dica também preferem `item.say`;
- leitura (`read-word`/`read-phrase`/`read-text`) mantém o comportamento pedagógico de nível 1/2;
- o clipe de 2,3 s tem tempo de terminar antes de qualquer avanço automático.

Novo cenário `--scenario statement`: abre a primeira lição, clica em **Entendi**, espera o clipe e valida que o áudio é o enunciado completo. Resultado: **Opus, 0 TTS**.

## 2. Voz masculina e PT-PT

O acervo é **todo feminino**: a varredura de pitch dos 1.778 clipes deu mediana **222 Hz**, nenhum abaixo de 120 Hz; os mais graves (139–150 Hz) são palavras curtas da Raquel. Portanto, a voz masculina vinha do **TTS do tablet**, não dos clipes.

Em [`audio.js`](app/js/audio.js):

- `isFemaleVoice()` rejeita nomes masculinos conhecidos (`Antônio`, `Daniel`, `Duarte`, `João`, `Thiago`, `Felipe`, `Ricardo`, `Bruno`, `Marcos`, `Paulo`, `Pedro`, `Rafael`, `Heitor`, `Fábio` etc.);
- `isEligibleVoice()` = brasileira **e** feminina;
- `pickVoice()`, `listVoices()`, laboratório e Pais só aceitam vozes elegíveis;
- `voiceURI` salvo masculino ou de Portugal é ignorado;
- se só houver voz masculina/pt-PT, `speak()` devolve `no-pt-br` em vez de usar voz errada; `speakSyllables()` não cai no TTS;
- a tela mostra “voz feminina pt-BR” e o diagnóstico informa `maleVoices`.

PT-PT continua **removido das opções e rejeitado**. A 8443 agora serve `v46`; o tablet precisa fechar/reabrir a PWA para sair da versão antiga.

## 3. Robustez do índice de áudio

`loadClipIndex()`/`loadOpusIndex()` agora usam `fetchAudioIndex()` com timeout de **2,2 s**. Se o índice atrasar (SW atualizando os 13 MB), o app não fica preso em `gabi-speaking`: libera o TTS de reserva e tenta o clipe de novo depois.

## 4. Deploy

- Servidor: `https://192.168.1.6:8443` · versão **v46** · `gabi-v46` · health `ok`
- 1.778 MP3 + 1.778 Opus publicados
- Para atualizar: fechar e abrir a PWA, ou abrir a URL e recarregar; o SW baixa os clipes novos.
- Conferir em **Pais → Ajustes → diagnóstico**: “Versão do app: v46”.

## Limitações

- A heurística de gênero depende do nome da voz. Uma voz masculina com nome genérico (ex.: só “Portuguese Brazil”) não é detectável; nesse caso, escolha uma voz feminina conhecida no laboratório.
- Se o tablet só tiver voz masculina/pt-PT, o app fica sem TTS dinâmico (mas os clipes neurais continuam); instale a voz feminina pt-BR.
- `gabiReply` dinâmico, LLM e OCR continuam em TTS feminino pt-BR.
- A validação de microfone continua simulada no emulador; falta o tablet físico.

## Evidências

- [17-enunciado-licao.png](../tests/stress-v46/17-enunciado-licao.png)
- [16-nome-gabi.png](../tests/stress-v46/16-nome-gabi.png)
- [16-nome-gabriela.png](../tests/stress-v46/16-nome-gabriela.png)
- [results.json](../tests/stress-v46/results.json)
