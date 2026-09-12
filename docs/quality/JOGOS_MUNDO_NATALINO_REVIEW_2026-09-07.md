# Revisão dos seis jogos — mundo natalino interativo

Revisão local em 2026-09-07. Escopo: Memory, Puzzle Swap, Expresso das Fotos,
Guirlanda das Lembranças, Mosaico em Queda e Trinca de Natal, incluindo controles
React, partida, pausa e continuidade. A direção está na
[decisão de produto](../product/MUNDO_NATALINO_INTERATIVO_2026-09-07.md).

## Conclusão da análise

Os jogos já têm regras e histórias diferentes, mas o acabamento anterior era
desigual. A Guirlanda tem a referência material mais forte; Memory, Expresso
e Mosaico exibiam várias superfícies planas. O problema principal era a
diferença entre a riqueza da fotografia/cenário e a simplicidade dos objetos
que a criança realmente toca. Por isso a primeira correção atravessa os seis
jogos: material, pressão, ícones, pausa, som e continuidade.

O novo padrão está aplicado em código. A revisão nos cinco tamanhos de tela
confirmou abertura, pausa, retomada, mudo e saída nos seis jogos, sem erro
JavaScript ou overflow. A revisão ampliada e os checks finais estão registrados
na seção de evidências. Essa revisão não declara os seis jogos visualmente
finais: há melhorias específicas de arte, fotografia e descoberta que precisam
de novas fatias de implementação e homologação com crianças/famílias.

## Memory — um álbum que se revela

**O que funciona:** a grade mantém áreas de toque próprias, fotos proporcionais,
virada de carta, seleção de pares, dica manual e celebração do álbum. Há vila
de Natal, neve de fundo e música/efeitos próprios. O movimento da carta não
altera o tamanho da textura nem a verdade do par.

**Achado e correção:** os versos eram retângulos chapados com pequenos
retângulos decorativos, enquanto o Hub já tinha vidro e relevo. Os versos agora
usam o material rubi, cantos arredondados, sombra, reflexo e estrela vetorial.
Som, dica e pausa receberam ícone/rótulo consistentes. A pausa ganhou cartão
material e medalhão de play; ao silenciar, efeitos ativos também são encerrados.
Em 360 × 640, a revisão detectou cartas excessivamente pequenas ao forçar
duas colunas. O fallback agora escolhe as maiores cartas viáveis; o chrome
externo também usa margens menores em telefones baixos, preservando safe areas.

**Próxima melhoria:** preservar a leitura do álbum nos menores aparelhos sem
encher o espaço entre o cabeçalho e as cartas. Avaliar um pequeno selo de foto
na entrada, sem revelar pares nem alterar o desafio. O verso pode ganhar uma
assinatura de Natal mais exclusiva que o rótulo atual. A prioridade é conferir
reconhecimento dos rostos após a virada, especialmente quando houver seis pares.

## Puzzle Swap — reconstruir a lembrança

**O que funciona:** a fotografia ocupa o centro; toque–toque e arraste são
alternativas reais. A troca acomoda as peças, a dica mostra duas intenções e a
vitória recompõe a foto. O áudio tem papéis distintos e música com controle.

**Achado e correção:** o HUD usava superfícies pequenas e planas, e a pausa era
um cartão simples com texto. Agora há vidro, ícones materiais de som/dica/pausa,
realce de pressão e botão visível de continuar na pausa. O runtime conserva
suas áreas de toque e o feedback existente. A conclusão e seus botões React
também receberam o material comum.

**Próxima melhoria:** diminuir a aparência de linhas de grade sobre a lembrança
nas etapas finais e revisar peso visual da moldura versus imagem. A direção
de luz deve partir de janela, lanterna ou borda; partículas de acerto devem
ficar perto da peça, sem atravessar rostos. Conferir a legibilidade dos rótulos
compactos em telefone físico é mais importante que aumentar o brilho do HUD.

## Expresso das Fotos — levar a lembrança pela estação

**O que funciona:** procurar a fotografia igual é uma instrução infantil clara.
Trilhos, movimento do trem, apito, vapor, chegada e entrega dão causa e efeito
à escolha. Há estações separadas, ajuda por inatividade e pausa durante a
viagem com reflow do percurso.

**Achado e correção:** a foto de referência em retrato ficava dentro de uma
moldura horizontal com grandes áreas marrons vazias. A moldura agora acompanha
a proporção real da imagem contida; não há recorte ou distorção. Referência e
estações receberam material com profundidade. Som/pausa e cartão de pausa
seguem o padrão comum. Tocar no trem parado toca o apito e acende brevemente
o farol. Mudo encerra também sons curtos, além do ruído de viagem.

**Próxima melhoria:** equilibrar tamanho da referência, estações e trem em
telefones baixos. O trem pode parecer pequeno diante dos cartões; ampliar sem
invadir os trilhos/hit areas exige revisão do layout completo. As estações
podem receber postes e lâmpadas com sombra preparada. A árvore de destino
ainda pode ganhar arte mais material, mantendo claro onde cada foto chegou.

## Guirlanda — a referência de materiais do conjunto

**O que funciona:** laço, metal, madeira, lâmpadas e caixa têm profundidade
perceptível. A foto central é protagonista. Toque–toque, arraste, encaixe,
revisita de lembrança e som da caixa compõem uma história compreensível.

**Achado e correção:** os controles não tinham o mesmo acabamento da moldura,
e a grande caixa parecia convidar ao toque sem responder diretamente. Som,
pausa, retorno do visor e saída receberam vidro. A pausa recebeu cartão e
play. A caixa agora responde com som de abertura, um balanço curto e brilhos
limitados quando a cena está disponível; isso não troca a foto nem coloca
uma lembrança automaticamente. Pausa/cancelamento restauram o ângulo da caixa.

**Próxima melhoria:** calibrar a pulsação das lâmpadas para que pareça emissão
de luz, e não transparência de uma camada inteira. A sombra e a reflexão devem
acompanhar a fonte. Conferir foto clara/escura no visor e evitar que a moldura
reduza o rosto em aparelhos baixos. Manter a navegação de lembranças completa
acessível depois da vitória.

## Mosaico — uma oficina de fotografias

**O que funciona:** peças feitas de fotos, controles de toque com repetição,
indicação de destino, dicas, recuperação gentil e revelação de lembranças.
A implementação usa pools limitados e separa a mecânica da apresentação.

**Achado e correção:** o fundo, o mural e o painel tinham aparência de vetor
básico; também faltavam pausa e som visíveis. O cenário agora é uma oficina
com luz quente e materiais já pertencentes ao projeto. O mural ganhou bordas
metálicas, madeira, profundidade e interior com contraste. Dock e comandos
seguem vidro; pausa e som ocupam os espaços laterais da segunda fileira,
preservando os quatro comandos. A pausa interrompe interação e animações,
mantém a mecânica e retorna sem acumular tempo de queda.

**Fotografia interativa:** tocar na miniatura “Lembrança” abre um visor com
a textura já autorizada, preserva proporção, pausa a queda e
volta pelo botão cristalino à mesma partida, sem nova requisição de foto.

**Próxima melhoria:** a guirlanda de progresso pode responder ao toque com
um pulso de luz, sem conceder progresso. As peças são
pequenas por natureza: verificar reconhecimento da fotografia nas revelações,
e não prometer rostos grandes em cada célula. A direção sonora ainda reutiliza
alguns timbres por função; sons exclusivos de madeira/vidro/encaixe são uma
próxima fatia, condicionada a proveniência e escuta em aparelho.

## Trinca — mural da Oficina do Noel

**O que funciona:** modos claros, fotografia no início, tabuleiro protegido,
seleção, rodada e final no mesmo mundo. Retorno com confirmação protege a
partida. A oficina já oferece boa profundidade de cenário.

**Achado e correção:** botões de modos, dificuldade, navegação e pausa tinham
um acabamento diferente entre si. A fábrica local de botões agora aplica o
material comum em todos esses estados, preservando o clique aceito ao soltar.
Som e pausa têm ícones; as ações de pausa e confirmação usam o mesmo relevo.
O skin é descartado também quando um botão de menu é substituído, antes de
encerrar a cena, evitando efeitos/escutas associados a objetos antigos.

**Próxima melhoria:** o marcador de Noel ainda precisa de uma assinatura
visual mais expressiva que a letra atual. Produzir personagem/medalhão exige
seguir a bíblia de personagens e validar distinção entre os dois jogadores.
Conferir a seleção de dificuldade em 360 px e a relação entre foto, peças e
legenda no final. Não colocar uma animação longa entre a escolha de casa e a
resposta do adversário.

## Padrão obrigatório daqui em diante

1. Foto é conteúdo principal; efeito nunca a transforma em textura de fundo.
2. Objeto que convida ao toque precisa responder. Classificar peças, fotos,
   controles e objetos de cenário; cada resposta tem dono e término.
3. Botões usam vidro, espessura, sombra e ícone coerente, sem depender de emoji.
4. A resposta visual começa imediatamente; a regra não espera uma animação.
5. Uma confirmação sonora por ação aceita; mudo é da sessão, não de uma tela.
6. Luz tem fonte visível, intensidade suave e reflexo coerente; sem strobo.
7. Animação decorativa para em pausa/background e tem alternativa reduzida.
8. Alvos principais têm ao menos 52 px e secundários 44 px; o skin não desloca
   a área de toque. Tamanho da arte pode diferir da área interativa.
9. Sem filtros pesados por frame nem recursos ilimitados. O material compartilhado
   usa Graphics e faixas de cor, sem shaders ou texturas extras por botão.
10. Provar abertura, ação, dica, mudo, pausa, vitória e saída em cada jogo;
    captura do Hub não comprova o interior do jogo.

## Evidência e limites

- Código, specs, bíblias, tipos instalados e exemplo oficial local de Phaser
  4.2.1 foram examinados. Nenhuma regra determinística foi alterada.
- Capturas com derivados seguros ficam em `test-results-shell-review/` e
  screenshots de E2E em diretórios ignorados. Não há fotos no relatório.
- Primeira passagem em 390 × 844: seis jogos abriram, pausaram, retomaram e
  saíram sem canvas residual; mudo permaneceu nos seis retornos ao Hub.
- Matriz ampliada: 360 × 640, 390 × 844, 412 × 915, 430 × 932 e 768 × 1024.
  Após a correção de área útil, os seis jogos foram reconferidos em 360 × 640.
  Capturas de partida e pausa foram inspecionadas visualmente, além dos gestos.
- LOW e movimento reduzido: seis jogos em cada perfil, em 390 × 844, com
  abertura, pausa, retomada, mudo e saída preservados, sem erros ou overflow.
- Revisão específica com foto local: visor do Mosaico abriu, pausou e retornou
  com zero novas requisições de imagem. A captura confirmou foto proporcional
  e botão de retorno visível. Toque no trem parado e na caixa da Guirlanda
  iniciou uma reprodução sonora por ação, sem erros de página.
- `pnpm check:fast`: **276 testes em 61 arquivos**, tipagem e lint passaram.
  Há testes para descarte do skin, preferência tipada, pausa por razões
  independentes e tamanho das cartas em telefone baixo.
- A primeira validação integrada encontrou alvos de conclusão abaixo de
  52 px por precedência de CSS. A regra foi corrigida no escopo dos botões de
  conclusão, e os dois cenários focais de vitória passaram novamente.
- `pnpm validate --workers=2`: **passou**, com 276 testes unitários e
  **177 cenários de navegador aprovados**, em 13,8 minutos de E2E. Três pulos
  são previstos: o cenário de cinco entradas do Memory roda exclusivamente
  em `iphone-390`; as jornadas normais continuam nos quatro perfis. Inclui
  tipagem, lint, fronteiras arquiteturais, Knip, formato, mapa e build.
- Os 24 cenários novos dos controles (seis jogos × quatro perfis) passaram:
  canvas preservado ao silenciar, ausência de novos inícios de áudio em mudo,
  pausa/retomada, saída e preferência mantida no Hub. Mosaico também verifica
  visor de foto e pausa manual preservada após ocultar/mostrar a página.
- As duas skills do projeto passaram pela validação de estrutura. O novo
  padrão exige evidência do interior de cada jogo e distingue inspeção sonora
  técnica de escuta em aparelho.

Build integrado: JS inicial **268,94 kB** (gzip 83,63), CSS **60,15 kB**
(gzip 13,88). Phaser continua separado, com **1.375,61 kB** (gzip 357,99);
o aviso de chunk grande permanece. Não são medidas isoladas do novo material.
O catálogo de Mosaico passou na auditoria com 22 arquivos e **221.097 bytes**;
a nova oficina WebP usa 73.598 bytes e reutiliza arte pertencente ao projeto.
Nenhuma fotografia foi enviada a fornecedor de geração de imagem.

Chromium emulado no computador não equivale a Safari/iPhone ou Android físico.
Requests e chamadas de reprodução foram observados tecnicamente; não houve
escuta humana dos timbres neste ambiente. A aprovação sonora final requer
ouvir em alto-falante de celular, com foto clara/escura e sequência de gestos.

## Ordem das próximas fatias

| Prioridade     | Fatia                                                     | Aceite                                                                 |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| P1 de release  | Homologar lifecycle, mudo e pausa em aparelhos físicos    | Nenhuma retomada indevida, bloqueio de gesto ou canvas residual        |
| P2 visual      | Presença do trem; medalhão do Noel; assinatura das cartas | Foto reconhecível e verbo claro, sem sobrepor tabuleiro                |
| P2 iluminação  | Lâmpadas por fonte e resposta em cenário                  | Pulsos suaves e reflexos locais, com versão estática                   |
| P2 som         | Identidade de cada mundo e mixagem em celular             | Cue reconhecível, sem clipping, atraso ou sobreposição incômoda        |
| P2 compreensão | Observação privada com famílias autorizadas               | Reconhecer a própria foto, brincar, silenciar e voltar sem assistência |
| Release        | Sessão real no VPS, mobile físico e homologação           | Critérios H5–H7 do plano principal cumpridos                           |

Esta entrega conclui uma etapa de material e interação comum. Os próximos
refinamentos têm dono por jogo e critérios próprios; publicação depende dos
gates de sessão real, aparelho físico e homologação do plano principal.
