# CG-RUDOLPH-CHUVA-DE-LEMBRANCAS — criação e execução

**Data:** 2026-09-07.  
**Estado:** R1–R6 integrados em desenvolvimento; R7/R8 em verificação, homologação física pendente.  
**Produto:** [Rudolph — Chuva de Lembranças](../product/RUDOLPH_CHUVA_DE_LEMBRANCAS.md).  
**Owner:** `packages/games/rena-das-lembrancas`; composição em `apps/play`.

## 1. Resultado contratado e leitura inicial

Entregar um jogo de celular em que fotografias molduradas de tamanhos variados
caem e Rudolph as salva conforme a criança toca ou desliza. Cada resgate
celebra a fotografia e alimenta o Álbum de Natal. A escolha confirmada pelo
proprietário é encerrar ao completar o álbum, permitindo fotos repetidas
durante a rodada. Repetições carregam magia; páginas representam fotos únicas.

Este plano cobre criação de arte e áudio, engenharia, integração, acabamento e
homologação. Não confundir “domínio pronto”, “protótipo jogável”, “arte pronta”
e “jogo homologado”. Sprites profissionais, animações natalinas, som e álbum
interativo são partes da entrega completa.

Antes de executar uma fase, ler `AGENTS.md`, este plano, a especificação acima,
`docs/index.md`, a direção de mundo interativo e o contrato de assets. O projeto
já tem alterações locais extensas e planos ativos de Hub e Magic Photo;
preservar essas alterações e conferir o estado real antes de cada integração.

## 2. Auditoria da referência e da fábrica atual

### 2.1 Referência inspecionada no disco

Origem fornecida pelo proprietário:
`C:\Users\Anderson\Desktop\Repositorio\secret-rudolph-game-main`.
Arquivos conferidos: `README.md`, `package.json`, `LICENSE`,
`src/game/scenes/RudolphGame.js`, `Game.ts` e `Preloader.ts`.

| Encontrado na cópia local                                       | Decisão para o novo jogo                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Phaser `^3.90.0`, Next 15.3.1, Firebase e template Next         | Reimplementar na fábrica React/Vite/Phaser 4.2.1 existente             |
| Campo de referência 365 × 500 e rodada de 45 s                  | Layout adaptativo e conclusão pelo álbum                               |
| Input por metades, setas, velocidade horizontal 400             | Preservar a ideia de guiar; implementar destino por toque/arraste      |
| Objetos bons a cada 800 ms e ruins a cada 1000 ms               | Planejar fotos maiores, menos simultaneidade e trajetórias alcançáveis |
| `Math.random`, Arcade Physics e score +10/−5                    | Domínio puro com seed, colisão geométrica e contagens fotográficas     |
| Spritesheet 64 × 92; frames 0–1 esquerda, 2 parado, 3–4 direita | Referência de intenção; produzir novo personagem com continuidade      |
| `preFX.addGlow`, estado da Scene emitido no EventBus            | Não portar essas APIs/padrões; efeitos finitos e bridge tipado         |
| `LICENSE` MIT com aviso “Copyright (c) 2025 Phaser”             | Registrar o fato; não tratar como inventário de origem de cada desenho |

Não copiar a aplicação nem executar serviços do donor. A implementação proposta
usa suas ideias de movimento/coleta, sem necessidade de copiar trechos. Se uma
fase futura incorporar código licenciado, preservar o aviso aplicável. Assets
do donor permanecem referências; cada candidato exige origem própria antes de
integrar. Este plano não declara resolvida a procedência dos sprites recebidos.

### 2.2 Recursos reais disponíveis e lacunas

| Recurso existente                                             | Uso planejado / trabalho necessário                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GameDefinition`, `GameModule`, `GameContext`, `runSeed`      | Novo módulo isolado; `GameId` aberto dispensa editar união central              |
| `Photo` com `thumb/card/game`, inclusive `square`             | Escolher variantes por tamanho efetivo, nunca originais                         |
| `PhotoSurface`, `ViewportLayout`, `TouchTarget`               | Reutilizar cálculo proporcional e unidades do viewport                          |
| `GameRunController`, `PageVisibilityController`, `SceneScope` | Lifecycle, razões de pausa e descarte de recursos                               |
| `HapticFeedback`, tokens de feedback e qualidade              | Reforço opcional e limites próprios do jogo                                     |
| `AudioManager`                                                | Preferências/volume/play/stop; ainda criar diretor com ducking e vozes próprias |
| `theme/src/phaser/CrystalControl.ts` e controles React        | Material, alvos, pressão e retorno consistentes                                 |
| `GarlandPhotoFrame.ts` e `GarlandLayout.ts`                   | Referência comprovada de moldura/abertura; não importar outro jogo              |
| Molduras madeira/latão da Guirlanda, com proveniência         | Preparar cópias autorizadas com owner/paths/hashes do novo jogo                 |
| `SessionPhotoAlbum.tsx`                                       | Galeria da sessão; não é coleção persistida de resgates                         |
| Registro estático + carregamento lazy em `apps/play`          | Integrar definição e runtime na fase R4, com prontidão explícita                |
| Manifesto v2 da fábrica                                       | Só aceita `webp`, `svg`, `m4a`, `mp3`; não pressupor suporte a atlas JSON       |
| Laboratório/protocolo de desempenho                           | Medir o novo gameplay; não aplicar resultados de outro jogo como prova          |

**Decisão sobre molduras:** adaptar uma composição pequena no owner da rena,
usando `PhotoSurface` e a mesma geometria de abertura como referência. Catalogar
cópias dos arquivos aprovados sob `/assets/rena-das-lembrancas/`. Uma extração
futura para `theme` só deve ocorrer se os dois consumidores demonstrarem uma
API comum e a migração da Guirlanda tiver regressão visual coberta. Nenhum
import de `@christmas-games/guirlanda-das-lembrancas` entra no novo game.

**Decisão sobre folhas de animação:** começar com spritesheets WebP em grade
regular e mapas de frames/pivôs em TypeScript do runtime. Fontes de trabalho
podem usar PNG ou atlas fora de `public`; publicar JSON de atlas exigiria uma
extensão explícita do auditor, com testes, que não é necessária ao plano base.

### 2.3 Base Phaser para executar

O input unificado e a separação entre objetos interativos e eventos de Scene
foram conferidos na [fonte oficial do InputPlugin 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js).
Sprites animados e sua vida útil têm referência na [fonte oficial Sprite 4.2.1](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/sprite/Sprite.js).

Também foram lidos os skills vendorizados `input-keyboard-mouse-touch` e
`sprites-and-images`, os tipos instalados para `generateFrameNumbers` e
`pointerupoutside`, e os exemplos locais oficiais `animation/create animation
from sprite sheet.js` e `input/pointer/move event.js`. Os exemplos contêm
comentários legados; confrontar cada API usada com os tipos/fonte 4.2.1, sem
copiar geração ilimitada de objetos ou aleatoriedade visual para o domínio.

Durante R4/R6, ler os skills específicos de loading, áudio, partículas,
scenes e scale antes de implementar essas áreas. Validar touch cancel real
pelo caminho do InputManager, em vez de presumir um evento Phaser pelo nome
do evento DOM.

## 3. Arquitetura e entregáveis previstos

Não criar agora um diretório vazio de pacote: `game:new` recusa target
existente. Na fase R1, gerar o pacote e incorporar o contrato de produto no
`SPEC.md`; manter este documento como plano de execução, com referências à
especificação canônica e sem duas listas divergentes de regras.

```text
packages/games/rena-das-lembrancas/
  SPEC.md
  EXPERIENCE.md
  EXPERIENCE_REQUIREMENTS.json
  ART_DIRECTION.md
  MOTION_SCORE.md
  AUDIO_SCORE.md
  ASSET_PROVENANCE.md
  assets/manifest.json
  src/definition.ts
  src/index.ts
  src/tuning.ts
  src/domain/
    RudolphRound.ts
    PhotoSelection.ts
    MemorySpawnPlanner.ts
    FallingMemory.ts
    RudolphMovement.ts
    CatchGeometry.ts
    NosePower.ts
  src/runtime/
    RudolphLayout.ts
    phaser/
      createRudolphGame.ts
      RudolphInputController.ts
      ReindeerView.ts
      MemoryFrameView.ts
      MemoryCatchDirector.ts
      SantaFlybyDirector.ts
      RudolphAlbumView.ts
      RudolphAudioDirector.ts
      RudolphSoundPolicy.ts
      visualAssets.ts
      audioAssets.ts
  tests/
tests/e2e/rena-das-lembrancas.spec.ts
apps/play/public/assets/rena-das-lembrancas/
docs/quality/RUDOLPH_CHUVA_DE_LEMBRANCAS_REVIEW.md
```

Os nomes delimitam responsabilidades; juntar arquivos minúsculos quando isso
melhorar a leitura, sem criar uma Scene monolítica. `apps/play` integra a
dependência workspace, definition, import lazy, card/capa e ações finais. Os
laboratórios e cenários de teste permanecem restritos a desenvolvimento.

### 3.1 Modelo determinístico

Separar catálogo de fotos e simulação. O domínio contém ids, contagens,
coordenadas lógicas, velocidades, instâncias, fila de reapresentação e estados
de magia. A apresentação recebe eventos de domínio internos ao jogo; esses
eventos não viram automaticamente analytics nem campos novos no bridge.

Estados da rodada: `ready → playing → finishing → completed`.
O interlúdio dourado é uma subfase de `playing`. Suspensões por pausa manual,
visibilidade e visor do álbum são razões independentes no adaptador. O domínio
só recebe passos quando pode avançar. Estados da instância:
`falling → captured` ou `falling → missed`; hero/voo/miniatura pertencem à
apresentação, não à condição de vitória.

Proposta para a simulação: passos lógicos fixos de 1/60 s, inputs normalizados
indexados por tick e interpolação visual. Limitar recuperação após um frame
longo, descartar dívida excessiva e zerar acumulador ao retomar; não simular a
aba oculta. Para reproduzir uma execução, são necessários seed, parâmetros,
sequência de inputs e decisões normalizadas de layout/suspensão, não só o seed.

Todas as posições e colisões usam a mesma geometria lógica. Usar teste de
varredura entre posição anterior e atual para não atravessar a captura em um
frame longo. Se houver contatos múltiplos, ordenar por instante de contato e
`instanceId` como desempate, consumindo cada instância uma única vez. Resize
reprojeta os mesmos objetos; nunca recria sorteio, álbum ou quedas já resolvidas.

Aleatoriedade de efeitos tem fonte separada. Trocar LOW/NORMAL ou desativar
som não altera a sequência de fotos. O perfil visual não muda dificuldade;
adaptação ao viewport e assistência por tentativas são parâmetros explícitos.

### 3.2 Fotos e carregamento

1. Resolver a lista elegível e a âncora antes do início. A queda só pode usar
   uma derivada pronta; o loader não decide contagem ou vitória.
2. Usar `card` na queda quando a resolução sustentar a abertura em pixels
   físicos. `thumb` atende o HUD se já disponível; reusar uma textura maior
   carregada pode evitar requests redundantes.
3. Usar `game` para os destaques grandes e o visor. Antecipar o próximo
   destaque, com cache limitado e cancelamento; não decodificar todos os
   `game` da sessão. A âncora pode ficar retida pela rodada; limitar as demais
   a uma janela de próximas fotos, definida na medição.
4. Uma textura por foto/variante, compartilhada por suas instâncias. Repetir a
   foto não cria request nem textura duplicada. Só liberar textura sem views
   consumidoras; liberar tudo da rodada ao destruir.
5. Falha em `game`: manter `card` disponível no destaque, registrar falha por
   código seguro e permitir retry limitado. Sem nenhuma derivada utilizável,
   apresentar erro recuperável; não inserir fotografia de outra pessoa, contar
   página vazia ou reduzir silenciosamente o objetivo depois de iniciado.

Nenhum nome de pessoa, URL, token, caminho ou id de foto aparece em analytics.
Usar lifecycle existente e poucos milestones de nome estático, por exemplo
primeiro resgate/magia/álbum. Contagens de resgate ficam na rodada. Relatórios
de QA públicos registram orientação, perfil e estado; capturas ficam privadas.

### 3.3 Pausa, conclusão e descarte

O interlúdio congela somente a simulação necessária à contemplação, sem fingir
uma pausa escolhida pela criança. O tempo total ativo da partida pode incluir
contemplação; tempos de spawn/magia contam apenas ticks jogáveis. Documentar
as duas medidas para não comparar relógios diferentes.

Pausa manual, aba oculta e álbum devem suspender input de movimento, ticks,
áudio e apresentações, com retorno coerente. Guardar a razão anterior ao abrir
um visor. Callback de uma época antiga não retoma jogo nem toca áudio.
Controles semânticos continuam acessíveis na pausa.

Uma instância Phaser por rodada. Texturas, folhas de sprite, animações com
namespace, listeners, tweens, timers, emitters, requests e sons pertencem ao
run/SceneScope. A saída aguarda destruição; `game.destroy(true)` e evento real
de destruição liberam o host para replay. Evitar `pauseAll/resumeAll/stopAll`
para gerenciar sons alheios. Testar descarte de uma view antes do shutdown.

## 4. Produção de arte e som

### 4.1 Lista de entregas artísticas

| Pacote     | Entregas                                                             | Aprovação visual necessária                               |
| ---------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| Rudolph    | Folha de modelo, poses, folhas de animação e pivôs                   | Silhueta mobile, corrida coerente, luz e contato no chão  |
| Molduras   | Retrato/paisagem, adaptação quadrada com passe-partout e aro dourado | Alpha correto, foto inteira e leitura no menor tamanho    |
| Cenário    | Céu/vila, pinheiros laterais, neve base, fonte de luz                | Centro calmo; recortes seguros em telefone baixo/paisagem |
| Papai Noel | Trenó, poses de aceno e entrega                                      | Escala secundária e consistência com Rudolph              |
| Álbum      | Capa, página, encaixes e ornamentos de borda                         | Fotos grandes, navegação clara e espaço para ações finais |
| VFX        | Floco, puff, faísca, halo do nariz, acabamento do aro                | Limites finitos; não cobrir foto; fallback LOW            |
| Capa/card  | Prévia fotográfica com Rudolph e gesto demonstrável                  | Foto reconhecível antes de iniciar, sem outro canvas      |
| SFX/música | Cues da especificação, variações e loop                              | Escuta em contexto, mix suave, emenda limpa e mudo real   |

Arte vem cedo: escolher folha de modelo e uma pose de captura junto da prova
de controle. Não esperar terminar todo o código para descobrir que o sprite
não cabe na faixa inferior. A arte final precisa estar integrada antes de
declarar o ciclo fotográfico visualmente aprovado.

### 4.2 Pipeline de produção

1. Fixar papel, tamanho de exibição, pose/pivô e limites de foto no
   `EXPERIENCE.md`, `ART_DIRECTION.md`, `MOTION_SCORE.md` e `AUDIO_SCORE.md`.
2. Inspecionar primeiro arquivos próprios aprovados. Produzir o personagem e
   as lacunas com direção coerente; referências externas exigem proveniência.
3. Se usar geração de imagem, aplicar a skill de imagem no momento da
   produção. Gerar arte sem fotos, nomes ou tokens da sessão. A folha de
   modelo orienta animação consistente; não concatenar poses incompatíveis.
4. Guardar fontes, receitas e candidatos fora de `public`. Preparar alpha,
   escala, padding, folhas WebP e áudio M4A/MP3 em ferramentas Node/VPS.
   Sharp, conversores e providers nunca entram no browser.
5. Registrar origem, licença/revisão aplicável, receita, ferramenta/versão,
   dimensões/duração, bytes, SHA-256 e vínculo de proveniência.
6. Usar somente estados do manifesto v2. Pendência de origem fica descrita na
   proveniência de candidatos; não inventar estado
   `PENDING_LICENSE_VERIFICATION` no schema. Só `PRONTO_PARA_RUNTIME` entra
   em `apps/play/public/assets/rena-das-lembrancas/`.
7. Auditar todos os arquivos do novo owner, integrar, inspecionar em movimento
   e revisar limites. Aprovação de origem não equivale a aprovação estética.

Para spritesheets, medir também memória decodificada: tamanho de textura não
é tamanho do WebP. Começar a preparação com folhas até 2048 × 2048 como
candidato técnico, divisíveis por grupos de animação; validar capacidade e
custo real do aparelho antes de fixar limites. Não gerar uma folha gigante
apenas para reduzir requests.

## 5. Etapas executáveis e gates

R1/R2 estabelecem o movimento e as regras; R3 produz a identidade; R4 integra
a primeira experiência com foto e arte reais; R5/R6 completam a brincadeira;
R7/R8 medem e homologam. A produção artística pode começar assim que R1 fixar
os tamanhos; não implica delegação automática a agentes.

| Fase                      | Entrega concreta                                                  | Dependência               | Critério para avançar                                                |
| ------------------------- | ----------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| R0 — Plano                | Produto, repetição, auditoria e critérios registrados             | Pedido atual              | Documentos navegáveis e regra de término confirmada                  |
| R1 — Fundação             | Pacote, SPEC, contratos de experiência e layout de teste          | R0                        | Generator/typecheck; 3–8 ids elegíveis; espaço útil 360/390 px       |
| R2 — Simulação            | Movimento, spawn justo, colisão, repetição, miss, magia e término | R1                        | Testes de propriedades/invariantes com seeds e contatos múltiplos    |
| R3 — Arte e áudio         | Modelo de Rudolph, spritesheets, molduras, cenário, cues e música | Dimensões de R1           | Proveniência, auditoria, continuidade da animação e prévia do mix    |
| R4 — Ciclo jogável        | Input real, fotos, captura com destaque, HUD e entrada no shell   | R2 + arte essencial de R3 | Completar álbum em celular emulado; foto nítida; um canvas           |
| R5 — Natal interativo     | Nariz, atração, Noel, dourada, luzes e neve tocáveis              | R4 + assets de R3         | Respostas finitas, gesto sem conflito e nenhuma foto perdida na fila |
| R6 — Álbum e áudio final  | Visor, replay, ações finais, mix, ducking, LOW/reduzido           | R5                        | Todas as fotos navegáveis; pausa/mudo/replay coerentes               |
| R7 — Mobile e performance | Revisão por estado, aparelho físico e budgets medidos             | R6                        | Evidências comparáveis, conforto visual e escuta real                |
| R8 — Homologação          | Regressões, gates, relatório e decisão de prontidão               | R7                        | Sem falhas impeditivas; assets completos e limitações declaradas     |

### R1 — Fundação e primeiro ensaio de controle

Executar `pnpm game:new rena-das-lembrancas --dry-run`, revisar a saída e então
gerar com `pnpm game:new rena-das-lembrancas`. Ajustar definição e requisitos de
experiência, incluindo interpretação de movimento reduzido. Um ensaio local
de movimento pode usar placeholder explícito, sem apresentar isso como arte
final e sem inserir o jogo incompleto no catálogo publicado.

Entregar prova de toque simples/arraste, medidas do palco e transformação de
coordenadas. Não implementar jogos vizinhos nem mudar a dificuldade deles.

### R2 — Domínio antes de runtime

Escrever testes primeiro para seleção, instância de queda, prioridade de fotos
faltantes, requeue, contato varrido, limites laterais, carga/consumo da magia
e conclusão. Acrescentar simulações com muitos seeds para os invariantes, sem
depender de expectativa sobre sequência arbitrária de números aleatórios.

Não colocar Phaser, React, DOM/fetch/localStorage, `Math.random`, `Date.now` ou
Photo em `domain/`. O runtime nunca decide sozinho que uma página foi salva.

### R3/R4 — Primeira fatia visual completa

Integrar primeiro Rudolph correndo, moldura real e derivadas autorizadas, com
três tamanhos. Mostrar captura, destaque e chegada à página. Conferir pose,
hitbox e oclusão com dedo; ajustar a arte ou layout conforme o problema real.

Adicionar workspace dependency e registro lazy em `apps/play` após a fatia
jogável estar coerente. Card/capa precisam de prévia própria. Conferir a
política vigente de readiness do Hub antes de expor; se ainda não houver
separação suficiente, manter o registro de desenvolvimento explícito até R8.

### R5/R6 — Acabamento integrado

Implementar uma única política de prioridade para destaque comum, dourada e
final; uma única política de voz para som. Completar inventário de interações,
visor do álbum, preferências e ações finais. A animação de captura se sobrepõe
à corrida sem impedir input. Repetição deve ser reconhecida como lembrança
reencontrada, sem som de erro ou bloqueio.

### R7/R8 — Evidência e prontidão

Aplicar `revisao-visual-mobile` em canvas real e gravar sequências curtas para
queda, mudança de direção, captura, magia e final. Verificar LOW e movimento
reduzido por evidências próprias. Contagem de requests não prova áudio correto;
escutar em alto-falante e fone. Chromium emulado não substitui telefone físico
nem comportamento de áudio/toque no Safari iOS.

Escolher/registrar o aparelho Android de referência e um iPhone disponível,
versões de navegador, build e perfil. Fazer três passagens por cenário físico.
Se um aparelho ou asset estiver indisponível, registrar o gate pendente e
continuar as demais verificações; não marcar homologação completa.

## 6. Matriz de aceite rastreável

| ID     | Requisito verificável                                                                     | Evidência / fase                                |
| ------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| RUD-01 | 3–8 ids únicos, âncora presente, corpus grande não carregado inteiro                      | Unitário de seleção / R2                        |
| RUD-02 | Mesmo seed, parâmetros e inputs geram mesmos resgates e álbum                             | Replay determinístico / R2                      |
| RUD-03 | Repetição soma resgate/carga, sem página duplicada                                        | Unitário com sequência A, B, A / R2             |
| RUD-04 | Faltantes recebem prioridade; miss volta dentro do prazo e última foto não fica bloqueada | Simulação de muitos seeds / R2                  |
| RUD-05 | Contato múltiplo, frame longo e callback repetido não duplicam captura                    | Geometria e teste de idempotência / R2/R4       |
| RUD-06 | Toque e arraste guiam; segundo dedo, cancelamento e HUD não desviam a rena                | Input real e E2E / R4                           |
| RUD-07 | Três tamanhos e fotos retrato/paisagem/quadradas inteiras e reconhecíveis                 | Capturas privadas do canvas / R4/R7             |
| RUD-08 | Cada resgate mostra foto; fila limitada não omite nenhuma apresentação                    | Sequência gravada com capturas próximas / R4/R5 |
| RUD-09 | Magia após três resgates, inclusive repetidos; uma ativação; duração só em jogo ativo     | Domínio + pause/visor / R2/R5                   |
| RUD-10 | Noel/dourada uma vez, sem página extra, sem corrida atrás de foto inalcançável            | Cenário semeado e revisão / R5                  |
| RUD-11 | Álbum final só conclui após todas as únicas; visor/replay funcionam                       | Unitário + rodada completa / R6                 |
| RUD-12 | Cliques cristalinos, madeira/neve/sinos distintos, sem ruído acumulado                    | Escuta e inspeção de vozes / R6/R7              |
| RUD-13 | Mudo entre Hub/jogo/replay; nenhuma reprodução após mudo ou saída                         | E2E + escuta iOS/Android / R6/R7                |
| RUD-14 | Pausa manual continua após ocultar/mostrar; abrir/fechar álbum preserva razão anterior    | Clock/estado/input/áudio / R6                   |
| RUD-15 | LOW e reduzido mantêm foto, captura, magia e álbum com decoração removida                 | Revisão própria por perfil / R7                 |
| RUD-16 | Rudolph não muda proporção, luz ou pivô entre poses; sem borda alpha defeituosa           | Folha de contato e vídeo a tamanho real / R3/R7 |
| RUD-17 | Todos os assets têm formato, origem, hash, papel e orçamento válidos                      | Auditoria por owner / R3/R8                     |
| RUD-18 | 10 ciclos de entrada/pausa/álbum/saída/replay deixam zero recurso próprio residual        | E2E + snapshots de recursos / R7                |
| RUD-19 | Resize, rotação, carregamento lento/falho e saída durante preload são recuperáveis        | E2E + aparelho físico / R7                      |
| RUD-20 | Sem dados de foto em logs/eventos públicos; nenhuma chamada a providers                   | Rede/console/contratos / R8                     |

### Cobertura visual obrigatória

Viewports: 360 × 640, 390 × 844, 412 × 915, 430 × 932, 768 × 1024;
adicionar 844 × 390 para rotação. Incluir safe areas, foto clara/escura,
retrato/paisagem/quadrada e um conjunto com 3, 8 e mais de 8 fotos disponíveis.

Estados: capa, primeiro comando, corrida em cada direção, três tamanhos de
queda, foto inédita/repetida, miss, fila de capturas, magia pronta/ativa,
Noel/dourada, visor parcial, pausa, álbum completo, replay e saída. Medir alvos
reais: 52 CSS px principais, 44 px secundários. Inspecionar o campo útil e o
conteúdo do canvas, além de seletores DOM e console.

Registrar no relatório: build, viewport/aparelho, fixture segura, estado,
achado, reprodução, severidade, owner e resultado da correção. Evidências
fotográficas e tokens permanecem em armazenamento privado excluído do Git e
do mapa. Não enviar fotos de clientes a ferramentas externas de criação.

### Desempenho e budgets

Objetivo de projeto: controle responsivo e renderização estável perto da taxa
da tela. Não declarar “60 FPS em qualquer celular”. Medir p50/p95/p99, frames
longos, bytes públicos/por rodada, requests, RGBA estimado e contagens de
objetos, tweens, emitters, texturas e sons em repouso/queda/magia/final/saída.
Separar transferência comprimida de memória decodificada e latência de toque.

Os caps da especificação são candidatos de implementação, não budgets
homologados. Fixar limites do manifesto após a primeira preparação e
calibrá-los em R7 conforme o contrato de desempenho. Se exceder: reduzir
decoração, resolução redundante, simultaneidade de texturas e vozes antes de
prejudicar a nitidez da foto. Perfis de qualidade nunca alteram regras da rodada.

## 7. Comandos e disciplina de integração

Após cada fatia coerente: `pnpm check:fast`. Na entrega de assets, validar
explicitamente o owner novo; o atalho raiz não prova sozinho que o novo
manifesto foi percorrido:

```sh
pnpm --filter @christmas-games/asset-factory run validate -- --game rena-das-lembrancas
```

Antes do handoff de implementação:

```sh
pnpm asset:validate
pnpm repo:map
pnpm validate
```

O gate final inclui arquitetura, deadcode, formato, mapa, build e Playwright.
Em workspace com alterações prévias, registrar a falha concreta e seu escopo;
não atribuir aprovação ao novo jogo se ele ainda não participou dos testes.
Formatar somente os arquivos da tarefa, sem rodar correção global no trabalho
alheio. Atualizar `docs/index.md`, mapa gerado e descobertas em `docs/lessons.md`.

Quando R8 realmente terminar, mover este plano para `docs/exec-plans/completed/`
e corrigir links. Enquanto existirem fases abertas, manter o estado explícito.

## 8. Dependências, riscos e respostas previstas

| Risco ou lacuna                                 | Resposta concreta                                                                     | Gate      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| Repetição prolonga demais a rodada              | Garantir vagas de faltantes e priorizar última foto; assistência sem autocaptura      | RUD-04    |
| Destaques escondem campo ou travam toque        | Área reservada, fila com créditos e apenas dourada isolada                            | RUD-06/08 |
| Fotos grandes perdem nitidez / memórias crescem | Variantes por DPR, cache limitado, textura compartilhada e descarte                   | RUD-07/18 |
| Sprite com poses inconsistentes                 | Modelo/rig único, pivô e vídeo de corrida; revisar antes de integrar todos os estados | RUD-16    |
| Arte de referência sem origem por item          | Criar assets próprios e catalogar; nenhum asset pendente vai a public                 | RUD-17    |
| Mudo/pausa deixam cauda ou cue atrasado         | Instâncias próprias, prioridade, epoch e descarte de fila                             | RUD-12/14 |
| Catálogo parece guardar conquistas              | Álbum explicitamente em memória da rodada; persistência exige plano de servidor       | RUD-11    |
| Nova implementação altera outros jogos          | Mudanças localizadas; nenhum import entre jogos; regressões do shell                  | R8        |
| Só há prova em emulador                         | Manter homologação física pendente até registro Android/iOS                           | R7/R8     |

Não são necessárias novas decisões do proprietário para terminar este plano.
A aquisição de uma fonte específica, o aparelho físico e a prontidão para
publicação serão registrados nas fases correspondentes, sobre entregas
concretas. Este planejamento não publica o jogo nem promete persistência de
álbum que a plataforma ainda não oferece.

## 9. Registro desta entrega de planejamento

- [x] Proposta anexada e donor local inspecionados.
- [x] Decisão sobre repetição e término confirmada pelo proprietário.
- [x] Direção mobile, sprites, áudio, interação e protagonismo fotográfico definida.
- [x] Recursos existentes e lacunas confrontados com os arquivos reais.
- [x] Fases, dependências, testes e gates de arte/aparelho documentados.
- [x] R1/R2: pacote gerado, seleção e domínio determinístico, oito testes de regras.
- [x] R3–R6: sprites articulados, cenários, som/música, ciclo fotográfico,
      magia, Noel/dourada, cenário tocável, capa e álbum integrados.
- [ ] R7: revisão dos viewports e prova física Android/iOS.
- [ ] R8: gates gerais e decisão final de prontidão. Catálogo público permanece fechado.

### Implementação de 2026-09-08

O rig usa quatro peças raster de uma única folha, com animação por pivôs,
em vez de gerar poses independentes em spritesheets. Fontes/prompt e receitas
offline estão no workspace. A revisão substituiu os aros pendentes pela borda
própria v3 de madeira/latão, comum à queda, ao destaque e ao álbum. Retrato e
paisagem têm fundos próprios, sem esticar a vila.

Rudolph recebe destino por toque/arraste, nunca teleporta. Há três tamanhos,
prioridade de faltantes, repetição, retries mais lentos, pressão de fila,
magia com tempo ativo e fim após todas as únicas e seus destaques. Noel traz
uma repetição dourada, uma vez. Visor e pausa manual preservam razões
independentes. Música e cues são locais, com vozes limitadas e descarte.

Evidência e pendências estão no
[relatório de implementação](../quality/RUDOLPH_IMPLEMENTATION_2026-09-08.md).
Somente esse relatório registra os gates executados após a implementação;
os resultados documentais abaixo são históricos.

### Verificação documental em 2026-09-07

- Links locais dos dois documentos, formatação dos arquivos desta tarefa e
  `git diff --check` dos documentos rastreados: aprovados. Índice e mapa
  atualizado incluem o novo plano e a especificação.
- Primeira execução de `pnpm check:fast`: typecheck passou; lint interrompeu
  em `prepare-magic-photo-art.mjs` por `URL` não definido. O arquivo não foi
  modificado por esta tarefa.
- Em seguida, `pnpm validate` passou por typecheck, lint, **63 arquivos de
  testes / 298 testes unitários**, e arquitetura sem violações. O erro anterior
  já não ocorria no workspace compartilhado.
- O gate geral parou no `knip`: arquivos sem uso em
  `packages/games/magic-photo/src/runtime/phaser/visualAssets.ts`,
  `packages/games/magic-photo/src/runtime/phaser/WinterEnvironment.ts` e
  `tools/asset-factory/scripts/prepare-magic-photo-art.mjs`, fora dos arquivos
  desta entrega. Build e E2E não foram alcançados por esse comando.

Portanto, a documentação está verificada e a validação geral do workspace
permanece incompleta. Nenhum teste executado antes de R1 constitui evidência
de gameplay, sprites ou áudio de Rudolph implementados.
