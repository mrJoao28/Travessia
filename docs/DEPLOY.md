# Execução e implantação do Travessia

O destino atual é o servidor Mais Acesso, com frontend, API e PostgreSQL em containers Linux. A configuração executável e os comandos de teste local estão em [DOCKER.md](DOCKER.md). A implantação anterior na Vercel foi descontinuada como direção do projeto.

## Arquitetura atual

Três serviços no compose.yaml, na mesma rede bridge: frontend Next.js standalone, API NestJS/Better Auth/Prisma e PostgreSQL com volume persistente. Apenas a porta do frontend é publicada, por padrão em loopback. Frontend chama API, e API acessa o banco. Não há credenciais de banco no frontend.

As imagens usam Node 24 / Debian Bookworm. Prisma Client é gerado dentro de Linux; a imagem API inclui a CLI para executar as migrations existentes. Next.js inclui arquivos public e .next/static junto ao standalone. Os processos API/frontend executam sem root e escutam em 0.0.0.0 dentro dos containers.

## Fluxo

1. Criar a configuração privada com docker:setup e revisar o arquivo no editor.
2. Executar docker:up: build, banco saudável, migration explícita e aplicações.
3. Para demonstração isolada, executar docker:seed manualmente.
4. Testar login, vínculos, atividades, feedback, barreiras e persistência. CI Linux também executa teste real dos containers.
5. No servidor, a branch `prod` dispara `.github/workflows/deploy.yml`. O script `scripts/deploy-prod.sh` publica API e frontend; o banco isolado sobe com `scripts/provision-prod-env.sh`.

APP_PUBLIC_ORIGIN define a origem pública da autenticação. ALLOW_LOCAL_HTTP vale exclusivamente para localhost/loopback; no servidor, usar HTTPS e desativar essa opção. A exceção HTTP do proxy interno é limitada ao serviço exato http://api:3001 e ativada por configuração de servidor, preservando validação de origem, cookies e autorização.

Migrations e seed não executam em build, healthcheck ou na inicialização da aplicação. docker:up orquestra a migration em uma tarefa temporária antes de iniciar o conjunto. Nenhuma conta ou dado real é migrado implicitamente. A adaptação do schema de alunos/professores fica para etapa própria.

Gemini continua limitado por requisição, com revisão humana e quotas persistidas. Não há worker durável novo nesta etapa. Uploads continuam desativados. O banco local atende autenticação e materiais textuais sem Supabase; Storage permanece opcional para objetos previamente verificados.

Os documentos antigos específicos da Vercel são históricos. Sua configuração não é requisito para os containers.

## Produção no Mais Acesso

O domínio público é `https://travessia.maisacessoconecta.com.br`. O nginx do VPS encaminha esse host para `127.0.0.1:3020`, onde só o frontend escuta. A API não tem vhost: o Next fala com `http://api:3001` na rede Docker. O PostgreSQL do Travessia é um container próprio, sem porta no host, separado do Postgres compartilhado do servidor. A configuração privada fica em `.env.docker` no servidor e não entra no GitHub Actions.

O workflow só passa a existir quando estes arquivos estão na branch `prod`. Secrets necessários: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. `DEPLOY_PATH` é opcional e o padrão é `/home/cloud/Travessia`.
