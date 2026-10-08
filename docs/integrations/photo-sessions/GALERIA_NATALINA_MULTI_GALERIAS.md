# Galeria Natalina e multi-galerias

**Estado:** decisão de arquitetura e produto para implementação.  
**Data:** 06/10/2026.  
**Agente alvo:** Antigravity / fluxo operacional chamado FluentGraft 2.19.1 pelo operador.

Este documento define como o álbum fotográfico natalino entra no mesmo fluxo de sessões, mídia e jogos sem criar uma segunda plataforma.

A seleção de bibliotecas/donors externos é regida por `AUDITORIA_GITHUB_GALERIA_NATALINA_MOBILE_2026-10-06.md`. No primeiro corte, React Photo Album + Yet Another React Lightbox formam a stack aprovada; PhotoSwipe é challenger de benchmark em aparelho físico, não uma segunda implementação permanente.

## 1. Modelo canônico

A Galeria Natalina não é uma autoridade paralela. Ela é uma projeção da sessão ativa:

```text
photoSessionId
  + galleryKey
  + activeRevisionId
  + ordered Photo[]
        |
        +-> Hub
        +-> /fotos
        +-> jogos
```

No MVP, uma `photoSessionId` representa uma galeria pública. O backend suporta N sessões/galerias simultâneas.

Para permitir mais de uma galeria vinculada ao mesmo pedido/CRM, introduzir `galleryKey` estável. Exemplo operacional:

```text
crmOrderUuid = order-123
  galleryKey = natal-principal  -> photoSession A
  galleryKey = familia-extra    -> photoSession A2
```

Não usar `crm_order_uuid UNIQUE` isolado. A constraint recomendada é:

```text
UNIQUE (crm_order_uuid, gallery_key)
```

O `photoSessionId` continua sendo a identidade técnica da galeria. Não adicionar uma entidade/tabela `gallery` apenas para espelhar a UI.

Cada access token resolve uma única sessão/galeria. Um browser grant é escopado à sessão autorizada; não existe "galeria atual" global no servidor.

## 2. Rotas

```text
/s/:token
  Hub da sessão/galeria

/s/:token/fotos
  Galeria Natalina

/s/:token/game/:gameId
  jogo usando fotos da mesma activeRevision
```

Reload direto, Back/Forward e compartilhamento precisam manter a mesma autoridade de token/grant.

## 3. Layout do álbum

O corpus de Natal 2024 contém orientações mistas em escala: 10.244 fotos, 63,2% landscape e 36,8% portrait, com até 92 fotos em uma sessão. Isso torna crop fixo inadequado para a galeria.

### Mobile

Abaixo de 600 CSS px:

- uma foto por linha;
- ordem editorial da sessão;
- largura quase total;
- altura natural;
- sem `aspect-ratio: 4/5`;
- sem `object-fit: cover`;
- espaço curto entre fotos;
- detalhes natalinos ficam fora da área da fotografia.

Esse layout se comporta como álbum, não como seletor.

### Tablet e desktop

- 600–899: duas colunas.
- 900+: duas ou três colunas conforme container e densidade.
- O mesmo array e os mesmos IDs alimentam todas as faixas; não criar outra galeria desktop.

React Photo Album continua aprovado para layout responsivo, mas o primeiro corte controla batches no app.

## 4. Tamanhos de imagem

Receita já medida:

| Variante | Long edge | WebP | Uso atual              |
| -------- | --------: | ---: | ---------------------- |
| thumb    |       480 |  q82 | picker/preview pequeno |
| card     |       800 |  q82 | cartas/secundárias     |
| game     |      1600 |  q82 | hero/puzzle/lightbox   |

O corpus de 30 fotos mediu aproximadamente:

- thumb: 0,77 MB para 30;
- card: 1,59 MB para 30;
- game: 4,26 MB para 30.

### Problema do álbum full-width

Em uma tela de 390–430 CSS px, uma foto do feed ocupa aproximadamente 360–406 CSS px.

Para landscape típico, `card=800` entrega largura próxima de 800 px e atende bem DPR ~2.

Para portrait típico, como 800 é long edge, a largura real fica perto de 568 px. Em um slot de ~406 CSS px isso equivale a ~1,4×, abaixo do alvo visual premium de DPR ~2.

### Candidato de benchmark

Antes de congelar o contrato de mídia, testar:

```text
gallery = 1200 long edge
WebP 82
autoOrient
sRGB
fit inside
withoutEnlargement
```

Retrato típico ficaria perto de 852 px de largura, cobrindo muito melhor um slot mobile ~406 CSS px em DPR 2.

A quarta variante só entra se o benchmark real demonstrar benefício aceitável de nitidez/bytes.

Se aprovada:

```text
picker      -> thumb
album feed  -> card + gallery
lightbox    -> gallery + game
hero/jogo   -> game
cards jogo  -> card
```

Se não for aprovada, manter três variantes e usar `card + game` somente onde necessário.

## 5. Responsive images

Cada derivado precisa registrar:

```text
url
width real
height real
byteLength
sha256
```

No DTO público, width/height reais são necessários; hash e path permanecem privados.

Nunca escrever `480w`, `800w` ou `1600w` a partir do nome da receita. O descritor `w` usa a largura intrínseca do arquivo depois da orientação/resize.

## 6. Batching e rede

O smoke da galeria legada mostrou 28 requests únicos de mídia no primeiro viewport de 390 px, apesar do lote nominal de 12. O novo álbum precisa testar rede, não apenas quantidade de elementos React.

Primeiro corte mobile:

- 6–8 fotos montadas;
- poucas imagens antecipadas;
- observer com margem curta;
- botão "Ver mais" permanece como fallback;
- zero `game` no feed inicial;
- somente candidato LCP pode usar eager/high priority.

Não usar o helper de infinite scroll com margens default sem medição.

## 7. Viewer e gestos

Viewer primário: Yet Another React Lightbox + Zoom em módulo lazy.

No mobile:

- preload inicial 1;
- `contain`;
- swipe/pinch;
- foto atual e vizinhas necessárias somente;
- fechar restaura scroll/seleção.

PhotoSwipe + `react-photoswipe-gallery` é o challenger oficial. Ele só deve ser implementado em spike se o viewer primário falhar ou ficar marginal em Safari/iPhone, swipe/zoom, memória ou ciclos de abrir/fechar. O produto final mantém um único viewer.

Nenhuma biblioteca de viewer recebe `Session`, token ou `GameContext` integral. `LightboxSlideAdapter` fornece somente id/alt e variantes responsivas necessárias.

## 8. Direção visual natalina

A galeria deve parecer álbum de Natal do estúdio, não tela de jogo.

Princípio:

```text
header/footer = natal ricos
miolo do feed = fotografia calma
```

Assets compartilhados pertencem a:

`apps/play/public/assets/christmas-shell/gallery/`

e ao manifesto/proveniência do owner `christmas-shell`.

Pacote inicial recomendado:

- composição de pinho/guirlanda para topo;
- pequeno ramo de canto;
- divisor de estrela/floco;
- textura sutil de papel/neve;
- grupo pequeno de luzes quentes.

Não usar um background pertencente ao Puzzle como dependência estrutural da galeria.

Proibido:

- moldura pesada em todas as fotos;
- neve contínua sobre rostos;
- loops de partículas durante rolagem longa;
- Canvas/WebGL apenas para ambientação natalina;
- decoração que muda o crop da fotografia.

Microinterações de estrela/brilho devem preferir SVG/CSS de curta duração, respeitar `prefers-reduced-motion` e desaparecer no quality tier LOW.

## 9. Estado e isolamento multi-galerias

Chaveie estado cliente por:

```text
photoSessionId + activeRevisionId
```

Scroll, selectedPhotoId e lightboxIndex só podem ser restaurados se sessão e revisão ainda corresponderem.

Cenários obrigatórios:

```text
A  = pedido 1 / galleryKey natal-principal
A2 = pedido 1 / galleryKey familia-extra
B  = pedido 2 / galleryKey natal-principal
```

Provar:

- token A não acessa A2;
- token A não acessa B;
- navegar A → B limpa seleção/scroll de A na UI ativa;
- Back para A pode restaurar A a partir de estado escopado;
- duas abas A/B não sobrescrevem grant/contexto;
- revisão nova de A não altera A2 ou B.

## 10. EvydFlow

O provider deve resolver a sessão com chave composta de negócio:

```text
resolve_or_create_session(
  crmOrderUuid,
  galleryKey,
  ...
)
```

Depois:

```text
begin_revision
upload_derivative
verify_revision
activate_revision
get_revision_status
```

O manifesto congelado inclui `galleryKey` e `photoSessionId`. Replays idempotentes nunca criam uma nova galeria para a mesma chave de negócio.

## 11. Jogos

`game=1600` continua adequado como variante hero/puzzle enquanto medições de aparelho não indicarem o contrário.

O principal risco é quantidade de texturas grandes simultâneas, não o tamanho isolado.

Política recomendada:

- Puzzle/Magic/Globo/Lanterna/hero: game;
- Memory/Tic-tac-toe/secundárias: card;
- picker: thumb;
- Expresso/Mosaico/Rudolph: promoção por papel já é a referência;
- Guirlanda deve evoluir de várias `game` para uma hero `game` + secundárias `card`, promovidas somente quando necessário.

A ação `Jogar com esta foto` apenas define `selectedPhotoId` no estado da sessão e navega pelo roteador existente. A biblioteca de galeria não importa Phaser nem cria um segundo bridge para jogos.

## 12. Ordem de execução

1. Ajustar contrato `photoSessionId + galleryKey` e constraints multi-galerias.
2. Evoluir DTO de variantes com dimensões reais.
3. Criar `GalleryPhotoAdapter` e `LightboxSlideAdapter` puros.
4. Rodar benchmark 800 × 1200 × 1600.
5. Decidir se `gallery=1200` entra na receita.
6. Implementar SessionProvider real e isolamento A/A2/B.
7. Implementar GalleryRoute de uma coluna no mobile com batch próprio.
8. Integrar React Photo Album.
9. Integrar YARL + Zoom em lazy chunk.
10. Criar/registrar assets `christmas-shell/gallery`.
11. Provar Gallery → Puzzle → Gallery.
12. Otimizar Guirlanda.
13. Android/iPhone + rede móvel + restore/rollback.
14. Só então executar spike PhotoSwipe ou virtualização se uma medição exigir.

## 13. Critério de aceite

A Galeria Natalina só está pronta para piloto quando:

- sessão real substitui fixture;
- A/A2/B estão isoladas;
- mobile usa uma coluna sem crop;
- requests iniciais são limitados;
- feed não baixa `game` antecipadamente;
- viewer não faz parte do bundle inicial da galeria;
- assets natalinos têm manifesto/proveniência;
- zero Phaser/canvas em `/fotos`;
- retorno de jogo preserva foto e scroll;
- 20 ciclos de abrir/fechar viewer não deixam crescimento persistente de DOM/listeners;
- Android físico e Safari/iPhone foram exercitados.
