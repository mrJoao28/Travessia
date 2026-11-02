import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInvitation,invitationLink,invitationEmail} from '../apps/web/lib/invitation.ts';
const origin='https://travessia.example.invalid';
test('convites aceitam código curto, link da própria origem e tokens antigos sem aceitar destinos externos',()=>{
 assert.equal(normalizeInvitation(' abcd-2345 ',origin),'ABCD2345');
 assert.equal(normalizeInvitation('A'.repeat(64),origin),'a'.repeat(64));
 const link=invitationLink(origin,'ABCD2345');
 assert.equal(new URL(link).search,'?espaco=aluno');assert.equal(new URL(link).hash,'#convite=ABCD2345');
 assert.equal(normalizeInvitation(link,origin),'ABCD2345');
 for(const input of ['abc','00000000','IIIIIIII',`${origin}/login#convite=ABCD2345`,'https://attacker.invalid/boas-vindas#convite=ABCD2345',`https://user:pass@travessia.example.invalid/boas-vindas#convite=ABCD2345`])assert.equal(normalizeInvitation(input,origin),null);
});
test('e-mail é uma mensagem pronta explícita com link e código, sem envio pelo servidor',()=>{
 const link=invitationLink(origin,'ABCD2345');const mail=new URL(invitationEmail('Programação I',link,'ABCD2345','ficticio@example.invalid'));
 assert.equal(decodeURIComponent(mail.pathname),'ficticio@example.invalid');assert.match(mail.searchParams.get('subject')!,/Programação I/);assert.ok(mail.searchParams.get('body')!.includes(link));assert.ok(mail.searchParams.get('body')!.includes('ABCD2345'));
});
