# Operação de Galerias — Natal 2026 (preparação)

Dashboard React 19 + Vite 8/TypeScript, independente do catálogo de jogos, em `/gestao/galerias/` **somente após implementação da autenticação de borda/servidor**.

## Implementação presente

- Preview local com 48 pedidos **sintéticos e determinísticos** (nomes explícitos de demonstração, URLs pessoais ausentes).
- KPIs e filtros por situação, nome/pedido/WhatsApp/telefone/e-mail/pacote, etapa CRM (rótulos da enum oficial), tipo/período de data e contagem de fotos publicadas.
- Ordenação estável, paginação, exportação CSV sintética protegida contra fórmulas, desktop/table e mobile/cards.
- Estados distintos de `no_session`, `no_upload`, `preparing`, `incomplete`, `published_unverified`, `revoked`, `unavailable`.
- No modo demo, ações de clientes estão desabilitadas. Em produção a ação de CRM só usa link administrativo; galeria e hub exigem checagem individual por BFF + sidecar e flags explícitas, sem expor URL capability na tabela ou CSV.
- Build de produção só carrega dados quando o BFF autenticado estiver implantado e autorizado; Vite `base` sozinho não habilita rota nem autenticação.

## Sem alterar o CRM Laravel (caminho preferido)

1. O MCP possui modo opt-in `gallery.ops.valid_orders` em `scripts/crm-natal-bridge.php`, via PR #16, que consulta `NatalValidOrdersQuery::validNatalOrders()` e inclui contato do titular apenas na projeção privada. O CRM Laravel não precisa de nova regra ou endpoint; basta implantar o reader interno autenticado.
2. `crm_pedidos_buscar(product_slug=natal)` é busca **bruta**; 132 pedidos de produto Natal não são equivalentes a 104 comercialmente válidos, conforme consulta verificada em 28/10/2026. A lista `crm_gameplay_auditoria` restringe a status 10/12. Nenhuma das duas é fonte única de membership.
3. A seção `operacional_listas` do MCP já gera `by_status_full` a partir de `validNatalOrders`, mas o modo completo pode ser lento e disponibiliza dados demais. **Não usar essa resposta pesada diretamente como backend da interface**. Contrato leve deve retornar todos os pedidos elegíveis e paginação sem truncamento, e receber o mesmo `asOf`.
4. Proxy BFF por sessão de gestor: operar apenas servidor-servidor e consultar reader privado por batches ≤50. O domínio atual não possui rota protegida instalada; não supor que login CRM compartilha cookies com `jogos.fotosdenatal.com`.
5. Em produção: o BFF retorna a população canônica integral; a interface filtra, ordena e calcula os contadores sobre esse universo, nunca só a página visível. CSV é autorizado pelo BFF e inclui campos de contato. Endpoints do domínio só após política de operador + recursos de autorização.

## Execução local

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @christmas-games/gallery-ops dev
pnpm --filter @christmas-games/gallery-ops build
pnpm --filter @christmas-games/gallery-ops test
pnpm exec playwright install chromium
pnpm exec playwright test --config apps/gallery-ops/playwright.config.ts
```

O preview local usa a porta 4178 e **não executa nenhuma consulta real**. No build de produção, o frontend chama `/gestao/galerias/api/orders` SOMENTE após a autenticação do backend; sem acesso válido ou em erro, apresenta estado fechado, nunca fixtures. O BFF, seus testes e o modo canônico do MCP foram implementados em Draft; **a implantação e autenticação no domínio ainda precisam de homologação**. Veja `docs/integrations/GALLERY_OPS_SECURE_DEPLOYMENT_20261028.md` e a PR #16 do MCP.

Detalhamento: `docs/integrations/NATAL26_GALLERY_OPS_FORENSIC_AUDIT_20261028.md` e Issue #45.

## Testes do backend administrativo

```sh
node --check apps/gallery-ops/server/adminServer.mjs
node --test apps/gallery-ops/server/adminServer.test.mjs
```

Leia também o runbook seguro de implantação citado acima. Nunca disponibilize o frontend HTML diretamente como rota pública sem o backend Cloudflare Access JWT.
