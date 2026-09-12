# Guirlanda das Lembranças — experiência natalina

## Decisão de direção

### Revisão V2 autorizada

A passagem integrada troca os grandes ícones de estrela por um pequeno gancho
de latão com argola física (estado vazio, realce âmbar e suporte preenchido
resolvidos no mesmo objeto). A área interativa permanece de 72 CSS px. As
fotos penduradas reutilizam a família material de molduras da foto central.
O progresso sai da barra do topo e aparece em lâmpadas na guirlanda. A caixa
entrega cada lembrança por uma chegada curta e cancelável; o painel final
aguarda a sequência de celebração. Novo asset de gancho: objeto isolado com
alpha, sem pessoa/foto/texto, preparado e manifestado antes do runtime.

É uma construção natalina calma. A fotografia é a heroína; guirlanda, madeira, luz e som ajudam a criança a pendurá-la e nunca cobrem a lembrança. Em 390 px, a ordem de leitura é foto central → gancho livre → luzes da guirlanda → cabana noturna.

## Planos da cena

| Plano | Papel                                                                                            | Regra                                           |
| ----- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| L0/L1 | Cabana de nogueira, janelas nevadas e lanterna âmbar.                                            | Centro escuro e calmo; sem pessoa, foto ou UI.  |
| L2    | Guirlanda, foto central, seis ganchos, 24 pequenas lâmpadas de progresso e instrução contextual. | Maior contraste e todos os alvos de toque.      |
| L3    | Caixa de lembranças abaixo do palco.                                                             | Sugere origem da moldura, mas não parece botão. |

A guirlanda é 2.5D: textura material, máscara circular e poço interno escuro. Ganchos e molduras usam recortes raster materiais; geometria, halos e trilha periférica são compostos pelo runtime para adaptar a tela e proteger a foto real. NORMAL admite seis pequenos flocos atrás dos objetos e uma luz suave na caixa; LOW e movimento reduzido não criam esses loops.

## Roteiro de resposta

| Momento     | Visual                                                                                      | Som/haptic                         | LOW e movimento reduzido                      |
| ----------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------- |
| Tocar foto  | Moldura eleva 5 px e ganha borda âmbar.                                                     | Clique macio; impacto leve.        | Borda estática e clique opcional.             |
| Arrastar    | Moldura acompanha diretamente o dedo; sombra sobe.                                          | Sem ruído contínuo.                | Mesmo gesto, sem efeitos extras.              |
| Encaixar    | Moldura chega ao gancho, uma luz percorre curva externa e seis faíscas surgem fora da foto. | Sino curto; impacto médio.         | Estado final, brilho estático e som opcional. |
| Soltar fora | Moldura retorna devagar ao centro.                                                          | Clique grave e discreto.           | Retorno direto.                               |
| Dica        | Uma frase curta e o próximo gancho ganha halo.                                              | Sem som obrigatório.               | Halo de contraste sem pulso.                  |
| Vitória     | A âncora retorna grande; texto aparece depois.                                              | Assinatura festiva; impacto forte. | Foto, texto e guirlanda parada; sem faíscas.  |

## Assets e som

- `cabana-nevada-noturna-v1.webp`: cenário L0/L1.
- `guirlanda-pinho-v3.webp`: aro material de pinho e veludo, com poço interno de composição no runtime; fotos, slots e controles não fazem parte da imagem.
- `moldura-retrato-madeira-latao-v1.webp` e `moldura-paisagem-madeira-latao-v1.webp`: aros hero transparentes de nogueira, latão e veludo. O runtime escolhe um pelo metadado de orientação e insere a derivada proporcional em sua abertura.
- `caixa-de-lembrancas-nogueira-v1.webp`: caixa aberta de nogueira, veludo e latão, isolada por alpha. Ela ocupa o plano inferior como origem cenográfica, sem conter nem alterar fotografia.
- `toque`, `encaixe`, `vitoria`: M4A/MP3 locais; som só desbloqueia depois de um gesto e pode ser desligado a qualquer momento.

Todos os arquivos estão em `assets/manifest.json` e `ASSET_PROVENANCE.md`. Não há música ambiente nesta primeira versão: uma faixa genérica não entra antes de existir material com direção e licença próprias.
