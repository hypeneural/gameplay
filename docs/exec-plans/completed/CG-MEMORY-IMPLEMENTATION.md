# CG-MEMORY — plano de implementação do Game 02

**Estado:** em execução — construção autorizada para teste local em
2026-08-27. Memory é a prova E8 da fábrica. A passagem física em Android do
[plano de maturidade](CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY.md)
continua obrigatória para liberação, mas não bloqueia esta implementação.
O objetivo não é copiar o Puzzle: é provar que contratos compartilhados podem
sustentar uma brincadeira de fotos diferente, pequena, responsiva e privada.

## Acompanhamento de execução

- [x] **M0 — Fundamentos e gates de entrada**
  - [x] Auditar o estado real do placeholder, contratos, requisitos de
        experiência, mídia e plano de maturidade.
  - [x] Validar as dúvidas de runtime contra a tag oficial Phaser 4.2.1 e os
        tipos instalados; ver
        [validação oficial do Memory](../references/MEMORY_OFFICIAL_VALIDATION.md).
  - [x] Executar `pnpm check:fast`: typecheck, lint e 59 testes unitários
        passam em 2026-08-24.
  - [x] Executar a baseline `pnpm validate` em Node 24.19.0 resolvido apenas
        para o processo. Em 2026-08-25, check, arquitetura, código morto,
        formatação, build e 52/52 E2E passaram; a instabilidade anterior de
        `locator('canvas').boundingBox()` em tablet-768 não se repetiu.
  - [x] Proprietário autorizou iniciar Memory para teste local em 2026-08-27;
        a pendência Android fica registrada para M7, sem bloquear a construção.
  - [x] Lifecycle de replay escolhido: o shell desmonta a instância concluída
        e o `retry` cria um novo `GameRun`; a Scene não navega nem reutiliza
        um run terminal.
- [ ] **M1 — Congelar contrato e composição lazy**
  - [x] Declarar `memoryDefinition` com `photoSelection: 'subset'`, mínimo e
        recomendado de quatro fotos, e registrar o loader lazy no app.
  - [x] Bloquear entrada no catálogo e em rota direta quando a sessão tiver
        menos de quatro fotos.
  - [ ] Cobrir o contrato com teste de registro e atualizar a matriz de
        disponibilidade após a rodada visual.
- [ ] **M2 — Card Lab e protótipo visual isolado**
  - [ ] Preparar a receita visual/manifesto das cartas natalinas; a primeira
        partida usa somente as derivadas `card` já autorizadas da sessão.
- [ ] **M3 — Domínio puro, seleção e arbiter**
  - [x] Criar seleção determinística com âncora obrigatória, deck com duas
        cartas por foto, máquina de turnos e arbiter sem Phaser/DOM/aleatoriedade global.
  - [ ] Cobrir seleção, deck e bordas de turno com testes unitários.
- [ ] **M4 — Mídia autorizada, manifesto e orçamento**
  - [x] A primeira partida carrega exclusivamente quatro URLs `card` decididas
        antes do preload e as texturas são liberadas no shutdown.
  - [ ] Criar e aprovar a receita/manifesto de molduras, verso e efeitos.
- [ ] **M5 — Runtime Phaser, ponte e lifecycle**
  - [x] Montar tabuleiro responsivo, toque–toque, match, mismatch de 750 ms,
        dica, pausa opaca, conclusão e bridge do lifecycle por `SceneScope`.
  - [ ] Executar a rodada visual e o stress de entradas/saídas depois que a
        construção atual estiver revisada com o proprietário.
- [ ] **M6 — Polimento, acessibilidade e telemetria aprovada**
- [ ] **M7 — Evidências mobile, Android e handoff**

## Resultado de produto

**Memórias de Natal** parece um álbum de fotos natalino mágico sobre uma mesa,
não cartas genéricas sobre um wallpaper. A criança toca duas cartas para
encontrar fotos iguais; cada acerto converte parte do tabuleiro em um mosaico
das próprias lembranças.

Nos primeiros cinco segundos ela vê cartões fechados, recebe uma indicação
breve para tocar em uma carta e consegue brincar. Não há tutorial temporizado,
cronômetro competitivo, pontuação, derrota, erro em vermelho, buzzer ou
seletor de dificuldade.

## Decisões V1 que M0 deve confirmar

| Assunto             | Decisão proposta                                                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Faixa e dificuldade | EASY é o padrão interno: 4 pares e 8 cartas. STANDARD é configuração experimental interna: 6 pares e 12 cartas. A criança não escolhe a dificuldade.                                                         |
| Disponibilidade     | A sessão só limita o máximo: actualPairCount = min(pairCount da dificuldade, fotos únicas elegíveis). Com menos de 4 fotos, Memory não é oferecido. Ter 92 fotos não aumenta a dificuldade.                  |
| Foto escolhida      | O Hub continua escolhendo uma única foto-âncora; ela participa obrigatoriamente do subconjunto. A criança nunca seleciona seis fotos manualmente.                                                            |
| Metadados           | O snapshot atual confirma photoSelection: subset no GameDefinition. M1 adiciona uma verificação de tipo/registro; não há mudança em platform.                                                                |
| Entrada             | O board começa com os versos. Não revela todas as fotos e não exige memorizar conteúdo temporizado. A foto-âncora pode fazer uma transição visual curta da capa ao cartão, mas nunca atrasa a primeira ação. |
| Vitória             | O mosaico continua visível. A V1 usa **Brincar de novo** pelo replay limpo do shell e **Outras brincadeiras**; “Novas memórias” fica para quando houver seleção efêmera dedicada.                            |
| Foto e privacidade  | Só derivadas autorizadas, sem original, caminho, filename, URL em telemetria ou identificação de cliente no browser. A variante é escolhida uma vez antes do preload.                                        |

Duração alvo inicial: 120 s sem pressão. Ela, a faixa etária, a política de
replay e o uso de STANDARD são hipóteses de produto para validar com crianças,
não fatos estabelecidos por volume de sessão.

### Gate de lifecycle para ações pós-vitória — resolvido

O GameRun atual se torna terminal após complete(). Portanto, Jogar de novo e
Novas memórias não podem reinicializar Scene ou GameRun em silêncio. Em M1, o
proprietário escolhe um caminho que preserve uma nova identidade, seed e
lifecycle por rodada:

1. uma ação tipada e mínima da ponte pede ao shell uma saída limpa e uma nova
   instância; ou
2. o shell encerra o jogo concluído, volta à capa e inicia a nova rodada.

Não colocar navegação em uma Scene, nem guardar Scene em React. Se essa
extensão não estiver aprovada, a V1 entrega a celebração e o retorno seguro à
sessão, sem botão de replay que pareça funcionar mas reutilize um run concluído.

**Escolha implementada para V1:** Jogar de novo usa o `retry` genérico do
shell. Ele desmonta o jogo anterior, cria um `GameRun` novo e gera um novo deck
do mesmo subconjunto. Outras brincadeiras sai para a sessão. “Novas memórias”
não aparece até existir uma seleção efêmera dedicada; ela jamais será guardada
em URL, analytics ou objeto Phaser retido.

## Pré-condições e limites

1. E2.5, E3–E7 do plano de maturidade precisam estar aceitos: HUD do Puzzle,
   receitas de arte/áudio, revisão visual, assets, Android e lifecycle sem
   P1/P2 pendente.
2. Auditar o placeholder já existente em packages/games/memory. Não executar
   game:new sobre ele nem apagá-lo para recriar uma estrutura genérica.
3. O domínio não importa Phaser, React, DOM, rede, Date.now ou Math.random.
   Cada jogo fica isolado; Memory não importa Puzzle e não cria BaseScene.
4. Antes do runtime, ler somente as skills Phaser 4.2.1 pertinentes e conferir
   os tipos instalados e um exemplo oficial 4.2.1. A revisão final de canvas
   em mobile usa revisao-visual-mobile, não somente asserts de DOM.
5. Todo asset de navegador passa pelo manifesto, proveniência e orçamento
   vigentes. Se a Fábrica ainda estiver em v1, usar v1; não inventar formato
   paralelo de manifesto.
6. LOW e movimento reduzido são políticas independentes: LOW pode manter o
   flip funcional; movimento reduzido remove o flip/cascata decorativos,
   mantendo uma troca de face estática e legível.

## Especificação de aceite a congelar em M1

| ID      | Requisito                                                                                                                                                                      | Prova                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| MEM-001 | Dificuldade e quantidade disponível são independentes; EASY usa 4 pares por padrão e STANDARD pode usar 6 somente quando houver seis fotos elegíveis.                          | Teste de política      |
| MEM-002 | A âncora sempre integra um subconjunto único, determinístico e limitado; 120 fotos não se tornam 120 fontes ativas.                                                            | Domínio + E2E          |
| MEM-003 | Havendo candidatos suficientes, a seleção favorece orientação mista e diversidade; no máximo uma foto por similarityGroup quando esse metadado seguro existir.                 | Teste de seleção       |
| MEM-004 | Sem similarityGroup, a política usa posição estável do catálogo apenas como desempate/diversificação. Ela nunca promete detectar similaridade visual sem metadado do pipeline. | Teste de ranking       |
| MEM-005 | O deck possui duas cartas por pairId, mas uma fonte e uma textura por foto ativa.                                                                                              | Deck + runtime         |
| MEM-006 | A variante autorizada é decidida uma vez antes do preload por geometria e orçamento; a rodada nunca baixa thumb e card da mesma foto por promoção automática.                  | Política + rede        |
| MEM-007 | Fotos usam contain e passe-partout; retrato e paisagem não esticam nem sofrem crop padrão.                                                                                     | Layout + screenshot    |
| MEM-008 | Pointer down dá resposta no mesmo/próximo frame; um tap aceito inicia o flip sem esperar áudio, partícula ou tarefa assíncrona.                                                | Instrumentação de feel |
| MEM-009 | No máximo duas cartas não combinadas ficam abertas. Toque rápido, carta igual, matched, entering, paused e resolving não geram revelação, turno ou SFX indevido.               | Arbiter + stress E2E   |
| MEM-010 | Match tem reconhecimento, confirmação e magia finita; cartas encontradas ficam abertas, não interativas e visualmente resolvidas.                                              | Runtime + revisão      |
| MEM-011 | Mismatch mantém as fotos por 750 ms iniciais, fecha as duas juntas, não dá haptic/erro e volta o input somente ao terminar.                                                    | Tuning + E2E           |
| MEM-012 | Dica mostra próximo gesto sem resolver. Idle destaca o controle uma vez; dica manual mostra o par sequencialmente ou só o par da carta aberta.                                 | Domínio + E2E          |
| MEM-013 | Pausa estabiliza a apresentação, oculta 100% das fotos por capa opaca e congela resolução pendente. Retomar preserva estado e tempo restante.                                  | E2E visual             |
| MEM-014 | Pair count, deck, cardId e cardId para slot ficam congelados no início. Resize reposiciona objetos existentes, inclusive durante flip/resolução.                               | Layout + E2E           |
| MEM-015 | LOW, NORMAL e movimento reduzido preservam jogo, leitura e conclusão. Efeito de ambiente fica atrás da foto, é limitado e possui alternativa estática.                         | Screenshot + inspeção  |
| MEM-016 | Cada ação aceita tem no máximo um SFX principal; cooldown e polyphony impedem sobreposição. Feedback segue compreensível sem som/haptic.                                       | Política de áudio      |
| MEM-017 | Intro não é requisito para aprender e não atrasa o run. Entrada, flip, pausa, resize, visibility e saída não deixam meia carta, timer ou callback órfão.                       | Stress E2E             |
| MEM-018 | Vitória mantém o mosaico visível antes de texto e ações. Nenhuma celebração cobre a fotografia principal.                                                                      | Screenshot             |
| MEM-019 | Falha essencial faz retry limitado e GAME_ASSET_FAILED seguro; não substitui foto, embaralha ou começa uma partida parcial.                                                    | Fixture HTTP           |
| MEM-020 | SceneScope encerra listener, tween, timer, som, emissor e textura de posse da Scene; cinco entradas/saídas deixam zero canvas/áudio/recurso órfão.                             | Lifecycle E2E          |
| MEM-021 | Métricas de game feel, se aprovadas pela política de analytics, são agregadas e não contêm photoId, URL, filename, token ou identidade.                                        | Contrato + revisão     |
| MEM-022 | Nenhum efeito usa Phaser Lighting por carta, filtro de match ou blur por frame. Material, ouro e frost são assets/preparo ou transformações simples.                           | Revisão de runtime     |

## Contrato de experiência e game feel

### Entrada e primeira ação

A capa mostra a foto-âncora, o título Memórias de Natal, a regra “Encontre as
fotos iguais” e o botão Jogar. A transição opcional da âncora para o board é
uma continuidade de 300–500 ms pertencente à rota; seu fallback é fade curto,
sem acesso do Phaser ao DOM da capa.

O board já chega com cartas fechadas:

| Tempo após board montado | Resposta                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| 0 ms                     | Board e versos aparecem.                                                                     |
| 0–180 ms                 | Cartas assentam uma única vez.                                                               |
| 180–400 ms               | HUD espacial entra.                                                                          |
| 400–600 ms               | Uma carta recebe microbrilho finito e surge “Toque em uma carta”.                            |
| até 600 ms               | Input é liberado. A instrução some na primeira revelação e não volta como rodapé permanente. |

A meta é registrar a diferença entre pointer down e press visual, e entre
comando aceito e início do flip. Ela deve ficar em um frame/próximo frame,
idealmente abaixo de 50 ms; é uma meta de revisão e Android, não um limite de
CI inventado antes de medição.

### Cartão físico, resposta e erro gentil

O Card Lab em M2 congela estes valores iniciais em tuning local:

| Momento          | Coreografia inicial                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Press            | 70–90 ms; escala 1 para 0,97–0,98, sombra reduz e borda aquece discretamente.                                                                  |
| Flip             | Duas metades de 90–110 ms: scaleX 1 para 0,06, scaleY até 1,025, troca frente/verso no meio, depois retorno. Sem bounce forte.                 |
| Match            | 80–120 ms para a criança reconhecer; 160–200 ms de moldura dourada e escala até 1,025; então 3–5 faíscas nas bordas, nunca sobre rosto/foto.   |
| Estado resolvido | Moldura ouro suave, pequena estrela de canto e sombra estável; não pulsa continuamente.                                                        |
| Mismatch         | As duas frentes permanecem por 750 ms inicial, recebem um único retorno de papel e fecham juntas. Não há X, vermelho, shake, buzzer ou haptic. |
| Hint             | Halos em sequência, uma repetição no máximo, 800–1.000 ms no total; contraste estático quando reduzido.                                        |

A primeira revelação é o primeiro gesto elegível para unlock de áudio:
card.flip toca e a música entra discretamente 300–500 ms depois. Som ou
partícula nunca bloqueiam a apresentação.

### Estados, arbiter e estabilidade

MemoryTurn mantém a verdade pura do jogo, incluindo as fases ready, one-open,
resolving-match, resolving-mismatch e completed. MemoryPresentationPhase é
exclusivamente local ao runtime: entering, playing, paused, celebrating e
leaving.

MemoryInteractionArbiter é um adaptador puro no runtime, não uma coleção de
ifs espalhada pela Scene. Ele combina as duas fases e aceita/rejeita cada
ponteiro antes de chamar o domínio. Cartas não são aceitas em entering,
paused, resolving ou quando já matched; a mesma carta aberta é ignorada.

Ao pausar no meio de flip, o presenter estabiliza frente ou verso conforme o
estado de domínio antes de exibir a capa de álbum opaca. Durante mismatch, o
scheduler guarda o tempo restante e não executa por trás da pausa/aba oculta.
Resize estabiliza uma transição curta antes de recalcular coordenadas; saída
cancela recursos via SceneScope sem disparar callback posterior.

### Board, HUD e direção de arte

O board usa mesa/feltro verde-pinho, profundidade azul-noturno, cartões de
veludo-framboesa, passe-partout marfim e ouro suave. A foto real é sempre o
elemento mais detalhado.

- Card aspect começa entre 0,78 e 0,82, com 8–12 CSS px de espaço entre
  cartas, ajustado somente se todos os alvos principais continuarem em 52 CSS
  px ou mais.
- O alvo é a carta inteira. Ícones podem medir 40–44 px visuais, mas têm hit
  area de 52 px e 6–10 px de separação. Dica exibe estrela mais a palavra
  Dica; som e pausa têm rótulo acessível.
- React mantém rota, sair e semântica não espacial. Phaser possui somente
  progresso, dica, som, pausa, board e apresentação. Nenhuma informação é
  duplicada em DOM e canvas.
- Pausa é uma capa de álbum fechada verde/pinho e ouro, sem blur em runtime.
  Ela cobre todo o stage e diz apenas que a brincadeira está esperando, com
  Continuar e Sair compreensíveis.

Fairy lights são imagens/preparo simples, nunca Phaser Lighting. NORMAL pode
usar no máximo três grupos de alpha quase estático; luzes próximas ao par
podem clarear uma vez por 120 ms e a dica pode conduzir uma sequência curta
até os cartões. LOW omite esse sistema animado, preservando no máximo a
decoração estática já contida no fundo/board.

Criar uma vez AmbientSnow, MatchSpark e VictorySnow, cada qual com pool e
limite próprio: até 10 flocos ambiente, 5 faíscas no match e 18 partículas de
vitória. AmbientSnow tem depth abaixo de cardPhoto; feedback nunca ocupa o
centro fotográfico. Sem emitter novo por acerto, filtro, bloom ou blur.

### Política de áudio e haptic

SoundCuePolicy local declara papéis, volumes iniciais, cooldown, polyphony,
variações e limpeza antes de preparar arquivos:

| Papel         | Regra inicial                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ui.button     | Único som para botões; cooldown de 60 ms, máximo uma instância.                                                            |
| card.flip     | Único som principal do toque na carta; papel fotográfico/swish de 80–140 ms, máximo duas instâncias por cartas diferentes. |
| card.return   | Um único papel suave para o fechamento duplo; máximo uma instância.                                                        |
| pair.match    | Sino quente e celesta de 300–450 ms; máximo uma instância; 2–3 variações escolhidas por sequência determinística do run.   |
| hint.magic    | Duas notas curtas e brilho; máximo uma instância.                                                                          |
| christmas.win | Sinos, arpejo de celesta e acorde quente de 1–1,5 s; máximo uma instância.                                                 |
| music.memory  | Música discreta, 0,10–0,16 inicial. No último match, duck de 4–6 dB antes da vitória e retorno suave depois.               |

Flip e retorno não usam haptic. Match usa impacto leve/médio e vitória um
impacto curto, sempre opcional. Os volumes propostos são tuning inicial a
revisar no Android; o manifesto continua descrevendo fontes, não normalizando
o som por intuição.

## Seleção de fotos, variantes e orçamento

### Política de dificuldade e diversidade

MemoryDifficulty decide o pair count desejado; MemoryPhotoSelection aplica o
máximo da sessão. Ela recebe apenas MemoryPhotoCandidate seguro: id,
orientation, catalogPosition derivada da ordem da sessão e similarityGroup
opcional. Não recebe URL, arquivo, pixels ou objeto Phaser.

PhotoDiversityPolicy usa ranking determinístico:

1. inclui a âncora;
2. exclui id repetido e, quando conhecido, candidates do mesmo similarityGroup;
3. dá preferência a orientação que falta e à maior distância de posições já
   escolhidas;
4. usa tie-break derivado do seed para escolhas equivalentes;
5. preenche somente o pair count da dificuldade.

catalogPosition é um fallback, não análise visual. Antes de acrescentar
perceptualHash/similarityGroup ao contrato de mídia, medir o problema e abrir
uma decisão específica de pipeline/privacidade; não carregar, comparar ou
enviar pixels no browser para decidir diversidade.

### Política de variante

O pipeline atual publica thumb até 480 px, card até 800 px e game até 1.600 px
no maior lado. MemoryPhotoVariantPolicy recebe o plano de layout inicial,
aspect ratio da foto, DPR aplicado e tetos de qualidade. Antes do preload ela:

1. calcula a maior aresta física realmente usada pela superfície contida;
2. estima bytes RGBA decodificados pela variante e pelo número de fotos;
3. escolhe a menor derivada autorizada visualmente indistinguível na matriz
   mobile e Android de referência;
4. fixa a escolha para a rodada inteira, incluindo resize, sem promoção e sem
   carregar duas variantes.

M4 compara thumb e card em 390, 412, 430, 768 e Android. A regra não presume
que card é sempre melhor nem que thumb é sempre suficiente. A foto-âncora da
capa deve usar a mesma derivada da partida quando a comparação permitir,
reaproveitando cache; caso a capa exija card, a rodada reutiliza card para a
âncora em vez de baixar thumb novamente. Nenhum caminho baixa original ou
game por padrão.

O orçamento de M4 mede requests, bytes transferidos, runtime bytes,
estimatedDecodedTextureBytes, texturas, objetos, tweens, timers, emissores e
instâncias de áudio. Limites numéricos só viram bloqueio depois de coleta no
Android de referência.

## Pacotes de trabalho

### M0 — produto, gates e baseline

- Confirmar E7, registrar commit/base e rodar pnpm validate antes de alterar
  Memory.
- Registrar faixa etária, defaultDifficulty, pairCountPolicy, replayPolicy e
  newSubsetPolicy. Aprovar ou adiar a extensão segura de pós-vitória.
- Definir a observação privada com crianças/responsáveis e a métrica Android;
  não registrar fotografia ou identificação no repositório.

**Aceite:** EASY/4 pares é escolha explícita, não consequência silenciosa de
uma sessão grande; nenhuma regressão aberta no Puzzle.

### M1 — contratos, pacote e shell

- Preservar o pacote placeholder e criar definition, tuning, exports,
  EXPERIENCE, EXPERIENCE_REQUIREMENTS, SPEC, proveniência e manifesto próprios.
- Atualizar o SPEC para MEM-001–022. Validar que GameDefinition aceita subset
  no typecheck e registrar Memory como chunk lazy em package, Vite e registry.
- Corrigir o Hub/capa para dois jogos: âncora única, copy de Memory sem
  contagem/orientação técnica, sessão insuficiente indisponível de forma
  compreensível.
- Definir o owner dos botões pós-vitória e só então tocar ponte/router. Sem
  extensão aprovada, manter retorno seguro em vez de reset dentro da Scene.
- Criar GameFeelContract, SoundCuePolicy e interfaces de diversidade/variante
  antes de assets Phaser.

**Aceite:** a capa não cria Phaser, o subset é semanticamente explícito e
nenhuma navegação quebra o lifecycle do GameRun.

### M2 — protótipo e Card Lab

- Criar mockups seguros de capa, board EASY/STANDARD, pausa, match, mismatch e
  vitória em 390 × 844, 412 × 915, 430 × 932, 768 × 1024 e paisagem inicial.
- Criar Card Lab isolado com press, flip, match, return, hint, LOW e reduzido;
  ajustar timings, aspecto, gaps, HUD e contraste antes da Scene.
- Revisar pela rubrica GAME_EXPERIENCE_REVIEW: benefício, screenshot,
  viewport/perfil, custo, alternativa e severidade. Corrigir P1/P2 antes de
  novos assets.

**Aceite:** é possível sentir e aprovar a carta profissionalmente sem mascarar
um problema de feedback dentro da lógica do board.

### M3 — domínio e arbiter testados

- Implementar MemoryDifficulty, MemoryPhotoSelection, PhotoDiversityPolicy,
  MemoryDeck, MemoryTurn, MemoryProgress, MemoryHint e MemoryLayoutPlanner.
- Implementar MemoryInteractionArbiter junto ao adapter de runtime, mantendo-o
  puro e com testes de estado/presentation.
- Cobrir seed repetível, âncora, 4/5/6/120 fotos, grupo semelhante, orientação,
  distância de catálogo, deck, match, mismatch, hint, ordem/slot e todos os
  inputs rejeitados.

**Aceite:** regras e aceitação de input passam em testes sem Phaser,
aleatoriedade global ou relógio real.

### M4 — mídia limitada e assets auditados

- Executar a comparação visual/Android thumb versus card e fixar
  MemoryPhotoVariantPolicy. Cobrir a relação entre variante de capa e board.
- Carregar somente 4/6 fontes selecionadas uma vez. Provar por adapter e rede
  que não são solicitadas 8/12 URLs, duplicadas ou catálogo inteiro.
- Criar assets manifestados e com proveniência: fundo/board, verso, molduras,
  ícones, três pools de VFX e política de áudio. Nenhuma foto de sessão entra
  no manifesto.
- Exercitar uma repetição de foto essencial e GAME_ASSET_FAILED seguro por
  fixture HTTP.

**Aceite:** a menor variante aprovada é justificada visualmente e por textura,
o jogo passa asset:validate e não inicia de modo parcial.

### M5 — runtime robusto e responsivo

- Criar createMemoryGame, CardView, presenters de board/HUD/pausa/vitória,
  scheduler de resolução e SceneScope. Criar 8/12 cards uma vez; resize apenas
  reflow.
- Implementar entrada curta, arbiter, flip, match, return, hint, pause,
  visibility, mute e saída a partir dos resultados puros do domínio.
- Instrumentar marcações de input e início de apresentação para revisão de
  latência; nunca bloquear a resposta por áudio/VFX.
- Executar rapid tap, pause/resize/exit durante flip e mismatch, visibility
  durante resolução e mute/unmute rápido.

**Aceite:** nenhuma sequência rápida corrompe o deck, revela terceira carta,
deixa meia carta ou deixa trabalho após destroy.

### M6 — acabamento em fatias verificáveis

- **M6a — Card feel:** aplicar coreografia aprovada e estados persistentes de
  match.
- **M6b — Board lighting:** material, fairy lights simples, depth de neve e
  limites sem Lighting/filter/blur.
- **M6c — Sound feel:** fontes aprovadas, variações, volumes, duck, polyphony,
  cooldown, unlock e teardown.
- **M6d — Vitória e saída:** mosaico primeiro, mensagem/efeito finito depois e
  ações pós-vitória somente se o gate de lifecycle tiver sido fechado.
- **M6e — LOW/reduzido:** validar cada fallback explicitamente, sem reduzir a
  capacidade de jogar.

**Aceite:** efeito tem função, duração, custo, alternativa e owner; a foto
continua no plano principal.

### M7 — evidência, playtest e fechamento

- Criar Playwright e screenshots por estado; fazer revisão visual mobile e
  passagem Android conforme rubrica.
- Medir game feel: timeToFirstCardMs, timeToFirstMatchMs, turns, hintsUsed,
  completionDurationMs, completed, pairCount, qualityTier e viewportClass
  apenas se uma extensão de analytics agregada for aprovada. Nunca registrar
  foto/sessão/URL.
- Medir performance por estado e documentar percentis, requests, bytes,
  texturas e teardown antes de propor qualquer budget bloqueante.
- Rodar cinco ciclos entrar/sair e registrar em docs/lessons somente
  descobertas duráveis. Mover o plano para completed somente após todos os
  aceites.

## Matriz obrigatória de browser e stress

| Cenário                     | O que deve ser provado                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| EASY em sessão 4            | 8 cartas, âncora, 4 pares e conclusão.                                                              |
| STANDARD em sessão 12 mista | 12 cartas, 6 pares, orientação mista e contain.                                                     |
| Sessão 120                  | Apenas o subset/variante decidido é carregado; nenhuma duplicação ou catálogo completo.             |
| A/B/C/D em 100–150 ms       | Só A+B entra no turno; C/D não viram, não contam e não tocam SFX.                                   |
| Pause no flip/mismatch      | Carta estabiliza, capa esconde fotos, hold congela e retorna corretamente.                          |
| Exit no flip/timer          | Tween/timer/som encerrados, canvas zero, nenhum callback posterior.                                 |
| Resize no flip              | cardId, slot, state e variante permanecem; objetos não são recriados.                               |
| Aba oculta no mismatch      | Clock ativo e scheduler de apresentação permanecem coerentes.                                       |
| Hint durante resolving      | Ignorada; hint nunca resolve par.                                                                   |
| Match/mismatch              | Estado resolvido persistente; retorno gentil de 750 ms; progresso correto.                          |
| LOW e reduzido              | LOW com flip funcional e sem ambiente caro; reduzido sem flip/cascata/loop, mas concluível.         |
| Áudio                       | Primeiro flip desbloqueia; mute/unmute não duplica música; cooldown/polyphony e teardown funcionam. |
| Asset failure               | Retry limitado e erro seguro, sem deck parcial.                                                     |
| Lifecycle                   | Cinco entradas/saídas: um canvas durante o jogo, zero depois; zero áudio/recurso da Scene.          |

## Validação e definição de pronto

Durante cada pacote: pnpm check:fast. Ao fechar M4: pnpm --filter
@christmas-games/asset-factory run validate -- --game memory. Na entrega:
pnpm check, pnpm build, pnpm asset:validate, pnpm test:e2e e pnpm validate.

Memórias de Natal V1 só está pronta quando:

1. a dificuldade não muda porque a sessão é grande;
2. a primeira ação é imediata e aprendida pelo toque;
3. fotos quase iguais são evitadas quando existe sinal seguro para isso;
4. a carta responde, vira, acerta e retorna com coreografia/áudio limitados;
5. a foto, o board e a ação continuam mais legíveis que decoração;
6. o subconjunto usa uma variante por foto, com custo de textura medido;
7. pause, aba oculta, resize, rapid tap, saída e retries permanecem
   determinísticos;
8. LOW, movimento reduzido, Android e cinco ciclos de lifecycle possuem
   evidência visual e funcional sem P1/P2 aberto.
