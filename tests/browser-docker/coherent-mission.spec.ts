import { randomBytes } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { materialPdfFixture } from '../../scripts/material-fixture.mjs';

test('fluxo completo real: cadastro, turma, missão, PDF/voz, adaptação individual, A/B, entrega, barreira e feedback',async({browser,baseURL})=>{
 if(!process.env.TRAVESSIA_WEB_TEST_URL)throw new Error('Execute o runner Docker isolado.');
 const contexts=await Promise.all([browser.newContext({baseURL}),browser.newContext({baseURL}),browser.newContext({baseURL})]);
 const [teacher,student,other]=await Promise.all(contexts.map(c=>c.newPage()));
 const password=randomBytes(16).toString('hex');
 async function register(page:Page,space:'professor'|'aluno',name:string){
  await page.goto('/cadastro');await page.getByRole('radio',{name:`Sou ${space}`,exact:true}).check();
  await page.getByLabel('Nome completo',{exact:true}).fill(name);await page.getByLabel('E-mail',{exact:true}).fill(`${randomBytes(8).toString('hex')}@example.invalid`);
  await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Confirmar senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();await expect(page.getByRole('heading',{name:'Vamos começar?',exact:true})).toBeVisible();
 }
 const origin={Origin:baseURL!};
 async function post(page:Page,path:string,data:unknown){const r=await page.request.post(path,{headers:origin,data});expect(r.status()).toBe(200);return r.json();}
 try{
  await register(teacher,'professor','Professora de teste inclusivo');await teacher.getByLabel('Nome da turma',{exact:true}).fill('Turma do fluxo completo');
  await teacher.getByRole('button',{name:'Criar minha turma',exact:true}).click();await expect(teacher).toHaveURL(/\/professor\?turma=/);
  const classroom=(await teacher.request.get('/api/v1/classrooms').then(r=>r.json())).items[0];
  for(const [page,name] of [[student,'Marina do fluxo'],[other,'Aluno B do fluxo']] as const){
   const invitation=await post(teacher,`/api/v1/classrooms/${classroom.id}/invitations`,{});
   await register(page,'aluno',name);await page.getByLabel('Código de convite',{exact:true}).fill(invitation.token);await page.getByRole('button',{name:'Entrar na turma',exact:true}).click();await expect(page).toHaveURL(/\/aluno\?turma=/);
  }
  const otherId=(await other.request.get('/api/v1/me').then(r=>r.json())).id;
  const studentId=(await student.request.get('/api/v1/me').then(r=>r.json())).id;
  await student.goto('/aluno/apoios');await student.getByRole('checkbox',{name:'Tarefa dividida em passos curtos',exact:true}).check();
  await student.getByText('Informar deficiência autodeclarada (opcional)',{exact:true}).click();await student.getByRole('checkbox',{name:'Baixa visão',exact:true}).check();
  await student.getByRole('button',{name:'Salvar minhas escolhas',exact:true}).click();await expect(student.getByText('Escolhas salvas. Revise e autorize novamente as turmas com quem deseja compartilhar.',{exact:true})).toBeVisible();
  await student.getByRole('checkbox',{name:'Compartilhar apoios e preferências com docentes de Turma do fluxo completo',exact:true}).check();
  await student.getByRole('checkbox',{name:'Também compartilhar minha deficiência autodeclarada com docentes de Turma do fluxo completo',exact:true}).check();
  await student.getByRole('button',{name:'Salvar compartilhamento de Turma do fluxo completo',exact:true}).click();await expect(student.getByText('Compartilhamento salvo para os docentes desta turma.',{exact:true})).toBeVisible();
  // Mission creation uses the same editor and saved version throughout preparation.
  await teacher.goto(`/professor/missoes/nova?turma=${classroom.id}`);
  await teacher.getByLabel('Título da missão',{exact:true}).fill('Rotas acessíveis no campus');
  await teacher.getByLabel('Descrição',{exact:true}).fill('Compare duas rotas e justifique como torná-las acessíveis.');
  await teacher.getByLabel('Objetivos de aprendizagem · um por linha',{exact:true}).fill('Comparar as rotas de 10 metros.');
  await teacher.getByLabel('Critérios de avaliação · um por linha',{exact:true}).fill('Justificar com os dados do material.');
  await teacher.getByRole('button',{name:'Continuar para as etapas →',exact:true}).click();
  await teacher.getByLabel('Título da etapa',{exact:true}).fill('Comparar rotas');await teacher.getByLabel('Instrução',{exact:true}).fill('Compare duas rotas de 10 metros e justifique sua escolha.');
  await teacher.getByLabel('Exemplo de apoio',{exact:true}).fill('Observe distância, obstáculos e acesso.');
  await expect(teacher.getByText(/Uploads permanecem desativados/)).toHaveCount(0);
  await teacher.getByLabel('Adicionar PDF à missão',{exact:true}).setInputFiles({name:'rotas-campus.pdf',mimeType:'application/pdf',buffer:materialPdfFixture()});
  await teacher.getByRole('button',{name:'Salvar e continuar →',exact:true}).click();
  await expect(teacher.getByRole('heading',{name:'Preparar material para um aluno',exact:true})).toBeVisible();
  const missionId=new URL(teacher.url()).pathname.split('/')[3];
  let mission=await teacher.request.get(`/api/v1/missions/${missionId}`).then(r=>r.json());const versionId=mission.draftVersion.id;
  await teacher.getByLabel('Aluno da turma',{exact:true}).selectOption(studentId);
  await expect(teacher.getByText('Arquivo adicionado · 1 páginas',{exact:true})).toBeVisible({timeout:90000});
  await teacher.getByRole('button',{name:'Continuar →',exact:true}).click();
  await expect(teacher.getByRole('checkbox',{name:/Texto ampliado/})).toBeChecked();
  await expect(teacher.getByRole('checkbox',{name:/Passos curtos e numerados/})).not.toBeVisible();
  await teacher.getByText('Outras opções',{exact:true}).click();
  await teacher.getByRole('checkbox',{name:/Áudio com transcrição/}).check();
  await teacher.getByRole('button',{name:'Preparar prévia →',exact:true}).click();
  await expect(teacher.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible({timeout:90000});
  await teacher.getByText('Ajustar o texto da prévia',{exact:true}).click();
  await teacher.getByLabel('Texto da página 1',{exact:true}).fill('Compare duas rotas de 10 metros. Identifique os obstáculos e justifique uma escolha acessível.');
  await teacher.getByLabel('Descrição das informações visuais da página 1',{exact:true}).fill('Um retângulo representa a área usada na comparação das rotas.');
  await teacher.getByText('Também ajustar a atividade e as formas de entrega de Marina do fluxo',{exact:true}).click();
  await teacher.getByLabel('Instruções preparadas para Marina do fluxo',{exact:true}).fill('Primeiro identifique os obstáculos. Depois compare as rotas de 10 metros e justifique sua escolha.');
  await teacher.getByRole('checkbox',{name:'Áudio de até 30 segundos',exact:true}).check();await teacher.getByRole('checkbox',{name:'Arquivo de texto (.txt)',exact:true}).check();
  await expect(teacher.getByRole('button',{name:'Salvar e revisar',exact:true})).toBeDisabled();
  await teacher.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/}).check();await teacher.getByRole('button',{name:'Salvar ajustes da atividade deste aluno',exact:true}).click();
  await expect(teacher.getByRole('status').filter({hasText:'Atividade e formas de entrega salvas'})).toBeVisible();
  await teacher.screenshot({path:'test-results/reference-coherent-teacher-review.png',fullPage:true});
  await teacher.getByRole('button',{name:'Atualizar prévia →',exact:true}).click();
  await expect(teacher.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible({timeout:90000});
  await expect(teacher.getByRole('button',{name:'Disponibilizar para Marina do fluxo →',exact:true})).toBeVisible({timeout:90000});
  await teacher.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();await teacher.getByRole('button',{name:'Disponibilizar para Marina do fluxo →',exact:true}).click();
  await expect(teacher.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
  await teacher.getByRole('button',{name:'Preparar outro material',exact:true}).click();
  await teacher.getByLabel('Aluno da turma',{exact:true}).selectOption(otherId);
  await teacher.getByRole('button',{name:'Continuar →',exact:true}).click();
  await expect(teacher.getByText('Nenhuma deficiência informada',{exact:true})).toBeVisible();
  await expect(teacher.getByRole('radio',{name:/Manter o PDF original/})).toBeChecked();
  await teacher.screenshot({path:'test-results/reference-coherent-no-disclosure.png',fullPage:true});
  await teacher.getByRole('button',{name:'Continuar →',exact:true}).click();
  await teacher.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();
  await teacher.getByRole('button',{name:'Disponibilizar para Aluno B do fluxo →',exact:true}).click();
  await expect(teacher.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
  await teacher.getByRole('button',{name:'Salvar e revisar',exact:true}).click();await teacher.getByRole('checkbox',{name:'Revisei objetivos, critérios, etapas e materiais.',exact:true}).check();
  await teacher.getByRole('button',{name:'Publicar missão',exact:true}).click();await expect(teacher.getByRole('heading',{name:'Pronto para sua turma!',exact:true})).toBeVisible();
  mission=await teacher.request.get(`/api/v1/missions/${missionId}`).then(r=>r.json());expect(mission.publishedVersion.id).toBe(versionId);
  for(const suffix of ['apoios','adaptacoes','estrategias']){await teacher.goto(`/professor/missoes/${missionId}/${suffix}`);await expect(teacher.getByRole('heading',{name:'Preparar material para um aluno',exact:true})).toBeVisible();}
  // A receives the reviewed PDF/voice and activity. B receives only the unchanged original PDF.
  await student.goto(`/aluno/missoes/${missionId}`);await student.getByRole('button',{name:'Comparar rotas',exact:true}).click();
  const prepared=student.getByRole('region',{name:'Materiais preparados para você',exact:true});await prepared.getByText('rotas-campus.pdf',{exact:true}).click();
  await expect(prepared.getByText('Compare duas rotas de 10 metros. Identifique os obstáculos e justifique uma escolha acessível.',{exact:true})).toBeVisible();
  const download=student.waitForEvent('download');await prepared.getByRole('link',{name:'Baixar PDF adaptado',exact:true}).click();expect((await download).suggestedFilename()).toBe('material-adaptado.pdf');
  const audio=await prepared.locator('audio').getAttribute('src');expect(audio).toBeTruthy();expect((await student.request.get(audio!)).headers()['content-type']).toBe('audio/mpeg');
  await student.getByText('Consultar enunciado adaptado',{exact:true}).click();await expect(student.getByText('Primeiro identifique os obstáculos. Depois compare as rotas de 10 metros e justifique sua escolha.',{exact:true})).toBeVisible();
  const privateMaterials=(await student.request.get(`/api/v1/missions/${missionId}/my-materials?versionId=${versionId}`).then(r=>r.json())).items;
  await other.goto(`/aluno/missoes/${missionId}`);await other.getByRole('button',{name:'Comparar rotas',exact:true}).click();
  const originalRegion=other.getByRole('region',{name:'Materiais preparados para você',exact:true});
  await originalRegion.getByText('rotas-campus.pdf',{exact:true}).click();
  const originalLink=originalRegion.getByRole('link',{name:'Baixar PDF original',exact:true});await expect(originalLink).toBeVisible();
  const originalResponse=await other.request.get((await originalLink.getAttribute('href'))!);expect(originalResponse.status()).toBe(200);expect(await originalResponse.body()).toEqual(materialPdfFixture());
  await expect(originalRegion.locator('audio')).toHaveCount(0);
  const ownOriginal=(await other.request.get(`/api/v1/missions/${missionId}/my-materials?versionId=${versionId}`).then(r=>r.json())).items[0];expect(ownOriginal.mode).toBe('original');expect(ownOriginal.document).toEqual([]);
  expect((await student.request.get(`/api/v1/missions/${missionId}/material-assets/${ownOriginal.id}/pdf`)).status()).toBe(404);
  expect((await other.request.get(`/api/v1/missions/${missionId}/material-assets/${privateMaterials[0].id}/pdf`)).status()).toBe(404);
  await expect(other.getByLabel('Áudio da atividade (opcional)',{exact:true})).toHaveCount(0);
  const wav=Buffer.alloc(32044);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
  await student.getByLabel('Planejamento e atividade',{exact:true}).fill('Escolho a rota com menos obstáculos e justifico com os dados do PDF.');
  await student.getByLabel('Áudio da atividade (opcional)',{exact:true}).setInputFiles({name:'resposta-teste.wav',mimeType:'audio/wav',buffer:wav});await expect(student.getByRole('button',{name:'Remover áudio deste apoio',exact:true})).toBeVisible();
  await student.getByLabel('Arquivo de texto da atividade (.txt, UTF-8, até 32 KiB)',{exact:true}).setInputFiles({name:'resposta.txt',mimeType:'text/plain',buffer:Buffer.from('A rota sem obstáculos permite melhor acesso.')});
  await student.getByRole('checkbox',{name:'Concluí esta etapa. Salvará com o rascunho ou envio.',exact:true}).check();
  await student.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(student.getByText('Rascunho e etapa atual salvos no servidor.',{exact:true})).toBeVisible();
  await student.getByLabel('O que dificultou esta etapa?',{exact:true}).fill('Preciso de uma descrição mais clara do obstáculo apresentado no exemplo.');
  await student.getByRole('checkbox',{name:'Compartilhar com os docentes desta turma',exact:true}).check();await student.getByRole('button',{name:'Enviar relato',exact:true}).click();
  await expect(student.getByText('Relato salvo e compartilhado com os docentes desta turma.',{exact:true})).toBeVisible();
  await teacher.goto(`/professor/barreiras?turma=${classroom.id}`);await teacher.getByLabel('Responder ao estudante',{exact:true}).fill('O obstáculo é a ausência de passagem livre. Compare as alternativas de acesso.');await teacher.getByRole('button',{name:'Enviar resposta',exact:true}).click();await expect(teacher.getByText('Resposta salva e disponível para o autor do relato.',{exact:true})).toBeVisible();
  await student.goto(`/aluno/barreiras?turma=${classroom.id}`);await expect(student.getByText('O obstáculo é a ausência de passagem livre. Compare as alternativas de acesso.',{exact:true})).toBeVisible();
  await student.goto(`/aluno/missoes/${missionId}`);await student.getByRole('button',{name:'Enviar atividade',exact:true}).click();await expect(student.getByText('Atividade enviada. Aguarde o feedback do professor.',{exact:true})).toBeVisible();
  await teacher.goto('/professor/entregas');const delivery=teacher.locator('li.paper').filter({has:teacher.getByRole('heading',{name:'Rotas acessíveis no campus',exact:true})});
  await delivery.getByText('Consultar entrega e escrever feedback',{exact:true}).click();await delivery.getByLabel('Orientação para o próximo passo',{exact:true}).fill('Sua escolha está justificada. Na próxima etapa, relacione os obstáculos às soluções de acesso.');
  await delivery.getByRole('button',{name:'Publicar feedback',exact:true}).click();await expect(delivery.getByText('Feedback publicado pelo servidor.',{exact:true})).toBeVisible();
  await student.reload();await expect(student.getByText('Sua escolha está justificada. Na próxima etapa, relacione os obstáculos às soluções de acesso.',{exact:true})).toBeVisible();
  await student.setViewportSize({width:320,height:850});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page:student}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await student.screenshot({path:'test-results/reference-coherent-student-feedback.png',fullPage:true});
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
