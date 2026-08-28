# Contrato do Laboratório de Assets

**Plano:** `CG-EXPERIENCE-INTELLIGENCE-AND-MOBILE-MATURITY`, etapa E4.2
**Estado:** implementado para o catálogo atual do Puzzle Swap.

## Finalidade e rota

A rota local [`/__dev/assets`](/__dev/assets) permite revisar um elemento antes
de ele entrar em uma Scene. Ela é isolada do fluxo `/s/...`: não cria sessão,
não pede foto, token, identificador de cliente ou mídia privada.

O laboratório usa
`packages/games/puzzle-swap/src/assets/assetLabCatalog.ts`, uma projeção
segura do manifesto. A projeção contém somente nome, papel, caminho público,
tamanho de transferência, dimensões, variante de qualidade e proveniência
resumida. Ela deliberadamente não importa `assets/manifest.json`, pois o
manifesto de auditoria também possui caminhos internos de arquivo.

## O que a prévia prova

- Alterna a moldura de referência em 390, 412, 430 e 768 px sem criar
  rolagem horizontal.
- Mostra os quatro planos: L0 cenário, L1 ambiente, L2 zona protegida da foto
  e L3 controles. L2 é um mock, nunca uma imagem de criança.
- Alterna fundo claro/escuro e os estados repouso/pressionado/desativado do
  botão.
- Executa a receita de neve como uma única passagem de 12 flocos atrás de L2.
  Em LOW ou movimento reduzido ela é omitida e o motivo fica visível.
- Mostra que não há faixa de sprites aprovada hoje, em vez de inventar arte de
  teste não catalogada.
- Pré-visualiza som pelo controle nativo do navegador, sob ação do revisor e
  com `preload="none"`. NORMAL usa 72% e LOW 55%; movimento reduzido preserva
  informação sonora, pois não é uma preferência de volume.
- Permite aprovar ou rejeitar apenas o parecer local, com motivo explícito. O
  parecer não grava, não altera o catálogo e não oferece download.

O catálogo atual representa 13 papéis criativos: sete visuais e seis sons.
Cada som agrupa as suas duas alternativas de entrega (m4a/mp3), sem apresentar
uma alternativa de navegador como se fosse um asset artístico adicional.

## Custos e proveniência

Para imagem, a tela mostra `largura × altura × 4` como estimativa RGBA
decodificada. Isso não é memória total de GPU; os limites estão definidos no
[contrato de medição](PERFORMANCE_MEASUREMENT_CONTRACT.md). Para áudio, a
medida decodificada não se aplica e a tela mostra somente a transferência da
primeira alternativa entregável.

A provenance é resumida em duas classes já aceitas pelo manifesto v1:
“Criado para este projeto” e “Legado autorizado pelo responsável”. Nenhuma
origem nova é aprovada pelo laboratório.

## Evidência de execução (2026-08-25)

Revisão no navegador local: a zona L2 permaneceu dentro da moldura e a página
não teve rolagem horizontal em 390×844, 412×915, 430×932 e 768×1024. O perfil
de movimento reduzido desativou a prévia de neve e mostrou a justificativa. A
prévia de som montou duas fontes locais e manteve `preload="none"`; a rota não
abriu sessão, canvas ou mídia privada.

A norma HTML define `audio`, `source`, `controls` e `preload` como recursos do
elemento de mídia; por isso a revisão reutiliza o controle nativo, sem criar
um fluxo de reprodução automática. [HTML Standard — elementos de mídia](https://html.spec.whatwg.org/multipage/media.html).

## Limites

Este laboratório não substitui a auditoria de `pnpm asset:audit`, a revisão
humana de proveniência nem o Laboratório de Desempenho E4.3. Ele não introduz
assets, não mede uma Scene de Phaser e não fixa orçamento de Android.
