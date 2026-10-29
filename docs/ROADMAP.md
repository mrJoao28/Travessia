# Sequência de implementação

## 0. Fundação — esta entrega

Monorepo, duas áreas demonstrativas, preferências de leitura, health API, identidade visual, contrato inicial, política de referência e documentação. Sem dados reais e sem chamada ao Gemini.

## 1. Identidade e turmas

Backend: Better Auth, sessão persistida e autorização; migrations User/Classroom/Membership/Invitation; convites student; isolamento de recursos e testes HTTP negativos.
Frontend: login/recuperação acessíveis, lista/criação de turmas e fluxo de convite; lidar com expiração sem perder contexto. Integrar contrato antes de remover os avisos de demonstração.

Aceite: professor cria turma, aluno entra por convite, não há acesso de terceiros nem autopromoção de papel.

## 2. Missões manuais

Backend: rascunho/publicação/versionamento, etapas e critérios. Frontend: editor acessível e leitor com navegação livre/apoios. Materiais textuais inicialmente; não habilitar upload real antes dos controles de segurança.

Aceite: professor publica missão revisada e aluno vinculado acessa somente a versão permitida.

## 3. Entregas, feedback e barreiras

Uploads privados após verificações; autoria e visibilidade; formulário de barreira com destinatário claro; fluxo de resposta. Preferências próprias e retenção definida.

Aceite: aluno envia trabalho, docente da turma responde, outro aluno não acessa; relato privado não é exposto a quem não foi autorizado.

## 4. Gemini no planejamento

Adaptador @google/genai, geração limitada por requisição Vercel, cotas e minimização; JSON validado, rascunho revisável. Resolver adequação etária/contratual e política de dados antes do piloto. Testes com provedor simulado sem saída falsa em produção; ao obter chave, smoke test autorizado com material fictício.

Aceite: professor gera, revisa e publica; falha/cota esgotada é tratada e conteúdo existente continua acessível.

## 5. Piloto e validação

Uma turma e três missões. Revisão da fonte pedagógica quando recebida; testes de teclado, leitor de tela, zoom/contraste e pessoas com diferentes necessidades. Registrar resultado e limitações; revisar retenção, recuperação e custo. Só depois ampliar tutor, integrações e monetização automática.
