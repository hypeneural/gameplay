# Operação de Galerias — Natal 2026 (preparação)

Dashboard React 19 + Vite 8/TypeScript, independente do catálogo de jogos, em `/gestao/galerias/` **somente após implementação da autenticação de borda/servidor**.

## Implementação presente
- Preview local com 48 pedidos **sintéticos e determinísticos** (nomes explícitos de demonstração, URLs pessoais ausentes).
- KPIs e filtros por situação, nome/pedido/pacote, etapa CRM, tipo/período de data e contagem de fotos publicadas.
- Ordenação estável, paginação, exportação CSV sintética protegida contra fórmulas, desktop/table e mobile/cards.
- Estados distintos de `no_session`, `no_upload`, `preparing`, `incomplete`, `published_unverified`, `revoked`, `unavailable`.
- Todas as ações de pedidos/galerias/jogos estão desabilitadas neste protótipo; nenhum link capability é armazenado.
- Build de produção **sem dados** até existir BFF autenticado; Vite `base` não habilita rota nem auth.

## Sem alterar o CRM Laravel (caminho preferido)
1. O MCP já roda `scripts/crm-natal-bridge.php`, que consulta `NatalValidOrdersQuery::validNatalOrders()` diretamente. O CRM não precisa de nova regra nem novo endpoint se esse bridge puder expor uma projeção administrativa paginada e autenticada (necessário implementar a projeção leve e sua autorização no gateway MCP).
2. `crm_pedidos_buscar(product_slug=natal)` é busca **bruta**; 132 pedidos de produto Natal não são equivalentes a 104 comercialmente válidos, conforme consulta verificada em 28/10/2026. A lista `crm_gameplay_auditoria` restringe a status 10/12. Nenhuma das duas é fonte única de membership.
3. A seção `operacional_listas` do MCP já gera `by_status_full` a partir de `validNatalOrders`, mas o modo completo pode ser lento e disponibiliza dados demais. **Não usar essa resposta pesada diretamente como backend da interface**. Contrato leve deve retornar todos os pedidos elegíveis e paginação sem truncamento, e receber o mesmo `asOf`.
4. Proxy BFF por sessão de gestor: operar apenas servidor-servidor e consultar reader privado por batches ≤50. O domínio atual não possui rota protegida instalada; não supor que login CRM compartilha cookies com `jogos.fotosdenatal.com`.
5. Em produção: filtros/sort/contagens sobre o universo agregado no servidor, nunca apenas sobre a página corrente. Endpoints do domínio só após política de operador + recursos de autorização.

## Execução local
```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @christmas-games/gallery-ops dev
pnpm --filter @christmas-games/gallery-ops build
pnpm --filter @christmas-games/gallery-ops test
```

O preview local usa a porta 4178 e **não executa nenhuma consulta real**. Em build release, a interface mostra `Conexão administrativa ainda não configurada` e nenhuma linha, mesmo que a pasta `dist/` seja publicada por engano. O BFF é trabalho pendente e será tratado em PR separada com contratos, testes 401/403 e implantação privada.

Detalhamento: `docs/integrations/NATAL26_GALLERY_OPS_FORENSIC_AUDIT_20261028.md` e Issue #45.
