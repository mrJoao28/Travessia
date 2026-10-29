import Link from 'next/link';
import { PathIllustration, Workspace } from '../../components/workspace';

const steps = ['Compreender o problema', 'Planejar a solução', 'Desenvolver', 'Testar e ajustar', 'Apresentar'];
export default function StudentPage() {
  return <Workspace role="aluno">
    <div className="page-heading"><h1>Um passo de cada vez.</h1><p>Encontre seu próximo passo no percurso de aprendizagem.</p></div>
    <section className="mission-hero" aria-labelledby="mission-title">
      <div><p className="eyebrow accent">Programação I</p><h2 id="mission-title">Uma biblioteca<br className="desktop-break" /> para todos</h2><p>Crie um sistema de empréstimo de livros.</p><p className="progress-description">Etapa 2 de 5 · Planejar a solução</p>
      <ol className="stepper" aria-label="Etapas da missão">{steps.map((step, index) => <li key={step} className={index < 2 ? 'step-active' : ''} aria-current={index === 1 ? 'step' : undefined}><span className="step-dot" aria-hidden="true">{index === 0 ? '✓' : index + 1}</span><span>{step}{index === 0 && <span className="sr-only">, concluída</span>}</span></li>)}</ol>
      <div className="actions"><Link className="button" href="/aluno/missoes/biblioteca">Explorar missão <span aria-hidden="true">→</span></Link><a className="text-link" href="#percurso">Ver o percurso</a></div></div><PathIllustration />
    </section>
    <div className="content-grid"><section className="paper" id="percurso" aria-labelledby="path-title"><h2 id="path-title">Seu percurso nesta missão</h2><p className="muted">Etapas claras para organizar suas próximas ações.</p><ol className="lesson-list"><li><span className="lesson-number">1</span><div><h3>Investigar o problema</h3><p>Conhecer os usuários e definir o que o sistema precisa fazer.</p></div><span className="badge">Exemplo concluído</span></li><li><span className="lesson-number">2</span><div><h3>Planejar a solução</h3><p>Organizar as funcionalidades antes de começar a programar.</p></div><span className="badge pending">Etapa atual</span></li></ol></section>
    <section className="paper support-card" aria-labelledby="support-title"><h2 id="support-title">Aprenda do seu jeito</h2><p>Amplie o texto, aumente o contraste ou reduza a decoração.</p><a className="button button-outline" href="#preferencias">Ajustar minha leitura</a><p className="small">Os controles ficam no início da página e funcionam por teclado.</p></section></div>
    <div className="content-grid secondary-details"><section className="paper" id="turmas"><h2>Minhas turmas</h2><p><strong>Programação I</strong> · Turma de demonstração</p><p className="small">O ingresso por convite será implementado na próxima etapa.</p></section><section className="paper" id="entregas"><h2>Entregas e feedback</h2><p>Nenhum trabalho real é enviado nesta demonstração.</p><p id="feedback" className="small">O espaço de feedback será conectado à API após a implementação da autenticação.</p></section></div>
  </Workspace>;
}
