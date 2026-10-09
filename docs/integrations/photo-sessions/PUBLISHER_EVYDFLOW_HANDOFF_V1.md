# Contrato de upload v1 — preparação Node e integração futura Python

**Diretriz mais recente para o MVP:** [Point Graph mínimo operacional](MVP_POINT_GRAPH_APIS_DB_2026-10-08.md) com JSON/SQL/OpenAPI e roteiro Node manual primeiro. A automação Python é opt-in e pós-MVP.

**Fase:** preflight puro e contratos; não é API de produção, não cria SQLite, mídia pública ou sessão ACTIVE. Fonte do código em `apps/catalog-server/src/publication/publicationManifest.ts`; schema interoperável `docs/contracts/photo-publication-manifest-v1.schema.json`. O TS impõe invariantes entre itens (IDs duplicados, sortIndex contíguo e tamanho total), não expressáveis apenas no JSON Schema.

## Evidência forense cruzada

No repositório privado EvydFlow (inspeção de `flows/natal_default.yaml`, `flows/natal_laboratorio.yaml`, `evydflow/tasks/images.py`, `evydflow/tasks/contracts.py`, `evydflow/providers/evydencia.py`):

- Fluxos atuais criam BAIXA (JPEG com marca) e QC (quadrado), publicam via `ftp.upload` e montam URLs antigas a partir do pedido, inclusive URLs HTTP.
- A movimentação para TRATADAS acontece depois de tarefas de Drive/WhatsApp. **Não antecipar movimentação nem reexecutar FTP/WhatsApp ao adicionar nova publicação.**
- A função `images.generate_outputs` usa Pillow e tem objetivos de produto diferentes. NÃO reutilizar QC quadrado para galeria; não modificar output de BAIXA legado.
- EvydFlow já possui `orders.detail` e `orders.search`, mas os contratos de pesquisa/autorização devem ser confirmados antes de resolver número de pedido em UUID. Não confiar no número extraído do nome da pasta como prova de autorização.
- `TASK_PARAM_SCHEMAS`, `TASK_RESULT_SCHEMAS` e `TASK_SIDE_EFFECTS` existem: futura tarefa opt-in `gallery.publish_revision` deve declarar entrada/saída e `network_upload`, tratamento de retries e idempotência.

## Responsabilidade de cada processo

1. **EvydFlow Python:** orquestração de pedido e dependências, não gera nem envia as variantes fotográficas por conta própria. Em primeira fase só chama **publicador CLI Node** e recebe status estruturado, sem dados sensíveis em stdout.
2. **Node media-pipeline/Sharp:** lê somente JPEG/PNG/WebP da raiz autorizada; produz derivados web `thumb/card/game` com dimensões naturais, EXIF removido, cores sRGB e `recipeKey`, sem alterar originais. Não reutiliza outputs QC quadrados.
3. **Node publisher futuro:** associa pedido VALIDADO a `photoSessionId` existente (1 pedido = 1 galeria), produz manifesto do contrato v1 com IDs aleatórios, SHA de cada variante, requestId e expectedActiveRevisionId, envia através da API privada.
4. **apps/catalog-server futuro:** autoriza publisher/CRM, recebe stream autenticado, verifica corpo, count, tipos reais, bytes, SHA, CORS/rota, quota, staging e CAS. `ACTIVE` somente após validação integral, dentro de transação. Token do cliente é escopo separado.
5. **EvydFlow futuro:** só envia a mensagem de jogos após recibo `status=ACTIVE` + URL HTTPS opaca retornada pelo servidor. Não montar link usando ID do pedido, nome ou telefone. Falha de publicação não interrompe WhatsApp legado sem decisão explícita do operador.

## Fluxo mínimo futuro e corte vertical

- A: registrar migrations SQLite/session/revisions/media + testes A1/A2/B. Não expor upload ainda.
- B: implementar fronteira `publicationManifestV1` na aplicação e idempotency storage. O parser adicionado agora valida **metadados**, não imagens.
- C: criar `POST /internal/v1/sessions/resolve`, `POST /internal/v1/sessions/{id}/revisions`, upload binário de variante, `validate`, `activate`, `status`, `abort`; OpenAPI fechado e teste com auth, sempre atrás de canal privado.
- D: implementar CLI publisher Node com `--dry-run`, `--request-id`, `--order-ref`, `--source`, timeout, retry/replay e saída JSON sem tokens. Reusar cache de derivados Node/Sharp e checksum; nunca duplicar em Python.
- E: acrescentar tarefa Python **opt-in** após confirmação do pedido; não alterar os DAGs de produção por padrão. Python chama CLI por subprocesso sem shell e lê JSON mínimo `{status, sessionId, revisionId, photoCount}`; link de cliente só depois de ACTIVE e através de canal privado.
- F: testes de reversão A2 incompleta, 409 CAS, replay de idempotency_key (mesmo payload aceita; payload diferente rejeita), cross-session A/B, 429/backpressure, upload cortado, erro de imagem, disco cheio e restore.
- G: supervisão e flags de prontidão com aprovação humana; integrar WhatsApp depois de testes físicos e política de retenção LGPD.

## Operação segura do upload

- **Canal interno protegido:** Tailscale/mTLS ou equivalente auditado; Caddy público responde 403/404 para `/internal/*`. Nunca escutar nova porta aberta nem usar FTP para derivados privados.
- **Upload binário:** evitar base64 JSON, usar stream com Content-Length e SHA-256 conferido no servidor, escrita temporária e rename somente depois de verificar. Partes resumíveis apenas se benchmarking justificar; chunk fixo, offset e checksums exigem contrato próprio.
- **Idempotência:** requestId UUID estável por revisão/execução do job; retry usa exatamente o mesmo ID, não cria galeria duplicada. Hash de corpo canônico para rejeitar reaproveitamento conflitante.
- **Limites inicializados no parser:** 200 fotos, 12 MiB por variante, 600 MiB totais, 12000 px em cada eixo. São limites conservadores de pré-flight, não quotas de host aprovadas. Medir e ajustar por dado real e recursos da VPS antes do piloto.
- **Hash/metadata não provam upload:** servidor deve ler bytes enviados e conferir SHA, decodificar WebP, limites pixel e integridade antes de VALIDATED. O manifesto NÃO recebe paths de origem, nome, telefone, token, URL pública ou segredos.
- **A1/A2:** A1 permanece ACTIVE até que TODAS as variantes de A2 estejam prontas; falha de rede deixa A1 intacta; transação CAS impede corrida de operadores.
- **Backups:** SQLite WAL em disco local, backup consistente e restauração testada com hashes vinculados aos blobs; replicação offsite criptografada, sem vazamento em PR público.

## Formatos de resposta (proposta, ainda sem endpoints)

`resolve`: sessionId, activeRevisionId | null, authorizationStatus.
`beginRevision`: revisionId, status=STAGED, uploadSlots com IDs opacos, expectedActiveRevisionId.
`status`: revisionId, state, receivedVariants, expectedVariants, validationFailures (somente códigos sem nome de arquivo).
`activate`: revisionId, state=ACTIVE, photoCount, accessUrl somente por escopo de entrega.
`abort`: revisionId, state=ABORTED, sem remover ACTIVE.

Cabeçalhos: `Authorization` de publisher apenas via canal secreto; `Idempotency-Key` + body versionado, `X-Request-ID` sem PII. Respostas usam error code estável (`INVALID_MANIFEST`, `INVALID_MEDIA`, `PUBLISHER_UNAUTHORIZED`, `STALE_REVISION`, `UPLOAD_INCOMPLETE`, `QUOTA_EXCEEDED`), sem exceção interna/path.

## Segurança de links

O token de staging publicado anteriormente em relatório/chat deve ser tratado como **capability de demonstração compartilhada**. Não reutilizar a mesma string para clientes e nem convertê-la em credencial de API. Caddy/Nginx devem usar logging com mascaramento específico para caminhos `/s/{token}`, sem confiar somente em `access_log off` do Nginx (a borda Caddy e logs de erro também podem registrar caminhos).

## Referências oficiais

- Node 24 SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- SQLite WAL: https://sqlite.org/wal.html
- Nginx internal/X-Accel-Redirect: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx proxy buffering: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker Compose health dependencies: https://docs.docker.com/reference/compose-file/services/
- Caddy reverse proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
