# Plano de implementação - experiência fotográfica unificada

**Edição pública anonimizada - 05/10/2026.** O pedido `5000` e os nomes `foto-NN.jpg` são exemplos fictícios; não identificam o cliente da bancada. As medições agregadas permanecem reais. Fotografias, nomes, telefones, caminhos locais e hashes individuais de mídia foram omitidos. Artefatos privados mencionados na auditoria não acompanham esta edição; consultar `evidence/benchmark-summary.json` e `evidence/source-index.json` para os recibos públicos. A documentação registra fatos e propostas, não uma integração já implantada.

**EvydFlow + gameplay + galeria mobile | 05/10/2026 | Versão 1.0**

Este plano complementa a auditoria forense. É um roteiro de desenvolvimento e validação; os arquivos novos, rotas e interfaces abaixo são propostas, não funcionalidades já implementadas. O experimento com as fotos do pedido 5000 foi local e não publicou uma sessão de cliente.

## P01. Resultado de produto e decisões de arquitetura

A família recebe um link seguro. Esse link abre um Hub compacto com a foto escolhida e os jogos; a galeria completa é acessível no mesmo aplicativo. As fotografias do pedido são processadas uma vez e reutilizadas nas três experiências:

```text
Uma sessão fotográfica persistente
  /s/<token>                         Hub e foto escolhida
  /s/<token>/fotos                   Galeria mobile completa
  /s/<token>/game/<game-id>           Jogo com as fotos da mesma sessão
```

### Decisões que orientam todo o trabalho

| ADR    | Decisão inicial                                                        | Justificativa e limite                                                                             |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ADR-01 | Galeria dentro de `apps/play`, na gameplay.                            | Aproveita Photo, Session, PhotoPrint, tema e seleção existentes; uma API e um catálogo.            |
| ADR-02 | EvydFlow continua em Python/YAML.                                      | Reaproveita operação do estúdio e providers; não reescrever o orquestrador.                        |
| ADR-03 | Sharp gera os derivados no computador do estúdio no MVP.               | Bancada comprovou 314,66 MB para 6,62 MB; transferir só derivados reduz tráfego.                   |
| ADR-04 | API HTTPS de aplicação para ingestão e recibos.                        | Sessão/revisão/verificação não cabem no contrato de FTP legado.                                    |
| ADR-05 | Três variantes proporcionais, WebP 82.                                 | 480/800/1600 já medidas; não criar outra resolução sem necessidade de zoom comprovada.             |
| ADR-06 | Pedido completo + UUID CRM + UUID da sessão são identidades distintas. | Evita truncamento/colisão e não expõe o pedido como credencial pública.                            |
| ADR-07 | Fonte da raiz, nunca BAIXA/QC para o novo pipeline.                    | Preserva detalhe e elimina recompressão/bordas do legado.                                          |
| ADR-08 | Revisões imutáveis e ativação transacional.                            | Galeria e jogos nunca veem uma coleção recebida pela metade.                                       |
| ADR-09 | Outbox de evento no backend; entrega operacional no EvydFlow.          | EvydFlow já administra canais de comunicação; ativação gera evento durável, não mensagem imediata. |
| ADR-10 | Port seletivo da galeria React antiga.                                 | Aproveitar masonry/lightbox/zoom; adaptar mídia, autorização, tema e estado ao novo app.           |

Se for necessário gerar fotos na VPS posteriormente, criar modo separado `source-ingest` com quotas/receitas/recibos próprios. Ele não deve competir com `prepared-derivatives` pela mesma revisão. O worker é o mesmo pacote versionado, não uma segunda implementação de resize.

## P02. Fronteiras dos três repositórios

| Repositório                       | Responsabilidade a manter                                                   | Mudanças planejadas                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `hypeneural/gameplay`             | Contratos de Photo/Session, UI mobile, runtimes, pipeline Sharp e catálogo. | API de sessão/ingestão/autorização; galeria; revisão; melhorias de consumo de variantes.                    |
| EvydFlow em `<repo-evydflow>`     | Intake, pedido CRM, fila, retomada, providers e entrega do estúdio.         | Identity/ledger de experiência, adapter de mídia, `IGameplayProvider`, novo flow e outbox de entrega.       |
| `hypeneural/festive-gallery-show` | Referência visual e funcional da galeria React.                             | Extrair/adaptar componentes e padrões; manter legado durante migração. Não criar outra autoridade de mídia. |

Cada novo arquivo listado neste plano é um local sugerido. Ajustar nomes à estrutura definitiva sem misturar código de banco/autorização com pacotes de frontend. Não copiar os manifests/lockfiles e toda a árvore shadcn/Tailwind da galeria para o monorepo.

### Ordem das dependências

```text
M0 contratos e identidade
  -> M1 worker de mídia versionado
  -> M2 persistência e revisão do backend
  -> M3 ingestão/verificação/ativação HTTPS
  -> M4 acesso público autorizado e hidratação real
  -> M5 galeria na gameplay
  -> M6 provider e flow do EvydFlow
  -> M7 evento/outbox e entrega
  -> M8 otimização de jogos e QA
  -> M9 piloto e migração
```

Fixtures e testes de contrato podem ser desenvolvidos em paralelo com o backend. Publicação real depende das garantias de revisão/autorização; não começar por alterar o flow que já envia mensagens.

## P03. M0 - identidade e contrato comum

**Objetivo:** um número completo de pedido aponta para uma sessão estável, sem conflito com os identificadores de mídia/acesso.

Trabalho no EvydFlow:

- Criar parser de intake do sufixo ` - <dígitos>` que retorne `crm_order_number` completo como string.
- Criar `orders.validate_photo_session` ou equivalente: conferir pedido por UUID, tenant, número completo, titular e destinatário.
- Aproveitar `--order-uuid`, já aceito pelo `natal_uploader.py`, como entrada do MVP. O valor hoje apenas entra em `params`; o novo flow precisa realmente usá-lo e validá-lo.
- Encaminhar `OrderUuid`/`ExtraParams` no runner PowerShell e nos atalhos por array de argumentos, sem concatenação de shell.
- Automatizar número para UUID somente depois de confirmar o filtro real de `/orders/search`. O fake atual ignora o filtro e não prova essa busca.
- Persistir `photo_session_id` UUID e `session_key` de negócio. Uma nova execução do mesmo intake reutiliza a sessão.
- Não trocar o significado do extrator legado para todos os flows sem migração dos diretórios/links antigos; o novo fluxo não usa a regra dos quatro dígitos.

Trabalho compartilhado de contrato:

- Definir um schema versionado de ingestão e recibos, com fixtures para TypeScript/Zod e Python/Pydantic.
- Definir `PublicPhotoSessionDto` separado do manifesto privado de origem.
- Acrescentar revisão, capa e jogos habilitados à projeção pública.
- Manter `Photo.variants` como URLs para compatibilidade dos runtimes; adicionar metadados de variante com largura/altura/bytes quando necessários à galeria.
- Padronizar códigos de erro e estados, sem retornar paths, tokens ou dados completos do CRM nas mensagens de UI.

### Casos de aceite

`5000`, `105000` e `1004821` preservados; pasta inválida bloqueada; UUID explícito incompatível bloqueado; pedido ambíguo bloqueado; telefone da pasta diferente do destinatário CRM abre conferência; dois intakes do mesmo pedido não sobrescrevem sessões diferentes silenciosamente.

## P04. M1 - worker Node/Sharp e manifesto de conteúdo

**Responsável:** gameplay, em `tools/media-pipeline`, com adapter operacional no EvydFlow.

### Arquivos e capacidades planejados

| Local sugerido                          | Capacidade                                                            |
| --------------------------------------- | --------------------------------------------------------------------- |
| `tools/media-pipeline/src/contracts.ts` | Job JSON versionado, limites, seleção e recibo.                       |
| `src/recipes.ts`                        | Receitas explícitas e `recipeKey` canônica.                           |
| `src/intake.ts`                         | Snapshot congelado, SHA-256 e allowlist.                              |
| `src/batchCli.ts`                       | CLI de coleção com stdout JSON e progresso separado.                  |
| `src/index.ts`                          | Reaproveitar processamento existente, incluindo receita no namespace. |
| `tests/`                                | Conteúdo alterado, receita alterada, crash, falha parcial e replay.   |
| Release do worker                       | Executável/runtime fixos e distribuição reproduzível para o estúdio.  |

Selecionar só arquivos diretos na raiz. Normalizar extensão e validar conteúdo; não seguir symlink/junction que leve para fora da origem aprovada. Verificar estabilidade da exportação e impedir zero fotos. Não assumir que todas as sessões têm 30 ou 32 fotos.

Copiar para snapshot temporário; recalcular hash do snapshot e comparar com o original congelado; promover o snapshot só após conferência. O SHA-256 do pipeline é dos bytes do arquivo, não um hash de reconhecimento/pixels. Trocar metadados pode mudar o hash mesmo quando a aparência é semelhante.

IDs das fotos são persistentes, não uma numeração reconstruída da ordenação atual. Incluir uma foto antes da primeira não deve mudar o ID das outras. Hash igual pode permitir reaproveitar bytes dentro do escopo autorizado, sem fundir duas escolhas de curadoria ou misturar clientes.

### Receita inicial

```text
source snapshot verificado
  -> orientação EXIF normalizada
  -> sRGB, sem EXIF/XMP de origem
  -> inside, sem ampliar
  -> thumb: lado maior 480, WebP 82
  -> card:  lado maior 800, WebP 82
  -> game:  lado maior 1600, WebP 82
```

Propor namespace `derived/<session>/<photo>/<sourceHash>/<recipeKey>/<variant>`. O hash de receita inclui parâmetros, versão do worker/encoders e política de metadados. O cache atual usa conteúdo sem receita; essa lacuna deve ser corrigida antes de oferecer reprocessamento com nova qualidade.

A escrita do conjunto ocorre em staging no volume de destino. O manifesto é uma revisão completa, com seleção explícita; não fazer merge que conserve fotos removidas por engano. Leases/fencing ou escritor único protegido impedem dois processos de promover o mesmo namespace simultaneamente.

### Aceite e prova mínima

Usar o pedido 5000 como fixture privada: 30 fontes, 90 derivados, proporção preservada, nenhum EXIF/XMP, originais intactos. Replay da mesma receita não altera outputs; receita diferente cria namespace novo. Falha em qualquer variante bloqueia a coleção por default. A bancada existente mediu geração em 21,75 s e replay em 1,72 s; essas medições são referência, não limite universal de CI.

## P05. M2 - persistência, revisões e autoridade do backend

**Responsável:** gameplay. Proposta inicial: evoluir `apps/catalog-server` com módulos próprios de sessão/ingestão/mídia. O nome atual não deve obrigar a criar um segundo serviço de autenticação.

Locais sugeridos:

```text
apps/catalog-server/src/
  experience/contracts.ts
  experience/SessionService.ts
  experience/SessionRepositorySqlite.ts
  experience/RevisionRepository.ts
  access/AccessGrantService.ts
  access/ServiceAuthentication.ts
  media/AuthorizedMediaDelivery.ts
  ingest/PreparedMediaRoutes.ts
  ingest/RevisionActivation.ts
  events/DomainOutboxRepository.ts
```

Os nomes são planejamento. Banco, credenciais e filesystem permanecem no backend; `packages/platform` recebe apenas contratos públicos necessários aos consumidores, sem drivers SQL, secrets ou dependência de Node no navegador.

### Modelo de dados mínimo proposto

| Entidade                  | Dados e garantias essenciais                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `photo_sessions`          | UUID, tenant, UUID CRM, número completo, sessionKey, estado, activeRevision, validade.           |
| `revisions`               | UUID, sessão, fingerprint, receita, estado, contagem e recibo; unicidade por sessão/fingerprint. |
| `revision_photos`         | Ordem, capa, photoId estável e metadados normalizados aprovados.                                 |
| `media_files`             | Sessão/revisão/foto/variante, namespace privado, dimensões, MIME, bytes e hash.                  |
| `access_grants`           | Hash do token, vínculo com sessão, expiração, revogação e escopo.                                |
| `browser_access_sessions` | Cookie opaco e concessões autorizadas; não usar o número do pedido como sessão de navegador.     |
| `domain_outbox_events`    | Evento durável `PHOTO_SESSION_ACTIVE` criado com a ativação da revisão.                          |
| `audit_events`            | Ação, identidade operacional opaca, versão e resultado; sem token/telefone/path nos logs gerais. |

SQLite/WAL em disco local do host é uma opção inicial. Decidir o driver compatível com o runtime Node e testar contenção/backup. Não compartilhar o arquivo de banco entre Windows/VPS via Drive, SMB ou sync de pastas. Um contrato HTTPS sincroniza recibos e eventos; não duplica a autoridade de sessão.

### Transação de ativação

Exigir revisão VALIDATED, conjunto exato de variantes recebidas, recibo de hashes, lease/fencing válido e `expectedActiveRevisionId`. Atualizar o ponteiro ativo e inserir o evento de domínio na mesma transação. Um cliente/worker atrasado recebe conflito, sem sobrescrever a revisão mais recente.

Access token é aleatório independente do pedido. Armazenar hash para verificação; caso a entrega precise reenviar a mesma URL, proteger o payload de entrega com armazenamento cifrado/keystore do serviço. Hash irreversível, sozinho, não permite reconstruir o token original. Nunca guardar a URL com token em logs ou manifesto público permanente.

## P06. M3 - contrato HTTPS `prepared-derivatives`

**Responsável:** backend gameplay e provider EvydFlow. As rotas abaixo são propostas, com prefixo/versionamento ajustável na implementação.

| Operação proposta                                        | Entrada / resultado esperado                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POST /internal/v1/photo-sessions`                       | Referência CRM/sessão e chave idempotente; retorna sessão existente ou nova. |
| `POST /internal/v1/photo-sessions/:id/revisions`         | Manifesto congelado, recipeKey, seleção e descrição dos 90 arquivos.         |
| `PUT /internal/v1/revisions/:id/media/:photoId/:variant` | Stream, tamanho e hash; aceita somente variante/receita permitida.           |
| `POST /internal/v1/revisions/:id/verify`                 | Confere inventário remoto exato e produz recibo.                             |
| `POST /internal/v1/revisions/:id/activate`               | Condição sobre revisão ativa anterior + chave idempotente.                   |
| `GET /internal/v1/photo-sessions/:id/status`             | Estado da revisão/fingerprint, contagens e causa de bloqueio.                |
| `GET /internal/v1/events` e ACK                          | Consumo durável de eventos pelo EvydFlow, com cursor/ID único.               |

### Recibo proposto para a coleção 5000

```json
{
  "schemaVersion": 1,
  "sessionId": "uuid-da-sessao",
  "revisionId": "uuid-da-revisao",
  "status": "VALIDATED",
  "manifestFingerprint": "sha256-do-manifesto",
  "recipeKey": "sha256-da-receita",
  "photos": { "expected": 30, "ready": 30, "failed": 0 },
  "files": { "expected": 90, "verified": 90, "failed": 0 },
  "derivedBytes": 6616226,
  "hashesVerified": true
}
```

`VALIDATED` não é `ACTIVE`; `ACTIVE` não é `DELIVERED`. O operador e o provider precisam distinguir os três estados.

Autenticação de serviço, HTTPS, escopo por tenant e limites de corpo/arquivos são obrigatórios. O backend não recebe paths Windows para abri-los, não busca URLs arbitrárias do produtor e não serve originais. Ele valida os bytes derivados recebidos; o hash original é proveniência do produtor, porque o original não foi transferido no MVP.

O prefixo `/internal` não é um controle de acesso. Proteger o ingresso e a credencial de serviço de fato; se houver rede privada/VPN ou allowlist, configurar e testar também essa camada. Não expor a API genérica `/jobs` do EvydFlow como substituto da ingestão, nem permitir que um cliente remoto escolha flow YAML ou pasta do Windows.

Por replay, mesma chave e mesmo payload retornam o recibo anterior; mesma chave com payload diferente retorna conflito. Upload de variante já verificada com hash diferente é conflito, não sobrescrita. Só contar foto READY quando todas as suas variantes existirem e passarem validação. Validar arquivo WebP, limites, dimensões, proporção, metadados e hash, mesmo quando a origem é um serviço confiável.

Arquivos pequenos podem ser transferidos individualmente com conexão reutilizada e concorrência limitada. ZIP de ingestão não é necessário no MVP; se adicionado depois, precisa de validação de conteúdo, limites e proteção contra path traversal/expansão excessiva.

### Critério de saída

Um teste com fake e um teste de integração local devem provar lote incompleto invisível, checksum divergente bloqueado, replay sem duplicação, timeout de transferência retomável e ativação condicionada à revisão anterior. Nenhum callback de WhatsApp é disparado pela rota de upload.

## P07. M4 - acesso da família e sessão real no React

**Responsável:** gameplay.

Criar `HttpSessionRepository` e um `SessionExperienceProvider` acima de Hub, galeria e jogos. A borda resolve o token, verifica acesso e carrega a projeção autorizada. Em produção, token inválido/expirado/revogado deve mostrar uma tela apropriada, nunca fixtures.

Locais sugeridos:

```text
apps/play/src/app/SessionExperienceProvider.tsx
apps/play/src/app/HttpSessionRepository.ts
apps/play/src/app/SessionResponseSchema.ts
apps/play/src/app/AppNavigation.ts
apps/play/src/app/AppRouter.tsx
apps/catalog-server/src/access/PublicSessionRoutes.ts
apps/catalog-server/src/media/AuthorizedMediaRoutes.ts
```

### API pública e escopo entre abas

Uma troca de token por acesso retorna `sessionId` autorizado. Preferir a consulta explicitamente escopada, como `GET /api/v1/photo-sessions/:sessionId`, em vez de depender de um "current" global ambíguo. Toda resposta é conferida contra o sessionId/revisionId esperado pelo provider.

Se o browser puder abrir duas sessões em abas distintas, o cookie/registro de navegador precisa representar concessões autorizadas e cada request deve indicar/validar o objeto solicitado. Uma nova aba não pode fazer a aba anterior mostrar a sessão errada. A política de uma única sessão por navegador também é possível, desde que resulte em bloqueio claro, não troca silenciosa de fotos.

`Photo.variants` recebe URLs relativas autorizadas. O DTO deve informar dados aprovados, não fields integrais do CRM. Para compatibilidade temporária com `Session.publicToken`, a borda pode associar o token de entrada já presente na rota após resolver a sessão; não usar `5000` no lugar dele nem incluir tokens em telemetria.

### Estados e navegação

Loading, ready, unavailable, expired, revoked, empty e retryable-error. AbortController e identificador de requisição descartam respostas tardias de outro token. Ao trocar de cliente, limpar seleção, lightbox e recursos do cliente anterior. Dentro da mesma sessão, preservar foto escolhida e scroll ao alternar Hub/galeria/jogo.

Uma rodada fixa a revisão usada no início. Atualizações do catálogo não remapeiam pares/cartas enquanto um jogo está em andamento. O mecanismo existente de saída do Phaser continua responsável por desmontar a instância antes de mudar de tela; não remountar o canvas por uma atualização de mute, seleção de UI ou request tardio.

### Media gateway

Autorizar cookie/concessão, sessão, photoId, revisão e variante em cada request. Servir por streaming do backend no MVP ou por proxy interno configurado e testado. `X-Accel-Redirect` depende do Nginx ou de interceptação explícita no proxy; não é uma autorização automática do Caddy.

Recusar path traversal, MIME/extensão falsa, acesso entre clientes e variantes fora do contrato. Proteger originais fora da webroot. HTML, manifestos e fotos privadas não entram em cache compartilhado ou service worker indiscriminado. Compartilhamento social usa arte genérica por default; crawler não deve consumir o token de acesso de forma definitiva.

## P08. M5 - galeria mobile dentro da gameplay

**Responsável:** `apps/play`. Referências principais: `festive-gallery-show/src/components/PhotoGallery.tsx`, `GalleryHeader.tsx`, `SessionPhotoAlbum.tsx` e `PhotoPrint.tsx` da gameplay.

### Arquivos/componentes planejados

| Local sugerido                        | Responsabilidade                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `screens/SessionGallery.tsx`          | Coleção completa, grid, paginação de UI e estado de retorno.                 |
| `components/SessionLightbox.tsx`      | Foto completa, gestos, navegação, zoom e foco.                               |
| `components/GalleryPhotoTile.tsx`     | Espaço proporcional reservado e variante do grid.                            |
| `components/PhotoPrint.tsx`           | Acrescentar fit explícito e metadados responsivos, mantendo compatibilidade. |
| `app/AppNavigation.ts`                | GalleryRoute e URL `/s/:token/fotos`.                                        |
| `app/AppRouter.tsx`                   | Rota ligada ao provider comum, sem outra origem de fotos.                    |
| `gallery.css` ou módulos equivalentes | Estilo com escopo e tokens do shell, sem override global de todos os jogos.  |
| `CatalogServer`/parser de rotas       | HTML/social/reload para /fotos, além de Hub e jogos.                         |

O texto colado recomenda reaproveitar os conceitos da galeria antiga. O port adaptará esses componentes/padrões ao contrato comum da sessão. As libs instaladas declaram React 19, mas devem passar typecheck, arquitetura, bundle e testes no ambiente React 19/TypeScript do monorepo. Importar lightbox/zoom sob demanda e não carregar Phaser na rota de fotos.

### Contrato visual

Foto hero e lightbox: `contain`, sem deformação. Grid proporcional pode usar `thumb` ou `card` conforme largura e densidade. Miniatura `cover` só quando houver enquadramento confiável; um único focalPoint não comprova proteção de todas as pessoas. Se a caixa segura não couber no crop calculado, usar contain.

Usar classes/atributo de fit explícito, por exemplo `data-photo-fit="contain"`; eliminar dependência acidental de precedência entre `.photo-card img` genérica e regras locais. Ponto focal e faceSafeZone se referem à imagem orientada, não à câmera antes da rotação EXIF. Não executar reconhecimento biométrico para escolher a capa.

**Detalhe importante de srcset:** 480/800/1600 são limites do lado maior. Em foto vertical, a largura real pode ser 343/571/1143. Não escrever `480w/800w/1600w` simplesmente usando o nome da variante. Os descritores devem usar as dimensões reais do derivado; `sizes` deve representar o espaço CSS do grid. Esse dado precisa constar no manifesto de variantes.

### Carregamento progressivo

Começar com lote pequeno (referência antiga: 12 mobile/18 desktop) e incremento limitado, com IntersectionObserver e botão "Ver mais" como fallback acessível. Reservar aspecto antes do decode para não empurrar o sentinel e disparar todo o acervo. Definir e testar máximo de antecipação de fotos e preloads do lightbox.

Grid pequeno: thumb/card. Se uma fotografia ocupar grande parte da tela, a densidade e largura real podem justificar game também nessa visualização, carregada somente quando visível. Lightbox: game selecionada e poucos vizinhos. Não baixar game para todas as fotos só porque os slides foram criados. No teste de referência, a galeria tinha variáveis de lote, mas já havia renderizado 28/30 fotos no momento observado; o novo orçamento precisa ser demonstrado por requests/visibilidade e não só por código de slice.

Reaproveitamento entre galeria e jogos pode usar um resolver limitado de recursos em memória, sempre com chave de sessão/revisão/foto/variante. Se usar blobs/Object URLs, definir dono, limite e liberação ao sair/trocar de sessão. Isso é diferente de cache persistente de fotos privadas; não prometer reutilização de rede somente porque duas tags usam a mesma URL com `no-store`.

### Interação

Anterior/próxima, swipe, Escape, foco restaurado, close visível e pinch/zoom compatível com navegação. Gestos devem distinguir arrasto de zoom de fechar/avançar; não fechar a foto involuntariamente ao tocar para interagir. Ações principais seguem os tamanhos de toque do projeto; controles do legado de 36 px não devem ser copiados automaticamente.

CTA "Brincar com esta foto" define selectedPhotoId no provider e retorna ao catálogo/entrada de jogo preservando essa foto. O Hub permanece compacto; não colocar toda a masonry acima dos jogos. Compartilhar/copiar usa URL canônica por token. Download do original é produto/ramo de entrega separado, não consequência de um botão de lightbox.

### Aceite mobile

390/412/430/768 px, desktop e aparelhos reais; 1, 5, 30, 92, 120 e 172 fotos; orientação mista; rede lenta; imagem com erro; observer indisponível; reduced motion; retorno por back/reload; foco e gestos. Nenhum crop indevido de foto hero, scroll horizontal, mistura de clientes ou download de todos os originais. Os três viewports do protótipo desta auditoria não substituem essa matriz do port.

## P09. M6 - provider e flow do EvydFlow

**Responsável:** EvydFlow, mantendo legado e perfis test/dry-run.

| Arquivo/local sugerido                | Alteração                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `evydflow/providers/interfaces.py`    | Protocolo `IGameplayProvider` e tipos de recibo.                                          |
| `providers/gameplay.py`               | Cliente HTTPS com autenticação, limites e erros tipados.                                  |
| `providers/fakes.py` e `factory.py`   | Fake completo e composição conforme perfil.                                               |
| `tasks/gameplay.py`                   | Sessão, revisão, transfer/verify/activate e recuperação.                                  |
| `tasks/media_experience.py`           | Wrapper do worker de mídia, stdout JSON e cancelamento.                                   |
| `tasks/orders.py` ou módulo dedicado  | Validação de UUID/número completo/destinatário.                                           |
| `tasks/__init__.py`                   | Registro explícito das novas tasks.                                                       |
| `flows/photo_experience_publish.yaml` | DAG independente de BAIXA/QC, Drive e mensagens imediatas.                                |
| settings / exemplo de config          | API base, referência de credential, worker/release, roots e limites; secrets fora do Git. |
| runner/atalhos                        | Passar OrderUuid e flags do novo flow sem concatenar comandos.                            |

### Interface proposta

```text
IGameplayProvider
  resolve_or_create_session(crmIdentity, sessionKey, idempotencyKey)
  begin_revision(sessionId, buildFingerprint, manifest)
  upload_derivative(revisionId, photoId, variant, stream, sha256, length)
  verify_revision(revisionId) -> receipt
  activate_revision(revisionId, expectedActiveRevision, idempotencyKey)
  get_revision_status(sessionId, buildFingerprint)
  read_domain_events(cursor)
  acknowledge_domain_event(eventId)
```

Esse protocolo não existe atualmente. Não encaixá-lo no IFtpProvider, que não representa sessão, conteúdo, revisão, autorização ou recibo.

### Novo DAG

```text
scan_root
 -> validate_crm_identity
 -> resolve_stable_photo_session
 -> freeze_content_manifest
 -> generate_sharp_derivatives
 -> validate_complete_local_revision
 -> begin_remote_revision
 -> transfer_derivatives
 -> verify_remote_receipt
 -> activate_revision
 -> reconcile_ready_event
```

`order_uuid` explícito pode destravar o MVP sem inventar filtro de pesquisa. A origem raiz permanece intacta. Não rodar simultaneamente o novo freeze e um flow legado que move essa mesma origem; freeze deve produzir snapshot completo antes de uma eventual operação de arquivamento.

Retries de transferência/verificação usam idempotência e são domain-managed, sem multiplicar retries do motor e provider indiscriminadamente. Falhas de schema, identidade, fonte alterada e checksum não são tratadas como falhas transitórias de rede. Timeout de operação externa vira resultado desconhecido até consulta de status/recibo.

Por desenvolvimento, cumprir o gate de verificação do EvydFlow com perfil de teste/dry-run, providers fake e sem WhatsApp/FTP/Drive reais. A auditoria atual não realizou a implementação nem executou esse gate para uma alteração de código inexistente.

## P10. M7 - evento de ativação, inbox e entrega

O backend é autoridade de ACTIVE. EvydFlow é o executor dos canais já configurados do estúdio. A ponte tem dois registros com finalidades diferentes, sem dois emissores enviando a mesma mensagem:

```text
Backend: ativar revisão + domain outbox, numa transação
  -> EvydFlow lê evento PHOTO_SESSION_ACTIVE
  -> persiste inbox por eventId + intenção de entrega local
  -> ACK do evento somente depois da persistência
  -> dispatcher usa o provider de comunicação configurado
  -> registra providerMessageId / SENT / UNKNOWN_OUTCOME / FAILED
```

EventId único impede que repetir a leitura gere outra intenção. O payload mínimo leva IDs opacos, revisão e contagens; a URL de acesso/destinatário são consultados/protegidos conforme o contrato administrativo. Não colocar telefone/token no log geral.

Criar `DeliveryIntent` com chave por intenção de negócio, sessão, revisão, destinatário autorizado e versão de mensagem. Publicar uma revisão nova não deve obrigatoriamente reenviar comunicação: capa/ordem pode mudar sem nova intenção. Definir se o evento pede notificação ou apenas atualização operacional.

Se o PC fechar após o backend ativar, o evento permanece consumível. Se o provedor aceitar a mensagem e a rede cair, marcar UNKNOWN_OUTCOME e reconciliar antes de repetir. Não prometer exatamente uma vez sem suporte do provedor; o projeto deve demonstrar prevenção de duplicação controlável e tratamento da incerteza.

Registrar status da galeria, status da entrega e vínculo no CRM separadamente. Não mudar o status comercial do pedido só porque um upload concluiu. Escolher campos/endpoints reais do CRM após prova de contrato; nenhum campo de URL/status foi inventado como existente nesta auditoria.

## P11. M8 - memória dos jogos e proteção da fotografia

Esta entrega é complementar à sessão/galeria; não bloqueia a construção do provider fake, mas precisa de aceite antes de habilitar jogos afetados para clientes.

- Guirlanda: preload da hero em game e demais em card; promoção sob demanda; liberar game anterior quando não tiver consumidor. Proteger callbacks após teardown/cancelamento.
- Usar como referência os planos de variante já existentes em Expresso, Rudolph e Mosaico.
- Preservar contain e proporção das fotografias, incluindo fotos horizontais dentro da tela vertical.
- Garantir que rodada fixa revisão e IDs; repetições em Memória/Rudolph são entidades de gameplay, sem recompressão ou duplicação no álbum da sessão.
- Animações/partículas devem respeitar zonas seguras e configurações de reduced motion/qualidade.
- Conferir o aviso de máscara WebGL da Lanterna registrado na auditoria anterior antes de afirmar recorte visual correto em toda a celebração. Essa mecânica não foi alterada neste trabalho.

Aceite: requests por variante observáveis, texturas limitadas, canvas destruído e retorno à galeria com foto escolhida preservada. A redução de 62,5% de área de pixels na Guirlanda é apenas estimativa para seis fotos equivalentes; medir memória/FPS em hardware antes de anunciar ganho real.

## P12. Matriz de verificação integrada

| Categoria    | Casos que precisam passar                                                 | Evidência esperada                                           |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Identidade   | IDs completos, UUID CRM explícito, conflito, tenant e destinatário.       | Tests de parser/adapter e recibo de vínculo.                 |
| Origem       | BAIXA ignorada, raízes permitidas, fake file, fonte mudando e zero fotos. | Manifesto e teste de segurança de intake.                    |
| Mídia        | Receita nova, replay, foto substituída/removida, erro de variante.        | Hashes/bytes/decode e versionamento.                         |
| Concorrência | Duplo job, lease vencido, crash, escritor atrasado.                       | Apenas uma ativação válida; fencing rejeita dono antigo.     |
| API interna  | Upload parcial, hash diferente, replay e timeout.                         | Recibo exato ou bloqueio tipado, sem side effect de entrega. |
| Acesso       | Token/cookie inválido, expiração, revogação, cliente A/foto B.            | Nenhuma leitura cruzada e nenhuma fixture em produção.       |
| Roteamento   | /s, /fotos, /game, reload, back, abas e troca de token.                   | Mesma sessão correta em todas as telas.                      |
| Galeria      | Loading, erro, lightbox, zoom, swipe, observer indisponível e rede lenta. | Screenshots, requests e controle de antecipação.             |
| Jogos        | Mínimo de fotos, seleção, revisão fixa, áudio/pausa/teardown.             | Testes existentes + jornadas da sessão real aprovada.        |
| Entrega      | Evento repetido, crash antes do ACK, timeout após envio.                  | Inbox/outbox sem reenvio cego e status reconciliado.         |
| Privacidade  | Originais/path/telefone/UUID CRM no DTO e cache compartilhado.            | Projeção mínima e endpoint privado.                          |
| Migração     | ID antigo, tokens novos, rollback e cliente já em rodada.                 | Nenhuma nova credencial revelada por ID enumerável.          |

No gameplay, usar typecheck, lint, unit, arquitetura, deadcode, format, repo map, assets, build e E2E pertinentes. No EvydFlow, usar seus gates em perfil de teste. Testes com provider fake não comprovam contrato/live behavior do provedor; a etapa externa controlada tem recibo próprio.

## P13. M9 - piloto, migração e rollback

### Primeiro corte vertical

1. Backend local com uma sessão de teste e três variantes por foto.
2. `/s/:token` e `/fotos` consomem essa sessão autorizada, sem fixture fallback.
3. Galeria escolhe foto; Puzzle entra com a mesma photoId; saída preserva seleção.
4. Repetir com Memória e Rudolph para subconjunto/repetição/álbum.
5. Provider fake EvydFlow gera manifesto e simula upload/verificação/ativação.
6. Conectar a bancada real 5000 somente em storage/ambiente privado, sem envio ao cliente.
7. Resolver UUID CRM/destinatário reais por contrato validado antes do piloto comercial.

Os IDs posicionais `photo-001` da bancada são de teste. Não usá-los como estratégia persistente de produção que renumera a coleção em cada scan.

### Piloto comercial controlado

Sessão aprovada, autorização testada, backup validado, operador confirma pedido/destinatário e revisão ACTIVE. Primeiro envio usa outbox e recibo. Acompanhar abertura, erro de mídia e suporte sem registrar dados sensíveis. Habilitar apenas jogos que passaram QA no ambiente de destino.

### Migração do legado

Manter `festive-gallery-show`, BAIXA/QC e flows antigos durante transição explícita. Novas sessões aprovadas passam pelo novo flow; legado não muda de comportamento sozinho. O fotógrafo não precisa exportar uma cópia por jogo.

**Não fazer redirect público de um ID numérico antigo para um token secreto novo.** Isso tornaria o token descobrível pela mesma enumeração que se deseja evitar. Reenviar novo link por canal/destinatário verificado ou exigir acesso autenticado antes de revelar a nova sessão. Uma landing informativa sem fotos pode explicar a migração.

### Rollback

Backend troca activeRevision para a versão anterior por operação autenticada/auditada; não reescreve arquivos da revisão. App pode desabilitar GalleryRoute/jogos novos por feature flag sem apagar sessões/fotos. Job de entrega pode ser pausado independentemente da galeria. Revogação por privacidade é imediata conforme a política, sem reativar foto removida ao fazer rollback.

Não usar exclusão de `data/state`, limpeza indiscriminada de pasta ou force push como rollback operacional. Receipts/ledger e revisões permitem recuperação rastreável.

## P14. Backlog executável, tamanho e dependências

Tamanhos são relativos, não promessa de dias: S = alteração localizada; M = módulo/fluxo com testes; L = contrato entre sistemas e validação integrada.

| ID  | Trabalho                               | Repositório         | Depende     | Tamanho / aceite                                    |
| --- | -------------------------------------- | ------------------- | ----------- | --------------------------------------------------- |
| T01 | ADRs, schemas e fixtures comuns        | gameplay + EvydFlow | Nenhum      | M; contrato versionado validado nos dois runtimes.  |
| T02 | Parser completo e vínculo CRM por UUID | EvydFlow            | T01         | M; zero truncamento/ambiguidade em novo flow.       |
| T03 | CLI Sharp, recipeKey e snapshot        | gameplay            | T01         | L; replay/receita/crash/90 derivados corretos.      |
| T04 | Adapter Python do worker               | EvydFlow            | T03         | M; processo sem shell e resultados validados.       |
| T05 | Banco/revisão/access grants            | gameplay            | T01         | L; constraints/leases/ativação transacional.        |
| T06 | Ingestão HTTPS preparada e recibos     | gameplay            | T03,T05     | L; lote incompleto nunca ACTIVE.                    |
| T07 | API de leitura/mídia autorizada        | gameplay            | T05         | L; acesso cruzado negado e original inacessível.    |
| T08 | SessionExperienceProvider e rotas      | gameplay            | T07         | M; token errado não mostra fixture ou outra sessão. |
| T09 | Port galeria/lightbox/fit/variantes    | gameplay            | T08         | L; mobile, foco, zoom e orçamento comprovados.      |
| T10 | IGameplayProvider real/fake            | EvydFlow            | T01,T06     | M; replay, conflito e recuperação.                  |
| T11 | Flow independente + runner             | EvydFlow            | T02,T04,T10 | M; test/dry-run sem efeitos externos.               |
| T12 | Domain event, inbox e entrega          | ambos               | T05,T10,T11 | L; crash/repetição/UNKNOWN_OUTCOME tratados.        |
| T13 | Otimização Guirlanda e QA de foto      | gameplay            | T08         | M; consumo seletivo e teardown.                     |
| T14 | QA integrado, piloto e migração        | ambos + legado      | T09,T12,T13 | L; evidência de ponta a ponta e rollback.           |

Contrato CRM de número para UUID, detalhes de implantação do proxy e capacidade de hardware são pendências reais. Podem impedir automatização/produção, mas não impedem desenvolver o corte vertical com UUID explícito e providers fake. Não estimar calendário fechado sem resolver essas entradas e medir o time de implementação.

## P15. Condição de conclusão e entregáveis

A implementação está concluída quando uma pasta selecionada da raiz, vinculada ao pedido completo correto, gera uma revisão verificada; o backend ativa essa revisão; um único link autorizado abre galeria e jogos com as mesmas fotos; e EvydFlow registra entrega com tratamento de retry/resultado desconhecido.

Entregáveis esperados: schemas; worker versionado; ledger/revisões; API interna e pública; galeria integrada; provider real/fake; novo YAML; outbox/inbox; roteiro de operação; evidências mobile; plano de migração e rollback. Código, docs e gates acompanham cada entrega.

### O que já existe como evidência deste estudo

- Auditoria dos três repositórios em commits identificados.
- 30 fotos principais do pedido 5000 processadas, com 90 variantes e originais íntegros.
- Replay sem alterar derivados; comparação de compressão em três fotos.
- Galeria offline da coleção real e galeria React de referência verificadas localmente.
- Build da galeria antiga aprovado, sem contato com endpoints reais de cliente.

### O que não foi implementado por este plano

SessionRepository de produção, GalleryRoute da gameplay, APIs novas, IGameplayProvider, novo flow, resolução CRM real, outbox e publicação comercial. O objetivo desta entrega é tornar a execução concreta e revisável, com bases técnicas e gates verificáveis, sem confundir uma bancada bem-sucedida com integração de produção concluída.
