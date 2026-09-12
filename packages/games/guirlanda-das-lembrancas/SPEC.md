# Guirlanda das Lembranças — especificação de produto

**Estado:** vertical slice jogável registrado no catálogo local. A liberação depende da revisão visual mobile e dos gates completos de qualidade.

## Revisão V2 — contrato vigente

Esta seção substitui a apresentação V1 descrita abaixo. O domínio permanece
igual: até seis fotos, âncora primeiro, qualquer gancho livre é válido e
toque–toque é equivalente a arraste.

- O topo contém somente sair, som e pausa; progresso são 24 pequenas lâmpadas
  integradas ao aro, acesas proporcionalmente ao número de fotos da rodada.
- Ganchos raster de latão substituem estrelas planas, com hit area de 72 px.
  Todas as molduras, inclusive fotos penduradas, usam a mesma família material.
- Layout calcula retrato, paisagem e quadrado por uma abertura normalizada;
  foto e suporte ficam dentro do alpha, sem cortar nem distorcer a fotografia.
- Caixa ancorada no rodapé entrega a próxima lembrança em 320 ms; selecionar
  durante a chegada acomoda a foto imediatamente para aceitar o gesto.
- Encaixe de 180 ms confirma o contato com som e luz; o balanço no pivô de
  suspensão termina sozinho. Decoração posterior não bloqueia input.
- Instrução é curta na primeira colocação; depois só reaparece como dica
  contextual após inatividade. Fotos penduradas abrem visualizador.
- Vitória dura aproximadamente 1,45 s antes de publicar GAME_COMPLETED;
  então a composição reserva espaço para ações finais de mesmo material e
  tipografia. Pausa/resize na transição preservam o estado e finalizam a
  apresentação de forma segura; movimento reduzido não espera celebração.
- NORMAL tem seis flocos periféricos no fundo e leve respiração da luz da
  caixa. LOW/reduzido não criam esses objetos nem partículas decorativas.
- Áudio possui instâncias próprias, no máximo uma voz principal, prioridade
  e variação discreta. Não usa pauseAll/resumeAll. São três fontes autorizadas
  com mixes por intenção; música e gravações novas permanecem fora desta entrega.

## Promessa

A criança transforma até seis fotos da sessão em enfeites reais de uma guirlanda. Primeiro toca a moldura do centro e depois uma estrela dourada; se preferir, arrasta a mesma moldura até o encaixe. Não há resposta errada, tempo, pontuação ou comparação artificial.

## Fotos e privacidade

- A foto escolhida no Hub sempre entra primeiro; o runtime acrescenta no máximo cinco fotos seguintes da sessão, na ordem já autorizada.
- Cada fotografia carrega somente a derivada `game`, escolhe a moldura retrato
  ou paisagem a partir de sua orientação, fica proporcional com
  `PhotoSurface(..., 'contain')` e nunca recebe filtro, tint, partícula, laço
  ou texto sobre a área de imagem.
- A janela, o fundo interno e a fotografia ficam inteiramente dentro da
  abertura alpha da moldura. O inset só afasta a foto do aro; nunca aumenta o
  passe-partout para fora dele.
- O domínio conhece apenas ids; URL, caminho local, nome de arquivo e pessoa não existem em seus tipos, eventos ou logs.

## Estados determinísticos

```text
awaiting-photo → awaiting-slot → awaiting-photo
                              └→ completed
```

`awaiting-photo` aceita a moldura central. `awaiting-slot` aceita qualquer gancho livre. A última colocação conserva todas as molduras pequenas e traz de volta a foto âncora ao centro. Tocar em uma lembrança já pendurada abre uma visualização proporcional com retorno explícito. Toque em slot ocupado, slot antes da seleção ou soltura fora não altera a coleção; o runtime apenas devolve orientação gentil.

## Input e feedback

- A moldura central e cada estrela livre têm zona retangular de pelo menos 72 CSS px. Depois da seleção, a zona da moldura fica abaixo das estrelas para que nenhum aro grande esconda um encaixe. Som e pausa são controles secundários de 48 CSS px.
- Arraste começa após 16 px ou 200 ms; é um atalho, nunca o único caminho.
- Seleção: elevação de 120 ms, brilho de borda e clique macio. Encaixe: trajetória de 180 ms, luz dourada curva de 260 ms que sai do gancho recém-preenchido e aponta uma próxima estrela livre, sino quente e burst finito de seis faíscas fora da foto.
- O HUD mostra seis luzes-lembrança; cada encaixe acende uma luz e recebe um único pulso curto. Essa é a única fonte visual de progresso da rodada.
- Vitória: a âncora proporcional entra antes da assinatura sonora e de até doze faíscas externas. Não existem loops de neve, câmera, parallax ou partículas sobre rostos.

## Qualidade e lifecycle

- LOW e movimento reduzido conservam estado, contraste, som opcional e confirmação; retiram a trilha e as faíscas decorativas.
- `RESIZE` reposiciona objetos e zonas sem trocar estado. Pause revela uma ação explícita de continuar; hidden, blur, resize e saída invalidam a época de apresentação, param recursos próprios e liberam as texturas da rodada.

## Critérios de aceite

| ID     | Requisito                                                                                             | Prova                               |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| GDL-01 | Seleção, colocação, slot ocupado e conclusão são determinísticos.                                     | Testes de domínio.                  |
| GDL-02 | Toque–toque e arraste concluem a mesma colocação; nenhum caminho pune.                                | Revisão de input e canvas.          |
| GDL-03 | Foto selecionada e fotos mistas preservam a proporção e continuam protagonistas.                      | Screenshots privados em 390–768 px. |
| GDL-04 | Toda resposta tem fim determinável; LOW/reduzido não dependem de efeito decorativo.                   | Revisão NORMAL, LOW e reduzido.     |
| GDL-05 | Entrada → pausa/retorno → saída conserva um canvas e não deixa som, timer, tween, emitter ou textura. | E2E/lifecycle.                      |
| GDL-06 | Cada asset está catalogado, tem hash, proveniência e cabe no orçamento.                               | `pnpm asset:validate`.              |
