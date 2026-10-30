"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, pages, errorMessage, type ApiResponse } from "../lib/product-client";
import type { MissionEntry } from "./live-workspace";
import { OperationStatus } from "./operation-status";

type Strategy = ApiResponse<"strategyCatalog">["items"][number];
type Plan = ApiResponse<"createStrategyPlan">;
type Student = ApiResponse<"strategyRecipients">["items"][number];

export function LiveStrategies({ entries, initialMissionId }: { entries: MissionEntry[]; initialMissionId?: string }) {
  const [missionId, setMissionId] = useState(initialMissionId ?? entries[0]?.mission.id ?? "");
  const entry = entries.find(e => e.mission.id === missionId);
  if (!entry) return <section className="paper"><h2>Escolha uma missão da sua turma</h2><p>Crie e salve uma missão para preparar seus apoios.</p><Link className="text-link" href="/professor/missoes">Consultar minhas missões</Link></section>;
  return <>
    <div className="classroom-selector"><label htmlFor="strategy-mission">Missão</label>
      <select id="strategy-mission" value={missionId} onChange={e => setMissionId(e.target.value)}>
        {entries.map(({ mission, classroom }) => <option key={mission.id} value={mission.id}>{classroom.name} · {(mission.publishedVersion ?? mission.draftVersion)?.title}</option>)}
      </select>
    </div>
    <StrategyMission key={entry.mission.id} entry={entry} />
  </>;
}

function StrategyMission({ entry }: { entry: MissionEntry }) {
  const versions = [entry.mission.publishedVersion, entry.mission.draftVersion].filter((v): v is NonNullable<typeof v> => !!v);
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const version = versions.find(v => v.id === versionId);
  if (!version) return <p className="paper">Salve uma versão da missão antes de preparar os apoios.</p>;
  return <>
    <div className="classroom-selector"><label htmlFor="strategy-version">Versão da missão</label>
      <select id="strategy-version" value={versionId} onChange={e => setVersionId(e.target.value)}>
        {versions.map(v => <option key={v.id} value={v.id}>{v.id === entry.mission.publishedVersion?.id ? "Publicada · visível aos alunos" : "Rascunho · aguarda publicação"} · {v.title}</option>)}
      </select>
    </div>
    <p className="small">Os apoios pertencem à versão selecionada. Ao criar outra versão, revise e aplique os apoios novamente.</p>
    <StrategyForm key={versionId} entry={entry} version={version} />
  </>;
}

function StrategyForm({ entry, version }: { entry: MissionEntry; version: NonNullable<MissionEntry["mission"]["publishedVersion"]> }) {
  const [catalog, setCatalog] = useState<Strategy[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [contents, setContents] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [stepId, setStepId] = useState("");
  const [audience, setAudience] = useState<"classroom" | "students">("classroom");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const requestKey = useRef<string | null>(null);
  const formTitle = useRef<HTMLHeadingElement>(null);
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const params = { id: entry.mission.id };
  useEffect(() => {
    let active = true; setLoading(true); setLoadError("");
    void Promise.all([api("strategyCatalog"), pages("strategyRecipients", entry.mission.id), api("strategyPlans", { params: { id: entry.mission.id }, query: { versionId: version.id } })])
      .then(([strategies, recipients, applications]) => { if (active) { setCatalog(strategies.items); setStudents(recipients); setPlans(applications.items); } })
      .catch(reason => { if (active) setLoadError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entry.mission.id, version.id, attempt]);
  useEffect(() => { if (preview) previewTitle.current?.focus(); }, [preview]);
  function change() { setReviewed(false); setPreview(false); setMessage(""); setFailed(false); requestKey.current = null; }
  function reset() { setSelected([]); setContents({}); setEditing(null); setStudentIds([]); setAudience("classroom"); setStepId(""); setReviewed(false); setPreview(false); requestKey.current = null; }
  function validate() {
    if (!selected.length || selected.some(id => !contents[id]?.trim()) || (audience === "students" && (!studentIds.length || studentIds.some(id => !students.some(s => s.id === id))))) {
      setFailed(true); setMessage("Selecione estratégias, preencha seus textos e confira os alunos destinatários."); return false;
    }
    return true;
  }
  async function save() {
    if (pending || !validate()) return;
    if (!reviewed) { setFailed(true); setMessage("Revise os apoios e confirme antes de salvar."); return; }
    setPending(true); setMessage(""); setFailed(false);
    const input = { versionId: version.id, stepId: stepId || null, audience, studentIds: audience === "students" ? studentIds : [],
      items: selected.map(strategyId => ({ strategyId: strategyId as Strategy["id"], content: contents[strategyId].trim() })), reviewed: true as const };
    try {
      const saved = editing ? await api("updateStrategyPlan", { params: { ...params, planId: editing.id }, body: { ...input, expectedRevision: editing.revision } })
        : await api("createStrategyPlan", { params, body: { ...input, requestKey: requestKey.current ??= crypto.randomUUID() } });
      setPlans(old => [...old.filter(p => p.id !== saved.id), saved]); reset();
      setMessage(version.id === entry.mission.publishedVersion?.id ? "Apoios salvos e disponíveis aos destinatários selecionados." : "Apoios salvos no rascunho. Ficarão disponíveis após publicar esta versão.");
    } catch (reason) { setFailed(true); setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  async function remove(plan: Plan) {
    if (!window.confirm("Remover esta aplicação de estratégias? Os demais apoios e as atividades dos alunos serão preservados.")) return;
    setPending(true); setMessage(""); setFailed(false);
    try { await api("removeStrategyPlan", { params: { ...params, planId: plan.id }, body: { expectedRevision: plan.revision } });
      setPlans(old => old.filter(p => p.id !== plan.id)); if (editing?.id === plan.id) reset(); setMessage("Aplicação removida.");
    } catch (reason) { setFailed(true); setMessage(errorMessage(reason)); }
    finally { setPending(false); }
  }
  if (loading) return <p role="status">Carregando estratégias, destinatários e aplicações…</p>;
  if (loadError) return <section className="paper"><p role="alert">{loadError}</p><button className="button" onClick={() => setAttempt(n => n + 1)}>Tentar carregar estratégias novamente</button></section>;
  const categories = [...new Set(catalog.map(s => s.category))];
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = catalog.filter(s => (!category || s.category === category) && normalize(`${s.title} ${s.description}`).includes(normalize(search)));
  const chosen = selected.map(id => catalog.find(s => s.id === id)).filter((s): s is Strategy => !!s);
  const archived = entry.mission.status === "archived";
  return <>
    <p className="small">Os apoios são opcionais e não alteram os objetivos ou critérios de avaliação. Prepare o conteúdo para esta atividade, sem exigir diagnóstico.</p>
    {archived && <p className="demo-banner">Missão arquivada: aplicações disponíveis apenas para consulta.</p>}
    <form onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset className="strategy-fields" disabled={pending || archived}>
        <legend className="sr-only">Preparar estratégias pedagógicas</legend>
        <div className="strategy-layout">
          <section aria-label="Biblioteca de estratégias">
            <h2 ref={formTitle} tabIndex={-1}>{editing ? "Editar aplicação" : "Escolha os apoios da missão"}</h2>
            <div className="form-stack profile-grid">
              <div className="form-stack"><label htmlFor="strategy-search">Buscar estratégia</label><input id="strategy-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ex.: exemplo, checklist" /></div>
              <div className="form-stack"><label htmlFor="strategy-category">Barreira / tipo de apoio</label><select id="strategy-category" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todos os tipos de apoio</option>{categories.map(value => <option key={value}>{value}</option>)}</select></div>
            </div>
            <p className="small">{filtered.length} estratégias encontradas · {selected.length} selecionadas</p>
            <div className="strategy-catalog">
              {filtered.map(s => <article className={`paper strategy-card${selected.includes(s.id) ? " strategy-selected" : ""}`} key={s.id}>
                <label className="check"><input type="checkbox" checked={selected.includes(s.id)} onChange={e => { change(); setSelected(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id)); }} /><strong>{s.title}</strong></label>
                <span className="small">{s.category}</span><p>{s.description}</p><details><summary>Orientação e exemplo ilustrativo</summary><p>{s.guidance}</p><p className="submission-content">{s.example}</p></details>
              </article>)}
            </div>
            {!filtered.length && <p>Nenhuma estratégia corresponde a essa busca. Ajuste os filtros.</p>}
            {!!chosen.length && <section className="paper form-stack strategy-content" aria-label="Conteúdo dos apoios">
              <h3>Prepare o conteúdo para os alunos</h3>
              {chosen.map(s => <div key={s.id} className="form-stack"><label htmlFor={`support-${s.id}`}>Texto do apoio: {s.title}</label><textarea id={`support-${s.id}`} maxLength={3000} required value={contents[s.id] ?? ""} onChange={e => { const value = e.target.value; change(); setContents(old => ({ ...old, [s.id]: value })); }} />
                <p className="small">{s.guidance}</p><button type="button" className="text-button" onClick={() => { change(); setContents(old => ({ ...old, [s.id]: s.example })); }}>Usar exemplo ilustrativo de {s.title}</button>
              </div>)}
            </section>}
          </section>
          <aside className="paper form-stack strategy-destination" aria-label="Configuração da aplicação">
            <h2>Aplicar estratégias</h2>
            <p>{chosen.length} {chosen.length === 1 ? "apoio selecionado" : "apoios selecionados"}</p>
            <label htmlFor="strategy-step">Onde disponibilizar</label><select id="strategy-step" value={stepId} onChange={e => { change(); setStepId(e.target.value); }}><option value="">Na missão inteira</option>{version.steps.map(s => <option key={s.id} value={s.id}>Etapa {s.position} · {s.title}</option>)}</select>
            <fieldset className="strategy-fields"><legend>Destinatários</legend>
              <label className="check"><input type="radio" name="support-audience" checked={audience === "classroom"} onChange={() => { change(); setAudience("classroom"); }} />Turma inteira</label>
              <label className="check"><input type="radio" name="support-audience" checked={audience === "students"} onChange={() => { change(); setAudience("students"); }} />Alunos selecionados</label>
            </fieldset>
            {audience === "students" && <fieldset className="strategy-fields"><legend>Alunos com vínculo ativo</legend>
              {!students.length && <p>Esta turma ainda não tem alunos com vínculo ativo.</p>}
              {students.map(s => <label className="check" key={s.id}><input type="checkbox" checked={studentIds.includes(s.id)} disabled={studentIds.length >= 50 && !studentIds.includes(s.id)} onChange={e => { change(); setStudentIds(old => e.target.checked ? [...old, s.id] : old.filter(id => id !== s.id)); }} />{s.name}</label>)}
              <p className="small">Até 50 alunos por aplicação. Os apoios individuais aparecem somente para os destinatários e docentes autorizados.</p>
              {studentIds.some(id => !students.some(s => s.id === id)) && <p role="alert">Há um destinatário sem vínculo ativo. <button className="text-button" type="button" onClick={() => { change(); setStudentIds(old => old.filter(id => students.some(s => s.id === id))); }}>Retirar destinatários inativos</button></p>}
            </fieldset>}
            {audience === "classroom" && <p className="small">Disponível aos alunos com vínculo ativo, incluindo quem entrar na turma depois.</p>}
            <button type="button" className="button button-outline" disabled={!chosen.length} onClick={() => { if (validate()) setPreview(true); }}>Ver prévia do aluno</button>
            <label className="check"><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); }} />Revisei os textos, o destino e os destinatários dos apoios.</label>
            <button className="button" disabled={!chosen.length || !reviewed}>{pending ? "Salvando…" : editing ? "Salvar alterações dos apoios" : "Salvar apoios"}</button>
            {editing && <button type="button" className="text-button" onClick={reset}>Cancelar edição</button>}
          </aside>
        </div>
      </fieldset>
    </form>
    <OperationStatus message={message} error={failed} />
    {preview && <section className="paper strategy-preview" aria-label="Prévia do aluno"><h2 ref={previewTitle} tabIndex={-1}>Prévia dos apoios para o aluno</h2><p>{stepId ? version.steps.find(s => s.id === stepId)?.title : "Apoios disponíveis em todas as etapas desta missão"}</p>{chosen.map(s => <details className="example" key={s.id}><summary>{s.title}</summary><p className="submission-content">{contents[s.id]}</p></details>)}<p className="small">Esta prévia não salva nem publica os apoios.</p></section>}
    <section className="strategy-saved" aria-label="Aplicações salvas"><h2>Aplicações nesta versão</h2>{!plans.length && <p>Nenhuma aplicação salva nesta versão.</p>}
      {plans.map(plan => <article className="paper" key={plan.id}><h3>{plan.stepId ? `Etapa · ${version.steps.find(s => s.id === plan.stepId)?.title}` : "Missão inteira"}</h3><p>{plan.audience === "classroom" ? "Turma inteira" : `Alunos selecionados: ${plan.recipients.map(s => s.name).join(", ")}`}</p>
        {plan.items.map(item => <details key={item.id}><summary>{item.title}</summary><p className="submission-content">{item.content}</p></details>)}
        <div className="actions"><button className="button button-outline" disabled={pending || archived} onClick={() => {
          setEditing(plan); setSelected(plan.items.map(i => i.strategyId)); setContents(Object.fromEntries(plan.items.map(i => [i.strategyId, i.content])));
          setStepId(plan.stepId ?? ""); setAudience(plan.audience); setStudentIds(plan.recipients.map(s => s.id)); change(); formTitle.current?.focus();
        }}>Editar aplicação</button><button className="text-button" disabled={pending || archived} onClick={() => void remove(plan)}>Remover aplicação</button></div>
      </article>)}
    </section>
  </>;
}
