# Puzzle Swap — iteração de experiência nativa no celular

**Estado:** em execução

## Objetivo

Transformar o Puzzle Swap no primeiro modelo visual reutilizável para os jogos
de fotos de Natal: lúdico, claro para crianças, leve no celular e sem termos
em inglês para quem está jogando.

O mecanismo de troca, a segurança das fotos e o ciclo de destruição já são
base validada. Esta etapa melhora a apresentação sem reescrever as regras do
quebra-cabeça.

## Entregas desta rodada

- [x] Traduzir as mensagens técnicas visíveis: os códigos internos continuam
      tipados, mas a pessoa vê frases como “Brincadeira iniciada” e “Brincadeira concluída!”.
- [x] Traduzir orientação, amostra de sessão e laboratório de desenvolvimento
      para português simples.
- [x] Criar fundo natalino próprio, com centro de leitura calmo para a foto.
- [x] Otimizar o fundo para WebP de 106,970 bytes; o PNG editável fica fora do
      diretório público.
- [x] Trocar glifos de texto por cinco ícones próprios: dica, pausa, continuar,
      som e silenciar.
- [x] Corrigir a animação de entrada e de vitória para nunca restaurar o tamanho
      nativo da textura da foto. A grade agora preserva a proporção calculada.
- [x] Reiniciar a revisão local com os derivados privados configurados e
      conferir o fluxo em 390 × 844 com fotos locais.
- [x] Remover da interface da pessoa qualquer rótulo de orientação da foto;
      ela escolhe uma lembrança, não um formato técnico.
- [x] Fazer a foto escolhida pulsar com moldura e brilho finitos, e transformar
      o convite “Jogar agora” em uma chamada visual com miniatura da lembrança.
- [x] Mostrar na capa o derivado real da foto escolhida, em moldura natalina e
      sem corte ou distorção; a antiga paisagem ilustrada fica apenas como arte
      do cenário do jogo.
- [x] Substituir a Lua geométrica sobreposta pela lua já ilustrada no cenário e
      aplicar neve suave no canvas, limitada por qualidade, movimento reduzido,
      reserva de partículas e desligamento de cena.
- [x] Evoluir a dica: ela ilumina a casa que precisa da peça e a peça que deve
      ir para lá, sem executar a troca; a instrução explica a ação em português
      simples e há teste puro do par sugerido.
- [x] Dar resposta visual e sonora ao começo e ao fim de um arraste, aos
      controles Phaser e aos controles principais do aplicativo.

## Critérios que continuam obrigatórios

1. A foto entra apenas como derivado autorizado; original, nome de cliente e
   caminho de disco nunca chegam ao navegador.
2. Uma única textura da foto abastece todas as peças. A proporção é calculada
   por `GridPlanner`; uma troca move apenas duas peças existentes.
3. A topologia é escolhida no início da partida e não muda ao girar ou redimensionar.
4. Som e música só começam depois do gesto da pessoa, têm botão de silenciar e
   são encerrados ao sair.
5. Economia de dados e redução de movimento retiram decoração opcional, sem
   retirar a confirmação de toque ou a possibilidade de jogar.
6. O cenário é decorativo: nunca encobre, corta ou substitui a fotografia.

## Próximos pacotes, na ordem segura

### 1. Validação de uso infantil

- [ ] Medir se crianças entendem que as duas bordas iluminadas devem ser
      trocadas, antes de aumentar a intensidade ou duração da dica.
- [ ] Medir contraste em fotos claras, escuras, verticais e horizontais.
- [ ] Confirmar em Android físico a taxa de quadros e o custo da neve em NORMAL
      e HIGH; LOW e movimento reduzido continuam sem neve.

### 2. Celebração da lembrança

- [ ] Dar mais prioridade à foto completa ao terminar.
- [ ] Aplicar uma única explosão curta de brilho e o som de comemoração já autorizado.
- [ ] Oferecer ação clara para escolher outra foto; não adicionar compartilhamento
      nem download antes do contrato de produto e privacidade correspondente.

### 3. Pacote reutilizável para os próximos jogos

- Criar inventário e orçamento de ativos por jogo: origem, licença, tamanho,
  dimensões e telas que usam cada item.
- Preparar texturas e som antes da entrega, nunca gerá-los ou buscá-los durante
  a partida.
- Só incluir ativo de terceiros com licença inequívoca e registro de proveniência.
- Extrair uma composição de apresentação apenas depois de dois jogos realmente
  usarem o mesmo padrão; não criar uma classe-base especulativa.

## Como validar cada entrega

1. Rodar `pnpm check:fast` enquanto a alteração está pequena.
2. Abrir a rota local em 390 × 844 com `?test-media=local` e conferir capa,
   entrada, neve, toque, arraste, dica de duas peças, pausa, som, vitória e saída.
3. Conferir retrato e paisagem, inclusive após redimensionar a tela.
4. Rodar `pnpm validate` antes de publicar: arquitetura, tipos, testes, build
   e navegador precisam passar juntos.

## Decisões pendentes do produto

- A direção final deve ser mais divertida e ilustrada, mais elegante como um
  estúdio, ou híbrida? Esta primeira arte segue o caminho híbrido.
- Qual faixa etária é a principal? Ela define quantidade de peças, tamanho de
  texto e intensidade dos efeitos.
- Ao vencer, a pessoa somente troca de foto ou segue para outro jogo? Essa
  resposta define a próxima tela de conclusão.
