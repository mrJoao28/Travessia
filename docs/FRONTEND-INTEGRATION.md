# Frontend → backend: revisão de integração

Worktree frontend: `C:/Users/joaof/Travessia-frontend`. O frontend não altera migrations, autenticação de servidor, OpenAPI, cliente gerado ou lockfile; autoria destes permanece com o backend conforme `docs/BACKEND-INTEGRATION.md` da worktree backend.

Revisão realizada em 28/10/2026 de `apps/api/src/contracts.ts`, `runtime.ts`, `product.service.ts` e `docs/BACKEND-INTEGRATION.md`, na branch local `feat/backend-auth` ainda em implementação. As operações propostas cobrem os fluxos de interface. Consumir tipos/cliente gerados antes de integrar; não copiar DTOs de produto à mão. Não declarar validação HTTP concluída por esta revisão.

## Acordo de proxy revisado

- `API_INTERNAL_URL`: origem fixa do projeto API, sem caminho, credenciais, query ou fragmento; HTTPS em produção, HTTP somente loopback em desenvolvimento.
- `WEB_PUBLIC_ORIGIN` no Next.js: origem pública exata; igual a `BETTER_AUTH_URL` e `TRUSTED_WEB_ORIGIN` do backend. Configuração privada, sem prefixo público.
- Navegador: `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/get-session`, `/api/auth/sign-out`; produto em `/api/v1/*` encaminhado para `/v1/*`.
- Proxy preserva Cookie, Origin, método, JSON, headers de concorrência e cada Set-Cookie separadamente. Sem cache. Não aceita redirecionamento do upstream ou cookies com Domain; backend emite cookies host-only no path `/`.
- Mutações exigem JSON e Origin correspondente; autorização e vínculo continuam obrigatórios no backend. Proxy não concede acesso.
- Cadastro e login pelo navegador, na API da plataforma. Sem email real de recuperação, uploads ou chamada Gemini pelo navegador.

## Pontos para verificar juntos

1. Tipos de resposta/requisição e cliente gerados disponíveis em commit backend consumível pelo frontend.
2. Publicação: `missionInput` é strict. A seleção explícita dos campos da entrada já foi observada na atualização do backend; confirmar por teste HTTP/browser para não rejeitar registros Prisma com IDs/metadados.
3. Entregas: selecionar pelo `versionId` publicado, não usar entrega de versão antiga como progresso atual. Preservar expectedRevision/expectedDraftVersionId em conflitos.
4. IA: rascunho manual salvável antes de solicitar geração; erro/cota/timeout preserva o editor, sem retries automáticos que dupliquem consumo.
5. API, seed e banco de teste precisam estar disponíveis para verificar login, logout, expiração, progresso, entrega, feedback, barreiras e publicação reais.

As rotas `/previa/*` são explicitamente fictícias. Não são o modo final de apresentação e não simulam persistência.

## Integração do merge

O merge `8ae969d` da main foi integrado sem conflitos na branch `feat/learning-workspaces-ui`. O adaptador web foi regenerado a partir do OpenAPI implementado e passou a importar DTOs oficiais de `@travessia/contracts/api`; o snapshot provisório de DTOs foi removido. A autoria do contrato/lockfile continua sendo do backend. A validação HTTP relatada pelo backend inclui a função de proxy do frontend; a validação em navegador/Next.js é executada separadamente pelo runner isolado.
