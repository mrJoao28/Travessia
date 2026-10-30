# Adaptação de atividades e alternativas de entrega

## Fluxo implementado

Aluno → Meus apoios (`/aluno/apoios`): escolhe voluntariamente apoios e formatos preferidos. Pode informar uma categoria de deficiência autodeclarada ou deixar a seção vazia. Não há laudo, diagnóstico, inferência, classificação clínica nem recomendação automática por deficiência. Texto livre médico não é solicitado. Pode limpar as seleções e salvar.

As escolhas são privadas. Para cada turma em que participa como aluno, há autorização de compartilhamento com docentes ativos. Compartilhar apoios/preferências e compartilhar a deficiência são controles distintos. Compartilhar a deficiência começa desmarcado. Alterar e salvar as escolhas suspende todos os compartilhamentos anteriores e incrementa suas revisões; o aluno precisa autorizar novamente. Edições ainda não salvas impedem novas autorizações, mas não impedem revogar uma autorização já existente. A revogação bloqueia novas consultas, sem prometer apagar cópias já recebidas pelos docentes. Papéis são resolvidos no banco por turma. Outros alunos não consultam essas informações.

Professor → Adaptações (`/professor/adaptacoes`): seleciona missão e versão, consulta somente pedidos compartilhados e pode usar os apoios genéricos indicados como ponto de partida. Pode preparar uma adaptação sem qualquer declaração de deficiência. Define enunciado, exemplo opcional, apoios, etapa ou missão inteira e destinatários (turma ou alunos ativos selecionados). Os objetivos e critérios originais continuam visíveis e não são alterados. Precisa confirmar revisão antes de salvar. Em uma versão publicada, a adaptação revisada fica disponível aos destinatários; em rascunho, aguarda a publicação. Há edição com revisão otimista e remoção. Uma versão nova não herda automaticamente adaptações. Missão arquivada é somente consulta para docentes.

## Gemini

A geração reutiliza a integração Gemini de apoios, com dois rascunhos estruturados: instruções claras e exemplo comentado. O docente seleciona até três materiais e confirma a prévia do conteúdo. São enviados objetivos, enunciado original da missão ou etapa, critérios de avaliação, materiais textuais escolhidos e rótulos genéricos de apoios selecionados. Identidade, deficiência autodeclarada, respostas dos alunos, preferências privadas e registros de compartilhamento não são consultados para montar o prompt. IDs dos destinatários não são enviados. Materiais didáticos devem ser conferidos para não conter dados pessoais ou confidenciais.

Retorno validado em JSON, separado do editor até o professor escolher usar o rascunho. Usar desmarca a revisão. Nenhuma adaptação é salva ou publicada pela geração. Não há interpretação de imagem, transcrição de gravação nem geração de voz. Cotas, timeout, idempotência e autorização são os mesmos da assistência existente. A geração real depende de `AI_ENABLED`, `GEMINI_API_KEY` e `GEMINI_MODEL` configurados no backend; o fluxo manual funciona com IA desativada. Não foi realizada chamada ao provedor real sem credencial.

## Formatos de entrega

O professor pode liberar áudio e arquivo de texto, mantendo o editor de texto disponível. As permissões das adaptações destinadas ao aluno na versão publicada se somam e valem para a entrega da missão inteira, mesmo quando um enunciado é exibido em apenas uma etapa. O servidor verifica essa permissão em cada salvamento. Um aluno não consegue obter um formato ou enunciado destinado somente a outro. A preferência do aluno, sozinha, não libera formatos.

- Texto no editor: até 12 mil caracteres, como antes.
- Áudio: até 30 segundos, seleção até 10 MB, convertido no navegador para WAV PCM mono de 16 kHz e 16 bits. O backend verifica e reconstrói o formato canônico antes de persistir. Resumo textual é opcional para não exigir a duplicação da resposta em áudio. A adequação e a acessibilidade dessa alternativa para os envolvidos precisam ser combinadas com o docente.
- Arquivo de texto: somente `.txt`, UTF-8, até 32 KiB e 20 mil caracteres; sem bytes de controle binários. A aplicação não aceita PDF, DOCX, imagens ou arquivos executáveis neste fluxo. Nome original não é armazenado: o download usa `atividade.txt` com MIME `text/plain`. O conteúdo não é interpretado como HTML ou executado. É possível conferir o texto antes de enviar.

Pode combinar os formatos ou enviar somente áudio/arquivo se estiverem liberados. Uma entrega final precisa ter conteúdo em ao menos um formato. Rascunho vazio continua permitido. Anexos omitidos numa atualização são preservados; `null` remove explicitamente. Trocas concorrentes retornam conflito, preservando a edição local. Remover uma adaptação impede novos salvamentos nos formatos que deixaram de ser permitidos, mas preserva entregas já enviadas para feedback. Anexos não são enviados ao Gemini.

## Segurança e persistência

Migration aditiva `202610300004_inclusive_activities`, quatro tabelas novas com RLS e privilégios de navegador revogados, sem acesso direto público. Nenhuma conta é migrada para outro provedor e nenhum seed pessoal é executado automaticamente. Bytes de áudio e texto ficam no PostgreSQL privado, acompanhando o volume Docker existente. Não são criados novos containers ou serviços de armazenamento.

O autor pode consultar seu rascunho e anexos. Docentes ativos da turma só acessam entrega e anexos depois do envio; outros alunos, docentes de outra turma, vínculos revogados e sessões inválidas são negados. Listagens serializam somente flags dos anexos, não conteúdo binário. Leitura de anexos exige nova autorização; não existe URL pública. Download já recebido não pode ser apagado remotamente. Exclusão da conta remove suas escolhas, autorizações e entregas por cascata. Este fluxo não implementa backup/restore, política institucional de retenção ou validação clínica.

Limites: 20 adaptações por versão; 50 destinatários por adaptação; enunciado de 6 mil caracteres, exemplo de 3 mil. APIs de entregas e planos de apoio têm limite JSON de 2 MiB para gravações pequenas; autenticação e demais rotas mantêm 64 KiB. Auditoria guarda ação/ator/recurso, sem deficiência ou conteúdo pedagógico bruto. As informações autodeclaradas não concedem papéis, alteram notas ou geram rankings.

## Contratos implementados

| Operação | Método / rota |
|---|---|
| Opções genéricas | GET /v1/learning-options |
| Escolhas próprias | GET/PATCH /v1/me/learning-needs |
| Autorização por turma | GET/PATCH /v1/classrooms/{id}/needs-sharing |
| Pedidos compartilhados para docentes | GET /v1/classrooms/{id}/learning-needs |
| Adaptações para docentes | GET/POST /v1/missions/{id}/adaptations |
| Editar adaptação | PATCH /v1/missions/{id}/adaptations/{planId} |
| Remover adaptação | POST /v1/missions/{id}/adaptations/{planId}/remove |
| Enunciados e formatos do próprio aluno | GET /v1/missions/{id}/my-adaptations |
| Salvar entrega com formatos opcionais | POST /v1/missions/{id}/submissions |
| Ler áudio autorizado | GET /v1/submissions/{id}/audio |
| Ler arquivo de texto autorizado | GET /v1/submissions/{id}/text-file |

## Atualização e verificação

Após merge, `git pull origin main` e `npm run docker:up`. O comando aplica a migration explicitamente antes de subir as aplicações. Não é necessário apagar o volume nem executar seed novamente. O compartilhamento começa desativado e nenhuma deficiência é preenchida no seed.

Testes novos cobrem escolhas privadas A/B, consentimentos separados, revogação, revisão e destinatários, versões incompatíveis, edições concorrentes, bloqueio de formatos não liberados, bytes inválidos, preservação de anexos, leitura de rascunho por docente negada e feedback após envio. A geração usa provedor controlado em testes e confirma ausência de dados pessoais no payload. O navegador real percorre professor e aluno, grava áudio/arquivo, recarrega, envia e permite consulta pelo docente. O smoke Docker verifica persistência de escolhas e adaptações após recriar containers. Testes automáticos de teclado/reflow/axe não equivalem a conformidade WCAG ou eficácia pedagógica; validação com usuários e leitores de tela continua pendente.
