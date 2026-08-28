# Phaser 4.2.1 skill map

Leia a referência pedida antes de mudar código Phaser. A ordem é fixa:

1. conferir a fonte oficial na tag exata `v4.2.1`;
2. ler a Skill vendorizada correspondente, quando ela já existir neste
   repositório;
3. conferir os símbolos em `phaser.d.ts` instalado; e
4. executar ou adaptar apenas o exemplo curto da própria fonte oficial da
   mesma tag.

Não inclua uma Skill grande no contexto só por possibilidade. Quando uma linha
abaixo ainda aponta somente para a fonte oficial, o recurso continua bloqueado
para código de produção até que a tarefa aprovada justifique e revise sua
referência vendorizada.

| Task                                            | Required vendored skill      |
| ----------------------------------------------- | ---------------------------- |
| create or configure `Phaser.Game`               | `game-setup-and-config`      |
| scene lifecycle, boot, shutdown                 | `scenes`                     |
| cross-scene/lifecycle event listener            | `events-system`              |
| viewport, ScaleManager or screen-space layout   | `scale-and-responsive`       |
| pointer, touch, drag or keyboard                | `input-keyboard-mouse-touch` |
| image load, timeout, retry/fallback             | `loading-assets`             |
| image/sprite object                             | `sprites-and-images`         |
| object transform/lifecycle component            | `game-object-components`     |
| single photo texture, crop or generated texture | `render-textures`            |
| game time, countdown or delayed task            | `time-and-timers`            |
| tween feedback/celebration                      | `tweens`                     |
| sound, browser unlock or mute                   | `audio-and-sound`            |
| snow, sparkle or particle budget                | `particles`                  |
| visual filter/post-processing                   | `filters-and-postfx`         |
| Phaser 4 feature behavior                       | `v4-new-features`            |
| material from Phaser 3 or older donor           | `v3-to-v4-migration`         |

Physics, tilemap and multiplayer skills are intentionally absent from the default context because the first games do not need them.

## Referências sob demanda, ainda fora do contexto padrão

| Requisito aprovado e concreto                                                                                                    | Referência oficial Phaser 4.2.1                                                                               | Tipos instalados conferidos                                                                                                                                             | Exemplo oficial a ler                   | Decisão para o Puzzle atual                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uma transição, foco narrativo ou efeito de câmera foi aprovado na direção de arte.                                               | [cameras](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/cameras/SKILL.md)                             | `Phaser.Cameras.Scene2D.Camera` e `CameraManager`; a câmera oferece fade, flash, shake, pan e zoom.                                                                     | Seção **Quick Start** da Skill oficial. | Não usar para preencher o fundo estático. A cena atual não chama a API de câmera.                                                                                     |
| Uma faixa de frames, atlas ou spritesheet aprovado precisa animar personagem ou objeto.                                          | [animations](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/animations/SKILL.md)                       | `Phaser.Animations.AnimationManager`; a Skill separa animações globais e locais.                                                                                        | Seção **Quick Start** da Skill oficial. | Sem spritesheet aprovado, continuar com `Tween` finito para o retorno visual; não inventar uma animação de sprite.                                                    |
| Vários objetos precisam de coleção sem transformação, de uma árvore visual compartilhada ou de pool, com motivo e custo medidos. | [groups-and-containers](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/groups-and-containers/SKILL.md) | `Phaser.GameObjects.Group`; o tipo confirma que Group não é exibível nem pode ser posicionado, girado, escalado ou ocultado.                                            | Seção **Quick Start** da Skill oficial. | As listas fixas da cena permanecem simples. Não criar um contêiner genérico para o tabuleiro sem necessidade demonstrada.                                             |
| Texto dinâmico passou a ser gargalo medido, ou foi aprovada uma fonte bitmap com licença e manifesto.                            | [text-and-bitmaptext](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/text-and-bitmaptext/SKILL.md)     | `Phaser.GameObjects.Text` e `BitmapText`; o tipo instalado recomenda BitmapText em caso de problema de desempenho, pois evita chamadas Canvas caras e permite batching. | Seção **Quick Start** da Skill oficial. | O HUD curto atual continua em `Text`. Não carregar fonte bitmap ou criar arte tipográfica sem aprovação, licença e auditoria de assets.                               |
| A interação, zona de emissão ou validação precisa de cálculo geométrico além do retângulo já usado pela cena.                    | [geometry-and-math](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/geometry-and-math/SKILL.md)         | `Phaser.Geom`; é utilitário numérico, não objeto de renderização.                                                                                                       | Seção **Quick Start** da Skill oficial. | O `Rectangle` atual de partículas e entradas já é coberto por `particles` e `input-keyboard-mouse-touch`. Não ampliar a dependência até surgir forma ou cálculo novo. |

Esta tabela registra a tag, o motivo, o tipo e o exemplo oficial sem copiar o
conteúdo dessas cinco Skills. Quando uma tarefa realmente ativar uma linha,
adicione somente a referência vendorizada revisada que ela exige e atualize a
tabela com o caminho local. Física, tilemap, multiplayer e os demais tópicos
continuam fora da leitura normal enquanto não houver requisito.
