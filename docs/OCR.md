# OCR do Modo livro: como funciona e como ajustar

Foto → texto → conferência → leitura. Este documento explica cada etapa e os pontos de ajuste.

## 1. Imagem

`preprocessImage(file, maxW = 1700, mode = 'normalize')` em `app/js/screen-book.js`:

1. redimensiona para até 1700 px de largura (fotos de celular ficam nítidas para o Tesseract);
2. converte para cinza;
3. **normaliza a iluminação**: desfoca a página inteira (fundo) e divide cada pixel por esse fundo — é o que recupera a margem direita, que costuma ficar na sombra;
4. aplica **Otsu** (limiar global) sobre a imagem normalizada.

Modos disponíveis: `normalize` (padrão), `otsu` (antigo, sem correção de luz) e `sauvola` (limiar local; testado e pior na prática).
Ferramenta de comparação: `node tools/ocr-compare.mjs assets/pagina-teste.jpg`.

## 2. Texto do Tesseract

`worker.recognize(canvas, {}, { text: true, tsv: true })` — o **TSV** traz a confiança de cada palavra (0–100).
`parseTsvLines()` agrupa as palavras por linha e calcula a confiança média da linha.

## 3. Filtro de linhas e ruído de borda (`sanitizeOcr` + `stripLineEdgeNoise`)

`sanitizeOcr(text, lines)`:

- **poda de borda por distância horizontal e confiança (`stripLineEdgeNoise`)**: usa coordenadas `left`/`width` e confiança por palavra do TSV para descartar espiral de caderno à esquerda (`Ca`, `E A Fa EE cm`, `RO E FE á rm`), ilustrações à direita (`E Debe;`) e siglas maiúsculas perdidas no meio de frases;
- descarta linha com menos de 2 palavras ou menos de 4 letras;
- descarta linha com confiança **< 58** (rabiscos manuscritos e ilustrações ficam entre 17 e 55; texto impresso fica entre 75 e 96);
- descarta rodapés/cabeçalhos de livro didático (`Acervo Editora...`, `LEITURA`, `ATIVIDADE`, `LÍNGUA PORTUGUESA`, `Para Casa`);
- descarta linha onde mais de 60% das palavras começam com maiúscula sem corpo de frase (`SUN À Fara Cara A`);
- mantém títulos curtos de história (`Um presente inesperado`, `PLANTA-SE UMA ÁRVORE`).

## 4. Corretor de dicionário (`app/js/ocr-fix.js`)

Lista embarcada: **12.000 palavras mais frequentes do português brasileiro** (`wordlist-pt.js`, 94 KB, offline).
Fonte: [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018), licença MIT.
Gerar de novo: `node tools/build-wordlist.mjs` (lê `tools/data/pt_br_50k.txt`).

### Passe 1 — por palavra, com confiança
Só troca quando **todas** valem:

| Regra | Motivo |
| --- | --- |
| palavra fora da lista | se é palavra comum, não mexe |
| confiança < 85 | OCR confiante não é contrariado |
| começa com minúscula | preserva nomes próprios (Aslam, Nárnia, Digory) |
| sem hífen/apóstrofo/dígito (salvo 0→o, 1→l, 5→s) | evita estragar palavras compostas |
| um único vizinho de distância 1 e entre as 6.000 mais comuns | evita troca ambígua |
| no máximo 8 correções por página | evita “corrigir” a página inteira |

### Passe 2 — no texto já montado
- junta palavra cortada por hífen com a continuação ilegível: `cora-` + `8em` → testa `corabem`/`coragem` → **coragem**;
- conserta dígito dentro de palavra quando só uma leitura existe (`c0m` → `com`);
- corrige palavra desconhecida com **um único** candidato comum (`ralvez` → `talvez`);
- exceção para letra dobrada (`ammosfera` → `atmosfera`).

### O que o corretor NÃO faz
- não corrige gramática: “com **à** vibração” (crase), “**Às** fisionomias” (As), “rispidez **é à** astúcia” (e a);
- não adivinha nomes próprios nem palavras cortadas pela curvatura da página;
- não substitui a conferência do adulto — só reduz o que ele precisa digitar.

## 5. Ferramentas de teste

| Comando | O que faz |
| --- | --- |
| `node tools/ocr.mjs [foto]` | roda o OCR real do app e imprime texto limpo + bruto |
| `node tools/ocr-words.mjs [foto]` | mostra a confiança de cada palavra |
| `node tools/ocr-compare.mjs [foto]` | compara os três modos de pré-processamento |
| `node tools/explore-text.mjs arquivo.txt` | lista palavras desconhecidas e o que o corretor faria |
| `npm test` | inclui `tests/ocr.test.mjs` (14 casos do corretor) |

## 6. Ajustes rápidos

Em `screen-book.js`: `MIN_LINE_CONF` (58) e `maxW` (1700).
Em `ocr-fix.js`: `CONF_LIMIT` (85), `MAX_RANK` (6000), `MARGIN` (3), `MAX_FIXES` (8).
Depois de mudar, rode `node tools/ocr.mjs assets/pagina-teste.jpg` e confira o texto.
