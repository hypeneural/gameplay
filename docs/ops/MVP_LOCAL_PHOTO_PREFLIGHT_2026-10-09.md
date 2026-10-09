# MVP local: inspecionar sessão real sem publicar fotos

**Estado:** PR operacional de pré-flight, sem API de upload e sem dados de cliente no Git. Data: 2026-10-09. Repositório `hypeneural/gameplay`. PRs dependentes #7 (galeria), #8 (Contabo), #9 (manifesto), #10 (OpenAPI/SQL), #11 (SQLite), #12 (hardening). **A API real de publicação ainda não foi conectada a `CatalogServer.ts`, `main.ts` e `runtimeConfig.ts`**. `deploy/readiness.json` preserva `pilotReady=false` e `customerDataAllowed=false`.

## Diagnóstico verificado

- `CatalogServer.ts`: recebe somente `GET` e `HEAD`; qualquer POST/PUT devolve 405. Não existem handlers HTTP para `/internal/v1/publications`, `/s/{token}/data` ou media privados. Não tentar upload no hostname público.
- `SessionRepository.ts` do PR #12 tem SQLite, A1/A2, CAS, token HMAC e blobs READY, porém **`storageConfirmed: true` é um valor fornecido por código chamador**, não prova de que bytes WebP chegaram; o Corte 2 deve garantir essa prova dentro de um serviço storage privado, antes de chamar o repositório.
- `tools/media-pipeline/src/sourceFilter.ts` seleciona apenas arquivos JPEG/PNG/WebP na raiz imediata, ignora nomes iniciados com Calendário/Globo e subpastas. **Chaveiro não está excluído na regra vigente**; discutir com o operador se também deve ser omitido da galeria (é diferente da regra de entrega BAIXA).
- `tools/media-pipeline/src/prepareLocal.ts` já reutiliza Node/Sharp, gera derivados em diretório privado e falha se algum item não for processado. Não criar segundo pipeline de fotografias.
- O preflight adicionado neste PR verifica **candidatos e assinatura inicial** de JPEG/PNG/WebP, sem decodificação completa, transformação ou upload. O comando opcional `--check-health` faz apenas `GET https://jogos.fotosdenatal.com/healthz` e exige estágio `staging-demo`. Resposta 200 significa saúde do staging, **não** disponibilidade da API privada.

## Passo a passo Antigravity no Windows (sem copiar dados ao Git)

1. Iniciar em `C:\Users\...\Desktop\games` (ou checkout local correto). `git status --porcelain`, `git branch --show-current`, `git log -1 --oneline`. Buscar os PRs #11/#12 e este PR antes de alterar código; não executar `git checkout -- .` nem apagar modificações não conhecidas.
2. Confirmar que a pasta solicitada do ensaio existe na unidade `L:\` e está acessível como pasta normal. **Não imprimir o caminho, nome do cliente, telefone ou foto nos logs compartilhados**. Não copiar fotos para o repositório.
3. Criar pasta privada de diagnóstico FORA do checkout e da origem, por exemplo `C:\ProgramData\Evydencia\photo-publish\logs`; restringir ACL ao operador. Nunca salvar logs em pasta pública.
4. Rodar o script de pré-flight usando os argumentos reais do operador (aqui usamos placeholders deliberadamente):

```powershell
pnpm media:preflight --source "<CAMINHO_COMPLETO_DA_SESSAO_EM_L>" --check-health --log-file "<LOG_PRIVADO_FORA_DO_GIT>.jsonl"
```

Retorno `0` = apenas arquivos candidatos verificados por cabeçalho; `1` = candidato inválido, pasta vazia, limite de 200 ou health indisponível; `2` = argumento/log incorreto. Logs JSONL trazem `runId` por execução e `index`, extensão, tamanho agregado, contadores e razões; **não** trazem nomes originais, caminho de pasta, telefone, pedido, token, URL privada ou segredo.

5. Conferir se `eligible > 0`, `invalid === 0`, `ignoredSubdirectories` esperado, `ignoredByPrefix` coerente e número final de fotografias confirmado pelo operador. Revisar arquivos que não entram na galeria, incluindo Chaveiro e outras categorias especiais. O script só lê os cabeçalhos; também precisa validar decodificação completa antes do envio.
6. Preparar o Gallery Lab no armazenamento **privado e externo ao repositório** com `pnpm media:prepare-local --source "<CAMINHO_DA_SESSAO>" --storage "<LOCAL_PRIVADO_DERIVADOS>" --concurrency 2`. Verificar `--help`/sintaxe real da CLI antes; testar sempre em local sem clientes externos. O conteúdo original é somente lido, nunca movido ou alterado.
7. Validar quantidades de `thumb/card/game`, hashes SHA-256, retratos/paisagens, jogos, lightbox e feed vertical. Abrir a galeria local (Gallery Lab) antes de tentar upload.
8. Para testes HTTP do Corte 2, usar **dados sintéticos primeiro** e serviço local privado. Confirmar `pnpm check`, build, migrations, auth de publisher, limites, write temp + rename, storage READY, CAS, A/B, health, logs e backup/restore. Testar 401/403, 404, 409, 413, 422, 429, 500, timeout/retry. O código atual de staging não tem API real; status de `/healthz` não é um smoke de upload.
9. Só depois que `/internal/v1` estiver implementado em rede privada, consultar status no ambiente aprovado e testar upload binário sintético. Não enviar fotos reais ao staging-demo, não alterar readiness por conveniência, não abrir porta pública nem chamar endpoints fictícios. Solicitar aprovação do operador antes do primeiro envio real.

## Modelo de logs obrigatórios para o CORTE 2

Os logs operacionais podem ser detalhados **sem conter PII ou capabilities**. Eventos JSONL em todos os hops: `publish.request`, `session.resolved`, `revision.staged`, `blob.received`, `blob.verified`, `blob.committed`, `revision.activated`, `revision.rejected`, `storage.cleanup`, `backup.verified`, `http.request.completed`.

Campos aceitos em log: `at` UTC ISO, `runId` (UUID gerado na origem), `requestId` de correlação **gerado pelo servidor** e exposto em `X-Request-ID` quando seguro, `event`, `phase`, `result`, `code`, `httpStatus`, `durationMs`, `bytesIn`, `bytesOut`, `variant`, `photoIndex`, `attempt`, `retryable`, `queueDepth`, `expectedBlobs`, `readyBlobs` e `releaseSha`. Para um mesmo pedido, correlacionar pelo `runId`, nunca pelo nome, telefone ou número bruto; usar identificadores internos pseudonimizados com chave operacional e retenção limitada caso necessário.

**NUNCA logar:** token de galeria, cabeçalho Authorization, HMAC, path/filename original, UUIDs privados de acesso, número de telefone, nome completo, URLs com `/s/{token}`, payload bruto ou EXIF. O log da borda Caddy também precisa de mascaramento: desligar Nginx access_log não é suficiente. Evitar incluir stack traces com caminhos pessoais em logs compartilhados.

### Exemplos de eventos esperados

```json
{"at":"2026-10-09T10:00:00.000Z","runId":"11111111-1111-4111-8111-111111111111","event":"blob.verified","result":"pass","photoIndex":1,"variant":"card","bytesIn":188456,"durationMs":24}
{"at":"2026-10-09T10:00:01.000Z","runId":"11111111-1111-4111-8111-111111111111","event":"revision.rejected","result":"blocked","code":"UPLOAD_INCOMPLETE","expectedBlobs":90,"readyBlobs":89}
```

Mapeamento de API: [MVP Point Graph](../integrations/photo-sessions/MVP_POINT_GRAPH_APIS_DB_2026-10-08.md); [OpenAPI](../contracts/mvp-photo-publication-v1.openapi.json). A diferença entre teste sintético e a sessão real deve ficar explícita no walkthrough.

## Portão de passagem sem burocracia

O MVP não precisa de Redis, PostgreSQL, chunks, segundo backend, novos assets ou outro workflow Python. Para habilitar o primeiro upload real, precisa **exatamente** de: (a) API private implementada, (b) autenticação de publisher, (c) gravação/validação real dos bytes WebP, (d) sessions/read endpoints privados, (e) logs redigidos e backup/restore, (f) flags de readiness aprovadas e autorização explícita. Python/EvydFlow e disparos WhatsApp são etapas posteriores.

## Referências oficiais

- [Node.js File System](https://nodejs.org/download/release/latest-v24.x/docs/api/fs.html)
- [Node.js HTTP timeouts](https://nodejs.org/download/release/latest-v24.x/docs/api/http.html)
- [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Nginx internal](https://nginx.org/en/docs/http/ngx_http_core_module.html)
