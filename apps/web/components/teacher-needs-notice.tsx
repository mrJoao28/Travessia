"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, pages, type ApiResponse } from "../lib/product-client";
import { sortStudentsByName } from "../lib/student-sorting";

type SharedNeed = ApiResponse<"sharedLearningNeeds">["items"][number];

export function TeacherNeedsNotice({ classroomId, activityId }: { classroomId: string; activityId: string }) {
  const [items, setItems] = useState<SharedNeed[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void pages("sharedLearningNeeds", classroomId)
      .then((rows) => { if (active) setItems(sortStudentsByName(rows.map(item => ({ ...item, id: item.userId })))); })
      .catch((reason) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classroomId, retry]);

  return <section className="paper form-stack" aria-labelledby="shared-needs-notice-title">
    <h3 id="shared-needs-notice-title">Pedidos de apoio compartilhados</h3>
    {loading ? <p role="status">Consultando pedidos autorizados desta turma…</p> : error ? <>
      <p className="form-error" role="alert">Não foi possível consultar os pedidos de apoio. Você pode continuar e tentar novamente depois.</p>
      <button type="button" className="text-button" onClick={() => setRetry(value => value + 1)}>Tentar consultar novamente</button>
    </> : items.length ? <>
      <p role="status">{items.length} {items.length === 1 ? "aluno compartilhou" : "alunos compartilharam"} preferências de apoio com os docentes desta turma.</p>
      <ul>{items.map(item => <li key={item.userId}>{item.name}</li>)}</ul>
      <p className="small">O compartilhamento foi autorizado pelo aluno. A deficiência informada não determina qual adaptação usar.</p>
      <Link className="button button-outline" href={`/professor/atividades/${activityId}/adaptacoes`}>Consultar pedidos e preparar adaptações</Link>
    </> : <p>Nenhum aluno compartilhou pedidos de apoio nesta turma. Cada aluno pode escolher, no próprio perfil, se quer compartilhar preferências com os docentes.</p>}
  </section>;
}
