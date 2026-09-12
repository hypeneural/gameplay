# CG-MOBILE-FIRST-CREATIVE-VELOCITY — plano de implementação

**Estado:** proposto.

**Decisão que executa:** jogos novos começam por uma fatia criativa jogável em
telefone e passam pela matriz completa somente depois de a sensação, a lógica e
o acabamento terem direção aprovada. O playbook correspondente está em
[`MOBILE_FIRST_CREATIVE_PLAYBOOK.md`](../experience/christmas/MOBILE_FIRST_CREATIVE_PLAYBOOK.md).

**Não seleciona um jogo novo:** respeita a regra do repositório de não iniciar
Puzzle, Memory ou Trinca sem fase explicitamente escolhida. O primeiro
adotante será indicado pelo proprietário; o Expresso das Fotos é candidato
técnico por já possuir uma direção 2.5D e um slice em andamento, mas não é
selecionado por este documento.

## Diagnóstico que a mudança resolve

O repositório já protege bem domínio, fotos, assets e lifecycle. Também já
possui Bibles, receitas, laboratórios e validação em 390/412/430/768 px.
Entretanto, sua rotina padrão incentiva três comportamentos lentos para um jogo
novo:

1. `pnpm check:fast` reúne tipagem, lint e toda a suíte unitária; `pnpm
validate` acrescenta build e a matriz Playwright. Sem níveis de intenção,
   eles podem entrar antes de existir uma cena que valha otimizar.
2. A revisão visual local pede a matriz completa para toda alteração visual.
   Isso é excelente para liberação, mas dilui o olhar quando a decisão ainda é
   “a criança entende o primeiro gesto em 390 px?”.
3. As direções mais recentes descrevem 2.5D, movimento e áudio com qualidade,
   mas o pacote visual ainda é montado caso a caso. Por exemplo, o manifesto
   atual do Expresso registra um cenário e uma locomotiva visuais, enquanto a
   maior parte das entregas é áudio. Falta uma unidade de produção que leve
   cenário, objeto hero, material de jogo e celebração juntos até a cena.

O objetivo não é remover testes nem simplificar a qualidade. É concentrar a
energia da primeira semana na brincadeira real e executar cada prova quando
ela fornece informação nova.

## Resultado observável

Ao fim do plano, um jogo selecionado consegue passar de briefing a uma primeira
sessão móvel em quatro marcos claros:

```text
brief aprovado → ciclo jogável em 390 px → sensação aprovada → release validado
```

- A primeira revisão mostra entrada, gesto, consequência e vitória no jogo
  real; não depende de uma tela de componentes ou de asserts de DOM.
- Um pacote de cena natalino é aprovado como família visual antes de crescer o
  catálogo de assets.
- O loop criativo usa somente evidência focal de telefone. A matriz de quatro
  viewports e o Android físico continuam portas de integração/liberação.
- Cada regra de domínio, asset de runtime e recurso temporário ainda tem a
  prova técnica exigida pelo seu risco.

## Limites que não mudam

- `domain/` continua puro e determinístico; ele nunca recebe Phaser, browser,
  foto, tempo real ou aleatoriedade global.
- Fotos originais, identificadores e caminhos continuam fora do browser e das
  evidências versionadas.
- Todo gesto de arraste não essencial continua com alternativa toque–toque.
- Um Phaser por entrada, ponte tipada, cleanup de sons/tweens/emissores e
  `game.destroy(true)` continuam obrigatórios.
- Asset final só entra no navegador depois de proveniência, manifesto e
  orçamento conhecidos. Placeholder não é aprovação de arte.
- LOW e movimento reduzido preservam leitura, ação, confirmação e vitória.
- Não criar BaseScene, biblioteca genérica de componentes de jogo ou renderer
  3D como atalho para reutilização.

## Fases

### CV0 — Formalizar a via criativa e os níveis de validação

**Objetivo:** tornar a nova ordem inequívoca para pessoas e Codex antes de
alterar ferramentas ou jogos.

- [x] Criar o playbook mobile-first e este plano.
- [ ] Atualizar `AGENTS.md` e `apps/play/AGENTS.md`: pedir primeiro a Creative
      Slice Card e o slice em 390 px; `check:fast` fecha uma mudança lógica ou de
      integração, e `validate` encerra marco de release, não microajuste visual.
- [ ] Atualizar `diretor-jogo-natal`: exigir Creative Slice Card e distinguir
      estado de slice de entrega integrada. Manter o teste puro antes de ampliar
      uma regra já estabilizada.
- [ ] Atualizar `revisao-visual-mobile` com dois modos explícitos:
      **focal** (390 px, 412 px só se necessário) e **release** (matriz atual,
      perfis, lifecycle). A skill não deve revisar layout de tablet no primeiro
      ajuste de uma cena de telefone.
- [ ] Atualizar `CODEX_CAPABILITY_STACK.md`, `QUALITY_GATES.md` e o índice de
      documentação com os novos níveis e comandos.

**Aceite:** uma pessoa que inicia jogo novo encontra uma ordem única e sabe
quando precisa de observação focal, smoke técnico ou matriz de release.

### CV1 — Criar um fast lane técnico sem reduzir a porta de release

**Objetivo:** evitar que o Codex rode toda a matriz para descobrir se uma luz,
um timing ou o primeiro gesto ficou melhor.

- [ ] Classificar os cenários E2E em `@creative-core`, `@integration` e
      `@release-regression`. O núcleo criativo cobre abrir, primeira ação,
      consequência, vitória e saída; não repete journeys longas por viewport.
- [ ] Criar comandos explícitos, documentados e reproduzíveis:
      `test:e2e:creative` em iPhone 390, `test:e2e:integration` em 390/412 e
      `test:e2e:release` com a matriz atual. Não trocar silenciosamente o sentido
      de `pnpm validate`.
- [ ] Permitir que o jogo selecionado tenha um smoke de runtime local por
      estado criativo, usando fixture segura e GameBridge, sem dar React acesso à
      Scene.
- [ ] Documentar quando usar `pnpm check:fast`: uma alteração de domínio,
      lifecycle, asset integrado ou fronteira de pacote. Para um ajuste visual
      puramente local, rodar a revisão focal e o menor check afetado, consolidando
      o fast gate antes de compartilhar a fatia.
- [ ] Manter `pnpm validate` como requisito de finalização e para mudanças que
      alterem shell, resize, loader, rota, qualidade ou recursos compartilhados.

**Aceite:** o tempo para observar uma ideia em telefone não depende da matriz
completa, e nenhum comando de release perde cobertura existente.

### CV2 — Transformar a direção em um pacote de cena produzível

**Objetivo:** substituir “adicionar mais neve/assets” por uma unidade pequena,
premium e repetível de arte, VFX e som.

- [ ] Definir um `SCENE_PACKET` humano, derivado do `EXPERIENCE.md`, com:
      referência A1, composição 390, L0–L3, objeto hero, materiais L2, quatro
      batidas de feedback, cinco papéis de áudio, zonas protegidas e variantes
      NORMAL/LOW/reduzido.
- [ ] Criar três famílias de cena, não um único tema genérico: por exemplo
      diorama de estação, oficina/mural e álbum de memórias. Cada uma reutiliza
      paleta, luz e material, mas tem objeto hero próprio.
- [ ] Para cada família, preparar somente os candidatos iniciais: prancha de
      fundo, objeto hero recortado, superfície de jogo/moldura, um prop de canto e
      uma celebração finita. Revisar no Asset Lab antes de gerar variações.
- [ ] Estender receitas existentes para registrar a relação entre asset,
      impulso visual, som, limite ativo e cleanup. Não criar partículas contínuas
      apenas para dar movimento.
- [ ] Registrar receita de geração/preparo, licença, alpha, dimensões e custo
      no fluxo atual de Asset Factory antes da integração de cada arquivo final.

**Aceite:** um novo jogo pode escolher uma família de cena e chegar a uma tela
coesa sem copiar Scene, usar arte sem proveniência ou inventar uma pilha de
efeitos em runtime.

### CV3 — Evoluir os laboratórios para uma banca de jogo real

**Objetivo:** acelerar a decisão visual sem transformar o laboratório em outro
produto ou expor dados de sessão.

- [ ] Trocar o `ThemeLab` estático por uma bancada de composição com material,
      luz, L0–L3 e estados de toque reais da família selecionada.
- [ ] Generalizar o Asset Lab: catálogo seguro por jogo/família, prévia em 390
      por padrão, comparador NORMAL/LOW/reduzido e inspeção de objeto hero sobre
      foto sintética segura.
- [ ] Criar um `Creative Slice Lab` que monte o runtime real com fixture
      pública e permita abrir entrada, primeiro gesto, acerto e vitória. Ele não
      aceita token, foto de cliente, path local ou estado de produção.
- [ ] Tornar as cinco batidas observáveis no lab por comandos tipados de
      desenvolvimento, sem expor Scene a React ou falsificar a regra de domínio.
- [ ] A bancada salva apenas decisão textual privada/efêmera; aprovação de
      asset e evidência durável continuam no manifesto e no plano.

**Aceite:** direção consegue comparar uma escolha no telefone real em minutos,
e a comparação continua usando o renderer e as proporções que serão entregues.

### CV4 — Adotar o fluxo em um jogo selecionado

**Objetivo:** provar o processo completo antes de o transformar em padrão de
gerador.

- [ ] Proprietário escolhe o jogo adotante e aprova sua Creative Slice Card.
- [ ] Implementar o ciclo de cinco batidas em 390 px com lógica real e
      placeholders seguros somente onde o asset ainda está em preparo.
- [ ] Fazer a revisão focal; corrigir compreensão, tamanho de gesto,
      protagonismo da foto e objeto hero antes de abrir tarefas de tablet,
      dificuldade extra ou catálogo grande.
- [ ] Estabilizar e testar a regra pura, converter assets aprovados e executar
      o smoke de integração de início, vitória e saída.
- [ ] Só então aplicar o pacote a 412/430, paisagem se suportada, LOW,
      movimento reduzido e a matriz de release.

**Aceite:** há evidência focal e de release separadas, e a tela final tem
profundidade, resposta e som percebidos sem sacrificar a foto ou a performance.

### CV5 — Tornar repetível sem acoplar jogos

**Objetivo:** levar apenas as abstrações que dois consumidores reais provaram
necessárias.

- [ ] Comparar o jogo adotante com o segundo consumidor para identificar quais
      tokens, receita, ferramenta de asset ou infraestrutura de lab se repetem.
- [ ] Mover somente esses contratos para `theme`, `platform` ou `tools`;
      manter direção, layout e runtime no pacote de cada jogo.
- [ ] Atualizar `game:new` para gerar a Creative Slice Card e o checklist de
      pacote de cena apenas após o formato ser confirmado pelos dois jogos.
- [ ] Registrar lições duráveis sobre throughput, custo de arte, gesto e
      Android físico em `docs/lessons.md`.

**Aceite:** o segundo jogo inicia mais rápido, mas não parece uma skin do
primeiro e não depende de uma Scene compartilhada.

## Portas de decisão do proprietário

| Porta | Decisão necessária                                         | Quando                                         |
| ----- | ---------------------------------------------------------- | ---------------------------------------------- |
| D1    | Escolher o primeiro jogo adotante.                         | Antes de CV4.                                  |
| D2    | Aprovar a referência visual e o objeto hero da família.    | Antes de gerar/adquirir arte final em CV2/CV4. |
| D3    | Aprovar o pacote mínimo de assets e seu orçamento.         | Antes de publicar qualquer asset no runtime.   |
| D4    | Indicar o Android físico de referência.                    | Antes da liberação CV4.                        |
| D5    | Autorizar generalização no gerador após dois consumidores. | Em CV5.                                        |

## Métricas de sucesso

Não usar uma contagem de testes como medida de velocidade. Acompanhar por jogo:

- tempo entre Creative Slice Card aprovada e primeira sessão de 390 px;
- número de revisões focais até a criança/família entender a primeira ação;
- número de assets rejeitados antes da integração, não depois de runtime;
- tempo do comando criativo versus da matriz de release;
- P1/P2 visuais encontrados antes de CV4 versus na validação final;
- resultado do Android de referência depois que a experiência já está estável.

## Riscos e respostas

| Risco                                    | Resposta                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| “Rápido” virar código sem regra testada. | A via focal reduz matriz, não elimina teste puro quando a regra se estabiliza nem o smoke de saída.    |
| Arte rica virar peso ou poluição.        | Pacote de cena mínimo, Asset Lab, manifesto e perfis de qualidade antes da integração final.           |
| O 390 px esconder uma regressão grande.  | 412 entra no primeiro marco de integração; 430/768 e paisagem continuam na liberação.                  |
| 2.5D evoluir para renderer 3D caro.      | Arte preparada e profundidade de planos são padrão; 3D em tempo real requer proposta e Android medido. |
| Laboratórios virarem uma UI paralela.    | O Creative Slice Lab monta o runtime real e não possui regra própria.                                  |

## Definição de pronto do plano

O plano estará concluído quando CV0–CV3 estiverem operacionalizados, um jogo
tiver atravessado CV4 até `pnpm validate` e Android de referência, e um segundo
jogo tiver confirmado ou recusado conscientemente as abstrações de CV5. Antes
disso, este documento é a referência de mudança, não a alegação de que a
fábrica já opera nesse novo ritmo.
