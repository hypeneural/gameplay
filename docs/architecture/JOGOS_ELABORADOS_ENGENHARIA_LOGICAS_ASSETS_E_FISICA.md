# Análise Forense de Engenharia — Lógicas, Assets, Física e Áudio dos Jogos Mais Elaborados

**Data de consolidação:** 14 de setembro de 2026\
**Autores:** Engenharia de Jogos, Arquitetura de Plataforma e Direção de Arte do Estúdio Evydência\
**Documentos oficiais de referência:**

- `AGENTS.md` (Constituição de isolamento de camadas e ordem de fontes)
- `docs/experience/christmas/ART_BIBLE.md` (Bíblia de Arte e Gramática de Materiais)
- `docs/experience/christmas/AUDIO_BIBLE.md` (Bíblia de Efeitos Sonoros e Gestão de Vozes)
- `docs/experience/christmas/CRYSTAL_CONTROL_STANDARD.md` (Padrão de Controles Cristalinos e Toque)
- `docs/assets/ASSET_MANIFEST_CONTRACT.md` (Contrato de Manifesto e Orçamento de Assets)
- `docs/media/LOCAL_MEDIA_ARCHITECTURE.md` (Arquitetura de Mídia e Entrega Segura de Fotos)
- `docs/product/MUNDO_NATALINO_INTERATIVO_2026-09-07.md` (Direção de Fotografia e Interatividade)

---

## 1. Introdução e Propósito Desta Análise

Este documento estabelece o registro técnico definitivo sobre como foram projetadas, implementadas e calibradas as lógicas mecânicas, os sistemas de movimento realista, a arquitetura de áudio e os pipelines de assets nos jogos mais elaborados do repositório:

1. **🎯 Estilingue Mágico das Lembranças** (`packages/games/estilingue-das-lembrancas`): Balística no Matter.js, integração de Verlet para elásticos de borracha, predição de trajetória parabólica, transferência de momento e encaixe fotográfico vitoriano.
2. **🌟 A Lanterna Mágica das Lembranças** (`packages/games/lanterna-magica`): Traçado de raios 2D determinístico, reflexão especular vetorial, snap magnético em catraca de latão, renderização volumétrica com blend aditivo e síntese WebAudio em tempo real.
3. **🎀 Guirlanda das Lembranças** (`packages/games/guirlanda-das-lembrancas`): Caixa de presentes física com dinâmica de molas amortecidas, soquetes ornamentais e mix de áudio micro-modulado.
4. **🔮 Globo de Neve das Lembranças** (`packages/games/globo-das-lembrancas`): Modelo de turbulência de fluido acoplado à corda mecânica, grade celular de condensação de vapor e reflexão multi-camada sobre cristal curvo.
5. **❄️ A Magia da Minha Foto de Natal** (`packages/games/magic-photo`): Raspagem contínua de gelo translúcido sobre FBO e revelação por limiares de descoberta progressiva.
6. **🧩 Mosaico em Queda** (`packages/games/mosaico-em-queda`): Sistema de rotação SRS com _wall kicks_, gerador aleatório 7-bag e vitrais luminosos com preservação de fotos.

---

## 2. Movimentos Realistas e Física Computacional

### 2.1 Estilingue Mágico: Balística Parabólica e Elásticos de Verlet

#### A. O Modelo Cinemático e a Predição de Trajetória

O movimento da bolinha de neve combina a simulação dinâmica no motor de física Matter.js com uma predição visual de mira analítica sincronizada ponto a ponto.

As equações clássicas do movimento balístico sob gravidade uniforme:
$$\vec{x}(t) = \vec{x}_0 + \vec{v}_0 t$$
$$\vec{y}(t) = \vec{y}_0 + \vec{v}_0_y t + \frac{1}{2} g_y t^2$$

No entanto, em motores físicos discretos como o Matter.js, a integração de Verlet atualiza as posições a cada _step_ com uma escala de gravidade interna:
$$g_y = \text{gravity.y} \times \text{gravityScale} \times 1000 \times (\Delta t)^2$$

No `TrajectoryPredictor.ts`, para que os pontos de mira desenhados na tela correspondam exatamente à trajetória percorrida pela bolinha após a soltura, a simulação analítica replica o mesmo passo numérico:

```typescript
const dt = 1 / 60;
const stepGravityY = gravityY * gravityScale * 1000 * dt * dt;

for (let i = 0; i < maxSteps; i++) {
  currentVelocityY += stepGravityY;
  currentX += currentVelocityX * dt * 60;
  currentY += currentVelocityY * dt * 60;
  points.push({ x: currentX, y: currentY });
}
```

#### B. Bandas Elásticas com Dinâmica de Partículas (Verlet Rope)

As tiras de borracha do estilingue (`SlingshotBand.ts`) não são meras linhas retas:

- Cada banda é subdividida em nós discretos conectados por restrições de distância (_distance constraints_).
- Quando em repouso ou tração suave, a gravidade e o amortecimento conferem curvatura natural (curva catenária suave).
- Sob tração rápida, a tensão linear domina e retifica a banda com micro-vibrações elásticas calculadas por:
  $$\Delta \vec{x} = (\vec{x}_2 - \vec{x}_1) \left(1 - \frac{L_0}{||\vec{x}_2 - \vec{x}_1||}\right) \times 0.5$$
- O ponto central ancora-se na bolsa de couro (_leather pouch_), que roda suavemente para apontar sempre na direção do vetor oposto ao lançamento.

#### C. Transferência de Momento e Resposta de Impacto

Ao colidir com os alvos natalinos suspensos por cordas (`HangingTargetObject.ts`):

1. **Conservação de Momento Linear e Angular**:
   $$\vec{J} = \Delta \vec{p} = m_{\text{bola}} \cdot \vec{v}_{\text{impacto}} \cdot \kappa$$
   O impulso $\vec{J}$ é aplicado no ponto de contato exato da geometria do alvo no Matter.js, gerando oscilação pendular amortecida e rotação angular realista.
2. **Squash & Stretch e Escala 2.5D**:
   - No instante do disparo, a bola sofre deformação proporcional à aceleração ($\text{scaleX} = 1.25, \text{scaleY} = 0.8$).
   - Durante a ascensão em direção aos alvos de fundo, a escala reduz gradualmente de $1.0 \to 0.84$, simulando profundidade de campo tridimensional (perspectiva 2.5D).
3. **Câmera Háptica**: Um micro-tremor de câmera (`cameras.main.shake(120, 0.005)`) no impacto reforça fisicamente o contato.

---

### 2.2 Lanterna Mágica: Traçado de Raios 2D e Reflexão Especular

#### A. A Física Óptica Pura no Domínio (`OpticalModel.ts`)

A física do traçado de raios é 100% determinística e desacoplada do Phaser. Ao colidir com um segmento de espelho orientado pelo ângulo $\theta$, a reflexão especular é calculada analiticamente pela álgebra vetorial:

$$\vec{v}_{\text{refletido}} = \vec{v}_{\text{incidente}} - 2 (\vec{v}_{\text{incidente}} \cdot \vec{n}) \vec{n}$$

Onde $\vec{n}$ é o vetor normal unitário perpendicular ao espelho.

**Garantia de Invariância da Normal**:
Se um espelho é modelado por um segmento de reta entre vértices $A$ e $B$, a ordem de armazenamento dos pontos poderia inverter o vetor normal $(-dy, dx)$. O algoritmo previne a reflexão para o lado errado verificando o produto escalar:

```typescript
if (dotProduct(normal, rayDir) > 0) {
  normal = { x: -normal.x, y: -normal.y };
}
```

Isso garante que a normal aponte invariavelmente contra o raio incidente, gerando reflexão física correta dos dois lados da lâmina do espelho.

#### B. Snap Magnético e Conforto Ergonômico Infantil

Em telas de toque pequenas, exigir alinhamento contínuo de $1^\circ$ resulta em frustração para crianças pequenas. O algoritmo de snap magnético no domínio implementa atração zonal:
$$\theta_{\text{snap}} = \text{round}\left(\frac{\theta}{\Delta \theta}\right) \cdot \Delta \theta \quad (\text{onde } \Delta \theta = 15^\circ = \frac{\pi}{12}\text{ rad})$$
$$\text{Se } |\theta - \theta_{\text{snap}}| \le 5^\circ \left(\frac{\pi}{36}\text{ rad}\right) \implies \theta = \theta_{\text{snap}}$$

Ao atingir a zona de atração, o espelho "trava" magneticamente no ângulo correto acompanhado de som de catraca e pulso tátil.

#### C. Renderização de Feixes Volumétricos Aditivos

A luz não é uma linha plana e sólida; ela é renderizada em 3 camadas concêntricas sobrepostas com `BlendModes.ADD`:

1. **Halo Externo Disperso**: Largura $18\text{px}$, cor âmbar suave `#ffaa00`, transparência $\alpha = 0.25$.
2. **Feixe Intermediário Quente**: Largura $6\text{px}$, dourado vibrante `#ffd700`, transparência $\alpha = 0.7$.
3. **Núcleo Incandescente**: Largura $2\text{px}$, branco incandescente `#ffffff`, transparência $\alpha = 0.95$.
4. **Poeira Estelar (Motes de Luz)**: 28 partículas circulares flutuam dentro da área óptica com movimento browniano suave ($\Delta \vec{x} = \vec{v} \cdot dt$).

---

### 2.3 Guirlanda das Lembranças: Dinâmica de Molas e Gravidade Amortecida

A abertura da caixa de lembranças e a entrega de cada medalhão fotográfico no início da partida utilizam um oscilador harmônico amortecido:
$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k x = 0$$

- **Comportamento Subamortecido ($\zeta < 1$)**: A tampa da caixa abre ultrapassando ligeiramente o ponto final (_overshoot_ de 8%), retornando suavemente em 320ms, criando a sensação palpável de veludo e madeira nobre.
- **Docking Magnético nos Soquetes**: Cada medalhão possui raio de atração de $36\text{px}$ ao redor dos galhos da guirlanda; soltar o medalhão próximo a um soquete livre dispara um deslocamento em curva cúbica com estalo suave de travamento (`GarlandPhotoFrame.ts`).

---

## 3. Arquitetura de Efeitos Sonoros e Design Acústico

### 3.1 A Bíblia Sonora e a Política Anti-Fadiga

A conformidade com a `AUDIO_BIBLE.md` estabelece 6 regras inquebráveis em todos os jogos:

1. **Regra do Primeiro Gesto**: Nenhuma onda sonora é emitida antes do primeiro toque da criança na tela. Ao tocar, `audioDirector.unlock()` é acionado e o contexto `AudioContext` do navegador é ativado de forma invisível.
2. **Priorização de Vozes e Preempção**: Cada efeito possui um nível de prioridade (ex: `button-press: 1`, `snap: 2`, `impact: 2`, `slot: 3`, `celebrate: 4`). Um som de prioridade menor nunca interrompe um de prioridade maior.
3. **Ducking Dinâmico da Trilha Sonora**: Durante a execução de efeitos sonoros de alto impacto (`celebrate`, `shutter`, `impact`), o volume da música ambiente de fundo é atenuado automaticamente:
   $$V_{\text{alvo}} = \begin{cases} 0.05 & \text{se efeito ativo} \\ 0.18 & \text{em repouso} \end{cases}$$
   A transição é amortecida com taxa exponencial ($\text{lerp}$ a $14\times dt$ na descida e $3\times dt$ na subida).
4. **Modulação Orgânica de Pitch (Anti-Fadiga)**: Ações frequentes como puxar elástico ou girar engrenagens modulam ligeiramente a taxa de reprodução entre $0.96$ e $1.04$:
   $$\text{rate} = \text{baseRate} + (\text{random} - 0.5) \times 0.08$$
   Isso elimina o efeito robótico de repetição mecânica.
5. **Proteção Anti-Spam (Throttle Cooldown)**: Disparos sucessivos do mesmo efeito em intervalo inferior a $80\text{ms}$ a $120\text{ms}$ são descartados sem enfileiramento fantasma.
6. **Mudo Absoluto e Limpeza na Saída**: Ao pausar ou silenciar, todas as vozes param imediatamente. Na destruição da cena, `destroy()` descarta todos os nós de áudio sem deixar pontas no coletor de lixo.

---

### 3.2 Síntese WebAudio em Tempo Real (Fallback Zero-Latência)

Para componentes mecânicos que exigem feedback háptico instantâneo e não podem arriscar falhas de rede (como a catraca de latão ou o clique do obturador), o `LanternaAudioDirector.ts` implementa síntese de áudio analítica pura via nós da Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`):

```typescript
case 'ratchet': {
  // Clique mecânico de engrenagem de latão (escapamento de relógio antigo)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1600, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.025);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.03);
  break;
}

case 'shutter': {
  // Estalo mecânico de obturador vintage de 2 tempos
  // Tempo 1: Cortina abrindo (sawtooth a 1200Hz descendo a 150Hz)
  // Tempo 2: Cortina fechando 50ms depois (square a 900Hz descendo a 200Hz)
  ...
}
```

Vantagens desta arquitetura:

- **Zero bytes de rede**: Os sons de catraca e obturador não exigem download de arquivos `.mp3` ou `.m4a`.
- **Latência ultra-baixa**: Executado diretamente na thread de áudio de hardware do dispositivo.
- **Confiabilidade**: Funciona perfeitamente mesmo em conexões instáveis ou servidores locais em modo de desenvolvimento.

---

## 4. Pipeline de Assets e Gramática de Materiais

### 4.1 O Dilema Raster vs Procedural

O repositório adota uma abordagem híbrida de alta performance:

| Tipo de Elemento                        | Abordagem Escolhida                                        | Justificativa de Engenharia                                                                                              |
| --------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Fundos complexos e cenários**         | Imagens WebP pré-processadas (`tools/media-pipeline`)      | Riqueza pictórica, pintura natalina acolhedora e iluminação global complexa.                                             |
| **Fotografia do cliente**               | WebP proporcional sob demanda (`thumb`, `card`, `game`)    | Exigência absoluta de nitidez do estúdio sem transferir o arquivo original não tratado.                                  |
| **Controles interativos e engrenagens** | Geração procedural via Canvas 2D (`textures.createCanvas`) | Nitidez perfeita em qualquer densidade de pixels (DPR 1x, 2x, 3x), sem delay de carregamento e com zero custo de bundle. |

### 4.2 Arquitetura de Geração Procedural no Phaser

Em `EstilingueProceduralArt.ts` e `LanternaProceduralArt.ts`:

1. Uma textura procedural é desenhada uma única vez durante o `create()` em um canvas em memória.
2. São aplicados gradientes radiais concêntricos (`createRadialGradient`) para criar relevo 3D metálico e sombras de volume.
3. É gerada a textura oficial no gerenciador do Phaser:
   ```typescript
   const target = scene.textures.createCanvas(key, width, height);
   draw(target.context);
   target.refresh();
   scope.texture(scene.textures, key);
   ```
4. **Proteção de Ciclo de Vida (`SceneScope`)**: A chamada `scope.texture(scene.textures, key)` garante que quando o usuário sair do minigame e voltar ao Hub, todas as texturas e canvas gerados sejam liberados da VRAM da GPU, prevenindo vazamentos de memória (OOM).

---

### 4.3 Pipeline Seguro de Mídia Local (VPS Sharp Pipeline)

Conforme documentado em `docs/media/LOCAL_MEDIA_ARCHITECTURE.md`:

1. As fotos originais dos clientes ficam armazenadas **fora do webroot** do servidor (`/srv/christmas-games/storage/originals/`).
2. O worker em Node.js utiliza a biblioteca Sharp com travas de segurança:
   - Teto rígido de entrada: máximo de $32\text{ MiB}$ por arquivo.
   - Detecção e aplicação de auto-orientação EXIF antes de qualquer cálculo de dimensão.
   - Derivação em 3 perfis WebP padronizados (`fit: 'inside', withoutEnlargement: true`):
     - `thumb.webp`: lado longo fixado em $480\text{px}$ (usado no Hub e miniaturas de seleção).
     - `card.webp`: lado longo fixado em $800\text{px}$ (usado em cartas e peças intermediárias).
     - `game.webp`: lado longo fixado em $1600\text{px}$ (usado na revelação heroica da fotografia).
3. **Entrega Segura**: O frontend solicita `/media/p/<opaque-id>/<variant>`, a aplicação valida o cookie de sessão e retorna um cabeçalho `X-Accel-Redirect` para o Nginx servir o arquivo estático privado. O navegador jamais tem acesso ao nome original do arquivo ou ao caminho em disco.

---

## 5. Estrutura Mecânica Realista e Ergonomia Mobile Native-Like

### 5.1 O Contrato de Isolamento da Arquitetura Hexagonal

O monorepo segue rigorosamente o princípio de separação de responsabilidades estabelecido em `AGENTS.md`:

```
┌──────────────────────────────────────────────────────────┐
│              apps/play (React Host / Shell)              │
│       Monta o canvas, controla rotas, Hub e saída        │
├──────────────────────────┬───────────────────────────────┤
│                          │ Bridge Events (JSON)          │
│                          ▼                               │
│       packages/games/<id>/src/runtime/phaser/            │
│       Cena Phaser, Shaders, Input, Tweens, Áudio        │
├──────────────────────────────────────────────────────────┤
│                          │ Instancia e Consulta          │
│                          ▼                               │
│       packages/games/<id>/src/domain/                    │
│   Raycaster, StateMachine, ShotModel, PuzzeLevels        │
│    (100% PURO: Zero Phaser, Zero DOM, Zero Math.random)   │
└──────────────────────────────────────────────────────────┘
```

**Benefícios Comprovados**:

- Os 418 testes unitários do monorepo rodam em menos de **25 segundos** no Vitest sem necessidade de inicializar navegadores ou instâncias WebGL pesadas.
- O comportamento do jogo é matematicamente reproduzível através de sementes determinísticas (`SeededRandom`).

---

### 5.2 Ergonomia para Polegares e a Regra dos 5 Segundos

1. **Alvos de Toque Generosos**:
   - Padrão do estúdio: Mínimo de $52\text{px}$ para controles secundários e $\ge 64\text{px} \dots 72\text{px}$ para elementos principais do tabuleiro.
   - As hitboxes dos espelhos de latão e da bolsa do estilingue recebem zonas invisíveis (`TouchTarget`) expandidas além da arte visual, garantindo que mesmo dedos grandes não errem o toque.
2. **Posicionamento no Terço Inferior**:
   - Elementos interativos ativos (bolsa de puxar do estilingue, mostradores de espelho) são concentrados na metade inferior da tela do celular, permitindo o jogo confortável com uma única mão.
3. **Apresentação da Fotografia Sem Cortes**:
   - A função `createPhotoSurface(photo, frameBounds, 'contain')` calcula matematicamente a escala proporcional da foto na abertura da moldura.
   - Se a foto do cliente for vertical (3:4) ou horizontal (16:9), ela nunca é cortada nem esticada. Um passe-partout de veludo carmim preenche suntuosamente as sobras da moldura barroca, garantindo a integridade dos rostos da família.

---

## 6. Matriz Comparativa dos Jogos Mais Elaborados

| Critério                     | Estilingue das Lembranças                | Lanterna Mágica                               | Guirlanda das Lembranças    | Globo de Neve                       |
| ---------------------------- | ---------------------------------------- | --------------------------------------------- | --------------------------- | ----------------------------------- |
| **Mecânica Principal**       | Balística e mira parabólica              | Traçado de raios e reflexão                   | Alocação tátil em soquetes  | Rotação e limpeza de vapor          |
| **Motor Físico**             | Matter.js + Verlet analítico             | Raycaster 2D analítico                        | Molas amortecidas (Springs) | Turbulência e Euler fluido          |
| **Zonas de Toque**           | Bolsa $88\text{px}$, alvos $64\text{px}$ | Mostradores $80\text{px}$ ($\ge 64\text{px}$) | Enfeites $72\text{px}$      | Esfera inteira ($\ge 260\text{px}$) |
| **Papel da Foto**            | Hero element em moldura barroca          | Projeção em tela vitoriana                    | Medalhões em camafeus       | Foto interna revelada pós-vapor     |
| **Áudio Primário**           | Elastic pull/snap, impacto               | Catraca de latão, obturador                   | Encaixe de madeira e sino   | Corda de relógio e gemas            |
| **Arquitetura de Som**       | Amostras locais + ducking                | Síntese WebAudio + amostras                   | 3 fontes micro-moduladas    | Síntese harmônica + sinos           |
| **Tratamento de Orientação** | Passe-partout carmim adaptativo          | Tela de projeção proporcional                 | Camafeus com pivô ajustado  | Máscara circular com zoom           |

---

## 7. Diretrizes para Novos Jogos e Evoluções Futuras

Ao criar ou aprimorar novos minigames para o catálogo:

1. **Comece Sempre pelo Domínio**: Escreva as regras, a matemática e as transições de estado no `src/domain/` com testes em Vitest antes de abrir o Phaser.
2. **A Foto é a Rainha**: Cenários, luzes, feixes e ornamentos devem emoldurar a foto do cliente, nunca ofuscá-la ou cobrir os rostos fotografados.
3. **Feedback Tátil Imediato**: Cada ação aceita pelo sistema deve emitir resposta tríplice coordenada em menos de $50\text{ms}$: visual (micro-escala), sonora (clique macio de material nobre) e háptica (vibração curta).
4. **Zero Fadiga Sonora**: Aplique variação de pitch em sons repetitivos e mantenha o ducking musical para valorizar o momento do acerto.
5. **Ciclo de Vida Limpo**: Nenhum timer, tween, listener ou textura pode sobreviver à saída da cena; registre tudo no `SceneScope`.
