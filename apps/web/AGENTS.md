# Agente frontend

Aplicam-se as regras da raiz. Leia `docs/DESIGN.md`, `docs/ACCESSIBILITY.md` e `docs/agents/FRONTEND.md`.

- Preserve os avisos de demonstração até existir autenticação e persistência reais.
- Use tokens compartilhados. Cores suaves pertencem aos fundos; texto e controles têm contraste verificável.
- Ações disponíveis por teclado; links para navegação e botões para ações. Ícones com rótulos, sem dependência de hover.
- Conserve os controles nativos acessíveis quando forem adequados. Se criar diálogo, implementar foco inicial, contenção, Escape e retorno ao acionador.
- Preserve formulários e rascunhos em falhas; indique erro no campo e em resumo. Anunciar salvamento sem repetir mensagens a cada tecla.
- Editor de missões e ordenação precisam de alternativa ao arrastar e soltar.
- O contexto da turma vem da API. Esconder controles não é autorização.
- Não adicionar chamadas Gemini diretas, segredos ou dados privados aos bundles/client logs.
- Não copiar uma interface gerada como bitmap para dentro da aplicação. Implementar a identidade em componentes acessíveis.
