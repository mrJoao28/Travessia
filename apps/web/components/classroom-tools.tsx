"use client";
import { useEffect, useState } from "react";
import {
  api,
  pages,
  errorMessage,
  type ApiResponse,
} from "../lib/product-client";
import {normalizeInvitation} from "../lib/invitation";
import {InviteSharing} from "./invite-sharing";
import { OperationStatus } from "./operation-status";
import type { Classroom } from "./live-workspace";

export function ClassroomTools({
  teacher,
  onChanged,
}: {
  teacher: boolean;
  onChanged: () => void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <details className="paper" style={{ marginBlock: "1rem" }}>
      <summary>
        {teacher ? "Criar uma turma" : "Entrar em uma turma por convite"}
      </summary>
      <form
        className="form-stack"
        style={{ marginTop: "1rem" }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setMessage("");
          try {
            if (teacher)
              await api("createClassroom", { body: { name: value } });
            else {const token=normalizeInvitation(value,window.location.origin);if(!token)throw new Error("Cole o link do Travessia ou digite o código de oito caracteres.");await api("acceptInvite", { body: { token } });}
            setValue("");
            onChanged();
          } catch (reason) {
            setMessage(errorMessage(reason));
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="classroom-action">
          {teacher ? "Nome da turma" : "Código de convite"}
          <input
            id="classroom-action"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={teacher ? 200 : 2048}
            minLength={1}
            autoComplete="off"
            disabled={pending}
            aria-describedby="classroom-action-help"
          />
        </label>
        <p id="classroom-action-help" className="small">
          {teacher
            ? "O servidor criará a turma e seu vínculo como docente."
            : "Cole o link ou digite o código curto fornecido pelo professor. Sua entrada será confirmada pelo servidor."}
        </p>
        <button className="button button-outline" disabled={pending}>
          {pending ? "Aguarde…" : teacher ? "Criar turma" : "Aceitar convite"}
        </button>
        <OperationStatus message={message} />
      </form>
    </details>
  );
}
export function ClassroomMembers({ classroom }: { classroom: Classroom }) {
  const [members,setMembers]=useState<ApiResponse<"members">["items"]>([]);
  const [loading,setLoading]=useState(true),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setMembers([]);setMessage('');pages('members',classroom.id).then(value=>{if(active)setMembers(value);}).catch(reason=>{if(active)setMessage(errorMessage(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[classroom.id]);
  return <section className="paper form-stack" style={{marginTop:'1rem'}}><h2>Participantes de {classroom.name}</h2>{loading?<p role="status">Consultando vínculos…</p>:<details><summary>Consultar participantes com vínculo ativo</summary><ul>{members.filter(m=>m.active).map(m=><li key={m.id}>{m.name} · {m.role==='teacher'?'Professor':'Aluno'}</li>)}</ul></details>}<InviteSharing key={classroom.id} classroom={classroom}/><OperationStatus message={message}/></section>;
}
