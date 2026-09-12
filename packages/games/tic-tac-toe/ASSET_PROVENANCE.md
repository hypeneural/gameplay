# Proveniência de assets — Trinca de Natal

Os assets browser-deliverable desta fase estão no `assets/manifest.json`, com
origem, licença, preparo, hash, bytes e orçamento auditáveis. Fotos de sessão
continuam fora desse catálogo e só chegam ao runtime através de derivados
autorizados.

Fotos de sessões nunca entram neste documento, no manifesto ou em prompts de
arte. Elas são carregadas exclusivamente pelo runtime a partir de IDs já
autorizados pela sessão.

## R3-C.2c — fontes originais em revisão (30-08-2026)

As três fontes abaixo foram geradas para este produto com a ferramenta de
geração de imagens da OpenAI, a partir da receita local em
`assets-src/tic-tac-toe/README.md`. Elas são rascunhos de direção
`project-created`, inicialmente fora de `apps/play/public/`. Suas variantes
WebP foram posteriormente registradas na seção de pacote runtime abaixo.

| Papel                | Fonte retida                                           | Invariantes confirmadas                                     | Próximo gate                                               |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Fundo de oficina     | `assets-src/tic-tac-toe/oficina-fundo-vertical-v1.png` | sem pessoas, fotos, texto ou logo; centro reservado         | preparo WebP, revisão mobile e aprovação de arte           |
| Moldura de lembrança | `assets-src/tic-tac-toe/moldura-lembranca-v1.png`      | PNG com alfa; abertura destinada apenas à foto proporcional | revisar borda/abertura e preparar uma variante de runtime  |
| Cordão de luzes      | `assets-src/tic-tac-toe/cordao-luzes-v1.png`           | PNG com alfa; ornamento sem input e sem texto               | separar estados de luz, medir bytes e aprovar LOW/reduzido |

Nenhum prompt recebeu foto, nome, caminho, id de sessão, rosto real ou marca de
cliente. A direção original usa madeira escura, verde-pinho, cranberry,
dourado fosco e luz âmbar, sem copiar a composição das referências.

## Pacote runtime aprovado — 30-08-2026

Por solicitação explícita do proprietário para que os assets apareçam no build
local, as três fontes acima foram preparadas em WebP e catalogadas no
`assets/manifest.json`. O fundo permanece atrás do mural, a moldura conserva
uma abertura transparente e o cordão é apenas decoração sem input. O preparo
usou Sharp 0.35.3; hashes, dimensões, orçamento e perfis LOW/redução de
movimento estão no manifesto.

Os sons `toque`, `encaixe`, `vitória` e `oficina-loop` são cópias byte a byte
dos derivados browser já autorizados pelo proprietário no pacote Puzzle Swap.
Eles foram copiados para um diretório próprio de Trinca, sem importar outro
jogo em runtime. A música só é iniciada por um gesto humano e toda a cena a
interrompe durante shutdown.
