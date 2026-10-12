# P0 — Gate de autorização por pedido no CatalogServer

**Por que existe:** o primeiro piloto real mostrou que CRM elegível e segredo do
publicador eram suficientes para escrever e ativar dados de cliente na VPS,
mesmo com `pilotReady/customerDataAllowed/automaticDeliveryAllowed` fechados
no repositório. Esses booleanos não eram aplicados pelo endpoint privado Node.

## Comportamento

O `main.ts` monta `PublicationService` com autorização separada da consulta
ao CRM. O catálogo rejeita o UUID fora de escopo com 403
`SESSION_NOT_FOUND` antes de resolver sessão e antes da transição CAS para
ACTIVE. Isso inclui revisões STAGED criadas antes do gate.

Em `staging-demo`, por padrão todos os novos pedidos reais são bloqueados,
mesmo que a API privada receba um Bearer válido. Um único pedido poderá ser
autorizado pelo operador **somente após validação de autorização e preflight**
com estas variáveis privadas do container:

- `CATALOG_CUSTOMER_PILOT_ENABLED=1`
- `CATALOG_CUSTOMER_DATA_ALLOWED=1`
- `CATALOG_PILOT_ORDER_UUID=<uuid-específico-do-pedido-aprovado>`

O UUID deve ser formato válido; nenhuma variável deve ser armazenada no Git
com valor real. Não alterar `deploy/readiness.json` nem ligar uma permissão
global de campanha para testar outro cliente.

## Limites e próximos gates

- O gate não substitui um atestado criptográfico/operacional de
  `readiness.json` da release realmente montada.
- Não autoriza a outbox do EvydFlow nem envio automático. Cada mensagem
  exige fila idempotente, CRM elegível, galeria GET ativa, destinatário
  verificado e webhook de aceite/entrega.
- Não invalida sessão já ACTIVE; cancelamento pós-publicação depende do
  endpoint revoke e de webhook/reconciliação CRM.
- Testar NEGATIVO: UUID desconhecido ou diferente retorna 403, revisão
  STAGED anterior continua sem ativar, demo/public GET não muda.
- Testar POSITIVO: um pedido autorizado e elegível pode resolver e ativar
  após provisionamento; depois revogar o escopo e comprovar bloqueio de
  novas revisões.
- Medir latência no caminho protegido e revisar Caddy/Nginx; não
  reiniciar outros serviços na VPS compartilhada.

## Deploy e reversão

Promover apenas após `pnpm check`, testes móveis, release verify,
backup/restauração SQLite + blobs, SHA efetivamente montado e canário
sintético. Default sem variáveis é deny; rollback preserva mídia já
publicada e a proteção pública das sessões existentes.
