---
name: revisao-visual-mobile
description: Valide visualmente jogos natalinos de fotos em navegador mobile quando houver canvas, HUD, animação ou efeitos; não use apenas assertions de DOM como prova visual.
---

# Revisão visual mobile

Revise o jogo como a família o vê. Procure clareza da primeira ação, foto
protagonista, espaço útil de jogo e resposta perceptível ao toque.

## Roteiro

1. Use o navegador local quando disponível; não envie fotos, tokens ou dados
   da sessão a terceiros.
2. Teste capa, primeira ação, partida, seleção, dica, pausa, vitória, saída,
   LOW e movimento reduzido.
3. Revise 390, 412, 430 e 768 CSS px, com derivados seguros em retrato e
   paisagem quando o jogo os suporta.
4. Leia console, tamanho do canvas, scroll acidental, foco e duplicação de
   canvas depois de sair.
5. Registre captura apenas em evidência privada. No repositório, guarde estado,
   viewport, achado, reprodução, severidade e dono.

## Rubrica

- Foto: rosto e lembrança permanecem protagonistas e sem obstrução.
- Hierarquia: uma única camada de título/status; controles não escondem o jogo.
- Interação: alvo legível, resposta imediata e alternativa toque–toque para
  arraste não essencial.
- Natal: cenário, luz, neve e som são coerentes e não concorrem com a foto.
- Acessibilidade: LOW e movimento reduzido removem decoração repetitiva, não
  confirmação, leitura ou vitória.
- Lifecycle: pause, retorno e saída não deixam som, listener, tween, partícula
  ou canvas indevido.

## Severidade

- P1 impede a ação principal, encobre a foto/tabuleiro ou expõe estado técnico.
- P2 reduz compreensão, conforto, área útil ou sensação de acabamento.
- P3 é polimento sem impacto no uso principal.

Conclua com achados concretos e a próxima tarefa do plano. Não mude design,
assets ou mecânica durante uma revisão sem autorização de implementação.
