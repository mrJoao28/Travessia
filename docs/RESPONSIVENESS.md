# Responsividade dos espaços de professor e aluno

## Alterações

- A navegação passa para o topo em larguras de até 1024 CSS px. O menu continua recolhível para ícones; rótulos e nomes acessíveis são preservados.
- Cabeçalho e ações podem quebrar linha. Os cartões e campos usam menos espaço lateral em telas estreitas, inclusive quando aninhados.
- Grades do editor, perfil e leitura também respondem à largura disponível dentro do espaço de trabalho, em vez de depender apenas da janela. Isso evita manter duas colunas quando a barra lateral e o texto ampliado deixam pouco espaço.
- A bancada de materiais adapta arquivos, controles e comparação à largura do seu próprio contêiner. Em telas pequenas, a comparação apresenta Original/Preparado por alternância. A ampliação do PDF rola dentro do leitor; a página inteira não deve ganhar rolagem horizontal.
- A altura do leitor de documentos considera a altura visível, inclusive no celular em paisagem. Os demais formulários continuam com altura livre.
- Após ativar um atalho de navegação, sua dica visual fecha. Na execução inicial em Firefox e WebKit, a dica persistente do menu impedia clicar em Ajustar leitura no celular. A correção mantém dicas disponíveis por foco e hover, Escape e navegação por teclado.
- O conteúdo ganha um limite de largura em monitores muito grandes, preservando o alinhamento e o espaço de leitura.

## Evidência da comparação inicial

Base CSS: `9749473afeb79201fc3eb9580dd90bd8e66d53df`. As medidas abaixo vieram de Chromium, com dados fictícios e os mesmos estados antes/depois:

| Estado | Antes | Depois |
|---|---:|---:|
| Campos das etapas, 320 px e texto 200% | 118 px | 236 px |
| Campos das etapas, tablet 1024 px | 649 px | 905 px |
| Campos das etapas, celular 320 px | 217 px | 236 px |
| Campo da preparação individual, 320 px e texto 200% | 188 px | 260 px |
| Revisão da missão, 1280 px e texto 200% | Cabeçalho invisível; fluxo interrompido | Visível; fluxo concluído |

A primeira matriz Chromium completou 325 observações (25 estados × 13 formatos), sem rolagem horizontal da página. Esses números descrevem aquela execução inicial, não certificam acessibilidade nem substituem as execuções posteriores ampliadas.

## Regressão automatizada

Configuração: `playwright.responsive.config.ts`; cenários: `tests/responsive/layout.spec.ts`.

A matriz ampliada tem 15 perfis por engine: 320×568, 360×800, 390×844, 430×932, 844×390, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080, 2560×1440, texto 200% em 320/1024/1280 px e tema escuro em 390 px. São 45 testes, em Chromium, Firefox e WebKit. Cada teste percorre 31 estados de interface, incluindo:

- login, cadastro e espaços públicos de prévia;
- turmas, missões, entregas, feedback, apoios, barreiras e ajuda;
- quatro etapas do editor, tanto na prévia quanto no componente autenticado;
- PDF, transcrição, áudio e campos de resposta do aluno;
- menu aberto/recolhido, ajustes de leitura e perfil com disciplinas adicionais;
- preparação e revisão individual do material no componente autenticado.

A prévia usa o cenário local fictício. Os componentes autenticados usam o transporte controlado compartilhado com os testes existentes; essa parte comprova layout e interação, não autenticação, banco, geração Gemini ou conversão real de PDF/áudio. Os testes existentes de API, integração real e Docker continuam separados.

O workflow `Responsive workspaces` executa os três engines da versão atual e guarda screenshots e `measurements.json` por perfil. A comparação baseline é opcional: execute manualmente o workflow com `compare_baseline` habilitado. Ela pode falhar por defeitos conhecidos no CSS antigo; não faz parte da aprovação automática da versão nova. A execução baseline restaura apenas o CSS da base, para comparar layout com o mesmo roteiro; correções de interação compartilhadas permanecem presentes. A baseline registra medidas sem exigir que o layout antigo passe nos critérios novos. Na versão melhorada, os testes exigem ausência de rolagem horizontal na raiz e largura mínima de 130 CSS px para campos de escrita visíveis. O leitor de PDF ampliado é uma região de rolagem interna intencional.

Para executar após instalar dependências:

```sh
npm run build --workspace @travessia/web
npx playwright install --with-deps chromium firefox webkit
npx playwright test --config=playwright.responsive.config.ts
```

As capturas são de viewport, não imagens completas gigantes que escondem os detalhes ao serem reduzidas. O workflow guarda artefatos por sete dias. Os resultados finais e links de execução ficam no PR. Na rodada ampliada inicial, a versão nova passou nos 45 testes (31 observações por teste); a baseline completou 14 configurações e interrompeu a última por ocultar a revisão em 1280 px com texto 200%.

## Limites de validação

As dimensões simulam janelas; não são ensaios em aparelhos físicos. WebKit no Linux não equivale a validar Safari em um iPhone. Texto 200% é aplicado por CSS; 320 CSS px verifica reflow, mas não é um teste de todas as configurações de zoom do navegador. Permanecem recomendadas verificações em Safari/iOS e Android reais, teclado virtual aberto e leitura com NVDA/VoiceOver, além de validação de usabilidade com professores e alunos.
