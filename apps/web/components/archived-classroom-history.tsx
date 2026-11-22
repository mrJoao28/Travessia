"use client";

import { useState } from "react";
import { errorMessage, pages, type ApiResponse } from "../lib/product-client";
import type { Classroom } from "./live-workspace";

type Mission = ApiResponse<"missions">["items"][number];
type Submission = ApiResponse<"submissions">["items"][number];
type HistoryEntry = { mission: Mission; submissions: Submission[] };

export function ArchivedClassroomHistory({ classroom }: { classroom: Classroom }) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");

  async function load(retry = false) {
    if ((loaded && !retry) || loading) return;
    setLoading(true);
    setError("");
    try {
      const missions = await pages("missions", classroom.id);
      const history = await Promise.all(missions.map(async (mission) => ({
        mission,
        submissions: await pages("submissions", mission.id),
      })));
      setEntries(history);
      setLoaded(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="archived-classroom-history" onToggle={(event) => {
      if (event.currentTarget.open) void load();
    }}>
      <summary>Consultar atividades e entregas</summary>
      {loading && <p role="status">Consultando o histórico preservado…</p>}
      {error && <p role="alert">{error}</p>}
      {loaded && entries.length === 0 && <p>Nenhuma atividade foi registrada nesta turma.</p>}
      {loaded && entries.map(({ mission, submissions }) => {
        const version = mission.draftVersion ?? mission.publishedVersion;
        return (
          <article className="archived-history-entry" key={mission.id}>
            <h3>{version?.title ?? "Atividade sem título"}</h3>
            <p>{mission.status === "archived" ? "Atividade arquivada" : mission.status === "published" ? "Publicada" : "Rascunho"} · {submissions.length} {submissions.length === 1 ? "entrega" : "entregas"}</p>
            {submissions.map((submission, index) => (
              <details className="archived-history-submission" key={submission.id}>
                <summary>Entrega {index + 1} · {submission.status === "reviewed" ? "revisada" : "enviada"}</summary>
                {submission.content && <p className="submission-content">{submission.content}</p>}
                {submission.feedback.map((feedback) => <blockquote key={feedback.id}><p>{feedback.content}</p></blockquote>)}
              </details>
            ))}
          </article>
        );
      })}
      {error && <button type="button" className="button button-outline" disabled={loading} onClick={() => void load(true)}>Tentar novamente</button>}
    </details>
  );
}
