# ANTIGRAVITY — implantar Dashboard Operação de Galerias Natal 2026 (corte administrativo)

**Data 28/10/2026. Prioridade: um corte curto, isolado e com rollback.**
O ChatGPT implementou código nas branches e validou os testes offline. Este roteiro é para preparar e executar a **homologação em VPS**, sem alterar o CRM Laravel nem interferir em jogos públicos, PrintServer, Z-API, Foto/Media VPS, gateways LIVE ou filas.

## 1. Referências canônicas
- Gameplay PR #46: `https://github.com/hypeneural/gameplay/pull/46`, branch `feat/natal26-gallery-ops-dashboard-20261028` (base PR #43; **não mergear PR #43 automaticamente**).
- MCP PR #16: `https://github.com/hypeneural/evydencia-crm-mcp/pull/16`, branch `feat/gallery-ops-canonical-reader-20261028` (base na PR #14; **não publicar PR #14/PrintServer/Z-API como efeito colateral**).
- `docs/integrations/GALLERY_OPS_SECURE_DEPLOYMENT_20261028.md` e `evydencia-crm-mcp/docs/GALLERY_OPS_CANONICAL_READER_20261028.md`.
- Código-chave: `apps/gallery-ops/server/adminServer.mjs`, `apps/gallery-ops/src/main.tsx`, `scripts/crm-natal-bridge.php`, `src/gallery-ops-reader.mjs`.

## 2. Sincronizar com segurança
1. Conferir `git fetch --prune`, branch/HEAD remoto e status local dos dois worktrees. Não executar `reset --hard`, `push --force` nem sobrescrever mudanças locais. Confirmar que a branch de trabalho é exatamente a da PR correspondente.
2. No MCP executar **offline**: `npm ci --ignore-scripts`, `php -l scripts/crm-natal-bridge.php`, `npm run check`, `npm test` e `npm run gallery-ops:test`.
3. No Gameplay executar: `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm check`, `node --test apps/gallery-ops/server/adminServer.test.mjs`, `pnpm --filter @christmas-games/gallery-ops build` e `pnpm exec playwright test --config apps/gallery-ops/playwright.config.ts`.
4. Se um gate falhar, parar e registrar comando/trecho mínimo de erro; não contornar auth, testes ou segredo.

## 3. Implantar somente os dois processos isolados (sem exposição pública ainda)
**MCP VPS:** adicionar **serviço systemd separado** para `node scripts/start-gallery-ops-reader.mjs`. Ambiente via arquivo secreto fora do Git: `EVYD_CRM_APP_PATH`, `GALLERY_OPS_READER_SECRET` (32+ bytes independentes), `GALLERY_OPS_READER_HOST=127.0.0.1` e `GALLERY_OPS_READER_PORT=4196`. Executar sob usuário não privilegiado com PHP em modo read-only. Não mudar serviço `evydencia-crm-mcp-live` nem seu gateway. Nunca expor porta 4196 no IP público.

**Gameplay VPS:** criar release separada com `apps/gallery-ops/dist` + `apps/gallery-ops/server`; usar overlay `deploy/vps/docker/compose.gallery-ops.yaml` SOMENTE depois de confirmar acesso privado do BFF ao reader MCP e reader Gameplay. Nada de editar `location /`, rotas `/s/`, `/demo` nem `readiness.json`. Verificar `docker compose config` do overlay antes de subir, com `GALLERY_OPS_ENV_FILE` e `GALLERY_OPS_RELEASE_DIR` fora do repositório. Mapeamento BFF dentro do container: `GALLERY_OPS_HOST=0.0.0.0`, mas **sem ports publicados** no host, somente `expose: 4189`.

**Rede entre VPS:** o reader MCP escuta apenas loopback, portanto um BFF em outra máquina não alcança diretamente `127.0.0.1:4196`. Configurar túnel privado autenticado, WireGuard com TLS ou sidecar proxy sem portas públicas e com allowlist. Confirmar de dentro do container BFF que a URL privada existe, usa TLS quando sai de loopback e não pode ser acessada da internet. Não trocar por endpoint público com Bearer exposto.

## 4. Autenticação administrativa obrigatória
Criar/usar app Cloudflare Zero Trust Access para `jogos.fotosdenatal.com/gestao/galerias/*`, com MFA e allowlist do gestor. Copiar do painel o **Application Audience (AUD)**, team domain e e-mails aprovados; não comitar valores.

Arquivo secreto do BFF: `GALLERY_OPS_CF_TEAM_DOMAIN`, `GALLERY_OPS_CF_AUD`, `GALLERY_OPS_ADMIN_EMAILS`, `GALLERY_OPS_MCP_READER_SECRET`, `GALLERY_OPS_GAMEPLAY_READ_SECRET`, `GALLERY_OPS_MCP_READER_URL`, `GALLERY_OPS_GAMEPLAY_READER_URL`, `GALLERY_OPS_PUBLIC_HOST=jogos.fotosdenatal.com`. `GALLERY_OPS_CUSTOMER_LINKS_ENABLED=0` no primeiro corte.

O BFF verifica assinatura RS256/JWKS, issuer, audience, expiração e e-mail allowlist **em cada requisição**. Não aceitar credencial falsa via `X-Forwarded-User` ou somente cookies do CRM. Testar negativa 401 diretamente no serviço interno sem JWT válido, 403 Host inesperado; no acesso público sem login é aceitável redirecionamento para a tela de login do Cloudflare Access (não esperar necessariamente 401 do edge).

## 5. Provas LIVE sem alterar pedidos
1. A partir da rede privada autorizada, provar `POST /internal/v1/gallery-ops/valid-orders` com Bearer correto e corpo JSON `{"limit":200,"after_id":0}` retornando contrato; sem Bearer deve dar 401; método errado 405. **Não registrar payload nominal em logs**.
2. Manter `as_of` da primeira página em todas as páginas. Confirmar que o somatório dos IDs/UUIDs únicos iguala `total_valid` e conferir a contagem do indicador comercial CRM para o **mesmo instante**. Não fixar 104: valor é dinâmico.
3. Verificar 3 classes sintéticas/anonimizadas: pedido antes da retirada, pedido sem sessão Gameplay, pedido com publicação. Reader faltando => status `unavailable`, **nunca** `no_session`.
4. Validar área HTML e as APIs `/api/orders`, `/api/export`: só operador autorizado recebe dados pessoais. Tabela deve mostrar **nome, WhatsApp, telefone alternativo, e-mail (se houver), pacote, status, data do pedido e sessão, fotos e publicação**. Busca por nome, #pedido, dígitos de telefone e e-mail; verificar filtro por pacote, status, datas, fotos; desktop e mobile.
5. Confirmar `Cache-Control: private, no-store` nos endpoints e CSV. Não registrar telefones, emails, tokens ou capability URLs no console, Nginx, logs de shell, screenshots de CI ou artefatos.
6. Links de galeria/hub permanecem bloqueados. Só depois de canário individual com verificação de disponibilidade e aprovação explícita liberar `GALLERY_OPS_CUSTOMER_LINKS_ENABLED=1` **e** o gate privado de links do reader; nunca abrir lote de capabilities.

## 6. Habilitar rota com rollback
Fazer backup da config Nginx atual. Integrar cirurgicamente `deploy/vps/docker/gallery-ops.nginx.snippet` em `server {}` *somente quando o backend estiver healthy*. Rodar `nginx -t`, ativar route, testar login/401/403, acesso gestor e rotas públicas originais. Fazer uma única consulta real de gestor, sem disparo nem escrita. Revalidar que jogos e `/s/:token` estão idênticos ao anterior. Se falhar, restaurar arquivo backup Nginx, `nginx -t`, reload, desligar **somente** os dois processos novos e deixar serviços originais intactos.

## 7. Entrega do Antigravity
Responder na issue/PR com: SHAs completos implantados, nomes de serviços, prova da paridade no mesmo `as_of` (somente números, sem PII), verificações 401/403, HTTP da rota, screenshots **anonimizados**, saúde de jogos pre/post, erros com causa, decisão **GO/NO-GO** e rollback executável. Não fechar PR Draft/mergear nem ampliar permissões sem os gates. Nunca imprimir segredos.

**Regra permanente:** dashboard administrativo pode visualizar PII de titulares autorizados; PII nunca é pública, nem enviada pelo ChatGPT, nem incluída em fixtures de CI. CRM Laravel é **somente leitura**.
