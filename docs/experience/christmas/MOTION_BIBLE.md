# Bíblia de movimento e resposta

## Princípio

Movimento confirma causa e efeito. A primeira resposta a uma ação precisa ser
imediata, pequena e compreensível; a decoração nunca atrasa toque, arraste,
dica, pausa ou saída.

| Momento         | Resposta                                  | Duração sugerida    | Movimento reduzido                |
| --------------- | ----------------------------------------- | ------------------- | --------------------------------- |
| Entrada da tela | painel e foto acomodam suavemente         | até 260 ms          | estado final imediato             |
| Toque em botão  | compressão, borda e som                   | 80–140 ms           | compressão única ou cor estática  |
| Seleção de peça | contorno e elevação curta                 | até 140 ms          | contorno estático                 |
| Arraste         | peça segue o dedo e ganha sombra discreta | durante o gesto     | igual, sem partículas             |
| Troca           | peças acomodam e recebem uma poeira curta | até 220 ms          | troca direta e contorno           |
| Dica            | dois destinos respiram em sequência       | até 900 ms, uma vez | dois contornos estáticos          |
| Acerto          | pulso dourado e som positivo              | até 420 ms          | cor/contorno final                |
| Vitória         | foto recompõe, depois confete finito      | até 1,5 s           | foto final e mensagem sem confete |

## Regras de implementação

- Uma animação de feedback tem início e fim determináveis; loop ambiente é
  opcional, pequeno e desligado pelo perfil reduzido.
- Não encadear três efeitos para uma troca. A peça deve chegar primeiro ao seu
  novo lugar.
- Cada temporizador, tween, partícula, som e listener pertence ao escopo da
  cena e é encerrado ao pausar, sair ou destruir o jogo.
- Um arraste sempre mantém a alternativa toque–toque. Movimento não pode ser a
  única forma de compreender uma troca.

## Curva de sensação

Usar entrada suave, resposta rápida e acomodação gentil. Evitar elástico
agressivo, vibração repetida, giro sem propósito, explosão constante ou um
ritmo de arcade que esconda a foto.
