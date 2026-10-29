# Travessia

**Diferentes caminhos para aprender e avançar.**

Plataforma web de aprendizagem por missões acessíveis para o ensino superior. Professores organizam objetivos, etapas, materiais e critérios; estudantes percorrem atividades com apoios selecionáveis, entregam trabalhos e comunicam barreiras. ODS central: 4. Contribuição complementar: 10.

## Estado real desta entrega

- Monorepo com Next.js/TypeScript e NestJS/TypeScript.
- Telas **demonstrativas**, com dados fictícios, para aluno, professor e leitura de uma missão.
- Ajustes locais de tamanho do texto, contraste, espaçamento e redução de decoração.
- API executável com `GET /v1/health`.
- Política de autorização de referência e testes de isolamento por turma; ainda não integrada a endpoints privados.
- Documentação de acessibilidade, privacidade, arquitetura e tarefas para dois agentes.

**Ainda não implementados:** contas e login, banco de dados, convites reais, uploads, persistência de progresso, entregas, avaliação e chamadas ao Gemini. As telas não enviam dados de estudantes. Não há certificação de acessibilidade ou alegação de adequação pedagógica a todas as deficiências.

## Executar

Requisitos: Node.js 24 e npm. Na raiz:

```bash
npm ci
npm run dev:web
```

Acesse `http://localhost:3000/aluno` e `http://localhost:3000/professor`. Em outro terminal:

```bash
npm run dev:api
```

A API inicia em `http://localhost:3001/v1/health`. O comando compila antes de iniciar; reinicie-o após alterações no backend. Nenhuma chave é necessária para a demonstração. `.env.example` documenta configurações futuras; o scaffold não carrega esse arquivo automaticamente. Configure variáveis no ambiente de execução quando necessário.

## Verificar

```bash
npm run check
npm run build
npx playwright install chromium
npx playwright test
```

O Playwright inicia a aplicação web. Os testes automáticos de acessibilidade são uma verificação parcial, complementada pelo roteiro manual em [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Organização

| Caminho | Finalidade |
|---|---|
| `apps/web` | Interface e acessibilidade; agente frontend |
| `apps/api` | Backend e futuro worker; agente backend |
| `packages/contracts` | OpenAPI e política de acesso de referência |
| `packages/design-tokens` | Cores compartilhadas e regras visuais |
| `packages/api-client` | Local reservado ao cliente gerado da API |
| `docs` | Produto, arquitetura, referências e planos dos agentes |

Leia [AGENTS.md](AGENTS.md) antes de alterar o projeto. As orientações de execução estão em [docs/agents/FRONTEND.md](docs/agents/FRONTEND.md) e [docs/agents/BACKEND.md](docs/agents/BACKEND.md).

## Documentos principais

- [Produto e MVP](docs/PRODUCT.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Contrato inicial](docs/API.md)
- [Acessibilidade](docs/ACCESSIBILITY.md)
- [Segurança e privacidade](docs/SECURITY.md)
- [Identidade visual](docs/DESIGN.md)
- [Referências e fonte pedagógica pendente](docs/REFERENCES.md)
- [Sequência de implementação](docs/ROADMAP.md)

O Travessia poderá se integrar ao Mais Acesso Conecta em etapa futura. Este MVP possui apenas espaços de aluno e professor; não inclui organizações, painel institucional, diagnósticos ou laudos.

## MVP para Brazil Conference

O design aprovado está em [docs/design/reference-student.png](docs/design/reference-student.png). Siga a referência estritamente. Os dois prompts estão em [frontend](docs/agents/FRONTEND.md) e [backend](docs/agents/BACKEND.md). O plano final prevê duas aplicações Vercel, Better Auth/PostgreSQL, Gemini no servidor e conta/turmas de demonstração conforme [DEMO.md](docs/DEMO.md) e [DEPLOY.md](docs/DEPLOY.md). Esses fluxos ainda serão implementados pelos agentes.
