# Auditoria forense — robustez do repositório, agente e deploy VPS

**Data:** 07/10/2026  
**Escopo:** `gameplay`, Galeria Natalina, Gallery Lab Node-first, CI, release staging, catalog-server e preparação do caminho para piloto multi-galerias.

Este documento existe para reduzir ambiguidade para agentes com menor capacidade de planejamento. Ele descreve o que o repositório **faz agora**, o que está **bloqueado** e qual é a próxima mudança permitida.

## 1. Classificação

- **OBSERVADO:** confirmado no código/configuração atual.
- **IMPLEMENTADO:** guard rail já presente no branch.
- **BLOQUEADOR:** não pode ser ignorado para o estágio indicado.
- **PRÓXIMO CORTE:** trabalho permitido e recomendado.
- **ADIADO:** não deve ser puxado para o caminho crítico.

## 2. Resumo executivo

O repositório já é suficiente para provar a experiência inteira com dados sintéticos e fotos locais reais sem Python:

```text
pasta de fotos
  -> Node/Sharp
  -> manifest/variant metrics
  -> Gallery Lab
  -> Hub
  -> Galeria Natalina
  -> Puzzle/jogos
```

Ele também passa a possuir um caminho explícito de **VPS staging-demo**:

```text
CI/workstation
  -> check
  -> build staging-demo
  -> release package
  -> SHA-256 inventory
  -> artifact imutável
  -> VPS release directory
  -> systemd 127.0.0.1
  -> Nginx HTTPS
  -> smoke
```

Esse caminho é deliberadamente sintético. Ele não é um piloto de clientes.

## 3. Risco principal: agente confundir estágio

### OBSERVADO

O frontend possui fixtures e o backend atual ainda não possui a autoridade real de photo sessions. Sem um guard rail, um agente poderia publicar uma fixture como se fosse sessão real.

### IMPLEMENTADO

Existem três estados explícitos no browser:

```text
development
staging-demo
production-disabled
```

- `development`: labs/fixtures permitidos;
- `staging-demo`: fixtures sintéticas permitidas, sem rotas dev;
- `production-disabled`: sessão privada indisponível por design.

`deploy/readiness.json` é a autoridade legível por máquina. No estado atual:

- `pilotReady=false`;
- `customerDataAllowed=false`;
- somente `staging-demo` é release permitido.

### Regra

Nunca transformar staging em pilot mudando apenas JSON, env, Nginx ou documentação.

## 4. Risco: Python entrar cedo demais

### OBSERVADO

O EvydFlow é importante operacionalmente, mas mistura CRM, fila, filesystem, mensageria e efeitos externos. Colocá-lo no primeiro loop de validação aumenta demais a superfície de diagnóstico.

### IMPLEMENTADO

O caminho canônico é Node-first:

```bash
pnpm gallery:prepare --source "<pasta>"
pnpm gallery:lab --source "<pasta>"
```

O worker já registra recipeKey e métricas reais por variante. A UI local consome derivados opacos.

### PRÓXIMO CORTE

Depois do backend real existir, provar a publicação por um **publisher Node manual** contra a mesma internal API. Só depois ligar EvydFlow como orquestrador.

## 5. Risco: mídia antiga reutilizada após mudança de receita

### IMPLEMENTADO

O namespace de derivados inclui:

```text
sourceHash + recipeKey
```

O snapshot privado é re-hasheado depois da cópia antes da derivação. Cada variante registra width, height e byteLength reais.

Isso é pré-requisito para responsive images confiáveis e para não reutilizar cache incompatível.

## 6. Risco: Gallery mobile carregar engine de jogo

### IMPLEMENTADO

A GalleryRoute é lazy e o Phaser continua importado somente no runtime do jogo.

Gates:

- zero canvas antes de entrar no jogo;
- zero request de Phaser na Gallery;
- 8 fotos no lote inicial;
- uma coluna em phone, duas em tablet e três em faixa maior;
- lightbox separado;
- scroll/foto preservados no ciclo Gallery -> Puzzle -> Gallery.

O CI possui um job E2E dedicado para `tests/e2e/session-gallery.spec.ts`.

## 7. Risco: staging gerar bundle sem proteção

### IMPLEMENTADO

`pnpm release:staging` produz somente `.release/vps`.

O packager:

- consulta `deploy/readiness.json`;
- não permite estágio bloqueado;
- inventaria bytes e SHA-256;
- rejeita TypeScript, sourcemap, DB/SQLite/WAL/SHM, logs, chaves, credenciais, node_modules, originals e mídia local;
- rejeita symlinks e tipos especiais de filesystem;
- inclui somente web build, server compilado, arte social genérica e arquivos operacionais;
- inclui o próprio verificador/smoke em `ops/tools`.

`pnpm release:verify` recalcula o inventário e compara path + bytes + SHA-256.

## 8. Risco: artifact mudar durante transferência

### IMPLEMENTADO

O release contém `RELEASE.json` e um verificador Node autocontido.

Depois de copiar para um novo release na VPS, antes de trocar `current`:

```bash
cd /srv/christmas-games/releases/<release-id>
node ops/tools/verify-vps-release.mjs .
```

Falha de hash, arquivo extra/faltante, symlink ou arquivo proibido bloqueia promoção.

## 9. Risco: processo parecer saudável sem conseguir servir

### IMPLEMENTADO

O catalog-server compila para JavaScript e roda com Node, não `tsx`, na VPS.

Em produção ele exige explicitamente:

- `CATALOG_RELEASE_STAGE=staging-demo`;
- `CATALOG_PUBLIC_ORIGIN=https://...`;
- `CATALOG_SOCIAL_PREVIEW_FILE=...`;
- `CATALOG_APPLICATION_SHELL=...`.

Antes de escutar a porta ele valida shell e configuração social. Configuração inválida falha no startup.

`/healthz` só fica disponível depois desse bootstrap.

## 10. Risco: rota direta da Galeria quebrar na borda

### IMPLEMENTADO

O catalog-server aceita:

```text
/s/:token
/s/:token/fotos
/s/:token/game/:gameId
/s/:token/social-preview
```

O Nginx de staging espelha essas rotas e desliga access log para URLs com capability token.

Foi identificado e corrigido um detalhe específico: fixtures sintéticas vivem em `/fixtures/`, fora de `/assets/`. O template Nginx agora expõe somente esse prefixo sintético de forma explícita, sem criar fallback SPA genérico.

## 11. Risco: token vazar em observabilidade

### IMPLEMENTADO em staging

- access log desligado nas rotas `/s/:token...`;
- `Referrer-Policy: no-referrer`;
- logs do Node registram decisão/tipo, não token;
- smoke não imprime token.

### BLOQUEADOR antes de pilot

Capability em path ainda exige uma estratégia completa de bootstrap/log de erro para cliente real. Esse item permanece em `deploy/readiness.json`.

## 12. Risco: CI verde significar só typecheck

### IMPLEMENTADO

CI é dividido em:

1. `agent:doctor`;
2. check: TypeScript/lint/unit/architecture/deadcode/format/repo-map;
3. assets/provenance;
4. readiness;
5. build production fail-closed;
6. Gallery mobile E2E em Chromium nas quatro faixas já definidas.

O workflow manual de staging repete os gates relevantes, gera release e verifica SHA antes de publicar artifact.

## 13. Supply chain de GitHub Actions

### OBSERVADO e atualizado

A auditoria encontrou um erro real no guidance anterior: `actions/upload-artifact@v7.0.2` não existe. A release atual validada em 07/10/2026 é `v7.0.1`.

Os workflows canônicos agora usam **commit SHA completo**, com comentário da release humana:

- checkout v7.0.1 -> `3d3c42e5aac5ba805825da76410c181273ba90b1`;
- setup-node v7.0.0 -> `820762786026740c76f36085b0efc47a31fe5020`;
- cache v6.1.0 -> `55cc8345863c7cc4c66a329aec7e433d2d1c52a9`;
- upload-artifact v7.0.1 -> `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`;
- pnpm/action-setup v6.1.0 -> `ea17c68df8912ef543352723c149a84f56e3d413`.

Checkout usa `persist-credentials: false` porque os jobs canônicos não fazem push.

`pnpm agent:doctor` valida que os workflows continuam pinados a SHA completo e que os pins canônicos não foram substituídos silenciosamente por tags/majors.

## 14. Risco: artefato local não corresponder ao commit

### IMPLEMENTADO

`release:staging` agora recusa árvore Git suja ou HEAD não resolvível antes de montar o artifact. Isso impede um `RELEASE.json` apontar para um commit enquanto o bundle contém alterações locais diferentes.

Arquivos ignorados de build/release não bloqueiam o fluxo; fonte nova/modificada não commitada bloqueia.

## 15. Risco: base branch sem proteção

### OBSERVADO — BLOQUEADOR de governança

O merge target atual não está protegido e não exige status checks no GitHub.

Isso significa que CI pode existir e ainda ser ignorado por merge/push humano ou agente.

### Ação fora do código

Configurar GitHub Ruleset/branch protection com, no mínimo:

- pull request obrigatório;
- CI/Quality Gates obrigatório;
- Gallery mobile E2E obrigatório;
- bloquear force push;
- bloquear delete;
- exigir branch atualizado quando apropriado.

Enquanto isso não existir, o runbook do agente trata "não mergear head vermelho" como fronteira humana obrigatória.

## 16. Risco: modelo escolher prioridade errada

### IMPLEMENTADO

`.agents/current-state.json` é o estado curto e legível por máquina do trabalho atual.

Ele declara:

- modo do repositório;
- estágio de release;
- ações permitidas agora;
- ações proibidas até o piloto;
- próximo marco;
- evidências necessárias;
- comandos canônicos;
- campos obrigatórios de handoff.

`pnpm agent:doctor` valida que esse estado concorda com `deploy/readiness.json`.

O próximo marco atual é `real-session-authority`, com owner `apps/catalog-server`. O owner ganhou `apps/catalog-server/AGENTS.md` e a skill `.agents/skills/real-session-authority/SKILL.md`.

## 17. Risco: documentação ficar maior que o modelo consegue usar

O repositório possui documentação extensa e útil, mas um modelo menor pode escolher o documento errado.

### IMPLEMENTADO

A ordem curta de descoberta é:

```text
AGENTS.md
-> pnpm agent:doctor
-> deploy/readiness.json
-> rule/skill do owner
-> active plan
-> auditoria detalhada somente quando necessária
```

Deploy tem rule/skill próprios. Gallery tem rule/skill próprios.

O arquivo grande não substitui o comando machine-readable.

## 18. Comandos que o agente deve memorizar

```bash
pnpm agent:doctor
pnpm check:fast
pnpm check
pnpm gallery:prepare --source "<pasta>"
pnpm gallery:lab --source "<pasta>"
pnpm test:e2e:gallery
pnpm release:staging
pnpm release:verify
pnpm deploy:smoke
```

Não inventar variações quando esses comandos já cobrem a intenção.

## 19. Caminho mais rápido para colocar algo na VPS

O objetivo imediato não é "pilot real". É provar infraestrutura e UX no domínio HTTPS real.

Sequência:

```text
1. CI verde
2. workflow Build VPS Staging Artifact
3. baixar artifact
4. criar release imutável na VPS
5. verificar SHA no release extraído
6. configurar env sintético
7. systemd
8. Nginx
9. health interno
10. health externo
11. smoke Hub/Galeria/Puzzle
12. teste manual Android/iPhone
```

Nenhuma foto real é necessária para esse marco.

## 20. Próximos cortes para chegar ao pilot

### PR A — SessionRepository SQLite

- migrations explícitas;
- session/revision/photo/media tables;
- WAL local;
- repository tests A/A2/B;
- nenhum token derivado de pedido.

### PR B — Public session/grant

- bootstrap por capability;
- browser grant;
- SessionProvider real;
- produção sem fixture;
- token inválido/revogado fail-closed.

### PR C — Media authorization

- activeRevision ownership;
- photo/variant allowlist;
- X-Accel para derivados privados;
- sem original;
- cross-session denial tests.

### PR D — Internal revision API

- create/begin revision;
- upload receipt/hash;
- verify exact set;
- CAS activate;
- idempotency.

### PR E — Manual Node publisher

- usa o manifest do mesmo media worker;
- publica uma sessão sem Python;
- recovery explícito;
- prova backup/restore.

### PR F — Pilot gate

- carga/restore;
- A/A2/B;
- Android físico;
- Safari/iPhone;
- política de token/log;
- GitHub required checks.

Somente então alterar readiness para permitir `pilot`.

### PR G — EvydFlow

Implementar `IGameplayProvider` como adapter para contratos já provados. Não mover Sharp para Python e não criar protocolo paralelo.

## 21. Itens deliberadamente adiados

- Postgres;
- microservices;
- queue distribuída;
- service worker/PWA;
- AVIF;
- quarta variante sem benchmark;
- virtualização sem profiling;
- automação de WhatsApp;
- build dentro da VPS.

## 22. Critério de handoff para agente

Toda entrega deve dizer:

1. estágio atual;
2. arquivos alterados;
3. invariável nova;
4. comando/teste executado;
5. CI/status conhecido;
6. blocker restante;
7. próximo corte permitido.

Nunca dizer "produção pronta" quando o estado machine-readable ainda diz `pilotReady=false`.
