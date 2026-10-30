"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, pages, errorMessage } from "../lib/product-client";
import type { Classroom, Mission, Submission } from "./live-workspace";
import { OperationStatus } from "./operation-status";
import { BarrierComposer } from "./live-barriers";
import { MissionSupports } from "./mission-supports";

export function LiveMission({
  id,
  role,
  classrooms,
}: {
  id: string;
  role: "aluno" | "professor";
  classrooms: Classroom[];
}) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [index, setIndex] = useState(0);
  const [content, setContent] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api("mission", { params: { id } }), pages("submissions", id)])
      .then(([value, deliveries]) => {
        if (!active) return;
        const current = deliveries.find(
          (s) => s.versionId === value.publishedVersion?.id,
        );
        setMission(value);
        setSubmission(current ?? null);
        setContent(current?.content ?? "");
        setCompleted(current?.completedStepIds ?? []);
        setIndex(
          Math.max(
            0,
            value.publishedVersion?.steps.findIndex(
              (s) => s.id === current?.currentStepId,
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
  }, [id]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
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
  const locked = !!submission && submission.status !== "draft";
  async function save(status: "draft" | "submitted") {
    if (pending || !mission?.publishedVersion || !step) return;
    setPending(true);
    setMessage("");
    try {
      const saved = await api("saveSubmission", {
        params: { id },
        body: {
          versionId: mission.publishedVersion.id,
          content,
          completedStepIds: completed,
          currentStepId: step.id,
          status,
          expectedRevision: submission?.revision ?? 0,
        },
      });
      setSubmission(saved);
      setContent(saved.content);
      setCompleted(saved.completedStepIds);
      setDirty(false);
      setMessage(
        saved.status === "draft"
          ? "Rascunho e etapa atual salvos no servidor."
          : "Atividade enviada. Aguarde o feedback do professor.",
      );
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setPending(false);
    }
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
          <p>Nenhum material adicional nesta missão.</p>
        )}
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
            {role === "aluno" && <MissionSupports key={`${version.id}:${step.id}`} missionId={id} versionId={version.id} stepId={step.id} />}
            {role === "aluno" && !locked && (
              <label className="check">
                <input
                  type="checkbox"
                  disabled={pending}
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
              {locked ? (
                <>
                  <p className="badge">
                    {submission.status === "reviewed"
                      ? "Revisada"
                      : "Aguardando feedback"}
                  </p>
                  <p className="submission-content">{submission.content}</p>
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
                    void save("submitted");
                  }}
                >
                  <label htmlFor="submission-content">
                    Planejamento e atividade
                    <textarea
                      disabled={pending}
                      id="submission-content"
                      maxLength={12000}
                      required
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
                    {classroom.name}. Salve o rascunho para retomar depois. Ele
                    permanece privado para você.
                  </p>
                  <div className="actions">
                    <button
                      className="button button-outline"
                      type="button"
                      disabled={pending}
                      onClick={() => void save("draft")}
                    >
                      {pending ? "Aguarde…" : "Salvar rascunho"}
                    </button>
                    <button className="button" disabled={pending}>
                      {pending ? "Aguarde…" : "Enviar atividade"}
                    </button>
                  </div>
                  <p className="small">
                    {dirty
                      ? "Alterações ainda não salvas no servidor."
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
                  disabled={pending}
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
