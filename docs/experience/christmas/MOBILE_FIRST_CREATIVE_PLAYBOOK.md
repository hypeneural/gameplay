# Playbook de produção criativa mobile-first

**Estado:** proposta de operação. A ativação das mudanças de processo está
planejada em `CG-MOBILE-FIRST-CREATIVE-VELOCITY`.

## Decisão de produto

Para um jogo natalino novo, a primeira entrega valiosa deixa de ser uma matriz
de testes, uma tela técnica ou um catálogo de imports. É uma **fatia criativa
jogável** em telefone: a criança vê a foto, entende o gesto e sente uma
consequência bonita em poucos segundos.

Isso não retira as proteções do repositório. Privacidade da foto, domínio puro,
alternativa ao arraste, limpeza do Phaser e proveniência de assets continuam
obrigatórios. A mudança é de ordem e de intensidade: validar o mínimo que
mantém o slice seguro durante sua criação; só expandir testes, tamanhos e
medidas quando já existe uma brincadeira que merece ser refinada.

## O que priorizamos

1. **Telefone antes de tudo.** A composição nasce em 390 CSS px, em retrato.
   A revisão focal inclui 412 px quando uma decisão precisa de segunda
   referência. 430 px, tablet, desktop, paisagem, LOW e movimento reduzido são
   redes de regressão e liberação, não bloqueiam a primeira sessão criativa.
2. **Uma ação com recompensa.** O slice tem início, gesto principal, resposta
   correta, tentativa gentil e vitória curta. Não é um mockup estático nem uma
   Scene com controles ainda sem propósito.
3. **Materialidade 2.5D, não 3D caro por padrão.** Profundidade vem de arte
   preparada, luz, sombra, parallax discreto e objetos hero em movimento. Isso
   dá sensação de diorama premium no celular sem câmera 3D, shader permanente
   ou custo imprevisível.
4. **VFX e som como consequências, não enfeites.** Cada ação importante muda
   luz, posição, material, som ou composição por tempo finito. LOW e movimento
   reduzido preservam a confirmação em estado estático e áudio opcional.
5. **Evidência visual de alto sinal.** A cada decisão criativa, observar a
   partida real em telefone vale mais que multiplicar screenshots e asserts de
   DOM. A matriz completa entra depois, uma vez por marco de integração e na
   liberação.

## A fatia criativa que todo jogo deve ganhar primeiro

Antes de abrir uma tarefa grande de runtime, registrar no `EXPERIENCE.md` do
jogo uma **Creative Slice Card** curta. Ela usa o contrato já existente, não
cria outro schema no browser, e cabe em uma tela de documento:

| Campo                 | Decisão que precisa estar explícita                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Fantasia              | Uma frase concreta: lugar, brinquedo/objeto e promessa de Natal.                          |
| Leitura em 5 segundos | Foto protagonista → gesto principal → consequência esperada.                              |
| Verbo da criança      | Um gesto primário de alvo grande; o arraste é atalho, nunca obrigação.                    |
| Cena hero             | O objeto, material ou ambiente que diferencia este jogo dos demais.                       |
| Cinco batidas         | Entrada, toque, acerto, tentativa gentil e vitória; cada uma com imagem e som.            |
| Composição 390        | Faixas para foto/tabuleiro, gesto, HUD mínimo e zonas que devem ficar calmas.             |
| Pacote de cena        | Papéis de asset necessários, qualidade NORMAL/LOW/reduzido e o que não será criado agora. |
| Rota de vitória       | Como a foto volta a ser a heroína e qual é a próxima ação da família.                     |

O slice é aceito criativamente quando uma pessoa consegue tocar o ciclo inteiro
em 390 px e explicar, sem instrução longa, “o que é”, “onde tocar” e “o que
aconteceu”. Um vídeo curto ou uma passagem guiada é melhor evidência de movimento
do que uma coleção de imagens de estados isolados.

## Linguagem natalina mais rica e replicável

Cada jogo recebe um **pacote de cena**, não uma Scene-base e nem um depósito de
assets aleatórios. O pacote combina os planos da `SCENE_GRAMMAR.md` com uma
família visual identificável:

| Camada                | Responsabilidade                                    | Exemplos de profundidade mobile segura                                           |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| L0 — mundo            | Ambientar a fantasia sem disputar a foto.           | vila, oficina, estação ou céu em arte preparada.                                 |
| L1 — vida             | Sugerir distância e calor atrás da ação.            | janelas acesas, lanternas, neve distante, sombra e um parallax lento opcional.   |
| L2 — jogo e lembrança | Tornar foto, tabuleiro e gesto táteis.              | molduras com passe-partout, madeira, latão, trilhos, cartas e sombra de contato. |
| L3 — celebração       | Pontuar entrada, acerto e vitória sem tapar a foto. | uma locomotiva, guirlanda, estrela, presente ou ramo em no máximo dois cantos.   |

O pacote inicial de um jogo deve ter somente o suficiente para contar sua
história: uma prancha de cenário L0/L1, um objeto hero com silhueta clara, uma
família de superfícies L2, um VFX finito de acerto/vitória e cinco papéis de
áudio. A expansão vem depois de o slice provar que o objeto hero melhora a
ação. Cada arquivo continua passando pelo manifesto, proveniência e orçamento.

“Mais 3D” significa, nesta fábrica, **diorama 2.5D de alta qualidade**: planos
de profundidade, materiais coerentes, oclusão simples e animações curtas. Um
renderer 3D, câmera em movimento, pós-processamento em tela inteira ou neve
contínua só entram após uma necessidade visual clara e medição no Android de
referência.

## Ritmo de produção

```text
brief criativo → slice jogável em 390 → aprovação de sensação
       → acabamento de feedback → integração segura → matriz/release
```

### 1. Brief criativo

Definir a Creative Slice Card, aprovar uma referência de estilo e escolher o
objeto hero. Ainda não comprar, gerar nem integrar uma coleção grande de
assets. O `SPEC.md` conserva a regra da brincadeira; o domínio ainda não
recebe detalhes de cena.

### 2. Slice jogável em 390 px

Construir a lógica mínima real e a apresentação dos cinco momentos. Podem ser
usadas formas temporárias seguras enquanto o asset aprovado é preparado, mas a
composição, o gesto, a hierarquia e o timing devem ser os finais em intenção.
Neste momento, abrir o jogo real no telefone e corrigir primeiro leitura,
toque e consequência — não espaçamentos de tablet.

### 3. Aprovação de sensação

Revisar em 390 px: entrada, primeiro toque, acerto e vitória. Perguntar se a
foto é vista primeiro, se o objeto hero explica a ação e se a cena parece viva
mesmo parada. Corrigir P1/P2 criativos antes de acrescentar mais estados,
níveis ou decorações.

### 4. Acabamento sensorial

Trocar placeholders por assets aprovados, aplicar receita de VFX, sonorização
e pausa/saída. Uma batida de feedback sempre tem início, pico e término; não
depende de loop para parecer premium. Só depois desse passo faz sentido decidir
se um prop, uma animação de sprite ou outro plano de arte realmente é necessário.

### 5. Integração e liberação

Cobrir regra pura, ciclo de vida, perfis e regressões de layout. Aqui entram
412/430, tablet/paisagem quando suportados, teste E2E completo, auditoria de
assets e Android físico. A qualidade final não é inferida de uma captura de
desktop.

## Escada de evidência proporcional

| Momento    | Evidência obrigatória                                                                                           | Deliberadamente fora do loop                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Brief      | Creative Slice Card e referência aprovada.                                                                      | E2E, matriz de telas e orçamento numérico.                     |
| Slice      | Passagem manual em 390 px pelo ciclo principal; erro de console e scroll evidentes são corrigidos.              | Tablet, desktop, todos os perfis e screenshots de cada estado. |
| Sensação   | Revisão focal em 390 e, se layout mudou, 412 px; quatro batidas: entrada, toque, acerto e vitória.              | Rodar `pnpm validate` a cada ajuste de cor, timing ou posição. |
| Integração | Teste unitário das regras novas, smoke E2E do caminho principal e saída, `pnpm check:fast`, manifesto do asset. | Repetir toda a jornada funcional para cada microajuste visual. |
| Release    | `pnpm validate`, matriz mobile atual, LOW, movimento reduzido e protocolo Android.                              | Declarar desempenho sem aparelho de referência.                |

O domínio não espera a liberação para ser correto: uma regra nova recebe teste
puro ao ser estabilizada no slice, antes de ganhar variações e conteúdo. A
diferença é que testes deixam de decidir a direção de arte ou substituir a
observação da brincadeira.

## Como o Codex deve trabalhar daqui em diante

O Codex começa por `SPEC.md`, pela Creative Slice Card e pela Bíblia natalina.
Ele escolhe a referência Phaser estritamente necessária apenas quando uma
decisão criativa a aciona — por exemplo, `tweens`, `audio-and-sound`,
`particles`, `animations` ou `cameras`; não para antecipar imports.

Durante o slice, ele deve:

- entregar um caminho jogável antes de abrir uma lista grande de testes;
- usar os laboratórios existentes como bancada de decisão, evoluindo-os para
  prévia do jogo real em vez de um mostruário genérico;
- registrar o custo conhecido de cada asset/VFX quando ele é candidato a
  runtime, não durante o esboço visual;
- mostrar no máximo as evidências focais do telefone até o marco de integração;
- preservar limpeza, privacidade e domínio puro a cada mudança, mesmo na via
  rápida criativa.

O `AGENTS.md`, as Skills locais, `CODEX_CAPABILITY_STACK.md` e
`QUALITY_GATES.md` devem refletir estes níveis depois que o plano for ativado.
Até lá, suas regras atuais continuam sendo a fonte operacional.

## Sinais de que um jogo deixou de parecer estático

- A primeira tela mostra um lugar e um objeto natalino específico, não apenas
  um fundo temático genérico atrás de controles.
- O toque altera uma relação física ou narrativa visível: trem percorre trilho,
  carta encaixa, luz orienta ou moldura revela uma conquista.
- Acerto e vitória mudam a cena em torno da foto, com som curto e VFX limitado;
  não apenas trocam texto ou cor.
- A profundidade ainda é percebida em screenshot estático por materiais,
  sombra, luz e hierarquia; movimento apenas a reforça.
- Em LOW e movimento reduzido, a compreensão e a recompensa sobrevivem sem
  loops decorativos.

## Fontes internas que este playbook reorganiza

- `AGENTS.md` e `apps/play/AGENTS.md` definem hoje a rotina de checks.
- `docs/quality/QUALITY_GATES.md` concentra `check:fast`, `check` e
  `validate`, cuja matriz Playwright inclui 390, 412, 430 e 768 px.
- `docs/experience/christmas/ART_BIBLE.md`, `SCENE_GRAMMAR.md`, receitas,
  Motion/Audio Bibles e o contrato de assets já fornecem os limites de uma
  direção natalina reutilizável.
- `docs/ai/CODEX_CAPABILITY_STACK.md`, `PHASER_SKILL_MAP.md` e as duas Skills
  locais oferecem o roteamento do Codex. Eles precisam passar a distinguir
  revisão focal de slice e validação de release.
