"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage } from "../lib/product-client";
import type { Classroom, Mission, Submission } from "./live-workspace";
import { OperationStatus } from "./operation-status";
import { BarrierComposer } from "./live-barriers";
import { LearnerAdaptations } from "./learner-adaptations";
import { AudioAttachment } from "./support-audio";
import { SubmissionMedia } from "./submission-media";
import { LearnerMaterials } from "./learner-materials";
import { readStudentDraft, storeStudentDraft } from "../lib/student-draft";
import { MissionSupports } from "./mission-supports";

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
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [index, setIndex] = useState(0);
  const [formats, setFormats] = useState<("text" | "audio" | "text_file")[] | null>(null);
  const [audio, setAudio] = useState<string | null | undefined>();
  const [textFile, setTextFile] = useState<{ text: string } | null | undefined>();
  const [mediaBusy, setMediaBusy] = useState(false);
  const [content, setContent] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const recoveryKey = `travessia:student-draft:${viewerId}:${id}`;
  const [saveError, setSaveError] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState<Submission[]>([]);
  const [previousDrafts, setPreviousDrafts] = useState<Submission[]>([]);
  const [previousLocal, setPreviousLocal] = useState<ReturnType<typeof readStudentDraft>>(null);
  const [recovered, setRecovered] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api("mission", { params: { id } }), pages("submissions", id)])
      .then(([value, deliveries]) => {
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
        setSubmission(current ?? null);
        setContent(recover ? local.content : current?.content ?? "");
        setCompleted(recover ? local.completed.filter(id => version.steps.some(step => step.id === id)) : current?.completedStepIds ?? []);
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
      content, completed, stepId: step.id,
    }));
  }, [role, dirty, mission, index, recoveryKey, submission, content, completed]);
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
  if (loading) return <p role="status">Consultando missão e atividade…</p>;
  if (error)
    return (
      <section className="paper">
        <h2>Não foi possível abrir a missão</h2>
        <p role="alert">{error}</p>
        <p>
          Seu vínculo ou a versão da missão pode ter mudado. Volte ao percurso
          para consultar o contexto atual.
        </p>
      </section>
    );
  const version = mission?.publishedVersion;
  if (!mission || !version)
    return (
      <p className="paper">
        Esta missão não possui uma versão publicada disponível.
      </p>
    );
  const classroom = classrooms.find((room) => room.id === mission.classroomId);
  const step = version.steps[index];
  if (!classroom || !step)
    return <p className="paper">Este contexto não está disponível.</p>;
  const locked = !!submission && submission.status !== "draft" && !submission.revisionRequested;
  async function save(status: "draft" | "submitted", automatic = false) {
    if (pending || mediaBusy || !mission?.publishedVersion || !step) return;
    setPending(true);
    if (!automatic) setMessage("");
    try {
      const saved = await api("saveSubmission", {
        params: { id },
        body: {
          versionId: mission.publishedVersion.id,
          content,
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
      setContent(saved.content);
      setCompleted(saved.completedStepIds);
      setDirty(false);
      setSaveError(false);
      setRecovered(false);
      if (readStudentDraft(recoveryKey)?.versionId === mission.publishedVersion.id) storeStudentDraft(recoveryKey, null);
      if (!automatic) setMessage(
        saved.status === "draft"
          ? "Rascunho e etapa atual salvos no servidor."
          : "Atividade enviada. Aguarde o feedback do professor.",
      );
    } catch (reason) {
      setSaveError(true);
      setMessage(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }
  function reuseDraft(text: string) {
    if (pending || locked || (content && !window.confirm("Substituir o texto da atividade atual pelo rascunho escolhido?"))) return;
    setContent(text);
    setDirty(true);
    setSaveError(false);
    setMessage("Texto copiado. Confira as instruções e marque as etapas que concluiu nesta versão.");
  }
  function navigate(next: number) {
    setIndex(next);
    if (!locked && role === "aluno") setDirty(true);
    requestAnimationFrame(() => title.current?.focus());
  }
  return (
    <>
      <section className="paper">
        <p className="eyebrow accent">{classroom.name}</p>
        <h2>{version.title}</h2>
        <p>{version.description}</p>
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
        {version.dueAt && (
          <p>
            Entrega prevista:{" "}
            {new Date(version.dueAt).toLocaleDateString("pt-BR")}
          </p>
        )}
        <h3>Materiais</h3>
        {!version.materials.length && (
          <p className="small">Os PDFs e áudios liberados para você aparecem neste espaço.</p>
        )}
        {role === "aluno" && <LearnerMaterials missionId={id} versionId={version.id} />}
        {version.materials.map((material) => (
          <details className="example" key={material.id}>
            <summary>{material.title}</summary>
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
          </details>
        ))}
      </section>
      <div className="two-column" style={{ marginTop: "1rem" }}>
        <div>
          <section className="paper">
            <p className="eyebrow">
              Etapa {index + 1} de {version.steps.length}
            </p>
            <h2 ref={title} tabIndex={-1}>
              {step.title}
            </h2>
            <p className="submission-content">{step.instructions}</p>
            <details className="example">
              <summary>Ver um exemplo</summary>
              <p className="submission-content">{step.example}</p>
            </details>
            <div className="actions">
              <button
                className="button button-outline"
                disabled={pending || index === 0}
                onClick={() => navigate(index - 1)}
              >
                Etapa anterior
              </button>
              <button
                className="button button-outline"
                disabled={pending || index === version.steps.length - 1}
                onClick={() => navigate(index + 1)}
              >
                Próxima etapa
              </button>
            </div>
            {role === "aluno" && <a className="text-link" href="#learner-materials-title"
              onClick={() => document.getElementById("learner-materials-title")?.focus()}>Abrir materiais preparados</a>}
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
          {role === "aluno" && (
            <section className="paper" style={{ marginTop: "1rem" }}>
              <h2>Sua atividade</h2>
              {submission?.revisionRequested && <p role="status">O professor solicitou ajustes. Leia o feedback e prepare uma nova tentativa.</p>}
              {[...(submission?.revisionRequested ? [submission] : []), ...attemptHistory].map(attempt => <details key={attempt.id}>
                <summary>Tentativa {attempt.attempt ?? 1} · entrega e feedback</summary>
                <p className="submission-content">{attempt.content}</p>
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
              </section>}
              {locked ? (
                <>
                  <p className="badge">
                    {submission.status === "reviewed"
                      ? "Revisada"
                      : "Aguardando feedback"}
                  </p>
                  <p className="submission-content">{submission.content}</p>
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
                    if (window.confirm("Enviar esta tentativa para revisão? Confira o texto e os anexos selecionados antes de confirmar."))
                      void save("submitted");
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
                        setDirty(true);
                        setMessage("");
                      }}
                      aria-describedby="submission-help"
                    />
                  </label>
                  <p id="submission-help" className="small">
                    O envio torna esta entrega disponível aos docentes de{" "}
                    {classroom.name}. O texto e o progresso são salvos automaticamente. O rascunho
                    permanece privado para você.
                  </p>
                  {formats === null && <p role="status">Os formatos adicionais aparecem quando a consulta de adaptações da missão for concluída.</p>}
                  {formats?.length === 1 && <p className="small">Formato disponível nesta missão: texto no editor.</p>}
                  <p className="small">Você pode combinar os formatos liberados pelo professor. Para enviar, inclua texto, áudio ou um arquivo de texto com conteúdo. A resposta não será enviada ao Gemini.</p>
                  {formats?.includes("audio") && <AudioAttachment label="Áudio da atividade (opcional)" disabled={pending || mediaBusy} id="submission" missionId={id} help="Resposta em áudio de até 30 segundos; arquivo de até 10 MB na seleção. O navegador converte localmente para WAV. Um resumo no editor é opcional." value={audio ? { base64: audio } : null} onBusy={setMediaBusy} onChange={value => { setAudio(value && "base64" in value ? value.base64 : null); setDirty(true); }} />}
                  {submission?.hasAudio && !submission.revisionRequested && audio === undefined && <><SubmissionMedia id={submission.id} hasAudio /><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setAudio(null); setDirty(true); }}>Remover áudio salvo da atividade</button></>}
                  {formats?.includes("text_file") && <div className="form-stack"><label htmlFor="submission-file">Arquivo de texto da atividade (.txt, UTF-8, até 32 KiB)</label><input id="submission-file" type="file" accept=".txt,text/plain" disabled={pending || mediaBusy} onChange={async e => {
                    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setMediaBusy(true); setMessage("");
                    try { if (!/\.txt$/i.test(file.name) || file.size > 32768) throw new Error("Selecione um arquivo .txt de até 32 KiB."); const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); if (text.length > 20000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) throw new Error("O arquivo precisa conter somente texto UTF-8, até 20 mil caracteres."); setTextFile({ text }); setDirty(true); } catch (reason) { setMessage(errorMessage(reason)); } finally { setMediaBusy(false); }
                  }} />{textFile && <><p>Arquivo de texto preparado para salvar.</p><details><summary>Conferir texto do arquivo</summary><p className="submission-content">{textFile.text}</p></details><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setTextFile(null); setDirty(true); }}>Remover arquivo selecionado</button></>}</div>}
                  {submission?.hasTextFile && !submission.revisionRequested && textFile === undefined && <><SubmissionMedia id={submission.id} hasTextFile /><button type="button" className="text-button" disabled={pending || mediaBusy} onClick={() => { setTextFile(null); setDirty(true); }}>Remover arquivo salvo da atividade</button></>}
                  <div className="actions">
                    <button
                      className="button button-outline"
                      type="button"
                      disabled={pending || mediaBusy}
                      onClick={() => void save("draft")}
                    >
                      {pending ? "Aguarde…" : "Salvar rascunho"}
                    </button>
                    <button className="button" disabled={pending || mediaBusy}>
                      {pending ? "Aguarde…" : "Enviar atividade"}
                    </button>
                  </div>
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
              <OperationStatus message={message} />
            </section>
          )}
          <section
            id="barreira"
            className="paper"
            style={{ marginTop: "1rem" }}
          >
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
          </section>
        </div>
        <aside className="paper" id="etapas">
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
        </aside>
      </div>
    </>
  );
}
