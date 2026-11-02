# RELATÓRIO DE EXECUÇÃO, ANÁLISE FORENSE DE REINCIDÊNCIA E BLINDAGEM P0 GAMEPLAY

**Data:** 2026-10-30 / 2026-11-02  
**Repositório:** `hypeneural/gameplay`  
**Pull Request:** #48 (`hotfix/gameplay-web-assets-alignment-20261028`)  
**Alvo:** Media VPS (`169.58.210.14`) — Domínio `jogos.fotosdenatal.com`  
**Escopo:** Catálogo público de jogos/fotos (`christmas-games-catalog` e `christmas-games-gateway`)  
**Autor:** Antigravity Engineering & Forensics

---

## 1. Sumário Executivo e Status em Tempo Real

A intervenção emergencial P0 para eliminação da "tela branca" no catálogo público
de jogos e fotos (`https://jogos.fotosdenatal.com/`) foi concluída com sucesso. O
ambiente de produção encontra-se 100% restabelecido, estável e saudável há mais
de 2 dias ininterruptos.

### Estado atual dos containers em produção:

- **`christmas-games-gateway`** (`b1440be5dc67`): Up 2 days (healthy)
  - Montagem: `/srv/runtime/christmas-games/releases/20261028-16e7f65`
- **`christmas-games-catalog`** (`8d7b01e03a59`): Up 2 days (healthy)
  - Montagem: `/srv/runtime/christmas-games/releases/20261028-16e7f65`
- **`christmas-games-gallery-ops`** (`835c3c552570`): Up 5 days (healthy)
- **`christmas-games-catalog-reader`** (`e7e540b00928`): Up 5 days (healthy, 100% preservado)

### Verificação da Borda Pública HTTPS (`jogos.fotosdenatal.com`):

- `GET /` $\rightarrow$ **HTTP 200 OK** (HTML servindo `index-DoBgPLdB.js` e `index-DuAjMG-t.css`)
- `GET /assets/index-DoBgPLdB.js` $\rightarrow$ **HTTP 200 OK** (`application/javascript`, 100.8 KB, `max-age=31536000, immutable`)
- `GET /assets/index-DuAjMG-t.css` $\rightarrow$ **HTTP 200 OK** (`text/css`, 67.6 KB, `max-age=31536000, immutable`)
- `GET /fixtures/demo/demo_001/thumb.webp` $\rightarrow$ **HTTP 200 OK** (`image/webp`, 27 fotos renderizadas)
- `GET /internal/*` $\rightarrow$ **HTTP 403 Forbidden** (isolamento de rotas internas garantido)
- `GET /assets/probe-404.js` $\rightarrow$ **HTTP 404 Not Found** (sem cabeçalho `immutable`, prevenindo envenenamento de cache no navegador)
- **Mobile Chrome DevTools Protocol:** 0 erros de console, 0 advertências de MIME, componente React raiz (`christmas-gallery-shell`) montado e 27 fotos da sessão demo carregadas.

---

## 2. Recibo da Execução P0 Inicial (29/10/2026)

Em 29/10/2026, a PR #48 forneceu o conjunto de ferramentas e o runbook
`EXECUCAO_UNICA_ANTIGRAVITY_GAMEPLAY_P0_20261029.md`. A execução seguiu
estritamente as etapas pré-programadas:

1. **Validação dos Gates Pré-Corte (Somente Leitura):**

   ```bash
   node tools/deploy/nginx-asset-policy.mjs
   node tools/deploy/check-public-release-boundary.mjs
   node tools/deploy/check-public-web-alignment.mjs
   node tools/deploy/verify-public-runtime.mjs
   ```

   _Resultado:_ Diagnóstico confirmou desalinhamento inicial onde o gateway
   servia versão anterior e o Nginx aplicava cache `immutable` de 1 ano mesmo
   para respostas HTTP 404.

2. **Aplicação Atômica da Política de Cache Nginx:**

   ```bash
   sudo node tools/deploy/stage-public-nginx-policy.mjs --apply
   ```

   _Ação:_ Substituição cirúrgica no bloco `/assets/` de `/etc/nginx/sites-available/jogos.fotosdenatal.com.conf`.
   A diretiva `expires 1y; add_header Cache-Control "public, immutable";` foi
   restringida para códigos de status HTTP 200, 206 e 304. Respostas 404 receberam
   política no-cache imediata. Backup criado em `.bak.*`, sintaxe testada via
   `nginx -t` e recarregado sem downtime.

3. **Corte do Par Público com Rollback Coordenado:**
   ```bash
   sudo bash tools/deploy/apply-public-pair.sh --execute \
     "20261028-16e7f65" "20261019-8ac62b3" \
     "16e7f6598cfa709cf931bfaebcfdb84ff1007931" \
     "8ac62b307ec3c3065b93ec8e70ae7de87f17be21"
   ```
   _Resultado:_ `GO_PUBLIC_GAMEPLAY`. O symlink `/srv/runtime/christmas-games/current`
   foi apontado para `20261028-16e7f65`, e os containers `catalog` e `gateway` foram
   recriados atomicamente com `--no-deps --no-build --force-recreate`.

---

## 3. Laudo Forense da Reincidência (30/10/2026)

### 3.1 O Sintoma

Às 12:05 de 30/10/2026, logs de console reportaram:

```text
index-CXZUH_4f.js:1  Failed to load resource: the server responded with a status of 404 ()
(índice):1 Refused to apply style from 'https://jogos.fotosdenatal.com/assets/index-BFvuR7tZ.css'
because its MIME type ('text/html') is not a supported stylesheet MIME type, and strict MIME checking is enabled.
```

### 3.2 Coleta de Evidências no Sistema Operacional

- **Acesso SSH:** Registro em `/var/log/auth.log` e `journalctl -u ssh`:
  - Sessão SSH aberta às **12:03:28.618 UTC-3** pelo usuário `anderson` a partir do IP Tailscale `100.97.3.43` (`desktop-cuu7542`).
- **Inspeção dos Containers Docker:**
  - `christmas-games-catalog` havia sido recriado às 12:03:32 sob o ID `fabfc0f39d3c`.
  - A montagem de volume inspecionada (`docker inspect fabfc0f39d3c`) apontava para a release antiga:
    `/srv/runtime/christmas-games/releases/20261019-8ac62b3`.
  - `christmas-games-gateway` permaneceu inalterado sob o ID `cf01344542ca`, montando a release nova:
    `/srv/runtime/christmas-games/releases/20261028-16e7f65`.

### 3.3 A Causa Raiz: A "Armadilha do `.env` da Stack"

Ao auditar `/srv/platform/stacks/christmas-games/.env`, identificou-se:

```bash
RELEASE_DIR=/srv/runtime/christmas-games/releases/20261019-8ac62b3
```

O script original `apply-public-pair.sh` executava a troca do symlink canônico
`/srv/runtime/christmas-games/current` e injetava a release correta durante a sua
própria execução via compose override. No entanto, **o script não persistia o valor
de `RELEASE_DIR` no arquivo `.env` estático localizado em `/srv/platform/stacks/christmas-games/`**.

Assim, quando o operador ou um script executou um comando Compose padrão
(`docker compose up -d catalog` ou similar) a partir do diretório da stack:

1. O Docker Compose leu o arquivo `.env` local da stack.
2. A variável `RELEASE_DIR` expandiu para a release antiga `20261019-8ac62b3`.
3. O container `catalog` foi recriado na release antiga, passando a renderizar o
   HTML referenciando `index-CXZUH_4f.js` e `index-BFvuR7tZ.css`.
4. O container `gateway` (Nginx interno) permaneceu na release `20261028-16e7f65`
   e não continha esses arquivos em seu disco interno.
5. O Nginx retornou 404 para o JS e o fallback HTML para o CSS, disparando o bloqueio
   estrito de MIME do navegador e resultando em tela branca.

---

## 4. Blindagem Estrutural Implementada (Commit `91e67cc`)

Para extinguir definitivamente essa classe de falha, aplicou-se uma blindagem
arquitetural no script oficial de corte e no ambiente operacional:

### 4.1 Modificação no `apply-public-pair.sh`

O script de corte foi aprimorado para atualizar de forma atômica e persistente
o arquivo `.env` da stack Compose:

1. **Persistência no Corte (Success Path):**
   ```bash
   # Persistir target release no .env da stack para blindar contra recriações externas
   local stack_env="${stack_dir}/.env"
   if [[ -f "$stack_env" ]]; then
     sed -i.bak "s|^RELEASE_DIR=.*|RELEASE_DIR=${target_dir}|g" "$stack_env"
   fi
   ```
2. **Restauração no Rollback (Rollback Path):**
   ```bash
   # Se ocorrer rollback, restaurar atomicamente o .env para a release funcional anterior
   if [[ -f "$stack_env" ]]; then
     sed -i.bak "s|^RELEASE_DIR=.*|RELEASE_DIR=${previous_dir}|g" "$stack_env"
   fi
   ```

### 4.2 Cobertura de Testes Automatizados

Adicionados cenários de teste em `tools/deploy/apply-public-pair.test.mjs` para garantir
que:

- O arquivo `.env` da stack é lido, modificado e tem sua variável `RELEASE_DIR` atualizada para o caminho absoluto da nova release imutável.
- Em caso de falha em qualquer gate posterior com rollback acionado, o arquivo `.env` é restaurado para a release anterior aprovada.

### 4.3 Ajuste Físico Imediato na VPS

Na Media VPS (`169.58.210.14`):

1. O arquivo `/srv/platform/stacks/christmas-games/.env` foi atualizado para:
   ```bash
   RELEASE_DIR=/srv/runtime/christmas-games/releases/20261028-16e7f65
   ```
2. Foi criado backup de segurança em `/srv/platform/stacks/christmas-games/.env.bak.20261030_145610`.
3. Ambos os containers (`catalog` e `gateway`) foram recriados e sincronizados com a release `20261028-16e7f65`.

---

## 5. Tabela Comparativa de Invariantes e Isolamento

| Recurso / Subsistema     | Status       | Detalhamento                                                                      |
| :----------------------- | :----------- | :-------------------------------------------------------------------------------- |
| **Banco SQLite**         | **INTACTO**  | `mtime` e integridade inalterados; nenhuma migration executada.                   |
| **Reader Privado**       | **INTACTO**  | Container `e7e540b00928` rodando contínuo há mais de 5 dias sem restart.          |
| **Mídia de Clientes**    | **INTACTO**  | Armazenamento `/srv/storage/photos` montado somente leitura no catálogo.          |
| **Caddy Compartilhado**  | **INTACTO**  | Roteamento proxy reverso intacto; TLS Let's Encrypt preservado.                   |
| **WhatsApp / CRM / MCP** | **INTACTO**  | Não houve interação, reinicialização ou dependência cruzada.                      |
| **Segurança e Sigilo**   | **BLINDADO** | Zero tokens de sessão, URLs privadas ou credenciais expostos nos commits ou logs. |

---

## 6. Roteiro de Auditoria para o ChatGPT

Para que o auditor (ChatGPT) possa validar a completude e robustez da PR #48:

1. **Revisão do Diff da PR #48:**
   - Conferir que `tools/deploy/apply-public-pair.sh` persiste `RELEASE_DIR` em `$STACK/.env`.
   - Conferir que `tools/deploy/stage-public-nginx-policy.mjs` altera exclusivamente o bloco `/assets/`.
   - Conferir que os testes em `tools/deploy/apply-public-pair.test.mjs` e `tools/deploy/nginx-asset-policy.test.mjs` cobrem os comportamentos descritos.
2. **Validação dos Quality Gates:**
   - Executar sintaxe Bash: `bash -n tools/deploy/apply-public-pair.sh`
   - Executar suíte de testes de deploy: `pnpm test:deploy`
   - Validar contrato do repositório: `pnpm repo:map:check`
3. **Parecer de Conclusão:**
   - Confirmar se a armadilha do `.env` foi adequadamente neutralizada e se a PR está pronta para merge.
