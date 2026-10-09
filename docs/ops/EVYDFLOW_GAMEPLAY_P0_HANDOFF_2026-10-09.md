# Handoff de integração — EvydFlow / Gameplay (2026-10-09)

Escopo: consolidar PRs encadeados sem deploy implícito.

1. Gameplay PR #15 -> #16 -> #18; esta branch parte da #18. Isolar concorrência de um mesmo storage root; devolver hubUrl e galleryUrl no recibo somente após ACTIVE. O lock `.publication-running.lock` impede concorrência e exige recuperação manual supervisionada se um processo morrer (não remover lock de processo ativo); adicionar teste de exclusividade e crash/recovery. Verificar portões do release e não liberar dados reais.
2. EvydFlow PR #14 (task + DAG + integração Node) é base; PR #15 oferece adapter alternativo, não habilitar ambos. Esta branch EvydFlow deriva #14 e normaliza o recibo como access_url/hub_url/gallery_url. Consolidar em um adapter e uma única task. Manter YAML Natal normal intocado.
3. Corrigir `AppRouter.tsx`: sessões reais jamais podem cair no createFixtureSession; buscar `GET /s/:token/data` com AbortController, schema validation, handling 404/403/500 e origin-safe relative images. Preservar fixtures APENAS para rotas de desenvolvimento explicitamente definidas.
4. Adicionar autorização real do pedido no catalog backend: UUID sozinho não comprova pedido/cliente. Solução server-to-server autenticada/assinada com CRM e revogação; não usar nome da pasta como prova.
5. Armazenamento privado EvydFlow: `StepState.save_output` grava JSON sem verificação de permissões; manter capability URLs apenas em storage com ACL de operador e nunca em logs/recibos públicos. Evitar `publicToken` como parte de logs.
6. Sintético E2E único: Node/Sharp -> upload -> status -> ACTIVE -> browser GET /data e thumb/card/game -> dois links funcionando -> fechar/browser. Falhas e replays não podem duplicar sessão nem enviar WhatsApp.
7. Operação: executar gates locais focados, backup SQLite com WAL consistente + storage e restore real, curl boundary checks, smoke Android/Safari. NÃO fazer deploy nem usar fotos reais enquanto `deploy/readiness.json` possuir flags false. Restringir canário real a uma sessão autorizada e somente após aprovação humana das flags.
8. Segurança adicional: auditar `credentials.json`, `config/.env`, `data/state`, arquivos historicamente rastreados por Git, sem copiar seu conteúdo para PR; rotacionar quaisquer segredos de fato expostos. Determinar se caches de derivados contêm dados sensíveis.
