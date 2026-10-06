# Auditoria forense — photo sessions, galeria mobile e Antigravity

Data de corte: 06/10/2026.

Este documento complementa a auditoria original de photo sessions com uma leitura de
segunda ordem: código atual do gameplay, branch ativo do EvydFlow, galeria legada,
pipeline de mídia, segurança operacional e bibliotecas candidatas para a galeria.

## 1. Evidência e classificação

Use estas palavras com significado estrito:

- **OBSERVADO**: confirmado diretamente em código, configuração ou árvore do
  repositório.
- **MEDIDO**: resultado produzido por benchmark ou smoke test já registrado.
- **INFERÊNCIA**: conclusão técnica derivada de evidência, mas ainda não demonstrada
  em produção.
- **RECOMENDAÇÃO**: decisão proposta para implementação.
- **BLOQUEADOR**: risco que impede piloto comercial até ser tratado.

Snapshots usados:

- gameplay: base `53d301cfa1fc078e4538bb77a29478fb49376145` mais o branch
  `docs/antigravity-photo-sessions-integration`;
- EvydFlow main: `aa9a93d6370fa7db5f9e1b25d49c8cf4b2b1a45b`;
- EvydFlow Antigravity: `1f5823b12a3ffc00ddb2fad20bf92d9a5d60d2e6`;
- festive-gallery-show: `0f903fba53d0e33c62cd3aa32f1cb25e8489390b`.

O branch Antigravity do EvydFlow está 44 commits à frente de `main` no corte desta
auditoria. Qualquer implementação cross-repo deve registrar explicitamente o ref do
EvydFlow usado; não assumir que `main` contém as mesmas garantias.

## 2. Resumo executivo

**OBSERVADO:** o gameplay já possui uma base React/Phaser mobile madura, separação
dinâmica do runtime Phaser, um componente `PhotoPrint`, picker de fotos e pipeline
Sharp. Porém a experiência pública de photo sessions ainda não existe de ponta a
ponta.

Os maiores vazios atuais são:

1. `apps/play` ainda usa `createFixtureSession` como sessão normal e não hidrata
   uma sessão real de produção.
2. O roteador não possui `GalleryRoute`; URL inválida pode cair em
   `local-demo-token`.
3. `apps/catalog-server` ainda é servidor de HTML/social preview. Não há banco de
   sessões, ingestão, grants de browser, API de sessão ou autorização de mídia.
4. O contrato `Photo` guarda `variants: Record<PhotoVariant, string>`; ele não
   guarda largura e altura reais de cada derivado.
5. O media pipeline ainda usa o hash da fonte como namespace suficiente, não possui
   `recipeKey` e não revalida o hash do snapshot depois da cópia.
6. A CLI de mídia ainda é voltada a desenvolvimento: argumentos posicionais e
   saída humana, não um recibo JSON estável para o EvydFlow.

**RECOMENDAÇÃO:** não substituir React/Vite, não criar outra aplicação de galeria e
não migrar o EvydFlow para Node. O menor desenho robusto continua sendo:

```text
Windows 11
EvydFlow Python/YAML
  -> congela manifesto
  -> cria snapshot privado
  -> executa Node/Sharp versionado
  -> verifica derivados
  -> upload HTTPS autenticado

VPS
Nginx
  -> apps/catalog-server
       -> SQLite/WAL local
       -> sessão/revisão/grants
       -> verify/activate
       -> autorização de mídia
  -> storage privado de derivados

Browser
apps/play
  -> Hub
  -> Galeria
  -> Jogos
```

Hub, galeria e jogos devem resolver a mesma `photoSessionId` e a mesma
`activeRevisionId`.

## 3. Gameplay — estado real

### 3.1 Fronteiras do monorepo

**OBSERVADO:** o workspace separa `apps/*`, `packages/*`,
`packages/games/*` e `tools/*`. Dependency Cruiser impede o browser de importar
`tools/*`.

Consequência: o Sharp deve continuar fora do grafo do browser. A integração correta é
process boundary no Windows e HTTPS na VPS, não import de `media-pipeline` em
`apps/play`.

### 3.2 React e navegação

**OBSERVADO:** `AppRouter.tsx` já mantém seleção da foto, histórico e ciclo
Hub -> jogo -> Hub. Isso é uma boa fundação e deve ser estendido para galeria.

**BLOQUEADOR:** a sessão usada normalmente ainda é fixture. Produção não pode usar
fixture como fallback de token inválido, expirado ou indisponível.

**RECOMENDAÇÃO:** acrescentar `GalleryRoute` ao roteador atual. Não adicionar React
Router apenas para a galeria.

Estados mínimos do provider real:

```text
loading
ready
unavailable
expired
revoked
empty
retryable-error
```

Troca de token deve abortar requests antigos e impedir que resposta tardia da sessão A
seja aplicada quando a UI já está na sessão B.

### 3.3 Phaser

**OBSERVADO:** Phaser e o módulo de cada jogo são carregados com `import()` somente
quando o runtime de jogo é solicitado.

Essa é uma vantagem arquitetural que a galeria não pode quebrar.

Gate obrigatório de `/s/:token/fotos`:

- zero request para Phaser;
- zero chunk runtime de jogo;
- zero `canvas`;
- abrir e fechar lightbox não muda esses três valores.

### 3.4 Contrato de foto

O contrato público atual precisa evoluir antes da galeria.

Forma recomendada:

```ts
interface PhotoVariantAsset {
  url: string;
  width: number;
  height: number;
}

interface Photo {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "portrait" | "landscape";
  variants: Record<PhotoVariant, PhotoVariantAsset>;
}
```

O DTO de browser não precisa expor `sourceHash`, caminho físico, nome original,
telefone, número do pedido ou hash interno de integridade.

O recibo privado de ingestão, por outro lado, deve registrar byte length, SHA-256,
`recipeKey`, worker version e dimensões reais.

## 4. Media pipeline — fortalezas e lacunas

**OBSERVADO:** a receita atual já possui limites de input, auto-orient, sRGB,
`fit: inside`, `withoutEnlargement`, WebP 82, staging e validação dos derivados.

**MEDIDO:** o benchmark de 30 fotos produziu 90 derivados em aproximadamente
6,62 MB no total; o replay da mesma receita foi muito mais rápido que a primeira
geração. Isso comprova a viabilidade local da receita, não throughput de VPS ou
performance de celular.

Lacunas antes do provider EvydFlow:

1. gerar `photoId` estável, não `photo-001` posicional;
2. introduzir `recipeKey`;
3. namespace do derivado = fonte imutável + receita;
4. copiar para staging e re-hashear o snapshot antes de derivar/promover;
5. registrar width/height reais por variante;
6. produzir receipt JSON estável em stdout e logs humanos em stderr;
7. compilar/distribuir CLI versionada em vez de depender de `tsx src/index.ts`;
8. declarar erro parcial como falha da revisão inteira por default.

Não criar AVIF ou quarta variante antes de teste visual e medição em aparelhos.

## 5. EvydFlow — o que reutilizar e o que isolar

O branch `antigravity/soclick-mvp-validation` contém padrões úteis que não existiam
na linha antiga da auditoria:

- manifesto canônico congelado antes da mutação;
- hashing semântico;
- identidade canônica no resume;
- estados de `UNKNOWN_OUTCOME`;
- reconciliação após crash;
- SQLite/WAL;
- leases/fencing;
- testes de concorrência e recuperação.

**RECOMENDAÇÃO:** reutilizar os padrões de manifesto, idempotência,
`UNKNOWN_OUTCOME` e reconciliação no novo `IGameplayProvider`.

Não copiar automaticamente toda a complexidade de fencing para o backend gameplay do
piloto. Com uma única VPS e baixa concorrência de escrita, CAS da revisão ativa,
constraints e idempotency keys são suficientes até existir evidência de múltiplos
publicadores concorrentes.

### 5.1 Contenção obrigatória antes do piloto

**BLOQUEADOR:** a árvore atual do EvydFlow ainda contém material operacional que não
deveria ser versionado e caminhos legados que não devem ser usados pelo novo fluxo.

Confirmado sem inspecionar ou reproduzir segredos/PII:

- arquivo de credencial rastreado;
- diretórios de estado/runtime e logs rastreados;
- logs de payload/rendered params capazes de registrar telefone, paths e URLs;
- compartilhamento Drive legado com acesso público gravável;
- FTP legado sem transporte criptografado;
- parser legado que deriva identificador operacional dos últimos dígitos do pedido;
- flow legado que move as fontes para `TRATADAS`;
- retries genéricos ao redor de side effects como mensagens.

Antes do piloto:

1. revogar/rotacionar credenciais potencialmente expostas;
2. retirar runtime, logs e credenciais do Git atual e definir política de retenção;
3. redigir/redactar logging;
4. não usar Drive público gravável nem FTP no photo-session flow;
5. preservar o número completo/UUID CRM;
6. não mover fontes como efeito colateral do novo flow;
7. tratar timeout depois de side effect como `UNKNOWN_OUTCOME`, reconciliar antes
   de repetir.

O saneamento de histórico Git é uma operação destrutiva separada; rotação deve ocorrer
antes dele.

## 6. Galeria legada — o que doar

**OBSERVADO:** `festive-gallery-show` já usa React Photo Album e Yet Another React
Lightbox com Zoom. Também possui share nativo, lazy image, batches e experiência
visual comprovada em smoke local.

Não portar:

- React Router da aplicação antiga;
- Tailwind/shadcn/Radix em massa;
- TanStack Query somente por herança;
- APIs `photos.php` e `order.php`;
- ID numérico de galeria como capacidade pública;
- snowfall contínuo;
- lightbox importado estaticamente no bundle inicial;
- uma URL única por foto sem `srcset`;
- dados do pedido como parte necessária do frontend.

O smoke já registrado mostrou que o IntersectionObserver do doador chegou a solicitar
quase toda a coleção no viewport mobile. Portanto o mecanismo antigo de "infinite
scroll" não é prova de orçamento de rede.

## 7. Decisão de bibliotecas

### React Photo Album

**APROVADO com escopo limitado.**

Usar a versão validada no momento da implementação, inicialmente fixada no plano em
`3.6.1`, e importar apenas `MasonryPhotoAlbum` e o CSS específico.

Razões:

- compatível com a stack React atual;
- aceita `srcSet` com width/height reais;
- gera `srcset/sizes`;
- resolve masonry responsivo sem depender de CSS Masonry experimental;
- permite breakpoints explícitos para limitar recalculo de layout.

Não usar o `InfiniteScroll` padrão no primeiro corte. A documentação atual usa
`fetchRootMargin=800px` e `offscreenRootMargin=2000px` por default. Isso é
agressivo para a meta de rede do projeto e aproxima o comportamento do over-fetch já
observado na galeria antiga.

Usar batch controlado do próprio app, com botão "Ver mais" como fallback.

### Yet Another React Lightbox

**APROVADO.**

Usar core + Zoom por entrypoint específico e importar o componente inteiro com
`React.lazy`. No mobile, começar com `preload: 1`.

Razões:

- suporte a touch e swipe;
- pinch-to-zoom/double tap;
- suporte a imagens responsivas;
- `imageFit: contain`;
- preload configurável.

Não ativar slideshow, thumbnails, download ou plugins sem requisito real.

### Virtuoso Masonry

**NÃO no MVP.**

É uma opção válida se sessões grandes demonstrarem gargalo de DOM/layout. A
virtualização adiciona custo de restauração de scroll, foco, índice do lightbox e
distribuição just-in-time. Só introduzir depois de perfil real.

### CSS Masonry / grid lanes

**NÃO como implementação única de produção.**

A tecnologia continua marcada como experimental/fora de Baseline em navegadores
relevantes. Progressive enhancement é aceitável; dependência exclusiva não.

### Framework novo

**REJEITADO no MVP.**

Não adicionar Next.js, Remix, React Router, framework CSS ou state manager novo. A
aplicação já possui composição, histórico e lifecycle próprios adequados ao produto.

## 8. Estratégia mobile de imagem

O grid não deve oferecer `game` como candidato inicial.

Por tile:

```text
src       -> thumb ou card seguro
srcset    -> thumb + card com larguras intrínsecas reais
sizes     -> slot real do masonry
loading   -> lazy, exceto candidato LCP explicitamente escolhido
decoding  -> async
```

No lightbox:

```text
src       -> game
srcset    -> card + game
fit       -> contain
preload   -> 1 no mobile inicialmente
```

O browser só pode receber descritores `w` iguais à largura intrínseca real do
arquivo. Os nomes 480/800/1600 representam lado maior da receita e não devem ser
copiados para `srcset` como se fossem sempre width.

A foto candidata a LCP pode receber eager/high priority; não marcar todo o grid como
high priority.

## 9. Estratégia de render do grid

Primeiro corte recomendado:

- 8 a 12 tiles montados;
- duas colunas na faixa típica de aproximadamente 390–430 CSS px;
- lote seguinte pequeno e explícito;
- observer com antecipação curta, se usado;
- botão manual continua disponível;
- nada de `game.webp` no grid;
- nada de Phaser;
- preservar scroll por sessão e revisão;
- abrir foto não perde índice/seleção;
- voltar de jogo restaura scroll e `selectedPhotoId`.

Não usar "quantidade de itens no array React" como proxy para rede. Os testes precisam
contar requests e bytes por variante.

## 10. Backend e multi-cliente

Persistência mínima:

```text
photo_sessions
photo_revisions
photos
media_assets
access_grants
browser_access_sessions
idempotency_records
audit_events
```

Outbox pode entrar junto da entrega automatizada posterior.

SQLite/WAL é adequado ao piloto de um host, desde que banco e processos estejam na
mesma máquina. Nunca compartilhar o arquivo SQLite Windows <-> VPS ou via filesystem de
rede.

Ativação é compare-and-swap:

```text
activate(session, newRevision, expectedActiveRevision)
```

Falha se a revisão ativa divergiu.

Todo teste de repository/route deve possuir sessão A e B. O teste deve tentar combinar
grant A com photoId/revision B e esperar negação sem vazamento de existência.

## 11. Contrato de performance e experiência

O documento
`docs/quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md` é normativo para a nova
`GalleryRoute`.

Metas de campo:

- LCP p75 <= 2,5 s;
- INP p75 <= 200 ms;
- CLS p75 <= 0,1.

Essas metas não são homologadas por um único Lighthouse.

Gates determinísticos de laboratório:

- zero Phaser/game runtime/canvas na galeria;
- zero variante `game` no grid inicial;
- batches limitados;
- sem overflow horizontal em 390/412/430;
- três ciclos galeria -> jogo -> galeria sem crescimento contínuo de canvas/runtime;
- sessão A nunca apresenta mídia/estado da sessão B.

## 12. Ordem de execução para o Antigravity

### Fase 0 — contenção e provenance

- registrar refs exatos dos três repositórios;
- tratar exposição operacional do EvydFlow antes de qualquer piloto;
- manter o flow legado funcionando, mas fora do novo photo-session flow.

### Fase 1 — contratos

- criar `PhotoVariantAsset`;
- separar DTO público e receipt privado;
- adicionar `GalleryRoute`;
- remover fallback de fixture em produção;
- testes A/B de identidade.

### Fase 2 — media pipeline

- stable photoId;
- recipeKey;
- snapshot rehash;
- manifest completo;
- CLI JSON versionada;
- zero-failure collection receipt.

### Fase 3 — backend

- SQLite repositories;
- revisions;
- idempotency;
- verify;
- CAS activate;
- service authentication.

### Fase 4 — acesso público

- capability token;
- browser grant;
- `Referrer-Policy: no-referrer`;
- media authorizer;
- Nginx internal/X-Accel;
- revogação.

### Fase 5 — SessionProvider real

- fetch/abort/race handling;
- estados explícitos;
- nada de fixture em produção.

### Fase 6 — GalleryRoute

- React Photo Album;
- batch controlado;
- responsive image;
- lightbox lazy;
- history/scroll;
- gates do contrato mobile.

### Fase 7 — primeiro jogo vertical

Puzzle Swap primeiro: uma foto, orientação mista já suportada e menor complexidade de
seleção. Provar galeria -> Puzzle -> galeria antes de ampliar catálogo.

### Fase 8 — EvydFlow provider

Criar `IGameplayProvider` independente do FTP legado:

```text
resolve_or_create_session
begin_revision
upload_derivative
verify_revision
activate_revision
get_revision_status
```

Reutilizar manifesto/UNKNOWN_OUTCOME/reconciliation do trabalho SóClique.

### Fase 9 — piloto físico

- Android intermediário;
- Safari/iPhone;
- rede móvel;
- coleção pequena e grande;
- interrupção/retry;
- revogação;
- backup/restore;
- entrega manual do link.

WhatsApp automático só depois da publicação e recuperação estarem comprovadas.

## 13. Critério de parada

O Antigravity não deve chamar a integração de "pronta" porque build, unit tests ou
Chromium emulado passaram.

O primeiro marco comercial requer, no mínimo:

- containment do EvydFlow;
- sessão persistente real;
- revisão atômica;
- autorização de mídia;
- galeria sem Phaser e com rede limitada;
- ciclo galeria/jogo restaurável;
- isolamento A/B;
- Android e Safari/iPhone físicos;
- rollback/restore comprovados.

