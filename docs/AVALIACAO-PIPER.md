# Avaliação do Piper para o áudio do Gabi

**Data:** 06/11/2026
**Pergunta:** o Piper seria uma alternativa melhor que o Kokoro para gravar o conteúdo e sair do TTS?

## Resposta curta

**Não para o Gabi como ele é hoje.** O Piper é excelente em tamanho e velocidade — modelo de **61 MB**, frases em **0,02–0,2 s** —, mas a lista oficial de vozes portuguesas tem **quatro vozes pt-BR e uma pt-PT, todas com pitch na faixa masculina** (112–152 Hz). A Gabi é uma professora mulher; não existe voz feminina pt-BR no catálogo. Além disso, nos testes de **palavras isoladas** a pronúncia foi pior que a do Kokoro: “gato” virou “Tchau”/“Grato”, “carro” virou “Tchau”/“Calv”, “sapo” virou “Tchau tchau”. Para uma criança aprendendo a ler, isso não serve.

**Veredito:** manter os clipes ElevenLabs; o Piper não é uma boa alternativa para o banco principal. Ele só faria sentido se o produto mudasse para uma voz masculina e aceitasse qualidade média — ou se treinássemos uma voz feminina pt-BR própria.

## O que foi testado

| Item | Valor |
|---|---|
| Pacote | `piper-tts` **1.8.0** em `/home/eudespatricio/.venvs/piper` |
| Vozes pt-BR | `pt_BR-cadu-medium`, `pt_BR-jeff-medium`, `pt_BR-faber-medium`, `pt_BR-edresson-low` (+ `pt_PT-tugão-medium`) |
| Modelo | ~**61 MB** cada (ONNX), config ao lado |
| Sample rate | 22.050 Hz (medium) / 16.000 Hz (low) |
| Velocidade medida | **0,02–0,20 s** por frase curta, com o modelo já carregado |
| Licença | `piper-tts` 1.8.0 (OHF-Voice/piper1-gpl) é **GPL-3.0-or-later**; modelos: datasets CC0 (`cadu`, `jeff`, `faber`) e CC BY 4.0 (`edresson`). A versão antiga `rhasspy/piper` era MIT |

### Pitch medido (mediana de F0)

| Voz | F0 mediana | Leitura |
|---|---|---|
| `pf_dora` (Kokoro, referência feminina) | **180,5 Hz** | feminina |
| `faber` (Piper) | 146,5 Hz | masculina/grave |
| `cadu` (Piper) | 112,2 Hz | masculina |
| `jeff` (Piper) | 152,1 Hz | masculina |
| `edresson` (Piper) | 130,1 Hz | masculina |
| `pm_santa` (Kokoro, referência masculina) | 147,2 Hz | masculina |

Os quatro nomes/cartões do catálogo não indicam uma voz feminina; a medição confirma a faixa masculina.

### Frases (transcrição pelo Whisper small pt, como triagem)

| Texto | `cadu` | `faber` |
|---|---|---|
| “Oi! Eu sou a Gabi. Vamos ler juntos?” | “Pai, eu sou a Gaby. Vamos ler juntos.” | “Vou em, eu sou HB…” |
| “Bom dia, Ana! Que tal descobrir uma palavra nova hoje?” | ✅ correto | “Bom dia, Tana…” |
| “Qual sílaba está faltando na palavra bolo?” | ✅ correto | ✅ correto |
| “Muito bem! Você leu 100%…” | — | “Muito bem, você leu 100% das palavras setinho.” |

`cadu` é o melhor dos quatro, mas ainda troca “Oi” por “Pai” e “Gabi” por “Gaby”. `jeff` e `edresson` foram piores (“E aí, eu sou o Dabir”; “Vata!”, “Cá.”).

### Palavras isoladas (o teste decisivo)

| Palavra | `cadu` | `faber` |
|---|---|---|
| gato | “Grato!” | “Tchau.” |
| carro | “Calv.” | “Tchau.” |
| sapo | “Sapo.” | “Tchau tchau.” |
| bola | — | “Tô!” |
| milho | — | “Yeah.” |

O Whisper é só uma triagem — mas erros grosseiros como “gato → Tchau” e “carro → Calv” indicam pronúncia errada, não apenas transcrição ruim. Para ouvir: `tests/audio-samples/piper/` e `tests/audio-samples/piper-voices/`.

## Prós e contras

**Prós**
- Muito leve (61 MB) e **muito rápido**; dá para gerar o banco inteiro em minutos.
- Roda 100% offline no WSL, sem limite de caracteres e sem custo.
- Instalação simples (`piper-tts`), CLI e API Python.
- Modelos com datasets CC0/CC BY (atribuição no `edresson`).

**Contras**
- **Não há voz feminina pt-BR** no catálogo oficial.
- Qualidade baixa/média e pronúncia instável em palavras isoladas.
- Vozes treinadas a partir de vozes inglesas (lessac/Ryan), com prosódia e sotaque que não soam naturais em pt-BR.
- 61 MB por voz: serve para geração no build, não para rodar dentro do PWA.
- **Licença GPL-3.0** no `piper-tts` 1.8.0: usar como ferramenta de build é uma coisa; distribuir o engine junto com o app é outra e pode contaminar o produto. Precisa de avaliação jurídica antes de publicar.
- Texto arbitrário (OCR, conversa com IA, nome da criança) continua sem solução.

## Comparação rápida

| Critério | ElevenLabs (atual) | Kokoro `pf_dora` | Piper `cadu` |
|---|---|---|---|
| Voz feminina pt-BR | **sim** (Raquel) | sim | **não** |
| Palavras isoladas | **boas** | ruins (8/20) | ruins (piores) |
| Frases | **muito boas** | boas | médias |
| Custo por uso | pago | zero | zero |
| Velocidade de geração | API | ~1 s/frase | **~0,05 s/frase** |
| Tamanho do modelo | nuvem | 325 MB | **61 MB** |
| Licença | comercial | Apache 2.0 | **GPL-3.0** (engine) + datasets CC0/CC BY |

## Recomendação

1. **Não trocar** os 1.116 clipes ElevenLabs por Piper.
2. **Não distribuir o `piper-tts` GPL-3.0** dentro do PWA; se usar, que seja só como ferramenta de geração no build, com orientação jurídica.
3. **Não usar Piper para o banco principal** enquanto não houver uma voz feminina pt-BR com qualidade verificada.
3. Se a prioridade for voz local e feminina, os caminhos realistas são:
   - **treinar/fine-tunar um Piper** com dataset feminino pt-BR licenciado (semanas, precisa de dataset e validação);
   - **XTTS v2** (clone de voz feminina, alta qualidade), mas licença **não comercial** e mais pesado;
   - **Kokoro `pf_dora`** apenas para frases (não para palavras isoladas);
   - **manter ElevenLabs** para o núcleo e TTS do sistema para texto dinâmico — que é o estado atual.
4. Se o produto puder ter uma **professora masculina**, o `cadu` é o único Piper que chega perto em frases; ainda assim, as palavras isoladas precisariam de QA e provavelmente falhariam.

## Evidências

- `tests/audio-samples/piper/` — frases e palavras com `faber`.
- `tests/audio-samples/piper-voices/` — `cadu`, `jeff`, `edresson` nas mesmas frases.
- `tools/piper-sample.py`, `tools/piper-voices.py`, `tools/pitch-check.py` — reprodutíveis no venv do Piper.
- Modelos em `/home/eudespatricio/piper-voices/` (fora do repositório).
