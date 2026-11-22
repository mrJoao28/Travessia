"use client";

import { StudentFirstSteps } from "./first-steps-guide";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import {TeacherFirstSteps} from "./teacher-first-steps";
import { LearningNeeds } from "./learning-needs";
import { LiveAdaptations } from "./live-adaptations";
import { SubmissionMedia } from "./submission-media";
import { MissionSupportHub } from "./mission-support-hub";
import { LiveStrategies } from "./live-strategies";
import { MonitorDashboard } from "./monitoria-panel";

export type Classroom = ApiResponse<"classrooms">["items"][number];
export type Mission = ApiResponse<"mission">;
export type Submission = ApiResponse<"submission">;
export type MissionEntry = {
  mission: Mission;
  classroom: Classroom;
  submissions: Submission[];
  groups?: ApiResponse<"groups">["items"];
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
        const permitted = rooms.filter((room) =>
          role === "aluno"
            ? room.role === "student"
            : room.role === "teacher" || room.role === "monitor",
        );
        const relevant = selected
          ? permitted.filter((room) => room.id === selected)
          : permitted;
        const preparingEditor = role === "professor" && ["editor", "nova", "turmas", "ajuda", "barreiras"].includes(section);
        const needsDeliveries = role === "aluno" || ["", "atividades", "entregas", "feedback"].includes(section);
        // Fetch a directly requested mission once. A student can belong to
        // several classrooms, and the API correctly rejects that mission ID
        // when it is queried in a classroom that does not own it.
        const requestedMission = missionId && !preparingEditor
          ? await api("mission", { params: { id: missionId } })
          : null;
        const data = preparingEditor ? [] : (
          await Promise.all(
            relevant.map(async (classroom) => {
              const missions = requestedMission
                ? requestedMission.classroomId === classroom.id
                  ? [requestedMission]
                  : []
                : await pages("missions", classroom.id);
              return Promise.all(
                missions.map(async (mission) => ({
                  mission,
                  classroom,
                  submissions: needsDeliveries ? await pages("submissions", mission.id) : [],
                  groups: needsDeliveries && (mission.publishedVersion ?? mission.draftVersion)?.workMode === "group" ? (await api("groups", { params: { id: mission.id } })).items : [],
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
  const permitted = classrooms.filter((room) =>
    role === "aluno"
      ? room.role === "student"
      : room.role === "teacher" || room.role === "monitor",
  );
  const chosen = permitted.find((room) => room.id === selected) ?? permitted[0];
  const singleContext = ["barreiras", "nova", "editor"].includes(section);
  const monitorHome = role === "professor" && !section && chosen?.role === "monitor" && (selected === chosen.id || permitted.length === 1);
  const title = role === "aluno" ? (section === "apoios" ? "Meus apoios de aprendizagem" : "Um passo de cada vez.") : monitorHome ? "Painel de monitoria" : ({ adaptacoes: "Adaptar material para um aluno", estrategias: "Estratégias de apoio", apoios: "Materiais e apoios da atividade", atividades: "Suas atividades", entregas: "Acompanhe as entregas", turmas: "Organize suas turmas", barreiras: "Pedidos e barreiras de aprendizagem", ajuda: "Como podemos ajudar?" }[section] ?? "O que vamos preparar hoje?");
  const materialWorkspace=role==="professor"&&["adaptacoes","estrategias","apoios"].includes(section);
  const guidedEditor = role === "professor" && ["editor", "nova"].includes(section);
  return (
    <Workspace
      role={role}
      teachingLabel={chosen?.role === "monitor" ? "monitor" : "professor"}
      preferences={profile?.preferences}
      account={
        profile
          ? {
              name: profile.name,
              course: profile.course,
              switchHref: role === "aluno" ? "/professor" : "/aluno",
              switchLabel: `Ir para o espaço ${role === "aluno" ? "do professor" : "do aluno"}`,
            }
          : undefined
      }
    >
      {!guidedEditor && <div className={`page-heading${materialWorkspace?" material-page-heading":""}`}>
        <h1>{title}</h1>
        <p>
          {materialWorkspace ? "Prepare, compare e confira antes de disponibilizar ao aluno." : role === "aluno"
            ? (entries.some(entry=>entry.mission.publishedVersion)?"Retome sua atividade de onde parou.":"Suas atividades serão mostradas aqui.")
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
          {((section === "turmas" && (chosen?.role === "teacher" || chosen?.role === "monitor" || !permitted.length)) ||
            (!permitted.length && role === "professor")) && (
            <ClassroomTools
              teacher={role === "professor"}
              onChanged={() => setReload((n) => n + 1)}
            />
          )}
          {!permitted.length ? (
            <section className="paper">
              <h2>Nenhuma turma neste espaço</h2>
              <p>{role === "aluno" ? "Peça um convite ao professor para começar sua primeira atividade." : "Crie sua primeira turma para preparar atividades e convidar os alunos."}</p>
              {role === "aluno" && section !== "turmas" && <Link className="button" href="/aluno/turmas">Entrar na minha turma</Link>}
              <p><Link className="text-link" href={`/boas-vindas?espaco=${role === "aluno" ? "professor" : "aluno"}`}>{role === "aluno" ? "Quero preparar uma turma como professor" : "Quero participar como aluno"}</Link></p>
            </section>
          ) : (
            <>
              {!["atividade", "editor", "nova"].includes(section) && !missionId && !(role === "professor" && ["adaptacoes", "estrategias", "apoios"].includes(section)) &&
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
                          {role === "aluno"
                            ? "Todas as minhas turmas como aluno"
                            : permitted.some((room) => room.role === "monitor")
                              ? "Todas as minhas turmas"
                              : "Todas as minhas turmas como professor"}
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
              {section === "apoios" && role === "aluno" ? <LearningNeeds classrooms={permitted} /> : section === "adaptacoes" && role === "professor" ? <LiveStrategies entries={entries} initialMissionId={missionId} initialVersionId={versionId} /> : section === "apoios" && role === "professor" ? <MissionSupportHub entry={entries.find(e => e.mission.id === missionId)} /> : section === "estrategias" && role === "professor" ? <LiveStrategies entries={entries} initialMissionId={missionId} initialVersionId={versionId} /> : section === "atividade" && missionId && profile ? (
                <LiveMission
                  key={`${profile.id}:${missionId}`}
                  viewerId={profile.id}
                  id={missionId}
                  role={role}
                  classrooms={permitted}
                />
              ) : section === "editor" && missionId ? (
                <LiveEditor id={missionId} classroomNames={Object.fromEntries(permitted.map(room => [room.id, room.name]))} />
              ) : section === "nova" && chosen ? (
                <LiveEditor classroomId={chosen.id} classroomNames={Object.fromEntries(permitted.map(room => [room.id, room.name]))} />
              ) : section === "barreiras" && chosen ? (
                <LiveBarriers classroom={chosen} />
              ) : section === "turmas" ? (
                <ul className="card-list">
                  {permitted.map((room) => (
                    <li key={room.id} className="paper">
                      <div>
                        <h2>{room.name}</h2>
                        <p>
                          {room.role === "student" ? "Aluno" : room.role === "monitor" ? "Monitor" : "Professor"} · vínculo
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
                      {(room.role === "student" || room.role === "monitor") && (
                        <LeaveClassroom
                          classroom={room}
                          onLeft={() => {
                            if (selected === room.id) setSelected("");
                            setReload((n) => n + 1);
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : role === "aluno" && !section ? (
                <StudentDashboard entries={entries} classrooms={selected?permitted.filter(c=>c.id===selected):permitted} />
              ) : section === "feedback" || section === "entregas" ? (
                <SubmissionList role={role} entries={entries} />
              ) : section === "ajuda" ? (
                <section className="paper">
                  <h2>Um apoio no caminho</h2>
                  {role === "professor" ? <><ol><li>Abra uma turma e escolha Criar atividade.</li><li>Preencha o objetivo e os critérios, depois organize as etapas.</li><li>Salve o rascunho. Prepare apoios se necessário.</li><li>Confira a revisão e confirme a publicação.</li><li>Consulte as entregas para escrever o feedback.</li></ol><p>A IA é opcional. O professor sempre revisa antes de publicar.</p><Link className="text-link" href="/professor">Voltar às minhas turmas</Link></> : <p>
                    Consulte os objetivos e critérios, escolha uma etapa e use
                    “Ver um exemplo” quando precisar. As preferências ficam em
                    “Ajustar leitura”. Para comunicar uma barreira, use o
                    formulário dentro da etapa; os destinatários aparecem antes
                    do envio.
                  </p>}
                </section>
              ) : monitorHome ? (
                <MonitorDashboard classroom={chosen} entries={entries} />
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

function LeaveClassroom({ classroom, onLeft }: { classroom: Classroom; onLeft: () => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function leave() {
    if (pending || !window.confirm(`Sair da turma ${classroom.name}? Você perderá o acesso às atividades e entregas dessa turma.`)) return;
    setPending(true);
    setMessage("");
    try {
      await api("leaveClassroom", { params: { id: classroom.id }, body: {} });
      onLeft();
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }
  return <div className="form-stack">
    <button className="button button-outline" type="button" aria-label={`Sair da turma ${classroom.name}`} disabled={pending} onClick={() => void leave()}>
      {pending ? "Saindo…" : "Sair da turma"}
    </button>
    {message && <p role="alert">{message}</p>}
  </div>;
}

function StudentDashboard({ entries,classrooms }: { entries: MissionEntry[];classrooms:Classroom[] }) {
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
        <h2>{classrooms.length===1?`Você entrou na turma ${classrooms[0].name}.`:"Você já está nas suas turmas."}</h2>
        <p>A primeira atividade ainda será publicada. Quando o professor disponibilizar uma atividade, ela aparecerá aqui.</p><p>Enquanto isso, ajuste a leitura no início da página ou consulte Meus apoios para registrar o que ajuda você a aprender.</p>
      </section>
    );
  const version = entry.mission.publishedVersion;
  const submission = entry.submissions.filter(s => s.versionId === version.id).sort((a, b) => (b.attempt ?? 1) - (a.attempt ?? 1))[0];
  const index = Math.max(
    0,
    version.steps.findIndex((step) => step.id === submission?.currentStepId),
  );
  const current = version.steps[index];
  const firstMission=entries.every(e=>e.submissions.length===0);
  return (
    <>
      <section className="paper preview-student-continue" aria-labelledby="mission-title">
        <div className="preview-student-continue-copy">
          <p className="eyebrow accent">{entry.classroom.name}</p>
          <h2 id="mission-title">{version.title}</h2>
          <p>{version.description}</p>
          <p className="small">Etapa {index + 1} de {version.steps.length} · {current?.title}</p>
          <Link className="button" href={`/aluno/atividades/${entry.mission.id}`}>
            {firstMission ? "Começar minha primeira atividade" : "Continuar atividade"}
            <Icon name="arrow" />
          </Link>
        </div>
        <PathIllustration sizes="(max-width: 600px) 208px, 320px" />
      </section>
      {firstMission && <details className="paper student-first-mission-help">
        <summary>Primeiros passos</summary>
        <StudentFirstSteps />
      </details>}
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
  const hasPublished=entries.some(e=>e.mission.status==='published');
  const draft=entries.find(e=>e.mission.status==='draft');
  if (!classroom) return <section className="paper"><h2>Escolha uma turma para começar</h2><p>Abra a turma para preparar atividades.</p><ul className="card-list">{classrooms.map(room => <li className="paper" key={room.id}><h3>{room.name}</h3><p>{room.role === 'monitor' ? 'Monitor' : 'Professor'}</p><Link className="text-link" href={`/professor?turma=${encodeURIComponent(room.id)}`}>Abrir turma</Link></li>)}</ul></section>;
  return (
    <>
      <section className="paper teacher-overview">
        <div>
          <p className="eyebrow accent">Planejar, acompanhar e incluir</p>
          <h2>{classroom?.name ?? "Minhas atividades"}</h2>
          <p>
            {classroom.role === 'monitor' ? (hasPublished ? 'Acompanhe as entregas e os relatos compartilhados. Rascunhos permanecem privados até a publicação.' : 'Sua turma está pronta. Convide os alunos e prepare a primeira atividade.') : hasPublished?"Consulte as entregas e os relatos compartilhados. Rascunhos permanecem privados até a publicação.":"Sua turma está pronta. Convide os alunos e prepare a primeira atividade seguindo os passos abaixo."}
          </p>
          <div className="actions">
            {classroom && (hasPublished || draft) && (
              <Link
                className="button"
                href={`/professor/atividades/nova?turma=${encodeURIComponent(classroom.id)}`}
              >
                Criar atividade
              </Link>
            )}
            {(classroom.role === 'teacher' || classroom.role === 'monitor') && <Link className="text-link" href="/professor/barreiras">
              Apoios e barreiras
            </Link>}
          </div>
        </div>
        <PathIllustration variant="teacher" />
      </section>
      {!hasPublished && (classroom.role === 'teacher' || classroom.role === 'monitor') && <TeacherFirstSteps classroomId={classroom.id} draftId={draft?.mission.id}/>}
      {classroom.role === 'monitor' && <p className="notice">Você tem as mesmas ferramentas de gestão e acompanhamento do professor nesta turma.</p>}
      {(classroom.role === 'teacher' || classroom.role === 'monitor') && <details className="paper teacher-disclosure"><summary>Alunos da turma e convites</summary><ClassroomMembers classroom={classroom} /></details>}
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
                href={`/professor/atividades/${mission.id}/editar`}
              >
                Editar e revisar
              </Link>
            )}
            {(room.role === 'teacher' || room.role === 'monitor') && <Link className="text-link" href={`/professor/atividades/${mission.id}/apoios`}>Configurar materiais e apoios</Link>}
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
              {submission.groupId && <p>Equipe: {entry.groups?.find(group => group.id === submission.groupId)?.name ?? "Equipe da atividade"}</p>}
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
                  {feedback.scores && <div>
                    <p><strong>Nota final: {feedback.totalPoints} de {submission.gradingSteps.reduce((sum, step) => sum + (step.maxPoints ?? 0), 0)} pontos</strong></p>
                    <ul>{feedback.scores.map(score => {
                      const step = submission.gradingSteps.find(item => item.id === score.stepId);
                      return <li key={score.stepId}>{step?.title ?? "Etapa"}: {score.points} de {step?.maxPoints ?? 0} pontos{score.comment ? ` · ${score.comment}` : ""}</li>;
                    })}</ul>
                  </div>}
                  <footer>
                    Feedback docente ·{" "}
                    {new Date(feedback.createdAt).toLocaleDateString("pt-BR")}
                  </footer>
                </blockquote>
              ))}
              <Link
                className="text-link"
                href={`/${role}/atividades/${entry.mission.id}`}
              >
                Consultar atividade
              </Link>
              {role === "professor" && (
                <TeacherFeedback missionId={entry.mission.id} submission={submission} steps={submission.gradingSteps} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

type ScoredStep = Submission["gradingSteps"][number];
function TeacherFeedback({ missionId, submission, steps }: { missionId: string; submission: Submission; steps: ScoredStep[] }) {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [requestRevision, setRequestRevision] = useState(false);
  const [scores, setScores] = useState<Record<string, { points: string; comment: string }>>({});
  const [confirmedScores, setConfirmedScores] = useState(false);
  const [deadlineMessage, setDeadlineMessage] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [deadlinePending, setDeadlinePending] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const aiRequest = useRef<{ revision: number; key: string } | null>(null);
  const [deadlineValues, setDeadlineValues] = useState<Record<string, string>>(() => Object.fromEntries(steps.map(step => [step.id, toLocalDateTime(step.dueAt)])));
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"), []);
  const gradedSteps = steps.filter(step => step.maxPoints !== null);
  const totalPoints = gradedSteps.reduce((sum, step) => sum + Number(scores[step.id]?.points || 0), 0);
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
      {steps.some(step => step.completedAt) && <section aria-label="Registro de prazo das etapas">
        <h3>Entrega por etapa</h3>
        <ul>{steps.filter(step => step.completedAt).map(step => <li key={step.id}>{step.title}: entregue {step.late ? "com atraso" : "no prazo"} em {formatTeacherDeadline(step.completedAt!, timeZone)}</li>)}</ul>
      </section>}
      {steps.some(step => step.baseDueAt) && <details className="paper">
        <summary>Prorrogar prazo de etapa para este estudante</summary>
        <p className="small">O prazo individual vale somente para este estudante e não bloqueia o acesso nem apaga rascunhos.</p>
        {steps.filter(step => step.baseDueAt).map(step => <fieldset className="editor-step" key={step.id}>
          <legend>{step.title}</legend>
          <p className="small">Prazo original: {formatTeacherDeadline(step.baseDueAt!, timeZone)}</p>
          <label>Prazo individual (horário local · {timeZone})
            <input type="datetime-local" value={deadlineValues[step.id] ?? ""} disabled={deadlinePending !== null}
              onChange={event => setDeadlineValues(all => ({ ...all, [step.id]: event.target.value }))} />
          </label>
          <div className="actions">
            <button type="button" className="button button-outline" disabled={deadlinePending !== null || !deadlineValues[step.id]}
              onClick={() => void saveDeadline(step.id)}>{deadlinePending === step.id ? "Salvando…" : "Salvar prorrogação"}</button>
            {step.deadlineExtended && <button type="button" className="text-button" disabled={deadlinePending !== null}
              onClick={() => void saveDeadline(step.id, true)}>Restaurar prazo original</button>}
          </div>
        </fieldset>)}
        <OperationStatus message={deadlineMessage} />
      </details>}
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          if (gradedSteps.length && !requestRevision && !confirmedScores) { setMessage("Confirme a pontuação antes de publicar."); return; }
          setPending(true);
          setMessage("");
          try {
            await api("feedback", {
              params: { id: submission.id },
              body: { content, ...(requestRevision ? { requestRevision } : {}),
                ...(!requestRevision && gradedSteps.length ? { scores: gradedSteps.map(step => ({ stepId: step.id, points: Number(scores[step.id]?.points), comment: scores[step.id]?.comment ?? "" })) } : {}) },
            });
            setDone(true);
          } catch (reason) {
            setMessage(errorMessage(reason));
          } finally {
            setPending(false);
          }
        }}
      >
        <details className="teacher-ai">
          <summary>Preparar correção e feedback com IA (opcional)</summary>
          <p>A IA recebe somente o texto da resposta, os objetivos, critérios e etapas desta atividade. Áudio, arquivos, identidade e perfil do aluno não são enviados. Confira se o texto não contém dados pessoais antes de autorizar. A sugestão pode errar; você revisa e decide o que publicar.</p>
          <label className="check"><input type="checkbox" checked={aiConsent} disabled={aiPending || pending}
            onChange={event => setAiConsent(event.target.checked)} />Revisei a resposta e autorizo enviar seu texto ao Gemini para preparar um rascunho privado para mim.</label>
          <button type="button" className="button button-outline" disabled={!aiConsent || aiPending || pending || requestRevision}
            onClick={() => void prepareFeedbackDraft()}>{aiPending ? "Preparando rascunho…" : "Gerar sugestão de correção e feedback"}</button>
          {requestRevision && <p className="small">Desative “Solicitar ajustes” para pedir uma sugestão de pontuação. Você ainda pode preparar o feedback manualmente.</p>}
          <OperationStatus message={aiMessage} />
        </details>
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
        {!requestRevision && gradedSteps.map(step => <fieldset className="editor-step" key={step.id}>
          <legend>{step.title} · até {step.maxPoints} pontos</legend>
          <label>Nota da etapa
            <input type="number" min="0" max={step.maxPoints ?? 0} step="1" required disabled={pending}
              value={scores[step.id]?.points ?? ""}
              onChange={e => { setConfirmedScores(false); setScores(all => ({ ...all, [step.id]: { points: e.target.value, comment: all[step.id]?.comment ?? "" } })); }} />
          </label>
          <label>Comentário da etapa (opcional)
            <textarea maxLength={1000} disabled={pending} value={scores[step.id]?.comment ?? ""}
              onChange={e => setScores(all => ({ ...all, [step.id]: { points: all[step.id]?.points ?? "", comment: e.target.value } }))} />
          </label>
        </fieldset>)}
        {!requestRevision && gradedSteps.length > 0 && <>
          <p><strong>Total: {totalPoints} de {gradedSteps.reduce((sum, step) => sum + (step.maxPoints ?? 0), 0)} pontos</strong></p>
          <label className="check"><input type="checkbox" required checked={confirmedScores} disabled={pending}
            onChange={e => setConfirmedScores(e.target.checked)} /> Conferi as notas e confirmo a avaliação final.</label>
        </>}
        <p className="small">
          Destinatário: {submission.groupId ? "integrantes da equipe" : "estudante autor da entrega"}. O feedback e a avaliação ficam pendentes de validação docente; nada é publicado automaticamente pela IA.
        </p>
        <label className="check"><input type="checkbox" checked={requestRevision} disabled={pending} onChange={e => setRequestRevision(e.target.checked)} /> Solicitar ajustes e permitir nova tentativa</label>
        <button className="button" disabled={pending}>
          {pending ? "Publicando…" : "Publicar feedback"}
        </button>
        <OperationStatus message={message} />
      </form>
    </details>
  );

  async function saveDeadline(stepId: string, restore = false) {
    setDeadlinePending(stepId); setDeadlineMessage("");
    try {
      const step = steps.find(item => item.id === stepId)!;
      const dueAt = restore ? null : new Date(deadlineValues[stepId]).toISOString();
      await api("setStepDeadlineExtension", { params: { id: missionId, stepId }, body: { studentId: submission.userId, dueAt } });
      setDeadlineValues(all => ({ ...all, [stepId]: toLocalDateTime(restore ? step.baseDueAt : dueAt) }));
      setDeadlineMessage(restore ? "Prazo individual removido. O prazo original voltou a valer." : "Prorrogação salva para este estudante.");
    } catch (reason) { setDeadlineMessage(errorMessage(reason)); }
    finally { setDeadlinePending(null); }
  }

  async function prepareFeedbackDraft() {
    if (!aiConsent || aiPending || pending || requestRevision) return;
    if ((content.trim() || Object.keys(scores).length) && !window.confirm("Substituir o feedback ou as notas que você já digitou pelo novo rascunho da IA?")) return;
    setAiPending(true); setAiMessage("");
    const key = aiRequest.current?.revision === submission.revision ? aiRequest.current.key : crypto.randomUUID();
    aiRequest.current = { revision: submission.revision, key };
    try {
      const result = await api("generateFeedbackDraft", { params: { id: submission.id },
        body: { approvedForProvider: true, idempotencyKey: key } });
      if (result.status !== "succeeded" || !result.draft) {
        if (result.status === "failed") aiRequest.current = null;
        throw new Error("A sugestão não foi concluída. Escreva o feedback manualmente ou tente novamente.");
      }
      setContent(result.draft.content);
      setScores(Object.fromEntries(result.draft.scores.map(score => [score.stepId, { points: String(score.points), comment: score.comment }])));
      setConfirmedScores(false);
      setAiMessage("Rascunho preenchido. Revise o texto e cada pontuação antes de publicar.");
    } catch (reason) { setAiMessage(errorMessage(reason)); }
    finally { setAiPending(false); }
  }
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16);
}
function formatTeacherDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(value));
}
