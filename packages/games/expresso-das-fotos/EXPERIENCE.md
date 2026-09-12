# Expresso das Fotos — experiência natalina

Use `docs/experience/christmas/ART_BIBLE.md` antes de escolher uma arte ou efeito. Este documento guia a apresentação; as regras continuam isoladas em `domain/`.

## Fantasia e tom

Um brinquedo de coleção premium sobre uma mesa de Natal: madeira envernizada, latão fosco, vidro, papel fotográfico e neve macia. A imagem da criança é sempre o objeto mais nítido e mais importante; o cenário enquadra, nunca disputa atenção.

## Primeiros cinco segundos

A foto âncora surge em uma moldura luminosa no alto da estação. A primeira faixa já pulsa suavemente e o convite diz: “Toque no caminho que brilha”. Não há tutorial modal ou texto longo.

## Roteiro de resposta

| Momento     | Visual                                           | Som / haptic                                            | LOW e movimento reduzido                 |
| ----------- | ------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------- |
| Tocar       | Compressão breve da locomotiva e luz na faixa.   | Sino de madeira discreto; haptic leve quando permitido. | Conserva luz estática e confirmação.     |
| Mover       | Expresso segue o trilho com aceleração e freio.  | Rodas macias em loop curto.                             | Deslocamento mínimo e fade curto.        |
| Acertar     | Foto cresce sem filtro e estrela entra no álbum. | Carrilhão curto e cálido.                               | Mantém foto e estrela estáticas.         |
| Outra faixa | Inclinação elástica, sem vermelho ou perda.      | Toque abafado.                                          | Retorno simples, sem movimento contínuo. |
| Dica        | Halo no trilho correto após 6,5 s.               | Uma campainha opcional.                                 | Halo estático de alto contraste.         |
| Vitória     | Árvore ilumina e foto âncora protagoniza.        | Fanfara curta, sem loop.                                | Sem neve ou brilho decorativo contínuo.  |

## Interação primária

O toque é a ação principal. Cada faixa tem área física mínima de 56 CSS px e fornece, na mesma ordem: compressão sutil, sino macio, acendimento da trilha e viagem. O arrastar é um atalho opcional: a locomotiva acompanha o dedo dentro da faixa válida; soltar fora retorna ao ponto inicial. A mecânica nunca depende de precisão fina.

## Assets necessários

Papéis previstos: cenário, molduras, trilhos, locomotiva, lanternas, neve, ícones de pausa/som, feedbacks e efeitos sonoros. Antes de integrar qualquer arquivo browser-deliverable, registrar sua proveniência e criar uma entrada válida no manifesto do asset factory.
