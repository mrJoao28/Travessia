"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

type Period = ApiResponse<"gradePeriods">["items"][number];
type Entry = { mission: ApiResponse<"mission"> };

export function GradebookManager({ classroomId, entries }: { classroomId: string; entries: Entry[] }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [weight, setWeight] = useState("1");
  const [active, setActive] = useState<ApiResponse<"gradebook"> | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let live = true; void api("gradePeriods", { params: { id: classroomId } }).then(value => { if (live) setPeriods(value.items); }).catch(reason => { if (live) setMessage(errorMessage(reason)); }); return () => { live = false; }; }, [classroomId]);
  async function create() {
    if (!name.trim() || pending) return; setPending(true); setMessage("");
    try { const period = await api("createGradePeriod", { params: { id: classroomId }, body: { name: name.trim(), startsAt: null, endsAt: null } }); setPeriods(all => [...all, period]); setName(""); setMessage("Bimestre criado. Agora associe as avaliações."); }
    catch (reason) { setMessage(errorMessage(reason)); } finally { setPending(false); }
  }
  async function addAssessment(period: Period) {
    if (!selected || pending) return; setPending(true); setMessage("");
    try { const assessment = await api("addGradeAssessment", { params: { id: period.id }, body: { missionId: selected, weight: Number(weight) } }); setPeriods(all => all.map(item => item.id === period.id ? { ...item, assessments: [...item.assessments, assessment] } : item)); setSelected(""); setMessage("Avaliação adicionada ao bimestre."); }
    catch (reason) { setMessage(errorMessage(reason)); } finally { setPending(false); }
  }
  async function open(period: Period) { setPending(true); setMessage(""); try { setActive(await api("gradebook", { params: { id: period.id } })); } catch (reason) { setMessage(errorMessage(reason)); } finally { setPending(false); } }
  return <details className="paper teacher-disclosure">
    <summary>Bimestres e notas</summary>
    <div className="form-stack">
      <p>Crie o período e escolha quais atividades compõem a nota. Os pesos ficam configuráveis por bimestre; nenhuma nota é calculada pela IA.</p>
      <div className="button-row"><label htmlFor="grade-period-name">Nome do bimestre<input id="grade-period-name" value={name} maxLength={150} onChange={e => setName(e.target.value)} placeholder="Ex.: 1º bimestre" /></label><button className="button button-outline" type="button" disabled={pending || !name.trim()} onClick={() => void create()}>Criar bimestre</button></div>
      {periods.map(period => <section className="example" key={period.id}>
        <h3>{period.name}</h3>
        <p>{period.assessments.length ? period.assessments.map(item => `${item.title} (peso ${item.weight})`).join(" · ") : "Nenhuma avaliação associada."}</p>
        <div className="button-row"><label htmlFor={`grade-assessment-${period.id}`}>Adicionar avaliação<select id={`grade-assessment-${period.id}`} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Escolher atividade</option>{entries.filter(entry => !period.assessments.some(item => item.missionId === entry.mission.id)).map(entry => <option key={entry.mission.id} value={entry.mission.id}>{(entry.mission.draftVersion ?? entry.mission.publishedVersion)?.title ?? "Atividade"}</option>)}</select></label><label htmlFor={`grade-weight-${period.id}`}>Peso<input id={`grade-weight-${period.id}`} type="number" min="1" max="100" value={weight} onChange={e => setWeight(e.target.value)} /></label><button className="button button-outline" type="button" disabled={pending || !selected} onClick={() => void addAssessment(period)}>Adicionar</button><button className="text-button" type="button" disabled={pending} onClick={() => void open(period)}>Visualizar notas</button></div>
      </section>)}
      {active && <section aria-live="polite"><h3>{active.period.name}</h3><div className="table-scroll"><table><caption>Notas por aluno</caption><thead><tr><th scope="col">Aluno</th>{active.period.assessments.map(item => <th scope="col" key={item.id}>{item.title}</th>)}<th scope="col">Média</th></tr></thead><tbody>{active.students.map(student => <tr key={student.studentId}><th scope="row">{student.name}</th>{student.assessments.map(item => <td key={item.assessmentId}>{item.value === null ? "—" : item.value.toFixed(2)}</td>)}<td>{student.average === null ? "—" : student.average.toFixed(2)}</td></tr>)}</tbody></table></div></section>}
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
