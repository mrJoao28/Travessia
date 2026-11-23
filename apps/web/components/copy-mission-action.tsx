"use client";

import { useId, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

type TargetClassroom = { id: string; name: string };

export function CopyMissionAction({
  missionId,
  classrooms,
  onCopied,
}: {
  missionId: string;
  classrooms: TargetClassroom[];
  onCopied: (mission: ApiResponse<"mission">, classroom: TargetClassroom) => void;
}) {
  const selectId = useId();
  const [targetId, setTargetId] = useState(classrooms[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = classrooms.find((classroom) => classroom.id === targetId);

  async function copy() {
    if (!selected || pending) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const mission = await api("copyMission", {
        params: { id: missionId },
        body: { targetClassroomId: selected.id },
      });
      onCopied(mission, selected);
      setMessage(`Cópia criada como rascunho em ${selected.name}.`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  if (!classrooms.length) return null;
  return (
    <details className="mission-copy-action">
      <summary className="button button-outline">Copiar para outra turma</summary>
      <div className="mission-copy-panel">
        <label htmlFor={selectId}>Turma de destino</label>
        <select id={selectId} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
          ))}
        </select>
        <p>Será criada uma cópia em rascunho. As entregas, notas e prazos da turma original não serão copiadas.</p>
        <button type="button" className="button" disabled={!selected || pending} onClick={() => void copy()}>
          {pending ? "Copiando…" : "Criar cópia"}
        </button>
        {message && <p className="mission-copy-status" role="status">{message}</p>}
        {error && <p className="mission-archive-error" role="alert">{error}</p>}
      </div>
    </details>
  );
}
