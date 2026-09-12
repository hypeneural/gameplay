# Direção de arte — Trinca de Natal

## Direção aprovada

Mural fotográfico 2.5D na Oficina do Noel: madeira de pinho escura e calma,
moldura de papel fotográfico quente, cranberry para a família, verde-pinho para
o segundo jogador e dourado suave para conquistas. A profundidade vem de
sombra, passe-partout, bevel e luz preparada, não de câmera, shader obrigatório
ou filtro sobre fotos. O Papai Noel é um cameo 2D expressivo, nunca um retrato
realista nem elemento mais chamativo que a foto.

## Hierarquia

1. Foto do jogador e dock ativo, nítidos e sem filtro.
2. Tabuleiro 3 × 3, molduras e instrução de turno.
3. Placar de rodadas, controles de som/pausa e guirlanda.
4. Oficina, janela, galeria periférica e Noel como atmosfera de baixo contraste.

## Estados e composição

- A casa vazia é um encaixe de álbum marfim, quente e claramente vazio; não é
  carta fechada, botão sem rótulo ou retângulo branco dominante.
- O cartão da foto tem sombra de contato, moldura externa, passe-partout e
  badge de identidade; a imagem é sempre frontal, proporcional e sem filtro.
- O dock ativo ganha filete dourado e luz âmbar discreta. O dock inativo
  escurece sua superfície, mas não reduz a saturação/alpha da miniatura.
- Madeira/luzes ficam em L1; mural, fotos, HUD e ação principal ficam em L2.
  L3 usa no máximo dois cantos e nunca invade o gesto, a grade ou um rosto.
- A referência desejada é de qualidade e materialidade, não uma composição a
  copiar. Toda arte final continua dependendo de aprovação e manifesto.

## Restrições

Não aplicar IA generativa, face swap, recolorização ou efeito sobre fotos da
família. A guirlanda só ocupa gutters, passe-partout e bordas das células;
nunca desenha sobre pixels da foto. Não usar texto embutido em arte, loops de
neve, pós-processamento obrigatório ou partículas contínuas. Toda decoração
precisa poder desaparecer em LOW.
