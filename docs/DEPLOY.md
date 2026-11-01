# Execução e implantação do Travessia

O destino atual é o servidor Mais Acesso, com frontend, API e PostgreSQL em containers Linux. A configuração executável e os comandos de teste local estão em [DOCKER.md](DOCKER.md). A implantação anterior na Vercel foi descontinuada como direção do projeto.

## Arquitetura atual

Quatro serviços no compose.yaml, na mesma rede bridge: frontend Next.js standalone, API NestJS/Better Auth/Prisma PostgreSQL com volume persistente e material-worker para PDF/OCR/voz. Apenas a porta do frontend é publicada, por padrão em loopback. Frontend chama API, e API acessa o banco. Não há credenciais de banco no frontend.

As imagens usam Node 24 / Debian Bookworm. Prisma Client é gerado dentro de Linux; a imagem API inclui a CLI para executar as migrations existentes. Next.js inclui arquivos public e .next/static junto ao standalone. Os processos API/frontend executam sem root e escutam em 0.0.0.0 dentro dos containers.

## Fluxo

1. Criar a configuração privada com docker:setup e revisar o arquivo no editor.
2. Executar docker:up: build, banco saudável, migration explícita e aplicações.
3. Para demonstração isolada, executar docker:seed manualmente.
4. Testar login, vínculos, atividades, feedback, barreiras e persistência. CI Linux também executa teste real dos containers.
5. No servidor, a branch `prod` dispara `.github/workflows/deploy.yml`. O script `scripts/deploy-prod.sh` publica API e frontend; o banco isolado sobe com `scripts/provision-prod-env.sh`. O workflow repete os testes gerais e Docker e só então publica o SHA aprovado.

APP_PUBLIC_ORIGIN define a origem pública da autenticação. ALLOW_LOCAL_HTTP vale exclusivamente para localhost/loopback; no servidor, usar HTTPS e desativar essa opção. A exceção HTTP do proxy interno é limitada ao serviço exato http://api:3001 e ativada por configuração de servidor, preservando validação de origem, cookies e autorização.

Migrations e seed não executam em build, healthcheck ou na inicialização da aplicação. docker:up orquestra a migration em uma tarefa temporária antes de iniciar o conjunto. Nenhuma conta ou dado real é migrado implicitamente. A adaptação do schema de alunos/professores fica para etapa própria.

Gemini continua limitado por requisição, com revisão humana e quotas persistidas. O worker durável processa PDFs e voz local no volume privado material-data. O banco atende autenticação, missões e metadados de materiais sem Supabase; Storage permanece opcional para objetos previamente verificados.

Os documentos antigos específicos da Vercel são históricos. Sua configuração não é requisito para os containers.

## Produção no Mais Acesso

O domínio público é `https://travessia.maisacessoconecta.com.br`. O nginx do VPS encaminha esse host para `127.0.0.1:3020`, onde só o frontend escuta. A API não tem vhost: o Next fala com `http://api:3001` na rede Docker. O PostgreSQL do Travessia é um container próprio, sem porta no host, separado do Postgres compartilhado do servidor. A configuração privada fica em `.env.docker` no servidor e não entra no GitHub Actions.

O workflow só passa a existir quando estes arquivos estão na branch `prod`. Secrets necessários: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`. `DEPLOY_PATH` é opcional e o padrão é `/home/cloud/Travessia`.

## Separação de branches

A `main` é a base para testes locais e revisão. A `prod` representa produção e aciona o workflow de deploy. Uma feature integrada à `main` não deve ser considerada publicada até sua integração deliberada à `prod`.


## Promoção verificada de main para prod

A promoção preserva o histórico da prod e usa uma PR main → prod. Depois de integrar, o próprio workflow de produção reutiliza `ci.yml` e `docker.yml`: contratos, tipos, testes, build, navegador, autenticação/banco reais e quatro containers com PDF/OCR/voz. A etapa de SSH depende da aprovação dos dois jobs. `workflow_dispatch` fora de prod não publica no servidor.

O SSH faz checkout do SHA exato testado, confirmado como ancestral de origin/prod. Antes de alterar os serviços, `check-prod-capacity.sh` informa a memória disponível e o disco do Docker. Como política operacional conservadora, bloqueia com menos de 1536 MiB disponíveis ou 3072 MiB de disco livre. Esses valores são folga mínima de publicação, não garantia universal de dimensionamento. Os builds de API, frontend e worker são sequenciais para reduzir pressão de memória; a folga é conferida novamente antes das migrations.

Não executar `down -v`, limpar volumes ou recriar banco para acrescentar o worker. O Compose reutiliza postgres-data, cria/preserva material-data e acrescenta o serviço interno com limite de 1536 MiB/1 CPU. Todos os serviços precisam ficar saudáveis; banco, API e worker não podem publicar portas. O frontend permanece no loopback. O .env.docker existente é preservado e nenhum seed de demonstração é executado no servidor.

Após publicar, `npm run test:production` verifica somente por GET: HTTPS de login/cadastro, API saudável, acesso anônimo negado, sessão anônima vazia e assets JavaScript/CSS referenciados pela página. Não cria usuários nem altera dados reais. Os fluxos com contas e entregas são testados no banco isolado antes de publicar. Gemini real depende da configuração privada existente; esses testes não afirmam uma geração real com a chave do servidor.
