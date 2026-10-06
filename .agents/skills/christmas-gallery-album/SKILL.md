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
5. `docs/integrations/photo-sessions/AUDITORIA_FORENSE_ANTIGRAVITY_MOBILE_2026-10-06.md`.
6. `docs/quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md`.
7. `docs/experience/christmas/ART_BIBLE.md`.
8. `docs/experience/christmas/SCENE_GRAMMAR.md`.
9. `docs/assets/ASSET_MANIFEST_CONTRACT.md`.

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

### 5. Lightbox

Use `yet-another-react-lightbox` + Zoom em módulo lazy.

No mobile:

- `preload: 1` inicialmente;
- `contain`;
- swipe e pinch-to-zoom;
- fechar retorna ao mesmo ponto do álbum.

### 6. Assets natalinos

Não reutilize um asset de Puzzle como dependência permanente do shell.

Se criar arte de galeria:

- owner `christmas-shell`;
- diretório `public/assets/christmas-shell/gallery/`;
- manifesto v2 + proveniência;
- package pequeno;
- decoração fora da foto;
- sem partículas/loops pesados durante scroll.

### 7. Jogos

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
- Gallery A/B/A2 isolation;
- três ciclos Gallery → Puzzle → Gallery;
- Android físico e Safari/iPhone antes de piloto.

## Handoff

Registre:

- layout aprovado por faixa;
- variante usada em feed/lightbox;
- resultado do benchmark 800/1200/1600, quando executado;
- bytes/requests iniciais;
- assets natalinos adicionados e budget;
- cenários multi-galerias exercitados;
- evidência que ainda falta.
