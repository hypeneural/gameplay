# Controles cristalinos dos jogos

Pedido do proprietário em 2026-09-07: o acabamento elevado do Hub deve alcançar
todos os jogos, incluindo partida, pausa, som, dica, sair, compartilhar e ações
finais. Padrão de aplicação para experiência natalina em celular.

## Material e leitura

Vidro espelhado em verde-pinho ou rubi, espessura escura visível, borda dourada,
reflexo superior suave e brilho de contato. A superfície deve parecer um objeto
tocável. Ícones têm silhueta consistente, volume e rótulo curto em português;
fontes e emoji não substituem ícones materiais quando prejudicam consistência.
O reflexo nunca reduz contraste ou encobre a fotografia.

## Resposta e som

Pressão afunda a face sem mover sua área de toque. Soltar retorna de forma
amortecida e produz um realce curto; cancelar o gesto restaura o estado.
A ação semântica continua imediata. Uma confirmação sonora por ação aceita,
respeitando a preferência vigente, cancelamento, pausa e saída. Mudo não toca
um som depois de desativado. O dono do jogo decide o cue: o componente visual
não deve disparar uma segunda voz por baixo da política existente.

## Mobile e pausa

Ações principais têm alvo de pelo menos 52 CSS px; secundárias, 44 px. Ícones
e rótulos devem caber sem roubar a área da foto/tabuleiro. Pausa recebe um
cartão material e uma ação visual clara de continuar, com a partida preservada.
Confirmar saída e voltar seguem o mesmo material e mantêm o comportamento do
jogo. Não transformar pausa em uma segunda cena nem criar outro canvas.

LOW conserva o material e feedback finito; movimento reduzido conserva o
estado estático. Sem shaders, filtros por frame ou partículas ilimitadas para
simular vidro. Recursos e listeners pertencem à SceneScope; nenhum efeito
permanece depois de ocultar, sair ou destruir o jogo.

## Aplicação e prova

Compartilhar primitivas visuais por `packages/theme`; cada jogo conserva regras,
áreas de toque e áudio próprios. Conferir Hub/capa, HUD, pressionado, dica,
mudo, pausa/retomada, saída e conclusão em 390/412/430/768 px e telefone baixo.
Capturas privadas em navegador real completam os testes de comportamento.
Não declarar uniformidade apenas porque todos usam a mesma cor ou classe CSS.
