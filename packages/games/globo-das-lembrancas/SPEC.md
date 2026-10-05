# Globo de Neve das Lembranças — Especificação

Experiência fotográfica infantil e familiar em formato de brinquedo digital natalino.
Uma única foto escolhida da sessão de Natal é o coração de um diorama tridimensional dentro
de uma cúpula de vidro de cristal com caixinha de música de corda.
Primeira conclusão alvo entre 50–75 segundos, sem derrota, limite punitivo de tempo ou pontuação estressante.
Após a revelação heroica da foto, a experiência permanece em modo de brinquedo livre (_free play_).

## Contrato Jogável

1. **Primeira Ação (5 segundos):** Na base de mogno entalhado com ouro, uma chave de corda de latão convida ao toque com pulso suave. A criança gira a chave (gesto circular contínuo) ou toca nela repetidamente. Cada 45° de giro emite um estalo de catraca mecânica com clique auditivo e haptics leve (`light`). Três voltas completas (progresso 1.0) completam a corda da caixinha de música.
2. **Vapor de Inverno:** Ao completar a corda, o calor da música faz surgir uma suave camada de condensação/vapor no vidro sobre a foto. Uma dica sutil indica o gesto de passar o dedinho.
3. **Desembaçar a Foto:** A criança passa o dedo sobre o vidro; uma máscara circular aveludada apaga o vapor de forma suave e interpolada. A grade lógica matemática (16×16 células) computa a cobertura sem ler pixels na GPU. As células na `faceSafeZone` possuem peso duplo. Ao atingir 65% de limpeza, o vapor restante evapora em faíscas brilhantes de Natal.
4. **As 4 Gemas Musicais:** Na base de madeira, 4 gemas lapidadas (Rubi, Esmeralda, Safira e Ouro) piscam suavemente. Ao tocar em cada uma, a gema acende com brilho pulsante e toca uma nota harmônica de carrilhão (C5, E5, G5, C6).
5. **A Grande Celebração:** Com as 4 gemas acesas, o diorama interno se ilumina com luz âmbar aconchegante, a caixinha de música toca a melodia triunfante completa, a foto da família avança para o primeiro plano em moldura nobre por 3 segundos (_photo hero_).
6. **Brinquedo Livre (Free Play):** Após a celebração, o globo permanece ativo para brincadeira contínua: deslizar o dedo cria turbilhões fluidos de neve com física centrípeta, tocar no vidro emite o som cristalino ("clink!") com ondas de refração circulares, e tocar nas árvores do fundo faz cair neve suave.

## Tratamento da Foto e Apresentação

- **Derivada Utilizada:** `game` WebP carregada previamente pelo runtime.
- **Enquadramento Proporcional:** `PhotoSurface` em modo `contain` estrito; **nunca** corta cabeças, estica ou distorce a proporção.
- **Suporte Completo a Retrato, Paisagem e Quadrada:**
  - Fotos verticais (2:3, 3:4): preenchem harmonicamente a altura focal da cúpula com moldura dourada e sombra de contato.
  - Fotos horizontais (16:9, 4:3): adaptam-se pela largura sem cortes; o espaço superior e inferior recebe guirlanda de pinheiro e mini-lâmpadas âmbar, evitando espaços vazios ou barras pretas.
- **Proteção Facial Inteligente:** Partículas de neve em repouso são repelidas suavemente para fora da `faceSafeZone`, mantendo as expressões e sorrisos sempre limpos.
- **Parallax 2.5D:** Ao deslizar o dedo ou inclinar levemente o aparelho, os planos do diorama (fundo de montanhas, foto central e reflexos frontais) movem-se com paralaxe sutil (\(\pm 8\)px), transmitindo profundidade de brinquedo real.

## Matriz de Aceite e Qualidade

| ID       | Requisito                                                                                    | Prova                         |
| -------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| GLOBO-01 | Domínio determinístico e puro sem dependências de DOM, React ou Phaser.                      | Teste unitário vitest         |
| GLOBO-02 | Chave de corda com arraste circular e alternativa de toques repetidos com alvo \(\ge 52\)px. | Teste de unidade + runtime    |
| GLOBO-03 | Grade lógica de vapor sem leitura de GPU, com bônus na `faceSafeZone`.                       | Teste de unidade de grade     |
| GLOBO-04 | Diretor de áudio com priorização, cooldown anti-spam de 90ms e ducking suave.                | Teste de diretor de áudio     |
| GLOBO-05 | Adaptação perfeita em 360, 390, 412 e 430 CSS px sem corte da cúpula ou controles.           | Validação visual mobile       |
| GLOBO-06 | Perfil LOW desativa pós-efeitos pesados e reduz partículas de 60 para 24.                    | Teste de qualidade de runtime |
| GLOBO-07 | Destruição limpa no unmount com liberação total de texturas e listeners no `SceneScope`.     | Teste de ciclo de vida        |
