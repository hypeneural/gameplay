# A Magia da Minha Foto de Natal

Experiência fotográfica infantil autorizada pelo proprietário em 2026-09-07.
Uma única foto escolhida na sessão é objeto, cenário e recompensa. Primeira
conclusão alvo de 45–70 s, sem limite, derrota, pontuação ou punição.

## Contrato jogável

Presente em camadas recebe três toques crescentes; o terceiro libera o laço.
Puxar menos de 30% devolve; soltar a partir de 45% abre; chegar a 70% magnetiza.
Alternativa: tocar laço e depois a indicação acima. Cancelar nunca abre.
Abertura de 1150 ms, foto aparece em 850 ms e permanece limpa mais 1050 ms.
Cinco hotspots invisíveis, normalizados e distribuídos nas bordas respondem
uma única vez a toque ou passagem. Dicas em 1.5/3/5/8/11 s orientam sem resolver.
O quinto inicia frost. Dedo apaga gelo com pincel circular suave e interpolado;
grade lógica registra cobertura sem ler pixels. Rachaduras a 25/45%, quebra a 68%.
Final periférico, foto hero limpa por 3 s, depois brinquedo livre e ações de replay
e catálogo fora da fotografia. Replay cria rodada nova sem recarregar a página.

## Foto e apresentação

Derivada game carregada antes da primeira ação. PhotoLayoutManager reutiliza
PhotoSurface contain: não estica, recorta, colore ou usa foto como fundo. O espaço
livre recebe floresta nevada azul, pinheiros com neve e luzes âmbar. O gelo
temporário é denso, com cristais realistas, e sai sob o dedo. A imagem original
fica intacta por baixo; a revelação final remove todas as camadas de gelo.
Metadata opcional focalPoint/faceSafeZone/subjectBounds pode proteger retratados;
sem metadata, efeitos grandes ficam nos quadrantes externos. A geometria real da
imagem carregada prevalece se a sessão trouxer dimensões desatualizadas.
Ocupação alvo 65–85% da área útil quando a combinação foto/tela permite contain;
foto horizontal numa tela estreita pode ocupar menos, sem cortar pessoas.

## Engenharia

Domínio determinístico e event bus tipado. State machine é única dona do avanço,
enter/update/exit explícitos e ações idempotentes. Runtime separado em presente,
PhotoLayout, IceController, FXManager, áudio, hint e cena de composição.
Phaser 4.2.1 com RenderTexture/render explícito. Textura lógica não muda ao resize.
LOW/NORMAL/HIGH e movimento reduzido conservam input, gelo e foto; limitam VFX.
Pausa manual/visibilidade independentes; ponte recebe apenas eventos tipados.
Sem áudio antes do gesto, cooldown por categoria, instâncias limitadas, ducking,
mudo persistido no shell e descarte de recursos na saída.

## Validação

Domínio: transições, anti-frustração, duplicação, varredura rápida, grade, proporções.
Runtime: toque/arraste, cancelamento, foto retrato/paisagem, hints, pause/resize,
freeze/erase real, hero, free play, dez replays, falha de foto, um canvas e cleanup.
Mobile: 390/412/430/768 CSS px, pequeno 320 e landscape; LOW e movimento reduzido.
Capturas de fotos reais privadas; nenhuma imagem de cliente no Git ou em serviços.
Arte/sons de fallback explicitados em ASSET_MANIFEST.md; aprovação em telefone real
e teste emocional sem instrução com criança são gates humanos de lançamento.
