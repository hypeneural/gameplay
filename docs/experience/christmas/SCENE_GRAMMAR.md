# Gramática de cena natalina

## Decisão que este documento toma

Uma tela de jogo natalina é uma composição em quatro planos. A fotografia, a
grade e a ação principal sempre vencem a disputa por atenção. O cenário cria
profundidade e acolhimento; ele não é uma segunda brincadeira atrás da foto.

| Plano | Nome             | Conteúdo permitido                         | Regra de leitura                      |
| ----- | ---------------- | ------------------------------------------ | ------------------------------------- |
| L0    | fundo distante   | céu, vila, pinheiros e estrelas discretas  | baixo contraste e poucos detalhes     |
| L1    | meio de cena     | janela, árvore, luzes e neve distante      | enquadra a foto, nunca a cruza        |
| L2    | jogo e lembrança | foto, grade, moldura, HUD e ação principal | maior contraste e maior área útil     |
| L3    | primeiro plano   | ramo, presente, banco de neve ou lanterna  | apenas nos cantos e com área limitada |

## Zonas protegidas

- A zona da foto ocupa o centro e permanece limpa. Nenhuma partícula, texto,
  laço ou personagem pode atravessar um rosto ou competir com a grade.
- HUD e instrução usam uma faixa de cor estável, fora da leitura principal da
  foto. Eles não dependem de uma região clara ou escura da imagem para existir.
- Controles ficam afastados de cantos com decoração. Cada controle tem um
  espaço livre ao redor para o toque infantil.
- Primeiro plano usa no máximo dois cantos em uma tela. Se houver presente em
  baixo à esquerda, o outro prop não deve repetir a mesma força visual no canto
  oposto.

## Composição mobile

1. Em 390 px de largura, a foto ou grade é percebida antes de qualquer detalhe
   do cenário.
2. O cenário usa recorte seguro para retrato e paisagem; a pessoa nunca vê a
   classificação técnica da imagem.
3. A moldura parece um objeto físico simples: fita, madeira, dourado suave ou
   papel texturizado. Ela sinaliza proteção, não limita a foto com enfeites.
4. Na entrada, o olhar segue: foto escolhida → instrução curta → botão para
   começar. Durante a partida: grade → dica/pausa → instrução de toque.
5. A vitória revela primeiro a foto recomposta; a celebração entra depois, em
   volta dela, e termina sozinha.

## Variações de qualidade

| Perfil             | Mantém                                             | Simplifica ou remove                               |
| ------------------ | -------------------------------------------------- | -------------------------------------------------- |
| NORMAL             | quatro planos, neve esparsa e luzes em grupos      | detalhes que não ajudam a leitura                  |
| LOW                | L0 simples, foto, moldura, HUD e resposta de toque | neve ambiente, props pequenos e luzes extras       |
| Movimento reduzido | hierarquia e estados estáticos                     | queda de neve, pulsos contínuos e entrada repetida |

## Revisão visual antes da integração

Em 390, 412, 430 e 768 CSS px, responder: a foto é a primeira coisa vista? A
instrução continua legível numa foto clara e numa foto escura? O botão tem área
livre? Há algum elemento sobre rosto ou sobre uma peça? Se uma resposta for
negativa, reduzir ou mover decoração antes de criar mais arte.
