"use client";
import { type FormEvent, useEffect, useState } from "react";
import { api, pages, errorMessage, type ApiResponse } from "../lib/product-client";
import { sortStudentsByName } from "../lib/student-sorting";

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
      .then(([recipients, result]) => { if (active) { setStudents(sortStudentsByName(recipients)); setGroups(result.items); } })
      .catch(reason => { if (active) setMessage(errorMessage(reason)); });
    return () => { active = false; };
  }, [missionId]);
  const assigned = new Set(groups.flatMap(group => group.studentIds));
  async function create() {
    if (pending || selected.length < 1 || !name.trim()) return;
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
    if (pending || selected.length < 1) return;
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
      <span>{sortStudentsByName(group.studentIds.map(id => students.find(student => student.id === id)).filter((student): student is Student => !!student)).map(student => student.name).join(", ")}{group.studentIds.some(id => !students.some(student => student.id === id)) ? ", Aluno sem vínculo ativo" : ""}</span>
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
    {(selected.length === 0 || !name.trim()) && <p className="small" role="status" aria-live="polite">
      {selected.length === 0 && !name.trim()
        ? "Informe o nome da equipe e selecione pelo menos 1 estudante."
        : selected.length === 0
          ? "Selecione pelo menos 1 estudante para criar uma equipe."
          : "Informe o nome da equipe para habilitar a criação."}
    </p>}
    <div className="button-row">
      <button type="button" className="button button-outline" disabled={pending || !name.trim() || selected.length < 1} onClick={() => editing ? void update(groups.find(group => group.id === editing)!) : void create()}>{editing ? "Salvar equipe" : "Criar equipe"}</button>
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

export function StudentTeamFormation({ missionId, classroomId, viewerId, currentTeam, required, onCreated }: {
  missionId: string;
  classroomId: string;
  viewerId: string;
  currentTeam: Group | null;
  required: boolean;
  onCreated: (group: Group) => void;
}) {
  const [students, setStudents] = useState<ApiResponse<"members">["items"]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberMessage, setMemberMessage] = useState("");
  const [memberError, setMemberError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void pages("members", classroomId)
      .then(items => { if (active) setStudents(sortStudentsByName(items.filter(item => item.active && item.role === "student"))); })
      .catch(reason => { if (active) setLoadError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId, attempt]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !name.trim() || selected.length === 0 || currentTeam) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const group = await api("createGroup", { params: { id: missionId }, body: {
        name: name.trim(), leaderId: viewerId, studentIds: [viewerId, ...selected],
      } });
      onCreated(group);
      setMessage(`Equipe ${group.name} criada para esta atividade.`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  async function addMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !currentTeam?.canAddMembers || selected.length === 0) return;
    setPending(true); setMemberError(""); setMemberMessage("");
    try {
      const updated = await api("updateGroup", { params: { id: missionId, groupId: currentTeam.id }, body: {
        name: currentTeam.name, leaderId: currentTeam.leaderId, studentIds: [...currentTeam.studentIds, ...selected],
      } });
      onCreated(updated);
      setSelected([]);
      setMemberMessage("Novas pessoas adicionadas à equipe.");
    } catch (reason) { setMemberError(errorMessage(reason)); }
    finally { setPending(false); }
  }

  if (currentTeam) {
    const teamStudents = sortStudentsByName(currentTeam.studentIds.map(id => students.find(student => student.id === id)).filter((student): student is NonNullable<typeof student> => !!student));
    const availableStudents = students.filter(student => !currentTeam.studentIds.includes(student.id));
    return <section className="notice form-stack student-team-card" aria-label="Equipe desta atividade" aria-busy={pending}>
      <h3>Sua equipe: {currentTeam.name}</h3>
      <p>Líder: <strong>{students.find(student => student.id === currentTeam.leaderId)?.name ?? "não definido"}</strong></p>
      <h4>Integrantes</h4>
      <ul>{teamStudents.map(student => <li key={student.id}>{student.name}{student.id === currentTeam.leaderId ? " · líder" : ""}</li>)}</ul>
      {currentTeam.canAddMembers ? <form className="form-stack" onSubmit={event => void addMembers(event)}>
        <fieldset className="teacher-choice-list" disabled={pending || loading || availableStudents.length === 0}>
          <legend>Adicionar pessoas à equipe</legend>
          {loading ? <p role="status">Carregando estudantes da turma…</p> : availableStudents.length === 0 ? <p>Todas as pessoas ativas da turma já estão nesta equipe.</p> : availableStudents.map(student => <label className="check" key={student.id}>
            <input type="checkbox" checked={selected.includes(student.id)} disabled={!selected.includes(student.id) && currentTeam.studentIds.length + selected.length >= 50} onChange={event => setSelected(items => event.target.checked ? [...items, student.id] : items.filter(id => id !== student.id))} />{student.name}
          </label>)}
        </fieldset>
        <button type="submit" className="button" disabled={pending || selected.length === 0}>{pending ? "Adicionando…" : "Adicionar à equipe"}</button>
      </form> : !loading && <p className="small">Para adicionar pessoas, fale com o professor. Se alguém precisar sair da equipe, também será necessário pedir autorização ao professor.</p>}
      {memberError && <p role="alert">{memberError}</p>}{memberMessage && <p role="status">{memberMessage}</p>}{message && <p role="status">{message}</p>}
    </section>;
  }

  return <section className="notice form-stack" aria-labelledby={`student-team-title-${missionId}`} aria-busy={pending}>
    <h3 id={`student-team-title-${missionId}`}>{required ? "Monte sua equipe para começar" : "Quer fazer esta atividade em grupo?"}</h3>
    <p>Escolha pelo menos uma pessoa da turma. Você será o líder e poderá organizar as respostas da equipe.</p>
    {loading ? <p role="status">Carregando estudantes da turma…</p> : loadError ? <div>
      <p role="alert">{loadError}</p>
      <button type="button" className="text-button" disabled={pending} onClick={() => setAttempt(value => value + 1)}>Tentar carregar novamente</button>
    </div> : students.filter(student => student.id !== viewerId).length === 0 ? <p>Não há outros estudantes ativos nesta turma para formar uma equipe.</p> : <form className="form-stack" noValidate onSubmit={event => void create(event)}>
      <label htmlFor={`student-team-name-${missionId}`}>Nome da equipe
        <input id={`student-team-name-${missionId}`} value={name} maxLength={150} required disabled={pending} onChange={event => setName(event.target.value)} placeholder="Ex.: Equipe 1" />
      </label>
      <fieldset className="teacher-choice-list" disabled={pending}>
        <legend>Quem vai participar?</legend>
        <p className="small">Você será incluído automaticamente como líder. A equipe pode ter até 50 pessoas.</p>
        {students.filter(student => student.id !== viewerId).map(student => <label className="check" key={student.id}>
          <input type="checkbox" checked={selected.includes(student.id)} disabled={!selected.includes(student.id) && selected.length >= 49} onChange={event => setSelected(current => event.target.checked ? [...current, student.id] : current.filter(id => id !== student.id))} />
          {student.name}
        </label>)}
      </fieldset>
      <button type="submit" className="button" disabled={pending || loading || !name.trim() || selected.length === 0}>
        {pending ? "Criando equipe…" : "Criar equipe"}
      </button>
    </form>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
