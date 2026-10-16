# Audio do shell natalino

Pedido do proprietário de 2026-09-07: usar os packs locais fornecidos para o Hub e suas capas.

Kenney Interface Sounds e Casino Audio, CC0-1.0, identificados pelo catálogo local e conferidos nas páginas oficiais em 2026-09-07. O diretório Audio2 contém também variantes legadas de nomes de cartas. Não atribuímos os arquivos ao projeto.

Fontes: [Interface Sounds](https://kenney.nl/assets/interface-sounds), [Casino Audio](https://kenney.nl/assets/casino-audio), [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Processamento offline: FFmpeg, mono 44.1 kHz, MP3/AAC 80 kbit/s, metadados removidos, bordas suaves. Os sons musicais combinam o vidro CC0 em alturas e tempos diferentes. Sem música ou fala. Originais intactos.

Reproduzir com: `node tools/asset-factory/scripts/prepare-shell-audio.mjs <diretorio-Sonoros>`. Nunca executar no navegador.

Christmas SFX Pack e 400 Sounds Pack: catálogo local sem licença documentada; nenhum arquivo integrado. Shapeforms: licença própria com proteção contra extração; nenhum arquivo integrado nesta entrega de áudio estático.

A adequação técnica foi inspecionada por duração, pico, formatos e resposta ao gesto. A aprovação auditiva em alto-falante de telefone continua necessária; não se declara escuta humana onde ela não ocorreu.

## tap

Fonte: Audio/click_001.ogg. SHA-256 original: `ccfb7fa0cccdd9faec0eb16033c732b1e308d139d80f799161495d58f7adcdb9`.
Duração de desenho: 0.18 s. Volume no runtime: 0.26.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.18,atrim=end_sample=7938,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.06:d=0.12[out]`. Pico medido antes do ajuste: -14.7 dBFS; alvo de preparação: -6 dBFS.

## toggle

Fonte: Audio/switch_002.ogg. SHA-256 original: `6fc395be2ad1f99ce318a5d28f98fb76dbeb676d83a0b28239d8c1fb90736180`.
Duração de desenho: 0.24 s. Volume no runtime: 0.25.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.24,atrim=end_sample=10584,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.12:d=0.12[out]`. Pico medido antes do ajuste: 0 dBFS; alvo de preparação: -6 dBFS.

## magic

Fonte: Audio/glass_002.ogg. SHA-256 original: `08e972c73e53c91d6d310e107e80db60edce78ae47225889a028e628a6f3da49`.
Duração de desenho: 0.65 s. Volume no runtime: 0.2.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,asplit=2[n0][n1];[n0]asetrate=55125,aresample=44100,adelay=0,volume=0.8[p0];[n1]asetrate=66150,aresample=44100,adelay=130,volume=0.7000000000000001[p1];[p0][p1]amix=inputs=2:normalize=0,aecho=0.8:0.7:45|95:0.18|0.10,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.65,atrim=end_sample=28665,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.53:d=0.12[out]`. Pico medido antes do ajuste: -9.8 dBFS; alvo de preparação: -6 dBFS.

## paper-a

Fonte: Audio2/card-slide-1.ogg. SHA-256 original: `006cf9822d15d7063f8899e56041f41646df30adb6fbd8b974ee5d5420012690`.
Duração de desenho: 0.48 s. Volume no runtime: 0.28.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.48,atrim=end_sample=21168,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.36:d=0.12[out]`. Pico medido antes do ajuste: 0 dBFS; alvo de preparação: -6 dBFS.

## paper-b

Fonte: Audio2/card-slide-2.ogg. SHA-256 original: `e674a1679ec87b507047fe012d068ad2c412125f56186f0e732684705c2a6888`.
Duração de desenho: 0.48 s. Volume no runtime: 0.28.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.48,atrim=end_sample=21168,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.36:d=0.12[out]`. Pico medido antes do ajuste: -4 dBFS; alvo de preparação: -6 dBFS.

## open

Fonte: Audio2/cards-pack-take-out-2.ogg. SHA-256 original: `d991829eeaf7e5a6f8462594e5be0d91535309ffd6249278f34eec70470395a4`.
Duração de desenho: 0.64 s. Volume no runtime: 0.26.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.64,atrim=end_sample=28224,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.52:d=0.12[out]`. Pico medido antes do ajuste: -3 dBFS; alvo de preparação: -6 dBFS.

## back

Fonte: Audio/close_001.ogg. SHA-256 original: `44af8249b933e0fd35ec957a638bb1a0b01f85b53fbe9674bf77bd3ca3168ef4`.
Duração de desenho: 0.22 s. Volume no runtime: 0.26.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.22,atrim=end_sample=9702,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.1:d=0.12[out]`. Pico medido antes do ajuste: -12.1 dBFS; alvo de preparação: -6 dBFS.

## reveal

Fonte: Audio/glass_001.ogg. SHA-256 original: `183eebee20eb0a532b0b85104d139cbf2673eb66d95c3cc733ac9ea98362e7e8`.
Duração de desenho: 0.95 s. Volume no runtime: 0.22.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,asplit=3[n0][n1][n2];[n0]asetrate=44100,aresample=44100,adelay=0,volume=0.8[p0];[n1]asetrate=55125,aresample=44100,adelay=130,volume=0.7000000000000001[p1];[n2]asetrate=66150,aresample=44100,adelay=260,volume=0.6000000000000001[p2];[p0][p1][p2]amix=inputs=3:normalize=0,aecho=0.8:0.7:45|95:0.18|0.10,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.95,atrim=end_sample=41895,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.83:d=0.12[out]`. Pico medido antes do ajuste: -10.4 dBFS; alvo de preparação: -6 dBFS.

## bells-a

Fonte: Audio/glass_001.ogg. SHA-256 original: `183eebee20eb0a532b0b85104d139cbf2673eb66d95c3cc733ac9ea98362e7e8`.
Duração de desenho: 1.1 s. Volume no runtime: 0.24.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,atrim=end_sample=2205,afade=t=out:st=0.015:d=0.035,volume=0.25[impact];aevalsrc=exprs='(0.5*sin(2*PI*920*t)*exp(-t*3)+0.25*sin(2*PI*1849.1999999999998*t)*exp(-t*4.2)+0.16666666666666666*sin(2*PI*2502.4*t)*exp(-t*5.4)+0.125*sin(2*PI*3643.2*t)*exp(-t*6.6)+0.1*sin(2*PI*4968*t)*exp(-t*7.8))*min(1,t/0.003)':s=44100:d=1.1[bell];[impact][bell]amix=inputs=2:normalize=0,highpass=f=90,lowpass=f=7000,apad=pad_dur=1.1,atrim=end_sample=48510,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.9800000000000001:d=0.12[out]`. Pico medido antes do ajuste: -0.4 dBFS; alvo de preparação: -6 dBFS.

## bells-b

Fonte: Audio/glass_001.ogg. SHA-256 original: `183eebee20eb0a532b0b85104d139cbf2673eb66d95c3cc733ac9ea98362e7e8`.
Duração de desenho: 1.1 s. Volume no runtime: 0.24.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,atrim=end_sample=2205,afade=t=out:st=0.015:d=0.035,volume=0.25[impact];aevalsrc=exprs='(0.5*sin(2*PI*980*t)*exp(-t*3)+0.25*sin(2*PI*1969.7999999999997*t)*exp(-t*4.2)+0.16666666666666666*sin(2*PI*2665.6000000000004*t)*exp(-t*5.4)+0.125*sin(2*PI*3880.8*t)*exp(-t*6.6)+0.1*sin(2*PI*5292*t)*exp(-t*7.8))*min(1,t/0.003)':s=44100:d=1.1[bell];[impact][bell]amix=inputs=2:normalize=0,highpass=f=90,lowpass=f=7000,apad=pad_dur=1.1,atrim=end_sample=48510,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.9800000000000001:d=0.12[out]`. Pico medido antes do ajuste: 0 dBFS; alvo de preparação: -6 dBFS.

## snow

Fonte: Audio/glass_001.ogg. SHA-256 original: `183eebee20eb0a532b0b85104d139cbf2673eb66d95c3cc733ac9ea98362e7e8`.
Duração de desenho: 1.2 s. Volume no runtime: 0.2.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,asplit=4[n0][n1][n2][n3];[n0]asetrate=66150,aresample=44100,adelay=0,volume=0.8[p0];[n1]asetrate=55125,aresample=44100,adelay=130,volume=0.7000000000000001[p1];[n2]asetrate=44100,aresample=44100,adelay=260,volume=0.6000000000000001[p2];[n3]asetrate=37044,aresample=44100,adelay=390,volume=0.5[p3];[p0][p1][p2][p3]amix=inputs=4:normalize=0,aecho=0.8:0.7:45|95:0.18|0.10,highpass=f=90,lowpass=f=7000,apad=pad_dur=1.2,atrim=end_sample=52920,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=1.08:d=0.12[out]`. Pico medido antes do ajuste: -9.8 dBFS; alvo de preparação: -6 dBFS.

## start

Fonte: Audio/confirmation_004.ogg. SHA-256 original: `568967a3d9f8a8f6af54ea01729c4882284308f2a27d78c07ffd7ee0d6951661`.
Duração de desenho: 0.56 s. Volume no runtime: 0.24.
Filtro reproduzível: `[0:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-55dB,highpass=f=90,lowpass=f=7000,apad=pad_dur=0.56,atrim=end_sample=24696,asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st=0.44000000000000006:d=0.12[out]`. Pico medido antes do ajuste: -0.9 dBFS; alvo de preparação: -6 dBFS.

## gallery-native-v2

Os SVGs da galeria (evergreen-header, starlight-footer e snowflake-seal) sao criacoes originais do projeto, em 2026-10-08, sem imagem de cliente ou componente de terceiros. Origem: `project-created`, licenca `project-owned`. Referencia de design e limites de uso em `GALLERY_PROVENANCE.md`. Os SVGs estaticos ficam fora da fotografia e nao exigem animacao. Validacao visual em aparelhos fisicos permanece pendente.

## gallery-photoreal-v4

Asset: `gallery-evergreen-hero-photoreal-v4.webp` (Google Antigravity AI generation). Substituído na Missão V6 pela variante de alta definição Retina `gallery-evergreen-hero-retina-v6.webp`.

## gallery-retina-v6

Asset: `gallery-evergreen-hero-retina-v6.webp` (Google Antigravity AI generation, guirlanda fotorrealista Retina de alta resolução a partir de master de 1376x768 — ramos naturais densos de abeto e espruce verde-floresta, agulhas nítidas, pinhas texturizadas, bolas de vidro rubi com reflexos luminosos, laço central de veludo bordô e micro-luzes douradas com degradê alfa suave na base). Processado no projeto via Sharp WebP com canal alfa, em 2026-10-08. Arquivo final 640x126, 13672 bytes; SHA-256 `620f1197cc8c46ef4025b44e03d59833014881a65bdb9572f8ccbb3d75bb6cfa`. Origem `project-created`, licença `project-owned`; não contém fotos de clientes, mockups, rostos ou textos. Substituiu os assets legados não utilizados `gallery-evergreen-header-v1.svg` (9095 B) e `gallery-snowflake-seal-v1.svg` (1176 B), liberando 10271 B de orçamento e mantendo o shell rigorosamente em 34389 B (dentro do teto máximo de 36000 B). Detalhes e proveniência estendida em `GALLERY_PROVENANCE.md#gallery-retina-v6`. Validação visual em telas físicas mobile pendente.
