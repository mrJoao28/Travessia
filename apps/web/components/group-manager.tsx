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
      const group = await api("createGroup", { params: { id: missionId }, body: { name: name.trim(), studentIds: selected } });
      setGroups(all => [...all, group]); setName(""); setSelected([]);
      setMessage("Equipe criada. Os integrantes compartilharão a mesma entrega.");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  async function remove(groupId: string) {
    if (pending) return;
    setPending(true); setMessage("");
    try {
      await api("removeGroup", { params: { id: missionId, groupId } });
      setGroups(all => all.filter(group => group.id !== groupId));
      setMessage("Equipe removida.");
    } catch (reason) { setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  return <section className="paper form-stack" aria-label="Equipes da atividade">
    <h3>Equipes da atividade</h3>
    <p>Organize os alunos da turma em equipes de pelo menos duas pessoas. Cada equipe envia uma atividade em conjunto. Alunos sem equipe precisarão ser incluídos antes de entregar.</p>
    {groups.map(group => <div key={group.id} className="example">
      <strong>{group.name}</strong> · {group.studentIds.map(id => students.find(student => student.id === id)?.name ?? "Aluno sem vínculo ativo").join(", ")}
      <button type="button" className="text-button" disabled={pending} onClick={() => void remove(group.id)}>Remover equipe</button>
    </div>)}
    <label htmlFor="group-name">Nome da equipe
      <input id="group-name" maxLength={150} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Equipe 1" />
    </label>
    <fieldset className="teacher-choice-list"><legend>Integrantes disponíveis</legend>
      {students.filter(student => !assigned.has(student.id)).map(student => <label key={student.id} className="check">
        <input type="checkbox" checked={selected.includes(student.id)} disabled={pending} onChange={event => setSelected(all => event.target.checked ? [...all, student.id] : all.filter(id => id !== student.id))} />{student.name}
      </label>)}
      {students.every(student => assigned.has(student.id)) && <p>Todos os alunos ativos já estão em equipes.</p>}
    </fieldset>
    <button type="button" className="button button-outline" disabled={pending || !name.trim() || selected.length < 2} onClick={() => void create()}>Criar equipe</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
