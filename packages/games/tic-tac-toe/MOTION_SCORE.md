# Motion score — Trinca de Natal

| Momento             |    Duração | Resposta                      | Regra visual                                         |
| ------------------- | ---------: | ----------------------------- | ---------------------------------------------------- |
| Entrada de tela     | até 260 ms | painel/foto assentam          | reduzido mostra estado final imediato                |
| Escolha/menu        |  80–140 ms | compressão + filete           | cor/borda estática; menu confirma antes de descartar |
| Pressão no down     |   45–75 ms | pressão curta                 | ainda não modifica o domínio                         |
| Commit no up        |          0 | validação                     | mesmo pointer/célula/epoch e dentro do slop          |
| Pickup              |   60–80 ms | elevação curta                | cartão transitório nasce no dock                     |
| Peça até a célula   | 160–210 ms | `cubic.out`                   | pequeno arco; token final fixa no settle             |
| Troca de turno      | 120–180 ms | `quad.out`                    | pode sobrepor o settle; não desloca o board          |
| Noel pensando       | 380–680 ms | três estados                  | jogada planejada antes do delay; reduzido estático   |
| Guirlanda vencedora | 350–550 ms | propagação por linha          | fio nos gutters e luzes fora da foto                 |
| Empate              |     260 ms | onda única                    | molduras respondem sem vermelho                      |
| Hero final          |  até 1,1 s | foto hero + celebração finita | reduzido fixa hero, texto e placar sem partículas    |

Tweens, timers, emitters e callbacks possuem token de rodada e pertencem ao
`SceneScope`. Pausa, resize crítico e saída invalidam presses/transientes
antigos; nenhuma animação modifica turno, placar ou resultado. Movimento
reduzido troca o flight por fade/escala de token final, não apenas por uma
animação mais lenta. Variações de inclinação, pisca e sparkle usam uma RNG
visual independente com salt fixo do `runSeed`; ela nunca consome o Random que
decide starter, foto B ou IA.
