# Validação oficial — Asset Factory inicial

**Data:** 2026-08-24

| Tema                      | Fonte primária                                                              | Decisão aplicada                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditoria de árvore local | [Node.js — `fs/promises`](https://nodejs.org/api/fs.html#promises-api)      | O auditor usa somente operações assíncronas de leitura (`readdir`, `readFile`, `lstat`) para listar arquivos entregáveis, detectar entradas não regulares e medir bytes. Ele não manipula arquivos. |
| Argumentos de CLI         | [Node.js — `process.argv`](https://nodejs.org/api/process.html#processargv) | O comando aceita uma lista explícita de operações e um único `--game`; argumentos fora desse contrato falham antes de ler qualquer manifesto.                                                       |
| Metadados de imagem       | [Sharp — `metadata()`](https://sharp.pixelplumbing.com/api-input/#metadata) | As dimensões do pacote inicial foram confirmadas antes de entrar no manifesto. A futura conversão/otimização deve continuar registrando formato e dimensões após a saída.                           |

## Consequências

O manifesto não confia apenas numa extensão ou num comentário: ele confere a
existência, o tipo regular, o tamanho e a cobertura completa do diretório
público. A inspeção de bytes é uma guarda de revisão, não uma promessa de
desempenho em aparelho; cenários Phaser continuam precisando de evidência de
tempo de quadro e memória em dispositivos reais.
