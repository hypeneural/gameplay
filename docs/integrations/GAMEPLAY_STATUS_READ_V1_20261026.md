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
