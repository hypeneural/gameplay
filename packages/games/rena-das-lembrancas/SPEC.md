# Rudolph — Chuva de Lembranças

**Estado:** ciclo R1–R6 integrado em desenvolvimento; revisão mobile e homologação R7/R8 em andamento.

Contrato completo: [produto e experiência](../../../docs/product/RUDOLPH_CHUVA_DE_LEMBRANCAS.md).
Execução: [plano canônico](../../../docs/exec-plans/CG-RUDOLPH-CHUVA-DE-LEMBRANCAS.md).

## Regras vigentes

- Selecionar 3–8 ids únicos autorizados, com a fotografia escolhida primeiro.
- Toque define destino horizontal; arraste atualiza; aceleração e frenagem limitadas.
- Domínio puro com random injetado, passos fixos no adaptador e colisão varrida.
- Fotos repetidas contam resgates e carga da magia, sem duplicar o álbum.
- Priorizar fotos faltantes; reoferecer as que escapam; nunca retirar uma página salva.
- Três resgates habilitam uma ativação de magia de três segundos de simulação.
- Completar somente ao salvar todas as fotos únicas; drenar apresentações e emitir
  GAME_COMPLETED uma vez. Sem cronômetro de derrota ou pontuação competitiva.
- Domínio não conhece Photo, Phaser, React, DOM, URLs ou relógio real.

## Implementação atual

- Rudolph em sprites raster do mesmo modelo, articulados por pivôs fixos;
  fundos próprios de vila nevada em retrato/paisagem e Papai Noel no trenó.
- Lembrança dourada da âncora uma vez, ao atingir metade do álbum, sem página
  extra. A faixa de entrega fica livre e a queda começa alinhada com Rudolph.
- Molduras materiais do projeto, em três tamanhos e proporção nativa, sem importar
  outro jogo; PhotoSurface contain conserva retrato/paisagem/quadrado.
- Uma ou duas fotos simultâneas conforme a altura do campo. A fila de destaque
  preserva cada resgate e aplica limite de concorrência.
- Fotos card da rodada, game da âncora e carregamento sob demanda no visor.
  Cache de game conserva âncora e foto consultada; nunca carrega toda a sessão.
- Álbum em memória com anterior/próxima e foto ampliada. Abrir durante a rodada
  suspende a simulação; fechar não desfaz pausa manual.
- Controles cristalinos, miniaturas de páginas, nariz tocável, magia, neve/luzes
  com resposta finita, mudo por sessão e replay. Capa com foto e o mesmo Rudolph.
- Trilha original de celesta e cues de neve, sinos, papel e magia; toque,
  resgate e assinatura final autorizados do projeto. Uma música e um efeito
  principal, com prioridade e redução da música durante efeitos.
- Catálogo e rota de Rudolph disponíveis somente em desenvolvimento, até homologação.

## Critérios desta fatia

| ID        | Critério                                            | Prova                |
| --------- | --------------------------------------------------- | -------------------- |
| RUD-01–05 | Seleção, repetição, miss, idempotência e conclusão  | RudolphRound.test.ts |
| RUD-06    | Toque guia sem teleportar; controle consome o gesto | E2E e canvas real    |
| RUD-07–08 | Moldura proporcional, destaque e fila limitada      | Capturas privadas    |
| RUD-09    | Carga única e tempo ativo da magia                  | Domínio e E2E        |
| RUD-11/14 | Álbum, pausa, retorno e replay                      | E2E mobile           |
| RUD-17    | Assets autorizados e orçamento                      | Auditoria do owner   |
| RUD-18/19 | Resize e descarte em repetidas entradas             | E2E mobile           |

A matriz completa RUD-01–20 e os gates ainda abertos continuam no plano.
Reduzido remove animação ornamental, preservando a queda e o deslocamento
inerentes à brincadeira. Medição e escuta em telefone físico continuam pendentes.
