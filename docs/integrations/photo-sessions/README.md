# Fotos, galeria mobile, jogos e EvydFlow

Documentação de referência em **05/10/2026**. A auditoria e a bancada estão concluídas; a integração de produção descrita aqui ainda é proposta.

Este pacote reúne a análise dos três repositórios, os resultados agregados do processamento de 30 fotografias e um plano para entregar uma experiência única à família: Hub, galeria e jogos com a mesma sessão e as mesmas fotos.

## Leitura e validação

1. [MVP rápido: caminho crítico e entregas adiáveis](MVP_RAPIDO.md).
2. [Auditoria forense e arquitetura recomendada](AUDITORIA_WORKFLOW_SESSOES_E_JOGOS.md).
3. [Plano completo de implementação](PLANO_IMPLEMENTACAO_GALERIA_JOGOS_EVYDFLOW.md).
4. [Prompt para copiar no ChatGPT e validar com fontes oficiais](PROMPT_VALIDACAO_CHATGPT.md).
5. [PDF consolidado da edição pública](output/pdf/AUDITORIA_E_PLANO_SESSOES_FOTOS_PUBLICO.pdf).

O documento de MVP apresenta um recorte para revisão técnica: piloto supervisionado com entrega manual do link antes da automação de WhatsApp. O plano completo continua descrevendo o estado final, com outbox e retomada operacional. Nenhuma dessas opções foi implantada por esta publicação.

## Resultado comprovado e seus limites

| Medição local                                          | Resultado                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Originais principais, diretamente na raiz              | 30 arquivos, 314.662.440 bytes                                      |
| BAIXA excluída da origem                               | 30 arquivos, 20.638.181 bytes                                       |
| Saída WebP 82, borda maior de 480/800/1600             | 90 derivados, 6.616.226 bytes                                       |
| Processamento inicial, duas fotos por lote concorrente | 21,75 s                                                             |
| Replay da mesma receita                                | 1,72 s; 90 arquivos sem alteração                                   |
| Preservação                                            | Originais intactos; proporções verificadas; derivados decodificados |

Os 6,62 MB representam **toda a coleção derivada**, não o peso inicial da tela nem o uso de memória no celular. O benchmark ocorreu em uma máquina local; não comprova capacidade da VPS, FPS, Core Web Vitals ou funcionamento do backend de produção. A comparação AVIF/WebP usou três imagens e não substitui aprovação visual.

## Fontes e rastreabilidade

| Repositório                                                                | Commit auditado                            | Acesso  |
| -------------------------------------------------------------------------- | ------------------------------------------ | ------- |
| [gameplay](https://github.com/hypeneural/gameplay)                         | `e38573b46d841f9cea1ab5f7306b0fd254b511ca` | Público |
| [evydflow](https://github.com/hypeneural/evydflow)                         | `42f0bcfd562d3165362cba39f1adb7bc5856d3af` | Privado |
| [festive-gallery-show](https://github.com/hypeneural/festive-gallery-show) | `0f903fba53d0e33c62cd3aa32f1cb25e8489390b` | Privado |

Havia alterações concorrentes no EvydFlow. O índice registra hashes dos arquivos efetivamente inspecionados e o estado observado; o commit sozinho não substitui o snapshot de um arquivo alterado. Conteúdo de repositórios privados não foi copiado para este pacote. Se o ChatGPT não conseguir lê-los, deve identificar quais conclusões dependem de anexos ou de acesso autorizado, sem alegar inspeção independente.

- [Medições agregadas, receita e limitações](evidence/benchmark-summary.json).
- [72 recibos de arquivos-fonte, sem caminhos locais](evidence/source-index.json).
- [Smoke local das galerias, com APIs simuladas](evidence/gallery-smoke-summary.json).
- [Verificações da publicação e pendência no Performance Lab](evidence/publication-validation.json).
- [Integridade dos arquivos desta publicação](evidence/publication-manifest.json).

Na verificação posterior à auditoria, CI, 430 testes unitários, checks e build passaram. A matriz local de navegador foi interrompida após duas falhas em 34 cenários concluídos; 198 ficaram sem conclusão. Na repetição isolada, o cenário de carregamento do Puzzle passou e o Performance Lab continuou sem confirmar `GAME_COMPLETED` no prazo. A causa ainda não foi estabelecida. **A matriz completa de navegador não está aprovada**, e essa evidência não substitui testes em aparelhos físicos. Os arquivos de aplicação e jogos permaneceram iguais ao baseline auditado.

## Conteúdo público e evidência privada

Os números de pedido usados nos documentos são exemplos fictícios. Nomes, telefones, caminhos absolutos locais, nomes reais das fotografias e hashes individuais da mídia foram retirados. As contagens e medições técnicas foram preservadas.

A galeria HTML offline, os screenshots com clientes, os originais, os derivados, o inventário completo e os snapshots de código privado permanecem na bancada local. Referências a esses artefatos dentro da auditoria descrevem a evidência original; não significam que o arquivo foi incluído neste repositório. O PDF foi gerado novamente a partir dos documentos anonimizados.

Esta entrega publica documentação. Não cria uma sessão acessível ao cliente, não executa workflows de produção, não consulta o CRM e não envia mensagens.
