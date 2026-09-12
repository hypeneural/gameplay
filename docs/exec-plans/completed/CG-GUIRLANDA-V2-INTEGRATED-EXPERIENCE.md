# Guirlanda V2 — experiência integrada

Data: 2026-09-04. Estado: implementação local entregue; gate integral e
validação física pendentes. O plano permanece ativo para fechar esses gates.

## Decisão

A revisão fornecida pelo proprietário seleciona uma segunda passagem de
produto: foto primeiro, suportes físicos discretos, progresso incorporado à
guirlanda, caixa como origem visível de cada lembrança, encaixe com contato e
acomodação e celebração antes de ações finais integradas ao cenário.
Preservar domínio, seleção de até seis fotos, contain, toque–toque, privacidade
e lifecycle. A ausência de cronômetro/punição continua deliberada.

## Trabalho desta entrega

- Extrair geometria responsiva, moldura e direção de movimento em módulos
  próprios; evitar reconstruir a engine ou duplicar estado.
- Remover barra e progresso externos ao mundo. Suportes discretos mantêm
  hit areas confortáveis; as fotos montadas usam molduras físicas existentes.
- Tornar a caixa origem de chegada, com trajetória cancelável, contato,
  acomodação e propagação de luz periférica após a colocação.
- Sequenciar vitória antes do painel final; alinhar a tipografia e materiais
  do shell ao canvas e preservar safe areas reais.
- Isolar instâncias de áudio, diferenciar intenções sonoras e limitar vozes.
- Validar input, resize durante transições, pausa/saída, LOW/reduzido e
  composição mobile com derivadas reais autorizadas em ambiente privado.

## Critérios de saída

Foto proporcional e abertura limpa; todos os seis suportes alcançáveis;
nenhuma colocação duplicada; estado concluído publicado depois da apresentação
finita ou imediatamente no reduzido; pausa/saída cancela recursos; som só
controla vozes próprias. Evidência de browser não substitui Android/iOS físico.

## Limites

Assets de cliente não entram em prompts, arte pública, logs ou snapshots
versionados. Música/ambiente só serão adicionados se houver material próprio
ou autorizado que caiba na direção e orçamento. Medição em aparelho físico
permanece uma etapa de validação de lançamento, não uma alegação desta revisão.

## Entrega implementada

Geometria, composição da moldura, movimentos e ambiente foram separados em
GarlandLayout, GarlandPhotoFrame, GarlandMotionDirector e GarlandAmbientDirector.
Ganchos raster de latão substituem estrelas; miniaturas materiais têm margem
protegida. As 24 lâmpadas acompanham o progresso e a caixa entrega a próxima
foto. Snap aceita uma colocação por vez; resize/pausa preservam o domínio e
a vitória publica conclusão uma única vez, depois da apresentação finita.
O áudio usa vozes próprias, prioridades e limite de concorrência. O painel
final foi integrado ao material e à tipografia do jogo.

Revisão privada com derivadas reais: rodada de seis fotos em 390/412/430/768,
mais LOW/reduzido em 390; nenhum erro de console, overflow ou canvas residual.
Tipos, lint, 259 testes unitários, arquitetura, código morto, formato, mapa,
manifesto e build passaram. A execução integral foi interrompida depois de
um timeout em teste de Puzzle; não considerar `pnpm validate` aprovado.
Detalhes e achados remanescentes estão na revisão de qualidade de 2026-09-04.
A reexecução isolada da Guirlanda concluiu com 12/12 E2E aprovados em cinco
minutos, cobrindo NORMAL e LOW/reduzido nos quatro viewports.

Próxima tarefa: estabilizar e repetir o gate integral em execução isolada,
medir a entrada em aparelho físico e revisar tela baixa/rotação. A janela
curva da moldura e a acessibilidade semântica de canvas continuam pontos
explícitos de polimento, não requisitos declarados resolvidos.
