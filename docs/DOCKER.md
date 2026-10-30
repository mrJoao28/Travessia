# Travessia em Docker

Três containers permanentes: `frontend` (Next.js), `api` (NestJS/Better Auth/Prisma) e `db` (PostgreSQL 17). Compartilham a rede bridge `travessia`. Apenas o frontend publica porta, por padrão em `127.0.0.1:3000`. O Next acessa `http://api:3001`; a API acessa `db:5432`. Segredos do banco, autenticação e Gemini ficam fora do frontend.

## Primeiro teste local — Windows, macOS ou Linux

Requisitos: Git, Node.js 24 e Docker com Compose v2. No Windows, iniciar Docker Desktop em modo Linux containers/WSL2. Executar na raiz do repositório. Não é necessário instalar PostgreSQL, Prisma nem executar `npm ci` no computador para usar estes comandos: as dependências são instaladas nas imagens.

```sh
npm run docker:setup
npm run docker:up
npm run docker:seed
```

1. `docker:setup` cria `.env.docker` com senha do PostgreSQL, segredo de autenticação e senha de demonstração aleatórios. Não imprime valores nem sobrescreve arquivo existente.
2. Abra `.env.docker` no seu editor para consultar `DEMO_USER_EMAIL` e `DEMO_USER_PASSWORD` ou definir suas próprias credenciais antes do primeiro seed. O padrão de email é fictício (`demo@example.invalid`); nenhum email é enviado.
3. `docker:up` constrói imagens, aguarda o banco saudável, executa `prisma migrate deploy` em um container temporário da imagem API e inicia os três serviços. Não executa seed.
4. `docker:seed` executa explicitamente o dataset de demonstração pela imagem API e encerra esse container temporário. Exige `DEMO_MODE=true` e `DEMO_ONLY=true`, além de banco dedicado. Reexecução preserva progresso e não redefine senha.
5. Abra http://localhost:3000 e entre com as credenciais do arquivo. O dataset contém três turmas como aluno e uma oficina como professor. IA permanece desativada.

O processo da aplicação não aplica migrations nem cria contas ao iniciar; rebuild e healthcheck também não fazem isso. Os containers temporários de migration/seed são removidos ao terminar. Nenhum quarto serviço permanente é necessário.

## Comandos

| Comando | Uso |
|---|---|
| `npm run docker:build` | Construir/reconstruir as duas imagens |
| `npm run docker:db` | Iniciar apenas o banco e aguardar saúde |
| `npm run docker:migrate` | Aplicar migrations; banco precisa estar iniciado |
| `npm run docker:up` | Build, banco, migration e aplicações |
| `npm run docker:seed` | Preparar explicitamente o dataset fictício |
| `npm run docker:start` | Iniciar imagens já construídas, sem migrar novamente |
| `npm run docker:down` | Parar/remover containers e rede, preservando o volume |
| `npm run docker:logs` | Consultar as últimas linhas dos serviços |
| `node scripts/docker-compose.mjs ps` | Verificar os três serviços e saúde |
| `npm run docker:smoke` | Testar uma demonstração local; modifica rascunho/preferência fictícios |

Os comandos npm usam scripts/docker-compose.mjs para carregar o arquivo privado e impedir que um DATABASE_URL não relacionado do terminal substitua a conexão escolhida. Para comandos Compose adicionais, usar `node scripts/docker-compose.mjs <comando>`; assim a seleção de ambiente permanece consistente.

O volume `postgres-data` mantém os dados entre recriações. O comando normal `docker:down` não remove volumes. Alterar `COMPOSE_PROJECT_NAME` faz o Compose usar outro conjunto de recursos e outro volume. O nome padrão do projeto é `travessia`.

O smoke é restrito a localhost/loopback, recusa demonstração desativada e não deve ser usado em dados de estudantes. Verifica os containers reais, rede, portas, usuário sem root, ausência de segredos no frontend, artes/imagem otimizada, login/logout, sessão, origem/CSRF, vínculos, relato privado e salvamento/retomada. Não usa respostas simuladas. Para provar persistência com os mesmos dados de teste:

```sh
npm run docker:smoke
npm run docker:down
npm run docker:start
node scripts/docker-smoke.mjs --verify-persistence
```

## Configuração

`.env.docker` é ignorado por Git e excluído do contexto Docker. Nunca colocá-lo em commit, imagem, artefato de CI ou chat. `.env.docker.example` contém somente nomes e placeholders. `node scripts/docker-compose.mjs config --quiet` valida a configuração sem imprimir o ambiente expandido.

| Variável | Significado |
|---|---|
| `APP_PUBLIC_ORIGIN` | Origem pública exata, sem caminho/barra final. Local: `http://localhost:3000` |
| `WEB_BIND_ADDRESS` / `WEB_PORT` | Interface/porta do host para o frontend; padrão `127.0.0.1` / `3000` |
| `ALLOW_LOCAL_HTTP` | Exceção explícita somente para origens HTTP localhost/loopback; domínios públicos exigem HTTPS |
| `POSTGRES_USER` / `POSTGRES_DB` / `POSTGRES_PASSWORD` | Banco dedicado no container |
| `DATABASE_URL` | URL Prisma interna, com `db:5432` e `schema=travessia`; DIRECT_URL recebe o mesmo valor |
| `BETTER_AUTH_SECRET` | Segredo aleatório com pelo menos 32 caracteres |
| `DEMO_MODE` / `DEMO_ONLY` | Ambos true somente para demonstração isolada |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | Usados apenas pelo comando de seed; não permanecem no ambiente da API normal |
| `AI_ENABLED` / `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini opcional somente na API |
| `SUPABASE_URL` / `SUPABASE_STORAGE_SECRET` | Opcionais para download de objetos já verificados; uploads novos continuam desativados |

Ao trocar usuário, banco ou senha do PostgreSQL, atualizar também DATABASE_URL (usuário/senha codificados como componentes de URL). O script inicial gera valores compatíveis. Alterar a senha no arquivo não altera automaticamente uma senha já gravada no volume PostgreSQL; a rotação do banco existente é uma operação separada.

Para trocar a porta local, editar `WEB_PORT` e a porta de `APP_PUBLIC_ORIGIN` juntos; executar `docker:up` novamente. A API recebe a origem pública através de BETTER_AUTH_URL/TRUSTED_WEB_ORIGIN, e o frontend através de WEB_PUBLIC_ORIGIN. Não colocar `api:3001` na URL pública de autenticação.

## Servidor Mais Acesso

As mesmas imagens executam em Linux sem depender da Vercel. A conexão ao proxy/pipeline do servidor é etapa de integração da equipe; este repositório não presume domínio, SSH ou registry particulares.

- Usar `APP_PUBLIC_ORIGIN=https://dominio-aprovado`, `ALLOW_LOCAL_HTTP=false` e segredo exclusivo do ambiente. Cookies ficam HttpOnly, SameSite=Lax e Secure em HTTPS. O opt-in de localhost não libera HTTP de domínio público.
- Se o proxy estiver no host, ele pode encaminhar HTTPS para a porta loopback do frontend. Se o proxy estiver em outro container, a equipe deve conectá-lo à rede apropriada e usar `frontend:3000`; não resolver isso expondo PostgreSQL/API publicamente.
- Em banco com dados reais, `DEMO_MODE=false` e `DEMO_ONLY=false`; não executar seed de demonstração. Provisionamento de contas reais e adaptação dos perfis aluno/professor são tarefas próprias.
- `.env.docker` não entra no build. As imagens não recebem secrets como build arguments. O servidor recebe configuração privada apenas em runtime.
- Migrations usam `docker:migrate` em etapa controlada. As aplicações executam como usuário `node`, com init e encerramento gracioso. Health da API é de aplicação; o teste de integração verifica também acesso real ao banco após migrations.
- O volume pertence ao ambiente; backup e restauração devem ser definidos pela equipe antes de dados reais. Esta entrega valida persistência entre recriações, sem alegar recuperação de backup já testada.

Não há mudança de schema ou importação do banco anterior. PostgreSQL local e Better Auth atendem ao fluxo textual sem exigir Supabase. Storage privado/Gemini continuam opcionais e requerem sua configuração caso sejam utilizados.

## CI Linux

`.github/workflows/docker.yml` usa runner Ubuntu com Docker Compose e cria configuração aleatória, sem credenciais pessoais. Constrói ambas as imagens, aplica migrations, cria o dataset fictício, sobe os três containers, testa o fluxo real e recria todos preservando o volume para revalidar os dados. No fim remove apenas os recursos efêmeros do projeto daquele job. Não publica imagens nem faz deploy no servidor.

Referências: [Compose networking](https://docs.docker.com/compose/how-tos/networking/), [startup order](https://docs.docker.com/compose/how-tos/startup-order/), [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Prisma migrate deploy v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).
