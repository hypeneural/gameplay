---
trigger: model_decision
description: 'Ative ao tocar deploy, release, Nginx, systemd, readiness, ambiente VPS ou promoção de estágio.'
---

# Segurança de release e VPS

A regra principal é simples: o repositório só permite o estágio declarado em `deploy/readiness.json`.

## Antes de editar

1. Rode `pnpm agent:doctor`.
2. Leia `deploy/readiness.json`.
3. Leia `docs/ops/VPS_STAGING_DEMO_RUNBOOK.md`.
4. Leia `.agents/skills/vps-staging-release/SKILL.md`.

## Invariantes

- `staging-demo` usa apenas fixtures/dados sintéticos.
- `pilot` permanece bloqueado enquanto `pilotReady=false`.
- Não desbloqueie um estágio editando apenas JSON, env, Nginx ou documentação.
- Não faça build/Sharp/testes pesados na VPS.
- Não copie `node_modules`, TypeScript, sourcemaps, DB/WAL, logs, originals, credenciais ou mídia local para o release.
- Não edite JavaScript dentro de `current`; produza um release novo e imutável.
- Não faça deploy se CI, `agent:doctor`, `release:verify` ou readiness estiverem vermelhos.
- O catalog-server fica em `127.0.0.1`; Nginx é a única borda pública.
- Capability token não entra em access log. Estratégia de erro/log para token real continua bloqueador de piloto.
- Rollback troca apenas o symlink `current` para um release já verificado.

## Comandos canônicos

```bash
pnpm agent:doctor
pnpm check
pnpm release:staging
pnpm release:verify
```

Depois de instalar o artifact na VPS, execute o smoke da workstation/CI com variáveis de ambiente:

```bash
CG_STAGING_ORIGIN=https://dominio CG_STAGING_TOKEN=<token-sintetico> pnpm deploy:smoke
```

Nunca coloque token em documentação, commit, nome de artifact ou log de CI.
