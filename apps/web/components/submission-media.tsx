"use client";
import { useState } from "react";
import { api, errorMessage } from "../lib/product-client";
import { SupportAudio } from "./support-audio";
export function SubmissionMedia({ id, hasAudio, hasTextFile }: { id: string; hasAudio?: boolean; hasTextFile?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="form-stack">{hasAudio && <SupportAudio key={id} missionId="" submissionId={id} />}{hasTextFile && <button type="button" className="text-button" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try { const file = await api("submissionTextFile", { params: { id } }); const url = URL.createObjectURL(new Blob([file.text], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "atividade.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  }}>Baixar arquivo de texto da atividade</button>}{error && <p role="alert">{error}</p>}</div>;
}
