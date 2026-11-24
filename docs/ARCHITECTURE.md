# Arquitetura

## Decisão

Monorepo npm Workspaces; Node.js 24; frontend Next.js/React/TypeScript; API NestJS/TypeScript. Interface e API são aplicações separadas. API modular. Produção usa Docker Compose no servidor Mais Acesso, com Cloudflare na borda pública. A geração Gemini ocorre na requisição; o material-worker é um serviço separado para PDF/OCR/voz, não um worker de geração de IA.

## Componentes atuais e previstos

| Componente | Estado | Responsabilidade |
|---|---|---|
| Next.js | Aplicação web integrada | Aluno, professor, preferências e proxy server-side da API |
| NestJS | API implementada e testada por HTTP | Regras, autorização por turma e serialização explícita |
| PostgreSQL + Prisma | Schema/migrations implementados | Persistência e seed manual; banco isolado no Compose em produção |
| Better Auth + PostgreSQL | Login/logout/sessões testados | Cookies e credenciais; ver BACKEND-OPERATIONS.md |
| Material worker | Serviço Docker implementado | PDF/OCR/voz no volume privado; ver INDIVIDUAL-MATERIALS.md |
| Storage externo privado | Opcional; upload novo desativado | Objetos previamente verificados; não é necessário para a implantação base |
| Geração Gemini limitada por requisição | Adaptador implementado; testes com provedor fake | Somente backend; sem publicação automática; timeout e quotas |
| Gemini via @google/genai | Desativável; smoke real depende de credencial | Rascunhos revisados por professor |

## Modelo

User, Profile, Classroom, Membership (único por usuário/turma), Invitation, Mission, MissionVersion, Step, Material, Submission, Feedback, BarrierReport, ReadingPreferences, AiGeneration, AuditEvent. Dados pessoais não pertencem ao contrato público das atividades. Todo recurso privado tem uma cadeia verificável até turma/proprietário. Papel é definido no vínculo, não em um campo global editável do perfil.

## Confiança e acesso

Navegador → cookie de sessão → proxy de mesma origem → Better Auth/sessão validada → autorização de recurso → banco/Storage. A sessão é persistida no PostgreSQL. Configurar cookies HttpOnly/Secure, trustedOrigins, proteção CSRF e encaminhamento de Set-Cookie conforme DEPLOY.md. A integração direta com Supabase Auth foi substituída para este MVP.

Acesso de negócio ao banco passa pela API. Não presumir que consultas Prisma respeitam automaticamente RLS. Conexão de servidor com menor privilégio, schema de negócio não exposto à API pública de dados, filtros por turma/proprietário e autorização centralizada. Storage mantém políticas próprias e links temporários autorizados.

## Gemini

Professor escolhe material permitido → API valida autorização/cota → registro persistido de geração → chamada Gemini aguardada, com timeout e saída limitados → validação de JSON/conteúdo → rascunho privado → revisão/publicação pelo professor. Nenhuma ferramenta de navegação, execução de código ou mutação de banco é entregue ao modelo. Arquivos são dados não confiáveis.

Falhas da IA não bloqueiam atividades existentes. Geração é limitada à requisição, com estado persistido, controle de concorrência e sem publicação automática. Não há fila ou worker contínuo para IA. Uma tentativa externa repetida pode gerar cobrança.

## Deploy

O domínio público `travessia.maisacessoconecta.com.br` passa pela Cloudflare até o nginx do servidor Mais Acesso. O GitHub Actions executa CI e verificações Docker e publica o SHA aprovado na branch `prod` via SSH. O servidor executa frontend, API, PostgreSQL e material-worker em Docker Compose; somente o frontend fica acessível pelo proxy. As instruções vigentes, secrets necessários e checagem pós-deploy estão em [DEPLOY.md](DEPLOY.md). A Cloudflare é a camada de borda; este workflow não publica em Pages ou Workers.

As configurações de Vercel e Supabase em documentos antigos pertencem a propostas anteriores. A implantação, autenticação, demo e dados atuais seguem `DEPLOY.md`, `DOCKER.md`, `DEMO.md` e `SECURITY.md`; não misturar as propostas antigas com a execução atual.
