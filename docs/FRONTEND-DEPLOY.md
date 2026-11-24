# Publicação do frontend e Cloudflare

O endereço público do frontend é `https://travessia.maisacessoconecta.com.br`. A Cloudflare recebe as requisições públicas do domínio. O frontend Next.js, porém, roda como container no servidor Mais Acesso, atrás do nginx. O workflow não publica o frontend em Cloudflare Pages ou Workers.

## Caminho de publicação

1. A integração deliberada de `main` em `prod` aciona `.github/workflows/deploy.yml`.
2. O GitHub Actions executa os jobs de CI e Docker.
3. Se ambos passarem, o workflow conecta-se via SSH ao servidor e publica o SHA aprovado usando `scripts/deploy-prod.sh`.
4. O nginx do servidor encaminha o domínio público para a porta local do container frontend (`127.0.0.1:3020`). O frontend acessa a API pela rede privada do Docker (`http://api:3001`).
5. O workflow valida HTTPS, páginas, assets e acesso anônimo no domínio público que passa pela Cloudflare.

Detalhes operacionais, secrets e recuperação estão em [DEPLOY.md](DEPLOY.md). O ambiente Docker e seus serviços estão em [DOCKER.md](DOCKER.md).

## Cloudflare

DNS, estado de proxy, TLS e regras de cache são administrados na zona da Cloudflare, fora deste repositório. Para preservar autenticação e privacidade:

- manter HTTPS público e encaminhamento seguro ao nginx de origem;
- não armazenar em cache páginas autenticadas, respostas da API, sessão, ou outros dados privados;
- manter cookies de sessão `Secure`, `HttpOnly` e com política `SameSite` definida pelo backend;
- validar mudanças de proxy/cache no domínio público com `npm run test:production` e com os fluxos autenticados antes de considerá-las concluídas.

O comando `npm run test:production` realiza somente requisições GET e não cria contas nem altera dados. Ele não substitui testes de sessão, autorização por turma ou testes manuais de navegação.

## Configuração legada

`apps/web/vercel.json` e `apps/api/vercel.json` são arquivos de configuração de uma implantação anterior. Não são consumidos pelo fluxo atual de produção. As variáveis de execução vêm da configuração privada `.env.docker` do servidor, e não de settings de um projeto Vercel.
