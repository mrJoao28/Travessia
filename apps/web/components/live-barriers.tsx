"use client";
import { useEffect, useState } from "react";
import {
  api,
  pages,
  errorMessage,
  type ApiResponse,
} from "../lib/product-client";
import type { Classroom } from "./live-workspace";
import { OperationStatus } from "./operation-status";

export function BarrierComposer({
  stepId,
  stepTitle,
}: {
  stepId: string;
  stepTitle: string;
}) {
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState({ id: stepId, title: stepTitle });
  useEffect(() => {
    if (!description) setTarget({ id: stepId, title: stepTitle });
  }, [stepId, stepTitle, description]);
  const [shared, setShared] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState(false);

  async function saveReport() {
    if (pending || !description.trim()) return;
    setPending(true);
    setMessage("");
    setSaveError(false);
    try {
      const saved = await api("createBarrier", {
        params: { id: target.id },
        body: { description: description.trim(), sharedWithTeacher: shared },
      });
      setDescription("");
      setShared(false);
      setMessage(
        saved.sharedWithTeacher
          ? "Relato salvo e compartilhado com os docentes desta turma."
          : "Relato privado salvo. Somente você pode consultá-lo.",
      );
    } catch (reason) {
      setSaveError(true);
      setMessage(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2>Registre eventuais barreiras para cumprir a atividade</h2>
      <p>
        Relato sobre a atividade: <strong>{target.title}</strong>.
      </p>
      <p>
        Descreva o que dificultou a realização da atividade. Não é necessário informar
        diagnóstico ou dados de saúde.
      </p>
      <div
        className="form-stack"
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(next)) void saveReport();
        }}
      >
        <label htmlFor="barrier-text">
          O que dificultou esta atividade?
          <textarea
            disabled={pending}
            id="barrier-text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={6000}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            disabled={pending}
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          Compartilhar com o(a) professor(a) a dificuldade encontrada
        </label>
        <p className="small">
          O relato será salvo automaticamente quando você sair deste formulário.
          Se você marcar o compartilhamento, os docentes da turma poderão consultá-lo.
        </p>
        <OperationStatus message={message} error={saveError} />
        {saveError && (
          <button type="button" className="text-button" disabled={pending} onClick={() => void saveReport()}>
            Tentar salvar novamente
          </button>
        )}
      </div>
    </>
  );
}
export function LiveBarriers({ classroom }: { classroom: Classroom }) {
  const [items, setItems] = useState<ApiResponse<"barriers">["items"]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  useEffect(() => {
    let active = true;
    setPending(true);
    setError("");
    setItems([]);
    pages("barriers", classroom.id)
      .then((value) => {
        if (active) setItems(value);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [classroom.id]);
  return (
    <>
      <h2>Relatos de {classroom.name}</h2>
      <p>
        O professor recebe apenas relatos autorizados para compartilhamento. As
        preferências de leitura são individuais.
      </p>
      {pending && <p role="status">Consultando relatos…</p>}
      {error && <p role="alert">{error}</p>}
      {!pending && !error && !items.length && (
        <p className="paper">Nenhum relato disponível neste contexto.</p>
      )}
      <ul className="card-list">
        {items.map((item) => (
          <li className="paper" key={item.id}>
            <BarrierReply item={item} teacher={classroom.role === "teacher"} />
          </li>
        ))}
      </ul>
    </>
  );
}
function BarrierReply({
  item,
  teacher,
}: {
  item: ApiResponse<"barrier">;
  teacher: boolean;
}) {
  const [response, setResponse] = useState(item.response ?? "");
  const [saved, setSaved] = useState(item.response);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div>
      <h3>
        Relato{" "}
        {item.sharedWithTeacher ? "compartilhado com docentes" : "privado"}
      </h3>
      <p className="submission-content">{item.description}</p>
      {saved && (
        <>
          <h3>Resposta docente</h3>
          <p>{saved}</p>
        </>
      )}
      {teacher && item.sharedWithTeacher && (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setMessage("");
            try {
              const updated = await api("respondBarrier", {
                params: { id: item.id },
                body: { response },
              });
              setSaved(updated.response);
              setMessage("Resposta salva e disponível para o autor do relato.");
            } catch (reason) {
              setMessage(errorMessage(reason));
            } finally {
              setPending(false);
            }
          }}
        >
          <label htmlFor={`reply-${item.id}`}>
            Responder ao estudante
            <textarea
              disabled={pending}
              id={`reply-${item.id}`}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              required
              maxLength={6000}
            />
          </label>
          <p className="small">
            Destinatários: autor do relato e docentes da turma.
          </p>
          <button className="button" disabled={pending}>
            {pending ? "Salvando…" : "Enviar resposta"}
          </button>
          <OperationStatus message={message} />
        </form>
      )}
    </div>
  );
}
