# Validação técnica — experiência nativa do Puzzle Swap

**Data:** 2026-08-24

## Decisões verificadas

| Tema                       | Fonte oficial                                                                                                                                                                                                                          | Decisão aplicada                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ícones SVG no Phaser 4.2.1 | [Loader SVG na tag 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/filetypes/SVGFile.js) e [assinatura do carregador](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js)                      | Os cinco ícones são enfileirados em `preload()`, rasterizados em 96 × 96 e usados como texturas de `Image`. Cada chave é única e é liberada por `SceneScope` no encerramento.                                                       |
| Foto proporcional          | [Types instalados do Phaser 4.2.1](../../apps/play/node_modules/phaser/types/phaser.d.ts) e `GridPlanner.ts`                                                                                                                           | `setDisplaySize` define a geometria proporcional. A animação não pode chamar `setScale(1)` em foto ou peça, porque isso restabelece a textura nativa e ignora a geometria calculada.                                                |
| Fundo otimizado            | [Sharp — redimensionamento](https://sharp.pixelplumbing.com/api-resize/)                                                                                                                                                               | O WebP foi preparado com limite de 1024 × 1536, `fit: inside` e `withoutEnlargement`; a arte é coberta proporcionalmente no canvas, sem esticamento.                                                                                |
| Áudio                      | [Phaser 4.2.1 — BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js)                                                                                                                        | Os arquivos autorizados continuam em dois formatos, começam somente após gesto e a música retida é encerrada no desligamento da cena.                                                                                               |
| Neve por partículas        | [ParticleEmitter na tag 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js), [InputPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js) e tipos instalados | Um `ParticleEmitter` com textura SVG própria, máximo de 18 partículas vivas e pool de 20 usa zona de emissão limitada ao topo do canvas. A zona muda de largura no redimensionamento; LOW e movimento reduzido não criam o emissor. |
| Arraste e dica             | [InputPlugin na tag 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js), [TweenManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/tweens/TweenManager.js) e tipos instalados                      | O limiar de arraste existente inicia brilho e som uma única vez. `findPuzzleHintSwap` puro encontra a casa incorreta e a peça que ela precisa; a cena só ilumina as duas, nunca faz a troca.                                        |

## Resultado da revisão em aparelho virtual

- Tela: 390 × 844.
- Fotos: derivados privados locais, sem original exposto.
- Fluxo a conferir nesta rodada: galeria → seleção pulsante → capa com a foto
  real → entrada com neve → arraste, dica de duas peças, pausa, som e saída.
- Critérios: a grade preserva a proporção; a capa requisita somente o derivado
  `card`; o canvas requisita somente o derivado `game`; nenhuma orientação,
  nome de cliente ou caminho de disco fica visível.

## Limite desta rodada

Não foi incluído ativo visual de terceiros. Qualquer pacote futuro deve ser
registrado antes do uso em `ASSET_PROVENANCE.md`, com licença, versão, origem,
tamanho processado e destino de uso.
