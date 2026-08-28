# Linha de base privada — Puzzle Swap mobile

**Data:** 2026-08-24
**Plano:** CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY, tarefa E0.1
**Escopo:** inspeção local da rota de teste com derivados autorizados. Nenhuma
foto, URL de origem, nome de cliente ou captura foi versionada neste documento.

## Roteiro executado

1. Abrir a sessão privada local.
2. Verificar seleção de foto e chamada Jogar agora.
3. Abrir a capa do quebra-cabeça e conferir a foto hero.
4. Iniciar a partida e observar chrome, HUD e tabuleiro.
5. Repetir a entrada da partida nos tamanhos 390 × 844, 412 × 915,
   430 × 932 e 768 × 1024 CSS px.
6. Ler o console do navegador ao final.

## Resultado observado

| Viewport CSS |    Canvas | Posição vertical do canvas | Scroll da página | Resultado |
| ------------ | --------: | -------------------------: | ---------------: | --------- |
| 390 × 844    | 362 × 730 |                     83–813 |              não | íntegro   |
| 412 × 915    | 384 × 802 |                     83–885 |              não | íntegro   |
| 430 × 932    | 402 × 818 |                     83–901 |              não | íntegro   |
| 768 × 1024   | 724 × 904 |                     89–993 |              não | íntegro   |

- A foto selecionada aparece na lista, na capa e na partida.
- A capa usa texto simples em português e apresenta a foto antes do botão.
- A tela não cria scroll vertical acidental nos quatro tamanhos observados.
- O console não registrou erro ou aviso durante o roteiro.
- Esta evidência não substitui Android físico, LOW, movimento reduzido,
  pausa, dica, vitória e teardown; esses cenários pertencem às próximas gates.

## Achados priorizados

| Severidade | Achado                                                                                                                                                         | Reprodução                                                       | Dono proposto                      | Próxima tarefa |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- | -------------- |
| P1         | O shell React repete título/categoria enquanto o canvas mostra título, progresso, cronômetro e controles. A área de jogo parece ter duas barras de informação. | Abrir uma foto, tocar Jogar agora e iniciar a partida em 390 px. | apps/play e apresentação do Puzzle | E2.1 e E2.3    |
| P1         | Os textos Pronto e Brincadeira iniciada são estado interno, mas aparecem no cabeçalho destinado à família.                                                     | Mesma abertura da partida.                                       | apps/play                          | E2.1 e E6.1    |
| P2         | A instrução de troca é permanente no rodapé do canvas e reduz espaço disponível após a primeira ação.                                                          | Iniciar a partida e aguardar sem interagir.                      | apresentação do Puzzle             | E2.3           |
| P2         | O HUD funcional ainda tem aparência de barra separada do cenário; precisa de protótipo de hierarquia antes de investir em novos assets.                        | Iniciar a partida em 390 px.                                     | apps/play e apresentação do Puzzle | E2.1 e E2.5    |

## Interpretação

Esta linha de base confirma que a mecânica e o layout básico não precisam de
reescrita. A primeira melhoria visível deve ser a hierarquia: uma única camada
de status, mais área percebida para o tabuleiro e orientação contextual. A
mudança não deve tocar no domínio, na regra de dica nem na alternativa
toque–toque.

## Evidência e privacidade

As capturas usadas na revisão ficaram apenas na sessão privada de validação e
não foram gravadas no repositório. Revisões futuras devem referenciar estado,
viewport e fixture segura, nunca anexar imagem de cliente.

## Verificação posterior da primeira correção

Em 390 × 844 CSS px, após a simplificação do shell React:

- o título/categoria duplicado e o status Pronto/Brincadeira iniciada não são
  mais desenhados para a família;
- o botão Sair do jogo permanece visível e o HUD de Phaser continua sendo a
  única fonte visual de título, progresso, tempo e controles;
- o console continuou sem erros ou avisos.

O anúncio acessível e os seletores de teste continuam presentes, mas ficam
fora da área visual. O comparativo de cronômetro/progresso DOM versus Phaser
segue pendente em E2.1.
