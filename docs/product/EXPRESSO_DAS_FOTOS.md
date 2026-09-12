# Expresso das Fotos — decisão de produto V2

**Estado:** produto reorientado em 29-08-2026. O vertical slice local V2 substitui o protótipo rejeitado, mas ainda precisa de sign-off criativo antes da validação ampla de aparelhos.  
**Plano canônico:** [CG-EXPRESSO-DAS-FOTOS-V2](../exec-plans/CG-EXPRESSO-DAS-FOTOS-V2-IMPLEMENTATION.md).  
**Público:** crianças de 6 a 10 anos e familiares; uma criança deve conseguir iniciar sem explicação adulta.  
**Duração:** até seis entregas, 2–4 minutos, sem cronômetro eliminatório.

## Promessa

Expresso das Fotos é uma aventura 2D natalina de observação e viagem. A criança recebe um bilhete com uma foto da própria sessão, encontra a estação que tem a mesma foto e faz o trenzinho entregar aquela lembrança à Árvore das Memórias.

A própria foto é a heroína: não é rosto a ser acertado, textura de fundo, obstáculo, recorte decorativo ou alvo de filtro. Ela é a pista da missão, o destino físico e o ornamento final.

## Fantasia e primeira ação

- **Fantasia:** a estação de Natal precisa entregar fotos para acender sua árvore.
- **Frase de capa:** “Suas fotos viram estrelas de Natal.”
- **Regra da primeira parada:** “Ache a foto igual.”
- **Ação principal:** tocar na estação que mostra a mesma foto do bilhete.

Nos primeiros cinco segundos, a pessoa vê a foto escolhida grande e proporcional, uma frase e três estações-foto grandes no mesmo mundo. A primeira parada liga visualmente bilhete, estação, chave e trilho. Áudio pode reforçar, mas nunca explica a regra.

## Ciclo jogável

```text
bilhete com foto-alvo
→ criança compara três estações
→ toca a estação correspondente
→ chave de trilho muda
→ expresso segue a rota visível
→ foto é entregue como estrela
→ árvore registra o progresso
```

A escolha de outra estação recebe retorno acolhedor: o cartão afunda e volta, enquanto o bilhete realça a foto-alvo uma vez. Não existe X, vermelho, buzzer, vida perdida, pontuação de erros, personagem triste ou viagem enganosa. Após sete segundos sem ação, uma linha breve mostra a relação bilhete → estação correta; ela nunca joga pela criança.

## Fotos disponíveis e dificuldade honesta

| Fotos autorizadas | Jogo oferecido                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| 3 ou mais         | Três estações com fotos reais: alvo e duas diferentes.                                                      |
| 2                 | Duas estações-foto e uma estação fechada claramente decorativa.                                             |
| 1                 | Modo descoberta: uma estação-foto e duas plataformas fechadas; não se simula um desafio de correspondência. |

A foto escolhida no catálogo é a âncora de capa e vitória. A seleção de até seis fotos continua determinística, trabalha apenas com identificador, posição e orientação seguros e nunca consulta pixels, URL, path ou nome de cliente. A orientação pode variar entre paradas quando o catálogo permitir, mas a proporção sempre é preservada.

## Progressão voluntária — Rota Estrela

**Decisão de produto — 29-08-2026:** depois de concluir **100% da Rota das
Lembranças** pela primeira vez, a vitória oferece, além de “Brincar de novo”, a
opção **“Nova rota — mais desafiadora”**. Ela nunca troca a dificuldade durante
uma rodada, não é mostrada antes da primeira vitória e não mede tempo, erros ou
velocidade.

| Percurso                       | Contrato para a criança                   | Regras de comparação                                                                        |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `normal` — Rota das Lembranças | “Ache a foto igual.”                      | Três estações, dica depois de 7 s e ritmo de descoberta.                                    |
| `desafio` — Rota Estrela       | “Agora há quatro estações para comparar.” | Quatro estações físicas em grade 2 × 2, todas com foto real diferente; dica depois de 10 s. |

A Rota Estrela só é elegível com pelo menos quatro fotos autorizadas e distintas
na sessão. O destino não pode repetir a mesma plataforma nas duas paradas
anteriores e o conjunto dá preferência a fotos de enquadramento parecido quando
isso for conhecido pelo catálogo, mas nunca inspeciona pixels, rosto ou pessoa.
Ela não cria cópia da foto-alvo, não fecha plataformas para fingir dificuldade e
não oculta a ação principal. Cada estação conserva área de toque de 64 CSS px ou
mais.

Na vitória, a árvore permanece em cena e a folha de ações apresenta, nesta
ordem: **Brincar de novo**, **Nova rota — mais desafiadora** (quando elegível),
**Ver outros jogos** e **Compartilhar**. O shell fornece `difficulty: 'desafio'`
somente após essa escolha explícita; domínio recebe o valor no contexto, mas não
persiste progresso, usa `localStorage` nem conhece a interface de vitória. Se a
sessão tiver menos de quatro fotos distintas, a opção não aparece em vez de
prometer um desafio que ela não pode cumprir.

## Telas e ritmo

| Estado         | Conteúdo para a criança                                 | Ação                                                                 |
| -------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Capa           | Foto âncora no bilhete e promessa curta.                | Jogar agora.                                                         |
| Missão         | Bilhete com foto-alvo, três estações e expresso pronto. | Tocar a estação igual.                                               |
| Escolha gentil | Retorno da estação diferente e dica visual mínima.      | Comparar e tentar outra estação.                                     |
| Viagem         | Chave, trem, trilho e plataforma contam a consequência. | Aguardar brevemente; pausa disponível.                               |
| Entrega        | Selo no bilhete e novo ornamento na árvore.             | Observar; próxima missão entra.                                      |
| Pausa          | Cena estabilizada com Continuar, Som e Sair.            | Retomar ou sair sem perder estado.                                   |
| Vitória        | Árvore com as fotos entregues; foto âncora em destaque. | Brincar de novo, ver outros jogos ou compartilhar pelo shell seguro. |

O HUD tem uma única origem de estado: “Estrelas entregues 4 de 6”. Pausa e som ficam no mesmo cabeçalho. Não há contador sem contexto, painel técnico, nome de pessoa ou idioma que não seja português simples.

## Direção A1 — diorama natalino premium

É uma estação de inverno 2D, vista frontal em três quartos: céu azul-petróleo, neve baixa, janelas âmbar, madeira verde-pinho, latão fosco, papel marfim e trem de madeira laqueada e metal usinado. A sensação realista vem de materiais, perspectiva, sombra de contato, profundidade em planos e luz com causa visível.

A hierarquia é invariável:

```text
foto → ação/estação → instrução curta → cenário
```

Foto, HUD e ação vivem livres de partículas. A moldura e reflexo pertencem ao passe-partout externo, não à foto. Nenhum shader, normal map, máscara animada, correção de cor, blur, tint ou distorção altera derivadas de sessão.

O cenário usa L0 céu/vila, L1 estação, L2 jogo e L3 props de canto. L3 jamais bloqueia uma estação ou uma foto. Normal já é a aparência final; HIGH é bônus mensurado e nunca pré-requisito para entendimento.

## Toque, movimento e conforto

A estação inteira é um alvo de pelo menos 64 CSS px no menor viewport. Cada uma tem idle, pressed, gentle-feedback, hinted, selected e closed. O toque direto produz pressão e confirma a estação no mesmo evento; segundo dedo, cancelamento, pausa e saída não criam fila.

O gesto completo é um toque único na estação, portanto uma criança não precisa escolher entre “comparar fotos” e “guiar lateralmente o trem”.

A chave sempre se move antes da partida. O trem acelera, percorre a rota, freia e chega à estação que a criança tocou. Rodas, sombra, cabine e vapor derivam do mesmo progresso; o trem não desliza em diagonal fora do trilho, gira como carro ou recebe física aleatória. Em movimento reduzido, os mesmos eventos viram poses claras e estáticas.

## Som, efeitos e acessibilidade

O primeiro gesto pode desbloquear áudio, mas o feedback visual não espera por ele. Os papéis de som são pressão de madeira, chave, partida, vapor, chegada, selo, dica e final da árvore. Som possui fonte/licença, volume, cooldown e cleanup aprovados no manifesto. Mudo preserva toda a leitura visual.

Efeitos são finitos e funcionais: vapor curto, brilho no trilho, selo de entrega, neve distante e pequenas estrelas finais. Não há confete em loop, estroboscópio, câmera tremida, reflexo sem fonte ou efeito sobre foto. LOW remove decoração; movimento reduzido remove animação contínua; ambos conservam foto, toque, dica, pausa e vitória.

## Privacidade, mídia e runtime

- Só derivados autorizados chegam ao runtime. Original, path, filename, token, URL arbitrária e nome de cliente ficam fora do browser, domínio, analytics, arte e screenshot versionado.
- Acesso a mídia continua autorizado no backend antes de X-Accel-Redirect em produção.
- O jogo carrega apenas as variantes necessárias da rota; não baixa o catálogo inteiro nem cria nova textura durante viagem.
- React recebe apenas eventos tipados do bridge; não recebe Scene ou Phaser.Game.
- Uma entrada cria um Phaser.Game e saída encerra listeners, timers, tweens, sons e texturas da rodada antes de destroy.

## Aceite de produto

| ID       | Requisito                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------- |
| EDFV2-01 | Em até cinco segundos, foto, primeira ação e consequência são entendidas sem ajuda adulta.               |
| EDFV2-02 | O domínio usa foto-alvo, estações candidatas e rota ferroviária determinísticos; não usa faixa abstrata. |
| EDFV2-03 | A estação é o único alvo jogável principal, tem 64 CSS px ou mais e responde no mesmo/próximo frame.     |
| EDFV2-04 | Chave, trilho e locomotiva usam a mesma geometria; o trem não recebe tween x/y independente.             |
| EDFV2-05 | Escolha diferente é acolhedora e não consome progresso.                                                  |
| EDFV2-06 | Pausa, resize e saída preservam ou limpam com segurança a apresentação em cada fase.                     |
| EDFV2-07 | Foto permanece proporcional, sem filtro e prioritária em capa, missão, estações e vitória.               |
| EDFV2-08 | NORMAL é premium sem filtro WebGL; LOW e movimento reduzido mantêm jogo completo.                        |
| EDFV2-09 | Nenhuma matriz ampla de aparelhos é iniciada antes do vertical slice e do gate criativo D5.              |
