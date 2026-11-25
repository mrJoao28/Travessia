"use client";

import { useRef, useState } from "react";
import { Icon } from "../icons";
import { PreviewHeading } from "./chrome";
import { usePreview } from "./provider";
import styles from "./monitoria.module.css";
import { sortStudentsByName } from "../../lib/student-sorting";

const permissions = {
  partial: { title: "Moderação parcial", detail: "O professor revisa cada proposta antes de aplicá-la." },
  total: { title: "Moderação total", detail: "O monitor pode aplicar alterações diretamente na missão." },
};
type Mode = keyof typeof permissions;
type Assignment = { missionId: string; studentId: string; mode: Mode };
type Review = { id: string; missionId: string; missionTitle: string; studentName: string } &
  ({ kind: "change"; text: string } | { kind: "grade"; grade: string });

export function PreviewMonitoria() {
  const { state, update } = usePreview();
  const [missionId, setMissionId] = useState(state.missions[0]?.id ?? "");
  const mission = state.missions.find(item => item.id === missionId);
  const classroom = state.classrooms.find(item => item.id === mission?.classroomId);
  const students = sortStudentsByName(state.students.filter(item => classroom?.students.includes(item.id)));
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const student = students.find(item => item.id === studentId);
  const [mode, setMode] = useState<Mode>("partial");
  const [acknowledged, setAcknowledged] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [activity, setActivity] = useState("");
  const [grade, setGrade] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const missionSelect = useRef<HTMLSelectElement>(null);

  function changeMission(id: string) {
    const roomId = state.missions.find(item => item.id === id)?.classroomId;
    const room = state.classrooms.find(item => item.id === roomId);
    setMissionId(id);
    setStudentId(state.students.find(item => room?.students.includes(item.id))?.id ?? "");
    setAcknowledged(false);
  }

  function applyChange(id: string, text: string) {
    update(current => ({
      ...current,
      missions: current.missions.map(item => item.id === id ? {
        ...item, description: item.description + "\n\nAlteração simulada pelo monitor: " + text,
        revision: item.revision + 1,
      } : item),
    }));
  }

  function submitAction(action: { kind: "change"; text: string } | { kind: "grade"; grade: string }) {
    if (!assignment || !mission || !student) return;
    if (action.kind === "change" && assignment.mode === "total") {
      applyChange(assignment.missionId, action.text);
      setNotice("Alteração aplicada à missão fictícia.");
    } else {
      setReviews(items => [...items, {
        ...action, id: crypto.randomUUID(), missionId, missionTitle: mission.title, studentName: student.name,
      }]);
      setNotice(action.kind === "change" ? "Proposta enviada para revisão do professor." : "Sugestão de nota enviada para revisão do professor.");
    }
    if (action.kind === "change") setActivity("");
    else setGrade("");
  }

  function review(item: Review, approved: boolean) {
    if (approved && item.kind === "change") applyChange(item.missionId, item.text);
    setReviews(current => current.filter(entry => entry.id !== item.id));
    reviewHeading.current?.focus();
    setNotice(approved ? (item.kind === "change" ? "Proposta aprovada e aplicada à missão fictícia." : "Revisão da nota concluída na simulação.") : "Sugestão recusada na simulação.");
  }

  return <div className={styles.page}>
    <PreviewHeading title="Monitoria das missões" description="Escolha quem vai apoiar a missão e acompanhe as sugestões que precisam da sua revisão." />
    <div className={styles.layout}>
      <section className={`paper form-stack ${styles.panel}`} aria-labelledby="monitor-assignment">
        <h2 id="monitor-assignment" tabIndex={-1} ref={heading}><Icon name="users" />{assignment ? "Monitor designado" : "Designar monitor"}</h2>
        {assignment ? <>
          <dl className={styles.summary}>
            <div><dt>Monitor</dt><dd>{student?.name}</dd></div>
            <div><dt>Missão</dt><dd>{mission?.title}</dd></div>
            <div><dt>Permissão</dt><dd>{permissions[assignment.mode].title}</dd></div>
          </dl>
          <button className="button button-outline" onClick={() => {
            setAssignment(null); setAcknowledged(false); setNotice(""); setActivity(""); setGrade("");
            requestAnimationFrame(() => missionSelect.current?.focus());
          }}>Alterar designação</button>
        </> : <form className={styles.stack} onSubmit={event => {
          event.preventDefault();
          if (!mission || !student || (mode === "total" && !acknowledged)) return;
          setAssignment({ missionId, studentId, mode });
          setNotice("Monitor designado na simulação.");
          requestAnimationFrame(() => heading.current?.focus());
        }}>
          <div className={styles.field}><label htmlFor="monitor-mission">Missão</label><select id="monitor-mission" ref={missionSelect} value={missionId} onChange={event => changeMission(event.target.value)}>
            {state.missions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select></div>
          <div className={styles.field}><label htmlFor="monitor-student">Aluno da turma{classroom && ` · ${classroom.name}`}</label><select id="monitor-student" value={studentId} onChange={event => { setStudentId(event.target.value); setAcknowledged(false); }}>
            {students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></div>
          {!student && <p>Esta turma precisa ter um aluno para designar um monitor.</p>}
          <fieldset className={styles.permissions}><legend>Nível de moderação</legend>
            {(Object.keys(permissions) as Mode[]).map(value => <label key={value} className={styles.option}>
              <input type="radio" name="monitor-mode" checked={mode === value} onChange={() => { setMode(value); setAcknowledged(false); }} />
              <span><strong>{permissions[value].title}</strong><small>{permissions[value].detail}</small></span>
            </label>)}
          </fieldset>
          {mode === "total" && <label className={styles.warning}><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
            <span>Confirmo que o monitor poderá alterar esta missão sem aprovação prévia. Sugestões de nota continuam em revisão.</span>
          </label>}
          <button className="button" disabled={!student || !mission || (mode === "total" && !acknowledged)}>Confirmar designação</button>
        </form>}
      </section>
      <section className={`paper ${styles.review}`} aria-labelledby="monitor-review">
        <h2 id="monitor-review" tabIndex={-1} ref={reviewHeading}><Icon name="list" />Revisão do professor</h2>
        {reviews.length === 0 ? <div className={styles.empty}><strong>Nenhuma sugestão pendente</strong><p>As propostas de alteração e as sugestões de nota enviadas para revisão aparecerão aqui.</p></div> :
          <ul className={styles.queue}>{reviews.map(item => <li key={item.id}>
            <h3>{item.kind === "change" ? "Proposta de alteração" : "Sugestão de nota"}</h3>
            <p className="small">{item.studentName} · {item.missionTitle}</p>
            <p>{item.kind === "change" ? item.text : `Nota sugerida: ${item.grade} de 10`}</p>
            <div className="actions"><button className="button button-outline" onClick={() => review(item, true)}>{item.kind === "change" ? "Aprovar proposta" : "Confirmar revisão"}</button><button className="text-button" onClick={() => review(item, false)}>Recusar</button></div>
          </li>)}</ul>}
      </section>
    </div>
    {assignment && <section className={`paper form-stack ${styles.panel}`} aria-labelledby="monitor-actions">
      <h2 id="monitor-actions"><Icon name="document" />Simular ações de {student?.name}</h2>
      <div className={styles.actionsGrid}>
        <form className={styles.stack} onSubmit={event => { event.preventDefault(); if (activity.trim()) submitAction({ kind: "change", text: activity.trim() }); }}>
          <label>Alteração na missão<textarea required maxLength={3000} value={activity} onChange={event => setActivity(event.target.value)} /></label>
          <button className="button button-outline" disabled={!activity.trim()}>{assignment.mode === "partial" ? "Enviar proposta para revisão" : "Aplicar alteração na missão"}</button>
        </form>
        <form className={styles.stack} onSubmit={event => { event.preventDefault(); submitAction({ kind: "grade", grade }); }}>
          <label>Nota sugerida (0 a 10)<input required type="number" min="0" max="10" step="0.1" value={grade} onChange={event => setGrade(event.target.value)} /></label>
          <p className="small">O professor revisa toda sugestão de nota.</p>
          <button className="button button-outline" disabled={!grade}>Enviar sugestão de nota</button>
        </form>
      </div>
    </section>}
    <p role="status" className={styles.status}>{notice}</p>
  </div>;
}
