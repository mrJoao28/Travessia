# Backend do MVP

Implementação na worktree `Travessia-backend`. Contrato de integração e revisão frontend pendente em [BACKEND-INTEGRATION.md](BACKEND-INTEGRATION.md). OpenAPI gerado em `packages/contracts/openapi.json`; tipos em `packages/contracts/src/api.d.ts`.

## Preparar

Node 24, `npm ci`, `npm run check`, `npm run build`. `npm run test:api` inicia PostgreSQL nativo temporário em loopback e porta disponível, aplica as migrations reais e executa testes HTTP com Better Auth real. O provedor Gemini é substituído somente nessa suíte; os testes não comprovam chamada real ao Gemini, Storage ou Vercel. Requer binários opcionais do `embedded-postgres`. Dados fictícios de teste permanecem no diretório ignorado `.test-db` para inspeção; servidor é encerrado ao terminar. Nunca apontar essa suíte para banco real.

Copiar os **nomes**, sem publicar os valores, para o ambiente privado do backend:

| Variável | Uso |
|---|---|
| DATABASE_URL | PostgreSQL pool serverless Supabase, schema privado `travessia`; limite de conexões por instância (por exemplo parâmetros `connection_limit=3&pool_timeout=10`, conforme pool escolhido) |
| DIRECT_URL | Conexão para migrations, mesmo banco/schema; pode usar session pool conforme conectividade |
| BETTER_AUTH_SECRET | Pelo menos 32 caracteres aleatórios, gerado criptograficamente, exclusivo do ambiente |
| BETTER_AUTH_URL | Origem pública exata do frontend, sem barra final/caminho |
| TRUSTED_WEB_ORIGIN | Mesma origem exata; não aceita wildcard |
| AI_ENABLED | `false` por padrão; fluxos manuais continuam disponíveis |
| GEMINI_API_KEY / GEMINI_MODEL | Apenas backend; modelo estável explicitamente configurado quando IA ativa |
| GEMINI_PUBLIC_USE_APPROVED | Exige `true` fora da demo antes de IA ativa, após revisão de termos/público |
| SUPABASE_URL / SUPABASE_STORAGE_SECRET | Opcional enquanto arquivos permanecem desativados; credencial exclusivamente server-side |
| DEMO_MODE / DEMO_ONLY | Ambos `true` somente em ambiente com dados fictícios |
| DEMO_DATABASE_NAME | Nome exato do banco dedicado, validado contra DATABASE_URL pelo seed |
| DEMO_USER_EMAIL / DEMO_USER_PASSWORD | Escolhidos pelo usuário, lidos apenas do ambiente privado pelo seed |
| PORT / API_PORT | Porta do servidor; PORT prevalece |

`DEMO_USER_NAME` e `DEMO_USER_COURSE` da proposta não são necessários: o seed usa o nome e curso solicitados, Joao Felipe e Engenharia da Computação. Não existe `.env` carregado implicitamente nem conteúdo privado nos exemplos. Injetar o ambiente via plataforma ou mecanismo privado do terminal. Nunca passar senha como argumento CLI, versioná-la ou imprimi-la.

## Banco e seed

1. Criar projeto Supabase **dedicado à demo**, sem dados reais, com schema `travessia` fora dos schemas expostos pela Data API. Configurar ambas as conexões com o mesmo schema. Não usar a URL da Data API como DATABASE_URL.
2. Executar `npm run db:migrate` em rotina controlada. Não faz parte do build/cold start. Migration habilita RLS sem políticas públicas e revoga acesso de PUBLIC/anon/authenticated às tabelas da aplicação. A conexão da API deve ter acesso de servidor, não ser a chave anon. Autorização continua explícita na API.
3. Definir os indicadores de isolamento, nome do banco e credenciais em ambiente privado. Executar `npm run db:seed:demo` manualmente. O seed recusa contas fora de seu namespace/dataset. PostgreSQL advisory lock serializa execuções concorrentes.
4. Reexecução preserva identidade, hash da senha, preferências, vínculos revogados, progresso, conteúdo editado e data-âncora. Não usar upsert para sobrescrever dados do usuário. O hash é produzido pela configuração de senha Better Auth; identidade/conta são provisionadas pelo adapter interno da versão fixada. Testes de login detectam incompatibilidade dessa API em atualizações.
5. Rotação explícita e privada: `npm run db:seed:demo -- --rotate-password`, após atualizar DEMO_USER_PASSWORD no ambiente privado. Revoga sessões da conta; nenhuma mensagem é enviada. Não existe endpoint de reset, signup ou recuperação por email. Reset destrutivo do dataset não está disponibilizado; usar novo banco dedicado se precisar de uma demonstração inteiramente nova.

Comprimento mínimo de senha: 5 apenas com ambos os indicadores demo; 12 fora deles. Signup público desabilitado em todos os ambientes. Remover os indicadores da demo antes de atender pessoas reais não é, sozinho, preparação suficiente para produção. A configuração não comprova que o banco não contém dados reais: o operador deve manter isolamento físico do projeto.

O seed inclui três turmas como aluno, oficina com oito alunos fictícios, cinco missões (quatro publicadas e um rascunho identificado como fixture), progresso 2/5 na biblioteca, entregas draft/submitted/reviewed, feedback e barreiras compartilhada/privada. Datas partem de âncora persistida; vencimento a 45 dias da primeira execução. Reexecução não move datas nem progresso. Contas fictícias usam example.invalid e não recebem credenciais de login.

## Publicar na Vercel

Dois projetos com raízes `apps/api` e `apps/web`. Habilitar arquivos externos à raiz nos dois projetos. Backend usa framework NestJS, Node 24 e entrypoint `src/main.ts` com handler default assíncrono. Na Vercel, a primeira requisição aguarda `app.init()`; requisições concorrentes compartilham a mesma inicialização. Fora da Vercel, `npm run dev:api` / `npm start` continuam usando `app.listen(PORT)`. A entrada importa `@nestjs/core` diretamente, pois o detector da Vercel verifica imports no próprio arquivo e não segue `runtime.ts`; preservar esse import mesmo com a fábrica de aplicação compartilhada. O `vercel.json` mantém a detecção nativa do NestJS, sem um padrão `functions["src/main.ts"]`: esse padrão é rejeitado com `unused_function` antes do build. Se for necessário fixar o orçamento em 60s, configurar em Vercel Settings → Functions → Function Max Duration e confirmar disponibilidade no plano selecionado; a geração Gemini limita a chamada externa a 20s. No projeto da API, conferir Root Directory `apps/api` e Framework Preset NestJS. Build executa `prisma generate` e TypeScript, nunca seed/migration. Prisma é reutilizado pela instância serverless; não há worker, gravação de arquivo de negócio ou Map de sessões/cotas.

Frontend configura `API_INTERNAL_URL` server-side e implementa o proxy definido no documento de integração. Backend não abre CORS: navegador usa origem única pelo proxy. CLI direto deve enviar Origin aprovado nas mutações. Cookies host-only passam pelo proxy e pertencem ao frontend. Preservar todos os Set-Cookie de login/logout. Não remover Origin para contornar CSRF. Previews usam banco separado e origem explícita. Cookies Secure dependem de NODE_ENV=production.

Depois de publicar: verificar health; login real sem expor credenciais; GET me/contextos; preferências e retomada de etapa; salvar e enviar; feedback; convites; trocar contextos permitidos; barreira privada invisível ao professor; logout e revogação; chamada negada de usuário alheio. A validação na URL publicada depende do frontend/proxy, credenciais e infraestrutura. Não foi implicitamente realizada por compilar a API.

## Diagnóstico de inicialização

`Ready` confirma que o build foi publicado; conferir também `GET /v1/health` e o login publicado. O entrypoint exporta o handler antes de inicializar o NestJS, evitando depender da descoberta de um `listen()` assíncrono. A aplicação não encerra o processo serverless quando a configuração falha: responde 503 genérico, sem detalhes privados, e registra um único diagnóstico por instância.

Em Runtime Logs, `INVALID_ENVIRONMENT` informa os nomes das variáveis inválidas e uma orientação fixa. Não registra valores, URLs de conexão, senhas, tokens, payloads ou stacks. Conferir principalmente origens HTTPS exatas e iguais em `BETTER_AUTH_URL` / `TRUSTED_WEB_ORIGIN`, segredo aleatório com pelo menos 32 caracteres, `DATABASE_URL` PostgreSQL com `schema=travessia` e os dois indicadores demo consistentes. Códigos operacionais conhecidos como `P1001` / `ECONNREFUSED` podem aparecer para outras falhas; mensagens brutas não são registradas.

Após corrigir variáveis em Production, redeployar: a instância mantém o resultado de sua inicialização. Um antigo log `No exports found` acompanhado de falha de inicialização pode ser consequência de a aplicação abortar antes de registrar o servidor; o log genérico anterior não identificava qual configuração falhou. O handler exportado e os novos diagnósticos tratam esses problemas separadamente. Nunca remover validações de origem/schema/segredo para liberar o deploy.

## Gemini e arquivos

Gemini recebe somente objetivos e textos dos materiais selecionados e explicitamente aprovados pelo docente. Material é dado não confiável e não oferece ferramentas ao modelo. Entrada até três materiais/12 mil caracteres, saída até 4 mil tokens, timeout/abort de 20s, uma tentativa externa. Não retenta chamada externa automaticamente. Reservas e estados persistem; uma geração concorrente por usuário, cinco/contexto/dia e dez/usuário/dia. Falhas contam na cota. Limites por janela móvel de 24h, transação serializável com retries **somente do banco**. Chaves de idempotência não podem ser reutilizadas com outra entrada. Estado running expirado é marcado failed em leitura/nova solicitação. Não existe retomada durável após encerramento abrupto da função, nem garantia de cobrança externa exatamente uma vez.

Saída JSON é validada estruturalmente e vira versão draft, com revisão explícita para publicação. Se houver edição concorrente ou vínculo revogado, não substitui o rascunho. Estado/IDs/modelo/consumo são persistidos; prompts não entram nos registros operacionais. Conteúdo do draft permanece no banco como conteúdo didático privado. Não coletar identificadores/diagnósticos no material aprovado. Para smoke real, habilitar com material fictício após configurar modelo/chave, abrir uma missão docente e chamar a rota com sua sessão; conferir source=gemini, revisão e publicação. Não há fixture de sucesso em produção quando Gemini falha.

Upload permanece fechado com 503 UPLOAD_DISABLED. Materiais textuais atendem à demo. Download de material em quarentena ou fora de escopo responde 404. Objetos previamente verificados por processo operacional podem receber URL Supabase assinada por 60s após autorização atual; não há pipeline de upload/quarentena/scanner implementado para arquivos novos. Nunca marcar arquivo como verificado apenas por declaração do cliente. Não afirmar upload seguro concluído. URLs já emitidas duram até expirar.

## Limites de operação

Login usa orçamento atômico no PostgreSQL (20/min por endereço de conexão e 200/min global), sem confiar em X-Forwarded-For arbitrário. Um proxy pode compartilhar esse limite conservador; calibrar proxy confiável antes de piloto. Produto: 300/min/usuário; convites: 30/h/turma e 20 tentativas de aceite/h/usuário. Tabelas RateBucket/AuditEvent precisam de rotina de retenção controlada antes de piloto; nenhum daemon foi presumido. Erros de produto são genéricos e têm requestId; biblioteca auth tem envelope próprio. Não registrar cookies, corpos ou credenciais em logs da plataforma/proxy.

Não existem exportação/exclusão de conta ou envio de emails no MVP. Drafts de entrega podem ser editados com controle de revisão; envio torna a versão imutável e feedback preserva histórico. Reenvio de uma mesma versão revisada não é permitido nesta entrega. Backup/restore, retenção, privacidade, termos/público Gemini, scanner e validação com usuários são gates para dados reais. Testes automáticos de backend não são validação de acessibilidade da interface.

Referências oficiais consultadas: [Better Auth Express](https://better-auth.com/docs/integrations/express), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [opções](https://better-auth.com/docs/reference/options), [NestJS na Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [GenAI SDK](https://ai.google.dev/gemini-api/docs/libraries), [JSON estruturado](https://ai.google.dev/gemini-api/docs/structured-output). A integração usa o handler Node oficial do Better Auth, montado no Express do Nest antes do body parser, e valida getSession em todas as rotas de produto privadas.
