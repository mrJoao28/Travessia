# Preparação guiada do professor

A atualização visual aprovada em 30/10/2026 usa as propostas de criação guiada e adaptação com prévia. Implementação em HTML, CSS e controles nativos, preservando a identidade Travessia/Mais Acesso. As imagens de referência não substituem a interface.

## Navegação

Três itens principais: Minhas turmas, Missões e Entregas. Turmas e convites, pedidos/barreiras e ajuda continuam acessíveis por links de contexto. Os endereços antigos de estratégias e adaptações continuam funcionando.

Cada missão tem `/professor/missoes/{id}/apoios`, com caminhos para adaptar a atividade ou preparar exemplos, checklists e outros materiais. Os links levam a versão selecionada; versões de rascunho e publicada são identificadas. Nenhum papel é concedido pela navegação: permanecem a sessão real e a autorização por turma da API.

## Criar ou editar missão

1. Sobre a missão: título, descrição, objetivos, critérios e data opcional.
2. Etapas e materiais: instruções, exemplos, ordenação por botões e material textual.
3. Apoios: caminhos opcionais para adaptação e materiais de apoio. A ajuda da IA fica recolhida e exige seleção e autorização dos textos.
4. Revisão: conteúdo completo, confirmação explícita e publicação.

Avançar da primeira tela preserva o conteúdo apenas na tela. O primeiro salvamento no servidor exige as etapas obrigatórias preenchidas; não são criados objetivos ou exemplos fictícios para contornar a validação. A indicação de conteúdo ainda não salvo permanece visível. Falhas preservam os campos e não avançam o fluxo.

Se um rascunho válido não mudou, avançar para apoios/revisão reutiliza sua versão. Assim, apoios preparados para ela não são perdidos por um salvamento redundante. Alterar conteúdo ainda cria outra versão, conforme a API existente; apoios dessa nova versão precisam de nova revisão. Voltar a uma etapa invalida a confirmação de publicação.

## Adaptar atividade

1. Para quem: turma inteira ou alunos selecionados, etapa ou missão, pedidos autorizados.
2. Ajustar a atividade: enunciado e exemplo editáveis, prévia do aluno, IA opcional e opções recolhidas de apoio/entrega.
3. Conferir: destinatários, contexto, prévia e revisão obrigatória antes de salvar.

As opções de entrega se aplicam à missão inteira, mesmo quando o enunciado é exibido em uma etapa. Texto continua disponível. Os formatos liberados para o aluno se somam. Nenhuma deficiência impõe um apoio; a IA recebe apenas material didático autorizado e rótulos genéricos, conforme os controles existentes.

Trocar de missão/versão, seguir links da interface ou recarregar com alterações pede confirmação de descarte. Os botões Voltar do assistente preservam os campos. O histórico de navegação do navegador não é um mecanismo de salvamento de rascunho. Erros preservam o conteúdo. Missões arquivadas permanecem sem edição. Remoção continua confirmada e não apaga entregas já enviadas.

## Verificação

Os testes de interface cobrem validação por etapa, teclado/foco, retorno sem perda de texto, conflito de versão, revisão obrigatória, IA controlada e reflow/axe. O cenário integrado percorre o formulário guiado, publicação, apoio individual, entrega por áudio/.txt e feedback com API, PostgreSQL e Better Auth reais. Registrar o resultado da execução no PR.

A verificação automática e a revisão visual não substituem teste com leitores de tela nem observação de professores sem experiência tecnológica. A chamada ao Gemini real depende da chave privada e não é comprovada por testes com provedor controlado. Não há mudança de schema, credenciais ou infraestrutura nesta atualização.

## Correção do fluxo de materiais e adaptações

A criação permite escolher o PDF em “Etapas e materiais”. Ao continuar, salva a versão e envia o arquivo para a fila privada; em “Apoios”, o professor escolhe aluno, confirma apoios, seleciona páginas, revisa texto/descrições e gera PDF/áudio sem sair do editor. Os ajustes do enunciado e das formas de entrega usam o mesmo aluno e a mesma versão. Sem PDF, existe o caminho “Ajustar atividade sem PDF”.

`/apoios`, `/adaptacoes` e `/estrategias` chegam ao mesmo preparador. Instruções para turma inteira e a biblioteca de checklists continuam disponíveis em seções opcionais, carregadas somente quando abertas. O aviso antigo de uploads desativados foi retirado do editor. Textos e ajustes em edição impedem avançar sem salvar ou descartar. Salvar/revisar a missão sem alterar seu conteúdo não cria outra versão nem perde os apoios preparados.

O navegador Docker adicional cobre cadastro, convites, compartilhamento de apoios, criação da missão, upload no editor, PDF e voz reais, ajuste individual de instruções/entrega, publicação da mesma versão, aluno A/B, arquivos privados, rascunho multimodal, relato compartilhado, resposta docente, envio e feedback. O runner só aceita demonstração isolada em loopback. Não usa respostas simuladas nem credenciais pessoais. Gemini desativado nesse cenário; geração Gemini continua coberta por provedores controlados nas demais suítes.

## Preparação individual simplificada

O professor escolhe aluno e PDF, confirma como disponibilizar e confere o resultado. Não há um segundo indicador de etapas dentro do editor da missão.

- Sem deficiência compartilhada: “Nenhuma deficiência informada”, com original selecionado. “Preparar uma versão com apoio” oferece três intenções: facilitar a leitura, ouvir ou organizar a explicação. Pedidos de apoio compartilhados podem orientar sugestões mesmo sem informar deficiência.
- TEA compartilhado: explicação direta e passos curtos inicialmente selecionados; explicar termos disponível para confirmar. Tamanho de fonte e contraste não aparecem como sugestões principais.
- Baixa visão compartilhada: texto ampliado, espaçamento e contraste. Outros pedidos efetivamente compartilhados ficam em “Outras opções”; não são incluídos automaticamente por associação com outra condição.

As sugestões são editáveis e não representam necessidades universais de um diagnóstico. Somente informações compartilhadas para aquela turma chegam ao professor. A escolha do aluno não é enviada ao Gemini; o pedido de geração contém os apoios genéricos e o conteúdo didático autorizado.

“Preparar prévia” também gera os arquivos de leitura e áudio, quando escolhido. Edição detalhada do texto, transcrição e ajustes da atividade ficam recolhidos. Depois de editar, atualizar a prévia invalida a revisão anterior. “Disponibilizar” exige confirmar material e destinatário. No rascunho, a entrega só aparece ao aluno depois da publicação daquela versão.

O caminho original entrega o arquivo completo verificado, sem IA nem uma nova cópia física. O endpoint `POST /v1/missions/{id}/original-materials` cria uma autorização individual com revisão explícita, expiração e versão. O aluno baixa pelo identificador dessa autorização; o endereço original da fonte continua exclusivo do professor. Não há migração. Remoção, expiração, vínculo revogado e troca da versão publicada retiram acesso. Arquivo adaptado continua limitado a quatro páginas/12 mil caracteres por preparação; o professor vê essa seleção antes de gerar.

Cobertura adicionada: ausência de declaração, TEA, baixa visão, pedido sem diagnóstico, falha preservando texto, reflow/teclado/axe; API verifica original privado, quarentena, revisão, idempotência, A/B, versão e revogação. O fluxo Docker entrega PDF/voz adaptados a A e o original a B, seguido de entrega e feedback. A execução real do Gemini continua dependendo de chave autorizada; o cenário Docker usa processamento local.


## Comparação do material e revisão individual

A área de adaptações agora utiliza o espaço aprovado de comparação: arquivos privados à esquerda, original e leitura preparada no centro e preparação/revisão à direita. A criação de missão utiliza o mesmo componente. No celular, os documentos alternam por botões identificados; zoom e paginação não provocam rolagem horizontal da página inteira.

O original é mostrado por imagens das páginas verificadas pelo worker, com texto extraído consultável. A prévia preparada utiliza HTML semântico, fonte, espaçamento e cores da configuração salva; o PDF final tem link próprio para conferir a diagramação e baixar. A prévia de leitura não pretende reproduzir a paginação do PDF exportado. Áudio, quando preparado, tem controles sem reprodução automática. Qualquer aluno pode receber apoio e os perfis continuam sendo informações compartilhadas opcionalmente.

O acesso a `material-assets/{sourceId}/page-N` é exclusivo de docentes ativos da turma, com fonte verificada, página existente, prazo válido e versão atual. Os alunos continuam usando somente adaptações liberadas e destinadas a eles. Não há ampliação de acesso ao original nem nova migração/dependência.

Trocar o PDF limpa a adaptação anteriormente selecionada; uma revisão antiga não acompanha outro arquivo. Alterar o texto ou ajustes da atividade invalida a confirmação de revisão. A leitura em edição não oferece um PDF antigo como se estivesse atualizado; é necessário gerar e conferir a nova prévia. Páginas salvas não são substituídas pela seleção padrão ao reabrir uma preparação.

As ferramentas coletivas e a biblioteca anterior permanecem em uma única seção recolhida: “Outros apoios da missão”. O fluxo principal individual permanece concentrado nos três painéis, com apenas uma ação de preparação ou disponibilização em destaque.
