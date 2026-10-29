# Contrato e integração entre agentes

A fonte executável atual é `packages/contracts/openapi.json`, versão 0.1.0. Apenas `GET /v1/health` existe. A tabela abaixo é **proposta para implementação**, não lista de endpoints prontos.

| Operação proposta | Permissão e regra |
|---|---|
| GET /v1/me | Sessão válida; somente perfil próprio |
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

Não existe autenticação real nesta entrega. A política de referência testada será integrada aos guards e queries na fase de backend, com testes HTTP de acesso.
