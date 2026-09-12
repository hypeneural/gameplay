# Assets — A Magia da Minha Foto de Natal

Estado v2: quatro assets raster originais, pincéis/partículas em código e oito
fontes sonoras locais catalogadas (16 arquivos MP3/M4A). Hashes, dimensões,
bytes e licenças em `assets/manifest.json`; origem em `ASSET_PROVENANCE.md`.

## Visuais integrados

| Arquivo              | Função                                        | Entrega                       |
| -------------------- | --------------------------------------------- | ----------------------------- |
| gift-real-v2.webp    | capa, corpo e tampa animada do presente       | 640×640, alpha, 125.830 bytes |
| frost-real-v2.webp   | gelo denso apagado pelo dedo                  | 640×640, 113.262 bytes        |
| snow-edge-v2.webp    | neve acumulada e pingentes no cenário/moldura | 1000×333, alpha, 92.508 bytes |
| winter-night-v2.webp | cenário de floresta nevada                    | 768×1152, 73.348 bytes        |

Todos mantidos em LOW e movimento reduzido; são materiais estáticos essenciais.
O ambiente animado limita flocos a 58 (NORMAL) / 86 (HIGH), redesenho a 30 fps,
sem campo animado em LOW/reduzido. Neve ao toque tem pool de 40 e cooldown 480 ms.
O total visual é 404.948 bytes e cabe no orçamento original de runtime de 1,3 MB.
Glow, névoa, sombra, pincel e partículas são texturas pequenas originais em Canvas.
Mão e gorro seguem em código; a textura original da foto não recebe filtros.

## Áudio solicitado e fallback vigente

Formato final de cada cue: M4A/AAC + MP3; sem transparência (não aplicável).
Música e ribbon_pull_loop são os únicos loops previstos. Nesta versão o laço
usa acentos finitos e a música usa um arquivo legado autorizado. Demais cues
nunca fazem loop. Durações abaixo são recomendações para substituições; valores
reais das fontes copiadas estão no JSON.

| Assets finais                                                  | Duração recomendada | Uso                     | Fallback atual / arquivo                               |
| -------------------------------------------------------------- | ------------------- | ----------------------- | ------------------------------------------------------ |
| christmas_magic_loop                                           | 30–60 s, loop       | ambiente pós-gesto      | music.*, loop local 44.307 s                           |
| gift_tap_01, gift_tap_02, gift_thump                           | 0.15–0.4 s          | três níveis da caixa    | tap._, paper._, bells.*                                |
| sparkle_01, tiny_sparkle                                       | 0.2–0.5 s           | toque e brinquedo livre | magic.*                                                |
| ribbon_pull_loop                                               | 0.8–1.5 s, loop     | tensão do tecido        | paper.* finito nos marcos, sem loop contínuo           |
| ribbon_release, gift_open                                      | 0.3–1 s             | soltar e abrir caixa    | open.*                                                 |
| magic_rise_short, magic_riser, magic_riser_final, magic_burst  | 0.5–1.2 s           | antecipação/abertura    | paper._, open._, reveal.*, mix por intenção            |
| photo_whoosh, photo_reveal_chime                               | 0.5–1.2 s           | foto sai da caixa       | reveal.*                                               |
| magic_touch_01, magic_touch_02, magic_touch_03                 | 0.1–0.3 s           | varinha                 | magic.* com três velocidades, cooldown 140 ms          |
| star_found, magic_found_01                                     | 0.3–0.7 s           | estrela descoberta      | magic.*                                                |
| snow_whoosh, bell_soft                                         | 0.3–0.8 s           | neve descoberta         | snow.*                                                 |
| bell_magic, bell_cluster, christmas_lights_on                  | 0.3–1 s             | pisca e caixa pronta    | bells.*                                                |
| magic_complete_riser                                           | 0.6–1.2 s           | quinto ponto            | reveal.*                                               |
| santa_hoho_01, santa_hoho_02, santa_hoho_03, santa_hoho_random | 0.8–1.6 s           | quarto ponto/easter egg | **voz pendente**; gorro visível + bells.* grave        |
| frost_appear                                                   | 0.5–1.2 s           | gelo chega              | snow.*                                                 |
| ice_scrape_01, ice_scrape_02, ice_scrape_03                    | 0.12–0.3 s          | dedo apaga              | **foley dedicado pendente**; paper.*, cooldown 180 ms  |
| ice_crack_01, ice_crack_02, ice_crack_final                    | 0.2–0.6 s           | marcos do gelo          | **foley dedicado pendente**; open.* em mixes distintos |
| ice_break_big                                                  | 0.6–1 s             | quebra                  | **foley dedicado pendente**; open.* grave + ducking    |
| finale_star_whoosh, finale_chime                               | 0.5–1.5 s           | final natalino          | reveal.* com prioridade máxima                         |

O gerente tem um efeito principal por vez, sem fila tardia ao desbloquear áudio,
master ligado/desligado, música baixa e ducking suave. Voz futura pode ser
inserida no cue santa; por enquanto não há locução sintetizada nem gravação nova.
