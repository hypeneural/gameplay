# VPS — deploy rápido e seguro do staging-demo

**Escopo atual:** somente validação sintética. `deploy/readiness.json` proíbe dados de cliente e piloto real.

A VPS compartilha recursos com outros serviços. Builds, Sharp e testes pesados devem rodar em workstation/CI; a VPS recebe somente o artefato pronto.

## 1. Gerar artefato

Na workstation ou GitHub Actions:

```bash
pnpm install --frozen-lockfile
pnpm agent:doctor
pnpm check
pnpm release:staging
pnpm release:verify
```

Saída local ignorada pelo Git:

```text
.release/vps/
  package.json
  web/
  server/
  public/social/
  ops/
  RELEASE.json
```

O bundle não contém `node_modules`, TypeScript, sourcemaps, `.env`, originais ou mídia de cliente.

## 2. Layout recomendado na VPS

```text
/srv/christmas-games/
  releases/<release-id>/
  current -> releases/<release-id>
/etc/christmas-games/
  catalog.env
  social-preview.json
/var/lib/christmas-games/
/srv/christmas-private/
```

Use um usuário de serviço dedicado `christmas-games`, sem login interativo. O release é somente leitura para o processo; futuros SQLite/media writes ficam em `/var/lib/christmas-games` e `/srv/christmas-private`.

## 3. Primeira instalação

1. Confirme `node --version` na VPS: o serviço exige Node 24 e o template assume `/usr/bin/node`. Se o binário gerenciado pelo host estiver em outro caminho, ajuste o template antes de instalar; não use NVM interativo em serviço systemd.
2. Crie usuário/grupo de serviço e diretórios com permissões mínimas.
3. Copie `.release/vps` para um novo diretório em `/srv/christmas-games/releases/` usando um ID imutável (timestamp + SHA é suficiente).
4. **Antes de ativar o release**, entre no diretório copiado e execute `node ops/tools/verify-vps-release.mjs .`. Não continue se SHA/inventário divergirem.
5. Copie `ops/catalog.env.example` para `/etc/christmas-games/catalog.env`, ajuste somente domínio/caminhos e aplique `chmod 600`.
6. Gere a configuração sintética fora do repositório com `pnpm deploy:staging-config --output <caminho-privado>` na workstation, ou use uma geração equivalente de 256 bits no host. O comando não imprime o token. Copie o JSON resultante para `/etc/christmas-games/social-preview.json` com `chmod 600`. O backend recusa `change-me`/placeholder em produção.
7. Instale `ops/christmas-games-catalog.service.example` como `/etc/systemd/system/christmas-games-catalog.service`.
8. Inclua `ops/nginx/christmas-games.conf.example` dentro do servidor HTTPS já administrado pela VPS/Plesk.
9. Valide `nginx -t` antes de reload.
10. Promova o symlink de forma atômica. Exemplo, executado a partir de `/srv/christmas-games`:

```bash
ln -s "releases/<release-id>" current.next
mv -Tf current.next current
```

11. Execute `systemctl daemon-reload` quando o unit file mudar e inicie/reinicie o serviço. O `ExecStartPre` verifica SHA/inventário novamente antes de cada start.

## 4. Ordem de validação

Teste sempre de dentro para fora:

```bash
systemctl status christmas-games-catalog --no-pager
curl --fail --silent http://127.0.0.1:4180/healthz
curl --fail --silent https://SEU-DOMINIO/healthz
```

Depois abra o token demo. Para smoke automatizado a partir da workstation/CI, prefira:

```bash
CG_STAGING_ORIGIN=https://SEU-DOMINIO \
CG_STAGING_TOKEN=<token-sintetico> \
pnpm deploy:smoke
```

O comando não imprime o token e também verifica a fixture sintética estática.

Depois, faça a inspeção manual:

```text
https://SEU-DOMINIO/s/<demo-token>
https://SEU-DOMINIO/s/<demo-token>/fotos
https://SEU-DOMINIO/s/<demo-token>/game/puzzle-swap
```

Critérios mínimos:

- health responde JSON `status=ok` e `releaseStage=staging-demo`;
- reload direto em `/fotos` funciona;
- rotas `/__dev/*` não ficam disponíveis;
- seletor de fixtures não aparece no staging;
- token inválido retorna 404 no gateway;
- Nginx não registra capability token em access log da rota `/s/...`;
- nenhuma foto real de cliente foi copiada para a VPS;
- após sair de um jogo, o processo não cresce continuamente em canvas/listeners a cada ciclo.

## 5. Promoção e rollback

Cada release deve ser imutável. Para promover, troque apenas o symlink `current` de forma atômica e reinicie o serviço. Mantenha o release anterior até concluir health + smoke mobile.

Em falha:

1. recoloque `current` no release anterior;
2. `systemctl restart christmas-games-catalog`;
3. confira `/healthz`;
4. só então investigue o novo release fora do caminho ativo.

Não edite arquivos JavaScript dentro de `/srv/christmas-games/current` para “corrigir rápido”. Corrija no repositório, regenere o artifact e promova um novo release.

## 6. O que este deploy prova — e o que não prova

Ele prova build de produção, runtime Node compilado, systemd/Nginx, roteamento Hub/Galeria/Jogos, assets e comportamento mobile com dados sintéticos.

Ele **não** prova sessão real, ingestão, SQLite, browser grant, autorização de mídia privada, isolamento A/B, backup/restore ou entrega WhatsApp. Esses itens permanecem bloqueadores explícitos em `deploy/readiness.json`.

## 7. Próximo corte depois do staging

A ordem recomendada é:

```text
staging-demo verde
→ SessionRepository SQLite + migrations
→ API pública de sessão/grant + media auth
→ API interna de revisão/upload/verify/activate
→ publisher Node manual
→ backup + restore testado
→ teste A/A2/B
→ Android + iPhone reais
→ habilitar estágio pilot
→ integrar EvydFlow Python
```

O objetivo é colocar infraestrutura e experiência no ar cedo sem confundir “site acessível” com “piloto de cliente pronto”.

## 8. Override Contabo Docker Compose (2026-10-16)

O log do Antigravity confirmou containers `christmas-games-catalog` e `christmas-games-gateway` em Docker Compose; `current` fica em `/srv/runtime/christmas-games`, não no caminho histórico systemd das seções anteriores. **Nesta VPS use este procedimento; não crie outro serviço systemd, não altere gateway de outros apps e não crie symlink de compatibilidade sem necessidade comprovada.**

### 8.1 Build e prova local

No worktree limpo, em commit aprovado pelo CI: `pnpm agent:doctor`; `pnpm release:staging`; `pnpm release:verify`; `pnpm release:smoke-runtime`. Não executar build pesado na VPS. `RELEASE.json.gitSha` precisa ser igual ao Git SHA em checkout. Gerar um release novo e imutável. Se o diretório de ID escolhido já existir, abortar em vez de sobrescrever.

### 8.2 Preflight remoto sem alterações

Copiar e extrair `.release/vps` em `/srv/runtime/christmas-games/releases/<novo-id>`, mantendo o ativo. Na VPS executar:

```bash
cd /srv/runtime/christmas-games/releases/<novo-id>
CG_EXPECTED_GIT_SHA=<sha-completo> node ops/tools/verify-vps-release.mjs .
bash ops/tools/vps-docker-preflight.sh --check <novo-id> <sha-completo>
```

O script valida o inventário, SHA, symlink anterior, labels do projeto/serviços e configurações de bind do Compose. Se falhar, **não promover**. Guarde `previous` de sua saída; não assuma `20261012-0ef503b`. Confirme os parâmetros de Compose originais (`--env-file`, profiles, project directory) e reexecute preflight no mesmo contexto.

### 8.3 Promoção controlada e rollback

Na VPS, apenas após preflight e janela operacional, criar `current.next` sem sobrescrever nomes existentes, depois `mv -Tf current.next current` atomicamente. **Não confiar apenas em `docker restart` para atualizar bind mounts resolvidos de symlinks**. No diretório `/srv/platform/stacks/christmas-games`, execute `docker compose -p <project> -f compose.yaml up -d --no-deps --force-recreate --no-build <catalog-service> <gateway-service>` usando exatamente project e service labels retornados, com os mesmos arquivos de ambiente do deployment atual. A documentação oficial explica `--force-recreate`: https://docs.docker.com/reference/cli/docker/compose/up/

Depois, `docker inspect` dos dois containers para confirmar mounts, `docker ps`, health local/público e smoke externo. Em falha: recriar `current.next` apontando para `releases/<previous>`, promover atomicamente e executar o **mesmo comando Compose com --force-recreate** para ambos. Não usar `docker compose down` nem `docker volume prune`.

### 8.4 Smoke de frontend realmente novo

`CG_STAGING_TOKEN=demo-token` do plano anterior é inválido: o smoke oficial exige **token opaco de 16–128 caracteres**. Obter o token sintético já ativo de configuração privada, sem revelá-lo em terminal/PR. Na workstation que contém o artefato exato transferido:

```powershell
$env:CG_STAGING_ORIGIN='https://jogos.fotosdenatal.com'
$env:CG_STAGING_RELEASE_MANIFEST='.release/vps/RELEASE.json'
# CG_STAGING_TOKEN: carregar por canal privado já provisionado.
pnpm deploy:smoke
```

O smoke compara os quatro WebPs da galeria no domínio público com bytes e SHA-256 do manifesto, além de Hub, Galeria, Puzzle, policies e token inválido. Um health 200 **sozinho** não é critério de promoção. Depois confirmar loader, laço, neve, foto retrato/paisagem, lightbox e navegação num telefone.

### 8.5 Limite de segurança

Staging-demo só aceita fixtures sintéticas. `deploy/readiness.json` permanece `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`. Esta execução não libera fotos reais nem envia links para clientes.

## 9. Incidente 502 no Docker após Natal Velvet (16/10/2026)

O build `6781c0f` foi verificado e instalado, mas retornou 502 no gateway: `apps/catalog-server/src/main.ts` fazia `listen(..., '127.0.0.1')` dentro do container `catalog`. O `gateway` usa `http://catalog:4180` em uma rede bridge **separada**. O teste local `docker exec catalog wget http://127.0.0.1:4180/healthz` não valida o caminho gateway → catalog. Rollback para `20261012-0ef503b` foi registrado no log do Antigravity; verificar o estado atual novamente antes de promover.

**Correção canônica:** `runtimeConfig.host` aceita apenas `127.0.0.1` (padrão) ou `0.0.0.0` quando explícito via `HOST`; `main.ts` faz bind nesse endereço. Na VPS Docker Compose, somente `catalog` deve receber `HOST=0.0.0.0`, em rede bridge privada. Não expor `4180` pelo Docker via `ports:` nem permitir conexão pública direta; o `gateway` é a borda permitida. Esse requisito é **bloqueador de promoção**.

### Prova adicional obrigatória

Após recriar containers, teste o caminho **a partir do gateway**, não somente dentro do catalog:

```bash
docker exec christmas-games-catalog node -e \
  'if (process.env.HOST !== "0.0.0.0") process.exit(1)'
docker exec christmas-games-gateway sh -c \
  'wget -q -O /dev/null http://catalog:4180/healthz'
```

Se `wget` não estiver instalado na imagem gateway, usar `curl` disponível ou `docker run --rm --network <rede-privada> curlimages/curl ...` **somente com imagem já disponível** e autorização. Não instalar ferramentas no container em produção. Confirmar que `catalog` não publica porta diretamente via `docker inspect` e que o bind mount da versão nova realmente está ativo.

Para testar o candidato **antes de trocar `current`**, é preferível criar um canário Compose isolado com porta e rede de teste sem tocar o gateway ativo. Não criar o canário se depender de redefinir secrets, redes compartilhadas ou de alterar o Compose da produção. Se não houver canário seguro, executar smoke gateway→catalog imediatamente após promoção e rollback em caso de falha.

### Fonte oficial

- https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
- https://docs.docker.com/compose/how-tos/networking/

**Não alterar `deploy/readiness.json`:** apenas staging-demo com fixtures sintéticas. A existência de PRs de publicação real não torna o piloto aprovado.
