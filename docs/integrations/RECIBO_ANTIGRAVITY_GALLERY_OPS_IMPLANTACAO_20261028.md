# Recibo de Homologação e Implantação em VPS — Gallery Ops Natal 2026

**Data de Execução:** 28/10/2026  
**Status Técnico:** **GO (Homologado e Operacional em Produção)**  
**Endereço da Dashboard:** `https://jogos.fotosdenatal.com/gestao/galerias/`

---

## 1. Escopo e Referências

- **Repositório Gameplay:** `hypeneural/gameplay`, PR #46, branch `feat/natal26-gallery-ops-dashboard-20261028`.
- **Repositório MCP:** `hypeneural/evydencia-crm-mcp`, PR #16, branch `feat/gallery-ops-canonical-reader-20261028`.
- **Documento de Corte:** `docs/integrations/PROMPT_ANTIGRAVITY_GALLERY_OPS_CUT_20261028.md`.

---

## 2. SHAs e Serviços Ativos

1. **VPS Gameplay (`169.58.210.14`)**:
   - Commit SHA: `ca75754687d7b3ea0f983a48e77c8e9b41865910`
   - Release: `/srv/runtime/christmas-games/releases/20261028-gallery-ops`
   - Serviço BFF: Container Docker `christmas-games-gallery-ops` (Node 24, porta interna 4189, redes `edge` e `backend`, sem host ports públicos).
   - Gateway Nginx: Snippet `/gestao/galerias/` ativo em `christmas-games-gateway`, validado com `nginx -t` e recarregado sem downtime.
   - Variáveis: `/srv/secrets/christmas-games/gallery-ops.env` (permissão `0600`).

2. **VPS MCP (`185.241.151.207`)**:
   - Commit SHA: `fef258dc59b1f25966903329422278debf05d4fc`
   - Worktree: `/opt/evydencia-mcp/gallery-ops`
   - Serviço Reader: `evydencia-gallery-ops-reader.service` escutando estritamente em `127.0.0.1:4196` sob o usuário `evydmcp`.
   - Conector CRM: `scripts/crm-natal-bridge.php` no modo canônico `gallery.ops.valid_orders`, via subprocesso STDIN/STDOUT isolado, com restrição estrita MySQL Read-Only.
   - Gateway LIVE: `evydencia-crm-mcp-live.service` mantido completamente intacto.

3. **Canal Privado entre VPS**:
   - Serviço: `evydencia-gameplay-tunnel.service` com encaminhamento reverso criptografado `-R 172.18.0.1:4196:127.0.0.1:4196`.
   - Porta 4196 inacessível a partir da internet pública; filtragem por firewall UFW ativa.

---

## 3. Evidência de Paridade Comercial Canônica

Confronto executado no mesmo instante temporal (`as_of: 2026-10-28 02:55:04`):

| Fonte Auditada | Método | Pedidos Válidos | Paridade |
| :--- | :--- | :---: | :---: |
| **CRM Laravel MySQL** | `NatalValidOrdersQuery::validNatalOrders` | **104** | **100%** |
| **Leitor Canônico MCP** | `POST /internal/v1/gallery-ops/valid-orders` | **104** | **100%** |
| **Dashboard BFF Operacional** | `GET /gestao/galerias/api/orders` | **104** | **100%** |

Zero discrepâncias observadas. População integral de todos os pacotes e status válidos abrangida.

---

## 4. Testes de Segurança e Acesso Negado

1. **Tentativa sem Bearer token no Reader MCP**:
   - `POST http://127.0.0.1:4196/internal/v1/gallery-ops/valid-orders` sem Bearer → **HTTP 401 Unauthorized**.
2. **Método HTTP indevido no Reader MCP**:
   - `GET http://127.0.0.1:4196/internal/v1/gallery-ops/valid-orders` → **HTTP 405 Method Not Allowed**.
3. **Bloqueio de Links Capability de Clientes**:
   - `GET https://jogos.fotosdenatal.com/gestao/galerias/api/orders/4964/open/gallery` → **HTTP 409 Conflict (`CUSTOMER_LINKS_DISABLED`)**.
   - `CUSTOMER_LINKS_ENABLED=0` ativo por padrão.
4. **Cabeçalhos de Privacidade**:
   - `Cache-Control: private, no-store, max-age=0, must-revalidate`.
   - `X-Robots-Tag: noindex, nofollow, noarchive`.
   - `Referrer-Policy: no-referrer`.
   - `X-Frame-Options: DENY`.
5. **Zero Vazamento de Dados Pessoais (PII)**:
   - Nenhum log de console, log de Nginx ou relatório armazena dados nominais de clientes.

---

## 5. Integridade do Catálogo e Jogos Públicos

- `GET https://jogos.fotosdenatal.com/` → **HTTP 200 OK** (Homepage pública intacta).
- `GET https://jogos.fotosdenatal.com/demo/fotos` → **HTTP 200 OK** (Galeria demo intacta).
- Rotas de sessão `/s/:token` e rotas de fotos dos clientes íntegras.
- `GET https://jogos.fotosdenatal.com/nonexistent` → **HTTP 404 Not Found** (Sem fallback SPA indevido).

---

## 6. Homologação do Canário Real em Navegador

- Interface Chromium auditada em `https://jogos.fotosdenatal.com/gestao/galerias/`:
  - Contadores: 104 válidos, 88 pendências, 86 sem sessão, 0 em preparação, 16 publicadas, 0 integrações indisponíveis.
  - Dados completos: 104/104 pedidos preenchidos com nome, WhatsApp, e-mail, número do pedido, pacote e status CRM.
  - Filtros e busca: busca em tempo real por nome, ID do pedido, dígitos de WhatsApp e e-mail verificada.
  - Exportação CSV: testada com sucesso (104 linhas de dados com sanitização de fórmulas).
  - Mobile: layout adaptado para cards verticais em viewport de smartphone (390px × 844px), sem overflow horizontal.

---

## 7. Procedimento de Rollback Imediato

```bash
# 1. Na VPS Gameplay (169.58.210.14)
cp /srv/platform/stacks/christmas-games/nginx.conf.bak-20261028-pre-gallery-ops /srv/platform/stacks/christmas-games/nginx.conf
docker exec christmas-games-gateway nginx -t && docker exec christmas-games-gateway nginx -s reload
cd /srv/platform/stacks/christmas-games && docker compose -f compose.yaml -f compose.override.yaml -f compose.gallery-ops.yaml stop gallery-ops

# 2. Na VPS MCP (185.241.151.207)
systemctl stop evydencia-gallery-ops-reader
```
