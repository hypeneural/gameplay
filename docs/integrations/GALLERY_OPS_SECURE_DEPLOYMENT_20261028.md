# Gallery Ops Natal 2026 — implantação protegida, sem mudança Laravel
**Status: PR Draft / sem deploy. Data: 2026-10-28.**

## Grafo de dependências

- Dashboard e BFF: Gameplay PR #46 (baseada na reader PR #43, ainda Draft).
- Consulta canônica: MCP PR #16, baseada na PR #14 (em desenvolvimento, preserva PrintServer, Z-API, OAuth). O PHP existente `scripts/crm-natal-bridge.php` recebeu modo `gallery.ops.valid_orders` baseado na `NatalValidOrdersQuery::validNatalOrders()`.
- ERP Laravel `hypeneural/evydencia-crm`: **nenhuma alteração**. O MCP precisa continuar tendo acesso autorizado ao diretório Laravel atual para executar o bridge *read-only*.
- GamePlay PR #43 sidecar `POST /internal/v1/sessions/lookup-batch`, batches <=50 sem URLs; `lookup` individual com links somente quando o gate específico permitir.
- Runtime/DOM real ainda exige implantação separada; CI offline não comprova acesso a clientes.

## Camadas de segurança

1. Cloudflare Access: proteger `https://jogos.fotosdenatal.com/gestao/galerias/*` para operadores aprovados e MFA da organização.
2. BFF `apps/gallery-ops/server/adminServer.mjs` **verifica novamente JWT CF Access RS256 contra JWKS oficial**, com `iss`, `aud`, `sub`, `iat`, `nbf`, `exp`, e e-mail em allowlist. Sem header assinado e válido => 401. Não confia apenas no nome, IP, cookie do CRM ou sinalizadores visuais.
3. Requisições do navegador usam SOMENTE mesma origem `/gestao/galerias/api/*`. O BFF consulta o MCP com `GALLERY_OPS_MCP_READER_SECRET` e o Gameplay com `GALLERY_OPS_GAMEPLAY_READ_SECRET`, diferentes do JWT/admin.
4. MCP reader roda por padrão em `127.0.0.1:4196` no host de execução PHP. Se hospedado em VPS diferente, somente via túnel autenticado ou rede privada restrita a BFF; **nunca publicar a porta do reader no domínio Internet**.
5. Certificado JWKS obtido pelo BFF em `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`; permitir saída TLS somente a esse host. Nenhuma chave pública é copiada para JS ou cache público.
6. Nginx só recebe a configuração `deploy/vps/docker/gallery-ops.nginx.snippet` depois de `gallery-ops` estar healthy no mesmo network namespace de service discovery. Aplicar configuração à cópia autorizada e validar `nginx -t`, sem substituir a configuração atual dos jogos.
7. Sem customer capability URL na tabela/CSV, nos logs, nem em cache compartilhado. O redirecionamento para galeria/hub exige novo membership canônico + lookup individual e somente após aprovação explícita de `GALLERY_OPS_CUSTOMER_LINKS_ENABLED=1` **e** do gate real no sidecar.

## Variáveis operacionais (nomes; nunca comitar valores)

MCP reader:
- `GALLERY_OPS_READER_SECRET` (32+ chars, exclusivo).
- `GALLERY_OPS_READER_HOST=127.0.0.1` (não usar 0.0.0.0).
- `GALLERY_OPS_READER_PORT=4196`.
- `EVYD_CRM_APP_PATH` já configurado em produção MCP; confirmar leitura via bridge sem escrita.

Gameplay BFF:
- `GALLERY_OPS_CF_TEAM_DOMAIN` (e.g. `example.cloudflareaccess.com`, sem URL ou caminho).
- `GALLERY_OPS_CF_AUD` (AUD real configurado no Cloudflare Access app).
- `GALLERY_OPS_ADMIN_EMAILS` (lista CSV de operadores autorizados, sem wildcard).
- `GALLERY_OPS_MCP_READER_SECRET` (mesmo valor do MCP reader, somente no backend).
- `GALLERY_OPS_GAMEPLAY_READ_SECRET` (valor do sidecar, diferente do anterior).
- `GALLERY_OPS_MCP_READER_URL` (endereço privado: loopback/túnel/rede Docker).
- `GALLERY_OPS_GAMEPLAY_READER_URL` (base privada do catálogo, sem `/lookup-batch`).
- `GALLERY_OPS_CUSTOMER_LINKS_ENABLED=0` inicialmente.
- `GALLERY_OPS_ENV_FILE` e `GALLERY_OPS_RELEASE_DIR` externos ao repositório, para a Compose opt-in.
- `GALLERY_OPS_HOST=0.0.0.0` **somente dentro do container** sem host ports publicados.

## Contrato BFF

- `GET /gestao/galerias/`: HTML protegido.
- `GET /gestao/galerias/assets/:filename`: JS/CSS protegidos, cache no-store.
- `GET /gestao/galerias/api/orders`: todos os IDs válidos (keyset MCP por páginas de até 200), mesmo `as_of`, reconciliação estrita `total_valid`, join de Gameplay ≤50 UUIDs por chamada. Um lote Gameplay indisponível fica `unavailable`, nunca `no_session`.
- `GET /gestao/galerias/api/export`: CSV completo autorizado no servidor, com neutralização de fórmulas. A interface informa que exporta TODOS os pedidos; filtros locais são para navegação, não modificam a exportação atual.
- `GET /gestao/galerias/api/orders/:orderId/open/gallery|hub`: membership revalidado e 303 para URL https estritamente permitida. Sem gate => 409 e sem capacidade vazada.
- `GET /healthz`: status do processo, sem identidades/PII.

O frontend opera com filtragem local na população integral retornada pelo BFF; total e contadores são calculados sobre todos os pedidos, não uma página. Nunca carregar fixtures quando API real falha.

## Datas reais

A PR #46 amplia o `GameplayStatusLookup` SOMENTE na branch da dashboard para retornar:
- `first_upload_at`: menor `revision_blobs.received_at` com estado READY, para qualquer revisão da sessão (não necessariamente arquivo original ou primeira foto do CRM).
- `published_at`: `photo_revisions.activated_at` da revisão ativa VALIDADA. Null se não confirmada.
- Ambos ISO UTC; a UI exibe a data local. Testes SQLite de READY → ACTIVE validam as fontes.

## Gates de aceite (não automatizar deploy)

1. MCP: `php -l scripts/crm-natal-bridge.php`, `npm run check`, `npm test`, smoke restrito em loopback, origem read-only e ausência de log PII.
2. Gameplay: `pnpm install --frozen-lockfile`, `pnpm check`, `node --test apps/gallery-ops/server/adminServer.test.mjs`, `pnpm --filter @christmas-games/gallery-ops build`, E2E desktop/mobile sintético e screenshots. Atualizar repo-map gerado.
3. Auth: requisições anônimas 401; JWT inválido/expirado/audience distinto 401; Host inesperado 403; routes públicas /, /demo, /s preservadas; segredo de serviço errado no MCP 401; sem CORS público/IDs livres.
4. Paridade temporal LIVE: contar todos os UUIDs canônicos, comparar `total_valid` e KPI do CRM no MESMO `as_of`, sem duplicação; testar cancelado, reembolso e status antes da retirada; falha reader preserva pedidos.
5. Registrar 1 único canário administrativo e 1 lookup individual de link autorizado quando segurança da infraestrutura estiver comprovada.
6. Backup/config anterior + rollback do nginx de forma atômica, desligamento do BFF e reader sem impacto no game/publicador.

**NO-GO:** faltam variáveis de Cloudflare Access, rota/túnel e canário físico; o código de PR não é prova de que o domínio esteja protegido. Nunca introduzir `location /` de fallback ou alterar `readiness.json`.
