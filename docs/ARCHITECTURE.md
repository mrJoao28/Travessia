# Arquitetura

## Decisão

Monorepo npm Workspaces; Node.js 24; frontend Next.js/React/TypeScript; API NestJS/TypeScript. Interface e API são aplicações separadas. API modular. Para o MVP na Vercel, geração limitada na requisição; worker durável é evolução futura. Sem microserviços iniciais.

## Componentes atuais e previstos

| Componente | Estado | Responsabilidade |
|---|---|---|
| Next.js | Demonstração executável | Aluno, professor e preferências locais |
| NestJS | Health executável | Regras e autorização futuras |
| PostgreSQL/Supabase + Prisma | Planejado | Persistência, queries e migrations |
| Better Auth + PostgreSQL | Planejado | Sessões persistidas e credenciais; ver DEPLOY.md |
| Supabase Storage privado | Planejado | Materiais e entregas |
| Geração Gemini limitada por requisição | Planejado | Compatível com Vercel; sem worker permanente |
| Gemini via @google/genai | Planejado, desativado | Rascunhos e apoios revisados por professor |

## Modelo

User, Profile, Classroom, Membership (único por usuário/turma), Invitation, Mission, MissionVersion, Step, Material, Submission, Feedback, BarrierReport, ReadingPreferences, AiGeneration, AuditEvent. Dados pessoais não pertencem ao contrato público das missões. Todo recurso privado tem uma cadeia verificável até turma/proprietário. Papel é definido no vínculo, não em um campo global editável do perfil.

## Confiança e acesso

Navegador → cookie de sessão → proxy de mesma origem → Better Auth/sessão validada → autorização de recurso → banco/Storage. A sessão é persistida no PostgreSQL. Configurar cookies HttpOnly/Secure, trustedOrigins, proteção CSRF e encaminhamento de Set-Cookie conforme DEPLOY.md. A integração direta com Supabase Auth foi substituída para este MVP.

Acesso de negócio ao banco passa pela API. Não presumir que consultas Prisma respeitam automaticamente RLS. Conexão de servidor com menor privilégio, schema de negócio não exposto à API pública de dados, filtros por turma/proprietário e autorização centralizada. Storage mantém políticas próprias e links temporários autorizados.

## Gemini

Professor escolhe material permitido → API valida autorização/cota → registro persistido de geração → chamada Gemini aguardada, com timeout e saída limitados → validação de JSON/conteúdo → rascunho privado → revisão/publicação pelo professor. Nenhuma ferramenta de navegação, execução de código ou mutação de banco é entregue ao modelo. Arquivos são dados não confiáveis.

Falhas da IA não bloqueiam missões existentes. Usar geração limitada por requisição para compatibilidade com Vercel. Não há worker contínuo ou pg-boss ativo neste MVP. Persistir estado, controlar concorrência e evitar publicação duplicada; uma tentativa externa repetida pode gerar cobrança. Processamento durável de longa duração será decisão futura, caso necessário.

## Deploy

Web e API são dois projetos na Vercel; banco e objetos persistem no Supabase. Conferir limites/custos do plano selecionado, sem prometer operação gratuita ilimitada. Antes de dados reais: HTTPS, backups testados, política de retenção, controle de acesso, monitoramento sem payloads privados e verificação da oferta Gemini para o público atendido. Integração/SSO com Mais Acesso Conecta é uma etapa posterior, sem compartilhar banco implicitamente.

## Atualização de escopo — competição e Vercel

As decisões finais de autenticação, conta/turmas demo e geração serverless estão em DEMO.md e DEPLOY.md. Elas substituem os trechos de proposta anterior sobre Supabase Auth, cookies/JWT específicos e worker/pg-boss. Não implementar simultaneamente as alternativas.
