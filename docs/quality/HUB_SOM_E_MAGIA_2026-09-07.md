# Hub e aberturas — som, neve e luzes interativas

**Data:** 2026-09-07. **Dono:** `apps/play` e preparação offline em `tools/asset-factory`.
**Escopo:** segunda fatia local do [plano do Hub](../exec-plans/CG-HUB-E-ABERTURAS-NATALINAS.md),
conforme a [decisão de experiência](../product/HUB_SOM_E_MAGIA_2026-09-07.md).

## Implementação

O globo “Fazer nevar” produz uma rajada com inércia e desaceleração. O sino
no cordão responde ao toque e dispara uma onda de luz do centro para as pontas.
As lâmpadas combinam soquete, filamento, vidro com reflexo e halos vermelhos,
azuis, verdes e âmbar, com piscadas suaves e fases distintas. O fio conserva
extremidades presas e uma curvatura variável; lâmpadas e sino acompanham o
mesmo arco. Um pêndulo amortecido controla o sino, com vento lento, batida
por toque e movimento próprio do badalo.

O ambiente usa 48 flocos visíveis em três profundidades, velocidade terminal,
deriva e turbulência. “Fazer nevar” ativa até 132 flocos: cresce rapidamente,
mantém a nevada e dissipa a quantidade extra ao fim de seis segundos. O pool
de 132 nós é reservado uma vez; toques substituem impulso e duração sem
aumentar esse limite. Não há canvas ou Phaser nessa decoração.

O loop atualiza transforms, opacidade e a curva SVG fora do render React. Galeria aberta, aba
oculta e região fora da tela cancelam os frames e pausam as luzes; retornar não
simula todo o tempo ausente. LOW/modo calmo não montam flocos. Movimento reduzido
do sistema oculta a neve e cancela o loop; preserva 132 nós inativos nesta versão.
Sino/globo mantêm confirmação estática e alternativa sonora nessas condições.

Áudio distingue papel/cartas, abrir, voltar, revelar, sino, neve e começar.
Há doze arquivos sonoros com variações, cada um em MP3 e AAC/M4A. O pool reutiliza
até doze elementos e permite uma voz ativa; mudo cancela a voz e solicitações
tardias. Falha tenta o outro formato uma vez; não bloqueia a interface.
Toques repetidos no sino/globo têm intervalo mínimo. Nenhum áudio é solicitado
antes do primeiro gesto que pede som.

## Assets e verificação técnica do áudio

Foram inventariados 744 arquivos nos cinco packs fornecidos. A entrega usa os
packs Audio/Audio2 identificados como Kenney CC0; os timbres musicais combinam
vidro em alturas e tempos preparados offline. A batida de sino combina um
impacto curto CC0 e parciais metálicas sintetizadas com decaimentos diferentes;
não usa uma sequência de notas de notificação. Christmas/400 permanecem sem
licença documentada no catálogo local; Shapeforms usa licença própria com
proteção contra extração. Nenhum arquivo desses três packs foi integrado.
Originais intactos; sem envio de áudio ou fotos a serviços externos.

- Auditoria do owner `christmas-shell`: 24 arquivos, **166.164 bytes** públicos.
- Mono 44,1 kHz, codificação a 80 kbit/s e fades nas bordas.
- Picos decodificados nos 24 arquivos entre **−6,5 e −5,7 dBFS**; volume do
  runtime entre 0,20 e 0,28. Nenhum clipping de amostra nessa medição.
- Proveniência contém hashes originais/derivados, receitas, bytes e durações.
- Preparação tem limite de amostras, duração, bytes, timeout e conferência do
  WAV intermediário; remove apenas o temporário que criou.

Comando: `pnpm --filter @christmas-games/asset-factory run audit --owner christmas-shell`.
Manifesto e receitas em `apps/play/assets/christmas-shell`. A verificação é
técnica; não houve escuta humana pelo agente. Timbre, conforto e volume em
alto-falante de Android/iPhone permanecem no aceite físico.

## Controles cristalinos — ampliação do pedido

Botões de voltar, som, magia, fotos, setas, compartilhar e começar receberam
superfície de vidro, reflexo, espessura e compressão ao toque. Ícones SVG têm
retorno elástico de 420 ms; o brilho de toque dura 360 ms. O dono cancela a
animação anterior do mesmo elemento, desmontagem, background e modo calmo.
Não há atraso artificial antes de navegar. Folha e troca de fotografia recebem
transições de 200–240 ms; reduzido/calmo as removem.

Novos cues de interruptor e magia ampliam o conjunto inicial de dez para doze.
Escape na galeria e links do estúdio também usam confirmação semântica. Não
há som automático por foco, rolagem ou carregamento da tela.

## Evidência no navegador

Chromium local emulado, derivados autorizados de nove fotos para inspeção
privada; fixtures sintéticas nos testes automatizados. Capturas não versionadas
em `test-results-shell-review/`. Nomes iPhone/iPad do Playwright não provam Safari.

| Viewport   | Início do catálogo | Fim do CTA de Memory | Altura do CTA |
| ---------- | ------------------ | -------------------- | ------------- |
| 360 × 640  | 386 px             | 548 px               | 58 px         |
| 390 × 844  | 397 px             | 745 px               | 58 px         |
| 412 × 915  | 400 px             | 816 px               | 58 px         |
| 430 × 932  | 402 px             | 833 px               | 58 px         |
| 768 × 1024 | 395 px             | 925 px               | 58 px         |

Sem overflow horizontal ou erros JavaScript na amostra. Foto e botão principal
preservados nas capturas; cordão/sino ocupam faixa própria acima do cabeçalho.
Retrato e paisagem foram conferidos; capturas finais aguardam a sessão local,
decode e fim das transições. A foto principal do álbum usa `card` para evitar
ampliar uma miniatura; grade de seleção e cards dos jogos continuam em `thumb`.
LOW apresentou zero flocos/zero animações; reduzido apresentou zero animações.
Em 90 intervalos de rAF por largura, mediana e p95 ficaram em aproximadamente
16,7 ms no computador local. A amostra não mede custo isolado da simulação,
GPU, bateria, rede móvel nem fluidez sustentada em telefone físico.

Os testes focais verificam toque real no sino/globo, ausência de requests antes
de gesto, sons distintos, pausa de posições por oito frames com galeria aberta,
retomada, mudo/reduzido e preservação de preferências entre Hub/capa. Também
cobrem foto lenta/ausente, seleção/foco e CTA em telefone baixo.

## Checks e próximos gates

- Os seis testes focais do shell passaram nos quatro perfis do Playwright:
  **24 casos**, incluindo teclado, cancelamento das animações dos ícones e
  os novos cues de preferência.
- `pnpm check:fast`: tipagem, lint e **270 testes em 60 arquivos** passaram.
- Auditoria de assets passou. Os resultados posteriores do checkout integrado
  estão na [revisão dos seis jogos](JOGOS_MUNDO_NATALINO_REVIEW_2026-09-07.md).

Build da etapa do shell: JS inicial 267,89 kB (gzip 83,39), CSS 59,27 kB
(gzip 13,70). O build posterior está na revisão integrada dos seis jogos.
Phaser permanece em chunk separado de 1.375,61 kB (gzip 357,99); o aviso de
chunk grande continua visível. Medidas incluem o checkout integrado, não
representam custo isolado dos controles.

Na continuação, a preferência de som passou a sincronizar dos seis jogos ao
shell sem remontar o canvas. O desligamento encerra os efeitos do dono ativo;
essa jornada ganhou teste integrado. A mixagem e a troca de contexto de áudio
em aparelhos físicos continuam na homologação. H5–H7 incluem sessão real autorizada no VPS,
aparelhos físicos, acessibilidade e homologação do estúdio. Esta fatia é uma
implementação local revisável; não constitui publicação em produção.
