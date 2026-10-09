# Fotos, galeria mobile, jogos e EvydFlow

Documentação de referência em **05/10/2026**. A auditoria e a bancada estão concluídas; a integração de produção descrita aqui ainda é proposta.

Este pacote reúne a análise dos três repositórios, os resultados agregados do processamento de 30 fotografias e um plano para entregar uma experiência única à família: Hub, galeria e jogos com a mesma sessão e as mesmas fotos.

## Leitura e validação

**Ponto de entrada MVP:** [Point Graph completo (tabelas, 5 APIs de upload, 2 de leitura, exemplos JSON, SQL e testes)](MVP_POINT_GRAPH_APIS_DB_2026-10-08.md). Os demais documentos registram arquitetura futura e não devem inflar o escopo da primeira publicação manual.

**Pré-flight Node/Python:** [contrato do publisher futuro](PUBLISHER_EVYDFLOW_HANDOFF_V1.md) e [JSON Schema versionado](../../contracts/photo-publication-manifest-v1.schema.json). Não há API de upload funcional, nem integração Python liberada neste estágio.

**Entrega Contabo 2026:** [Staging seguro com Caddy/stackctl](../../ops/CONTABO_JOGOS_STAGING_2026-10-08.md) e [contrato de publicação privada de fotos e revisões](SESSION_MEDIA_PUBLICATION_CONTRACT_V1.md). Ambos documentam proposta futura, não upload ou piloto funcional.

1. [Auditoria GitHub — donors da Galeria Natalina mobile](AUDITORIA_GITHUB_GALERIA_NATALINA_MOBILE_2026-10-06.md) — comparação de layout, viewer, virtualização, animação, licenças e integração com gameplay.
2. [Galeria Natalina e multi-galerias](GALERIA_NATALINA_MULTI_GALERIAS.md) — álbum vertical mobile, tamanhos de imagem, assets e isolamento de múltiplas galerias.
3. [Auditoria forense Antigravity + galeria mobile](AUDITORIA_FORENSE_ANTIGRAVITY_MOBILE_2026-10-06.md) — estado real, riscos, bibliotecas e ordem técnica.
4. [Contrato de performance da galeria mobile](../../quality/GALLERY_MOBILE_PERFORMANCE_CONTRACT.md) — gates de rede, imagem, Web Vitals e aparelhos.
5. [Plano ativo para Antigravity / FluentGraft 2.19.1](../../exec-plans/active/CG-PHOTO-SESSIONS-ANTIGRAVITY-2.19.1.md) — ordem operacional atual para implementação.
6. [MVP rápido: caminho crítico e entregas adiáveis](MVP_RAPIDO.md).
7. [Auditoria forense e arquitetura recomendada](AUDITORIA_WORKFLOW_SESSOES_E_JOGOS.md).
8. [Plano completo de implementação](PLANO_IMPLEMENTACAO_GALERIA_JOGOS_EVYDFLOW.md).
9. [Prompt para copiar no ChatGPT e validar com fontes oficiais](PROMPT_VALIDACAO_CHATGPT.md).
10. [PDF consolidado da edição pública](output/pdf/AUDITORIA_E_PLANO_SESSOES_FOTOS_PUBLICO.pdf).

Para agentes de implementação, `.agents/rules/photo-sessions-integration.md`, `.agents/rules/christmas-gallery-album.md`, `.agents/skills/photo-sessions-integration/SKILL.md` e `.agents/skills/christmas-gallery-album/SKILL.md` registram as invariantes de multi-cliente, mídia privada, galeria mobile-first e integração Windows↔VPS. A auditoria GitHub classifica dependências: React Photo Album + Yet Another React Lightbox são o caminho primário; PhotoSwipe é challenger de benchmark; virtualização é reserva; particle engines e lightGallery não entram no primeiro corte. O documento de MVP apresenta um recorte para revisão técnica: piloto supervisionado com entrega manual do link antes da automação de WhatsApp. O plano completo continua descrevendo o estado final, com outbox e retomada operacional. Nenhuma dessas opções foi implantada por esta publicação.

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
