# Prévia interativa pública

Acesse `/previa/professor` e `/previa/aluno` sem login. Esta área ilustra as funcionalidades por meio de uma simulação local explicitamente identificada; o sistema autenticado continua usando a API e o PostgreSQL. Não são criadas contas, sessões, convites reais ou permissões por meio desta prévia.

Oito pessoas fictícias participam de três turmas de exemplo. Marina Costa prefere texto ampliado; Ana Beatriz Santos prefere instruções em passos; Gabriel Souza recebe descrição do esquema em áudio. As sugestões vêm dos pedidos de apoio compartilhados, são editáveis e não constituem prescrição por diagnóstico. Lucas Almeida exemplifica o uso sem deficiência compartilhada. Os nomes, perfis, instituição, atividades e entregas foram inventados para demonstração.

## Roteiro completo

1. No professor, consulte turmas, alunos e convites de exemplo. Crie outra turma, gere um convite e experimente a entrada pelo aluno, se desejar.
2. Abra **Missões → Criar missão**. Edite os objetivos ou peça o rascunho claramente identificado como **IA simulada**.
3. Organize as etapas por teclado. Escolha um dos três PDFs fictícios e avance para os apoios.
4. Escolha o aluno, o formato do material e o áudio opcional. Confira o original e o preparado; abra ou baixe os arquivos. Você também pode editar instruções e permitir respostas em áudio ou arquivo de texto.
5. Confirme a revisão antes de disponibilizar. Revise a missão e confirme a publicação simulada. Um rascunho de nova versão preserva a publicação anterior até a revisão.
6. Use **Ver no espaço do aluno**. Consulte PDF, áudio e transcrição. Marque etapas, escreva, salve o rascunho, recarregue a página e envie a atividade. Anexos são amostras fictícias, sem gravação ou upload pessoal.
7. Volte a **Entregas** no professor e publique feedback local. O aluno pode consultar a orientação em sua missão e na lista de feedback.
8. Experimente relatos privados/compartilhados, resposta do professor, perfil e pedidos de apoio opcionais. **Ajustar leitura** mantém as preferências existentes do site.

Os exemplos cobrem comparação de rotas, um programa de empréstimos de livros e cálculo de energia (9,6 + 1,2 = 10,8 kWh). As observações do campus não certificam acessibilidade de um percurso real.

## Arquivos e IA

Em `apps/web/public/preview` há 12 PDFs, seis imagens das páginas originais, dez MP3s com transcrições e um anexo `.txt`. São arquivos estáticos públicos de demonstração. Não há upload pessoal nem processamento de arquivos arbitrários nesta área. Os resultados de IA são exemplos prontos, sem chamadas ao Gemini e sem consumo de tokens. Alterações no enunciado são salvas no cenário; os PDFs e áudios são amostras fixas e não são regenerados conforme essas alterações.

Os PDFs têm texto selecionável, fontes incorporadas e idioma pt-BR. A variante ampliada usa corpo 22 pt. Não são certificados PDF/UA nem substituem validação com leitores de tela. Há leitura HTML, descrição das informações visuais e transcrição como alternativas. O áudio usa voz sintética local Piper `pt_BR-faber-medium` CC0; licenças de voz e fontes acompanham os arquivos. Os pesos da voz não fazem parte do repositório. O áudio de resposta identifica explicitamente um exemplo fictício, sem imitar pessoa real.

Reprodução opcional dos assets: instale ReportLab, pypdf, Poppler e fontes DejaVu Sans; execute `python scripts/generate-preview-assets.py`. Para regenerar áudio, instale também `piper-tts` e FFmpeg, obtenha o modelo verificado pelo utilitário existente `apps/api/material-tools/download-voice.py` e defina `PREVIEW_VOICE_MODEL` com o caminho do modelo antes de executar o gerador. Isso é uma tarefa de manutenção, não uma dependência do frontend em execução.

## Persistência e limites

Somente a chave `travessia:interactive-preview:v1` guarda o cenário no navegador. **Reiniciar cenário** restaura os exemplos sem apagar preferências de leitura ou outras chaves. JSON inválido volta ao cenário inicial; armazenamento bloqueado mostra aviso e mantém a navegação na sessão. Limites: dez turmas, vinte missões, dez etapas por missão e sessenta preparações/relatos. Use apenas dados fictícios, inclusive nos campos editáveis. Não há garantia de sincronização entre abas.

A seleção de aluno e a filtragem de destinatários são demonstrações de interface. Todos os assets são públicos; isso não é controle de acesso. Em `/aluno` e `/professor`, autorização e arquivos privados continuam sob responsabilidade do servidor.

## Verificação

`npm run check`, `npm run build` e `npx playwright test` incluem validação dos assets/transcrições, preservação de versões, jornada professor → aluno → feedback, compartilhamento opcional, reinício, armazenamento bloqueado, axe e reflow. O teste da jornada verifica que a prévia não faz requisições `/api/*`. Os testes reais de API, Better Auth e containers permanecem separados. Testes automáticos e inspeção visual não substituem avaliação de usabilidade por professores e estudantes.
