# Segurança e privacidade

## Estado

O scaffold contém somente telas fictícias e um health público. Não recebe dados reais nem chama o Gemini. Este documento define requisitos para os próximos PRs; não representa controles todos implementados.

## Ameaças prioritárias

| Risco | Controle exigido antes do fluxo real |
|---|---|
| Aluno altera ID e lê trabalho alheio | Sessão verificada, autorização por recurso/turma e teste HTTP negativo |
| Professor lê outra turma | Vínculo resolvido no servidor e queries com escopo |
| Cliente promove o próprio papel | Campos permitidos e criação/convite transacional, sem perfil global editável |
| Convite vaza | Token opaco com hash, validade, revogação e limite de tentativas; preferir não expor em logs/referrers |
| Arquivo malicioso ou de outra turma | Bucket privado, limites, validação, quarentena/verificação e download autorizado |
| Vazamento por logs/IA | Minimização, serialização explícita e exclusão de payloads privados dos logs/prompts |
| Uso excessivo da IA | Cota por usuário, reserva atômica por job, teto operacional e limite de saída/retries |
| Falha ou exclusão acidental | Backup e restauração testados, recuperação e trilha apropriada |

## Dados e acesso

Armazenar apenas identidade mínima, vínculos, conteúdo didático, entregas e preferências necessárias. Preferências de leitura são privadas por padrão. Relatos podem conter conteúdo sensível: evitar campos livres desnecessários, explicar destinatários antes do envio e restringir acesso. Não coletar laudos/diagnósticos no MVP. Autorizações pedagógicas e tratamento de dados requerem documentação compatível com o piloto; não presumir que um checkbox resolve todas as obrigações.

Autenticar com Better Auth e sessões persistidas no PostgreSQL conforme DEPLOY.md; aplicar autorização no NestJS. Cookies exigem estratégia CSRF, SameSite e origem; CORS não é autenticação. Prisma usa conexão de servidor: RLS não é uma proteção automática para credenciais privilegiadas. Schema de negócio sem acesso público direto; nunca expor service_role. Revogação de vínculo precisa impedir novas leituras e acesso ao job. URLs assinadas já emitidas persistem até expirar: usar validade curta e projetar revogação quando exigida.

Segredos só no servidor, fora do Git e do bundle web. Produção usa HTTPS; separar ambientes; limitar corpo de requisição e consultas; validar entrada e saída; sanitizar conteúdo rico sem confiar em HTML retornado pelo modelo. Implementar CSP apropriada à implantação antes de usuários reais, sem quebrar a aplicação com política copiada. Limitar login, convites, uploads e gerações. Evitar tokens de sessão em localStorage.

## Gemini

Acesso somente pelo backend/worker, com @google/genai e modelo configurável. Material selecionado pelo professor, revisado para envio e limitado em tamanho. Não enviar nomes, emails, matrículas, diagnósticos, relatos ou entregas automaticamente. Remover identificadores não garante anonimização; priorizar conteúdo didático sem dados pessoais.

O plano gratuito orienta não enviar informação pessoal/sensível/confidencial. Para conteúdo privado em produção, avaliar modalidade paga e condições contratuais: não uso para melhoria de produtos não significa retenção zero. Não fornecer acesso irrestrito a banco, rede ou ferramentas ao modelo. Validar JSON e conteúdo; output estruturado não garante correção pedagógica. Tratar prompt injection em arquivos como dado não confiável. Professor revisa antes de publicar; IA não decide nota final.

Os termos consultados da Gemini Developer API incluem restrição a API Clients direcionados ou provavelmente acessados por menores de 18 anos. Resolver a adequação da oferta e do público com o provedor antes de ativar uma integração para esse contexto. Não presumir que uma caixa de idade remove a restrição. A interface principal deve funcionar com IA desativada.

## Retenção e direitos

Definir prazos por categoria antes do piloto real; não escolher retenção indefinida por omissão. Projetar exportação/exclusão autorizadas, incluindo objetos no Storage, jobs, históricos e expiração de backups. Esclarecer tratamento de notas/entregas que precisem ser preservadas. Não registrar conteúdo bruto em auditoria; usar ação, ator, recurso e instante, com acesso e retenção limitados.

## Gate de dados reais

Testes HTTP de sessão inválida e isolamento A/B, testes de arquivos privados, restore de backup demonstrado, estratégia de retenção e aviso de privacidade, escopo Gemini e audiência confirmados, limites de abuso e monitoramento sem dados pessoais. Revisar permissões de banco e storage. Documentar limitações restantes sem declarar segurança absoluta ou conformidade jurídica automática.
