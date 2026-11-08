# Pesquisa pedagógica: ensino de leitura e escrita para uma criança de 8 anos com dificuldade específica

> **Documento de apoio ao design do app "Gabi"** — tutoria de português em tablet, uso doméstico, sessões curtas diárias, com apoio dos pais.
>
> **Perfil-alvo:** criança brasileira de 8 anos (tipicamente 3º ano), bom desempenho nas demais áreas escolares, dificuldade persistente e específica em ler e escrever. O quadro *sugere* dificuldade específica de leitura / possível dislexia, **mas este documento não faz diagnóstico** e o app **não deve fazer diagnóstico**. Diagnóstico é ato de profissional habilitado (fonoaudiólogo, neuropediatra, psicólogo/neuropsicólogo).
>
> **Como usar:** a Seção 16 ("IMPLICAÇÕES DIRETAS PARA O APP") é a parte acionável e priorizada. As seções 1–15 são a base de evidência que a sustenta.
>
> **Data da síntese:** novembro de 2025. Sempre que um número é estimativa ou aproximação, está marcado como tal.

---

## Sumário

1. [Como ler este documento: níveis de evidência](#1-como-ler-este-documento-níveis-de-evidência)
2. [O que é aprender a ler (e por que "bom em tudo, menos em leitura" faz sentido)](#2-o-que-é-aprender-a-ler)
3. [Quais componentes mais impactam a alfabetização](#3-quais-componentes-mais-impactam-a-alfabetização)
4. [Consciência fonológica: tarefas, ordem e tempo](#4-consciência-fonológica-tarefas-ordem-e-tempo)
5. [Fônica sintética sistemática e escopo-sequência para o português](#5-fônica-sintética-sistemática-e-escopo-sequência-para-o-português)
6. [Textos decodificáveis](#6-textos-decodificáveis)
7. [Fluência de leitura](#7-fluência-de-leitura)
8. [Escrita e ortografia](#8-escrita-e-ortografia)
9. [A regra de M antes de P e B](#9-a-regra-de-m-antes-de-p-e-b)
10. [Motivação e engajamento](#10-motivação-e-engajamento)
11. [Prática espaçada e revisão de erros](#11-prática-espaçada-e-revisão-de-erros)
12. [Sinais de alerta de dislexia e o que os pais devem fazer](#12-sinais-de-alerta-de-dislexia-e-o-que-os-pais-devem-fazer)
13. [Como envolver os pais](#13-como-envolver-os-pais)
14. [Como adaptar para a criança com dificuldade](#14-como-adaptar-para-a-criança-com-dificuldade)
15. [Consenso científico × prática comum sem evidência forte](#15-consenso-científico--prática-comum-sem-evidência-forte)
16. [IMPLICAÇÕES DIRETAS PARA O APP](#16-implicações-diretas-para-o-app)
17. [Limitações desta síntese](#17-limitações-desta-síntese)
18. [Referências](#18-referências)

---

## 1. Como ler este documento: níveis de evidência

Nem tudo o que se diz sobre alfabetização tem o mesmo lastro. Usei três rótulos:

| Rótulo | O que significa | Exemplos neste documento |
|---|---|---|
| **Consenso forte** | Sustentado por revisões sistemáticas, meta-análises ou painéis de especialistas independentes, com convergência entre países e décadas. | Instrução fônica sistemática; consciência fonológica com letras; leitura repetida para fluência. |
| **Evidência moderada / promissora** | Há estudos experimentais, mas com menos volume, populações específicas ou resultados heterogêneos. | Textos decodificáveis; feedback corretivo imediato; gamificação "leve". |
| **Prática comum sem evidência forte** | Muito usado em escolas e apps, plausível, mas sem base experimental robusta (ou com evidência contrária). | Fichas de "caligrafia" como remédio para leitura; recompensas materiais por sessão; "método global" como via principal. |

**Um alerta metodológico importante:** tamanhos de efeito não são comparáveis entre estudos quando os grupos de comparação mudam. O National Reading Panel (NRP) estimou a fônica sistemática em **d ≈ 0,41**, mas esse número é a média de comparações contra "alguma fônica" e contra "nenhuma fônica". Quando se compara fônica sistemática com *instrução de palavra inteira*, o efeito sobe para **d ≈ 0,51**; contra *linguagem global (whole language)*, **d ≈ 0,31**. Reanálises independentes chegaram a valores entre **d ≈ 0,12 e 0,24** (porque fazem outra pergunta estatística). Todas essas estimativas são compatíveis entre si — o que muda é o contraste ([Stuebing et al., 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC3024599/)).

Conclusão prática: **não compare "pesos" de componentes como se fossem notas de um ranking**. Compare *o que você adiciona* ao que a criança já tem.

---

## 2. O que é aprender a ler

Duas ideias organizam praticamente toda a pesquisa moderna e são consenso:

**A Visão Simples da Leitura (Simple View of Reading):** compreensão de leitura = **decodificação × compreensão linguística**. São duas habilidades relativamente independentes. Uma criança pode ter linguagem oral excelente e decodificação fraca — é exatamente o perfil descrito (bom em outras áreas, travado na leitura). Isso é *informação de design*: o gargalo provável está na **decodificação e no reconhecimento automático de palavras**, não no raciocínio.

**A corda de Scarborough (Reading Rope):** a leitura fluente é uma corda trançada de fios — consciência fonológica, fônica, sílabas/morfologia, palavras automáticas (fio "palavra"), e vocabulário, sintaxe, conhecimento de mundo, letramento (fio "linguagem"). Os fios se entrelaçam; nenhum sozinho faz a corda. Implicação: um app só de sílabas não alfabetiza; precisa amarrar sílaba → palavra → frase → texto com sentido.

**Consequência para o design:** o app deve ser majoritariamente **decodificação + ortografia + fluência**, mas **nunca** abandonar sentido. Toda palavra montada deve ser uma palavra que a criança conhece oralmente; todo trecho lido deve fazer sentido e ser compreensível.

---

## 3. Quais componentes mais impactam a alfabetização

### 3.1 O painel de referência

O [National Reading Panel (NRP, 2000)](https://www.nichd.nih.gov/publications/pubs/nrp/findings) — relatório encomendado pelo Congresso dos EUA, sintetizando centenas de estudos experimentais — identificou cinco pilares: **consciência fonêmica, fônica, fluência, vocabulário e compreensão**. O NRP é antigo (2000), mas continua sendo a espinha dorsal das políticas de alfabetização baseada em evidências no mundo, inclusive no Brasil.

No Brasil, o [Relatório Nacional de Alfabetização Baseada em Evidências (RENABE, MEC/Sealf, 2020)](https://avamec.mec.gov.br/#/instituicao/sealf/curso/12361/informacoes) e o [Curso ABC — Alfabetização Baseada na Ciência](https://www.gov.br/capes/pt-br/assuntos/noticias/programa-abc-incentiva-a-leitura) (CAPES/Sealf/MEC com Universidades do Porto, Minho e Aberta de Portugal) chegam às mesmas conclusões e são a referência nacional mais próxima do que você precisa: **instrução explícita e sistemática das correspondências letra-som, com consciência fonológica, fluência e compreensão, em sala de aula**.

O [What Works Clearinghouse (WWC/IES) — *Foundational Skills to Support Reading for Understanding, K–3*](https://ies.ed.gov/ncee/wwc/PracticeGuide/21) (2016, rev. 2019) traz 4 recomendações com **força de evidência explicitamente graduada** — útil porque separa o que é forte do que é apenas razoável:

| # | Recomendação do WWC | Força da evidência |
|---|---|---|
| 1 | Ensinar linguagem acadêmica (vocabulário, linguagem inferencial e narrativa) | **Mínima** |
| 2 | Desenvolver consciência dos segmentos de som da fala e como se ligam às letras | **Forte** |
| 3 | Ensinar a decodificar palavras, analisar partes de palavras, escrever e reconhecer palavras | **Forte** |
| 4 | Garantir que cada aluno leia **texto conectado todos os dias** (precisão, fluência, compreensão) | **Moderada** |

### 3.2 Tamanhos de efeito: o que os números realmente dizem

| Componente | Evidência de impacto | Magnitude | Comentário crítico |
|---|---|---|---|
| **Consciência fonológica (com letras)** | NRP (Ehri et al., 2001): d ≈ **0,86** em medidas de CF e d ≈ **0,53** em leitura de palavras | Moderada a alta | O efeito sobre leitura é real, mas **menor** que o efeito sobre a própria CF. CF *sem* letras transfere pouco para leitura. |
| **Fônica sintética sistemática** | NRP: d ≈ **0,41** (geral). Para leitores com dificuldade: d ≈ **0,98** (palavras regulares) e **0,67** (pseudopalavras) no K–2; d ≈ **0,49 / 0,52** no 2º–6º ano | Moderada (alta para quem tem dificuldade) | É o componente com **maior efeito para crianças em risco**. Efeito maior quando comparado a palavra inteira (0,51) do que a linguagem global (0,31). |
| **Fluência (leitura repetida e assistida)** | Consenso forte em revisões de meta-análises; WWC grau **moderado** | Moderada | Efeito maior em **velocidade e precisão** do que em compreensão, quando mal desenhado. Fluência é *ponte*, não fim. |
| **Vocabulário** | WWC grau **mínimo** para o ensino de linguagem acadêmica no K–3 | Baixa a moderada | Vocabulário importa muito para compreensão **a partir do 3º–4º ano**, mas é alvo de longo prazo, não do MVP. |
| **Compreensão (estratégias)** | Efeitos pequenos a moderados; depende de decodificação fluente | Baixa a moderada | Ensinar "estratégias de compreensão" a quem ainda decodifica mal é construir telhado sem parede. |

**Intervenção mediada por tecnologia** — o dado mais diretamente relevante para um app: uma meta-análise de **67 estudos (1995–2023, 1.352 alunos)** com estudantes com dislexia/DSA no ensino fundamental encontrou efeito médio **g = 0,36** em leitura de palavras, soletração e fluência, com **transferência pequena mas significativa para compreensão (g = 0,21)** ([Jahanaray et al., 2025](https://eric.ed.gov/?id=EJ1492446)). Ou seja: **app ajuda, mas não substitui instrução intensiva humana** — e o efeito é maior em habilidades estreitas (palavra/pseudopalavra) do que em compreensão.

### 3.3 O que isso significa para uma criança de 8 anos com dificuldade

A literatura sobre resposta à intervenção é consistente em três pontos:

1. **Precocidade e intensidade** importam mais que o rótulo do método. Quanto mais cedo e mais intensivo, melhor.
2. **Componentes "compreensivos" e intensidade** elevam o efeito: a reanálise de Stuebing et al. (2008) mostra que os maiores efeitos vêm de instrução fônica **combinada** com mais componentes e mais tempo de prática, não de fônica isolada.
3. Para leitores com dificuldade, o efeito da fônica é **muito maior** que a média geral (d ≈ 1,0 em palavras regulares no início da escolarização). Isso justifica colocar **fônica + ortografia no centro do app**, e não como "um módulo entre vários".

> **Estimativa (não medida):** para uma criança com dificuldade específica, ganhos robustos costumam exigir **dezenas de horas** de prática distribuída ao longo de meses — a ordem de grandeza frequentemente citada é **20 a 60 horas** de intervenção focada. Trate como estimativa de planejamento, não como norma. Sessões de 12–15 min diários por 6 meses ≈ 35–45 horas — coerente com essa faixa.

---

## 4. Consciência fonológica: tarefas, ordem e tempo

### 4.1 O que é e por que vem antes (mas não muito antes)

Consciência fonológica (CF) é a habilidade de perceber e manipular os sons da fala independentemente do significado: rimar, contar sílabas, identificar o primeiro som, juntar, segmentar, trocar fonemas. É **preditor forte** de aprendizagem da leitura e a instrução em CF **melhora** a leitura (NRP: d ≈ 0,53).

Duas descobertas mudam o design:

- **CF sem letras tem efeito pequeno sobre leitura.** O ganho grande aparece quando a criança **vê a letra enquanto manipula o som** (tarefas com fichas/letras). A meta-análise de dosagem confirma: instrução de CF **com letras** tem curva de efeito que **continua subindo** mesmo depois de 16 horas, enquanto CF "pura" satura e até decresce ([Erbeli et al., 2024](https://eric.ed.gov/?ff1=subGrade+1&q=Analysis&id=EJ1427043)).
- **Existe dose ótima.** A mesma meta-análise (16 estudos, 35 tamanhos de efeito) encontrou curva em U invertido: o efeito **cresce até ~10,2 horas acumuladas** de instrução de CF (d máximo ≈ **0,74**) e **decresce depois disso**. Para crianças em risco, o padrão se mantém.

**Tradução para o app:** CF não é um "módulo inicial que se abandona". É **aquecimento curto e diário (2–3 min)**, sempre **amarrado a letras**, e deve ser **revisitada** ao longo de todo o percurso — mas o **total acumulado** deve ficar na casa de ~10 horas, não centenas. O grosso do tempo vai para fônica/ortografia/leitura.

### 4.2 Ordem típica das tarefas (do mais fácil ao mais difícil)

A progressão abaixo é a sequência desenvolvimental mais aceita na literatura (consciência de palavra → sílaba → rima/aliteração → fonema) e a usada em programas baseados em evidência:

| Nível | Tarefa | Exemplo em português | Quando introduzir |
|---|---|---|---|
| 0 | Consciência de palavra na frase | "A menina come bolo" → quantas palavras? | Reforço, se necessário |
| 1 | **Segmentação e contagem de sílabas** | "bo-ne-ca" → 3 | Início absoluto |
| 2 | **Síntese silábica** | bo + ne + ca = boneca | Início absoluto |
| 3 | **Rima** (reconhecer e produzir) | bola / mola / cola | Semanas 1–3 |
| 4 | **Aliteração** (som inicial igual) | **m**ala, **m**ola, **m**esa | Semanas 2–4 |
| 5 | **Identificar o primeiro som** (com letra à vista) | Qual o primeiro som de "sapo"? /s/ | Semanas 3–6 |
| 6 | **Síntese fonêmica** (juntar sons) | /s/ /a/ /p/ /o/ → sapo | Semanas 4–8 |
| 7 | **Segmentação fonêmica** | sapo → /s/ /a/ /p/ /o/ | Semanas 6–10 |
| 8 | **Manipulação** (apagar, trocar, inverter) | "sapo" sem /s/ → "apo"; trocar /s/ por /k/ → "capo" | A partir da 8ª–10ª semana |

Regras de ouro:
- **Sempre do concreto ao abstrato:** fichas, palmas, blocos, antes de "só de ouvido".
- **Sempre com a letra correspondente visível** a partir do nível 5.
- **Uma dificuldade por vez:** não pedir síntese fonêmica enquanto a criança ainda não segmenta sílabas com segurança.
- **Vocabulário conhecido:** usar palavras que a criança já fala. CF sobre palavra desconhecida vira teste de vocabulário.

### 4.3 Quantos minutos

| Bloco | Duração | Frequência |
|---|---|---|
| Aquecimento de CF dentro da sessão | **2–3 min** | Diária |
| Sessão dedicada de CF (fase inicial) | 8–10 min | 3–5×/semana nas primeiras 8–10 semanas |
| Total acumulado alvo | **~10 horas** (faixa 8–14 h) | Ao longo de 2–4 meses |

> A faixa de 8–14 h é uma **extrapolação** do ponto ótimo de 10,2 h encontrado em crianças de pré-escola e 1º ano. Para uma criança de 8 anos com dificuldade, provavelmente é preciso **mais repetição**, não mais conteúdo novo — mantenha o *conteúdo* limitado e aumente o *ciclo de revisão*.

---

## 5. Fônica sintética sistemática e escopo-sequência para o português

### 5.1 O que "sistemática" significa na prática

Fônica **sintética** = ensinar a criança a **converter letras em sons e juntá-los (blend)** para ler palavras novas. **Sistemática** = há um plano, uma ordem, e cada elemento novo é praticado até o domínio antes de avançar. Os cinco princípios que a pesquisa sustenta (NRP; WWC Rec. 3; RENABE):

1. **Explicitude:** o professor (ou a Gabi) **diz a regra** e **modela**; não se espera que a criança descubra sozinha.
2. **Sequência cumulativa:** cada lição usa **somente** o que já foi ensinado + o novo elemento.
3. **Prática distribuída com feedback:** muitas tentativas curtas, correção imediata.
4. **Integração imediata com escrita:** ler **e** escrever a mesma correspondência na mesma lição (ditado curto).
5. **Transferência para texto:** o que foi aprendido aparece em palavras, frases e um pequeno texto na mesma sessão.

### 5.2 Escopo-sequência proposto para o português do Brasil

O português é uma ortografia **semi-transparente**: a leitura (letra → som) é bem mais regular que a escrita (som → letra). Isso tem duas consequências: (a) a criança aprende a **ler** mais rápido do que a **escrever**; (b) as dificuldades concentram-se na **ortografia** (escolha entre grafemas concorrentes), não na decodificação básica. O escopo abaixo respeita isso: a decodificação avança rápido; a ortografia é espiralada e retomada várias vezes.

**Fase A — Alicerce (semanas 1–4)**
1. Vogais **a, e, i, o, u** (nome, som, forma) + consciência de sílaba.
2. Sílabas CV com consoantes "âncora": **p, b, m, t, d, n** → pa, pe, pi, po, pu / ba… / ma… / ta… / da… / na…
3. Palavras dissílabas CV-CV: **pata, bolo, mala, dedo, tomate, panela**.
4. Primeiras frases: "O bebê mama." "A bola é da Bia."

**Fase B — Expansão (semanas 5–10)**
5. **f, v, s, z, l, r, j, x** (x com som de /ʃ/ em "xícara" só depois).
6. Sílabas **CVC** e travadas simples: **pão, bem, sol, mar, luz** (atenção: nasalização entra aqui).
7. **Dígrafos consonantais:** **ch, lh, nh** (um por semana).
8. **Dígrafos vocálicos / nasalização:** **ã, õ, ão, ãe, ãi, am/an, em/en, im/in, om/on, um/un**.
9. **Encontros consonantais:** **pr, br, tr, dr, cr, gr, fr, vr** + **pl, bl, cl, gl, fl** (sílabas complexas: pra, bra, tra…).

**Fase C — Ortografia contextual (semanas 11–24, em espiral)**
10. **R / RR** (som forte entre vogais), **S / SS**, **C / QU**, **G / GU**, **C / Ç**, **X / CH**, **E / I**, **O / U**, **M / N** (a regra M antes de P e B é a **primeira** desta fase — ver Seção 9).
11. **ÃO / AM**, **-oso / -osa**, **-ice / -isse**, **-agem**, e outras terminações de alta frequência.
12. **Morfologia:** prefixos e sufixos simples (**des-, re-, -mente, -inho, -ada**), palavras compostas, famílias de palavras (útil para ortografia e vocabulário).

**Fase D — Consolidação (contínua)**
13. Palavras irregulares de alta frequência (**você, também, muito, aqui, agora, então, porque, eu, ela, era, foi, é, já, há**).
14. Textos mais longos, compreensão, produção de frases e pequenos textos.

> **Consenso × prática comum:** a divisão em "fases" é uma **organização pedagógica**, não um achado experimental. O que a evidência sustenta é a **ordem relativa** (simples → complexo; regular → irregular; alta frequência primeiro) e o princípio de **cumulatividade**. A ordem exata dos dígrafos e das regras contextuais varia entre programas e não há evidência de que uma ordem específica seja superior. Trate o escopo como **hipótese de design a ser validada com dados de uso**.

### 5.3 Regras de ouro do escopo-sequência

- **Nada de texto com grafema não ensinado.** Se a criança ainda não viu "lh", não aparece "molho" na história. Isso é o que define "texto decodificável".
- **Uma novidade por lição.** Só um elemento novo; o resto é revisão.
- **Alta frequência primeiro.** As 100 palavras mais frequentes do português cobrem uma fração enorme de qualquer texto; priorize-as.
- **Contraste planejado.** Pares mínimos (**pato/bato, faca/vaca, casa/gasa, fio/vio**) são o motor da discriminação fonêmica e da atenção à letra.
- **Sílabas antes de fonemas isolados** no português faz sentido: a estrutura CV é dominante e a sílaba é a unidade psicológica natural do falante. Isso dialoga com a tradição brasileira de trabalho com sílabas — **e não conflita** com fônica sintética, desde que a criança seja ensinada a **juntar** as sílabas e a **mapear letra-som** dentro delas.

---

## 6. Textos decodificáveis

### 6.1 O que são

**Texto decodificável** é aquele construído com uma alta proporção de palavras cujas correspondências letra-som a criança **já aprendeu**. O objetivo é dar **prática de decodificação bem-sucedida** em contexto significativo — não adivinhar por figura, não memorizar.

**Texto previsível** (padrão repetitivo: "Eu vejo o gato. Eu vejo o cachorro…") e **texto de linguagem global** apostam em memória, pistas de imagem e contexto. São úteis para **leitura compartilhada e prazer**, mas são **ineficazes como veículo principal** para quem precisa aprender a decodificar.

### 6.2 O que a evidência diz — com honestidade sobre a força

A evidência **não** é tão forte quanto a de fônica. A meta-análise mais direta (16 artigos de revisão) encontrou efeitos **pequenos a moderados** dos textos decodificáveis:

- **Leitura de palavras: g ≈ 0,20**
- **Decodificação de pseudopalavras: g ≈ 0,30**

([Odo, 2024](https://www.eurekalert.org/news-releases/1049521); publicado em *Literacy*)

O autor conclui que textos decodificáveis **ajudam**, especialmente na decodificação de palavras difíceis, mas **não bastam sozinhos** — precisam ser combinados com outros materiais e com instrução explícita.

**Como interpretar:** o efeito pequeno **não** significa "não use". Significa que o texto decodificável é um **veículo de prática**, e o que produz o efeito é a **instrução explícita + a quantidade de prática de decodificação bem-sucedida**. Um texto decodificável sem ensino por trás é só um texto chato.

### 6.3 Implicações de design

| Recomendação | Por quê |
|---|---|
| **Controle rigoroso do repertório grafêmico** | É a definição do gênero. Se o app não controla, não é decodificável. |
| **Histórias de 3–6 linhas no início, 8–12 depois** | Sessões curtas; sucesso rápido. |
| **Sentido real, não frases-robô** | "O gato de Bia é mau. Ele mia e pula." funciona; "A pata pia. A pia é da pata." não. |
| **Imagens como apoio de sentido, nunca como pista de adivinhação** | A imagem deve ilustrar o que o texto já disse, não substituir a leitura. |
| **Releitura do mesmo texto 2–3×** | É leitura repetida (Seção 7) disfarçada de história. |
| **Progressão: palavra → frase → texto** | Cada nível é pré-requisito do próximo. |
| **Texto com 90–95% de palavras decodificáveis** | Estimativa de design: abaixo disso a criança frustra; acima, não há desafio. Ajuste por dados. |

> **Prática comum sem evidência forte:** usar textos "decodificáveis" que na verdade são listas de palavras sem sentido, ou que introduzem 5 grafemas novos de uma vez. Isso trai o princípio sem entregar o benefício.

---

## 7. Fluência de leitura

### 7.1 Por que importa

Fluência = **precisão + velocidade + prosódia**. É a ponte entre decodificar e compreender. Quando decodificar exige esforço consciente, sobra pouca memória de trabalho para o sentido. Fluência tem **correlação alta e consistente com compreensão** ([Five from Five](https://fivefromfive.com.au/fluency/assessing-fluency/)). A medida clássica é **palavras corretas por minuto (WCPM / PCPM)** em leitura oral de um texto não familiar.

Por que **leitura em voz alta com feedback** importa: é o único formato em que o adulto (ou o app) **vê o erro** e pode corrigi-lo na hora. Leitura silenciosa não dá esse sinal. Para a criança com dificuldade, ler em voz alta com retorno imediato é o que transforma erro em aprendizagem.

### 7.2 Métodos com evidência

**Leitura repetida (repeated reading)** — o método mais estudado e o de melhor custo-benefício. Os componentes que a pesquisa identifica como ativos ([Five from Five](https://fivefromfive.com.au/fluency/evidence-based-fluency-instruction/repeated-reading/)):

- **modelagem** de leitura fluente (o app pode fazer isso com TTS);
- **feedback positivo e corretivo** após cada leitura;
- **meta e automonitoramento** (a criança vê o próprio progresso);
- **pré-ensino de palavras difíceis** antes de ler;
- **pelo menos 4 repetições** do mesmo texto (ou de texto muito semelhante — "prática variada");
- **foco em ritmo E sentido**, não só velocidade.

**Procedimento típico (1:1):** texto que a criança lê com poucos erros, **50–200 palavras**, legível em 1–2 min; adulto modela; criança lê; adulto dá os palavras desconhecidas após 3 s; feedback específico após cada leitura; 3–4 releituras; **10–15 min por lição, idealmente 3×/semana**.

**Outros métodos com suporte:** leitura eco (adulto lê, criança repete imediatamente), leitura coral, leitura assistida por áudio (a criança acompanha o áudio — é o que o TTS do app faz), leitura em pares, teatro de leitores.

### 7.3 Metas de palavras corretas por minuto

**Aviso importante:** não existem normas brasileiras de fluência amplamente validadas e publicadas para uso clínico. As referências abaixo vêm de normas em **inglês** (Hasbrouck & Tindal; Konza, 2012) e devem ser tratadas como **aproximação**, não como padrão. O português tem ortografia mais transparente e estrutura silábica mais simples (CV predominante), o que tende a produzir **velocidades ligeiramente maiores** — mas isso é **estimativa**, não dado consolidado.

| Referência | WCPM aproximado | Fonte |
|---|---|---|
| Final do 1º ano | **~60** | Konza (2012), via Five from Five |
| Final do 2º ano | **~90–100** | idem |
| 3º ao 6º ano | **~100–120** | idem |
| Limiar para compreensão básica | **~90–100** | idem |
| Leitor adulto proficiente | **~180** | idem |

**Para a criança de 8 anos (3º ano):** a meta realista de trabalho fica na faixa **60–90 WCPM em texto no nível instrucional**, caminhando para 90–100. Mas o alvo mais útil no app **não é a norma absoluta** — é a **inclinação da curva individual**: a criança está ganhando palavras por minuto semana a semana?

**Metas de progresso (CBM):** em monitoramento baseado em currículo, espera-se que um aluno em intervenção ganhe algo como **1 a 2 palavras corretas por semana** em textos do mesmo nível. **Estimativa** baseada na prática de CBM; varia com idade e ponto de partida.

### 7.4 Prosódia

A prosódia é importante para o sentido, mas **não é uma boa medida independente** de fluência: medidas de prosódia são mais confiáveis quando incluem velocidade, o que as torna redundantes ([Five from Five](https://fivefromfive.com.au/fluency/assessing-fluency/)). Para o app: **não tente "medir prosódia" automaticamente** no MVP. Use-a como **modelo** (TTS lendo com expressão) e como **dica** ("essa frase é uma pergunta, a voz sobe no fim").

---

## 8. Escrita e ortografia

### 8.1 Por que escrita não é "extra"

Escrever **consolida** a leitura. O ato de recuperar a forma escrita de uma palavra (produção) é mais exigente que reconhecê-la (leitura) e fortalece a representação ortográfica na memória — é o mecanismo do **mapeamento ortográfico** (orthographic mapping; [Ehri, 2014](https://doi.org/10.1080/10888438.2013.819356)): a criança liga som, letra e sentido até a palavra ser reconhecida **à vista**, sem decodificar.

Consequência de design: **toda lição deve ter um componente de produção escrita**, mesmo que mínimo (montar a palavra com letras, completar a sílaba, ditado de 3 palavras). Ler sem escrever deixa metade do circuito sem exercício.

### 8.2 Ditado: o formato mais eficiente

**Ditado de palavras** é a atividade de ortografia com melhor relação esforço/benefício:

- é **recuperação ativa** (não reconhecimento);
- dá **diagnóstico fino** (mostra exatamente qual correspondência falhou);
- é **curto** (3–8 palavras em 2 min);
- é **mensurável** (percentual de acerto por padrão ortográfico).

**Como fazer bem:**
1. A palavra é **falada dentro de uma frase** ("Vou dizer: *campo*. O cavalo corre no campo.").
2. A criança **repete** a palavra (garante que ouviu).
3. Escreve (ou monta com letras).
4. **Feedback imediato** com a palavra correta à vista e comparação letra a letra.
5. A palavra errada entra na **fila de revisão espaçada**.

**Ditado de frases** (2–3 palavras) é o passo seguinte, e é onde aparecem erros de **junção/separação** ("denovo", "a gente") — que são ortográficos e precisam de ensino explícito, não de "prestar atenção".

### 8.3 Erros esperados no português e como tratá-los

A taxonomia abaixo é a usada classicamente na literatura brasileira sobre apropriação da ortografia ([Zorzi, 1998](https://cedu.ufal.br/pt-br/pos-graduacao/mestrado-e-doutorado-em-educacao/institucional/biblioteca-virtual/2009/adriana-da-silva-vieira/@@download/file/ADRIANA%20DA%20SILVA%20VIEIRA.pdf) é a referência clássica; a descrição dos padrões é linguística, não um achado experimental). **Nenhum desses erros, isoladamente, indica dislexia** — muitos são etapas normais do desenvolvimento.

| Categoria | Exemplos | O que revela | O que fazer |
|---|---|---|---|
| **Trocas surda/sonora** | "pato"→"bato"; "faca"→"vaca"; "tia"→"dia"; "casa"→"gasa" | Discriminação fonêmica fina ainda frágil | Pares mínimos com **articulação exagerada** (mão na garganta para sentir vibração); contraste visual; **não** é "desatenção" |
| **Apoio na fala (redução vocálica)** | "menino"→"mininu"; "bola"→"bula"; "telefone"→"tulifone" | Transcrição fonética: a criança escreve o que **ouve**, e no PB o "e"/"o" átonos soam como "i"/"u" | Explicar que a escrita **nem sempre** espelha a fala; trabalhar **consciência da sílaba escrita**; listas de palavras com E/O átonos |
| **M / N** | "campo"→"canpo"; "também"→"tanbem"; "antes"→"amtes" | Regra contextual não automatizada | Ver Seção 9 |
| **R / RR** | "caro"→"carro"; "guerra"→"gera" | Valor sonoro do R entre vogais | Contraste **caro/carro, foro/forro, muro/murro** com áudio |
| **S / SS / C / Ç / Z** | "passo"→"paso"; "caça"→"casa"; "cidade"→"sidade" | Concorrência de grafemas para /s/ | Ensinar **por posição** (SS só entre vogais; Ç antes de a/o/u) e por **família de palavras** |
| **C / QU** | "quero"→"cero"; "cinco"→"quinco" | QU antes de E/I | Regra posicional + palavras frequentes |
| **G / GU** | "guerra"→"gerra"; "gato"→"guato" | GU antes de E/I | Idem |
| **E / I e O / U** | "cadeira"→"cadira"; "bonito"→"bunito" | Redução vocálica | Idem redução vocálica |
| **X / CH** | "chave"→"xave"; "xícara"→"chícara" | Não há regra confiável; é lexical | **Memorização com apoio de frequência e etimologia**, não regra |
| **Junção / separação** | "denovo", "concerteza", "amim" | Consciência de palavra na frase | Ditado de frase; marcar palavras com espaços |
| **Omissão / adição de letras** | "bicicleta"→"bicicleta"/"bicicreta" | Memória de trabalho / planejamento motor | Reduzir carga; sílaba por sílaba; não penalizar |

**Princípios de correção produtiva (evidência moderada, mas consistente):**

1. **Feedback corretivo imediato é superior ao diferido** para tarefas de precisão (palavra, ortografia), sobretudo para quem está aprendendo. O feedback diferido (no fim da sessão/atividade) é mais útil para **textos e produções longas**, onde interromper quebra o sentido. Para o app: **imediato no nível da palavra, diferido no nível do texto**.
2. **Seja específico, não avaliativo.** "Você escreveu *canpo*. O som do M antes do P é feito com os lábios: c**am**po." em vez de "errado".
3. **Recast** (reformulação): a Gabi repete a forma correta com naturalidade, sem interromper o fluxo — "Isso, o **campo**. O cavalo corre no campo." Funciona bem para erros de fala/leitura em contexto.
4. **"Não é 'errado', é uma pista."** Erro é **dado de diagnóstico**. A criança precisa aprender a **olhar para o próprio erro** sem vergonha. No app: o erro deve gerar **curiosidade** ("O que essa letra está tentando te dizer?"), nunca perda de pontos.
5. **Comparação lado a lado.** Mostrar "canpo" e "campo" juntos, com o trecho destacado, é mais eficaz que só mostrar a forma correta.
6. **Uma correção por vez.** Corrigir 5 coisas de uma vez sobrecarrega e desmotiva.

> **Cuidado:** "corrigir tudo" é contraproducente para a criança com dificuldade. Escolha **o alvo da lição** e corrija só ele; o resto passa.

---

## 9. A regra de M antes de P e B

### 9.1 Por que essa regra é uma boa primeira unidade ortográfica

- **Altíssima regularidade:** praticamente **não há exceções** no léxico nativo do português.
- **Alta frequência:** "campo", "tempo", "também", "sempre", "junto com o B de 'bem'" aparecem em qualquer texto.
- **Explicável por articulação:** **M, P e B são todos bilabiais** — produzidos com os dois lábios. Isso dá um **gancho concreto** ("P e B saem dos lábios; o M também; por isso o M vem antes deles"), o que é raro em ortografia e ótimo para criança com dificuldade.
- **Erro visível e diagnosticável:** "canpo" mostra exatamente o que falhou.

### 9.2 Como a regra é ensinada em materiais brasileiros

O padrão nos materiais didáticos brasileiros (e coerente com o que a fônica sistemática recomenda):

1. **Apresentar o som, não a letra primeiro.** A Gabi fala **/m/** e pede para a criança sentir os lábios.
2. **Mostrar o par M–P–B** e explicar que os três "moram nos lábios".
3. **Regra em uma frase:** *"Antes de P e de B, escreve-se M."*
4. **Exemplos com a sílaba destacada:** c**am**-po, t**em**-po, t**am**-bém, s**em**-pre, **em**-bo-ra.
5. **Contraste com N:** *"Antes de outras letras, escreve-se N"*: c**an**-to, b**an**-co, **an**-tes, m**un**-do.
6. **Prática:** completar lacunas, caça-erros, ditado, leitura de texto com muitas palavras do padrão.
7. **Generalização:** pedir que a criança **encontre** o padrão em um texto novo.

### 9.3 A explicação que funciona melhor

Em vez de "decoreba", use **três camadas**:

- **Camada articulatória (a mais útil):** "M, P e B são feitos com os lábios fechados. O M é o irmão que vem antes."
- **Camada visual:** a letra **m** tem "duas perninhas" e o **p**/"b" têm "barriga" — associação fraca, use só como reforço, nunca como explicação principal.
- **Camada de frequência:** a criança vê o padrão **muitas vezes**, em palavras que já sabe ler. A automatização vem da exposição, não da explicação.

**O que NÃO funciona:** ensinar por "som nasal" (o som nasal é o mesmo em "campo" e "canto" — [ũ]); ensinar por "é mais bonito"; ensinar as duas regras (M antes de P/B **e** N antes das outras) ao mesmo tempo, sem contraste explícito.

### 9.4 Exceções e casos que confundem

| Caso | Exemplo | Como tratar |
|---|---|---|
| **Estrangeirismos e nomes próprios não aportuguesados** | *pump*, *punk*, *pumba*, *Mumbai* | Ignorar no MVP. Se aparecerem, dizer "essa palavra veio de outra língua". |
| **M no fim da palavra (não é exceção, é fora do escopo)** | *bem, também, homem, jovem, álbum, item* | Ensinar separadamente: "aqui o M não está antes de P nem de B; ele é o último". |
| **N antes de outras consoantes (não é exceção)** | *antes, canto, banco, mundo, ponte, enfim* | É a **outra metade** da regra. Ensinar junto, como contraste. |
| **Palavras com M antes de P/B em sílabas travadas** | *compra, simples, sempre, limpo* | São o **mesmo padrão**; use como generalização. |
| **Compostos e prefixos** | *compartilhar, embora, importar, umbigo* | O M se mantém. Bom para mostrar regularidade. |

> **Nota de honestidade:** a afirmação "não há exceções no léxico nativo" é uma generalização linguística segura, mas **não** foi testada como hipótese experimental. Se o app encontrar um caso ambíguo, trate como "palavra especial" — não como contraexemplo da regra.

### 9.5 Lista graduada de palavras (para o banco do app)

Lista construída para este documento (não é um instrumento validado), organizada por dificuldade crescente. Todas são palavras de alta frequência e concretas o suficiente para uso com imagem.

**Nível 1 — 2 sílabas, sílaba travada simples, M antes de P**
campo · tempo · tampa · pompa · limpo · simples · sempre · compra

**Nível 2 — 2 sílabas, M antes de B**
pomba · bambu · tambor · samba · jambo · embalo · umbigo · ombro

**Nível 3 — 3 sílabas, alta frequência**
companheiro · importante · impossível · empurrar · embrulho · embarcar · tempestade · campainha · bombeiro · bombom · simpático · computador

**Nível 4 — contraste M/N (a criança escolhe)**
campo/canto · tempo/tento · tampa/tanta · pompa/ponta · sempre/sente · limpo/lindo · compra/contra · samba/santa

**Nível 5 — caça-erros (a palavra está escrita errada; a criança corrige)**
"canpo" → campo · "tenpo" → tempo · "tanbém" → também · "senpre" → sempre · "conpra" → compra · "pomba" ✓ / "ponba" ✗ → pomba

**Nível 6 — frases e texto curto**
"O **tempo** no **campo** é **simples**."
"**Sempre** que o **tambor** toca, o **bombeiro** **embarca**."
"**Também** quero **compartilhar** o **bombom**."

**Nível 7 — transferência**
Texto de 4–6 linhas com 8–12 palavras do padrão + palavras já dominadas; a criança **circunda** as palavras com M antes de P/B.

### 9.6 Atividade eficaz (o que a evidência favorece)

1. **Discriminação auditiva com apoio articulatório** (2 min): "Coloque a mão nos lábios. Sinta o M."
2. **Modelagem explícita** (1 min): a Gabi mostra 3 palavras, aponta o M, diz a regra.
3. **Prática guiada** (3 min): completar lacunas com M ou N, com feedback imediato e **destaque visual** da consoante seguinte.
4. **Prática independente** (3 min): ditado de 5 palavras + 1 frase.
5. **Transferência** (3 min): ler um texto curto e **caçar** o padrão.
6. **Revisão espaçada**: retomar em 1, 3, 7 e 21 dias (ver Seção 11).

---

## 10. Motivação e engajamento

### 10.1 O que a evidência sustenta

**Teoria da autodeterminação (Deci & Ryan):** a motivação intrínseca se sustenta em três necessidades psicológicas básicas — **autonomia** (eu escolho), **competência** (eu consigo) e **vínculo** (alguém se importa). Um app que dá escolhas reais, calibra a dificuldade para o sucesso e tem uma tutora calorosa atende às três. Um app que decide tudo, deixa a criança frustrada e é frio falha nas três.

**Recompensas extrínsecas: cuidado.** A meta-análise clássica de [Deci, Koestner & Ryan (1999)](https://psycnet.apa.org/record/1999-01567-001), com **128 experimentos**, mostrou que **recompensas tangíveis esperadas** (dinheiro, prêmios, "se você fizer, ganha") **reduzem** a motivação intrínseca, especialmente quando contingentadas à tarefa ou ao desempenho. Recompensas **verbais** (elogio) e feedback informativo **aumentam** a motivação intrínseca.

**Tradução para gamificação:**
- ✅ **Barras de progresso, sequências, medalhas de marco, desbloqueio de histórias** — funcionam como *feedback informativo* de competência.
- ✅ **Elogio ao esforço e à estratégia:** "Você tentou de novo e achou o M!" em vez de "Você é inteligente!" (elogio à pessoa cria fragilidade diante do erro).
- ✅ **Escolha real:** qual história ler, qual cor de personagem, quando parar.
- ⚠️ **Moedas/pontos por acerto:** toleráveis em dose pequena, mas **não** devem ser a razão de a criança voltar. Se o app precisa pagar a criança para usar, o design falhou.
- ❌ **Perda de pontos, vidas, cronômetro punitivo, ranking, comparação com outras crianças.**

**Sessões curtas.** A literatura de atenção e carga cognitiva sustenta sessões de **10–15 min** para essa faixa etária, especialmente com dificuldade de leitura (o esforço de decodificar é alto e cansativo). Sessões longas produzem erro por fadiga, que o app interpretaria como "não aprendeu".

**Erro sem punição.** Para a criança com histórico de fracasso escolar, o app precisa ser um lugar onde errar é **seguro**. Cada erro deve gerar uma **dica** e uma **nova tentativa**, nunca uma tela vermelha.

**Senso de competência.** O maior preditor de persistência é a experiência repetida de "eu consigo fazer isso difícil". Isso exige **calibração**: ~80–90% de acerto é a faixa motivacional ótima (**estimativa** baseada em pesquisas de aprendizagem adaptativa; não é uma constante universal).

### 10.2 Carga cognitiva

- **Reduza elementos concorrentes:** pouca animação de fundo, um comando por tela, instrução falada **e** escrita (mas curta).
- **Não sobrecarregue a memória de trabalho:** palavra-alvo visível enquanto a criança tenta; não exigir que ela "lembre" a instrução de 3 telas atrás.
- **Segmentação:** dividir a tarefa em passos pequenos e visíveis.
- **Exemplos resolvidos** antes da prática (I do → we do → you do).

---

## 11. Prática espaçada e revisão de erros

### 11.1 O que a evidência diz

**Efeito de espaçamento:** distribuir a prática ao longo do tempo produz retenção muito superior a concentrá-la. A meta-análise clássica de [Cepeda et al. (2006)](https://eric.ed.gov/?id=EJ742345) (317 experimentos) mostra que o **intervalo ótimo cresce com o intervalo de retenção desejado** — para reter por semanas/meses, espaçar por dias/semanas; para reter por um teste amanhã, espaçar por horas.

**Efeito de teste (recuperação):** recuperar a informação da memória (em vez de reler) produz retenção maior. [Rowland (2014)](https://doi.org/10.1037/a0037559), meta-análise na *Psychological Bulletin*, confirma o efeito de forma robusta. **Ditado e "complete a palavra" são recuperação; reler a palavra não é.**

**Intercalação (interleaving):** misturar tipos de item em vez de blocos. Evidência **forte em matemática**; em leitura/ortografia é **promissora mas mais fraca**. Use com moderação: intercale **dentro** de um domínio já aprendido (ex.: misturar palavras com M/N e R/RR na revisão), não para introduzir conteúdo novo.

### 11.2 Intervalos recomendados (heurística de design)

| Momento | O que revisar |
|---|---|
| **Imediato** (na mesma sessão) | O item errado, 1–2 tentativas extras |
| **+1 dia** | Itens errados da sessão anterior (3–5 itens) |
| **+3 dias** | Itens errados + itens "quase dominados" |
| **+7 dias** | Itens errados + revisão do padrão da semana |
| **+21 dias** | Revisão cumulativa do padrão |
| **+60 dias** | Verificação de retenção (só se ainda não dominado) |

> Esses intervalos são uma **heurística** derivada da literatura de espaçamento, **não** um protocolo validado para alfabetização em português. Calibre com dados: se a criança acerta na revisão de 7 dias, alongue; se erra, encurte para 2–3 dias.

### 11.3 Como implementar em app simples

1. **Um registro por item** (palavra ou correspondência): `acertos`, `erros`, `última_vez`, `proxima_revisao`, `nivel` (0–5).
2. **Fila de revisão** ordenada por `proxima_revisao`, com prioridade para itens **errados recentemente**.
3. **Algoritmo tipo Leitner/ SM-2 simplificado:** acertou → sobe de nível e dobra o intervalo (1, 3, 7, 21, 60 dias); errou → volta um nível e o intervalo cai para 1 dia.
4. **Critério de domínio:** acertar **em 2 sessões diferentes** com pelo menos 1 dia de intervalo, sem dica. Não basta acertar 3× seguidas na mesma sessão (isso é memória de curto prazo).
5. **Limite de revisão por sessão:** 5–8 itens, para não transformar a sessão em "prova".
6. **Revisão "escondida":** apresentar o item errado **dentro de uma atividade nova** (dentro de uma palavra maior, de uma frase, de um texto), não como flashcard repetido.

---

## 12. Sinais de alerta de dislexia e o que os pais devem fazer

> **Reiteração:** este documento e o app **não diagnosticam**. O texto abaixo é orientação para **buscar avaliação**, não para concluir nada.

### 12.1 Definição atual (para os pais entenderem o que se avalia)

A definição adotada pela International Dyslexia Association em **outubro de 2025** descreve a dislexia como uma **dificuldade específica de aprendizagem** caracterizada por dificuldades em **leitura de palavras e/ou ortografia**, que envolvem **precisão, velocidade ou ambas**, variam conforme a ortografia da língua, ocorrem em um **continuum de gravidade** e **persistem mesmo com instrução eficaz para os pares**. As causas são **complexas** (genéticas, neurobiológicas e ambientais), e dificuldades de **processamento fonológico e morfológico são comuns, mas não universais** ([IDA, 2025](https://dyslexiaida.org/definition-of-dyslexia/)).

Três pontos que os pais costumam não saber e que mudam a conversa:
- **Não é "falta de esforço" nem "preguiça".**
- **Não é "visão ruim"** — dislexia não é problema de acuidade visual, e óculos não resolvem.
- **Persistência apesar de boa instrução** é parte da definição — é isso que diferencia de uma dificuldade passageira.

### 12.2 Sinais de alerta aos 8 anos

**Sinais mais consistentes (alto valor de alerta):**
- Leitura **lenta, silabada e trabalhosa** que **não melhora** com prática, apesar de a criança ter tido ensino adequado.
- **Erros de decodificação persistentes** em palavras simples; troca de letras com som parecido.
- **Ortografia muito abaixo** do esperado, com erros que não seguem a progressão normal (ex.: trocas surda/sonora sistemáticas, omissão de sílabas).
- **Dificuldade em nomear letras/sons rapidamente** (velocidade de nomeação).
- **Consciência fonológica fraca:** não consegue dizer com que som começa "sapo", não conta sílabas.
- **Evitação de leitura** e **perda de autoestima** — sinal secundário, mas importante.
- **Histórico familiar** de dificuldade de leitura (fator de risco conhecido).

**Sinais que NÃO são específicos (podem ter outras causas):**
- Letra feia, trocar letras ao escrever rápido, não gostar de ler, preferir vídeo, "não prestar atenção".
- Dificuldade em matemática isolada (pode ser discalculia, outro quadro).
- Cansaço visual ou "letra embaralhada" (investigar visão **à parte**).

**A regra dos "3 N":** a dificuldade é **Não esperada** (a criança é capaz em outras áreas), **Não responsiva** (não melhorou com ensino adequado) e **Não é só escolar** (aparece em casa também). Se os três estão presentes, procure avaliação.

### 12.3 O que os pais devem fazer

1. **Buscar avaliação profissional** — em geral, **fonoaudiólogo** (linguagem escrita) + **neuropediatra** ou **psiquiatra infantil** + **psicólogo/neuropsicólogo** para o perfil cognitivo. No Brasil, o caminho costuma começar pela **escola** e pela **UBS/posto de saúde**, com encaminhamento para o serviço especializado.
2. **Levar registros concretos:** vídeos curtos da criança lendo, amostras de escrita, datas, o que já foi tentado. Isso acelera muito a avaliação.
3. **Pedir avaliação da escola** e verificar se há **plano de apoio pedagógico**.
4. **Conhecer a legislação:** a [Lei nº 14.254/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14254.htm) dispõe sobre acompanhamento integral a educandos com dislexia, TDAH ou outros transtornos de aprendizagem, incluindo diagnóstico e apoio nas escolas.
5. **Consultar a [Associação Brasileira de Dislexia (ABD)](https://www.dislexia.org.br/)** e a [IDA](https://dyslexiaida.org/) para orientação e listas de profissionais.
6. **Continuar ensinando em casa** — a avaliação não substitui a prática diária; ela informa **como** praticar.
7. **Proteger a autoestima:** a criança precisa saber que a dificuldade tem nome, não tem culpa, e tem caminho.

### 12.4 O que NÃO fazer

- ❌ **Não espere "passar a fase".** Aos 8 anos, com instrução adequada e persistência do quadro, "esperar" custa tempo precioso.
- ❌ **Não faça diagnóstico caseiro** (nem por app, nem por questionário de internet).
- ❌ **Não troque avaliação por "treino de olhos", dietas, suplementos, óculos coloridos ou "ginástica cerebral"** — não há evidência que sustente essas intervenções como tratamento de dislexia.
- ❌ **Não force leitura de textos muito difíceis** para "criar resistência" — frustração não ensina.
- ❌ **Não compare com irmãos ou colegas**, nem comente o desempenho na frente da criança.
- ❌ **Não retire a criança de atividades em que ela é boa** para "sobrar tempo para estudar".
- ❌ **Não substitua a escola** — o app é complemento.

---

## 13. Como envolver os pais

### 13.1 O que a evidência sustenta

O WWC tem material específico para **envolvimento familiar em leitura** ([REL Southeast, guias por série](https://ies.ed.gov/ncee/wwc/PracticeGuide/21)), e a recomendação 4 (ler texto conectado todos os dias) é a mais fácil de apoiar em casa. O que funciona:

- **Rotina curta e previsível** — 10–15 min, mesmo horário, sem negociação diária.
- **Leitura compartilhada** — o pai lê, a criança acompanha; ou revezamento (pai lê uma página, criança lê uma frase).
- **Perguntas de compreensão** — "O que você acha que vai acontecer?" "Por que ele fez isso?" — 1–2 perguntas, não um interrogatório.
- **Modelar o prazer de ler** — a criança imita o que vê.
- **Elogio específico ao esforço e à estratégia**, não ao resultado.

### 13.2 O que evitar (e por quê)

| Evitar | Por quê |
|---|---|
| **Pressão por desempenho** ("você já devia estar lendo sozinho") | Aumenta ansiedade, que consome memória de trabalho e piora a leitura |
| **Comparação com irmãos/colegas** | Destrói o senso de competência, que é o motor da persistência |
| **Corrigir cada erro durante a leitura** | Interrompe o sentido e ensina que ler é "não errar" |
| **Usar a leitura como castigo** | Associa leitura a punição |
| **Sessões longas nos fins de semana para "compensar"** | Prática massificada retém menos que prática distribuída |
| **Recompensas materiais por sessão** | Pode minar a motivação intrínseca (Seção 10) |
| **Fazer o dever pelo filho** | Retira a prática, que é o que produz aprendizagem |

### 13.3 Orientação prática para o painel dos pais

O app deve ensinar aos pais, em linguagem simples, **como ajudar sem atrapalhar**:

1. **Sente ao lado, não em cima.** Apoio, não vigilância.
2. **Se a criança travar em uma palavra, espere 3 segundos** e depois diga a palavra. Não deixe sofrer.
3. **"Errou? Ótimo, é uma pista."** Reaja ao erro com curiosidade, não com correção.
4. **Peça que ela explique o que fez.** "Como você descobriu essa palavra?" — metacognição.
5. **Termine sempre no sucesso.** Se a sessão está difícil, pare antes do colapso.
6. **Registre 1 coisa boa por dia.** O app pode sugerir ("Hoje ela leu *sempre* sozinha pela primeira vez").
7. **Não use o app como babá.** 10–15 min com um adulto por perto valem mais que 40 min sozinho.

---

## 14. Como adaptar para a criança com dificuldade

### 14.1 Ritmo

- **Mais tempo no mesmo conteúdo, menos conteúdo novo.** A criança com dificuldade precisa de **mais repetições**, não de um currículo mais rápido.
- **Regra prática:** o item novo só entra quando o anterior está com ~80% de acerto em 2 sessões distintas.
- **Revisão cumulativa obrigatória:** toda sessão começa com 2–3 itens antigos.

### 14.2 Repetição sem tédio

- **Mesma habilidade, contextos diferentes:** a palavra "campo" aparece em caça-palavras, em ditado, em frase, em texto, em áudio.
- **Variação de formato** mantém o engajamento e fortalece a generalização.
- **Evite repetição idêntica** (mesma tela, mesma ordem) — produz memória de tela, não de palavra.

### 14.3 Carga cognitiva

- **Uma coisa por vez.** Instrução falada + demonstração + prática, nessa ordem.
- **Retire pistas concorrentes:** imagens decorativas, música de fundo, animações.
- **Tempo sem pressão.** Cronômetro visível é contraindicado no início.
- **Apoio multimodal:** ouvir + ver + falar + escrever a mesma palavra na mesma lição.

### 14.4 Instrução explícita: I do / we do / you do

Modelo com forte apoio na literatura de instrução explícita (WWC; Archer & Hughes):

| Etapa | O que a Gabi faz | O que a criança faz |
|---|---|---|
| **I do** (modelagem) | "Escuta: c-a-m-p-o. O M vem antes do P porque os dois são dos lábios." | Observa e ouve |
| **We do** (prática guiada) | "Agora juntos: qual letra vem antes do P?" | Responde com apoio |
| **You do** (prática independente) | "Sua vez: escreva *campo*." | Faz sozinha |
| **Verificação** | "Como você sabe?" | Explica a regra |

**Regra de ouro:** a criança nunca deve ser colocada em uma tarefa para a qual não teve modelagem. E a modelagem deve ser **breve** — 1 minuto, não 5.

### 14.5 Resposta à intervenção (RTI) e monitoramento de progresso (CBM)

**RTI** é um modelo em camadas: todos recebem bom ensino (camada 1); quem não responde recebe intervenção mais intensiva e frequente (camadas 2 e 3); a resposta (ou não) à intervenção informa a decisão. Para o app, a tradução é:

- **Camada 1 = a sessão padrão.**
- **Camada 2 = mais tempo no mesmo conteúdo, mais revisão, mais apoio de áudio.**
- **Camada 3 = instrução individualizada em habilidades específicas (ex.: só discriminação surda/sonora).**
- **Dados de progresso decidem a camada** — não o calendário.

**CBM (Curriculum-Based Measurement):** medidas breves e padronizadas, repetidas semanalmente, para ver **inclinação** (taxa de crescimento), não só nível. Para leitura: **WCPM em texto do nível**; para ortografia: **palavras corretas em ditado de 10**; para fônica: **% de acerto por padrão**.

**O que o app deve medir (mínimo viável):**
- WCPM em leitura oral (áudio ou contagem manual do adulto).
- % de acerto por correspondência grafema-fonema.
- % de acerto em ditado por padrão ortográfico.
- Tempo de resposta (latência) — indicador de automaticidade.
- Taxa de acerto em primeira tentativa × após dica — separa "sabe" de "foi ajudado".

**Regra de decisão:** se em **4–6 semanas** de uso regular (≥4 sessões/semana) a inclinação for **plana ou negativa**, o app deve **sugerir aos pais buscar avaliação** — não porque o app diagnostica, mas porque **não resposta a intervenção bem desenhada é, ela mesma, um sinal de alerta**.

---

## 15. Consenso científico × prática comum sem evidência forte

| Afirmação | Status | Comentário |
|---|---|---|
| Instrução fônica sistemática melhora leitura de palavras | **Consenso forte** | NRP, WWC (grau forte), RENABE, meta-análises |
| Consciência fonológica com letras melhora leitura | **Consenso forte** | Efeito menor que o sobre a própria CF, mas real |
| Leitura repetida melhora fluência | **Consenso forte** | Múltiplas meta-análises |
| Ler texto conectado diariamente é necessário | **Consenso forte** | WWC Rec. 4 (grau moderado) |
| Instrução fônica é mais eficaz que linguagem global para iniciantes | **Consenso forte** | d ≈ 0,31 na comparação direta |
| Textos decodificáveis ajudam | **Evidência moderada** | g ≈ 0,20–0,30; efeito pequeno, não nulo |
| Feedback imediato é melhor que diferido para precisão | **Evidência moderada** | Depende do tipo de tarefa |
| Recompensas tangíveis reduzem motivação intrínseca | **Evidência moderada a forte** | 128 experimentos; efeito depende do tipo de contingência |
| Prática espaçada é superior à massificada | **Consenso forte** | Cepeda et al., 2006 |
| Recuperação ativa é superior à releitura | **Consenso forte** | Rowland, 2014 |
| Intercalação melhora aprendizagem em leitura | **Evidência fraca a moderada** | Forte em matemática; em leitura, promissora |
| "Estilos de aprendizagem" (visual/auditivo) | **Sem evidência** | Não use para adaptar o app |
| Treino de olhos / lentes coloridas / dieta tratam dislexia | **Sem evidência** | Não recomendado por nenhuma entidade séria |
| "Método fônico é o único caminho" | **Exagero** | Fônica é necessária, não suficiente; precisa de linguagem, texto, escrita e motivação |
| "Método global é suficiente" | **Contra a evidência** | Não Sustenta para quem tem dificuldade de decodificação |
| Apps substituem professor/terapeuta | **Sem evidência** | Efeito g ≈ 0,36 como **complemento** |
| Caligrafia/letra cursiva melhora leitura | **Evidência fraca** | Pode ajudar na fluência de escrita, não na decodificação |
| "Quanto mais cedo, melhor" sem qualificação | **Parcialmente verdadeiro** | Precocidade importa, mas instrução adequada importa mais que idade |

---

## 16. IMPLICAÇÕES DIRETAS PARA O APP

> Priorização pensada para um MVP que já entrega valor pedagógico real, com complexidade de engenharia controlada. **"Fase 1" = essencial para o produto ser educativo.** "Fase 2" = aprofundamento. "Fase 3" = vantagem competitiva de longo prazo.

### 16.1 Fase 1 — Essencial (sem isso o app não ensina)

**1. Escopo-sequência como espinha dorsal do produto (P0)**
O conteúdo não pode ser uma lista de exercícios; precisa ser um **grafo cumulativo** com pré-requisitos. Cada item de conteúdo tem: `id`, `tipo` (CF, correspondência, palavra, regra ortográfica, texto), `pré-requisitos`, `itens de prática`, `critério de domínio`. **Regra dura:** nenhum texto pode conter grafema não ensinado. Isso é o que separa "app de exercícios" de "app de alfabetização".

**2. Rotina diária de 12–15 min com 5 blocos fixos (P0)**

| Bloco | Tempo | Conteúdo |
|---|---|---|
| 1. Aquecimento fonológico | 2–3 min | 1 tarefa de CF, sempre com letra à vista |
| 2. Fônica explícita (I do → we do) | 3–4 min | 1 elemento novo ou revisão do dia |
| 3. Palavra | 2–3 min | Montar/ler/escrever 3–5 palavras do padrão |
| 4. Leitura | 3–4 min | Texto decodificável curto + 2 releituras (leitura repetida) |
| 5. Ditado + fecho | 2 min | 3 palavras; terminar com uma vitória |

**Por quê:** combina os componentes de maior efeito (CF com letras, fônica, leitura repetida, produção escrita) em dose que cabe em 15 min e respeita a carga cognitiva.

**3. Modelo de erro e fila de revisão espaçada (P0)**
Registrar **tipo de erro** (não só "errou"): troca surda/sonora, M/N, omissão, etc. Cada erro alimenta a fila com intervalo 1→3→7→21 dias. **Critério de domínio:** acerto em 2 sessões distintas, sem dica. Sem isso, o app não individualiza e vira folheto digital.

**4. Feedback corretivo imediato, específico e sem punição (P0)**
- Correção **no nível da palavra/sílaba**; no texto, deixar fluir e corrigir depois.
- Formato: **"Você escreveu X. O som é Y. Vamos ver juntos?"** + destaque visual + áudio.
- **Recast** para erros de leitura: a Gabi repete a palavra correta naturalmente e segue.
- **Zero** telas vermelhas, perda de pontos, "você errou".
- **Dica antes da resposta** (hint hierarchy): dica articulatória → dica visual → resposta. Registrar em qual nível a criança acertou.

**5. Áudio em tudo + botão "me ajuda" (P0)**
TTS para: instrução, modelo de leitura, palavra isolada, sílaba. A criança com dificuldade **precisa** poder ouvir. O botão de ajuda deve estar sempre visível e **não custar nada** (sem penalidade).

**6. Reconhecimento de fala com tolerância e fallback (P0/P1)**
ASR infantil é impreciso, especialmente para criança com dificuldade de leitura. Design defensivo:
- **Nunca** penalizar por falha de reconhecimento.
- Confirmar com o adulto quando a confiança for baixa ("Ela leu *campo*?").
- Usar ASR para **fluência e detecção de erros**, não para "nota".
- Oferecer modo **"adulto conta"** (o pai toca ✔/✘) como alternativa confiável.

**7. Regra M antes de P e B como primeira unidade ortográfica completa (P0)**
Já existe no produto e é a escolha certa: máxima regularidade, explicação articulatória, alta frequência. Entregar com: modelagem articulatória, contraste M/N, banco graduado (Seção 9.5), caça-erros, ditado e transferência para texto.

**8. Sessões curtas, sem comparação, com escolha (P0)**
- 12–15 min, com fim visível ("faltam 2 minutos").
- **Escolha real:** qual história, qual personagem, quando parar.
- **Sem ranking, sem leaderboard, sem comparação com outras crianças.**
- **Elogio ao esforço/estratégia**, variado e específico ("Você tentou outra vez e achou o M").

**9. Medição mínima para os pais (P1)**
- WCPM (via ASR ou contagem do adulto).
- % de acerto por padrão ortográfico.
- Palavras dominadas (com critério de domínio).
- Gráfico simples de **inclinação** (não de "nota").
- **Uma** sugestão acionável por semana ("Esta semana, peça que ela leia *sempre* e *também* em voz alta").

**10. Portal dos pais com o "como ajudar" (P1)**
Rotina de 10–15 min, o que evitar, o que fazer diante de um erro, quando procurar avaliação. Texto curto, não manual.

### 16.2 Fase 2 — Aprofundamento (depois do MVP validado)

- **Fluência com metas adaptativas:** texto do nível, 3–4 repetições, meta de WCPM individual (não normativa), gráfico de progresso da criança.
- **Leitura assistida por áudio com destaque sincronizado** (karaokê): TTS + realce da palavra que está sendo lida. Baixa complexidade, alto efeito percebido.
- **Compreensão:** 1–2 perguntas por texto, literal e inferencial simples; vocabulário novo pré-ensinado.
- **Vocabulário:** palavras novas tiradas dos textos lidos, com definição oral e uso em frase.
- **Produção de texto:** completar frase, ordenar frase, escrever 1 frase sobre a imagem.
- **Banco de textos decodificáveis maior** (30–60 histórias), com controle rigoroso de repertório.
- **Modo offline** e **sincronização** (uso doméstico com internet instável).
- **Acessibilidade:** opção de fonte ampliada, espaçamento entre letras, redução de animações (há relatos de benefício para leitores com dificuldade, mas a evidência é fraca — ofereça como opção, não como "tratamento").

### 16.3 Fase 3 — Diferenciação

- **Adaptatividade baseada em dados:** modelo simples de conhecimento por habilidade (tipo BKT) para decidir o próximo item; substituir regras fixas.
- **Detecção de padrões de erro** e recomendação de intervenção específica ("trocas surda/sonora persistentes → bloco de pares mínimos").
- **Relatório exportável** para fonoaudiólogo/professor (não diagnóstico: descritivo, com dados).
- **Voz mais natural e prosódia expressiva** no TTS (impacto direto em modelagem de fluência).
- **ASR robusto para fala infantil** com confiança calibrada.
- **Personalização de texto** por repertório grafêmico (geração automática de histórias decodificáveis com restrição de grafemas).

### 16.4 O que NÃO fazer (anti-padrões)

| Anti-padrão | Por quê |
|---|---|
| Recompensa material por sessão ("moedas por minuto") | Mina motivação intrínseca |
| Ranking ou comparação entre crianças | Destrói senso de competência |
| "Diagnóstico de dislexia" pelo app | Antiético, fora de escopo, juridicamente arriscado |
| Texto com grafemas não ensinados | Quebra o princípio da decodificabilidade |
| Corrigir todos os erros de uma vez | Sobrecarga cognitiva e desmotivação |
| Cronômetro punitivo / vidas / "game over" | Ansiedade piora leitura |
| Letra cursiva antes de decodificação | Prioridade errada |
| Instrução longa falada (> 3 frases) | Carga cognitiva; a criança para de ouvir |
| Fichas de "treino de olhos" / cores | Sem evidência para dislexia |
| Prometer "alfabetizar em 30 dias" | Irreal e prejudicial |

### 16.5 Métricas de sucesso do produto (pedagógicas, não de vaidade)

| Métrica | Meta inicial (estimativa) | Janela |
|---|---|---|
| Sessões/semana por criança | ≥ 4 | Contínuo |
| Conclusão da sessão | ≥ 80% | Contínuo |
| Acerto em primeira tentativa (itens dominados) | 80–90% | Contínuo |
| Ganho de WCPM | +1 a 2 palavras/semana | 8–12 semanas |
| Retenção em revisão de 21 dias | ≥ 80% | 4–6 semanas após ensino |
| Crianças com inclinação plana em 6 semanas → encaminhamento sugerido | 100% dos casos | Contínuo |

> As metas numéricas são **estimativas de design**, ancoradas nas referências de fluência e CBM da Seção 7, não benchmarks validados para este produto. Ajuste após os primeiros 50–100 usuários.

### 16.6 Ordem de implementação sugerida (roadmap curto)

1. **Semana 1–2:** grafo de conteúdo + modelo de erro + fila de revisão (fundação de dados).
2. **Semana 3–4:** rotina de 5 blocos + fônica explícita + banco M/P/B + feedback corretivo.
3. **Semana 5–6:** TTS integrado + leitura repetida + ASR com fallback.
4. **Semana 7–8:** painel dos pais + métricas + ajuste de dificuldade.
5. **Semana 9+:** textos decodificáveis adicionais, compreensão, fluência com metas.

---

## 17. Limitações desta síntese

1. **A maior parte da evidência experimental vem do inglês.** O português tem ortografia mais transparente e sílaba CV predominante; os **princípios** transferem bem, os **números** (efeitos, WCPM, dosagens) não necessariamente.
2. **Não há normas brasileiras de fluência amplamente validadas** publicadas para uso clínico. As metas da Seção 7 são aproximações.
3. **A literatura sobre textos decodificáveis é menor e mais heterogênea** que a de fônica; o efeito é real, mas modesto.
4. **A literatura sobre gamificação e motivação infantil em apps educacionais** é menos robusta que a literatura sobre instrução. As recomendações da Seção 10 misturam evidência sólida (autodeterminação, recompensas) com princípios de design bem fundamentados, mas não testados especificamente neste contexto.
5. **Este documento não substitui avaliação profissional** nem formação de professores. Ele informa **design**, não diagnóstico nem tratamento.
6. **Vieses de publicação** existem em toda a área; efeitos reais tendem a ser menores que os publicados.

---

## 18. Referências

**Painéis, relatórios e guias de prática**

- National Institute of Child Health and Human Development. (2000). *Report of the National Reading Panel: Teaching children to read*. [NICHD](https://www.nichd.nih.gov/publications/pubs/nrp/findings)
- What Works Clearinghouse / IES. (2016, rev. 2019). *Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade* (Practice Guide). [ies.ed.gov](https://ies.ed.gov/ncee/wwc/PracticeGuide/21)
- Brasil. Ministério da Educação / Sealf. (2020). *Relatório Nacional de Alfabetização Baseada em Evidências (RENABE)*. Publicação institucional do MEC; conteúdos correlatos no [Curso ABC (Avamec)](https://avamec.mec.gov.br/#/instituicao/sealf/curso/12361/informacoes).
- CAPES. (2022). *Programa ABC incentiva a leitura* — Curso Alfabetização Baseada na Ciência. [gov.br/capes](https://www.gov.br/capes/pt-br/assuntos/noticias/programa-abc-incentiva-a-leitura)
- International Dyslexia Association. (2025). *Definition of Dyslexia*. [dyslexiaida.org](https://dyslexiaida.org/definition-of-dyslexia/)

**Meta-análises e revisões**

- Erbeli, F., Rice, M., Xu, Y., Bishop, M. E., & Goodrich, J. M. (2024). A meta-analysis on the optimal cumulative dosage of early phonemic awareness instruction. *Scientific Studies of Reading, 28*(4), 345–370. [ERIC](https://eric.ed.gov/?ff1=subGrade+1&q=Analysis&id=EJ1427043)
- Odo, D. M. (2024). Understanding the effectiveness of decodable texts in developing reading skills. *Literacy*. [Divulgação](https://www.eurekalert.org/news-releases/1049521)
- Jahanaray, A., Kassirian, A., & Jahanaray, M. (2025). Meta-analysis on the effectiveness of computer-assisted technologies on reading and comprehension for elementary students with dyslexia. *Learning Disabilities: A Contemporary Journal, 23*(2), 111–148. [ERIC](https://eric.ed.gov/?id=EJ1492446)
- Stuebing, K. K., Barth, A. E., Cirino, P. T., Francis, D. J., & Fletcher, J. M. (2008). A response to recent reanalyses of the National Reading Panel report. *Journal of Educational Psychology, 100*(1), 123–134. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3024599/)
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. [ERIC](https://eric.ed.gov/?id=EJ742345)
- Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. *Psychological Bulletin, 140*(6), 1432–1463. [DOI](https://doi.org/10.1037/a0037559)
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6), 627–668. [APA PsycNet](https://psycnet.apa.org/record/1999-01567-001)
- Ehri, L. C., Nunes, S. R., Willows, D. M., Schuster, B. V., Yaghoub-Zadeh, Z., & Shanahan, T. (2001). Phonemic awareness instruction helps children learn to read: Evidence from the National Reading Panel's meta-analysis. *Reading Research Quarterly, 36*(3), 250–287. [DOI](https://doi.org/10.1598/RRQ.36.3.2)
- Ehri, L. C. (2014). Orthographic mapping in the acquisition of sight word reading, spelling memory, and vocabulary learning. *Scientific Studies of Reading, 18*(1), 5–21. [DOI](https://doi.org/10.1080/10888438.2013.819356)

**Fluência e prática pedagógica**

- Five from Five. *Fluency* (seção completa: instrução, avaliação, leitura repetida). [fivefromfive.com.au](https://fivefromfive.com.au/fluency/)
- Five from Five. *Assessing fluency* — normas de WCPM (Konza, 2012; Hasbrouck & Tindal). [fivefromfive.com.au](https://fivefromfive.com.au/fluency/assessing-fluency/)
- Five from Five. *Repeated reading*. [fivefromfive.com.au](https://fivefromfive.com.au/fluency/evidence-based-fluency-instruction/repeated-reading/)
- Hasbrouck, J., & Tindal, G. (2017). *Oral reading fluency norms*. [ERIC ED594994](https://files.eric.ed.gov/fulltext/ED594994.pdf)

**Brasil: ortografia, dislexia e política pública**

- Zorzi, J. L. (1998). *Aprender a escrever: a apropriação do sistema ortográfico*. Artes Médicas. (Referência clássica brasileira sobre erros ortográficos; não é estudo experimental.)
- Associação Brasileira de Dislexia (ABD). [dislexia.org.br](https://www.dislexia.org.br/)
- Brasil. *Lei nº 14.254, de 30 de novembro de 2021* — acompanhamento integral a educandos com dislexia, TDAH ou outros transtornos de aprendizagem. [Planalto](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14254.htm)

---

*Documento produzido como base de design pedagógico. Não constitui diagnóstico, prescrição clínica ou substituição de avaliação por profissional habilitado.*
