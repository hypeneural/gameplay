# Trinca de Natal — reconciliação da auditoria profunda com o repositório

**Data:** 2026-08-30  
**Fonte analisada:** `C:\Users\Anderson\Desktop\deep-research-report.md`  
**Decisão:** preservar T0–T2 e transformar T3–T6 na R3 de apresentação de
produção. Nenhuma regra, foto de sessão ou asset de cliente será movido para
fora dos seus limites atuais.

## Método e autoridade

1. Releitura do relatório completo e dos contratos do produto, experiência,
   assets, privacidade, qualidade e arquitetura.
2. Inspeção do runtime, domínio, testes, `GameRunController`, `SceneScope` e
   `PhotoSurface` atualmente no workspace.
3. Confirmação local de `phaser@4.2.1` em
   `apps/play/node_modules/phaser/package.json` e dos tipos instalados.
4. Rechecagem na fonte oficial tag
   [`v4.2.1`](https://github.com/phaserjs/phaser/tree/v4.2.1), na skill
   vendorizada e na API oficial. A documentação pública que aponta para 4.0
   serve somente como explicação; a assinatura usada continua confirmada pela
   tag e pelos tipos 4.2.1 locais.

## Achados confirmados

| Achado do relatório                          | Evidência atual                                                                            | Decisão R3                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| O domínio é o ativo correto                  | `Rules`, `Match`, `Setup`, `PhotoSelection` e `Ai` são puros e determinísticos             | Preservar; nenhum vencedor, placar ou turno será calculado em Phaser.                                         |
| A Scene ainda concentra apresentação demais  | `createTicTacToeGame.ts` tem 793 linhas e combina setup, picker, board, pausa e resultados | Extrair views e diretores concretos antes de som/VFX final.                                                   |
| Célula confirma em `pointerdown`             | Cada `Zone` chama `handleCellPress` em `POINTER_DOWN`                                      | Migrar para pressão imediata no down e commit validado no up, com cancelamento por slop/epoch/pausa.          |
| Peças existentes são recriadas               | `refreshBoard()` chama `clearPieces()` e recria todas as peças                             | Criar `BoardView` e nove `CellView` permanentes; só o cartão de colocação será transitório.                   |
| Picker não é fotográfico                     | O runtime usa seis labels `Lembrança N` e somente `card` depois da escolha                 | Mostrar páginas de seis `thumb` reais, carregar apenas `B.card` após seleção e nunca pré-carregar o catálogo. |
| A apresentação prometida não existe ainda    | Sem assets estáticos aprovados, áudio, garland, docks, Santa, hero final ou VFX diretor    | Tratar T3 como reconstrução de apresentação, não como polimento do Board Lab.                                 |
| A prova Master não é um oráculo independente | O helper atual chama `chooseSantaTicTacToeMove` no turno de Santa                          | Substituir por oráculo separado e adicionar simetrias + fixtures de fork múltiplo.                            |

## Correções e nuances desta leitura

- O ZIP examinado no relatório tinha uma Scene de aproximadamente 846 linhas;
  a versão do workspace tem 793 linhas depois do Board Lab e da correção de
  pausa. O risco arquitetural permanece, portanto a meta é por responsabilidade,
  não por contagem de linhas.
- A jogada planejada de Santa já é calculada antes do delay no runtime atual.
  A R3 a formaliza com revisão de tabuleiro, rodada e epoch, para invalidar
  apenas estados realmente obsoletos.
- `GameRunController.open()` inicia o `ActiveGameClock`; `start()` emite o
  começo interativo, mas não é o início do relógio. A R3 adia `start()` até o
  primeiro board jogável sem alterar a semântica compartilhada de duração.
  Excluir setup do relógio seria uma decisão de `platform`, fora do escopo
  deste jogo.
- O relatório recomenda desligar música em LOW; a Bíblia de arte e áudio
  tratam LOW como política visual. A decisão R3 é: LOW mantém música se
  `soundEnabled` estiver ativo, salvo medição física que prove a necessidade de
  omiti-la. Movimento reduzido e mudo continuam controles independentes.
- Não criar `assets/manifest.json` vazio: o contrato exige inventário de
  arquivos browser-deliverable reais. O manifesto entra junto dos primeiros
  assets aprovados, nunca com placeholders.

## APIs Phaser revalidadas

| Superfície          | Evidência oficial 4.2.1                                                                                                                                                                                                                                                                | Uso R3                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input de célula     | [InputPlugin](https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js), [Zone](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/zone/Zone.js), tipos `GAMEOBJECT_POINTER_DOWN`, `GAMEOBJECT_POINTER_MOVE`, `GAMEOBJECT_POINTER_UP`, `POINTER_UP_OUTSIDE` | Uma Zone retangular não renderizada por célula; `topOnly` fica verdadeiro. Scene-level `pointermove`/`pointerup` confirma o mesmo pointer e a mesma Zone. |
| Pointer unificado   | [skill oficial de input](https://github.com/phaserjs/phaser/blob/v4.2.1/skills/input-keyboard-mouse-touch/SKILL.md) e tipos locais `Pointer.id`, `Pointer.pointerId`, `downX/downY`                                                                                                    | Capturar somente um pointer dono; cancelar com slop de 10 CSS px e em pause, resize, shutdown ou saída.                                                   |
| Resize              | [ScaleManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js) e skill v4.2.1                                                                                                                                                                                | Manter `Scale.RESIZE`; reflow de views persistentes, sem nova Scene, canvas, match ou textura.                                                            |
| Fotos proporcionais | [Image](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/image/Image.js) e tipos locais de `setDisplaySize`                                                                                                                                                              | Continuar com `PhotoSurface(..., 'contain')`, sem crop ou filtro de foto.                                                                                 |
| Burst finito        | [ParticleEmitter](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/particles/ParticleEmitter.js)                                                                                                                                                                         | Um emitter próprio reutilizável; `explode()` somente em eventos causais, nunca um emitter por toque.                                                      |
| Áudio próprio       | [BaseSoundManager](https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/BaseSoundManager.js)                                                                                                                                                                                       | Diretor guarda handles TTT; não usar `pauseAll`, `resumeAll`, `stopAll` ou mute global.                                                                   |

## Ordem de execução aprovada

1. **R3-A — contratos e baseline:** consolidar a R3, corrigir a personalidade
   Gentil e criar provas independentes da IA. Sem asset final.
2. **R3-B — input e ciclo de vida:** ponteiro down/up, cancelamento, razões de
   pausa e `GameRun.start()` no board interativo.
3. **R3-C — board persistente e movimento:** nove células estáveis, cartão
   transitório e normalização segura em pause/resize.
4. **R3-D — fotografia real:** docks, picker paginado com thumbs e B.card
   carregada somente após escolha.
5. **R3-E — vertical slice A1:** assets aprovados, Santa, board físico,
   guirlanda, hero final e auditoria de manifesto.
6. **R3-F — som, haptic, VFX e qualidade:** diretores de ownership local,
   feedback finito e fallbacks LOW/reduzido.
7. **R3-G — matriz e liberação:** lifecycle automatizado, revisão visual,
   Android de referência e validação integral.

## Gates que permanecem do proprietário

- Nenhum arquivo de arte, áudio, personagem ou música entra antes de origem,
  licença, adequação, bytes, dimensão/duração e manifesto aprovados.
- A cena A1 em 390 × 844 precisa parecer final em NORMAL antes de ampliar
  cenário, galeria ou HIGH.
- P1/P2 de gesto, foto, turno, vitória, pausa ou lifecycle bloqueia assets de
  decoração e matriz de dispositivos.
