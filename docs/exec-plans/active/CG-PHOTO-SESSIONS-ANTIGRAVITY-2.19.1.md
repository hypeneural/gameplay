# CG Photo Sessions — plano ativo para Antigravity / FluentGraft 2.19.1

**Estado:** ativo.  
**Data de consolidação:** 06/10/2026.  
**Baseline de partida:** `codex/puzzle-native-like-v1` em `53d301cfa1fc078e4538bb77a29478fb49376145`.

Este plano transforma a auditoria de photo sessions em uma sequência implementável para o Antigravity, mantendo o corte operacional real: EvydFlow no Windows 11 e produto/backend na VPS.

Leitura obrigatória antes de implementação:

- `docs/integrations/photo-sessions/AUDITORIA_FORENSE_ANTIGRAVITY_MOBILE_2026-10-06.md`;
- `docs/integrations/photo-sessions/GALERIA_NATALINA_MULTI_GALERIAS.md`;
- `docs/quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md`;
- `.agents/skills/christmas-gallery-album/SKILL.md`.

Proveniência cross-repo no corte de 06/10/2026: o branch `antigravity/soclick-mvp-validation` do EvydFlow está 44 commits à frente de `main`. Registrar o ref exato do EvydFlow em cada handoff; não assumir equivalência entre branches.

## 1. Decisão arquitetural

Não criar outra plataforma para a galeria e não reescrever o EvydFlow.

```text
WINDOWS 11 / ESTÚDIO
EvydFlow Python/YAML
  -> identifica pedido completo + UUID CRM
  -> congela seleção/snapshot privado
  -> executa worker Node/Sharp versionado
  -> verifica thumb/card/game (+ gallery somente se benchmark aprovar)
  -> envia somente derivados via HTTPS
                         |
                         v
VPS / GAMEPLAY MONOREPO
Nginx
  -> apps/catalog-server
       -> SQLite local
       -> sessões/revisões/access grants
       -> ingest/verify/activate
       -> autorização de mídia
  -> storage privado de derivados
                         |
                         v
apps/play
  /s/:token             Hub
  /s/:token/fotos       Galeria
  /s/:token/game/:id    Jogos
```

A mesma `photoSessionId + activeRevisionId` alimenta Hub, galeria e jogos. No MVP, `photoSessionId` também é a identidade canônica de uma galeria pública; `galleryKey` diferencia galerias ligadas ao mesmo pedido/CRM.

## 2. Fronteiras obrigatórias

| Boundary                    | Dono                   | Regra                                                   |
| --------------------------- | ---------------------- | ------------------------------------------------------- |
| Intake/CRM/fila operacional | EvydFlow               | Continua Python/YAML no Windows.                        |
| Derivação de imagem         | `tools/media-pipeline` | Mesmo pacote Node/Sharp, executado localmente no MVP.   |
| Sessão/revisão pública      | backend gameplay       | Única autoridade; não duplicar em EvydFlow ou frontend. |
| Galeria/Hub/jogos           | `apps/play`            | Uma Session e uma seleção compartilhada.                |
| Entrega de bytes privados   | backend + Nginx        | Autorizar primeiro; arquivo fora da webroot.            |
| Galeria legada              | referência             | Reaproveitar UX, não API, auth ou stack completa.       |

## 3. Modelo de identidade

Nunca reutilizar um ID para papéis diferentes.

```text
crmOrderNumber   string completa; referência humana
crmOrderUuid     identidade do CRM
galleryKey       chave estável da galeria no contexto do pedido
photoSessionId   UUID estável da experiência/galeria
revisionId       UUID de coleção imutável
photoId          ID opaco estável da fotografia
accessToken      capability aleatória de entrada
browserGrant     sessão de browser/cookie autorizada
```

Constraints iniciais recomendadas:

- `photo_sessions (crm_order_uuid, gallery_key)` unique quando `crm_order_uuid` estiver presente; não tornar `crm_order_uuid` único isoladamente;
- idempotency key única por criação/revisão/ativação;
- `photos (session_id, photo_id)` unique;
- `media_assets (revision_id, photo_id, variant)` unique;
- `active_revision_id` só aceita revisão VALIDATED pertencente à sessão.

Número completo do pedido nunca vira token público. Uma mesma ordem pode ter múltiplas galerias, cada uma com `galleryKey`, `photoSessionId`, revisão ativa e token próprios.

## 4. Revisões e concorrência

Estados mínimos:

```text
STAGED -> VALIDATED -> ACTIVE
   \-> FAILED
```

Uma revisão é imutável depois de VALIDATED.

Ativação MVP:

```sql
UPDATE photo_sessions
SET active_revision_id = :new
WHERE id = :session
  AND active_revision_id IS :expected;
```

A operação só conclui se exatamente uma linha for alterada. O evento `PHOTO_SESSION_ACTIVE`, quando introduzido, entra na mesma transação.

Com uma VPS e um processo de backend, não introduzir lock distribuído/fencing antes de necessidade medida. Se múltiplos workers/hosts passarem a publicar simultaneamente, adicionar lease/fencing como evolução sem mudar o contrato público.

## 5. Worker de mídia no Windows

O caminho canônico do MVP é `prepared-derivatives`.

Fonte: arquivos tratados diretamente na raiz selecionada. Não usar BAIXA/QC como input.

Receita inicial:

| Variante | Lado maior máximo | Formato | Qualidade | Uso                   |
| -------- | ----------------: | ------- | --------: | --------------------- |
| thumb    |               480 | WebP    |        82 | tiles pequenos/picker |
| card     |               800 | WebP    |        82 | grid grande/memória   |
| game     |              1600 | WebP    |        82 | lightbox/hero/jogos   |

Todas preservam proporção com auto-orient, sRGB, `fit: inside` e sem upscale.

Antes de congelar o contrato da Galeria Natalina, executar benchmark de `card=800` × candidato `gallery=1200` × `game=1600`, com retratos e paisagens. `gallery=1200` só entra na receita se a medição demonstrar ganho visual/bytes aceitável.

### Requisitos antes de integrar ao EvydFlow

1. `photoId` deixa de ser posicional.
2. namespace/cache inclui `sourceHash + recipeKey`.
3. snapshot copiado para staging é re-hasheado; hash precisa coincidir com a leitura anterior.
4. manifesto registra dimensões reais de cada derivado.
5. CLI produz stdout JSON estável e erro tipado; logs humanos vão para stderr.
6. CLI/build registra versão do worker, Sharp/libvips e recipeKey.
7. coleção só recebe receipt "ready" quando `expected == ready` e `failed == 0`.

O EvydFlow deve invocar Node via subprocess com argumentos estruturados/`shell=False`, não concatenar comando shell.

## 6. Contrato de ingestão HTTPS

Primeiro corte:

```text
POST /internal/v1/photo-sessions
POST /internal/v1/photo-sessions/:id/revisions
PUT  /internal/v1/revisions/:id/media/:photoId/:variant
POST /internal/v1/revisions/:id/verify
POST /internal/v1/revisions/:id/activate
GET  /internal/v1/photo-sessions/:id/status
```

Toda mutação importante aceita idempotency key. Upload confere tamanho, hash, photoId, variant e recipeKey contra o manifesto congelado.

`verify` compara o conjunto remoto exato, não apenas contagem.

`activate` exige:

- revisão VALIDATED;
- zero arquivo ausente/extra;
- `expectedActiveRevisionId`;
- session ownership;
- idempotency key.

Não ativar automaticamente pelo simples término do último PUT.

## 7. Persistência inicial na VPS

SQLite/WAL em disco local é adequado para o piloto de um host. Não compartilhar o arquivo por SMB, Drive ou filesystem de rede.

Tabelas mínimas:

```text
photo_sessions
photo_revisions
photos
media_assets
access_grants
browser_access_sessions
idempotency_records
audit_events
domain_outbox_events   # pode entrar junto da automação de entrega
```

Backups precisam incluir banco + storage privado da revisão ativa e ser restauráveis em ambiente de teste.

## 8. Acesso público, multi-clientes e multi-galerias

Entrada:

```text
GET /s/<accessToken>
  -> valida capability
  -> resolve photoSessionId
  -> cria/atualiza grant de browser
  -> entrega shell
```

O token não deve aparecer em logs/analytics. Responder com `Referrer-Policy: no-referrer`.

Preferir cookie host-only:
`Secure; HttpOnly; SameSite=Lax; Path=/`.

Uma aba não pode trocar silenciosamente o contexto de outra. Requests de sessão devem ser explicitamente escopados pelo objeto solicitado; o backend verifica que o grant daquele browser cobre a sessão.

Casos obrigatórios A/A2/B:

- A e A2 podem compartilhar o mesmo `crmOrderUuid` com `galleryKey` diferente;
- A lê A;
- A não lê A2 nem B;
- photoId B com grant A é negado;
- token revogado para de abrir novas respostas;
- token inválido/expirado nunca cai em fixture;
- estado React de A é limpo ao navegar para B;
- revisão de A não altera A2 ou B;
- duas abas com galerias distintas não disputam um contexto global.

## 9. Entrega de mídia

Rota conceitual:

```text
GET /media/p/:photoId/:variant
  -> browser grant
  -> sessão
  -> activeRevision
  -> photo ownership
  -> variant allowlist
  -> X-Accel-Redirect
  -> Nginx internal
```

Originais nunca são servidos.

Path físico, hash de fonte e nome original não entram no DTO público.

Cache inicial: privado/conservador. Não introduzir service worker para mídia privada no MVP.

## 10. Galeria native-like mobile-first

Rota: `/s/:token/fotos`.

A galeria é parte de `apps/play`, não outro app. Ela compartilha Session, `selectedPhotoId`, autorização e navegação com Hub/jogos.

### Stack recomendada para o primeiro corte

Validada para a stack React 19 do repositório em 06/10/2026:

- `react-photo-album@3.6.1`: importar somente `MasonryPhotoAlbum`/CSS necessário.
- `yet-another-react-lightbox@3.32.2`: lazy import; core + Zoom somente.

Não portar Tailwind/shadcn/React Router/TanStack Query da galeria antiga.

No primeiro corte, usar React Photo Album somente para layout/`srcset` e manter o batch loader no app. Não adotar `react-photo-album/scroll` com os root margins default sem medição; o smoke da galeria legada já mostrou over-fetch no mobile.

Não usar CSS Masonry experimental como única implementação de produção.

Não virtualizar o grid no MVP. Reavaliar somente com perfis reais de sessões grandes.

### Comportamento

- abaixo de 600 CSS px: álbum de uma coluna, uma foto abaixo da outra, proporção natural e sem crop;
- 600–899 CSS px: duas colunas;
- 900+ CSS px: duas ou três colunas conforme container;
- 6–8 fotos no primeiro lote mobile;
- progressão em lotes limitados com fallback "Ver mais";
- sentinel não pode provocar carregamento de toda coleção no primeiro layout;
- feed usa `card` e, se aprovado por benchmark, `gallery`, sempre por `srcset/sizes`.
- cada descritor `w` usa largura real do arquivo, não o nome 480/800/1600.
- lightbox usa `card + game` no contrato de três variantes; se `gallery=1200` for aprovado, usa `gallery + game`, com no máximo vizinhas necessárias.
- hero/lightbox sempre `contain`.
- `cover` só quando crop seguro for comprovado.
- preserve scroll e foto escolhida em Hub -> fotos -> jogo -> fotos.
- browser Back/Forward é comportamento principal, não fallback.
- nenhum request de Phaser/chunk de jogo/canvas em `/fotos`.
- reduced motion remove decoração repetitiva.
- decoração natalina não compete com a fotografia;
- assets compartilhados da galeria pertencem a `christmas-shell/gallery`, com manifesto/proveniência, e não a um jogo específico.

### Budgets de entrada

Metas de engenharia, a validar em aparelhos:

| Budget                             | Gate                                      |
| ---------------------------------- | ----------------------------------------- |
| Phaser requests em `/fotos`        | 0                                         |
| canvas em `/fotos`                 | 0                                         |
| `game.webp` no grid inicial        | 0                                         |
| fotos montadas inicialmente mobile | 6–8                                       |
| overflow horizontal em 390/412/430 | 0                                         |
| CLS p75                            | <= 0,1                                    |
| LCP p75                            | <= 2,5 s                                  |
| INP p75                            | <= 200 ms                                 |
| preload de lightbox                | corrente + no máximo vizinhas necessárias |

Os budgets de Web Vitals são metas de campo; Lighthouse isolado não os homologa.

## 11. React session provider

Remover fallback de fixture em produção.

Estados:
`loading | ready | unavailable | expired | revoked | empty | retryable-error`.

Ao trocar token/sessão:

- abortar requests antigos;
- descartar resposta tardia que não corresponde a session/revision esperadas;
- limpar seleção/lightbox de outro cliente;
- preservar seleção/scroll somente dentro da mesma sessão.

`Photo.variants` deve carregar metadados reais por variante. Não expor DTO integral do banco.

## 12. Integração EvydFlow

No repositório Python, criar `IGameplayProvider`, não reutilizar `IFtpProvider`.

Contrato mínimo:

```text
resolve_or_create_session(crmOrderUuid, galleryKey, ...)
begin_revision(...)
upload_derivative(...)
verify_revision(...)
activate_revision(...)
get_revision_status(...)
```

Depois do piloto:
`read_domain_events/acknowledge_domain_event` para entrega automatizada.

Novo flow deve ser independente de BAIXA/QC/FTP e, inicialmente, não enviar WhatsApp automaticamente.

Piloto:

- operador informa/confirma UUID CRM;
- EvydFlow publica revisão;
- operador confere ACTIVE + destinatário;
- link é enviado manualmente.

Isso mantém privacidade/atomicidade no caminho crítico e adia somente side effects de comunicação.

## 13. Gate de contenção antes do piloto

O novo flow não pode herdar as práticas operacionais legadas do EvydFlow. Antes de link real de cliente, tratar credenciais/runtime/logs rastreados, logging de payload, compartilhamento público gravável e FTP legado. Rotacionar/revogar credenciais potencialmente expostas antes de qualquer limpeza destrutiva de histórico. O photo-session flow não move as fontes para `TRATADAS` e não repete side effect após timeout sem reconciliação de `UNKNOWN_OUTCOME`.

## 14. Sequência de PRs

### PR 1 — contratos + documentação

IDs, `galleryKey`, schemas e recipeKey. Substituir `crm_order_uuid UNIQUE` por `(crm_order_uuid, gallery_key)` e alinhar documentação global. Sem alterar fluxo legado.

### PR 2 — worker Windows + benchmark da galeria

Stable photoId, recipeKey, rehash snapshot, dimensões por variante, stdout JSON e testes. Rodar benchmark 800 × 1200 × 1600 e decidir se a variante `gallery` entra no contrato.

### PR 3 — backend session/revision

SQLite, repositories, constraints e CAS de activeRevision.

### PR 4 — ingest/verify/activate

Rotas internas, service auth, idempotência e testes de lote parcial.

### PR 5 — public access/media

Token bootstrap, browser grant, media authorization, Nginx internal e isolamento A/A2/B.

### PR 6 — React SessionProvider

Hidratação real, estados de acesso, abort/cleanup; produção sem fixture.

### PR 7 — GalleryRoute / Galeria Natalina

Álbum de uma coluna no mobile, responsive variants, batches próprios, lazy lightbox, `christmas-shell/gallery` e navigation state. Zero Phaser gate.

### PR 8 — Puzzle vertical slice

Galeria -> selecionar -> Puzzle -> sair -> mesma foto/scroll.

### PR 9 — EvydFlow provider

CLI local + upload HTTPS + verify + activate + recovery.

### PR 10 — piloto físico

Android + Safari/iPhone, restore/rollback e entrega manual.

Somente depois: outbox/WhatsApp, mais jogos, cache avançado, AVIF, virtualização ou multi-host.

## 15. Gates de aceite

Cada PR:

```bash
pnpm check:fast
```

Antes de merge do corte:

```bash
pnpm check
pnpm build
pnpm test:e2e
```

Testes adicionais obrigatórios:

- colisão de pedidos com mesmos quatro últimos dígitos;
- session/gallery A/A2/B cross-access;
- upload interrompido;
- arquivo extra/faltante/hash errado;
- replay de idempotency key;
- CAS com revisão ativa divergente;
- token inválido/expirado/revogado;
- duas abas/sessões;
- `/fotos` sem Phaser;
- retrato/paisagem em 390/412/430/768;
- entrar/sair do Puzzle três vezes;
- backup/restore de banco + media;
- rollback para revisão ativa anterior sem reapontar bytes incompletos.

## 16. Itens deliberadamente adiados

Não bloquear o piloto com:

- Postgres;
- fila distribuída;
- microservices;
- service worker/PWA;
- AVIF;
- quarta variante sem benchmark;
- virtualização do grid;
- todos os 11 jogos;
- migração automática de URLs numéricas;
- envio automático de WhatsApp.

Não adiar:

- isolamento multi-cliente e multi-galerias;
- autorização por mídia;
- recipeKey;
- IDs estáveis;
- revisão atômica;
- revogação;
- zero-failure gate;
- preservação dos originais;
- logs sem secrets/PII.

## 17. Regra de handoff para Antigravity

Não declarar uma fase concluída só porque o código compila. Para cada corte, registrar:

1. arquivo/contrato alterado;
2. invariável que passou a ser garantida;
3. testes executados;
4. evidência que falta;
5. impacto no contrato EvydFlow;
6. rollback/recovery aplicável.

A documentação em `docs/integrations/photo-sessions/` é referência forense e de produto. Este arquivo é a ordem operacional ativa para implementação.
