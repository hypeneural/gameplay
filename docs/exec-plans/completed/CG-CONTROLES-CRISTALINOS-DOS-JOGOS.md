# Controles cristalinos em todos os jogos

**Estado:** concluído e validado localmente em 2026-09-07; autorizado pelo
proprietário na mesma data.
Complementa o plano do Hub e adota o
[padrão de controles cristalinos](../../experience/christmas/CRYSTAL_CONTROL_STANDARD.md).

1. Criar primitivas compartilhadas de vidro, ícones e pressão finita em theme,
   independentes do motor no bundle inicial, com cancelamento e resize seguros.
2. Aplicar aos controles de Memory, Puzzle, Expresso, Guirlanda, Mosaico e
   Trinca; preservar hit areas, máquinas de estado e políticas de cada jogo.
3. Estilizar os cartões de pausa e suas ações; elevar também sair,
   compartilhar, retry e ações de conclusão compostas por React.
4. Conferir resposta sonora de pausa/retomada, dica, som e navegação, sem
   duplicar vozes nem tocar depois de mudo/saída.
5. Atualizar as skills de direção/revisão, revisar visualmente os seis jogos
   em mobile e executar checks, testes de lifecycle e mapa do repositório.

Aceite: nenhuma regressão de área útil ou gesto, materiais consistentes,
feedback perceptível, pausa preservando a partida e zero recurso residual
após sair. Homologação física e publicação permanecem nos gates do plano
principal; esta tarefa não altera regras de jogos ou autorização de sessões.

## Implementação revisável

- Material/ícones/pressão compartilhados em `theme`, sem importar Phaser no
  bundle inicial. Descarte acompanha substituição do alvo e shutdown.
- Seis jogos integrados, incluindo cartões de pausa, menus da Trinca, cartas
  do Memory, molduras do Expresso e dock/material da oficina no Mosaico.
- React integrado em sair, compartilhar, erro/retry e ações de conclusão.
- Mudo propagado por bridge tipado; contexto estável evita reinício do canvas.
- Pausa de página separada da pausa do jogo. Caixa da Guirlanda e trem parado
  respondem ao toque. Mosaico permite ampliar a lembrança sem baixar outra foto.
- Telefone baixo recebe margens menores; Memory escolhe cartas maiores quando
  a composição confortável de duas/três colunas não cabe na altura disponível.
- Revisão detalhada e próximos refinamentos artísticos em
  [mundo natalino dos jogos](../../quality/JOGOS_MUNDO_NATALINO_REVIEW_2026-09-07.md).

## Validação final

`pnpm validate --workers=2` passou: 276 testes unitários em 61 arquivos,
177 cenários de navegador e três pulos intencionais do ciclo repetido de
Memory fora do perfil principal. Tipagem, lint, arquitetura, Knip, formato,
mapa e build aprovados. As duas skills passaram na validação de estrutura.

Revisão visual dos seis jogos em 360/390/412/430/768 px; nova passagem em
360 × 640 após a correção de área útil. LOW e movimento reduzido conferidos
separadamente nos seis jogos. O visor do Mosaico e os toques no trem/caixa
também foram verificados com derivados locais, sem erros de página.

O material comum, os controles e a continuidade estão concluídos nesta etapa.
Refinamentos de arte por jogo e homologação física permanecem documentados;
os gates H5–H7 do plano principal continuam abertos. Nenhum deploy foi feito.
