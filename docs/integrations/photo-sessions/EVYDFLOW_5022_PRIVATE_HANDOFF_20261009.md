# Handoff de preparação EvydFlow #5022 — Gameplay (somente offline)

**Fonte EvydFlow:** PR #11 `feat/natal-soclick-gameplay-bridges-20261009` (branch derivada da PR #10). **Base Gameplay:** PR #13 (`ops/photo-folder-preflight-and-private-upload-runbook`). Nenhuma mídia de cliente foi enviada pela preparação do GitHub.

## O que a integração prepara agora
EvydFlow usa originais JPEG em staging local com hash verificado. `production/gameplay_bridge.py` gera `_GAMEPLAY_LOCAL_SOURCE` privado com SOMENTE fotos de ensaio, sem mutar originais. Arquivos de produtos iniciados por Calendário, Globo ou Chaveiro continuam disponíveis ao SóClick, mas não entram nos jogos. Para #5022: 30 fotos de ensaio e quatro arquivos de produto conforme relatório local fornecido pelo Antigravity. Validar contagem física antes de qualquer execução.

O CLI `tools/pilots/natal_5022.py games-plan` exige identificação CRM somente leitura e prepara a origem Node/Sharp. Não executa pnpm automaticamente e NÃO faz upload. Sem segundo pipeline Pillow WebP: `tools/media-pipeline` permanece autoridade para três variantes: thumb/card/game.

## Contrato de interface a usar no corte 2
- Operador entrega ao Node fonte privada e referência de execução (`run_id`, UUID CRM confirmado, revisão) por canal local, sem colocar nome, telefone ou pasta em logs.
- Node executa `pnpm media:preflight --source ...` para pré-inspeção e `pnpm media:prepare-local --source ... --storage ... --concurrency 2` para derivados. Confirmar sintaxe via `--help` antes. Variante do Node deve preservar orientação e converter sRGB, remover EXIF sensível e emitir SHA/bytes/dimensões reais.
- Manifesto v1 em `docs/contracts/photo-publication-manifest-v1.schema.json`: requestId, sessionId, expectedActiveRevisionId, recipeKey, photos[*].photoId/contentHash/sortIndex/width/height/variants.{thumb,card,game} com blobId, sha256, byteLength, width, height.
- MVP OpenAPI **canônico** `docs/contracts/mvp-photo-publication-v1.openapi.json`: POST sessions/resolve, POST publications, PUT blob, GET publication status, POST activate; leitura /s/{token}/data e /s/{token}/media/{revisionId}/{photoId}/{variant}. Não inventar POST validate (do contrato expandido futuro) sem revisão formal do OpenAPI.
- Resolver a sessão pelo UUID CRM, nunca pelo nome nem pelo número público do pedido. Mesmo pedido mantém `sessionId` e capacidade de acesso; revisões A1/A2 mantêm ACTIVE anterior até CAS e validação integral.

## Estado real do servidor (não confundir contrato com implantação)
`apps/catalog-server/src/CatalogServer.ts` e `main.ts` ainda tratam páginas/previews GET/HEAD. `SessionRepository.ts` contém modelo SQLite + CAS, mas a API HTTP real de upload não está conectada. `recordVerifiedBlob(storageConfirmed=true)` só é seguro após comprovação de bytes feita pela camada privada de storage. `deploy/readiness.json` continua `pilotReady=false`, `customerDataAllowed=false`, `automaticDeliveryAllowed=false`.

### Requisitos P0 para publicação de uma sessão real
1. Conectar routes /internal/v1 ao catálogo em host protegido por HTTPS/Tailscale/publisher bearer, inacessível ao Caddy público.
2. Fazer streaming de 3 variantes por foto com tmp/fsync/rename, MIME, SHA-256, comprimento, dimensões e decodificação real comprovados.
3. Atualizar blobs READY apenas quando storage confirmar bytes; GET status deve fornecer contagem, IDs e estado de forma idempotente.
4. Criar leitor de sessão e mídia privada com token de alta entropia e isolamento estrito A/B, revogação, `no-store`, cabeçalhos, X-Accel-Redirect e sem path original no navegador.
5. Backups e restauração de SQLite/artefatos, logs sanitizados, quotas, 409 CAS, 401/403 e falhas de upload.
6. Android + iPhone/Safari e gate readiness explícito somente depois dos itens anteriores. Nunca mudar flags para passar teste.

## Execução segura para Antigravity
Primeiro usar dados SINTÉTICOS no checkout Gameplay; `pnpm check`, `pnpm agent:doctor`, testes de contratos, API privada local simulada e testes de isolamento A1/A2/B. Não publicar nenhuma foto real do #5022 na VPS enquanto o bloco P0 persistir.

## Pontos de auditoria do caso real
- O SóClick deve ter 34 arquivos (30 fotos + 4 produtos especiais), mas gameplay recebe 30 de ensaio somente; **não usar a pasta SóClick como origem para o Node**.
- A fila WhatsApp do piloto está com 1 unknown_outcome; jogos não podem ocasionar novo envio nem destravar a Z-API por conta própria.
- Concluir as etapas separadamente no painel por pedido: fonte pronta != derivados prontos != upload READY != revisão ACTIVE != cliente recebeu link.
- Não publicar nem copiar fotos ou tokens nos artefatos GitHub, Issues, logs ou relatório de CI.

## Referências
- [Point Graph e cinco endpoints](MVP_POINT_GRAPH_APIS_DB_2026-10-08.md)
- [OpenAPI v1](../../contracts/mvp-photo-publication-v1.openapi.json)
- [Contrato do manifesto v1](../../contracts/photo-publication-manifest-v1.schema.json)
- [Preflight local](../../ops/MVP_LOCAL_PHOTO_PREFLIGHT_2026-10-09.md)
- Sharp: https://sharp.pixelplumbing.com/api-output/
- SQLite WAL: https://www.sqlite.org/wal.html
