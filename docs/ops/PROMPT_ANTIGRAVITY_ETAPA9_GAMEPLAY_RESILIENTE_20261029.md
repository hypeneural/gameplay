# ANTIGRAVITY — Etapa 9: P0 Gameplay, publicação pública resiliente (29/10/2026)

**Missão:** consertar uma única vez o branco recorrente no
`https://jogos.fotosdenatal.com` e fechar o processo de publicação para não
voltar a servir HTML novo com chunks JS/CSS ausentes. Usar a PR #48 como fonte
do código. **Não gerar, alterar, logar ou reemitir links privados de famílias.**

## Estado comprovado pelo ChatGPT no repositório

- `compose.persistence.yaml`: gateway e catalog usam bind mounts independentes
  `${RELEASE_DIR}/web`, por padrão através de `current`;
- `apps/catalog-server/src/main.ts`: lê o shell HTML uma vez no startup;
- `nginx.conf`: `/assets/` é servido pelo gateway com `try_files ... =404`;
- `stackctl` do SmartDialer bloqueia deploy global de `christmas-games`;
- docs oficiais Docker confirmam que um reload não recria mounts; Vite
  documenta stale HTML/imports entre releases.
- Erro do navegador: `index-CXZUH_4f.js` 404 e
  `index-BFvuR7tZ.css` retornando `text/html` (status CSS não fornecido).
- A configuração Caddy da VPS NÃO foi inspecionada por ChatGPT. Não assumir
  que o Caddyfile do repositório SmartDialer é o arquivo carregado em produção.

## Código preparado na PR #48

- `tools/deploy/verify-vps-release.mjs`: exige manifesto íntegro **e** HTML
  com par JS/CSS de entrada existente na release;
- `check-public-release-boundary.mjs`: compara release imutável dos mounts
  dos dois containers públicos e preservação do reader;
- `check-public-web-alignment.mjs`: compara HTML, assets e HTML cacheado
  na memória de `catalog`;
- `check-public-asset-http.mjs`: valida pelo HTTPS público HTTP 200/MIME
  correto, sem enviar token, nome ou foto de cliente;
- `verify-public-runtime.mjs`: consolida os três checks anteriores num
  único resultado `PUBLIC_RUNTIME_PASS` ou `BLOCKED_PUBLIC_RUNTIME`;
- regressões Vitest para status HTTP, MIME, mounts, CI e falha de um dos gates.

## Etapa A — inspeção única, SEM mutação

1. No worktree atualizado PR #48, confirme HEAD e CI; não use versão
   anterior dos scripts. `pnpm check` só se CI não abranger o HEAD.
2. Faça inventário dos containers, projeto Compose real e mounts efetivos
   (`docker inspect`), Caddy efetivamente carregado e `nginx -T`. Capture
   apenas IDs, releases e status HTTP, nunca arquivos de segredo ou tokens.
3. Execute, uma vez cada:

```bash
pnpm release:check-public-boundary
pnpm release:check-web-alignment
pnpm release:check-edge-assets index-CXZUH_4f.js index-BFvuR7tZ.css
pnpm release:verify-public-runtime
```

4. Execute `node tools/deploy/verify-vps-release.mjs
/srv/runtime/christmas-games/releases/<release-confirmada>` para validar
o manifesto real e os JS/CSS referenciados.
5. Diferencie e registre uma causa:
   - `PUBLIC_RELEASE_BOUNDARY`: releases/mounts diferentes;
   - `RUNNING_HTML_RELEASE_DRIFT`: Node carregou HTML antigo;
   - `EDGE_ASSET_HTTP_404`: arquivo ausente no HTTPS;
   - `EDGE_ASSET_WRONG_MIME`: Caddy/Nginx serve HTML para CSS/JS;
   - `OLD_BROWSER_HTML`: navegador ainda usa hash anterior;
   - `BUNDLE_INCOMPLETE`: release contém HTML sem o respectivo asset.
   Não chamar cache/MIME a causa sem evidência direta de headers/mounts.

## Etapa B — hotfix UMA VEZ, apenas após confirmar A

- Se o bundle estiver incompleto: NÃO implantá-lo. Voltar ao último artefato
  imutável completo e testado.
- Se HTML/asset drift: validar antes o `docker compose config` efetivo no
  projeto correto, com `RELEASE_DIR` **explicitamente fixado ao mesmo
  diretório imutável** para catalog e gateway, preservando todas as outras
  variáveis e montagens, redes e portas do host. Usar o mesmo projeto
  Compose real (labels) e apenas os serviços `catalog gateway` com
  `up -d --no-deps --no-build --force-recreate`.
- Se HTML/asset alinhados dentro dos containers mas falha no HTTPS: NÃO
  recriar containers. Corrigir exclusivamente o roteamento Caddy/Nginx
  responsável e repetir um único teste de borda.
- Não usar `down`, `--remove-orphans`, reinicialização global,
  `stackctl deploy christmas-games`, rollback cego, limpeza do SQLite
  ou restauração de mídia. Não tocar na VPS do CRM MCP ou no PrintServer.
- Tenha rollback **do par** catalog+gateway para o último SHA imutável
  validado antes do corte; reader privado preservado, sem `restart`
  simples. Se falhar, execute rollback coordenado uma vez.

## Etapa C — um único recibo pós-corte

Exigir simultaneamente:
- `PUBLIC_RELEASE_BOUNDARY_PASS`;
- `WEB_ASSETS_ALIGNED`;
- `PUBLIC_EDGE_ASSETS_PASS`;
- manifesto verificável para SHA ativo;
- JS/CSS **200 com MIME correto**, não HTML fallback;
- página pública + um canário autorizado (hub, galeria, JSON, WebP) funcional
  no navegador 400×802, incluindo JS boot e ausência de erro console;
- `/internal/*` segue bloqueado pela borda; tokens inválidos/revogados
  continuam 404; home/demo preservadas;
- reader privado, Caddy (se não houver causa no Caddy), MCP, Z-API, fotos,
  SQLite e demais containers preservados;
- `catalog` e `gateway` têm o mesmo release root e projeto Compose;
- zero imagens/tokens de clientes em CI, logs, GitHub, JSON de recibo.

**Resultado:** `GO_PUBLIC_GAMEPLAY` somente se todos passarem.
Caso contrário `BLOCKED_<CAUSA>`, um recibo e rollback; sem loop.

## Etapa D — prevenir reincidência futura

Modificar o procedimento canônico de publicação efetivamente usado na VPS
para exigir CI + manifesto + pin imutável + transição coordenada
`catalog gateway` + testes de runtime e borda **antes do GO**. A PR #48
fornece os gates, mas NÃO substitui automaticamente o wrapper instalado.

Manter chunks Vite de releases anteriores durante a janela de navegadores
abertos. Um armazenamento de assets append-only com GC controlado é a
alternativa estrutural para persistir chunks com nomes hash entre releases;
exige futura homologação de montagem e não está sendo ativado nesta PR.

## Documentação oficial
- https://docs.docker.com/reference/cli/docker/compose/up/
- https://docs.docker.com/engine/storage/bind-mounts/
- https://vite.dev/guide/build
- https://vite.dev/guide/troubleshooting
