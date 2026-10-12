# P0 — Pós-canário real (2026-10-12)

**Fonte:** relatório de execução do Antigravity, não uma segunda observação da VPS.
Não salvar nesta documentação nomes, telefones, caminhos pessoais, fotos ou
capability URLs de clientes.

## Resultados reportados e limites da prova

- Lote controlado: 30 imagens → 90 variantes WebP.
- Sharp: aproximadamente 12,2 s; upload privado: 24,3 s para ~6,61 MB.
- HTTP público: hub/galeria/dados e três imagens testadas em 200; invalid-token
  em 404. Um HTTP 200 não comprova visualização completa em iPhone/Android.
- Publicação CAS: estado ACTIVE reportado e recibo privado mantido.
- Outbox Z-API: mensagem aceita com ID do provedor e status `sent`.
  **Não equivale a `RECEIVED` ou `READ` pelo WhatsApp.** Esperar os webhooks.
- O relatório não inclui restauração de SQLite + blobs com validação funcional.
- O relatório registra injeção manual de
  `{pilotReady: true, customerDataAllowed: true, automaticDeliveryAllowed: true}`
  no ledger apesar de `deploy/readiness.json` continuar fechado. Isso **não
  é prova autoritativa** de liberação de release. Resolver no EvydFlow antes de
  escalar; não ativar globalmente por conveniência.

## Benchmark de upload opcional

`PUBLISHER_UPLOAD_CONCURRENCY` aceita apenas 1, 2 ou 3; 1 é o default,
preservando o comportamento sequencial do piloto. O dispatcher utiliza no
máximo 3 workers e sempre espera as requisições iniciadas concluírem antes
de devolver falha. Não altera o CAS nem o checkpoint.

Rodar somente em sessões sintéticas autorizadas por ambiente de teste:

1. Fixar mesma quantidade/tamanho de blobs, mesmo túnel Tailscale, mesma VPS.
2. Fazer 3 execuções com valor 1, depois 2, depois 3, **em revisões/recibos
   diferentes**; a idempotência impede usar um recibo publicado de novo.
3. Medir tempo total, p95 por PUT, 4xx/5xx, CPU/RSS do container, event loop,
   tamanho SQLite/WAL e throughput. Sem métricas, conservar default 1.
4. Repetir timeout/erro de rede durante duas requisições; confirmar estado
   remoto por GET e preservação da reserva `.inflight`, sem replay cego.
5. Não ampliar concorrência se Caddy/catalog/media tiver degradação, 429,
   5xx, checksum divergente ou lock contention.

## Gates antes de escalar

- CRM precisa continuar elegível antes de cada publicação **e antes do envio**.
- Cancelamento/revogação pós-ACTIVE precisa alcançar o catálogo e as
  miniaturas, com 404 imediato em teste; validar webhook/reconciliação.
- Link de capacidade não pode aparecer em prints de CI, console ou logs gerais.
- Conferir release SHA realmente montado na VPS, permissões SQLite/media,
  testes de restore, navegador físico, OG e entrega Z-API por webhook.
- Não reenviar o piloto conhecido; ele já tem outbox e provedor com registro
  de envio, sujeito à conciliação do webhook.
