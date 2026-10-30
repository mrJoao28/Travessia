# Travessia

> **Diferentes caminhos para aprender e avançar.**

Plataforma web de aprendizagem por missões acessíveis para o ensino superior. O Travessia permite que professores organizem objetivos, etapas, materiais e critérios, enquanto estudantes acompanham atividades, escolhem apoios, entregam trabalhos e comunicam barreiras.

**ODS principal:** 4 — Educação de Qualidade  
**Contribuição complementar:** 10 — Redução das Desigualdades

[![Abrir aplicação](https://img.shields.io/badge/Aplicação-Travessia-blue)](https://travessia-hazel.vercel.app/)

---

## 📌 Índice

- [Visão geral](#-visão-geral)
- [Estado atual](#-estado-atual)
- [Tecnologias](#-tecnologias)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Rodando com Docker — recomendado](#-rodando-com-docker--recomendado)
- [Rodando sem Docker](#-rodando-sem-docker)
- [Credenciais de demonstração](#-credenciais-de-demonstração)
- [Comandos úteis](#-comandos-úteis)
- [Testes e validação](#-testes-e-validação)
- [Arquitetura](#-arquitetura)
- [Acessibilidade](#-acessibilidade)
- [Documentação](#-documentação)
- [Solução de problemas](#-solução-de-problemas)
- [Segurança](#-segurança)
- [Limitações e pendências](#-limitações-e-pendências)
- [Desenvolvimento](#-desenvolvimento)

---

## 🎯 Visão geral

O Travessia é um **MVP de uma plataforma educacional acessível**, com espaços para:

- 👨‍🎓 **Aluno**
  - visualizar turmas e missões;
  - acompanhar progresso;
  - realizar atividades;
  - enviar entregas;
  - receber feedback;
  - registrar barreiras;
  - utilizar preferências de acessibilidade.

- 👨‍🏫 **Professor**
  - organizar turmas;
  - criar e revisar missões;
  - definir etapas, materiais e critérios;
  - acompanhar entregas;
  - fornecer feedback;
  - trabalhar com diferentes formas de apoio.

A aplicação também possui recursos de acessibilidade como **ajuste de tamanho do texto, contraste, espaçamento e redução de decoração**.

---

## 📊 Estado atual

O repositório é um **monorepo TypeScript** composto por frontend e backend.

Atualmente, o projeto possui:

- frontend em Next.js;
- backend em NestJS;
- autenticação com Better Auth;
- banco PostgreSQL;
- Prisma;
- autorização por turma;
- missões versionadas;
- progresso e entregas;
- feedback;
- registro de barreiras;
- Gemini opcional;
- seed de demonstração idempotente;
- testes HTTP de sessão e isolamento;
- contratos OpenAPI e tipos gerados;
- documentação de arquitetura, acessibilidade, privacidade e operação.

> **Importante:** o projeto ainda possui etapas de integração, configuração e validação antes de ser considerado uma implantação de produção completa.

---

# 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Banco de dados | PostgreSQL 17 |
| Autenticação | Better Auth |
| Contrato da API | OpenAPI |
| Testes E2E | Playwright |
| Testes da API | Testes HTTP |
| IA opcional | Google Gemini |
| Containerização | Docker + Docker Compose |
| Deploy planejado/atual | Vercel + infraestrutura de backend |

---

# 📁 Estrutura do projeto

```text
Travessia/
├── apps/
│   ├── web/                 # Frontend Next.js
│   └── api/                 # Backend NestJS
│
├── packages/
│   ├── contracts/           # OpenAPI e tipos da API
│   ├── design-tokens/       # Tokens visuais compartilhados
│   └── api-client/          # Espaço reservado para cliente gerado
│
├── docs/                    # Documentação técnica e de produto
│
├── scripts/                 # Scripts de desenvolvimento/Docker
│
├── tests/                   # Testes adicionais
│
├── compose.yaml             # Serviços Docker
├── package.json             # Scripts principais
├── package-lock.json
├── .env.example             # Variáveis para desenvolvimento
├── .env.docker.example      # Modelo para Docker
└── AGENTS.md                # Orientações para desenvolvimento
```

### O que mexer em cada lugar?

| Diretório | Quando usar |
|---|---|
| `apps/web` | Alterações de interface e acessibilidade |
| `apps/api` | Rotas, regras de negócio e backend |
| `packages/contracts` | Contrato/tipos compartilhados da API |
| `packages/design-tokens` | Cores, espaçamentos e regras visuais |
| `docs` | Documentação |
| `scripts` | Automação e ferramentas de desenvolvimento |
| `tests` | Testes do projeto |

---

# 🐳 Rodando com Docker — recomendado

Para testar o projeto completo localmente, o caminho mais simples é utilizar Docker.

## 1. Pré-requisitos

Instale:

- Git
- Node.js 24
- Docker com Compose v2

No Windows, utilize Docker Desktop com Linux containers/WSL2.

> Você não precisa instalar PostgreSQL, Prisma ou as dependências npm no computador para utilizar o fluxo Docker.

## 2. Clone o projeto

```bash
git clone https://github.com/mrJoao28/Travessia.git
cd Travessia
```

## 3. Prepare o ambiente

Execute:

```bash
npm run docker:setup
```

Esse comando cria o arquivo:

```text
.env.docker
```

com as configurações locais necessárias.

**Não publique esse arquivo no Git.**

## 4. Suba a aplicação

```bash
npm run docker:up
```

Esse comando:

1. constrói as imagens;
2. inicia o PostgreSQL;
3. aguarda o banco ficar saudável;
4. aplica as migrations;
5. inicia frontend e API.

## 5. Crie os dados de demonstração

```bash
npm run docker:seed
```

O seed cria um conjunto fictício para demonstração.

## 6. Acesse o sistema

Abra:

```text
http://localhost:3000
```

As credenciais de demonstração ficam no arquivo:

```text
.env.docker
```

Procure por:

```env
DEMO_USER_EMAIL=
DEMO_USER_PASSWORD=
```

> O seed utiliza dados fictícios. Não use essas configurações para dados reais.

---

# 💻 Rodando sem Docker

Para desenvolvimento separado do frontend e backend:

## Instalar dependências

```bash
npm ci
```

## Iniciar o frontend

```bash
npm run dev:web
```

Frontend:

```text
http://localhost:3000
```

Também existem as áreas:

```text
http://localhost:3000/aluno
http://localhost:3000/professor
```

## Iniciar a API

Em outro terminal:

```bash
npm run dev:api
```

Health check:

```text
http://localhost:3001/v1/health
```

> Para os fluxos reais da API, é necessário configurar banco de dados e autenticação conforme `docs/BACKEND-OPERATIONS.md`.

---

# 🔐 Credenciais de demonstração

As credenciais **não devem ser colocadas diretamente neste README**.

O fluxo recomendado é:

```bash
npm run docker:setup
npm run docker:up
npm run docker:seed
```

Depois:

```text
cat .env.docker
```

ou abra `.env.docker` no editor.

Você encontrará:

```env
DEMO_USER_EMAIL=...
DEMO_USER_PASSWORD=...
```

### Por que não colocar a senha aqui?

Porque o `.env.docker` é o local destinado às credenciais locais da demonstração e é ignorado pelo Git.

**Nunca faça commit de:**

- `.env.docker`
- senhas;
- tokens;
- chaves de API;
- `DATABASE_URL` real;
- `BETTER_AUTH_SECRET`;
- `GEMINI_API_KEY`.

---

# ⚙️ Comandos úteis

## Docker

| Comando | Função |
|---|---|
| `npm run docker:setup` | Cria/prepara `.env.docker` |
| `npm run docker:build` | Constrói as imagens |
| `npm run docker:db` | Inicia apenas o banco |
| `npm run docker:migrate` | Executa migrations |
| `npm run docker:up` | Sobe o ambiente completo |
| `npm run docker:seed` | Cria o dataset de demonstração |
| `npm run docker:start` | Inicia imagens já construídas |
| `npm run docker:down` | Para os containers |
| `npm run docker:logs` | Exibe logs |
| `npm run docker:smoke` | Executa verificação da demonstração |

### Verificar os containers

```bash
node scripts/docker-compose.mjs ps
```

### Ver logs

```bash
npm run docker:logs
```

---

# 🧪 Testes e validação

Antes de enviar alterações importantes:

```bash
npm run check
```

Build:

```bash
npm run build
```

Testes da API:

```bash
npm run test:api
```

Instalar o navegador usado pelo Playwright:

```bash
npx playwright install chromium
```

Executar testes:

```bash
npx playwright test
```

### Smoke test Docker

```bash
npm run docker:smoke
```

Para verificar persistência:

```bash
npm run docker:smoke
npm run docker:down
npm run docker:start
node scripts/docker-smoke.mjs --verify-persistence
```

> Os testes automatizados de acessibilidade são parciais. Eles devem ser complementados pelo roteiro manual em `docs/ACCESSIBILITY.md`.

---

# 🏗️ Arquitetura

O ambiente Docker possui três containers principais:

```text
                    ┌─────────────────────┐
                    │      Navegador       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      frontend       │
                    │      Next.js        │
                    │      :3000          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │        api          │
                    │ NestJS / BetterAuth │
                    │ Prisma              │
                    │      :3001          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │         db          │
                    │    PostgreSQL 17    │
                    │       :5432         │
                    └─────────────────────┘
```

### Comunicação

- navegador → frontend;
- frontend → API;
- API → PostgreSQL.

No Docker, a aplicação utiliza a rede interna `travessia`.

Apenas o frontend publica a porta para o host por padrão.

---

# ♿ Acessibilidade

O Travessia possui recursos de acessibilidade que permitem ao usuário ajustar, entre outros:

- tamanho do texto;
- contraste;
- espaçamento;
- quantidade de elementos decorativos.

A documentação completa está em:

```text
docs/ACCESSIBILITY.md
```

> A existência desses recursos não significa certificação de acessibilidade ou adequação pedagógica para todas as deficiências. O projeto ainda exige validações adicionais.

---

# 📚 Documentação

Antes de alterar o projeto, consulte:

| Documento | Para que serve |
|---|---|
| `AGENTS.md` | Regras gerais para desenvolvimento |
| `docs/DOCKER.md` | Docker e ambiente local |
| `docs/BACKEND-OPERATIONS.md` | Operação do backend |
| `docs/BACKEND-INTEGRATION.md` | Integração frontend ↔ backend |
| `docs/ACCESSIBILITY.md` | Acessibilidade |
| `docs/SECURITY.md` | Segurança e privacidade |
| `docs/ARCHITECTURE.md` | Arquitetura |
| `docs/DESIGN.md` | Identidade visual |
| `docs/ARTWORK.md` | Artes e referências |
| `docs/FRONTEND.md` | Orientações do frontend |
| `docs/BACKEND.md` | Orientações do backend |

> Alguns nomes/arquivos podem ser atualizados conforme a evolução do projeto. Consulte a pasta `docs/` para a documentação disponível na versão atual.

---

# 🔧 Solução de problemas

## `DATABASE_URL` ausente

Se aparecer algo parecido com:

```text
required variable DATABASE_URL is missing
```

não tente iniciar o Compose diretamente antes de preparar o ambiente.

Faça:

```bash
npm run docker:setup
```

Depois:

```bash
npm run docker:up
```

Os scripts Docker do projeto são responsáveis por carregar o ambiente correto.

---

## Alterei o código e o container não atualizou

Reconstrua as imagens:

```bash
npm run docker:build
npm run docker:up
```

---

## Quero ver o que está acontecendo nos containers

```bash
npm run docker:logs
```

ou:

```bash
node scripts/docker-compose.mjs ps
```

---

## Quero parar o projeto

```bash
npm run docker:down
```

O volume PostgreSQL é preservado pelo comando normal.

---

## Quero atualizar o projeto pelo Git

Primeiro verifique se existem alterações locais:

```bash
git status
```

Se estiver tudo certo:

```bash
git pull
```

Depois, se estiver utilizando Docker:

```bash
npm run docker:up
```

Se houver mudanças que alterem dependências ou a imagem:

```bash
npm run docker:build
npm run docker:up
```

> Evite executar `docker compose` diretamente quando a intenção for utilizar a configuração de ambiente preparada pelos scripts do projeto.

---

# 🔒 Segurança

Algumas regras importantes:

### Nunca versionar segredos

Não faça commit de:

```text
.env
.env.docker
```

nem de:

- senhas;
- tokens;
- chaves de API;
- secrets de autenticação;
- URLs privadas de banco.

### Demonstração

O seed deve ser utilizado somente com banco dedicado e dados fictícios.

### IA

O Gemini é opcional e permanece desativado por padrão.

Quando a IA está desativada:

```text
AI_ENABLED=false
```

Os fluxos manuais continuam disponíveis.

### Uploads

Uploads de arquivos permanecem desativados até existir um pipeline adequado de verificação.

---

# ⚠️ Limitações e pendências

O projeto ainda possui itens que precisam ser tratados antes de uma implantação de produção completa, incluindo:

- configuração final do Supabase;
- configuração de contas por variáveis privadas;
- validação da aplicação na URL publicada;
- integração completa da interface com a API;
- pipeline de uploads;
- configuração/validação de Gemini real;
- testes adicionais em ambiente publicado;
- validação de cookies, logout e expiração na URL final;
- validações adicionais de acessibilidade.

Portanto, **não considere o MVP automaticamente pronto para produção apenas porque ele funciona localmente**.

---

# 🔄 Fluxo recomendado para desenvolvimento

Use este fluxo no dia a dia:

```text
1. Atualizar código
       ↓
2. git pull
       ↓
3. npm run docker:up
       ↓
4. Fazer alterações
       ↓
5. npm run check
       ↓
6. npm run build
       ↓
7. npm run test:api
       ↓
8. npx playwright test
       ↓
9. git status
       ↓
10. git add / commit / push
```

Para mudanças que afetem a imagem Docker:

```bash
npm run docker:build
npm run docker:up
```

---

# 👥 Desenvolvimento em equipe

Antes de começar uma alteração:

```bash
git pull
```

Confira o estado:

```bash
git status
```

Depois de trabalhar:

```bash
npm run check
npm run build
```

Se os testes forem relevantes para a alteração:

```bash
npm run test:api
npx playwright test
```

Só então faça o commit:

```bash
git add .
git commit -m "descrição da alteração"
git push
```

---

# 🌐 Aplicação

**Versão publicada atualmente registrada no repositório:**

https://travessia-hazel.vercel.app/

> A documentação do projeto informa que a URL publicada ainda precisa passar por validação completa dos fluxos reais. Portanto, a versão publicada deve ser tratada separadamente do ambiente local validado.

---

# 📄 Licença

Consulte a configuração/licença atual do repositório antes de reutilizar ou redistribuir o projeto.

---

## 💙 Travessia

**Diferentes caminhos para aprender e avançar.**
