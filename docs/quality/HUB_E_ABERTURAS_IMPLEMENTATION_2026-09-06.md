# Hub e aberturas — primeira implementação mobile

**Data:** 2026-09-06. **Estado:** registro histórico da primeira fatia local; a execução final foi interrompida antes de consolidar o resultado completo.
**Dono:** `apps/play`. **Plano:** [catálogo e aberturas natalinas](../exec-plans/CG-HUB-E-ABERTURAS-NATALINAS.md).

A atualização de som e atmosfera e a validação corrente estão no
[registro de 2026-09-07](HUB_SOM_E_MAGIA_2026-09-07.md). As medidas abaixo
pertencem à primeira fatia, antes dessa atualização.

## Entrega

A entrada agora apresenta “Escolha seus jogos”, um álbum de altura limitada e
seis representações das brincadeiras. A fotografia escolhida acompanha os
cards e a capa. A galeria completa abre em uma folha modal, com 12 miniaturas
por bloco, foco contido e restauração do foco ao fechar. Botões anterior/próxima
oferecem alternativa ao swipe; voltar ao catálogo preserva foto e rolagem.

A abertura de Memory usa cartas em perspectiva, espessura, sombra e revelação
manual de um par. O enquadramento adapta-se a retrato e paisagem sem cortar a
foto. As outras capas recebem objetos próprios, troca de foto e botão de
começar. Todas usam composição React; o motor é carregado separadamente.

O ambiente inclui neve atrás das fotos e lâmpadas com vidro, núcleo e halo
quente. Modo calmo, LOW e movimento reduzido conservam o conteúdo; a folha
modal pausa o ambiente e ocultar a aba pausa a atmosfera e interrompe o som do
shell. Há feedback sonoro nos controles de navegação, fotos, demonstração e
preferências. O som curto existente é a única fonte sonora integrada nesta
fatia; música e timbres por material continuam pendentes.

Fotos têm estados de preparação/falha com espaço reservado. Uma foto que não
carrega não impede usar o álbum para escolher outra. A galeria usa `thumb` e a
capa usa `card`; nenhum original, asset novo ou foto privada foi publicado.

## Evidência visual e de comportamento

Revisão em navegador local Chromium, com derivados de nove fotos do ensaio.
Imagens inspecionadas somente na conversa privada. Testes automatizados usam
fixtures sintéticas. Emulação de dimensões não constitui teste em Safari ou
em aparelho físico.

O perfil LOW foi inspecionado com a
[emulação de economia de dados do Chromium](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setDataSaverOverride),
e movimento reduzido foi emulado separadamente. Overrides e abas de inspeção
foram removidos ao concluir. O console permaneceu sem erros ou avisos na amostra
visual. Não houve upload de fotografias para ferramentas externas.

| Estado                     | Viewport   | Evidência e resultado                                                                                            |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Hub, foto retrato          | 390 × 844  | Catálogo começa em aproximadamente 364 px; antes começava em 1.444 px. Primeira linha de jogos na primeira tela. |
| Hub, foto paisagem         | 412 × 915  | Álbum e cards preservam proporção; mudança da seleção reflete nas prévias.                                       |
| Hub, foto retrato          | 430 × 932  | Catálogo em 368 px, sem overflow horizontal e zero canvas.                                                       |
| Hub e Memory               | 768 × 1024 | Conteúdo limitado a 560 px. Corrigido limite antigo de 340 px que deixava o botão de começar desalinhado.        |
| Memory, par em paisagem    | 412 × 915  | Cartas horizontais distintas e foto proporcional.                                                                |
| Memory, retrato            | 430 × 932  | Botão de começar termina em 833 px, dentro da primeira tela.                                                     |
| Memory, modo calmo         | 360 × 640  | Botão de pelo menos 52 px dentro da primeira tela; sem overflow horizontal.                                      |
| Galeria modal              | Telefone   | Seleção fecha a folha e restaura foco no acionador; fechar também restaura foco.                                 |
| Foto atrasada/indisponível | Telefone   | Falha não altera geometria; próxima foto carrega e atualiza o contador.                                          |

## Conferência complementar de capas e perfis

Verificação complementar: todas as seis capas foram inspecionadas em 360 × 640;
o botão principal permanece na primeira tela. Em Memory reduzido, o botão mede
58 px e termina em 548 px, sem overflow horizontal e com zero animações ativas.
No Hub LOW em 390 px, `saveData=true` produz modo calmo, zero flocos, zero
animações ativas e zero canvas; a abertura Memory mantém as duas cartas visíveis.

## Build e custo da primeira fatia

O build depois da correção do import de Memory passou de aproximadamente
285,01 para 258,07 kB de JavaScript inicial; gzip de 89,99 para 81,89 kB.
Essa comparação usa duas builds da primeira fatia, não o baseline do design
anterior. O sourcemap inicial contém zero fontes do runtime de Memory e zero
fontes do motor Phaser. CSS: 47,75 kB, gzip 11,01 kB. O chunk do motor continua
grande (1.375,61 kB, gzip 357,99 kB), porém separado; o aviso de tamanho de chunk
não foi suprimido.

As duas imagens públicas reutilizadas totalizam 230.542 bytes nos arquivos
WebP: vila de Puzzle (106.970) e locomotiva de Expresso (123.572). Ambas já
constam nos manifestos de seus jogos. Esse número exclui fotos e áudio e não
substitui medição de transferência, decode, GPU ou fluidez em telefone real.

## Resultado dos checks

- `pnpm check:fast`: passou, com 260 testes em 58 arquivos, tipagem e lint.
- Três testes focais do shell passaram em `iphone-390`, incluindo falha de rede,
  primeira tela, seleção/foco e preferências em 360 × 640.
- A execução completa anterior apresentou quatro falhas do mesmo teste da
  Trinca. O auxiliar de toque ainda modelava os antigos botões verticais; foi
  atualizado para os cards de modo atuais, lado a lado. O teste focal passou;
  nenhuma regra ou implementação de gameplay foi alterada nessa correção.
- O import de uma constante de dificuldade pelo barrel de Memory puxava seu
  runtime para o bundle inicial. A constante agora vem do entrypoint de
  metadados, mantendo o import dinâmico do motor eficaz.
- `pnpm validate`: execução final pendente de consolidação neste registro.

## Próxima fatia e limites de produção

H0/H5 continuam necessários para definir o catálogo de release e integrar o
JSON autorizado de sessão e seus derivados no VPS. Hoje o shell ainda usa
fixtures ou o endpoint de mídia local. Não declarar produção pronta com essa
fonte de sessão.

Também permanecem: pacote final de arte/cues, demonstrações próprias das
outras capas, transições completas de preparação/retry, preferência sonora
alterada dentro do jogo sincronizada de volta ao shell, retomada após reload,
auditoria de contraste/texto ampliado/leitores de tela, orçamento medido em
Android e iPhone, testes nos navegadores dos aplicativos sociais e homologação
do estúdio. Essas pendências constam de H1–H7; não são cobertas por um build ou
pela revisão de screenshots.
