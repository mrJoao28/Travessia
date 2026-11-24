# Operação do backend

O backend atual é NestJS com Better Auth, Prisma e PostgreSQL. Em produção, API e banco rodam em containers Docker no servidor Mais Acesso; o worker de materiais é um container separado. A Cloudflare atende o domínio público na borda. Consulte [DEPLOY.md](DEPLOY.md) para publicação e [DOCKER.md](DOCKER.md) para execução e configuração.

## Desenvolvimento local

O modo recomendado é executar o conjunto completo com Docker:

```sh
npm run docker:setup
npm run docker:up
npm run docker:seed
```

O seed é opcional e deve ser usado somente em banco local dedicado a dados fictícios. Para detalhes, consulte [DEMO.md](DEMO.md).

Para executar a suíte HTTP da API:

```sh
npm run test:api
```

Ela usa um PostgreSQL temporário local e não deve ser apontada para banco de produção. Verificações gerais:

```sh
npm ci
npm run check
npm run build
```

## Configuração privada

Use `.env.docker.example` como referência e `npm run docker:setup` para criar `.env.docker`. O arquivo real é ignorado pelo Git. Senhas, URLs privadas, segredos de Better Auth e chave Gemini não devem ser versionados, passados em argumentos de shell ou copiados para logs.

Em produção, o arquivo `.env.docker` fica somente no servidor. GitHub Actions acessa o servidor com `DEPLOY_HOST`, `DEPLOY_USER` e `DEPLOY_SSH_KEY`; `DEPLOY_PATH` é opcional. Os valores são configurados nos secrets do repositório, não neste arquivo.

## Banco e alterações

Migrations são aplicadas pela tarefa controlada do deploy, antes de iniciar as novas versões dos serviços. Não execute seed de demonstração em produção e não remova volumes Docker para atualizar o código. Alterações de schema precisam incluir migration e passar pelos testes de integração antes de serem promovidas para `prod`.

## Histórico

As instruções anteriores de Vercel, Supabase como banco principal e deploy serverless foram substituídas. Os arquivos `apps/api/vercel.json` e `apps/web/vercel.json` são configuração legada; o deploy vigente é o workflow Docker/SSH descrito em [DEPLOY.md](DEPLOY.md).
