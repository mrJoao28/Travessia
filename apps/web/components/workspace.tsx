import Link from 'next/link';
import { ReadingPreferences } from './reading-preferences';

export function Workspace({ role, children }: { role: 'aluno' | 'professor'; children: React.ReactNode }) {
  const student = role === 'aluno';
  const links = student
    ? [['/aluno', 'Meu percurso'], ['/aluno#turmas', 'Minhas turmas'], ['/aluno#entregas', 'Entregas'], ['/aluno#feedback', 'Feedback']]
    : [['/professor', 'Visão da turma'], ['/professor#turmas', 'Minhas turmas'], ['/professor#missoes', 'Missões'], ['/professor#barreiras', 'Apoios e barreiras']];
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href={`/${role}`} aria-label="Travessia, início">
          <svg viewBox="0 0 74 45" width="74" height="45" aria-hidden="true"><path d="M6 11q17-2 31 10Q51 9 68 11v26q-17-3-31 5Q24 34 6 37Z M37 21v21 M46 21q16-8 19-1c3 7-22 7-21 15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /></svg>
          <span>travessia</span><small>Aprender e avançar</small>
        </Link>
        <nav aria-label="Navegação principal"><ul>{links.map(([href, label], index) => <li key={href}><Link href={href} className={index === 0 ? 'nav-current' : ''}>{label}</Link></li>)}</ul></nav>
        <a className="sidebar-support" href="#preferencias">Preferências de leitura</a>
        <p className="sidebar-note decorative">Conhecimento<br />também é caminho.</p>
      </aside>
      <div className="workspace">
        <div className="demo-banner">Demonstração com dados fictícios · <Link href={student ? '/professor' : '/aluno'}>Ver espaço {student ? 'do professor' : 'do aluno'}</Link></div>
        <header className="topbar"><span className="eyebrow">Espaço {student ? 'do aluno' : 'do professor'}</span><ReadingPreferences /></header>
        <main id="conteudo" tabIndex={-1}>{children}</main>
        <footer className="footer">Travessia · Aprendizagem por missões. Protótipo inicial, sem contas ou entregas reais.</footer>
      </div>
    </div>
  </>;
}

export function PathIllustration() {
  return <svg className="path-art decorative" viewBox="0 0 310 235" aria-hidden="true">
    <circle cx="240" cy="43" r="23" fill="var(--gold)" />
    <path d="M0 214Q70 115 133 153T310 81v154H0Z" fill="var(--sage)" />
    <path d="M13 229C35 152 235 209 205 139S137 72 293 79" fill="none" stroke="var(--gold)" strokeWidth="23" />
    <g fill="var(--surface)" stroke="var(--primary)" strokeWidth="2"><rect x="39" y="58" width="24" height="103" rx="3" /><rect x="69" y="38" width="29" height="123" rx="3" /><path d="m106 57 24-7 30 106-24 7Z" /></g>
    <path d="M47 67v85M78 48v103" stroke="var(--terracotta)" strokeWidth="3" />
    <g fill="var(--primary)"><ellipse cx="66" cy="204" rx="18" ry="7" /><ellipse cx="164" cy="196" rx="18" ry="7" /><ellipse cx="212" cy="145" rx="18" ry="7" /><ellipse cx="188" cy="99" rx="18" ry="7" /></g>
    <path d="M268 197v-60m0 28q-33-4-24-28 26 4 24 28m0-12q26-4 24-27-24 1-24 27" fill="var(--primary)" stroke="var(--primary)" strokeWidth="2" />
  </svg>;
}
