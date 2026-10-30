"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  pages,
  errorMessage,
  type ApiResponse,
} from "../lib/product-client";
import { Workspace, PathIllustration } from "./workspace";
import { Icon } from "./icons";
import { LiveMission } from "./live-mission";
import { LiveEditor } from "./live-editor";
import { LiveBarriers } from "./live-barriers";
import { OperationStatus } from "./operation-status";
import { ClassroomTools, ClassroomMembers } from "./classroom-tools";
import { LearningNeeds } from "./learning-needs";
import { LiveAdaptations } from "./live-adaptations";
import { SubmissionMedia } from "./submission-media";
import { MissionSupportHub } from "./mission-support-hub";
import { LiveStrategies } from "./live-strategies";

export type Classroom = ApiResponse<"classrooms">["items"][number];
export type Mission = ApiResponse<"mission">;
export type Submission = ApiResponse<"submission">;
export type MissionEntry = {
  mission: Mission;
  classroom: Classroom;
  submissions: Submission[];
};

export function LiveWorkspace({
  ...props
}: {
  role: "aluno" | "professor";
  section?: string;
  missionId?: string;
  classroomId?: string;
  versionId?: string;
}) {
  return (
    <WorkspaceView
      key={`${props.role}:${props.section ?? ""}:${props.missionId ?? ""}:${props.classroomId ?? ""}:${props.versionId ?? ""}`}
      {...props}
    />
  );
}

function WorkspaceView({
  role,
  section = "",
  missionId,
  classroomId,
  versionId,
}: {
  role: "aluno" | "professor";
  section?: string;
  missionId?: string;
  classroomId?: string;
  versionId?: string;
}) {
  const [profile, setProfile] = useState<ApiResponse<"me"> | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [entries, setEntries] = useState<MissionEntry[]>([]);
  const [selected, setSelected] = useState(classroomId ?? "");
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setPending(true);
    setError("");
    setEntries([]);
    setClassrooms([]);
    setProfile(null);
    async function load() {
      try {
        const me = await api("me");
        const rooms = await pages("classrooms");
        const permitted = rooms.filter(
          (room) => room.role === (role === "aluno" ? "student" : "teacher"),
        );
        const relevant = selected
          ? permitted.filter((room) => room.id === selected)
          : permitted;
        const preparingEditor = role === "professor" && ["editor", "nova", "turmas", "ajuda", "barreiras"].includes(section);
        const needsDeliveries = role === "aluno" || ["", "missoes", "entregas", "feedback"].includes(section);
        const data = preparingEditor ? [] : (
          await Promise.all(
            relevant.map(async (classroom) => {
              const missions = missionId ? [await api("mission", { params: { id: missionId } })].filter(m => m.classroomId === classroom.id) : await pages("missions", classroom.id);
              return Promise.all(
                missions.map(async (mission) => ({
                  mission,
                  classroom,
                  submissions: needsDeliveries ? await pages("submissions", mission.id) : [],
                })),
              );
            }),
          )
        ).flat();
        if (active) {
          setProfile(me);
          setClassrooms(rooms);
          setEntries(data);
        }
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setPending(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [role, selected, reload, section, missionId]);
  const permitted = classrooms.filter(
    (room) => room.role === (role === "aluno" ? "student" : "teacher"),
  );
  const chosen = permitted.find((room) => room.id === selected) ?? permitted[0];
  const singleContext = ["barreiras", "nova", "editor"].includes(section);
  const title = role === "aluno" ? (section === "apoios" ? "Meus apoios de aprendizagem" : "Um passo de cada vez.") : ({ adaptacoes: "Deixe a atividade mais clara", estrategias: "Prepare os apoios da missão", apoios: "Como você quer apoiar sua turma?", missoes: "Suas missões", entregas: "Acompanhe as entregas", turmas: "Organize suas turmas", barreiras: "Pedidos e barreiras de aprendizagem", ajuda: "Como podemos ajudar?" }[section] ?? "O que vamos preparar hoje?");
  const guidedEditor = role === "professor" && ["editor", "nova"].includes(section);
  const otherRole = classrooms.some(
    (room) => room.role === (role === "aluno" ? "teacher" : "student"),
  );
  return (
    <Workspace
      role={role}
      preferences={profile?.preferences}
      account={
        profile
          ? {
              name: profile.name,
              course: profile.course,
              ...(otherRole
                ? {
                    switchHref: role === "aluno" ? "/professor" : "/aluno",
                    switchLabel: `Ir para o espaço ${role === "aluno" ? "do professor" : "do aluno"}`,
                  }
                : {}),
            }
          : undefined
      }
    >
      {!guidedEditor && <div className="page-heading">
        <h1>{title}</h1>
        <p>
          {section === "adaptacoes" ? "Ajuste as instruções. O objetivo da atividade continua o mesmo." : section === "estrategias" ? "Prepare apoios para uma etapa ou missão, com destinatários definidos por você." : role === "aluno"
            ? "Retome sua missão de onde parou."
            : "Organize objetivos, etapas e devolutivas para sua turma."}
        </p>
      </div>}
      {pending ? (
        <section className="paper" role="status">
          <h2>Abrindo seu percurso…</h2>
          <p>Consultando sua sessão e os vínculos no servidor.</p>
        </section>
      ) : error ? (
        <section className="paper">
          <h2>Não foi possível abrir seu percurso</h2>
          <p role="alert">{error}</p>
          <div className="actions">
            <button className="button" onClick={() => setReload((n) => n + 1)}>
              Tentar novamente
            </button>
            {error.startsWith("Sua sessão expirou.") && <Link className="text-link" href="/login">Entrar novamente</Link>}
          </div>
        </section>
      ) : (
        <>
          {profile?.demo && (
            <p className="demo-banner">
              Ambiente de demonstração · dados fictícios
            </p>
          )}
          {(section === "turmas" ||
            (!permitted.length && role === "professor")) && (
            <ClassroomTools
              teacher={role === "professor"}
              onChanged={() => setReload((n) => n + 1)}
            />
          )}
          {!permitted.length ? (
            <section className="paper">
              <h2>Nenhuma turma neste espaço</h2>
              <p>
                Seus vínculos são definidos no servidor. Escolher um espaço não
                concede um papel.
              </p>
            </section>
          ) : (
            <>
              {!["missao", "editor", "nova"].includes(section) && !missionId && !(role === "professor" && ["adaptacoes", "estrategias", "apoios"].includes(section)) &&
                (role === "professor" || !!section || !!selected) && (
                  <label
                    className="classroom-selector"
                    htmlFor="classroom-context"
                  >
                    Contexto de turma
                    <select
                      id="classroom-context"
                      value={singleContext ? (chosen?.id ?? "") : selected}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {!singleContext && (
                        <option value="">
                          Todas as minhas turmas como{" "}
                          {role === "aluno" ? "aluno" : "professor"}
                        </option>
                      )}
                      {permitted.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              {section === "apoios" && role === "aluno" ? <LearningNeeds classrooms={permitted} /> : section === "adaptacoes" && role === "professor" ? <LiveAdaptations entries={entries} initialMissionId={missionId} initialVersionId={versionId} /> : section === "apoios" && role === "professor" ? <MissionSupportHub entry={entries.find(e => e.mission.id === missionId)} /> : section === "estrategias" && role === "professor" ? <LiveStrategies entries={entries} initialMissionId={missionId} initialVersionId={versionId} /> : section === "missao" && missionId ? (
                <LiveMission
                  id={missionId}
                  role={role}
                  classrooms={permitted}
                />
              ) : section === "editor" && missionId ? (
                <LiveEditor id={missionId} />
              ) : section === "nova" && chosen ? (
                <LiveEditor classroomId={chosen.id} />
              ) : section === "barreiras" && chosen ? (
                <LiveBarriers classroom={chosen} />
              ) : section === "turmas" ? (
                <ul className="card-list">
                  {permitted.map((room) => (
                    <li key={room.id} className="paper">
                      <div>
                        <h2>{room.name}</h2>
                        <p>
                          {role === "aluno" ? "Aluno" : "Professor"} · vínculo
                          ativo
                        </p>
                      </div>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setSelected(room.id);
                          window.location.assign(
                            `/${role}?turma=${encodeURIComponent(room.id)}`,
                          );
                        }}
                      >
                        Abrir turma
                      </button>
                    </li>
                  ))}
                </ul>
              ) : role === "aluno" && !section ? (
                <StudentDashboard entries={entries} />
              ) : section === "feedback" || section === "entregas" ? (
                <SubmissionList role={role} entries={entries} />
              ) : section === "ajuda" ? (
                <section className="paper">
                  <h2>Um apoio no caminho</h2>
                  {role === "professor" ? <><ol><li>Abra uma turma e escolha Criar missão.</li><li>Preencha o objetivo e os critérios, depois organize as etapas.</li><li>Salve o rascunho. Prepare apoios se necessário.</li><li>Confira a revisão e confirme a publicação.</li><li>Consulte as entregas para escrever o feedback.</li></ol><p>A IA é opcional. O professor sempre revisa antes de publicar.</p><Link className="text-link" href="/professor">Voltar às minhas turmas</Link></> : <p>
                    Consulte os objetivos e critérios, escolha uma etapa e use
                    “Ver um exemplo” quando precisar. As preferências ficam em
                    “Ajustar leitura”. Para comunicar uma barreira, use o
                    formulário dentro da etapa; os destinatários aparecem antes
                    do envio.
                  </p>}
                </section>
              ) : (
                <TeacherDashboard
                  classrooms={permitted}
                  entries={entries}
                  classroom={
                    selected || permitted.length === 1 ? chosen : undefined
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Workspace>
  );
}

function StudentDashboard({ entries }: { entries: MissionEntry[] }) {
  const entriesWithVersion = entries.filter(
    (entry) => entry.mission.publishedVersion,
  );
  const entry =
    entriesWithVersion.find(
      (e) =>
        !e.submissions.some(
          (s) =>
            s.versionId === e.mission.publishedVersion?.id &&
            s.status !== "draft",
        ),
    ) ?? entriesWithVersion[0];
  if (!entry?.mission.publishedVersion)
    return (
      <section className="paper">
        <h2>Seu percurso está sendo preparado.</h2>
        <p>As missões publicadas pelos docentes aparecerão aqui.</p>
      </section>
    );
  const version = entry.mission.publishedVersion;
  const submission = entry.submissions.find((s) => s.versionId === version.id);
  const index = Math.max(
    0,
    version.steps.findIndex((step) => step.id === submission?.currentStepId),
  );
  const current = version.steps[index];
  return (
    <>
      <section className="mission-hero" aria-labelledby="mission-title">
        <div className="hero-copy">
          <p className="eyebrow accent">{entry.classroom.name}</p>
          <h2 id="mission-title">{version.title}</h2>
          <p className="hero-description">{version.description}</p>
          <p className="progress-description">
            Etapa {index + 1} de {version.steps.length} · {current?.title}
          </p>
          <ol
            className="stepper"
            style={{
              gridTemplateColumns: `repeat(${version.steps.length},minmax(0,1fr))`,
            }}
            aria-label="Etapas da missão"
          >
            {version.steps.map((step, i) => (
              <li
                key={step.id}
                className={
                  submission?.completedStepIds.includes(step.id) || i === index
                    ? "step-active"
                    : ""
                }
                aria-current={i === index ? "step" : undefined}
              >
                <span className="step-dot" aria-hidden="true">
                  {submission?.completedStepIds.includes(step.id)
                    ? "✓"
                    : i === index
                      ? "●"
                      : ""}
                </span>
                <span>
                  {i + 1}. {step.title}
                  {submission?.completedStepIds.includes(step.id) && (
                    <span className="sr-only">, concluída</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="actions">
            <Link
              className="button"
              href={`/aluno/missoes/${entry.mission.id}`}
            >
              Continuar missão
              <Icon name="arrow" />
            </Link>
            <Link
              className="text-link"
              href={`/aluno/missoes/${entry.mission.id}#etapas`}
            >
              Ver todas as etapas
            </Link>
          </div>
        </div>
        <PathIllustration />
      </section>
      <div className="content-grid">
        <section className="paper path-card">
          <h2>Seu percurso nesta missão</h2>
          <p className="muted">
            Continue aprendendo com atividades pensadas para o seu
            desenvolvimento.
          </p>
          <ol className="lesson-list">
            {version.steps
              .slice(Math.max(0, index - 1), index + 1)
              .map((step) => (
                <li
                  key={step.id}
                  className={step.id === current?.id ? "current-lesson" : ""}
                >
                  <span className="lesson-number">{step.position}</span>
                  <div className="lesson-body">
                    <p className="eyebrow accent">{entry.classroom.name}</p>
                    <h3>
                      <Link href={`/aluno/missoes/${entry.mission.id}`}>
                        {step.title}
                      </Link>
                    </h3>
                    <p>{step.instructions}</p>
                  </div>
                  <span
                    className={`badge ${submission?.completedStepIds.includes(step.id) ? "" : "pending"}`}
                  >
                    {submission?.completedStepIds.includes(step.id)
                      ? "✓ Concluída"
                      : step.id === current?.id
                        ? "Em andamento"
                        : "A fazer"}
                  </span>
                </li>
              ))}
          </ol>
        </section>
        <section className="paper support-card">
          <h2>Aprenda do seu jeito</h2>
          <p>Ajuste a experiência de estudo para suas necessidades.</p>
          <Link
            className="support-option"
            href={`/aluno/missoes/${entry.mission.id}#etapas`}
          >
            <Icon name="list" />
            Dividir em passos<span aria-hidden="true">›</span>
          </Link>
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
          <Link
            className="barrier-link"
            href={`/aluno/missoes/${entry.mission.id}#barreira`}
          >
            Encontrou uma barreira?
          </Link>
        </section>
      </div>
    </>
  );
}

function TeacherDashboard({
  entries,
  classroom,
  classrooms,
}: {
  entries: MissionEntry[];
  classroom?: Classroom;
  classrooms: Classroom[];
}) {
  if (!classroom) return <section className="paper"><h2>Escolha uma turma para começar</h2><p>Abra a turma para criar missões, preparar apoios e acompanhar as entregas.</p><ul className="card-list">{classrooms.map(room => <li className="paper" key={room.id}><h3>{room.name}</h3><Link className="text-link" href={`/professor?turma=${encodeURIComponent(room.id)}`}>Abrir turma</Link></li>)}</ul><Link className="text-link" href="/professor/turmas">Gerenciar turmas e convites</Link></section>;
  return (
    <>
      <section className="paper teacher-overview">
        <div>
          <p className="eyebrow accent">Planejar, acompanhar e incluir</p>
          <h2>{classroom?.name ?? "Minhas missões"}</h2>
          <p>
            Consulte as entregas e os relatos compartilhados. Rascunhos permanecem
            privados até a publicação.
          </p>
          <div className="actions">
            {classroom && (
              <Link
                className="button"
                href={`/professor/missoes/nova?turma=${encodeURIComponent(classroom.id)}`}
              >
                Criar missão
              </Link>
            )}
            <Link className="text-link" href="/professor/entregas">
              Consultar entregas
            </Link>
            <Link className="text-link" href="/professor/barreiras">
              Apoios e barreiras
            </Link>
            <Link className="text-link" href="/professor/turmas">Gerenciar turmas e convites</Link>
          </div>
        </div>
        <PathIllustration variant="teacher" />
      </section>
      {classroom && <details className="paper teacher-disclosure"><summary>Alunos da turma e convites</summary><ClassroomMembers classroom={classroom} /></details>}
      <ul className="card-list">
        {entries.map(({ mission, classroom: room }) => (
          <li className="paper" key={mission.id}>
            <div>
              <p className="eyebrow accent">{room.name}</p>
              <h2>
                {(mission.draftVersion ?? mission.publishedVersion)?.title}
              </h2>
              <p>
                {mission.status === "published"
                  ? "Publicada"
                  : mission.status === "draft"
                    ? "Rascunho"
                    : "Arquivada"}
                {mission.draftVersion
                  ? " · rascunho disponível para revisão"
                  : ""}
              </p>
              {mission.draftVersion?.source === "demo_fixture" && (
                <p className="small">
                  Rascunho fictício pré-criado para a demonstração.
                </p>
              )}
            </div>
            {mission.status !== "archived" && (
              <Link
                className="button"
                href={`/professor/missoes/${mission.id}/editar`}
              >
                Editar e revisar
              </Link>
            )}
            <Link className="text-link" href={`/professor/missoes/${mission.id}/apoios`}>Preparar apoios</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function SubmissionList({
  entries,
  role,
}: {
  entries: MissionEntry[];
  role: "aluno" | "professor";
}) {
  const submitted = entries.flatMap((entry) =>
    entry.submissions
      .filter((s) => role === "aluno" || s.status !== "draft")
      .map((submission) => ({ entry, submission })),
  );
  return (
    <>
      <h2>
        {role === "aluno" ? "Entregas e feedback" : "Entregas para acompanhar"}
      </h2>
      {!submitted.length && (
        <p className="paper">Nenhuma entrega disponível neste contexto.</p>
      )}
      {role === "professor" && <p className="small"><Link className="text-link" href="/professor/barreiras">Apoios e barreiras</Link></p>}
      <ul className="card-list">
        {submitted.map(({ entry, submission }) => (
          <li className="paper" key={submission.id}>
            <div>
              <p className="eyebrow accent">{entry.classroom.name}</p>
              <h2>
                {
                  (entry.mission.publishedVersion ?? entry.mission.draftVersion)
                    ?.title
                }
              </h2>
              <p className="badge">
                {submission.status === "draft"
                  ? "Rascunho"
                  : submission.status === "submitted"
                    ? "Aguardando feedback"
                    : "Revisada"}
              </p>
              {role === "aluno" && <SubmissionMedia id={submission.id} hasAudio={submission.hasAudio} hasTextFile={submission.hasTextFile} />}
              {submission.feedback.map((feedback) => (
                <blockquote key={feedback.id}>
                  <p>{feedback.content}</p>
                  <footer>
                    Feedback docente ·{" "}
                    {new Date(feedback.createdAt).toLocaleDateString("pt-BR")}
                  </footer>
                </blockquote>
              ))}
              <Link
                className="text-link"
                href={`/${role}/missoes/${entry.mission.id}`}
              >
                Consultar atividade
              </Link>
              {role === "professor" && (
                <TeacherFeedback submission={submission} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function TeacherFeedback({ submission }: { submission: Submission }) {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  if (submission.status === "reviewed" || done)
    return (
      <div><SubmissionMedia id={submission.id} hasAudio={submission.hasAudio} hasTextFile={submission.hasTextFile} /><p role="status">
        {done
          ? "Feedback publicado pelo servidor."
          : "Esta entrega já foi revisada."}
      </p></div>
    );
  return (
    <details>
      <summary>Consultar entrega e escrever feedback</summary>
      <p className="submission-content">{submission.content}</p>
      <SubmissionMedia id={submission.id} hasAudio={submission.hasAudio} hasTextFile={submission.hasTextFile} />
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setMessage("");
          try {
            await api("feedback", {
              params: { id: submission.id },
              body: { content },
            });
            setDone(true);
          } catch (reason) {
            setMessage(errorMessage(reason));
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor={`feedback-${submission.id}`}>
          Orientação para o próximo passo
          <textarea
            disabled={pending}
            id={`feedback-${submission.id}`}
            required
            maxLength={6000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <p className="small">
          Destinatário: estudante autor da entrega. O feedback é docente, sem
          avaliação final automática.
        </p>
        <button className="button" disabled={pending}>
          {pending ? "Publicando…" : "Publicar feedback"}
        </button>
        <OperationStatus message={message} />
      </form>
    </details>
  );
}
