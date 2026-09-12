# CG-EXPRESSO-DAS-FOTOS-V2 — plano canônico de produção

**Estado:** D0 está migrado no domínio; há um vertical slice local de estação, toque, trilho, entrega, pausa e som. D1 ainda precisa reduzir o orquestrador em views/diretores e D2 ainda não tem sign-off criativo. Nenhuma validação ampla em aparelhos, benchmark ou produção do kit artístico completo começa antes desse sign-off.  
**Substitui:** a mecânica de faixa/portal do protótipo. O rascunho anterior fica somente como histórico técnico e não pode orientar código ou UX novos.  
**Produto:** [Expresso das Fotos](../product/EXPRESSO_DAS_FOTOS.md).  
**Público e duração:** crianças de 6–10 anos; até seis entregas, 2–4 minutos, sem cronômetro, vidas, ranking, derrota ou pressão de rapidez.

## Decisão de produto e escopo

O jogo é uma estação de Natal que ganha vida quando a criança entrega uma lembrança. Em cada parada, ela vê um bilhete de entrega com uma foto grande, encontra a mesma foto entre três estações físicas, toca na estação e vê a chave mudar e o trem percorrer o trilho até ela. A lembrança vira um enfeite da Árvore das Memórias.

O ciclo que precisa ficar irresistível é:

```text
foto-alvo → reconhecer a igual → tocar a estação → chave muda
→ trem percorre o trilho → entrega → árvore reage
```

A regra infantil é somente: **“Ache a foto igual.”** Depois do primeiro acerto, o trem ensina o restante pela consequência visual. A foto é pista, destino e recompensa; nunca um painel pequeno separado do controle.

### Fora desta etapa

- Matriz de celulares, tablets, paisagem, FPS, VRAM e stress.
- Produção de dezenas de telas, personagens ou efeitos WebGL.
- Matter.js, Arcade Physics ou colisões para mover a locomotiva.
- Swipe, arraste, sensor, multitouch ou gesto obrigatório.
- Filtro, máscara, tint, normal map ou alteração nos pixels de uma foto de cliente. Arte decorativa original pode ser criada fora da partida, manifestada e revisada; fotos de cliente nunca entram em IA generativa.
- “Polimento” do protótipo de faixa: ele será migrado, não enfeitado.

Checagens unitárias e de tipo voltam somente ao alterar uma regra de domínio; elas protegem a implementação, mas não contam como aprovação de experiência.

## Aditivo D3 — ferrovia sensorial e Rota Estrela

**Decisão de produto — 29-08-2026.** O vertical slice não deve ser tratado
como arte quase final. A próxima entrega criativa transforma o tabuleiro em uma
pequena viagem de trem com causa física, som temático e uma progressão opcional
depois de uma vitória completa. A primeira rodada continua sendo descoberta,
sem cronômetro, vidas, punição ou seletor de dificuldade antes de brincar.

### Diagnóstico que esta etapa resolve

O slice já permite reconhecer a foto e tocar uma candidata, mas ainda lê como
cartas fotográficas acima de trilhos decorativos: falta uma estação material,
uma partida que tenha peso, uma chegada que pareça destino e uma árvore que
receba a lembrança. A instrução solta no meio do trajeto e os três arcos longos
competem com a consequência que deveriam explicar. Não se deve adicionar
partículas ou sons por cima desse problema; primeiro a composição faz cada
elemento explicar seu papel.

```text
HUD compacto: [entregas]                         [som] [pausa]
bilhete físico: foto-alvo grande + selo de rota
plataformas:  [estação-foto] [estação-foto] [estação-foto]
ferrovia:      chave + sinal -> um único trilho ativo -> plataforma escolhida
destino:             árvore, lanternas, trem e coleção de ornamentos
```

Em retrato, a instrução aparece abaixo do bilhete somente enquanto a escolha
está disponível e desaparece assim que a chave começa a se mover. O trilho não
é uma moldura dourada permanente: dormentes, junção e sinal ficam materialmente
ligados às plataformas; somente a rota escolhida recebe um curto brilho de
passagem. O trem ocupa a base da cena, abaixo das fotos, e a árvore fica no
destino narrativo, não atrás de texto. Foto-alvo, ação e retorno continuam mais
fortes que cenário em captura estática.

### Direção 2D realista, sem tocar na foto

O realismo procurado é de **diorama ferroviário de Natal**: madeira verde-pinho
com veios suaves, latão fosco, tinta vinho laqueada, papel de bilhete com fibra
sutil, neve compactada e lanternas âmbar que explicam a luz. Não é uma colagem
de ícones, bordas douradas e brilhos genéricos. A cena A1 define uma única
perspectiva frontal de três quartos, a direção da luz e a escala de cada objeto;
todo asset posterior nasce dela.

| Beat    | Causa vista pela criança         | Resposta visual NORMAL                                                                                                               | LOW / movimento reduzido                        |
| ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Espera  | O bilhete pede uma lembrança.    | Lanterna estável, vapor quase parado e farol suave.                                                                                  | Luzes e trem estáticos.                         |
| Toque   | A estação foi escolhida.         | Cartão e telhado comprimem 2 px, sombra aproxima e latão pisca uma vez.                                                              | Contorno e estado pressionado estáticos.        |
| Chave   | O caminho foi decidido.          | Alavanca gira, agulha encaixa e sinal muda de vermelho para verde.                                                                   | Poses antes/depois; sem tween.                  |
| Saída   | A locomotiva parte.              | Farol aumenta levemente, duas ou três nuvens de vapor saem atrás da cabine e um brilho curto passa pelo primeiro dormente.           | Farol e vapor final já visíveis.                |
| Viagem  | O trem percorre aquele trilho.   | Rodas e bielas derivam do progresso, sombra acompanha o chão e o brilho de rota avança sob o trem.                                   | Trem na pose de chegada; rota selecionada fixa. |
| Chegada | A plataforma recebeu o expresso. | Freio curto, luz de plataforma aquece e o trem acomoda sem câmera tremida.                                                           | Luz de destino e trem parado.                   |
| Entrega | A foto virou lembrança.          | Selo pousa no bilhete; um pequeno token em moldura viaja até a árvore, fora de qualquer rosto; 6–10 estrelas finitas ficam ao redor. | Selo, token e ornamento no estado final.        |
| Vitória | A árvore está completa.          | Luzes em três grupos fora de sincronia e uma única celebração periférica de até 1,5 s.                                               | Árvore iluminada e mensagem, sem emissão.       |

Neve permanece distante em L0/L1. Ramo de pinho e uma lanterna ocupam no máximo
dois cantos de L3. Não usar shake de câmera, flash, bloom, blur, estroboscópio,
loop de confete, máscara ou filtro sobre a derivada da sessão. A prova A1 precisa
funcionar parada, antes de qualquer animação.

### Mapa de som: trem que conta a história

O áudio reforça eventos já compreensíveis visualmente; não narra regra nem cria
barulho constante. Cada cue tem polyphony 1, cooldown próprio e volume de jogo
revisado com os demais. Um apito é curto, quente e moderado — nunca uma buzina
realista alta que assuste uma criança ou quem está perto.

| Cue proposto     | Gatilho único                       | Tratamento e duração-alvo                              | Regra de mix e VFX associado                                         |
| ---------------- | ----------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `station-press`  | pointerdown de estação ou HUD       | madeira/papel, 70–110 ms                               | substitui clique genérico; compressão imediata.                      |
| `wrong-return`   | candidata diferente                 | toque de madeira abafado, 120–180 ms                   | abaixo de `station-press`; cartão volta sem buzzer.                  |
| `switch-click`   | chave inicia                        | encaixe de alavanca e metal fosco, 90–140 ms           | sinal troca exatamente no clique.                                    |
| `steam-release`  | após chave travada                  | sopro de vapor macio, 250–400 ms                       | duas ou três nuvens finitas; não é loop.                             |
| `toy-whistle`    | partida confirmada                  | apito de locomotiva infantil, 250–450 ms               | toca uma vez a cada viagem, sempre abaixo de 0,35 de volume.         |
| `rail-roll-loop` | somente em `travelling`             | rodas/ritmo de trilho sem voz, loop limpo de 0,8–1,4 s | instância persistente; fade curto ao entrar, pausar, chegar ou sair. |
| `arrival-brake`  | últimos 12% da rota                 | freio leve de brinquedo, 180–280 ms                    | não sobrepõe o apito; farol diminui e plataforma aquece.             |
| `station-bell`   | trem parado no destino              | sino de estação quente, 180–300 ms                     | substitui fanfarra de acerto; um toque por entrega.                  |
| `delivery-stamp` | selo/ornamento                      | selo de papel + celesta curta, 220–420 ms              | sincronizado ao token atingir a árvore.                              |
| `hint-spark`     | dica manual ou 7/10 s de ociosidade | uma nota de celesta, até 250 ms                        | só uma vez por parada; linha bilhete → estação não joga sozinha.     |
| `tree-finale`    | sexta entrega e vitória             | assinatura natalina curta, até 1,5 s                   | reduz o `rail-roll-loop`; celebra a árvore, não cobre a foto.        |

Não haverá música de fundo nesta primeira revisão até que os efeitos e a leitura
da viagem estejam aprovados. Se a direção pedir música depois, será uma cama
instrumental de celesta/piano de baixa densidade, iniciada somente após gesto,
em loop de emenda limpa, aproximadamente 0,08–0,12 de volume e reduzida antes
de `station-bell`, `delivery-stamp` e `tree-finale`.

#### Regras técnicas de áudio

1. Pré-carregar as alternativas M4A e MP3 antes da primeira missão; Phaser
   escolhe um formato suportado quando recebe a lista de URLs. Não buscar,
   decodificar, gerar ou carregar áudio durante chave, viagem ou entrega.
2. `rail-roll-loop` usa uma referência retida criada por `sound.add`, pois é o
   único cue que precisa de pause, resume, volume e stop explícitos. Os demais
   são one-shots por `sound.play` ou referências efêmeras com cooldown.
3. Pausa, perda de foco, `soundEnabled: false`, mudança de rota e destroy
   interrompem apenas as fontes possuídas pelo Expresso. A saída não usa
   `stopAll`, que poderia silenciar outro dono do mesmo `SoundManager`.
4. O primeiro toque pode liberar o contexto; se ele permanecer bloqueado,
   feedback visual continua e nenhum cue é reencadeado depois de atraso. O
   botão **Som/Mudo** preserva posição e rótulo em português.
5. Não usar panning espacial como confirmação de destino: ele é opcional em
   Web Audio e não é garantia no fallback HTML5. A viagem precisa ser entendida
   com som mono/estéreo comum e com mudo.

As APIs acima foram conferidas contra a tag
[Phaser 4.2.1 — BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js),
[SoundManagerCreator](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/SoundManagerCreator.js)
e os tipos instalados. Elas confirmam o gerenciador compartilhado, referência
retida para loop, pausa por foco e fallback Web Audio/HTML5/NoAudio. A política
de desbloqueio por gesto e o controle explícito de som também seguem as
[boas práticas oficiais da Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

### Aquisição segura de novos sons

Esta é uma **shortlist de pesquisa, não uma aprovação nem download**. A
[coleção de trem do Mixkit](https://mixkit.co/free-sound-effects/train/) tem,
entre outros, “Toy train whistle”, “Steam train passing” e “Train arrival at
station”; a [busca de apitos a vapor do Pixabay](https://pixabay.com/sound-effects/search/steam-whistle/)
traz candidatos de apito, vapor e locomotiva. Seus termos precisam ser relidos
no item escolhido e arquivados na revisão: a [licença do Mixkit](https://mixkit.co/license/)
declara uma licença específica para efeitos sonoros, e a [licença do Pixabay](https://pixabay.com/service/license-summary/)
lembra que somente a licença completa é vinculante. O contrato do repositório
continua mais estrito: nenhum arquivo de terceiro entra no browser sem
autorização humana, proveniência completa e manifesto.

| Família a procurar | Fonte candidata                     | Critério criativo de aceitação                            | Destino se aprovada             |
| ------------------ | ----------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Apito infantil     | Mixkit / Pixabay                    | curto, redondo, sem sirene industrial ou voz              | `toy-whistle`                   |
| Vapor e partida    | Mixkit / Pixabay                    | vapor macio, começo/fim limpos, sem chiado agressivo      | `steam-release`                 |
| Rodas em trilho    | Mixkit / Pixabay                    | loop discreto, sem fala, buzina nem vagão metálico pesado | `rail-roll-loop`                |
| Freio e chegada    | Mixkit / Pixabay                    | parada leve e sino acolhedor separados                    | `arrival-brake`, `station-bell` |
| Carimbo e brilho   | acervo autorizado / criação própria | papel, madeira ou celesta, não efeito de arcade           | `delivery-stamp`, `hint-spark`  |

Para cada candidato aceito: registrar URL/ID, licença e data de leitura;
baixar fora do browser; ouvir com celular/volume de jogo; aparar silêncio;
normalizar de maneira não destrutiva; preparar M4A/MP3; medir duração e bytes;
gerar SHA-256; atualizar `ASSET_PROVENANCE.md` e `assets/manifest.json`; rodar
`pnpm asset:validate --game expresso-das-fotos`; só então integrar. Um som
aprovado substitui o papel legado correspondente — não se acumula uma pilha de
cues quase iguais. A revisão precisa rejeitar qualquer conteúdo cujo termo não
permita esta entrega comercial do produto, mesmo que a busca o chame de “free”.

### Rota Estrela após 100%

O contrato de plataforma já oferece `difficulty: 'normal' | 'desafio'`; esta
etapa o usa sem inventar armazenamento no domínio. A shell mantém o fato mínimo
de que **esta sessão autorizada completou a rota normal** e, na vitória, decide
se apresenta a ação seguinte. O domínio só recebe contexto e uma fonte
determinística na criação de um novo `GameRun`.

| Situação                            | Ação da família                                                        | Composição                                                                      | Segurança de experiência                                 |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Primeira rodada                     | `normal` automático                                                    | três estações; dica em 7 s                                                      | Descoberta intacta; sem tela de nível.                   |
| Vitória 100% com 4+ fotos distintas | “Nova rota — mais desafiadora” aparece na folha de vitória             | quatro estações em 2 × 2, foto-alvo proporcional e quatro fotos reais distintas | Escolha explícita; sem relógio, vidas ou erro acumulado. |
| Vitória com 1–3 fotos distintas     | só replay e ações usuais                                               | mantém fallback honesto                                                         | Nenhuma cópia de foto ou botão que não funciona.         |
| Rota Estrela concluída              | replay conserva `desafio`; a família pode retornar ao `normal` na capa | quatro estações e dica em 10 s                                                  | Não escala de novo sem decisão nova.                     |

No desafio, a posição do destino não repete a mesma plataforma nas duas paradas
anteriores; distratores são fotos reais distintas e podem privilegiar
enquadramento/orientação parecido se o catálogo seguro já souber disso. A
diferença vem de comparar uma quarta estação e de reduzir a ajuda implícita,
nunca de manipular foto, esconder conteúdo, acelerar o trem ou punir tentativa.
Em 390 px, a grade 2 × 2 deve preservar 64 CSS px de hit area e moldura externa
à foto; se isso não for possível na composição A1, o desafio não é integrado até
o layout ser redesenhado.

### Sequência de implementação e gate criativo

| Ordem | Trabalho concreto                                                                                                                                                    | Prova antes de seguir                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| S1    | Desenhar uma prancha A1 de 390 × 844 com os oito beats, camadas L0–L3, zona protegida da foto, estações físicas, chave, destino e folha de vitória.                  | Capturas estáticas legíveis; aprovação criativa do proprietário.                                          |
| S2    | Separar `ExpressAudioDirector`, `TrainRigView`, `RailSwitchView`, `StationBoardView` e `MemoryTreeView` do orquestrador atual; cada um recebe um escopo de teardown. | Uma parada usa uma única sequência causal, sem writers concorrentes de posição ou áudio.                  |
| S3    | Produzir/selecionar master visual e shortlist de sons; revisar perspectiva, pivôs, licença, bytes e M4A/MP3 antes do webroot.                                        | Proveniência e manifesto completos; somente assets aprovados entram no runtime.                           |
| S4    | Implementar os beats de toque, chave, saída, loop de trilho, freio, sino e entrega; perfis LOW/reduzido são poses claras, não uma versão quebrada.                   | Revisão criativa focal de uma entrega com som ligado e mudo.                                              |
| S5    | Adicionar contrato e layout de `desafio`, condição de unlock na shell, rota determinística de quatro estações e folha de vitória opcional.                           | Testes de domínio para 4+ fotos, fallback 1–3 e repetição de plataforma; escolha de desafio só após 100%. |
| S6    | Corrigir todos os achados P1/P2 de compreensão, material, toque, movimento, foto, áudio e vitória.                                                                   | Sign-off D5: “parece jogo natalino premium, não página animada”.                                          |
| S7    | Só depois de D5, abrir validação técnica focal e então a matriz mobile já prevista em D6.                                                                            | A matriz não rediscute a fantasia, o layout ou a jogabilidade.                                            |

S1–S6 são trabalho de acabamento e decisão; **não** abrem testes amplos de
aparelhos. A passagem focal que encerra cada S é uma revisão de experiência,
não benchmark: primeira leitura sem instrução adulta, toque certo/alternativo,
uma viagem completa com som ligado, a mesma viagem em mudo e vitória com/sem a
opção de Rota Estrela.

### Evidência S3/S4 — 29-08-2026

- Foram preparados e manifestados `steam-release`, `toy-whistle`, `rail-roll`
  e `arrival-brake` em M4A/MP3. As fontes Mixkit 1630, 1631 e 1629 têm item,
  licença, receita FFmpeg, hash, duração e orçamento auditáveis; os WAVs de
  origem não são servidos nem versionados.
- `ExpressAudioDirector` possui a única instância de `rail-roll`: ela inicia
  apenas no deslocamento, pausa quando a apresentação é cancelada, para em
  chegada/mudo e é destruída no shutdown. Vapor, apito, freio e efeitos
  existentes são one-shots com cooldown.
- Revisão focal local, em 1280 × 720 com mídia privada autorizada: uma rota
  correta exibiu trem no trilho e vapor, concluiu entrega sem erro de console;
  a sobreposição de pausa revelou texto com quebras literais e foi corrigida.
  Esta passagem não substitui a revisão mobile D5/D6 nem afirma aprovação final
  de mix por escuta humana.
- A viagem agora usa o próprio `railProgress` para desenhar um glint curto no
  trilho sob a locomotiva, em vez de manter toda a rota como néon. A partida
  cria três nuvens de vapor finitas, a estação correta aquece uma única vez e
  a árvore recebe três faíscas finitas depois da entrega. Os efeitos não cobrem
  fotos, são suprimidos com `reducedMotion` e são destruídos em pausa, resize e
  shutdown. A cena focal foi refeita depois dessa alteração; o próximo gate
  continua sendo aprovação criativa, não matriz de aparelhos.
- O fundo L0/L1 passou para `night-station-platform-diorama-v2`: plataforma,
  sinal e vila nevada materializam a ferrovia sem competir com a carta e as
  estações. A arte foi gerada para o projeto sem fotos de cliente, convertida a
  WebP de 108.464 bytes e aprovada pelo orçamento visual. O WebP v1 público,
  agora sem consumidor, foi removido; a proveniência preserva os dois registros.

## Correções canônicas antes de codificar

| Remover do gameplay ativo                                               | Substituir por                                       | Motivo                                                                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| ExpressLane, chooseExpressLane, awaiting-lane, wrong-lane, correct-lane | estação, bilhete, chave, rota e entrega              | A criança escolhe um objeto/foto compreensível, não uma faixa abstrata. |
| findExpressLaneAt, lanes, “Toque na faixa” e “Caminho da foto”          | hit area da estação, stationId e “Ache a foto igual” | Uma única ação primária, diretamente conectada à missão.                |
| Swipe/normalização de swipe                                             | posse de um pointer e tap na estação                 | Swipe compete com a comparação visual e cria um segundo modelo mental.  |
| Portal-retrato central                                                  | três estações-candidatas                             | Foto-alvo e opções devem coexistir na mesma leitura.                    |
| Tween manual de x/y até destino                                         | progresso numérico em rota ferroviária               | Trem só se move no desenho de trilho que a criança vê.                  |

Uma busca no código ativo do V2 por lane, faixa, portal, chooseExpressLane, wrong-lane, correct-lane, awaiting-lane ou swipe não pode devolver regra, texto, evento, estado ou teste vigente. Exceções: arquivo de histórico explicitamente arquivado e migrações ainda não removidas no início de D0.

## Contrato de domínio V2

O domínio continua em packages/games/expresso-das-fotos/src/domain/: sem Phaser, React, DOM, URL, pixel, Date.now ou Math.random. A rede ferroviária é descrita em dados normalizados; somente o runtime a compila em Path.

```ts
type StationAvailability = 'available' | 'closed';
type StationId = 'station-left' | 'station-center' | 'station-right';

interface ExpressStationCandidate {
  readonly stationId: StationId;
  readonly availability: StationAvailability;
  readonly photoId?: string;
}

interface ExpressRouteStop {
  readonly id: string;
  readonly ordinal: number;
  readonly targetPhotoId: string;
  readonly stations: readonly [
    ExpressStationCandidate,
    ExpressStationCandidate,
    ExpressStationCandidate,
  ];
  readonly targetStationIndex: 0 | 1 | 2;
  readonly railRouteId: 'north-left' | 'north-center' | 'north-right';
}
```

ExpressRailRouteSpec usa somente pontos e controles normalizados entre 0 e 1, em segmentos de linha ou Bézier cúbica. RailPathFactory recebe layout + spec e cria Phaser.Curves.Path no runtime. Nenhum tipo Phaser vaza para domain.

### Seleção por disponibilidade de fotos

| Fotos seguras na sessão | Candidatas                                       | Experiência                                                        |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| 3 ou mais               | foto-alvo + duas fotos reais diferentes          | Correspondência visual normal.                                     |
| 2                       | duas fotos reais e uma estação fechada           | Não inventa rosto nem duplica a foto para fingir desafio.          |
| 1                       | uma estação com foto e duas plataformas fechadas | Modo descoberta: toca a própria foto e assiste à primeira entrega. |

Para três ou mais fotos, a rota determinística não posiciona o alvo no mesmo lado por mais de duas entregas consecutivas, evita repetir a mesma distratora quando houver alternativas e alterna orientação quando o catálogo permitir. Uma foto repetida é reaproveitada como textura, nunca baixada novamente.

### Máquina de estados

```text
ready
  → presenting-mission
  → awaiting-station
      ├─ station diferente → gentle-feedback → awaiting-station
      └─ station alvo → switching-track → travelling → delivering
          → próxima presenting-mission | completed
```

Paused é uma suspensão que guarda a fase retomável; o runtime guarda um snapshot de apresentação com railRouteId, progresso 0–1, objeto pressionado e token. Só podem confirmar transições: missionPresented(), stationChosen(stationId), trackSwitchFinished(), trainArrivalFinished() e deliveryPresented().

Uma estação diferente gera different-station, mantém a mesma missão e registra apenas feedback gentil. Não reduz progresso e não inicia viagem falsa. Callback visual só confirma uma transição se runId, stop.id e presentationEpoch ainda forem atuais.

## Uma fonte de verdade para trilho e movimento

### Rede ferroviária

ExpressRailGeometry é puro e produz os três specs normalizados. No runtime, RailPathFactory cria os três Phaser.Curves.Path. RailNetworkView usa os mesmos paths para:

1. desenhar o guia técnico no Rail Motion Lab;
2. distribuir dormentes, junções e overlays de trilho na arte final;
3. posicionar a agulha da chave e o trem;
4. provar que o destino visual e a rota real são idênticos.

Não é permitido desenhar uma bifurcação em uma coordenada e animar a locomotiva para outra. O asset final pode cobrir o guia técnico, mas nasce da mesma geometria e dos mesmos pivôs.

### Movimento de trem

TrainMotionController possui um único progress entre 0 e 1. Um Number Tween de this.tweens.addCounter o atualiza; em cada update, o controller reutiliza dois Vector2, chama path.getPoint(progress, point) e path.getTangent(progress, tangent), então apenas TrainRoot recebe setPosition(point.x, point.y).

| Parte do rig | Propriedade possuída              | Regra                                                 |
| ------------ | --------------------------------- | ----------------------------------------------------- |
| TrainRoot    | posição                           | Só TrainMotionController escreve.                     |
| Wheels       | rotação                           | Distância percorrida ÷ circunferência visual da roda. |
| Body/Cabin   | inclinação e suspensão            | Inclinação limitada; não gira como carro de corrida.  |
| Shadow       | alpha, escala e offset            | Acompanha o chão, sem disputar posição da raiz.       |
| Headlight    | alpha/intensidade pré-renderizada | Aumenta levemente na saída, sem filtro obrigatório.   |
| SteamOrigin  | bursts                            | Dois ou três puffs finitos atrás da locomotiva.       |

O avanço usa antecipação de 60–100 ms, aceleração de 140–180 ms, cruzeiro e frenagem dentro de viagem total de 850–1.150 ms. A entrega dura 450–650 ms. Estes valores são hipóteses de game feel, não SLA. TweenChain serve para chave → antecipação → viagem → entrega, mas cada handle pertence a ExpressSceneScope; pauseAll, killAll e escritores concorrentes de transform são proibidos.

### Pausa e resize em trânsito

Em pause ou resize durante switching-track, travelling ou delivering, o scheduler invalida o epoch, pausa/cancela seus handles e fixa o rig no último progress apresentado. Após reflow, RailPathFactory reconstrói o path e o mesmo progress reposiciona o trem. Retomar cria somente a duração restante. Nenhum resize pode completar, reiniciar ou teletransportar entrega.

## Input: uma ação, uma posse, uma consequência

Cada StationView possui uma Zone retangular explícita, maior ou igual a 64 CSS px no menor viewport. Foto, moldura, telhado e efeitos são filhos visuais sem input; a estação inteira é o controle. A Zone usa setInteractive, topOnly permanece ativo e HUD/pause chamam stopPropagation.

1. No primeiro pointerdown de estação disponível, o arbiter guarda pointerId, stationId, tempo e ponto; a estação comprime e a sombra muda no mesmo ou próximo frame.
2. No pointerup, somente o mesmo pointer ainda pertencente à mesma Zone chama stationChosen. Pointerout, cancelamento, pausa, resize, ocultação, navigation e shutdown limpam press sem comando tardio.
3. Segundo dedo é ignorado até o primeiro encerrar. Não há fila de taps.
4. Estação fechada não é interativa e tem linguagem visual própria; não parece foto candidata nem botão quebrado.
5. Após 7 s ociosos, a dica desenha linha breve bilhete → estação correta e faz a moldura respirar uma vez. Não toca, muda chave ou entrega pela criança.

A escolha diferente comprime, recebe som macio de madeira, retorna em 180 ms e faz o bilhete-alvo pulsar uma vez. Não usar vermelho, X, palavra “errado”, buzzer, shake de câmera ou perda.

## D2: vertical slice que precisa provar o jogo

Antes do kit final, haverá uma única parada completa com fixtures seguras, nunca fotos de cliente. Ela contém HUD mínimo, bilhete com foto-alvo grande, três estações, bifurcação física, locomotiva, parte da árvore e pausa. Não é mockup: usa a gramática de input, estado, path, motion e lifecycle de produção.

```text
┌────────────────────────────────────┐
│ [pausa]  Estrelas entregues 1 de 6 [som] │
│ ┌──── Bilhete de entrega ─────────┐ │
│ │      FOTO-ALVO, sem crop        │ │
│ └─────────────────────────────────┘ │
│     estação        estação       estação │
│     [foto]         [foto]        [foto]  │
│        ╲             │             ╱     │
│         ╲──────── expresso ───────╱      │
│            árvore com ornamentos          │
└────────────────────────────────────┘
```

O bilhete parece papel marfim físico com passe-partout e selo, não modal web. A estação é plataforma de madeira, latão e cartão-foto, não botão de cor sólida. A ordem causal obrigatória é:

```text
pointerdown → station pressiona → escolha confirmada → chave muda
→ sinal muda → antecipação → trem segue trilho → freia
→ plataforma aquece → bilhete recebe selo → ornamento preenche
```

Depois da entrega, o trem avança alguns pixels e passa atrás de um elemento do cenário antes de a próxima missão entrar. A transição é curta e narrativa, nunca teleport visível ao ponto inicial.

D2 só termina se primeira ação for entendida sem explicação adulta; causa física for visível; foto for legível; toque for imediato; escolha for gentil; trem ficar colado à rota; pausa/retomada e resize forem estáveis; e não houver retângulo/botão provisório perceptível. Não iniciar matriz de aparelhos nesse ponto.

### Evidência privada de revisão — 29-08-2026

| Estado e viewport                                   | Achado                                                                                                                                                                                           | Reprodução                                                          | Severidade   | Dono e decisão                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| 390 × 844, primeira missão com foto de sessão local | A regra foi entendida em uma leitura: foto grande, três candidatas e instrução única. Não houve erro de console.                                                                                 | Abrir Expresso, iniciar a brincadeira e observar antes de tocar.    | sem achado   | Expresso runtime; manter composição.                                     |
| 390 × 844, tocar candidata diferente                | O cartão responde e a mensagem “Quase! Procure a mesma foto da carta.” mantém a missão e o progresso.                                                                                            | Tocar uma estação cujo retrato não é igual ao bilhete.              | sem achado   | Feedback do Expresso; manter retorno gentil.                             |
| 390 × 844, acerto e chegada                         | O primeiro rig vetorial girava verticalmente e cobria a foto ao estacionar. O terminal foi movido para baixo do cartão, a inclinação foi limitada e a locomotiva recebeu sprite premium próprio. | Tocar a estação com a mesma foto e observar metade/fim do percurso. | P2 corrigido | RailPathFactory e TrainRig; reavaliar junto do kit A1 antes do sign-off. |
| 390 × 844, cabeçalho                                | Som/mudo aparece como controle separado de pausar e respeita a preferência inicial da sessão.                                                                                                    | Tocar Som; o rótulo alterna para Mudo sem erro de console.          | sem achado   | HUD/audio do Expresso; manter dois formatos de áudio e cooldown.         |

As capturas com fotos de sessão são evidência privada e não entram no repositório. Esta revisão é uma passagem criativa focal, não a matriz D6.

## Direção de arte e áudio após o slice

### Uma referência A1, depois uma família coesa

Antes de D2, criar uma única composição A1 em 390 × 844 com oito beats: capa, missão, pressão, escolha gentil, chave/partida, viagem, entrega e árvore. Ela fixa ângulo, escala, paleta, fonte de luz, área segura da foto e materiais. Não gerar uma tela independente por IA.

O mundo é estação de inverno em diorama 2D, em vista frontal de três quartos: azul-petróleo noturno, neve macia, janelas âmbar, madeira verde-pinho, latão fosco, papel marfim e locomotiva de madeira laqueada e metal usinado. Realismo vem de perspectiva consistente, sombra de contato, oclusão suave, textura discreta e luz com fonte visível — não de contorno dourado contínuo, plástico brilhante, bloom, blur, câmera instável ou partículas em excesso.

Após D2, D3 produz os grupos abaixo a partir do mesmo master e registra cada arquivo no manifesto v2 antes do webroot:

| Família        | Entregáveis                                                                                     | Estados e fallback                                           |
| -------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| L0/L1/L3       | céu, vila, fachadas, neve, árvore e props de canto em WebP                                      | LOW remove ambiente e L3, nunca foto/ação.                   |
| Rail network   | trilhos, dormentes, junções, chave e sombras                                                    | Pivôs coincidem com specs; guia técnico não é exibido.       |
| Train rig      | corpo, cabine, rodas, farol, sombra e origem de vapor                                           | Pivôs e limites de rotação documentados.                     |
| Stations       | plataforma, teto, moldura e cartão                                                              | idle, pressed, gentle, hinted, selected e closed.            |
| Photo surfaces | derivada game para bilhete/árvore e card para estações                                          | contain, nunca original, path, filename ou alteração visual. |
| HUD            | pausa, som/mudo, contador contextual e selo                                                     | SVG/arte própria com normal, press, focus e disabled.        |
| VFX            | vapor, neve distante, brilho de trilho, selo e estrelas                                         | Pool único e bursts finitos; fora das fotos.                 |
| Audio          | press-wood, switch-click, rail-roll, steam-soft, arrival-chime, stamp, hint-spark e tree-finale | Licença, bytes, cue, cooldown e teardown no manifesto.       |

IA pode criar apenas cenário e props originais sem pessoas, logotipos ou texto rasterizado. Um compositor revisa luz, perspectiva, bordas alfa e pivôs antes de exportar. Resultado cru de IA não entra no navegador; retratos reais nunca entram em geração, inpainting, prompt ou pós-processamento.

Pressão: 80–120 ms; chave: 100–150 ms; vapor: 2–3 bursts; hint: passagem única até 900 ms; estrelas finais: burst finito até 1,5 s. frequency: 0, emissor novo por gesto, loop de confete, WebGL obrigatório e efeito sobre PhotoSurface são proibidos.

O primeiro gesto libera áudio quando o browser permitir, mas resposta visual nunca espera por ele. Cada cue tem polyphony 1 e cooldown próprio; pause/exit opera só fontes expresso. Som desligado e movimento reduzido preservam toda a regra. Haptic é opcional e não pode ser a única confirmação.

## Arquitetura de runtime V2

O atual createExpressoDasFotosGame.ts tem 999 linhas e concentra desenho, input, jornada, layout e motion. Antes de adicionar arte, D1 o reduz a factory/lifecycle e separa componentes internos abaixo. Eles não são abstração para outros jogos.

```text
runtime/phaser/
  createExpressoDasFotosGame.ts     factory, bridge e destroy do Game
  ExpressScene.ts                   orquestrador de uma rodada
  ExpressRuntimeController.ts       traduz transições puras em apresentações
  views/
    DeliveryTicketView.ts
    StationBoardView.ts
    StationView.ts
    RailNetworkView.ts
    RailSwitchView.ts
    TrainRigView.ts
    MemoryTreeView.ts
    ExpressHud.ts
    ExpressPauseOverlay.ts
  motion/
    RailPathFactory.ts
    TrainMotionController.ts
    ExpressMotionDirector.ts
  feedback/
    ExpressFeedbackDirector.ts
    ExpressHintDirector.ts
  audio/ExpressAudioDirector.ts
  lifecycle/
    ExpressPresentationScheduler.ts
    ExpressSceneScope.ts
```

ExpressScene cria os objetos, recebe input, envia comando ao domínio, lê a transição e pede apresentação. Views não decidem regra; domínio não conhece tween; motion não muda progresso lógico; SceneScope possui listener, Zone, tween, timer, emitter, áudio e textura derivada daquele GameRun.

Antes de awaiting-station, fotos planeadas, texturas, atlas, paths e cues já estão preparados. Durante switching-track, travelling ou delivering é proibido buscar rede, decodificar foto, gerar textura, criar framebuffer ou reconstruir atlas.

## Fases e gates

| Fase                         | Passos                                                                                                                                                       | Saída                                               | Gate                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **D0 — reset canônico**      | Atualizar produto, SPEC, definition, tipos, rota, jornada, hint, input e layout. Migrar/remover vocabulário de faixa. Definir fallback 1/2/3+ fotos.         | Contrato de estação e storyboard de oito beats.     | Nenhum uso ativo de mecânica antiga; domínio puro e determinístico.       |
| **D0.5 — Rail Motion Lab**   | Criar lab isolado com fixtures: três estações, três routes, chave, progress 0–1, pause, resume e reflow. Sem foto cliente, HUD final ou arte final.          | Prova de curva e locomotiva.                        | Path que desenha é o que move; sem teleporte ou writer concorrente.       |
| **D1 — runtime dividido**    | Extrair views, motion, feedback e lifecycle do arquivo de 999 linhas. Introduzir RailPathFactory e TrainMotionController.                                    | Orquestrador pequeno e componentes com posse clara. | Scene não desenha/escuta/anima tudo; shutdown elimina recursos possuídos. |
| **D2 — vertical slice**      | Construir uma parada completa: fixture, seleção, erro gentil, chave, viagem, entrega, árvore e pausa. Usar composição A1.                                    | Uma entrega que já parece jogo.                     | Todos os critérios D2; sem matriz mobile.                                 |
| **D3 — mundo A1 e feedback** | Produzir kit de arte/áudio a partir do master, manifestar/proveniar, acrescentar quatro planos, VFX finitos e perfis de qualidade.                           | NORMAL visualmente final, sem HIGH.                 | Oito poses coesas; foto → ação → cenário vence sempre.                    |
| **D4 — loop completo**       | Expandir para seis entregas, progresso emocional, vitória, replay por novo GameRun, erro seguro de mídia e árvore final.                                     | Rodada completa.                                    | Cada entrega mantém a mesma gramática, sem virar outro minigame.          |
| **D5 — aprovação criativa**  | Revisar primeira ação, escolha, pausa, entrega e vitória contra prancha A1; corrigir P1/P2.                                                                  | Sign-off da versão local.                           | Zero P1/P2 de compreensão, toque, arte, foto, movimento ou áudio.         |
| **D6 — validação posterior** | Primeiro testes de domínio/lifecycle e passagem focal 390 × 844 + desktop + um Android de referência. Só então matriz completa de viewport, perfil e stress. | Evidência técnica privada.                          | Descoberta não reabre mecânica/arte; se reabrir, volta a D5.              |

## Validação oficial que altera o plano

| Fonte oficial validada                                                                                           | Consequência prática no V2                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Phaser 4.2.1 — Path](https://github.com/phaserjs/phaser/blob/v4.2.1/src/curves/path/Path.js) e tipos instalados | Path suporta linha/Bézier, getPoint e getTangent; runtime usa esses métodos com vetores reutilizados. Não usar tween direto x/y.    |
| [Phaser 4.2.1 — TweenManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/tweens/TweenManager.js)         | addCounter serve ao progresso sem target e chain a beats finitos. Handles são locais; pauseAll/killAll não entram na pausa do jogo. |
| [Phaser 4.2.1 — InputPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js)            | topOnly privilegia o objeto superior; só Zone da estação é interativa e HUD interrompe propagação.                                  |
| [Phaser 4.2.1 — ScaleManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js)          | RESIZE exige pai com dimensão e cobra fill-rate. Host mantém tamanho definido; reflow reaplica layout/path, não CSS no canvas.      |
| [W3C WCAG 2.2 — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)         | Ação completa por pointer único sem arraste; remover swipe reduz ambiguidade e preserva acesso.                                     |
| [W3C WCAG 2.2 — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)               | 24 CSS px é mínimo de critério; 64 CSS px é meta deliberada para estação infantil, com folga entre candidatas.                      |

A tag e os tipos instalados são autoridade de API. Exemplos Phaser 3 podem inspirar ritmo ou organização, mas nunca são fonte para copiar API, renderer, mask ou input no V2.

## Critérios de liberação da matriz mobile

```text
[ ] parece um jogo, não uma página animada
[ ] foto explica a missão
[ ] estação parece e é tocável
[ ] pointerdown responde imediatamente
[ ] chave causa rota observável
[ ] trem percorre exatamente o trilho
[ ] saída, freio e entrega têm peso
[ ] escolha diferente ensina sem punir
[ ] árvore mostra progresso narrativo
[ ] pausa e reflow preservam a viagem
[ ] áudio não é necessário para entender
[ ] NORMAL já tem acabamento final
[ ] LOW e movimento reduzido preservam a ação
```

Somente então executar 390 × 844, 412 × 915, 430 × 932, tablet, paisagem, navegadores, Androids diferentes, perfis de qualidade, lifecycle, mídia, bytes, memória e profiling. Evidências com fotos de cliente continuam privadas e nunca entram em Git.
