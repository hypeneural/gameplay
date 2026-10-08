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

- `gallery-evergreen-hero-photoreal-v4.webp`: **AI-generated photorealistic evergreen garland**, cropped from high-resolution studio garland banner. Dense natural spruce/fir pine needles, deep ruby red velvet bow, real pinecones, glossy ruby baubles and warm fairy lights. Derived via Sharp alpha-masked crop (392x77, 4908 B, SHA-256 `6a4497f3b249800ff0bf02abc5c2a10e17f676e775f3847e3457d99b2c0d830a`). Fits strictly within the 36.000 B visual shell budget (35.896 B total).
- The artwork is decorative **only**: no photographs, personal names, customer data, text or fake UI controls. The image remains below React-owned headings, buttons, photo count and actions.
- Preserves the existing SVG fallback `gallery-evergreen-hero-v2.svg` via CSS `image-set()`. Review on DPR2/3 iPhone/Android remains pending.
