"use client";

import { useEffect, useId, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";
import { sortStudentsByName } from "../lib/student-sorting";

type Period = ApiResponse<"gradePeriods">["items"][number];
type Entry = { mission: ApiResponse<"mission"> };

const EXAMPLE_LABELS = ["Avaliação 1", "Prova 1", "AP1", "AP2"] as const;

function formatFormula(formula: Period["formula"]): string {
  switch (formula) {
    case "weighted_average":
      return "Média ponderada";
    case "simple_average":
      return "Média aritmética";
    case "sum":
      return "Soma de pontos";
    default:
      return "Média ponderada";
  }
}

function formatGrade(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2).replace(".", ",");
}

export function GradebookManager({
  classroomId,
  entries,
}: {
  classroomId: string;
  entries: Entry[];
}) {
  const disclosureHintId = useId();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [name, setName] = useState("");
  const [active, setActive] = useState<ApiResponse<"gradebook"> | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [statusType, setStatusType] = useState<"info" | "error">("info");

  // Per-card state for associating activities
  const [selectedMissions, setSelectedMissions] = useState<Record<string, string>>({});
  const [weights, setWeights] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    void api("gradePeriods", { params: { id: classroomId } })
      .then((value) => {
        if (live) setPeriods(value.items);
      })
      .catch((reason) => {
        if (live) {
          setMessage(errorMessage(reason));
          setStatusType("error");
        }
      });
    return () => {
      live = false;
    };
  }, [classroomId]);

  async function createPeriod() {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setMessage("");
    try {
      const period = await api("createGradePeriod", {
        params: { id: classroomId },
        body: { name: trimmed, startsAt: null, endsAt: null },
      });
      setPeriods((all) => [...all, period]);
      setName("");
      setMessage(`Avaliação "${period.name}" criada com sucesso. Agora associe as atividades que compõem a nota.`);
      setStatusType("info");
    } catch (reason) {
      setMessage(errorMessage(reason));
      setStatusType("error");
    } finally {
      setPending(false);
    }
  }

  async function addAssessment(period: Period) {
    const missionId = selectedMissions[period.id];
    const weightVal = Number(weights[period.id] || "1");
    if (!missionId || pending) return;

    setPending(true);
    setMessage("");
    try {
      const assessment = await api("addGradeAssessment", {
        params: { id: period.id },
        body: { missionId, weight: weightVal > 0 ? weightVal : 1 },
      });
      setPeriods((all) =>
        all.map((item) =>
          item.id === period.id
            ? { ...item, assessments: [...item.assessments, assessment] }
            : item
        )
      );
      // Reset selection for this card
      setSelectedMissions((prev) => ({ ...prev, [period.id]: "" }));
      setWeights((prev) => ({ ...prev, [period.id]: "1" }));
      setMessage(`Atividade "${assessment.title}" associada à avaliação "${period.name}" com peso ${assessment.weight}.`);
      setStatusType("info");

      // If active gradebook is for this period, refresh it
      if (active?.period.id === period.id) {
        const refreshed = await api("gradebook", { params: { id: period.id } });
        setActive(refreshed);
      }
    } catch (reason) {
      setMessage(errorMessage(reason));
      setStatusType("error");
    } finally {
      setPending(false);
    }
  }

  async function toggleGradebook(period: Period) {
    if (active?.period.id === period.id) {
      setActive(null);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const data = await api("gradebook", { params: { id: period.id } });
      setActive(data);
    } catch (reason) {
      setMessage(errorMessage(reason));
      setStatusType("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="paper action-disclosure teacher-disclosure gradebook-disclosure">
      <summary aria-label="Avaliações e notas" aria-describedby={disclosureHintId}><span className="teacher-disclosure-title">Avaliações e notas</span><span id={disclosureHintId} className="teacher-disclosure-hint">Organize períodos e consulte resultados</span><span className="disclosure-action-hint" aria-hidden="true"><span className="disclosure-closed-hint">Abrir</span><span className="disclosure-open-hint">Recolher</span></span></summary>
      <div className="form-stack gradebook-content">
        <div className="gradebook-intro">
          <p>
            Defina as avaliações da disciplina (como <strong>Avaliação 1</strong>, <strong>Prova 1</strong>, <strong>AP1</strong>, <strong>AP2</strong>) e escolha quais atividades compõem a nota com seus respectivos pesos. As notas são atribuídas pelo professor; nenhuma nota é calculada pela IA.
          </p>
        </div>

        {/* Status / feedback announcement */}
        {message && (
          <div
            role={statusType === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`gradebook-status ${statusType === "error" ? "error" : "success"}`}
          >
            {message}
          </div>
        )}

        {/* Compact creation card */}
        <section
          className="grade-creation-card"
          aria-labelledby="grade-creation-title"
        >
          <div className="grade-creation-header">
            <h3 id="grade-creation-title" className="grade-creation-title">
              Criar avaliação ou prova
            </h3>
            <span className="small muted">
              Ex.: Avaliação 1, Prova 1, AP1, AP2
            </span>
          </div>

          <div className="grade-creation-row">
            <label htmlFor="grade-period-name" className="sr-only">
              Nome da avaliação ou prova
            </label>
            <input
              id="grade-period-name"
              type="text"
              className="grade-input"
              value={name}
              maxLength={150}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Avaliação 1, Prova 1, AP1, AP2"
              aria-label="Nome da avaliação ou prova"
            />
            <button
              className="button"
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void createPeriod()}
            >
              Criar avaliação
            </button>
          </div>

          <div className="grade-quick-suggestions">
            <span className="small muted" id="quick-examples-label">
              Sugestões rápidas:
            </span>
            <div
              role="group"
              aria-labelledby="quick-examples-label"
              className="grade-chips-group"
            >
              {EXAMPLE_LABELS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="grade-chip-button"
                  onClick={() => setName(example)}
                  title={`Usar exemplo ${example}`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Assessment cards list */}
        <div className="grade-periods-section">
          <h3 className="sr-only">Avaliações cadastradas</h3>

          {periods.length === 0 ? (
            <p className="notice small">
              Nenhuma avaliação cadastrada ainda. Utilize o formulário acima para criar sua primeira avaliação (ex.: Avaliação 1, Prova 1, AP1).
            </p>
          ) : (
            <ul className="grade-period-list" role="list">
              {periods.map((period) => {
                const availableEntries = entries.filter(
                  (entry) =>
                    !period.assessments.some(
                      (item) => item.missionId === entry.mission.id
                    )
                );
                const currentSelected = selectedMissions[period.id] ?? "";
                const currentWeight = weights[period.id] ?? "1";
                const isGradebookOpen = active?.period.id === period.id;

                return (
                  <li key={period.id}>
                    <article
                      className="grade-period-card"
                      aria-labelledby={`period-heading-${period.id}`}
                    >
                      <div className="grade-card-top">
                        <div className="grade-card-title-group">
                          <h4
                            id={`period-heading-${period.id}`}
                            className="grade-card-title"
                          >
                            {period.name}
                          </h4>
                          <div className="grade-badges-row">
                            <span className="grade-badge formula">
                              {formatFormula(period.formula)}
                            </span>
                            <span className="grade-badge count">
                              {period.assessments.length}{" "}
                              {period.assessments.length === 1
                                ? "atividade"
                                : "atividades"}
                            </span>
                          </div>
                        </div>

                        <div
                          className="grade-card-top-actions"
                          role="group"
                          aria-label={`Ações de visualização para ${period.name}`}
                        >
                          <button
                            className="button button-outline"
                            type="button"
                            disabled={pending}
                            onClick={() => void toggleGradebook(period)}
                            aria-expanded={isGradebookOpen}
                          >
                            {isGradebookOpen ? "Ocultar notas" : "Visualizar notas"}
                          </button>
                        </div>
                      </div>

                      {/* Associated activities composition */}
                      <div className="grade-composition-section">
                        <h5 className="grade-section-label">
                          Atividades que compõem a nota:
                        </h5>
                        {period.assessments.length === 0 ? (
                          <p className="small muted">
                            Nenhuma atividade associada ainda. Escolha uma atividade abaixo para compor esta nota.
                          </p>
                        ) : (
                          <ul
                            className="grade-composition-list"
                            aria-label={`Atividades da avaliação ${period.name}`}
                          >
                            {period.assessments.map((item) => (
                              <li key={item.id} className="grade-composition-chip">
                                <span className="grade-item-title">{item.title}</span>
                                <span className="grade-item-weight">
                                  Peso {item.weight}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Add activity form for this card */}
                      <div className="grade-add-box">
                        <h5 className="grade-section-label">
                          Associar atividade a esta avaliação
                        </h5>
                        {availableEntries.length === 0 ? (
                          <p className="small muted">
                            {entries.length === 0
                              ? "Nenhuma atividade disponível na turma."
                              : "Todas as atividades da turma já foram associadas a esta avaliação."}
                          </p>
                        ) : (
                          <div className="grade-add-row">
                            <label
                              htmlFor={`grade-assessment-${period.id}`}
                              className="grade-add-field"
                            >
                              <span className="grade-field-text">Atividade</span>
                              <select
                                id={`grade-assessment-${period.id}`}
                                className="grade-select"
                                value={currentSelected}
                                onChange={(e) =>
                                  setSelectedMissions((prev) => ({
                                    ...prev,
                                    [period.id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Escolher atividade</option>
                                {availableEntries.map((entry) => (
                                  <option
                                    key={entry.mission.id}
                                    value={entry.mission.id}
                                  >
                                    {(
                                      entry.mission.draftVersion ??
                                      entry.mission.publishedVersion
                                    )?.title ?? "Atividade"}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label
                              htmlFor={`grade-weight-${period.id}`}
                              className="grade-weight-field"
                            >
                              <span className="grade-field-text">Peso</span>
                              <input
                                id={`grade-weight-${period.id}`}
                                type="number"
                                className="grade-weight-input"
                                min="1"
                                max="100"
                                value={currentWeight}
                                onChange={(e) =>
                                  setWeights((prev) => ({
                                    ...prev,
                                    [period.id]: e.target.value,
                                  }))
                                }
                                aria-label={`Peso da atividade para ${period.name}`}
                              />
                            </label>

                            <button
                              className="button button-outline grade-add-btn"
                              type="button"
                              disabled={pending || !currentSelected}
                              onClick={() => void addAssessment(period)}
                            >
                              Adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Active gradebook table view */}
        {active && (
          <section
            className="gradebook-active-panel paper"
            aria-live="polite"
            aria-labelledby="active-gradebook-title"
          >
            <div className="gradebook-active-header">
              <div>
                <h4 id="active-gradebook-title" className="gradebook-active-title">
                  Quadro de notas — {active.period.name}
                </h4>
                <p className="small muted">
                  Notas de 0 a 10 atribuídas às atividades entregues. Média calculada conforme a fórmula ({formatFormula(active.period.formula)}). Nenhuma nota é calculada pela IA.
                </p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => setActive(null)}
              >
                Fechar notas
              </button>
            </div>

            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label={`Tabela de notas de ${active.period.name}`}
            >
              <table>
                <caption>Notas e médias dos estudantes — {active.period.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Estudante</th>
                    {active.period.assessments.map((item) => (
                      <th scope="col" key={item.id}>
                        {item.title}{" "}
                        <span className="small muted">(peso {item.weight})</span>
                      </th>
                    ))}
                    <th scope="col" className="grade-col-average">
                      Média
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {active.students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={active.period.assessments.length + 2}
                        className="small muted"
                      >
                        Nenhum estudante matriculado nesta turma.
                      </td>
                    </tr>
                  ) : (
                    sortStudentsByName(active.students.map(student => ({ ...student, id: student.studentId }))).map((student) => (
                      <tr key={student.studentId}>
                        <th scope="row">{student.name}</th>
                        {student.assessments.map((item) => (
                          <td key={item.assessmentId}>
                            {formatGrade(item.value)}
                          </td>
                        ))}
                        <td className="grade-cell-average">
                          {formatGrade(student.average)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
