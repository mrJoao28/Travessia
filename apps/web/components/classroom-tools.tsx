"use client";
import { useEffect, useState } from "react";
import {
  api,
  pages,
  errorMessage,
  type ApiResponse,
} from "../lib/product-client";
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
            else await api("acceptInvite", { body: { token: value } });
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
            maxLength={teacher ? 200 : 64}
            minLength={teacher ? 1 : 64}
            pattern={teacher ? undefined : "[a-f0-9]{64}"}
            autoComplete="off"
            disabled={pending}
            aria-describedby="classroom-action-help"
          />
        </label>
        <p id="classroom-action-help" className="small">
          {teacher
            ? "O servidor criará a turma e seu vínculo como docente."
            : "Use o código fornecido pelo professor. O servidor valida disponibilidade e vínculo; o código não altera seu papel em outras turmas."}
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
  const [members, setMembers] = useState<ApiResponse<"members">["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<ApiResponse<"invite"> | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    setMembers([]);
    setInvite(null);
    pages("members", classroom.id)
      .then((value) => {
        if (active) setMembers(value);
      })
      .catch((reason) => {
        if (active) setMessage(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classroom.id]);
  return (
    <section className="paper" style={{ marginTop: "1rem" }}>
      <h2>Participantes de {classroom.name}</h2>
      {loading ? (
        <p role="status">Consultando vínculos…</p>
      ) : (
        <details>
          <summary>Consultar participantes com vínculo ativo</summary>
          <ul>
            {members
              .filter((member) => member.active)
              .map((member) => (
                <li key={member.id}>
                  {member.name} ·{" "}
                  {member.role === "teacher" ? "Professor" : "Aluno"}
                </li>
              ))}
          </ul>
        </details>
      )}
      <button
        className="text-button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          try {
            setInvite(
              await api("invite", { params: { id: classroom.id }, body: {} }),
            );
          } catch (reason) {
            setMessage(errorMessage(reason));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Gerando convite…" : "Gerar convite de aluno"}
      </button>
      {invite && (
        <div className="notice">
          <label htmlFor="invitation-token">
            Código de convite
            <input
              id="invitation-token"
              readOnly
              value={invite.token}
              autoComplete="off"
              onFocus={(e) => e.target.select()}
            />
          </label>
          <p className="small">
            Compartilhe apenas com a pessoa convidada por um canal apropriado.
            Não enviamos email. Válido até{" "}
            {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}; uso único.
          </p>
          <button
            className="text-button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await api("revokeInvite", {
                  params: { id: classroom.id, invitationId: invite.id },
                });
                setInvite(null);
                setMessage("Convite revogado pelo servidor.");
              } catch (reason) {
                setMessage(errorMessage(reason));
              } finally {
                setPending(false);
              }
            }}
          >
            Revogar este convite
          </button>
        </div>
      )}
      <OperationStatus message={message} />
    </section>
  );
}
