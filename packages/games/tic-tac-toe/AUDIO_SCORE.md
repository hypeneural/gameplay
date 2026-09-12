# Audio score — Trinca de Natal

| Cue                                      | Papel              | Regra                               |
| ---------------------------------------- | ------------------ | ----------------------------------- |
| `ttt.ui.mode` / `ttt.ui.photo-select`    | escolha            | confirmação curta e opcional        |
| `ttt.board.press` / `ttt.board.occupied` | toque              | ocupado é neutro, sem punição       |
| `ttt.photo.place` / `ttt.santa.place`    | encaixe            | acompanha a confirmação visual      |
| `ttt.turn.pass` / `ttt.santa.think`      | turno              | discreto, nunca mascara a instrução |
| `ttt.win.garland` / `ttt.win.round`      | vitória            | celebração finita e cálida          |
| `ttt.draw.round` / `ttt.round.reset`     | empate e transição | acolhedor, sem tom de falha         |

Música de 60–80 s usa celesta, pizzicato, piano macio e sino discreto, começa
apenas após gesto e fica entre 0,10 e 0,14. LOW não a omite por regra: música
respeita `soundEnabled` e só poderá ser retirada após medição física de custo.
O diretor de áudio possui somente sons de TTT: não usa pausa global do Phaser,
faz duck de 2–4 dB durante guirlanda/final e encerra tudo no teardown.
