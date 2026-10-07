# Guia de Contribuição — Christmas Games 🎄

Obrigado pelo seu interesse em contribuir com a fábrica de jogos natalinos do **Christmas Games**! Este documento orienta desenvolvedores e especialistas sobre padrões de código, fronteiras arquiteturais, fluxo de trabalho no Git e critérios de aceitação para manter a integridade, performance e qualidade da plataforma.

---

## 🎯 Princípios Fundamentais

1. **Mobile-First Incondicional:** Todo código de interface e renderização é avaliado prioritariamente em telas de toque mobile (iOS Safari e Android Chrome). Áreas de toque mínimas de 72px e respeito às _Safe Areas_.
2. **Determinismo:** Domínios de jogos nunca geram efeitos colaterais temporais ou estocásticos não-controlados. Proibido usar `Math.random` ou `Date.now` dentro de `domain/`.
3. **Desacoplamento Rigoroso:** O motor Phaser não deve poluir a lógica de domínio do jogo, e o React não deve interagir diretamente com nós do Phaser fora da ponte tipada (`GameBridge`).
4. **Respeito à Produção Existente:** O servidor de produção compartilha recursos com telefonia (**Asterisk 22**) e WhatsApp (**Evolution GO**). Builds pesados não rodam no host de produção.

---

## 🛠️ Configuração do Ambiente de Desenvolvimento

### Pré-requisitos Obrigatórios

- **Node.js:** `>=24.0.0 <25`
- **pnpm:** `11.19.0` (`corepack enable && corepack prepare pnpm@11.19.0 --activate`)

### Passo a Passo

```bash
# 1. Clonar o repositório
git clone https://github.com/hypeneural/gameplay.git
cd gameplay

# 2. Instalar dependências estritas
pnpm install --frozen-lockfile

# 3. Confirmar estágio/contratos do repositório
pnpm agent:doctor

# 4. Gerar fixtures de teste locais
pnpm fixtures:generate

# 5. Iniciar o servidor de desenvolvimento
pnpm dev
```

---

## 🌿 Fluxo de Trabalho no Git (GitFlow Simplificado)

### 1. Nomenclatura de Branches

Crie branches semânticas a partir de `codex/puzzle-native-like-v1` ou `main`:

- `feat/nome-da-feature` — Novas mecânicas, assets ou jogos.
- `fix/nome-do-bug` — Correções de layout, falhas de pontuação ou regressões.
- `perf/melhoria-desempenho` — Otimizações de renderização, áudio ou textura.
- `docs/nome-do-documento` — Documentações canônicas ou auditorias.

### 2. Padrão de Commits Convencionais

Utilize o padrão **Conventional Commits**:

```bash
feat(lanterna): adicionar feixe de luz volumétrico com reflexão em espelhos
fix(memory): corrigir desalinhamento de toque no iPhone 15 Pro Max
perf(phaser): destruir texturas do canvas para evitar vazamento de memória
docs(vps): atualizar guia forense de implantação com Caddyfile
test(globo): adicionar testes unitários para a mecânica de vapor no vidro
```

---

## 🎮 Criando um Novo Jogo Natalino

O monorepo possui um gerador automatizado que cria a estrutura básica do jogo com isolamento total:

```bash
# Simular a criação do jogo
pnpm game:new <nome-do-jogo> --dry-run

# Criar o jogo concretamente
pnpm game:new <nome-do-jogo>
```

### Estrutura Obrigatória de um Jogo (`packages/games/<jogo>/`):

```text
packages/games/<nome-do-jogo>/
├── SPEC.md                     # Especificação funcional e sensorial do jogo
├── EXPERIENCE.md               # Detalhes de feedback tátil, áudio e arte
├── package.json                # Workspace package
├── src/
│   ├── index.ts                # Ponto de entrada público do pacote
│   ├── definition.ts           # Metadados e manifesto do jogo
│   ├── domain/                 # LÓGICA PURA (Sem Phaser, Sem React, Sem DOM)
│   └── runtime/
│       └── phaser/             # Renderização, partículas, áudio e Scenes
└── tests/                      # Testes unitários com Vitest
```

---

## 🛡️ Portões de Qualidade (Quality Gates)

Antes de abrir um Pull Request, você **deve** validar seu código com os scripts oficiais:

```bash
# 0. Estado/readiness do repositório
pnpm agent:doctor

# 1. Validação Rápida (Execução obrigatória durante o desenvolvimento)
pnpm check:fast

# 2. Validação Arquitetural e Estilo (Verifica dependências proibidas e formatação)
pnpm check

# 3. Validação de Integridade de Assets
pnpm asset:validate:all

# 4. Validação Geral de Pré-Entrega
pnpm validate
```

Se `pnpm check` acusar problemas de formatação, execute:

```bash
pnpm format
```

Se houver novos arquivos ou rotas documentadas, atualize o mapa do repositório:

```bash
pnpm repo:map
```

---

## 📋 Checklist de Aceitação para Pull Requests (PR)

Ao abrir um Pull Request no GitHub, garanta que:

- [ ] `pnpm agent:doctor` retorna `status=ok` e o estágio pedido é permitido por `deploy/readiness.json`.
- [ ] O código passa 100% verde em `pnpm check:fast` (0 erros de tipagem, 0 erros de linter, 100% de testes unitários passando).
- [ ] O jogo não importa bibliotecas proibidas em seu `domain/` (validado pelo `dependency-cruiser`).
- [ ] O ciclo de vida do Phaser limpa listeners de eventos e executa `game.destroy(true)` na desmontagem.
- [ ] Áreas de toque interativas respeitam a medida mínima de 72px para mobile.
- [ ] O mapa topológico de arquivos (`pnpm repo:map`) está sincronizado.
