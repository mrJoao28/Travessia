import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const key='travessia:interactive-preview:v1';

test('prévia conecta criação, IA simulada, PDF, áudio, aluno e feedback sem API',async({page})=>{
 test.setTimeout(120000);
 const apiRequests:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))apiRequests.push(request.url());});
 await page.goto('/previa/professor/missoes/editor');
 await page.getByText('Pedir um rascunho à IA · simulado',{exact:true}).click();
 await page.getByRole('button',{name:'Gerar rascunho de exemplo'}).click();
 await expect(page.getByLabel('Título da missão')).toHaveValue('Decidir uma rota com base em evidências');
 await page.getByLabel('Título da missão').fill('Uma rota melhor para nossa biblioteca');
 await page.getByRole('button',{name:'Continuar para as etapas →'}).click();
 await page.getByRole('button',{name:'Adicionar PDF de exemplo'}).click();
 await expect(page.getByText('PDF adicionado:',{exact:false})).toContainText('rotas-do-campus.pdf');
 await page.getByRole('button',{name:'Salvar e continuar →'}).click();
 await page.getByLabel('Aluno destinatário').selectOption('preview-student-1');
 await expect(page.getByLabel('Como preparar o material')).toHaveValue('expanded');
 await page.getByLabel('Incluir áudio e transcrição').check();
 await page.getByRole('button',{name:'Preparar prévia de exemplo'}).click();
 await page.getByText('Também ajustar a atividade',{exact:true}).click();
 await page.getByRole('button',{name:'Gerar orientação · IA simulada'}).click();
 await page.getByLabel('Áudio de exemplo',{exact:true}).check();
 await page.getByLabel('Arquivo de texto (.txt)').check();
 const release=page.getByRole('button',{name:'Disponibilizar para Marina Costa'});
 await expect(release).toBeDisabled();
 const pdf=await page.request.get('/preview/campus-ampliado.pdf');
 expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,5).toString()).toBe('%PDF-');
 const mp3=await page.request.get('/preview/campus-narracao.mp3');expect(mp3.status()).toBe(200);expect((await mp3.body()).length).toBeGreaterThan(10000);
 await page.getByLabel('Conferi o material, o destinatário e os ajustes.').check();await release.click();
 await page.getByRole('button',{name:'Revisar missão',exact:true}).click();
 await expect(page.getByRole('button',{name:'Publicar missão',exact:true})).toBeDisabled();
 await page.getByLabel('Revisei o conteúdo, os critérios e os materiais.').check();
 await page.getByRole('button',{name:'Publicar missão',exact:true}).click();
 await page.getByRole('link',{name:'Ver no espaço do aluno'}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Uma rota melhor para nossa biblioteca');
 const url=page.url();
 await page.getByRole('region',{name:'Materiais preparados para você'}).getByText('rotas-do-campus.pdf · Texto ampliado e espaçado',{exact:true}).click();
 await expect(page.getByRole('link',{name:'Baixar PDF preparado'})).toHaveAttribute('href','/preview/campus-ampliado.pdf');
 await page.getByText('Transcrição do áudio',{exact:true}).click();
 await expect(page.getByRole('link',{name:'Baixar transcrição'})).toHaveAttribute('href','/preview/campus-narracao.txt');
 await page.getByLabel('Planejamento e atividade').fill('Comparei 180 m e dois degraus na rota A com 310 m na rota C. Proponho melhorar as placas e conferir a leitura com usuários.');
 await page.getByLabel('Concluí esta etapa').check();
 await page.getByLabel('Anexar resposta fictícia em áudio').check();
 await page.getByLabel('Anexar arquivo de texto fictício (.txt)').check();
 await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await page.reload();
 await expect(page.getByLabel('Planejamento e atividade')).toHaveValue(/Comparei 180 m/);
 await expect(page.getByLabel('Anexar resposta fictícia em áudio')).toBeChecked();
 await page.getByRole('button',{name:'Enviar atividade',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Envio simulado registrado');
 await page.goto('/previa/professor/entregas');
 const item=page.locator('li.paper').filter({has:page.getByRole('heading',{name:'Uma rota melhor para nossa biblioteca',exact:true})});
 await item.getByLabel('Orientação para o próximo passo').fill('Você comparou os dados. Explique como verificará a legibilidade das placas.');
 await item.getByRole('button',{name:'Publicar feedback'}).click();
 await page.goto(url);await expect(page.getByRole('heading',{name:'Feedback da professora'})).toBeVisible();
 await expect(page.getByText('Você comparou os dados. Explique como verificará a legibilidade das placas.',{exact:true})).toBeVisible();
 await page.getByLabel('Aluno fictício').selectOption('preview-student-2');
 await expect(page.getByRole('region',{name:'Materiais preparados para você'})).toHaveCount(0);
 expect(apiRequests).toEqual([]);
});

test('publicação conserva a versão anterior enquanto o professor prepara um rascunho',async({page})=>{
 await page.goto('/previa/professor/missoes/campus/editor');
 await page.getByLabel('Título da missão').fill('Nova versão ainda privada');
 await page.getByRole('button',{name:'Continuar para as etapas →'}).click();
 await page.getByRole('button',{name:'Salvar e continuar →'}).click();
 await page.goto('/previa/aluno/missoes/campus');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Rotas acessíveis no campus');
 await expect(page.getByRole('region',{name:'Materiais preparados para você'})).toBeVisible();
 await page.goto('/previa/aluno/missoes/informacao');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Esta missão ainda não está disponível');
});

test('pedidos são opcionais, perfil não compartilhado não gera recomendações por diagnóstico e relatos respeitam a escolha',async({page})=>{
 await page.goto('/previa/aluno');
 await page.getByRole('link',{name:'Meus apoios',exact:true}).click();
 await expect(page).toHaveURL(/\/previa\/aluno\/apoios$/);
 await page.getByLabel('Compartilhar meus pedidos de apoio com a professora').uncheck();
 await page.getByRole('button',{name:'Salvar no cenário'}).click();
 await page.goto('/previa/professor/missoes/campus/adaptacoes');
 await expect(page.getByText('Nenhuma deficiência compartilhada neste cenário',{exact:true})).toBeVisible();
 await page.getByLabel('Aluno destinatário').selectOption('preview-student-3');
 await expect(page.getByLabel('Como preparar o material')).toHaveValue('original');
 await page.getByLabel('Aluno destinatário').selectOption('preview-student-2');
 await expect(page.getByLabel('Como preparar o material')).toHaveValue('clear');
 await page.goto('/previa/aluno/barreiras');
 await page.getByLabel('O que dificultou esta atividade?').fill('RELATO PRIVADO DE TESTE');
 await page.getByRole('button',{name:'Enviar relato',exact:true}).click();
 await page.goto('/previa/professor/barreiras');
 await expect(page.getByText('RELATO PRIVADO DE TESTE',{exact:true})).toHaveCount(0);
 await page.goto('/previa/aluno/barreiras');
 await page.getByLabel('O que dificultou esta atividade?').fill('Preciso de um exemplo da segunda etapa.');
 await page.getByLabel('Compartilhar este relato com os docentes desta turma').check();
 await page.getByRole('button',{name:'Enviar relato',exact:true}).click();
 await page.goto('/previa/professor/barreiras');
 const report=page.locator('section.paper').filter({has:page.getByText('Preciso de um exemplo da segunda etapa.',{exact:true})});
 await report.getByLabel('Responder ao estudante').fill('Compare as rotas A e C usando distância e condições observadas.');
 await report.getByRole('button',{name:'Enviar resposta'}).click();
 await page.goto('/previa/aluno/barreiras');await expect(page.getByText('Compare as rotas A e C usando distância e condições observadas.',{exact:true})).toBeVisible();
});

test('cenário suporta estado inválido, reinício isolado e armazenamento indisponível',async({page})=>{
 await page.goto('/previa/aluno');
 await page.evaluate(k=>{localStorage.setItem(k,'{"version":1,"missions":null}');localStorage.setItem('unrelated-test','keep');},key);
 await page.reload();await expect(page.getByRole('heading',{name:'Um passo de cada vez.'})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Reiniciar cenário'}).click();
 expect(await page.evaluate(()=>localStorage.getItem('unrelated-test'))).toBe('keep');
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('blocked');};Storage.prototype.getItem=()=>{throw new Error('blocked');};});
 await page.reload();await expect(page.getByText('O navegador não permitiu salvar a prévia localmente.',{exact:false})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Um passo de cada vez.'})).toBeVisible();
});

test('materiais e aluno têm prévia visual, áudio válido e reflow acessível',async({page})=>{
 for(const route of ['/previa/professor/missoes/campus/adaptacoes','/previa/aluno/missoes/campus']){
  await page.setViewportSize({width:1440,height:1000});await page.goto(route);await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await expect(page.locator('audio').first()).toHaveAttribute('src',/campus-narracao.mp3/);
  const duration=await page.locator('audio').first().evaluate((audio:HTMLAudioElement)=>new Promise<number>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Áudio fictício não carregou')),10000);audio.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve(audio.duration);},{once:true});audio.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Áudio fictício inválido'));},{once:true});audio.load();}));
  expect(duration).toBeGreaterThan(1);
  if(route.includes('professor')){await expect(page.locator('.comparison-source-page')).toBeVisible();await expect.poll(()=>page.locator('.comparison-source-page').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);}
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(results.violations).toEqual([]);
  await page.screenshot({path:`test-results/reference-preview-${route.includes('professor')?'teacher':'student'}-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`test-results/reference-preview-${route.includes('professor')?'teacher':'student'}-mobile.png`,fullPage:true});
  await page.setViewportSize({width:320,height:800});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});

test('convites, entrada na turma e estratégias individuais/da turma completam o cenário',async({page})=>{
 await page.goto('/previa/professor');
 await page.getByLabel('Nome da turma',{exact:true}).fill('Laboratório de projetos · exemplo');
 await page.getByRole('button',{name:'Criar turma',exact:true}).click();
 const room=page.locator('section.paper').filter({has:page.getByRole('heading',{name:'Laboratório de projetos · exemplo',exact:true})});
 await room.getByRole('button',{name:'Gerar convite de exemplo'}).click();
 const code=await room.locator('p.notice strong').textContent();expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
 await room.getByRole('link',{name:'Experimentar link fictício de convite',exact:true}).click();
 await expect(page.getByLabel('Código de convite fictício')).toHaveValue(code!);
 await page.getByRole('button',{name:'Entrar na turma',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Laboratório de projetos · exemplo',exact:true})).toBeVisible();
 const joined=page.locator('section.paper').filter({has:page.getByRole('heading',{name:'Laboratório de projetos · exemplo',exact:true})});
 await expect(joined.getByText('Ainda não há missões publicadas nesta turma de exemplo.',{exact:true})).toBeVisible();
 await expect(joined.getByRole('link',{name:'Ver missões',exact:true})).toHaveCount(0);
 await page.goto('/previa/professor/missoes/campus/adaptacoes');
 await page.getByText('Outros apoios da missão',{exact:true}).click();
 await expect(page.getByLabel('Tipo de apoio').locator('option')).toHaveCount(8);
 await page.getByLabel('Tipo de apoio').selectOption('planning-outline');
 await page.getByLabel('Quem recebe esta orientação').selectOption('student');
 await page.getByLabel('Texto do apoio',{exact:true}).fill('ORIENTAÇÃO EXCLUSIVA DO CENÁRIO DE MARINA');
 await page.getByRole('button',{name:'Salvar orientação de exemplo'}).click();
 await page.goto('/previa/aluno/missoes/campus');
 await page.getByText('Roteiro de planejamento',{exact:true}).click();
 await expect(page.getByText('ORIENTAÇÃO EXCLUSIVA DO CENÁRIO DE MARINA',{exact:true})).toBeVisible();
 await page.getByLabel('Aluno fictício').selectOption('preview-student-2');
 await expect(page.getByText('Roteiro de planejamento',{exact:true})).toHaveCount(0);
});
