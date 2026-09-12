# Validação oficial — runtime de Trinca de Natal

**Data:** 2026-08-30  
**Escopo:** decisões Phaser do plano
[Trinca de Natal](../exec-plans/CG-TRINCA-DE-NATAL-IMPLEMENTATION.md). Esta nota
valida a API de runtime; não autoriza iniciar a implementação do jogo.

## Ordem de autoridade

A ordem obrigatória deste repositório é:

1. source/tag oficial Phaser v4.2.1;
2. skill vendorizada v4.2.1;
3. tipos instalados em apps/play/node_modules/phaser/types/phaser.d.ts;
4. exemplo oficial compatível com a mesma release;
5. donor externo, apenas como referência de algoritmo ou experiência.

A documentação pública e o repositório de exemplos são mapas úteis, mas podem
apontar para outra release ou para a versão de desenvolvimento. Uma chamada
Phaser concreta só entra depois de confirmação na tag e nos tipos locais.

## Decisões confirmadas

| Tema                  | Fonte oficial v4.2.1                                                                                                                                                                                     | Decisão para Trinca                                                                                                                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resize                | [ScaleManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js)                                                                                                                 | Usar Scale.RESIZE no host com dimensões definidas e reposicionar objetos existentes no evento de resize. RESIZE oferece mapeamento 1:1 e a própria fonte alerta para fill-rate; a cena impõe limite de board e não cria canvas/foto novo.                                                                  |
| Casas tocáveis        | [Zone](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/zone/Zone.js) e [InputPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js)                             | Cada célula recebe Zone retangular não renderizada, do tamanho visual de toque, com setInteractive. input.topOnly permanece verdadeiro; fotografia, guirlanda e galeria não recebem input.                                                                                                                 |
| Pressão e confirmação | [Input events](https://github.com/phaserjs/phaser/tree/v4.2.1/src/input/events) e skill oficial de [input](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/input-keyboard-mouse-touch/SKILL.md)    | O objeto pode receber `pointerdown`/`pointerup`; a Scene também recebe `POINTER_MOVE`, `POINTER_UP` e `POINTER_UP_OUTSIDE`. R3-B registra a pressão no down e valida no up o mesmo `Pointer.id`, Zone e epoch; o teste em 390 × 844 confirmou toque único, arrasto cancelado e reflow sem erro de console. |
| Fotos repetidas       | [Image](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/image/Image.js) e [Size component](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/components/Size.js)             | Usar Image para elementos estáticos e a mesma texture key para dock, células e hero. setDisplaySize controla geometria visual; PhotoSurface calcula contain e passe-partout, sem crop obrigatório.                                                                                                         |
| VFX finito            | [ParticleEmitter](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js)                                                                                           | this.add.particles cria um emitter/Game Object com pool. Para sparkle, criar uma vez, iniciar sem fluxo e disparar explode(count, x, y); limitar partículas e destruir/limpar no SceneScope.                                                                                                               |
| Áudio                 | [BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js)                                                                                                         | this.sound é manager do jogo e pauseAll/resumeAll atuam em todos os sons ativos. TicTacToeAudioDirector mantém apenas handles próprios e pausa/retoma/destrói esses handles; ele não chama métodos globais.                                                                                                |
| Unlock mobile         | [BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js) e skill de áudio vendorizada                                                                            | Phaser libera áudio após gesto e emite UNLOCKED. O primeiro gesto pode tentar som, mas toque/feedback visual não espera unlock.                                                                                                                                                                            |
| Falha de asset        | [LoaderPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js) e [FILE_LOAD_ERROR](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/events/FILE_LOAD_ERROR_EVENT.js) | Configurar retry antes de enfileirar. Falha de A.card é erro seguro da run; falha de B.card mantém o picker e permite outra escolha; thumb decorativa falha silenciosamente e é omitida. Nenhuma mensagem carrega URL ou dado de sessão.                                                                   |
| Lifecycle             | [Game.destroy](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Game.js) e [SHUTDOWN](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scene/events/SHUTDOWN_EVENT.js)                          | Controller só encerra após Core.Events.DESTROY. SceneScope remove handles no shutdown; callbacks de tween/timer são protegidos por presentation epoch.                                                                                                                                                     |

## Checagem dos tipos instalados

A declaração instalada v4.2.1 confirma `setInteractive`, `Zone`,
`GAMEOBJECT_POINTER_DOWN`, `GAMEOBJECT_POINTER_MOVE`, `GAMEOBJECT_POINTER_UP`,
`POINTER_UP_OUTSIDE`, `Pointer.id`, `Pointer.pointerId`, `setDisplaySize`,
`ParticleEmitter.explode`, `Scale.RESIZE`, `Scale.Events.RESIZE`, SoundManager
`pauseAll/resumeAll` e os contratos de GameObject correspondentes. As
assinaturas serão rechecadas junto do código concreto, pois esta nota não fixa
valores de configuração que só pertencem ao vertical slice.

## Limites

1. Não foi localizado um arquivo de exemplos estável, já fixado em 4.2.1, para
   cada caso. O repositório oficial de exemplos segue a versão de
   desenvolvimento por padrão. Em T3, escolher exemplo oficial compatível como
   segunda confirmação, nunca portar exemplo Phaser 3.
2. Esta validação não aprova arte, áudio, bytes, licença, filtros ou orçamento;
   esses itens continuam sob ART_BIBLE, o manifesto e a evidência mobile.
3. Zone, Image, emitter e SoundManager só descrevem mecanismo. A fonte de
   verdade de turno, vitória e placar continua no domínio TypeScript puro.
