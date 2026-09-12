# Rudolph — proveniência e preparação dos assets

## rudolph-rig-v1

Criado em 2026-09-08 com a ferramenta integrada `image_gen`, modelo e seed não
expostos. Fonte em `assets-src/rena-das-lembrancas/rig-model-v1.png`; prompt
integral em `rig-model-v1.prompt.txt` no mesmo diretório. Uma folha única gera
torso, cabeça, pata anterior e posterior do mesmo modelo de pelúcia natalina.
Alpha dos cantos foi conferido como zero; silhuetas, material, proporção e
ausência de fotos/textos de clientes foram inspecionados na fonte. Preparação
reproduzível em `tools/asset-factory/scripts/prepare-rudolph-art.mjs` recorta as
células, remove margem transparente e produz WebP. Hashes e dimensões no manifesto.

O runtime articula as peças em pivôs coerentes, sem gerar frames independentes.
Material castanho/creme, cachecol framboesa, olhos gentis e nariz rubi. A fonte
não contém foto, token ou referência a criança real. Nenhuma arte do donor foi
copiada. A revisão da animação a tamanho de celular, em navegador, é registrada
no relatório de qualidade; a prova em aparelho físico permanece pendente.

## reutilizacao-autorizada

Molduras madeira/latão e os três pares de áudio toque/encaixe/vitória foram
copiados byte a byte do catálogo próprio de Guirlanda das Lembranças em
2026-09-07. As origens, receitas e hashes originais permanecem nos registros
do manifesto. Fonte humana: `../guirlanda-das-lembrancas/ASSET_PROVENANCE.md`,
seções molduras-madeira-latao-v1 e audio-autorizado. Esta cópia tem diretório
público, chaves e manifesto próprios; não existe import entre jogos.

Os aros pendentes foram substituídos pela borda própria `frame-material-v3`.
As duas cópias antigas estão em `assets-src/rena-das-lembrancas/frames-legacy-v1/`,
fora do diretório público e do manifesto de runtime.
Nenhuma foto da sessão foi incorporada aos assets. Toque, resgate e assinatura
final conservam as fontes autorizadas; neve, sinos, papel e magia têm fontes próprias.

## frame-material-v3

Material de madeira, latão e papel criado com `image_gen` integrado em
2026-09-08; modelo e seed não expostos. Fonte e prompt integral em
`assets-src/rena-das-lembrancas/frame-material-v3.png` e `.prompt.txt`.
Preparação reproduzível pelo script da arte: 640 × 640 WebP, 32.926 bytes.
O material é opaco; a fotografia é uma imagem separada acima do centro, inteira
e proporcional. NineSlice preserva os cantos e ajusta somente as faixas da borda.
Canvas sem WebGL recebe borda geométrica. Nenhuma foto foi enviada ao gerador.

As tentativas `frame-portrait-v2` e `frame-landscape-v2` foram rejeitadas por
franjas coloridas; uma edição também apresentou quadriculado pintado no fundo.
Não foram publicadas. As fontes v2 permanecem somente como histórico local.

## winter-world-and-santa-v1

Fundos retrato/paisagem e Papai Noel no trenó foram criados com `image_gen`
integrado em 2026-09-08. Modelo e seed não expostos. Fontes PNG e prompts
integrais em `assets-src/rena-das-lembrancas/`, nomes `winter-world-v1`,
`winter-landscape-v1` e `santa-sleigh-v1`. O fundo deixa o centro livre e a vila
nos limites; o trenó transparente mantém lã, madeira e latão da família do rig.
Preparação offline no mesmo script da arte; dimensões e hashes no manifesto.
Nenhuma foto de cliente ou asset do donor foi enviado à ferramenta.

## original-audio-v1

Partitura e síntese próprias em `tools/asset-factory/scripts/prepare-rudolph-audio.mjs`.
WAVs reprodutíveis em `assets-src/rena-das-lembrancas/audio/`. Loop de 16 s,
celesta harmônica com caudas circulares; cues de sinos/magia por notas e
neve/papel por ruído filtrado com seed fixa. Fontes PCM conferidas sem clipping
(picos entre −24 e −13 dBFS), codificadas em M4A/MP3 mono 64 kbps. Sem gravação
ou melodia de terceiros. Mix e política descritos em `AUDIO_SCORE.md`.

Budget candidato: 1 MB público, 700 kB por execução estática, 420 kB visual.
Os limites não incluem fotos nem medem GPU. Escuta e desempenho em aparelhos
físicos permanecem gates abertos; proveniência não equivale a essa homologação.
