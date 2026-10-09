# Contrato proposto v1 — Sessão única, revisões e publicação privada

Data 2026-10-08. Especificação de IMPLEMENTAÇÃO futura. Nada neste arquivo afirma que os endpoints, tabelas ou migrações já existem. Owner: apps/catalog-server; publisher manual owner: tools/media-pipeline. Stage atual proíbe mídia real na VPS.

## Modelo de produto e identidade

- Pedido CRM é chave comercial interna: um pedido identifica uma única sessão lógica/gallery. Nunca usar nome/telefone/código do pedido como token de acesso nem como chave de path público.
- Session UUID interno estável, public capability aleatório de alta entropia revogável; o link da família é https://jogos.fotosdenatal.com/s/{opaque}. A galeria é /s/{opaque}/fotos, jogos /s/{opaque}/game/{slug}. Nunca subgalerias por dia/cliente ou por lote.
- Mesma sessão aceita revisões A1, A2, A3... imutáveis. Somente uma revisão ACTIVE. Uma revisão nova só substitui a atual quando TODOS os objetos e DB metadata estão validados.
- Cliente B com pedido B jamais pode resolver sessão A, photoId A, links A ou manifesto A. CRM metadata é minimizada no publisher; displayName só se expressamente necessário e aprovado pela política de privacidade.
- Media/photoId estável entre revisões quando conteúdo representa a mesma fotografia. Mudanças intencionais de seleção/ordem devem atualizar metadados, sem alterar roteamento público. Nunca confiar em photoId fornecido pelo cliente como path arbitrário.

## Fonte Windows e processamento

1. Operador seleciona pasta final do ensaio. Ler SOMENTE JPEG/PNG/WebP elegíveis DIRETAMENTE na raiz; ignorar BAIXA, pastas de subproduto, originais RAW, arquivos ocultos e saídas geradas. Nunca deletar nem mover os originais.
2. Resolver vínculo com pedido pelo CRM através de integração autorizada. O número final da pasta é apenas um indício; é obrigatório checar existência/autorização do pedido antes de publicar. Na fase manual, exigir confirmação operator e CRM-order identifier validado.
3. Node/Sharp deriva thumb/card/game (na bancada atual exemplo 480/800/1600 com preservação de proporção, orientação EXIF aplicada, sRGB e EXIF sensível removido). Receita versionada, hash de conteúdo, dimensões reais e orientação em manifesto privado.
4. Cada foto recebe metadata de variantes, byteLength, SHA-256, width/height, mime, recipeKey. Não confundir a URL de fixture Vite com a URL de mídia privada real.
5. Preparação idempotente com cache local validado por recipeKey+hash. Falha em uma foto aborta publicação da revisão inteira. Não usar arquivos originais no browser/VPS por padrão.

## Estados do servidor (máquina de estados proposta)

SESSION: ACTIVE | REVOKED | EXPIRED; revisão: STAGED -> VALIDATED -> ACTIVE -> SUPERSEDED.

- STAGED: upload parcial em área privada temporária, sem link público. Pode expirar/abortar com limpeza controlada.
- VALIDATED: manifesto schema conferido; contagem completa; SHA, MIME sniff, dimensões, decode de imagens, quotas e autorização de origem verificados; nada publicável ainda.
- ACTIVE: transação DB ativa revision_uuid com compare-and-swap de expected_active_revision e arquivo de manifesto imutável. A1 permanece servível até commit bem-sucedido de A2.
- SUPERSEDED: mantida por retenção limitada para rollback, sem publicação arbitrária a novos clientes. Revogação de grant impede exposição.
- ABORTED/FAILED: estado terminal da tentativa; mídia temporária limpo por processo controlado; outra revisão ativa não sofre alterações.
- Se ACTIVE troca A1->A2, o browser recebe versão nova ao atualizar, e nunca fotos misturadas entre A1 e A2 no mesmo snapshot.

## Tabelas e restrições mínimas PROPOSTAS

- photo_sessions: id UUID PK, crm_order_key unique, status, active_revision_id nullable, public_token_hash (não guardar texto), token_revoked_at, created_at/updated_at.
- photo_revisions: id UUID PK, session_id FK, sequence unique(session_id, sequence), state, expected_active_revision_id, manifest_hash, recipe_key, photo_count, created_at/validated_at/activated_at.
- revision_photos: revision_id FK, photo_id opaco, sort_index, source_content_hash, width, height, orientation, unique(revision_id, photo_id), unique(revision_id, sort_index).
- media_variants: revision_id + photo_id + kind unique, blob_key opaco, mime, byte_length, sha256, actual_width, actual_height. Nunca path vindo de cliente sem validação.
- publication_requests: idempotency_key + authenticated publisher unique, session_id, revision_id, request_hash, response_status, timestamps; replay com mesma carga retorna mesmo resultado.
- session_grants: jti/token_hash, session_id FK, scope, expires_at, revoked_at, grant_version; concessões separadas de credenciais publisher.
- audit_events: correlation_id, event_type, pseudonymous session id, counts/status/time; NUNCA public token, path de origem, email, telefone, nomes nem segredo.
- indices que suportem lookup pelo token HASH, sessão, revisão ativa, limpeza de staging e auditoria. SQLite WAL com FK ON, busy_timeout explícito, transações para CAS e apenas um writer ativo.

## Endpoints privados v1 — contratos previstos, NÃO implementados

Canal privado (Tailscale/HTTPS/mTLS ou equivalente validado) somente autorizado a publisher scoped; sem acesso público via Caddy por padrão:

- POST /internal/v1/sessions/resolve : verificar referência CRM e retornar sessionId UUID, revisão ativa e capacidade de preparar revisão. Se pedido não existir/autorizado, falhar fechado.
- POST /internal/v1/sessions/{sessionId}/revisions : body versionado com request_id/idempotency_key, expected_active_revision_id, manifest resumo. 201 primeira tentativa / 200 replay idêntico / 409 conflitos com carga diferente ou revisão A já modificada.
- PUT /internal/v1/revisions/{revisionId}/files/{opaqueMediaId} : stream multipart/chunk resumível SE necessário; exigir auth+sha256+comprimento e limites, gravar em arquivo temporário e fsync/rename ao concluir. Evitar JSON contendo conteúdo base64.
- POST /internal/v1/revisions/{revisionId}/validate : conferir arquivos presentes, recipe, hash, decode, metadados, quotas, isolamento e manifesto.
- POST /internal/v1/revisions/{revisionId}/activate : transação compare-and-swap e retorno da revisão ativa/token público já autorizado; NUNCA ativar parcialmente.
- GET /internal/v1/revisions/{revisionId}/status : estado/contagens, sem URLs privadas no log. POST /internal/v1/revisions/{revisionId}/abort : cleanup safe, sem tocar na ACTIVE.
- POST /internal/v1/sessions/{sessionId}/revoke : revogar acesso público, invalidar grants e cache; não necessariamente apagar imediatamente os backups.

A sintaxe é objeto de contrato OpenAPI/testes antes de escrever controladores. Não implementar endpoints sem comparar com código e interfaces existentes. Segredos de upload têm scopes separados de token do cliente.

## Leitura pública segura

- GET /s/{opaque}, /fotos e /game/{id}: catalog-server autoriza sessão ACTIVE e fornece HTML + snapshot autorizado. Inválido, revogado ou expirado -> 404/410 conforme política, nunca fixture fallback.
- GET /api/v1/sessions/current? via grant derivado do token opaco ou bootstrap criptográfico curto, explicitamente autorizado; não usar token como parâmetro em analytics.
- GET /media/{photoId}/{variant}: valida grant/sessão/revisão/kind ANTES de responder X-Accel-Redirect para URI interna opaca. Testar A/B cross-access, URL arbitrária, grants revogados e antigo snapshot.
- Nginx INTERNAL serve variantes com alias em /srv/christmas-private/derived somente após X-Accel-Redirect; sem public folder ou exposição do filesystem.
- Respostas HTML privadas: no-store, noindex, no-referrer e headers anti-sniff. Media privados: cache private controlado por expiração/revogação (decidir antes do piloto). Social preview padrão genérico até consentimento documentado.
- Browser não recebe CRM ID, telefone, caminho de origem, origem das fotos ou segredos upload. Links de compartilhamento são capabilities: encurtar expirando/revogando quando necessário.

## Resiliência, segurança e governança

- Upload limites por fotografia, lote e revisão; quota por operador e disco; MIME sniff + decode Sharp de mídia, limites pixel/metadata, proteção contra decompression bomb, path traversal, symlink, zip e extensão falsa.
- Cada variante é servida via ID opaco (não derivado de basename real), path construído server-side. Gravação temporária seguida de checksum e rename atômico dentro do mesmo filesystem; idempotência após timeout.
- Sem duplicar armazenamento para cada envio sem necessidade. Conteúdo derivado pode compartilhar blobs imutáveis com refcount se isolamento de autorização comprovado. Deletar somente com GC após retenção.
- SQLite WAL em SSD local, single writer; backup consistente com API SQLite backup/VACUUM INTO e restauração com checagem FK, hashes e smoke. Backup offsite criptografado e política LGPD de retenção acordada.
- Ambiente VPS compartilhado: CPU/IO pesado Sharp processado no Windows; backpressure de upload, throttling do publisher e janelas de menor movimento; limite de I/O e alerta de espaço/inodes.
- Nunca promover estágio pilot ou entregar fotos reais sem provas de migração, backup/restore, isolamento A1/A2/B, interrupção/retry, Android/Safari, revogação, logs redigidos e aprovação humana.

## Testes obrigatórios antes do piloto

1. A1 30 imagens: só após validate+activate fica visível; link de cliente opaco.
2. A2 altera 3 fotos, preserva links e IDs estáveis, ativa por CAS; A1 continua durante todo o upload e em falhas.
3. B 12 imagens: cross-token/cross-photo/cross-revision nunca vaza mídia A; entradas inválidas negadas.
4. Interromper upload no meio, retomar sem duplicação; mesmíssimo request_id faz replay; payload diferente usando mesma chave falha.
5. SHA/MIME/tamanho/filename/traversal inválidos, malicious image, disco cheio, revogação, token expirado, read-only, restart e crash durante transação.
6. Navegar Hub/Galeria/Puzzle/Memória/Trinca, retrato/paisagem, direct reload /fotos, foto 11 scroll restoration, low-quality.
7. Snapshot DB em escrita real, restaurar offsite e garantir integridade/fotos vinculadas no restore.
8. Testar políticas de remoção/retention de acordo com aprovação LGPD e baixa do pedido.

## Ordem de implementação pelo Antigravity

A. Migrations e SessionRepository em apps/catalog-server; testes SQLite (A1/A2/B); stage não é promovido.
B. Browser grant + handler de media privada e gateway Nginx internal; testes auth.
C. API internal revisions/upload/validate/activate + auth publisher.
D. Publisher Node manual em tools/media-pipeline consumindo as mesmas variantes e manifesto da Gallery Lab, sem FTP.
E. Backup/restore/observabilidade e capacidade de armazenamento com limite operacional.
F. Piloto físico supervisionado somente após autorização; integrar EvydFlow/Python e WhatsApp depois.
