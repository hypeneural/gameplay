# P0 — Handoff de integração da galeria privada (16/10/2026)

> **DRAFT / NO-GO para fotografias reais.** O staging demonstrativo Natal Velvet + Christmas Loading foi publicado no release `20261016-8432328`, conforme logs do operador. Esta branch candidata **não** está implantada e não deve substituir o staging até passar os gates. Nenhuma mídia, token ou cadastro de cliente faz parte deste arquivo.

## Árvore de integração — não mesclar branches antigas diretamente

- **Principal:** `codex/puzzle-native-like-v1` (Natal Velvet, loading, Docker bind/gateway P0 corrigidos).
- **Candidata:** `integration/real-gallery-authority-gated-20261016` / PR #42, sobre a principal consolidada.
- **Fonte:** Gameplay PR #30 `d144d1a`, com dependências de #11/#15/#23. Ajustes concorrentes #26/#27 ainda devem ser confrontados e reconciliados: não presumir que a PR #30 os contém.
- **EvydFlow:** PR #37 (Windows workflow) e #14/#15 (publisher Node) em draft.
- **CRM:** `GET /api/orders/{uuid}/detail` existe na principal; validar autenticação, estrutura real e cancelamento com `CrmEligibilityService` antes de habilitar publicação.

## Já portado nesta PR, aguardando reconciliação final

- SQLite com migrações, tabela de revisões/recibos e CAS; `PublicationService`; `FileSystemStorageService`; cliente CRM; publicador Node/Sharp e suítes de teste sintético.
- `CatalogServer`, `main.ts` e configuração de runtime integrados mantendo `HOST` validado (loopback padrão e `0.0.0.0` explicitamente configurado dentro do Docker).
- Contratos JSON de manifesto e OpenAPI; scripts de backup/restore e de preflight.
- Correção adicional: WebP imutável não pode ser sobrescrito por reupload de mesmo `blobId` com bytes diferentes; teste de corrida.
- `deploy/readiness.json` permanece sem autorização de fotos reais.

## Como verificar no notebook Avell (Windows 11)

1. Abrir worktree limpo desta PR em pasta separada. Não executar reset no workspace principal.
2. `pnpm install --frozen-lockfile`.
3. Executar script focado, read-only:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/agent/verify-gameplay-private-candidate.ps1
```

4. Somente após fechar o código e commitá-lo, executar uma única validação completa:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/agent/verify-gameplay-private-candidate.ps1 -Full
```

O script se recusa a executar se a árvore estiver suja ou a política de prontidão tiver sido aberta. Ele **não** faz SSH, upload real, mensageria, mutação de CRM ou alteração na VPS.

## Bloqueadores restantes, nesta ordem

1. CI completo e relatório do HEAD exato da PR #42; resolver falhas isoladamente, sem testes infinitos.
2. Reconciliar a lógica de reservas e recibos de #26/#27: `.inflight` impede replay cego após timeout, sem descarte unilateral. Provar idempotência com reinício e concorrência.
3. Ligar `/s/<token>/data` ao **AppRouter atual** via `SessionDataLoader`, mantendo Christmas Loading, a Galeria Natal Velvet, seleção de foto, gestos e cache isolado. Não copiar o `AppRouter.tsx` antigo inteiro da PR #30.
4. Validar contratos de media authorization e gateway privado: bearer interno, rotas `/internal/v1/*` inacessíveis publicamente, Nginx `X-Accel-Redirect`, armazenamento fora da webroot, 401/403/404/409/413, rate limit e isolamento A/B.
5. Política de piloto no próprio CatalogServer: backend deve negar pedidos reais por padrão independentemente do CRM e do segredo do publicador. Revalidar autorização de pedido/revisão em `activate` e revogação após ACTIVE.
6. Reconhecer Compose real da VPS **sem mudar serviços compartilhados**, mapear DB/WAL e blobs persistentes de maneira restrita e comprovar restart sem perda. Testar backup/restauração em diretório isolado com publishers parados, sem substituir banco de produção; auditar script de restore antes de usar em host.
7. Adaptar e homologar EvydFlow Windows: pasta → UUID CRM → filtros BAIXA/TRATADAS/Calendário/Globo/Chaveiro → Sharp/WebP com hashes → upload/READY/ACTIVE → recibo imutável → `/data`, `/fotos` e jogos → outbox/WhatsApp separado.
8. Executar canário sintético A/A2/B em HTTPS/gateway real, com troca de versão, token desconhecido, sessão cruzada, revogação, cache social, timeout/retomada e erro de rede.
9. Dispositivos iPhone Safari e Android Chrome físicos. Só então propor um único pedido real autorizado, com consentimento, destinatário e status CRM verificáveis, e aprovação explícita do operador. Z-API `accepted/sent` não é prova de `delivered`.

## Provas para eventual GO

Guardar relatório `SHA Gameplay / SHA EvydFlow / SHA CRM / release VPS / teste / resultado / evidência sanitizada`. Não usar links de capacidade, nomes, telefones, paths de cliente ou fotos em GitHub/CI. O status de demonstração publicado não é evidência de readiness para clientes.

### Documentação técnica

- https://www.sqlite.org/backup.html — snapshot consistente para SQLite/WAL
- https://www.sqlite.org/wal.html — WAL e checkpoint
- https://docs.docker.com/compose/how-tos/networking/ — DNS interno e isolamento Compose
- https://nginx.org/en/docs/http/ngx_http_core_module.html — `internal`, `alias` e redirecionamento interno

**Resultado aceito até aqui: integração de código em PR draft; fotos reais NÃO LIBERADAS.**
