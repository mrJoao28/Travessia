# Estratégias pedagógicas por missão e etapa

## Uso

No espaço do professor, abrir **Estratégias** na navegação ou **Estratégias pedagógicas** no cartão de uma missão. Escolher a missão e a versão publicada/rascunho. A biblioteca oferece busca e filtro por barreira/tipo de apoio, sem diagnóstico ou classificação clínica.

1. Marcar uma ou mais estratégias e preparar o texto de cada apoio para a atividade real. Os exemplos do catálogo são ilustrativos; o botão para copiá-los exige posterior revisão do professor.
2. Escolher a missão inteira ou uma etapa da versão selecionada.
3. Escolher turma inteira ou alunos selecionados, com vínculo ativo na turma.
4. Conferir a prévia do aluno, revisar conteúdo/destino/destinatários e salvar.
5. Consultar, editar ou remover aplicações na lista da mesma versão. A remoção pede confirmação e não altera entregas nem outros apoios.

Os alunos recebem os apoios como seções opcionais junto das instruções da etapa. Apoios da missão inteira aparecem em todas as etapas; os de uma etapa aparecem somente nela. Abertura de um apoio não registra uso, diagnóstico, nota ou conclusão de etapa. Não há inferência automática de deficiência ou recomendação por rótulo.

Aplicações em versão publicada ficam disponíveis imediatamente aos destinatários. Aplicações em rascunho ficam privadas até a publicação daquela versão. Criar uma versão nova não copia apoios automaticamente: etapas e conteúdo podem ter mudado, e o professor precisa revisar/reaplicar. Pedidos de uma versão desatualizada não recebem apoios da versão nova silenciosamente. Missões arquivadas aceitam apenas consulta docente, sem novas aplicações/alterações.

## Biblioteca inicial

O catálogo é local à API, em `strategy-catalog.ts`, sem IA ou chamadas externas. Inclui checklist, exemplo comentado, glossário, descrição textual de imagens, transcrição de mídia, instruções por escrito, roteiro de planejamento e orientação de teclado. Cada item tem descrição, orientação e exemplo ilustrativo. A função de biblioteca/vínculos foi inspirada nos módulos `estrategiaService` e `disciplinaService` dos arquivos Mais Acesso fornecidos pelo usuário; não houve cópia do banco, importação de informações de estudantes ou integração de autenticação.

Os textos foram escritos para este produto e são modelos de autoria para revisão docente. Descrição e transcrição precisam ser preparadas e conferidas pelo professor. Selecionar um item não descreve imagens, produz legendas sincronizadas, transcreve mídia, gera Libras, cria uploads ou corrige ferramentas externas automaticamente. A função não altera os objetivos e critérios da missão e não inclui o módulo de adaptação por Gemini, que é outra funcionalidade.

Referências técnicas consultadas para orientar a implementação:

- [W3C COGA: Make Each Step Clear](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/) — orientação de contexto e etapas, suplementar à WCAG.
- [W3C WAI: Complex Images](https://www.w3.org/WAI/tutorials/images/complex/) — alternativas textuais para informações visuais complexas.
- [W3C WAI: Captions/Subtitles](https://www.w3.org/WAI/media/av/captions/) — legendas e distinção de transcrição textual.
- As referências de teclado, formulários e legibilidade do projeto permanecem em [ACCESSIBILITY.md](ACCESSIBILITY.md) e [REFERENCES.md](REFERENCES.md).

Essas referências não constituem validação pedagógica do catálogo nem indicação individual de apoio. A fonte pedagógica especializada, a revisão com docentes e a validação com estudantes continuam pendentes.

## Persistência, autorização e limites

`StrategyPlan` liga uma aplicação a MissionVersion e, opcionalmente, Step. `StrategyItem` guarda título/identificador da estratégia e texto revisado; `StrategyRecipient` guarda destinatários individuais. A migration é aditiva, transacional e aplica a mesma política de tabelas privadas/RLS da base existente. Não muda contas, perfis, vínculos, conteúdo de missões, sessões ou entregas.

Todas as rotas exigem sessão validada. Consultar/criar/editar/remover aplicações e listar destinatários exige vínculo docente ativo na turma da missão. Destinatários precisam ser alunos ativos da mesma turma; IDs de professor, outra turma ou vínculo revogado são rejeitados. A API valida que a etapa pertence à versão e que a versão é o rascunho/publicação atual da missão.

O endpoint do aluno filtra destinatários no banco e retorna somente identificador do item, título, texto e etapa. Não retorna audiência, destinatários, nomes de outros alunos ou conteúdo dos apoios alheios. Revogação de vínculo bloqueia novas consultas, mesmo conhecendo IDs. Dados já lidos podem permanecer na memória do navegador até a próxima consulta, como nos demais recursos da aplicação.

Até 20 aplicações por versão, 8 estratégias por aplicação, 50 destinatários individuais por aplicação e 3.000 caracteres por texto. O catálogo é fechado nesta entrega. IDs únicos e campos estritos impedem duplicações e atribuição de dono/papel pelo payload. A criação usa chave de idempotência; alterações e remoções exigem a revisão esperada, com transações serializáveis e conflito 409. Auditoria guarda ator/ação/recurso, sem texto privado. Conteúdo de apoios e destinatários não são acrescentados ao contexto Gemini.

### Endpoints implementados

| Operação | Acesso |
|---|---|
| GET /v1/strategies | Catálogo genérico para sessão válida |
| GET /v1/missions/{id}/strategy-recipients | Docente; alunos ativos, somente ID/nome, paginado |
| GET /v1/missions/{id}/strategy-plans?versionId=… | Docente; aplicações da versão atual selecionada |
| POST /v1/missions/{id}/strategy-plans | Docente; aplicação revisada e chave de idempotência |
| PATCH /v1/missions/{id}/strategy-plans/{planId} | Docente; substituição revisada, versão fixa e revisão esperada |
| POST /v1/missions/{id}/strategy-plans/{planId}/remove | Docente; remoção com revisão esperada |
| GET /v1/missions/{id}/supports?versionId=… | Aluno ativo; somente apoios próprios/coletivos da versão publicada atual |

## Atualizar Docker

Depois do merge e do `git pull`, manter `.env.docker` e o volume existente:

```sh
npm run docker:down
npm run docker:up
```

Não é necessário repetir setup ou seed. A biblioteca está na API; a migration cria as tabelas e as aplicações são preparadas pelo professor. Nenhum apoio é atribuído a alunos automaticamente durante o build ou a inicialização.

## Evidências e limites

Os testes HTTP usam PostgreSQL, Nest e Better Auth reais e cobrem turma/aluno, rascunho/publicação, mudança de versão, destinos cruzados, campos inválidos, confirmação, idempotência, concorrência, remoção, vínculo revogado e privacidade A/B. O runner também aplica as novas migrations sobre o schema anterior e verifica preservação das contas/vínculos e RLS das seis novas tabelas de perfis/estratégias. O teste de navegador integrado usa docente e alunos A/B com sessões reais para verificar criação, recarga, prévia, exibição por etapa e ausência do apoio de A na resposta de B. Capturas e axe/reflow são evidências técnicas parciais, sem substituir teste manual com leitores de tela ou validação pedagógica. O smoke Docker verifica persistência das aplicações após recriar containers com o mesmo volume.
