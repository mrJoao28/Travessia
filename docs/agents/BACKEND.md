# Prompt — Agente backend do Travessia

Você é responsável pelo BACKEND do Travessia, MVP de aprendizagem por missões inclusivas para apresentação na competição Brazil Conference. Repositório: https://github.com/mrJoao28/Travessia. Entregue API, persistência, seed e integração Gemini operacionais, com documentação e testes. Não invente regras ou resultados da competição.

## 1. Leia e coordene

Leia AGENTS.md, apps/api/AGENTS.md, docs/PRODUCT.md, docs/ARCHITECTURE.md, docs/API.md, docs/SECURITY.md, docs/ACCESSIBILITY.md, docs/DEMO.md e docs/DEPLOY.md. Inspecione a base antes de editar. Use worktree própria, branch por funcionalidade, commits específicos e PRs. Combine primeiro o contrato de autenticação, turmas e missões com o frontend. Contratos/lockfile são compartilhados; migrations e infraestrutura do backend são sua responsabilidade.

## 2. Arquitetura final deste MVP

NestJS/TypeScript, Prisma e PostgreSQL hospedado no Supabase; Supabase Storage privado. Para este MVP adote Better Auth com sessões persistidas no PostgreSQL, cookies seguros e integração documentada com NestJS. Essa decisão substitui a proposta inicial de Supabase Auth; não manter dois sistemas de login. Consulte a documentação oficial da versão instalada. Hash de senha pela biblioteca; não criar criptografia ou autenticação caseira.

Sem entidades Institution/Organization. Papéis teacher/student pertencem a Membership por turma. Uma mesma conta pode ter contextos diferentes; nenhuma escolha do cliente concede privilégio. Credenciais ficam no servidor. Inicialização e health compatíveis com Vercel Functions; respeitar PORT e o entrypoint reconhecido. API modular e monólito para facilitar a entrega.

## 3. Autenticação e dados

Validar sessão no servidor em cada rota privada. Endpoints auth em /api/auth/* e produto em /v1/*. Frontend usará proxy de mesma origem; combinar cookies, path, Set-Cookie, trustedOrigins, CSRF, logout, expiração e recuperação. Cookies HttpOnly/Secure em produção; sem armazenamento de sessão em localStorage. Acesso direto à API também exige autenticação.

Negar por padrão. Buscar vínculos reais e autorizar cada recurso antes da leitura/mutação. Queries Prisma incluem turma/proprietário; RLS não protege automaticamente conexão privilegiada. Schema de negócio não exposto publicamente. Evitar mass assignment de ownerId/role. Invites student com token opaco, hash, expiração, revogação e consumo transacional. Não usar payload do cliente como fonte de papel.

Implementar User/Profile, Classroom/Membership, Invitation, Mission/Version/Step, Material, Submission, Feedback, BarrierReport, ReadingPreferences e registros operacionais mínimos. Missões com draft/published/archived; entregas com draft/submitted/reviewed. Preferências privadas; relato de barreira compartilhado apenas por escolha explícita. Não coletar diagnóstico ou laudo. Arquivos privados com limites, checagem e download temporário autorizado; não habilitar upload antes das verificações.

## 4. Conta e seed de demonstração obrigatório

Ler docs/DEMO.md. Criar comando manual e idempotente npm run db:seed:demo. Nome: Joao Felipe. Curso: Engenharia da Computação. Email e senha escolhidos pelo usuário serão fornecidos por DEMO_USER_EMAIL e DEMO_USER_PASSWORD no ambiente privado; nunca hardcodar, imprimir ou versionar esses valores. Seed usa as APIs/hashing da biblioteca, não insere senha em texto puro nem inventa formatos internos de credencial.

A senha do seed de demonstração pode ser curta e fica só no ambiente privado. O cadastro aberto na plataforma exige senha de 12 a 128 caracteres, inclusive na demonstração. Não colocar credenciais na UI. Proteção de tentativas com estado persistente, não só Map em memória.

Criar 3 turmas para a conta como aluno: Programação I, Cálculo Aplicado e Estatística. Usar professores fictícios. Criar 1 turma como docente: Oficina de Projetos Inclusivos, com alunos fictícios. Preencher missões, etapas, rascunhos, entregas em andamento/enviadas/revisadas, feedback e uma barreira explicitamente compartilhada. Preservar o exemplo “Uma biblioteca para todos”, etapa 2 de 5. Ver docs/DEMO.md para cenários.

Upsert com IDs estáveis/namespaces de seed, transações e sem duplicações. Não sobrescrever alterações nem resetar senha em reexecução sem opção explícita e segura. Nunca rodar seed/reset em build, cold start ou requisição pública. Reset somente CLI protegido e escopado ao dataset demo; falhar se não for banco dedicado de demo. Não enviar emails/redefinições/notificações reais. Datas coerentes relativas a uma data-âncora persistida; não vencer todas as tarefas na semana da apresentação.

## 5. Gemini API

Provedor exclusivo Gemini via @google/genai, chave server-side. Modelo estável configurável por GEMINI_MODEL. MVP: rascunho de missão/apoios para professor, com objetivos e material didático selecionado; retorno JSON validado, rascunho privado e revisão antes de publicação. Não enviar automaticamente entregas, nomes, emails, preferências, relatos ou diagnósticos. Texto de arquivos é dado não confiável; não permitir que o modelo execute código ou altere banco. Não usar busca web irrestrita como base pedagógica.

Para manter o MVP compatível com Vercel, faça geração aguardada na requisição, limitada e com timeout menor que o orçamento da função. Persistir estado de solicitação, deduplicação e consumo. Sem worker permanente, polling daemon, fila pg-boss ativa ou processamento em background não durável após responder. Se for necessário trabalho longo, documentar serviço durável separado para fase futura, não fingir que ele existe.

Cotas por usuário/contexto, limite de entrada/saída, concorrência e tentativas limitadas. Cancelamento/falha não publica rascunho e não bloqueia missões existentes. Não retentar cegamente nem prometer chamada externa exatamente uma vez. AI_ENABLED=false precisa produzir estado claro de indisponibilidade; fixtures são dados de demonstração identificados, não falsos resultados ao vivo.

Antes de ativar para público real, confirmar termos de privacidade e elegibilidade etária da oferta Gemini. Em testes, usar conteúdo didático fictício/público. Não tratar modalidade paga como retenção zero ou autorização para enviar dados sensíveis.

## 6. Deploy Vercel

Projeto separado com raiz apps/api no mesmo monorepo; validar detecção NestJS conforme documentação atual. Conexão Prisma com pool apropriado ao ambiente serverless e migrations executadas uma vez por rotina controlada. Sem disco local persistente, sessão em memória ou processo de worker contínuo. Supabase mantém dados e arquivos.

Documentar variáveis por aplicação, sem valores: DATABASE_URL/DIRECT_URL, SUPABASE_URL e credencial server-side de storage quando necessária, BETTER_AUTH_SECRET/BETTER_AUTH_URL/TRUSTED_WEB_ORIGIN, GEMINI_API_KEY/GEMINI_MODEL/AI_ENABLED e DEMO_* descritas. Validar tamanho e origem dos segredos. Coordenar frontend proxy e verificar auth em URL publicada. Não usar CORS permissivo para resolver erro de configuração.

## 7. Aceite e testes

Testes HTTP de sessão inválida, isolamento aluno A/B, docente de outra turma, vínculo revogado, papel alterado no payload, convite expirado/reutilizado, relato sem compartilhamento, arquivo privado e cota concorrente. Testar seed duas vezes sem duplicar nem destruir trabalho; login da conta configurada, contextos student/teacher e todos os cenários de demo. Testar Gemini com fake provider apenas em testes e smoke real quando credencial estiver disponível e autorizada.

Entregar API documentada em OpenAPI, migrations, seed, instruções Vercel, exemplos sem dados privados e evidências de checks/build/testes. Reportar honestamente o que funciona e o que depende de configuração. Nenhuma nota final, diagnóstico ou publicação automática por IA. Não declarar deploy ou seed concluído sem verificar.
