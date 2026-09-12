# Memórias de Natal — proveniência de assets

## Pacote visual compartilhado v1

Os dois arquivos abaixo foram criados para este produto e já passaram pela
revisão de segurança fotográfica e legibilidade mobile no pacote visual do
Puzzle Swap. Em 2026-08-28, foram copiados para o diretório público próprio do
Memórias, preservando bytes e hashes, para que cada jogo possa ser auditado e
publicado sem depender do diretório de outro jogo.

Nenhum arquivo contém fotografia de cliente, sessão, nome, identificador ou
metadado pessoal.

| Papel                  | Arquivo browser                         | Origem                         | Uso no Memórias                                                         |
| ---------------------- | --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| Cenário de vila nevada | `backgrounds/vila-nevada-noite-v1.webp` | ilustração original do projeto | L0, sob véu verde-azulado e atrás do tabuleiro.                         |
| Floco leve             | `ui/floco-neve.svg`                     | SVG original do projeto        | L1, no máximo 18 partículas vivas; omitido em LOW e movimento reduzido. |

O manifesto em `assets/manifest.json` é a fonte de verdade de hashes, bytes,
qualidade e chaves de textura. O pacote sonoro abaixo foi aprovado e registrado
em 2026-08-28; qualquer novo áudio, ícone de controle, moldura ou efeito de
acerto só entra depois de sua própria aprovação e registro.

## Áudio legado autorizado para Memory

Em 2026-08-28, os seis papéis abaixo foram copiados do pacote local do Puzzle
Swap para o diretório público próprio do Memórias. A autorização do
proprietário cobre seu uso no catálogo de jogos de Natal; os arquivos não têm
fala, identificação de cliente, fotografia ou metadado de sessão. Cada papel
é entregue em M4A e MP3, com hashes, duração e orçamento conferidos pelo
manifesto.

| Papel no Memórias | Arquivos browser      | Uso e limite inicial                         |
| ----------------- | --------------------- | -------------------------------------------- |
| Toque / virada    | `audio/tap.*`         | botões e flip; 60 ms de intervalo por papel. |
| Dica              | `audio/hint.*`        | início da dica; uma fonte por vez.           |
| Acerto            | `audio/correct.*`     | par encontrado; uma fonte por vez.           |
| Retorno gentil    | `audio/wrong.*`       | par diferente; uma fonte por vez.            |
| Vitória           | `audio/celebrate.*`   | álbum completo; uma fonte por vez.           |
| Música de inverno | `audio/winter-loop.*` | só após o primeiro gesto; omitida em LOW.    |

O runtime mantém essas fontes sob `MemoryAudioDirector`: mudo, pausa, retorno
à aba e saída interrompem a música e nunca deixam uma fonte persistir para a
próxima partida. As pequenas variações de velocidade são determinísticas e
reaproveitam o mesmo arquivo aprovado; no acerto e na vitória o diretor reduz
temporariamente a música, sem criar outra fonte nem alterar o manifesto.
