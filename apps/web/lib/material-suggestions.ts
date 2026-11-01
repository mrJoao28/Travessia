import { materialProfiles, type MaterialSupport } from './material-profiles';
const fromRequest: Record<string, MaterialSupport[]> = {
 'image-description':['image-description'],'clear-instructions':['literal-language'],'short-steps':['short-sections'],glossary:['glossary'],
};
/** Only shared information filters suggestions. No diagnosis is assigned or sent to AI. */
export function materialSuggestions(disabilities: readonly string[] | null | undefined, requests: readonly string[] = []) {
 const profiles=materialProfiles.filter(p=>disabilities?.includes(p.id));
 const defaults=[...new Set(profiles.flatMap(p=>p.supports))];
 const primary=[...new Set([...defaults,...(profiles.some(p=>p.id==='autism')?['glossary' as const]:[])])];
 const requested=[...new Set(requests.flatMap(r=>fromRequest[r]??[]))];
 const effectivePrimary=primary.length?primary:requested;
 const extra=[...new Set<MaterialSupport>([...requested,'narration',...(profiles.some(p=>['blindness','low-vision','color-vision'].includes(p.id))?['image-description' as const]:[])])].filter(s=>!effectivePrimary.includes(s));
 return {profiles,primary:effectivePrimary,selected:defaults.length?defaults:requested,extra};
}
