# Perfis de alunos e professores

O Travessia possui contas próprias, com Better Auth. A referência do Mais Acesso foi utilizada para selecionar campos acadêmicos; não há sincronização, importação de usuários ou login compartilhado com o Mais Acesso Conecta.

## Modelos e campos

| Modelo | Dados |
|---|---|
| User | Identidade existente: nome, e-mail de acesso, foto e verificação de e-mail |
| Profile | Contatos opcionais: telefone e e-mail alternativo |
| StudentProfile | Matrícula, instituição de ensino, unidade/campus, curso e período |
| TeacherProfile / TeachingAssignment | Até 20 associações ordenadas entre disciplina e curso |
| Membership | Papel e vínculo ativo por turma; continua sendo a fonte de autorização |

StudentProfile e TeacherProfile usam userId único com chave estrangeira para User. A mesma conta pode ter ambos. Ensino é uma relação de um professor para várias associações: Cálculo I → Engenharia de Computação e Cálculo I → Engenharia Elétrica são associações diferentes. A mesma dupla não pode aparecer repetida, inclusive quando os textos diferem apenas por espaços externos ou maiúsculas/minúsculas. Nenhuma dessas associações cria ou concede acesso a uma turma.

Turno e coordenação não fazem parte do cadastro de aluno. CPF, diagnóstico, laudo, dados de candidatos, expiração comercial e módulos institucionais não foram acrescentados. Instituição é um texto acadêmico opcional, sem novo módulo ou entidade institucional. Matrícula não é globalmente única, pois instituições diferentes podem usar o mesmo identificador.

## Interface e API

Após entrar, abrir **Menu da conta → Meu perfil**. A rota `/perfil` oferece três formulários independentes: conta/contatos, aluno e professor. No professor, adicionar uma linha por disciplina e curso, remover linhas e salvar. Os campos acadêmicos são opcionais, permitindo completar registros antigos gradualmente; toda linha docente adicionada exige disciplina e curso. A edição preserva o texto quando a requisição falha. O e-mail alternativo é contato, não é um segundo login. O e-mail de acesso e a verificação não podem ser alterados nessa tela.

- `GET /v1/me/profile`: lê somente o perfil da sessão validada, com `student` e `teacher` nulos quando ainda não existem.
- `PATCH /v1/me/profile`: atualiza somente a própria conta; nome e contatos comuns opcionais, `student` parcial e `teacher.teachings` como substituição explícita da lista inteira.
- Campo omitido permanece como está; `null` limpa um contato/campo acadêmico. `teacher: { teachings: [] }` remove as associações. O objeto `student` não aceita turno/coordenação, e nenhum nível aceita proprietário ou papel enviados pelo cliente.
- A escrita de contatos, aluno e professor em uma mesma requisição é transacional. A identidade vem da sessão. Payload estrito, tamanhos máximos, proteção de origem/CSRF e rate limit existentes continuam aplicados.
- `GET /v1/me` mantém o campo `course` por compatibilidade, agora lido de StudentProfile. O contato e os perfis acadêmicos não foram acrescentados às respostas de membros, entregas, chamadas Gemini ou listagens docentes.

Os tipos da interface e os contratos OpenAPI são gerados das rotas implementadas. Não existe endpoint público para consultar o perfil de outra pessoa. Criar/preencher TeacherProfile não promove o usuário; criar turma e aceitar convites seguem as regras existentes. O cadastro é feito na própria plataforma, com nome, e-mail e senha. A conta nova não recebe papel: aluno e professor continuam definidos pelo vínculo com a turma.

## Atualização de uma instalação Docker existente

Com a branch desta funcionalidade atualizada (ou main depois do merge), manter `.env.docker` e executar:

```sh
npm run docker:down
npm run docker:up
```

O primeiro comando para os containers sem remover o volume, evitando que a API antiga continue usando a coluna removida durante a atualização. O segundo recompila as imagens, inicia o banco, aplica a migration e inicia as aplicações novas. Não usar `down --volumes`, não recriar credenciais e não apagar o banco. O seed não é necessário para atualizar dados existentes.

A migration copia Profile.course para StudentProfile.course antes de remover a coluna antiga; a coluna de destino mantém texto sem truncar cursos anteriores. Também cria perfis vazios para vínculos ativos de aluno/professor que ainda não possuem perfil, sem inventar matrícula ou disciplinas. Identidades, hashes de senha, sessões, turmas, entregas e preferências são preservados. Novas tabelas seguem a política privada/RLS existente. Código anterior à migration precisa de restauração compatível; não é um rollback automático de imagem.

O seed de demonstração cria os perfis fictícios em bancos novos e não substitui campos ou disciplinas já editados. Em bancos existentes, o perfil de professor criado pela migration pode iniciar sem disciplinas; elas são preenchidas em Meu perfil.

## Verificação

O runner `npm run test:api` cria PostgreSQL isolado e também exercita um upgrade real do schema anterior, incluindo curso antigo longo, hash, sessão, vínculos e RLS. Testes HTTP cobrem perfis duplos, privacidade entre alunos/docentes, atualização parcial, limpeza, remoção de disciplinas, campos indevidos, tamanhos, duplicações e tentativas de promoção. Testes de navegador verificam edição, persistência após recarregar, foco ao adicionar/remover linhas, recuperação de falha, reflow e axe. O smoke Docker verifica os perfis nas imagens de produção e após recriar os containers com o mesmo volume. Esses testes não equivalem a validação manual com leitor de tela ou com usuários.
