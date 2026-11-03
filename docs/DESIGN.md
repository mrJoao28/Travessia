# Identidade visual — Travessia / Mais Acesso Conecta

## Direção

Identidade próxima ao Mais Acesso Conecta, conforme nova solicitação do usuário e assets do arquivo `public.zip`. Interface universitária clara, superfícies brancas, azul institucional, azul suave e amarelo pontual. Manter a marca Travessia e a organização por missões. Preservar o logo original Mais Acesso Conecta; usar uma variante separada com azul clareado sobre superfícies escuras.

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

O tema escuro é opcional e fica no painel “Tema e contraste”, separado dos ajustes de texto e espaçamento. É independente da preferência “Mais contraste”. A escolha é persistida localmente no navegador; o tema não faz parte do contrato atual de preferências da conta. Os tokens são aplicados globalmente e também ajustam os controles nativos com `color-scheme: dark`. O alto contraste permanece disponível sobre os temas claro e escuro.

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

No tema claro, a sidebar é branca com marca Travessia, navegação azul e assinatura Mais Acesso Conecta. No tema escuro, superfícies, controles e artes usam as variantes escuras. O cabeçalho separa contexto, leitura, aparência e conta. Missão principal usa texto e etapas reais à esquerda e arte decorativa à direita. Área docente usa arte própria de planejamento. Login combina apresentação azul suave, ilustração fornecida e formulário branco no tema claro. Botões principais arredondados, ícones de linha e tipografia do sistema sem download externo.

No mobile, navegação passa para o topo, colunas viram uma e artes laterais são ocultadas. Conteúdo e controles permanecem disponíveis. As preferências de tema, contraste, tamanho e espaçamento são independentes; reduzir decoração remove as ilustrações. Testar também reflow a 320px, texto 200%, cores do sistema e movimento reduzido. As artes não contêm dados reais nem métricas.

## Escopo

Login, aluno, professor, leitor, editor, entregas e barreiras compartilham os mesmos tokens. Sem mudança de schema, autenticação, contratos ou infraestrutura nesta etapa. Não adicionar logos de clientes/parceiros do ZIP, pois não representam vínculos específicos do Travessia. Detalhes das artes e prompts em design/ARTWORK.md. A referência marfim/verde anterior fica apenas como histórico.

## Preparação guiada docente

Em 30/10/2026 o usuário aprovou aplicar as propostas de criação de missão em passos e adaptação com prévia. O professor vê três destinos principais, uma ação dominante por etapa e ajuda da IA opcional/recolhida. Os apoios ficam no contexto da missão, com versão e destinatários explícitos. Detalhes de persistência, revisão e validação: [TEACHER-INTERFACE.md](TEACHER-INTERFACE.md).

## Menu lateral recolhível

O botão no início do cabeçalho alterna o menu completo e uma faixa com o símbolo da marca e os ícones. Mantém a indicação da página atual, nomes acessíveis e dicas visuais no hover ou foco por teclado. Escape dispensa as dicas; o ponteiro pode alcançá-las sem que desapareçam. O conteúdo aproveita a largura disponível e os componentes de formulários permanecem montados.

A escolha fica somente na chave local `travessia:sidebar:v1`; sem armazenamento, o controle funciona na página atual. Não altera preferências de leitura, sessões ou permissões. Em telas pequenas, a navegação continua no topo, com ícones em linhas que se ajustam à largura e com acesso a Ajuda e Preferências de leitura. As dicas usam os tokens de texto/superfície (contraste já verificado na fundação), respeitam as cores do sistema e não animam automaticamente. Testes incluem professor/aluno, teclado, dicas dispensáveis/alcançáveis, persistência, rascunho, axe e reflow de 320px com texto a 200%. Isso não substitui validação com usuários de leitores de tela.

## Libras para navegação

Botão flutuante com nome visível abre um diálogo com ativação explícita do VLibras e um guia de textos fixos da interface. O script externo permanece em quadro isolado; não captura a página atual nem materiais. O controle e o diálogo usam tokens, foco visível e temas da plataforma. Há espaço no fim da página para que o botão não esconda o último controle. Escopo, uso, privacidade e testes: [NAVIGATION-LIBRAS.md](NAVIGATION-LIBRAS.md).
