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

Trocar de missão/versão ou sair com alterações pede confirmação de descarte. Erros preservam o conteúdo. Missões arquivadas permanecem sem edição. Remoção continua confirmada e não apaga entregas já enviadas.

## Verificação

Os testes de interface cobrem validação por etapa, teclado/foco, retorno sem perda de texto, conflito de versão, revisão obrigatória, IA controlada e reflow/axe. O cenário integrado percorre o formulário guiado, publicação, apoio individual, entrega por áudio/.txt e feedback com API, PostgreSQL e Better Auth reais. Registrar o resultado da execução no PR.

A verificação automática e a revisão visual não substituem teste com leitores de tela nem observação de professores sem experiência tecnológica. A chamada ao Gemini real depende da chave privada e não é comprovada por testes com provedor controlado. Não há mudança de schema, credenciais ou infraestrutura nesta atualização.
