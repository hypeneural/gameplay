# Guirlanda das Lembranças — proposta de produto e plano de implementação

**Estado:** selecionada pelo proprietário em 2026-09-04 e implementada como slice local registrado. O domínio, runtime, assets catalogados e efeitos principais existem; revisão visual mobile, matriz de viewport e `pnpm validate` ainda são gates de liberação.

**Id proposto:** guirlanda-das-lembrancas<br>
**Nome para a família:** Guirlanda das Lembranças<br>
**Frase de capa:** “Pendure suas fotos e acenda a noite de Natal.”

## Decisão de revisão visual — 2026-09-04

A referência aprovada pelo proprietário é uma guirlanda vertical de diorama
realista: medalhões-foto, moldura hero de madeira, luz quente, seis indicadores
circulares no HUD e uma trilha dourada que termina em um encaixe. A revisão
privada do slice identificou dois P2 de acabamento em relação a essa direção:
o progresso ainda era uma frase funcional e o fio de encaixe não possuía uma
origem visual em movimento. A implementação desta revisão mantém a foto como
primeiro plano e altera somente a apresentação local:

- o progresso passa a seis luzes-lembrança com estado apagado/aceso e pulso
  finito no novo encaixe;
- cada estrela ganha aro de latão e miolo de nogueira, aproximando o material
  de enfeite físico da referência;
- depois do snap da moldura, uma única luz dourada percorre uma curva externa
  até o suporte e dispara o burst já orçado, sempre fora da foto;
- LOW e movimento reduzido mantêm moldura, posição, contraste e progresso,
  mas não criam o emissor, a trilha animada ou o burst.

Não será adicionado brilho de tela inteira, neve em loop, filtro sobre foto,
asset externo ou áudio novo nesta iteração. Assim a referência informa a
qualidade sem substituir a mecânica responsiva, a privacidade ou o orçamento
do produto.

## Decisão de revisão de molduras e jornada — 2026-09-04

Uma segunda revisão visual comparou a referência aprovada com o canvas atual
em celular e inspecionou, em ambiente privado, nove fotografias autorizadas
em diretório local autorizado. O corpus contém retratos de proporção 0,714 e
paisagens de proporção 1,400; ele não é copiado para `public`, manifesto ou captura
versionada. A constatação é que uma janela central sempre retrato transformava
paisagens em cartões com passe-partout excessivo, enquanto a moldura em
retângulos de runtime não tinha a materialidade, a luz de contorno ou a alça
visíveis na referência. A barra genérica do shell também consumia palco útil
em 390 px.

A decisão de produto desta passagem é:

- o palco da Guirlanda preenche a tela móvel; a saída segura vira um controle
  compacto e a ação de compartilhar permanece na conclusão, não disputa os
  primeiros segundos da brincadeira;
- a foto central escolhe moldura de retrato ou paisagem a partir do metadado
  já autorizado e usa janela interna proporcional, sem `cover`, filtro ou
  ornamento sobre os pixels da lembrança;
- a moldura hero ganha madeira, latão, alça de veludo e luzes preparadas em
  assets separados. Medalhões pequenos continuam leves e legíveis;
- a caixa inferior deixa de ser uma composição de retângulos e usa um prop
  alpha de nogueira, veludo e laço dourado; ela ancora profundidade abaixo do
  palco sem receber foto, texto, gesto ou dado de sessão;
- tocar uma lembrança já pendurada abre uma visualização proporcional e um
  retorno explícito. Isso transforma a guirlanda construída em álbum vivo,
  sem criar pontuação ou resposta errada;
- a luz de confirmação sai do gancho recém-preenchido para a próxima intenção
  possível. Qualquer estrela vazia continua válida; a trilha convida, não
  impõe uma sequência secreta;
- pausa passa a ser uma camada com retorno explícito, em vez de apenas cobrir
  a cena.

Os novos rasters não recebem fotos de cliente. Eles foram gerados sem pessoas
ou texto, recortados localmente para alpha e registrados com hash,
proveniência e orçamento antes de entrarem na Scene.

## Decisão P1 — abertura física da moldura — 2026-09-04

Uma captura móvel de conclusão revelou que a camada creme da fotografia
ultrapassava o início transparente da moldura hero, sobretudo acima do arco de
retrato. Isso é um defeito P1: a foto perde a ilusão de estar encaixada em uma
peça física. A correção não adiciona máscara de WebGL, filtro ou recorte da
foto. Ela calibra, por orientação, uma janela retangular inteiramente contida
na abertura alpha real do asset; o passe-partout passa a ter exatamente essa
janela, e a derivada continua proporcional dentro dela com um inset interno.

A verificação obrigatória é privada: repetir a matriz 390, 412, 430 e 768 px
com as derivadas autorizadas de retrato e paisagem, e rejeitar qualquer pixel
claro fora do aro de madeira/latão. Fotos originais, nomes e caminhos não entram
no browser, repositório ou evidência versionada.

Enquanto uma lembrança está selecionada, a zona da moldura hero recua abaixo
das zonas das estrelas. Assim, toda estrela continua tocável mesmo quando uma
moldura paisagem ocupa mais altura; o mesmo Zone permanece o alvo de origem do
arraste que já começou, e volta à frente ao revelar a próxima lembrança.

## 1. Decisão de produto selecionada

Esta é uma brincadeira de construção tátil, não mais um jogo de comparar fotos. O vento de Natal deixou os enfeites-lembrança fora da guirlanda: a criança escolhe uma fotografia da sessão, segura seu enfeite e o pendura em um espaço luminoso. Cada colocação deixa a guirlanda mais viva; ao terminar, a família vê uma composição natalina feita das suas próprias fotos.

| Jogo               | Verbo principal                  | Papel da foto                   |
| ------------------ | -------------------------------- | ------------------------------- |
| Puzzle Swap        | trocar                           | imagem a recompor               |
| Memórias de Natal  | descobrir pares                  | carta a lembrar                 |
| Trinca de Natal    | marcar casas                     | ficha de partida                |
| Expresso das Fotos | encontrar                        | pista e destino                 |
| Mosaico em Queda   | mover/girar                      | lembrança progressiva           |
| **Guirlanda**      | **escolher, segurar e pendurar** | **enfeite físico e recompensa** |

A primeira versão deliberadamente não pune. Uma foto pode ir para qualquer espaço vazio: a intenção é montar uma lembrança bonita, não testar velocidade nem impor uma resposta arbitrária. Se a pessoa soltar fora de um espaço, o enfeite volta ao suporte com naturalidade e a próxima estrela vazia dá uma dica. Tocar em um enfeite já pendurado amplia a foto de maneira segura para que ela nunca vire uma miniatura decorativa sem importância.

### Creative Slice Card

| Campo                     | Decisão proposta                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fantasia                  | Uma guirlanda de pinho mágico está apagada; cada fotografia pendurada acende uma parte da noite.                                                                                          |
| Leitura nos primeiros 5 s | Foto âncora grande → frase “Pendure a sua lembrança” → um enfeite e um espaço dourado livre.                                                                                              |
| Verbo da criança          | Tocar na foto e depois na estrela; arrastar é um atalho equivalente.                                                                                                                      |
| Objeto hero               | Guirlanda volumétrica de pinho, fita de veludo e luzes âmbar, vista como diorama frontal.                                                                                                 |
| Duração                   | A rodada completa normalmente ocupa 2–4 minutos, sem relógio eliminatório. Uma criança que quiser apenas montar rapidamente continua podendo concluir antes; o ritmo não é uma exigência. |
| Vitória                   | A âncora volta grande ao centro, cercada pela guirlanda preenchida; a celebração acontece ao redor dela e termina sozinha.                                                                |
| Próxima ação              | “Brincar de novo”, “Ver outros jogos” e “Compartilhar” são fornecidos pelo shell seguro.                                                                                                  |

### Modelo de interação: uma construção que parece jogo

O diferencial não será colocar uma foto em um ponto sem consequência. Cada uma
das seis lembranças passa por uma batida física curta e compreensível:

1. **Revelar:** o lacre dourado externo da moldura se abre e deixa a foto,
   já grande no centro, aparecer. O lacre nunca cobre a imagem.
2. **Segurar:** um toque seleciona a moldura; um arraste iniciado no mesmo
   objeto a retira diretamente da mesa de montagem.
3. **Pendurar:** a criança escolhe uma estrela vazia por toque ou solta a
   moldura sobre ela. A foto ganha uma casa visível, não desaparece em um
   inventário.
4. **Acender:** o encaixe energiza apenas a pequena lâmpada e o trecho de fio
   físico associados àquele suporte. A luz viaja do encaixe para o próximo
   suporte, indicando o próximo gesto sem texto longo.
5. **Recordar:** a qualquer momento, um toque em foto já pendurada a traz para
   primeiro plano em uma visualização proporcional, com retorno explícito.
6. **Completar:** depois da última luz, a fotografia âncora deixa seu medalhão
   e ocupa o centro da guirlanda; as demais permanecem visíveis na volta.

É uma brincadeira de construção com causa e efeito, e não um desafio de
velocidade disfarçado. A segunda interação de cada foto é opcional: a criança
pode tocar para recordar, mas nunca precisa memorizar, comparar ou acertar uma
cor para continuar.

## 2. Como a IA entra — e como ela não entra

Usar IA é apropriado para chegar a um visual natalino 2.5D rico e próprio. Ela deve produzir a prancha de estilo e os poucos objetos raster materiais: a noite de fundo, a guirlanda, a caixa de onde vem o enfeite e a moldura física. Não se deve pedir uma única captura de tela de jogo pronta, pois essa imagem mistura camadas, botões e foto em uma textura rígida; depois não há como responder ao toque, adaptar para outra tela ou proteger a fotografia.

| Pode vir de geração com IA, após revisão                                | Deve ser criado/preparado como componente de jogo                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| cenário L0/L1, pinho, fita, caixa, moldura-material e referência de luz | posições de encaixe, hit areas, fundo de foto, texto, HUD, pausa e som               |
| uma base e um primeiro plano da guirlanda, separados                    | PhotoSurface proporcional, máscara de recorte, lógica de estados e layout responsivo |
| referência para latão, veludo e neve                                    | brilho de slot, sombra de arraste, VFX e feedback LOW/reduzido                       |
| props estáticos não interativos                                         | animação, colisão, arraste e frames com continuidade temporal                        |

Nenhum prompt recebe foto real, nome, sessão, URL, logotipo ou pessoa. A foto de cliente só entra como derivada autorizada em tempo de execução. A geração é uma fonte de referência e matéria-prima do projeto; antes de uma imagem entrar no navegador, ela precisa de revisão humana, preparo com alpha, proveniência, hash, dimensões, orçamento e entrada no manifesto.

O visual “3D” proposto é diorama 2.5D, não renderer 3D em tempo real: camadas preparadas, sombras, pequenas variações de escala e oclusão simples dão profundidade com custo baixo. Não usar câmera 3D, filtro contínuo, bloom de tela inteira, luzes sincronizadas nem física de cordas.

## 3. Direção de arte

### A cena vista no telefone

Em 390 × 844 CSS px, a leitura precisa seguir esta ordem:

```
foto atual / ação principal
        ↓
guirlanda e espaço pronto para receber o enfeite
        ↓
instrução curta e progresso
        ↓
cenário de noite, presentes e neve de fundo
```

- **L0 — noite distante:** céu azul profundo, pinheiros suaves e poucas estrelas; nenhum detalhe forte atrás da área da foto.
- **L1 — lugar acolhedor:** janela ou varanda de cabana, uma lanterna de luz âmbar e a silhueta da guirlanda. Essas fontes justificam a luz quente.
- **L2 — lembrança e brincadeira:** foto atual em moldura de latão fosco, guirlanda, espaços vazios, progresso e instrução. É o único plano com contraste e alvos interativos fortes.
- **L3 — acabamento discreto:** laço no topo e, no máximo, um ramo ou presente em canto inferior. Não há elemento L3 sobre fotografia.

A primeira fotografia fica no **centro livre da guirlanda**, não pequena em uma
bandeja no rodapé. A caixa de lembranças aparece só como a origem material da
moldura, abaixo do palco central. Assim, em qualquer ponto da rodada, a foto
atual é o primeiro elemento que o olhar encontra.

A guirlanda é frontal, com volume sutil e sombra macia atrás. Ela tem pinho
irregular, bagas discretas, fita vermelho-framboesa, luzes já preparadas na
textura e seis suportes de latão. Os suportes são posições do jogo desenhadas
em código sobre o asset; assim continuam grandes, precisos e responsivos.

### Planta de composição em 390 × 844

| Faixa vertical | Conteúdo                          | Regra de toque/leitura                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| 16–72          | progresso “3 de 6”, som e pausa   | controles secundários de 44 px, isolados da arte                               |
| 76–118         | uma instrução de uma linha        | faixa opaca própria; nunca texto sobre foto                                    |
| 118–588        | guirlanda e palco central da foto | aro externo com slots; foto atual no centro com mínimo de 156 px no menor lado |
| 594–800        | caixa/origem e retorno contextual | nunca competir com a foto; pode reduzir em telas curtas                        |
| 800–844        | respiro e safe area               | nenhum alvo importante escondido pelo browser                                  |

Cada estrela pode parecer pequena (44–52 px de arte), mas recebe zona de toque
retangular de pelo menos 72 × 72 CSS px. As zonas vizinhas não se sobrepõem em
390 px. Esse alvo deliberadamente excede os mínimos de acessibilidade e torna
o gesto confortável para mãos infantis, não apenas tecnicamente possível.

As fotos são montadas em medalhões retangulares de madeira clara e latão. Há silhuetas físicas para retrato, paisagem e quadrado, mas todas usam contain: a foto preserva inteiramente a proporção dentro de passe-partout calmo. Nenhum rosto recebe estrela, neve, laço, sombra ou filtro de cor.

### Paleta e materiais

| Papel        | Direção                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| Profundidade | azul-noturno, azul aço e neve azulada, de baixo contraste                |
| Mundo físico | pinho escuro, madeira de nogueira e feltro verde                         |
| Convite      | vermelho-framboesa e fita de veludo, nunca rosa elétrico                 |
| Confirmação  | dourado fosco/âmbar, sempre com fonte visível de luz                     |
| Foto         | sem tint, blur, shader, correção destrutiva ou partículas sobre a imagem |

Não há personagem no primeiro corte. Uma rena ou elfo acrescentaria uma segunda figura de atenção sem ajudar o gesto.

## 4. Pacote de prompts para direção e assets

Os prompts são receitas de geração. Começar pelo quadro mestre para aprovar a família, não para entrar no runtime. Depois, gerar componentes separados usando a referência aprovada. Não aprovar uma família porque um resultado ficou bonito no desktop: revisar cada candidato sobre foto sintética segura em 390 px.

### Sufixo de segurança comum

Acrescentar a todos os prompts:

```
Sem pessoas, crianças, rostos, mãos, fotografia real, texto legível, letras,
números, logotipos, marcas, watermark ou interface. Não colocar nada no centro
reservado para fotografia. Sem néon, roxo mágico, lasers, bloom duro, estética
de cassino, fundo lotado ou elementos cortados nas bordas úteis.
```

### P-01 — prancha mestre de estilo (referência, não runtime)

```
Prancha de direção de arte para um jogo mobile natalino em retrato, 390 por 844
como composição de referência. Diorama 2.5D premium, frontal, de uma noite de
inverno acolhedora. L0: céu azul-noturno, vila e pinheiros discretos. L1:
janela de cabana com luz âmbar suave. L2: uma grande guirlanda volumétrica de
pinho escuro, fita de veludo vermelho-framboesa e latão dourado fosco, com
espaços de medalhões ao redor e uma área central limpa para uma foto. L3:
apenas um laço no topo e um presente discreto em um canto. Materiais táteis de
pinho, madeira, feltro, veludo e neve; sombras macias, luzes preparadas, alto
contraste apenas para a área de jogo. A cena deve parecer cara e realista como
um brinquedo de Natal fotografado em estúdio, mas lúdica e calma.

[usar o sufixo de segurança comum]
```

**Aprovação esperada:** uma captura ainda comunica “guirlanda”, “lugar de Natal” e “espaço para as fotos” sem animação.

### P-02 — fundo L0/L1 preparado

```
Asset de fundo vertical 2:3 para jogo mobile, câmera frontal fixa. Interior
suave de uma varanda de cabana natalina à noite, olhando para uma janela com
céu azul profundo, pinheiros e neve distante. Luz âmbar baixa e localizada na
janela e em pequena lanterna lateral. Deixar 62 por cento centrais da imagem
calmos, escuros e livres para guirlanda e fotos interativas; concentrar detalhes
nos cantos e na faixa superior. Materiais realistas de madeira escura, vidro
levemente embaçado e neve, estilo diorama 2.5D premium, sem perspectiva
agressiva e sem objetos no primeiro plano.

[usar o sufixo de segurança comum]
```

**Preparo:** exportar para WebP 1024 × 1536 depois de revisar o safe crop. Ele permanece em LOW e movimento reduzido por fazer parte da leitura da cena.

### P-03 — corpo traseiro da guirlanda

```
Objeto isolado para jogo mobile: guirlanda circular de pinho natural e denso,
vista frontal quase ortográfica com volume 2.5D leve. Ramos de pinho verde
profundo, pequenos frutos vermelhos discretos, cordão de luzes âmbar apagadas,
cinco ou seis pequenos suportes de latão distribuídos pelo aro. Centro
completamente vazio e limpo; contorno externo regular o bastante para recorte.
Material premium de brinquedo artesanal, pinhas pequenas e sombra de contato
macia. Fundo neutro uniforme, sem mesa, parede ou enfeites pendurados.

[usar o sufixo de segurança comum]
```

**Preparo:** recortar e limpar alpha manualmente; não confiar no alpha de geração sem inspeção. O asset traseiro fica atrás das molduras-foto.

### P-04 — ramos de primeiro plano da guirlanda

```
Coleção isolada de poucos ramos de pinho que pertencem exatamente à mesma
guirlanda artesanal natalina de pinho escuro e detalhes de latão fosco. Vista
frontal, ramos curvos para topo esquerdo, topo direito e base, com pontas
suficientes para criar oclusão discreta sobre a borda de moldura, nunca sobre
sua área interna. Volumes suaves de diorama 2.5D, sombras curtas, silhuetas
limpas e fundo neutro uniforme.

[usar o sufixo de segurança comum]
```

**Uso:** no máximo dois agrupamentos ativos por tela. Os ramos ficam à frente da guirlanda, mas a zona da foto fica livre.

### P-05 — moldura universal de foto-enfeite

```
Objeto isolado de moldura física de porta-retrato natalino para pendurar em
guirlanda, vista frontal, madeira clara e latão dourado fosco, cantos
arredondados, pequena alça de veludo vermelho no lado externo. Janela interna
grande, lisa, completamente vazia e retangular para receber foto sem recorte;
a moldura não possui vidro reflexivo forte, texto ou desenho no centro.
Elegante, acolhedora, tátil, realista como miniatura de alta qualidade, fundo
neutro uniforme e bordas completas visíveis.

[usar o sufixo de segurança comum]
```

**Variações necessárias:** retrato, paisagem e quadrado. A primeira geração fixa material e luz; as duas seguintes usam a referência e mudam apenas a proporção externa. Não gerar as três em uma mesma prancha para uso direto: cada uma precisa de contorno, sombra e pivô próprios.

### P-06 — caixa de lembranças (suporte da foto atual)

```
Objeto isolado de pequena caixa de presentes aberta, vista frontal, feita de
madeira de nogueira e veludo verde-pinho, fita vermelho-framboesa solta nas
laterais, interior vazio e amplo para acomodar moldura de foto. Estilo
brinquedo-diorama premium, material físico detalhado, luz âmbar suave vinda de
cima, sombra curta e silhueta simples. A caixa deve parecer suporte, não botão;
sem cartão, texto, etiqueta, pessoa ou fotografia. Fundo neutro uniforme.

[usar o sufixo de segurança comum]
```

A caixa fica abaixo da guirlanda, atrás da transição de chegada. A foto sai dela,
sobe ao palco central e permanece protagonista até ser pendurada. A foto vem da
derivada autorizada e é composta pelo Phaser; nunca é parte dessa imagem.

### P-07 — laço hero e prop de canto

```
Objeto isolado de grande laço de veludo vermelho-framboesa para o topo de uma
guirlanda natalina artesanal, fita com textura realista, bordas macias,
pequenos fios dourados foscos, vista frontal e sombra de contato curta. Deve
deixar centro e parte inferior livres; aparência de diorama premium, sem texto,
símbolos, sinos enormes ou brilho agressivo. Fundo neutro uniforme.

[usar o sufixo de segurança comum]
```

O presente de canto é opcional e só é gerado depois que o slice provar que a caixa atual não basta para contar a história.

### P-08 — referência de estado de vitória

```
Referência de composição vertical para vitória de jogo mobile natalino. Uma
guirlanda de pinho artesanal já preenchida por seis porta-retratos vazios,
proporcionais e com espaço interno limpo; no centro, uma moldura maior vazia
que destaca a lembrança principal. Noite azul, luzes âmbar pequenas e assinadas
por uma janela; celebração apenas em volta externa da guirlanda com poucas
estrelas douradas finitas. Composição frontal, foto-primeiro, diorama 2.5D
realista e acolhedor.

[usar o sufixo de segurança comum]
```

Essa saída é somente referência de layout; a vitória real compõe foto, moldura, slot e efeito separadamente.

### O que não precisa de prompt raster

- Pontos de encaixe, halos e contornos: círculos, arcos e gradientes leves desenhados por código/SVG; assim têm tamanho correto e funcionam em LOW.
- Neve e poeira dourada: sprites simples ou vetores próprios, emitidos uma única vez e fora das zonas protegidas.
- HUD, ícones, progresso e ações: componentes locais em português, nunca texto gerado dentro de imagem.

## 5. Fotos, seleção e leitura

Definição implementada: minPhotos 1, recommendedPhotos 6, photoSelection subset e suporte a orientação mista.

| Fotos autorizadas | Experiência honesta                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1                 | modo descoberta: um enfeite, uma estrela e vitória íntima; não simula variedade inexistente                           |
| 2–3               | mini-guirlanda com os espaços correspondentes                                                                         |
| 4–6               | rodada normal, com todos os enfeites selecionados                                                                     |
| 7 ou mais         | seleciona deterministicamente seis fotos, sempre incluindo a escolhida no Hub e favorecendo diversidade de orientação |

O plano de domínio recebe somente identificador seguro, posição de catálogo e orientação. Ele começa pela âncora e, com Random injetado, escolhe no máximo cinco complementares. Em rodada normal, carrega uma derivada game para âncora/vitória e cinco card para outros enfeites. Não carrega todas as fotos de sessão extensa, não lê pixels no domínio e nunca expõe original, path, nome de cliente ou URL de autorização em logs.

A foto atual aparece grande no palco central, no mínimo 156 CSS px no menor lado
em 390, antes de ser pendurada. A caixa é apenas sua origem narrativa. Na
guirlanda, tocar no medalhão abre visualização proporcional curta com ação
“Voltar à guirlanda”, de alvo grande. Isso mantém a brincadeira foto-primeiro
mesmo com seis lembranças visíveis.

## 6. Mecânica e jornada da criança

### Contrato de interação em uma colocação

```
foto chega ao palco central
       ↓ toque seleciona OU arraste começa no mesmo objeto
foto ganha elevação e fica sob o dedo
       ↓ toque em estrela vazia OU soltar sobre ela
foto encaixa; luz local e fio físico respondem
       ↓ próxima foto surge; a nova estrela torna-se a intenção visível
```

1. **Chegada (0–260 ms).** A moldura atravessa apenas a curta distância da
   caixa até o palco central e acomoda. A instrução diz “Pendure esta
   lembrança”; o primeiro slot livre tem luz dourada estática e contorno
   contrastante.
2. **Um objeto, dois gestos.** O objeto central é a única entrada principal.
   Um toque curto o seleciona; mover além do limiar inicia arraste. Isso evita
   dois controles concorrentes e deixa claro que a própria foto é o brinquedo.
3. **Colocação por toque.** Com foto selecionada, tocar uma estrela vazia
   inicia o encaixe. O slot é um alvo físico grande, não um pixel na ponta de
   um ramo.
4. **Atalho por arraste.** O dedo leva a moldura diretamente, sem lag,
   interpolação ou partículas. Ao entrar em zona livre, só o anel externo do
   slot muda de estado. Ao soltar, o controlador escolhe aquele slot apenas se
   ele ainda estiver vazio.
5. **Tentativa gentil.** Soltar fora ou tocar slot preenchido devolve a
   moldura ao palco central em até 180 ms e mostra uma vez “Escolha uma estrela
   vazia”. Não há X, vermelho, buzzer, perda de tempo ou foto sumida.
6. **Encaixe (até 420 ms).** O input da moldura fica bloqueado somente durante
   o snap. A moldura chega ao suporte primeiro; então o aro de latão ganha luz
   breve, o trecho de fio até a próxima lâmpada se ilumina e partículas nascem
   fora da área da foto. A rodada avança antes de qualquer efeito decorativo
   terminar.
7. **Recordar.** Tocar foto já pendurada abre a visualização proporcional. O
   botão “Voltar à guirlanda” fica disponível imediatamente, portanto a pessoa
   não espera o fim de uma animação para recuperar o controle.

O GarlandInputController usa um único pointer ativo por rodada. A moldura é um
Container com tamanho explícito e área geométrica retangular; os slots são Zones
invisíveis de 72 px e drop zones retangulares. topOnly permanece ligado: foto,
slot e HUD são tratados por handlers do objeto e impedem propagação para o
canvas. Não usar teste pixel-perfect no pinho ou na moldura, pois a textura
irregular não deve reduzir precisão nem custo de toque.

O limiar inicial a provar em telefone é 16 CSS px e 200 ms. Ele separa toque
de arraste sem fazer a criança “segurar” para selecionar; o toque–toque continua
completo se o limiar não for atingido. G4 mede a taxa de cancelamento acidental
em 390 e pode ajustar esses valores somente como tuning documentado.

Após sete segundos sem avanço, a dica destaca foto selecionável e primeiro slot
livre em sequência. Ela não movimenta a foto nem faz colocação sozinha.

### Estados puros propostos

```
entering
  → awaiting-photo
  → photo-selected | dragging-photo
  → placing
  → placement-confirmed
  → awaiting-photo | completed

viewing-photo é apresentação sobreposta e não altera a rodada.
paused interrompe timers e áudio, preservando estado puro.
```

O domínio usa photoId, slotId, progresso e efeitos semânticos; ele não conhece
Phaser, imagem, URL, áudio, relógio real ou coordenada de ponteiro. As entradas
selectPhoto, beginDrag, placeSelectedPhoto e resolvePlacement aceitam slot
vazio e guardam uma época de interação. Eventos de ponteiro atrasados, de
animação anterior ou de resize não conseguem colocar a mesma foto duas vezes.
Isso torna replay, pausa e resize previsíveis.

## 7. Movimento, feedback e efeitos

O movimento precisa comunicar matéria e consequência, nunca servir como papel de
parede. O elemento em movimento é a moldura e o brilho fica em volta dela; a
fotografia não gira, não recebe filtro, não oscila e não é usada como textura
para efeito.

| Batida         | Tempo máximo    | Movimento e material                                                                       | Regra de controle                                                |
| -------------- | --------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Chegada        | 260 ms          | caixa abre 6 px; moldura sobe ao palco com Cubic Out e sombra de contato                   | primeira interação fica ativa logo que a foto acomoda            |
| Seleção        | 120 ms          | borda dourada aparece em 80 ms; contêiner visual cresce até 1,04 e estabiliza              | tocar outra vez cancela; não há yoyo                             |
| Arraste        | duração do dedo | posição é escrita diretamente pelo evento de drag; sombra fica 8 px abaixo                 | nunca tweenar x/y enquanto o dedo escreve x/y                    |
| Hover de slot  | imediato        | aro externo muda de contraste e luz estática, sem mover a foto                             | somente um slot realçado por vez                                 |
| Snap           | 180 ms          | moldura vai ao centro do slot com Cubic Out; ramo frontal faz oclusão só na borda          | input da moldura bloqueado até o fim                             |
| Luz da memória | 360 ms          | lâmpada próxima cresce em alpha e pequeno brilho percorre o fio ao próximo slot            | input da próxima foto pode entrar após snap; não espera o brilho |
| Retorno gentil | 180 ms          | moldura retorna ao centro; contorno do slot livre reaparece uma vez                        | nenhum shake, bounce agressivo ou som punitivo                   |
| Dica           | 900 ms, uma vez | contorno da foto e do slot surgem em sequência; nada se move de lugar                      | não repete automaticamente                                       |
| Vitória        | 1,2 s           | âncora sobe ao painel central, seis luzes fazem cascade de 50 ms e estrelas saem para fora | saída e pausa interrompem na hora                                |

O diretor de apresentação usa tweens finitos, sem persistência. Cada
confirmação é uma cadeia curta e nomeada: snap → luz → próximo cartão. A cadeia
tem callback final que verifica a época atual antes de liberar estado; resize,
pausa ou saída invalidam a época e não podem disparar vitória tardia. Nenhum
tween é global, e nenhum é usado como laço ambiente.

### Efeitos visuais: poucos, físicos e fora da fotografia

| Efeito              | Gatilho                           | Limite NORMAL                                   | Posição protegida                                | LOW / movimento reduzido                          |
| ------------------- | --------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| brilho de suporte   | pointer entra ou foto selecionada | um halo estático e uma mudança de borda         | ao redor do slot, nunca na foto                  | borda de alto contraste, sem halo                 |
| poeira dourada      | snap concluído                    | 6 partículas, 380–460 ms                        | lado externo do aro                              | não criar emitter; mostrar ponto dourado estático |
| fio de luz          | colocação aceita                  | um percurso de 220–300 ms até o próximo suporte | linha do aro, atrás das molduras                 | fio já aceso, sem percurso                        |
| neve distante       | somente repouso NORMAL            | no máximo 8 partículas lentas, sem follow       | L0/L1, longe do centro e HUD                     | omitida                                           |
| estrelas de vitória | conclusão                         | 12 partículas, até 800 ms                       | para fora da guirlanda e acima do painel central | omitidas; manter foto e mensagem                  |

O runtime cria o emitter de confirmação com emitting false e usa apenas burst.
Ele nunca inicia fluxo por frame, nunca segue uma foto durante arraste e não
depende de GravityWell, pós-FX ou textura grande. A explosão é disparada somente
depois de a moldura estar estacionada; portanto o primeiro quadro de
confirmação é sempre a foto no lugar. Em LOW, o emitter nem é criado.

Não há parallax, zoom de câmera, tremor de câmera, rotação contínua, névoa
animada ou luz estroboscópica. Além de manter a foto clara, isso respeita a
preferência de movimento reduzido: o estado estático continua comunicando
seleção, posição, acerto e vitória.

## 8. Som, música e haptics

Um gesto recebe um único som principal. A camada de luz não pode transformar
cada colocação em três sinos sobrepostos; ela entra como variação do mesmo cue
de encaixe quando o soundscape estiver livre.

| Cue               | Papel e duração alvo                                         | Volume inicial | Regra de mix                                      |
| ----------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------------- |
| garland-tap       | madeira/papel macio, 60–120 ms                               | 0,34           | só em botão ou toque sem seleção anterior         |
| garland-lift      | sino de veludo, 120–180 ms                                   | 0,38           | substitui tap ao selecionar foto                  |
| garland-place     | encaixe de madeira + sino quente, 250–450 ms                 | 0,50           | tem prioridade sobre lift e return                |
| garland-return    | sopro acolhedor, até 160 ms                                  | 0,22           | nunca buzzer, alarme ou nota descendente punitiva |
| garland-hint      | celesta discreta, 100–250 ms                                 | 0,28           | uma vez por dica                                  |
| garland-celebrate | assinatura festiva, 0,8–1,2 s                                | 0,55           | somente na vitória                                |
| garland-music     | loop instrumental de feltro, celesta e sinos suaves, 25–40 s | 0,16           | inicia uma vez, abaixo de todo SFX                |

Áudio começa apenas após o primeiro gesto. O diretor escuta o evento normal de
desbloqueio do SoundManager; não tenta retomar o AudioContext manualmente. Se
o primeiro toque ainda ocorrer com áudio bloqueado, a resposta visual continua
integral e a música entra somente depois do desbloqueio. Não usar áudio espacial
ou pan como informação de jogo: o fallback HTML5 não garante esse efeito.

O loop é a única instância retida e recebe chave com prefixo do jogo. Pausar
pausa essa instância e bloqueia novos cues; sair para e destrói **somente** as
instâncias que pertencem a Guirlanda, sem usar stopAll ou removeAll no
SoundManager compartilhado. Efeitos curtos usam reprodução descartável e
limite de uma voz por cue. Mudo é visível, persiste segundo a política do
shell e nunca altera a regra da rodada.

Haptic não entra na V1 web. A API de vibração tem suporte inconsistente entre
navegadores e não pode ser a confirmação de uma ação. Após teste no Android de
referência, uma ponte de capacidade pode propor pulso único de no máximo 20 ms
em garland-place, sempre opcional e acompanhado de foto encaixada, luz e som.
Arquivos finais exigem M4A e MP3, origem/licença, duração, bytes, delivery
group e cue no manifesto; não usar áudio gerado ou baixado sem decisão de
direitos.

## 9. Arquitetura proposta

```
packages/games/guirlanda-das-lembrancas/
  SPEC.md
  EXPERIENCE.md
  EXPERIENCE_REQUIREMENTS.json
  ASSET_PROVENANCE.md
  assets/manifest.json
  src/
    definition.ts
    tuning.ts
    domain/
      GarlandPhotoPlan.ts
      GarlandSlots.ts
      GarlandRound.ts
      GarlandInteraction.ts
      GarlandProgress.ts
      GarlandHint.ts
      GarlandReplay.ts
    runtime/phaser/
      createGarlandGame.ts
      GarlandScene.ts
      GarlandLayout.ts
      GarlandPhotoSurface.ts
      GarlandInputController.ts
      GarlandPresentationDirector.ts
      GarlandAudioDirector.ts
      GarlandAssetLoader.ts
      GarlandVictoryPresentation.ts
  tests/
```

- definition declara subconjunto de fotos e capa; somente apps/play poderá registrá-lo após decisão explícita.
- GarlandPhotoPlan limita carga e preserva âncora/orientação.
- GarlandSlots, Round e Interaction são funções puras e testáveis, alimentadas por Random e Clock injetados.
- GarlandLayout recebe viewport, safe areas e metadados de orientação; calcula geometria, hit areas e contain sem alterar topologia em resize.
- Scene traduz efeitos semânticos para Phaser. React recebe somente eventos tipados da bridge, nunca Scene ou Phaser.Game.
- Uma entrada cria um jogo Phaser. Saída remove listeners, destrói sons, libera texturas exclusivas da rodada e aguarda game.destroy(true).

### Estrutura runtime e posse de recursos

```text
L0  background estático / neve distante opcional
L1  guirlanda traseira / fio de luz preparado
L2  slots Zone + anéis de estado + foto central ou medalhões preenchidos
L3  ramos frontais não interativos e laço
HUD progresso, som e pausa
overlay de recordação, quando aberto
```

- Um PhotoSurface é um conjunto de objetos existentes: imagem da derivada,
  passe-partout, moldura e sombra. Ele não é rasterizado a cada frame, nem
  convertido em screenshot, nem recebe filtro. A mesma foto é reposicionada
  entre palco e slot; não são criadas cópias de textura a cada colocação.
- Não usar RenderTexture ou DynamicTexture para compor a moldura durante a
  rodada. Em Phaser 4, comandos de textura são buffers que precisam de render
  explícito; resize apaga conteúdo e snapshots bloqueiam GPU. Esses recursos
  não resolvem o problema de uma foto responsiva e acrescentariam risco.
- A camada de ramos é puramente visual e não recebe input. O overlay de
  recordação vira a única camada interativa enquanto aberto; em seguida
  devolve exatamente os handlers e profundidades anteriores.
- Em RESIZE, GarlandLayout recebe gameSize, reflowa posições, tamanhos e hit
  areas e reposiciona a câmera. Não recria a rodada, não pede outra foto e não
  interrompe uma colocação: se houver snap em curso, ele termina
  atomicamente no slot calculado pelo novo layout.
- Handlers de objeto, InputPlugin, ScaleManager, SoundManager, tween e
  emitter são registrados pelo SceneScope. A Scene usa shutdown uma vez para
  invalidar época, remover listeners, parar/destruir música própria, matar
  tweens ativos e destruir o emitter antes de liberar referências.

Não criar BaseScene, componente universal de guirlanda ou renderer 3D. Só promover uma abstração a theme depois de dois consumidores reais.

## 10. Evidência oficial que altera o plano

| Fonte primária                     | Fato aplicado                                                                                                                              | Decisão de Guirlanda                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Phaser 4.2.1 — Input               | InputPlugin oferece hit areas geométricas, drag e drop zones; topOnly prioriza o objeto do topo.                                           | Container recebe tamanho e hit area retangular; slots usam Zone de 72 px, sem pixel-perfect; foto/slot/HUD impedem propagação.              |
| Phaser 4.2.1 — Tweens              | TweenManager permite cadeias e libera tween ao completar, salvo persistência explícita.                                                    | Cada resposta é cadeia curta sem repeat ou persist; o controlador bloqueia só o período do snap e invalida callbacks atrasados por época.   |
| Phaser 4.2.1 — Particles           | Emitting false e explode criam burst finito; fluxo padrão pode emitir por frame.                                                           | Um burst de 6 no encaixe e 12 na vitória; emissor não existe em LOW e nunca segue foto em arraste.                                          |
| Phaser 4.2.1 — Audio               | SoundManager é compartilhado, lida com unlock após gesto e também pode cair em HTML5 Audio.                                                | Não manipular AudioContext; música espera unlock; destruir somente instâncias de Guirlanda e não usar spatial/pan como feedback necessário. |
| Phaser 4.2.1 — Scale               | RESIZE atualiza canvas e requer reposicionamento da cena; ele cobra fill-rate.                                                             | Reflow de objetos existentes, sem pós-FX e sem RenderTexture redrawing; 390 é a decisão inicial e demais tamanhos são gate de integração.   |
| W3C WCAG 2.2                       | Drag precisa de alternativa por pointer simples; alvo mínimo normativo é 24 CSS px e contraste de componentes deve permitir sua percepção. | Toque–toque é caminho completo; alvo de guirlanda é 72 px, cartão 52 px, e anel disponível muda contraste, forma e texto, não apenas cor.   |
| Apple HIG — Motion e Accessibility | Movimento deve ser breve, proposital, cancelável e não ser a única confirmação; gestos exigem alternativa e espaço.                        | Sem loops, câmera ou parallax; pausa/saída interrompem efeitos; foto encaixada e estado visual existem mesmo sem áudio e sem animação.      |

Links oficiais para as fontes acima:

- [Phaser 4.2.1 — input, hit areas e drag](https://raw.githubusercontent.com/phaserjs/phaser/v4.2.1/skills/input-keyboard-mouse-touch/SKILL.md)
- [Phaser 4.2.1 — tweens](https://raw.githubusercontent.com/phaserjs/phaser/v4.2.1/skills/tweens/SKILL.md)
- [Phaser 4.2.1 — áudio](https://raw.githubusercontent.com/phaserjs/phaser/v4.2.1/skills/audio-and-sound/SKILL.md)
- [Phaser 4.2.1 — partículas](https://raw.githubusercontent.com/phaserjs/phaser/v4.2.1/skills/particles/SKILL.md)
- [Phaser 4.2.1 — escala responsiva](https://raw.githubusercontent.com/phaserjs/phaser/v4.2.1/skills/scale-and-responsive/SKILL.md)
- [W3C — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [W3C — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## 11. Pacote e orçamento inicial de assets

O orçamento final precisa de medição; números abaixo são teto de planejamento, não alegação de performance. O primeiro slice trabalha com placeholders seguros e uma referência, não com coleção completa.

| Asset                 | Formato/uso                   | Perfil                           | Teto inicial sugerido    |
| --------------------- | ----------------------------- | -------------------------------- | ------------------------ |
| fundo L0/L1           | WebP 1024 × 1536              | sempre                           | 130 KB                   |
| guirlanda traseira    | WebP alpha                    | sempre                           | 90 KB                    |
| ramos frontais + laço | WebP alpha                    | NORMAL/HIGH; simplificado em LOW | 70 KB                    |
| caixa/suporte         | WebP alpha                    | sempre                           | 45 KB                    |
| três molduras         | WebP alpha ou atlas preparado | sempre                           | 70 KB                    |
| UI e slot/VFX         | SVG/pequenas texturas         | slot sempre; VFX opcional        | 20 KB                    |
| efeitos sonoros       | M4A/MP3 por delivery group    | sempre                           | 100 KB de runtime típico |
| música                | M4A/MP3 por delivery group    | NORMAL/HIGH; sem autoplay        | 180 KB de runtime típico |

Alvo inicial para visuais próprios: **até 425 KB** antes das fotos derivadas autorizadas. Se não couber, reduzir detalhe e planos antes de ampliar teto. Cada arquivo candidato passa por asset:doctor, proveniência, preparo offline, manifest.json, asset:validate, asset:audit e asset:budget; só estado PRONTO_PARA_RUNTIME pode entrar em public/assets.

## 12. Fases de execução

| Fase                | Entrega                                                                                     | Evidência de saída                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| G0 — decisão        | selecionar Guirlanda e aprovar construção sem punição                                       | decisão registrada; sem código ou asset final                                          |
| G1 — âncora visual  | gerar P-01 e no máximo três variações; escolher prancha                                     | prancha aprovada em 390; sem foto de cliente                                           |
| G2 — contrato       | gerar pacote não registrado, escrever SPEC, EXPERIENCE e requirements                       | contratos coerentes e testes de template                                               |
| G3 — domínio        | foto/subconjunto, slots, seleção, colocação, retorno, dica e replay determinísticos         | Vitest antes da Scene                                                                  |
| G4 — slice 390      | placeholders, foto sintética segura, toque–toque, arraste, encaixe, retorno e vitória reais | input debug prova alvos; passagem focal cobre entrada → gesto → consequência → vitória |
| G5 — pacote de arte | preparar P-02 a P-07, PhotoSurface, manifesto e áudio                                       | Asset Lab e auditoria sem asset não catalogado                                         |
| G6 — sensação       | apresentação, som, pausa, ampliação, LOW e reduzido                                         | revisão focal sem P1/P2 de leitura, toque ou foto                                      |
| G7 — integração     | resize durante snap, recuperação de mídia, lifecycle, bridge e registro explícito           | pnpm check:fast, testes de rota/saída, auditoria e smoke de input                      |
| G8 — liberação      | matriz mobile, perfis, Android de referência e build                                        | pnpm validate e evidências privadas                                                    |

Antes de G4, ler apenas as referências Phaser 4.2.1 necessárias a ponteiro, resize, tweens, loader, áudio e partículas. Escolher arte não antecipa arquitetura de engine.

## 13. Critérios de aceite propostos

- **GDL-001:** foto do Hub sempre é incluída; sessão longa nunca carrega todas as derivadas game.
- **GDL-002:** cada foto permanece proporcional em retrato, paisagem e quadrado, sem filtro ou enfeite sobre a imagem.
- **GDL-003:** colocação funciona por toque–toque e arraste; cartão principal tem alvo de 52 CSS px, cada slot recebe área geométrica de 72 CSS px e controles secundários têm 44 CSS px com espaçamento.
- **GDL-004:** soltar fora e tocar slot ocupado orientam gentilmente, sem remover foto, tempo, progresso ou tentativa.
- **GDL-005:** após inatividade, dica mostra próxima intenção sem realizar jogada.
- **GDL-006:** resize reflowa a cena e hit areas, mas não troca fotos, slots preenchidos, progresso ou seed.
- **GDL-007:** feedback tem fim determinável; LOW e movimento reduzido preservam confirmação e vitória sem neve, loops ou partículas decorativas.
- **GDL-008:** pausa, saída e cinco ciclos de entrada/saída não deixam canvas, som, listener, timer, tween, emitter ou textura de rodada sobrevivente.
- **GDL-009:** arte e som entregues têm proveniência, hash e orçamento; evidências não contêm foto de cliente.
- **GDL-010:** uma sequência de pointerdown/dragstart/dragend, toque em slot, resize ou callback tardio coloca a foto no máximo uma vez; input de HUD/overlay não alcança a guirlanda.
- **GDL-011:** NORMAL produz no máximo um burst de 6 partículas por encaixe e 12 na vitória; LOW não instancia emitter, e movimento reduzido não inicia animação decorativa.
- **GDL-012:** som, mudo, pausa e saída atuam somente em fontes deste jogo; a primeira interação bloqueada pelo navegador ainda tem resposta visual completa.
- **GDL-013:** revisão visual de canvas real em 390, 412, 430 e 768 px confirma foto como primeiro foco, slot visível em fotos claras/escuras, zonas sem sobreposição e zero ornamento sobre imagem.

## 14. Gates restantes para liberação

1. Revisar em canvas real 390, 412, 430 e 768 px, inclusive com foto clara, escura, retrato, paisagem e quadrada.
2. Exercitar entrada, toque–toque, arraste, soltura fora, slot ocupado, pausa, hidden, resize e saída; registrar evidência privada sem foto de cliente.
3. Rodar gates integrais e medir em Android de referência antes de promoção.
4. Confirmar a autorização comercial final do provider de geração e do acervo sonoro antes de publicação externa.
