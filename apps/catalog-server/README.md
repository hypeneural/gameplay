# Servidor de catálogo e gateway de sessão

Este app entrega o HTML inicial de uma sessão autorizada, insere Open Graph antes do React e expõe o health check do gateway. O browser continua responsável pela interação; o Node decide se o link existe e qual arte social pode ser entregue.

## Estado atual

O código de VPS está deliberadamente limitado a **staging-demo sintético**.

Em produção, o processo só inicia quando recebe:

```text
NODE_ENV=production
CATALOG_RELEASE_STAGE=staging-demo
CATALOG_PUBLIC_ORIGIN=https://...
CATALOG_SOCIAL_PREVIEW_FILE=/caminho/privado/social-preview.json
CATALOG_APPLICATION_SHELL=/srv/christmas-games/current/web/index.html
```

Antes de abrir a porta, o processo valida o app shell e o JSON de preview. O estágio `pilot` continua bloqueado por `deploy/readiness.json`.

## Fluxo

```text
família/robô → GET /s/<token> → servidor autoriza → HTML com OG
família      → GET /s/<token>/fotos → mesmo shell autorizado
família      → GET /s/<token>/game/<id> → mesmo shell autorizado
robô social  → GET /s/<token>/social-preview → servidor revalida
Nginx interno ← X-Accel-Redirect ← arte genérica/consentida
monitor      → GET /healthz → status + releaseStage
```

O repository adapter atual usa um arquivo privado e recarrega a configuração em cada decisão para observar revogação. Um futuro adaptador SQLite pode substituir essa interface sem mudar a borda HTTP.

## Comandos

Desenvolvimento:

```bash
pnpm --filter @christmas-games/catalog-server start:dev
```

Build compilado:

```bash
pnpm --filter @christmas-games/catalog-server build
pnpm --filter @christmas-games/catalog-server start
```

Na VPS, não execute `tsx`. O artifact de staging contém somente `server/*.js`.

## Deploy canônico

Não use este diretório como fonte principal de deploy. O caminho canônico é:

- `deploy/readiness.json`;
- `deploy/vps/`;
- `docs/ops/VPS_STAGING_DEMO_RUNBOOK.md`;
- `.agents/skills/vps-staging-release/SKILL.md`.

O template completo de Nginx é `deploy/vps/nginx/christmas-games.conf.example`.

Ordem mínima antes de promoção:

```bash
pnpm agent:doctor
pnpm check
pnpm release:staging
pnpm release:verify
```

Depois da cópia para um release imutável na VPS, rode:

```bash
node ops/tools/verify-vps-release.mjs .
```

antes de trocar o symlink `current`.

## Consentimento de foto social

O padrão é sempre `generic`. `customer-photo` só é aceito quando o registro possui consentimento explícito. No estágio atual, `customerDataAllowed=false`; portanto staging-demo não deve conter foto real de cliente.

Nunca coloque no arquivo de configuração nome de cliente, caminho físico, telefone, pedido, credencial, URL de original ou token em logs.
