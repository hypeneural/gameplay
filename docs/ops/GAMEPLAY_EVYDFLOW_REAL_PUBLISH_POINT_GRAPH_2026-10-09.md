# Point Graph V10 — corte 2 publicado sinteticamente → EvydFlow real

**2026-10-09. Estado:** auditoria do PR gameplay #15 e PR EvydFlow #15. **Não comprova fotos reais ou envio WhatsApp.** O relatório do operador declara publicação sintética de 4 fotos/12 blobs, `ACTIVE` e retorno da URL por HTTPS. Confirmação de produção real depende de novos testes com dados autorizados.

## Arquitetura mínima

```text
Pasta FINAL Windows 11 (somente leitura)
    → Node/Sharp media:prepare-local (3 WebP × foto; hashes SHA256)
    → Receipt privado e durável {requestId,manifestId,blobIds,revisionId,endpoint,phase}
    → Node publish-session (reutiliza IDs em todos os retries)
    → POST /internal/v1/sessions/resolve (CRM orderUuid verificado, não apenas formato)
    → POST /internal/v1/publications (201 STAGED ou 200 replay)
    → PUT /.../blobs/:blobId (201 READY / 200 replay; checksum)
    → GET /internal/v1/publications/:revisionId (todos READY?)
    → POST /.../activate (200 ACTIVE, CAS)
    → GET /s/:token/data + GET /s/:token/media/... (200, cliente correto)
    → Recibo local protegido, não logs comuns
    → EvydFlow: gallery.publish_revision (opt-in; não ativar YAML de produção)
    → Etapa de WhatsApp manual/supervisionada após destinatário validado
```

## P0 identificados no código PR #15

1. **Idempotência quebrada no cliente de publicação:** `tools/deploy/publish-session.mjs` gera `requestId=randomUUID()` e `blobId=randomUUID()` toda vez. Repetir após timeout cria nova revisão/carga e impede retomar pendências. Criar arquivo privado de estado fora do repositório escrito atomicamente, com identidade do conjunto fonte+receita+pedido e hashes. Usar requestId e blobIds estáveis para a mesma tentativa. `--resume` deve buscar status e fazer PUT somente dos IDs pendentes.
2. **Privacidade do CLI:** `appendStructuredLog()` recebe `crmOrderUuid` e outros identificadores, e exceções incluem `errorBody` remoto, caminhos e detalhes; nunca imprimir payload/URL/token, headers auth ou nome/telefone. O recibo contendo `accessUrl` é segredo e precisa de local seguro.
3. **Autoridade CRM:** `POST /internal/v1/sessions/resolve` checa apenas regex UUID, mas não verifica que pedido pertence ao CRM, é elegível nem que o operador está autorizado. EvydFlow tem `orders.detail`, mas o serviço remoto também precisa validar a credencial e vínculo do pedido, ou operar sob fluxo operador autenticado bem definido.
4. **Integridade WebP:** `FileSystemStorageService.parseWebpMetadata()` valida marcadores, não decodifica a imagem completa. Acrescentar teste real de WebP truncado, RIFF declared length/chunk boundaries, bytes/sha256, dimensões, arquivo final e confirmação de storage. Upload da API jamais aceita só `storageConfirmed:true` vindo do HTTP.
5. **Transport/TLS:** compose.persistence.yaml prende `100.116.8.109:4180` (Tailscale), porém origem reportada é `http://...`; definir túnel HTTPS autenticado ou conexão privada com garantias explícitas antes de carregar fotos reais. Não encaminhar `/internal` via Caddy público.
6. **Frontend:** testar que o React em modo real faz fetch `/s/:token/data` e usa URLs privadas de mídia sem recorrer a fixtures. O `200 ACTIVE` do publisher sem renderização de galeria não encerra o MVP.
7. **Logger:** `StructuredPublicationLogger` filtra chaves específicas em `details`, mas permite strings arbitrárias em `path` e `event`, e `run_job` do EvydFlow registra `base_dir`, `params` e persiste resultados. Implementar allowlist real por campo e correlacionar por runId aleatório, não por token, URL ou nome.
8. **Retry/storage:** `FileSystemStorageService.hasBlob()` verifica existência, não hash; PUT 200 replay exige confirmar bytes/hash. Em caso de corrida de PUT no mesmo ID e arquivo final, não substituir objeto não validado. Testar kill após rename antes do `recordVerifiedBlob`, restart e retomada.
9. **Flags:** `pilotReady=false,customerDataAllowed=false,automaticDeliveryAllowed=false` preservadas. Não levantar as restrições a partir de smoke sintético; novo gate com logs/backup e aprovação.
10. **Workflow legado:** `flows/natal_laboratorio.yaml` chama FTP, Drive, SIGI e WhatsApp, e move TRATADAS. Não usá-lo para ensaiar a nova integração. Criar flow dedicado que não toca nenhum dos serviços legados, com `gallery.publish_revision` condicional e sem mensagens automáticas.

## Patches prioritários (menor MVP)

**P0-A (um PR):** receipt durável + retomada dos mesmos UUIDs + proteção de stdout/stderr + testes de timeout/replay/crash.

**P0-B (um PR):** segurança dos bytes, storage/SQLite, retorno 200 READY e teste HTTP binário completo. Logs por JSON estruturado com `runId`, `step`, `status`, `durationMs`, `bytes`, `attempt`, `errorCode`; jamais URL/PII. Verificar TLS privado.

**P0-C (um PR):** integração EvydFlow opt-in com `orders.detail` e validação de UUID real + subprocesso Node. Não incluir URL em `StepState`/logs; recibo protegido. Link só considerado pronto com ACTIVE e cliente conseguindo GET /data e GET primeira/última variante.

## JSON interno sugerido — recibo privado do publisher

```json
{
  "version": 1,
  "requestId": "11111111-1111-4111-8111-111111111111",
  "sessionId": "22222222-2222-4222-8222-222222222222",
  "revisionId": "33333333-3333-4333-8333-333333333333",
  "phase": "STAGED",
  "expectedActiveRevisionId": null,
  "manifestSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "blobCount": 12,
  "storedAt": "private operator storage; NOT this example"
}
```

O recibo que contém acesso (ACTIVE + accessUrl) deve ficar no mesmo diretório privado, com ACL restrita; nunca nos relatórios públicos. Não usar o URI diretamente nos logs, prints, Issues ou GitHub Actions.

## Teste real local (sem subir ainda)

Executar no Windows: `pnpm media:preflight --source $source --check-health` e depois `pnpm media:prepare-local --source $source --storage $privateRoot --concurrency 2`, mantendo `$source` em variável privada local. Verificar 3 derivados por foto, hashes, orientação, transparência, formatos, integridade e seleção de produtos/Chaveiro. Se a pasta L: não está acessível nesta execução, informar e não simular sucesso. Não guardar PII no Git.

**Próxima etapa:** após todos os testes com fotos sintéticas na API real e aprovado armazenamento/backup, pedir aprovação para enviar derivados reais. Não criar duplicidade de pedido, não mandar WhatsApp ainda, não executar o YAML de produção.

## Aceite end-to-end

- **A:** publicar 4 fotos sintéticas e ver 12 blobs READY + ACTIVE + GET browser real.
- **B:** repetir o mesmo comando com mesmo receipt; nenhum blob novo desnecessário, sem revisão extra, mesmo link.
- **C:** interromper depois do terceiro blob, reiniciar processo e terminar com mesmo requestId/revisionId.
- **D:** token B não acessa A; bad bearer bloqueado; logs sem segredo; backup/restore.
- **E:** testes locais de fotos reais e aprovação explícita de piloto; só então upload real, status ACTIVE, URL segura no EvydFlow.
- **F:** mensagem WhatsApp exige aprovação de conteúdo e destinatário, envio idempotente e capacidade de reprocessar sem reenviar.

## Documentação oficial

Node.js streams/fs/sqlite: https://nodejs.org/docs/latest-v24.x/api/stream.html ; https://nodejs.org/docs/latest-v24.x/api/fs.html ; https://nodejs.org/docs/latest-v24.x/api/sqlite.html

OWASP upload e logging: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

SQLite transaction/WAL/backup: https://www.sqlite.org/lang_transaction.html ; https://www.sqlite.org/wal.html ; https://www.sqlite.org/backup.html
