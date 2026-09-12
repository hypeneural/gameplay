# Som e magia do Hub — decisão de implementação

**Origem:** pedido do proprietário em 2026-09-07 para melhorar efeitos sonoros,
neve com lógica física, pisca realista e interatividade infantil, usando os
cinco packs de áudio locais indicados. Complementa o plano do Hub e aberturas.

## Experiência escolhida

- “Fazer nevar” no álbum provoca uma rajada finita. O globo responde ao toque;
  os flocos ganham deriva e voltam gradualmente à queda tranquila.
- Um sino junto ao cordão pode ser tocado. O gesto produz um toque musical e
  uma onda de luz quente no fio; pressionar repetidamente tem limite de vozes
  e frequência, sem acumular sons ou efeitos.
- Trocar/selecionar fotos tem som de papel; revelar o par tem confirmação
  musical; abrir/voltar tem sons curtos próprios. Tudo respeita mudo.
- A fotografia continua proporcional, sem neve, brilho ou filtro sobre rostos.

## Movimento e iluminação

**Refinamento solicitado:** substituir o cordão apenas quente por vidro em
vermelho, verde, azul e âmbar, com piscadas suaves por grupos. Os pontos presos
nas extremidades permanecem fixos; o centro do fio e cada lâmpada seguem a
mesma curvatura. O sino fica pendurado no centro e oscila como um pêndulo
amortecido, com vento lento. Tocar acrescenta uma batida com decaimento e
movimento do badalo. Fazer nevar aumenta de 48 para até 132 flocos visíveis
por alguns segundos, retornando à neve leve sem criar novos nós por toque.

A neve usa um conjunto limitado de partículas DOM, com profundidade, velocidade
terminal, aceleração, deriva, turbulência suave e rajada com decaimento.
Transformações são atualizadas fora dos renders React. Não se cria canvas nem
Phaser para a decoração. Resize preserva posições relativas. Ocultar a página,
abrir a galeria, sair da região visível ou ativar LOW/reduzido pausa o trabalho.

Lâmpadas têm soquete, vidro, filamento, reflexo e halo com origem no bulbo.
Grupos variam devagar, com fases diferentes; a interação é uma onda finita,
sem estroboscópio. LOW/reduzido conserva luz estática e confirmação visual.

## Entrega de áudio

Inventário dos diretórios fornecidos: 744 sons (10 MP3, 400 WAV, 154 OGG e
180 WAV do Shapeforms). Selecionar poucos cues, cortar silêncio desnecessário,
suavizar bordas, conferir nível de pico e entregar MP3 com alternativa AAC/M4A.
Os originais permanecem intactos. O carregamento começa por gesto; voz principal
limitada, sem música automática ou filas tardias após navegação.

Audio e Audio2 foram identificados pelo catálogo local como Kenney Interface
Sounds e Casino Audio. As páginas oficiais confirmam CC0. O pack gratuito
Shapeforms tem licença própria e é permitido em jogos comerciais conforme a
fonte oficial, mas exige proteção contra extração dos arquivos. A entrega web
desta etapa usa apenas Kenney CC0; os sininhos são composições dos sons de vidro,
com alturas e atrasos preparados offline. Os catálogos locais dos packs Christmas e 400 Sounds registram
origem/licença não documentadas; seus arquivos ficam como candidatos, sem
inventar autoria ou aprovação comercial no manifesto.

Assets do shell pertencem a `apps/play/assets/christmas-shell`, com diretório
público próprio e auditoria por owner. Não criar pacote de jogo fictício para
acomodar o manifesto. Proveniência inclui hash do original, receita, arquivos
derivados, bytes, duração e papel de cada cue.

## Aceite

### Ampliação autorizada: controles cristalinos

O proprietário também solicitou botões e ícones mais tridimensionais e
animados. Voltar, som, magia, álbum, navegação, compartilhar e começar recebem
vidro facetado, borda elevada, reflexo quente e compressão ao pressionar.
Ícones SVG substituem caracteres de fonte; o gesto produz retorno elástico
finito e brilho curto. Não adiar navegação para esperar animação.

Troca de fotografia e entrada de folha têm transição curta. Cada ação
semântica do shell tem som próprio ou um cue de sua família; rolagem não gera
fila de sons. Desligar som cancela imediatamente, sem tocar confirmação após
mudo. Ligar som e ativar magia têm novos cues de interruptor e vidro.
LOW/reduzido/calmo mantêm ícones, material e estados sem movimento repetitivo.

Validar causa e efeito por toque, limite de rajada/vozes, mudo imediato,
falha de áudio sem bloquear a brincadeira, cancelamento ao sair, pausa real do
loop e ausência de canvas fora da partida. Rever Hub/capas em 360/390/412/430/768
px, medir trabalho por frame no navegador e distinguir emulação de aparelho
físico. Rodar auditoria de assets, testes focais, `pnpm check:fast` e `pnpm validate`.

Fontes: [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds),
[Kenney Casino Audio](https://kenney.nl/assets/casino-audio),
[Shapeforms Free Sounds](https://www.shapeforms.com/shop/p/shapeforms-audio-free-sounds).
