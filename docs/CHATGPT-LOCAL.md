# Travessia com ChatGPT Plus em teste local

Branch `test/chatgpt-plus-material-flow`. Use um banco demo dedicado e materiais fictícios. A API e o PostgreSQL devem estar acessíveis apenas em loopback. O Better Auth continua autenticando as contas de professor e aluno do Travessia. A conexão OpenAI é compartilhada apenas pelos processos dessa instalação de teste.

## Conectar a conta no navegador

1. Na raiz do repositório, execute `npm ci`.
2. Rode `npm run chatgpt:connect --workspace @travessia/api`.
3. Abra [a página local de conexão](http://127.0.0.1:1455), clique em **Continue with ChatGPT** e autorize o uso do plano na página da OpenAI.
4. Abra **Ver modelos disponíveis** e copie o identificador de um modelo da lista. Escolha um modelo que aceite imagens para testar a descrição de elementos visuais.
5. Após conectar, pode parar o processo de conexão. Quando o token expirar, execute o mesmo fluxo para reconectar.

A conexão é guardada em `~/.travessia-chatgpt-test/`, fora do repositório. A autorização usa PKCE e valida a identidade e a permissão de uso do plano. A prévia usa a [Responses API via OAuth](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).

## Executar a aplicação

Use o ambiente local normal do Travessia, com Node e o banco demo já migrado e populado. Para esta branch, rode API e worker de materiais no próprio sistema, sob a mesma conta do conector. O PostgreSQL pode rodar em Docker com uma porta publicada em loopback.

No arquivo de ambiente local já utilizado pelo Travessia, configure:

```dotenv
DEMO_MODE=true
DEMO_ONLY=true
AI_ENABLED=true
API_HOST=127.0.0.1
CHATGPT_MODEL=<identificador mostrado após a conexão>
```

Mantenha as demais variáveis locais, incluindo a URL do banco com host `127.0.0.1` ou `localhost`, a origem do frontend e a configuração de sessão. Inicie API e frontend com `npm run dev:api` e `npm run dev:web` nos terminais que carregam as variáveis. Para materiais, execute `node --import tsx apps/api/src/material-worker-cli.ts` com as mesmas variáveis e os executáveis de processamento já configurados. Consulte [Materiais individuais](INDIVIDUAL-MATERIALS.md).

No professor, gere um rascunho, refaça as instruções de uma etapa, gere um apoio e adapte um PDF fictício. Confira os resultados antes de publicar. O áudio continua sendo sintetizado localmente. Alguns campos internos mantêm o identificador legado `gemini` para preservar o schema e a leitura de dados anteriores.

## Conferir a conexão antes de pedir ajuda à IA

Abra **Ver modelos disponíveis** no conector e confira se o identificador corresponde a
`CHATGPT_MODEL`. Se a sessão expirou, reconecte no navegador. Inicie a API local no
PowerShell em que foram definidas `AI_ENABLED=true` e `CHATGPT_MODEL`. Ao testar
audiodescrição pelo worker Docker, reconstrua a imagem e confira se ele monta a mesma
pasta de materiais da API e a pasta de sessão do ChatGPT em modo somente leitura.

A preparação de PDFs aceita até 40 páginas e processa as solicitações em lotes no worker.
Para adaptar um PDF, escolha **Audiodescrição** na tela de apoios do material. Se a IA
estiver indisponível, marque **Escrever a descrição manualmente**, preencha cada página e
gere a prévia. A síntese de voz é local. Confira o áudio e disponibilize o material; se a
versão da missão ainda estiver em rascunho, publique-a para o aluno ter acesso.

## Windows com PostgreSQL e worker no Docker

Na branch `test/chatgpt-plus-material-flow`, use Node 24 e Docker Desktop com containers Linux. Na raiz, execute `npm ci` e, se precisar criar o ambiente, `npm run docker:setup`. Use um `.env.docker` dedicado à demonstração.

1. Conecte sua conta conforme as instruções acima e copie um modelo disponível.
2. Pare instâncias anteriores da API e do frontend nas portas 3001 e 3000. Se o frontend anterior estiver no Docker, rode `docker compose --env-file .env.docker stop frontend api`.
3. No PowerShell, execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\chatgpt-local.ps1 -Model 'MODELO_DA_LISTA'`. O script sobe o banco, aplica migrations e seed, prepara o worker e mantém a API aberta. Use `-DbPort 55434` se a porta padrão 55433 estiver ocupada. Use `-Materials 'C:\caminho\dos\materiais'` para reutilizar a pasta da instalação anterior.
4. Em outro PowerShell na raiz, rode `$env:API_INTERNAL_URL='http://127.0.0.1:3001'; npm run dev --workspace @travessia/web -- --hostname 127.0.0.1 --port 3000`. Abra `http://127.0.0.1:3000` e use as credenciais demo do `.env.docker`.
5. Para conferir o worker, use `docker logs --tail 80 travessia-material-worker-1`.

A primeira compilação do worker pode demorar enquanto baixa as ferramentas de PDF e a voz do Piper. A API e o worker usam a mesma pasta de materiais. A sessão do ChatGPT é montada somente para leitura no worker.
