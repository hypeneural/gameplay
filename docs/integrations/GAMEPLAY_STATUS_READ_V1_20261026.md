# Gameplay Catalog — status lookup v1 (26/10/2026)

## Contrato para MCP e EvydFlow

O Gameplay é autoridade da sessão e revisão. O CRM determina a identidade do pedido e se está operacionalmente pronto (somente status atuais 10 e 12, Natal 2026). Este endpoint **não busca por nome** e nunca executa resolveOrCreateSession, upload, publicação ou envio.

### API autenticada

- `POST /internal/v1/sessions/lookup`: body `{"crm_order_uuid":"UUID","include_links":true}`.
- `POST /internal/v1/sessions/lookup-batch`: body `{"crm_order_uuids":["UUID",...]}` (1 a 50).
- O endpoint batch **sempre omite links**, mesmo que se forneça `include_links=true`.
- Envelope: `{"schema_version":1,"source":"gameplay_catalog","verified_at":"ISO","results":[...]}`.
- Estado da sessão: `not_found`, `not_published`, `partial`, `revoked`, `published_unverified`.
- Campos: `crm_order_uuid`, `state`, `session_id`, `active_revision_id`, `photo_count`, `expected_blobs`, `ready_blobs`, `hub_url`, `gallery_url`, `games_runtime_verified:false`.
- Em lote, `hub_url` e `gallery_url` são **sempre null**; quando solicitado por UUID individual ACTIVE/READY, URLs públicos são gerados pelo token canônico da sessão.
- `published_unverified` significa ACTIVE/ACTIVE, manifesto válido e os exatos três blobs por foto registrados READY; não prova legibilidade real do WebP ou execução do Phaser.

### Limites e autorização

- `CATALOG_INTERNAL_READ_SECRET` >=32 caracteres, privado e diferente de `PUBLISHER_API_SECRET` e `CATALOG_SERVER_SECRET`.
- Sem SQLite configurado, a API de leitura não é iniciada. Sem segredo de leitura ela permanece desabilitada.
- O Caddy deve bloquear a rota `/internal/*` pela interface pública e liberá-la só pela rede interna (Tailscale ou túnel) para as aplicações autorizadas. Validar no ingress além do Bearer.
- Payload máximo 8192 bytes, 50 UUIDs, resposta `private,no-store`, nenhuma query com token.
- Erro do servidor: nunca representar 503 como `not_found`; JSON inválido retorna 422.
- Não publicar tokens capability, nomes de fotos, filesystem paths, segredo ou payloads privados em logs/commits.
- Não modificar `deploy/readiness.json` somente para ativar este endpoint; publicação real de cliente está bloqueada pelo estágio atual.

### Validação da PR #43

A PR está baseada na branch da PR #30, não na branch padrão do jogo, que ainda não inclui todas as dependências de publicação.

1. `pnpm agent:doctor`
2. `pnpm exec vitest run apps/catalog-server/src/publication/GameplayStatusLookup.test.ts apps/catalog-server/src/publication/GameplayStatusLookup.integration.test.ts`
3. `pnpm check:fast`, `pnpm check`
4. `pnpm validate` quando Playwright e assets estiverem disponíveis.
5. Smoke privado sintético para um pedido A publicado e pedido B inexistente/revogado, usando a API real sem dados de clientes.
6. Provar bloqueio externo no gateway Caddy, SHA ativo, backup/restore do SQLite WAL e rollback por segredo ausente.

**Não promover cliente real**: `pilotReady=false`, `customerDataAllowed=false` e `automaticDeliveryAllowed=false` no readiness. Resolver PRs de publicação, autorização de mídia, navegador, backup e piloto primeiro.

## Photo counts and creation phase (additive v1 fields)

- `photo_count` is **only the active publication manifest's photo count**. It is 0 if there is no active revision; 0 does **not** prove that the original CRM shoot, Drive folder or selection has no photos.
- `preparation`: `{state:'none'|'staged'|'invalid',revision_id,photo_count,expected_blobs,ready_blobs}` describes the most recent STAGED revision **separately**. `photo_count=null` on invalid or unknown. The three blob variants per photo are thumb/card/game, not three different customer photos.
- `state='not_published'` plus `preparation.state='staged'` means photos are being prepared, not available to the customer. `state='published_unverified'` means the active manifest and all required blob metadata are ready; it does not prove that all Phaser games loaded in a real browser.
- The same session may contain an active published revision and a newer STAGED revision. Both counts are independent and MUST NOT be added as distinct photos.
- The private API still takes `crm_order_uuid` only; the CRM owns ID-to-UUID identity. A single order has one session, potentially multiple revisions over time.
- Tests: `GameplayStatusLookup.integration.test.ts` verifies 0 active/1 staged/3 variants and 1 active after activation. This is only the synthetic DB contract, not actual mobile-runtime verification.
