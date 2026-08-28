# Receita — botão pressionado

| Campo                 | Definição                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Finalidade            | Confirmar imediatamente que um controle foi tocado.                                                   |
| Planos de cena        | L3, somente no próprio controle.                                                                      |
| Asset aprovado        | Ícone de dica, pausa, continuar ou som já catalogado; superfície e borda são desenhadas pelo runtime. |
| Gatilho               | Pressionar um botão disponível.                                                                       |
| Duração e intensidade | Compressão e retorno de 80 a 140 ms, uma vez por toque.                                               |
| Foto protegida        | Não se aplica: a resposta não sai da área do controle.                                                |
| Limite ativo          | Um tween por controle; toque novo substitui a resposta anterior no mesmo alvo.                        |
| Som                   | Papel toque, baixo e curto; intervalo mínimo impede acúmulo. Estado visual continua legível em mudo.  |
| Qualidade             | Igual em NORMAL e LOW; reduzido usa compressão única ou contraste estático.                           |
| Ciclo de vida         | A Scene é dona do tween e da fonte curta; pause, saída e destruição encerram ambos.                   |
| Teste de aceite       | Dica, pausa, som e saída respondem em até um quadro visual sem criar som ou tween acumulado.          |

Referências de direção: Bíblia de movimento, Bíblia de áudio e dicionário de componentes.
