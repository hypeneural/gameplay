# Estilingue das Lembranças — Especificação Técnica Detalhada

Experiência fotográfica natalina premium baseada em física real de estilingue 2.5D para smartphone vertical.
A fotografia real da criança ou da família é o **Hero Element** central, emoldurada em ouro nobre e cercada por alvos natalinos interativos que reagem com física pendular e ativam a iluminação mágica da moldura.

---

## 1. Contrato Jogável e Pilares Físicos

1. **Primeira Ação (\(\le 5\) segundos)**:
   - A bola de neve repousa no pouch de couro com floco de neve gravado.
   - O estilingue de madeira nobre e latão pulsa suavemente em convite.
   - Uma seta pontilhada translúcida indica: _"Puxe e solte a bola de neve!"_.
   - A criança encosta o dedinho na bola de neve (hit-box generosa \(\ge 64\)px).
2. **Mira e Cinemática do Elástico Verlet (AIMING)**:
   - O dedo arrasta para trás dentro de um cone válido de puxada (\(\approx 108^\circ\)).
   - **Simulação Verlet de Cada Banda**:
     - Cada tira elástica possui \(N = 6\) partículas. A partícula inicial é fixada no garfo e a final é ancorada na concha (pouch).
     - **Modo Taut (Durante a Mira)**: As partículas intermediárias sofrem interpolação linear (`lerp = 0.65`) em direção à reta direta entre garfo e pouch, atualizando `oldX, oldY`. O elástico responde instantaneamente à mão da criança sem atraso visual ou flacidez.
   - **Guia de Trajetória Prevista (`TrajectorySimulator`)**:
     - Utiliza uma instância isolada e em cache de `Matter.Engine` com os mesmos parâmetros do mundo principal (gravidade, massa da bola de neve, atrito do ar `frictionAir = 0.012`).
     - Cria um corpo temporário, aplica o vetor de velocidade e projeta de 8 a 14 dots luminosos que coincidem com precisão milimétrica com o voo real.
3. **Disparo e Voo Balístico (RELEASE & FLYING)**:
   - Ao soltar (`pointerup`), a concha de couro entra no ciclo de chicoteamento (`PouchPhysics`):
     - `snap` (aceleração violenta ao repouso) \(\to\) `overshoot` (ultrapassagem da linha central) \(\to\) `settle` (oscilação harmônica elástica amortecida) \(\to\) `idle`.
   - O elástico propaga ondas transversais mecânicas (`travelingWave` e `standingWave`) que diminuem suavemente.
   - **Projétil de Neve**:
     - O corpo Matter passa a dinâmico e acorda (`Matter.Sleeping.set(body, false)`).
     - Aplicação de **Squash & Stretch** na direção do voo (alongamento de 15% na direção do vetor por 80ms, com retorno elástico).
     - A escala do projétil diminui sutilmente (1.0 \(\to\) 0.70) criando profundidade 2.5D conforme viaja em direção à parede do fundo.
4. **Impacto Físico e Reação dos Alvos (IMPACT)**:
   - Os 4 alvos natalinos são corpos Matter suspensos por constraints (pêndulos reais).
   - Ao colidir, a lógica extrai a velocidade relativa dos dois corpos:
     $$\vec{v}_{\text{rel}} = \vec{v}_{\text{bola}} - \vec{v}_{\text{alvo}}, \quad v_{\text{rel}} = \|\vec{v}_{\text{rel}}\|$$
   - **Classificação de Impacto**:
     - _Soft hit_ (\(v_{\text{rel}} < 3.5\)): leve toque de neve, sem pontuação.
     - _Valid hit_ (\(3.5 \le v_{\text{rel}} < 12\)): acerto confirmado, transferência de momentum para o pêndulo com oscilação livre, som do material, confetes de neve e liberação do talismã mágico.
     - _Hard hit_ (\(v_{\text{rel}} \ge 12\)): impacto contundente com micro camera-kick (2px) e explosão radial ampliada de neve.
5. **Progressão da Moldura Mágica**:
   - Cada alvo completado envia um talismã mágico luminoso que se desprende do alvo e viaja em curva de Bézier iluminada até o soquete correspondente da moldura vitoriana.
   - A lâmpada mágica daquele quadrante se acende e o brilho ao redor da foto aumenta.
6. **Os Quatro Alvos com Identidade Material**:
   - **Alvo 1 (Madeira e Estrela)**: Tábua de madeira quadrada com estrela dourada; estalo seco de carvalho oco e lasquinhas mágicas.
   - **Alvo 2 (Boneco Gingerbread)**: Boneco de gengibre com glacê; impacto fofo com migalhas mágicas e sininho doce.
   - **Alvo 3 (Estrela Dourada)**: Estrela de madeira com laço de veludo; som cristalino e partículas douradas brilhantes.
   - **Alvo 4 (Sino de Natal)**: Sino metálico natalino; ressonância de sino de trenó que varia conforme a força do impacto.
7. **Prateleira Inferior — 4 Botões Táteis**:
   - 4 medalhões gravados em madeira e latão (♫, 🎄, ❄, 🔔) que reagem no mesmo frame a `pointerdown` (afundamento 3D de 4px, som de clique mecânico e iluminação).
   - Acionam brinquedos ambientais (música de caixinha, rajada de neve, piscar de luzes na árvore e sinos).
8. **A Grande Celebração e Brinquedo Livre (FREE_PLAY)**:
   - Ao acertar os 4 alvos: fanfarra triunfal, cascata completa de luzes natalinas, a câmera aproxima suavemente destacando a foto da família em tela cheia (`PHOTO_HERO`) por 2.5s.
   - Transição para modo de brinquedo livre: a criança pode continuar atirando bolas de neve e tocando nos botões sem restrição.

---

## 2. Tratamento da Fotografia

- **Enquadramento Proporcional**: `PhotoSurfaceObject` em modo `contain` estrito; **nunca** corta cabeças, estica ou distorce.
- **Suporte a Retrato e Paisagem**:
  - Foto vertical (retrato): moldura vitoriana clássica (45–55% da largura da tela).
  - Foto horizontal (paisagem): moldura horizontal elegante com galhos de pinheiro compensatórios no topo e base.
- **Proteção Facial Inteligente (`faceSafeZone`)**:
  - Trajetória balística, alvos e partículas volumosas nunca cruzam ou encobrem o rosto em repouso.
  - O brilho mágico da celebração ocorre exclusivamente na borda da moldura e atrás da foto, jamais como bloom sobre o rosto da criança.

---

## 3. Matriz de Aceite e Qualidade

| ID         | Requisito                                                                                        | Método de Prova                       |
| :--------- | :----------------------------------------------------------------------------------------------- | :------------------------------------ |
| **EST-01** | Domínio determinístico sem dependências de Phaser, React ou DOM.                                 | Testes unitários Vitest               |
| **EST-02** | Voo governado por Matter Physics com predição de trajetória coincidente (`TrajectorySimulator`). | Teste de simulação balística          |
| **EST-03** | Elástico modelado com dinâmica Verlet, modo taut e retorno elástico com ondas residuais.         | Teste de cinemática e inspeção visual |
| **EST-04** | Concha (pouch) com 4 fases de física (`snap`, `overshoot`, `settle`, `idle`).                    | Teste de física de concha             |
| **EST-05** | Projétil de neve com squash & stretch direcional no lançamento e rotação angular em voo.         | Verificação visual no canvas          |
| **EST-06** | Alvos suspensos com Matter bodies + constraints oscilando livremente como pêndulos.              | Verificação de física no canvas       |
| **EST-07** | Detecção de impacto via velocidade relativa com limiares soft, valid e hard.                     | Teste unitário de colisão             |
| **EST-08** | Foto da família em modo `contain` sem corte do rosto em retrato e paisagem.                      | Teste com fixtures de fotos reais     |
| **EST-09** | 4 Botões táteis com resposta no mesmo frame e efeitos sensoriais.                                | Teste E2E Playwright de interação     |
| **EST-10** | Diretor de Áudio com instâncias sonoras multicamadas, pitch dinâmico e ducking na fanfarra.      | Teste de diretor de áudio             |
| **EST-11** | Adaptação perfeita em 360, 390, 412, 430 e 768 CSS px.                                           | Teste de layout e evidência visual    |
| **EST-12** | Liberação completa de recursos e listeners no `destroy()`.                                       | Teste de ciclo de vida do Phaser      |
