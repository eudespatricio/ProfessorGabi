# Áudio: por que soa robótico e quais opções temos

## Estado atual (v47)

- **1.778 clipes** ElevenLabs (voz Raquel pt-BR): palavras, sílabas (inclusive vogais), frases, linhas de história, instruções e definições — **0 palavra ou sílaba sem áudio**.
- **MP3: 55 MB** (fallback/compatibilidade) e **Opus mono 24 kbps: 13 MB**.
- `playClip()` prefere Opus (`audio/ogg; codecs="opus"`) e cai para MP3; “Baixar todo o áudio” usa o índice Opus quando o aparelho suporta.
- **Pré-cache automático (v33):** na instalação o service worker baixa `index.json`, `index-opus.json` e os 1.778 clipes Opus (13 MB) para o cache `gabi-audio-v1`, que **sobrevive a upgrades** e migra o áudio do cache antigo. Antes, o tablet só guardava o clipe que tocasse online e podia cair no Google TTS.
- **Diagnóstico:** `window.__gabi.audio()` (console/`chrome://inspect`) e o cartão “Diagnóstico do tablet” em `Pais → Dados` mostram quantos clipes estão em cache e quantos tocaram por Opus, MP3 ou TTS.
- Fluxo de geração: `tools/render-audio.mjs` → `tools/make-opus.sh` (WSL) → `tools/build-opus-index.mjs`.
- Verificação: `node tools/check-opus.mjs` (7 checagens), `node tests/audio.test.mjs` (índice completo + arquivos Ogg) e `node tools/check-lazy.mjs`.
- **Alternativas locais avaliadas (06/11/2026):** `docs/AVALIACAO-KOKORO.md` e `docs/AVALIACAO-PIPER.md`. Resumo: Kokoro acerta frases e erra palavras isoladas; Piper é leve/rápido, mas não tem voz feminina pt-BR e o engine 1.8.0 é GPL-3.0. Nenhum dos dois substitui os clipes ElevenLabs do núcleo por enquanto.

## Correção v47 de clipes fora do padrão

- 28 clipes antigos com pitch muito baixo (139–159 Hz) foram regravados com a Raquel; o mais audível era **“Muito bem”**, que estava em 144 Hz e agora está em **250 Hz**.
- Custo: **130 créditos**. O total continua **1.778 clipes**; os 1.116 originais foram preservados, exceto esses 28 substituídos.
- O `muito bem` antigo (05/11) era um outlier; a auditoria de pitch encontrou o grupo e a voz masculina deixou de existir nos clipes.

## Delta v43 e sotaque

- O acervo original de **1.116** clipes foi mantido; entraram **662** clipes novos, gerados só para o que faltava: cartões de ensino, comandos de exercício, nomes **Gabi/Gabriela**, conversa e frases de interface.
- Custo do delta: **28.065 créditos** ElevenLabs (1 crédito/caractere no `eleven_multilingual_v2`), dentro dos 30k disponibilizados.
- Vozes `pt_PT`/Portugal e vozes masculinas são **rejeitadas** por `pickVoice()` e removidas do laboratório/ajustes; só vozes femininas `pt-BR` entram na síntese dinâmica. Ver `docs/STRESS-V47.md`.

## Diagnóstico (medido neste computador)

O app usa a voz que o navegador oferece (`speechSynthesis`). O que cada navegador entrega:

| Navegador / sistema | Vozes pt-BR encontradas | Qualidade |
| --- | --- | --- |
| **Chrome no Windows** | Microsoft Daniel, Microsoft Maria (SAPI, locais) e “Google português do Brasil” (online) | Fraca a mediana — Daniel/Maria são sintetizadores antigos |
| **Edge no Windows** | **Francisca, Antônio, Thalita (Natural, online)** + Daniel/Maria | **Boa** — são as vozes neurais do Azure, liberadas de graça pelo Edge |
| **Chrome no Android** | Google TTS pt-BR (do sistema) | Mediana — melhor que o SAPI do Windows, pior que neural |

Ou seja: parte do problema é **de onde a voz vem**, não do app. Por isso o app agora prefere vozes “Natural/Online” e ganhou um laboratório para você comparar.

## Opções reais (com esforço e custo)

| Opção | Como funciona | Qualidade pt-BR | Offline | Custo | Esforço |
| --- | --- | --- | --- | --- | --- |
| **A. Voz do navegador** | `speechSynthesis` (atual) | baixa–boa, depende do aparelho | sim | grátis | feito |
| **B. Edge / Azure neural no navegador** | Edge expõe Francisca/Thalita/Antônio via Web Speech | alta | não | grátis | usar Edge (feito no app) |
| **C. Azure TTS (API)** | clipes gerados ou sob demanda | alta | se pré-gerado | ~0,5M caracteres/mês grátis; depois ~US$15/1M | 1 dia |
| **D. Google Cloud TTS** | WaveNet/Neural2/Chirp3 em pt-BR | alta | se pré-gerado | faixa grátis mensal; depois por caractere | 1 dia |
| **E. ElevenLabs** | vozes neurais premium, multilíngue | **muito alta** | se pré-gerado | plano pago (a partir de ~US$5/mês) | 1 dia |
| **F. OpenAI TTS** | `gpt-4o-mini-tts`/`tts-1` | alta (sotaque bom, não nativo perfeito) | não | ~US$15/1M caracteres | 1 dia |
| **G. Kokoro (offline, open source)** | modelo 82M no navegador (ONNX/WebGPU), vozes pt-BR | boa | **sim** | grátis (Apache 2.0) | 3–5 dias |
| **H. Piper (offline)** | vozes pt-BR locais (ex.: `pt_BR-faber-medium`) | média | **sim** | grátis | 1–2 dias |
| **I. Locução humana** | gravar uma professora/atriz | **máxima** | sim | cachê + estúdio | 1–2 semanas |
| **J. Pacote pré-renderizado** | gerar uma vez o áudio de todo o conteúdo fixo e embarcar no app | alta (a voz que você escolher) | **sim** | custo único (ou grátis no Azure) | 1 dia |

Referências: [vozes neurais pt-BR no Azure](https://news.microsoft.com/pt-br/portugues-do-brasil-e-adicionado-aos-servicos-cognitivos-do-azure-para-texto-e-fala-neural/), [Kokoro pt-BR](https://huggingface.co/cristianoaredes/kokoro-pt-br), [Piper pt-BR](https://huggingface.co/Lucasllfs/Razo-piper-voice), [comparativo de vozes em português](https://json2video.com/ai-voices/languages/portuguese/?use=Conversational), [estudo de clonagem de voz pt-BR](https://sol.sbc.org.br/index.php/stil/article/download/44625/44388/). Preços mudam; confirme antes de contratar.

## Recomendação em 3 passos

**Passo 1 — hoje, custo zero.** Use o **Edge** no computador/tablet e escolha “Microsoft Francisca Online (Natural)” no laboratório de voz (`Pais → Ajustes → 🎧 Comparar todas as vozes` ou `#/vozes`). Isso já muda de patamar sem contratar nada.

**Passo 2 — o conserto definitivo: pacote de áudio pré-renderizado.** ✅ Feito: 1.778 clipes com voz neural ElevenLabs, em MP3 e Opus (13 MB), embarcados no app e cacheados pelo Service Worker.

- qualidade constante e natural, igual em qualquer aparelho;
- **offline de verdade** (hoje a voz natural depende de internet);
- resposta instantânea, sem espera de síntese;
- ~68 MB em Opus/MP3, cacheado pelo Service Worker;
- sobra para o texto dinâmico (nome da criança, respostas da IA) a voz do sistema.

O app procura primeiro o clipe pré-renderizado pelo texto normalizado (`Opus → MP3`) e só cai no TTS do sistema para falas dinâmicas (nome da criança ou textos novos do OCR).

**Passo 3 — se um dia quiser TTS generativo local para texto dinâmico.** Avaliamos **Kokoro** (`docs/AVALIACAO-KOKORO.md`) e **Piper** (`docs/AVALIACAO-PIPER.md`): ambos foram descartados para palavras isoladas (ver `REJEITADOS.md`).

## Cuidados

- **Não avaliar pronúncia** pelo áudio: o reconhecimento devolve texto, não fonemas.
- Voz muito lenta artificializa o som — prefira voz natural em velocidade normal com pausas entre frases (o app já pausa).
- Se um dia usar voz clonada de alguém, é preciso consentimento escrito (e cuidado com voz de criança).
- O áudio do microfone continua indo para o serviço de fala do navegador; os clipes são gerados uma vez, não envolvem a voz da criança.
