# Bíblia de experiência natalina

Esta é a referência curta para cada jogo novo. Ela descreve decisões que devem
ser consistentes entre jogos, sem forçar uma Scene, uma mecânica ou uma arte
idêntica.

## Promessa para a criança e para a família

Em até cinco segundos, a pessoa deve reconhecer a própria lembrança, entender
a primeira ação e sentir que entrou em uma brincadeira de Natal. A fotografia
é a heroína; fundos, molduras, luzes, partículas e sons existem para celebrar
a foto, nunca para escondê-la.

## Primeiros cinco segundos

1. Mostrar a foto escolhida sem distorção e sem informações técnicas sobre o
   arquivo.
2. Dar uma única instrução curta, com verbo de ação: “Toque em duas peças”,
   “Encontre os pares” ou equivalente.
3. Oferecer uma ação principal com pelo menos 52 CSS px, contraste suficiente
   e resposta instantânea de toque.
4. Iniciar som e música somente depois de uma ação da pessoa e sempre oferecer
   um controle de som compreensível.

## Gramática visual

- **Cores:** azul-noturno para profundidade, verde-pinho para superfícies,
  vermelho-framboesa para convite e dourado suave para conquistas. O tema pode
  variar, mas o contraste do texto e da foto é obrigatório.
- **Cenário:** a arte de fundo conta uma noite de Natal e deixa uma área calma
  atrás da foto. Ela não usa a imagem da criança como textura decorativa.
- **Molduras:** bordas natalinas devem proteger a leitura e indicar o espaço de
  interação; não devem competir com o rosto nem cortar a foto.
- **Controles:** ícones e palavras usam português simples. Não usar rótulos
  técnicos, códigos de estado ou termos em inglês para quem joga.
- **Seleção:** uma foto ou ação selecionada recebe brilho, borda e pulso curto;
  a animação confirma a escolha, sem deslocar o layout continuamente.

## Gramática de movimento e resposta

| Momento           | Resposta obrigatória                    | Decoração possível               |
| ----------------- | --------------------------------------- | -------------------------------- |
| Tocar em controle | escala/realce curto e som de toque      | brilho dourado breve             |
| Iniciar ação      | confirmação imediata                    | transição de entrada curta       |
| Mover peça        | resposta visual durante o arraste       | partículas finitas ao soltar     |
| Acertar           | cor/posição correta e som positivo      | faíscas finitas                  |
| Ação inválida     | explicação gentil, nunca punição        | som discreto e retorno suave     |
| Dica              | mostrar a próxima intenção sem resolver | iluminar os elementos envolvidos |
| Vitória           | revelar a foto inteira e celebrar       | uma explosão finita, sem loop    |

O tempo e a pontuação informam, mas não devem envergonhar uma criança. A
primeira resposta a uma ação é mais importante que um efeito grande.

## Som e haptics

Cada jogo define suas próprias fontes, mas usa os papéis `tap`, `correct`,
`wrong`, `hint` e `celebrate` quando fizer sentido. Toda fonte deve aparecer
no manifesto e na proveniência antes de entrar no navegador. Haptics são
opcionais e somente reforçam a mesma ação que já é perceptível visualmente e
por som.

## Qualidade e acessibilidade

| Perfil             | Mantém                                                     | Remove                                       |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| LOW                | texto, contraste, feedback de toque, confirmação de acerto | ambiente decorativo e pós-efeitos            |
| NORMAL             | neve limitada e respostas finitas                          | efeitos caros sem função de leitura          |
| HIGH               | somente efeito medido e opcional                           | loops sem limite                             |
| Movimento reduzido | leitura, som opcional e confirmação estática               | pulsos repetidos, neve e celebrações em loop |

Uma alternativa simples de toque deve existir quando o jogo usa arraste, salvo
quando arrastar for inerente à própria brincadeira. A foto precisa continuar
proporcional em retrato e paisagem; a pessoa não precisa ver essas categorias.

## Antes de aprovar um novo jogo

- O `SPEC.md` descreve a primeira ação, o erro gentil, a dica e a vitória.
- `EXPERIENCE.md` identifica os papéis visuais e sonoros sem escolher assets
  aleatórios durante a implementação.
- Cada arquivo browser-deliverable entra em `assets/manifest.json`, possui
  proveniência e cabe no orçamento.
- A rota é revisada em 390, 412, 430 e 768 px; LOW e movimento reduzido têm
  evidência própria.
- O domínio continua determinístico e não conhece Phaser, React, arquivos,
  fotos ou efeitos.

## O que não é compartilhado por padrão

Não criar uma Scene-base, um catálogo de centenas de ilustrações ou um efeito
global apenas porque dois jogos parecem natalinos. Só mover uma composição
para `theme` ou uma ferramenta para `tools` depois de dois consumidores reais
provarem a mesma necessidade.
