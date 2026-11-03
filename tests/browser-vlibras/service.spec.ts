import {test,expect,type Page} from '@playwright/test';
const endpoint='https://traducao2.vlibras.gov.br/translate';
async function openOfficial(page:Page){
 page.on('requestfailed',r=>console.log('VLibras network',new URL(r.url()).hostname,new URL(r.url()).pathname,r.failure()?.errorText));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/login');
 await page.getByRole('button',{name:'Libras para navegação',exact:true}).click();await page.getByRole('button',{name:'Ativar VLibras',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('status')).toContainText('Guia disponível',{timeout:30000});
 const guide=page.frameLocator('iframe[title="Guia de navegação com VLibras"]');
 await guide.getByRole('button',{name:/Conteúdo acessível em Libras/}).click();
 await expect(guide.locator('#vlibras-app-root')).toHaveCount(1,{timeout:30000});
 await expect(guide.locator('iframe')).toBeVisible({timeout:30000});return guide;
}

test('carregador, aplicação e iframe oficiais abrem sem acesso à página principal',async({page})=>{
 await openOfficial(page);
 await page.screenshot({path:'test-results/reference-libras-official-service.png',fullPage:true});
 await page.getByRole('button',{name:'Fechar Libras',exact:true}).click();await expect(page.getByRole('button',{name:'Libras para navegação',exact:true})).toBeFocused();
});

test('tradução pública real, quando a API externa está disponível',async({page,request})=>{
 // Independent reference request distinguishes upstream outage/block from integration defects.
 const reference=await request.post(endpoint,{data:{text:'Ajuda'},timeout:20000});
 console.log('VLibras reference API status:',reference.status());
 test.skip(!reference.ok(),`API oficial respondeu HTTP ${reference.status()} fora do sandbox; tradução real não validada.`);
 const sent:string[]=[];page.on('request',r=>{if(r.url()===endpoint&&r.method()==='POST')sent.push(r.postData()??'');});
 const guide=await openOfficial(page);
 const response=page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST',{timeout:120000});
 await expect.poll(async()=>{await guide.getByRole('button',{name:/^Missões/}).click();return sent.length;},{timeout:110000,intervals:[3000]}).toBeGreaterThan(0);
 expect((await response).ok()).toBe(true);expect(sent[0]).toContain('Miss');expect(sent[0]).not.toMatch(/@|password|studentId|materialId/);
});

test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await page.screenshot({path:'test-results/reference-libras-service-error.png',fullPage:true});});
