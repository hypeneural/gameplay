# Puzzle Swap — estado atual e plano de evolução natalina

**Documento de produto e engenharia — 2026-08-24**

## Leitura rápida

O Puzzle Swap já é um jogo funcional, seguro para fotos e consistente em celular. Ele não é ainda a experiência visual de Natal rica que o legado transmitia. A diferença não está no mecanismo de quebra-cabeça: está na direção de arte, no preenchimento do palco, na sequência de entrada, nos ícones, no desenho de som e na recompensa final.

Minha recomendação é evoluir o visual sem desmontar a fundação atual. A base separa regras, efeitos, aplicativo e motor gráfico; isso permite trocar a apresentação do Puzzle sem arriscar a foto, a jogabilidade ou o futuro dos demais jogos.

## Diagnóstico da tela atual

Na captura de 390 × 844, o jogo está legível e proporcional: cabeçalho, comandos, grade e instrução aparecem sem corte. A foto ocupa uma grade correta, não é esticada, e o fundo escuro mantém contraste.

Ainda assim, a cena parece simples perante o legado por cinco motivos.

1. O cenário é geométrico: céu, lua, faixa e estrelas são formas e texto. O legado tinha um ambiente ilustrado reconhecível, com árvore, neve, casa e luzes.
2. A área vazia abaixo da grade é funcional para fotos verticais e para a instrução, mas ainda não conta uma história visual.
3. Os comandos usam glifos de texto (`♪`, `✦`, `Ⅱ`). Eles funcionam, porém não possuem o acabamento, iluminação e consistência de um conjunto de ícones próprio.
4. As transições atuais são discretas e corretas, mas não há uma sequência de "entrar na brincadeira": capa, luzes, moldura, foto e primeira jogada ainda não formam uma narrativa única.
5. Acerto e vitória já têm som, haptic e partículas finitas, mas falta uma recompensa visual de maior impacto — sempre curta e opcional para movimento reduzido.

Isso não é falha de arquitetura. É uma lacuna intencional de direção de arte que deve ser tratada como uma etapa própria, com ativos licenciados, critérios de desempenho e testes reais.

## Stack atual

| Camada                | Tecnologia / responsabilidade                                                     | Estado                                           |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Aplicativo            | React 19, TypeScript estrito e Vite 8                                             | Implementado                                     |
| Motor do jogo         | Phaser 4.2.1, carregado somente ao abrir o jogo                                   | Implementado                                     |
| Regras do Puzzle      | TypeScript puro, sem Phaser, DOM ou aleatoriedade global                          | Implementado e testado                           |
| Experiência           | Tokens de movimento, feedback, haptic e política de qualidade em `packages/theme` | Implementado                                     |
| Fotos                 | Derivados proporcionais e autorizados; o navegador não recebe originais           | Implementado no fluxo local / preparado para VPS |
| Áudio                 | M4A/MP3 autorizados, liberados só após gesto, com botão de mudo                   | Implementado                                     |
| Testes                | Vitest, Playwright móvel (390, 412, 430 e 768 px), lint, arquitetura e build      | Implementado                                     |
| PWA, offline e WebKit | Manifesto, instalação, cache e matriz WebKit                                      | Planejado, não entregue                          |

O Phaser é um chunk preguiçoso: a galeria e a capa não criam canvas, áudio ou objetos do jogo. Isso é importante para uma sessão com muitas fotos continuar leve.

## Fluxo de execução

```text
Foto escolhida
   ↓
AppRouter (React) → Hub / capa / rota segura
   ↓ jogar
PhaserHost → cria um runId, relógio ativo e uma única instância Phaser
   ↓
PuzzleScene → carrega um derivado da foto + áudios autorizados
   ↓
Domínio puro → embaralha e valida as trocas
   ↓
FeedbackDirector → animação curta + haptic + som + partículas finitas
   ↓
GAME_COMPLETED ou saída → SceneScope limpa recursos → Phaser é destruído
```

React nunca recebe uma `Scene` Phaser. Ele só recebe eventos tipados como `GAME_READY`, `GAME_STARTED`, `GAME_COMPLETED` e `GAME_ASSET_FAILED`. Essa fronteira evita vazamento de canvas, teclado, áudio e texturas quando a pessoa sai e abre outra foto.

## Lógica do quebra-cabeça

### Foto e grade

O jogo carrega **uma** textura derivada da foto escolhida. A foto é encaixada por proporção no espaço disponível; não é quadrada à força e não é cortada. Em seguida, a textura recebe frames retangulares: cada frame é uma peça visual da mesma imagem. Portanto, 12 peças não geram 12 downloads.

`PuzzleTopology` define a grade uma única vez no começo da partida: 3 × 4 para foto vertical e 4 × 3 para foto horizontal, ambas com 12 peças. `GridPlanner` recebe essa topologia já escolhida e calcula somente a geometria proporcional no viewport atual. Portanto, girar o aparelho pode mudar posição e tamanho das peças, mas não os ids, a solução, a quantidade ou a identidade dos objetos visuais.

### Estado e troca

`PuzzleBoard` guarda somente números. Cada célula contém o id da peça que está nela; a solução ocorre quando o id da peça é igual ao índice da célula. Dessa forma, a regra não depende de pixels ou de uma imagem específica.

- `PuzzleShuffle` faz Fisher–Yates com uma fonte de aleatoriedade injetada e garante que o tabuleiro não comece pronto.
- `Swap` converte dois toques em exatamente o mesmo comando usado pelo arraste.
- `createPuzzleSwapGame.ts` aplica esse comando, troca somente os dois objetos visuais envolvidos e os move por tween de 160 ms.
- A confirmação de acerto só aparece quando uma peça acabou de entrar na posição correta; não em toda troca.
- Após sete segundos sem movimento bem-sucedido, `IdleAssist` destaca uma peça, sem resolver a jogada pelo visitante.

### Entrada, pausa, áudio e fim

Ao abrir, a foto inteira é mostrada por um instante e dá lugar à grade. O relógio começa quando a grade fica interativa. Pausa congela o relógio ativo e a música; sair destrói o jogo antes de a rota mudar.

Após um gesto, Phaser gerencia o desbloqueio de áudio. Toques, dicas, acertos e vitória podem disparar sons curtos; a música é baixa, opcional e é destruída ao sair. Ao completar, a foto inteira retorna atrás de uma sobreposição de vitória.

### Qualidade, acessibilidade e falhas

- Toque–toque sempre existe como alternativa ao arraste.
- `prefers-reduced-motion` remove neve e transições longas, mantendo confirmação e leitura.
- Se o navegador declara economia explícita de dados, o perfil LOW remove decoração ambiental; não inferimos qualidade pela velocidade da rede.
- A foto essencial tem timeout de 10 s e uma repetição. Caso a última tentativa falhe, React apresenta uma tela segura de tentar de novo, sem expor URL, nome de cliente ou caminho de disco.

## Arquivos principais

| Arquivo                                                                 | Papel na lógica                                                                                                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/play/src/app/AppRouter.tsx`                                       | Organiza Hub → capa → jogo, seleção de foto, rotas e perfil de qualidade.                                                           |
| `apps/play/src/phaser/PhaserHost.tsx`                                   | Cria e destrói uma única instância do Phaser; liga eventos do jogo ao React.                                                        |
| `packages/platform/src/game-runtime/GameRunController.ts`               | Mantém estado, sequência de eventos e relógio do run, sem depender do Phaser.                                                       |
| `packages/platform/src/game-runtime/SceneScope.ts`                      | Registra e encerra listeners, tweens, músicas e texturas de uma Scene.                                                              |
| `packages/games/puzzle-swap/src/domain/PuzzleBoard.ts`                  | Estado imutável, troca válida e detecção de solução.                                                                                |
| `packages/games/puzzle-swap/src/domain/PuzzleShuffle.ts`                | Embaralhamento determinístico e nunca resolvido.                                                                                    |
| `packages/games/puzzle-swap/src/domain/PuzzleTopology.ts`               | Escolhe a topologia estável da partida a partir da orientação da foto.                                                              |
| `packages/games/puzzle-swap/src/domain/Swap.ts`                         | Alternativa acessível toque–toque.                                                                                                  |
| `packages/games/puzzle-swap/src/domain/GridPlanner.ts`                  | Escolha proporcional de grade e tamanho de peça.                                                                                    |
| `packages/games/puzzle-swap/src/domain/IdleAssist.ts`                   | Dica visual não punitiva após inatividade.                                                                                          |
| `packages/games/puzzle-swap/src/runtime/phaser/createPuzzleSwapGame.ts` | Adaptador Phaser: cenário atual, foto, HUD, entrada, entrada do jogador, áudio e vitória.                                           |
| `packages/games/puzzle-swap/src/tuning.ts`                              | Valores que devem ser ajustados por teste de uso: duração, margem, neve, timeout e grade.                                           |
| `packages/theme/src/game-feel/FeedbackDirector.ts`                      | Traduz um nome de feedback em animação, partículas, haptic e som sem conhecer regras do Puzzle.                                     |
| `tests/e2e/lifecycle.spec.ts`                                           | Prova em navegador: retrato, paisagem, arraste, toque–toque, pausa, som, LOW, movimento reduzido, falha de mídia e ciclos de saída. |

## Leitor de código concatenado

O arquivo [PUZZLE_SWAP_CORE_SOURCES.txt](../references/PUZZLE_SWAP_CORE_SOURCES.txt) reúne cópias dos scripts centrais, em ordem de leitura. Ele é gerado por `pnpm puzzle:source-reader`; não é a fonte de verdade para edição. Os arquivos originais acima continuam sendo os canônicos.

O leitor não contém fotos, nomes de clientes, caminhos de origem nem áudios binários.

## Direção proposta: Natal de estúdio, rico e nativo

O alvo não deve ser uma cópia do legado. A proposta é reter sua sensação de jogo de Natal completo, mas apresentar a foto da família como protagonista e não como enfeite perdido em um fundo carregado.

### Princípios visuais

1. **Cenário ilustrado em camadas.** Uma vila/estúdio de Natal própria ocupa os vazios do retrato: neve, pinheiros, janela/casa, luzes e profundidade. A foto continua central e sem crop.
2. **Moldura de lembrança.** A grade recebe moldura física natalina, sombra, pequenas luzes e estados de seleção; o visitante deve sentir que está montando uma fotografia especial.
3. **HUD de aplicativo.** Substituir glifos por ícones próprios coerentes, com alvo de toque grande e leitura infantil. O cabeçalho React fica compacto; dentro do canvas, apenas as informações do jogo.
4. **Movimento com significado.** Cada animação explica uma coisa: entrar, selecionar, trocar, acertar, pedir ajuda, pausar ou vencer. Não adicionar loops apenas para encher a tela.
5. **Áudio por estado.** Manter música suave, mas criar uma assinatura curta para seleção, acerto e vitória. O botão de mudo continua visível e o primeiro gesto continua obrigatório.
6. **Fotos primeiro.** Os fundos nunca precisam mascarar uma foto difícil ou competir com rostos. Em fotos escuras, a moldura e o contraste se adaptam; a grade continua legível.

### Componentes a criar

| Componente                                   | Como será feito                                                                                                   | Regra de qualidade                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ChristmasScenePresentation` local ao Puzzle | Composição Phaser para fundo, parallax curto, luzes, árvore/casa e área de neve; não será uma classe-base global. | LOW: estático; NORMAL: poucas luzes/neve; HIGH: apenas extras medidos.                                       |
| Pacote de arte natalina                      | SVG/PNG/WebP próprios ou ativos com licença e arquivo de proveniência; atlas apenas quando a medição justificar.  | Uma textura de fundo por cena, carregada junto à foto; nunca substituir a foto original por arte decorativa. |
| Moldura e iluminação da foto                 | `Graphics`/texturas leves, sombra e brilho muito moderado; variação por orientação.                               | Sem blur contínuo; sem filtro obrigatório em Canvas.                                                         |
| HUD de ícones                                | Ícones consistentes para som, dica e pausa; estados normal, pressionado e mudo.                                   | 48 px reais de hit area para os secundários e labels curtos.                                                 |
| Sequência de entrada                         | Capa React → transição curta → foto inteira → peças; uma camada de luz e som após gesto.                          | Movimento reduzido: troca direta, sem dissolução longa.                                                      |
| Feedback de jogada                           | Seleção ganha halo; acerto emite brilho/partículas finitas; erro só confirma, sem punição.                        | No máximo dois objetos grandes em tween por troca e burst pequeno.                                           |
| Vitória                                      | Foto completa, confete/neve finitos, selo de “montou a lembrança” e CTA para escolher outra foto.                 | Sem loop; versão reduzida é estática e ainda comemorativa.                                                   |

## Ordem de implementação recomendada

### Etapa 0 — estabilidade da partida em redimensionamento

**Implementada em 2026-08-24.** A topologia agora é congelada no início da partida e a rotina de `layout` reaproveita as mesmas imagens e bordas. Se uma rotação ocorrer durante os 160 ms da animação de troca, o tween dos dois alvos é encerrado, o comando já aceito é concluído uma vez e os mesmos objetos são refluídos na nova geometria. A prova Playwright inicia uma troca, redimensiona a tela e conclui o tabuleiro determinístico em todos os quatro perfis móveis.

Essa separação é pré-requisito para qualquer dificuldade futura (6, 9, 12 ou 16 peças): a dificuldade terá de ser escolhida antes do embaralhamento e nunca dentro de `layout`.

### Etapa 1 — direção de arte e protótipo estático

1. Escolher uma das direções visuais abaixo.
2. Criar um quadro de referência com 6–10 imagens permitidas e registrar licença/origem de cada ativo.
3. Produzir um mockup 390 × 844 com uma foto vertical e outro com foto horizontal.
4. Validar com você se a foto continua sendo a hero da tela antes de programar a cena.

**Entrega:** telas estáticas aprovadas; não mexer ainda em regras ou no fluxo de mídia.

### Etapa 2 — cenário e moldura reutilizáveis

1. Criar `ChristmasScenePresentation` dentro de `packages/games/puzzle-swap/src/runtime/phaser/`.
2. Extrair os elementos decorativos de `createPuzzleSwapGame.ts` sem alterar `PuzzleBoard` ou `Swap`.
3. Adicionar fundos para retrato e paisagem, com uma zona visual abaixo da grade que elimine o vazio atual.
4. Integrar `SceneScope` para cada textura, tween e listener novo.

**Validação:** quatro viewports, foto vertical/horizontal real de teste, movimento reduzido e LOW; nenhum canvas extra após cinco saídas.

### Etapa 3 — interação com acabamento de jogo

1. Substituir glifos por ícones próprios.
2. Dar à seleção um halo natalino e à troca uma pequena antecipação/acomodação.
3. Reservar partículas para acerto, dica e vitória; elas devem nascer e terminar, não ficar rodando.
4. Sincronizar os novos sons com os eventos já existentes (`tap`, `correct`, `hint`, `celebrate`).

**Validação:** testar toque e arraste em telefone real; registrar erros de console, taxa de quadros, duração da cena e cancelamento por saída.

### Etapa 4 — sequência de vitória e retenção

1. Fazer a capa convidar para a lembrança, não apenas para uma tela técnica.
2. Criar vitória em duas fases curtas: foto recomposta → celebração/CTA.
3. Testar se crianças entendem “escolher outra foto” sem ler um parágrafo.

**Validação:** vídeo de cada fluxo, redução de movimento, mudo, pausa durante entrada/vitória e saída antes do fim da animação.

### Etapa 5 — medição e extração para próximos jogos

Somente depois de Puzzle e mais um jogo usarem os mesmos elementos, avaliar extrair um pacote de apresentação compartilhado. Antes disso, manter a apresentação local impede criar uma arquitetura genérica para uma hipótese.

## O que validar antes de codificar efeitos novos

| Tema           | Pergunta de validação                                                             | Fonte / método                                                              |
| -------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Phaser 4.2.1   | Qual API existe exatamente na versão fixada para partículas, tween e escala?      | Fonte tagueada 4.2.1, tipos instalados e exemplo oficial correspondente.    |
| Memória        | Toda textura, som, tween e listener novo será destruído em `SHUTDOWN`?            | `SceneScope`, cinco ciclos e inspeção do canvas.                            |
| Desempenho     | Cenário continua fluido em aparelho Android intermediário, não apenas no desktop? | Gravação/perfil em dispositivo real; LOW e movimento reduzido obrigatórios. |
| Arte           | Todos os backgrounds, ícones e sons têm direito de uso e proveniência registrada? | Inventário de ativos; nada de buscar arquivos sem licença clara.            |
| Foto           | A decoração protege contraste sem esconder pessoas em retratos e paisagens?       | Matriz de fotos reais derivadas, sem gravá-las no repositório.              |
| Acessibilidade | Toda função de arraste tem alternativa; movimento reduzido preserva confirmação?  | Teste manual e WCAG 2.2 SC 2.5.7.                                           |
| Áudio          | Música e SFX funcionam após gesto, com mudo e sem tocar depois da saída?          | Fontes Phaser 4.2.1, teste móvel e inspeção de teardown.                    |

As fontes técnicas prioritárias para a próxima etapa são o código tagueado do [ParticleEmitter](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js), [ScaleManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js), [BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js), o [Loader](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js) e a orientação de [arraste acessível da WCAG](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). A documentação pública do Phaser deve ser tratada com cuidado porque pode não refletir a versão 4.2.1 fixada; a tag do repositório é a autoridade para chamadas concretas.

## Dúvidas que precisam da sua decisão

1. **Direção principal:** prefere (a) ilustração lúdica próxima ao legado, (b) Natal de estúdio premium/elegante, ou (c) híbrido — cenário lúdico, foto e moldura premium? Minha recomendação é **c**.
2. **Legado:** quais arquivos visuais e áudios do legado são seus e podem ser reaproveitados? Preciso da confirmação de licença por grupo de ativos, não apenas da pasta.
3. **Público dominante:** as crianças costumam ter que faixa de idade? Isso determina 6, 9, 12 ou mais peças, tamanho da tipografia e tempo de feedback.
4. **Ritmo:** a experiência deve ser calma e afetiva ou mais energética, com contagem, ranking e desafio? Hoje ela é deliberadamente calma e sem penalidade.
5. **Final desejado:** depois de vencer, o visitante deve só escolher outra foto, baixar/compartilhar uma lembrança, ou continuar para outro minijogo? Isso muda a tela de vitória e o backend futuro.
6. **Marca:** há paleta, logo, mascote, personagens, ilustrações ou fotografias de cenários próprios que precisem aparecer? Sem isso, a primeira arte deve ser uma direção natalina neutra e licenciada.
7. **Aprovação visual:** você consegue enviar 5–10 referências que representam exatamente “mais incrível”, separando o que gosta em fundo, moldura, HUD, animação e som? Isso reduz o risco de repetir apenas superficialmente o legado.

## Próximo passo após suas respostas

Com a direção escolhida e os ativos autorizados, o próximo pacote deve ser: mockups estáticos para retrato/paisagem, inventário de ativos, protótipo do novo cenário em LOW/NORMAL/reduzido e uma rodada de validação visual no link local. Só depois disso entraremos em partículas, áudio adicional e transições finais.
