/** Invite secrets live in the URL fragment, never in a request query or session cookie. */
export function normalizeInvitation(value: string, origin: string): string | null {
  let candidate=value.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url=new URL(candidate);
      if(url.origin!==origin||url.username||url.password||url.pathname!=='/boas-vindas')return null;
      candidate=new URLSearchParams(url.hash.slice(1)).get('convite')??'';
    }catch{return null;}
  }
  if(/^[a-f0-9]{64}$/i.test(candidate))return candidate.toLowerCase();
  const code=candidate.replace(/[\s-]/g,'').toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code)?code:null;
}
export function invitationHref(path:string,token:string|null){return token?`${path}#convite=${encodeURIComponent(token)}`:path;}
export function invitationLink(origin:string,token:string){return new URL(invitationHref('/boas-vindas?espaco=aluno',token),origin).href;}
export function invitationEmail(classroom:string,link:string,code:string,email='') {
 const body=`Olá!\n\nVocê recebeu um convite para a turma ${classroom} no Travessia.\n\nEntre pelo link:\n${link}\n\nOu digite o código: ${code}\n\nEntre na sua conta ou crie uma conta de aluno e confirme a entrada na turma.\nO convite vale por sete dias, salvo se o professor o desativar antes.`;
 return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(`Convite para ${classroom} · Travessia`)}&body=${encodeURIComponent(body)}`;
}
