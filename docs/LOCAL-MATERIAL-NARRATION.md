# Narração integral no fluxo de adaptação

A implementação reutiliza os quatro serviços existentes. O material-worker já contém Piper (`pt_BR-faber-medium`, CPU), FFmpeg, extração/OCR e Chromium para PDF. Não é preciso criar container, contratar voz externa, alterar schema ou configurar outra chave. `docker:up` continua sendo o caminho local completo; `dev:api` sozinho não inicia o worker nem instala suas ferramentas de sistema.

No mesmo painel de adaptação, a sugestão de cegueira oferece descrição das imagens e áudio com transcrição, sujeita à confirmação do professor. Não seleciona reorganização do texto por padrão. As opções continuam disponíveis conforme os apoios do aluno; não são um diagnóstico nem garantem acessibilidade de qualquer documento.

## Conteúdo e custo

- Mantém até quatro páginas selecionadas, até 12 mil caracteres extraídos na entrada e até 20 mil de texto/descrições na revisão. A narração recebe também títulos, referências e marcadores de fim de página, com limite local de 22 mil caracteres.
- Somente narração/formatação: copia todo o texto extraído, não chama Gemini.
- Somente descrição visual, combinada ou não com narração: envia texto e imagens reais das páginas ao Gemini, solicita apenas números de página e descrições, e recompõe o documento com o texto original extraído. Isso evita pagar para o modelo repetir todo o texto na saída e impede substituição acidental por resumo.
- Linguagem direta, seções curtas ou glossário explicitamente escolhidos: Gemini pode adaptar o texto. A narração lê integralmente a versão preparada e revisada; não implica reprodução literal do original.
- PDF, MP3 e reprodução/download são locais. Gerar ou regenerar arquivos a partir do rascunho não chama Gemini. Ouvir novamente não gera voz nem consome tokens.

O roteiro local segue: referência à página → título → texto completo → descrição visual disponível → fim da página. O professor revisa no painel já existente, pode editar texto/descrições, atualizar a prévia e ouvir o MP3 antes de liberar. Editar invalida a revisão e retira o áudio anterior da prévia até regenerar. O aluno recebe apenas arquivos liberados para ele, na versão publicada, com transcrição em HTML e download privado.

## Limites e validação

Preservar o texto extraído não garante que o PDF tenha sido extraído corretamente: colunas, fórmulas, tabelas, imagens ilegíveis e OCR exigem revisão. Descrições continuam sendo rascunhos de IA; não há promessa de audiodescrição profissional ou validação com usuários cegos. A voz sintética pode pronunciar incorretamente símbolos e termos técnicos. Os limites de CPU, memória e tempo do worker permanecem; um material muito complexo pode falhar sem ser liberado.

Testes cobrem texto das quatro páginas preservado mesmo se um provedor de teste devolver resumo, ordem da narração, descrição integrada, ausência de nova chamada Gemini ao renderizar, revisão e isolamento aluno A/B. O smoke Docker usa PDF de quatro páginas e gera PDF/MP3 reais com voz local, verifica paginação, conteúdo, decodificação, acesso e persistência. O teste com provedor controlado não comprova qualidade de uma resposta Gemini real. Não há uso de credenciais pessoais nos testes.
