"use client";

import { useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

export function ArchiveMissionAction({
  missionId,
  missionTitle,
  classroomName,
  onArchived,
}: {
  missionId: string;
  missionTitle: string;
  classroomName: string;
  onArchived: (mission: ApiResponse<"mission">) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function archive() {
    if (pending || !window.confirm(
      `Arquivar “${missionTitle}” da turma “${classroomName}”? Os alunos deixarão de acessar a atividade. O histórico e os arquivos serão preservados para docentes e monitores com vínculo ativo.`,
    )) return;

    setPending(true);
    setError("");
    try {
      const mission = await api("archive", { params: { id: missionId }, body: {} });
      onArchived(mission);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button button-outline mission-archive-action"
        disabled={pending}
        onClick={() => void archive()}
      >
        {pending ? "Arquivando…" : "Arquivar atividade"}
      </button>
      {error && <p className="mission-archive-error" role="alert">{error}</p>}
    </>
  );
}
