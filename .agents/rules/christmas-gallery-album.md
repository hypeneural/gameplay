---
trigger: model_decision
description: 'Ative ao editar GalleryRoute, álbum natalino, responsive images, lightbox, batching ou navegação multi-galerias.'
---

# Galeria Natalina mobile-first

Estas regras especializam a integração de photo sessions para o álbum fotográfico.

## Validação Node-first

- Antes de integrar EvydFlow/Python, prove fotos reais + Hub + Galeria + jogos com `pnpm gallery:prepare` e `pnpm gallery:lab` quando a tarefa puder ser exercitada localmente.
- O Gallery Lab é loopback/dev-only; não transforme o middleware Vite em endpoint de produção e não exponha originals, paths ou nomes de fonte ao browser.
- O pipeline de mídia é único. Não replique resize, identidade de receita ou manifesto em Python.
- Quando a internal API de photo sessions existir, prove `prepare -> revision -> upload -> verify -> activate` primeiro por um publisher Node manual. EvydFlow entra depois como orquestrador do mesmo worker e da mesma API.
- Não use FTP, webroot ou JSON estático como ponte temporária para uma publicação real.

## Modelo de galeria

- No MVP, `photoSessionId` é também a identidade canônica de uma galeria pública.
- Uma galeria principal por pedido/CRM; todas as fotos pertencem a mesma lista vertical. Muitos pedidos podem coexistir, mas nao ha subgalerias por pedido.
- Se um contrato legado exigir `galleryKey`, usar valor fixo `principal` ate auditoria de persistencia; nao introduzir mais de uma galeria por pedido.
- Não crie uma segunda tabela/autoridade chamada `gallery` apenas para servir a UI. A galeria é uma projeção da sessão + revisão ativa.
- Cada access token resolve uma única `photoSessionId`/galeria. Grants nunca autorizam "galeria atual" global.
- Hub, Galeria Natalina e jogos usam a mesma `photoSessionId + activeRevisionId`.

## Layout mobile

- Em todos os viewports, use uma coluna e proporcao natural: uma fotografia abaixo da outra.
- Não force `aspect-ratio: 4/5` nem `object-fit: cover` no álbum.
- A fotografia ocupa quase toda a largura útil, com margem pequena e estável.
- Em tablet e desktop, manter a coluna unica com largura maxima confortavel.
- Browser Back/Forward e retorno do jogo devem restaurar a posição exata da galeria.
- Preserve orientação natural de retratos e paisagens; `contain` é obrigatório em hero/lightbox.

## Política de variantes

Receita comprovada existente:

- `thumb`: long edge 480;
- `card`: long edge 800;
- `game`: long edge 1600.

O namespace de derivados deve incluir `sourceHash + recipeKey`, e o manifesto deve registrar `width`, `height` e `byteLength` reais de cada variante. Nome de receita nunca substitui dimensão intrínseca.

Não transforme uma quarta variante em contrato sem benchmark. O candidato preferido para o álbum é:

- `gallery`: long edge 1200, WebP 82, mesma política de auto-orient/sRGB/fit/sem upscale.

Antes de adicionar `gallery`, medir 800 × 1200 × 1600 no corpus real, incluindo retratos e paisagens, bytes, dimensões reais e inspeção visual em Android/iPhone.

Se `gallery` for aprovada:

- grid/feed usa `card + gallery`;
- lightbox usa `gallery + game`;
- jogos continuam usando `thumb/card/game` por papel;
- descritores `srcset` sempre usam a largura intrínseca real.

## Rede e render

Para álbum de uma coluna no mobile:

- comece com 6–8 fotos montadas;
- antecipe somente poucas fotos fora da viewport;
- mantenha fallback explícito "Ver mais";
- não use root margins default agressivos do helper de infinite scroll;
- não ofereça `game` ao feed inicial;
- apenas a foto realmente candidata a LCP pode ser eager/high priority;
- conte requests e bytes reais por variante em E2E.

## Stack externa aprovada

- Manter `SessionGallery`/`PhotoPrint` em coluna única. Não instalar `react-photo-album` (masonry) somente para recriar esta coluna; YARL+Zoom só entra após comparação de gestos/performance com o viewer DOM atual em iPhone/Safari.
- `PhotoSwipe` + wrapper React é challenger de benchmark somente se YARL falhar ou ficar marginal em aparelho físico.
- Não mantenha dois viewers, dois engines de masonry ou dois virtualizers no produto.
- Virtualização só entra após profiling; `lightGallery` e particle engines Canvas/WebGL ficam fora do primeiro corte.
- Nenhuma biblioteca externa recebe `Session`, token ou `GameContext`; use adapters estreitos.

## Assets natalinos

A Galeria Natalina pertence ao owner `christmas-shell`, não a um jogo específico.

Assets compartilhados futuros devem ficar sob:

`apps/play/public/assets/christmas-shell/gallery/`

e entrar no manifesto/proveniência do `christmas-shell`.

Direção:

- header e footer podem ter ambientação natalina mais rica;
- o meio da rolagem é calmo e fotográfico;
- ramo/pinho, estrela, luzes e textura podem enquadrar, nunca atravessar a fotografia;
- moldura pesada repetida em toda foto é proibida;
- neve contínua sobre o álbum é proibida;
- LOW e `prefers-reduced-motion` removem animação decorativa.

Leia também:

- `docs/integrations/photo-sessions/AUDITORIA_NODE_FIRST_GALLERY_LAB_2026-10-06.md`;
- `docs/integrations/photo-sessions/AUDITORIA_GITHUB_GALERIA_NATALINA_MOBILE_2026-10-06.md`;
- `docs/integrations/photo-sessions/GALERIA_NATALINA_MULTI_GALERIAS.md`;
- `docs/quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md`;
- `.agents/skills/christmas-gallery-album/SKILL.md`.

## Decisao atual — 08/10/2026

A galeria fotográfica fica em coluna unica inclusive tablet/desktop. Nao instalar um motor de masonry apenas para trocar este layout. A proposta anterior de A2 no mesmo pedido fica substituida por varias revisoes da mesma galeria principal. As bibliotecas de zoom continuam candidatas de benchmark, nao requisito imediato.

Manual atualizado e ordem de execucao: `docs/integrations/photo-sessions/GALERIA_NATIVE_MOBILE_HANDOFF_2026-10-08.md`.
