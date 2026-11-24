"use client";
import { useEffect, useState } from "react";
import { api, pages, errorMessage, type ApiResponse } from "../lib/product-client";

type Student = ApiResponse<"strategyRecipients">["items"][number];
type Group = ApiResponse<"groups">["items"][number];

export function GroupManager({ missionId }: { missionId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [exceptionStudent, setExceptionStudent] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([pages("strategyRecipients", missionId), api("groups", { params: { id: missionId } })])
      .then(([recipients, result]) => { if (active) { setStudents(recipients); setGroups(result.items); } })
      .catch(reason => { if (active) setMessage(errorMessage(reason)); });
    return () => { active = false; };
  }, [missionId]);
  const assigned = new Set(groups.flatMap(group => group.studentIds));
  async function create() {
    if (pending || selected.length < 2 || !name.trim()) return;
    setPending(true); setMessage("");
    try {
      const group = await api("createGroup", { params: { id: missionId }, body: { name: name.trim(), leaderId: leaderId || null, studentIds: selected } });
      setGroups(all => [...all, group]); setName(""); setSelected([]);
      setLeaderId("");
      setMessage("Equipe criada. Os integrantes compartilharão a mesma entrega.");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  async function update(group: Group) {
    if (pending || selected.length < 2) return;
    setPending(true); setMessage("");
    try {
      const changed = await api("updateGroup", { params: { id: missionId, groupId: group.id }, body: { name: name.trim(), leaderId: leaderId || null, studentIds: selected } });
      setGroups(all => all.map(item => item.id === changed.id ? changed : item));
      setEditing(null); setSelected([]); setLeaderId("");
      setMessage(`Equipe ${changed.name} atualizada.`);
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  async function setIndividual() {
    if (pending || !exceptionStudent) return;
    setPending(true); setMessage("");
    try {
      await api("setParticipationMode", { params: { id: missionId, studentId: exceptionStudent }, body: { mode: "individual", reason: exceptionReason.trim() || null } });
      setMessage("Exceção individual registrada para esta atividade.");
      setExceptionStudent(""); setExceptionReason("");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  async function remove(groupId: string) {
    if (pending) return;
    if (!window.confirm("Remover esta equipe das equipes ativas? Entregas anteriores serão preservadas com os integrantes originais. Os alunos precisarão ser designados novamente para continuar uma atividade em grupo.")) return;
    setPending(true); setMessage("");
    try {
      await api("removeGroup", { params: { id: missionId, groupId } });
      setGroups(all => all.filter(group => group.id !== groupId));
      if (editing === groupId) { setEditing(null); setName(""); setSelected([]); setLeaderId(""); }
      setMessage("Equipe removida das equipes ativas. As entregas anteriores foram preservadas.");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  return <section className="paper form-stack" aria-label="Equipes da atividade">
    <h3>Equipes da atividade</h3>
    <p>Organize os alunos da turma em equipes de pelo menos duas pessoas. Todos os integrantes podem editar e validar cada atividade; o líder envia a resposta validada ao professor.</p>
    {groups.map(group => <div key={group.id} className="example">
      <h4>{group.name}</h4><p>Líder: {students.find(student => student.id === group.leaderId)?.name ?? "não definido"}</p>
      <span>{group.studentIds.map(id => students.find(student => student.id === id)?.name ?? "Aluno sem vínculo ativo").join(", ")}</span>
      {group.hasSubmissions && <p className="small">Esta equipe já tem entregas. Você pode corrigir o nome e o líder. Para trocar integrantes, remova a equipe e crie outra; o histórico continuará vinculado aos integrantes originais.</p>}
      <button type="button" className="text-button" disabled={pending} onClick={() => { setEditing(group.id); setName(group.name); setSelected(group.studentIds); setLeaderId(group.leaderId ?? ""); }}>Editar equipe</button>{" "}
      <button type="button" className="text-button" disabled={pending} onClick={() => void remove(group.id)}>Remover equipe</button>
    </div>)}
    <label htmlFor="group-name">{editing ? "Editando equipe" : "Nome da equipe"}
      <input id="group-name" maxLength={150} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Equipe 1" />
    </label>
    <fieldset className="teacher-choice-list" disabled={pending || !!groups.find(group => group.id === editing)?.hasSubmissions}><legend>Integrantes disponíveis</legend>
      {students.filter(student => editing || !assigned.has(student.id)).map(student => <label key={student.id} className="check">
        <input type="checkbox" checked={selected.includes(student.id)} disabled={pending} onChange={event => setSelected(all => event.target.checked ? [...all, student.id] : all.filter(id => id !== student.id))} />{student.name}
      </label>)}
      {students.every(student => assigned.has(student.id)) && <p>Todos os alunos ativos já estão em equipes.</p>}
    </fieldset>
    {selected.length > 0 && <label htmlFor="group-leader">Líder da equipe
      <select id="group-leader" value={leaderId} disabled={pending} onChange={event => setLeaderId(event.target.value)}>
        <option value="">Selecionar líder</option>
        {selected.map(id => <option key={id} value={id}>{students.find(student => student.id === id)?.name ?? id}</option>)}
      </select>
    </label>}
    <div className="button-row">
      <button type="button" className="button button-outline" disabled={pending || !name.trim() || selected.length < 2} onClick={() => editing ? void update(groups.find(group => group.id === editing)!) : void create()}>{editing ? "Salvar equipe" : "Criar equipe"}</button>
      {editing && <button type="button" className="text-button" disabled={pending} onClick={() => { setEditing(null); setSelected([]); setLeaderId(""); }}>Cancelar edição</button>}
    </div>
    <fieldset className="teacher-choice-list"><legend>Exceção individual nesta atividade</legend>
      <p className="small">Use quando a atividade for em grupo, mas um aluno precisar entregar individualmente. A equipe da turma permanece preservada.</p>
      <label htmlFor="group-exception-student">Aluno
        <select id="group-exception-student" value={exceptionStudent} disabled={pending} onChange={event => setExceptionStudent(event.target.value)}>
          <option value="">Selecionar aluno</option>
          {students.filter(student => assigned.has(student.id)).map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
      </label>
      <label htmlFor="group-exception-reason">Motivo registrado (opcional)
        <input id="group-exception-reason" maxLength={500} value={exceptionReason} onChange={event => setExceptionReason(event.target.value)} />
      </label>
      <button type="button" className="button button-outline" disabled={pending || !exceptionStudent} onClick={() => void setIndividual()}>Salvar exceção individual</button>
    </fieldset>
    {message && <p role="status">{message}</p>}
  </section>;
}
