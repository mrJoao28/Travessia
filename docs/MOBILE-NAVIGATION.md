# Menu em celular, tablet e computador

## Comportamento

Até 1024 CSS px, o menu lateral permanente sai da área de conteúdo. O cabeçalho apresenta a marca Travessia, o botão **Menu**, a conta e uma linha própria para **Área do professor/aluno**. A identificação não disputa os poucos pixels restantes com três controles.

O botão abre um painel vertical nativo de diálogo com destinos nomeados, página atual, ajustes de leitura/aparência recolhidos e Ajuda. Os ajustes ficam dentro do painel, sem popovers atravessando a tela. O conteúdo da missão e os formulários continuam montados.

No computador, o menu lateral e sua faixa de ícones continuam disponíveis. A escolha local `travessia:sidebar:v1` não é alterada ao abrir ou fechar o painel móvel. Ao redimensionar para computador, o painel fecha e o bloqueio de rolagem é removido.

## Teclado e foco

O diálogo recebe um nome acessível. Ao abrir, o foco vai para Fechar (ou para o ajuste solicitado por um link de leitura). O navegador mantém o foco no diálogo e deixa o fundo inerte. Escape, Fechar e clique no fundo externo fecham o painel; o foco retorna ao botão Menu. Navegar para outro destino também fecha o painel. Fechar o painel não descarta rascunhos.

Os links de leitura por fragmento continuam funcionando no celular: o painel abre antes de mostrar a preferência. O diálogo permite rolagem vertical, inclusive em paisagem e com texto ampliado; seu cabeçalho mantém o botão Fechar acessível durante a rolagem.

## Verificação

- Matriz existente: criação e revisão de missão, materiais, PDF/áudio, entrega e perfil, em Chromium, Firefox e WebKit.
- Casos adicionais: cabeçalho fechado e menu aberto de aluno/professor em 320, 390, 705, 844 (paisagem) e 1024 px.
- Verificação do caso relatado: 705×607, tema escuro e texto 200%, sem a identificação quebrada em letras.
- Foco inicial, Tab/Shift+Tab, fundo inerte, Escape, retorno de foco, links, estado do computador e liberação da rolagem ao redimensionar.
- Ajustes móveis, persistência de leitura/tema e preservação do rascunho.
- Medidas de altura do cabeçalho, posição inicial do conteúdo, largura da identificação, limites dos links e alvos de toque.
- Axe e screenshots dos estados aberto/fechado nos artefatos do workflow Responsive workspaces; capturas móveis de referência também no workflow Foundation.

Os resultados de execução ficam no PR. Testes de janela simulada não substituem aparelhos físicos, teclado virtual e NVDA/VoiceOver. Não se afirma conformidade WCAG completa a partir desses testes.
