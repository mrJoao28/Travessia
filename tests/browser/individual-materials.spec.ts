import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ApiBody, ApiResponse } from '../../apps/web/lib/api.generated';
import { materialPdfFixture } from '../../scripts/material-fixture.mjs';

import {fixture,addPdf} from '../fixtures/individual-materials';

test('sem deficiência informada: mantém original por padrão, permite apoio e exige revisão do destinatário',async({page})=>{
 const captured=await fixture(page,false,[],[]);await addPdf(page);
 await expect(page.getByText('Nenhuma deficiência informada',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Usar PDF original',exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/texto ampliado/i})).not.toBeChecked();
 await page.screenshot({path:'test-results/reference-material-no-disclosure.png',fullPage:true});
 await expect(page.getByRole('checkbox',{name:/Audiodescrição/})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Leitura em áudio/})).toHaveCount(0);
 await page.getByRole('button',{name:'Usar PDF original',exact:true}).click();
 const send=page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true});await expect(send).toBeDisabled();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();await send.click();
 await expect(page.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
 expect(captured()).toBeUndefined();expect(captured.original()?.studentId).toBe('student-a');expect(captured.original()?.reviewed).toBe(true);
});
test('TEA compartilhado: somente sugestões pertinentes, prévia automática e revisão sem enviar perfil à IA',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const captured=await fixture(page,false,['autism'],[]);await addPdf(page);
 await expect(page.getByRole('checkbox',{name:/Explicação mais direta/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Organizar em passos curtos/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Explicar termos do material/})).not.toBeChecked();
 await expect(page.getByRole('checkbox',{name:/texto ampliado/i})).not.toBeChecked();
 await page.screenshot({path:'test-results/reference-material-tea.png',fullPage:true});
 await page.getByRole('checkbox',{name:/Conferi as páginas e os objetivos/}).check();await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 const viewer = page.getByRole('region', { name: 'Comparação do material', exact: true });
 const settings = page.getByRole('complementary', { name: 'Preparação e revisão do material' });
 const settingsBox = await settings.boundingBox(), viewerBox = await viewer.boundingBox();
 expect(settingsBox!.x + settingsBox!.width).toBeLessThan(viewerBox!.x);
 const versions = viewer.getByRole('group', { name: 'Versão do documento' });
 await expect(page.getByRole('region',{name:'Documento preparado',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Documento original',exact:true})).toBeHidden();
 await versions.getByRole('button', { name: 'Original' }).click();
 await expect(page.getByRole('region',{name:'Documento original',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Documento preparado',exact:true})).toBeHidden();
 await versions.getByRole('button', { name: 'Preparado' }).click();
 await page.screenshot({path:'test-results/reference-comparison-teacher-desktop.png',fullPage:true});
 expect(captured()?.settings.supports).toEqual(['literal-language','short-sections']);
 expect(JSON.stringify(captured())).not.toMatch(/autism|Marina|low-vision/);
 await page.getByText('Ajustar o texto da prévia',{exact:true}).click();
 await page.getByLabel('Texto da página 1',{exact:true}).fill('Texto revisado: compare duas rotas de 10 metros.');
 await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Atualizar prévia →',exact:true}).click();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();await page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('baixa visão: leitura em destaque, outros pedidos recolhidos, teclado e reflow',async({page})=>{
 await page.setViewportSize({width:320,height:900});await fixture(page);await addPdf(page);
 const large=page.getByRole('checkbox',{name:/texto ampliado/i});await expect(large).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Organizar em passos curtos/})).toHaveCount(0);
 await expect(page.getByRole('checkbox',{name:/Explicar termos/})).toHaveCount(0);
 await large.focus();await page.keyboard.press('Space');await expect(large).not.toBeChecked();await page.keyboard.press('Space');
 await page.screenshot({path:'test-results/reference-material-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});
test('pedido de apoio sem compartilhar diagnóstico também orienta a preparação',async({page})=>{
 await fixture(page,false,[],['short-steps']);await addPdf(page);
 await expect(page.getByText('Nenhuma deficiência informada',{exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Organizar em passos curtos/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/texto ampliado/i})).not.toBeChecked();
});
test('adaptação sem PDF mantém aluno e versão, salva formatos e exige revisão',async({page})=>{
 const captured=await fixture(page);await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
 await page.getByRole('button',{name:'Ajustar atividade sem PDF',exact:true}).click();
 await page.getByLabel('Instruções preparadas para Marina fictícia',{exact:true}).fill('Compare uma rota por vez e explique sua escolha.');
 await page.getByRole('checkbox',{name:'Áudio de até 30 segundos',exact:true}).check();
 const save=page.getByRole('button',{name:'Salvar ajustes da atividade deste aluno',exact:true});await expect(save).toBeDisabled();
 await page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/}).check();await save.click();
 await expect(page.getByRole('status').filter({hasText:'Atividade e formas de entrega salvas'})).toBeVisible();
 expect(captured.activity()?.studentIds).toEqual(['student-a']);expect(captured.activity()?.versionId).toBe('v-material');expect(captured.activity()?.allowedFormats).toEqual(['text','audio']);
 await page.getByRole('button',{name:'Concluir ajustes deste aluno →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ajustes preparados para Marina fictícia',exact:true})).toBeVisible();
});
test('falha ao salvar ajuste individual preserva enunciado e permite corrigir',async({page})=>{
 await fixture(page,true);await page.getByLabel('Aluno da turma',{exact:true}).selectOption('student-a');
 await page.getByRole('button',{name:'Ajustar atividade sem PDF',exact:true}).click();
 const field=page.getByLabel('Instruções preparadas para Marina fictícia',{exact:true});await field.fill('Texto que precisa ser preservado.');
 await page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/}).check();await page.getByRole('button',{name:'Salvar ajustes da atividade deste aluno',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText('O conteúdo mudou');await expect(field).toHaveValue('Texto que precisa ser preservado.');
 await field.fill('Texto preservado e corrigido.');await expect(page.getByRole('checkbox',{name:/Conferi as instruções e as formas de entrega/})).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Concluir ajustes deste aluno →',exact:true})).toBeDisabled();
});


test('comparação no celular alterna documentos, mantém leitura ampliável e invalida revisão ao editar',async({page})=>{
 await fixture(page,false,['low-vision'],[]);await addPdf(page);
 await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();
 await page.getByText('Ajustar o texto da prévia',{exact:true}).click();
 await page.getByLabel('Texto da página 1',{exact:true}).fill('Texto em edição ainda não disponibilizado.');
 await expect(page.getByRole('checkbox',{name:/Conferi o material e o destinatário/})).not.toBeChecked();
 await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toBeDisabled();
 await expect(page.getByRole('link',{name:'Conferir PDF gerado',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Atualizar prévia →',exact:true}).click();
 await page.setViewportSize({width:320,height:900});
 const toggles=page.getByRole('group',{name:'Versão do documento',exact:true});
 await toggles.getByRole('button',{name:'Original',exact:true}).click();
 await expect(page.getByRole('region',{name:'Documento original',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Documento preparado',exact:true})).not.toBeVisible();
 await toggles.getByRole('button',{name:'Preparado',exact:true}).click();
 await expect(page.getByRole('region',{name:'Documento preparado',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Aumentar ampliação da comparação',exact:true}).click();
 await expect(page.getByText('125%',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/reference-comparison-teacher-mobile.png',fullPage:true});
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});


test('trocar o arquivo retira a prévia anterior e sua confirmação de revisão',async({page})=>{
 await fixture(page,false,['low-vision'],[]);await addPdf(page);
 await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();
 await page.getByLabel('Adicionar arquivo PDF',{exact:true}).setInputFiles({name:'outro-material.pdf',mimeType:'application/pdf',buffer:materialPdfFixture()});
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Documento preparado',exact:true})).toContainText('A versão preparada aparece aqui');
 await expect(page.getByRole('combobox',{name:'Arquivo PDF'}).locator('option:checked')).toHaveText('outro-material.pdf');
});


test('consulta de processamento em segundo plano não abandona a escolha do aluno nem a atividade sem PDF',async({page})=>{
 await fixture(page,false,['low-vision'],[],true);await addPdf(page);
 await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 const isPoll=(r:import('@playwright/test').Response)=>new URL(r.url()).pathname.endsWith('/material-adaptations')&&r.request().method()==='GET';
 const poll=page.waitForResponse(isPoll);
 await page.getByRole('button',{name:'Alterar aluno',exact:true}).click();await poll;
 await expect(page.getByLabel('Aluno da turma',{exact:true})).toBeVisible();
 const nextPoll=page.waitForResponse(isPoll);
 await page.getByRole('button',{name:'Ajustar atividade sem PDF',exact:true}).click();await nextPoll;
 await expect(page.getByLabel('Instruções preparadas para Marina fictícia',{exact:true})).toBeVisible();
});


test('cegueira: audiodescrição sugerida, sem reorganização automática',async({page})=>{
 const captured=await fixture(page,false,['blindness'],[]);await addPdf(page);
 await expect(page.getByRole('checkbox',{name:/Audiodescrição/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Leitura em áudio/})).toHaveCount(0);
 await expect(page.getByRole('checkbox',{name:/Organizar em passos curtos/})).toHaveCount(0);
 await page.getByRole('checkbox',{name:/Conferi as páginas e os objetivos/}).check();
 await page.getByRole('button',{name:'Gerar prévia',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Confira a prévia',exact:true})).toBeVisible();
 expect(captured()?.settings.supports).toEqual(['image-description']);
 await expect(page.locator('#material-audio audio')).toHaveAttribute('src',/material-assets\/adaptation-material\/audio$/);
 await expect(page.getByRole('heading',{name:'Ouvir audiodescrição'})).toBeVisible();
 await page.getByText('Leitura em texto e transcrição',{exact:true}).click();
 await expect(page.getByText('Leitura em texto e transcrição',{exact:true}).locator('..').getByText('O diagrama compara duas rotas.',{exact:true})).toBeVisible();
 await page.getByText('Ajustar o texto da prévia',{exact:true}).click();
 await page.getByLabel('Descrição das informações visuais da página 1',{exact:true}).fill('Descrição revisada pelo professor.');
 await expect(page.locator('#material-audio audio')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Atualizar prévia →',exact:true}).click();
 await expect(page.locator('#material-audio audio')).toBeVisible();
 await page.getByRole('checkbox',{name:/Conferi o material e o destinatário/}).check();
 await page.getByRole('button',{name:'Disponibilizar para Marina fictícia →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Material disponibilizado',exact:true})).toBeVisible();
});

test('audiodescrição manual pode ser preparada com a IA desligada', async ({ page }) => {
 const captured = await fixture(page, false, ['blindness'], []);
 await addPdf(page);
 await page.getByRole('checkbox', { name: 'Escrever a descrição manualmente' }).check();
 await expect(page.getByRole('checkbox', { name: /Conferi as páginas e os objetivos/ })).toHaveCount(0);
 await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
 await page.getByLabel('Descrição das informações visuais da página 1').fill('O diagrama mostra dois caminhos.');
 await page.getByRole('button', { name: 'Atualizar prévia →', exact: true }).click();
 await expect(page.locator('#material-audio audio')).toBeVisible();
 expect(captured()?.settings.useAi).toBe(false);
});

test('audiodescrição pode ser escolhida sem perfil e sem narração integral', async ({ page }) => {
 const captured = await fixture(page, false, [], []);
 await addPdf(page);
 const description = page.getByRole('checkbox', { name: /^Audiodescrição/ });
 await expect(description).toBeVisible();
 await description.check();
 await expect(page.getByRole('checkbox', { name: /^Leitura em áudio/ })).toHaveCount(0);
 await page.getByRole('checkbox', { name: /Conferi as páginas e os objetivos/ }).check();
 await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click();
 const audio = page.locator('audio[aria-label="Ouvir audiodescrição"]');
 await expect(audio).toHaveAttribute('src', /adaptation-material\/audio$/);
 const reader = page.getByRole('region', { name: 'Leitura do documento preparado' });
 expect((await reader.boundingBox())!.y + (await reader.boundingBox())!.height).toBeLessThan((await audio.boundingBox())!.y);
 expect(captured()?.settings.supports).toEqual(['image-description']);
});
