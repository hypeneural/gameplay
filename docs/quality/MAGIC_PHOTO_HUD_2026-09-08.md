# Magic Photo — instruções legíveis e estrelas interativas

Pedido adicional do proprietário: texto claro sobre neve clara estava difícil
de ler; estrelas superiores pequenas precisavam de animação, interação e contraste.

## Mudanças

- `InstructionPanel`: painel cristalino escuro, texto marfim em negrito de 16–18 px,
  resolução de texto 2, sombra, ícone de orientação e entrada de 460 ms/7 px.
  Movimento reduzido apresenta o mesmo conteúdo imediatamente.
- `DiscoveryStars`: painel próprio acima da foto, cinco estrelas de 31–34 px e
  alvos de 46×48 px; contorno azul-claro nas pendentes, preenchimento dourado nas
  encontradas, halo e salto finitos na descoberta/toque. Contagem textual de 0 a 5.
- Estrela pendente mostra uma dica de 2,6 s no hotspot correspondente. Estrela
  preenchida celebra sem alterar progresso. Cooldown de 420 ms e um único som.
- Nome acessível da fase preservado; `aria-description` informa quantidade,
  instrução e possibilidade de pedir dica. Estado continua pertencendo ao domínio.
- Layout reserva espaço para os painéis. Em paisagem larga, estrelas ficam no
  centro da primeira linha, entre sair e som/pausa, aproveitando a altura.
- Mensagem de conclusão usa placa verde escura com contorno, permanecendo
  legível sobre o chão nevado também em LOW.

## Evidência privada

`test-results-magic-hud-review`: revisadas capturas de caça, dica, duas estrelas
encontradas, 320×568 e 844×390. Instrução legível sobre a neve, painéis fora da
fotografia e distinção entre estrelas vazias/preenchidas. Capturas em CSS px.
Fluxo completo em 390 px passou com foto real: presente, abertura, caça, pausa,
resize, gelo, raspagem real, hero, conclusão, replay e descarte do canvas.

Teste novo confirma que pedir dica e tocar uma estrela preenchida não aumentam
descobertas; também confirma interação depois de girar a tela. Passou em 390,
412, 430 e 768 px, com inspeção das capturas de HUD correspondentes.

## Correções encontradas na matriz

- Capa com foto horizontal, 390/412/430/768 px, P2: o estilo compartilhado
  mantinha largura de 62% junto ao deslocamento lateral do presente. Corrigido
  no CSS exclusivo de Magic Photo: dimensões explícitas por orientação e margem
  para a rotação. O teste mantém a verificação das bordas reais da impressão.
- Sincronização E2E: esperas fixas permitiam iniciar a raspagem ainda na
  transição de gelo em uma máquina ocupada. Agora cada gesto aguarda a fase
  semântica correspondente, preservando o input real e o limite de 68%.
- O módulo Node de preparo de arte declara Sharp no próprio pacote, em vez
  de depender implicitamente da instalação do pipeline vizinho.

- Desempenho do HUD: `setWordWrapWidth` no Phaser 4.2.1 redesenha a textura mesmo
  sem mudança do valor. O painel agora só o chama ao mudar a largura. O E2E
  observa 12 quadros estáveis e limita a duas chamadas de desenho de texto.

## Checks finais

`pnpm validate tests/e2e/magic-photo.spec.ts --workers=1` executado com dois
workers de Vitest e fotos reais. `check:fast`: 65 arquivos, 308 testes aprovados;
arquitetura sem violações, knip, formatação e mapa aprovados. Build aprovado.
Auditoria de assets aprovada; aviso esperado de gelo funcional mantido em LOW.

Matriz `test-results-magic-final-stable`: 19 testes aprovados e seis skips
planejados (stress/cancelamento concentrados no menor celular). Capa, HUD,
rodada completa e ausência de foto passaram nos quatro perfis. Três timeouts
(dez replays LOW, paisagem Android e tablet) motivaram reexecução dirigida.
Os swipes continuam reais; menos eventos intermediários na caça exercitam
também a detecção por segmento. A tolerância de tempo acomoda a máquina ocupada.

Alterações concorrentes de GameScreen provocaram HMR no ensaio anterior,
registrado no log local de Vite. Reexecução dirigida usa snapshot privado do
build, servido apenas no loopback com o mesmo adaptador de derivadas locais;
assim a validação não depende de um checkout em edição permanecer estável.

Reexecução `test-results-magic-snapshot`: **cinco testes aprovados**, três skips
planejados, nenhuma falha. Inclui dez replays LOW com alternativa toque–toque
e fotos horizontais nos quatro perfis, resize, raspagem, hero e saída. Na união
das duas passagens, os 22 cenários aplicáveis do jogo passaram; seis combinações
de stress/cancelamento são intencionalmente limitadas ao menor celular.

Build com a placa escura de conclusão aprovado em 2026-09-08; conferência visual
adicional em 2026-09-09 no mesmo snapshot servido localmente. O relatório de
`validate` da primeira matriz mantém seus timeouts históricos; não foi
reescrito como se tivesse passado em uma única execução.

Handoff `test-results-magic-handoff`, 2026-09-09: rodada completa em 390 px
aprovada em 57,1 s com o CSS final. Captura de free play inspecionada: mensagem
com fundo verde escuro e contorno, foto inteira, espaço entre moldura e ações.
Capturas de gelo e conclusão horizontal em 844×390 também inspecionadas;
nenhuma sobreposição da foto com os painéis.

Capa final também conferida após decodificar os quatro WebP: neve, pingentes,
floresta e presente carregados, CTA visível e sem scroll horizontal. Evidência
privada em `.reference/magic-cover-final.png`. Capturas imediatamente após a
navegação podem anteceder o carregamento de backgrounds CSS e não provam a
composição completa.

O servidor local usa derivados privados e permanece no endereço de preview
combinado. Não há upload nem publicação de fotos. Revisão em Chromium emulado;
Safari e telefone físico não foram medidos nesta etapa.
