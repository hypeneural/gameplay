---
name: photo-sessions-integration
description: Implemente e valide a integração EvydFlow + backend de sessões + galeria mobile + jogos com isolamento multi-cliente, derivados Sharp e publicação atômica.
---

# Photo Sessions Integration

Use esta skill para qualquer corte vertical envolvendo fotos reais de clientes, galeria, API de sessão, ingestão de mídia ou EvydFlow.

## Antes de editar

1. Leia `AGENTS.md`.
2. Leia `docs/exec-plans/active/CG-PHOTO-SESSIONS-ANTIGRAVITY-2.19.1.md`.
3. Leia `docs/integrations/photo-sessions/MVP_RAPIDO.md`.
4. Leia `docs/integrations/photo-sessions/PLANO_IMPLEMENTACAO_GALERIA_JOGOS_EVYDFLOW.md`.
5. Para mídia, leia `docs/media/LOCAL_MEDIA_ARCHITECTURE.md`.
6. Para UI mobile, leia `.agents/skills/revisao-visual-mobile/SKILL.md`.

Não confunda o estado documentado com implementação existente. Verifique código e testes antes de afirmar que uma etapa já existe.

## Método de execução

### 1. Escolha um corte vertical pequeno

Implemente uma única fronteira coerente por vez. Ordem preferida:

1. contratos/IDs;
2. worker/manifesto;
3. persistência/revisões;
4. ingestão/verificação/ativação;
5. acesso público/mídia;
6. provider de sessão no React;
7. GalleryRoute;
8. provider EvydFlow;
9. entrega/eventos;
10. catálogo ampliado de jogos.

Não comece pela automação de WhatsApp nem por copiar a galeria antiga.

### 2. Preserve as fronteiras

- Browser nunca conhece filesystem, original ou dados integrais do CRM.
- Jogos nunca consultam CRM nem decidem autorização.
- `packages/platform` contém somente contratos públicos/runtime compartilhável, sem drivers SQL ou secrets.
- Backend é autoridade de sessão/revisão.
- EvydFlow é autoridade do intake operacional do estúdio, não da sessão pública.
- Sharp local produz derivados; backend verifica e publica.

### 3. Faça multi-cliente por construção

Para toda rota/repository escreva testes com pelo menos duas sessões A/B:

- A pode ler A;
- A não pode ler B;
- token inválido não mostra fixture;
- photoId de B com grant de A retorna not-found/forbidden sem vazar existência;
- revisão STAGED/VALIDATED não substitui ACTIVE;
- troca de token/aba não reutiliza estado React de outro cliente.

### 4. Trate mídia como conteúdo versionado

Manifesto/recibo precisa conter:

- `photoSessionId`, `revisionId`, `photoId`;
- `sourceHash` privado;
- `recipeKey`;
- para thumb/card/game: largura, altura, byteLength, sha256 e variante;
- contagem esperada e contagem pronta;
- worker/build version.

Falha em qualquer foto/variante bloqueia ativação por default.

### 5. Faça a galeria como produto mobile

Preferência inicial:
- `react-photo-album@3.6.1`, import específico de Masonry.
- `yet-another-react-lightbox@3.32.2` + Zoom, carregado somente ao abrir foto.

Antes de adicionar dependências, confirme peer compatibility no lockfile atual e rode os gates.

Critérios:
- 8–12 tiles no primeiro lote;
- `srcset` usa larguras reais;
- zero Phaser/game chunk/canvas em `/fotos`;
- lightbox carrega `game` só quando necessário;
- scroll/seleção voltam corretamente depois de jogar;
- sem decoração pesada durante scroll;
- reduced motion e safe areas preservados.

### 6. Valide antes de avançar

Durante iteração:
```bash
pnpm check:fast
```

Antes de handoff:
```bash
pnpm validate
```

Se a mudança acrescentar arquivos rastreados:
```bash
pnpm repo:map
pnpm repo:map:check
```

Se não houver ambiente para um gate, registre explicitamente o que não foi executado; não substitua teste físico por viewport Chromium.

## Handoff esperado

Ao terminar um corte:

- liste arquivos alterados;
- diga qual invariável ficou garantida;
- apresente os testes executados;
- registre pendências reais, sem dizer "produção pronta" por inferência;
- se o contrato com EvydFlow mudou, escreva o payload/erro/idempotência de forma suficiente para o repositório Python implementar sem adivinhação;
- atualize o plano ativo com evidência somente quando o resultado existir.
