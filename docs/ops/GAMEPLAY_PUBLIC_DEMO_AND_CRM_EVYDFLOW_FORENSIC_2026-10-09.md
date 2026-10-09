# Auditoria forense operacional — EvydFlow, CRM, Gameplay e demo da raiz (2026-10-09)

**Escopo:** `hypeneural/gameplay` (branch baseada no PR #19, que depende de #18 → #16 → #15) e contrato externo `hypeneural/evydflow` PR #14/#17. **O presente documento não concede autorização de fotos reais.**

## 0. Fontes e limites de evidência

- Inspeção de arquivos GitHub: `apps/play/src/app/{AppRouter,AppNavigation,SessionDataLoader}.ts*`, `apps/catalog-server/src/{CatalogServer,main}.ts`, `apps/catalog-server/src/publication/{PublicationService,SessionRepository}.ts`, `tools/deploy/{publish-session,backup-restore-catalog}.mjs`, `deploy/vps/docker/{nginx.conf,compose.yaml}`, `deploy/readiness.json`.
- Relatório do Antigravity anexado pelo operador declara commit `328d9e6` Gameplay PR #19 e `1c32c78` EvydFlow PR #17; declara 546 unit tests e 16 Playwright positivos, **não executados novamente nesta auditoria via GitHub**. Relatórios históricos não são prova do HEAD atual.
- VPS Contabo e Caddy **não** foram alterados nesta branch. Até executar release+deploy+smoke, a raiz pública pode continuar respondendo 404.
- O host canônico configurado é `jogos.fotosdenatal.com`. O nome `jogos.fotionatal.com` fornecido na solicitação diverge e **não** deve receber configuração DNS automaticamente.

## 1. Mapa de autoridades — Ponta a ponta

```text
Operador Windows [pasta autorizada]
    ↓ identificação de fotos elegíveis (não confundir produtos SóClick)
EvydFlow Python: orders.detail (CRM autenticado; UUID é identidade, NÃO autorização)
    ↓ gallery.publish_revision (opt-in; YAML lab isolado)
tools/media-pipeline/src/prepareLocal.ts / Node+Sharp
    ↓ 3 derivados WebP (thumb, card, game) por foto + hashes/manifesto
tools/deploy/publish-session.mjs (lock, checkpoint, replay)
    ↓ canal privado Tailscale: Bearer secret, POST resolve, POST publications,
      PUT pending blobs, GET status, POST activate CAS
Catalog Server Node: SessionRepository(SQLite WAL) + FileSystemStorageService
    ↓ ACTIVE somente após 100% de READY e CAS; retorno privado
EvydFlow: recibo ACTIVE com hub_url / gallery_url (capability tokens, secrets)
    ↓ navegador cliente com token efetivamente autorizado
GET /s/:token/data → React SessionDataLoader → Hub (/s/:token)
                         e Galeria (/s/:token/fotos), jogos e imagens /media.
```

**CRM:** O Catalog Server `/internal/v1/sessions/resolve` cria/resgata uma sessão SQLite a partir de UUID; **não cria cliente CRM nem prova consulta ao CRM**. A task Python verifica `steps.crm.order.uuid` antes do publisher, mas deve confirmar estado do pedido, cliente, cancelamento, elegibilidade/consentimento; também adicionar autoridade server-to-server/atestado assinado verificável no backend para impedir chamadas arbitrárias autenticadas apenas como publisher.

## 2. Inventário por componente

| Parte              | Já existe                                                                             | Falta/risco                                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CRM→Python         | `orders.detail` no flow `natal_gallery_publish_lab`                                   | autorização efetiva do pedido, status cancelado, escopo de fotos; não confundir cliente CRM com sessão local                                                                                                                                                             |
| Seleção/Node+Sharp | `prepareLocal.ts`, derivados WebP e manifesto                                         | testar pasta real autorizada, orientation/EXIF, variação contagem, concorrência e limites                                                                                                                                                                                |
| Python→Gameplay    | adaptador `christmas_gallery.py`, flags opt-in, CLI privado                           | consolidar duplicação PR #14/#15, teste E2E Windows real sem WhatsApp                                                                                                                                                                                                    |
| Upload/SQLite      | 5 endpoints privados, atomic CAS, blobs com SHA, PR #19 lock/recovery e backup        | certificar ACL, restore real com processo interrompido e hostname privado; comprovar CDN/Caddy e backup conjunto                                                                                                                                                         |
| Recibo e links     | `ACTIVE`, `accessUrl`, `hubUrl`, `galleryUrl`                                         | armazenamento privado/auditoria: EvydFlow `gallery.publish_revision` ainda retorna receipt completo para `StepState.save_output`; `safe_receipt_summary` EXISTE mas não é chamado pela task/executor nesse HEAD. Fazer vault/ACL e gravar APENAS summary no estado comum |
| Browser cliente    | PR #19 `SessionDataLoader` + `AppRouter` fail-closed                                  | smoke real HTML/JSON/WebP, Android+iOS físicos, rotas de imagens, revogação e isolamento                                                                                                                                                                                 |
| Home demo          | **Esta branch:** `/` e `/demo/fotos`, `/demo/game/:id`, fixture sintética de 12 itens | substituir desenhos SVG por fotos demo autorizadas assim que o operador informar a pasta, processá-las offline e testar release/URL HTTPS                                                                                                                                |
| Infra              | compose separado staging/persistência, Nginx isolado, healthz                         | Caddy edge/proxy e DNS ao vivo, release canário, observabilidade/rollback; sem tocar serviços compartilhados                                                                                                                                                             |

## 3. Demo pública: contrato da raiz

- `GET /` serve HTML Vite no Nginx (sem `/s/:token`, sem consultar CRM). React usa **explicitamente** `demo: true` apenas para raiz e rotas `/demo/fotos`, `/demo/game/:gameId`.
- A primeira versão utiliza **somente SVGs sintéticos** já empacotados em `apps/play/public/fixtures` (12 posições); **não são fotografias reais**. Não representar isso como demo fotográfica final.
- O Nginx mantém fallback 404 para rotas desconhecidas; `/s/:token` continua API/autorização e nunca recebe fallback de demo.
- A demo permanece visível mesmo que `releaseMode` bloqueie cliente real. Ela não altera `pilotReady`, `customerDataAllowed`, `automaticDeliveryAllowed`.
- Quando a pasta de demo for informada, **não** publicar originais ou caminho `L:\\...` no Git; validar autorização de uso, retirar EXIF/localização, redimensionar e gerar derivados WebP limitados com Node/Sharp, apresentar uma amostra e só então trocar **exclusivamente** os assets da demo. Fotos reais de clientes não entram no `apps/play/public/` nem em `/fixtures/`. Implementar um manifesto/build público explícito da demo separado do manifesto privado de sessões; jamais adaptar `/internal/v1` para leitura anônima.
- Se a demo precisar continuar independente da VPS/Catalog, servir apenas assets demo já autorizados e versionados/sincronizados no pacote público; não inventar token de cliente nem usar `sessionRepo.resolve` para conteúdo demo.
- Nginx: `deploy/vps/docker/nginx.conf` é o caminho da stack Docker atual; `deploy/vps/nginx/christmas-games.conf.example` é exemplo alternativo (não ativar duas topologias). O Caddy externo deve encaminhar `/` ao gateway sem reescritas inesperadas.

## 4. P0 que impedem piloto real

1. Confirmar autorização de pedido CRM no **Catalog Server**, não apenas UUID válido no Python.
2. Consolidar EvydFlow em um adaptador, concluir receipt privado seguro (o `StepState` grava JSON sem ACL explícita) e validar consumidores de hub/galeria.
3. Validar integração real de três endpoints visíveis: `/s/:token` (HTML), `/s/:token/data` (JSON) e `/s/:token/media/...` (WEBP). Não supor que browser vê imagens porque `healthz` retorna 200.
4. Comprovar staging/persistência/restore conjunto; `node:sqlite` WAL precisa de snapshot consistente e blobs sincronizados.
5. Revisar Caddy e logs (capabilities não devem constar em logs/referrers); validar revogação de token e zero cruzamento entre pedidos A/B.
6. Cumprir gates de dispositivos físicos e autorização de piloto; manter flags em `deploy/readiness.json` fechadas até evidência.

## 5. Teste mínimo/operacional do Antigravity

```powershell
pnpm agent:doctor
pnpm vitest run apps/play/src/app/AppNavigation.test.ts apps/play/src/app/SessionDataLoader.test.ts tools/deploy/staging-boundaries.test.mjs
pnpm exec playwright test tests/e2e/public-demo-root.spec.ts
pnpm check:fast
pnpm repo:map
pnpm check
pnpm release:staging
pnpm release:verify
```

- Primeiro validar localmente `/`, `/demo/fotos`, `/demo/game/memory` sem API CRM; `/s/token-inexistente` nunca pode mostrar fixture.
- Inspecionar build de staging servido por Nginx (não basta teste Vite DEV). Se há teste com token sintético autorizado, usar o pipeline privado, verificar imagens e ativação CAS; não enviar WhatsApp.
- Só após aprovado o novo release staging, preparar deploy operacional canário pela automação local existente; **não** executar `git merge`, troca de symlink, compose restart nem produção sem um checkpoint verde e autorização.
- Pós-deploy: `curl -I https://jogos.fotosdenatal.com/` → 200 e HTML; `curl -I .../demo/fotos` → 200; `/unknown` → 404; `/internal/v1/` público → 403; validar browser JS/WEBP e cache sem leaks. Verificar gateway interno vs Caddy externo.

## 6. Ordem GitHub/PR — não confundir com main

- Base funcional de fotos Gameplay: PRs #15 (Corte 2) → #16 (privacidade) → #18 (checkpoint) → #19 (concurrency+loader) → branch desta demo.
- Gameplay #17 é documentação colateral; incorporar conteúdo relevante no handoff, não tentar merge sem comparar ancestry.
- EvydFlow PR #14 contém task + DAG, PR #15 outro adaptador, PR #17 deriva #14 e adiciona retorno/summary; unificar antes de promover `main`.
- Repositório Gameplay declara default branch `codex/puzzle-native-like-v1`, **não assumir `main`**. Confirmar target real das PRs e estado remoto antes de integrar.
- Guardar os documentos de handoff e recibos sem PII/URL com token. Evitar documentação duplicada ou 10 PRs paralelos.

## 7. Critérios de saída

- **Demo pública:** no release instalado, raiz 200+HTML renderizado, navegação galeria/jogos e fotos sintéticas/permitidas visíveis sem CRM, desconhecidos 404.
- **Piloto cliente:** CRM autoriza pedido, Node gera exatamente 3 variantes por foto elegível, upload retoma sem duplicar, session ACTIVE, frontend remoto carrega a sessão exata, receipt privado oferece hub e galeria, sem vazamento de link/WhatsApp automático.
- **Gates atuais:** `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`. **GO somente para demo sintética**, não para foto de cliente.
