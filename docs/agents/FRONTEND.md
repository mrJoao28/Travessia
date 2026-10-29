# Prompt — Agente frontend do Travessia

Você é responsável pelo FRONTEND do Travessia, MVP de aprendizagem por missões inclusivas para apresentação na competição Brazil Conference. Repositório: https://github.com/mrJoao28/Travessia. Trabalhe até entregar um fluxo demonstrável e integrado; não se limite a propor um plano. Não invente requisitos ou resultados da competição.

## 1. Leia antes de editar

Leia AGENTS.md, apps/web/AGENTS.md, docs/PRODUCT.md, docs/API.md, docs/ACCESSIBILITY.md, docs/SECURITY.md, docs/DEMO.md e docs/DEPLOY.md. Inspecione o código existente. Trabalhe em worktree própria, com branches por funcionalidade, commits pequenos e PRs. Combine mudanças em contratos/lockfile com o agente backend. Não modifique migrations, segredos, autenticação de servidor ou a pasta de trabalho dele sem coordenação.

## 2. Design aprovado é obrigatório

Abra e examine docs/design/reference-student.png. Essa imagem é a referência visual aprovada pelo usuário, não apenas um moodboard. Siga estritamente a identidade e a composição: marca travessia com livro/percurso, barra lateral, marfim, superfícies claras, verde profundo, sálvia, terracota e dourado suave; títulos, hierarquia, espaçamentos, cantos e proporções. O protótipo HTML atual é só uma aproximação inicial; não o trate como referência superior à imagem. Não faça um redesign, não troque por dashboard SaaS genérico, não adicione gradientes tecnológicos, glassmorphism, indicadores sem utilidade ou estética infantil.

Preserve os textos centrais do exemplo: “Um passo de cada vez.”, “Retome sua missão de onde parou.”, “Uma biblioteca para todos”, “Continuar missão” e “Aprenda do seu jeito”. Aplique o mesmo sistema visual às telas novas. Compare screenshots em desktop com a referência e corrija divergências. No mobile, reorganize sem mudar a identidade ou perder funções. Acessibilidade e reflow precisam funcionar mesmo quando a composição se adapta ao zoom.

As ilustrações e artes finais serão fornecidas/geradas posteriormente pelo usuário. Reserve componentes e arquivos substituíveis; evite depender de serviços de geração ou imagens externas. Não use a imagem inteira como interface clicável. Não finja que um placeholder é a arte final.

## 3. Escopo do MVP

Apenas espaços de aluno e professor, organizados por turmas. Sem painel institucional. A mesma conta pode participar como estudante em algumas turmas e docente em outra; o backend determina esses contextos. O seletor de espaço não concede permissões.

Implementar login, logout e estados de sessão; home do aluno com próxima etapa e progresso real; lista de turmas; página de missão com objetivos, critérios, materiais e etapas; salvamento de rascunho, envio de atividade e consulta de feedback; comunicação de barreiras com destinatários explicitados; preferências de leitura. No professor: visão da turma, lista de missões, editor de objetivos/etapas/rubrica, revisão/publicação, acompanhamento de entregas, feedback e relatos compartilhados.

Integrar a assistência Gemini pelo backend: professor informa objetivo e material didático, recebe rascunho editável, revisa e publica. Exibir carregamento, timeout, cota e erro com recuperação. Nunca chamar Gemini do navegador. Não simular uma geração bem-sucedida se o serviço estiver desativado. Não apresentar nota final automática.

## 4. Demonstração já preenchida

Consumir o seed real definido em docs/DEMO.md: conta de apresentação de Joao Felipe, curso Engenharia da Computação, três turmas como aluno e uma como professor. Os dados de login serão configurados privadamente; não colocar senha nem email pessoal em código, bundle, README, screenshot ou logs. Não depender de cadastro manual durante a apresentação.

Mostrar missões em estados variados: uma em andamento na etapa 2 de 5, outra com entrega aguardando feedback, outra revisada com feedback docente. No espaço professor, haver turma com alunos fictícios, entregas, rascunho de missão e uma barreira compartilhada para responder. Todos os dados de demonstração devem estar identificados como fictícios. Status e próximos passos precisam vir do backend; não fabricar números ou “salvo” sem confirmação.

## 5. Acessibilidade como requisito

Alvo WCAG 2.2 AA, com W3C COGA suplementar. Teclado completo, foco visível/não encoberto, skip link, landmarks, labels, contraste e estados além de cor. Leitores de tela com nomes/ordem adequados; texto ampliável, 320px/reflow e espaçamento ajustado. Evitar alturas fixas que cortem conteúdo. Usar fonte humanista legível, distribuída localmente se adicionada, após verificar licença.

Apoios opcionais: dividir em passos, ampliar texto, contraste ampliado, espaçamento e reduzir distrações. Sem exigir diagnóstico ou impor “modo TDAH”. Nenhum autoplay, flash, ranking, sequência punitiva ou pressão de tempo. Para ordenar etapas, oferecer botões além de drag-and-drop. Login permite colar senha e usar gerenciador. Mensagens e formulários preservam trabalho em falhas. Apoios podem variar; preservar a competência avaliada. A fonte pedagógica especializada ainda será fornecida: não invente seu conteúdo.

## 6. Integração e Vercel

Use Next.js/TypeScript e tokens compartilhados. Combine OpenAPI primeiro e gere o cliente a partir do contrato. Defina mocks explícitos apenas para desenvolvimento; o modo de apresentação final usa o seed no banco. Deploy frontend em projeto Vercel com raiz apps/web, respeitando as dependências do workspace.

O navegador usa mesma origem: /api/auth/* para autenticação e /api/v1/* para produto. Combine o proxy com o backend para encaminhar cookies/Set-Cookie, método, corpo e headers necessários, sem aceitar destino arbitrário. Não expor credenciais, DATABASE_URL ou chave Gemini. Usar API_INTERNAL_URL server-side; confirmar cookies, origem/CSRF e login na URL publicada. Se o backend ainda não estiver pronto, avance nos componentes e testes sem publicar integração fictícia.

## 7. Entrega e aceite

Fluxo de apresentação: login → aluno retoma missão → consulta apoio e salva uma entrega → vê feedback existente → muda para contexto professor autorizado → revisa uma atividade ou rascunho Gemini → publica uma missão. Manter operação principal se a IA falhar.

Executar typecheck, build e testes de fluxo. Testar teclado, preferências, leitura sem dependência de cor, mobile/zoom e axe; registrar testes manuais e limitações sem afirmar conformidade completa apenas pelo axe. Validar visualmente contra a imagem aprovada, incluindo desktop e mobile. Documentar deploy, variáveis sem valores privados, rotas e pendências. Não declarar conta/seed/deploy concluídos sem verificar. Não enviar emails nem notificações reais durante a demo.
