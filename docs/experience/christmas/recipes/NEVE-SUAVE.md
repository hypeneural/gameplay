# Receita — neve suave

| Campo                 | Definição                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Finalidade            | Dar profundidade de inverno sem disputar a foto ou a grade.                                                                            |
| Planos de cena        | L0 e L1, sempre atrás do tabuleiro e da moldura.                                                                                       |
| Asset aprovado        | snow-particle, catalogado como puzzle-snowflake no manifesto do Puzzle.                                                                |
| Gatilho               | Entrada da partida, apenas após a Scene estar pronta.                                                                                  |
| Duração e intensidade | Emissão lenta enquanto a partida estiver ativa; uma partícula por emissão.                                                             |
| Foto protegida        | L2: foto, bordas das peças, controles e textos nunca recebem floco à frente.                                                           |
| Limite ativo          | Até 18 partículas vivas, 20 produzidas e reserva de 18 no perfil atual.                                                                |
| Som                   | Nenhum; a neve não recebe som próprio.                                                                                                 |
| Qualidade             | NORMAL mantém o teto; LOW e movimento reduzido removem a emissão por completo.                                                         |
| Ciclo de vida         | A Scene é dona do emissor. Pausa congela a emissão; saída e destruição param, removem e destroem o emissor.                            |
| Teste de aceite       | Em 390, 412, 430 e 768 px a neve fica atrás da grade; LOW e reduzido mostram zero emissor; pause e saída não deixam partículas ativas. |

Referências de direção: Bíblia de movimento e dicionário de componentes.
