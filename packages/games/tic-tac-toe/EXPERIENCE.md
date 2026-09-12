# Trinca de Natal — experiência natalina

Este contrato guia a apresentação; regras, placar e IA permanecem em
`domain/`. Antes de integrar mídia, consultar a Bíblia de experiência natalina
e registrar cada arquivo aprovado no manifesto de assets.

## Fantasia e primeira ação

No mural da Oficina do Noel, a foto já escolhida vira a primeira peça da
família. A capa a mostra proporcional, traz “Faça 3 fotos em linha!” e oferece
uma decisão de cada vez: Papai Noel ou Duelo de Fotos. A foto é a heroína;
madeira, dourado, luzes e o cameo de Noel apenas a enquadram.

### Decisão visual R3-C.2

O jogo é um mural fotográfico 2.5D em quatro planos: oficina discreta ao
fundo, madeira/luz natalina de apoio, mural e fotos como plano principal, e no
máximo dois props silenciosos nos cantos. Referências visuais inspiram
materialidade e hierarquia, mas não são copiadas como composição, personagem
ou asset. Em 390 px, foto/ação vence o tabuleiro, que vence turno e cenário.

A foto A aparece em um porta-retrato na escolha de modo. O picker mostra A e
até seis thumbnails reais B por página; durante a partida A/B reutilizam suas
texturas `card` nos docks e nas peças; o resultado final reutiliza a vencedora
como hero. Fotos da sessão nunca são fundo, textura, filtro, texto, dado de
telemetria ou arte gerada.

## Resposta da brincadeira

| Momento               | Visual                                              | Som / haptic                            | LOW e movimento reduzido    |
| --------------------- | --------------------------------------------------- | --------------------------------------- | --------------------------- |
| Escolher modo ou foto | borda dourada e pressão curta                       | toque suave; haptic leve opcional       | borda e contraste estáticos |
| Célula livre          | pressão no down; cartão sai do dock no up e encaixa | toque e encaixe curtos                  | fade e escala breve         |
| Célula ocupada        | realce neutro, sem vermelho                         | toque discreto, sem haptic negativo     | mesmo realce estático       |
| Turno do Noel         | dock troca e três luzes orientam                    | duas notas discretas                    | estados estáticos           |
| Trinca                | guirlanda acende nos três frames                    | celebração curta; haptic forte opcional | guirlanda em 2–3 estados    |
| Empate                | onda breve pelas molduras                           | resolução acolhedora                    | contraste estático          |

Cada célula terá Zone retangular explícita de no mínimo 52 CSS px. Não há drag,
hit testing pixel-perfect, tutorial modal ou linguagem técnica. O down inicia
apenas a pressão; o up do mesmo pointer, ainda na célula e no mesmo epoch,
confirma a intenção. A ação visual não espera áudio; o primeiro gesto apenas
tenta liberá-lo.

Casa livre é encaixe de álbum marfim com relevo sutil, não carta virada e nem
bloco branco. A peça aceita é uma PhotoCard frontal com passe-partout, sombra
de contato e identidade na moldura (estrela ou sino), nunca aplicada sobre os
pixels da foto. O dock inativo escurece a própria superfície, mantendo a
miniatura com cor natural.

No setup, `← Voltar` retorna à decisão anterior sem criar uma partida. Durante
o tabuleiro, somente `Pausar` permanece no topo; o painel de pausa oferece
`Voltar ao início` com confirmação curta antes de encerrar o match. `Sair do
jogo` e `Compartilhar` continuam ações do shell e não são duplicados.

## Critérios de revisão

- Foto, ação e tabuleiro são lidos nessa ordem em 390, 412, 430 e 768 CSS px.
- Foto A/B nunca é filtrada, distorcida ou usada como decoração de fundo.
- A dica orienta a próxima decisão sem jogar pela pessoa.
- Vitória devolve o foco à foto vencedora e oferece repetir a brincadeira.
- Saída remove canvas, sons, timers, tweens, emitters e texturas da partida.
- LOW e movimento reduzido removem props, trilhas e partículas decorativas,
  preservando estado de seleção, guirlanda estática, leitura e confirmação.
