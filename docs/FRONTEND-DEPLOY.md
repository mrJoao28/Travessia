# Frontend na Vercel

Next.js/TypeScript no workspace `apps/web`. O backend é outro projeto, conforme `DEPLOY.md`. A preparação local não comprova publicação nem validação de sessão na URL final.

## Configuração do projeto

- Repositório `mrJoao28/Travessia`, branch integrada por PR.
- Framework Next.js, Root Directory `apps/web`, Node.js 24.x.
- `apps/web/vercel.json` fixa framework, instalação pelo lockfile da raiz e build do workspace; o Root Directory continua sendo uma configuração do projeto Vercel.
- Habilitar acesso aos arquivos externos ao Root Directory para os workspaces. O tracing aponta para a raiz do monorepo.
- Install Command: `npm ci --prefix ../..` (usa o lockfile da raiz).
- Build Command: `npm run build` (no diretório `apps/web`). Output Directory: `.next`, padrão do framework.
- Nunca usar exportação estática: o proxy precisa de Route Handlers Node.js.

Variáveis privadas do projeto frontend, sem valores versionados:

| Nome | Conteúdo |
|---|---|
| API_INTERNAL_URL | Origem HTTPS do projeto API, sem caminhos, credenciais, query ou fragmento |
| WEB_PUBLIC_ORIGIN | Origem HTTPS exata do frontend |

No backend, `BETTER_AUTH_URL` e `TRUSTED_WEB_ORIGIN` devem ser essa mesma origem pública. Não apontar a URL de auth para o domínio interno. Cookies host-only, path `/`, HttpOnly, Secure em produção, SameSite conforme backend. Previews exigem origem explicitamente aprovada e banco isolado; não configurar wildcard para cookies.

## Rotas

- `/login`: formulário sem credenciais embutidas, colagem e gerenciador de senhas permitidos.
- `/aluno`, `/aluno/turmas`, `/aluno/entregas`, `/aluno/feedback`, `/aluno/barreiras`, `/aluno/missoes/[id]`: dados reais da API, sem fallback fictício.
- `/professor`, `/professor/missoes`, `/professor/entregas`, `/professor/barreiras`, `/professor/missoes/[id]/editar`: contexto docente autorizado pelo backend.
- `/previa/aluno` e `/previa/professor`: prévias de interface explícitas, sem autenticação ou persistência; não são o modo final de apresentação. Metadados noindex.
- `/api/auth/*`: apenas sign-in/email, get-session e sign-out, encaminhados ao backend.
- `/api/v1/*`: encaminhados para `/v1/*`, destino fixo server-side. Corpo máximo 64 KiB, JSON, timeout de 30s, orçamento de função de 45s, sem cache. Uploads não são suportados.

## Contrato e verificação

Os DTOs vêm dos tipos oficiais `@travessia/contracts/api`, gerados pelo backend. `apps/web/lib/api.generated.ts` contém apenas o adaptador tipado e os caminhos gerados do OpenAPI implementado. O snapshot provisório foi removido após integrar a main `8ae969d`. Gerar novamente quando o contrato mudar:

```
node apps/web/scripts/generate-api.mjs
npm ci
npm run check
npm run build
npx playwright test
node --test apps/web/tests/proxy.test.mjs
```

A geração não acontece no build nem acessa banco. O adaptador web mantém os caminhos do contrato e importa seus DTOs oficiais; CI verifica drift. Não alterar o OpenAPI para declarar endpoints que não foram implementados.

Na URL publicada, verificar health, login/logout, Set-Cookie e expiração; isolamento de turmas; rascunho persistido após recarregar; entrega e feedback; preferências da conta; barreira privada ausente da visão docente; resposta ao relato compartilhado; edição, revisão e publicação; Gemini desativado e, se autorizado, geração real. Não executar seed/migrations no build. Não registrar senha, email pessoal, tokens ou corpos privados.

Executar roteiro de teclado e leitor de tela, 320px, texto 200%, zoom 400%, espaçamento, contraste e axe. Registrar resultados e limitações em `FRONTEND-VALIDATION.md`; testes automáticos não demonstram conformidade WCAG completa.

Referências consultadas: [monorepos Vercel](https://vercel.com/docs/monorepos), [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Route Handlers Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route).
