"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

type Team = ApiResponse<"classroomTeams">["items"][number];
type Member = ApiResponse<"members">["items"][number];

export function ClassroomTeamManager({ classroomId, classroomName, viewerId }: { classroomId: string; classroomName: string; viewerId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([viewerId]);
  const [leaderId, setLeaderId] = useState(viewerId);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function load() {
    try { const [teamList, memberList] = await Promise.all([api("classroomTeams", { params: { id: classroomId } }), api("members", { params: { id: classroomId } })]); setTeams(teamList.items); setMembers(memberList.items.filter(item => item.active && item.role === "student")); }
    catch (reason) { setMessage(errorMessage(reason)); }
  }
  useEffect(() => { void load(); }, [classroomId]);
  const canManage = (team: Team) => team.leaderId === viewerId;
  async function save() {
    if (!name.trim() || selected.length < 2 || !selected.includes(leaderId) || pending) return;
    setPending(true); setMessage("");
    try {
      const body = { name: name.trim(), leaderId, studentIds: selected };
      const saved = editing ? await api("updateClassroomTeam", { params: { id: classroomId, teamId: editing }, body }) : await api("createClassroomTeam", { params: { id: classroomId }, body });
      setTeams(items => editing ? items.map(item => item.id === saved.id ? saved : item) : [...items, saved]);
      setName(""); setSelected([viewerId]); setLeaderId(viewerId); setEditing(null); setMessage("Equipe da turma salva. Ela será reaproveitada nas próximas atividades em grupo.");
    } catch (reason) { setMessage(errorMessage(reason)); } finally { setPending(false); }
  }
  async function remove(team: Team) { if (!canManage(team) || pending) return; setPending(true); try { await api("deleteClassroomTeam", { params: { id: classroomId, teamId: team.id } }); setTeams(items => items.filter(item => item.id !== team.id)); setMessage("Equipe removida da turma."); } catch (reason) { setMessage(errorMessage(reason)); } finally { setPending(false); } }
  return <section className="paper form-stack" aria-label={`Equipes da ${classroomName}`}>
    <h2>Equipes da turma</h2><p>Crie uma equipe uma vez. O líder pode manter os integrantes, e o sistema reutiliza a equipe nas atividades em grupo.</p>
    {teams.map(team => <article className="example" key={team.id}><strong>{team.name}</strong> · Líder: {team.members.find(member => member.id === team.leaderId)?.name ?? "não identificado"}<br /><span>{team.members.map(member => member.name).join(", ")}</span>{canManage(team) && <div className="button-row"><button type="button" className="text-button" onClick={() => { setEditing(team.id); setName(team.name); setSelected(team.members.map(member => member.id)); setLeaderId(team.leaderId); }}>Editar equipe</button><button type="button" className="text-button" onClick={() => void remove(team)}>Remover equipe</button></div>}</article>)}
    <label htmlFor={`team-name-${classroomId}`}>{editing ? "Editando equipe" : "Nome da equipe"}<input id={`team-name-${classroomId}`} value={name} maxLength={150} onChange={e => setName(e.target.value)} placeholder="Ex.: Equipe 1" /></label>
    <fieldset className="teacher-choice-list"><legend>Integrantes</legend>{members.map(member => <label className="check" key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={e => setSelected(old => e.target.checked ? [...old, member.id] : old.filter(id => id !== member.id))} />{member.name}</label>)}</fieldset>
    <label htmlFor={`team-leader-${classroomId}`}>Líder<select id={`team-leader-${classroomId}`} value={leaderId} onChange={e => setLeaderId(e.target.value)}>{selected.map(id => <option key={id} value={id}>{members.find(member => member.id === id)?.name ?? id}</option>)}</select></label>
    <div className="button-row"><button type="button" className="button button-outline" disabled={pending || selected.length < 2 || !name.trim()} onClick={() => void save()}>{editing ? "Salvar equipe" : "Criar equipe"}</button>{editing && <button type="button" className="text-button" onClick={() => { setEditing(null); setName(""); setSelected([viewerId]); setLeaderId(viewerId); }}>Cancelar</button>}</div>
    {message && <p role="status">{message}</p>}
  </section>;
}
