# Demonstração — Brazil Conference

O Travessia será apresentado como MVP na competição Brazil Conference. Esta informação define foco de demonstração; regulamento, critérios e prazos ainda não foram fornecidos. Não inventar exigências da competição.

## Conta solicitada

- Nome: Joao Felipe.
- Curso: Engenharia da Computação.
- Email: configurar privadamente como DEMO_USER_EMAIL com o endereço informado pelo usuário.
- Senha: configurar privadamente como DEMO_USER_PASSWORD com a credencial informada pelo usuário. Nunca incluir valor no repositório, prompts versionados ou interface.

Conta e turmas são criadas pelo comando manual `npm run db:seed:demo`, implementado no backend. Requer credenciais e banco dedicado configurados privadamente; ver [operação](BACKEND-OPERATIONS.md). Implementar o seed não significa que a conta pessoal já foi criada no Supabase.

## Isolamento

Banco Supabase dedicado a demo, DEMO_MODE=true e DEMO_ONLY=true, sem dados reais de estudantes. Cadastro público e emails reais desabilitados. Better Auth com sessão persistida e hash da biblioteca; exceção de comprimento 5 apenas nesse ambiente para a credencial curta solicitada, nunca como padrão para usuários reais. Fora da demo, política forte e configuração que rejeita exceção. A conta pode ser estudante e professora em turmas distintas; contextos permitidos vêm da API, sem trocar papéis arbitrariamente.

## Dataset inicial

| Turma | Papel da conta principal | Cenário |
|---|---|---|
| Programação I | Aluno | “Uma biblioteca para todos”: 5 etapas, atual 2/5; planejamento em rascunho |
| Cálculo Aplicado | Aluno | “Energia no campus”: etapas parcialmente concluídas; entrega enviada, aguardando avaliação |
| Estatística | Aluno | “O tempo na fila”: entrega revisada, feedback docente com orientação de melhoria |
| Oficina de Projetos Inclusivos | Professor | 8 alunos fictícios, 2 entregas enviadas, 1 revisada, missão publicada e rascunho para edição |

Na oficina, incluir um relato fictício “O material está disponível apenas como imagem”, autorizado para o docente, com possibilidade de responder. Criar também caso de relato não compartilhado para testes; esse caso não pode aparecer no painel do professor. Professores/alunos fictícios usam endereços reservados em example.invalid, sem envio de mensagem. Materiais didáticos são exemplos próprios e sem dados pessoais.

Status, etapas, entregas e feedback precisam ser entidades reais no banco. Não basta simular contagens no frontend. Datas usam data-âncora persistida do seed e janelas coerentes para demonstração. Reexecutar seed não altera progresso nem duplica registros. A migração/seed não roda em build ou cold start.

## Roteiro curto de apresentação

1. Entrar com a conta configurada, abrir Programação I e retomar a etapa 2.
2. Usar preferências de leitura e consultar exemplo da etapa.
3. Salvar uma atividade e consultar entrega com feedback já existente em Estatística.
4. Mudar para contexto docente permitido da Oficina.
5. Ver entregas, responder à barreira compartilhada e editar/publicar uma missão.
6. Se Gemini estiver habilitado, gerar um rascunho com material fictício, revisar e publicar; se indisponível, usar rascunho pré-criado claramente identificado.

Não expor senha/email em gravações, prints ou console. Usar banner discreto “Ambiente de demonstração · dados fictícios”. Os fluxos principais continuam utilizáveis com IA desativada. Reset de demo via CLI, nunca por endpoint público.
