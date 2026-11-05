# Materiais individuais na área do professor

Em Estratégias, o docente escolhe um aluno ativo, confirma apoios concretos, envia um PDF, seleciona páginas, revisa o rascunho e gera os arquivos. Depois de conferir PDF/áudio/transcrição, libera explicitamente para esse aluno. O aluno vê somente os materiais liberados da versão publicada em “Materiais preparados para você”. Os apoios anteriores continuam na seção “Outros apoios”.

## Perfis e revisão

Dez categorias opcionais sugerem apoios: cegueira, baixa visão, percepção de cores, surdez, perda auditiva parcial, TEA, dislexia, TDAH, deficiência intelectual e física/motora. Podem ser combinadas. Nenhum diagnóstico é exigido, inferido ou salvo pelo formulário docente. O compartilhamento voluntário do aluno continua separado e revogável; atualizar suas escolhas revoga o compartilhamento anterior. Não se atribui um perfil clínico ao aluno a partir da seleção de sugestões. Sem nível de gravidade ou redução automática de objetivos.

A pesquisa dirigida e suas limitações constam de REFERENCES.md. Confirme necessidades individuais, linguagem, preferências de contraste e mediação com o aluno. PDF/áudio não substituem Libras, Braille nem toda forma de apoio. PDF marcado não é certificação PDF/UA. OCR e IA podem errar: números, fórmulas, gráficos e tabelas precisam de revisão. Nenhuma entrega ou nota é produzida automaticamente.

## Processamento e limites

- 4 serviços: frontend, API, PostgreSQL e material-worker. O novo worker não publica portas. Uma tarefa por processo, limite Compose de 1 CPU e 1536 MiB; ajustar após medir o VPS.
- Original: PDF até 20 MiB/40 páginas, sem senha, ações, links externos, formulários ou anexos. A API recebe JSON base64 limitado a 28 MiB no cliente, proxy, API e Nginx. Validação estrutural em quarentena antes de qualquer download.
- Extração local pdfplumber/pypdf; páginas sem texto passam por OCR Tesseract em português. Rasterização Poppler limitada a 1400px. A extração conserva células de tabelas com linhas detectáveis e separa colunas quando identifica um corredor claro. Notação matemática detectada é sinalizada e a imagem original serve de referência. Falhas e incertezas são exibidas ao professor, sem truncamento silencioso.
- Cada adaptação: até 40 páginas selecionadas. A IA processa lotes de até quatro páginas e normalmente até 12 mil caracteres. Uma página mais densa vai sozinha. O worker reúne os lotes em uma única prévia, PDF e, se solicitado, um MP3. Até 30 originais e 100 adaptações por versão, 20 uploads e 30 preparações locais por docente/dia; preparações IA têm teto de 10 documentos e 80 lotes por docente/dia.
- PDF novo: HTML escapado, sem JavaScript nem rede no Chromium, títulos, texto selecionável, referência de páginas, marcação e outline. Imagens das páginas com informação visual são conservadas como referência junto à descrição textual. Ler também a versão HTML da missão.
- Narração local Piper pt-BR/faber, MP3 mono de 64kbps via FFmpeg, controles de reprodução sem autoplay e texto completo como transcrição. Não se envia o texto a outro serviço de voz. Professor ouve e confere a pronúncia antes de liberar.
- Fila durável no PostgreSQL, reserva transacional e estados consultáveis. A tela solicita exportação automática pelo worker. Descrições ausentes ficam em rascunho editável. O prazo de abandono é de 8 minutos sem renovar o processamento da extração ou geração, e de 20 minutos na renderização; não há repetição automática de chamadas externas. Reiniciar containers preserva a fila e o volume. Falha de renderização preserva texto editável para nova tentativa local.

## Economia Gemini

Formatação, tamanho, espaçamento, cores, extração/OCR, PDF e voz são locais. Gemini só participa quando o docente escolhe reorganização textual, explicação de termos ou descrição visual e autoriza o conteúdo. Recebe objetivos, apoios concretos e páginas selecionadas; não recebe campos de identidade, diagnóstico, deficiência, entregas ou preferências privadas do aluno. O professor deve conferir que o próprio documento não contenha dados pessoais/confidenciais antes de autorizar; não há promessa de anonimização automática.

Descrição visual envia imagens reais das páginas selecionadas, até 4 imagens/2 MiB cada, em vez de inventar detalhes a partir do texto. A chamada usa JSON estruturado, no máximo 16384 tokens de saída por lote e 45 segundos, sem retries. Resposta incompleta é rejeitada; não se publica conteúdo cortado. Gemini 2.5 Flash/Flash-Lite recebem thinkingBudget=0; outros modelos mantêm sua configuração compatível. Modelo vem de GEMINI_MODEL; nenhuma troca silenciosa de modelo.

Hash deduplica upload na mesma versão. Solicitações idempotentes reutilizam a preparação para o mesmo original, versão, destinatário e apoios; nunca compartilham automaticamente arquivos entre alunos. Revisar texto ou gerar PDF/voz não chama Gemini. Uma geração pendente por docente, com consumo de tokens informado pelo provedor. Não se promete custo zero ou execução externa exatamente uma vez: uma interrupção pode ter ocorrido após cobrança do provedor.

## Arquivos, retenção e permissões

`material-data` é volume privado compartilhado somente entre API e worker; frontend não o monta. Caminhos são UUIDs internos, nomes de arquivo fixos, sem URLs fornecidas pelo usuário. Downloads passam pela sessão e vínculo ativo a cada acesso. Aluno só acessa seu material liberado da versão publicada; original completo fica só para professores ativos da turma. Páginas selecionadas de referência também exigem autorização da adaptação.

Alterar conteúdo preserva a revisão publicada para o estudante. Disponibilizar a revisão nova troca o texto, o PDF e o áudio em conjunto. Nova versão da missão não herda materiais automaticamente. Vínculo revogado bloqueia novas leituras e preparação em andamento. Remover fonte retira suas adaptações; remover adaptação retira acesso de imediato. O acesso expira imediatamente na data indicada. O coletor roda a cada hora em lotes de até 100 adaptações e 100 fontes; acúmulos podem exigir mais de um ciclo para remoção física. Órfãos de cascatas são elegíveis para limpeza após 24 horas. Retenção operacional: 90 dias desde upload, explicitada na interface; limite padrão 1024 MiB, sem remoção silenciosa de material válido quando cheio. Backups também devem incluir o volume e obedecer à política do piloto; não foi validado restore de produção por esta mudança.

## Operação

No Docker: comandos habituais `npm run docker:up` e `npm run docker:logs`. A migration continua tarefa explícita; worker não migra nem semeia o banco. A primeira construção baixa dependências de PDF/voz e modelo Piper (aprox. 63 MB), depois o uso local não depende de SaaS de OCR/PDF/TTS. Não rodar worker dentro do processo Next/API.

Fora do Docker: instalar Python/venv com `apps/api/material-tools/requirements.txt`, Poppler, Tesseract + idioma por, Chromium e FFmpeg; baixar a voz pela rotina de build e configurar as variáveis de `.env.example`. Depois `npm run build --workspace @travessia/api` e `node apps/api/dist/material-worker-cli.js`, com o mesmo banco e MATERIAL_STORAGE_DIR da API. No Windows, preferir o Compose Linux para manter os binários consistentes.

Gemini usa AI_ENABLED/GEMINI_API_KEY/GEMINI_MODEL e as aprovações já exigidas pela aplicação. Chave só no backend/worker, nunca no frontend. Ativar IA não publica rascunhos. O único serviço externo faturável desta funcionalidade é o Gemini; CPU, RAM, disco e backups consomem a infraestrutura existente e devem ser dimensionados.

## Licenças e fontes técnicas

- pdfplumber MIT: https://github.com/jsvine/pdfplumber; pypdf BSD-3-Clause: https://github.com/py-pdf/pypdf.
- Tesseract Apache-2.0: https://github.com/tesseract-ocr/tesseract; Poppler GPL: https://poppler.freedesktop.org/.
- Piper GPL-3.0: https://github.com/OHF-Voice/piper1-gpl; requisitos ficam fixados por versão. Redistribuição de imagens deve cumprir as licenças e oferta de fontes correspondentes.
- Voz fixada no commit 49a0d23f04e055f1766e5ad15ea2d121a90fa17a, modelo pt_BR-faber-medium, SHA-256 verificado no build. O MODEL_CARD identifica dataset CC0 e origem de fine-tuning: https://huggingface.co/rhasspy/piper-voices/blob/49a0d23f04e055f1766e5ad15ea2d121a90fa17a/pt/pt_BR/faber/medium/MODEL_CARD. O cartão acompanha a imagem em /opt/voices; não generalizar essa licença a qualquer outra voz.
- Playwright PDF: https://playwright.dev/docs/api/class-page#page-pdf; Gemini thinking: https://ai.google.dev/gemini-api/docs/thinking; visão em documentos: https://ai.google.dev/gemini-api/docs/document-processing.

## Verificação

Testes HTTP usam autenticação/PG reais e provedores/processadores controlados para verificar permissões A/B, revisão, revogação, idempotência e minimização. O smoke Docker adicional exercita extração, PDF, voz local e persistência reais com Gemini desligado. Testes de interface distinguem respostas controladas de integrações reais. Testar uma chamada Gemini real requer credencial aprovada; testes controlados não comprovam qualidade pedagógica ou a descrição correta de documentos arbitrários. Não há validação com estudantes ou leitor de tela humano nesta implementação.

### Diagnóstico Gemini e revisão por página

Em um checkout com dependências instaladas, carregue a configuração privada e consulte a chave e o modelo:

```sh
node --env-file=.env.docker --import tsx apps/api/src/gemini-check.ts
```

Acrescente `--smoke` ao final para chamar os três adaptadores reais com material fictício. Essa opção usa a cota Gemini do projeto. Ela verifica formato da missão, estratégia de apoio e descrição de uma página com imagem, além da preservação do texto original. O comando imprime apenas resultados e categorias de erro. Use as prévias para avaliar manualmente fidelidade, números, clareza e adequação pedagógica.

Em **Ajustar o texto da prévia**, cada página remete à imagem original. Páginas extraídas por OCR pedem conferência de fórmulas, números e tabelas. Para rascunhos preparados com IA, **Refazer página com Gemini** salva o trabalho atual e enfileira somente a página confirmada. As demais páginas são preservadas. Na descrição exclusivamente visual, apenas a descrição muda. Depois, gere novamente a prévia e revise antes de disponibilizar.

## Backup e ensaio de restauração

Execute a partir do checkout que usa o mesmo projeto Compose e `.env.docker` da instalação. Escolha uma janela de manutenção. O backup pausa API e worker enquanto copia o PostgreSQL e o volume de materiais e reinicia os serviços que estavam ativos. Suspenda também quaisquer escritores externos ao Compose. O script usa o mesmo lock do deploy.

```sh
bash scripts/material-recovery.sh backup /caminho/privado/travessia-2026-11-04
bash scripts/material-recovery.sh verify /caminho/privado/travessia-2026-11-04
```

Guarde o bundle completo em armazenamento privado, criptografado e fora do servidor. Ele contém dados da aplicação, inclusive arquivos privados. Use somente bundles de origem confiável. A verificação confere os hashes, restaura o dump em PostgreSQL num projeto Compose descartável e compara o volume extraído com o arquivo TAR. Ela remove os recursos temporários no final. O procedimento é um ensaio isolado. Para validar o fluxo completo de recuperação, também confira em homologação se um aluno consegue abrir um PDF e ouvir o áudio restaurado.

A saúde do worker acompanha consultas concluídas na fila e prazos de trabalho por etapa. Tarefas demoradas têm janelas compatíveis com seus limites. Se a fila parar de responder, o prazo vence e o Compose pode sinalizar o contêiner como `unhealthy`. Monitore esse estado e investigue o banco e os logs do worker.
