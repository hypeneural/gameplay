# Mosaico em Queda — especificação de produto e viabilidade

**Estado:** proposta de produto validada arquiteturalmente em 03-09-2026.
Ainda não autoriza a implementação: a escolha do jogo, o nome público e a
direção visual precisam de aprovação do proprietário antes de criar o pacote.

**Nome de trabalho:** Mosaico em Queda. Ele descreve uma brincadeira de
tetrominós com fotos sem usar `Tetris` como nome, marca, arte ou promessa
comercial do catálogo.

**Decisão de produto proposta — DPMEQ-001:** a primeira versão será uma
brincadeira de encaixar tetrominós em um mural de fotos, em ritmo calmo e sem
derrota punitiva. Cada peça mostra uma lembrança autorizada; completar linhas
monta o caminho até a foto protagonista inteira. A criança vence ao completar
linhas, e não por sobreviver indefinidamente ou fazer a maior pontuação.

**Decisão de produto proposta — DPMEQ-002:** a tolerância infantil pertence ao
_ruleset_ e à apresentação, não a uma física imprecisa. A V1 terá um engine
determinístico de tetrominós com rotação SRS, saco de sete, buffer oculto,
projeção de pouso, lock delay limitado e detecção correta de top-out. O
ruleset `normal` escolherá gravidade mais lenta, lock mais generoso, meta curta
e Ajuda da Oficina; fotos continuam a afetar somente apresentação e recompensa.
Esta decisão também reserva `thumb` para blocos, `card` para o porta-retrato de
memórias e `game` para a revelação hero. Continua pendente de aprovação do
proprietário antes de código ou assets.

**Decisão de processo — DPMEQ-003 (emenda de runtime mobile):** a execução
prioriza construção, mecânica, lógica e design. Até o _design freeze_, são
permitidas apenas provas técnicas locais de mobile: canvas real, toque,
cancelamento, relógio de apresentação, área útil, lifecycle, recursos e áudio.
Elas não podem aprovar estética nem orientar mudanças criativas. Capturas,
comparação de tela, matriz visual de viewport, revisão humana e observação focal
só começam depois de o design integrado receber aprovação explícita do
proprietário (P4). Assim, a validação visual continua final, sem postergar a
descoberta de falhas de runtime que afetariam o celular real.

## Resumo executivo

O jogo é viável na fábrica atual sem mudança em `packages/platform` ou
`packages/theme`. Ele será um pacote isolado, sugerido como
`@christmas-games/mosaico-em-queda`, criado pelo gerador existente e composto
uma única vez por `apps/play`.

O domínio guarda apenas a geometria das peças, células, contadores e índices
numéricos de material. Phaser recebe as URLs de variantes já autorizadas e
associa cada índice a uma textura. Portanto, fotos, URLs, caminhos, rostos,
nomes e pixels nunca entram na regra do jogo, nos testes de domínio, no bridge
ou na telemetria.

| Pergunta                     | Resposta da V1                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| O que a criança faz?         | Move, gira e baixa uma peça de quatro blocos para completar uma linha.                                                         |
| O que aparece nos blocos?    | Miniaturas proporcionais de fotos da sessão, com a foto escolhida sempre incluída.                                             |
| O que torna a ação legível?  | Contorno de alto contraste, código visual de forma e projeção discreta de pouso; a foto não recebe tint, filtro ou deformação. |
| Como termina?                | Quatro linhas completas em `normal`; sete em `desafio`, oferecido somente após a primeira vitória.                             |
| Há “game over”?              | Não na V1. Se o mural congestionar, a Oficina abre espaço de forma explícita e a mesma rodada continua.                        |
| Quanto dura?                 | Normalmente 2–4 minutos, sem cronômetro eliminatório, vidas ou ranking.                                                        |
| Para quantas fotos funciona? | Uma é suficiente; a experiência fica mais variada com quatro a seis fotos.                                                     |

## Contrato de runtime mobile

O jogo deve responder como uma superfície touch-first, sem transformar o engine
em código de browser. O relógio de **simulação** é fixo em 60 Hz; a
**apresentação** acompanha o `requestAnimationFrame` nativo do aparelho, que
pode ser 60, 90 ou 120 Hz. Um acumulador processa no máximo cinco passos por
frame, descarta excesso e é zerado em pausa, aba oculta, resize, mudança de
orientação e saída. Phaser não será artificialmente limitado a 60 FPS nem terá
`forceSetTimeOut` ativado: `TimeStep.target` é apenas uma cadência desejada, e
o RAF acompanha o display quando disponível.

O toque direto na dock confirma em `pointerdown`: esquerda/direita iniciam o
comando horizontal e giro/baixar são bordas únicas. Um arraste opcional é uma
transação separada `down → move → up`, sempre associada a um único `pointerId`.
Segundo dedo, `pointercancel`, `POINTER_UP_OUTSIDE`, pausa, aba oculta, resize,
orientação e saída convergem para `cancelInteraction(reason)` e jamais
confirmam ação. A superfície Phaser mantém `touch-action: none` de forma
escopada; o shell permanece responsável por rolagem e acessibilidade fora do
jogo.

O host entrega ao `MosaicLayout` apenas os limites úteis após a área segura do
shell. Mudanças do Scale Manager, de orientação e, quando existir, de
`VisualViewport`, cancelam o gesto e reposicionam objetos existentes pelo layout
puro; nunca alteram seed, board, bag, replay ou relógios do engine. Não se deve
adicionar `viewport-fit=cover` cegamente: a decisão é do shell/app e só pode ser
alterada após verificar a meta viewport existente e a compensação por
`safe-area-inset-*`.

Antes de P4, um `MosaicTechnicalProbe` local pode medir intervalos de
apresentação ativos, percentis P50/P95/P99, maior frame, taxa observada,
latência de `pointerdown` até a primeira apresentação da transição semântica,
contagem de texturas, estimativa de pixels/RGBA decodificados e contadores
finitos de apresentadores, efeitos e áudio. Ele reutiliza os primitivos de
medição da plataforma, não envia telemetria e não registra foto, URL, input
bruto ou dado pessoal. Estimativa decodificada não é alegação de memória GPU
real; o Android físico é a autoridade de orçamento.

A peça ativa muda horizontalmente e gira por _snap_ na primeira apresentação
disponível. Nenhum tween pode atrasar colisão, ghost, lock ou input. Queda suave
é uma hipótese opcional posterior ao baseline técnico: se existir, interpola
somente o `y` visual enquanto toda decisão continua na coordenada lógica inteira.

## Fantasia, promessa e primeiros cinco segundos

Na **Oficina dos Mosaicos**, presentes-foto caem devagar sobre um mural de
madeira verde-pinho. Quando uma fileira fica cheia, as quatro fotos daquele
momento acendem como uma guirlanda e abrem espaço para a próxima lembrança. Ao
final, a foto escolhida aparece inteira em uma moldura de presente.

A promessa é: **“Monte fileiras de lembranças para revelar sua foto.”**

Nos primeiros cinco segundos a tela deve mostrar, nesta ordem visual:

1. A foto escolhida em um porta-retrato proporcional no alto — reconhecível e
   maior que qualquer miniatura do mural.
2. Um único convite: **“Complete uma fileira.”**
3. A peça que está caindo, com brilho discreto e a instrução contextual
   **“Mova a peça e complete uma fileira.”** A dica de giro só aparece quando
   houver uma peça rotacionável e uma intenção útil.
4. A dock inferior com quatro controles grandes: `Esquerda`, `Girar`,
   `Direita` e `Baixar`.

Não há tela de tutorial separada, contagem regressiva, texto técnico, leitura
longa nem foto de cliente usada como cenário decorativo. A própria peça que
desce ensina o gesto e a consequência.

## Mecânica recomendada

### Tabuleiro, engine e peças

A V1 mostra uma grade de **8 colunas × 14 linhas visíveis**, menor que a grade
clássica para manter os blocos legíveis num telefone de 390 px. O domínio usa
mais quatro linhas de buffer acima dela: **8 × 18** no total. Buffer, spawn,
kicks e top-out existem no engine, mas nunca exibem uma foto fora do mural.
Uma célula não é um alvo de toque: pode medir menos de 52 px sem violar a regra
de acessibilidade. Os controles que alteram a peça têm no mínimo 52 CSS px.

As sete formas canônicas de quatro quadrados são `I`, `O`, `T`, `S`, `Z`, `J`
e `L`. A sequência usa o algoritmo de **saco de sete** com Fisher–Yates:
embaralha uma cópia das sete formas, consome cada uma uma vez e só então cria o
próximo saco. Isso evita uma longa sequência injusta da mesma forma e
permanece determinístico com o `Random` injetado pela plataforma.

A rotação é SRS no engine: cada transição testa a posição original e, se ela
não couber, os quatro _kicks_ seguintes; `I` possui a tabela própria, `O` não
se desloca e as demais peças usam a tabela `J/L/S/T/Z`. A interface infantil
oferece apenas `Girar` no sentido horário, mas o core mantém as oito transições
para que replay, teste de conformance e uma futura ação anti-horária não
reescrevam a geometria. A consulta `fits` é pura: testar uma posição nunca
reinicia lock delay, muda fila ou altera o estado.

Cada nova peça recebe também um `materialSlot` numérico. O runtime traduz esse
índice para uma das fotos ativas; o domínio nunca recebe `Photo`, URL ou
textura. Os quatro blocos da mesma peça usam a mesma miniatura e o mesmo
contorno, para que sua silhueta continue fácil de ler.

A seed de rodada é separada deterministicamente em streams de `pieces`,
`materials` e `presentation`. Assim, mudar de uma para seis fotos não pode
consumir aleatoriedade do saco de peças: mesma seed e mesmos frames produzem a
mesma fila, a mesma geometria e o mesmo replay. A foto permanece vertical em
cada célula quando a geometria da peça gira, e a projeção de pouso é somente um
contorno, nunca uma segunda foto translúcida.

```text
  peça T com a foto 2                 mural de 8 colunas

    [2]                    ┌─────────────────────────┐
  [2][2][2]                │ · · · · · · · ·         │
                           │ · · 2 · · · · ·         │
                           │ · 2 2 2 · · · ·         │
                           │ 1 1 3 3 3 4 4 4 ← linha │
                           └─────────────────────────┘
```

O desenho é somente uma convenção de documentação: na tela, `2` é uma
miniatura autorizada dentro de uma moldura. A moldura define a peça; a foto
permanece proporcional em `contain` dentro dela.

### Ciclo de uma rodada

```text
entry-delay → active (grounded: false | true) → lock
                    │                              ↓
                    │                  line-clear-delay → compactar → entry-delay
                    │                              ↓
                    └──────────── top-out → recuperação do ruleset ou fim gentil
```

1. Uma peça nasce na borda inferior do buffer, pela origem e pivô congelados
   no contrato do engine: seus minós inferiores já aparecem no mural no
   primeiro paint, enquanto as quatro linhas de buffer continuam protegendo
   rotação e top-out. Ela avança em passos lógicos de 60 Hz. A gravidade
   inicial vale 66 ticks (~1.100 ms) em `normal`.
2. A criança pode movê-la à esquerda/direita, girá-la ou baixá-la uma linha.
3. `grounded` é uma propriedade geométrica, não uma fase. Ação válida que foi
   iniciada no chão reinicia lock só abaixo de 15 resets; o orçamento pertence
   à peça inteira e não volta a zero caso ela saia do chão. Ação inválida não
   altera grade, relógio nem contador.
4. Ao assentar, o engine fixa a peça, registra todas as linhas completas em
   `pendingClearRows` e só compacta após o delay de clear. Nenhum tween, áudio
   ou callback Phaser controla lock, clear, spawn, recuperação ou vitória.
5. Cada linha vale uma estrela de guirlanda. O Memory Frame muda uma vez por
   lock, mostrando só o último marco alcançado; ao atingir a meta vai direto à
   foto hero. Não há cronômetro de derrota.

O botão `Baixar` move uma linha por toque; repetir o toque não é necessário.
Esta escolha evita que uma ação involuntária derrube uma peça até o fundo antes
que a criança reconheça sua posição. Uma melhoria posterior só pode adicionar
“Soltar” (queda total) depois da validação final D7 e sem retirar `Baixar`.

### Linhas, vitória e congestionamento

O objetivo de quatro linhas mantém a vitória alcançável: são 32 células, ou
cerca de oito peças antes de considerar lacunas. O HUD diz apenas
`Guirlanda: 2 de 4`, não uma pontuação competitiva.

O engine não decide se top-out é derrota. Ele emite `top-out` em dois casos:
**block-out**, quando a próxima peça não cabe no spawn; e **lock-out**, quando,
depois de eventual clear/compactação, os quatro minós recém-fixados continuam
no buffer. Um minó isolado no buffer não encerra a rodada. O ruleset `normal`
consulta então a **Ajuda da Oficina**; só ela transforma top-out em recuperação:

1. o mural congela e mostra uma frase curta: **“Vamos abrir espaço!”**;
2. duas linhas mais altas que tenham blocos são removidas por uma animação
   finita de varrer neve;
3. os blocos acima descem, a próxima peça aparece e a contagem de linhas já
   conquistadas é preservada.

Este alívio é uma transição explícita e testável, não uma alteração silenciosa
do tabuleiro. A política inspeciona somente as 14 linhas visíveis, escolhe até
duas linhas ocupadas mais altas, remove ambas simultaneamente e compacta também
blocos que estavam no buffer. Se só houver uma candidata, remove uma. Buffer não
é candidato direto; seed, bag, próxima peça, progresso e RNG são preservados.

Ele pode ocorrer no máximo duas vezes em `normal`. Na improvável terceira
congestão, a política encerra a brincadeira com a mesma foto hero e a ação
**“Brincar de novo”**, sem chamar o resultado de falha ou expor placar. A regra
é congelada antes da implementação e só é reavaliada durante a validação visual
final e observação focal, depois do design freeze — não no meio da construção.

### Dificuldade e fotos disponíveis

| Modo      | Disponibilidade         |     Meta |  Ritmo inicial | Ajuda da Oficina |
| --------- | ----------------------- | -------: | -------------: | ---------------: |
| `normal`  | Sempre                  | 4 linhas | 1.100 ms/passo |      Até 2 vezes |
| `desafio` | Só na folha pós-vitória | 7 linhas |   900 ms/passo |        Até 1 vez |

O modo `desafio` é opcional, não aparece antes de a criança concluir a primeira
rodada e não exige outra foto. A seleção fotográfica é limitada a seis itens:

- a foto escolhida no Hub é obrigatória e recebe `game` para o herói final;
- ela e até cinco fotos adicionais da sessão usam `thumb` no mural;
- a âncora e até três lembranças usam `card` no Memory Frame, que troca ao
  completar linhas e devolve a âncora antes da vitória;
- a lista é planejada e deduplicada antes de abrir o Loader;
- com uma única foto, os `materialSlot`s se repetem de maneira honesta; com
  duas a seis, a variação é calculada a partir da fonte determinística da
  rodada;
- fotos adicionais nunca são baixadas sem limite, mesmo que a sessão tenha
  172 itens.

## Interação mobile e acessibilidade

### Controles da dock

```text
┌──────────────────────────────────────┐
│ [foto hero]   Guirlanda: 2 de 4  ⏸  │
│                                      │
│              mural 8 × 14            │
│                                      │
│  [← Esquerda] [↻ Girar] [Direita →]  │
│              [↓ Baixar]              │
└──────────────────────────────────────┘
```

Em retrato, os três controles de direção ficam na primeira linha e `Baixar`
centralizado abaixo; em paisagem, viram uma faixa lateral sem cobrir o mural.
Ícone e palavra aparecem juntos. Som e pausa são controles secundários no HUD
com pelo menos 44 CSS px; todos os controles de jogo são primários e têm pelo
menos 52 CSS px de área efetiva.

Também haverá um gesto opcional, nunca obrigatório:

- arrastar horizontalmente a peça corrente muda de coluna com encaixe por
  célula;
- tocar a própria peça gira uma vez, quando ela não está em transição;
- os quatro controles da dock fazem exatamente o mesmo, portanto a criança
  pode jogar sem arrastar.

O runtime aceita explicitamente um único `pointer.id` por interação; não depende
do número de pointers que Phaser criou. A dock física confirma no `pointerdown`
do pointer dono para reduzir latência: esquerda/direita movem já no primeiro
toque e podem repetir após DAS/ARR; `Girar` e `Baixar` só aceitam uma ação por
pressão. Gestos no mural continuam transacionais (`down → move → up`) para
distinguir toque de arraste. Segundo pointer, cancelamento, resize, pausa, aba
oculta e saída anulam propriedade, repetições e gestos pendentes. Isso impede
uma queda ou rotação fantasma quando a tela muda de tamanho.

### Resposta, dica e estados reduzidos

| Momento             | NORMAL                                                           | LOW / movimento reduzido                                |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Tocar controle      | Compressão curta, `tap`, haptic leve opcional.                   | Estado pressionado e contraste; sem pulso contínuo.     |
| Mover/girar válido  | Peça acompanha a célula; contorno e projeção de pouso confirmam. | Reposicionamento e contorno estáticos no próximo frame. |
| Movimento bloqueado | Pequeno recuo e frase “Aqui não cabe.”                           | Contorno âmbar estático e a mesma frase.                |
| Linha completa      | Brilho breve, `correct`, 1–3 faíscas finitas.                    | Linha desaparece com contraste, sem partículas.         |
| 7 s sem progresso   | Ilumina a melhor coluna/rotação possível, sem mover a peça.      | Destaque fixo de alto contraste.                        |
| Vitória             | Foto inteira, guirlanda finita e `celebrate`.                    | Foto inteira e confirmação estática; sem loop.          |

A dica consulta o estado atual e propõe uma intenção possível; não move, gira
nem baixa a peça pela criança. Som só começa após o primeiro gesto, há botão
`Som`/`Mudo`, e todo loop ou tween precisa ser interrompido ao pausar ou sair.

## Arquitetura técnica validada

### Onde cada responsabilidade mora

| Camada                                           | Responsabilidade para Mosaico em Queda                                                        | Não deve fazer                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/games/mosaico-em-queda/domain/engine`  | Grade, colisão, rotação, saco de sete, queda, lock, clear, ghost, top-out e replay.           | Importar Phaser, React, DOM, foto, URL, relógio real ou `Math.random`.               |
| `packages/games/mosaico-em-queda/domain/ruleset` | Meta, modos, progresso, Ajuda da Oficina, dica e resultado gentil.                            | Alterar colisão, RNG de peças ou invariantes da grade.                               |
| `packages/games/mosaico-em-queda/domain/photos`  | Planos puros de slots e Memory Frame, sempre sem URL.                                         | Conhecer textura, pixel, DOM ou decidir a geometria.                                 |
| `packages/games/mosaico-em-queda/runtime/phaser` | Texturas, scene, layout, input, animações, áudio, bridge e descarte de recursos.              | Decidir a regra, calcular aleatoriedade global ou acessar a sessão fora do contexto. |
| `packages/games/mosaico-em-queda`                | `definition.ts`, `tuning.ts`, SPEC, experiência, proveniência e assets próprios.              | Importar outro jogo.                                                                 |
| `packages/platform`                              | `GameContext`, `Random`, clock ativo, bridge, lifecycle, `PhotoSurface`, `SceneScope`.        | Conhecer o novo jogo.                                                                |
| `packages/theme`                                 | Tokens natalinos, qualidade, preferência de movimento e feedback reaproveitável já existente. | Guardar regras de tetrominó.                                                         |
| `apps/play`                                      | Rota, capa, seleção de foto, `PhaserHost` e registro lazy consciente.                         | Reter Scene ou `Phaser.Game`.                                                        |
| VPS/media pipeline                               | Criar variantes `thumb`, `card` e `game`, com autorização antes do Nginx.                     | Expor original, path do arquivo ou processar imagem no browser.                      |

O fluxo real já é compatível com esse desenho:

```text
Hub/React
  → definition estática + capa
  → import dinâmico de Phaser e do módulo
  → um Phaser.Game para uma entrada
  → domínio puro + runtime Phaser
  → GAME_READY → GAME_STARTED → GAME_COMPLETED
  → SHUTDOWN/SceneScope → game.destroy(true) → Hub
```

`GameRunController` já torna os eventos de ciclo idempotentes e mede somente
tempo ativo. React recebe `GameBridgeEvent` tipado, nunca uma referência à
Scene. O novo pacote não deve criar um gerenciador global, uma BaseScene ou
uma abstração de renderer para antecipar reutilização.

### Modelo de domínio proposto

Os nomes abaixo são o contrato de planejamento, não código pronto. Eles
explicitam que a regra não depende de pixels ou de Phaser.

```ts
type TetrominoKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type Rotation = 0 | 1 | 2 | 3;
type MosaicEnginePhase = 'active' | 'line-clear-delay' | 'entry-delay' | 'top-out';

interface MosaicCell {
  readonly materialSlot: number;
  readonly pieceSerial: number;
}

interface ActiveTetromino {
  readonly kind: TetrominoKind;
  readonly rotation: Rotation;
  readonly column: number;
  readonly row: number;
  readonly materialSlot: number;
  readonly serial: number;
}

interface MosaicEngineState {
  readonly columns: 8;
  readonly visibleRows: 14;
  readonly bufferRows: 4;
  readonly board: readonly (MosaicCell | null)[];
  readonly phase: MosaicEnginePhase;
  readonly active: ActiveTetromino | null;
  readonly shapeBag: readonly TetrominoKind[];
  readonly next: TetrominoKind;
  readonly grounded: boolean;
  readonly pendingClearRows: readonly number[];
  readonly phaseTicks: number;
  readonly tick: number;
  readonly gravityTicks: number;
  readonly lockTicks: number;
  readonly lockResetCount: number;
  readonly lastHorizontalPress: 'left' | 'right' | null;
}

interface MosaicExperienceState {
  readonly engine: MosaicEngineState;
  readonly clearedLines: number;
  readonly targetLines: 4 | 7;
  readonly recoveryCount: number;
  readonly phase: 'playing' | 'recovering' | 'completed';
}
```

Funções puras esperadas:

```ts
createMosaicRun(rules, runSeed) -> MosaicExperienceState
advanceSimulation(engineState, inputFrame) -> MosaicTransition
projectLanding(engineState) -> MosaicProjection
resolveMosaicExperience(experienceState, effects) -> MosaicExperienceState
requestMosaicHint(engineState) -> MosaicHint | null
```

`MosaicTransition` carrega uma lista ordenada de efeitos semânticos, por exemplo
`piece-locked`, `lines-detected`, `progress-changed`, `rows-relieved` ou
`target-reached`. A Scene escolhe tween, som e haptic a partir deles, mas não
reimplementa colisão. Callbacks atrasados usam `runId`, `pieceSerial` e epoch de
apresentação; se qualquer um estiver obsoleto, são ignorados.

O relógio real fica no runtime. `Scene.update` acumula delta e envia frames
lógicos de 60 Hz ao domínio; após pausa, foco perdido, aba escondida ou resize,
o acumulador é descartado em vez de simular tempo ausente. Para testes, a regra
avança por `inputFrame` explícito — bordas e estados mantidos são distintos, e
SOCD usa “última direção vence” ou neutro sem histórico — nunca por `Date.now`,
timer do navegador ou `Math.random`. Uma projeção de pouso é derivada a partir
de `fits`, não fica armazenada nem altera a peça ativa.

### Fotos, textura e privacidade

O carregamento é uma etapa curta antes de `GAME_READY`:

1. `PhotoLoadPlan` puro escolhe a âncora e no máximo cinco coadjuvantes por
   `id`, orientação e posição de catálogo; `MemoryFramePlan` escolhe a âncora
   e até três lembranças para os quatro momentos da guirlanda. Nenhum plano
   contém URL.
2. A Scene deduplica os itens e carrega `thumb` para miniaturas, no máximo
   quatro `card` para o porta-retrato de memórias e `game` da âncora para a
   vitória. Não carrega uma variante durante a animação de limpar linha. Cada
   textura recebe chave escopada ao `runId`.
3. Cada célula é uma `Image` existente reutilizando a textura da foto e uma
   moldura Phaser separada. A imagem usa `contain`; não há crop, máscara,
   tint, shader ou filtro sobre a fotografia.
4. Ao encerrar, bloqueia input, invalida callbacks, cancela timers/tweens, para
   áudio, destrói Game Objects, remove listeners e só então remove texturas
   privadas da rodada. `SceneScope` executa essa propriedade; `game.destroy(true)`
   ocorre por último, antes de `context.run.exit()`.

Uma foto original nunca chega ao browser. O servidor autoriza a combinação
sessão/foto/variante antes de emitir `X-Accel-Redirect`; analytics, bridge,
erros e screenshots versionadas não recebem identificador de cliente, filename,
URL ou caminho.

## Assets e direção de arte

A direção aprovada do catálogo continua sendo foto real heroica em primeiro
plano, noite de Natal ilustrada como suporte e luz quente. Para este jogo, a
família indicada é **Oficina/Mural de Memórias**, não uma cópia da estação do
Expresso.

Antes de procurar arquivos, `EXPERIENCE.md` e
`EXPERIENCE_REQUIREMENTS.json` devem declarar estes papéis:

| Papel                                       | Função                                             | Qualidade             |
| ------------------------------------------- | -------------------------------------------------- | --------------------- |
| foto-protagonista                           | Porta-retrato proporcional no início e vitória.    | Sempre.               |
| superficie-do-mural                         | Grade de madeira/pinho calma atrás das células.    | Sempre.               |
| moldura-de-bloco                            | Indica unidade e material sem pintar a foto.       | Sempre.               |
| acao-principal                              | Dock de setas, giro e baixar.                      | Sempre.               |
| feedback-de-dica                            | Halo/contorno estático da coluna ou giro sugerido. | Sempre.               |
| feedback-de-acerto                          | Faíscas curtas para linha completa.                | Omitido em LOW.       |
| feedback-de-vitoria                         | Guirlanda ou fita finita ao redor da foto hero.    | Estático em reduzido. |
| som-de-toque, som-de-acerto, som-de-vitoria | Feedback curto desbloqueado por gesto.             | Opcional/mudo.        |

Nenhum desses papéis é uma autorização para inventar ou baixar assets no
runtime. O primeiro arquivo aprovado entra em
`packages/games/mosaico-em-queda/assets/manifest.json`, fica sob
`apps/play/public/assets/mosaico-em-queda/`, possui proveniência e passa por
orçamento, hash, licença, alpha e revisão humana. Não versionar manifesto vazio
ou placeholder como se fosse arte pronta.

## Critérios de aceitação da futura SPEC

| ID     | Requisito                                                                                                                 | Evidência obrigatória e ordem                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| MEQ-01 | Formas, saco de sete, colisão, linhas, top-out e recovery são determinísticos.                                            | Testes unitários de domínio antes de D7.                   |
| MEQ-02 | SRS testa transições, kicks, `I` separado, `O` invariável e rotação impossível sem mutação.                               | Suite de conformance pura antes de D7.                     |
| MEQ-03 | Mesma seed/ruleset/frames gera mesmo digest; uma e seis fotos não alteram peça ou geometria.                              | Replay versionado, streams isolados e checkpoints.         |
| MEQ-04 | Spawn, buffer, block-out, lock-out, delay, resets, SOCD e ghost obedecem contrato.                                        | Conformance e fuzz puros antes de D7.                      |
| MEQ-05 | Regra nunca recebe Phaser, DOM, URL, pixels, `Date.now` ou `Math.random`.                                                 | Lint, dependency-cruiser e revisão de imports.             |
| MEQ-06 | Planos usam no máximo seis `thumb`, quatro `card` e um `game`, sem textura duplicada ou original.                         | Teste de planos, falhas e log seguro antes de D7.          |
| MEQ-07 | Pausa, foco, aba oculta, resize, orientação e saída não confirmam frame, repetição ou callback atrasado.                  | Integração lifecycle com epochs antes de D7.               |
| MEQ-08 | Saída destrói objetos antes de texturas, listeners, áudio e canvas.                                                       | Teste funcional de teardown antes de D7.                   |
| MEQ-09 | Foto hero, Frame, controles, LOW e movimento reduzido foram construídos e aprovados como design final.                    | P4; sem captura ou revisão de tela antes dele.             |
| MEQ-10 | Foto aparece inteira/proporcional; dock e gesto são legíveis e as zonas de toque não conflitam.                           | Canvas/Playwright na matriz, somente em D7.                |
| MEQ-11 | LOW e movimento reduzido preservam leitura, feedback, dica e vitória.                                                     | Capturas e jornada, somente em D7.                         |
| MEQ-12 | Criança entende “complete uma fileira” e encontra ação em até cinco segundos.                                             | Observação focal, somente em D7 após P4.                   |
| MEQ-13 | Assets têm manifesto válido, proveniência, licença e orçamento de rede/memória.                                           | Asset validation antes e liberação em D7.                  |
| MEQ-14 | Produto conclui e retorna ao Hub sem dado sensível.                                                                       | Jornada de vitória, bridge e revisão final de privacidade. |
| MEQ-15 | Validação visual/UX não começa antes de construção completa e aprovação P4.                                               | DPMEQ-003 e histórico do plano.                            |
| MEQ-16 | Toque, cancelamento, relógios, área útil, recursos e teardown resistem a um probe técnico local sem inspecionar estética. | D4–D6, eventos/digests/métricas locais; antes de D7.       |
| MEQ-17 | O Mobile Feel Gate comprova resposta direta, estabilidade, área segura, áudio e lifecycle no Android de referência.       | D7 após P4, sem dados pessoais.                            |

## Limites conscientes e decisões que ainda dependem do proprietário

Esta documentação confirma que a construção é apropriada para a stack; não
afirma que a sensação já está aprovada. Antes de código ou arte final, é preciso
confirmar:

1. **D1 — seleção:** Mosaico em Queda é o próximo jogo a entrar em execução?
2. **D2 — nome:** o nome público será Mosaico em Queda ou outra alternativa
   independente de marcas de terceiros?
3. **D3 — direção:** a família Oficina/Mural e sua referência visual A1 foram
   aprovadas?
4. **D4 — assets:** quais molduras, fundo e sons finais passam na revisão de
   origem, licença, orçamento e direção?
5. **D5 — design freeze:** o design integrado está aprovado para só então
   iniciar a validação visual/UX?
6. **D6 — referência:** qual Android físico será usado pelo probe técnico
   disponível durante D4–D6 e pelo gate final em D7? Sem ele, o engine pode
   avançar, mas o orçamento mobile não é encerrado.

Se essas portas forem abertas, o plano canônico de construção é
[CG-Mosaico em Queda](../exec-plans/CG-MOSAICO-EM-QUEDA-IMPLEMENTATION.md).
