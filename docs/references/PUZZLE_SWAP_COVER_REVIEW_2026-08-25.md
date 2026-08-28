# Revisão visual da capa — Puzzle Swap

**Data:** 2026-08-25
**Plano:** CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY, tarefa E2.2
**Escopo:** rota local privada com fixtures seguras. Nenhuma foto de cliente,
token de produção ou captura da família foi guardado no repositório.

## Decisão revisada

A capa apresenta a foto derivada primeiro, dentro da moldura natalina. A ação
principal vem em seguida e a decoração somente apoia a cena: neve leve fica
dentro da moldura, fora do botão; o cenário fica atrás da foto; não há rótulo
de orientação nem estado técnico para quem joga.

## Roteiro e resultado

| Estado                    | Evidência                                      | Resultado                                                                                                                |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Foto-retrato, capa        | revisão manual local em 390 × 844 CSS px       | foto proporcional, `object-fit: contain`, CTA visível com 54,8 px e sem overflow horizontal                              |
| Foto-paisagem, capa       | E2E `mobile photo selection…`                  | a derivada paisagem é entregue à capa, permanece proporcional e não recebe rótulo horizontal/vertical                    |
| Redução de movimento      | E2E `Puzzle cover preserves…`                  | CTA e flocos deixam de ter ciclo perceptível; foto, texto e ação continuam visíveis                                      |
| Matriz responsiva         | os dois cenários E2E em 390, 412, 430 e 768 px | 8 aprovações; ação e moldura continuam dentro da largura disponível                                                      |
| Som de controles do shell | unitário `playInterfaceTap`                    | o som breve começa somente pela função chamada no gesto do botão e interrompe a resposta anterior antes de iniciar outra |

Na inspeção manual de 390 px, o painel mediu 334,7 px de largura; a prévia,
286,5 px; e o botão, 286,5 × 54,8 px. A página reportou largura de conteúdo
de 375 px para viewport de 390 px, portanto sem rolagem horizontal. O console
não apresentou erro ou aviso durante a abertura.

## Rubrica e achados

| Aspecto           | Resultado | Achado                                                                         |
| ----------------- | --------- | ------------------------------------------------------------------------------ |
| Foto protagonista | aprovado  | a moldura não distorce a derivada e o cenário não compete com ela              |
| Primeira ação     | aprovado  | texto simples em português e alvo acima de 52 px                               |
| Natalidade        | aprovado  | verde-pinho, dourado, laço, luz discreta e neve finita apoiam a lembrança      |
| Acessibilidade    | aprovado  | movimento reduzido remove a repetição decorativa sem remover leitura ou início |
| Acabamento mobile | aprovado  | sem overflow horizontal na matriz revisada                                     |

Não foi encontrado P1, P2 ou P3 novo nesta revisão. A validação ainda não
substitui a passagem em Android físico, que permanece em E7.2.

## Próxima porta

E2.2 está concluída. A próxima evidência transversal é E7.1: ampliar a matriz
de estados da partida e manter a revisão humana antes de atualizar qualquer
baseline visual.
