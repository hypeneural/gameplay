# CG-MOSAICO-EM-QUEDA — plano canônico de implementação

**Estado:** proposta técnica revisada em 03-09-2026. Este plano não seleciona
o jogo nem autoriza código, assets ou registro no catálogo por si só.

**Produto:** [Mosaico em Queda](../product/MOSAICO_EM_QUEDA.md).

**Decisões:** DPMEQ-002 define um engine de tetrominós preciso sob um ruleset
infantil. DPMEQ-003 mantém a validação visual como etapa final, mas permite
provas técnicas locais de runtime mobile durante a construção.

## Resultado, escopo e sequência

A criança move, gira e baixa peças para completar quatro linhas. Cada limpeza
atualiza o **Memory Frame** e a vitória revela a foto protagonista inteira. A
fotografia é recompensa e vínculo emocional; nunca altera geometria, sequência
de peças, colisão, dificuldade ou o resultado do engine.

```text
Engine: SRS, saco de sete, buffer, lock, ghost, top-out e replay
   ↓
Ruleset: normal/desafio, meta, recuperação e dica
   ↓
Experiência: planos de foto, Frame, mural, dock, áudio e vitória
   ↓
Probe técnico mobile: toque, RAF, lifecycle, recursos e área útil
   ↓
Design freeze aprovado pelo proprietário
   ↓
Validação visual/UX final: canvas, viewport, aparelho e observação focal
```

| Entra na V1                                         | Fica deliberadamente fora                        |
| --------------------------------------------------- | ------------------------------------------------ |
| Saco de sete, SRS, buffer, ghost e top-out          | Queda total, peça guardada e giro de 180°        |
| Lock delay com teto de 15 resets por peça           | T-spin, combo, back-to-back e placar competitivo |
| Fixed-step de 60 Hz, replay e estado determinístico | Download de fotos durante a rodada               |
| Repetição horizontal, queda suave e gesto opcional  | Crop, máscara, tint, filtro ou shader na foto    |
| Próxima peça única, sem foto                        | Fila longa, ranking, vidas e pressão de tempo    |

A dock expõe somente giro horário. **Baixar** move uma célula por pressão; não
é queda total. “Manter pressionado” significa somente repetição horizontal de
esquerda/direita — nunca a mecânica de guardar uma peça.

### Regra de sequenciamento

De D0 a D6 são permitidos testes de domínio, contrato, integração funcional,
lifecycle, assets, privacidade e **Technical Mobile Probe**. Este último é uma
prova técnica local, sem screenshot e sem conclusão estética: pode usar canvas
real, toque real, Android escolhido, área útil, mudança de orientação, RAF,
contexto de renderer, áudio, texturas e teardown para observar eventos,
digests, contadores e métricas. Ele não compara composição, não fixa matriz
visual, não faz observação focal e não altera direção de arte por preferência de
tela.

Capturas, comparação de screenshots, matriz visual de viewports, aprovação de
canvas, teste humano e observação focal começam exclusivamente em D7, quando
P4 estiver aprovado. Um probe técnico não substitui nem antecipa essa aprovação.
Se D7 revelar mudança material de design, P4 reabre, a construção é ajustada e
a validação visual final é repetida.

### Changelog de revisão MR-001 — runtime mobile nativo

| Problema encontrado                                                                    | Evidência                                                                                                                                                                                                                                                               | Risco mobile                                                                | Alteração no plano                                                                             | Gate que prova a decisão                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| DPMEQ-003 proibia também investigação técnica no aparelho.                             | A validação visual final é uma escolha de processo; `requestAnimationFrame` acompanha a taxa do display e pausa em aba oculta ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)).                                                   | Descobrir apenas em D7 toque, browser chrome ou frame pacing incompatível.  | Separa Technical Mobile Probe (D4–D6) de aprovação visual/UX (D7).                             | MEQ-16; P4 ainda bloqueia D7.                              |
| Simulação 60 Hz poderia ser confundida com apresentação a 60 FPS.                      | O `TimeStep` do Phaser documenta que seu alvo não obriga a cadência do browser; RAF é o caminho nativo ([TimeStep](https://docs.phaser.io/api-documentation/class/core-timestep), [RAF](https://docs.phaser.io/api-documentation/class/dom-requestanimationframe)).     | Judder ou energia desperdiçada em telas 90/120 Hz.                          | Contrato de relógios: engine fixo, render nativo, acumulador limitado e sem `forceSetTimeOut`. | D4: digest, reset de acumulador e intervalos ativos.       |
| Métricas poderiam duplicar fórmulas já existentes na plataforma ou alegar memória GPU. | `PresentationFrameSampler`/`FrameBudgetMonitor` já são os primitivos de medição; o contrato de performance separa estimativa decodificada de memória real.                                                                                                              | Números inconsistentes ou diagnóstico enganoso.                             | `MosaicTechnicalProbe` apenas orquestra métricas locais e contadores de Scene.                 | D4/D5 e protocolo Android; orçamento só fecha no aparelho. |
| Browser pode sequestrar um gesto e emitir cancelamento.                                | `pointercancel` ocorre quando o browser assume a manipulação; `touch-action` declara o gesto da superfície ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)). | Peça parece travar, segundo dedo envia comando ou input sobrevive ao pause. | Dono único, cancelamento centralizado e `touch-action: none` apenas no canvas da fábrica.      | D4: sequência pointer/cancel/hidden/resize/orientação.     |
| Scale do canvas não resolve geometria nem área útil do telefone.                       | Scale Manager controla o canvas, não o layout completo ([Phaser](https://docs.phaser.io/api-documentation/class/scale-scalemanager)); `VisualViewport` pode divergir da área layout ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)).           | Dock em área insegura, gesto pendente e reflow que muda jogo.               | `MosaicLayout` puro recebe bounds úteis do host e atualiza objetos existentes.                 | D4 técnico; D7 matriz visual por área útil.                |
| Pools, VFX e som não tinham limite/arbítrio explícito.                                 | O pool de células já evita churn; feedback concorrente precisa ser finito e sem autoridade de domínio.                                                                                                                                                                  | GC, long frames e ruído em lock + clear + Frame.                            | Invariantes de GameObjects, orçamento finito de VFX e `MosaicAudioDirector` com prioridades.   | D5 contadores; D6 testes de efeitos; D7 Mobile Feel Gate.  |

## Stack e fronteiras

```text
apps/play → rota, sessão, capa, PhaserHost, bridge e registro lazy
                    │ GameContext + GameModule
                    ▼
packages/games/mosaico-em-queda
  definition → domain/engine puro → domain/ruleset → runtime Phaser
                    │
                    ▼
packages/platform + packages/theme + media pipeline + asset factory
```

| Elemento existente                                            | Uso no Mosaico                                                   | Mudança                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| GameDefinition, GameModule e PhaserHost                       | Módulo lazy e um Phaser.Game por entrada.                        | Nenhuma no contrato.                                    |
| SeededRandom, GameRunController e GameBridge                  | Semente reprodutível e ciclo idempotente; sem eventos por frame. | Nenhuma.                                                |
| SceneScope e PhotoSurface                                     | Recursos por runId; fotos proporcionais em Frame, bloco e hero.  | Novo consumidor.                                        |
| PresentationFrameSampler, FrameBudgetMonitor e HapticFeedback | Métricas locais, qualidade de boot e haptic progressivo.         | `MosaicTechnicalProbe` os compõe; não duplica fórmulas. |
| Media pipeline e Asset Factory                                | Variantes autorizadas, orçamento e arte final auditável.         | Novo manifesto após o primeiro asset final.             |

O domínio não importa Phaser, React, DOM, URL, foto, Date.now ou Math.random.
Phaser não usa Arcade Physics nem Matter para a geometria: a verdade do jogo é
a grade inteira e fits(). O runtime só renderiza, coleta input, toca áudio,
organiza layout, executa efeitos e descarta recursos.

Assets carregados ficam disponíveis às Scenes do mesmo Phaser.Game; chaves de
textura são escopadas por runId e Game Objects morrem antes de as texturas serem
removidas. Isso segue a documentação oficial do
[Loader](https://docs.phaser.io/phaser/concepts/loader). A Scene chama update
enquanto está em execução; shutdown permite nova ativação e destroy é terminal,
como definem [Scenes](https://docs.phaser.io/phaser/concepts/scenes) e seus
[eventos](https://docs.phaser.io/api-documentation/4.0.0/event/scenes-events).

## Contrato de apresentação e runtime mobile

### Dois relógios, uma única verdade mecânica

```text
RAF / Phaser update (60, 90, 120 Hz conforme display)
                         │
                         ▼
                  acumulador limitado
                         │
                         ▼
MosaicSimulation.step() 60 Hz fixo → efeitos semânticos → apresentação
```

`Scene.update(time, delta)` alimenta o acumulador; não contém regra de
colisão. `FIXED_STEP_MS = 1000 / 60`, no máximo cinco passos de simulação são
executados por apresentação e o resto é descartado para impedir uma espiral de
recuperação. O acumulador é zerado antes de aceitar novo input em
pause/hidden/blur/resize/orientação/SHUTDOWN/exit. A configuração mantém RAF
nativo (`fps.forceSetTimeOut: false`, `fps.limit: 0`); `fps.target` não é
contrato de render a 60 FPS. O renderer é `Phaser.AUTO`, sem física, para que o
fallback suportado continue possível. Não ajustar prematuramente
`powerPreference`, `desynchronized`, filtros ou limite de texturas: o probe
captura baseline e P5 decide com evidência Android.

### Probe técnico local, sem telemetria nem julgamento visual

`runtime/phaser/MosaicTechnicalProbe.ts` será habilitável apenas em laboratório
ou debug local. Ele compõe `PresentationFrameSampler`,
`summarizeFrameDeltas` e, no boot, `FrameBudgetMonitor`; não recria percentis ou
limites globais. Durante estado ativo, exclui abas ocultas e registra somente:

- `activeFrameDelta` P50/P95/P99, maior frame e quantidade de frames longos;
- intervalo de refresh observado e razões de delta por intervalo como
  diagnóstico — nenhum P95 universal é aceito antes da referência Android;
- latência de laboratório `pointerdown → primeiro frame que apresenta a
transição semântica correspondente`, não até um frame arbitrário;
- tipo de renderer, número de texturas, pixels/RGBA decodificados estimados,
  apresentadores de célula, efeitos vivos e sons/tweens gerenciados que a Scene
  puder contar com segurança;
- snapshots antes/depois de shutdown para canvas, listeners, texturas,
  GameObjects e áudio pertencentes ao run.

Não há envio, persistência analítica ou captura de foto, URL, seed de usuário,
input bruto ou dado pessoal. Pixels decodificados são uma estimativa de memória
de imagem, **não** memória GPU/driver. O probe produz evidência de arquitetura,
não nota estética nem teste visual.

### Dono de toque e cancelamento

O host já declara `touch-action: none` para `.phaser-host canvas`; Mosaico deve
testar e preservar essa regra escopada, jamais acrescentar listener global de
gesto ou desativar toque no shell inteiro. A configuração inicial declara
`input.activePointers: 2`, `input.windowEvents: true` e `input.smoothFactor: 0`:
há ponteiro suficiente para cancelar quando um segundo dedo chega, eventos fora
da superfície continuam detectáveis e a coordenada de gesto não é suavizada. A
Scene usa os eventos Phaser, inclusive `POINTER_UP_OUTSIDE`. Como não cria uma
captura DOM própria, não deve manter um segundo fluxo de `lostpointercapture`
em paralelo; cancelamentos chegam pelo ciclo Phaser e pelos limites de
lifecycle.

`MosaicGestureInput` é dono de um `pointerId`. `MosaicDockInput` usa
`pointerdown` para esquerda/direita/giro/baixar; somente o gesto opcional usa a
transação `down → move → up`. `pointer.wasCanceled`, segundo ponteiro,
`POINTER_UP_OUTSIDE`, pausa, visibilidade, blur, resize, orientação e saída
chamam a mesma operação `cancelInteraction(reason)`: liberam dono, repetição e
estado temporário sem enviar comando ao engine. Cada input carrega epoch do run;
callback de epoch anterior é ignorado. Nenhuma animação visual toma essa posse.

### Área útil, Scale e reflow

O shell React continua dono de `100dvh` e dos `safe-area-inset-*`; o elemento
pai direto do canvas deve ter dimensão definida e padding zero. O adapter da
Scene coleta o _host bound_ já protegido pelo shell e coalesça `Scale.RESIZE`,
orientação e, se existir, `visualViewport.resize`, para criar um
`MosaicLayoutInput` puro. Em cada alteração:

```text
cancelInteraction("viewport-change")
→ recalcular MosaicLayout(bounds úteis)
→ reposicionar/redimensionar GameObjects existentes
→ engine, seed, bag, replay e acumulador permanecem independentes
```

`MosaicLayout` não recebe largura isolada: recebe largura e altura úteis,
insets efetivamente aplicados e categoria (`compact-portrait`,
`standard-portrait`, `tall-portrait`, `tablet-portrait`,
`compact-landscape`, `standard-landscape`). As referências 390, 412, 430 e 768
CSS px continuam na matriz **visual** D7, sempre registrando altura CSS e área
útil real. A adoção de `viewport-fit=cover` exige verificar primeiro a meta
viewport e o shell de `apps/play`; não é uma mudança do pacote do jogo.

### Apresentação sem autoridade, reuso e feedback

Horizontal e rotação fazem _snap_ lógico e visual no primeiro frame disponível:
não há tween de 90° da foto nem bloqueio até fim de animação. Input só fica
indisponível nas fases semânticas do engine/ruleset (`line-clear-delay`,
`entry-delay`, recovery, completado), nunca porque um efeito ainda toca. Queda
suave, se prototipada após o baseline D4, é uma flag de apresentação: interpola
`visualY`, mas collision, ghost, lock, input e replay usam somente a posição
lógica inteira.

Os 112 apresentadores do mural, quatro da peça ativa e quatro do ghost são
alocados uma vez. Durante jogo, lock e clear, não se cria/destrói GameObject de
célula: apenas `visible`, posição, textura, alpha e frame mudam. VFX possui
orçamento declarado no Creative Slice e manifesto: máximo de emissores,
partículas vivas e lifetime; qualquer pool é finito e propriedade da Scene.
LOW/reduced-motion elimina partículas não essenciais, nunca a leitura do estado.

`MosaicAudioDirector` consome efeitos semânticos e não observa board. O
vocabulário inclui pressionar UI, girar, bloqueio, lock, clear, revelar Memory
Frame, Alívio da Oficina e vitória. A tabela de prioridade resolve efeitos no
mesmo tick (vitória > Frame > clear > lock > rotate/bloqueio > UI); pode trocar,
combinar ou atenuar sons, mas não usar callback de áudio para alterar o domínio.
ARR não toca uma amostra por célula. Visual é obrigatório, áudio é opcional e
haptic é aprimoramento progressivo via `HapticFeedback`; ausência/falha de
vibração é no-op seguro. Mute, pause e teardown param sons e removem seu dono de
unlock no mesmo `SceneScope`.

## Portas de produto

| Porta | Decisão                                                        | Dono         | Bloqueia                      |
| ----- | -------------------------------------------------------------- | ------------ | ----------------------------- |
| P0    | Selecionar este como próximo jogo.                             | Proprietário | Scaffold e código novo.       |
| P1    | Aprovar DPMEQ-002, nome independente e contrato D0.            | Proprietário | Engine e ruleset.             |
| P2    | Aprovar Oficina/Mural, primeira ação e Ajuda da Oficina.       | Direção      | Experiência e fotos.          |
| P3    | Aprovar Creative Slice Card e plano de assets como referência. | Direção      | Design integrado.             |
| P4    | Aprovar o design final construído (design freeze).             | Proprietário | **Início de D7 visual/UX.**   |
| P5    | Indicar Android físico de referência.                          | Proprietário | Orçamento mobile e liberação. |

Enquanto P0 e P1 não estiverem aprovadas, a saída é exclusivamente
documentação. P4 só pode ser solicitado ao fim de D6: especificação e prova
funcional não equivalem a aprovação visual. P5 pode ser indicado antes para
executar probes técnicos em D4–D6, mas não antecipa o gate visual.

## Contrato mecânico fechado antes de D2

### Separação física de responsabilidades

```text
src/domain/
  engine/   → fatos geométricos e temporais
  ruleset/  → metas, modos, recuperação e dica
  photos/   → planos puros de slots e Memory Frame
  layout/   → geometria abstrata, sem Phaser
```

| Engine decide                                            | Ruleset decide                                         |
| -------------------------------------------------------- | ------------------------------------------------------ |
| encaixe, spawn, rotação, gravidade, lock, clear, top-out | meta, modo, recuperação, progresso e dica              |
| bag, fila, buffer, ghost e replay                        | quando a experiência termina e o marco do Memory Frame |
| quais linhas estão completas                             | como comunicar resultado sem alterar a física          |

Recovery policy só seleciona linhas; a operação estrutural applyReliefRows
continua no engine e é determinística. Nenhuma condição de modo entra em
MosaicBoard.

### Estado, relógios e efeitos

```ts
type MosaicEnginePhase = 'active' | 'line-clear-delay' | 'entry-delay' | 'top-out';

interface MosaicRules {
  readonly engineVersion: 1;
  readonly rulesetVersion: 1;
  readonly columns: 8;
  readonly visibleRows: 14;
  readonly bufferRows: 4;
  readonly tickRate: 60;
  readonly gravityIntervalTicks: number;
  readonly lockDelayTicks: number;
  readonly maxLockResets: 15;
  readonly lineClearDelayTicks: number;
  readonly spawnDelayTicks: number;
  readonly dasTicks: number;
  readonly arrTicks: number;
  readonly touchSoftDrop: 'one-cell-per-press';
  readonly keyboardSoftDropRepeatTicks: null;
  readonly targetLines: 4 | 7;
}

interface MosaicEngineState {
  readonly board: MosaicBoard; // 8 × 18; primeiras quatro linhas são buffer
  readonly active: ActiveTetromino | null;
  readonly next: TetrominoKind;
  readonly bag: readonly TetrominoKind[];
  readonly phase: MosaicEnginePhase;
  readonly grounded: boolean;
  readonly pendingClearRows: readonly number[];
  readonly phaseTicks: number;
  readonly tick: number;
  readonly gravityTicks: number;
  readonly lockTicks: number;
  readonly lockResetCount: number;
  readonly lastHorizontalPress: 'left' | 'right' | null;
}

interface MosaicInputFrame {
  readonly leftPressed: boolean;
  readonly leftHeld: boolean;
  readonly rightPressed: boolean;
  readonly rightHeld: boolean;
  readonly rotateCWPressed: boolean;
  readonly rotateCCWPressed: boolean;
  readonly softDropPressed: boolean;
  readonly softDropHeld: boolean;
}

interface MosaicTransition {
  readonly state: MosaicEngineState;
  readonly effects: readonly MosaicEffect[]; // ordem estável de emissão
}

interface MosaicReplayRecord {
  readonly engineVersion: 1;
  readonly rulesetVersion: 1;
  readonly inputEncodingVersion: 1;
  readonly runSeed: number;
  readonly frames: readonly MosaicInputFrame[];
  readonly checkpoints?: readonly ReplayCheckpoint[];
}
```

Grounded é fato geométrico, não phase. Recovering e completed pertencem à
experiência, não ao engine. PendingClearRows e phaseTicks impedem que tween,
áudio ou callback liberem spawn, compactação, lock ou vitória. Um tick pode
emitir vários efeitos ordenados: piece-locked, lines-detected,
progress-changed e target-reached.

Os números canônicos são ticks, não milissegundos.

| Regra       | Normal               | Desafio            |
| ----------- | -------------------- | ------------------ |
| Gravidade   | 66 ticks (~1.100 ms) | 54 ticks (~900 ms) |
| Lock        | 39 ticks (~650 ms)   | 30 ticks (~500 ms) |
| DAS         | 13 ticks (~217 ms)   | 10 ticks (~167 ms) |
| ARR         | 5 ticks (~83 ms)     | 3 ticks (50 ms)    |
| Clear delay | 14 ticks (~233 ms)   | 11 ticks (~183 ms) |
| Entry delay | 0 ticks              | 0 ticks            |

SpawnDelayTicks existe mesmo sendo zero na V1: animação nunca controla o
nascimento da próxima peça. No mobile, toque sempre avança uma célula por
pressão. A queda suave de teclado é suporte de desenvolvimento e não repete.

O acumulador usa 1000 / 60 ms por passo, aceita no máximo cinco passos por
render e descarta tempo excedente. Pausa, aba oculta, foco perdido, resize e
saída invalidam input e zeram acumulador; o jogo não executa uma cascata de
movimentos atrasados.

### Ordem exata de um tick

```text
1. validar phase; encerrar delays vencidos
2. ler bordas de input e resolver giro
3. resolver horizontal: toque inicial, DAS e ARR
4. resolver soft drop
5. resolver gravidade
6. recalcular grounded
7. avançar/reiniciar lock delay conforme contrato
8. se lock: fixar, detectar linhas e entrar em clear-delay ou entry-delay
9. ao fim do clear-delay: compactar, emitir progresso e entrar em entry-delay
10. ao fim do entry-delay: spawn; detectar block-out/lock-out aplicável
```

Se esquerda e direita chegarem no mesmo frame sem histórico, o resultado é
neutro. Caso contrário, a última direção pressionada vence enquanto ambas
estiverem pressionadas. A fonte de input, e não Phaser, envia bordas e estados
mantidos ao engine e ao replay.

Ação válida executada quando a peça estava no chão reinicia lock apenas se ainda
houver orçamento; então incrementa lockResetCount. O contador nasce em zero
para cada peça, nunca é zerado quando ela deixa o chão e não passa de 15. Ação
inválida não muda geometria, relógio ou contador.

### Peças, spawn, top-out e RNG

As quatro rotações de cada forma são coordenadas pré-computadas; não há
transpose/reverse de matriz em runtime. I usa tabela SRS própria, J/L/S/T/Z
outra e O não gira. A tabela de spawn recebe golden test por forma. Em
coordenadas locais, com origem (column: 2, row: 1):

| Peça | Células na rotação inicial, relativas à origem |
| ---- | ---------------------------------------------- |
| I    | (0,1) (1,1) (2,1) (3,1)                        |
| O    | (1,0) (2,0) (1,1) (2,1)                        |
| J    | (0,0) (0,1) (1,1) (2,1)                        |
| L    | (2,0) (0,1) (1,1) (2,1)                        |
| S    | (1,0) (2,0) (0,1) (1,1)                        |
| Z    | (0,0) (1,0) (1,1) (2,1)                        |
| T    | (1,0) (0,1) (1,1) (2,1)                        |

As posições absolutas resultantes e pivôs fazem parte dos golden tests. A origem
está no buffer; a área renderizável começa na linha 4.

Há dois top-outs na V1: **block-out**, quando a próxima peça não cabe no spawn;
e **lock-out**, quando, depois de eventual limpeza/compactação, todos os quatro
minós recém-fixados permanecem no buffer. Partial lock-out não termina rodada.
O engine emite top-out; não abre espaço, não decreta derrota e não escolhe
recuperação.

Uma seed de rodada é derivada em três streams independentes:

```text
runSeed → hash(runSeed, "pieces")       → SevenBag
        → hash(runSeed, "materials")    → materialSlot por serial
        → hash(runSeed, "presentation") → efeitos não mecânicos
```

Platform.Random não precisa ganhar fork(): derivação hash local e testada é
suficiente. MaterialSlot é número e não participa de fits(). Uma rodada com uma
ou seis fotos gera mesma fila e digest geométrico para seed e frames iguais.
Replay não contém foto, URL, id, token, caminho ou quantidade de fotos;
metadado de apresentação fica fora dele. Checkpoints de digest a cada 300 ticks
são recomendados para QA.

### Clear, recuperação, dica e próximo

Ao fixar peça, o engine detecta linhas cheias e grava todas em pendingClearRows.
Somente no fim do delay compacta simultaneamente de baixo para cima, inclusive
linhas não adjacentes. Memory Frame atualiza uma vez por lock: seleciona o
último marco atingido; se a meta foi alcançada, vai direto ao hero.

Depois de top-out, MosaicRecoveryPolicy do modo normal pode ativar no máximo
duas vezes:

1. Inspecionar só as 14 linhas visíveis.
2. Escolher até duas linhas não vazias de menor índice.
3. Removê-las simultaneamente.
4. Compactar todas as células, inclusive as originadas no buffer.
5. Preservar seed, bag, próxima peça, progresso e replay; não consumir RNG.
6. Emitir rows-relieved com os índices removidos.

Se houver uma linha visível ocupada, remove uma. Buffer não é candidato direto.
A alteração deliberada do board entra no replay como transição determinística de
ruleset, nunca como escolha do renderer.

Há uma única próxima peça, apresentada como silhueta sem foto. A dica só busca
estados alcançáveis por BFS (left, right, giro horário e down); prioriza limpar
linha, menos buracos, menor altura e menor bumpiness. Devolve intenção com
pieceSerial e nunca move a peça.

Os detalhes de SRS, lock-reset e top-out acima são contrato explícito deste
jogo. A descrição pública do [Tetris](https://play.tetris.com/about) confirma o
ciclo de mover, rotacionar e baixar tetrominós, mas não publica especificação
completa desses detalhes modernos; referências como
[SRS](https://tetris.wiki/SRS) são comportamentais, não alegações de
certificação oficial.

## Fases de entrega

### D0 — contrato de produto, mecânica e design

**Situação:** documentação preparada; depende de P0–P2.

- [x] Registrar fantasia, primeira ação, duração, vitória e limites.
- [x] Registrar engine/ruleset, tick, spawn, SRS, seed, top-out, recovery,
      replay e input.
- [x] Registrar DPMEQ-003: probe técnico permitido, validação visual/UX só após P4.
- [ ] Aprovar P0–P2.
- [ ] Produzir Creative Slice Card: foto → ação → mural, zonas protegidas,
      instrução, LOW/reduzido e beats de feedback. É decisão de direção, não
      prova visual de runtime.

### D1 — scaffold isolado

Após P0:

```powershell
pnpm game:new mosaico-em-queda
```

Completar definition.ts com id mosaico-em-queda, minPhotos 1,
recommendedPhotos 4, seleção subset e supportsMixedOrientation true. Só então
adicionar loader lazy em apps/play/src/phaser/gameRegistry.ts. Platform e theme
não importam jogo, e a capa não carrega Phaser antes de Jogar.

**Check D1 — 03-09-2026:** concluído. O gerador criou o pacote isolado,
`definition.ts` recebeu a metadata aprovada e `apps/play` passou a compor apenas
o loader lazy. O teste do registry e a suite de 188 testes confirmam a
descoberta sem montar Phaser.

### D2 — engine puro e conformance mecânica

Implementar antes de Scene, arte ou carregamento de foto:

| Área / arquivo                              | Responsabilidade                                         |
| ------------------------------------------- | -------------------------------------------------------- |
| engine/EngineTypes.ts, TetrominoStates.ts   | Estado, peças pré-computadas, spawn e efeitos ordenados. |
| engine/SrsRotation.ts, SevenBag.ts          | Kicks, tentativas candidatas e bag por stream de peças.  |
| engine/MosaicBoard.ts, MosaicProjection.ts  | Fits, lock, clear, compactação, relief e ghost puro.     |
| engine/MosaicSimulation.ts, MosaicTopOut.ts | Tick, relógios, input, lock, delays, spawn e top-out.    |
| engine/MosaicReplay.ts                      | Frames, versões e digest/checkpoints.                    |
| ruleset/MosaicRules.ts, MosaicProgress.ts   | Tuning e progresso, sem alterar geometria.               |

A suite de conformance deve provar, sem Phaser:

- bag com sete formas sem repetição, seed e streams isolados;
- golden spawn das sete peças; quatro células únicas por forma;
- oito transições de J/L/S/T/Z, oito de I, O invariável, kicks de parede/chão
  e rotação impossível sem mutação;
- parede, chão, stack, buffer, clears adjacentes/não adjacentes e ghost;
- ordem do tick, SOCD, borda versus estado mantido, soft drop por pressão,
  DAS/ARR e máximo de 15 resets por peça;
- line-clear e entry delay por ticks, nunca callback;
- block-out, lock-out e ausência de partial lock-out;
- replay com versões/checkpoints e mesma seed/frames chegando ao mesmo digest;
- uma e seis fotos não mudam fila, geometria, lock, clear ou top-out;
- propriedades: fits/ghost não mutam, board fica em bounds, peça ativa tem
  quatro células e compactação preserva ordem relativa.

Adicionar fuzz determinístico de partidas curtas e golden replays de wall kick,
floor kick, reset 15, clears múltiplos, block-out e recuperação. O erro reporta
seed e frames suficientes para reprodução.

**Check D2.A — 03-09-2026:** concluídos o modelo de grade 8 × 18, os estados
pré-computados das sete peças, colisão, lock imutável, compactação simultânea,
ghost, saco de sete com stream derivada e SRS horário (incluindo floor kick e
falha sem mutação). A suite pura contém 23 testes. Simulação por tick, delays,
SOCD/DAS/ARR, top-out, replay, fuzz e ruleset continuam pendentes nesta fase.

**Cadência de testes durante a execução — 03-09-2026:** por solicitação do
proprietário, não criar uma bateria para cada microalteração. Cada bloco de
domínio recebe apenas a prova curta de sua invariante de maior risco; a suite
completa de conformance, golden replays e fuzz é executada uma vez ao encerrar
D2. Isso não reduz os gates D4–D7: probes técnicos e validação real de tela,
resolução e aparelho continuam obrigatórios quando a experiência estiver pronta.

**Check D2.B — 03-09-2026:** o loop puro de 60 Hz agora cria spawn a partir das
streams, aplica bordas diretas, gravidade, lock, clear-delay e spawn seguinte
sem Phaser. O teste de marco prova spawn reprodutível e soft drop de uma célula;
typecheck, lint e os 24 testes específicos estão verdes. DAS/ARR, SOCD,
lock-out, replay e regras de experiência ainda são o próximo corte de D2/D3.

**Check D2.C — 03-09-2026:** horizontal agora resolve toque inicial, DAS/ARR e
SOCD (“última direção pressionada vence”) no domínio. Um teste de marco percorre
o primeiro deslocamento, a espera DAS, a repetição ARR e a troca de direção; os
25 testes específicos, typecheck e lint estão verdes. Block-out/lock-out,
replay/checkpoint, fuzz e ruleset permanecem pendentes antes de encerrar D2.

**Check D2.D — 03-09-2026:** o engine agora emite block-out no spawn e lock-out
somente quando os quatro minós recém-fixados permanecem no buffer; nenhuma
política de recuperação foi adicionada à física. `MosaicReplay` reexecuta frames
puros e produz digest/checkpoints sem fotos, URLs ou dados de apresentação. As
provas de marco para lock-out e replay deixam 27 testes específicos, typecheck e
lint verdes. Fuzz/golden replays extensos e a conformance final continuam como
gate único de encerramento de D2.

**Check D2.E — 03-09-2026:** a conformance agrupada fechou delays canônicos,
digest independente de slots de foto, checkpoints de replay e fuzz determinístico
de 16 seeds × 180 ticks. Ela confirmou `fits` para cada peça ativa e o teto de
15 lock resets, sem runtime Phaser. São 31 testes específicos; o próximo passo é
D3, que pode consumir somente efeitos semânticos para progresso, dica e Ajuda da
Oficina.

**Gate:** pnpm check:fast e conformance pura verde. Phaser não recebe regra
duplicada e não há prova visual nesta fase.

### D3 — ruleset de produto

Adicionar sobre engine conformatizado, nunca a MosaicBoard:

- normal com quatro linhas e desafio com sete;
- MosaicRecoveryPolicy, Ajuda da Oficina e final gentil;
- MosaicHint por estados alcançáveis e próxima única;
- guirlanda, Memory Frame uma vez por lock e ticks canônicos;
- efeitos semânticos para áudio/apresentação, sem o domínio conhecer tween,
  haptic, pixel ou foto.

Testar recovery com zero, uma e duas linhas visíveis, preservação de fila/seed e
término após teto de ativações. O resultado continua não visual.

**Check D3.A — 03-09-2026:** `MosaicProgress` implementa metas normal (4) e
desafio (7) sobre efeitos semânticos; `MosaicRecoveryPolicy` seleciona no máximo
duas linhas visíveis ocupadas e não toca RNG, fila ou colisão. `applyReliefRows`
permanece estrutural no engine. O teste de marco cobre vitória, pedido de ajuda,
teto de duas recuperações e retorno ao jogo; typecheck, lint e 32 testes do
pacote estão verdes. Dica BFS e Memory Frame continuam pendentes em D3.

**Check D3.B — 03-09-2026:** `MosaicHint` percorre exclusivamente estados
alcançáveis por esquerda, direita, giro horário e descida, avaliando limpeza,
buracos, altura e irregularidade sem mover a peça nem mutar o engine. A dica
porta `pieceSerial`, primeira intenção e pouso destacado. `MosaicMemoryFrame`
converte lock e clear em no máximo uma mudança simbólica por peça: preserva a
âncora, mostra apenas o último marco de uma limpeza múltipla e volta à âncora na
vitória; não contém foto, URL ou decisão de renderização. Os 34 testes puros do
pacote, typecheck e lint cobrem a prova de lacuna alcançável, imutabilidade e a
deduplicação do Frame. A composição de efeitos de ruleset continua pendente em
D3.

**Check D3.C — 03-09-2026:** `MosaicExperience` agora compõe engine,
progresso, Frame e Ajuda da Oficina sem reimplementar colisão. A sequência de
efeitos mantém engine → progresso → Frame → vitória, para devolver a âncora
antes da transição hero. A ajuda remove somente linhas visíveis e retorna o
engine à entrada; não consome fila nem streams aleatórias, pois o spawn segue
no tick normal seguinte. `normal` permite duas ajudas e `desafio`, uma, como a
especificação de produto determina. A prova única cobre zero, uma e duas linhas
relieváveis, teto, fila/seed preservadas e final gentil. D3 está concluída com
36 testes puros, typecheck e lint verdes; o próximo corte é D4, runtime Phaser
técnico sem avaliação visual.

### D4 — Phaser Runtime Technical Slice, sem validação visual

Criar Scene simples e bridge:

```text
entrada → frame de input → engine → transições → pausa/resize → saída
```

**Check D4.A — 03-09-2026:** o runtime ganhou `MosaicFixedStepClock`,
`MosaicInputLatch`, `MosaicPointerOwnership` e `MosaicGestureInput`. O relógio
executa no máximo cinco passos de 60 Hz por apresentação e descarta o atraso
restante; pausa, cancelamento e mudança de área útil descartam acumulador e
bordas pendentes. Dock e gesto só aceitam o `pointerId` dono no mesmo epoch;
segundo ponteiro, `wasCanceled`, `POINTER_UP_OUTSIDE`, blur, hidden, resize,
orientação, shutdown e saída anulam a interação. As três provas de risco do
runtime ficam em 39 testes do pacote, sem screenshot ou comparação visual.

**Check D4.B — 03-09-2026:** o placeholder foi trocado pela Scene técnica
`MosaicTechnicalScene`, que usa `Phaser.AUTO`, `Scale.RESIZE`, RAF nativo
(`forceSetTimeOut: false`), duas pointers e o engine puro como única fonte de
transição. Ela escopa listeners por `SceneScope`, aplica `touch-action: none`
somente ao canvas e encerra no evento `DESTROY`. A prova local em canvas real
montou exatamente um canvas, exerceu o dock, não registrou erro de console e
confirmou zero canvas após a saída; não houve captura ou julgamento de tela.
Foram consultados os tipos instalados e a documentação oficial de Phaser 4.2.1
antes de usar `pointerId`, `wasCanceled`, `POINTER_UP_OUTSIDE`, `RESIZE` e o
destroy assíncrono. D4 continua aberta para adaptador de viewport, probe de
recursos e cenários de lifecycle.

**Check D4.C — 03-09-2026:** `MosaicViewportAdapter` usa a menor dimensão
válida entre `Scale.RESIZE` e `VisualViewport`, apenas para posicionar a
apresentação; ele não altera estado do engine, fila, seed ou replay.
`MosaicTechnicalProbe` compõe os monitores já existentes da plataforma e só
mantém contadores locais de frame, contexto e recursos da Scene — sem foto,
telemetria ou alegação de memória GPU. A Scene cancela input e zera o relógio
em perda de contexto, pausa, blur, hidden, resize, orientação e shutdown, e
remove o listener de `VisualViewport` pelo `SceneScope`; o sampler pausa nos
limites de lifecycle e o primeiro delta ao retomar é descartado. A dock é um
adaptador próprio e interrompe a propagação de `pointerdown`, para que um toque
de controle não seja reinterpretado como gesto. Os 41 testes unitários do
pacote, typecheck e lint estão verdes. A validação visual e a matriz de
resoluções continuam explicitamente adiadas para D7, após P4.

- Scene.update só acumula passos e apresenta transições; não calcula colisão.
  Configurar RAF nativo, passo de 60 Hz, teto de cinco passos e reset de
  acumulador nos limites de lifecycle; não usar `forceSetTimeOut`.
- MosaicDockInput confirma no `pointerdown` do primeiro `pointerId` elegível;
  giro/baixar são borda e esquerda/direita seguem DAS/ARR. MosaicGestureInput
  mantém `down → move → up` para o mesmo dono, cancela no segundo pointer,
  `pointer.wasCanceled` ou `POINTER_UP_OUTSIDE` e não confirma cancelamento.
- PointerOwnership guarda pointerId, epoch e zona; pausa, blur, resize,
  orientação, shutdown, visibilidade e saída chamam `cancelInteraction(reason)`
  para liberar dono e DAS/ARR. Usar eventos Phaser/SceneScope, não listeners
  globais de browser.
- O adapter de viewport combina bounds protegidos do host, `Scale.RESIZE` e
  `visualViewport.resize` quando disponível; resize nunca muda
  MosaicEngineState, fila, seed ou replay.
- Introduzir MosaicTechnicalProbe como consumidor local dos coletores da
  plataforma. Provar em canvas real: ordem de eventos, digest, reset de tempo,
  resposta de input, contexto de renderer, contadores antes/depois de teardown
  e ausência de recurso sobrevivente. Se P5 já existir, repetir no Android de
  referência sem screenshot e sem avaliação de composição.
- SceneScope.dispose() é idempotente: shutdown, shutdown, destroy não causa
  remoção dupla nem referência obsoleta.

O teste de browser/probe só observa eventos, digest, recursos e métricas. Não
fixa matriz visual, não captura imagem e não inspeciona a aparência do canvas.

### D5 — experiência de fotos e recursos, sem validação visual

Após P2, construir experiência fotográfica com testes de contrato:

**Check D5.A — 03-09-2026:** `MosaicPhotoPlan`, `MosaicMemoryFramePlan` e
`MosaicPhotoLoadPlan` congelam a seleção antes do Phaser: âncora obrigatória,
até seis `thumb`, até quatro `card` e uma `game`, todos identificados somente
por id, orientação e posição de catálogo. `MosaicRuntimePhotoPlan` é a única
camada que reconcilia esse plano com as variantes autorizadas da sessão; cada
derivada recebe uma chave privada do `runId`, sem id de foto na chave. A Scene
abre a rodada, enfileira todas as derivadas no `preload` e só emite READY/START
depois do ledger de assets e das dimensões de textura confirmarem sucesso; uma
falha requerida da âncora impede a rodada e emite apenas um código seguro. A prova curta cobre
uma, quatro e seis fotos, orientação mista, deduplicação por variante e a
falha de derivada requerida (45 testes do pacote). Em canvas real, sem
screenshot, o loader técnico montou um canvas, carregou as derivações fixture,
preservou `touch-action: none`, não registrou erros de console e removeu o
canvas na saída. D5 continua aberta para o pool estável de apresentadores e a
apresentação proporcional das fotos.

**Check D5.B — 03-09-2026:** `MosaicBoardPresentation` aloca uma única vez
112 apresentadores de mural, quatro da peça ativa e quatro do ghost. Lock,
clear, queda e resize só reconciliam visibilidade, posição, textura e tamanho;
não criam nem removem célula. Cada miniatura usa `createPhotoSurface(...,
'contain')` dentro de uma moldura independente, portanto a rotação SRS muda a
geometria, não a orientação da foto. O probe técnico em browser foi repetido
depois do pool: um canvas, variantes fixture carregadas, `touch-action: none`,
zero erros de console e zero canvas após saída. Não foram coletadas imagens,
comparadas telas nem emitido julgamento estético. D5 continua aberta para Frame
visível, hero, efeitos e orçamento de recursos.

**Check D5.C — 03-09-2026:** o snapshot local agora separa texturas da rodada,
contagem global de textura, apresentadores e a estimativa conservadora
`largura × altura × 4` das derivações carregadas. A estimativa não inclui
canvas, mipmaps, buffers, overhead do motor ou memória GPU e não deixa a Scene;
bytes de rede/publicação continuam sendo responsabilidade do manifesto e do
Asset Factory. Nenhum orçamento numérico foi inventado antes do Android de
referência, em conformidade com o contrato de medição compartilhado. A prova
unitária atualiza o snapshot sem acrescentar uma bateria visual (45 testes do
pacote, types e lint verdes).

**Check D5.D — 03-09-2026:** `MosaicPhotoAvailability` transforma apenas o
resultado do loader em um plano final, ainda sem URL ou pixel. Falha de `game`
ou `thumb` da âncora bloqueia de forma segura; `thumb` de coadjuvante sai do
vetor de materiais antes de o engine ser criado; `card` da âncora passa a usar
a derivada `game`, e cartões coadjuvantes ausentes são remapeados pelo Frame.
As chaves não usadas continuam pertencendo ao `SceneScope` e são removidas no
teardown. As duas provas puras cobrem bloqueio e remapeamento, e o canvas real
continuou carregando a fixture e destruindo-se sem erro; nenhuma comparação de
tela foi executada.

| Variante | Limite | Papel                                                     |
| -------- | -----: | --------------------------------------------------------- |
| thumb    |      6 | Mural/blocos; um slot por peça e moldura separada.        |
| card     |      4 | Frame: âncora, até três marcos e âncora antes da vitória. |
| game     |      1 | Foto protagonista inteira na vitória.                     |

PhotoLoadPlan e MemoryFramePlan são puros: ids autorizados, orientação e
posição de catálogo, sem URL. A Scene deduplica, congela plano antes de
GAME_READY, carrega tudo antes da rodada e usa chaves de runId. Não há download
em clear/crossfade nem substituição de foto durante partida.

| Falha                   | Resposta                                                     |
| ----------------------- | ------------------------------------------------------------ |
| game ou thumb da âncora | Não inicia; retry limitado e fallback seguro fora da rodada. |
| card da âncora          | Usa game autorizado ou fallback definido.                    |
| thumb coadjuvante       | Remove e remapeia antes de READY.                            |
| Decorativo ou som       | Primitive de fallback; jogo segue silencioso se necessário.  |

Criar pool estável de 112 apresentadores de célula, quatro da peça ativa e
quatro do ghost. Ghost é contorno de baixa opacidade; fotos das células ficam
verticais quando a geometria gira. Orçamento mede networkBytes, pixels
decodificados, chaves de textura preparadas para o renderer e dimensão máxima —
não apenas bytes do
JPEG. A documentação oficial alerta que escalar texturas pode causar
interpolação; variantes no tamanho de uso são preferíveis a originais enormes
reduzidos em tela ([Game Object Components](https://docs.phaser.io/phaser/concepts/gameobjects/components)).

Durante gameplay, lock e clear não criam nem destroem GameObjects das células.
O probe registra contagem estável, texturas e estimativa decodificada (sem
alegar memória GPU); cenários de uma, quatro e seis fotos, inclusive orientação
mista, incluem loader, falha, pause, resize/orientação, perda de contexto quando
o renderer a notificar e teardown. Nenhuma foto é baixada durante a rodada.

Fixtures de uma, quatro e seis fotos, em retrato/paisagem/misto, provam planos e
deduplicação de forma não visual.

### D6 — design integrado, feedback, assets e aprovação

Após P3, concluir conforme Creative Slice Card:

**Check D6.A — 03-09-2026:** a ponte semântica já trata o primeiro frame de
`recovering` como a solicitação visível “Vamos abrir espaço!” e, no frame de
apresentação seguinte, chama `applyMosaicWorkshopRelief` do domínio. A Scene
não altera board diretamente, não avança fila/RNG e descarta qualquer saldo do
acumulador antes de o engine voltar a `entry-delay`. Vitória e final gentil
fazem `GameRun.complete()` uma única vez. Este é apenas o encadeamento lógico:
não constitui design integrado, não usa animação nem abre P4/D7; Frame, hero,
assets, feedback e aprovação de P3 continuam pendentes.

**Decisão de construção D6.B — 03-09-2026:** a primeira composição jogável
concentrará a leitura em três camadas estáveis: porta-retrato de memória e
progresso no topo, tabuleiro no centro e dock de ações no rodapé (ou faixa
lateral em paisagem). A dica surge somente após sete segundos sem avanço
confirmado e permanece estritamente consultiva; ela aponta a primeira ação de
uma rota segura calculada no domínio, sem mover, girar ou baixar a peça. A
próxima peça é apresentada como antecipação legível e o porta-retrato troca
apenas nos marcos que o domínio já autorizou. Não haverá partículas, loops ou
tweens contínuos nesta fatia: isso preserva o perfil LOW e reduzido, evita
distração sobre as fotos e mantém a avaliação visual para P4/D7.

### D6.P — corte de produção premium, antes de P4

**Auditoria real em 03-09-2026.** O domínio já satisfaz a maior parte das
invariantes mecânicas: 8 × 14 + buffer, SRS, sete-bag, fluxos RNG separados,
ghost, lock/reset, DAS/ARR, SOCD, replay, hint BFS, Recovery e Memory Frame.
O runtime, porém, ainda tem `MosaicTechnicalScene.ts` como concentrador de
loader, lifecycle, input, layout, dock, HUD, frame e final; a apresentação é
majoritariamente de primitives; `EXPERIENCE.md` conserva placeholders; e não
há catálogo/proveniência próprio. Além disso, `MosaicSimulation.ts` conserva
um `entry-delay` vazio quando a regra declara `spawnDelayTicks: 0`. Este corte
é a migração para produção sem reescrever as regras comprovadas e sem iniciar
D7.

**Decisão de produto D6.P0 — 03-09-2026.** A fantasia é “Oficina/Mural de
Lembranças”: a foto é sempre o conteúdo central, cada bloco é um pequeno
presente-foto e a guirlanda responde ao progresso. Nos cinco primeiros
segundos a criança vê a âncora no porta-retrato, lê “Complete uma fileira” e
encontra três ações mais `Baixar` no dock de 52 px. A dica só acende uma rota
segura; nunca conclui uma jogada. Vitória mostra a âncora antes dos adornos;
Recovery mostra a ajuda da Oficina antes de remover linhas. Nenhuma decisão
altera SRS, pontuação, velocidade, chance de peças ou a aleatoriedade.

| Corte | Problema real                                                                    | Implementação planejada                                                                                                                                                                                                                                                                                                                                                                                                                              | Prova curta antes de seguir                                                |
| ----- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1    | `spawnDelayTicks: 0` cria uma rodada sem peça entre lock/clear e spawn.          | Encadear `piece-spawned` na mesma transição, com um único incremento de tick e ordem `lock → clear? → spawn` preservada.                                                                                                                                                                                                                                                                                                                             | Teste determinístico dos dois caminhos de zero delay.                      |
| P2    | A Scene técnica conhece detalhes de cada superfície.                             | Criar `MosaicoEmQuedaScene` fino e separar input, dock, diretores de apresentação, feedback, áudio, VFX, Frame, Recovery, Victory e teardown. O nome técnico vira adaptador temporário ou desaparece após os imports migrarem.                                                                                                                                                                                                                       | Typecheck/lint e teste do contrato de delegação.                           |
| P3    | O deslocamento por gesto é só um threshold fixo; dock não possui estados táteis. | `MosaicInputController` transforma delta relativo ao tamanho de célula em passos limitados com dead-zone, hysteresis, epoch/owner/cancelamento; tap no mural gira somente quando não houve drag. `MosaicDockPresentation` mantém idle/pressed/held/disabled/blocked, sombra/face/ícone e hit area de 52 px.                                                                                                                                          | Prova curta de quantização, cancelamento e limite por frame.               |
| P4    | Efeitos semânticos chegam à Scene mas não dirigem uma experiência.               | `MosaicPresentationDirector` recebe a lista ordenada e a distribui, sem o diretor redescobrir regra no board: movimento/rotação/lock/clear, progresso/Frame, Recovery e vitória.                                                                                                                                                                                                                                                                     | Contrato puro de ordenação/prioridade.                                     |
| P5    | Frame, clear, ghost e hint ainda não têm papéis distintos e emocionais.          | `MosaicMemoryFramePresentation` faz crossfade 250–450 ms sem bloquear input; Board usa a janela de clear mecânica; ghost permanece discreto e hint projeta alvo + sinal no controle, sem mover a peça. LOW/reduzido usam confirmação estática.                                                                                                                                                                                                       | Typecheck e uma prova de cálculo de alvo/estado, sem screenshot.           |
| P6    | Recovery e vitória são mudanças de visibilidade, não momentos temáticos.         | `MosaicRecoveryPresentation` congela input, apresenta sweep finito e só então autoriza o relief já decidido; `MosaicVictoryPresentation` prioriza hero/âncora, guirlanda, CTA e celebração finita de 0,9–1,5 s. Callbacks nunca alteram domínio.                                                                                                                                                                                                     | Teste do epoch/encerramento de sequência.                                  |
| P7    | Não há áudio, VFX ou materiais próprios do Mosaico.                              | `MosaicAudioDirector` prioriza `victory > memory > clear > lock > rotate/blocked > UI`, desbloqueia após gesto, respeita mudo/pausa/hidden/teardown e segue silencioso sem asset. `MosaicVfxDirector` usa emissões finitas; LOW/reduzido não usam partículas decorativas. Criar assets próprios, manifesto v2 e proveniência; só copiar uma fonte do repositório quando a licença `project-owned` e o papel estiverem registrados no pacote Mosaico. | `asset:validate`, typecheck/lint e probe de lifecycle sem inspeção visual. |
| P8    | A experiência ainda é um esqueleto com “Definir…”.                               | Reescrever `EXPERIENCE.md` e `EXPERIENCE_REQUIREMENTS.json`, registrar orçamento, estados, som/haptic e fallback. Acrescentar o changelog D6 com problema → arquivos → efeito esperado → pendência D7.                                                                                                                                                                                                                                               | Validador de requirements/manifesto quando os artefatos existirem.         |

**Contratos transversais deste corte.** P1 preserva o determinismo; P2–P7
nunca importam Phaser no domínio; efeitos de apresentação podem ler a geometria
para posicionar pixels, mas recebem o efeito como causa e não inferem o evento
do board; transições são finitas, canceláveis por epoch e removidas antes de
texturas/SceneScope; input não espera tween, som ou VFX; imagem de sessão usa
somente derivadas autorizadas e `contain`; não entra original, URL, id de foto
ou caminho em bridge/analytics/probe. Não há hard drop, hold, giro de 180°,
T-spin, combo, back-to-back, ranking ou pressão de tempo.

**Plano de assets.** O primeiro pacote não importa paths de outro jogo em
runtime. Ele terá diretório próprio em `apps/play/public/assets/mosaico-em-queda/`
e catálogo `assets/manifest.json`: fundo de Oficina, superfície de mural,
moldura de célula, moldura de memória, painel/dock e suas quatro faces,
prévia, guirlanda, brilho, sweep, detalhe de luz e faixa de vitória; sons
curtos de UI, giro, bloqueio, encaixe, clear, Frame, Recovery e vitória. A
fonte de cada arquivo será ou `project-created` próprio, ou uma cópia física
de fonte interna `project-owned` explicitamente registrada como
`owner-authorized-legacy`; não se presume que o asset de Trinca seja
reutilizável apenas porque está no repositório. Música ambiente fica opcional
e só entra se um arquivo próprio de qualidade estiver disponível.

**Limite desta rodada.** Construção, contratos, assets, lifecycle e prova
técnica curta acontecem agora. D7 continua fechado: não haverá screenshot,
comparação de tela, matriz por resolução, julgamento humano ou declaração de
acabamento profissional até P4/P5 do proprietário.

#### Changelog vivo D6.P

| Check                       | Problema → implementação feita                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Arquivos envolvidos                                                                                                                                                                                                                                                                                                   | Efeito esperado / pendência D7                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 ✓ 03-09-2026             | `spawnDelayTicks: 0` criava frame lógico vazio → lock sem clear e conclusão de clear encadeiam spawn com o mesmo incremento de tick; a ordem é `piece-locked → lines-cleared? → piece-spawned`.                                                                                                                                                                                                                                                                                                  | `MosaicSimulation.ts`, `MosaicSimulation.test.ts`, `MosaicConformance.test.ts`                                                                                                                                                                                                                                        | Peça nova está ativa sem atraso artificial; D7 ainda observará a leitura do lock/clear em tela.                                                                                               |
| P7.a ✓ 03-09-2026           | Mosaico não tinha assets próprios e catálogo auditável → 21 arquivos em diretório próprio, manifesto v2, hashes, orçamento, proveniência e fallback silencioso.                                                                                                                                                                                                                                                                                                                                  | `apps/play/public/assets/mosaico-em-queda/`, `assets/manifest.json`, `ASSET_PROVENANCE.md`                                                                                                                                                                                                                            | Material de Oficina disponível para integração; D7 aprovará hierarquia, contraste e adequação estética.                                                                                       |
| P8.a ✓ 03-09-2026           | Experiência tinha placeholders e verbos incompletos → roteiro completo, limites de VFX/áudio, LOW/reduzido, lifecycle e requirements reais.                                                                                                                                                                                                                                                                                                                                                      | `EXPERIENCE.md`, `EXPERIENCE_REQUIREMENTS.json`                                                                                                                                                                                                                                                                       | Contrato evita improviso de asset e UI; D7 mede entendimento infantil e áreas úteis.                                                                                                          |
| P4/P7.b ✓ 03-09-2026        | Efeitos tocavam no máximo por código local → `MosaicPresentationDirector` entrega lote ordenado e `MosaicAudioDirector` escolhe um cue de maior prioridade, desbloqueado por gesto e pausado no lifecycle.                                                                                                                                                                                                                                                                                       | `MosaicPresentationDirector.ts`, `MosaicAudioDirector.ts`, `audioAssets.ts`, `MosaicTechnicalScene.ts`                                                                                                                                                                                                                | Áudio não sobrepõe lock/clear/Frame/vitória; ainda faltam os demais diretores e a Scene fina.                                                                                                 |
| P2 ⏳ 03-09-2026            | A Scene ainda é concentradora → apresentação foi extraída para Board/Chrome/dock/diretores, o mural passa por `MosaicInputController` e a ordem de shutdown passa por `MosaicSceneTeardown`. O novo `MosaicGameplayRuntime` passou a concentrar estado de experiência, idle hint, recovery puro e `MosaicFixedStepClock`, devolvendo somente lote ordenado de efeitos; `MosaicoEmQuedaScene` segue como entrada de produção enquanto o adaptador técnico ainda compõe loader e lifecycle Phaser. | `MosaicoEmQuedaScene.ts`, `MosaicGameplayRuntime.ts`, `MosaicInputController.ts`, `MosaicSceneTeardown.ts`, `MosaicTechnicalScene.ts`, `MosaicBoardPresentation.ts`, `MosaicChromePresentation.ts`, `MosaicDockPresentation.ts`, `MosaicFeedbackDirector.ts`, `MosaicVfxDirector.ts`, `MosaicGameplayRuntime.test.ts` | A factory já aponta ao nome de produção; Scene perdeu domínio/fixed-step e chegou a 634 linhas. Extração do loader/lifecycle e renomeação final do adaptador continuam pendentes antes de D7. |
| P3 ✓ 03-09-2026             | O mural aceitava apenas uma ação por limiar fixo de 16 px → gesto agora quantiza delta por `cellSize`, aplica dead-zone/hysteresis, limita três comandos por evento e quatro pendentes, preserva owner/epoch e gira somente em tap da peça ativa.                                                                                                                                                                                                                                                | `MosaicGestureInput.ts`, `MosaicInputLatch.ts`, `MosaicBoardPresentation.ts`, `MosaicTechnicalScene.ts`, `MosaicRuntimePrimitives.test.ts`                                                                                                                                                                            | Arraste acompanha a coluna em passos válidos sem avalanche; D7 verificará conforto em dedos e áreas úteis reais.                                                                              |
| P5.a ✓ 03-09-2026           | Ghost e dica ainda compartilhavam a mesma leitura abstrata → ghost passa a ser contorno frio, fino e de baixo contraste; `MosaicHintPresentation` recebe o alvo BFS com serial, desenha somente o contorno quente e mais largo do pouso alcançável e convida o botão da primeira ação uma vez. A dica jamais envia input ou move a peça.                                                                                                                                                         | `MosaicHintPresentation.ts`, `MosaicBoardPresentation.ts`, `MosaicDockPresentation.ts`, `MosaicTechnicalScene.ts`, `MosaicHint.test.ts`                                                                                                                                                                               | O jogador diferencia pouso atual de sugestão segura sem cobrir fotos; D7 verificará legibilidade, contraste e conforto tátil em aparelhos reais.                                              |
| P5.b ✓ 03-09-2026           | O encaixe começava sem um marco semântico de contato → o domínio emite `piece-grounded` uma única vez na mudança para chão, e o mural responde com uma acomodação de moldura de 48 ms; rotação agora recebe haptic leve opcional e dock rejeitada toca `blocked` depois do unlock.                                                                                                                                                                                                               | `EngineTypes.ts`, `MosaicSimulation.ts`, `MosaicSimulation.test.ts`, `MosaicBoardPresentation.ts`, `MosaicFeedbackDirector.ts`, `MosaicTechnicalScene.ts`                                                                                                                                                             | O lock ganha antecipação física sem tween de posição nem alteração do relógio; D7 avaliará intensidade do haptic e leitura do contato.                                                        |
| P4/P5/P6/P7.c ⏳ 03-09-2026 | Primitives não usavam os assets do pacote e Frame/Recovery/vitória eram estados instantâneos → assets SVG entram por chave de run e fallback; dock tem superfície/estados; board recebe moldura, clear glow, ghost e hint distintos; Frame faz crossfade e usa a luz quente do pacote quando permitida; Recovery segura input por 360 ms; hero entra antes do som de vitória; VFX reutiliza pool de 12.                                                                                          | `visualAssets.ts`, `MosaicDockPresentation.ts`, `MosaicBoardPresentation.ts`, `MosaicHintPresentation.ts`, `MosaicMemoryFramePresentation.ts`, `MosaicChromePresentation.ts`, `MosaicRecoveryPresentation.ts`, `MosaicVictoryPresentation.ts`, `MosaicVfxDirector.ts`, `MosaicAudioDirector.ts`                       | A experiência construída já possui ciclos finitos e LOW/reduzido; faltam extração total da Scene e aprovação visual D7.                                                                       |
| P7.d ✓ 04-09-2026           | A prova enviada pelo proprietário mostrou fotos totalmente encobertas e dock sobreposta → molduras de célula e de memória agora têm abertura SVG realmente transparente; pulsos não escalonam imagem display-sized; a dock preserva `setDisplaySize` em todos os seus estados, em vez de retornar à dimensão nativa do SVG.                                                                                                                                                                      | `presente-foto-frame-v1.svg`, `moldura-memoria-oficina-v1.svg`, `MosaicBoardPresentation.ts`, `MosaicDockPresentation.ts`, `assets/manifest.json`                                                                                                                                                                     | As derivadas locais voltam a ser conteúdo visível e os quatro controles respeitam os bounds do layout. Será feita somente a confirmação pontual do defeito reportado; D7 continua pendente.   |
| P1.b ✓ 04-09-2026           | No primeiro paint a peça nascia inteiramente no buffer invisível e o mural parecia vazio por alguns segundos → a origem passa à borda do buffer: mantém quatro linhas de proteção, streams, SRS e top-out, mas deixa minós da peça inicial imediatamente no mural.                                                                                                                                                                                                                               | `MosaicSimulation.ts`, `MosaicSimulation.test.ts`, `EXPERIENCE.md`                                                                                                                                                                                                                                                    | A foto deixa de depender do primeiro tick de gravidade para ser percebida. A checagem móvel pontual confirmará somente a primeira tela; timing e conforto pertencem ao D7.                    |

- implementar composição, tokens, molduras, dock, HUD, próximo, dica, LOW e
  movimento reduzido, sem executar bateria visual;
- garantir controles primários de 52 CSS px e secundários de 44 CSS px no
  contrato de layout; arraste é opcional e dock é equivalente;
- conectar toque, giro, bloqueio com cooldown, lock, clear, Frame, recuperação
  e vitória; repetição horizontal não toca som em cada passo;
- iniciar áudio após gesto e fazê-lo consumir eventos, não board; aplicar a
  prioridade vitória > Frame > clear > lock > rotate/bloqueio > UI e parar,
  atenuar ou combinar concorrência do mesmo tick. O
  [WebAudioSoundManager](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager)
  documenta desbloqueio após primeira interação;
- declarar orçamento finito de VFX (emissores, partículas vivas e lifetime),
  com LOW/reduzido sem partículas decorativas contínuas; haptic usa a política
  compartilhada como melhoria opcional;
- aplicar MosaicLayout a GameObjects já existentes e preservar o shell como dono
  da safe area; não mudar meta viewport nem CSS global neste pacote;
- preparar assets finais, EXPERIENCE.md, EXPERIENCE_REQUIREMENTS.json,
  ASSET_PROVENANCE.md e manifesto v2, com origem, licença, hash, papel,
  qualidade, fallback e orçamento;
- implementar teardown e testes funcionais de ordem:

```text
bloquear input
→ invalidar epoch + callbacks/timers
→ parar repetição, tweens e áudio
→ destruir Presentation e Game Objects
→ remover listeners
→ remover texturas privadas de runId
→ SceneScope.dispose
→ game.destroy(true)
→ context.run.exit()
```

Objetos que usam asset morrem antes da textura global. O Technical Mobile Probe
continua permitido para recursos, toque, áudio e lifecycle, mas não há
screenshot, inspeção estética de viewport ou observação humana. Esta fase entrega
design construído para revisão do proprietário. Solicitar P4 só depois de D6.
Sem P4, o plano para antes da validação visual/UX.

### D7 — validação visual/UX mobile final e liberação

Começa exclusivamente após P4 e P5. Nesta etapa usar a skill
revisao-visual-mobile e registrar evidência de canvas real, não apenas DOM.

1. Revisar as categorias por área útil (compacta, standard e alta em retrato;
   tablet; compacta e standard em paisagem), incluindo 390, 412, 430 e 768 CSS
   px com altura CSS/insets reais registrados; normal, LOW e movimento reduzido.
2. Executar Playwright no canvas com fixture segura: primeira ação, dock,
   gesto, giro/ghost, clear, Frame, dica, top-out/recovery, pausa, resize,
   vitória, reinício e saída.
3. Capturar somente fixture sem dados pessoais e comparar leitura, contraste,
   foto proporcional, zonas de toque, clipping e hierarquia foto → ação → mural.
4. Fazer observação focal humana: a criança entende “complete uma fileira” e
   encontra ação em até cinco segundos; mudança material reabre P4.
5. Rodar Android de referência no **Mobile Feel Gate**:

```text
input: pointerdown no primeiro tick elegível; cancelamento nunca confirma;
       segundo dedo não comanda; não há tween bloqueante
frame: pacing e input→apresentação do probe sem stall recorrente; VFX finito
viewport: safe area, browser chrome, resize/orientação fazem reflow sem alterar engine
audio: unlock após gesto, mute/pause/saída silenciam e liberam owner
lifecycle: hidden não acumula steps; retorno não dá burst; saída não deixa recurso
```

O aparelho pode provar 60/90/120 Hz quando os suportar; não se exige aparelho
de 120 Hz para encerrar V1. O orçamento numérico final usa a taxa observada e
o protocolo Android, não um P95 universal de desktop. 6. Validar assets e qualidade:

```powershell
pnpm asset:doctor -- --game mosaico-em-queda
pnpm asset:validate -- --game mosaico-em-queda
pnpm asset:budget -- --game mosaico-em-queda
pnpm check:fast
pnpm check
pnpm validate
```

Provas de lifecycle, privacidade e bridge continuam obrigatórias: nenhum canvas,
listener, timer, tween, áudio ou textura de run anterior sobrevive; analytics e
bridge não recebem replay, input individual, foto, URL, token, caminho ou
resultado comportamental.

## Estrutura final

```text
packages/games/mosaico-em-queda/
  SPEC.md  EXPERIENCE.md  EXPERIENCE_REQUIREMENTS.json
  ASSET_PROVENANCE.md  assets/manifest.json
  src/domain/
    engine/
      EngineTypes.ts  TetrominoStates.ts  SrsRotation.ts  SevenBag.ts
      MosaicBoard.ts  MosaicSimulation.ts  MosaicProjection.ts
      MosaicTopOut.ts  MosaicReplay.ts
    ruleset/
      MosaicRules.ts  MosaicProgress.ts  MosaicRecoveryPolicy.ts  MosaicHint.ts
      MosaicMemoryFrame.ts  MosaicExperience.ts
    photos/
      MosaicPhotoPlan.ts  MemoryFramePlan.ts
    layout/
      MosaicLayout.ts
  src/runtime/phaser/
    createMosaicoEmQuedaGame.ts  MosaicBoardLayout.ts
    MosaicDockInput.ts  MosaicGestureInput.ts  MosaicHud.ts
    MosaicPresentation.ts  MosaicFeedback.ts  MosaicAudioDirector.ts
    MosaicTechnicalProbe.ts  MosaicViewportAdapter.ts
    MosaicSceneTeardown.ts  visualAssets.ts  audioAssets.ts
    MosaicFixedStepClock.ts  MosaicInputLatch.ts  MosaicPointerOwnership.ts
    MosaicTechnicalScene.ts
  tests/
    mechanics-conformance.test.ts  MosaicSimulation.test.ts
    MosaicBoard.test.ts  SrsRotation.test.ts  SevenBag.test.ts
    MosaicTopOut.test.ts  MosaicRecoveryPolicy.test.ts  MosaicReplay.test.ts
    MosaicPhotoPlan.test.ts  MosaicLayout.test.ts  mosaico-mobile.spec.ts
```

## Definition of Done

Mosaico em Queda só estará pronto quando:

- P0–P5, DPMEQ-002 e DPMEQ-003 estiverem aprovados;
- conformance mecânica, fuzz, replays, recovery e isolamento de RNG estiverem
  verdes antes de qualquer validação visual;
- design, assets, lifecycle e privacidade estiverem construídos e aprovados em
  P4 antes de iniciar D7;
- D4–D6 tiverem evidência técnica local de RAF/fixed-step, toque/cancelamento,
  área útil, recursos e teardown, sem qualquer aprovação visual antecipada;
- D7 tiver evidência de canvas, matriz mobile por área útil, Mobile Feel Gate,
  perfis de qualidade, Android e observação focal sem dados pessoais;
- fotos thumb/card/game estiverem autorizadas, proporcionais, deduplicadas e
  dentro dos orçamentos de rede e memória decodificada;
- teardown destruir recursos de rodada na ordem contratada;
- pnpm validate e validadores de asset estiverem verdes;
- aprendizados entrarem em docs/lessons.md e plano migrar para completed.
