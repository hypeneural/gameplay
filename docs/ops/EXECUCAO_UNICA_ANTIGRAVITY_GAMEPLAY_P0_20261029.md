# ANTIGRAVITY 3.8 FLASH — EXECUÇÃO ÚNICA P0 GAMEPLAY

**Leia este documento primeiro. Não improvise nem execute `docker compose down`.**
Esta etapa modifica SOMENTE o catálogo público de jogos/fotos (serviços
`christmas-games-catalog` e `christmas-games-gateway`) na Media VPS.
Ela NÃO modifica CRM, MCP, PrintServer, Z-API, WhatsApp, fotos, SQLite,
Caddy compartilhado nem `christmas-games-catalog-reader`.

## 0. Regras invioláveis

- PR base: `hypeneural/gameplay#48`, branch
  `hotfix/gameplay-web-assets-alignment-20261028`.
- Não fazer merge automático. Não usar o `stackctl deploy christmas-games`.
- Somente releases imutáveis em
  `/srv/runtime/christmas-games/releases/<diretório>`, nunca
  `current` como argumento.
- Não escolher ou inventar um SHA: copiar o `gitSha` exato de
  `RELEASE.json` e conferir contra o HEAD de origem.
- Não usar tokens de clientes em argumentos, URLs de log, CI ou recibos.
- Se faltar informação sobre variáveis Compose/segredos, PARAR com código
  `BLOCKED_COMPOSE_ENV`; não copiar valores para GitHub nem alterar
  `/srv/secrets`.
- Se falhar um gate, usar rollback do par somente uma vez. Não repetir
  operações em ciclo.

## 1. Código e release local (Avell)

No worktree limpo da PR #48:

```bash
pnpm install --frozen-lockfile
pnpm check
bash -n tools/deploy/apply-public-pair.sh
pnpm release:staging
pnpm release:verify
pnpm release:verify-bundled
```

Se o CI GitHub for `startup_failure`, registrar como problema do runner
e confirmar o código pelos comandos locais; não declarar o CI verde.
Se algum comando falhar, corrigir cirurgicamente na PR #48 e não seguir
para a VPS. Para código publicado, preferir SHA estável testado.
Verificar manifest e hashes antes de copiar release à VPS.

## 2. Provas read-only na Media VPS

No mesmo worktree, com Node/Docker disponíveis:

```bash
node tools/deploy/nginx-asset-policy.mjs
node tools/deploy/check-public-release-boundary.mjs
node tools/deploy/check-public-web-alignment.mjs
node tools/deploy/check-public-asset-http.mjs \
  index-CXZUH_4f.js index-BFvuR7tZ.css
```

Os três últimos podem acusar drift no estado atual: isso é diagnóstico,
não autorização para deploy. Preservar somente códigos, releases,
IDs públicos e hashes — sem configurações completas ou dados privados.

Inspecionar a configuração real:
`/srv/platform/stacks/christmas-games/nginx.conf`,
o projeto `com.docker.compose.project`, as montagens de `catalog`,
`gateway`, `catalog-reader`, as redes e o Caddy efetivamente ativo.
Atenção: Caddy é compartilhado com outros sistemas. NÃO recarregá-lo
nem modificá-lo neste procedimento.

## 3. Corrigir APENAS cache 404 no Nginx do Gameplay, se necessário

Se o primeiro comando retornar `BLOCKED_IMMUTABLE_404`, executar
somente o instalador narrow-diff (backup 0600, patch exato e teste com
container Nginx temporário isolado; não reinicia o gateway):

```bash
sudo node tools/deploy/stage-public-nginx-policy.mjs --apply
node tools/deploy/nginx-asset-policy.mjs
```

Esperar `ASSET_CACHE_POLICY_PASS`. Caso contrário, parar.
Se a configuração difere em qualquer outro ponto, o instalador bloqueia;
não substituir o Nginx inteiro nem copiar um template por cima.

## 4. Preflight da release nova e rollback — 100% read-only

Anotar três valores EXATOS, previamente verificados:
- `NEW_RELEASE`: diretório imutável do release novo;
- `GOOD_RELEASE`: diretório imutável do último release bom;
- `NEW_SHA`: SHA Git completo de 40 caracteres de `NEW_RELEASE/RELEASE.json`.

Os dois diretórios devem existir e estar íntegros. NÃO usar
`20261028-16e7f65` automaticamente se o bundle real tiver mudado.

```bash
node tools/deploy/verify-vps-release.mjs "$NEW_RELEASE"
node tools/deploy/verify-vps-release.mjs "$GOOD_RELEASE"
node tools/deploy/verify-public-cut-plan.mjs "$NEW_RELEASE"
```

Requer `PUBLIC_CUT_PLAN_PASS`. O verificador lê `docker inspect` e
`docker compose config --format json` internamente, sem imprimir os
segredos. Rejeita mudanças não previstas em banco, mounts, comandos,
imagens, portas, redes, flags e serviço reader. Se os ambientes
necessários não estiverem carregados, NÃO contornar a verificação:
recuperar somente os caminhos/flags existentes e repetir apenas
o preflight, nunca o deploy.

## 5. Aplicação única no host aprovado

**Somente com CI/qualidade e todos os preflights válidos.**

```bash
sudo bash tools/deploy/apply-public-pair.sh --execute \
  "$NEW_RELEASE" "$GOOD_RELEASE" "$NEW_SHA"
```

A operação segura:
- valida release e rollback por SHA/manifesto antes de agir;
- usa os dois locks do `stackctl`;
- roda `docker compose ... up -d --wait --wait-timeout 90
  --no-deps --no-build --force-recreate catalog gateway` SOMENTE;
- exige `PUBLIC_RUNTIME_PASS` = mounts + HTML/JS/CSS + HTTP/MIME na
  borda + 404 sintético sem cache longo;
- preserva ID do reader e demais containers;
- atualiza `current` atomicamente APÓS verificações, se o ponteiro era
  exatamente o release bom ou o release novo;
- se falhar, tenta rollback do par uma vez, sem `down`, sem mexer no
  reader e sem limpeza da mídia.

**Não fazer uma segunda tentativa automática.** Se aparecer
`BLOCKED_PUBLIC_CUT:...`, registrar apenas o código e a evidência
sanitizada.

## 6. Browser e segurança — prova final do operador

`GO_PUBLIC_PAIR` significa que o HTTP público não quebrou.
NÃO significa que os jogos já estejam prontos.

Com um canário autorizado (sem registrar o token) testar Chrome
responsivo 400 × 802 e Safari/iPhone:
- `/s/:token` e `/fotos` renderizam React;
- JSON `/data` e WebP real carregam, sem erros no Console;
- `/internal/*` retorna acesso negado na borda;
- token sintético e revogado não abrem a sessão;
- página `/` e demo permanecem disponíveis;
- os outros containers e serviços da VPS seguem com seus IDs.

Se tudo passar: `GO_PUBLIC_GAMEPLAY`. Caso contrário:
`BLOCKED_BROWSER`, sem mensagens WhatsApp, sem republicar fotos.

## 7. Prevenção futura

Para **todas** as futuras releases, usar o mesmo procedimento.
Nunca atualizar só o symlink `current`, só o `catalog` ou só o Nginx.
Nunca declarar GO só por `/healthz` 200. O frontend já tem proteção
`vite:preloadError`; não criar reload infinito.

**Risco ainda residual:** navegadores já abertos podem depender de
chunks anteriores. A retenção física de releases antigas não os torna
acessíveis se Nginx servir somente `new/web/assets`. Um store
append-only versionado + fallback read-only precisa de uma PR separada;
não alterar mounts na correção P0 sem homologação.

## Recibo obrigatório

Produzir somente:
`gitSha` (novo e rollback), nome do release, IDs dos containers
públicos antes/depois, reader ID preservado, status dos cinco gates,
status HTTP/MIME, CI, canário mobile, decisão GO/BLOCKED e rollback.
Sem nomes de famílias, tokens, segredos, dumps, arquivo `.env` ou
configuração Compose integral.
