# AntiGravity 2.19.1 — runbook determinístico do repositório

**Objetivo:** permitir que um modelo de menor capacidade execute mudanças seguras sem precisar reconstruir a arquitetura por inferência.

Este documento não substitui `AGENTS.md`, o plano ativo ou os `SPEC.md`. Ele define a sequência operacional obrigatória para reduzir erros de escopo, publicação e segurança.

## 1. Regra principal

Antes de editar qualquer arquivo, classifique a tarefa em exatamente um estágio:

| Estágio | Uso | Dados de cliente | Comando principal |
| --- | --- | --- | --- |
| `local-lab` | desenvolvimento, Gallery Lab, fixtures, testes | proibidos fora de pasta local controlada | `pnpm gallery:lab` / `pnpm check:fast` |
| `vps-staging-demo` | validar build, Nginx, systemd, mobile e jogos na VPS | proibidos | `pnpm release:staging` |
| `pilot` | sessão real de família | bloqueado no estado atual | nenhum; leia `deploy/readiness.json` |

Se a tarefa disser “produção”, “cliente”, “pedido real”, “WhatsApp real” ou “piloto”, leia `deploy/readiness.json`. Enquanto `pilotReady=false`, não improvise um caminho alternativo.

## 2. Sequência obrigatória de trabalho

### Passo A — descobrir o dono

Mapeie o pedido para um único dono primário:

- UI, rota, Hub, Galeria, React, navegação: `apps/play`;
- sessão, token, HTML inicial, autorização, ingestão, banco e mídia privada: `apps/catalog-server`;
- domínio de jogo: `packages/games/<game>/src/domain`;
- Phaser/presentation do jogo: `packages/games/<game>/src/runtime`;
- contratos compartilhados: `packages/platform`;
- tema/efeitos compartilhados: `packages/theme`;
- processamento de fotos: `tools/media-pipeline`;
- release/deploy: `tools/deploy` + `deploy`;
- decisões duráveis: `docs`.

Não crie um novo app, serviço ou store porque o local correto parece difícil.

### Passo B — ler antes de editar

Leia, nesta ordem:

1. `AGENTS.md`;
2. `deploy/readiness.json` quando a tarefa toca VPS/produção;
3. o `AGENTS.md`, regra ou `SPEC.md` mais próximo;
4. o arquivo atual que será alterado;
5. os testes do comportamento alterado;
6. o plano ativo quando a mudança é estrutural.

Nunca copie uma implementação de uma auditoria antiga sem conferir o head atual.

### Passo C — declarar a menor mudança coerente

Uma mudança coerente deve responder:

- qual problema real corrige;
- quais arquivos pertencem ao mesmo owner;
- qual teste prova o comportamento;
- qual comando canônico valida o conjunto.

Se precisar tocar mais de dois owners, divida em etapas com uma fronteira explícita.

### Passo D — implementar sem atalhos

Regras de código:

- preserve TypeScript `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`;
- não use `any` para eliminar erro de tipagem;
- não desative ESLint/Knip/Dependency Cruiser para fazer o gate passar;
- não mova lógica de domínio para React/Phaser;
- não introduza dependência nova antes de verificar se a stack atual resolve;
- efeitos colaterais de rede/arquivo precisam falhar fechados;
- toda autorização usa IDs opacos e ownership explícito;
- logs nunca recebem capability token, URL com token, nome/path de foto, telefone ou pedido.

### Passo E — validar em camadas

Use esta ordem; pare na primeira falha e corrija a causa:

```text
1. teste alvo
2. pnpm check:fast
3. pnpm check
4. pnpm build                      # mudança geral/produção
5. pnpm release:staging            # mudança de deploy/VPS
6. pnpm test:e2e                   # mudança de UX/lifecycle/rota
7. aparelho real                   # gate de piloto mobile
```

Não pule diretamente para E2E ou deploy quando typecheck/unit ainda falham.

## 3. Comandos canônicos

| Intenção | Comando |
| --- | --- |
| iniciar frontend local | `pnpm dev` |
| preparar fotos reais sem iniciar servidor | `pnpm gallery:prepare --source "<pasta>"` |
| preparar fotos + abrir Gallery Lab | `pnpm gallery:lab --source "<pasta>"` |
| prova rápida de código | `pnpm check:fast` |
| gate estático completo | `pnpm check` |
| build normal fail-closed | `pnpm build` |
| conferir release permitido | `pnpm deploy:readiness` |
| montar artefato VPS sintético | `pnpm release:staging` |
| E2E completo | `pnpm test:e2e` |
| pré-handoff máximo | `pnpm validate` |

Não invente variantes desses comandos quando a intenção já está coberta.

## 4. Como interpretar os modos do frontend

`apps/play/src/app/ReleaseMode.ts` é a autoridade do browser:

- `development`: fixtures e Gallery Lab local são permitidos;
- `staging-demo`: fixtures sintéticas são permitidas para a VPS de teste, sem seletor de fixture e sem rotas de laboratório;
- `production-disabled`: o shell compila, mas sessão privada fica indisponível de propósito.

Um build normal `pnpm build` não é um atalho para o piloto. O estado indisponível é um mecanismo de segurança.

## 5. Como interpretar o catalog-server

No estado atual, `apps/catalog-server` é um gateway compilável para HTML inicial/social preview e health check. Em `NODE_ENV=production` ele exige:

```text
CATALOG_RELEASE_STAGE=staging-demo
CATALOG_PUBLIC_ORIGIN=https://...
CATALOG_SOCIAL_PREVIEW_FILE=/caminho/privado/...
CATALOG_APPLICATION_SHELL=/srv/christmas-games/current/web/index.html
```

O processo escuta apenas `127.0.0.1`. Nginx é a borda pública.

Não habilite `pilot` alterando apenas `CATALOG_RELEASE_STAGE`: o código rejeita qualquer estágio diferente de `staging-demo` até a autoridade real de sessão/mídia existir.

## 6. Release VPS

`pnpm release:staging` faz duas coisas:

1. build Vite com `--mode staging-demo` + compilação do catalog-server;
2. gera `.release/vps` depois de verificar `deploy/readiness.json`.

O packager rejeita artefatos proibidos e não copia:

- `.map`;
- `.ts`/`.tsx`;
- `.env`;
- `node_modules`;
- originais;
- `.local-test-media`;
- `credentials.json`.

O bundle esperado contém `web/`, `server/`, `public/social/`, `ops/` e `RELEASE.json`.

## 7. Stop conditions

Interrompa a implementação e registre o bloqueio quando qualquer condição abaixo ocorrer:

- uma mudança exige credencial não disponível;
- o plano pede cliente real e `pilotReady=false`;
- uma API externa não tem contrato atual/documentado;
- a correção exigiria relaxar autorização, isolamento de sessão ou privacidade;
- o build só funciona executando ferramentas pesadas diretamente na VPS;
- o teste falha de forma que não pode ser explicada pelo diff atual;
- há conflito entre documentação canônica e código atual que muda o significado do produto.

“Parar” significa preservar o branch verde e documentar o próximo passo; não significa criar um fallback inseguro.

## 8. Padrão de diagnóstico

Quando um gate falhar, classifique antes de corrigir:

| Falha | Primeira ação |
| --- | --- |
| TypeScript | corrija o contrato/tipo; não use cast amplo |
| ESLint | corrija a estrutura; não desabilite regra |
| Vitest | reproduza o teste isolado e identifique regressão |
| Knip | remova export/dependência morta ou conecte o uso real |
| Dependency Cruiser | mova a dependência para a camada dona |
| Repo map | rode `pnpm repo:map` após árvore final |
| build Vite | trate import/chunk/config; não mude target sem justificativa |
| catalog build | preserve NodeNext/ESM e imports `.js` |
| release packager | leia o erro; não copie manualmente arquivo bloqueado |
| Nginx health | cheque systemd → `127.0.0.1:4180/healthz` → Nginx, nessa ordem |

## 9. Regras de Git para agente

- não force-push;
- não reescreva histórico;
- não delete branches;
- não use `git clean -fdx`;
- não reverta mudanças do usuário que não pertencem à tarefa;
- não faça commit de saída gerada localmente ignorada;
- não atualize lockfile sem mudança real de dependência;
- antes de handoff, informe exatamente o que foi validado e o que continua bloqueado.

## 10. Definição de pronto por estágio

### Local lab pronto

Código alvo verde, `pnpm check` verde e Gallery Lab funcional com derivados reais/sintéticos sem Python.

### VPS staging-demo pronto

`pnpm release:staging` verde, artifact instalado fora da webroot privada, catalog-server supervisionado, `/healthz` verde, `/s/<token>` sintético abre Hub/Galeria/Jogos, `/fotos` não carrega Phaser antes de abrir jogo e nenhum dado real de cliente existe no host de staging.

### Pilot pronto

Somente quando `deploy/readiness.json` for alterado junto com implementação/evidência para: sessão real persistente, grants de browser, isolamento cross-session, mídia privada autorizada, revisão atômica, backup/restore, publisher Node real e validação física mobile. Depois disso o runbook deve ganhar um novo comando canônico de release `pilot`; não reutilize `release:staging`.
