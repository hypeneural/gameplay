# CG — Trinca de Natal: plano canônico de implementação R3

**Estado:** em execução — T0–T2, R3-A/B, R3-C.2–C.4, R3-D.1, R3-D.2b e R3-F.2b foram concluídos
em 30–31-08-2026. A R3 preserva o domínio e substitui a sequência T3–T6 por uma
reconstrução incremental da apresentação. O primeiro pacote visual e sonoro
original está publicado com proveniência, manifesto e auditoria; Noel ilustrado,
cena A1 final e matriz de liberação continuam sujeitos aos seus próprios gates.

**Jogo:** Trinca de Natal (tic-tac-toe)  
**Promessa:** fotografias da sessão tornam-se as peças de um mural natalino;
quem fizer três lembranças em linha vence.  
**Formato:** mobile-first, retrato, um toque por vez, crianças e família,
partida melhor de três em aproximadamente 2–4 minutos.  
**Base confirmada:** React 19.2, TypeScript 6, Phaser 4.2.1, Vite 8, pnpm 11 e
Node 24. Regra, IA e seleção continuam puras e determinísticas.

## Acompanhamento de execução

- [x] Autorização explícita para iniciar Trinca de Natal, recebida em
      30-08-2026.
- [x] T0: contrato de produto, experiência, direção e papéis de asset
      registrados sem aprovar mídia nem alterar o runtime.
- [x] T1: regras, match, setup, seleção de foto B e laboratório de IA com
      testes determinísticos, incluindo oráculo independente para o Mestre.
- [x] T2: Board Lab com Zones, IA/local, picker, pausa, bridge e resize
      revisados em 390 × 844, 412 × 915, 430 × 932 e 768 × 1024.
- [x] R3-A: contratos reconciliados, personalidade Gentil e provas de IA
      independentes.
- [x] R3-B: input down/up, pausas por razão e lifecycle do board interativo.
- [x] R3-C.1: HUD de faixas independentes, cópia curta e revisão com
      derivados locais opacos em 390, 412, 430 e 768 px.
- [x] R3-C.2a: retângulos responsivos, retorno contextual, pausa com
      confirmação e estados normal/pressed/disabled revisados em 390, 412,
      430 e 768 px.
- [x] R3-C.2b: porta-retrato proporcional de A e cartões de modo/dificuldade
      revisados sem nova carga, corte, filtro ou input na foto.
- [x] R3-C.2c (kit): fundo, moldura e cordão originais preparados em WebP,
      publicados sob `public/assets/tic-tac-toe/`, registrados no manifesto v2
      e auditados localmente; áudio autorizado foi copiado para o jogo.
- [x] R3-C.2: sistema visual "Mural Fotográfico 2.5D", estados não
      selecionados, retorno ao menu e hierarquia mobile definidos.
- [x] R3-C.3: BoardView persistente, encaixes físicos e resize seguro.
- [x] R3-C.4: cartão transitório dock → célula, com settle determinístico.
- [x] R3-C.4a: cartão de colocação A/B/Noel parte do dock e revela a peça
      persistente somente ao pousar; pause no meio do voo normaliza a mesma
      peça aceita sem duplicação. A passagem de resize nos telefones integra o
      gate amplo de liberação R3-G.
- [x] R3-D.1: picker com thumbnails reais, paginado e limitado.
- [x] R3-D.1a: primeira página privada do picker com até seis `thumbs` reais
      em grade 3 × 2, chaves opacas por slot, proporção preservada e ordem
      estável em retry; a paginação reutiliza os mesmos seis slots e libera
      a página anterior antes de carregar a próxima.
- [ ] R3-D.2: docks A/B/Noel e HUD físico de turno/placar.
- [x] R3-D.2a: cada dock reutiliza o `card` autorizado de A/B quando há
      fotografia e o mini cartão se torna a origem visível do PlacementCard;
      o refinamento de placar e Noel ilustrado continua pendente.
- [x] R3-D.2b: placar físico compacto separa rodada, lados e empates da
      mensagem contextual; o selo nativo do Noel diferencia sua vez sem arte
      de personagem, filtro ou superfície de toque adicional.
- [ ] R3-E: vertical slice A1 com assets aprovados, luz de oficina e
      manifesto auditado.
- [ ] R3-F: som, haptic, VFX, guirlanda e hero final da partida.
- [x] R3-F.1: confirmação de encaixe, celebração finita de vitória e onda de
      empate; não cria mídia nova nem decoração contínua.
- [x] R3-F.2: hero final finito, retorno ao início e cordão estático de
      vitória nos gutters horizontal/vertical, inclusive em LOW e movimento
      reduzido.
- [x] R3-F.2b: hero final com medalha sem cobrir a foto, cópia curta por
      vencedor e uma única faixa narrativa; os docks fotográficos não recebem
      emblema sobreposto.
- [ ] R3-G: matriz mobile, Android de referência e liberação.

## 0. Autoridade técnica e validação

As chamadas Phaser deste plano foram rechecadas na
[validação oficial de Trinca de Natal](../references/TIC_TAC_TOE_OFFICIAL_VALIDATION.md).
Antes dessa sequência, o executor confirma em package/lock e no pacote local
que a instalação é Phaser 4.2.1. Isto é um preflight de compatibilidade, não
uma inversão de autoridade.
Para qualquer chamada nova, a ordem obrigatória do repositório é: source/tag
oficial Phaser 4.2.1 → skill vendorizada 4.2.1 → tipos instalados → exemplo
oficial da mesma release → donor externo. Documentação pública, exemplos de
Phaser 3, master e donors não autorizam uma assinatura de API por si só.

## R3. Reconciliação e estratégia de produção

A auditoria profunda foi reconciliada com o workspace em
[TIC_TAC_TOE_R3_REPORT_RECONCILIATION.md](../references/TIC_TAC_TOE_R3_REPORT_RECONCILIATION.md).
Ela confirma que as regras, IA, seleção segura de fotos e registro lazy não
devem ser reescritos. O Board Lab é uma prova técnica útil, mas não é o
vertical slice final: a fotografia ainda precisa parecer uma lembrança física
que sai do dock e encontra seu encaixe no mural.

### Invariantes R3

- O domínio continua a decidir legalidade, turno, vencedor, empate, placar,
  match-complete e jogada de Santa. Phaser nunca os recalcula.
- `pointerdown` só inicia pressão visual; `pointerup` confirma a mesma célula,
  o mesmo pointer e o mesmo epoch antes de chamar o domínio. Move fora do slop,
  pause, resize crítico, hidden/blur, shutdown e saída cancelam a pressão.
- O tabuleiro terá nove `CellView` permanentes. Uma jogada cria somente o
  `PlacementCard` transitório; o token final da célula fica visível no settle.
  Nenhuma peça já aceita é destruída e recriada em uma jogada posterior.
- Fotos usam `thumb` no picker e `card` em docks/células. Apenas A.card, a
  página visível de thumbs e B.card após a escolha podem entrar no Loader.
  Originais, URLs, IDs de sessão e arquivos de cliente não entram em texto,
  analytics, assets estáticos ou manifesto.
- `GameRun.open()` mantém a semântica compartilhada de relógio. `ready()`
  significa setup visual utilizável; `start()` só ocorre quando o primeiro
  board está interativo. `complete()` espera a guirlanda, hero e resultado
  estável, e continua idempotente.
- Pausa é um conjunto de razões (`manual`, `hidden`, `blur`, `shell`), não um
  booleano. Uma razão removida não pode retomar uma partida enquanto outra
  razão continua ativa.

### Sequência R3 e gates

| Fase | Resultado concreto                                                              | Prova antes de avançar                                                                            |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| R3-A | Plano/SPEC/experiência coerentes; Gentil confiável; oráculo Master independente | Testes de IA, estados alcançáveis e simetrias sem import da IA de produção para expected          |
| R3-B | `TicTacToePointerArbiter`, motivos de pausa e `start()` no board                | Down sem commit; up válido comita uma vez; pointer fora, pause e `POINTER_UP_OUTSIDE` não comitam |
| R3-C | Layout responsivo, `BoardView`/`CellView` e movimento determinístico            | Tokens conservam identidade; pause/resize no flight normalizam para o estado já aceito            |
| R3-D | Picker paginado, docks A/B/Santa e placar físico                                | Seis thumbs no máximo; B.card falha e retorna ao picker; catálogo de 172 nunca vira preload       |
| R3-E | Cena A1 estática: oficina, mural, Santa, iluminação e tipografia aprovadas      | Foto > board > turno > Santa; manifesto, proveniência e `asset:validate` passam                   |
| R3-F | Diretores locais de som/haptic/VFX, guirlanda, finale e hero                    | Mudo, pause, resume e destroy; LOW/reduzido preservam a regra sem partículas/loops decorativos    |
| R3-G | Matriz de liberação                                                             | 390/412/430/768, NORMAL/LOW/reduzido, Santa/local, visibilidade e cinco mount/exit sem P1/P2      |

### Decisões de produto R3

- **Noel Gentil:** sempre aproveita vitória imediata; bloqueio imediato é uma
  chance de tuning (inicialmente 65%); nas demais casas, o sorteio injected
  privilegia centro, canto e lateral nessa ordem. Uma vitória óbvia ignorada
  parece defeito; uma defesa ocasionalmente perdida parece gentileza.
- **Noel Esperto:** vitória → bloqueio → fork próprio → defesa explícita de
  fork único/múltiplo → centro → canto oposto → canto → lateral. Ele não usa
  Minimax oculto.
- **Áudio em LOW:** LOW simplifica visual; música ainda respeita
  `soundEnabled` e só será omitida por custo após medição física. Mudo e
  movimento reduzido não são sinônimos de LOW.
- **Assets:** não criar manifesto vazio ou placeholders como arte final.
  Primeiro arquivo aprovado já entra com origem, licença, hash, bytes,
  dimensão/duração, perfil e estado `PRONTO_PARA_RUNTIME`.
- **R3-F.1 — resposta afetiva curta:** o toque dá apenas um haptic leve; o
  encaixe usa o cue de madeira/sino já aprovado, haptic médio e faíscas
  externas finitas. Vitória acrescenta guirlanda, 15 no máximo de estrelas
  externas às fotos, cue festivo e haptic forte; empate recebe uma onda dourada
  e haptic médio, sem som punitivo. LOW e movimento reduzido mantêm a leitura
  final, sem loops ou faíscas animadas.

### R3-C.1 — HUD legível, uma mensagem por vez

As capturas privadas de 30-08-2026 encontraram um P1 no Board Lab: `status`
e `coach` podem quebrar em duas linhas na mesma faixa vertical. Em empate,
resultado e orientação se tornam uma massa de texto sobre o topo do mural; em
`thinking`, a mensagem do Noel e a frase decorativa competem entre si. Isto
viola a hierarquia foto → ação → tabuleiro e impede a leitura infantil.

**Decisão:** o HUD passa a ter quatro faixas sem sobreposição, verificadas na
menor tela 390 × 844: marca (título), progresso compacto, faixa de mensagem e
contexto opcional. Durante a partida, pensamento, encaixe, resultado de rodada e
resultado final usam somente a faixa de mensagem; o contexto fica vazio. Nas
telas de escolha, a faixa comunica a regra e o contexto traz a única próxima
decisão. Não haverá duas frases concorrentes sobre o tabuleiro.

| Faixa     | Conteúdo                                   | Regra de layout responsivo                            | Tratamento visual                                |
| --------- | ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------ |
| Marca     | `TRINCA DE NATAL` + pausa                  | primeira faixa após safe top                          | dourado, curto, sem instrução                    |
| Progresso | `Rodada n/3 · A × B · empates`             | abaixo da marca, altura pelo texto aprovado           | texto compacto, neve suave                       |
| Mensagem  | turno, Noel pensando, encaixe ou resultado | abaixo do progresso; painel com altura do conteúdo    | faixa verde-pinho translúcida com filete dourado |
| Contexto  | somente menus/picker                       | abaixo da mensagem, até duas linhas                   | branco menor                                     |
| Mural     | 3 × 3 e suas fotos                         | depois da última faixa ativa, com gap mínimo de 20 px | não disputa espaço com a cópia                   |

**Cópia curta:** `O Noel está escolhendo…` substitui as duas frases longas;
o empate é `Empate de Natal!\nQue partida apertada!`; vitória e próxima ação
ficam dentro da mesma faixa. O placar deixa a fórmula técnica “Rodadas /
Empates” e passa a dizer `Rodada n/3 · A × B`, acrescentando empates apenas
quando houver.

**Prova:** teste puro garante separação entre score, mensagem, contexto e topo
do board; revisão privada em 390, 412, 430 e 768 confirma que nenhuma linha
toca o mural. A revisão com fotos reais usa somente `media:prepare-local` em
raiz privada e a rota `?test-media=local`; originais, caminhos e nomes não
entram em assets públicos, DOM, analytics ou documentos.

### R3-C.2 — Direção visual: Mural Fotográfico 2.5D

**Decisão de produto:** as referências visuais recebidas em 30-08-2026 são
uma âncora de qualidade para madeira escura, dourado quente, luzes de Natal,
porta-retratos e celebração. Elas não são assets e não autorizam copiar sua
composição, personagens, textos embutidos ou fotografias. A implementação real
é uma cena 2D em camadas: preserva o espaço útil do celular e faz as fotos
autorizadas da sessão serem a parte mais forte da tela.

O visual deixa de ser um conjunto de retângulos planos e passa a comunicar um
**mural físico da Oficina do Noel**. Profundidade vem de sombra de contato,
bevel, passe-partout, luz preparada e micro-movimento; não de 3D, câmera,
filtro sobre fotos, Bloom no canvas inteiro ou partículas contínuas.

| Plano | Papel no mural     | Conteúdo e limite                                                               |
| ----- | ------------------ | ------------------------------------------------------------------------------- |
| L0    | profundidade calma | noite/parede de oficina de baixo contraste; nunca informação nem input          |
| L1    | calor natalino     | madeira, uma fonte âmbar e cordão curto de luz; enquadra, mas não cruza o board |
| L2    | jogo               | fotos da sessão, mural 3 × 3, HUD, docks e ação principal; maior contraste      |
| L3    | primeiro plano     | no máximo dois props silenciosos nos cantos; removíveis em LOW                  |

Em 390 px, a leitura obrigatória é **foto/ação → tabuleiro → turno →
cenário**. O grande título ornamental da referência não entra no canvas: o
shell React já contém `Sair do jogo` e `Compartilhar`, e a marca compacta de
R3-C.1 continua a reservar altura para o gesto e para o mural.

#### Fotos da sessão: protagonistas, não textura decorativa

| Estado          | Uso de fotos permitido                                                                | Regra de carga e privacidade                                                              |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Escolha de modo | A.card em porta-retrato; até dois thumbs já autorizados como fotos presas ao cenário  | A.card é crítica; thumbs decorativos são opcionais e silenciosamente omitidos se falharem |
| Picker de B     | A.card identificada; até seis candidatos `thumb` reais, em grade 3 × 2                | somente a página visível entra no Loader; ordem/página não muda em retry                  |
| Partida         | A.card/B.card são reutilizadas nas peças e docks                                      | não há novo request por jogada, nem filtro, crop forçado ou textura `game` automática     |
| Resultado       | card do vencedor reaparece como hero; no empate os dois docks permanecem equivalentes | hero reutiliza card já presente; não há foto vencedora falsa                              |

Fotos periféricas são menores, sem input e fora da zona protegida do board.
Elas não exibem filename, caminho, ID, provider ou outro metadado. Originais
continuam fora do navegador; testes locais usam somente derivados opacos em
raiz privada.

#### Estados visuais que hoje parecem vazios

Uma casa livre não pode se parecer com carta virada ou bloco branco. Ela é um
**encaixe de álbum**: papel marfim quente, relevo natalino muito sutil, moldura
de madeira/dourado e centro respirado. A foto só aparece já de frente depois
de a jogada ser aceita.

| Estado       | Aparência                                                              | Feedback                                       |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Normal       | encaixe marfim + detalhe de canto; sem branco puro dominante           | pronto para tocar                              |
| Pressionado  | encaixe desce 2 px, filete aquece                                      | 45–75 ms; ainda não muda domínio               |
| Ocupado      | PhotoCard frontal, sombra de contato, badge de estrela/sino na moldura | realce neutro e curto, sem castigo             |
| Dock ativo   | borda dourada, luz âmbar discreta, rótulo forte                        | confirma de quem é a vez                       |
| Dock inativo | superfície escurecida; a miniatura continua com cor natural            | não usa alpha na foto para indicar inatividade |
| Desabilitado | contraste estável e sem resposta de toque                              | apenas durante Noel, placement ou resultado    |

Botões não selecionados usam verde-pinho ou cranberry com filete dourado,
nunca fundos creme vazios. Pressão, foco e indisponibilidade combinam rótulo,
borda e escala; cor sozinha não é estado suficiente.

#### Fluxo de telas e retorno seguro ao início

1. **Modo:** foto A em porta-retrato; convite curto; cartões `Jogar com o
Noel` e, se disponível, `Duas pessoas`.
2. **Dificuldade:** mantém foto A e troca apenas o convite pelos três níveis;
   não repete explicações longas.
3. **Picker:** A ocupa o papel “sua lembrança”; seis thumbnails reais aparecem
   em 3 × 2 com moldura tátil. `Lembrança 1…6` deixa de ser a interface
   principal; cada card acessível comunica a ação de escolher a foto.
4. **Partida:** mural ocupa o centro; placar é cápsula compacta; dois docks
   fixos abaixo do board mostram vez atual sem deslocar o layout.
5. **Resultado de rodada:** preserva board e deixa guirlanda explicar a linha;
   a única ação é a próxima rodada.
6. **Resultado da partida:** hero da foto depois da celebração finita, placar
   e ações de repetir/compartilhar.

No setup, `← Voltar` é um controle explícito no canvas: dificuldade retorna ao
modo e picker retorna à escolha de modo, sem descartar uma partida porque ela
ainda não existe. Durante o tabuleiro, o topo fica deliberadamente simples:
somente `Pausar` é exibido no canvas. O painel de pausa oferece `Continuar`,
`Som` e `Voltar ao início`; esta última ação pede confirmação curta — “Voltar
ao início? Esta partida será encerrada.” — antes de descartar match e
transientes. Assim a família ainda tem o caminho pedido para escolher Noel ou
Duas pessoas, sem somar uma quarta ação de navegação ao topo estreito. O shell
continua dono de `Sair do jogo` e `Compartilhar`.

#### Movimento, luz e efeitos: natalinos, finitos e com função

| Evento                 | NORMAL                                                                    | LOW / movimento reduzido               |
| ---------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| Entrada de menu/picker | foto e painel assentam uma vez, até 260 ms                                | estado final imediato                  |
| Card de escolha        | compressão 80–140 ms + filete quente                                      | compressão única ou borda estática     |
| Commit da célula       | PhotoCard sobe do dock, arco de 160–200 ms, settle de 90–120 ms           | token final faz fade + escala curta    |
| Noel pensando          | três lâmpadas em 2–3 estados, sem spinner                                 | três lâmpadas estáticas                |
| Vitória                | frames sobem 3–4 px; guirlanda 350–550 ms; até 18 sparkles fora das fotos | guirlanda em 2–3 estados; sem sparkles |
| Empate                 | onda única pelas nove molduras, até 260 ms                                | contraste final estático               |
| Resultado final        | hero, luz de moldura e até 22 sparkles externos em até 1,1 s              | hero e texto finais sem partículas     |

Piscas são grupos lentos e dessincronizados: no máximo dois mudam no mesmo
instante, e cada um usa soquete, núcleo e halo preparado. Não há
estroboscópio, loop de neve, blur por lâmpada, `ADD` espalhado pela cena, nem
Glow/Bloom como fundamento do design. Todo efeito é dono de `SceneScope`, tem
fim determinável e termina/normaliza com pausa, resize, retorno ao menu ou
saída.

Uma RNG visual independente, inicializada a partir de `runSeed` e um salt fixo
do runtime, escolhe somente inclinações pequenas, variante de pisca e posição
de sparkle. Ela jamais consome `context.random`, que já influencia starter,
seleção de foto e IA.

Partículas não podem reintroduzir aleatoriedade escondida: em NORMAL, o
`VfxDirector` deriva previamente de `visualRandom` cada posição, frame,
velocidade, escala e duração visível e entrega valores concretos ao emitter.
Não usar intervalos `min/max`, arrays aleatórios ou `randomFrame` para um
efeito que apareça na captura. Assim, determinismo de domínio e de fotografia
não depende do RNG interno do Phaser.

#### Ordem de implementação e gates revisados

| Subfase | Entrega                                                                          | Gate de aceitação antes da próxima                                             |
| ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| R3-C.2a | tokens visuais, layout protegido, voltar/pause e estados normal/pressed/disabled | 390 px sem sobreposição; voltar não deixa input/tween ativo                    |
| R3-C.2b | porta-retrato A e cartões de modo/dificuldade                                    | primeira ação identificável em até cinco segundos; foto não perde protagonismo |
| R3-C.2c | kit original de oficina: fundo, moldura e luzes; composição mobile-first         | arte sem texto/foto/pessoa; proveniência e preparação antes de runtime         |
| R3-C.3  | encaixes físicos persistentes e PhotoCard final                                  | board vazio parece mural, sem confundir casa livre com Memory                  |
| R3-C.4  | PlacementCard dock → célula + normalização em pause/resize                       | commit visual não duplica foto; estado final é correto se interrompido         |
| R3-D.1  | picker 3 × 2 com thumbs reais e paginação                                        | máximo seis thumbs; retry preserva ordem; B.card falha e mantém picker         |
| R3-D.2  | docks e HUD físico                                                               | dock ativo é compreendido sem texto longo; board não se move ao trocar turno   |
| R3-E    | arte aprovada A1, poucos piscas e props                                          | manifesto/proveniência/auditoria; cada prop passa na zona protegida            |

**Andamento de R3-C.3 (30-08-2026):** o runtime já ganhou base de madeira,
trilho dourado, luzes laterais discretas, base persistente do mural e quatro
camadas por casa (sombra, moldura, bisel e papel). As casas livres usam papel
quente com quatro pontos de fixação dourados, ocultos assim que uma peça entra;
assim não se parecem com cartas viradas. Dois docks persistentes ocupam a faixa
inferior durante a partida, apresentando identidade, rótulo e vez de cada lado
sem mover o mural. O toque reduz a casa, uma lembrança entra com settle e a
trinca recebe um pulso finito. A entrada do porta-retrato definitivo continua
depois da aprovação e preparação da moldura fonte; essa troca não altera regras
nem superfícies de input.

**Andamento de R3-C.4 (31-08-2026):** depois de o domínio aceitar a jogada,
a peça final é criada no mural, mas permanece invisível. Um `PlacementCard`
efêmero, derivado da mesma textura opaca de A/B (ou do selo Noel), sai do dock
ativo em um arco curto e só então é destruído para revelar essa peça
persistente. Pausa ou resize encerram o voo na célula já aceita, sem segunda
jogada, sem recarregar mídia e sem escalar uma `Image` que já recebeu
`setDisplaySize()`. Typecheck, lint e a partida local confirmaram o
assentamento e console limpo. A validação visual local pausou uma peça no meio
do voo e, ao retomar, encontrou uma única foto A já encaixada e uma única
jogada Noel subsequente; não houve card transitório residual. O resize usa o
mesmo settle determinístico; sua passagem na matriz de telefones pertence ao
gate de liberação R3-G, não à conclusão da implementação.

**Andamento de R3-D.1 (31-08-2026):** o picker mantém a ordem estável do
domínio, apresenta somente a página atual em uma grade 3 × 2 e reaproveita seis
chaves opacas de textura. Ao trocar de página, os cards são destruídos e as seis
thumbs anteriores são removidas antes do Loader receber os próximos derivados;
o catálogo não se transforma em preload. A validação local abriu a segunda
página e confirmou os dois candidatos restantes, com Anterior/Mais em faixa
própria, sem sobrepor a segunda fileira de fotos. A entrada de rodada também
ignora por 140 ms o gesto que confirmou o picker: a captura seguinte mostrou as
nove casas vazias, sem uma peça de seleção atravessada para o mural.

**Andamento de R3-D.2a (31-08-2026):** os docks deixaram de ser somente texto.
No duelo, cada lado recebe uma mini lembrança proporcional com a respectiva
textura `card` já carregada; no modo Noel, o segundo dock conserva seu emblema
de oficina. O dock inativo reduz contraste, o ativo mantém aro dourado e a
mini lembrança também define a origem visual do cartão transitório. Não há novo
Loader, recorte forçado nem foto periférica clicável. A partida local confirmou
os dois cards, a troca de vez e console sem erro/aviso.

**Andamento de R3-D.2b (02-09-2026):** o placar deixou de reconstruir uma
frase longa no mesmo canal da narrativa. A Scene agora mantém uma placa curta
com rodada, emblema A, placar A, separador, placar B, emblema B e empate
opcional como objetos próprios. O texto de menu continua no lugar da placa e
a faixa de mensagem permanece exclusiva para a vez, encaixe e resultado. No
modo Noel, o segundo dock e a peça usam um selo cranberry com `N` dourado —
uma identidade de oficina segura enquanto o cameo/ilustração aprovado continua
fora do pacote. A revisão local com fotos reais confirmou a placa, os dois
docks e a resposta de Noel sem colisão com o mural.

**Andamento de R3-F.1 (31-08-2026):** um toque válido recebe haptic leve e a
lembrança assentada recebe haptic médio, o cue aprovado de encaixe e quatro
brilhos que nascem somente nas quatro bordas externas da sua moldura. Uma
trinca adiciona a guirlanda no gutter, haptic forte, o cue de vitória e no
máximo 15 estrelas/pontos de duração finita, sempre fora dos pixels
fotográficos. Empate ganha onda dourada e haptic médio, sem buzzer. Cada brilho
se destrói ao terminar; LOW e movimento reduzido preservam contraste, turno e
resultado, sem tween decorativo; LOW ainda pode tocar a música calma depois do
primeiro gesto quando Som estiver ativo. A partida local de trinca confirmou a foto
legível, guirlanda no gutter e console sem erro/aviso.

**Andamento de R3-F.2 (31-08-2026):** o resultado final agora oculta o board
sem destruí-lo e apresenta um hero físico: moldura cranberry/pinho, foto
proporcional da lembrança vencedora (ou selo Noel/empate), ribbon de resultado,
entrada finita e ação explícita de retorno ao início. A guirlanda de vitória é
um cordão de cinco lâmpadas nos gutters horizontal ou vertical, fora da área da
foto; ela permanece estática em LOW e com movimento reduzido. Linhas diagonais
mantêm o destaque de molduras e estrelas, sem um fio atravessar rostos.

**Andamento de R3-F.2b (02-09-2026):** a revisão privada do duelo local em
390 × 844 confirmou o hero em uma única leitura: placa de placar, foto
proporcional, medalha abaixo da área fotográfica, resultado curto e retorno ao
início. A faixa de status é ocultada nesse estado, portanto não repete a
narrativa do hero. A medalha `N` e a cópia de Noel só aparecem no modo Noel;
no duelo, qualquer foto vencedora recebe estrela e a cópia identifica a
primeira ou a segunda lembrança. Docks com foto escondem seu emblema de fallback
para que nenhuma letra ou estrela cubra o thumbnail; o selo continua visível
somente quando Noel não possui foto. A revisão não registrou erro ou aviso no
console.
| R3-F | VFX finito, SFX/haptic e guirlanda/hero | mudo, pausa, LOW, reduzido, resize e teardown não deixam recurso ativo |

NineSlice só poderá ser usado para painéis de asset aprovado após confirmar o
renderer de produção e o fallback simples; ele não vira dependência estrutural
do HUD. Sparkles usam emitter reutilizado, iniciado sem fluxo e disparado por
burst finito; isso só entra depois de existir textura aprovada e orçamento
medido. O pacote atual de SFX e música já tem origem, licença, bytes, formatos
alternativos, cue e estado `PRONTO_PARA_RUNTIME` no manifesto; o unlock de
áudio continua estritamente posterior ao primeiro gesto.

#### R3-C.2c — Kit de arte original, antes de ampliar a matriz de testes

**Decisão de produto em 30-08-2026:** a prioridade imediata é elevar a
interatividade percebida em telefone, e não ampliar a matriz de tablet. As
referências recebidas orientam materiais (madeira de oficina, verde-pinho,
cranberry, dourado fosco e fonte âmbar), mas não entram como arte, fotografia
ou composição copiada. A cena continua com uma área L2 limpa para foto, ação e
tabuleiro.

| Fonte original       | Papel                                            | Regra de integração                                                                          |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Backdrop de oficina  | L0/L1; madeira, halo quente e cantos silenciosos | nenhum texto, pessoa, foto, logo ou controle; LOW pode voltar ao fundo plano                 |
| Moldura de lembrança | L2; materialidade de A/B e encaixes              | abertura central ampla; foto é aplicada proporcional pelo runtime, sem filtro                |
| Cordão de luzes      | L1; guia de atenção e celebração                 | preparado estático; os grupos acendem por estado, terminam em pausa/saída e não cruzam fotos |

As fontes foram geradas e arquivadas primeiro em `assets-src/tic-tac-toe/`.
Após solicitação de integração, preparo, proveniência, manifesto e auditoria,
as variantes WebP e os cues autorizados foram publicados para a R3-C.3. Zones
e botões continuam sendo as únicas superfícies de input.

#### Evidência de correção visual — telefone-base (30-08-2026)

| Viewport  | Estado                          | Achado                                                                                          | Severidade | Correção e prova                                                                                                                                                                                                             |
| --------- | ------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 390 × 844 | menu de modo                    | `setScale()` após `setDisplaySize()` ampliava A.card e deixava a moldura como retângulo central | P1         | imagem passa a animar apenas alfa; moldura/texto animam escala. Nova captura mostra A proporcional e console sem erro/aviso.                                                                                                 |
| 390 × 844 | mural, antes da primeira jogada | guirlanda decorativa cruzava a primeira linha de fotos                                          | P2         | cordão só aparece na linha vencedora; nova captura mostra as nove casas livres, sem ornamento sobre a área de toque.                                                                                                         |
| 390 × 844 | partida, cabeçalho e turno      | título longo concorreu com Som/Pausar; a vez não tinha suporte físico abaixo do mural           | P2         | a partida usa a marca compacta `TRINCA`; Som/Mudo e Pausar mantêm alvos independentes. Docks A/Noel mostram rótulo, badge e vez ativa; a captura não registrou erro ou aviso no console.                                     |
| 390 × 844 | picker de duas pessoas          | seis escolhas ainda eram botões sem lembrança visível e repetiam a orientação                   | P2         | primeira página passou a carregar no máximo seis `thumbs` derivados, em grade 3 × 2 com moldura e feedback tátil. A orientação permanece apenas na faixa de mensagem; captura com derivados locais e console sem erro/aviso. |

O manifesto `tic-tac-toe` passou em validação local após a publicação do
fundo, moldura, cordão e quatro grupos de áudio. Essa revisão não substitui a
matriz R3-G; ela removeu as duas regressões observadas antes de ampliá-la.

### R3-C.2.1 — Contratos de interação, foto e acabamento

Esta subfase transforma intenções visuais em contratos que não podem ser
interpretados como um board de retângulos. Ela é pré-requisito de R3-C.3 e não
autoriza criar arte final sem manifesto.

#### Layout que responde ao parent

As posições da matriz 390 × 844 são somente fixture visual. TicTacToeLayout
recebe largura, altura, safe insets e estado de apresentação e devolve
retângulos para marca, score, mensagem, contexto, hero, board, nove células,
docks, voltar e pausa. Nenhum View escolhe coordenada própria.

As provas de layout passam a verificar, em vez de apenas valores y:

- área da célula é no mínimo 52 CSS px;
- marca, score e mensagem não se cruzam;
- mensagem + gap termina antes do board;
- docks não invadem o board;
- controles mantêm respiro de toque;
- props e galeria não entram nas zonas protegidas de foto/board.

Com RESIZE, o runtime usa o gameSize atual para compor e o displaySize para
registrar a evidência de CSS/fill-rate. Em telas maiores, espaço adicional vai
para cenário e respiro, nunca para células desproporcionalmente grandes.

#### Toque, slop e hierarquia de input

O slop tem intenção de 10 CSS px, mas Pointer.x/y são screen space depois da
transformação do InputManager. A única função de runtime converte a intenção
para screen units quando gameSize e displaySize divergirem; a implementação
nunca mistura worldX/worldY, posição local da célula e screen space.

Somente Cell.Zone e controles de UI são interativos. PhotoCard, moldura,
garland, brilho, partículas, galeria e cameo de Noel não recebem input.
topOnly permanece ativo. O teste de slop cobre a mesma distância CSS antes e
depois de resize; pointerdown continua sendo somente pressão e pointerup
continua sendo o único commit possível.

#### PhotoCard, texturas e loader

PhotoCard é uma composição local e reutilizável nesta ordem:

1. ContactShadow;
2. FrameOuter;
3. BevelDark;
4. MatteIvory;
5. PhotoSurface;
6. InnerEdge;
7. IdentityBadge;
8. ActiveRim opcional.

A fotografia permanece frontal em todos os estados. Não existe verso, flip,
reveal, tint, blur, Glow, Bloom, ColorMatrix ou câmera aplicada a seus pixels.
O root do cartão, não a fotografia, recebe elevação, arco e settle.

Texture keys usam apenas slots opacos da run — por exemplo a, b e
picker:página:posição — e nunca ID, filename, URL ou provider de foto. O Map
privado slot → Photo autorizado é a única associação.

A carga dinâmica é uma máquina de estados: picker → seleção B → loading B →
preparando board → board pronto, ou falha → mesmo picker. maxRetries é definido
antes de cada File ser enfileirado. Durante playing, requests de rede e criação
de textura são ambos zero.

Ao trocar página, no máximo seis thumbs antigas e seis novas coexistem; depois
de a nova página estar pronta, GameObjects antigos são destruídos antes de suas
texturas serem removidas. No teardown, cancelam-se callbacks/loader/tweens,
destroem-se todos os objetos que usam foto e só então TextureManager.remove é
chamado; Maps são limpos por último. Uma foto B selecionada não é desalojada
pela paginação.

#### Placar e narrativa são componentes diferentes

MatchScoreView é composto por textos independentes para rodada, score A, score
B, empate opcional e jogador ativo. Ele não recompõe uma string longa para
animar um número. A faixa de mensagem R3-C.1 continua sendo a única narrativa:
sua vez, Noel pensando, encaixe, trinca ou empate. A identidade de cada jogador
tem três canais simultâneos: badge (estrela/sino), rótulo e rim/luz; cranberry
e verde-pinho nunca são a única distinção.

#### Partitura de atenção, finale e telemetria de percepção

Na vitória: settle final T+000, respiro T+90, molduras elevam T+160,
guirlanda inicia T+220, resolve até T+650 e resultado de rodada estabiliza
após T+720. No fim da partida, hero surge antes de qualquer CTA. Não há shake,
pan ou zoom de câmera.

A barreira final é obrigatória:

domain match-complete → lock input → settle → linha vencedora → hero →
resultado estável → run.complete uma vez.

Em movimento reduzido, os mesmos estados acontecem sem partículas e com
duração menor; complete continua depois do resultado estável. Para jogada não
terminal, interactionSettled ocorre somente após cartão e dock de turno
estáveis. Para jogada terminal, ocorre após o estado estável de rodada ou
partida aplicável, nunca no pointerup, início de tween ou fim de áudio.

#### Budgets que o profiler deve confirmar

NORMAL em telefone: duas texturas card de jogadores, seis thumbs visíveis e
doze somente durante paginação, zero requests/novas texturas durante playing,
um ou dois emitters reutilizados, no máximo 24 partículas vivas, até 18
lâmpadas decorativas, até duas transições de lâmpada simultâneas, zero fluxo
contínuo de partículas, zero corpos de física e zero PostFX de câmera/foto.
Tablets podem ter até 24 lâmpadas somente após medição. LOW e movimento reduzido
mantêm confirmação, guirlanda estática e leitura, removendo adereços, halos
decorativos e todas as partículas.

O `AudioDirector` mantém somente referências aos seus próprios sons. Ele
respeita tanto a pausa manual quanto o ciclo de visibilidade do jogo, sem
chamar operações globais que silenciem outras experiências montadas pelo host.
Retomar uma aba não toca som novo: restaura apenas o loop próprio que já estava
ativo e cuja configuração de som permita retomada.

R3-G mede backing canvas, tamanho CSS, devicePixelRatio/resolução e frame time
em idle, placement, guirlanda e finale. Qualquer ajuste de resolução pertence
ao host compartilhado, nunca a um hack exclusivo de Tic-Tac-Toe.

#### Aceites adicionais

- TTT-014: RNG visual e partículas são reproduzíveis pela seed visual e não
  consomem `context.random`.
- TTT-015: slop preserva 10 CSS px após resize.
- TTT-016: chaves de textura de fotos são opacas e não levam identificadores.
- TTT-017: paginação e teardown removem objetos antes de texturas dinâmicas.
- TTT-018: nenhuma jogada em playing dispara loader ou cria textura.
- TTT-019: PhotoCard é sempre frontal e nunca recebe PostFX.
- TTT-020: complete só ocorre depois da barreira final estável.
- TTT-021: turno permanece reconhecível sem cor, áudio ou haptic.
- TTT-022: peak de partículas/luzes atende o budget medido.

## 1. Decisão de produto

O produto não é “jogo da velha com tema natalino”. É um mural na oficina do
Papai Noel em que a foto já escolhida pela família vira a peça principal.

| Fotos autorizadas na sessão | Opções oferecidas            | Peças               |
| --------------------------- | ---------------------------- | ------------------- |
| Uma                         | Jogar com o Papai Noel       | foto A × Papai Noel |
| Duas ou mais                | Papai Noel ou Duelo de Fotos | foto A × foto B     |

A foto A é context.selectedPhoto, escolhida antes pelo Hub. Com apenas uma
foto, o jogo continua disponível contra Santa. No duelo, foto B é escolhida no
canvas e sempre precisa ter ID distinto de A.

### Fluxo e primeira leitura

Hub escolhe foto A → Capa React → Phaser → Como quer jogar?

- Jogar com Papai Noel → Gentil, Esperto ou Mestre → partida.
- Duas pessoas → escolher foto B → partida.

Nos primeiros cinco segundos, mostrar foto A, a instrução “Faça 3 fotos em
linha!” e somente uma próxima decisão. Não haverá tutorial temporizado, termos
como CPU ou Minimax, placar técnico, derrota em vermelho, nem modal web sobre
o canvas.

### V1 fechada

- Partida melhor de três: vitória de rodada concede ponto; empate consome a
  rodada sem conceder ponto; depois da terceira compara-se o placar.
- Contra Santa, a criança começa as rodadas 1 e 3; Santa começa a rodada 2.
  Assim a primeira ação sempre mostra a própria foto entrando no mural.
- No duelo local, o primeiro jogador é escolhido uma vez pelo Random injetado
  e o iniciador alterna a cada rodada. O starter integra o estado e nunca é
  recalculado após pause, resize ou visibilidade.
- Santa tem três personalidades: Gentil, Esperto (padrão) e Mestre.
- Duas pessoas jogam no mesmo aparelho. Não há conta, servidor, WebSocket,
  Rune, Colyseus ou estado remoto na V1.
- A mesma textura de foto pode ocupar várias casas. Fotos não recebem filtro,
  não entram em IA e não são recarregadas por célula.

### Fora de escopo

- multiplayer entre aparelhos, ranking, login, chat, replay compartilhável e
  servidor autoritativo;
- foto original, caminho de arquivo, filename, dados de cliente, provider ou
  URL em telemetria, documento, arte ou texto visível;
- filtros sobre fotografia, pixel-perfect hit testing, drag, física, câmera,
  partículas contínuas, pós-processamento obrigatório e BaseScene;
- extração de cena, HUD ou fundo compartilhado antes de dois jogos provarem a
  necessidade.

Para uma modalidade online futura, fica preservada apenas a lição: o cliente
envia intenção e uma autoridade valida turno, célula e estado.

## 2. Contrato, disponibilidade e registro

Não é necessária mudança em platform. GameDefinition já suporta mínimo de
fotos, subconjunto e orientações mistas; GameContext já fornece a foto A,
catálogo autorizado, Random, GameRun, haptics, qualidade e preferências.

Criar src/definition.ts com estes valores:

| Campo                         | Valor                                                |
| ----------------------------- | ---------------------------------------------------- |
| id                            | tic-tac-toe                                          |
| displayName                   | Trinca de Natal                                      |
| shortDescription              | Use suas fotos para fazer três lembranças em linha.  |
| shortRule                     | Faça 3 fotos em linha e vença a rodada.              |
| cover.alt                     | Fotos em um mural natalino para fazer três em linha. |
| minPhotos / recommendedPhotos | 1 / 2                                                |
| photoSelection                | subset                                               |
| supportsMixedOrientation      | true                                                 |

Quando a fase for autorizada, o registro explícito altera somente:

1. dependência workspace em apps/play/package.json;
2. alias em apps/play/vite.config.ts, se a configuração vigente ainda exigir;
3. import da definição e loader lazy em apps/play/src/phaser/gameRegistry.ts;
4. teste de registro, rota direta e disponibilidade com uma foto.

O app não cria canvas na capa e não pré-carrega a galeria inteira. PhaserHost
continua criando uma identidade GameRun e SeededRandom por partida.

## 3. Domínio puro e determinístico

Criar em packages/games/tic-tac-toe/src/domain:

| Módulo                     | Responsabilidade                               |
| -------------------------- | ---------------------------------------------- |
| TicTacToeTypes.ts          | tipos opacos e constantes                      |
| TicTacToeRules.ts          | tabuleiro, jogadas legais e resultado terminal |
| TicTacToeMatch.ts          | melhor de três, turno, rodada e placar         |
| TicTacToeAi.ts             | Gentil, Esperto e Mestre                       |
| TicTacToePhotoSelection.ts | foto B e galeria paginada estáveis             |
| TicTacToeSetup.ts          | construção validada por modo e dificuldade     |

Esses módulos não importam Phaser, React, DOM, URLs, Date.now ou Math.random.
Recebem Random só para uma escolha variável e não modificam seus argumentos.

### Representação e regras

O estado canônico é um tuple legível de nove células; CellOwner é player-a,
player-b ou null. CellIndex vai de 0 a 8. Congelar as oito linhas vencedoras:
três horizontais, três verticais e duas diagonais.

TicTacToeRules expõe legalMoves, isLegalMove, applyMove, findWinner,
findWinningLine, isDraw e isTerminal. Bitmasks podem otimizar a IA após os
testes, mas nunca substituem o estado canônico.

A intenção de jogar uma casa retorna estado e resultado. Os únicos recusados
são occupied, wrong-turn, not-playing e round-finished. Dois pointerdown
rápidos na mesma casa aceitam só o primeiro: não duplicam foto, VFX, placar ou
analytics.

### Partida melhor de três

TicTacToeMatch contém modo, board, turno, starter, índice de rodada 0–2,
score de A/B/empates, vencedor da rodada, linha vencedora e fase playing,
round-complete ou match-complete.

1. Aceitar intenção somente em playing, no turno correto e em célula vazia.
2. Vitória ou empate termina uma rodada e atualiza o placar uma única vez.
3. startNextRound limpa só o tabuleiro, preserva setup/placar e alterna starter.
4. Ao chegar à terceira rodada ou duas vitórias, a fase vira match-complete.
   O runtime chama context.run.complete uma vez, após a apresentação final.

Empate é “Empate de Natal!”, nunca derrota de um jogador.

### Seleção de fotos

O domínio não recebe um objeto `Photo` completo. Ele trabalha com o descritor
mínimo `{ id, orientation, aspectRatio }`; URLs, filename, provider, token,
pixels e originais ficam fora do grafo de domínio. O runtime resolve o ID de
volta para uma foto já autorizada somente quando monta seu preload.

TicTacToePhotoSelection recebe descritores autorizados, foto A e Random. Ela:

- exclui A e IDs repetidos;
- prioriza orientação diferente da A quando ainda houver candidatos;
- produz ordem estável para a mesma seed;
- entrega no máximo seis candidatos por página;
- retorna só ID e metadado já autorizados: nunca inicia carregamento.

As peças A/B e o hero usam a variante `card`; picker e galeria usam `thumb`.
Não promover automaticamente para `game` uma peça de aproximadamente 100 CSS
px: essa promoção só pode acontecer após medição visual em tablet. Cada
texture key é scoped pela run e usa somente slots opacos (por exemplo
`ttt:<runOpaque>:photo:a:card` ou `ttt:<runOpaque>:picker:p0:s0`), jamais o
ID da foto. A associação slot → foto autorizada fica em Map privado de runtime;
a key é liberada no teardown e nunca vai para analytics ou texto de erro.

Uma sessão de 172 fotos mantém o catálogo disponível, porém Santa usa foto A,
Santa e no máximo 6–8 thumbs decorativas; duelo usa foto A, foto B e o mesmo
pool limitado. O tabuleiro cria vários `Image` a partir da mesma textura de A
ou B. A galeria é cenário, não recebe input, não anima fotos continuamente e
jamais dispara request durante uma jogada.

## 4. IA do Papai Noel

TicTacToeAi devolve somente um CellIndex. Não conhece Scene, tween, texto, som,
tempo real ou haptic.

| Nível visível | Objetivo                  | Política                                                                                                               |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Noel Gentil   | dar chance real à criança | vence sempre quando puder; bloqueia em 65% dos casos; no restante prioriza centro, canto e lateral com Random injetado |
| Noel Esperto  | padrão convincente        | vence, bloqueia, cria fork, bloqueia fork, centro, canto oposto, canto, lateral                                        |
| Noel Mestre   | nunca perde               | Minimax completo, score por profundidade e alpha-beta; sem cache na V1                                                 |

Antes de escolher, todos os níveis filtram casas legais. Gentil pode deixar
passar uma defesa por personalidade, mas **nunca** sua própria vitória
imediata; ele nunca cria uma jogada impossível. Esperto nunca deixa passar
vitória ou bloqueio imediato; sua variação seeded ocorre só entre alternativas
seguras e de prioridade equivalente.

findForkMoves simula cada casa e acha jogadas que deixam duas ameaças de vitória
distintas. Os fixtures devem cobrir fork duplo, não apenas a primeira linha
encontrada.

### Master: requisitos de correção

| Regra           | Valor                                              |
| --------------- | -------------------------------------------------- |
| vitória IA      | +100 − profundidade                                |
| derrota IA      | −100 + profundidade                                |
| empate          | 0                                                  |
| ordem de busca  | centro → cantos → laterais                         |
| desempate ótimo | reunir todos os melhores e escolher com random.int |

A pontuação é sempre da perspectiva fixa da IA. A V1 não usa tabela de
transposição: para nove casas, Minimax com alpha-beta é pequeno o bastante e
elimina uma classe inteira de erro de cache. Cache só poderá ser acrescentada
depois de medição e deverá usar a chave posição+turno com entradas `exact`,
`lower` e `upper`; um nó podado jamais pode ser gravado como score exato.

## 5. Runtime Phaser e ownership

Começar com fronteiras pequenas:

- src/definition.ts, src/index.ts e src/tuning.ts;
- domain/TicTacToeAnalysis.ts para análise reutilizada de ameaças e forks,
  além de Rules, Match, Ai, PhotoSelection e Setup;
- runtime/TicTacToeLayout.ts, TicTacToeInputArbiter.ts e
  TicTacToePhotoLoadPlan.ts;
- runtime/phaser/createTicTacToeGame.ts, TicTacToeAudioDirector.ts,
  TicTacToeSoundPolicy.ts, visualAssets.ts e audioAssets.ts;
- tests separados por domínio, IA, seleção, layout e arbiter.

Extrair BoardView, PlayerDockView, SantaView, PhotoPickerView ou
WinningGarland somente se a Scene se tornar difícil de testar, medir ou
destruir. Não criar application, controlador global, cena-base ou biblioteca
genérica de widgets.

| Camada     | Decide                                                           |
| ---------- | ---------------------------------------------------------------- |
| domínio    | aceitação, turno, vencedor, empate, placar e próxima rodada      |
| arbiter    | bloqueio por pausa, picker, placement, thinking e resultado      |
| Scene      | preload, toque → playCell, animação e agendamento da IA          |
| SceneScope | listener, timer, tween, emitter, som e textura do jogo           |
| React      | eventos tipados existentes da bridge, nunca Scene ou Phaser.Game |

Cada apresentação recebe token com runId, roundIndex, moveNumber e epoch. Um
callback só age se seu token ainda for atual; saída, nova rodada e fim de jogo
invalidam callbacks antigos. A jogada de domínio é confirmada antes de a foto
viajar; ao fim da apresentação, chamar context.run.interactionSettled.

### Contrato de input e apresentação

Cada célula é uma `Zone` não renderizada, retangular e interativa; foto,
guirlanda, brilho e galeria não são interativos. Manter `input.topOnly = true`:
`pointerdown` registra `pointerId`, célula, posição e epoch e mostra a pressão;
`pointermove` cancela quando a distância em Pointer.x/y (screen space) exceder
o equivalente a 10 CSS px. Quando gameSize e displaySize diferirem, uma única
função converte esse limiar; worldX/worldY e coordenadas locais nunca entram no
cálculo. `pointerup` só envia a intenção se o mesmo pointer ainda estiver sobre
a mesma Zone, no mesmo epoch e em estado jogável. Não existe fila de taps.
Enquanto uma peça, resultado ou foto B é apresentada, qualquer toque de board
é descartado; toque em casa ocupada recebe somente realce neutro.

O domínio é commitado antes da animação. O runtime mostra uma única cópia da
foto viajando do dock até a célula, fixa a cópia ao término e então libera a
interação. Nenhum tween, timer, som ou VFX atualiza turno, placar ou vitória.

### Tempo de pensamento, pausa e resize

A IA calcula logo e guarda uma única `plannedAiMove` válida para a rodada. O
delay é só de apresentação, sorteado pelo Random injetado:

| Gentil     | Esperto    | Mestre     |
| ---------- | ---------- | ---------- |
| 380–560 ms | 420–620 ms | 460–680 ms |

Durante a espera, as nove casas ficam bloqueadas e Santa mostra três luzes ou
micro-movimento, nunca spinner web. Pausa manual, HIDDEN/BLUR e visibilidade
bloqueiam input, congelam apresentação e pausam apenas áudio TTT. Ao retomar,
a jogada planejada e o tempo restante são preservados; não há recálculo de IA.

Se pausar em um trecho delicado não for robusto no vertical slice, normalizar
a peça ao estado que o domínio já decidiu antes de mostrar a pausa. Isso é
preferível a uma célula ambígua.

Resize usa Scale.RESIZE e reposiciona objetos existentes; não recria board,
match, IA, foto ou canvas. O host permanece limitado porque RESIZE usa canvas
1:1 e pode atingir fill-rate alto. Antes de implementar Scene, validar cada
chamada no source/tag Phaser 4.2.1, na skill vendorizada, nos tipos instalados
e em exemplo oficial compatível, nesta ordem.

## 6. Layout, foto e feedback

### Hierarquia mobile

1. foto/dock do jogador atual e indicação de turno;
2. tabuleiro 3 × 3 e instrução contextual;
3. placar de rodadas e controles Som/Pausar;
4. oficina, galeria periférica e Santa como atmosfera.

Cada casa é um hit area retangular explícito, com alvo infantil de no mínimo
52 CSS px. Não há drag ou hit testing pixel-perfect. No retrato, o tabuleiro
tem tamanho máximo e respiro para os docks; no tablet, sobra vira cenário, não
células gigantes. A prova começa em 390 × 844 e depois passa por 412 × 915,
430 × 932 e 768 × 1024.

Foto A: moldura cranberry, estrela e detalhe dourado. Foto B: moldura
verde-pinho, sino e marfim. Identidade fica na moldura, nunca como tint da
foto. Contra Santa, a segunda peça é cameo/ornamento 2D em poses idle,
pensando, jogando e celebrando.

| Evento         | Confirmação                                      | LOW e movimento reduzido                 |
| -------------- | ------------------------------------------------ | ---------------------------------------- |
| célula livre   | pressão curta, cartão sai do dock e encaixa      | fade + escala curta, sem trilha          |
| célula ocupada | realce neutro, sem haptic de erro                | mesmo realce estático                    |
| troca de turno | dock ativo e duas notas discretas                | contraste estático                       |
| Santa pensando | micro-animação do cameo                          | três estados estáticos                   |
| vitória        | guirlanda liga os três centros; fotos sobem 4 px | guirlanda em 2–3 estados, sem partículas |
| empate         | onda breve nas nove molduras                     | realce estático                          |

WinningGarland recebe a linha do domínio; ela nunca descobre vitória. Dura
350–550 ms e, em NORMAL, usa no máximo 12–18 sparkles finitos fora de rostos.
Emitters são reutilizados e bursts são finitos. LOW remove neve, trilha e
reflexos, mas mantém toque, encaixe, turno, guirlanda e resultado.

A guirlanda fica na camada do tabuleiro, abaixo dos cartões e acima da madeira:
o fio e as luzes aparecem apenas nos gutters, passe-partout e bordas das três
células. Nem linha horizontal nem diagonal desenha corda ou luz sobre pixels da
foto. O reveal propaga pelos três frames vencedores; a geometria é calculada
pela linha vencedora e pelo layout atual, inclusive após resize.

No resultado final, a foto vencedora volta a ser heroína depois da leitura da
linha e do placar: o dock vencedor cresce em um cartão hero sem carregar outra
variante. Em match empatado, os dois docks permanecem pareados; não há falsa
foto vencedora.

Mensagens: “Trinca de Natal!”, “Você venceu o Papai Noel!”, “O Papai Noel fez
uma trinca! Vamos tentar de novo?” e “Empate de Natal! Que partida apertada!”.
Não usar “Você perdeu”.

### Áudio e haptic

Cues iniciais: ttt.ui.mode, ttt.ui.photo-select, ttt.ui.button,
ttt.board.press, ttt.board.occupied, ttt.photo.place, ttt.turn.pass,
ttt.santa.think, ttt.santa.place, ttt.win.garland, ttt.win.round,
ttt.draw.round, ttt.round.reset e ttt.match.win.

O primeiro gesto tenta liberar áudio; visual não aguarda a promessa. Música
de 60–80 s usa celesta, pizzicato, piano macio e sino discreto, volume inicial
0,10–0,14, preservada em LOW quando `soundEnabled` estiver ativo e reduzida
2–4 dB em guirlanda/vitória. Uma medição física futura pode justificar omiti-la
em LOW; não fazê-lo por suposição.
TicTacToeSoundPolicy seleciona variações aprovadas por ocorrência, não
aleatoriedade global. TicTacToeAudioDirector possui som, mudo, pausa, retorno
e teardown; não usar pauseAll do app.

Haptic é complementar: light no toque, medium opcional no encaixe, heavy na
vitória e medium no empate. Célula ocupada não recebe haptic negativo nem cue
wrong compartilhada.

## 7. Assets, privacidade e orçamento

Antes da integração visual, criar EXPERIENCE_REQUIREMENTS.json, EXPERIENCE.md,
ART_DIRECTION.md, MOTION_SCORE.md, AUDIO_SCORE.md, assets/manifest.json e
ASSET_PROVENANCE.md no pacote do jogo. Os cinco primeiros definem papéis;
manifesto/proveniência recebem arquivo somente após fonte, licença, segurança
fotográfica, bytes e qualidade aprovados.

Papéis iniciais: cenário oficina/noite, board/célula/moldura, docks
estrela/sino/Santa, cameo Santa, guirlanda, luz/sparkle/neve, controles, SFX e
música. A foto autorizada permanece heroína e não entra em prompt, geração,
inpainting, normal map ou decoração.

Todo arquivo browser-deliverable fica sob
apps/play/public/assets/tic-tac-toe, tem estado PRONTO_PARA_RUNTIME no
manifesto e passa em pnpm asset:validate. Não buscar, baixar, gerar ou preparar
asset no browser; nenhuma rede entre playing e resultado de rodada.

O plano de carga separa itens críticos de decoração. Foto A.card, cenário,
board e áudio/controles mínimos são carregados antes de oferecer partida; uma
falha crítica respeita o retry limitado do Loader e termina em erro seguro pela
bridge, sem tabuleiro parcial. Após escolher B, B.card é carregada ainda no
setup: se falhar, manter o picker, explicar sem URL e permitir outra foto. Uma
thumb de galeria que falhar apenas desaparece. Jamais requisitar `card` durante
o turno, nem permitir que uma falha decorativa bloqueie a primeira ação.

## Appendix A — Arquivo R2 (não executar)

T0–T6 permanecem apenas para rastreabilidade do caminho que levou ao Board
Lab. Eles não são uma sequência executável e não podem criar tarefas novas. A
única sequência ativa é a R3 registrada no acompanhamento e detalhada em
R3-C.2/R3-C.2.1: R3-C.2a → R3-C.2b → R3-C.3 → R3-C.4 → R3-D.1 → R3-D.2 →
R3-E → R3-F → R3-G.

### T0 — decisão, documentação e gates

- Registrar autorização de fase, faixa etária, destino pós-vitória e aprovação
  da fantasia Mural da Oficina do Noel.
- Atualizar SPEC.md e criar os documentos de experiência/assets acima.
- Consultar a validação oficial e confirmar source/tag, skill, tipos e exemplo
  compatível antes de cada superfície Phaser; donor é somente referência de
  algoritmo.
- Atualizar índice e mapa sem apagar mudanças de trabalho alheias.

**Saída:** a regra pode ser explicada como “escolha sua foto e faça três fotos
em linha”, sem pendência que mude privacidade, vitória ou dificuldade.

### T1 — domínio e laboratório de IA

- Implementar tipos, regras, match, setup e seleção de foto B com testes
  primeiro.
- Implementar níveis de Santa e oráculo de teste independente para Master,
  inicialmente sem cache de transposição.
- Produzir partidas determinísticas legíveis para ajustar personalidade.

**Saída:** linhas/terminais cobertos; Master × Master empata; IA nunca escolhe
célula ilegal.

### T2 — Board Lab sem arte final

- Implementar layout, Zones de input, arbiter, turnos local/IA, pause/resume,
  resize e bridge com fixtures não identificáveis.
- Fazer modo, dificuldade e picker estados Phaser do mesmo mundo.

**Saída:** em 390 × 844, toque é imediato, peça aparece uma vez, turno é claro,
vitória é a do domínio e saída remove canvas.

### T3 — mídia aprovada e vertical slice A1 (histórico R2; substituído por R3-E)

- Aprovar somente cenário, frame/dock, Santa, guirlanda, controles e sons
  mínimos; manifestar e auditar.
- Integrar uma rodada Santa com vitória, empate, pensamento e foto retrato,
  paisagem e quadrada em contain.

**Saída:** prova foto → ação → board; não depende de HIGH para parecer claro.

### T4 — jogo completo e Duelo de Fotos (histórico R2; substituído por R3-C/D/F)

- Integrar melhor de três, starter fixo contra Santa/alternado no local, picker
  paginado e foto B; provar que catálogo grande não vira preload grande e que
  falha de B retorna ao picker em vez de iniciar rodada parcial.
- Integrar resultado final e ações existentes do shell, com nova identidade de
  run para replay.

**Saída:** Santa funciona com uma foto, duelo com duas e GAME_COMPLETED ocorre
somente no fim da partida.

### T5 — game feel, som e acessibilidade (histórico R2; substituído por R3-F)

- Ajustar encaixe, guirlanda, delay de Santa, unlock, mix, mudo e haptic em
  tuning/políticas locais.
- Codificar LOW e movimento reduzido dentro de cada efeito.

**Saída:** jogo permanece claro sem áudio, em LOW e em redução de movimento;
nada de TTT sobrevive ao shutdown.

### T6 — matriz e liberação (histórico R2; substituído por R3-G)

- Rodar testes, pnpm check:fast, pnpm check e pnpm validate.
- Revisar 390/412/430/768, NORMAL/LOW/reduzido, três orientações,
  Santa/duelo, pause, visibilidade e cinco enter/exit.
- Fazer passagem Android física, registrar P1/P2 e lições duráveis. Só então
  mover este plano para completed.

## 8. Provas de aceite

| Área    | Provas mínimas                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rules   | oito vitórias, empate, imutabilidade, ocupada, turno errado e terminal                                                                           |
| Match   | melhor de três, starter alternado, placar, empate finito e um encerramento                                                                       |
| IA      | seed reproduz escolha; win/block/fork; estados alcançáveis e simetrias; Master sem cache nunca perde quando há não-perda; Master × Master empata |
| Fotos   | 1, 2, 4, 12, 120 e 172 fotos; A/B distintas; paginação estável; card/thumb corretos; falha de A/B/thumb; sem catálogo inteiro                    |
| Runtime | layout mantém 52 px; Zone/topOnly; arbiter bloqueia pause/thinking/placement/result; plannedAiMove e resize preservam estado                     |
| E2E     | modo, Santa, picker, vitória, empate, pause/resume, retry/exit, áudio bloqueado e cinco mounts limpos                                            |
| Visual  | 390/412/430/768, NORMAL/LOW/reduzido, fotos claras/escuras e três orientações                                                                    |

Cenários de desenvolvimento podem montar ai-thinking, round-win, round-draw,
match-complete, photo-picker e pause; eles não pertencem à rota de produto nem
recebem dados de sessão.

### IDs de aceite

- TTT-001: as oito linhas, jogadas legais, terminalidade e imutabilidade são
  testadas no domínio.
- TTT-002: Easy, Smart e Master só usam Random injetado e retornam casa legal.
- TTT-003: Master é perfeito, prefere vitória rápida e adia derrota; a V1 usa
  alpha-beta sem cache de transposição.
- TTT-004: Smart vence, bloqueia e trata forks; local alterna ownership sem
  rede.
- TTT-005: uma foto libera Santa; duas liberam duelo; A/B não coincidem.
- TTT-006: domínio conhece somente descritor seguro; foto preserva proporção,
  não é filtrada, reutiliza textura `card` e o catálogo não é pré-carregado.
- TTT-007: célula usa Zone com alvo infantil e topOnly; tap duplicado não
  duplica peça; input bloqueia durante apresentação, IA e pausa, sem fila.
- TTT-008: winning line pertence ao domínio; guirlanda só apresenta; empate e
  derrota recebem resposta gentil.
- TTT-009: pause, visibilidade e resize preservam partida e plannedAiMove;
  saída libera textura, som, timer, emitter, tween e listener.
- TTT-010: LOW/reduzido preservam jogo; áudio bloqueado não atrasa ação;
  GAME_COMPLETED ocorre uma vez, ao fim da partida.
- TTT-011: guirlanda usa somente a linha do domínio e aparece nos gutters e
  molduras, jamais sobre pixels fotográficos.
- TTT-012: A.card crítico falha de forma segura; B.card retorna ao picker; thumb
  decorativa falha por omissão, sem URL/dado de sessão exposto.
- TTT-013: `pauseAll`, `resumeAll`, `stopAll` e mute global não são usados pelo
  jogo; o diretor retém e controla apenas seus próprios sounds.

## 9. Riscos e gates do proprietário

| Risco                      | Mitigação                                     | Gate                                             |
| -------------------------- | --------------------------------------------- | ------------------------------------------------ |
| jogo ainda não selecionado | plano não cria runtime/registro               | proprietário escolhe fase após Memory M7/roadmap |
| arte/áudio Santa           | definir papel e proveniência antes de arquivo | direção A1 e licença aprovadas                   |
| complexidade Minimax       | V1 sem cache + alpha-beta + oráculo           | teste de estados alcançáveis e simetrias         |
| pausa no meio da IA        | token + normalização segura                   | E2E pause/visibility                             |
| galeria competir com jogo  | só depois do vertical slice                   | revisão comprova foto, turno e board dominantes  |
| falha de foto B            | carga ainda no picker; escolher outra foto    | E2E de erro seguro sem tabuleiro parcial         |
| áudio de outro jogo        | diretor retém handles próprios, sem pauseAll  | teste de teardown/mudo/pausa por sound instance  |
| melhor de três longo       | duração é hipótese                            | observação agregada com famílias                 |
| escopo do app              | registro lazy e contratos existentes apenas   | sem game→game ou platform→game                   |

Online, compartilhamento pós-vitória e aquisição/geração de assets são
expansões de produto separadas, não inferidas por este plano.

## 10. Handoff

Cada fase autorizada registra decisão, arquivos, testes e viewports executados,
evidência mobile, assets/licenças, fallback LOW/reduzido e gates do
proprietário. Antes da entrega final, executar pnpm validate, regenerar o mapa
para cada arquivo novo e registrar em docs/lessons.md apenas descobertas
duráveis.
