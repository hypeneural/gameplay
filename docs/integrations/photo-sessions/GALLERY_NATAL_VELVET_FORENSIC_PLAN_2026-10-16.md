# Plano P0 corrigido — Galeria Natal Velvet fotorrealista e mobile

> Base forense: PR #33 de `hypeneural/gameplay`, sobre PR #7; revisão 16/10/2026. Estado: **DRAFT, sem deploy/merge**. Este plano substitui os pontos inseguros de `implementation_plan.md` compartilhado pelo Antigravity. Não é certificação de UI fotorrealista.

## Diagnóstico confiável e bloqueios

1. CI da PR #33 antes desta rodada: no commit `35e69d7`, 92 arquivos/460 testes unitários, TypeScript, ESLint, depcruise e Knip aprovados; Prettier de **sete arquivos** bloqueou build/E2E. Ver workflow #38853635511. Commits subsequentes exigem nova evidência.
2. A geometria tinha risco residual: `GalleryFrame` reservava aspecto de `card`/`game`, porém `PhotoPrint` permite browser escolher `thumb` via `srcset` dependendo de DPR e viewport. Variantes têm dimensões arredondadas. A rodada atual informa a razão medida no `onLoad` e permite recomputar somente quando necessária. Compare sempre a imagem **efetivamente decodificada** e a janela, nunca apenas DTO ou nome de receita.
3. `PhotoPrint` não oferecia retry manual; a rodada atual restringe botão de retry ao lightbox (não pode colocar botão dentro de `gallery-card`, que já é botão). Falha persistente/403 exige estado de acesso, não retry infinito.
4. `GalleryMagicButton` mantinha faíscas após conclusão; corrigido com desmontagem no término. `GalleryAtmosphere` e luzes são desligados/pausados em hidden/LOW/calm/lightbox. O estado global de áudio agora alcança a galeria.
5. CSS atual **não se equipara às referências**: bordas laterais derivadas de uma guirlanda de cabeçalho repetida/rotacionada, ornamentos de canto são gradientes, não texturas alpha fotográficas. Moldura visual CSS é fallback, não atlas final.
6. `.agents/rules/christmas-gallery-album.md` tinha veto absoluto a neve/bordas pesadas. Atualizado para experimento medido atrás das fotos, compatível com direção visual solicitada. `.agents/skills/christmas-gallery-album/SKILL.md` menciona decisões históricas de multi-galeria/RPA; a regra vigente de galeria principal única prevalece até revisão formal.

## Regras não negociáveis

- Primeira experiência **first-mobile** em 320, 360, 390, 412 e 430 CSS px e 768 tablet; navegação por teclado, Escape, role/status, safe area, redução de movimento, leitores de tela. `dialog.showModal()` native top-layer.
- **Uma coluna** de fotos, mesmo que mocks artísticos mostrem grade 2-colunas. Cada imagem ocupa janela proporcional (`15:21` / `21:15` usuais, dimensões reais mandatórias), `object-fit: contain`, sem crop, filtro, nitidez artificial ou rosto coberto.
- Decorar **margens e molduras**, nunca pixels fotográficos. Se alpha do asset recobrir a abertura, rejeitar na validação de build. Não prometer "sem canto branco" quando a própria imagem de cliente tem branco incorporado; isolar esse caso.
- Runtime galeria em React/Vite CSS: **sem Phaser, Canvas/WebGL, múltiplos motores de partículas, masonry ou lib de animações global**. Som já existe: `playInterfaceTap`, um canal com mute compartilhado e gesture-only.
- Segurança: `/s/:token/fotos` mantém isolamento entre sessões, histórico, scroll e foto selecionada. Não colocar sessões, tokens ou URLs privadas em telemetria/arquivos públicos.
- Não alterar backend CRM, rotas, `deploy/readiness.json`, budgets ou flags de produção só para cumprir o visual.

## Etapa A — Reparar CI antes de assets

**Não executar `git stash push -u` na branch de release em uso**: preservar alterações de produção. Preferir worktree separado:

```powershell
git fetch origin feat/gallery-christmas-velvet-mobile-20261016
git worktree add ..\\games-gallery-natal -b audit/gallery-velvet-local origin/feat/gallery-christmas-velvet-mobile-20261016
cd ..\\games-gallery-natal
pnpm install --frozen-lockfile
pnpm agent:doctor
pnpm exec prettier --write apps/play/src/app/AppRouter.tsx apps/play/src/components/GalleryMagicButton.tsx apps/play/src/gallery.css apps/play/src/gallery/galleryFrameGeometry.test.ts apps/play/src/screens/SessionGallery.tsx apps/play/src/shell.css docs/integrations/photo-sessions/GALLERY_NATAL_VELVET_HANDOFF_2026-10-16.md
pnpm check:fast
pnpm format:check
```

A lista Prettier deve ser obtida novamente do HEAD atual, pois novos arquivos foram editados. Se worktree já existir, reaproveite-o; não sobrescreva trabalho. Depois push dos consertos ao branch de PR #33 por fast-forward (verifique lease); nada de merge para main.

## Etapa B — Kit visual: fazer engenharia gráfica, não só aumentar CSS

Direção fiel aos mockups: veludo bordô escuro, lâminas de latão champagne, creme aquecido, candy-cane fino, galhos de abeto com agulhas reais, pinhas, frutos vermelhos e fontes de luz minúsculas âmbar. **Os screenshots não são assets; são alvos de comparação.**

Geração de masters **sem** pessoas, fotos, textos, mockups ou fundos. 100% transparency fora das formas:

- Guirlanda vertical left: tile sem emenda, preferencialmente 128x512 RGBA; borda interna transparente, cantos sem grandes laços repetidos.
- Topo: preservar `gallery-evergreen-hero-retina-v6.webp` quando fizer sentido; variante nova opcional, medir benefício real antes de duplicar.
- Moldura: 9-slice completo ou 4 cantos + 4 tiras. Centro com **alpha=0** e safety inset; cantos fora da janela real, raio interno alinhado; não esticar atlas portrait para landscape.
- Rodapé: só se acrescentar mensagem/encerramento sem bloquear fotos, contador ou CTA.
- Luzes: posições determinadas em cima da arte; CSS `opacity` alternado dessincronizado, halo barato pré-assado em textura ou pseudo-elemento estático. Neve sempre em plano atrás dos cards.

Pipeline: masters fora do browser -> Sharp alpha cleanup, crop, resize WebP/AVIF -> teste por amostragem de pixel alpha/9-slice -> medir tamanho real, nitidez em 2x DPR, tile seams, corners -> registro em `christmas-shell/manifest.json`, ASSET_PROVENANCE e GALLERY_PROVENANCE com SHA256. `visualBytesMax=36000` e uso prévio `34389`: não elevar sem evidência de medições, deduplicação e aprovação. **35–55 KB não é garantia de viabilidade.** O fetch de decoração não pode competir com LCP da primeira foto.

## Etapa C — Foto perfeita e loading

- Verifique que `naturalWidth/naturalHeight` do elemento carregado correspondem à janela após escolha de `currentSrc`, sob DPR=1/2/3; se divergência >1% documente e ajuste; não altere `object-fit: contain` para `cover`.
- Reserve dimensões no HTML antes da rede; carregue LCP com eager/high, demais lazy. `srcset/sizes` com descritores reais; pacote visual não deve bloquear CSS/eager route.
- Skeleton marfim/vinho sobre mesmo aspect ratio, shimmer opcional e leve somente quando preferências permitem, sem porcentagem inventada. Erro manual de imagem no lightbox; nunca retry automático ilimitado.
- Testar imagem com margem branca **na própria fonte** separadamente de fresta criada por CSS.

## Etapa D — Gestos, fogos e som

- Manter único DOM viewer lazy. Primeiro provar foco/back/Escape, swipe e estados ao fechar; só depois considerar pinch contínuo 1–3x por Pointer Events, com `touch-action` condicional, clamp, pan e reset ao navegar; fallback funcional em Safari e Android.
- Efeitos no toque não obstruem scroll: 6–12 faíscas finitas, sem canvas/fireworks engine; desmontar após animationend. Som `playInterfaceTap` sujeito a mute global/gesture-only, sem duplicação.
- Áudio/vibração não define sucesso: cada toque responde também visualmente. Testar reduced-motion, LOW, calm, aba oculta e modais.

## Etapa E — Gates de validação (ordem sem loops)

1. `pnpm check:fast`, `pnpm format:check` depois de consertar.
2. `pnpm test:e2e:gallery`, `pnpm test:e2e:gallery-multi` (não rodar pacote de jogos novamente se não foram tocados).
3. `pnpm asset:validate:all`, `pnpm asset:budget` para assets novos.
4. Uma rodada `pnpm check` + `pnpm build` só quando estáveis.
5. Galeria Lab com 15×21 e 21×15, testes em 320/360/390/412/430/768; Playwright e **Safari iPhone/Chrome Android físicos**; fotos claras/escuras com bokeh para provar não-overlap; medir LCP/INP/CLS, bytes, memory, GPU/scroll, requests Phaser=0, CLS <=0.1 lab; campo p75 LCP<=2.5s, INP<=200ms, CLS<=0.1 (metas).
6. Relatório: _ANTES/DEPOIS_ real da branch, outputs PNG, tabela de assets SHA/bytes/alpha, prova de proporção e clipping, gates e arquivos; lacunas explícitas. Não afirmar produção antes desses resultados.

## Referências oficiais

- MDN responsive selection: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc
- MDN dimensions: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalWidth
- MDN 9-slice: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image-slice
- MDN touch gestures: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action
- MDN modal focus: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
- MDN reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- web.dev LCP: https://web.dev/articles/optimize-lcp/
- web.dev compositor: https://web.dev/articles/animations-guide

**Critério de conclusão:** primeiro obter saúde de CI + prova de moldura sem crop, depois demonstrar os novos assets no browser real. Se o resultado visual ainda diferir dos mockups, declarar como incompleto e iterar apenas na arte; não ampliar o escopo para integração CRM ou deploy.
