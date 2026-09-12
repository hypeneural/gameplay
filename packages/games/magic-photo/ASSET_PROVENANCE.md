# Proveniência — Magic Photo

Preparação local em 2026-09-07 para o pedido do proprietário. Nenhuma foto de
cliente foi enviada a provedor de arte, áudio ou análise. Testes usam apenas
derivadas locais e capturas privadas. Fotos não são assets versionados.

## Inverno realista v2

Quatro imagens originais geradas com a ferramenta integrada OpenAI `image_gen`,
por pedido explícito do proprietário em 2026-09-07. Modelo e seed não são expostos
pela ferramenta. Nenhuma foto de cliente foi usada como entrada. Prompts completos
em `ART_PROMPTS_V2.md`. Fontes PNG preservadas localmente em diretório privado;
WebP finais versionados em `apps/play/public/assets/magic-photo/art/`.

- `gift-real-v2`: presente rubi com papel em relevo, laço acetinado e neve, alpha real.
- `frost-real-v2`: cristais naturais de vidro congelado, camada apagável sobre a foto.
- `snow-edge-v2`: neve acumulada com pingentes de gelo, alpha real.
- `winter-night-v2`: pinheiros nevados, luar azul e cabanas distantes.

Receita: `prepare-magic-photo-art.mjs`, Sharp local, resize proporcional, WebP com
alphaQuality 100; dimensões, opções, hashes de origem/saída e bytes no manifesto.
As revisões de material, alinhamento, proporção e segurança da foto ficam em
`docs/quality/MAGIC_PHOTO_WINTER_V2_2026-09-07.md`. O estado do inventário registra
integração/revisão local; homologação em telefone físico permanece separada.

## Arte procedural

`ProceduralArt.ts` mantém somente pincéis, glow, sombra suave, névoa, estrela,
partículas, fragmento, mão e gorro. Caixa e gelo planos foram substituídos pelos
assets raster v2. Frame/controles reutilizam o padrão cristalino do projeto.

## tap

Cópia byte a byte de `christmas-shell/audio/tap-v1`, MP3/M4A, Kenney Interface
Sounds, item `Audio/click_001.ogg`. Revisão e licença CC0 preservadas no manifesto.
Origem já catalogada no shell; toque curto de caixa e controles.

## paper

Cópia byte a byte de `christmas-shell/audio/paper-a-v1`, MP3/M4A, fonte CC0
catalogada no shell. Tecido/laço e raspagem usam mixes baixos desta fonte.
Raspagem é uma substituição funcional explícita, não gravação de gelo.

## open

Cópia byte a byte de `christmas-shell/audio/open-v1`, MP3/M4A. Fonte, item e
URLs de licença originais preservados. Abertura da caixa e estalos do gelo usam
velocidade/volume distintos; substituir por foley dedicado antes de homologar mix.

## magic

Cópia byte a byte de `christmas-shell/audio/magic-v1`, MP3/M4A. Fonte CC0
catalogada no shell. Confirmação de estrela e trilha com cooldown e baixa densidade.

## bells

Cópia byte a byte de `christmas-shell/audio/bells-a-v1`, MP3/M4A. Fonte CC0
catalogada no shell. Terceiro toque, pisca e gorro. O sino grave no gorro substitui
explicitamente `santa_hoho`; nenhuma voz humana é anunciada como gravada.

## snow

Cópia byte a byte de `christmas-shell/audio/snow-v1`, MP3/M4A. Fonte CC0
catalogada no shell. Neve e chegada do frost, com volume moderado.

## reveal

Cópia byte a byte de `christmas-shell/audio/reveal-v1`, MP3/M4A. Fonte CC0
catalogada no shell. Revelação da foto, quinta descoberta e assinatura final.

## music

Cópia byte a byte de `memory/audio/winter-loop`, MP3/M4A. Origem
`owner-authorized-legacy-bundle`, autorização legada do produto já registrada em
`packages/games/memory/ASSET_PROVENANCE.md#audio-legacy-autorizado-para-memory`.
Loop de 44.307 s; omitido em LOW, após gesto e a volume baixo, com ducking em
gorros/quebra/finale. O jogo não importa código de Memory.

## Reprodução e limites

`node tools/asset-factory/scripts/prepare-magic-photo-audio.mjs` copia somente
fontes presentes nos manifestos aprovados, recalcula bytes/hash e grava inventário
próprio. Não baixa nem converte arquivos. Cada origem preserva identificador,
licença, URLs e revisão. Fontes do shell estão em
`apps/play/assets/christmas-shell/ASSET_PROVENANCE.md`.
Áudio final exige escuta no aparelho; verificações automatizadas provam política
de reprodução e lifecycle, não timbre/mixagem em alto-falante.
