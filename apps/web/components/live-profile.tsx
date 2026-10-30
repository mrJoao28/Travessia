"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, errorMessage, type ApiBody, type ApiResponse } from "../lib/product-client";
import { Workspace } from "./workspace";
import { OperationStatus } from "./operation-status";

type Profile = ApiResponse<"profile">;
type Saved = (value: Profile) => void;

export function LiveProfile({ role }: { role: "aluno" | "professor" }) {
  const [data, setData] = useState<Profile | null>(null);
  const [me, setMe] = useState<ApiResponse<"me"> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void Promise.all([api("profile", { signal: controller.signal }), api("me", { signal: controller.signal })])
      .then(([profile, account]) => { if (!controller.signal.aborted) { setData(profile); setMe(account); } })
      .catch(reason => { if (!controller.signal.aborted) setError(errorMessage(reason)); });
    return () => controller.abort();
  }, [attempt]);
  return <Workspace role={role} preferences={me?.preferences} account={data ? {
    name: data.name, course: data.student?.course ?? null,
  } : undefined}>
    <div className="page-heading"><h1>Meu perfil</h1><p>Seus dados de contato e sua trajetória acadêmica.</p></div>
    <Link className="text-link" href={`/${role}`}>Voltar ao meu espaço</Link>
    {error ? <section className="paper"><p role="alert">{error}</p>
      <button className="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button>
      <Link className="text-link" href="/login">Entrar novamente</Link>
    </section> : !data ? <p role="status">Carregando seu perfil…</p> : <div className="profile-sections">
      {me?.demo && <p className="demo-banner">Ambiente de demonstração · dados fictícios</p>}
      <ContactForm initial={data} onSaved={setData} />
      <p>Você pode preencher os dois perfis. Seus dados acadêmicos ficam na sua conta; o acesso a cada turma depende do vínculo com ela.</p>
      <StudentForm initial={data} onSaved={setData} />
      <TeacherForm initial={data} onSaved={setData} />
    </div>}
  </Workspace>;
}

function useSave(onSaved: Saved, success: string) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function save(body: ApiBody<"updateProfile">) {
    setPending(true); setMessage(""); setFailed(false);
    try { onSaved(await api("updateProfile", { body })); setMessage(success); }
    catch (reason) { setFailed(true); setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  return { pending, save, status: <div role={failed ? "alert" : undefined}><OperationStatus message={message} /></div> };
}

function Field({ label, id, value, onChange, maxLength, type = "text", required = false, autoComplete }: {
  label: string; id: string; value: string; onChange: (value: string) => void;
  maxLength: number; type?: string; required?: boolean; autoComplete?: string;
}) {
  return <label htmlFor={id}>{label}<input id={id} name={id} type={type} value={value}
    onChange={e => onChange(e.target.value)} maxLength={maxLength} required={required} autoComplete={autoComplete} /></label>;
}
const nullable = (value: string) => value.trim() || null;

function ProfileForm({ title, description, pending, onSubmit, children, button }: {
  title: string; description: string; pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode; button: string;
}) {
  return <form className="paper form-stack profile-form" onSubmit={onSubmit}>
    <h2>{title}</h2><p>{description}</p>
    <fieldset className="profile-fields" disabled={pending}>
      <legend className="sr-only">{title}</legend>
      {children}
      <button className="button" type="submit">{pending ? "Salvando…" : button}</button>
    </fieldset>
  </form>;
}

function ContactForm({ initial, onSaved }: { initial: Profile; onSaved: Saved }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [alternateEmail, setAlternateEmail] = useState(initial.alternateEmail ?? "");
  const { pending, save, status } = useSave(onSaved, "Dados de contato salvos.");
  return <section aria-label="Dados da conta">
    <ProfileForm title="Dados da conta" description="Nome é obrigatório. Os contatos adicionais são opcionais."
      pending={pending} button="Salvar dados da conta" onSubmit={e => { e.preventDefault(); void save({ name: name.trim(), phone: nullable(phone), alternateEmail: nullable(alternateEmail) }); }}>
      <Field label="Nome completo" id="profile-name" value={name} onChange={setName} maxLength={150} required autoComplete="name" />
      <p><strong>E-mail de acesso:</strong> {initial.email}</p>
      <p className="small">O e-mail alternativo é apenas um contato; seu login continua sendo o e-mail de acesso.</p>
      <div className="profile-grid">
        <Field label="Telefone (opcional)" id="profile-phone" type="tel" value={phone} onChange={setPhone} maxLength={30} autoComplete="tel" />
        <Field label="E-mail alternativo (opcional)" id="profile-alternate-email" type="email" value={alternateEmail} onChange={setAlternateEmail} maxLength={150} />
      </div>
    </ProfileForm>{status}
  </section>;
}

const studentFields = [
  ["registration", "Matrícula", 50], ["institution", "Instituição de ensino", 80],
  ["unit", "Unidade / campus", 150], ["course", "Curso do aluno", 150], ["period", "Período", 50],
] as const;
function StudentForm({ initial, onSaved }: { initial: Profile; onSaved: Saved }) {
  const [values, setValues] = useState(() => Object.fromEntries(studentFields.map(([key]) => [key, initial.student?.[key] ?? ""])) as Record<typeof studentFields[number][0], string>);
  const { pending, save, status } = useSave(onSaved, "Perfil de aluno salvo.");
  return <section aria-label="Perfil de aluno">
    <ProfileForm title="Perfil de aluno" description="Preencha os dados acadêmicos que deseja manter na sua conta. Todos os campos são opcionais."
      pending={pending} button="Salvar perfil de aluno" onSubmit={e => { e.preventDefault(); void save({ student: Object.fromEntries(studentFields.map(([key]) => [key, nullable(values[key])])) }); }}>
      <div className="profile-grid">{studentFields.map(([key, label, maxLength]) => <Field key={key} id={`student-${key}`}
        label={label} value={values[key]} onChange={value => setValues(old => ({ ...old, [key]: value }))} maxLength={maxLength} />)}</div>
    </ProfileForm>{status}
  </section>;
}

function TeacherForm({ initial, onSaved }: { initial: Profile; onSaved: Saved }) {
  const [rows, setRows] = useState(() => (initial.teacher?.teachings ?? []).map((row, i) => ({ ...row, key: `initial-${i}` })));
  const [validation, setValidation] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const focusAfterChange = useRef<string | null>(null);
  const { pending, save, status } = useSave(onSaved, "Perfil de professor salvo.");
  useEffect(() => {
    if (focusAfterChange.current) {
      document.getElementById(focusAfterChange.current)?.focus();
      focusAfterChange.current = null;
    }
  }, [rows]);
  function change(key: string, field: "subject" | "course", value: string) {
    setValidation(""); setRows(old => old.map(row => row.key === key ? { ...row, [field]: value } : row));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setValidation("");
    const teachings = rows.map(row => ({ subject: row.subject.trim(), course: row.course.trim() }));
    const seen = new Set<string>();
    for (const [index, row] of teachings.entries()) {
      const key = JSON.stringify([row.subject.toLocaleLowerCase("pt-BR"), row.course.toLocaleLowerCase("pt-BR")]);
      if (!row.subject || !row.course || seen.has(key)) {
        setValidation("Preencha disciplina e curso em cada linha, sem repetir a mesma associação.");
        container.current?.querySelectorAll<HTMLInputElement>('input[name^="teaching-subject-"]')[index]?.focus();
        return;
      }
      seen.add(key);
    }
    void save({ teacher: { teachings } });
  }
  return <section aria-label="Perfil de professor" ref={container}>
    <ProfileForm title="Perfil de professor" description="Associe cada disciplina ao curso em que você leciona. Uma disciplina pode aparecer em cursos diferentes."
      pending={pending} button="Salvar perfil de professor" onSubmit={submit}>
      {validation && <p className="form-error" role="alert" id="teaching-validation">{validation}</p>}
      {!rows.length && <p>Nenhuma disciplina informada.</p>}
      {rows.map((row, index) => <fieldset className="teaching-row" key={row.key} aria-describedby={validation ? "teaching-validation" : undefined}>
        <legend>Disciplina e curso {index + 1}</legend>
        <div className="profile-grid">
          <Field label={`Disciplina ${index + 1}`} id={`teaching-subject-${row.key}`} value={row.subject} onChange={value => change(row.key, "subject", value)} maxLength={150} required />
          <Field label={`Curso ${index + 1}`} id={`teaching-course-${row.key}`} value={row.course} onChange={value => change(row.key, "course", value)} maxLength={150} required />
        </div>
        <button className="text-button" type="button" aria-label={`Remover disciplina e curso ${index + 1}`} onClick={() => {
          focusAfterChange.current = "add-teaching"; setValidation(""); setRows(old => old.filter(item => item.key !== row.key));
        }}>Remover associação</button>
      </fieldset>)}
      <button id="add-teaching" className="button button-outline" type="button" disabled={rows.length >= 20} onClick={() => {
        const key = crypto.randomUUID(); focusAfterChange.current = `teaching-subject-${key}`;
        setRows(old => [...old, { subject: "", course: "", key }]);
      }}>Adicionar disciplina e curso</button>
      <p className="small">Até 20 associações. Para excluir uma associação, remova a linha e salve o perfil.</p>
    </ProfileForm>{status}
  </section>;
}
