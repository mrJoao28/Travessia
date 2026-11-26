# Identidade visual — Travessia / Mais Acesso Conecta

## Direção

Identidade próxima ao Mais Acesso Conecta, conforme nova solicitação do usuário e assets do arquivo `public.zip`. Interface universitária clara, superfícies brancas, azul institucional, azul suave e amarelo pontual. Manter a marca Travessia e a organização por atividades. Preservar o logo original Mais Acesso Conecta; usar uma variante separada com azul clareado sobre superfícies escuras.

## Tokens

| Token | Cor | Aplicação |
|---|---|---|
| background | #F5F8FC | Fundo |
| surface | #FFFFFF | Painéis e leitura |
| primary | #075A9C | Navegação, marca e ações |
| text | #173651 | Texto principal |
| muted | #50657A | Texto secundário |
| sage | #EAF2FC | Azul suave; nome legado mantido por compatibilidade |
| terracotta | #205FA7 | Destaque azul; nome legado mantido por compatibilidade |
| gold | #F8D879 | Acento amarelo com texto escuro |
| focus | #995100 | Foco visível |

A fonte compartilhada continua em packages/design-tokens. Cores de texto e botões foram escurecidas em relação à arte para garantir contraste. Não usar amarelo claro como texto no branco. Modo de contraste ampliado tem tokens próprios. O script check:foundation verifica os oito pares de texto usados na base.

## Modo escuro

O tema escuro é opcional e alternado por um botão no cabeçalho (sol no modo claro, lua no escuro). A preferência “Mais contraste” fica no painel “Aa · Ajustar leitura”, junto aos ajustes de texto e espaçamento, e funciona nos dois temas. A escolha é persistida localmente no navegador; o tema não faz parte do contrato atual de preferências da conta. Os tokens são aplicados globalmente e também ajustam os controles nativos com `color-scheme: dark`.

A troca usa uma transição curta entre as duas paletas e anima o ícone do botão; navegadores sem suporte à transição de tela aplicam o tema imediatamente. A transição não roda quando o sistema solicita movimento reduzido.

| Token | Escuro | Alto contraste escuro |
|---|---|---|
| background | #111A24 | #000000 |
| surface | #1B2A38 | #000000 |
| primary / on-primary | #8CC8FF / #10283A | #9AEAFF / #000000 |
| text | #F3F6F8 | #FFFFFF |
| muted | #C0CBD5 | #F3F3F3 |
| sage | #294052 | #161616 |
| terracotta | #FFB58C | #FFD3B5 |
| gold / on-gold | #F8D879 / #173651 | #FFEB00 / #000000 |
| border | #6F8292 | #FFFFFF |
| focus | #FFD166 | #FFFF00 |

Pares de contraste do tema escuro: texto/fundo 16,16:1; texto/superfície 13,48:1; texto secundário/fundo 10,65:1; texto secundário/superfície 8,88:1; texto de ação/fundo azul 8,52:1; destaque/superfície 8,53:1; texto/azul suave 9,93:1; texto sobre amarelo 8,97:1; foco/fundo 12,17:1. São cálculos dos tokens, não uma auditoria de cada estado ou validação completa WCAG.

## Composição

No tema claro, a sidebar é branca com marca Travessia, navegação azul e assinatura Mais Acesso Conecta. No tema escuro, superfícies, controles e artes usam as variantes escuras. O cabeçalho separa contexto, leitura, aparência e conta. Atividade principal usa texto e etapas reais à esquerda e arte decorativa à direita. Área docente usa arte própria de planejamento. Login combina apresentação azul suave, ilustração fornecida e formulário branco no tema claro. Botões principais arredondados, ícones de linha e tipografia do sistema sem download externo.

No celular e tablet, um cabeçalho compacto reúne marca, botão Menu e conta. Os destinos e ajustes de leitura ficam em um painel modal aberto sob demanda; colunas viram uma e artes laterais são ocultadas. Conteúdo e controles permanecem disponíveis. As preferências de tema, contraste, tamanho e espaçamento são independentes; reduzir decoração remove as ilustrações. Testar também reflow a 320px, texto 200%, cores do sistema e movimento reduzido. As artes não contêm dados reais nem métricas.

## Escopo

Login, aluno, professor, leitor, editor, entregas e barreiras compartilham os mesmos tokens. Alterações de interface devem manter contratos e persistência em sincronia quando novos campos fizerem parte do fluxo. Não adicionar logos de clientes/parceiros do ZIP, pois não representam vínculos específicos do Travessia. Detalhes das artes e prompts em design/ARTWORK.md. A referência marfim/verde anterior fica apenas como histórico.

## Formatos de resposta por etapa

O editor docente permite configurar formatos de resposta por etapa. Controles de seleção usam superfícies opacas para manter legibilidade; ações da atividade têm hierarquia principal/secundária e opções destrutivas recolhidas. A tela de resposta mantém rótulos associados e grupos semânticos. Gabaritos são privados para quem revisa; não há correção automática. Ver formatos, princípios e ideias futuras em [ACTIVITY-INTERACTIONS.md](ACTIVITY-INTERACTIONS.md).

## Preparação guiada docente

Em 30/10/2026 o usuário aprovou aplicar as propostas de criação de atividade em passos e adaptação com prévia. O professor vê três destinos principais, uma ação dominante por etapa e ajuda da IA opcional/recolhida. Os apoios ficam no contexto da atividade, com versão e destinatários explícitos. Detalhes de persistência, revisão e validação: [TEACHER-INTERFACE.md](TEACHER-INTERFACE.md).

## Menu lateral recolhível

O botão no início do cabeçalho alterna o menu completo e uma faixa com o símbolo da marca e os ícones. Mantém a indicação da página atual, nomes acessíveis e dicas visuais no hover ou foco por teclado. Escape dispensa as dicas; o ponteiro pode alcançá-las sem que desapareçam. O conteúdo aproveita a largura disponível e os componentes de formulários permanecem montados.

A escolha fica somente na chave local `travessia:sidebar:v1`; sem armazenamento, o controle funciona na página atual. Não altera preferências de leitura, sessões ou permissões. Em telas de até 1024 CSS px, a navegação usa um painel modal vertical, aberto pelo botão Menu; os ícones não ocupam linhas permanentes acima do conteúdo. O estado desse painel não altera a preferência de faixa de ícones do computador. Ajuda, leitura e aparência ficam no próprio painel. Detalhes e validação: [MOBILE-NAVIGATION.md](MOBILE-NAVIGATION.md). As dicas usam os tokens de texto/superfície (contraste já verificado na fundação), respeitam as cores do sistema e não animam automaticamente. Testes incluem professor/aluno, teclado, dicas dispensáveis/alcançáveis, persistência, rascunho, axe e reflow de 320px com texto a 200%. Isso não substitui validação com usuários de leitores de tela.
