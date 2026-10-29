# Validação do frontend

Execução local em Windows, Chromium via Playwright, 28/10/2026 (America/Manaus). Node 24.22.2 disponível para build e testes; o Node global é 26.8.1. Usar Node 24.x no projeto e na Vercel.

## Evidência já executada

- `npm ci`: concluído após integrar o backend, usando seu lockfile sem alterações. O npm relatou cinco alertas altos; análise e limites registrados abaixo.
- `npm run check`: passou (verificação de tokens/contrato inicial, typecheck dos workspaces, seis testes do kernel de acesso). Esses seis testes não comprovam proteção HTTP.
- `npm run build`: **passou após integrar o backend**, para API implementada e Next.js, com Node 24. Build não exige credenciais nem cria banco/seed.
- `node --test apps/web/tests/proxy.test.mjs`: quatro testes passaram, cobrindo cookies separados, método/corpo/Origin, negação de origem inválida, tamanho, destino fixo, ausência de cache, recusa de redirecionamentos e de cookies com Domain. São testes do transporte com upstream controlado.
- `FRONTEND_PROXY_SOURCE=... npm run test:api`: **12 cenários HTTP passaram na worktree integrada**, com PostgreSQL, migrations, seed, Better Auth e função de proxy reais. Inclui isolamento A/B, outros docentes, vínculo revogado, sessão inválida/expirada, convites, relatos privados, concorrência e publicação. O provedor Gemini é fake apenas nos cenários unitários/integrados de geração dessa suíte; não representa chamada ao Google.
- Playwright: **36 testes passaram em execução completa** após corrigir o transbordamento a 320px com texto a 200% e sincronizar o foco de revisão após a renderização. Inclui formulários com transporte controlado para conflito de entrega, revisão/publicação, Gemini indisponível e convite/revogação. Os testes com transporte controlado comprovam estados de interface, não persistência real.
- Axe: nenhuma violação encontrada nas 12 rotas testadas, incluindo login, estados sem API e prévias de aluno/docente. Preferências, reflow a 320px com texto a 200%, foco do skip link, Escape no controle de leitura, ordenação por teclado e recuperação de formulário cobertos por testes de navegador.
- Regressão adicional: links de leitura voltam a abrir o controle após Escape, mesmo quando o fragmento da URL já é `#preferencias`. Teste de teclado/persistência/reabertura e novo build Next.js passaram após a correção.
- Capturas desktop (1586×991) e mobile (320×800) geradas em `test-results/reference-desktop.png` e `reference-mobile.png` (artefatos ignorados pelo Git). A imagem aprovada foi aberta antes da implementação e as capturas foram inspecionadas visualmente. Ajustados alinhamento vertical, proporção do cartão principal, sidebar, escala de títulos e composição dos apoios. Artes em SVG são provisórias e identificadas como tais; não correspondem à arte final.

## Limites desta evidência

Os dados em `/previa/*` são fictícios e os controles não simulam salvamento. Os componentes reais usam o contrato implementado e seus DTOs oficiais. A integração local real passou conforme evidência abaixo; isso não comprova deploy, conta pessoal no Supabase ou chamada real ao Gemini.

Não foram realizados testes com NVDA/VoiceOver nem validação com estudantes/docentes. A inspeção de árvore acessível e os testes de teclado automatizados não substituem uso de leitor de tela. Cores do sistema, movimento reduzido e espaçamento de texto foram exercitados automaticamente no leitor da prévia. Zoom real a 400% e teclado em todos os estados reais ainda devem ser registrados. O alvo é WCAG 2.2 AA com COGA suplementar; não se afirma conformidade completa pelo axe.

## Roteiro real executado após o merge backend

`apps/web/scripts/test-real-demo.mjs` prepara PostgreSQL nativo isolado em loopback, aplica migrations e seed reais, inicia NestJS/Better Auth e Next.js com proxy de mesma origem e executa `tests/browser-real/demo.spec.ts`. O runner sobrescreve o destino de banco e cria credenciais aleatórias fictícias; não usa conta, senha ou banco pessoais. O provedor IA fica desativado, sem resposta simulada de sucesso. Executar após integrar o commit backend e instalar suas dependências:

```
node node_modules/tsx/dist/cli.mjs --tsconfig apps/api/tsconfig.json apps/web/scripts/test-real-demo.mjs
```

**Resultado: passou**, Chromium/Windows/Node 24.22.2, 48 segundos no navegador (51,3 segundos na suíte), após integrar main `8ae969d`. Sem interceptação de rede ou respostas falsas: PostgreSQL nativo, migrations reais, seed real, Better Auth, NestJS, Next.js e proxy reais. O runner encerrou os serviços ao terminar e não usou credenciais pessoais.

Confirmados: login pela interface; preferências salvas na conta e mantidas após recarregar; retomada na etapa 2/5; rascunho persistido; envio da atividade; criação e consulta de relato privado na turma correta; feedback existente; mudança para contexto docente autorizado; novo feedback; resposta à barreira compartilhada; erro real AI_UNAVAILABLE com editor preservado; edição, revisão e publicação manual; logout com `/me` negado (401). Axe também executado no leitor real sem violações encontradas.

O teste revelou que a navegação preservava indevidamente o primeiro contexto da turma. Corrigido: páginas recebem a turma solicitada dos searchParams, filtram somente vínculos da API e remontam o espaço ao mudar contexto/rota. O roteiro completo passou após essa correção. O teste está incluído no CI, junto à verificação de drift do adaptador web.

Isso não valida Vercel, conta pessoal ou chamada real ao Gemini. Gemini permaneceu desativado; nenhuma geração bem-sucedida foi simulada nesse roteiro.

## Dependências observadas após integrar backend

`npm audit --json` retornou cinco alertas altos em duas cadeias: Multer → Nest platform-express e deepmerge-ts → Prisma config → Prisma CLI. Não foi executado `npm audit fix --force` nem migração maior do Prisma durante a tarefa de frontend. A API mantém uploads fechados e não há configuração de fileFilter assíncrono; a CLI recebe configuração controlada. Esta observação limita os caminhos encontrados no código, sem declarar ausência de vulnerabilidade ou dispensar atualização.

Pendência de dependências para o backend: revisar [Multer GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) e [deepmerge-ts GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), selecionar atualizações compatíveis e repetir os testes. O segundo advisory depende de grafos recursivos, que JSON simples não cria; essa é uma limitação do cenário descrito pelo advisory, não uma certificação de segurança do projeto.

A fonte pedagógica especializada continua pendente conforme `REFERENCES.md`. Preferências não exigem diagnóstico nem alteram objetivos avaliados.
