/** Public, authored interface copy only. Never derive this document from the app DOM. */
export const navigationLibras = [
  { title: 'Entrar e começar', items: [
    ['Entrar', 'Acesse sua conta com e-mail e senha.'],
    ['Criar conta', 'Cadastre sua conta para começar a usar a plataforma.'],
    ['Sair', 'Encerre o acesso à sua conta neste navegador.'],
  ] },
  { title: 'Encontrar uma área', items: [
    ['Meu percurso', 'Retome sua navegação na área de aluno.'],
    ['Minhas turmas', 'Encontre as turmas das quais você participa.'],
    ['Missões', 'Abra a lista de missões.'],
    ['Entregas', 'Consulte a área de entregas.'],
    ['Ajuda', 'Consulte orientações para usar a plataforma.'],
  ] },
  { title: 'Ajustar a tela', items: [
    ['Abrir menu', 'Mostre os nomes das opções do menu lateral.'],
    ['Recolher menu', 'Deixe apenas os ícones no menu lateral.'],
    ['Preferências de leitura', 'Ajuste tamanho do texto, espaçamento e elementos decorativos.'],
    ['Tema e contraste', 'Escolha o tema claro ou escuro e ajuste o contraste.'],
  ] },
  { title: 'Usar os botões', items: [
    ['Continuar', 'Vá para o próximo passo.'],
    ['Voltar', 'Retorne ao passo anterior.'],
    ['Salvar', 'Guarde as alterações feitas.'],
    ['Convidar alunos', 'Abra as opções de convite da turma.'],
    ['Criar missão', 'Abra a preparação de uma nova missão.'],
  ] },
] as const;

const html = (text: string) => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);

/** Runs in an opaque sandbox. The only messages out are bounded lifecycle signals. */
export function navigationLibrasDocument(theme: 'light' | 'dark', token: string) {
  const colors = theme === 'dark' ? ['#111A24','#F3F6F8','#8CC8FF'] : ['#FFFFFF','#173651','#075A9C'];
  const signal = JSON.stringify(token).replace(/</g, '\\u003c');
  const content = navigationLibras.map(group => `<section><h2>${html(group.title)}</h2>${group.items.map(([label,text]) => `<button type="button" class="guide-item"><strong>${html(label)}</strong><span>${html(text)}</span></button>`).join('')}</section>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://vlibras.gov.br https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/; style-src 'unsafe-inline' https://vlibras.gov.br https://cdn.jsdelivr.net; img-src data: https://vlibras.gov.br https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/; font-src https://vlibras.gov.br https://cdn.jsdelivr.net; connect-src https://vlibras.gov.br https://*.vlibras.gov.br; frame-src https://vlibras.gov.br https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/; worker-src blob:; base-uri 'none'; form-action 'none'">
<title>Orientações de navegação em Libras</title><style>
:root{color-scheme:${theme};--vlibras-btn-focus-visible-outline:3px solid ${colors[2]}}
*{box-sizing:border-box}body{margin:0;padding:16px;background:${colors[0]};color:${colors[1]};font:18px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}main{max-width:36rem;margin:auto;padding-bottom:5rem}h1{font-size:1.25rem}h2{font-size:1.1rem;margin-top:1.5rem}p{padding:.5rem 0;margin:.5rem 0}.guide-item{display:block;width:100%;text-align:left;padding:.75rem;margin:.5rem 0;color:inherit;background:transparent;border:1px solid currentColor;border-radius:.5rem;font:inherit;cursor:pointer}.guide-item strong,.guide-item span{display:block}.guide-item:focus-visible{outline:3px solid ${colors[2]};outline-offset:2px}#status{font-size:.9rem} @media(min-width:650px){main{margin:0;max-width:calc(100% - 350px)}} @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
</style></head><body><main><h1>Orientações de navegação</h1><p>Ative o botão azul do VLibras e selecione uma orientação deste guia. Use Escape para fechar este painel.</p><p id="status" role="status">Carregando o botão do VLibras…</p>${content}</main>
<script>
const token=${signal};
const send=state=>parent.postMessage({channel:'travessia-navigation-libras',token,state},'*');
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();send('close');}},true);
const script=document.createElement('script');script.src='https://vlibras.gov.br/app/vlibras-plugin.js';script.crossOrigin='anonymous';
script.onerror=()=>send('error');
script.onload=()=>{let attempts=0;const timer=setInterval(()=>{if(window.VLibrasWidget?.initBtn){clearInterval(timer);document.getElementById('status').textContent='Botão disponível. Ative o VLibras para carregar o avatar e selecionar uma orientação.';send('ready');}else if(++attempts>=100){clearInterval(timer);send('error');}},100);};
document.body.appendChild(script);
</script></body></html>`;
}
