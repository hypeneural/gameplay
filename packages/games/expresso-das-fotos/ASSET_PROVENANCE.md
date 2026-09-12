# Proveniência de assets — Expresso das Fotos

| Papel              | Origem planejada                               | Estado   | Observação                                                                  |
| ------------------ | ---------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Fotos da sessão    | derivado autorizado pelo media pipeline        | pendente | nunca usar original nem caminho local                                       |
| Fundo L0/L1        | arte criada para o projeto via OpenAI ImageGen | pronto   | plataforma e vila sem pessoas/texto; centro protegido para foto e interação |
| Locomotiva         | arte criada para o projeto via OpenAI ImageGen | pronto   | sprite 2D premium com alfa; preparado para 96 CSS px                        |
| Molduras e cenário | arte própria / licenciada                      | pendente | aprovar licença e atlas antes de integrar                                   |
| Ícones             | vetores próprios                               | pendente | controles de React, não texto em bitmap                                     |
| Efeitos sonoros    | bundle interno autorizado + Mixkit licenciado  | pronto   | toque, retorno, selo, final e quatro cues ferroviários em M4A/MP3           |

## night-station-diorama-v1

**Substituído em runtime por `night-station-platform-diorama-v2`.** Este
registro continua apenas como histórico da primeira direção de arte; o arquivo
público correspondente foi retirado ao aprovar o cenário v2.

- **Papel:** fundo estático L0/L1 da estação; enquadra a cena sem entrar na
  zona protegida de foto, trilhos ou HUD.
- **Origem e licença:** criado para o projeto no OpenAI ImageGen (gpt-image-2),
  identificador `expresso-a1-night-station-v1`; licença `project-owned`.
- **Receita:** noite de Natal em diorama físico premium, 1024 × 1536, madeira
  escura e janelas âmbar laterais, vila e pinheiros discretos; sem pessoas,
  rostos, crianças, texto, números, logotipos, marcas ou foto incorporada;
  centro calmo e escuro para conteúdo da sessão.
- **Preparação:** exportação WebP com Sharp 0.35.3, qualidade 82, sem recorte
  ou aumento de escala; `69.570` bytes, SHA-256
  `bae6d25f540de245bde958e0f3b56becaef6c0c336e666f3a23e8ad7bc073a0d`.
- **Revisão técnica em 28-08-2026:** o arquivo foi inspecionado em fundo
  claro/escuro e em tamanho nativo; não tem canal alfa, logo não há halo de
  recorte. A integração usa cobertura proporcional e um scrim discreto,
  preservando a leitura de foto, faixa e HUD também em LOW e movimento reduzido.

## night-station-platform-diorama-v2

- **Papel:** fundo estático L0/L1 da estação atual; acrescenta plataforma,
  sinal e vila nevada para que o trem circule num lugar físico, sem usar foto,
  pessoa, personagem ou texto.
- **Origem e licença:** criado para o projeto com a ferramenta integrada
  OpenAI Image Generation em 29-08-2026, identificador
  `expresso-a1-night-station-platform-v2`; licença `project-owned`. A imagem
  foi gerada a partir do cenário A1 como referência de estilo. Ela não recebeu
  fotos da sessão nem qualquer outro dado do cliente.
- **Receita:** preservar o portal de madeira, as janelas âmbar, a neve e a
  paleta azul-noite; incluir plataforma de madeira, sinal ferroviário, trilhos
  distantes e vila em baixa contrastância na metade inferior. O centro médio
  continua escuro e livre para as três escolhas e a carta.
- **Preparação:** o PNG de geração fica fora do webroot. Sharp 0.35.3 entrega
  WebP 1024 × 1536, qualidade 80, sem recorte nem aumento de escala:
  `108.464` bytes, SHA-256
  `2c30d0f3c6e353d9d4114f7869e89b9e51d7c3708cb284899652423b4f7384fb`.
- **Revisão técnica em 29-08-2026:** em captura focal, a plataforma remove a
  leitura de vazio do palco e os detalhes permanecem abaixo/fora das fotos.
  Sem alfa, sem texto e sem faces; LOW e movimento reduzido mantêm o mesmo
  fundo estático para preservar a clareza da tarefa.

O manifesto v2 acompanha cada arquivo público com hash, dimensões, origem e
perfil de qualidade. Nenhuma foto da sessão entra neste inventário.

## premium-christmas-locomotive-v1

- **Papel:** locomotiva de primeiro plano no trajeto; é o único sprite de
  veículo e fica abaixo das fotos das estações.
- **Origem e licença:** criado para o projeto com a ferramenta integrada
  OpenAI Image Generation, identificador
  expresso-premium-locomotive-v1; licença project-owned.
- **Receita:** ilustração 2D premium de locomotiva natalina de brinquedo,
  esmalte vinho, teto verde-pinho, acabamento em latão antigo e farol quente;
  sem pessoas, texto, logos, cenário, trilhos ou marca. O pedido exige fundo
  transparente, silhueta horizontal e leitura em aproximadamente 120 CSS px.
- **Preparação:** PNG de geração mantido fora do bundle público; Sharp 0.35.3
  redimensiona sem ampliar para 768 × 512 e entrega WebP qualidade 86 com
  alpha quality 100. Resultado: 123.572 bytes, SHA-256
  67448dee498e46bff61e772a6e1ee33095192e51d85bf1ae24e91d8daffbe8b3.
- **Revisão técnica em 29-08-2026:** canal alfa confirmado; em 390 × 844 o
  sprite é limitado a 96 × 64 CSS px, chega na plataforma abaixo da foto e
  recebe somente inclinação leve durante a curva. Assim, não gira vertical nem
  obstrui a resposta da criança.

## authorized-legacy-audio

O proprietário já autorizou internamente este pequeno conjunto de efeitos do
bundle natalino anterior do projeto. Para preservar o isolamento do jogo, os
arquivos foram copiados para o diretório público do Expresso; nenhum caminho,
foto, nome de sessão ou dado de cliente foi reutilizado.

| Papel no Expresso | Arquivos browser  | Duração máxima | Uso no jogo                        |
| ----------------- | ----------------- | -------------- | ---------------------------------- |
| escolha certa     | correct.m4a/mp3   | 0,48 s         | estação correta e início da viagem |
| retorno gentil    | wrong.m4a/mp3     | 0,21 s         | foto diferente                     |
| controle          | tap.m4a/mp3       | 0,12 s         | ligar ou desligar som              |
| conclusão         | celebrate.m4a/mp3 | 3,78 s         | árvore completa                    |

- **Origem e licença:** bundle interno autorizado pelo proprietário,
  identificado como owner-authorized-legacy-bundle; licença project-owned.
- **Preparação:** cópia sem recodificação do par M4A/MP3 já validado, com hash
  e duração registrados no manifesto v2. O runtime usa no máximo duas
  instâncias por efeito, respeita a preferência de som da pessoa e não inicia
  música em loop.

## mixkit-train-sound-effects-2026-08-29

O proprietário autorizou nesta tarefa a aquisição e integração de efeitos de
trem de terceiro. Foram selecionados somente sons sem voz e preparados como
pequenos trechos para a viagem; os WAVs originais de download ficaram fora do
repositório e do diretório público.

| Cue no jogo                   | Item Mixkit                                                                                              | Papel na cena                                  | Derivada preparada |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| `steam-release` e `rail-roll` | [Steam train passing — 1630](https://mixkit.co/free-sound-effects/download/1630/?context=item+grid)      | vapor de saída e rodas enquanto o trem se move | 0,55 s e 1,30 s    |
| `toy-whistle`                 | [Toy train whistle — 1631](https://mixkit.co/free-sound-effects/download/1631/?context=item+grid)        | apito único e baixo na partida                 | 1,05 s             |
| `arrival-brake`               | [Train arrival at station — 1629](https://mixkit.co/free-sound-effects/download/1629/?context=item+grid) | freio macio antes da entrega                   | 1,10 s             |

- **Licença e fonte:** Mixkit Sound Effects Free License, consultada em
  29-08-2026; a [página de licença](https://mixkit.co/license/) separa a
  licença de efeitos sonoros das demais categorias. Cada item e a URL da
  licença aparecem no manifesto v2, com `origin: third-party-licensed`.
- **Preparação:** download WAV do item; recorte, fade de entrada/saída e
  `loudnorm` com alvo -24 LUFS / pico -2 dB em FFmpeg 8.0.1; exportação AAC
  80 kbps M4A e MP3 96 kbps, 44,1 kHz estéreo. Hash, bytes e duração são
  conferidos pelo Asset Factory antes da integração.
- **Mix em runtime:** vapor 0,16; apito 0,22; rodas 0,11; freio 0,15. O apito
  toca uma vez por saída e o som de rodas é uma única instância retida, pausada
  no pause/blur e destruída ao sair. Som desligado continua deixando toda a
  resposta visual disponível.
