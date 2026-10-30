# Cadastro e primeiros passos

## Fluxo

`/login` oferece “Criar uma conta”, que abre `/cadastro`. A tela segue a proposta aprovada: azul e branco, ilustração inclusiva lateral, seleção “Sou aluno” / “Sou professor”, nome, e-mail, senha (12–128 caracteres) e confirmação. A ilustração muda conforme o espaço; utiliza os WebP já aprovados do projeto. No celular, a arte lateral é ocultada e os campos continuam em uma coluna. A senha pode ser mostrada/ocultada e aceita colagem/gerenciadores.

O cadastro usa Better Auth pelo proxy de mesma origem; hashing e sessão persistida pertencem à biblioteca. Não há senha/token em localStorage. Campos e envio ficam desabilitados até a hidratação; o formulário nativo usa POST. A confirmação da senha só é validada no navegador e não é enviada. Nome é validado/aparado no servidor, senha tem limites no servidor, e cadastro/login têm cotas persistentes separadas. Uma conta confirmada não é cadastrada novamente se apenas a consulta posterior da sessão falhar: a interface oferece entrar na conta existente. Falhas preservam os campos, mostram resumo com foco e, para senhas diferentes, erro associado à confirmação.

Após confirmar a sessão, `/boas-vindas?espaco=aluno` apresenta o convite do professor; `espaco=professor` apresenta a criação da primeira turma. Ambos podem fazer depois e completar dados acadêmicos em Meu perfil. Nada é publicado ou criado automaticamente ao escolher um espaço.

A escolha é orientação de navegação, não um papel global. O cadastro não envia role, turma ou ownerId. A API cria o vínculo docente somente na turma que a própria pessoa cria; convite válido cria vínculo aluno somente na turma correspondente. O menu da conta permite mudar de espaço mesmo sem vínculos, para que novos professores possam iniciar. Login posterior escolhe o espaço pelos vínculos reais: aluno quando possui vínculo aluno, professor quando só possui vínculo docente, primeiros passos quando não possui nenhum. Não há integração de contas com o Mais Acesso.

## Escopo e operação

Não há nova migration nem reset de contas/senhas existentes. Perfis acadêmicos continuam opcionais e editáveis no endpoint próprio; o cadastro não exige matrícula, disciplina, curso, deficiência, diagnóstico, laudo ou CPF. Verificação de e-mail e recuperação de senha por e-mail ainda não estão implementadas; não há envio de mensagens nesta entrega. O cadastro está habilitado também para testes locais de demonstração: criar somente contas fictícias nesse ambiente. O seed continua recusando bases com contas externas ao dataset; não deve ser usado para apagar ou reinicializar contas novas.

A branch main é a base para validação/testes locais; prod é a produção. Esta entrega é uma branch de funcionalidade com PR para main. Atualização de prod/deploy exige uma integração posterior deliberada.

## Verificação

Testes HTTP reais validam cadastro, sessão, nome, senha curta, e-mail repetido e ausência de acesso às turmas existentes. Testes de interface usam transporte controlado para testar recuperação, confirmação divergente, preservação ao trocar espaço, teclado, reflow a 320px/200% e axe. O runner real de navegador também cadastra um professor e um aluno com PostgreSQL/Better Auth, cria turma e convite pela interface, aceita o convite e verifica bloqueio de operações docentes do aluno. O cenário existente de missão→entrega→feedback permanece. CI Docker testa as imagens e persistência. Esses testes não equivalem a validação com usuários ou leitor de tela.
