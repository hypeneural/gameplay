# Motion score — Expresso das Fotos

| Momento           |                 Duração | Curva / resposta           | Regra visual                                       |
| ----------------- | ----------------------: | -------------------------- | -------------------------------------------------- |
| Toque válido      |                   90 ms | compressão e retorno suave | locomotiva reduz para 97,5%; faixa acende          |
| Escolha de faixa  |                  180 ms | `quad.out`                 | trilho desenha luz até o portal                    |
| Viagem            | 190 ms base + distância | `sine.inOut`               | acelera, percorre trilho, desacelera sem teleporte |
| Chegada           |                  260 ms | mola amortecida            | vagões comprimem e retornam uma vez                |
| Revelação da foto |                  260 ms | `cubic.out`                | foto cresce de 96% para 100%, sem filtro facial    |
| Coleta            |                  380 ms | sequência curta            | estrela vai para o álbum; neve explode uma vez     |
| Faixa incorreta   |                  180 ms | retorno elástico           | sem flash vermelho e sem perda                     |
| Dica ociosa       |              após 6,5 s | pulso de 720 ms            | halo da faixa correta, pausável                    |

O runtime mantém referências apenas aos tweens e sons que possui. Pausar interrompe esses recursos sem usar pausas globais do Phaser.
