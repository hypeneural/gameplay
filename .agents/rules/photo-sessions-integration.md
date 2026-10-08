---
trigger: model_decision
description: 'Ative ao trabalhar com photo sessions, galeria de clientes, mídia privada, backend de sessão, ingestão HTTPS ou integração EvydFlow.'
---

# Integração de sessões fotográficas

Estas regras são invariantes para a experiência de fotos de clientes.

## Autoridades e runtimes

- `gameplay` é o monorepo do produto web e da autoridade de sessão na VPS.
- `apps/play` contém Hub, galeria e jogos. Não crie uma segunda aplicação de galeria.
- `apps/catalog-server` evolui como backend de sessão, ingestão, autorização e entrega de mídia no MVP. Não crie microsserviços adicionais sem evidência operacional.
- EvydFlow permanece um runtime Python/YAML separado no Windows 11. Não reescreva o orquestrador em Node.
- `tools/media-pipeline` é um pacote Node/Sharp compartilhado. No fluxo `prepared-derivatives` do MVP ele roda no computador do estúdio; a VPS recebe somente derivados validados.
- Upload de originais para a VPS pertence a um futuro modo `source-ingest` separado. Não misture os dois modos na mesma revisão.

## Identidade e isolamento multi-cliente

Nunca derive autorização do número do pedido. Mantenha identidades distintas:

- `crmOrderNumber`: número completo como string, somente referência operacional.
- `crmOrderUuid`: identidade CRM quando disponível.
- `photoSessionId`: UUID estável da experiência/galeria do cliente.
- `galleryKey`: chave estável que diferencia galerias dentro do mesmo contexto CRM/pedido.
- `revisionId`: UUID de uma coleção imutável.
- `photoId`: identificador opaco estável, independente de nome/ordem do arquivo.
- `accessToken`: capability aleatória, separada de pedido/sessão/foto.

Toda leitura de sessão e mídia deve validar explicitamente sessão, revisão ativa, photoId e variante. Cliente A nunca pode resolver objetos de cliente B, mesmo conhecendo UUIDs.

Multi-galerias é suportado pela mesma autoridade: uma `photoSessionId` representa uma galeria pública e `(crmOrderUuid, galleryKey)` diferencia galerias ligadas ao mesmo pedido. Não crie uma segunda autoridade `gallery` no backend.

## Revisões e publicação

- Upload sempre entra em STAGED.
- Verificação exige inventário exato e zero falhas antes de VALIDATED.
- ACTIVE muda apenas por transação/compare-and-swap com `expectedActiveRevisionId`.
- Uma revisão parcial nunca fica visível.
- Para o MVP de um único backend, CAS + constraints + idempotency keys são suficientes; só adicione lease/fencing distribuído quando houver concorrência real entre workers/hosts.
- Criação/ativação devem ser idempotentes e retornáveis após timeout.

## Contrato de mídia

A receita inicial permanece WebP 82, `fit: inside`, `withoutEnlargement`, auto-orient, sRGB:

- `thumb`: lado maior 480.
- `card`: lado maior 800.
- `game`: lado maior 1600.

`gallery=1200` é somente candidato de benchmark para o álbum full-width. Não o transforme em quarta variante de produção antes de medir 800 × 1200 × 1600 em retratos/paisagens e em aparelho real.

Cada variante deve registrar URL/identidade, largura real, altura real, bytes e SHA-256. 480/800/1600 são lados maiores, não descritores `w` de `srcset`.

Cache/namespace de derivado inclui `sourceHash + recipeKey`. Depois de copiar a fonte para staging, re-hasheie o snapshot e compare com o hash calculado antes da cópia antes de promover a saída.

A API pública nunca recebe source path, nome original, sourceHash, telefone ou identificadores internos do CRM.

## Galeria mobile-first

A rota canônica é `/s/:token/fotos`, dentro de `apps/play`, usando a mesma Session e a mesma seleção dos jogos.

- A galeria não pode carregar Phaser, canvas nem chunks de jogo.
- Abaixo de 600 CSS px, a Galeria Natalina é um álbum de uma coluna, com proporção natural e sem crop. Em 600–899 px, duas colunas; em 900+ px, duas ou três conforme o container.
- O feed usa `card` e, se o benchmark aprovar, `gallery`; `game` é reservado para hero/lightbox/jogo.
- Comece com 6–8 fotos montadas no álbum mobile e avance em lotes limitados; IntersectionObserver nunca pode fazer o acervo inteiro antecipar silenciosamente.
- Lightbox é importado sob demanda e prefetcha no máximo a foto corrente e vizinhas necessárias.
- Hero/lightbox usam `contain`; `cover` só é permitido quando o enquadramento seguro estiver comprovado.
- Preserve scroll, photoId selecionada e Back/Forward ao alternar Hub, galeria e jogo.
- Safe areas, `100dvh/100svh`, toque, reduced motion e ausência de overflow horizontal são requisitos.
- Natal é ambientação; não cubra fotos com efeitos contínuos pesados.
- Assets visuais compartilhados da Galeria Natalina pertencem a `christmas-shell/gallery`, com manifesto e proveniência; não dependa estruturalmente de assets de um jogo específico.

Preferência validada para o primeiro corte:

- `react-photo-album` somente para layout/responsive images.
- `yet-another-react-lightbox` + Zoom, lazy, para viewer.
- Não copie Tailwind/shadcn/React Router da galeria legada.
- Não introduza virtualização, CSS Masonry experimental, AVIF, quarta variante ou service worker sem medição que justifique.
- Leia também `.agents/rules/christmas-gallery-album.md` e `.agents/skills/christmas-gallery-album/SKILL.md`.

## Privacidade e segurança

- Storage de mídia é privado e fora da webroot.
- Backend autoriza antes de Nginx `X-Accel-Redirect`.
- O token no path não entra em logs, analytics, errors ou referrer. Use `Referrer-Policy: no-referrer` na experiência privada.
- Após bootstrap, prefira cookie `Secure; HttpOnly; SameSite=Lax; Path=/`; não use um "current session" global ambíguo entre abas.
- Não cacheie fotos privadas em service worker no MVP.
- Nunca registre telefone, path Windows, token, URL com token, credencial ou mensagem completa em logs gerais.

## Gates obrigatórios

Antes de declarar a integração pronta:

1. `pnpm check:fast`.
2. `pnpm architecture`.
3. `pnpm build`.
4. testes de autorização cross-session e revisão parcial.
5. Playwright: `/fotos` sem request de Phaser/game chunk e sem canvas.
6. viewports 390, 412, 430 e 768 CSS px.
7. Android físico e Safari/iPhone antes de piloto comercial.
8. três ciclos galeria → jogo → galeria sem duplicação contínua de recursos.
9. nenhuma fixture/demo em fallback de produção para token inválido.

Leia o plano ativo antes de mudanças estruturais:
`docs/exec-plans/active/CG-PHOTO-SESSIONS-ANTIGRAVITY-2.19.1.md`.
