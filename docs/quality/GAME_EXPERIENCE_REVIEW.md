# Rubrica de revisão da experiência de jogo

Esta rubrica é a porta de aprovação de uma alteração percebida pela criança ou
pela família. Ela complementa os testes automatizados: uma interface canvas
pode passar em asserts de DOM e ainda esconder a foto, confundir o gesto ou
parecer pesada no celular.

## Como registrar uma revisão

Para cada alteração visual ou de interação, preencha um registro curto na
pull request ou no plano que a autorizou:

| Campo                  | Registro obrigatório                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Alteração e benefício  | O que a criança percebe e qual dificuldade ela resolve.                                                            |
| Rota e estado          | Rota segura, fixture não identificável e estado exato da partida.                                                  |
| Perfil e viewport      | NORMAL, LOW ou movimento reduzido; 390, 412, 430 ou 768 CSS px.                                                    |
| Evidência              | Comando automatizado, inspeção no navegador e, quando houver foto real, observação privada sem arquivo versionado. |
| Custo e limites        | Requests, bytes conhecidos ou medidos, objetos/tweens/sons temporários e como terminam.                            |
| Alternativa sem efeito | O comportamento visual e funcional quando o efeito está omitido ou o movimento é reduzido.                         |
| Resultado              | Aprovado, P1, P2 ou P3; dono e data para todo item aberto.                                                         |

Não registrar foto de cliente, caminho de disco, token de sessão ou captura
privada no repositório.

## Gate 1 — Jogador

Perguntas observáveis:

- A foto escolhida, a próxima ação e o tabuleiro são entendidos sem linguagem
  técnica?
- O primeiro toque recebe resposta; a seleção, a troca útil, a tentativa sem
  avanço, a dica, a pausa e a vitória têm respostas diferentes e gentis?
- A dica aponta uma ação possível sem mover a peça pela criança?
- Toque–toque e arraste levam ao mesmo resultado; pausa e saída não deixam a
  partida parcialmente interativa?

Evidência mínima: cenário Playwright de capa, primeira troca, seleção, dica,
arraste, pausa, vitória, retorno e destruição; passagem manual no navegador
para o estado alterado.

## Gate 2 — Visual

Perguntas observáveis:

- A foto continua sendo o plano principal, com rostos, grade e ação legíveis?
- Moldura, luz, neve, cenários e VFX pertencem à direção natalina e ficam fora
  da zona protegida da foto?
- Texto, contraste, alvo de toque e hierarquia seguem legíveis em retrato e
  paisagem, em foto clara e escura?
- O efeito tem começo, fim e motivo; o estado reduzido preserva significado
  por contraste estático em vez de simplesmente desaparecer?

Evidência mínima: captura ou inspeção visual em 390, 412, 430 e 768 CSS px,
incluindo NORMAL, LOW e movimento reduzido. Capturas com foto real ficam apenas
na sessão privada de revisão.

## Gate 3 — Desempenho

Perguntas observáveis:

- A alteração carrega somente a variante de foto e os assets aprovados para a
  cena ativa?
- Quantos requests, bytes transferidos, bytes visuais, texturas estimadas,
  timers, tweens, partículas e instâncias de áudio ela cria?
- Todo recurso temporário tem limite, dono de ciclo de vida e encerramento em
  troca, pausa, saída e `destroy`?
- LOW e movimento reduzido são escolhas intencionais e continuam concluíveis?

Evidência mínima: `pnpm validate`, contagem ou instrumentação disponível e,
quando uma meta numérica for proposta, coleta privada no Android de referência
conforme o [protocolo Android](ANDROID_REFERENCE_PROTOCOL.md). Sem aparelho de
referência, registrar tendência e custo conhecido, nunca um orçamento inventado.

## Gate 4 — Acessibilidade e controle

Perguntas observáveis:

- Controles alcançáveis possuem nome simples, foco e alvo de toque adequado?
- A criança pode concluir pelo toque sem depender de arraste, e a pausa impede
  novas interações?
- Som respeita o gesto inicial, o botão de som e o modo mudo; todo feedback
  importante permanece compreensível sem áudio?
- Movimento reduzido remove repetição decorativa, mas preserva seleção, dica,
  troca e vitória?

Evidência mínima: cenários automatizados de som, toque, arraste, pausa,
movimento reduzido e saída; inspeção manual do foco e da leitura no viewport
mais estreito.

## Decisão e severidade

Uma alteração só é **aprovada** quando os quatro gates têm evidência adequada
ou uma exceção explicitamente aceita pelo proprietário. Use a mesma severidade
do plano:

| Nível | Significado                                                           | Conduta                                                    |
| ----- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1    | Impede a ação principal, esconde a foto ou quebra a sensação de jogo. | Corrigir antes de continuar com novos assets ou polimento. |
| P2    | Degrada compreensão, acabamento, contraste ou resposta importante.    | Corrigir antes de liberar a etapa.                         |
| P3    | Polimento sem risco para a brincadeira principal.                     | Registrar dono e data de retorno.                          |

O registro deve apontar a tarefa do plano, a pull request quando houver e os
comandos executados. A aprovação visual não substitui `pnpm validate`; os dois
são necessários para encerrar uma etapa.
