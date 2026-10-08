# Auditoria Node-first — Gallery Lab antes do EvydFlow/Python

**Data:** 06/10/2026  
**Escopo:** processamento de fotos, Galeria Natalina, Hub, jogos e caminho de publicação sem depender do workflow Python durante a homologação inicial.

## Resumo executivo

O workflow Python/EvydFlow **não precisa estar no caminho crítico das primeiras validações da experiência**.

O monorepo já possuía as peças essenciais para um laboratório local com fotos reais:

- `tools/media-pipeline` com Node + Sharp;
- `apps/play` com Hub, Galeria e jogos;
- middleware Vite de mídia local privada;
- `PhotoPrint` preparado para `variantMetrics` reais;
- rotas `/s/:token`, `/s/:token/fotos` e `/s/:token/game/:id`.

O problema era de integração e contrato: o operador/Antigravity precisava executar várias etapas manualmente, os ids locais eram posicionais, os derivados eram endereçados apenas pelo hash da fonte e o contrato local não fornecia dimensões/bytes reais por variante. Isso dificultava provar responsive images, cache correto e estabilidade de uma coleção.

Este corte cria um **Gallery Lab canônico Node-first** para homologar fotos reais + galeria + jogos antes de acoplar CRM, fila, WhatsApp ou o workflow Python.

## O que foi corrigido neste corte

### Worker de mídia

O namespace de derivados passa a considerar:

```text
photoId + sourceHash + recipeKey
```

`recipeKey` inclui política de resize/formato/qualidade e versões Sharp/libvips. Uma mudança de receita deixa de poder reutilizar silenciosamente o mesmo derivado.

O snapshot privado é re-hasheado depois da cópia e antes da promoção, fechando a janela em que o arquivo de origem poderia mudar entre o primeiro hash e a derivação.

Os derivados agora registram, para cada `thumb`, `card` e `game`:

```text
width
height
byteLength
```

Isso permite validar `srcset`, budgets de rede e relação qualidade/bytes com fatos do arquivo gerado.

### Identidade local

O Gallery Lab não usa mais ids `photo-001`, `photo-002` dependentes de ordenação.

O id local é opaco e determinístico a partir do nome privado da fonte; adicionar uma nova foto antes na ordenação não renumera as fotos existentes. O nome original não entra no DTO do browser nem no `local-test-session.json`.

Esse id é **somente estratégia do laboratório**. Em produção, `photoId` deve vir de identidade estável da sessão/revisão e não de nome de arquivo.

### Publicação fail-closed

`local-test-session.json` só é publicado quando:

```text
expected == ready
failed == 0
```

Se uma fonte falha, a config pública local anterior é removida. O laboratório não avança com uma coleção parcialmente processada sem avisar.

### Contrato local v2

O config local passa a registrar:

```text
version = 2
worker.version
worker.recipeKey
worker.sharpVersion
worker.libvipsVersion
variantMetrics por foto/variante
```

O middleware Vite mantém leitura compatível do formato legado v1, mas o caminho canônico novo é v2.

## Caminho A — Gallery Lab local, sem Python e sem backend de sessão

Este é o primeiro caminho de homologação.

### Comando único

No Windows 11, a partir da raiz do repositório:

```powershell
pnpm gallery:lab --source "C:\Fotos\Sessao-Tratada"
```

Opcional:

```powershell
pnpm gallery:lab `
  --source "C:\Fotos\Sessao-Tratada" `
  --display-name "Natal da Família Silva" `
  --concurrency 2 `
  --port 5173
```

O comando:

1. lê apenas JPEG/PNG/WebP diretamente na pasta indicada;
2. ignora subpastas de entrega/baixa/QC;
3. cria/reusa uma identidade local da sessão no storage privado;
4. gera `thumb=480`, `card=800` e `game=1600` em WebP 82;
5. grava manifesto v2 + métricas reais;
6. publica `local-test-session.json` apenas se a coleção estiver completa;
7. inicia `apps/play` em `127.0.0.1` com `LOCAL_TEST_MEDIA_ROOT` configurado;
8. imprime os links exatos de Hub, Galeria e Puzzle.

O storage default é:

```text
.local-test-media/gallery-lab/
```

Esse diretório é ignorado pelo Git.

### Modo de automação

Para Antigravity, scripts, benchmark ou CI que não devem manter um servidor aberto:

```powershell
pnpm gallery:prepare --source "C:\Fotos\Sessao-Tratada"
```

Esse modo prepara a sessão e devolve um recibo JSON em stdout. Erros tipados vão para stderr e o processo encerra diferente de zero.

## O que este caminho prova

O Gallery Lab permite validar com fotos reais, sem CRM e sem Python:

- proporção e orientação reais;
- `srcset` usando larguras intrínsecas reais;
- bytes de `thumb/card/game`;
- primeira dobra da Galeria;
- batching 8 + 8;
- scroll e retorno Galeria -> Puzzle -> Galeria;
- seleção compartilhada entre Hub/Galeria/jogo;
- ausência de Phaser/canvas antes de entrar em jogo;
- lightbox e política `card + game`;
- comportamento de coleções pequenas, médias e grandes;
- regressões de crop/portrait/landscape;
- qualidade natalina e reduced motion.

Ele **não** prova autenticação de produção, isolamento entre clientes, ingest HTTPS, browser grants, Nginx/X-Accel ou ativação atômica de revisão.

## Caminho B — publicação Node direta para o backend, ainda sem Python

Depois do Gallery Lab visual ficar aprovado, o próximo degrau deve continuar podendo ser executado sem EvydFlow:

```text
pasta tratada
  -> media-pipeline Node/Sharp
  -> manifesto/receipt
  -> publisher Node manual
  -> internal API gameplay
  -> revisão STAGED
  -> verify
  -> activate
  -> link público
```

Esse modo é importante porque separa dois problemas:

1. produto/backend de photo sessions;
2. automação operacional do estúdio.

Se a publicação falhar nesse estágio, o defeito está no contrato gameplay/ingest e não no Python/CRM/WhatsApp.

### Bloqueio atual

O `apps/catalog-server` ainda **não implementa** a autoridade completa de photo sessions nem os endpoints internos de ingestão definidos no plano:

```text
POST /internal/v1/photo-sessions
POST /internal/v1/photo-sessions/:id/revisions
PUT  /internal/v1/revisions/:id/media/:photoId/:variant
POST /internal/v1/revisions/:id/verify
POST /internal/v1/revisions/:id/activate
GET  /internal/v1/photo-sessions/:id/status
```

Portanto, não criar um "upload remoto de laboratório" que grave arquivo direto na webroot, use FTP, invente sessão em JSON ou contorne autorização. O próximo corte de backend deve implementar essa fronteira corretamente; depois disso um publisher Node manual usa exatamente a mesma API que o EvydFlow usará.

## Caminho C — EvydFlow/Python entra por último

Só depois de A e B aprovados:

```text
EvydFlow
  -> resolve pedido/CRM
  -> congela seleção
  -> chama o mesmo worker Node
  -> chama a mesma internal API
  -> verifica ACTIVE
  -> side effects de entrega
```

O Python vira **orquestrador operacional**, não processador de imagem nem segunda autoridade de sessão.

Isso evita diagnosticar ao mesmo tempo:

- CRM;
- fila;
- subprocess Python -> Node;
- Sharp;
- upload;
- sessão;
- galeria;
- jogo;
- WhatsApp.

## Sequência de homologação recomendada

### Etapa 0 — mídia isolada

Executar `gallery:prepare` com 6, 12, 30 e uma coleção grande representativa.

Aprovar:

- zero falhas silenciosas;
- recipeKey registrado;
- ids não posicionais;
- métricas reais em todas as variantes;
- rerun idempotente;
- alteração de pixels cria novo `sourceHash`;
- alteração de receita cria novo namespace de derivado.

### Etapa 1 — Galeria real local

Executar `gallery:lab`.

Aprovar em 390/412/430/768:

- 8 fotos iniciais no mobile;
- sem overflow;
- uma coluna <600;
- sem crop obrigatório;
- nenhum `game` no feed inicial;
- zero Phaser/canvas/chunk de jogo em `/fotos`;
- lightbox lazy;
- retorno ao mesmo scroll.

### Etapa 2 — jogos com as mesmas fotos

Usar o link de Puzzle impresso pelo Gallery Lab e também abrir outros jogos compatíveis pelo Hub.

Aprovar:

- foto selecionada é a mesma no jogo;
- `game` só entra quando o papel exige;
- saída destrói Phaser e retorna para o shell correto;
- três ciclos Galeria -> Puzzle -> Galeria sem crescimento persistente.

### Etapa 3 — benchmark de variante

Com corpus real, comparar:

```text
card=800
candidate gallery=1200
game=1600
```

Registrar dimensão real, bytes e inspeção em viewport mobile. Só então decidir se uma quarta variante entra na receita.

### Etapa 4 — backend real

Implementar SessionRepository, revisão, storage privado, access grants e ingest interno.

Primeiro publicar manualmente via Node. Não envolver EvydFlow nesta etapa.

### Etapa 5 — isolamento

Provar A/A2/B:

- duas galerias do mesmo pedido com `galleryKey` diferente;
- outra galeria de outro contexto;
- token/grant nunca cruza sessão;
- duas abas independentes;
- revisão ativa de A não altera A2/B.

### Etapa 6 — aparelhos físicos

Só depois de a rede/backend existir:

- Android intermediário/Chrome;
- iPhone/Safari;
- conexão móvel degradada;
- safe areas;
- gesto de voltar;
- pinch-to-zoom;
- orientação portrait/landscape.

### Etapa 7 — integrar EvydFlow

O adapter Python passa a chamar contratos já homologados. Nenhuma regra de mídia/galeria é reimplementada em Python.

## Regras para Antigravity

Ao trabalhar em photo sessions/galeria:

1. começar pelo Gallery Lab se a tarefa puder ser provada sem backend;
2. não criar fixture nova quando uma pasta real pode ser preparada pelo lab;
3. não criar segundo pipeline de imagem;
4. não inferir largura de `thumb/card/game`; usar `variantMetrics`;
5. não adicionar `gallery=1200` antes do benchmark;
6. não adicionar RPA/YARL/virtualizer apenas por preferência — medir contra o fallback atual;
7. não importar Phaser na GalleryRoute;
8. não transformar o Vite middleware local em endpoint de produção;
9. não publicar direto em webroot/FTP para "ganhar tempo";
10. ao implementar o backend, criar publisher Node manual antes de integrar Python;
11. registrar recibos/evidências e só avançar quando o gate anterior estiver verde.

## Pendências de alta prioridade reveladas pela auditoria

### P0 antes de qualquer piloto público

- SessionRepository real no browser/backend;
- remover qualquer possibilidade de fixture silenciosa em produção;
- browser grant e revogação;
- storage privado + X-Accel;
- ingest interno idempotente;
- revisão verify/activate atômica;
- token/redaction em logs;
- isolamento A/A2/B.

### P1 para qualidade/performance

- benchmark 800/1200/1600;
- resource-byte gate em E2E;
- teste repetido de lightbox/jogo;
- Android/iPhone físicos;
- benchmark RPA/YARL somente após DTO real.

## Critério de sucesso da estratégia Node-first

O EvydFlow só entra quando for possível responder "sim" às três perguntas:

1. Uma pasta real de fotos consegue virar Galeria + jogos de forma determinística pelo Node?
2. O backend gameplay consegue receber/verificar/ativar essa mesma coleção sem Python?
3. A experiência pública mantém isolamento, performance e navegação mobile?

Se sim, integrar Python passa a ser automação de um sistema já conhecido, e não parte da descoberta arquitetural.
