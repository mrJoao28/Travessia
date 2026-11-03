# Libras para navegação

O botão flutuante “Libras” abre um diálogo na interface pública, nos espaços autenticados e na prévia. O serviço só é carregado após “Ativar VLibras”. Fechar remove o quadro, interrompe seus scripts e devolve o foco ao botão. Reabrir não carrega o serviço automaticamente. A navegação e os formulários existentes permanecem montados.

## Escopo e isolamento

Este recurso oferece um guia em Libras para os nomes e orientações dos menus. Não captura o texto da página atual. Não traduz materiais, enunciados, PDFs, áudios, entregas, feedback ou relatos. Não modifica as adaptações pedagógicas existentes e não oferece tradução certificada ou substituição de intérprete humano.

O widget oficial captura textos do documento em que é instalado. Por isso não inserimos seu script no documento principal do Travessia. `navigationLibrasDocument` gera apenas textos fixos de um catálogo versionado. Não recebe DOM, seleção, rota, parâmetros, identificadores, conta, material, preferências acadêmicas ou formulários. Tema claro/escuro e um token efêmero de correlação são os únicos parâmetros.

O documento fica em `srcdoc` com `sandbox="allow-scripts"`, sem `allow-same-origin`, formulários, navegação do topo, downloads ou popups. A origem opaca impede leitura do DOM, cookies e armazenamento do pai. Não existe ponte para comandos, tradução livre ou navegação da aplicação. Mensagens são aceitas somente do quadro atual, de origem `null`, com o token da sessão e estados enumerados (`ready`, `error`, `close`). O pai não responde com dados. O token não é credencial de acesso.

A política de conteúdo do quadro permite scripts apenas do domínio oficial, do caminho CDN da organização oficial `cdn.jsdelivr.net/gh/spbgovbr-vlibras/` e inline do documento gerado, conexões aos domínios VLibras, imagens oficiais/data, fontes oficiais/CDN e o iframe oficial (incluindo os redirecionamentos ao caminho CDN oficial). Não libera scripts de analytics do CDN nem conexões com analytics. A política do site principal não foi ampliada. `referrerPolicy` e meta referrer impedem encaminhamento da URL privada como referência. A fronteira de isolamento é o sandbox, não filtros CSS ou atributos de exclusão de tradução.

A integração usa o script oficial `https://vlibras.gov.br/app/vlibras-plugin.js` e mantém a interface/marca/avatares do fornecedor dentro do quadro. O botão do Travessia é um controle próprio identificado como “Libras para navegação”. Nenhum avatar, marca ou tradução foi reempacotado como material didático.

## Uso

1. Abrir “Libras”. Ler a informação de serviço externo e ativar.
2. No guia, ativar o botão azul oficial para carregar o avatar.
3. Selecionar um nome ou orientação do guia. Os itens usam botões nativos, inclusive para teclado.
4. Fechar pelo controle “Fechar Libras” ou pelo fechamento do diálogo. Escape no documento do guia também solicita fechamento ao pai.

O widget oficial possui menus e tradutor próprios. O usuário pode digitar por iniciativa própria nesse serviço, mas o Travessia não preenche esse tradutor com conteúdo privado. A versão e a disponibilidade do serviço são controladas pelo fornecedor. `ready` significa botão/guia disponível; não prova que o avatar ou uma tradução terminaram. Falha ou timeout inicial permite tentar novamente sem alterar o rascunho da aplicação.

## Arquitetura e limitações

Somente frontend; sem migrations, serviço Docker, Gemini ou chave adicional. Há custo de rede/CPU do avatar no navegador após ativação. A aplicação principal mantém os controles acessíveis se o serviço externo falhar. Preferências/tema do próprio VLibras podem ter comportamento diferente por estar isolado sem armazenamento persistente. O quadro inclui seu próprio scroll, principalmente em telas pequenas.

A tradução é automática e pode errar termos e contexto. Testes de teclado, reflow e axe da integração não representam validação linguística em Libras nem teste manual com usuários surdos ou leitores de tela. O comportamento interno do avatar/menus depende do fornecedor. O tema é capturado na ativação; fechar e reabrir aplica uma nova escolha.

## Testes

`tests/browser/navigation-libras.spec.ts` usa um carregador de teste explicitamente controlado para verificar opt-in, instância única, login/professor/aluno, sandbox e leitura negada do pai, ausência de conteúdo privado no documento, rejeição de mensagens falsas, preservação do rascunho/menu, fechamento, retry, axe, temas e reflow a 320px com texto a 200%.

`VLibras service smoke` é uma execução separada, sem segredos, que usa o serviço oficial com somente texto público de navegação. Roda em PRs que alteram a integração e pode ser acionada manualmente. Verifica carregador, aplicação e solicitação de tradução; depende de rede, CORS, disponibilidade do VLibras e WebGL. Não avalia correção dos sinais ou compreensão humana. Comando: `npx playwright test --config=playwright.vlibras.config.ts`.

Referências consultadas: [integração oficial](https://www.vlibras.gov.br/doc/widget/installation/webpageintegration.html), [tradução por seleção](https://www.vlibras.gov.br/doc/widget/functionalities/text-translation.html), [política de conteúdo](https://www.vlibras.gov.br/doc/widget/installation/content-security-policy.html), [termos e privacidade](https://www.vlibras.gov.br/privacy.html) e [código-fonte oficial](https://github.com/spbgovbr-vlibras/vlibras-web-browsers). Os termos possuem restrições a atividades educacionais; esta integração limita-se a orientações de uso da interface. Não houve autorização institucional específica nem validação jurídica de enquadramento.
