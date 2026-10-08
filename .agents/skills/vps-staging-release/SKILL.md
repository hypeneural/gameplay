---
name: vps-staging-release
description: Construa, verifique, instale e faça smoke do staging-demo na VPS sem desbloquear piloto ou expor dados de cliente.
---

# VPS Staging Release

Use esta skill para qualquer trabalho de release/VPS enquanto `deploy/readiness.json` mantiver `pilotReady=false`.

## 1. Diagnóstico

Execute:

```bash
pnpm agent:doctor
```

Se o resultado não for `status=ok`, corrija o repositório antes de empacotar.

## 2. Prova local

Na ordem:

```bash
pnpm check
pnpm release:staging
pnpm release:verify
```

Para mudança de galeria/rota, rode também:

```bash
pnpm test:e2e:gallery
```

Não substitua um gate por inspeção visual.

## 3. Artifact

O único diretório publicável é `.release/vps`.

Ele precisa conter:

- `package.json` mínimo com `type=module`;
- `web/`;
- `server/`;
- `public/social/`;
- `ops/`;
- `RELEASE.json`.

`pnpm release:verify` compara path, bytes e SHA-256 de cada arquivo e rejeita symlink/arquivo proibido.

## 4. Instalação

Na VPS:

- crie um diretório imutável em `/srv/christmas-games/releases/<id>`;
- copie/extrai o artifact;
- execute a verificação de release antes de ativar quando a ferramenta estiver disponível na workstation/artifact de operação;
- mantenha env/config privados em `/etc/christmas-games`;
- troque `current` de forma atômica para o novo release;
- reinicie o serviço; o `ExecStartPre` deve verificar o release antes de iniciar o Node;
- valide `127.0.0.1:4180/healthz` antes do Nginx.

Nunca altere arquivos dentro do release ativo.

## 5. Smoke externo

Da workstation/CI:

```bash
CG_STAGING_ORIGIN=https://dominio \
CG_STAGING_TOKEN=<token-sintetico> \
pnpm deploy:smoke
```

O smoke prova sem imprimir o token:

- health = staging-demo;
- Hub 200;
- Galeria 200;
- Puzzle 200;
- `Referrer-Policy: no-referrer`;
- token desconhecido = 404.

## 6. Rollback

Se qualquer smoke falhar:

1. restaure o symlink `current` para o release anterior;
2. reinicie o service;
3. prove `/healthz`;
4. investigue o release novo fora do caminho ativo.

## 7. Stop conditions

Pare e registre o bloqueio se:

- alguém pedir foto/cliente real no staging;
- `deploy/readiness.json` bloquear o estágio;
- CI estiver vermelho;
- a correção exigir credencial ausente;
- a correção pedir relaxar auth/privacidade;
- o host exigir build pesado;
- o merge target não tiver proteção/status checks e a mudança estiver sendo promovida sem revisão humana explícita.

Não transforme staging em piloto por atalho.
