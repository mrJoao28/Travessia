"use client";

import { useState } from "react";
import { api, errorMessage } from "../lib/product-client";

export function ArchiveClassroomAction({
  classroomId,
  classroomName,
  onArchived,
}: {
  classroomId: string;
  classroomName: string;
  onArchived: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function archive() {
    if (pending || !window.confirm(
      `Excluir a turma “${classroomName}”? Ela sairá da lista ativa e ficará em Turmas arquivadas. Entregas, devolutivas, atividades e arquivos serão preservados para consulta. Não será possível reativá-la pela interface.`,
    )) return;

    setPending(true);
    setError("");
    try {
      await api("archiveClassroom", { params: { id: classroomId } });
      onArchived();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="classroom-action-item">
      <button type="button" className="button button-outline" disabled={pending} onClick={() => void archive()}>
        {pending ? "Excluindo…" : "Excluir turma"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
