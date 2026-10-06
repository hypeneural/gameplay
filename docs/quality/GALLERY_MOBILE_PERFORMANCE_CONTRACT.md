# Gallery mobile performance contract

Este contrato define o que "galeria rápida" significa para
`/s/:token/fotos`. Ele separa invariantes determinísticas, budgets de laboratório e
metas de campo.

## 1. Escopo

Aplica-se a:

- `GalleryRoute`;
- grid/masonry;
- `PhotoPrint` quando usado na galeria;
- lightbox;
- restauração de scroll;
- requests de mídia privada;
- transição galeria <-> jogo.

Não mede FPS de Phaser enquanto um jogo está ativo.

## 2. Invariantes determinísticas

Uma execução de Playwright em `/s/:token/fotos` deve provar:

1. nenhum request de Phaser;
2. nenhum request de chunk runtime de jogo;
3. nenhum `canvas` no DOM;
4. nenhum request de variante `game` antes de abrir hero/lightbox;
5. token inválido não renderiza fixture;
6. sessão A não renderiza foto, revisão ou seleção da sessão B;
7. abrir/fechar lightbox não muda 1, 2 ou 3;
8. não há overflow horizontal em 390, 412, 430 e 768 CSS px.

## 3. Contrato de imagem

O DTO público fornece, para cada variante usada pelo browser:

```text
url
width
height
```

O adaptador da galeria cria `srcset` somente com larguras intrínsecas reais.

Grid inicial:

```text
candidatos = thumb + card
game       = proibido
loading    = lazy por default
decoding   = async
```

Lightbox:

```text
candidatos = card + game
fit        = contain
preload    = 1 no mobile inicialmente
```

Somente o recurso realmente candidato a LCP pode usar `eager` e prioridade alta.

## 4. Renderização progressiva

Primeiro corte:

- montar 8 a 12 tiles;
- buscar/renderizar lote seguinte de forma limitada;
- manter botão "Ver mais" como fallback;
- se houver IntersectionObserver, usar antecipação curta e medir requests;
- não usar os margins padrão do `react-photo-album/scroll` sem uma medição que os
  aprove.

O smoke da galeria legada mostrou que observer + lote nominal pode, na prática,
aproximar o carregamento da coleção inteira em um viewport mobile. Por isso o gate é
número de requests/bytes, não apenas `visibleCount`.

## 5. Bibliotecas

Primeiro corte aprovado:

```text
react-photo-album
  -> MasonryPhotoAlbum
  -> masonry.css
  -> layout + srcset/sizes

yet-another-react-lightbox
  -> lazy SessionLightbox
  -> core + Zoom
```

Não importar lightbox estaticamente no módulo da GalleryRoute.

Não introduzir virtualização no primeiro corte. Se perfis de sessões grandes
mostrarem DOM/layout como gargalo, avaliar `@virtuoso.dev/masonry` numa PR
experimental separada.

## 6. Budgets de laboratório

Estes valores são budgets de engenharia do MVP, não resultados já medidos em campo.

- tiles montados inicialmente: 8–12;
- Phaser requests: 0;
- game-runtime requests: 0;
- canvas: 0;
- `game` no grid inicial: 0;
- lightbox preload mobile: corrente + no máximo uma vizinha de cada lado quando a
  biblioteca exigir;
- transferência de imagem antes da interação: alvo inicial <= 700 KB no corpus de
  teste de 30 fotos;
- CLS no laboratório: <= 0,1;
- nenhuma imagem sem dimensões conhecidas.

O budget de 700 KB deve ser revisado depois de capturas em rede móvel real. Ele é uma
meta inicial derivada do tamanho médio medido de thumb/card, não uma garantia de
produção.

## 7. Metas de campo

No percentil 75, separado ao menos por mobile e desktop:

- LCP <= 2,5 s;
- INP <= 200 ms;
- CLS <= 0,1.

Não declarar aprovação de campo a partir de um Lighthouse isolado.

## 8. Cenários de Playwright

Criar cenários dedicados para:

1. primeira visita, cache vazio;
2. reload direto de `/fotos`;
3. scroll até fim;
4. abrir foto central, avançar, voltar e fechar;
5. compartilhar/copiar link quando suportado;
6. Gallery -> Puzzle -> Gallery;
7. três ciclos Gallery -> Puzzle -> Gallery;
8. token inválido;
9. token revogado durante uso;
10. sessão A seguida de sessão B na mesma aba;
11. duas abas com sessões distintas;
12. portrait/landscape misturados;
13. coleção de 30 fotos;
14. coleção grande sintética, antes de considerar virtualização.

Em cada cenário relevante, capturar resource entries e classificar por variante.

## 9. Aparelhos físicos

Antes do piloto comercial, validar no mínimo:

- Android intermediário com Chrome;
- iPhone/Safari;
- portrait;
- mudança de orientação;
- conexão móvel degradada;
- gesto de voltar;
- safe areas;
- pinch-to-zoom;
- teclado/foco quando aplicável;
- reduced motion.

Viewport Chromium emulado não substitui Safari/iPhone físico.

## 10. Sinais para virtualização

Só abrir uma PR de Virtuoso quando o profiler mostrar pelo menos um destes sintomas em
coleção real ou representativa:

- custo de layout cresce materialmente com itens já fora da tela;
- long tasks durante scroll;
- DOM se torna o gargalo dominante depois de imagens/rede estarem controladas;
- restauração de scroll fica lenta por quantidade de nós.

Não escolher um número fixo de fotos como justificativa única.

## 11. Instrumentação

No laboratório registrar:

- quantidade de requests por variante;
- bytes transferidos;
- LCP/CLS/INP quando disponíveis;
- long tasks;
- resource timing;
- contagem de canvas;
- chunks JS carregados;
- número de tiles montados;
- posição de scroll antes/depois do jogo.

Não registrar token, telefone, CRM, path local ou URL privada completa em analytics.
