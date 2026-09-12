# Mosaico em Queda — SPEC de implementação

Este pacote implementa a especificação de produto em
[`docs/product/MOSAICO_EM_QUEDA.md`](../../../docs/product/MOSAICO_EM_QUEDA.md)
e segue o plano canônico em
[`docs/exec-plans/CG-MOSAICO-EM-QUEDA-IMPLEMENTATION.md`](../../../docs/exec-plans/CG-MOSAICO-EM-QUEDA-IMPLEMENTATION.md).

## Escopo de V1

- Grade 8 × 14 visível, quatro linhas de buffer, SRS, saco de sete, ghost,
  lock delay limitado, top-out e replay determinístico.
- `normal` pede quatro linhas; `desafio`, sete. Não há hard drop, hold, giro de
  180°, T-spin, combo, ranking, vida ou pressão de tempo.
- Uma foto basta; o plano pode usar até seis `thumb`, quatro `card` e uma
  `game`, sempre proporcionais e sem afetar o engine.
- O domínio não importa Phaser, React, DOM, URLs, pixels, relógio real ou
  `Math.random`.

## Ordem de evidência

1. Testes de domínio antes do runtime Phaser.
2. Probe técnico de toque, lifecycle, recursos e relógios sem julgar aparência.
3. Só após P4, validação visual/UX mobile em canvas real.

Os critérios MEQ-01 a MEQ-17 são a matriz de aceite oficial e permanecem no
documento de produto para evitar uma cópia divergente neste pacote.
