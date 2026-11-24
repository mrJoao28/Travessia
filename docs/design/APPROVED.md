# Referência visual atual

O usuário solicitou aproximar o Travessia do Mais Acesso Conecta, forneceu `public.zip` e autorizou a criação de artes complementares e aplicação no repositório.

A fonte visual atual é o site https://www.maisacessoconecta.com.br/ e os arquivos fornecidos: logo Mais Acesso Conecta, `professor/auth-illustration.png` e `landing/hero-illustration.png`. O nome Travessia e a aprendizagem por atividades são preservados. A antiga `reference-student.png` permanece como registro histórico, sem vincular novas alterações ao marfim/verde.

Usar azul, branco, amarelo pontual, ilustração editorial adulta e colaboração entre pessoas. As imagens não substituem conteúdo ou controles. Manter leitura, contraste, teclado, reflow e redução de decoração. Procedência e prompts: ARTWORK.md.

## Padrões de alinhamento de ações e áreas expansíveis

- Alinhe a ação principal ao título da seção em telas largas. Em telas estreitas, coloque-a depois do texto introdutório e permita largura total; nunca posicione por coordenadas fixas.
- Agrupe ações relacionadas com espaçamento visível (mínimo de 0,75rem) e alvos de pelo menos 44×44 CSS px. Use links para navegar e botões para executar ações; em telas largas, mantenha ações em linha quando couberem e permita quebra ou empilhamento no celular.
- Prefira rótulos curtos e claros, sem depender de ícone, hover ou cor para explicar a ação. Preserve foco visível, texto que pode quebrar e contraste dos estados.
- Use `<details>` e `<summary>` nativos para conteúdo opcional. O resumo deve identificar a área e pode trazer uma dica curta; mantenha os alvos de teclado, o marcador nativo e o conteúdo legível quando aberto.
- Organize áreas irmãs em uma grade responsiva quando isso reduzir rolagem; ao abrir conteúdo amplo, permita que ele ocupe a largura disponível. Reavalie com zoom, texto ampliado e viewport de 320 CSS px.

## Ações claras no percurso de atividades

- A conta, os filtros e as áreas recolhíveis devem parecer controles acionáveis: alvos amplos, foco visível e rótulos que expliquem o resultado.
- Em uma atividade do aluno, a ação principal de cada etapa intermediária salva o rascunho e avança para a próxima. A ação de envio aparece somente na última etapa; antes do envio, a pessoa revisa e confirma.
- Relatos de barreira ficam disponíveis em uma área recolhida e de menor ênfase, com um acionador direto que explique como abri-la.
- Em áreas docentes, convites, participantes, avaliações e feedback usam resumos recolhíveis com apresentação consistente de botão e estado expandido.
