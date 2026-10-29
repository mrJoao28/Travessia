import Link from "next/link";
import { Icon } from "./icons";
import { PathIllustration } from "./workspace";

export const librarySteps = [
  "Compreender o problema",
  "Planejar a solução",
  "Desenvolver o protótipo",
  "Testar e ajustar",
  "Apresentar o resultado",
];

export function StudentHomePreview() {
  return (
    <>
      <div className="page-heading">
        <h1>Um passo de cada vez.</h1>
        <p>Retome sua missão de onde parou.</p>
      </div>
      <section className="mission-hero" aria-labelledby="mission-title">
        <div className="hero-copy">
          <p className="eyebrow accent">Programação I</p>
          <h2 id="mission-title">Uma biblioteca para todos</h2>
          <p className="hero-description">
            Crie um sistema de empréstimo de livros.
          </p>
          <p className="progress-description">
            Etapa 2 de 5 · Planejar a solução
          </p>
          <ol
            className="stepper"
            aria-label="Etapas da missão — exemplo fictício"
          >
            {librarySteps.map((step, index) => (
              <li
                key={step}
                className={index < 2 ? "step-active" : ""}
                aria-current={index === 1 ? "step" : undefined}
              >
                <span className="step-dot" aria-hidden="true">
                  {index === 0 ? "✓" : index === 1 ? "●" : ""}
                </span>
                <span>
                  {index + 1}. {step}
                  {index === 0 && (
                    <span className="sr-only">, concluída no exemplo</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="actions">
            <Link className="button" href="/previa/aluno/missoes/biblioteca">
              Continuar missão <Icon name="arrow" />
            </Link>
            <Link
              className="text-link"
              href="/previa/aluno/missoes/biblioteca#etapas"
            >
              Ver todas as etapas
            </Link>
          </div>
        </div>
        <PathIllustration />
      </section>
      <div className="content-grid">
        <section className="paper path-card" aria-labelledby="path-title">
          <h2 id="path-title">Seu percurso nesta semana</h2>
          <p className="muted">
            Continue aprendendo com atividades pensadas para o seu
            desenvolvimento.
          </p>
          <ol className="lesson-list">
            <li>
              <span className="lesson-number">1</span>
              <div className="lesson-body">
                <p className="eyebrow accent">Programação I</p>
                <h3>Investigar o problema</h3>
                <p>
                  Entenda o contexto, identifique as necessidades dos usuários e
                  defina o escopo do sistema.
                </p>
              </div>
              <span className="lesson-format">
                <span><Icon name="book" />Leitura e análise</span>
                <span><Icon name="clock" />40 min</span>
              </span>
              <span className="badge">✓ Concluída</span>
            </li>
            <li className="current-lesson">
              <span className="lesson-number">2</span>
              <div className="lesson-body">
                <p className="eyebrow accent">Programação I</p>
                <h3>
                  <Link href="/previa/aluno/missoes/biblioteca">
                    Planejar a solução
                  </Link>
                </h3>
                <p>
                  Defina as funcionalidades, escolha as tecnologias e organize
                  as tarefas.
                </p>
              </div>
              <span className="lesson-format">
                <span><Icon name="book" />Leitura e atividade</span>
                <span><Icon name="clock" />50 min</span>
              </span>
              <span className="badge pending">Em andamento</span>
            </li>
          </ol>
        </section>
        <section className="paper support-card" aria-labelledby="support-title">
          <h2 id="support-title">Aprenda do seu jeito</h2>
          <p>Ajuste a experiência de estudo para suas necessidades.</p>
          <a
            className="support-option"
            href="/previa/aluno/missoes/biblioteca#etapas"
          >
            <Icon name="list" />
            Dividir em passos<span aria-hidden="true">›</span>
          </a>
          <a className="support-option" href="#preferencias">
            <span className="type-icon" aria-hidden="true">
              Aa
            </span>
            Ampliar texto<span aria-hidden="true">›</span>
          </a>
          <a className="support-option" href="#preferencias">
            <Icon name="eye" />
            Reduzir distrações<span aria-hidden="true">›</span>
          </a>
          <Link className="barrier-link" href="/previa/aluno/barreiras">
            Encontrou uma barreira?
          </Link>
        </section>
      </div>
      <p className="preview-note">
        Prévia visual · cenário fictício de Programação I conforme DEMO.md.
        Progresso ilustrativo, sem conexão com o banco.
      </p>
    </>
  );
}
