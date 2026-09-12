# Cartão de Memórias

## Finalidade

Fazer o baralho parecer um pequeno álbum natalino físico: a criança percebe um
verso que convida ao toque e, ao virar, encontra sua foto protegida por uma
moldura. O cartão não usa a foto como ornamento nem exige leitura de rótulo.

## Planos de cena

O cartão inteiro pertence ao plano L2. Sombra, moldura, passe-partout, foto,
verso, fita e selo nunca saem da caixa do próprio cartão; neve, luzes e outros
planos não atravessam a grade.

## Asset aprovado

Nenhum arquivo novo é necessário nesta primeira receita. A frente usa somente
a derivada `card` já autorizada da sessão, em modo `contain`. Verso, fita,
selo, moldura e sombra são materiais geométricos locais do runtime. Se uma
textura física substituir esses materiais, ela precisa de manifesto e
proveniência antes de chegar ao navegador.

## Gatilho

- Entrada: o verso já está disponível para a primeira ação.
- Pressão: o cartão desce levemente e aquece a borda.
- Virada: a face é trocada no meio da animação curta.
- Acerto: a moldura ganha dourado/verde e a estrela aparece no canto, fora da
  área fotográfica.
- Erro gentil: as duas fotos voltam ao verso sem vibração agressiva.

## Duração e intensidade

Pressão dura 70 ms. A virada tem duas metades de 110 ms e nenhuma repetição.
O acerto usa apenas um pulso de 180 ms. Não há loop no cartão nem balanço que
desloque os alvos de toque.

## Foto protegida

A foto ocupa a área interna do passe-partout marfim e usa `contain`: retrato,
paisagem e quadrado permanecem proporcionais. As faixas restantes recebem o
papel marfim, não branco técnico, stretch ou corte automático. Selo e estrela
ficam acima do verso ou na moldura, jamais sobre o rosto.

## Limite ativo

Há somente oito cartões em EASY, cada um com uma sombra, uma moldura, uma
foto, um verso interno, uma fita, um selo e textos estáticos. A virada cria no
máximo um tween por cartão; acerto cria no máximo dois. Nenhum objeto é criado
em cada frame ou em cada redimensionamento.

## Som

Esta receita ainda não dispara áudio: cada papel sonoro precisa de arquivo,
manifesto e proveniência próprios. Quando os arquivos forem aprovados,
`card.flip`, `card.return` e `pair.match` acompanham estes mesmos gatilhos e
nunca atrasam a resposta visual.

## Qualidade

NORMAL e LOW mantêm os materiais, contraste e troca de face. LOW omite apenas
efeitos decorativos externos. Movimento reduzido troca a face estaticamente e
mantém a moldura de acerto; a brincadeira continua completa.

## Ciclo de vida

`MemoryScene` cria os objetos uma vez e os reposiciona no resize. Os tweens
entram no `SceneScope`; pausa estabiliza a face de acordo com o estado puro e
destruição remove todos os objetos junto da Scene.

## Teste de aceite

Em 390, 412, 430 e 768 CSS px, conferir que o verso é reconhecível, a foto não
estica, o par final centralizado não perde área de toque e a estrela de acerto
não encobre a foto. Repetir em LOW, movimento reduzido, pausa no meio da
virada e saída durante resolução.
