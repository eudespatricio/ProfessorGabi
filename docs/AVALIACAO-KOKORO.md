# Avaliação do Kokoro para o áudio do Gabi

**Data:** 06/11/2026
**Pergunta:** com o Kokoro rodando no WSL, dá para gravar todo o conteúdo e parar de depender do TTS?

## Resposta curta

**Dá para gerar sem limite de caracteres, mas ainda não dá para substituir o banco principal do Gabi.** O Kokoro local é rápido e grátis, e acerta **frases com contexto**. Nos **testes de palavras isoladas**, porém, errou 8 de 20 palavras com a melhor voz feminina (`pf_dora`) — e palavras isoladas são o coração das lições (1.116 clipes atuais). A recomendação é **manter os clipes ElevenLabs** e, se quisermos avançar, usar o Kokoro só para **frases/instruções** com controle de qualidade, ou testar um modelo pt-BR nativo (Piper) antes de trocar a voz.

## O que está instalado no WSL

| Item | Valor |
|---|---|
| Modelo | `/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/kokoro-v1.0.onnx` (325,5 MB) |
| Vozes | `voices-v1.0.bin` (28,2 MB), 54 vozes; em português: **`pf_dora`** (fem.), `pm_alex`, `pm_santa` |
| Runtime | `kokoro-onnx` 0.6.1 no venv `dark_studio_platform/.venv` (CPU) |
| Saída | 24 kHz, `create(text, voice, speed, lang='pt-br')` |
| Desempenho medido | **0,64–1,09 s** por frase curta nesta máquina |
| Licença | Modelo **Apache-2.0** ([model card](https://huggingface.co/hexgrad/Kokoro-82M)); conferir os termos das vozes antes de uso comercial |

O pipeline atual usa o **espeak-ng** do `kokoro-onnx` para fonemas. A pronúncia de algumas palavras portuguesas sai errada nesse caminho; o Kokoro oficial usa o G2P `misaki`, que pode se comportar diferente — é o primeiro teste a fazer se a qualidade parecer promissora.

## Como foi avaliado

1. Gerei frases e palavras com `pf_dora`, `pm_santa` e `pm_alex` em `tests/audio-samples/`.
2. Transcrevi os WAVs com o **Whisper small local** (pt) — não é um juiz perfeito, mas pega pronúncias claramente erradas.
3. Comparei, nas mesmas palavras, com os clipes ElevenLabs já existentes.

Tudo reproduzível com `tools/kokoro-sample.py`, `tools/kokoro-compare.py`, `tools/kokoro-words.py` e `tools/kokoro-voices.py` (rodar no venv do dark_studio).

## Resultados

### Frases (contexto ajuda)

| Texto | `pf_dora` | `pm_santa` |
|---|---|---|
| “Oi! Eu sou a Gabi. Vamos ler juntos?” | ✅ correto | ❌ “Oi, eu sou HB…” |
| “Bom dia, Ana! Que tal descobrir uma palavra nova hoje?” | ✅ correto | ✅ correto |
| “Muito bem! Você leu 100% das palavras certinho.” | ✅ correto | ✅ correto |
| “Qual sílaba está faltando na palavra bolo?” | ✅ correto | ✅ correto |

`pf_dora` é a única voz feminina e a mais consistente nas frases. `pm_santa` tropeçou no nome “Gabi” — não serve para a professora.

### Palavras isoladas (`pf_dora`) — o teste que decide

| Corretas (11/20) | Erradas ou duvidosas (9/20) |
|---|---|
| abacaxi, bicicleta, bolo, casa, chuva, coração, girafa, livro, paralelepípedo, queijo, vaca | bola→“Bale”, carro→“Scarwood”, fada→“Fade”, luva→“Lua”, mala→“Mali”, milho→“Melhor”, pato→“Paz”, sapo→“Sábado”, gato→“GATZU” |

“Gato” pode ser apenas o “gatu” natural do pt-BR transcrito de forma estranha, mas os outros erros são graves para uma criança que está aprendendo a ler: **“carro” virou “Scarwood”**.

### ElevenLabs × Kokoro (mesmas palavras)

| Palavra | ElevenLabs | Kokoro `pf_dora` |
|---|---|---|
| gato | “GATO!” | “GATZU” |
| muito bem | “Muito bem.” | “Muito bem!” |
| vamos ler juntos | “Vamos ler juntos.” | “Vamos ler juntos.” |

Arquivos para ouvir: `tests/audio-samples/compare/`.

## Prós e contras

**Prós**
- Local, sem limite de caracteres e sem custo por uso.
- Rápido (~1 s por frase) e 24 kHz.
- Modelo Apache-2.0, treinado com áudio permissivo segundo o model card.
- Ótimo para **rascunhar** frases e para conteúdo que ainda não tem clipe.

**Contras**
- Pronúncia pt-BR irregular, principalmente em **palavras e sílabas isoladas**.
- Voz diferente da Raquel (ElevenLabs); misturar as duas fica perceptível.
- Modelo de 325 MB: serve para **gerar no build**, não para rodar dentro do PWA.
- Não resolve texto arbitrário: **Modo livro (OCR)**, conversa livre com IA e o **nome da criança** continuam sendo texto aberto.
- Licença das vozes e uso comercial precisam ser confirmados antes de publicar.

## O que isso significa para “sem depender de TTS”

Dá para zerar o TTS **apenas** para o conteúdo fixo e desde que a qualidade seja aceita. Hoje:

| Conteúdo | Dá para pré-gravar? | Observação |
|---|---|---|
| 1.116 palavras/sílabas/frases atuais | Já estão em ElevenLabs | **Não trocar por Kokoro** com a qualidade medida |
| Instruções, elogios, resumos fixos | Sim, em tese | Precisam de QA; Kokoro erra algumas frases |
| Saudação com o nome | Só se o nome for conhecido no build | Nome é digitado no onboarding |
| Números de acertos/tempo | Sim, enumerando combos | Muitos arquivos; melhor manter TTS ou montar por concatenação |
| Modo livro (OCR) | **Não** | Texto vem da foto, é arbitrário |
| Conversa livre com IA | **Não** | Texto vem do modelo |
| Nome da criança | Não, sem gravar no onboarding | Alternativa: gravar o nome no build para esta família |

Se o objetivo for **100% sem TTS**, o caminho não é “Kokoro em tudo”: é **restringir o escopo** (conversa por roteiro, livro com palavras do banco) ou aceitar um modelo local de TTS no tablet — o que hoje significaria embarcar um modelo bem maior que o PWA inteiro.

## Recomendação

1. **Manter os 1.116 clipes ElevenLabs** para palavras, sílabas e frases.
2. **Não gerar o banco inteiro com Kokoro agora.** O risco pedagógico (palavra errada na tela de leitura) é maior que o ganho.
3. Se quiser usar Kokoro, começar por um **piloto de 30 frases** (instruções, elogios, resumos) com `pf_dora`; validar com Whisper + ouvido humano; só então criar `audio/index-kokoro.json` e pré-cachear.
4. Testar **Piper pt-BR** (`pt_BR-faber-medium`) no mesmo piloto: é menor, feito para português e provavelmente acerta melhor palavras isoladas; se acertar, ele é candidato mais natural para “sem TTS”.
5. Antes de publicar/monetizar, revisar a licença das vozes Kokoro e do modelo Piper; o código Apache-2.0 não garante automaticamente o uso comercial de todas as vozes.

## Se o piloto for aprovado (arquitetura)

- Manifesto `content/speech.json` com `id`, `texto`, `voz`, `velocidade`, `arquivo`.
- `tools/render-kokoro.py` gera WAV → Opus 24 kbps e atualiza `app/audio/index-kokoro.json`.
- `audio.js` tenta ElevenLabs → Kokoro → TTS; `clipStats` registra `kokoroOk` / `kokoroFail`.
- `sw.js` pré-cacheia o índice e os clipes Kokoro em `gabi-audio-v1`.
- QA automático: Whisper transcreve, compara com o texto e **rejeita** o clipe se a distância passar do limite; humano confirma 10%.
- Só depois de aprovar o piloto se decide se vale substituir os clipes existentes.

## Arquivos de evidência

- `tests/audio-samples/pf_dora-*.mp3` / `.opus` / `.wav` — frases.
- `tests/audio-samples/compare/` — ElevenLabs × Kokoro nas mesmas palavras.
- `tests/audio-samples/words/` — 20 palavras isoladas com Kokoro.
- `tests/audio-samples/voices/` — comparação das três vozes pt.
- `tools/kokoro-*.py` — scripts usados (caminhos do modelo no WSL).
