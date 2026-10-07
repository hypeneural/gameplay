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

1. Crie usuário/grupo de serviço e diretórios com permissões mínimas.
2. Copie `.release/vps` para um novo diretório em `/srv/christmas-games/releases/` usando um ID imutável (timestamp + SHA é suficiente).
3. **Antes de ativar o release**, entre no diretório copiado e execute `node ops/tools/verify-vps-release.mjs .`. Não continue se SHA/inventário divergirem.
4. Copie `ops/catalog.env.example` para `/etc/christmas-games/catalog.env`, ajuste somente domínio/caminhos e aplique `chmod 600`.
5. Crie `/etc/christmas-games/social-preview.json` a partir do exemplo do repositório usando exclusivamente token de demonstração opaco. Não use pedido, telefone ou token de cliente.
6. Instale `ops/christmas-games-catalog.service.example` como `/etc/systemd/system/christmas-games-catalog.service`.
7. Inclua `ops/nginx/christmas-games.conf.example` dentro do servidor HTTPS já administrado pela VPS/Plesk.
8. Valide `nginx -t` antes de reload.
9. Aponte `/srv/christmas-games/current` para o release e inicie o serviço.

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

Cada release deve ser imutável. Para promover, altere apenas o symlink `current` e reinicie o serviço. Mantenha o release anterior até concluir health + smoke mobile.

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
