# Handoff de integração — EvydFlow / Gameplay (2026-10-09)

Escopo: consolidar PRs encadeados sem deploy implícito.

1. Gameplay PR #15 -> #16 -> #18; esta branch parte da #18. Isolar concorrência de um mesmo storage root; devolver hubUrl e galleryUrl no recibo somente após ACTIVE. O lock `.publication-running.lock` impede concorrência e exige recuperação manual supervisionada se um processo morrer (não remover lock de processo ativo); adicionar teste de exclusividade e crash/recovery. Verificar portões do release e não liberar dados reais.
2. EvydFlow PR #14 (task + DAG + integração Node) é base; PR #15 oferece adapter alternativo, não habilitar ambos. Esta branch EvydFlow deriva #14 e normaliza o recibo como access_url/hub_url/gallery_url. Consolidar em um adapter e uma única task. Manter YAML Natal normal intocado.
3. Corrigir `AppRouter.tsx`: sessões reais jamais podem cair no createFixtureSession; buscar `GET /s/:token/data` com AbortController, schema validation, handling 404/403/500 e origin-safe relative images. Preservar fixtures APENAS para rotas de desenvolvimento explicitamente definidas.
4. Adicionar autorização real do pedido no catalog backend: UUID sozinho não comprova pedido/cliente. Solução server-to-server autenticada/assinada com CRM e revogação; não usar nome da pasta como prova.
5. Armazenamento privado EvydFlow: `StepState.save_output` grava JSON sem verificação de permissões; manter capability URLs apenas em storage com ACL de operador e nunca em logs/recibos públicos. Evitar `publicToken` como parte de logs.
6. Sintético E2E único: Node/Sharp -> upload -> status -> ACTIVE -> browser GET /data e thumb/card/game -> dois links funcionando -> fechar/browser. Falhas e replays não podem duplicar sessão nem enviar WhatsApp.
7. Operação: executar gates locais focados, backup SQLite com WAL consistente + storage e restore real, curl boundary checks, smoke Android/Safari. NÃO fazer deploy nem usar fotos reais enquanto `deploy/readiness.json` possuir flags false. Restringir canário real a uma sessão autorizada e somente após aprovação humana das flags.
8. Segurança adicional: auditar `credentials.json`, `config/.env`, `data/state`, arquivos historicamente rastreados por Git, sem copiar seu conteúdo para PR; rotacionar quaisquer segredos de fato expostos. Determinar se caches de derivados contêm dados sensíveis.

## Auditoria de integração e próximo passo — 2026-10-11

**Base auditada:** `56891d756d00d2d50dda0854080cfadfa78a0887`, Gameplay PR #21. A branch `audit/p0-crm-sqlite-activation-20261011` é isolada; **nenhum deploy/merge foi executado**.

### Bloqueios concretos encontrados e correções incluídas

| Código   | Evidência no HEAD da PR #21                                                                                                    | Correção desta branch / gate                                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRM-01   | `CrmEligibilityService` existia, mas `main.ts` não o injetava em `PublicationService`                                          | Configuração `CATALOG_CRM_ELIGIBILITY_ORIGIN` + `CATALOG_CRM_API_SECRET_FILE` e injecção de `HttpCrmClient`; sem credenciais, `resolve` dá 503 antes de criar sessão                                                                                                                                                                                |
| CRM-02   | Cliente CRM aceitava `orderUuid` diferente do solicitado e redirects HTTP                                                      | Confere identidade em cliente e serviço, proíbe redirect e URLs externas HTTP; erros de transporte sanitizados                                                                                                                                                                                                                                      |
| CRM-03   | **CRM Laravel `main` não oferece ainda** `GET /internal/v1/orders/{uuid}/eligibility` no `routes/api.php`/ `extension-api.php` | **Resolvido via adaptador canônico**: `HttpCrmClient` suporta tanto `/internal/v1/orders/{uuid}/eligibility` quanto `GET /api/orders/{uuid}/detail` (`CATALOG_CRM_ENDPOINT_STYLE=laravel-detail`), com `SingleAuthentication`, mapeamento exato de `App\Enums\OrderStatus` (`1..13`) e flag separada `allowSocialCoverPublishing` (default `false`) |
| SQL-01   | `session_social_previews` criada em 002, mas `main.ts` ainda escolhia `createFilePreviewRepository`                            | Adicionado `CATALOG_PREVIEW_AUTHORITY=sqlite` opt-in, injetando `SqlitePreviewRepository` quando persistência está habilitada                                                                                                                                                                                                                       |
| SQL-02   | Lookup montava SQL a cada requisição e retornava capa para sessão resolvida sem revisão                                        | Statement preparado no construtor; exige active_revision_id + revisão ACTIVE antes de oferecer inclusive arte genérica                                                                                                                                                                                                                              |
| SQL-03   | Duas migrações legadas possuem prefixo 002                                                                                     | Desempate lexicográfico estável; validado em disco com revisões ativas (`001` -> `002_photo_revisions_superseded_state` -> `002_social_previews`), `PRAGMA foreign_key_check=[]` e backup/restore via `VACUUM INTO`                                                                                                                                 |
| PUB-01   | `--show-urls` podia imprimir capability URLs no stdout e `--receipt-file` não era atômico                                      | stdout com URLs desativado no CLI; recibo escrito como arquivo temporário 0600 e rename; caminho absoluto exigido; EvydFlow (`load_private_gameplay_receipt`) consome exclusivamente de arquivo privado absoluto                                                                                                                                    |
| STAGE-01 | VPS informa release anterior `20261010-bb2cdcc`; bundle de `56891d7` só gerado, não instalado                                  | Confirmar `docker inspect` e releases. **Não** instalar este patch sem CRM operacional e smoke de SQLite                                                                                                                                                                                                                                            |

### Migração em duas etapas (não quebrar staging atual)

1. **Etapa A (staging sintético):** manter `CATALOG_PREVIEW_AUTHORITY=file-demo`; não configurar CRM até haver endpoint HTTPS real. A home `/` e os OG genéricos continuam funcionando. Caso publicação privada esteja configurada, novas chamadas `resolve` sem CRM passam a falhar com **503 intencional**. Não confundir isso com falha de health do site. Confirme que o relay privado não depende de resolver novos pedidos sintéticos neste estágio.
2. **Etapa B (canário SQLite):** conectar ao CRM Laravel via `CATALOG_CRM_ENDPOINT_STYLE=laravel-detail` (`GET /api/orders/{uuid}/detail`) ou endpoint dedicado `/internal/v1/orders/{uuid}/eligibility`, verificando cliente/consentimento; testar 404/403/503/timeout e identidade divergente. Fazer backup **consistente** do DB+WAL e blobs (`VACUUM INTO`). Provisionar segredos privadamente, validar config e fazer canário **sintético**. Só depois ativar `CATALOG_PREVIEW_AUTHORITY=sqlite`, migrando sessões sintéticas previamente configuradas no JSON para revisões ativas válidas; links JSON antigos não são migrados automaticamente.
3. O `runtimeConfig` permanece limitado a `staging-demo`. Nenhum cliente real deve ser publicado até `deploy/readiness.json` atestar todos os gates, incluindo consentimento de prévia social e autorização no **activate**, não apenas no resolve.

### Gates de performance (medidos com dados sintéticos em 2026-10-11)

- **Latências (60 req/rota sobre SQLite WAL em disco):**
  - `GET /s/:token` (HTML / Crawler OG): `p50 = 14.65 ms`, `p95 = 19.77 ms`
  - `GET /s/:token/social-preview` (`X-Accel-Redirect`): `p50 = 15.49 ms`, `p95 = 16.28 ms`
  - `GET /s/:token/data` (JSON de galeria/jogos): `p50 = 15.21 ms`, `p95 = 16.96 ms`
  - Recursos de processo: `RSS = 99.41 MiB`, `CPU User = 578 ms`, `CPU System = 141 ms`, `EventLoop p99 = 20.61 ms`.
- **Query Plan (`EXPLAIN QUERY PLAN`):**
  - `SEARCH s USING INDEX sqlite_autoindex_photo_sessions_3 (public_token_hash=?)`
  - `SEARCH r USING INDEX sqlite_autoindex_photo_revisions_2 (session_id=? AND id=?) LEFT-JOIN`
  - `SEARCH sp USING INDEX sqlite_autoindex_session_social_previews_1 (session_id=?) LEFT-JOIN`
- `Sharp`: uma capa por sessão/revisão, filas pequenas, cache por hash e zero geração no GET do crawler.
- Não introduzir Redis/Postgres/microserviço novo sem medição de gargalo.
- `docker restart` após troca de symlink não garante novos bind mounts; verificar `docker inspect` e recriação controlada via Compose, preservando demais serviços.

### Testes focados da nova branch

```powershell
pnpm agent:doctor
pnpm exec vitest run apps/catalog-server/src/crm/CrmEligibilityService.test.ts apps/catalog-server/src/runtimeConfig.test.ts apps/catalog-server/src/publication/sqlitePreviewRepository.test.ts tools/deploy/publish-session.test.mjs
pnpm check:fast
pnpm check
pnpm release:staging
pnpm release:verify
pnpm release:smoke-runtime
```

**Saída obrigatória Antigravity:** HEAD exato, status CI local, teste de migração em cópia de SQLite com dados de revisões ativas, resposta real do endpoint CRM, smoke canário por rota, mounts Docker, bytes/hashes de OG, rollback e decisão GO/NO_GO separada para demo e sessão real.
