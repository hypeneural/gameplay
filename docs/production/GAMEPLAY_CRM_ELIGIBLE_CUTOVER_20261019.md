# Gameplay / catálogo — liberação segura de clientes CRM (19/10/2026)

## Problema reproduzido pelo Antigravity
Pedido #5093: EvydFlow `gameplay_publish` preparou JPEGs locais e recebeu `PUBLISHER_RESOLVE_HTTP_403` em `/internal/v1/sessions/resolve`. A implementação atual de `main.ts` aceitava apenas um UUID piloto (`CATALOG_PILOT_ORDER_UUID`). A sugestão `CATALOG_PILOT_ORDER_UUID='*'` **não funciona** com igualdade literal de UUID nem é a forma correta de liberar clientes.

## Correção de código nesta PR #42
`apps/catalog-server/src/publication/publicationRolloutPolicy.ts` habilita separadamente:
- **Desligado** por padrão quando não há piloto e não existe autorização explícita de release.
- **Piloto único**, comportamento antigo com UUID validado + `CATALOG_CUSTOMER_PILOT_ENABLED=1`.
- **CRM-eligible rollout** com opt-in explícito, mediante TODAS as condições: `NODE_ENV=production`, `CATALOG_RELEASE_STAGE=staging-demo`, `CATALOG_PREVIEW_AUTHORITY=sqlite`, `CATALOG_CUSTOMER_DATA_ALLOWED=1`, `CATALOG_CUSTOMER_RELEASE_ENABLED=1`, `CATALOG_CUSTOMER_RELEASE_ACK=AUTORIZO_APENAS_PEDIDOS_ELEGIVEIS_CRM`, CRM origin/token, publisher secret, server secret, caminho de banco e armazenamento privados.

O guard permite UUIDs válidos no rollout, mas `PublicationService` CONTINUA exigindo `crmClient.verifyEligibility` em `resolve` **e novamente na ativação da revisão**. Cancelamentos, revogações, divergência UUID e ausência de serviço CRM continuam fail-closed. Os controles de revisão, blob e ACTIVE permanecem inalterados.

**Importante:** esse opt-in libera apenas a autorização de ordem no catálogo; não altera o status de outros gates (deploy, upload, secrets, HTTPS, galerias WebP), nem prova que o catálogo já foi publicado.

## Corte supervisionado VPS
1. Confirmar o HEAD remoto da PR #42, estado real do container e backups consistentes do banco e da pasta privada de mídia. Guardar checksum do deploy atual.
2. Executar `pnpm exec vitest run apps/catalog-server/src/publication/publicationRolloutPolicy.test.ts apps/catalog-server/src/publication/hardeningRegression.test.ts`, `pnpm check` e verificações do repositório. Revisar diff antes de publicar.
3. Confirmar que `CATALOG_CRM_ELIGIBILITY_ORIGIN`, `CATALOG_CRM_API_SECRET_FILE`, `PUBLISHER_API_SECRET_FILE`, `CATALOG_SERVER_SECRET_FILE`, `CATALOG_DATABASE_PATH`, `CATALOG_STORAGE_DIR` e `CATALOG_PREVIEW_AUTHORITY=sqlite` apontam para recursos existentes, protegidos e atualmente usados. NÃO exibir valores dos segredos no terminal/log.
4. Apenas após aceite real, inserir no arquivo privado da stack, sem commit:
   ```ini
   CATALOG_CUSTOMER_DATA_ALLOWED=1
   CATALOG_CUSTOMER_RELEASE_ENABLED=1
   CATALOG_CUSTOMER_RELEASE_ACK=AUTORIZO_APENAS_PEDIDOS_ELEGIVEIS_CRM
   ```
   `CATALOG_PILOT_ORDER_UUID=*` não é necessário e não deve ser usado.
5. Implantar com processo canônico da stack, conferir readiness/API/commit do container. Um canário CRM válido com consentimento da sessão; verificar resposta 200/201 de resolve, confirmação de upload, prova ACTIVE e acesso autenticado. Pedido revogado deve permanecer 403. Não reemitir um POST de resultado incerto: consultar receipts/ledger pela mesma idempotency key.
6. Para #5093: antes de repetir publicação, conferir marcadores `.inflight`, audit JSONL e GET remoto; se nenhum receipt ACTIVE corresponde, reconciliar e realizar UMA tentativa controlada com identidade/revisão exatas.
7. Só após prova de galeria ACTIVE, liberar `gallery_link_send` no EvydFlow. Nunca confundir aceitação Z-API com entrega ao telefone.
8. Rollback: desfazer rollout removendo **ambas** as variáveis `CATALOG_CUSTOMER_RELEASE_ENABLED` e `CATALOG_CUSTOMER_RELEASE_ACK` e reimplantar a configuração anterior. Não excluir sessões, mídias ou outbox aceitas; estado antigo permanece sujeito à política de piloto único.

## Comandos (somente leitura até aprovar cutover)
```bash
# Na worktree limpa após fetch, sem imprimir segredos
pnpm exec vitest run apps/catalog-server/src/publication/publicationRolloutPolicy.test.ts
pnpm check
```

## Pendências de GO
- Não foi executado pelo ChatGPT o deploy/VPS ou o teste local npm/pnpm; a PR #42 continua draft e os gates de `main`/contêiner são externos ao commit.
- Hashes WebP individuais e semântica de publicação ACTIVE devem continuar na trilha da Issue #45 EvydFlow.
- Rejeição CRM é segurança esperada; não contornar por allow-all.

Referências oficiais: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments e https://nodejs.org/api/process.html#processenv
