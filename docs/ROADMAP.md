# Roteiro de evolução do Travessia

Este roteiro transforma a proposta em etapas de produto. A ordem prioriza uma experiência fluida e acessível e não representa compromisso de prazo. Consulte [`PRODUCT.md`](PRODUCT.md) para a proposta, limites e estado conhecido; detalhes operacionais ficam nos documentos de cada área.

## Base disponível

O repositório já inclui aplicações web e API, sessão autenticada, autorização por turma, atividades com versões, fluxos de entrega e feedback, materiais, preferências de leitura e uma prévia interativa fictícia. A implantação atual usa containers no servidor Mais Acesso com Cloudflare na borda.

Essa base técnica não equivale a um piloto validado. Recursos de demonstração, testes automatizados e integrações opcionais devem continuar identificados como tais.

## Prioridade 1 — Preparar um piloto responsável

**Objetivo:** garantir que o fluxo completo seja previsível, acessível e operável com um grupo pequeno.

- Confirmar política de retenção, suporte, recuperação de conta e resposta a incidentes.
- Revisar login, convites, permissões de turma, arquivos e ações de exclusão com cenários de acesso autorizado e não autorizado.
- Validar teclado, leitor de tela, ampliação, reflow, contraste e conteúdo real das atividades.
- Testar com professores e estudantes, incluindo pessoas com diferentes necessidades de acesso, sem exigir diagnóstico.
- Resolver elegibilidade e condições do provedor antes de usar IA com dados ou público reais; manter o fluxo principal funcional sem IA.

**Saída esperada:** piloto delimitado, responsáveis e suporte definidos, barreiras prioritárias registradas, dados de demonstração separados de dados reais e limitações comunicadas.

## Prioridade 2 — Validar o percurso de aprendizagem

**Objetivo:** entender se as pessoas conseguem percorrer o ciclo da atividade sem perder contexto.

1. Professor cria turma e convida estudantes.
2. Professor publica atividade com objetivos, etapas, materiais e critérios.
3. Estudante encontra a atividade, compreende o próximo passo, salva e retoma o trabalho.
4. Estudante envia a entrega e recebe confirmação.
5. Professor consulta a entrega e fornece feedback.
6. Estudante encontra e compreende o feedback.

Observar compreensão, pontos de bloqueio, perda de conteúdo, clareza de estados e tempo de suporte necessário. Tempo não deve ser usado como medida de capacidade ou aprendizagem.

## Prioridade 3 — Refinar acessibilidade e clareza de ponta a ponta

**Objetivo:** reduzir esforço desnecessário em toda a navegação e nos formulários.

- Padronizar rótulos, hierarquia de botões, confirmações e estados de salvamento/erro.
- Preservar conteúdo quando a rede falhar, a sessão expirar ou uma validação impedir o avanço.
- Melhorar navegação por teclado e leitor de tela em listas, diálogos, seletores e fluxos longos.
- Validar alternativas de leitura, áudio e documento gerado com as tecnologias disponíveis.
- Transformar barreiras observadas em critérios de aceite e regressão.

## Prioridade 4 — Consolidar planejamento e acompanhamento docente

**Objetivo:** apoiar o trabalho do professor sem multiplicar telas e operações repetidas.

- Revisar criação, edição, versão, revisão e publicação de atividades.
- Confirmar escopo de cada recurso de professor/monitor e garantir sua autorização no servidor.
- Tornar entregas, critérios, feedback e pedidos compartilhados fáceis de localizar.
- Verificar que personalizações e equipes são específicas da atividade e respeitam as permissões da turma.

## Prioridade 5 — Medir utilidade e decidir próximos investimentos

**Objetivo:** aprender com o piloto antes de ampliar público ou complexidade.

Acompanhar indicadores de processo com finalidade explícita: conclusão de etapas, clareza do feedback percebida, barreiras comunicadas/resolvidas e esforço para preparar/acompanhar atividades. Usar amostras pequenas como evidência exploratória. Não criar ranking, perfil de capacidade, vigilância individual ou conclusões de eficácia sem desenho e validação apropriados.

Com estudantes e docentes, revisar os achados, as barreiras persistentes e as prioridades. Atualizar este roteiro com decisões e evidências, sem assumir que mais funcionalidades significam melhor experiência.

## Depois do MVP — sujeito a decisão

- Integrações institucionais e relatórios agregados com finalidade e privacidade definidas.
- Expansão de formatos e fluxos de material após validar acessibilidade e segurança.
- Recursos de monitoria autenticados, caso haja necessidade confirmada e regras de autorização claras.
- Integração Gemini em produção somente após resolver público elegível, condições de uso, minimização e revisão humana.
- Modelos operacionais e comerciais após evidência do piloto.

## Fora do roteiro atual

Diagnóstico, perfil clínico, detecção de deficiência, decisão automatizada de nota, ranking, tutor irrestrito, LMS completo e vigilância de comportamento seguem fora do escopo, conforme [`PRODUCT.md`](PRODUCT.md).
