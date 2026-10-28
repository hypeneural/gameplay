# Auditoria forense — Dashboard administrativa de galerias Natal 2026
**Data:** 2026-10-28 · **Escopo:** `hypeneural/gameplay` branch `feat/natal26-gallery-ops-dashboard-20261028`, Gameplay PR #43 e CRM Laravel `main`.
**Política:** auditoria e especificação; **nenhum deploy, alteração de dados, link de cliente, alteração do reader ou do PrintServer**.

## Evidências e referências ancoradas
- Gameplay HEAD da feature antes da auditoria: `84a054f00d9ff778a50833fa9189d47c53f86f40`.
- Reader PR #43 head `dd9788e196a549c955378ea6a3e45c88ae8f818a`, Draft, CI 40609037075: jobs `Quality Gates & Build` e `Gallery mobile E2E` passaram **nesse HEAD**. **Isso NÃO valida a branch da dashboard.**
- Branch padrão do Gameplay é `codex/puzzle-native-like-v1` (`8432328bac0fbeda5c833813027d68b23f9dca81`), **não** `main`.
- A feature da dashboard deriva da PR #43 (3 commits adiante no início desta auditoria); contra branch padrão: histórico divergente (328 ahead / 35 behind). **Não mudar base diretamente para a branch padrão**.
- A Issue Gameplay #45 é o escopo funcional; PR #43 está baseada no trabalho não integrado de PR #30; PR #42 é uma linha separada de publicação e deve permanecer independente.
- CRM: `app/Services/Reports/NatalValidOrdersQuery.php` implementa `validNatalOrders(asOf, seasonStart, seasonEnd, productSlug)` e `getSeasonLiveOrders(asOf, year, slug, afterOrderId, pageSize)`. Há testes `tests/Unit/Reports/NatalValidOrdersQueryTest.php` de validade temporal, exclusões, não duplicação e paginação keyset.
- CRM `app/Http/Controllers/Manager/ManagerController.php` usa `auth:manager`; a API `routes/api.php` usa `SingleAuthentication` (token de serviço compartilhado), não a autorização individual de cada gestor.
- Leitor `GameplayStatusLookup.ts`: batch máximo 50, sem links; `published_unverified` não prova acesso por navegador; `preparation.photo_count` não deve ser somado ao `photo_count` publicado.
- Schema `apps/catalog-server/migrations/001_mvp_photo_sessions.sql` contém `photo_revisions.created_at/activated_at` e `revision_blobs.received_at`; o DTO atual do reader NÃO fornece `first_upload_at` ou `published_at`. Timestamps devem ser derivados de eventos reais com semântica documentada, não da criação do pedido ou sessão.
- `deploy/readiness.json`: `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`.

## Achados por severidade
### P0 — build e repo/CI
1. `apps/gallery-ops/index.html` referencia `/src/main.tsx` inexistente. Na feature há apenas 3 arquivos (HTML, package, vite config); **não há interface React, fixtures de código, página de login, testes, screenshots nem integração efetiva**.
2. `pnpm-workspace.yaml` inclui `apps/*` mas `pnpm-lock.yaml` ainda não possui importador `apps/gallery-ops`. CI instala com `pnpm install --frozen-lockfile`; atualizar lockfile com pnpm 11.19.0, validar `pnpm install --frozen-lockfile`.
3. O CI e o `pnpm build` raiz não executam `apps/gallery-ops`. Adicionar passos explícitos de typecheck, teste de contrato, build isolado e E2E mock. Checar repo-map gerado com `pnpm repo:map` / `pnpm repo:map:check`.
4. Nenhum workflow CI foi executado para o SHA da dashboard observado. Não usar CI verde da PR #43 como aprovação da dashboard.

### P0 — autorização, topologia e proteção de dados
5. `vite.config.ts` configura `base: '/gestao/galerias/'` corretamente para artefatos, mas NÃO cria rota HTTP nem segurança. O Nginx atual termina em `location / { return 404; }`; não há regra atual para `/gestao/galerias` ou API administrativa. Fazer roteamento separado, sem tocar no fallback de jogos, **somente após auth**.
6. Definir antes de desenvolver o mecanismo real de sessão de operador no domínio `jogos.fotosdenatal.com`: autenticação e autorização por usuário, não usar token de serviço no navegador e não presumir que cookie do CRM passa entre domínios. BFF/proxy interno deve autenticar sessão, conferir escopo `gallery-ops:view`/export individual, auditar ações e usar credenciais de serviço unicamente servidor-servidor.
7. API nominal e HTML protegidos também no edge; exigir 401/403 no backend, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`; bloquear `/internal/*` na borda pública. CSV tem mesma política de autorização, privacidade e limitação; higienizar fórmula de planilhas.
8. A classe `GameplayStatusLookup` possui `allowCapabilityLinks ?? true`. No modo sidecar `main.ts` fornece flag explícita (segura por padrão), mas no caminho de servidor persistente instancia o reader sem esse parâmetro. Revisar como hardening **na PR #43 em trabalho separado, com testes**; este documento não altera a PR. Mesmo com token interno válido, links individuais exigem autorização operacional e verificação runtime.
9. Não publicar build mock no domínio administrativo acessível anonimamente com dados reais. Mode mock nunca pode cair automaticamente em runtime após falha CRM/Gameplay; erro do backend é estado `unknown`/indisponível, não uma fixture.

### P1 — consistência funcional e temporal
10. KPI/listagem devem usar a população completa da query do CRM com `asOf` e ano definidos; **não** usar `crm_gameplay_auditoria` de status 10/12 como universo. Registrar `crm_as_of`, `gameplay_verified_at`, `source` e indicação de dados parciais.
11. Buscar IDs válidos no CRM e consultar Gameplay por UUID em lotes de até 50, protegidos no servidor. `not_found`=sem sessão (não equivale a sem fotos no estúdio); `not_published` + preparação `none`=sem publicação; `staged`=em preparação; `partial`=incompleta; `revoked`=revogada; `published_unverified`=publicação com manifesto/blobs READY, **navegador não provado**; 503=integração indisponível, NÃO `not_found`.
12. Comparativos, filtros por estado da galeria, totais e exportação devem operar sobre **o universo total após join**, não apenas a página CRM corrente. Sugestão: projeção/snapshot administrativo efêmero e privado por `asOf`, join em batches, filtros server-side, cursor/página; jamais cachear dados pessoais em CDN ou storage público.
13. `getSeasonLiveOrders()` pode selecionar colunas sensíveis (`customer_phone`, `customer_email`, `customer_whatsapp`). Fazer DTO de saída por allowlist: `order_id`, `order_uuid` interno, `customer_name`, `package_name`, `order_created_at`, `order_status`, `gallery_state`, `active_photo_count`, `staged_photo_count`, `first_upload_at`, `published_at`, `sync_state`, URLs **de rota administrativa**, sem capability URLs. Não enviar UUID/IDs de sessão se não necessários à UI.
14. `first_upload_at`: estabelecer semântica explícita (primeiro blob READY da sessão, mínimo `revision_blobs.received_at` por revisões da sessão; não significa primeira foto original); `published_at`: `activated_at` da revisão ativa; considerar revisão revogada e ordenação. Timestamp desconhecido => null com razão, nunca inventar.
15. A rota privada atual do reader não inclui `gameId`; botão Jogos pode abrir hub autorizado, e não inventar link de jogo específico. O sidecar atual pode retornar 409 para `include_links`, portanto desabilitar ações até haver autorização + homologação pública do destino.
16. O read de diversos registros em SQLite é composto de SELECTs sequenciais sem snapshot explícito do lote; considerar transação read-only consistente por batch para evitar resposta entre estados de uma ativação (testes de concorrência). Não alterar reader na feature de UI.

### P1 — UX/UI profissional
17. Desktop: cabeçalho sticky compacto, KPI claros (Válidos, Sem sessão, Em preparação, Incompletas, Publicadas não verificadas, Revogadas, Indisponíveis) com legenda e denominador; barra de filtros inteligente por nome/ID, pacote, estado, agendamento, data do pedido, primeiro upload e publicação, quantidade ativa/preparada; chips removíveis e ação `Limpar filtros`.
18. Tabela densa mas legível: `Pedido/Cliente`, `Pacote`, `Agendamento`, `Criação`, `Primeiro upload`, `Publicação`, `Fotos publicadas / preparo`, `Situação`, `Ações`. Linha inteira NÃO vira link para evitar abertura acidental. Ações individuais: abrir pedido CRM, abrir galeria, abrir hub de jogos; mostrar nome + tooltip e ícone desabilitado quando não autorizado.
19. Mobile: cards empilhados com ações explícitas, filtros em painel; não forçar tabela horizontal gigante. Skeleton, estado vazio, erro, erro parcial por fonte, revalidação manual, feedback de exportação; atalho `Ver somente pendências`.
20. Acessibilidade: labels para filtros; cabeçalho de tabela verdadeiro, ordenação anunciada, `aria-live` para estado, `:focus-visible`, contraste WCAG AA, botões 44px como meta de toque; datas localizadas em `America/Sao_Paulo`, armazenadas ISO com timezone correto; contador não deve trocar silenciosamente durante filtro.
21. Não chamar `published_unverified` de `Publicado e disponível`; rotular `Publicada (acesso não verificado)` até haver recibo real do navegador. Diferenciar em todas as telas `0 fotos publicadas` de `não há fotos no CRM`.

## Contratos sugeridos (documentais, não implantados)
```
GET /gestao/galerias/api/summary?as_of=...
GET /gestao/galerias/api/orders?as_of=...&cursor=...&limit=50&...
GET /gestao/galerias/api/orders/:orderId/links
GET /gestao/galerias/api/export?... (autorização separada)
```
- Sessão e escopos do operador são validados **em todas as chamadas**, nunca apenas no HTML; sem tokens de serviço no JS.
- Resposta `orders`: `schema_version`, `as_of`, `gameplay_verified_at`, `total_valid`, `total_filtered`, `totals_by_state`, `items`, `next_cursor`, `partial_sources` e `request_id`; campo desconhecido ou erro de API => indisponível, não zero. Proteger contra cursor inválido e filtro arbitrário (allowlist).
- `GET .../links` verifica novamente pedido válido + sessão de operador + ACTIVE/READY + gates de cliente e destino; apenas nesse endpoint emitir URL capability. Se proibido/indisponível, retornar 403/409/503 adequado e não incluir link.
- Cabeçalhos e política de retenção definidos no backend/edge; eventuais logs armazenam ID de operador, ID pedido e ação, nunca token capability/PII em log indiscriminado.
- A fonte CRM deve materializar os pedidos em lotes estáveis sob `asOf`, e o campo publicado é derivado apenas do Gameplay.

## Gating objetivo — entrega rápida sem ciclos infinitos
**Fase A (Antigravity Gameplay, mock isolado):**
- Implementar `apps/gallery-ops/src/main.tsx`, componentes, DTOs, CSS tokens e fixtures sintéticas determinísticas (sem API real e sem sobrenome/identificador real).
- Corrigir lockfile, criar scripts `build:gallery-ops`, `test:gallery-ops`, typecheck/format, testes de filtros/ordenação/CSV seguro; no CI usar job específico para a dashboard, não acoplar a publicação de sessões.
- E2E local única rodada desktop 1440px + mobile 390px, com screenshot de ambos e estados erro/vazio; não criar fallback mock em modo produção.
- Abrir PR Draft *baseada na branch do reader*, evitando contaminar PR #43 e branch padrão. Não publicar.

**Fase B (Codex CRM Laravel, PR separada):**
- Criar endpoint administrativo e authz real, reutilizar `validNatalOrders` / `getSeasonLiveOrders`; DTO minimizado, filtro/snapshot temporal e export autorizado, sem público aberto. Reutilizar testes existentes e `CsvSpreadsheetCell`.
- Testar `401/403`, paridade de IDs/KPIs, page 1/2, pedidos cancelados, pacote e timezone; erro de Gameplay não remove pedido nem marca `sem galeria`.
- Produzir contrato de auth/rotas aprovado para a Media VPS; evitar entregar URLs com capability em massa.

**Fase C (VPS, apenas após gates):**
- Decidir arquitetura de login e proxy no domínio (permissoes de gestor e mapeamento com CRM); proteger HTML + API no edge e no backend. Provar `GET /gestao/galerias` anônimo negado; `/internal/*` público negado; preservar /, /demo e /s.
- Fazer 1 canário com operador autorizado, comparar IDs/contagens contra CRM no mesmo `asOf`, verificar estados leitor e links individualmente; evidência de SHA da release, logs sem PII, backup/rollback.

**NO-GO se:** build não compila, lock desatualizado, auth/role não comprovada, API/HTML públicos nominais, divergência de população CRM, 503 classificado como sem galeria, sidecar/PR #43 sem integração validada, links liberados por suposição, CI sem evidência verde do HEAD ou alteração dos flags de piloto.

## Documentação oficial consultada
- Vite base path: https://vite.dev/guide/build
- OWASP authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Laravel 10 Gates/Policies: https://laravel.com/docs/10.x/authorization
- Laravel 10 Sanctum: https://laravel.com/docs/10.x/sanctum
- WCAG 2.2 focus visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
