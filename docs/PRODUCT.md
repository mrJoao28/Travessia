# Proposta de produto — Travessia

## Resumo executivo

O Travessia é uma plataforma de aprendizagem por atividades para o ensino superior. Sua proposta central é oferecer uma **experiência fluida e acessível**, na qual cada estudante entende o que precisa fazer, consegue avançar no próprio ritmo, encontra apoios úteis sem precisar apresentar um diagnóstico e mantém uma comunicação clara com o professor.

O produto conecta planejamento docente, participação do estudante e acompanhamento pedagógico em um mesmo percurso: o professor organiza uma atividade com objetivos, etapas e critérios; o estudante consulta as instruções, realiza e entrega o trabalho; o professor acompanha, responde e oferece feedback. Acessibilidade faz parte de cada etapa desse percurso, em vez de ser uma área separada ou um modo especial.

O Travessia apoia o ensino e a comunicação. Não substitui o julgamento pedagógico do professor, não diagnostica estudantes e não decide notas finais automaticamente.

## Proposta de valor

| Público | Necessidade | Valor que o Travessia oferece |
|---|---|---|
| Estudantes | Saber por onde começar, o que se espera e como pedir apoio | Atividades organizadas, etapas identificadas, contexto para retomar, preferências individuais e canais de comunicação |
| Professores e monitores | Planejar, publicar e acompanhar atividades sem perder de vista os diferentes percursos | Ferramentas para estruturar atividades, preparar materiais, acompanhar entregas e dar feedback |
| Instituições e programas educacionais | Apoiar práticas de ensino mais inclusivas e acompanhar a implementação | Uma plataforma de apoio à atividade pedagógica, inicialmente validada em pilotos; não é um painel institucional no MVP |

### Promessa do produto

> Em cada atividade, estudante e professor conseguem entender o próximo passo, acessar os apoios necessários e acompanhar o trabalho até o feedback.

Essa promessa orienta decisões de navegação, conteúdo, acessibilidade e prioridades de desenvolvimento. Não é uma garantia de conformidade universal nem de resultados de aprendizagem sem validação.

## Princípios da experiência

1. **Orientação clara:** usar nomes e ações previsíveis, explicar objetivos, entregas e critérios antes de começar e identificar a etapa atual.
2. **Continuidade:** preservar o trabalho em andamento, explicar o que foi salvo e permitir retomar sem depender de memória ou de uma sequência rígida.
3. **Escolha sem estigma:** oferecer preferências e apoios opcionais a qualquer pessoa, sem exigir diagnóstico e sem presumir necessidades por rótulos.
4. **Acessibilidade no fluxo principal:** manter operação por teclado, nomes acessíveis, foco visível, conteúdo responsivo, contraste adequado e alternativas de apresentação.
5. **Objetivos de aprendizagem preservados:** variar instruções, apoios e formatos de resposta quando forem pedagogicamente coerentes, sem alterar automaticamente o objetivo ou a avaliação.
6. **Relação humana:** o professor revisa atividades e materiais, acompanha entregas e decide notas. A IA pode apoiar o planejamento, mas não toma decisões pedagógicas finais.
7. **Privacidade compreensível:** informar quem pode ver um dado antes do compartilhamento e limitar seu uso ao necessário para a atividade.
8. **Interface consistente:** ações importantes devem ter rótulos claros, hierarquia visual previsível e estados de sucesso, espera e erro que não apaguem o trabalho.

## Públicos e papéis

### Estudante

Consulta suas turmas e atividades, compreende objetivos e critérios, acompanha etapas, utiliza apoios opcionais, trabalha individualmente ou em equipe conforme a configuração da atividade, envia entregas, recebe feedback e pode relatar barreiras. Suas preferências e relatos não devem ser visíveis a outros estudantes por padrão.

### Professor

Organiza turmas e convites, cria e revisa atividades, define etapas, materiais, critérios e formatos de entrega, decide regras de equipe, acompanha entregas, fornece feedback e responde a relatos compartilhados.

### Monitor

Pode apoiar atividades quando a autorização e as capacidades correspondentes estiverem implementadas para a turma. Não deve ganhar acesso apenas por conhecer um link ou por estar indicado em dados do navegador. A demonstração de monitoria na prévia é simulada e não concede permissões no ambiente autenticado.

### Instituição

Pode ser uma compradora ou parceira futura. Módulo institucional, gestão de múltiplas instituições e relatórios institucionais não fazem parte do MVP atual.

Os papéis são definidos pelo vínculo da pessoa com cada turma. Uma pessoa pode ser estudante em uma turma e professora em outra.

## Percursos centrais

### 1. Preparar e publicar uma atividade

1. Professor cria ou seleciona uma turma.
2. Define título, contexto, objetivos e critérios da atividade.
3. Organiza o trabalho em etapas com instruções e materiais.
4. Escolhe se a atividade será individual, em grupo ou mista; em uma atividade de grupo ou mista, pode permitir que estudantes formem a equipe ao iniciar. Caso contrário, professor/monitor organiza os integrantes.
5. Prepara apoios e alternativas compatíveis com o objetivo de aprendizagem.
6. Revisa a prévia do estudante e publica explicitamente.

IA, quando habilitada, pode sugerir um rascunho a partir de material didático selecionado. O conteúdo continua privado até revisão e publicação pelo professor.

### 2. Realizar e entregar uma atividade

1. Estudante abre a atividade e consulta objetivos, critérios, etapas, materiais e formatos permitidos.
2. Escolhe apoios disponíveis e, se permitido, define equipe para aquela atividade.
3. Trabalha nas etapas, salva rascunho e retoma o contexto quando necessário.
4. Avança entre as etapas. A entrega final ocorre ao concluir a última etapa, conforme as regras do fluxo.
5. Recebe confirmação clara do que foi salvo ou enviado e pode consultar feedback docente.

### 3. Comunicar barreiras e apoios

1. Estudante descreve uma dificuldade relacionada à atividade, sem precisar informar diagnóstico ou dado de saúde.
2. Antes de compartilhar, a interface explica quem receberá o relato.
3. Professor autorizado consulta e responde aos relatos compartilhados.
4. Preferências e relatos privados continuam sob controle de acesso do servidor.

### 4. Acompanhar e dar feedback

1. Professor localiza entregas por turma/atividade.
2. Consulta o trabalho e os critérios definidos.
3. Registra feedback relacionado ao trabalho.
4. Estudante consulta a devolutiva e usa a orientação para continuar aprendendo.

### 5. Trabalhar em equipe

As equipes pertencem à atividade, e não ao perfil permanente do estudante. Quando a criação pelos estudantes estiver permitida, a pessoa que inicia se torna líder e pode adicionar integrantes elegíveis da própria turma segundo as regras do servidor. A remoção de integrantes, mudança de liderança e alterações administrativas ficam sob controle docente.

## Capacidades do produto e estado conhecido

Esta seção diferencia a proposta do estado do código e das demonstrações. “Implementado” indica que existe fluxo de aplicação/API documentado ou código correspondente; não equivale por si só a validação com usuários, operação com dados reais ou certificação.

| Área | Capacidade proposta | Estado conhecido |
|---|---|---|
| Identidade e turmas | Login, perfis e vínculo por turma | Better Auth, sessões persistidas e autorização por turma documentados; revisar operação real e recuperação de conta antes de piloto amplo |
| Atividades | Criar, editar, versionar, revisar e publicar | Fluxo de criação guiada e publicação implementados; consultar `docs/TEACHER-INTERFACE.md` |
| Etapas do aluno | Ler instruções, salvar progresso, retomar e entregar | Fluxos de atividade/entrega implementados; validação de uso com estudantes ainda é necessária |
| Entregas e feedback | Enviar trabalho e receber retorno docente | Capacidades integradas com API; validar política operacional de retenção e fluxos de suporte |
| Barreiras e apoios | Relatar dificuldades e preparar apoios | Compartilhamento explícito e materiais individuais documentados; confirmar destinatários e privacidade em testes de cada fluxo |
| Preferências de leitura | Ajustar apresentação para cada pessoa | Preferências individuais e controles de leitura disponíveis; verificar cada tela e conteúdo |
| Equipes | Organização por atividade e inclusão de colegas autorizada | Política de formação e gestão por atividade descrita na interface e segurança; remoção depende de ação docente |
| Materiais | Processar material, oferecer leitura/áudio e alternativas | Worker de materiais implementado; documentos e saídas exigem revisão humana e verificação operacional |
| IA no planejamento | Gerar sugestões estruturadas e revisáveis | Adaptador Gemini opcional no backend; disponibilidade real depende de configuração, elegibilidade do público e condições do provedor |
| Prévia de perfis | Demonstrar percursos sem afetar dados reais | Área `/previa` é uma simulação local com dados fictícios; não cria sessão, permissões nem chamadas reais de API |
| Monitoria avançada | Apoio com permissões limitadas e propostas revisadas | Fluxo demonstrativo na prévia; não assumir como capacidade autenticada enquanto contrato e autorização do servidor não estiverem implementados |
| Relatórios institucionais | Visão de adoção e resultados agregados | Fora do MVP; qualquer definição futura requer finalidade clara, minimização de dados e participação dos usuários |

## Acessibilidade e qualidade de uso

O alvo técnico do projeto é **WCAG 2.2 nível AA**, com orientações W3C COGA como material suplementar. Isso é uma meta de engenharia, não uma declaração de conformidade. Ver requisitos e roteiro de validação em [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

Requisitos que sustentam uma experiência fluida e acessível:

- navegação sem mouse, foco visível e ordem de leitura lógica;
- textos ampliáveis, reflow, contraste e espaçamento sem perda de conteúdo;
- alternativas textuais e equivalentes para informações visuais ou em áudio;
- formulários com rótulos, instruções, erros associados e preservação do que já foi escrito;
- etapas identificadas, ações previsíveis e estado de salvamento compreensível;
- suporte a preferências individuais sem impor um “modo” baseado em diagnóstico;
- ausência de contagens regressivas de pressão, rankings, streaks punitivos ou movimento essencial;
- testes automatizados, testes manuais com tecnologia assistiva e avaliação com pessoas com diferentes necessidades.

Automação, revisão visual e existência de controles de acessibilidade não comprovam sozinhas que toda a experiência é acessível. Registrar ambiente, cobertura, limitações e resultados de validação.

## Privacidade, confiança e limites da IA

- Coletar apenas dados necessários à identidade, vínculo, atividade, entrega, feedback e preferências.
- Não coletar laudos ou diagnósticos no MVP e não inferir deficiência por uso, nota ou comportamento.
- Aplicar autorização no backend por sessão, turma e recurso; dados do navegador não concedem papel ou permissão.
- Relatos de barreira permanecem privados até que a pessoa escolha compartilhá-los, com o destinatário explicado.
- Não enviar automaticamente entregas, nomes, emails, relatos, preferências ou conversas a um provedor de IA.
- O professor seleciona material permitido, revisa sugestões e decide o que publicar.
- Não usar IA para decidir nota final, diagnosticar ou determinar elegibilidade de apoio.
- Manter a aplicação utilizável quando o recurso de IA estiver desativado.
- Resolver elegibilidade etária, termos, finalidade e tratamento de dados antes de habilitar IA em produção para esse público.

Mais detalhes: [`SECURITY.md`](SECURITY.md) e [`BACKEND-OPERATIONS.md`](BACKEND-OPERATIONS.md).

## Escopo do MVP

O recorte inicial é apoiar um piloto pequeno — por exemplo, uma turma e algumas atividades — e observar se os fluxos centrais são compreensíveis, acessíveis e úteis. A sequência proposta é:

1. professor organiza turma e convite;
2. professor publica atividade com objetivos, etapas e critérios;
3. estudante realiza e envia o trabalho;
4. professor acompanha e fornece feedback;
5. estudante consegue retomar e comunicar barreiras com controle de privacidade.

O piloto deve acompanhar participação, progresso/conclusão das etapas, clareza do feedback e resolução de barreiras. Esses dados são exploratórios: tempo de uso, velocidade, quantidade de cliques ou preferência de leitura não devem ser tratados como medida de capacidade ou aprendizagem.

## Fora do escopo atual

- diagnóstico, laudos, perfis clínicos ou detecção de deficiência;
- correção ou atribuição automática de nota final;
- rankings, punições por sequência perdida ou competição de velocidade;
- tutor de IA irrestrito, publicação automática ou decisão pedagógica autônoma;
- LMS completo, videoconferência ou rede social;
- módulo institucional e relatórios de vigilância individual;
- monetização e pagamentos automáticos;
- promessas de suporte universal a qualquer documento ou tecnologia assistiva sem validação.

## Como avaliar se a proposta funciona

Avaliar com estudantes e professores, incluindo pessoas com diferentes necessidades de acesso e familiaridade tecnológica. Usar tarefas reais e consentidas, sem exigir informação clínica desnecessária.

Perguntas de avaliação:

1. A pessoa entende a finalidade da atividade, a etapa atual, o próximo passo e o critério de conclusão?
2. Consegue iniciar, pausar, retomar e concluir usando os dispositivos e tecnologias assistivas disponíveis?
3. Consegue encontrar e ativar um apoio sem revelar diagnóstico ou pedir ajuda para operar a interface?
4. Professores conseguem preparar, revisar e acompanhar uma atividade sem repetição ou perda de contexto?
5. A comunicação sobre entrega, erro, salvamento, feedback e compartilhamento é compreensível?
6. Os apoios mantêm os objetivos pedagógicos e são percebidos como escolhas úteis?

Registrar achados, barreiras, mudanças realizadas e limitações. Não generalizar resultados de um piloto pequeno para todas as pessoas ou instituições.

## Decisões e pendências

- A fonte pedagógica especializada indicada pelo usuário ainda precisa ser fornecida e analisada; não atribuir recomendações a uma fonte ausente.
- Definir, antes de um piloto com dados reais, retenção por tipo de dado, suporte, recuperação de conta, exportação/exclusão e processo de incidentes.
- Validar com usuários os percursos de aluno e professor, inclusive teclado, leitor de tela, zoom, reflow, conteúdo de atividades e documentos gerados.
- Verificar os termos e a adequação da integração Gemini ao público e ao uso pretendido antes de ativá-la.
- Registrar o que foi testado em infraestrutura real e o que ainda é apenas teste automatizado ou simulação.

## Documentos relacionados

- [`ACCESSIBILITY.md`](ACCESSIBILITY.md) — requisitos e roteiro de validação de acessibilidade.
- [`TEACHER-INTERFACE.md`](TEACHER-INTERFACE.md) — criação de atividades, apoios e formação de equipes.
- [`INTERACTIVE-PREVIEW.md`](INTERACTIVE-PREVIEW.md) — limites e roteiro da demonstração fictícia.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitetura e responsabilidades técnicas.
- [`SECURITY.md`](SECURITY.md) — privacidade, autorização e limites operacionais.
- [`ROADMAP.md`](ROADMAP.md) — sequência de evolução do produto.
- [`REFERENCES.md`](REFERENCES.md) — fontes técnicas e pendências pedagógicas.
