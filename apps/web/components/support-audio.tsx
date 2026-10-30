"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/product-client";

export type AudioValue = { base64: string } | { itemId: string } | null;
function audioBlob(base64: string) {
  return new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: "audio/wav" });
}
export function SupportAudio({ missionId, itemId, base64, submissionId }: { missionId: string; itemId?: string; base64?: string; submissionId?: string }) {
  const [source, setSource] = useState(base64 ?? "");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setSource(base64 ?? ""); setError(""); }, [base64, itemId, missionId, submissionId]);
  useEffect(() => {
    setUrl("");
    if (!source) return;
    const localUrl = URL.createObjectURL(audioBlob(source)); setUrl(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [source]);
  return <div className="form-stack">
    {url ? <audio controls preload="none" src={url} aria-label={submissionId ? "Áudio da atividade" : "Áudio do apoio"}>Consulte a transcrição em texto deste apoio.</audio> :
      <button type="button" className="text-button" disabled={pending} onClick={async () => {
        if (!itemId && !submissionId) return; setPending(true); setError("");
        try { setSource(submissionId ? (await api("submissionAudio", { params: { id: submissionId } })).base64 : (await api("supportAudio", { params: { id: missionId, itemId: itemId! } })).base64); }
        catch (reason) { setError(errorMessage(reason)); } finally { setPending(false); }
      }}>{pending ? "Carregando áudio…" : submissionId ? "Carregar áudio da atividade" : "Carregar áudio do apoio"}</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
export function AudioAttachment({ id, value, missionId, onChange, onBusy, help, disabled, label }: { label?: string; disabled?: boolean; help?: string; id: string; value: AudioValue; missionId: string; onChange: (value: AudioValue) => void; onBusy: (busy: boolean) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="form-stack">
    <label htmlFor={`audio-${id}`}>{label ?? "Áudio opcional deste apoio"}</label>
    <p id={`audio-help-${id}`} className="small">{help ?? "Até 30 segundos e 10 MB na seleção. O navegador converte para WAV mono de 16 kHz. Escreva acima a transcrição completa, incluindo as informações visuais descritas."}</p>
    <input id={`audio-${id}`} aria-describedby={`audio-help-${id}`} type="file" accept="audio/*" disabled={busy || disabled} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      setBusy(true); onBusy(true); setError("");
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Selecione um áudio de até 10 MB.");
        const context = new AudioContext();
        let decoded: AudioBuffer;
        try { decoded = await context.decodeAudioData(await file.arrayBuffer()); } finally { await context.close(); }
        if (!Number.isFinite(decoded.duration) || decoded.duration <= 0 || decoded.duration > 30) throw new Error("O áudio precisa ter até 30 segundos.");
        const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
        const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
        const samples = (await offline.startRendering()).getChannelData(0);
        const bytes = new Uint8Array(44 + samples.length * 2); const view = new DataView(bytes.buffer);
        const text = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i); };
        text(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); text(8, "WAVEfmt "); view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
        view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.length * 2, true);
        samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767)), true));
        let binary = ""; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        onChange({ base64: btoa(binary) });
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir este áudio. Tente WAV ou MP3."); }
      finally { setBusy(false); onBusy(false); }
    }} />
    {busy && <p role="status">Preparando o áudio no navegador…</p>}
    {error && <p role="alert">{error}</p>}
    {value && <><SupportAudio key={"base64" in value ? value.base64.slice(-60) : value.itemId} missionId={missionId} {...value} /><button type="button" className="text-button" disabled={busy || disabled} onClick={() => onChange(null)}>Remover áudio deste apoio</button></>}
  </div>;
}
