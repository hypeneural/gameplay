# Auditoria GitHub — Galeria Natalina mobile

**Data:** 06/10/2026.  
**Escopo:** repositórios externos úteis para layout, lightbox, gestos, virtualização e ambientação da Galeria Natalina integrada ao `gameplay`.

Este documento não autoriza dependências automaticamente. Ele classifica cada repositório como **APROVADO**, **CHALLENGER**, **RESERVA** ou **REJEITADO** e define como o Antigravity / FluentGraft 2.19.1 deve validar a integração antes de alterar `apps/play`.

## 1. Restrições do produto que mandam na escolha

A stack existente é React 19 + Vite e já separa Phaser por import dinâmico. `PhotoPrint` centraliza render de fotografia, mas ainda recebe uma única URL por variante. A plataforma ainda modela `PhotoVariant` como `thumb | card | game` e não carrega largura/altura reais por derivado.

A biblioteca escolhida não pode criar uma segunda autoridade de sessão nem conhecer CRM, token, filesystem ou regra de jogo.

O contrato do álbum continua:

- `<600px`: uma foto por linha, proporção natural;
- `600–899px`: duas colunas;
- `>=900px`: duas ou três colunas;
- 6–8 fotos montadas inicialmente no mobile;
- zero Phaser, zero game runtime e zero canvas em `/s/:token/fotos`;
- feed sem `game` antes do lightbox;
- seleção e scroll preservados em Galeria → jogo → Galeria;
- sessão/galeria A nunca mistura estado ou mídia de A2/B.

O corpus real de Natal observado chega a 92 fotos por sessão. Portanto a solução precisa ser eficiente para dezenas de fotos, mas não precisa nascer como um feed virtualizado de milhares de itens.

## 2. Resultado executivo

### Stack aprovada para o primeiro corte

```text
React/Vite existentes
        |
        +-- react-photo-album 3.6.1
        |      layout + srcset/sizes
        |
        +-- GalleryBatchController próprio
        |      6–8 iniciais + lotes limitados
        |
        +-- yet-another-react-lightbox 3.32.2
               lazy chunk + Zoom + preload 1
```

Não adotar um framework novo, router novo ou state manager só para a galeria.

### Challenger

```text
PhotoSwipe 5.4.4
+ react-photoswipe-gallery 4.1.2
```

Executar spike somente se YARL apresentar problema real em Safari/iPhone, zoom, swipe, memória ou transição visual.

### Reservas

- React Virtuoso: somente quando profiler provar que DOM/layout é o gargalo.
- TanStack Virtual: alternativa headless se houver requisito que Virtuoso não cubra; não instalar ambos.
- Motion: apenas para uma microinteração compartilhada que CSS/WAAPI não resolva bem.

### Rejeitados no primeiro corte

- lightGallery: licença comercial/GPL adiciona risco desnecessário.
- tsParticles / snowfall Canvas/WebGL: conflita com zero-canvas e com o objetivo de rolagem fotográfica calma.
- repositórios completos de “Christmas website”: referência visual no máximo; não são donors de arquitetura.

## 3. React Photo Album — APROVADO

Repositório: `igordanchenko/react-photo-album`.

### Evidência

- release estável validada: `3.6.1`;
- React peer: `^18 || ^19`;
- exports separados para core, SSR, scroll e CSS por layout;
- budget declarado do core: 4,25 kB sem React;
- masonry CSS: 0,3 kB;
- release 3.6.1 corrigiu container estreito, ResizeObserver churn e melhorou custo do rows layout;
- repositório mantém exemplo oficial React 19 integrado a YARL.

### Uso permitido

`MasonryPhotoAlbum` pode ser usado para manter um único caminho responsivo de 1/2/3 colunas.

No mobile, `columns=1` não deve aplicar crop. O adapter fornece proporção real e `srcSet` real.

### Uso proibido inicialmente

Não usar `react-photo-album/scroll` com defaults. O helper atual usa:

```text
fetchRootMargin     800px
offscreenRootMargin 2000px
```

Esses valores são agressivos para o nosso orçamento e repetem o padrão de over-fetch já medido na galeria antiga.

O batch continua sendo responsabilidade de `GalleryBatchController` em `apps/play`.

## 4. Yet Another React Lightbox — APROVADO como viewer primário

Repositório: `igordanchenko/yet-another-react-lightbox`.

### Evidência

- release validada: `3.32.2`;
- repositório ativo no corte da auditoria;
- core com limite declarado de 12 kB sem React;
- plugin Zoom com limite de 5,5 kB;
- CSS core com 1,4 kB;
- suporta responsive images e gera `srcset/sizes` a partir de resoluções fornecidas;
- `width` e `height` são parte necessária do caminho responsivo;
- preload é configurável; o default é 2, equivalente a até `2 * preload + 1` slides;
- exemplo oficial do React Photo Album já usa YARL.

### Configuração inicial

```text
lazy chunk         obrigatório
plugins            Zoom somente
carousel.finite    true para sessão finita
carousel.preload   1 no mobile
imageFit           contain
thumbnails         não
slideshow          não
download           não
fullscreen plugin  só se requisito real
```

O array de slides pode conter toda a revisão ativa, mas o DOM da galeria continua progressivo.

## 5. PhotoSwipe — CHALLENGER de mobile

Repositório: `dimsemenov/PhotoSwipe`.

Wrapper React candidato: `dromru/react-photoswipe-gallery`.

### Por que merece spike

- PhotoSwipe possui aproximadamente 25 mil estrelas;
- é projetado para galeria mobile/desktop, touch, swipe e zoom;
- licença MIT;
- aceita `src`, `width`, `height`, `srcset` e `alt` por slide;
- suporta core carregado por `import()` somente quando o viewer abre;
- consegue separar data source de DOM: a coleção pode ter muitas fotos mesmo que poucas estejam montadas no feed;
- preload é configurável;
- o wrapper React está ativo no corte de 2026 e declara React `>=16.8`.

### Por que não substitui YARL agora

- o release estável do core PhotoSwipe continua em `5.4.4`, publicado em 2024;
- o caminho React depende de wrapper adicional ou integração imperativa;
- YARL é React-first, ativo em 2026 e já é usado pelo donor interno `festive-gallery-show`;
- React Photo Album mantém integração oficial com YARL, reduzindo risco de manutenção.

### Regra de decisão

Criar spike YARL vs PhotoSwipe somente se teste físico indicar problema.

Comparar no mesmo corpus e mesma API:

- cold open do viewer;
- swipe repetido;
- pinch/double tap;
- fechamento e restauração de scroll;
- 20 ciclos abrir/fechar sem listeners/DOM persistentes;
- bytes/chunks carregados;
- long tasks;
- Safari/iPhone e Chrome/Android.

Trocar para PhotoSwipe apenas se houver ganho mensurável e sem piorar integração React/history.

## 6. React Virtuoso — RESERVA de virtualização

Repositório: `petyosi/react-virtuoso`.

O projeto é ativo, suporta itens de altura variável, grid e masonry. É tecnicamente adequado a galerias grandes.

Não usar no MVP porque:

- o corpus de Natal observado tem máximo de 92 fotos;
- o app já limita montagem progressiva a 6–8 + lotes;
- virtualização adiciona complexidade em scroll restoration, lightbox index, mudança de colunas e retorno do jogo;
- rede e decode de imagem são problemas mais importantes que 92 wrappers DOM simples.

Abrir PR experimental somente se profiler mostrar long tasks/layout crescente depois de rede e decode estarem controlados.

## 7. TanStack Virtual — RESERVA secundária

Repositório: `TanStack/virtual`.

É headless e oferece medição dinâmica, `initialOffset`, cache de medições e window scrolling. Tem ótimo controle, mas transfere mais responsabilidade para nossa implementação.

Se virtualização for necessária, comparar **Virtuoso vs TanStack Virtual** em spike separado e escolher um. Não carregar dois motores de virtualização.

## 8. lightGallery — REJEITADO por licença no MVP

Repositório: `sachinchoolur/lightGallery`.

Tecnicamente é forte: touch, pinch zoom, responsive images, preload e plugins. Porém o próprio repositório determina licença comercial para projetos proprietários, ou GPLv3 para uso open source compatível.

Não introduzir dependência/licenciamento adicional quando YARL e PhotoSwipe são MIT e cobrem o requisito.

## 9. Motion — NÃO ADICIONAR por default

Repositório: `motiondivision/motion`.

É um projeto muito ativo e maduro para animação React/JS. Mesmo assim, a Galeria Natalina não precisa de um runtime de animação novo no primeiro corte.

O projeto já possui motion tokens, CSS e política de reduced motion. Use primeiro:

- CSS transitions;
- CSS keyframes curtas;
- Web Animations API quando necessário;
- View Transition API como progressive enhancement.

Avaliar Motion somente se surgir uma interação de alto valor que precise de spring/gesture compartilhado e cuja implementação nativa fique mais complexa que a dependência.

## 10. Neve e partículas — NÃO NO FEED

`tsParticles` e bibliotecas similares são maduras, porém usam Canvas e/ou WebGL para partículas contínuas. Isso conflita diretamente com o gate de zero canvas e aumenta competição por GPU/CPU durante uma rolagem longa de fotos.

Para uma futura neve muito discreta, `hcodes/snowflakes` é uma referência melhor que Canvas porque usa animações CSS e máscaras SVG e possui `start/stop/destroy`. Ainda assim, não instalar no primeiro corte.

Direção natalina aprovada:

```text
header/footer  -> arte natalina rica e estática
feed           -> fotografia calma
interação      -> micro brilho/estrela em CSS/SVG por evento
reduced motion -> sem loop decorativo
LOW tier       -> sem loop decorativo
```

## 11. O donor externo mais útil não é um “site de Natal”

A melhor ajuda externa é a dupla do mesmo mantenedor:

```text
igordanchenko/react-photo-album
igordanchenko/yet-another-react-lightbox
```

Ela resolve os problemas genéricos difíceis — layout responsivo, `srcset/sizes`, swipe, zoom e preload — sem ditar sessão, roteamento, autenticação ou identidade visual.

O Natal deve continuar first-party no `gameplay`, em `christmas-shell/gallery`, para preservar provenance, budget e coerência com Hub/jogos.

## 12. Adapter correto para conversar com gameplay

Nenhuma biblioteca externa recebe `Session` integral.

Criar adapters estreitos:

```text
SessionProvider
  -> SessionViewModel
       photoSessionId
       activeRevisionId
       galleryKey
       selectedPhotoId
       photos[]
             |
             +-> GalleryPhotoAdapter -> React Photo Album
             |
             +-> LightboxSlideAdapter -> YARL/PhotoSwipe
             |
             +-> GameContextSeed -> gameplay
```

### GalleryPhotoAdapter

Converte somente:

```text
photo.id
aspect ratio
alt
card/gallery url + width + height
```

### LightboxSlideAdapter

Converte:

```text
photo.id
alt
gallery/game url + width + height
```

### Gameplay bridge

A ação `Jogar com esta foto`:

1. atualiza `selectedPhotoId` no estado da sessão;
2. fecha viewer sem destruir estado da galeria;
3. navega usando o roteador existente para Hub/GameCover/Game;
4. Phaser continua sem ser importado até o runtime do jogo ser solicitado;
5. ao sair, restaura `/fotos` na mesma `photoSessionId + activeRevisionId`, posição e foto.

A biblioteca de galeria nunca chama Phaser nem conhece `GameContext`.

## 13. Evolução necessária do contrato Photo

O contrato atual usa `variants: Record<PhotoVariant, string>`. Isso é insuficiente para responsive images corretas.

Evolução recomendada antes de instalar bibliotecas:

```ts
interface PhotoVariantAsset {
  url: string;
  width: number;
  height: number;
}

interface Photo {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  variants: Record<PhotoVariant, PhotoVariantAsset>;
}
```

Se o benchmark aprovar `gallery=1200`, então `PhotoVariant` passa a incluir `gallery` no mesmo PR da receita/manifesto, não antes.

## 14. Estratégia de performance recomendada

### Primeira tela mobile

- 6–8 fotos no estado renderizado;
- apenas a primeira candidata real ao LCP recebe eager/high priority;
- demais `loading=lazy`, `decoding=async`;
- `card` no contrato atual;
- `card + gallery` somente se 1200 for aprovada;
- dimensões reais reservam layout e evitam CLS;
- sem particle engine;
- sem Phaser;
- YARL não faz parte do chunk inicial.

### Depois do primeiro paint

- observer de margem curta;
- lote adicional pequeno;
- botão `Ver mais` preservado;
- lightbox chunk carregado somente após intenção de abrir foto, ou prefetch em idle apenas se medição justificar.

### Lightbox

- preload 1;
- current + vizinhas necessárias;
- `contain`;
- nunca baixar a coleção inteira em `game`.

## 15. Interatividade natalina de alto valor

Priorizar interações que conectam a fotografia ao gameplay sem manter animação contínua:

- toque na foto abre viewer com zoom/swipe;
- CTA `Jogar com esta foto` usa a mesma `selectedPhotoId` dos jogos;
- compartilhar usa Web Share API quando disponível;
- micro brilho/estrela de confirmação pode usar SVG/CSS por menos de um segundo;
- header pode reagir levemente ao scroll sem parallax contínuo pesado;
- footer pode convidar a voltar aos jogos.

Não transformar cada foto em card de jogo. A fotografia continua sendo o maior elemento e a maior área visual.

## 16. Spike técnico recomendado

Antes do PR de GalleryRoute, executar um spike descartável com a Session fixture realista:

```text
390 / 412 / 430 / 768 CSS px
30 fotos reais anonimizadas/fixtures
92 fotos sintéticas representativas
```

Cenários:

1. RPA + YARL;
2. YARL preload 1;
3. 6 vs 8 fotos iniciais;
4. card 800 vs candidate gallery 1200;
5. 20 ciclos viewer open/close;
6. Gallery → Puzzle → Gallery;
7. A → A2 → B;
8. Android intermediário;
9. Safari/iPhone;
10. PhotoSwipe challenger somente se o cenário YARL falhar ou ficar marginal.

## 17. Decisão para o Antigravity / FluentGraft 2.19.1

Implementar nesta ordem:

1. `PhotoVariantAsset` com dimensões reais;
2. `GalleryPhotoAdapter` e `LightboxSlideAdapter` puros;
3. `GalleryRoute` com batch próprio;
4. React Photo Album 3.6.1;
5. YARL 3.32.2 + Zoom em lazy chunk;
6. `Jogar com esta foto` conectado ao estado/navegação existentes;
7. assets `christmas-shell/gallery` com manifesto/proveniência;
8. benchmark 800/1200/1600;
9. aparelhos físicos;
10. só então decidir PhotoSwipe, virtualização ou biblioteca de animação.

O critério de sucesso não é “a biblioteca funciona”. É o fluxo inteiro permanecer leve, privado e contínuo: **Hub → Galeria Natalina → foto → jogo → mesma Galeria**, sem carregar Phaser no álbum e sem misturar galerias.
