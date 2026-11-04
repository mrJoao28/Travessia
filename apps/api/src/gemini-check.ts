import { readFile } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { geminiProvider, geminiSupportProvider } from './ai.js';
import type { Config } from './config.js';
import { missionInput, supportDraft } from './contracts.js';
import { geminiFailure } from './gemini-errors.js';
import { materialDocument } from './material-contracts.js';
import { materialProvider } from './material-provider.js';

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  if (!geminiKey || !model) {
    console.error('Preencha GEMINI_API_KEY e GEMINI_MODEL no ambiente privado.');
    process.exitCode = 1;
    return;
  }
  const config = { geminiKey, model } satisfies Pick<Config, 'geminiKey' | 'model'>;
  let stage = 'configuração';
  try {
    const client = new GoogleGenAI({ apiKey: geminiKey });
    const info = await client.models.get({
      model,
      config: { abortSignal: AbortSignal.timeout(10000), httpOptions: { timeout: 10000, retryOptions: { attempts: 1 } } },
    });
    if (info.supportedActions?.length && !info.supportedActions.includes('generateContent')) {
      console.error('O modelo configurado não oferece generateContent.');
      process.exitCode = 1;
      return;
    }
    console.log('Chave e modelo acessíveis.');
    if (!process.argv.includes('--smoke')) return;

    const objectives = ['Comparar duas rotas fictícias usando distâncias e justificar uma escolha.'];
    const materials = [{ title: 'Rotas fictícias', text: 'Rota A: 180 m e dois degraus. Rota B: 240 m e caixas em parte da passagem. Rota C: 310 m, sem degraus observados e com placas pequenas.' }];
    stage = 'missão';
    const mission = await geminiProvider(config)({ objectives, materials }, AbortSignal.timeout(20000));
    missionInput.parse(mission.draft);
    console.log('Missão: rascunho válido.');

    stage = 'apoio';
    const support = supportDraft.parse(await geminiSupportProvider(config)({
      objectives, materials, step: { title: 'Comparar rotas', instructions: 'Use as duas distâncias.' },
      strategies: [{ id: 'step-checklist', title: 'Checklist', guidance: 'Divida a atividade em passos verificáveis.' }],
    }, AbortSignal.timeout(20000)));
    if (support.items.length !== 1 || support.items[0].strategyId !== 'step-checklist') throw new Error('Unexpected strategy');
    console.log('Apoio: estratégia solicitada retornada.');

    stage = 'material';
    const image = await readFile(new URL('../../web/public/preview/campus-page-1.png', import.meta.url));
    const original = materials[0].text;
    const material = await materialProvider(config)({
      objectives, supports: ['Descreva informações visuais úteis da página.'], descriptionsOnly: true,
      pages: [{ page: 1, text: original, image }],
    }, AbortSignal.timeout(45000));
    const [page] = materialDocument.parse(material.document);
    if (page.page !== 1 || page.text !== original || !page.description.trim()) throw new Error('Invalid material');
    console.log('Material: página identificada, texto preservado e descrição preenchida.');
  } catch (error) {
    const failure = geminiFailure(error);
    console.error(`Falha em ${stage} (${failure.code}). ${failure.message}`);
    process.exitCode = 1;
  }
}

void main();
