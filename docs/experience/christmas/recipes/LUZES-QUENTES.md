# Receita — luzes quentes

| Campo                 | Definição                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Finalidade            | Aquecer a vila de Natal e criar profundidade sem uma lua plana ou néon.                                                                   |
| Planos de cena        | L0 e L1, em janelas, árvore ou cenário já existentes.                                                                                     |
| Asset aprovado        | `winter-village-background` é a âncora aprovada. O Memory usa quatro núcleos e halos geométricos, sem novo arquivo entregue ao navegador. |
| Gatilho               | Cena pronta; nunca depende de uma peça ou da foto da criança.                                                                             |
| Duração e intensidade | Até quatro grupos lentos, dessincronizados, com variação pequena. Cada grupo preserva um núcleo estático e só respira no halo.            |
| Foto protegida        | L2: sem brilho, filtro ou sobreposição sobre a foto, a grade ou rótulos.                                                                  |
| Limite ativo          | No máximo quatro tweens de intensidade; nenhum blur aplicado por quadro.                                                                  |
| Som                   | Nenhum.                                                                                                                                   |
| Qualidade             | NORMAL usa a variação medida; LOW usa somente o cenário; movimento reduzido preserva os núcleos estáticos sem tween.                      |
| Ciclo de vida         | A Scene é dona dos tweens; pause os congela, saída e destruição os removem.                                                               |
| Teste de aceite       | A leitura da foto e do HUD prevalece em todos os viewports; não há estroboscópio nem tween vivo após saída.                               |

Referências de direção: Bíblia de luz e dicionário de componentes.
