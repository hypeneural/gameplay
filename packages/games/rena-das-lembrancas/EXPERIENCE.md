# Rudolph — experiência implementada

A foto escolhida aparece na capa e na primeira queda. Uma instrução curta convida:
“Toque ou deslize para guiar Rudolph”. O gesto responde imediatamente; a rena
acelera até o destino sem teletransporte. Os controles principais têm 52 CSS px.

| Momento  | Resposta                                                | Som                 | LOW/reduzido             |
| -------- | ------------------------------------------------------- | ------------------- | ------------------------ |
| Guiar    | Corrida articulada e destino por toque                  | Neve curta ao toque | Deslocamento sem balanço |
| Resgatar | Cabeça/nariz reagem, foto ganha destaque e vai ao álbum | Encaixe autorizado  | Destaque estático        |
| Repetir  | Foto reconhecida, mesma página e mais magia             | Encaixe autorizado  | Mesmo significado        |
| Escapar  | Foto sai do campo e retorna em outra oportunidade       | Neve suave          | Sem punição              |
| Magia    | Atração próxima e nariz aceso por três segundos         | Celesta ascendente  | Estado estático          |
| Álbum    | Foto inteira ampliada e navegação por botão ou foto     | Papel               | Sem animação contínua    |
| Vitória  | Foto principal e álbum com todas as únicas              | Vitória autorizada  | Sem loop decorativo      |

Rudolph usa peças raster do mesmo modelo de pelúcia; a vila e Noel seguem
a direção de diorama natalino. Não foram usados assets do donor. Neve só nas bordas; controles
seguem o padrão cristalino. A instrução fica na faixa do polegar, fora da rena
ou da fotografia. Pausa manual, visibilidade e visor são razões independentes.

O contrato sem-movimento-continuo refere-se à decoração: a queda e o movimento
horizontal necessários ao jogo permanecem. Som não é necessário para compreender
resgate ou vitória. Mudo para sons em curso, sem reprodução atrasada ao voltar.

Noel passa uma vez trazendo uma repetição dourada, sem aumentar a coleção.
Luzes e neve respondem sem avançar regras; tocar o nariz ativa magia pronta.
A capa apresenta a foto com Rudolph, e o HUD mostra páginas salvas em miniatura.
Queda, destaque e visor usam borda compacta de madeira/latão, com cantos
preservados e fotografia inteira acima do material. Tocar nas miniaturas abre
o álbum. Arrastar a partir do nariz conduz Rudolph sem consumir magia; a ativação exige toque
concluído. Os botões finais aguardam 700 ms para não receber o último gesto da rodada.

O destaque da foto principal aproveita sua derivada `game`, retida durante a
rodada. Os demais destaques usam `card`; o visor carrega a foto consultada em
maior resolução e conserva no máximo duas derivadas `game`. Voltar várias
vezes à mesma página não esgota tentativas de carga que já tiveram sucesso.
Falhas continuam com tentativas limitadas e preservam a versão `card` legível.

Pendências de homologação: escuta e desempenho em Android/iPhone reais,
continuidade da corrida em gravação no aparelho, safe areas/Safari e medição
direta dos recursos após sessões prolongadas. Os resultados em Chromium
ficam no relatório de qualidade; não equivalem à certificação física.
