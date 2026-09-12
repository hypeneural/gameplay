# Guirlanda das Lembranças — revisão native-like e visual

**Data:** 2026-09-04  
**Estado:** V2 validada no escopo local abaixo; não constitui certificação de acabamento
profissional nem liberação externa sem os gates de aparelho e de sessão.

## Revisão V2 — estado vigente

A implementação integrada substitui estrelas e HUD de progresso por ganchos
materiais e 24 lâmpadas na guirlanda. As miniaturas usam a mesma família de
molduras da foto central; geometria protege a abertura, proporção e margem
das artes laterais. A caixa entrega a próxima lembrança; encaixe, acomodação
e propagação periférica de luz têm sequência própria. A celebração normal
termina antes do painel final, e resize/pausa não perdem uma colocação aceita.
Som usa instâncias próprias e prioridades, sem pausar áudio de outros jogos.

Esta passagem foi conduzida pelas Skills diretor-jogo-natal e
revisao-visual-mobile: prioridade da fotografia, alvos de 72 CSS px, evidência
visual privada e separação entre validação em browser e aparelho físico.
O inventário abaixo descreve a V1 e é histórico, não o contrato visual da V2.
O contrato atual é a seção V2 de SPEC.md e EXPERIENCE.md.

### Evidência local V2

- Matriz E2E isolada da Guirlanda: **12/12 passaram**, nos quatro viewports,
  em 5 minutos. Cobre rodada completa, resize durante encaixe, pausa/retorno,
  celebração antes do painel, replay/saída, arraste, viewer e LOW/reduzido.
  Execução própria na porta 4175, sem concorrência com a suíte geral.

- 259 testes unitários, tipos, lint, fronteiras de arquitetura, código morto,
  formatação, mapa e build aprovados nesta passagem. O build ainda sinaliza
  o chunk da engine e a importação estática/dinâmica de Memory; não são
  medições de fluidez em aparelho.
- `pnpm validate` foi executado, mas não terminou aprovado: a etapa geral de
  browser teve timeout em `Puzzle Swap mounts selected portrait and landscape
textures and exits cleanly`, no iPhone 390. Foi interrompida após esse
  resultado. Uma execução concorrente compartilhou o servidor encerrado e
  perdeu conexão; seus resultados não validam o jogo. A matriz Guirlanda foi
  reiniciada isoladamente em porta própria. Não atribuir automaticamente o
  timeout a defeito do Puzzle ou a regressão desta mudança sem investigação.
- Corpus privado com nove derivadas seguras preparado pela ferramenta de
  mídia; cada rodada usa no máximo seis. Rodada completa em 390x844,
  412x915, 430x932 e 768x1024: zero erros de console, zero overflow e zero
  canvas após saída. Revisão visual de início, meio e final realizada em
  capturas privadas; nenhuma foto real foi versionada.
- Rodada completa adicional em 390x844 com LOW e movimento reduzido passou
  com as mesmas verificações; confirmação e ações finais preservadas.
- P2 corrigido: arte das molduras laterais cortada na borda do celular.
  Reprodução anterior: montar foto de paisagem num suporte lateral em 390px.
  Dono: GarlandLayout/GarlandPhotoFrame. Margem física agora faz parte do
  teste, além da hit area e do retângulo fotográfico protegido.
- P3 remanescente: pequena área escura entre a foto retangular e o arco
  superior da moldura. Não é vazamento branco nem corte da fotografia.
  Uma futura família de aros com abertura retangular calibrada pode reduzir
  esse espaço sem sacrificar contain ou introduzir máscara sobre a família.

Próximos gates: toque e áudio em Safari/iOS e Android físicos, tela baixa e
rotação, semântica acessível dos controles de canvas, medidas de entrada/FPS/
memória e fontes sonoras dedicadas. A V2 reutiliza três gravações autorizadas
com mixagem por intenção; não inclui trilha musical nova nem sons gravados
especificamente para cada objeto.

## Histórico de revisão V1

## Escopo e decisão

Foi comparada a composição runtime com a referência privada aprovada: noite de
inverno azul, guirlanda material de pinho e veludo, foto hero em moldura de
madeira, medalhões menores, estrelas de encaixe, seis luzes no HUD e uma luz
dourada de confirmação. A imagem foi usada como referência de direção; não
entrou no browser, não foi copiada para assets e não contém nenhuma foto de
cliente do produto.

A primeira revisão encontrou dois P2 de acabamento: contagem de progresso em
texto e fio de encaixe sem uma origem que se movesse como a luz da referência.
Ambos foram corrigidos na Scene sem mudar domínio ou dados de foto.

A segunda passagem confrontou o canvas em telefone com um corpus local do
proprietário. As nove imagens foram inspecionadas somente fora de `public`:
quatro têm proporção retrato aproximada de 0,714 e cinco, paisagem aproximada
de 1,400. As diferenças graves com a referência eram moldura em retângulo
plano, janela hero só retrato, alvos escondidos atrás da foto e caixa inferior
geométrica. A correção usa molduras alpha de madeira/latão específicas para
cada orientação, seis estrelas em duas colunas sempre expostas, caixa raster de
nogueira/veludo e uma segunda interação: tocar uma foto pendurada a apresenta
em destaque e oferece retorno explícito. Nenhum original, nome, caminho ou
pixel desse corpus foi incluído em asset, log, captura versionada ou página
pública.

Uma terceira passagem encontrou um P1 de composição na vitória: a camada clara
de suporte da foto extrapolava a abertura alpha no alto da moldura de retrato.
A Scene passou a calibrar a janela por orientação dentro do aro físico, sem
expandir o passe-partout pelo inset da foto; o fundo interno é nogueira, não
branco. A moldura de paisagem recebeu mais altura para preservar as fotos 3:2
com `contain`, e a zona hero passa abaixo das estrelas depois da seleção. Isso
garante toque–toque em todos os ganchos sem desabilitar o arraste que já
começou.

| Critério da referência                                 | Estado final | Evidência de implementação                                                                                                                               |
| ------------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foto é a heroína dentro de uma moldura física          | Aprovado     | `PhotoSurface(..., 'contain')`, poço central calmo e nenhum VFX sobre a foto.                                                                            |
| Progresso parece parte do brinquedo, não texto técnico | Aprovado     | Seis luzes-lembrança: aro de latão, miolo escuro/âmbar e pulso único no encaixe.                                                                         |
| Alvos têm material e leitura imediata                  | Aprovado     | Estrela em duas camadas: aro de latão e miolo de nogueira, com halo apenas para o próximo suporte.                                                       |
| Encaixe cria magia com causa física                    | Aprovado     | Snap da moldura primeiro; depois uma luz dourada percorre curva externa e termina em seis faíscas fora do medalhão.                                      |
| Natal é rico sem disputar a lembrança                  | Aprovado     | Fundo azul, fonte âmbar, pinho/veludo/dourado fosco e nenhum loop, bloom global ou partícula sobre rosto.                                                |
| Caixa inferior iguala o realismo de referência         | Aprovado     | Prop alpha de caixa aberta em nogueira, veludo e latão substitui o bloco geométrico; fica abaixo do palco, sem foto ou ação concorrente.                 |
| Retrato e paisagem preservam área fotográfica útil     | Aprovado     | Moldura hero escolhe a abertura pela orientação; `contain` preserva os dois formatos reais amostrados e impede que a decoração invada os pixels da foto. |
| Construção vira álbum vivo depois do encaixe           | Aprovado     | Foto pendurada abre viewer proporcional, fundo escurece e o único comando possível é retornar à guirlanda.                                               |
| Abertura não vaza conteúdo fora do aro físico          | Aprovado     | Janela de foto e suporte ficam dentro da abertura alpha; não há faixa branca atrás do laço, do arco ou da moldura.                                       |
| Moldura hero não bloqueia um encaixe                   | Aprovado     | Após a seleção, seu Zone recua abaixo das estrelas; toque–toque e arraste foram exercitados com hero paisagem.                                           |

## Premissas native-like

| Pilar                    | Resultado                | Prova ou limite                                                                                                                                                                                              |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resposta imediata        | Aprovado                 | Pressão de UI até 90 ms, seleção 120 ms, snap 180 ms, pulso de progresso 150 ms; som e haptic reforçam a mesma ação.                                                                                         |
| Interação mobile         | Aprovado                 | Foto central e slots com 72 CSS px; toque–toque conclui tudo sem arraste. Drag acompanha o ponteiro e foi exercitado em E2E.                                                                                 |
| Motion/VFX               | Aprovado                 | Tweens finitos, trilha de 260 ms, burst máximo de 6 no encaixe e 12 na vitória; `SceneScope` encerra todos na pausa/saída.                                                                                   |
| Áudio                    | Aprovado para o slice    | Gesto desbloqueia fontes locais, mudo/pausa/saída são escopados; `press`, `place` e `victory` usam grupos M4A/MP3 autorizados. Mais variações de SFX são P3, não uma justificativa para repetir sinos agora. |
| LOW e movimento reduzido | Aprovado                 | O perfil não cria emitter, trilha animada nem burst; preserva foto encaixada, estrelas materiais, progresso, som opcional e toque.                                                                           |
| Privacidade e assets     | Aprovado                 | Só derivadas `game` autorizadas entram na Scene; arte e áudio públicos têm manifesto, hash, proveniência e auditoria.                                                                                        |
| Desempenho real          | Pendente de proprietário | A cena evita pós-FX, RenderTexture, loop de neve e 3D runtime; falta coleta no Android físico de referência.                                                                                                 |
| Fotos de produção        | Aprovado para proporção  | Uma passagem privada com corpus autorizado confirmou retrato 0,714 e paisagem 1,400; os arquivos foram injetados apenas em memória para a revisão e não foram publicados.                                    |

## Evidência de revisão

- NORMAL: iPhone 390, Android 412, telefone 430 e tablet 768; capa, seleção,
  toque–toque, arraste, encaixe, visualização de lembrança, pausa, retomada e
  saída.
- Corpus local autorizado: retrato 0,714 e paisagem 1,400 foram injetados só
  em memória para a matriz 390/412/430/768; a vitória de seis encaixes por
  toque foi revisada em 390. Nenhum arquivo ou captura com foto real é
  versionado ou browser-deliverable.
- LOW + movimento reduzido: seleção e encaixe concluídos sem a decoração de
  movimento; captura privada em 390.
- Controles e lifecycle: ponte de evento, canvas único, mudo, pausa e saída
  são parte do cenário E2E da Guirlanda.
- `pnpm asset:validate` aprova o manifesto do jogo; `pnpm check:fast` aprova
  tipos, lint e testes unitários.

## Gates para promoção externa

1. Medir uma rodada no Android de referência e registrar tempo de entrada,
   fluidez percebida e bateria de forma privada e agregada.
2. Fazer uma sessão presencial curta com criança/família para validar se a
   orientação de duas colunas das estrelas parece convite natural, sem coletar
   biometria ou salvar fotos fora do fluxo autorizado.
3. Confirmar a autorização comercial final da arte gerada e do acervo sonoro.
4. Reexecutar `pnpm validate` após a correção independente do teste E2E da
   Trinca de Natal, que hoje espera `Brincadeira iniciada` e recebe `Pronto
para brincar` nos quatro viewports. Essa falha não pertence à Guirlanda.
