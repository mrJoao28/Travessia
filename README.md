# Travessia

**Diferentes caminhos para aprender e avançar.**

Plataforma web de aprendizagem por missões acessíveis para o ensino superior. Professores organizam objetivos, etapas, materiais e critérios; estudantes percorrem atividades com apoios selecionáveis, entregam trabalhos e comunicam barreiras. ODS central: 4. Contribuição complementar: 10.

## Estado real desta entrega

- Monorepo com Next.js/TypeScript e NestJS/TypeScript.
- Telas **demonstrativas**, com dados fictícios, para aluno, professor e leitura de uma missão.
- Ajustes locais de tamanho do texto, contraste, espaçamento e redução de decoração.
- API NestJS com Better Auth, Prisma/PostgreSQL, autorização por turma e convites transacionais.
- Missões versionadas, progresso, entregas, feedback, barreiras privadas e Gemini opcional; seed manual idempotente.
- Testes HTTP reais de sessão/isolamento e tipos gerados do OpenAPI.
- Documentação de acessibilidade, privacidade, arquitetura e tarefas para dois agentes.

Setup, seed privado e Vercel: [BACKEND-OPERATIONS.md](docs/BACKEND-OPERATIONS.md). Contrato revisado com frontend: [BACKEND-INTEGRATION.md](docs/BACKEND-INTEGRATION.md). Evidências e limites: [BACKEND-VALIDATION.md](docs/BACKEND-VALIDATION.md).

**Pendências:** configuração do Supabase, conta pessoal via variáveis privadas, deploy e validação na URL publicada, integração da interface e uploads novos (desativados). Gemini real depende de chave/modelo e aprovação de escopo; testes usam fake apenas na suíte. Não há certificação de acessibilidade ou alegação de adequação pedagógica a todas as deficiências.

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

A API inicia em `http://localhost:3001/v1/health` após configurar banco e autenticação conforme BACKEND-OPERATIONS.md. O comando compila antes de iniciar; reinicie-o após alterações. `.env.example` documenta nomes sem segredos e não é carregado automaticamente. As telas estáticas da fundação podem ser consultadas sem banco; os fluxos reais exigem API/seed.

## Verificar

```bash
npm run check
npm run build
npm run test:api
npx playwright install chromium
npx playwright test
```

O Playwright inicia a aplicação web. Os testes automáticos de acessibilidade são uma verificação parcial, complementada pelo roteiro manual em [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Organização

| Caminho | Finalidade |
|---|---|
| `apps/web` | Interface e acessibilidade; agente frontend |
| `apps/api` | Backend serverless, Prisma, auth e Gemini; agente backend |
| `packages/contracts` | OpenAPI, tipos gerados e política de acesso de referência |
| `packages/design-tokens` | Cores compartilhadas e regras visuais |
| `packages/api-client` | Local reservado ao cliente gerado da API |
| `docs` | Produto, arquitetura, referências e planos dos agentes |

Leia [AGENTS.md](AGENTS.md) antes de alterar o projeto. As orientações de execução estão em [docs/agents/FRONTEND.md](docs/agents/FRONTEND.md) e [docs/agents/BACKEND.md](docs/agents/BACKEND.md).

## Documentos principais

- [Produto e MVP](docs/PRODUCT.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Contrato da API](docs/API.md)
- [Perfis de alunos e professores](docs/PROFILES.md)
- [Estratégias pedagógicas](docs/STRATEGIES.md)
- [Acessibilidade](docs/ACCESSIBILITY.md)
- [Segurança e privacidade](docs/SECURITY.md)
- [Identidade visual](docs/DESIGN.md)
- [Referências e fonte pedagógica pendente](docs/REFERENCES.md)
- [Sequência de implementação](docs/ROADMAP.md)

O Travessia poderá se integrar ao Mais Acesso Conecta em etapa futura. Este MVP possui apenas espaços de aluno e professor; não inclui organizações, painel institucional, diagnósticos ou laudos.

## MVP para Brazil Conference

A identidade atual segue o Mais Acesso Conecta: azul institucional, superfícies brancas e azul claro, amarelo pontual e ilustrações inclusivas. A direção e as referências estão em [DESIGN.md](docs/DESIGN.md), com procedência e prompts das artes em [ARTWORK.md](docs/design/ARTWORK.md). A antiga imagem marfim/verde permanece como registro histórico.

Os prompts de trabalho estão em [frontend](docs/agents/FRONTEND.md) e [backend](docs/agents/BACKEND.md). A execução em três containers Linux está em [DOCKER.md](docs/DOCKER.md); as instruções antigas da Vercel são históricas. A integração ao proxy/pipeline do servidor Mais Acesso é uma etapa própria da equipe. Consulte as evidências para distinguir implementação, testes e publicação.


## Executar com Docker

Requisitos: Node.js 24 e Docker Desktop em Linux containers (ou Docker Engine com Compose v2). Não precisa instalar as dependências npm no host.

```sh
npm run docker:setup
npm run docker:up
npm run docker:seed
```

Consulte email/senha em `.env.docker` no seu editor e abra http://localhost:3000. O setup gera credenciais aleatórias sem exibi-las e não sobrescreve configuração existente. O seed é somente para demonstração isolada. `docker:down` preserva o volume PostgreSQL. Comandos, variáveis, teste de persistência e preparação para o servidor: [DOCKER.md](docs/DOCKER.md). O workflow **Docker Linux** constrói e testa os três containers no GitHub Actions.
