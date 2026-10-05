# MVP rápido: galeria e jogos na mesma sessão

**Estado: recorte proposto para validação técnica, sem implantação. Data: 05/10/2026.**

O primeiro resultado de produto deve ser uma sessão real e privada que permita à família abrir a galeria, escolher uma foto, jogar um jogo existente e retornar à mesma coleção. O catálogo completo e a automação de entrega entram depois que esse percurso funcionar e puder ser repetido sem misturar clientes.

## Caminho crítico

```text
Pasta principal + UUID CRM conferido pelo operador
  -> snapshot privado e pedido completo
  -> worker Sharp existente, com receita versionada
  -> upload HTTPS de derivados para staging
  -> verificação e ativação atômica da revisão
  -> acesso autorizado por token
  -> galeria + um jogo existente
  -> piloto supervisionado e entrega manual do link
```

O fluxo preserva os originais da raiz e exclui BAIXA. Um pedido corresponde a uma sessão persistente; revisões podem mudar a seleção ou a receita sem criar outra identidade de cliente. O jogo recebe um subconjunto dessa coleção, conforme sua própria regra. Repetir uma foto durante Rudolph não duplica a fotografia no catálogo.

## Seis entregas que fecham a primeira experiência

| Marco                   | Implementação mínima                                                                                                                                 | Aceite observável                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| R1: identidade e pacote | Número completo como string; UUID CRM explícito validado; snapshot por hash; IDs estáveis; JSON de sessão e receita.                                 | Dois pedidos com os mesmos quatro últimos dígitos permanecem distintos. Zero fotos, arquivo ilegível ou pedido divergente bloqueiam o pacote. |
| R2: mídia pronta        | Adapter para o worker existente; thumb/card/game WebP; chave de cache inclui receita e versão; recibo com contagens e hashes.                        | Reexecutar conserva IDs e derivados; alterar receita gera revisão nova; originais permanecem intactos.                                        |
| R3: sessão publicada    | Um backend em uma VPS; storage privado; SQLite em disco local se adequado; criação, staging, verificação e ativação com idempotência.                | Upload interrompido nunca aparece ao cliente. Recebimento completo ativa apenas a revisão esperada; replay não duplica sessão.                |
| R4: família autorizada  | Token aleatório separado do pedido; cookie seguro; autorização por sessão/revisão/foto/variante; estados inválido, expirado e revogado.              | Cliente A não recebe foto B. Token inválido não abre fixture. Nenhum original ou caminho local aparece no browser.                            |
| R5: celular utilizável  | `/s/:token/fotos`, Hub compacto e um jogo já pronto; estado compartilhado; fotos proporcionais; carregamento limitado.                               | Selecionar foto, jogar, sair, recarregar e usar voltar mantém a sessão correta. Galeria não carrega Phaser antes da entrada no jogo.          |
| R6: piloto              | Smoke de isolamento, falhas e retomada; observação em Android físico e Safari no iPhone; operador confere destinatário e entrega manualmente o link. | Coleção correta, jogo funcional, toque e áudio utilizáveis, falhas recuperáveis e um procedimento de rollback documentado.                    |

R1/R2 podem avançar com fixtures seguras enquanto R3/R4 são desenvolvidos. R5 pode começar com o contrato de API simulado. A publicação de uma sessão real depende de R1-R4; o piloto depende do percurso completo. Não enviar um link antes de conferir a revisão ativa e o destinatário.

## Recorte do piloto e do MVP automatizado

O [plano completo](PLANO_IMPLEMENTACAO_GALERIA_JOGOS_EVYDFLOW.md) prevê outbox, consumo de eventos e entrega automática. Para reduzir o tempo até o primeiro uso supervisionado, avaliar dois marcos diferentes:

- **Piloto manual:** o operador informa o UUID do pedido, confirma o destinatário e entrega o link manualmente. O sistema registra a revisão ativa e a ação administrativa; não há task de envio automático habilitada. Essa etapa pode adiar o dispatcher de WhatsApp e a pesquisa automática de UUID.
- **MVP automatizado:** acrescentar provider EvydFlow, evento durável de ativação, inbox/intenção única e tratamento de resultado desconhecido antes de habilitar qualquer envio automático. Retry genérico não substitui reconciliação do provedor.

O piloto manual é uma alternativa de escopo para revisão, e não prova de que a automação já é confiável. Se o requisito comercial exigir envio automático na primeira entrega, a cadeia durável de entrega volta ao caminho crítico. Mesmo no piloto, a publicação de mídia deve ser íntegra, privada, persistente e recuperável.

## Trabalho que pode esperar

| Item                                                  | Por que adiar                                                                                         | Quando retomar                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Disponibilizar e revisar os 11 jogos para fotos reais | Um jogo comprova a composição compartilhada sem multiplicar QA do primeiro marco.                     | Depois de validar a sessão e a galeria; liberar cada jogo pelos seus gates. |
| AVIF e quarta variante de zoom                        | A bancada WebP já funciona; benefício de zoom/codec ainda precisa de celular real e aprovação visual. | Quando qualidade ou tráfego medidos justificarem outra receita.             |
| Fila distribuída e múltiplos servidores               | Piloto em um host não exige coordenação distribuída.                                                  | Quando houver concorrência/capacidade comprovadamente insuficientes.        |
| Dashboard novo e framework genérico de mídia          | CLI, recibos e uma rotina administrativa pequena atendem o primeiro operador.                         | Após dois consumidores demonstrarem necessidades comuns.                    |
| Migração de todos os links legados                    | Pode desviar o piloto e revelar credenciais se feita por redirect numérico.                           | Depois do piloto, com canal verificado e rollback por revisão.              |
| Reescrever EvydFlow ou copiar toda a galeria antiga   | Aumenta escopo e cria autoridades concorrentes.                                                       | Não faz parte do recorte atual; adaptar apenas o necessário.                |

Não adiar isolamento entre clientes, autorização de cada mídia, IDs estáveis, validação dos arquivos, revisão completa, revogação, preservação dos originais e tratamento de reexecução. Em um único worker, exclusão por sessão e atualização condicional no banco podem ser suficientes; locks distribuídos e fencing devem entrar se o modelo real de concorrência exigir. Validar essa simplificação antes de adotá-la.

## Performance: provar antes de ampliar

- Medir os bytes efetivamente baixados antes da primeira interação. Os 6,62 MB da bancada são todas as variantes, não uma meta de carga inicial.
- Usar dimensões reais no `srcset`; 480/800/1600 são bordas maiores. Retrato e paisagem precisam de candidatos coerentes com largura CSS e densidade.
- Priorizar só a foto visível de destaque; carregar grid e vizinhos sob demanda, com limite e fallback manual. Evitar atribuir alta prioridade a todas as imagens.
- Separar o bundle de galeria do Phaser e dos jogos. Medir os requests e os chunks, em vez de concluir isso pelo nome de um componente lazy.
- Medir memória de imagens decodificadas e texturas, long tasks, tempo até foto útil e resposta ao toque. JPEG/WebP pequenos ainda podem ocupar muitos pixels em memória.
- Observar entrada, áudio após gesto, scroll, lightbox, resize, pausa, retorno e repetidas entradas no jogo em aparelhos reais. Nome de projeto Playwright `iphone-390` com Chromium não comprova Safari/iOS.
- Aplicar movimento reduzido e perfil LOW preservando fotografia, gesto, feedback e vitória. Assets e efeitos devem manter a qualidade natalina já definida no projeto.

## Relação com o backlog completo

R1-R5 percorrem partes de T01-T09, sem exigir toda a implementação futura de cada módulo. R2 corresponde ao contrato/CLI de mídia e adapter; R3/R4 correspondem a persistência, ingestão e autorização; R5 corresponde ao provider de sessão e galeria. O piloto usa uma fatia de T14 e o QA necessário ao jogo escolhido. T10-T12 fecham o MVP automatizado. T13 e a migração ampla de T14 seguem conforme a evidência e os jogos liberados.

O próximo planejamento deve atribuir esforço por entrega pequena, responsável, dependência e prova de aceite. Não converter o tempo de 21,75 s do resize em prazo de desenvolvimento nem em promessa de capacidade da VPS. O [prompt de validação](PROMPT_VALIDACAO_CHATGPT.md) solicita revisão dessa ordem, das simplificações e do que continua bloqueando a primeira entrega.
