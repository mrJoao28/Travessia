# Primeiros passos e convites

## Professor

Depois de criar uma turma, a página mostra três ações: convidar alunos, preparar a primeira missão e acompanhar respostas. O convite pode ser preparado antes ou depois da missão. O botão de convidar abre a área de participantes com foco visível. Se já existe um rascunho, a ação retoma esse rascunho; quando há missão publicada, aparece o painel habitual.

Em **Gerar convite de aluno**, o professor recebe um código aleatório de oito caracteres e um link. Pode copiar qualquer um ou preencher um e-mail e escolher **Convidar por e-mail**. Esse botão abre uma mensagem pronta no aplicativo de e-mail do professor; ele confere o destinatário e envia. O Travessia não envia a mensagem por um serviço SMTP nem confirma entrega. Sem aplicativo configurado, use **Copiar link**. Nenhum e-mail é enviado durante os testes ou pela prévia.

O convite da turma permite a entrada de vários alunos durante sete dias, até ser desativado. **Convites ativos** lista metadados persistidos e permite desativar convites anteriores mesmo depois de recarregar a página. Códigos e links só são mostrados ao gerar, pois o banco guarda hashes. Desativar bloqueia novas entradas pelos dois formatos; alunos que já entraram continuam com seus vínculos. Remover um vínculo é uma operação separada.

## Aluno

O aluno pode digitar o código (inclusive em minúsculas ou com separadores) ou colar o link da própria instalação. Ao abrir o link, vê as opções de entrar ou criar conta. O convite continua após login/cadastro e o aluno precisa confirmar **Entrar na turma**; abrir um link nunca cria vínculo automaticamente.

Depois de entrar em uma turma sem atividade, a página explica que a missão ainda será publicada. Quando aparece uma missão e não há trabalho anterior, a ação principal é **Começar minha primeira missão**. Com rascunho ou atividade já existente, o percurso continua mostrando retomada.

## API e compatibilidade

- `POST /v1/classrooms/{id}/invitations` aceita `{ reusable: true }` para o convite compartilhado. Retorna `id`, `code`, `token`, `reusable`, `createdAt` e `expiresAt`; exige docente ativo da turma.
- O corpo antigo `{}` continua criando convite de uso único. Convites antigos de 64 caracteres continuam funcionando sem mudança de validade ou consumo.
- `GET /v1/classrooms/{id}/invitations` lista apenas metadados dos convites ativos, com paginação e autorização docente. Não retorna códigos, tokens ou hashes.
- `POST /v1/invitations/accept` aceita o código canônico de oito caracteres ou o token antigo. Exige sessão; sempre cria vínculo de aluno. A normalização de links/minúsculas acontece na interface.
- Aceite e revogação usam transações serializáveis. Vínculo existente ou revogado impede reentrada; um código não promove a conta a docente.
- Limites persistentes: 30 emissões/hora/turma, 20 tentativas de aceite/hora/usuário e 300 tentativas/minuto no conjunto da aplicação. Códigos de oito caracteres usam 40 bits aleatórios; essa conveniência depende dos limites, da expiração e da restrição de compartilhamento.

O segredo do convite viaja no fragmento `#convite=...`, sem entrar em consultas HTTP, referrers ou logs de acesso do servidor. O armazenamento temporário da aba conserva somente esse convite, nunca uma sessão de login. Se o navegador bloquear esse armazenamento, os links entre as telas continuam carregando o fragmento. Aceitar ou escolher **Fazer isso depois** limpa o convite pendente. O token nunca concede acesso sem a sessão e o vínculo verificados no servidor.

## Atualização e testes

A migration `202611020001_classroom_invites` adiciona campos à tabela existente. Não altera contas, vínculos ou convites anteriores. Execute as migrations pelo fluxo normal antes de iniciar a nova API: `npm run db:migrate` para execução direta ou `npm run docker:migrate` nos containers; `npm run docker:up` e o deploy de prod já incluem a tarefa explícita de migration.

Os testes incluem atualização de banco anterior com convite preservado, concorrência entre dois alunos, uso único legado, expiração, desativação por link/código, isolamento docente/aluno, vínculo revogado e limitação de tentativas. A interface cobre teclado, foco, axe, reflow, mensagem de e-mail, turma vazia e continuidade sem armazenamento. O fluxo integrado usa cadastro, sessão e banco reais; testa convite antes do cadastro e o início da primeira missão publicada. Capturas de tela não substituem observação de usabilidade com professores e estudantes.
