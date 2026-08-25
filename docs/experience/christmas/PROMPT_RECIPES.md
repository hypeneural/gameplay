# Receitas de referência visual

Estas receitas servem para criar **referências de direção**, nunca para colocar
arte diretamente no navegador. Antes de qualquer uso em produção, registrar
origem, licença/termos, revisão humana, preparação e auditoria no manifesto.

## Regras de segurança

- Nunca incluir nome de cliente, telefone, sessão de fotos, foto real,
  identidade de criança, marca de terceiro ou logotipo.
- Pedir composição com espaço protegido para foto e controles, não uma tela
  cheia de objetos.
- Gerar uma pose-chave por vez; animação precisa derivar de uma base coerente
  ou de produção própria 3D→2D, jamais de frames independentes.
- Rejeitar texto legível involuntário, marcas, watermark, rosto realista ou
  elemento que não possa ser licenciado e reproduzido com segurança.

## Quadro mestre de estilo

```text
Referência não destinada ao runtime para jogo mobile natalino em retrato.
Criar cenário de noite de inverno em quatro planos: vila e pinheiros discretos
ao fundo; janela quente e árvore no meio; grande área central vazia, protegida
por moldura física em vermelho framboesa e dourado suave para receber uma foto;
ramos, presentes e neve somente nos cantos. Estilo brinquedo-diorama premium,
materiais de fita, pinho, madeira e neve, luz azul-noturna com pontos âmbar,
tom acolhedor e lúdico. Sem pessoas, rostos, fotografia real, texto, números,
logos ou marcas. Evitar néon, roxo mágico, laser, bloom duro e fundo poluído.
```

## Componentes isolados

| Pedido              | Incluir                                                   | Excluir                                          |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Moldura             | vista frontal, espaço interno amplo, fita e dourado fosco | foto, rosto, texto e ornamentos no centro        |
| Árvore              | árvore em L1, luz quente já preparada, silhueta simples   | luz piscando em sincronia, néon e objetos demais |
| Presente            | prop de canto, material de papel e fita, leitura a 200 px | rótulo, logotipo e aparência de botão            |
| Neve/VFX            | poucas formas simples com alfa e início/fim definidos     | chuva densa, explosão constante e fundo opaco    |
| Personagem opcional | pose-chave gentil, silhueta arredondada, fundo neutro     | pessoa real, marca, ação agressiva e texto       |

## Registro obrigatório

Para cada referência, registrar data, ferramenta/fonte, finalidade, prompt ou
receita, aprovador, limitações de uso e decisão. A âncora atual está descrita
em `style-anchors/README.md`.
