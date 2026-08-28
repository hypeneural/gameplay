# Receita — neve de vitória

| Campo                 | Definição                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Finalidade            | Marcar o fim da brincadeira depois que a foto inteira já ficou visível.                                     |
| Planos de cena        | L1, atrás da foto revelada e da mensagem de vitória.                                                        |
| Asset aprovado        | snow-particle, catalogado como puzzle-snowflake; não requer arte adicional.                                 |
| Gatilho               | Vitória confirmada pelo domínio, uma única vez por partida.                                                 |
| Duração e intensidade | Explosão curta de até 900 ms; não é uma segunda neve ambiente.                                              |
| Foto protegida        | L2 e L3: não cobrir rosto, foto revelada, tempo ou ação de saída.                                           |
| Limite ativo          | Até 12 partículas vivas, sem repetição e sem emissor persistente.                                           |
| Som                   | Pode acompanhar a assinatura de vitória, uma única vez; a foto completa é a confirmação visual equivalente. |
| Qualidade             | NORMAL pode usar o burst; LOW e movimento reduzido mostram apenas a foto e a mensagem final.                |
| Ciclo de vida         | A Scene é dona do burst. Pause, saída e destruição encerram o emissor imediatamente.                        |
| Teste de aceite       | A foto aparece antes do burst; não há partículas após 900 ms, pause ou saída.                               |

Referências de direção: Bíblia de movimento, Bíblia de áudio e dicionário de componentes.
