"use client";

import { useRef, useState } from "react";

type Step = {
  key: number;
  title: string;
  instruction: string;
  material: string;
};
export function MissionEditor() {
  const [steps, setSteps] = useState<Step[]>([
    {
      key: 1,
      title: "Conhecer o material",
      instruction: "Identifique o objetivo e o público do material.",
      material: "",
    },
    {
      key: 2,
      title: "Preparar uma alternativa",
      instruction:
        "Reorganize o conteúdo preservando o objetivo de aprendizagem.",
      material: "",
    },
  ]);
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const counter = useRef(3);
  const form = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("Informação que inclui");
  const [goal, setGoal] = useState(
    "Criar uma alternativa textual clara para um material didático, preservando seus objetivos.",
  );
  const [rubric, setRubric] = useState(
    "Preservar as informações essenciais; organizar a sequência de leitura; justificar as alterações.",
  );
  function move(index: number, direction: -1 | 1) {
    const next = [...steps];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setSteps(next);
    setReview(false);
    setOrderMessage(
      `${steps[index].title || "Etapa"} movida para a posição ${index + direction + 1}.`,
    );
    requestAnimationFrame(() =>
      document.getElementById(`step-${steps[index].key}`)?.focus(),
    );
  }
  function update(key: number, field: keyof Omit<Step, "key">, value: string) {
    setSteps((all) =>
      all.map((step) =>
        step.key === key ? { ...step, [field]: value } : step,
      ),
    );
    setReview(false);
  }
  return (
    <div className="two-column">
      <section className="paper">
        <h2>Rascunho de missão</h2>
        <p>
          Revise objetivos, critérios e instruções. As alterações ficam apenas
          nesta tela da prévia.
        </p>
        <form
          className="form-stack"
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(
              "Publicação indisponível nesta prévia. Nenhuma missão foi publicada. O conteúdo permanece no editor.",
            );
          }}
          onChange={() => setMessage("")}
        >
          <label htmlFor="mission-title">
            Título da missão
            <input
              id="mission-title"
              required
              maxLength={160}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setReview(false);
              }}
            />
          </label>
          <label htmlFor="mission-goal">
            Objetivo de aprendizagem
            <textarea
              id="mission-goal"
              required
              value={goal}
              maxLength={5000}
              onChange={(e) => {
                setGoal(e.target.value);
                setReview(false);
              }}
            />
          </label>
          <label htmlFor="mission-rubric">
            Critérios de avaliação
            <textarea
              id="mission-rubric"
              required
              value={rubric}
              maxLength={5000}
              onChange={(e) => {
                setRubric(e.target.value);
                setReview(false);
              }}
            />
          </label>
          <div>
            <h3>Etapas</h3>
            <p className="small">
              Use os botões para ordenar. Todas as ações funcionam por teclado.
            </p>
            {steps.map((step, index) => (
              <fieldset className="editor-step" key={step.key}>
                <legend>Etapa {index + 1}</legend>
                <div className="form-stack">
                  <label htmlFor={`step-${step.key}`}>
                    Título da etapa
                    <input
                      id={`step-${step.key}`}
                      value={step.title}
                      required
                      maxLength={160}
                      onChange={(e) =>
                        update(step.key, "title", e.target.value)
                      }
                    />
                  </label>
                  <label htmlFor={`instruction-${step.key}`}>
                    O que o estudante deve fazer
                    <textarea
                      id={`instruction-${step.key}`}
                      value={step.instruction}
                      required
                      maxLength={10000}
                      onChange={(e) =>
                        update(step.key, "instruction", e.target.value)
                      }
                    />
                  </label>
                  <label htmlFor={`material-${step.key}`}>
                    Material didático em texto
                    <textarea
                      id={`material-${step.key}`}
                      value={step.material}
                      maxLength={10000}
                      onChange={(e) =>
                        update(step.key, "material", e.target.value)
                      }
                    />
                  </label>
                </div>
                <div className="actions">
                  <button
                    className="button button-outline"
                    type="button"
                    aria-label={`Mover etapa ${index + 1} para cima`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑ Subir
                  </button>
                  <button
                    className="button button-outline"
                    type="button"
                    aria-label={`Mover etapa ${index + 1} para baixo`}
                    disabled={index === steps.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓ Descer
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    disabled={steps.length === 1}
                    onClick={() => {
                      setSteps((all) => all.filter((s) => s.key !== step.key));
                      setReview(false);
                      setOrderMessage(`Etapa ${index + 1} removida do editor.`);
                      requestAnimationFrame(() =>
                        document.getElementById("add-step")?.focus(),
                      );
                    }}
                  >
                    Remover etapa {index + 1}
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              className="button button-outline"
              id="add-step"
              type="button"
              disabled={steps.length >= 20}
              onClick={() => {
                const key = counter.current++;
                setSteps((all) => [
                  ...all,
                  { key, title: "", instruction: "", material: "" },
                ]);
                setReview(false);
                requestAnimationFrame(() =>
                  document.getElementById(`step-${key}`)?.focus(),
                );
              }}
            >
              Adicionar etapa
            </button>
            <p className="sr-only" role="status">
              {orderMessage}
            </p>
          </div>
          <button
            className="button button-outline"
            type="button"
            onClick={() => {
              if (form.current?.reportValidity()) {
                setReview(true);
                requestAnimationFrame(() =>
                  document.getElementById("review-title")?.focus(),
                );
              }
            }}
          >
            Revisar missão
          </button>
          {review && (
            <section className="notice" aria-labelledby="review-title">
              <h3 id="review-title" tabIndex={-1}>
                Revisão antes de publicar
              </h3>
              <p>
                <strong>{title}</strong>
              </p>
              <p>{goal}</p>
              <p>Critérios: {rubric}</p>
              <ol>
                {steps.map((step) => (
                  <li key={step.key}>
                    {step.title}: {step.instruction}
                  </li>
                ))}
              </ol>
              <label className="check">
                <input type="checkbox" required />
                Revisei o conteúdo, os critérios e os materiais.
              </label>
              <button className="button" type="submit">
                Publicar missão
              </button>
            </section>
          )}
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setMessage(
                "Salvamento indisponível nesta prévia. O conteúdo permanece no editor, sem persistência no banco.",
              )
            }
          >
            Salvar rascunho
          </button>
          <p role="status">{message}</p>
        </form>
      </section>
      <aside className="paper">
        <h2>Assistência para planejar</h2>
        <p>
          O Gemini poderá sugerir um rascunho com objetivo e material didático
          selecionados por você. A revisão docente é necessária antes de
          publicar.
        </p>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(
              "A geração não está conectada nesta prévia. Nenhum conteúdo foi enviado ao Gemini. Você pode continuar editando o rascunho manual.",
            );
          }}
        >
          <label htmlFor="ai-goal">
            Objetivo para o rascunho
            <textarea id="ai-goal" required maxLength={3000} />
          </label>
          <label htmlFor="ai-material">
            Material didático selecionado
            <textarea
              id="ai-material"
              required
              maxLength={10000}
              aria-describedby="ai-help"
            />
          </label>
          <p className="small" id="ai-help">
            Inclua apenas conteúdo didático autorizado. Não inclua nomes,
            entregas, conversas, relatos ou dados pessoais.
          </p>
          <label className="check">
            <input type="checkbox" required />
            Revisei o material selecionado para envio ao provedor.
          </label>
          <button className="button button-outline">Solicitar rascunho</button>
        </form>
        <p className="small">
          Nesta prévia, a geração está desconectada e não é simulada. O
          planejamento manual continua disponível.
        </p>
      </aside>
    </div>
  );
}
