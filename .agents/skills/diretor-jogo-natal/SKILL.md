---
name: diretor-jogo-natal
description: Planeje ou revise um jogo natalino de fotos para celular quando a tarefa envolver experiência, interface, assets, feedback e validação. Não use para uma correção isolada de domínio.
---

# Diretor de jogo natalino

Transforme uma intenção ampla em uma experiência infantil clara, natalina e
verificável. A foto é a lembrança principal; cenário, luz e efeitos existem
para orientar, confirmar ou celebrar.

## Antes de decidir

1. Leia docs/index.md, o plano de execução ativo e o SPEC do jogo.
2. Para apresentação ou assets, leia ART_BIBLE.md e o contrato de manifesto.
3. Defina ou confirme: fantasia, primeira ação, verbos da criança, duração da
   rodada, estado de vitória e papel de cada asset.
4. Registre uma decisão de produto antes de mudar dificuldade, destino da
   vitória, direção visual ou aquisição de assets.

## Direção

- Dê prioridade visual à foto, à ação principal e ao tabuleiro, nesta ordem.
- Use uma única origem visível para título, progresso e status durante a
  partida. Não mostre estado técnico, orientação da foto ou inglês para a
  família.
- Prefira orientação contextual curta a instrução permanente.
- Toda dica indica o próximo gesto sem completar a ação pela criança.
- Todo efeito precisa de função, perfil LOW e alternativa para movimento
  reduzido.
- Não use foto original, caminho local, nome de cliente ou provider no browser.

## Encaminhamento

- Para regra determinística, mantenha o trabalho em domain e escreva teste
  unitário antes do runtime.
- Para Phaser, siga a ordem de fontes em AGENTS.md e leia somente a Skill
  Phaser vinculada à tarefa.
- Para arte, escreva o papel no contrato de experiência antes de procurar ou
  preparar arquivo.
- Para validação visual, use a Skill revisao-visual-mobile.

## Conclusão

Entregue a decisão, os arquivos que a implementam, o teste que a prova e os
gates ainda dependentes do proprietário. Não declare acabamento profissional
sem evidência visual e mobile.
