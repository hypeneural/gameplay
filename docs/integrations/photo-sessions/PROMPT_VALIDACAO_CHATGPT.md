# Prompt de validação técnica com pesquisa oficial

Copie o texto a partir de “Atue como...” até o final e use no ChatGPT com pesquisa na web habilitada. Se um repositório privado não estiver acessível, a análise deve usar a auditoria como evidência relatada e indicar o que ainda precisa de inspeção independente. Não fornecer credenciais, fotos ou dados do cliente para resolver falta de acesso.

---

Atue como revisor sênior de arquitetura, processamento de imagens, workflows confiáveis e performance mobile. Faça uma revisão independente e crítica da proposta abaixo. **A prioridade é colocar um MVP útil em produção o mais rápido possível, preservando qualidade fotográfica, interatividade natalina, isolamento entre clientes e recuperação de falhas.** Conteste premissas; não se limite a concordar com os documentos.

## 1. Leia as evidências primeiro

Comece pelo pacote público:

- Índice: https://github.com/hypeneural/gameplay/tree/codex/puzzle-native-like-v1/docs/integrations/photo-sessions
- Auditoria: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/AUDITORIA_WORKFLOW_SESSOES_E_JOGOS.md
- Plano completo: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/PLANO_IMPLEMENTACAO_GALERIA_JOGOS_EVYDFLOW.md
- Caminho crítico do MVP: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/MVP_RAPIDO.md
- Medições: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/evidence/benchmark-summary.json
- Índice de fontes: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/evidence/source-index.json
- Smoke de galeria: https://github.com/hypeneural/gameplay/blob/codex/puzzle-native-like-v1/docs/integrations/photo-sessions/evidence/gallery-smoke-summary.json

Inspecione também o código relevante dos repositórios, **quando houver acesso autorizado**:

| Repositório                                        | Referência auditada                        | Pontos prioritários                                                                                                                |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| https://github.com/hypeneural/gameplay             | `e38573b46d841f9cea1ab5f7306b0fd254b511ca` | Photo/Session, AppRouter, AppNavigation, SessionPhotoAlbum/PhotoPrint, CatalogServer, media-pipeline, loaders e cleanup dos jogos. |
| https://github.com/hypeneural/evydflow             | `42f0bcfd562d3165362cba39f1adb7bc5856d3af` | fs/images/orders/whatsapp/FTP/Drive, executor, state, queue, YAMLs e padrões úteis do SoClique.                                    |
| https://github.com/hypeneural/festive-gallery-show | `0f903fba53d0e33c62cd3aa32f1cb25e8489390b` | Index, PhotoGallery, GalleryHeader, masonry, lightbox, chamadas PHP e dependencies.                                                |

EvydFlow e a galeria de referência são privados. Houve mudanças locais concorrentes no EvydFlow; os hashes do índice identificam os arquivos efetivamente observados. Não trate cada afirmação da auditoria como código que você próprio leu. O PHP remoto da galeria não está no repositório e não foi auditado. Se links GitHub não abrirem, use a visualização raw ou os documentos anexados, registrando a limitação.

Declare quais documentos, arquivos e commits conseguiu acessar. Diferencie: fato observado em código; resultado medido; inferência; proposta futura; ponto não verificável. Ao comparar com versões posteriores, identifique a diferença e não atualize silenciosamente o baseline.

## 2. Contexto e resultado desejado

O estúdio entrega fotos de sessões natalinas. A pasta segue um padrão como `<nome> - <telefone> - Experiência Então é Natal - 5000`; **5000 é fictício**. O número final corresponde à referência interna do pedido no CRM e deve ser preservado integralmente como string. UUID do CRM, UUID da sessão, photoId, revisão, jobId e token de acesso têm funções diferentes.

Processar somente as fotos principais diretamente na raiz, sem usar a subpasta BAIXA como origem. Preservar os originais. A família deve receber uma sessão segura que oferece:

```text
/s/<token>                  Hub compacto, foto escolhida e jogos
/s/<token>/fotos            Galeria completa para celular
/s/<token>/game/<game-id>   Jogo da mesma sessão
```

Galeria e jogos reutilizam catálogo, variantes, autorização e seleção. Rudolph usa um subconjunto para a rodada: fotografias molduradas caem, a criança conduz a rena pelo toque, a lembrança é resgatada e ganha destaque no álbum. Fotos podem repetir durante a rodada; a rodada termina ao completar o álbum único da rodada. O álbum do jogo e a coleção completa da sessão têm escopos diferentes.

A direção exige fotos em destaque, sprites profissionais, animações natalinas, som após interação e toque claro. O MVP deve reutilizar um jogo existente com qualidade já revisada; não pressupõe criar outros jogos ou refazer toda a arte.

Proposta: EvydFlow permanece Python/YAML; Sharp existente processa no estúdio no MVP; só derivados são enviados por HTTPS. Backend mantém storage privado, sessões persistentes, revisão imutável, verificação e ativação atômica. Galeria entra na gameplay por adaptação seletiva da UI antiga. Para o piloto, considerar UUID CRM informado e verificado pelo operador e entrega manual do link. Outbox/inbox/intenção durável e reconciliação entram antes de habilitar envio automático.

## 3. Dados medidos que precisam de interpretação correta

- 30 originais da raiz: **314.662.440 bytes**; 30 arquivos BAIXA excluídos.
- 25 paisagens, 5 retratos, entre 7,89 e 22,4 MP; nenhum grupo de duplicatas exatas por hash. Duas versões de uma captura precisam de decisão do fotógrafo.
- Sharp **0.35.3**, libvips **8.18.3**; duas fotos concorrentes, `sharp.concurrency(1)`.
- WebP qualidade 82, `inside`, auto-orientação, sRGB e sem ampliação; borda maior de 480/800/1600 para thumb/card/game.
- **90 derivados, 6.616.226 bytes, 21,75 s**; replay **1,72 s**, arquivos inalterados; originais intactos e derivados decodificados.
- Redução de **97,90%** no conjunto derivado em relação aos originais. Isso não reduz o espaço do backup dos originais nem comprova carga inicial da página.
- Comparação em três amostras: AVIF 45 cerca de 55,7% menor e 9,94 vezes mais lento que WebP 82 na média observada. Um timing por caso e PSNR não permitem concluir a melhor qualidade percebida ou throughput de produção.
- Smoke em viewports de 390/768/1280 com APIs simuladas não comprova performance em Android físico, Safari/iOS ou segurança do PHP remoto.
- Histórico de outras coleções tem sessões maiores que 30 fotos. As projeções de 600/800 sessões baseadas neste caso são lineares, não testes de carga.

## 4. Pesquise documentação oficial atual e compatível com as versões

Faça buscas na web e abra as páginas. Use fontes primárias; cite a página específica que sustenta cada correção ou recomendação. Confira o comportamento da versão instalada antes de recomendar uma API recente. Se necessário, use changelog ou código oficial tagueado. Fontes iniciais:

- Sharp: https://sharp.pixelplumbing.com/api-output/ ; https://sharp.pixelplumbing.com/api-resize/ ; https://sharp.pixelplumbing.com/api-utility/ ; https://sharp.pixelplumbing.com/performance/
- React lazy e carregamento: https://react.dev/reference/react/lazy
- HTML de imagens, srcset, sizes, decoding e loading: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- Core Web Vitals: https://web.dev/articles/vitals
- SQLite WAL/transações: https://www.sqlite.org/wal.html ; https://www.sqlite.org/lang_transaction.html
- Nginx internal e X-Accel-Redirect: https://nginx.org/en/docs/http/ngx_http_core_module.html#internal ; https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Caddy, se for o proxy efetivamente usado: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- OWASP autorização e uploads: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- Google Drive permissions: https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions
- Phaser: código oficial https://github.com/phaserjs/phaser ; confirmar a versão instalada **4.2.1**, os tipos e exemplos correspondentes antes de sugerir lifecycle, loader ou máscaras. Código Phaser 3/RC só serve como referência algorítmica.

Pesquise documentação oficial de Python, Node, browser APIs e do provedor real de CRM/WhatsApp quando forem relevantes. Não invente filtros de `/orders/search`, campos do CRM ou garantias de idempotência do mensageiro. Identifique contratos que faltam. Uma recomendação de atualizar dependências precisa apresentar problema corrigido, compatibilidade e custo para o MVP; atualizar tudo não é objetivo.

## 5. Verifique a lógica e a arquitetura

1. Uma sessão compartilhada com galeria dentro da gameplay é a menor solução coerente? Compare com manter duas aplicações, explicitando manutenção, código reaproveitado, tráfego, autenticação e tempo de implementação.
2. A distinção pedido completo/UUID CRM/sessionId/photoId/sourceHash/recipeKey/revision/token está correta? Há identificadores redundantes ou chaves ambíguas? Truncamento para quatro dígitos, zeros à esquerda e importações repetidas precisam de qual contrato?
3. O congelamento por hash protege a origem de mudanças enquanto processa? A chave de cache inclui receita, encoder e versão suficientes? Como lidar com fotos removidas, ordem alterada, arquivo corrompido e duas versões visualmente semelhantes?
4. A persistência, staging, recibos, idempotência e ativação evitam coleção parcial, revisão errada e cliente misturado? Qual é o esquema mínimo de banco e quais índices/restrições são indispensáveis?
5. No MVP em um host e um worker, quais leases/fencing/filas distribuídas podem ser adiados? Quais garantias precisam existir desde o primeiro uso, inclusive sob replay e timeout?
6. SQLite em disco local é suficiente para o volume proposto? Que evidência justificaria Postgres ou processamento na VPS? Compare CPU, RAM, I/O, banda, operação e tempo de desenvolvimento, sem prometer throughput a partir de um único batch.
7. Quais falhas observadas em FTP, Drive, cache de estado, scan vazio e envio podem afetar o novo fluxo? Separe correções necessárias ao novo caminho da modernização de todo o legado.

## 6. Revise o workflow de ponta a ponta

Avalie: intake -> confirmar pedido/destinatário -> snapshot -> gerar -> verificar -> transferir -> ativar -> autorizar -> entregar -> registrar -> reexecutar/recuperar.

Determine quem é a autoridade de cada estado e onde cada transação termina. Verifique:

- fonte vazia, arquivo instável, limite de bytes/pixels, colisão de nomes e retorno parcial do worker;
- nova receita ou seleção e estado antigo marcado como done;
- upload interrompido, checksum divergente, timeout após ativação e retry;
- exclusão/backup/arquivamento dos originais sem interferir no novo intake;
- emissão do evento de ativação, inbox e intenção de envio únicas;
- envio confirmado, falha transitória, falha definitiva e **resultado desconhecido**;
- necessidade de intervenção do operador sem reenviar cegamente mensagens;
- resolução de UUID manual no piloto e automática posteriormente;
- migração de links antigos sem expor token por redirect de ID enumerável.

Uma pasta `/internal` não autentica a API. Um token aleatório no frontend não autoriza sozinho os arquivos. Avalie serviço de ingestão, cookie, token, expiração, revogação, isolamento, autorização antes de X-Accel e crawlers de preview. Não transformar o MVP em um programa completo de compliance; priorizar controles que impedem uma família de acessar outra.

## 7. Revise performance e qualidade no celular

Explique os gargalos prováveis e um teste que possa confirmar cada um:

- peso inicial real do bundle, carregamento de Phaser/jogos, tempo até foto útil e primeira interação;
- thumb/card/game por largura CSS, proporção, DPR e zoom; candidatos srcset com largura real;
- prioridades, lazy loading, decode, abort de requests e resposta antiga após troca de sessão;
- quantidade de imagens montadas/decodificadas, prefetch de vizinhos, textures GPU e caches limitados;
- necessidade real de virtualização para 30, 120 e sessões maiores, e seu custo de acessibilidade/complexidade;
- lightbox, scroll, toque, teclado, botão voltar, resize, movimento reduzido e recuperação de falha;
- fotos sem corte de rosto, cor sRGB, compressão de pele/cabelo/tecido e aprovação visual pelo fotógrafo;
- som habilitado após gesto, retomada de áudio, feedback de toque e animações/VFX natalinos com perfil LOW;
- um Phaser por entrada e cleanup de sons, listeners, tweens, partículas, texturas e `game.destroy(true)`;
- três ciclos de entrar/jogar/sair e revisitas às fotos para detectar retenção e perda de recursos;
- Android físico de referência, Safari/iOS e rede limitada; emulação Chromium não substitui essas evidências.

Sugira budgets iniciais e protocolos de medição, distinguindo **meta proposta**, **métrica de laboratório** e **evidência coletada**. Para LCP/INP/CLS, use definições e limites oficiais atuais; explique percentis, laboratório e campo. Não declarar INP aprovado por um Lighthouse isolado. Para FPS/memória, defina o dispositivo, duração, cenário e limites de degradação antes de afirmar aprovação.

## 8. Simplifique organização e desenvolvimento

Proponha a menor organização que mantém: `apps/play` compondo jogos; `platform` com contratos puros; domínios sem browser/Phaser; Sharp somente no Node; backend sem imports indevidos de frontend; EvydFlow sem outra implementação de resize.

Identifique arquivos e módulos concretos a criar ou adaptar. Não crie SDK, plugin framework, dashboard, base scene ou abstração genérica sem consumidor real. Compare adaptação seletiva da galeria com copiar todas as dependências React 18/Tailwind para o app atual. Preserve qualidade, especificações dos jogos, proveniência de assets e legibilidade para a equipe.

## 9. Monte o caminho mais curto até o MVP

Revise o recorte R1-R6 e o backlog T01-T14. Responda claramente:

- O que impede hoje a primeira sessão real de funcionar?
- Qual a menor entrega vertical que valida a ideia inteira?
- UUID CRM conferido e link entregue manualmente permitem um piloto mais rápido? Quais registros e controles continuam necessários?
- O que muda se envio automático for obrigatório na primeira entrega?
- Qual jogo existente é o melhor primeiro consumidor, com base no código e nas dependências? Não exigir todos os 11 de uma vez.
- O que fazer agora, após o piloto e apenas depois de medir escala?
- Que parte do plano está excessiva, incorreta, redundante ou pouco comprovada?

Organize tarefas pequenas por dependência, responsável provável, esforço relativo/faixa com premissas e aceite. Dê uma sequência de 5-8 PRs ou commits coerentes. Se usar dias, declare equipe, experiência, infraestrutura e disponibilidade; não trate estimativa como promessa. A primeira semana deve priorizar uma sessão navegável com fotos seguras e um jogo, e não uma fábrica completa com automação distribuída.

## 10. Formato exigido da resposta

Entregue uma análise detalhada, mas orientada a decisões, nesta ordem:

1. **Veredito:** arquitetura recomendada, maturidade atual e maior bloqueio do MVP.
2. **Matriz de validação:** afirmação -> correta/parcial/incorreta/não verificável -> evidência do repo -> fonte oficial -> correção -> impacto no MVP. Dê prioridade P0/P1/P2.
3. **Riscos e gargalos:** problema concreto, consequência, evidência disponível, teste faltante e menor correção.
4. **Workflow mínimo:** estados, donos, transações, falhas e retomada; inclua um diagrama simples.
5. **Performance mobile:** budgets propostos, protocolo em aparelho/rede, escolha de variantes, cache e limites de recursos.
6. **Backlog de MVP:** ordem de execução, dependências, aceite, esforço relativo e entregas adiadas.
7. **Alterações nos documentos:** indique seção e redação exata que deve mudar; não reescreva tudo sem necessidade.
8. **Perguntas pendentes:** no máximo oito perguntas que realmente alterem a decisão; continue a análise independente usando premissas explícitas.
9. **Fontes consultadas e limites:** links específicos próximos às afirmações, versões, data da consulta, arquivos acessados e pontos que permaneceram sem prova.

Não afirme que executou testes, acessou uma VPS, leu repositórios privados ou validou CRM/Safari/Android se isso não ocorreu. Não confunda benchmark de resize, UI mockada, documentação e serviço em produção. O resultado deve permitir decidir **o que implementar primeiro amanhã para chegar ao MVP com menos trabalho e sem comprometer as fotos dos clientes**.
