# Guirlanda das Lembranças — arquitetura, lógica e maturidade mobile

**Jogo:** Guirlanda das Lembranças  
**Estado em 2026-09-04:** vertical slice jogável, visualmente revisado e pronto
para a etapa de endurecimento de produto. Não é ainda uma liberação externa:
a validação em aparelhos físicos, a estabilização do gate integral e alguns
reforços de acessibilidade ainda são necessários. O isolamento de áudio foi
implementado na V2 e tem testes próprios.

## Resumo executivo

### Atualização V2 — 2026-09-04

A implementação V2 substituiu a barra/progresso do topo por lâmpadas no aro,
estrelas planas por ganchos de latão e miniaturas planas por molduras materiais.
A caixa entrega cada foto, o encaixe confirma contato e a vitória termina
antes do painel integrado. Áudio agora usa apenas instâncias próprias; o item
de isolamento de áudio da avaliação V1 abaixo foi resolvido.

Novos arquivos (endereços absolutos):

| Arquivo                                                                                                                | Responsabilidade                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\GarlandLayout.ts`          | Geometria responsiva e aberturas normalizadas; protege foto, alvos e ações finais. |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\GarlandPhotoFrame.ts`      | Composição física da foto, aro, sombra e pivô de suspensão.                        |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\GarlandMotionDirector.ts`  | Tokens por intenção e posse cancelável somente dos tweens ativos.                  |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\GarlandAmbientDirector.ts` | Seis flocos periféricos e respiração da luz; ausente em LOW/reduzido.              |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\tests\GarlandAudioDirector.test.ts`           | Prova isolamento de áudio, desbloqueio, mudo, prioridades e destruição.            |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\tests\GarlandLayout.test.ts`                  | Prova proporção, alvos separados, margens e abertura para formatos extremos.       |

O restante deste documento registra a avaliação da V1; consultar também o
[plano V2](../exec-plans/CG-GUIRLANDA-V2-INTEGRATED-EXPERIENCE.md) para entregas
e limitações atuais. Aparelhos físicos, acessibilidade semântica completa,
mix com gravações dedicadas e performance medida continuam próximos passos.

A Guirlanda é um minigame web **mobile-first e native-like**: a pessoa pega
uma foto da sessão, toca em uma estrela dourada ou arrasta a moldura até ela e
vê a lembrança se tornar um enfeite físico da guirlanda. Não há erro punitivo,
cronômetro, pontuação ou resposta escondida. A brincadeira termina assim que
todas as fotos selecionadas foram penduradas.

O termo _native-like_ aqui descreve a sensação de um aplicativo de celular:
alvos grandes, resposta imediata, feedback tátil/visual/sonoro coerente,
pausa, retorno após interrupção, movimento controlado e layout que acompanha
o viewport. O jogo atual é uma aplicação web React + Phaser; ele **não é** um
aplicativo nativo instalado. Recursos como instalação, trabalho offline,
notificações ou integração profunda com iOS/Android só devem entrar se forem
decididos como escopo de produto à parte.

## Stack atual

| Camada                   | Tecnologia e responsabilidade                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | pnpm 11, TypeScript 6 e Node.js 24; monorepo com regras de fronteira entre domínio, plataforma, tema e jogos.                            |
| Shell de produto         | React 19 e Vite 8. O shell controla rota, capa, sessão, acessibilidade de alto nível e ciclo de montagem/saída.                          |
| Runtime do jogo          | Phaser 4.2.1. Ele desenha o canvas, recebe toque/arraste, posiciona molduras, anima feedback e toca os SFX.                              |
| Regra determinística     | TypeScript puro em `domain/`; não conhece DOM, Phaser, foto, relógio real ou aleatoriedade.                                              |
| Contratos compartilhados | `@christmas-games/platform`: `GameContext`, foto derivada, bridge de eventos, `PhotoSurface`, escopo de recursos, qualidade e lifecycle. |
| Direção visual           | Assets WebP próprios, manifestados e auditáveis; madeira, latão, veludo, pinho, azul-noturno e dourado.                                  |
| Áudio                    | SFX M4A/MP3 locais para toque, encaixe e vitória; liberados somente após gesto da pessoa.                                                |
| Qualidade                | Vitest para domínio, Playwright para fluxo mobile/canvas, ESLint, TypeScript, auditoria de manifesto e build Vite.                       |

## Arquitetura e fronteiras

```text
React / AppRouter
   └─ PhaserHost ── cria, pausa e destrói uma única partida Phaser
        └─ Guirlanda Scene
             ├─ domain/GuirlandaDasLembrancasState.ts  ← regra pura
             ├─ PhotoSurface                            ← proporção da foto
             ├─ assets WebP + áudio                      ← apresentação
             └─ GameRun / bridge                         → eventos tipados ao React
```

Esta separação é importante. O domínio decide **se** uma jogada é válida; a
Scene decide **como ela parece e soa**. React não recebe a Scene nem o objeto
`Phaser.Game`, por isso não há dois donos do tabuleiro ou do estado visual.
Na saída, o host libera o lease de montagem, a Scene para tweens/sons/texturas
próprios e o canvas é destruído.

## Lógica da brincadeira

### Seleção das fotos

1. A foto escolhida no Hub entra sempre primeiro.
2. O runtime acrescenta, na ordem autorizada pela sessão, no máximo outras
   cinco fotos.
3. A rodada contém entre uma e seis fotos; há seis ganchos físicos.
4. Somente a variante autorizada `game` chega ao Phaser. Nome do arquivo,
   caminho local, original e identificador interno não fazem parte do estado
   do jogo.

### Máquina de estados

```text
awaiting-photo ── tocar/arrastar moldura ──> awaiting-slot
      ^                                             │
      └──── encaixar em estrela livre ──────────────┘
                                                    │ última foto
                                                    ▼
                                                completed
```

| Estado           | O que a pessoa faz                                   | Consequência                                                                           |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `awaiting-photo` | Toca ou começa a arrastar a moldura central.         | A moldura eleva, recebe brilho e as estrelas livres viram o próximo convite.           |
| `awaiting-slot`  | Toca uma estrela livre ou solta a moldura sobre ela. | A foto é pendurada, uma luz percorre a guirlanda e o próximo retrato aparece.          |
| `completed`      | Observa a composição e usa as ações de conclusão.    | A foto âncora retorna ao centro, as seis lembranças permanecem e a celebração termina. |

Qualquer estrela livre aceita a foto. Tocar uma estrela antes de selecionar a
moldura, tocar uma ocupada ou soltar o arraste fora não muda a coleção: o jogo
mantém a foto e responde com orientação gentil. Uma lembrança já pendurada
também é interativa: ela abre um visualizador proporcional com retorno
explícito à guirlanda.

### Resposta, movimento, som e VFX

| Momento            | Resposta atual                                                                    | Limite de custo e conforto                                                        |
| ------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Toque de controle  | Compressão de 90 ms e SFX curto.                                                  | Não é confirmação única; o estado também muda visualmente.                        |
| Seleção da moldura | Elevação de 120 ms, leve brilho e haptic leve pelo adaptador da plataforma.       | A zona da moldura recua sob as estrelas para não encobrir o próximo alvo.         |
| Encaixe            | Snap de 180 ms, fio de luz dourado de 260 ms e seis faíscas fora da fotografia.   | Todos os tweens têm fim; não há câmera, parallax nem neve contínua.               |
| Progresso          | Uma das seis luzes do HUD acende e pulsa por 150 ms.                              | O HUD é a única fonte de progresso durante a partida.                             |
| Vitória            | Foto âncora entra em 260 ms, texto curto, doze faíscas externas e SFX de vitória. | LOW e movimento reduzido preservam o estado final e retiram decoração repetitiva. |
| Inatividade        | Após 6,2 s, realça a moldura central ou a próxima estrela livre.                  | A dica aponta a intenção, mas nunca realiza a jogada.                             |

## Foto, moldura e realismo

As fotos são o elemento mais importante da cena. A implementação usa
`PhotoSurface(..., 'contain')`: retratos, paisagens e quadrados preservam a
proporção e nunca são cortados para caber no aro. O espaço que sobra fica no
fundo nogueira da moldura, não em branco.

Existem duas molduras hero com transparência real: uma vertical e outra
horizontal. A janela da foto é calculada **dentro da abertura alpha física**
de cada uma. O inset só afasta a foto do aro; ele não amplia o passe-partout.
Esta decisão eliminou a faixa clara que antes escapava por cima da moldura de
retrato. As miniaturas usam uma composição mais simples, mas continuam
proporcionais e clicáveis.

A revisão privada já exercitou retratos próximos de 0,714 e paisagens próximas
de 1,400 nos viewports 390, 412, 430 e 768 CSS px. As imagens reais foram
injetadas somente em memória durante o teste; não foram copiadas para
`public/`, logs ou capturas versionadas.

## O que já sustenta uma sensação mobile native-like

| Pilar                       | Implementação atual                                                                        | Situação                                          |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Primeira ação compreensível | Instrução única no canvas: tocar a foto ou arrastar a moldura.                             | Implementado.                                     |
| Alvos confortáveis          | Moldura e estrelas: no mínimo 72 CSS px. Som e pausa: 48 CSS px.                           | Implementado; revisar em aparelhos físicos.       |
| Arraste sem exclusão        | Toque–toque conclui a mesma ação sem exigir destreza de arraste.                           | Implementado e coberto em E2E.                    |
| Proporção da lembrança      | `contain`, duas molduras hero, aro interno escuro e sem VFX sobre a imagem.                | Implementado; falta ampliar o corpus de extremos. |
| Ritmo e movimento           | Cadeias de tween curtas, finitas e canceláveis; sem loops decorativos.                     | Implementado.                                     |
| Perfil leve                 | `saveData` escolhe LOW; LOW e movimento reduzido não criam emissor, fio animado ou burst.  | Implementado.                                     |
| Interrupção                 | Pausa manual, `hidden`, `blur`, `visible`, `focus`, resize e saída têm caminhos próprios.  | Implementado e parcialmente exercitado.           |
| Ciclo de canvas             | Uma entrada cria uma instância; saída destrói o jogo, listeners e texturas da rodada.      | Implementado e coberto no cenário E2E.            |
| Privacidade                 | O canvas recebe apenas derivadas `game` autorizadas; assets fixos têm hash e proveniência. | Implementado.                                     |

## Arquivos principais e o que fazem

Os endereços abaixo são absolutos no workspace atual. Os arquivos de foto da
sessão deliberadamente não aparecem aqui: eles não pertencem ao projeto nem
devem ser publicados como dependência do jogo.

### Domínio e contrato do jogo

| Arquivo absoluto                                                                                                    | Responsabilidade                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\domain\GuirlandaDasLembrancasState.ts` | Máquina de estados pura: cria rodada, seleciona foto, coloca em gancho, rejeita ação inválida e decide a conclusão. |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\definition.ts`                         | Metadados que o Hub e o registro usam: id, textos, mínimo/recomendado de fotos e orientação mista.                  |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\tuning.ts`                             | Valores de game feel: tamanhos mínimos, limiar de arraste, durações, dica e quantidade máxima de VFX.               |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\index.ts`                              | Exporta a definição, o domínio, tuning e módulo Phaser do pacote.                                                   |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\SPEC.md`                                   | Promessa, regras, privacidade, estados, critérios de aceite e lifecycle do produto.                                 |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\EXPERIENCE.md`                             | Direção de experiência: fantasia, prioridade da foto, movimentos, áudio e limites de decoração.                     |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\EXPERIENCE_REQUIREMENTS.json`              | Contrato estruturado de verbos, estados, duração de rodada, vitória e papéis de assets.                             |

### Runtime Phaser

| Arquivo absoluto                                                                                                                 | Responsabilidade                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\createGuirlandaDasLembrancasGame.ts` | Núcleo visual: carrega assets/fotos, constrói o canvas, calcula layout, cria zonas de toque/arraste, molduras, HUD, viewer, pausa, animações, lifecycle e destruição. |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\visualAssets.ts`                     | Fonte única dos texture keys e URLs públicos do fundo, guirlanda, duas molduras e caixa.                                                                              |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\src\runtime\phaser\audioAssets.ts`                      | Catálogo de SFX e `GarlandAudioDirector`: desbloqueio após gesto, mudo, debounce, volumes, pausa e destruição.                                                        |
| `C:\Users\Anderson\Desktop\games\packages\platform\src\game-runtime\PhotoSurface.ts`                                             | Calcula a área proporcional de foto para `contain` ou `cover`; a Guirlanda usa somente `contain`.                                                                     |
| `C:\Users\Anderson\Desktop\games\packages\platform\src\game-runtime\SceneScope.ts`                                               | Registra recursos de Scene para encerrar listeners, tweens, texturas e objetos de forma determinística.                                                               |
| `C:\Users\Anderson\Desktop\games\packages\platform\src\contracts\index.ts`                                                       | Tipos compartilhados de foto, sessão, qualidade, bridge, `GameContext` e `GameController`.                                                                            |

### Shell React, rota e lifecycle

| Arquivo absoluto                                                        | Responsabilidade                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `C:\Users\Anderson\Desktop\games\apps\play\src\app\AppRouter.tsx`       | Resolve rota/sessão, escolhe a foto, compõe o `GameContext`, inicia e encerra a tentativa de jogo.                       |
| `C:\Users\Anderson\Desktop\games\apps\play\src\phaser\gameRegistry.ts`  | Registra a Guirlanda e faz o carregamento preguiçoso do módulo, sem colocar Phaser no domínio.                           |
| `C:\Users\Anderson\Desktop\games\apps\play\src\phaser\PhaserHost.tsx`   | Único dono da montagem Phaser no React; cria run/seed, observa visibilidade, publica bridge e garante saída segura.      |
| `C:\Users\Anderson\Desktop\games\apps\play\src\phaser\createGame.ts`    | Carrega Phaser + módulo, permite prefetch e chama `create` com o contexto tipado.                                        |
| `C:\Users\Anderson\Desktop\games\apps\play\src\screens\GameScreen.tsx`  | Moldura React acessível da rota, status de ciclo e ação de sair; para a Guirlanda reduz o chrome para preservar imersão. |
| `C:\Users\Anderson\Desktop\games\apps\play\src\app\GameQuality.ts`      | Traduz `navigator.connection.saveData` para NORMAL ou LOW de forma conservadora.                                         |
| `C:\Users\Anderson\Desktop\games\apps\play\src\app\LocalTestSession.ts` | Contrato de teste local: só aceita ids opacos, dimensões/orientação e URLs de derivadas; não expõe caminho ou original.  |
| `C:\Users\Anderson\Desktop\games\apps\play\src\styles.css`              | Estilos do shell, host e comportamento responsivo que envolve o canvas.                                                  |

### Assets, testes e evidência

| Arquivo absoluto                                                                                                                 | Responsabilidade                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\assets\manifest.json`                                   | Orçamento, hash, dimensões, delivery group e proveniência rastreável de cada asset browser-deliverable. |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\ASSET_PROVENANCE.md`                                    | Origem, preparação, licença e limite de uso de cada arte e som.                                         |
| `C:\Users\Anderson\Desktop\games\apps\play\public\assets\guirlanda-das-lembrancas\frames\moldura-retrato-madeira-latao-v1.webp`  | Aro hero vertical com abertura alpha física.                                                            |
| `C:\Users\Anderson\Desktop\games\apps\play\public\assets\guirlanda-das-lembrancas\frames\moldura-paisagem-madeira-latao-v1.webp` | Aro hero horizontal para fotos paisagem.                                                                |
| `C:\Users\Anderson\Desktop\games\apps\play\public\assets\guirlanda-das-lembrancas\sprites\guirlanda-pinho-v3.webp`               | Guirlanda de pinho, veludo e luzes; o centro fica livre para a foto.                                    |
| `C:\Users\Anderson\Desktop\games\apps\play\public\assets\guirlanda-das-lembrancas\backgrounds\cabana-nevada-noturna-v1.webp`     | Fundo de noite azul com área calma atrás da guirlanda.                                                  |
| `C:\Users\Anderson\Desktop\games\apps\play\public\assets\guirlanda-das-lembrancas\props\caixa-de-lembrancas-nogueira-v1.webp`    | Âncora cenográfica inferior, sem foto ou dados de sessão.                                               |
| `C:\Users\Anderson\Desktop\games\tests\e2e\guirlanda-das-lembrancas.spec.ts`                                                     | Fluxos mobile reais: toque–toque, arraste, viewer, pausa, retorno, saída, LOW e movimento reduzido.     |
| `C:\Users\Anderson\Desktop\games\packages\games\guirlanda-das-lembrancas\tests\GuirlandaDasLembrancasState.test.ts`              | Prova unitária das transições puras e das rejeições sem punição.                                        |
| `C:\Users\Anderson\Desktop\games\docs\quality\GUIRLANDA_DAS_LEMBRANCAS_NATIVE_LIKE_REVIEW_2026-09-04.md`                         | Evidência da revisão visual, da calibração da abertura da moldura e dos gates restantes.                |

## Pontos que ainda precisam evoluir

As prioridades abaixo são deliberadamente separadas de preferências estéticas.
Elas são o caminho para transformar um slice profissional em produto pronto
para distribuição externa.

### P0 — bloquear liberação até obter evidência

| Tema                        | Problema atual                                                                                                                                                                                                                                   | Próxima entrega verificável                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate integral e CI          | `pnpm validate` não está limpo no workspace: há expectativa divergente de E2E da Trinca de Natal e uma ocorrência de timeout na criação de workers Vitest. Não é um defeito observado da Guirlanda, mas impede declarar o repositório liberável. | Corrigir/confirmar o teste da Trinca, estabilizar a configuração de workers em CI e anexar uma execução integral verde.                                                                               |
| Android e iOS reais         | A matriz atual é em navegador automatizado; não há medição de toque, fluidez, memória, bateria e retorno real em Android de referência ou Safari iOS.                                                                                            | Executar três rodadas NORMAL, LOW e movimento reduzido por aparelho, com foto derivada segura; registrar modelo/OS/navegador, p50/p95/p99 quando o laboratório estiver conectado e achados agregados. |
| Corpus de fotos de produção | A revisão real cobriu retrato e paisagem, mas não prova quadrado, panorama, vertical muito estreita, luz extrema ou grande quantidade de pixels.                                                                                                 | Criar corpus privado autorizado com essas formas; testar 390/412/430/768 e registrar somente proporção, resultado e severidade.                                                                       |

### P1 — necessário para acabamento de engenharia

| Tema                     | Achado                                                                                                                                                                                                    | Melhoria recomendada                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolamento de áudio      | `GarlandAudioDirector.pause()` chama `pauseAll()`/`resumeAll()` do gerenciador Phaser. Em uma composição futura com mais de uma fonte compartilhada, isso pode pausar áudio que não pertence à Guirlanda. | Guardar as instâncias de som criadas pelo jogo e pausá-las/pará-las por key/instância; nunca controlar globalmente o `SoundManager`. Cobrir com teste de isolamento. |
| Geometria da abertura    | Os percentuais da janela física estão na Scene. Funcionam para os dois PNGs atuais, mas uma nova exportação de moldura pode deslocar a abertura sem que o manifesto alerte.                               | Declarar a abertura normalizada de cada moldura no catálogo visual/manifesto e incluir teste que a confronta com a transparência alpha do asset.                     |
| Falha parcial de foto    | A falha de preload hoje retorna mensagem genérica para a guirlanda inteira. Uma conexão instável deveria preservar a sessão e oferecer saída/repetição compreensível.                                     | Adicionar erro por foto derivada, retry explícito e fallback visual sem expor URL, caminho ou nome.                                                                  |
| Regressão visual         | E2E captura estados, mas não compara imagem a uma referência com tolerância controlada.                                                                                                                   | Manter baselines sintéticos/sem PII para capa, primeira seleção, retrato, paisagem, vitória, LOW e reduzido; imagens reais permanecem em evidência privada.          |
| Acessibilidade de canvas | Há alvo físico grande e textos no canvas, porém TalkBack/VoiceOver e navegação por foco não têm alternativa semântica completa.                                                                           | Expor uma camada DOM acessível que espelhe “foto atual”, “estrelas livres”, som, pausa e voltar, sem duplicar visualmente o HUD. Validar com leitor de tela.         |
| Qualidade adaptativa     | LOW depende hoje apenas de `saveData`; não usa observação real de frame durante a rodada.                                                                                                                 | Depois da medição física, conectar um orçamento de frames para reduzir VFX de modo gradual e reversível, nunca a foto ou a confirmação.                              |

### P2 — evoluções de produto após os gates

| Oportunidade                     | Critério para decidir                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação/PWA ou wrapper nativo | Só iniciar se a jornada exigir ícone, offline, compartilhamento nativo ou distribuição por loja. Não é requisito para o sentimento native-like atual.                              |
| Haptics de produção              | Confirmar suporte e conforto em aparelhos físicos. Haptic deve continuar opcional e nunca ser a única confirmação.                                                                 |
| Métricas privadas de jornada     | Medir de forma agregada etapas como iniciar, selecionar, encaixar e concluir; sem foto, URL, nome, token ou biometria. Só adicionar com decisão de privacidade e finalidade clara. |
| Expansão sonora                  | Criar variações licenciadas somente se a pesquisa com famílias apontar repetição perceptível. Primeiro validar mix, volume e pausa nos aparelhos.                                  |

## Plano recomendado de maturidade

1. **Estabilizar a base:** limpar o `pnpm validate` integral e substituir a
   pausa global de áudio por controle de fontes próprias.
2. **Fechar riscos de foto:** declarar as aberturas no catálogo, criar corpus
   privado de extremos e implantar recuperação por derivada que falhou.
3. **Provar o celular real:** aplicar o protocolo de Android ao roteiro da
   Guirlanda e incluir Safari iOS; repetir NORMAL, LOW e reduzido.
4. **Automatizar o acabamento:** adicionar regressão visual segura e o espelho
   acessível de canvas.
5. **Só então decidir escopo de app instalado:** PWA/wrapper, haptics e
   telemetria são decisões de produto, não correções emergenciais.

## Como validar a versão atual

```powershell
Set-Location C:\Users\Anderson\Desktop\games
pnpm check:fast
pnpm asset:validate
pnpm exec playwright test tests/e2e/guirlanda-das-lembrancas.spec.ts
pnpm build
```

O gate final do repositório é `pnpm validate`. Ele só deve ser usado como
evidência de liberação quando terminar verde, após a correção dos problemas
globais indicados em P0.

Para revisão visual, testar em 390, 412, 430 e 768 CSS px: capa, primeira
ação, toque–toque, arraste, slot ocupado, viewer, pausa, retorno, saída,
NORMAL, LOW e movimento reduzido. Para as fotos reais, usar apenas o fluxo
privado/local autorizado e não salvar essas imagens em `public`, snapshots
versionados ou relatórios compartilháveis.

## Definição objetiva de “profissional e pronto para liberar”

O jogo estará pronto para promoção externa quando todos os pontos abaixo forem
verdadeiros ao mesmo tempo:

- `pnpm validate` estiver verde em ambiente reproduzível;
- a matriz privada de fotos incluir retrato, paisagem, quadrado e extremos,
  sem corte, vazamento da moldura ou foto encoberta;
- Android de referência e Safari iOS tiverem três passagens por perfil sem P1;
- não houver canvas, som, tween, emitter ou listener sobrevivente após sair;
- todos os assets browser-deliverable continuarem manifestados, orçados,
  licenciados e sem dado de sessão;
- o espelho de acessibilidade ou fluxo equivalente estiver aprovado para uso
  sem dependência exclusiva de arraste/visão;
- a família reconhecer a foto, entender a primeira ação e concluir uma rodada
  sem ajuda externa em uma observação presencial curta e eticamente aprovada.
