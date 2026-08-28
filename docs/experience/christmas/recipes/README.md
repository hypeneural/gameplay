# Receitas de experiência natalina

Uma receita descreve um único efeito ou resposta que pode ser aprovado, medido
e implementado sem transformar gosto visual em uma regra escondida no código.
Ela não é um componente compartilhado e não cria uma Scene-base.

## Esquema obrigatório

Cada receita contém os campos abaixo.

| Campo                 | O que registra                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Finalidade            | A resposta que a criança percebe e por que ela existe.                                    |
| Planos de cena        | Camadas L0–L3 que podem receber o efeito.                                                 |
| Asset aprovado        | Arquivo já catalogado, ou a declaração explícita de que nenhum arquivo novo é necessário. |
| Gatilho               | Evento de jogo que pode iniciar o efeito.                                                 |
| Duração e intensidade | Tempo finito ou ritmo limitado; loops exigem perfil e pausa definidos.                    |
| Foto protegida        | Área que não pode ser encoberta ou disputada.                                             |
| Limite ativo          | Máximo de objetos, partículas, tweens ou fontes de áudio simultâneos.                     |
| Som                   | Papel sonoro, volume relativo, intervalo e alternativa visual.                            |
| Qualidade             | Resultado intencional em NORMAL, LOW e movimento reduzido.                                |
| Ciclo de vida         | Dono do recurso e eventos que interrompem e limpam o efeito.                              |
| Teste de aceite       | Cenário observável no navegador e, quando aplicável, no laboratório.                      |

## Regras de uso

- A foto, suas faces e a grade nunca são substrato de decoração.
- Efeito de resposta começa depois do gesto ou do evento de domínio; não
  antecipa nem altera uma jogada.
- Toda receita visual tem início e término verificáveis. Ambiente contínuo
  precisa de teto ativo, pausa e limpeza definidos.
- LOW e movimento reduzido preservam a informação da brincadeira; somente a
  decoração pode desaparecer.
- Um arquivo novo só é elegível depois de entrar no manifesto e de possuir
  proveniência aprovada. Esta pasta não é autorização para baixar ou gerar
  arte durante uma partida.

## Receitas iniciais

| Receita                                     | Papel                                        |
| ------------------------------------------- | -------------------------------------------- |
| [Neve suave](NEVE-SUAVE.md)                 | Profundidade ambiente discreta.              |
| [Neve de vitória](NEVE-DE-VITORIA.md)       | Celebração breve depois da foto completa.    |
| [Luzes quentes](LUZES-QUENTES.md)           | Calor no cenário, atrás da foto.             |
| [Botão pressionado](BOTAO-PRESSIONADO.md)   | Confirmação de toque sem atrasar a ação.     |
| [Peça escolhida](PECA-ESCOLHIDA.md)         | Indica a primeira peça de uma troca.         |
| [Dica de duas peças](DICA-DE-DUAS-PECAS.md) | Ensina uma próxima troca sem executá-la.     |
| [Troca correta](TROCA-CORRETA.md)           | Celebra uma peça que chegou ao lugar certo.  |
| [Troca sem solução](TROCA-SEM-SOLUCAO.md)   | Resposta gentil a uma troca que não avançou. |
| [Vitória](VITORIA.md)                       | Foto recomposta e encerramento festivo.      |

## Verificação

Antes de usar uma receita no runtime:

1. conferir o manifesto, a origem e a Bíblia indicada;
2. revisar em 390, 412, 430 e 768 px, também em LOW e movimento reduzido;
3. contar os recursos ativos no cenário definido;
4. testar pausa, retomada, saída e destruição;
5. registrar a evidência privada sem foto ou identificação de cliente.
