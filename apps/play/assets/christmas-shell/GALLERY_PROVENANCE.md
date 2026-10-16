# Gallery native v2 — design and provenance

Original lightweight SVG vectors created for the Estudio Evydencia Christmas gallery and hub (2026-10-08). No client photos, names, orders, private tokens, stock art or third-party fonts are embedded.

## gallery-native-v2

- `gallery-evergreen-header-v1.svg`: transparent decorative pine, warm lights, red ornaments and gold highlights.
- `gallery-starlight-footer-v1.svg`: light-weight starlight edge decoration for the gallery finale.
- `gallery-snowflake-seal-v1.svg`: decorative snowflake badge below each photo, never covering photo pixels.
- `gallery-evergreen-hero-v2.svg`: compact, high-definition evergreen garland hero with gold lights, ruby baubles and Bethlehem star for the top of the album.
- `gallery-header-glow-v1.svg`: ethereal warm radial champagne/amber glow for album hero ambiance without compromising typography contrast.
- `gallery-badge-photo-count-v1.svg`: noble beveled gold and ruby pill medallion framing the dynamic session photo count.
- `gallery-divider-starlight-v2.svg`: refined tapered gold hairline rule with eight-point Star of Bethlehem center.
- `cta-open-album-ribbon-v1.svg`: rich satin holiday ribbon texture with gold stitching and swallowtail star clasps for the primary full-width CTA.
- `cta-album-icon-v1.svg`: crisp vector Christmas photo album icon with star clasp and photo print motif.

These assets are owned by the project, static, responsive, accessible as decorative CSS backgrounds or semantic buttons and disabled as interactive media. The review state indicates structurally ready assets, not physical iPhone/Safari visual approval. Runtime policy preserves reduced motion (static SVGs have no animations).

## gallery-photoreal-v4 (2026-10-08)

- `gallery-evergreen-hero-photoreal-v4.webp`: Substituído na Missão V6 pela variante Retina `gallery-evergreen-hero-retina-v6.webp`.

## gallery-retina-v6 (2026-10-08)

- `gallery-evergreen-hero-retina-v6.webp`: **Guirlanda fotorrealista Retina de alta resolução (640x126 px, 13672 B, SHA-256 `620f1197cc8c46ef4025b44e03d59833014881a65bdb9572f8ccbb3d75bb6cfa`)**, master de IA de 1376x768 em fundo preto sólido, processado via Sharp com máscara alfa suave e fade gradiente nos 30% inferiores. Densidade visual perfeita para telas mobile Retina 2x/3x (390px-430px viewports).
- Substituiu os assets legados não utilizados `gallery-evergreen-header-v1.svg` (9095 B) e `gallery-snowflake-seal-v1.svg` (1176 B), liberando 10271 B de orçamento e mantendo o shell rigorosamente em 34389 B (dentro do teto máximo de 36000 B).
- A arte é decorativa apenas: sem fotos, rostos, textos ou mockups incorporados. Validação em aparelhos físicos mobile pendente.

## gallery-velvet-v1 (2026-10-16)

- `gallery-velvet-side-left-v1.webp` (56x224 px, 4968 B, SHA-256 `4bd4ab4a01f56757547188d76c92a7240509f992f4d04df78be54f60eae070cd`): guirlanda vertical fotorrealista sem emenda (`repeat-y`) com ramos de pinheiro, fita de veludo rubi, pinhas, berries e luzes quentes; despill unpremultiply e borda direita interna com `alpha === 0`.
- `gallery-velvet-frame-corners-v1.webp` (144x144 px, 5716 B, SHA-256 `103cc0a8be66670f78fd4f112341849c0d944f45e21436b3045b0a93b1218d55`): atlas 2x2 de cantos ornamentais independentes (72x72 px por canto: pinheiro/azevinho/pinha/berries em TL/BR e floco barroco dourado 3D em TR/BL) com pontas suavizadas e quadrante interno voltado à foto com `alpha === 0`.
- `gallery-velvet-frame-edges-v1.webp` (144x144 px, 2262 B, SHA-256 `6d90b27c88e2e311eacbf1a087e23d3195e4f0a16cccb5146f1dff1941c3a5ed`): moldura 9-slice (`slice 48`) com aro de ouro champagne 3D, passe-partout marfim aquecido e filete interno candy-cane; janela central `28..115` com `alpha === 0`.
- `gallery-velvet-bottom-v1.webp` (288x58 px, 4510 B, SHA-256 `2917ecd22ee5ce064f7891d1e555a968054b0451174fdd872d54f21fc808d54b`): vinheta inferior fotorrealista em berço U com ramos de abeto, pinhas, bolas rubi/ouro e arabescos dourados sem cortes secos laterais; topo `y=0` com `alpha === 0`.
- Substituiu os cinco SVGs legados da galeria (`gallery-starlight-footer-v1.svg`, `gallery-evergreen-hero-v2.svg`, `gallery-header-glow-v1.svg`, `gallery-badge-photo-count-v1.svg`, `gallery-divider-starlight-v2.svg`), mantendo o total visual do `christmas-shell` em **33916 B / 36000 B** sem elevar limites de orçamento.
