# A Lanterna Mágica das Lembranças — Especificação de Produto, Engenharia Óptica e Viabilidade

**Estado:** Proposta de produto inovador formulada após análise forense detalhada do catálogo em 14-09-2026.\
**Identificador sugerido:** `@christmas-games/lanterna-magica`\
**Classificação:** Quebra-cabeça óptico tátil de feixes de luz, espelhos de latão e lentes de projeção fotográfica.

---

## 1. Decisões de Produto Preliminares

### DPLM-001 — O Retorno à Essência da Fotografia: "Desenhar com a Luz"

> **Decisão:** O novo jogo coloca o próprio elemento formador da fotografia — a **LUZ** — nas mãos da criança e da família. Enquanto outros jogos tratam a foto como uma imagem a ser desvirada, montada ou guardada, na _Lanterna Mágica_ a foto só ganha vida e projeta sua beleza quando a criança constrói um caminho contínuo de feixes de luz que atravessa lentes, espelhos e prismas até o bocal de um projetor vitoriano encantado.

### DPLM-002 — Mecânica Óptica Inédita e Acessível (Sem Frustração Infantil)

> **Decisão:** A física óptica do traçado de raios (raycasting 2D) será rigorosamente determinística no `domain/`, porém a interface de toque contará com **snap magnético ergonômico** (ângulos de 15° ou 30° com atração suave). Crianças pequenas não sofrerão com micro-desalinhamentos de 1 pixel: aproximar o espelho da direção correta atrai o feixe com um estalo tátil metálico e som de encaixe de catraca de latão.

### DPLM-003 — A Moldura de Projeção Cinematográfica como Clímax

> **Decisão:** A fotografia da família é o destino final do feixe de luz. Ao atingir a objetiva do projetor, dispara-se o clássico estalo mecânico de obturador (`clique-obturador`), abrindo uma projeção de feixes volumétricos (_God Rays_) que ilumina a foto na parede da sala de Natal, com suporte perfeito a retratos verticais e horizontais sem cortes.

---

## 2. Análise Forense do Catálogo Existente e Matriz de Gaps

### 2.1 O que já temos no repositório (10 jogos ativos)

| Jogo                          | Gênero / Mecânica Central                      | Papel da Fotografia                | Sensação Tátil Dominante          |
| ----------------------------- | ---------------------------------------------- | ---------------------------------- | --------------------------------- |
| **Puzzle Swap**               | Deslizamento / permuta de ladrilhos (3×3, 4×4) | Imagem fragmentada a restaurar     | Toque em peças para permuta       |
| **Memory**                    | Jogo da memória com cartas                     | Pares de cartas com fotos e ícones | Desvirar cartas em grid           |
| **Trinca de Natal**           | Tabuleiro por turnos (Jogo da Velha) contra IA | Foto é o medalhão do jogador       | Alocação de fichas em grade 3×3   |
| **Expresso das Fotos**        | Condução de trenzinho e manobra de vagões      | Fotos como vagões transportados    | Troca de trilhos e alavancas      |
| **Globo das Lembranças**      | Brinquedo físico rotativo e limpeza de vidro   | Fotos ocultas por vapor/neve       | Limpeza de vidro e corda rotativa |
| **Guirlanda das Lembranças**  | Decoração / alocação de peças em soquetes      | Fotos em camafeus nos galhos       | Arrastar e soltar enfeites        |
| **Magic Photo**               | Raspagem e revelação por pincel contínuo       | Foto oculta sob gelo espesso       | Pincelada contínua com dedo       |
| **Mosaico em Queda**          | Queda de blocos estilo tetrominó               | Fotos nas faces dos blocos         | Rotação e descida de blocos       |
| **Rena das Lembranças**       | Arcade runner / apanhador com trenó            | Memórias como esferas caindo       | Deslocamento horizontal do trenó  |
| **Estilingue das Lembranças** | Balística / trajetória física parabólica       | Foto heroica em moldura vitoriana  | Puxar elástico e mirar alvo       |

### 2.2 Diagnóstico das Lacunas (O que NÃO possuímos)

1. **Ausência de Jogos de Óptica e Luz (Ray Puzzle)**:
   - Jogos de direcionamento de luz por espelhos e prismas (como _God of Light_, _Aargon_ ou _Laser Maze_) estão entre os puzzles mais populares, universais e elegantes da história dos jogos casuais mobile. Nenhum jogo do estúdio explora reflexão ou refração de luz.
2. **Conexão Literal com a Origem da Fotografia**:
   - A palavra **fotografia** deriva do grego _phos_ (luz) e _graphê_ (escrita, desenho) — literalmente **desenhar com a luz**. Um jogo em que o jogador literalmente desenha caminhos com feixes de luz dourada para acender uma câmera/lanterna mágica possui a maior sinergia de marca possível para o Estúdio Evydência.
3. **Mecânica de Rotação Tátil Contínua de Discos (Rotary Dials)**:
   - A maioria dos jogos do catálogo usa _tap_ pontual ou _drag_ linear. Um jogo centrado em girar discos de latão e engrenagens suaves oferece um tipo de prazer tátil e háptico completamente diferente, altamente satisfatório em telas sensíveis ao toque.

---

## 3. Visão Geral de "A Lanterna Mágica das Lembranças"

### 3.1 A Fantasia Natalina

Em uma mesa de mogno aconchegante ao lado de uma lareira acesa, repousa uma relíquia mágica do Polo Norte: a **Lanterna Mágica de Natal** (_Laterna Magica_), feita de latão dourado polido, couro trabalhado e lentes de cristal facetado.

Dentro dela há uma lâmina de vidro translúcida contendo a fotografia especial da família. No entanto, o projetor está adormecido no escuro. A partir de uma lamparina de cristal que emite um feixe de luz âmbar encantado, a criança deve orientar espelhos móveis de latão e prismas de vidro lapidado para conduzir o feixe até o bocal de entrada da Lanterna Mágica.

Quando a luz atinge o alvo:

1. As lentes começam a girar suavemente.
2. O obturador dispara um clique nostálgico (`clique-obturador`).
3. Um cone de luz volumétrica majestosa irrompe da lente, projetando na parede de madeira rústica a fotografia da família, nítida, reluzente e emoldurada por guirlandas de luzes douradas!

---

## 4. O Loop de Jogabilidade (Gameplay Loop)

### 4.1 A Regra dos 5 Segundos

1. **Segundo 1–2:** O celular abre mostrando a mesa natalina. Uma lamparina emite um raio de luz dourada que bate no primeiro espelho e se projeta pelo ambiente. A foto da criança aparece suavemente translúcida na lâmina do projetor ao fundo.
2. **Segundo 3–4:** A instrução afetuosa surge: _“Gire os espelhos de latão e leve a luz mágica até a sua foto!”_.
3. **Segundo 5:** Ao tocar em qualquer espelho, o disco de latão responde com um clique tátil (`click-catraca`) e o feixe de luz reflete instantaneamente em tempo real na tela, revelando a física do jogo de forma intuitiva e sem manuais.

### 4.2 Componentes do Tabuleiro Óptico

```
 ┌─────────────────────────────────────────────────────────┐
 │ [X Voltar]       🎯 A Lanterna Mágica       [Som] [Pausa]│
 ├─────────────────────────────────────────────────────────┤
 │                                                         │
 │              ┌───────────────────────────┐              │
 │              │     TELA DE PROJEÇÃO      │              │
 │              │   (Foto da Família Aqui)  │              │
 │              └─────────────▲─────────────┘              │
 │                            │ (Feixe Final Projetado)    │
 │                     [LANTERNA MÁGICA]                   │
 │                       (Bocal/Lente)                     │
 │                            ▲                            │
 │                            │                            │
 │          [Espelho 2] ◄─────┴──────── [Prisma Cristal]   │
 │               ▲                               ▲         │
 │               │                               │         │
 │               │                               │         │
 │          [Espelho 1] ◄────────────────── [Lamparina]    │
 │         (Disco Latão)                   (Fonte de Luz)  │
 │                                                         │
 ├─────────────────────────────────────────────────────────┤
 │      💡 "Gire os espelhos para acender sua lembrança!"    │
 └─────────────────────────────────────────────────────────┘
```

1. **A Lamparina de Luz (Emissor)**: Emite um raio de luz volumétrico contínuo, com poeira mágica e partículas de ouro flutuando no feixe.
2. **Os Espelhos de Latão (Refletores Móveis)**:
   - Suportes torneados em latão dourado com espelho de prata polida.
   - Cada espelho possui um anel circular exterior para o polegar da criança girar com facilidade.
   - Feedback tátil mecânico de catraca (`brass-ratchet`) a cada incremento de ângulo.
   - Snap magnético em ângulos múltiplos de 15° para conforto infantil.
3. **Os Prismas de Gelo Encantado (Separadores / Desviadores)**:
   - Cristais de rocha que dividem um feixe em dois ou desviam a luz em 90° com brilho de arco-íris natalino.
4. **As Estrelas Coletáveis de Bônus**:
   - Pequenas estrelinhas de Natal suspensas no ar: se o feixe de luz atravessá-las a caminho da lente, elas acendem e tocam uma nota musical cristalina (_Pim!_).
5. **A Objetiva da Lanterna (Receptor / Alvo)**:
   - Bocal de latão entalhado com lente convexa de vidro espesso.
   - Ao receber o feixe de luz, acende um anel dourado e ativa o obturador da projeção.

---

## 5. Especificação Técnica e Arquitetura do Sistema

### 5.1 Isolamento de Camadas (Conforme `AGENTS.md`)

- `packages/games/lanterna-magica/src/domain/`:
  - Algoritmo de traçado de raios 2D (`Raytracer2D.ts`) 100% puro e determinístico.
  - Zero imports de Phaser, React, Canvas, DOM, `Math.random` ou `Date.now`.
  - Representa espelhos, ângulos, segmentos de raio e colisões com polígonos/círculos via álgebra vetorial pura.
  - Suítes de teste unitário completas via Vitest provam reflexões a 0°, 45°, 90°, divisões de prismas e condições de vitória.
- `packages/games/lanterna-magica/src/runtime/phaser/`:
  - Renderização do feixe de luz com `Graphics` e shaders/blend modes aditivos.
  - Animação de poeira mágica nos feixes (`ParticleEmitter` com partículas douradas e brancas).
  - Componentes de espelho com rotação interpolada suave e som háptico de catraca.
  - Projeção de revelação da foto com zoom de câmera e iluminação cinematográfica.

### 5.2 Algoritmo Óptico Determinístico no Domínio

$$ \vec{v}_{\text{refletido}} = \vec{v}_{\text{incidente}} - 2 (\vec{v}_{\text{incidente}} \cdot \vec{n}) \vec{n} $$

- **Passos do Raycaster**:
  1. Origem: posição e vetor diretor da Lamparina $(x_0, y_0, \vec{d})$.
  2. Para cada segmento, calcula a interseção mais próxima com os obstáculos e espelhos do tabuleiro.
  3. Ao colidir com a superfície de um espelho plano:
     - Calcula a normal do espelho $\vec{n}$ baseada no ângulo atual do disco.
     - Gera o novo vetor refletido $\vec{v}_{\text{refletido}}$.
     - Adiciona o vértice ao trajeto do feixe $[(x_0, y_0), (x_1, y_1), \dots]$.
  4. Ao atingir o alvo (Lente da Lanterna):
     - Emite evento determinístico `TargetIlluminatedEvent`.
     - Trava o estado de vitória no autômato `LanternStateMachine`.

---

## 6. Direção de Arte e Gramática de Materiais (Art Bible)

O jogo adota rigorosamente a estética do estúdio: **materiais realistas com profundidade 2.5D, iluminação aconchegante e sensação tátil de brinquedo artesanal vitoriano**.

1. **Latão Dourado e Bronze Envelhecido**: Usado nas carcaças dos espelhos, engrenagens, parafusos borboleta e na estrutura da Lanterna Mágica. Textura com reflexos metálicos acetinados e micro-ranhuras artesanais.
2. **Cristal Óptico e Vidro Lapidado**: Espelhos com bordas bisotadas de alta reflexão; prismas transparentes com facetas brilhantes e refração sutil.
3. **Madeira de Mogno e Cedro Encerado**: O tabuleiro repousa sobre uma bancada de marcenaria natalina com nós de madeira quentes e polimento aveludado.
4. **Veludo Verde-Pinho e Fitas Carmim**: A moldura de projeção e a base dos controles apoiam-se sobre tecidos festivos ricos e acolhedores.
5. **O Feixe de Luz Mágica**:
   - Núcleo branco-dourado incandescente (`#ffffff` a `#fff2b2`).
   - Halo suave em tom âmbar natalino (`#ffd700`, blend mode `ADD`).
   - Poeira estelar flutuante ao longo do cone de luz (`dust-motes`).

---

## 7. Design de Som e Haptics (Audio Bible)

Todos os sons são materiais, acolhedores e reforçam o toque físico sem sobressaltos:

| Efeito Sonoro         | Momento / Gatilho                                          | Sensação Sonora                                                         |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `brass-ratchet`       | Ao girar o disco de latão do espelho                       | Clique mecânico discreto e satisfatório de catraca de relógio antigo    |
| `mirror-snap`         | Quando o espelho alcança o ângulo correto (snap magnético) | Encaixe metálico suave e magnético com leve vibração háptica            |
| `beam-ignite`         | Quando a luz atinge um novo espelho                        | Zumbido quente e aveludado de energia solar encantada                   |
| `star-ting`           | Quando o raio passa por uma estrela bônus                  | Nota musical cristalina de glockenspiel (escala pentatônica natalina)   |
| `lens-focus`          | Quando a luz penetra na objetiva da Lanterna               | Vibração harmônica de cristal em ressonância                            |
| `shutter-snap`        | No instante do acerto final                                | Estalo mecânico inconfundível de obturador de câmera vintage de estúdio |
| `celebrate-orchestra` | Revelação da fotografia da família                         | Arranjo orquestral natalino suave com carrilhão, violoncelo e sinos     |

---

## 8. A Fotografia do Cliente como o Coração da Experiência

1. **Apresentação Heroica**:
   - A foto escolhida nunca é cortada nem distorcida.
   - O jogo calcula a proporção exata da foto (Retrato ou Paisagem) e adapta a tela de projeção vitoriana com veludo e borda dourada proporcional.
2. **Revelação Cinematográfica Progressiva**:
   - Inicialmente, a foto é visível em tom monocromático sepia/penumbra suave dentro da lâmina de vidro.
   - Conforme cada espelho é conectado ao circuito de luz, a foto vai ganhando iluminação e calor.
   - Na vitória, o projetor projeta a foto com cores ricas, iluminação radiante e nitidez total de estúdio, preenchendo o centro do palco e proporcionando uma experiência profundamente afetiva aos pais e avós.

---

## 9. Acessibilidade e Perfis de Qualidade

| Perfil                 | Comportamento no Jogo                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LOW**                | Feixe de luz desenhado com polígono vetorial limpo; desativa partículas de poeira; mantém os cliques táteis e snaps magnéticos com contraste máximo de cores. |
| **NORMAL**             | Feixe volumétrico com blend aditivo, partículas finitas de poeira mágica e reflexos especulares nos espelhos de latão.                                        |
| **HIGH**               | God Rays completos com atenuação volumétrica suave, poeira mágica dinâmica e tremor tátil de câmera no disparo do obturador.                                  |
| **Movimento Reduzido** | Remove os God Rays pulsantes e transições rápidas; a revelação da foto ocorre por dissolução suave de brilho, mantendo o controle total nas mãos do jogador.  |

---

## 10. Plano de Engenharia e Fases de Execução

1. **Fase 1 — Domínio e Física Óptica Pura (`packages/games/lanterna-magica/src/domain/`)**:
   - Implementar `Raytracer2D`, nós de espelhos, cálculo de reflexão e snap magnético.
   - Cobertura de 100% em testes unitários com Vitest (provando reflexões a 0°, 30°, 45°, 90° e 180°).
2. **Fase 2 — Layout Manager e Ergonomia Mobile (`SlingshotLayoutManager` equivalente)**:
   - Layout responsivo para smartphones verticais (390×844, 412×915, 430×932) e tablets (768×1024).
   - Zonas de toque circulares amplas com raio mínimo de 64 CSS px para manipulação precisa com o polegar.
3. **Fase 3 — Apresentação Phaser e Efeitos de Luz (`runtime/phaser/`)**:
   - Criação dos componentes de espelho em latão e renderizador de feixe com blend mode `ADD`.
   - Texturas procedurais e shaders leves de feixes de luz volumétrica.
4. **Fase 4 — Integração Fotográfica e Animação de Vitória**:
   - Carregamento assíncrono seguro da foto do cliente via `GameContext`.
   - Projeção cinematográfica com revelação da foto em alta definição.
5. **Fase 5 — Áudio Director e Paisagem Sonora**:
   - Integração do `LanternaAudioDirector` com os 7 efeitos materiais listados.
6. **Fase 6 — Validação nos Gates de Qualidade do Monorepo**:
   - `pnpm check:fast`, `pnpm architecture`, `pnpm deadcode`, `pnpm validate` e revisão visual via Chrome DevTools MCP em modo mobile.

---

## 11. Conclusão Executiva

_A Lanterna Mágica das Lembranças_ é a evolução natural do catálogo de jogos natalinos do Estúdio Evydência:

- Não canibaliza nem repete nenhuma das mecânicas existentes (slingshot, quebra-cabeça, tetrominó, cartas ou corredor).
- É intuitivo para uma criança de 4 anos e encantador para pais e avós.
- Celebra o ofício mais nobre da fotografia — **a arte de pintar com a luz** — transformando a foto do cliente na grande recompensa mágica da noite de Natal.
