# A Magia da Minha Foto de Natal

Pedido autorizado em 2026-09-07: implementar o documento master do proprietário.

## Auditoria e decisão

- Stack mantida: Phaser 4.2.1 instalado, React 19.2.8, Vite 8.2.2, TypeScript,
  pnpm workspace. Novo owner: `packages/games/magic-photo`.
- App compõe jogos por definition estática e import dinâmico; PhaserHost cria uma
  instância por rodada e destrói antes do replay. GameRun/bridge tipados controlam
  lifecycle, analytics agregados e preferência de som.
- Sessão atual vem de fixtures ou endpoint privado local de teste. Photo fornece
  dimensões, orientação e derivadas thumb/card/game. Usar apenas game; não criar
  nova API nem expor originais. Catalog-server já autoriza prévias sociais;
  autenticação/persistência completa de sessões no VPS continua no plano da plataforma.
- PhotoSurface calcula contain; Scale.RESIZE e shell cuidam de tamanho/safe-area.
- Theme fornece controles cristalinos. Haptics injetados são opcionais. Áudio terá
  instâncias próprias com unlock, cooldown, prioridades, mudo e pausa.
- Decisão: fantasia e sequência integral do documento, sem competição. Três toques,
  laço tolerante (com alternativa toque–toque), cinco descobertas, gelo a 68%, hero
  de três segundos e brinquedo livre. Fotos ficam sem filtros e nunca são recortadas.
- Assets específicos ausentes: fallback procedural deliberado, separado em camadas;
  sons locais já catalogados reutilizados em um inventário próprio, sem import entre
  jogos. Manifesto humano identifica cada substituição e arte/voz final pendente.
- Riscos: scratch Phaser 4 exige render explícito; resize não pode apagar a camada;
  cancelamento de pointer, pause/visibility e replay precisam preservar idempotência.

## Revisão visual autorizada — presente e inverno

Pedido do proprietário: substituir a aparência plana do presente, tornar o gelo
muito mais denso e realista e criar ambiente frio com neve acumulada, pingentes
de gelo e resposta ao toque. A direção passa a noite azul glacial com luz quente
no presente rubi e laço de cetim. Assets raster gerados pertencem ao projeto,
com prompt, hash e receita de WebP no inventário. Capa e partida usam o mesmo
presente. O gelo deve cobrir de fato a fotografia durante a raspagem; a foto
original permanece intacta por baixo e completamente limpa na revelação final.
Neve em planos, névoa periférica e neve que cai ao tocar a borda têm limites,
pausa e alternativa reduzida. As regras e os gestos existentes são preservados.

## Etapas

Revisão adicional autorizada: instrução em vidro escuro, texto claro com peso
maior e entrada curta; estrelas em painel próprio, grandes e com feedback finito.
Tocar uma estrela vazia aponta uma descoberta pendente sem a resolver. Tocar
uma preenchida celebra a conquista. Header e rodapé ganham reserva de espaço
para não sobrepor a foto, inclusive em paisagem e em movimento reduzido.

1. Foto, coordenadas normalizadas e testes de geometria.
2. Domínio determinístico, todos os estados, hotspots e grade lógica de gelo.
3. Runtime modular: presente/laço, foto, FX, áudio, hints, gelo, final.
4. Registro lazy, capa e ações finais acessíveis sem cobrir a foto.
5. check:fast, revisão visual mobile, regressões, dez replays e validate.

## Fontes Phaser

Fonte v4.2.1 e tipos instalados conferidos. Skills locais: game-setup-and-config,
render-textures, particles, input-keyboard-mouse-touch. Exemplo oficial local:
`game objects/render texture/erase part of render texture.js`.
RenderTexture mantém sua resolução lógica ao resize, chama `render()` após erase.

## Conclusão da implementação local — 2026-09-09

Etapas 1 a 5 concluídas. Jogo registrado, arte realista, áudio com preferências,
gelo raspável, instruções com contraste e estrelas interativas implementados.
Fotos retrato/paisagem preservadas; 390/412/430/768 px, 320 px e rotação revistos.

Check:fast com 308 testes, arquitetura, dependências, formatação, mapa, build
e auditoria de assets aprovados. Na matriz e reexecução dirigida, 22 cenários
aplicáveis aprovados, incluindo dez replays LOW. Timeouts da máquina e HMR
concorrente foram diagnosticados; resultados por passagem preservados no
[relatório de HUD](../../quality/MAGIC_PHOTO_HUD_2026-09-08.md).

Limites de homologação permanecem explícitos: Safari/telefone físico, escuta
real, haptic e teste com criança ainda não medidos. Foleys dedicados e voz de
Papai Noel continuam como aprimoramentos de áudio catalogados, com os fallbacks
atuais. Implantação produtiva de sessão/analytics pertence ao plano do VPS.
