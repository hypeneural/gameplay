# HOTFIX P0 — tela branca /s/:token após release 16e7f65 (28/10/2026)

## Evidência recebida

Print Chrome DevTools, viewport 400×802, demonstra:

- documento de sessão `/s/:token` HTTP **200**, com HTML ~2.6 kB;
- `/assets/react-vendor-*.js` e `/assets/rolldown-runtime-*.js` HTTP **200**;
- `/assets/index-DoBqPLdB.js` e `/assets/index-DuAjMG-t.css` HTTP **404**;
- tela branca: bundle de entrada não inicializa. A publicação/UUID/token da
  família **não** é a causa direta desses 404.

**Causa provável de altíssima confiança, mas depende de inspeção dos mounts
para prova definitiva:** Etapa 8 moveu
`/srv/runtime/christmas-games/current` para `20261028-16e7f65`, recriou
somente `christmas-games-catalog` e recarregou Nginx **sem recriar**
`christmas-games-gateway`.
`compose.persistence.yaml` fixa `${RELEASE_DIR}/web` por bind mount em
**ambos** os containers. O catálogo lê `index.html` e o gateway entrega
`/assets/*` via `try_files $uri =404`. Um mount antigo no gateway mantém
chunks da release anterior, mesmo com symlink `current` apontando para a nova.
Algumas bibliotecas com hash inalterado seguem 200, como no print.

**Não fazer:** ativar token, republicar fotos, copiar o JS isolado para
a release anterior, `nginx -s reload`, `docker compose restart`, limpar
SQLite, alterar Caddy, `--remove-orphans`, `docker compose down`, full stack
`up` ou novo deploy do MCP. É desalinhamento de assets, não autorização.

## Inspeção sem alteração (Etapa A)

No host Media VPS, com Docker operacional, em worktree do Gameplay que
contém `tools/deploy/check-public-web-alignment.mjs`:

```bash
node tools/deploy/check-public-web-alignment.mjs
```

O comando usa apenas `docker exec` read-only para comparar, DENTRO dos
containers, SHA256 de ambos `/var/www/html/web/index.html`, JS/CSS
referenciados pelo HTML, e assets do shell HTTP já carregado em memória
pelo catálogo via demo `/`. Não lê URLs de clientes, fotos, segredos,
banco, credenciais ou envs.

Esperado ANTES: `BLOCKED_WEB_RELEASE_DRIFT` com pelo menos
`HTML_RELEASE_DRIFT` / `GATEWAY_ASSET_MISSING:index-...`.
Verifique ainda:

```bash
readlink -f /srv/runtime/christmas-games/current
docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' christmas-games-gateway
docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/www/html/web"}}{{.Source}}{{end}}{{end}}' christmas-games-gateway
docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/www/html/web"}}{{.Source}}{{end}}{{end}}' christmas-games-catalog
```

Anote IDs antes/depois de `christmas-games-catalog` e
`christmas-games-catalog-reader`; não registre URLs capability.

Se HTML e assets se mostram alinhados, **NÃO** recriar o gateway às cegas.
Investigar Caddy/cache/edge com devtools, validar caminho HTTP e headers.

## Correção mínima (Etapa B; apenas se A provar o drift)

1. Confirmar `/srv/runtime/christmas-games/releases/20261028-16e7f65/RELEASE.json`
   SHA `16e7f6548766d3df1b4f8399a704e0233a05448e` e manifesto completo
   verificado pelo `node tools/deploy/verify-vps-release.mjs <release-dir>`.
2. Confirmar que o projeto Compose real do gateway (via label Docker)
   coincide com a invocação a usar. Não criar novo projeto nem nova network.
   Preservar variáveis atuais `MEDIA_DIR`, `DATA_DIR`, `RELEASE_DIR` e
   demais valores efetivos: consultar o Compose normalizado e compará-lo
   ao container existente, sem registrar segredos no recibo.
3. Usar `RELEASE_DIR` EXPLICITAMENTE fixado à release já publicada
   `/srv/runtime/christmas-games/releases/20261028-16e7f65` para não
   depender de symlink durante a recreação. Não mudar o catalog/reader.
4. Aplicar **somente ao serviço `gateway`** uma vez, usando o mesmo
   `--project-name`, arquivos Compose e variáveis usados no serviço
   original:

```bash
# PSEUDOCOMANDO: ajustar --project-name e ambiente ao Compose LIVE verificado.
RELEASE_DIR=/srv/runtime/christmas-games/releases/20261028-16e7f65 \
docker compose --project-name "$PROJECT_EXISTENTE" \
  --profile audit-private \
  -f compose.yaml -f compose.private-audit.yaml \
  up -d --no-deps --no-build --force-recreate gateway
```

**Não executar literalmente se `PROJECT_EXISTENTE` não tiver sido
comprovado e o modelo Compose diferir do instalado.**
Esse é um breve corte do gateway Nginx, não uma troca de release, foto,
segredo ou publicação.

## Pós-corte (Etapa C, SEM LOOP)

- `node tools/deploy/check-public-web-alignment.mjs` deve produzir
  `WEB_ASSETS_ALIGNED`, sem diferenças entre HTML e assets dos containers;
- `GET /assets/index-DoBqPLdB.js` e
  `GET /assets/index-DuAjMG-t.css` devem ser HTTP **200** com MIME correto,
  nunca conteúdo HTML servido como fallback;
- via um único canário autorizado, `GET /s/:token`, `/fotos`,
  `/data` e thumb WebP, e renderização do app no Chrome responsivo 400×802;
- IDs, mounts e uptimes de `catalog` e `catalog-reader` inalterados;
- acesso `/internal/*` na borda segue 403, tokens inválidos 404;
- confirmar que demo `/` e `/demo/fotos` seguem operacionais;
- apagar nenhum cache global nem publicar novos links. O Vite recomenda
  HTML no-cache e assets hashed de longa vida, já implementados na
  política Nginx atual.
- Se falhar, registrar um único código (`BLOCKED_WEB_RELEASE_DRIFT`,
  `BLOCKED_COMPOSE_PROJECT`, `BLOCKED_EDGE_ASSETS`,
  `BLOCKED_BROWSER_APP`) e fazer rollback **somente do gateway** usando
  a release pública anterior realmente conhecida, sem alterar reader.

## Prevenção

Em futuros cortes com mudança de `RELEASE_DIR`, **catalog** e **gateway**
devem apontar ao mesmo `web/`. Rodar o auditor automatizado e verificar
JS/CSS 200 antes de liberar a página. Não reportar "GO_BROWSER" apenas por
HTTP 200 do HTML nem "GO_LINKS" apenas por metadados SQLite.

Fontes: https://docs.docker.com/engine/storage/bind-mounts/ ;
https://docs.docker.com/reference/cli/docker/compose/up/ ;
https://docs.docker.com/reference/cli/docker/compose/restart/ ;
https://vite.dev/guide/build .


## RECORRÊNCIA 29/10/2026 — novos hashes, MIME HTML

Nova evidência DevTools:
- `GET /assets/index-CXZUH_4f.js` -> HTTP 404;
- `/assets/index-BFvuR7tZ.css` -> `Content-Type: text/html`, recusado pelo navegador.
  **O status HTTP do CSS não foi fornecido**: pode ser uma página HTML de erro
  404 ou fallback de Caddy. Não afirmar 200 ou reconfigurar MIME para ocultar.
- Os nomes hash mudaram em relação ao incidente anterior. Investigar
  **repetição do fluxo de deploy** ou HTML antigo vindo de cache/borda;
  a recriação isolada de gateway é um paliativo, não corrige publicação futura.

A falha anterior da PR #48 era uma lacuna no gate: ela compara arquivos
dentro dos containers, mas não verifica HTTP/MIME na BORDA. Adicionado
`tools/deploy/check-public-asset-http.mjs` com teste de regressão.

### Uma única coleta: origem, gateway e navegador

No host Media VPS (em worktree com PR #48), primeiro rodar:
```bash
pnpm release:check-web-alignment
pnpm release:check-edge-assets index-CXZUH_4f.js index-BFvuR7tZ.css
```

O segundo comando acessa exclusivamente arquivos públicos no HTTPS
`jogos.fotosdenatal.com`; exige 200 + MIME JavaScript/CSS real e rejeita
redirect/HTML como asset. Sem argumentos, consulta só a demo `/` e deriva
os nomes publicados de JS/CSS. Nunca passar URL de família/token ao script.

Se a VPS não resolver DNS, diagnosticar `BLOCKED_DNS`; não marcar
`PUBLIC_EDGE_ASSETS_PASS` a partir de um teste apenas localhost.

Para distinguir Nginx do Caddy, do host seguro na mesma rede Docker:
```bash
docker exec christmas-games-catalog node -e '
const files=["index-CXZUH_4f.js","index-BFvuR7tZ.css"];
Promise.all(files.map(async name=>{
const r=await fetch("http://christmas-games-gateway/assets/"+name);
console.log(name,r.status,r.headers.get("content-type"));
})).then(()=>{}).catch(()=>process.exitCode=2)'
```
Sem dados privados. Registrar status e MIME; não registrar corpos HTML.
Conferir também `docker inspect` para `/var/www/html/web` em ambos
os serviços e `nginx -T` dentro do gateway para saber se o arquivo
`nginx.conf` efetivo é o esperado.

**Interpretação:**
1. Montagens divergentes, assets ausentes no gateway -> publicação
   incompleta do par catalog+gateway. Corrigir alinhamento de release.
2. Gateway entrega 200/CSS correto mas HTTPS público entrega HTML/404 ->
   problema no Caddy, virtual host, reverse proxy ou cache de borda.
3. Ambos entregam os hashes da release corrente, mas navegador pede
   arquivo de release anterior -> HTML antigo, cache HTTP ou service worker.
4. O arquivo não existe na própria release imutável -> bundle incompleto
   ou HTML incorreto; falha de build/deploy, não do proxy.
5. Arquivo existe no gateway e status 200 mas MIME HTML -> configuração
   incorreta do location /assets; **não** configurar o navegador para
   ignorar MIME.

### Correção duradoura — publicar HTML e assets como unidade

A origem do risco é `compose.persistence.yaml`: os **dois**
serviços montam `${RELEASE_DIR}/web`. Qualquer atualização que apenas
troque o symlink `current`, recrie `catalog` ou recarregue Nginx
pode deixar o HTML com um hash diferente dos assets no gateway.

Na implantação futura, após CI e build/manifesto validado:
- escolher um diretório **imutável** `/srv/runtime/christmas-games/releases/<SHA>`;
- provar que `web/index.html` referencia APENAS arquivos existentes
  nessa mesma árvore `web/assets`, com checksums do manifesto;
- preflight `docker compose config` no projeto correto, preservando
  mounts/env da produção, reader privado e gateway edge;
- **recriar conjuntamente catalog e gateway** com o mesmo
  `RELEASE_DIR` imutável; nunca aplicar só um dos dois serviços;
- antes de encerrar, exigir **os dois** gates:
  `WEB_ASSETS_ALIGNED` e `PUBLIC_EDGE_ASSETS_PASS` (200 + MIME),
  além do canário navegador/JSON/WebP;
- em falha, **rollback coordenado** dos dois serviços à release anterior
  comprovadamente íntegra, preservando o `catalog-reader`;
- não apagar os assets da release anterior durante a janela de cache de
  HTML/JS em navegadores abertos; prever retenção temporária de chunks
  antigos, conforme documentação Vite.

**Importante:** o `stackctl` da plataforma bloqueia deploy genérico
`christmas-games`. Não retirar esse guard. Preparar uma operação
publica transacional e auditável em PR independente, ou executar a
troca seletiva do **par** de serviços por operador com plano/rollback
comprovados e liberação explícita. Não usar `docker compose down`.

Fontes oficiais:
- https://vite.dev/guide/build
- https://vite.dev/guide/troubleshooting
- https://docs.docker.com/engine/storage/bind-mounts/
- https://docs.docker.com/reference/cli/docker/compose/up/
