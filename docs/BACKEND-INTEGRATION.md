# Integração backend → frontend

Contrato desta implementação. Revisão do frontend encontrada em `C:/Users/joaof/Travessia-frontend/docs/FRONTEND-INTEGRATION.md` em 28/10/2026; o frontend revisou rotas, cookies e proxy e reservou OpenAPI/lockfile ao backend. Nenhum arquivo da worktree frontend foi alterado pelo backend.

- Auth: `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/get-session`, `/api/auth/sign-out`. Cadastro com nome, e-mail e senha na própria API. Sem recuperação por email no MVP.
- Produto: `/v1/*`. Navegador deve usar `/api/v1/*` pelo proxy Next.js. Destino fixo server-side `API_INTERNAL_URL`; preservar Cookie, Origin, Content-Type e todos os Set-Cookie separadamente. Não cachear respostas privadas. Não confiar em userId/role do navegador.
- `BETTER_AUTH_URL` é a origem pública do **frontend**, sem caminho; `TRUSTED_WEB_ORIGIN` deve ser a mesma origem exata. Cookie host-only, path `/`, HttpOnly, SameSite=Lax, Secure em produção, 7 dias. Sem cache de sessão em cookie; revogação é verificada no banco a cada requisição.
- Mutações exigem `Origin` igual à origem aprovada e JSON, inclusive quando chamadas diretamente à API. Frontend deve preservar Origin; cliente CLI usa a origem configurada. Health é público, demais recursos negam sem sessão persistida válida.
- No proxy auth, limitar e ler o corpo JSON (máximo 64 KiB) antes de encaminhar como string, com Content-Length calculado pelo cliente HTTP. Auth rejeita corpo chunked/sem comprimento; não encaminhar stream bruto.
- Contrato executável gerado das definições Zod de rotas em `apps/api/src/contracts.ts`: `npm run contracts:generate`. Tipos frontend gerados em `packages/contracts/src/api.d.ts`; não duplicar DTOs à mão. Erros de produto usam `{code,message,requestId}`; erros de autenticação são os da biblioteca Better Auth.
- Listas retornam `{items,nextCursor}`; limite 1–50. Contextos vêm de `/v1/classrooms`. Progresso/entrega são próprios, drafts de alunos não são visíveis ao professor. Missões publicadas usam versões imutáveis; editar cria novo draft e publicar exige revisão explícita.
- IA retorna rascunho privado, nunca publica. `AI_ENABLED=false` retorna 503 `AI_UNAVAILABLE`. Rascunhos do seed são identificados como `demo_fixture`.
- Arquivos: upload fica desabilitado até existir pipeline de verificação. Somente materiais textuais estão disponíveis na demo. Download de objeto exige registro `verified`, vínculo atual e URL assinada curta; objetos em quarentena não são liberados.

Resposta à revisão frontend:

1. OpenAPI e tipos gerados disponíveis nesta worktree. Tipos exportados por `@travessia/contracts/api`; frontend pode importar como `import type { operations, paths } from '@travessia/contracts/api'`. A API não altera `apps/web/lib/api.generated.ts`; o frontend pode regenerar seu cliente a partir do OpenAPI.
2. Publicação corrigida: projeta campos didáticos antes de validar o schema strict. Teste HTTP de publicação e revisão executado.
3. Entregas são por versionId; salvar exige expectedRevision e versão publicada atual. Rascunhos de missão exigem expectedDraftVersionId. O frontend deve selecionar a entrega da versão publicada.
4. Falha Gemini preserva o rascunho e revalida vínculo antes de gravar. Deduplicação é persistente; frontend não deve retentar automaticamente com nova chave.
5. Proxy frontend limita paths a `[a-zA-Z0-9_-]+`; IDs do seed foram adequados para hífens. Proxy já buffers o corpo em Uint8Array, permitindo Content-Length calculado por fetch, compatível com o handler auth limitado.

Antes de integrar em produção, testar proxy, cookies, logout e expiração na URL publicada. A revisão de código e os testes HTTP locais não comprovam essa validação publicada.
