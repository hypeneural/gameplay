# Servidor de catálogo e prévia social

Este app entrega o HTML inicial de uma sessão autorizada e insere as tags Open
Graph antes de o React carregar. Ele é separado de `apps/play`: o navegador
continua responsável pela interação, enquanto este servidor decide se um link
existe e qual imagem social pode ser entregue.

## Fluxo

```text
Robô ou família → GET /s/<token> → servidor autoriza → HTML com OG
Robô social → GET /s/<token>/social-preview → servidor revalida
Nginx interno ← X-Accel-Redirect ← derivada genérica ou consentida
```

O repositório de exemplo é um arquivo externo de configuração. Em produção ele
pode ser substituído por um adaptador de banco que cumpra a interface
`SocialPreviewRepository`, sem mudar a rota, o HTML ou o Nginx.

## Configuração do VPS

1. Gere o build de `apps/play` com `pnpm build`.
2. Copie a arte WebP aprovada para
   `/srv/christmas-games/catalog-social/evydencia-christmas-v1.webp`.
3. Copie `config/social-preview.example.json` para fora da webroot, troque os
   valores de exemplo por tokens opacos e mantenha permissões apenas do usuário
   do serviço.
4. Defina `NODE_ENV=production`, `CATALOG_PUBLIC_ORIGIN` com o domínio HTTPS
   canônico escolhido para os jogos, `CATALOG_SOCIAL_PREVIEW_FILE` com o caminho
   privado da configuração e, se necessário, `CATALOG_APPLICATION_SHELL`.
5. Inicie `pnpm --filter @christmas-games/catalog-server start` atrás do Nginx,
   usando o exemplo `nginx/catalog-social-preview.conf.example` como base.

O servidor recusa HTTP quando `NODE_ENV=production`. Ele responde sem cache
para que uma revogação seja observada em novas requisições. Redes sociais podem
manter uma cópia anterior por política própria; isso não pode ser removido pelo
cliente nem pelo React.

## Consentimento de foto

O padrão é sempre `generic`. `customer-photo` só é aceito quando o operador
registra `consent: "granted"`, uma chave de derivada opaca e uma versão de
prévia. Ao mudar o consentimento para `revoked`, a mesma rota volta a entregar
a arte genérica na próxima requisição. Não coloque no arquivo de configuração
nome de cliente, caminho físico, telefone, id interno ou URL de original.
