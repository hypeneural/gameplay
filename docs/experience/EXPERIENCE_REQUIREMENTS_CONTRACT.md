# Contrato de requisitos da experiência

Cada jogo novo gerado por game:new recebe EXPERIENCE_REQUIREMENTS.json. Ele é
um contrato de planejamento que descreve a brincadeira e os papéis necessários
antes de escolher arquivo, provider, URL ou asset de runtime.

## Formato v1

| Campo                 | Tipo   | Regra                                                           |
| --------------------- | ------ | --------------------------------------------------------------- |
| version               | número | Deve ser 1.                                                     |
| gameId                | texto  | Kebab-case do jogo que receberá o contrato.                     |
| fantasy               | texto  | Fantasia natalina curta da brincadeira.                         |
| playerVerbs           | lista  | Ações que a criança faz.                                        |
| interactionStates     | lista  | Inclui pelo menos parado e concluido.                           |
| targetSessionSeconds  | número | Duração esperada, maior que zero.                               |
| victory.nextAction    | texto  | escolher-outra-foto, repetir-brincadeira ou voltar-para-sessao. |
| victory.photoPriority | texto  | alta, pois a lembrança final é a foto.                          |
| assetRoles            | lista  | Papéis, nunca caminhos ou arquivos.                             |
| quality.low           | texto  | sem-efeitos-decorativos.                                        |
| quality.reducedMotion | texto  | sem-movimento-continuo.                                         |

## Papéis essenciais

foto-protagonista, acao-principal, feedback-de-dica, feedback-de-acerto,
feedback-de-vitoria, som-de-toque, som-de-acerto e som-de-vitoria são
obrigatórios. Um jogo pode acrescentar cenário e moldura quando sua direção de
arte exigir.

## Limites

- Não escrever URL, caminho de disco, nome de sessão, foto, provider ou licença
  neste arquivo.
- Não usar o contrato como regra de domínio. As regras permanecem em domain.
- O contrato não aprova assets. O manifesto e a Fábrica de Assets continuam
  responsáveis por origem, licença, preparo e orçamento.
- A validação é pura e fica na ferramenta de geração, portanto não entra no
  grafo do navegador.

## Validação

O parser rejeita versão inválida, gameId divergente, listas vazias ou repetidas,
estados essenciais ausentes, papel essencial ausente e qualidade sem fallback.
O teste do game-generator executa o template gerado e exemplos inválidos.
