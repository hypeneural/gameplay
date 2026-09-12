# Catálogo e aberturas — análise mobile para produção

**Data:** 2026-09-04, horário de São Paulo.  
**Escopo:** página de escolha de jogos e abertura de Memórias de Natal.  
**Resultado:** base funcional de demonstração; evolução de produto e integração de sessão ainda necessárias antes de produção.  
**Plano correspondente:** [Catálogo e aberturas natalinas](../exec-plans/CG-HUB-E-ABERTURAS-NATALINAS.md).

## Método e limites da evidência

Inspeção do navegador local nas duas rotas fornecidas pelo proprietário, usando
derivadas privadas de uma sessão de nove fotos. As capturas foram vistas somente
na conversa privada; este documento não contém fotos, URLs de mídia, tokens ou
nomes de clientes. As observações de código descrevem o checkout de trabalho,
que já continha alterações em andamento antes desta análise.

Revisão visual de Hub e capa em 390 × 844, 412 × 915, 430 × 932 e 768 × 1024
CSS px; capa adicional em 360 × 640; capa em movimento reduzido em 390 px;
entrada no Memory e saída ao Hub em 390 px. A revisão de gameplay limitou-se à
transição e lifecycle: não foi uma nova auditoria de toda a mecânica.

O navegador usado é Chromium integrado com dimensões simuladas. Isso não prova
Safari, navegador interno de WhatsApp/Instagram, toque físico, conforto auditivo,
FPS, consumo de bateria ou desempenho de Android real. LOW do shell foi
analisado no código, sem medição física. Sessões grandes foram analisadas pelo
fluxo de paginação, sem alegar teste visual de 120/172 fotos nesta revisão.

## Diagnóstico central

A página principal se apresenta como uma galeria comprida antes de se apresentar
como um catálogo de brincadeiras. A foto está presente, mas a criança não vê as
opções de jogo na primeira tela. As opções têm o mesmo cenário ilustrado, o que
transfere a distinção entre jogos para títulos e descrições. Na abertura, a
moldura natalina dá identidade de coleção, mas não demonstra a ação específica
de Memórias de Natal.

A próxima versão deve combinar três objetivos: reconhecer a própria foto,
reconhecer cada brincadeira por um objeto visual e responder ao toque como um
brinquedo. O detalhamento de neve, luz, materiais e áudio deve partir dessa
hierarquia.

## Medidas observadas

Valores aproximados após carregamento, no início da página. O espaço da barra
vertical do navegador integrado reduz a largura útil; não foi identificado
overflow horizontal persistente nas condições medidas.

| Viewport   | Início da seção de jogos no Hub | Altura total do Hub | Botão Começar na capa: topo–base | Altura total da capa |
| ---------- | ------------------------------- | ------------------- | -------------------------------- | -------------------- |
| 390 × 844  | 1.444 px                        | 3.289 px            | 659–714 px                       | 959 px               |
| 412 × 915  | 1.473 px                        | 3.318 px            | 676–731 px                       | 978 px               |
| 430 × 932  | 1.529 px                        | 3.307 px            | 672–726 px                       | 975 px               |
| 768 × 1024 | 1.203 px                        | 2.847 px            | 775–830 px                       | 1.089 px             |
| 360 × 640  | não medido                      | não medido          | 636–708 px                       | 953 px               |

Em 390 px, o primeiro card começa em aproximadamente 1.503 px e Memórias de
Natal em 2.412 px. A diferença para a altura da primeira tela é material para
descoberta. Em 360 × 640, a ação principal da capa exige rolagem.

## Achados priorizados

P1 indica impedimento de produção, descoberta da ação principal ou texto
técnico no caminho infantil; P2 indica redução de compreensão, conforto ou
acabamento; P3 indica polimento. A classificação é desta revisão, não uma
declaração de incidente já ocorrido em produção.

| ID       | Nível | Estado e reprodução                                  | Achado e consequência                                                                                                                             | Evidência / dono                                                                                   | Próxima ação                                                                                          |
| -------- | ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| HUB-01   | P1    | Abrir Hub, 390/412/430 px, nove fotos                | Nenhum card de jogo aparece na primeira tela; galeria vem antes do catálogo                                                                       | `Hub.tsx`, ordem de composição; `apps/play`                                                        | Título de escolha e álbum compacto, seguidos imediatamente pelos jogos                                |
| HUB-02   | P2    | Rolar até os cards, 390 px                           | Todos mostram a mesma vila, embora os textos alternativos descrevam objetos diferentes                                                            | `GameCard.tsx:20`; fundo compartilhado em `styles.css:224`; `apps/play`                            | Prévia própria por jogo, com fotografia integrada e alternativa visual honesta                        |
| HUB-03   | P2    | Observar barra fixa e implementação do clique        | “Jogar agora” permanece sobre o catálogo e sempre escolhe Puzzle; o destino não é explicado no rótulo                                             | `Hub.tsx:39`, `Hub.tsx:138`; `apps/play`                                                           | Retirar CTA global que privilegia um jogo; ação explícita em cada card                                |
| HUB-04   | P1    | Abrir Hub local e inspecionar catálogo registrado    | Texto técnico de teste e “Prova de Natal” aparecem no percurso da família                                                                         | `Hub.tsx:86`; `gameRegistry.ts`; `AppRouter.tsx`; `apps/play`                                      | Isolar dev/labs/fixtures e definir catálogo de release                                                |
| HUB-05   | P2    | Inspecionar sessão acima de 12 fotos no código       | Sentinela de paginação fica antes dos jogos; crescimento da galeria pode afastá-los ainda mais. O texto explica miniaturas e versões de runtime   | `Hub.tsx:147`; `apps/play`                                                                         | Galeria completa em painel próprio; catálogo não depende da quantidade de fotos                       |
| CAPA-01  | P2    | Abrir Memory, todas as larguras                      | Uma única foto em moldura de presente, sem par ou cartas virando; jogo é explicado principalmente por texto                                       | `GameCover.tsx`; `apps/play`                                                                       | Diorama de álbum/cartas com uma demonstração breve de par                                             |
| CAPA-02  | P2    | Abrir Memory, 360 × 640                              | Botão principal quase inteiramente fora da primeira tela; título, painel e margens consomem altura                                                | Geometria medida; `styles.css`; `apps/play`                                                        | Composição por altura útil e área inferior de ação com espaço reservado                               |
| CAPA-03  | P2    | Observar animação normal e composição                | Sete flocos são filhos da moldura e atravessam a área da fotografia. Não há cordão de lâmpadas físicas na capa; brilho é sobretudo estrela/sombra | `GameCover.tsx:14`, `:60`; `apps/play`                                                             | Neve atrás da foto; luz prática com lâmpada, vidro e halo ancorado                                    |
| CAPA-04  | P2    | Observar primeiro carregamento e conclusão do decode | Moldura aparece vazia antes da foto, sem indicação própria; depois a imagem carrega corretamente                                                  | Captura inicial e `naturalWidth=571`, `naturalHeight=800`; `apps/play`                             | Estado de carregamento/falha da foto dentro de geometria estável                                      |
| CAPA-05  | P2    | Abrir rota direta                                    | Capa recebe somente uma foto e não permite trocá-la; trocar exige voltar à galeria                                                                | `GameCoverProps`; `apps/play`                                                                      | Seletor compacto compartilhado, preservando âncora por sessão                                         |
| SOM-01   | P2    | Inspecionar Hub/capa e função de toque               | Há toque sonoro curto, mas não há controle de som nessas páginas. Função não consulta preferência; contexto inicia com som habilitado             | `playInterfaceTap.ts`; `AppRouter.tsx`; `apps/play`                                                | Preferência única para shell e jogo, com política de posse do áudio                                   |
| PERF-01  | P2    | Inspecionar passagem de quality para componentes     | `quality` chega ao jogo, mas não ao Hub/capa. CSS reduz movimento, porém não oferece LOW específico para ambiente do shell                        | `GameQuality.ts`, `AppRouter.tsx`, `GameCoverProps`; `apps/play`                                   | Política comum de qualidade, movimento e visibilidade                                                 |
| PROD-01  | P1    | Ler composição de sessão e servidor atual            | Shell seleciona `createFixtureSession` ou endpoint local. Servidor encontrado autoriza HTML/OG; não entrega catálogo JSON das fotos ao React      | `AppRouter.tsx:76`; `LocalTestSession.ts`; `CatalogServer.ts`; `apps/play` + `apps/catalog-server` | Adaptador real de `SessionRepository` e entrega autorizada de derivados                               |
| PROD-02  | P2    | Inspecionar contratos e fábrica                      | `cover.assetUrl` existe, mas o card não o usa. Auditor de assets assume dono em `packages/games/<id>`                                             | Contratos da plataforma; `tools/asset-factory/src/manifest.ts:39`                                  | Usar contrato existente para pôster e estender ownership para assets do shell sem criar jogo fictício |
| MARCA-01 | P3    | Ler rodapé e fonte de produto                        | Contatos estão presentes, mas assinatura é genérica e links têm pouco espaço de toque                                                             | `StudioSignature.tsx`; `styles.css:876`; `apps/play`                                               | Rodapé com convite de Natal, Instagram identificável e alvos maiores                                  |

## O que está funcionando e deve ser preservado

- Fotografias são derivadas e a capa usa `object-fit: contain`; a imagem
  observada carregou sem distorção. Uma moldura quase quadrada deixa barras
  laterais na foto retrato: a próxima composição pode aproveitar melhor a área.
- Metadados dos jogos e loaders estão separados; cards podem evoluir sem
  montar uma partida. Hub e capa tinham zero canvas.
- Iniciar Memory produziu um canvas; sair retornou ao Hub com zero canvas.
  Nenhum erro ou warning apareceu no console durante a amostra inspecionada.
- Na capa em movimento reduzido, a foto e a ação permaneceram legíveis e a
  inspeção de animações após estabilização retornou lista vazia.
- Botão principal da capa tem tamanho confortável nos telefones maiores.
  O problema mais claro é a acomodação vertical no telefone baixo.
- Dados do estúdio já têm fonte canônica em
  [decisões de produto](../product/PRODUCT_DECISIONS_2026-08-25.md).
- Há contratos e auditoria de assets, protocolo Android e suíte de lifecycle.
  São uma base útil; não certificam automaticamente o novo shell.

## Verificação do checkout

- `pnpm check:fast`: passou — tipagem, lint, 58 arquivos e 259 testes unitários.
- Este documento registra o baseline anterior à implementação. A validação
  completa desse baseline não foi consolidada; não considerar esse gate aprovado.
- O proprietário posteriormente autorizou a implementação. As mudanças e a
  validação da primeira fatia estão no
  [relatório de 2026-09-06](HUB_E_ABERTURAS_IMPLEMENTATION_2026-09-06.md).

## Próxima fatia recomendada

Executar H0–H3 do plano: fixar o contrato de apresentação, produzir a composição
mobile do Hub e a abertura de Memory e torná-las navegáveis com fotos seguras.
Essa fatia já deve mostrar a foto, dois jogos, neve em planos, luzes quentes,
pressionamento dos cards e uma transição de entrada. A implementação da sessão
real deve avançar antes da liberação, conforme H5.
