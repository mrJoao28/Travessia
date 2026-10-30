"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TeacherSteps, useTeacherDraftGuard } from "./teacher-steps";
import { OperationStatus } from "./operation-status";
import {
  api,
  errorMessage,
  type ApiBody,
  type ApiResponse,
} from "../lib/product-client";

type Input = ApiBody<"createMission">;
type Version = NonNullable<ApiResponse<"mission">["draftVersion"]>;
function editable(version: Version): Input {
  return {
    title: version.title,
    description: version.description,
    objectives: version.objectives,
    criteria: version.criteria,
    dueAt: version.dueAt,
    steps: version.steps.map((step) => ({
      title: step.title,
      instructions: step.instructions,
      example: step.example,
    })),
    materials: version.materials.map((material) => ({
      title: material.title,
      text: material.text,
    })),
  };
}
const empty: Input = {
  title: "",
  description: "",
  objectives: [""],
  criteria: [""],
  dueAt: null,
  steps: [{ title: "", instructions: "", example: "" }],
  materials: [],
};

export function LiveEditor({
  id,
  classroomId,
}: {
  id?: string;
  classroomId?: string;
}) {
  const [stage, setStage] = useState(0);
  const [published, setPublished] = useState(false);
  const stageTitle = useRef<HTMLHeadingElement>(null);
  const invalidField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (invalidField.current) { invalidField.current.focus(); invalidField.current.reportValidity(); invalidField.current = null; }
    else stageTitle.current?.focus();
  }, [stage]);
  const [mission, setMission] = useState<ApiResponse<"mission"> | null>(null);
  const [input, setInput] = useState<Input>(empty);
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  useEffect(() => {
    if (review) document.getElementById("publish-review")?.focus();
  }, [review]);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [generation, setGeneration] = useState<ApiResponse<"generate"> | null>(
    null,
  );
  const generationKey = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [stepKeys, setStepKeys] = useState<number[]>([1]);
  const nextKey = useRef(2);
  function adopt(value: ApiResponse<"mission">) {
    setMission(value);
    const version = value.draftVersion ?? value.publishedVersion;
    if (version) {
      setInput(editable(version));
      setStepKeys(version.steps.map(() => nextKey.current++));
    }
    setDirty(false);
    setReview(null);
    setConfirmed(false);
    setSelectedMaterials([]);
    setApproved(false);
    generationKey.current = null;
  }
  useEffect(() => {
    let active = true;
    if (id)
      api("mission", { params: { id } })
        .then((value) => {
          if (active) adopt(value);
        })
        .catch((reason) => {
          if (active) setLoadError(errorMessage(reason));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [id]);
  useTeacherDraftGuard(dirty);
  function change(next: Input) {
    setInput(next);
    setDirty(true);
    setReview(null);
    setConfirmed(false);
    setMessage("");
  }
  function validate(onlyStage?: number) {
    for (const [fieldId, lines] of [["editor-objectives", input.objectives], ["editor-criteria", input.criteria]] as const) {
      const field = document.getElementById(fieldId) as HTMLTextAreaElement | null;
      field?.setCustomValidity(lines.length > 10 || lines.some(line => !line.trim() || line.trim().length > 200) ? "Use de 1 a 10 linhas preenchidas, com até 200 caracteres em cada linha." : "");
    }
    const selector = onlyStage === undefined ? 'input, textarea' : `[data-editor-stage="${onlyStage}"] input, [data-editor-stage="${onlyStage}"] textarea`;
    const fields = Array.from(form.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector) ?? []);
    const invalid = fields.find(field => !field.checkValidity());
    if (!invalid) return true;
    const targetStage = Number(invalid.closest<HTMLElement>('[data-editor-stage]')?.dataset.editorStage ?? 0);
    if (targetStage !== stage) { invalidField.current = invalid; setStage(targetStage); }
    else { invalid.focus(); invalid.reportValidity(); }
    return false;
  }
  async function save(forReview = false, nextStage?: number) {
    for (const [fieldId, lines] of [
      ["editor-objectives", input.objectives],
      ["editor-criteria", input.criteria],
    ] as const) {
      const field = document.getElementById(
        fieldId,
      ) as HTMLTextAreaElement | null;
      field?.setCustomValidity(
        lines.length > 10 ||
          lines.some((line) => !line.trim() || line.trim().length > 200)
          ? "Use de 1 a 10 linhas preenchidas, com até 200 caracteres em cada linha."
          : "",
      );
    }
    if (!validate() || pending) return;
    if (!dirty && mission?.draftVersion) {
      if (forReview) setReview(mission.draftVersion.id);
      if (nextStage !== undefined) setStage(nextStage);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const value = mission
        ? await api("editMission", {
            params: { id: mission.id },
            body: {
              ...input,
              expectedDraftVersionId: mission.draftVersion?.id ?? null,
            },
          })
        : await api("createMission", {
            params: { id: classroomId ?? "" },
            body: input,
          });
      adopt(value);
      setMessage("Rascunho salvo no servidor. Ainda não publicado.");
      if (!id)
        window.history.replaceState(
          null,
          "",
          `/professor/missoes/${value.id}/editar`,
        );
      if (nextStage !== undefined) setStage(nextStage);
      if (forReview && value.draftVersion) {
        setReview(value.draftVersion.id);
      }
    } catch (reason) {
      setMessage(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }
  async function checkGeneration(g: ApiResponse<"generate">) {
    if (!mission) return;
    if (g.status === "succeeded") {
      const value = await api("mission", { params: { id: mission.id } });
      if (value.draftVersion?.id !== g.outputVersionId)
        throw new Error(
          "O rascunho mudou. Consulte a versão atual antes de substituir o editor.",
        );
      adopt(value);
      setStage(1);
      setMessage(
        "Rascunho Gemini carregado do servidor. Revise todo o conteúdo antes de publicar.",
      );
    } else if (g.status === "running")
      setMessage(
        "A geração ainda está em andamento. Consulte o estado antes de solicitar novamente.",
      );
    else
      setMessage(
        "A geração não foi concluída. Seu planejamento manual continua disponível.",
      );
  }
  if (loading) return <p role="status">Abrindo rascunho…</p>;
  if (loadError)
    return (
      <p className="paper" role="alert">
        {loadError}
      </p>
    );
  if (published && mission) return <section className="paper teacher-success"><p className="eyebrow">Missão publicada</p><h1>Pronto para sua turma!</h1><p role="status">Missão publicada pelo servidor e disponível para a turma.</p><p>Agora você pode preparar apoios ou acompanhar as entregas.</p><div className="actions"><Link className="button" href={`/professor/missoes/${mission.id}/apoios`}>Preparar apoios desta missão</Link><Link className="text-link" href="/professor/entregas">Acompanhar entregas</Link></div></section>;
  const storedVersion = mission?.draftVersion ?? mission?.publishedVersion;
  return (
    <div className="teacher-guide">
      <header className="teacher-guide-heading"><Link className="text-link" href="/professor/missoes">← Minhas missões</Link><h1>Vamos preparar sua missão</h1><p>Um passo de cada vez. Você revisa antes de publicar.</p></header>
      <TeacherSteps labels={["Sobre a missão", "Etapas e materiais", "Apoios", "Revisão"]} current={stage} disabled={pending} onBack={value => { setConfirmed(false); setReview(null); setStage(value); }} />
      <div className="teacher-guide-grid"><section className="paper teacher-editor-panel">
        <h2 ref={stageTitle} tabIndex={-1} id="editor-stage-title">{["O que a turma vai aprender?", "Como o aluno vai realizar a atividade?", "Quer oferecer alguma ajuda?", "Confira antes de publicar"][stage]}</h2>
        <p className="muted">{["Dê um nome à missão e explique o que será aprendido e avaliado.", "Divida o trabalho em ações claras. Acrescente os materiais que o aluno vai consultar.", "Os apoios são opcionais. Você pode prepará-los agora ou depois da publicação.", "Confira o conteúdo completo. Só você pode autorizar a publicação."][stage]}</p>
        {storedVersion?.source === "demo_fixture" && (
          <p className="notice">
            Rascunho fictício pré-criado para a demonstração, sem geração
            Gemini.
          </p>
        )}
        {storedVersion?.source === "gemini" && (
          <p className="notice">
            Rascunho com assistência Gemini. Revise conteúdo e adequação
            pedagógica.
          </p>
        )}
        <form
          className="form-stack"
          noValidate
          ref={form}
          onChange={(event) => {
            const target = event.target;
            if (
              target instanceof HTMLInputElement ||
              target instanceof HTMLTextAreaElement
            )
              target.setCustomValidity("");
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (stage === 0) { if (validate(0)) setStage(1); } else void save(false, 2);
          }}
        >
          <fieldset className="editor-fields" disabled={pending || mission?.status === "archived"}>
            <div className="form-stack" data-editor-stage="0" hidden={stage !== 0}>
              <label htmlFor="editor-title">
                Título da missão
                <input
                  placeholder="Ex.: Comparar soluções de acesso à informação"
                  id="editor-title"
                  required
                  maxLength={200}
                  value={input.title}
                  onChange={(e) => change({ ...input, title: e.target.value })}
                />
              </label>
              <label htmlFor="editor-description">
                Descrição
                <textarea
                  id="editor-description"
                  required
                  maxLength={6000}
                  value={input.description}
                  onChange={(e) =>
                    change({ ...input, description: e.target.value })
                  }
                />
              </label>
              <label htmlFor="editor-objectives">
                Objetivos de aprendizagem · um por linha
                <textarea
                  id="editor-objectives"
                  required
                  value={input.objectives.join("\n")}
                  onChange={(e) =>
                    change({ ...input, objectives: e.target.value.split("\n") })
                  }
                  aria-describedby="line-limits"
                />
              </label>
              <label htmlFor="editor-criteria">
                Critérios de avaliação · um por linha
                <textarea
                  id="editor-criteria"
                  required
                  value={input.criteria.join("\n")}
                  onChange={(e) =>
                    change({ ...input, criteria: e.target.value.split("\n") })
                  }
                />
              </label>
              <p className="small" id="line-limits">
                De 1 a 10 objetivos e critérios; até 200 caracteres por linha.
                Não inclua linhas vazias.
              </p>
              <details className="teacher-disclosure"><summary>Data de entrega (opcional)</summary>
              <label htmlFor="editor-due">
                Data prevista de entrega · opcional
                <input
                  id="editor-due"
                  type="date"
                  value={input.dueAt?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    change({
                      ...input,
                      dueAt: e.target.value
                        ? `${e.target.value}T23:59:00.000Z`
                        : null,
                    })
                  }
                />
              </label>
              </details>
            </div>
            <div className="form-stack" data-editor-stage="1" hidden={stage !== 1}>
              <h3>Etapas</h3>
              {input.steps.map((step, index) => (
                <fieldset className="editor-step" key={stepKeys[index]}>
                  <legend>Etapa {index + 1}</legend>
                  <div className="form-stack">
                    <label htmlFor={`live-step-${stepKeys[index]}`}>
                      Título da etapa
                      <input
                        id={`live-step-${stepKeys[index]}`}
                        required
                        maxLength={200}
                        value={step.title}
                        onChange={(e) =>
                          change({
                            ...input,
                            steps: input.steps.map((s, i) =>
                              i === index ? { ...s, title: e.target.value } : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label htmlFor={`live-instruction-${index}`}>
                      Instrução
                      <textarea
                        id={`live-instruction-${index}`}
                        required
                        maxLength={6000}
                        value={step.instructions}
                        onChange={(e) =>
                          change({
                            ...input,
                            steps: input.steps.map((s, i) =>
                              i === index
                                ? { ...s, instructions: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label htmlFor={`live-example-${index}`}>
                      Exemplo de apoio
                      <textarea
                        id={`live-example-${index}`}
                        required
                        maxLength={6000}
                        value={step.example}
                        onChange={(e) =>
                          change({
                            ...input,
                            steps: input.steps.map((s, i) =>
                              i === index
                                ? { ...s, example: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="actions">
                    {([-1, 1] as const).map((direction) => (
                      <button
                        className="button button-outline"
                        type="button"
                        key={direction}
                        disabled={
                          index + direction < 0 ||
                          index + direction >= input.steps.length
                        }
                        aria-label={`Mover etapa ${index + 1} para ${direction === -1 ? "cima" : "baixo"}`}
                        onClick={() => {
                          const steps = [...input.steps];
                          const key = stepKeys[index];
                          [steps[index], steps[index + direction]] = [
                            steps[index + direction],
                            steps[index],
                          ];
                          const reorderedKeys = [...stepKeys];
                          [
                            reorderedKeys[index],
                            reorderedKeys[index + direction],
                          ] = [
                            reorderedKeys[index + direction],
                            reorderedKeys[index],
                          ];
                          setStepKeys(reorderedKeys);
                          change({ ...input, steps });
                          setMessage(
                            `Etapa movida para a posição ${index + direction + 1}. Ainda não salva.`,
                          );
                          requestAnimationFrame(() =>
                            document
                              .getElementById(`live-step-${key}`)
                              ?.focus(),
                          );
                        }}
                      >
                        {direction === -1 ? "↑ Subir" : "↓ Descer"}
                      </button>
                    ))}
                    <button
                      className="text-button"
                      type="button"
                      disabled={input.steps.length === 1}
                      onClick={() => {
                        setStepKeys((all) => all.filter((_, i) => i !== index));
                        change({
                          ...input,
                          steps: input.steps.filter((_, i) => i !== index),
                        });
                        requestAnimationFrame(() =>
                          document.getElementById("live-add-step")?.focus(),
                        );
                      }}
                    >
                      Remover etapa {index + 1}
                    </button>
                  </div>
                </fieldset>
              ))}
              <button
                id="live-add-step"
                className="button button-outline"
                type="button"
                disabled={input.steps.length >= 10}
                onClick={() => {
                  const key = nextKey.current++;
                  setStepKeys((all) => [...all, key]);
                  change({
                    ...input,
                    steps: [
                      ...input.steps,
                      { title: "", instructions: "", example: "" },
                    ],
                  });
                  requestAnimationFrame(() =>
                    document.getElementById(`live-step-${key}`)?.focus(),
                  );
                }}
              >
                Adicionar etapa
              </button>
              <h3>Materiais didáticos em texto</h3>
              {input.materials.map((material, index) => (
                <fieldset key={index} className="editor-step">
                  <legend>Material {index + 1}</legend>
                  <div className="form-stack">
                    <label htmlFor={`material-title-${index}`}>
                      Título do material
                      <input
                        id={`material-title-${index}`}
                        required
                        maxLength={200}
                        value={material.title}
                        onChange={(e) =>
                          change({
                            ...input,
                            materials: input.materials.map((m, i) =>
                              i === index ? { ...m, title: e.target.value } : m,
                            ),
                          })
                        }
                      />
                    </label>
                    <label htmlFor={`material-text-${index}`}>
                      Texto do material
                      <textarea
                        id={`material-text-${index}`}
                        required
                        maxLength={6000}
                        value={material.text}
                        onChange={(e) =>
                          change({
                            ...input,
                            materials: input.materials.map((m, i) =>
                              i === index ? { ...m, text: e.target.value } : m,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      change({
                        ...input,
                        materials: input.materials.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Remover material {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                className="button button-outline"
                type="button"
                disabled={input.materials.length >= 10}
                onClick={() =>
                  change({
                    ...input,
                    materials: [...input.materials, { title: "", text: "" }],
                  })
                }
              >
                Adicionar material textual
              </button>
              <p className="small">
                Uploads permanecem desativados. Disponibilize conteúdo textual
                verificável.
              </p>
            </div>
          </fieldset>
        </form>
        {stage === 3 && review && mission?.draftVersion && (
          <section className="notice" style={{ marginTop: "1rem" }}>
            <h3 id="publish-review" tabIndex={-1}>
              Revisão antes de publicar
            </h3>
            <p>
              <strong>{input.title}</strong>
            </p>
            <p>{input.description}</p>
            <h4>Objetivos</h4>
            <ul>
              {input.objectives.map((value, i) => (
                <li key={i}>{value}</li>
              ))}
            </ul>
            <h4>Critérios</h4>
            <ul>
              {input.criteria.map((value, i) => (
                <li key={i}>{value}</li>
              ))}
            </ul>
            <ol>
              {input.steps.map((step, i) => (
                <li key={i}>
                  <strong>{step.title}</strong>
                  <p>{step.instructions}</p>
                  <p>Exemplo: {step.example}</p>
                </li>
              ))}
            </ol>
            <p>
              A publicação disponibiliza esta versão aos alunos da turma.
            </p>
            <h4>Materiais</h4>{input.materials.map((m, i) => <details className="example" key={i}><summary>{m.title}</summary><p className="submission-content">{m.text}</p></details>)}
            <label className="check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Revisei objetivos, critérios, etapas e materiais.
            </label>
            <button
              className="button"
              disabled={pending || !confirmed || dirty}
              onClick={async () => {
                setPending(true);
                setMessage("");
                try {
                  const value = await api("publish", {
                    params: { id: mission.id },
                    body: { versionId: review, reviewed: true },
                  });
                  adopt(value);
                  setPublished(true);
                  setMessage(
                    "Missão publicada pelo servidor e disponível para a turma.",
                  );
                } catch (reason) {
                  setMessage(errorMessage(reason));
                } finally {
                  setPending(false);
                }
              }}
            >
              Publicar missão
            </button>
          </section>
        )}
        {stage === 2 && <div className="form-stack">
          <div className="notice"><h3>Apoios para esta missão</h3><p>Adapte as instruções e os formatos de entrega, ou prepare exemplos e checklists. O objetivo avaliado é mantido.</p>{mission && <div className="teacher-support-links"><Link className="text-link" href={`/professor/missoes/${mission.id}/adaptacoes?versao=${storedVersion?.id}`}>Adaptar a atividade para a turma ou um aluno</Link><Link className="text-link" href={`/professor/missoes/${mission.id}/estrategias?versao=${storedVersion?.id}`}>Preparar exemplos, checklists e outros apoios</Link></div>}<p className="small">Se alterar a missão e criar outra versão depois, será necessário revisar os apoios dessa nova versão.</p></div>
          <details className="teacher-ai"><summary>Pedir ajuda à IA para escrever a missão (opcional)</summary>
        <h2>Assistência Gemini</h2>
        <p>
          Selecione até 3 materiais didáticos já salvos. Somente esses textos e
          os objetivos salvos serão enviados ao provedor.
        </p>
        {(!storedVersion?.materials.length || dirty) && (
          <p className="notice">
            Salve o rascunho e seus materiais antes de solicitar a assistência.
            Você pode continuar manualmente.
          </p>
        )}
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending || !mission || dirty || !selectedMaterials.length)
              return;
            setPending(true);
            setMessage("");
            generationKey.current ??= crypto.randomUUID();
            try {
              const result = await api("generate", {
                params: { id: mission.id },
                body: {
                  materialIds: selectedMaterials,
                  objectives: input.objectives.slice(0, 5),
                  approvedForProvider: true,
                  idempotencyKey: generationKey.current,
                },
              });
              setGeneration(result);
              await checkGeneration(result);
            } catch (reason) {
              setMessage(errorMessage(reason));
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset
            className="editor-fields"
            disabled={pending || dirty || !mission}
          >
            <legend>Materiais que serão enviados</legend>
            {storedVersion?.materials.map((material) => (
              <label className="check" key={material.id}>
                <input
                  type="checkbox"
                  checked={selectedMaterials.includes(material.id)}
                  disabled={
                    !selectedMaterials.includes(material.id) &&
                    selectedMaterials.length >= 3
                  }
                  onChange={(e) => {
                    setSelectedMaterials((all) =>
                      e.target.checked
                        ? [...all, material.id]
                        : all.filter((value) => value !== material.id),
                    );
                    setApproved(false);
                    generationKey.current = null;
                  }}
                />
                {material.title}
              </label>
            ))}
          </fieldset>
          {selectedMaterials.map((materialId) => {
            const material = storedVersion?.materials.find(
              (m) => m.id === materialId,
            );
            return (
              material && (
                <details key={materialId}>
                  <summary>Revisar: {material.title}</summary>
                  <p className="submission-content">{material.text}</p>
                </details>
              )
            );
          })}
          <p className="small">
            Não inclua nomes, entregas, conversas, preferências pessoais ou
            relatos de barreira. Os primeiros 5 objetivos salvos compõem a
            solicitação.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              required
            />
            Revisei os textos selecionados e autorizo seu envio ao provedor.
          </label>
          <button
            className="button button-outline"
            disabled={
              pending ||
              dirty ||
              !mission ||
              !selectedMaterials.length ||
              !approved
            }
          >
            {pending ? "Aguarde a resposta…" : "Solicitar rascunho"}
          </button>
        </form>
        {generation && (
          <button
            className="text-button"
            disabled={pending || dirty}
            onClick={async () => {
              setPending(true);
              try {
                const value = await api("generation", {
                  params: { id: generation.id },
                });
                setGeneration(value);
                await checkGeneration(value);
              } catch (reason) {
                setMessage(errorMessage(reason));
              } finally {
                setPending(false);
              }
            }}
          >
            Consultar estado da geração
          </button>
        )}
        <p className="small">
          Se o serviço estiver desativado, sem cota ou indisponível, o
          planejamento manual continua disponível. Não há publicação nem nota
          automática.
        </p>
          </details>
        </div>}
        <OperationStatus message={message} />
        <p className="small">
          {dirty
            ? "Há alterações ainda não salvas."
            : mission
              ? "Versão carregada do servidor."
              : "Este rascunho ainda não foi criado no servidor."}
        </p>
      </section>
      <aside className="teacher-guidance paper"><h2>{stage === 0 ? "Uma boa missão tem" : "Você está no controle"}</h2><ul><li>Um objetivo claro</li><li>Uma ação possível</li><li>Critérios compreensíveis</li></ul><p>O aluno verá as instruções e os critérios antes de começar.</p><p className="small">{mission ? "Rascunho salvo no servidor. Alterações precisam ser salvas novamente." : "Seu texto permanece nesta tela. O primeiro salvamento acontece depois de preencher as etapas."}</p></aside></div>
      <footer className="teacher-guide-footer"><div>{stage > 0 && <button type="button" className="text-button" disabled={pending} onClick={() => { setConfirmed(false); setStage(stage - 1); }}>← Voltar</button>}<span className="small">Etapa {stage + 1} de 4</span></div><div className="actions">{stage > 0 && stage < 3 && <button type="button" className="text-button" disabled={pending} onClick={() => void save()}>Salvar rascunho</button>}{stage < 3 && <button type="button" className="button" disabled={pending || mission?.status === "archived"} onClick={() => { if (stage === 0) { if (validate(0)) setStage(1); } else void save(stage === 2, stage + 1); }}>{pending ? "Salvando…" : ["Continuar para as etapas →", "Salvar e continuar →", "Salvar e revisar"][stage]}</button>}</div></footer>
    </div>
  );
}
