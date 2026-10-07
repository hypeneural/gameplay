---
name: christmas-gallery-album
description: Implemente e valide a Galeria Natalina como álbum mobile-first integrado a photo sessions, jogos e múltiplas galerias isoladas.
---

# Christmas Gallery Album

Use esta skill ao implementar ou revisar `GalleryRoute`, `PhotoPrint`, lightbox, responsive images, assets natalinos compartilhados ou suporte multi-galerias.

## Leitura obrigatória

1. `AGENTS.md`.
2. `.agents/rules/photo-sessions-integration.md`.
3. `.agents/rules/christmas-gallery-album.md`.
4. `docs/integrations/photo-sessions/GALERIA_NATALINA_MULTI_GALERIAS.md`.
5. `docs/integrations/photo-sessions/AUDITORIA_GITHUB_GALERIA_NATALINA_MOBILE_2026-10-06.md`.
6. `docs/integrations/photo-sessions/AUDITORIA_FORENSE_ANTIGRAVITY_MOBILE_2026-10-06.md`.
7. `docs/quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md`.
8. `docs/experience/christmas/ART_BIBLE.md`.
9. `docs/experience/christmas/SCENE_GRAMMAR.md`.
10. `docs/assets/ASSET_MANIFEST_CONTRACT.md`.

Não escolha uma dependência pela popularidade. Use a classificação do audit GitHub: RPA + YARL são o caminho aprovado; PhotoSwipe é challenger; virtualização é reserva; lightGallery/particle engines não entram no primeiro corte.

## Ordem de implementação

### 1. Feche o contrato de dados

Antes de CSS, garanta:

- sessão real, sem fixture em produção;
- `photoSessionId`, `activeRevisionId` e `galleryKey`;
- dimensões reais por variante;
- autorização de mídia por sessão/revisão/photoId;
- abort/cleanup quando a rota troca de galeria.

### 2. Prove multi-galerias

Monte fixtures A, B e A2:

- A e A2 podem compartilhar o mesmo `crmOrderUuid`, mas têm `galleryKey` distinto;
- B pertence a outro contexto;
- token A nunca resolve B ou A2;
- abrir A → B → voltar não reutiliza seleção, lightbox ou scroll de outra galeria;
- duas abas com galerias distintas permanecem isoladas.

### 3. Construa o álbum mobile primeiro

Em 390/412/430:

- uma coluna;
- proporção natural;
- sem crop;
- margem pequena;
- 6–8 fotos no primeiro lote;
- header sticky/compacto quando necessário;
- fotografia é o maior elemento visual.

Só depois valide 600–899 em duas colunas e desktop/tablet.

### 4. Responsive image

Não invente descritor pela receita.

Use width/height reais de cada derivado.

Primeiro MVP sem quarta variante:

- feed: `card`;
- lightbox: `card + game`.

Experimento preferido:

- benchmark `gallery=1200`;
- se aprovado, feed: `card + gallery`;
- lightbox: `gallery + game`.

Não altere `game=1600` globalmente antes de medir jogos reais.

### 5. Layout

Use `react-photo-album@3.6.1` no primeiro corte.

- importe somente o layout/CSS necessário;
- `columns=1` no mobile preservando proporção natural;
- batch continua no app;
- não use `react-photo-album/scroll` com os root margins default;
- não introduza outro masonry engine em paralelo.

### 6. Lightbox

Use `yet-another-react-lightbox@3.32.2` + Zoom em módulo lazy.

No mobile:

- `carousel.preload: 1` inicialmente;
- `contain`;
- swipe e pinch-to-zoom;
- fechar retorna ao mesmo ponto do álbum;
- plugins extras ficam fora até requisito real.

PhotoSwipe + `react-photoswipe-gallery` só entra em spike se YARL falhar ou ficar marginal em aparelho físico. Não mantenha dois viewers no produto.

### 7. Integração com gameplay

Mantenha adapters puros entre plataforma e biblioteca:

- `GalleryPhotoAdapter` converte `Photo` para o shape do layout;
- `LightboxSlideAdapter` converte `Photo` para slides;
- nenhuma biblioteca externa recebe `Session` integral, token ou `GameContext`;
- `Jogar com esta foto` atualiza `selectedPhotoId` e navega pelo roteador existente;
- Phaser só importa quando o runtime do jogo for solicitado;
- retorno do jogo restaura a mesma sessão/revisão, foto e scroll.

### 8. Assets natalinos

Não reutilize um asset de Puzzle como dependência permanente do shell.

Se criar arte de galeria:

- owner `christmas-shell`;
- diretório `public/assets/christmas-shell/gallery/`;
- manifesto v2 + proveniência;
- package pequeno;
- decoração fora da foto;
- sem partículas/loops pesados durante scroll;
- prefira SVG/CSS e arte estática;
- não introduza Canvas/WebGL para neve no feed.

### 9. Jogos

Não mude todos os jogos por causa da galeria.

Preserve a política de papel:

- hero/puzzle: `game`;
- cartas/secundárias: `card`;
- picker: `thumb`.

Audite especialmente Guirlanda: não manter seis texturas `game` quando uma hero + secundárias `card` resolve a cena.

## Gates

Durante iteração:

```bash
pnpm check:fast
```

Antes de handoff:

```bash
pnpm validate
```

Evidências obrigatórias:

- 390, 412, 430 e 768 CSS px;
- resource requests classificados por variante;
- zero Phaser/game chunk/canvas em `/fotos`;
- nenhuma imagem do feed usando `game` antes do lightbox;
- YARL em lazy chunk, não no bundle inicial da GalleryRoute;
- Gallery A/B/A2 isolation;
- três ciclos Gallery → Puzzle → Gallery;
- 20 ciclos lightbox open/close sem crescimento persistente de DOM/listeners;
- Android físico e Safari/iPhone antes de piloto.

## Handoff

Registre:

- layout aprovado por faixa;
- variante usada em feed/lightbox;
- resultado do benchmark 800/1200/1600, quando executado;
- bytes/requests iniciais;
- chunks JS carregados antes/depois de abrir viewer;
- assets natalinos adicionados e budget;
- cenários multi-galerias exercitados;
- se PhotoSwipe challenger foi necessário e por quê;
- evidência que ainda falta.
