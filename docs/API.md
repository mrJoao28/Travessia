# Contrato e integração entre agentes

A fonte executável é `packages/contracts/openapi.json`, gerada das rotas Zod implementadas em `apps/api/src/contracts.ts`, com tipos gerados em `packages/contracts/src/api.d.ts`. As operações abaixo estão implementadas no backend; integração frontend e publicação exigem validação separada. Ver [contrato de integração](BACKEND-INTEGRATION.md) e [operação](BACKEND-OPERATIONS.md).

| Operação proposta | Permissão e regra |
|---|---|
| GET /v1/me | Sessão válida; somente perfil próprio |
| GET /v1/me/profile | Contatos e perfis acadêmicos próprios; detalhes em PROFILES.md |
| PATCH /v1/me/profile | Edição própria e transacional; campos permitidos, sem promoção de papel |
| GET /v1/strategies | Catálogo genérico; sessão válida |
| GET/POST /v1/missions/{id}/strategy-plans | Docente da turma; aplicação por versão/etapa e destinatários validados |
| PATCH /v1/missions/{id}/strategy-plans/{planId} | Docente; revisão esperada e conteúdo revisado |
| POST /v1/missions/{id}/strategy-plans/{planId}/remove | Docente; remoção com revisão esperada |
| GET /v1/missions/{id}/strategy-recipients | Docente; alunos ativos da turma, paginados |
| GET /v1/missions/{id}/supports | Aluno; somente apoios próprios/coletivos da publicação atual |
| PATCH /v1/me/preferences | Preferências próprias; campos permitidos explicitamente |
| POST /v1/classrooms | Criador autenticado torna-se docente da turma criada |
| GET /v1/classrooms | Somente turmas com vínculo ativo |
| POST /v1/classrooms/{id}/invitations | Docente da turma; gera convite student no MVP |
| POST /v1/invitations/accept | Sessão válida; token opaco, válido e não revogado; consumo transacional |
| POST /v1/classrooms/{id}/missions | Docente da turma; cria rascunho |
| GET /v1/missions/{id} | Docente da turma ou aluno com vínculo e missão publicada |
| POST /v1/missions/{id}/publish | Docente; critérios, etapas e materiais validados |
| POST /v1/missions/{id}/submissions | Aluno vinculado; autoria derivada da sessão |
| GET /v1/submissions/{id} | Autor ou docente da turma; aplicar estado de submissão apropriado |
| POST /v1/submissions/{id}/feedback | Docente da turma |
| POST /v1/steps/{id}/barriers | Participante; visibilidade e destinatários explícitos |
| GET /v1/barriers/{id} | Autor; docente apenas quando autorizado no relato |
| POST /v1/missions/{id}/ai-drafts | Docente; limites e material autorizado; geração aguardada com timeout; retorna rascunho e generationId |
| GET /v1/ai-generations/{id} | Solicitante autorizado; revalidar vínculo |

## Convenções a implementar

- Prefixo `/v1`; IDs opacos, datas ISO 8601 UTC; exclusão de campos privados por serialização explícita.
- Erros com `code`, `message` e, quando apropriado, campos inválidos e requestId. Não expor stack traces.
- Recurso privado fora do escopo responde sem revelar sua existência. Paginação com limite máximo; validação de query/body/path.
- PATCH usa lista permitida de campos; `role`, `ownerId` e vínculos não são propriedades editáveis genéricas.
- Criação de entrega, consumo de convite e publicação precisam de proteção contra repetição e concorrência.
- Upload autorizado em duas etapas: permissão/URL temporária e confirmação após verificações. Nunca aceitar uma URL arbitrária do cliente para o servidor buscar (SSRF).
- Definir estados de missão (`draft`, `published`, `archived`), entrega (`draft`, `submitted`, `reviewed`) e IA (`running`, `succeeded`, `failed`, `cancelled`) em um único contrato.
- Contrato OpenAPI acompanha a implementação. O frontend usa cliente/tipos gerados, exemplos fictícios e mocks derivados do contrato; não fabrica sucessos de operações ainda indisponíveis.

Better Auth valida sessões persistidas em cada rota privada; queries resolvem vínculos ativos no PostgreSQL. Testes HTTP usam o servidor Nest e banco PostgreSQL reais. O kernel de referência continua sendo orientação, sem substituir esses testes. Upload de arquivos novos permanece desabilitado.
