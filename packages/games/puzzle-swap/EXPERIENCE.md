# Puzzle Swap — experiência natalina

Este contrato humano descreve a brincadeira que a família percebe. As regras
de embaralhamento, troca e dica continuam isoladas em `domain/`; assets,
URLs, caminhos de sessão e fotos de cliente não entram neste arquivo.

## Promessa e primeira ação

A criança encontra sua foto dentro de uma moldura de Natal e monta a lembrança
trocando duas peças. A capa mostra a foto proporcional, o convite simples
“Começar a brincadeira” e um retorno imediato ao toque. Não há orientação da
imagem, código interno ou contagem técnica na interface da família.

O gesto principal é tocar em duas peças. Arrastar é uma alternativa direta
para o mesmo gesto, nunca o único caminho. Uma rodada normal é relaxada e
costuma durar até três minutos; o relógio informa, mas não pune.

## Estados e resposta

| Momento            | Resposta para a criança                                                            | LOW e movimento reduzido                                  |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Escolher foto      | borda, brilho curto e ação principal pronta                                        | mantém borda e contraste, sem pulso repetido              |
| Tocar uma peça     | moldura de seleção e som curto opcional                                            | mantém seleção estática                                   |
| Arrastar ou trocar | resposta imediata; soltar confirma a troca                                         | preserva toque–toque e confirmação sem decoração contínua |
| Acertar            | encaixe, cor positiva, som leve e faíscas finitas                                  | mantém encaixe e leitura, omite faíscas                   |
| Tentar sem avançar | retorno suave, sem punição                                                         | mantém resposta gentil                                    |
| Pedir dica         | verde primeiro, dourado depois e frase curta; nunca move peças                     | usa contraste estático e a mesma orientação               |
| Pausar             | jogo espera e explica como continuar                                               | mantém o painel sem animação                              |
| Vencer             | revela a foto inteira e oferece nova rodada, desafio, catálogo ou compartilhamento | celebração finita sem loop                                |

## Papéis necessários

O arquivo `EXPERIENCE_REQUIREMENTS.json` lista os papéis obrigatórios:
foto protagonista, cenário, moldura, ação principal, feedback de seleção,
dica, acerto e vitória, além de som de toque, acerto e vitória. A escolha de
qualquer arquivo continua dependendo de proveniência, revisão e orçamento no
manifesto de assets.

## Critérios de revisão

- A foto, a ação e o tabuleiro são lidos nessa ordem.
- A dica mostra o próximo gesto, sem resolver por conta própria.
- Cada ação importante continua compreensível sem som.
- A saída encerra canvas, sons, efeitos e listeners pertencentes à partida.
- A capa e a partida são revisadas em 390, 412, 430 e 768 CSS px, com
  derivados seguros e sem guardar foto de cliente no repositório.
