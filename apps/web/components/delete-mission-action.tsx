"use client";

import { useState } from "react";
import { api, errorMessage } from "../lib/product-client";

export function DeleteMissionAction({
  missionId,
  missionTitle,
  classroomName,
  onDeleted,
}: {
  missionId: string;
  missionTitle: string;
  classroomName: string;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (pending || !window.confirm(
      `Excluir definitivamente “${missionTitle}” da turma “${classroomName}”? A atividade só poderá ser excluída se não houver entregas, materiais ou histórico. Caso existam registros, use Arquivar atividade para preservá-los.`,
    )) return;

    setPending(true);
    setError("");
    try {
      await api("deleteMission", { params: { id: missionId } });
      onDeleted();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mission-delete-action-item">
      <button type="button" className="button button-outline" disabled={pending} onClick={() => void remove()}>
        {pending ? "Excluindo…" : "Excluir atividade"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
