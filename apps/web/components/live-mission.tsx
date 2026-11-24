"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, pages, errorMessage, type ApiResponse } from "../lib/product-client";
import type { Classroom, Mission, Submission } from "./live-workspace";
import { OperationStatus } from "./operation-status";
import { BarrierComposer } from "./live-barriers";
import { LearnerAdaptations } from "./learner-adaptations";
import { AudioAttachment } from "./support-audio";
import { SubmissionMedia } from "./submission-media";
import { LearnerMaterials } from "./learner-materials";
import { readStudentDraft, storeStudentDraft } from "../lib/student-draft";
import { MissionSupports } from "./mission-supports";
import { GroupManager } from "./group-manager";

export function LiveMission({
  id,
  role,
  classrooms,
  viewerId,
}: {
  id: string;
  role: "aluno" | "professor";
  classrooms: Classroom[];
  viewerId: string;
}) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [teamGroup, setTeamGroup] = useState<ApiResponse<"groups">["items"][number] | null>(null);
  const [teamMode, setTeamMode] = useState<"group" | "individual" | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [index, setIndex] = useState(0);
  const [formats, setFormats] = useState<("text" | "audio" | "text_file")[] | null>(null);
  const [audio, setAudio] = useState<string | null | undefined>();
  const [textFile, setTextFile] = useState<{ text: string } | null | undefined>();
  const [mediaBusy, setMediaBusy] = useState(false);
  const [content, setContent] = useState("");
  const [stepResponses, setStepResponses] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [draftToReuse, setDraftToReuse] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const recoveryKey = `travessia:student-draft:${viewerId}:${id}`;
  const [saveError, setSaveError] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState<Submission[]>([]);
  const [previousDrafts, setPreviousDrafts] = useState<Submission[]>([]);
  const [previousLocal, setPreviousLocal] = useState<ReturnType<typeof readStudentDraft>>(null);
  const [recovered, setRecovered] = useState(false);
  const [timeZone, setTimeZone] = useState("UTC");
  const title = useRef<HTMLHeadingElement>(null);
  const submitConfirmation = useRef<HTMLDivElement>(null);
  const finalizeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"), []);
  const stepNavigation = useRef(false);
  useLayoutEffect(() => {
    if (!stepNavigation.current) return;
    stepNavigation.current = false;
    title.current?.focus({ preventScroll: true });
  }, [index]);
  useEffect(() => {
    if (confirmSubmit) submitConfirmation.current?.focus();
  }, [confirmSubmit]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api("mission", { params: { id } }), pages("submissions", id), api("groups", { params: { id } })])
      .then(([value, deliveries, groups]) => {
        if (!active) return;
        const attempts = deliveries.filter(s => s.versionId === value.publishedVersion?.id)
          .sort((a, b) => (b.attempt ?? 1) - (a.attempt ?? 1));
        const [current, ...history] = attempts;
        setAttemptHistory(history);
        const version = value.publishedVersion;
        const local = role === "aluno" ? readStudentDraft(recoveryKey) : null;
        const recover = local && version?.id === local.versionId
          && local.revision === (current?.revision ?? 0) && (!current || current.status === "draft" || current.revisionRequested);
        setPreviousDrafts(deliveries.filter(s => s.versionId !== version?.id && s.status === "draft")
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        const unmatched = local && !recover && (!current || current.status === "draft" || current.revisionRequested) ? local : null;
        if (unmatched) storeStudentDraft(recoveryKey + ":previous", unmatched);
        setPreviousLocal(unmatched ?? readStudentDraft(recoveryKey + ":previous"));
        setRecovered(!!recover);
        setDirty(!!recover);
        setMission(value);
        const ownTeam = groups.items.find(group => group.studentIds.includes(viewerId)) ?? null;
        setTeamGroup(groups.participationMode === "group" ? ownTeam : null);
        setTeamMode(groups.participationMode);
        setTeam(ownTeam?.name ?? null);
        setSubmission(current ?? null);
        const savedResponses = current?.stepResponses ?? {};
        const migratedResponses = current && !Object.keys(savedResponses).length && current.content
          ? { [current.currentStepId]: current.content } : savedResponses;
        const initialResponses = recover && local.stepResponses ? local.stepResponses : migratedResponses;
        setStepResponses(initialResponses);
        setContent(recover ? (initialResponses[local.stepId] ?? local.content) : migratedResponses[current?.currentStepId ?? ""] ?? "");
        setCompleted(recover ? local.completed.filter(id => version?.steps.some(step => step.id === id) ?? false) : current?.completedStepIds ?? []);
        setIndex(
          Math.max(
            0,
            value.publishedVersion?.steps.findIndex(
              (s) => s.id === (recover ? local.stepId : current?.currentStepId),
            ) ?? 0,
          ),
        );
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, recoveryKey, role]);
  useEffect(() => {
    if (role !== "aluno" || !submission?.groupId) return;
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const latest = await api("submission", { params: { id: submission.id } });
        if (!active) return;
        const changed = latest.revision > submission.revision || JSON.stringify(latest.validations) !== JSON.stringify(submission.validations);
        if (!changed) return;
        setSubmission(latest);
        if (latest.revision > submission.revision && !dirty) {
          const responses = latest.stepResponses ?? {};
          setStepResponses(responses);
          setContent(responses[latest.currentStepId] ?? "");
          setCompleted(latest.completedStepIds);
          const latestIndex = mission?.publishedVersion?.steps.findIndex(item => item.id === latest.currentStepId) ?? -1;
          if (latestIndex >= 0) setIndex(latestIndex);
        }
      } catch {
        // Keep the local draft available while the shared draft is temporarily unreachable.
      } finally { inFlight = false; }
    };
    const timer = window.setInterval(() => void refresh(), 2000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [role, submission?.id, submission?.groupId, submission?.revision, submission?.validations, dirty, mission]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const version = mission?.publishedVersion;
    const step = version?.steps[index];
    if (role !== "aluno" || !dirty || !version || !step) return;
    setLocalSaved(storeStudentDraft(recoveryKey, {
      versionId: version.id, revision: submission?.revision ?? 0,
      content, stepResponses: { ...stepResponses, [step.id]: content }, completed, stepId: step.id,
    }));
  }, [role, dirty, mission, index, recoveryKey, submission, content, completed, stepResponses]);
  useEffect(() => {
    if (!dirty || pending || mediaBusy || saveError || role !== "aluno" || audio !== undefined || textFile !== undefined) return;
    const timer = window.setTimeout(() => void save("draft", true), 900);
    return () => window.clearTimeout(timer);
  });
  useEffect(() => {
    const retry = () => setSaveError(false);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  if (loading) return <p role="status">Consultando atividade e materiais…</p>;
  if (error)
    return (
      <section className="paper">
        <h2>Não foi possível abrir a atividade</h2>
        <p role="alert">{error}</p>
        <p>
          Seu vínculo ou a versão da atividade pode ter mudado. Volte ao percurso
          para consultar o contexto atual.
        </p>
      </section>
    );
  const version = mission?.publishedVersion;
  if (!mission || !version)
    return (
      <p className="paper">
        Esta atividade não possui uma versão publicada disponível.
      </p>
    );
  const classroom = classrooms.find((room) => room.id === mission.classroomId);
  const step = version.steps[index];
  if (!classroom || !step)
    return <p className="paper">Este contexto não está disponível.</p>;
  const locked = !!submission && submission.status !== "draft" && !submission.revisionRequested;
  const requiresTeam = version.workMode === "group" || (version.workMode === "mixed" && teamMode === "group");
  const allMembersValidated = Boolean(submission && teamGroup && submission.groupId === teamGroup.id && !dirty && version.steps.every(item => {
    const response = submission.stepResponses?.[item.id] ?? "";
    return response.trim() && teamGroup.studentIds.every(memberId => submission.validations?.some(validation =>
      validation.stepId === item.id && validation.userId === memberId && validation.current));
  }));
  const canSubmit = !requiresTeam || Boolean(teamGroup && teamGroup.leaderId === viewerId && allMembersValidated);
  const currentValidatedCount = new Set((submission?.validations ?? []).filter(validation => validation.stepId === step.id && validation.current && teamGroup?.studentIds.includes(validation.userId)).map(validation => validation.userId)).size;
  const isFinalStep = index === version.steps.length - 1;
  async function save(status: "draft" | "submitted", automatic = false) {
    if (pending || mediaBusy || !mission?.publishedVersion || !step) return false;
    setPending(true);
    if (!automatic) setMessage("");
    try {
      const saved = await api("saveSubmission", {
        params: { id },
        body: {
          versionId: mission.publishedVersion.id,
          content,
          stepId: step.id,
          ...(audio !== undefined ? { audio } : {}),
          ...(textFile !== undefined ? { textFile } : {}),
          completedStepIds: completed,
          currentStepId: step.id,
          status,
          expectedRevision: submission?.revision ?? 0,
        },
      });
      if (submission && submission.id !== saved.id) setAttemptHistory(history => [submission, ...history]);
      setSubmission(saved); setAudio(undefined); setTextFile(undefined);
      setContent(saved.stepResponses?.[step.id] ?? saved.content);
      setStepResponses(saved.stepResponses ?? { [step.id]: saved.content });
      setCompleted(saved.completedStepIds);
      setDirty(false);
      setSaveError(false);
      setRecovered(false);
      if (readStudentDraft(recoveryKey)?.versionId === mission.publishedVersion.id) storeStudentDraft(recoveryKey, null);
      if (status === "submitted") setConfirmSubmit(false);
      if (!automatic) setMessage(
        saved.status === "draft"
          ? "Rascunho e etapa atual salvos no servidor."
          : "Atividade enviada. Aguarde o feedback do professor.",
      );
      return true;
    } catch (reason) {
      setSaveError(true);
      setMessage(errorMessage(reason));
      return false;
    } finally {
      setPending(false);
    }
  }
  async function validateCurrentStep() {
    if (!submission || !teamGroup || dirty || pending || !content.trim()) {
      setMessage("Salve a resposta desta etapa antes de validá-la.");
      return;
    }
    setPending(true); setMessage("");
    try {
      const validated = await api("validateSubmissionStep", { params: { id: submission.id, stepId: step.id },
        body: { expectedStepRevision: submission.stepRevisions?.[step.id] ?? 0 } });
      setSubmission(validated);
      setStepResponses(validated.stepResponses ?? {});
      setMessage("Você validou a resposta atual desta etapa.");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  function reuseDraft(text: string) {
    if (pending || locked) return;
    if (content.trim()) {
      setDraftToReuse(text);
      return;
    }
    applyDraft(text);
  }
  function applyDraft(text: string) {
    setContent(text);
    setDirty(true);
    setSaveError(false);
    setMessage("Texto copiado. Confira as instruções e marque as etapas que concluiu nesta versão.");
  }
  async function saveAndAdvance() {
    if (isFinalStep || pending || mediaBusy) return;
    const saved = await save("draft");
    if (!saved) return;
    const next = index + 1;
    navigate(next);
    setMessage(`Etapa ${index + 1} salva como rascunho. Agora você está na etapa ${next + 1} de ${version.steps.length}.`);
  }
  function dismissSubmitConfirmation() {
    setConfirmSubmit(false);
    requestAnimationFrame(() => finalizeButton.current?.focus());
  }
  function navigate(next: number) {
    if (next === index) return;
    const nextStep = mission?.publishedVersion?.steps[next];
    if (!nextStep) return;
    const updatedResponses = { ...stepResponses, [step.id]: content };
    setStepResponses(updatedResponses);
    setContent(updatedResponses[nextStep.id] ?? "");
    stepNavigation.current = true;
    setIndex(next);
    if (!locked && role === "aluno") setDirty(true);
  }
  return (
    <>
      {role === "aluno" && <p className="teacher-mission-context"><Link className="text-link" href={`/aluno/entregas?turma=${encodeURIComponent(classroom.id)}`}>← Voltar às entregas da turma</Link></p>}
      <section className="paper">
        <p className="eyebrow accent">{classroom.name}</p>
        <h2>{version.title}</h2>
        <p>{version.description}</p>
        {version.workMode !== "individual" && <p>{role === "aluno" ? team ? `Atividade em grupo · ${team}. Sua equipe compartilha esta entrega.` : version.workMode === "mixed" ? "Atividade individual ou em grupo · o professor definiu sua forma de entrega." : "Atividade em grupo · você ainda não foi incluído em uma equipe. Solicite ao professor." : version.workMode === "mixed" ? "Atividade individual ou em grupo · confira a forma de entrega de cada aluno." : "Atividade em grupo · uma entrega por equipe."}</p>}
        {version.dueAt && (
          <p>
            Entrega prevista:{" "}
            {new Date(version.dueAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </section>
      {role === "professor" && version.workMode !== "individual" && <GroupManager missionId={id} />}
      <div className={role === "aluno" ? "student-live-mission" : "two-column student-live-mission"}>
        <div className="form-stack">
          <section className="paper preview-student-stage form-stack" id="etapas">
          <div className="student-step-pagination">
              <button
                className="button button-outline"
                disabled={pending || index === 0}
                aria-label="Etapa anterior"
                onClick={() => navigate(index - 1)}
              >
                Anterior
              </button>
              <span className="eyebrow">Etapa {index + 1} de {version.steps.length}</span>
          </div>
            <h2 ref={title} tabIndex={-1}>
              {step.title}
            </h2>
            {step.dueAt && <p className="small">{step.deadlineExtended ? "Prazo individual prorrogado até" : "Prazo desta etapa"}: {formatDeadline(step.dueAt, timeZone)}</p>}
            {submission?.gradingSteps.find(item => item.id === step.id)?.completedAt && <p className="small" role="status">
              Etapa registrada {submission.gradingSteps.find(item => item.id === step.id)?.late ? "com atraso" : "no prazo"} em {formatDeadline(submission.gradingSteps.find(item => item.id === step.id)!.completedAt!, timeZone)}.
            </p>}
            {step.maxPoints !== null && <p className="small">Pontuação máxima: {step.maxPoints}</p>}
            <p className="submission-content">{step.instructions}</p>
            {step.example && <details className="example" key={step.id}>
              <summary>Ver um exemplo</summary>
              <p className="submission-content">{step.example}</p>
            </details>}
            {role === "aluno" && <a className="text-link" href="#learner-materials-title"
              onClick={() => document.getElementById("learner-materials-title")?.focus({ preventScroll: true })}>Abrir materiais da atividade</a>}
            {role === "aluno" && <LearnerAdaptations key={version.id} missionId={id} versionId={version.id} stepId={step.id} onFormats={setFormats} />}
            {role === "aluno" && <MissionSupports key={`${version.id}:${step.id}`} missionId={id} versionId={version.id} stepId={step.id} />}
            {role === "aluno" && !locked && (
              <label className="check">
                <input
                  type="checkbox"
                  disabled={pending || mediaBusy}
                  checked={completed.includes(step.id)}
                  onChange={(e) => {
                    setCompleted((all) =>
                      e.target.checked
                        ? [...all, step.id]
                        : all.filter((value) => value !== step.id),
                    );
                    setDirty(true);
                    setMessage("");
                  }}
                />
                Concluí esta etapa. Salvará com o rascunho ou envio.
              </label>
            )}
          </section>
          <details className="paper preview-student-context">
            <summary>Objetivos e critérios da atividade</summary>
            <h3>Objetivos de aprendizagem</h3>
            <ul>
              {version.objectives.map((objective, i) => (
                <li key={i}>{objective}</li>
              ))}
            </ul>
            <h3>Critérios de avaliação</h3>
            <ul>
              {version.criteria.map((criterion, i) => (
                <li key={i}>{criterion}</li>
              ))}
            </ul>
          </details>
          <section className="paper" aria-label="Materiais da atividade">
            <h3>Materiais da atividade</h3>
            {role === "professor" && !version.materials.length && <p className="small">Nenhum material na atividade.</p>}
            {role === "aluno" && !version.materials.length && <p className="small">Não há materiais textuais anexados à atividade. O PDF da turma e os apoios preparados pelo professor aparecem nesta área.</p>}
            {role === "aluno" && <LearnerMaterials missionId={id} versionId={version.id} />}
            {version.materials.map((material) => (
              <article className="material-library-item" key={material.id}>
                <h4>{material.title}</h4>
                <p className="submission-content">{material.text}</p>
                {material.hasFile && (
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        const download = await api("download", {
                          params: { id: material.id },
                        });
                        const url = new URL(download.url);
                        if (url.protocol !== "https:")
                          throw new Error(
                            "O arquivo não está disponível por uma conexão segura.",
                          );
                        window.open(url.href, "_blank", "noopener,noreferrer");
                      } catch (reason) {
                        setMessage(errorMessage(reason));
                      }
                    }}
                  >
                    Abrir arquivo autorizado
                  </button>
                )}
              </article>
            ))}
          </section>
          {role === "aluno" && (
            <section className="paper">
              <h2>Sua atividade</h2>
              {submission?.revisionRequested && <p role="status">O professor solicitou ajustes. Leia o feedback e prepare uma nova tentativa.</p>}
              {[...(submission?.revisionRequested ? [submission] : []), ...attemptHistory].map(attempt => <details key={attempt.id}>
                <summary>Tentativa {attempt.attempt ?? 1} · entrega e feedback</summary>
                {Object.keys(attempt.stepResponses ?? {}).length ? <section aria-label="Respostas por etapa">{attempt.gradingSteps.map(item => attempt.stepResponses?.[item.id] ? <article key={item.id}><h3>{item.title}</h3><p className="submission-content">{attempt.stepResponses[item.id]}</p></article> : null)}</section> : <p className="submission-content">{attempt.content}</p>}
                <SubmissionMedia id={attempt.id} hasAudio={attempt.hasAudio} hasTextFile={attempt.hasTextFile} />
                {attempt.feedback.map(feedback => <blockquote key={feedback.id}><p>{feedback.content}</p></blockquote>)}
              </details>)}
              {(previousLocal || previousDrafts.length > 0) && <section className="notice">
                <h3>Rascunhos para recuperar</h3>
                {previousDrafts.length > 0 && <p>Há rascunhos de versões anteriores. Confira os objetivos, critérios e etapas da versão atual antes de reaproveitar o texto. O progresso anterior fica no rascunho original.</p>}
                {previousLocal && <details>
                  <summary>{previousLocal.versionId === version.id ? "Edição deste navegador em conflito com o servidor" : "Rascunho de uma versão anterior neste navegador"}</summary>
                  <p className="submission-content">{previousLocal.content}</p>
                  {!locked && <button type="button" className="button button-outline" disabled={pending} onClick={() => reuseDraft(previousLocal.content)}>Reaproveitar texto deste navegador</button>}
                </details>}
                {previousDrafts.map(draft => <details key={draft.id}>
                  <summary>Rascunho salvo em {new Date(draft.updatedAt).toLocaleString("pt-BR")}</summary>
                  <p className="submission-content">{draft.content}</p>
                  <SubmissionMedia id={draft.id} hasAudio={draft.hasAudio} hasTextFile={draft.hasTextFile} />
                  {!locked && <button type="button" className="button button-outline" disabled={pending} onClick={() => reuseDraft(draft.content)}>Reaproveitar texto nesta versão</button>}
                </details>)}
                {draftToReuse !== null && <div className="notice draft-reuse-confirmation" role="group" aria-labelledby="draft-reuse-title">
                  <h4 id="draft-reuse-title">Substituir o texto desta etapa?</h4>
                  <p>O texto atual será trocado pelo rascunho escolhido. Seus outros rascunhos continuam preservados.</p>
                  <div className="actions">
                    <button type="button" className="button button-outline" disabled={pending} onClick={() => setDraftToReuse(null)}>Manter texto atual</button>
                    <button type="button" className="button" disabled={pending} onClick={() => { applyDraft(draftToReuse); setDraftToReuse(null); }}>Substituir texto</button>
                  </div>
                </div>}
              </section>}
              {locked ? (
                <>
                  <p className="badge">
                    {submission.status === "reviewed"
                      ? "Revisada"
                      : "Aguardando feedback"}
                  </p>
                  {Object.keys(submission.stepResponses ?? {}).length ? <section aria-label="Respostas por etapa">{submission.gradingSteps.map(item => submission.stepResponses?.[item.id] ? <article key={item.id}><h3>{item.title}</h3><p className="submission-content">{submission.stepResponses[item.id]}</p></article> : null)}</section> : <p className="submission-content">{submission.content}</p>}
                  <SubmissionMedia id={submission.id} hasAudio={submission.hasAudio} hasTextFile={submission.hasTextFile} />
                  {submission.feedback.map((feedback) => (
                    <blockquote key={feedback.id}>
                      <h3>Feedback docente</h3>
                      <p>{feedback.content}</p>
                    </blockquote>
                  ))}
                  <p className="small">
                    A entrega enviada é preservada para revisão.
                  </p>
                </>
              ) : (
                <form
                  className="form-stack"
                  aria-busy={pending}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!isFinalStep) {
                      void saveAndAdvance();
                      return;
                    }
                    if (!canSubmit) {
                      setMessage(teamGroup?.leaderId !== viewerId
                        ? "Somente o líder da equipe pode enviar a atividade."
                        : "A equipe precisa validar todas as etapas antes do envio.");
                      return;
                    }
                    setConfirmSubmit(true);
                  }}
                >
                  {recovered && <p role="status">Texto e progresso recuperados deste navegador.</p>}
                  <label htmlFor="submission-content">
                    Planejamento e atividade
                    <textarea
                      disabled={pending || mediaBusy}
                      id="submission-content"
                      maxLength={12000}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        setStepResponses(responses => ({ ...responses, [step.id]: e.target.value }));
                        setDirty(true);
                        setMessage("");
                      }}
                      aria-describedby="submission-help"
                    />
                  </label>
                  <p id="submission-help" className="small">
                    O envio torna esta entrega disponível aos docentes de{" "}
                    {classroom.name}. O texto e o progresso são salvos automaticamente. O rascunho
                    {version.workMode === "group" ? "fica visível aos integrantes da sua equipe." : "permanece privado para você."}
                  </p>
                  {requiresTeam && <section className="notice form-stack" aria-label="Validação da equipe">
                    {teamGroup ? <>
                      <p>Rascunho compartilhado com {teamGroup.studentIds.length} integrantes. Todos podem editar; a atualização aparece para a equipe em poucos segundos.</p>
                      <p>Etapa {index + 1}: {currentValidatedCount} de {teamGroup.studentIds.length} integrantes validaram a resposta atual.</p>
                      <button type="button" className="button button-outline" disabled={pending || dirty || !content.trim() || submission?.groupId !== teamGroup.id || currentValidatedCount === teamGroup.studentIds.length} onClick={() => void validateCurrentStep()}>
                        {submission?.validations?.some(validation => validation.stepId === step.id && validation.userId === viewerId && validation.current) ? "Etapa validada por você" : "Validar conteúdo desta etapa"}
                      </button>
                      {teamGroup.leaderId !== viewerId && <p className="small">Somente o líder da equipe pode enviar a atividade depois que todos validarem todas as etapas.</p>}
                      {teamGroup.leaderId === viewerId && !allMembersValidated && <p className="small">O envio será liberado quando cada integrante validar a resposta atual de todas as etapas.</p>}
                    </> : <p>Esta atividade exige uma equipe. Peça ao professor para confirmar seu vínculo antes de enviar.</p>}
                  </section>}
                  {formats === null && <p role="status">Os formatos adicionais aparecem quando a consulta de adaptações da atividade for concluída.</p>}
                  {formats?.length === 1 && <p className="small">Formato disponível nesta atividade: texto no editor.</p>}
                  <p className="small">Você pode combinar os formatos liberados pelo professor. Para enviar, inclua texto, áudio ou um arquivo de texto com conteúdo. A resposta não será enviada ao Gemini.</p>
                  {formats?.includes("audio") && <AudioAttachment label="Áudio da atividade (opcional)" disabled={pending || mediaBusy} id="submission" missionId={id} help="Resposta em áudio de até 30 segundos; arquivo de até 10 MB na seleção. O navegador converte localmente para WAV. Um resumo no editor é opcional." value={audio ? { base64: audio } : null} onBusy={setMediaBusy} onChange={value => { setAudio(value && "base64" in value ? value.base64 : null); setDirty(true); }} />}
                  {submission?.hasAudio && !submission.revisionRequested && audio === undefined && <><SubmissionMedia id={submission.id} hasAudio /><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setAudio(null); setDirty(true); }}>Remover áudio salvo da atividade</button></>}
                  {formats?.includes("text_file") && <div className="form-stack"><label htmlFor="submission-file">Arquivo de texto da atividade (.txt, UTF-8, até 32 KiB)</label><input id="submission-file" type="file" accept=".txt,text/plain" disabled={pending || mediaBusy} onChange={async e => {
                    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setMediaBusy(true); setMessage("");
                    try { if (!/\.txt$/i.test(file.name) || file.size > 32768) throw new Error("Selecione um arquivo .txt de até 32 KiB."); const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); if (text.length > 20000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) throw new Error("O arquivo precisa conter somente texto UTF-8, até 20 mil caracteres."); setTextFile({ text }); setDirty(true); } catch (reason) { setMessage(errorMessage(reason)); } finally { setMediaBusy(false); }
                  }} />{textFile && <><p>Arquivo de texto preparado para salvar.</p><details><summary>Conferir texto do arquivo</summary><p className="submission-content">{textFile.text}</p></details><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setTextFile(null); setDirty(true); }}>Remover arquivo selecionado</button></>}</div>}
                  {submission?.hasTextFile && !submission.revisionRequested && textFile === undefined && <><SubmissionMedia id={submission.id} hasTextFile /><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setTextFile(null); setDirty(true); }}>Remover arquivo salvo da atividade</button></>}
                  <p className="submission-stage-guidance">
                    {isFinalStep
                      ? "Você chegou à última etapa. Revise suas respostas antes de enviar a atividade para o professor."
                      : "Ao avançar, esta etapa será salva como rascunho. Você só enviará a atividade quando chegar à última etapa."}
                  </p>
                  <div className="actions submission-actions">
                    <button
                      className="button button-outline"
                      type="button"
                      disabled={pending || mediaBusy}
                      onClick={() => void save("draft")}
                    >
                      {pending ? "Aguarde…" : "Salvar rascunho"}
                    </button>
                    {isFinalStep ? (
                      <button ref={finalizeButton} className="button submission-finalize-button" type="submit" disabled={pending || mediaBusy || !canSubmit}>
                        {pending ? "Enviando…" : "Finalizar e enviar atividade"}
                      </button>
                    ) : (
                      <button className="button submission-advance-button" type="button" disabled={pending || mediaBusy} onClick={() => void saveAndAdvance()}>
                        {pending ? "Salvando…" : `Salvar e avançar para a etapa ${index + 2}`}
                      </button>
                    )}
                  </div>
                  {confirmSubmit && <div className="notice submission-confirmation" role="group" aria-labelledby="submission-confirmation-title" tabIndex={-1} ref={submitConfirmation} onKeyDown={event => {
                    if (event.key === "Escape") dismissSubmitConfirmation();
                  }}>
                    <h3 id="submission-confirmation-title">Enviar atividade para revisão?</h3>
                    <p>Suas respostas e anexos ficarão disponíveis aos docentes de {classroom.name}. Confira tudo antes de confirmar.</p>
                    <div className="actions">
                      <button type="button" className="button button-outline" disabled={pending} onClick={dismissSubmitConfirmation}>Continuar revisando</button>
                      <button type="button" className="button" disabled={pending || mediaBusy || !canSubmit} onClick={() => void save("submitted")}>
                        {pending ? "Enviando…" : "Confirmar envio"}
                      </button>
                    </div>
                  </div>}
                  <p className="small">
                    {dirty
                      ? pending ? "Salvando…" : localSaved
                        ? "Texto e progresso guardados neste navegador. Anexos precisam ser salvos manualmente."
                        : "Alterações ainda não salvas no servidor."
                      : submission
                        ? "Conteúdo carregado do servidor."
                        : "Escreva e salve para iniciar seu rascunho."}
                  </p>
                </form>
              )}
              <OperationStatus message={message} error={saveError} />
              {saveError && version.workMode === "group" && <button type="button" className="text-button" onClick={() => window.location.reload()}>Recarregar a entrega da equipe</button>}
            </section>
          )}
          <details id="barreira" className="paper action-disclosure barrier-disclosure">
            <summary><span>Encontrou uma dificuldade?</span><span className="disclosure-action-hint"><span className="disclosure-closed-hint">Registrar uma barreira</span><span className="disclosure-open-hint">Recolher</span></span></summary>
            <BarrierComposer
              stepId={step.id}
              stepTitle={step.title}
              classroomName={classroom.name}
            />
            {role === "aluno" && (
              <Link
                className="text-link"
                href={`/aluno/barreiras?turma=${encodeURIComponent(classroom.id)}`}
              >
                Consultar meus relatos e respostas
              </Link>
            )}
          </details>
        </div>
        {role === "professor" && <aside className="paper">
          <h2>Todas as etapas</h2>
          <ol>
            {version.steps.map((item, i) => (
              <li key={item.id}>
                <button
                  className="text-button"
                  disabled={pending || mediaBusy}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => navigate(i)}
                >
                  {item.title}
                  {submission?.completedStepIds.includes(item.id)
                    ? " · concluída e salva"
                    : ""}
                </button>
              </li>
            ))}
          </ol>
          <p className="small">
            Consultar uma etapa não marca sua conclusão. Escolha os apoios sem
            alterar os objetivos avaliados.
          </p>
        </aside>}
      </div>
    </>
  );
}

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short", timeZone }).format(new Date(value));
}
