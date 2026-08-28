# Contrato de medição de desempenho

**Plano:** `CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY`, etapa E4.1
**Estado:** modelo implementado; ainda não há orçamento numérico aprovado.

## Finalidade

Este contrato torna cada número comparável antes dos laboratórios de assets e
desempenho. Ele não promete memória total de GPU, FPS universal ou desempenho
em Android sem uma medição no aparelho de referência.

## Métricas e limites de interpretação

| Métrica                                                   | Unidade e escopo                                                                                                | Coleta                                                                                        | Limite conhecido                                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Bytes públicos                                            | bytes de todos os arquivos estáticos catalogados                                                                | Auditoria do manifesto                                                                        | Não inclui cabeçalhos, cache ou compressão de transporte.                                                                            |
| Bytes de uma partida                                      | bytes dos arquivos que uma partida pode escolher, contando somente a maior alternativa de cada grupo de entrega | Auditoria do manifesto + variante de foto efetivamente escolhida no Laboratório de Desempenho | Não é uma medição de cache, rede ou memória.                                                                                         |
| Bytes visuais                                             | bytes de imagens, interface e VFX catalogados, sem áudio                                                        | Auditoria do manifesto                                                                        | Não indica quanto a textura ocupa depois de decodificada.                                                                            |
| Textura decodificada                                      | `largura × altura × 4` bytes por textura RGBA                                                                   | `estimateDecodedRgbaTextureBytes`                                                             | É uma estimativa conservadora de pixels RGBA; não inclui GPU real, canvas, mipmaps, atlas, compressão, buffers ou overhead do motor. |
| Requests                                                  | quantidade de recursos iniciados pela cena ativa                                                                | Adaptador do Laboratório de Desempenho                                                        | O navegador pode reutilizar cache; a contagem não prova bytes transferidos.                                                          |
| Objetos, partículas, tweens, timers e instâncias de áudio | quantidade ativa, por Scene e por estado                                                                        | Snapshot da Scene no Laboratório de Desempenho                                                | Mede recursos que o jogo declara; não mede objetos internos do navegador ou do motor.                                                |
| Deltas de frame                                           | milissegundos entre timestamps de apresentação consecutivos                                                     | `PresentationFrameSampler` injetado pelo laboratório                                          | Não é tempo de CPU, GPU nem latência de toque; callbacks podem pausar em aba oculta.                                                 |
| p50, p95 e p99                                            | milissegundos, percentil por posição de posto mais próximo                                                      | `summarizeFrameDeltas`                                                                        | São descritivos; não são limite de aprovação até E4.4.                                                                               |
| Frames acima do limiar                                    | contagem de deltas estritamente maiores que o limiar registrado                                                 | `summarizeFrameDeltas`                                                                        | O limiar deve aparecer no relatório; esta etapa não fixa seu valor de produto.                                                       |

## Relógio de apresentação

O coletor recebe o timestamp passado por `requestAnimationFrame`. A API chama
o callback antes do próximo repaint, a frequência normalmente acompanha a tela
e o callback é único; por isso o coletor agenda a próxima observação somente
enquanto estiver ativo. O timestamp de argumento é preferível a criar outro
relógio e é comparável entre callbacks da mesma apresentação. [Referência da
API `requestAnimationFrame` no HTML Standard](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-animationframeprovider-requestanimationframe).

Em uma aba oculta, callbacks podem pausar. O Laboratório de Desempenho deverá
registrar essa condição e encerrar a amostra; nunca deve interpretar o intervalo
de uma aba em segundo plano como travamento da brincadeira.

## Privacidade e pré-carregamento

Antes do preload, o laboratório registra apenas papéis seguros: variante da
foto escolhida (`game`), forma da foto, asset de fundo e perfil de qualidade.
Ele não registra caminho, URL, nome de cliente, token ou foto original.

O Puzzle já escolhe uma única variante de foto por partida e não carrega
retrato e paisagem por precaução. A futura instrumentação deve confirmar esse
fato por execução, não inferi-lo de uma lista de assets.

## Implementação atual

`packages/platform/src/game-runtime/PerformanceMeasurements.ts` oferece:

- a estimativa pura de textura RGBA;
- percentis p50, p95 e p99 estáveis e contagem acima do limiar;
- um coletor de timestamps de apresentação com scheduler injetado, sem
  `Date.now`, DOM ou Phaser;
- cancelamento explícito de frame pendente no encerramento.

`FrameBudgetMonitor` usa o mesmo resumo p95 para não manter duas fórmulas de
percentil. Os laboratórios E4.2 e E4.3 são os únicos adaptadores de browser;
o domínio dos jogos permanece sem relógio real.

## Laboratório E4.3 implementado

`/__dev/performance` só existe no ambiente de desenvolvimento e abre uma
fixture SVG pública. Ele reaproveita uma única query de preferências com o
ExperienceLab, lê timestamps de apresentação durante a montagem e mantém os
resultados apenas em memória do navegador.

Os cenários ocioso, seleção, dica, acerto, vitória e pausa são comandos locais
tipados para a Cena do Puzzle: chamam os caminhos reais de feedback, troca,
conclusão e pausa, sem dar a React acesso à Cena ou ao estado do tabuleiro.
Recomeçar e sair usam o `PhaserHost` já responsável por destruir a partida. O
relatório registra canvas, host e contagem de eventos locais imediatamente
antes de montar e depois de destruir. `0 tela(s), 0 área(s) do jogo` é a prova
esperada após a saída; não é uma alegação sobre memória total da GPU.

## Próximas portas

- E4.2 mostra somente assets aprovados e os seus custos conhecidos.
- E4.3 conecta o coletor a um cenário local e tira snapshots antes/depois do
  teardown.
- E0.4 e E4.4 registram Android físico e, somente então, definem orçamento
  numérico por qualidade.
