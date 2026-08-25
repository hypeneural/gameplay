# CG-CHRISTMAS-NATIVE-LIKE-MATURITY — plano de maturidade visual e lúdica

**Estado:** em execução — Fase 1 concluída; a primeira âncora visual de Fase 2
foi criada para revisão. Providers, assets de runtime e mudanças de Phaser
continuam condicionados à fase, proveniência e validação correspondentes.

**Ponto de partida:** `c61d3e6` na branch `codex/puzzle-native-like-v1`.

## Resultado pretendido

Transformar o Puzzle Swap no padrão de um jogo de Natal que pareça um
aplicativo infantil bem-acabado: a foto é a lembrança principal; a primeira
ação é compreendida rapidamente; toque, arraste, dica, pausa e vitória têm
resposta clara; a cena é rica sem ser pesada; e a mesma qualidade consegue ser
repetida por um segundo jogo sem copiar uma Scene inteira.

“Profissional” aqui não significa aplicar todos os efeitos possíveis. Significa
uma direção de arte coerente, feedback com propósito, áudio legível, contraste
adaptado à foto, comportamento acessível e zero regressão de privacidade,
desempenho ou lifecycle.

## Diagnóstico objetivo

| Pilar            | Já comprovado                                                                     | Lacuna que impede a próxima maturidade                                                             |
| ---------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mecânica         | domínio determinístico, toque–toque, arraste, dica de duas peças, pausa e vitória | validar compreensão com crianças e calibrar a dificuldade por faixa etária                         |
| Foto             | derivados autorizados, proporção preservada e revisão local privada               | medir contraste sobre fotos claras/escuras e fazer a vitória priorizar ainda mais a lembrança      |
| Sensação de jogo | som, partículas finitas, neve limitada e feedback de toque                        | falta uma gramática visual/sonora detalhada e uma cena em planos consistente                       |
| Assets           | manifesto, proveniência, bytes, auditoria e orçamento                             | ainda não há requisitos visuais, estados de candidato, laboratório nem núcleo de arte reutilizável |
| Mobile           | 52 testes em 390/412/430/768 px, LOW e movimento reduzido                         | falta evidência em Android físico, alto DPI e uma métrica de desempenho registrada                 |
| Fábrica          | `EXPERIENCE.md` é criado por `game:new`                                           | o jogo futuro ainda pode começar Phaser antes de aprovar requisitos e arte                         |

## Fontes oficiais que limitam o plano

| Tema                 | Fonte                                                                                                                                                                 | Decisão de arquitetura                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partículas           | [Phaser `ParticleEmitter` v4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js) e tipos instalados                     | Neve, brilho e vitória usam emissores limitados, pools pequenos e recursos de Scene; nunca uma animação decorativa sem fim.                                                |
| Atlas e carregamento | [Phaser Loader](https://docs.phaser.io/phaser/concepts/loader) e [AtlasJSONFile](https://docs.phaser.io/api-documentation/4.0.0/class/loader-filetypes-atlasjsonfile) | Atlas só entra após uma medição que prove redução útil de requests/bytes; fundos e fotos grandes permanecem fora dele.                                                     |
| Arraste              | [WCAG 2.2 — SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)                                                                                 | Todo gesto de arraste preserva a alternativa toque–toque.                                                                                                                  |
| Redução de movimento | [MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)                                 | LOW e movimento reduzido removem ambiente repetitivo; não removem confirmação, leitura, som opcional ou conclusão.                                                         |
| Render de produção   | [Blender — renderização por linha de comando](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html)                                            | Blender é uma ferramenta opcional de preparação 3D→2D, executada fora do navegador e com receitas versionadas.                                                             |
| Fontes CC0           | [Kenney](https://kenney.nl/support) e [Poly Haven](https://docs.polyhaven.com/en/faq)                                                                                 | CC0 é candidato, não aprovação automática: cada arquivo recebe versão/origem/licença e avaliação de estilo antes da importação.                                            |
| Descoberta de mídia  | [Openverse](https://docs.openverse.org/api/reference/made_with_ov.html)                                                                                               | Openverse pode descobrir candidatos futuramente, mas a própria documentação exige verificar a licença na origem; não haverá importação automática.                         |
| Plugins do Codex     | [OpenAI Plugins](https://github.com/openai/plugins)                                                                                                                   | O repositório confirma a estrutura de plugins. Nesta máquina não há `game-studio`/`sprite-pipeline` instalado; qualquer adoção futura é opcional e não bloqueia o produto. |

O código tagueado de Phaser 4.2.1 continua sendo a autoridade para chamadas de
runtime concretas. A documentação pública de Phaser é usada apenas como mapa
de conceitos quando não divergir da tag instalada.

## Guardas permanentes

1. A pessoa nunca vê orientação, caminho, nome de cliente, foto original ou
   termo técnico; toda cópia visível permanece em português simples.
2. Foto, grade e ação principal são o plano mais legível da tela. Cenário,
   personagens e luzes não encobrem rostos nem viram um segundo jogo atrás do
   jogo.
3. Todo efeito tem uma razão observável: orientar, confirmar, ensinar ou
   celebrar. Efeito sem função é removido.
4. Domínio não importa Phaser/React/DOM, e cada objeto Phaser, textura, timer,
   som, tween e listener pertence a `SceneScope`.
5. Todo arquivo que o navegador carrega já foi preparado, licenciado,
   registrado e auditado antes do deploy ou da publicação de derivados. Nenhum
   provider, conversor ou busca de terceiros roda durante uma partida.
6. Um asset descoberto não é um asset aprovado. Estados permitidos:
   `DESCOBERTO`, `VERIFICADO`, `REJEITADO`, `PRECISA_HARMONIZAR`,
   `SUBSTITUIR`, `FONTE_APROVADA`, `PREPARADO`, `PRONTO_PARA_RUNTIME`.
7. Não gerar frames de animação de IA de forma independente. Uma animação
   parte de uma pose-chave aprovada e é preparada como uma faixa coerente;
   personagem recorrente prefere 3D→2D ou sprite aprovado.

## Ordem de execução

## Acompanhamento da execução

- [ ] Fase 0 — evidência privada de uso e Android físico depende do
      proprietário, responsáveis e aparelho de referência.
- [x] Fase 1 — linguagem natalina de produção documentada e roteada.
- [x] Fase 2.1 — `MASTER_STYLE_FRAME` candidata criada fora de `public/`, sem
      foto de cliente e com proveniência.
- [ ] Fase 2.2–2.4 — seis âncoras, mockups e aprovação explícita da direção.
- [x] Prévia visual controlada — entrada do Puzzle recebeu moldura, cenário e
      CTA em CSS com assets já autorizados; verificadas foto, dica e troca em 390 px.
- [ ] Fase 3 — requisitos de experiência e manifesto v2.
- [ ] Fase 4 — Asset Lab local.
- [ ] Fase 5 — acabamento do Puzzle após os gates anteriores.
- [ ] Fases 6–10 — núcleo de arte, áudio, automação, segundo jogo e produção.

**Evidência desta execução (2026-08-24):** `pnpm validate` passou com 52
testes Playwright em 5,7 min. A matriz cobriu 390, 412, 430 e 768 CSS px,
entrada/saída, foto retrato e paisagem, toque–toque, arraste, dica, pausa,
som, retry seguro, LOW e movimento reduzido. A inspeção manual privada em 390
px também confirmou foto central, CTA, dica e troca sem erro de console.

### Fase 0 — evidência de uso antes de mais arte

**Objetivo:** resolver as decisões que realmente mudam a interface antes de
produzir assets.

1. Definir faixa etária primária, direção final (híbrida recomendada: cenário
   ilustrado + foto/moldura premium) e destino da vitória.
2. Preparar uma matriz privada com derivados claros, escuros, retrato e
   paisagem. Avaliar legibilidade de grade, HUD, bordas de dica e CTA; não
   salvar fotos nem métricas identificáveis no repositório.
3. Fazer observações de uso com responsáveis/crianças autorizados: primeira
   ação, troca por dica, pausa, som, término e “escolher outra foto”. Registrar
   somente resultados agregados e dúvidas recorrentes.
4. Medir em Android físico a duração de uma rodada, quedas visíveis de fluidez,
   consumo de bateria percebido e comportamento em LOW/NORMAL/HIGH. Fixar um
   aparelho de referência e um método de captura antes de declarar um orçamento
   de FPS/memória.

**Entrega:** relatório privado de observação, matriz de contraste e decisões de
produto. Sem mudança de mecânica nesta fase.

**Aceite:** uma criança consegue iniciar, fazer uma troca, entender a dica e
sair sem tutorial longo; nenhuma combinação de foto torna a instrução ou peça
invisível; LOW e redução de movimento continuam jogáveis.

### Fase 1 — linguagem natalina de produção ✅

**Objetivo:** tirar o “gosto” natalino da memória do agente e colocá-lo em
documentos curtos, roteáveis e verificáveis.

Criar sob `docs/experience/christmas/`:

| Documento                 | Decide                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `SCENE_GRAMMAR.md`        | planos L0 fundo, L1 meio, L2 foto/gameplay, L3 primeiro plano; contraste e zonas proibidas para rosto/controles              |
| `COMPONENT_DICTIONARY.md` | neve, floco cristal, brilho dourado, poeira mágica, fairy light, pisca, twinkle, laço, guirlanda, pinho, presente e lanterna |
| `LIGHTING_BIBLE.md`       | luz prática quente, janela, lanterna, pisca e limites contra néon, laser, bloom duro e blur contínuo                         |
| `MOTION_BIBLE.md`         | entrada, toque, antecipação, acomodação, dica, acerto e vitória; duração, intensidade e fallback reduzido                    |
| `AUDIO_BIBLE.md`          | vocabulário de `tap`, `correct`, `hint`, `wrong`, `celebrate`; evitar buzzer, arcade agressivo e ruído excessivo             |
| `MUSIC_BIBLE.md`          | celesta/piano/cordas/sinos suaves, volume de jogo, loops e critérios de rejeição                                             |
| `CHARACTER_BIBLE.md`      | quando personagem é necessário; estilo toy-diorama, silhueta, segurança infantil e regra de não usar Papai Noel por padrão   |
| `PROMPT_RECIPES.md`       | prompts de referência e anti-prompt; nunca nomes de clientes, fotos de sessão ou marcas de terceiros                         |

Para pisca-pisca, separar semanticamente:

- **pisca:** mudança perceptível de intensidade;
- **cintilação:** microvariação de alpha/escala;
- **brilho:** evento curto, finito e importante.

**Aceite:** um pedido como “mais neve” ou “luzes melhores” aponta para um
documento e produz uma decisão consistente de qualidade, LOW e movimento
reduzido; não apenas “adiciona glow”.

**Registro de execução:** concluída em 2026-08-24 com os oito documentos
listados, o roteamento em `ART_BIBLE.md`, índice de documentação e uma
revalidação dos links oficiais em
`references/CHRISTMAS_NATIVE_LIKE_MATURITY_VALIDATION.md`.

### Fase 2 — âncoras visuais e quadro de aprovação

**Objetivo:** comunicar a direção de arte por imagem antes de produzir dezenas
de arquivos.

1. [x] Criar um único `MASTER_STYLE_FRAME` em 390 × 844 contendo cenário, área de
       foto, moldura, HUD, árvore/luzes, neve e a hierarquia correta de leitura.
2. [ ] Derivar seis âncoras de referência: árvore, presente, iluminação, UI, VFX e
       personagem opcional. Elas vivem fora de `public/`, recebem proveniência e
       são referências de direção, não assets de runtime.
3. [ ] Produzir mockups de retrato e paisagem e revisar explicitamente: foto mais
       chamativa, instrução legível, CTA percebido, cor natalina sem poluição.
4. [ ] Guardar somente âncoras aprovadas. Referência não aprovada é removida do
       fluxo de decisão, não “quase usada”.

**Gate do proprietário:** aprovação da direção visual antes de gerar,
baixar ou harmonizar um pacote de arte.

**Registro de execução:** `master-style-frame-v1.png` é uma candidata fora de
`public/`. A prévia CSS da entrada do Puzzle usa somente o cenário já
catalogado e formas do navegador; ela serve para validar hierarquia de foto e
CTA, não aprova nem introduz um pacote de arte novo.

**Aceite:** uma pessoa reconhece a mesma família visual em UI, luz, cena e VFX
sem que o fundo compita com a foto.

### Fase 3 — requisitos antes do Phaser e manifesto v2

**Objetivo:** impedir que um novo jogo comece pelo canvas antes de saber qual
experiência e quais assets realmente precisa.

1. Fazer `game:new` criar `EXPERIENCE_REQUIREMENTS.json` apenas com papéis:
   camadas de cena, fundo, moldura, controles, VFX de dica/acerto/vitória e
   SFX/música necessários. Não criar URLs, downloads ou assets fictícios.
2. Estender o manifesto com metadados opcionais de estilo:
   `familiaVisual`, `familiaMaterial`, `familiaLuz`, `sinaisNatalinos`,
   `legivelNoCelular`, `segurancaDaFoto`, `revisaoDaFonte` e `estado`.
3. Criar validação pura para estados de candidato, obrigatoriedade de
   proveniência e coerência de família visual. Um score pode priorizar revisão,
   mas nunca aprova licença ou estilo sozinho.
4. Exigir uma justificativa humana curta para cada candidato aprovado:
   papel, origem, licença confirmada, por que combina com a âncora e por que
   cabe no orçamento.

**Aceite:** o gerador não pode registrar um jogo sem requisitos de experiência;
o auditor recusa asset sem papel, estado, revisão de origem ou coerência com o
manifesto.

### Fase 4 — Asset Lab local, comparável e sem rede

**Objetivo:** aprovar visual e som em condições de jogo antes da integração.

1. Criar rota somente de desenvolvimento `__dev/assets`, excluída de produção,
   que mostra assets já aprovados sobre cenários claros/escuros e dentro de um
   viewport de 390 px.
2. Exibir planos L0–L3, área protegida da foto, tamanho mínimo de UI, estado
   normal/pressionado/mudo e variantes LOW/NORMAL/reduzido.
3. Mostrar VFX em emissão finita, sprite strip e previsões de bytes; não usar
   loops invisíveis nem a foto de cliente como fixture persistente.
4. Para áudio, criar uma prévia em volume de jogo, misturando música baixa com
   `tap`/`correct`; testar silêncio, repetição e parada ao fechar a rota.

**Aceite:** revisão em 390/412/430/768 px aprova ou rejeita cada asset por
legibilidade e estilo antes de o jogo o carregar.

### Fase 5 — acabamento do Puzzle baseado em evidência

**Objetivo:** aplicar a linguagem aprovada ao jogo atual sem reescrever suas
regras.

1. Extrair uma composição local `PuzzleChristmasPresentation` para a cena em
   planos, mantendo domínio e `createPuzzleSwapGame` responsáveis somente pelo
   que já lhes pertence. Não criar `BaseScene`.
2. Implementar contraste adaptativo a partir de dados seguros do derivado (por
   exemplo, perfil de luminosidade calculado no pipeline), nunca do original e
   nunca por tentativa visual no navegador. A moldura/HUD ganha o contraste;
   a foto não recebe filtro destrutivo.
3. Substituir decoração genérica por núcleo pequeno: família de neve, moldura,
   luzes preparadas, presente/lanterna/ramo de primeiro plano e um único
   cenário em quatro planos. Cada elemento tem papel e versão LOW/reduzida.
4. Implementar luzes como sprites com brilho já preparado, em 3–4 grupos de
   fases diferentes e variação determinística injetada. Não usar GIF, blur por
   lâmpada ou sincronia perfeita.
5. Reforçar a vitória em duas fases: foto recomposta com prioridade → uma
   celebração breve + CTA “Escolher outra foto”. Pausar/sair no meio deve
   limpar tudo corretamente.

**Aceite:** capturas comparativas demonstram maior leitura da foto e da ação;
uma saída durante cada efeito deixa zero canvas/tween/som retido; não há
diferença funcional entre toque–toque e arraste.

### Fase 6 — núcleo de arte, sprites e normalização

**Objetivo:** preparar poucos assets excelentes, não uma biblioteca enorme.

Pacote inicial máximo:

```text
2 cenários · 2 molduras · 8–12 props · 6 controles · 6–8 VFX · 7–9 SFX · 1 música
```

1. Priorizar assets próprios e já aprovados. Kenney, Quaternius, Poly Haven e
   OpenGameArt CC0 são apenas candidatos e passam pelo gate de estilo/licença.
2. Se 3D for escolhido, usar Blender somente para harmonizar/renderizar
   sprites 2D: câmera, escala, pivô, luz e transparência repetíveis em receita
   versionada. HDRI/material de produção não entra no pacote do telefone.
3. Personagem recorrente (Papai Noel, rena ou elfo) só entra com papel
   narrativo. Usar modelo/rig/pose consistente; não gerar cada frame de IA
   isoladamente.
4. Normalizar sprite: margem transparente, pivô, escala, nomenclatura,
   preview sheet, frames e orçamento. Gerar atlas apenas se a medição justificar
   e carregar via API suportada pela versão Phaser fixada.

**Aceite:** cada asset cabe na âncora aprovada, é compreensível a 200 CSS px,
tem preview, licença e custos conhecidos; runtime não contém arquivo fonte 3D,
HDRI nem PNG editável desnecessário.

### Fase 7 — áudio, música e mix de jogo

**Objetivo:** criar uma assinatura natalina acolhedora, não ruído de arcade.

1. Revisar `tap`, `correct`, `hint`, `wrong` e vitória contra a Audio Bible.
   Cada som tem início claro, cauda curta e papel não sobreposto.
2. Definir música instrumental calma: celesta, piano suave, cordas e sinos em
   volume de execução, não volume de audição isolada. Testar contra dois SFX
   simultâneos.
3. Fontes externas ou geração musical entram somente após licenciamento e
   termos de saída revisados. Uma licença de código/modelo não aprova
   automaticamente o uso comercial do áudio gerado.
4. Processar offline, manter formatos alternativos, registrar duração/bytes e
   usar grupos de entrega do manifesto. Repetir autoplay, mudo, pausa e
   teardown em dispositivo real.

**Aceite:** nenhum som é agressivo ou mascarado pela música; o mudo é imediato;
saída nunca deixa áudio tocando; LOW e movimento reduzido preservam a
compreensão sem forçar música.

### Fase 8 — providers e automação, somente após aprovação do núcleo

**Objetivo:** acelerar descoberta sem tornar o projeto dependente de scraping,
rede ou licença implícita.

Ordem segura:

1. catálogos locais curados de fontes já aprovadas;
2. `asset:search` apenas em metadados e sempre fora do runtime;
3. `asset:shortlist`, `asset:compare` e `asset:prepare` que produzem artefatos
   revisáveis, nunca download/publicação automática;
4. provider oficial com revisão de termos e rate limits isolado por adapter;
5. geração por Image Gen/ComfyUI somente para lacuna comprovada, usando as
   âncoras e exigindo revisão humana/registro de prompt e versão.

O dado consultado em rede nunca vai diretamente para `public/`. A importação
é uma ação explícita, com snapshot de licença, origem, revisão e resultado da
auditoria.

**Aceite:** uma busca retorna candidatos e estado, mas não muda o bundle; um
asset só chega ao runtime após aprovação explícita, preparação e
`pnpm asset:validate`.

### Fase 9 — segundo jogo como prova de reutilização

**Objetivo:** provar a fábrica em um jogo de memória, sem copiar o Puzzle.

1. Gerar o módulo não registrado, preencher requisitos e aprovar a arte antes
   de tocar no Phaser.
2. Criar domínio e testes próprios; usar os documentos, núcleo de assets,
   laboratório e gates como consumidores independentes.
3. Só extrair uma composição compartilhada quando Puzzle e Memory tiverem a
   mesma necessidade comprovada, lifecycle e testes compatíveis.

**Aceite:** Memory usa a mesma linguagem natalina e pipeline de aprovação,
mas não importa a Scene, domínio ou estados do Puzzle.

### Fase 10 — produção e medição continuada

**Objetivo:** transformar a qualidade percebida em qualidade sustentável.

1. Estabelecer orçamento por aparelho para tempo de entrada, primeira ação,
   frame time, memória e bytes transferidos. O primeiro valor é observação,
   não meta inventada.
2. Adicionar evidência WebKit/high DPI após instalar e estabilizar os browsers
   necessários.
3. Implementar PWA/cache apenas depois da revisão de privacidade dos derivados;
   cache do app não autoriza cache de foto.
4. Criar evals de pedidos como “melhore a neve”, “crie luzes natalinas” e
   “adicione personagem” que verificam documentos consultados, gates de
   licença, foto protagonista, LOW/reduzido e ausência de assets aleatórios.

**Aceite:** cada release preserva `pnpm validate`, tem evidência móvel e não
introduz fotos, URLs de origem ou assets sem proveniência.

## Sequência de decisão e dependências

```text
F0 evidência de uso
  → F1 linguagem natalina
  → F2 âncoras aprovadas
  → F3 requisitos + manifesto v2
  → F4 laboratório local
  → F5 Puzzle refinado
  → F6 núcleo de arte / F7 áudio
  → F8 providers opcionais
  → F9 Memory prova a reutilização
  → F10 produção e evals
```

F6 e F7 podem começar em paralelo somente após F2/F3. F8 não bloqueia F5–F7;
isso evita depender de uma API, modelo de IA, download ou plugin não instalado
para melhorar o jogo que a criança verá agora.

## Evidência exigida por entrega

| Mudança         | Evidência mínima                                                                             |
| --------------- | -------------------------------------------------------------------------------------------- |
| Documento/regra | revisão de links oficiais, `pnpm repo:map`, teste do roteamento da Skill quando existir      |
| Schema/CLI      | testes puros de caminho, licença, estado, orçamento e arquivo não catalogado                 |
| Asset visual    | origem, licença, revisão, preview 390 px, LOW/reduzido e auditoria de bytes                  |
| Phaser/VFX      | tipos/skill/tag 4.2.1 correspondentes, `SceneScope`, saída durante efeito e quatro viewports |
| Áudio           | gesto inicial, mudo, pausa, saída, mix em volume de jogo e formatos alternativos             |
| Produto         | observação privada agregada, contraste por matriz e Android físico                           |

Para qualquer mudança de runtime: `pnpm check:fast` durante a implementação e
`pnpm validate` antes de publicar. Para alteração exclusivamente documental:
`pnpm check:fast` e `pnpm repo:map` mantêm o mapa e os links consistentes.

## Decisões que ainda precisam do proprietário

1. Faixa etária dominante e dificuldade desejada: 6, 9, 12 ou mais peças.
2. Direção aprovada: híbrida (recomendada), estúdio premium ou ilustração mais
   lúdica.
3. Caminho após a vitória: escolher nova foto, outro jogo ou uma lembrança
   compartilhável — as duas últimas exigem produto e privacidade específicos.
4. Autorização explícita, por fonte, antes de baixar ou importar qualquer asset
   de terceiros; CC0 diminui atrito de licença, mas não substitui direção de
   arte e registro de proveniência.

## Fora de escopo deliberadamente

- Não instalar plugins, baixar packs, raspar sites, usar APIs externas ou gerar
  arte/música nesta fase de planejamento.
- Não copiar código de plugins, exemplos ou jogos antigos para o runtime.
- Não adicionar Papai Noel, 3D, atlas, IA ou filtros pesados para “parecer mais
  profissional” sem uma âncora aprovada e medição móvel.
- Não compartilhar Scene, regra de jogo ou foto entre jogos.
