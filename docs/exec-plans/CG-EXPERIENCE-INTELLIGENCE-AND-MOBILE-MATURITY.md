# CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY — plano detalhado de melhoria

**Estado:** em execução. Cada item concluído registra evidência e a pendência
que ainda depende de infraestrutura ou aparelho físico.

**Complementa:** [maturidade natalina native-like](CG-CHRISTMAS-NATIVE-LIKE-MATURITY.md).
Não substitui suas fases 0–10: detalha principalmente a passagem das fases 3–10
para entregas pequenas, observáveis e repetíveis.

**Base observada:** branch codex/puzzle-native-like-v1, após o commit eb86a3d.

## Resultado que este plano busca

O Puzzle Swap deve deixar de ser apenas uma mecânica correta com decoração e se
tornar uma brincadeira natalina mobile com acabamento de aplicativo:

1. a foto escolhida é a protagonista, sem orientação ou dado técnico visível;
2. a criança entende a primeira ação sem ler um manual;
3. cada toque, troca correta, dica, pausa e vitória tem resposta visual e
   sonora proporcional;
4. cenário, luz e neve sustentam o clima de Natal sem tapar a foto nem cansar;
5. qualidade baixa e movimento reduzido preservam a brincadeira;
6. os mesmos contratos permitem criar um segundo jogo sem copiar uma Scene;
7. toda evolução tem evidência no navegador e, antes de fixar números de
   desempenho, em um Android físico de referência.

“Native-like” é usado aqui como resultado observável: superfície de jogo
concentrada, controles claros ao toque, transições com propósito, tela útil
para a foto, resposta imediata e ausência de estados internos de engenharia
na interface do cliente. Não significa imitar uma plataforma nativa nem
introduzir dependências nativas.

## O que a auditoria anexada confirma — e o que ainda é hipótese

O texto anexado é uma análise de apoio, não uma instrução executável. Esta
tabela registra apenas o que foi conferido no checkout atual ou em fonte
oficial.

| Tema                | Fato confirmado                                                                                                                                                               | Consequência deste plano                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fábrica de assets   | tools/asset-factory existe, mas o contrato v1 mede bytes transferidos e não estima textura decodificada; a proveniência aceita somente criado no projeto e legado autorizado. | Evoluir por migração v1→v2 compatível, nunca por substituição silenciosa do manifesto.                                                           |
| Laboratórios        | Há rota de desenvolvimento para tema e para experiência; ainda não há Laboratório de Assets nem de Desempenho.                                                                | Reaproveitar a navegação e os tokens atuais; não criar uma segunda infraestrutura paralela.                                                      |
| Interface atual     | A composição de React já tem shell e capa; a Scene de Phaser contém título, progresso, cronômetro, botões e instrução. Isso cria duas camadas de informação na mesma partida. | Fazer um protótipo de responsabilidade de HUD antes de migrar qualquer texto; a partida terá uma única fonte visível para cada informação.       |
| Phaser vendorizado  | O mapa local possui 16 tópicos. Câmeras e texto ainda não estão no mapa local, embora existam como tópicos na tag oficial 4.2.1.                                              | Acrescentar somente os tópicos que uma tarefa aprovada usar, com origem e revisão registradas. Não importar uma coleção inteira sem necessidade. |
| Game Studio         | O bundle existe no repositório oficial da OpenAI, mas não está instalado nem disponível como ferramenta nesta sessão.                                                         | Tratar como referência opcional de processo; o repositório continua autossuficiente e não depende dele.                                          |
| Evidência visual    | A suíte atual já cobre vários viewports e estados funcionais.                                                                                                                 | Acrescentar uma revisão visual com severidade e screenshots representativos; aprovação de DOM sozinho não basta para canvas.                     |
| Proteção de browser | A regra atual bloqueia apps/play → tools/media-pipeline, mas não bloqueia genericamente apps → tools.                                                                         | Generalizar a regra e incluir a Fábrica de Assets no verificador de workspaces antes de ampliar ferramentas de Node.                             |

## Limites que permanecem inegociáveis

- O domínio de cada jogo continua puro e determinístico: sem Phaser, React,
  DOM, rede, armazenamento do navegador, relógio real ou aleatoriedade global.
- React recebe somente eventos tipados da ponte; não recebe Scene nem jogo
  Phaser.
- A partida cria um Phaser.Game e o destrói de modo completo na saída.
- Foto original, caminho do disco e identidade de cliente não entram no
  browser, em fixture versionada, screenshot público ou laboratório.
- Nenhum provider, busca externa, conversor, Blender, Sharp ou ferramenta de
  asset entra no grafo do browser.
- Arrastar continua tendo alternativa toque–toque.
- Todo efeito possui função de orientar, confirmar, ensinar ou celebrar.
- Um novo jogo não importa outro jogo, e não será criado BaseScene.

## Dependências e ordem segura

    E0 evidência e guardas
            ├── E1 contrato de experiência e conhecimento roteável
            ├── E2 protótipo de interface e hierarquia
            │       └── E3 receitas de arte, VFX e áudio
            └── E4 métricas, Laboratório de Assets e Desempenho
                    └── E5 Fábrica de Assets v2
                            └── E6 integração do Puzzle
                                    └── E7 playtest, Android e liberação
                                            └── E8 prova em segundo jogo

E2 pode começar com arte já aprovada e formas temporárias. E3 e E5 não podem
adicionar arte de runtime sem a aprovação da direção visual da fase 2 do plano
de maturidade. E4 mede antes de escolher orçamento numérico definitivo.

## Marcos, tarefas e subtarefas

### E0 — Evidência inicial e guardas do repositório

**Objetivo:** transformar percepções de “parece simples” em problemas
reproduzíveis e impedir que futuras ferramentas de preparação vazem para o
cliente.

- [x] **E0.1 — Registrar a linha de base visual e funcional.**

  - [ ] Executar a suíte atual e salvar evidência privada dos estados: capa,
        primeira ação, peça escolhida, dica, pausa, vitória, qualidade baixa e
        movimento reduzido.
  - [ ] Capturar 390, 412, 430 e 768 CSS px, com foto-retrato e foto-paisagem
        derivadas que já sejam autorizadas para teste.
  - [ ] Revisar cada captura pela rubrica de foto protagonista, área útil do
        tabuleiro, legibilidade, obstrução, hierarquia, natalidade, feedback e
        ausência de termos técnicos.
  - [ ] Classificar achados como P1 (impede sensação/uso principal), P2
        (degrada compreensão ou acabamento) ou P3 (polimento).
  - [ ] Guardar somente o relatório, IDs de fixture seguros e achados
        agregados; nunca foto ou metadado de cliente no repositório.

  **Aceite:** há uma lista de problemas com reprodução, captura, severidade e
  dono provável. “Screenshot criado” não é considerado aprovação visual.

  **Registro de execução (2026-08-24):** concluída em navegador local com a
  rota privada e derivados de teste. A evidência sem foto persistida está em
  docs/references/PUZZLE_SWAP_BASELINE_2026-08-24.md. A inspeção encontrou dois
  P1 de apresentação, nenhum erro de console e nenhuma rolagem acidental nos
  quatro viewports.

- [x] **E0.2 — Fechar as decisões de produto que mudam a interface.**

  - [x] O proprietário define faixa etária principal, duração pretendida de uma
        rodada, nível de autonomia da criança e se um adulto acompanha a
        primeira abertura.
  - [x] Definir o que acontece depois da vitória: celebrar e escolher outra
        foto, repetir, compartilhar por fluxo externo ou retornar à sessão.
  - [x] Registrar dificuldade inicial, quando liberar dica e se haverá
        progressão em partidas futuras.
  - [x] Confirmar a direção híbrida: foto real em primeiro plano + cenário
        ilustrado natalino, ou substituir por outra direção antes de comprar,
        gerar ou preparar arte.

  **Aceite:** as quatro decisões ficam em um registro curto de produto.
  Nenhuma alteração de mecânica usa suposições escondidas.

  **Registro de execução (2026-08-25):** concluída com o proprietário. O
  público principal é 6–10 anos, com família como público complementar;
  autonomia infantil, primeira rodada de 2–4 minutos e sem eliminação por
  tempo. Depois da vitória, a família escolhe nova rodada, mais desafio,
  outros jogos ou compartilhamento. O Puzzle parte de 12 peças e oferece 16
  por escolha; dica fica disponível e a sugestão suave aparece depois de sete
  segundos sem progresso. A direção híbrida foi aprovada. A decisão completa,
  a presença Evydência e os limites de compartilhamento estão em
  [decisões de produto](../product/PRODUCT_DECISIONS_2026-08-25.md).

- [x] **E0.3 — Fortalecer a matriz de ferramentas de desenvolvimento.**

  - [x] Incluir tools/asset-factory no Knip.
  - [x] Trocar a proibição específica apps → tools/media-pipeline por uma regra
        apps → tools, mantendo exceções inexistentes por padrão.
  - [x] Acrescentar tools/asset-factory ao mapa de ownership em AGENTS.md,
        como código Node/VPS somente.
  - [x] Criar testes de arquitetura que provem que o browser não alcança
        Sharp, FFmpeg, fábrica de assets ou futura ferramenta de preparação.

  **Aceite:** pnpm architecture e pnpm deadcode passam; uma importação
  artificial de apps/play para tools/asset-factory é recusada pelo verificador.

  **Registro de execução (2026-08-24):** concluída. A regra tools-not-in-browser-graph
  recusa agora qualquer importação de apps para tools, e não somente o pipeline
  de mídia. Knip audita a Fábrica de Assets como workspace. A aceitação é
  coberta pela execução de pnpm architecture e pnpm deadcode.

- [ ] **E0.4 — Definir a coleta privada de Android físico.**

  - [x] Registrar o protocolo de captura, privacidade e repetição em
        docs/quality/ANDROID_REFERENCE_PROTOCOL.md.
  - [ ] Escolher aparelho, versão do sistema, navegador e condição de energia
        como referência, sem declarar orçamento antes de medir.
  - [ ] Preparar roteiro curto: abrir, iniciar, trocar duas peças, pedir dica,
        pausar, vencer, sair e repetir em NORMAL, LOW e movimento reduzido.
  - [ ] Registrar somente modelo do aparelho, qualidade, rota de teste,
        versão do build, observação de fluidez e números agregados.
  - [ ] Definir como reproduzir as medições ao alterar resolução, partículas,
        foto ou fundo.

  **Aceite:** existe método repetível; não se fixa FPS, DPR ou memória apenas
  por palpite de desktop.

### E1 — Contrato de experiência e conhecimento roteável

**Objetivo:** fazer com que um novo jogo comece pela experiência aprovada e
pelos limites técnicos, não por uma Scene vazia.

- [x] **E1.1 — Criar o contrato versionado de experiência por jogo.**

  - [x] Especificar EXPERIENCE_REQUIREMENTS.json com fantasia, verbos da
        criança, estados de interação, duração estimada, rota de vitória,
        camadas visuais, papéis de asset, efeitos, sons e qualidade.
  - [x] Manter caminhos, URLs, providers e arquivos fora desse contrato: ele
        descreve necessidade, não uma aquisição.
  - [x] Fazer game:new criar o arquivo, uma explicação humana equivalente e
        uma falha clara caso os papéis essenciais estejam ausentes.
  - [x] Validar o contrato em código puro e testar erro, versão, campos
        obrigatórios e compatibilidade com jogos já gerados.

  **Aceite:** um jogo novo não pode declarar “pronto para integrar” sem
  estados, verbos, papéis de asset e variantes de qualidade explícitos.

  **Registro de execução (2026-08-25):** `game:new` gera o contrato v1, e o
  parser puro recusa estados, papéis ou qualidade essenciais ausentes. O
  Puzzle Swap, jogo selecionado nesta fase, foi migrado para
  `EXPERIENCE_REQUIREMENTS.json` e `EXPERIENCE.md`: fantasia, verbos, estados,
  duração, vitória, papéis e alternativas LOW/reduzido estão explícitos sem
  introduzir regra no domínio. O teste do gerador lê e valida o arquivo real.
  Os contratos de jogos ainda fora de fase serão criados quando a respectiva
  implementação for autorizada, não como documentação especulativa.

- [x] **E1.2 — Decidir o formato realmente suportado para Skills locais.**

  - [x] Conferir na documentação oficial e nesta instalação do Codex qual
        diretório e qual manifesto de Skill são reconhecidos no workspace.
  - [x] Registrar a decisão em docs/ai/CODEX_CAPABILITY_STACK.md, com versão,
        limitações e procedimento de atualização.
  - [x] Só então criar habilidades locais pequenas, cada uma com entrada,
        decisão, arquivos que pode tocar, limites e validação.
  - [x] Não adotar o caminho .agents/skills nem afirmar que é carregado até
        essa descoberta estar comprovada na instalação.

  **Aceite:** a documentação separa habilidade reconhecida nesta máquina de
  simples arquivo de orientação. O projeto não depende de plugin não instalado.

  **Registro de execução (2026-08-24):** concluída. A fonte oficial confirma
  .agents/skills como escopo de repositório. Foram adicionadas duas Skills
  pequenas e complementares, sem depender de Game Studio: direção de jogo e
  revisão visual mobile.

- [x] **E1.3 — Ampliar o mapa Phaser sob demanda.**

  - [x] Auditar os tópicos oficiais 4.2.1 necessários para as primeiras
        tarefas aprovadas: câmeras, animações de sprites, agrupamento,
        texto/bitmap e geometria.
  - [x] Para cada tópico necessário, registrar tag, fonte, motivo e o exemplo
        oficial correspondente; copiar somente o conteúdo permitido pela
        licença e pelo procedimento do repositório.
  - [x] Atualizar PHASER_SKILL_MAP.md com o gatilho exato da leitura. Exemplo:
        câmera somente para transição de câmera aprovada; animação somente para
        faixa de frames aprovada.
  - [x] Deixar física, tilemap, multiplayer e outros assuntos fora do contexto
        padrão enquanto não houver requisito.

  **Aceite:** uma mudança Phaser sabe qual referência precisa ler, mas o
  contexto não cresce por prevenção.

  **Registro de execução (2026-08-25):** concluída. Foram conferidas as cinco
  Skills oficiais na tag `v4.2.1`, seus tipos instalados e o Quick Start
  oficial de cada uma. A cena atual não usa diretamente câmera, animação de
  sprite, Group/Container nem BitmapText; o único `Rectangle` já é coberto
  pelas referências de partículas e entrada. O mapa registra gatilhos e
  bloqueia uso de produção dessas cinco APIs até que uma tarefa aprovada
  justifique uma referência vendorizada revisada. Não houve cópia preventiva
  de conteúdo externo.

- [x] **E1.4 — Converter as Bibles em receitas testáveis.**

  - [x] Criar docs/experience/christmas/recipes/ e um schema de receita.
  - [x] Exigir de cada receita: finalidade, planos de cena, asset aprovado,
        gatilho, duração, intensidade, zona protegida da foto, limite de
        objetos ativos, som, owner de cleanup, NORMAL/LOW/reduzido e teste.
  - [x] Escrever primeiro as receitas: neve suave, neve de vitória, luzes
        quentes, botão pressionado, peça escolhida, dica de duas peças, troca
        correta, troca não resolutiva e vitória.
  - [x] Separar claramente receita de direção de arte: as Bibles definem
        linguagem; a receita define como o runtime executa e verifica.

  **Aceite:** “adicionar neve” resulta em uma configuração limitada e
  verificável, não em uma nova coleção de tweens arbitrários.

  **Registro (2026-08-24):** criado o schema e as nove receitas iniciais em
  `docs/experience/christmas/recipes/`. Elas referenciam apenas assets já
  catalogados ou deixam explícito quando nenhum arquivo adicional é permitido.

- [x] **E1.5 — Criar a rubrica GameExperienceReview.**

  - [x] Definir os quatro gates: jogador, visual, desempenho e acessibilidade.
  - [x] Para cada gate, listar perguntas observáveis e evidência obrigatória.
  - [x] Vincular o resultado da rubrica ao pull request, ao plano e à
        severidade de playtest.

  **Aceite:** uma feature visual só é aprovada quando explica benefício,
  pertencimento visual, custo e alternativa sem efeito.

  **Registro de execução (2026-08-24):** a rubrica está em
  `docs/quality/GAME_EXPERIENCE_REVIEW.md`. Ela exige benefício, evidência,
  custo, alternativa para efeito omitido e resultado por severidade antes da
  aprovação de uma alteração visual.

### E2 — Interface mobile e hierarquia da foto

**Objetivo:** recuperar espaço para a brincadeira, remover linguagem de
diagnóstico e provar a melhor divisão entre DOM e canvas antes de uma migração.

- [x] **E2.1 — Mapear proprietário de cada informação visível.**

  - [x] Inventariar título, progresso, cronômetro, som, dica, pausa, sair,
        instrução, aviso de estado, vitória e confirmação de saída.
  - [x] Estabelecer a proposta inicial: React possui rota, capa, saída,
        acessibilidade de shell e painéis não espaciais; Phaser possui
        tabuleiro, seleção, dica nas peças, resposta de troca, VFX e
        celebração espacial.
  - [x] Escolher, por pequeno protótipo comparativo, se cronômetro/progresso
        ficam no DOM ou em Phaser. Cada informação permanece em apenas um
        lugar durante a partida.
  - [x] Mover status de desenvolvimento para rotas __dev ou telemetria local;
        não exibir “pronto”, nomes de eventos, orientação da foto ou códigos
        internos à família.

  **Aceite:** não há HUD duplicado, título repetido ou status de QA em tela de
  produção, e a ponte React–Phaser continua exclusivamente tipada.

  **Registro de execução (2026-08-25):** a comparação controlada está em
  [decisão de propriedade do HUD](../references/PUZZLE_SWAP_HUD_OWNERSHIP_2026-08-25.md).
  Cronômetro e progresso visíveis permanecem na Scene: ela já possui o relógio
  da partida, o tabuleiro e a geometria que define o HUD. O candidato DOM
  exigiria novos eventos frequentes na ponte, uma camada posicionada sobre o
  canvas e uma segunda sincronização de estado sem resolver uma necessidade da
  família. React fica com rota, capa, saída, falha/carregamento e anúncio
  acessível; os anúncios medem 1 × 1 px, não ocupam a tela e continuam sendo
  tipados. O novo cenário E2E prova essa separação em 390 × 844 px; a revisão
  local encontrou um canvas, sem rolagem e sem HUD visual duplicado.

- [x] **E2.2 — Redesenhar capa e chamada principal.**

  - [x] Usar a foto derivada realmente escolhida como imagem hero, sem rótulo
        vertical/horizontal.
  - [x] Aplicar moldura natalina aprovada, camada de profundidade e neve leve
        fora do rosto e do botão.
  - [x] Tornar o botão Jogar uma pequena sequência: repouso legível, pressão,
        confirmação imediata e transição curta; sem animação contínua que
        distraia.
  - [x] Garantir alvo de toque, contraste, foco e cópia simples em português.
  - [x] Fazer o som do botão obedecer consentimento/desbloqueio por gesto e
        funcionar também quando o som estiver desligado visualmente.

  **Aceite:** a foto e a ação Jogar são percebidas antes da decoração; a capa
  continua íntegra com foto clara, foto escura e movimento reduzido.

  **Registro de execução (2026-08-25):** a capa usa a derivada escolhida como
  hero proporcional, em uma moldura com laço, brilho finito, profundidade e
  neve leve fora da ação. Ela não menciona orientação da foto. O CTA em
  português mede 54,8 px em 390 px, confirma o gesto de imediato e recebe o
  som curto do shell somente a partir desse gesto; uma chamada seguinte encerra
  a anterior para não acumular áudio. Os cenários E2E de foto-paisagem e
  movimento reduzido passaram em 390, 412, 430 e 768 px. A
  [revisão de capa](../references/PUZZLE_SWAP_COVER_REVIEW_2026-08-25.md)
  registra a inspeção visual local e a ausência de achados P1–P3.

- [x] **E2.3 — Reduzir chrome e ensinar no momento certo.**

  - [x] Medir a área do tabuleiro antes e depois, em todos os viewports já
        suportados.
  - [x] Substituir a instrução permanente de rodapé por coach mark de primeira
        ação e reforço contextual após inatividade.
  - [x] Manter a instrução acessível por botão ou pausa, sem ocupar espaço
        contínuo durante a brincadeira.
  - [x] Compactar ou recolher controles secundários sem esconder pausa, som,
        dica ou saída.

  **Aceite:** o tabuleiro ganha área útil mensurável e a criança ainda
  descobre toque–toque, arraste e pausa sem tutorial longo.

  **Registro de execução (2026-08-24):** o Puzzle ensina a primeira escolha e
  a segunda escolha em um cartão contextual de 50 px; ele some após a primeira
  troca. Dica reabre orientação para uma troca real e o reforço por inatividade
  usa a mesma área, sem um rodapé permanente. O chrome agora mede 84 px no topo
  e 62 px no rodapé (antes, 98 px e 74 px), preservando os alvos de toque de
  48 px para som, Dica e pausa. O teste puro `PuzzleBoardLayout` mede +26 px de
  altura disponível nos quatro viewports: 621→647 (390), 688→714 (412),
  704→730 (430) e 790→816 px (768). Em retrato de 768 px, a área proporcional
  do tabuleiro cresce de 468.075 para 499.392 px² (+6,7%); nos telefones, a
  largura da foto já era o limite e a reserva adicional evita compressão sem
  alterar a proporção. A revisão em 390×844 não encontrou rolagem, obstrução ou
  erro de console; `pnpm validate` aprovou 52 cenários.

- [x] **E2.4 — Melhorar a dica como ajuda infantil, não solução automática.**

  - [x] Usar a função determinística atual para obter o par de troca válido;
        nenhuma dica inventa uma posição por heurística visual.
  - [x] Mostrar a primeira peça, pausar brevemente, mostrar a segunda e
        desenhar uma relação clara entre as duas, sem cobrir rostos.
  - [x] Encerrar o destaque após tempo curto, troca, pausa, saída ou nova
        dica; prever intervalo entre dicas.
  - [x] Dar feedback distinto para toque sem efeito, troca útil e troca que
        ainda não resolve, sem som punitivo agressivo.
  - [x] Revalidar toque–toque e arraste nos mesmos cenários.

  **Aceite:** a dica aponta duas peças corretas e a criança entende o próximo
  gesto sem a peça ser movida automaticamente.

  **Registro de execução (2026-08-24):** `findPuzzleHintSwap` continua sendo a
  única origem do par. A Scene mostra a borda verde por 400 ms e, em seguida,
  a verde e a dourada com instrução simples, por até 1,45 s; as duas etapas são
  canceladas por troca, pausa, saída ou destruição, e há intervalo de 1,7 s
  contra repetição. Uma tentativa sem avanço recebe retorno discreto após a
  acomodação. A inspeção visual em fixture segura não encontrou erro de
  console; a passagem final de `pnpm validate` aprovou os 52 cenários. Os
  cenários de toque–toque e arraste passaram nos quatro viewports da matriz.

- [x] **E2.5 — Aprovar o protótipo de hierarquia.**

  - [x] Fazer revisão em screenshot e no navegador em retrato, paisagem, LOW e
        reduzido.
  - [x] Corrigir todo P1 antes de investir em asset novo ou extração de
        apresentação.
  - [x] Registrar quais decisões serão integradas no Puzzle em E6.

  **Aceite:** há aprovação explícita do proprietário para a hierarquia de capa
  e partida.

  **Registro de execução (2026-08-25):** o proprietário autorizou a direção
  híbrida já revisada: foto em primeiro plano, cenário ilustrado somente ao
  fundo, HUD Phaser único e coach mark contextual. A revisão técnica em fixture segura corrigiu
  o único P1 encontrado (rótulo de orientação visível na capa) e confirmou
  capa, partida, dica, pausa, LOW e movimento reduzido sem erro de console ou
  rolagem em 390 px. A decisão agora autoriza E3 e E6 sem adicionar arte
  externa ou mudar a mecânica.

### E3 — Apresentação natalina, VFX e áudio com custo conhecido

**Objetivo:** entregar sensação de aplicativo infantil sem transformar a Scene
em um arquivo monolítico ou em uma fonte de loops intermináveis.

- [x] **E3.1 — Definir a composição local de apresentação do Puzzle.**

  - [x] Depois da aprovação E2, extrair módulos locais sob
        packages/games/puzzle-swap/src/runtime/phaser/presentation/.
  - [x] Separar, no mínimo, cenário/luz, HUD aprovado, feedback de tabuleiro,
        VFX, áudio, coach mark e vitória pelo dono de lifecycle.
  - [x] Usar SceneScope para listeners, timers, tweens, sons, texturas e
        emissores; não criar BaseScene nem pacote que outro jogo importe.
  - [x] Manter regras, shuffle, dica, contagem e progresso no domínio atual.

  **Aceite:** a Scene fica legível por composição e destroy limpa todos os
  recursos; os testes de regras não mudam de camada.

  **Registro de execução (2026-08-25):** `presentation/` passou a conter a
  composição de cenário/HUD/coach/pause/vitória/neve, o diretor de feedback e
  o diretor de áudio. Eles recebem a `SceneScope` da cena, portanto não criam
  um BaseScene nem uma dependência entre jogos. A Scene preserva somente
  interação, layout do tabuleiro, ponte, regras e lifecycle.

- [x] **E3.2 — Implementar VFX por receitas e perfis.**

  - [x] Neve ambiente: emissor limitado, zona fora do plano principal,
        velocidade suave, quantidade máxima, vida limitada e reserva pequena.
  - [x] Luzes: três ou quatro grupos assíncronos de intensidade, sem blur em
        cada lâmpada, tween por lâmpada ou estroboscópio.
  - [x] Seleção/dica: pulsos finitos e moldura legível; redução de movimento
        troca pulso por contraste estático.
  - [x] Acerto/vitória: burst finito, partículas com máximo ativo e término
        verificável; nunca fluxo decorativo ilimitado.
  - [x] Medir contagem de emissores, partículas vivas e tweens a cada estado.

  **Aceite:** nenhum VFX invade a zona protegida da foto, excede seu limite ou
  sobrevive a pause/exit/destroy; LOW e reduzido são intencionais, não
  “quebrados”.

  **Registro de execução (2026-08-25):** a neve segue limitada a 18 partículas
  vivas e 20 reservadas, fora da foto; efeitos de troca são textos finitos
  destruídos no callback e no scope. LOW e movimento reduzido não instanciam
  neve e mantêm borda, troca, dica e vitória. O Laboratório de Desempenho já
  expõe as contagens por cenário e o E2E cobriu os quatro viewports.

- [x] **E3.3 — Implementar política de som e música.**

  - [x] Definir política para toque, seleção, pegar, acomodar, dica, acerto,
        tentativa, pause, saída e vitória, com prioridade, limite de
        simultaneidade e cooldown.
  - [x] Usar som curto de pegar/acomodar para arraste, não loop contínuo sob o
        dedo.
  - [x] Preparar música natalina discreta, loop coerente, volume de jogo,
        mute persistente permitido e ducking ao celebrar.
  - [x] Carregar e limpar sons pela Scene, respeitando gesto inicial do browser
        e saída do jogo.
  - [x] Revisar timbre para evitar buzzer, arcade agressivo e punição sonora.

  **Aceite:** sons não se acumulam em toques rápidos, nada toca após saída e
  cada feedback permanece compreensível sem áudio.

  **Registro de execução (2026-08-25):** `PuzzleAudioDirector` inicia música
  apenas após gesto, usa volume baixo (0,13), pausa/retoma com a partida,
  encerra no mute/SceneScope e impõe cooldown por papel para impedir acúmulo.
  Os efeitos importantes continuam visuais e há alternativa toque–toque.

- [x] **E3.4 — Aplicar luz e material à direção aprovada.**

  - [x] Usar a Bíblia de luz para definir fonte quente, contraste de moldura e
        cenário; nenhuma luz artificial reduz a leitura da foto.
  - [x] Evitar lua plana, bloom duro, néon, textura sem material e fundo
        concorrente.
  - [x] Para personagem opcional, provar função de jogo, silhueta, zona segura,
        fonte e faixa de animação coesa antes da integração.

  **Aceite:** o cenário tem profundidade e clima natalino, mas a foto, a grade
  e a ação continuam nos planos de leitura principais.

  **Registro de execução (2026-08-25):** o fundo noturno, horizonte de pinho,
  fita, estrelas e moldura dourada foram mantidos atrás do plano da foto; não
  há personagem opcional, bloom ou asset externo nesta versão.

### E4 — Laboratórios e contrato de desempenho

**Objetivo:** avaliar custo, assets e qualidade fora da partida antes de
integrar, sem inventar números universais.

- [x] **E4.1 — Criar modelo de medição.**

  - [x] Tratar largura × altura × 4 como estimativa conservadora de textura
        RGBA decodificada; documentar que não representa toda a memória real de
        GPU, canvas, mipmaps ou compressão.
  - [x] Medir bytes públicos, bytes de uma execução, bytes visuais, estimativa
        de texturas, requests, objetos de Scene, partículas vivas, tweens,
        timers e instâncias de áudio.
  - [x] Coletar deltas de frame com relógio de apresentação, percentis p50,
        p95 e p99, além de frames acima do limiar registrado no relatório.
  - [x] Registrar fotografia, fundo e variante carregada antes do preload; não
        carregar retrato e paisagem “por garantia”.

  **Aceite:** cada métrica define unidade, escopo, modo de coleta e limitação.
  Domínio permanece sem relógio real.

  **Registro de execução (2026-08-25):** o
  [contrato de medição](../quality/PERFORMANCE_MEASUREMENT_CONTRACT.md) define
  unidades, origem, escopo e limites de todas as métricas antes de qualquer
  orçamento. `PerformanceMeasurements` implementa a estimativa RGBA, os
  percentis p50/p95/p99, contagem acima do limiar e um coletor de timestamps de
  apresentação injetável; ele não conhece DOM, Phaser nem relógio real. O
  `FrameBudgetMonitor` passou a usar a mesma fórmula p95. Requests e snapshots
  de Scene serão conectados somente pelos laboratórios E4.2/E4.3, e Android
  físico continua obrigatório antes de E4.4 fixar valores.

- [x] **E4.2 — Criar Laboratório de Assets de desenvolvimento.**

  - [x] Estender o roteamento __dev existente com rota de assets, sem token de
        sessão e sem foto de cliente.
  - [x] Visualizar somente assets aprovados em 390/412/430/768 px, com mock
        seguro claro/escuro, planos L0–L3, zona segura da foto e estados de
        botão.
  - [x] Pré-visualizar receitas de VFX finitas, sprite strips e áudio em volume
        realista, NORMAL/LOW/reduzido.
  - [x] Mostrar proveniência resumida, tamanho de transferência, estimativa
        decodificada e motivo de rejeição, sem ferramenta de download.

  **Aceite:** um asset pode ser aprovado ou rejeitado antes de entrar no
  runtime; não há rede externa, dados de sessão ou asset não catalogado.

  **Registro de execução (2026-08-25):** a rota privada `__dev/assets` usa um
  catálogo browser-safe de 13 papéis aprovados, sem importar o manifesto de
  auditoria que contém caminhos internos. A prévia reúne L0–L3, a zona mock de
  foto, claro/escuro, estados de botão e as quatro larguras de referência. A
  neve é uma receita visual finita de 12 flocos e é omitida em LOW/reduzido;
  não há faixa de sprites aprovada e a ausência é declarada. Os seis papéis de
  áudio têm fontes m4a/mp3 locais, controles nativos e `preload="none"`.
  Revisão no navegador confirmou zona protegida, ausência de overflow
  horizontal nos quatro tamanhos e que a rota não abre sessão ou mídia privada.
  O [contrato do Laboratório de Assets](../quality/ASSET_LAB_CONTRACT.md)
  detalha os limites e a evidência.

- [x] **E4.3 — Criar Laboratório de Desempenho de desenvolvimento.**

  - [x] Reutilizar controles de ExperienceLab para qualidade, movimento, seed
        e som, em vez de duplicar estado.
  - [x] Exibir métricas correntes, resumo de percentis e foto de teardown
        antes/depois de montar e desmontar a partida.
  - [x] Permitir cenários determinísticos: ocioso, seleção, dica, acerto,
        vitória, pause, restart e saída.
  - [x] Manter observação local, removida do build de produção e sem enviar
        foto, token ou métrica a terceiros.

  **Aceite:** é possível apontar o estado que aumenta custo e confirmar que
  recursos retornam a zero/estado esperado após destroy.

  **Registro de execução (2026-08-25):** a rota local `__dev/performance`
  compartilha a query normalizada de qualidade, movimento, forma ilustrativa,
  som e seed do ExperienceLab, sem sessão de cliente. Ela monta apenas o
  Puzzle Swap com SVG público e apresenta p50/p95/p99, amostras e frames acima
  de 20 ms. Cada roteiro é executado pela Cena usando os mesmos métodos de
  seleção, dica, troca, pausa e conclusão da partida; React nunca toca uma
  Cena nem altera o tabuleiro. O relatório conserva snapshots locais antes de
  montar, depois de desmontar e antes/depois de remontar, contando canvas e
  host; a saída aprovada retorna ambos a zero. A importação é dinâmica somente
  em desenvolvimento, portanto o laboratório não compõe o build publicado.
  O teste E2E cobre vitória, pausa, reinício, saída, largura móvel e limpeza.
  Em 2026-08-25, o roteiro de vitória passou a encadear cada troca a partir da
  conclusão real do tween anterior, em vez de presumir que um atraso fixo
  bastaria. A repetição isolada passou em 390, 412, 430 e 768 px; a revisão
  local em 412 px confirmou vitória, ausência de overflow e saída com zero
  canvas e zero hosts.

- [ ] **E4.4 — Fixar orçamento somente após evidência.**

  - [ ] Repetir E0.4 com a nova instrumentação em dispositivo físico.
  - [ ] Definir orçamento por HIGH/NORMAL/LOW para requests, bytes,
        texturas-estimadas, partículas, tweens e frames de referência.
  - [ ] Registrar aparelho, versão, cenário e data junto de cada número.
  - [ ] Fazer manifestos e testes falharem ao exceder orçamento aprovado.

  **Aceite:** os limites são rastreáveis a medições reais e têm plano de
  exceção explícito; não são números copiados de outra aplicação.

### E5 — Fábrica de Assets v2 e proveniência

**Objetivo:** tornar cada asset de runtime revisável por origem, adequação,
preparo e custo sem transformar a fábrica em browser code.

- [x] **E5.1 — Projetar a migração de manifesto v1 para v2.**

  - [x] Manter leitura de v1 durante a transição e criar migrador explícito,
        testado e idempotente.
  - [x] Separar source, art, processing e runtime no novo contrato.
  - [x] Em source, registrar provider, identificador/origem, URL de referência
        quando existir, licença, URL da licença, data, hash e revisão humana.
  - [x] Em art, registrar família visual, adequação natalina, segurança da
        foto, legibilidade mobile, estado e justificativa.
  - [x] Em processing, registrar receita e ferramentas usadas; em runtime, bytes
        transferidos e estimativa decodificada.
  - [x] Preservar o caso válido de arte criada no projeto e legado autorizado,
        sem inventar URL externa para eles.

  **Aceite:** todo manifesto v2 é validado de forma pura e uma entrada v1
  migra sem perda de informação aplicável.

  **Registro de execução (2026-08-25):** `tools/asset-factory` agora aceita
  os dois documentos e expõe `migrateAssetManifest`; v1 é convertido de forma
  explícita, calcula SHA-256 do arquivo existente e v2 é idempotente. O Puzzle
  foi registrado em v2 com 19 entregas e `pnpm asset:validate` confirmou
  tamanhos, hashes, orçamento e catálogo. A validação usa
  [`node:crypto`](../references/EXPERIENCE_INTELLIGENCE_OFFICIAL_VALIDATION.md)
  somente no Node/VPS, fora do grafo do navegador.

- [x] **E5.2 — Implementar estados e revisão humana.**

  - [x] Aceitar somente DESCOBERTO, VERIFICADO, REJEITADO,
        PRECISA_HARMONIZAR, SUBSTITUIR, FONTE_APROVADA, PREPARADO e
        PRONTO_PARA_RUNTIME.
  - [x] Exigir evidência de licença, revisão da fonte, papel no jogo,
        adequação à âncora visual e compatibilidade com orçamento antes de
        PRONTO_PARA_RUNTIME.
  - [x] Garantir que score de estilo apenas prioriza; não aprova licença,
        segurança da foto nem arquivo sozinho.
  - [x] Auditar SHA-256, dimensões, bytes e arquivo público contra o manifesto.

  **Aceite:** asset sem origem ou estado verificável não chega a public/assets.

  **Registro de execução (2026-08-25):** o parser limita o estado aos oito
  valores do contrato. `audit` rejeita item sem `PRONTO_PARA_RUNTIME`, hash
  divergente (inclusive se o tamanho coincidir), dimensão/duração ausente,
  caminho fora de `public/assets` e arquivo público não catalogado. Os testes
  usam somente um arquivo temporário sintético e cobrem migração, idempotência,
  hash e rejeição de estado.

- [x] **E5.3 — Definir descoberta externa como etapa opcional e manual.**

  - [x] Ordenar consulta: catálogo local aprovado, fontes CC0 aprovadas,
        shortlist manual e, somente se necessário, criação/geração com receita.
  - [x] Para cada candidato externo, registrar fonte, termos, licença na fonte,
        hash, estilo, segurança da foto e revisão antes de baixar/usar.
  - [x] Para asset gerado, registrar modelo, receita/prompt referenciável,
        seed quando disponível, versão e revisão visual.
  - [x] Proibir busca, download, licenciamento ou geração durante uma partida.

  **Aceite:** o build é reproduzível a partir de arquivos aprovados; provider
  indisponível não quebra o jogo já publicado.

  **Registro de execução (2026-08-25):** a política manual foi incluída no
  [contrato de assets](../assets/ASSET_MANIFEST_CONTRACT.md). Nenhuma fonte
  externa foi consultada, instalada ou implicitamente aprovada nesta etapa.

### E6 — Integrar o Puzzle com mudanças pequenas

**Objetivo:** aplicar o que foi provado sem reescrever domínio, lifecycle ou
rota de sessão.

- [x] **E6.1 — Integrar interface aprovada.**

  - [x] Implementar a propriedade visual decidida em E2.
  - [x] Aplicar capa, CTA, coach mark, header compacto e fluxo de saída.
  - [x] Remover rótulos técnicos, de orientação e de QA da produção.
  - [x] Revalidar rota, foto derivada, foco, teclado quando aplicável, targets
        de toque e copy simples.

  **Registro de execução (2026-08-25):** a capa segura mostra “Memória de
  Natal”, sem orientação técnica; o jogo usa CTA simples, header compacto,
  coach mark contextual e saída pelo shell. A inspeção móvel em 390 px não
  encontrou rolagem ou erro de console.

- [x] **E6.2 — Integrar receitas e perfil de qualidade.**

  - [x] Aplicar somente receitas E1.4 aprovadas no Laboratório de Assets.
  - [x] Aplicar VFX, áudio e luz em módulos locais de apresentação.
  - [x] Usar a política de resolução validada em E4; não elevar DPR
        globalmente por estética.
  - [x] Carregar apenas assets do manifesto correspondente à variante.

  **Registro de execução (2026-08-25):** a composição usa apenas as receitas
  e os arquivos já catalogados; não altera DPR globalmente e cria a neve apenas
  em NORMAL/HIGH com movimento completo. O runtime continua a carregar uma
  única variante de foto por partida.

- [x] **E6.3 — Provar regressão zero das regras.**

  - [x] Manter mesmas regras determinísticas de tabuleiro, dica e embaralhamento.
  - [x] Executar unidades de domínio, integração de ponte e cenários de toque,
        arraste, pausa, retry e destroy.
  - [x] Verificar que pause impede interação e que exit encerra sons, partículas,
        listeners e texturas pertencentes ao jogo.

  **Aceite de E6:** a nova aparência não muda a solução do puzzle, não reduz a
  alternativa ao arraste, não mostra foto errada e não deixa recursos vivos.

  **Registro de execução (2026-08-25):** 83 testes unitários e 12 E2E do
  Puzzle nos quatro viewports cobriram solução, toque–toque, arraste, pause,
  foto segura, LOW e movimento reduzido após a extração. A arquitetura mantém
  o domínio sem import de Phaser e React recebe somente eventos da ponte.

- [x] **E6.4 — Fechar vitória, compartilhamento e presença do estúdio.**

  - [x] Registrar público, autonomia, duração, progressão, destino pós-vitória
        e direção visual aprovados pelo proprietário.
  - [x] Criar no shell comum o botão nativo de compartilhar, com cópia de link
        como alternativa e sem passar URL ou foto ao Phaser.
  - [x] Implementar no Puzzle a escolha voluntária entre nova rodada, desafio
        4×4, catálogo e compartilhamento após a vitória.
  - [x] Mostrar assinatura discreta e contatos do Estúdio Evydência no catálogo
        e na capa, nunca sobre o tabuleiro.
  - [x] Fazer revisão visual e E2E dos controles em 390, 412, 430 e 768 px,
        incluindo vitória, desafio, retorno e compartilhamento indisponível.
  - [x] Implementar no backend a prévia Open Graph por link autorizado antes
        de liberar `og:image` com foto consentida.

  **Aceite:** qualquer jogo já recebe compartilhamento seguro pelo shell; a
  vitória oferece próximas ações reais, e a foto do cliente só aparece em
  prévia social quando o servidor confirma consentimento e autorização.

  **Registro de execução (2026-08-25):** a revisão manual no navegador cobriu
  capa, vitória e desafio em 390, 412, 430 e 768 px, sem overflow horizontal;
  os quatro controles pós-vitória têm 52 px ou mais e permanecem dentro da
  área jogável. O E2E `Puzzle victory keeps every next action reachable on the
mobile matrix` passou separadamente nos quatro projetos: ele força a ausência
  de compartilhamento nativo e de área de transferência, confirma a cópia
  manual visível, verifica retorno ao desafio `4×4` e destruição segura ao sair.
  Em 2026-08-25, `apps/catalog-server` passou a autorizar o token no HTML e de
  novo na rota estável de imagem social; ela entrega apenas
  `X-Accel-Redirect` para uma URI interna. Sem consentimento ativo, usa a arte
  genérica aprovada de 1200×630; com consentimento, só aceita uma derivada de
  chave opaca. O teste de servidor cobre metadados antes do React, jogo
  compartilhado, consentimento, revogação e negação. `pnpm check:fast` passou
  com 101 testes unitários. A aplicação no VPS e a validação manual da prévia
  em WhatsApp continuam parte da liberação E7.

### E7 — Playtest, acessibilidade, Android e liberação

**Objetivo:** verificar a experiência como a família vê, não somente como a
suite de testes a encontra.

- [x] **E7.1 — Expandir a matriz Playwright.**

  - [x] Cobrir capa, primeira troca, seleção, dica, arraste, pause, som,
        vitória, retorno e teardown.
  - [x] Tirar screenshot por estado em 390, 412, 430 e 768 px; revisar mudança
        visual intencional antes de atualizar baseline.
  - [x] Garantir LOW e movimento reduzido sem loops decorativos, sem perda de
        texto, resposta ou conclusão.
  - [x] Tornar falha de console, asset ausente, HUD obstrutivo e recurso vivo
        após exit em defeitos com reprodução.

  **Registro de execução (2026-08-25):** a matriz agora cobre capa retrato e
  paisagem, foto selecionada, primeira seleção, primeira troca, dica em dois
  passos, arraste, pausa, áudio autorizado, vitória, retorno, exit e resize,
  além de LOW e movimento reduzido. Cada viewport 390, 412, 430 e 768 px gera
  evidência privada por estado, sem foto de cliente versionada. A primeira
  execução ampla encontrou que o reaproveitamento do Vite de 4173 durante uma
  atualização podia manter testes em “Preparando jogo”; não era falha do
  Puzzle. A execução completa em Vite limpo e isolado, mantendo 4173 para
  revisão local, foi repetida integralmente em servidor Vite limpo e isolado
  (`CI=1`, porta 4228), sem interromper a revisão local em 4173. Em
  2026-08-25, os 80 cenários passaram nos viewports 390, 412, 430 e 768 px em
  11,4 minutos. A regressão intermitente de toque foi eliminada ao reproduzir
  o toque real de tela e aguardar o evento tipado de peças estabilizadas, em
  vez de supor uma duração fixa de animação. Antes da matriz, os dois percursos
  que falhavam foram repetidos três vezes cada: reflow no iPhone e resolução
  completa no tablet. Uma execução posterior revelou que screenshots ainda
  gravados dentro da árvore observada pelo Vite podiam recarregar a página; eles
  foram movidos para o diretório privado de cada teste. Em 2026-08-26, a
  repetição final passou 80/80: 20 cenários completos em cada perfil 390, 412,
  430 e 768 px, todos com Vite e artefatos isolados (`CI=1`, portas 4242–4245,
  Node 24.19.0). O Android também repetiu três vezes os cinco ciclos de
  entrada/saída após receber um orçamento local de 60 segundos. O roteiro de
  arraste encerra pelo fluxo real de saída, e o resize espera a primeira troca
  concluir antes de reflow.

- [ ] **E7.2 — Fazer passagem manual estruturada.**

  - [ ] Testar em Android físico de referência e, quando disponível, segundo
        aparelho com densidade/tamanho diferente.
  - [ ] Verificar área segura, notch, scroll acidental, bloqueio de áudio,
        foco, ocultar/voltar ao app, troca de orientação e recuperação.
  - [ ] Revisar cenas claras/escuras, retrato/paisagem, qualidade e redução de
        movimento.
  - [ ] Registrar achados agregados, severidade e evidencia privada.

- [x] **E7.3 — Fechar gates de qualidade.**

  - [x] Corrigir P1 e P2 antes de liberar; P3 precisa de dono e data.
  - [x] Executar pnpm validate no runtime Node suportado pelo projeto.
  - [x] Executar auditoria de assets, checagem de mapa e revisão de
        proveniência.
  - [x] Atualizar docs/lessons.md somente com descobertas duráveis.

  **Aceite de E7:** evidência visual, funcional, de acessibilidade, lifecycle,
  assets e Android está registrada e não contém foto ou identificação de
  cliente.

  **Estado do gate (2026-08-27):** `pnpm validate` foi concluído no Node
  24.19.0, com tipos, lint, 104 testes unitários, arquitetura, análise de
  código morto, formatação, mapa, build e 80 cenários E2E aprovados em 7,2
  minutos nos viewports 390, 412, 430 e 768 px. `pnpm asset:validate` também
  confirmou manifesto, arquivos, tamanhos, orçamento e catálogo. A única
  pendência de E7 é a passagem manual em Android físico de E7.2, que continua
  pré-requisito para iniciar Memory em E8.

  **Revalidação de liberação (2026-08-27):** após alinhar os cenários ao texto
  final `Brincadeira concluída!`, uma matriz isolada adicional (`CI=1`, porta 4250) aprovou novamente os 80 cenários nos quatro viewports em 17 minutos.
  A alteração foi somente de expectativa e documentação; a solução, os
  eventos tipados e o runtime do Puzzle não mudaram. A pendência de Android
  físico permanece externa a este workspace.

### E8 — Prova da fábrica em um segundo jogo

**Objetivo:** provar reutilização por contratos e não por cópia do Puzzle.

- [ ] **E8.1 — Escolher Memory como prova, somente após E7.**

  - [ ] Criar seus próprios EXPERIENCE_REQUIREMENTS.json, SPEC e manifesto,
        sem importar código do Puzzle.
  - [ ] Reusar somente plataforma, tema, ferramentas e receitas que já tenham
        contrato independente.
  - [ ] Medir quais papéis, receitas e laboratórios realmente reduziram
        retrabalho.

- [ ] **E8.2 — Extrair apenas abstração comprovada.**

  - [ ] Só compartilhar tipo, token, validador, ferramenta ou receita quando
        os dois jogos precisarem do mesmo comportamento e teste.
  - [ ] Não extrair BaseScene, HUD universal ou componente de gameplay por
        semelhança superficial.

  **Aceite de E8:** o segundo jogo mantém domínio isolado, tem identidade
  própria e reaproveita contratos sem herdar a Scene do Puzzle.

## Portas de decisão do proprietário

| Momento              | Decisão necessária                                                            | Bloqueia                                                  |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| Antes de E2.2        | Faixa etária, tom da fantasia, destino depois da vitória e duração da rodada. | Hierarquia, cópia, coach mark e dificuldade.              |
| Fase 2 da maturidade | Aprovação explícita das âncoras visuais e da direção híbrida.                 | Novos assets de runtime, personagem e fonte externa.      |
| Antes de E4.4        | Aparelho Android de referência e método de medição.                           | Orçamento numérico de desempenho e política de resolução. |
| Antes de E5.3        | Fontes externas e condições de licença aceitáveis.                            | Descoberta/importação de arte, música ou 3D.              |
| Depois de E2.5       | Aprovação do protótipo de HUD e de área útil.                                 | Extração de apresentação e integração visual completa.    |

## Definição de pronto

Este plano só pode ser marcado concluído quando:

- cada tarefa marcada tem sua evidência e comando de validação;
- a experiência mostra uma única hierarquia de HUD e a foto é protagonista;
- toda receita de VFX/áudio possui limites, qualidade baixa, movimento reduzido
  e cleanup;
- a Fábrica de Assets consegue explicar origem, preparo e custo de cada arquivo;
- os limites de desempenho vêm de Android real e são verificados;
- Playwright e passagem visual manual não possuem P1/P2 abertos;
- o Puzzle continua determinístico e um segundo jogo prova o contrato sem
  importar o Puzzle.

## Referências de validação

As fontes oficiais e os limites de interpretação desta proposta estão em
[validação de experiência, skills e desempenho](../references/EXPERIENCE_INTELLIGENCE_OFFICIAL_VALIDATION.md).
