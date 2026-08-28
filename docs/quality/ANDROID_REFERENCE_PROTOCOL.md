# Protocolo privado de referência Android

**Estado:** pronto para uso; aguarda a escolha do aparelho de referência pelo
proprietário.

## Objetivo

Medir a experiência real de uma partida do Puzzle Swap sem coletar dados de
cliente, sem publicar fotos e sem transformar um único aparelho em regra
universal.

## Dados mínimos do registro

| Campo     | Valor a registrar                                  | Não registrar                      |
| --------- | -------------------------------------------------- | ---------------------------------- |
| Aparelho  | fabricante e modelo                                | número de série, conta ou telefone |
| Sistema   | versão do Android                                  | identificador do dispositivo       |
| Navegador | nome e versão                                      | histórico, cookies ou conta        |
| Build     | commit/branch e data                               | URL com token de sessão            |
| Cenário   | NORMAL, LOW ou movimento reduzido; fixture segura  | foto de cliente                    |
| Resultado | duração, observação de fluidez, erros e severidade | telemetria identificável           |

## Preparação

1. Atualizar o build local e confirmar pnpm validate.
2. Usar somente derivado de teste autorizado.
3. Fechar apps que possam alterar de forma relevante bateria, rede ou
   temperatura; registrar se o aparelho está em economia de energia.
4. Abrir uma sessão privada sem nome de cliente e confirmar que a foto não
   será capturada ou compartilhada.
5. Repetir cada cenário três vezes antes de concluir que há regressão.

## Roteiro de uma rodada

1. Abrir a lista e escolher uma foto.
2. Ler a capa e iniciar a brincadeira.
3. Trocar duas peças por toque–toque.
4. Fazer uma troca por arraste.
5. Pedir uma dica e confirmar que ela mostra duas peças úteis.
6. Pausar, retornar e sair.
7. Concluir uma partida e observar a vitória.
8. Repetir em NORMAL, LOW e movimento reduzido.
9. Ocultar e retornar ao navegador/app durante a partida.

## Observações obrigatórias

- Ações respondem de modo previsível ao toque.
- A foto, a grade e os controles permanecem legíveis.
- Não há scroll acidental, canvas duplicado, som após sair ou falha de retorno.
- Neve, luzes, dica e vitória não encobrem rosto, instrução ou botão.
- Qualidade baixa e movimento reduzido preservam ação e confirmação.
- Registrar p50/p95/p99, texturas e contadores somente quando o Laboratório de
  Desempenho E4 estiver pronto; antes disso registrar observação qualitativa.

## Critério de conclusão

O protocolo só deixa de estar pendente quando houver aparelho de referência,
três passagens por cenário e relatório agregado. Um orçamento numérico é
definido depois dessa coleta, nunca antes.
