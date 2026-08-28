# Receita — dica de duas peças

| Campo                 | Definição                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Finalidade            | Ensinar uma troca válida sem movê-la automaticamente.                                                              |
| Planos de cena        | L2, em dois contornos de célula; texto curto fica fora da foto.                                                    |
| Asset aprovado        | hint-control e áudio hint, já catalogados; contornos são desenhados pelo runtime.                                  |
| Gatilho               | Botão Dica ou inatividade definida pelo domínio.                                                                   |
| Duração e intensidade | Contorno verde por 400 ms; depois, os contornos verde e dourado com relação verbal clara, por até 1,45 s no total. |
| Foto protegida        | Nenhum destaque fica sobre a face; texto fica em área calma do HUD ou coach mark.                                  |
| Limite ativo          | Dois contornos e até dois tweens finitos, um por etapa; uma dica ativa por partida e intervalo de 1,7 s.           |
| Som                   | Papel dica, um toque de celesta curto, com resposta visual idêntica em mudo.                                       |
| Qualidade             | NORMAL pode pulsar duas vezes; LOW e reduzido usam dois contornos estáticos e legíveis.                            |
| Ciclo de vida         | A Scene é dona de timer e tween; uma nova dica, troca, pausa, saída ou destruição os encerra.                      |
| Teste de aceite       | A dica aponta exatamente targetCellIndex e sourceCellIndex retornados pelo domínio, sem alterar o tabuleiro.       |

Referências de direção: Bíblia de movimento, Bíblia de áudio e dicionário de componentes.
