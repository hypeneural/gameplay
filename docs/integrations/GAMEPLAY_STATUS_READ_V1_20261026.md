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

## Fase P0 operacional — SQLite existente e staging-demo (27/10/2026)

**Observação fornecida pelo Antigravity, ainda a ser confirmada pelo operador do servidor:** Media VPS `vmi3522513` com `christmas-games-catalog` saudável na release `20261019-8ac62b3` (`8ac62b3e881c7b91120d4506c1b04f8b5bd9db16`), anterior a esta PR #43; SQLite existente na árvore `/srv/runtime/christmas-games/data/sqlite`: 21 sessões, 22 revisões e 2.073 registros de blobs. **Blobs não são fotos; registros não provam publicação, envio ou acesso real à mídia.** A topologia informada contém Caddy/cloudflared e Nginx, portanto o roteamento deve ser validado na instância viva, não inferido de exemplos do repositório.

### Alteração pronta no código: sidecar de auditoria privada, sem publicador

`apps/catalog-server/src/main.ts` aceita o modo explicitamente opt-in
`CATALOG_PRIVATE_METADATA_READ_ONLY=1`. Nesse modo:
- exige banco SQLite **já existente** e `CATALOG_SERVER_SECRET[_FILE]`, para conferir hash da capability armazenada, além do segredo **independente** `CATALOG_INTERNAL_READ_SECRET[_FILE]`;
- inicia `new DatabaseSync(path,{readOnly:true})` com `PRAGMA query_only=ON`; requer as três tabelas `photo_sessions`, `photo_revisions`, `revision_blobs`; **não migra nem cria sessão ou publicações**;
- exige `CATALOG_PREVIEW_AUTHORITY=file-demo` e rejeita segredos Publisher e habilitação do piloto/publicação de clientes; publicador e cliente CRM não são instanciados;
- para o endpoint `POST /internal/v1/sessions/lookup-batch` aceita até 50 UUIDs e **não gera URLs privadas**. A rota individual `lookup` com `include_links:true` responde **409 CUSTOMER_LINKS_NOT_ENABLED** até o serviço público, mídia e tokens serem homologados. Esta sidecar é exclusivamente de **METADADOS**.

Arquivo de configuração opt-in:
`deploy/vps/docker/compose.private-audit.yaml`.

**Importante:** a composição principal de staging `deploy/vps/docker/compose.yaml` continua inalterada; o overlay adiciona apenas o serviço `catalog-reader` com `profiles:['audit-private']`. Ele:
- monta `/srv/runtime/christmas-games/data/sqlite` com `:ro`, incluindo `catalog.db`, `-wal` e `-shm`, e exige usuário UID:GID que possa ler esses arquivos, sem conceder escrita;
- liga a porta **somente** em `127.0.0.1:4182` na **Media VPS**, e somente na rede Docker `internal`, sem ligação com `edge`/Caddy público; nunca remover bloqueio público `/internal/*`;
- utiliza diretório de release imutável `RELEASE_DIR` contendo **build da PR #43 sobre a dependência #30**; não usa symlink `current` para forçar a atualização do catálogo público;
- exige os caminhos host-side `CATALOG_SERVER_SECRET_HOST_PATH` e `CATALOG_READ_SECRET_HOST_PATH`, UID e GID aprovisionados por operador; NÃO imprimir o conteúdo dos arquivos, copiar em Git ou usar segredos de produção do publicador como token de leitura;
- mantém banco, media, publisher, gateway, PrintServer, Z-API, Laravel, Spooler e serviço MCP existentes intactos.

### Execução pelo operador autorizado (não pelo Antigravity sem privilégios)

1. Confirmar versão REAL do contêiner, mounts e integridade do banco/WAL; efetuar backup online consistente com ensaio de restauração **antes de qualquer alteração do serviço existente**. Manter `readiness.json` com `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`.
2. Gerar artefato imutável da PR #43, incluindo seu *ancestral* PR #30, através de `pnpm release:staging` e `pnpm release:verify`, com Node24/pnpm11; verificar `RELEASE.json` e `server/main.js`. **Atenção:** a execução da versão compilada depende de como a release empacota o bundle server; não presumir que o checkout fonte seja o serviço em execução.
3. No diretório de Compose já usado pelo `stackctl`, aplicar overlay usando os meios oficialmente autorizados pelo `stackctl` e Compose. O comando conceitual de inspeção é `docker compose -f compose.yaml -f compose.private-audit.yaml --profile audit-private config --quiet`, seguido de criação **apenas** do serviço `catalog-reader` com `up -d --no-deps catalog-reader` (se o wrapper permitir; não executar comandos Docker root fora da governança).
4. Do **host da Media VPS**, provar que `POST http://127.0.0.1:4182/internal/v1/sessions/lookup-batch` devolve o contrato com UUID sintético e bearer privado e que um Bearer inválido obtém 401. Nunca incluir JWT, segredos ou tokens em logs.
5. Criar canal seguro persistente (via infraestrutura autorizada) do **MCP VPS** para `127.0.0.1:4182` na Media VPS: HTTPS privado com identidade TLS validada, ou SSH tunnel com saída no **loopback do MCP VPS**. O cliente MCP só aceita HTTP em loopback e HTTPS em outros hosts. Não usar `http://100.116.8.109:4180` como `EVYD_GAMEPLAY_READ_ORIGIN`.
6. Confirmar `crm_capacidades(verificar_gameplay=true)` -> `private_contract_ok`, então `crm_gameplay_auditoria` (status 10 e 12) no ChatGPT. Só consultar IDs reais quando o operador e o transporte estiverem autorizados. `not_found` não significa ausência de fotos no CRM.
7. **Envio/publicação ao cliente não são autorizados por este overlay.** Para devolver `hub_url`/`gallery_url` como links funcionais, é necessário homologar a API pública persistente, media grants `X-Accel-Redirect`, backup/restore WAL, tokens e navegador mobile com um pedido piloto aprovado. A PR #30 registrou um bypass anterior das travas do piloto e introduziu guardas; inspecionar qualquer sessão real preexistente e suas permissões antes de autorizar envios.

### Referências oficiais
- Node.js `DatabaseSync(readOnly)`: https://nodejs.org/api/sqlite.html
- SQLite WAL e leitura somente: https://www.sqlite.org/wal.html
- Docker Compose produção com overlays: https://docs.docker.com/compose/how-tos/production/
- Nginx `internal` media grants: https://nginx.org/en/docs/http/ngx_http_core_module.html#internal
- Caddy path matchers: https://caddyserver.com/docs/caddyfile/matchers
