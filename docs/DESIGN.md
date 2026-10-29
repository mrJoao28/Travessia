# Identidade visual — Caderno e percurso

## Direção

Ambiente universitário acolhedor e editorial: papel marfim, verde profundo, sálvia e terracota. O livro aberto e a linha de percurso representam aprendizagem e autonomia. Personalidade em tipografia, composição e ilustrações discretas; controles convencionais e previsíveis.

A imagem de conceito apresentada na conversa é referência de intenção. Ela não comprova contraste, funcionamento ou acessibilidade. A implementação pode ajustar composição e cor para atender requisitos. O scaffold contém uma interpretação inicial em HTML/CSS/SVG, sem incorporar a imagem como interface.

| Token | Cor | Uso |
|---|---|---|
| background | #F7F5EF | Fundo marfim |
| surface | #FFFEFA | Superfícies de leitura |
| primary | #234E43 | Ação principal e identidade |
| text | #243831 | Texto principal |
| muted | #56635C | Texto secundário legível |
| sage | #E6EDE4 | Agrupamento e contexto |
| terracotta | #A84F37 | Destaques pequenos |
| gold | #F0DDA5 | Ilustração e fundo auxiliar, com texto escuro |
| focus | #7B391F | Indicador de foco |

`packages/design-tokens` é a fonte de cores. Testar cada combinação efetivamente usada; fundos suaves não justificam texto pálido. Borda sutil não é suficiente sozinha para identificar campos e controles; nesses casos usar limite mais contrastante.

## Tipografia e composição

Preferir fonte humanista legível, com Atkinson Hyperlegible como candidata após revisão de licença e distribuição local. O scaffold usa essa família se já estiver instalada, com fallback Segoe UI/Arial; não carrega fontes externas. Corpo ~17px relativo e entrelinha 1.65; títulos com escala responsiva; largura de leitura 55–70 caracteres; texto alinhado à esquerda; cantos de 12–16px. Evitar caixa alta em instruções longas e pesos excessivamente leves.

## Aluno

Uma ação principal: próxima etapa. Contexto da disciplina e missão, etapa atual e passos consultáveis. Apoios visíveis e barreira relatável no ponto necessário. Informação de prazo quando real, com alternativas e orientações; sem contagem regressiva de pressão. Decoração removível sem ocultar conteúdo essencial.

## Professor

Planejamento com objetivo → critérios → etapas → materiais → revisão → publicação. Gemini assiste o rascunho. Tornar explícito o que foi gerado e o que está revisado. Painel mostra trabalho a acompanhar e barreiras compartilhadas, sem inferir diagnósticos ou criar rankings de estudantes.

## Interações

Feedback calmo; sem autoplay, confete ou sequência obrigatória. Seleção de formatos e apoios é individual, sem “modo TDAH” ou “modo cego”. Alto contraste, tamanho e espaçamento são preferências independentes. Sem sidebar fixa que encubra foco/zoom. No mobile, navegação se reorganiza com rótulos completos; testes em 320px.

## Brief da imagem de conceito

Mockup desktop da área de aluno: marca travessia com livro/percurso, menu lateral curto, título “Um passo de cada vez.”, missão “Uma biblioteca para todos”, progresso em cinco etapas com estado escrito, ação principal, lista de atividades e painel de preferências. Paleta marfim/verde/sálvia/terracota, contraste forte, ilustração discreta de livros e caminho; evitar aparência SaaS genérica, excesso de indicadores e gradientes tecnológicos. Prévia gerada com ferramenta de imagens; verificar a implementação real separadamente.

## Aprovação do usuário

A imagem em design/reference-student.png foi aprovada e deve ser seguida estritamente. Ver design/APPROVED.md. O scaffold visual é uma aproximação e precisa ser ajustado à referência pelo agente frontend. Artes finais serão adicionadas em etapa posterior.
