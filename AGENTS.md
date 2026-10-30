# Instruções para os agentes do Travessia

## Contexto e limites

Produto: aprendizagem por missões acessíveis no ensino superior, com espaços de aluno e professor. Use Gemini como provedor de IA. Não adicionar módulos de instituições, diagnósticos, laudos, decisões clínicas, vigilância de estudantes ou avaliações finais automáticas.

Uma pessoa pode ter papéis diferentes em turmas diferentes. O vínculo vem do banco e a identidade vem de uma sessão validada; dados do navegador não concedem permissões. Todo recurso privado precisa de autorização no servidor e escopo correto de turma/proprietário. O kernel em `packages/contracts/src/access-policy.ts` é referência; não é uma autenticação pronta.

## Dois agentes, uma base

- **Frontend:** `apps/web`, componentes e testes de interface. Ler também `apps/web/AGENTS.md` e `docs/agents/FRONTEND.md`.
- **Backend:** `apps/api`, migrations futuras, segurança, Gemini e testes de acesso. Ler também `apps/api/AGENTS.md` e `docs/agents/BACKEND.md`.
- **Compartilhados:** contratos, tokens, configurações da raiz e lockfile. Combine autoria por tarefa antes de editar o mesmo arquivo. Para contratos, o backend propõe e o frontend revisa o uso. Para tokens, o frontend propõe e registra os pares de contraste.
- Cada agente trabalha em branch e worktree próprias. Nunca executar `git switch`, reset ou limpeza na pasta do outro agente.
- Uma funcionalidade por branch (`feat/classroom-invites-api`, `feat/classroom-invites-ui`). Commits pequenos e específicos. Integrar por PR; corrigir conflitos preservando o trabalho existente. Não publicar segredos nem reescrever a main à força.

## Contratos

`packages/contracts/openapi.json` descreve apenas endpoints implementados. As propostas estão em `docs/API.md`. Antes de desenvolver uma funcionalidade em paralelo, atualizar o contrato em conjunto; gerar tipos/cliente a partir dele. Não manter formatos duplicados à mão. Preferir respostas de erro consistentes, sem expor informações privadas. Novos endpoints privados ficam protegidos desde o primeiro commit, com negação por padrão.

## Acessibilidade e aprendizagem

Alvo técnico: WCAG 2.2 AA, com orientações cognitivas W3C COGA como suplemento. Ler `docs/ACCESSIBILITY.md` e `docs/REFERENCES.md`. A fonte pedagógica específica será fornecida pelo usuário: está pendente. Não inventar recomendações clínicas nem presumir necessidades com base em rótulos como TDAH, autismo ou baixa visão.

Priorizar HTML semântico, teclado, foco visível, contraste, reflow, alternativas textuais, instruções claras e retomada de etapas. Sem rankings, streaks, contagens regressivas de pressão ou animações automáticas. Preferências são opcionais e individuais; não exigir diagnóstico. Manter objetivos avaliados ao variar apoios. Toda afirmação de acessibilidade deve distinguir implementação, teste automático, teste manual e validação com usuários.

## Dados e IA

- Coletar o mínimo necessário. Relatos de barreira privados; compartilhamento com docente explicitado antes do envio.
- Segredos só no backend e em ambientes ignorados pelo Git. Não pedir chaves em chat nem imprimir `.env`.
- A chave Gemini nunca usa prefixo `NEXT_PUBLIC_`.
- MVP de IA: professor solicita rascunho com material didático selecionado; validação estrutural e revisão humana antes de publicar.
- Não encaminhar automaticamente entregas, conversas, identificadores, preferências pessoais ou relatos ao provedor.
- Verificar termos de dados e elegibilidade etária antes de ativar o recurso em produção. O adaptador precisa poder ficar desativado.
- Persistir apenas metadados operacionais necessários de geração; não registrar prompts privados em logs.
- Uploads privados, limites, autorização para leitura, quarentena/verificação e download seguro antes de liberar arquivos reais.

## Qualidade

Raiz: `npm ci`, `npm run check`, `npm run build`; interface: `npx playwright test` (instalar Chromium quando necessário). Para novas regras de acesso, testar aluno A/B, docente da própria/outra turma, vínculo revogado e sessão inválida. Testar API real ao integrar autenticação: o teste do kernel isolado não comprova proteção dos endpoints. Adicionar verificações de teclado, reflow e leitor de tela conforme cada fluxo.

Não afirmar que mocks, screenshots, respostas falsas ou arquivos de especificação são funcionalidades concluídas. Diferenciar o que funciona, o que está planejado e o que depende de credenciais ou validação pedagógica.

## Escopo final da apresentação

MVP para Brazil Conference. A direção visual atual segue o Mais Acesso Conecta e os assets fornecidos pelo usuário; ler docs/DESIGN.md e docs/design/APPROVED.md. A imagem reference-student.png é referência histórica. Ler docs/DEMO.md e docs/DEPLOY.md. Os prompts atualizados em docs/agents prevalecem sobre a proposta inicial de Supabase Auth/worker: Better Auth no PostgreSQL, containers Linux no servidor Mais Acesso e Gemini limitado por requisição. A direção anterior da Vercel é histórica; Dockerfiles, compose.yaml e docs/DOCKER.md definem a execução atual. Migrations e seed continuam fora de build/healthcheck/inicialização da aplicação; docker:up executa a migration como tarefa temporária explícita antes de iniciar o conjunto. Conta e seed são tarefas de implementação, não funcionalidades já existentes. Credenciais pessoais não são versionadas.
