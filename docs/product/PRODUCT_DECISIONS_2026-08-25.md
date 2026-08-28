# Decisões de produto — jogos de Natal Evydência

**Data:** 2026-08-25
**Origem:** decisão do proprietário registrada nesta conversa.
**Abrangência:** catálogo de jogos de Natal com fotos; primeiro consumidor:
Puzzle Swap.

## Promessa da experiência

Cada cliente do **Estúdio de Fotos de Natal Evydência** recebe um catálogo de
brincadeiras que transforma suas próprias fotos em uma lembrança jogável. A
foto é sempre o centro da cena. O jogo parece um aplicativo de celular: uma
ação por vez, alvos grandes, resposta imediata, som opcional e nenhum termo
técnico na interface.

## Público, autonomia e duração

| Decisão              | Escolha aprovada                                                                                   | Consequência de implementação                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Público principal    | Crianças de 6 a 10 anos.                                                                           | Linguagem curta, primeira ação visível, botões principais de pelo menos 52 px e alternativa toque–toque ao arraste. |
| Público complementar | Pais, avós e familiares de todas as idades.                                                        | Sem infantilizar em excesso, sem depender de rapidez, leitura longa ou memória de controles.                        |
| Autonomia            | A criança deve conseguir iniciar e jogar sozinha; um adulto pode acompanhar, mas não é necessário. | Não haverá tutorial separado, cadastro ou instrução extensa antes da primeira ação.                                 |
| Duração              | Uma rodada inicial deve caber normalmente em 2–4 minutos.                                          | Cronômetro informa e celebra, nunca encerra ou pune a partida.                                                      |
| Dificuldade inicial  | `Brincadeira` com 12 peças, mantendo a foto proporcional.                                          | Puzzle começa com grade 3×4 em retrato e 4×3 em paisagem.                                                           |
| Dica                 | Disponível por toque desde o início; uma sugestão suave aparece após 7 segundos sem progresso.     | A dica destaca o destino e a peça correspondente, sem completar a troca.                                            |
| Progressão           | Opcional, visível só depois da vitória.                                                            | `Mais desafio` abre nova rodada com 16 peças (4×4), ainda sem cronômetro eliminatório.                              |

## Vitória e próximo passo

Depois da comemoração curta e da foto completa, todo jogo deve apresentar uma
folha de ações no estilo aplicativo, sem tirar a foto de cena:

1. **Brincar de novo** — reinicia a mesma brincadeira e conserva o nível
   escolhido.
2. **Mais desafio** — inicia a próxima dificuldade que o jogo declarou no seu
   contrato. No Puzzle Swap, muda de 12 para 16 peças.
3. **Ver outros jogos** — retorna ao catálogo da mesma sessão e preserva a
   foto escolhida para o próximo jogo.
4. **Compartilhar** — abre o painel nativo do celular para compartilhar o
   link seguro da sessão; é uma ação secundária, nunca automática.

Uma nova foto é escolhida naturalmente no catálogo. Não se força uma nova
seleção ao terminar uma partida, nem se transforma a vitória em uma tela de
marketing.

## Memory — primeira rodada testável

**Decisão registrada em 2026-08-27:** a construção do Memory está autorizada
antes da passagem física final em Android. Essa exceção libera desenvolvimento
e teste local; não substitui a evidência mobile exigida para liberar o jogo.

| Assunto                     | Decisão                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rodada inicial              | Quatro pares, oito cartas e sem seletor de dificuldade infantil.                                                                                                         |
| Fotos                       | A foto escolhida no Hub é a âncora obrigatória; outras três fotos elegíveis da mesma sessão completam o subconjunto.                                                     |
| Interação                   | Toque em duas cartas. Acerto permanece visível; erro espera brevemente e fecha as duas juntas, sem punição.                                                              |
| Recomeço                    | **Brincar de novo** usa o replay já existente do shell: ele desmonta o Phaser anterior e cria um novo `GameRun`, com novo deck.                                          |
| Escopo desta primeira fatia | A partida completa, pausa e conclusão precisam funcionar com derivadas autorizadas. Áudio, arte preparada, telemetria e a liberação Android seguem como etapas próprias. |

## Direção visual aprovada

A direção é **híbrida natalina**: fotografia real, nítida e prioritária em
primeiro plano; cenário ilustrado de noite de Natal, luz quente, neve limitada
e moldura com material de presente ao redor. O cenário deve deixar espaço
calmo atrás do rosto. Personagens, fontes externas ou arte nova ainda passam
pela Fábrica de Assets e por revisão humana antes de entrar no navegador.

## Presença do estúdio

O catálogo, capa e ações pós-vitória podem mostrar uma assinatura discreta do
estúdio; o tabuleiro em si continua livre para a foto e a brincadeira.

- **Nome visível:** Estúdio de Fotos de Natal Evydência
- **WhatsApp:** [(48) 99848-3594](https://wa.me/5548998483594)
- **Site:** [fotosdenatal.com](https://fotosdenatal.com/)
- **Instagram:** [@estudioevydenciaa](https://www.instagram.com/estudioevydenciaa/)

Os links externos só abrem por um gesto explícito de adulto/jogador. Não
interrompem uma partida em curso e não recebem identificador da foto.

## Compartilhamento e prévia social

O botão de compartilhar usa a [Web Share API do
W3C](https://www.w3.org/TR/web-share/): somente após toque, com `title`,
`text` e `url` HTTPS. Quando não houver painel nativo, a alternativa é copiar
o link e explicar o resultado em português simples. Cancelar o painel não é
erro para a família.

O protocolo [Open Graph](https://ogp.me/) pede metadados no `head` que o robô
recebe, incluindo `og:title`, `og:type`, `og:image` e `og:url`. Portanto,
alterar `document.head` no React não resolve a prévia de WhatsApp, Instagram
ou outra rede: a publicação precisará de resposta HTML do servidor para cada
link público.

**Regra de privacidade:** a prévia padrão é uma arte natalina genérica e
aprovada do estúdio. Uma foto de cliente só poderá ser usada como `og:image`
quando existir consentimento específico para compartilhamento social, uma
derivada própria sem nome/metadado, autorização do backend antes da entrega,
URL HTTPS temporária e revogável, e uma política de cache compatível. Não usar
foto aleatória de sessão por padrão: robôs podem guardar e redistribuir a
prévia fora do controle do jogo.

## Pendências conscientes

1. Definir o domínio público canônico dos jogos antes de publicar `og:url` e
   `og:image`; o repositório atual não deve fingir que `localhost` é URL
   compartilhável.
2. **Concluída no repositório:** a autorização e a renderização de metadados
   por sessão estão em `apps/catalog-server`; falta configurar o domínio, o
   Nginx e validar a prévia no WhatsApp durante a liberação.
3. Cada novo jogo declara sua dificuldade seguinte e suas ações de vitória no
   contrato de experiência; não haverá botão que prometa um desafio inexistente.
