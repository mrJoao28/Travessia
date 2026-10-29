"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { librarySteps } from "./student-home";
import { MissionEditor } from "./mission-editor";

const previewMessage =
  "Prévia de interface · dados fictícios. Não há sessão, envio ou persistência nesta área.";
const unavailable =
  "Esta prévia não envia dados. Seu texto continua no formulário. Para salvar no banco, é necessário integrar o endpoint autenticado do backend.";

function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <p className="preview-banner">{previewMessage}</p>
    </>
  );
}

export function PreviewFlows({
  role,
  route,
}: {
  role: "aluno" | "professor";
  route: string;
}) {
  if (route === "ajuda")
    return (
      <>
        <Heading
          title="Um apoio no caminho."
          description="Encontre sua próxima ação."
        />
        <section className="paper lesson-reader">
          <h2>Como usar o Travessia</h2>
          <p>
            No aluno, consulte objetivos e critérios antes de começar. Abra uma
            etapa, leia o exemplo e escreva sua atividade. No professor, revise
            etapas e critérios antes de publicar.
          </p>
          <h2>Preferências de leitura</h2>
          <p>
            Use “Ajustar leitura” no início da página. Você pode ampliar o
            texto, aumentar o contraste, ajustar o espaçamento e reduzir a
            decoração, sem informar diagnóstico.
          </p>
          <h2>Encontrou uma barreira?</h2>
          <p>
            Descreva o que impediu sua atividade. O formulário informa quem
            poderá ler antes de você enviar.
          </p>
          <p>
            Esta área é uma prévia. Ela não cria contas nem salva ou envia
            atividades.
          </p>
        </section>
      </>
    );
  if (role === "professor") return <TeacherPreview route={route} />;
  if (route === "missoes/biblioteca") return <MissionPreview />;
  if (route === "barreiras")
    return (
      <>
        <Heading
          title="O que podemos tornar mais claro?"
          description="Conte a barreira encontrada na atividade."
        />
        <BarrierForm />
      </>
    );
  if (route === "turmas")
    return (
      <>
        <Heading
          title="Minhas turmas"
          description="Um caminho de aprendizagem em cada turma."
        />
        <ul className="card-list">
          {["Programação I", "Cálculo Aplicado", "Estatística"].map(
            (name, i) => (
              <li className="paper" key={name}>
                <div>
                  <p className="eyebrow">Engenharia da Computação · Aluno</p>
                  <h2>{name}</h2>
                  <p>
                    {
                      [
                        "Uma biblioteca para todos",
                        "Energia no campus",
                        "O tempo na fila",
                      ][i]
                    }
                  </p>
                  <p className="small">
                    Turma fictícia · prévia do dataset de demonstração
                  </p>
                </div>
                <Link
                  className="button button-outline"
                  href={
                    i === 0
                      ? "/previa/aluno/missoes/biblioteca"
                      : "/previa/aluno/entregas"
                  }
                >
                  Ver {i === 0 ? "missão" : "entrega"}
                </Link>
              </li>
            ),
          )}
        </ul>
      </>
    );
  return (
    <>
      <Heading
        title={
          route === "feedback"
            ? "Feedback para seguir aprendendo."
            : "Minhas entregas"
        }
        description="Consulte o estado da atividade e as orientações do professor."
      />
      <ul className="card-list">
        <li className="paper">
          <div>
            <p className="eyebrow accent">Cálculo Aplicado</p>
            <h2>Energia no campus</h2>
            <p>
              <span className="badge pending">
                Aguardando feedback · exemplo
              </span>
            </p>
            <p className="small">
              Entrega fictícia enviada. Nenhum prazo de retorno foi definido
              nesta prévia.
            </p>
          </div>
        </li>
        <li className="paper">
          <div>
            <p className="eyebrow accent">Estatística</p>
            <h2>O tempo na fila</h2>
            <p>
              <span className="badge">Revisada · exemplo</span>
            </p>
            <h3>Orientação do professor fictício</h3>
            <p>
              Você organizou os dados e explicou o cálculo da média. Na próxima
              revisão, compare também a mediana e explique como valores extremos
              influenciam o resultado.
            </p>
            <details>
              <summary>Ver critérios e atividade fictícia</summary>
              <p>
                Critérios: organizar a amostra, justificar a medida escolhida e
                interpretar os resultados.
              </p>
              <p>
                Exemplo de atividade: tabela de tempos de espera e interpretação
                das medidas de tendência central.
              </p>
            </details>
          </div>
        </li>
      </ul>
    </>
  );
}

function MissionPreview() {
  const [index, setIndex] = useState(1);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const instructions = [
    "Liste quem utiliza uma biblioteca e quais informações são necessárias para emprestar um livro.",
    "Organize as funcionalidades em uma sequência: cadastrar, consultar e registrar um empréstimo.",
    "Implemente uma funcionalidade por vez e verifique se ela funciona antes de avançar.",
    "Escolha entradas válidas e inválidas e descreva o resultado esperado para cada uma.",
    "Explique uma escolha de implementação e como você verificou o comportamento do programa.",
  ];
  function changeStep(next: number) {
    setIndex(next);
    requestAnimationFrame(() => titleRef.current?.focus());
  }
  return (
    <>
      <Link className="text-link" href="/previa/aluno">
        ← Voltar ao meu percurso
      </Link>
      <Heading
        title="Uma biblioteca para todos"
        description="Programação I · Crie um sistema de empréstimo de livros."
      />
      <div className="two-column">
        <div>
          <section className="paper">
            <h2>Objetivo de aprendizagem</h2>
            <p>
              Planejar e implementar um programa que organize livros e registre
              empréstimos.
            </p>
            <h3>Critérios de avaliação</h3>
            <ul>
              <li>Definir os dados necessários e justificar a organização.</li>
              <li>Implementar cadastro, consulta e empréstimo.</li>
              <li>Demonstrar testes e explicar as escolhas.</li>
            </ul>
            <h3>Material didático</h3>
            <details>
              <summary>Consultar o material de exemplo</summary>
              <p>
                Um empréstimo relaciona um leitor a um livro disponível. Antes
                de registrar a operação, confira a disponibilidade. Registre a
                data de devolução e altere a disponibilidade do livro.
              </p>
              <p>
                Material próprio, fictício e sem dados pessoais. Uploads e
                arquivos privados não estão disponíveis.
              </p>
            </details>
          </section>
          <section
            className="paper"
            style={{ marginTop: "1rem" }}
            aria-labelledby="stage-title"
          >
            <p className="eyebrow">
              Etapa {index + 1} de 5 · consulta da prévia
            </p>
            <h2 id="stage-title" tabIndex={-1} ref={titleRef}>
              {librarySteps[index]}
            </h2>
            <p>{instructions[index]}</p>
            <details className="example">
              <summary>Ver um exemplo</summary>
              <p>
                Comece desenhando o caminho de um único empréstimo: consultar o
                livro, conferir a disponibilidade e registrar a devolução
                prevista.
              </p>
            </details>
            <div className="actions">
              <button
                className="button button-outline"
                disabled={index === 0}
                onClick={() => changeStep(index - 1)}
              >
                Etapa anterior
              </button>
              <button
                className="button button-outline"
                disabled={index === 4}
                onClick={() => changeStep(index + 1)}
              >
                Próxima etapa
              </button>
            </div>
            <p className="small">
              Consultar etapas não conclui atividades nem altera o progresso.
            </p>
          </section>
          <section className="paper" style={{ marginTop: "1rem" }}>
            <h2>Sua atividade</h2>
            <p>
              Descreva seu planejamento. Os critérios continuam os mesmos ao
              escolher apoios de leitura.
            </p>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage(unavailable);
              }}
            >
              <label htmlFor="activity">
                Planejamento da solução
                <textarea
                  id="activity"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  required
                  maxLength={20000}
                  aria-describedby="activity-help"
                />
              </label>
              <p className="small" id="activity-help">
                O texto permanece apenas nesta tela enquanto você a mantém
                aberta. Nesta prévia não há salvamento no banco.
              </p>
              <div className="actions">
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setMessage(unavailable)}
                >
                  Salvar rascunho
                </button>
                <button className="button" type="submit">
                  Enviar atividade
                </button>
              </div>
              <p role="status">{message}</p>
            </form>
            <Link className="text-link" href="/previa/aluno/barreiras">
              Encontrou uma barreira nesta etapa?
            </Link>
          </section>
        </div>
        <aside className="paper" id="etapas">
          <h2>Todas as etapas</h2>
          <ol>
            {librarySteps.map((step, i) => (
              <li key={step}>
                <button
                  className="text-button"
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => changeStep(i)}
                >
                  {step}
                  {i === index ? " · em consulta" : ""}
                </button>
              </li>
            ))}
          </ol>
          <p className="small">
            Você pode retomar qualquer etapa sem pressão de tempo.
          </p>
        </aside>
      </div>
    </>
  );
}

function BarrierForm() {
  const [shared, setShared] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="paper lesson-reader">
      <h2>Comunicar uma barreira</h2>
      <p>Missão: Uma biblioteca para todos · Planejar a solução.</p>
      <p>
        Descreva o material ou a instrução que precisa de ajuste. Não é
        necessário informar diagnóstico ou dados de saúde.
      </p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(unavailable);
        }}
      >
        <label htmlFor="barrier-description">
          O que dificultou esta atividade?
          <textarea id="barrier-description" required maxLength={3000} />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={shared}
            onChange={(event) => setShared(event.target.checked)}
          />
          Compartilhar este relato com os docentes desta turma
        </label>
        <p className="notice" id="recipients">
          <strong>Quem poderá ler:</strong>{" "}
          {shared
            ? "você e os docentes com vínculo ativo em Programação I."
            : "somente você. O relato não aparecerá para o professor."}
        </p>
        <button className="button" type="submit" aria-describedby="recipients">
          Enviar relato
        </button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}

function TeacherPreview({ route }: { route: string }) {
  const [message, setMessage] = useState("");
  if (route === "missoes/editor")
    return (
      <>
        <Heading
          title="Planeje um caminho de aprendizagem."
          description="Oficina de Projetos Inclusivos · rascunho fictício"
        />
        <MissionEditor />
      </>
    );
  if (route === "barreiras")
    return (
      <>
        <Heading
          title="Apoios e barreiras"
          description="Relatos que o estudante escolheu compartilhar com esta turma."
        />
        <section className="paper lesson-reader">
          <p className="eyebrow">
            Oficina de Projetos Inclusivos · relato fictício compartilhado
          </p>
          <h2>O material está disponível apenas como imagem</h2>
          <p>
            Não consigo selecionar ou ampliar o texto com clareza. É possível
            disponibilizar uma versão em texto?
          </p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(unavailable);
            }}
          >
            <label htmlFor="barrier-reply">
              Resposta ao estudante
              <textarea id="barrier-reply" required maxLength={3000} />
            </label>
            <p className="small">
              Destinatários: autor do relato e docentes com vínculo ativo na
              turma.
            </p>
            <button className="button">Enviar resposta</button>
            <p role="status">{message}</p>
          </form>
        </section>
      </>
    );
  if (route === "entregas")
    return (
      <>
        <Heading
          title="Uma devolutiva para o próximo passo."
          description="Oficina de Projetos Inclusivos · atividades fictícias"
        />
        <section className="paper lesson-reader">
          <p className="eyebrow">
            Aluno fictício A · entrega enviada de exemplo
          </p>
          <h2>Um campus para todos</h2>
          <h3>Atividade</h3>
          <p>
            Organizei as informações do trajeto até a biblioteca e propus
            instruções com texto claro e pontos de referência.
          </p>
          <h3>Critérios</h3>
          <p>
            Identificar uma barreira, justificar a proposta e apresentar uma
            alternativa verificável.
          </p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(unavailable);
            }}
          >
            <label htmlFor="feedback">
              Orientação para o estudante
              <textarea id="feedback" required maxLength={10000} />
            </label>
            <p className="small">
              O estudante autor poderá consultar este feedback. Não há nota
              final automática.
            </p>
            <button className="button">Publicar feedback</button>
            <p role="status">{message}</p>
          </form>
        </section>
      </>
    );
  return (
    <>
      <Heading
        title={
          route === "missoes"
            ? "Missões com um caminho claro."
            : "Ensinar também é construir caminhos."
        }
        description="Oficina de Projetos Inclusivos · contexto docente fictício"
      />
      <section className="paper">
        <p className="eyebrow accent">Turma de demonstração</p>
        <h2>Oficina de Projetos Inclusivos</h2>
        <p>
          O dataset previsto contém 8 alunos fictícios, 2 entregas enviadas e 1
          revisada. Estes dados são uma prévia de conteúdo, sem consulta ao
          banco.
        </p>
        <div className="actions">
          <Link
            className="button button-outline"
            href="/previa/professor/entregas"
          >
            Consultar entregas
          </Link>
          <Link className="text-link" href="/previa/professor/barreiras">
            Ver relato compartilhado
          </Link>
        </div>
      </section>
      <ul className="card-list">
        <li className="paper">
          <div>
            <p className="eyebrow">Missão publicada · exemplo</p>
            <h2>Um campus para todos</h2>
            <p>Identificar uma barreira e propor uma melhoria verificável.</p>
          </div>
          <Link
            className="button button-outline"
            href="/previa/professor/entregas"
          >
            Revisar atividade
          </Link>
        </li>
        <li className="paper">
          <div>
            <p className="eyebrow accent">
              Rascunho pré-criado · exemplo manual
            </p>
            <h2>Informação que inclui</h2>
            <p>Organize objetivos, critérios e etapas antes de publicar.</p>
          </div>
          <Link className="button" href="/previa/professor/missoes/editor">
            Editar rascunho
          </Link>
        </li>
      </ul>
    </>
  );
}
