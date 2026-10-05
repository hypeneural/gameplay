# Auditoria Arquitetural Forense — Estilingue das Lembranças

Auditoria técnica dos padrões de arquitetura do repositório `@christmas-games` combinados com a dissecação forense aprofundada do motor de estilingue e física do repositório de referência **`feliperyba/angry-aliens-phaser`**.

---

## 1. Mapeamento de Fronteiras e Regras do Monorepo (`AGENTS.md`)

1. **Isolamento de Domínio (`domain/`)**:
   - `src/domain/` não pode importar Phaser, React, DOM, `fetch`, `Date.now` ou `Math.random`.
   - A máquina de estados (`SlingshotStateMachine`), as equações de tração (`ShotModel`), o progresso de alvos (`TargetProgress`) e os segmentos da moldura (`FrameProgress`) residem em `domain/` com testes determinísticos em Vitest.
2. **Ciclo de Vida Único e Limpeza Rigorosa**:
   - Uma única instância do Phaser é criada ao entrar no jogo; ao sair, o método `destroy()` do `GameController` deve cancelar o motor Matter, remover todos os listeners e callbacks de colisão (`setOnCollide(() => {})`), liberar texturas dinâmicas (`textures.remove(photoKey)`) e invocar `game.destroy(true)`.

---

## 2. Dissecação Forense da Referência (`feliperyba/angry-aliens-phaser`)

A análise aprofundada do código-fonte da referência revelou os pilares fundamentais que elevam um jogo de estilingue de "animação básica" para **"simulador físico hiper-satisfatório"**:

### A. Trajetória com `Matter.Engine` Secundário em Cache (`TrajectorySimulator.ts`)

- **Problema de Aproximações Analíticas**: Fórmulas parabólicas simples não consideram arrasto do ar (`frictionAir`), dimensões do corpo e passos exatos do integrador de Euler/Verlet do Matter.js, gerando divergência entre os pontos e o voo real.
- **Solução da Referência**:
  - Mantém uma instância isolada de `Matter.Engine` e `Matter.World` dedicada à simulação de trajetória.
  - No início da simulação, cria temporariamente um corpo circular idêntico ao projétil (`Matter.Bodies.circle(startX, startY, radius, { density, frictionAir, restitution, friction })`).
  - Aplica o vetor de velocidade inicial com `Matter.Body.setVelocity()`.
  - Executa `Matter.Engine.update(this.engine, delta)` em loop para `totalSteps * framesPerDot`.
  - Coleta os pontos amostrados a cada `framesPerDot` e remove o corpo temporário, mantendo o engine em cache sem vazamento de memória.
  - **Resultado**: 100% de precisão — onde os dots apontam é exatamente onde a bola de neve viaja.

### B. Elástico Dinâmico com Partículas e Constraints Verlet (`VerletBand.ts`)

- **Problema de Linhas Estáticas**: Desenhar apenas duas retas com `lineBetween()` quebra a imersão de um estilingue físico.
- **Mecanismo da Referência**:
  - Cada tira elástica possui $N$ partículas ($N = 6$ a $8$ segmentos). A partícula $0$ é fixada no garfo (`pinned: true`) e a última segue a concha (`pouch`).
  - **Modo Taut (Durante a Mira)**:
    - Enquanto o jogador arrasta o dedo (`taut: true`), as partículas intermediárias são puxadas ativamente em direção à reta entre a âncora e o pouch através de interpolação linear (`Phaser.Math.Linear`) com `lerpFactor = 0.65`, atualizando também `oldX, oldY`.
    - Isso garante resposta visual instantânea sem atraso ou flacidez indesejada durante a mira.
  - **Liberação e Ondas Mecânicas (Ao Disparar)**:
    - No instante do disparo (`pointerup`), a banda recebe `applyWaveImpulse(intensity)` e `applyImpulse(vx, vy)`.
    - A simulação de Verlet executa:
      - Ondas transversais viajantes (`travelingWave = sin(t - wavePhase) * waveIntensity * envelope * perpX/Y`).
      - Ondas estacionárias (`standingWave = sin(t * 2π + oscillationPhase) * oscillationAmplitude * perpX/Y`).
      - Resolução de distâncias de repouso (`solveConstraints()`) entre partículas adjacentes.
    - O elástico chicoteia, ultrapassa o ponto de repouso, oscila com amortecimento e estabiliza organicamente.

### C. Concha de Couro com 4 Fases de Física (`PouchPhysics.ts`)

- A concha de couro não é teleportada para a origem ao soltar. Ela obedece a uma máquina de estados de 4 fases:
  1. `snap`: Aceleração violenta em direção à posição de repouso proporcional à força de tração.
  2. `overshoot`: Ultrapassagem da linha de repouso devido ao momentum adquirido, com desaceleração progressiva.
  3. `settle`: Oscilação harmônica elástica amortecida (`dx * stiffness * overshoot` com `settleDamping`).
  4. `idle`: Repouso na origem quando a velocidade e distância caem abaixo dos limiares.

### D. Projétil com Squash & Stretch e Matter Body (`Bird.ts` / `SnowballObject.ts`)

- No instante do disparo:
  - O corpo do projétil muda de estático para dinâmico: `matterImage.setStatic(false)` e `setVelocity(vx, vy)`.
  - O body é acordado ativamente: `Matter.Sleeping.set(body, false)`.
  - **Squash & Stretch na Direção do Voo**:
    - Ângulo de lançamento: $\theta = \text{atan2}(v_y, v_x)$.
    - Alongamento nos eixos: $\text{scaleX} = 1.0 + |\cos\theta| \cdot \text{stretchFactor}$, $\text{scaleY} = 1.0 + |\sin\theta| \cdot \text{stretchFactor}$.
    - Tween de 70–110ms com `yoyo: true` e `ease: "Power2"`.
- Em voo:
  - Rotação angular proporcional à velocidade horizontal.
  - Emissão de micro-cristais de neve no rastro.

### E. Colisão Físico-Material com Velocidade Relativa

- No evento de colisão Matter (`collisionstart`):
  - Calcula a velocidade relativa dos dois corpos: $\vec{v}_{\text{rel}} = \vec{v}_{\text{bola}} - \vec{v}_{\text{alvo}}$.
  - Intensidade do impacto: $v_{\text{rel}} = \|\vec{v}_{\text{rel}}\|$.
  - Classificação em 3 limiares:
    - _Soft_ ($v_{\text{rel}} < 3.5$): dispersão mínima de neve, toque leve, sem contagem de alvo.
    - _Valid_ ($3.5 \le v_{\text{rel}} < 12$): acerto pleno, ativação pendular, som do material e liberação do talismã.
    - _Hard_ ($v_{\text{rel}} \ge 12$): impacto forte com micro camera-kick (2px) e explosão reforçada de partículas.

### F. Sonoplastia Ricamente Texturizada (Phaser Sound Engine)

- Em vez de um áudio genérico mono-canal, a experiência utiliza o sistema de som do Phaser com:
  - **Micro-creaks do estilingue**: estalos graduais de tração a cada 25% de extensão.
  - **Disparo com chicote**: estalo do elástico ("twang!") + arfar de ar ("whoosh!").
  - **Impacto característico por material**: baque de neve fofa + madeira oca (Alvo 1), biscoito doce (Alvo 2), estrela cristalina (Alvo 3) e sino metálico de latão (Alvo 4).
  - **Variação de Pitch Dinâmica (0.97 a 1.03)**: evita fadiga auditiva em disparos repetidos.
  - **Ducking Automático**: a música ambiente reduz em -6dB durante impactos fortes e fanfarra final.
