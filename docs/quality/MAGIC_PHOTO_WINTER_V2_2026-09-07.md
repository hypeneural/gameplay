# Magic Photo — revisão de presente, gelo e inverno

Pedido do proprietário: presente realista e bonito na abertura, foto muito mais
congelada e ambiente frio, nevado e interativo. Revisão da direção visual autorizada
em 2026-09-07; regras de três toques, laço, cinco descobertas e raspagem mantidas.

## Implementação

- Capa e partida usam o mesmo presente raster rubi/cetim, com alpha real. A
  capa abre ao tocar no presente e mantém a foto ao lado, sem cobrir seu centro.
- GiftController usa duas regiões da mesma textura para separar tampa e base,
  resposta de mola amortecida, luz interna, antecipação e abertura finita.
- IceController compõe cristais naturais densos com 93% de opacidade e reflexo
  sobre a foto intacta. Pincel e grade preservam raspagem após resize.
- WinterEnvironment compõe floresta nevada, neve no topo e névoa. Campo de
  neve: 58/86 flocos fixos, redraw a 30 fps, parallax de velocidade/tamanho.
  Flocos próximos ficam nas margens; os demais passam atrás da foto.
- Neve nas bordas responde ao toque com pool de 40 partículas e cooldown de
  480 ms. Pausa suspende partículas, relógio, áudio e gestos. LOW/reduzido
  mantém materiais, retira neve ambiente animada e reduz a resposta ao toque.
- Quatro WebP: 404.948 bytes. Runtime total 1.173.282 / 1.300.000 bytes;
  publicação 1.857.219 / 2.200.000 bytes. Hashes, origem e receitas auditados.

## Revisão visual e correções

Capturas privadas em `test-results-magic-winter-*`, com derivadas locais de
FotosTest; nenhuma captura ou fotografia de cliente versionada.

| Estado          | Viewport | Achado e decisão                                                                                                                     | Dono                  |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Capa            | 390×844  | Presente material com laço e neve legíveis; foto ao lado; primeira ação no viewport                                                  | GameCover/GamePreview |
| Entrada         | 390×844  | Mesmo material da capa, sombra difusa, fundo com profundidade                                                                        | GiftController        |
| Gelo            | 394×838  | Foto de fato coberta por cristais, sem modificar a textura original                                                                  | IceController         |
| Neve na moldura | 394×838  | P2: faixa achatada; corrigida altura proporcional da cornija                                                                         | IceController         |
| Base do cenário | 390×844  | P2: crop invertido mostrava corte duro; removido, preservando chão nevado do cenário                                                 | WinterEnvironment     |
| Teste de hero   | 394×838  | Capturas DPR3 e sequências de input podiam perder estado transitório; capturas em CSS px e observação concorrente do label semântico | E2E                   |

## Validação

`pnpm check:fast`: 63 arquivos / 298 testes passaram na primeira integração.
Auditoria de assets passou. Teste de capa confirma toque na neve, abertura pelo
presente, CTA visível, ausência de scroll horizontal e descarte do canvas.
Passagem final: 308 testes unitários, arquitetura, dependências, formatação,
mapa e build aprovados. Fluxo completo revisado em 390/412/430/768 px, com
gelo denso, raspagem, foto limpa, pausa e replay. Detalhes da matriz e da
reexecução dos cenários lentos estão no [relatório de HUD](MAGIC_PHOTO_HUD_2026-09-08.md).
Essa reexecução passou: cinco testes, incluindo dez replays LOW e paisagem nos
quatro tamanhos. Não há falha funcional aberta nesta revisão.

Não foi realizada escuta física de mixagem nem medição em Safari/telefone
real. As fontes de áudio catalogadas e seus fallbacks de foley/voz continuam
documentados; esta revisão substitui arte e melhora movimento/ambiente.
