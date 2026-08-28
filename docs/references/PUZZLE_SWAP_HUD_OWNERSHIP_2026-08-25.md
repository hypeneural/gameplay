# Decisão de propriedade do HUD — Puzzle Swap

**Data:** 2026-08-25
**Plano:** `CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY`, tarefa E2.1
**Decisão:** cronômetro e progresso da partida ficam visíveis somente no
Phaser.

## Pergunta resolvida

Durante a brincadeira, o cronômetro e o progresso poderiam ser desenhados por
React, sobre o canvas, ou pela própria Scene de Phaser. A decisão precisava
preservar uma única camada visual, sem tornar a foto ou o tabuleiro menores.

## Comparação controlada

| Alternativa | Dono do dado durante a partida                                                                 | Mudança exigida                                                                                                          | Efeito na tela                                                                                                                                                          | Resultado                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| DOM/React   | React precisaria receber tempo em andamento e progresso após cada troca.                       | Criar eventos frequentes na ponte, sincronizar um relógio paralelo e posicionar uma sobreposição sobre a área do canvas. | Uma segunda camada de HUD passaria a disputar a mesma geometria da Scene. Manter o HUD atual produziria duplicação; removê-lo do Phaser exigiria uma migração completa. | Rejeitada nesta etapa. Não resolve problema observado e aumenta o contrato e a área de risco. |
| Phaser      | A Scene lê o relógio da partida e calcula progresso a partir do tabuleiro que acabou de mudar. | Nenhuma ponte de atualização contínua; manter o layout compacto já medido.                                               | Título, progresso, tempo e controles vivem na mesma superfície do tabuleiro, no mesmo ciclo de layout.                                                                  | Escolhida.                                                                                    |

A alternativa DOM foi comparada contra o fluxo efetivamente executado: ela não
tem hoje os dois valores na ponte tipada. Criar uma simulação local que contasse
o tempo sem a partida real não provaria sincronização, portanto não foi
introduzida como uma segunda implementação de desenvolvimento. A comparação
fica limitada à arquitetura real e à superfície que a criança vê.

## Propriedade final por informação

| Informação ou ação                                    | Origem visual durante a partida | Observação                                                                                                      |
| ----------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Título, tempo e progresso                             | Phaser                          | O tempo é atualizado pela Scene a cada segundo; o progresso é atualizado depois da troca no tabuleiro.          |
| Som, dica e pausa                                     | Phaser                          | São controles espaciais da partida, com alvo de toque e retorno no canvas.                                      |
| Seleção, troca, dica nas peças, confirmação e vitória | Phaser                          | Dependem da posição das peças e permanecem no mesmo plano do tabuleiro.                                         |
| Sair, carregamento e falha                            | React                           | São ações ou estados de rota, fora da mecânica espacial.                                                        |
| Estado de ciclo de vida                               | React, apenas semanticamente    | `game-screen-events` continua com `aria-live` e seletores de teste, recortado para 1 × 1 px. Não é HUD visível. |

React continua recebendo somente eventos tipados da ponte. Ele não recebe a
Scene, `Phaser.Game`, relógio vivo, tabuleiro ou atualização periódica de HUD.

## Evidência executada

Na rota local segura `s/local-demo-token`, em 390 × 844 CSS px, a inspeção da
partida encontrou:

| Medida                          | Resultado                                      |
| ------------------------------- | ---------------------------------------------- |
| Canvas ativo                    | 1                                              |
| Área do canvas                  | 362 × 736 CSS px                               |
| Rolagem vertical acidental      | não                                            |
| Área visual dos avisos de React | 1 × 1 CSS px, com recorte e `overflow: hidden` |
| HUD visível                     | apenas o HUD do Phaser dentro do canvas        |

O cenário E2E `Puzzle Swap keeps lifecycle announcements semantic while Phaser
owns the visible HUD` verifica a área semanticamente oculta, o canvas único e
o encerramento limpo. A inspeção visual local confirma o conteúdo canvas que o
DOM não alcança.

Nenhuma captura ou foto de cliente foi gravada neste documento.

## Regra para evolução futura

Se uma futura experiência precisar de um HUD React visível por requisito de
plataforma, a migração deve ocorrer de uma vez: criar um evento de ponte
versionado e com cadência justificada, remover o texto correspondente da Scene,
revisar área útil e validar os quatro tamanhos mobile. Nunca espelhar o mesmo
tempo ou progresso em DOM e Phaser.
