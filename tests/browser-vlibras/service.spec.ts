import {test,expect} from '@playwright/test';

// Manual integration smoke. Only authored public navigation text reaches the real service.
// Translation quality and human comprehension are outside this operational check.
test('VLibras oficial carrega no sandbox e recebe somente uma orientação pública',async({page})=>{
 const sent:string[]=[];
 page.on('requestfailed',r=>console.log('VLibras network',new URL(r.url()).hostname,new URL(r.url()).pathname,r.failure()?.errorText));
 page.on('console',m=>{if(m.type()==='error')console.log('VLibras browser',m.text().slice(0,350));});
 page.on('pageerror',e=>console.log('VLibras runtime',e.message.slice(0,350)));
 page.on('response',r=>{if(r.url()==='https://vlibras.gov.br/app/vlibras-plugin.js')console.log('VLibras loader',r.status(),r.headers()['access-control-allow-origin']);});
 page.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.vlibras.gov.br')&&new URL(r.url()).pathname==='/translate'&&r.method()==='POST')sent.push(r.postData()??'');});
 await page.setViewportSize({width:1440,height:1000});await page.goto('/login');
 await page.getByRole('button',{name:'Libras para navegação',exact:true}).click();await page.getByRole('button',{name:'Ativar VLibras',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('status')).toContainText('Guia disponível',{timeout:30000});
 const guide=page.frameLocator('iframe[title="Guia de navegação com VLibras"]');
 await guide.getByRole('button',{name:/Conteúdo acessível em Libras/}).click();
 await expect(guide.locator('#vlibras-app-root')).toHaveCount(1,{timeout:30000});
 const response=page.waitForResponse(r=>new URL(r.url()).hostname.endsWith('.vlibras.gov.br')&&new URL(r.url()).pathname==='/translate'&&r.request().method()==='POST',{timeout:120000});
 await expect.poll(async()=>{await guide.getByRole('button',{name:/^Missões/}).click();return sent.length;},{timeout:110000,intervals:[3000]}).toBeGreaterThan(0);
 expect((await response).ok()).toBe(true);expect(sent[0]).toContain('Miss');expect(sent[0]).not.toMatch(/@|password|studentId|materialId/);
 await page.screenshot({path:'test-results/reference-libras-official-service.png',fullPage:true});
 await page.getByRole('button',{name:'Fechar Libras',exact:true}).click();await expect(page.getByRole('button',{name:'Libras para navegação',exact:true})).toBeFocused();
});

test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await page.screenshot({path:'test-results/reference-libras-service-error.png',fullPage:true});});
