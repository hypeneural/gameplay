# Mapa de estados e eventos

`MagicPhotoStateMachine` é a única dona do avanço. Todo enter emite STATE_EXITED
e STATE_ENTERED; comandos repetidos são ignorados. Update recebe delta explícito.
O runtime suspende update, áudio e apresentação quando manualPaused ou
visibilityPaused. Não há cronômetro visível nem limite para concluir.

| Estado           | Entrada                                  | Saída / condição                                  | Timer ativo                   | Efeitos                                                                                 |
| ---------------- | ---------------------------------------- | ------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| PRELOAD          | criação da rodada                        | ready após foto essencial                         | nenhum                        | erro seguro bloqueia entrada se foto falhar                                             |
| INTRO            | ready                                    | GIFT_IDLE; primeiro toque pode antecipar          | 1200 ms                       | presente aparece, fundo quente, sem áudio até gesto                                     |
| GIFT_IDLE        | intro termina                            | primeiro toque → GIFT_TOUCH_1                     | espera livre                  | respiração, mão contextual                                                              |
| GIFT_TOUCH_1     | primeiro toque                           | segundo toque → GIFT_TOUCH_2                      | feedback 250 ms, não bloqueia | compressão, brilho, tap, haptic                                                         |
| GIFT_TOUCH_2     | segundo toque                            | terceiro toque → GIFT_READY                       | feedback 250 ms               | shake, mais faíscas, paper                                                              |
| GIFT_READY       | terceiro toque / arraste curto cancelado | toque no laço → RIBBON_DRAG                       | livre                         | laço/pista, sino, salto curto                                                           |
| RIBBON_DRAG      | pointer capturado                        | ≥70% abre; soltar ≥45% abre; menor/cancel retorna | gesto                         | laço sobe, tensão, glow; marcos 35/70% únicos                                           |
| GIFT_OPENING     | laço completo                            | PHOTO_REVEAL                                      | 1150 ms                       | fitas soltam, tampa voa, burst aos 620 ms                                               |
| PHOTO_REVEAL     | caixa aberta                             | MAGIC_INTRO                                       | 1900 ms                       | entrada 850 ms + 1050 ms de foto limpa                                                  |
| MAGIC_INTRO      | foto reconhecível                        | MAGIC_HUNT                                        | 1400 ms                       | mão mostra o dedo-varinha                                                               |
| MAGIC_HUNT       | fim da dica                              | quinta descoberta → MAGIC_COMPLETE                | sem limite                    | trail por distância, cinco eventos únicos, hints 1.5/3/5/8/11 s                         |
| MAGIC_COMPLETE   | cinco descobertas                        | FROST_TRANSITION                                  | 900 ms                        | ring, cinco estrelas, assinatura curta                                                  |
| FROST_TRANSITION | varinha concluída                        | ICE_INTERACTION                                   | 1100 ms                       | gelo translúcido entra em 900 ms                                                        |
| ICE_INTERACTION  | gelo pronto                              | ≥25% → ICE_CRACK_1                                | livre                         | scratch interpolado, grade lógica, poeira e scrape                                      |
| ICE_CRACK_1      | ≥25%                                     | ≥45% → ICE_CRACK_2                                | livre                         | rachadura periférica, crack, haptic médio                                               |
| ICE_CRACK_2      | ≥45%                                     | ≥68% → ICE_BREAK                                  | livre                         | mais rachaduras e confirmação sonora                                                    |
| ICE_BREAK        | threshold alcançado                      | FINALE                                            | 1150 ms                       | bloqueia scratch; aos 450 ms fragmentos e queda do frost                                |
| FINALE           | gelo removido                            | PHOTO_HERO                                        | 1500 ms                       | estrela diagonal atrás da foto, sinos, luz nas bordas                                   |
| PHOTO_HERO       | final termina                            | FREE_PLAY                                         | 3000 ms                       | foto limpa, sem instrução/progresso/som/pausa visíveis                                  |
| FREE_PLAY        | contemplação cumprida                    | COMPLETE na saída                                 | sem limite                    | GAME_COMPLETED único, toque/varinha, gorro a cada cinco toques rápidos, replay/catálogo |
| COMPLETE         | saída após FREE_PLAY                     | terminal                                          | nenhum                        | cleanup; replay cria rodada inteiramente nova                                           |

## Entradas e limites

- Uma única identidade de pointer por gesto; segundo dedo não toma controle.
- Pointer cancel, saída do canvas, resize e pausa liberam o arraste, sem abrir
  presente indevidamente. Laço tem alvo maior que o desenho. Toque no laço e na
  estrela acima oferece a alternativa a arrastar.
- Hunt testa distância ao segmento, portanto varredura rápida não pula pontos.
- IceGrid usa células e distância física na proporção da foto, não pixels de GPU.
  RenderTexture interpola a cada 9 unidades lógicas e chama render explicitamente.
- Resize reposiciona/displaySize e mantém framebuffer. Context restore reconstrói
  da grade normalizada. Nada depende de coordenada absoluta persistida.
- Fotografia é read-only e fica independente da camada de gelo e efeitos.

## Eventos, ponte e medição

MagicEventBus distribui STATE_ENTERED/EXITED, MAGIC_POINT_FOUND, RIBBON_PROGRESS
e ICE_PROGRESS para apresentação. Nenhuma URL/foto/pessoa integra os eventos.
GameRun mantém GAME_OPENED, READY, STARTED (primeiro toque), PAUSED/RESUMED,
INTERACTION_SETTLED, SOUND_CHANGED, COMPLETED e EXITED.

`GameRun.milestone` registra estados e magic-point-1…5 com elapsedMs, uma vez
por nome, máximo 64, apenas analytics; não muda o último estado da ponte React.
Diferenças entre tempos de GIFT_TOUCH_1, PHOTO_REVEAL, MAGIC_HUNT,
MAGIC_COMPLETE, ICE_INTERACTION, ICE_BREAK e PHOTO_HERO fornecem duração de
espera inicial, presente, caça, gelo e finale. A implementação atual da aplicação
guarda analytics em memória; ingestão persistente continua responsabilidade do VPS.
Replay usa a ação de shell que encerra run, libera canvas/texturas/áudio e cria
outro run com seed próprio, preservando foto e preferências, sem reload.
