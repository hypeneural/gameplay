# Validação técnica — experiência nativa do Puzzle Swap

**Data:** 2026-08-24

## Decisões verificadas

| Tema                       | Fonte oficial                                                                                                                                                                                                     | Decisão aplicada                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ícones SVG no Phaser 4.2.1 | [Loader SVG na tag 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/filetypes/SVGFile.js) e [assinatura do carregador](https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js) | Os cinco ícones são enfileirados em `preload()`, rasterizados em 96 × 96 e usados como texturas de `Image`. Cada chave é única e é liberada por `SceneScope` no encerramento.        |
| Foto proporcional          | [Types instalados do Phaser 4.2.1](../../apps/play/node_modules/phaser/types/phaser.d.ts) e `GridPlanner.ts`                                                                                                      | `setDisplaySize` define a geometria proporcional. A animação não pode chamar `setScale(1)` em foto ou peça, porque isso restabelece a textura nativa e ignora a geometria calculada. |
| Fundo otimizado            | [Sharp — redimensionamento](https://sharp.pixelplumbing.com/api-resize/)                                                                                                                                          | O WebP foi preparado com limite de 1024 × 1536, `fit: inside` e `withoutEnlargement`; a arte é coberta proporcionalmente no canvas, sem esticamento.                                 |
| Áudio                      | [Phaser 4.2.1 — BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js)                                                                                                   | Os arquivos autorizados continuam em dois formatos, começam somente após gesto e a música retida é encerrada no desligamento da cena.                                                |

## Resultado da revisão em aparelho virtual

- Tela: 390 × 844.
- Fotos: derivados privados locais, sem original exposto.
- Fluxo conferido: galeria → capa → entrada do quebra-cabeça.
- Resultado: a grade de 4 × 3 da foto horizontal preservou a proporção, o cenário apareceu acima e abaixo, os ícones renderizaram e não houve aviso nem erro de console.

## Limite desta rodada

Não foi incluído ativo visual de terceiros. Qualquer pacote futuro deve ser
registrado antes do uso em `ASSET_PROVENANCE.md`, com licença, versão, origem,
tamanho processado e destino de uso.
