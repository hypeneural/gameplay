# Handoff privado do EvydFlow — Natal 2026

**Estado:** preparação offline. Nenhum upload de cliente foi autorizado.

**Origem:** [EvydFlow PR #11](https://github.com/hypeneural/evydflow/pull/11).

**Base:** Gameplay PR #13, ainda em modo de homologação.

## Lotes por destino

O relatório local do pedido #5022 informa 34 fotografias JPEG no total.

- SóClick: 30 fotos de ensaio e quatro arquivos de produtos especiais.
- Jogos: somente 30 fotos de ensaio, sem Calendário, Globo ou Chaveiro.
- BAIXA/WhatsApp: somente 30 fotos do ensaio.

As quantidades precisam ser reconfirmadas no Windows antes da homologação.

## Fronteira EvydFlow e Node/Sharp

O EvydFlow cria uma origem privada e imutável, com hashes conferidos.

O comando `games-plan` apenas prepara essa origem. Não executa upload.

A ferramenta `tools/media-pipeline` é responsável pelas três variantes WebP:

- `thumb`: miniatura da galeria.
- `card`: cartão do álbum.
- `game`: mídia dos jogos.

Cada variante exige tamanho, dimensão e SHA-256 verificados em disco.

## Contrato HTTP do MVP

A referência é o [OpenAPI v1](../../contracts/mvp-photo-publication-v1.openapi.json).

1. `POST /internal/v1/sessions/resolve`
2. `POST /internal/v1/publications`
3. `PUT /internal/v1/publications/{revisionId}/blobs/{blobId}`
4. `GET /internal/v1/publications/{revisionId}`
5. `POST /internal/v1/publications/{revisionId}/activate`

Os leitores privados usarão as rotas `/s/{token}/data` e `/s/{token}/media/...`.

O manifesto deve seguir o
[contrato v1](../../contracts/photo-publication-manifest-v1.schema.json).

## Bloqueadores de produção

O `SessionRepository.ts` já contém SQLite e CAS, mas o servidor HTTP
`CatalogServer.ts` não possui os handlers privados do MVP.

O campo `storageConfirmed` não comprova bytes sem uma camada privada de storage.

O arquivo `deploy/readiness.json` ainda mantém:

- `pilotReady=false`
- `customerDataAllowed=false`
- `automaticDeliveryAllowed=false`

Não alterar esses valores apenas para liberar um teste.

## Próximos gates

- Autenticar o publisher em HTTPS privado, sem expor `/internal/v1` publicamente.
- Conferir MIME, bytes, SHA-256, dimensões, cotas e armazenamento durável.
- Ativar a revisão somente por CAS, preservando A1 durante o upload de A2.
- Restringir mídia privada por sessão, token e revisão.
- Testar isolamento entre famílias A/B e revogação.
- Homologar backup/restauração e logs sem PII ou capability.
- Usar dados sintéticos antes de publicar qualquer fotografia real.

Não usar a pasta SóClick como origem dos jogos.

O WhatsApp do pedido #5022 possui um envio de resultado incerto no relatório local.
A integração de jogos não pode iniciar outro disparo.

## Referências

- [Point Graph](MVP_POINT_GRAPH_APIS_DB_2026-10-08.md)
- [Preflight local](../../ops/MVP_LOCAL_PHOTO_PREFLIGHT_2026-10-09.md)
- [Sharp output](https://sharp.pixelplumbing.com/api-output/)
- [SQLite WAL](https://www.sqlite.org/wal.html)
