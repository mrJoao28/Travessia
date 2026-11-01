import { mkdir, readFile, rm, writeFile, rename, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
export const materialRoot = () => resolve(process.env.MATERIAL_STORAGE_DIR ?? '/tmp/travessia-materials');
export function materialPath(id: string, file: string) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^(original\.pdf|page-\d+\.png|adapted-\d+\.pdf|audio-\d+\.mp3)$/.test(file)) throw new Error('Invalid internal asset path');
  return join(materialRoot(), id, file);
}
export async function storeOriginal(id: string, bytes: Buffer) {
  const dir = join(materialRoot(), id); await mkdir(dir, { recursive: true, mode: 0o700 });
  const temporary = join(dir, `${randomUUID()}.part`);
  await writeFile(temporary, bytes, { mode: 0o600, flag: 'wx' }); await rename(temporary, materialPath(id, 'original.pdf'));
}
export async function removeMaterialFiles(id: string) { materialPath(id, 'original.pdf'); await rm(join(materialRoot(), id), { recursive: true, force: true }); }
export async function visualPage(id: string, page: number) { return readFile(materialPath(id, `page-${page}.png`)); }
export async function checkDiskBudget() {
  await mkdir(materialRoot(), { recursive: true, mode: 0o700 });
  let bytes = 0;
  for (const dir of await readdir(materialRoot(), { withFileTypes: true })) {
    if (!dir.isDirectory() || !/^[a-f0-9-]{36}$/.test(dir.name)) continue;
    for (const name of await readdir(join(materialRoot(), dir.name))) bytes += (await stat(join(materialRoot(), dir.name, name))).size;
  }
  if (bytes > Number(process.env.MATERIAL_STORAGE_LIMIT_MB ?? 1024) * 1024 * 1024) throw new Error('Material storage limit');
}
