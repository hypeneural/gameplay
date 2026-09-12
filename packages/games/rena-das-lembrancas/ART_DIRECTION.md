# Rudolph — arte e articulação

Direção R3 iniciada em 2026-09-08. Personagem próprio de brinquedo-diorama,
silhueta amigável, pelagem castanha aveludada, focinho creme, chifres de madeira
clara, cachecol framboesa e nariz rubi. Iluminação ampla superior; evitar sombra
direcional rígida que torne o espelhamento incorreto. Foto sempre sem filtros.

O sprite será articulado a partir de peças do mesmo modelo, produzidas juntas:
torso, cabeça/chifres, patas anteriores e posteriores. Compor a pose com pivôs
fixos, animação de corrida alternada, cabeça de captura e acomodação. Essa
escolha cumpre continuidade de identidade sem gerar poses independentes.

Grade fonte: três colunas por duas linhas, fundo transparente, peças separadas
e margem por célula. Preparação offline recorta células, preserva alpha e gera
WebP. Cabeça e corpo usam luz/material comuns. Revisar proporção no canvas e
movimento a tamanho de celular antes de promover a arte ao manifesto.

A representação vetorial exploratória não integra o runtime final. Física e
captura não dependem da geometria das peças raster. LOW mantém o personagem;
movimento reduzido conserva poses e deslocamento, sem balanço decorativo.

## Moldura compacta v3 — 2026-09-08

As molduras pendentes herdadas reservavam aproximadamente metade da altura
para a abertura. A borda própria compacta mantém madeira/latão, sem alça, e
decoração restrita aos cantos. A foto fica inteira acima do centro opaco do
material, com escala proporcional e borda de até 12 CSS px durante a queda.
NineSlice preserva os cantos em fotos retrato, paisagem e quadradas; destaques
e álbum usam o mesmo material com borda de até 11 px. Canvas recebe fallback
geométrico. A foto permanece acima da rena quando se aproximam na captura.

Tentativas transparentes v2 foram rejeitadas por artefatos de fundo/contorno.
Fontes anteriores ficam fora do runtime. A v3 e a composição com derivadas
reais são conferidas no navegador, separadamente da homologação física.
