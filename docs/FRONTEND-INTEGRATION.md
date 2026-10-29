# Frontend → backend: revisão de integração

Worktree frontend: `C:/Users/joaof/Travessia-frontend`. O frontend não altera migrations, autenticação de servidor, OpenAPI, cliente gerado ou lockfile; autoria destes permanece com o backend conforme `docs/BACKEND-INTEGRATION.md` da worktree backend.

Revisão realizada em 28/10/2026 de `apps/api/src/contracts.ts`, `runtime.ts`, `product.service.ts` e `docs/BACKEND-INTEGRATION.md`, na branch local `feat/backend-auth` ainda em implementação. As operações propostas cobrem os fluxos de interface. Consumir tipos/cliente gerados antes de integrar; não copiar DTOs de produto à mão. Não declarar validação HTTP concluída por esta revisão.

## Acordo de proxy revisado

- `API_INTERNAL_URL`: origem fixa do projeto API, sem caminho, credenciais, query ou fragmento; HTTPS em produção, HTTP somente loopback em desenvolvimento.
- `WEB_PUBLIC_ORIGIN` no Next.js: origem pública exata; igual a `BETTER_AUTH_URL` e `TRUSTED_WEB_ORIGIN` do backend. Configuração privada, sem prefixo público.
- Navegador: `/api/auth/sign-in/email`, `/api/auth/get-session`, `/api/auth/sign-out`; produto em `/api/v1/*` encaminhado para `/v1/*`.
- Proxy preserva Cookie, Origin, método, JSON, headers de concorrência e cada Set-Cookie separadamente. Sem cache. Não aceita redirecionamento do upstream ou cookies com Domain; backend emite cookies host-only no path `/`.
- Mutações exigem JSON e Origin correspondente; autorização e vínculo continuam obrigatórios no backend. Proxy não concede acesso.
- Sem cadastro público, email real, uploads ou chamada Gemini pelo navegador.

## Pontos para verificar juntos

1. Tipos de resposta/requisição e cliente gerados disponíveis em commit backend consumível pelo frontend.
2. Publicação: `missionInput` é strict; `missionInput.parse(row.draftVersion)` precisa selecionar somente campos da entrada, pois o registro Prisma inclui IDs/metadados/relacionamentos. Revisar para não rejeitar toda publicação.
3. Entregas: selecionar pelo `versionId` publicado, não usar entrega de versão antiga como progresso atual. Preservar expectedRevision/expectedDraftVersionId em conflitos.
4. IA: rascunho manual salvável antes de solicitar geração; erro/cota/timeout preserva o editor, sem retries automáticos que dupliquem consumo.
5. API, seed e banco de teste precisam estar disponíveis para verificar login, logout, expiração, progresso, entrega, feedback, barreiras e publicação reais.

As rotas `/previa/*` são explicitamente fictícias. Não são o modo final de apresentação e não simulam persistência.
