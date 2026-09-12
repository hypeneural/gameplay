# Rudolph — implementação e revisão de 2026-09-08/09

Estado: jogo integrado para desenvolvimento; homologação física pendente.
Plano: [CG-RUDOLPH](../exec-plans/CG-RUDOLPH-CHUVA-DE-LEMBRANCAS.md).
Owner: `packages/games/rena-das-lembrancas`.

## Entrega

- Fotos molduradas em três tamanhos, direção por toque/arraste com aceleração,
  colisão varrida, repetição que soma magia e álbum com 3–8 fotos únicas.
- Rig raster próprio de Rudolph, vila noturna retrato/paisagem, neve periférica,
  nariz interativo e Papai Noel com uma repetição dourada por rodada.
- Moldura compacta própria v3, miniaturas de páginas, visor parcial/final,
  navegação por botões ou toque na foto, replay e ações do shell.
- Loop original de 16 s e cues locais, uma música + um efeito principal,
  redução de música durante efeitos, mudo e pausa com descarte de sons.
- Registro lazy e capa próprios; Rudolph continua visível apenas em DEV.

## Achados e correções visuais

| Achado                                       | Correção                                       | Escopo        |
| -------------------------------------------- | ---------------------------------------------- | ------------- |
| Instrução inicial sobre a face da rena       | Faixa do polegar com espaço do botão reservado | Retrato       |
| Fundo estreito após girar                    | Fundo próprio panorâmico, escala proporcional  | 844 × 390     |
| Aro pendente consumia área do destaque/álbum | Borda compacta própria v3 e foto inteira       | Queda e álbum |
| Texto raster perdia nitidez                  | Texturas de texto com resolução 2              | HUD e visor   |
| Final girado disputava altura com os botões  | Foto à esquerda, navegação/ações à direita     | Paisagem      |

## Evidências

Arquivos em diretórios privados ignorados pelo Git, com capturas do canvas,
vídeo e métricas sem nomes de fotos nos documentos. Fixtures gráficas e
derivadas locais já preparadas, nunca originais ou envio a providers.

- `pnpm check:fast`: 65 arquivos, 308 testes aprovados; tipos e lint aprovados.
- Auditoria do owner Rudolph: manifesto, arquivos, hashes e budgets aprovados.
- Primeiro E2E 390 px: ciclo de quatro fotos concluído, cinco resgates, magia,
  dourada, pausa/visor/replay e dez entradas/saídas aprovados.
- Derivadas reais: três fotos mistas, quatro resgates, álbum concluído,
  sem erro de página e zero canvas após sair. Capturas inspecionadas: resgate,
  álbum retrato, foto paisagem e final girado com foto à esquerda. A primeira
  captura da capa precedia a carga da imagem; a captura após decode confirmou
  fotografia com 130 × 206 CSS px, sem distorção, e recurso de 571 × 800 px.
- Chromium 151.0.7922.34 em Windows, emulação 390 × 844 a DPR 2, 913 amostras
  de requestAnimationFrame durante teste concorrente: p50 33,3 ms, p95 33,5 ms,
  p99 66,7 ms. Mede o ambiente emulado sob carga; não é latência de toque nem
  evidência de 60 FPS em telefone físico.
- Orçamento v3 auditado em 2026-09-09: 24 arquivos, 710.456 bytes públicos,
  489.415 bytes por execução estática e 255.130 bytes visuais. Fotos e memória decodificada são
  métricas separadas. Fontes locais e preparação não entram no navegador.
- As oito imagens estáticas somam 2.408.608 pixels: 9.634.432 bytes (9,19 MiB)
  em RGBA simples. Essa estimativa não inclui fotos, texto, áudio, mipmaps,
  render targets ou overhead do driver; não é medição de memória GPU.
- Arquitetura: 369 módulos e 723 dependências, sem violações. Deadcode aprovado.
- Segunda rodada E2E nos quatro perfis: 10 casos passaram; dois casos de rodada
  completa (430 px/tablet) expuseram replay involuntário pelo último toque.
  Com proteção de 700 ms no final e gesto de condução no campo, ambos passaram
  na repetição. A suíte da moldura v3 passou em 12/12 casos nos quatro perfis.
  Depois das correções de descarte/cancelamento, rodada completa e dez ciclos
  na mesma página foram novamente aprovados em 390 px. A execução geral atual
  repete essa cobertura nos quatro perfis.
- A execução geral anterior de `pnpm validate` passou por checks e build, mas
  a suíte E2E foi interrompida após timeout em Magic Photo LOW/reduzido no
  perfil iPhone. Não constitui aprovação da suíte geral.

## Revisão de 2026-09-09

A moldura v3 foi inspecionada com derivadas reais: fotografia inteira na queda
e no visor, borda compacta e cantos preservados. Tentativas com alpha defeituoso
ficaram fora do runtime. O PNG de resgate de 2026-09-08 capturou uma queda seguinte;
não serve isoladamente como prova do instante ampliado de resgate.

A última coleta privada disponível registrou 529 amostras, p50 50 ms,
p95 83,3 ms e p99 116,7 ms sob carga concorrente. Os arquivos foram atualizados
entre revisões; resultados anteriores não são um benchmark comparável da nova
moldura. É necessário medir com carga isolada e no aparelho físico.

Uma inspeção CDP do canvas removido revelou oito listeners `touchcancel` do
jogo e um `wheel` do Phaser ainda ligados ao elemento. A fonte Phaser 4.2.1
confirma que `Game.runDestroy` destrói as Scenes diretamente, sem garantir
`SHUTDOWN`, e que `MouseManager.stopListeners` omite o listener `wheel`.
O descarte idempotente agora atende `SHUTDOWN` e `DESTROY`; o adaptador remove
`wheel` e trata cancelamento nativo incancelável sem desativar a captura dos
toques normais. Dez ciclos na mesma página em 390 px confirmaram zero listeners
no canvas removido e fechamento de cada AudioContext do jogo por CDP.

O teste de dois dedos, cancelamento, mudo sem reprodução nova, pausa preservada
após blur/focus e preferência de som ao voltar ao Hub passou em 390, 412, 430
e 768 px (4/4), em `rena-das-lembrancas-input.spec.ts`. Esse caminho usa eventos
de toque do Chromium; a mudança de foco é sintética e não prova suspensão iOS.

O arraste iniciado no nariz passa a conduzir a rena sem gastar magia. O toque
concluído pode ativá-la. Miniaturas abrem o álbum sem definir destino horizontal.
Molduras em queda só refazem a geometria quando seu tamanho muda. A correção
final preparada mantém a derivada `game` da foto principal retida para seu
destaque. As demais fotos usam `card` no destaque, para que navegar pelo álbum
não destrua uma textura ainda usada por uma apresentação suspensa.

O contador de tentativas de carga também precisa ser zerado após sucesso: a
terceira visita depois de expulsar a textura não pode perder resolução. O teste
de regressão preparado percorre as quatro páginas três vezes e exige a foto
ampliada em alta resolução, com no máximo duas texturas `game` carregadas.

A inclusão inicial do cartão Rudolph no começo do Hub deslocou o quebra-cabeça
para fora da primeira tela em 390 px. Rudolph passou ao fim do catálogo DEV;
o teste de descoberta dos jogos e retorno da galeria passou após a correção.

Validação geral reiniciada em 2026-09-09 às 13:22 (America/Sao_Paulo), com
registro durável privado: `.reference/rudolph-validation-status.json`, logs
`rudolph-validation-stdout.log`/`stderr.log` e relatório em
`playwright-report-rudolph-final-validation/`. Até o fechamento deste registro,
o processo está em execução. O perfil 412 px encontrou uma assertion instável
no teste de retomada: `GAME_INTERACTION_SETTLED`, emitido por um novo resgate,
substituiu `GAME_RESUMED` no último evento do shell. O canvas continuava na
mesma rodada, com duas fotos salvas. A correção preparada verifica o estado
persistente do canvas, preservando a checagem de identidade da instância.
Consultar o código de saída antes de declarar `pnpm validate` aprovado;
execuções anteriores interrompidas não o substituem.

## Gates abertos

Android e iPhone físicos: controle, Safari/áudio, safe areas, três passagens
de desempenho e escuta em alto-falante/fone. Chromium emulado não prova esses
itens. A prova de dez ciclos rápidos cobre DOM e contextos de áudio; contagem
detalhada de texturas e vozes após dez rodadas completas prolongadas permanece
pendente. As coletas de tempo em desktop sob carga não certificam fluidez no celular.

Não mover o plano para completed nem abrir o catálogo de produção enquanto
esses gates e a decisão de prontidão continuarem pendentes.
