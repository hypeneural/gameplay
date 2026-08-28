# Compartilhamento e prévia social

Este contrato define como o catálogo de jogos e os jogos individuais compartilham
links sem transformar fotos de clientes em conteúdo público por acidente.

## Limites de responsabilidade

| Camada              | Responsabilidade                                                                       | Não pode fazer                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/play`         | Botão comum, dados textuais do compartilhamento, painel nativo e alternativa de cópia. | Gerar metadado para robô, publicar foto ou decidir autorização de sessão.      |
| Navegador           | Mostrar o destino de compartilhamento escolhido pela pessoa.                           | Compartilhar automaticamente ou prometer que o destino aceitou a mensagem.     |
| Backend do catálogo | Autorizar link opaco, produzir HTML com metadados e decidir a imagem permitida.        | Entregar original, caminho de disco, nome de cliente ou mídia sem autorização. |
| Nginx/VPS           | Só entregar derivada após a decisão do backend, com `X-Accel-Redirect`.                | Transformar token em caminho público direto.                                   |
| Fábrica de Assets   | Aprovar a arte natalina genérica de prévia, sua origem, hash e orçamento.              | Catalogar fotos de clientes como asset público.                                |

## Contrato do botão comum

O botão aceita somente:

```ts
{
  title: string;
  text: string;
  url: string; // URL HTTPS pública e sem nome/caminho de foto
}
```

Ele chama `navigator.canShare` quando disponível e `navigator.share` somente
dentro do clique. Um `AbortError` representa cancelamento normal. Sem Web Share,
ele tenta copiar a URL; se isso falhar, apresenta o link para cópia manual.
Não anexa arquivo de foto na primeira versão.

O dado é o mesmo para todos os jogos, pois `GameCover` e `GameScreen` pertencem
ao shell React. Phaser emite apenas eventos tipados; não conhece APIs de
navegador, URLs sociais ou destino de compartilhamento.

## Contrato do servidor para Open Graph

Para uma rota pública como `GET /s/<token>` ou
`GET /s/<token>/game/<jogo>`, o backend deve:

1. autorizar o token antes de instruir o Nginx a servir qualquer derivada;
2. responder HTML com URL canônica HTTPS e uma das prévias permitidas;
3. incluir `og:title`, `og:type=website`, `og:description`, `og:url`,
   `og:site_name`, `og:locale=pt_BR`, `og:image`, `og:image:alt`, tipo e
   dimensões da imagem;
4. usar a arte natalina genérica aprovada quando não houver consentimento;
5. somente com consentimento específico, servir a derivada social privada e
   revogável, sem nome, telefone, id ou metadado do cliente;
6. registrar em auditoria apenas decisão, versão da prévia e data — nunca a
   foto ou o identificador pessoal em log de frontend.

`og:image` é a rota estável `GET /s/<token>/social-preview`. Ela revalida o
token e o consentimento e só então responde `X-Accel-Redirect` para um
`location internal` do Nginx. A imagem é determinística para a URL canônica.
Várias redes guardam a prévia em cache; por isso não se usa foto aleatória por
solicitação.

## Implementação atual

`apps/catalog-server` é um servidor Node pequeno, separado de `apps/play`. Ele
troca o marcador de prévia do HTML já compilado pelos metadados corretos antes
de o JavaScript do React rodar. O repositório de prévias é uma interface: a
primeira implementação lê uma configuração privada, pequena e recarregada em
cada decisão; um adaptador de banco poderá substituí-la sem mudar as rotas.

- Sem sessão válida ou com sessão revogada: `404`, sem cabeçalho interno.
- Sem consentimento ou com consentimento revogado: arte genérica aprovada.
- Com consentimento explícito ainda válido: derivada social opaca, nunca a
  foto original, entregue somente pelo `location internal` do Nginx.
- HTML e rota de imagem usam `Cache-Control: private, no-store`; uma rede
  social ainda pode conservar uma cópia que já tenha baixado.
- A auditoria recebe apenas rota, decisão, versão e data. Token, pessoa,
  arquivo, URL e foto não atravessam essa interface.

O exemplo de configuração Nginx, o arquivo de configuração sem dados reais e
a receita da arte estão em
[`apps/catalog-server`](../../apps/catalog-server/README.md).

## Validação

- Teste unitário: Web Share, cancelamento, indisponibilidade e cópia.
- Teste de interface: botão existe na capa e após vitória, tem rótulo e alvo
  de toque adequados, e não aparece em laboratório de desenvolvimento.
- Teste de servidor: resposta HTML, não JavaScript executado, contém os
  metadados obrigatórios; imagem não autorizada recebe negação; consentimento
  ativo recebe somente a URI interna esperada.
- Revisão manual: Android e iOS físicos verificam o painel nativo e a prévia
  em WhatsApp antes de liberar o domínio público.

## Referências oficiais

- [W3C — Web Share API](https://www.w3.org/TR/web-share/)
- [Open Graph protocol](https://ogp.me/)
- [Node.js — HTTP](https://nodejs.org/api/http.html)
- [Nginx — `internal`](https://nginx.org/en/docs/http/ngx_http_core_module.html#internal)
- [Nginx — `X-Accel-Redirect`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
