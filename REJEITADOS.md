# REJEITADOS — Professor Gabi
> Teto rígido: `< 40 linhas`. Impede que agentes ou humanos proponham novamente ideias já avaliadas e descartadas.

| Rejeitado | Quando | Por quê | Reabre se |
| --- | --- | --- | --- |
| **Kokoro TTS (`82M` ONNX) para palavras/sílabas isoladas** | 2026-11 (`v35`) | Errou 8/20 palavras isoladas (`pf_dora` fala letras em inglês ou troca fonemas curtos) e pesa ~80–300 MB (`docs/AVALIACAO-KOKORO.md`). | Sair checkpoint pt-BR focado em palavras curtas isoladas sem alucinar inglês. |
| **Piper TTS local (`pt_BR-faber-medium` / `jeff` / `cadu`)** | 2026-11 (`v35`) | Zero vozes femininas pt-BR (F0 112–152 Hz incompatível com a coruja Gabi), pronúncia ruim em palavras isoladas e `piper-tts 1.4.2` é **GPL-3.0** (`docs/AVALIACAO-PIPER.md`). | Lançarem modelo feminino pt-BR natural sob licença MIT/Apache-2.0. |
| **Jogos punitivos ("Forca" tradicional / perder vidas)** | 2026-11 (`v20`) | Gera frustração e bloqueio em criança de 8 anos com dificuldade de leitura. Toda atividade deve ensinar no erro e oferecer saída manual (`"Eu li"`). | Nunca (princípio pedagógico inegociável do projeto). |
| **Dicionário completo offline (50k–100k verbetes)** | 2026-11 (`v22`) | Adiciona 20–100 MB de payload inútil para vocabulário infantil; o glossário curado (351/351) + corretor de frequência (12k, 94 KB lazy) resolvem 100% do uso. | Apenas se houver backend online sob demanda fora do pacote PWA. |
| **Bundler / Framework no Frontend (Vite, React, Webpack)** | 2026-11 (`v1`) | Adiciona complexidade de build e dependências NPM desnecessárias; ES Modules nativos + `el()` entregam 25 módulos em ~421 KB com zero build step. | O app ultrapassar ~10.000 linhas de JS no cliente. |
| **Estratégia Cache-First sem pré-cache de áudio no SW** | 2026-11 (`v33`) | Fazia o tablet cair no Google TTS robótico quando abria offline palavras ainda não tocadas; resolvido com pré-cache integral dos 1.116 Opus (`4,1 MB`) em `gabi-audio-v1`. | O pacote de áudio Opus ultrapassar 25 MB (exigindo pré-cache por unidade). |
| **Memória passiva longa (`HANDOVER.md` / múltiplos relatórios)** | 2026-11 (`v35`) | Gerava 7 documentos contraditórios (`v10` vs `v31` vs `v35`) e inflava o contexto do agente; substituído por `tests/test_invariants.py` + trio residente `< 150 linhas`. | Nunca (regra global de governança de contexto). |
