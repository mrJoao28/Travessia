# Deploy do MVP na Vercel

Configuração executável do backend e passos de banco/seed em [BACKEND-OPERATIONS.md](BACKEND-OPERATIONS.md). Contrato do proxy/cookies em [BACKEND-INTEGRATION.md](BACKEND-INTEGRATION.md). O backend está preparado para deploy; publicação e teste do proxy na URL final dependem de infraestrutura/variáveis privadas e integração frontend.

## Decisão atual

Dois projetos Vercel no mesmo repositório: frontend Next.js com raiz apps/web e backend NestJS com raiz apps/api. Reutilizar workspaces/lockfile da raiz conforme configuração de monorepo. Supabase fornece PostgreSQL e Storage privado. Auth do MVP: Better Auth com sessões no PostgreSQL. Essa decisão substitui a proposta anterior de Supabase Auth.

Vercel suporta NestJS com entrypoint reconhecido e chamadas app.listen; confirmar configuração atual antes de publicar: https://vercel.com/docs/frameworks/backend/nestjs e https://vercel.com/kb/guide/ship-a-nestjs-app-on-vercel . Todos os limites de Functions se aplicam. Não prever worker persistente, disco durável ou Map de sessão/rate limit como armazenamento confiável.

## Rotas e sessão

Navegador usa mesma origem do frontend. Encaminhar /api/auth/* para /api/auth/* do backend e /api/v1/* para /v1/*, com destino obtido exclusivamente de API_INTERNAL_URL server-side. Preservar headers/cookies/Set-Cookie e sem aceitar proxy para URL arbitrária. Frontend/backend combinam baseURL pública do auth, cookie path e estratégia de proxy antes da implementação. Autorização também acontece no backend; proxy não concede acesso.

Preferir cookies host-only, HttpOnly, Secure e política SameSite compatível com fluxo; checar origem e proteção CSRF. Não emitir cookies para domínio interno do backend quando o navegador usa frontend. Verificar o fluxo completo na URL Vercel. Previews usam ambiente de dados isolado e origens aprovadas explicitamente; nunca wildcard amplo para permitir cookies.

## Variáveis

| Aplicação | Variáveis privadas |
|---|---|
| Frontend | API_INTERNAL_URL e configurações server-side de proxy |
| Backend | DATABASE_URL, DIRECT_URL conforme estratégia de migração, SUPABASE_URL, credencial de Storage server-side quando necessária |
| Backend auth | BETTER_AUTH_SECRET, BETTER_AUTH_URL (origem pública), TRUSTED_WEB_ORIGIN |
| Backend Gemini | GEMINI_API_KEY, GEMINI_MODEL, AI_ENABLED |
| Seed/demo | DEMO_MODE, DEMO_ONLY, DEMO_USER_NAME, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, DEMO_USER_COURSE |

Nenhum segredo usa NEXT_PUBLIC_. Os arquivos .env.example só descrevem nomes, não contêm valores de acesso. Biblioteca auth: https://better-auth.com/docs/reference/options e https://better-auth.com/docs/integrations/nestjs . Configurar exceção de senha curta somente na demo isolada com signup desabilitado; política forte fora desse contexto.

## Gemini serverless

Primeira versão gera rascunhos dentro de uma requisição com entrada pequena, limite de saída e timeout controlado inferior ao orçamento da função. Estado persistido no banco e proteção contra repetição. Não prometer execução durável após retornar resposta. Processamento longo exige solução durável adicional em fase posterior; pg-boss/worker contínuo não faz parte do MVP hospedado integralmente na Vercel.

## Publicação

1. Configurar banco/Storage isolados para demonstração e segredos privados.
2. Aplicar migrations por comando controlado; não em cold start ou a cada build.
3. Executar seed manual/idempotente no ambiente correto.
4. Importar os dois projetos Vercel e conferir dependências externas ao root de cada app.
5. Configurar URLs, cookies, proxy e origens finais.
6. Verificar health, login/logout, permissões, conta/seed, arquivos e geração/revisão.
7. Conferir builds, teclado/zoom, ausência de segredos em bundles e registros. Documentar URLs publicadas e limitações.

O usuário pediu preparação/lançamento na Vercel; esta fundação ainda não foi publicada e nenhuma conta foi semeada. Planos, limites e custos precisam ser conferidos na implantação. Não garantir operação ilimitada ou gratuita.
