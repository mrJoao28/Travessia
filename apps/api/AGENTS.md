# Agente backend

Aplicam-se as regras da raiz. Leia `docs/SECURITY.md`, `docs/API.md` e `docs/agents/BACKEND.md`.

- O único endpoint inicial é `GET /v1/health`; não habilitar endpoints privados sem sessão validada, autorização e testes reais.
- Usar Better Auth e validar sessões persistidas conforme docs/DEPLOY.md. A proposta anterior de Supabase Auth foi substituída para este MVP. Nunca confiar em uma identidade apenas enviada pelo cliente.
- Resolver vínculos e escopo no servidor. Nunca aceitar `ownerId`, papel ou turma do cliente como prova de acesso.
- Prisma/credenciais privilegiadas podem ignorar RLS; filtros e autorização explícitos são obrigatórios. Schema de negócio sem acesso público direto.
- Guardar tokens de convite com hash, expiração e revogação. Consumo transacional; papel teacher não pode ser obtido por alteração do formulário.
- Não registrar payloads privados. Erros externos são genéricos; logs operacionais usam IDs de correlação sem conteúdo.
- Exclusões e exportações precisam de autorização, trilha e estratégia para objetos no Storage.
- Gerações usam referências e metadados mínimos, com autorização no momento da chamada; retries limitados e idempotência local. Sem worker permanente na Vercel.
- Não afirmar execução exatamente uma vez da chamada externa Gemini. Registrar tentativas e não publicar resultados repetidos.
- Migrations pertencem ao backend. Mudanças de contrato e lockfile precisam ser coordenadas com o frontend.
