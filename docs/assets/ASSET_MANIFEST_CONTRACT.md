# Contrato de manifesto de assets

O manifesto é o inventário verificável de tudo que um jogo expõe ao navegador.
Ele não contém fotos de clientes, caminhos de sessão, originais, URLs externas
ou segredos. O primeiro manifesto está em
`packages/games/puzzle-swap/assets/manifest.json`.

## Por que ele existe

Antes desta etapa, as chaves Phaser e as URLs do Puzzle eram corretas, mas o
conhecimento sobre licença, bytes, função, qualidade e formato estava dividido
entre código e texto. O manifesto torna esses fatos auditáveis antes de gerar
adapters de runtime para outros jogos.

O runtime continua usando seus módulos atuais nesta fase. Isso é deliberado:
o catálogo foi migrado primeiro sem alterar uma cena que já passou pela
validação mobile. Uma etapa futura pode gerar `assets.generated.ts` a partir do
manifesto quando dois jogos exigirem o mesmo adapter.

## Localização e escopo

```text
packages/games/<id>/assets/manifest.json  fatos e orçamento
apps/play/public/assets/<id>/...          arquivos estáticos permitidos
packages/games/<id>/ASSET_PROVENANCE.md   contexto humano de origem
```

Cada `file` precisa ficar exatamente sob
`apps/play/public/assets/<id>/`, e `publicPath` precisa espelhar esse caminho.
O auditor rejeita caminhos absolutos, travessia de diretório, links não
regulares, arquivos ausentes e qualquer arquivo público não catalogado.

## Campos principais

| Campo                            | Função                                                                     |
| -------------------------------- | -------------------------------------------------------------------------- |
| `id`                             | Identificador estável em kebab-case para uma entrega física.               |
| `kind`                           | `background`, `ui`, `vfx` ou `audio`.                                      |
| `format`                         | Formato browser-deliverable permitido nesta primeira versão.               |
| `bytes`                          | Tamanho exato esperado do arquivo. Uma alteração exige revisão.            |
| `dimensions` / `durationSeconds` | Dimensão de imagem ou duração de som, conforme o tipo.                     |
| `textureKey` / `cue`             | Papel no runtime Phaser; a chave de textura ou o nome do som.              |
| `deliveryGroup`                  | Formatos alternativos do mesmo som. Em uma partida, conta apenas o maior.  |
| `quality`                        | Diz se o arquivo decorativo pode desaparecer em LOW ou movimento reduzido. |
| `provenance`                     | Origem, licença e âncora em `ASSET_PROVENANCE.md`.                         |

`publicBytes` mede tudo que está publicamente servido. `runtimeBytes` mede uma
partida típica: para cada grupo de alternativas, considera somente o maior
arquivo que o navegador pode escolher. Os dois limites protegem, ao mesmo
tempo, o pacote publicado e a experiência em rede móvel.

## Comandos locais, sem internet

```sh
pnpm asset:doctor
pnpm asset:validate
pnpm asset:audit
pnpm asset:catalog
pnpm asset:budget
pnpm asset:manifest
```

Todos trabalham de forma local e somente leem o catálogo e os arquivos já
presentes. `audit` é o nome explícito da auditoria; `validate` é seu atalho
para a automação. Eles não procuram, baixam, geram ou publicam assets. Para
outro jogo, use `-- --game <id>` após o comando do pacote, por exemplo:

```sh
pnpm --filter @christmas-games/asset-factory run validate -- --game memory-match
```

O caminho mais seguro é: definir a experiência → criar ou aprovar um asset →
registrar proveniência → processar/otimizar fora do navegador → completar o
manifesto → rodar auditoria → integrar no Phaser → validar em tela móvel.

## Limites desta versão

- Sem busca na internet, crawler ou download de terceiros.
- Sem geração de atlas, conversão de áudio ou adaptação automática do runtime.
- Sem aceitar licenças vagas: a primeira versão usa somente assets criados para
  o projeto ou áudio legado explicitamente autorizado pelo proprietário.
- Sem afirmar desempenho apenas pelo tamanho: a medição em aparelho real
  continua necessária antes de aumentar o orçamento ou usar pós-efeitos.
