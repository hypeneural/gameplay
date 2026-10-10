# Prévia social genérica — Estúdio Evydência

Esta arte é usada somente para a prévia social padrão do catálogo. Ela não
contém fotografia, nome, sessão, telefone ou outro dado de cliente.

| Campo             | Registro                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Papel             | Prévia Open Graph genérica do catálogo de jogos de Natal                                                                   |
| Arte-fonte        | `assets-src/catalog-social/evydencia-christmas-v1.png`                                                                     |
| Entrega otimizada | `apps/catalog-server/public/social/evydencia-christmas-v1.webp`                                                            |
| Origem            | Criada para este projeto, via ImageGen integrado em 2026-08-25                                                             |
| Receita           | Ilustração original de vila natalina brasileira ao anoitecer; sem pessoas, fotos, texto, marcas ou personagens licenciados |
| Licença           | Projeto / Estúdio Evydência                                                                                                |
| Revisão           | Arte natalina, adequada para miniatura e segura sem foto de cliente                                                        |
| Processamento     | Sharp 0.35.3, `1200×630`, `fit: cover`, `position: attention`, WebP qualidade 82, effort 6                                 |
| Fonte PNG         | 2.065.495 bytes; SHA-256 `1875cd525e170efd52cdb5d3a9ea5823cd73cd626fa4f23859ae2eebafee1cf2`                                |
| WebP entregue     | 112.526 bytes; SHA-256 `959c3427d6bafd417293217e3a3c2002d90ab8b32282074ce5884f752909c845`                                  |

A imagem WebP deve ser copiada para a pasta privada do VPS indicada no exemplo
de Nginx. Ela é uma arte do catálogo, não um asset de runtime de um jogo; por
isso não entra no manifesto de `packages/games/<id>`. Uma foto de cliente nunca
substitui este arquivo. Quando houver consentimento social, a foto usa outra
derivada, outro identificador opaco e outra entrega interna.

## V2 — novo padrão público de Open Graph (2026-10-10)

| Campo               | Registro                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Papel               | Arte pública padronizada para `/`, `/demo/fotos`, `/demo/game/:id` e fallback genérico de cliente                      |
| Arte-fonte editável | `assets-src/catalog-social/evydencia-christmas-v2-template.svg`                                                        |
| WebP versionado     | `apps/catalog-server/public/social/evydencia-christmas-v2.webp`                                                        |
| Origem              | Composição editorial sintética em SVG, criada para esta versão do estúdio; sem retratos reais de cliente               |
| Receita             | `pnpm --filter @christmas-games/media-pipeline run social:render` (Sharp 0.35.3, 1200×630, WebP qualidade 82/effort 6) |
| Tamanho             | 42.040 bytes                                                                                                           |
| SHA-256             | `41cf05bbcbf6e017aa53d1d11f466b91423b6da59737c98607447c628ddff9da`                                                     |
| Política            | Público, sem consentimento de cliente; não utilizar esta pasta para derivadas de clientes                              |

A arte V1 permanece disponível para compartilhar links antigos com cache persistente.
