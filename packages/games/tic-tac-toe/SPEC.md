# Trinca de Natal

## Promessa

A foto escolhida pela família torna-se uma peça de um mural da Oficina do
Noel. Faça três lembranças em linha para vencer uma rodada. A primeira ação é
sempre clara: escolher jogar com o Papai Noel ou, com duas fotos, iniciar um
duelo local.

## Escopo V1

- Mobile-first em retrato; uma partida melhor de três dura cerca de 2–4
  minutos.
- Com uma foto, há partida contra o Papai Noel; com duas ou mais, também há
  Duelo de Fotos no mesmo aparelho. A foto B sempre tem ID diferente de A.
- Noel Gentil, Esperto (padrão) e Mestre são determinísticos a partir de
  `Random` injetado.
- Contra Noel, a criança abre as rodadas 1 e 3 e Noel abre a 2. No duelo, o
  iniciador é escolhido uma vez e alterna em cada rodada.
- Empate consome a rodada, não concede ponto e recebe a mensagem gentil
  “Empate de Natal!”. Não existe rede, ranking, conta nem multiplayer remoto.

## Regra e fronteiras

O domínio guarda um tuple de nove células (`player-a`, `player-b` ou `null`),
as oito linhas vencedoras, turno, placar, rodada e estado de partida. Ele só
recebe descritores seguros de foto (`id`, `orientation`, `aspectRatio`) e
`Random` injetado; não importa Phaser, React, DOM, URLs, `Date.now` ou
`Math.random`.

No runtime, `pointerdown` só confirma visualmente a pressão da célula.
`pointerup` confirma a jogada no domínio apenas se o mesmo dedo permanecer na
mesma célula, dentro do slop de 10 CSS px e no mesmo epoch de apresentação. O
runtime mede o slop exclusivamente no plano screen do Pointer e faz a conversão
por display/game scale quando for necessária; ele não mistura coordenadas de
mundo ou locais da célula. Phaser apenas desenha, recebe intenção, apresenta
som/VFX e respeita o arbiter de pausa, picker, pensamento e placement. React
recebe eventos da bridge, nunca Scene ou `Phaser.Game`.

## Primeira leitura e resposta

Nos primeiros cinco segundos, a foto A aparece proporcional, o convite diz
“Faça 3 fotos em linha!” e há somente uma próxima escolha. Uma célula vazia
responde no pressionar e confirma no soltar; célula ocupada mostra apenas
realce neutro. Vitória liga uma guirlanda entre as três molduras sem cruzar
pixels da foto. LOW e redução de movimento preservam leitura, toque, encaixe,
turno e guirlanda estática.

Durante a partida, título, progresso, mensagem e mural têm faixas verticais
distintas. A mensagem contextual é única: turno, Noel pensando, encaixe ou
resultado. O contexto de menu só aparece fora da partida; ele nunca divide a
mesma altura com resultado, orientação ou o topo do tabuleiro.

## Aceite

- `TTT-001`: as oito linhas, jogadas legais, terminalidade e imutabilidade são
  testadas no domínio.
- `TTT-002`: Gentil, Esperto e Mestre usam apenas `Random` injetado e nunca
  devolvem célula ilegal.
- `TTT-003`: Mestre usa Minimax com alpha-beta, prefere vitória rápida e adia
  derrota, sem cache na V1.
- `TTT-004`: Esperto vence, bloqueia e trata forks; duelo alterna ownership sem
  rede.
- `TTT-005`: uma foto libera Noel; duas liberam duelo; A/B não coincidem.
- `TTT-006`: domínio conhece somente descritor seguro e a foto permanece
  proporcional, sem filtro ou reload por célula.
