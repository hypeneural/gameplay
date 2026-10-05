# Estilingue das Lembranças — Experiência Sensorial e Infantil

Documento de direção de experiência sensorial e imersiva para o jogo **Estilingue das Lembranças**, concebido segundo os princípios de `docs/experience/christmas/ART_BIBLE.md` e `docs/experience/christmas/CRYSTAL_CONTROL_STANDARD.md`.

---

## 1. Primeiros Cinco Segundos

- **O Olhar da Criança**:
  - A fotografia da família ou da criança surge no centro da tela, iluminada pela luz quente da sala natalina. O sorriso e o rosto são o primeiro ponto focal que captura o afeto da família.
  - Logo abaixo, o estilingue de madeira entalhada e latão polido se destaca com uma bola de neve fofa repousando no pouch de couro gravado com floco de neve.
- **Convite à Ação**:
  - A bola de neve pulsa com uma auréola suave de luz âmbar.
  - Uma seta translúcida e delicada indica o movimento para trás: _"Puxe e solte a bola de neve!"_.
  - Ao tocar, o estilingue responde no **mesmo frame**, esticando os elásticos e emitindo um sutil estalo de tração elástica.

---

## 2. Roteiro de Resposta Sensorial e Tátil

| Momento                           | Resposta Visual                                                                                                                                                                                                      | Som / Haptics                                                                                                                                                  | Acessibilidade (LOW / Reduced Motion)                                             |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Puxar o Estilingue**            | Elásticos deformam com física Verlet (modo taut: sem lag); pouch se estica; dots luminosos e seta projetam a trajetória exata no ar.                                                                                 | Estalo sutil de madeira, couro e borracha sob tensão em passos de 25%, 50%, 75% e 100% de tração.                                                              | Redução de partículas de tração; dots simplificados e estáticos no arco.          |
| **Soltar (Disparo)**              | Elástico chicoteia para frente com onda mecânica e overshoot; pouch executa ciclo de chicote (`snap` \(\to\) `overshoot` \(\to\) `settle`); bola ganha squash/stretch de 80ms na direção do voo e profundidade 2.5D. | Estalo nítido "twang!" do elástico chicoteando e suave zunido de ar cortado ("whoosh!"). Vibração `medium`.                                                    | Elástico retrai sem oscilações secundárias; voo suave sem tremor.                 |
| **Impacto no Alvo**               | Alvo oscila fisicamente como pêndulo real com amortecimento; explosão radial de neve fofa e confetes dourados proporcionais à velocidade relativa.                                                                   | Baque fofo de neve + som característico do material (madeira, biscoito, estrela cristalina ou sino de metal). Volume por \(v_{\text{rel}}\). Vibração `heavy`. | Explosão de neve reduzida de 35 para 10 partículas; oscilação do pêndulo mantida. |
| **Talismã Voando para a Moldura** | Um fragmento mágico cintilante desprende-se do alvo e viaja em arco luminoso até o canto da moldura.                                                                                                                 | Arpejo ascendente de harpa/carrilhão e clique luminoso ao travar no soquete.                                                                                   | Transição linear direta em vez de curva Bézier alongada.                          |
| **Acendimento da Moldura**        | Lâmpadas de fada ao redor do quadrante conquistado acendem em cascata com brilho quente âmbar.                                                                                                                       | Ressonância harmoniosa de sino natalino.                                                                                                                       | Lâmpada acende de forma direta sem fade pulsante prolongado.                      |
| **Toque nos 4 Botões Inferiores** | O medalhão afunda 4px em 3D, projeta sombra de contato e emite brilho perimetral imediato.                                                                                                                           | Clique mecânico de madeira e mola + efeito temático (melodia, vento, sino). Vibração `light`.                                                                  | Botão afunda sem micro-overshoot; mantém resposta sonora idêntica.                |
| **Grande Celebração (4/4)**       | As 4 lâmpadas cintilam juntas; a fita "Momentos que ficam para sempre" brilha em ouro; câmera faz zoom suave na foto da família (`PHOTO_HERO`).                                                                      | Fanfarra calorosa de orquestra natalina com sinos de trenó e harpa triunfal. Vibração `celebrate`.                                                             | Zoom suave substituído por iluminação constante; foto em nitidez máxima.          |
| **Brinquedo Livre (Free Play)**   | O estilingue recarrega indefinidamente; a criança pode continuar atirando nos alvos suspensos que reagem com balanços físicos livres.                                                                                | Efeitos sonoros contínuos com variação de pitch (0.97 a 1.03) para evitar fadiga auditiva.                                                                     | Sem limites de tiros; experiência lúdica e desestressante mantida.                |

---

## 3. Identidade Sensorial dos 4 Alvos

1. **Alvo de Madeira e Estrela**:
   - _Materialidade_: Carvalho rústico chanfrado com centro concêntrico vermelho e branco, coroado por estrela entalhada.
   - _Sensação_: Firme, robusto, com estalo de madeira oca e lasquinhas mágicas inofensivas.
2. **Alvo Gingerbread (Boneco de Gengibre)**:
   - _Materialidade_: Biscoito assado com relevo de glacê real branco e alvo na barriga.
   - _Sensação_: Acolhedora, fofa, com pequenas migalhas cintilantes e tilintar infantil.
3. **Alvo Estrela Dourada**:
   - _Materialidade_: Estrela de 5 pontas em folha de ouro envelhecido com laço de veludo carmesim.
   - _Sensação_: Luminosa, mágica, com cintilações de fada e notas de cristal puro.
4. **Alvo Sino de Natal**:
   - _Materialidade_: Sino clássico de latão com ramo de azevinho e fita vermelha.
   - _Sensação_: Vibrante, festiva, com ressonância metálica de trenó natalino que ecoa suavemente.
