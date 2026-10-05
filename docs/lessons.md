# Durable lessons

## LESSON-001 — Photographic games use linear filtering

For customer photography keep `pixelArt: false`, anti-aliasing enabled and CSS image rendering non-pixelated. This follows the audited photographic-rendering guidance and prevents avoidable visual degradation.

## LESSON-002 — Responsive layout is owned, not inferred

`Scale.RESIZE`, FIT and EXPAND are configuration tools, not an app layout system. Each screen-space owner must respond to a pure viewport layout and remove its resize listener on shutdown.

## LESSON-003 — Cold Phaser starts need conservative E2E parallelism

Four simultaneous cold mobile starts left two projects waiting on the lazy Phaser chunk in this environment. Playwright therefore uses one worker for the foundation lifecycle suite; raise it only after measuring the VPS/CI resource ceiling and preserving the same evidence.

## LESSON-004 — Phaser destruction has a real completion boundary

`game.destroy()` schedules destruction for a later frame. A React route transition must wait for Phaser's `DESTROY` event before granting the next game a canvas/input lease; an animation-frame guess is not a lifecycle guarantee.

## LESSON-005 — A stable photo id does not prove stable pixels

Photo ingestion keys must include content identity. Store the original and derivatives under the source hash, validate staged derivatives before publish, and merge the session manifest so processing one photo cannot erase the rest.

## LESSON-006 — Folder hierarchy is input schema

The 2024 Christmas corpus has one date-batch layer above sessions. The inspector recognizes that explicit layer but never recursively scans inside a session, preventing low-resolution delivery folders from becoming accidental game inputs.

## LESSON-007 — Navigation requests must be edge-triggered per host

An incrementing exit request is safe only when a fresh `PhaserHost` treats its current value as already handled. Otherwise it consumes a completed predecessor request and immediately exits the next game. Browser Back now records the target route, cancels the current host and applies that target only after `DESTROY`.

## LESSON-008 — A grid can reuse one photo texture without distorting it

Puzzle pieces are visual crops of one authorized `game` variant, positioned from source-frame proportions and the contain-fitted board geometry. A piece never needs a separate image request; touch targets are transparent geometry over that same layout.

## LESSON-009 — A crop rectangle and a proportional puzzle frame are different tools

Cropping a display-sized full image preserves the original display scale; it does not make the cropped region fill a puzzle cell. Build named frames on the one authorized texture using source coordinates, then display each frame at the calculated cell size. This preserves aspect ratio, avoids extra requests and makes mixed orientation predictable.

## LESSON-010 — Seasonal feedback needs a bounded motion budget

Use finite scene-owned tweens for tap, hint, correct and win sparkles. A
continuous snowfall is allowed only when it is an explicit part of the scene:
use one scene-owned emitter with a texture already loaded, reserve its small
pool, cap live particles, keep it behind the photo, and omit it in LOW and
reduced-motion modes. Never add an unbounded emitter merely to fill empty
space.

## LESSON-019 — A useful swap hint names two visual places, not one

For a swap puzzle, highlight the cell that needs its own piece and the cell
currently holding that piece. This gives a child a concrete, non-solving move:
swapping the two always puts one piece into place. Keep that choice in a pure
domain function and let Phaser only present it, so the hint is testable without
the canvas.

## LESSON-020 — Asset facts need a local, exact and complete boundary

An asset provenance table explains intent, but it cannot prove that every file
currently under a public game directory was reviewed. Keep one manifest per
game with exact bytes, delivery alternatives and a provenance anchor; audit the
directory against it. Count browser-format alternatives twice for the static
package and once (the larger choice) for a game run. Do not switch the runtime
to generated asset code until a second game proves the adapter is genuinely
shared.

## LESSON-011 — Real-photo review needs a separate local delivery boundary

A useful operator preview can use real derivatives without weakening the product privacy model: prepare opaque ids and WebP variants in a private external cache, bind the review server to loopback, and expose only a dev-only derivative endpoint with no-store. Do not treat that convenience adapter as authorization or deploy it to the VPS.

## LESSON-012 — Responsive image attributes need a bounded display box

An image’s intrinsic `height` attribute can become a multi-thousand-pixel layout height when CSS only constrains its width. A mixed-orientation mobile gallery must own a fixed tile box and explicitly make the image fill that box with proportional `object-fit`; verify it at the smallest supported viewport with real derivatives.

## LESSON-013 — A completion overlay needs a direct scene reference

Adding a child to a Phaser `Container` removes it from the Scene display list, so a later `children.getByName()` cannot retrieve that child reliably. Retain the win-duration text as a scene field; otherwise a completed run can emit `GAME_COMPLETED` while the visual completion path throws before the overlay appears or the controller destroys cleanly.

## LESSON-014 — “Correct” is a state transition, not every move

For a swap puzzle, compare the two affected cell assignments before and after the move. Tween the two existing piece objects to their new cells, then trigger sparkle, haptic and correct SFX only for cells that were incorrect and have just become correct. Recreating the entire board on every move hides this distinction and makes photographic play feel like a web page rather than an app.

## LESSON-015 — Loader-retry proof needs an HTTP fixture

Phaser loads data-URI images through its image-element path, which does not exercise XHR retry behavior. Browser fixtures now use safe static portrait/landscape SVGs so Playwright can abort the required-photo request, prove exactly one configured retry and verify that only a privacy-safe failure code reaches React. Keep this distinction in mind whenever loader policy is validated.

## LESSON-016 — A responsive board keeps its topology and its objects

Choose a puzzle topology when a run begins, then pass that one candidate to responsive geometry. A resize can move and scale pieces, but must not reselect rows or columns: doing so disconnects ids, source frames and the solved permutation. Reflow the existing piece and border Game Objects instead of destroying and recreating them. If the tiny active swap tween targets stale coordinates during a resize, stop only those targets and complete the already accepted move idempotently before reflowing.

## LESSON-017 — Display geometry and native texture scale are not interchangeable

`setDisplaySize` sets the proportional size of a photo or its source-frame
piece. Calling `setScale(1)` afterward discards that fitted scale and restores
the texture at native dimensions, which can cover the whole mobile stage and
make an otherwise correct grid look stretched. Animate alpha, or calculate a
relative scale from the fitted value; never reset photographic Image scale in
an entrance or victory tween.

## LESSON-018 — Local photo review needs its server-time configuration

The local browser route only returns private derived photos when the Vite
server starts with `LOCAL_TEST_MEDIA_ROOT` pointing to the prepared external
storage. A route can otherwise return the application HTML for the private
endpoint and fail JSON validation. Check the endpoint response before visual
review; do not weaken the middleware or expose a filesystem path as a fix.

## LESSON-021 — A style anchor is a decision tool, not a browser asset

Keep the master visual frame outside `public/`, without client photography,
and record its purpose and provenance next to it. Use the anchor to review
photo hierarchy, protected zones and CTA before sourcing or preparing any
runtime art. A CSS-only preview may prove that hierarchy with existing
authorized assets, but it does not bypass manifest, licensing or approval
gates for new art.

## LESSON-022 — A child-facing hint needs a paced, bounded presentation

Keep the hint pair deterministic in the domain, but present it in two short
stages: first the destination border, then the piece currently holding it,
with a colour relationship stated in simple words. Scene-owned timers must be
cancelled on swap, pause and shutdown; a small cooldown prevents repeated taps
from restarting the teaching sequence or stacking feedback. This preserves the
child's agency while still making the next gesture clear.

## LESSON-023 — Chrome must earn its vertical space

Treat header and coach-mark reserves as explicit layout metrics, then test the
proportional board against the former values at every supported viewport. Keep
the visible surface compact, but never reduce the independent 48 px touch
bounds of sound, hint or pause. A narrow phone can remain width-constrained,
so report recovered vertical room separately from photo-board area; a taller
viewport reveals the real area gain without distorting the photo.

## LESSON-024 — A real-time HUD needs one visual owner

Timer and progress belong to the Phaser Scene while they are spatial parts of
the active board: the Scene already owns the game clock, board mutation and
layout. React can announce typed lifecycle events to assistive technology, but
it must not mirror time or progress visibly. Moving that HUD to DOM would need
an explicit bridge contract and removal of the Phaser text; do not add a second
display path merely for convenience.

## LESSON-025 — Frame percentiles need the presentation clock and a stated scope

Use the timestamp supplied by a presentation callback to derive frame deltas;
do not put a browser clock into game domain code or compare a hidden-tab pause
with an active frame. Keep the percentile formula shared by adaptive quality
and the future laboratory, and document decoded RGBA bytes as an estimate—not
as total GPU memory. A real Android device still decides any budget.

## LESSON-026 — Browser asset review needs a deliberately smaller catalog

The Node audit manifest is a source of truth for provenance and exact files,
but it can include source paths that do not belong in a browser—even on a local
development route. Project a browser-safe catalog with only public paths and
review facts, grouping browser delivery alternatives by creative role. A lab
must declare absent asset types rather than mock unapproved art, and a native
audio control with `preload="none"` prevents every sound from becoming an
eager request merely because a reviewer opened the page.

## LESSON-027 — A reproducible scene scenario cannot rely on a synthetic DOM gesture

Dispatching mouse or pointer events from React can be batched differently from
the browser gesture path and is not a reliable proof that a Phaser interaction
ran. Keep the scenario plan pure, but let a local-only typed command be handled
inside the already-mounted Scene through the same production methods for hint,
swap, pause and completion. React may select the command and observe typed
bridge events, never a Scene or board. Lifecycle scenarios still go through
the host destruction path, where a DOM snapshot can prove canvas and host
counts return to zero.

## LESSON-028 — Size alone is not asset identity

An unchanged byte count cannot prove that the reviewed browser file is still
the same content. Keep size for bundle budgeting and pair it with a SHA-256
computed in the Node-only asset factory. The digest detects a same-size
replacement, but it is not provenance, licence or visual approval: those are
separate human-review facts in the manifest.

## LESSON-029 — A diagnostic sequence must wait for completion, not elapsed time

An approximate delay after a Phaser tween is not a completion contract: a
mobile frame may arrive late, and consuming the next deterministic swap while
the previous one still owns the board silently loses a step. Chain a local
diagnostic sequence from the actual tween completion callback, retain the
pending action until the move is available, and keep each short timer in the
Scene-owned cleanup scope. This exercises production feedback without making
development timing a source of test-only flakiness.

## LESSON-030 — A reference map must not become a speculative dependency bundle

An exact Phaser version, a concrete trigger and the matching installed type are
enough to make a future API discoverable. Do not vendor or load a broad skill
simply because an adjacent feature might use it someday. Until an approved task
needs that API, retain the official tagged link and keep the production path
closed; when it does, add only the reviewed local reference needed by that
task and validate against its official Quick Start and installed types.

## LESSON-031 — A social preview is a server decision, not a React feature

The browser may open the native sharing panel only after a person taps, but
social crawlers read the initial HTML response and may cache it beyond the
game's control. Keep the ordinary share link in the React shell, while the
backend authorizes an opaque session link and emits Open Graph metadata. Use a
generic approved Christmas image by default; a client photo requires explicit
social consent, a separate derivative without personal metadata and a
revocable server decision before Nginx can deliver it.

## LESSON-032 — Revocation must be checked when the crawler asks for the image

Rendering Open Graph HTML once is insufficient because a crawler fetches
`og:image` separately and may retry it later. Keep a stable image route under
the opaque session token, authorize that request again and only then send an
`X-Accel-Redirect` to an `internal` Nginx location. The generic approved art
is also served through that decision, so a revoked consent returns to the safe
default without exposing a customer derivative on a direct public path.

## LESSON-033 — A responsive assertion must observe the rendered CSS viewport

Mobile emulation can map a requested physical viewport to a different CSS
layout width. A responsive regression test should therefore compare the
rendered viewport with its own prior state and inspect real bounds and
overflow, rather than assume that the requested device size is the page's CSS
width. This catches reflow failures without creating false negatives from the
emulator's device-scale model.

## LESSON-034 — A full E2E matrix needs a clean development server

Playwright can reuse a convenient local Vite server, but source edits or HMR
can then replace the game while a later mobile scenario is still waiting for
its initial Phaser lifecycle event. A failure stuck in “Preparando jogo” or
“Atualizando jogo” is not evidence of a gameplay defect until the suite has
been repeated against its own clean server. Keep the user's local preview on
its normal port and run the release matrix with a distinct port and `CI=1`,
which disables server reuse.

## LESSON-035 — Test evidence must not be a watched source input

Writing a screenshot below a directory observed by Vite can trigger a full
reload while a Phaser scenario is waiting for its next bridge event. Write
private evidence with Playwright's `testInfo.outputPath()` instead: it places
the file inside the unique output directory of that test, outside the served
source tree. Capturing proof can then neither change the measured lifecycle nor
collide with evidence from another worker.

## LESSON-036 — Long journeys need a bounded per-scenario budget

A serialized mobile journey with several Phaser tweens, audio authorization and
two independent mounts can exceed a generic interaction timeout on a cold or
contended WebGL process. Give that named journey a local, finite timeout and
assert its real readiness, completion and teardown events; do not raise the
global timeout and hide failures in short scenarios.

## LESSON-037 — Mobile canvas tests must wait for state, not for a guessed tween duration

Canvas interaction on a touch device should be exercised with a real touch
gesture in viewport CSS pixels, rather than a mouse click that happens to reach
the same location. After a valid piece swap, expose a small typed bridge event
only when the game accepts the next move; the E2E journey can then wait for
that state before sending the next touch. This avoids race conditions on a
contended WebGL process while preserving the production rule that child input
is buffered only briefly during the visible swap animation.

## LESSON-038 — Idle assistance must never cancel an active two-step choice

An idle timeout measures the absence of a completed move, not the absence of a
player action. If it resets the selected piece between the first and second
tap, the next valid tap looks ignored and the child loses the intended swap.
Only request idle help while no piece is selected and no real swap is settling;
the active selection already provides the contextual next-step instruction.

## LESSON-039 — Player-facing copy and lifecycle evidence must evolve together

The typed bridge event is the product truth; its Portuguese sentence is a
separate, player-facing decision. When that sentence changes, update the
journeys that intentionally verify visible copy in the same patch, while
lifecycle journeys should prefer the event sequence or event code whenever
available. A stale expectation can make a correctly completed game look
broken and waste a full mobile matrix run.

## LESSON-040 — Architecture validation must run within the declared Node window

`dependency-cruiser` rejects Node 25.1.0 before it analyzes the project, while
this repository declares Node 24 as its supported release line. A failed
architecture step on Node 25 is an environment incompatibility, not evidence
of a dependency-boundary regression. Run the release gate in Node 24 (or a
dependency-cruiser-supported future line) and report the distinction plainly.

## LESSON-041 — Realismo 2D mobile vem primeiro da arte preparada e da hierarquia

Filtros WebGL podem adicionar luz ou profundidade, mas são opcionais, têm custo
e não podem salvar uma composição, uma textura ou um movimento incoerente. Para
um jogo de fotos, construa primeiro material, sombra, profundidade e luz nos
assets preparados; preserve a derivada da sessão sem filtro ou distorção. Um
experimento de shader só entra depois em um objeto decorativo isolado, com
fallback visual equivalente e medição no aparelho de referência.

## LESSON-042 — Um manifesto de assets sem arquivo não é um contrato válido

O schema v2 da fábrica exige uma lista não vazia de assets. Antes de existir um
arquivo browser-deliverable aprovado, o pacote deve reservar o diretório e
documentar sua política, mas não versionar um `manifest.json` vazio ou fictício.
Criar o manifesto junto do primeiro asset aprovado mantém auditoria, orçamento
e proveniência honestos.

## LESSON-042 — Cartão responsivo precisa de geometria de toque própria

Um `Container` Phaser pode agrupar a apresentação, mas não é uma superfície de
toque tão previsível quanto um objeto com geometria concreta após um reflow.
Para cartas redimensionadas, mantenha o `Container` somente como transform da
apresentação e entregue o evento a um `Rectangle` transparente filho, cujo
tamanho acompanha exatamente a carta. A revisão deve tocar o canvas real nas
larguras mobile, porque testes do domínio e asserts do DOM não revelam uma área
interativa ausente.

## LESSON-043 — Uma grade mobile deve escolher a densidade pela área útil

“Três cartas por linha” não é uma regra de aparelho: é uma decisão de
geometria. Para o Memórias, o planejador avalia a largura e a altura realmente
disponíveis, só adota três colunas quando a carta visual alcança 88 CSS px e
mantém área de toque de 52 CSS px. A linha incompleta é centralizada com base
na quantidade efetiva de cartas, o que preserva o equilíbrio do tabuleiro em
EASY e evita uma exceção visual quando STANDARD tiver outra quantidade.

## LESSON-044 — Material de carta responsivo precisa ser uma decisão pura

O mesmo cartão aparece pequeno em telefone e grande em tablet; proporções
fixas de moldura, selo e texto deixam de parecer físicas em uma das pontas. Um
planejador puro de material, testado com tamanhos reais de grade, permite que
o runtime Phaser apenas aplique medidas a objetos já criados. Assim a foto
continua em `contain`, o resize não recria o baralho e a revisão visual pode
ajustar uma decisão explícita em vez de caçar números soltos na Scene.

## LESSON-045 — Ocultar a aba durante uma resolução precisa preservar a verdade já aceita

O estado puro pode já conter duas cartas abertas quando a visibilidade muda,
mas a apresentação ainda pode estar no meio da virada. Ao pausar, estabilizar
cada cartão a partir do estado puro e armar a resolução com timer pausado
impede uma meia carta ou um turno eterno. O E2E deve atravessar a mudança real
de `document.hidden` e, depois do retorno, provar uma nova jogada e a saída;
simular apenas um `pause` da Scene não cobre o handler de visibilidade do
Phaser.

## LESSON-046 — Áudio desbloqueado por gesto também precisa pertencer ao ciclo de vida

O browser pode manter uma fonte de áudio bloqueada até o primeiro gesto, logo o
callback de desbloqueio pode sobreviver à saída da Scene se for registrado sem
owner. Um diretor local deve guardar e remover esse listener antes de destruir
sons e cache; mudo, pausa e saída passam pela mesma política. A prova de
browser deve confirmar o carregamento dos arquivos autorizados, alternar
Som/Mudo e aceitar uma carta depois da alternância, em vez de tratar uma
captura de tela como prova de som funcional.

## LESSON-047 — Duas linhas de HUD exigem reservar a altura do alvo, não só a linha do texto

Um botão de 52 CSS px centrado apenas 30 px abaixo da primeira linha ainda
invade o relógio, mesmo quando seus rótulos parecem estar em linhas diferentes.
O planejador do tabuleiro precisa reservar toda a altura do segundo grupo de
comandos e os helpers E2E devem usar a mesma geometria. A captura do telefone
e a do tablet são complementares: uma revela a densidade da grade, a outra
expõe colisões horizontais que a tela menor pode disfarçar.

## LESSON-048 — Vitória visual precisa de uma prova determinística e não de um cronômetro de animações

Para revisar a folha pós-vitória, um cenário local pode resolver a mesma
máquina de turnos pura até o estado terminal e então apresentar suas cartas
como concluídas. Ele não deve tentar encadear uma partida inteira por delays
de animação: sob WebGL contendido, o último delay pode produzir um falso
negativo. O cenário é diagnóstico local; a partida publicada continua usando
toque e a apresentação normal. A prova verifica a sequência álbum visível,
ações, novo GameRun e saída, em vez de pular diretamente para uma tela falsa.

## LESSON-049 — Progressão de Memórias precisa trocar a identidade da rodada, não o deck terminal

Em 2026-08-28, STANDARD foi ligado somente pela ação pós-vitória do shell e
cria um `GameRun` novo com 6 pares/12 cartas. A Scene concluída não recebe
cartas novas e sessões com menos de seis fotos únicas não mostram a ação.

## LESSON-050 — Variação sonora pode ser determinística sem multiplicar assets

Em 2026-08-28, `MemorySoundPolicy` passou a alternar velocidades discretas por
ocorrência e a reduzir a música durante acerto/vitória. A política mantém um
único arquivo por papel, preserva o orçamento e permite testar a sequência sem
Phaser, `Math.random` ou áudio do navegador.

## LESSON-051 — Sessão pequena precisa deduplicar textura antes do Loader

Uma rota pode repetir a mesma foto para completar seis estações, mas registrar
o mesmo `textureKey` várias vezes no Loader não cria seis recursos válidos e
pode mascarar o contrato de readiness. Planeje primeiro as fotos únicas: a
âncora usa uma única derivada `game` e cada coadjuvante uma única derivada
`card`. A rota continua livre para repetir o identificador; a Scene reutiliza a
textura já aprovada, sem baixar o catálogo inteiro nem emitir chave duplicada.

## LESSON-052 — O xadrez de uma prévia não comprova canal alpha

Uma imagem pode parecer transparente no preview e ainda carregar o xadrez como
pixels opacos. Antes de aceitar um sprite raster, o preparo precisa confirmar
`hasAlpha` no arquivo browser-deliverable, além de inspecioná-lo sobre fundos
claros e escuros. Em 28-08-2026, um candidato de locomotiva falhou essa prova e
foi removido antes de entrar no diretório público ou no manifesto; a promessa
de transparência no prompt não substitui a validação do binário.

## LESSON-053 — Paisagem curta precisa proteger a faixa antes de preservar a escala da foto

Em 28-08-2026, a revisão de canvas do Expresso das Fotos em 844 × 390 revelou
que uma altura de foto calculada apenas como proporção da viewport fazia a
moldura encostar nas faixas jogáveis. Em paisagem, calcule primeiro a faixa e
reserve um intervalo físico para ela; então limite a altura de foto e portal ao
espaço restante. A instrução pode migrar para o cabeçalho, mas a área de toque
nunca deve competir visualmente com uma foto ou portal.

## LESSON-054 — A transição de estado após o primeiro layout precisa sincronizar a apresentação

Em 28-08-2026, o Expresso das Fotos fazia seu primeiro reflow ainda em `ready`
e só depois iniciava a jornada. Como a posição de repouso do trem era aplicada
apenas pelo layout quando já estava em `awaiting-lane`, a locomotiva ficava na
origem do canvas até a primeira viagem. Sempre que o estado lógico muda depois
do layout inicial, o presenter precisa aplicar a posição derivada desse novo
estado ou disparar um reflow idempotente; não presuma que a primeira chamada de
layout já conhecia a fase jogável.

## LESSON-055 — A versão do Node faz parte da prova de arquitetura

Em 29-08-2026, o repositório declarava Node 24, mas o ambiente estava no Node
25.1.0, que o `dependency-cruiser` recusa antes de examinar dependências. Ao
ativar o Node 24.20.0 LTS, a ferramenta revelou um ciclo real no Expresso das
Fotos: a Scene importava o barrel que também a reexportava. Validar na versão
declarada não é só remover ruído de ambiente; é o que permite encontrar a
violação de arquitetura e corrigi-la com imports diretos de domínio.

## LESSON-056 — Uma foto só é mecânica quando sua relação com a ação é visível

Em 29-08-2026, a revisão privada do primeiro protótipo do Expresso mostrou que
um portal-foto, três faixas e a instrução “toque no caminho que brilha” podem
estar tecnicamente funcionais e ainda assim não formar uma missão compreensível.
Antes de validar em uma matriz de aparelhos, a cena precisa permitir explicar
em um olhar “foto-alvo → estação correspondente → trilho → entrega”. Quando a
foto é central para o jogo, ela deve determinar uma escolha visual legível, e
nunca virar um painel pequeno separado do controle e da consequência.

## LESSON-057 — Geometria de rota precisa sobreviver fora do renderer

Em 29-08-2026, o redesign do Expresso eliminou a escolha de faixa abstrata em
favor de estações e trilhos físicos. A regra e o layout devem conservar uma
especificação de rota normalizada e pura; somente o runtime transforma essa
especificação em `Phaser.Curves.Path`. Assim, o mesmo traçado posiciona a
agulha, desenha a ferrovia e move a locomotiva, enquanto pausa e resize podem
recriar o path no progresso já apresentado sem vazar Phaser ao domínio ou usar
um tween independente de `x/y`.

## LESSON-058 — O ângulo do sprite precisa respeitar o ponto de vista da arte

Em 29-08-2026, a revisão focal do Expresso mostrou que uma locomotiva em vista
lateral, mesmo se bem ilustrada, parece quebrada quando recebe a rotação total
da tangente de um trilho que sobe na vertical do celular. O Path continua
sendo a única fonte de posição, mas a inclinação do rig deve ser limitada ao
intervalo adequado à sua perspectiva; o terminal também precisa ficar abaixo
da foto da estação. Movimento fiel ao trilho não exige girar um sprite para
uma vista que a arte não suporta.

## LESSON-059 — Um loop de cena precisa ter dono, pausa e destruição próprios

Em 29-08-2026, a primeira camada de som ferroviário do Expresso mostrou que
rodas em loop não podem usar o mesmo caminho de efeitos descartáveis. Um
diretor do jogo precisa reter a única instância, pausá-la quando a apresentação
for invalidada, reiniciá-la somente com a viagem e destruí-la no shutdown. Isso
evita que resize, pause, mute ou saída deixem um trem audível sem trem visível,
sem recorrer a `stopAll` no SoundManager compartilhado.

## LESSON-060 — Efeito decorativo também precisa obedecer ao estado da partida

Em 29-08-2026, vapor e faíscas do Expresso passaram a ser objetos finitos
registrados pela cena. Parar só os tweens numa pausa ou reflow deixa a última
pose visual congelada; por isso a apresentação invalida e destrói esses objetos
transitórios junto com seus timers e animações. Um glint de trilho é derivado do
mesmo `railProgress` que posiciona a locomotiva, não de outro relógio. Assim a
decoração não se adianta ao trem, não invade a foto do cliente e permanece
estática quando a preferência de movimento reduzido está ativa.

## LESSON-061 — A jornada E2E deve tocar o objeto da regra atual

Em 29-08-2026, a suíte de lifecycle do Expresso ainda calculava e tocava a
posição da antiga faixa, embora a regra V2 seja tocar a estação que contém a
foto correspondente. A cena funcionava no navegador, mas a prova automatizada
esperava um evento que não existia mais. O helper foi refeito a partir da
geometria pura de `ExpressLayout`: ele toca o centro da estação escolhida,
preservando o teste de pause, reflow e descarte de canvas sem reintroduzir a
metáfora antiga no runtime.

## LESSON-062 — Desempates Minimax exigem scores exatos na raiz

Em 30-08-2026, o laboratório da Trinca de Natal confirmou que alpha-beta pode
podar normalmente dentro de cada candidato, mas reutilizar a janela podada da
raiz pode transformar um limite em falso empate. Quando a experiência precisa
sortear deterministicamente entre todas as jogadas ótimas, avalie cada jogada
raiz com uma janela nova e reúna apenas scores exatos. Para um tabuleiro 3 × 3,
isso preserva variedade sem justificar cache de transposição na V1.

## LESSON-063 — Canvas Phaser em grid precisa poder encolher

Em 30-08-2026, a revisão da Trinca de Natal ao voltar de um viewport de tablet
para telefone mostrou que a largura intrínseca do canvas podia se tornar o
mínimo de uma célula CSS Grid. O host permanecia largo, o canvas era cortado e
`Scale.RESIZE` nunca recebia a largura móvel. A camada React que contém jogos
Phaser deve declarar `min-width: 0` tanto no estágio quanto no host: assim o
layout pode encolher e o Scale Manager reposiciona os objetos existentes.

## LESSON-064 — Pressionar não é confirmar uma jogada

Em 30-08-2026, a Trinca de Natal passou a separar `pointerdown` de
`pointerup`: o down pertence ao feedback imediato, enquanto o domínio só é
chamado no up do mesmo ponteiro, na mesma Zone, dentro do slop e no mesmo epoch
de apresentação. Guardar essa pequena transação fora da Scene torna arrasto,
resize, pausa e `POINTER_UP_OUTSIDE` cancelamentos explícitos, sem duplicar a
regra pura. O evento `GAME_STARTED` também só deve acompanhar o primeiro
tabuleiro interativo; o relógio compartilhado permanece dono da sua semântica
de duração desde `open()`.

## LESSON-065 — Reconciliar o mural preserva a memória visual da jogada

Em 30-08-2026, a Trinca de Natal deixou de apagar e recriar as nove possíveis
peças em cada `refreshBoard`. O runtime reconcilia o tabuleiro canônico contra
um `Map<CellIndex, PieceView>`: só cria a casa recém-aceita, remove uma peça
quando a nova rodada realmente a esvazia e reposiciona as instâncias existentes
no resize. A regra continua sem conhecer Phaser, mas a fotografia já colocada
mantém identidade visual durante a partida.

## LESSON-066 — Duas mensagens dinâmicas não podem disputar a mesma faixa

Em 30-08-2026, as capturas da Trinca de Natal mostraram que dois textos
centrados, mesmo com posições diferentes, se sobrepõem quando ambos quebram em
duas linhas. HUDs mobile precisam reservar bandas verticais por função e não
por uma altura presumida de texto: marca, progresso, mensagem e contexto.
Durante a jogada, somente uma mensagem contextual permanece ativa; o contexto
é exclusivo de telas de escolha. A prova visual deve incluir resultado e
pensamento, porque são justamente os estados que fazem a cópia crescer.

## LESSON-067 — Navegação contextual também precisa caber no plano de layout

Em 30-08-2026, a primeira versão responsiva da Trinca de Natal ainda permitia
que a marca longa invadisse `← Voltar` na tela de dificuldade: separar faixas
verticais não basta quando dois controles dividem o cabeçalho. O layout puro
deve reservar retângulos para voltar, pausa, título, score, mensagem, contexto,
board e dock, e a marca pode usar sua forma compacta quando o retorno está
visível. O painel de pausa bloqueia o input abaixo e confirma o retorno ao
menu; sem isso, um botão oculto da rodada pode aceitar uma ação enquanto a
partida parece congelada.

## LESSON-068 — A foto pode orientar sem virar uma nova ação

Em 30-08-2026, a Trinca de Natal passou a reaproveitar a textura `A.card` em
um porta-retrato de menu, proporcional e sem qualquer input. O layout puro
reserva esse espaço antes de posicionar cartões de modo e dificuldade; assim a
lembrança explica o contexto nos primeiros segundos, enquanto a única decisão
continua sendo um botão de pelo menos 52 px. Reusar a textura já autorizada
evita novo request, não cria associações visíveis de dados da sessão e mantém
o mesmo contrato de foto do mural.

## LESSON-069 — Materialidade no toque não precisa esperar arte final

Em 30-08-2026, a Trinca de Natal ganhou sombra de contato, bevel interno,
ornamento, compressão e halo dourado no próprio cartão de ação. Esses estados
pertencem aos objetos de UI, não à foto; por isso dão profundidade e resposta
imediata mesmo enquanto a arte raster aguarda proveniência, preparo e
aprovação. O haptic leve é disparado junto do `pointerup` confirmado e nunca
atrasa a transição ou depende de áudio ainda não manifestado.

## LESSON-070 — Nunca anime a escala de uma imagem já dimensionada

Em 30-08-2026, a entrada do menu da Trinca de Natal chamou `setScale()` numa
imagem depois de `setDisplaySize()`. Em Phaser, o segundo método já expressa o
tamanho renderizado por escala; a animação substituiu essa escala proporcional
e ampliou a foto da sessão até ela parecer fundo, deixando a moldura como um
retângulo solto. A correção é animar somente alfa em `Image` já ajustada e
reservar escala para moldura, placa e texto. A mesma regra vale para qualquer
peça fotográfica que entra em uma célula.

## LESSON-071 — Ação que cria o board precisa bloquear o próprio pointer-up

Em 31-08-2026, a Trinca de Natal revelou que o `pointerup` que confirmava uma
lembrança no picker podia alcançar uma Zone de célula criada durante a mesma
transição e aceitar uma peça fantasma. Cada entrada de rodada agora guarda uma
janela curta no runtime antes de aceitar `pointerdown` do board. A janela não
substitui o arbiter nem a regra pura: ela somente separa semanticamente o
gesto de setup do primeiro gesto de jogo. Essa proteção deve existir em todo
fluxo Phaser no qual um botão ou picker materializa superfícies interativas sob
o mesmo ponteiro.

## LESSON-072 — Placar não pode ser uma segunda frase de status

Em 02-09-2026, a Trinca de Natal substituiu a string única de placar por uma
placa com objetos separados para rodada, cada lado, separador e empate. A
mensagem contextual voltou a carregar somente intenção e resultado, enquanto a
placa fica estável durante encaixe e animação. Em jogo de foto para criança,
isso reduz a competição de leitura sem depender apenas da cor: os emblemas e
os docks continuam identificando os dois lados mesmo quando o som e o haptic
não estão disponíveis.

## LESSON-073 — O emblema é fallback de uma foto, não sua legenda

Em 02-09-2026, a revisão visual da Trinca de Natal encontrou o `N`/estrela do
dock desenhado sobre a mini foto já carregada. Embora o runtime conhecesse
corretamente o segundo jogador, o resultado parecia um placeholder e a foto
perdia sua função de identidade. Docks devem ocultar o emblema quando possuem
uma lembrança real e voltar a exibi-lo somente para uma identidade sem foto,
como Noel. O mesmo significado precisa atravessar o hero final: o `N` é
exclusivo do modo Noel; fotos vencedoras usam a marca fotográfica neutra.

## LESSON-074 — Visual final não impede prova técnica mobile antecipada

Em 03-09-2026, o plano do Mosaico em Queda passou a distinguir duas evidências
que não devem ser confundidas. Antes do design freeze são obrigatórias provas
de domínio, integração, lifecycle, assets e um probe técnico local de canvas,
toque, cancelamento, RAF, área útil e recursos; elas observam eventos, digests e
métricas, sem screenshot, preferência estética ou avaliação humana. Capturas,
matriz visual de viewport, comparação de tela, aparelho como aprovação de UX e
observação focal só começam após o design integrado estar aprovado. Se a etapa
visual revelar mudança material, a aprovação de design reabre e a bateria final
é repetida sobre a construção revisada.

## LESSON-075 — Gerar um jogo não basta para compor o catálogo

Em 03-09-2026, o scaffold de Mosaico em Queda confirmou que o gerador cria o
pacote isolado e seu contrato inicial, mas a composição em `apps/play` ainda
exige três passos explícitos: declarar o pacote como dependência workspace do
app, importar somente a definição estática no registry e registrar um loader
dinâmico para o módulo. Ao criar um pacote, atualizar o lockfile e regenerar
`docs/generated/repo-map.md` também fazem parte do check de integração; sem
isso, TypeScript não resolve o módulo ou o mapa canônico fica obsoleto.

## LESSON-076 — Recuperação de ruleset não pode avançar a fila

Em 03-09-2026, o Mosaico em Queda separou o ato de abrir espaço do spawn da
próxima peça. A Ajuda da Oficina só pode alterar linhas visíveis, contadores e
fase para `entry-delay`; sortear a próxima peça continua sendo trabalho do tick
normal do engine. Isso mantém fila, seed e streams aleatórias auditáveis durante
uma recuperação e evita que uma animação ou confirmação de apresentação altere
a partida. Limites de recuperação também pertencem ao modo: normal admite duas
e desafio uma, conforme a especificação de produto.

## LESSON-077 — Passo fixo exige tolerância de ponto flutuante

Em 03-09-2026, o acumulador de 60 Hz do Mosaico em Queda contou quatro passos
quando recebeu exatamente `5 × (1000 / 60)` ms: a representação binária ficou
uma fração abaixo do quinto limiar. O relógio técnico agora compara com uma
epsilon mínima em milissegundos, satura em cinco passos e zera o restante. Isso
mantém o limite de catch-up e evita que um frame nominalmente exato perca uma
simulação por arredondamento; reset de lifecycle continua descartando todo
acúmulo de forma deliberada.

## LESSON-078 — Controle interativo não deve cair novamente no gesto da Scene

Em 03-09-2026, o runtime técnico do Mosaico em Queda confirmou nos tipos do
Phaser que o `pointerdown` de um GameObject interativo precede o evento amplo
da Scene. Sem interromper essa propagação, um segundo toque na dock podia
cancelar a interação atual e ser reinterpretado pelo handler global como novo
arraste do mural. A dock agora é um adaptador separado, confirma apenas seu
ponteiro elegível e chama `EventData.stopPropagation()`. O arbiter de ponteiro
continua a cancelar a transação anterior; a propagação interrompida impede que
o mesmo evento comece uma transação diferente.

## LESSON-079 — A pausa visual de Recovery não pode virar uma regra paralela

Em 03-09-2026, o Mosaico em Queda passou a manter a Ajuda da Oficina visível
por uma janela finita antes de aplicar o relief. A apresentação guarda somente
um horário de prontidão e cancela input; a Scene chama a transição pura já
autorizada, que continua escolhendo e removendo as linhas sem callback de tween
ou VFX. Isso preserva a leitura de “vamos abrir espaço” sem transformar tempo
de animação em fonte de RNG, fila ou colisão.

## LESSON-080 — Dica visual deve transportar conselho, nunca intenção de input

Em 03-09-2026, o Mosaico em Queda passou a projetar o destino já calculado pela
BFS como um contorno de apresentação. O componente aceita a dica com o serial
da peça, confirma que ela ainda corresponde à peça ativa e entrega apenas a
geometria do alvo ao mural e o convite breve à dock. Ele não chama o latch, não
recalcula a rota e não lê o board para descobrir uma jogada. Assim, ghost
continua sendo pouso físico atual e hint permanece conselho opcional mesmo com
resize, pausa ou troca de peça entre a busca e a apresentação.

## LESSON-081 — “Tocou o chão” precisa de evento, não de leitura visual tardia

Em 03-09-2026, o Mosaico em Queda precisou dar peso ao início do lock delay sem
deixar a renderização inferir contato pelo estado do board. A simulação passou
a emitir `piece-grounded` somente na borda `false → true`, antes de qualquer
lock subsequente. A apresentação usa esse efeito para acomodar a moldura por
48 ms; ela não modifica `lockTicks`, não reposiciona a peça e não repete a
resposta a cada tick em solo. Esse padrão mantém feedback físico explícito e
o replay/digest independente de animação.

## LESSON-082 — Fixed-step pode sair da Scene sem entregar lifecycle ao domínio

Em 03-09-2026, o Mosaico em Queda separou o relógio de 60 Hz e a composição de
experiência em um runtime sem Phaser. O adaptador de Scene continua dono de
resize, pausa, ponteiro, áudio e GameObjects, mas fornece frames de input e
recebe atualizações já ordenadas para repassar aos diretores. Essa divisão evita
que a Scene reinterprete lock, recovery, dica ou progresso e, ao mesmo tempo,
não permite que o domínio conheça um callback de RAF, tween ou lifecycle de
canvas. O contrato mínimo é provar que um passo fixo encaminha o efeito e a
resolução de interação exatamente uma vez.

## LESSON-083 — Asset preparado deve substituir o fallback quando o perfil permite

Em 03-09-2026, a luz quente do Mosaico em Queda já tinha manifesto, proveniência
e carregamento por run, mas o porta-retrato ainda usava sempre um retângulo de
fallback. A apresentação passou a preferir a textura própria e a manter o
primitive somente para ausência legítima do arquivo ou perfis que o omitem.
Assim, LOW e movimento reduzido continuam estáveis, enquanto NORMAL exercita o
asset que foi orçado e aprovado para esse papel — sem introduzir uma segunda
fonte de layout ou um efeito por cima da foto.

## LESSON-084 — Moldura sobre foto precisa de abertura, e não de preenchimento

Em 04-09-2026, a confirmação local do Mosaico em Queda revelou que os SVGs de
moldura eram desenhados acima das imagens e ainda continham retângulos opacos:
a foto carregava corretamente, mas ficava invisível. Moldura usada como camada
superior deve ter somente contorno e detalhes fora da abertura; a base de cor
pertence a uma camada abaixo da foto. A mesma inspeção mostrou que `setScale(1)`
depois de `setDisplaySize()` restaura a dimensão nativa de um SVG no Phaser. Em
controles responsivos, estado pressionado deve recalcular `displaySize`, nunca
resetar a escala da imagem.

## LESSON-085 — Máscara clássica não é uma base segura para WebGL no Phaser 4

Em 04-09-2026, a Guirlanda das Lembranças revelou que `GeometryMask.setMask`
emite aviso de não suporte no renderizador WebGL atual do Phaser 4.2.1. Para
assets gerados com transparência, faça o recorte offline e use a textura alfa
diretamente; se for necessário esconder uma área residual, coloque uma camada
visual opaca de composição, nunca uma máscara que só funciona em um renderer.

## LESSON-086 — A orientação da foto é uma decisão de composição antes da moldura

Em 04-09-2026, a passagem privada da Guirlanda das Lembranças mostrou dois
grupos nítidos de proporção em fotos de sessão: retrato próximo de 0,714 e
paisagem próximo de 1,400. Forçar ambos em uma abertura retrato não corta a
foto quando se usa `contain`, mas cria passe-partout excessivo e reduz sua
presença emocional. A Scene deve escolher primeiro a moldura alpha e a janela
interna pela orientação declarada, então posicionar a mesma derivada
proporcional. Essa decisão é visual e fica no runtime: o domínio continua vendo
somente ids e a passagem de validação não deve copiar originais ou caminhos para
`public`, manifesto, logs ou screenshots versionados.

## LESSON-087 — A abertura alpha, e não o tamanho do PNG, define o limite da foto

Em 04-09-2026, a revisão de conclusão da Guirlanda das Lembranças mostrou que
um passe-partout calculado pelo tamanho externo da moldura podia aparecer pelo
alpha entre a alça de veludo e o arco superior. Um `photoInset` deve encolher a
foto dentro de uma abertura já segura; nunca deve aumentar o suporte visual
para fora dela. Calibre uma janela por orientação a partir da abertura real do
asset, prefira um fundo interno escuro a uma faixa branca e confirme o estado
de vitória com derivadas autorizadas em viewport móvel. Se uma moldura grande
encostar em um alvo, a prioridade de input deve recuar quando a peça já está
selecionada; o gesto de arrastar mantém o alvo que capturou o ponteiro.

## LESSON-088 — Foto montada exige margem de arte e estado final recuperável

Na Guirlanda V2, validar somente a hit area de 72 px deixou passar molduras
materiais mais largas que essa área nas bordas do telefone. Layout deve testar
também os limites da arte e a separação da foto central. O domínio pode aceitar
o último encaixe antes da animação acabar: pause/resize deve preservar essa
decisão e concluir a apresentação uma única vez, mesmo se cancelar o callback
de snap. Separar esse estado de apresentação evita perder o painel de vitória
ou contar uma colocação duas vezes. Uma captura do canvas continua necessária
para julgar o encontro entre materiais, não apenas suas coordenadas.

## LESSON-089 — Suítes independentes precisam ser donas do servidor de teste

Dois Playwrights com reuseExistingServer podem compartilhar o mesmo Vite:
encerrar a execução que criou o servidor quebra a outra com connection refused.
Use porta e diretórios de relatório próprios para uma execução independente e
evite concorrer inicializações WebGL em validação visual. Timeout de cold start
não mede fluidez nem prova regressão do jogo: repita isoladamente e registre
a diferença entre falha de infraestrutura e falha reproduzível de produto.

## LESSON-090 — Galeria antes do catálogo pode esconder a escolha principal

Na análise mobile do Hub em 04-09-2026, nove fotos antes dos jogos colocaram o
início do catálogo em cerca de 1.444 px em uma tela de 390 × 844. A barra fixa
de começar ainda favorecia Puzzle, mesmo enquanto a pessoa procurava outro
jogo. A galeria deve ter altura limitada na entrada, e sua expansão deve ocorrer
em uma superfície própria. Contar fotos carregadas ou testar a existência do
card no DOM não prova que a criança consegue descobrir a brincadeira.

## LESSON-091 — Autorização de HTML social não integra as fotos do shell

O servidor de HTML/OG pode autorizar um link enquanto o React ainda usa fixtures
ou um endpoint local. Na revisão de 04-09-2026, o AppRouter não consumia um
catálogo remoto pela sessão da rota. A liberação precisa provar separadamente
HTML autorizado, catálogo JSON autorizado e entrega de cada derivado vinculado
à sessão. Um desses caminhos funcionando não é evidência dos demais.

## LESSON-092 — Uma constante pode desfazer o carregamento separado do jogo

Importar uma constante pura pelo barrel que também exporta o runtime de um jogo
pode inserir o runtime no grafo inicial, mesmo quando seu loader é dinâmico.
Na primeira fatia do novo Hub, a contagem de pares de Memory vinha desse barrel.
Expor a constante pelo entrypoint de metadados remove a dependência do shell
ao runtime. Inspecionar o grafo e os avisos do build além de contar canvas:
zero canvas não significa zero código de motor carregado.

## LESSON-093 — Geometria herdada exige revisão nas larguras de borda

Uma capa nova com width de 100% ainda pode herdar um max-width antigo. Em 768 px,
o botão principal do novo shell ficava limitado a 340 px e desalinhado, embora
passasse nos testes de visibilidade do telefone baixo. A revisão visual
identificou o limite; remover o max-width no escopo da nova capa preservou o
restante da aplicação e corrigiu o alinhamento.

## LESSON-094 — Preparação de áudio precisa de limites independentes do filtro

Um `apad` ilimitado combinado com corte baseado em timestamps produziu um WAV
temporário muito maior que o cue pretendido. Cortar por amostras e limitar a
saída também por duração, bytes e timeout evita que um timestamp inesperado
esgote o disco. Conferir duração e tamanho do intermediário antes de codificar;
o cleanup deve verificar o caminho absoluto e remover apenas o temporário
criado pela própria execução. Fades e normalização não substituem esses limites.

## LESSON-095 — Pausar CSS não cancela a simulação em JavaScript

Uma atmosfera que migra de keyframes para partículas físicas precisa de dono
explícito do rAF. Galeria, background, interseção e movimento reduzido devem
cancelar o frame e zerar o tempo anterior; só esconder ou pausar CSS mantém
trabalho desnecessário. A prova de pausa compara posições por vários frames
reais; uma captura estática ou contagem de partículas não demonstra suspensão.

## LESSON-096 — Evidência privada e relatórios não pertencem ao mapa público

O mapa gerado ignorava somente nomes exatos de `test-results` e
`playwright-report`, enquanto as suítes independentes usavam sufixos. Excluir
também essas variantes e a mídia privada impede que capturas, catálogos locais
e arquivos voláteis apareçam no inventário versionado. Git, formatter e mapa
devem concordar com os diretórios privados de evidência; preservar os arquivos
no disco não exige expor seus nomes no mapa do repositório.

## LESSON-097 — Mudo não deve reconstruir o contexto da partida

O evento tipado de preferência não é um evento de progresso. Atualizar o som
no Hub por bridge, mantendo estável o objeto entregue ao PhaserHost, preserva
canvas, relógio e tabuleiro. O próximo run lê a preferência vigente. Testar a
identidade do canvas e ausência de novos inícios de áudio após mudo/saída.

## LESSON-098 — Visibilidade não pode desfazer uma pausa manual

Separar razões `game` e `visibility` no dono do relógio. Resume de uma razão
remove somente essa razão; nenhuma ordem de eventos de foco/visibilidade deve
liberar uma partida que a criança decidiu manter parada. O runtime também
preserva sua pausa manual e seus efeitos ao receber foco novamente.

## LESSON-099 — Skin tem o mesmo tempo de vida do alvo

Menus substituem botões sem encerrar a Scene. Um skin registrado só no shutdown
mantinha recursos e callback de update além do alvo. Observar também `destroy`
do alvo, remover listeners e destruir Graphics com cleanup idempotente. Para
espessura/vidro arredondado em Graphics, faixas sólidas evitam a limitação do
gradiente por triângulo documentada nos tipos de Phaser 4.2.1.

## LESSON-100 — Telefone baixo precisa otimizar área, não só largura

Forçar duas colunas por um limiar de largura pode produzir quatro ou seis
fileiras minúsculas quando sobra pouca altura. Após os presets confortáveis,
escolher o maior tamanho de carta viável. Conferir canvas real, margens externas
e safe areas; teste em 390 × 844 sozinho não revela o problema de 360 × 640.

## LESSON-101 — Material compartilhado não pode diminuir o alvo principal

Uma regra genérica de botão cristalino com 48 px de altura venceu o mínimo de
52 px das ações de conclusão por especificidade. Definir o mínimo no escopo
final do CTA e conferir o bounding box real na vitória; testar somente os
botões do cabeçalho não cobre a composição React que aparece após o canvas.

## LESSON-102 — Scratch em Phaser 4 precisa provar origem e pixels

RenderTexture tem comandos diferidos: erase/stamp exigem render explícito. Uma
textura por chave desenhada em 0,0 ainda pode usar origem central; no frost isso
produziu um único quadrante de gelo, embora o domínio e a conclusão passassem.
Usar stamp com originX/originY zero para preencher toda a superfície. A prova
precisa inspecionar gelo e raspagem no canvas, além de verificar progresso.

## LESSON-103 — A superfície lógica pode sobreviver à orientação

Manter a resolução lógica do frost e alterar somente posição/displaySize evita
que resize apague um scratch já feito. Progresso deve usar distância ao segmento
nas unidades da menor dimensão fotográfica, para pincel circular e varreduras
rápidas tanto em retrato quanto em paisagem. Reconstituir por células normalizadas
permite recuperar o conteúdo após perda de contexto WebGL sem ler pixels.

## LESSON-104 — Espera fixa não prova uma fase curta de contemplação

Swipes e capturas também consomem tempo, principalmente em tablet emulado. Parar
a raspagem quando a quebra aparece e aguardar o label semântico do canvas prova
o hero de três segundos sem depender da velocidade da máquina. Descrever a fase
em português melhora também o nome acessível; não expor Scene ou códigos de
estado à composição React apenas para testar.

## LESSON-105 — Reutilização precisa conferir owner e capacidades reais

Ao planejar Rudolph, a inspeção confirmou que a composição de molduras pertence
à Guirlanda, o AudioManager não implementa ducking e a galeria da sessão não
persiste resgates. Reutilizar a linguagem visual exige composição no novo owner
ou extração comprovada, sem import entre jogos. O manifesto aceita WebP/SVG e
M4A/MP3, mas não atlas JSON: spritesheets regulares com metadados no runtime
permitem planejar animação sem pressupor suporte inexistente na fábrica.

## LESSON-106 — Material realista precisa sobreviver ao layout e ao movimento

Uma cornija fotográfica comprimida em uma faixa perde o aspecto de neve e gelo.
Manter proporção, inspecionar alpha sobre o fundo real e evitar cortes rígidos
em acúmulos orgânicos. Capa e partida devem usar a mesma textura de presente,
com pivôs/frames coerentes. O teste de raspagem deve comparar um trecho da foto
após as partículas acabarem; comparar o canvas inteiro pode aprovar apenas uma
mudança na neve do cenário. Não formatar código com HMR durante um E2E ativo:
a recarga pode desmontar a partida e invalidar evidência de lifecycle.

## LESSON-107 — Contraste de HUD depende do cenário real

Texto marfim legível no céu escuro desaparece sobre um chão nevado. Usar painel
material com fundo estável e reservar espaço fora da foto. Progresso interativo
precisa de alvos maiores que o desenho da estrela, distinção preenchida/vazia e
resposta finita. Uma dica aponta o alvo, nunca marca o item como encontrado;
testar essa invariância por input real e conferir também a tela girada.

Ao reposicionar uma impressão de foto na capa, redefinir também largura,
altura e aspect-ratio herdados. Mudar apenas inset não anula uma largura
explícita de outra orientação; conferir os quatro limites do retângulo já
rotacionado no viewport. Nos testes de fases temporizadas, aguardar o estado
semântico antes de enviar gestos evita raspar durante a formação do gelo.

No Phaser 4.2.1, `setWordWrapWidth` reprocessa a textura mesmo com o mesmo valor.
Atualizar só quando a largura muda; medir as chamadas de desenho em quadros
estáveis evita pagar esse custo em cada frame. Quando vários trabalhos editam
o checkout, revisar um snapshot do build com derivadas locais evita que HMR
desmonte uma partida durante a validação. Esperar backgrounds CSS carregarem
antes de julgar a composição da capa.

## LESSON-108 — Rig único e apresentação própria preservam a foto

Peças de um mesmo modelo raster mantêm proporção e material durante a corrida
sem gerar poses incompatíveis. No preparo Sharp, extrair a célula para um
buffer intermediário antes de trim evita que a ordem interna corte outra célula.
A moldura pendente legível na queda pode consumir área demais no visor: usar
passe-partout com a foto inteira aumenta o destaque sem distorcer o asset.
Revisar retrato e paisagem no canvas; conter um fundo vertical deixa faixas,
enquanto esticá-lo deforma a vila. Uma composição panorâmica própria resolve.

## LESSON-109 — Remover o canvas não prova o descarte do jogo

No Phaser 4.2.1, `Game.runDestroy` chama `SceneManager.destroy` diretamente:
`SHUTDOWN` não é garantido antes de `DESTROY`. Conectar o mesmo descarte
idempotente aos dois eventos. A inspeção CDP de um canvas já removido encontrou
oito listeners próprios e um `wheel` ainda ligados; a fonte de `MouseManager`
também omite a remoção de `wheel`. O adaptador de Rudolph remove essa inscrição
explicitamente. Testar dez ciclos pela navegação da mesma página, sem `goto`
entre eles, e conferir listeners e encerramento do AudioContext.

Manter captura dos toques normais evita eventos de mouse sintetizados que
acionam Pausa duas vezes. O cancelamento nativo pode ser incancelável; o
adaptador contorna somente esse caso no handler `touchcancel` do Phaser.
Após resize, aguardar as dimensões reais do canvas antes da captura: uma imagem
tirada cedo pode mostrar a rena cortada no layout anterior. Molduras em queda
precisam mover o container, sem recalcular nove regiões e redesenhar a borda
quando seu tamanho permanece constante.

## LESSON-110 — Cache limitado precisa cobrir revisitas e views suspensas

Um contador de tentativas não pode consumir o orçamento de falhas depois de
uma carga bem-sucedida. No álbum de Rudolph, a terceira visita após expulsão
da textura podia ficar permanentemente na variante menor. Zerar esse contador
no sucesso e testar três voltas pelo álbum, conferindo a textura efetivamente
mostrada e o limite de duas fotos grandes.

Uma view suspensa continua dona de sua textura. Usar uma foto grande em um
destaque e depois expulsá-la durante a navegação do álbum destrói o recurso
que o destaque usará ao voltar. Rudolph mantém a foto principal grande retida;
os demais destaques usam a variante menor estável da rodada.

O último evento do shell não representa necessariamente o estado atual do jogo.
Um resgate logo após retomar substitui `GAME_RESUMED` por
`GAME_INTERACTION_SETTLED`. Testar a pausa pelo estado persistente do canvas,
preservando a verificação de que a mesma instância continua montada.

## LESSON-111 — Simulação hidrodinâmica em domo e raspagem com zero GPU readback

Em minijogos móveis no navegador (como o Globo de Neve das Lembranças), ler pixels de volta da GPU (`gl.readPixels`) para detectar área desembaçada trava o pipeline do WebGL e derruba o framerate abaixo de 30 FPS em celulares médios. Separar estritamente a representação lógica da visual resolve o problema com 60 FPS estável:

1. **Domínio Matemático Puro (`SteamGrid`)**: Uma grade lógica discretizada 16×16 calcula a raspagem através de interseção de segmentos de reta, atribuindo peso dobrado à `faceSafeZone` da fotografia.
2. **Visual em Camada (`GlobeGlassController`)**: Um `Phaser.GameObjects.RenderTexture` aplica `surface.erase(brush, x, y)` somente nas coordenadas interpoladas do toque do jogador, usando uma flag `dirty` para evitar redesenhos desnecessários quando não há toque ativo.
3. **Física de Neve Confinada em Círculo**: Partículas de neve em suspensão hidrodinâmica usam um pool estático limitado (60 em NORMAL, 24 em LOW), rebote esférico suave e repulsão radial centrada nos rostos, garantindo que as pessoas fotografadas nunca fiquem encobertas durante as interações com o brinquedo.

## LESSON-112 — Acoplamento físico unificado em 2.5D, montagem de domo e catraca mecânica

Em brinquedos e autômatos virtuais 2.5D com fotografia familiar, elementos visuais isolados (como domo de vidro, base de madeira, botões e chave) quebram a ilusão física se suas coordenadas forem calculadas independentemente.

1. **Montagem Física Unificada (`SnowGlobeAssembly`)**:
   Uma única estrutura de montagem governa as proporções e profundidades relativas: a gola torneada de latão da base de madeira acolhe a curvatura inferior do domo esférico (~26% de embutimento no topo da base); os soquetes dos botões musicais e a bucha do eixo da chavinha são calculados parametricamente a partir da malha da base (`baseWidth > dome.diameter`); o nicho interno posiciona a fotografia do cliente em profundidade `z` intermediária, emoldurada por reflexos de Fresnel (ouro quente à esquerda da lareira, azul frio do inverno à direita).
2. **Diorama Fotográfico em Relevo (`GloboPhotoDiorama`)**:
   Evita que a foto do cliente pareça uma imagem solta colada no fundo. O porta-retrato interno possui pedestal torneado de mogno com pés de apoio em latão, passe-partout de veludo escuro (`#180c06`), moldura dourada trabalhada com florões nos cantos e estrela de topo, respeitando enquadramento `contain` e repulsão radial para que a neve em suspensão nunca encubra os rostos.
3. **Catraca Mecânica e Acumuladores Paralelos Livres**:
   Para um brinquedo de Natal intuitivo, a criança deve poder alternar livremente entre dar corda e apertar botões coloridos sem ser travada por sequências rígidas. A chave mecânica utiliza rastreamento angular contínuo, cliques de catraca a cada 18° (`Math.PI / 10`), resistência progressiva de mola e micro-folga elástica (~4.5°), enquanto os botões contam com afundamento de êmbolo de 4px, resposta sonora imediata a 0ms e permissão de repetição musical a qualquer momento.

## LESSON-113 — Isolamento de camadas 2.5D, desacoplamento de cenário e física balística de estilingue

Em jogos natalinos infantis baseados em estilingue e física 2.5D (como o Estilingue Mágico das Lembranças):

1. **Cenário Limpo Desacoplado de Objetos Interativos**:
   Um arquivo de background fotográfico nunca deve conter elementos interativos (estilingue, alvos, botões de prateleira ou moldura com foto falsa) pré-renderizados em seus pixels. O fundo deve ser uma imagem arquitetural limpa da sala aconchegante (`depth: 0`), enquanto o garfo entalhado de madeira (`depth: 20`), os elásticos de borracha e bolsa de couro (`depth: 21..22`), a bola de neve sombreada (`depth: 24`, ou `30` em voo), a moldura dourada vazada (`depth: 15`), os alvos pendulares (`depth: 8`) e os medalhões táteis (`depth: 40`) existem como GameObjects independentes do Phaser. Isso elimina duplicação de controles e garante que o movimento físico seja visível sem artefatos estáticos ao fundo.

2. **Física Balística Integrada e Elásticos em Verlet**:
   Para o elástico do estilingue responder com naturalidade ao toque, cada banda é simulada via nós discretizados em Verlet com relaxamento de restrições e propagação de ondas transversais, permitindo oscilação e chicotada rápida no disparo. A linha guia de pontilhados com ponta de flecha calcula a trajetória por integração balística direta das equações de gravidade e arrasto do motor Matter.js, assegurando que o ponto de impacto previsto coincida exatamente com o local atingido pelo projétil.

3. **Fotografia Herói e Enquadramento Seguro**:
   A foto da criança/família é o elemento central e herói da cena, posicionada no centro do nicho da moldura barroca com modo de escala `contain` estrito, assegurando proteção total à `faceSafeZone` sem cortes ou distorções. Os 4 talismãs recolhidos ao acertar os alvos voam em arcos suaves de Bézier até os soquetes da moldura, culminando em celebração dourada com zoom de câmera suave sobre a foto da lembrança.

## LESSON-114 — Projeção volumétrica contínua, enquadramento relativo de fotografia e trilha natalina autêntica

Ao implementar mecânicas de projeção óptica, iluminação volumétrica (_God Rays_) e celebração de fotografia em jogos natalinos para celular (como na Lanterna Mágica):

1. **Geometria de Projeção e Eliminação de Cortes Horizontais**:
   Ao simular feixes volumétricos emanando de um projetor na base em direção a uma moldura fotográfica no topo, os vértices dos polígonos de luz devem estender-se até o topo da moldura (`topY = sb.y - 14`) e abranger toda a largura com sobreposição lateral suave (`leftX = sb.x - 24`, `rightX = sb.x + sb.width + 24`). Definir o alvo como a borda inferior (`sb.y + sb.height`) interrompe os raios exatamente onde a fotografia começa, criando um corte reto não-físico. Adicionalmente, raios crepusculares ganham vida através de varredura harmônica contínua ($\theta_i(t) = \theta_i^0 + A \cdot \sin(\omega_i t + \phi_i)$) e ondas de fótons viajando ao longo de cada raio.

2. **Perigo de Escala Absoluta em Tweens vs. `setDisplaySize`**:
   Quando uma foto com textura em alta resolução (ex.: 1143×1600 px) é posicionada com `setDisplaySize(width, height)`, o Phaser ajusta internamente `scaleX = width / texture.width` (~0.10). Um tween posterior que define `scaleX: 1.05` absoluto multiplica o tamanho da imagem por mais de 10x, fazendo a fotografia transbordar da moldura e invadir todo o cenário. Tweens de celebração devem sempre usar multiplicação relativa à escala base (`scaleX: baseScaleX * 1.05`), associados a uma máscara geométrica (`GeometryMask`) contida nos limites da moldura barroca.

3. **Paisagem Sonora Natalina e Timbre Real**:
   Sintetizadores WebAudio de onda pura (senoidal/triangular) não transmitem o calor emocional do Natal. Utilizar faixas orquestradas e masterizadas em caixinha de música de Natal (`musicbox-loop.mp3`), celesta, sinos de trenó (_sleigh bells_) e fanfarra de celebração (`musicbox-celebrate.mp3`), combinadas com ducking dinâmico suave durante a revelação da foto, entrega imediatamente a atmosfera aconchegante e mágica descrita na bíblia artística do estúdio.

## LESSON-115 — Publicação da auditoria e recorte do primeiro piloto

Uma bancada fotográfica privada não pode ser copiada integralmente para um
repositório público. Publicar documentos anonimizados, medições agregadas e
recibos dos arquivos-fonte; manter fora nomes, telefones, caminhos locais,
fotografias, screenshots, hashes individuais de mídia e snapshots de código
privado. Gerar novamente o PDF a partir da edição pública, em vez de apenas
renomear o relatório interno.

O primeiro piloto de galeria e jogos pode avaliar entrega manual do link e UUID
CRM explicitamente conferido, preservando sessão persistente, autorização por
mídia, revisão completa e replay. A cadeia de outbox, inbox e reconciliação é
requisito antes de habilitar envio automático. Distinguir esse recorte proposto
do plano completo e da integração realmente implementada. Os 6,62 MB medidos
para 90 derivados são o peso de toda a coleção; não comprovam carga inicial,
memória decodificada nem performance em Android/iOS.
