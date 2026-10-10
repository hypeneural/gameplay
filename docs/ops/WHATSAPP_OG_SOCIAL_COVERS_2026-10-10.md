# Auditoria e handoff — Open Graph / WhatsApp / capas natalinas (2026-10-10)

## Evidência e estado de implementação

- Repositório `hypeneural/gameplay`; esta branch parte de `feat/public-demo-root-and-e2e-handoff-20261009` (PR #20), que parte de PR #19, depois #18 → #16 → #15. **Não assumir que `main` contém essas alterações**: o default GitHub observado anteriormente era `codex/puzzle-native-like-v1`.
- Já existia geração de HTML OG server-side em `apps/catalog-server/src/socialPreview.ts` e `CatalogServer.ts`; `filePreviewRepository.ts` usa JSON privado separado do SQLite. Nginx já possui `/_catalog_social` genérico e `/_customer_social` via location internal.
- Nesta branch: metadata OG da home `/`, `/demo/fotos` e `/demo/game/:id` gerado antes do React; `og:image:secure_url`, `twitter:card`; título orientado à rota e imagem versionada de sessão; suporte JPEG e teste de revogação da sessão no SQLite; `tools/media-pipeline/src/socialCover.ts` é um gerador **offline privativo** 1200×630, consentido. A configuração dinâmica da seleção de foto e do consentimento **ainda precisa ser ligada ao CRM/publicador**.
- A capa **pública V2 efetivamente versionada no GitHub** é `apps/catalog-server/public/social/evydencia-christmas-v2.webp`, WebP 1200×630 com **42.040 bytes**, SHA-256 `41cf05bbcbf6e017aa53d1d11f466b91423b6da59737c98607447c628ddff9da`. Foi renderizada de forma reproduzível a partir de `assets-src/catalog-social/evydencia-christmas-v2-template.svg` usando `tools/media-pipeline/src/renderPublicSocialArt.ts` e upload via blob GitHub. A imagem sintética fotográfica de ImageGen exportada como `evydencia-og-natal-v2.webp` (76.600 bytes) e JPEG (134.292 bytes) permanece como **alternativa de arte no pacote da conversa**, e **não deve ser confundida** com o WebP vetorial V2 já commitado. A constante OG agora aponta V2; a imagem OG padrão é **JPEG** (68.806 bytes; SHA-256 `ee9bf1554975c48fd80291575258856e3571915b151c01ed44e10b0202748a5c`) para compatibilidade WhatsApp, enquanto o WebP V2 permanece como alternativa. Registros genéricos V1 continuam válidos na configuração privada para transição.
- Não há fotos reais de clientes neste patch; `deploy/readiness.json` mantém pilotReady/customerDataAllowed/automaticDeliveryAllowed=false. Nenhuma implantação/alteração de Caddy/live executada.

## Recomendação de formato

- **1200×630 (1,9048:1)**; `og:image:width=1200`, `og:image:height=630`, `og:type=website`, `og:locale=pt_BR`, `og:image:alt`, URL HTTPS absoluta. O protocolo OG não obriga 1200×630.
- Para evitar variação de comportamento do WhatsApp, preferir JPEG (`image/jpeg`) com bytes bem abaixo de 300KiB como orçamento interno; manter WebP suportado no fluxo legado somente após smoke com WhatsApp Android e iOS.
- O servidor deve responder HTML com meta tags à primeira requisição HTTP do crawler; tags adicionadas apenas no React não são confiáveis.
- Imagem genérica da home é **pública**; foto personalizada do cliente é **derivada restrita** e não deve ter acesso direto pela webroot nem caminho ao original.
- O token na URL é uma **capacidade de acesso**: quem receber a URL pode abrir a galeria. O consentimento para incluir um retrato na prévia é separado do compartilhamento da URL.

## Roteamento e geração esperados

| Compartilhamento   | Canonical OG             | Og:image                                              |
| ------------------ | ------------------------ | ----------------------------------------------------- |
| Home pública       | `/`                      | `/social/evydencia-christmas-v2.jpg` (JPEG no GitHub) |
| Galeria demo       | `/demo/fotos`            | mesma arte pública                                    |
| Jogo demo          | `/demo/game/:id`         | mesma arte pública                                    |
| Hub do cliente     | `/s/:token`              | `/s/:token/social-preview?v=:revision`                |
| Galeria do cliente | `/s/:token/fotos`        | mesma imagem autorizada, título de álbum              |
| Jogo do cliente    | `/s/:token/game/:gameId` | mesma imagem autorizada, título de jogos              |

**Uma capa por sessão/revisão**, não uma geração por crawler nem por jogo. Mudou a fotografia ou consentimento? Criar nova revisão opaca; invalidar/retirar o asset anterior, mantendo o aviso de que caches das plataformas externas podem persistir.

## Contrato de publicação faltante (P0)

1. `EvydFlow` prepara as três variantes WebP privada + manifesto, consulta `orders.detail` autenticado e confirma pedido elegível (não só UUID). `gameplay` verifica autoridade de sessão server-to-server/CRM antes de `resolve` e `activate`.
2. CRM guarda **consentimento afirmativo verificável para prévia social** (não inferir de ensaio contratado) e id da foto escolhida (uma foto autorizada, sem nome/pedido/telefone na capa).
3. Operador escolhe foto ou segue regra determinística segura e revisável. Não escolher aleatoriamente no bot nem usar reconhecimento facial sem escopo/consentimento.
4. `generatePrivateSocialCover`: usar derivado autorizado/local com saída para storage privado, `socialPreviewConsent='granted'`, `derivativeKey` aleatório por sessão/revisão; gerar JPEG 1200×630, `exif` ausente e tamanho <=300 KiB. Respeitar enquadramento com `contain` para não cortar cabeças.
5. Ativação CAS da galeria fica separada da ativação da prévia; não habilitar `customer-photo` antes de gerar+validar JPEG e registrar consentimento. Se preview falhar, manter preview **genérica** e registrar status `generic-fallback` em log seguro.
6. Persistir `session_id,revision_id,preview_version,derivative_key,consent_status` em autoridade de preview integrada ao SQLite/CRM. **Não persistir tokens, URLs de capacidade ou dados privados no log comum**.
7. A consulta de prévia usa `SocialPreviewRepository` e consulta adicional `SqliteSessionRepository.getActiveSession(token)`. O backend já exige o segundo gate para `customer-photo` nesta branch, mas **o arquivo de configuração privado ainda não é automaticamente gerado/atualizado** pelo publicador.
8. Se consentimento revogar ou token revogar: 404 para prévia privada; fallback genérico quando sessão válida mas consentimento não granted. Bloquear fonte de imagem da foto e fazer expiração/invalidação do lado controlado. Não prometer apagar caches do WhatsApp já distribuídos.

## Nginx, Caddy e HTTPS

- `/social/evydencia-christmas-v2.jpg`: nova imagem OG pública prioritária; `/social/evydencia-christmas-v2.webp` também disponível. A rota pública V1 e a interna `/_catalog_social/evydencia-christmas-v1.webp` permanecem para configurações/cache antigos; **ambas são empacotadas no release**. Os arquivos de cliente continuam apenas em `/_customer_social` com `internal`.
- `/_customer_social/:opaqueKey.jpg` ou `.webp`: Nginx `internal` + `X-Accel-Redirect`, deve existir storage consistente e apenas derivado social aprovado; não permitir URL pública direta.
- Garantir que Caddy público não reescreva ou perca querystring `?v=...` e não registre tokens em access logs. Responder `Content-Type` exato e tamanho físico 1200×630; testar `GET`, `HEAD` e redirects.
- Bots sem cookie/login não conseguem renderizar imagem que exija sessão web autenticada. Isso é intencional: o token de acesso+consentimento controlam a prévia, e plataformas sociais podem guardar os bytes externamente.

## Testes rápidos e critérios

```powershell
pnpm agent:doctor
pnpm vitest run apps/catalog-server/src/CatalogServer.test.ts apps/catalog-server/src/filePreviewRepository.test.ts tools/media-pipeline/src/socialCover.test.ts tools/deploy/public-demo-root.test.mjs
pnpm check:fast
pnpm repo:map
pnpm check
pnpm release:staging
pnpm release:verify
```

**Smoke real após autorização do deploy:**

- `curl -sS https://jogos.fotosdenatal.com/` contém OG server-side + URL da arte genérica.
- Abrir asset absoluto pelo GET anônimo, verificar `200`, `Content-Type`, bytes e dimensões. Requisição a `/internal/v1/*` pública deve falhar.
- Criar sessão sintética autorizada na VPS e confirmar OG em hub, galeria e jogo; testar preview `/s/:token/social-preview` e `?v=...` com 200; revogar e confirmar 404. Nunca publicar cliente real em staging.
- Validar link no WhatsApp de Android e iOS físicos e com ferramenta Meta Sharing Debugger se disponível; resultados e screenshots com token oculto.
- Capa V2 versionada é arte demonstrativa, sem fotografia real de cliente. O material fotográfico alternativo gerado por IA também não é uma foto de cliente; consentimento específico continua necessário para imagens reais.

## V2 no repositório e critérios de deploy

1. **Já concluído na branch:** o binário `apps/catalog-server/public/social/evydencia-christmas-v2.webp` foi gerado via Sharp e incluído no Git; `genericPreviewVersion` agora aponta V2, e V1 permanece aceito para evitar que o JSON privado existente cause falha de inicialização.
2. **Release:** `pnpm release:staging` empacota V1 WebP + V2 WebP/JPEG; `pnpm release:verify` exige os três binários. Nginx Docker e o template alternativo incluem rotas públicas e internas exatas para as duas versões.
3. **Pendente:** executar CI completo com arte incluída, smoke de Nginx/Caddy e compartilhamento real em WhatsApp Android/iOS. Nada disso foi implantado na VPS durante a auditoria.
4. **Opcional:** substituir o aspecto da V2 pela arte fotográfica ImageGen incluída no pacote da conversa, após conferência de hash/tamanho, autorização de uso promocional, revisão visual e **nova revisão de asset** (não sobrescrever silenciosamente a URL já cacheada).
5. **Nunca** alterar `pilotReady` ou `customerDataAllowed` para publicar apenas a demo OG genérica.
