"use client";

import {
  type ActivityInteraction,
  defaultInteraction,
  readAnswerList,
} from "../lib/activity-interactions";

export function ActivityInteractionResponse({
  id,
  interaction = defaultInteraction,
  value,
  disabled,
  onChange,
}: {
  id: string;
  interaction?: ActivityInteraction;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const question = interaction.question?.trim();
  const options = interaction.type === "true_false" ? ["true", "false"] : interaction.options ?? [];

  if (interaction.type === "short_text") return (
    <label htmlFor={id}>{question || "Resposta curta"}
      <input id={id} type="text" maxLength={1000} required disabled={disabled} value={value}
        onChange={event => onChange(event.target.value)} />
    </label>
  );

  if (interaction.type === "single_choice" || interaction.type === "true_false") return (
    <fieldset className="student-interaction-choice">
      <legend>{question || "Escolha uma opção"}</legend>
      {options.map((option, index) => <label className="student-interaction-option" key={`${index}-${option}`}>
        <input type="radio" name={`answer-${id}`} value={option} required disabled={disabled} checked={value === option}
          onChange={() => onChange(option)} />
        <span>{interaction.type === "true_false" ? (option === "true" ? "Verdadeiro" : "Falso") : option}</span>
      </label>)}
    </fieldset>
  );

  if (interaction.type === "multiple_choice") {
    const selected = readAnswerList(value);
    return (
      <fieldset className="student-interaction-choice">
        <legend>{question || "Marque todas as opções que se aplicam"}</legend>
        <p className="small">Você pode marcar mais de uma opção.</p>
        {options.map((option, index) => <label className="student-interaction-option" key={`${index}-${option}`}>
          <input type="checkbox" disabled={disabled} checked={selected.includes(option)}
            onChange={event => onChange(JSON.stringify(event.target.checked ? [...selected, option] : selected.filter(item => item !== option)))} />
          <span>{option}</span>
        </label>)}
      </fieldset>
    );
  }

  if (interaction.type === "fill_blank") {
    const template = question ?? "";
    const count = [...template.matchAll(/\[\[(\d+)\]\]/g)].length;
    const answers = readAnswerList(value, count);
    const parts = template.split(/(\[\[\d+\]\])/g);
    return (
      <div className="student-fill-blank form-stack">
        <p>{parts.map((part, index) => part.match(/^\[\[(\d+)\]\]$/)
          ? <span className="fill-blank-marker" key={index}>Espaço {part.slice(2, -2)}</span>
          : <span key={index}>{part}</span>)}</p>
        <p className="small">Preencha os espaços na ordem em que aparecem.</p>
        {answers.map((answer, index) => <label htmlFor={`${id}-${index}`} key={index}>
          Espaço {index + 1}
          <input id={`${id}-${index}`} type="text" maxLength={200} required disabled={disabled} value={answer}
            onChange={event => onChange(JSON.stringify(answers.map((item, itemIndex) => itemIndex === index ? event.target.value : item)))} />
        </label>)}
      </div>
    );
  }

  if (interaction.type === "confidence") return (
    <fieldset className="student-interaction-choice confidence-scale">
      <legend>{question || "Como você se sente com esta etapa?"}</legend>
      {[
        ["1", "Preciso de orientação"],
        ["2", "Quero um exemplo"],
        ["3", "Estou avançando"],
        ["4", "Consigo continuar"],
        ["5", "Consigo explicar para alguém"],
      ].map(([score, label]) => <label className="student-interaction-option" key={score}>
        <input type="radio" name={`answer-${id}`} value={score} required disabled={disabled} checked={value === score}
          onChange={() => onChange(score)} />
        <span><strong>{score}</strong> · {label}</span>
      </label>)}
      <p className="small">Esta resposta orienta o apoio do professor; não altera a nota.</p>
    </fieldset>
  );

  return (
    <label htmlFor={id}>{question || "Escreva a sua resposta"}
      <textarea id={id} maxLength={12000} disabled={disabled} value={value}
        onChange={event => onChange(event.target.value)} aria-describedby="submission-help" />
    </label>
  );
}
