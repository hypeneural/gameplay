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

## Versão 2 e migração explícita

O Puzzle já usa a versão 2. A fábrica ainda lê a versão 1 para que um jogo
existente possa ser inspecionado e migrado sem substituição silenciosa. O
migrador local calcula o SHA-256 do arquivo já aprovado e, se receber um v2,
devolve o mesmo documento (idempotência). Ele é uma etapa de preparação; não
baixa, gera ou publica nada.

```sh
pnpm asset:migrate
```

O comando imprime o v2 para revisão. A atualização do manifesto versionado é
uma decisão explícita, acompanhada de `pnpm asset:validate`. A auditoria aceita
no diretório público apenas `art.state: PRONTO_PARA_RUNTIME`.

## Campos principais do v2

| Campo                                    | Função                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                                     | Identificador estável em kebab-case para uma entrega física.                                                             |
| `kind`                                   | `background`, `ui`, `vfx` ou `audio`.                                                                                    |
| `format`                                 | Formato browser-deliverable permitido nesta primeira versão.                                                             |
| `source`                                 | Provider/origem, licença, identificador, data/revisor e âncora de proveniência. URLs só existem quando há fonte externa. |
| `art`                                    | Família, adequação natalina, segurança da foto, legibilidade mobile, estado e justificativa humana.                      |
| `processing`                             | Receita e ferramentas/versões que prepararam o arquivo browser-deliverable.                                              |
| `runtime.bytes` / `sha256`               | Tamanho e conteúdo exatos; ambos são conferidos contra o arquivo público.                                                |
| `runtime.dimensions` / `durationSeconds` | Dimensão de imagem ou duração de som, conforme o tipo.                                                                   |
| `runtime.textureKey` / `cue`             | Papel no runtime Phaser; a chave de textura ou o nome do som.                                                            |
| `runtime.deliveryGroup`                  | Formatos alternativos do mesmo som. Em uma partida, conta apenas o maior.                                                |
| `runtime.quality`                        | Diz se o arquivo decorativo pode desaparecer em LOW ou movimento reduzido.                                               |

Os únicos estados de revisão são `DESCOBERTO`, `VERIFICADO`, `REJEITADO`,
`PRECISA_HARMONIZAR`, `SUBSTITUIR`, `FONTE_APROVADA`, `PREPARADO` e
`PRONTO_PARA_RUNTIME`. Um estado anterior é útil para revisão, mas não pode
entrar em `public/assets`.

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
pnpm asset:migrate
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

## Descoberta externa, quando for necessária

Descoberta não é uma função do jogo nem da fábrica. A ordem manual é: catálogo
local já aprovado, fonte CC0 previamente aceita, shortlist manual e, só então,
criação/geração com receita reproduzível. Antes de um candidato tornar-se
arquivo local, a revisão registra fonte, termos/licença na fonte, hash, família
visual, segurança da foto e decisão humana. Para geração, registra também
modelo, receita/prompt referenciável, seed quando houver e versão disponível.

Nenhum provider, busca, download, licença ou geração é executado no browser,
durante uma partida ou por estes comandos. Assim, o build publicado continua
reproduzível mesmo se a fonte externa deixar de existir.

## Limites desta versão

- Sem busca na internet, crawler ou download de terceiros.
- Sem geração de atlas, conversão de áudio ou adaptação automática do runtime.
- Sem aceitar licenças vagas: a primeira versão usa somente assets criados para
  o projeto ou áudio legado explicitamente autorizado pelo proprietário.
- Sem tratar hash como licença ou aprovação estética: o SHA-256 prova apenas o
  conteúdo que foi revisado, não a origem ou a adequação da arte.
- Sem afirmar desempenho apenas pelo tamanho: a medição em aparelho real
  continua necessária antes de aumentar o orçamento ou usar pós-efeitos.
