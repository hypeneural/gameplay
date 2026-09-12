# A Magia da Minha Foto de Natal — implementação e evidência

Pedido do proprietário: novo jogo fotográfico infantil completo. Implementação
incremental em 2026-09-07, sem atualizar Phaser 4.2.1, React ou Vite.

Este documento registra a primeira implementação. A arte procedural inicial
foi substituída na [revisão de inverno v2](MAGIC_PHOTO_WINTER_V2_2026-09-07.md);
instruções e progresso receberam a [revisão de HUD](MAGIC_PHOTO_HUD_2026-09-08.md).
Esses relatórios posteriores descrevem o estado visual atual.

## Entregas por fase

| Fase      | Arquivos criados                                              | Integração / mecânica                                                            | Assets e fallback                            | Prova e pendência                                                    |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| auditoria | SPEC, EXPERIENCE, plano de execução                           | inspeção de sessões, Node, lifecycle, áudio e escala                             | fontes locais priorizadas                    | decisões registradas antes do runtime                                |
| foto      | PhotoLayoutManager, PhotoGeometry                             | contain, coordenadas normalizadas, geometria decodificada e resize               | derivada game selecionada                    | retrato/paisagem em nove larguras no teste puro; corpus real privado |
| estados   | MagicPhotoStateMachine, Hotspots, IceGrid, MagicEventBus      | 21 estados, 5 descobertas, grade, idempotência e eventos                         | não se aplica                                | testes de sequência, duplicação, tolerância e varredura rápida       |
| presente  | ProceduralArt, GiftController                                 | três respostas crescentes, laço tolerante, cancelamento, alternativa toque–toque | arte procedural rubi/dourado em camadas      | partida real em touch e mouse                                        |
| revelação | createMagicPhotoGame                                          | foto sai da caixa; entrada e silêncio visual                                     | glow atrás da foto                           | captura privada confirma composição inteira, sem tint                |
| varinha   | FXManager, HintManager                                        | trilha por distância, hints progressivos, cinco efeitos diferentes               | partículas originais e gorro procedural      | pontos não se repetem; hints não avançam domínio                     |
| gelo      | IceController                                                 | RenderTexture, pincel suave, interpolação, grade e quebra a 68%                  | frost/cracks/shards procedurais              | correção visual de origem; quadro do gelo preserva rosto             |
| áudio     | AudioManager, manifesto JSON, proveniência, script de preparo | unlock, limite/cooldown/prioridade, música e ducking, mudo/pausa                 | 16 derivados locais de oito fontes aprovadas | testes de política; voz Santa e foley de gelo dedicados pendentes    |
| final     | composição da cena, regras de final                           | hero de 3 s, free play, easter egg, replay e catálogo                            | efeitos finitos fora da foto                 | ações abaixo da foto e desaparecimento do HUD durante hero           |
| shell     | definition, package e index; magic-photo.css                  | registro lazy, capa fotográfica e conclusão compacta                             | prévia CSS de presente                       | Phaser não é carregado pelo catálogo estático                        |

Alterações compartilhadas: `gameRegistry`, dependência em `apps/play/package.json`,
`GameScreen`, `CompletionActions`, `GamePreview`, import CSS; Photo recebe metadata
normalizada opcional, GameRunController recebe milestones limitados apenas em
analytics. Sem imports entre jogos, sem Scene exposta ao React.

## Corpus privado

Nove fotos fornecidas pelo proprietário: quatro retratos e cinco paisagens.
Original permanece fora do webroot. Pipeline existente gerou thumb/card/game com
EXIF, fit inside e sem ampliação; nove preparadas, zero falhas. Somente IDs opacos
e derivadas trafegam no servidor loopback. Não versionar fotos/capturas/caminhos
do corpus. Capturas em diretórios privados ignorados `test-results-magic-*`.

## Achados visuais corrigidos

- P1, frost deslocado: draw de textura usava origem central e ocupava apenas um
  quadrante. Corrigido para stamp de origem 0,0 com render explícito. As quatro
  bordas recebem gelo e o centro continua legível. Dono: IceController.
- P2, pausa fora do cartão: a primitiva theme espera backdrop de tela inteira.
  Corrigida a ligação com o véu; cartão e ação de continuar centralizados.
- Robustez de teste: em tablet, screenshots e swipes consumiam o período hero
  antes de uma espera fixa. Labels semânticos do canvas permitem observar a fase
  apresentada; o teste para a raspagem na quebra e acompanha hero por condição.

## Gates

Resultados finais serão preenchidos após a suíte completa. A primeira passagem
confirmou check:fast (298 testes), arquitetura sem violações e auditoria de assets.
Primeira revisão real: fluxo completo em 390/412/430 px; tablet concluiu e revelou
problema de sincronização na captura, corrigido no teste.

## Limites de homologação

- Browser desktop com emulação mobile não substitui Safari iOS/Android físico.
- Escuta real da mixagem, haptic físico, consumo térmico/memória de longa duração
  e sessão com criança sem instrução continuam gates do proprietário.
- Arte procedural é explícita, funcional e revisada; arquivos raster finais e
  sons específicos ainda listados no ASSET_MANIFEST humano. Nenhuma voz Ho-ho-ho
  foi gravada; gorro e sino são o fallback vigente.
- API produtiva de sessão/progresso e ingestão de analytics permanecem no plano
  existente do VPS. Este jogo reutiliza o contrato atual e não publica serviços.
