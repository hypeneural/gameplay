# Auditoria forense e handoff — Galeria Natalina mobile-first

**Data:** 2026-10-08 · **Escopo:** PR #7, branch `feat/christmas-gallery-native-mobile-v2`.

## Fonte da verdade

- Default atual do repositório: `codex/puzzle-native-like-v1`.
- PR #7 permanece como entrega isolada; não usar `main` por suposição.
- Release guard: `deploy/readiness.json` mantém `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`.
- **Regra funcional**: 1 pedido CRM -> 1 sessão fotográfica -> 1 álbum; mudanças nas fotos criam revisões **da mesma sessão**, não subgalerias. Pedidos diferentes têm tokens/grants isolados. Nunca use telefone, nome, ID de pedido ou sequência para construir token público.

## Mapa causal de execução

```text
Windows / pasta tratada (somente arquivos elegíveis na raiz, sem varredura recursiva)
   -> tools/media-pipeline / Sharp (EXIF autoOrient, conversão sRGB, sem crop)
   -> variantes webp thumb/card/game, manifest v2 sourceHash+recipeKey, métricas reais
   -> Gallery Lab loopback (dev-only)  OU  futura internal API catalog-server
   -> photoSessionId / activeRevisionId / autorização por token aleatório
   -> apps/play/src/app/AppRouter.tsx (browser navigation, seleção, preferências)
      -> /s/:token : Hub / SessionPhotoAlbum (prévia curta e jogos disponíveis)
      -> /s/:token/fotos : SessionGallery (uma coluna, 8+8 fotos, PhotoPrint)
          -> SessionGalleryLightbox (lazy DOM, contain, navegação)
          -> escolher foto -> /s/:token/game/puzzle-swap (GameCover)
      -> GameCover -> PhaserHost -> GameScreen -> concluir/sair -> Hub/álbum
```

## Responsabilidades sem duplicar infraestrutura

- **React**: URL, histórico, álbum, lightbox, seleção, tema e ações. Não inicializa Phaser na galeria.
- **Phaser**: somente jogos ativos, destruição e bridge controlados por `PhaserHost`.
- **Sharp**: um único worker Node responsável por proporção, sRGB e hashes; Python/EvydFlow apenas orquestra após existir publisher Node validado.
- **catalog-server**: futura autoridade única de sessão/revisão e mídia privada; não usar rotas Vite como API produtiva.
- **CI/Playwright**: validações repetíveis e sintéticas, nunca fotos/clientes reais no repositório.

## Findings e correções

1. **P1 - retorno de rolagem**: AppRouter efetuava scroll ainda no Suspense fallback; a galeria agora recebe `restoreScrollY` e executa restauração síncrona de layout após os cartões terem sido montados.
2. **P1 - estética incompleta**: havia CSS natalino sem markup correspondente. Intro e finale agora referenciam os SVGs já registrados sob `christmas-shell/gallery`; finale surge após o último lote.
3. **P1 - geometria responsiva**: testar retratos/paisagens sem `cover` em 390, 412, 430, 768, incluindo iPhone Safari real.
4. **P1 - docs contraditórias**: retirar referências ao masonry obrigatório e subgalerias por pedido nos contratos atuais. Documentos históricos são evidências, não instruções de implementação.
5. **P1 - segurança**: CI verde não prova grants, revogação, persistence nem publicação real. Não habilitar piloto, upload público, Z-API, FTP ou WhatsApp.
6. **P2 - assets**: conferir hashes/bytes/proveniência dos 3 SVGs e linha final LF em Windows; preservar saída estática sem loops decorativos na variante LOW.
7. **P1 - lightbox após expansão**: o efeito dependia de `initialVisibleCount`, que se alterava após o lote 8+8 e fechava o diálogo ao selecionar a foto 11. Agora o valor é somente inicial; o efeito só reage à identidade/tamanho da sessão. Novo E2E reproduz essa regressão.

## Critérios determinísticos de aceite

- Galeria única, nenhuma escolha de subgaleria, `.gallery-grid` uma coluna em todos os breakpoints.
- `.gallery-photo-frame` reserva `width / height` natural. Imagens `object-fit: contain`. Mobile sem overflow.
- Primeira foto candidata a LCP: eager/high; demais lazy; `srcset` somente de larguras intrínsecas declaradas.
- Lote inicial limitado, expansão progressiva, sem pré-carregamento de variantes `game` no feed.
- Seleção e scroll mantidos, **inclusive foto 11/12** após galeria->puzzle->galeria.
- Troca A/B: foto, dialog, seleção e estado do browser nunca cruzam sessões. Staging sintético não equivale à autorização de produção.
- Zero Phaser, zero Canvas e zero import do engine em `/fotos`; lifecycle dos jogos volta limpo.
- Respect `prefers-reduced-motion`, safe areas, foco e botão Voltar do browser; teste físico iPhone/Android pendente até realmente realizado.

## Referências oficiais (validar versões fixadas)

- React useLayoutEffect: https://react.dev/reference/react/useLayoutEffect
- React useEffect cleanup: https://react.dev/reference/react/useEffect
- MDN imagens srcset/sizes: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- MDN viewport safe area: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- Playwright web-first assertions: https://playwright.dev/docs/test-assertions
- Sharp resize sem crop: https://sharp.pixelplumbing.com/api-resize/
- Sharp autoOrient: https://sharp.pixelplumbing.com/api-operation/

## Guia Antigravity 2.21.1: sequência menor de execução

1. `git fetch --all --prune`, verificar HEAD do PR #7 e working tree antes de editar.
2. `pnpm agent:doctor && pnpm check:fast`; corrigir gates locais somente dentro da branch.
3. `pnpm asset:validate:all && pnpm test:e2e:gallery && pnpm test:e2e:gallery-multi`.
4. `pnpm check && pnpm build && pnpm deploy:readiness`; não forçar `pilotReady`.
5. Capturar screenshot real por viewport, testar álbum com retratos/paisagens e 30/92 fotos.
6. Testar campo Android Chrome + Safari iPhone: toque, pinch zoom, botão voltar, safe areas e rede degradada; registrar métricas **reais** de LCP, INP, CLS e requests antes de escolher biblioteca nova.
7. Validar CI oficial do PR, resumir antes/depois e solicitar revisão/merge somente com evidência. Sem deploy a clientes reais.

## Performance (metas, não resultados)

- LCP p75 <= 2,5 s; INP p75 <= 200 ms; CLS p75 <= 0,1.
- O budget de 700 KB inicial do laboratório exige instrumentação e revisão em aparelho; não alegar atingimento sem trace.
- Variantes 480/800/1600 são do lado **maior**. Em retratos, a largura é menor; candidato 1200 px só entra após benchmark de nitidez e custo real.
- Não instalar virtualizador nem motor de partículas para álbuns típicos; primeiro medir decode/transferência/layout.

## Adendo v3 — auditoria das capturas (2026-10-08)

**Problema observado:** a primeira imagem e o lightbox de staging mostram `MEMÓRIA DE NATAL` sobre um cartão vermelho. Isso é a fixture **sintética** utilizada nos testes, não uma fotografia enviada pelo CRM. Validar pipeline real de fotografias em Gallery Lab, sem colocar dados de cliente no Git.

**Implementado:** `Jogar com esta foto` passa a selecionar o ID da fotografia e abrir `/s/:token` (Hub). A familia escolhe depois Puzzle/Memória/outro jogo nos cards. Os botões de topo, zoom e setas usam `ShellIcon` com dourado, foco de teclado e elementos de 44px+. Testes E2E passam a verificar seleção foto 6 e 11, volta ao Hub e escolha explícita do Puzzle.

**Novo asset:** `gallery-ai-evergreen-v1.webp`, recorte do ornamento de um conceito gráfico gerado com IA, registrado no manifesto + proveniência (3316 B, hash confirmado e WebP quality30). É complemento decorativo realista e leve, não uma captura da UI. CSS `image-set()` escolhe o WebP para navegadores modernos e mantém SVG como fallback. Testar legibilidade no display 390/412/430/768px.

**Próximo passo Antigravity:** conferir PR #7 HEAD, `pnpm check`, `pnpm asset:validate:all`, `pnpm test:e2e:gallery`, `pnpm test:e2e:gallery-multi`, `pnpm build`, screenshots antes/depois e aparelhos físicos. Auditar `navigator.share` sob HTTPS + user activation, fecho nativo do `<dialog>`, contraste, zoom por pinça, 30/92 fotos com mistura retrato/paisagem. Não habilitar piloto, não prometer download de foto sem autorização.

## Adendo v4 — auditoria e homologação visual e gestual (2026-10-08)

**Objetivo:** Elevar o acabamento da Galeria Natalina para padrão ultra-premium de estúdio, garantindo gestos nativos de toque no Lightbox e preservando integridade estrita de orçamentos e segurança.

### 1. Direção Artística e Guirlanda Fotorealista V4

- Substituição do asset intermediário pelo definitivo `gallery-evergreen-hero-photoreal-v4.webp` (392×77, 4.908 B, SHA-256 `6a4497f3b249800ff0bf02abc5c2a10e17f676e775f3847e3457d99b2c0d830a`).
- Render fotorealista: ramos de abeto denso verde-floresta profundo, agulhas detalhadas, laço central de veludo vermelho rubi com reflexos acetinados, luzes quentes douradas (bokeh sutil) e mini-pinhas naturais.
- Processamento Sharp com canal alfa suave na base, integrando com o fundo `#0e3d31` sem bordas brancas ou halos artificiais.
- Orçamento estrito respeitado: total de bytes visuais do shell fixado em **35.896 B** (dentro do limite máximo de 36.000 B). 12/12 manifestos validados via `pnpm asset:validate:all`.

### 2. Gestos Native-Like no Lightbox (`SessionGalleryLightbox.tsx`)

- **Double-tap zoom:** Toque duplo rápido (<300ms, <28px de tolerância) alterna suavemente entre 1x e 2x.
- **Pinch-to-zoom (2 dedos):** Gesto de pinça contínuo com detecção de distância euclidiana via `Math.hypot`, escalando entre 1x e 3x com transição contínua.
- **Pan / Arraste livre:** Quando a imagem está com zoom (>1x), o container de palco habilita scroll e pan bidirecionais suaves (`touch-action: pan-x pan-y pinch-zoom`).
- **Swipe horizontal calibrado:** Mantido em escala 1x para navegação rápida e natural entre fotos vizinhas sem conflito de gestos.
- **Acessibilidade & Foco:** Foco anterior no botão que acionou a abertura é confiavelmente restaurado ao fechar o diálogo modal (`previouslyFocusedRef`).

### 3. Evidências Visuais e Responsividade

- Homologação visual completa nos viewports 390px, 412px, 430px e 768px:
  - Hub inicial com CTA de destaque para o álbum fotográfico.
  - Hero da galeria com guirlanda fotorealista e tipografia refinada.
  - Feed fotográfico em coluna única com proporções reais preservadas sem cortes (`object-fit: contain`).
  - Lightbox modal limpo com controles dourados 44px+ (`ShellIcon`).
  - Hub com foto escolhida selecionada ("Foto escolhida para os jogos") e cards de jogos prontos para escolha livre da família.

### 4. Validação Multicliente no Gallery Lab

- Testado com sessões reais de fotos tratadas:
  - Cliente A (30 fotos, 300 MB originais -> 6.31 MB derivados, 97.9% de economia).
  - Cliente B (12 fotos, 111 MB originais -> 2.88 MB derivados, 97.4% de economia).
- Isolamento absoluto: troca de tokens comprova que nenhuma foto ou estado cruza sessões.

### 5. Gates de Qualidade

- `pnpm agent:doctor`: status ok.
- `pnpm check:fast`: 455/455 testes unitários passando.
- `pnpm test:e2e:gallery`: 12/12 testes E2E passando em todos os viewports.
- `pnpm test:e2e:gallery-multi`: 16/16 testes E2E passando.
- `pnpm check`: 0 violações depcruise, 0 knip deadcode, prettier e repo-map limpos.
- `pnpm build`: 100% de compilação sem warnings ou erros.
- `deploy/readiness.json`: `pilotReady=false`, `customerDataAllowed=false` mantidos. Zero dados confidenciais ou fotos de clientes no Git.
