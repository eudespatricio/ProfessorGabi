# ðŸ¦‰ Gabi â€” ler e escrever no tablet

App de tutoria de **leitura e escrita em portuguÃªs** para crianÃ§a de 8 anos com dificuldade especÃ­fica. PWA **offline**, sem cadastro, sem anÃºncios e sem coleta de dados.

A Gabi Ã© uma coruja professora que **fala, escuta a crianÃ§a ler em voz alta, corrige com carinho e propÃµe o prÃ³ximo passo** â€” do som das letras a histÃ³rias completas. O diferencial Ã© a **leitura guiada sÃ­laba a sÃ­laba**: ela isola o pedacinho que travou, modela e pede para repetir.

![Tela inicial](tests/screenshots/02-home.png)

> **Estado atual (09/11/2026):** service worker `gabi-v46`, 14 unidades, 22 textos, 351 palavras, 1.778 clipes de Ã¡udio (55 MB em MP3, **13 MB em Opus**). O Ã¡udio Opus Ã© prÃ©-cacheado na instalaÃ§Ã£o e sobrevive a atualizaÃ§Ãµes. Cada liÃ§Ã£o termina com uma **revisÃ£o rÃ¡pida** de 2 itens.
> DocumentaÃ§Ã£o completa em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md), ideias em [`docs/BACKLOG.md`](docs/BACKLOG.md) e critÃ©rios de qualidade em [`docs/QUALIDADE.md`](docs/QUALIDADE.md).

---

## O que jÃ¡ estÃ¡ pronto

| Ãrea | O que faz |
| --- | --- |
| **Voz** | Clipes neurais ElevenLabs (pt-BR) + voz do tablet como reserva; velocidade e voz ajustÃ¡veis. |
| **Escuta** | Reconhecimento em pt-BR com retry real; destaca o que acertou e o que faltou. Nunca pune: â€œEu li / Eu repetiâ€ sempre disponÃ­vel. |
| **Trilha** | 14 unidades em escopo-sequÃªncia: sons e sÃ­labas â†’ P B M T D N â†’ F V L R S â†’ C G J X Z â†’ dÃ­grafos â†’ **M antes de P/B** â†’ encontros â†’ finais â†’ histÃ³rias. |
| **NÃ­veis** | 3 nÃ­veis por fase (assistido â†’ praticando â†’ sozinha) e **fase chefe** com 8 itens misturados. |
| **ExercÃ­cios** | 13 tipos: contar sÃ­labas, rima, som inicial, juntar, montar palavra, sÃ­laba que falta, ditado, M/N, leitura de palavra/frase/texto, compreensÃ£o. |
| **Modo livro** | Foto da pÃ¡gina â†’ OCR com correÃ§Ã£o de luz e dicionÃ¡rio â†’ conferÃªncia â†’ leitura palavra por palavra e por frase. |
| **Leitura guiada** | â€œMe ensinaâ€: sÃ­laba a sÃ­laba, com microfone e modo â€œeu repetiâ€. |
| **Jogos** | CaÃ§a-palavras 8Ã—8, baÃº do dia, adesivos, histÃ³rias. |
| **Conversa** | Tema surpresa em 3 cartinhas (flip 3D), humor, sÃ­labas, trava-lÃ­nguas (21 em 8 temas). |
| **MemÃ³ria** | RevisÃ£o espaÃ§ada de 1, 3, 7, 16 e 35 dias **e revisÃ£o rÃ¡pida ao fim de cada liÃ§Ã£o** (2 itens, priorizando o que a crianÃ§a errou). |
| **Pais** | Progresso por habilidade, minutos, palavras difÃ­ceis, ajustes, PIN, backup/restauraÃ§Ã£o e â€œbaixar todo o Ã¡udioâ€. |
| **Offline** | Depois de instalado, funciona sem internet; sÃ³ a escuta e o OCR usam rede. |

![Aula](tests/screenshots/04-exercicio.png)
![Modo livro](tests/screenshots/emu-43.png)
![Conversa](tests/screenshots/08-conversa.png)

---

## Colocar no tablet

Guia completo em [`docs/INSTALAR-NO-TABLET.md`](docs/INSTALAR-NO-TABLET.md).

1. **Link fixo (recomendado):** arraste a pasta `app/` em `app.netlify.com/drop` e abra no Chrome do tablet. HTTPS de verdade, instala como app e o microfone funciona.
2. **TÃºnel rÃ¡pido:** `start-tunnel.ps1` gera um link `https://â€¦.trycloudflare.com` (o PC precisa estar ligado).
3. **Rede Wi-Fi:** `start.cmd` e abra `http://SEU-IP:8080` â€” tudo menos a escuta.

No Chrome: â‹® â†’ **Instalar app**.

---

## Rodar e testar

```powershell
node server/serve.mjs                 # http://localhost:8080
node server/serve.mjs 8443 --https    # microfone + instalaÃ§Ã£o PWA

npm test                              # 69 testes (lÃ³gica, store, OCR, Ã¡udio, encoding, leitura, revisÃ£o, conversa, vozes)
node tests/smoke.mjs                  # fluxo real no Chrome + prints
node tests/story-shot.mjs             # dock do microfone na histÃ³ria em 5 viewports
node tests/reading-sim.mjs            # validaÃ§Ã£o da leitura com escuta simulada
node tests/stress-emu.mjs             # stress test no Chrome do emulador (ver docs/STRESS-V46.md)
node tests/lesson-shots.mjs           # lacuna da sÃ­laba + pecinhas repetidas
node tools/check-modules.mjs          # valida todos os mÃ³dulos
node tools/test-talk.mjs              # cartinhas de tema e respostas
powershell -ExecutionPolicy Bypass -File tools\android-emulator.ps1   # emulador
```

Requisitos: Node.js 20+ apenas para servir/testar. O app nÃ£o tem dependÃªncias.

---

## DocumentaÃ§Ã£o

| Documento | ConteÃºdo |
| --- | --- |
| [`ESTADO.md`](ESTADO.md) | estado atual, mÃ©tricas canÃ´nicas e comandos de validaÃ§Ã£o (`< 80L`) |
| [`MAPA.md`](MAPA.md) | mapa de mÃ³dulos (`1 linha/mÃ³dulo`) e armadilhas conhecidas (`< 60L`) |
| [`REJEITADOS.md`](REJEITADOS.md) | decisÃµes e tecnologias descartadas com condiÃ§Ã£o de reabertura (`< 40L`) |
| [`ARQUITETURA.md`](docs/ARQUITETURA.md) | camadas, rotas, estruturas de dados, estado, offline, servidor, dÃ­vidas tÃ©cnicas |
| [`DESENVOLVIMENTO.md`](docs/DESENVOLVIMENTO.md) | ambiente, testes, convenÃ§Ãµes, checklist de entrega |
| [`BACKLOG.md`](docs/BACKLOG.md) | tudo o que estÃ¡ em pipe, com prioridade |
| [`QUALIDADE.md`](docs/QUALIDADE.md) | responsividade, animaÃ§Ãµes, critÃ©rios de aceite |
| [`STRESS-V38.md`](docs/STRESS-V38.md) | stress test v38: 9 falhas e evidÃªncias |
| [`STRESS-V41.md`](docs/STRESS-V41.md) | stress test v41: 9 correÃ§Ãµes e confirmaÃ§Ã£o (53/53) |
| [`STRESS-V42.md`](docs/STRESS-V42.md) | stress test v42: voz do resultado do caÃ§a-palavras (58/58) |
| [`STRESS-V44.md`](docs/STRESS-V44.md) | v44: filtro pt-BR, 662 clipes novos e stress |
| [`STRESS-V46.md`](docs/STRESS-V46.md) | v46: enunciados completos, voz feminina e timeout de Ã¡udio |
| [`CONTEUDO.md`](docs/CONTEUDO.md) | currÃ­culo (14 unidades, 351 palavras, 22 histÃ³rias) |
| [`AUDIO.md`](docs/AUDIO.md) | pipeline ElevenLabs (1.116 Opus/MP3) e manifesto |
| [`AVALIACAO-KOKORO.md`](docs/AVALIACAO-KOKORO.md) | Kokoro local: o que acerta, o que erra e quando usar |
| [`AVALIACAO-PIPER.md`](docs/AVALIACAO-PIPER.md) | Piper local: rÃ¡pido e leve, mas sem voz feminina pt-BR |
| [`OCR.md`](docs/OCR.md) | como o Modo livro lÃª a pÃ¡gina |
| [`EMULADOR.md`](docs/EMULADOR.md) | testar no Android sem tablet |
| [`PESQUISA-PEDAGOGICA.md`](docs/PESQUISA-PEDAGOGICA.md) | ~25 fontes e decisÃµes pedagÃ³gicas |
| [`PESQUISA-TECNICA.md`](docs/PESQUISA-TECNICA.md) | voz, ASR, PWA, offline |
| [`VIABILIDADE-LOJAS.md`](docs/VIABILIDADE-LOJAS.md) | Play, App Store, Microsoft e monetizaÃ§Ã£o |
| [`INSTALAR-NO-TABLET.md`](docs/INSTALAR-NO-TABLET.md) | passo a passo no tablet |
| [`GUIA-DA-FAMILIA.md`](docs/GUIA-DA-FAMILIA.md) | como usar no dia a dia |

---

## Estrutura

```
app/                  PWA estÃ¡tica (sem build)
  index.html
  manifest.webmanifest
  sw.js               service worker (gabi-v46)
  css/                app.css (base/componentes) + game.css (jogo)
  js/                 25 mÃ³dulos ES (telas, domÃ­nio, infraestrutura)
  audio/              1.116 clipes + index.json + opus/ (index-opus.json)
  fonts/ icons/
server/serve.mjs      servidor local (HTTP/HTTPS), sem dependÃªncias
tests/                testes de lÃ³gica, smoke e prints
tools/                emulador Android, OCR, Ã¡udio, corretor, build de listas
docs/                 documentaÃ§Ã£o
```

---

## Limites (importante)

- **NÃ£o diagnostica.** Se em 4â€“6 semanas o progresso nÃ£o andar, procure a escola e avaliaÃ§Ã£o fonoaudiolÃ³gica.
- **ASR erra com voz infantil.** A avaliaÃ§Ã£o Ã© tolerante e sempre oferece alternativa manual.
- **Durante a escuta**, o Ã¡udio vai para o serviÃ§o de fala do Google. Nome e progresso ficam sÃ³ no tablet.
- **NÃ£o substitui** professora, fonoaudiÃ³loga ou neuropediatra.

## PrÃ³ximos passos

Ver [`ESTADO.md`](ESTADO.md) e [`BACKLOG.md`](docs/BACKLOG.md). Prioridades atuais: validar no tablet fÃ­sico (microfone sem headset e cache Opus 1.116/1.116), palavras cruzadas (3 formatos), monstrinho e publicaÃ§Ã£o nas lojas (TWA Play Store / MSIX).
