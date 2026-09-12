# CG-HUB-E-ABERTURAS-NATALINAS — plano detalhado para produção

**Estado:** em execução; plano finalizado e primeira fatia autorizada pelo proprietário em 2026-09-05.  
**Data:** 2026-09-04.  
**Responsável principal:** `apps/play`; interfaces com `packages/theme`, `packages/platform`, `tools/asset-factory` e `apps/catalog-server`.  
**Origem:** pedido do proprietário para evoluir a página de escolha e as aberturas para uma experiência natalina, fotográfica, animada e inteiramente orientada ao celular.  
**Evidência:** [análise visual e técnica das páginas atuais](../quality/HUB_E_ABERTURAS_REVIEW_2026-09-04.md).

## Registro de início — 2026-09-05

O proprietário solicitou finalizar o plano e iniciar sua implementação. A
primeira fatia reúne a composição do Hub, o álbum em folha própria, prévias
fotográficas por jogo e a abertura interativa de Memory. Usa geometria CSS e
assets já existentes; nenhuma foto foi enviada a provedor de arte e nenhum
arquivo novo foi publicado em `public/assets`.

- Catálogo começa no topo útil, com cards distintos e foto integrada.
- Galeria completa abre em `dialog`, carrega 12 miniaturas por bloco e restaura
  foco; seleção e navegação anterior/próxima atualizam as prévias.
- Aberturas recebem layout compacto, CTA grande, troca de foto e objeto próprio;
  Memory demonstra o par por toque, com layout por orientação da fotografia.
- Neve limitada, cordão com halo quente, pressão dos controles, modo calmo e
  controle de som entram na primeira fatia do shell. O toque aprovado existente
  continua sendo a única fonte sonora desta etapa.
- Estado inicial de som/modo calmo é passado ao gameplay. A sincronização do
  botão de som interno de cada jogo de volta ao shell, música e SFX por material
  continuam em H4; não estão concluídos por haver um botão global na capa.
- Sessões reais no VPS, budgets medidos em aparelhos e validação física seguem
  em H5–H7. A primeira fatia é uma prévia local, não um release de produção.

O registro de decisão está em
[Hub e aberturas — decisões de início](../product/HUB_E_ABERTURAS_DECISOES_2026-09-05.md).

O avanço e a evidência da primeira fatia estão em
[implementação e validação mobile de 2026-09-06](../quality/HUB_E_ABERTURAS_IMPLEMENTATION_2026-09-06.md).

## 1. Resultado pretendido e decisões de escopo

**Atualização de 2026-09-07:** o pedido de melhorar sons, neve e interações
natalinas originou uma segunda fatia de H4. Globo com rajada física, sino com
onda de luz, pausa real do loop e doze sons curtos em dois formatos foram
integrados. A ampliação posterior do pedido acrescentou controles de vidro
com volume, ícones materiais e retorno animado por gesto. O registro inicial
acima é histórico; a fonte sonora única foi
substituída por cues de material Kenney CC0. Ver
[decisão de som e magia](../product/HUB_SOM_E_MAGIA_2026-09-07.md) e
[implementação e evidências](../quality/HUB_SOM_E_MAGIA_2026-09-07.md).

**Continuação nos seis jogos:** o material cristalino passou aos controles,
pausas, menus e conclusão. A preferência de som agora retorna ao shell por
evento tipado, preservando canvas e partida; pausa manual também é independente
da visibilidade da página. Foram acrescentadas respostas de cenário e visor
de foto no Mosaico. Ver a
[revisão integrada por jogo](../quality/JOGOS_MUNDO_NATALINO_REVIEW_2026-09-07.md)
para resultados e refinamentos restantes. H5–H7 continuam abertos.

A família abre o link e entra em uma sala de brinquedos de Natal. Reconhece uma
foto do próprio ensaio, vê quais brincadeiras existem e toca em um objeto que
responde com profundidade, luz e som. A abertura continua a mesma cena e mostra
como brincar com uma demonstração curta. A ação de começar permanece evidente.

Nome de trabalho da direção: **Sala das Lembranças de Natal**. Cenário noturno
azul, pinho nas bordas, madeira e papel marfim nos objetos, veludo framboesa nos
convites e lâmpadas âmbar com vidro e brilho suave. Fotografias reais permanecem
nítidas e proporcionais. O acabamento tridimensional vem de objetos preparados
em camadas, perspectiva pequena, espessura e sombra de contato.

| Decisão proposta                            | Implementação e efeito esperado                                             |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Jogos são a tarefa principal                | “Escolha seus jogos” no topo e primeiras opções na primeira tela            |
| Foto acompanha a escolha                    | Álbum compacto acima dos cards e foto incorporada às prévias                |
| A criança pode começar imediatamente        | Foto inicial elegível já selecionada; trocar é opcional                     |
| Cada brincadeira tem objeto próprio         | Cartas, quebra-cabeça, trem, guirlanda e mural representam ações distintas  |
| Abertura é parte da experiência de jogo     | Diorama interativo com uma instrução e CTA principal                        |
| Som responde às ações                       | Vocabulário de papel, madeira, sino e celesta, respeitando mudo             |
| Animação ambiente tem controle              | Neve e pisca em NORMAL; modo calmo e LOW preservam materiais e feedback     |
| Estúdio assina a experiência                | Convite para fotos e Instagram no rodapé do Hub; assinatura pequena na capa |
| Produção depende de fotos autorizadas reais | Adaptador de sessão e entrega de derivados substituem fixtures              |

Este plano especializa as diretrizes de
[maturidade natalina](CG-CHRISTMAS-NATIVE-LIKE-MATURITY.md) e
[velocidade criativa mobile](CG-MOBILE-FIRST-CREATIVE-VELOCITY.md) para o shell.
Mantém o público principal de 6–10 anos e as decisões de fotos e duração já
registradas. Não seleciona novas mecânicas nem modifica a dificuldade dos jogos.
Memory será a primeira abertura de referência; as demais recebem a mesma
infraestrutura com apresentação própria. A lista pública depende de readiness
individual, não apenas de o pacote existir no registro.

## 2. Nova página principal

### 2.1 Hierarquia e distribuição mobile

Composição inicial de referência em 390 × 844 CSS px. As faixas são metas de
layout, ajustadas pelas safe areas e pelo tamanho de texto; não coordenadas
absolutas para implementação.

| Faixa aproximada    | Conteúdo                                                                       | Comportamento                                                     |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Topo seguro + 56 px | Cordão de luzes periférico; título “Escolha seus jogos”; controle de som       | Título curto; lâmpadas não ocupam hit areas                       |
| Próximos 160–190 px | Álbum com foto central e bordas de duas fotos seguintes; “Suas fotos de Natal” | Deslizar ou usar setas; botão “Ver fotos” abre galeria completa   |
| Próximos 24–36 px   | “Qual brincadeira vamos abrir?”                                                | Uma frase, sem explicação técnica                                 |
| Próximos 200–240 px | Primeira fileira com duas brincadeiras                                         | Foto e objeto do jogo, nome curto e ação claramente tocável       |
| Próxima região      | Segunda fileira e continuação vertical                                         | Descoberta por rolagem normal; sem carrossel obrigatório de jogos |
| Final da lista      | Rodapé Evydência                                                               | Instagram e convite; não ocupa a área fixa do polegar             |

Em 360 × 640, reduzir o álbum para cerca de 120–150 px e os respiros antes de
reduzir texto ou alvos. Meta: ver uma foto reconhecível e pelo menos a primeira
fileira inteira de jogos. Em 320 px ou texto ampliado, aceitar uma coluna e
rolagem vertical. Em 768 px, manter linguagem de telefone com largura de
conteúdo limitada, sem transformar a página em painel de desktop.

Usar grade de duas colunas como direção inicial em telefones comuns, com
largura mínima de card validada em 360 px. Nomes acessíveis continuam completos;
apelidos visuais possíveis: “Quebra-cabeça”, “Memórias”, “Expresso das Fotos”,
“Guirlanda”, “Mosaico em Queda”, “Trinca de Natal”. Não truncar o nome essencial
com reticências. Se um título não couber em duas linhas, ajustar o card ou
adotar uma coluna nesse contexto.

### 2.2 Álbum de fotos e seleção

O álbum mantém altura estável. A imagem central é a foto selecionada; as
laterais sugerem que há mais lembranças. Usar `contain` e passe-partout com
material coerente. Nenhum slideshow pode recortar rostos para preencher o
quadro. Orientações diferentes usam janelas proporcionais dentro da mesma
altura de seção, sem deslocar os jogos durante a troca.

**Primeira entrega:** navegação manual por swipe e botões anteriores/próximos.
Confirmar a troca ao acomodar o slide e apresentar um contorno com pequeno som
de papel. Tocar a foto abre uma folha de visualização; “Usar esta foto” confirma
sem iniciar uma brincadeira. A seleção permanece em memória por sessão e é
reutilizada nas capas. Trocar de sessão limpa seleção, previews e requests
pendentes antes de mostrar novas fotos.

**Slideshow opcional posterior:** opção “Passear pelas fotos”, intervalo inicial
de 6–8 s, controle explícito de pausa e interrupção ao interagir, focar ou
ocultar a página. Separar `previewPhotoId` de `selectedPhotoId`: avançar a
apresentação sozinho nunca altera a foto que será usada no jogo. LOW, economia
de dados e movimento reduzido mantêm navegação manual. A orientação de controle
de rotação segue o [tutorial de carrosséis do W3C](https://www.w3.org/WAI/tutorials/carousels/animations/).

A galeria completa abre em uma folha inferior com título “Suas fotos”, fechar
visível, foco contido, retorno de foco e rolagem própria. Renderizar inicialmente
12 miniaturas e ampliar em blocos dentro da folha; limitar a janela renderizada
se a medição de 120/172 fotos justificar. Um botão “Ver mais fotos” preserva a
alternativa ao observer. Sem arquivos `game` na galeria. O catálogo permanece
na mesma posição ao fechar a folha.

### 2.3 Cards que parecem brinquedos

Cada card é uma superfície única e acionável com arte, nome e verbo. Preferir
um link de navegação real com todo o card clicável, sem botão aninhado. O estado
indisponível deve ter estrutura sem link ativo e explicação legível. Não usar
som em `pointerdown`: ele antecipa a intenção e também ocorre ao começar scroll;
o feedback sonoro confirma somente a ativação efetiva.

| Jogo existente           | Prévia proposta com fotografia                                          | Resposta visual curta                           |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------- |
| Quebra-cabeça            | Pequeno tabuleiro com a foto selecionada dividida em poucas peças       | Duas peças sugerem um encaixe e acomodam        |
| Memórias de Natal        | Duas cartas com espessura e verso de veludo; um par da foto selecionada | Uma carta vira uma vez e revela a lembrança     |
| Expresso das Fotos       | Trem em miniatura com a foto em um vagão e estação ao fundo             | Suspensão comprime e lanterna acende no toque   |
| Guirlanda das Lembranças | Pinho com pequenas molduras e foto principal protegida                  | Dois pontos de luz percorrem a guirlanda        |
| Mosaico em Queda         | Mural de madeira com peças fotográficas em fileira                      | Uma peça acomoda e ilumina a fileira brevemente |
| Trinca de Natal          | Mural 3 × 3 com três lembranças em uma linha                            | Contorno de linha aparece por um instante       |

Essas prévias explicam a ação, sem executar domínio ou montar Phaser. As
fotografias são elementos dinâmicos por cima/por baixo da arte conforme a
janela alpha. Não gerar imagem de cliente com IA, nem gravar foto em pôster
público. A mesma derivada já carregada pode ser reutilizada pelos cards visíveis.

Somente o card ativo ou uma prévia introdutória visível anima de cada vez.
Ao rolar, cards fora da tela ficam estáticos. Não usar `hover` como requisito
de descoberta. Uma introdução automática deve terminar; não repetir seis
demonstrações concorrentes. Remover a barra “Jogar agora” que hoje privilegia
Puzzle. A seleção de foto deixa de criar uma segunda ação principal fixa.

### 2.4 Rodapé do estúdio

Texto proposto: **“Faça suas fotos de Natal no Estúdio Evydência”**, seguido de
“Lembranças que viram brincadeira”. Botão “Conheça nosso Natal” para o site e
link com Instagram por extenso: **@estudioevydenciaa**. WhatsApp permanece como
contato secundário. Usar os dados já registrados em
[decisões de produto](../product/PRODUCT_DECISIONS_2026-08-25.md), com conferência
editorial antes de release; a grafia canônica existente é **Evydência**.

Links externos abrem por toque, preservam a sessão ao retornar e não recebem
token, foto ou parâmetros da sessão. Evitar embeds sociais e pixels de marketing
na área infantil. Não colocar promoção entre o card e o começo da brincadeira.

## 3. Aberturas com profundidade e interação

### 3.1 Estrutura compartilhada

Topo compacto com “Voltar aos jogos” e som no mesmo lugar do Hub. Abaixo, título
e diorama da brincadeira; uma frase ensina a primeira ação. Na região inferior,
CTA “Vamos brincar” com altura alvo de 56–60 CSS px e espaço reservado acima da
safe area. “Trocar foto” fica próximo da foto; compartilhar é secundário e pode
ficar em uma folha de opções. A assinatura do estúdio não disputa o CTA.

Implementar layout em linhas de altura flexível, com `min-height: 100svh` e
adaptação ao viewport dinâmico quando necessário. A área ilustrada é a primeira
a ceder altura. Em texto ampliado, permitir rolagem e manter a ação alcançável,
sem prender conteúdo atrás de um rodapé fixo. As diferenças entre unidades de
viewport estão na [referência CSS da MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length).

Quatro planos: L0 vila desfocada **na arte preparada** e céu; L1 bancada, árvore
e fontes de luz; L2 objeto do jogo e fotografia; L3 até dois detalhes de canto.
Neve fica em L0/L1 e nunca atravessa o retângulo protegido da foto. Espessura,
bevel e sombra de contato pertencem ao objeto; títulos e botões continuam DOM
legível. Não aplicar perspectiva ao texto principal.

### 3.2 Memory como primeira abertura completa

Um pequeno álbum sobre mesa de madeira e três cartas em leque. Duas frentes
mostram a mesma foto da sessão; a terceira exibe o verso aprovado do Memory.
A composição já comunica “par” mesmo imóvel. A capa usa a âncora escolhida;
as demais fotos da rodada continuam sendo decididas pelo contrato do jogo.
Não prometer que o álbum de abertura é o deck completo.

| Momento                       | Acontecimento                                                   | Resposta e limite                                                       |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Chegada                       | Álbum e cartas acomodam; foto entra após decode                 | Entrada até 260 ms; se mídia atrasar, estado de preparação no quadro    |
| Primeira apresentação         | Uma carta vira e revela o par                                   | Sequência única de até 900 ms, interrompível pelo CTA                   |
| Tocar a carta de demonstração | Carta gira e o par recebe contorno                              | Papel + duas notas suaves; não cria partida ou pontuação                |
| Tocar “Trocar foto”           | Folha de fotos da mesma sessão                                  | Retorno mantém título, foco e posição da capa                           |
| Tocar “Vamos brincar”         | Botão comprime imediatamente; objeto acomoda e transição começa | 80–140 ms de resposta; transição visual até 260 ms                      |
| Runtime ainda carregando      | Cena permanece com “Preparando sua brincadeira…”                | Sem percentual fictício; voltar e tentar novamente permanecem possíveis |
| Partida pronta                | Capa sai e o canvas assume                                      | Uma instância; nenhuma música ou animação decorativa residual da capa   |

A demonstração não é um tutorial obrigatório. Movimento reduzido mostra as
duas cartas abertas desde o início e oferece feedback estático. A experiência
continua compreensível com som desligado. As demais capas reutilizam o layout e
políticas; cada jogo recebe uma receita de objeto e gesto própria.

### 3.3 Continuidade entre as telas

O objeto selecionado no Hub reaparece na capa com material, cor e foto iguais.
Usar transição curta de opacidade/transformação com um elemento decorativo
temporário. Medir o custo antes de adotar uma API adicional de transição.
Retorno restaura posição do catálogo e foco no card de origem. Navegação rápida,
voltar durante carregamento e toques repetidos cancelam a apresentação anterior
sem criar dois jogos.

## 4. Partitura de neve, luzes, material e som

### 4.1 Luzes realistas e neve

Realismo das luzes exige fio com gravidade visual, soquete, bulbo de vidro,
núcleo claro e halo quente ancorado. O pinho próximo recebe um reflexo já
preparado; o halo varia suavemente. Um círculo amarelo isolado não basta.
Preparar lâmpada apagada/acesa e halo em textura ou geometria simples estável;
animar opacidade dos grupos, sem recalcular blur ou sombra por lâmpada.

| Efeito                | Receita inicial de produção                                | Limite inicial para ensaio                              | LOW / reduzido                       |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
| Cordão quente         | 12–16 lâmpadas em até quatro grupos dessincronizados       | Variação lenta de 2,8–5,5 s; núcleo continua visível    | Cordão estático com brilho preparado |
| Cintilação            | Microvariação de halo em luz existente                     | Uma região chama atenção por vez                        | Estado estático                      |
| Neve distante         | Flocos pequenos, velocidade distinta e transparência baixa | NORMAL: 12–18 flocos; HIGH: até 24 somente após medição | Sem queda de neve                    |
| Neve próxima          | Poucos flocos maiores apenas nas bordas                    | Até quatro, já incluídos no total; nunca sobre foto/CTA | Ausente                              |
| Pressão de objeto     | Escala curta, sombra e deslocamento de até 2 px            | 80–140 ms; uma resposta por ativação                    | Contorno/cor ou compressão única     |
| Profundidade ao toque | Pequena rotação limitada do objeto                         | Até 2 graus e retorno; cancelada ao rolar               | Sem inclinação                       |
| Confirmação de foto   | Borda marfim/dourada e brilho periférico                   | Até seis partículas finitas, até 420 ms                 | Borda e texto de confirmação         |
| Descoberta opcional   | Pequena estrela tocável acende um ramo                     | Uma resposta finita; fora da foto e dos controles       | Mudança estática                     |

Contagens e tempos de ambiente são **valores de protótipo a medir**, não
orçamentos aprovados de aparelho. Priorizar transformar/opacificar elementos;
ver [guia de animações do web.dev](https://web.dev/articles/animations-guide).
`will-change` só entra onde o perfil comprovar necessidade e é removido após
a interação. Não promover toda a galeria a camadas de GPU.

Pisca significa variação lenta, nunca estroboscópio. Incluir controle “Animações”
em preferências acessíveis em um toque; modo calmo suspende neve, demos e
variações contínuas independentemente de o sistema pedir redução. Verificar
também os critérios de [pausa de movimento](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
e [flashes](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold).

### 4.2 Som em todas as ações que merecem confirmação

“Som em tudo” será tratado como consistência de feedback para ações concluídas.
Scroll, cada floco e cada piscada não emitem som. Sons não se acumulam durante
toques rápidos. O mesmo gesto tem uma voz principal.

| Ação                       | Som proposto                          | Comportamento                                     |
| -------------------------- | ------------------------------------- | ------------------------------------------------- |
| Selecionar fotografia      | Papel fotográfico + nota curta        | Somente ao confirmar nova seleção                 |
| Abrir galeria              | Álbum abrindo                         | 150–250 ms; fechar usa variante suave             |
| Abrir jogo                 | Clique material + sino                | Uma voz; card pressionado imediatamente           |
| Interagir com demonstração | Carta, madeira ou mecanismo do objeto | Variante por família, sem loop                    |
| Começar partida            | Pequena assinatura ascendente         | Curta; não bloqueia carregamento                  |
| Voltar                     | Toque baixo de madeira                | Sem fanfarra de retorno                           |
| Indisponibilidade ou falha | Opcional, discreto                    | Texto claro; nunca buzzer ou punição              |
| Ativar/desativar som       | Confirmação visual                    | Desativar corta as vozes; não toca depois de mudo |

Criar/resumir o contexto de áudio dentro de uma ativação explícita. A primeira
visita é silenciosa até esse gesto; não prometer autoplay sonoro ao abrir o
link. A [MDN sobre autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
documenta essa restrição. Rejeição do áudio nunca impede navegação.

`ShellAudioDirector` terá um contexto sob demanda e buffers pequenos; no máximo
duas vozes curtas e uma música suave durante Hub/capa. Cancelar voz de mesma
categoria, aplicar intervalo mínimo e mixar em volume de telefone. LOW mantém
efeitos essenciais opcionais e omite música. Música de celesta/piano, sem voz,
começa somente após gesto e preferência habilitada.

Preferências globais não incluem dados da sessão: `soundEnabled`,
`musicEnabled`, `motionMode` e `qualityOverride`. Persistência local dessas
preferências é opcional e falha de storage não quebra a aplicação. Na entrada
do jogo, interromper áudio do shell e passar a preferência por contrato tipado;
o jogo mantém seu diretor. Desativar som no jogo atualiza a preferência global
por evento tipado quando o contrato suportar isso. Na saída, sons do jogo
terminam; o shell retoma sua política somente quando estiver ativo e visível.

## 5. Arquitetura e arquivos de implementação

### 5.1 Responsabilidades e contratos

Hub e capa continuam em React. Nenhum motor 3D ou Phaser é necessário para a
primeira entrega dessas páginas. Arte 3D pode ser renderizada offline em camadas
2D e animada com CSS. Essa escolha preserva o carregamento separado do motor,
sem abrir mão de volume e material. Se o protótipo de neve exigir canvas 2D
próprio, essa alternativa precisa de medição e alteração explícita do teste de
zero canvas; a implementação inicial usará um conjunto limitado de elementos
DOM, mantendo a regra atual.

| Dono / arquivo existente                       | Mudança planejada                                                                                         | Novo componente ou contrato sugerido                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/play/src/screens/Hub.tsx`                | Compor título, álbum, grade de jogos e rodapé                                                             | `SessionPhotoAlbum`, `PhotoPickerSheet`, `ChristmasHubScene`                                                |
| `apps/play/src/screens/GameCard.tsx`           | Uma superfície acessível por jogo, prévia própria e estado de disponibilidade                             | `GamePreview`, receita de apresentação por id                                                               |
| `apps/play/src/screens/GameCover.tsx`          | Layout por altura útil e objeto interativo específico                                                     | `GameIntroScene`, `IntroActionDock`                                                                         |
| `apps/play/src/app/AppRouter.tsx`              | Resolver sessão real, disponibilidade, seleção, histórico e preferências                                  | `useSession`, `ShellExperienceProvider`, estado de retorno do Hub                                           |
| `apps/play/src/app/AppServices.ts`             | Compor adaptador de sessão e serviços do shell                                                            | `HttpSessionRepository`, diretor de áudio e observação agregada                                             |
| `apps/play/src/audio/playInterfaceTap.ts`      | Migrar chamadores para política única sem toque duplicado                                                 | `ShellAudioDirector`, tabela de cues e buffers                                                              |
| `apps/play/src/components/StudioSignature.tsx` | Copy, hierarquia e área de toque do rodapé                                                                | Configuração única `studioProfile`                                                                          |
| `apps/play/src/styles.css`                     | Extrair estilos do shell por responsabilidade                                                             | `shell.css`, `hub.css`, `game-intro.css`, `christmas-effects.css`, ou CSS Modules conforme padrão escolhido |
| `apps/play/src/phaser/gameRegistry.ts`         | Separar instalado de publicável e ordenar catálogo                                                        | Política de release por ambiente/sessão                                                                     |
| `packages/platform/src/contracts/index.ts`     | Reutilizar `SessionRepository`, `GameDefinition` e `cover.assetUrl`; evoluir eventos apenas se necessário | Evento tipado de preferência de áudio; contrato de payload validado                                         |
| `packages/theme/src`                           | Tokens realmente usados por Hub e capa                                                                    | Tempo, material, elevação e política comum de efeitos                                                       |
| `tools/asset-factory/src`                      | Aceitar assets de shell com mesma auditoria                                                               | Owner `shell` e raiz explicitamente permitida                                                               |
| `apps/catalog-server/src`                      | Catálogo de sessão e autorização de mídia de jogo                                                         | Rotas e adaptadores server-side, além do HTML/OG existente                                                  |

Criar os componentes de forma incremental, extraindo apenas responsabilidades
que de fato existem. Hub e capa já são dois consumidores de neve, luzes,
preferências e seletor; o objeto de Memory permanece receita específica do app.
`platform` não recebe React/CSS e `theme` não importa jogos. Importar metadados
por entry point de definição; auditar qualquer import do índice completo de um
jogo para preservar a fronteira lazy, inclusive o import atual de constante do
Memory no `AppRouter`.

`cover.assetUrl` já existe: implementar seu consumo e fallback antes de ampliar
o contrato. Um mapa de apresentação em `apps/play` associa `gameId` a pôster,
receita visual e texto curto. Manter cenas e callbacks fora de
`GameDefinition`; um jogo nunca importa outro para reutilizar arte.

Estados explícitos do shell: `session-loading`, `session-ready`,
`session-unavailable`; sobre `session-ready`, Hub, galeria e capa; após começar,
`game-loading`, `game-ready` ou `game-error`. A preferência de som é global;
seleção de fotografia pertence à sessão; hover/pressão/demonstração pertencem
ao componente. Slideshow não controla seleção. Metadados e requests antigos
são descartados por chave de sessão e cancelamento.

### 5.2 Carregamento, prefetch e lifecycle

1. Validar a sessão antes de apresentar fotografias. Reservar a geometria do
   álbum e renderizar primeiro título e estado de preparação.
2. Carregar somente foto atual e vizinhas imediatas em `thumb`/`card`, com
   dimensões declaradas. Uma foto central usa prioridade apropriada; não marcar
   todas as imagens como prioritárias. Decodificar a próxima sem trocar a atual
   antes de estar pronta.
3. Carregar arte dos cards visíveis e um pequeno avanço de scroll. Reutilizar
   URL/derivada existente; não criar seis versões grandes da mesma foto.
4. Prefetch de runtime responde à intenção de abrir um jogo. Selecionar foto
   não deve baixar Puzzle automaticamente. Em LOW/economia de dados, adiar
   módulos pesados até começar; no modo normal, considerar a capa como intenção
   suficiente para antecipar somente o jogo escolhido.
5. Ao começar, dar feedback imediato e manter apresentação de carregamento
   até `PhaserHost` confirmar prontidão. Coalescer ativação dupla e permitir
   voltar durante falha/rede lenta. Não bloquear input durante animação longa.
6. Em folha aberta, scroll fora da cena ou aba oculta, pausar ambiente e música
   conforme política. Listeners de visibilidade, observers e animações têm
   cleanup explícito no unmount; nada atualiza React a cada floco/frame.
7. Ao sair, continuar usando coordenador de montagem, ponte tipada e
   `game.destroy(true)`. O shell não recebe `Scene` ou `Phaser.Game`.

### 5.3 Sessão real e fronteira de produção

O `AppRouter` inspecionado ainda usa fixtures ou `/__local-test/session`.
`SessionRepository.getByToken` já é um ponto de extensão da plataforma.
Implementar adaptador HTTP em `apps/play`; rota proposta, a confirmar com o
servidor: `GET /api/sessions/<token-opaco>`. O backend valida existência,
permissão, expiração/revogação e devolve somente ids opacos, dimensões e URLs
autorizadas de derivados. A rota não passa a existir por ser descrita aqui.

A entrega de cada derivado precisa verificar autorização e pertencimento à
sessão antes de `X-Accel-Redirect`. A infraestrutura atual de OG não prova essa
entrega das variantes `thumb/card/game`. Reutilizar primitivas seguras onde
existirem; não presumir que a prévia social libera acesso ao ensaio inteiro.

Tratar zero fotos, poucas fotos, repetição de ids, mídia removida, token
inexistente/revogado, timeout e resposta inválida. Contar fotos elegíveis únicas
para `minPhotos`. Mídia com erro tem retry finito e exclusão de seleção quando
inelegível; foto substituta só é anunciada quando necessário. Sessão ausente
nunca cai silenciosamente em sessão demo. Falha de foto isolada não apaga o
catálogo inteiro se outras fotos e jogos continuarem utilizáveis.

Produção não serve `/__local-test`, labs, “Prova de Natal” ou seletor de fixtures.
Ocultar card é insuficiente: a rota direta de jogo não liberado também deve
recusar entrada. Disponibilidade pública e disponibilidade por quantidade de
fotos são decisões distintas.

HTML, JSON privado e mídia autorizada recebem políticas de cache compatíveis
com revogação; arte genérica versionada pode ter cache longo. Token e URLs de
foto não entram em analytics, logs de acesso não sanitizados, report de erro ou
link externo. Considerar também logs do proxy para rotas com token. Preservar
preview social genérico e compartilhamento por gesto. Instalação/PWA e cache
offline de fotos ficam fora da primeira entrega; aparência de app deve funcionar
ao abrir o link no navegador.

## 6. Pacote de arte e referências de produção

As referências locais normativas são a
[Bíblia de arte](../experience/christmas/ART_BIBLE.md),
[gramática de cena](../experience/christmas/SCENE_GRAMMAR.md),
[iluminação](../experience/christmas/LIGHTING_BIBLE.md),
[movimento](../experience/christmas/MOTION_BIBLE.md) e
[áudio](../experience/christmas/AUDIO_BIBLE.md). A âncora de estilo existente é
candidata, conforme seu README; não assumir aprovação de todos os seus assets.

Referência de interação: movimento curto que acompanha o gesto e pode ser
interrompido, conforme [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion).
A aplicação proposta é nossa: compressão de card, folha de álbum, retorno à
mesma posição e transição de objeto. Não copiar recursos gráficos ou componentes
de outra marca para parecer nativo.

| Entrega de arte                               | Quantidade inicial                   | Critério de avaliação                                             |
| --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| Prancha de Hub em 390 px e variante baixa     | 2 composições                        | Foto e dois jogos visíveis, cena acolhedora e rodapé discreto     |
| Prancha de abertura Memory, NORMAL e reduzido | 2 estados                            | Par reconhecível sem ler; botão acessível em 360 × 640            |
| Fundo da sala em planos                       | 1 família, 2–3 camadas               | Área calma e baixo contraste atrás da fotografia                  |
| Cordão, bulbos e halo                         | 1 conjunto                           | Vidro, soquete, origem de luz e consistência de temperatura       |
| Molduras do álbum                             | Retrato e paisagem                   | Abertura alpha calibrada, sem borda opaca cobrindo a foto         |
| Objeto representativo por jogo liberado       | 1 conjunto por jogo                  | Silhueta distinta em card pequeno e variante de capa coerente     |
| SFX do shell                                  | 6–8 cues curtos, variações seletivas | Clareza em alto-falante de telefone e ausência de agudo cansativo |
| Música de entrada                             | 1 loop opcional                      | Emenda limpa, volume baixo e arquivo omitido em LOW               |

Escrever um `SCENE_PACKET` do shell antes de adquirir/gerar assets: composição,
papel de cada camada, fotografia dinâmica, janelas protegidas, estados,
partitura e variações de qualidade. Arte de referência não contém cliente ou
foto real. A revisão com as fotos do ensaio ocorre somente localmente.

O manifesto atual exige dono em `packages/games/<id>`. Antes de publicar arte
nova compartilhada, adicionar owner explícito `shell`, manifesto sugerido em
`apps/play/assets/manifest.json`, proveniência em `apps/play/ASSET_PROVENANCE.md`
e raiz permitida `apps/play/public/assets/shell/`. Manter compatibilidade dos
manifestos de jogos, validação de caminhos/hashes/licenças e rejeição de arquivo
público não catalogado. Não criar um jogo falso chamado shell para contornar o
auditor. Deduplicar bytes por entrega física e medir custo por rota.

Arte já autorizada pode fornecer ponto de partida; reuso visual passa por
checagem de coerência e custo. Preparar WebP/PNG com alpha conforme necessidade,
SFX em formatos já suportados e metadados completos. Usar 3D offline ou imagem
gerada apenas para assets candidatos cuja vantagem visual justifique o trabalho;
texto, logotipo, foto e controles continuam camadas separadas.

## 7. Performance, acessibilidade e metas verificáveis

O [contrato de performance](../quality/PERFORMANCE_MEASUREMENT_CONTRACT.md)
ainda não tem orçamento numérico aprovado em aparelho. Os valores abaixo são
**hipóteses de engenharia para a primeira medição**; H6 registra e fixa o
orçamento de release. Não apresentar estimativa de RGBA como memória real de GPU.

| Medida                          | Alvo inicial proposto                                                                       | Como provar / limite                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Descoberta                      | Foto e dois jogos na primeira tela de 390 × 844; primeira fileira em 360 × 640              | Captura e observação de uso; texto ampliado tem critério de acessibilidade próprio |
| Ação da capa                    | CTA de pelo menos 52 px, meta 56–60 px; visível no viewport padrão de 360 × 640             | Geometria e revisão com barras do navegador abertas                                |
| Resposta ao toque               | Primeiro estado visual no próximo frame disponível; objetivo perceptivo abaixo de 100 ms    | Captura de interação em aparelho; duração da animação não é latência               |
| Entrada/retorno de tela         | Animação até 260 ms, cancelável                                                             | Cronometrar transição e repetir toques rápidos                                     |
| JavaScript inicial do Hub       | Candidato: até 180 KiB comprimidos de JS                                                    | Medir build de produção e revisar baseline; excluir motor de gameplay até intenção |
| Primeira tela visual            | Candidato: até 700 KiB de imagens, incluindo a foto atual                                   | Rede fria com variantes reais; não contar só manifesto estático                    |
| Áudio                           | Sem download decorativo antes de gesto; SFX iniciais até 160 KiB; loop separado até 600 KiB | Requests, bytes e formatos efetivamente escolhidos                                 |
| Fotografias residentes no álbum | Atual + duas vizinhas; folha inicia com 12 miniaturas                                       | Inspeção de requests e DOM em 120/172 fotos                                        |
| Texturas do shell               | Estimativa inicial até 24 MiB de RGBA visível/retido                                        | Soma de dimensões decodificadas, registrada separadamente de JS heap/GPU           |
| Fluidez NORMAL                  | Alvo 60 Hz quando aparelho suportar; candidato p95 de delta ≤ 25 ms                         | Três amostras de 30 s em primeiro plano; registrar refresh rate e slow frames      |
| LOW                             | Feedback imediato e rolagem estável; alvo de apresentação ≥ 30 Hz no aparelho de referência | Amostra equivalente sem neve/música/parallax; número não aprovado ainda            |
| Repetição de entrada/saída      | Zero canvas fora de gameplay e zero vozes do dono anterior                                  | Cinco ciclos; observar estabilidade de recursos sem prometer heap idêntico         |

Como objetivo de campo para as navegações, adotar LCP ≤ 2,5 s, INP ≤ 200 ms e
CLS ≤ 0,1 no percentil 75 mobile, conforme [Web Vitals](https://web.dev/articles/vitals).
Essas medidas não foram coletadas nesta análise. Lighthouse sozinho não mede
INP de uso real; transições internas de SPA precisam de medição própria.

Política de qualidade inicial: respeitar economia de dados conhecida, opção
manual e movimento reduzido do sistema. Sem inferir aparelho por fingerprint.
NORMAL é a base; HIGH só acrescenta efeitos medidos. Queda persistente de
fluidez pode sugerir modo leve ou reduzir ambiente, com histerese; não oscilar
perfil a cada frame. Ausência de API de rede/vibração não é falha de produto.

Alvos primários seguem o mínimo de 52 px do projeto; controles secundários
devem ter pelo menos 44–48 px de área confortável. Usar foco visível, nomes
acessíveis, contraste estável, texto redimensionável, ordem de leitura e
alternativa a swipe. Não bloquear pinch zoom. Neve e props usam
`pointer-events: none` e não entram na árvore acessível. Anúncios de seleção
são curtos; não anunciar cada floco, frame ou slide automático.

## 8. Etapas executáveis, dependências e aceite

As caixas registram as etapas do plano. A análise anterior está concluída;
subentregas da primeira fatia não equivalem à conclusão das fases de release.

### H0 — Contrato de produto e baseline (0,5–1 dia)

- [x] Registrar decisão derivada deste pedido: jogos primeiro, álbum compacto,
      assinatura do estúdio, Memory como capa piloto e escopo de release.
- [ ] Listar jogos aptos a publicação a partir de seus gates; separar conteúdo
      de desenvolvimento, inclusive rota direta.
- [ ] Medir build atual do shell e custo de assets; registrar aparelho Android,
      iPhone e condição de rede para comparação posterior.
- [ ] Criar matriz de estado e contrato de apresentação; fixar critérios de
      foto, primeira ação, LOW, som e retorno de navegação.

**Dependência:** nenhuma para iniciar. **Dono:** produto + `apps/play`.
**Aceite:** decisões registradas, catálogo proposto explícito e baseline
reproduzível sem dados privados versionados.

### H1 — Fatia visual com arte produzível (1,5–3 dias)

- [ ] Produzir pranchas do Hub e Memory em 390 e 360 × 640, com espaço de foto
      substituível e layouts retrato/paisagem.
- [x] Demonstrar um card pressionável, um par de cartas, neve em L1 e cordão
      com núcleo/halo; comparar NORMAL e reduzido.
- [ ] Definir `SCENE_PACKET`, seis silhuetas de jogos e cues do shell.
- [ ] Selecionar/revisar candidatos e preparar somente o pacote necessário à
      primeira fatia; registrar proveniência e abrir a extensão de owner da
      fábrica antes de integrar arquivo novo em `public`.

**Dependência:** H0 para critérios; dados reais do backend não bloqueiam
protótipo com fixture segura. **Dono:** direção/arte + `apps/play` + fábrica.
**Aceite:** fotografia e dois jogos reconhecíveis em 390 px; par compreensível
na capa estática; materiais coerentes em telefone, não apenas ampliados.

### H2 — Novo Hub e álbum funcional (2–3 dias)

- [x] Implementar hierarquia, grade, rodapé e uso real de `cover.assetUrl`/receitas.
- [x] Remover prioridade fixa do Puzzle e prefetch provocado só por trocar foto.
- [x] Implementar álbum manual, folha de seleção, confirmação e preservação
      de foto/scroll/foco; separar prévia de seleção.
- [x] Aplicar estados normal, pressionado, focado, indisponível, foto em
      preparação e erro recuperável.
- [ ] Cobrir navegação para todos os jogos liberados e regras de `minPhotos`.

**Dependência:** H1; integração real pode entrar por adaptador depois.
**Dono:** `apps/play`. **Aceite:** da primeira tela ao jogo escolhido em dois
toques (card → começar), com seleção opcional e sem galeria longa obrigatória.

### H3 — Abertura Memory e demais receitas (2–4 dias)

- [ ] Implementar diorama Memory, demo breve, troca de foto e área inferior
      de ação; compatibilizar celular baixo e texto ampliado.
- [ ] Implementar transição Hub → capa → preparação → partida, incluindo
      cancelamento, retry, toque duplo e retorno ao card.
- [ ] Aplicar receitas aos outros jogos que H0 liberar, com copy e objetos
      específicos; validar capa de rota direta.
- [x] Garantir zero Phaser montado em Hub/capas e integração via `PhaserHost`.

**Dependência:** H2 e disponibilidade das artes. **Dono:** `apps/play`.
**Aceite:** Memory ensina o par visualmente, CTA aparece em 360 × 640 e sair
restaura catálogo; cada outra capa demonstra uma ação verdadeira de seu jogo.

### H4 — Ambiente, áudio e conforto mobile (1,5–3 dias)

- [x] Integrar neve limitada, grupos de luz, pressionamento e profundidade.
- [x] Acrescentar globo com rajada, sino com onda de luz e cues de papel/vidro
      por gesto; auditar formatos, proveniência, duração, picos e bytes.
- [x] Sincronizar som entre Hub, capa e os seis jogos sem reiniciar a partida;
      passar movimento reduzido e qualidade ao gameplay.
- [ ] Homologar mixagem, música e políticas de conforto em aparelhos físicos.
- [ ] Implementar política de vozes, desbloqueio por gesto, pausa em
      background e troca de dono entre shell e jogo.
- [x] Suspender efeitos fora da tela e ao abrir folhas; testar LOW, reduzido
      e modo calmo manual separadamente.

**Dependência:** H2–H3; SFX auditados. **Dono:** `apps/play` + `theme`.
**Aceite:** uma confirmação por gesto, nenhum som após mudo/saída e nenhuma
neve sobre foto ou controles; modo calmo continua bonito e compreensível.

### H5 — Sessões e publicação segura no VPS (2–5 dias, estimativa condicionada)

- [ ] Implementar adaptador de sessão e contrato HTTP validado; estabelecer
      a origem dos dados de ensaios no servidor.
- [ ] Implementar/ligar autorização de cada derivado à sessão antes da entrega
      interna; testar revogação, sessão cruzada e ids inválidos.
- [ ] Isolar fixtures, endpoints locais, labs e jogos de desenvolvimento no
      build/roteamento de produção; remover copy técnica da experiência.
- [ ] Configurar domínio HTTPS, rotas diretas, cabeçalhos e cache no VPS;
      preservar OG genérico e sanitização de logs.
- [ ] Provar falhas recuperáveis, sessão vazia/expirada, retorno de background
      e ausência de chamadas de mídia a serviços externos.

**Dependência:** contrato H0; pode avançar em frente técnica própria enquanto
H1–H4 evoluem. **Dono:** `apps/catalog-server` + `apps/play` + infraestrutura.
**Aceite:** duas sessões reais isoladas funcionam no ambiente de homologação;
token inválido não revela conteúdo nem mostra demo; nenhum original é servido.
A faixa de esforço depende do repositório de sessões real, ainda não integrado.

### H6 — Medição e verificação de qualidade (2–3 dias)

- [ ] Rodar matriz visual e funcional da seção 9 com fixtures seguras e
      revisão privada complementar de fotos claras/escuras.
- [ ] Coletar três passagens por perfil em Android e iPhone; registrar rede,
      temperatura percebida, modo de energia e versões.
- [ ] Medir requests, bytes, deltas de frame, latência percebida e repetição;
      fixar budgets de release no contrato de performance.
- [ ] Corrigir regressões de área útil, compreensão, contraste, lifecycle e
      carregamento; rodar `pnpm check:fast` e `pnpm validate`.

**Dependência:** H2–H5 integrados. **Dono:** experiência + engenharia.
**Aceite:** nenhuma pendência P1, orçamento registrado e nenhum efeito sem
fallback; validação automatizada e relatório mobile físico anexados por estado.

### H7 — Homologação e liberação (1–2 dias)

- [ ] Homologar o convite, grafia/contatos do estúdio e lista de jogos da edição.
- [ ] Realizar observação privada de compreensão com famílias autorizadas:
      reconhecer foto, escolher jogo, iniciar, silenciar e voltar sem auxílio.
- [ ] Preparar release imutável, configuração e procedimento de rollback para
      a última versão **já apta**; não usar a demo atual como fallback público.
- [ ] Liberar primeiro a edição validada e acompanhar métricas agregadas no
      VPS; preparar redução de ambiente e retirada individual de jogo por flag.
- [ ] Registrar evidências, decisões e lições; mover o plano para `completed`
      somente quando os critérios de release estiverem cumpridos.

**Dependência:** H6 e ambiente real configurado. **Dono:** produto + infraestrutura.
**Aceite:** links reais abrem e retornam corretamente em celular, catálogo
autorizado funciona e rollback foi ensaiado sem misturar sessões.

As estimativas somam cerca de **13–24 dias úteis de esforço** para a experiência
e integração descritas, considerando os jogos liberados e revisões de arte.
São faixa de planejamento, não compromisso de calendário. Integração com o
sistema real do estúdio e validação em aparelhos podem mudar o caminho crítico.
Uma primeira fatia Hub + Memory deve ser revisável em aproximadamente 4–7 dias
de esforço, antes de produzir todas as variações.

## 9. Matriz de testes e definição de pronto

| Área           | Casos mínimos                                                                                   | Prova exigida                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Viewports      | 360 × 640, 390 × 844, 412 × 915, 430 × 932; 320 px e 768 px como bordas                         | Captura de Hub, cards, álbum, capa e carregamento; ausência de scroll horizontal |
| Fotografias    | Retrato/paisagem, claras/escuras, uma foto, 4, 12, 120 e 172; zero e ids repetidos              | Proporção, elegibilidade, seleção estável e requests limitados                   |
| Gestos         | Swipe, botões alternativos, scroll começando sobre card, toque rápido/duplo, cancelar           | Sem navegação acidental; uma ativação e uma confirmação                          |
| Navegação      | Link direto de capa, voltar do browser, sair do jogo, abrir/fechar folha, retornar do Instagram | Foto, foco e posição preservados; zero canvas fora da partida                    |
| Movimento      | NORMAL, LOW, reduzido do sistema e modo calmo manual                                            | Captura estática + observação de sequência; controle pausa ambiente              |
| Som            | Primeiro gesto, mudo no Hub/capa/jogo, música desligada, áudio recusado, background             | Reprodução local e inspeção de vozes; ausência de erro/bloqueio                  |
| Rede e sessão  | Rede lenta/offline, decode tardio, 404 de foto, timeout, token revogado, troca de sessão        | Estados claros, retry finito, cancelamento e isolamento                          |
| Acessibilidade | TalkBack/VoiceOver, teclado, texto 200%, zoom, foco na folha                                    | Ordem de leitura, ações alternativas e ausência de conteúdo encoberto            |
| Aparelhos      | Android de referência, Android de menor capacidade quando disponível e iPhone/Safari            | Modelo/OS/browser registrados; três repetições por perfil                        |
| Canais reais   | Safari, Chrome Android, links abertos em WhatsApp/Instagram                                     | Safe area, áudio, compartilhar/voltar e restauração de estado                    |
| Release        | Build de produção, servidor real, proxy e catálogo autorizado                                   | Nenhuma fixture/lab público, OG genérico e cache/revogação verificados           |

Testes novos devem proteger comportamento: adaptador de sessão, seleção,
eligibilidade, política de áudio, preferências, navegação e cancelamento. Não
escrever testes que apenas contem lâmpadas ou repliquem constantes CSS.
Playwright cobre fluxos e requests; a aprovação de material, fotografia e neve
exige inspeção visual. Os projetos atuais chamados iPhone/iPad usam Chromium;
seus nomes não constituem evidência de Safari/WebKit.

Para cada fatia: teste focal e revisão visual; consolidar `pnpm check:fast`.
Antes de handoff/release: `pnpm validate`, auditoria de assets e mapa do repo
atualizado. Usar fixtures seguras nos testes automatizados; capturas de fotos
do ensaio permanecem em evidência privada. Se houver falha preexistente no
checkout, registrá-la com origem e impacto sem marcar gate como aprovado.

**Pronto para produção** significa: a criança reconhece a própria foto e a
primeira ação rapidamente; jogos são distinguíveis visualmente; todas as ações
funcionam com som/movimento reduzidos; fotos vêm da sessão autorizada; nenhum
recurso fica ativo depois de sair; release tem evidência física e rollback.
Não basta o build compilar ou a página parecer bonita em uma captura.

## 10. Evoluções posteriores e decisões ainda abertas

Depois da primeira edição validada: slideshow opcional, pequenas descobertas
na decoração, variações sazonais da sala e uma opção de instalação se houver
benefício demonstrado. Giroscópio, 3D em tempo real, grandes personagens
animados e galeria offline exigem avaliação própria de custo e não entram no
caminho crítico deste plano.

Não é necessário resolver tudo isso para começar H0–H2. Antes de H5/H7, faltam
dados concretos: fonte real do catálogo de ensaios, domínio definitivo,
aparelhos de referência, lista final de jogos liberados e assets finais de marca
se houver logo específico. Os contatos existentes servem de base editorial.
Pranchas e fatia navegável tornam as escolhas visuais concretas antes da revisão
de produção; este documento não afirma que as artes futuras já estão aprovadas.
