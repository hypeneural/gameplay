# Auditoria e handoff — Open Graph / WhatsApp / capas natalinas (2026-10-10)

## Evidência e estado de implementação

- Repositório `hypeneural/gameplay`; esta branch parte de `feat/public-demo-root-and-e2e-handoff-20261009` (PR #20), que parte de PR #19, depois #18 → #16 → #15. **Não assumir que `main` contém essas alterações**: o default GitHub observado anteriormente era `codex/puzzle-native-like-v1`.
- Já existia geração de HTML OG server-side em `apps/catalog-server/src/socialPreview.ts` e `CatalogServer.ts`; `filePreviewRepository.ts` usa JSON privado separado do SQLite. Nginx já possui `/_catalog_social` genérico e `/_customer_social` via location internal.
- Nesta branch: metadata OG da home `/`, `/demo/fotos` e `/demo/game/:id` gerado antes do React; `og:image:secure_url`, `twitter:card`; título orientado à rota e imagem versionada de sessão; suporte JPEG e teste de revogação da sessão no SQLite; `tools/media-pipeline/src/socialCover.ts` é um gerador **offline privativo** 1200×630, consentido. A configuração dinâmica da seleção de foto e do consentimento **ainda precisa ser ligada ao CRM/publicador**.
- Arte nova aprovada no escopo visual foi **gerada com ImageGen** e exportada como `evydencia-og-natal-v2.webp` (1200×630 / 76,6 KiB aprox.) e `evydencia-og-natal-v2.jpg` (1200×630 / 134 KiB aprox.) no artefato da conversa. O código-fonte vetorial correspondente está no repo em `assets-src/catalog-social/evydencia-christmas-v2-template.svg`. **Até o binário WebP/JPEG ser copiado para o repo a partir do artefato e homologado, o OG público continua apontando para `evydencia-christmas-v1.webp` existente.** Não renomear um SVG para `.webp` nem apontar WhatsApp a SVG antes de validar compatibilidade.
- Não há fotos reais de clientes neste patch; `deploy/readiness.json` mantém pilotReady/customerDataAllowed/automaticDeliveryAllowed=false. Nenhuma implantação/alteração de Caddy/live executada.

## Recomendação de formato

- **1200×630 (1,9048:1)**; `og:image:width=1200`, `og:image:height=630`, `og:type=website`, `og:locale=pt_BR`, `og:image:alt`, URL HTTPS absoluta. O protocolo OG não obriga 1200×630.
- Para evitar variação de comportamento do WhatsApp, preferir JPEG (`image/jpeg`) com bytes bem abaixo de 300KiB como orçamento interno; manter WebP suportado no fluxo legado somente após smoke com WhatsApp Android e iOS.
- O servidor deve responder HTML com meta tags à primeira requisição HTTP do crawler; tags adicionadas apenas no React não são confiáveis.
- Imagem genérica da home é **pública**; foto personalizada do cliente é **derivada restrita** e não deve ter acesso direto pela webroot nem caminho ao original.
- O token na URL é uma **capacidade de acesso**: quem receber a URL pode abrir a galeria. O consentimento para incluir um retrato na prévia é separado do compartilhamento da URL.

## Roteamento e geração esperados

| Compartilhamento   | Canonical OG             | Og:image                                                                                 |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| Home pública       | `/`                      | `/social/evydencia-christmas-v1.webp` (substituir por V2 após upload de binário e teste) |
| Galeria demo       | `/demo/fotos`            | mesma arte pública                                                                       |
| Jogo demo          | `/demo/game/:id`         | mesma arte pública                                                                       |
| Hub do cliente     | `/s/:token`              | `/s/:token/social-preview?v=:revision`                                                   |
| Galeria do cliente | `/s/:token/fotos`        | mesma imagem autorizada, título de álbum                                                 |
| Jogo do cliente    | `/s/:token/game/:gameId` | mesma imagem autorizada, título de jogos                                                 |

**Uma capa por sessão/revisão**, não uma geração por crawler nem por jogo. Mudou a fotografia ou consentimento? Criar nova revisão opaca; invalidar/retirar o asset anterior, mantendo o aviso de que caches das plataformas externas podem persistir.

## Contrato de publicação faltante (P0)

1. `EvydFlow` prepara as três variantes WebP privada + manifesto, consulta `orders.detail` autenticado e confirma pedido elegível (não só UUID). `gameplay` verifica autoridade de sessão server-to-server/CRM antes de `resolve` e `activate`.
2. CRM guarda **consentimento afirmativo verificável para prévia social** (não inferir de ensaio contratado) e id da foto escolhida (uma foto autorizada, sem nome/pedido/telefone na capa).
3. Operador escolhe foto ou segue regra determinística segura e revisável. Não escolher aleatoriamente no bot nem usar reconhecimento facial sem escopo/consentimento.
4. `generatePrivateSocialCover`: usar derivado autorizado/local com saída para storage privado, `socialPreviewConsent='granted'`, `derivativeKey` aleatório por sessão/revisão; gerar JPEG 1200×630, `exif` ausente e tamanho <=300 KiB. Respeitar enquadramento com `contain` para não cortar cabeças.
5. Ativação CAS da galeria fica separada da ativação da prévia; não habilitar `customer-photo` antes de gerar+validar JPEG e registrar consentimento. Se preview falhar, manter preview **genérica** e registrar status `generic-fallback` em log seguro.
6. Persistir `session_id,revision_id,preview_version,derivative_key,consent_status` em autoridade de preview integrada ao SQLite/CRM. **Não persistir tokens, URLs de capacidade ou dados privados no log comum**.
7. A consulta de prévia usa `SocialPreviewRepository` e consulta adicional `SqliteSessionRepository.getActiveSession(token)`. O backend já exige o segundo gate para `customer-photo` nesta branch, mas **o arquivo de configuração privado ainda não é automaticamente gerado/atualizado** pelo publicador.
8. Se consentimento revogar ou token revogar: 404 para prévia privada; fallback genérico quando sessão válida mas consentimento não granted. Bloquear fonte de imagem da foto e fazer expiração/invalidação do lado controlado. Não prometer apagar caches do WhatsApp já distribuídos.

## Nginx, Caddy e HTTPS

- `/social/evydencia-christmas-v1.webp`: asset genérico e público, única rota pública de arte geral v1; `/_catalog_social/*.webp` continua `internal`.
- `/_customer_social/:opaqueKey.jpg` ou `.webp`: Nginx `internal` + `X-Accel-Redirect`, deve existir storage consistente e apenas derivado social aprovado; não permitir URL pública direta.
- Garantir que Caddy público não reescreva ou perca querystring `?v=...` e não registre tokens em access logs. Responder `Content-Type` exato e tamanho físico 1200×630; testar `GET`, `HEAD` e redirects.
- Bots sem cookie/login não conseguem renderizar imagem que exija sessão web autenticada. Isso é intencional: o token de acesso+consentimento controlam a prévia, e plataformas sociais podem guardar os bytes externamente.

## Testes rápidos e critérios

```powershell
pnpm agent:doctor
pnpm vitest run apps/catalog-server/src/CatalogServer.test.ts apps/catalog-server/src/filePreviewRepository.test.ts tools/media-pipeline/src/socialCover.test.ts tools/deploy/public-demo-root.test.mjs
pnpm check:fast
pnpm repo:map
pnpm check
pnpm release:staging
pnpm release:verify
```

**Smoke real após autorização do deploy:**

- `curl -sS https://jogos.fotosdenatal.com/` contém OG server-side + URL da arte genérica.
- Abrir asset absoluto pelo GET anônimo, verificar `200`, `Content-Type`, bytes e dimensões. Requisição a `/internal/v1/*` pública deve falhar.
- Criar sessão sintética autorizada na VPS e confirmar OG em hub, galeria e jogo; testar preview `/s/:token/social-preview` e `?v=...` com 200; revogar e confirmar 404. Nunca publicar cliente real em staging.
- Validar link no WhatsApp de Android e iOS físicos e com ferramenta Meta Sharing Debugger se disponível; resultados e screenshots com token oculto.
- `V2` gerada localmente **não** deve virar imagem pública de cliente sem consentimento; trata-se de foto sintética de demo criada por IA.

## Integração de imagem V2 e versão de cache

1. Operador transfere o artefato `evydencia-og-natal-v2.webp` para o clone **local** (ferramenta AG): `apps/catalog-server/public/social/evydencia-christmas-v2.webp`. Conferir `1200x630`, SHA-256 e tamanho. Não commitar artefatos gigantes/outras mídias.
2. Garantir empacotamento do release (`release:staging`) para o novo asset e localização Nginx pública exata `/social/evydencia-christmas-v2.webp`, mais caminho interno `/_catalog_social/evydencia-christmas-v2.webp`.
3. Alterar a constante `genericPreviewVersion` de `evydencia-christmas-v1` para `evydencia-christmas-v2`, junto de configs privadas válidas e testes; manter V1 durante migração se houver links cacheados.
4. Executar render de HTML, `pnpm check`, release e smoke (sem cliente). **Não** alterar `pilotReady` para a promoção da demo.
