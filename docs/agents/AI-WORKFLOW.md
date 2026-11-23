# Fluxo de desenvolvimento web com IA

Este documento define como dividir correções de bugs e funcionalidades web no Travessia. O objetivo é reduzir trabalho duplicado e consumo de contexto sem abrir mão da revisão, acessibilidade ou segurança.

## Papéis

| Participante | Responsabilidade principal | Entrega esperada |
|---|---|---|
| **Codex — coordenação e integração** | Lê as instruções e o código relevante, define escopo e critérios de aceite, escolhe o menor grupo necessário, revisa diffs, resolve a integração e registra testes/limitações. Implementa diretamente tarefas pequenas ou que cruzem várias camadas. | Uma mudança integrada à branch da tarefa, com verificações reproduzíveis e resumo objetivo. |
| **Antigravity — implementação e verificação visual de frontend** | Implementa tarefas visuais isoladas em `apps/web`, reproduz problemas no navegador, avalia reflow/responsividade e verifica interações visuais. Pode sugerir ou aplicar correção no próprio worktree. | Branch/worktree própria, arquivos e screenshots quando úteis, comandos executados e problemas restantes. |
| **Google AI Studio — prototipação visual opcional** | Explora alternativas de layout, conteúdo e estados de interface em Build mode/annotation mode. Serve para protótipos e experimentos de frontend curtos. | Protótipo privado ou diff isolado que descreve a ideia; não é entrega pronta para produção. |
| **Especialista de backend, quando necessário** | Atua em `apps/api`, contratos, persistência, autenticação/autorização, Gemini e testes de API conforme `docs/agents/BACKEND.md`. | Mudança de backend isolada, contrato atualizado quando necessário e testes de permissão/regressão. |

Codex e Antigravity são os participantes preferenciais para o desenvolvimento do produto. Não crie agentes/espaços adicionais por padrão: abra outro papel apenas quando a tarefa puder ser separada por arquivos, interfaces e critérios de aceite sem dependências de edição simultânea.

## Seleção rápida do fluxo

| Tipo de tarefa | Fluxo recomendado |
|---|---|
| Bug pequeno em uma área, texto ou estilo | Codex implementa e valida o diff. Antigravity pode reproduzir visualmente se o bug depender de navegador. |
| Bug visual ou responsivo difícil de reproduzir | Codex define cenário e aceite; Antigravity reproduz e corrige em worktree própria; Codex revisa e roda a suíte aplicável. |
| Nova tela ou ferramenta de interface | Codex verifica contratos e arquitetura; Antigravity implementa o fluxo acessível. Google AI Studio pode explorar alternativas visuais em um protótipo descartável, antes da implementação final. |
| Mudança com frontend e backend | Dividir em tarefas por camada e combinar o contrato primeiro. Backend propõe/implementa contrato; frontend revisa e integra seu consumo. Codex coordena a sequência e o aceite de ponta a ponta. |
| Pergunta de design ainda sem especificação | Google AI Studio pode gerar uma ou duas opções isoladas. Codex compara com `docs/design/APPROVED.md`, `docs/ACCESSIBILITY.md` e o produto antes de escolher o que vale implementar. |

## Procedimento por tarefa

1. **Definir o problema:** registrar comportamento atual, resultado esperado, passos para reproduzir e telas/rotas envolvidas. Não ampliar o escopo por inferência.
2. **Ler instruções locais:** `AGENTS.md`, `apps/web/AGENTS.md` e os guias pertinentes em `docs/agents/`, produto, design, acessibilidade, API e segurança.
3. **Inspecionar antes de editar:** localizar componentes, contratos, testes existentes e histórico relevante. Separar falha confirmada de hipótese.
4. **Dividir pelo menor corte útil:** Codex mantém a coordenação. Uma contribuição paralela só começa com escopo, arquivos principais, branch/worktree e aceite definidos. Não atribuir o mesmo arquivo a Codex e Antigravity simultaneamente.
5. **Implementar na branch própria:** uma funcionalidade por branch, commits pequenos; preservar as mudanças existentes e nunca limpar o worktree alheio. Não incluir dependências ou mudanças de arquitetura sem justificativa.
6. **Validar o comportamento:** executar a suíte relevante, tipo/build conforme o escopo, e os fluxos de teclado, foco, contraste, 320px/reflow e leitor de tela conforme aplicável. Screenshots/Axe ajudam, mas não substituem testes manuais. Registrar exatamente o que foi verificado.
7. **Integrar:** Codex revisa o diff e contratos, executa os checks necessários, resolve conflitos preservando ambas as intenções e reúne alterações em PR. Merge/deploy segue a autorização do usuário e o fluxo do repositório.
8. **Relatar:** resultado, branch/PR, testes passados e impedimentos; distinguir protótipo, código integrado, deploy e validação em produção.

### Modelo breve para delegação

```text
Objetivo:
Comportamento atual e reprodução:
Resultado esperado / critérios de aceite:
Área e arquivos sob sua responsabilidade:
Fora de escopo / arquivos compartilhados:
Branch e worktree:
Verificações esperadas:
Formato da entrega (diff, commit, evidências, limitações):
```

Use critérios observáveis e concisos. Não peça a um agente para “melhorar tudo” sem telas, estados, prioridades e limites definidos.

## Uso recomendado do Google AI Studio

Google AI Studio Build mode aceita prompts e edição por anotação, mostra uma prévia ao vivo e pode importar código do GitHub, sincronizar alterações nos dois sentidos e exportar um ZIP. A interface web gerada usa React por padrão e pode incluir runtime Node.js, instalações npm, secrets server-side e configuração automática de Firebase. Veja a [documentação oficial de Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode).

No Travessia, use-o **como laboratório de interface**, não como autoridade de arquitetura ou deploy:

- Comece com um protótipo privado e dados fictícios. Peça apenas a tela/componente e estados necessários; não envie entregas, relatos de barreira, perfis, dados de turma, exports de banco, arquivos privados ou segredos.
- Se importar/sincronizar no GitHub, use repositório de protótipo ou branch de funcionalidade dedicada, nunca `main` ou `prod`. Confirme o destino de cada sincronização e revise cada commit gerado antes de integrar.
- Traga a ideia para o repositório Travessia como patch pequeno e seletivo. Reescreva o necessário para Next.js/TypeScript, estilos e componentes existentes; não transplante a aplicação completa gerada.
- Não aceite configuração automática de Firebase Auth/Firestore, novos provedores, Gemini client-side, publicação Cloud Run nem mudança de hospedagem como consequência implícita do protótipo. O produto usa Better Auth, PostgreSQL/Prisma, APIs existentes e a hospedagem documentada; toda mudança arquitetural precisa de proposta e revisão separadas.
- Nunca use uma chave em prompt, código de navegador ou commit. Chaves Gemini ficam no backend e em secrets do ambiente apropriado, conforme `AGENTS.md` e `docs/SECURITY.md`. AI Studio documenta seu próprio armazenamento server-side de chaves, mas isso não autoriza mover a chave do produto para lá. Consulte também [segurança de chaves Gemini](https://ai.google.dev/gemini-api/docs/api-key).
- Não publique/deploye protótipos do Travessia pelo botão do AI Studio. O deploy do produto segue `docs/DEPLOY.md` e `docs/DOCKER.md` após revisão e autorização.

### Decisão de integração

**Aprovado para piloto limitado:** prototipar e comparar elementos puramente visuais com conteúdo fictício; revisar manualmente e adaptar à aplicação real. **Não aprovado como fluxo padrão de integração direta ao monorepo:** o Build mode pode gerar uma aplicação React/Node completa, adicionar Firebase e sincronizar código ao GitHub, o que diverge do stack, autenticação, armazenamento e deploy atuais. Reavaliar após um piloto curto usando apenas uma tarefa descartável de UI e medir qualidade do diff, retrabalho, acessibilidade e risco de sincronização.

O Antigravity também oferece agente de navegador que pode operar a aplicação local, inspecionar erros de console/rede, capturar telas e verificar mudanças visuais. Use essa capacidade para validação, sem tratá-la como substituto dos Playwrights do repositório nem da verificação manual de teclado/leitor de tela. A disponibilidade depende da superfície e versão do Antigravity; consulte a [documentação oficial do navegador](https://antigravity.google/docs/browser).

## Fontes consultadas

- Google AI for Developers, [Build apps in Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), consultada em 22/11/2026.
- Google AI for Developers, [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key), consultada em 22/11/2026.
- Google Antigravity Docs, [Browser use](https://antigravity.google/docs/browser), consultada em 22/11/2026.
