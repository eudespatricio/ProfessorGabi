# Viabilidade nas lojas e monetização

Atualizado em **novembro de 2026**. O app já funciona como PWA offline com voz neural, leitura guiada, glossário e jogos. Este documento é o mapa de decisão para publicar e cobrar — não é para executar agora.

> Taxas e regras mudaram bastante em 2026 (Epic × Google, acordo Apple × CADE). Os números abaixo foram conferidos nas fontes do fim do documento, mas **confirme no console de cada loja antes de precificar**.

## Resumo executivo

| Loja | Caminho recomendado | Custo | Prazo realista | Taxa efetiva para nós | Risco |
| --- | --- | --- | --- | --- | --- |
| **Google Play** | PWA publicada + **TWA** (Bubblewrap) | US$ 25 único | 2–4 semanas (inclui teste fechado) | **15%** hoje; novo modelo (~10–20%) só em **set/2027** | baixo |
| **Microsoft Store** | PWA + **PWABuilder/MSIX** | **grátis** (conta individual) | 1–2 semanas | **0%** com comércio próprio; 15% pelo comércio da Microsoft | baixo |
| **Apple App Store** | **Capacitor/WKWebView** com plugins nativos de voz | US$ 99/ano | 4–8 semanas | **15%** (10% + 5% do IAP) no Small Business Program | **alto** (regra 4.2 e categoria infantil) |

Recomendação de sequência: **Google Play primeiro** (TWA), **Microsoft em paralelo** (grátis), **iOS depois** de uma versão Capacitor com fala nativa.

## O que mudou nas regras em 2026

### Google Play

- **Hoje, no Brasil:** 15% sobre os primeiros US$ 1 milhão por ano (30% acima disso) e **15% em assinaturas**.
- **Modelo novo** (anunciado em março, cobrança externa liberada em junho): taxa de serviço separada da taxa de faturamento, **10% a 20%** conforme o caso, **assinaturas a 10%**, mais **5%** se o desenvolvedor usar o faturamento do próprio Google. Cobrança por site externo passa a ser permitida.
- **No Brasil, só a partir de 30/09/2027.** Até lá, vale a tabela antiga. Não faça o plano de preço depender da taxa nova.
- Continua valendo: conta pessoal nova costuma exigir **teste fechado com 12 testadores por 14 dias** antes da produção (confirmar regra vigente na hora), política de privacidade, Data safety e classificação IARC.

### Apple (mudança grande, e boa para nós)

Desde **18/06/2026** (iOS 26.5), depois do acordo com o **CADE**, a App Store brasileira aceita lojas e pagamentos alternativos. A tabela de comissões no Brasil ficou:

| Situação | Comissão |
| --- | --- |
| Venda de bem/serviço digital no app, tabela padrão | **21%** |
| Mesma venda para quem está nos programas da Apple (Small Business) | **10%** |
| Usando o pagamento da Apple (IAP) | **+5%** → 15% no Small Business |
| Compra feita em site a partir de link dentro do app | 15% (ou 10%) |
| App distribuído **fora** da App Store | **5%** |

Duas restrições decisivas para um app infantil:

1. **Categoria Crianças não pode ter link para site de transação.** Ou seja: para esse público, o caminho é IAP mesmo (15% no nosso caso).
2. **Menores de 18 anos:** qualquer pagamento alternativo exige controle parental com autorização de um adulto antes da compra.

### Microsoft Store

- Conta individual **gratuita**.
- **Apps que não são jogos podem usar comércio próprio e ficar com 100%** da receita. Pelo comércio da Microsoft, a taxa é **15%** (apps) e 12% (jogos).
- Certificação em até 3 dias úteis; sem exigência de testadores.
- Limitação técnica: o WebView2 **não** reconhece fala. A leitura em voz alta fica no modo “Eu li” até existir plugin nativo.

## Mercado brasileiro: com quem se parece

Não existe um concorrente direto com a nossa proposta (tutor que **ouve** a criança ler, em português, offline). O que existe:

| Produto | Proposta | Modelo | Preço observado |
| --- | --- | --- | --- |
| **PlayKids** (Leiturinha/PlayKids) | catálogo de vídeos, jogos e histórias para 2–8 anos | assinatura via operadora | **R$ 5,19/semana** (~R$ 22,50/mês) |
| **Kiddle Pass** | “family tech”: aulas ao vivo, livros, atividades 3–12 anos | assinatura B2B2C (Claro, Algar, Decolar, provedores regionais) | **R$ 19,90/mês** em bundle de internet |
| **Lingokids** | 4.000 jogos, foco em inglês e alfabetização, 2–8 anos | freemium + assinatura | grátis + assinatura (US$ ~10/mês no exterior) |
| **GraphoGame / programas públicos** | jogo de correspondência som–letra | gratuito (política pública/escola) | R$ 0 |
| **Elefante Letrado / Árvore** | biblioteca de leitura com painel do professor | licença escolar | contrato por escola/rede |
| **Reforço particular / fono** | acompanhamento humano | sessão | R$ 80–200/sessão |

Leituras úteis:

- **Kiddle Pass** chegou a **1,8 milhão de famílias** e cresceu **62% em receita em 2025**, quase tudo via **operadoras e provedores** — prova de que o canal B2B2C funciona no Brasil e de que família paga por conteúdo infantil educativo quando está embutido na conta de internet.
- **PlayKids** cobra por semana, valor psicológico baixo, e usa a operadora como meio de pagamento (sem cartão).
- **Lingokids** mostra que o modelo internacional é freemium + assinatura, com catálogo grande como argumento.

Nosso diferencial não é catálogo — é **intervenção**: ouve a criança, corrige sílaba por sílaba, funciona sem internet e não tem anúncios. Isso é mais próximo de um **tratamento** do que de um **entretenimento**, e treatment custa mais caro e é vendido de forma diferente (pais desesperados, indicação de fono/psicopedagoga, escola).

## Quanto dá para cobrar

Faixas observadas no mercado infantil brasileiro:

| Faixa | Valor | Comparação |
| --- | --- | --- |
| Assinatura baixa | R$ 14,90–19,90/mês | abaixo de PlayKids/Kiddle Pass |
| Assinatura de mercado | R$ 19,90–29,90/mês | faixa PlayKids/Kiddle Pass |
| Desbloqueio único | **R$ 39,90–69,90** | ~2 a 3 meses de assinatura |
| Licença escolar | R$ 10–40/aluno/ano (estimativa) | contratos por escola |

A conta que importa: um pai que já paga R$ 20/mês de PlayKids não estranha R$ 49,90 **uma vez** por um app que resolve um problema específico da filha. Já uma assinatura de R$ 29,90/mês compete com o pacote inteiro de entretenimento da casa — e perde.

### Tamanho plausível do público

- ~**2,5 milhões** de crianças com 8 anos no Brasil (coorte de nascimentos).
- Dificuldade específica de leitura atinge algo como **15–25%** delas (dislexia ~5–10%; o resto são dificuldades instrucionais). → **~400–600 mil crianças**.
- Se **1%** das famílias comprar um desbloqueio de R$ 49,90: **4–6 mil vendas**, ~R$ 200–300 mil brutos. É um negócio de nicho saudável, não um unicórnio — e é exatamente o tamanho que dá para tocar sozinho.

## Modelos de receita comparados

| Modelo | Prós | Contras | Adequação |
| --- | --- | --- | --- |
| **Pago no download** (R$ 29,90) | simples; sem IAP; receita imediata | mata a experimentação; loja não promove; reembolso se não gostar | baixa |
| **Freemium + desbloqueio único** | pai testa de graça; preço único é diferencial (“sem mensalidade”); combina com produto que “termina” | receita não recorrente; precisa de paywall bem feito | **alta** |
| **Assinatura** (R$ 14,90–19,90/mês) | receita recorrente; financia conteúdo novo | churn alto em app infantil; compete com PlayKids; cobrança recorrente dá trabalho | média |
| **Licença escolar** (B2B) | ticket maior; indicação; validação pedagógica | ciclo de venda longo; exige painel do professor e nota fiscal | média (fase 3) |
| **B2B2C com operadora/provedor** | escala e cobrança na conta; foi o caminho da Kiddle Pass | exige parceria e negociação; margem dividida | baixa agora |
| **Doação / “pague quanto quiser”** | sem atrito | receita imprevisível | baixa |

## Recomendação: freemium com desbloqueio único

**Fase 1 — validar (agora):** app **gratuito** nas lojas, com as **fases 1 e 2 completas** e todos os jogos de revisão liberados. O pai vê a filha lendo, ouve a correção por sílaba e entende o valor sem pagar nada. Sem login, sem anúncio, sem coleta.

**Fase 2 — cobrar:** **desbloqueio único de R$ 49,90** (promoção de lançamento R$ 39,90) para as fases 3–5 + atualizações de conteúdo do primeiro ano. Um preço, para sempre, até 4 perfis de criança. Nada de assinatura enquanto não houver custo recorrente real — o áudio já está embarcado e o app roda offline.

**Fase 3 — escola:** licença por aluno/ano com painel do professor, só depois de 100+ famílias usando e com casos documentados.

### Por que não assinatura

- O produto é uma **intervenção com começo, meio e fim** (5 fases). Assinatura em produto que “acaba” gera cancelamento e sensação de armadilha.
- O custo marginal é ~zero (áudio local, sem servidor). Assinatura serviria para financiar conteúdo novo — que pode ser vendido como pacote anual opcional depois.
- “Paga uma vez, sem mensalidade” é argumento de venda forte num mercado saturado de assinaturas.

### Números

Cenário com desbloqueio a R$ 49,90, taxa de loja de 15% e imposto de 6%:

| Vendas | Bruto | Líquido (após loja e imposto) |
| --- | --- | --- |
| 50 | R$ 2.495 | ~R$ 1.995 |
| 200 | R$ 9.980 | ~R$ 7.985 |
| 1.000 | R$ 49.900 | ~R$ 39.920 |

Ponto de equilíbrio anual: contas (Apple US$ 99 ≈ R$ 545 + Google US$ 25 ≈ R$ 140) + domínio (~R$ 40) ≈ **R$ 725/ano** → **~19 vendas** cobrem o custo de estar nas lojas. Tudo acima disso é margem (menos o tempo).

### O que precisa ser construído para cobrar

| Caminho | Esforço | Observação |
| --- | --- | --- |
| TWA + **Digital Goods API** + Play Billing | 3–5 dias | API limitada no TWA; testar em conta de teste |
| **Capacitor + RevenueCat** (Android e iOS) | 1–2 semanas | mais robusto; destrava o iOS e o IAP da Apple |
| Código de desbloqueio vendido no site | 2–3 dias | **não serve para iOS**: a Apple proíbe destravar conteúdo digital por compra externa (regra 3.1.1); no Android/Windows é possível |

Recomendação técnica: lançar **grátis** agora nas três lojas e só construir o paywall quando houver sinal de demanda (ex.: 50 famílias usando e pedindo mais fases). O paywall pode entrar na mesma versão Capacitor que resolve o iOS.

## Custos e prazos consolidados

| Item | Google Play | App Store | Microsoft |
| --- | --- | --- | --- |
| Conta | US$ 25 (único) | US$ 99/ano | grátis |
| Taxa por venda | 15% hoje; ~10–20% a partir de 09/2027 | 15% (Small Business, via IAP) | 0% com comércio próprio; 15% pelo da Microsoft |
| Teste obrigatório | teste fechado (12 pessoas/14 dias, conta pessoal) | não | não |
| Revisão | 1–7 dias | 1–3+ dias | até 3 dias úteis |
| Esforço de engenharia | 3–5 dias (TWA + assetlinks) | 2–4 semanas (Capacitor + voz nativa) | 1–2 dias |

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Rejeição por “site embrulhado” (Apple 4.2) | Capacitor com conteúdo embarcado, voz nativa, offline real |
| Reprovação na categoria infantil | PIN parental, sem links soltos, política clara, sem analytics |
| Categoria Crianças bloquear pagamento externo no iOS | usar IAP (15%); não depender de link externo |
| Reconhecimento de fala no iOS | plugin SFSpeechRecognizer + fallback “Eu li” |
| Dependência de servidor (hoje) | empacotar os arquivos no app (Capacitor) — deixa de precisar de PC/hospedagem |
| Teste fechado no Play | recrutar escola/família cedo; ou conta de organização |
| Impostos e recebimento do exterior | CNPJ (MEI/Simples) + contador; recibos e câmbio das lojas |
| Custo de manutenção | atualização anual de SDK/API; orçar 2–4 dias/ano |

## Decisão que falta

1. **Modelo:** recomendação é **freemium + desbloqueio único R$ 49,90**, sem assinatura. Confirma?
2. **iOS agora ou depois?** Se sim, começamos o projeto Capacitor e os plugins de voz (é o que também destrava o paywall).
3. **Cobrar já ou só depois de validar?** Recomendação: publicar grátis e medir uso por 4–8 semanas antes de construir o paywall.

## Fontes

- [Google reduz taxas na Play Store e cronograma do Brasil (Canaltech, 04/03/2026)](https://canaltech.com.br/mercado/google-reduz-taxas-na-play-store-mas-usuarios-criticam-restricoes-no-android/)
- [Google abre pagamentos externos na Play Store (Phandroid, 25/06/2026)](https://phandroid.com/2026/06/25/after-years-of-fighting-epic-google-opens-up-play-store-external-payments/)
- [Apple anuncia mudanças no iOS no Brasil após acordo com o CADE (Times Brasil/CNBC, 18/06/2026)](https://timesbrasil.com.br/empresas-e-negocios/apple-anuncia-mudancas-no-ios-no-brasil-apos-acordo-com-o-cade-sobre-app-store/)
- [Apple Newsroom: mudanças no iOS para o Brasil](https://www.apple.com/br/newsroom/2026/06/apple-announces-changes-to-ios-in-brazil/)
- [Microsoft Store: conta individual, comércio próprio e taxas (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/apps/publish/get-started?tabs=individual%2Cmsix-pwa-getting-started)
- [PlayKids: assinatura R$ 5,19/semana (TIM)](https://www.tim.com.br/ajuda/perguntas-frequentes/servicos-e-assinaturas/educacao-e-leitura/playkids)
- [Kiddle Pass: 1,8 milhão de famílias e modelo B2B2C (Empreendedor, 11/08/2026)](https://empreendedor.com.br/negocios/kiddle-pass-transforma-o-tempo-de-tela-das-criancas-de-mais-de-18-milhao-de-familias-brasileiras/)
- [Kiddle Pass a R$ 19,90/mês em bundle de provedor (BS9, 19/10/2025)](https://www.bs9.com.br/variedades/2025/10/19/desktop-oferece-aos-seus-clientes-dois-meses-gratis-em-pacotes-voltados-para-os-pequenos.html)
- [Lingokids no App Store Brasil](https://apps.apple.com/br/app/lingokids-jogos-e-shows/id1002043426)
