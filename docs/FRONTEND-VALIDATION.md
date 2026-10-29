# Validação do frontend

Execução local em Windows, Chromium via Playwright, 28/10/2026 (America/Manaus). Node 24.22.2 disponível para build e testes; o Node global é 26.8.1. Usar Node 24.x no projeto e na Vercel.

## Evidência já executada

- `npm ci`: concluído após liberar espaço no disco. Lockfile preservado. O npm relatou duas vulnerabilidades de severidade alta nas dependências existentes; investigar com o backend antes de alterar o lockfile compartilhado.
- `npm run check`: passou (verificação de tokens/contrato inicial, typecheck dos workspaces, seis testes do kernel de acesso). Esses seis testes não comprovam proteção HTTP.
- `npm run build`: passou para API scaffold e Next.js, sem credenciais ou banco necessários. Isso não valida o backend em desenvolvimento na outra worktree.
- `node --test apps/web/tests/proxy.test.mjs`: quatro testes passaram, cobrindo cookies separados, método/corpo/Origin, negação de origem inválida, tamanho, destino fixo, ausência de cache, recusa de redirecionamentos e de cookies com Domain. São testes do transporte com upstream controlado.
- Playwright: **36 testes passaram em execução completa** após corrigir o transbordamento a 320px com texto a 200% e sincronizar o foco de revisão após a renderização. Inclui formulários com transporte controlado para conflito de entrega, revisão/publicação, Gemini indisponível e convite/revogação. Os testes com transporte controlado comprovam estados de interface, não persistência real.
- Axe: nenhuma violação encontrada nas 12 rotas testadas, incluindo login, estados sem API e prévias de aluno/docente. Preferências, reflow a 320px com texto a 200%, foco do skip link, Escape no controle de leitura, ordenação por teclado e recuperação de formulário cobertos por testes de navegador.
- Capturas desktop (1586×991) e mobile (320×800) geradas em `test-results/reference-desktop.png` e `reference-mobile.png` (artefatos ignorados pelo Git). A imagem aprovada foi aberta antes da implementação e as capturas foram inspecionadas visualmente. Ajustados alinhamento vertical, proporção do cartão principal, sidebar, escala de títulos e composição dos apoios. Artes em SVG são provisórias e identificadas como tais; não correspondem à arte final.

## Limites desta evidência

Os dados em `/previa/*` são fictícios e os controles não simulam salvamento. Os componentes reais já chamam as operações do contrato redigido pelo backend; login/seed/fluxos persistidos ainda precisam ser verificados quando o backend terminar. Nenhum resultado de API real, deploy ou geração Gemini é declarado nesta etapa.

Não foram realizados testes com NVDA/VoiceOver nem validação com estudantes/docentes. A inspeção de árvore acessível e os testes de teclado automatizados não substituem uso de leitor de tela. Cores do sistema, movimento reduzido e espaçamento de texto foram exercitados automaticamente no leitor da prévia. Zoom real a 400% e teclado em todos os estados reais ainda devem ser registrados. O alvo é WCAG 2.2 AA com COGA suplementar; não se afirma conformidade completa pelo axe.

## Roteiro real preparado, aguardando backend

`apps/web/scripts/test-real-demo.mjs` prepara PostgreSQL nativo isolado em loopback, aplica migrations e seed reais, inicia NestJS/Better Auth e Next.js com proxy de mesma origem e executa `tests/browser-real/demo.spec.ts`. O runner sobrescreve o destino de banco e cria credenciais aleatórias fictícias; não usa conta, senha ou banco pessoais. O provedor IA fica desativado, sem resposta simulada de sucesso. Executar após integrar o commit backend e instalar suas dependências:

```
node node_modules/tsx/dist/cli.mjs --tsconfig apps/api/tsconfig.json apps/web/scripts/test-real-demo.mjs
```

O roteiro cobre login pela interface, preferências na conta, retomada 2/5, rascunho persistido após recarregar, feedback existente, contexto docente permitido, feedback novo, resposta à barreira compartilhada, Gemini desativado, revisão/publicação manual e logout com `/me` negado. A existência deste script ainda **não significa que ele passou**. Registrar resultado efetivo depois da execução. Isso também não valida Vercel, conta pessoal ou chamada real ao Gemini.

A fonte pedagógica especializada continua pendente conforme `REFERENCES.md`. Preferências não exigem diagnóstico nem alteram objetivos avaliados.
