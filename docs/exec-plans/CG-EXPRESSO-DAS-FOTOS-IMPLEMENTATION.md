# ARCHIVED_PROTOTYPE_2026-08-29 — Expresso das Fotos V1

> **Não executar este documento.** Ele preserva o histórico do protótipo de
> faixa para auditoria técnica. O produto, a especificação e a implementação
> vigentes estão em [CG-EXPRESSO-DAS-FOTOS-V2-IMPLEMENTATION.md](CG-EXPRESSO-DAS-FOTOS-V2-IMPLEMENTATION.md).
> Todo uso posterior de lane/faixa/portal neste arquivo é histórico e não é um
> requisito, critério de aceite ou orientação para o V2.

**Estado:** replanejamento obrigatório de arte e jogabilidade em 29-08-2026.
M0, M1 e a infraestrutura pura existente permanecem como base técnica; a
primeira cena M5 foi **rejeitada como experiência de produto** e não pode
avançar para testes de aparelhos, performance ou publicação.  
**Decisão de produto:** [Expresso das Fotos](../product/EXPRESSO_DAS_FOTOS.md).  
**Objetivo:** entregar uma brincadeira 2D mobile, segura e foto-prioritária em
que a criança leva um expresso por três faixas até portais-retrato da própria
sessão, sem derrota, tempo eliminatório ou carga do catálogo inteiro.

## Replanejamento obrigatório — arte e jogabilidade antes de testes

Esta seção prevalece sobre o sequenciamento antigo M2–M8. Ela registra uma
decisão de produto, e não uma tentativa de maquiar o protótipo com mais efeitos.
O estado visto na passagem privada de 29-08-2026 é uma referência confidencial:
a captura não é versionada, não contém arte reutilizável e não expõe foto de
cliente neste repositório.

**Decisão:** suspender a matriz de navegadores, Android, stress, medição de FPS
e testes com mais aparelhos. Também não criar novos assets finais nem apenas
"polir" os retângulos, o trem-ícone e os trilhos atuais. Checagens de fonte
estritamente locais podem voltar somente depois de uma mudança de código, para
evitar uma quebra acidental; elas não são validação de UX nem substituem este
gate criativo.

### Diagnóstico que motivou o reset

| ID      | Severidade | Falha observada                                                                                     | Por que quebra a experiência                                                          | Dono da correção    |
| ------- | ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------- |
| EDF-R01 | P1         | Foto, "caminho que brilha", trem e três botões não formam uma missão legível.                       | Nem adulto entende o que comparar, onde tocar ou o que a escolha fará.                | Produto + interação |
| EDF-R02 | P2         | O portal é um painel horizontal marrom com retrato minúsculo; as três opções têm rótulos genéricos. | A foto, que deveria ser a razão do jogo, parece enfeite pequeno e não destino.        | Direção de arte     |
| EDF-R03 | P2         | Trem, trilhos, molduras e HUD usam contornos planos e geometrias soltas.                            | Não há mundo físico, escala, material ou ligação visual entre controle e viagem.      | Arte 2D + motion    |
| EDF-R04 | P2         | Há uma grande área escura sem função e quase nenhuma antecipação, resposta ou chegada perceptível.  | O toque não ganha ritmo, agência nem recompensa; a tela parece uma maquete parada.    | UX + runtime        |
| EDF-R05 | P2         | A orientação depende de uma frase vaga; a coleção "4/6 estrelas" não explica progresso narrativo.   | A criança precisa de um adulto para iniciar, justamente o oposto da promessa do jogo. | Conteúdo + HUD      |

Nenhum destes itens será fechado com glow, neve, confete, um shader ou um novo
teste. A solução exige uma missão visual, uma mecânica de foto compreensível e
um único mundo material coeso.

### Nova premissa jogável — Estação das Lembranças

O Expresso deixa de pedir que a criança adivinhe uma faixa abstrata. Em cada
parada, ele apresenta um **bilhete de entrega** com uma foto grande da sessão e
três **estações físicas** no mesmo cenário. A criança encontra a estação com a
foto igual e toca nela. A chave do trilho muda, o expresso percorre um caminho
visivelmente conectado até a estação escolhida e a foto vira uma estrela no
vagão/Árvore das Memórias.

Isso preserva a fantasia do trem, mas dá à foto uma função real: ela é a pista,
o destino e a lembrança coletada — nunca uma miniatura decorativa. A regra
inteira cabe em uma frase concreta: **"Encontre a foto igual e toque na estação."**
O primeiro destino ensina visualmente a relação entre o bilhete, a estação e o
trilho antes de a criança precisar ler a frase.

| Elemento                 | Função concreta                                                                         | Regra de qualidade                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bilhete de entrega       | Mostra a foto-alvo inteira, em papel texturizado e moldura externa.                     | Fica no terço superior; nenhum filtro ou enfeite toca seus pixels.                          |
| Três estações-candidatas | São plataformas/brinquedos com uma foto legível cada; a foto-alvo aparece em uma delas. | Cada cartão inteiro é alvo de no mínimo 64 CSS px na menor largura; não usar botão anônimo. |
| Chave de trilho          | Converte o toque da estação em causa física visível.                                    | A agulha move antes do trem partir; trilhos desenhados conectam partida e destino.          |
| Expresso                 | Entrega a lembrança, não é um ícone solto.                                              | Roda, cabine, sombra, farol e vapor pertencem ao mesmo rig e à mesma luz.                   |
| Painel de memória        | Mostra entregas como estrelas/fotos que preenchem uma árvore aos poucos.                | Progresso é "Estrelas entregues 4 de 6", não só uma fração sem contexto.                    |

#### Regra por número de fotos

| Fotos autorizadas | Estações exibidas                                                         | Experiência                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 3 ou mais         | Três fotos reais: uma alvo e duas diferentes.                             | Partida normal de correspondência visual.                                                                                    |
| 2                 | Duas fotos reais e uma estação fechada ilustrada, claramente não tocável. | O alvo continua uma foto real; nunca se inventa um rosto ou duplica arquivo.                                                 |
| 1                 | Uma única estação de foto, em uma mini-entrega de descoberta.             | A criança toca o cartão-foto, muda a chave e assiste à primeira transformação; não se finge que há um desafio de comparação. |

A rota ainda possui até seis entregas, seleção determinística e nenhuma perda.
Porém `ExpressRoute` deverá passar a modelar `targetPhotoId`, três cartões de
estação com disponibilidade explícita e `targetStationIndex`; a antiga noção
de "faixa certa invisível" deixa de ser a regra central. O domínio continua
puro, sem pixels, URLs, Phaser ou aleatoriedade global.

### Sequência de uma parada (o que a criança sente)

1. **Chegada da missão, 0–450 ms:** o bilhete entra como um cartão físico; a
   foto já está grande e clara. O condutor/placa aponta uma vez, sem bloquear,
   da foto para as três estações. Na primeira parada há uma única dica: “Ache a
   foto igual”.
2. **Escolha, no próximo frame:** pressionar uma estação comprime o cartão,
   aquece a borda e faz a chave de trilho clicar em até 120 ms. O feedback
   visual precede áudio e qualquer movimento.
3. **Trajeto, 780–1.050 ms:** o trem acelera por 140 ms, segue o trilho já
   escolhido e freia antes da plataforma. Rodas giram pelo avanço da raiz;
   cabine tem microbalanço limitado, sombra acompanha o chão e dois ou três
   puffs de vapor saem atrás da locomotiva. Nada desliza lateralmente sem trilho.
4. **Escolha gentil:** numa estação diferente, o cartão reconhece o toque com
   toque macio de madeira, volta em 180 ms e o bilhete recebe um contorno
   dourado que aponta para a foto igual. Sem vermelho, perda, fala triste,
   contagem de erro ou viagem falsa.
5. **Entrega, 450–650 ms:** a plataforma acende, o envelope do bilhete recebe
   um selo e a foto viaja para um enfeite vazio da árvore. Só então o próximo
   bilhete aparece. Cada efeito termina; não há partículas em loop sobre fotos.
6. **Final:** após a sexta entrega, o trem chega à árvore. Os seis enfeites
   aparecem um a um, a luz quente sobe pela árvore e a mensagem curta surge
   depois da última foto: “Sua árvore está brilhando!”

### Desenho de tela em retrato — sem espaço morto

```text
┌──────────────────────────────────────┐
│ [pausa]  Estrelas entregues  4 de 6  [som] │
│  ┌────── Bilhete: quem vamos visitar? ───┐ │
│  │             FOTO-ALVO                 │ │
│  └───────────────────────────────────────┘ │
│        fachada da estação / céu frio        │
│   ┌──────┐    ┌──────┐    ┌──────┐         │
│   │ foto │    │ foto │    │ foto │  estações│
│   └───┬──┘    └───┬──┘    └───┬──┘         │
│       ╲          │          ╱   trilhos reais│
│        ╲____[expresso]_____/                │
│        árvore/estrelas já entregues          │
└──────────────────────────────────────┘
```

O layout usa as alturas úteis de 390 × 844 como comp mínima: HUD de 52 px,
bilhete de missão entre 150–178 px, mundo e trilhos no miolo, estações grandes
acima do trem e coleção integrada no fundo inferior. Não haverá painel de foto
horizontal vazado, botões de trilho repetidos nem um vazio vertical que separe
instrução e ação. Em telas altas, aumenta-se respiro e cenário; em telas
curtas, reduz-se somente decoração — não foto, alvo ou área de toque.

### Direção A1 que precisa existir antes de qualquer arte final

**Mundo:** um diorama 2D de estação de inverno, visto frontalmente em três
quartos. O ambiente é azul-petróleo noturno, com neve macia e baixa; a luz
vem de janelas âmbar, farol da locomotiva e luminárias de latão. A estação é
madeira pintada de verde profundo, bordas de latão fosco e bilhetes em papel
marfim. O trem é um brinquedo premium de madeira laqueada, metal usinado e
rodas de borracha, não clip-art nem desenho infantil raso.

**Realismo 2D:** profundidade nasce de sombras de contato pré-renderizadas,
oclusão suave, imperfeições discretas de material, perspectiva consistente e
luz com causa física. Não nasce de contorno amarelo em toda borda, gradiente
genérico, plástico brilhante, texto gerado dentro da imagem ou filtros de
câmera. A foto de cliente fica protegida por passe-partout real; a moldura e
seus reflexos vivem fora dela.

**Produção de arte:** criar primeiro uma prancha única com capa, missão,
pressão, escolha gentil, viagem, chegada, pausa e árvore final. Se for usada
IA, ela gerará apenas cenário e props originais sem pessoas, logotipos ou
texto. Um compositor normaliza perspectiva, luz, recortes, pivôs e exporta
camadas; nenhum resultado cru de IA entra no browser. Os retratos reais nunca
vão para geração, inpainting, filtro, máscara ou prompt.

### Inventário de assets a aprovar por família, não por improviso

| Família         | Entregáveis de produção                                                                                         | Estados/observações                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Cenário L0–L2   | céu/vila, fachada de estação, neve de chão e árvore de memória em camadas WebP.                                 | Uma direção de luz; sem texto rasterizado; LOW remove só a camada ambiente.                        |
| Trilhos e chave | trilho de partida, três bifurcações, junções, sombras e agulha em poses aberta/fechada.                         | Geometria real da rota; cada pose encaixa sem salto.                                               |
| Expresso        | corpo, rodas, cabine, farol, sombra, vapor e bilheteiro em atlas/rig.                                           | Pivôs documentados; corpo nunca recebe escrita concorrente de posição.                             |
| Estações        | três plataformas, teto, placa vetorial e molduras de cartão.                                                    | Normal, pressionado, alvo sugerido, correta, gentil/incorreta e indisponível.                      |
| Fotos de sessão | `game` para bilhete/árvore e `card` para estações, geradas pelo pipeline já autorizado.                         | `contain`, proporção e pixels preservados; nunca original, path ou filename.                       |
| UI e ícones     | pausa, som ligado/mudo, voltar, compartilhar e selo de entrega em SVG/arte vetorial própria.                    | Ícone + rótulo acessível; normal, pressionado, foco e indisponível.                                |
| VFX finito      | poeira de neve, vapor, brilho de trilho, selo, pequenas estrelas finais.                                        | Pool único; máximo por cue definido após a prancha; exclusão rígida das PhotoSurfaces.             |
| Áudio           | `press-wood`, `switch-click`, `rail-roll`, `steam-soft`, `arrival-chime`, `stamp`, `hint-spark`, `tree-finale`. | Fontes licenciadas, durações curtas e versões com/sem música; áudio nunca explica a regra sozinho. |

### Plano de execução reiniciado

| Fase                             | Passo a passo                                                                                                                                                                                             | Saída que deve existir                                                                 | Gate de passagem                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| D0 — decisão e roteiro           | 1. Consolidar esta nova mecânica. 2. Definir textos infantis curtos. 3. Desenhar os oito beats. 4. Atualizar contrato de rota/candidatas e fallback de 1–2 fotos.                                         | Uma página de produto, jornada por estado e storyboard sem assets finais.              | Responsável consegue explicar “foto igual → estação → trem → estrela” em uma frase.              |
| D1 — direção visual              | 1. Criar prancha A1 em 390 × 844. 2. Fixar ângulo, materiais, paleta e luz. 3. Compor capa, jogo e vitória no mesmo mundo. 4. Definir zonas protegidas das fotos.                                         | Prancha de oito poses e art board de materiais, não um moodboard.                      | Sem retângulo genérico, icone solto, luz sem fonte ou foto pequena; aprovação visual explícita.  |
| D2 — protótipo de game feel      | 1. Construir apenas uma parada com fotos-fake seguras. 2. Implementar cartão → estação → chave → viagem → entrega. 3. Ajustar tempo, peso e feedback. 4. Eliminar qualquer gesto ambíguo.                 | Vertical slice local de uma entrega, sem assets de cliente nem matriz de dispositivos. | Uma pessoa entende a primeira ação sem explicação; não há P1/P2 de missão, alvo ou consequência. |
| D3 — pacote final de arte/áudio  | 1. Produzir os assets por família a partir da prancha aprovada. 2. Passar por proveniência, composição e pipeline mobile. 3. Criar SFX licenciados e mix. 4. Montar manifest/budget.                      | Família visual coerente e entregável em NORMAL; HIGH continua opcional.                | Revisão de todas as oito poses com a mesma luz, escala e hierarquia foto → ação → cenário.       |
| D4 — runtime completo            | 1. Migrar domínio para candidatos de estação. 2. Trocar presenters provisórios pelos assets finais. 3. Implementar todas as telas, pausa, ajuda e árvore. 4. Garantir lifecycle e qualidade LOW/reduzida. | Jogo completo sem elementos provisórios visíveis.                                      | Cada estado pode ser lido sem som; fotos continuam protegidas e a viagem tem causa física.       |
| D5 — revisão de direção          | 1. Revisar a partida, erro gentil, chegada e vitória contra a prancha. 2. Corrigir composição e movimento. 3. Registrar P1/P2.                                                                            | Aprovação criativa explícita da versão local.                                          | Zero P1/P2 de UX, arte, foto, ação, controle ou motion. **Só aqui** M8 é liberada.               |
| D6 — validação técnica posterior | Rodar então a matriz de aparelhos, perfis, lifecycle, mídia e performance já prevista no plano.                                                                                                           | Evidência privada e correções de compatibilidade.                                      | Não muda conceito, mecânica ou direção; qualquer achado desses abre D5 novamente.                |

### Regras de fluidez e som para o vertical slice

- A estação pressionada muda de estado no mesmo ou próximo frame; não aguarda
  áudio, download ou conclusão de tween.
- Um único toque válido bloqueia novas escolhas somente enquanto a viagem está
  comprometida. Não há fila de taps, swipe obrigatório, arraste de precisão ou
  troca lateral de trem fora dos trilhos.
- Animações decorativas ficam em baixa amplitude: parallax só na viagem,
  vapor em bursts, neve atrás da ação. `prefers-reduced-motion` troca o trajeto
  por poses claras e preserva a mesma regra.
- Som começa apenas após gesto do usuário e possui cooldown/voz única. Sem som,
  pressão, chave, trajeto e acerto continuam compreensíveis visualmente.
- Haptic é complemento opcional da plataforma e da preferência do usuário,
  nunca requisito. A resposta native-like mínima é visual e síncrona.

### Relação com os marcos anteriores

M2 passa a ser D1+D2; M4 passa a ser D3; M5/M6 passam a ser D4; M8 fica
bloqueado até D5. O domínio entregue em M3 é uma referência técnica, mas suas
entidades de "faixa certa" deverão ser revisadas em D0 e não são requisito de
compatibilidade com o novo jogo. Não é permitido expandir o protótipo atual
enquanto D0–D2 não tiverem aprovação criativa.

## Acompanhamento de execução

- [x] **M0 — gate de entrada, produto e baseline**
- [x] **M1 — contratos, pacote isolado e composição lazy**
- [ ] **D0 — decisão da mecânica e roteiro (substitui o início de M2)**
- [ ] **D1 — prancha A1 e telas finais**
- [ ] **D2 — vertical slice de game feel**
- [x] **M3 — domínio puro, seleção e arbiter de toque**
- [ ] **D3 — família de assets, áudio e orçamento**
- [ ] **D4 — runtime completo a partir do vertical slice**
- [ ] **D5 — aprovação criativa antes da validação técnica**
- [ ] **D6 / M8 — evidência mobile, Android e fechamento (bloqueado)**

Cada marco só muda para concluído com o aceite e a prova descritos nele.
Falhas P1/P2 da rubrica de experiência bloqueiam o marco seguinte. Uma
alteração de estética, dificuldade, destino da vitória ou aquisição de asset
precisa atualizar a decisão de produto antes de entrar no runtime.

### Registro de execução — 28-08-2026

- **M0:** baseline rápido aprovado com tipagem, lint e testes unitários. Em
  29-08-2026, o ambiente passou para Node 24.20.0 LTS, dentro do intervalo
  declarado pelo repositório; a arquitetura passou sem violação depois que a
  Scene deixou de importar o barrel que também a reexporta.
- **M1:** pacote isolado, definition `subset`, documentação de
  experiência/direção/movimento, política de proveniência, alias Vite e
  registry lazy foram concluídos. A capa abre sem criar canvas; a rota direta
  foi exercitada no navegador local antes de montar o jogo.
- **M3:** `ExpressPhotoSelection`, `ExpressRoute`, `ExpressJourney`, hint,
  progresso, normalizador/árbitro de ponteiro, layout e epoch de apresentação
  foram implementados e cobertos por teste puro. Não há Phaser, DOM, relógio
  real ou aleatoriedade global nesses módulos.
- **M5 (parcial):** a primeira `ExpressoDasFotosScene` abre/fecha pelo bridge,
  usa `Scale.RESIZE`, `SceneScope`, `RequiredAssetLedger`, raw
  `pointerdown`/`pointerup`, zonas explícitas, pausa por posse e invalidação de
  token de apresentação. `planExpressPhotoLoads` garante uma variante `game`
  para a âncora e no máximo cinco variantes `card` únicas, inclusive em sessão
  de uma foto. A revisão local no canvas real validou 390×844, 412×915,
  430×932 e 768×1024; toque da faixa, coleta, pausa/retomada e reflow ficaram
  legíveis. A dica por inatividade é um timer de apresentação possuído, que
  pulsa uma vez a faixa correta e é cancelado em acerto, pausa, resize e saída.
  O E2E repete o caminho de toque, pausa, reflow e teardown com seed Web Crypto
  determinística, sem criar uma API de teste na Scene. A revisão visual em
  paisagem curta encontrou a aproximação indevida entre molduras e faixas; o
  `ExpressLayout` agora reserva 16 px físicos antes da faixa e o coach ocupa o
  cabeçalho nessa orientação. O fundo A1 já substitui o plano geométrico, mas
  trem, portal, trilhos, efeitos e áudio continuam deliberadamente provisórios
  até M2/M4. O `ExpressMotionPlan` calcula duração limitada e proporcional à
  rota sem relógio de Scene; no runtime, a raiz do trem possui somente `x/y`,
  enquanto rig, rodas, sombra e farol animam propriedades distintas. Pausa,
  resize e saída cancelam e normalizam essas referências antes de retomar ou
  destruir a cena. A entrada no estado `awaiting-lane` também posiciona o trem
  no `trainHome`, pois o primeiro layout ocorre ainda no estado `ready`.
- **M4 (parcial):** o fundo L0/L1 `estacao-noturna-diorama-v1.webp` foi criado
  para o projeto, preparado como WebP de 69.570 bytes, catalogado no manifesto
  v2 e integrado com cobertura proporcional. Ele não contém foto ou dado de
  sessão; a família A1 ainda precisa dos layers coerentes de trem, portal,
  trilhos, árvore, ícones e áudio antes de fechar o marco. A passagem privada
  de 29-08-2026 processou uma sessão autorizada em nove fotos reais para 27
  derivadas WebP `thumb`/`card`/`game`, todas nos limites móveis e sem expor
  original, nome de arquivo, caminho ou hash no browser. É evidência local,
  não asset público nem catálogo versionado.

## Resultado de produto que a V1 deve entregar

**Expresso das Fotos** parece uma viagem natalina de brinquedo, não um
endless runner de reflexo. A foto que a família escolheu aparece como passageira
principal no vagão. A cada estação, a criança identifica a faixa do próximo
portal-retrato, toca nela e vê a foto ser adicionada à coleção do trem. No fim,
as fotos formam os enfeites da Árvore das Memórias.

Em até cinco segundos, a pessoa vê a foto, a faixa iluminada e a frase “Toque
na faixa da foto”. Não existe tutorial separado, pontuação, vida, ranking,
buzzer, cronômetro regressivo ou tela de derrota. A rota só avança depois da
chegada correta: experimentar outra faixa é seguro e a dica mostra o próximo
gesto sem executá-lo.

### Decisões V1 congeladas por este plano

| Assunto        | V1                                                                            | Consequência de implementação                                            |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Faixas         | Três: esquerda, centro e direita.                                             | Geometria e estado usam somente três valores.                            |
| Duração        | Seis portais normais; alvo de 2–4 minutos, sem pressão.                       | Nenhum timer termina a rodada.                                           |
| Foto âncora    | A foto selecionada no Hub é obrigatória.                                      | Capa, vagão e vitória a usam; domínio inclui seu identificador primeiro. |
| Sessão pequena | Uma foto é repetida na rota; 2–5 usam todas e repetem apenas o necessário.    | A disponibilidade mínima é uma foto, sem carregar cópias da URL.         |
| Sessão grande  | No máximo seis fotos na V1 normal.                                            | Sessão de 92 fotos continua carregando subconjunto limitado.             |
| Foto no portal | Moldura com contain, sem crop de pessoa.                                      | Layout usa PhotoSurface e passe-partout responsivo.                      |
| Entrada        | Toque direto em faixa conclui toda a rodada; swipe é opcional.                | Nenhuma função depende de arraste, sensor ou multitouch.                 |
| Erro           | Faixa errada confirma o toque e mantém o portal acessível.                    | Não perde progresso, não conta erro e não reproduz alarme.               |
| Dica           | Após sete segundos sem progresso, realça faixa e portal uma vez.              | Timer é de apresentação, nunca solução do domínio.                       |
| Pausa          | Congela input, viagem, dica, som e efeitos.                                   | Retomada preserva o mesmo estado lógico e visual.                        |
| Vitória        | Árvore recebe fotos antes de texto/efeito.                                    | Celebração é curta e fica fora dos retratos.                             |
| Desafio        | Oito fotos apenas quando houver oito fotos e a ação pós-vitória for genérica. | Não mostrar botão antes desse gate.                                      |

## Pré-condições e limites não negociáveis

1. A decisão de produto do Expresso deve continuar aprovada pelo responsável.
   Esta execução não altera a fantasia, o uso da foto, a duração ou o destino
   de vitória sem novo registro.
2. Validar o ambiente em Node 24 antes do gate final. O repositório declara
   Node 24; o dependency-cruiser não suporta Node 25 no ambiente atual.
3. Ler a skill Phaser 4.2.1 correspondente a input de pointer/touch, Scale
   Manager, tweens, texturas e áudio antes de modificar runtime. Conferir os
   tipos instalados e um exemplo oficial compatível; a fonte e os tipos da tag
   4.2.1 são a autoridade quando a API pública estiver em outra versão.
4. O domínio não pode importar Phaser, React, DOM, rede, storage, Date.now ou
   Math.random. Só recebe relógio e aleatoriedade injetados quando realmente
   necessários.
5. apps/play permanece sendo a única composição: platform e theme não importam
   o jogo; o jogo não importa Puzzle, Memory ou Tic-Tac-Toe.
6. Foto original, caminho físico, filename, token, URL de derivada e nome do
   cliente jamais entram em domínio, analytics, manifesto, arte estática,
   screenshot versionado ou mensagem de falha.
7. O runtime recebe apenas derivadas autorizadas do GameContext. A autorização
   do backend precede o X-Accel-Redirect em produção.
8. Botão/faixa principal tem alvo de pelo menos 52 CSS px; botão secundário
   declarado pode ter 44 CSS px. Os valores de swipe começam em 16 px e
   200 ms, mas só ficam estáveis após observação com crianças.
9. LOW e movimento reduzido são políticas independentes. Ambos mantêm fotos,
   trilhos, toque, dica, pausa e vitória; nenhum depende de filter, Lighting,
   WebGL, scroll contínuo, parallax ou emitter ambiente.
10. Cada asset de navegador passa por proveniência, manifesto, auditoria e
    orçamento. Não usar asset de outro jogo por import relativo: ou catalogar
    cópia aprovada para este jogo, ou provar depois a necessidade de um
    componente compartilhado.
11. A direção A1 exige uma prancha de arte com a mesma luz e o mesmo material
    em todas as poses antes de criar runtime. Referência de IA, se houver,
    orienta somente; não entra no navegador sem origem, licença, preparo e
    revisão humana.
12. Realismo não autoriza alterar a foto: filtros, normal maps, máscaras de
    GameObject, luz de imagem, distorção e pós-processamento são vedados sobre
    derivadas da sessão. O primeiro experimento de WebGL, se aprovado, atua
    exclusivamente na carcaça decorativa do trem.

## Correções após validação oficial — 28-08-2026

O plano foi revisado contra a fonte e os tipos instalados do Phaser 4.2.1, uma
referência oficial de uso de pointer e WCAG 2.2. A documentação pública do
Phaser acompanha a versão mais recente; portanto, em qualquer divergência de
API, prevalecem a [tag 4.2.1](https://github.com/phaserjs/phaser/tree/v4.2.1)
e `node_modules/phaser/types/phaser.d.ts` instalados no repositório.

| Constatação oficial                                                                                 | Risco se ignorada                                                       | Regra adicionada ao Expresso                                                                                                                                                                                                               | Evidência de implementação                                          |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `InputPlugin.topOnly` é verdadeiro por padrão e só o objeto mais alto recebe o evento.              | Um portal, brilho ou overlay pode roubar a faixa.                       | Três `Zone`s transparentes são os únicos alvos jogáveis durante a estação; portal, foto, trilho e VFX não são interativos. Controles ativos chamam `stopPropagation`; sobreposição é teste obrigatório.                                    | EDF-023 e teste com HUD/portal sobre a faixa.                       |
| O drag por tempo só inicia após movimento no polling padrão.                                        | Swipe longo pode parecer travado e alterar a sensação de toque simples. | A V1 não usa `setDraggable` nem polling contínuo: normaliza `down`/`up` próprios em coordenadas de layout e classifica swipe só no `up`. Tap direto continua suficiente.                                                                   | EDF-024 e teste de down/up, cancelamento e dois dedos.              |
| O Scale Manager recalcula bounds e emite resize; `RESIZE` exige um pai com tamanho definido.        | Área de toque desalinha após rotação, barra do navegador ou resize.     | O host do canvas tem dimensão real; Phaser controla o canvas via `Scale.RESIZE`. O listener de resize recalcula câmera, zonas e layout sem CSS direto no canvas.                                                                           | EDF-025, visual portrait/paisagem e hit-area debug no Lab.          |
| Pausar todos os tweens para também os novos tweens do Scene TweenManager.                           | O botão Continuar e a entrada/saída do overlay podem congelar.          | Pausa é uma política de objetos possuídos: desabilita somente as faixas, suspende timers/tweens de jogo e mantém o overlay interativo. Não usar `this.input.enabled = false`, `pauseAll`, `killAll` ou `scene.pause()` como atalho global. | EDF-026, pausa durante viagem e overlay acionável.                  |
| O Loader pode terminar com arquivos em erro; `complete` não prova que cada requisito foi carregado. | Portal vazio, rota parcial ou retry invisível.                          | `RequiredAssetLedger` só libera `ready` quando toda chave essencial tiver sucesso confirmado; erro gera retry limitado e falha segura no bridge.                                                                                           | EDF-027 com fixture HTTP que falha uma foto.                        |
| Emitter com `frequency: 0` flui ao máximo; `explode()` é o modo finito.                             | Neve/estrelas podem consumir GPU e esconder as fotos.                   | Explosões usam pool único e `explode`; nenhum burst usa `frequency: 0`. Neve é desligada em LOW/reduzido/pausa e fica atrás dos trilhos.                                                                                                   | EDF-028, contador de emitters/partículas e revisão visual.          |
| Mobile bloqueia áudio até ação explícita; `pauseAll` e `stopAll` operam no gerenciador inteiro.     | Primeiro toque pode atrasar; saída pode cortar som do shell.            | Primeiro gesto já dá feedback visual; o diretor só toca quando o áudio estiver liberado. Ele mantém referências próprias `expresso:*` e pausa/destroi só essas fontes.                                                                     | EDF-029, teste de primeiro gesto, mudo e teardown sem afetar shell. |
| WCAG 2.5.7 pede alternativa de ponteiro único para arraste e 2.5.8 define mínimo de 24 CSS px.      | Criança menor pode depender de precisão/arraste.                        | Toque direto é a ação completa; 52 px para faixa é meta de produto infantil deliberadamente superior ao mínimo WCAG, não uma alegação de conformidade integral.                                                                            | EDF-030 e inspeção de zonas reais.                                  |

### Contrato de fluidez native-like

O termo native-like aqui é comportamento percebido, não promessa de aplicativo
nativo: a criança recebe pressão visual no mesmo/próximo frame, nunca espera
rede ou áudio para ver resposta, não precisa de scroll, não perde progresso com
um toque fora da faixa e pode interromper a brincadeira com pausa/Back sem
resíduo. O Track Lab mede o instante de `pointerdown`, a primeira alteração de
estado visual e a primeira resposta de áudio, sempre com fixture segura. A
decisão de ajuste vem da observação e da medição em Android de referência, não
de suposições de FPS ou dispositivo.

## Decisão visual A1 — realismo cinematográfico viável em 2D

**Aprovada para planejamento em 28-08-2026:** o Expresso das Fotos assume a
direção “diorama natalino premium”. O objetivo não é um 3D fotorrealista
disfarçado, e sim a sensação de objeto físico de alta qualidade em uma cena 2D
mobile: madeira laqueada com veio sutil, latão fosco, papel espesso, vidro com
reflexo discreto, tecido vermelho profundo, neve macia e fontes de luz que têm
causa visível. A fotografia da sessão é a exceção humana e a maior verdade
visual; ela nunca recebe filtro de cor, blur, distorção, máscara animada ou
efeito que altere seus pixels.

| Promessa de qualidade           | Como será produzida                                                                                          | O que é proibido                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Profundidade convincente        | Quatro planos com escala, sombra e parallax curto somente durante uma viagem.                                | Câmera instável, parallax contínuo em leitura, cenário sobre foto.     |
| Materiais críveis               | Texturas e luz já preparadas nos assets; bordas, sombras de contato e highlights têm a mesma direção de luz. | Textura genérica repetida, dourado fluorescente, reflexo sem fonte.    |
| Movimento orgânico              | Trem em rig 2D com aceleração, desaceleração, rodas e suspensão discretas vinculadas à rota.                 | Bounce de arcade, giro livre, física aleatória ou trem entre faixas.   |
| Natal profissional              | Azul-noturno/frio no ambiente, âmbar de janela/lanterna e dourado fosco somente para guiar conquista.        | Néon, estroboscópio, chuva de partículas, personagem que rouba a foto. |
| Acabamento em qualquer aparelho | O visual base usa imagens, tint/alpha e tweens; HIGH é acréscimo medido e opcional.                          | Tornar WebGL, filtro de câmera ou shader condição para entender/jogar. |

### Estratégia de renderização e compatibilidade

1. **Base NORMAL/Canvas:** camadas raster WebP preparadas, SVG apenas para
   ícones nítidos, imagens estáticas para objetos parados e sprites somente
   onde exista animação de frames. A aparência premium já precisa estar aqui.
2. **WebGL HIGH, em experimento isolado:** um único objeto _não fotográfico_
   (a carcaça do vagão) pode testar iluminação de imagem interna com normal map
   e environment map. Phaser 4 oferece `ImageLight`, mas ele exige esses dois
   mapas e filtros são WebGL-only; portanto não será aplicado a foto, portal,
   HUD, câmera inteira ou a múltiplos objetos.
3. **Fallback determinístico:** se a comparação em Android mostrar custo,
   artefato, compilação tardia ou incompatibilidade, o vagão usa o highlight
   pré-renderizado aprovado. Nenhuma condição de negócio, toque ou vitória
   depende de WebGL, `ImageLight`, bloom, bokeh, CaptureFrame ou DynamicTexture.
4. **Sem filtro caro por frame:** filtros externos de câmera, blur, panorama
   blur, sampler/readPixels e bloom em cadeia são proibidos na V1. Uma sombra
   ou halo que precise existir constantemente deve vir preparada no asset;
   glow efêmero só pode entrar depois de medição e em região pequena.
5. **Textura e memória são parte do design:** todas as imagens de cena e fotos
   são carregadas antes de começar a desenhar a estação. A resolução, número de
   texturas e VRAM estimado são auditados por viewport/`devicePixelRatio`; não
   se carrega um master gigante apenas para alegar realismo.

Esta escolha segue a capacidade oficial do Phaser de iluminação baseada em
imagem, que usa normal/environment map, e sua orientação de que filtros são
WebGL-only e custam renderização extra. A política de assets também segue a
recomendação de dimensionar VRAM por pixel/viewport e purgar recursos que não
pertencem mais à cena; os links oficiais constam no fim deste plano.

## Especificação de aceite a congelar em M1

| ID      | Requisito                                                                                                                                                          | Prova                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| EDF-001 | A foto âncora é obrigatória e a rota normal planeja exatamente seis destinos sem consultar pixels ou URLs.                                                         | Teste de seleção.                                |
| EDF-002 | Sessões de 1, 2–5, 6–7 e 92 fotos seguem a política documentada e não criam mais de seis fontes distintas.                                                         | Unitário + E2E fixture.                          |
| EDF-003 | Seleção prioriza orientação pouco representada quando houver escolha, com desempate reproduzível.                                                                  | Unitário com seed.                               |
| EDF-004 | Rota, faixa e progresso são determinísticos e não importam browser, Phaser, relógio real ou aleatoriedade global.                                                  | Testes de domínio + arquitetura.                 |
| EDF-005 | Só a faixa correta inicia travelling; faixa errada não consome destino, altera progresso ou produz punição.                                                        | Máquina de estados.                              |
| EDF-006 | Cada coleta ocorre uma vez, apenas após chegada e apresentação confirmadas; comandos duplicados são idempotentes.                                                  | Teste de jornada.                                |
| EDF-007 | Portal, vagão e vitória mostram foto vertical, horizontal e quadrada com contain, sem distorção/crop padrão.                                                       | Teste de layout + screenshots.                   |
| EDF-008 | Primeiro pointer down recebe estado de pressionado no mesmo ou próximo frame e não espera áudio, asset ou efeito.                                                  | Instrumentação de feel.                          |
| EDF-009 | Um toque simples permite concluir a viagem; swipe é adicional e não cria fila de troca de faixa.                                                                   | Arbiter + Playwright touch.                      |
| EDF-010 | Dica depois de sete segundos mostra a faixa e o portal, mas não move trem, coleta foto ou reduz o número de destinos.                                              | Fake clock + E2E.                                |
| EDF-011 | Pausar/ocultar a aba estabiliza a cena e congela a apresentação; retomar conserva destino, faixa e progresso.                                                      | Playwright visual.                               |
| EDF-012 | Resize no meio de entrada, mudança de faixa ou coleta preserva identificador, destino, textura e estado, fazendo apenas reflow.                                    | Layout + E2E.                                    |
| EDF-013 | A cena normal carrega somente uma variante game da âncora e no máximo cinco variantes card; nunca carrega catálogo inteiro ou duplicados.                          | Adapter + inspeção de rede privada.              |
| EDF-014 | Falha de foto essencial usa retry limitado e erro seguro; não inicia com portal vazio, substituto genérico ou rota parcial.                                        | Fixture HTTP.                                    |
| EDF-015 | Todo ícone e faixa tem estado normal, pressionado, foco e indisponível; o estado não depende só de cor.                                                            | Lab + revisão visual.                            |
| EDF-016 | LOW e reduzido preservam ação, fotos, progresso, dica e vitória sem ambiente caro ou movimento decorativo contínuo.                                                | Screenshots nos perfis.                          |
| EDF-017 | Som começa apenas após gesto, mudo é respeitado, um gesto não dispara SFX sobreposto e saída encerra fontes.                                                       | E2E de áudio + revisão.                          |
| EDF-018 | Vitória mostra fotos na árvore antes de CTA; efeitos permanecem finitos e fora da foto.                                                                            | Screenshot e revisão.                            |
| EDF-019 | Cinco entradas/saídas deixam um canvas no jogo e zero depois; não permanecem texturas, tweens, timers, emitters ou áudio da Scene.                                 | Lifecycle E2E.                                   |
| EDF-020 | Métricas futuras, se aprovadas, são agregadas e nunca guardam foto, URL, token, filename ou identidade.                                                            | Revisão de contrato.                             |
| EDF-021 | Ações de desafio/replay geram novo GameRun e seed; uma rodada completa não é reiniciada dentro de Scene terminal.                                                  | E2E de lifecycle.                                |
| EDF-022 | Sem P1/P2 aberto na rubrica de criança, visual, desempenho e controle antes de liberar.                                                                            | Registro de revisão.                             |
| EDF-023 | Só controles declarados são interativos; com objetos sobrepostos, a ação chega a um único dono e nunca atravessa portal/VFX para a faixa.                          | Teste de propagação + hit-area debug.            |
| EDF-024 | Um único ponteiro ativo possui o gesto até `up`/cancelamento; segundo dedo, saída do canvas, pausa e saída limpam o press sem enfileirar comando.                  | Playwright touch + unitário do arbiter.          |
| EDF-025 | O host do canvas tem tamanho definido e todo resize recalcula câmera, safe area, hit areas e posições a partir do layout puro.                                     | Resize/rotação + screenshot.                     |
| EDF-026 | Pausa deixa apenas o overlay operacional: faixas, dica automática, trem, efeitos e áudio do jogo congelam sem congelar Continuar/Sair.                             | E2E durante tween + inspeção de handles.         |
| EDF-027 | `ready` só ocorre com sucesso individual de todas as chaves requeridas; `complete` do loader isoladamente não é sinal de prontidão.                                | Fixture com `FILE_LOAD_ERROR`.                   |
| EDF-028 | Cada burst de partículas é finito, sai atrás das fotos e é criado de pool único; `frequency: 0` é proibido nos efeitos deste jogo.                                 | Teste de perfil + revisão visual.                |
| EDF-029 | Áudio desbloqueia após gesto sem atrasar feedback e o diretor nunca usa pausa/stop globais para encerrar recursos do jogo.                                         | E2E de áudio + teardown isolado.                 |
| EDF-030 | Tap direto completa a rodada e todas as zonas principais medem ao menos 52 CSS px após qualquer reflow; swipe permanece opcional.                                  | Inspeção de layout + touch E2E.                  |
| EDF-031 | Callback de tween/timer só confirma chegada se `runId`, destino e `presentationEpoch` ainda forem atuais; resize, pausa e saída invalidam callbacks antigos.       | Unitário de scheduler + E2E.                     |
| EDF-032 | `shutdown` e destroy liberam listener, Zone, textura de foto, áudio, timer, tween e emitter possuídos; destroy de Game só conclui após seu evento terminal.        | Cinco ciclos + auditoria de recursos.            |
| EDF-033 | A foto de sessão não recebe filtro, mask, tint, normal map, blur, distorção ou correção visual destrutiva; moldura e luz ficam fora de sua superfície.             | Inspeção de display list + screenshots privadas. |
| EDF-034 | Capa, estação, toque, erro gentil, chegada, pausa e vitória usam a mesma prancha de materiais, luz e profundidade; nenhuma pose parece de outro jogo.              | Prancha de arte + revisão visual.                |
| EDF-035 | Todo movimento do trem tem dono único por propriedade: raiz controla posição, rig controla rodas/suspensão/luz e nenhuma escrita concorrente ocorre durante tween. | Teste de MotionRig + vídeo mobile.               |
| EDF-036 | Movimento começa no primeiro/próximo frame, tem aceleração e acomodação perceptíveis, e termina exatamente na faixa lógica sem overshoot ou frame solto.           | Instrumentação + 60 Hz/120 Hz Android.           |
| EDF-037 | A estética base NORMAL mantém materiais, profundidade e foto legível sem WebGL avançado; HIGH só adiciona um efeito aprovado, nunca remove qualidade funcional.    | Matriz Canvas/WebGL/LOW/reduzido.                |
| EDF-038 | Filtros não incidem em fotos, HUD ou câmera; ImageLight, se aprovado, usa um único vagão decorativo, assets próprios e fallback pré-renderizado.                   | Feature probe + inspeção de filtros.             |
| EDF-039 | Assets de cena têm master privado, variante runtime, papel, plano, material, estado de toque e provimento registrado; só formatos aprovados chegam ao webroot.     | Manifesto v2 + auditoria.                        |
| EDF-040 | Nenhuma textura, upload de foto, atlas ou criação de framebuffer ocorre durante travelling/collecting; a rota é estável mesmo sob rede lenta.                      | Trace de loader + E2E offline/falha.             |
| EDF-041 | A revisão de arte em 390, 412, 430 e 768 px confirma foto → ação → instrução antes de materiais e efeitos, em fotos claras/escuras e todos os perfis.              | Rubrica visual mobile + evidência privada.       |

## Arquitetura e mapa de arquivos

O comando de criação é o ponto de partida quando M1 for autorizado:

```text
pnpm game:new expresso-das-fotos
```

Ele cria o esqueleto não registrado. A implementação completa deve convergir
para o mapa abaixo; ajustes de nomes só são aceitos se preservarem as fronteiras
de propriedade.

```text
packages/games/expresso-das-fotos/
  SPEC.md
  EXPERIENCE.md
  EXPERIENCE_REQUIREMENTS.json
  ART_DIRECTION.md
  MOTION_SCORE.md
  ASSET_PROVENANCE.md
  assets/README.md              reserva de contrato; manifest.json nasce em M4
  src/
    definition.ts
    index.ts
    tuning.ts
    domain/
      ExpressPhotoSelection.ts
      ExpressRoute.ts
      ExpressJourney.ts
      ExpressProgress.ts
      ExpressHint.ts
      ExpressTypes.ts
    runtime/phaser/
      createExpressoDasFotosGame.ts
      ExpressScene.ts
      ExpressLayout.ts
      ExpressInputArbiter.ts
      ExpressGestureNormalizer.ts
      ExpressPhotoLoader.ts
      RequiredAssetLedger.ts
      ExpressPresentationScheduler.ts
      ExpressSceneScope.ts
      ExpressMotionRig.ts
      ExpressCinematicLayers.ts
      ExpressRendererQuality.ts
      ExpressHud.ts
      ExpressPauseOverlay.ts
      ExpressAudioDirector.ts
      ExpressFeedback.ts
      ExpressVictoryPresentation.ts
      visualAssets.ts
      audioAssets.ts
  tests/
    ExpressPhotoSelection.test.ts
    ExpressRoute.test.ts
    ExpressJourney.test.ts
    ExpressProgress.test.ts
    ExpressHint.test.ts
    ExpressLayout.test.ts
    ExpressInputArbiter.test.ts
    expresso-mobile.spec.ts
apps/play/
  package.json
  vite.config.ts
  src/phaser/gameRegistry.ts
  src/screens/GameScreen.tsx        somente se a ação desafio virar genérica
```

| Área           | Responsabilidade                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------- |
| definition     | Metadados seguros para Hub/capa: identificador, texto curto, subset, mínimo 1 e recomendado 6.      |
| domain         | Seleção, rota, transições, progresso e dica sem engine.                                             |
| tuning         | Números de UX, durações, thresholds, cooldowns e limites de pool inicial, todos revisáveis.         |
| runtime/phaser | Carrega derivadas autorizadas, desenha, traduz input, apresenta resultados puros e libera recursos. |
| apps/play      | Registra dependency, alias e loader lazy; mantém rota, capa, retry, saída e lifecycle.              |
| platform       | Somente contratos/runtime genérico já existente, sem dependência do Expresso.                       |
| theme          | Tokens e game feel existentes; não recebe regra ou Scene do Expresso.                               |

Antes de registrar o loader lazy, validar todas as edições de composição de uma
vez. O Hub não pré-carrega fotos quando um card aparece. Capa não monta Phaser.
GameScreen não recebe Scene nem estado de foto; React conversa por eventos
tipados do bridge.

`ExpressGestureNormalizer` converte `pointerdown`/`pointerup` em um gesto
imutável nas coordenadas do layout. `ExpressInputArbiter` decide se aquele gesto
pertence à faixa, HUD ou overlay e se é aceito pelo estado da jornada.
`ExpressPresentationScheduler` possui apenas timers/tweens de jogo, atribui um
`presentationEpoch` a cada sequência e invalida o epoch em pause, resize, retry
ou saída. `ExpressSceneScope` é o dono único de listeners, Zones, tweens,
timers, emitters, sons e texturas derivadas daquele GameRun. Nenhum callback de
apresentação é autorizado a fazer transição no domínio sem validar `runId`,
destino e epoch atuais.

`ExpressMotionRig` encapsula o trem em raiz, carcaça, rodas, sombra de contato,
janela-foto e luz. A raiz possui `x`/`y`; um único tween por viagem é seu dono.
Rodas e luz derivam do progresso daquela viagem e jamais escrevem a posição da
raiz. `ExpressCinematicLayers` aplica o mesmo contrato aos quatro planos, sem
efeito sobre a PhotoSurface. `ExpressRendererQuality` seleciona NORMAL, HIGH,
LOW e reduzido por capacidade/produto, e só expõe o experimento de luz de
imagem após evidência.

## Jogabilidade e estados

### Máquina de estados de domínio

| Estado        | Entrada aceita                | Resultado                                                         | Entrada rejeitada                  |
| ------------- | ----------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| ready         | start                         | Primeiro destino passa a awaiting-lane.                           | Todas as demais.                   |
| awaiting-lane | chooseLane                    | Correta: travelling. Outra: remains awaiting-lane com wrong-lane. | Comando inexistente.               |
| travelling    | arrivalFinished               | collecting.                                                       | Novas faixas, dica e nova chegada. |
| collecting    | collectionPresented           | Próximo awaiting-lane ou completed.                               | Faixas e coleta duplicada.         |
| paused        | resume                        | Retorna ao estado de apresentação estabilizado.                   | Todas as ações jogáveis.           |
| completed     | exit/replay pedido pelo shell | Encerramento limpo.                                               | Faixa, dica e coleta.              |

O estado paused pode ser uma camada de jornada ou um snapshot explícito; a
escolha deve ser testável e não pode depender de um tween ainda rodando. Ao
pausar, a apresentação primeiro comita a posição lógica atual ou cancela a
viagem antes de exibir o overlay; incrementa o `presentationEpoch`, suspende
somente handles de jogo e desativa as três Zones de faixa. O overlay continua
interativo na mesma Scene. Não suspender a Scene inteira, o `InputPlugin`
inteiro ou o TweenManager inteiro: isso também congelaria Continuar/Sair. A
apresentação tem fases próprias — entering, playing, pausing, paused,
celebrating e leaving — e nunca modifica a verdade da rota.

### Sequência de uma estação

| Momento         | Resposta que a criança percebe                                                                       | Dono técnico                   |
| --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| Destino entra   | Portal com próxima foto aparece em uma faixa; instrução única volta se ainda for a primeira estação. | Presenter.                     |
| Pointer down    | Faixa escolhida comprime e destaca; input é aceito/rejeitado pelo arbiter.                           | Input + feedback.              |
| Faixa errada    | Trem acomoda na faixa tocada; portal permanece e cristal dourado aponta a faixa certa.               | Presenter; domínio não avança. |
| Faixa correta   | Trem se desloca até a faixa e bloqueia novos comandos válidos.                                       | Journey + tween finito.        |
| Chegada         | Portal abre, foto recebe moldura de coleção e progresso atualiza uma vez.                            | Journey + feedback.            |
| Próxima estação | Cenário muda de forma curta; próximo portal entra pronto para novo toque.                            | Presenter.                     |
| Última coleta   | Árvores/enfeites recebem fotos, depois a celebração.                                                 | Victory presentation.          |

### Protocolo de toque: simples, imediato e sem ambiguidade

1. Na estação, existem exatamente três Zones retangulares transparentes — uma
   por faixa — criadas a partir de `ExpressLayout`; o vagão e trilhos podem
   cruzá-las visualmente, mas não capturam pointer.
2. O primeiro `pointerdown` elegível registra `pointerId`, posição, timestamp e
   faixa; ele aplica PressGlow antes de pedir áudio. Todo segundo ponteiro é
   ignorado até o primeiro terminar ou ser cancelado.
3. No `pointerup`, o normalizador produz tap se a trajetória não passou o
   limiar; produz swipe somente se o eixo horizontal, distância e tempo forem
   válidos. Ambos viram um único `chooseLane`; não há fila de mudança de faixa.
4. `up` fora da zona, cancelamento do navegador, perda de foco, pausa, resize ou
   saída limpam posse e estado pressionado sem disparar comando tardio.
5. HUD e overlay são camadas acima das faixas. Cada controle ativo interrompe a
   propagação; em estado de jogo, decoração, fotos, portal, cristal e VFX ficam
   sem `setInteractive`. `topOnly` permanece ligado e é verificado no Lab.
6. Pressão visual é reversível: a faixa volta ao normal após aceitação, rejeição,
   cancelamento ou mudança de estado. “Inativa” inclui marca não cromática
   (redução de contraste + trilho recolhido), nunca apenas troca de cor.

Swipe é um mimo para a criança que já tenta arrastar o trem; não há tutorial,
texto ou bloqueio que o torne necessário. Essa decisão oferece alternativa de
ponteiro único a qualquer movimento de arraste.

### Tuning inicial que o Track Lab deve validar

Os números são hipóteses de sensação, não orçamento de desempenho ou garantia
de dispositivo. Eles vivem em tuning local e são alterados só com screenshot,
observação de criança ou medição registrada.

| Item                 | Valor inicial       | Regra                                                    |
| -------------------- | ------------------- | -------------------------------------------------------- |
| Alvo de faixa        | mínimo 52 CSS px    | A zona tocável, não só a arte, respeita o mínimo.        |
| Ícone secundário     | mínimo 44 CSS px    | Pausa, som e dica têm área clara e separada.             |
| Swipe                | 16 px em até 200 ms | O toque direto continua sendo a forma completa de jogar. |
| Assistência ociosa   | 7.000 ms            | Uma dica; reinicia em todo toque.                        |
| Press                | 80–120 ms           | Escala/borda curtas, sem bounce agressivo.               |
| Troca de faixa       | 160–220 ms          | A ação visual começa antes de qualquer SFX.              |
| Abertura do portal   | 160–220 ms          | Foto continua inteira; não usar flash.                   |
| Entrada na coleção   | 220–320 ms          | Uma única trajetória; não cobrir rosto.                  |
| Transição de estação | até 320 ms          | Sem scroll necessário no reduzido.                       |
| Dica                 | até 900 ms, uma vez | Portal e faixa; nunca completa ação.                     |
| Vitória              | até 1.500 ms        | Árvore e fotos primeiro; efeitos depois.                 |
| Cooldown de botões   | 60 ms inicial       | Evita sobreposição, sem tornar toque lento.              |
| Posse de ponteiro    | primeiro ativo      | Segundo dedo é ignorado até `up`/cancelamento.           |
| Retorno visual       | mesmo/próximo frame | É aferido entre `pointerdown` e estado pressionado.      |
| Reflow               | sem animação extra  | Interrompe handle antigo e calcula posição pelo layout.  |
| Área protegida       | 8 CSS px inicial    | Separação mínima entre faixa, HUD e borda segura.        |

## Track Lab, telas e ícones

M2 cria um laboratório local e isolado da sessão. Ele usa fixtures, nunca foto
de cliente, token ou endpoint privado. Pode estender o Asset Lab existente ou
criar uma rota de desenvolvimento específica sem entrar no fluxo público.

### Estados que o laboratório precisa mostrar

| Estado             | O que aprova                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| Capa               | Foto âncora proporcional, regra de uma linha e CTA de 52 px.               |
| Estação inicial    | Próximo portal é visualmente óbvio antes da decoração.                     |
| Faixa pressionada  | Compressão, borda, espaço livre e contraste sem depender apenas de cor.    |
| Faixa errada       | Trem responde, portal espera e a orientação é gentil.                      |
| Chegada correta    | Ordem portal → foto → coleção é compreensível.                             |
| Dica               | Cristal/faixa indicam gesto sem parecer botão extra.                       |
| Pausa              | Cena não fica parcialmente ativa; overlay não expõe foto de forma confusa. |
| Vitória            | Árvore, coleção e foto âncora vencem CTA e partículas.                     |
| LOW                | Sem ambiente animado, mas com jogo inteiro legível.                        |
| Movimento reduzido | Sem viagem contínua, neve ou pulso repetido, mas com mesma ação.           |
| Rotação/reflow     | Zonas, foto, HUD e controles continuam dentro da área visível e tocável.   |
| Dois toques        | Só o primeiro gesto age; o segundo não faz fila nem solta o estado press.  |

### Inventário de ícones e controles

| ID visual      | Texto para família    | Papel                     | Estado/tamanho                                      | Observações                                    |
| -------------- | --------------------- | ------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| faixa-esquerda | Faixa da esquerda     | Ação principal.           | Zona mínima 52 px; normal/pressionada/foco/inativa. | Pode ter marcador de trilho, não seta isolada. |
| faixa-centro   | Faixa do meio         | Ação principal.           | Idem.                                               | Centro não pode ficar escondido pelo vagão.    |
| faixa-direita  | Faixa da direita      | Ação principal.           | Idem.                                               | Área livre de decoração.                       |
| pausa          | Pausar brincadeira    | Secundário.               | Mínimo 44 px.                                       | Rótulo simples em overlay.                     |
| continuar      | Continuar             | Primário no overlay.      | Mínimo 52 px.                                       | Não muda posição.                              |
| sair           | Sair da brincadeira   | Secundário no overlay.    | Mínimo 44 px.                                       | Pede saída pelo lifecycle existente.           |
| som            | Ligar som             | Secundário.               | Mínimo 44 px.                                       | Ícone + estado compreensível.                  |
| silenciar      | Desligar som          | Secundário.               | Mínimo 44 px.                                       | Mesmo lugar do ícone de som.                   |
| dica           | Mostrar dica          | Secundário.               | Mínimo 44 px.                                       | Ociosa automática continua existindo.          |
| cristal-dica   | —                     | Indicador, não controle.  | Sem hit area.                                       | Nunca imita botão.                             |
| coleção        | Fotos reunidas 3 de 6 | Informação, não controle. | Fora da foto.                                       | Única origem de progresso visível.             |

Todas as versões precisam mostrar normal, pressionado, foco e indisponível. Os
ícones não são decoração reutilizada de Puzzle: cada arquivo entra no manifesto
do Expresso com própria chave e proveniência ou com reuso explicitamente
aprovado.

## Blueprint visual, temática e motion score

### Cena de Natal: mundo físico, não cenário genérico

O Expresso deve parecer uma maquete natalina filmada de perto. A fantasia vem
do trem levando memórias até a árvore, não de colocar um personagem falando ou
um excesso de símbolos de Natal. Uma criança reconhece imediatamente a noite
de inverno, a estação acolhedora, o trem e o destino-foto; um adulto percebe
acabamento de material, luz e profundidade sem que isso diminua a clareza.

| Plano               | Conteúdo e material                                                                                       | Luz e profundidade                                                  | Movimento permitido                                                        | Regra de foto/interação                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| L0 — horizonte      | Céu azul profundo, lua velada, pinheiros e vila distante pintados como cenário de diorama.                | Frio, baixo contraste e sem fonte brilhante atrás da foto.          | Estrelas quase estáticas; sem parallax enquanto a criança lê.              | Nunca é interativo nem recebe foto.                      |
| L1 — estação        | Fachadas de madeira, janelas âmbar, lanterna, banco de neve e árvore distante.                            | Sombras preparadas na mesma direção de uma janela/lanterna visível. | Pequeno deslocamento somente na viagem; pisca em grupos lentos no NORMAL.  | Deve enquadrar, jamais tocar portal/foto/HUD.            |
| L2 — brincadeira    | Trilhos, portal-retrato, trem, janela-foto, coleção e HUD. Madeira laqueada, latão fosco e papel espesso. | Maior contraste, sombra de contato e highlight pré-renderizado.     | Trem, abertura do portal e coleção são os únicos movimentos protagonistas. | Foto e as três Zones ficam limpas e previsíveis.         |
| L3 — primeiro plano | Um ramo de pinho, uma lanterna ou presente em no máximo dois cantos.                                      | Silhueta escura com borda quente discreta.                          | Nenhum no reduzido; não acompanha a câmera.                                | Nunca reduz hit area, encobre rosto ou cria botão falso. |

### Bíblia de materiais e iluminação

| Objeto              | Material que a criança percebe                                                            | Luz fisicamente coerente                                                    | Acabamento runtime                                                                     | Nunca fazer                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Carcaça do expresso | Madeira pintada de vermelho-framboesa, junções arredondadas e pequenos detalhes de latão. | Chave azul suave de cima, reflexo âmbar da cabine e sombra curta no trilho. | Base WebP em camadas + sombra preparada; HIGH pode testar luz de imagem só na carcaça. | Aplicar filtro/física à foto da janela ou brilho neon em toda a peça.                |
| Rodas e suspensão   | Metal escuro, aro de latão gasto e borracha limpa.                                        | Pequeno highlight lateral, sempre no mesmo lado da fonte de luz.            | Rodas separadas e rotacionadas pelo progresso; balanço de cabine muito pequeno.        | Rodas girando sem deslocamento ou bounce elástico.                                   |
| Portal-retrato      | Moldura de papel prensado, latão fosco e vidro claro; interior neutro.                    | Halo dourado nasce atrás da moldura e termina antes da foto.                | Três camadas com foto `contain` no centro.                                             | Crop de pessoa, máscara animada, flare sobre rosto ou porta que pareça quarto botão. |
| Trilhos e faixa     | Madeira escura, metal frio e marcador dourado discreto.                                   | Sombra de contato abaixo do trem; realce só na faixa ativa.                 | Base estática + overlay de seleção por alpha/tint.                                     | Trocar só a cor para indicar toque ou criar brilho contínuo.                         |
| Árvore das Memórias | Pinho macio, enfeites de papel/latão e neve acumulada.                                    | Luzes quentes em pequenos grupos, sem sincronia total.                      | Estado final pré-composto + entrada finita das fotos.                                  | Confete/luzes sobre cada foto ou estroboscópio.                                      |

O mapa de luz é produzido no asset master e conferido em toda pose: céu e neve
recebem luz fria; janela, lanterna e árvore recebem luz quente; o dourado só
reforça conquistas. Se não houver fonte visível para um reflexo, ele não entra.
Não há filtro sobre a PhotoSurface: a moldura protege a foto com passe-partout
neutro, e as sombras pertencem à moldura, não à fotografia.

### Motion score: sensação de trilho, peso e resposta imediata

`MOTION_SCORE.md` deve registrar estas sequências em uma linha do tempo e
transformá-las em tuning. O domínio continua só conhecendo comandos e estados;
o score é apresentação determinística, cancelável e observável.

| Beat               | Tempo inicial           | Ação visual e sonora                                                                                       | Dono e curva                                                      | Critério de realismo                                                       |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Entrada da estação | até 260 ms              | Fundo já legível; trem e portal acomodam sem invadir a foto.                                               | Scheduler; `Sine.easeOut` curto.                                  | Sem zoom de câmera, sem salto de layout.                                   |
| `pointerdown`      | mesmo/próximo frame     | Faixa comprime, borda ganha profundidade e `ui.tap` é elegível.                                            | Feedback da Zone; 80–120 ms.                                      | A criança vê que o jogo ouviu antes do som/rede.                           |
| Escolha correta    | 0–60 ms após press      | Marcador de trilho acende, farol da cabine cresce sutilmente e rodas começam.                              | MotionRig inicia uma vez.                                         | Não existe espera teatral entre gesto e deslocamento.                      |
| Mudança de faixa   | 160–220 ms              | Raiz do trem acelera, cruza o trilho e freia no centro lógico; fundo move poucos pixels em sentido oposto. | Raiz: `Cubic.easeInOut`; L1: parallax proporcional, sem tocar L2. | Posição final exata, sem overshoot; peso vem de aceleração, não de bounce. |
| Durante a viagem   | somente dentro do tween | Rodas giram conforme progresso, cabine inclina um grau sutil na saída/freio, sombra acompanha.             | Subcamadas derivadas do progresso do mesmo token.                 | Nenhuma rotação/posição é escrita por outro update ou tween.               |
| Faixa errada       | até 140 ms              | Trem confirma a faixa escolhida e retorna ao repouso; cristal aponta a correta.                            | Feedback isolado; `Sine.easeOut`.                                 | É uma tentativa acolhida, não uma colisão/punição.                         |
| Chegada/portal     | 160–220 ms              | Freio macio, halo atrás da moldura, portal abre e só então o sino de coleta.                               | Scheduler com token de chegada.                                   | O olhar lê foto antes de faísca.                                           |
| Coleção            | 220–320 ms              | Bilhete/foto percorre trajetória curta para coleção; o portal já ficou estável.                            | Uma trajetória, `Cubic.easeOut`.                                  | Não cruza rosto, HUD ou controles.                                         |
| Vitória            | até 1.500 ms            | Fotos ocupam a árvore em sequência, luzes respondem e estrelas terminam.                                   | Stagger finito; foto âncora primeiro.                             | Celebração vem depois da lembrança e não a encobre.                        |

Para evitar animação “bonita mas instável”, cada canal tem um dono: a raiz do
trem possui posição; as rodas possuem rotação; a cabine possui inclinação e
pequena escala; a sombra possui alpha/escala; o portal possui alpha/escala; a
foto nunca é alvo de transform/efeito de cena. Ao receber pause, resize, nova
estação ou exit, `ExpressMotionRig` invalida o token, normaliza subcamadas para
um pose estável e só então cede o controle ao próximo estado. Não usar
`update()` para disputar `x`, `y` ou `angle` com o tween da mesma peça.

### Pacote de assets: produção preparada para acabamento premium

Os nomes abaixo são grupos de produção, não arquivos autorizados. Cada grupo
nasce de um master privado e coerente com a prancha A1; somente sua derivada
aprovada chega ao webroot como WebP ou SVG. A dimensão runtime é decidida pela
maior caixa de exibição no Track Lab, multiplicada pela densidade visual que a
comparação de Android justifique — não pela dimensão do master nem por “4K”.

| Grupo e IDs propostos                                                                                | Camadas/variações obrigatórias                                                            | Uso em cena                  | Fallback e validação                                                      |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| Ambiente `ceu-l0`, `vila-l0`, `estacao-l1`, `janelas-l1`, `neve-canto-l3`                            | Luz fria/quente já composta; canto esquerdo/direito isolado; sem texto.                   | Capa, estação e vitória.     | LOW funde L0/L1 e remove L3; validar foto clara/escura.                   |
| Trem `trem-carroceria`, `trem-janela`, `trem-roda`, `trem-sombra`, `trem-farol`                      | Carroceria, roda e sombra em layers separados; estado repouso/viagem; pivôs documentados. | Âncora, deslocamento e capa. | Highlight pré-renderizado no NORMAL; experimento HIGH só na carroceria.   |
| Trilho `trilho-base`, `trilho-ativo`, `marcador-faixa`                                               | Três faixas, overlay de seleção e marca não cromática.                                    | Ação primária.               | Alto contraste estático em LOW/reduzido; medir as Zones por cima da arte. |
| Portal `portal-costas`, `portal-moldura`, `portal-halo`, `portal-frente`                             | Moldura física em camadas; interior neutro que recebe PhotoSurface; halo separado.        | Próximo destino e coleta.    | Sem halo no reduzido; foto sempre intacta e `contain`.                    |
| Coleção/árvore `slot-colecao`, `arvore-base`, `arvore-luzes`, `enfeite-foto`                         | Slots, árvore sem luz, luzes e enfeites-foto separados.                                   | Progresso e vitória.         | Luzes ficam estáticas/omissas por perfil; fotos entram antes.             |
| UI `hud-placa`, `botao-pausa`, `botao-som`, `botao-dica`, `icone-*`                                  | SVG ou raster com normal, press, foco e indisponível; rótulos em português.               | HUD/overlay.                 | Nunca usa WebGL/filtro; hit area independente da arte.                    |
| FX `poeira-trilho`, `faísca-portal`, `estrela-vitoria`, `floco-distante`                             | Atlas pequeno, bordas suaves, cor de luz correta e emissão finita.                        | Só confirmação/celebração.   | Omitido em LOW/reduzido; sem emitter novo por gesto.                      |
| Áudio `ui-tap`, `trem-partida`, `trem-freio`, `portal-abre`, `coleta`, `dica`, `vitoria`, `ambiente` | M4A/MP3 pareados, início limpo, variações curtas quando necessário.                       | Sincroniza com beats acima.  | Mudo não remove leitura; sem loop de trem durante interação curta.        |

### Pipeline de arte antes de runtime

1. Criar uma prancha de direção em retrato com oito poses-chave e uma tabela de
   fonte de luz/material por objeto. Referência gerada ou externa fica fora de
   `public/` e não é recortada para produção.
2. Construir **um** master consistente de trem, portal, árvore e estação; extrair
   layers, pivôs e estados dele. Não gerar frames de IA independentes para uma
   mesma animação.
3. Preparar cada layer com transparência limpa, bordas testadas em fundo claro e
   escuro, área de sombra fora da foto e nomenclatura de papel. Fotos de sessão
   não fazem parte desse kit.
4. Exportar derivados de runtime, registrar processamento, origem, licença,
   dimensões, SHA, `textureKey`, `deliveryGroup` e perfil de qualidade no
   manifesto v2. Confirmar que só formatos aceitos pela fábrica entram no
   diretório público.
5. Montar o Asset/Track Lab com fixtures vertical, horizontal e quadrada;
   comparar legibilidade, material, aliasing, cor, carregamento e memória em
   390/412/430/768. Só então integrar a cena e uma sessão privada autorizada.

## Plano de assets, efeitos e áudio

### Inventário visual a aprovar antes do runtime

Os nomes são propostos para o manifesto e a estrutura de diretórios. Não são
arquivo aprovado, licença ou promessa de que será gerado por IA.

| Papel/ID proposto       | Tipo          | Uso                                                    | Perfil LOW e reduzido                        |
| ----------------------- | ------------- | ------------------------------------------------------ | -------------------------------------------- |
| fundo-vila-noturna      | background    | L0: céu, vila e pinheiros baixos.                      | Versão simples e estática, sempre presente.  |
| estacao-janela-quente   | background    | L1: profundidade e direção da viagem.                  | Pode ser incorporada ao fundo simplificado.  |
| trilhos-tres-faixas     | ui/background | L2: explica três escolhas e área tocável.              | Sempre presente, alto contraste.             |
| expresso-vagao          | ui            | Corpo do trem; a foto âncora entra em janela separada. | Sempre presente; transformações simples.     |
| janela-foto-ancora      | ui            | Moldura física da foto do vagão.                       | Sempre presente.                             |
| portal-retrato          | ui            | Moldura do destino com passe-partout.                  | Sempre presente; brilho vira borda estática. |
| cristal-dica            | ui/vfx        | Indica faixa correta, não é botão.                     | Estático.                                    |
| slot-colecao            | ui            | Espaço dos enfeites já reunidos.                       | Sempre presente.                             |
| arvore-memorias         | background/ui | Cena de vitória e receptáculo de fotos.                | Sempre presente, sem pisca em loop.          |
| placa-progresso         | ui            | Barra de Fotos reunidas.                               | Sempre presente.                             |
| pausar, continuar, sair | ui            | Controles de overlay.                                  | Sempre presentes.                            |
| som, silenciar, dica    | ui            | Controles secundários.                                 | Sempre presentes.                            |
| brilho-porta            | vfx           | Explosão curta atrás da moldura ao coletar.            | Omitido, mantido contorno.                   |
| poeira-trilho           | vfx           | Pequena confirmação da chegada.                        | Omitido.                                     |
| floco-ambiente          | vfx           | Profundidade atrás de L2.                              | Omitido.                                     |
| estrela-vitoria         | vfx           | Celebração finita ao redor da árvore.                  | Omitido, mantendo árvore pronta.             |

Os assets públicos ficam somente sob
apps/play/public/assets/expresso-das-fotos. O manifesto v2 fica em
packages/games/expresso-das-fotos/assets/manifest.json, e a explicação de
origem em ASSET_PROVENANCE.md. Nenhuma foto da sessão entra nesses três locais.

A arte de fundo não pode usar a imagem da criança como textura decorativa.
Papai Noel, rena ou elfo não são necessários para V1. Se um personagem for
proposto, abrir decisão de papel narrativo, fonte, poses, segurança e versões
LOW/reduzido antes de adicioná-lo.

### Efeitos visuais e pools

| Efeito       | Gatilho                    | Função                       | Limite inicial                | Encerramento                      | Fallback                      |
| ------------ | -------------------------- | ---------------------------- | ----------------------------- | --------------------------------- | ----------------------------- |
| PressGlow    | pointer aceito             | Confirma que a faixa ouviu.  | Um tween do controle.         | 80–120 ms; cancelamento.          | Borda + ícone estáticos.      |
| RailMoveDust | chegada correta            | Conecta trem ao trilho.      | Até 4 partículas por chegada. | Burst `explode`; 300 ms.          | Nenhum, movimento já explica. |
| PortalSpark  | foto coletada              | Confirma que o portal abriu. | Até 6 partículas.             | Burst `explode`; 420 ms.          | Moldura dourada.              |
| HintCrystal  | 7 s ocioso ou dica         | Mostra próximo gesto.        | Uma sequência.                | 900 ms ou novo toque.             | Dois contornos estáticos.     |
| AmbientSnow  | NORMAL/HIGH durante viagem | Profundidade, atrás de L2.   | Até 10 flocos em pool.        | Pausa, reduzido, LOW ou shutdown. | Omitido.                      |
| VictoryStars | última coleta              | Celebra sem cobrir fotos.    | Até 18 partículas.            | Burst `explode`; 1.500 ms.        | Árvore concluída + texto.     |

Os emitters são criados uma vez em `create`, ficam ocultos/inativos entre
gatilhos e pertencem ao `SceneScope`; cada confirmação usa um burst finito
`explode`, nunca `frequency: 0` (que significa fluxo máximo no Phaser). Os
efeitos usam profundidade atrás de portal/foto/legenda e regiões de exclusão
sobre molduras, árvore e controles. Não criar emitter novo por toque, usar blur
por frame, Phaser Lighting ou filter para imitar ouro/neve. Todo emitter,
timer, tween e textura gerada entra em SceneScope. HIGH só ganha efeito
adicional após medição; não se presume post-FX disponível ou correto.

### Política de áudio, música e haptic

Definir SoundCuePolicy antes de preparar qualquer arquivo. Cada efeito recebe
origem/licença, duração, bytes, formato de entrega M4A/MP3, cue, grupo de
entrega, qualidade, polyphony, cooldown e cleanup no manifesto.

| Cue proposto    | Gatilho                       | Direção sonora                               | Regra inicial                                              |
| --------------- | ----------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| ui.tap          | Botões e faixa aceita.        | Clique macio de madeira/papel.               | Uma instância; cooldown 60 ms.                             |
| express.move    | Trem muda para a faixa.       | Deslize leve e curto.                        | Uma instância; não toca em toque rejeitado.                |
| express.wait    | Faixa diferente do portal.    | Retorno baixo e gentil.                      | Uma instância; nunca buzzer/alarme.                        |
| express.collect | Portal abre e foto é reunida. | Sino quente com final claro.                 | Uma instância; 2–3 variações determinísticas se aprovadas. |
| express.hint    | Cristal indica a faixa.       | Brilho de celesta curto.                     | Uma instância; não resolve ação.                           |
| express.win     | Árvore fica pronta.           | Assinatura festiva de 1–1,5 s.               | Uma instância; começa depois das fotos.                    |
| music.express   | Viagem após primeiro gesto.   | Celesta/piano/cordas leves, baixa densidade. | Opcional; inicia em volume baixo, duck/pausa/teardown.     |

O primeiro toque aceito pede desbloqueio de áudio, mas jamais bloqueia PressGlow
ou a animação. Enquanto `sound.locked` existir, o jogo continua integralmente
visual; o próximo cue elegível toca somente depois de liberado. O diretor cria e
guarda referências de fontes próprias com chaves `expresso:*`, aplica polyphony
e cooldown por cue, e em pausa/saída só pausa, para e destrói essas referências.
Ele não chama `sound.pauseAll()` ou `sound.stopAll()`, pois são operações do
gerenciador inteiro. Música, se aprovada, é uma única fonte separada: ela sofre
duck curto durante coleta/vitória e não concorre com UI. Mudo mantém feedback
visual/haptic equivalente. Faixa errada não usa haptic. Coleta pode usar impacto
leve; vitória usa um impacto curto de celebração. Todo volume, duck, variação e
cooldown começa em tuning e só é fechado após teste no Android.

## Política de fotos, variantes e carregamento

### Seleção pura

ExpressPhotoSelection recebe candidatos seguros: identificador, orientação e
posição estável de catálogo. Ela:

1. exige a âncora;
2. remove IDs repetidos;
3. escolhe até o limite de destinos, favorecendo a orientação menos presente;
4. usa posição de catálogo e seed somente como desempate determinístico;
5. se faltarem fotos, repete IDs já escolhidos apenas no plano da rota, nunca
   na lista de texturas ativas.

Não adicionar análise de pixels, perceptual hash ou reconhecimento de pessoas.
Se o pipeline futuramente oferecer signal seguro de fotos semelhantes, abrir
decisão de mídia/privacidade antes de ampliar o contrato.

### Variante e carregamento

| Elemento                          | Variante alvo                         | Contagem V1 | Regra                                                      |
| --------------------------------- | ------------------------------------- | ----------- | ---------------------------------------------------------- |
| Capa                              | card, se a comparação visual aprovar. | 1.          | Responsabilidade React antes do canvas.                    |
| Vagão e foto principal de vitória | game.                                 | 1.          | Não usar original; fallback autorizado deve ser explícito. |
| Portal de outra foto              | card.                                 | Até 5.      | Uma URL/texture key por foto distinta.                     |
| Repetição de rota                 | Textura pré-carregada.                | 0 extras.   | Não requisitar nova URL.                                   |

Antes do preload, o adapter decide o plano total e cria uma chave semântica por
foto/variante/run — por exemplo `expresso:{runId}:photo:{id}:game`. A URL
autorizada fica apenas no adaptador de runtime; nome de arquivo, token e URL não
entram em domínio, logs de teste ou bridge. O `RequiredAssetLedger` recebe as
chaves obrigatórias antes de enfileirar, acompanha sucesso individual e só então
emite `ready`. O evento `complete` do Loader é observado, mas não é aceito como
prova sozinho porque ele também pode concluir uma fila com erro.

Cada derivada essencial recebe timeout limitado, uma repetição automática e
fallback previamente aprovado da **mesma** foto/variante. Entre tentativa e
tentativa, a Scene mostra tela de carregamento neutra, sem slot de portal ou
foto parcialmente desenhada. Se a foto não puder ser obtida, o ledger remove as
texturas já criadas daquele GameRun, emite `GAME_ASSET_FAILED` com razão segura
e deixa o shell oferecer retry ou retorno. Não existe rota parcial, substituto
genérico, placeholder de criança ou request de catálogo inteiro.

Durante `shutdown`/destroy, `SceneScope` remove somente as texture keys do
prefixo do run depois de assegurar que nenhum objeto as referencia. Nunca usa
uma key global como `photo-1`: replay, retry e entrada dupla não podem colidir
com uma textura anterior.

M4 mede em fixture e observação privada: requests, bytes públicos/runtime,
estimativa RGBA de texturas, número de texturas, objetos, tweens, timers,
partículas e fontes. Não transformar qualquer número deste plano em orçamento
bloqueante antes de Android de referência.

## Pacotes de trabalho passo a passo

### M0 — gate de entrada, produto e baseline

1. Confirmar a seleção explícita do Game 03 e registrar owner/data da decisão.
2. Ler produto, arquitetura, mídia, art bible, contratos de assets/qualidade e
   skills Phaser necessárias; auditar scaffold/registry existentes.
3. Verificar o gate de lifecycle de replay e a lacuna atual: desafio só é
   oferecido pelo shell para Puzzle. Escolher manter V1 sem desafio ou
   generalizar essa ação antes de mostrá-la.
4. Definir o protocolo privado para observação com criança/responsável e
   Android, sem salvar fotos, tokens ou nomes no repositório.
5. Rodar baseline com pnpm check:fast e, no Node 24, pnpm validate.

**Aceite:** propósito, seis destinos, mínimo uma foto, fallback de sessão
pequena, destino de vitória e política de desafio estão explícitos; a baseline
não abre regressão de outros jogos.

### M1 — contratos, pacote isolado e composição lazy

1. Rodar o gerador para criar o pacote sem registro e preservar os arquivos
   gerados como ponto de partida.
2. Escrever SPEC com EDF-001 a EDF-041; escrever EXPERIENCE com respostas por
   gesto e EXPERIENCE_REQUIREMENTS com todos os papéis de asset/qualidade.
3. Criar definition, tuning, exports, `assets/README.md` e ASSET_PROVENANCE com
   estado de aprovação correto. O manifesto v2 exige ao menos um asset, logo
   `assets/manifest.json` só nasce em M4 com o primeiro arquivo aprovado; não
   versionar um manifesto vazio inválido.
4. Atualizar package dependency, alias Vite e registry lazy somente após
   validar os três alvos. O GameDefinition declara subset, minPhotos 1,
   recommendedPhotos 6 e mixed orientation.
5. Cobrir Hub e rota direta: uma foto torna o jogo disponível; capa não mostra
   contagem técnica de fotos, orientação ou detalhes de sessão.
6. Definir interface local de política de som, fotos e game feel antes de
   carregar asset ou importar Phaser.
7. Definir explicitamente as fronteiras de posse de `SceneScope`,
   `RequiredAssetLedger`, scheduler e bridge: qual recurso cria, quem o pausa,
   quem o invalida e qual evento confirma que já foi liberado.
8. Registrar `ART_DIRECTION.md` e `MOTION_SCORE.md` antes de criar arte ou
   Scene. Eles congelam material, fonte de luz, planos, poses-chave, canal de
   movimento, fallback e restrições da foto; não são um moodboard solto.

**Aceite:** Hub/capa importam apenas definition; abrir a capa não cria canvas;
entrada/saída preservam lifecycle; game só chega a build como chunk lazy.

### M2 — Track Lab, telas, ícones e coreografia

1. Criar mockups seguros de capa, primeira estação, faixa pressionada, faixa
   errada, chegada, dica, pausa e vitória em 390 × 844, 412 × 915, 430 × 932,
   768 × 1024 e paisagem inicial.
2. Criar a prancha A1 antes do Lab: as oito poses usam o mesmo trem, portal,
   árvore, madeira, latão, papel, neve e mapa de luz. Anotar pivôs, planos,
   direção de sombra, estados de material e o espaço protegido da foto.
3. Criar Track Lab isolado com fixtures de foto vertical, horizontal e quadrada
   usando contain. Mostrar as três faixas como áreas tocáveis reais.
4. Implementar no lab apenas press, troca de faixa, portal, coleção, dica,
   pausa e vitória com dados determinísticos; não ligar sessão privada ou
   carregar foto real.
5. Montar `MOTION_SCORE.md` no Lab: root do trem, rodas, cabine, sombra, farol,
   portal e coleção recebem token de apresentação, dono de propriedade, curva,
   duração, cue e fallback. Gravar os oito beats em vídeo de referência 60/120
   Hz, sem chamar isso de evidência final de dispositivo.
6. Ajustar tuning de alvos, zonas protegidas, legenda única, hierarquia de HUD,
   moldura e coreografia. Revisar contraste sobre cenário claro/escuro.
7. Revisar ícones em normal, pressionado, foco e indisponível; garantir que
   cristal de dica não se parece com botão.
8. Registrar revisão pela rubrica: benefício, viewport, perfil, custo,
   alternativa e severidade. Corrigir P1/P2 antes de aprovar arte final.
9. No Lab, ligar `input.enableDebug` somente em desenvolvimento para capturar as
   três zonas, HUD e safe areas. Fotografar as zonas com portal/foto sobrepostos
   e depois desligar o debug no runtime público.
10. Ensaiar três velocidades de interação realistas: toque único deliberado,
    sequência rápida de toques e criança que começa swipe e desiste. A coreografia
    deve sempre terminar em estado legível, sem trem entre faixas.

**Aceite:** é possível entender e sentir o toque sem runtime completo, sem
efeito escondendo foto e sem uso de arte de cliente; as oito poses parecem do
mesmo mundo material e o Motion Score não tem propriedade disputada ou efeito
sem fallback.

### M3 — domínio puro, seleção e arbiter de toque

1. Implementar ExpressTypes, ExpressPhotoSelection, ExpressRoute,
   ExpressJourney, ExpressProgress e ExpressHint primeiro com testes.
2. Construir rotas com seis destinos, três faixas e seed injetada; evitar três
   destinos seguidos na mesma faixa quando houver alternativas, mantendo
   reprodutibilidade.
3. Testar sessões de 1, 2, 5, 6, 7, 8 e 92 fotos; âncora obrigatória,
   unicidade quando possível, repetição planejada e diversidade de orientação.
4. Testar transições ready, awaiting-lane, travelling, collecting, paused e
   completed; cobrir chegada duplicada, coleta duplicada, faixa errada e replay
   pedido após completo.
5. Implementar `ExpressGestureNormalizer` e `ExpressInputArbiter` sem depender
   de drag do Phaser. Cobrir down, tap, swipe, press, segundo ponteiro,
   cancelamento, saída, travelling, collecting, paused, leaving e toque rápido
   em sequência.
6. Implementar ExpressLayout puro para faixas, portal, HUD, vagão, coleção e
   árvore em retrato/paisagem; receber dimensão do host/safe area, calcular
   Zones reais e testar reflow sem recriar IDs.
7. Definir `presentationEpoch` e `arrivalToken` sem alterar o domínio: apenas o
   scheduler que ainda possui ambos pode emitir `arrivalFinished` ou
   `collectionPresented`. Pausa, resize e saída invalidam token antes de
   cancelar seu handle.

**Aceite:** regras, seleção e aceitação de input passam sem Phaser, DOM,
aleatoriedade global ou relógio real.

### M4 — mídia autorizada, assets, áudio e orçamento

1. Aprovar os papéis visuais do inventário, não um arquivo improvisado.
   Selecionar fonte/licença, preparar arquivos fora do browser e preencher
   proveniência antes de mover para diretório público.
2. Produzir primeiro o master A1 coerente e extrair dele os layers do trem,
   portal, árvore, cenário e luzes. Cada export registra pivot, profundidade,
   margem de sombra, material, fonte de luz e se é raster/ícone; não aceitar
   frames independentes que alterem volume, perspectiva ou iluminação.
3. Criar cada asset visual e ícone com estados compatíveis com o Track Lab.
   Verificar contraste, hit area e segurança da foto em 390/412/430/768. Fazer
   inspeção de halo alfa em fundo claro/escuro e de aliasing em escala mínima.
4. Preparar cues de áudio somente após aprovação de fonte; entregar M4A/MP3
   alternativos e registrar cue, duração, bytes, volume de revisão e grupo.
5. Criar/atualizar manifest v2 com hash, bytes, dimensões/duração, qualidade,
   papel, deliveryGroup, textureKey/cue e estado PRONTO_PARA_RUNTIME.
6. Executar auditoria, orçamento e Asset Lab; não deixar arquivo público sem
   manifesto nem estado de revisão incompleto.
7. Comparar card e game da âncora em matriz mobile/Android; validar que card
   serve ao portal e que o plano de uma game + cinco card não cria request
   duplicado.
8. Construir o spike visual HIGH isolado, somente após NORMAL aprovado: uma
   carcaça de trem não fotográfica com normal/environment map e fallback de
   highlight preparado. Medir primeiro frame, memória, draw calls e clareza;
   rejeitar se a diferença não compensar custo ou se reduzir fluidez.
9. Testar falha de uma foto exigida com fixture HTTP: retry limitado, fallback
   da mesma foto quando decidido e erro seguro ao esgotar.

**Aceite:** todos os arquivos entregáveis têm proveniência e manifesto; a
menor variante visualmente adequada é justificada; os materiais permanecem
coerentes entre poses; nenhuma foto de sessão ou asset não catalogado entra no
bundle; o HIGH é aceito apenas se houver prova de ganho visual sem perda móvel.

### M5 — cena Phaser, carregamento e lifecycle

1. Criar createExpressoDasFotosGame seguindo Phaser 4.2.1 e ligar lifecycle
   GameRun open → ready → start → complete → exit. Usar `Phaser.AUTO` com
   anti-aliasing normal para arte premium, sem `pixelArt`, sem forçar WebGL e
   sem elevar resolução por suposição.
2. Configurar um único canvas com pai de tamanho definido e `Scale.RESIZE`; não
   estilizar o canvas diretamente. No evento de resize, primeiro invalidar o
   scheduler ativo, depois recalcular câmera, safe area, Zone e coordenadas via
   ExpressLayout e, por último, reposicionar objetos existentes. Medir em Android
   de referência o custo de fill-rate de tela alta antes de aumentar resolução.
3. Implementar ExpressPhotoLoader + RequiredAssetLedger para pré-carregar
   exatamente as fotos/variantes do plano antes de declarar ready. Registrar
   sucesso individual, `FILE_LOAD_ERROR`, timeout e retry/falha pelo bridge;
   limpar textures com prefixo do run em toda saída incompleta.
4. Criar ExpressScene e presenters de fundo, trilhos, portal, trem, HUD,
   coleção, pausa e vitória. Criar objetos uma vez e usar reflow em resize;
   L0–L3 possuem profundidade declarada e nenhuma camada pode entrar na área
   protegida de PhotoSurface/HUD sem revisão visual.
5. Implementar ExpressMotionRig: raiz do trem é o único alvo de `x`/`y`,
   sublayers recebem progresso da mesma sequência e `MotionScore` não pode
   escrever uma propriedade já possuída. Interromper/normalizar rig em pause,
   resize e exit antes de destruir alvo ou iniciar outro tween.
6. Traduzir `pointerdown`/`pointerup` pelo normalizador e arbiter para comandos
   do domínio; implementar hit areas explícitas para três faixas e controles
   secundários. Manter `topOnly` ligado, `stopPropagation` nos controles e
   objetos decorativos não interativos.
7. Conectar efeitos e áudio por cue nomeado, sem bloquear o input. Cada tween,
   timer, som, Zone, emitter, listener e textura é registrado em SceneScope;
   o callback de um tween só avança domínio após validar run/destino/epoch.
8. Implementar `ExpressRendererQuality`: NORMAL já usa material pré-renderizado;
   LOW/reduzido removem decoração/loop e HIGH só habilita um spike previamente
   aprovado. Filtros de câmera, foto e HUD são bloqueados por API local, não
   apenas por convenção de design.
9. Implementar pause, Page Visibility, mute/unmute, saída e destroy durante
   travelling/collecting. Pausa comita/cancela visual de jogo, invalida o epoch,
   congela apenas handles possuídos e mantém overlay interativo. Ao shutdown,
   desregistrar todos os listeners; ao destruir Game, aguardar seu evento
   terminal antes de declarar teardown concluído.
10. Validar Back, saída e double-play: um canvas somente durante jogo, nenhum
    after destroy.

**Aceite:** não existe portal vazio, passagem dupla, callback órfão, áudio
residual ou canvas duplicado em sequências rápidas.

### M6 — polimento de jogabilidade, efeitos, som e acessibilidade

1. **M6a — touch feel:** aplicar timings aprovados, feedback imediato,
   orientação gentil e dica sem solução. Observar criança primeiro toque e
   corrigir P1/P2 de compreensão. Confirmar que a faixa pressiona antes do
   cue, que viagem não cria fila e que a chegada termina no estado lógico.
2. **M6b — foto e cena:** aplicar moldura, passe-partout, coleção e árvore;
   confirmar que foto, portal e faixa vencem decoração em retrato/paisagem.
   Revisar material, luz, recorte, halo alfa, sombra de contato e coerência de
   A1 em todas as oito poses; o acabamento não pode depender de uma captura
   estática bonita isolada.
3. **M6c — VFX:** introduzir PressGlow, RailMoveDust, PortalSpark, HintCrystal,
   AmbientSnow e VictoryStars somente com limites do plano e fallback explícito.
   Criar todos os emitters uma vez, disparar bursts finitos e revisar máscara de
   exclusão das fotos antes de habilitar HIGH.
4. **M6d — áudio:** integrar fontes aprovadas, unlock de primeiro gesto,
   volumes, cooldown, polyphony, variações, duck de música, mute, pausa e
   teardown. Testar o gesto com áudio bloqueado e liberar fontes somente pelas
   referências `expresso:*`.
5. **M6e — LOW/reduzido:** exercitar cada estado em ambos. LOW remove ambiente
   caro; reduzido troca transições contínuas por confirmação estática, sem
   impedir jogo.
6. **M6f — controles:** revisar rótulo, foco, target, posição e estado de cada
   ícone; nenhum texto técnico chega à família.
7. **M6g — qualidade percebida:** registrar para cada estado a primeira leitura
   (foto/portal/faixa), a confirmação de toque, a duração de animação, o cue
   correspondente e o fallback sem som/sem movimento. Se uma cena exigir
   explicação adulta, reduzir decoração ou encurtar coreografia antes de criar
   novo efeito.
8. **M6h — prova de realismo:** fazer comparação às cegas entre NORMAL e HIGH
   no mesmo aparelho: o revisor precisa identificar ganho de volume/material
   sem perda de foto, toque ou estabilidade. Rejeitar HIGH se o efeito só for
   percebido como brilho extra, aumentar carga ou variar a direção de luz.

**Aceite:** cada efeito tem função, duração, limite, dono e fallback; a foto
continua mais legível que luz, neve, som ou texto.

### M7 — vitória, replay e desafio

1. Fechar a apresentação de árvore: fotos entram primeiro, texto curto depois,
   e só então ações do shell.
2. Implementar Brincar de novo pelo mecanismo que encerra a instância atual e
   cria novo GameRun, nova seed e nova rota. Nunca resetar domínio dentro de
   Scene complete.
3. Manter Ver outros jogos e Compartilhar nos contratos atuais do shell.
4. Só se o responsável aprovar e o shell for generalizado: expor Mais aventura
   com oito fotos distintas e nova identidade de rodada. Cobrir indisponibilidade
   em sessão menor que oito, retorno, Back e replay.
5. Testar cancelamento de compartilhamento como não erro e garantir que não há
   foto em prévia social padrão.

**Aceite:** vitória é foto-prioritária; repetir e desafio não reutilizam run
terminal nem quebram navegação/lifecycle.

### M8 — evidência mobile, Android e fechamento

1. Criar Playwright para capa, primeira estação, faixa correta/errada, dica,
   coleta, pausa, mudo, vitória, replay, erro de asset, Back e cinco saídas.
   Incluir sobreposição de HUD/portal, dois dedos, cancelamento de pointer,
   primeiro gesto com áudio bloqueado, resize durante tween e callback antigo
   após pause/exit.
2. Executar matriz em 390 × 844, 412 × 915, 430 × 932 e 768 × 1024, retrato e
   paisagem; registrar Canvas/AUTO quando disponível, NORMAL, HIGH aprovado,
   LOW e reduzido. A diferença de perfil deve ser intencional, não uma falha de
   asset, iluminação ou composição.
3. Usar somente fixtures em CI. Fazer passagem privada de mídia autorizada
   localmente, sem capturar foto, token, URL ou caminho no repositório.
4. Medir performance por estado: requests, bytes, textura RGBA estimada,
   objetos, tweens, timers, partículas, áudio, p50/p95/p99 e teardown. Medir
   também down → press, press → movimento e coleta → foto na árvore; esses dados
   orientam fluidez, sem virar SLA sem aparelho de referência.
5. Executar observação Android conforme protocolo, validar som/mudo, toque,
   borda do safe area, contraste, temperatura de sensação e lifecycle. Usar a
   skill `revisao-visual-mobile` em runtime real para inspecionar canvas, HUD,
   movimento, VFX e as oito poses, além das assertions de DOM/bridge.
6. Rodar pnpm check, build, asset validate/audit, test:e2e e pnpm validate em
   Node 24. Registrar lições duráveis sem dado de cliente.
7. Mover este plano para completed somente quando todos EDF, evidências e gates
   do proprietário estiverem fechados.

**Aceite:** nenhum P1/P2 aberto; evidências privadas estão fora do repositório;
o jogo é compreensível, concluível e privado em celular real.

## Matriz obrigatória de browser e stress

| Cenário                            | Prova esperada                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Sessão de uma foto                 | Seis destinos concluíveis com uma textura, âncora e vitória.                                  |
| Sessão de cinco fotos              | Todas as disponíveis entram; repetição é planejada, não request extra.                        |
| Sessão de seis orientações mistas  | Seis fontes distintas, contain e coleção legível.                                             |
| Sessão de 92 fotos                 | Só subconjunto/variantes planejados são requisitados.                                         |
| Primeira ação                      | Capa → primeiro portal; faixa principal responde sem explicação adulta.                       |
| Faixa errada                       | Trem responde, progresso fica igual e portal correto permanece disponível.                    |
| A/B/C/D em 100–150 ms              | Apenas comando válido entra; sem fila, troca/áudio/coleção duplicados.                        |
| Swipe e tap                        | Ambos escolhem faixa; tap sozinho termina a rodada.                                           |
| Dica em espera                     | Destaca gesto, não movimenta nem coleta.                                                      |
| Dica em travelling/collecting      | É ignorada sem efeito tardio.                                                                 |
| Pausa durante movimento            | Estado estabiliza, input congela, retoma no mesmo portal.                                     |
| Continuar em pausa                 | Overlay responde enquanto faixas/timers/trem continuam congelados.                            |
| Aba oculta durante coleta          | Timer/tween não completam por trás; retorno coerente.                                         |
| Resize em movimento                | Mesmo destino, faixa, foto e objetos reflowados.                                              |
| Resize + callback antigo           | Token/epoch antigo não coleta nem troca de estação depois do reflow.                          |
| Portal sobre faixa/HUD             | Só o controle declarado recebe evento; decoração não rouba nem propaga.                       |
| Segundo dedo/cancelamento          | Primeiro gesto preserva posse ou é limpo; nenhum comando fica na fila.                        |
| Mute/unmute rápido                 | Não duplica fonte ou música; leitura visual continua.                                         |
| Primeiro gesto com áudio bloqueado | PressGlow/movimento ocorrem já; cue toca apenas após unlock elegível.                         |
| LOW/reduzido                       | Sem neve/loop/efeito caro; ação e vitória ainda completas.                                    |
| NORMAL vs HIGH                     | Base premium preservada; HIGH só acrescenta carcaça aprovada, sem tocar foto/HUD/câmera.      |
| Canvas/fallback                    | Foto, trilho, material pré-renderizado, toque e vitória continuam completos sem filtro WebGL. |
| Foto clara/escura                  | Moldura, HUD e instrução têm contraste próprio; nenhum filtro altera a foto.                  |
| Trem em 60/120 Hz                  | Mesma rota, aceleração, freio e pose final; rodas/sombra não vibram nem descolam.             |
| Pausa/resize no MotionRig          | Rig normaliza canais, não deixa roda/farol/sombra ou tween obsoleto visíveis.                 |
| Asset master grande                | Só derivada justificada entra no GameRun; VRAM/texturas não crescem pelo master privado.      |
| Foto essencial falha               | Retry limitado, erro seguro, nenhum portal parcial.                                           |
| Loader complete com erro           | Ledger bloqueia `ready` até todas as chaves requeridas terem sucesso.                         |
| Back/exit durante tween            | Canvas zero, áudio/timer/tween encerrados, sem callback posterior.                            |
| Cinco ciclos                       | Um canvas enquanto joga; zero ao sair, sem vazamento de recursos.                             |
| Vitória/replay                     | Novo run/seed/rota; GameRun anterior não é reutilizado.                                       |
| Desafio indisponível               | Não há CTA quando sessão/shell não atendem o gate.                                            |

## Comandos e definição de pronto

Durante cada marco, executar:

```text
pnpm check:fast
```

Ao fechar M4, além do check:

```text
pnpm --filter @christmas-games/asset-factory run validate -- --game expresso-das-fotos
pnpm --filter @christmas-games/asset-factory run audit -- --game expresso-das-fotos
pnpm asset:budget
```

Antes de liberar, em Node 24:

```text
pnpm check
pnpm build
pnpm test:e2e
pnpm validate
```

O Expresso das Fotos V1 estará pronto somente quando:

1. a foto âncora e o próximo portal forem a primeira leitura da criança;
2. uma sessão de uma foto e uma sessão grande terminarem sem carregar mídia
   excessiva;
3. toque em faixa, erro gentil, dica e vitória forem entendíveis sem áudio;
4. fotos permaneçam proporcionais e sem decoração por cima;
5. assets, ícones e sons tiverem fonte, licença, manifesto e orçamento
   auditados;
6. pause, aba oculta, resize, toque rápido, retry, Back, replay e destroy
   preservarem rota/lifecycle;
7. LOW, movimento reduzido, browser mobile e Android tiverem evidência sem
   pendência P1/P2;
8. input, overlay, áudio, carregamento e callbacks seguirem os contratos
   EDF-023 a EDF-041, sem evento roubado, recurso global interrompido,
   callback obsoleto ou perda da direção visual aprovada;
9. NORMAL, HIGH aprovado, LOW e reduzido preservarem a mesma leitura, com
   materiais, foto e fluidez validados visualmente em celular real;
10. o repositório passar os gates em Node 24 e não registrar dado de cliente.

## Autorizações ainda necessárias

| Assunto                 | Decisão necessária                                         | Até quando       |
| ----------------------- | ---------------------------------------------------------- | ---------------- |
| Início da implementação | Selecionar formalmente o Game 03.                          | Antes de M1.     |
| Arte visual             | Aprovar candidato, origem/licença e família visual.        | Antes de M4.     |
| Cues sonoros e música   | Aprovar fontes/licença; música pode permanecer fora da V1. | Antes de M4/M6d. |
| Mais aventura           | Aprovar oito destinos e generalização do shell.            | Antes de M7.     |
| Android                 | Indicar aparelho/revisor e autorizar observação privada.   | Antes de M8.     |
| Publicação              | Aprovar evidências e domínio/VPS de produção.              | Depois de M8.    |

## Referências internas

- [Proposta de produto do Expresso](../product/EXPRESSO_DAS_FOTOS.md)
- [Arquitetura da fábrica](../architecture/GAME_FACTORY.md)
- [Roadmap da fábrica](CG-EXPERIENCE-FACTORY-ROADMAP.md)
- [Plano do Memory como referência de execução](CG-MEMORY-IMPLEMENTATION.md)
- [Arquitetura de mídia local](../media/LOCAL_MEDIA_ARCHITECTURE.md)
- [Bíblia de experiência natalina](../experience/christmas/ART_BIBLE.md)
- [Gramática de cena](../experience/christmas/SCENE_GRAMMAR.md)
- [Bíblia de movimento](../experience/christmas/MOTION_BIBLE.md)
- [Bíblia de áudio](../experience/christmas/AUDIO_BIBLE.md)
- [Contrato de assets](../assets/ASSET_MANIFEST_CONTRACT.md)
- [Rubrica de experiência](../quality/GAME_EXPERIENCE_REVIEW.md)
- [Contrato de desempenho](../quality/PERFORMANCE_MEASUREMENT_CONTRACT.md)

## Referências oficiais consultadas

- [Phaser 4.2.1 — InputPlugin (fonte da tag)](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js)
- [Phaser 4.2.1 — ScaleManager (fonte da tag)](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js)
- [Phaser 4.2.1 — TweenManager (fonte da tag)](https://github.com/phaserjs/phaser/blob/v4.2.1/src/tweens/TweenManager.js)
- [Phaser 4.2.1 — BaseSoundManager (fonte da tag)](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js)
- [Phaser 4.2.1 — ParticleEmitter (fonte da tag)](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js)
- [Phaser API — LoaderPlugin](https://docs.phaser.io/api-documentation/class/loader-loaderplugin)
- [Phaser API — Game.destroy](https://docs.phaser.io/api-documentation/class/game)
- [Phaser Examples — referência oficial de pointer](https://github.com/phaserjs/examples)
- [Phaser API — FilterList e custo de filtros](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist)
- [Phaser API — ImageLight / normal map e environment map](https://docs.phaser.io/api-documentation/class/renderer-webgl-rendernodes-filterimagelight)
- [Phaser 4.2.1 — release notes](https://github.com/phaserjs/phaser/discussions/7333)
- [MDN — práticas de VRAM, batching e GPU para WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [W3C WCAG 2.2 — Dragging Movements (2.5.7)](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [W3C WCAG 2.2 — Target Size (Minimum) (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
