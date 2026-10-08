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

## gallery-ai-v3 (2026-10-08)

- `gallery-ai-evergreen-v1.webp`: **AI-generated raster ornament**, cropped from a generated Christmas UI art direction sheet. Photo-style dense natural pine needles, red velvet bow, glass ornaments and warm lights. Original generation by OpenAI image generation, manually cropped from the ornament-only strip, compressed via Pillow to WebP Q30 (392x64, 3316 B) to fit the existing mobile design budget.
- The artwork is decorative **only**: no photographs, personal names, customer data, text or fake UI controls. The image remains below React-owned headings, buttons, photo count and actions.
- SHA-256: `f4291ed8fc1333c7f92b59cbfc49a6c449d7a67de35d2389a65875e57c346f57`. Git blob SHA: `86a51a57c56f25acbd400a73dd9ff143d3e3cd6b`.
- Because the ornament originates from a cropped 392 px reference, it is deliberately a **soft atmospheric accent** rather than a source of tiny sharp details. Review on DPR2/3 iPhone/Android before using a larger independent AI generation. Preserve the existing SVG fallback.
- The generated concept sheets are not final product screenshots and must not enter public customer media.
