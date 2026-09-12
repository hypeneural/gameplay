# Mosaico em Queda — experiência de Oficina/Mural de Lembranças

Este documento fixa a experiência antes da integração de arte. A regra é
determinística e permanece em `src/domain`; Phaser apenas transforma efeitos
semânticos ordenados em imagem, som, toque e movimento finito. A foto da sessão
é sempre uma derivada autorizada proporcional (`contain`), nunca textura do
cenário, partículas ou efeito.

## Promessa e primeiros cinco segundos

Uma criança abre um mural de madeira da Oficina em noite azul. A foto escolhida
aparece no porta-retrato de memória; no primeiro paint, minós visíveis da
peça já aparecem no topo do mural como blocos-presente que carregam
miniaturas limpas. A instrução única é **“Complete uma fileira”**. O dock mostra
Esquerda, Girar, Direita e Baixar, todos com alvo de toque de pelo menos 52 CSS
px. O primeiro toque afunda a face do botão imediatamente e só então desbloqueia
som, se a família o tiver habilitado.

O progresso só aparece dentro do canvas: “Guirlanda: N de M”. React permanece
o dono da rota, acessibilidade e lifecycle, sem duplicar HUD, Scene ou
`Phaser.Game`.

## Verbos e resposta

| Momento           | Resposta NORMAL                                                                                                                                                   | LOW e movimento reduzido                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tocar dock        | Face de madeira afunda por 60–100 ms, sombra encurta, ícone confirma; `uiPress` curto e haptic leve opcional.                                                     | Face muda de contraste; sem pulso.                               |
| Arrastar no mural | A peça acompanha passos válidos quantizados por célula, com dead-zone e hysteresis. Um tap sem drag gira horário.                                                 | Mesma regra e dock equivalente; sem acomodação visual adicional. |
| Mover             | Geometria lógica muda no mesmo fixed-step; acomodação visual, se usada, dura no máximo 60 ms e nunca bloqueia input.                                              | Estado final imediato.                                           |
| Girar             | SRS instantâneo; fotos permanecem verticais. A moldura da peça faz lift/glow curto, com `rotate` e haptic leve opcional.                                          | Borda de alto contraste, sem tween.                              |
| Bloqueado         | Botão/peça retorna de forma gentil e dá `blocked` discreto; nunca buzzer ou punição.                                                                              | Contraste breve.                                                 |
| Ground / lock     | Ground é sutil. No lock, presente-foto assenta, sombra e borda confirmam, `lock` toca uma vez e VFX emite no máximo duas faíscas.                                 | Assentamento estático e som opcional.                            |
| Clear             | `lines-detected` usa os 14 ticks mecânicos: acende bordas, percorre brilho e recolhe antes de `lines-cleared`; compactação continua pertencendo ao engine.        | Borda confirma e linha desaparece no estado já decidido.         |
| Memory Frame      | Depois de lock que limpou linha, a nova `card` entra em crossfade de 250–450 ms, com label “NOVA LEMBRANÇA”, uma luz curta e `memoryReveal`.                      | Nova foto e label aparecem diretamente.                          |
| Hint              | Após 7 s sem avanço confirmado, o BFS oferece a primeira intenção segura: halo no alvo, sinal breve no botão e texto simples. Nunca executa input.                | Halo/contraste estático; sem pulso.                              |
| Recovery          | Input congela; “Vamos abrir espaço!” antecede sweep finito de neve/papel nas linhas já escolhidas pelo domínio; `workshopRelief`, remoção, glow e nova peça.      | Texto, linhas removidas e confirmação estática.                  |
| Vitória           | Âncora retorna ao Frame, contraste do mural baixa, hero proporcional entra antes da guirlanda, faixa e poucas estrelas; `victory` é a única assinatura principal. | Hero, guirlanda parada, mensagem e CTA diretos.                  |

## Diretores e limites

`MosaicPresentationDirector` recebe cada efeito na ordem do domínio e delega;
nenhum diretor consulta o board para descobrir a causa de algo já declarado.

- `MosaicFeedbackDirector`: resposta tátil e haptic opcional, sem alterar
  input ou colisão.
- `MosaicAudioDirector`: `victory > memoryReveal > clear > lock > rotate /
blocked > uiPress`; agrupa o mesmo tick para não sobrepor três confirmações.
  Desbloqueia após gesto, respeita mudo, pausa, hidden e shutdown. Sem arquivo
  presente, a experiência segue silenciosa.
- `MosaicVfxDirector`: no máximo 1 brilho de giro, 2 de lock, 8 de clear, 4 no
  Frame, um sweep de Recovery e 12 na vitória. Não existem emissores contínuos,
  neve infinita ou efeito sobre a foto hero. LOW e movimento reduzido omitem
  VFX decorativo.
- `MosaicMemoryFramePresentation`, `MosaicRecoveryPresentation` e
  `MosaicVictoryPresentation`: sequências finitas, canceláveis por epoch. Seus
  callbacks não chamam domínio; o engine continua no fixed-step.

## Papéis de assets e fallback

| Papel              | Asset próprio                                | Fallback seguro                         |
| ------------------ | -------------------------------------------- | --------------------------------------- |
| Cenário / mural    | fundo de Oficina e superfície do board       | cores/tokens sem esconder foto          |
| Presente-foto      | moldura de célula, matte, sombra e highlight | matte + borda independente              |
| Memory Frame       | moldura de Oficina                           | moldura primitive e `contain`           |
| Dock / próxima     | painel, quatro faces, pedestal               | botão acessível tokenizado              |
| Progresso / dica   | guirlanda, luz quente e brilho               | texto/outline de alto contraste         |
| Recovery / vitória | sweep, faixa e brilho                        | texto + alteração de estado já decidida |
| Áudio              | toque, encaixe e vitória com M4A/MP3         | silêncio, com confirmação visual        |

Todo arquivo browser-deliverable está em diretório público próprio, no
manifesto v2 e em `ASSET_PROVENANCE.md`. A música ambiente é conscientemente
adiada: não entra um loop genérico antes de existir material próprio bom.

## Acessibilidade e lifecycle

Não há hard drop, hold, giro de 180°, T-spin, combo, ranking, pressão de tempo
ou punição sonora. Arraste sempre tem dock equivalente. Pausa, hidden, blur,
resize, context loss e saída cancelam owner/epoch, limpam input, param tweens e
som, destroem objetos antes das texturas privadas e por fim descartam a Scene.
O D7 validará visualmente áreas úteis, contraste e sensação no aparelho; este
documento não afirma aprovação estética antecipada.
