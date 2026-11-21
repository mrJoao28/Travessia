"use client";

import { useMemo, useState } from "react";
import { usePreview } from "./provider";
import { PreviewHeading } from "./chrome";

type Mode = "none" | "partial" | "total";

export function PreviewMonitoria() {
  const { state, update } = usePreview();
  const classroom = state.classrooms[0];
  const [studentId, setStudentId] = useState(classroom?.students[0] ?? "");
  const [mode, setMode] = useState<Mode>("none");
  const [acknowledged, setAcknowledged] = useState(false);
  const [missionId, setMissionId] = useState(state.missions[0]?.id ?? "");
  const [activity, setActivity] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [grade, setGrade] = useState("");
  const [gradePending, setGradePending] = useState(false);
  const student = useMemo(() => state.students.find((item) => item.id === studentId), [state.students, studentId]);
  const mission = state.missions.find((item) => item.id === missionId);

  function assign(next: Mode) {
    setMode(next);
    setAcknowledged(false);
    setNotice("");
  }

  return <div className="teacher-guide">
    <PreviewHeading title="Monitoria das missões" description="Designe um aluno da turma e escolha quais ações ele pode realizar nas missões." />
    <section className="paper form-stack" aria-labelledby="monitor-assignment">
      <h2 id="monitor-assignment">Responsável pela monitoria</h2>
      <label htmlFor="monitor-student">Aluno da turma</label>
      <select id="monitor-student" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
        {classroom?.students.map((id) => {
          const person = state.students.find((item) => item.id === id);
          return person ? <option key={person.id} value={person.id}>{person.name}</option> : null;
        })}
      </select>
      {student && <p className="small">{student.name} será monitor nesta simulação.</p>}
      <fieldset className="form-stack">
        <legend>Nível de moderação</legend>
        <label className="check"><input type="radio" name="monitor-mode" checked={mode === "none"} onChange={() => assign("none")} />Sem moderação</label>
        <label className="check"><input type="radio" name="monitor-mode" checked={mode === "partial"} onChange={() => assign("partial")} />Parcial: alterações precisam de aprovação docente</label>
        <label className="check"><input type="radio" name="monitor-mode" checked={mode === "total"} onChange={() => assign("total")} />Total: pode editar qualquer atividade da missão</label>
      </fieldset>
      {mode === "total" && <aside className="paper" role="alert" aria-labelledby="total-warning-title">
        <h3 id="total-warning-title">Atenção: moderação total</h3>
        <p>O monitor poderá modificar qualquer atividade desta missão. Alterações podem afetar instruções, materiais e critérios usados pela turma. Acompanhe as mudanças e revogue este acesso quando ele não for mais necessário.</p>
        <p><strong>Avaliação continua com o professor:</strong> o monitor pode sugerir uma nota e um comentário, mas deve enviá-los para sua revisão. A nota só é registrada após sua avaliação.</p>
        <label className="check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />Li os riscos e confirmo a moderação total</label>
      </aside>}
      <button className="button" disabled={mode === "none" || (mode === "total" && !acknowledged)} onClick={() => setNotice(mode === "total" ? "Monitor fictício designado com moderação total." : "Monitor fictício designado com moderação parcial.")}>Designar monitor</button>
      {notice && <p role="status">{notice} A alteração existe somente nesta prévia do navegador.</p>}
    </section>

    {mode !== "none" && <section className="paper form-stack" aria-labelledby="monitor-actions">
      <h2 id="monitor-actions">Ações do monitor fictício</h2>
      <label htmlFor="monitor-mission">Missão</label>
      <select id="monitor-mission" value={missionId} onChange={(event) => setMissionId(event.target.value)}>{state.missions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <label htmlFor="monitor-activity">Proposta de alteração em atividade</label>
      <textarea id="monitor-activity" value={activity} maxLength={3000} onChange={(event) => setActivity(event.target.value)} placeholder="Descreva uma alteração fictícia para a atividade selecionada." />
      <button className="button button-outline" disabled={!activity.trim()} onClick={() => {
        const change = `${mission?.title ?? "Missão"}: ${activity.trim()}`;
        if (mode === "partial") setPending((items) => [...items, change]);
        else update((current) => ({ ...current, missions: current.missions.map((item) => item.id === missionId ? { ...item, description: `${item.description}\n\nAlteração simulada pelo monitor: ${activity.trim()}`, revision: item.revision + 1 } : item) }));
        setActivity("");
        setNotice(mode === "partial" ? "Alteração enviada ao professor para aprovação." : "Alteração total aplicada à missão fictícia.");
      }}>{mode === "partial" ? "Enviar alteração para aprovação" : "Aplicar alteração na simulação"}</button>
      {mode === "partial" && <div><h3>Alterações aguardando professor</h3>{pending.length ? <ul>{pending.map((item, index) => <li key={`${index}-${item}`}>
        <p>{item} · <strong>Aguardando aprovação</strong></p>
        <div className="actions"><button className="button button-outline" onClick={() => { setPending((items) => items.filter((_, itemIndex) => itemIndex !== index)); setNotice("Proposta aprovada na simulação. Em produção, o professor revisaria a versão antes de publicar."); }}>Aprovar proposta</button><button className="text-button" onClick={() => { setPending((items) => items.filter((_, itemIndex) => itemIndex !== index)); setNotice("Proposta recusada na simulação."); }}>Recusar</button></div>
      </li>)}</ul> : <p>Nenhuma proposta pendente.</p>}</div>}
      <h3>Avaliação de entrega</h3>
      <p>O monitor pode sugerir uma nota, mas toda sugestão fica pendente até o professor revisar e confirmar.</p>
      <label htmlFor="monitor-grade">Nota sugerida (0 a 10)</label>
      <input id="monitor-grade" type="number" min="0" max="10" step="0.1" value={grade} onChange={(event) => setGrade(event.target.value)} />
      <button className="button button-outline" disabled={!grade || Number(grade) < 0 || Number(grade) > 10} onClick={() => setGradePending(true)}>Enviar sugestão ao professor</button>
      {gradePending && <div><p role="status">Sugestão de nota {grade} enviada para avaliação do professor. Ainda não é uma nota registrada.</p><details className="teacher-disclosure"><summary>Simular revisão do professor</summary><p>Esta etapa representa a ação docente; a sugestão do monitor não registra uma nota automaticamente.</p><button className="button" onClick={() => { setGradePending(false); setNotice(`Professor revisou a sugestão de nota ${grade} na simulação.`); }}>Confirmar revisão simulada</button></details></div>}
    </section>}
    <p className="small">Prévia interativa: designação, alterações e avaliações são simulações locais. Não concedem acesso nem salvam dados na API.</p>
  </div>;
}
