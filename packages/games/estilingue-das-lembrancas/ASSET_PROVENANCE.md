# Proveniência de assets — Estilingue das Lembranças

Este registro consolida os metadados e scripts recuperados do projeto. A auditoria de sincronização conferiu arquivos, dimensões, tamanhos e SHA-256; não realizou uma nova revisão artística ou de licenças.

## Original audio v1

Os registros existentes identificam os 24 arquivos de áudio como composição e síntese do projeto, com licença `project-owned`, preparados em 2026-09-13. As fontes WAV estão em `assets-src/estilingue-das-lembrancas/audio/`, e o processo está em `tools/asset-factory/scripts/prepare-estilingue-audio.mjs`. MP3 e M4A são alternativas da mesma faixa.

## Estilingue art v2

Os registros existentes identificam as 12 imagens WebP como arte gerada para o projeto, com licença `project-owned`, preparada em 2026-09-13. O script `tools/asset-factory/scripts/prepare-estilingue-art.mjs` recebe como argumento a pasta com os seis JPGs originais. Esses originais não integram o repositório recuperado; os WebP de execução estão preservados e são suficientes para compilar e jogar.

## Orçamento de entrega

O manifesto v2 adota limites de 1.500.000 bytes públicos, 950.000 bytes por partida e 550.000 bytes visuais, iguais aos do Globo das Lembranças. Cada textura visual conta separadamente no orçamento de execução; somente formatos alternativos de um mesmo áudio compartilham o grupo de entrega.
