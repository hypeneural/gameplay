## Descrição das Alterações

<!-- Descreva de forma clara e concisa o que este PR implementa ou corrige -->

## Tipo de Alteração

- [ ] 🎄 Novo Jogo Natalino (`packages/games/<novo-jogo>`)
- [ ] ✨ Melhoria em Jogo Existente (mecânica, física, partículas, áudio)
- [ ] 🐛 Correção de Bug / Regressão
- [ ] 📱 Ajuste de Responsividade Mobile / Safe Areas
- [ ] 🧹 Refatoração / Limpeza de Código
- [ ] 🚀 Infraestrutura / Deploy / CI / Nginx / systemd / VPS
- [ ] 📚 Documentação / Auditoria Forense

## Checklist de Qualidade Obrigatória

- [ ] `pnpm agent:doctor` executado e compatível com o estágio desta mudança.
- [ ] `pnpm check:fast` executado e 100% verde (TypeScript, ESLint, Vitest).
- [ ] `pnpm check` executado (sem violações de regras arquiteturais ou deadcode).
- [ ] `pnpm repo:map` executado se novos arquivos canônicos foram adicionados.
- [ ] Mudança de Galeria/rota: `pnpm test:e2e:gallery` executado.
- [ ] Mudança de deploy: `pnpm release:staging && pnpm release:verify` executado; nenhuma promoção de `pilot` por configuração apenas.
- [ ] O domínio (`domain/`) é 100% puro e determinístico (sem imports de React, DOM, Phaser, Date.now ou Math.random).
- [ ] O ciclo de vida do Phaser garante `game.destroy(true)` na desmontagem com liberação de texturas.
- [ ] Áreas de toque têm pelo menos 72px para ergonomia em smartphones.

## Evidência Visual / Teste Mobile

<!-- Anexe screenshots, GIFs ou evidências de testes em iPhone Safari / Android Chrome -->
