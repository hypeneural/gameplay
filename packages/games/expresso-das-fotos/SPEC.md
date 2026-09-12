# Expresso das Fotos — especificação V2

**Estado:** D0 está implementado; o runtime contém um vertical slice local com missão, estação, rota, entrega, pausa e som. Ainda falta o sign-off criativo D2/D5 antes da validação ampla em aparelhos ou publicação.  
**Plano:** [CG-EXPRESSO-DAS-FOTOS-V2](../../../docs/exec-plans/CG-EXPRESSO-DAS-FOTOS-V2-IMPLEMENTATION.md).

## Promessa

A criança vê uma foto-alvo no bilhete, encontra a estação que tem a mesma foto e toca nela. A chave muda e o expresso segue o trilho real até a estação. A foto vira um ornamento na Árvore das Memórias.

A ação principal inteira é: **“Ache a foto igual.”**

## Ciclo e estados

```text
ready
→ awaiting-station
  → gentle-feedback → awaiting-station
  → switching-track → travelling → delivering
  → awaiting-station | completed
```

Paused conserva fase retomável e snapshot visual pertencente ao runtime. O domínio não sabe duração, tween, Phaser, foto em pixels, rede ou áudio.

## Tipos de domínio requeridos

```ts
type StationAvailability = 'available' | 'closed';
type StationId = 'station-left' | 'station-center' | 'station-right';

interface ExpressStationCandidate {
  readonly stationId: StationId;
  readonly availability: StationAvailability;
  readonly photoId?: string;
}

interface ExpressRouteStop {
  readonly id: string;
  readonly ordinal: number;
  readonly targetPhotoId: string;
  readonly stations: readonly [
    ExpressStationCandidate,
    ExpressStationCandidate,
    ExpressStationCandidate,
  ];
  readonly targetStationIndex: 0 | 1 | 2;
  readonly railRouteId: 'north-left' | 'north-center' | 'north-right';
}
```

A rota seleciona até seis entregas com fonte determinística. Com três ou mais fotos, uma estação é alvo e duas usam fotos reais diferentes. Com duas, uma estação fechada completa a composição; com uma, a rodada é modo descoberta e não finge desafio de comparação.

## Comandos e confirmações

| Ação                     | Autoridade                         | Resultado                          |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| start                    | domínio                            | ready → awaiting-station           |
| stationChosen(stationId) | domínio                            | gentle-feedback ou switching-track |
| trackSwitchFinished      | runtime                            | switching-track → travelling       |
| trainArrivalFinished     | runtime                            | travelling → delivering            |
| deliveryPresented        | runtime                            | próxima missão ou completed        |
| pause/resume             | domínio + snapshot de apresentação | conserva a fase retomável          |

Uma escolha diferente não é falha: não altera destino, não adiciona entrega, não avança rota e só expõe feedback gentil. Confirmações atrasadas são idempotentes e ignoradas quando o run, stop ou epoch não forem atuais.

## Input e layout

- Estação inteira é o alvo; cada Zone tem pelo menos 64 CSS px no menor viewport.
- Um toque direto na estação disponível confirma a escolha no mesmo evento que produz seu feedback visual; não há gesto obrigatório adicional.
- Segundo pointer, cancelamento, pause, resize, perda de foco e saída limpam a pressão e não enfileiram comando.
- O layout puro entrega ticket, três estações, coleção, origem do trem e specs ferroviários normalizados.
- RailPathFactory, no runtime, compila specs para Phaser.Curves.Path. O mesmo path desenha/posiciona trilhos e movimenta TrainRoot.
- Somente TrainMotionController escreve x/y de TrainRoot. Rodas, cabine, sombra, farol e vapor derivam do progresso.

## Fotos e privacidade

O domínio conhece somente id, orientação e posição de catálogo. A foto âncora é obrigatória. A renderização usa derivadas autorizadas, contain e moldura fora da superfície da imagem. Original, URL, path, filename, pixel, pessoa e identificação ficam fora de tipos de domínio, logs, analytics e assets estáticos.

## Critérios de aceitação

| ID       | Requisito                                                                                    | Prova posterior              |
| -------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
| EDFV2-01 | Seleção, estações, rota e transições são determinísticas.                                    | Testes unitários de domínio. |
| EDFV2-02 | Nenhum uso ativo de faixa, portal abstrato ou gesto lateral sobrevive à migração D0.         | Busca de código + revisão.   |
| EDFV2-03 | Primeira ação é uma estação-foto clara e responde no mesmo/próximo frame.                    | Vertical slice D2.           |
| EDFV2-04 | Path, trilho, chave e trem compartilham a mesma geometria; não há tween x/y independente.    | Rail Motion Lab.             |
| EDFV2-05 | Escolha diferente não pune nem avança progresso; dica não joga sozinha.                      | Testes de jornada + D2.      |
| EDFV2-06 | Pause, resize, ocultação e shutdown invalidam callback obsoleto e preservam o ponto correto. | Lifecycle focal após D5.     |
| EDFV2-07 | Fotos em todas as orientações usam contain e não recebem filtro, máscara, tint ou distorção. | Revisão privada posterior.   |
| EDFV2-08 | Uma entrada tem um canvas e a saída libera recursos da rodada.                               | Lifecycle posterior.         |
| EDFV2-09 | LOW e movimento reduzido conservam a mesma lógica e leitura.                                 | D3/D6.                       |
| EDFV2-10 | A matriz mobile só abre depois do gate criativo D5.                                          | Registro do plano.           |

## Limites técnicos

- Domain não importa Phaser, React, DOM, fetch, localStorage, relógio real ou aleatoriedade global.
- Apenas apps/play compõe o jogo e React recebe eventos de bridge tipados.
- Phaser 4.2.1, seus tipos instalados e sua tag oficial são autoridade de API.
- Nenhum arquivo, download, criação de textura ou decoding ocorre durante switching-track, travelling ou delivering.
