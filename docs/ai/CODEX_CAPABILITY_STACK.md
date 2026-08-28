# Capacidades do Codex usadas por este repositório

## Skills do repositório

O Codex procura Skills em .agents/skills a partir do diretório de trabalho até
a raiz do repositório. Cada Skill é uma pasta com SKILL.md, nome e descrição.
O carregamento é progressivo: primeiro nome/descrição; o conteúdo completo só
é carregado quando a tarefa pede aquela especialidade.

Esta decisão usa a documentação oficial Build skills, validada em 2026-08-24.
Ela é específica à instalação de Codex atual e não depende de um plugin de
terceiro.

| Skill                 | Quando usar                                                 | Limite                                                          |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| diretor-jogo-natal    | Mudança que une experiência, interface, assets e validação. | Não substitui SPEC, domínio ou aprovação do proprietário.       |
| revisao-visual-mobile | Revisão de canvas/HUD/efeitos em viewport mobile.           | Não muda design nem usa foto de cliente como evidência pública. |

## Decisões de manutenção

- Uma Skill deve ter um único trabalho reconhecível e instruções curtas.
- Preferir instrução a script até haver automação repetida e determinística.
- Criar nova Skill somente após uma tarefa recorrente demonstrar que os dois
  guias atuais não a cobrem.
- Skills de repositório ajudam o desenvolvimento local. Distribuição para
  outros projetos só será considerada depois como plugin, com revisão separada.
- O bundle Game Studio da OpenAI é referência útil, mas não é pré-requisito nem
  ferramenta disponível assumida nesta instalação.

## Fontes

- OpenAI, Build skills: https://learn.chatgpt.com/docs/build-skills
- OpenAI, Save workflows as skills:
  https://learn.chatgpt.com/use-cases/reusable-codex-skills
