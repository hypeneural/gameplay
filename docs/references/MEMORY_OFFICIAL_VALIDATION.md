# Validação oficial — runtime do Memory

**Data:** 2026-08-24
**Escopo:** decisões técnicas da M0 para `CG-MEMORY-IMPLEMENTATION`. A tag
de referência é `phaserjs/phaser@v4.2.1`, igual à versão instalada em
`apps/play`.

Esta nota fixa as decisões que precisam de fonte primária antes de escrever a
Scene. Ela não libera M1–M7: os gates E2.5 e E3–E7 continuam sendo a
pré-condição de execução do plano.

| Tema verificado                  | Fonte oficial                                                                                                                                                                                                                                  | Decisão aplicada ao Memory                                                                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Destruição do jogo               | [Game.destroy — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Game.js) e [Core DESTROY event](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/events/DESTROY_EVENT.js)                                           | `Game.destroy()` conclui de modo assíncrono, no frame seguinte. O controlador de lifecycle só considera a saída terminada após `Phaser.Core.Events.DESTROY`; nenhuma rota cria outra instância antes disso.                                          |
| Encerramento de Scene            | [Scene SHUTDOWN event — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scene/events/SHUTDOWN_EVENT.js)                                                                                                                         | `SHUTDOWN` é o ponto para liberar recursos de uma execução que pode voltar a ficar ativa. `SceneScope` possui listeners, tweens, timers, áudio, emissores e texturas que a Scene criou; o dono remove cada recurso global somente uma vez.           |
| Resize e custo de canvas         | [ScaleManager — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js)                                                                                                                                          | O modo `RESIZE` redimensiona o canvas 1:1 e a própria fonte alerta para o risco de fill-rate. O board não recria cartas nem troca o deck: ao evento de resize reposiciona os objetos existentes dentro das dimensões e limites definidos pelo shell. |
| Falha, timeout e retry de assets | [LoaderPlugin — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js) e [FILE_LOAD_ERROR — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/events/FILE_LOAD_ERROR_EVENT.js)             | Timeout e `maxRetries` são configurados antes de enfileirar arquivos. A rodada só enfileira a variante já escolhida; erro após a tentativa limitada chega à bridge como falha segura, sem substituir foto ou iniciar um tabuleiro parcial.           |
| Tween cancelado, pausa e saída   | [Tween — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/tweens/Tween.js) e [Tween events](https://github.com/phaserjs/phaser/tree/v4.2.1/src/tweens/events)                                                                    | A apresentação nunca usa o fim visual como verdade de domínio. O `MemoryInteractionArbiter` só avança transições ainda correntes; `SceneScope` para ou descarta tweens ao pausar/sair, impedindo callback tardio de abrir, fechar ou pontuar carta.  |
| Áudio e gesto do usuário         | [BaseSoundManager — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js) e [UNLOCKED event](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/events/UNLOCKED_EVENT.js)                            | O primeiro toque aceito pode solicitar o áudio pela API do Phaser; não há chamada manual a `AudioContext.resume()`. Música e efeitos não bloqueiam o flip e seus listeners pertencem ao scope da Scene.                                              |
| Partículas de match e vitória    | [ParticleEmitter — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js) e [skill oficial particles — tag v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/particles/SKILL.md) | Um burst usa `explode`/frequência finita e pools pré-criados com teto de partículas. Match, dica e vitória não instanciam emissores por evento, nem deixam emissão contínua em background.                                                           |

## Checagem local da tag

Os tipos instalados em `apps/play/node_modules/phaser/types/phaser.d.ts`
confirmam, na versão 4.2.1, as mesmas superfícies: `Game.destroy`, o evento
`SHUTDOWN`, `Scale.Events.RESIZE`, `LoaderPlugin.maxRetries`,
`Loader.Events.FILE_LOAD_ERROR`, `Sound.Events.UNLOCKED` e
`ParticleEmitter.explode`.

## Limites

1. O exemplo oficial 4.2.1 é selecionado somente quando a feature concreta
   entrar em M5; não serão usados exemplos Phaser 3 ou RC como implementação.
2. Esta validação não autoriza `Lighting`, filtros por carta ou blur por frame.
   A restrição MEM-022 continua uma decisão de orçamento e revisão de runtime.
3. Privacidade, seleção de variantes, proveniência e orçamento de fotos são
   governados pelos contratos do repositório, não pela API do Phaser.
