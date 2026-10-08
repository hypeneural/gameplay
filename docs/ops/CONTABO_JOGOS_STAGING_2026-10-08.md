# Contabo / jogos.fotosdenatal.com — plano de staging

Data 2026-10-08. Status: proposta técnica, NÃO implantada. Owner da infra: EvolutionGO em /srv/platform, repositório remoto por confirmar. Owner do app: gameplay. Dependência: PR #7.

## Achados verificados vs relatados
- Relato do operador: DNS A jogos.fotosdenatal.com apontado no Plesk da revenda para a VPS. Isso NÃO confirma DNS público, HTTPS, abertura de 80/443 ou saúde da aplicação.
- Manual histórico EvolutionGO (fornecido): VPS Ubuntu 24.04, Caddy como borda pública de TLS/80/443, Docker edge, acesso Tailscale/SSH e sudo stackctl. Não houve inspeção live do host.
- Este repo possui Node 24/catalog-server, bundler de staging-demo, templates systemd+Nginx e runbook docs/ops/VPS_STAGING_DEMO_RUNBOOK.md. O Nginx de deploy foi concebido como borda HTTPS, conflito potencial com Caddy na VPS relatada.
- Runtime atual apps/catalog-server/src/CatalogServer.ts só aceita GET e HEAD; não implementa upload, SQLite, grants nem publicação de sessões reais.
- deploy/readiness.json limita release a staging-demo sintético. Não alterar pilotReady=false, customerDataAllowed=false, automaticDeliveryAllowed=false para contornar recursos ausentes.

## Topologia preferencial, condicionada ao inventário da VPS
Cliente -> DNS -> Caddy existente TLS :443 -> rede Docker edge -> gateway christmas-games-web (Nginx interno :8080) -> catalog-server Node :4180 na rede privada -> DB/media privadas no PILOTO futuro.
- Caddy permanece único dono das portas host 80/443 e dos certificados. Adicionar somente um hostname ao Caddyfile verdadeiro na plataforma, sem tocar nos demais virtual hosts. O Plesk gerencia a zona DNS do domínio, não o webserver da Contabo.
- Web gateway Nginx (interno, sem mapeamento de portas host) é necessário para servir assets e resolver X-Accel-Redirect, que não é uma função automática do Caddy reverse_proxy.
- Gateway Nginx entra em edge e rede privada. Catalog entra SOMENTE na rede privada. Banco e diretório de mídia não entram na edge.
- Backend upstream do Nginx deve ser catalog:4180, NÃO 127.0.0.1:4180 (endereço local do próprio container).
- Imagens pinadas após revisão, usuario não-root, limites CPU/RAM/PIDs, healthchecks internos, volumes somente leitura para releases, segredos externos, logs sem tokens de URL.
- Caddy exemplo de INTENÇÃO (não aplicar sem inspecionar stack): hostname jogos.fotosdenatal.com; reverse_proxy christmas-games-web:8080.
- Não subir um segundo servidor ouvindo :80/:443. Caso a estratégia systemd seja escolhida, comprovar como Caddy Docker alcançará um gateway host PRIVADO, sem expor :4180 ao público. Não implantar duas topologias em paralelo.

## Organização proposta de diretórios, reconciliar com infra local
- /srv/platform/stacks/christmas-games/ : arquivo compose.yaml, stack.yaml e manutenção pelo stackctl da plataforma.
- /srv/platform/stacks/caddy/Caddyfile : ÚNICA origem de configuração do virtual host, a validar no host.
- /srv/christmas-games/releases/{release-id}/ : releases imutáveis gerados em CI/workstation; contém RELEASE.json, web, server, ops.
- /srv/christmas-games/current : ponteiro humano para release corrente, não confiar em bind mount de symlink ao trocar de versão.
- /var/lib/christmas-games/sqlite/ : DB persistente local e arquivos WAL/SHM (futuro).
- /srv/christmas-private/derived/ : derivados privados para leitura autorizada, Nginx read-only (futuro).
- /srv/christmas-private/staging/ : área temporária de upload com quota e limpeza segura (futuro).
- /srv/secrets/christmas-games/ : segredos estritamente protegidos, fora do Git.
- /srv/backups/christmas-games/ : backups consistentes com cópia offsite (futuro).
O manual EvolutionGO usa /srv/runtime e /srv/apps, enquanto o runbook gameplay usa /var/lib/christmas-games e /srv/christmas-games. NÃO criar duas árvores de dados. Antigravity escolhe e documenta um mapeamento único depois do inventário com paths e ACLs.

## Preflight obrigatório, somente leitura
1. Verificar DNS autoritativo A e AAAA em resolvedores externos, cert status, UFW, portas e processos do host, sem modificar DNS do domínio principal.
2. Acessar pelo canal Tailscale/SSH autorizado. Consultar sudo stackctl list/capacity/status caddy, rede edge, composição do Caddy e uso atual de discos/inodes, CPU/RAM/Swap.
3. Validar baseline de EvolutionGO, Asterisk e SmartDialer antes de qualquer nova stack. Não reiniciar processos vizinhos.
4. Validar ownership do Caddyfile e modelo exato do stackctl antes de gerar compose. Sem senha, access tokens ou inventário sensível em CI/PR público.
5. Medir espaço real agora. O valor da auditoria anterior não é telemetria atual. Planejar quotas, reserva e alertas.

## Fase 1 — somente site sintético de staging
- Build LOCAL/CI: pnpm install --frozen-lockfile; pnpm agent:doctor; pnpm check; pnpm asset:validate:all; pnpm release:staging; pnpm release:verify.
- Artefato .release/vps somente, sem node_modules, fotografias, RAW, .env, segredos ou original.
- Copiar para release-id imutável, verificar RELEASE.json na VPS antes de ativar; compose monta path versionado explícito RELEASE_ID. Symlink current sozinho não muda bind mount já existente.
- Criar PR separado no repositório INFRA para stack christmast-games e apenas um novo vhost Caddy; validar compose, Caddy, saúde, restart e rollback antes de aplicar.
- Testar /healthz, Hub demo, /s/{demo}/fotos, jogos, refresh, token inválido 404; /__dev não público; verificação de social image X-Accel-Redirect com local interno Nginx.
- Verificar que logs Caddy/Nginx/catalog não retêm URLs /s/{capability}; adicionar noindex, Referrer-Policy no-referrer, no-store no HTML privado.
- Registrar consumo de CPU/RAM/disco e efeito sobre serviços existentes; rollback SOMENTE da stack de jogos restaurando release-id anterior.

## Fase 2 — mídia real, ainda BLOQUEADA
Fluxo: Windows -> selecionar arquivos finais da raiz -> Node/Sharp local prepara WebP thumb/card/game -> publisher Node manual autenticado em canal PRIVADO -> API do catalog-server cria revisão STAGED -> upload verificado com checksum -> validação de todos arquivos -> ACTIVE atômico -> família usa token aleatório -> Galeria/Hub/Jogos com mesma revisão.
- Um pedido CRM = uma sessão/galeria, revisões A1/A2, nunca nova galeria para simples alteração de fotos.
- Não usar FTP/webroot/public JSON ou copiar originais para a VPS. Backend único apps/catalog-server; derivados privados externos ao release.
- Detalhes e contratos em docs/integrations/photo-sessions/SESSION_MEDIA_PUBLICATION_CONTRACT_V1.md.
- Ordem: SQLite WAL+repositório+testes A1/A2/B; grant/mídia privada; API upload/validate/activate; publisher Node manual; restore de backup; hardening; validação física; revisão LGPD; autorização humana para piloto; por último EvydFlow/WhatsApp.
- Não expor publisher na internet. Preferir Tailscale Windows<>VPS confirmado + HTTPS e escopos de credenciais, com rate/size limit. Se inexistente, bloquear deploy do publisher até definir canal seguro.
- Sem logs de capability, IDs de pedido, telefone, caminhos Windows, dados sensíveis, segredos ou mídia.
- SQLite WAL em filesystem local, backup online consistente e teste de restauração; proteger /srv/christmas-private e backups. Falha de A2 mantém A1 ativo. Alterações concorrentes com CAS 409 e replay idempotente.

## Responsabilidades e aceite do Antigravity
- A plataforma EvolutionGO possui docker-compose/stackctl/Caddy; gameplay possui app, gateway adapter, bundles, SQLite futuro, API e publisher.
- Infra repo remoto ainda não está confirmado nesta auditoria. Não escrever em repositório errado nem mexer na VPS sem inventário e permissão.
- Entregar PR de infraestrutura com compose Caddy interno e PR separado no gameplay para adaptação. Sem merge/deploy automático.
- Anexar preflight, decisões, diagrama, teste de schema/ACL, planos de rollback/backup, health, smoke, CI e bloqueios restantes.
- Nunca promover stage por editar flags em deploy/readiness.json.

## Referências oficiais
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- https://caddyserver.com/docs/automatic-https
- https://docs.docker.com/reference/compose-file/networks/
- https://nginx.org/en/docs/http/ngx_http_core_module.html
- https://sqlite.org/wal.html
