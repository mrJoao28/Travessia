"use client";
import { useEffect, useId, useRef, useState } from "react";
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
  buttonTrigger = false,
}: {
  teacher: boolean;
  onChanged: () => void;
  buttonTrigger?: boolean;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (buttonTrigger && open) inputRef.current?.focus();
  }, [buttonTrigger, open]);
  const form = (
      <form
        className="form-stack classroom-tools-form"
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
            if (buttonTrigger) {
              setOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }
          } catch (reason) {
            setMessage(errorMessage(reason));
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor={inputId}>
          {teacher ? "Nome da turma" : "Código de convite"}
          <input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={teacher ? 200 : 2048}
            minLength={1}
            autoComplete="off"
            disabled={pending}
            aria-describedby={`${inputId}-help`}
          />
        </label>
        <p id={`${inputId}-help`} className="small">
          {teacher
            ? "O servidor criará a turma e seu vínculo como docente."
            : "Cole o link ou digite o código curto fornecido pelo professor. Sua entrada será confirmada pelo servidor."}
        </p>
        <button className="button button-outline" disabled={pending}>
          {pending ? "Aguarde…" : teacher ? buttonTrigger ? "Salvar turma" : "Criar turma" : "Aceitar convite"}
        </button>
        <OperationStatus message={message} />
      </form>
  );
  if (buttonTrigger) return (
    <section className="classroom-create-action">
      <button
        ref={triggerRef}
        className="button"
        type="button"
        aria-expanded={open}
        aria-controls={`${inputId}-form`}
        onClick={() => setOpen((current) => !current)}
      >
        Criar turma
      </button>
      <div id={`${inputId}-form`} className="classroom-create-form" hidden={!open}>
        {open ? form : null}
      </div>
    </section>
  );
  return (
    <details className="paper" style={{ marginBlock: "1rem" }}>
      <summary>
        {teacher ? "Criar uma turma" : "Entrar em uma turma por convite"}
      </summary>
      {form}
    </details>
  );
}
export function ClassroomMembers({ classroom }: { classroom: Classroom }) {
  const [members,setMembers]=useState<ApiResponse<"members">["items"]>([]);
  const [loading,setLoading]=useState(true),[message,setMessage]=useState(''),[revoking,setRevoking]=useState<string|null>(null);
  useEffect(()=>{let active=true;setLoading(true);setMembers([]);setMessage('');pages('members',classroom.id).then(value=>{if(active)setMembers(value);}).catch(reason=>{if(active)setMessage(errorMessage(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[classroom.id]);
  async function revokeMonitor(id:string){setRevoking(id);setMessage('');try{await api('revokeMember',{params:{id:classroom.id,memberId:id}});setMembers(current=>current.map(member=>member.id===id?{...member,active:false}:member));setMessage('Vínculo de monitor encerrado nesta turma.');}catch(error){setMessage(errorMessage(error));}finally{setRevoking(null);}}
  return <section className="paper form-stack classroom-settings-panel" style={{marginTop:'1rem'}}><h2>Participantes de {classroom.name}</h2>{loading?<p role="status">Consultando vínculos…</p>:<details className="classroom-participants"><summary>Consultar participantes com vínculo ativo</summary><ul className="classroom-member-list">{members.filter(m=>m.active).map(m=><li className="classroom-member-row" key={m.id}><span className="classroom-member-copy">{m.name} · {m.role==='teacher'?'Professor':m.role==='monitor'?'Monitor':'Aluno'}</span>{m.role==='monitor'&&<button type="button" className="button button-outline" disabled={!!revoking} onClick={()=>void revokeMonitor(m.id)} aria-label={`Encerrar vínculo de monitor de ${m.name}`}>{revoking===m.id?'Encerrando…':'Encerrar vínculo'}</button>}</li>)}</ul></details>}<InviteSharing key={classroom.id} classroom={classroom}/><OperationStatus message={message}/></section>;
}
